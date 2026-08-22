const RECIPIENT = 'kontakt@psychedelictherapy.pl';
const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/14141805/46o768a/';

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
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = {};
    }
  }
  body = body || {};

  const name = escapeText(body.name).trim();
  const email = escapeText(body.email).trim();
  const phone = escapeText(body.phone).trim();
  const motivation = escapeText(body.motivation).trim();

  if (!name || !email || !phone || !motivation) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  const zapierPromise = fetch(ZAPIER_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      phone,
      motivation,
      source: 'piotrmatejuk.com/shadow-work',
      submittedAt: new Date().toISOString(),
    }),
  })
    .then((r) => {
      if (!r.ok) console.error('shadow-work-signup: zapier webhook returned non-OK', r.status);
      return r.ok;
    })
    .catch((err) => {
      console.error('shadow-work-signup: zapier webhook failed', err);
      return false;
    });

  const gatewayUrl = process.env.MATEJUK_GATEWAY_URL;
  const gatewayToken = process.env.MATEJUK_GATEWAY_TOKEN;
  let emailPromise = Promise.resolve();
  if (gatewayUrl && gatewayToken) {
    const subject = `Zgłoszenie na Shadow Work · 26.09–2.10.2026 — ${name}`;
    const message = [
      `Zgłoszenie z formularza piotrmatejuk.com/shadow-work`,
      ``,
      `Imię i nazwisko: ${name}`,
      `E-mail: ${email}`,
      `Telefon: ${phone}`,
      ``,
      `Dlaczego chce wziąć udział:`,
      motivation,
      ``,
      `Gotowość na rozmowę screeningową: tak`,
    ].join('\n');

    emailPromise = fetch(`${gatewayUrl.replace(/\/$/, '')}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        channel: 'email',
        account: 'psychedelic',
        to: RECIPIENT,
        subject,
        message,
      }),
    })
      .then((r) => {
        if (!r.ok) console.error('shadow-work-signup: gateway returned non-OK');
      })
      .catch((err) => {
        console.error('shadow-work-signup: gateway email failed', err);
      });
  } else {
    console.error('shadow-work-signup: missing gateway env vars, skipping email notification');
  }

  const [zapierOk] = await Promise.all([zapierPromise, emailPromise]);

  if (!zapierOk) {
    res.status(502).json({ error: 'send_failed' });
    return;
  }

  res.status(200).json({ ok: true });
};
