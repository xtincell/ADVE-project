"use client";

/**
 * <SuperfanMassMeter /> — visualizes the strategic mass of evangelists +
 * ambassadors that propels a brand toward apogee.
 *
 * Mission contribution: DIRECT_SUPERFAN. Translates the abstract Devotion
 * Ladder counts into a single readable "are we accumulating critical mass?"
 * answer for the Cockpit founder.
 *
 * Inputs map 1:1 to the segment counts returned by superfan.ts router
 * (spectateur / interesse / participant / engage / ambassadeur / evangeliste).
 */

interface SegmentCounts {
  spectateur: number;
  interesse: number;
  participant: number;
  engage: number;
  ambassadeur: number;
  evangeliste: number;
}

interface SuperfanMassMeterProps {
  counts: SegmentCounts;
  /** Total profiles tracked (sum of segments). */
  total?: number;
  /** Optional sector benchmark — the mass needed in this sector to bend Overton. */
  sectorCriticalMass?: number;
  compact?: boolean;
}

const SEGMENTS: { key: keyof SegmentCounts; label: string; weight: number; color: string }[] = [
  { key: "evangeliste", label: "Évangélistes", weight: 5, color: "bg-warning" },
  { key: "ambassadeur", label: "Ambassadeurs", weight: 3, color: "bg-warning/80" },
  { key: "engage", label: "Engagés", weight: 1.5, color: "bg-warning/60" },
  { key: "participant", label: "Participants", weight: 0.5, color: "bg-surface-raised" },
  { key: "interesse", label: "Intéressés", weight: 0.1, color: "bg-surface-raised" },
  { key: "spectateur", label: "Spectateurs", weight: 0, color: "bg-background" },
];

export function SuperfanMassMeter({ counts, total, sectorCriticalMass, compact = false }: SuperfanMassMeterProps) {
  const sum = total ?? Object.values(counts).reduce((a, b) => a + b, 0);
  const massScore = SEGMENTS.reduce((acc, s) => acc + counts[s.key] * s.weight, 0);
  const criticalMass = sectorCriticalMass ?? 200; // default benchmark
  const massRatio = Math.min(1.5, massScore / criticalMass); // cap at 150% so display doesn't break

  return (
    <div className={"rounded-xl border border-border bg-background/60 p-5 " + (compact ? "max-w-sm" : "")}>
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Masse stratégique</h3>
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted">
          {sum} profils suivis
        </div>
      </header>

      {/* Mass-score gauge */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-foreground-muted">Score</span>
          <span className="font-mono text-warning">
            {Math.round(massScore)} / {criticalMass}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className={"h-full transition-all " + (massRatio >= 1 ? "bg-warning" : massRatio >= 0.5 ? "bg-warning/70" : "bg-warning/30")}
            style={{ width: Math.min(100, massRatio * 100) + "%" }}
          />
        </div>
        <div className="mt-1 text-[10px] text-foreground-muted">
          {massRatio >= 1
            ? "✓ Masse critique atteinte — la propagation s'auto-entretient"
            : `Manque ${Math.round((1 - massRatio) * 100)}% pour atteindre la masse critique sectorielle`}
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-1.5">
        {SEGMENTS.map((s) => {
          const count = counts[s.key];
          const pct = sum > 0 ? (count / sum) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="w-24 text-foreground-secondary">{s.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-background">
                <div className={"h-full " + s.color} style={{ width: pct + "%" }} />
              </div>
              <span className="w-12 text-right font-mono text-foreground-secondary">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
