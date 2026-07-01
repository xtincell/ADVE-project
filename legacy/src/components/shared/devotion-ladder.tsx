"use client";

import { useEffect, useState, useRef } from "react";

interface DevotionLadderProps {
  spectateur: number;
  interesse: number;
  participant: number;
  engage: number;
  ambassadeur: number;
  evangeliste: number;
  variant?: "pyramid" | "bars";
  animated?: boolean;
  className?: string;
}

const LEVELS = [
  { key: "evangeliste" as const, label: "Evangeliste", color: "var(--color-devotion-evangeliste)", icon: "★" },
  { key: "ambassadeur" as const, label: "Ambassadeur", color: "var(--color-devotion-ambassadeur)", icon: "◆" },
  { key: "engage" as const, label: "Engage", color: "var(--color-devotion-engage)", icon: "●" },
  { key: "participant" as const, label: "Participant", color: "var(--color-devotion-participant)", icon: "▲" },
  { key: "interesse" as const, label: "Interesse", color: "var(--color-devotion-interesse)", icon: "◇" },
  { key: "spectateur" as const, label: "Spectateur", color: "var(--color-devotion-spectateur)", icon: "○" },
];

export function DevotionLadder({
  variant = "pyramid",
  animated = true,
  className,
  ...values
}: DevotionLadderProps) {
  const [revealed, setRevealed] = useState(!animated);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(timer);
  }, [animated]);

  const activeLevel = LEVELS.find((l) => values[l.key] >= 5);

  if (variant === "bars") {
    return (
      <div className={`space-y-2 ${className ?? ""}`} role="img" aria-label="Devotion Ladder">
        {LEVELS.map(({ key, label, color }) => {
          const value = values[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-right text-xs font-medium text-foreground-secondary">{label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-background-overlay" style={{ height: "20px" }}>
                <div
                  className="flex h-full items-center justify-end rounded-full pr-2 transition-all duration-slower ease-out"
                  style={{
                    width: revealed ? `${Math.max(value, 2)}%` : "0%",
                    backgroundColor: color,
                  }}
                >
                  {value >= 5 && (
                    <span className="text-[10px] font-bold text-background">{value.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              {value < 5 && (
                <span className="w-8 text-[10px] text-foreground-muted">{value.toFixed(0)}%</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Pyramid variant — heroic visualization
  const pyramidWidth = 300;
  const pyramidHeight = 360;
  const tierHeight = 52;
  const baseWidth = 260;
  const topWidth = 60;

  return (
    <div ref={ref} className={`flex flex-col items-center ${className ?? ""}`}>
      <div className="relative" style={{ width: pyramidWidth, height: pyramidHeight }}>
        {LEVELS.map((level, i) => {
          const value = values[level.key];
          const isActive = level.key === activeLevel?.key;
          const layerIndex = i; // 0 = top (evangeliste), 5 = bottom (spectateur)
          const progress = layerIndex / (LEVELS.length - 1); // 0→1 from top to bottom
          const width = topWidth + (baseWidth - topWidth) * progress;
          const x = (pyramidWidth - width) / 2;
          const y = layerIndex * tierHeight + 8;

          return (
            <div
              key={level.key}
              className="absolute flex items-center justify-center transition-all"
              style={{
                left: x,
                top: y,
                width: width,
                height: tierHeight - 4,
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(12px)",
                transitionDelay: animated ? `${(LEVELS.length - 1 - i) * 100}ms` : "0ms",
                transitionDuration: "400ms",
                transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
            >
              {/* Trapezoid layer */}
              <svg
                className="absolute inset-0"
                viewBox={`0 0 ${width} ${tierHeight - 4}`}
                preserveAspectRatio="none"
              >
                <defs>
                  {isActive && (
                    <filter id={`glow-${level.key}`}>
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  )}
                </defs>
                <path
                  d={`M ${width * 0.08} 0 L ${width * 0.92} 0 L ${width} ${tierHeight - 4} L 0 ${tierHeight - 4} Z`}
                  fill={level.color}
                  opacity={isActive ? 0.9 : 0.2 + (value / 100) * 0.5}
                  filter={isActive ? `url(#glow-${level.key})` : undefined}
                  className="transition-opacity duration-slow"
                />
              </svg>

              {/* Content */}
              <div className="relative z-10 flex w-full items-center justify-between px-4">
                <span
                  className={`text-xs font-semibold ${
                    isActive || value >= 10
                      ? "text-background"
                      : "text-foreground-secondary"
                  }`}
                  style={
                    isActive || value >= 10 ? undefined : { color: level.color }
                  }
                >
                  {level.icon} {level.label}
                </span>
                <span
                  className={`text-sm font-bold ${
                    isActive || value >= 10 ? "text-background" : "text-foreground-muted"
                  }`}
                  style={
                    isActive || value >= 10 ? undefined : { color: level.color }
                  }
                >
                  {value.toFixed(1)}%
                </span>
              </div>

              {/* Active glow particles (CSS only) */}
              {isActive && animated && (
                <>
                  <div
                    className="absolute -top-1 left-1/4 h-1 w-1 rounded-full animate-[particle-rise_2s_ease-out_infinite]"
                    style={{ backgroundColor: level.color, animationDelay: "0s" }}
                  />
                  <div
                    className="absolute -top-1 left-1/2 h-1 w-1 rounded-full animate-[particle-rise_2s_ease-out_infinite]"
                    style={{ backgroundColor: level.color, animationDelay: "0.7s" }}
                  />
                  <div
                    className="absolute -top-1 left-3/4 h-1 w-1 rounded-full animate-[particle-rise_2s_ease-out_infinite]"
                    style={{ backgroundColor: level.color, animationDelay: "1.4s" }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
