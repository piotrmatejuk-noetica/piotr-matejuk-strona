(function () {
  var processPhotos = [
    { src: "/shadow-work/photos/warsztat-0190.webp", label: "Praca z symbolem", phase: "Ekspresja" },
    { src: "/shadow-work/photos/warsztat-0934.webp", label: "Grupa, która wchodzi w proces razem", phase: "Spotkanie" },
    { src: "/shadow-work/photos/warsztat-3103.webp", label: "Wiedza natychmiast przechodzi w doświadczenie", phase: "Praktyka" },
    { src: "/shadow-work/photos/warsztat-4486.webp", label: "Droga przez noc ma swój kierunek", phase: "Zejście" },
    { src: "/shadow-work/photos/warsztat-6825.webp", label: "Pomiędzy procesami jest miejsce na oddech", phase: "Pauza" },
    { src: "/shadow-work/photos/warsztat-7886.webp", label: "Symbol porządkuje to, czego nie da się wyjaśnić", phase: "Rytuał" },
    { src: "/shadow-work/photos/warsztat-8559.webp", label: "Intensywnie nie znaczy bez bliskości", phase: "Wspólnota" },
    { src: "/shadow-work/photos/warsztat-w-terenie.webp", label: "Nie każdy proces potrzebuje czterech ścian", phase: "Integracja" }
  ];

  var placePhotos = [
    { src: "/shadow-work/photos/bieszczady-niebo.webp", label: "Niebo bez miejskiej łuny" },
    { src: "/shadow-work/photos/michniowiec-rytual.webp", label: "Poranki bez pośpiechu" },
    { src: "/shadow-work/photos/michniowiec-goscinnosc.webp", label: "Gościnność, która jest częścią procesu" },
    { src: "/shadow-work/photos/warsztat-kreg.webp", label: "Praca wychodzi na zewnątrz" },
    { src: "/shadow-work/photos/warsztat-7839.webp", label: "Prawdziwy dom, nie hotel konferencyjny" }
  ];

  var inspirePhotos = [
    { src: "/shadow-work/photos/inspire-dojazd-terenowki.webp", label: "Droga do Michniowca to już część procesu", phase: "Dojazd" },
    { src: "/shadow-work/photos/inspire-sala-procesowa.webp", label: "Sala procesowa, kiedy gasną światła", phase: "Trans" },
    { src: "/shadow-work/photos/inspire-warsztat-stol.webp", label: "Ręce zajęte, głowa się wycisza", phase: "Ekspresja", portrait: true },
    { src: "/shadow-work/photos/inspire-rysunek-podlogi.webp", label: "Rysunek zamiast słów, kiedy słowa nie wystarczają", phase: "Symbol" },
    { src: "/shadow-work/photos/inspire-grzyby.webp", label: "Las daje więcej niż tylko ciszę", phase: "Integracja", portrait: true }
  ];

  function pad2(n) { return String(n).padStart(2, "0"); }

  // Podmiana zdjecia w sliderze. Aktywny slajd jest wtedy w kadrze, wiec musi wejsc
  // od razu (loading="eager") — lazy zostaje tylko w statycznym HTML, zanim sekcja
  // dojedzie do viewportu. decoding="async" zdejmuje dekodowanie z watku glownego.
  function swapPhoto(img, photo, immediate) {
    if (!img) return;
    img.decoding = "async";
    if (immediate) img.loading = "eager";
    img.src = photo.src;
    img.alt = photo.label;
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
  }

  function initReveal() {
    var elements = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    }, { threshold: 0.14 });
    elements.forEach(function (el) { observer.observe(el); });
  }

  function initScrollProgress() {
    var bar = document.querySelector(".scroll-progress span");
    var raf = 0;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = "scaleX(" + ratio + ")";
      document.documentElement.style.setProperty("--scroll", String(ratio));
      document.documentElement.style.setProperty("--scroll-px", window.scrollY + "px");
      raf = 0;
    }
    window.addEventListener("scroll", function () {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function initCursorOrb() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var orb = document.querySelector(".cursor-orb");
    if (reduced || !orb) return;
    window.addEventListener("pointermove", function (event) {
      orb.style.transform = "translate3d(" + event.clientX + "px, " + event.clientY + "px, 0)";
    }, { passive: true });
  }

  function buildReel(config) {
    var root = document.querySelector(config.rootSelector);
    if (!root) return;
    var photos = config.photos;
    var index = 0;
    var interacted = false;

    function render() {
      var photo = photos[index];
      config.renderStage(root, photo, index, photos.length, interacted);
      var thumbs = root.querySelectorAll(config.thumbSelector);
      thumbs.forEach(function (btn, i) {
        btn.classList.toggle("is-active", i === index);
        if (i === index) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }

    function change(direction) {
      interacted = true;
      index = (index + direction + photos.length) % photos.length;
      render();
    }

    root.querySelectorAll(config.prevSelector).forEach(function (btn) {
      btn.addEventListener("click", function () { change(-1); });
    });
    root.querySelectorAll(config.nextSelector).forEach(function (btn) {
      btn.addEventListener("click", function () { change(1); });
    });
    root.querySelectorAll(config.thumbSelector).forEach(function (btn, i) {
      if (config.labelThumbs && photos[i]) {
        btn.setAttribute("aria-label", "Zdjęcie " + pad2(i + 1) + ": " + photos[i].label);
      }
      btn.addEventListener("click", function () { interacted = true; index = i; render(); });
    });
    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") change(-1);
      if (event.key === "ArrowRight") change(1);
    });

    render();
  }

  function initProcessReel() {
    buildReel({
      rootSelector: "#process-reel",
      photos: processPhotos,
      prevSelector: ".js-process-prev",
      nextSelector: ".js-process-next",
      thumbSelector: ".js-process-thumb",
      labelThumbs: true,
      renderStage: function (root, photo, index, total, immediate) {
        var img = root.querySelector(".js-process-image");
        var counter = root.querySelector(".js-process-counter");
        var phase = root.querySelector(".js-process-phase");
        var label = root.querySelector(".js-process-label");
        swapPhoto(img, photo, immediate);
        if (counter) counter.textContent = pad2(index + 1) + " / " + pad2(total);
        if (phase) phase.textContent = photo.phase;
        if (label) label.textContent = photo.label;
      }
    });
  }

  function initPlaceReel() {
    buildReel({
      rootSelector: "#place-reel",
      photos: placePhotos,
      prevSelector: ".js-place-prev",
      nextSelector: ".js-place-next",
      thumbSelector: ".js-place-thumb",
      renderStage: function (root, photo, index, total, immediate) {
        var img = root.querySelector(".js-place-image");
        var counter = root.querySelector(".js-place-counter");
        var label = root.querySelector(".js-place-label");
        swapPhoto(img, photo, immediate);
        if (counter) counter.textContent = pad2(index + 1) + " / " + pad2(total);
        if (label) label.textContent = photo.label;
      }
    });
  }

  function initInspireReel() {
    buildReel({
      rootSelector: "#inspire-reel",
      photos: inspirePhotos,
      prevSelector: ".js-inspire-prev",
      nextSelector: ".js-inspire-next",
      thumbSelector: ".js-inspire-thumb",
      labelThumbs: true,
      renderStage: function (root, photo, index, total, immediate) {
        var img = root.querySelector(".js-inspire-image");
        var figure = root.querySelector(".photo-reel__figure");
        var counter = root.querySelector(".js-inspire-counter");
        var phase = root.querySelector(".js-inspire-phase");
        var label = root.querySelector(".js-inspire-label");
        swapPhoto(img, photo, immediate);
        if (figure) figure.classList.toggle("is-portrait", !!photo.portrait);
        if (counter) counter.textContent = pad2(index + 1) + " / " + pad2(total);
        if (phase) phase.textContent = photo.phase;
        if (label) label.textContent = photo.label;
      }
    });
  }

  function initApplicationForm() {
    var form = document.getElementById("application-form");
    if (!form) return;
    var formBody = document.getElementById("application-form-body");
    var successPanel = document.getElementById("application-success");
    var submitBtn = form.querySelector(".application__submit");
    var status = document.getElementById("application-status");
    var defaultLabel = submitBtn ? submitBtn.querySelector("span").textContent : "";
    var sent = false;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (sent) return;
      var data = new FormData(form);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.querySelector("span").textContent = "Wysyłam…";
      }
      if (status) status.style.display = "none";

      fetch("/api/shadow-work-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          motivation: data.get("motivation")
        })
      })
        .then(function (r) { return r.json().then(function (json) { return { ok: r.ok, json: json }; }); })
        .then(function (result) {
          if (result.ok && result.json && result.json.ok) {
            sent = true;
            form.reset();
            if (formBody && successPanel) {
              formBody.style.display = "none";
              successPanel.hidden = false;
            }
            if (window.fbq) { fbq("track", "Lead", { content_name: "shadow-work" }); }
          } else {
            throw new Error("send_failed");
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = "Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo napisz przez bartekgarbiec.pl.";
            status.style.color = "#b3261e";
            status.style.display = "block";
          }
        })
        .finally(function () {
          if (submitBtn && !sent) {
            submitBtn.disabled = false;
            submitBtn.querySelector("span").textContent = defaultLabel;
          }
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initScrollProgress();
    initCursorOrb();
    initProcessReel();
    initInspireReel();
    initPlaceReel();
    initApplicationForm();
  });
})();
