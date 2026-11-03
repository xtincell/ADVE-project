"use client";
import { useState, useEffect } from "react";
import { EntryOvertonClaimSchema, entryOvertonConcept, readOvertonPositioning, OVERTON_MILESTONES, type EntryOvertonClaim } from "@/domain/overton-positioning";
import { OvertonPositioningView } from "./overton-positioning";

/** Optional self-assessment, carried into intake; it does not change the scan score. */
export function OvertonEntry({ brand, onChange, initialValue, hidePreview = false }: { brand: string; onChange: (value: EntryOvertonClaim | null) => void; initialValue?: EntryOvertonClaim | null; hidePreview?: boolean }) {
  const [draft, setDraft] = useState({ statement: "", audience: "", baselineZone: "", targetZone: "" });
  useEffect(() => { if (initialValue) setDraft(initialValue); }, [initialValue]);
  const parsed = EntryOvertonClaimSchema.safeParse(draft);
  function update(key: keyof typeof draft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const result = EntryOvertonClaimSchema.safeParse(next);
    onChange(result.success ? result.data : null);
  }
  const inputClass = "mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground";
  return <section className="my-6 space-y-4">
    <details className="rounded-xl border border-border bg-card p-5">
      <summary className="cursor-pointer text-base font-semibold">Cadrer l’idée que votre marque défend · facultatif</summary>
      <p className="mt-2 text-sm text-foreground-secondary">Ce premier repère sera conservé dans votre diagnostic. Il décrit votre lecture de la situation et ne modifie pas le score de présence mesuré.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Quelle idée voulez-vous rendre évidente ?
          <textarea className={inputClass} value={draft.statement} maxLength={600} onChange={e => update("statement", e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">Auprès de quel public ?
          <input className={inputClass} value={draft.audience} maxLength={300} onChange={e => update("audience", e.target.value)} />
        </label>
        <label className="text-sm">Votre point de départ
          <select className={inputClass} value={draft.baselineZone} onChange={e => update("baselineZone", e.target.value)}>
            <option value="">Choisir un repère</option>{OVERTON_MILESTONES.map(m => <option key={m.zone} value={m.zone}>{m.label} — {m.meaning}</option>)}
          </select>
        </label>
        <label className="text-sm">Votre cible
          <select className={inputClass} value={draft.targetZone} onChange={e => update("targetZone", e.target.value)}>
            <option value="">Choisir un repère</option>{OVERTON_MILESTONES.map(m => <option key={m.zone} value={m.zone}>{m.label}</option>)}
          </select>
        </label>
      </div>
      {parsed.success && <p className="mt-3 text-sm text-success" role="status">Ce repère sera conservé lors du démarrage du diagnostic.</p>}
    </details>
    {!hidePreview && <OvertonPositioningView value={readOvertonPositioning({ a: { nomMarque: brand,
      ...(parsed.success ? { overtonPositions: [entryOvertonConcept(parsed.data)] } : {}) } })} compact />}
  </section>;
}
