"use client";

import { useEffect, useState, useRef } from "react";
import { classifyBrand, type BrandClassification } from "@/lib/types/advertis-vector";

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  delta?: number;
  showClassification?: boolean;
  showRing?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
  /** "console" = score brut /200 (Fixer). "cockpit" = % + statut qualitatif (Client). Default: "console". */
  mode?: "console" | "cockpit";
}

const CLASSIFICATION_COLORS: Record<BrandClassification, string> = {
  ZOMBIE: "var(--color-class-zombie)",
  ORDINAIRE: "var(--color-class-ordinaire)",
  FORTE: "var(--color-class-forte)",
  CULTE: "var(--color-class-culte)",
  ICONE: "var(--color-class-icone)",
};

const CLASSIFICATION_LABELS: Record<BrandClassification, string> = {
  ZOMBIE: "Zombie",
  ORDINAIRE: "Ordinaire",
  FORTE: "Forte",
  CULTE: "Culte",
  ICONE: "Icone",
};

// Chantier 9 — Labels client-friendly (Cockpit mode)
const CLASSIFICATION_LABELS_CLIENT: Record<BrandClassification, string> = {
  ZOMBIE: "Critique",
  ORDINAIRE: "En progrès",
  FORTE: "Solide",
  CULTE: "Excellente",
  ICONE: "Exceptionnelle",
};

const SIZE_CONFIG = {
  sm: { diameter: 48, strokeWidth: 3, scoreClass: "text-sm font-bold", maxClass: "text-[8px]", labelClass: "text-[8px]" },
  md: { diameter: 80, strokeWidth: 4, scoreClass: "text-2xl font-bold", maxClass: "text-[10px]", labelClass: "text-[10px]" },
  lg: { diameter: 120, strokeWidth: 5, scoreClass: "text-4xl font-bold", maxClass: "text-xs", labelClass: "text-xs" },
  xl: { diameter: 160, strokeWidth: 6, scoreClass: "text-5xl font-bold", maxClass: "text-sm", labelClass: "text-sm" },
};

export function ScoreBadge({
  score,
  maxScore = 200,
  delta,
  showClassification = true,
  showRing = true,
  size = "md",
  animated = true,
  className,
  mode = "console",
}: ScoreBadgeProps) {
  const classification = classifyBrand(score);
  const color = CLASSIFICATION_COLORS[classification];
  const config = SIZE_CONFIG[size];
  const isCockpit = mode === "cockpit";
  const pctScore = Math.round((score / maxScore) * 100);
  const labels = isCockpit ? CLASSIFICATION_LABELS_CLIENT : CLASSIFICATION_LABELS;

  const [displayScore, setDisplayScore] = useState(animated ? 0 : (isCockpit ? pctScore : score));
  const [ringProgress, setRingProgress] = useState(animated ? 0 : 1);
  const animatedRef = useRef(false);

  const targetDisplay = isCockpit ? pctScore : score;

  useEffect(() => {
    if (!animated || animatedRef.current) {
      setDisplayScore(targetDisplay);
      setRingProgress(1);
      return;
    }
    animatedRef.current = true;

    const duration = 800;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setDisplayScore(Math.round(targetDisplay * eased));
      setRingProgress(eased);

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [targetDisplay, animated]);

  const r = (config.diameter - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const fillRatio = (score / maxScore) * ringProgress;
  const dashOffset = circumference * (1 - fillRatio);

  return (
    <div className={`relative inline-flex flex-col items-center gap-1 ${className ?? ""}`}>
      {showRing ? (
        <div className="relative" style={{ width: config.diameter, height: config.diameter }}>
          <svg
            width={config.diameter}
            height={config.diameter}
            viewBox={`0 0 ${config.diameter} ${config.diameter}`}
            className="-rotate-90"
            role="img"
            aria-label={isCockpit ? `Sante de marque ${pctScore}%, ${labels[classification]}` : `Score ${score} sur ${maxScore}, ${labels[classification]}`}
          >
            {/* Background ring */}
            <circle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={r}
              fill="none"
              stroke="var(--color-border-subtle)"
              strokeWidth={config.strokeWidth}
            />
            {/* Progress ring */}
            <circle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-slower ease-out"
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${config.scoreClass} text-foreground leading-none`}>
              {displayScore}
            </span>
            <span className={`${config.maxClass} text-foreground-muted leading-none`}>
              {isCockpit ? "%" : `/${maxScore}`}
            </span>
          </div>

          {/* Delta badge */}
          {delta !== undefined && delta !== 0 && size !== "sm" && (
            <span
              className={`absolute -right-1 -top-1 flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                delta > 0 ? "bg-success-subtle text-success" : "bg-destructive-subtle text-destructive"
              }`}
            >
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={`${config.scoreClass} text-foreground`}>{displayScore}</span>
          <span className={`${config.maxClass} text-foreground-muted`}>{isCockpit ? "%" : `/${maxScore}`}</span>
          {delta !== undefined && delta !== 0 && (
            <span
              className={`ml-1 text-xs font-bold ${
                delta > 0 ? "text-success" : "text-destructive"
              }`}
            >
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
        </div>
      )}

      {showClassification && (
        <span
          className={`rounded-full px-2.5 py-0.5 ${config.labelClass} font-semibold`}
          style={{
            backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
            color: color,
          }}
        >
          {labels[classification]}
        </span>
      )}
    </div>
  );
}
