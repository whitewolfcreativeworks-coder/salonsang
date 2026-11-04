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
const YAWS = [HALF, -HALF];                     // desk on the left, chair on the right: they meet in a corner

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
    const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, isPhone ? 180 : 260, isPhone ? 240 : 346);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uMap: { value: tex }, uDepth: { value: dtex }, uRelief: { value: RELIEF }, uSide: { value: i === 0 ? 1 : -1 }, uReveal: { value: 0 } },
      vertexShader: `
        uniform sampler2D uDepth; uniform float uRelief; uniform float uReveal;
        varying vec2 vUv; varying float vD;
        void main(){
          vUv = uv;
          float d = texture2D(uDepth, uv).r;
          vD = d;
          vec3 p = position;
          p.z += (d - 0.25) * uRelief * uReveal;
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
    mesh.position.set(-Math.sin(yaw) * DIST, 0, -Math.cos(yaw) * DIST);
    mesh.lookAt(0, 0, 0);
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
  // `slide` runs from -1 (desk side) to +1 (chair side). Your finger drives it directly,
  // it keeps a little momentum when you let go, and phone tilt adds a gentle extra wobble.
  let YAW_MAX = YAWS[0] * 1.15, YAW_MIN = -YAW_MAX; const PITCH = 0.16;
  const look = { slide: -0.6, target: -0.6, vel: 0, pitch: 0, tp: 0, tilt: 0 };
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
  function goTo(i) { look.target = i === 0 ? -0.75 : 0.75; look.vel = 0; lastInput = performance.now() + 4000; }

  // ---------- 3D-anchored sparkle hotspots ----------
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
      const local = new THREE.Vector3((s.u - 0.5) * PANEL_W, (s.v - 0.5) * PANEL_H, (d - 0.25) * RELIEF * p.material.uniforms.uReveal.value + 0.02);
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
    const yaw = -look.slide * YAW_MAX * 0.78;
    // strong sideways head movement = the 3D-photo parallax effect
    camera.position.set(look.slide * 0.7, look.pitch * 0.8, 0.45);
    camera.rotation.set(look.pitch, yaw, 0, 'YXZ');
    reveal = Math.min(1, reveal + dt * 0.9);
    const e = 1 - Math.pow(1 - reveal, 3);
    panels.forEach(p => { p.material.uniforms.uReveal.value = e; });
    lens.uniforms.uK.value = 0.32 + (drag ? 0.04 : 0) * 1;
    lens.uniforms.uTime.value = t;
    sparkles.update(t);
    composer.render(dt);
    placeSpots();
    // which view are we closer to?
    container.dispatchEvent(new CustomEvent('suiteview', { detail: look.slide < 0 ? 0 : 1 }));
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
    YAW_MAX = Math.max(0.06, 2 * HALF - hf / 2 * 0.86);
    YAW_MIN = -YAW_MAX;
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
