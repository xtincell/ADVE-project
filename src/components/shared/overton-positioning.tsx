"use client";

import { OVERTON_MILESTONES, type OvertonPositioning } from "@/domain/overton-positioning";

const kindLabel = { CONVICTION: "La conviction défendue", CATEGORY: "La place de la catégorie", BRAND: "La place de la marque" } as const;
const zoneLabel = (zone: string | undefined) => OVERTON_MILESTONES.find(m => m.zone === zone)?.label;

/** Same rubric for the entry report, the cockpit and the Oracle. No fake progress score. */
export function OvertonPositioningView({ value, compact = false }: { value: OvertonPositioning; compact?: boolean }) {
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label="Fenêtre d’acceptation">
    <header>
      <h3 className="text-lg font-semibold text-foreground">Ce que votre marque veut faire accepter</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">Six repères pour suivre une idée auprès d’un public défini. L’acceptation de l’idée, la visibilité et la préférence pour la marque se vérifient séparément.</p>
    </header>
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Les six zones d’acceptation">
      {OVERTON_MILESTONES.map((m, i) => <li key={m.zone} className="rounded-lg border border-border-subtle p-3">
        <p className="text-xs text-foreground-muted">{i + 1} / 6</p>
        <p className="mt-1 text-sm font-semibold">{m.label}</p>
        {!compact && <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{m.meaning}</p>}
      </li>)}
    </ol>
    <div className="space-y-3">
      {value.positions.map(position => <details key={position.id} className="rounded-lg border border-border-subtle p-4" open={!compact}>
        <summary className="cursor-pointer text-sm font-semibold">
          {kindLabel[position.kind]}
          <span className="ml-2 font-normal text-foreground-muted">{position.baseline ? "Position cadrée" : "Premier repère · à compléter"}</span>
        </summary>
        <p className="mt-3 text-base leading-relaxed">{position.statement}</p>
        <p className="mt-2 text-xs text-foreground-secondary">Public : {position.audience}{position.countryCode ? ` · ${position.countryCode}` : ""}</p>
        {position.editorialRole && <p className="mt-2 text-sm"><strong>Rôle de la marque :</strong> {position.editorialRole}</p>}
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-xs text-foreground-muted">Départ du plan</dt><dd className="mt-1 text-sm">{position.baseline ? `${zoneLabel(position.baseline.zone)} · ${position.baseline.basis === "INFERRED" ? "postulat inféré" : "postulat déclaré"}` : "À cadrer à partir des fondations"}</dd></div>
          <div><dt className="text-xs text-foreground-muted">Cible</dt><dd className="mt-1 text-sm">{zoneLabel(position.targetZone) ?? "À cadrer avec la conviction"}</dd></div>
          <div><dt className="text-xs text-foreground-muted">Observation reçue</dt><dd className="mt-1 text-sm">{position.observation ? `${zoneLabel(position.observation.zone)} · ${position.observation.observedAt.slice(0, 10)}` : "Première vérification à mener"}</dd></div>
        </dl>
        {position.baseline && <p className="mt-3 text-sm text-foreground-secondary"><strong>Pourquoi ce départ :</strong> {position.baseline.reason}</p>}
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-warning">Prochaine vérification</p>
          <p className="mt-1 text-sm leading-relaxed">{position.nextCheck}</p>
        </div>
        <p className="mt-3 break-words text-xs text-foreground-muted">Origine dans les fondations : {position.sourceRefs.join(" · ")}</p>
        {position.observation && <ul className="mt-2 space-y-1">{position.observation.sources.map(source => <li key={source} className="break-words text-xs">
          {/^https?:\/\//i.test(source) ? <a className="text-accent underline" href={source} target="_blank" rel="noreferrer">Consulter la preuve</a> : source}
        </li>)}</ul>}
      </details>)}
    </div>
    {value.status === "PARTIAL" && <p className="text-sm text-foreground-secondary">Ce premier diagnostic cadre une partie du sujet. Les fondations permettront de préciser la conviction, la catégorie, la marque et leur position de départ ; les preuves de terrain permettront ensuite de les vérifier.</p>}
    <details className="border-t border-border-subtle pt-3">
      <summary className="cursor-pointer text-sm text-accent">Quelles preuves font passer d’un repère à l’autre ?</summary>
      <ol className="mt-3 space-y-3">{OVERTON_MILESTONES.map(m => <li key={m.zone} className="text-sm">
        <strong>{m.label}</strong><p className="mt-1 text-foreground-secondary">{m.proof}</p><p className="mt-1">{m.next}</p>
      </li>)}</ol>
      <p className="mt-3 text-xs text-foreground-muted">Une source absente ne prouve pas un rejet. Un article favorable ne prouve pas à lui seul un soutien populaire. Les critères doivent porter sur la même proposition, le même public et le même territoire.</p>
    </details>
  </section>;
}
