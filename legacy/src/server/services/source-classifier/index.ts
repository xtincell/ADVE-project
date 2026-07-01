/**
 * Source Classifier — orchestrator.
 *
 * Reads a BrandDataSource (operator upload / note / URL) and proposes
 * 1→N BrandAsset DRAFTs that classify the source into the canonical
 * Phase 10 vault taxonomy. Operator validates via the Cockpit "Propositions
 * vault" UI section, which then drives the Phase 10 state machine
 * (DRAFT → CANDIDATE → SELECTED → ACTIVE) through the brand-vault router.
 *
 * Pipeline :
 *   1. Heuristic mime+filename+content match (cheap, deterministic).
 *   2. If image AND heuristic confidence < threshold OR needsVision flag,
 *      escalate to Claude vision via classifyImage.
 *   3. If document (PDF/DOCX/long text) AND substantial content,
 *      run LLM decomposer to split into N section-level proposals.
 *   4. Persist proposals as BrandAsset(state=DRAFT) via brand-vault engine
 *      with metadata.sourceDataSourceId + metadata.classifierConfidence
 *      for lineage. Asset-tagger auto-runs after creation (non-blocking).
 *
 * Layer 2 — uses brand-vault engine, ingestion-pipeline data, llm-gateway.
 */

import { db } from "@/lib/db";
import { createBrandAsset } from "@/server/services/brand-vault/engine";
import { tagAsset } from "@/server/services/asset-tagger";
import { isBrandAssetKind, type BrandAssetKind } from "@/domain/brand-asset-kinds";
import { classifyByHeuristic } from "./mime-heuristics";
import { decomposeDocument, classifyImage } from "./llm-decomposer";
import { inferPillarSource } from "./pillar-mapping";
import type { SourceClassificationProposal } from "./types";

const VISION_CONFIDENCE_THRESHOLD = 0.7;
const DECOMPOSER_MIN_CONTENT_LENGTH = 800;
const HEURISTIC_DECOMPOSER_TRIGGERS = new Set<BrandAssetKind>([
  "CREATIVE_BRIEF",
  "BRIEF_360",
  "GENERIC",
]);

export interface ClassifierResult {
  sourceId: string;
  strategyId: string;
  proposals: SourceClassificationProposal[];
  durationMs: number;
}

export interface VaultProposalResult extends ClassifierResult {
  /** BrandAsset.id values for the DRAFTs persisted in the vault. */
  brandAssetIds: string[];
}

/**
 * Classify a single BrandDataSource into N proposals (no DB writes).
 * Returns proposals in confidence-descending order.
 */
export async function classifySource(sourceId: string): Promise<ClassifierResult> {
  const t0 = Date.now();
  const source = await db.brandDataSource.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      strategyId: true,
      sourceType: true,
      fileName: true,
      fileType: true,
      rawContent: true,
      rawData: true,
      processingStatus: true,
    },
  });
  if (!source) throw new Error(`BrandDataSource ${sourceId} not found`);
  if (source.processingStatus !== "EXTRACTED" && source.processingStatus !== "PROCESSED") {
    return { sourceId, strategyId: source.strategyId, proposals: [], durationMs: Date.now() - t0 };
  }

  const mimeType = inferMimeType(source.fileType, source.sourceType);
  const heuristic = classifyByHeuristic({
    mimeType,
    fileType: source.fileType,
    fileName: source.fileName,
    rawContent: source.rawContent,
  });

  const proposals: SourceClassificationProposal[] = [];

  // ── Image path ───────────────────────────────────────────────
  // The heuristic already picked something (e.g. LOGO_FINAL via filename);
  // ship it. If confidence is shaky, refine with the vision LLM.
  if (isImageType(source.fileType, mimeType)) {
    const heuristicProposal: SourceClassificationProposal = {
      kind: heuristic.kind,
      name: source.fileName ?? `Image ${source.id.slice(0, 6)}`,
      summary: `Image ${heuristic.kind} (heuristique mime+nom).`,
      confidence: heuristic.confidence,
      pillarSource: inferPillarSource(heuristic.kind),
      inferredBy: "heuristic",
    };
    proposals.push(heuristicProposal);

    if (heuristic.needsVision || heuristic.confidence < VISION_CONFIDENCE_THRESHOLD) {
      const rawData = source.rawData as Record<string, unknown> | null;
      const base64 =
        typeof rawData?.base64 === "string"
          ? rawData.base64
          : typeof source.rawContent === "string" && source.rawContent.startsWith("data:image/")
            ? source.rawContent
            : null;
      if (base64) {
        const visionProposal = await classifyImage({
          base64Data: base64,
          fileName: source.fileName,
          mimeType,
          strategyId: source.strategyId,
        });
        if (visionProposal && visionProposal.confidence > heuristic.confidence) {
          proposals.unshift(visionProposal);
        }
      }
    }

    return finalize(source.id, source.strategyId, proposals, t0);
  }

  // ── Document / text path ─────────────────────────────────────
  const content = source.rawContent ?? "";
  const longEnough = content.length >= DECOMPOSER_MIN_CONTENT_LENGTH;
  const heuristicWantsDecomposer = HEURISTIC_DECOMPOSER_TRIGGERS.has(heuristic.kind) && longEnough;

  // Always seed the heuristic proposal (helps when LLM is unavailable / no key).
  proposals.push({
    kind: heuristic.kind,
    name: source.fileName ?? `Source ${source.id.slice(0, 6)}`,
    summary: heuristicSummary(heuristic.kind, source.fileName),
    confidence: heuristic.confidence,
    content: { extracted: content.slice(0, 600) },
    pillarSource: inferPillarSource(heuristic.kind),
    inferredBy: "heuristic",
  });

  if (heuristicWantsDecomposer || heuristic.confidence < VISION_CONFIDENCE_THRESHOLD && longEnough) {
    const decomposed = await decomposeDocument({
      rawContent: content,
      fileName: source.fileName,
      mimeType,
      fileType: source.fileType,
      strategyId: source.strategyId,
    });
    for (const proposal of decomposed) {
      // Drop duplicate kinds (heuristic-only + LLM same kind) when LLM has higher confidence.
      const existingIdx = proposals.findIndex((p) => p.kind === proposal.kind);
      if (existingIdx >= 0) {
        if (proposal.confidence > proposals[existingIdx]!.confidence) {
          proposals[existingIdx] = proposal;
        }
      } else {
        proposals.push(proposal);
      }
    }
  }

  return finalize(source.id, source.strategyId, proposals, t0);
}

function finalize(
  sourceId: string,
  strategyId: string,
  proposals: SourceClassificationProposal[],
  t0: number,
): ClassifierResult {
  proposals.sort((a, b) => b.confidence - a.confidence);
  return { sourceId, strategyId, proposals, durationMs: Date.now() - t0 };
}

/**
 * Run the classifier and persist the proposals as BrandAsset(state=DRAFT).
 * The operator reviews them in the cockpit Propositions vault panel.
 */
export async function proposeBrandAssetsFromSource(
  sourceId: string,
  operatorId: string,
): Promise<VaultProposalResult> {
  const classification = await classifySource(sourceId);
  if (classification.proposals.length === 0) {
    return { ...classification, brandAssetIds: [] };
  }

  // Drop any prior DRAFTs from the same source so re-classification doesn't
  // accumulate stale proposals (operator-promoted CANDIDATE/SELECTED/ACTIVE
  // assets are NEVER touched — they are committed work).
  const stale = await db.brandAsset.findMany({
    where: { strategyId: classification.strategyId, state: "DRAFT" },
    select: { id: true, metadata: true },
  });
  const staleIds = stale
    .filter((a: { id: string; metadata: unknown }) => {
      const meta = (a.metadata as Record<string, unknown> | null) ?? null;
      return meta?.sourceDataSourceId === sourceId;
    })
    .map((a: { id: string }) => a.id);
  if (staleIds.length > 0) {
    await db.brandAsset.deleteMany({ where: { id: { in: staleIds } } });
  }

  const source = await db.brandDataSource.findUnique({
    where: { id: sourceId },
    select: { fileType: true, fileName: true, sourceType: true },
  });

  const brandAssetIds: string[] = [];
  for (const proposal of classification.proposals) {
    const safeKind: BrandAssetKind = isBrandAssetKind(proposal.kind) ? proposal.kind : "GENERIC";
    // V1: classifier produces INTELLECTUAL DRAFTs. Operator can later
    // upload a proper fileUrl via the brand-vault router (`supersede`)
    // when promoting LOGO_FINAL/KV_VISUAL/PACKAGING_LAYOUT to ACTIVE.
    const family = guessFamily(safeKind);
    try {
      const asset = await createBrandAsset({
        strategyId: classification.strategyId,
        operatorId,
        name: proposal.name || `Source ${sourceId.slice(0, 6)}`,
        kind: safeKind,
        family,
        content: proposal.content,
        summary: proposal.summary || undefined,
        pillarSource: proposal.pillarSource,
        state: "DRAFT",
        metadata: {
          sourceDataSourceId: sourceId,
          classifierConfidence: proposal.confidence,
          classifierInferredBy: proposal.inferredBy,
          ...(proposal.sourceCitation ? { sourceCitation: proposal.sourceCitation } : {}),
          ...(source?.fileName ? { sourceFileName: source.fileName } : {}),
          ...(source?.fileType ? { sourceFileType: source.fileType } : {}),
        },
      });
      brandAssetIds.push(asset.id);
      // Asset-tagger fills pillarTags multi-pillar (non-blocking).
      void tagAsset(asset.id).catch((err: unknown) => {
        console.warn(
          "[source-classifier] tagAsset failed (non-blocking):",
          err instanceof Error ? err.message : err,
        );
      });
    } catch (err) {
      console.warn(
        `[source-classifier] createBrandAsset failed for proposal ${proposal.kind}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { ...classification, brandAssetIds };
}

// ── Helpers ──────────────────────────────────────────────────────────

function isImageType(fileType: string | null, mime: string | null): boolean {
  if (mime?.startsWith("image/")) return true;
  if (!fileType) return false;
  return /^(svg|png|jpg|jpeg|webp|gif|img)$/i.test(fileType);
}

function inferMimeType(fileType: string | null, sourceType: string | null): string | null {
  if (!fileType) return sourceType === "URL" ? "text/html" : null;
  const ft = fileType.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    img: "image/jpeg",
    json: "application/json",
  };
  return map[ft] ?? null;
}

function guessFamily(
  kind: BrandAssetKind,
): "INTELLECTUAL" | "MATERIAL" | "HYBRID" {
  // V1: classifier persists INTELLECTUAL DRAFTs only — operator promotes
  // visual kinds to MATERIAL via a separate fileUrl upload step (cockpit
  // assets page or brand-vault.supersede). Visual kinds get HYBRID so the
  // UI can show the "needs file upload" affordance.
  const visualKinds: ReadonlySet<BrandAssetKind> = new Set([
    "LOGO_FINAL",
    "KV_VISUAL",
    "VIDEO_SPOT",
    "AUDIO_JINGLE",
    "PACKAGING_LAYOUT",
    "OOH_LAYOUT",
    "STORYBOARD",
  ]);
  if (visualKinds.has(kind)) return "HYBRID";
  return "INTELLECTUAL";
}

function heuristicSummary(kind: BrandAssetKind, fileName: string | null): string {
  const base = fileName ? `${fileName} → ` : "";
  switch (kind) {
    case "MANIFESTO":
      return `${base}déclaration de mission identifiée par le filtreur.`;
    case "POSITIONING":
      return `${base}énoncé de positionnement détecté.`;
    case "TONE_CHARTER":
      return `${base}charte tonale extraite.`;
    case "PERSONA":
      return `${base}description de persona / cible.`;
    case "CHROMATIC_STRATEGY":
      return `${base}palette / système chromatique.`;
    case "TYPOGRAPHY_SYSTEM":
      return `${base}système typographique.`;
    case "LOGO_FINAL":
      return `${base}logo final identifié.`;
    case "LOGO_IDEA":
      return `${base}idée de logo / variante.`;
    case "BIG_IDEA":
      return `${base}grande idée stratégique.`;
    case "PITCH":
      return `${base}deck de pitch / présentation commerciale.`;
    default:
      return `${base}source classée ${kind} par heuristique.`;
  }
}
