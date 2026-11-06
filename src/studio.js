// Photo nail studio: one of Sang's real client photos (white fur, her sunflower card), with each nail
// traced by Segment Anything (Meta, open source) offline. A small WebGL2 shader repaints the nails live,
// keeping the photo's own light and gloss: polish colors, finishes, art, shapes, skin tones, brush strokes.
// No 3D engine and no big lighting files: the whole studio is one ~60 KB photo + one ~70 KB mask.
import { design, emit, onDesign, FINGER_NAMES, TONES } from './state.js';
import { PHOTO, SKIN, NAILS } from './studio-data.js';

const N = NAILS.length;
const FINISH = { gloss: 0, matte: 1, jelly: 2, chrome: 3, cateye: 4, glitter: 5 };
const ART = { none: 0, daisy: 1, sunflower: 2, starfish: 3, dots: 4, french: 5, gems: 6, heart: 7, swirl: 8 };
const SHAPE = { square: 0, round: 1, almond: 2, coffin: 3, stiletto: 4 };
const ACCENT_SLOT = 1;                                        // ring fingers get the accent art
// nail box (photo uv) that must stay in view
const BOX = (() => { let x0 = 1, x1 = 0, y0 = 1, y1 = 0; NAILS.forEach(n => { x0 = Math.min(x0, n.c[0]); x1 = Math.max(x1, n.c[0]); y0 = Math.min(y0, n.c[1]); y1 = Math.max(y1, n.c[1]); }); return { x0: x0 - 0.06, x1: x1 + 0.07, y0: y0 - 0.08, y1: y1 + 0.09 }; })();

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uPhoto, uMask, uPaint, uProf;   // uProf: per-nail outline (left/right half-widths along the nail)
uniform vec2 uView, uOff;          // screen px → photo px:  q = (frag - uOff) / uView
uniform vec2 uRes, uPhotoPx;
uniform float uTime; uniform vec2 uLight;
uniform int uFinish, uArt, uShape;
uniform vec3 uToneMul;
uniform vec2 uC[${N}], uAx[${N}];
uniform float uBase[${N}], uTip[${N}], uHw[${N}], uLum[${N}], uHi[${N}];
uniform float uVs[${N}], uC0[${N}], uH0[${N}];   // stress point (v), centre-line offset and half-width there (hw units)
uniform vec4 uCol[${N}], uPrev[${N}];      // rgb + a (a=0 → bare nail)
uniform float uProg[${N}], uManual[${N}], uAccent[${N}], uPulse[${N}];

vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c){ return pow(max(c, 0.0), vec3(1.0/2.2)); }
vec3 toLinI(vec3 c){ return pow(c, vec3(2.2)); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sdCircle(vec2 p, float r){ return length(p) - r; }
float sdStar5(vec2 p, float r, float rf){
  const vec2 k1 = vec2(0.809016994375, -0.587785252292); const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x); p -= 2.0*max(dot(k1,p),0.0)*k1; p -= 2.0*max(dot(k2,p),0.0)*k2; p.x = abs(p.x); p.y -= r;
  vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0,1); float h = clamp(dot(p,ba)/dot(ba,ba), 0.0, r);
  return length(p-ba*h) * sign(p.y*ba.x - p.x*ba.y);
}
float sdHeart(vec2 p){ p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25,0.75), p - vec2(0.25,0.75))) - sqrt(2.0)/4.0;
  return sqrt(min(dot(p - vec2(0.0,1.0), p - vec2(0.0,1.0)), dot(p - 0.5*max(p.x+p.y,0.0), p - 0.5*max(p.x+p.y,0.0)))) * sign(p.x - p.y); }
float fill(float d, float aa){ return 1.0 - smoothstep(-aa, aa, d); }

float smax(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// nail length (cuticle → new tip, in real-nail lengths) for each shape
float tipLen(int s){ return s == 0 ? 1.2 : s == 1 ? 1.22 : s == 2 ? 1.42 : s == 3 ? 1.45 : 1.55; }
// tangent ogive (the classic stiletto curve): sides leave the sidewalls parallel, bow gently outward, meet in
// one centred point. half-width H at Y=0, point at Y=L. Signed distance (approx.), + outside.
float sdOgive(vec2 q, float H, float L){
  float rho = (H * H + L * L) / (2.0 * H);
  float Y = clamp(q.y, 0.0, L);
  float w = sqrt(max(rho * rho - Y * Y, 0.0)) + H - rho;
  float dw = -Y / sqrt(max(rho * rho - Y * Y, 1e-4));
  float d = (abs(q.x) - w) / sqrt(1.0 + dw * dw);
  if (q.y > L) d = length(vec2(q.x, q.y - L));
  return d;
}
// the extension beyond the stress point, in a symmetric frame: q.x across from the centre line, q.y along
// from the stress point (both in half-widths); H = half-width at the stress point, L = length to the tip
float sdTip(int s, vec2 q, float H, float L){
  if (s == 0) {                                          // square: straight walls, softly rounded corners
    float r = 0.22 * H; vec2 d = vec2(abs(q.x) - (H - r), q.y - (L - r));
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  }
  if (s == 1) {                                          // round: straight walls into an even half-oval
    float Rt = 0.95 * H, y0 = L - Rt;
    if (q.y < y0) return abs(q.x) - H;
    vec2 e = vec2(q.x / H, (q.y - y0) / Rt); float k = length(e);
    return (k - 1.0) * min(H, Rt) * (k > 0.0 ? 1.0 : 1.0);
  }
  if (s == 2) {                                          // almond: an ogive with a soft, rounded peak
    float rr = 0.32 * H;
    return sdOgive(q, H - rr, L - rr) - rr;
  }
  if (s == 3) {                                          // coffin / ballerina: straight tapered walls, flat tip
    float Ht = 0.56 * H, sl = (H - Ht) / L;
    float side = (abs(q.x) - (H - sl * clamp(q.y, 0.0, L))) / sqrt(1.0 + sl * sl);
    return smax(side, q.y - L, 0.05 * H);
  }
  return sdOgive(q, H, L) - 0.02 * H;                    // stiletto: long, slim, sharp, centred
}

const int PN = 48;
vec2 prof(int i, float v){                 // real nail's left/right half-width (in hw units) at v; negative = outside
  float x = (v + 0.05) / 1.1 * float(PN - 1);
  if (x < 0.0 || x > float(PN - 1)) return vec2(-0.3);
  int k = int(floor(x)); float f = x - float(k);
  return mix(texelFetch(uProf, ivec2(k, i), 0).rg, texelFetch(uProf, ivec2(min(k + 1, PN - 1), i), 0).rg, f);
}
float realW(int i, float v, float side){ vec2 p = prof(i, v); return side < 0.0 ? p.x : p.y; }
// studio lighting reflected in the clear coat: a dim room, bright ceiling, a tall softbox up-left and a small
// lamp on the right (both drift with your finger / the phone's tilt)
float sdRound(vec2 p, vec2 b, float r){ vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float envL(vec3 R, float rough){
  float e = 0.22 + 0.3 * smoothstep(-0.4, 0.9, -R.y);
  vec2 st = R.xy / (1.0 + max(R.z, -0.8));
  vec2 c1 = vec2(-0.26 + uLight.x * 0.3, -0.36 + uLight.y * 0.18);
  vec2 q = st - c1; q = vec2(0.94 * q.x + 0.34 * q.y, -0.34 * q.x + 0.94 * q.y);
  e += 16.0 * (1.0 - smoothstep(-rough, rough + 0.02, sdRound(q, vec2(0.13, 0.36), 0.08)));
  vec2 c2 = vec2(0.30 + uLight.x * 0.3, -0.34 + uLight.y * 0.18);       // second softbox, up-right
  vec2 q2 = st - c2; q2 = vec2(0.94 * q2.x - 0.34 * q2.y, 0.34 * q2.x + 0.94 * q2.y);
  e += 11.0 * (1.0 - smoothstep(-rough, rough + 0.02, sdRound(q2, vec2(0.11, 0.30), 0.07)));
  return e;
}

vec3 artColor(int art, vec2 a, vec3 base, float t, out float cover){
  // a: x across the nail (-1..1), y along it (0 cuticle → 1 tip)
  cover = 0.0; vec3 c = base; float aa = 0.04;
  if (art == 1 || art == 2) {                  // daisy / sunflower
    vec2 p = vec2(a.x, (a.y - 0.52) * 1.6); float r = length(p), th = atan(p.y, p.x);
    float np = art == 1 ? 6.0 : 11.0;
    float petal = r - (art == 1 ? 0.55 : 0.6) * (0.55 + 0.45 * abs(cos(th * np * 0.5)));
    float ctr = sdCircle(p, art == 1 ? 0.2 : 0.28);
    float pc = fill(petal, aa), cc = fill(ctr, aa);
    vec3 petalC = art == 1 ? vec3(0.99, 0.98, 0.96) : vec3(0.98, 0.72, 0.08);
    vec3 ctrC = art == 1 ? vec3(0.99, 0.80, 0.18) : vec3(0.36, 0.2, 0.08) + 0.12 * hash(floor(p * 30.0));
    c = mix(mix(c, petalC, pc), ctrC, cc); cover = max(pc, cc);
  } else if (art == 3) {                       // starfish
    vec2 p = vec2(a.x, (a.y - 0.55) * 1.55) * 1.1; float d = sdStar5(p, 0.62, 0.42);
    float s = fill(d, aa); vec3 sc = vec3(0.98, 0.55, 0.32) * (0.9 + 0.2 * step(0.75, hash(floor(p * 18.0))));
    c = mix(c, sc, s); cover = s;
  } else if (art == 4) {                       // polka dots
    vec2 g = vec2(a.x * 2.2, a.y * 5.0); vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    if (mod(id.y, 2.0) > 0.5) { f = fract(g + vec2(0.5, 0.0)) - 0.5; }
    float s = fill(sdCircle(f, 0.22), 0.06); c = mix(c, vec3(0.98), s); cover = s;
  } else if (art == 5) {                       // french tip (all nails)
    float line = 0.74 + 0.16 * a.x * a.x; float s = smoothstep(line - 0.02, line + 0.02, a.y);
    c = mix(c, vec3(0.99, 0.98, 0.97), s); cover = s;
  } else if (art == 6) {                       // crystals near the cuticle
    for (int k = 0; k < 3; k++) {
      vec2 o = vec2(float(k - 1) * 0.5, 0.26 + 0.12 * float(k == 1 ? 1 : 0));
      vec2 p = (vec2(a.x, a.y * 2.6) - vec2(o.x, o.y * 2.6));
      float d = sdCircle(p, k == 1 ? 0.34 : 0.26); float s = fill(d, 0.05);
      float facet = 0.6 + 0.4 * abs(sin(atan(p.y, p.x) * 4.0 + t * 0.8 + float(k)));
      vec3 gc = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.95), 0.5 + 0.5 * sin(t + float(k) * 2.0)) * facet;
      gc += pow(max(0.0, 1.0 - length(p - vec2(-0.08, -0.08)) * 6.0), 3.0);
      c = mix(c, gc, s); cover = max(cover, s);
    }
  } else if (art == 7) {                       // heart
    vec2 p = vec2(a.x * 1.15, -(a.y - 0.82) * 1.9); float s = fill(sdHeart(p), 0.05);
    c = mix(c, vec3(0.86, 0.06, 0.24), s); cover = s;
  } else if (art == 8) {                       // gold swirl
    float w = a.x - 0.45 * sin(a.y * 9.0 + 0.6); float s = 1.0 - smoothstep(0.08, 0.13, abs(w));
    s *= smoothstep(0.08, 0.2, a.y) * smoothstep(1.0, 0.85, a.y);
    vec3 gold = vec3(0.95, 0.74, 0.32) * (0.75 + 0.5 * pow(abs(sin(a.y * 14.0 + t * 1.5)), 6.0));
    c = mix(c, gold, s); cover = s;
  }
  return c;
}


// signed distance to the polish edge (+ outside, in half-widths) at photo point pp for nail i:
// the real nail's smoothed outline (baked offline) smoothly joined with the chosen shape's free edge
float sdAt(int i, vec2 pp){
  vec2 ax = uAx[i], pr = vec2(-ax.y, ax.x);
  vec2 d = pp - vec2(uC[i].x, uC[i].y * uPhotoPx.y / uPhotoPx.x);
  float u = dot(d, pr), hw = uHw[i], len = uTip[i] - uBase[i], kk = hw / len;
  float v = (dot(d, ax) - uBase[i]) / len, ux = abs(u) / hw;
  float sdR = -(texture(uMask, vec2(pp.x, pp.y * uPhotoPx.x / uPhotoPx.y)).r * 255.0 - 128.0) / 8.0 / (hw * uPhotoPx.x);
  // the chosen shape grows from the stress point (where the nail is widest), centred on the nail
  float vs = uVs[i], H = uH0[i], Lh = (tipLen(uShape) - vs) / kk;
  vec2 q = vec2(u / hw - uC0[i], (v - vs) / kk);
  float sdS = q.y < 0.0 ? max(ux - min(H + (u < 0.0 ? -uC0[i] : uC0[i]), realW(i, v, u < 0.0 ? -1.0 : 1.0)), -q.y - 2.5)
                        : sdTip(uShape, q, H, Lh);
  return smin(sdR, sdS, 0.12);
}

// pc = albedo × light, then the clear coat on top. N: surface normal (photo coords, z toward you)
vec3 finish(vec3 base, vec3 N, float Ln, vec2 q, float sx, float v, vec3 under, int i){
  vec3 Ld = normalize(vec3(-0.35 + uLight.x * 0.4, -0.6 + uLight.y * 0.25, 0.72));
  float ndl = max(dot(N, Ld), 0.0), nv = clamp(N.z, 0.0, 1.0);
  float diff = (0.52 + 0.6 * ndl) * Ln;
  vec3 R = vec3(2.0 * N.z * N.xy, 2.0 * N.z * N.z - 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float coatK = 1.0, rough = 0.012;
  vec3 pc;
  if (uFinish == 1) {                                   // velvet matte: soft, no mirror
    pc = base * (0.5 + 0.6 * ndl) * Ln * 1.05 + 0.012 * (hash(q) - 0.5);
    coatK = 0.12; rough = 0.35;
  } else if (uFinish == 2) {                            // jelly: sheer, juicy
    pc = mix(under, base * 0.8, 0.62) * diff;
  } else if (uFinish == 3) {                            // chrome glaze: pearly, glazed donut
    float ang = sx * 1.3 + v * 1.6 + uLight.x * 2.0 + uLight.y;
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ang * 0.35));
    pc = mix(base, vec3(1.0), 0.18) * diff + toLinI(iri) * 0.10 * envL(R, 0.3) * 0.25;
    coatK = 1.25; rough = 0.03;
  } else if (uFinish == 4) {                            // cat-eye: a band of light that follows the magnet
    float band = exp(-pow((sx - uLight.x * 0.9) / 0.34, 2.0));
    float sparkle = 0.65 + 0.35 * hash(floor(q * 0.9) + floor(uTime * 3.0));
    pc = base * 0.2 * diff + (base * 1.5 + 0.15) * band * sparkle * (0.6 + 0.4 * ndl);
  } else if (uFinish == 5) {                            // glitter flakes under the top coat
    vec2 cell = floor(q * 0.55); float h = hash(cell);
    float flake = step(0.72, h) * pow(max(0.0, sin(uTime * 2.0 + h * 50.0 + uLight.x * 9.0)), 10.0);
    vec3 fc = mix(vec3(1.0, 0.9, 0.6), vec3(1.0), step(0.86, h));
    pc = base * diff * 0.9 + fc * flake * 1.4 + base * 0.15 * step(0.72, h);
  } else {                                              // classic gel gloss
    pc = base * diff;
  }
  pc += vec3(F * envL(R, rough) * coatK);
  return pc;
}

void main(){
  vec2 frag = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 q = (frag - uOff) / uView;                     // photo px
  vec2 uv = q / uPhotoPx;
  vec3 photo = toLin(texture(uPhoto, uv).rgb);
  vec4 mk = texture(uMask, uv);
  float skin = mk.b, realA = mk.g;
  // skin tone: relight the matted skin, keep its natural shine; bare nail beds follow a little
  float L = dot(texture(uPhoto, uv).rgb, vec3(0.299, 0.587, 0.114));
  vec3 toned = photo * uToneMul + photo * (1.0 - uToneMul) * smoothstep(0.72, 0.95, L) * 0.6;
  vec3 col = mix(photo, toned, skin);
  col = mix(col, photo * mix(vec3(1.0), uToneMul, 0.35), realA * (1.0 - skin));
  float shadowAcc = 0.0;
  vec2 p = vec2(uv.x, uv.y * uPhotoPx.y / uPhotoPx.x);   // photo-width units
  float aa = 1.2 / (uView.x * uPhotoPx.x);                // ~1 screen px in photo-width units

  for (int i = 0; i < ${N}; i++) {
    vec2 ax = uAx[i], pr = vec2(-ax.y, ax.x);
    vec2 d = p - vec2(uC[i].x, uC[i].y * uPhotoPx.y / uPhotoPx.x);
    float t = dot(d, ax), u = dot(d, pr);
    float len = uTip[i] - uBase[i], hw = uHw[i];
    float v = (t - uBase[i]) / len;                      // 0 cuticle → 1 real tip
    if (v < -0.08 || v > tipLen(uShape) + 0.06 || abs(u) > hw * 1.5) continue;
    vec4 newC = uCol[i], oldC = uPrev[i];
    if (newC.a < 0.5 && oldC.a < 0.5 && uPulse[i] <= 0.0) continue;   // bare nail: leave the photo untouched
    float side = u < 0.0 ? -1.0 : 1.0, ux = abs(u) / hw;
    float px = aa / hw;                                   // one screen pixel, in half-widths
    float kk = hw / len;
    float sd = sdAt(i, p);
    float sdR = -(mk.r * 255.0 - 128.0) / 8.0 / (hw * uPhotoPx.x);
    float shapeCov = 1.0 - smoothstep(-px * 0.7, px * 0.7, sd);
    if (newC.a > 0.5 || oldC.a > 0.5) {                  // skin right around the polish follows the chosen tone too
      vec3 ps = toSrgb(photo); float sat = max(ps.r, max(ps.g, ps.b)) - min(ps.r, min(ps.g, ps.b));
      float near = max(realA, 1.0 - smoothstep(px * 4.0, 0.45, sd)) * smoothstep(0.05, 0.12, sat);
      col = mix(col, toned, clamp(near * (1.0 - skin), 0.0, 1.0) * smoothstep(0.0, px, sd));
    }
    // soft shadow of a longer free edge onto whatever is underneath
    float inReal = 1.0 - smoothstep(-px, px, sdR);
    if (inReal < 0.5 && v > 0.85 && sd > 0.0 && sd < 0.5 && (newC.a > 0.5 || oldC.a > 0.5)) {
      float s2 = sdAt(i, p + pr * (0.07 * hw) - ax * (0.035 * len));
      shadowAcc = max(shadowAcc, 0.28 * (1.0 - smoothstep(0.0, 0.3, s2)));
    }
    if (shapeCov <= 0.001) continue;

    // how much of the new coat is on: three brush strokes (center, left, right), then full
    float pg = uProg[i], fresh = 0.0;
    if (pg >= 3.0) fresh = 1.0; else {
      for (int k2 = 0; k2 < 3; k2++) {
        float cx = k2 == 0 ? 0.0 : (k2 == 1 ? -0.55 : 0.55);
        float reach = clamp(pg - float(k2), 0.0, 1.0) * (tipLen(uShape) + 0.08);
        fresh = max(fresh, (1.0 - smoothstep(0.55, 0.7, abs(u / hw - cx))) * (1.0 - smoothstep(reach - 0.06, reach, v)) * step(0.001, reach));
      }
    }
    if (uManual[i] > 0.5) fresh = max(fresh, texture(uPaint, uv).r);
    if (newC.a < 0.5) fresh = 0.0;

    // the surface: a gel C-curve across, a gentle slope down to the free edge, rounded edges all round
    float xc = u / hw - uC0[i];
    float sx = clamp(xc / max(abs(xc) - sd, 0.05), -1.0, 1.0);    // -1 .. 1 across the nail
    float dhx = -0.5 * sx * pow(max(1.0 - sx * sx, 0.02), -0.35);
    float dhy = -0.28 * (v - 0.35);
    vec2 n2 = vec2(-dhx, -dhy);
    float roll = 1.0 - smoothstep(0.0, 0.16, -sd);                 // the polish edge rounds over
    vec2 outward = vec2(0.0);
    if (roll > 0.001) { float ge = hw * 0.04; outward = normalize(vec2(sdAt(i, p + vec2(ge, 0.0)) - sd, sdAt(i, p + vec2(0.0, ge)) - sd) + 1e-6); }
    vec3 N = normalize(vec3(n2.x * pr + n2.y * ax + outward * roll * 0.5, 1.0));
    // keep the photo's broad light (the hand's own shadows) on the real nail, fading out past it
    float Ln = mix(1.0, clamp(mk.a * 2.0, 0.6, 1.4), 0.45 * inReal * (1.0 - smoothstep(0.85, 1.0, v)));
    vec3 under = toLin(vec3(0.93, 0.83, 0.79));                     // a clean natural nail under sheer jelly
    vec2 a = vec2(sx, v);

    if (oldC.a > 0.5) col = mix(col, finish(toLin(oldC.rgb), N, Ln, q, sx, v, under, i), shapeCov);
    if (fresh > 0.0) {
      vec3 base = toLin(newC.rgb);
      float artCover = 0.0;
      if (uArt != 0 && (uArt == 5 || uAccent[i] > 0.5)) base = toLin(artColor(uArt, a, toSrgb(base), uTime, artCover));
      col = mix(col, finish(base, N, Ln, q, sx, v, under, i), shapeCov * fresh);
    }
    col += vec3(0.25, 0.12, 0.18) * uPulse[i] * max(0.0, 1.0 - v) * 0.5 * shapeCov;
  }
  col *= 1.0 - shadowAcc;
  outColor = vec4(toSrgb(col), 1.0);
}`;

export function createStudio(container, { onReady, onTip } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'studio-canvas';
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  container.prepend(canvas);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- GL setup ----------
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); } catch (e) { console.error(e); canvas.remove(); return null; }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); canvas.remove(); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; const u = n => (U[n] ??= gl.getUniformLocation(prog, n));
  const tex = (unit, filter) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const tPhoto = tex(0, gl.LINEAR), tMask = tex(1, gl.LINEAR), tPaint = tex(2, gl.LINEAR);
  gl.uniform1i(u('uPhoto'), 0); gl.uniform1i(u('uMask'), 1); gl.uniform1i(u('uPaint'), 2);
  // manual brush canvas (half resolution is plenty)
  const paint = document.createElement('canvas'); paint.width = PHOTO.w / 2; paint.height = PHOTO.h / 2;
  const pctx = paint.getContext('2d');
  const uploadPaint = () => { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tPaint); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint); };
  uploadPaint();

  const load = src => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const base = new URL('../../images/', import.meta.url);
  let ready = false;
  Promise.all([load(new URL('studio-hand.webp', base).href), load(new URL('studio-hand-mask.png', base).href)]).then(([ph, mk]) => {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tPhoto); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ph);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tMask); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mk);
    ready = true; resize(); kick();
    container.style.backgroundImage = 'none';
    onReady && onReady();
    // first coat so the hands aren't bare
    setTimeout(() => autoPaint(NAILS.map((_, i) => i), design.color[1], design.color[0]), 350);
  }).catch(() => { container.classList.add('no-gl'); });

  // nail geometry
  gl.uniform2fv(u('uC'), NAILS.flatMap(n => n.c)); gl.uniform2fv(u('uAx'), NAILS.flatMap(n => n.ax));
  gl.uniform1fv(u('uBase'), NAILS.map(n => n.base)); gl.uniform1fv(u('uTip'), NAILS.map(n => n.tip));
  gl.uniform1fv(u('uHw'), NAILS.map(n => n.hw)); gl.uniform1fv(u('uLum'), NAILS.map(n => n.lum)); gl.uniform1fv(u('uHi'), NAILS.map(n => n.hi));
  // stress point per nail: where the traced outline is widest (between 30% and 85% of its length)
  { const vs = [], c0 = [], h0 = [];
    NAILS.forEach(n => { const PNn = n.wl.length; let best = -1, bk = 0;
      for (let k = 0; k < PNn; k++) { const v = -0.05 + 1.1 * k / (PNn - 1); if (v < 0.3 || v > 0.85) continue; const w = n.wl[k] + n.wr[k]; if (w > best) { best = w; bk = k; } }
      vs.push(-0.05 + 1.1 * bk / (PNn - 1)); c0.push((n.wr[bk] - n.wl[bk]) / 2); h0.push((n.wl[bk] + n.wr[bk]) / 2); });
    gl.uniform1fv(u('uVs'), vs); gl.uniform1fv(u('uC0'), c0); gl.uniform1fv(u('uH0'), h0); }
  gl.uniform1fv(u('uAccent'), NAILS.map(n => n.slot === ACCENT_SLOT ? 1 : 0));
  gl.uniform2f(u('uPhotoPx'), PHOTO.w, PHOTO.h);
  // nail outlines: 48 × N texels of (left, right) half-widths
  const PN = NAILS[0].wl.length, profData = new Float32Array(PN * NAILS.length * 2);
  NAILS.forEach((n, i) => { for (let k = 0; k < PN; k++) { profData[(i * PN + k) * 2] = n.wl[k]; profData[(i * PN + k) * 2 + 1] = n.wr[k]; } });
  tex(3, gl.NEAREST); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, PN, NAILS.length, 0, gl.RG, gl.FLOAT, profData);
  gl.uniform1i(u('uProf'), 3);

  // ---------- nail state ----------
  const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
  const nails = NAILS.map(() => ({ col: [0, 0, 0, 0], prev: [0, 0, 0, 0], prog: 3, manual: 0, pulse: 0 }));
  function pushName(i, name) { const s = NAILS[i].slot; const l = design.nailColors[s]; if (l[l.length - 1] !== name) l.push(name); }
  function setColor(i, hex) { const n = nails[i]; n.prev = n.col[3] > 0 ? n.col.slice() : [0, 0, 0, 0]; n.col = [...hexRgb(hex), 1]; }

  // ---------- auto painting: the brush sweeps three strokes per nail ----------
  const queue = []; let job = null;
  function autoPaint(indices, hex, name) {
    indices.forEach(i => { design.nailColors[NAILS[i].slot] = []; queue.push({ i, hex, name: name || design.color[0] }); });
    kick();
  }
  function runJobs(dt) {
    if (!job && queue.length) {
      job = queue.shift(); setColor(job.i, job.hex); nails[job.i].prog = 0; nails[job.i].manual = 0; pushName(job.i, job.name);
      brushOn(true);
    }
    if (!job) return false;
    const n = nails[job.i];
    n.prog = Math.min(3, n.prog + dt * (reduceMotion ? 60 : 3.4));
    const k = Math.min(2, Math.floor(n.prog)), f = n.prog - k;
    const cx = [0, -0.55, 0.55][k], L = tipLen() + 0.05;
    moveBrush(job.i, cx, Math.min(L, f * L));
    if (n.prog >= 3) {
      n.prev = [0, 0, 0, 0]; n.pulse = 1; burst(job.i); job = null;
      if (!queue.length) { setTimeout(() => { if (!job && !queue.length && !drag) brushOn(false); }, 450); emit('painted'); }
    }
    return true;
  }
  const tipLen = () => [1.2, 1.22, 1.42, 1.45, 1.55][SHAPE[design.shape] ?? 2];

  // ---------- view: fit all eight nails, fill the stage ----------
  let W = 1, H = 1, dpr = 1, scale = 1, off = [0, 0];
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = container.clientWidth; H = container.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const cover = Math.max(W / PHOTO.w, H / PHOTO.h);
    const fitBox = Math.min(W / ((BOX.x1 - BOX.x0) * PHOTO.w), (H * 0.86) / ((BOX.y1 - BOX.y0) * PHOTO.h));
    scale = Math.max(cover, Math.min(fitBox, cover * 1.6));
    const cx = (BOX.x0 + BOX.x1) / 2 * PHOTO.w, cy = (BOX.y0 + BOX.y1) / 2 * PHOTO.h;
    off = [W / 2 - cx * scale, H * 0.46 - cy * scale];
    off[0] = Math.min(0, Math.max(W - PHOTO.w * scale, off[0])); off[1] = Math.min(0, Math.max(H - PHOTO.h * scale, off[1]));
    kick();
  }
  const toScreen = (px, py) => [off[0] + px * scale, off[1] + py * scale];
  const toPhoto = (sx, sy) => [(sx - off[0]) / scale, (sy - off[1]) / scale];
  function nailPoint(i, x, v) {             // nail-local → screen px
    const n = NAILS[i], ax = n.ax, pr = [-ax[1], ax[0]];
    const t = n.base + v * (n.tip - n.base), uu = x * n.hw;
    const px = n.c[0] * PHOTO.w + (ax[0] * t + pr[0] * uu) * PHOTO.w, py = n.c[1] * PHOTO.h + (ax[1] * t + pr[1] * uu) * PHOTO.w;
    return toScreen(px, py);
  }
  function nailAt(sx, sy) {
    const [px, py] = toPhoto(sx, sy); const p = [px / PHOTO.w, py / PHOTO.w];
    let best = -1, bd = 1e9;
    NAILS.forEach((n, i) => {
      const c = [n.c[0], n.c[1] * PHOTO.h / PHOTO.w], d = [p[0] - c[0], p[1] - c[1]];
      const t = d[0] * n.ax[0] + d[1] * n.ax[1], uu = -d[0] * n.ax[1] + d[1] * n.ax[0];
      const v = (t - n.base) / (n.tip - n.base);
      if (v > -0.25 && v < tipLen() + 0.1 && Math.abs(uu) < n.hw * 1.35) { const dd = Math.abs(uu) / n.hw + Math.abs(v - 0.5); if (dd < bd) { bd = dd; best = i; } }
    });
    return best;
  }

  // ---------- brush (a little polish brush that follows the stroke) ----------
  const brush = document.createElement('div');
  brush.className = 'studio-brush'; brush.setAttribute('aria-hidden', 'true');
  brush.innerHTML = '<svg viewBox="0 0 40 120" width="40" height="120"><defs><linearGradient id="bcap" x1="0" x2="1"><stop offset="0" stop-color="#2a1d22"/><stop offset=".45" stop-color="#6b5960"/><stop offset="1" stop-color="#1c1317"/></linearGradient></defs><rect x="11" y="0" width="18" height="70" rx="5" fill="url(#bcap)"/><rect x="17" y="68" width="6" height="22" fill="#d8c8b8"/><path class="bb" d="M13 88 Q20 84 27 88 L25 112 Q20 120 15 112 Z"/></svg>';
  container.appendChild(brush);
  let brushVisible = false;
  function brushOn(v) { brushVisible = v; brush.classList.toggle('on', v); }
  function moveBrush(i, x, v) {
    const [sx, sy] = nailPoint(i, x, v);
    brush.style.transform = `translate(${sx - 20}px, ${sy - 116}px) rotate(18deg)`;
    brush.style.setProperty('--bc', '#' + nails[i].col.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join(''));
  }
  function burst(i) {
    const r = canvas.getBoundingClientRect(); const [sx, sy] = nailPoint(i, 0, 0.6);
    window.sparkleBurst && window.sparkleBurst(r.left + sx, r.top + sy, 10);
  }

  // ---------- interaction ----------
  let drag = null, light = [0, 0], lightT = [0, 0], lastMove = 0;
  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', e => {
    const [sx, sy] = local(e); const i = nailAt(sx, sy); if (i < 0) return;
    drag = { i, moved: 0, last: [sx, sy], started: false }; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const [sx, sy] = local(e);
    lightT = [(sx / W - 0.5) * 2, (sy / H - 0.5) * 2]; lastMove = performance.now(); kick();
    if (!drag) {
      if (e.pointerType === 'mouse') canvas.style.cursor = nailAt(sx, sy) >= 0 ? 'pointer' : 'default';
      return;
    }
    drag.moved += Math.hypot(sx - drag.last[0], sy - drag.last[1]);
    if (drag.moved > 8) {
      const i = drag.i, n = nails[i];
      if (!drag.started) {
        drag.started = true; setColor(i, design.color[1]); n.prog = 2.999; n.manual = 1; n.prev = n.prev[3] ? n.prev : [0, 0, 0, 0];
        if (!n.prev[3]) n.prev = [0, 0, 0, 0];
        // start this nail's brush layer fresh
        const nb = NAILS[i]; pctx.save(); pctx.globalCompositeOperation = 'destination-out';
        pctx.beginPath(); pctx.arc(nb.c[0] * paint.width, nb.c[1] * paint.height, (nb.tip - nb.base + nb.hw) * paint.width * 1.6, 0, 7); pctx.fill(); pctx.restore();
        n.prog = 0; pushName(i, design.color[0]); brushOn(true);
      }
      const [ax, ay] = toPhoto(drag.last[0], drag.last[1]), [bx, by] = toPhoto(sx, sy);
      pctx.strokeStyle = '#fff'; pctx.lineCap = 'round'; pctx.lineWidth = NAILS[i].hw * PHOTO.w * 0.5 * 1.1;
      pctx.beginPath(); pctx.moveTo(ax / 2, ay / 2); pctx.lineTo(bx / 2, by / 2); pctx.stroke(); uploadPaint();
      brush.style.transform = `translate(${sx - 20}px, ${sy - 116}px) rotate(18deg)`;
    }
    drag.last = [sx, sy];
  });
  const end = () => {
    if (!drag) return;
    const { i, moved, started } = drag; drag = null;
    if (moved <= 8) autoPaint([i], design.color[1], design.color[0]);
    else if (started) { emit('painted'); setTimeout(() => { if (!job && !drag) brushOn(false); }, 350); onTip && onTip('Gorgeous. Keep brushing, or tap a nail to give it a full coat.'); }
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; lightT = [Math.max(-1, Math.min(1, e.gamma / 35)), Math.max(-1, Math.min(1, (e.beta - 45) / 40))]; lastMove = performance.now(); });

  // ---------- design changes ----------
  let toneMul = [1, 1, 1];
  function applyTone() {
    const lin = c => hexRgb(c).map(x => Math.pow(x, 2.2));
    const ref = lin(TONES[1]), t = lin(design.tone);
    toneMul = t.map((x, k) => x / ref[k]);
  }
  applyTone();
  onDesign(what => {
    if (what === 'tone') applyTone();
    kick();
  });

  // ---------- render loop (runs only while visible) ----------
  let raf = 0, visible = true, t0 = performance.now(), last = t0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!ready || !visible) return;
    // idle: the light drifts gently so the gloss breathes
    if (!reduceMotion && now - lastMove > 2500) lightT = [Math.sin(now / 2600) * 0.55, Math.cos(now / 3400) * 0.3];
    light = light.map((l, k) => l + (lightT[k] - l) * (1 - Math.pow(0.002, dt)));
    const busy = runJobs(dt);
    nails.forEach(n => { n.pulse = Math.max(0, n.pulse - dt * 1.8); });
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform2f(u('uView'), scale * dpr, scale * dpr); gl.uniform2f(u('uOff'), off[0] * dpr, off[1] * dpr);
    gl.uniform1f(u('uTime'), (now - t0) / 1000); gl.uniform2f(u('uLight'), light[0], light[1]);
    gl.uniform1i(u('uFinish'), FINISH[design.finish] ?? 0); gl.uniform1i(u('uArt'), ART[design.art] ?? 0); gl.uniform1i(u('uShape'), SHAPE[design.shape] ?? 2);
    gl.uniform3fv(u('uToneMul'), toneMul);
    gl.uniform4fv(u('uCol'), nails.flatMap(n => n.col)); gl.uniform4fv(u('uPrev'), nails.flatMap(n => n.prev));
    gl.uniform1fv(u('uProg'), nails.map(n => n.prog)); gl.uniform1fv(u('uManual'), nails.map(n => n.manual)); gl.uniform1fv(u('uPulse'), nails.map(n => n.pulse));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduceMotion || busy || drag) kick();
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = performance.now(); kick(); } }).observe(container);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) kick(); });
  new ResizeObserver(resize).observe(container);
  resize();

  return {
    paintAll(hex) { design.rainbow = false; queue.length = 0; autoPaint(NAILS.map((_, i) => i), hex || design.color[1], design.color[0]); },
    paintSet(list) {
      design.rainbow = true; queue.length = 0;
      NAILS.forEach((n, i) => { const c = list[n.slot % list.length]; design.nailColors[n.slot] = []; queue.push({ i, hex: c[1], name: c[0] }); });
      kick();
    },
    clear() {
      queue.length = 0; job = null; brushOn(false);
      nails.forEach((n, i) => { n.col = [0, 0, 0, 0]; n.prev = [0, 0, 0, 0]; n.prog = 3; n.manual = 0; design.nailColors[NAILS[i].slot] = []; });
      pctx.clearRect(0, 0, paint.width, paint.height); uploadPaint();
      design.rainbow = false; emit('painted'); kick();
    },
    fingerName: i => FINGER_NAMES[i]
  };
}
