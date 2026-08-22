/* ONESHOT PODGLĄD — silnik scroll-scrub hero (wzorzec: skill creating-oneshot-landing-pages) */
document.addEventListener('DOMContentLoaded', () => {
  const video   = document.getElementById('hero-video');
  const section = document.getElementById('hero-section');
  const phases  = [
    { el: document.getElementById('phase-0'), in: [-0.10, 0.00], out: [0.20, 0.30], drift: -40 },
    { el: document.getElementById('phase-1'), in: [0.30, 0.40], out: [0.56, 0.66], drift:  30, anchor: 0.46 },
    { el: document.getElementById('phase-2'), in: [0.66, 0.76], out: [0.94, 1.00], drift:  30, anchor: 0.82 }
  ];
  if (!video || !section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Preload przez blob — seek bez czekania na range requesty
  fetch('/shadow-work/oneshot/assets/hero.mp4')
    .then(r => { if (!r.ok) throw new Error('hero.mp4 nieosiągalny'); return r.blob(); })
    .then(b => { video.src = URL.createObjectURL(b); video.load(); })
    .catch(() => { video.src = '/shadow-work/oneshot/assets/hero.mp4'; video.load(); });

  if (reduced) { video.removeAttribute('preload'); return; }

  // 2. Znormalizowany progres scrolla
  let target = 0, current = 0;
  function measure() {
    const r = section.getBoundingClientRect();
    const max = r.height - window.innerHeight;
    if (max > 0) target = Math.max(0, Math.min(1, -r.top / max));
  }
  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  measure();

  // 3. Krzywa widoczności zamknięta w progresie, nie w czasie
  function opacityAt(p, [inA, inB], [outA, outB]) {
    if (p < inA || p > outB) return 0;
    if (p < inB) return (p - inA) / (inB - inA);
    if (p > outA) return Math.max(0, 1 - (p - outA) / (outB - outA));
    return 1;
  }

  // 4. Pętla
  function loop() {
    current += (target - current) * 0.15;

    if (video.duration && !video.seeking) {
      const t = current * video.duration;
      if (Math.abs(video.currentTime - t) > 0.015) video.currentTime = t;
    }

    for (const ph of phases) {
      if (!ph.el) continue;
      const o = opacityAt(target, ph.in, ph.out);
      const shift = ph.anchor === undefined ? -target * Math.abs(ph.drift)
                                            : (ph.anchor - target) * ph.drift;
      ph.el.style.opacity = o.toFixed(3);
      ph.el.style.transform = `translateY(${shift.toFixed(1)}px)`;
      // klikalne tylko gdy realnie widoczne
      ph.el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
      ph.el.setAttribute('aria-hidden', o < 0.05 ? 'true' : 'false');
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
});
