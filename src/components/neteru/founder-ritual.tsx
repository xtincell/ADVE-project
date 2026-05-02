"use client";

/**
 * <FounderRitual /> — weekly digest UI for the founder (drift 5.9 fix).
 *
 * Mission contribution: DIRECT_SUPERFAN. The component that mechanizes
 * the "founder = first superfan" promise. Shown in Cockpit as the weekly
 * landing experience: founder cult index, fresh superfans recruited,
 * orchestrations completed, and the next ritual call-to-action.
 *
 * Data: founder-psychology.composeWeeklyDigest output.
 */

interface CultIndex {
  score: number;
  engagement: number;
  ownership: number;
  recruitment: number;
  internalization: number;
  tier: string;
}

interface DigestSection {
  heading: string;
  body: string;
  sentiment: "celebrate" | "alert" | "neutral";
}

interface FounderRitualProps {
  weekOf: string; // ISO date
  cultIndex: CultIndex;
  sections: DigestSection[];
  callToActionIntent?: string;
  onTriggerCta?: (intentKind: string) => void;
}

const TIER_RANK: Record<string, number> = {
  SPECTATEUR: 0,
  INTERESSE: 1,
  PARTICIPANT: 2,
  ENGAGE: 3,
  AMBASSADEUR: 4,
  EVANGELISTE: 5,
};
const TIER_LABEL: Record<string, string> = {
  SPECTATEUR: "Spectateur",
  INTERESSE: "Intéressé",
  PARTICIPANT: "Participant",
  ENGAGE: "Engagé",
  AMBASSADEUR: "Ambassadeur",
  EVANGELISTE: "Évangéliste",
};

export function FounderRitual({ weekOf, cultIndex, sections, callToActionIntent, onTriggerCta }: FounderRitualProps) {
  const tierRank = TIER_RANK[cultIndex.tier] ?? 0;

  return (
    <div className="rounded-2xl border border-warning/40 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/10 p-6">
      <header className="mb-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-warning/80">
          Rituel hebdomadaire — semaine du {new Date(weekOf).toLocaleDateString()}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Tu pilotes ta marque. Voici ce que la semaine a produit.
        </h2>
      </header>

      {/* Cult index — your own status */}
      <div className="mb-5 rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wider text-foreground-muted">Ton statut</div>
          <div className="font-mono text-sm text-warning">{cultIndex.score} / 100</div>
        </div>
        <div className="mt-2 text-xl font-semibold tracking-wide text-foreground">
          {TIER_LABEL[cultIndex.tier] ?? cultIndex.tier}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
          {[
            { label: "Engagement", value: cultIndex.engagement },
            { label: "Ownership", value: cultIndex.ownership },
            { label: "Recrutement", value: cultIndex.recruitment },
            { label: "Internalisation", value: cultIndex.internalization },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-[10px] uppercase tracking-wider text-foreground-muted">{m.label}</div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-warning" style={{ width: `${(m.value / 25) * 100}%` }} />
              </div>
              <div className="mt-1 font-mono text-foreground-secondary">{m.value}/25</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-foreground-muted">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 flex-1 rounded-full " +
                (i < tierRank ? "bg-warning" : i === tierRank ? "bg-warning/60" : "bg-background")
              }
            />
          ))}
          <span className="ml-2 whitespace-nowrap text-foreground-muted">vers Évangéliste</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div
            key={i}
            className={
              "rounded-lg border p-3 " +
              (s.sentiment === "celebrate"
                ? "border-success/60 bg-success/30"
                : s.sentiment === "alert"
                  ? "border-error/60 bg-error/20"
                  : "border-border bg-background/40")
            }
          >
            <div
              className={
                "text-xs font-semibold uppercase tracking-wider " +
                (s.sentiment === "celebrate"
                  ? "text-success"
                  : s.sentiment === "alert"
                    ? "text-error"
                    : "text-foreground-secondary")
              }
            >
              {s.heading}
            </div>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-foreground-secondary">{s.body}</pre>
          </div>
        ))}
      </div>

      {/* CTA */}
      {callToActionIntent && (
        <button
          type="button"
          onClick={() => onTriggerCta?.(callToActionIntent)}
          className="mt-5 w-full rounded-lg border border-warning/60 bg-warning/30 px-4 py-2.5 text-sm font-medium text-warning transition hover:bg-warning/50"
        >
          Lancer la prochaine étape — <span className="font-mono text-warning">{callToActionIntent}</span>
        </button>
      )}
    </div>
  );
}
