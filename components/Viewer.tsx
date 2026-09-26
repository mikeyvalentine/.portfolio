'use client';

import { Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { Pathtracer } from '@react-three/gpu-pathtracer';
import * as THREE from 'three';
import { Stage } from './Stage';
import { Model, PlaceholderModel, type Overrides } from './Model';
import { Inspector } from './Inspector';
import { useIdle } from '@/lib/useIdle';
import type { Project } from '@/lib/projects';

function Loading() {
  return (
    <Html center>
      <div className="text-xs tracking-widest uppercase text-neutral-400">Loading</div>
    </Html>
  );
}

export function Viewer({ project }: { project: Project }) {
  const [overrides, setOverrides] = useState<Overrides>(() =>
    Object.fromEntries(
      (project.inspect ?? [])
        .filter((c) => c.default !== undefined)
        .map((c) => [c.key, c.default!]),
    ),
  );

  const hybrid = project.fidelity === 'hybrid';
  const { idle, bump } = useIdle(700);
  // Only hand the frame to the path tracer once the camera has settled AND the
  // asset is genuinely static. Scrubbing a uniform counts as activity.
  const tracing = hybrid && idle;

  const onOverride = useCallback((key: keyof Overrides, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    bump();
  }, [bump]);

  const content = (
    <>
      <Stage
        hdri={project.hdri}
        exposure={project.exposure}
        aoIntensity={project.aoIntensity}
        enabled={!tracing}
      />
      <Suspense fallback={<Loading />}>
        {project.model ? (
          <Model url={project.model} overrides={overrides} />
        ) : (
          <PlaceholderModel overrides={overrides} />
        )}
      </Suspense>
    </>
  );

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false, // SMAA in the post chain handles this
          alpha: true,
          // Tone mapping lives in the post chain; keep the buffer linear.
          toneMapping: THREE.NoToneMapping,
          preserveDrawingBuffer: true,
        }}
        // A path-traced frame must not be cleared between samples.
        frameloop="always"
      >
        <PerspectiveCamera
          makeDefault
          fov={project.camera.fov}
          position={project.camera.position}
        />
        <OrbitControls
          makeDefault
          target={project.camera.target}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.2}
          maxDistance={8}
          onChange={bump}
        />
        {hybrid ? (
          <Pathtracer enabled={tracing} bounces={4} minSamples={3} tiles={[2, 2]}>
            {content}
          </Pathtracer>
        ) : (
          content
        )}
      </Canvas>

      {project.inspect && project.inspect.length > 0 && (
        <Inspector
          controls={project.inspect}
          values={overrides}
          onChange={onOverride}
        />
      )}

      {hybrid && (
        <div className="pointer-events-none absolute bottom-4 left-4 text-[10px] uppercase tracking-widest text-neutral-500">
          {tracing ? 'Path traced · converging' : 'Realtime'}
        </div>
      )}
    </div>
  );
}
