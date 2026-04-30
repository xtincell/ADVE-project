"use client";

import type { AuditDiagnosticSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: AuditDiagnosticSection }

export function AuditDiagnostic({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Benchmark concurrentiel */}
      {data.competitors.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Benchmark concurrentiel</h3>
          <DataTable
            headers={["Concurrent", "Positionnement", "Forces", "Faiblesses", "Part de marche"]}
            rows={data.competitors.map((c) => [
              c.nom,
              c.positionnement,
              c.forces.join(", ") || "—",
              c.faiblesses.join(", ") || "—",
              c.partDeMarche ?? "—",
            ])}
          />
        </div>
      )}

      {/* Analyse semiologique */}
      {data.semioticAnalysis && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Analyse semiologique</h3>
          <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
            {data.semioticAnalysis.archetypeVisual && (
              <div>
                <p className="text-xs text-foreground-muted">Archetype visuel</p>
                <p className="text-sm text-foreground-secondary">{data.semioticAnalysis.archetypeVisual}</p>
              </div>
            )}
            {data.semioticAnalysis.dominantSigns.length > 0 && (
              <div>
                <p className="text-xs text-foreground-muted">Signes dominants</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.semioticAnalysis.dominantSigns.map((s, i) => (
                    <span key={i} className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground-secondary">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {data.semioticAnalysis.recommendations.length > 0 && (
              <div>
                <p className="text-xs text-foreground-muted">Recommandations</p>
                <ul className="mt-1 space-y-1">
                  {data.semioticAnalysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-foreground-secondary">— {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Glory output detail */}
      {data.gloryOutput && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Analyse Glory — Semiotic Brand Analyzer</h3>
          <pre className="overflow-x-auto rounded-xl border border-border bg-background/50 p-4 font-mono text-xs text-foreground-muted">
            {JSON.stringify(data.gloryOutput, null, 2).slice(0, 2000)}
          </pre>
        </div>
      )}
    </div>
  );
}
