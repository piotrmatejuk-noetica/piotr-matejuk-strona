const RECIPIENTS = ['piotr@sacrum.life', 'kontakt@psychedelictherapy.pl'];

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

  const email = String(body.email || '').trim().slice(0, 320);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const gatewayUrl = process.env.MATEJUK_GATEWAY_URL;
  const gatewayToken = process.env.MATEJUK_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    console.error('book-signup: missing gateway env vars');
    res.status(500).json({ error: 'gateway_not_configured' });
    return;
  }

  const subject = '[piotrmatejuk.com] Zapis na premierę książki';
  const message = [
    'Nowy zapis na powiadomienie o premierze drugiej książki (piotrmatejuk.com, sekcja Książki).',
    '',
    `E-mail: ${email}`,
    '',
    'Dopisz go do listy premierowej.',
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
      console.error('book-signup: gateway returned non-OK');
      res.status(502).json({ error: 'send_failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('book-signup error', err);
    res.status(500).json({ error: 'send_failed' });
  }
};
