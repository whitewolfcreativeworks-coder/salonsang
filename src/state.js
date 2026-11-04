// Shared nail design state for the 3D studio and the camera try-on.

export const COLORS = [
  ['Sang Pink', '#e2457f'], ['Ballet Slipper', '#f3c3cd'], ['Hot Fuchsia', '#d4157a'], ['Cherry Red', '#b3122e'],
  ['Wine', '#6a1630'], ['Peach Sorbet', '#f6a184'], ['Butter', '#f3dc7e'], ['Sunflower', '#f0ac14'],
  ['Mint', '#94dfbd'], ['Teal Lagoon', '#14989c'], ['Lilac', '#b49fe2'], ['Royal Violet', '#56288a'],
  ['Sky', '#86c0ea'], ['Midnight Navy', '#18245f'], ['Milky White', '#f4efe8'], ['Little Black Dress', '#18181c']
];
export const RAINBOW = [['Emerald', '#1f8a5b'], ['Lemon', '#d2c64c'], ['Rose', '#e07aa6'], ['Violet', '#7a3fb8'], ['Ocean Blue', '#3f6fb8']];
export const TONES = ['#f4d3c3', '#e5b493', '#c58763', '#8c583a', '#5c3826'];

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
