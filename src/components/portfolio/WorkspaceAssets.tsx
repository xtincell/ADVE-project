"use client";

import { useState } from "react";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import { groupWorkspaceAssets, type WorkspaceAsset } from "@/domain/portfolio-barre";

export function WorkspaceAssetMedia({ asset }: { asset: WorkspaceAsset }) {
  const [failed, setFailed] = useState(false);
  return <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-surface-raised">
    {asset.preview && !failed ? <img src={asset.preview} alt={asset.name} loading="lazy" className="h-full w-full object-contain p-3" onError={() => setFailed(true)} />
      : <div className="px-6 text-center text-foreground-secondary"><ImageIcon className="mx-auto mb-2 h-6 w-6" /><span className="text-xs">{failed ? "Aperçu indisponible" : "Sans aperçu"}</span></div>}
  </div>;
}

export function WorkspaceAssets({ assets, search, includeArchives, onSelectContent }: {
  assets: WorkspaceAsset[];
  search: string;
  includeArchives: boolean;
  onSelectContent: (id: string) => void;
}) {
  const visible = groupWorkspaceAssets(assets, { includeArchives, search });
  if (!visible.length) return <div className="rounded-xl border border-dashed border-border p-8 text-sm text-foreground-secondary">Aucun asset correspondant dans les sources disponibles.</div>;
  const references = visible.reduce((count, group) => count + group.usages.length, 0);
  return <div className="space-y-4">
    <p role="status" className="text-xs text-foreground-secondary">{visible.length} {visible.length === 1 ? "entrée affichée" : "entrées affichées"} · {references} {references === 1 ? "référence" : "références"}. Les liens de fichiers communs sont regroupés ; les dossiers restent distincts.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((group) => {
      const asset = group.usages[0]!;
      const names = [...new Set(group.usages.map((usage) => usage.name))];
      const shared = group.usages.length > 1;
      return <article key={group.id} className="min-w-0 rounded-xl border border-border p-3">
        <WorkspaceAssetMedia asset={group.usages.find((usage) => usage.preview) ?? asset} />
        <div className="p-2">
          <p className="mt-2 text-xs text-accent">{shared ? `${group.usages.length} rattachements · ${asset.source}` : asset.brand}</p>
          <h3 className="mt-1 break-words text-sm font-medium">{names.length === 1 ? names[0] : "Fichier partagé"}</h3>
          {shared && <p className="mt-2 text-xs text-foreground-secondary">Même lien de fichier. Chaque contenu et son état restent propres à son dossier.</p>}
          {group.usages.map((usage) => <div key={usage.id} className="mt-3 border-t border-border pt-3">
            {shared && <p className="break-words text-xs font-medium">{usage.brand}{names.length > 1 ? ` · ${usage.name}` : ""}</p>}
            <p className="mt-1 text-xs text-foreground-secondary">{usage.kind} · {usage.state} · {usage.source}</p>
            {usage.note && <details className="mt-2 text-xs text-foreground-secondary"><summary className="cursor-pointer">Provenance et usage</summary><p className="mt-2 whitespace-pre-line break-words">{usage.note}</p></details>}
            {usage.nativeId && <button type="button" aria-label={`Consulter le contenu · ${usage.brand} · ${usage.name}`} onClick={() => onSelectContent(usage.nativeId!)} className="mt-3 text-xs text-accent underline">Consulter le contenu</button>}
          </div>)}
          {group.url && <a href={group.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs underline">Ouvrir le fichier <ArrowUpRight className="h-3 w-3" /></a>}
        </div>
      </article>;
    })}</div>
  </div>;
}
