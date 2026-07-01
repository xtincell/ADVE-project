"use client";

interface CultIndexGaugeProps {
  score: number;
  tier: string;
}

const TIER_COLORS: Record<string, string> = {
  APPRENTI: "rgb(158, 158, 158)",
  COMPAGNON: "rgb(66, 165, 245)",
  MAITRE: "rgb(251, 176, 59)",
  ASSOCIE: "rgb(232, 75, 34)",
};

export function CultIndexGauge({ score, tier }: CultIndexGaugeProps) {
  const pct = Math.min(score, 100);
  const color = TIER_COLORS[tier] ?? "rgb(158, 158, 158)";
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="rgb(39, 39, 42)"
            strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score.toFixed(0)}</span>
        </div>
      </div>
      <span
        className="rounded-full px-3 py-0.5 text-xs font-bold uppercase"
        style={{ background: `${color}20`, color }}
      >
        {tier}
      </span>
    </div>
  );
}
