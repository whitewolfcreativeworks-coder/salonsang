// "Try it on your hand": live camera nail try-on with Google MediaPipe Hand Landmarker (Apache 2.0).
// Loaded only when someone taps the button, so it never slows down the page.
import { design, ACCENT } from './state.js';

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// fingertip, DIP joint, PIP joint for thumb..pinky, mapped to the studio's finger order
const FINGERS = [
  { tip: 20, dip: 19, pip: 18, studio: 0, wScale: 0.82 }, // pinky
  { tip: 16, dip: 15, pip: 14, studio: 1, wScale: 0.95 }, // ring
  { tip: 12, dip: 11, pip: 10, studio: 2, wScale: 1.0 },  // middle
  { tip: 8, dip: 7, pip: 6, studio: 3, wScale: 0.97 },    // index
  { tip: 4, dip: 3, pip: 2, studio: 4, wScale: 1.15 }     // thumb
];
const LEN = { square: 1.0, round: 1.0, almond: 1.22, coffin: 1.3, stiletto: 1.42 };

let landmarker = null, stream = null, raf = 0, facing = 'environment';
const smooth = [];

export async function openTryOn(root, getColorFor) {
  const video = root.querySelector('video');
  const canvas = root.querySelector('canvas');
  const status = root.querySelector('.to-status');
  const ctx = canvas.getContext('2d');
  root.hidden = false;
  document.documentElement.classList.add('no-scroll');
  status.textContent = 'Warming up the camera…';
  try {
    await startCamera(video);
  } catch (e) {
    status.textContent = 'Camera access was blocked. You can allow it in your browser settings and try again.';
    return;
  }
  if (!landmarker) {
    status.textContent = 'Loading hand tracking…';
    try {
      const files = await FilesetResolver.forVisionTasks(WASM);
      landmarker = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.5, minTrackingConfidence: 0.5
      });
    } catch (e) {
      console.error(e);
      status.textContent = 'Hand tracking could not load on this device. Try the 3D studio instead.';
      return;
    }
  }
  status.textContent = 'Hold up your hand, nails facing the camera ✨';
  let lastT = -1;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth * dpr, ch = canvas.clientHeight * dpr;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    // cover-fit video into canvas
    const s = Math.max(cw / vw, ch / vh), dw = vw * s, dh = vh * s, ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    const mirror = facing === 'user';
    ctx.save();
    if (mirror) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, ox, oy, dw, dh);
    if (video.currentTime !== lastT) {
      lastT = video.currentTime;
      const res = landmarker.detectForVideo(video, performance.now());
      const lm = res.landmarks && res.landmarks[0];
      if (lm) {
        const pts = lm.map((p, k) => {
          const x = ox + p.x * dw, y = oy + p.y * dh;
          if (!smooth[k]) smooth[k] = { x, y };
          smooth[k].x += (x - smooth[k].x) * 0.55; smooth[k].y += (y - smooth[k].y) * 0.55;
          return smooth[k];
        });
        // is the back of the hand toward the camera?
        const hand = res.handedness?.[0]?.[0]?.categoryName || 'Right';
        const a = lm[5], b = lm[17], w = lm[0];
        const cross = (a.x - w.x) * (b.y - w.y) - (a.y - w.y) * (b.x - w.x);
        const backVisible = (hand === 'Right') === (cross > 0) !== mirror;
        drawNails(ctx, pts, getColorFor, backVisible ? 1 : 0.0);
        status.textContent = backVisible ? 'Looking gorgeous ✨ Tap “Text this design to Sang” when you love it.' : 'Turn your hand so your nails face the camera';
      } else {
        smooth.length = 0;
        status.textContent = 'Hold up your hand, nails facing the camera ✨';
      }
    }
    ctx.restore();
  };
  loop();
}

export function closeTryOn(root) {
  cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
  root.hidden = true;
  document.documentElement.classList.remove('no-scroll');
}

export async function flipCamera(root) {
  facing = facing === 'user' ? 'environment' : 'user';
  if (stream) stream.getTracks().forEach(t => t.stop());
  await startCamera(root.querySelector('video'));
}

async function startCamera(video) {
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
}

function drawNails(ctx, P, getColorFor, alpha) {
  if (alpha <= 0) return;
  const t = performance.now() / 1000;
  FINGERS.forEach(f => {
    const tip = P[f.tip], dip = P[f.dip];
    const dx = tip.x - dip.x, dy = tip.y - dip.y;
    const seg = Math.hypot(dx, dy);
    if (seg < 4) return;
    const ang = Math.atan2(dy, dx) - Math.PI / 2;
    const len = seg * 0.78 * LEN[design.shape];
    const wid = seg * 0.62 * f.wScale;
    // cuticle sits ~40% of the way from tip back to the joint
    const cx = tip.x - dx * 0.42, cy = tip.y - dy * 0.42;
    const color = getColorFor(f.studio);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy); ctx.rotate(ang);
    nailPath(ctx, wid, len);
    ctx.save(); ctx.clip();
    paintFinish(ctx, wid, len, color, t);
    if (design.art === 'french') { ctx.fillStyle = '#fbf8f3'; ctx.beginPath(); ctx.moveTo(-wid, len * 1.2); ctx.lineTo(wid, len * 1.2); ctx.lineTo(wid, len * 0.72); ctx.quadraticCurveTo(0, len * 0.52, -wid, len * 0.72); ctx.fill(); }
    if (f.studio === ACCENT) accentArt(ctx, wid, len, color);
    ctx.restore();
    ctx.lineWidth = Math.max(1, wid * 0.04); ctx.strokeStyle = 'rgba(0,0,0,.18)'; nailPath(ctx, wid, len); ctx.stroke();
    ctx.restore();
  });
}

function nailPath(ctx, w, L) {
  const a = w / 2;
  ctx.beginPath();
  ctx.moveTo(-a, L * 0.15);
  ctx.bezierCurveTo(-a, -L * 0.04, a, -L * 0.04, a, L * 0.15);
  switch (design.shape) {
    case 'square': ctx.lineTo(a, L - w * .1); ctx.quadraticCurveTo(a, L, a - w * .1, L); ctx.lineTo(-a + w * .1, L); ctx.quadraticCurveTo(-a, L, -a, L - w * .1); break;
    case 'round': ctx.lineTo(a, L - a); ctx.bezierCurveTo(a, L - a * .1, a * .45, L, 0, L); ctx.bezierCurveTo(-a * .45, L, -a, L - a * .1, -a, L - a); break;
    case 'almond': ctx.lineTo(a, L * .5); ctx.bezierCurveTo(a, L * .8, a * .3, L * .97, 0, L); ctx.bezierCurveTo(-a * .3, L * .97, -a, L * .8, -a, L * .5); break;
    case 'coffin': ctx.lineTo(a, L * .5); ctx.lineTo(a * .45, L); ctx.lineTo(-a * .45, L); ctx.lineTo(-a, L * .5); break;
    default: ctx.lineTo(a, L * .4); ctx.bezierCurveTo(a, L * .7, a * .07, L * .95, 0, L); ctx.bezierCurveTo(-a * .07, L * .95, -a, L * .7, -a, L * .4);
  }
  ctx.closePath();
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function paintFinish(ctx, w, L, hex, t) {
  const fin = design.finish;
  ctx.globalAlpha *= fin === 'jelly' ? 0.72 : 1;
  let g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, shade(hex, -0.22)); g.addColorStop(0.5, hex); g.addColorStop(1, shade(hex, -0.28));
  ctx.fillStyle = g; ctx.fillRect(-w, -L * .2, w * 2, L * 1.4);
  if (fin === 'cateye') {
    const p = 0.5 + Math.sin(t * 1.6) * 0.25;
    g = ctx.createLinearGradient(-w / 2, L * 0.1, w / 2, L * 0.9);
    g.addColorStop(Math.max(0, p - .2), 'rgba(255,255,255,0)'); g.addColorStop(p, shade(hex, 0.62)); g.addColorStop(Math.min(1, p + .2), 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.globalCompositeOperation = 'screen'; ctx.fillRect(-w, -L * .2, w * 2, L * 1.4); ctx.globalCompositeOperation = 'source-over';
  } else if (fin === 'chrome') {
    g = ctx.createLinearGradient(-w / 2, 0, w / 2, L);
    g.addColorStop(0, 'rgba(255,255,255,.65)'); g.addColorStop(.35, 'rgba(220,200,255,.25)'); g.addColorStop(.55, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(200,230,255,.3)');
    ctx.fillStyle = g; ctx.fillRect(-w, -L * .2, w * 2, L * 1.4);
  } else if (fin === 'glitter') {
    for (let k = 0; k < 40; k++) {
      const x = (Math.sin(k * 12.9898) * 43758.5453 % 1) * w - w / 2, y = (Math.sin(k * 78.233) * 12345.678 % 1 + 1) % 1 * L;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k);
      ctx.fillStyle = `rgba(255,${230 + (k % 3) * 8},${200 + (k % 5) * 10},${tw})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, w * 0.025), 0, 7); ctx.fill();
    }
  }
  if (fin !== 'matte') {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(-w * .18, L * .5, w * .07, L * .3, 0, 0, 7); ctx.fill();
  }
}

function accentArt(ctx, w, L, hex) {
  const k = design.art, cy = L * 0.5;
  if (k === 'daisy' || k === 'sunflower') {
    const n = k === 'daisy' ? 9 : 14;
    for (let p = 0; p < n; p++) {
      ctx.save(); ctx.translate(0, cy); ctx.rotate(p / n * Math.PI * 2);
      ctx.fillStyle = k === 'daisy' ? '#fff' : (p % 2 ? '#f4b52b' : '#ffd23f');
      ctx.beginPath(); ctx.ellipse(0, -w * .17, w * .07, w * .15, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = k === 'daisy' ? '#f6c22b' : '#5a3418'; ctx.beginPath(); ctx.arc(0, cy, w * (k === 'daisy' ? .07 : .1), 0, 7); ctx.fill();
  } else if (k === 'heart') {
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(0, cy); const s = w * .012; ctx.scale(s, -s);
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-18, 0, -14, -14, -5, -14); ctx.bezierCurveTo(-1, -14, 0, -10, 0, -8); ctx.bezierCurveTo(0, -10, 1, -14, 5, -14); ctx.bezierCurveTo(14, -14, 18, 0, 0, 12); ctx.fill(); ctx.restore();
  } else if (k === 'dots') {
    ctx.fillStyle = '#fff';
    for (let r = 0; r < 6; r++) for (let c = -2; c <= 2; c++) { ctx.beginPath(); ctx.arc(c * w * .2 + (r % 2) * w * .1, L * .12 + r * L * .15, w * .045, 0, 7); ctx.fill(); }
  } else if (k === 'gems') {
    [[0, L * .2, .12], [-w * .22, L * .14, .07], [w * .22, L * .14, .07]].forEach(([x, y, r]) => {
      const g = ctx.createRadialGradient(x - w * r * .3, y - w * r * .3, 1, x, y, w * r);
      g.addColorStop(0, '#fff'); g.addColorStop(.5, '#dff3ff'); g.addColorStop(1, '#9cc4e6');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, w * r, 0, 7); ctx.fill();
    });
  } else if (k === 'starfish') {
    ctx.save(); ctx.translate(0, cy); ctx.fillStyle = '#f2a23a'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? w * .1 : w * .26, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.fill(); ctx.restore();
  } else if (k === 'swirl') {
    ctx.strokeStyle = '#e1bd63'; ctx.lineWidth = w * .05; ctx.beginPath(); ctx.moveTo(-w * .3, 0); ctx.bezierCurveTo(w * .6, L * .3, -w * .6, L * .6, w * .2, L); ctx.stroke();
  }
}
