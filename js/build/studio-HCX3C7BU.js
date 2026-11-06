import{c as xe,j as de,l,m as ge,n as X}from"./chunk-G422OZGZ.js";var c={w:1280,h:964};var u=[{id:1,slot:3,c:[.10790886729955673,.36668190360069275],ax:[-.6589059404800091,.7522253396424203],base:-.04122418321255601,tip:.04240706537986083,hw:.0244968052411936,lum:.5568627715110779,hi:.7372549176216125},{id:2,slot:2,c:[.16707772016525269,.5544703602790833],ax:[-.6844990610461504,.7290137415899224],base:-.04302447175931855,tip:.04391133781733804,hw:.028144671374856572,lum:.5058823823928833,hi:.6470588445663452},{id:3,slot:1,c:[.27299612760543823,.5755795836448669],ax:[-.6833839434701371,.7300591659634201],base:-.041091466767175594,tip:.04512623430683467,hw:.030278828090110323,lum:.6352941393852234,hi:.7568627595901489},{id:4,slot:0,c:[.47044992446899414,.5138887763023376],ax:[-.8021427062066726,.5971323796943486],base:-.039119394300476326,tip:.03788395491249903,hw:.033256170080070216,lum:.6000000238418579,hi:.7137255072593689},{id:5,slot:3,c:[.7785219550132751,.672846257686615],ax:[.6055057951628751,.7958408961747155],base:-.04336636825517104,tip:.04908399151662236,hw:.03209848896548882,lum:.5333333611488342,hi:.6901960968971252},{id:6,slot:0,c:[.46871671080589294,.7849606275558472],ax:[.6137315799372358,.7895147546358738],base:-.03816815599208496,tip:.03788994218967791,hw:.02687814446376413,lum:.5333333611488342,hi:.7019608020782471},{id:7,slot:1,c:[.6341357827186584,.8773220777511597],ax:[.657734877628259,.7532495142722225],base:-.0475452151827757,tip:.0471230376202809,hw:.0331713428496857,lum:.6078431606292725,hi:.7607843279838562},{id:8,slot:2,c:[.7486957311630249,.8417186737060547],ax:[.46658230620201124,.88447778464991],base:-.051231751067705125,tip:.05021820525270321,hw:.03757726839269269,lum:.501960813999176,hi:.6509804129600525}];var v=u.length,Se={gloss:0,matte:1,jelly:2,chrome:3,cateye:4,glitter:5},_e={none:0,daisy:1,sunflower:2,starfish:3,dots:4,french:5,gems:6,heart:7,swirl:8},we={square:0,round:1,almond:2,coffin:3,stiletto:4},Ie=1,k=(()=>{let d=1,_=0,I=1,n=0;return u.forEach(e=>{d=Math.min(d,e.c[0]),_=Math.max(_,e.c[0]),I=Math.min(I,e.c[1]),n=Math.max(n,e.c[1])}),{x0:d-.06,x1:_+.07,y0:I-.08,y1:n+.09}})(),Ue=`#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`,Ne=`#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uPhoto, uMask, uPaint;
uniform vec2 uView, uOff;          // screen px \u2192 photo px:  q = (frag - uOff) / uView
uniform vec2 uRes, uPhotoPx;
uniform float uTime; uniform vec2 uLight;
uniform int uFinish, uArt, uShape;
uniform vec3 uToneMul;
uniform vec2 uC[${v}], uAx[${v}];
uniform float uBase[${v}], uTip[${v}], uHw[${v}], uLum[${v}], uHi[${v}];
uniform vec4 uCol[${v}], uPrev[${v}];      // rgb + a (a=0 \u2192 bare nail)
uniform float uProg[${v}], uManual[${v}], uAccent[${v}], uPulse[${v}];

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

// half-width profile of the free edge for each shape; x: 0 at mid-nail \u2192 1 at the new tip
float profile(int s, float x){
  x = clamp(x, 0.0, 1.0);
  if (s == 0) return x < 0.82 ? 1.0 : 0.72 + 0.28 * sqrt(max(0.0, 1.0 - pow((x - 0.82) / 0.18, 2.0)));   // square, soft corners
  if (s == 1) return sqrt(max(0.0, 1.0 - pow(max(0.0, x - 0.35) / 0.65, 2.0)));                          // round
  if (s == 2) return pow(max(0.0, 1.0 - x * x), 0.75);                                                     // almond
  if (s == 3) return x < 0.97 ? mix(1.0, 0.56, x) : 0.0;                                                   // coffin
  return pow(max(0.0, 1.0 - x), 1.15);                                                                     // stiletto
}
float tipLen(int s){ return s == 0 ? 1.06 : s == 1 ? 1.04 : s == 2 ? 1.14 : s == 3 ? 1.2 : 1.36; }
// where each shape starts to differ from the real (almond-ish) nail, and the real nail's half-width there
float shapeStart(int s){ return s == 0 || s == 3 ? 0.5 : s == 1 ? 0.62 : 0.78; }
float natW(float v){ return sqrt(max(0.0, 1.0 - pow(max(0.0, v - 0.45) / 0.6, 2.0))); }

vec3 artColor(int art, vec2 a, vec3 base, float t, out float cover){
  // a: x across the nail (-1..1), y along it (0 cuticle \u2192 1 tip)
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


vec3 finish(vec3 base, float shade, float Ln, float spec, float glint, vec2 q, float un, float v, float ax01, vec3 under, int i){
  vec3 pc;
  if (uFinish == 1) {                                   // velvet matte
    pc = base * clamp(mix(1.0, Ln, 0.3), 0.75, 1.15) * 1.05 + 0.02 * (hash(q) - 0.5);
    spec = 0.0; glint = 0.0;
  } else if (uFinish == 2) {                            // jelly: sheer, juicy
    pc = mix(under, base * 0.85, 0.62) * shade;
  } else if (uFinish == 3) {                            // chrome glaze: pearly, glazed donut
    float ang = un * 1.4 + v * 1.8 + uLight.x * 2.0 + uLight.y;
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ang * 0.35));
    pc = mix(base, vec3(1.0), 0.14) * shade + toLinI(iri) * 0.12 * (0.5 + 0.5 * shade);
    glint *= 1.6; spec *= 1.2;
  } else if (uFinish == 4) {                            // cat-eye: a band of light that follows the magnet
    float bp = uLight.x * 0.9;
    float band = exp(-pow((un - bp) / 0.32, 2.0));
    float sparkle = 0.65 + 0.35 * hash(floor(q * 0.9) + floor(uTime * 3.0));
    pc = base * 0.22 * shade + (base * 1.5 + 0.18) * band * sparkle * (0.7 + 0.3 * shade);
    glint *= 0.5;
  } else if (uFinish == 5) {                            // glitter flakes
    vec2 cell = floor(q * 0.55); float h = hash(cell);
    float flake = step(0.72, h) * pow(max(0.0, sin(uTime * 2.0 + h * 50.0 + uLight.x * 9.0)), 10.0);
    vec3 fc = mix(vec3(1.0, 0.9, 0.6), vec3(1.0), step(0.86, h));
    pc = base * shade * 0.9 + fc * flake * 1.4 + base * 0.15 * step(0.72, h);
  } else {                                              // classic gloss
    pc = base * shade;
  }
  pc = mix(pc, vec3(1.0), clamp(spec, 0.0, 1.0)) + vec3(glint * 0.45);
  pc *= mix(0.88, 1.0, 1.0 - smoothstep(0.7, 1.05, ax01));  // a touch richer at the side walls
  pc *= mix(0.9, 1.0, smoothstep(0.02, 0.08, v));             // soft cuticle edge
  return pc;
}

void main(){
  vec2 frag = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 q = (frag - uOff) / uView;                     // photo px
  vec2 uv = q / uPhotoPx;
  vec3 photo = toLin(texture(uPhoto, uv).rgb);
  vec4 mk = texture(uMask, uv);
  ivec2 tx = clamp(ivec2(uv * uPhotoPx), ivec2(0), ivec2(uPhotoPx) - 1);
  vec4 mkx = texelFetch(uMask, tx, 0);
  float skin = mk.b, realA = mk.g; int rid = int(floor(mkx.r * 255.0 / 30.0 + 0.5));
  if (rid == 0 && realA > 0.02) {            // edge pixel: borrow the id of a neighbour inside the nail
    for (int k = 0; k < 4; k++) { ivec2 o = k == 0 ? ivec2(1,0) : k == 1 ? ivec2(-1,0) : k == 2 ? ivec2(0,1) : ivec2(0,-1);
      int r2 = int(floor(texelFetch(uMask, clamp(tx + o, ivec2(0), ivec2(uPhotoPx) - 1), 0).r * 255.0 / 30.0 + 0.5)); if (r2 > 0) { rid = r2; break; } }
  }
  // skin tone
  vec3 col = mix(photo, photo * uToneMul, skin);
  float L = dot(texture(uPhoto, uv).rgb, vec3(0.299, 0.587, 0.114));
  float shadowAcc = 0.0;
  vec2 p = vec2(uv.x, uv.y * uPhotoPx.y / uPhotoPx.x);   // photo-width units
  float aa = 1.2 / (uView.x * uPhotoPx.x);                // ~1 screen px in photo-width units

  for (int i = 0; i < ${v}; i++) {
    vec2 ax = uAx[i], pr = vec2(-ax.y, ax.x);
    vec2 d = p - vec2(uC[i].x, uC[i].y * uPhotoPx.y / uPhotoPx.x);
    float t = dot(d, ax), u = dot(d, pr);
    float len = uTip[i] - uBase[i];
    float v = (t - uBase[i]) / len;                      // 0 cuticle \u2192 1 tip
    if (v < -0.2 || v > 1.6 || abs(u) > uHw[i] * 1.6) continue;
    float hw = uHw[i];
    float Lx = tipLen(uShape);
    float s0 = shapeStart(uShape);
    float x = (v - s0) / (Lx - s0);
    float w0 = (uShape == 0 || uShape == 3) ? 1.0 : natW(s0);
    float w = hw * w0 * profile(uShape, x);
    float ext = (1.0 - smoothstep(-aa, aa, abs(u) - w)) * (1.0 - smoothstep(Lx - 0.004, Lx + aa / len, v)) * smoothstep(s0 - 0.02, s0 + 0.02, v);
    float real = rid == i + 1 ? realA : 0.0;
    vec4 newC = uCol[i], oldC = uPrev[i];
    float cover = real;
    // soft shadow of the longer free edge onto whatever is underneath
    if (real < 0.5 && v > s0 && (newC.a > 0.5 || oldC.a > 0.5)) {
      vec2 sp = vec2(u + hw * 0.08, v - 0.04);
      float ws = hw * w0 * profile(uShape, (sp.y - s0) / (Lx - s0)) * 1.08;
      shadowAcc = max(shadowAcc, 0.3 * (1.0 - smoothstep(0.0, hw * 0.35, abs(sp.x) - ws)) * (1.0 - smoothstep(Lx - 0.02, Lx + 0.08, sp.y)) * step(0.6, sp.y));
    }
    if (max(real, ext) <= 0.001) continue;
    if (uCol[i].a < 0.5 && uPrev[i].a < 0.5 && uPulse[i] <= 0.0) continue;   // bare nail: leave the photo untouched
    bool onReal = rid == i + 1 && realA > 0.5;
    vec2 a = vec2(u / max(w, hw * 0.25), v);           // nail-local, x normalized to the current width
    float ax01 = clamp(abs(u) / hw, 0.0, 1.0);

    // how much of the new coat is on: three brush strokes (center, left, right), then full
    float pg = uProg[i], fresh = 0.0;
    if (pg >= 3.0) fresh = 1.0; else {
      for (int k = 0; k < 3; k++) {
        float cx = k == 0 ? 0.0 : (k == 1 ? -0.55 : 0.55);
        float reach = clamp(pg - float(k), 0.0, 1.0) * (Lx + 0.08);
        fresh = max(fresh, (1.0 - smoothstep(0.55, 0.7, abs(u / hw - cx))) * (1.0 - smoothstep(reach - 0.06, reach, v)) * step(0.001, reach));
      }
    }
    if (uManual[i] > 0.5) fresh = max(fresh, texture(uPaint, uv).r);
    if (newC.a < 0.5) fresh = 0.0;
    float painted = max(fresh, oldC.a > 0.5 ? 1.0 : 0.0);
    float realP = smoothstep(0.3, 0.75, real) * smoothstep(0.012, 0.05, v);   // polish sits just inside the nail, clean cuticle line
    cover = max(mix(real, realP, painted), ext * painted);
    if (cover <= 0.001) continue;
    // light for the longer free edge: borrow it from just inside the real nail's tip, at the same relative spot
    float Lsrc = mk.a * 2.0; bool synth = !onReal;
    if (synth) {
      float vc = min(v, 0.86), uc = u / max(w, 1e-4) * hw * natW(vc) * 0.92;
      vec2 pp = vec2(uC[i].x, uC[i].y * uPhotoPx.y / uPhotoPx.x) + ax * (uBase[i] + vc * len) + pr * uc;
      vec2 uv2 = vec2(pp.x, pp.y * uPhotoPx.x / uPhotoPx.y);
      Lsrc = texture(uMask, uv2).a * 2.0;
    }
    // light: borrow the photo's real light on the real nail, synthesize it on longer free edges
    float Ln = clamp(Lsrc, 0.6, 1.4);
    float un = u / hw;
    // smooth, glassy gel: the real nail's broad light \xD7 a clean dome, no wavy streaks
    float dome = 0.9 + 0.1 * cos(clamp(un, -1.2, 1.2) * 1.3);
    float shade = clamp(mix(1.0, Ln, 0.75), 0.7, 1.2) * dome * (synth ? 1.0 - 0.06 * smoothstep(0.95, Lx, v) : 1.0);
    // one long gel highlight that curves with the nail and slides with your finger / phone tilt, plus a soft tip glow
    float hp = -0.42 + uLight.x * 0.22 + 0.10 * (v - 0.5) * (v - 0.5);
    float hwid = 0.075 + 0.03 * smoothstep(0.2, 0.8, v);
    float along = smoothstep(0.1, 0.24, v) * (1.0 - smoothstep(Lx - 0.32, Lx - 0.12, v));
    float spec = (1.0 - smoothstep(hwid * 0.55, hwid, abs(un - hp))) * along * 0.78;
    spec += exp(-pow((un + 0.1 - uLight.x * 0.1) / 0.32, 2.0) - pow((v - Lx * 0.82) / 0.1, 2.0)) * 0.16;
    float glint = exp(-pow((un - 0.38 - uLight.x * 0.15) / 0.06, 2.0)) * smoothstep(0.35, 0.55, v) * (1.0 - smoothstep(0.7, 0.9, v)) * 0.35;
    vec3 bareCol = real > 0.001 ? col : toLin(vec3(0.94, 0.86, 0.83)) * shade;
    vec3 under = toLin(vec3(0.93, 0.83, 0.79)) * shade;      // a clean natural nail under sheer jelly
    vec3 oldCol = bareCol;
    if (oldC.a > 0.5) oldCol = finish(toLin(oldC.rgb), shade, Ln, spec, glint, q, u / hw, v, ax01, under, i);
    vec3 nailCol = oldCol;
    if (fresh > 0.0) {
      vec3 base = toLin(newC.rgb);
      float artCover = 0.0;
      if (uArt != 0 && (uArt == 5 || uAccent[i] > 0.5)) base = toLin(artColor(uArt, a, toSrgb(base), uTime, artCover));
      nailCol = mix(oldCol, finish(base, shade, Ln, spec, glint, q, u / hw, v, ax01, under, i), fresh);
    }
    nailCol += vec3(0.25, 0.12, 0.18) * uPulse[i] * max(0.0, 1.0 - v) * 0.5;
    col = mix(col, nailCol, cover);
  }
  col *= 1.0 - shadowAcc;
  outColor = vec4(toSrgb(col), 1.0);
}`;function Xe(d,{onReady:_,onTip:I}={}){let n=document.createElement("canvas");n.className="studio-canvas";let e=n.getContext("webgl2",{antialias:!1,premultipliedAlpha:!1,alpha:!1,powerPreference:"low-power"});if(!e)return null;d.prepend(n);let q=matchMedia("(prefers-reduced-motion: reduce)").matches,J=(t,o)=>{let i=e.createShader(t);if(e.shaderSource(i,o),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(i));return i},L=e.createProgram();try{e.attachShader(L,J(e.VERTEX_SHADER,Ue)),e.attachShader(L,J(e.FRAGMENT_SHADER,Ne))}catch(t){return console.error(t),n.remove(),null}if(e.linkProgram(L),!e.getProgramParameter(L,e.LINK_STATUS))return console.error(e.getProgramInfoLog(L)),n.remove(),null;e.useProgram(L);let be=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,be),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let Z=e.getAttribLocation(L,"aPos");e.enableVertexAttribArray(Z),e.vertexAttribPointer(Z,2,e.FLOAT,!1,0,0);let G={},r=t=>G[t]??(G[t]=e.getUniformLocation(L,t)),$=(t,o)=>{let i=e.createTexture();return e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),i},ye=$(0,e.LINEAR),Pe=$(1,e.LINEAR),Te=$(2,e.LINEAR);e.uniform1i(r("uPhoto"),0),e.uniform1i(r("uMask"),1),e.uniform1i(r("uPaint"),2);let T=document.createElement("canvas");T.width=c.w/2,T.height=c.h/2;let m=T.getContext("2d"),H=()=>{e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,Te),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,T)};H();let ee=t=>new Promise((o,i)=>{let a=new Image;a.decoding="async",a.onload=()=>o(a),a.onerror=i,a.src=t}),te=new URL("../../images/",import.meta.url),oe=!1;Promise.all([ee(new URL("studio-hand.webp",te).href),ee(new URL("studio-hand-mask.png",te).href)]).then(([t,o])=>{e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,ye),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,Pe),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,o),oe=!0,W(),y(),d.style.backgroundImage="none",_&&_(),setTimeout(()=>V(u.map((i,a)=>a),l.color[1],l.color[0]),350)}).catch(()=>{d.classList.add("no-gl")}),e.uniform2fv(r("uC"),u.flatMap(t=>t.c)),e.uniform2fv(r("uAx"),u.flatMap(t=>t.ax)),e.uniform1fv(r("uBase"),u.map(t=>t.base)),e.uniform1fv(r("uTip"),u.map(t=>t.tip)),e.uniform1fv(r("uHw"),u.map(t=>t.hw)),e.uniform1fv(r("uLum"),u.map(t=>t.lum)),e.uniform1fv(r("uHi"),u.map(t=>t.hi)),e.uniform1fv(r("uAccent"),u.map(t=>t.slot===Ie?1:0)),e.uniform2f(r("uPhotoPx"),c.w,c.h);let ae=t=>(t=t.replace("#",""),t.length===3&&(t=t.split("").map(o=>o+o).join("")),[0,2,4].map(o=>parseInt(t.slice(o,o+2),16)/255)),x=u.map(()=>({col:[0,0,0,0],prev:[0,0,0,0],prog:3,manual:0,pulse:0}));function ie(t,o){let i=u[t].slot,a=l.nailColors[i];a[a.length-1]!==o&&a.push(o)}function re(t,o){let i=x[t];i.prev=i.col[3]>0?i.col.slice():[0,0,0,0],i.col=[...ae(o),1]}let E=[],h=null;function V(t,o,i){t.forEach(a=>{l.nailColors[u[a].slot]=[],E.push({i:a,hex:o,name:i||l.color[0]})}),y()}function Ee(t){if(!h&&E.length&&(h=E.shift(),re(h.i,h.hex),x[h.i].prog=0,x[h.i].manual=0,ie(h.i,h.name),N(!0)),!h)return!1;let o=x[h.i];o.prog=Math.min(3,o.prog+t*(q?60:3.4));let i=Math.min(2,Math.floor(o.prog)),a=o.prog-i,s=[0,-.55,.55][i],g=se()+.05;return ke(h.i,s,Math.min(g,a*g)),o.prog>=3&&(o.prev=[0,0,0,0],o.pulse=1,Ae(h.i),h=null,E.length||(setTimeout(()=>{!h&&!E.length&&!f&&N(!1)},450),X("painted"))),!0}let se=()=>[1.06,1.04,1.14,1.2,1.36][we[l.shape]??2],A=1,M=1,R=1,w=1,b=[0,0];function W(){R=Math.min(devicePixelRatio||1,2),A=d.clientWidth,M=d.clientHeight,n.width=Math.round(A*R),n.height=Math.round(M*R),e.viewport(0,0,n.width,n.height);let t=Math.max(A/c.w,M/c.h),o=Math.min(A/((k.x1-k.x0)*c.w),M*.86/((k.y1-k.y0)*c.h));w=Math.max(t,Math.min(o,t*1.6));let i=(k.x0+k.x1)/2*c.w,a=(k.y0+k.y1)/2*c.h;b=[A/2-i*w,M*.46-a*w],b[0]=Math.min(0,Math.max(A-c.w*w,b[0])),b[1]=Math.min(0,Math.max(M-c.h*w,b[1])),y()}let Le=(t,o)=>[b[0]+t*w,b[1]+o*w],j=(t,o)=>[(t-b[0])/w,(o-b[1])/w];function ne(t,o,i){let a=u[t],s=a.ax,g=[-s[1],s[0]],S=a.base+i*(a.tip-a.base),p=o*a.hw,B=a.c[0]*c.w+(s[0]*S+g[0]*p)*c.w,P=a.c[1]*c.h+(s[1]*S+g[1]*p)*c.w;return Le(B,P)}function le(t,o){let[i,a]=j(t,o),s=[i/c.w,a/c.w],g=-1,S=1e9;return u.forEach((p,B)=>{let P=[p.c[0],p.c[1]*c.h/c.w],F=[s[0]-P[0],s[1]-P[1]],Re=F[0]*p.ax[0]+F[1]*p.ax[1],me=-F[0]*p.ax[1]+F[1]*p.ax[0],Q=(Re-p.base)/(p.tip-p.base);if(Q>-.25&&Q<se()+.1&&Math.abs(me)<p.hw*1.35){let ve=Math.abs(me)/p.hw+Math.abs(Q-.5);ve<S&&(S=ve,g=B)}}),g}let C=document.createElement("div");C.className="studio-brush",C.setAttribute("aria-hidden","true"),C.innerHTML='<svg viewBox="0 0 40 120" width="40" height="120"><defs><linearGradient id="bcap" x1="0" x2="1"><stop offset="0" stop-color="#2a1d22"/><stop offset=".45" stop-color="#6b5960"/><stop offset="1" stop-color="#1c1317"/></linearGradient></defs><rect x="11" y="0" width="18" height="70" rx="5" fill="url(#bcap)"/><rect x="17" y="68" width="6" height="22" fill="#d8c8b8"/><path class="bb" d="M13 88 Q20 84 27 88 L25 112 Q20 120 15 112 Z"/></svg>',d.appendChild(C);let Ce=!1;function N(t){Ce=t,C.classList.toggle("on",t)}function ke(t,o,i){let[a,s]=ne(t,o,i);C.style.transform=`translate(${a-20}px, ${s-116}px) rotate(18deg)`,C.style.setProperty("--bc","#"+x[t].col.slice(0,3).map(g=>Math.round(g*255).toString(16).padStart(2,"0")).join(""))}function Ae(t){let o=n.getBoundingClientRect(),[i,a]=ne(t,0,.6);window.sparkleBurst&&window.sparkleBurst(o.left+i,o.top+a,10)}let f=null,D=[0,0],O=[0,0],z=0,ce=t=>{let o=n.getBoundingClientRect();return[t.clientX-o.left,t.clientY-o.top]};n.addEventListener("pointerdown",t=>{let[o,i]=ce(t),a=le(o,i);a<0||(f={i:a,moved:0,last:[o,i],started:!1},n.setPointerCapture(t.pointerId))}),n.addEventListener("pointermove",t=>{let[o,i]=ce(t);if(O=[(o/A-.5)*2,(i/M-.5)*2],z=performance.now(),y(),!f){t.pointerType==="mouse"&&(n.style.cursor=le(o,i)>=0?"pointer":"default");return}if(f.moved+=Math.hypot(o-f.last[0],i-f.last[1]),f.moved>8){let a=f.i,s=x[a];if(!f.started){f.started=!0,re(a,l.color[1]),s.prog=2.999,s.manual=1,s.prev=s.prev[3]?s.prev:[0,0,0,0],s.prev[3]||(s.prev=[0,0,0,0]);let P=u[a];m.save(),m.globalCompositeOperation="destination-out",m.beginPath(),m.arc(P.c[0]*T.width,P.c[1]*T.height,(P.tip-P.base+P.hw)*T.width*1.6,0,7),m.fill(),m.restore(),s.prog=0,ie(a,l.color[0]),N(!0)}let[g,S]=j(f.last[0],f.last[1]),[p,B]=j(o,i);m.strokeStyle="#fff",m.lineCap="round",m.lineWidth=u[a].hw*c.w*.5*1.1,m.beginPath(),m.moveTo(g/2,S/2),m.lineTo(p/2,B/2),m.stroke(),H(),C.style.transform=`translate(${o-20}px, ${i-116}px) rotate(18deg)`}f.last=[o,i]});let ue=()=>{if(!f)return;let{i:t,moved:o,started:i}=f;f=null,o<=8?V([t],l.color[1],l.color[0]):i&&(X("painted"),setTimeout(()=>{!h&&!f&&N(!1)},350),I&&I("Gorgeous. Keep brushing, or tap a nail to give it a full coat."))};n.addEventListener("pointerup",ue),n.addEventListener("pointercancel",ue),addEventListener("deviceorientation",t=>{t.gamma!=null&&(O=[Math.max(-1,Math.min(1,t.gamma/35)),Math.max(-1,Math.min(1,(t.beta-45)/40))],z=performance.now())});let fe=[1,1,1];function he(){let t=a=>ae(a).map(s=>Math.pow(s,2.2)),o=t(xe[1]);fe=t(l.tone).map((a,s)=>a/o[s])}he(),ge(t=>{t==="tone"&&he(),y()});let Y=0,U=!0,pe=performance.now(),K=pe;function Me(t){Y=0;let o=Math.min(.05,(t-K)/1e3);if(K=t,!oe||!U)return;!q&&t-z>2500&&(O=[Math.sin(t/2600)*.55,Math.cos(t/3400)*.3]),D=D.map((a,s)=>a+(O[s]-a)*(1-Math.pow(.002,o)));let i=Ee(o);x.forEach(a=>{a.pulse=Math.max(0,a.pulse-o*1.8)}),e.uniform2f(r("uRes"),n.width,n.height),e.uniform2f(r("uView"),w*R,w*R),e.uniform2f(r("uOff"),b[0]*R,b[1]*R),e.uniform1f(r("uTime"),(t-pe)/1e3),e.uniform2f(r("uLight"),D[0],D[1]),e.uniform1i(r("uFinish"),Se[l.finish]??0),e.uniform1i(r("uArt"),_e[l.art]??0),e.uniform1i(r("uShape"),we[l.shape]??2),e.uniform3fv(r("uToneMul"),fe),e.uniform4fv(r("uCol"),x.flatMap(a=>a.col)),e.uniform4fv(r("uPrev"),x.flatMap(a=>a.prev)),e.uniform1fv(r("uProg"),x.map(a=>a.prog)),e.uniform1fv(r("uManual"),x.map(a=>a.manual)),e.uniform1fv(r("uPulse"),x.map(a=>a.pulse)),e.drawArrays(e.TRIANGLE_STRIP,0,4),(!q||i||f)&&y()}function y(){!Y&&U&&(Y=requestAnimationFrame(Me))}return new IntersectionObserver(([t])=>{U=t.isIntersecting,U&&(K=performance.now(),y())}).observe(d),document.addEventListener("visibilitychange",()=>{U=!document.hidden,U&&y()}),new ResizeObserver(W).observe(d),W(),{paintAll(t){l.rainbow=!1,E.length=0,V(u.map((o,i)=>i),t||l.color[1],l.color[0])},paintSet(t){l.rainbow=!0,E.length=0,u.forEach((o,i)=>{let a=t[o.slot%t.length];l.nailColors[o.slot]=[],E.push({i,hex:a[1],name:a[0]})}),y()},clear(){E.length=0,h=null,N(!1),x.forEach((t,o)=>{t.col=[0,0,0,0],t.prev=[0,0,0,0],t.prog=3,t.manual=0,l.nailColors[u[o].slot]=[]}),m.clearRect(0,0,T.width,T.height),H(),l.rainbow=!1,X("painted"),y()},fingerName:t=>de[t]}}export{Xe as createStudio};
