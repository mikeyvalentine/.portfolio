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

Each piece in `lib/projects.ts` declares a `fidelity`:

- **`raster`** — IBL + N8AO + bloom + AgX. Predictable frame budget, works
  everywhere. Custom shaders (e.g. parallax occlusion mapping) are fine here.
- **`hybrid`** — rasterises while you drag, then hands the frame to the path
  tracer once the camera settles, converging toward offline quality. Best for
  metal and anything whose look is dominated by reflected environment.
  **Custom shaders desync the two passes** — see `docs/PIPELINE.md`.
- **`still`** — poster image or pre-rendered turntable, no realtime render.

Not every piece should be realtime. A pre-rendered turntable often looks better
and loads faster; reserve the interactive treatment for your strongest two to
four pieces.

## Adding a piece

1. Bake and export from C4D — see **[docs/PIPELINE.md](docs/PIPELINE.md)**.
2. `node tools/optimize.mjs bake/thing.glb public/models/thing.glb`
3. Add an entry to `lib/projects.ts`, pasting the printed `stats` block.

## Layout

```
app/                 routes — gallery + /work/[slug]
components/
  Viewer.tsx         canvas, controls, raster/pathtrace gate
  Stage.tsx          IBL + post chain
  Model.tsx          GLB loading, unit-fitting, live overrides
  Inspector.tsx      shader uniform scrubbing
lib/
  projects.ts        the manifest — per-piece look and fidelity
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
