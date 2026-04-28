"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <NeteruActivityRail> — small persistent rail showing which Neteru is
 * currently active (Mestor / Artemis / Seshat / Thot).
 */
export function NeteruActivityRail({ intentId, className = "" }: Props) {
  const { progress, isStreaming } = useNeteruIntent(intentId);
  const active = progress?.governor ?? null;
  return (
    <div className={`neteru-activity-rail flex items-center gap-2 ${className}`}>
      {(["MESTOR", "ARTEMIS", "SESHAT", "THOT"] as const).map((g) => {
        const on = active === g && isStreaming;
        return (
          <span
            key={g}
            className={`text-[10px] uppercase tracking-wider ${on ? "font-semibold" : "opacity-40"}`}
          >
            {g}
            {on && <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
          </span>
        );
      })}
    </div>
  );
}
