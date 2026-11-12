"use client";

import { useId } from "react";
import type { FinancialWorkingModel } from "@/domain/financial-document";
import { projectFinancialWorkingModel, unitEconomicsMetricRows, resolveUnitEconomics } from "@/domain/unit-economics";
import { Button } from "@/components/primitives/button";

import { FinancialWorkingModelSchema } from "@/domain/financial-document";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => v && typeof v === "object" && !Array.isArray(v) ? v as Rec : {};
const amount = () => ({ value: null, qualification: "ASSUMPTION", note: "", sources: [] });
/** A blank form is not a business scenario. No financial amount is defaulted. */
export function financialModelDraft(value: unknown): Rec {
  if (value && typeof value === "object") return structuredClone(value) as Rec;
  return { schema: "adve-financial-working-model-v1", breakEven: {
    schema: "adve-break-even-model-v1", period: "MONTH", price: amount(), fixedCosts: [], variableCosts: [], exclusions: [], assumptions: [],
  }, projection: { monthlyVolumes: Array.from({ length: 12 }, amount), unitsPerPayerMonth: amount(), annualRetentionRate: amount(),
    marketingFixedCostIndexes: [], marketingVariableCostIndexes: [], cashFlow: { openingCash: amount(), revenueDelayMonths: null, costDelayMonths: null, note: "" } } };
}
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";
const QUALIFICATIONS = { ASSUMPTION: "Hypothèse proposée", SOURCED: "Valeur documentée", HISTORICAL: "Repère historique" };

/** Same governed amendment form as other ADVE fields. Technical receipts stay
 * in the document selector; the operator edits premises and sees their result. */
export function FinancialModelEditor({ value, onChange, payerOptions = [] }: {
  value: unknown; onChange: (v: unknown) => void; payerOptions?: Array<{ id: string; name: string }>;
}) {
  const id = useId(), draft = financialModelDraft(value), b = rec(draft.breakEven), p = rec(draft.projection);
  function set(section: "breakEven" | "projection", key: string, v: unknown) {
    onChange({ ...draft, [section]: { ...rec(draft[section]), [key]: v } });
  }
  function number(label: string, v: unknown, update: (v: number | null) => void, scale = 1) {
    return <label className="block space-y-1"><span>{label}</span><input className={input} type="number" step="any"
      value={typeof v === "number" ? Math.round(v * scale * 1e8) / 1e8 : ""}
      onChange={e => update(e.target.value === "" || !Number.isFinite(e.target.valueAsNumber) ? null : e.target.valueAsNumber / scale)} /></label>;
  }
  function text(section: "breakEven" | "projection", key: string, label: string) {
    const v = rec(draft[section])[key];
    return <label className="block space-y-1"><span>{label}</span><input className={input} value={typeof v === "string" ? v : ""}
      onChange={e => set(section, key, e.target.value)} /></label>;
  }
  function qualified(label: string, v: unknown, update: (v: unknown) => void, scale = 1) {
    const a = rec(v);
    return <div className="space-y-2">
      {number(label, a.value, n => update({ ...a, value: n, qualification: "ASSUMPTION" }), scale)}
      <details><summary className="cursor-pointer text-foreground-secondary">Justification et origine</summary><div className="mt-2 space-y-2">
        <label className="block"><span>Origine de {label}</span><select className={input} value={String(a.qualification ?? "ASSUMPTION")}
          onChange={e => update({ ...a, qualification: e.target.value,
            sources: e.target.value !== "ASSUMPTION" && (!Array.isArray(a.sources) || a.sources.length === 0) && draft.source
              ? [{ ...rec(draft.source), locator: `${label} : ${typeof a.note === "string" && a.note ? a.note : "Prémisse du document financier sélectionné"}` }] : a.sources })}>{Object.entries(QUALIFICATIONS).map(([key, name]) => <option key={key} value={key} disabled={key !== "ASSUMPTION" && !draft.source && (!Array.isArray(a.sources) || a.sources.length === 0)}>{name}</option>)}</select></label>
        <label className="block"><span>Justification de {label}</span><textarea className={input} rows={2} value={typeof a.note === "string" ? a.note : ""}
          onChange={e => update({ ...a, note: e.target.value })} /></label>
        {Array.isArray(a.sources) && a.sources.length > 0 && <p>{a.sources.length} référence(s) conservée(s) avec cette valeur.</p>}
      </div></details>
    </div>;
  }
  function lines(key: "fixedCosts" | "variableCosts", label: string, indexKey: "marketingFixedCostIndexes" | "marketingVariableCostIndexes") {
    const rows = Array.isArray(b[key]) ? b[key] as Rec[] : [], indexes = Array.isArray(p[indexKey]) ? p[indexKey] as number[] : [];
    function update(i: number, v: unknown) { set("breakEven", key, rows.map((row, n) => n === i ? v : row)); }
    return <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">{label} · {rows.length} postes</summary>
      <div className="mt-3 space-y-4">{rows.map((row, i) => <div className="space-y-2 border-b border-border pb-3" key={i}>
        <label className="block"><span>Poste {i + 1}</span><input className={input} value={String(row.label ?? "")} onChange={e => update(i, { ...row, label: e.target.value })} /></label>
        {qualified(`${label} · ${i + 1}`, row, v => update(i, v))}
        <label className="flex gap-2"><input type="checkbox" checked={indexes.includes(i)} onChange={e => set("projection", indexKey, e.target.checked ? [...indexes, i] : indexes.filter(n => n !== i))} />Dont communication, déjà incluse dans les charges</label>
        <Button variant="ghost" size="sm" onClick={() => onChange({ ...draft,
          breakEven: { ...b, [key]: rows.filter((_, n) => n !== i) }, projection: { ...p, [indexKey]: indexes.filter(n => n !== i).map(n => n > i ? n - 1 : n) } })}>Retirer ce poste</Button>
      </div>)}<Button variant="outline" size="sm" onClick={() => set("breakEven", key, [...rows, { label: "", ...amount() }])}>Ajouter un poste</Button></div>
    </details>;
  }
  const volumes = Array.isArray(p.monthlyVolumes) ? p.monthlyVolumes : Array.from({ length: 12 }, amount);
  const cash = rec(p.cashFlow);
  const setCash = (key: string, v: unknown) => set("projection", "cashFlow", { ...cash, [key]: v });
  const result = projectFinancialWorkingModel(draft);
  const validation = FinancialWorkingModelSchema.safeParse(draft);
  const fieldLabels: Record<string, string> = { source: "Document financier de référence", title: "Nom du scénario", currency: "Devise", scope: "Périmètre", payerPersonaId: "Client payeur", payer: "Client payeur", unit: "Unité vendue", taxBasis: "Base de calcul", price: "Prix unitaire", fixedCosts: "Charges fixes", variableCosts: "Charges par unité", monthlyVolumes: "Volumes mensuels", unitsPerPayerMonth: "Unités par client", annualRetentionRate: "Rétention annuelle", ltvHorizonMonths: "Horizon de valeur", acquisitionPaybackCeilingMonths: "Délai de récupération proposé", cashFlow: "Solde initial et délais de paiement", note: "Justification de la trajectoire", assumptions: "Hypothèses générales", exclusions: "Exclusions", marketingFixedCostIndexes: "Postes de communication fixes", marketingVariableCostIndexes: "Postes de communication variables" };
  const incomplete = validation.success ? [] : [...new Set(validation.error.issues.map(issue => {
    const key = String(issue.path[0] === "source" ? "source" : issue.path[1] ?? "source");
    return fieldLabels[key] ?? "Prémisses et justifications";
  }))];
  const current = typeof b.payerPersonaId === "string" && b.payerPersonaId ? b.payerPersonaId : "";
  const options = payerOptions.length ? payerOptions : current ? [{ id: current, name: String(b.payer ?? "Client payeur") }] : [];
  return <div className="space-y-4 text-sm" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="text-foreground-secondary">Les résultats économiques se recalculent à partir de ces hypothèses. Les montants n’attestent ni ventes ni dépenses réalisées.</p>
    <div className="grid gap-3 sm:grid-cols-2">{text("breakEven", "title", "Nom du scénario")}{text("breakEven", "currency", "Devise du modèle (XOF, EUR…)")}
      {text("breakEven", "unit", "Unité vendue")}
      <label><span>Client payeur</span><select className={input} value={current} onChange={e => { const chosen = options.find(o => o.id === e.target.value); onChange({ ...draft, breakEven: { ...b, payerPersonaId: chosen?.id, payer: chosen?.name ?? "" } }); }}>
        <option value="">Choisir le profil payeur de la marque</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label><span>Base de calcul</span><select className={input} value={String(b.taxBasis ?? "")} onChange={e => set("breakEven", "taxBasis", e.target.value)}>
        <option value="">Choisir la base</option><option value="HT">Hors taxes</option><option value="TTC">Toutes taxes comprises</option><option value="NO_VAT">Hypothèse sans TVA collectée</option></select></label>
    </div>
    {text("breakEven", "scope", "Périmètre couvert par ces charges")}
    {qualified("Prix unitaire", b.price, v => set("breakEven", "price", v))}
    {lines("fixedCosts", "Charges fixes mensuelles", "marketingFixedCostIndexes")}
    {lines("variableCosts", "Charges par unité vendue", "marketingVariableCostIndexes")}
    <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Trajectoire sur douze mois</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">{volumes.map((v, i) => <div key={i}>{qualified(`Mois ${i + 1}`, v, next => set("projection", "monthlyVolumes", volumes.map((row, n) => n === i ? next : row)))}</div>)}</div>
    </details>
    <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Valeur du client et acquisition</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
      {qualified("Unités par client et par mois", p.unitsPerPayerMonth, v => set("projection", "unitsPerPayerMonth", v))}
      {qualified("Rétention annuelle (%)", p.annualRetentionRate, v => set("projection", "annualRetentionRate", v), 100)}
      {number("Horizon de valeur (mois)", p.ltvHorizonMonths, v => set("projection", "ltvHorizonMonths", v))}
      {number("Récupération maximale du CAC proposée (mois)", p.acquisitionPaybackCeilingMonths, v => set("projection", "acquisitionPaybackCeilingMonths", v))}
      {text("projection", "note", "Justification de la trajectoire et du plafond")}
    </div></details>
    <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Trésorerie du scénario</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
      {qualified("Solde initial proposé", cash.openingCash, v => setCash("openingCash", v))}
      {number("Délai d’encaissement (mois)", cash.revenueDelayMonths, v => setCash("revenueDelayMonths", v))}
      {number("Délai de paiement des charges (mois)", cash.costDelayMonths, v => setCash("costDelayMonths", v))}
      <label><span>Justification des délais et du solde initial</span><textarea className={input} rows={2} value={typeof cash.note === "string" ? cash.note : ""} onChange={e => setCash("note", e.target.value)} /></label>
    </div></details>
    {(["assumptions", "exclusions"] as const).map(key => <label className="block space-y-1" key={key}><span>{key === "assumptions" ? "Hypothèses générales" : "Charges et éléments hors périmètre"} · une ligne par élément</span>
      <textarea className={input} rows={3} value={Array.isArray(b[key]) ? b[key].join("\n") : ""} onChange={e => set("breakEven", key, e.target.value.split("\n"))} /></label>)}
    {incomplete.length > 0 && <p className="text-foreground-secondary">À compléter ou corriger : {incomplete.join(" ; ")}.</p>}
    {!draft.source && <p className="text-warning">Ajoutez la version du document financier de référence ci-dessous pour relier ce scénario à sa pièce source.</p>}
    {result.status === "COMPUTED" ? <dl className="grid gap-3 sm:grid-cols-2" aria-label="Résultats calculés du scénario">
      {unitEconomicsMetricRows(resolveUnitEconomics({ financialModel: draft as unknown as FinancialWorkingModel })).map(row => <div key={row.key}><dt className="text-foreground-secondary">{row.label}</dt><dd>{row.value}</dd></div>)}
    </dl> : <p className="text-foreground-secondary">Le calcul attend les prémisses complètes et justifiées. Les valeurs effacées restent à renseigner.</p>}
  </div>;
}
