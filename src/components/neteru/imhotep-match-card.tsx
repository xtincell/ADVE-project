/**
 * Sprint G — ImhotepMatchCard reusable component.
 *
 * Carte affichant un MatchCandidate Imhotep avec score, devotion-footprint,
 * manipulation fit, reasons. Réutilisé par /console/crew/matching et tout
 * autre consumer (cockpit team-builder, etc.).
 */

interface ImhotepMatchCardProps {
  displayName: string;
  tier: string;
  matchScore: number;
  devotionInSector: number;
  manipulationFit: boolean;
  reasons: readonly string[];
  onClick?: () => void;
}

export function ImhotepMatchCard({
  displayName,
  tier,
  matchScore,
  devotionInSector,
  manipulationFit,
  reasons,
  onClick,
}: ImhotepMatchCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-border bg-card p-3 text-left transition-all hover:bg-card-hover disabled:opacity-50"
      disabled={!onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {displayName}
            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">{tier}</span>
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            devotion={devotionInSector} · manipFit={manipulationFit ? "✓" : "✗"}
          </div>
        </div>
        <div className="text-2xl font-bold text-amber-500">{matchScore}</div>
      </div>
      {reasons.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-foreground-muted">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </button>
  );
}
