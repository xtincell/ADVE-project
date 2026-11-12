/**
 * Source Classifier — LLM decomposer.
 *
 * Two LLM-backed primitives:
 *   - decomposeDocument: a long-form document (PDF/DOCX/note) is decomposed
 *     into N section proposals, each tagged with a canonical BrandAssetKind.
 *     The full extracted text is submitted once, with a strict complete-answer
 *     contract and original-source citations; no prefix or kind-count truncation.
 *   - classifyImage: a logo/photo/packaging image is classified into the
 *     right visual kind (LOGO_FINAL / KV_VISUAL / PHOTO_GUIDELINES / …).
 *
 * Layer 2. Wraps llm-gateway. No DB writes.
 */

import { z } from "zod";
import { callLLMAndParse } from "@/server/services/llm-gateway";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import {
  BRAND_ASSET_KINDS,
  isBrandAssetKind,
  type BrandAssetKind,
} from "@/domain/brand-asset-kinds";
import { inferPillarSource } from "./pillar-mapping";
import type { SourceClassificationProposal } from "./types";

const DocumentProposalsSchema = z.object({
  complete: z.literal(true),
  proposals: z.array(z.object({
    kind: z.enum(BRAND_ASSET_KINDS),
    name: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    confidence: z.number().min(0).max(1),
    content: z.record(z.string(), z.unknown()),
    quote: z.string().trim().min(1),
    sectionTitle: z.string().optional(),
  }).strict()).min(1),
}).strict();

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
  if (!input.rawContent.trim()) return [];

  const allowedKinds = BRAND_ASSET_KINDS.join(", ");
  const system = `${UNTRUSTED_NOTICE}

Tu es l'opérateur "filtreur qualifiant" du vault de marque La Fusée.
Ta mission : décomposer intégralement le document fourni en actifs de marque qualifiés (BrandAsset),
chacun avec son \`kind\` canonique. Cherche activement à couvrir plusieurs piliers ADVERTIS quand le document est riche.
Conserve les sections et profils distincts, même quand ils ont le même kind.
Ne transforme jamais une mascotte, un questionnaire, une équipe ou un sommaire en clientèle cible.
Les profils documentaires restent des hypothèses ou des descriptions, jamais des contacts réels.
Pour chaque proposition, fournis une citation courte, littérale et UNIQUE du corps du document,
qui justifie son contenu. Ne cite pas un simple sommaire à la place du passage détaillé.
N'invente aucun fait, priorité, rôle, tarif ou mesure absent de ce passage.
Le document est fourni en entier. Indique complete:true seulement si toute sa lecture est terminée.
Si tu ne peux pas terminer, réponds complete:false : aucune proposition ne sera enregistrée.

Piliers ADVERTIS : A=Authenticité, D=Distinction, V=Valeur, E=Engagement, R=Reach, T=Trust, I=Innovation, S=Strategy.
Kinds autorisés : ${allowedKinds}.
Préfère un kind spécifique. Utilise GENERIC seulement si vraiment rien ne colle.

Le champ content contient les informations extraites ; quote est la preuve textuelle,
sans reformulation. Les positions seront calculées depuis l'original, ne les devine pas.`;

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : document fourni
  // par le founder (contenu + métadonnées de fichier attaquant-contrôlables).
  const prompt = `Document à décomposer :
- Nom de fichier : ${sanitizeInline(input.fileName ?? "(sans nom)", { max: 300 })}
- Type MIME : ${sanitizeInline(input.mimeType ?? "inconnu", { max: 120 })}
- Type fichier : ${sanitizeInline(input.fileType ?? "inconnu", { max: 60 })}

${wrapUntrusted("CONTENU INTÉGRAL DU DOCUMENT", input.rawContent, { max: input.rawContent.length })}

Décompose l'ensemble du document en propositions BrandAsset distinctes et sourcées.`;

  // One structured attempt, through the existing policy/cost/provider gateway.
  // Invalid, partial or oversized responses fail before the vault transaction.
  const { data } = await executeStructuredLLMCall({
    system, prompt, schema: DocumentProposalsSchema,
    caller: "source-classifier:decompose", strategyId: input.strategyId,
    purpose: "agent", maxOutputTokens: 6000, retries: 0,
    signal: AbortSignal.timeout(120_000),
  });
  const out: SourceClassificationProposal[] = [];

  for (const r of data.proposals) {
    const charStart = input.rawContent.indexOf(r.quote);
    if (charStart < 0 || input.rawContent.indexOf(r.quote, charStart + 1) >= 0) {
      throw new Error("SOURCE_CITATION_INVALID: une citation doit désigner un passage original unique.");
    }
    out.push({
      kind: r.kind, name: r.name, summary: r.summary,
      confidence: r.confidence, content: r.content,
      sourceCitation: {
        charStart, charEnd: charStart + r.quote.length,
        ...(r.sectionTitle ? { sectionTitle: r.sectionTitle } : {}),
      },
      pillarSource: inferPillarSource(r.kind),
      inferredBy: "decomposer",
    });
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
  const system = `${UNTRUSTED_NOTICE}

Tu es un expert en identité visuelle. Tu reçois une image fournie par un founder
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
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : nom de fichier,
  // MIME et charge base64 fournis par le founder (upload attaquant-contrôlable).
  const prompt = `Nom de fichier : ${sanitizeInline(input.fileName ?? "(sans nom)", { max: 300 })} — MIME : ${sanitizeInline(input.mimeType ?? "image", { max: 120 })}.
[IMAGE_DATA:${sanitizeInline(stripped.slice(0, 200), { max: 200 })}…]
Choisis le kind le plus précis selon le contenu visuel inféré du nom et du contexte.`;

  let parsed: Record<string, unknown> | unknown[];
  try {
    parsed = await callLLMAndParse({
      system,
      prompt,
      caller: "source-classifier:image",
      strategyId: input.strategyId,
      purpose: "agent",
      maxOutputTokens: 600,
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
export const SUPPORTED_DOCUMENT_KINDS = BRAND_ASSET_KINDS;
export const SUPPORTED_IMAGE_KINDS = IMAGE_KIND_OPTIONS;
export const ALL_BRAND_ASSET_KINDS = BRAND_ASSET_KINDS;
