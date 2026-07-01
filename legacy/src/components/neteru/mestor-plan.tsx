"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <MestorPlan> — shows what Mestor decided before execution starts.
 * Renders the deliberated plan + the lifecycle phase.
 */
export function MestorPlan({ intentId, className = "" }: Props) {
  const { progress, history } = useNeteruIntent(intentId);
  const deliberated = history.find((e) => e.phase === "DELIBERATED") ?? progress;
  if (!deliberated) {
    return (
      <div className={`mestor-plan-skeleton ${className}`}>
        <span className="text-sm opacity-60">Mestor délibère…</span>
      </div>
    );
  }
  return (
    <div className={`mestor-plan ${className}`}>
      <div className="text-xs uppercase tracking-wide opacity-60">Plan Mestor</div>
      <div className="mt-1 text-sm">{deliberated.message ?? deliberated.kind}</div>
    </div>
  );
}
