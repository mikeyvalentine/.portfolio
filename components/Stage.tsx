'use client';

import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { extend, useThree } from '@react-three/fiber';
import { useMemo } from 'react';

extend({ N8AOPostPass });

/**
 * Screen-space AO. This is the single biggest contributor to a raster render
 * reading as "rendered" rather than "realtime" — high-frequency displacement
 * detail has no contact shadowing without it, and reads as flat noise.
 */
function AO({ intensity }: { intensity: number }) {
  const { scene, camera, size } = useThree();
  const args = useMemo(
    () => [scene, camera, size.width, size.height] as const,
    [scene, camera, size.width, size.height],
  );
  return (
    <n8AOPostPass
      args={args as never}
      aoRadius={0.35}
      distanceFalloff={1.2}
      intensity={intensity}
      screenSpaceRadius
      halfRes
    />
  );
}

export interface StageProps {
  hdri: string;
  exposure: number;
  aoIntensity: number;
  /** Suppress postFX while the path tracer owns the frame. */
  enabled?: boolean;
}

/**
 * Lighting and post chain.
 *
 * Deliberately IBL-only: no punctual lights. A single good HDRI plus AO and a
 * filmic curve gets far closer to an offline render than a three-point rig,
 * and it means the look survives the camera being dragged anywhere.
 */
export function Stage({ hdri, exposure, aoIntensity, enabled = true }: StageProps) {
  return (
    <>
      <Environment files={hdri} background={false} environmentIntensity={exposure} />
      {enabled && (
        <EffectComposer enableNormalPass multisampling={0}>
          <AO intensity={aoIntensity} />
          <Bloom intensity={0.25} luminanceThreshold={1.0} luminanceSmoothing={0.3} mipmapBlur />
          {/* AgX over ACES: gentler highlight rolloff, far less hue shift on
              saturated metals. Matches what C4D/Redshift users expect. */}
          <ToneMapping mode={ToneMappingMode.AGX} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
