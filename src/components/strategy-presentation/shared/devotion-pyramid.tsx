"use client";

const LEVELS = [
  { key: "evangeliste", label: "Evangeliste", color: "rgb(232, 75, 34)" },
  { key: "ambassadeur", label: "Ambassadeur", color: "rgb(245, 124, 0)" },
  { key: "engage", label: "Engage", color: "rgb(251, 176, 59)" },
  { key: "participant", label: "Participant", color: "rgb(124, 179, 66)" },
  { key: "interesse", label: "Interesse", color: "rgb(66, 165, 245)" },
  { key: "spectateur", label: "Spectateur", color: "rgb(158, 158, 158)" },
] as const;

interface DevotionPyramidProps {
  data: Record<string, number>;
  score: number;
}

export function DevotionPyramid({ data, score }: DevotionPyramidProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground-secondary">Pyramide de Devotion</h4>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-orange-400">
          Score: {score.toFixed(1)}
        </span>
      </div>
      <div className="space-y-1.5">
        {LEVELS.map(({ key, label, color }) => {
          const value = data[key] ?? 0;
          // lafusee:allow-adhoc-completion: devotion ladder pyramid distribution (audience tier %, not pillar)
          const pct = (value / total) * 100;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-right text-xs text-foreground-muted">{label}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-background/50">
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                  style={{ width: `${Math.max(pct, 1)}%`, background: color }}
                />
                <span className="relative z-10 flex h-full items-center px-2 text-xs font-bold text-white">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
