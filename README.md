# Portfolio

Next.js + React Three Fiber portfolio for high-detail single-object 3D work.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| 3D | three r186, R3F 9, drei 10 |
| Post | `postprocessing` + N8AO, AgX tone mapping |
| Hero renderer | `@react-three/gpu-pathtracer` — converges on idle |
| Assets | GLB + Meshopt + KTX2/Basis |
| Styling | Tailwind 4 |

## Getting started

```bash
npm install
npm run dev
```

## How rendering works

The home page is one infinitely-looping list of frames (`components/Frames.tsx`).
Video and image frames are plain elements. Model frames are drei `View`s, which
all draw through a **single shared WebGL context** — browsers cap contexts at
roughly 8-16, so one canvas per frame would fail as the list grew.

Because each `View` renders its own scene, there is no post-processing chain in
the list (N composers would fight over one canvas). Tone mapping is on the
renderer instead. `components/Stage.tsx` still carries the full post chain and
`@react-three/gpu-pathtracer` is installed, for a focused single-object route
later.

Frame margins are two CSS variables in `app/globals.css`:

```css
--frame-margin-x: 20vw;
--frame-margin-y: 10vh;
```

## Layout

```
app/
  page.tsx           renders the frame list, nothing else
  globals.css        layout only — margins live here
components/
  Frames.tsx         infinite scroll, shared canvas, View per model frame
  Stage.tsx          IBL + optional post chain
  Model.tsx          GLB loading, unit-fitting, material overrides
lib/
  work.ts            the work list — order on the page
  loaders.ts         KTX2 transcoder wiring
tools/optimize.mjs   DCC export -> web asset
docs/PIPELINE.md     C4D/Redshift bake + export guide
```

## Notes

- KTX2 needs [KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases)'s
  `ktx` binary on PATH for the texture stage.
- Drop an HDRI at `public/hdri/studio.hdr` — IBL quality sets the ceiling on how
  good metal looks.
- `public/basis/` holds the Basis transcoder, copied from three's examples so
  there's no CDN in the critical path.
