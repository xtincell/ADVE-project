"use client";

import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { portfolioFileUrl } from "@/domain/portfolio-reference";

function Content({ value }: { value: unknown }) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return <ul className="space-y-4 border-l border-border pl-4">{value.map((item, i) => <li key={i}><Content value={item} /></li>)}</ul>;
  if (typeof value === "object") return <dl className="space-y-4">{Object.entries(value as Record<string, unknown>).map(([key, item]) => <div key={key}><dt className="mb-1 text-xs font-medium capitalize text-foreground-secondary">{key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}</dt><dd><Content value={item} /></dd></div>)}</dl>;
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{typeof value === "boolean" ? value ? "Oui" : "Non" : String(value)}</p>;
}

/** Existing vault read API: load the full payload only when a person opens it. */
export function AssetContent({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const asset = trpc.brandVault.get.useQuery({ id: assetId });
  const fileUrl = portfolioFileUrl(asset.data?.fileUrl);
  const content = asset.data?.content;
  const failed = content != null && typeof content === "object" && !Array.isArray(content) && content.status === "FAILED";
  return <Modal open onClose={onClose} title={asset.data?.name ?? "Contenu de l’asset"} size="lg">
    {asset.isLoading && <p role="status" className="text-sm text-foreground-secondary">Lecture du contenu…</p>}
    {asset.error && <p role="alert" className="text-sm text-error">{asset.error.message}</p>}
    {asset.data && <div className="space-y-5">
      <p className="text-xs text-foreground-secondary">Version {asset.data.version} · conservée dans La Fusée</p>
      {failed && <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Cette tentative de génération a échoué. Elle est conservée pour son historique.</p>}
      {asset.data.summary && <p className="text-sm leading-relaxed">{asset.data.summary}</p>}
      {asset.data.content ? <Content value={asset.data.content} /> : <p className="text-sm text-foreground-secondary">Aucun contenu textuel enregistré dans cette fiche.</p>}
      {fileUrl && <a className="inline-block text-sm text-accent underline" href={fileUrl} target="_blank" rel="noreferrer">Ouvrir le fichier associé</a>}
    </div>}
  </Modal>;
}
