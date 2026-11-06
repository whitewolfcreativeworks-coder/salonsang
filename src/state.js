// Shared nail design state for the 3D studio and the camera try-on.

export const COLORS = [
  ['Sang Pink', '#e2457f'], ['Ballet Slipper', '#f3c3cd'], ['Hot Fuchsia', '#d4157a'], ['Cherry Red', '#b3122e'],
  ['Wine', '#6a1630'], ['Peach Sorbet', '#f6a184'], ['Butter', '#f3dc7e'], ['Sunflower', '#f0ac14'],
  ['Mint', '#94dfbd'], ['Teal Lagoon', '#14989c'], ['Lilac', '#b49fe2'], ['Royal Violet', '#56288a'],
  ['Sky', '#86c0ea'], ['Midnight Navy', '#18245f'], ['Milky White', '#f4efe8'], ['Little Black Dress', '#18181c']
];
export const RAINBOW = [['Emerald', '#1f8a5b'], ['Lemon', '#d2c64c'], ['Rose', '#e07aa6'], ['Violet', '#7a3fb8'], ['Ocean Blue', '#3f6fb8']];
export const TONES = ['#f4d3c3', '#e5b493', '#c58763', '#8c583a', '#5c3826'];
// continuous skin-tone slider: fair → deep brown (real skin, not grey or black). '#e5b493' = the photo as shot.
// Real skin tones in CIELAB, from light (ITA ~56°) through intermediate, tan and brown to dark brown (ITA ~-39°).
// Most of the slider covers tan → brown, where most people are. Index 1 is the photo as shot.
export const TONE_STOPS = ['#e8c2a4', '#e5b493', '#d0a27e', '#c39470', '#b98966', '#ae7f5c', '#a37554', '#976b4e', '#8b6148', '#7e5842', '#724f3e'];
export const TONE_DEFAULT = 1 / 10;
export function toneAt(t) {
  t = Math.min(1, Math.max(0, t)) * (TONE_STOPS.length - 1);
  const i = Math.min(TONE_STOPS.length - 2, Math.floor(t)), f = t - i;
  const a = TONE_STOPS[i].match(/\w\w/g).map(h => parseInt(h, 16)), b = TONE_STOPS[i + 1].match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + a.map((x, k) => Math.round(x + (b[k] - x) * f).toString(16).padStart(2, '0')).join('');
}

export const SHAPES = { square: 'Square', round: 'Round', almond: 'Almond', coffin: 'Coffin', stiletto: 'Stiletto' };
export const FINISHES = { gloss: 'Gloss', cateye: 'Cat-eye', chrome: 'Chrome glaze', glitter: 'Glitter', jelly: 'Jelly', matte: 'Velvet matte' };
export const ARTS = {
  none: 'None', daisy: 'Daisy', sunflower: 'Sunflower', starfish: 'Starfish', dots: 'Polka dots',
  french: 'French tip', gems: 'Crystals', heart: 'Heart', swirl: 'Gold swirl'
};

// finger order: pinky, ring, middle, index, thumb
export const FINGER_NAMES = ['pinky', 'ring finger', 'middle finger', 'index finger', 'thumb'];
export const ACCENT = 1;

const listeners = new Set();
export const design = {
  shape: 'almond', finish: 'gloss', art: 'none', tone: TONES[1],
  color: COLORS[0],
  nailColors: [[], [], [], [], []], // color names painted on each nail, in order
  rainbow: false
};
export function onDesign(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(what) { listeners.forEach(fn => fn(what)); }

export function describeDesign() {
  const names = [...new Set(design.nailColors.flat())];
  if (!names.length && design.art === 'none') return null;
  const colors = design.rainbow ? `Rainbow set (${names.join(', ')})` : names.length ? names.join(' + ') : 'Natural';
  let s = `Shape: ${SHAPES[design.shape]}\nColor: ${colors}\nFinish: ${FINISHES[design.finish]}`;
  if (design.art === 'french') s += '\nFrench tips';
  else if (design.art !== 'none') s += `\nAccent: ${ARTS[design.art].toLowerCase()} on my ring finger`;
  return s;
}
export function smsHref() {
  const d = describeDesign();
  const body = d
    ? `Hi Sang! I designed my nails on salonsang.com ✨\n${d}\nWhen can I come in?`
    : `Hi Sang! I found you on salonsang.com and I'd love to book an appointment ✨`;
  return `sms:+15306484977?&body=${encodeURIComponent(body)}`;
}
