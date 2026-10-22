"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import type { DocumentEdition } from "@/domain/source-document";
import type { SourcedBreakEvenDocument } from "@/server/services/financial-brain/break-even-source";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Source = { id: string; fileName: string | null; fileType?: string | null; contentHash?: string; document?: DocumentEdition | null };
export function FinancialDocumentPanel({ strategyId, sources, canManage, onRead }: {
  strategyId: string; sources: Source[]; canManage: boolean; onRead: (id: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [editionId, setEditionId] = useState("");
  const candidates = sources.filter(s => s.document?.kind === "FINANCE" && ["PROPOSED", "REFERENCE"].includes(s.document.status) && s.fileType?.toLowerCase() === "json");
  const source = candidates.find(s => s.id === selected) ?? (candidates.length === 1 ? candidates[0] : undefined);
  const history = trpc.glory.history.useQuery({ strategyId, toolSlug: "break-even-calculator" });
  const generate = trpc.glory.execute.useMutation({ onSuccess: result => { setEditionId(result.outputId); void history.refetch(); } });
  const edition = history.data?.find(e => e.id === editionId) ?? history.data?.[0];
  const doc = edition?.output as unknown as SourcedBreakEvenDocument | undefined;
  const n = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value) : "À préciser";
  return <section aria-labelledby="financial-document-title" className="space-y-4 rounded-lg border border-border p-4">
    <h2 id="financial-document-title" className="text-lg font-semibold">Fiche de seuil de rentabilité · Catalyse</h2>
    <p className="text-sm text-foreground-secondary">Une édition conserve les hypothèses, leurs sources et les calculs. Elle ne valide ni le modèle économique ni des ventes réalisées.</p>
    {canManage && <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1 text-sm">Modèle financier<select className="mt-1 w-full rounded border border-border bg-surface-raised px-3 py-2 text-foreground" value={source?.id ?? ""} onChange={e => setSelected(e.target.value)}><option value="">Choisir une version</option>{candidates.map(s => <option key={s.id} value={s.id}>{s.document!.label} · {s.document!.status === "PROPOSED" ? "proposition" : "référence"}</option>)}</select></label>
      {source && <Button variant="outline" onClick={() => onRead(source.id)}>Lire les hypothèses</Button>}
      <Button disabled={!source?.contentHash || generate.isPending} onClick={() => source?.contentHash && generate.mutate({ strategyId, toolSlug: "break-even-calculator", input: { sourceId: source.id, expectedSourceHash: source.contentHash } })}>{generate.isPending ? "Calcul en cours…" : "Produire une nouvelle édition"}</Button>
    </div>}
    {candidates.length === 0 && <p className="text-sm text-foreground-muted">Aucun modèle de seuil structuré n’est classé dans les finances. Les études et tableurs restent consultables dans le dossier documentaire.</p>}
    {(generate.error || history.error) && <p role="alert" className="text-sm text-error">{(generate.error ?? history.error)?.message}</p>}
    {doc?.schema === "adve-break-even-document-v1" && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Édition du {new Date(edition!.createdAt).toLocaleString("fr-FR")} · {doc.state === "INCOMPLETE" ? "Données à compléter" : "Scénario documenté, à valider"}</p><a className="text-sm text-accent underline" href={`/api/export/${encodeURIComponent(strategyId)}?format=break-even-docx&outputId=${encodeURIComponent(edition!.id)}`}>Télécharger la fiche Word</a></div>
      <p className="text-sm">{doc.model.scope}</p><p className="text-sm">Payeur : {doc.model.payer} · Unité : {doc.model.unit} · {doc.model.currency} {doc.model.taxBasis} / mois</p>
      {doc.missing.length > 0 && <p className="rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning">À chiffrer avant calcul : {doc.missing.join(" ; ")}</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Scénario</th><th className="p-2">Prix</th><th className="p-2">Coût variable</th><th className="p-2">Charges fixes</th><th className="p-2">Seuil entier / mois</th></tr></thead><tbody>{doc.scenarios.map(s => <tr key={s.label} className="border-t border-border"><td className="p-2">{s.label}</td><td className="p-2">{n(s.price)}</td><td className="p-2">{n(s.variable)}</td><td className="p-2">{n(s.fixed)}</td><td className="p-2">{s.analysis.status === "NO_FINITE_BREAK_EVEN" ? "Pas de seuil fini" : n(s.analysis.breakEvenUnits)}</td></tr>)}</tbody></table></div>
      <p className="text-sm">CA théorique de seuil : {n(doc.base.breakEvenRevenue)} {doc.model.currency} / mois. CA avec unités entières : {n(doc.base.revenueAtWholeUnits)} {doc.model.currency} / mois.</p>
      {doc.chart.length > 0 && <div role="img" aria-label="Courbes du chiffre d’affaires et des coûts totaux selon le volume mensuel" className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={doc.chart}>
            <XAxis dataKey="units" minTickGap={24} tick={{ fill: "var(--color-foreground-secondary)" }} />
            <YAxis width={100} tick={{ fill: "var(--color-foreground-secondary)" }} tickFormatter={v => n(Number(v))} />
            <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-raised)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }} labelStyle={{ color: "var(--color-foreground)" }} formatter={v => `${n(typeof v === "number" ? v : null)} ${doc.model.currency}`} labelFormatter={v => `${v} unités / mois`} />
            <Legend />
            <Line dataKey="revenue" name="Chiffre d’affaires" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
            <Line dataKey="cost" name="Coûts totaux" stroke="var(--color-foreground-secondary)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      <p className="text-sm">{doc.firstProfitableMonth === null ? doc.delayNote : `Premier mois couvrant les charges dans cette projection : M${doc.firstProfitableMonth}. ${doc.delayNote}`}</p>
      <details className="text-sm"><summary>Hypothèses, exclusions et sources</summary><ul className="mt-2 list-disc space-y-1 pl-5">{[...doc.model.assumptions, ...doc.model.exclusions].map((s, i) => <li key={i}>{s}</li>)}</ul><div className="mt-3 space-y-2">{[doc.model.price, ...doc.model.fixedCosts, ...doc.model.variableCosts].map((v, i) => <p key={i}>{"label" in v ? String(v.label) : "Prix"} : {v.note} · {v.qualification === "HISTORICAL" ? "donnée historique" : v.qualification === "ASSUMPTION" ? "hypothèse" : "donnée sourcée"}</p>)}{doc.evidence.map(e => <Button key={e.sourceId} variant="outline" size="sm" onClick={() => onRead(e.sourceId)}>{e.fileName}</Button>)}</div></details>
    </>}
    {(history.data?.length ?? 0) > 1 && <label className="block text-sm">Éditions conservées<select className="ml-2 rounded border border-border bg-surface-raised p-2" value={edition?.id ?? ""} onChange={e => setEditionId(e.target.value)}>{history.data!.map(e => <option key={e.id} value={e.id}>{new Date(e.createdAt).toLocaleString("fr-FR")}</option>)}</select></label>}
  </section>;
}
