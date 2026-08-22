const Stripe = require('stripe');

const FILM_PRICE_ID = 'price_1TyR1gCgoD2rckr9R4gznnT4';

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

  if (!body || body.consent !== true) {
    res.status(400).json({ error: 'consent_required' });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: FILM_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/film-ogladaj.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#film`,
      locale: 'pl',
      metadata: {
        consent_withdrawal_waiver: 'true',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    res.status(500).json({ error: 'checkout_session_failed' });
  }
};
