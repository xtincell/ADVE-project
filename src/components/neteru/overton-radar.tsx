"use client";

/**
 * <OvertonRadar /> — Neteru UI component (P5 / MISSION drift 5).
 *
 * Mission contribution: DIRECT_OVERTON. The founder pilots not only
 * their fusée but their *Overton bend* — this component is the
 * cockpit instrument that makes the bend visible. Without it, the
 * founder hears about Overton in the strategy but never sees their
 * brand actively deflecting their sector's cultural axis.
 *
 * Data : sector-intelligence service.
 *  - sectorAxis: the sector's current cultural center
 *  - brandTags: orientation derived from pillar D (positioning)
 *  - deflection: brand minus sector — the literal pull the brand exerts
 *
 * Visual: 8-direction polar plot. Each axis tag is a spoke. Sector
 * center is a soft circle. Brand position is a sharper marker. The
 * deflection magnitude is the radial distance.
 *
 * Sector reference / imitation alerts (Tarsis-fed):
 *   - emergedNarratives → secteur cite la marque (signal Overton+)
 *   - fadedNarratives  → ennemis abandonnent leur position (signal Overton+)
 */

import { useMemo } from "react";

interface SectorAxis {
  tags: Record<string, number>;
  confidence: number;
  samples: number;
}

interface OvertonRadarProps {
  sectorAxis: SectorAxis | null;
  brandTags: Record<string, number>;
  /** ISO date last refresh */
  lastObservedAt?: string | null;
  /** Citations / mentions / imitations detected by Tarsis. */
  emergedNarratives?: string[];
  /** Narratives the sector abandoned. */
  fadedNarratives?: string[];
  /** Compact mode for sidebar. */
  compact?: boolean;
}

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = SIZE * 0.42;

export function OvertonRadar({
  sectorAxis,
  brandTags,
  lastObservedAt,
  emergedNarratives = [],
  fadedNarratives = [],
  compact = false,
}: OvertonRadarProps) {
  const allTags = useMemo(() => {
    const set = new Set([...Object.keys(sectorAxis?.tags ?? {}), ...Object.keys(brandTags)]);
    return Array.from(set).slice(0, 8); // cap visual density
  }, [sectorAxis, brandTags]);

  const deflection = useMemo(() => {
    let sumSquares = 0;
    let alignDot = 0;
    let aMag = 0;
    let bMag = 0;
    for (const tag of allTags) {
      const b = brandTags[tag] ?? 0;
      const s = sectorAxis?.tags[tag] ?? 0;
      sumSquares += (b - s) ** 2;
      alignDot += b * s;
      aMag += b * b;
      bMag += s * s;
    }
    return {
      magnitude: Math.sqrt(sumSquares),
      alignment: aMag && bMag ? alignDot / Math.sqrt(aMag * bMag) : 0,
    };
  }, [allTags, brandTags, sectorAxis]);

  if (!sectorAxis) {
    return (
      <div className={"rounded-xl border border-border bg-background/60 p-6 " + (compact ? "" : "min-h-[320px]")}>
        <header className="mb-3">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Overton Radar</h3>
          <p className="mt-1 text-xs text-foreground-muted">
            Aucune donnée sectorielle. Tarsis n&apos;a pas encore observé ce secteur.
          </p>
        </header>
      </div>
    );
  }

  // SVG geometry
  const angle = (i: number) => (i / allTags.length) * 2 * Math.PI - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: CENTER + Math.cos(angle(i)) * r,
    y: CENTER + Math.sin(angle(i)) * r,
  });
  const polygon = (values: number[]) =>
    values.map((v, i) => {
      const p = point(i, v * RADIUS);
      return `${p.x},${p.y}`;
    }).join(" ");

  const sectorValues = allTags.map((t) => sectorAxis.tags[t] ?? 0);
  const brandValues = allTags.map((t) => brandTags[t] ?? 0);

  return (
    <div className={"rounded-xl border border-border bg-gradient-to-br from-zinc-950 to-zinc-900/80 p-5 " + (compact ? "max-w-sm" : "")}>
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Overton Radar</h3>
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted">
          {lastObservedAt ? `Tarsis · ${new Date(lastObservedAt).toLocaleDateString()}` : "—"}
        </div>
      </header>

      <svg width={SIZE} height={SIZE} className="mx-auto block">
        {/* Concentric guides */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={RADIUS * r} fill="none" stroke="rgb(63 63 70)" strokeWidth={0.5} strokeDasharray="2 3" />
        ))}
        {/* Spokes */}
        {allTags.map((tag, i) => {
          const p = point(i, RADIUS);
          return (
            <g key={tag}>
              <line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="rgb(63 63 70)" strokeWidth={0.5} />
              <text
                x={p.x + (Math.cos(angle(i)) * 14)}
                y={p.y + (Math.sin(angle(i)) * 14)}
                textAnchor="middle"
                fontSize={10}
                fill="rgb(161 161 170)"
              >
                {tag}
              </text>
            </g>
          );
        })}
        {/* Sector polygon (background) */}
        <polygon
          points={polygon(sectorValues)}
          fill="rgb(99 102 241 / 0.18)"
          stroke="rgb(129 140 248)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        {/* Brand polygon (foreground) */}
        <polygon
          points={polygon(brandValues)}
          fill="rgb(217 119 6 / 0.32)"
          stroke="rgb(245 158 11)"
          strokeWidth={2}
        />
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Alignement</div>
          <div className="font-mono text-foreground">{(deflection.alignment * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Déflexion</div>
          <div className="font-mono text-warning">{deflection.magnitude.toFixed(2)}</div>
        </div>
      </div>

      {emergedNarratives.length > 0 && (
        <div className="mt-3 rounded-lg border border-success/60 bg-success/30 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-success">
            Le secteur t&apos;imite ({emergedNarratives.length})
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-success/90">
            {emergedNarratives.slice(0, 3).map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {fadedNarratives.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-background/40 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Narratifs effacés ({fadedNarratives.length})
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-foreground-muted">
            {fadedNarratives.slice(0, 2).map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
