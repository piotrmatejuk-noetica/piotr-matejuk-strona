(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* odsłanianie sekcji — ten sam mechanizm co na stronie kursu i webinaru */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* UTM-y i identyfikator kliknięcia z reklamy.
     Trzymane w sessionStorage, bo ktoś może najpierw obejrzeć stronę kursu,
     a dopiero potem wrócić tutaj — atrybucja ma przetrwać to przejście. */
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

  /* Z którego wariantu cennika ktoś przyszedł. Strona kursu linkuje tu
     z ?wariant=rdzen albo ?wariant=premium, więc zespół wie przed telefonem,
     czy rozmowa dotyczy 3970 czy 6900 zł. Zapamiętane na czas sesji, bo
     odświeżenie strony gubi parametr. */
  function wariant() {
    var v = new URLSearchParams(location.search).get('wariant') || '';
    if (v === 'rdzen' || v === 'premium') {
      try { sessionStorage.setItem('gfp_wariant', v); } catch (e) { /* tryb prywatny */ }
      return v;
    }
    try { return sessionStorage.getItem('gfp_wariant') || ''; } catch (e) { return ''; }
  }

  function ciastko(nazwa) {
    var m = document.cookie.match(new RegExp('(^|;\\s*)' + nazwa + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  /* Krótki, czytelny opis pochodzenia wizyty do powiadomienia dla zespołu.
     Ma odpowiadać na jedno pytanie: czy ta osoba przyszła z webinaru, z maila,
     czy z reklamy. Bez tego każde zgłoszenie wygląda tak samo. */
  function zrodloWizyty(utmy) {
    if (utmy.utm_source || utmy.utm_campaign) {
      return [utmy.utm_source, utmy.utm_medium, utmy.utm_campaign].filter(Boolean).join(' / ');
    }
    var ref = document.referrer || '';
    if (!ref) return 'wejście bezpośrednie (webinar albo wpisany adres)';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (host === location.hostname.replace(/^www\./, '')) return 'przejście ze strony piotrmatejuk.com';
      return host;
    } catch (e) { return ''; }
  }

  var form = document.getElementById('rzForm');
  if (!form) return;
  var err = document.getElementById('rzErr'),
      btn = document.getElementById('rzSubmit'),
      ok = document.getElementById('rzOk');

  /* Formularz jest dłuższy niż zapis na webinar, więc wypełniona treść
     przeżywa odświeżenie i przypadkowe wyjście z karty. */
  var KEY = 'gfp_rozmowa';
  function zapiszStan() {
    try {
      var d = {};
      new FormData(form).forEach(function (v, k) {
        if (k === 'firma' || k === 'zgoda') return;
        if (d[k] === undefined) d[k] = [];
        d[k].push(String(v));
      });
      sessionStorage.setItem(KEY, JSON.stringify(d));
    } catch (e) { /* tryb prywatny: działamy dalej bez zapisu */ }
  }
  function wczytajStan() {
    try {
      var raw = sessionStorage.getItem(KEY); if (!raw) return;
      var d = JSON.parse(raw);
      Object.keys(d).forEach(function (k) {
        var wartosci = d[k];
        form.querySelectorAll('[name="' + k + '"]').forEach(function (el) {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = wartosci.indexOf(el.value) !== -1;
          else el.value = wartosci[0] || '';
        });
      });
    } catch (e) { /* uszkodzony zapis ignorujemy */ }
  }
  wczytajStan();
  form.addEventListener('input', zapiszStan);
  form.addEventListener('change', zapiszStan);

  function oznacz(el, zle) {
    if (zle) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  ['rz_imie', 'rz_email', 'rz_tel'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) oznacz(el, false); });
  });

  function zaznaczone(nazwa) {
    return Array.prototype.map.call(
      form.querySelectorAll('input[name="' + nazwa + '"]:checked'),
      function (el) { return el.value; }
    );
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.textContent = '';

    var imie = document.getElementById('rz_imie'),
        email = document.getElementById('rz_email'),
        tel = document.getElementById('rz_tel'),
        zgoda = document.getElementById('rz_zgoda');

    if (!imie.value.trim()) {
      oznacz(imie, true); err.textContent = 'Podaj imię.'; imie.focus(); return;
    }
    if ((tel.value.match(/[0-9]/g) || []).length < 9) {
      oznacz(tel, true);
      err.textContent = 'Podaj numer telefonu, na który możemy oddzwonić.';
      tel.focus(); return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.value.trim())) {
      oznacz(email, true); err.textContent = 'Podaj poprawny adres e-mail.'; email.focus(); return;
    }
    if (!zgoda.checked) {
      err.textContent = 'Potrzebujemy zgody na kontakt, żeby móc oddzwonić.';
      zgoda.focus(); return;
    }

    var utmy = zapamietajUtm();
    var fbc = ciastko('_fbc');
    if (!fbc && utmy.fbclid) fbc = 'fb.1.' + Date.now() + '.' + utmy.fbclid;

    var dane = {
      imie: imie.value.trim(),
      nazwisko: document.getElementById('rz_nazwisko').value.trim(),
      email: email.value.trim(),
      telefon: tel.value.trim(),
      dni: zaznaczone('dni'),
      pory: zaznaczone('pory'),
      prowadzi: document.getElementById('rz_prowadzi').value.trim(),
      przeszkoda: document.getElementById('rz_przeszkoda').value.trim(),
      zgoda: 'tak',
      wariant: wariant(),
      firma: document.getElementById('rz_firma').value,
      strona: location.href.split('#')[0],
      zrodlo: zrodloWizyty(utmy),
      fbp: ciastko('_fbp'),
      fbc: fbc
    };
    UTM.forEach(function (k) { if (utmy[k]) dane[k] = utmy[k]; });

    btn.disabled = true;
    var etykieta = btn.innerHTML;
    btn.textContent = 'Wysyłam…';
    try {
      var r = await fetch('/api/rozmowa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane)
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        var komunikaty = {
          invalid_email: 'Podaj poprawny adres e-mail.',
          invalid_phone: 'Podaj numer telefonu, na który możemy oddzwonić.',
          missing_consent: 'Potrzebujemy zgody na kontakt, żeby móc oddzwonić.',
          missing_fields: 'Uzupełnij imię, telefon i adres e-mail.'
        };
        throw new Error(komunikaty[d.error] || 'Nie udało się wysłać zgłoszenia.');
      }

      try { sessionStorage.removeItem(KEY); } catch (ex2) { /* nieistotne */ }
      form.hidden = true; ok.hidden = false;
      ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });

      /* Zdarzenie dopiero po potwierdzonym zapisie, nie po kliknięciu.
         eventID jest ten sam co po stronie serwera, więc Meta nie liczy dwa razy.
         Bez zgody na cookies window.fbq nie istnieje i zgłasza sam serwer. */
      if (window.fbq) {
        window.fbq('track', 'SubmitApplication', { content_name: 'Rozmowa GFP' },
          d.eventId ? { eventID: d.eventId } : undefined);
      }
    } catch (ex) {
      err.textContent = (ex && ex.message ? ex.message : 'Nie udało się wysłać zgłoszenia.') +
        ' Możesz też napisać na kontakt@psychedelictherapy.pl.';
    } finally {
      btn.disabled = false; btn.innerHTML = etykieta;
    }
  });
})();
