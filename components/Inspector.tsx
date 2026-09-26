'use client';

import type { InspectControl } from '@/lib/projects';
import type { Overrides } from './Model';

/**
 * Live shader controls.
 *
 * Worth having on a 3D portfolio for its own sake: letting someone scrub
 * roughness or normal intensity on your asset demonstrates that you understand
 * the shading, which a static beauty render cannot.
 */
export function Inspector({
  controls,
  values,
  onChange,
}: {
  controls: InspectControl[];
  values: Overrides;
  onChange: (key: InspectControl['key'], value: number) => void;
}) {
  return (
    <div className="absolute right-4 top-4 w-56 space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4 backdrop-blur">
      {controls.map((c) => {
        const value = values[c.key] ?? c.default;
        return (
          <label key={c.key} className="block">
            <span className="flex justify-between text-[10px] uppercase tracking-widest text-neutral-400">
              {c.label}
              <span className="tabular-nums text-neutral-500">{value.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={value}
              onChange={(e) => onChange(c.key, Number(e.target.value))}
              className="mt-1.5 w-full accent-neutral-300"
            />
          </label>
        );
      })}
    </div>
  );
}
