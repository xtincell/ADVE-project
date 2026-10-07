import { portfolioFileUrl, type PortfolioReference } from "./portfolio-reference";

export const BARRE_ORIGIN = "https://labarre.powerupgraders.com";
type Row = Record<string, unknown>;
export const asRow = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
export const asRows = (v: unknown): Row[] => Array.isArray(v) ? v.map(asRow) : [];
export const asStrings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
export const asText = (v: unknown): string => typeof v === "string" ? v : "";
export const readableValue = (v: unknown): string => typeof v === "string" ? v : Array.isArray(v)
  ? v.map(readableValue).filter(Boolean).join(" · ") : v && typeof v === "object"
    ? Object.entries(asRow(v)).map(([k, x]) => `${k} : ${readableValue(x)}`).join("\n")
    : v == null ? "" : String(v);

export function barreFileUrl(value: unknown): string | null {
  const path = asText(value);
  // Never turn a source's filesystem path, protocol or host into an active link.
  if (!/^(assets|corpus)\//.test(path) || path.split("/").includes("..")) return null;
  return new URL(path.split("/").map(encodeURIComponent).join("/"), `${BARRE_ORIGIN}/`).href;
}

export interface WorkspaceAsset {
  id: string; name: string; brand: string; kind: string; state: string;
  preview: string | null; url: string | null; source: string; note: string;
  nativeId?: string; strategyId?: string;
}

/** Read projection only: a shared address never merges source records or validations. */
export function groupWorkspaceAssets(assets: WorkspaceAsset[], options: { includeArchives?: boolean; search?: string } = {}) {
  const groups = new Map<string, { id: string; url: string | null; usages: WorkspaceAsset[] }>();
  for (const [index, asset] of assets.entries()) {
    if (options.includeArchives === false && ["Archivé", "Remplacé"].includes(asset.state)) continue;
    const url = portfolioFileUrl(asset.url);
    // Preserve the full address, including versions/query, and its source authority.
    // Preview and title cannot establish file identity; fileless entries stay separate.
    const id = JSON.stringify(url ? ["file", asset.source, url] : ["record", asset.source, asset.id, index]);
    const group = groups.get(id) ?? { id, url, usages: [] };
    group.usages.push(asset);
    groups.set(id, group);
  }
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const search = normalize(options.search ?? "");
  // Search selects a file and keeps every visible usage, rather than hiding its context.
  return [...groups.values()].filter((group) => group.usages.some((asset) =>
    normalize(`${asset.name} ${asset.brand} ${asset.kind}`).includes(search)));
}
export interface WorkspaceKnowledge {
  id: string; brand: string; title: string; value: string;
  certainty: "INFERRED" | "REFERENCED" | "UNQUALIFIED"; evidence: string;
}
const VAULT_META = new Set(["inferences", "sources", "revisions", "inferencesLevees"]);

/** Exact identities and explicit links only. Names never establish ownership. */
export function projectBarreWorkspace(raw: unknown, references: PortfolioReference[]) {
  const data = asRow(raw);
  if (!["marques", "clients", "campagnes", "projets", "sku", "assets"].every((key) => Array.isArray(data[key]))) {
    throw new Error("Le dépôt La Barre ne respecte pas le format attendu.");
  }
  const refs = references.filter((r) => r.system === "LA_BARRE");
  const clientIds = new Set(refs.filter((r) => r.kind === "client").map((r) => r.id));
  const explicitBrands = new Set(refs.filter((r) => r.kind === "brand").map((r) => r.id));
  const rangeRefs = refs.filter((r) => r.kind === "range").map((r) => {
    const split = r.id.indexOf(":");
    return { brandId: r.id.slice(0, split), range: r.id.slice(split + 1) };
  });
  const skuIds = new Set(refs.filter((r) => r.kind === "sku").map((r) => r.id));
  const allSkus = asRows(data.sku);
  const skuBrands = new Set(allSkus.filter((s) => skuIds.has(asText(s.id))).map((s) => asText(s.marque)));
  const brands = asRows(data.marques).filter((b) => clientIds.has(asText(b.clientId)) ||
    explicitBrands.has(asText(b.id)) || rangeRefs.some((r) => r.brandId === b.id) || skuBrands.has(asText(b.id)));
  const brandIds = new Set(brands.map((b) => asText(b.id)));
  const names = new Map(asRows(data.marques).map((b) => [asText(b.id), asText(b.nom)]));
  const allCampaigns = asRows(data.campagnes);
  const campaigns = allCampaigns.filter((c) => asStrings(c.marqueIds).some((id) => brandIds.has(id)) &&
    (!rangeRefs.length || explicitBrands.size > 0 || clientIds.size > 0 || rangeRefs.some((r) => r.range === c.gamme)));
  const campaignIds = new Set(campaigns.map((c) => asText(c.id)));
  const issues: string[] = [];
  const projects = asRows(data.projets).filter((p) => {
    const identity = asRow(asRow(p.sections).identite);
    const ids = asStrings(identity.marqueIds);
    const linked = ids.some((id) => brandIds.has(id));
    if (clientIds.has(asText(identity.clientId)) && ids.length && !linked) {
      issues.push(`${asText(p.nom)} : le client et les marques désignées ne concordent pas. Rattachement non propagé.`);
    }
    if (rangeRefs.length && !explicitBrands.size && !clientIds.size) return campaignIds.has(asText(p.campagneId));
    return linked || (ids.length === 0 && campaignIds.has(asText(p.campagneId))) || refs.some((r) => r.kind === "project" && r.id === p.id);
  }).map((p) => {
    const sections = asRow(p.sections), identity = asRow(sections.identite), brief = asRow(sections.brief);
    const perimeter = asRow(p.perimetre);
    const markets = asStrings(perimeter.marches).map((id) => {
      const market = asRows(data.marches).find((m) => m.id === id);
      return asText(market?.nom) || id.replace(/^M-/, "");
    });
    return {
      id: asText(p.id), name: asText(p.nom), code: asText(p.ref), status: asText(p.statut),
      campaignId: asText(p.campagneId), brands: asStrings(identity.marqueIds).map((id) => names.get(id) ?? id),
      structure: asText(asRows(data.structures).find((s) => s.id === p.structure)?.nom) || asText(p.structure),
      deadline: asText(identity.echeance), markets, budget: typeof identity.budget === "number" ? identity.budget : null,
      objective: asText(brief.objectif_com) || asText(identity.objectif),
      brief: asText(brief.verbatim), deliverables: readableValue(brief.livrables_attendus),
      constraints: readableValue(brief.contraintes), schedule: readableValue(brief.calendrier),
      sourceUrl: `${BARRE_ORIGIN}/#/projets/${encodeURIComponent(asText(p.id))}`,
      inferredPerimeter: Boolean(perimeter.infere), source: "La Barre",
    };
  });
  const knowledge: WorkspaceKnowledge[] = [];
  for (const b of brands) {
    const vaults: Array<{ label: string; vault: Row }> = [{ label: asText(b.nom), vault: asRow(b.vault) }];
    for (const r of rangeRefs.filter((r) => !clientIds.size && !explicitBrands.size && r.brandId === b.id)) {
      vaults.push({ label: `${asText(b.nom)} · ${r.range}`, vault: asRow(asRow(asRow(b.gammes)[r.range]).vault) });
    }
    for (const { label, vault } of vaults) {
      const inferences = asRow(vault.inferences), sources = asRow(vault.sources);
      for (const [key, value] of Object.entries(vault)) {
        if (VAULT_META.has(key) || !readableValue(value)) continue;
        knowledge.push({ id: `${asText(b.id)}:${label}:${key}`, brand: label, title: key.replace(/_/g, " "), value: readableValue(value),
          certainty: inferences[key] ? "INFERRED" : sources[key] ? "REFERENCED" : "UNQUALIFIED",
          evidence: inferences[key] ? readableValue(asRow(inferences[key]).pourquoi) : readableValue(sources[key]),
        });
      }
    }
  }
  const skus = allSkus.filter((s) => skuIds.size && !clientIds.size && !explicitBrands.size && !rangeRefs.length ? skuIds.has(asText(s.id)) : brandIds.has(asText(s.marque)) &&
    (!rangeRefs.length || explicitBrands.size > 0 || clientIds.size > 0 || rangeRefs.some((r) => r.brandId === s.marque && r.range === s.categorie)));
  const assets: WorkspaceAsset[] = asRows(data.assets).filter((a) => brandIds.has(asText(a.marque))).map((a) => ({
    id: `barre:${asText(a.id)}`, name: asText(a.nom), brand: names.get(asText(a.marque)) ?? "", kind: asText(a.role),
    state: a.archive ? "Archivé" : "Référencé", preview: barreFileUrl(a.vignette),
    url: barreFileUrl(a.review) || barreFileUrl(a.vignette), source: "La Barre", note: readableValue(a.droits) || asText(a.note),
  }));
  for (const b of brands) for (const v of asRows(b.visuels)) {
    assets.push({ id: `barre:${asText(v.id)}`, name: `${asText(v.campagne)} · ${asText(v.annee)}`, brand: asText(b.nom), kind: "Visuel de campagne",
      state: asText(v.statut) || "Référencé", preview: barreFileUrl(v.vignette), url: barreFileUrl(v.vignette), source: "La Barre", note: asText(v.origine) });
  }
  for (const ref of refs) {
    const found = ref.kind === "client" ? asRows(data.clients).some((c) => c.id === ref.id)
      : ref.kind === "brand" ? brands.some((b) => b.id === ref.id)
      : ref.kind === "sku" ? allSkus.some((s) => s.id === ref.id)
      : ref.kind === "project" ? asRows(data.projets).some((p) => p.id === ref.id)
      : ref.kind === "range" ? brands.some((b) => Object.keys(asRow(b.gammes)).some((range) => `${b.id}:${range}` === ref.id)) || allSkus.some((s) => `${s.marque}:${s.categorie}` === ref.id)
      : false;
    if (!found) issues.push(`Référence ${ref.label ?? ref.id} absente du dépôt reçu. Le raccordement est conservé pour vérification.`);
  }
  const signatures = new Map<string, Row[]>();
  for (const sku of skus.filter((s) => !s.archive)) {
    const key = [sku.marque, sku.categorie, sku.format, sku.variante, sku.langue, sku.promo, asStrings(sku.marches).sort().join(",")].map(readableValue).join("|");
    const group = signatures.get(key) ?? []; group.push(sku); signatures.set(key, group);
  }
  const duplicateIds = new Set([...signatures.values()].filter((group) => group.length > 1).flatMap((group) => group.map((s) => asText(s.id))));
  if (duplicateIds.size) issues.push(`${duplicateIds.size} références produit partagent leurs caractéristiques avec une autre fiche. Les fichiers restent distincts jusqu’à qualification de leurs versions.`);
  return {
    savedAt: asText(data.enregistre_le), knowledge, projects, issues, assets,
    brands: brands.map((b) => ({ id: asText(b.id), name: asText(b.nom), parentId: asText(b.mere), archived: Boolean(b.archive), sector: asText(b.secteur) })),
    campaigns: campaigns.map((c) => ({ id: asText(c.id), name: asText(c.nom), brands: asStrings(c.marqueIds).map((id) => names.get(id) ?? id),
      range: asText(c.gamme), source: asText(c.source), inferredDates: Boolean(c.infere), start: asText(asRow(c.fenetre).debut), end: asText(asRow(c.fenetre).fin),
      projects: projects.filter((p) => p.campaignId === c.id).map((p) => p.id),
    })),
    products: skus.map((s) => ({ id: asText(s.id), name: asText(s.nom), brand: names.get(asText(s.marque)) ?? "", range: asText(s.categorie), format: asText(s.format),
      language: asText(s.langue), archived: Boolean(s.archive), needsQualification: Boolean(s.aQualifier), possibleDuplicate: duplicateIds.has(asText(s.id)), preview: barreFileUrl(s.vignette), url: barreFileUrl(s.production),
      markets: asStrings(s.marches), archiveReason: readableValue(asRow(s.archive).motif),
    })),
  };
}
export type BarreWorkspace = ReturnType<typeof projectBarreWorkspace>;
