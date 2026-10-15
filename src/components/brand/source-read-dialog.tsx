"use client";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/primitives/button";
import type { SourceReceipt } from "@/domain/source-certainty";

/** Scoped source reader shared by Sources, Guidelines and portfolio. No writes. */
export function SourceReadDialog({ sourceId, strategyId, onClose, onCite }: {
  sourceId: string; strategyId: string; onClose: () => void;
  /** Explicit local draft attachment; opening/reading is never a validation. */
  onCite?: (receipt: SourceReceipt) => void;
}) {
  const source = trpc.ingestion.getSource.useQuery({ id: sourceId, strategyId }, {
    staleTime: 0, refetchOnMount: "always",
    retry: (failureCount, error) => error.data?.code !== "FORBIDDEN" && failureCount < 3,
  });
  // Cached text is not a current access receipt after a grant is revoked.
  const loading = source.isLoading || source.isFetching;
  return <Modal open onClose={onClose} title="Consulter la source" size="lg">
    {loading && <p role="status">Chargement…</p>}
    {!loading && source.error && <p role="alert" className="text-error">{source.error.message}</p>}
    {!loading && !source.error && source.data && <div className="space-y-4 text-sm">
      <label className="block space-y-2"><span>Titre</span><input aria-label="Titre de la source" readOnly value={source.data.fileName ?? ""} className="w-full rounded border border-border bg-surface-raised px-3 py-2 text-foreground" /></label>
      <label className="block space-y-2"><span>Texte de référence</span><textarea aria-label="Texte de référence" readOnly value={source.data.rawContent ?? ""} rows={18} className="w-full resize-y rounded border border-border bg-surface-raised px-3 py-2 text-foreground" /></label>
      {!source.data.rawContent && <p className="text-foreground-secondary">Aucun texte conservé dans cette source.</p>}
    </div>}
    {onCite && <p className="mt-4 text-sm text-foreground-secondary">Cette référence conserve la version consultée du document. Elle ne valide pas son contenu.</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={onClose}>Fermer</Button>
      {onCite && <Button disabled={loading || Boolean(source.error) || !source.data?.rawContent?.trim() || !source.data.contentHash}
        onClick={() => {
          if (!loading && !source.error && source.data?.rawContent?.trim() && source.data.contentHash) {
            onCite({ sourceId: source.data.id, contentHash: source.data.contentHash });
          }
        }}>Utiliser cette version comme référence</Button>}
    </div>
  </Modal>;
}
