#!/usr/bin/env node
/**
 * Asset pipeline: raw DCC export -> web-ready GLB.
 *
 *   node tools/optimize.mjs bake/coin.glb public/models/coin.glb
 *
 * Two stages, split because they have different dependencies:
 *
 *   1. Geometry + housekeeping (bundled, no external tools): prune unused data,
 *      dedupe, generate tangents if the exporter omitted them, quantize
 *      attributes, then Meshopt-compress.
 *   2. Texture compression to KTX2/Basis (needs KTX-Software's `ktx` binary on
 *      PATH). UASTC for normal/ORM, ETC1S for colour.
 *
 * Stage 2 is skipped with a warning if `ktx` is missing, so the script is still
 * useful on a machine without it.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  prune,
  dedup,
  quantize,
  meshopt,
  tangents,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { generateTangents } from 'mikktspace';
import sharp from 'sharp';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node tools/optimize.mjs <in.glb> <out.glb>');
  process.exit(1);
}

const hasKtx = (() => {
  try {
    execFileSync('ktx', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const mb = (b) => (b / 1_048_576).toFixed(2) + ' MB';

await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

// --- report what came out of the DCC -----------------------------------------
const triangles = root
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => {
    const idx = p.getIndices();
    const pos = p.getAttribute('POSITION');
    return n + ((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
  }, 0);

const textureRes = Math.max(
  0,
  ...root.listTextures().map((t) => {
    const size = t.getSize();
    return size ? Math.max(size[0], size[1]) : 0;
  }),
);

console.log(`in:  ${inPath}  ${mb(statSync(inPath).size)}`);
console.log(`     ${triangles.toLocaleString()} tris, ${root.listTextures().length} textures, max ${textureRes}px`);

// Warn about the two mistakes that actually bite on a C4D export.
const missingTangents = root
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .some((p) => p.getAttribute('NORMAL') && !p.getAttribute('TANGENT'));
if (missingTangents) {
  console.log('     · no TANGENT attribute — generating (normal maps need it)');
}
for (const t of root.listTextures()) {
  const size = t.getSize();
  if (size && (size[0] & (size[0] - 1) || size[1] & (size[1] - 1))) {
    console.log(`     · ${t.getName() || 'texture'} is ${size[0]}x${size[1]} — not power-of-two, KTX2 will resample`);
  }
}

// --- stage 1: geometry --------------------------------------------------------
await doc.transform(
  prune(),
  dedup(),
  weld(),
  // mikktspace tangents: matches what the bake was authored against, so normal
  // maps land correctly instead of picking up seam artifacts.
  tangents({ generateTangents, overwrite: false }),
  // 14-bit position keeps sub-millimetre relief on a 25mm object. The default
  // of 14 is fine; dropping to 12 visibly stair-steps fine displacement.
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

mkdirSync(dirname(resolve(outPath)), { recursive: true });
await io.write(outPath, doc);
console.log(`geo: ${mb(statSync(outPath).size)}`);

// --- stage 2: textures -------------------------------------------------------
if (!hasKtx) {
  console.warn(
    '\nktx not found — skipping KTX2 compression.\n' +
      'Install KTX-Software (https://github.com/KhronosGroup/KTX-Software/releases)\n' +
      'and re-run. Without it textures ship uncompressed and eat 4-6x the VRAM.',
  );
} else {
  const cli = resolve('node_modules/.bin/gltf-transform');
  // UASTC for anything whose values are directions or masks. ETC1S mangles
  // normal maps — its endpoint/selector palettes are tuned for correlated RGB.
  execFileSync(
    cli,
    [
      'uastc', outPath, outPath,
      '--slots', '{normalTexture,occlusionTexture,metallicRoughnessTexture}',
      '--level', '4', '--rdo', '--rdo-lambda', '4', '--zstd', '18',
    ],
    { stdio: 'inherit' },
  );
  // ETC1S for colour, where perceptual error is cheap and the ratio is ~6x better.
  execFileSync(
    cli,
    ['etc1s', outPath, outPath, '--slots', '{baseColorTexture,emissiveTexture}', '--quality', '255'],
    { stdio: 'inherit' },
  );
  console.log(`ktx: ${mb(statSync(outPath).size)}`);
}

console.log(`\nout: ${outPath}  ${mb(statSync(outPath).size)}`);
console.log('\nPaste into lib/projects.ts:');
console.log(
  `  stats: { triangles: ${Math.round(triangles)}, textureRes: ${textureRes}, payloadBytes: ${statSync(outPath).size} },`,
);
