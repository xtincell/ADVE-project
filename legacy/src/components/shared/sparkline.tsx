"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  showArea?: boolean;
  trendColor?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  showDot = true,
  showArea = true,
  trendColor = true,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1]!.x} ${height} L ${points[0]!.x} ${height} Z`;

  const trend = data[data.length - 1]! - data[0]!;
  const resolvedColor =
    color || (trendColor ? (trend >= 0 ? "var(--color-success)" : "var(--color-destructive)") : "var(--color-primary)");

  const lastPoint = points[points.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Tendance: ${trend >= 0 ? "hausse" : "baisse"}`}
    >
      {showArea && (
        <path d={areaD} fill={resolvedColor} opacity={0.1} />
      )}
      <path d={pathD} fill="none" stroke={resolvedColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill={resolvedColor} />
      )}
    </svg>
  );
}
