# Cinema 4D → web pipeline

## The one rule

**Two meshes, always.**

| Mesh | Role | Density | Leaves C4D as |
|---|---|---|---|
| High-poly | Bake source. Never shipped. | Millions, displacement resolved | stays in-scene (Redshift bakes from it directly) |
| Low-poly | What ships | 20k–800k for a hero object | GLB + KTX2 |

Everything below is in service of that split.

## Why not OBJ

OBJ carries no PBR materials (MTL predates PBR), no tangent vectors, and no
compression. Without tangents, normal maps develop visible seams along every UV
border — exactly where a high-detail bake shows it worst.

C4D has had a native glTF/GLB exporter since S22, improved in 2024. Use it.
OBJ's only legitimate role here is as a dumb geometry carrier for a bake source,
where materials don't matter.

## C4D-specific gotchas

These five account for most of the pain:

1. **Scale.** C4D defaults to centimetres; glTF assumes metres. A 25mm coin
   arrives 100× oversized. Set the export scale to 0.01, or fix Project Scale
   before export. (`components/Model.tsx` normalises to a unit bounding sphere
   as a safety net, but fix it at source — physical-scale-dependent effects
   won't be saved by a rescale.)
2. **Redshift materials export as nothing useful.** The glTF exporter only
   understands the standard material channels. Every Redshift node tree must be
   baked to bitmaps and reassembled on a simple PBR material before export.
3. **N-gons.** C4D is happy with them; glTF is triangles only. Triangulate on
   export, and do it *before* baking so the bake matches the shipped topology.
4. **Normal map green channel.** Redshift and glTF don't always agree on
   handedness. If relief reads inverted — lit from below, dents where bumps
   should be — flip green. Check against a known-convex bump before shipping.
5. **No UDIMs in glTF.** High-detail offline work almost always uses them.
   Either repack to a single 0–1 tile or split into one material per tile.
   C4D's UV tools are the weak link here; round-tripping the unwrap through
   RizomUV (or Blender) is common and worth it.

## Baking with Redshift

`Redshift → Tools → Texture Baking → Create BakeSet from Selection`, then set
resolution in the BakeSet's Object tab. Baking is GPU-accelerated and routed
through the AOV manager, so you get exact shader parity with your renders —
which is the reason to bake in Redshift rather than round-tripping.

Bake these AOVs:

| Map | Use | Notes |
|---|---|---|
| Diffuse/Albedo | `baseColorTexture` | **Colour only** — no lighting baked in |
| Normal | `normalTexture` | Tangent space. This is where displacement goes. |
| Roughness | ORM green | Where scratches do most of their work |
| Metallic | ORM blue | Usually flat for a single-material object |
| AO | ORM red | Cheap contact shading, complements runtime AO |
| **Height** | POM only | **16-bit.** 8-bit bands visibly on shallow relief. |
| Curvature | edge wear masks | Optional, useful for driving roughness |

Pack AO/Roughness/Metallic into one RGB texture ("ORM") — one fetch instead of
three.

### Redshift displacement is render-time only

It happens on the GPU during the render and never becomes mesh. You cannot
export it. Two routes:

- **Bake it to a normal map** via the BakeSet. Redshift bakes from the displaced
  render surface, which is what you want.
- **Make it real geometry**: a Displacer deformer over a Subdivision Surface
  with the same texture, then `Current State to Object`. That mesh is your
  high-poly bake source *and*, decimated, potentially your shipped mesh.

## Deciding where detail lives

One question per detail tier: **does it change the silhouette at my closest
camera distance?**

| Answer | Approach |
|---|---|
| No | Normal map. Cheapest, and looks right. |
| Yes, as parallax within a surface | Parallax occlusion mapping (heightfield shader) |
| Yes, it reshapes the outline | Real geometry, plus a normal map for what's left |

Normal maps fake shading only — never outline, never self-occlusion.

## Worked example: the high-res coin

Three detail tiers, three different answers.

**1. Macro form — geometry, obviously.** The disc, its thickness, the rim.
Trivial poly cost.

**2. The reeded/milled edge — geometry, non-negotiable.** You see it in profile,
so it *is* silhouette. A radial pattern of 200–400 segments around the rim costs
almost nothing and a normal map cannot fake it.

**3. The face relief (portrait, lettering) — the interesting call.**

Typical depth is 0.1–0.3mm on a 25mm coin. Viewed face-on, a normal map is
fine. Viewed at a **grazing angle** — which is exactly how anyone inspects a
coin — normal-map-only relief reads as a printed sticker: no parallax, no
self-occlusion, lettering that doesn't occlude itself. This is the classic
failure of this asset class.

POM is tempting, and a coin face is genuinely its best case (planar surface,
clean heightfield, no distortion). **But for this project, ship the face relief
as geometry**, for three reasons:

- A disc subdivides *efficiently*. Unlike an organic form, a flat circular grid
  gives you uniform, well-spent density. ~300–800k tris total resolves crisp
  relief, which is ~3–5 MB after Meshopt + quantisation. Affordable for one
  hero object.
- Grazing-angle silhouette is real, not faked. Lettering actually occludes.
- **The path tracer only understands standard materials.** `three-gpu-pathtracer`
  reads material info — maps, normal maps — but not a custom POM shader. In the
  hybrid setup, a POM coin would show relief while you drag and go flat the
  moment the path tracer takes over. Geometry is the one representation both
  renderers agree on.

That last point is the architectural constraint worth internalising: **in a
hybrid raster/path-traced viewer, custom shaders desync the two passes.** POM
stays a good tool for `fidelity: 'raster'` pieces.

**4. Scratches — normal map + roughness, never geometry.** Sub-micron features.
And scratches read primarily through *specular variation*, not shading normals,
so the roughness map is doing more work than the normal map. Consider
`KHR_materials_anisotropy` for directional polish.

**5. Metal is its environment.** A coin is near-mirror; its entire appearance is
reflected surroundings. This is where the hybrid pays for itself — multi-bounce
reflection inside the relief and correct contact shading are what separate a
real coin from a cheap one. Raster metal always looks cheap by comparison.

**UV layout tip:** obverse, reverse, edge are three islands. Don't let the edge
strip claim a third of the atlas — scale it down and give the two faces the
space. 4K is justified here: fine detail, close camera, tiny UV area.

## Budgets

- **Under ~10 MB** total per hero piece.
- 2K maps by default; 4K for baseColor+normal where the camera gets close.
- Height maps for POM stay **16-bit PNG** — KTX2/Basis is 8-bit, which bands on
  shallow relief. It's one texture; pay for it.
- If quality disappoints, *raise* source resolution before loosening
  compression. Counterintuitive, but it beats artifacts.

## Running the pipeline

```bash
# 1. Export GLB from C4D into bake/ (scale 0.01, triangulated, tangents on)
# 2. Compress
node tools/optimize.mjs bake/coin.glb public/models/coin.glb
# 3. Paste the printed stats block into lib/projects.ts
```

KTX2 compression needs [KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases)'s
`ktx` binary on PATH. Without it the script still does geometry compression and
warns.
