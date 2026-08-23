(function () {
  'use strict';
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
    var imie = document.getElementById('wb_imie'),
        email = document.getElementById('wb_email');

    if (!imie.value.trim()) {
      oznacz(imie, true); err.textContent = 'Podaj imię.'; imie.focus(); return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.value.trim())) {
      oznacz(email, true); err.textContent = 'Podaj poprawny adres e-mail.'; email.focus(); return;
    }

    var dane = {
      imie: imie.value.trim(),
      email: email.value.trim(),
      termin: (form.querySelector('input[name="termin"]:checked') || {}).value,
      firma: document.getElementById('wb_firma').value
    };

    btn.disabled = true; btn.textContent = 'Zapisuję…';
    try {
      var r = await fetch('/api/webinar-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dane)
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error === 'invalid_email' ? 'Podaj poprawny adres e-mail.' : 'Nie udało się zapisać.');
      okTermin.textContent = 'Termin: ' + (d.termin || '');
      form.hidden = true; ok.hidden = false;
      ok.scrollIntoView({ block: 'nearest' });
    } catch (ex) {
      err.textContent = (ex && ex.message ? ex.message : 'Nie udało się zapisać.') +
        ' Możesz też napisać na kontakt@psychedelictherapy.pl.';
    } finally {
      btn.disabled = false; btn.textContent = 'Zapisz mnie na webinar';
    }
  });
})();
