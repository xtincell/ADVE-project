"use client";

import type { AdvertisVector } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS, PILLAR_NAMES } from "@/lib/types/advertis-vector";

interface RadarMiniProps {
  vector: AdvertisVector;
  size?: number;
}

export function RadarMini({ vector, size = 180 }: RadarMiniProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38;
  const n = PILLAR_KEYS.length;

  function polarToCart(angle: number, radius: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const angleStep = 360 / n;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((pct) => {
    const r = maxRadius * pct;
    const points = PILLAR_KEYS.map((_, i) => {
      const p = polarToCart(i * angleStep, r);
      return `${p.x},${p.y}`;
    }).join(" ");
    return <polygon key={pct} points={points} fill="none" stroke="rgb(63, 63, 70)" strokeWidth="0.5" />;
  });

  // Data polygon
  const dataPoints = PILLAR_KEYS.map((k, i) => {
    const val = vector[k] / 25;
    const p = polarToCart(i * angleStep, maxRadius * val);
    return `${p.x},${p.y}`;
  }).join(" ");

  // Labels
  const labels = PILLAR_KEYS.map((k, i) => {
    const p = polarToCart(i * angleStep, maxRadius + 14);
    return (
      <text
        key={k}
        x={p.x}
        y={p.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-zinc-500 text-[9px] font-bold uppercase"
      >
        {PILLAR_NAMES[k][0]}
      </text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings}
      {/* Axes */}
      {PILLAR_KEYS.map((_, i) => {
        const p = polarToCart(i * angleStep, maxRadius);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgb(63, 63, 70)" strokeWidth="0.5" />;
      })}
      {/* Data */}
      <polygon points={dataPoints} fill="rgba(232, 75, 34, 0.15)" stroke="rgb(232, 75, 34)" strokeWidth="1.5" />
      {/* Score dots */}
      {PILLAR_KEYS.map((k, i) => {
        const val = vector[k] / 25;
        const p = polarToCart(i * angleStep, maxRadius * val);
        return <circle key={k} cx={p.x} cy={p.y} r="3" fill="rgb(232, 75, 34)" />;
      })}
      {labels}
      {/* Center score */}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-zinc-100 text-sm font-bold">
        {vector.composite}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="fill-zinc-500 text-[8px]">
        /200
      </text>
    </svg>
  );
}
