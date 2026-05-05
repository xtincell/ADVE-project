import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import { cn } from "@/lib/utils";
import { type PillarKey, PILLAR_NAMES } from "@/lib/types/advertis-vector";

interface PillarProgressProps {
  scores: Partial<Record<PillarKey, number>>;
  maxScore?: number;
  className?: string;
}

const PILLAR_ORDER: PillarKey[] = [...PILLAR_STORAGE_KEYS];

const PILLAR_COLORS: Record<PillarKey, { bar: string; bg: string }> = {
  a: { bar: "bg-purple-500", bg: "bg-purple-500/15" },
  d: { bar: "bg-blue-500", bg: "bg-blue-500/15" },
  v: { bar: "bg-emerald-500", bg: "bg-emerald-500/15" },
  e: { bar: "bg-amber-500", bg: "bg-amber-500/15" },
  r: { bar: "bg-error", bg: "bg-error/15" },
  t: { bar: "bg-sky-500", bg: "bg-sky-500/15" },
  i: { bar: "bg-orange-500", bg: "bg-orange-500/15" },
  s: { bar: "bg-pink-500", bg: "bg-pink-500/15" },
};

export function PillarProgress({
  scores,
  maxScore = 25,
  className,
}: PillarProgressProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {PILLAR_ORDER.map((key) => {
        const value = scores[key] ?? 0;
        const pct = Math.min((value / maxScore) * 100, 100);
        const colors = PILLAR_COLORS[key];

        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm font-bold text-foreground-secondary">
              {key.toUpperCase()}
            </span>
            <span className="w-28 truncate text-xs text-foreground-muted">
              {PILLAR_NAMES[key]}
            </span>
            <div
              className={cn(
                "relative h-5 flex-1 overflow-hidden rounded-full",
                colors.bg,
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  colors.bar,
                )}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="w-12 text-right text-sm font-semibold text-foreground-secondary">
              {value.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
