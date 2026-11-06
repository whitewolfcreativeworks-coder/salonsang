"""Builds the photo nail studio assets from Sang's photo (IMG_1863) and SlimSAM nail masks.

Inputs (from the segmentation step, see README): studio-src.png (HD crop), nails-hd.png (nail ids 1..8),
skin-hd.png (soft hand mask). Outputs: images/studio-hand.webp, images/studio-hand-mask.png, src/studio-data.js
"""
import cv2, numpy as np, json, sys, os
D = sys.argv[1]; OUT = sys.argv[2]
OW = 1280
img = cv2.imread(os.path.join(D, 'studio-src.png')); H0, W0 = img.shape[:2]
s = OW / W0; OH = round(H0 * s)
ids = cv2.imread(os.path.join(D, 'nails-hd.png'), 0)
skin = cv2.imread(os.path.join(D, 'skin-hd.png'), 0).astype(np.float32) / 255

# clean nail masks: convex hull (SAM sometimes skips the bright gloss streak), slight feather
TIP = {1: (-0.75, 0.66), 2: (-0.75, 0.66), 3: (-0.75, 0.66), 4: (-0.75, 0.66), 5: (0.45, 0.89), 6: (0.45, 0.89), 7: (0.45, 0.89), 8: (0.45, 0.89)}
SLOT = {1: 3, 2: 2, 3: 1, 4: 0, 5: 3, 6: 0, 7: 1, 8: 2}          # finger slot: 0 pinky, 1 ring, 2 middle, 3 index
idmap = np.zeros((OH, OW), np.uint8); alpha = np.zeros((OH, OW), np.float32); nails = []
photo = cv2.resize(img, (OW, OH), interpolation=cv2.INTER_AREA)
lum = cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
for i in range(1, ids.max() + 1):
    m = (ids == i).astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cnts, key=cv2.contourArea)).astype(np.float32) * s
    hm = np.zeros((OH * 4, OW * 4), np.uint8); cv2.fillPoly(hm, [np.round(hull * 4).astype(np.int32)], 255)
    a = cv2.resize(hm, (OW, OH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255     # anti-aliased
    idmap[(a > 0.02) & (idmap == 0)] = i; alpha = np.maximum(alpha, a)
    ys, xs = np.nonzero(a > 0.5)
    pts = np.stack([xs, ys], 1).astype(np.float32); c = pts.mean(0)
    cov = np.cov((pts - c).T); ev, evec = np.linalg.eigh(cov); ax = evec[:, 1]
    if ax @ np.array(TIP[i]) < 0: ax = -ax
    perp = np.array([-ax[1], ax[0]])
    t = (pts - c) @ ax; u = (pts - c) @ perp
    base, tip = float(t.min()), float(t.max())
    halfw = float(np.percentile(np.abs(u), 97))
    inside = lum[a > 0.5]
    nails.append(dict(id=i, slot=SLOT[i], c=[float(c[0] / OW), float(c[1] / OH)], ax=[float(ax[0]), float(ax[1])],
                      base=base / OW, tip=tip / OW, hw=halfw / OW, lum=float(np.median(inside)), hi=float(np.percentile(inside, 90))))
# smooth outline per nail: the hull with its corners rounded (blur + threshold), inset ~1.2 px (polish sits just inside the nail),
# described as left/right half-widths (in hw units) at PROF_N steps along the nail (v = -0.05 .. 1.05)
PROF_N = 48
sdf_in = np.zeros((OH * 4, OW * 4), np.uint8)
for n in nails:
    m = (idmap == n['id']).astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
    big = np.zeros((OH * 4, OW * 4), np.uint8); cv2.fillPoly(big, [hull * 4], 255)
    area = float((big > 0).sum())
    bl = cv2.GaussianBlur(big.astype(np.float32), (0, 0), max(6.0, 0.4 * n['hw'] * OW) * 4)   # round the hull into a natural oval
    th = np.sort(bl.ravel())[::-1][int(area)]                              # threshold that keeps the nail's area
    big = (bl > th).astype(np.uint8) * 255
    dist = cv2.distanceTransform(big, cv2.DIST_L2, 5) / 4.0
    inset = (dist > 1.2).astype(np.float32)
    sdf_in |= (dist > 1.2).astype(np.uint8)
    c = np.array(n['c']) * [OW, OH]; ax = np.array(n['ax']); pr = np.array([-ax[1], ax[0]])
    L = (n['tip'] - n['base']) * OW; hw = n['hw'] * OW
    vs = np.linspace(-0.05, 1.05, PROF_N); us = np.linspace(-2.0, 2.0, 801)
    V, U = np.meshgrid(vs, us, indexing='ij')
    t = n['base'] * OW + V * L
    X = (c[0] + ax[0] * t + pr[0] * U * hw) * 4; Y = (c[1] + ax[1] * t + pr[1] * U * hw) * 4
    val = cv2.remap(inset, X.astype(np.float32), Y.astype(np.float32), cv2.INTER_LINEAR)
    wl, wr = [], []
    for k in range(PROF_N):
        row = val[k]; inside = np.nonzero(row > 0.5)[0]
        if len(inside) == 0: wl.append(-0.05); wr.append(-0.05); continue
        mid = 400
        if not (row[mid] > 0.5): mid = inside[len(inside) // 2]
        l = mid; r = mid
        while l > 0 and row[l - 1] > 0.5: l -= 1
        while r < 800 and row[r + 1] > 0.5: r += 1
        wl.append(round(float(-us[l]), 4)); wr.append(round(float(us[r]), 4))
    n['wl'] = wl; n['wr'] = wr

# signed distance (px) to the smoothed polish outline, + inside; stored in R as 128 + d*8 (±16 px), linear-filtered
din = cv2.distanceTransform(sdf_in, cv2.DIST_L2, 5); dout = cv2.distanceTransform(1 - sdf_in, cv2.DIST_L2, 5)
sdf = cv2.resize((din - dout) / 4.0, (OW, OH), interpolation=cv2.INTER_AREA)
sdf8 = np.clip(128 + sdf * 8, 0, 255)

# smooth nail shading (A): the real nail's broad light (dome, falloff) without its wavy chrome streaks.
# Per nail: clip the bright reflections, then a normalized blur inside the nail, divided by the median.
shade = np.full((OH, OW), 0.5, np.float32)
for n in nails:
    m = (idmap == n['id']).astype(np.float32)
    Lc = np.minimum(lum, np.percentile(lum[m > 0], 60)) * m
    num = cv2.GaussianBlur(Lc, (0, 0), 9); den = cv2.GaussianBlur(m, (0, 0), 9) + 1e-6
    r = (num / den) / max(1e-3, float(np.median(lum[m > 0.5])))
    grown = cv2.dilate(m, np.ones((9, 9), np.uint8)) > 0
    shade[grown] = np.clip(r[grown] / 2.0, 0, 1)
# mask texture: R = signed distance to the polish outline, G = nail coverage, B = skin, A = smooth shading (ratio / 2)
# skin: closed-form alpha matting (PyMatting, MIT) refines the rough hand mask into a soft, hair-accurate matte,
# so changing the skin tone has no blocky edges against the fur
from pymatting import estimate_alpha_cf
alpha_hint = (alpha > 0.02).astype(np.uint8)
sk0 = cv2.resize(skin, (OW, OH), interpolation=cv2.INTER_AREA) > 0.5
ke = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
hsv = cv2.cvtColor(photo, cv2.COLOR_BGR2HSV).astype(np.float32) / 255
white = (hsv[..., 1] < 0.14) & (hsv[..., 2] > 0.5)                       # white fur / card: never skin
white = cv2.morphologyEx(white.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
tri = np.full((OH, OW), 0.5); tri[cv2.erode(sk0.astype(np.uint8), ke) > 0] = 1; tri[cv2.dilate(sk0.astype(np.uint8), ke) == 0] = 0
tri[white & (cv2.dilate(alpha_hint, np.ones((15, 15), np.uint8)) == 0)] = 0
skin_s = np.clip(estimate_alpha_cf(photo[:, :, ::-1].astype(np.float64) / 255, tri), 0, 1).astype(np.float32)
skin_s *= cv2.GaussianBlur(cv2.dilate(sk0.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))).astype(np.float32), (0, 0), 3)  # never far outside the hand (card lettering)
skin_s = np.clip(skin_s - alpha, 0, 1)
mask = np.dstack([skin_s * 255, alpha * 255, sdf8, shade * 255]).astype(np.uint8)   # BGRA order for cv2
cv2.imwrite(os.path.join(OUT, 'images/studio-hand-mask.png'), mask, [cv2.IMWRITE_PNG_COMPRESSION, 9])
cv2.imwrite(os.path.join(OUT, 'images/studio-hand.webp'), photo, [cv2.IMWRITE_WEBP_QUALITY, 84])
sk = photo[skin_s > 0.6].mean(0)[::-1] / 255
with open(os.path.join(OUT, 'src/studio-data.js'), 'w') as f:
    f.write('// Generated by tools/build_studio_assets.py. Nail geometry in texture space (x,y ∈ 0..1 of the photo; lengths in photo widths).\n')
    f.write(f'export const PHOTO = {{ w: {OW}, h: {OH} }};\n')
    f.write(f'export const SKIN = [{sk[0]:.4f}, {sk[1]:.4f}, {sk[2]:.4f}];\n')
    f.write('export const NAILS = ' + json.dumps(nails, separators=(',', ':')) + ';\n')
print(OW, OH, 'skin', sk.round(3)); [print(n['id'], n['slot'], np.round(n['c'], 3), np.round(n['ax'], 2), round(n['tip'] - n['base'], 4), round(n['hw'], 4), round(n['lum'], 2)) for n in nails]
