/* Bramka zgody przed Meta Pixelem — wspolna dla calej domeny piotrmatejuk.com.
   Pixel nie wykonuje ŻADNEGO żądania sieciowego przed decyzją odwiedzającego. */
(function () {
  'use strict';

  var KEY = 'pm_consent';
  /* Dwa piksele, bo domeny i konta reklamowe leżą w różnych portfolio.
     613960629514648 („Pixel Natalia") należy do portfolio Hypnotic Spzoo i ma
     wpięte Conversions API. 3181221558727990 („Sacrum Pixel") należy do portfolio
     Sacrum, czyli tego samego co konto reklamowe 4334961180078194 — bez niego
     kampanie z tego konta nie widzą zdarzeń z tej domeny. Udostępnienie Pixela
     Natalii między portfoliami Meta przyjmuje komunikatem sukcesu, ale po
     odświeżeniu cofa (sprawdzone 2026-08-25), więc idziemy drugą drogą.
     fbq wysyła każde zdarzenie do wszystkich zainicjowanych pikseli. */
  var PIXEL_IDS = ['613960629514648', '3181221558727990'];


  /* ── Wspólne helpery ─────────────────────────────────────────────────────
     Używane i przez piksel (po zgodzie), i przez raportowanie first-party
     (zawsze). Nic tu nie wykonuje żądań sieciowych samo z siebie. */

  var UTM_KLUCZE = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var MAGAZYN_UTM = 'pm_utm';

  /* UTM-y i fbclid z adresu, zapamiętane na czas sesji. Zapamiętanie jest
     konieczne, bo z landingu można przejść na inną podstronę i wrócić —
     bez tego atrybucja ginie przy pierwszym kliknięciu w menu. */
  function parametryWejscia() {
    var q, zebrane = {}, i, v;
    try { q = new URLSearchParams(location.search); } catch (e) { return {}; }
    for (i = 0; i < UTM_KLUCZE.length; i++) {
      v = q.get(UTM_KLUCZE[i]);
      if (v) zebrane[UTM_KLUCZE[i]] = String(v).slice(0, 120);
    }
    v = q.get('fbclid');
    if (v) zebrane.fbclid = String(v).slice(0, 250);
    if (!Object.keys(zebrane).length) {
      try { return JSON.parse(sessionStorage.getItem(MAGAZYN_UTM)) || {}; } catch (e) { return {}; }
    }
    try { sessionStorage.setItem(MAGAZYN_UTM, JSON.stringify(zebrane)); } catch (e) { /* tryb prywatny */ }
    return zebrane;
  }

  /* Identyfikator odsłony — losowy, nietrwały, nie identyfikuje osoby.
     Służy wyłącznie do deduplikacji zdarzeń między przeglądarką a serwerem. */
  function losowyId() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) { /* starsze przeglądarki */ }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function razNaSesje(klucz) {
    try {
      if (sessionStorage.getItem(klucz)) return false;
      sessionStorage.setItem(klucz, '1');
      return true;
    } catch (e) {
      return true; /* tryb prywatny: lepiej wysłać raz za dużo niż zgubić wejście */
    }
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      return v && (v.status === 'granted' || v.status === 'denied') ? v.status : null;
    } catch (e) {
      return null;
    }
  }

  function write(status) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ status: status, ts: Date.now() }));
    } catch (e) { /* tryb prywatny — decyzja działa tylko w tej sesji */ }
  }

  function loadPixel() {
    if (window.fbq) return;
    /* oficjalny snippet Meta, uruchamiany dopiero po zgodzie */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    PIXEL_IDS.forEach(function (id) { window.fbq('init', id); });

    /* PageView — raz na odsłonę. To z niego Meta liczy „wyświetlenia strony
       docelowej" (landing_page_view) w raportach kampanii. Strażnik `if (window.fbq)`
       na wejściu do tej funkcji gwarantuje, że nie zainicjujemy piksela dwa razy. */
    window.fbq('track', 'PageView');

    /* LandingPageView — zdarzenie niestandardowe, raz na SESJĘ, nie na odsłonę.
       PageView opisuje każdą odsłonę, więc odświeżenie strony albo wejście na
       kolejną podstronę zawyżałoby liczbę „wejść z reklamy". To zdarzenie ma
       odpowiadać jednemu realnemu wejściu na landing i dlatego niesie UTM-y.
       ⚠️ Nie ustawiać go jako zdarzenia optymalizacji kampanii — optymalizacja
       zostaje na `Lead`. To jest metryka obserwacyjna, nie konwersja. */
    if (razNaSesje('pm_lpv')) {
      var p = parametryWejscia();
      var dane = { content_name: document.title.slice(0, 100), sciezka: location.pathname };
      UTM_KLUCZE.forEach(function (k) { if (p[k]) dane[k] = p[k]; });
      window.fbq('trackCustom', 'LandingPageView', dane, { eventID: losowyId() });
    }
  }

  function render() {
    var el = document.createElement('div');
    el.className = 'pm-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Zgoda na pliki cookie');
    el.innerHTML =
      '<div class="pm-consent-in">' +
      '<p class="pm-consent-txt">Ta strona używa plików cookie do analityki i mierzenia skuteczności reklam. ' +
      'Bez twojej zgody nie uruchamiamy żadnych narzędzi zewnętrznych. ' +
      'Szczegóły w <a href="/polityka-prywatnosci">polityce prywatności</a>.</p>' +
      '<div class="pm-consent-act">' +
      '<button type="button" class="pm-consent-btn" data-consent="denied">Tylko niezbędne</button>' +
      '<button type="button" class="pm-consent-btn pm-consent-btn--primary" data-consent="granted">Akceptuję</button>' +
      '</div></div>';

    el.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-consent]') : null;
      if (!btn) return;
      var choice = btn.getAttribute('data-consent');
      write(choice);
      el.parentNode && el.parentNode.removeChild(el);
      if (choice === 'granted') loadPixel();
    });

    /* strony z wlasnym mobilnym paskiem CTA — nie zaslaniaj go banerem */
    if (document.querySelector('.sticky-m')) el.classList.add('pm-consent--above-bar');

    document.body.appendChild(el);
    /* Fokus ląduje na samym banerze, NIE na przycisku „Akceptuję".
       Fokus na przycisku sprawiał, że odruchowe naciśnięcie Enter zaraz po
       wczytaniu strony udzielało zgody przypadkiem. */
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }


  /* ── Raportowanie first-party ────────────────────────────────────────────
     Niezależne od Meta i od zgody marketingowej, bo nie wysyła danych do
     żadnego podmiotu zewnętrznego i nie zakłada cookie — trafia wyłącznie na
     własny endpoint tej domeny. Dzięki temu widać realny ruch z reklam także
     wtedy, gdy ktoś odrzuci marketing, a odrzuca go zdecydowana większość.
     NIE wysyła e-maila, imienia ani niczego, co identyfikuje osobę. */
  function zglosWejscie() {
    if (!razNaSesje('pm_wejscie_' + location.pathname)) return;
    var p = parametryWejscia();
    var ladunek = {
      sciezka: location.pathname,
      referrer: document.referrer ? document.referrer.slice(0, 250) : '',
      zgoda: read() || 'brak',
      ekran: (window.screen && window.screen.width) ? window.screen.width : 0
    };
    UTM_KLUCZE.forEach(function (k) { if (p[k]) ladunek[k] = p[k]; });
    /* Sam fakt kliknięcia z reklamy, bez wartości identyfikatora — wystarcza
       do policzenia wejść z Meta, a nie przekazuje identyfikatora kliknięcia. */
    ladunek.z_reklamy = p.fbclid ? 1 : 0;

    try {
      var tresc = JSON.stringify(ladunek);
      /* sendBeacon przeżywa zamknięcie karty; fetch to zapas dla starszych */
      if (navigator.sendBeacon &&
          navigator.sendBeacon('/api/wejscie', new Blob([tresc], { type: 'application/json' }))) return;
      fetch('/api/wejscie', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: tresc, keepalive: true
      }).catch(function () { /* pomiar nigdy nie może psuć strony */ });
    } catch (e) { /* jw. */ }
  }

  function init() {
    /* Zawsze, przed rozgałęzieniem na zgodę — to jest pomiar własny, nie Meta. */
    zglosWejscie();

    var status = read();
    if (status === 'granted') { loadPixel(); return; }
    if (status === 'denied') return;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
