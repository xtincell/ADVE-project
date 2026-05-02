"use client";

import type { SignauxOpportunitesSection } from "@/server/services/strategy-presentation/types";
import { AiBadge } from "@/components/shared/ai-badge";

interface Props { data: SignauxOpportunitesSection }

export function SignauxOpportunites({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.signauxFaibles.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
            Signaux faibles <AiBadge />
          </h3>
          <div className="space-y-2">
            {data.signauxFaibles.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  s.severity === "CRITICAL" ? "bg-error" :
                  s.severity === "HIGH" ? "bg-warning" :
                  s.severity === "MEDIUM" ? "bg-yellow-500" : "bg-surface-raised"
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{s.signal}</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">{s.source} — {s.detectedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.opportunitesPriseDeParole.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Opportunites de prise de parole</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.opportunitesPriseDeParole.map((o, i) => (
              <div key={i} className="rounded-lg border border-accent/30 bg-accent/20 p-4">
                <p className="text-sm font-medium text-accent">{o.contexte}</p>
                <div className="mt-2 flex gap-2 text-[10px]">
                  <span className="rounded bg-background px-1.5 py-0.5 text-foreground-secondary">{o.canal}</span>
                  <span className="rounded bg-background px-1.5 py-0.5 text-foreground-secondary">{o.timing}</span>
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">{o.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.mestorInsights.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
            Prescriptions Mestor <AiBadge />
          </h3>
          <div className="space-y-2">
            {data.mestorInsights.map((ins, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-warning">{ins.type}</span>
                  <span className="text-sm font-medium text-foreground">{ins.title}</span>
                </div>
                <p className="mt-1 text-xs text-foreground-secondary">{ins.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
