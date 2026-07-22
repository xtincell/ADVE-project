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
import { compileDeliverable, type DeliverableManifest } from "@/server/services/artemis/tools/deliverable-compiler";
import { getSequence } from "@/server/services/artemis/tools/sequences";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { resolveBrandTheme, type BrandTheme } from "@/server/services/brand-theme";

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
export async function exportBrandBibleAsPdf(
  strategyId: string,
  opts?: { manifestOverride?: DeliverableManifest; themeOverride?: BrandTheme },
): Promise<BrandBiblePdfResult> {
  const manifest = opts?.manifestOverride ?? (await compileDeliverable(strategyId, "BRANDBOOK-D"));
  // Thème aux couleurs de la marque (coffre) — fallback UPgraders si pas de palette (ADR-0169).
  const theme = opts?.themeOverride ?? (await resolveBrandTheme(strategyId));
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
  await renderCover(doc, theme, manifest.meta.strategyName, manifest.isComplete);

  // ── Slides 2..N — une par section BRAND ────────────────────────────────────
  let slideCount = 1;
  gloryRefs.forEach((slug, idx) => {
    doc.addPage([W, H], "landscape");
    slideCount += 1;
    const tool = getGloryTool(slug);
    const title = tool?.name ?? slug;
    const section = bySlug.get(slug);
    renderSectionSlide(doc, theme, {
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
async function renderCover(doc: jsPDF, t: BrandTheme, brand: string, isComplete: boolean): Promise<void> {
  // Fond de marque plein (sombre).
  doc.setFillColor(...t.coverBg);
  doc.rect(0, 0, W, H, "F");
  // Bande d'accent verticale (signature fusée).
  doc.setFillColor(...t.band);
  doc.rect(0, 0, 16, H, "F");
  // Logo de la marque en haut à droite (si présent au coffre).
  if (t.logoUrl) await embedLogo(doc, t.logoUrl, W - MARGIN - 240, 96, 240, 96);
  // Sur-titre producteur (signature de l'OS — honnête).
  doc.setTextColor(...t.coverEyebrow);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(t.brandLabel, MARGIN, 180);
  // Titre.
  doc.setTextColor(...t.coverText);
  doc.setFontSize(76);
  doc.text("Bible de Marque", MARGIN, 300);
  // Nom de marque (couleur d'accent — l'identité).
  doc.setTextColor(...t.coverBrand);
  doc.setFontSize(48);
  doc.text(truncate(brand, 40), MARGIN, 380);
  // Pied : date + statut.
  doc.setTextColor(...t.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  const date = new Date().toISOString().slice(0, 10);
  const status = isComplete ? "Édition complète" : "Édition partielle — sections en cours";
  doc.text(`${date}  ·  ${status}`, MARGIN, H - 72);
}

/**
 * Dessine un logo (data-URL directement ; http en best-effort avec timeout).
 * Échec réseau/format → aucun dessin, jamais d'exception (le rendu continue).
 */
async function embedLogo(doc: jsPDF, url: string, x: number, y: number, maxW: number, maxH: number): Promise<void> {
  let dataUrl = url;
  if (!url.startsWith("data:")) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !/^image\//.test(ct)) return;
      const buf = Buffer.from(await res.arrayBuffer());
      dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
    } catch {
      return;
    }
  }
  try {
    const props = doc.getImageProperties(dataUrl);
    const fmt = /image\/jpe?g/i.test(dataUrl) ? "JPEG" : "PNG";
    const ratio = props.width / props.height || 1;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    // Aligné à droite du cadre alloué.
    doc.addImage(dataUrl, fmt, x + (maxW - w), y, w, h, undefined, "FAST");
  } catch {
    /* image illisible → pas de logo, on continue */
  }
}

// ── Rendu : slide de section ─────────────────────────────────────────────────
function renderSectionSlide(
  doc: jsPDF,
  t: BrandTheme,
  s: { index: number; total: number; title: string; brand: string; content: Record<string, unknown> | null },
): void {
  // Fond de section (clair).
  doc.setFillColor(...t.sectionBg);
  doc.rect(0, 0, W, H, "F");
  // Bandeau d'en-tête (accent de marque).
  doc.setFillColor(...t.band);
  doc.rect(0, 0, W, 132, "F");
  // Eyebrow + titre dans le bandeau (couleur lisible sur l'accent).
  doc.setTextColor(...t.bandText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(`BIBLE DE MARQUE · ${truncate(s.brand, 28).toUpperCase()}`, MARGIN, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text(truncate(s.title, 52), MARGIN, 100);

  // Corps : PLANCHE VISUELLE — cadre placeholder (image forgée OU prompt prêt)
  // à gauche + directions du brief à droite. C'est la « mise en forme » : chaque
  // planche porte son PROMPT laser dans le cadre, en attendant la forge
  // gpt-image-1 (l'opérateur accepte les fails image → placeholder visible).
  const prompt = buildPlatePrompt(s.title, s.content);
  const forged = extractImageDataUrl(s.content);
  renderVisualFrame(doc, t, MARGIN, 168, 684, H - 168 - 78, prompt, forged);
  renderCaption(doc, t, 792, 196, W - 792 - MARGIN, s.content);

  // Pied de page : numéro + branding.
  doc.setTextColor(...t.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`${String(s.index).padStart(2, "0")} / ${String(s.total).padStart(2, "0")}`, MARGIN, H - 40);
  doc.text("Propulsé par La Fusée", W - MARGIN, H - 40, { align: "right" });
  // Barre d'accent sous le pied.
  doc.setFillColor(...t.accentBar);
  doc.rect(MARGIN, H - 58, 48, 4, "F");
}

/** Prompt laser-focus de la planche (placeholder lisible si pas d'image forgée). */
function buildPlatePrompt(title: string, content: Record<string, unknown> | null): string {
  const base = `Planche « ${title} » — direction artistique de marque, rendu premium FMCG, cohérent avec l'identité VERROUILLÉE (logo, palette, système graphique, KV maître). Ne pas réinventer : enrichir la planche précédente.`;
  if (!content) return `${base}\nÉléments : brief à générer (séquence BRANDBOOK-D).`;
  const directions = flatten(content, 0)
    .filter((l) => l.kind === "text")
    .map((l) => l.text.replace(/^•\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" · ");
  return directions ? `${base}\nÉléments obligatoires : ${directions}.` : base;
}

/** Détecte une image forgée (data URL ou http) attachée au contenu du brief. */
function extractImageDataUrl(content: Record<string, unknown> | null): string | null {
  if (!content) return null;
  for (const key of ["imageUrl", "image", "forgedImageUrl", "url", "fileUrl"]) {
    const v = content[key];
    if (typeof v === "string" && /^(data:image\/|https?:\/\/)/.test(v)) return v;
  }
  return null;
}

/** Cadre visuel : image forgée si dispo, sinon placeholder avec le PROMPT prêt. */
function renderVisualFrame(
  doc: jsPDF,
  t: BrandTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  prompt: string,
  forgedUrl: string | null,
): void {
  if (forgedUrl) {
    try {
      const fmt = forgedUrl.includes("image/jpeg") || /\.jpe?g/i.test(forgedUrl) ? "JPEG" : "PNG";
      doc.addImage(forgedUrl, fmt, x, y, w, h, undefined, "FAST");
      doc.setDrawColor(...t.ink);
      doc.setLineWidth(1.5);
      doc.rect(x, y, w, h, "S");
      return;
    } catch {
      /* image illisible → placeholder ci-dessous */
    }
  }
  // Placeholder « cadre vide » avec le prompt dans le cadre.
  doc.setFillColor(...t.frameBg);
  doc.setDrawColor(...t.band);
  doc.setLineWidth(2);
  doc.rect(x, y, w, h, "FD");
  doc.setFillColor(...t.band);
  doc.rect(x, y, 300, 32, "F");
  doc.setTextColor(...t.bandText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VISUEL À FORGER · gpt-image-1 (1K)", x + 12, y + 21);
  doc.setTextColor(...t.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PROMPT", x + 18, y + 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  let ty = y + 90;
  for (const para of prompt.split("\n")) {
    for (const ln of doc.splitTextToSize(para, w - 36) as string[]) {
      if (ty > y + h - 18) {
        doc.setTextColor(...t.muted);
        doc.text("…", x + 18, ty);
        return;
      }
      doc.text(ln, x + 18, ty);
      ty += 18;
    }
    ty += 6;
  }
}

/** Directions du brief, condensées en colonne (à droite de la planche). */
function renderCaption(
  doc: jsPDF,
  t: BrandTheme,
  x: number,
  y: number,
  w: number,
  content: Record<string, unknown> | null,
): void {
  doc.setTextColor(...t.accentOnLight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("DIRECTIONS DU BRIEF", x, y);
  let ty = y + 26;
  const bottom = H - 80;
  if (!content) {
    doc.setTextColor(...t.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    for (const ln of doc.splitTextToSize("Brief à générer (séquence BRANDBOOK-D).", w) as string[]) {
      doc.text(ln, x, ty);
      ty += 16;
    }
    return;
  }
  for (const ln of flatten(content, 0)) {
    if (ty > bottom) {
      doc.setTextColor(...t.muted);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.text("… (détail dans le vault)", x, ty);
      return;
    }
    const isLabel = ln.kind === "label";
    const col = isLabel ? t.accentOnLight : t.ink;
    doc.setTextColor(col[0], col[1], col[2]);
    doc.setFont("helvetica", isLabel ? "bold" : "normal");
    doc.setFontSize(isLabel ? 12 : 11);
    const indent = x + ln.depth * 12;
    for (const wln of doc.splitTextToSize(ln.text, w - ln.depth * 12) as string[]) {
      if (ty > bottom) break;
      doc.text(wln, indent, ty);
      ty += 15;
    }
    if (isLabel) ty += 2;
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
