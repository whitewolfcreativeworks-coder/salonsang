// Tiny crystal chandelier for the welcome section, like the one in Sang's suite.
// Procedural three.js model: gold chain, baluster stem and six S-curved arms with warm
// candle bulbs, plus draped bead swags, pendalogue drops and a crystal cascade.
// Crystals use a faceted cut-glass shader: Fresnel reflection plus a refracted internal
// bounce sampled per color channel (dispersion, the rainbow "fire" of real lead crystal).
// It sways gently on its chain, twists a little, and facets twinkle with star glints.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createChandelier(holder) {
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return null;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'chand-gl';
  canvas.setAttribute('aria-hidden', 'true');
  holder.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  } catch (e) { canvas.remove(); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);

  // ---------------- materials ----------------
  const gold = new THREE.MeshPhysicalMaterial({
    color: '#d9b877', metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 0.8,
    clearcoat: 0.35, clearcoatRoughness: 0.12
  });
  const goldDark = gold.clone(); goldDark.color.set('#bf9450'); goldDark.roughness = 0.3; goldDark.envMapIntensity = 0.7;
  const candleMat = new THREE.MeshStandardMaterial({ color: '#fff8ef', roughness: 0.55, envMap: env, envMapIntensity: 0.6, emissive: '#ffe2b8', emissiveIntensity: 0.18 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9c4').multiplyScalar(1.6), toneMapped: true });

  const crystalU = { uTime: { value: 0 } };
  const crystal = new THREE.MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, roughness: 0.06, envMap: env, envMapIntensity: 1,
    flatShading: true, specularIntensity: 1, specularColor: new THREE.Color('#ffffff')
  });
  crystal.onBeforeCompile = sh => {
    sh.uniforms.uTime = crystalU.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFacet;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFacet = normal * 7.31;
        #ifdef USE_INSTANCING
          vFacet += instanceMatrix[3].xyz * 13.7;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vFacet;
        uniform float uTime;
        vec3 h3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }`)
      .replace('#include <opaque_fragment>', `
        #ifdef ENVMAP_TYPE_PMREM
        {
          vec3 Vv = normalize(vViewPosition);
          vec3 Nv = normalize(normal);
          vec3 I = transformDirectionByInverseViewMatrix(-Vv, viewMatrix);
          vec3 N = transformDirectionByInverseViewMatrix(Nv, viewMatrix);
          float c = clamp(dot(N, -I), 0.0, 1.0);
          float F = 0.07 + 0.93 * pow(1.0 - c, 5.0);
          vec3 refl = textureLod(envMap, envMapRotation * reflect(I, N), 0.0).rgb;
          // one internal bounce off a back facet (hashed per facet so each cut shows its own piece of the room)
          vec3 Nb = normalize(-N + 1.35 * (h3(floor(vFacet * 10.0)) - 0.5));
          vec3 col;
          for (int k = 0; k < 3; k++) {
            float ior = 1.56 + 0.06 * float(k);            // R, G, B bend a little differently
            vec3 T = refract(I, N, 1.0 / ior);
            vec3 B = reflect(T, Nb);
            vec3 O = refract(B, -Nb, ior);
            if (dot(O, O) < 0.01) O = reflect(B, Nb);           // total internal reflection
            col[k] = textureLod(envMap, envMapRotation * normalize(O), 0.0)[k];
          }
          col *= vec3(0.97, 0.99, 1.04);
          vec3 glass = mix(col, refl, F) * 1.75;
          // dark outline where the glass turns away, like real cut crystal on a light wall
          glass *= mix(0.55, 1.0, smoothstep(0.08, 0.45, c));
          outgoingLight = glass + outgoingLight * 1.4;
        }
        #endif
        #include <opaque_fragment>`);
  };

  // ---------------- geometry helpers ----------------
  const faceted = g => { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; };
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  // octagon bead (bicone)
  const beadG = faceted(lathe([[0, -0.03], [0.03, 0], [0, 0.03]], 8));
  // small round bead
  const pearlG = faceted(new THREE.IcosahedronGeometry(0.024, 0));
  // pendalogue: flat teardrop prism, the classic chandelier drop
  const dropG = (() => {
    const g = lathe([[0, 0], [0.035, -0.045], [0.06, -0.12], [0.052, -0.17], [0.026, -0.205], [0, -0.22]], 8);
    g.scale(1, 1, 0.55); return faceted(g);
  })();
  const dropSmallG = dropG.clone().scale(0.62, 0.62, 0.62);
  // faceted crystal ball
  const ballG = faceted(new THREE.SphereGeometry(0.1, 12, 8));
  // bottom spear
  const spearG = faceted(lathe([[0, 0], [0.06, -0.08], [0.045, -0.16], [0, -0.3]], 8));

  const root = new THREE.Group();            // pivot = ceiling point (y = 0)
  scene.add(root);
  const body = new THREE.Group();            // twists on the chain
  root.add(body);

  const gm = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };

  // canopy + chain
  gm(lathe([[0, 0.02], [0.13, 0.02], [0.12, -0.02], [0.05, -0.06], [0.02, -0.09], [0, -0.09]], 28), gold, root);
  const linkG = new THREE.TorusGeometry(0.028, 0.0075, 8, 18);
  linkG.scale(1, 1.45, 1);
  const LINKS = 7;
  for (let i = 0; i < LINKS; i++) {
    const l = gm(linkG, goldDark, root);
    l.position.y = -0.12 - i * 0.068;
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
  }
  const top = -0.12 - LINKS * 0.068;          // where the chandelier hangs from
  body.position.y = top;

  // stem (baluster), measured down from the hook
  gm(new THREE.TorusGeometry(0.03, 0.009, 8, 18), gold).position.y = -0.02;
  const stemProfile = [
    [0, 0], [0.025, -0.04], [0.045, -0.07], [0.02, -0.1], [0.018, -0.24], [0.05, -0.27], [0.03, -0.3],
    [0.018, -0.33], [0.018, -0.48], [0.06, -0.52], [0.11, -0.56], [0.12, -0.6], [0.085, -0.64],
    [0.04, -0.68], [0.03, -0.74], [0.05, -0.78], [0.02, -0.83], [0, -0.85]
  ];
  gm(lathe(stemProfile, 36), gold).position.y = -0.04;
  const HUB = -0.62;                          // arms leave the stem here
  const BOT = -0.89;

  // crystal ball on the stem
  const balls = [];
  balls.push(new THREE.Vector3(0, -0.205, 0));

  // instanced crystal collectors
  const beadsAt = [], pearlsAt = [], dropsAt = [], smallDropsAt = [];
  const swing = [];                           // drops that swing on their own
  const addDrop = (list, x, y, z, ry) => { const o = { p: new THREE.Vector3(x, y, z), ry, ph: Math.random() * 6.28, a: 0.05 + Math.random() * 0.05 }; list.push(o); swing.push(o); };

  // a strand of beads hanging straight down from (x,y,z); returns the end y
  const strand = (x, y, z, n, endDrop) => {
    let yy = y;
    for (let i = 0; i < n; i++) { (i % 2 ? pearlsAt : beadsAt).push(new THREE.Vector3(x, yy - 0.03, z)); yy -= 0.058; }
    if (endDrop) addDrop(endDrop, x, yy, z, Math.atan2(x, z));
    return yy;
  };
  // a sagging swag of beads between two points
  const swag = (a, b, sag, n) => {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= sag * 4 * t * (1 - t);
      (i % 2 ? beadsAt : pearlsAt).push(p);
    }
  };

  // ---- six S-curved arms with candles ----
  const ARMS = 6, R = 0.86;
  const tips = [];
  const bulbs = [];
  for (let i = 0; i < ARMS; i++) {
    const a = (i / ARMS) * Math.PI * 2 + Math.PI / ARMS;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const P = (r, y) => dir.clone().multiplyScalar(r).setY(y);
    const curve = new THREE.CatmullRomCurve3([
      P(0.06, HUB + 0.02), P(0.3, HUB - 0.07), P(0.6, HUB - 0.08), P(0.8, HUB - 0.01), P(R, HUB + 0.1), P(R, HUB + 0.17)
    ]);
    gm(new THREE.TubeGeometry(curve, 48, 0.019, 10), gold);
    // little decorative curl under each arm
    const curl = new THREE.CatmullRomCurve3([P(0.42, HUB - 0.08), P(0.4, HUB - 0.16), P(0.5, HUB - 0.19), P(0.54, HUB - 0.13), P(0.48, HUB - 0.12)]);
    gm(new THREE.TubeGeometry(curl, 24, 0.009, 6), goldDark);
    // bobeche (drip cup), candle sleeve, flame bulb
    const tip = P(R, HUB + 0.17);
    tips.push(tip);
    const cup = gm(lathe([[0, 0], [0.03, 0], [0.085, 0.03], [0.095, 0.045], [0.07, 0.04], [0.03, 0.03], [0, 0.03]], 24), gold);
    cup.position.copy(tip);
    const sleeve = gm(new THREE.CylinderGeometry(0.019, 0.021, 0.13, 16), candleMat);
    sleeve.position.copy(tip).y += 0.095;
    const bulb = gm(lathe([[0, 0], [0.022, 0.012], [0.03, 0.04], [0.022, 0.075], [0.008, 0.1], [0, 0.11]], 18), bulbMat);
    bulb.position.copy(tip).y += 0.16;
    bulbs.push(bulb);
    // drop hanging under each cup, plus a bead in between
    beadsAt.push(P(R * 1.02, HUB + 0.11).add(new THREE.Vector3(0, -0.005, 0)));
    addDrop(dropsAt, ...P(R * 1.02, HUB + 0.08).toArray(), a);
  }
  // outer swags arm-to-arm and inner swags from the hub ring
  const inner = [];
  for (let i = 0; i < ARMS; i++) {
    const a = tips[i].clone().setY(tips[i].y - 0.075), b = tips[(i + 1) % ARMS].clone().setY(tips[(i + 1) % ARMS].y - 0.075);
    a.multiplyScalar(1.01).setY(tips[i].y - 0.075); b.multiplyScalar(1.01).setY(tips[(i + 1) % ARMS].y - 0.075);
    swag(a, b, 0.21, 12);
    const ang = (i / ARMS) * Math.PI * 2 + Math.PI / ARMS;
    inner.push(new THREE.Vector3(Math.sin(ang) * 0.34, HUB - 0.08, Math.cos(ang) * 0.34));
  }
  for (let i = 0; i < ARMS; i++) {
    const a = inner[i], b = inner[(i + 1) % ARMS];
    swag(a, b, 0.11, 6);
    // short strand with a small drop at the low point between arms
    const mid = new THREE.Vector3().lerpVectors(a, b, 0.5); mid.y -= 0.11;
    strand(mid.x * 1.08, mid.y - 0.01, mid.z * 1.08, 1, smallDropsAt);
  }
  // crown: a ring of little drops around the top of the stem
  gm(new THREE.TorusGeometry(0.16, 0.009, 8, 40).rotateX(Math.PI / 2), gold).position.y = -0.12;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    beadsAt.push(new THREE.Vector3(Math.sin(a) * 0.16, -0.15, Math.cos(a) * 0.16));
    addDrop(smallDropsAt, Math.sin(a) * 0.16, -0.18, Math.cos(a) * 0.16, a);
  }
  // cascade under the bowl: a ring of strands, longer toward the middle
  gm(new THREE.TorusGeometry(0.2, 0.01, 8, 40).rotateX(Math.PI / 2), gold).position.y = HUB - 0.1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    strand(Math.sin(a) * 0.2, HUB - 0.11, Math.cos(a) * 0.2, i % 2 ? 2 : 3, i % 2 ? smallDropsAt : dropsAt);
  }
  // finial: big crystal ball and spear at the very bottom
  balls.push(new THREE.Vector3(0, BOT - 0.13, 0));
  const spear = new THREE.Mesh(spearG, crystal); spear.position.set(0, BOT - 0.23, 0); body.add(spear);

  // build instanced crystals
  const inst = (geo, list, scale = 1, spin = true) => {
    const m = new THREE.InstancedMesh(geo, crystal, list.length);
    const o = new THREE.Object3D();
    list.forEach((p, k) => {
      o.position.copy(p.p || p); o.rotation.set(0, p.ry ?? (spin ? k * 0.7 : 0), 0); o.scale.setScalar(scale);
      o.updateMatrix(); m.setMatrixAt(k, o.matrix);
    });
    body.add(m);
    return m;
  };
  inst(beadG, beadsAt);
  inst(pearlG, pearlsAt);
  inst(ballG, balls);
  const dropMesh = inst(dropG, dropsAt);
  const smallMesh = inst(dropSmallG, smallDropsAt);

  // warm light from the candles onto the gold
  const warm = new THREE.PointLight('#ffd29a', 2.2, 4, 1.6); warm.position.set(0, HUB + 0.35, 0); body.add(warm);
  const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffd9ea', 1.0); rim.position.set(3, 1, -2); scene.add(rim);

  // ---------------- sprites: bulb halos + star glints ----------------
  const spriteTex = draw => { const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const haloTex = spriteTex(g => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(0.18, 'rgba(255,214,150,.55)');
    gr.addColorStop(0.5, 'rgba(255,190,120,.14)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const starTex = spriteTex(g => {
    g.translate(64, 64);
    const ray = (len, w, rot) => {
      g.save(); g.rotate(rot);
      const gr = g.createLinearGradient(-len, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.fill(); g.restore();
    };
    ray(62, 3.2, 0); ray(62, 3.2, Math.PI / 2); ray(30, 1.8, Math.PI / 4); ray(30, 1.8, -Math.PI / 4);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 22);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,240,250,.6)'); gr.addColorStop(1, 'rgba(255,220,240,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill();
  });
  bulbs.forEach(b => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(0.24); s.position.copy(b.position).y += 0.06; body.add(s); b.userData.halo = s;
  });
  const glintPool = [];
  const glintTints = ['#ffffff', '#ffe39a', '#ffb3d6', '#a9d6ff', '#d4b8ff', '#fff6e0'];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, color: glintTints[i % glintTints.length] }));
    s.visible = false; s.userData = { t: 1, life: 0.7, size: 0.2 }; scene.add(s); glintPool.push(s);
  }
  const crystalSpots = [...beadsAt, ...pearlsAt, ...balls, ...dropsAt.map(d => d.p.clone().add(new THREE.Vector3(0, -0.12, 0))), ...smallDropsAt.map(d => d.p.clone().add(new THREE.Vector3(0, -0.07, 0)))];
  const tmpV = new THREE.Vector3();
  const spawnGlint = big => {
    const s = glintPool.find(g => !g.visible); if (!s) return;
    const p = crystalSpots[(Math.random() * crystalSpots.length) | 0];
    tmpV.copy(p); body.localToWorld(tmpV);
    s.position.copy(tmpV);
    s.material.rotation = Math.random() * 0.6 - 0.3;
    s.userData.t = 0; s.userData.life = 0.55 + Math.random() * 0.5; s.userData.size = (big ? 0.36 : 0.2) + Math.random() * 0.14;
    s.visible = true;
  };

  // ---------------- layout ----------------
  // fit the real bounding box: canopy at the very top, a little room around for the sway
  const box = new THREE.Box3().setFromObject(root);
  const highY = box.max.y, lowY = box.min.y - 0.06;
  const H = highY - lowY, W = (box.max.x - box.min.x) + 0.12;
  canvas.style.aspectRatio = (W / H).toFixed(3);
  let w = 1, h = 1;
  function resize() {
    const r = holder.getBoundingClientRect();
    w = Math.max(1, canvas.clientWidth || r.width); h = Math.max(1, canvas.clientHeight || r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const d = Math.max((H / 2) / tv, (W / 2) / (tv * camera.aspect)) + 0.5;   // +depth of the front arms
    const cy = (highY + lowY) / 2;
    camera.position.set(0, cy - d * 0.05, d);     // a touch below, like looking up at a ceiling light
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // ---------------- motion ----------------
  // pendulum on the chain (two axes) + gentle twist, nudged by touch/tilt
  const sw = { x: 0, z: 0, vx: 0, vz: 0, tw: 0, vtw: 0 };
  const impulse = (fx, fz, ft = 0) => { sw.vx += fx; sw.vz += fz; sw.vtw += ft; };
  let lastX = null;
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    impulse(0.05 * (Math.random() - 0.5), -0.22 * Math.sign(dx || 1) * (0.5 + Math.abs(dx)), 0.5 * dx);
    for (let i = 0; i < 6; i++) setTimeout(() => spawnGlint(true), i * 70);
    lastX = e.clientX;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      // hovering with a mouse: tiny breeze
      if (lastX !== null) impulse(0, -(e.clientX - lastX) * 0.0012, 0);
      lastX = e.clientX;
    }
  });
  canvas.addEventListener('pointerleave', () => { lastX = null; });
  let tilt = 0;
  addEventListener('deviceorientation', e => { if (e.gamma != null) tilt = THREE.MathUtils.clamp(e.gamma / 45, -1, 1); }, { passive: true });

  // ---------------- loop ----------------
  const clock = new THREE.Timer();
  let running = false, visible = true, raf = 0, glintTimer = 0;
  const o = new THREE.Object3D();
  function swingDrops(t) {
    const upd = (mesh, list) => {
      list.forEach((d, k) => {
        o.position.copy(d.p);
        o.rotation.set(Math.sin(t * 1.3 + d.ph) * d.a - sw.x * 0.6, d.ry + Math.sin(t * 0.7 + d.ph) * 0.25, Math.cos(t * 1.1 + d.ph) * d.a * 0.6 - sw.z * 0.6);
        o.updateMatrix(); mesh.setMatrixAt(k, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    upd(dropMesh, dropsAt); upd(smallMesh, smallDropsAt);
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsed();
    crystalU.uTime.value = t;
    // damped springs back to a soft idle drift
    const k = 5.5, damp = 1.1;
    const idleX = Math.sin(t * 0.55) * 0.012, idleZ = Math.sin(t * 0.43 + 1) * 0.018 + tilt * 0.03;
    sw.vx += (-(sw.x - idleX) * k - sw.vx * damp) * dt; sw.x += sw.vx * dt;
    sw.vz += (-(sw.z - idleZ) * k - sw.vz * damp) * dt; sw.z += sw.vz * dt;
    const idleTw = Math.sin(t * 0.21) * 0.45;
    sw.vtw += (-(sw.tw - idleTw) * 0.9 - sw.vtw * 0.6) * dt; sw.tw += sw.vtw * dt;
    root.rotation.set(sw.x, 0, sw.z);
    body.rotation.y = sw.tw;
    swingDrops(t);
    // candle flicker
    bulbs.forEach((b, i) => {
      const f = 0.92 + 0.06 * Math.sin(t * 7.3 + i * 1.7) + 0.03 * Math.sin(t * 13.1 + i);
      b.userData.halo.material.opacity = f; b.userData.halo.scale.setScalar(0.22 * f + 0.02);
    });
    warm.intensity = 2.0 + 0.15 * Math.sin(t * 6.1);
    // star glints: a gentle few at a time
    glintTimer -= dt;
    if (glintTimer <= 0) { spawnGlint(false); glintTimer = 0.22 + Math.random() * 0.45; }
    glintPool.forEach(s => {
      if (!s.visible) return;
      s.userData.t += dt / s.userData.life;
      const u = s.userData.t;
      if (u >= 1) { s.visible = false; return; }
      const env = Math.sin(Math.PI * u) ** 2;
      s.material.opacity = env;
      s.scale.setScalar(s.userData.size * (0.35 + 0.65 * env));
      s.material.rotation += dt * 0.6;
    });
    renderer.render(scene, camera);
  }
  function still() {
    // reduced motion: one calm frame with a few glints frozen in place
    root.rotation.set(0, 0, 0); body.rotation.y = 0.35;
    for (let i = 0; i < 5; i++) spawnGlint(true);
    glintPool.forEach(s => { if (s.visible) { s.material.opacity = 0.9; s.scale.setScalar(s.userData.size); } });
    renderer.render(scene, camera);
  }
  function setRunning() {
    const want = visible && !document.hidden && !reduce;
    if (want && !running) { running = true; clock.update(); frame(); }
    if (!want && running) { running = false; cancelAnimationFrame(raf); }
  }
  if (reduce) still();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; setRunning(); }, { rootMargin: '100px' }).observe(holder);
  document.addEventListener('visibilitychange', setRunning);
  setRunning();

  return { canvas, sparkle: () => { for (let i = 0; i < 6; i++) setTimeout(() => spawnGlint(true), i * 80); } };
}
