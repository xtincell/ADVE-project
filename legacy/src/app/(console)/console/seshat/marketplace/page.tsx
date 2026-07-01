"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/primitives/button";
import { Building2, Users, Layers, ShieldCheck } from "lucide-react";

const PROVENANCE = ["FIRST_PARTY", "SYNDICATED", "AI_INFERRED", "PUBLIC"] as const;

/**
 * Bureau d'étude — marketplace de l'intelligence marché (ADR-0114). Concurrents,
 * vagues d'étude (marge d'erreur déterministe) et provenance des sources, par étude.
 */
export default function SeshatMarketplacePage() {
  const [studyId, setStudyId] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: studies, isLoading } = trpc.bureauEtudes.studies.useQuery({});
  const competitors = trpc.bureauEtudes.competitors.useQuery({ studyId }, { enabled: !!studyId });
  const waves = trpc.bureauEtudes.waves.useQuery({ studyId }, { enabled: !!studyId });
  const sources = trpc.bureauEtudes.sources.useQuery({ studyId }, { enabled: !!studyId });

  const setProvenance = trpc.bureauEtudes.setProvenance.useMutation({
    onSuccess: () => utils.bureauEtudes.sources.invalidate({ studyId }),
  });

  if (isLoading) return <SkeletonPage />;
  const studyList = studies ?? [];
  const current = studyList.find((s) => s.id === studyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace — intelligence marché"
        description="Concurrents, vagues d'étude et provenance des sources. Pondération honnête, zéro chiffre inventé."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Seshat" }, { label: "Marketplace" }]}
      />

      {/* Picker d'étude */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground-muted">Étude de marché</label>
        <select
          value={studyId}
          onChange={(e) => setStudyId(e.target.value)}
          className="w-full max-w-xl rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">— Sélectionner une étude —</option>
          {studyList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s._count.competitorSnapshots} concurrents · {s._count.waves} vagues · {s._count.sources} sources)
            </option>
          ))}
        </select>
      </div>

      {!studyId ? (
        <EmptyState icon={Building2} title="Choisissez une étude" description="Sélectionnez une étude de marché pour explorer son intelligence concurrentielle, ses vagues et la provenance de ses sources." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Concurrents" value={current?._count.competitorSnapshots ?? 0} icon={Users} />
            <StatCard title="Vagues" value={current?._count.waves ?? 0} icon={Layers} />
            <StatCard title="Sources" value={current?._count.sources ?? 0} icon={ShieldCheck} />
          </div>

          {/* Concurrents */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Concurrents</h2>
            {competitors.isLoading ? (
              <SkeletonPage />
            ) : (competitors.data ?? []).length === 0 ? (
              <p className="text-sm text-foreground-muted">Aucun concurrent rattaché à cette étude.</p>
            ) : (
              <div className="space-y-2">
                {(competitors.data ?? []).map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-foreground-muted">{c.sector} · {c.market}{c.positioning ? ` · ${c.positioning}` : ""}</p>
                    </div>
                    {typeof c.estimatedScore === "number" && (
                      <span className="text-sm font-semibold text-foreground">{Math.round(c.estimatedScore)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vagues + marge d'erreur */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Vagues d'étude</h2>
            {(waves.data ?? []).length === 0 ? (
              <p className="text-sm text-foreground-muted">Aucune vague enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {(waves.data ?? []).map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.waveLabel} · {w.periodLabel}</p>
                      <p className="text-xs text-foreground-muted">
                        n cible {w.targetN ?? "—"} · n atteint {w.achievedN ?? "—"}
                      </p>
                    </div>
                    <span className="text-xs text-foreground-muted">
                      {w.marginOfErrorPct !== null ? `± ${w.marginOfErrorPct} %` : "MoE n/a"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sources + provenance */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Sources & provenance</h2>
            {(sources.data ?? []).length === 0 ? (
              <p className="text-sm text-foreground-muted">Aucune source.</p>
            ) : (
              <div className="space-y-2">
                {(sources.data ?? []).map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-foreground-muted">
                        {s.sourceType}{s.reliability !== null ? ` · fiabilité ${Math.round((s.reliability ?? 0) * 100)} %` : ""}
                        {s.provenanceClass ? ` · ${s.provenanceClass}` : " · provenance non classée"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PROVENANCE.map((pc) => (
                        <Button
                          key={pc}
                          size="sm"
                          variant={s.provenanceClass === pc ? "primary" : "outline"}
                          disabled={setProvenance.isPending}
                          onClick={() => setProvenance.mutate({ sourceId: s.id, provenanceClass: pc })}
                        >
                          {pc.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
