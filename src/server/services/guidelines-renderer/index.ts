import { db } from "@/lib/db";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import crypto from "crypto";
import { PILLAR_STORAGE_KEYS, classifyTier } from "@/domain";
import { portfolioFileUrl } from "@/domain/portfolio-reference";
import { SOURCE_CERTAINTY_LABEL, isSourceCertainty } from "@/domain/source-certainty";
import { resolveBrandIdentity, resolveBrandDeploymentOrigin, buildBrandTheme, collectHexes, extractFontFamilies } from "@/server/services/brand-theme";
import { loadBrandSources } from "@/server/services/ingestion-pipeline/source-usage";

export interface GuidelineAsset {
  id: string; name: string; state: string; stateLabel: string; version: number;
  fileUrl: string | null; content: unknown;
  provenance: { status: "UNLINKED" | "UNAVAILABLE" | "UNVERSIONED" | "CURRENT" | "CHANGED";
    sourceId: string | null; sourceName: string | null; certainty: string | null; message: string };
}
export interface GuidelinesDocument {
  strategyId: string; title: string; generatedAt: string;
  identity: { logo: GuidelineAsset | null; chromatic: GuidelineAsset | null; typography: GuidelineAsset | null;
    counts: { logos: number; palettes: number; typographies: number };
    activeCounts: { logos: number; palettes: number; typographies: number };
    colors: ReturnType<typeof collectHexes>; fonts: ReturnType<typeof extractFontFamilies> };
  books: GuidelineAsset[];
  sources: Array<{ id: string; name: string; certainty: string; shared: boolean; createdAt: string }>;
  // Legacy structured fields remain compatible; they are not identity rules.
  sections: Array<{ pillar: PillarKey; pillarName: string; content: Record<string, unknown>; score: number; confidence: number }>;
  score: Record<string, unknown> | null; classification: string;
  brandAssets: Array<{ id: string; name: string; fileUrl: string | null; pillarTags: Record<string, number> | null }>;
  drivers: Array<{ id: string; name: string; channel: string; channelType: string }>;
}

/** A read of existing evidence. No fill, indexing, promotion or model call. */
export async function generate(strategyId: string): Promise<GuidelinesDocument> {
  const [strategy, identity, sources] = await Promise.all([
    db.strategy.findUniqueOrThrow({ where: { id: strategyId }, include: {
      pillars: true, drivers: { where: { deletedAt: null } }, brandAssets: true,
    } }),
    resolveBrandIdentity(strategyId),
    loadBrandSources(strategyId),
  ]);
  const qualify = (asset: { id: string; name: string; state: string; version: number; fileUrl: string | null; content: unknown; metadata: unknown } | null): GuidelineAsset | null => {
    if (!asset) return null;
    const meta = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Record<string, unknown> : {};
    const id = typeof meta.sourceDataSourceId === "string" ? meta.sourceDataSourceId : null;
    const source = id ? sources.find((s) => s.id === id) : null;
    const hash = typeof meta.sourceContentHash === "string" ? meta.sourceContentHash : null;
    const provenance: Omit<GuidelineAsset["provenance"], "message"> = {
      status: !id ? "UNLINKED" : !source ? "UNAVAILABLE" : !hash ? "UNVERSIONED" : hash === source.contentHash ? "CURRENT" : "CHANGED",
      sourceId: source?.id ?? null, sourceName: source?.fileName ?? null, certainty: source?.certainty ?? null,
    };
    return { id: asset.id, name: asset.name, state: asset.state, stateLabel: stateLabel(asset.state), version: asset.version,
      fileUrl: portfolioFileUrl(asset.fileUrl), content: asset.content,
      provenance: { ...provenance, message: provenanceLabel({ provenance }) } };
  };
  const vector = strategy.advertis_vector as Record<string, number> | null;
  const composite = vector ? Object.entries(vector).filter(([k]) => (PILLAR_STORAGE_KEYS as readonly string[]).includes(k))
    .reduce((sum, [, v]) => sum + v, 0) : 0;
  return {
    strategyId, title: `Guidelines de marque — ${strategy.name}`, generatedAt: new Date().toISOString(),
    identity: { logo: qualify(identity.logo), chromatic: qualify(identity.chromatic), typography: qualify(identity.typography),
      counts: identity.counts, activeCounts: identity.activeCounts,
      colors: collectHexes(identity.chromatic?.content), fonts: extractFontFamilies(identity.typography?.content) },
    books: strategy.brandAssets.filter((a) => a.kind === "BRAND_BOOK" && !a.staleAt && !["SUPERSEDED", "ARCHIVED", "REJECTED"].includes(a.state))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id)).map((a) => qualify(a)!),
    sources: sources.map((s) => ({ id: s.id, name: s.fileName ?? "Document sans titre", certainty: s.certainty,
      shared: s.strategyId !== strategyId, createdAt: s.createdAt.toISOString() })),
    sections: ([...PILLAR_STORAGE_KEYS] as PillarKey[]).map((key) => {
      const p = strategy.pillars.find((p) => p.key === key);
      return { pillar: key, pillarName: PILLAR_NAMES[key], content: (p?.content as Record<string, unknown>) ?? {},
        score: vector?.[key] ?? 0, confidence: p?.confidence ?? 0 };
    }),
    score: vector, classification: classifyTier(composite),
    brandAssets: strategy.brandAssets.map((a) => ({ id: a.id, name: a.name, fileUrl: a.fileUrl, pillarTags: a.pillarTags as Record<string, number> | null })),
    drivers: strategy.drivers.map((d) => ({ id: d.id, name: d.name, channel: d.channel, channelType: d.channelType })),
  };
}

function stateLabel(state: string): string {
  return ({ ACTIVE: "En usage", DRAFT: "Brouillon", CANDIDATE: "Proposition", SELECTED: "Sélectionné" } as Record<string, string>)[state] ?? "État à qualifier";
}
function provenanceLabel(asset: { provenance: Omit<GuidelineAsset["provenance"], "message"> }): string {
  const p = asset.provenance;
  const text = { UNLINKED: "Aucun document relié à cet actif.", UNAVAILABLE: "Le document relié n’est plus accessible dans ce dossier.",
    UNVERSIONED: "Document relié, version documentaire non enregistrée.", CURRENT: "Version documentaire correspondante.", CHANGED: "Le document relié a changé : actif à relire." }[p.status];
  const certainty = isSourceCertainty(p.certainty) ? SOURCE_CERTAINTY_LABEL[p.certainty] : "Certitude à qualifier";
  return `${text}${p.sourceName ? ` ${p.sourceName} · ${certainty}.` : ""}`;
}
function renderDocument(doc: GuidelinesDocument): string {
  const theme = buildBrandTheme({ brandName: doc.title, chromatic: doc.identity.chromatic?.content,
    typography: doc.identity.typography?.content, logoUrl: doc.identity.logo?.fileUrl });
  const rgb = (v: readonly number[]) => `rgb(${v.join(",")})`;
  const assetSection = (title: string, asset: GuidelineAsset | null, body: (a: GuidelineAsset) => string) =>
    `<section><h2>${escapeHtml(title)}</h2>${asset ? `<h3>${escapeHtml(asset.name)}</h3><p>Version ${asset.version} · ${escapeHtml(stateLabel(asset.state))}</p><p>${escapeHtml(provenanceLabel(asset))}</p>${body(asset)}` : "<p>Aucun actif disponible dans ce dossier.</p>"}</section>`;
  const values = (value: unknown) => `<p class="content-value">${escapeHtml(formatContentValue(value))}</p>`;
  const exportUrl = (value: string | null) => {
    const safe = portfolioFileUrl(value);
    if (!safe || !safe.startsWith("/")) return safe;
    const base = resolveBrandDeploymentOrigin({ allowHttp: true });
    return base ? new URL(safe, base).href : null;
  };
  const logo = assetSection("Logo", doc.identity.logo, (a) => {
    const url = exportUrl(a.fileUrl);
    return url ? `<img alt="${escapeHtml(a.name)}" src="${escapeHtml(url)}">` : "<p>Fichier associé à consulter depuis le dossier.</p>";
  });
  const colors = assetSection("Couleurs", doc.identity.chromatic, (a) => {
    const palette = collectHexes(a.content);
    return `${palette.all.length ? `<p>${palette.all.map(escapeHtml).join(" · ")}</p>` : "<p>Aucune couleur exploitable enregistrée.</p>"}${values(a.content)}`;
  });
  const typography = assetSection("Typographie", doc.identity.typography, (a) => {
    const fonts = extractFontFamilies(a.content);
    return `<p>Titrage : ${escapeHtml(fonts.display ?? "Non renseigné")} · Texte : ${escapeHtml(fonts.body ?? "Non renseigné")}</p>${fonts.all.length ? `<p>Familles mentionnées : ${escapeHtml(fonts.all.join(" · "))}</p>` : ""}${values(a.content)}`;
  });
  const books = `<section><h2>Chartes conservées</h2>${doc.books.length ? doc.books.map((a) => `<article><h3>${escapeHtml(a.name)}</h3><p>Version ${a.version} · ${escapeHtml(stateLabel(a.state))}</p><p>${escapeHtml(provenanceLabel(a))}</p>${values(a.content)}</article>`).join("") : "<p>Aucune charte structurée dans le coffre. Les documents de référence restent distincts.</p>"}</section>`;
  const sources = `<section><h2>Documents de référence</h2><p>Références consultées pour cette lecture. Leur présence ne valide ni les actifs ni les propositions. Le texte des documents n’est pas inclus dans cet export.</p><ul>${doc.sources.map((s) => `<li>${escapeHtml(s.name)} · ${escapeHtml(isSourceCertainty(s.certainty) ? SOURCE_CERTAINTY_LABEL[s.certainty] : "Certitude à qualifier")}${s.shared ? " · Document partagé" : ""}</li>`).join("")}</ul>${doc.sources.length ? "" : "<p>Aucun document disponible.</p>"}</section>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(doc.title)}</title>
<style>
.brand-guidelines-doc { color: ${rgb(theme.ink)}; background: ${rgb(theme.sectionBg)}; font-family: system-ui,sans-serif; line-height: 1.6; max-width: 960px; margin: auto; padding: 2rem; overflow-wrap: anywhere; }
.brand-guidelines-doc h1 { color: ${rgb(theme.accentOnLight)}; font-size: 2rem; }
.brand-guidelines-doc h2 { color: ${rgb(theme.accentOnLight)}; font-size: 1.4rem; }
.brand-guidelines-doc section { border-top: 1px solid currentColor; padding: 1.5rem 0; }
.brand-guidelines-doc img { display: block; max-width: 100%; height: auto; max-height: 280px; object-fit: contain; background: rgb(255,255,255); padding: 1rem; }
.brand-guidelines-doc .content-value { white-space: pre-wrap; }
@media print { @page { size: A4; margin: 20mm 15mm; } .brand-guidelines-doc { max-width: none; padding: 0; } .brand-guidelines-doc article { break-inside: avoid; } }
</style></head><body><main class="brand-guidelines-doc"><h1>${escapeHtml(doc.title)}</h1>
<p>Lecture du ${escapeHtml(new Date(doc.generatedAt).toLocaleString("fr-FR"))}. Les états enregistrés ne constituent pas une preuve d’approbation. Une proposition reste une proposition.</p>
<p>Les actifs en usage sont prioritaires ; plusieurs actifs en usage nécessitent une revue. Cette lecture ne modifie aucun document.</p>
${Object.values(doc.identity.activeCounts).some((n) => n > 1) ? "<p>Plusieurs versions sont en usage dans le dossier : choix à confirmer.</p>" : ""}
${logo}${colors}${typography}${books}${sources}<footer>La Fusée · Document confidentiel</footer></main></body></html>`;
}

/** The authenticated reader and both export paths use the same document. */
export async function generateGuidelines(strategyId: string): Promise<string> { return renderDocument(await generate(strategyId)); }
export async function exportHtml(strategyId: string): Promise<string> { return generateGuidelines(strategyId); }
/** HTML printable in the browser, not a binary PDF. */
export async function exportPdf(strategyId: string): Promise<string> { return generateGuidelines(strategyId); }

/**
 * Generate a unique shareable link token for a strategy's guidelines.
 * Stores the token in the strategy's businessContext metadata.
 */
export async function getShareableLink(strategyId: string): Promise<{
  token: string;
  url: string;
}> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
  });

  const existing = (strategy.businessContext as Record<string, unknown>) ?? {};

  // Reuse existing token if present
  if (existing.guidelinesShareToken && typeof existing.guidelinesShareToken === "string") {
    return {
      token: existing.guidelinesShareToken,
      url: `/shared/guidelines/${existing.guidelinesShareToken}`,
    };
  }

  // Generate a new unique token
  const token = crypto.randomBytes(24).toString("hex");

  await db.strategy.update({
    where: { id: strategyId },
    data: {
      businessContext: {
        ...existing,
        guidelinesShareToken: token,
        guidelinesSharedAt: new Date().toISOString(),
      },
    },
  });

  return {
    token,
    url: `/shared/guidelines/${token}`,
  };
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatContentKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatContentValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatContentValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatContentKey(k)}: ${formatContentValue(v)}`)
      .join("; ");
  }
  return String(value);
}
