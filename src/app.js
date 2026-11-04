// Wires the studio controls, the 3D studio and the camera try-on together.
import { design, emit, onDesign, COLORS, RAINBOW, TONES, SHAPES, FINISHES, ARTS, smsHref } from './state.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const stage = $('#stage');
const tipEl = $('#stageTip');
const tip = t => { tipEl.textContent = t; tipEl.classList.remove('flash'); void tipEl.offsetWidth; tipEl.classList.add('flash'); };

// ---------- controls ----------
const SHAPE_ICONS = {
  square: 'M6 22 C6 26 18 26 18 22 L18 6 Q18 3 15 3 L9 3 Q6 3 6 6 Z',
  round: 'M6 22 C6 26 18 26 18 22 L18 9 C18 2 6 2 6 9 Z',
  almond: 'M6 22 C6 26 18 26 18 22 L18 12 C18 5 14 1 12 1 C10 1 6 5 6 12 Z',
  coffin: 'M6 22 C6 26 18 26 18 22 L18 12 L15 1 L9 1 L6 12 Z',
  stiletto: 'M6 22 C6 26 18 26 18 22 L18 12 C18 7 13 2 12 0 C11 2 6 7 6 12 Z'
};
const FINISH_SW = {
  gloss: 'radial-gradient(circle at 35% 30%,#fff 0 12%,#e2457f 30%,#a3184f 100%)',
  cateye: 'linear-gradient(135deg,#3a0f2a 20%,#ffd1e6 50%,#3a0f2a 80%)',
  chrome: 'linear-gradient(135deg,#fff,#f3d6ff 35%,#ffffff 50%,#cfe8ff 70%,#ffe3f0)',
  glitter: 'radial-gradient(circle at 20% 30%,#fff 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,#ffe9a8 0 2px,transparent 3px),radial-gradient(circle at 45% 80%,#fff 0 1.5px,transparent 3px),radial-gradient(circle at 80% 20%,#ffd3ec 0 2px,transparent 3px),#c8326f',
  jelly: 'radial-gradient(circle at 35% 30%,rgba(255,255,255,.9) 0 10%,rgba(226,69,127,.55) 35%,rgba(160,20,80,.7))',
  matte: 'linear-gradient(160deg,#d85d8b,#b13d6a)'
};
const ART_ICONS = { none: '∅', daisy: '✿', sunflower: '❀', starfish: '★', dots: '⁘', french: '◠', gems: '◆', heart: '♥', swirl: '〰' };

function chips(el, map, key, render) {
  el.innerHTML = Object.entries(map).map(([v, label]) =>
    `<button type="button" data-v="${v}" class="${design[key] === v ? 'on' : ''}" aria-pressed="${design[key] === v}">${render(v)}<span>${label}</span></button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    design[key] = b.dataset.v; emit(key);
  });
}
chips($('#shapes'), SHAPES, 'shape', v => `<svg viewBox="0 0 24 27" aria-hidden="true"><path d="${SHAPE_ICONS[v]}"/></svg>`);
chips($('#finishes'), FINISHES, 'finish', v => `<i class="sw" style="background:${FINISH_SW[v]}"></i>`);
chips($('#arts'), ARTS, 'art', v => `<i class="ai">${ART_ICONS[v]}</i>`);

const wall = $('#polishWall');
wall.innerHTML = COLORS.map(([n, h], k) => `<button type="button" class="bottle${k === 0 ? ' on' : ''}" style="--c:${h}" data-k="${k}" aria-label="${n}"><i class="b-cap"></i><i class="b-neck"></i><i class="b-glass"><i class="b-shine"></i></i></button>`).join('');
$('#colorName').textContent = design.color[0];

const tones = $('#tones');
tones.innerHTML = TONES.map((t, k) => `<button type="button" style="--t:${t}" data-k="${k}" class="${t === design.tone ? 'on' : ''}" aria-label="Skin tone ${k + 1}"></button>`).join('');
tones.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', tones).forEach(x => x.classList.toggle('on', x === b));
  design.tone = TONES[+b.dataset.k]; emit('tone');
});

const send = $('#sendDesign');
const refresh = () => { send.href = smsHref(); };
onDesign(refresh); refresh();

onDesign(what => {
  if (what === 'finish') {
    const msg = {
      cateye: 'Cat-eye! Slide your finger across the hand (or tilt your phone) to move the magnet.',
      chrome: 'Chrome glaze: a pearly, glazed-donut shine.',
      glitter: 'Glitter flakes catch the light as the hand moves.',
      jelly: 'Jelly: sheer, glassy and juicy.',
      matte: 'Velvet matte: soft and luxe.',
      gloss: 'Classic gloss with a mirror topcoat.'
    }[design.finish];
    tip(msg);
  }
  if (what === 'art' && design.art === 'gems') tip('Real crystals on your ring finger. Watch them catch the light ✨');
});

// ---------- studio boot (only when it comes into view) ----------
let studio = null, booting = null;
function boot() {
  if (studio || booting) return booting;
  booting = import('./studio.js').then(({ createStudio }) => { start(createStudio); return studio; });
  return booting;
}
function start(createStudio) {
  studio = createStudio(stage, { onTip: tip });
  if (!studio) {
    stage.classList.add('no-gl');
    tip('Your browser can’t show the 3D studio, but Sang can still paint anything you dream up!');
    return;
  }
  stage.classList.add('ready');
}
const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { boot(); io.disconnect(); } }, { rootMargin: '400px' });
io.observe(stage);

wall.addEventListener('click', e => {
  const b = e.target.closest('.bottle'); if (!b) return;
  $$('.bottle', wall).forEach(x => x.classList.toggle('on', x === b));
  design.color = COLORS[+b.dataset.k];
  $('#colorName').textContent = design.color[0];
  Promise.resolve(boot()).then(() => studio && studio.paintAll(design.color[1]));
  tip('Tap a nail for a fresh coat, or drag the brush to paint by hand.');
  emit('color');
});
$('#paintAll').addEventListener('click', async () => { await boot(); studio && studio.paintAll(); });
$('#rainbow').addEventListener('click', async () => {
  await boot(); if (!studio) return;
  design.finish = 'cateye';
  $$('#finishes button').forEach(x => { const on = x.dataset.v === 'cateye'; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  emit('finish');
  studio.paintSet(RAINBOW);
  tip('Inspired by Sang’s rainbow cat-eye set. Slide across to move the shimmer!');
});
$('#clearNails').addEventListener('click', () => { studio && studio.clear(); tip('Bare and buffed. Pick a color from the wall.'); });

// ---------- camera try-on ----------
const tryRoot = $('#tryon');
const lastHexFor = i => {
  const names = design.nailColors[i];
  const name = names[names.length - 1];
  const found = [...COLORS, ...RAINBOW].find(c => c[0] === name);
  return found ? found[1] : design.color[1];
};
let tryMod = null;
$('#tryOnBtn').addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) { tip('Your browser doesn’t allow camera access here.'); return; }
  tryRoot.hidden = false;
  tryRoot.querySelector('.to-status').textContent = 'Loading…';
  tryMod = tryMod || await import('./tryon.js');
  tryRoot.querySelector('.to-send').href = smsHref();
  tryMod.openTryOn(tryRoot, lastHexFor);
});
tryRoot.querySelector('.to-close').addEventListener('click', () => tryMod && tryMod.closeTryOn(tryRoot));
tryRoot.querySelector('.to-flip').addEventListener('click', () => tryMod && tryMod.flipCamera(tryRoot));

// ---------- immersive 3D suite ----------
const suiteStage = $('#suiteStage');
if (suiteStage) {
  const spots = [];
  $$('.suite-photos .hotspot-photo').forEach((fig, view) => {
    $$('.hs', fig).forEach(b => {
      const x = parseFloat(b.style.getPropertyValue('--x')) / 100, y = parseFloat(b.style.getPropertyValue('--y')) / 100;
      spots.push({ view, u: x, v: 1 - y, title: b.dataset.title, text: b.dataset.text });
    });
  });
  let suite = null;
  const sio = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting || suite) return;
    sio.disconnect();
    const { createSuite } = await import('./suite.js');
    suite = createSuite(suiteStage, spots);
    if (!suite) { suiteStage.remove(); return; }
    suiteStage.classList.add('ready');
    $('.suite').classList.add('immersive');
  }, { rootMargin: '500px' });
  sio.observe(suiteStage);
  $$('.suite-views button', suiteStage).forEach(b => b.addEventListener('click', () => suite && suite.goTo(+b.dataset.view)));
  suiteStage.addEventListener('suiteview', e => {
    $$('.suite-views button', suiteStage).forEach(b => b.classList.toggle('on', +b.dataset.view === e.detail));
  });
}
