/**
 * Mime + filename heuristics for source classification.
 *
 * Layer 0 (pure functions, no IO). Cheap first pass that decides whether
 * we can ship a confident proposal directly OR need to escalate to the
 * vision LLM (images) / document decomposer (PDF/DOCX/long text).
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import type { MimeKindHeuristic } from "./types";

const LOGO_PATTERNS = /\b(logo|wordmark|monogram|emblem|crest|brandmark)\b/i;
const MANIFESTO_PATTERNS = /\b(manifesto|manifeste|credo|charte\s+de\s+marque|brand\s+manifesto)\b/i;
const PERSONA_PATTERNS = /\b(persona|buyer\s*persona|audience|cible|target)\b/i;
const POSITIONING_PATTERNS = /\b(positioning|positionnement|usp|differentiation)\b/i;
const TONE_PATTERNS = /\b(tone\s*of\s*voice|ton\s*de\s*marque|voice|verbal\s*identity)\b/i;
const PALETTE_PATTERNS = /\b(palette|color|chromatic|couleur|chromatique)\b/i;
const TYPO_PATTERNS = /\b(typo|typography|typographie|font|police)\b/i;
const STORYBOARD_PATTERNS = /\b(storyboard|story-?board)\b/i;
const PACKAGING_PATTERNS = /\b(packaging|pack(?:|aging)|emballage)\b/i;
const OOH_PATTERNS = /\b(ooh|out-?of-?home|outdoor|billboard|affichage)\b/i;
const PITCH_PATTERNS = /\b(pitch(?:\s*deck)?|sales\s*deck)\b/i;
const SCRIPT_PATTERNS = /\b(script|scenario|sc[eé]nario)\b/i;
const NAMING_PATTERNS = /\b(naming|nom(?:enclature)?|name\s*proposals)\b/i;
const VALUE_PROP_PATTERNS = /\b(value\s*proposition|proposition\s*de\s*valeur|usp)\b/i;
const SUPERFAN_PATTERNS = /\b(superfan|fanbase|community\s*journey)\b/i;
const BIG_IDEA_PATTERNS = /\b(big\s*idea|grande\s*id[eé]e|concept\s*central)\b/i;
const SEO_PATTERNS = /\b(seo|search\s*engine|referencement)\b/i;
const TREND_PATTERNS = /\b(trend|tendance|signal|radar)\b/i;

const IMAGE_MIME = /^image\//i;
const VIDEO_MIME = /^video\//i;
const AUDIO_MIME = /^audio\//i;
const PDF_MIME = /\bpdf\b/i;
const DOC_MIME = /\b(msword|wordprocessingml|officedocument\.wordprocessingml|opendocument\.text)\b/i;
const XLS_MIME = /\b(spreadsheetml|excel|opendocument\.spreadsheet)\b/i;

interface HeuristicInput {
  mimeType: string | null;
  fileType: string | null;
  fileName: string | null;
  rawContent?: string | null;
}

/**
 * First-pass classification. Returns the most likely BrandAssetKind plus a
 * confidence (0..1) and a flag indicating whether to escalate to the vision
 * LLM. Never returns null — falls back to GENERIC.
 */
export function classifyByHeuristic(input: HeuristicInput): MimeKindHeuristic {
  const mime = (input.mimeType ?? "").toLowerCase();
  const fileType = (input.fileType ?? "").toLowerCase();
  const name = input.fileName ?? "";
  const content = (input.rawContent ?? "").slice(0, 1500);

  // ── Images ───────────────────────────────────────────────────
  if (IMAGE_MIME.test(mime) || /^(svg|png|jpg|jpeg|webp|gif|img)$/i.test(fileType)) {
    if (LOGO_PATTERNS.test(name) || /\b(logo)\b/i.test(content)) {
      return { kind: "LOGO_FINAL", confidence: 0.85, needsVision: false };
    }
    if (PACKAGING_PATTERNS.test(name)) {
      return { kind: "PACKAGING_LAYOUT", confidence: 0.7, needsVision: true };
    }
    if (OOH_PATTERNS.test(name)) {
      return { kind: "OOH_LAYOUT", confidence: 0.7, needsVision: true };
    }
    if (STORYBOARD_PATTERNS.test(name)) {
      return { kind: "STORYBOARD", confidence: 0.7, needsVision: true };
    }
    // Vector → very likely a logo even without naming hint.
    if (mime === "image/svg+xml" || fileType === "svg") {
      return { kind: "LOGO_FINAL", confidence: 0.65, needsVision: true };
    }
    // Generic raster image → escalate to vision LLM for refinement.
    return { kind: "KV_VISUAL", confidence: 0.4, needsVision: true };
  }

  // ── Video ────────────────────────────────────────────────────
  if (VIDEO_MIME.test(mime) || /^(mp4|mov|avi|webm)$/i.test(fileType)) {
    return { kind: "VIDEO_SPOT", confidence: 0.85, needsVision: false };
  }

  // ── Audio ────────────────────────────────────────────────────
  if (AUDIO_MIME.test(mime) || /^(mp3|wav|aac|m4a)$/i.test(fileType)) {
    return { kind: "AUDIO_JINGLE", confidence: 0.7, needsVision: false };
  }

  // ── PDF / DOC — defer to decomposer for structure ──────────
  if (PDF_MIME.test(mime) || fileType === "pdf" || DOC_MIME.test(mime) || /^(docx|doc)$/i.test(fileType)) {
    if (PITCH_PATTERNS.test(name)) return { kind: "PITCH", confidence: 0.75, needsVision: false };
    if (BIG_IDEA_PATTERNS.test(name)) return { kind: "BIG_IDEA", confidence: 0.7, needsVision: false };
    if (MANIFESTO_PATTERNS.test(name)) return { kind: "MANIFESTO", confidence: 0.75, needsVision: false };
    if (POSITIONING_PATTERNS.test(name)) return { kind: "POSITIONING", confidence: 0.75, needsVision: false };
    if (PERSONA_PATTERNS.test(name)) return { kind: "PERSONA", confidence: 0.7, needsVision: false };
    if (TONE_PATTERNS.test(name)) return { kind: "TONE_CHARTER", confidence: 0.75, needsVision: false };
    if (PALETTE_PATTERNS.test(name)) return { kind: "CHROMATIC_STRATEGY", confidence: 0.75, needsVision: false };
    if (TYPO_PATTERNS.test(name)) return { kind: "TYPOGRAPHY_SYSTEM", confidence: 0.75, needsVision: false };
    if (NAMING_PATTERNS.test(name)) return { kind: "NAMING", confidence: 0.7, needsVision: false };
    if (VALUE_PROP_PATTERNS.test(name)) return { kind: "VALUE_PROPOSITION", confidence: 0.7, needsVision: false };
    if (SUPERFAN_PATTERNS.test(name)) return { kind: "SUPERFAN_JOURNEY", confidence: 0.7, needsVision: false };
    if (SCRIPT_PATTERNS.test(name)) return { kind: "SCRIPT", confidence: 0.7, needsVision: false };
    if (STORYBOARD_PATTERNS.test(name)) return { kind: "STORYBOARD", confidence: 0.7, needsVision: false };
    if (SEO_PATTERNS.test(name)) return { kind: "SEO_REPORT", confidence: 0.75, needsVision: false };
    if (TREND_PATTERNS.test(name)) return { kind: "TREND_RADAR", confidence: 0.7, needsVision: false };
    // Generic brandbook/document → likely multi-section, decomposer will split.
    return { kind: "CREATIVE_BRIEF", confidence: 0.35, needsVision: false };
  }

  // ── Spreadsheet ─────────────────────────────────────────────
  if (XLS_MIME.test(mime) || /^(xlsx|xls|csv)$/i.test(fileType)) {
    if (TREND_PATTERNS.test(name)) return { kind: "TREND_RADAR", confidence: 0.7, needsVision: false };
    return { kind: "GENERIC", confidence: 0.4, needsVision: false };
  }

  // ── Plain text / manual notes ───────────────────────────────
  if (mime.startsWith("text/") || fileType === "txt" || fileType === "md" || fileType === "markdown") {
    if (MANIFESTO_PATTERNS.test(name) || MANIFESTO_PATTERNS.test(content)) {
      return { kind: "MANIFESTO", confidence: 0.7, needsVision: false };
    }
    if (BIG_IDEA_PATTERNS.test(name) || BIG_IDEA_PATTERNS.test(content)) {
      return { kind: "BIG_IDEA", confidence: 0.65, needsVision: false };
    }
    if (POSITIONING_PATTERNS.test(name) || POSITIONING_PATTERNS.test(content)) {
      return { kind: "POSITIONING", confidence: 0.65, needsVision: false };
    }
    if (PERSONA_PATTERNS.test(name) || PERSONA_PATTERNS.test(content)) {
      return { kind: "PERSONA", confidence: 0.6, needsVision: false };
    }
    if (TONE_PATTERNS.test(name) || TONE_PATTERNS.test(content)) {
      return { kind: "TONE_CHARTER", confidence: 0.65, needsVision: false };
    }
    return { kind: "GENERIC", confidence: 0.3, needsVision: false };
  }

  return { kind: "GENERIC", confidence: 0.2, needsVision: false };
}
