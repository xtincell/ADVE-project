"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <NeteruActivityRail> — small persistent rail showing which Neter (parmi les 5
 * actifs : Mestor / Artemis / Seshat / Thot / Ptah) is currently dispatching.
 * Imhotep et Anubis sont pré-réservés (ADR-0010/0011), affichés en disclosure
 * uniquement quand activés (Phase 7+/8+).
 */
export function NeteruActivityRail({ intentId, className = "" }: Props) {
  const { progress, isStreaming } = useNeteruIntent(intentId);
  const active = progress?.governor ?? null;
  return (
    <div className={`neteru-activity-rail flex items-center gap-2 ${className}`}>
      {(["MESTOR", "ARTEMIS", "SESHAT", "THOT", "PTAH"] as const).map((g) => {
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
