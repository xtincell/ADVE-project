"use client";
import { useState } from "react";
import type { BrandNode } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import { readPortfolioReferences, inspectPortfolioReferences, PortfolioReferenceSchema, PortfolioReferencesSchema, portfolioReferenceKey, PORTFOLIO_BARRE_INSTANCE } from "@/domain/portfolio-reference";

const OPTIONS = [
  ["LA_BARRE:client", "La Barre · client"], ["LA_BARRE:brand", "La Barre · marque"],
  ["LA_BARRE:range", "La Barre · gamme"], ["LA_BARRE:sku", "La Barre · référence produit"],
  ["LA_BARRE:project", "La Barre · projet"], ["LA_FUSEE:strategy", "La Fusée · dossier de stratégie"],
  ["RADAR:brief", "Radar · suivi de projet"], ["WEB:site", "Site ou application"], ["GITHUB:repository", "Dépôt de code"],
];
export function PortfolioReferencesForm({ node, onSaved }: { node: BrandNode; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [readVersion, setReadVersion] = useState(() => node.updatedAt.toISOString());
  const [refs, setRefs] = useState(() => readPortfolioReferences(node.sourceRefs));
  const [type, setType] = useState("LA_BARRE:brand");
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const [instance, setInstance] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const inspected = inspectPortfolioReferences(node.sourceRefs);
  const radar = type === "RADAR:brief";
  function addReference() {
    const [system, kind] = type.split(":");
    const result = PortfolioReferenceSchema.safeParse({ system, kind, id: id.trim(),
      ...(title.trim() ? { label: title.trim() } : {}),
      ...(url.trim() ? { url: url.trim() } : {}),
      ...(radar ? { instance: instance.trim(), ...(projectId.trim() ? { project: {
        system: "LA_BARRE", instance: PORTFOLIO_BARRE_INSTANCE, kind: "project", id: projectId.trim(),
      } } : {}) } : {}),
    });
    if (!result.success) { setFormError(result.error.issues.map((i) => i.message).join(" · ")); return; }
    const next = PortfolioReferencesSchema.safeParse([...refs, result.data]);
    if (!next.success) { setFormError(next.error.issues.map((i) => i.message).join(" · ")); return; }
    setRefs(next.data); setId(""); setUrl(""); setTitle(""); setFormError(null);
  }
  const mutation = trpc.brandNode.update.useMutation({ onSuccess: () => { setEditing(false); onSaved(); } });
  return <div className="rounded-xl border border-border p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-medium">Raccordements de {node.name}</h2><p className="mt-1 text-xs text-foreground-secondary">Associer les bons dossiers sans déplacer leur contenu.</p></div><button disabled={inspected.issues.length > 0} onClick={() => { setRefs(readPortfolioReferences(node.sourceRefs)); setReadVersion(node.updatedAt.toISOString()); setFormError(null); mutation.reset(); setEditing(!editing); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised disabled:opacity-50">{editing ? "Annuler" : "Modifier les liens"}</button></div>
    {inspected.issues.length > 0 && <p role="alert" className="mt-4 text-sm text-warning">Certains raccordements sont à réparer. Les liens lisibles restent consultables ; l’enregistrement est bloqué pour préserver les entrées rejetées.</p>}
    {editing && <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ strategyId: node.strategyId ?? `audit:${node.operatorId}`, operatorId: node.operatorId, nodeId: node.id, expectedUpdatedAt: readVersion, patches: { sourceRefs: refs } }); }}>
      <ul className="space-y-2">{refs.map((r, i) => <li key={portfolioReferenceKey(r)} className="flex min-w-0 items-center justify-between gap-3 text-sm"><span className="break-all">{OPTIONS.find(([key]) => key === `${r.system}:${r.kind}`)?.[1]} · {r.label ?? r.id}{r.instance ? ` · ${r.instance}` : ""}{r.project ? ` · ${r.project.id}` : ""}</span><button type="button" className="shrink-0 text-xs text-error underline" onClick={() => setRefs(refs.filter((_, j) => i !== j))}>Délier</button></li>)}</ul>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Outil source<select value={type} onChange={(e) => { setType(e.target.value); setFormError(null); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">{OPTIONS.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label className="text-xs">Identifiant dans cet outil<input value={id} onChange={(e) => setId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label><label className="text-xs">Titre ou code affiché, si utile<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label>{radar && <><label className="text-xs">Instance Radar<input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="radar-matanga" className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label><label className="text-xs sm:col-span-2">Projet d’origine dans La Barre Matanga, si relié<input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="PRJ-EOTY26" className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label></>}<label className="text-xs sm:col-span-2">Lien d’accès, si disponible<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label></div>
      <button type="button" disabled={!id.trim() || (radar && !instance.trim())} onClick={addReference} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Ajouter ce lien</button>
      {radar && <p className="text-xs text-foreground-secondary">L’identifiant numérique figure dans l’adresse du dossier Radar. Relier un suivi ne confirme ni sa réception ni sa livraison.</p>}
      {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
      {mutation.error && <p role="alert" className="text-sm text-error">{mutation.error.message}</p>}
      <div><button disabled={mutation.isPending} type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm text-background disabled:opacity-50">{mutation.isPending ? "Enregistrement…" : "Enregistrer les raccordements"}</button></div>
    </form>}
  </div>;
}
