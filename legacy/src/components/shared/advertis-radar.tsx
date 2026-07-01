"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type PillarKey, PILLAR_NAMES, PILLAR_KEYS } from "@/lib/types/advertis-vector";

/* ───────── Pillar color mapping (CSS custom properties) ───────── */
const PILLAR_COLORS: Record<PillarKey, string> = {
  a: "var(--color-pillar-a)",
  d: "var(--color-pillar-d)",
  v: "var(--color-pillar-v)",
  e: "var(--color-pillar-e)",
  r: "var(--color-pillar-r)",
  t: "var(--color-pillar-t)",
  i: "var(--color-pillar-i)",
  s: "var(--color-pillar-s)",
};

/* ───────── Size presets ───────── */
type RadarSize = "xs" | "sm" | "md" | "lg";
const SIZE_MAP: Record<RadarSize, number> = { xs: 80, sm: 160, md: 280, lg: 400 };

/* ───────── Props ───────── */
interface AdvertisRadarProps {
  scores: Partial<Record<PillarKey, number>>;
  comparisonScores?: Partial<Record<PillarKey, number>>;
  comparisonLabel?: string;
  maxScore?: number;
  size?: RadarSize | number;
  variant?: "full" | "mini";
  interactive?: boolean;
  drillDownBasePath?: string;
  onPillarClick?: (pillar: PillarKey) => void;
  className?: string;
  animated?: boolean;
  /** Override which pillars to show (default: all 8 ADVE-RTIS) */
  pillarKeys?: PillarKey[];
}

const DEFAULT_PILLAR_ORDER: PillarKey[] = [...PILLAR_KEYS];

export function AdvertisRadar({
  scores,
  comparisonScores,
  comparisonLabel = "M-1",
  maxScore = 25,
  size: sizeProp = "md",
  variant = "full",
  interactive = true,
  drillDownBasePath,
  onPillarClick,
  className,
  animated = true,
  pillarKeys,
}: AdvertisRadarProps) {
  const PILLAR_ORDER = pillarKeys ?? DEFAULT_PILLAR_ORDER;
  const router = useRouter();
  const [hoveredPillar, setHoveredPillar] = useState<PillarKey | null>(null);

  const numericSize = typeof sizeProp === "number" ? sizeProp : SIZE_MAP[sizeProp];
  const isMini = variant === "mini" || numericSize <= 100;

  const center = numericSize / 2;
  const radius = (numericSize / 2) * (isMini ? 0.85 : 0.65);
  const angleStep = (2 * Math.PI) / PILLAR_ORDER.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / maxScore) * radius;
    // Round to 2 decimals to avoid SSR/client hydration mismatch from float precision
    return {
      x: Math.round((center + r * Math.cos(angle)) * 100) / 100,
      y: Math.round((center + r * Math.sin(angle)) * 100) / 100,
    };
  };

  const dataPoints = useMemo(
    () => PILLAR_ORDER.map((key, i) => ({ ...getPoint(i, scores[key] ?? 0), key })),
    [scores, radius, center]
  );

  const comparisonPoints = useMemo(
    () =>
      comparisonScores
        ? PILLAR_ORDER.map((key, i) => getPoint(i, comparisonScores[key] ?? 0))
        : null,
    [comparisonScores, radius, center]
  );

  const buildPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  const dataPath = buildPath(dataPoints);
  const comparisonPath = comparisonPoints ? buildPath(comparisonPoints) : null;

  const gridPaths = [0.25, 0.5, 0.75, 1].map((pct) => {
    const points = PILLAR_ORDER.map((_, i) => getPoint(i, maxScore * pct));
    return buildPath(points);
  });

  const handlePillarClick = (pillar: PillarKey) => {
    if (onPillarClick) {
      onPillarClick(pillar);
    } else if (drillDownBasePath) {
      router.push(`${drillDownBasePath}#pillar-${pillar}`);
    }
  };

  const composite = PILLAR_ORDER.reduce((sum, key) => sum + (scores[key] ?? 0), 0);

  return (
    <div className={`relative inline-block ${className || ""}`}>
      <svg
        width={numericSize}
        height={numericSize}
        viewBox={`0 0 ${numericSize} ${numericSize}`}
        role="img"
        aria-label={`Radar ADVE-RTIS : score composite ${composite.toFixed(0)} sur 200`}
      >
        {/* Grid lines */}
        {!isMini &&
          gridPaths.map((path, i) => (
            <path
              key={`grid-${i}`}
              d={path}
              fill="none"
              stroke="var(--color-border-subtle)"
              strokeWidth="0.5"
              opacity={0.5}
            />
          ))}

        {/* Axis lines */}
        {!isMini &&
          PILLAR_ORDER.map((_, i) => {
            const p = getPoint(i, maxScore);
            return (
              <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="var(--color-border-subtle)"
                strokeWidth="0.5"
                opacity={0.3}
              />
            );
          })}

        {/* Comparison polygon (ghost, dashed) */}
        {comparisonPath && (
          <path
            d={comparisonPath}
            fill="var(--color-foreground-muted)"
            fillOpacity={0.05}
            stroke="var(--color-foreground-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity={0.5}
          />
        )}

        {/* Main data polygon */}
        <defs>
          <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <path
          d={dataPath}
          fill="url(#radar-gradient)"
          stroke="var(--color-primary)"
          strokeWidth={isMini ? 1.5 : 2}
          strokeLinejoin="round"
          className={animated ? "origin-center animate-[radar-expand_600ms_cubic-bezier(0.175,0.885,0.32,1.275)]" : ""}
        />

        {/* Data points with pillar colors */}
        {!isMini &&
          dataPoints.map((point) => {
            const isHovered = hoveredPillar === point.key;
            const score = scores[point.key] ?? 0;
            const compScore = comparisonScores?.[point.key];
            const delta = compScore !== undefined ? score - compScore : undefined;
            const hasBigChange = delta !== undefined && Math.abs(delta) > 2;

            return (
              <g key={`point-${point.key}`}>
                {/* Pulse for significant changes */}
                {hasBigChange && animated && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill={PILLAR_COLORS[point.key]}
                    opacity={0.3}
                    className="animate-[pulse-dot_2s_ease-in-out_infinite]"
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 7 : 5}
                  fill={PILLAR_COLORS[point.key]}
                  stroke="var(--color-background)"
                  strokeWidth="2"
                  className="transition-all duration-fast cursor-pointer"
                  onMouseEnter={() => interactive && setHoveredPillar(point.key)}
                  onMouseLeave={() => setHoveredPillar(null)}
                  onClick={() => interactive && handlePillarClick(point.key)}
                />
              </g>
            );
          })}

        {/* Labels */}
        {!isMini &&
          PILLAR_ORDER.map((key, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const labelRadius = radius + (numericSize > 200 ? 28 : 20);
            const x = Math.round((center + labelRadius * Math.cos(angle)) * 100) / 100;
            const y = Math.round((center + labelRadius * Math.sin(angle)) * 100) / 100;
            const isHovered = hoveredPillar === key;
            const score = scores[key] ?? 0;

            return (
              <text
                key={`label-${key}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`cursor-pointer font-medium transition-all duration-fast ${
                  isHovered ? "text-[13px]" : "text-[11px]"
                }`}
                fill={isHovered ? PILLAR_COLORS[key] : "var(--color-foreground-secondary)"}
                onMouseEnter={() => interactive && setHoveredPillar(key)}
                onMouseLeave={() => setHoveredPillar(null)}
                onClick={() => interactive && handlePillarClick(key)}
              >
                {key.toUpperCase()} {numericSize >= 280 ? `(${score.toFixed(0)})` : ""}
              </text>
            );
          })}
      </svg>

      {/* Tooltip */}
      {interactive && hoveredPillar && !isMini && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-background-raised px-3 py-2 shadow-lg animate-[fade-in_100ms_ease-out]"
          style={{
            left: "50%",
            bottom: "100%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: PILLAR_COLORS[hoveredPillar] }}>
            {hoveredPillar.toUpperCase()} — {PILLAR_NAMES[hoveredPillar]}
          </p>
          <p className="text-sm font-bold text-foreground">
            {(scores[hoveredPillar] ?? 0).toFixed(1)} / {maxScore}
          </p>
          {comparisonScores?.[hoveredPillar] !== undefined && (
            <p className="text-xs text-foreground-muted">
              {comparisonLabel}: {comparisonScores[hoveredPillar]!.toFixed(1)}
              {" "}
              <span
                className={
                  (scores[hoveredPillar] ?? 0) >= comparisonScores[hoveredPillar]!
                    ? "text-success"
                    : "text-destructive"
                }
              >
                ({(scores[hoveredPillar] ?? 0) >= comparisonScores[hoveredPillar]! ? "+" : ""}
                {((scores[hoveredPillar] ?? 0) - comparisonScores[hoveredPillar]!).toFixed(1)})
              </span>
            </p>
          )}
        </div>
      )}

      {/* Legend for comparison mode */}
      {!isMini && comparisonScores && numericSize >= 280 && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-primary" />
            <span className="text-foreground-secondary">Actuel</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 border-t border-dashed border-foreground-muted" />
            <span className="text-foreground-muted">{comparisonLabel}</span>
          </span>
        </div>
      )}
    </div>
  );
}
