"use client";

import { PILLAR_KEYS, PILLAR_METADATA } from "@/domain";
import type { PillarKey } from "@/domain";

interface Props {
  done: readonly PillarKey[];
  active?: PillarKey | null;
  className?: string;
}

/**
 * <CascadeProgress> — 8 nodes A→D→V→E→R→T→I→S that fill as the cascade
 * progresses. Drives the predictability narrative on every cascade page.
 */
export function CascadeProgress({ done, active = null, className = "" }: Props) {
  const doneSet = new Set(done);
  return (
    <ol className={`cascade-progress flex items-center gap-1 ${className}`}>
      {PILLAR_KEYS.map((k, idx) => {
        const isDone = doneSet.has(k);
        const isActive = active === k;
        return (
          <li
            key={k}
            className="flex items-center gap-1"
            title={PILLAR_METADATA[k].label}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-all ${
                isDone
                  ? "bg-current text-white"
                  : isActive
                    ? "border-current font-bold animate-pulse"
                    : "opacity-40"
              }`}
            >
              {k}
            </span>
            {idx < PILLAR_KEYS.length - 1 && (
              <span className="h-px w-3 bg-current opacity-30" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
