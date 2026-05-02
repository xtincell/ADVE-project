"use client";

import type { PlateformeStrategiqueSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: PlateformeStrategiqueSection }

export function PlateformeStrategique({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Architecture strategique */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Architecture strategique</h3>
        <div className="space-y-2">
          {data.archetype && <ArchRow label="Archetype" value={data.archetype} />}
          {data.citationFondatrice && <ArchRow label="Citation fondatrice" value={data.citationFondatrice} italic />}
          {data.doctrine && <ArchRow label="Doctrine" value={data.doctrine} />}
          {data.positionnement && <ArchRow label="Positionnement" value={data.positionnement} />}
          {data.promesseMaitre && <ArchRow label="Promesse maitre" value={data.promesseMaitre} accent />}
          {data.sousPromesses.length > 0 && <ArchRow label="Sous-promesses" value={data.sousPromesses.join(" | ")} />}
        </div>
      </div>

      {/* Ikigai */}
      {data.ikigai && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Ikigai de marque</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <IkigaiQuadrant label="Ce qu'on aime" value={data.ikigai.love} color="rgb(232, 75, 34)" />
            <IkigaiQuadrant label="Ce qu'on sait faire" value={data.ikigai.competence} color="rgb(245, 124, 0)" />
            <IkigaiQuadrant label="Ce dont le monde a besoin" value={data.ikigai.worldNeed} color="rgb(66, 165, 245)" />
            <IkigaiQuadrant label="Ce pour quoi on paie" value={data.ikigai.remuneration} color="rgb(124, 179, 66)" />
          </div>
        </div>
      )}

      {/* Valeurs */}
      {data.valeurs.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Valeurs (Schwartz)</h3>
          <div className="space-y-2">
            {data.valeurs.sort((a, b) => a.rang - b.rang).map((v, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-400">
                  {v.rang}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{v.valeur}</p>
                  {v.justification && <p className="mt-0.5 text-xs text-foreground-muted">{v.justification}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ton de voix */}
      {data.tonDeVoix && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Ton de voix</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.tonDeVoix.personnalite.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-foreground-muted">Personnalite</p>
                <div className="flex flex-wrap gap-1">
                  {data.tonDeVoix.personnalite.map((t, i) => (
                    <span key={i} className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground-secondary">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {data.tonDeVoix.onDit.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-success">On dit</p>
                {data.tonDeVoix.onDit.map((t, i) => <p key={i} className="text-xs text-foreground-secondary">+ {t}</p>)}
              </div>
            )}
            {data.tonDeVoix.onNeDitPas.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-error">On ne dit pas</p>
                {data.tonDeVoix.onNeDitPas.map((t, i) => <p key={i} className="text-xs text-foreground-secondary">- {t}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assets linguistiques */}
      {data.assetsLinguistiques && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Assets linguistiques</h3>
          <div className="space-y-2">
            {data.assetsLinguistiques.slogan && <ArchRow label="Slogan" value={data.assetsLinguistiques.slogan} accent />}
            {data.assetsLinguistiques.tagline && <ArchRow label="Tagline" value={data.assetsLinguistiques.tagline} />}
            {data.assetsLinguistiques.motto && <ArchRow label="Motto" value={data.assetsLinguistiques.motto} />}
            {data.assetsLinguistiques.mantras.length > 0 && <ArchRow label="Mantras" value={data.assetsLinguistiques.mantras.join(" | ")} />}
          </div>
        </div>
      )}

      {/* Messaging framework */}
      {data.messagingFramework.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Messaging framework</h3>
          <DataTable
            headers={["Audience", "Message principal", "Messages support", "CTA"]}
            rows={data.messagingFramework.map((m) => [
              m.audience,
              m.messagePrincipal,
              m.messagesSupport.join(", ") || "—",
              m.callToAction || "—",
            ])}
          />
        </div>
      )}
    </div>
  );
}

function ArchRow({ label, value, italic, accent }: { label: string; value: string; italic?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-background/30 px-4 py-3">
      <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wider text-foreground-muted">{label}</span>
      <span className={`text-sm ${accent ? "font-semibold text-orange-400" : italic ? "italic text-foreground-muted" : "text-foreground-secondary"}`}>
        {value}
      </span>
    </div>
  );
}

function IkigaiQuadrant({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <p className="text-xs font-semibold uppercase" style={{ color }}>{label}</p>
      <p className="mt-1 text-sm text-foreground-secondary">{value}</p>
    </div>
  );
}
