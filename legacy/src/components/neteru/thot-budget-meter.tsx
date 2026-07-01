"use client";

interface Props {
  spentUsd: number;
  capacityUsd: number;
  className?: string;
}

/**
 * <ThotBudgetMeter> — current operator budget consumption.
 */
export function ThotBudgetMeter({ spentUsd, capacityUsd, className = "" }: Props) {
  const pct = Math.min(100, Math.round((spentUsd / Math.max(capacityUsd, 1)) * 100));
  const danger = pct > 85;
  return (
    <div className={`thot-budget-meter ${className}`}>
      <div className="flex justify-between text-xs">
        <span>Thot — budget</span>
        <span className={danger ? "font-medium" : ""}>
          ${spentUsd.toFixed(2)} / ${capacityUsd.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/10">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: danger ? "var(--color-warning, #d97706)" : "var(--color-accent, #6366f1)",
          }}
        />
      </div>
    </div>
  );
}
