/**
 * Sprint G — AnubisCostPerSuperfanBadge reusable component.
 *
 * Badge KPI primaire ADR-0011 §3 : `cost_per_superfan_recruited`.
 * Affiche projected vs benchmark avec couleur selon le ratio (vert ≤ 1×,
 * jaune 1-2×, rouge > 2× = Thot veto risk).
 */

interface AnubisCostPerSuperfanBadgeProps {
  projected: number;
  benchmark: number | null;
  currency?: string;
}

export function AnubisCostPerSuperfanBadge({
  projected,
  benchmark,
  currency = "XAF",
}: AnubisCostPerSuperfanBadgeProps) {
  if (benchmark == null) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-foreground-muted">
        cost_per_superfan: <strong className="text-foreground">{projected.toFixed(2)} {currency}</strong>
        <span className="ml-1 text-foreground-muted">benchmark n/a</span>
      </div>
    );
  }
  const ratio = projected / benchmark;
  const tone = ratio <= 1 ? "ok" : ratio <= 2 ? "warn" : "danger";
  const colorClass =
    tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : tone === "warn" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
    : "border-red-500/40 bg-red-500/10 text-red-300";
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${colorClass}`}>
      cost_per_superfan: <strong>{projected.toFixed(2)} {currency}</strong>
      <span>vs bench {benchmark.toFixed(2)} = <strong>{ratio.toFixed(2)}×</strong></span>
      {tone === "danger" && <span>⚠ Thot veto</span>}
    </div>
  );
}
