"use client";
import { useState } from "react";
import type { BrandNode } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import { readPortfolioReferences, type PortfolioReference } from "@/domain/portfolio-reference";

const OPTIONS = [
  ["LA_BARRE:client", "La Barre · client"], ["LA_BARRE:brand", "La Barre · marque"],
  ["LA_BARRE:range", "La Barre · gamme"], ["LA_BARRE:sku", "La Barre · référence produit"],
  ["LA_BARRE:project", "La Barre · projet"], ["LA_FUSEE:strategy", "La Fusée · dossier de stratégie"],
  ["WEB:site", "Site ou application"], ["GITHUB:repository", "Dépôt de code"],
];
export function PortfolioReferencesForm({ node, onSaved }: { node: BrandNode; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [refs, setRefs] = useState(() => readPortfolioReferences(node.sourceRefs));
  const [type, setType] = useState("LA_BARRE:brand");
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const mutation = trpc.brandNode.update.useMutation({ onSuccess: () => { setEditing(false); onSaved(); } });
  return <div className="rounded-xl border border-border p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-medium">Raccordements de {node.name}</h2><p className="mt-1 text-xs text-foreground-secondary">Associer les bons dossiers sans déplacer leur contenu.</p></div><button onClick={() => { setRefs(readPortfolioReferences(node.sourceRefs)); setEditing(!editing); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised">{editing ? "Annuler" : "Modifier les liens"}</button></div>
    {editing && <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ strategyId: node.strategyId ?? `audit:${node.operatorId}`, operatorId: node.operatorId, nodeId: node.id, patches: { sourceRefs: refs } }); }}>
      <ul className="space-y-2">{refs.map((r, i) => <li key={`${r.system}:${r.id}`} className="flex min-w-0 items-center justify-between gap-3 text-sm"><span className="break-all">{OPTIONS.find(([key]) => key === `${r.system}:${r.kind}`)?.[1]} · {r.label ?? r.id}</span><button type="button" className="shrink-0 text-xs text-error underline" onClick={() => setRefs(refs.filter((_, j) => i !== j))}>Délier</button></li>)}</ul>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Outil source<select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">{OPTIONS.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label className="text-xs">Identifiant dans cet outil<input value={id} onChange={(e) => setId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label><label className="text-xs sm:col-span-2">Lien d’accès, si disponible<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label></div>
      <button type="button" disabled={!id.trim()} onClick={() => { const [system, kind] = type.split(":") as [PortfolioReference["system"], PortfolioReference["kind"]]; if (!refs.some((r) => r.system === system && r.kind === kind && r.id === id.trim())) setRefs([...refs, { system, kind, id: id.trim(), ...(url.trim() ? { url: url.trim() } : {}) }]); setId(""); setUrl(""); }} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Ajouter ce lien</button>
      {mutation.error && <p role="alert" className="text-sm text-error">{mutation.error.message}</p>}
      <div><button disabled={mutation.isPending} type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm text-background disabled:opacity-50">{mutation.isPending ? "Enregistrement…" : "Enregistrer les raccordements"}</button></div>
    </form>}
  </div>;
}
