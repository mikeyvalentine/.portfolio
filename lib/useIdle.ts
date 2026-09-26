'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * True once nothing has touched the scene for `delay` ms.
 *
 * This is the gate for the hybrid renderer: rasterise while the user is
 * dragging, then hand the frame to the path tracer once they let go. `bump()`
 * is wired to the controls' change event rather than to DOM events, so a
 * camera still coasting on inertia counts as activity.
 */
export function useIdle(delay = 700) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = () => {
    setIdle(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), delay);
  };

  useEffect(() => {
    timer.current = setTimeout(() => setIdle(true), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [delay]);

  return { idle, bump };
}
