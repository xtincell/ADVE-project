/**
 * Source Classifier — LLM decomposer.
 *
 * Two LLM-backed primitives:
 *   - decomposeDocument: a long-form document (PDF/DOCX/note) is decomposed
 *     into N section proposals, each tagged with a canonical BrandAssetKind.
 *     A brandbook PDF typically yields 3-6 proposals (logo, palette, typo,
 *     tone, manifesto) covering multiple ADVERTIS pillars.
 *   - classifyImage: a logo/photo/packaging image is classified into the
 *     right visual kind (LOGO_FINAL / KV_VISUAL / PHOTO_GUIDELINES / …).
 *
 * Layer 2. Wraps llm-gateway. No DB writes.
 */

import { callLLMAndParse } from "@/server/services/llm-gateway";
import {
  BRAND_ASSET_KINDS,
  isBrandAssetKind,
  type BrandAssetKind,
} from "@/domain/brand-asset-kinds";
import { inferPillarSource } from "./pillar-mapping";
import type { SourceClassificationProposal } from "./types";

const MAX_DECOMPOSER_PROPOSALS = 6;
const DECOMPOSER_INPUT_CAP = 12_000;

const DOCUMENT_KIND_HINTS: BrandAssetKind[] = [
  "MANIFESTO",
  "POSITIONING",
  "TONE_CHARTER",
  "PERSONA",
  "SUPERFAN_JOURNEY",
  "VALUE_PROPOSITION",
  "CHROMATIC_STRATEGY",
  "TYPOGRAPHY_SYSTEM",
  "BIG_IDEA",
  "CREATIVE_BRIEF",
  "BRIEF_360",
  "PITCH",
  "TREND_RADAR",
  "SEO_REPORT",
  "NAMING",
  "CLAIM",
  "BRAINSTORM",
  "CONCEPT",
  "SOCIAL_COPY",
  "LONG_COPY",
  "GENERIC",
];

const IMAGE_KIND_OPTIONS = [
  "LOGO_FINAL",
  "LOGO_IDEA",
  "KV_VISUAL",
  "PACKAGING_LAYOUT",
  "OOH_LAYOUT",
  "STORYBOARD",
] as const satisfies readonly BrandAssetKind[];

interface DecomposeInput {
  rawContent: string;
  fileName: string | null;
  mimeType: string | null;
  fileType: string | null;
  strategyId: string;
}

/**
 * Ask the LLM to split a document into N BrandAsset proposals. Each
 * proposal is shaped so that downstream callers can pass it directly to
 * `createBrandAsset` (kind + name + summary + content + sourceCitation).
 *
 * The prompt instructs the LLM to **prefer covering multiple ADVERTIS
 * pillars** when the document is rich (a brandbook should yield assets
 * across A/D/E/I, not just one pillar).
 */
export async function decomposeDocument(
  input: DecomposeInput,
): Promise<SourceClassificationProposal[]> {
  const truncated = input.rawContent.slice(0, DECOMPOSER_INPUT_CAP);
  if (!truncated.trim()) return [];

  const allowedKinds = DOCUMENT_KIND_HINTS.join(", ");
  const system = `Tu es l'opérateur "filtreur qualifiant" du vault de marque La Fusée.
Ta mission : décomposer un document fourni par le founder en 1 à ${MAX_DECOMPOSER_PROPOSALS} actifs de marque qualifiés (BrandAsset),
chacun avec son \`kind\` canonique. Cherche activement à couvrir plusieurs piliers ADVERTIS quand le document est riche.

Piliers ADVERTIS : A=Authenticité, D=Distinction, V=Valeur, E=Engagement, R=Reach, T=Trust, I=Innovation, S=Strategy.
Kinds autorisés : ${allowedKinds}.
Préfère un kind spécifique. Utilise GENERIC seulement si vraiment rien ne colle.

Tu réponds STRICTEMENT en JSON, format :
{
  "proposals": [
    {
      "kind": "<BrandAssetKind>",
      "name": "<court, mémorable, en français>",
      "summary": "<1 phrase descriptive>",
      "content": { "extracted": "<contenu structuré pertinent en français>" },
      "sectionTitle": "<titre de section dans le doc, si identifiable>",
      "charStart": <int approximatif>,
      "charEnd": <int approximatif>,
      "confidence": <float 0..1>
    }
  ]
}`;

  const prompt = `Document à décomposer :
- Nom de fichier : ${input.fileName ?? "(sans nom)"}
- Type MIME : ${input.mimeType ?? "inconnu"}
- Type fichier : ${input.fileType ?? "inconnu"}

Contenu (potentiellement tronqué à ${DECOMPOSER_INPUT_CAP} caractères) :
"""
${truncated}
"""

Décompose ce document en propositions BrandAsset (max ${MAX_DECOMPOSER_PROPOSALS}).`;

  let parsed: Record<string, unknown> | unknown[];
  try {
    parsed = await callLLMAndParse({
      system,
      prompt,
      caller: "source-classifier:decompose",
      strategyId: input.strategyId,
      purpose: "agent",
      maxTokens: 4000,
    });
  } catch (err) {
    console.warn(
      "[source-classifier] decomposer LLM call failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }

  const root = parsed as { proposals?: unknown };
  const list = Array.isArray(root.proposals) ? root.proposals : [];
  const out: SourceClassificationProposal[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const kind = typeof r.kind === "string" ? r.kind.toUpperCase() : "GENERIC";
    const validKind: BrandAssetKind = isBrandAssetKind(kind) ? kind : "GENERIC";
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Section ${out.length + 1}`;
    const summary = typeof r.summary === "string" ? r.summary.trim() : "";
    const confidenceRaw = typeof r.confidence === "number" ? r.confidence : 0.6;
    const confidence = Math.max(0, Math.min(1, confidenceRaw));

    out.push({
      kind: validKind,
      name,
      summary,
      confidence,
      content: (r.content && typeof r.content === "object" && !Array.isArray(r.content))
        ? (r.content as Record<string, unknown>)
        : { extracted: summary },
      sourceCitation: {
        ...(typeof r.charStart === "number" ? { charStart: r.charStart } : {}),
        ...(typeof r.charEnd === "number" ? { charEnd: r.charEnd } : {}),
        ...(typeof r.sectionTitle === "string" ? { sectionTitle: r.sectionTitle } : {}),
      },
      pillarSource: inferPillarSource(validKind),
      inferredBy: "decomposer",
    });

    if (out.length >= MAX_DECOMPOSER_PROPOSALS) break;
  }

  return out;
}

interface ClassifyImageInput {
  base64Data: string;
  fileName: string | null;
  mimeType: string | null;
  strategyId: string;
}

/**
 * Vision LLM refinement for an image. Used as fallback when the heuristic
 * confidence is below threshold OR the heuristic flagged `needsVision`.
 *
 * Returns a single proposal (one image → one BrandAsset) — for multi-page
 * decks or sliced images, run the decomposer on the extracted text instead.
 */
export async function classifyImage(
  input: ClassifyImageInput,
): Promise<SourceClassificationProposal | null> {
  const allowed = IMAGE_KIND_OPTIONS.join(" | ");
  const system = `Tu es un expert en identité visuelle. Tu reçois une image fournie par un founder
et tu choisis le kind canonique parmi : ${allowed}.

Réponds STRICTEMENT en JSON :
{
  "kind": "<un des kinds listés>",
  "confidence": <float 0..1>,
  "name": "<nom court en français>",
  "summary": "<1 phrase>",
  "reasoning": "<1 phrase justification>"
}`;

  const stripped = input.base64Data.replace(/^data:image\/[^;]+;base64,/, "");
  const prompt = `Nom de fichier : ${input.fileName ?? "(sans nom)"} — MIME : ${input.mimeType ?? "image"}.
[IMAGE_DATA:${stripped.slice(0, 200)}…]
Choisis le kind le plus précis selon le contenu visuel inféré du nom et du contexte.`;

  let parsed: Record<string, unknown> | unknown[];
  try {
    parsed = await callLLMAndParse({
      system,
      prompt,
      caller: "source-classifier:image",
      strategyId: input.strategyId,
      purpose: "agent",
      maxTokens: 600,
    });
  } catch (err) {
    console.warn(
      "[source-classifier] vision LLM call failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  const r = parsed as Record<string, unknown>;
  const kindRaw = typeof r.kind === "string" ? r.kind.toUpperCase() : "KV_VISUAL";
  const kind: BrandAssetKind = isBrandAssetKind(kindRaw)
    ? (kindRaw as BrandAssetKind)
    : "KV_VISUAL";
  const confidence = typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.6;
  const name = typeof r.name === "string" && r.name.trim()
    ? r.name.trim()
    : (input.fileName ?? "Image");

  return {
    kind,
    name,
    summary: typeof r.summary === "string" ? r.summary.trim() : "",
    confidence,
    pillarSource: inferPillarSource(kind),
    inferredBy: "vision",
  };
}

/** Re-export for tests + tests on exhaustivity vs canonical taxonomy. */
export const SUPPORTED_DOCUMENT_KINDS = DOCUMENT_KIND_HINTS;
export const SUPPORTED_IMAGE_KINDS = IMAGE_KIND_OPTIONS;
export const ALL_BRAND_ASSET_KINDS = BRAND_ASSET_KINDS;
