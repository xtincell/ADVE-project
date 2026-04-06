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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Benchmark concurrentiel</h3>
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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Analyse semiologique</h3>
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            {data.semioticAnalysis.archetypeVisual && (
              <div>
                <p className="text-xs text-zinc-600">Archetype visuel</p>
                <p className="text-sm text-zinc-300">{data.semioticAnalysis.archetypeVisual}</p>
              </div>
            )}
            {data.semioticAnalysis.dominantSigns.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600">Signes dominants</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.semioticAnalysis.dominantSigns.map((s, i) => (
                    <span key={i} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {data.semioticAnalysis.recommendations.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600">Recommandations</p>
                <ul className="mt-1 space-y-1">
                  {data.semioticAnalysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-zinc-400">— {r}</li>
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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Analyse Glory — Semiotic Brand Analyzer</h3>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-500">
            {JSON.stringify(data.gloryOutput, null, 2).slice(0, 2000)}
          </pre>
        </div>
      )}
    </div>
  );
}
