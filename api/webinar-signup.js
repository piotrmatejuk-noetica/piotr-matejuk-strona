// Zapis na webinar Group Facilitation Program.
// Dopisuje subskrybenta do grupy MailerLite odpowiadającej wybranemu terminowi
// oraz do wspólnej grupy "zainteresowani prowadzeniem" (segment pod całą kampanię).
//
// Dodatkowo:
// - zapisuje UTM-y przy subskrybencie, żeby MailerLite był źródłem prawdy dla
//   liczby zapisów z reklam (bramka zgody sprawia, że piksel widzi tylko część ruchu),
// - wysyła zdarzenie Lead przez Conversions API z tym samym event_id, który
//   dostaje przeglądarka, więc Meta deduplikuje oba źródła.

const crypto = require('crypto');

// Dwa terminy na żywo plus opcja dla osób, które chcą wyłącznie nagranie.
// Nagranie jest podawane WPROST jako nagranie — żadnego udawania transmisji na żywo.
const TERMINY = {
  '2026-09-08': { grupa: '196613402990217090', opis: 'wtorek 8 września, 19:00' },
  '2026-09-29': { grupa: '196613403278574790', opis: 'wtorek 29 września, 19:00' },
  'nagranie':   { grupa: '196613403133872089', opis: 'nagranie webinaru' },
};
const GRUPA_ZAINTERESOWANI = '196613403430618530';

/* Dwa zbiory danych, bo domena i konto reklamowe leżą w różnych portfolio.
   Strona inicjuje oba piksele w consent.js, więc przeglądarka wysyła Lead do
   obu — serwer musi robić to samo, inaczej Sacrum Pixel jest ślepy na osoby,
   które odrzuciły cookies. `event_id` jest wspólny, a deduplikacja w Meta
   działa w obrębie jednego zbioru danych, więc ta sama wartość w obu jest
   poprawna. Zbiór bez tokenu jest po prostu pomijany. */
const DATASETY = [
  { id: '613960629514648', env: 'META_CAPI_TOKEN' },        // Pixel Natalia, Hypnotic Spzoo
  { id: '3181221558727990', env: 'META_CAPI_TOKEN_SACRUM' }, // Sacrum Pixel, portfolio Sacrum
];
const UTM_POLA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

function clean(value, max) {
  return String(value == null ? '' : value).slice(0, max || 200).trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// Cache na czas życia instancji lambdy: które pola UTM realnie istnieją w MailerLite.
// null = jeszcze nie sprawdzone. Sprawdzenie nigdy nie może wywrócić zapisu.
let polaGotowe = null;

async function ml(key, sciezka, opcje) {
  return fetch(`https://connect.mailerlite.com/api/${sciezka}`, {
    ...opcje,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opcje && opcje.headers),
    },
  });
}

// Zwraca listę nazw pól UTM, których można bezpiecznie użyć.
// Brakujące próbuje utworzyć; jeśli się nie uda, po prostu ich nie wysyłamy.
async function przygotujPola(key) {
  if (polaGotowe) return polaGotowe;
  const dostepne = [];
  try {
    const r = await ml(key, 'fields?limit=200', { method: 'GET' });
    if (!r.ok) throw new Error('fields ' + r.status);
    const dane = await r.json();
    const istnieje = new Set((dane.data || []).map((f) => f.key));

    for (const nazwa of UTM_POLA) {
      if (istnieje.has(nazwa)) { dostepne.push(nazwa); continue; }
      const c = await ml(key, 'fields', {
        method: 'POST',
        body: JSON.stringify({ name: nazwa, type: 'text' }),
      });
      if (c.ok) dostepne.push(nazwa);
      else console.error('webinar-signup: nie utworzono pola', nazwa, c.status);
    }
  } catch (err) {
    console.error('webinar-signup: pola UTM niedostępne:', err && err.message);
  }
  polaGotowe = dostepne;
  return dostepne;
}

// Conversions API. Best effort — błąd nigdy nie przerywa zapisu.
async function wyslijLead({ email, imie, eventId, eventSourceUrl, fbp, fbc, ip, ua }) {
  const aktywne = DATASETY
    .map((d) => ({ id: d.id, token: process.env[d.env] }))
    .filter((d) => d.token);
  if (!aktywne.length) return;

  const user_data = { em: [sha256(email)], fn: [sha256(imie)] };
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl || 'https://piotrmatejuk.com/webinar',
      action_source: 'website',
      user_data,
    }],
  };

  await Promise.all(aktywne.map(async ({ id, token }) => {
    // Diagnostyka: logujemy WYNIK każdej próby, także udanej — bez tego cisza
    // w logach znaczyła zarówno „wysłano poprawnie", jak i „nie wysłano wcale".
    // W logu nie ma tokenu, e-maila, imienia, cookies ani pełnego IP; event_id
    // jest losowym identyfikatorem odsłony i nie wskazuje osoby.
    const slad = { typ: 'PM_CAPI', event: 'Lead', dataset: id, event_id: eventId };
    try {
      const r = await fetch(`https://graph.facebook.com/v26.0/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, access_token: token }),
      });
      const tresc = await r.text();
      let odp = {};
      try { odp = JSON.parse(tresc); } catch (e) { /* Meta zwróciła nie-JSON */ }

      slad.status = r.status;
      // fbtrace_id pozwala Meta odnaleźć konkretne żądanie przy zgłoszeniu.
      slad.fbtrace_id = (odp.error && odp.error.fbtrace_id) || odp.fbtrace_id || null;

      if (r.ok) {
        slad.wynik = 'ok';
        slad.events_received = odp.events_received != null ? odp.events_received : null;
      } else {
        slad.wynik = 'blad';
        // Sam kod i typ błędu, bez treści żądania.
        slad.blad = odp.error
          ? { code: odp.error.code, subcode: odp.error.error_subcode, type: odp.error.type }
          : tresc.slice(0, 200);
      }
      console.log(JSON.stringify(slad));
    } catch (err) {
      slad.wynik = 'wyjatek';
      slad.blad = err && err.message ? String(err.message).slice(0, 200) : 'nieznany';
      console.error(JSON.stringify(slad));
    }
  }));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = Object.fromEntries(new URLSearchParams(body));
    }
  }
  body = body || {};

  // honeypot — bot wypełnia ukryte pole "firma"
  if (clean(body.firma)) {
    res.status(200).json({ ok: true });
    return;
  }

  const imie = clean(body.imie, 80);
  const email = clean(body.email, 160).toLowerCase();
  const termin = clean(body.termin, 20);

  if (!imie || !email) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (!TERMINY[termin]) {
    res.status(400).json({ error: 'invalid_date' });
    return;
  }

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) {
    console.error('webinar-signup: brak MAILERLITE_API_KEY');
    res.status(500).json({ error: 'not_configured' });
    return;
  }

  const fields = { name: imie };
  const utmy = {};
  for (const nazwa of UTM_POLA) {
    const v = clean(body[nazwa], 120);
    if (v) utmy[nazwa] = v;
  }
  if (Object.keys(utmy).length) {
    const dozwolone = await przygotujPola(key);
    for (const nazwa of dozwolone) if (utmy[nazwa]) fields[nazwa] = utmy[nazwa];
  }

  try {
    const r = await ml(key, 'subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email,
        fields,
        groups: [TERMINY[termin].grupa, GRUPA_ZAINTERESOWANI],
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      // Odpowiedź walidacyjna MailerLite potrafi zacytować przesłany adres
      // e-mail, więc do logu trafia wyłącznie kod i komunikat błędu, nigdy
      // surowa treść odpowiedzi.
      let opis = '';
      try {
        const j = JSON.parse(detail);
        opis = String(j.message || '').slice(0, 120);
      } catch (e) { /* nie-JSON: nie logujemy treści */ }
      console.error(JSON.stringify({
        typ: 'PM_MAILERLITE', status: r.status, komunikat: opis || '(bez treści)',
      }));
      res.status(502).json({ error: 'mailerlite_failed' });
      return;
    }
  } catch (err) {
    console.error('webinar-signup:', err && err.message);
    res.status(502).json({ error: 'mailerlite_failed' });
    return;
  }

  // Ten sam identyfikator dostaje przeglądarka, więc Meta liczy jedno zdarzenie,
  // nawet jeśli piksel i serwer zgłoszą je oba.
  const eventId = crypto.randomUUID();

  await wyslijLead({
    email,
    imie,
    eventId,
    eventSourceUrl: clean(body.strona, 300),
    fbp: clean(body.fbp, 120),
    fbc: clean(body.fbc, 300),
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    ua: req.headers['user-agent'],
  });

  res.status(200).json({ ok: true, termin: TERMINY[termin].opis, eventId });
};
