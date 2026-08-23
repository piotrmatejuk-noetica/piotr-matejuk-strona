// Zapis na webinar Group Facilitation Program.
// Dopisuje subskrybenta do grupy MailerLite odpowiadającej wybranemu terminowi
// oraz do wspólnej grupy "zainteresowani prowadzeniem" (segment pod całą kampanię).

// Dwa terminy na żywo plus opcja dla osób, które chcą wyłącznie nagranie.
// Nagranie jest podawane WPROST jako nagranie — żadnego udawania transmisji na żywo.
const TERMINY = {
  '2026-09-08': { grupa: '196613402990217090', opis: 'wtorek 8 września, 19:00' },
  '2026-09-29': { grupa: '196613403278574790', opis: 'wtorek 29 września, 19:00' },
  'nagranie':   { grupa: '196613403133872089', opis: 'nagranie webinaru' },
};
const GRUPA_ZAINTERESOWANI = '196613403430618530';

function clean(value, max) {
  return String(value == null ? '' : value).slice(0, max || 200).trim();
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

  try {
    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: { name: imie },
        groups: [TERMINY[termin].grupa, GRUPA_ZAINTERESOWANI],
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('webinar-signup: MailerLite', r.status, detail.slice(0, 300));
      res.status(502).json({ error: 'mailerlite_failed' });
      return;
    }
  } catch (err) {
    console.error('webinar-signup:', err && err.message);
    res.status(502).json({ error: 'mailerlite_failed' });
    return;
  }

  res.status(200).json({ ok: true, termin: TERMINY[termin].opis });
};
