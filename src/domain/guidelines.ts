/**
 * Charte de marque (guidelines) — composition 100 % DÉTERMINISTE, zéro IO.
 *
 * Port de l'essence de `legacy/src/server/services/guidelines-renderer/`
 * (le document se compose depuis les données réelles, jamais généré par LLM),
 * recentré doctrine v7 : la charte n'est PAS stockée — elle se dérive à la
 * lecture depuis deux sources et deux seulement :
 *   - le pilier E réel (Engagement — expression/ton)  → identité verbale ;
 *   - le coffre de marque réel (BrandAsset structurés) → identité visuelle
 *     + usages déclarés.
 * Chaque section CITE sa source ou DÉCLARE son manque — jamais de donnée
 * inventée (règle 6 du rebuild). Même entrée ⇒ même charte.
 */
import { PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "./pillar-fields";
import { isFilled } from "./scoring";

// ── Lecture TOLÉRANTE des `BrandAsset.value` (écrits canoniques par server/vault) ──

export type VaultAssetKind = "LOGO" | "COULEUR" | "TYPO" | "DOCUMENT" | "IMAGE";

export const VAULT_ASSET_KINDS = ["LOGO", "COULEUR", "TYPO", "DOCUMENT", "IMAGE"] as const;

/** Ce que le composer attend d'un asset du coffre (projection minimale). */
export type GuidelineAssetInput = {
  kind: VaultAssetKind;
  name: string;
  value: unknown;
  fileRef?: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** #RRGGBB strict (le vault écrit canonique — toute autre forme est ignorée). */
export function readHex(value: unknown): string | null {
  const raw = str(value);
  return raw !== null && /^#[0-9A-F]{6}$/.test(raw) ? raw : null;
}

export type ColorValue = { hex: string | null; role: string | null };
export type TypoValue = { usage: string | null; url: string | null };
export type LinkValue = { url: string | null; note: string | null };

export function readColorValue(value: unknown): ColorValue {
  const rec = record(value);
  return { hex: readHex(rec["hex"]), role: str(rec["role"]) };
}

export function readTypoValue(value: unknown): TypoValue {
  const rec = record(value);
  return { usage: str(rec["usage"]), url: str(rec["url"]) };
}

export function readLinkValue(value: unknown): LinkValue {
  const rec = record(value);
  return { url: str(rec["url"]), note: str(rec["note"]) };
}

// ── Types du document composé ──────────────────────────────────────────

export type GuidelinesSectionId = "verbale" | "visuelle" | "usages";

export type GuidelinesSectionMeta = {
  id: GuidelinesSectionId;
  title: string;
  status: "ok" | "manquant";
  /** Provenance réelle de la section — null quand elle est vide. */
  source: string | null;
  /** Ce qui manque pour composer la section — null quand elle est remplie. */
  gap: string | null;
};

export type FieldCertainty = "DECLARED" | "INFERRED" | null;

export type VerbalItem = {
  fieldId: string;
  label: string;
  /** DECLARED (validé humain) · INFERRED (« à valider ») · null (non marqué). */
  certainty: FieldCertainty;
  /** Valeur affichable — une ligne par item de liste, une seule pour un texte. */
  lines: string[];
};

export type ColorItem = { name: string; hex: string | null; role: string | null };
export type TypoItem = { name: string; usage: string | null; url: string | null };
export type LinkItem = { name: string; url: string | null; note: string | null; fileRef: string | null };

export type UsageRule = {
  /** D'où vient la règle — le nom de l'asset qui la déclare. */
  sourceName: string;
  kind: VaultAssetKind;
  text: string;
};

export type GuidelinesDoc = {
  brandName: string;
  verbal: { section: GuidelinesSectionMeta; items: VerbalItem[] };
  visual: {
    section: GuidelinesSectionMeta;
    logos: LinkItem[];
    colors: ColorItem[];
    typos: TypoItem[];
    documents: LinkItem[];
    images: LinkItem[];
  };
  usages: { section: GuidelinesSectionMeta; rules: UsageRule[] };
  /** Sections réellement composées / total — la charte dit sa complétude. */
  completeness: { ok: number; total: number };
};

export type GuidelinesInput = {
  brandName: string;
  /** Pilier E réel (contenu + certainty) — null si jamais écrit. */
  pillarE: { content: Record<string, unknown>; certainty: Record<string, unknown> } | null;
  /** Assets ACTIFS du coffre (les archivés ne norment plus rien). */
  assets: GuidelineAssetInput[];
};

// ── Helpers de composition ─────────────────────────────────────────────

/** Valeur de champ pilier → lignes affichables (liste = une ligne par item). */
export function fieldLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((line) => line !== "");
  }
  const single = str(value);
  return single !== null ? [single] : [];
}

function certaintyOf(certainty: Record<string, unknown>, fieldId: string): FieldCertainty {
  const mark = certainty[fieldId];
  return mark === "DECLARED" || mark === "INFERRED" ? mark : null;
}

function byKind(assets: GuidelineAssetInput[], kind: VaultAssetKind): GuidelineAssetInput[] {
  return assets.filter((asset) => asset.kind === kind);
}

function toLinkItem(asset: GuidelineAssetInput): LinkItem {
  const value = readLinkValue(asset.value);
  return { name: asset.name, url: value.url, note: value.note, fileRef: asset.fileRef ?? null };
}

// ── Le composer ────────────────────────────────────────────────────────

const E_LABEL = `Pilier E — ${PILLAR_LABELS.E}`;

/**
 * Compose la charte. Pure et déterministe : mêmes piliers + mêmes assets ⇒
 * même document. L'ordre de sortie est celui de la bible (champs E) et
 * l'ordre d'arrivée des assets (le caller lit trié en base).
 */
export function composeGuidelines(input: GuidelinesInput): GuidelinesDoc {
  // ── 1. Identité verbale — depuis le pilier E réel, champ par champ ──
  const eFields: readonly FieldDef[] = PILLAR_FIELDS.E;
  const content = input.pillarE?.content ?? {};
  const certainty = input.pillarE?.certainty ?? {};

  const verbalItems: VerbalItem[] = [];
  for (const field of eFields) {
    if (!isFilled(content[field.id])) continue;
    const lines = fieldLines(content[field.id]);
    if (lines.length === 0) continue;
    verbalItems.push({
      fieldId: field.id,
      label: field.label,
      certainty: certaintyOf(certainty, field.id),
      lines,
    });
  }

  const verbalSection: GuidelinesSectionMeta = {
    id: "verbale",
    title: "Identité verbale",
    status: verbalItems.length > 0 ? "ok" : "manquant",
    source:
      verbalItems.length > 0
        ? `${E_LABEL} — ${verbalItems.length} champ${verbalItems.length > 1 ? "s" : ""} rempli${verbalItems.length > 1 ? "s" : ""} : ${verbalItems.map((item) => item.label).join(", ")}`
        : null,
    gap:
      verbalItems.length > 0
        ? null
        : `Le ${E_LABEL} (expression, ton, expérience) est vide — la charte n'invente rien. Complétez-le depuis l'éditeur de pilier.`,
  };

  // ── 2. Identité visuelle — depuis le coffre réel ────────────────────
  const logos = byKind(input.assets, "LOGO").map(toLinkItem);
  const colors: ColorItem[] = byKind(input.assets, "COULEUR").map((asset) => {
    const value = readColorValue(asset.value);
    return { name: asset.name, hex: value.hex, role: value.role };
  });
  const typos: TypoItem[] = byKind(input.assets, "TYPO").map((asset) => {
    const value = readTypoValue(asset.value);
    return { name: asset.name, usage: value.usage, url: value.url };
  });
  const documents = byKind(input.assets, "DOCUMENT").map(toLinkItem);
  const images = byKind(input.assets, "IMAGE").map(toLinkItem);

  const visualCount = logos.length + colors.length + typos.length;
  const visualParts: string[] = [];
  if (logos.length > 0) visualParts.push(`${logos.length} logo${logos.length > 1 ? "s" : ""}`);
  if (colors.length > 0) visualParts.push(`${colors.length} couleur${colors.length > 1 ? "s" : ""}`);
  if (typos.length > 0)
    visualParts.push(`${typos.length} typographie${typos.length > 1 ? "s" : ""}`);

  const visualSection: GuidelinesSectionMeta = {
    id: "visuelle",
    title: "Identité visuelle",
    status: visualCount > 0 ? "ok" : "manquant",
    source: visualCount > 0 ? `Coffre de marque — ${visualParts.join(", ")} actifs` : null,
    gap:
      visualCount > 0
        ? null
        : "Le coffre ne contient encore ni logo, ni couleur, ni typographie active — ajoutez-les dans le coffre de marque.",
  };

  // ── 3. Usages — uniquement les rôles/usages DÉCLARÉS sur les assets ──
  const rules: UsageRule[] = [];
  for (const color of colors) {
    if (color.role === null) continue;
    rules.push({
      sourceName: color.name,
      kind: "COULEUR",
      text: `${color.role} : ${color.name}${color.hex !== null ? ` (${color.hex})` : ""}.`,
    });
  }
  for (const typo of typos) {
    if (typo.usage === null) continue;
    rules.push({ sourceName: typo.name, kind: "TYPO", text: `${typo.usage} : ${typo.name}.` });
  }
  for (const document of documents) {
    if (document.note === null) continue;
    rules.push({
      sourceName: document.name,
      kind: "DOCUMENT",
      text: `${document.name} — ${document.note}`,
    });
  }
  for (const logo of logos) {
    if (logo.note === null) continue;
    rules.push({ sourceName: logo.name, kind: "LOGO", text: `${logo.name} — ${logo.note}` });
  }

  const usagesSection: GuidelinesSectionMeta = {
    id: "usages",
    title: "Usages",
    status: rules.length > 0 ? "ok" : "manquant",
    source:
      rules.length > 0
        ? `Coffre de marque — ${rules.length} usage${rules.length > 1 ? "s" : ""} déclaré${rules.length > 1 ? "s" : ""} sur les assets (rôles de couleurs, usages de typographies, notes)`
        : null,
    gap:
      rules.length > 0
        ? null
        : "Aucun usage déclaré — précisez le rôle de chaque couleur et l'usage de chaque typographie dans le coffre pour composer cette section.",
  };

  const sections = [verbalSection, visualSection, usagesSection];
  return {
    brandName: input.brandName,
    verbal: { section: verbalSection, items: verbalItems },
    visual: { section: visualSection, logos, colors, typos, documents, images },
    usages: { section: usagesSection, rules },
    completeness: {
      ok: sections.filter((section) => section.status === "ok").length,
      total: sections.length,
    },
  };
}
