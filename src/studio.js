// Salon Sang 3D Nail Studio
// three.js physical materials + custom shaders (magnetic cat-eye, glitter flakes),
// real brush-stroke painting into per-nail textures, 3D crystals, GPU sparkles and bloom.
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sparkles } from '@pmndrs/vanilla/core/Sparkles.js';
import { MeshTransmissionMaterial } from '@pmndrs/vanilla/materials/MeshTransmissionMaterial.js';
import { design, emit, onDesign, ACCENT, FINGER_NAMES } from './state.js';

const TEX = 512;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createStudio(container, { onReady, onTip } = {}) {
  // ---------- renderer ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const isPhone = Math.min(innerWidth, innerHeight) < 600;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 2 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'studio-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const BLUSH = new THREE.Color('#f7dfe6');
  scene.background = BLUSH.clone();
  scene.fog = new THREE.Fog(BLUSH, 11, 20);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camTarget = new THREE.Vector3(0.3, 0.4, -1.4);

  // lighting: CC0 Poly Haven studio HDRI for reflections + soft window key
  const pmrem = new THREE.PMREMGenerator(renderer);
  new HDRLoader().load(new URL('../../assets/studio_small_09_1k.hdr', import.meta.url).href, hdr => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.85;
    scene.environmentRotation = new THREE.Euler(0, 2.2, 0);
    hdr.dispose();
  });
  const key = new THREE.DirectionalLight('#fff1e6', 1.25); key.position.set(-4, 9, 4); scene.add(key);
  const fill = new THREE.DirectionalLight('#ffd6e6', 0.35); fill.position.set(5, 3, 6); scene.add(fill);

  // sparkles floating above the fur
  const sparkles = new Sparkles({ count: isPhone ? 60 : 110, scale: [12, 3, 8], size: 3.2, speed: 0.22, opacity: 0.85, color: '#fff0f6', noise: 1 });
  sparkles.position.set(0, 1.6, -1.2);
  sparkles.setPixelRatio(renderer.getPixelRatio());
  scene.add(sparkles);

  // ---------- shared uniforms ----------
  const shared = {
    uTime: { value: 0 },
    uMagDir: { value: new THREE.Vector2(0.35, 1).normalize() },
    uMagOff: { value: 0 }
  };

  // ---------- white faux fur (shell-textured, like Sang's photo set) ----------
  const FUR_W = 20, FUR_D = 24, SHELLS = isPhone ? 18 : 26;
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 512; shadowCanvas.height = 384;
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const furGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(FUR_W, FUR_D, 1, 1).rotateX(-Math.PI / 2));
  furGeo.instanceCount = SHELLS;
  furGeo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(new Float32Array([...Array(SHELLS)].map((_, k) => k / (SHELLS - 1))), 1));
  const furMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLen: { value: 0.42 }, uShadow: { value: shadowTex }, uFog: { value: BLUSH }, uFogNear: { value: 11 }, uFogFar: { value: 20 }, uSize: { value: new THREE.Vector2(FUR_W, FUR_D) } },
    vertexShader: `
      attribute float aLayer; uniform float uLen; uniform float uTime;
      varying vec2 vUv; varying float vL; varying vec3 vW; varying float vDepth;
      void main(){
        vUv = uv; vL = aLayer;
        vec3 p = position; p.y += aLayer * uLen;
        float k = aLayer * aLayer;
        p.x += k * (0.16 + 0.05 * sin(uTime * 0.7 + p.z * 0.8 + p.x * 0.4));
        p.z += k * 0.05 * cos(uTime * 0.6 + p.x * 0.9);
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uShadow; uniform vec3 uFog; uniform vec2 uSize; uniform float uFogNear; uniform float uFogFar;
      varying vec2 vUv; varying float vL; varying vec3 vW; varying float vDepth;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec2 st = vUv * uSize * 15.0;
        vec2 id = floor(st); vec2 f = fract(st) - 0.5;
        float clump = h21(floor(st / 5.0));
        float h = mix(0.45, 1.0, h21(id)) * mix(0.8, 1.0, clump);
        float r = 0.62 * (1.0 - vL / h);
        if (vL > 0.02 && (vL > h || length(f) > r)) discard;
        float ao = mix(0.5, 1.08, pow(vL, 0.55));
        vec3 col = vec3(1.0, 0.975, 0.965) * ao;
        col = mix(col, col * vec3(1.0, 0.93, 0.95), 0.25 * (1.0 - vL));
        vec2 suv = vec2(vW.x / uSize.x + 0.5, 0.5 - vW.z / uSize.y);
        float sh = texture2D(uShadow, suv).r;
        col *= mix(1.0, 0.5, sh * (1.0 - 0.55 * vL));
        float fog = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      }`
  });
  const fur = new THREE.Mesh(furGeo, furMat);
  fur.frustumCulled = false;
  scene.add(fur);

  // ---------- Sang's sunflower business card ----------
  const card = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 584;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const draw = () => {
      const g = c.getContext('2d');
      g.fillStyle = '#fbf8f4'; g.fillRect(0, 0, 1024, 584);
      const paper = g.createLinearGradient(0, 0, 1024, 584); paper.addColorStop(0, 'rgba(255,255,255,.6)'); paper.addColorStop(1, 'rgba(232,222,214,.5)');
      g.fillStyle = paper; g.fillRect(0, 0, 1024, 584);
      // sunflower bleeding off the left edge
      g.save(); g.translate(70, 400);
      for (let ring = 0; ring < 2; ring++) for (let p = 0; p < 22; p++) {
        g.save(); g.rotate(p / 22 * Math.PI * 2 + ring * 0.14);
        const L = ring ? 250 : 280;
        const pg = g.createLinearGradient(0, 0, 0, -L); pg.addColorStop(0, '#c9700c'); pg.addColorStop(0.45, '#f2a91a'); pg.addColorStop(1, '#ffd34a');
        g.fillStyle = pg; g.beginPath(); g.ellipse(0, -L * 0.58, 34, L * 0.46, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      const cg = g.createRadialGradient(-10, -10, 10, 0, 0, 120); cg.addColorStop(0, '#5a3214'); cg.addColorStop(1, '#2c170a');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(214,150,60,.55)';
      for (let k = 0; k < 220; k++) { const a = k * 2.399, r = Math.sqrt(k) * 7.6; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 3.2, 0, 7); g.fill(); }
      g.restore();
      g.fillStyle = '#7b2d1e'; g.textAlign = 'center';
      g.font = '104px "Great Vibes", cursive'; g.fillText('Sang Whitewolf', 640, 190);
      g.strokeStyle = '#7b2d1e'; g.lineWidth = 2; g.beginPath(); g.moveTo(410, 250); g.lineTo(500, 250); g.moveTo(780, 250); g.lineTo(870, 250); g.stroke();
      g.font = '600 34px "Cormorant Garamond", serif'; g.fillText('N A I L   A R T I S T', 640, 262);
      g.font = '500 44px "Cormorant Garamond", serif'; g.fillText('530-648-4977', 640, 370); g.fillText('sang.nails@proton.me', 640, 432);
      g.beginPath(); g.arc(640, 492, 6, 0, 7); g.fill(); g.beginPath(); g.moveTo(540, 492); g.lineTo(620, 492); g.moveTo(660, 492); g.lineTo(740, 492); g.stroke();
      tex.needsUpdate = true;
    };
    draw(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw);
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 1.71), [
      new THREE.MeshStandardMaterial({ color: '#efe7df', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#efe7df', roughness: .8 }),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 }), new THREE.MeshStandardMaterial({ color: '#efe7df' }),
      new THREE.MeshStandardMaterial({ color: '#efe7df', roughness: .8 }), new THREE.MeshStandardMaterial({ color: '#efe7df', roughness: .8 })
    ]);
    m.position.set(4.1, 0.4, 2.3); m.rotation.y = 0.42;
    scene.add(m);
    return m;
  })();

  // ---------- hand ----------
  const rig = new THREE.Group(); scene.add(rig);
  const hand = new THREE.Group();
  hand.rotation.x = -Math.PI / 2 + 0.1; // lay the hand flat, nails up
  hand.position.set(-0.35, 0.5, 0.2);
  rig.add(hand);
  const skin = new THREE.MeshPhysicalMaterial({
    color: design.tone, roughness: 0.48, sheen: 0.55, sheenColor: new THREE.Color('#ffd2c6'), sheenRoughness: 0.5,
    clearcoat: 0.08, clearcoatRoughness: 0.6
  });
  // fingers are lathed with a soft knuckle and a tapered, rounded tip
  function fingerGeo(R, len) {
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, y = -len + t * len;
      const knuckle = Math.exp(-Math.pow((t - 0.42) / 0.09, 2)) * 0.05 + Math.exp(-Math.pow((t - 0.78) / 0.07, 2)) * 0.025;
      pts.push(new THREE.Vector2(R * (1.03 - 0.1 * t + knuckle), y));
    }
    for (let k = 1; k <= 16; k++) { const a = k / 16 * Math.PI / 2; pts.push(new THREE.Vector2(R * 0.93 * Math.cos(a), R * 0.93 * Math.sin(a) * 1.08)); }
    const g = new THREE.LatheGeometry(pts, 56);
    return g;
  }
  const FINGERS = [
    { x: -2.0, tip: 0.55, R: 0.40, rz: 0.17, ry: 0.0, len: 3.4 },
    { x: -1.0, tip: 1.35, R: 0.465, rz: 0.06, ry: 0.0, len: 4.2 },
    { x: 0.05, tip: 1.7, R: 0.49, rz: -0.01, ry: 0, len: 4.5 },
    { x: 1.1, tip: 1.32, R: 0.465, rz: -0.09, ry: 0, len: 4.2 },
    { x: 2.35, tip: -1.2, R: 0.54, rz: -0.95, ry: -0.9, len: 2.6 }
  ];
  const nails = [];
  FINGERS.forEach((f, i) => {
    const pivot = new THREE.Group();
    const baseY = f.tip - f.len - f.R;
    pivot.position.set(f.x, baseY, i === 4 ? 0.1 : 0);
    pivot.rotation.set(0, f.ry, f.rz);
    hand.add(pivot);
    const finger = new THREE.Mesh(fingerGeo(f.R, f.len), skin);
    finger.position.y = f.len;     // tip sits at local y = len + R*0.93
    finger.scale.set(1.04, 1, 0.8);
    pivot.add(finger);
    const tipY = f.len + f.R * 0.93;
    const nailGroup = new THREE.Group();
    nailGroup.position.set(0, tipY - f.R * 1.95, f.R * 0.8 * 0.99);
    pivot.add(nailGroup);
    const paint = makeCanvas(); const art = makeCanvas(); const metal = makeCanvas();
    const mat = makeNailMaterial(paint.tex, art.tex, metal.tex);
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.userData.index = i;
    nailGroup.add(mesh);
    const gems = new THREE.Group(); nailGroup.add(gems);
    nails.push({ f, pivot, finger, group: nailGroup, mesh, mat, paint, art, metal, gems, baseZ: f.R * 0.8 * 0.99 });
  });
  // back of the hand
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), skin);
  palm.scale.set(2.45, 2.35, 0.5);
  palm.position.set(0.1, -3.7, -0.12);
  hand.add(palm);
  const thumbBase = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), skin);
  thumbBase.scale.set(0.85, 1.4, 0.5); thumbBase.position.set(1.95, -3.9, -0.05); thumbBase.rotation.z = -0.8;
  hand.add(thumbBase);

  // soft contact shadow under the hand and card, painted into the fur
  function drawShadows() {
    rig.updateMatrixWorld(true);
    const g = shadowCanvas.getContext('2d');
    g.clearRect(0, 0, 512, 384); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 384);
    const toPx = v => [(v.x / FUR_W + 0.5) * 512, (v.z / FUR_D + 0.5) * 384];
    const blob = (v, r, a) => {
      const [x, y] = toPx(v), rp = r / FUR_W * 512;
      const rg = g.createRadialGradient(x, y, 0, x, y, rp); rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, rp, 0, 7); g.fill();
    };
    nails.forEach(n => {
      for (let t = 0; t <= 1.001; t += 0.08) {
        const v = new THREE.Vector3(0, n.f.len * t + (t === 1 ? n.f.R * 0.6 : 0), 0).applyMatrix4(n.pivot.matrixWorld);
        blob(v, n.f.R * 1.9, 0.22);
      }
    });
    for (let k = 0; k < 9; k++) blob(new THREE.Vector3((k % 3 - 1) * 0.6, (Math.floor(k / 3) - 1) * 0.6, 0).applyMatrix4(palm.matrixWorld), 1.9, 0.24);
    card.updateMatrixWorld();
    for (let x = -1.3; x <= 1.31; x += 0.4) for (let z = -0.7; z <= 0.71; z += 0.35) blob(new THREE.Vector3(x, 0, z).applyMatrix4(card.matrixWorld), 0.6, 0.18);
    shadowTex.needsUpdate = true;
  }

  function makeCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { c, ctx, tex };
  }

  // ---------- nail geometry ----------
  const SHAPE_LEN = { square: 1.3, round: 1.32, almond: 1.72, coffin: 1.9, stiletto: 2.1 };
  function outline(shape, w) {
    const a = w / 2, L = SHAPE_LEN[shape] * w, s = new THREE.Shape();
    s.moveTo(-a, 0.24 * w);
    s.bezierCurveTo(-a, -0.05 * w, a, -0.05 * w, a, 0.24 * w);
    switch (shape) {
      case 'square':
        s.lineTo(a, L - 0.1 * w); s.quadraticCurveTo(a, L, a - 0.1 * w, L);
        s.lineTo(-a + 0.1 * w, L); s.quadraticCurveTo(-a, L, -a, L - 0.1 * w); break;
      case 'round':
        s.lineTo(a, L - 0.42 * w); s.bezierCurveTo(a, L - 0.08 * w, 0.45 * a, L, 0, L);
        s.bezierCurveTo(-0.45 * a, L, -a, L - 0.08 * w, -a, L - 0.42 * w); break;
      case 'almond':
        s.lineTo(a, L * 0.5); s.bezierCurveTo(a, L * 0.8, 0.3 * a, L * 0.97, 0, L);
        s.bezierCurveTo(-0.3 * a, L * 0.97, -a, L * 0.8, -a, L * 0.5); break;
      case 'coffin':
        s.lineTo(a, L * 0.5); s.lineTo(0.48 * a, L - 0.05 * w); s.quadraticCurveTo(0.44 * a, L, 0.36 * a, L);
        s.lineTo(-0.36 * a, L); s.quadraticCurveTo(-0.44 * a, L, -0.48 * a, L - 0.05 * w); s.lineTo(-a, L * 0.5); break;
      default: // stiletto
        s.lineTo(a, L * 0.4); s.bezierCurveTo(a, L * 0.7, 0.07 * a, L * 0.95, 0, L);
        s.bezierCurveTo(-0.07 * a, L * 0.95, -a, L * 0.7, -a, L * 0.4);
    }
    s.lineTo(-a, 0.24 * w);
    return { shape: s, L };
  }

  function buildNail(shape, w, R) {
    const { shape: s, L } = outline(shape, w);
    const N = 160, M = 16, E = 8, h = 0.032;
    const P = s.getSpacedPoints(N).slice(0, N);
    const C = new THREE.Vector2(0, L * 0.4);
    const tipStart = R * 1.85; // where the fingertip ends under the nail
    const bend = (x, y) => {
      let z = -(R - Math.sqrt(Math.max(R * R - x * x, 1e-4))) * 0.92;
      if (y > tipStart) { const t = (y - tipStart) / w; z -= 0.07 * t * t; }
      if (y < 0.18 * w) z -= 0.025 * (1 - y / (0.18 * w));
      return z;
    };
    const nrm = P.map((p, k) => {
      const a = P[(k + N - 1) % N], b = P[(k + 1) % N];
      const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
      if (n.dot(p.clone().sub(C)) < 0) n.negate();
      return n;
    });
    const rows = [];
    for (let j = 0; j <= M; j++) { const r = Math.pow(j / M, 0.85); rows.push(P.map(p => { const q = C.clone().lerp(p, r); return [q.x, q.y, h + bend(q.x, q.y)]; })); }
    for (let e = 1; e < E; e++) { const a = Math.PI * e / E; rows.push(P.map((p, k) => { const q = p.clone().addScaledVector(nrm[k], h * Math.sin(a)); return [q.x, q.y, bend(p.x, p.y) + h * Math.cos(a)]; })); }
    for (let j = M; j >= 0; j--) { const r = Math.pow(j / M, 0.85); rows.push(P.map(p => { const q = C.clone().lerp(p, r); return [q.x, q.y, -h + bend(q.x, q.y)]; })); }
    const pos = [], uv = [], idx = [];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    rows.forEach(row => row.forEach(([x, y, z]) => { pos.push(x, y, z); uv.push((x - minX) / (maxX - minX), (y - minY) / (maxY - minY)); }));
    for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < N; k++) {
      const a = r * N + k, b = r * N + (k + 1) % N, c = (r + 1) * N + k, d = (r + 1) * N + (k + 1) % N;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // make sure the front surface faces the camera
    const nz = g.attributes.normal.getZ(N * Math.floor(M / 2));
    if (nz < 0) { const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; } g.computeVertexNormals(); }
    g.userData = { minX, maxX, minY, maxY, L, w, h, bend };
    return g;
  }

  function surface(nail, u, v) {
    const d = nail.mesh.geometry.userData;
    const x = d.minX + u * (d.maxX - d.minX), y = d.minY + v * (d.maxY - d.minY);
    const z = d.h + d.bend(x, y);
    const e = 0.01;
    const n = new THREE.Vector3(-(d.bend(x + e, y) - d.bend(x - e, y)) / (2 * e), -(d.bend(x, y + e) - d.bend(x, y - e)) / (2 * e), 1).normalize();
    return { p: new THREE.Vector3(x, y, z), n };
  }

  // ---------- nail material with custom shading ----------
  function makeNailMaterial(paintTex, artTex, metalTex) {
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.15 });
    m.defines = { USE_UV: '' };
    const u = {
      uPaint: { value: paintTex }, uArt: { value: artTex }, uMetal: { value: metalTex },
      uBare: { value: new THREE.Color('#f0cdc4') }, ...shared
    };
    m.userData.u = u;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uPaint; uniform sampler2D uArt; uniform sampler2D uMetal; uniform vec3 uBare;
          uniform float uTime; uniform vec2 uMagDir; uniform float uMagOff;
          float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
          float gPaint; vec4 gP; float gGold;`)
        .replace('#include <map_fragment>', `
          gP = texture2D(uPaint, vUv);
          vec4 art = texture2D(uArt, vUv);
          vec4 met = texture2D(uMetal, vUv);
          vec3 bare = mix(uBare, vec3(0.98, 0.94, 0.9), smoothstep(0.84, 0.97, vUv.y) * 0.8);
          gPaint = gP.a;
          vec3 col = mix(bare, gP.rgb, gP.a);
          #ifdef CHROME
            col = mix(col, vec3(1.0), 0.22 * gP.a);
          #endif
          #ifdef MATTE
            col *= mix(1.0, 0.93, gP.a);
          #endif
          col = mix(col, art.rgb, art.a);
          gGold = met.a;
          col = mix(col, met.rgb, met.a);
          diffuseColor.rgb = col;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.18, gGold);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 1.0, gGold);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          #ifdef CATEYE
          {
            vec2 q = vUv - 0.5;
            float d = dot(q, uMagDir) - uMagOff;
            float band = exp(-d * d * 38.0);
            float grain = h21(floor(vUv * vec2(240.0, 400.0)));
            vec3 glow = mix(gP.rgb, vec3(1.0), 0.5);
            totalEmissiveRadiance += glow * band * (0.35 + 1.1 * grain) * gPaint * 0.9;
            diffuseColor.rgb *= mix(1.0, mix(0.38, 1.0, band), gPaint);
          }
          #endif
          #ifdef GLITTER
          {
            vec2 cell = floor(vUv * vec2(70.0, 120.0));
            float r1 = h21(cell);
            vec3 rn = vec3(h21(cell + 1.3), h21(cell + 7.1), h21(cell + 3.7)) - 0.5;
            vec3 fn = normalize(normal + rn * 1.8);
            vec3 V = normalize(vViewPosition);
            vec3 L = normalize(vec3(0.35 + 0.35 * sin(uTime * 0.9), 0.75, 0.55));
            vec3 H = normalize(L + V);
            float sp = pow(max(dot(fn, H), 0.0), 70.0) * step(0.35, r1);
            vec3 fc = mix(vec3(1.0, 0.86, 0.6), vec3(1.0, 0.75, 0.9), h21(cell + 9.0));
            fc = mix(fc, vec3(1.0), 0.4);
            totalEmissiveRadiance += fc * sp * 7.0 * gPaint;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.8 + 0.4 * r1), gPaint);
          }
          #endif
          totalEmissiveRadiance += met.rgb * gGold * 0.08;`);
    };
    return m;
  }

  function applyFinish() {
    const f = design.finish;
    nails.forEach(n => {
      const m = n.mat;
      m.defines = { USE_UV: '' };
      Object.assign(m, { roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0, transmission: 0, sheen: 0, thickness: 0 });
      if (f === 'cateye') { m.defines.CATEYE = ''; m.roughness = 0.22; m.metalness = 0.12; }
      if (f === 'chrome') { m.defines.CHROME = ''; Object.assign(m, { metalness: 0.3, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.85 }); m.iridescenceThicknessMinimum = 220; m.iridescenceThicknessMaximum = 680; }
      if (f === 'glitter') { m.defines.GLITTER = ''; m.roughness = 0.28; m.metalness = 0.2; }
      if (f === 'jelly') { Object.assign(m, { transmission: 0.62, thickness: 0.5, ior: 1.5, roughness: 0.04 }); }
      if (f === 'matte') { m.defines.MATTE = ''; Object.assign(m, { roughness: 0.62, clearcoat: 0, sheen: 0.6, sheenRoughness: 0.45 }); m.sheenColor = new THREE.Color('#ffffff'); }
      m.needsUpdate = true;
    });
  }

  // ---------- painting ----------
  function texPos(nail, u, v) { return [u * TEX, (1 - v) * TEX]; }
  function aspect(nail) { const d = nail.mesh.geometry.userData; return (d.maxX - d.minX) / (d.maxY - d.minY); }
  function stamp(nail, u, v, hex, radius) {
    const ctx = nail.paint.ctx; const [x, y] = texPos(nail, u, v);
    const ry = radius * TEX, rx = ry / aspect(nail) * aspect(nail) ; // radius in u space
    ctx.save(); ctx.translate(x, y); ctx.scale(1, aspect(nail));
    ctx.fillStyle = hex;
    // a polish brush leaves a flat, slightly streaky stroke
    ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.25;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc((Math.random() - .5) * rx * 1.4, (Math.random() - .5) * rx * 0.6, rx * 0.55, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    nail.paint.tex.needsUpdate = true;
  }
  function strokeTo(nail, from, to, hex, radius) {
    const dx = to[0] - from[0], dy = (to[1] - from[1]) / aspect(nail);
    const dist = Math.hypot(dx, dy), steps = Math.max(1, Math.ceil(dist / (radius * 0.3)));
    for (let s = 1; s <= steps; s++) { const t = s / steps; stamp(nail, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, hex, radius); }
  }
  function pushName(i, name, replace) {
    const list = design.nailColors[i];
    if (replace) list.length = 0;
    if (list[list.length - 1] !== name) { list.push(name); if (list.length > 3) list.shift(); }
  }
  const recordColor = i => pushName(i, design.color[0]);

  // ---------- nail art ----------
  function drawArt(i) {
    const n = nails[i], A = n.art.ctx, G = n.metal.ctx;
    A.clearRect(0, 0, TEX, TEX); G.clearRect(0, 0, TEX, TEX);
    n.gems.clear();
    const kind = design.art;
    const accent = i === ACCENT;
    const asp = aspect(n);
    const base = design.nailColors[i].length ? design.color[1] : '#f0cdc4';
    const light = lum(paintColorAt(i)) > 0.6;
    const S = TEX;
    const ell = (ctx, cx, cy, fn) => { ctx.save(); ctx.translate(cx * S, (1 - cy) * S); ctx.scale(1, asp); fn(ctx); ctx.restore(); };
    if (kind === 'french') {
      A.fillStyle = '#fbf8f3';
      A.beginPath(); A.moveTo(0, 0); A.lineTo(S, 0); A.lineTo(S, S * 0.3); A.quadraticCurveTo(S / 2, S * 0.48, 0, S * 0.3); A.closePath(); A.fill();
    }
    if (!accent || kind === 'none' || kind === 'french') { n.art.tex.needsUpdate = n.metal.tex.needsUpdate = true; return; }
    const R = S * 0.4; // drawing radius in u-space pixels
    if (kind === 'daisy' || kind === 'sunflower') {
      ell(A, 0.5, 0.5, c => {
        const petals = kind === 'daisy' ? 9 : 14, pl = R * (kind === 'daisy' ? 0.62 : 0.6), pw = R * (kind === 'daisy' ? 0.2 : 0.15);
        for (let p = 0; p < petals; p++) {
          c.save(); c.rotate(p / petals * Math.PI * 2);
          const g = c.createLinearGradient(0, 0, 0, -pl);
          if (kind === 'daisy') { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fff6fa'); } else { g.addColorStop(0, '#e38a0e'); g.addColorStop(1, '#ffd23f'); }
          c.fillStyle = g; c.beginPath(); c.ellipse(0, -pl * 0.55, pw, pl * 0.5, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; c.stroke();
          c.restore();
        }
        const cg = c.createRadialGradient(-R * .05, -R * .05, 2, 0, 0, R * (kind === 'daisy' ? 0.2 : 0.3));
        if (kind === 'daisy') { cg.addColorStop(0, '#ffe680'); cg.addColorStop(1, '#f1a805'); } else { cg.addColorStop(0, '#7a4a22'); cg.addColorStop(1, '#3d220e'); }
        c.fillStyle = cg; c.beginPath(); c.arc(0, 0, R * (kind === 'daisy' ? 0.18 : 0.28), 0, Math.PI * 2); c.fill();
      });
    } else if (kind === 'starfish') {
      ell(A, 0.5, 0.48, c => {
        c.rotate(0.2); c.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? R * 0.28 : R * 0.72, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); const g = c.createRadialGradient(0, 0, 4, 0, 0, R * 0.7); g.addColorStop(0, '#ffc15a'); g.addColorStop(1, '#e8851f');
        c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.strokeStyle = '#c96a16'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#fff4dc';
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; for (let t = 1; t <= 3; t++) { c.beginPath(); c.arc(Math.cos(a) * R * 0.17 * t, Math.sin(a) * R * 0.17 * t, 3.2, 0, 7); c.fill(); } }
      });
    } else if (kind === 'dots') {
      A.fillStyle = light ? '#18181c' : '#ffffff';
      for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) {
        const u = (c + (r % 2) * 0.5 + 0.25) / 5.5, v = (r + 0.4) / 8.5;
        ell(A, u, v, x => { x.beginPath(); x.arc(0, 0, S * 0.045, 0, 7); x.fill(); });
      }
    } else if (kind === 'heart') {
      ell(A, 0.5, 0.48, c => {
        const s = R * 0.022; c.scale(s, s); c.beginPath();
        c.moveTo(0, 12); c.bezierCurveTo(-18, 0, -14, -14, -5, -14); c.bezierCurveTo(-1, -14, 0, -10, 0, -8);
        c.bezierCurveTo(0, -10, 1, -14, 5, -14); c.bezierCurveTo(14, -14, 18, 0, 0, 12); c.closePath();
        c.fillStyle = light ? '#d4157a' : '#ffffff'; c.fill();
      });
      ell(G, 0.5, 0.48, c => { c.strokeStyle = '#d8b25a'; c.lineWidth = 5; const s = R * 0.022; c.scale(s, s); c.lineWidth = 5 / s; c.beginPath();
        c.moveTo(0, 12); c.bezierCurveTo(-18, 0, -14, -14, -5, -14); c.bezierCurveTo(-1, -14, 0, -10, 0, -8);
        c.bezierCurveTo(0, -10, 1, -14, 5, -14); c.bezierCurveTo(14, -14, 18, 0, 0, 12); c.stroke(); });
    } else if (kind === 'swirl') {
      G.strokeStyle = '#e1bd63'; G.lineCap = 'round';
      const path = [[0.15, 0.05], [0.7, 0.3], [0.25, 0.55], [0.8, 0.8], [0.45, 1.0]];
      G.save(); G.scale(1, 1);
      G.lineWidth = S * 0.035; G.beginPath();
      G.moveTo(path[0][0] * S, (1 - path[0][1]) * S);
      for (let k = 1; k < path.length; k++) { const p0 = path[k - 1], p1 = path[k]; G.quadraticCurveTo(p0[0] * S + (k % 2 ? 1 : -1) * S * 0.35, (1 - (p0[1] + p1[1]) / 2) * S, p1[0] * S, (1 - p1[1]) * S); }
      G.stroke(); G.lineWidth = S * 0.015; G.globalAlpha = 0.8; G.translate(S * 0.06, 0); G.stroke(); G.restore();
      for (let k = 0; k < 14; k++) { G.beginPath(); G.arc(Math.random() * S, Math.random() * S, 2 + Math.random() * 5, 0, 7); G.fillStyle = '#e8c878'; G.fill(); }
    } else if (kind === 'gems') {
      addGem(n, 0.5, 0.24, 0.19);
      addGem(n, 0.24, 0.16, 0.1); addGem(n, 0.76, 0.16, 0.1);
      addGem(n, 0.5, 0.45, 0.085); addGem(n, 0.5, 0.6, 0.06);
      ell(G, 0.5, 0.24, c => { c.strokeStyle = '#d9b45c'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, S * 0.2, 0, 7); c.stroke(); });
    }
    n.art.tex.needsUpdate = n.metal.tex.needsUpdate = true;
  }

  const gemGeo = (() => {
    const pts = [new THREE.Vector2(0, -0.55), new THREE.Vector2(1, 0), new THREE.Vector2(0.92, 0.12), new THREE.Vector2(0.55, 0.3), new THREE.Vector2(0, 0.3)];
    const g = new THREE.LatheGeometry(pts, 10); g.rotateX(Math.PI / 2); return g.toNonIndexed();
  })();
  gemGeo.computeVertexNormals();
  const gemMat = new MeshTransmissionMaterial({ transmissionSampler: true, chromaticAberration: 0.9, transmission: 1, roughness: 0, thickness: 0.4, anisotropicBlur: 0.05, distortion: 0, distortionScale: 0, temporalDistortion: 0 });
  Object.assign(gemMat, { ior: 2.2, color: new THREE.Color('#ffffff'), iridescence: 0.7, iridescenceIOR: 1.6, flatShading: true, envMapIntensity: 2.2, specularIntensity: 1, clearcoat: 1 });
  function addGem(n, u, v, size) {
    const { p, nrm } = (() => { const s = surface(n, u, v); return { p: s.p, nrm: s.n }; })();
    const g = new THREE.Mesh(gemGeo, gemMat);
    const sc = size * (n.mesh.geometry.userData.w);
    g.scale.setScalar(sc * 3.2);
    g.position.copy(p).addScaledVector(nrm, sc * 0.9);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    g.rotateZ(Math.random() * Math.PI);
    n.gems.add(g);
  }

  function lum(hex) { const c = new THREE.Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }
  function paintColorAt(i) {
    const names = design.nailColors[i];
    return names.length ? (nails[i].lastHex || design.color[1]) : '#f0cdc4';
  }

  function rebuild() {
    nails.forEach(n => {
      const w = n.f.R * 1.28;
      n.mesh.geometry.dispose();
      n.mesh.geometry = buildNail(design.shape, w, n.f.R * 0.82);
    });
    nails.forEach((_, i) => drawArt(i));
  }

  // ---------- the polish brush ----------
  const brush = new THREE.Group();
  const capMat = new THREE.MeshPhysicalMaterial({ color: '#0c0c0e', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0, envMapIntensity: 0.35 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#e6c27a', roughness: 0.22, metalness: 1 });
  const bristleMat = new THREE.MeshPhysicalMaterial({ color: design.color[1], roughness: 0.15, clearcoat: 1 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 1.5, 32), capMat); cap.position.y = 1.42;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 32), goldMat); ring.position.y = 0.66;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 12), goldMat); stem.position.y = 0.38;
  const bristles = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.03, 0.26, 24), bristleMat); bristles.position.y = 0.12; bristles.scale.z = 0.45;
  brush.add(cap, ring, stem, bristles);
  brush.scale.setScalar(0.85);
  brush.visible = false;
  scene.add(brush);
  const brushTarget = new THREE.Vector3(), brushNormal = new THREE.Vector3(0, 0, 1);
  function placeBrush(worldPoint, worldNormal) {
    brushTarget.copy(worldPoint).addScaledVector(worldNormal, 0.02);
    brushNormal.copy(worldNormal);
  }
  function updateBrush(dt) {
    if (!brush.visible) return;
    brush.position.lerp(brushTarget, 1 - Math.pow(0.0001, dt));
    const up = brushNormal.clone().multiplyScalar(0.5).add(new THREE.Vector3(0.62, 0, 0.6)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    brush.quaternion.slerp(q, 1 - Math.pow(0.001, dt));
  }

  // ---------- auto painting (brush sweeps the nail in three strokes) ----------
  const queue = [];
  let job = null;
  function autoPaint(indices, hex) {
    indices.forEach(i => { design.nailColors[i] = []; queue.push({ i, hex, t: 0 }); });
  }
  const STROKES = [[0.5, -0.05, 0.5, 1.05], [0.22, 0.0, 0.2, 1.02], [0.78, 0.0, 0.8, 1.02]];
  function runJobs(dt) {
    if (!job && queue.length) { job = queue.shift(); job.last = null; job.s = 0; nails[job.i].lastHex = job.hex; pushName(job.i, job.name || design.color[0]); }
    if (!job) return false;
    const n = nails[job.i];
    const speed = reduceMotion ? 50 : 3.6;
    job.t += dt * speed;
    while (job.t >= 1 && job.s < STROKES.length) { finishStroke(); }
    if (job.s >= STROKES.length) { done(); return true; }
    const [u0, v0, u1, v1] = STROKES[job.s];
    const u = u0 + (u1 - u0) * job.t, v = v0 + (v1 - v0) * easeInOut(job.t);
    const r = 0.17;
    if (job.last) strokeTo(n, job.last, [u, v], job.hex, r); else stamp(n, u, v, job.hex, r);
    job.last = [u, v];
    const s = surface(n, Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
    n.mesh.updateWorldMatrix(true, false);
    placeBrush(s.p.clone().applyMatrix4(n.mesh.matrixWorld), s.n.clone().transformDirection(n.mesh.matrixWorld));
    brush.visible = true;
    return true;
    function finishStroke() {
      const [a0, b0, a1, b1] = STROKES[job.s];
      strokeTo(n, job.last || [a0, b0], [a1, b1], job.hex, r0());
      job.s++; job.t -= 1; job.last = null;
    }
    function done() {
      // flood any tiny gaps so the coat looks finished
      const ctx = n.paint.ctx; ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = job.hex; ctx.fillRect(0, 0, TEX, TEX); ctx.restore();
      n.paint.tex.needsUpdate = true;
      drawArt(job.i);
      pulse(job.i);
      job = null;
      if (!queue.length) { setTimeout(() => { if (!queue.length && !dragging) brush.visible = false; }, 500); emit('painted'); }
    }
  }
  const r0 = () => 0.17;
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // little celebratory lift on the nail
  const pulses = [0, 0, 0, 0, 0];
  function pulse(i) { pulses[i] = 1; }

  // ---------- interaction ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let dragging = null, downAt = null, hovering = false;
  const el = renderer.domElement;
  function hit(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(nails.map(n => n.mesh), false);
    return hits[0] || null;
  }
  el.addEventListener('pointerdown', e => {
    const h = hit(e);
    if (!h) return;
    el.setPointerCapture(e.pointerId);
    const i = h.object.userData.index;
    dragging = { i, last: [h.uv.x, h.uv.y], moved: 0 };
    downAt = [e.clientX, e.clientY];
    nails[i].lastHex = design.color[1]; recordColor(i); design.rainbow = false;
    stamp(nails[i], h.uv.x, h.uv.y, design.color[1], 0.16);
    placeBrush(h.point, h.face.normal.clone().transformDirection(h.object.matrixWorld));
    brush.visible = true;
  });
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    tiltTarget.set(((e.clientX - r.left) / r.width) - 0.5, ((e.clientY - r.top) / r.height) - 0.5);
    magTarget = 0.42 * (((e.clientX - r.left) / r.width) - 0.5) * 2;
    lastMove = performance.now();
    const h = hit(e);
    if (dragging) {
      dragging.moved += Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = [e.clientX, e.clientY];
      if (h && h.object.userData.index === dragging.i) {
        strokeTo(nails[dragging.i], dragging.last, [h.uv.x, h.uv.y], design.color[1], 0.16);
        dragging.last = [h.uv.x, h.uv.y];
        placeBrush(h.point, h.face.normal.clone().transformDirection(h.object.matrixWorld));
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      hovering = !!h;
      if (h && !job) { placeBrush(h.point, h.face.normal.clone().transformDirection(h.object.matrixWorld)); brush.visible = true; }
      else if (!job) brush.visible = false;
      el.style.cursor = h ? 'none' : 'default';
    }
  });
  const end = () => {
    if (!dragging) return;
    const { i, moved } = dragging;
    dragging = null;
    if (moved < 8) autoPaint([i], design.color[1]);
    else { drawArt(i); emit('painted'); onTip && onTip('Gorgeous. Keep brushing, or tap a nail to give it a full coat.'); }
    if (!hovering && !job) setTimeout(() => { if (!job && !dragging) brush.visible = false; }, 400);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', () => { hovering = false; if (!job && !dragging) brush.visible = false; });

  // cat-eye magnet follows your finger, or the tilt of your phone
  let magTarget = 0, lastMove = 0;
  const tiltTarget = new THREE.Vector2(), tilt = new THREE.Vector2();
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    magTarget = Math.max(-0.4, Math.min(0.4, e.gamma / 60));
    tiltTarget.set(e.gamma / 90, (e.beta - 45) / 120);
    lastMove = performance.now();
  });

  // ---------- layout ----------
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // fit the five fingertips in view on narrow phones
    const needW = camera.aspect < 0.8 ? 5.8 : 7.0, needH = 4.9;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const distH = needH / 2 / Math.tan(vfov / 2);
    const distW = needW / 2 / (Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(distH, distW);
    const dir = new THREE.Vector3(0, 0.82, 0.57).normalize();
    camera.position.copy(camTarget).addScaledVector(dir, dist);
    camera.lookAt(camTarget);
    scene.fog.near = dist * 1.05; scene.fog.far = dist * 2.1; furMat.uniforms.uFogNear.value = dist * 1.05; furMat.uniforms.uFogFar.value = dist * 2.1;
    camera.updateProjectionMatrix();
    sparkles.setPixelRatio(renderer.getPixelRatio());
  }

  // ---------- post ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- loop ----------
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; this.elapsedTime += Math.min(d, 0.05); return d; } };
  let running = false, visible = false;
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;
    shared.uTime.value = t;
    // magnet drifts on its own when you aren't touching
    if (performance.now() - lastMove > 2500 && !reduceMotion) { magTarget = Math.sin(t * 0.9) * 0.3; tiltTarget.set(Math.sin(t * 0.35) * 0.12, Math.cos(t * 0.27) * 0.08); }
    shared.uMagOff.value += (magTarget - shared.uMagOff.value) * Math.min(1, dt * 6);
    tilt.lerp(tiltTarget, Math.min(1, dt * 3));
    if (!dragging) { rig.rotation.y = tilt.x * 0.22; rig.rotation.x = tilt.y * 0.05; }
    nails.forEach((n, i) => {
      pulses[i] = Math.max(0, pulses[i] - dt * 1.8);
      const lift = Math.sin(pulses[i] * Math.PI) * 0.06;
      n.group.position.z = n.baseZ + lift;
      n.gems.children.forEach(g => g.rotateOnAxis(new THREE.Vector3(0, 0, 1), dt * 0.4));
    });
    hand.position.y = 0.5 + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.025);
    runJobs(dt);
    updateBrush(dt);
    bristleMat.color.set(design.color[1]);
    sparkles.update(t);
    gemMat.uniforms && (gemMat.uniforms.time.value = t);
    composer.render(dt);
    requestAnimationFrame(frame);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; clock.getDelta(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }, { rootMargin: '100px' }).observe(container);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  new ResizeObserver(resize).observe(container);

  // ---------- public API ----------
  rebuild(); applyFinish(); resize(); drawShadows();
  // first coat so the hand isn't bare
  autoPaint([0, 1, 2, 3, 4], design.color[1]);

  onDesign(what => {
    if (what === 'shape') rebuild();
    if (what === 'finish') applyFinish();
    if (what === 'art') nails.forEach((_, i) => drawArt(i));
    if (what === 'tone') skin.color.set(design.tone);
  });

  onReady && onReady();
  return {
    paintAll(hex) { design.rainbow = false; queue.length = 0; autoPaint([0, 1, 2, 3, 4], hex || design.color[1]); },
    paintSet(list) { design.rainbow = true; queue.length = 0; list.forEach((c, i) => { design.nailColors[i] = []; queue.push({ i, hex: c[1], t: 0, name: c[0] }); }); },
    clear() {
      queue.length = 0; job = null;
      nails.forEach((n, i) => { n.paint.ctx.clearRect(0, 0, TEX, TEX); n.paint.tex.needsUpdate = true; design.nailColors[i] = []; drawArt(i); });
      design.rainbow = false; emit('painted');
    },
    fingerName: i => FINGER_NAMES[i]
  };
}
