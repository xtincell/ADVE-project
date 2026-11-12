"use client";

import type { BrandAsset } from "@prisma/client";
import type { loadAssetDossier } from "@/server/services/brand-vault/dossier";

type Asset = Pick<BrandAsset, "version" | "state" | "staleAt" | "staleReason" | "content"> & { dossier: Awaited<ReturnType<typeof loadAssetDossier>> };
const states: Record<string, string> = { DRAFT: "Brouillon", CANDIDATE: "À examiner", SELECTED: "Sélectionné", ACTIVE: "En usage", SUPERSEDED: "Édition antérieure", ARCHIVED: "Archivé", REJECTED: "Non retenu" };
const date = (value: Date | string) => new Date(value).toLocaleString("fr-FR");

/** Full content stays readable; nested structures expand without clipped JSON previews. */
export function AssetContent({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span className="text-foreground-muted">Non consigné</span>;
  if (typeof value !== "object") return <p className="whitespace-pre-wrap break-words">{String(value)}</p>;
  if (depth > 6) return <pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(value, null, 2)}</pre>;
  const entries = Object.entries(value).filter(([key]) => !key.startsWith("_"));
  return <div className="space-y-3">{entries.map(([key, item]) => <details key={key} open={depth === 0} className="rounded-lg border border-border p-3">
    <summary className="cursor-pointer font-medium text-foreground">{Array.isArray(value) ? `Élément ${Number(key) + 1}` : key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}</summary>
    <div className="mt-2 text-sm text-foreground-secondary"><AssetContent value={item} depth={depth + 1} /></div>
  </details>)}</div>;
}

export function AssetDossier({ asset, onVersion }: { asset: Asset; onVersion: (id: string) => void }) {
  const { dossier } = asset;
  const { authorship: author, selection, source, usages } = dossier;
  return <div className="space-y-4 text-sm">
    <section className="rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground">Origine et responsabilité</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><dt className="text-foreground-muted">Gouverneur du DAM</dt><dd>Mestor</dd></div>
        <div><dt className="text-foreground-muted">Production</dt><dd>{author.producer ?? "Auteur non consigné dans cette édition"}</dd></div>
        <div><dt className="text-foreground-muted">Moteur / modèle</dt><dd className="break-words">{[author.provider, author.model].filter(Boolean).join(" · ") || "Non consignés"}</dd></div>
        {source.tool && <div><dt className="text-foreground-muted">Outil d’origine</dt><dd className="break-words">{source.tool}</dd></div>}
        {source.generatedAt && <div><dt className="text-foreground-muted">Production enregistrée</dt><dd>{date(source.generatedAt)}</dd></div>}
        {author.depositedBy && <div><dt className="text-foreground-muted">Déposé par</dt><dd>{author.depositedBy} · le déposant n’est pas nécessairement l’auteur</dd></div>}
        <div className="sm:col-span-2"><dt className="text-foreground-muted">Sélection humaine</dt><dd>{selection.by ? `${selection.by}${selection.at ? ` · ${date(selection.at)}` : ""}` : "Aucune sélection humaine attribuée dans cette édition."}</dd>{selection.reason && <dd>{selection.reason}</dd>}</div>
      </dl>
      <p className="mt-3 text-foreground-secondary">Le dépôt conserve le contenu. Sa sélection et sa mise en usage restent des décisions de votre équipe.</p>
      {asset.staleAt && <p role="status" className="mt-3 text-warning">Source modifiée : {asset.staleReason || "réexaminer cet actif avant sa réutilisation"}.</p>}
    </section>
    <section className="rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground">Éditions reliées</h3>
      <p className="mt-2">Édition consultée : {asset.version} · {states[asset.state] ?? asset.state}</p>
      {dossier.versions.length ? <ul className="mt-3 space-y-2">{dossier.versions.map(version => <li key={version.id}><button type="button" onClick={() => onVersion(version.id)} className="text-left text-info underline underline-offset-2">V{version.version} · {version.name} · {states[version.state] ?? version.state}</button><span className="block text-xs text-foreground-muted">{date(version.createdAt)}</span></li>)}</ul> : <p className="mt-2 text-foreground-muted">Aucune autre édition reliée. Les anciens actifs sans filiation ne sont pas regroupés arbitrairement.</p>}
      {dossier.versionsTruncated && <p className="mt-2 text-foreground-muted">100 éditions voisines affichées.</p>}
    </section>
    <section className="rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground">Usages enregistrés</h3>
      {usages.campaign && <p className="mt-2">Campagne : {usages.campaign.name}</p>}
      {usages.brief && <p className="mt-2">Brief : {usages.brief.title} · V{usages.brief.version}</p>}
      {usages.tasks.map(task => <p className="mt-2" key={task.id}>Production {task.forgeKind} · {task.status} · {date(task.createdAt)}</p>)}
      {usages.deliverables.map(item => <p className="mt-2" key={item.id}>{item.campaign.name} · {item.deliverableType} · {item.status}</p>)}
      {!usages.campaign && !usages.brief && !usages.tasks.length && !usages.deliverables.length && <p className="mt-2 text-foreground-muted">Aucun usage relié à cet actif dans les productions et livrables de campagne.</p>}
      {usages.truncated && <p className="mt-2 text-foreground-muted">Les 50 premiers usages par catégorie sont affichés.</p>}
    </section>
    {asset.content && typeof asset.content === "object" && Object.keys(asset.content).some(key => !key.startsWith("_")) && <section><h3 className="mb-3 font-semibold text-foreground">Contenu de cette édition</h3><AssetContent value={asset.content} /></section>}
  </div>;
}
