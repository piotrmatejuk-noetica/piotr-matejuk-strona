(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* odsłanianie sekcji — ten sam mechanizm co na stronie kursu */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* odliczanie do pierwszego spotkania */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var now = Date.now();
    document.querySelectorAll('.countdown').forEach(function (cd) {
      var dl = new Date(cd.getAttribute('data-deadline')).getTime();
      var s = Math.floor(Math.max(0, dl - now) / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      var set = function (k, v) { var el = cd.querySelector('[data-cd="' + k + '"]'); if (el) el.textContent = v; };
      set('d', d); set('h', pad(h)); set('m', pad(m)); set('s', pad(s));
    });
  }
  if (document.querySelector('.countdown')) { tick(); setInterval(tick, 1000); }

  /* UTM-y i identyfikatory kliknięcia z reklamy.
     Zapisujemy w sessionStorage, żeby przetrwały przejście po stronie
     (ktoś może najpierw zajrzeć na stronę kursu, a dopiero potem wrócić tutaj). */
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var MAGAZYN = 'pm_utm';

  function zapamietajUtm() {
    var q = new URLSearchParams(location.search);
    var zebrane = {};
    UTM.forEach(function (k) { var v = q.get(k); if (v) zebrane[k] = v.slice(0, 120); });
    var fbclid = q.get('fbclid');
    if (fbclid) zebrane.fbclid = fbclid.slice(0, 250);
    if (!Object.keys(zebrane).length) {
      try { return JSON.parse(sessionStorage.getItem(MAGAZYN)) || {}; } catch (e) { return {}; }
    }
    try { sessionStorage.setItem(MAGAZYN, JSON.stringify(zebrane)); } catch (e) { /* tryb prywatny */ }
    return zebrane;
  }

  function ciastko(nazwa) {
    var m = document.cookie.match(new RegExp('(^|;\\s*)' + nazwa + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  /* formularz */
  var form = document.getElementById('wbForm');
  if (!form) return;
  var err = document.getElementById('wbErr'),
      btn = document.getElementById('wbSubmit'),
      ok = document.getElementById('wbOk'),
      okTermin = document.getElementById('wbOkTermin');

  function oznacz(el, zle) {
    if (zle) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  ['wb_imie', 'wb_email'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) oznacz(el, false); });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.textContent = '';
    var imie = document.getElementById('wb_imie'), email = document.getElementById('wb_email');

    if (!imie.value.trim()) { oznacz(imie, true); err.textContent = 'Podaj imię.'; imie.focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.value.trim())) {
      oznacz(email, true); err.textContent = 'Podaj poprawny adres e-mail.'; email.focus(); return;
    }

    var utmy = zapamietajUtm();
    var fbc = ciastko('_fbc');
    if (!fbc && utmy.fbclid) fbc = 'fb.1.' + Date.now() + '.' + utmy.fbclid;

    var dane = {
      imie: imie.value.trim(), email: email.value.trim(),
      termin: (form.querySelector('input[name="termin"]:checked') || {}).value,
      firma: document.getElementById('wb_firma').value,
      strona: location.href.split('#')[0],
      fbp: ciastko('_fbp'),
      fbc: fbc
    };
    UTM.forEach(function (k) { if (utmy[k]) dane[k] = utmy[k]; });

    btn.disabled = true;
    var etykieta = btn.innerHTML;
    btn.textContent = 'Zapisuję…';
    try {
      var r = await fetch('/api/webinar-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane)
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error === 'invalid_email' ? 'Podaj poprawny adres e-mail.' : 'Nie udało się zapisać.');
      okTermin.textContent = d.termin === 'nagranie webinaru'
        ? 'Nagranie przyślę zaraz po spotkaniu 8 września.'
        : 'Termin: ' + (d.termin || '');
      form.hidden = true; ok.hidden = false;

      /* Lead dopiero po potwierdzonym zapisie w MailerLite, nie po kliknięciu.
         eventID jest ten sam co po stronie serwera, więc Meta nie liczy dwa razy.
         Bez zgody na cookie window.fbq nie istnieje i zdarzenie zgłasza sam serwer. */
      if (window.fbq) {
        window.fbq('track', 'Lead', { content_name: 'Webinar GFP' },
          d.eventId ? { eventID: d.eventId } : undefined);
      }
    } catch (ex) {
      err.textContent = (ex && ex.message ? ex.message : 'Nie udało się zapisać.') +
        ' Możesz też napisać na kontakt@psychedelictherapy.pl.';
    } finally {
      btn.disabled = false; btn.innerHTML = etykieta;
    }
  });
})();
