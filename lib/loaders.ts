'use client';

import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import type { GLTFLoader } from 'three-stdlib';
import { KTX2Loader } from 'three-stdlib';

/**
 * KTX2/Basis needs the renderer to pick a transcode target (BC7 on desktop,
 * ASTC on most mobile, ETC2 as the floor), so the loader can only be built
 * once a WebGL context exists. Hence a hook rather than a module singleton.
 *
 * The transcoder is served from /basis (copied out of three's examples) instead
 * of a CDN — one less third party in the critical path, and it caches
 * immutably alongside the models.
 */
export function useKTX2Extension() {
  const gl = useThree((s) => s.gl);

  return useCallback(
    (loader: GLTFLoader) => {
      const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl as never);
      loader.setKTX2Loader(ktx2 as never);
    },
    [gl],
  );
}
