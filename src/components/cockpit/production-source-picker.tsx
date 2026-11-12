"use client";

import { useDeferredValue, useState } from "react";
import { brandAssetPreviewUrl } from "@/lib/brand-asset-preview";
import { trpc } from "@/lib/trpc/client";
import { type ProductionPin } from "@/domain/production-sources";

const ROLES = {
  ART_DIRECTION: "Direction artistique retenue",
  COPY: "Texte retenu",
  REFERENCE: "Référence d’inspiration",
  MATERIAL: "Élément à intégrer",
} as const;

type SourceRole = ProductionPin["role"];
export type SourceChoice = ProductionPin & { name: string; mimeType?: string | null };

const PAGE_SIZE = 12;

function SourceResults({ strategyId, role, search, selection, onSelect }: {
  strategyId: string; role: SourceRole; search: string;
  selection: SourceChoice[]; onSelect: (source: SourceChoice) => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const assets = trpc.brandVault.list.useQuery({
    strategyId, search: search || undefined, cursor: pages.at(-1), limit: PAGE_SIZE,
  });
  const rows = assets.data ?? [];
  if (assets.isPending) return <p role="status" className="text-sm text-foreground-secondary">Recherche dans le coffre…</p>;
  if (assets.isError) return <p role="alert">Le coffre ne répond pas. <button type="button" className="underline" onClick={() => assets.refetch()}>Réessayer</button></p>;
  return <div>
    {rows.length === 0 && <p className="text-sm text-foreground-secondary">Aucun actif sur cette page. Cherchez son nom ou son chemin dans le coffre.</p>}
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map(asset => {
        const used = selection.some(source => source.assetId === asset.id);
        const historical = ["ARCHIVED", "SUPERSEDED", "REJECTED"].includes(asset.state);
        const img = brandAssetPreviewUrl(asset);
        return <li key={asset.id}><button type="button" disabled={used || historical}
          onClick={() => onSelect({ assetId: asset.id, version: asset.version, name: asset.name, mimeType: asset.mimeType, role })}
          className="flex w-full gap-3 rounded-lg border border-border p-2 text-left hover:border-accent disabled:opacity-50">
          {img && <img src={img} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded object-contain" />}
          <span className="min-w-0"><span className="block break-words text-sm">{asset.name}</span>
            <span className="text-xs text-foreground-secondary">v{asset.version}{used ? " · retenu" : historical ? " · historique" : ""}</span>
          </span>
        </button></li>;
      })}
    </ul>
    <div className="mt-2 flex gap-4 text-xs">
      {pages.length > 0 && <button type="button" onClick={() => setPages(pages.slice(0, -1))}>Page précédente</button>}
      {rows.length === PAGE_SIZE && <button type="button" onClick={() => setPages([...pages, rows[rows.length - 1]!.id])}>Page suivante</button>}
    </div>
  </div>;
}

function PassagePicker({ strategyId, campaignId, source, onSave, close }: {
  strategyId: string; campaignId?: string; source: SourceChoice; onSave: (keys: string[]) => void; close: () => void;
}) {
  const data = trpc.deliverableOrchestrator.listSourcePassages.useQuery({ strategyId, campaignId, assetId: source.assetId, version: source.version });
  const [keys, setKeys] = useState(source.sections ?? []);
  if (data.isPending) return <p role="status">Lecture de la source…</p>;
  if (data.isError) return <p role="alert" className="text-sm">{data.error.message} <button type="button" className="underline" onClick={close}>Fermer</button></p>;
  const chosen = data.data.passages.filter(p => keys.includes(p.key));
  const size = keys.length ? chosen.map(p=>p.text).join("\n\n").length : data.data.totalCharacters;
  return <div className="space-y-2 rounded border border-border p-3">
    <p className="text-sm">Choisissez les passages utilisés dans ce brief. Sans sélection, le document entier est retenu.</p>
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {data.data.passages.map((p, index) => <label key={p.key + index} className="flex items-start gap-2 rounded border border-border p-2">
        <input type="checkbox" checked={keys.includes(p.key)} onChange={e => setKeys(e.target.checked ? [...keys,p.key] : keys.filter(k=>k!==p.key))} />
        <span className="min-w-0 text-sm"><strong>{p.title}</strong><span className="block break-words text-xs text-foreground-secondary">{p.text.slice(0,180)}{p.text.length > 180 ? "…" : ""}</span></span>
      </label>)}
    </div>
    <p className="text-xs" role="status">{size.toLocaleString("fr-FR")} caractères retenus · limite de 16 000 par source.</p>
    <div className="flex gap-3 text-sm"><button type="button" disabled={size>16_000} onClick={() => onSave(keys)} className="rounded bg-accent px-3 py-1 text-background disabled:opacity-50">Retenir cette sélection</button>
    <button type="button" onClick={close} className="underline">Annuler</button></div>
  </div>;
}

function ArtworkControls({strategyId, campaignId, source, change}: {
  strategyId: string; campaignId?: string; source: SourceChoice; change: (value: SourceChoice["artwork"]) => void;
}) {
  const layers = trpc.deliverableOrchestrator.listArtworkLayers.useQuery({strategyId,campaignId,assetId:source.assetId, version:source.version},{retry:false});
  if (layers.isPending) return <p className="text-xs">Lecture des calques autorisés du master…</p>;
  if (layers.isError) return <p role="alert" className="text-xs">{layers.error.message}</p>;
  return <div className="flex flex-wrap gap-3 text-xs">
    <label>Calque d’illustration · {layers.data.width} × {layers.data.height}
      <select className="block rounded border border-border bg-background p-2"
        value={source.artwork?.photoLayerId ?? ""} onChange={e=>change(e.target.value ? {photoLayerId:e.target.value, photoPolicy:source.artwork?.photoPolicy ?? "LOCKED_MASTER"} : undefined)}>
        <option value="">Choisir le calque</option>
        {layers.data.imageLayers.map(layer=><option key={layer.id} value={layer.id}>{layer.id} · {layer.width} × {layer.height}</option>)}
      </select>
    </label>
    {source.artwork && <label>Traitement du calque
      <select className="block rounded border border-border bg-background p-2" value={source.artwork.photoPolicy}
        onChange={e=>change({...source.artwork!,photoPolicy:e.target.value==="GENERATED_CANDIDATE"?"GENERATED_CANDIDATE":"LOCKED_MASTER"})}>
        <option value="LOCKED_MASTER">Conserver la photographie du master</option>
        <option value="GENERATED_CANDIDATE">Proposer une nouvelle photographie</option>
      </select>
    </label>}
  </div>;
}

export function ProductionSourcePicker({ strategyId, campaignId, selection, onChange }: {
  strategyId: string; campaignId?: string; selection: SourceChoice[]; onChange: (sources: SourceChoice[]) => void;
}) {
  const [role, setRole] = useState<SourceRole>("ART_DIRECTION");
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim());
  const [browse, setBrowse] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  function choose(source: SourceChoice) {
    const single = source.role === "ART_DIRECTION" || source.role === "COPY";
    onChange([...selection.filter(item => !single || item.role !== source.role), source]);
    setBrowse(false);
    setEditId(source.role === "ART_DIRECTION" || source.role === "COPY" ? source.assetId : null);
  }
  return <section aria-label="Sources de production" className="space-y-3 rounded-xl border border-border bg-background/80 p-5">
    <h3 className="font-semibold">Sources de cette production</h3>
    <p className="text-sm text-foreground-secondary">Choisissez la piste et le texte à conserver. Une image d’inspiration reste distincte d’un élément à incorporer au visuel.</p>
    {selection.length > 0 && <ul className="divide-y divide-border">
      {selection.map(source => <li key={source.role + source.assetId} className="space-y-2 py-2"><div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs text-foreground-secondary">{ROLES[source.role]}</p>
          <span className="break-words text-sm font-medium">{source.name}</span> <span className="text-xs">v{source.version}</span>
          {source.role !== "MATERIAL" && !/\.(?:jpe?g|png|webp|gif|svg)$/i.test(source.name) && <button type="button" className="ml-3 text-xs underline" onClick={() => setEditId(editId === source.assetId ? null : source.assetId)}>
            {source.sections?.length ? `${source.sections.length} passage(s) retenu(s)` : "Choisir les passages"}
          </button>}</div>
        <button type="button" aria-label={`Retirer ${source.name}`} className="text-xs underline"
          onClick={() => onChange(selection.filter(item => item !== source))}>Retirer</button></div>
        {source.role==="MATERIAL" && (source.mimeType === "image/svg+xml" || source.artwork || /\.svg$/i.test(source.name)) && <ArtworkControls strategyId={strategyId} campaignId={campaignId}
          source={source} change={artwork=>onChange(selection.map(item=>item===source?{...item,artwork}:item))} />}
        {editId === source.assetId && <PassagePicker key={source.assetId} strategyId={strategyId} campaignId={campaignId} source={source} close={() => setEditId(null)}
          onSave={keys => { onChange(selection.map(item => item === source ? { ...item, sections: keys.length ? keys : undefined } : item)); setEditId(null); }} />}
      </li>)}
    </ul>}
    <button type="button" aria-expanded={browse} disabled={selection.length >= 12 && !browse} onClick={() => setBrowse(!browse)} className="rounded-lg border border-border px-3 py-2 text-sm">
      {browse ? "Fermer le sélecteur" : "Choisir une source du coffre"}
    </button>
    {browse && <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Usage de la source<select value={role} onChange={event => setRole(event.target.value as SourceRole)} className="mt-1 block w-full rounded border border-border bg-background p-2">
          {Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="text-xs">Rechercher dans le coffre<input maxLength={200} value={search} onChange={event => setSearch(event.target.value)} className="mt-1 block w-full rounded border border-border bg-background p-2" placeholder="Nom ou chemin du fichier" /></label>
      </div>
      <SourceResults key={strategyId + ":" + query} strategyId={strategyId} search={query} role={role} selection={selection} onSelect={choose} />
    </div>}
  </section>;
}
