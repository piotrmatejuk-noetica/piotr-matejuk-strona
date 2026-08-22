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

    function open() {
      err.className = 'signup-msg'; err.textContent = '';
      form.style.display = ''; ok.style.display = 'none';
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      var first = document.getElementById('f_imie');
      if (first) setTimeout(function () { first.focus(); }, 60);
    }
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

    // Każde CTA prowadzące do zapisu otwiera formularz.
    document.querySelectorAll('a.btn, a.pay-alt').forEach(function (a) {
      var t = (a.textContent || '').toLowerCase();
      if (a.classList.contains('btn--buy')) return;   // linki Stripe idą wprost do Stripe
      if (t.indexOf('zapisz si') > -1 || t.indexOf('zarezerwuj') > -1 || t.indexOf('wybieram premium') > -1 || t.indexOf('dowiedz się więcej') > -1 || t.indexOf('porozmawia') > -1) {
        a.addEventListener('click', function (e) { e.preventDefault(); open(); });
      }
    });

    document.getElementById('signupClose').addEventListener('click', close);
    document.getElementById('signupDone').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

    // "Mam pomysł: tak" odsłania pole opisu.
    document.querySelectorAll('input[data-reveal]').forEach(function (r) {
      r.addEventListener('change', function () {
        var w = document.getElementById(r.getAttribute('data-reveal'));
        if (w) w.style.display = (r.value === 'tak' && r.checked) ? '' : 'none';
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      err.className = 'signup-msg'; err.textContent = '';
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { data[k] = String(v); });
      ['imie', 'nazwisko', 'email', 'telefon'].forEach(function (k) { data[k] = (data[k] || '').trim(); });

      if (!data.imie || !data.nazwisko || !data.email || !data.telefon) {
        err.className = 'signup-msg err'; err.textContent = 'Uzupełnij imię, nazwisko, e-mail i telefon.'; return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(data.email)) {
        err.className = 'signup-msg err'; err.textContent = 'Podaj poprawny adres e-mail.'; return;
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
