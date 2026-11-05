// Live neon sign for the front door.
// The tube paths were traced from Sang's real sign (scikit-image skeleton, see README), rebuilt here as
// glowing 3D glass tubes in three.js. pmndrs/postprocessing adds HDR mipmap bloom, so the light
// bleeds like real neon, and the same light falls warm onto the wall and the fur.
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, TextureLoader,
  SRGBColorSpace, LinearFilter, CatmullRomCurve3, Vector3, TubeGeometry, BufferAttribute, HalfFloatType,
  Group, NoToneMapping, SphereGeometry, CircleGeometry, Float32BufferAttribute
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
  roomMesh.renderOrder = -1;
  scene.add(roomMesh);

  // ---------- glass tubes ----------
  const radius = 5.0;                                   // ~12 mm glass at sign scale
  const geos = [], caps = [], posts = [];
  // free tube ends (where the electrodes sit) = polyline ends that no other polyline shares
  // (an end is free if no other polyline passes within a few pixels of it)
  const free = (q, own) => !data.lines.some(l => l !== own && l.p.some(r => (r[0] - q[0]) ** 2 + (r[1] - q[1]) ** 2 < 225));
  const compLen = {};
  for (const line of data.lines) {
    const p = line.p;
    if (p.length < 2) continue;
    const pts = p.map(([x, y]) => new Vector3(x, IMG_H - y, 0));
    let len = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { len += pts[i].distanceTo(pts[i - 1]); cum.push(len); }
    const segs = Math.max(4, Math.round(len / 2.5));
    const g = new TubeGeometry(new CatmullRomCurve3(pts, false, 'centripetal'), segs, radius, 8, false);
    const radial = 9, n = g.attributes.position.count;
    const aT = new Float32Array(n), aC = new Float32Array(n), aE = new Float32Array(n);
    const f0 = free(p[0], line), f1 = free(p[p.length - 1], line);
    const electrode = len > 100;                         // only real tube ends get black-painted electrodes
    for (let i = 0; i <= segs; i++) {
      const d = (i / segs) * len;
      const de = electrode ? Math.min(f0 ? d : 1e4, f1 ? len - d : 1e4) : 1e4;
      for (let j = 0; j < radial; j++) aE[i * radial + j] = de;
      let k = 1; while (k < cum.length - 1 && cum[k] < d) k++;
      const f = (d - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]);
      const t = p[k - 1][2] + (p[k][2] - p[k - 1][2]) * Math.min(1, Math.max(0, f));
      for (let j = 0; j < radial; j++) { aT[i * radial + j] = t; aC[i * radial + j] = line.c; }
    }
    g.setAttribute('aT', new BufferAttribute(aT, 1));
    g.setAttribute('aC', new BufferAttribute(aC, 1));
    g.setAttribute('aE', new BufferAttribute(aE, 1));
    geos.push(g);
    // round glass caps on the free ends
    [[f0, pts[0], p[0][2]], [f1, pts[pts.length - 1], p[p.length - 1][2]]].forEach(([isFree, at, t]) => {
      if (!isFree) return;
      const sg = new SphereGeometry(radius, 12, 8); sg.translate(at.x, at.y, 0);
      const m = sg.attributes.position.count;
      sg.setAttribute('aT', new Float32BufferAttribute(new Array(m).fill(t), 1));
      sg.setAttribute('aC', new Float32BufferAttribute(new Array(m).fill(line.c), 1));
      sg.setAttribute('aE', new Float32BufferAttribute(new Array(m).fill(electrode ? 0 : 1e4), 1));
      sg.deleteAttribute('uv'); caps.push(sg);
    });
    // clear standoff clips every ~190 px along each tube
    let acc = compLen[line.c] || 0;
    for (let i = 1; i < pts.length; i++) {
      const dl = pts[i].distanceTo(pts[i - 1]);
      const before = acc; acc += dl;
      if (Math.floor(acc / 190) > Math.floor(before / 190) && i > 2 && i < pts.length - 3) posts.push(pts[i]);
    }
    compLen[line.c] = acc;
  }
  geos.forEach(g => g.deleteAttribute('uv'));
  const tubeGeo = mergeGeometries([...geos, ...caps]);
  [...geos, ...caps].forEach(g => g.dispose());

  const tubeMat = new ShaderMaterial({
    uniforms: {
      uOn: { value: [0, 0, 0] }, uSweep: { value: [0, 0, 0] }, uSurge: { value: 0 }, uLight: { value: 0 },
      uHalo: { value: WARM_HALO }, uCore: { value: WARM_CORE }
    },
    vertexShader: `
      attribute float aT; attribute float aC; attribute float aE;
      varying float vT; varying float vC; varying float vE; varying vec3 vN;
      void main(){
        vT = aT; vC = aC; vE = aE; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOn[3]; uniform float uSweep[3]; uniform float uSurge; uniform float uLight; uniform vec3 uHalo, uCore;
      varying float vT; varying float vC; varying float vE; varying vec3 vN;
      void main(){
        int c = int(vC + 0.5);
        float on = c == 0 ? uOn[0] : c == 1 ? uOn[1] : uOn[2];
        float sw = c == 0 ? uSweep[0] : c == 1 ? uSweep[1] : uSweep[2];
        vec3 N = normalize(vN);
        float facing = clamp(N.z, 0.0, 1.0);
        float rim = pow(1.0 - facing, 1.4);

        // gas fills the tube from one end: lit behind the front, a brighter bead at the front
        float filled = smoothstep(vT - 0.02, vT, sw);
        float front = exp(-abs(vT - sw) * 45.0) * step(sw, 0.999);
        float block = 1.0 - smoothstep(8.0, 13.0, vE);          // black-painted electrode ends
        float e = on * (filled + front * 1.6) * (1.0 + uSurge) * (1.0 - block);

        // the glowing gas column sits in the middle of the tube...
        float column = smoothstep(0.3, 0.9, facing);
        vec3 gas = mix(uHalo * 1.1, mix(uHalo * 3.0, uCore * 4.6, pow(facing, 9.0)), column);
        // ...seen through the glass wall, which gets deeper and more saturated toward the edges
        vec3 lit = gas * e * (1.0 - rim * 0.72) + uHalo * vec3(0.9, 0.55, 0.5) * rim * e * 0.28;

        // glass: a crisp highlight streak from above, a softer warm one from the glow below, and a fresnel edge
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 H1 = normalize(normalize(vec3(-0.25, 0.92, 0.5)) + V);
        vec3 H2 = normalize(normalize(vec3(0.2, -0.9, 0.45)) + V);
        float s1 = pow(max(dot(N, H1), 0.0), 70.0);
        float s2 = pow(max(dot(N, H2), 0.0), 45.0);
        float fr = pow(1.0 - facing, 5.0);
        vec3 glassHi = vec3(1.0, 0.96, 0.92) * s1 * (1.5 + 0.7 * e) + uCore * s2 * (0.12 + 0.3 * uLight) + vec3(0.5, 0.26, 0.16) * fr * (0.25 + uLight);

        vec3 clearGlass = vec3(0.035, 0.028, 0.03) + vec3(0.09, 0.07, 0.07) * rim;
        vec3 body = mix(clearGlass, vec3(0.008, 0.006, 0.008), block);
        gl_FragColor = vec4(body * (1.0 - min(e, 1.0)) + lit + glassHi, 1.0);
      }`
  });
  // clear acrylic standoffs behind the tube: a little ring of light where the glow catches their edge
  const postMat = new ShaderMaterial({
    uniforms: { uLight: { value: 0 }, uHalo: { value: WARM_HALO } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform float uLight; uniform vec3 uHalo; varying vec2 vP;
      void main(){
        float r = length(vP) / 9.0;
        float ring = smoothstep(0.72, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r));
        float body = 1.0 - smoothstep(0.9, 1.0, r);
        vec3 col = vec3(0.02, 0.015, 0.016) * body + (uHalo * 0.9 + 0.15) * ring * (0.25 + uLight * 0.9);
        gl_FragColor = vec4(col, body);
      }`,
    transparent: true, depthWrite: false
  });
  const postGeos = posts.map(at => { const cg = new CircleGeometry(9, 24); cg.translate(at.x + 1.5, at.y - 1.5, -radius - 1); return cg; });
  const postMesh = postGeos.length ? new Mesh(mergeGeometries(postGeos), postMat) : null;
  postGeos.forEach(g => g.dispose());
  const tubes = new Mesh(tubeGeo, tubeMat);
  const sign = new Group(); sign.add(tubes); if (postMesh) sign.add(postMesh); scene.add(sign);

  // ---------- post: HDR bloom + filmic tone mapping ----------
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: mobile ? 2 : 4 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.1, luminanceSmoothing: 0.3, intensity: 1.7, radius: 0.82, levels: 8 });
  composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));

  // ---------- framing ----------
  let W = 1, H = 1;
  function resize() {
    W = door.clientWidth; H = door.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    composer.setSize(W, H, false);
    // fit the sign into the space above the text, never wider than ~90% (phones) / 56% (desktops)
    const content = door.querySelector('.door-content');
    const free = Math.max(H * 0.3, (content ? content.offsetTop : H * 0.55) - 8);
    const SIGN_H = 310;                                   // tubes + underline + glow room, image px
    const maxW = W >= H ? 0.56 : 0.9;
    const k = Math.min((W * maxW) / SIGN.w, free / SIGN_H);   // screen px per image px
    const vw = W / k, vh = H / k, cx = SIGN.cx;
    const top = SIGN.cy - (free * 0.5 + (W >= H ? H * 0.02 : 0)) / k;
    camera.left = cx - vw / 2; camera.right = cx + vw / 2;
    camera.top = IMG_H - top; camera.bottom = IMG_H - top - vh;
    camera.updateProjectionMatrix();
    if (!running) render(performance.now());
  }

  // ---------- ignition, hum and the odd flicker ----------
  const on = [0, 0, 0], sweep = [0, 0, 0];
  let t0 = Infinity;                                   // ignition waits for start() (after the splash)
  const STARTS = [0, 0.75, 1.5];                       // Salon, Sang, underline
  const SWEEP_DUR = [0.7, 0.6, 0.45];
  const stutter = s => (s < 0.06 ? 1 : s < 0.11 ? 0.15 : s < 0.16 ? 0.9 : s < 0.2 ? 0.3 : 1);
  let nextGlitch = 9 + Math.random() * 8, glitch = null, surge = 0;
  if (reduce) { on.fill(1); sweep.fill(1); }

  function update(now) {
    const t = Math.max(-1, (now - t0) / 1000);
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
    tubeMat.uniforms.uLight.value = light; postMat.uniforms.uLight.value = light;
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
  // re-frame whenever the door or its text changes size (fonts arriving, phone toolbars, rotation)
  const ro = new ResizeObserver(() => resize());
  ro.observe(door);
  const contentEl = door.querySelector('.door-content'); if (contentEl) ro.observe(contentEl);
  if (document.fonts) document.fonts.ready.then(resize);
  resize();
  setRunning();
  // ready = framed with final fonts and one frame on screen
  const ready = (document.fonts ? document.fonts.ready : Promise.resolve())
    .then(() => { resize(); return new Promise(r => requestAnimationFrame(() => { render(performance.now()); r(); })); });

  return {
    ready,
    start() { if (t0 === Infinity) t0 = performance.now() + 150; },
    surge() { surge = 1.2; },
    dispose() { running = false; composer.dispose(); renderer.dispose(); }
  };
}
