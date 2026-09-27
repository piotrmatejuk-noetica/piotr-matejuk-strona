// Pamięć działa w obrębie ciepłej instancji Vercela. Nie jest jedyną ochroną,
// ale skutecznie ucina krótkie serie automatycznych zgłoszeń.
const requestsByKey = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 2000;

const ALLOWED_HOSTS = new Set([
  'piotrmatejuk.com',
  'www.piotrmatejuk.com',
  'localhost',
  '127.0.0.1',
]);

function text(value, max = 5000) {
  return String(value == null ? '' : value).slice(0, max).trim();
}

function clientIp(req) {
  return text(req.headers['x-forwarded-for'], 300).split(',')[0].trim()
    || text(req.headers['x-real-ip'], 100)
    || 'unknown';
}

function hostFrom(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (err) {
    return '';
  }
}

function prune(now) {
  if (requestsByKey.size > MAX_CACHE_ENTRIES) {
    for (const [key, entry] of requestsByKey) {
      if (now - entry.startedAt > WINDOW_MS) requestsByKey.delete(key);
    }
  }
}

function rateLimited(key, limit, now) {
  const current = requestsByKey.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    requestsByKey.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function spamScore(req, body, fields, form) {
  const combined = fields.map((field) => text(body[field])).join('\n');
  const urls = combined.match(/(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|top|site|online)\b)/gi) || [];
  let score = 0;

  if (urls.length >= 3) score += 3;
  else if (urls.length === 2) score += 1;

  if (/(?:\[url=|<a\s+href=|href\s*=|viagra|casino|forex|crypto(?:currency)?|backlinks?|guest\s+posts?|increase\s+(?:your\s+)?traffic|seo\s+(?:service|offer|expert)|web\s+design\s+(?:service|agency))/i.test(combined)) {
    score += 3;
  }
  if (/(.)\1{14,}/.test(combined)) score += 2;
  // Formularz kontaktowy dostaje też filtr na gotowe, bezosobowe szablony,
  // które w praktyce pojawiały się jako spam mimo poprawnego e-maila i originu.
  // Długi, konkretny opis nie jest tym objęty — warunek dotyczy krótkiej treści.
  if (form === 'contact' && text(body.wiadomosc, 500).length <= 240
    && /(?:wi[eę]cej\s+informacji|prosz[eę]\s+o\s+(?:kontakt|informacj|odpowied)|kontakt\s+e[-\s]?mail|odpisz\s+na\s+ten\s+e[-\s]?mail|piotr\s+matejuk)/i.test(text(body.wiadomosc, 500))) {
    score += 4;
  }
  if (!text(req.headers['user-agent'], 500)) score += 1;
  if (!text(req.headers['accept-language'], 200)) score += 1;
  return score;
}

function reject(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
  return true;
}

/**
 * Zwraca true, gdy odpowiedź została już wysłana i endpoint ma zakończyć pracę.
 * Spam dostaje pozorny sukces, żeby bot nie uczył się obchodzenia filtrów.
 */
function protect(req, res, body, options = {}) {
  const form = options.form || 'form';
  const now = Date.now();
  const fields = Array.isArray(options.textFields) ? options.textFields : [];
  const limit = Number.isFinite(options.limit) ? options.limit : 6;
  const ip = clientIp(req);
  prune(now);

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > (options.maxBytes || 20_000)) {
    return reject(res, 413, { error: 'payload_too_large' });
  }

  const origin = text(req.headers.origin, 500);
  const referer = text(req.headers.referer, 500);
  const originHost = origin ? hostFrom(origin) : '';
  const refererHost = referer ? hostFrom(referer) : '';
  if (options.requireOrigin !== false && !originHost && !refererHost) {
    return reject(res, 403, { error: 'invalid_origin' });
  }
  if ((originHost && !ALLOWED_HOSTS.has(originHost)) || (!originHost && refererHost && !ALLOWED_HOSTS.has(refererHost))) {
    return reject(res, 403, { error: 'invalid_origin' });
  }
  if (text(req.headers['sec-fetch-site'], 50) === 'cross-site') {
    return reject(res, 403, { error: 'invalid_origin' });
  }

  // Obsługujemy oba warianty nazwy, aby każdy formularz miał tę samą ochronę.
  if (text(body.firma, 300) || text(body.website, 300)) {
    return reject(res, 200, { ok: true });
  }

  const startedAt = Number(body.form_started_at || body.formStartedAt || 0);
  if (startedAt > 0) {
    const elapsed = now - startedAt;
    if (!Number.isFinite(elapsed) || elapsed < 800) {
      return reject(res, 200, { ok: true });
    }
  }

  if (rateLimited(`${form}:${ip}`, limit, now)) {
    res.setHeader('Retry-After', '600');
    return reject(res, 429, { error: 'too_many_requests' });
  }

  if (spamScore(req, body, fields, form) >= 3) {
    return reject(res, 200, { ok: true });
  }

  res.setHeader('Cache-Control', 'no-store');
  return false;
}

function resetForTests() {
  requestsByKey.clear();
}

module.exports = { protect, resetForTests };
