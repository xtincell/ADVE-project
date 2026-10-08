"use client";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/primitives/button";

/** Existing scoped source reader, shared by Sources and Guidelines. No writes. */
export function SourceReadDialog({ sourceId, strategyId, onClose }: {
  sourceId: string; strategyId: string; onClose: () => void;
}) {
  const source = trpc.ingestion.getSource.useQuery({ id: sourceId, strategyId }, {
    staleTime: 0, refetchOnMount: "always",
  });
  return <Modal open onClose={onClose} title="Consulter la source" size="lg">
    {source.isLoading && <p role="status">Chargement…</p>}
    {source.error && <p role="alert" className="text-error">{source.error.message}</p>}
    {!source.error && source.data && <div className="space-y-4 text-sm">
      <label className="block space-y-2"><span>Titre</span><input aria-label="Titre de la source" readOnly value={source.data.fileName ?? ""} className="w-full rounded border border-border bg-surface-raised px-3 py-2 text-foreground" /></label>
      <label className="block space-y-2"><span>Texte de référence</span><textarea aria-label="Texte de référence" readOnly value={source.data.rawContent ?? ""} rows={18} className="w-full resize-y rounded border border-border bg-surface-raised px-3 py-2 text-foreground" /></label>
      {!source.data.rawContent && <p className="text-foreground-secondary">Aucun texte conservé dans cette source.</p>}
    </div>}
    <div className="mt-4 flex justify-end"><Button variant="outline" onClick={onClose}>Fermer</Button></div>
  </Modal>;
}
