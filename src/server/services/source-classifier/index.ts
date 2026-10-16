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

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { resolveBrandSource, assertCurrentSourceReceipts, type SourceReceipt } from "@/server/services/ingestion-pipeline/source-usage";
import { createBrandAsset } from "@/server/services/brand-vault/engine";
import { tagAsset } from "@/server/services/asset-tagger";
import { isBrandAssetKind, type BrandAssetKind } from "@/domain/brand-asset-kinds";
import { classifyByHeuristic } from "./mime-heuristics";
import { decomposeDocument, classifyImage } from "./llm-decomposer";
import { inferPillarSource } from "./pillar-mapping";
import type { SourceClassificationProposal } from "./types";

const VISION_CONFIDENCE_THRESHOLD = 0.7;
// A source hash alone cannot validate proposals made by an older reader.
const CLASSIFIER_REVISION = "full-document-citations-v2";

export interface ClassifierResult {
  sourceId: string;
  sourceReceipt: SourceReceipt;
  strategyId: string;
  proposals: SourceClassificationProposal[];
  durationMs: number;
}

export interface VaultProposalResult extends ClassifierResult {
  /** BrandAsset.id values for the DRAFTs persisted in the vault. */
  brandAssetIds: string[];
  alreadyFresh: boolean;
}

/**
 * Classify a single BrandDataSource into N proposals (no DB writes).
 * Returns proposals in confidence-descending order.
 */
export async function classifySource(sourceId: string, strategyId?: string): Promise<ClassifierResult> {
  const t0 = Date.now();
  const resolved = await resolveBrandSource(sourceId, strategyId);
  const { source, consumerStrategyId } = resolved;
  const sourceReceipt = { sourceId, contentHash: resolved.contentHash };
  if (source.processingStatus !== "EXTRACTED" && source.processingStatus !== "PROCESSED") {
    throw new Error("SOURCE_NOT_READY: le texte du document doit être extrait avant son analyse.");
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
          strategyId: consumerStrategyId,
        });
        if (visionProposal && visionProposal.confidence > heuristic.confidence) {
          proposals.unshift(visionProposal);
        }
      }
    }

    return finalize(source.id, consumerStrategyId, proposals, t0, sourceReceipt);
  }

  // ── Document / text path ─────────────────────────────────────
  const content = source.rawContent ?? "";
  if (!content.trim()) {
    throw new Error("SOURCE_NOT_READY: ce document ne contient pas de texte lisible.");
  }

  // File-level suggestion remains explicit; it never stands for a failed reading.
  proposals.push({
    kind: heuristic.kind,
    name: source.fileName ?? `Source ${source.id.slice(0, 6)}`,
    summary: heuristicSummary(heuristic.kind, source.fileName),
    confidence: heuristic.confidence,
    content: { extracted: content.slice(0, 600) },
    pillarSource: inferPillarSource(heuristic.kind),
    inferredBy: "heuristic",
  });

  const decomposed = await decomposeDocument({
    rawContent: content,
    fileName: source.fileName,
    mimeType,
    fileType: source.fileType,
    strategyId: consumerStrategyId,
  });
  const sectionKinds = new Set(decomposed.map((p) => p.kind));
  // A detailed reading replaces the file-level guess of that kind, not its peers.
  if (sectionKinds.has(heuristic.kind)) proposals.length = 0;
  for (const proposal of decomposed) {
    const existingIdx = proposals.findIndex((p) => p.inferredBy === "decomposer"
      && p.kind === proposal.kind && p.name.normalize("NFKC").toLocaleLowerCase("fr") === proposal.name.normalize("NFKC").toLocaleLowerCase("fr")
      && p.sourceCitation?.charStart === proposal.sourceCitation?.charStart
      && p.sourceCitation?.charEnd === proposal.sourceCitation?.charEnd);
    if (existingIdx < 0) proposals.push(proposal);
    else if (proposal.confidence > proposals[existingIdx]!.confidence) proposals[existingIdx] = proposal;
  }

  return finalize(source.id, consumerStrategyId, proposals, t0, sourceReceipt);
}

function finalize(
  sourceId: string,
  strategyId: string,
  proposals: SourceClassificationProposal[],
  t0: number,
  sourceReceipt: SourceReceipt,
): ClassifierResult {
  proposals.sort((a, b) => b.confidence - a.confidence);
  return { sourceId, sourceReceipt, strategyId, proposals, durationMs: Date.now() - t0 };
}

/**
 * Run the classifier and persist the proposals as BrandAsset(state=DRAFT).
 * The operator reviews them in the cockpit Propositions vault panel.
 */
export async function proposeBrandAssetsFromSource(
  sourceId: string,
  _actorId: string,
  strategyId?: string,
): Promise<VaultProposalResult> {
  const t0 = Date.now();
  const resolved = await resolveBrandSource(sourceId, strategyId);
  if (!["EXTRACTED", "PROCESSED"].includes(resolved.source.processingStatus)) {
    throw new Error("SOURCE_NOT_READY: le texte du document doit être extrait avant son analyse.");
  }
  const sourceReceipt = { sourceId, contentHash: resolved.contentHash };
  const cached = currentBatch(await db.brandAsset.findMany({
    where: { strategyId: resolved.consumerStrategyId, staleAt: null,
      metadata: { path: ["sourceDataSourceId"], equals: sourceId } },
    select: { id: true, metadata: true },
  }), sourceReceipt);
  if (cached) {
    await assertCurrentSourceReceipts(db, resolved.consumerStrategyId, [sourceReceipt]);
    return {
      sourceId, strategyId: resolved.consumerStrategyId, sourceReceipt, proposals: [],
      brandAssetIds: cached, durationMs: Date.now() - t0, alreadyFresh: true,
    };
  }
  const classification = await classifySource(sourceId, strategyId);
  const batchHash = createHash("sha256").update(JSON.stringify({
    revision: CLASSIFIER_REVISION, sourceReceipt: classification.sourceReceipt,
    proposals: classification.proposals,
  })).digest("hex");
  const persisted = await db.$transaction(async (tx) => {
    // An old in-flight classification cannot retire current proposals or write stale ones.
    await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${sourceId} FOR UPDATE`;
    await assertCurrentSourceReceipts(tx, classification.strategyId, [classification.sourceReceipt]);
    const { source } = await resolveBrandSource(sourceId, classification.strategyId, tx);
    // Preserve decisions AND superseded drafts for inspection; retries are idempotent.
    const existing = await tx.brandAsset.findMany({ where: {
      strategyId: classification.strategyId, metadata: { path: ["sourceDataSourceId"], equals: sourceId },
      staleAt: null,
    }, select: { id: true, metadata: true } });
    const current = currentBatch(existing, classification.sourceReceipt);
    if (current) return { ids: current, alreadyFresh: true };
    // The triggering user is recorded on the intent; asset ownership comes from
    // the consuming brand, including when the source is shared by another brand.
    const owner = await tx.strategy.findUniqueOrThrow({
      where: { id: classification.strategyId }, select: { operatorId: true },
    });
    await tx.brandAsset.updateMany({ where: {
      strategyId: classification.strategyId, state: "DRAFT", metadata: { path: ["sourceDataSourceId"], equals: sourceId },
    }, data: { state: "SUPERSEDED" } });
    const ids: string[] = [];
    for (const [proposalIndex, proposal] of classification.proposals.entries()) {
      const kind: BrandAssetKind = isBrandAssetKind(proposal.kind) ? proposal.kind : "GENERIC";
      const asset = await createBrandAsset({
        strategyId: classification.strategyId, operatorId: owner.operatorId,
        name: proposal.name || `Source ${sourceId.slice(0, 6)}`, kind, family: guessFamily(kind),
        content: proposal.content, summary: proposal.summary || undefined, pillarSource: proposal.pillarSource,
        state: "DRAFT", metadata: {
          sourceDataSourceId: sourceId, sourceContentHash: classification.sourceReceipt.contentHash,
          classifierConfidence: proposal.confidence, classifierInferredBy: proposal.inferredBy,
          classifierRevision: CLASSIFIER_REVISION, classifierBatchHash: batchHash,
          classifierProposalCount: classification.proposals.length,
          classifierProposalIndex: proposalIndex,
          ...(proposal.sourceCitation ? { sourceCitation: proposal.sourceCitation } : {}),
          sourceFileName: source.fileName, sourceFileType: source.fileType,
        },
      }, tx);
      ids.push(asset.id);
    }
    return { ids, alreadyFresh: false };
  }, { timeout: 60_000 }); // Whole batch, including every source guard; no model call holds these locks.
  // Never launch a worker against uncommitted rows.
  for (const id of persisted.alreadyFresh ? [] : persisted.ids) void tagAsset(id).catch((err: unknown) => {
    console.warn("[source-classifier] tagAsset failed:", err instanceof Error ? err.message : err);
  });
  return { ...classification, brandAssetIds: persisted.ids, alreadyFresh: persisted.alreadyFresh };
}

/** Only a whole, versioned atomic batch may suppress another model call. */
function currentBatch(
  assets: Array<{ id: string; metadata: unknown }>, receipt: SourceReceipt,
): string[] | null {
  const batches = new Map<string, { expected: number; ids: Map<number, string> }>();
  for (const asset of assets) {
    const meta = asset.metadata as Record<string, unknown> | null;
    if (meta?.sourceDataSourceId !== receipt.sourceId || meta.sourceContentHash !== receipt.contentHash
      || meta.classifierRevision !== CLASSIFIER_REVISION
      || typeof meta.classifierBatchHash !== "string" || !/^[a-f0-9]{64}$/.test(meta.classifierBatchHash)
      || typeof meta.classifierProposalCount !== "number" || !Number.isSafeInteger(meta.classifierProposalCount)
      || meta.classifierProposalCount < 1
      || typeof meta.classifierProposalIndex !== "number" || !Number.isSafeInteger(meta.classifierProposalIndex)
      || meta.classifierProposalIndex < 0 || meta.classifierProposalIndex >= meta.classifierProposalCount) continue;
    const batch = batches.get(meta.classifierBatchHash) ?? { expected: meta.classifierProposalCount, ids: new Map<number, string>() };
    if (batch.expected !== meta.classifierProposalCount) return null;
    if (batch.ids.has(meta.classifierProposalIndex) && batch.ids.get(meta.classifierProposalIndex) !== asset.id) return null;
    batch.ids.set(meta.classifierProposalIndex, asset.id);
    batches.set(meta.classifierBatchHash, batch);
  }
  for (const batch of batches.values()) if (batch.ids.size === batch.expected
    && new Set(batch.ids.values()).size === batch.expected) {
    return [...batch.ids].sort(([a], [b]) => a - b).map(([, id]) => id);
  }
  return null;
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
