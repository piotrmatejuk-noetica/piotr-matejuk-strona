const RECIPIENTS = ['kontakt@psychedelictherapy.pl'];

function escapeText(value) {
  return String(value || '').slice(0, 5000);
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

  const imie = escapeText(body.imie).trim();
  const email = escapeText(body.email).trim();
  const temat = escapeText(body.temat).trim() || 'Inne';
  const wiadomosc = escapeText(body.wiadomosc).trim();

  if (!imie || !email || !wiadomosc) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  const gatewayUrl = process.env.MATEJUK_GATEWAY_URL;
  const gatewayToken = process.env.MATEJUK_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    console.error('contact: missing gateway env vars');
    res.status(500).json({ error: 'gateway_not_configured' });
    return;
  }

  const subject = `[piotrmatejuk.com] ${temat} — ${imie}`;
  const message = [
    `Nowa wiadomość z formularza kontaktowego piotrmatejuk.com`,
    ``,
    `Od: ${imie} <${email}>`,
    `Temat: ${temat}`,
    ``,
    wiadomosc,
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

    const allOk = results.every((r) => r.ok);
    if (!allOk) {
      console.error('contact: gateway returned non-OK for one or more recipients');
      res.status(502).json({ error: 'send_failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact error', err);
    res.status(500).json({ error: 'send_failed' });
  }
};
