"use client";

const STAGES = [
  { key: "acquisition", label: "Acquisition", color: "rgb(66, 165, 245)", width: "100%" },
  { key: "activation", label: "Activation", color: "rgb(124, 179, 66)", width: "85%" },
  { key: "retention", label: "Retention", color: "rgb(251, 176, 59)", width: "65%" },
  { key: "revenue", label: "Revenue", color: "rgb(245, 124, 0)", width: "45%" },
  { key: "referral", label: "Referral", color: "rgb(232, 75, 34)", width: "30%" },
] as const;

interface AARRRFunnelProps {
  data: Record<string, unknown> | null;
}

export function AARRRFunnel({ data }: AARRRFunnelProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-zinc-300">Funnel AARRR</h4>
      <div className="space-y-2">
        {STAGES.map(({ key, label, color, width }) => {
          const raw = data?.[key];
          // Support multiple formats:
          // 1. string: "CAC cible <2000 FCFA..." (direct from pillar E)
          // 2. object: { strategie: "...", target: 1000, current: 0 }
          // 3. object: { target: 1000, current: 0, label: "Acquisition" }
          let strategy = "";
          let metric = "";
          if (typeof raw === "string") {
            strategy = raw.length > 100 ? raw.slice(0, 100) + "..." : raw;
          } else if (raw && typeof raw === "object") {
            const obj = raw as Record<string, unknown>;
            strategy = typeof obj.strategie === "string" ? obj.strategie : "";
            if (typeof obj.target === "number") {
              metric = `${obj.current ?? 0} / ${obj.target}`;
            }
          }

          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-full" style={{ maxWidth: width }}>
                <div
                  className="flex items-center justify-between rounded-lg px-4 py-2.5"
                  style={{ background: `${color}20`, borderLeft: `3px solid ${color}` }}
                >
                  <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                  <div className="flex items-center gap-2 max-w-[65%]">
                    {metric && (
                      <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                        {metric}
                      </span>
                    )}
                    {strategy && (
                      <span className="truncate text-right text-xs text-zinc-400">
                        {strategy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
