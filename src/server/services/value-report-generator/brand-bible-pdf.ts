/**
 * brand-bible-pdf.ts — Bible de Marque, deck 16:9 téléchargeable.
 *
 * 2ᵉ livrable canonique après l'Oracle (compilation des Glory tools BRAND-layer
 * en slides). Réutilise :
 *   - `compileDeliverable(strategyId, "BRANDBOOK-D")` (artemis) pour les DONNÉES
 *     (sorties Glory déjà persistées + sections manquantes honnêtes),
 *   - `jsPDF` (déjà en deps, serverless-safe, comme `export-oracle.ts`) pour le
 *     RENDU — pas de puppeteer (pas de page publique, pas de Chromium).
 *
 * Le deck suit la séquence BRANDBOOK-D comme colonne vertébrale : 1 slide de
 * couverture + 1 slide par étape BRAND (présente → contenu ; absente →
 * empty-state honnête « section à générer », JAMAIS de données inventées).
 *
 * Format 16:9 paysage (1280×720 px). Couleurs = palette UPgraders DS en RGB
 * (le PDF est un générateur serveur, pas un composant — l'interdit #2 DS ne
 * s'applique pas ; les RGB miroitent corail/or/panda/bone du canon DS).
 *
 * Doctrine Artemis→Ptah respectée : ce générateur COMPILE des briefs textuels,
 * il ne forge pas d'image. La variante « slides graphiques riches » (visuels
 * Ptah par slide) est un chantier distinct.
 */

import { jsPDF } from "jspdf";
import { compileDeliverable } from "@/server/services/artemis/tools/deliverable-compiler";
import { getSequence } from "@/server/services/artemis/tools/sequences";
import { getGloryTool } from "@/server/services/artemis/tools/registry";

// ── Palette UPgraders DS (RGB) — canon ADR-0097 ──────────────────────────────
const C = {
  panda: [26, 26, 26] as const, // noir panda
  bone: [245, 240, 232] as const, // bone (fond clair)
  corail: [229, 100, 88] as const, // rouge fusée #E56458
  or: [250, 204, 21] as const, // or #FACC15
  ink: [38, 38, 38] as const, // texte sombre
  muted: [120, 113, 108] as const, // texte secondaire
  white: [255, 255, 255] as const,
};

// Dimensions 16:9 (px).
const W = 1280;
const H = 720;
const MARGIN = 72;

export interface BrandBiblePdfResult {
  pdf: Buffer;
  slideCount: number;
  isComplete: boolean;
  generatedAt: Date;
}

/**
 * Rend la Bible de Marque en PDF 16:9. Réutilise les sorties Glory persistées
 * de la séquence BRANDBOOK-D. Renvoie un Buffer + métadonnées de complétude.
 */
export async function exportBrandBibleAsPdf(strategyId: string): Promise<BrandBiblePdfResult> {
  const manifest = await compileDeliverable(strategyId, "BRANDBOOK-D");
  const seq = getSequence("BRANDBOOK-D");
  if (!seq) throw new Error("brand-bible: séquence BRANDBOOK-D introuvable");

  // Index des sections présentes par toolSlug (sortie Glory réelle).
  const bySlug = new Map(manifest.sections.map((s) => [s.sourceToolSlug, s]));

  // Colonne vertébrale = étapes GLORY actives de la séquence (ordre canonique).
  const gloryRefs = seq.steps
    .filter((st) => st.type === "GLORY" && st.status === "ACTIVE")
    .map((st) => (st as { ref: string }).ref);

  const doc = new jsPDF({ orientation: "landscape", unit: "px", format: [W, H] });

  // ── Slide 1 — Couverture ───────────────────────────────────────────────────
  renderCover(doc, manifest.meta.strategyName, manifest.isComplete);

  // ── Slides 2..N — une par section BRAND ────────────────────────────────────
  let slideCount = 1;
  gloryRefs.forEach((slug, idx) => {
    doc.addPage([W, H], "landscape");
    slideCount += 1;
    const tool = getGloryTool(slug);
    const title = tool?.name ?? slug;
    const section = bySlug.get(slug);
    renderSectionSlide(doc, {
      index: idx + 1,
      total: gloryRefs.length,
      title,
      brand: manifest.meta.strategyName,
      content: section?.content ?? null,
    });
  });

  const bytes = doc.output("arraybuffer");
  return {
    pdf: Buffer.from(bytes),
    slideCount,
    isComplete: manifest.isComplete,
    generatedAt: new Date(),
  };
}

// ── Rendu : couverture ───────────────────────────────────────────────────────
function renderCover(doc: jsPDF, brand: string, isComplete: boolean): void {
  // Fond panda plein.
  doc.setFillColor(...C.panda);
  doc.rect(0, 0, W, H, "F");
  // Bande corail verticale (signature fusée).
  doc.setFillColor(...C.corail);
  doc.rect(0, 0, 16, H, "F");
  // Eyebrow or.
  doc.setTextColor(...C.or);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("UPGRADERS · LA FUSÉE", MARGIN, 180);
  // Titre.
  doc.setTextColor(...C.white);
  doc.setFontSize(76);
  doc.text("Bible de Marque", MARGIN, 300);
  // Nom de marque.
  doc.setTextColor(...C.corail);
  doc.setFontSize(48);
  doc.text(truncate(brand, 40), MARGIN, 380);
  // Pied : date + statut.
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  const date = new Date().toISOString().slice(0, 10);
  const status = isComplete ? "Édition complète" : "Édition partielle — sections en cours";
  doc.text(`${date}  ·  ${status}`, MARGIN, H - 72);
}

// ── Rendu : slide de section ─────────────────────────────────────────────────
function renderSectionSlide(
  doc: jsPDF,
  s: { index: number; total: number; title: string; brand: string; content: Record<string, unknown> | null },
): void {
  // Fond bone.
  doc.setFillColor(...C.bone);
  doc.rect(0, 0, W, H, "F");
  // Bandeau d'en-tête corail.
  doc.setFillColor(...C.corail);
  doc.rect(0, 0, W, 132, "F");
  // Eyebrow + titre dans le bandeau.
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(`BIBLE DE MARQUE · ${truncate(s.brand, 28).toUpperCase()}`, MARGIN, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text(truncate(s.title, 52), MARGIN, 100);

  // Corps : contenu rendu, ou empty-state honnête.
  const top = 196;
  if (s.content == null) {
    renderEmptyState(doc, top);
  } else {
    renderContent(doc, s.content, top);
  }

  // Pied de page : numéro + branding.
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`${String(s.index).padStart(2, "0")} / ${String(s.total).padStart(2, "0")}`, MARGIN, H - 40);
  doc.text("Forgé par La Fusée — UPgraders", W - MARGIN, H - 40, { align: "right" });
  // Accent or sous le pied.
  doc.setFillColor(...C.or);
  doc.rect(MARGIN, H - 58, 48, 4, "F");
}

function renderEmptyState(doc: jsPDF, top: number): void {
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(22);
  doc.text("Section à générer.", MARGIN, top + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(
    "Lance la séquence BRANDBOOK-D depuis le Cockpit pour produire ce volet.",
    MARGIN,
    top + 48,
  );
}

/**
 * Aplati le contenu Glory (JSON structuré) en lignes lisibles puis le pose sur
 * la slide. Cap de hauteur : ce qui dépasse est tronqué avec un repère « … ».
 */
function renderContent(doc: jsPDF, content: Record<string, unknown>, top: number): void {
  const lines = flatten(content, 0);
  const maxWidth = W - MARGIN * 2;
  const lineH = 22;
  let y = top;
  const bottom = H - 80;

  for (const ln of lines) {
    if (y > bottom) {
      doc.setTextColor(...C.muted);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.text("… (détail complet dans le vault de marque)", MARGIN, y);
      return;
    }
    const isLabel = ln.kind === "label";
    const col = isLabel ? C.corail : C.ink;
    doc.setTextColor(col[0], col[1], col[2]);
    doc.setFont("helvetica", isLabel ? "bold" : "normal");
    doc.setFontSize(isLabel ? 17 : 15);
    const indent = MARGIN + ln.depth * 24;
    const wrapped = doc.splitTextToSize(ln.text, maxWidth - ln.depth * 24) as string[];
    for (const w of wrapped) {
      if (y > bottom) break;
      doc.text(w, indent, y);
      y += lineH;
    }
    if (isLabel) y += 4;
  }
}

interface FlatLine {
  kind: "label" | "text";
  text: string;
  depth: number;
}

/** Aplatit récursivement un objet/array Glory en lignes label/texte (profondeur ≤ 3). */
function flatten(value: unknown, depth: number): FlatLine[] {
  if (depth > 3) return [{ kind: "text", text: "…", depth }];
  const out: FlatLine[] = [];
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push({ kind: "text", text: String(value), depth });
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) {
      if (item && typeof item === "object") {
        out.push(...flatten(item, depth));
      } else {
        out.push({ kind: "text", text: `• ${stringifyScalar(item)}`, depth });
      }
    }
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v == null || (Array.isArray(v) && v.length === 0)) continue;
      out.push({ kind: "label", text: humanize(k), depth });
      out.push(...flatten(v, depth + 1));
    }
    return out;
  }
  return out;
}

function stringifyScalar(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "[objet]";
    }
  }
  return String(v);
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
