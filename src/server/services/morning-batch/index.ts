/**
 * Morning Brief Batch service (Phase 18-A1-δ, ADR-0055).
 *
 * 7 handlers Mestor (5 LLM-augmented + 2 manual-first) :
 *
 * **Workflow LLM (préview → review → confirm)** :
 * 1. previewBatchHandler — splitter heuristique + extractor + brand-resolver tree-aware
 *    → MorningBriefBatch + IngestedSource[] + BriefIngestionDraft[]
 * 2. persistDraftsHandler — sauvegarde explicite (post review/edit UI)
 * 3. updateDraftFieldsHandler — édition manuelle d'un draft pendant review
 * 4. requestReanalysisHandler — re-trigger LLM extraction sur 1 source (fine-tune)
 * 5. confirmBatchHandler — matérialise drafts ACCEPTED|EDITED → Campaign + CampaignBrief
 *    (lien provenance via CampaignBrief.sourceIngestedId)
 *
 * **Workflow manuel (Manual-first parity ADR-0053)** :
 * 6. createIngestedSourceHandler — opérateur saisit une source à la main sans LLM
 * 7. createBriefDraftHandler — opérateur saisit un brief draft à la main sans LLM
 */

import type {
  Intent,
  IntentResult,
} from "@/server/services/mestor/intents";
import type {
  IngestedSource,
  MorningBriefBatch,
  BriefIngestionDraft,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { splitInboundBatch } from "./splitter";
import { extractFromSource } from "./extractor";
import { resolveBrandPathFromText } from "./brand-resolver-tree";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost">;

type PreviewIntent = Extract<Intent, { kind: "MORNING_BRIEF_BATCH_PREVIEW" }>;
type PersistIntent = Extract<Intent, { kind: "BRIEF_BATCH_PERSIST_DRAFTS" }>;
type UpdateDraftIntent = Extract<Intent, { kind: "BRIEF_DRAFT_UPDATE_FIELDS" }>;
type ReanalysisIntent = Extract<Intent, { kind: "BRIEF_DRAFT_REQUEST_REANALYSIS" }>;
type ConfirmIntent = Extract<Intent, { kind: "MORNING_BRIEF_BATCH_CONFIRM" }>;
type CreateSourceIntent = Extract<Intent, { kind: "OPERATOR_CREATE_INGESTED_SOURCE" }>;
type CreateDraftIntent = Extract<Intent, { kind: "OPERATOR_CREATE_BRIEF_DRAFT" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;
function costOf(usd: number): { amount: number; currency: string } {
  return { amount: usd, currency: "USD" };
}

function vetoed(tool: string, msg: string): HandlerResult {
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: msg.includes("not found") ? "NOT_FOUND" : "VALIDATION_FAILED",
    estimatedCost: ZERO_COST,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. previewBatchHandler — split + extract + resolve
// ─────────────────────────────────────────────────────────────────────

export async function previewBatchHandler(intent: PreviewIntent): Promise<HandlerResult> {
  try {
    const result = await previewBatch({
      operatorId: intent.operatorId,
      rawInput: intent.rawInput,
    });
    return {
      status: "OK",
      summary: `Batch ${result.batch.id} : ${result.sourceCount} sources extraites, ${result.draftCount} briefs candidats`,
      tool: "morning-batch.preview",
      output: { batchId: result.batch.id, sourceCount: result.sourceCount, draftCount: result.draftCount },
      estimatedCost: costOf(result.estimatedCostUsd),
    };
  } catch (err) {
    return vetoed("morning-batch.preview", err instanceof Error ? err.message : String(err));
  }
}

export async function previewBatch(args: {
  operatorId: string;
  rawInput: string;
}): Promise<{
  batch: MorningBriefBatch;
  sourceCount: number;
  draftCount: number;
  estimatedCostUsd: number;
}> {
  const operator = await db.operator.findUnique({ where: { id: args.operatorId }, select: { id: true } });
  if (!operator) throw new Error(`Operator ${args.operatorId} not found`);

  // 1. Créer le batch en état ANALYZING
  const batch = await db.morningBriefBatch.create({
    data: {
      operatorId: args.operatorId,
      rawInput: args.rawInput,
      state: "ANALYZING",
    },
  });

  // 2. Split le blob en sources discrètes
  const rawSources = splitInboundBatch(args.rawInput);

  // 3. Pour chaque source : créer IngestedSource + 1 BriefIngestionDraft (extractor heuristique)
  const drafts: BriefIngestionDraft[] = [];
  let totalConfidence = 0;
  for (const raw of rawSources) {
    const source = await db.ingestedSource.create({
      data: {
        operatorId: args.operatorId,
        kind: raw.kind,
        externalId: raw.externalId ?? null,
        sourceUrl: raw.sourceUrl ?? null,
        sender: raw.sender ?? null,
        subject: raw.subject ?? null,
        rawSnippet: raw.rawText.slice(0, 8000), // safety cap
        threadKey: raw.threadKey ?? null,
        language: raw.language ?? null,
      },
    });

    const extracted = extractFromSource(raw);
    const resolved = await resolveBrandPathFromText({
      operatorId: args.operatorId,
      rawText: raw.rawText,
    });

    const draft = await db.briefIngestionDraft.create({
      data: {
        batchId: batch.id,
        sourceId: source.id,
        classification: extracted.classification,
        classificationReason: extracted.classificationReason,
        resolvedNodeId: resolved.nodeId,
        resolvedNodePath: resolved.nodePath,
        resolvedCampaignId: resolved.campaignId,
        resolvedCampaignName: resolved.campaignName,
        payload: extracted.payload as unknown as Prisma.InputJsonValue,
        confidence: Math.max(extracted.confidence, resolved.confidence),
        state: "PENDING_REVIEW",
      },
    });
    drafts.push(draft);
    totalConfidence += draft.confidence;
  }

  // 4. Update batch state + stats
  const updated = await db.morningBriefBatch.update({
    where: { id: batch.id },
    data: {
      state: "READY_FOR_REVIEW",
      sourceCount: rawSources.length,
      briefCount: drafts.length,
      llmConfidenceMean: drafts.length > 0 ? totalConfidence / drafts.length : 0,
      llmTotalTokens: 0, // pas de LLM appelé en MVP heuristique
      llmCostUsd: 0,
    },
  });

  return { batch: updated, sourceCount: rawSources.length, draftCount: drafts.length, estimatedCostUsd: 0 };
}

// ─────────────────────────────────────────────────────────────────────
// 2-4. persistDraftsHandler / updateDraftFieldsHandler / requestReanalysisHandler
// ─────────────────────────────────────────────────────────────────────

export async function persistDraftsHandler(intent: PersistIntent): Promise<HandlerResult> {
  // No-op : drafts sont déjà persistés par previewBatchHandler. Cette capability
  // existe pour symétrie API + audit chain (re-persist depuis client si dirty state).
  return {
    status: "OK",
    summary: `Batch ${intent.batchId} drafts déjà persistés (no-op)`,
    tool: "morning-batch.persist",
    output: { batchId: intent.batchId },
    estimatedCost: ZERO_COST,
  };
}

export async function updateDraftFieldsHandler(intent: UpdateDraftIntent): Promise<HandlerResult> {
  try {
    const draft = await db.briefIngestionDraft.update({
      where: { id: intent.draftId },
      data: {
        classification: intent.classification ?? undefined,
        resolvedNodeId: intent.resolvedNodeId === null ? null : intent.resolvedNodeId ?? undefined,
        resolvedNodePath: intent.resolvedNodePath ?? undefined,
        resolvedCampaignId: intent.resolvedCampaignId === null ? null : intent.resolvedCampaignId ?? undefined,
        payload: intent.payload === undefined ? undefined : (intent.payload as Prisma.InputJsonValue),
        state: intent.state ?? "EDITED",
        reviewedBy: intent.operatorId,
        reviewedAt: new Date(),
        reviewNotes: intent.reviewNotes ?? undefined,
      },
    });
    return {
      status: "OK",
      summary: `Draft ${draft.id} mis à jour (state=${draft.state})`,
      tool: "morning-batch.update-draft",
      output: { id: draft.id, state: draft.state },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("morning-batch.update-draft", err instanceof Error ? err.message : String(err));
  }
}

export async function requestReanalysisHandler(intent: ReanalysisIntent): Promise<HandlerResult> {
  try {
    const draft = await db.briefIngestionDraft.findUnique({
      where: { id: intent.draftId },
      include: { source: true },
    });
    if (!draft) throw new Error(`Draft ${intent.draftId} not found`);

    // Re-extract heuristique depuis la source (pas de LLM en MVP)
    const extracted = extractFromSource({
      kind: draft.source.kind,
      sender: draft.source.sender,
      subject: draft.source.subject,
      rawText: draft.source.rawSnippet,
      threadKey: draft.source.threadKey,
      language: draft.source.language,
    });
    const resolved = await resolveBrandPathFromText({
      operatorId: draft.source.operatorId,
      rawText: draft.source.rawSnippet,
    });

    const updated = await db.briefIngestionDraft.update({
      where: { id: intent.draftId },
      data: {
        classification: extracted.classification,
        classificationReason: extracted.classificationReason,
        resolvedNodeId: resolved.nodeId,
        resolvedNodePath: resolved.nodePath,
        resolvedCampaignId: resolved.campaignId,
        resolvedCampaignName: resolved.campaignName,
        payload: extracted.payload as unknown as Prisma.InputJsonValue,
        confidence: Math.max(extracted.confidence, resolved.confidence),
        state: "PENDING_REVIEW",
      },
    });
    return {
      status: "OK",
      summary: `Draft ${updated.id} re-analysé (confidence=${updated.confidence.toFixed(2)})`,
      tool: "morning-batch.reanalyze",
      output: { id: updated.id, confidence: updated.confidence },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("morning-batch.reanalyze", err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5. confirmBatchHandler — matérialisation Campaign+Brief depuis drafts ACCEPTED
// ─────────────────────────────────────────────────────────────────────

export async function confirmBatchHandler(intent: ConfirmIntent): Promise<HandlerResult> {
  try {
    const result = await confirmBatch({
      operatorId: intent.operatorId,
      batchId: intent.batchId,
      draftIds: intent.draftIds,
    });
    return {
      status: "OK",
      summary: `Batch ${intent.batchId} confirmé : ${result.materialized} drafts matérialisés (${result.newCampaigns} nouvelles campaigns, ${result.newBriefs} briefs)`,
      tool: "morning-batch.confirm",
      output: result,
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("morning-batch.confirm", err instanceof Error ? err.message : String(err));
  }
}

interface ConfirmResult {
  materialized: number;
  newCampaigns: number;
  newBriefs: number;
  skipped: number;
}

async function confirmBatch(args: {
  operatorId: string;
  batchId: string;
  draftIds: string[];
}): Promise<ConfirmResult> {
  const drafts = await db.briefIngestionDraft.findMany({
    where: { id: { in: args.draftIds }, batchId: args.batchId },
    include: { source: true },
  });

  let materialized = 0;
  let newCampaigns = 0;
  let newBriefs = 0;
  let skipped = 0;

  for (const draft of drafts) {
    if (draft.state !== "ACCEPTED" && draft.state !== "EDITED") {
      skipped++;
      continue;
    }

    // NON_BRIEF / OPS_ACTION → pas de Campaign/Brief, juste flag MATERIALIZED
    if (draft.classification === "NON_BRIEF") {
      await db.briefIngestionDraft.update({
        where: { id: draft.id },
        data: { state: "MATERIALIZED", materializedAt: new Date(), reviewedBy: args.operatorId },
      });
      materialized++;
      continue;
    }
    if (draft.classification === "OPS_ACTION") {
      // Crée OperatorAction (Phase 18-A1-γ)
      const payload = draft.payload as { title?: string; summary?: string };
      await db.operatorAction.create({
        data: {
          operatorId: args.operatorId,
          label: payload.title ?? "Action depuis Morning Brief Batch",
          context: payload.summary ?? draft.source.rawSnippet.slice(0, 500),
          priority: "MOYENNE",
          category: "FOLLOWUPS",
          source: draft.source.kind === "EMAIL" ? "GMAIL" : draft.source.kind === "SLACK" ? "SLACK" : draft.source.kind === "WHATSAPP" ? "WHATSAPP" : "OTHER",
          done: false,
        },
      });
      await db.briefIngestionDraft.update({
        where: { id: draft.id },
        data: { state: "MATERIALIZED", materializedAt: new Date(), reviewedBy: args.operatorId },
      });
      materialized++;
      continue;
    }

    // NEW_BRIEF / UPDATE_OF_BRIEF / AMBIGUOUS-validated → matérialiser Campaign + CampaignBrief
    if (!draft.resolvedNodeId) {
      // Pas de node résolu → on skip (le draft devrait être REJECTED par l'opérateur sinon)
      skipped++;
      continue;
    }

    let campaignId = draft.resolvedCampaignId;
    if (!campaignId && draft.classification === "NEW_BRIEF") {
      // Trouver la Strategy via BrandNode résolu
      const node = await db.brandNode.findUnique({
        where: { id: draft.resolvedNodeId },
        select: { strategyId: true, name: true },
      });
      if (node?.strategyId) {
        const payload = draft.payload as { title?: string };
        const newCampaign = await db.campaign.create({
          data: {
            name: payload.title ?? "Campaign depuis Morning Brief Batch",
            strategyId: node.strategyId,
            creativeState: "BRIEF_RECU",
            clientState: "PENDING",
            status: "ACTIVE",
            state: "BRIEF_DRAFT",
          },
        });
        campaignId = newCampaign.id;
        newCampaigns++;
      }
    }

    if (campaignId) {
      const payload = draft.payload as { title?: string; summary?: string; briefType?: string };
      await db.campaignBrief.create({
        data: {
          campaignId,
          title: payload.title ?? "Brief depuis Morning Brief Batch",
          content: { summary: payload.summary ?? "", source: "morning-batch" } as unknown as Prisma.InputJsonValue,
          briefType: payload.briefType ?? null,
          status: "DRAFT",
          generatedBy: "morning-batch",
          sourceIngestedId: draft.sourceId,
        },
      });
      newBriefs++;
    }

    await db.briefIngestionDraft.update({
      where: { id: draft.id },
      data: {
        state: "MATERIALIZED",
        materializedAt: new Date(),
        reviewedBy: args.operatorId,
      },
    });
    materialized++;
  }

  // Update batch state
  const remaining = await db.briefIngestionDraft.count({
    where: { batchId: args.batchId, state: { in: ["PENDING_REVIEW", "ACCEPTED", "EDITED"] } },
  });
  await db.morningBriefBatch.update({
    where: { id: args.batchId },
    data: {
      state: remaining === 0 ? "FULLY_VALIDATED" : "PARTIAL_VALIDATED",
      completedAt: remaining === 0 ? new Date() : null,
    },
  });

  return { materialized, newCampaigns, newBriefs, skipped };
}

// ─────────────────────────────────────────────────────────────────────
// 6-7. Manual-first parity (ADR-0053)
// ─────────────────────────────────────────────────────────────────────

export async function createIngestedSourceHandler(intent: CreateSourceIntent): Promise<HandlerResult> {
  try {
    const source = await db.ingestedSource.create({
      data: {
        operatorId: intent.operatorId,
        kind: intent.sourceKind ?? "MANUAL_PASTE",
        externalId: intent.externalId ?? null,
        sourceUrl: intent.sourceUrl ?? null,
        sender: intent.sender ?? null,
        subject: intent.subject ?? null,
        rawSnippet: intent.rawSnippet,
        language: intent.language ?? null,
      },
    });
    return {
      status: "OK",
      summary: `IngestedSource créée manuellement (kind=${source.kind})`,
      tool: "morning-batch.create-source-manual",
      output: { id: source.id },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("morning-batch.create-source-manual", err instanceof Error ? err.message : String(err));
  }
}

export async function createBriefDraftHandler(intent: CreateDraftIntent): Promise<HandlerResult> {
  try {
    const draft = await db.briefIngestionDraft.create({
      data: {
        batchId: intent.batchId,
        sourceId: intent.sourceId,
        classification: intent.classification,
        resolvedNodeId: intent.resolvedNodeId ?? null,
        resolvedNodePath: intent.resolvedNodePath ?? [],
        payload: intent.payload as unknown as Prisma.InputJsonValue,
        confidence: 1.0, // saisie manuelle = full confidence
        state: "EDITED", // direct EDITED car manuel
      },
    });
    return {
      status: "OK",
      summary: `BriefIngestionDraft créé manuellement`,
      tool: "morning-batch.create-draft-manual",
      output: { id: draft.id },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("morning-batch.create-draft-manual", err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────────────

export async function getBatch(batchId: string) {
  return db.morningBriefBatch.findUnique({
    where: { id: batchId },
    include: {
      drafts: { include: { source: true }, orderBy: { extractedAt: "asc" } },
    },
  });
}

export async function listBatchesForOperator(operatorId: string, limit = 20) {
  return db.morningBriefBatch.findMany({
    where: { operatorId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { _count: { select: { drafts: true } } },
  });
}

export async function listIngestedSourcesForOperator(operatorId: string, limit = 50): Promise<IngestedSource[]> {
  return db.ingestedSource.findMany({
    where: { operatorId },
    orderBy: { ingestedAt: "desc" },
    take: limit,
  });
}
