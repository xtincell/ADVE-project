"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/primitives/button";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL, type DocumentEdition } from "@/domain/source-document";

type Source = { id: string; fileName: string | null; contentHash?: string; document?: DocumentEdition | null; shared?: boolean; indexedChunks?: number };
/** Same Sources dossier, organized by document lineage. Reading never approves. */
export function DocumentLibrary({ sources, onRead, canManage = false, onSaved }: { sources: Source[]; onRead: (id: string) => void; canManage?: boolean; onSaved?: () => void }) {
  const [decision, setDecision] = useState<Source | null>(null);
  const [search, setSearch] = useState("");
  const grouped = new Map<string, Source[]>();
  for (const source of sources) if (source.document) grouped.set(source.document.family, [...(grouped.get(source.document.family) ?? []), source]);
  return <section aria-labelledby="document-library-title" className="space-y-3 rounded-lg border border-border p-4">
    <h2 id="document-library-title" className="text-lg font-semibold">Dossier documentaire</h2>
    <p className="text-sm text-foreground-secondary">Études, modèles économiques, identité, présentations et autres pièces. Les propositions attendent une décision ; leur dépôt ne modifie pas votre stratégie.</p>
    {grouped.size === 0 && <p className="text-sm text-foreground-muted">Aucun document classé ici. Classez vos pièces depuis les sources de marque.</p>}
    <label className="block text-sm">Rechercher un document<input className="mt-1 w-full rounded border border-border bg-surface-raised px-3 py-2 text-foreground" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {decision && <DocumentDecisionDialog source={decision} onClose={() => setDecision(null)} onSaved={() => onSaved?.()} />}
    {[...grouped].filter(([family, rows]) => (family + " " + rows.map(r => r.fileName).join(" ")).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(([family, rows]) => <article key={family} className="space-y-2 rounded border border-border p-3">
      <h3 className="font-medium">{family}</h3>
      {rows.sort((a, b) => b.document!.edition - a.document!.edition).map(source => <div key={source.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-border py-2 text-sm">
        <div><p>{DOCUMENT_KIND_LABEL[source.document!.kind]} · {source.document!.label}</p>
          <p className="text-foreground-secondary">{DOCUMENT_STATUS_LABEL[source.document!.status]}</p>
          {source.document!.sourceUrl && <a className="text-xs text-accent underline" href={source.document!.sourceUrl} target="_blank" rel="noopener noreferrer">Source d’origine</a>}
          {source.document!.clarifications?.map((c, i) => <p key={i} className="text-xs text-foreground-secondary">Précision du {new Date(c.at).toLocaleDateString("fr-FR")} : {c.text}</p>)}
          {source.document!.clarifications?.length ? <details className="text-xs text-foreground-muted"><summary>Annotation initiale conservée</summary><p>{source.document!.changeSummary}</p></details>
            : <p className="text-xs text-foreground-muted">Lors du dépôt : {source.document!.changeSummary}</p>}
          {source.document!.decisions?.at(-1) && <p className="text-xs text-foreground-secondary">Dernière décision : {source.document!.decisions!.at(-1)!.reason}</p>}
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onRead(source.id)}>Consulter cette édition</Button>
        {canManage && !source.shared && <Button variant="outline" size="sm" onClick={() => setDecision(source)}>Préciser sa place</Button>}</div>
      </div>)}
    </article>)}
  </section>;
}

/** Classifies an already retained original. Adds lineage; never copies its text. */
export function DocumentEditionDialog({ source, sources, onClose, onSaved }: {
  source: Source; sources: Source[]; onClose: () => void; onSaved: () => void;
}) {
  const [family, setFamily] = useState("");
  const [kind, setKind] = useState<typeof DOCUMENT_KINDS[number]>("OTHER");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"PROPOSED" | "REFERENCE" | "ARCHIVED">("PROPOSED");
  const [changeSummary, setChangeSummary] = useState("");
  const current = trpc.ingestion.getSource.useQuery({ id: source.id }, { staleTime: 0, refetchOnMount: "always" });
  const mutation = trpc.ingestion.updateSource.useMutation({ onSuccess: () => { onSaved(); onClose(); } });
  const latest = sources.filter(s => s.document?.family === family.trim()).sort((a, b) => b.document!.edition - a.document!.edition)[0];
  const field = "w-full rounded border border-border bg-surface-raised px-3 py-2 text-foreground";
  return <Modal open onClose={onClose} title="Classer une édition documentaire" size="lg">
    <form className="space-y-4 text-sm" onSubmit={e => { e.preventDefault(); if (!current.data || current.isFetching) return;
      mutation.mutate({ id: source.id, expectedSourceHash: current.data.contentHash, document: {
        family, kind: latest?.document?.kind ?? kind, label, status, changeSummary,
        ...(latest?.contentHash ? { previous: { sourceId: latest.id, contentHash: latest.contentHash } } : {}),
      } });
    }}>
      <p>{source.fileName}</p>
      <label className="block space-y-1"><span>Document suivi</span><input required value={family} onChange={e => setFamily(e.target.value)} list="document-families" className={field} placeholder="Exemple : Modèle économique SPAWT" /></label>
      <datalist id="document-families">{[...new Set(sources.flatMap(s => s.document ? [s.document.family] : []))].map(f => <option key={f} value={f} />)}</datalist>
      <label className="block space-y-1"><span>Type de document</span><select value={latest?.document?.kind ?? kind} disabled={Boolean(latest)} onChange={e => setKind(e.target.value as typeof kind)} className={field}>{DOCUMENT_KINDS.map(k => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}</select></label>
      <label className="block space-y-1"><span>Version ou date de l’édition</span><input required value={label} onChange={e => setLabel(e.target.value)} className={field} placeholder="Exemple : v3 · 18 octobre 2026" /></label>
      <label className="block space-y-1"><span>Place dans le dossier</span><select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={field}>
        <option value="PROPOSED">Proposition à soumettre à l’équipe</option><option value="REFERENCE">Référence de travail</option><option value="ARCHIVED">Archive consultable</option>
      </select></label>
      <label className="block space-y-1"><span>Ce qui change et ce qui reste à décider</span><textarea required value={changeSummary} onChange={e => setChangeSummary(e.target.value)} rows={3} className={field} /></label>
      <p className="text-foreground-secondary">{status === "REFERENCE" ? "Ce choix remplace la référence précédente dans les recherches. Il ne valide pas les assertions du document et n’amende pas votre stratégie." : "Une proposition reste distincte de la référence de travail. Les éditions antérieures restent conservées."}</p>
      {(mutation.error || current.error) && <p role="alert" className="text-error">{(mutation.error ?? current.error)?.message}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" disabled={!current.data || current.isFetching || mutation.isPending}>Conserver cette édition</Button></div>
    </form>
  </Modal>;
}

function DocumentDecisionDialog({ source, onClose, onSaved }: { source: Source; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<"CLARIFY" | "REFERENCE" | "ARCHIVED">("CLARIFY");
  const [reason, setReason] = useState("");
  const current = trpc.ingestion.getSource.useQuery({ id: source.id }, { staleTime: 0, refetchOnMount: "always" });
  const mutation = trpc.ingestion.updateSource.useMutation({ onSuccess: () => { onSaved(); onClose(); } });
  return <Modal open onClose={onClose} title="Place de cette édition" size="lg"><form className="space-y-4 text-sm" onSubmit={e => {
    e.preventDefault(); if (current.data && !current.isFetching) mutation.mutate({ id: source.id, expectedSourceHash: current.data.contentHash,
      ...(status === "CLARIFY" ? { documentClarification: reason } : { documentDecision: { status, reason } }) });
  }}>
    <p>{source.fileName} · {source.document?.label}</p>
    <label className="block space-y-1"><span>Action</span><select className="w-full rounded border border-border bg-surface-raised p-2" value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="CLARIFY">Ajouter une précision, sans changer son usage</option><option value="REFERENCE">Définir comme référence de travail</option><option value="ARCHIVED">Conserver dans les archives</option></select></label>
    <label className="block space-y-1"><span>{status === "CLARIFY" ? "Précision à conserver" : "Décision et motif"}</span><textarea required rows={4} maxLength={4000} className="w-full rounded border border-border bg-surface-raised p-2" value={reason} onChange={e => setReason(e.target.value)} /></label>
    <p className="text-foreground-secondary">{status === "CLARIFY" ? "La précision sera datée et attribuée à votre compte. L’usage, les éditions et l’annotation initiale restent conservés." : "La décision sera datée et attribuée à votre compte. Les éditions restent conservées. Les fondamentaux de la marque ne sont pas modifiés par ce choix."}</p>
    {(mutation.error || current.error) && <p role="alert" className="text-error">{(mutation.error ?? current.error)?.message}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" disabled={!current.data || current.isFetching || mutation.isPending}>{status === "CLARIFY" ? "Conserver cette précision" : "Enregistrer la décision"}</Button></div>
  </form></Modal>;
}
