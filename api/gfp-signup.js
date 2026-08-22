const RECIPIENTS = ['kontakt@psychedelictherapy.pl', 'piotr@sacrum.life'];

function clean(value, max) {
  return String(value == null ? '' : value).slice(0, max || 3000).trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    // urlencoded fallback: gdy formularz poleci bez JS, Vercel poda string
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = Object.fromEntries(new URLSearchParams(body));
    }
  }
  body = body || {};

  // honeypot — bot wypełnia ukryte pole "firma"
  if (clean(body.firma, 200)) {
    res.status(200).json({ ok: true });
    return;
  }

  const imie = clean(body.imie, 80);
  const nazwisko = clean(body.nazwisko, 80);
  const email = clean(body.email, 160);
  const telefon = clean(body.telefon, 40);

  if (!imie || !nazwisko || !email || !telefon) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const gatewayUrl = process.env.MATEJUK_GATEWAY_URL;
  const gatewayToken = process.env.MATEJUK_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    console.error('gfp-signup: missing gateway env vars');
    res.status(500).json({ error: 'gateway_not_configured' });
    return;
  }

  const subject = `[Group Facilitation Program] Zgłoszenie — ${imie} ${nazwisko}`;
  const message = [
    'Nowe zgłoszenie do pierwszej kohorty Group Facilitation Program (piotrmatejuk.com/group-facilitation)',
    '',
    `Imię i nazwisko: ${imie} ${nazwisko}`,
    `E-mail: ${email}`,
    `Telefon: ${telefon}`,
    `Preferowane godziny kontaktu: ${clean(body.godziny_kontaktu, 60) || 'dowolne'}`,
    '',
    `Prowadzi już warsztaty: ${clean(body.prowadzi_warsztaty, 10) || '—'}`,
    `Zamierza prowadzić warsztaty: ${clean(body.zamierza_prowadzic, 10) || '—'}`,
    `Ma pomysł na warsztat: ${clean(body.ma_pomysl, 10) || '—'}`,
    '',
    'Opis pomysłu:',
    clean(body.opis_pomyslu, 2000) || '—',
    '',
    'Na czym najbardziej zależy:',
    clean(body.zalezy, 3000) || '—',
    '',
    'Czego chce uniknąć:',
    clean(body.uniknac, 3000) || '—',
  ].join('\n');

  try {
    const results = await Promise.all(
      RECIPIENTS.map((to) =>
        fetch(`${gatewayUrl.replace(/\/$/, '')}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${gatewayToken}`,
          },
          body: JSON.stringify({
            channel: 'email',
            account: 'psychedelic',
            to,
            subject,
            message,
          }),
        })
      )
    );

    if (!results.every((r) => r.ok)) {
      console.error('gfp-signup: gateway returned non-OK for one or more recipients');
      res.status(502).json({ error: 'send_failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('gfp-signup error', err);
    res.status(500).json({ error: 'send_failed' });
  }
};
