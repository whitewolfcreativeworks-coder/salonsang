// Live neon sign for the front door.
// The tube paths were traced from Sang's real sign (scikit-image skeleton, see README), rebuilt here as
// glowing 3D glass tubes in three.js. pmndrs/postprocessing adds HDR mipmap bloom, so the light
// bleeds like real neon, and the same light falls warm onto the wall and the fur.
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, TextureLoader,
  SRGBColorSpace, LinearFilter, CatmullRomCurve3, Vector3, TubeGeometry, BufferAttribute, HalfFloatType,
  Group, NoToneMapping
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';

const IMG_W = 1536, IMG_H = 1024;
const SIGN = { cx: 805, cy: 350, w: 860 };         // sign box in image pixels (y from top)
const WARM_HALO = [1.0, 0.30, 0.085];              // amber-pink gas glow (linear)
const WARM_CORE = [1.0, 0.74, 0.46];              // white-hot core
const SPILL = [1.0, 0.43, 0.17];                   // light that lands on the wall

export async function createNeon(door, canvas) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return null; }
  renderer.toneMapping = NoToneMapping;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse)').matches;

  const base = new URL('../../images/', import.meta.url);
  const tl = new TextureLoader();
  const load = (f, srgb) => new Promise((res, rej) => tl.load(new URL(f, base).href, t => {
    if (srgb) t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false; res(t);
  }, undefined, rej));
  let room, spill, data;
  try {
    [room, spill, data] = await Promise.all([
      load('neon-room.webp', true), load('neon-spill.png', false),
      fetch(new URL('neon-tubes.json', base)).then(r => r.json())
    ]);
  } catch (e) { renderer.dispose(); return null; }

  const scene = new Scene();
  const camera = new OrthographicCamera(0, IMG_W, IMG_H, 0, -100, 100);

  // ---------- the room, lit by the sign ----------
  const roomMat = new ShaderMaterial({
    uniforms: {
      uRoom: { value: room }, uSpill: { value: spill }, uLight: { value: 0 },
      uShift: { value: [0, 0] }, uSpillCol: { value: SPILL }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform sampler2D uRoom, uSpill; uniform float uLight; uniform vec2 uShift; uniform vec3 uSpillCol;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        vec2 c = clamp(uv, vec2(0.001), vec2(0.999));
        vec3 albedo = texture2D(uRoom, c).rgb;
        float s = texture2D(uSpill, clamp(uv - uShift, 0.0, 1.0)).r;
        // fall off into darkness outside the photo
        vec2 o = max(vec2(0.0), max(-uv, uv - 1.0));
        float out_ = exp(-dot(o, o) * 60.0);
        vec3 lit = albedo * (0.85 + uLight * s * uSpillCol * 5.5) + uSpillCol * s * s * uLight * 0.05;
        vec3 dark = vec3(0.012, 0.008, 0.011);
        gl_FragColor = vec4(mix(dark, lit, out_), 1.0);
      }`,
    depthWrite: false, depthTest: false
  });
  // oversized plane so portrait screens still have wall above and below
  const roomMesh = new Mesh(new PlaneGeometry(IMG_W * 3, IMG_H * 3), roomMat);
  roomMesh.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 3 - 1; });
  roomMesh.position.set(IMG_W / 2, IMG_H / 2, -10);
  scene.add(roomMesh);

  // ---------- glass tubes ----------
  const radius = Math.max(3.1, data.r + 0.6);
  const geos = [];
  for (const line of data.lines) {
    const p = line.p;
    if (p.length < 2) continue;
    const pts = p.map(([x, y]) => new Vector3(x, IMG_H - y, 0));
    let len = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { len += pts[i].distanceTo(pts[i - 1]); cum.push(len); }
    const segs = Math.max(4, Math.round(len / 2.5));
    const g = new TubeGeometry(new CatmullRomCurve3(pts, false, 'centripetal'), segs, radius, 8, false);
    const radial = 9, n = g.attributes.position.count;
    const aT = new Float32Array(n), aC = new Float32Array(n);
    for (let i = 0; i <= segs; i++) {
      const d = (i / segs) * len;
      let k = 1; while (k < cum.length - 1 && cum[k] < d) k++;
      const f = (d - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]);
      const t = p[k - 1][2] + (p[k][2] - p[k - 1][2]) * Math.min(1, Math.max(0, f));
      for (let j = 0; j < radial; j++) { aT[i * radial + j] = t; aC[i * radial + j] = line.c; }
    }
    g.setAttribute('aT', new BufferAttribute(aT, 1));
    g.setAttribute('aC', new BufferAttribute(aC, 1));
    geos.push(g);
  }
  const tubeGeo = mergeGeometries(geos);
  geos.forEach(g => g.dispose());

  const tubeMat = new ShaderMaterial({
    uniforms: {
      uOn: { value: [0, 0, 0] }, uSweep: { value: [0, 0, 0] }, uSurge: { value: 0 },
      uHalo: { value: WARM_HALO }, uCore: { value: WARM_CORE }
    },
    vertexShader: `
      attribute float aT; attribute float aC;
      varying float vT; varying float vC; varying vec3 vN;
      void main(){
        vT = aT; vC = aC; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOn[3]; uniform float uSweep[3]; uniform float uSurge; uniform vec3 uHalo, uCore;
      varying float vT; varying float vC; varying vec3 vN;
      void main(){
        int c = int(vC + 0.5);
        float on = c == 0 ? uOn[0] : c == 1 ? uOn[1] : uOn[2];
        float sw = c == 0 ? uSweep[0] : c == 1 ? uSweep[1] : uSweep[2];
        float facing = abs(normalize(vN).z);
        // gas fills the tube from one end: lit behind the front, a brighter bead at the front
        float filled = smoothstep(vT - 0.02, vT, sw);
        float front = exp(-abs(vT - sw) * 45.0) * step(sw, 0.999);
        float e = on * (filled + front * 1.6) * (1.0 + uSurge);
        float core = pow(facing, 7.0);
        vec3 lit = mix(uHalo * 3.4, uCore * 4.2, core) * e;
        // unlit glass: a faint tinted tube catching the room light
        vec3 glass = vec3(0.10, 0.07, 0.075) * (0.35 + 0.65 * pow(1.0 - facing, 2.0)) + vec3(0.25, 0.22, 0.2) * pow(facing, 30.0) * 0.4;
        gl_FragColor = vec4(glass * (1.0 - min(e, 1.0)) + lit, 1.0);
      }`,
    depthWrite: false, depthTest: false
  });
  const tubes = new Mesh(tubeGeo, tubeMat);
  const sign = new Group(); sign.add(tubes); scene.add(sign);

  // ---------- post: HDR bloom + filmic tone mapping ----------
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: mobile ? 0 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.85, luminanceSmoothing: 0.25, intensity: 2.3, radius: 0.8, levels: 8 });
  composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));

  // ---------- framing ----------
  let W = 1, H = 1;
  function resize() {
    W = door.clientWidth; H = door.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    composer.setSize(W, H, false);
    const a = W / H;
    let vw, vh, top, cx;
    if (a >= 1) {
      if (a > IMG_W / IMG_H) { vw = IMG_W; vh = vw / a; } else { vh = IMG_H; vw = vh * a; }
      vw = Math.max(vw, SIGN.w / 0.56); vh = vw / a;
      cx = SIGN.cx - 20;
      top = SIGN.cy - vh * 0.3;
    } else {
      vw = SIGN.w / 0.9; vh = vw / a;
      cx = SIGN.cx;
      top = SIGN.cy - vh * 0.27;
    }
    camera.left = cx - vw / 2; camera.right = cx + vw / 2;
    camera.top = IMG_H - top; camera.bottom = IMG_H - top - vh;
    camera.updateProjectionMatrix();
    if (!running) render(performance.now());
  }

  // ---------- ignition, hum and the odd flicker ----------
  const on = [0, 0, 0], sweep = [0, 0, 0];
  const t0 = performance.now() + 450;
  const STARTS = [0, 0.75, 1.5];                       // Salon, Sang, underline
  const SWEEP_DUR = [0.7, 0.6, 0.45];
  const stutter = s => (s < 0.06 ? 1 : s < 0.11 ? 0.15 : s < 0.16 ? 0.9 : s < 0.2 ? 0.3 : 1);
  let nextGlitch = 9 + Math.random() * 8, glitch = null, surge = 0;
  if (reduce) { on.fill(1); sweep.fill(1); }

  function update(now) {
    const t = (now - t0) / 1000;
    if (!reduce) {
      for (let c = 0; c < 3; c++) {
        const s = t - STARTS[c];
        if (s < 0) { on[c] = 0; sweep[c] = 0; continue; }
        sweep[c] = Math.min(1, s / SWEEP_DUR[c]);
        on[c] = stutter(s) * (0.985 + 0.015 * Math.sin(now * 0.0023 + c * 2.1));
      }
      if (t > 3 && t > nextGlitch && !glitch) glitch = { c: Math.random() < 0.6 ? 1 : 0, at: t };
      if (glitch) {
        const g = t - glitch.at;
        on[glitch.c] *= g < 0.05 ? 0.25 : g < 0.09 ? 1 : g < 0.12 ? 0.4 : 1;
        if (g > 0.2) { glitch = null; nextGlitch = t + 10 + Math.random() * 14; }
      }
    }
    surge *= 0.94;
    tubeMat.uniforms.uOn.value = on;
    tubeMat.uniforms.uSweep.value = sweep;
    tubeMat.uniforms.uSurge.value = surge;
    const light = (on[0] * sweep[0] * 0.45 + on[1] * sweep[1] * 0.4 + on[2] * sweep[2] * 0.15) * (1 + surge * 0.6);
    roomMat.uniforms.uLight.value = light;
    // a hint of depth: tubes stand off the wall, so they drift a touch against it
    sign.position.x += (look.x * 7 - sign.position.x) * 0.06;
    sign.position.y += (-look.y * 5 - sign.position.y) * 0.06;
    roomMat.uniforms.uShift.value = [sign.position.x / IMG_W, sign.position.y / IMG_H];
  }
  function render(now) { update(now); composer.render(); }

  // pointer / tilt parallax
  const look = { x: 0, y: 0 };
  door.addEventListener('pointermove', e => {
    const r = door.getBoundingClientRect();
    look.x = ((e.clientX - r.left) / r.width - 0.5) * 2; look.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    look.x = Math.max(-1, Math.min(1, e.gamma / 25)); look.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });

  let running = false, visible = true;
  function loop(now) { if (!running) return; render(now); requestAnimationFrame(loop); }
  function setRunning() {
    const want = visible && !document.hidden;
    if (want && !running) { running = true; requestAnimationFrame(loop); } else if (!want) running = false;
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; setRunning(); }).observe(door);
  document.addEventListener('visibilitychange', setRunning);
  addEventListener('resize', resize);
  resize();
  setRunning();

  return {
    surge() { surge = 1.2; },
    dispose() { running = false; composer.dispose(); renderer.dispose(); }
  };
}
