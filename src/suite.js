// Immersive "step inside the suite" viewer.
// Each photo gets an AI depth map (Depth Anything V2, Apache 2.0, generated offline) and is rebuilt
// as a 3D relief in three.js. The two photos meet like the walls of a room corner; drag or tilt to
// look around, with real parallax and a fisheye lens (custom post-processing shader).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sparkles } from '@pmndrs/vanilla/core/Sparkles.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const base = new URL('../../images/', import.meta.url).href;

const VIEWS = [
  { img: 'suite-desk-hd.webp', depth: 'suite-desk-depth.png' },
  { img: 'suite-pedicure-hd.webp', depth: 'suite-pedicure-depth.png' }
];
const PANEL_H = 4.6, PANEL_W = PANEL_H * 0.75, DIST = 4.0, RELIEF = 1.55;
const HALF = Math.atan((PANEL_W / 2) / DIST);   // angular half-width of one panel
// real highlights in each photo (polish shelf lights, glass cabinet, chair gold, desk edge), found offline
const HIGHLIGHTS_RAW = [[[0.262, 0.128], [0.078, 0.323], [0.352, 0.25], [0.279, 0.256], [0.772, 0.119], [0.675, 0.132], [0.527, 0.141], [0.745, 0.234], [0.854, 0.23], [0.554, 0.243], [0.614, 0.241], [0.835, 0.343], [0.147, 0.322], [0.613, 0.135], [0.132, 0.602], [0.296, 0.602], [0.448, 0.606], [0.819, 0.437], [0.674, 0.237], [0.397, 0.144], [0.925, 0.227], [0.16, 0.644], [0.381, 0.604], [0.201, 0.601], [0.876, 0.675], [0.466, 0.145]], [[0.144, 0.58], [0.334, 0.346], [0.181, 0.637], [0.128, 0.522], [0.238, 0.526], [0.204, 0.579], [0.057, 0.637], [0.486, 0.556], [0.078, 0.49], [0.073, 0.579], [0.446, 0.694], [0.238, 0.356], [0.631, 0.385], [0.171, 0.17], [0.743, 0.215], [0.161, 0.041], [0.154, 0.475], [0.246, 0.466], [0.371, 0.417], [0.91, 0.211], [0.833, 0.235], [0.3, 0.403], [0.078, 0.716], [0.188, 0.424], [0.152, 0.097], [0.141, 0.325]]];
// The chair photo is trimmed at 94% (its right edge showed a sliver of the rolling cart that the
// desk photo shows whole), so that wall is a little narrower; it still meets the desk wall in the corner.
const WIDTHS = [PANEL_W, PANEL_W * 0.94];
const TRIM = [1, 0.94];
const HIGHLIGHTS = HIGHLIGHTS_RAW.map((l, i) => l.map(([u, v]) => [u / TRIM[i], v]).filter(([u]) => u < 0.98));
const YAWS = [-HALF, HALF];                     // chair on the left, desk on the right (as in the real suite): they meet in a corner

export function createSuite(container, hotspots) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return null; }
  const isPhone = Math.min(innerWidth, innerHeight) < 600;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 2 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = 'suite-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f9e6ec');
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);

  // soft glow halo behind the room
  const halo = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float g = smoothstep(-0.6, 0.9, -vP.z); vec3 c = mix(vec3(0.93,0.78,0.83), vec3(1.0,0.96,0.95), g); gl_FragColor = vec4(c,1.0); }'
  }));
  scene.add(halo);

  const sparkles = new Sparkles({ count: isPhone ? 40 : 70, scale: [7, 5, 4], size: 3, speed: 0.2, opacity: 0.85, color: '#fff3d6', noise: 1 });
  sparkles.position.set(0, 0, -2.2);
  sparkles.setPixelRatio(renderer.getPixelRatio());
  scene.add(sparkles);

  // ---------- depth-relief panels ----------
  const loader = new THREE.TextureLoader();
  const depthData = [];
  const panels = VIEWS.map((v, i) => {
    const tex = loader.load(base + v.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const dtex = loader.load(base + v.depth, t => readDepth(t.image, i));
    const geo = new THREE.PlaneGeometry(WIDTHS[i], PANEL_H, isPhone ? 180 : 260, isPhone ? 240 : 346);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uMap: { value: tex }, uDepth: { value: dtex }, uRelief: { value: RELIEF }, uSide: { value: Math.sign(YAWS[i]) }, uReveal: { value: 0 } },
      vertexShader: `
        uniform sampler2D uDepth; uniform float uRelief; uniform float uReveal; uniform float uSide;
        varying vec2 vUv; varying float vD;
        void main(){
          vUv = uv;
          float d = texture2D(uDepth, uv).r;
          vD = d;
          vec3 p = position;
          // ease the relief to flat at the corner seam so the two photos meet without a gap
          float seam = uSide > 0.0 ? 1.0 - uv.x : uv.x;
          float keep = smoothstep(0.0, 0.08, seam);
          p.z += (d - 0.25) * uRelief * uReveal * keep;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uSide; uniform float uReveal;
        varying vec2 vUv; varying float vD;
        void main(){
          vec4 c = texture2D(uMap, vUv);
          // feather the outer edges into the glow; keep the corner seam crisp
          float outer = uSide > 0.0 ? smoothstep(0.0, 0.04, vUv.x) : smoothstep(1.0, 0.96, vUv.x);
          float tb = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
          // depth fog: far wall a touch softer, near things pop
          c.rgb = mix(c.rgb * 0.94 + 0.06, c.rgb * 1.04, vD);
          gl_FragColor = vec4(c.rgb, outer * tb * uReveal);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat);
    // place on an arc around the viewer, facing in
    const yaw = YAWS[i];
    // hinge each wall on the shared corner so walls of different widths still meet exactly
    const sgn = Math.sign(yaw), c = Math.cos(HALF), sn = Math.sin(HALF), w2 = WIDTHS[i] / 2;
    mesh.position.set(-sgn * c * w2, 0, -DIST / c + sn * w2);
    mesh.rotation.y = yaw;
    scene.add(mesh);
    return mesh;
  });

  function readDepth(img, i) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    depthData[i] = { w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data };
  }
  function depthAt(i, u, v) {
    const d = depthData[i]; if (!d) return 0.5;
    const x = Math.min(d.w - 1, Math.max(0, Math.round(u * (d.w - 1)))), y = Math.min(d.h - 1, Math.max(0, Math.round((1 - v) * (d.h - 1))));
    return d.px[(y * d.w + x) * 4] / 255;
  }

  // ---------- fisheye lens ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uK: { value: 0.32 }, uAspect: { value: 1 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uK; uniform float uAspect; uniform float uTime;
      varying vec2 vUv;
      vec2 barrel(vec2 uv, float k){
        vec2 p = uv * 2.0 - 1.0; p.x *= uAspect;
        float r2 = dot(p, p);
        p *= (1.0 - k * 0.42) / (1.0 - k * 0.42 * r2 * 0.6) ;
        p *= 1.0 / (1.0 + k * 0.35);
        p.x /= uAspect;
        return p * 0.5 + 0.5;
      }
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        // tiny chromatic split toward the edges, like real glass
        float ca = 0.0022 * r * r;
        vec3 col;
        col.r = texture2D(tDiffuse, barrel(vUv, uK + ca * 8.0)).r;
        col.g = texture2D(tDiffuse, barrel(vUv, uK)).g;
        col.b = texture2D(tDiffuse, barrel(vUv, uK - ca * 8.0)).b;
        // soft pink vignette
        vec2 cv = c; cv.x *= min(uAspect, 1.25) / max(uAspect, 1.0) * 1.0; float vig = smoothstep(1.5, 0.75, length(cv));
        col = mix(vec3(0.96, 0.83, 0.88), col, vig);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  // ---------- touch & slide: like a 3D photo ----------
  // `slide` runs from -1 (chair side, left) to +1 (desk side, right). Your finger drives it directly,
  // it keeps a little momentum when you let go, and phone tilt adds a gentle extra wobble.
  let YAW_MAX = HALF * 1.15, YAW_LEFT = YAW_MAX; const PITCH = 0.16;
  const look = { slide: 0.6, target: 0.6, vel: 0, pitch: 0, tp: 0, tilt: 0 };
  let drag = null, lastInput = performance.now(), idleT = 0, touched = false;
  container.addEventListener('pointerdown', e => {
    if (e.target.closest('.hs, .suite-views')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: look.target, lastX: e.clientX, lastT: performance.now() };
    try { container.setPointerCapture(e.pointerId); } catch (_) {}
    look.vel = 0; lastInput = performance.now();
    if (!touched) { touched = true; container.classList.add('touched'); }
  });
  container.addEventListener('pointermove', e => {
    if (drag && e.pointerId === drag.id) {
      const w = container.clientWidth;
      // drag right to look left, like pushing the photo
      look.target = clamp(drag.start - (e.clientX - drag.x) / (w * 0.42), -1, 1);
      const now = performance.now(), dt = Math.max(1, now - drag.lastT);
      look.vel = -(e.clientX - drag.lastX) / (w * 0.42) / dt * 16;
      drag.lastX = e.clientX; drag.lastT = now;
      if (e.pointerType === 'mouse') look.tp = clamp(-(e.clientY - drag.y) / w * 0.6, -PITCH, PITCH);
      lastInput = now;
    } else if (e.pointerType === 'mouse') {
      const r = container.getBoundingClientRect();
      look.tp = clamp(-((e.clientY - r.top) / r.height - 0.5) * PITCH * 1.2, -PITCH, PITCH);
    }
  });
  const release = e => { if (drag && (!e || e.pointerId === drag.id)) { drag = null; lastInput = performance.now(); } };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);
  container.addEventListener('lostpointercapture', release);
  let gyroBase = null;
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || !visible) return;
    if (!gyroBase) gyroBase = e.gamma;
    gyroBase += (e.gamma - gyroBase) * 0.01; // slowly re-centre so it never fights your finger
    look.tilt = clamp((e.gamma - gyroBase) / 25, -1, 1) * 0.22;
  });
  function goTo(i) { look.target = i === 0 ? 0.75 : -0.75; look.vel = 0; lastInput = performance.now() + 4000; }

  // ---------- tasteful sparkle: star glints on real highlights + a light fall of glitter ----------
  const starTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64);
    const ray = (len, w, rot) => {
      g.save(); g.rotate(rot); const gr = g.createLinearGradient(-len, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.fill(); g.restore();
    };
    ray(62, 2.4, 0); ray(62, 2.4, Math.PI / 2); ray(24, 1.3, Math.PI / 4); ray(24, 1.3, -Math.PI / 4);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 20); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glintTints = ['#ffffff', '#fff4dc', '#ffffff', '#ffd9ea', '#ffffff', '#e6f2ff'];
  const glints = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: glintTints[i], transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.visible = false; sp.renderOrder = 5; scene.add(sp);
    glints.push({ sp, t: 1, life: 1, size: 0.2 });
  }
  let glintWait = 1.2;
  function spawnGlint() {
    const g = glints.find(x => x.t >= 1); if (!g) return;
    // prefer the photo you're looking at
    const view = Math.random() < 0.8 ? (look.slide < 0 ? 1 : 0) : (look.slide < 0 ? 0 : 1);
    const list = HIGHLIGHTS[view], [u, v] = list[(Math.random() * list.length) | 0];
    const p = panels[view], d = depthAt(view, u, v);
    g.sp.position.set((u - 0.5) * WIDTHS[view], (v - 0.5) * PANEL_H, (d - 0.25) * RELIEF * p.material.uniforms.uReveal.value + 0.05).applyMatrix4(p.matrixWorld);
    g.t = 0; g.life = 0.7 + Math.random() * 0.6; g.size = 0.16 + Math.random() * 0.14; g.rot = Math.random() * 0.5;
    g.sp.visible = true;
  }
  // glitter flakes: tiny flat flecks tumbling down through the room, flashing as they turn to the light
  const FLAKES = isPhone ? 36 : 60;
  const fGeo = new THREE.BufferGeometry();
  const fPos = new Float32Array(FLAKES * 3), fSeed = new Float32Array(FLAKES * 4);
  for (let i = 0; i < FLAKES; i++) {
    fPos.set([(Math.random() - 0.5) * 6, Math.random() * 4.6 - 2.3, -0.8 - Math.random() * 2.6], i * 3);
    fSeed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  fGeo.setAttribute('seed', new THREE.BufferAttribute(fSeed, 4));
  const flakeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      uniform float uTime; uniform float uPx; attribute vec4 seed;
      varying float vFlash; varying vec3 vCol;
      void main(){
        vec3 p = position;
        float fall = 0.10 + seed.x * 0.08;                         // slow drift down
        p.y = mod(p.y + 2.3 - uTime * fall, 4.6) - 2.3;
        p.x += sin(uTime * (0.3 + seed.y * 0.4) + seed.z * 6.28) * 0.18;
        float spin = uTime * (1.2 + seed.w * 2.2) + seed.z * 6.28;
        vFlash = pow(abs(sin(spin)), 14.0);                        // the flat flake catches the light briefly
        vCol = seed.y < 0.45 ? vec3(1.0, 0.86, 0.55) : seed.y < 0.75 ? vec3(1.0, 0.75, 0.86) : vec3(1.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + 5.0 * vFlash) * uPx * (2.2 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vFlash; varying vec3 vCol;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float core = smoothstep(0.5, 0.0, d);
        float cross = max(smoothstep(0.08, 0.0, abs(q.x)), smoothstep(0.08, 0.0, abs(q.y))) * smoothstep(0.5, 0.1, d) * vFlash;
        float a = (core * (0.18 + 0.82 * vFlash) + cross) * 0.9;
        gl_FragColor = vec4(vCol * a, a);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  });
  const flakes = new THREE.Points(fGeo, flakeMat); flakes.renderOrder = 4; flakes.frustumCulled = false;
  scene.add(flakes);

  // ---------- 3D-anchored sparkle hotspots ----------
  hotspots = hotspots.map(h => ({ ...h, u: h.u / TRIM[h.view] })).filter(h => h.u < 0.98);
  const spots = hotspots.map(h => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hs hs3d'; b.textContent = '✦';
    b.dataset.title = h.title; b.dataset.text = h.text; b.setAttribute('aria-label', h.title); b.setAttribute('aria-expanded', 'false');
    container.appendChild(b);
    return { ...h, el: b, world: new THREE.Vector3() };
  });
  function placeSpots() {
    const w = container.clientWidth, h = container.clientHeight;
    spots.forEach(s => {
      const p = panels[s.view];
      const d = depthAt(s.view, s.u, s.v);
      const local = new THREE.Vector3((s.u - 0.5) * WIDTHS[s.view], (s.v - 0.5) * PANEL_H, (d - 0.25) * RELIEF * p.material.uniforms.uReveal.value + 0.02);
      s.world.copy(local).applyMatrix4(p.matrixWorld);
      const v = s.world.clone().project(camera);
      // apply the same fisheye mapping as the lens so dots stay glued to objects
      let x = v.x, y = v.y;
      const asp = w / h, k = lens.uniforms.uK.value;
      // invert barrel numerically (2 Newton-ish steps)
      let qx = x, qy = y;
      for (let it = 0; it < 6; it++) {
        let px = qx * asp, py = qy;
        const r2 = px * px + py * py;
        const f = (1 - k * 0.42) / (1 - k * 0.42 * r2 * 0.6) / (1 + k * 0.35);
        const fx = px * f / asp, fy = py * f;
        qx += (x - fx); qy += (y - fy);
      }
      const on = v.z < 1 && Math.abs(qx) < 0.95 && Math.abs(qy) < 0.92;
      s.el.style.opacity = on ? 1 : 0;
      s.el.style.pointerEvents = on ? 'auto' : 'none';
      s.el.style.transform = `translate(${((qx + 1) / 2 * w).toFixed(1)}px, ${((1 - qy) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
    });
  }

  // ---------- loop ----------
  let running = false, visible = false, last = performance.now(), t = 0, reveal = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    // momentum after a flick, then a slow idle sway if nobody touches for a while
    if (!drag) {
      if (Math.abs(look.vel) > 0.0005) { look.target = clamp(look.target + look.vel * dt * 60 * 0.06, -1, 1); look.vel *= Math.pow(0.04, dt); }
      if (!reduceMotion && performance.now() - lastInput > 8000) { idleT += dt * 0.22; look.target += (Math.sin(idleT) * 0.7 - look.target) * dt * 0.4; }
    }
    const ease = 1 - Math.pow(drag ? 0.00001 : 0.004, dt);
    look.slide += (clamp(look.target + look.tilt, -1, 1) - look.slide) * ease;
    look.pitch += (look.tp - look.pitch) * ease;
    const yaw = -look.slide * (look.slide < 0 ? YAW_LEFT : YAW_MAX) * 0.78;
    // strong sideways head movement = the 3D-photo parallax effect
    camera.position.set(look.slide * 0.7, look.pitch * 0.8, 0.45);
    camera.rotation.set(look.pitch, yaw, 0, 'YXZ');
    reveal = Math.min(1, reveal + dt * 0.9);
    const e = 1 - Math.pow(1 - reveal, 3);
    panels.forEach(p => { p.material.uniforms.uReveal.value = e; });
    lens.uniforms.uK.value = 0.32 + (drag ? 0.04 : 0) * 1;
    lens.uniforms.uTime.value = t;
    sparkles.update(t);
    if (!reduceMotion) {
      flakeMat.uniforms.uTime.value = t;
      glintWait -= dt;
      if (glintWait <= 0 && reveal > 0.6) { spawnGlint(); glintWait = 0.35 + Math.random() * 0.9; }
      glints.forEach(g => {
        if (g.t >= 1) { g.sp.visible = false; return; }
        g.t += dt / g.life;
        const env = Math.sin(Math.PI * Math.min(1, g.t)) ** 2;
        g.sp.material.opacity = env;
        g.sp.scale.setScalar(g.size * (0.3 + 0.7 * env));
        g.sp.material.rotation = g.rot + g.t * 0.6;
      });
    }
    composer.render(dt);
    placeSpots();
    // which view are we closer to?
    container.dispatchEvent(new CustomEvent('suiteview', { detail: look.slide < 0 ? 1 : 0 }));
    requestAnimationFrame(frame);
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 80 : (w / h > 1.6 ? 50 : 60);
    camera.updateProjectionMatrix();
    lens.uniforms.uAspect.value = w / h;
    // only let the view travel as far as the photos reach
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    // outer-edge angle of each wall (the left, chair wall is a touch narrower)
    const edgeAng = w => { const c = Math.cos(HALF), sn = Math.sin(HALF); return Math.atan2(c * w, DIST / c - sn * w); };
    YAW_MAX = Math.max(0.06, edgeAng(WIDTHS[0]) - hf / 2 * 0.86);
    YAW_LEFT = Math.max(0.06, edgeAng(WIDTHS[1]) - hf / 2 * 0.86);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(container);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  new ResizeObserver(resize).observe(container);
  resize();
  return { goTo };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
