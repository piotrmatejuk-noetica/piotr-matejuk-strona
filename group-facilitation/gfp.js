/* Group Facilitation Program — piotrmatejuk.com
   Countdown, reveal on scroll, pole grupowe (canvas), formularz zgłoszeniowy. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- COUNTDOWN ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var now = Date.now();
    document.querySelectorAll('.countdown').forEach(function (cd) {
      var dl = new Date(cd.getAttribute('data-deadline')).getTime();
      var diff = Math.max(0, dl - now);
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      var set = function (k, v) { var el = cd.querySelector('[data-cd="' + k + '"]'); if (el) el.textContent = v; };
      set('d', d); set('h', pad(h)); set('m', pad(m)); set('s', pad(s));
    });
  }
  tick(); setInterval(tick, 1000);

  /* ---------- REVEAL ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- NAWIGACJA MOBILNA ----------
     Cala struktura budowana tutaj (index.html nietykalny).
     Pozycje czytane z <nav class="topbar-links"> na desktopie, zeby menu
     nie rozjechalo sie przy przyszlej zmianie nawigacji. */
  (function () {
    var topbar = document.querySelector('.topbar');
    var row = topbar && topbar.querySelector('.topbar-in');
    var src = topbar && topbar.querySelector('.topbar-links');
    if (!topbar || !row || !src) return;

    var items = [].slice.call(src.querySelectorAll('a[href]'));
    if (!items.length) return;

    var PANEL_ID = 'mnavPanel';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mnav-toggle';
    btn.id = 'mnavToggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', PANEL_ID);
    btn.setAttribute('aria-label', 'Menu sekcji strony');
    btn.innerHTML = '<span class="mnav-bars" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span>';

    var panel = document.createElement('nav');
    panel.className = 'mnav-panel';
    panel.id = PANEL_ID;
    panel.setAttribute('aria-label', 'Sekcje strony');
    panel.setAttribute('data-open', 'false');
    panel.hidden = true;

    var ul = document.createElement('ul');
    ul.className = 'mnav-list';
    items.forEach(function (a) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = (a.textContent || '').trim();
      li.appendChild(link);
      ul.appendChild(li);
    });
    panel.appendChild(ul);

    var right = row.querySelector('.topbar-r');
    if (right) right.insertBefore(btn, right.firstChild); else row.appendChild(btn);
    topbar.appendChild(panel);

    var open = false;
    function setOpen(v, returnFocus) {
      if (v === open) return;
      open = v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) {
        panel.hidden = false;
        // wymuszenie reflow, zeby przejscie krycia mialo od czego wystartowac
        void panel.offsetWidth;
        panel.setAttribute('data-open', 'true');
      } else {
        panel.setAttribute('data-open', 'false');
        window.setTimeout(function () { if (!open) panel.hidden = true; }, 200);
        if (returnFocus) btn.focus();
      }
    }

    btn.addEventListener('click', function () { setOpen(!open, false); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false, false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false, true); }
    });
    document.addEventListener('click', function (e) {
      if (open && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false, false);
    });
    document.addEventListener('focusin', function (e) {
      if (open && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false, false);
    });
    window.addEventListener('resize', function () {
      if (open && getComputedStyle(btn).display === 'none') setOpen(false, false);
    });
  })();

  /* ---------- POLE GRUPOWE (canvas za portretem) ---------- */
  function ringField(canvas, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2, accent = opts.accent || '124,154,135';
    var rings = opts.rings || 7, maxR = Math.min(W, H) * 0.46, dots = opts.dots !== false;
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < rings; i++) {
        var base = (i + 1) / rings;
        var breathe = reduce ? 0 : Math.sin(t / 1400 - i * 0.5) * 0.012;
        var r = maxR * (base + breathe);
        var a = (1 - base) * 0.45 + 0.06;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + accent + ',' + a.toFixed(3) + ')';
        ctx.lineWidth = i === 0 ? 1.6 : 1; ctx.stroke();
      }
      if (dots) {
        var n = opts.n || 12, pr = maxR * 0.74;
        for (var k = 0; k < n; k++) {
          var ang = (k / n) * Math.PI * 2 - Math.PI / 2;
          var wob = reduce ? 0 : Math.sin(t / 900 + k) * (maxR * 0.012);
          var x = cx + Math.cos(ang) * (pr + wob), y = cy + Math.sin(ang) * (pr + wob);
          ctx.beginPath(); ctx.arc(x, y, W * 0.011, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + accent + ',0.85)'; ctx.fill();
        }
      }
    }
    if (reduce) { draw(0); return; }
    function loop(ts) { draw(ts); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  }
  ringField(document.getElementById('ring2'), { accent: '124,154,135', rings: 7, n: 14 });

  /* ---------- FORMULARZ ZGŁOSZENIOWY ---------- */
  (function () {
    var dlg = document.getElementById('signupDlg');
    if (!dlg) return;
    var form = document.getElementById('signupForm'),
      ok = document.getElementById('signupOk'),
      err = document.getElementById('signupErr'),
      btn = document.getElementById('signupSubmit'),
      ENDPOINT = '/api/gfp-signup';

    var KEY = 'gfp_zgloszenie', lastTrigger = null;

    /* Wypelniony formularz przezywa przypadkowe zamkniecie i odswiezenie karty. */
    function zapiszStan() {
      try {
        var d = {};
        new FormData(form).forEach(function (v, k) { if (k !== 'firma') d[k] = String(v); });
        sessionStorage.setItem(KEY, JSON.stringify(d));
      } catch (e) { /* tryb prywatny — dzialamy dalej bez zapisu */ }
    }
    function wczytajStan() {
      try {
        var raw = sessionStorage.getItem(KEY); if (!raw) return;
        var d = JSON.parse(raw);
        Object.keys(d).forEach(function (k) {
          var pola = form.querySelectorAll('[name="' + k + '"]');
          pola.forEach(function (el) {
            if (el.type === 'radio' || el.type === 'checkbox') { if (el.value === d[k]) el.checked = true; }
            else el.value = d[k];
          });
        });
        form.querySelectorAll('input[data-reveal], input[data-hide]').forEach(function (r) {
          if (r.checked) r.dispatchEvent(new Event('change', { bubbles: true }));
        });
      } catch (e) { /* uszkodzony zapis ignorujemy */ }
    }
    function wyczyscStan() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
    function czyWypelniony() {
      var pusty = true;
      new FormData(form).forEach(function (v, k) {
        if (k !== 'firma' && String(v).trim()) pusty = false;
      });
      return !pusty;
    }

    function open(trigger) {
      lastTrigger = trigger || null;
      err.className = 'signup-msg'; err.textContent = '';
      form.style.display = ''; ok.style.display = 'none';
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      wczytajStan();
      var first = document.getElementById('f_imie');
      if (first) setTimeout(function () { first.focus(); }, 60);
    }
    function close() {
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      /* fokus wraca tam, skad przyszedl — inaczej laduje na <body> */
      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
      lastTrigger = null;
    }

    /* Walidacja polowa: pokazuje ktore pole jest zle, zamiast jednego zbiorczego komunikatu. */
    var WYMAGANE = [
      { id: 'f_imie', label: 'imię' },
      { id: 'f_nazwisko', label: 'nazwisko' },
      { id: 'f_email', label: 'adres e-mail' },
      { id: 'f_tel', label: 'numer telefonu' }
    ];
    function polePuste(el) {
      return el.type === 'checkbox' ? !el.checked : !String(el.value || '').trim();
    }
    function zleEmail(el) {
      return el.id === 'f_email' && el.value.trim() && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(el.value.trim());
    }
    function oznacz(el, zle) {
      if (zle) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    }
    WYMAGANE.forEach(function (f) {
      var el = document.getElementById(f.id); if (!el) return;
      el.addEventListener('blur', function () { oznacz(el, polePuste(el) || zleEmail(el)); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) oznacz(el, false); });
    });
    var zgoda = document.getElementById('f_zgoda');
    if (zgoda) zgoda.addEventListener('change', function () { oznacz(zgoda, !zgoda.checked); });

    function pierwszyBlad() {
      for (var i = 0; i < WYMAGANE.length; i++) {
        var el = document.getElementById(WYMAGANE[i].id);
        if (!el) continue;
        if (polePuste(el)) return { el: el, tekst: 'Uzupełnij ' + WYMAGANE[i].label + '.' };
        if (zleEmail(el)) return { el: el, tekst: 'Podaj poprawny adres e-mail.' };
      }
      if (zgoda && !zgoda.checked) return { el: zgoda, tekst: 'Potrzebuję twojej zgody na kontakt, żeby się odezwać.' };
      return null;
    }

    // Formularz otwierają WYŁĄCZNIE elementy z data-action="signup".
    // Główne CTA (topbar, hero, pasek mobilny, sekcja finalna) prowadzą do #cennik
    // i nie są tutaj przechwytywane.
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('[data-action="signup"]') : null;
      if (!trigger) return;
      e.preventDefault();
      open(trigger);
    });

    document.getElementById('signupClose').addEventListener('click', close);
    document.getElementById('signupDone').addEventListener('click', close);
    /* Klikniecie w tlo nie moze skasowac kilku minut pisania. */
    dlg.addEventListener('click', function (e) {
      if (e.target !== dlg) return;
      if (czyWypelniony()) return;
      close();
    });
    form.addEventListener('input', zapiszStan);
    form.addEventListener('change', zapiszStan);

    // "Mam pomysł: tak" odsłania pole opisu.
    document.querySelectorAll('input[data-reveal]').forEach(function (r) {
      r.addEventListener('change', function () {
        var w = document.getElementById(r.getAttribute('data-reveal'));
        if (w) w.style.display = (r.value === 'tak' && r.checked) ? '' : 'none';
      });
    });

    // "Prowadzę już warsztaty: nie" odsłania pytanie o zamiar. Przy "tak" jest bez sensu.
    document.querySelectorAll('input[data-hide]').forEach(function (r) {
      r.addEventListener('change', function () {
        var w = document.getElementById(r.getAttribute('data-hide'));
        if (!w) return;
        var pokaz = (r.value === 'nie' && r.checked);
        w.style.display = pokaz ? '' : 'none';
        if (!pokaz) w.querySelectorAll('input[type="radio"]').forEach(function (x) { x.checked = false; });
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      err.className = 'signup-msg'; err.textContent = '';
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { data[k] = String(v); });
      ['imie', 'nazwisko', 'email', 'telefon'].forEach(function (k) { data[k] = (data[k] || '').trim(); });

      var blad = pierwszyBlad();
      if (blad) {
        oznacz(blad.el, true);
        err.className = 'signup-msg err'; err.textContent = blad.tekst;
        blad.el.focus({ preventScroll: false });
        return;
      }

      btn.disabled = true; btn.innerHTML = 'Wysyłam…';
      try {
        var r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!r.ok) {
          var d = await r.json().catch(function () { return {}; });
          throw new Error(d.error === 'missing_fields'
            ? 'Uzupełnij wymagane pola.'
            : 'Nie udało się wysłać zgłoszenia.');
        }
        if (window.fbq) fbq('track', 'Lead', { content_name: 'group-facilitation' });
        wyczyscStan();
        form.style.display = 'none'; ok.style.display = '';
      } catch (ex) {
        err.className = 'signup-msg err';
        err.textContent = (ex && ex.message ? ex.message : 'Nie udało się wysłać.')
          + ' Możesz też napisać bezpośrednio na kontakt@psychedelictherapy.pl.';
      } finally {
        btn.disabled = false; btn.innerHTML = 'Wyślij zgłoszenie <span class="arrow">&rarr;</span>';
      }
    });
  })();
})();
