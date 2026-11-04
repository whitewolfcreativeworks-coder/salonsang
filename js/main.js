/* Salon Sang — page interactions */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sparkles ---------- */
  const cv = $('#sparkles'), ctx = cv.getContext('2d');
  let W, H, dpr, parts = [], running = !reduce, burst = 0;
  function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }
  size(); addEventListener('resize', size);
  const colors = ['255,255,255', '255,214,234', '255,228,170', '214,58,120'];
  function spawn(x, y, fast) {
    parts.push({
      x: x ?? Math.random() * W, y: y ?? Math.random() * H,
      vx: (Math.random() - .5) * (fast ? 3 : .25) * dpr, vy: (fast ? (Math.random() - .7) * 3 : Math.random() * .3 + .1) * dpr,
      r: (Math.random() * 2.2 + 1) * dpr, life: 0, max: fast ? 60 + Math.random() * 40 : 160 + Math.random() * 140,
      c: colors[(Math.random() * colors.length) | 0]
    });
  }
  function star(p, a) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = a; ctx.fillStyle = `rgb(${p.c})`;
    ctx.shadowColor = `rgba(${p.c},.9)`; ctx.shadowBlur = 8 * dpr;
    const r = p.r * 2.4; ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); ctx.restore();
  }
  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    const target = innerWidth < 600 ? 14 : 24;
    if (parts.length < target + burst && Math.random() < .3) spawn();
    burst = Math.max(0, burst - 1);
    parts = parts.filter(p => p.life < p.max);
    for (const p of parts) {
      p.life++; p.x += p.vx; p.y += p.vy;
      const t = p.life / p.max; star(p, Math.sin(t * Math.PI) * .85);
    }
    requestAnimationFrame(tick);
  }
  if (running) requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', () => {
    const want = !document.hidden && !reduce;
    if (want && !running) { running = true; requestAnimationFrame(tick); } else if (!want) running = false;
  });
  window.sparkleBurst = function (clientX, clientY, n = 24) {
    if (reduce) return;
    for (let i = 0; i < n; i++) spawn(clientX * dpr, clientY * dpr, true);
  };

  /* ---------- step inside ---------- */
  $('#lightsOn').addEventListener('click', e => {
    document.body.classList.add('lit');
    window.sparkleBurst(e.clientX, e.clientY, 40);
    window.fluidBurst && window.fluidBurst(24);
    setTimeout(() => lenis ? lenis.scrollTo('#welcome', { duration: 1.8 }) : $('#welcome').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 650);
  });

  /* ---------- booking bar appears after the door ---------- */
  const bar = $('.book-bar');
  new IntersectionObserver(([en]) => bar.classList.toggle('show', !en.isIntersecting), { threshold: .25 }).observe($('.door'));

  /* ---------- cinematic scroll: Lenis smooth scrolling + GSAP ScrollTrigger ---------- */
  let lenis = null;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis && !reduce) {
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      // pause smooth scroll while the camera try-on is open
      new MutationObserver(() => document.documentElement.classList.contains('no-scroll') ? lenis.stop() : lenis.start())
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    if (!reduce) {
      // the neon sign drifts back and the glow deepens as you leave the door
      gsap.to('.door-neon', { scale: 1.12, yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.door', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.door-content', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.door', start: 'top top', end: '70% top', scrub: true } });
      gsap.from('.chandelier', { y: -120, opacity: 0, rotate: -6, duration: 1.6, ease: 'elastic.out(1, 0.45)', scrollTrigger: { trigger: '.welcome', start: 'top 85%' } });
      gsap.from('.logo', { scale: .85, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.welcome', start: 'top 80%' } });
      const groups = [
        ['.welcome', '.script-line, .lede, .pillars li'], ['.suite', '.h2, .sub, .hotspot-photo'],
        ['.friends', '.h2, .seg, .seat, .friends-note'], ['.studio', '.studio-head > *'], ['.studio', '.wall-row, .ctl-grid, .studio-cta'],
        ['.gallery', '.h2, .sub'], ['.menu', '.menu-card'], ['.love', '.h2, .love-list li, .love .btn'],
        ['.home-care', '.sunflower, .h2, .lede, .care-list li, .home-care .btn'], ['.visit', '.h2, .visit-card']
      ];
      groups.forEach(([sec, sel]) => {
        const els = $$(sel, $(sec) || document).length ? $$(sel, $(sec)) : $$(sel);
        if (!els.length) return;
        gsap.from(els, { y: 46, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: els[0], start: 'top 88%' } });
      });
      gsap.from('.tile', { x: 80, opacity: 0, rotate: 3, duration: 1, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.strip', start: 'top 85%' } });
      gsap.fromTo('.stage', { clipPath: 'inset(8% 6% 8% 6% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none', scrollTrigger: { trigger: '.stage', start: 'top 95%', end: 'top 35%', scrub: true } });
    }
  }

  /* ---------- suite hotspots ---------- */
  const card = $('#hsCard');
  let openBtn = null;
  function closeCard() { card.hidden = true; if (openBtn) openBtn.setAttribute('aria-expanded', 'false'); openBtn = null; }
  $$('.hs').forEach(b => { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', b.dataset.title); });
  // delegated so the 3D suite's floating hotspots work too
  document.addEventListener('click', e => {
    const b = e.target.closest('.hs'); if (!b) return;
    if (openBtn === b) return closeCard();
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    $('#hsTitle').textContent = b.dataset.title; $('#hsText').textContent = b.dataset.text;
    card.hidden = false; b.setAttribute('aria-expanded', 'true'); openBtn = b;
    window.sparkleBurst(e.clientX, e.clientY, 14);
  });
  $('.hs-close').addEventListener('click', closeCard);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCard(); closeLb(); } });
  document.addEventListener('click', e => { if (!card.hidden && !e.target.closest('.hs, .hs-card')) closeCard(); });

  /* ---------- friends ---------- */
  const notes = {
    1: 'Your own private hour. Put your phone down, sink in, and let Sang take care of you.',
    2: 'Bring your bestie, your mom or your sister. One of you in the massage chair, one at the desk, catching up the whole time.',
    3: 'Room for a third who comes along for the company, perfect for a little one or a friend who just wants to hang out. (Two services at a time.)'
  };
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.n;
    $$('.seg button').forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.seat').forEach(s => s.classList.toggle('on', +s.dataset.seat <= n));
    $('#friendsNote').textContent = notes[n];
  }));

  /* ---------- menu tabs ---------- */
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.panel').forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
  }));

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  function closeLb() { lb.hidden = true; }
  $$('.tile').forEach(t => t.addEventListener('click', () => {
    const img = $('img', t); $('img', lb).src = img.src; $('img', lb).alt = img.alt;
    $('.lb-cap', lb).textContent = $('span', t).textContent; lb.hidden = false;
  }));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-close')) closeLb(); });

  /* ---------- sunflower petals ---------- */
  const pg = $('.sunflower .petals');
  if (pg) {
    let s = '';
    for (let i = 0; i < 18; i++) s += `<ellipse cx="0" cy="-36" rx="8" ry="20" fill="${i % 2 ? '#f4b52b' : '#f8c94a'}" transform="rotate(${i * 20})"/>`;
    pg.innerHTML = s;
  }

  $('#yr').textContent = new Date().getFullYear();
})();
