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
          const stageData = data?.[key] as Record<string, unknown> | undefined;
          const strategy = typeof stageData?.strategie === "string" ? stageData.strategie : "";

          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-full" style={{ maxWidth: width }}>
                <div
                  className="flex items-center justify-between rounded-lg px-4 py-2.5"
                  style={{ background: `${color}20`, borderLeft: `3px solid ${color}` }}
                >
                  <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                  {strategy && (
                    <span className="max-w-[60%] truncate text-right text-xs text-zinc-400">
                      {strategy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
