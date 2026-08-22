const Stripe = require('stripe');

const FILM_PRICE_ID = 'price_1TyR1gCgoD2rckr9R4gznnT4';

module.exports = async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ ok: false, error: 'missing_session_id' });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    const paid = session.payment_status === 'paid';
    const matchesFilm = (session.line_items?.data || []).some(
      (item) => item.price?.id === FILM_PRICE_ID
    );

    if (paid && matchesFilm) {
      res.status(200).json({ ok: true });
    } else {
      res.status(403).json({ ok: false });
    }
  } catch (err) {
    console.error('verify-session error', err);
    res.status(400).json({ ok: false, error: 'invalid_session' });
  }
};
