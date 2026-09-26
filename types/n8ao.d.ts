// n8ao ships plain JS with no bundled types.
declare module 'n8ao' {
  import type { Scene, Camera } from 'three';
  import { Pass } from 'postprocessing';

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    aoRadius: number;
    distanceFalloff: number;
    intensity: number;
    screenSpaceRadius: boolean;
    halfRes: boolean;
    configuration: Record<string, unknown>;
  }

  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
  }

  export const DepthType: Record<string, number>;
}
