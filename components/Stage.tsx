'use client';

import { Environment, Lightformer } from '@react-three/drei';
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

/**
 * Procedural studio environment — a softbox pair plus a rim strip, built from
 * emissive planes rather than an HDRI file.
 *
 * Used when a piece declares no `hdri`. It needs no asset and no network, and
 * for metal it is a far better default than a flat colour: there is something
 * with shape for the surface to reflect. Swap in a real HDRI per piece once you
 * have one you like.
 */
function StudioEnvironment({ intensity }: { intensity: number }) {
  return (
    <Environment resolution={512} environmentIntensity={intensity}>
      {/* key: large and soft, high and slightly to camera-left */}
      <Lightformer form="rect" intensity={3} scale={[8, 8, 1]} position={[-4, 5, 4]} target={[0, 0, 0]} />
      {/* fill: broad, dim, opposite side */}
      <Lightformer form="rect" intensity={0.8} scale={[10, 6, 1]} position={[5, 1, 3]} target={[0, 0, 0]} />
      {/* rim: narrow strip behind, gives metal an edge to catch */}
      <Lightformer form="rect" intensity={4} scale={[1, 6, 1]} position={[2, 2, -5]} target={[0, 0, 0]} />
      {/* ground bounce, keeps undersides from going black */}
      <Lightformer form="rect" intensity={0.5} scale={[12, 12, 1]} rotation={[Math.PI / 2, 0, 0]} position={[0, -4, 0]} />
      <color attach="background" args={['#0a0a0a']} />
    </Environment>
  );
}

export interface StageProps {
  /** Omit to use the procedural studio environment. */
  hdri?: string;
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
      {hdri ? (
        <Environment files={hdri} background={false} environmentIntensity={exposure} />
      ) : (
        <StudioEnvironment intensity={exposure} />
      )}
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
