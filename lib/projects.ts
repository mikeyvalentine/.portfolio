/**
 * The portfolio manifest.
 *
 * Every piece declares its own look and fidelity treatment, because a single
 * global renderer config never flatters more than one object. Displacement-heavy
 * work in particular wants per-piece exposure and AO tuning.
 */

/** How a piece is rendered in the browser. */
export type Fidelity =
  /** Raster + postFX only. Predictable frame budget, works everywhere. */
  | 'raster'
  /** Raster while the user interacts, path-traced convergence once they stop. */
  | 'hybrid'
  /** No realtime render at all — poster image or turntable video. */
  | 'still';

/** A scrubbable shader uniform, surfaced in the inspector UI. */
export interface InspectControl {
  /** Material property or custom uniform to drive. */
  key: 'roughness' | 'metalness' | 'normalScale' | 'displacementScale' | 'pomDepth' | 'envIntensity';
  label: string;
  min: number;
  max: number;
  step: number;
  /** Omit to read the value baked into the asset. */
  default?: number;
}

export interface Project {
  slug: string;
  title: string;
  year: number;
  /** One or two sentences. Shown on the card and above the viewer. */
  summary: string;
  software: string[];

  /** Shipped low-poly GLB, KTX2-compressed. Relative to /public. */
  model?: string;
  /** Fallback still — also the poster while the GLB streams in. */
  poster?: string;
  /** Pre-rendered turntable, for `still` pieces. */
  video?: string;

  hdri: string;
  /** Per-piece exposure. Displacement reads very differently at 0.8 vs 1.4. */
  exposure: number;
  /** AO strength. High-frequency surface detail usually wants this pushed. */
  aoIntensity: number;
  fidelity: Fidelity;

  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };

  inspect?: InspectControl[];

  /** Honest numbers, shown in the asset readout. Filled in by tools/optimize.mjs. */
  stats?: {
    triangles: number;
    textureRes: number;
    payloadBytes: number;
  };
}

export const projects: Project[] = [
  {
    slug: 'placeholder-hero',
    title: 'Placeholder Hero',
    year: 2026,
    summary:
      'Stand-in asset so the loading, compression and shading paths are all exercised. Swap in a real bake and delete this entry.',
    software: ['Blender', 'Substance'],
    model: undefined, // no GLB yet — the viewer falls back to a procedural stand-in
    hdri: '/hdri/studio.hdr',
    exposure: 1.0,
    aoIntensity: 1.1,
    fidelity: 'hybrid',
    camera: { position: [0, 0.4, 3.2], target: [0, 0, 0], fov: 35 },
    inspect: [
      { key: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.01 },
      { key: 'normalScale', label: 'Normal intensity', min: 0, max: 3, step: 0.01, default: 1 },
      { key: 'envIntensity', label: 'Environment', min: 0, max: 3, step: 0.01, default: 1 },
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
