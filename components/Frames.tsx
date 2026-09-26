'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { View, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './Stage';
import { Model, PlaceholderModel } from './Model';
import { work, type WorkItem } from '@/lib/work';

/** Number of copies of the list rendered to make the loop seamless. */
const SETS = 3;

/**
 * One 3D frame.
 *
 * `View` renders a plain div and tracks its screen rect; the single Canvas
 * further down draws into that rect. This is the whole reason a list of live
 * objects is viable — browsers cap WebGL contexts at roughly 8-16, so one
 * canvas per frame would fail outright once the list grew.
 */
function ModelFrame({ src }: { src?: string }) {
  return (
    <View>
      <PerspectiveCamera makeDefault fov={35} position={[0, 0.3, 3.4]} />
      {/* No makeDefault: each View drives its own controls, and a shared
          default would let one frame steal another's camera. */}
      <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.08} />
      {/* postFX off: see Stage — a composer per View would fight over the canvas. */}
      <Stage exposure={1} aoIntensity={1.1} enabled={false} />
      {src ? <Model url={src} overrides={{}} /> : <PlaceholderModel overrides={{}} />}
    </View>
  );
}

function Frame({ item }: { item: WorkItem }) {
  // Inline styles read from the CSS variables set in globals.css, so the
  // margins stay in one place and are yours to change.
  return (
    <div className="frame" data-kind={item.kind}>
      {item.kind === 'video' && (
        <video src={item.src} autoPlay muted playsInline loop preload="metadata" />
      )}
      {item.kind === 'image' && <img src={item.src} alt="" />}
      {item.kind === 'model' && <ModelFrame src={item.src} />}
    </div>
  );
}

export function Frames() {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  /**
   * Seamless loop: the list is rendered SETS times and the scroll position is
   * teleported by exactly one set's height whenever it drifts out of the middle
   * set. Because the content either side is identical, the jump is invisible.
   */
  const wrap = useCallback(() => {
    const el = scroller.current;
    const tr = track.current;
    if (!el || !tr) return;
    const setHeight = tr.scrollHeight / SETS;
    if (setHeight <= 0) return;
    if (el.scrollTop < setHeight * 0.5) {
      el.scrollTop += setHeight;
    } else if (el.scrollTop > setHeight * 1.5) {
      el.scrollTop -= setHeight;
    }
  }, []);

  // Start in the middle set so there is content to scroll into both ways.
  useEffect(() => {
    const el = scroller.current;
    const tr = track.current;
    if (!el || !tr) return;
    el.scrollTop = tr.scrollHeight / SETS;
  }, []);

  const sets = Array.from({ length: SETS });

  return (
    <div ref={scroller} onScroll={wrap} className="scroller">
      <div ref={track}>
        {sets.map((_, s) => (
          <div key={s}>
            {work.map((item) => (
              <Frame key={`${s}-${item.id}`} item={item} />
            ))}
          </div>
        ))}
      </div>

      {/* One context for every model frame. Fixed and pointer-transparent so it
          never intercepts scrolling; View re-enables events over its own rect. */}
      <Canvas
        className="shared-canvas"
        eventSource={scroller as React.RefObject<HTMLElement>}
        dpr={[1, 2]}
        // With no post chain there is no composer to tone map, so the
        // renderer does it. MSAA is on for the same reason (no SMAA pass).
        gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping }}
      >
        <View.Port />
      </Canvas>
    </div>
  );
}
