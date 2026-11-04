# Salon Sang Nail Studio — salonsang.com

The website for **Salon Sang**, Sang Whitewolf's private nail studio at Sola Salon Studios, Suite 12, 440 W 6th Ave, Eugene, OR.
It's an "experience" site, not a booking site: every path ends with **call or text 530-648-4977**.

## What's here
- `index.html`: the page (neon + fluid entrance, suite tour, bring-your-friends, 3D nail studio, try-on, gallery, menu, home care, visit)
- `src/`: source for the interactive studio (bundled into `js/build/` with esbuild)
  - `studio.js`: three.js 3D hand on white fur, brush painting, finishes and shaders, crystals, bloom
  - `tryon.js`: live camera try-on with MediaPipe Hand Landmarker
  - `app.js`, `state.js`: controls and the shared design ("Text this design to Sang")
- `js/main.js`: page motion (GSAP ScrollTrigger + Lenis), sparkles, suite hotspots, menu, gallery
- `js/vendor/`: GSAP, ScrollTrigger, Lenis, and an adapted WebGL Fluid Simulation
- `assets/`: CC0 studio HDRI from Poly Haven (lighting for the 3D studio)

## Building
`npm install` then `npm run build` (writes `js/build/`). The built files are committed so GitHub Pages can serve them directly.

## Open source used
three.js (MIT) · @pmndrs/vanilla (MIT) · MediaPipe Tasks Vision (Apache 2.0) · WebGL Fluid Simulation by Pavel Dobryakov (MIT) · GSAP + ScrollTrigger (GSAP standard license, free) · Lenis (MIT) · Poly Haven HDRI (CC0) · Google Fonts (OFL)

## Common edits
- **Prices:** search `index.html` for the menu section (`id="menu"`)
- **Hours:** the `Hours` card in the `visit` section
- **Gallery photo:** add a `.webp` to `images/` and copy a `<button class="tile">` line in the gallery

## Hosting
GitHub Pages from `main` / root. Custom domain `salonsang.com` (Namecheap DNS) to be connected.

All photos and branding © Salon Sang. All rights reserved.
