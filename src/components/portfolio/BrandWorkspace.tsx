"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Search, Layers3, FolderOpen, ImageIcon, FileText, AlertCircle, RefreshCw, Link2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { PORTFOLIO_KIND_LABELS, PORTFOLIO_LIFECYCLE_LABELS, portfolioFileUrl, readPortfolioReferences, portfolioProjectFollowUps, type PortfolioReference } from "@/domain/portfolio-reference";
import type { PortfolioWorkspace } from "@/server/services/brand-node/workspace";
import type { WorkspaceAsset } from "@/domain/portfolio-barre";
import { AssetContent } from "./AssetContent";
import { PortfolioReferencesForm } from "./PortfolioReferencesForm";

type Section = "overview" | "projects" | "products" | "assets" | "identity" | "sources";
const TABS: Array<[Section, string]> = [["overview", "Vue d’ensemble"], ["projects", "Campagnes & projets"], ["products", "Produits & gammes"], ["assets", "Assets"], ["identity", "Identité"], ["sources", "Sources & liens"]];
const STATE_LABELS: Record<string, string> = { creation: "En création", livre: "Livré", termine: "Terminé", archive: "Archivé", ACTIVE: "Actif", SELECTED: "Sélectionné", DRAFT: "Brouillon", ARCHIVED: "Archivé", SUPERSEDED: "Remplacé", AI_PROPOSED: "Proposé", VALIDATED: "Validé", BRIEF_DRAFT: "Brief à compléter", EXTRACTED: "Texte extrait", PROCESSED: "Analysé", FAILED: "Échec de lecture", OFFICIAL: "Document officiel", DECLARED: "Déclaré", INFERRED: "Inféré" };
const label = (s: string) => STATE_LABELS[s] ?? s;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dateLabel = (s: string) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); };

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-sm text-foreground-secondary">{children}</div>;
}
function Media({ asset }: { asset: WorkspaceAsset }) {
  const [failed, setFailed] = useState(false);
  return <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-surface-raised">
    {asset.preview && !failed ? <img src={asset.preview} alt={asset.name} loading="lazy" className="h-full w-full object-contain p-3" onError={() => setFailed(true)} />
      : <div className="px-6 text-center text-foreground-secondary"><ImageIcon className="mx-auto mb-2 h-6 w-6" /><span className="text-xs">{failed ? "Aperçu indisponible" : "Sans aperçu"}</span></div>}
  </div>;
}

export function BrandWorkspace({ nodeId }: { nodeId: string }) {
  const query = trpc.brandNode.workspace.useQuery({ nodeId }, { staleTime: 30_000 });
  if (query.isLoading) return <div role="status" className="rounded-xl border border-border p-8 text-foreground-secondary">Rassemblement du dossier de marque…</div>;
  if (query.error) return <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning"><p>Le dossier n’a pas pu être chargé : {query.error.message}</p><button onClick={() => void query.refetch()} className="mt-3 underline">Réessayer</button></div>;
  if (!query.data) return null;
  return <WorkspaceContent key={nodeId} data={query.data} refreshing={query.isFetching} refresh={() => void query.refetch()} />;
}

function NodeList({ nodes, operatorId }: { nodes: PortfolioWorkspace["nodes"]; operatorId: string }) {
  return <ul className="divide-y divide-border">{nodes.map((n) => <li key={n.id}><Link href={`/cockpit/portfolio/${n.slug}?operator=${encodeURIComponent(operatorId)}`} className="group flex items-center justify-between gap-4 py-4 focus-visible:outline-2 focus-visible:outline-accent"><div className="min-w-0"><span className="mb-1 block text-xs text-foreground-secondary">{PORTFOLIO_KIND_LABELS[n.nodeKind] ?? "Élément du portefeuille"} · {PORTFOLIO_LIFECYCLE_LABELS[n.lifecycle] ?? n.lifecycle}</span><span className="font-display text-xl group-hover:text-accent">{n.name}</span></div><ArrowRight className="h-4 w-4 shrink-0 text-foreground-secondary" /></Link></li>)}</ul>;
}

function WorkspaceContent({ data, refresh, refreshing }: { data: PortfolioWorkspace; refresh: () => void; refreshing: boolean }) {
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [showArchives, setShowArchives] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const { setStrategyId } = useStrategy();
  const match = (s: string) => normalize(s).includes(normalize(search));
  const barre = data.barre;
  const products = (barre?.products ?? []).filter((p) => (showArchives || !p.archived) && match(`${p.name} ${p.brand} ${p.range} ${p.format} ${p.language}`));
  const projects = (barre?.projects ?? []).filter((p) => match(`${p.name} ${p.brands.join(" ")} ${p.code}`));
  const ownChildren = data.nodes.filter((n) => n.parentNodeId === data.root.id);
  const knowledge = (barre?.knowledge ?? []).filter((k) => match(`${k.brand} ${k.title} ${k.value}`));
  const assets = useMemo(() => {
    const native: WorkspaceAsset[] = data.strategies.flatMap((s) => s.brandAssets.map((a) => ({
      id: a.id, nativeId: a.id, name: a.name, brand: s.name, kind: a.kind.replace(/_/g, " ").toLowerCase(), state: label(a.state),
      preview: portfolioFileUrl(a.fileUrl) ?? (a.fileUrl?.startsWith("data:image/") ? a.fileUrl : null),
      url: portfolioFileUrl(a.fileUrl),
      source: "La Fusée", note: [data.inheritedFrom?.strategyId === s.id ? `Asset du socle partagé de ${data.inheritedFrom.name}.` : "", a.staleAt ? "À revoir : la stratégie a changé depuis sa création." : ""].filter(Boolean).join(" "),
    })));
    return [...native, ...(barre?.assets ?? [])];
  }, [data.strategies, data.inheritedFrom, barre]);
  const filteredAssets = assets.filter((a) => (showArchives || !["Archivé", "Remplacé"].includes(a.state)) && match(`${a.name} ${a.brand} ${a.kind}`));
  const refs = data.nodes.flatMap((n) => readPortfolioReferences(n.sourceRefs).map((r) => ({ ...r, node: n.name })));
  const links = refs.filter((r) => r.system === "WEB" || r.system === "GITHUB");
  const sourceProductNodes = new Map(data.nodes.flatMap((n) => readPortfolioReferences(n.sourceRefs).filter((r) => r.system === "LA_BARRE" && r.kind === "sku").map((r) => [r.id, n.slug] as const)));
  const counts: Partial<Record<Section, number>> = { projects: barre?.projects.length, products: (barre?.products.filter((p) => !p.archived).length || ownChildren.length), assets: assets.length, identity: barre?.knowledge.length };

  return <section aria-label={`Dossier ${data.root.name}`} className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-xs text-foreground-secondary">
      <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Dossier de marque · consultation et travail manuel</p>
      <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent"><RefreshCw className="h-3 w-3" />{refreshing ? "Actualisation…" : "Actualiser les sources"}</button>
    </div>
    {data.referenceIssues.length > 0 && <div role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning"><p>Des raccordements sont à réparer. Les autres liens restent consultables.</p><ul className="mt-2 space-y-1">{data.referenceIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
    {data.sourceError && <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">{data.sourceError} Les données de La Fusée restent consultables ; les données externes ne sont pas comptées comme absentes.</p>}
    <nav aria-label="Rubriques de la marque" className="flex gap-5 overflow-x-auto border-b border-border pb-px">
      {TABS.map(([key, title]) => <button key={key} aria-current={section === key ? "page" : undefined} onClick={() => { setSection(key); setSearch(""); }} className="shrink-0 border-b-2 border-transparent pb-3 text-sm text-foreground-secondary hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-accent">{title}{counts[key] != null && <span className="ml-2 font-mono text-xs opacity-60">{counts[key]}</span>}</button>)}
    </nav>
    {section !== "overview" && section !== "sources" && <div className="flex flex-wrap items-center gap-4">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2"><Search className="h-4 w-4 text-foreground-secondary" /><input type="search" aria-label="Rechercher dans le dossier" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Une marque, un projet, un format…" className="w-full min-w-0 bg-transparent text-sm outline-none" /></label>
      {(section === "products" || section === "assets") && <label className="flex items-center gap-2 text-xs text-foreground-secondary"><input type="checkbox" checked={showArchives} onChange={(e) => setShowArchives(e.target.checked)} />Inclure les archives</label>}
    </div>}
    {section === "overview" && <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-7">
        <div><p className="mb-2 text-xs uppercase tracking-widest text-accent">Architecture de la marque</p><h2 className="font-display text-2xl">{data.root.nodeKind === "CORPORATE" ? "Les marques du groupe" : "Produits, gammes et services"}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">Une identité durable, ses produits et ses engagements en cours. Les dossiers partagés restent reliés à toutes les marques concernées.</p></div>
        {ownChildren.length ? <NodeList nodes={ownChildren} operatorId={data.root.operatorId} /> : <Empty>Ce niveau n’a pas de sous-ensemble. Ses dossiers et références sont accessibles dans les rubriques ci-dessus.</Empty>}
        {links.length > 0 && <div className="space-y-3"><h3 className="text-sm font-medium">Points d’accès</h3>{links.map((r, i) => <a key={`${r.id}-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:border-accent"><span>{r.label ?? r.node}</span><ArrowUpRight className="h-4 w-4 shrink-0" /></a>)}</div>}
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl bg-surface-raised p-6"><p className="text-xs uppercase tracking-widest text-foreground-secondary">Dossier vivant</p><div className="mt-5 grid grid-cols-2 gap-5">{[["Campagnes", barre?.campaigns.length], ["Projets", barre?.projects.length], ["Références produit", barre?.products.filter((p) => !p.archived).length], ["Assets référencés", assets.length]].map(([title, value]) => <div key={String(title)}><p className="font-display text-3xl">{value ?? "—"}</p><p className="mt-1 text-xs text-foreground-secondary">{title}</p></div>)}</div><p className="mt-5 text-xs leading-relaxed text-foreground-secondary">Ces nombres mesurent le contenu relié. Ils ne constituent pas une validation de la stratégie ni une preuve de livraison.</p></div>
        {projects.length > 0 && <div><h3 className="mb-2 text-sm font-medium">À retrouver rapidement</h3>{[...projects].sort((a, b) => b.deadline.localeCompare(a.deadline)).slice(0, 4).map((p) => <a key={p.id} href={p.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 border-b border-border py-3 text-sm hover:text-accent"><FolderOpen className="mt-1 h-4 w-4 shrink-0 text-foreground-secondary" /><span className="min-w-0 flex-1">{p.name}<span className="mt-1 block text-xs text-foreground-secondary">{label(p.status)}{p.deadline ? ` · ${dateLabel(p.deadline)}` : ""}</span></span><ArrowUpRight className="h-4 w-4 shrink-0" /></a>)}</div>}
        {(barre?.issues.length ?? 0) > 0 && <div className="rounded-xl border border-warning/30 bg-warning/10 p-4"><h3 className="flex gap-2 text-sm font-medium text-warning"><AlertCircle className="h-4 w-4" />Rattachements à clarifier</h3><ul className="mt-3 space-y-2 text-xs leading-relaxed text-foreground-secondary">{barre!.issues.map((i) => <li key={i}>{i}</li>)}</ul></div>}
      </div>
    </div>}
    {section === "projects" && <div className="space-y-6">
      <p className="text-sm text-foreground-secondary">Les campagnes regroupent les projets. Un projet multimarque est présenté une seule fois, avec toutes ses marques.</p>
      {(barre?.campaigns ?? []).filter((c) => match(`${c.name} ${c.brands.join(" ")}`) || projects.some((p) => p.campaignId === c.id)).map((c) => <article key={c.id} className="rounded-xl border border-border p-4 sm:p-6"><header className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-xs text-accent">{c.brands.join(" · ")}</p><h2 className="font-display text-xl">{c.name}</h2></div>{c.start && <p className="text-xs text-foreground-secondary">{dateLabel(c.start)} → {dateLabel(c.end)}{c.inferredDates ? " · dates inférées" : ""}</p>}</header>
        <div className="space-y-2">{projects.filter((p) => p.campaignId === c.id).map((p) => <ProjectRow key={p.id} project={p} followUps={portfolioProjectFollowUps(refs, p.id)} />)}</div>
        {!projects.some((p) => p.campaignId === c.id) && <p className="text-xs text-foreground-secondary">Aucun projet correspondant à cette recherche.</p>}
      </article>)}
      {projects.filter((p) => !barre?.campaigns.some((c) => c.id === p.campaignId)).map((p) => <ProjectRow key={p.id} project={p} followUps={portfolioProjectFollowUps(refs, p.id)} />)}
      {!projects.length && <Empty>Aucun projet correspondant dans la source disponible.</Empty>}
      {data.strategies.some((s) => s.campaigns.length) && <div className="border-t border-border pt-5"><h3 className="mb-3 font-medium">Dossiers présents dans La Fusée</h3>{data.strategies.flatMap((s) => s.campaigns.map((c) => <p key={c.id} className="py-2 text-sm">{c.name} <span className="text-foreground-secondary">· {s.name} · {label(c.status)}</span></p>))}</div>}
    </div>}
    {section === "products" && <div className="space-y-4">
      {!products.length ? (ownChildren.length ? <NodeList nodes={ownChildren.filter((n) => match(n.name))} operatorId={data.root.operatorId} /> : <Empty>Aucune référence produit déclarée à ce niveau.</Empty>) : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((p) => <article key={p.id} className="rounded-xl border border-border p-4"><Media asset={{ id: p.id, name: p.name, brand: p.brand, kind: p.range, state: "", preview: p.preview, url: p.url, source: "La Barre", note: "" }} /><p className="mt-3 text-xs text-accent">{p.brand} · {p.range || "Gamme à préciser"}</p><h3 className="mt-1 font-medium">{sourceProductNodes.has(p.id) && sourceProductNodes.get(p.id) !== data.root.slug ? <Link className="hover:text-accent underline decoration-border underline-offset-4" href={`/cockpit/portfolio/${sourceProductNodes.get(p.id)}?operator=${encodeURIComponent(data.root.operatorId)}`}>{p.name}</Link> : p.name}</h3><p className="mt-1 text-xs text-foreground-secondary">{[p.format, p.language.toUpperCase()].filter(Boolean).join(" · ")}</p>{(p.needsQualification || p.possibleDuplicate) && <p className="mt-2 text-xs text-warning">{p.possibleDuplicate ? "Caractéristiques partagées · version à qualifier" : "À qualifier"}</p>}{p.archived && <p className="mt-2 text-xs text-warning">Archivé · {p.archiveReason}</p>}{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs underline">Ouvrir le fichier <ArrowUpRight className="h-3 w-3" /></a>}</article>)}</div>}
    </div>}
    {section === "assets" && (filteredAssets.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredAssets.map((a) => <article key={a.id} className="min-w-0 rounded-xl border border-border p-3"><Media asset={a} /><div className="p-2"><p className="mt-2 text-xs text-accent">{a.brand}</p><h3 className="mt-1 break-words text-sm font-medium">{a.name}</h3><p className="mt-2 text-xs text-foreground-secondary">{a.kind} · {a.state} · {a.source}</p>{a.note && <details className="mt-2 text-xs text-foreground-secondary"><summary className="cursor-pointer">Provenance et usage</summary><p className="mt-2 whitespace-pre-line break-words">{a.note}</p></details>}{a.nativeId && <button type="button" onClick={() => setSelectedAssetId(a.nativeId!)} className="mr-4 mt-3 text-xs text-accent underline">Consulter le contenu</button>}{a.url && <a href={a.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs underline">Ouvrir <ArrowUpRight className="h-3 w-3" /></a>}</div></article>)}</div> : <Empty>Aucun asset correspondant dans les sources disponibles.</Empty>)}
    {section === "identity" && <div className="space-y-5">
      <p className="max-w-3xl text-sm leading-relaxed text-foreground-secondary">Authenticité, Distinction, Valeur, Engagement : le socle durable de la marque. Les informations issues d’un brief restent distinctes des décisions de marque. Une référence à une source ne vaut pas validation.</p>
      {data.strategies.length > 1 && <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">Plusieurs dossiers de stratégie sont reliés. Leurs contenus et validations restent distincts ; un rapprochement est nécessaire avant de les traiter comme une stratégie unique.</p>}
      {data.strategies.map((s) => <div key={s.id} className="rounded-xl border border-border p-5"><p className="mb-2 text-xs text-foreground-secondary">{s.id === data.root.strategyId ? "Dossier principal" : s.id === data.inheritedFrom?.strategyId ? `Socle partagé de ${data.inheritedFrom.name}` : "Dossier associé · historique à rapprocher"}</p><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-medium">{s.name}</h2><Link href={`/cockpit/brand/strategy?strategy=${encodeURIComponent(s.id)}`} onClick={() => setStrategyId(s.id)} className="inline-flex items-center gap-2 text-sm text-accent">Ouvrir la stratégie <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-4 flex flex-wrap gap-2">{s.pillars.map((p) => <span key={p.key} className="rounded-lg bg-surface-raised px-3 py-2 text-xs"><b className="mr-2 uppercase">{p.key}</b>{label(p.validationStatus)}{p.staleAt ? " · À revoir" : ""}</span>)}</div></div>)}
      {knowledge.map((k) => <article key={k.id} className="grid gap-3 border-b border-border py-5 md:grid-cols-[180px_minmax(0,1fr)]"><div><p className="text-xs text-accent">{k.brand}</p><h3 className="mt-1 text-sm font-medium capitalize">{k.title}</h3><p className="mt-2 text-xs text-foreground-secondary">{k.certainty === "INFERRED" ? "Inféré · à confirmer" : k.certainty === "REFERENCED" ? "Source mentionnée" : "Provenance à qualifier"}</p></div><div><p className="whitespace-pre-line text-sm leading-relaxed">{k.value}</p>{k.evidence && <p className="mt-3 text-xs leading-relaxed text-foreground-secondary">{k.evidence}</p>}</div></article>)}
      {!knowledge.length && !data.strategies.length && <Empty>Aucun socle de marque relié. Les éléments inconnus restent à documenter.</Empty>}
    </div>}
    {section === "sources" && <div className="space-y-6">
      <PortfolioReferencesForm node={data.root} onSaved={refresh} />
      {data.strategies.map((s) => <div key={s.id}><h2 className="mb-3 font-medium">{s.name}</h2>{s.dataSources.length ? <ul className="divide-y divide-border">{s.dataSources.map((source) => <li key={source.id} className="flex items-start gap-3 py-3 text-sm"><FileText className="mt-1 h-4 w-4 shrink-0 text-foreground-secondary" /><div><p>{source.fileName ?? "Source sans titre"}</p><p className="mt-1 text-xs text-foreground-secondary">{label(source.certainty)} · {label(source.processingStatus)} · {dateLabel(source.updatedAt.toISOString())}</p></div></li>)}</ul> : <p className="text-sm text-foreground-secondary">Aucun document ingéré dans ce dossier.</p>}</div>)}
      <div><h2 className="mb-3 font-medium">Identités et points d’accès reliés</h2><ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">{refs.map((r, i) => <li key={`${r.system}:${r.id}:${i}`} className="flex items-start gap-3 py-3 text-sm"><Link2 className="mt-1 h-4 w-4 shrink-0 text-foreground-secondary" /><div className="min-w-0"><p>{r.node} · {r.label ?? r.id}</p><p className="mt-1 break-all text-xs text-foreground-secondary">{r.system === "LA_BARRE" ? "La Barre" : r.system === "LA_FUSEE" ? "La Fusée" : r.system === "WEB" ? "Site web" : r.system === "RADAR" ? "Radar" : "Dépôt de code"} · {r.id}{r.instance ? ` · ${r.instance}` : ""}{r.project ? ` · projet ${r.project.id}` : ""}</p>{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-xs underline">Ouvrir la source</a>}</div></li>)}</ul></div>
    </div>}
    {selectedAssetId && <AssetContent assetId={selectedAssetId} onClose={() => setSelectedAssetId(null)} />}
    <footer className="border-t border-border pt-4 text-xs leading-relaxed text-foreground-secondary">La Fusée porte l’architecture et ses dossiers de stratégie. La Barre conserve les campagnes, projets et références qui y sont suivis. Radar conserve les décisions et états de son suivi ; les liens ne les recopient pas.{barre?.savedAt && <> Dernière sauvegarde La Barre : {dateLabel(barre.savedAt)}.</>}{data.fetchedAt && <> Lecture : {new Date(data.fetchedAt).toLocaleTimeString("fr-FR")}.</>}</footer>
  </section>;
}

function ProjectRow({ project: p, followUps }: { project: NonNullable<PortfolioWorkspace["barre"]>["projects"][number]; followUps: PortfolioReference[] }) {
  return <details className="rounded-lg bg-surface-raised p-4"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-foreground-secondary">{p.code} · {label(p.status)}{p.structure ? ` · ${p.structure}` : ""}</p><h3 className="mt-1 text-sm font-medium">{p.name}</h3><p className="mt-1 text-xs text-foreground-secondary">{p.brands.join(" · ")}{p.deadline ? ` · ${dateLabel(p.deadline)}` : ""}</p></div><Layers3 className="mt-1 h-4 w-4 shrink-0 text-foreground-secondary" /></div></summary><div className="mt-4 space-y-4 border-t border-border pt-4 text-sm leading-relaxed">
    {p.objective && <p>{p.objective}</p>}{p.constraints && <div><h4 className="mb-1 font-medium">Contraintes</h4><p className="whitespace-pre-line">{p.constraints}</p></div>}{p.brief && <div><h4 className="mb-1 font-medium">Brief reçu</h4><p className="whitespace-pre-line">{p.brief}</p></div>}{p.deliverables && <div><h4 className="mb-1 font-medium">Livrables attendus</h4><p className="whitespace-pre-line">{p.deliverables}</p></div>}{p.schedule && <div><h4 className="mb-1 font-medium">Calendrier</h4><p className="whitespace-pre-line">{p.schedule}</p></div>}
    <p className="text-xs text-foreground-secondary">Marchés renseignés : {p.markets.join(", ") || "à préciser"}{p.inferredPerimeter ? " · périmètre inféré" : ""}. Budget : {p.budget == null ? "non renseigné" : p.budget.toLocaleString("fr-FR")}.</p>
    {followUps.length > 0 && <div><h4 className="mb-2 font-medium">Suivi du projet</h4><ul className="space-y-2">{followUps.map((r) => <li key={`${r.instance}:${r.id}`} className="text-sm">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-accent">Ouvrir {r.label ?? `le dossier ${r.id}`} dans Radar <ArrowUpRight className="h-4 w-4" /></a> : <span>{r.label ?? r.id} · lien d’accès à compléter</span>}<span className="ml-2 text-xs text-foreground-secondary">{r.instance}</span></li>)}</ul><p className="mt-2 text-xs text-foreground-secondary">Le suivi reste dans son outil. Un lien ne confirme ni la réception, ni une validation, ni la livraison.</p></div>}
    <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-accent">Travailler ce projet dans La Barre <ArrowUpRight className="h-4 w-4" /></a>
  </div></details>;
}
