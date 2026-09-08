// Zgłoszenie na rozmowę kwalifikacyjną przed Group Facilitation Program.
// Strona: piotrmatejuk.com/rozmowa
//
// Robi trzy rzeczy, w takiej kolejności:
// 1. dopisuje osobę do grupy MailerLite „GFP — rozmowa kwalifikacyjna",
// 2. wysyła powiadomienie do zespołu, żeby ktoś realnie oddzwonił,
// 3. zgłasza konwersję do Meta przez Conversions API.
//
// Punkty 2 i 3 są miękkie: ich awaria nie może wywrócić zgłoszenia, bo osoba
// już jest w MailerLite i da się do niej wrócić. Punkt 1 jest twardy — bez
// niego zgłoszenie przepada bez śladu, więc wtedy zwracamy błąd i prosimy
// o ponowną próbę.

const crypto = require('crypto');

// Wyłącznie ta jedna grupa. Wspólna grupa „GFP — zainteresowani prowadzeniem"
// jest wyzwalaczem włączonej automatyzacji „GFP — potwierdzenie zapisu na
// webinar", więc dopisanie do niej wysłałoby osobie proszącej o rozmowę mail
// dziękujący za zapis na webinar. Sprawdzone realnym zgłoszeniem testowym.
const GRUPA_ROZMOWA = '198035846218122421'; // GFP — rozmowa kwalifikacyjna

// Kto dostaje powiadomienie o nowym zgłoszeniu. Rozmowy prowadzą Magda i Ania,
// więc ich adresy trzeba tu dopisać, żeby nie czekały na przekazanie od Piotra.
const ODBIORCY = ['kontakt@psychedelictherapy.pl', 'piotr@sacrum.life'];

// Ten sam układ dwóch zbiorów danych co przy zapisie na webinar: domena i konto
// reklamowe leżą w różnych portfolio, a przeglądarka zgłasza zdarzenie do obu.
const DATASETY = [
  { id: '613960629514648', env: 'META_CAPI_TOKEN' },
  { id: '3181221558727990', env: 'META_CAPI_TOKEN_SACRUM' },
];
const UTM_POLA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

// Dopuszczalne odpowiedzi o dostępność. Wartość spoza listy jest odrzucana,
// żeby do powiadomienia nie dało się wstrzyknąć dowolnego tekstu.
const WARIANTY = { rdzen: 'rdzeń, 3970 zł', premium: 'premium, 6900 zł' };
const DNI = { robocze: 'dni robocze', weekend: 'weekend' };
const PORY = {
  rano: 'rano (8:00–12:00)',
  poludnie: 'popołudnie (12:00–17:00)',
  wieczor: 'wieczór (17:00–21:00)',
};

function clean(value, max) {
  return String(value == null ? '' : value).slice(0, max || 200).trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// Wybór wielokrotny: przyjmujemy tablicę albo pojedynczą wartość i zwracamy
// wyłącznie etykiety ze słownika, w stałej kolejności.
function etykiety(wartosc, slownik) {
  const lista = Array.isArray(wartosc) ? wartosc : [wartosc];
  const wybrane = new Set(lista.map((v) => clean(v, 20)));
  return Object.keys(slownik).filter((k) => wybrane.has(k)).map((k) => slownik[k]);
}

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

// Które pola UTM realnie istnieją w koncie. Brakujące próbujemy utworzyć,
// a jeśli się nie da, po prostu ich nie wysyłamy. Nigdy nie blokuje zapisu.
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
    }
  } catch (err) {
    console.error('rozmowa: pola UTM niedostępne:', err && err.message);
  }
  polaGotowe = dostepne;
  return dostepne;
}

// Conversions API. Best effort — błąd nigdy nie przerywa zgłoszenia.
// SubmitApplication zamiast Lead, żeby zgłoszenie na rozmowę dało się w Meta
// odróżnić od zwykłego zapisu na webinar.
async function wyslijZdarzenie({ email, imie, nazwisko, telefon, eventId, eventSourceUrl, fbp, fbc, ip, ua }) {
  const aktywne = DATASETY
    .map((d) => ({ id: d.id, token: process.env[d.env] }))
    .filter((d) => d.token);
  if (!aktywne.length) return;

  const user_data = { em: [sha256(email)], fn: [sha256(imie)] };
  if (nazwisko) user_data.ln = [sha256(nazwisko)];
  if (telefon) user_data.ph = [sha256(telefon.replace(/[^0-9]/g, ''))];
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;

  const payload = {
    data: [{
      event_name: 'SubmitApplication',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl || 'https://piotrmatejuk.com/rozmowa',
      action_source: 'website',
      user_data,
    }],
  };

  await Promise.all(aktywne.map(async ({ id, token }) => {
    // W logu nie ma tokenu, adresu, nazwiska ani telefonu. event_id jest
    // losowym identyfikatorem odsłony i nie wskazuje osoby.
    const slad = { typ: 'PM_CAPI', event: 'SubmitApplication', dataset: id, event_id: eventId };
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
      slad.fbtrace_id = (odp.error && odp.error.fbtrace_id) || odp.fbtrace_id || null;
      if (r.ok) {
        slad.wynik = 'ok';
        slad.events_received = odp.events_received != null ? odp.events_received : null;
      } else {
        slad.wynik = 'blad';
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

async function powiadom({ imie, nazwisko, email, telefon, dostepnosc, wariant, prowadzi, przeszkoda, zrodlo }) {
  const gatewayUrl = process.env.MATEJUK_GATEWAY_URL;
  const gatewayToken = process.env.MATEJUK_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    console.error('rozmowa: brak zmiennych gatewaya, powiadomienie nie poszło');
    return false;
  }

  const kiedy = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  const subject = `[GFP] Rozmowa kwalifikacyjna — ${imie} ${nazwisko}`.trim();
  const message = [
    'Nowe zgłoszenie na rozmowę kwalifikacyjną (piotrmatejuk.com/rozmowa).',
    '',
    `Imię i nazwisko: ${imie} ${nazwisko}`.trim(),
    `Telefon: ${telefon}`,
    `E-mail: ${email}`,
    `Kiedy dzwonić: ${dostepnosc || 'nie podano, dowolna pora'}`,
    `Wariant, z którego przyszedł: ${wariant || 'nie wiadomo, wejście spoza cennika'}`,
    '',
    'Co dziś prowadzi albo chce prowadzić:',
    prowadzi || '(nie wypełniono)',
    '',
    'Największa przeszkoda:',
    przeszkoda || '(nie wypełniono)',
    '',
    '—',
    `Zgłoszenie z ${kiedy}. Umów rozmowę w ciągu dwóch dni roboczych.`,
    zrodlo ? `Źródło wizyty: ${zrodlo}` : '',
  ].filter(Boolean).join('\n');

  try {
    const wyniki = await Promise.all(
      ODBIORCY.map((to) =>
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
    const ok = wyniki.every((r) => r.ok);
    if (!ok) console.error('rozmowa: gateway zwrócił błąd dla części odbiorców');
    return ok;
  } catch (err) {
    console.error('rozmowa: powiadomienie nie poszło:', err && err.message);
    return false;
  }
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
  const nazwisko = clean(body.nazwisko, 80);
  const email = clean(body.email, 160).toLowerCase();
  const telefon = clean(body.telefon, 40);
  const prowadzi = clean(body.prowadzi, 1200);
  const przeszkoda = clean(body.przeszkoda, 1200);

  if (!imie || !email || !telefon) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  // Numer musi mieć realną liczbę cyfr. Bez tego zgłoszenie z literówką
  // wygląda na kompletne, a zadzwonić się nie da.
  if ((telefon.match(/[0-9]/g) || []).length < 9) {
    res.status(400).json({ error: 'invalid_phone' });
    return;
  }
  if (clean(body.zgoda, 10) !== 'tak') {
    res.status(400).json({ error: 'missing_consent' });
    return;
  }

  const dni = etykiety(body.dni, DNI);
  const pory = etykiety(body.pory, PORY);
  const dostepnosc = [dni.join(' i '), pory.join(', ')].filter(Boolean).join(', ');

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) {
    console.error('rozmowa: brak MAILERLITE_API_KEY');
    res.status(500).json({ error: 'not_configured' });
    return;
  }

  const fields = { name: imie };
  if (nazwisko) fields.last_name = nazwisko;
  if (telefon) fields.phone = telefon;

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
        groups: [GRUPA_ROZMOWA],
      }),
    });
    if (!r.ok) {
      // Odpowiedź walidacyjna MailerLite potrafi zacytować przesłany adres,
      // więc do logu trafia wyłącznie kod i komunikat błędu.
      const detail = await r.text();
      let opis = '';
      try {
        const j = JSON.parse(detail);
        opis = String(j.message || '').slice(0, 120);
      } catch (e) { /* nie-JSON: nie logujemy treści */ }
      console.error(JSON.stringify({
        typ: 'PM_MAILERLITE', zrodlo: 'rozmowa', status: r.status, komunikat: opis || '(bez treści)',
      }));
      res.status(502).json({ error: 'mailerlite_failed' });
      return;
    }
  } catch (err) {
    console.error('rozmowa:', err && err.message);
    res.status(502).json({ error: 'mailerlite_failed' });
    return;
  }

  // Od tego miejsca osoba jest już zapisana. Cokolwiek pójdzie nie tak niżej,
  // zgłoszenie jest bezpieczne i odpowiadamy sukcesem.
  await powiadom({
    imie, nazwisko, email, telefon, dostepnosc,
    wariant: WARIANTY[clean(body.wariant, 20)] || '',
    prowadzi, przeszkoda,
    zrodlo: clean(body.zrodlo, 200),
  });

  const eventId = crypto.randomUUID();
  await wyslijZdarzenie({
    email,
    imie,
    nazwisko,
    telefon,
    eventId,
    eventSourceUrl: clean(body.strona, 300),
    fbp: clean(body.fbp, 120),
    fbc: clean(body.fbc, 300),
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    ua: req.headers['user-agent'],
  });

  res.status(200).json({ ok: true, eventId });
};
