"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <CostMeter> — current USD cost of the live intent. Driven by Thot
 * (intent.completed events with costUsd).
 */
export function CostMeter({ intentId, className = "" }: Props) {
  const { progress } = useNeteruIntent(intentId);
  const cost = progress?.costSoFarUsd ?? 0;
  return (
    <span className={`cost-meter font-mono text-xs ${className}`} title="Coût LLM cumulé">
      ${cost.toFixed(3)}
    </span>
  );
}
