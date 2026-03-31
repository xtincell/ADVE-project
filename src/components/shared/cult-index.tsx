"use client";

import { useEffect, useState, useRef } from "react";

type CultTier = "GHOST" | "FUNCTIONAL" | "LOVED" | "EMERGING" | "CULT";

interface CultIndexProps {
  score: number;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  variant?: "gauge" | "compact";
  animated?: boolean;
  className?: string;
}

const TIER_CONFIG: { tier: CultTier; label: string; min: number; max: number; color: string }[] = [
  { tier: "GHOST", label: "Ghost", min: 0, max: 20, color: "var(--color-class-zombie)" },
  { tier: "FUNCTIONAL", label: "Functional", min: 20, max: 40, color: "var(--color-tier-apprenti)" },
  { tier: "LOVED", label: "Loved", min: 40, max: 60, color: "var(--color-division-signal)" },
  { tier: "EMERGING", label: "Emerging", min: 60, max: 80, color: "var(--color-division-oracle)" },
  { tier: "CULT", label: "Cult", min: 80, max: 100, color: "var(--color-class-icone)" },
];

function getTier(score: number) {
  return TIER_CONFIG.find((t) => score >= t.min && score <= t.max) ?? TIER_CONFIG[0]!;
}

export function CultIndex({
  score,
  trend,
  trendValue,
  variant = "gauge",
  animated = true,
  className,
}: CultIndexProps) {
  const tier = getTier(score);
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [needleAngle, setNeedleAngle] = useState(animated ? 0 : (score / 100) * 180);
  const animRef = useRef(false);

  useEffect(() => {
    if (!animated || animRef.current) {
      setDisplayScore(score);
      setNeedleAngle((score / 100) * 180);
      return;
    }
    animRef.current = true;

    const duration = 800;
    const start = performance.now();
    const targetAngle = (score / 100) * 180;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // spring-like easing
      const eased = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5);
      setDisplayScore(Math.round(score * eased));
      setNeedleAngle(targetAngle * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, animated]);

  if (variant === "compact") {
    const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
    const trendColorClass = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-foreground-muted";

    return (
      <div className={`flex items-baseline gap-2 ${className ?? ""}`}>
        <span className="text-3xl font-bold" style={{ color: tier.color }}>{displayScore}</span>
        <span className="text-sm text-foreground-muted">/100</span>
        {trend && (
          <span className={`text-sm font-semibold ${trendColorClass}`}>
            {trendIcon} {trendValue !== undefined && `${trendValue > 0 ? "+" : ""}${trendValue}`}
          </span>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: `color-mix(in oklch, ${tier.color} 15%, transparent)`,
            color: tier.color,
          }}
        >
          {tier.label}
        </span>
      </div>
    );
  }

  // Gauge variant
  const gaugeWidth = 240;
  const gaugeHeight = 140;
  const cx = gaugeWidth / 2;
  const cy = gaugeHeight - 10;
  const outerR = 100;
  const innerR = 75;
  const needleLen = 70;

  return (
    <div className={`flex flex-col items-center ${className ?? ""}`}>
      <svg
        width={gaugeWidth}
        height={gaugeHeight}
        viewBox={`0 0 ${gaugeWidth} ${gaugeHeight}`}
        role="img"
        aria-label={`Cult Index: ${score} sur 100, tier ${tier.label}`}
      >
        {/* Tier arc segments */}
        {TIER_CONFIG.map((t) => {
          const startAngle = Math.PI + (t.min / 100) * Math.PI;
          const endAngle = Math.PI + (t.max / 100) * Math.PI;
          const x1Out = cx + outerR * Math.cos(startAngle);
          const y1Out = cy + outerR * Math.sin(startAngle);
          const x2Out = cx + outerR * Math.cos(endAngle);
          const y2Out = cy + outerR * Math.sin(endAngle);
          const x1In = cx + innerR * Math.cos(endAngle);
          const y1In = cy + innerR * Math.sin(endAngle);
          const x2In = cx + innerR * Math.cos(startAngle);
          const y2In = cy + innerR * Math.sin(startAngle);

          return (
            <path
              key={t.tier}
              d={`M ${x1Out} ${y1Out} A ${outerR} ${outerR} 0 0 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${innerR} ${innerR} 0 0 0 ${x2In} ${y2In} Z`}
              fill={t.color}
              opacity={t.tier === tier.tier ? 1 : 0.25}
              className="transition-opacity duration-slow"
            />
          );
        })}

        {/* Needle */}
        {(() => {
          const angle = Math.PI + (needleAngle / 180) * Math.PI;
          const nx = cx + needleLen * Math.cos(angle);
          const ny = cy + needleLen * Math.sin(angle);
          return (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke="var(--color-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="4" fill="var(--color-foreground)" />
            </>
          );
        })()}

        {/* Center score */}
        <text x={cx} y={cy - 20} textAnchor="middle" className="text-2xl font-bold" fill="var(--color-foreground)">
          {displayScore}
        </text>
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-[10px]" fill={tier.color}>
          {tier.label.toUpperCase()}
        </text>
      </svg>

      {/* Trend */}
      {trend && (
        <div className="mt-1 flex items-center gap-1">
          <span
            className={`text-xs font-semibold ${
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-foreground-muted"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            {trendValue !== undefined && ` ${trendValue > 0 ? "+" : ""}${trendValue}`}
          </span>
          <span className="text-[10px] text-foreground-muted">ce mois</span>
        </div>
      )}
    </div>
  );
}
