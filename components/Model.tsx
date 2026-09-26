'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useKTX2Extension } from '@/lib/loaders';
import type { InspectControl } from '@/lib/projects';

export type Overrides = Partial<Record<InspectControl['key'], number>>;

/** Walk every mesh once and apply the inspector's live values. */
function applyOverrides(root: THREE.Object3D, o: Overrides) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !('isMeshStandardMaterial' in mat)) continue;
      if (o.roughness !== undefined) mat.roughness = o.roughness;
      if (o.metalness !== undefined) mat.metalness = o.metalness;
      if (o.envIntensity !== undefined) mat.envMapIntensity = o.envIntensity;
      if (o.normalScale !== undefined && mat.normalScale) {
        mat.normalScale.set(o.normalScale, o.normalScale);
      }
      mat.needsUpdate = true;
    }
  });
}

/**
 * Normalise an arbitrary asset to a predictable size and origin.
 *
 * C4D exports arrive in centimetres far more often than not, so a coin can show
 * up 100x oversized. Rather than trusting the export, fit every asset to a unit
 * bounding sphere and let the manifest's camera distances mean the same thing
 * for every piece.
 */
function useFitted(object: THREE.Object3D, targetRadius = 1) {
  return useMemo(() => {
    const group = new THREE.Group();
    const clone = object.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const scale = sphere.radius > 0 ? targetRadius / sphere.radius : 1;
    clone.position.sub(box.getCenter(new THREE.Vector3()));
    group.scale.setScalar(scale);
    group.add(clone);
    return group;
  }, [object, targetRadius]);
}

export function Model({ url, overrides }: { url: string; overrides: Overrides }) {
  const extendLoader = useKTX2Extension();
  // meshopt on, draco off — meshopt decodes faster and we compress with it in
  // tools/optimize.mjs. Flip the second arg if an asset predates that.
  const gltf = useGLTF(url, false, true, extendLoader);
  const fitted = useFitted(gltf.scene);

  useEffect(() => {
    applyOverrides(fitted, overrides);
  }, [fitted, overrides]);

  return <primitive object={fitted} />;
}

/**
 * Stand-in used until a real bake lands. Exercises the same code path as a
 * shipped asset — normal-mapped standard material, fitted and overridable — so
 * the viewer is honest about what it will do with real geometry.
 */
export function PlaceholderModel({ overrides }: { overrides: Overrides }) {
  const ref = useRef<THREE.Mesh>(null);

  const normalMap = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    // Cheap value-noise height, differentiated into a tangent-space normal.
    const h = (x: number, y: number) => {
      const s = Math.sin(x * 0.17) * Math.cos(y * 0.13) + Math.sin((x + y) * 0.07) * 0.5;
      return s * 0.5 + 0.5;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = h(x + 1, y) - h(x - 1, y);
        const dy = h(x, y + 1) - h(x, y - 1);
        const n = new THREE.Vector3(-dx, -dy, 1).normalize();
        const i = (y * size + x) * 4;
        img.data[i] = (n.x * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  useEffect(() => {
    if (ref.current) applyOverrides(ref.current, overrides);
  }, [overrides]);

  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.7, 0.26, 256, 64]} />
      <meshStandardMaterial
        color="#b8b0a4"
        metalness={0.9}
        roughness={0.28}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1, 1)}
      />
    </mesh>
  );
}
