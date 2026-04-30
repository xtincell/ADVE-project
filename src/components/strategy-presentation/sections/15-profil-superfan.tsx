"use client";

import type { ProfilSuperfanSection } from "@/server/services/strategy-presentation/types";
import { CultIndexGauge } from "../shared/cult-index-gauge";
import { MetricCard } from "../shared/metric-card";

interface Props { data: ProfilSuperfanSection }

export function ProfilSuperfan({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Superfan portrait */}
      {data.portrait && (
        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-violet-950/30 to-zinc-900/80 p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-lg">
              ★
            </div>
            <div>
              <p className="text-lg font-bold text-accent">{data.portrait.nom}</p>
              <p className="text-xs text-foreground-muted">{data.portrait.trancheAge}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground-secondary">{data.portrait.description}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-400">Motivations</p>
              <ul className="mt-1 space-y-1">
                {data.portrait.motivations.map((m, i) => (
                  <li key={i} className="text-xs text-foreground-secondary">+ {m}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-error">Freins</p>
              <ul className="mt-1 space-y-1">
                {data.portrait.freins.map((f, i) => (
                  <li key={i} className="text-xs text-foreground-secondary">- {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Metriques */}
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Superfans actifs" value={String(data.metriquesSuperfan.actifs)} />
        <MetricCard label="Evangelistes" value={String(data.metriquesSuperfan.evangelistes)} />
        <MetricCard label="Ratio superfan" value={`${data.metriquesSuperfan.ratio}%`} />
        <MetricCard label="Velocite /30j" value={data.metriquesSuperfan.velocite != null ? String(data.metriquesSuperfan.velocite) : "—"} />
      </div>

      {data.cultIndex && (
        <CultIndexGauge score={data.cultIndex.score} tier={data.cultIndex.tier} />
      )}

      {/* Devotion pathway */}
      {data.parcoursDevotionCible.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Parcours vers le superfan</h3>
          <div className="space-y-3">
            {data.parcoursDevotionCible.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.palier}</p>
                  <p className="text-xs text-foreground-muted">Trigger : {p.trigger}</p>
                  <p className="text-xs text-foreground-secondary">{p.experience}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
