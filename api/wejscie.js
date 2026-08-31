// Raportowanie wejść first-party — niezależne od Meta i od zgody marketingowej.
//
// Po co: bramka zgody sprawia, że Meta widzi tylko tę część ruchu, która
// zaakceptowała cookies. Kampania może więc dowozić ludzi, a Events Manager
// pokazywać zero — bez własnego licznika nie da się tego odróżnić od awarii.
//
// Czego ten endpoint NIE robi, celowo:
// - nie zapisuje e-maila, imienia ani żadnej danej osobowej,
// - nie zapisuje pełnego adresu IP ani nie przekazuje go dalej,
// - nie zakłada cookie i nie wysyła niczego do Meta ani innego podmiotu.
//
// Identyfikator odwiedzającego jest jednokierunkowym skrótem z IP, user agenta
// i BIEŻĄCEJ DATY. Zmiana daty unieważnia skrót, więc nie da się śledzić osoby
// między dniami ani cofnąć skrótu do adresu IP.

const crypto = require('crypto');

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const MAX = 250;

function tekst(v, max) {
  if (v == null) return '';
  // Znaki sterujące wycinamy, żeby jeden wpis nie mógł udawać wielu linii w logu.
  return String(v).replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, max || 120).trim();
}

// Skrót nieodwracalny i zmienny co dobę. Sól bierzemy z sekretu, który i tak
// jest w środowisku — nie po to, by go użyć, tylko żeby skrótu nie dało się
// odtworzyć, znając wyłącznie adres IP i datę.
function odcisk(ip, ua, dzien) {
  const sol = process.env.MAILERLITE_API_KEY || process.env.MATEJUK_GATEWAY_TOKEN || 'pm';
  return crypto.createHash('sha256')
    .update(dzien + '|' + ip + '|' + ua + '|' + sol)
    .digest('hex')
    .slice(0, 16);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  // `req.body` jest w Vercelu parsowane leniwie i przy niepoprawnym JSON-ie
  // rzuca w momencie odczytu — stąd try/catch wokół samego dostępu do pola.
  // Pomiar nigdy nie może zwrócić błędu: wejście liczy się nawet wtedy, gdy
  // treść przyszła uszkodzona.
  let dane;
  try { dane = req.body; } catch (e) { dane = null; }
  if (typeof dane === 'string') {
    try { dane = JSON.parse(dane); } catch (e) { dane = null; }
  }
  if (!dane || typeof dane !== 'object') dane = {};

  const teraz = new Date();
  const dzien = teraz.toISOString().slice(0, 10);

  // Pierwszy wpis w x-forwarded-for to klient. Używamy go wyłącznie jako
  // materiału do skrótu i nigdzie nie zapisujemy.
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ua = String(req.headers['user-agent'] || '');

  const wpis = {
    typ: 'PM_WEJSCIE',
    czas: teraz.toISOString(),
    sciezka: tekst(dane.sciezka, 120) || '/',
    referrer: tekst(dane.referrer, MAX),
    zgoda: ['granted', 'denied', 'brak'].indexOf(dane.zgoda) >= 0 ? dane.zgoda : 'brak',
    z_reklamy: dane.z_reklamy === 1 ? 1 : 0,
    // Szerokość ekranu wystarcza do rozróżnienia telefonu od desktopu i nie
    // jest daną osobową; pełnego user agenta nie zapisujemy.
    urzadzenie: Number(dane.ekran) >= 900 ? 'desktop' : 'mobile',
    odwiedzajacy: odcisk(ip, ua, dzien)
  };
  UTM.forEach(function (k) {
    const v = tekst(dane[k], 120);
    if (v) wpis[k] = v;
  });

  // Jedna linia JSON w logach funkcji. Filtr `PM_WEJSCIE` w Runtime Logs
  // Vercela daje pełną listę wejść wraz z UTM-ami.
  console.log(JSON.stringify(wpis));

  // 204: przeglądarka nic z tym nie robi, a sendBeacon nie potrzebuje treści.
  return res.status(204).end();
};
