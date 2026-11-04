/* Salon Sang — "Design your nails" studio
   Tap a bottle to paint every nail, tap a single nail to mix colors.
   The "Text this design to Sang" button writes the design into a text message. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const svg = $('#hand');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHONE = '+15306484977';

  const COLORS = [
    ['Sang Pink', '#e2457f'], ['Ballet Slipper', '#f5c4cf'], ['Hot Fuchsia', '#d4157a'], ['Cherry Red', '#b3122e'],
    ['Wine', '#6d1b33'], ['Peach Sorbet', '#f7a98b'], ['Butter', '#f4df86'], ['Sunflower', '#f2b21b'],
    ['Mint', '#9fe3c4'], ['Teal Lagoon', '#1e9fa3'], ['Lilac', '#b9a3e3'], ['Royal Violet', '#5b2c8f'],
    ['Sky', '#8ec5ea'], ['Midnight Navy', '#1d2a6b'], ['Milky White', '#f6f2ec'], ['Little Black Dress', '#1b1b1f']
  ];
  const RAINBOW = [['Ocean Blue', '#3f6fb8'], ['Violet', '#7a3fb8'], ['Rose', '#e07aa6'], ['Lemon', '#d6cf55'], ['Emerald', '#1f8a5b']];
  const TONES = ['#f6d6c6', '#e9bb98', '#c88d66', '#8f5b3c', '#5f3b27'];
  const FINGERS = [ // pinky, ring, middle, index, thumb
    { name: 'pinky', cx: 64, top: 122, w: 46, rot: -7 },
    { name: 'ring finger', cx: 122, top: 74, w: 52, rot: -3 },
    { name: 'middle finger', cx: 184, top: 54, w: 54, rot: 0 },
    { name: 'index finger', cx: 246, top: 74, w: 52, rot: 3 },
    { name: 'thumb', cx: 286, top: 160, w: 58, rot: 14 }
  ];
  const ACCENT = 1; // ring finger
  const BARE = '#f2cfc4';

  const st = {
    shape: 'almond', finish: 'gloss', art: 'none', tone: TONES[1],
    color: COLORS[0], nails: [null, null, null, null, null], rainbow: false
  };
  const fresh = new Set();

  /* ---------- color helpers ---------- */
  const hex = h => { if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join(''); return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (h, w, t) => { const a = hex(h), b = hex(w); return toHex(a.map((v, i) => v + (b[i] - v) * t)); };
  const lum = h => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* ---------- nail geometry (origin = cuticle center, nail grows toward -y) ---------- */
  function nailDims(f) {
    const w = f.w * 0.72, base = f.w * 0.92;
    const h = { square: base * 1.05, round: base, almond: base * 1.28, stiletto: base * 1.5 }[st.shape];
    return { w, h };
  }
  function nailPath(w, h) {
    const x = w / 2, c = h * 0.16;
    let tip;
    switch (st.shape) {
      case 'square': tip = `L ${x} ${-h + 5} Q ${x} ${-h} ${x - 5} ${-h} L ${-x + 5} ${-h} Q ${-x} ${-h} ${-x} ${-h + 5}`; break;
      case 'round': tip = `L ${x} ${-h * 0.72} C ${x} ${-h * 0.95} ${x * 0.55} ${-h} 0 ${-h} C ${-x * 0.55} ${-h} ${-x} ${-h * 0.95} ${-x} ${-h * 0.72}`; break;
      case 'almond': tip = `L ${x} ${-h * 0.55} C ${x} ${-h * 0.8} ${x * 0.35} ${-h * 0.97} 0 ${-h} C ${-x * 0.35} ${-h * 0.97} ${-x} ${-h * 0.8} ${-x} ${-h * 0.55}`; break;
      default: tip = `L ${x} ${-h * 0.45} C ${x} ${-h * 0.7} ${x * 0.12} ${-h * 0.94} 0 ${-h} C ${-x * 0.12} ${-h * 0.94} ${-x} ${-h * 0.7} ${-x} ${-h * 0.45}`;
    }
    return `M ${-x} ${-c} Q ${-x} 0 0 0 Q ${x} 0 ${x} ${-c} ${tip} Z`;
  }

  /* ---------- art ---------- */
  function art(kind, w, h, base) {
    const cy = -h * 0.5, light = lum(base) > 0.62;
    const ink = light ? '#d4157a' : '#ffffff';
    switch (kind) {
      case 'daisy': {
        let s = '';
        for (let i = 0; i < 8; i++) s += `<ellipse cx="0" cy="-5.2" rx="2.6" ry="5" fill="#fff" stroke="rgba(0,0,0,.08)" stroke-width=".5" transform="translate(0 ${cy}) rotate(${i * 45})"/>`;
        return s + `<circle cx="0" cy="${cy}" r="2.8" fill="#f6c22b"/>`;
      }
      case 'sunflower': {
        let s = '';
        for (let i = 0; i < 12; i++) s += `<ellipse cx="0" cy="-6" rx="2.2" ry="4.6" fill="${i % 2 ? '#f4b52b' : '#f9cd4a'}" transform="translate(0 ${cy}) rotate(${i * 30})"/>`;
        return s + `<circle cx="0" cy="${cy}" r="3.6" fill="#6b3f1d"/>`;
      }
      case 'starfish': {
        const pts = [];
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = -Math.PI / 2 + i * Math.PI / 5; pts.push(`${(Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`); }
        let dots = '';
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; dots += `<circle cx="${(Math.cos(a) * 5.5).toFixed(1)}" cy="${(cy + Math.sin(a) * 5.5).toFixed(1)}" r=".9" fill="#fff"/>`; }
        return `<polygon points="${pts.join(' ')}" fill="#f2a23a" stroke="#d9822a" stroke-width=".8" stroke-linejoin="round"/>${dots}<circle cx="0" cy="${cy}" r="1" fill="#fff"/>`;
      }
      case 'dots': {
        const col = light ? '#1b1b1f' : '#ffffff';
        let s = '';
        for (let r = 0; r < 6; r++) for (let c = -2; c <= 2; c++) {
          const x = c * 7 + (r % 2 ? 3.5 : 0), y = -6 - r * 7.5;
          if (-y < h - 2) s += `<circle cx="${x}" cy="${y}" r="2.3" fill="${col}"/>`;
        }
        return s;
      }
      case 'french':
        return `<path d="M ${-w} ${-h - 4} L ${w} ${-h - 4} L ${w} ${-h * 0.8} Q 0 ${-h * 0.62} ${-w} ${-h * 0.8} Z" fill="#fbf8f4"/>`;
      case 'gem': {
        const y = -h * 0.28;
        return `<g transform="translate(0 ${y})"><polygon points="0,-6 5,0 0,6 -5,0" fill="#eaf6ff" stroke="#9cc4e6" stroke-width=".8"/><polygon points="0,-6 2,0 0,6 -2,0" fill="#ffffff" opacity=".9"/></g>
                <circle cx="-6" cy="${y - 8}" r="1.3" fill="#fff"/><circle cx="6" cy="${y - 8}" r="1.3" fill="#fff"/>`;
      }
      case 'heart':
        return `<path transform="translate(0 ${cy + 1}) scale(.55)" d="M0 10 C-14 0 -12 -12 -4 -12 C0 -12 0 -8 0 -6 C0 -8 0 -12 4 -12 C12 -12 14 0 0 10 Z" fill="${ink}"/>`;
      default: return '';
    }
  }

  /* ---------- finish fill ---------- */
  function paintFill(i, base, w, h) {
    const id = `p${i}`;
    switch (st.finish) {
      case 'cateye':
        return {
          defs: `<linearGradient id="${id}" class="cat" x1="0" y1="1" x2="1" y2="0">
                   <stop offset="0" stop-color="${mix(base, '#000', .45)}"/>
                   <stop class="c1" offset=".38" stop-color="${mix(base, '#000', .25)}"/>
                   <stop class="c2" offset=".5" stop-color="${mix(base, '#fff', .62)}"/>
                   <stop class="c3" offset=".62" stop-color="${mix(base, '#000', .25)}"/>
                   <stop offset="1" stop-color="${mix(base, '#000', .5)}"/></linearGradient>`,
          body: `<rect x="${-w}" y="${-h - 6}" width="${w * 2}" height="${h + 12}" fill="url(#${id})"/>`
        };
      case 'chrome':
        return {
          defs: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
                   <stop offset="0" stop-color="${mix(base, '#fff', .7)}"/><stop offset=".35" stop-color="${mix(base, '#fff', .3)}"/>
                   <stop offset=".5" stop-color="#ffffff"/><stop offset=".65" stop-color="${mix(base, '#fff', .35)}"/>
                   <stop offset="1" stop-color="${mix(base, '#c9b6ff', .4)}"/></linearGradient>`,
          body: `<rect x="${-w}" y="${-h - 6}" width="${w * 2}" height="${h + 12}" fill="url(#${id})"/>`
        };
      case 'glitter': {
        let s = `<rect x="${-w}" y="${-h - 6}" width="${w * 2}" height="${h + 12}" fill="${base}"/>`;
        let seed = (i + 1) * 9301;
        const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let k = 0; k < 46; k++) {
          const c = ['#ffffff', '#ffe7f1', '#f3dc97', '#d8e9ff'][k % 4];
          s += `<circle cx="${((rnd() - .5) * w).toFixed(1)}" cy="${(-rnd() * h).toFixed(1)}" r="${(rnd() * 1.3 + .5).toFixed(1)}" fill="${c}" opacity="${(rnd() * .5 + .5).toFixed(2)}"/>`;
        }
        return { defs: '', body: s };
      }
      case 'jelly':
        return { defs: '', body: `<rect x="${-w}" y="${-h - 6}" width="${w * 2}" height="${h + 12}" fill="${base}" opacity=".68"/>` };
      default:
        return { defs: '', body: `<rect x="${-w}" y="${-h - 6}" width="${w * 2}" height="${h + 12}" fill="${base}"/>` };
    }
  }

  /* ---------- render ---------- */
  function render() {
    const tone = st.tone, toneDark = mix(tone, '#5a2e1c', .18);
    let out = `<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#5a2e1c" flood-opacity=".22"/></filter></defs>`;
    FINGERS.forEach((f, i) => {
      const { w, h } = nailDims(f);
      const cuticleY = f.top + f.w * 1.0;
      const color = st.nails[i];
      const d = nailPath(w, h);
      const finger = `M ${f.cx - f.w / 2} 330 L ${f.cx - f.w / 2} ${f.top + f.w / 2} A ${f.w / 2} ${f.w / 2} 0 0 1 ${f.cx + f.w / 2} ${f.top + f.w / 2} L ${f.cx + f.w / 2} 330 Z`;
      const showArt = st.art === 'french' || (i === ACCENT && st.art !== 'none');
      let paint = '';
      if (color) {
        const fill = paintFill(i, color[1], w, h);
        paint = `${fill.defs}<g clip-path="url(#sw${i})">${fill.body}${showArt ? art(st.art, w, h, color[1]) : ''}</g>`;
      } else if (showArt) {
        paint = `<g>${art(st.art, w, h, BARE)}</g>`;
      }
      const sweepY = fresh.has(i) && !reduce ? 4 : -h - 8;
      out += `
      <g class="finger" data-i="${i}" transform="rotate(${f.rot} ${f.cx} 300)" role="button" tabindex="0" aria-label="Paint ${f.name}">
        <path d="${finger}" fill="${tone}" stroke="${toneDark}" stroke-width="1.2"/>
        <path d="M ${f.cx - f.w * .28} ${cuticleY + f.w * .55} q ${f.w * .28} 6 ${f.w * .56} 0" stroke="${toneDark}" stroke-width="1" fill="none" opacity=".45"/>
        <g transform="translate(${f.cx} ${cuticleY})">
          <clipPath id="nc${i}"><path d="${d}"/></clipPath>
          <clipPath id="sw${i}"><rect class="sweep" data-h="${h}" x="${-w}" y="${sweepY}" width="${w * 2}" height="${h + 16}"/></clipPath>
          <path d="${d}" fill="${BARE}" stroke="${mix(tone, '#7a3a2a', .3)}" stroke-width="1" filter="url(#soft)"/>
          <g clip-path="url(#nc${i})">
            ${paint}
            <ellipse cx="${-w * .2}" cy="${-h * .55}" rx="${w * .09}" ry="${h * .3}" fill="#fff" opacity="${color ? (st.finish === 'chrome' ? .35 : .55) : .35}"/>
            <ellipse cx="${w * .22}" cy="${-h * .3}" rx="${w * .04}" ry="${h * .1}" fill="#fff" opacity=".3"/>
          </g>
          <path d="${d}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=".8"/>
        </g>
      </g>`;
    });
    svg.innerHTML = out;
    animateSweeps();
    updateLink();
  }

  function animateSweeps() {
    if (!fresh.size) return;
    const items = [...fresh].map(i => ({ i, el: svg.querySelector(`#sw${i} .sweep`) })).filter(o => o.el);
    fresh.clear();
    if (reduce) return;
    const t0 = performance.now(), dur = 650;
    const stagger = items.length > 1 ? 90 : 0;
    (function step(now) {
      let done = true;
      items.forEach((o, k) => {
        const h = +o.el.dataset.h;
        const t = Math.min(1, Math.max(0, (now - t0 - k * stagger) / dur));
        if (t < 1) done = false;
        const e = 1 - Math.pow(1 - t, 3);
        o.el.setAttribute('y', (4 - (h + 12) * e).toFixed(1));
        if (t === 1 && !o.burst) {
          o.burst = true;
          const r = svg.querySelector(`.finger[data-i="${o.i}"]`).getBoundingClientRect();
          window.sparkleBurst && window.sparkleBurst(r.left + r.width / 2, r.top + 12, 8);
        }
      });
      if (!done) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- cat-eye shimmer follows your finger / phone tilt ---------- */
  let catPos = .5, catTarget = .5, lastMove = 0;
  function setCat(p) {
    $$('.cat', svg).forEach(g => {
      const s = g.querySelectorAll('stop');
      s[1].setAttribute('offset', Math.max(.02, p - .14)); s[2].setAttribute('offset', p); s[3].setAttribute('offset', Math.min(.98, p + .14));
    });
  }
  const stage = $('.hand-stage');
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    catTarget = .2 + .6 * ((e.clientX - r.left) / r.width); lastMove = performance.now();
  });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    catTarget = .5 + Math.max(-.3, Math.min(.3, e.gamma / 90)); lastMove = performance.now();
  });
  (function loop(now) {
    if (st.finish === 'cateye' && !reduce && !document.hidden) {
      if (now - lastMove > 2500) catTarget = .5 + Math.sin(now / 1200) * .25;
      catPos += (catTarget - catPos) * .08;
      setCat(catPos);
    }
    requestAnimationFrame(loop);
  })(performance.now());

  /* ---------- text-to-Sang link ---------- */
  const shapeName = { almond: 'Almond', round: 'Round', square: 'Square', stiletto: 'Stiletto' };
  const finishName = { gloss: 'Gloss', cateye: 'Cat-eye', chrome: 'Chrome glaze', glitter: 'Glitter', jelly: 'Jelly' };
  const artName = { daisy: 'a daisy', sunflower: 'a sunflower', starfish: 'a starfish', dots: 'polka dots', gem: 'a gem', heart: 'a heart' };
  function describe() {
    const painted = st.nails.filter(Boolean);
    if (!painted.length && st.art === 'none') return null;
    const names = [...new Set(painted.map(c => c[0]))];
    let colors = st.rainbow ? `Rainbow set (${names.join(', ')})` : names.length ? names.join(' + ') : 'Natural';
    let s = `Shape: ${shapeName[st.shape]}\nColor: ${colors}\nFinish: ${finishName[st.finish]}`;
    if (st.art === 'french') s += `\nFrench tips`;
    else if (st.art !== 'none') s += `\nAccent: ${artName[st.art]} on my ring finger`;
    return s;
  }
  function updateLink() {
    const d = describe();
    const body = d
      ? `Hi Sang! I designed my nails on salonsang.com ✨\n${d}\nWhen can I come in?`
      : `Hi Sang! I found you on salonsang.com and I'd love to book an appointment ✨`;
    $('#sendDesign').href = `sms:${PHONE}?&body=${encodeURIComponent(body)}`;
  }

  /* ---------- controls ---------- */
  const shelf = $('#shelf');
  shelf.innerHTML = COLORS.map((c, k) => `<button class="bottle${k === 0 ? ' on' : ''}" style="--c:${c[1]}" data-k="${k}" aria-label="${c[0]}" title="${c[0]}"><i class="cap"></i><i class="glass"></i></button>`).join('');
  shelf.addEventListener('click', e => {
    const b = e.target.closest('.bottle'); if (!b) return;
    $$('.bottle', shelf).forEach(x => x.classList.toggle('on', x === b));
    st.color = COLORS[+b.dataset.k]; st.rainbow = false;
    $('#colorName').textContent = st.color[0];
    st.nails = st.nails.map(() => st.color); FINGERS.forEach((_, i) => fresh.add(i));
    render(); tip('Tap any nail to give it a different color.');
  });

  const tones = $('#tones');
  tones.innerHTML = TONES.map((t, k) => `<button style="background:${t}" data-k="${k}" class="${k === 1 ? 'on' : ''}" aria-label="Skin tone ${k + 1}"></button>`).join('');
  tones.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', tones).forEach(x => x.classList.toggle('on', x === b));
    st.tone = TONES[+b.dataset.k]; render();
  });

  function chipGroup(id, key, after) {
    $(id).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', $(id)).forEach(x => x.classList.toggle('on', x === b));
      st[key] = b.dataset.v; after && after(); render();
    });
  }
  chipGroup('#shapeChips', 'shape');
  chipGroup('#finishChips', 'finish', () => { if (!st.nails.some(Boolean)) { st.nails = st.nails.map(() => st.color); FINGERS.forEach((_, i) => fresh.add(i)); } });
  chipGroup('#artChips', 'art', () => {
    const lab = $('#artChips').previousElementSibling.querySelector('small');
    lab.textContent = st.art === 'french' ? 'on every nail' : 'on your ring finger';
  });

  svg.addEventListener('click', e => {
    const g = e.target.closest('.finger'); if (!g) return;
    const i = +g.dataset.i;
    st.nails[i] = st.color; st.rainbow = false; fresh.add(i); render();
  });
  svg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest('.finger'); if (!g) return;
    e.preventDefault(); const i = +g.dataset.i; st.nails[i] = st.color; fresh.add(i); render();
    svg.querySelector(`.finger[data-i="${i}"]`).focus();
  });

  $('#paintAll').addEventListener('click', () => { st.nails = st.nails.map(() => st.color); st.rainbow = false; FINGERS.forEach((_, i) => fresh.add(i)); render(); });
  $('#rainbow').addEventListener('click', () => {
    st.nails = RAINBOW.slice(); st.rainbow = true; st.finish = 'cateye';
    $$('#finishChips button').forEach(x => x.classList.toggle('on', x.dataset.v === 'cateye'));
    FINGERS.forEach((_, i) => fresh.add(i)); render(); tip('Like Sang’s rainbow cat-eye set! Move your finger across to see it shimmer.');
  });
  $('#clearNails').addEventListener('click', () => { st.nails = st.nails.map(() => null); st.rainbow = false; render(); });

  function tip(t) { $('#stageTip').textContent = t; }

  // start with a little demo so the hand isn't bare
  st.nails = st.nails.map(() => st.color);
  render();
  tip('Tap a bottle to paint all your nails, or tap one nail to mix it up.');
})();
