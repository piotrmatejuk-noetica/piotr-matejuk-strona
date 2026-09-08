// Przekierowanie zliczające kliknięcia z maili serii GFP.
// Link w mailu prowadzi tutaj, endpoint dopisuje klikającego do grupy
// "GFP — czytający serię" i natychmiast przekierowuje pod właściwy adres.
//
// Dlaczego nie automatyzacja MailerLite: ich API nie ma wyzwalacza na kliknięcie
// (jedyny przyjmowany typ to subscriber_joins_group), a segmentu "otworzył kampanię"
// nie da się utworzyć zdalnie — POST /segments przyjmuje wyłącznie nazwę.

const GRUPA_CZYTAJACY = '196689663509923020';

const CELE = {
  webinar: 'https://piotrmatejuk.com/webinar',
  kurs: 'https://piotrmatejuk.com/group-facilitation',
  opinie: 'https://piotrmatejuk.com/group-facilitation#opinie',
  rozmowa: 'https://piotrmatejuk.com/rozmowa',
};

module.exports = async (req, res) => {
  const url = new URL(req.url, 'https://piotrmatejuk.com');
  const cel = CELE[url.searchParams.get('do')] || CELE.webinar;
  const email = String(url.searchParams.get('e') || '').trim().toLowerCase();

  // Przekierowanie ma zadziałać zawsze, także gdy dopisanie do grupy się nie uda.
  const przekieruj = () => {
    res.setHeader('Location', cel);
    res.setHeader('Cache-Control', 'no-store');
    res.status(302).end();
  };

  const key = process.env.MAILERLITE_API_KEY;
  if (!key || !email || !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
    przekieruj();
    return;
  }

  try {
    const naglowki = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    // Dopisujemy WYŁĄCZNIE osoby już obecne w bazie. Bez tego adres z linku
    // pozwalałby dopisać do grupy kogokolwiek.
    const znaleziony = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      { headers: naglowki }
    );
    if (znaleziony.ok) {
      await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: naglowki,
        body: JSON.stringify({ email, groups: [GRUPA_CZYTAJACY] }),
      });
    }
  } catch (err) {
    console.error('r:', err && err.message);
  }

  przekieruj();
};
