/* Bramka zgody przed Meta Pixelem — wspolna dla calej domeny piotrmatejuk.com.
   Pixel nie wykonuje ŻADNEGO żądania sieciowego przed decyzją odwiedzającego. */
(function () {
  'use strict';

  var KEY = 'pm_consent';
  var PIXEL_ID = '613960629514648';

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
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
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

  function init() {
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
