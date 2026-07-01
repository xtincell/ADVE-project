"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <SeshatTimeline> — horizontal timeline of OBSERVED events.
 */
export function SeshatTimeline({ intentId, className = "" }: Props) {
  const { history } = useNeteruIntent(intentId);
  const observed = history.filter((e) => e.phase === "OBSERVED");
  if (observed.length === 0) return null;
  return (
    <div className={`seshat-timeline flex gap-3 overflow-x-auto ${className}`}>
      {observed.map((e, i) => (
        <div key={i} className="flex min-w-[100px] flex-col items-center text-xs">
          <span className="opacity-50">
            {(e.emittedAt instanceof Date ? e.emittedAt : new Date(e.emittedAt))
              .toISOString()
              .slice(11, 19)}
          </span>
          <span>{e.message ?? "observation"}</span>
        </div>
      ))}
    </div>
  );
}
