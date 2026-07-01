/**
 * CampaignDeliverable matrice 6D — service handlers (Phase 18, ADR-0059).
 *
 * 4 handlers Mestor + helper `computeRAG()` :
 * - createCampaignDeliverableHandler — OPERATOR_CREATE_CAMPAIGN_DELIVERABLE
 * - updateCampaignDeliverableHandler — OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE
 * - deleteCampaignDeliverableHandler — OPERATOR_DELETE_CAMPAIGN_DELIVERABLE
 * - overrideRagHandler              — OPERATOR_OVERRIDE_RAG
 *
 * Le RAG (GREEN/AMBER/RED) est **calculé automatiquement** depuis
 * status × deadline_proximity × blockers, **sauf** si `manualRagOverride`
 * est non-null (forcé par opérateur).
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { CampaignDeliverable, Campaign, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

type CreateIntent = Extract<Intent, { kind: "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE" }>;
type UpdateIntent = Extract<Intent, { kind: "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE" }>;
type DeleteIntent = Extract<Intent, { kind: "OPERATOR_DELETE_CAMPAIGN_DELIVERABLE" }>;
type OverrideRagIntent = Extract<Intent, { kind: "OPERATOR_OVERRIDE_RAG" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;

// ──────────────────────────────────────────────────────────────────────────
// Intent handlers
// ──────────────────────────────────────────────────────────────────────────

export async function createCampaignDeliverableHandler(intent: CreateIntent): Promise<HandlerResult> {
  try {
    const deliverable = await createCampaignDeliverable({
      campaignId: intent.campaignId,
      targetNodeId: intent.targetNodeId,
      countryCode: intent.countryCode ?? null,
      clusterTag: intent.clusterTag ?? null,
      deliverableType: intent.deliverableType,
      language: intent.language ?? "FR",
      promoTag: intent.promoTag ?? null,
      dueDate: intent.dueDate ? new Date(intent.dueDate) : null,
      notes: intent.notes ?? null,
    });
    return {
      status: "OK",
      summary: `CampaignDeliverable créé : ${deliverable.deliverableType} pour SKU ${deliverable.targetNodeId} (${deliverable.countryCode ?? "—"})`,
      tool: "campaign-deliverable.create",
      output: { id: deliverable.id, rag: deliverable.rag },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.create", err instanceof Error ? err.message : String(err));
  }
}

export async function updateCampaignDeliverableHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const deliverable = await updateCampaignDeliverable(intent.deliverableId, intent.patches);
    return {
      status: "OK",
      summary: `CampaignDeliverable ${intent.deliverableId} mis à jour (status=${deliverable.status}, rag=${deliverable.rag})`,
      tool: "campaign-deliverable.update",
      output: { id: deliverable.id, status: deliverable.status, rag: deliverable.rag },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.update", err instanceof Error ? err.message : String(err));
  }
}

export async function deleteCampaignDeliverableHandler(intent: DeleteIntent): Promise<HandlerResult> {
  try {
    await deleteCampaignDeliverable(intent.deliverableId);
    return {
      status: "OK",
      summary: `CampaignDeliverable ${intent.deliverableId} supprimé`,
      tool: "campaign-deliverable.delete",
      output: { id: intent.deliverableId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.delete", err instanceof Error ? err.message : String(err));
  }
}

export async function overrideRagHandler(intent: OverrideRagIntent): Promise<HandlerResult> {
  try {
    const result = await overrideRag(intent);
    return {
      status: "OK",
      summary: `RAG override appliqué (${intent.ragOverride ?? "CLEARED"}) — ${intent.reason}`,
      tool: "campaign-deliverable.override-rag",
      output: result,
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.override-rag", err instanceof Error ? err.message : String(err));
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Business helpers
// ──────────────────────────────────────────────────────────────────────────

export interface CreateCampaignDeliverableArgs {
  campaignId: string;
  targetNodeId: string;
  countryCode: string | null;
  clusterTag: string | null;
  deliverableType: string;
  language: string;
  promoTag: string | null;
  dueDate: Date | null;
  notes: string | null;
}

export async function createCampaignDeliverable(args: CreateCampaignDeliverableArgs): Promise<CampaignDeliverable> {
  // Verify campaign and target node exist
  const [campaign, node] = await Promise.all([
    db.campaign.findUnique({ where: { id: args.campaignId }, select: { id: true } }),
    db.brandNode.findUnique({
      where: { id: args.targetNodeId },
      select: { id: true, nodeKind: true, archivedAt: true },
    }),
  ]);
  if (!campaign) throw new Error(`Campaign ${args.campaignId} not found`);
  if (!node) throw new Error(`Target BrandNode ${args.targetNodeId} not found`);
  if (node.archivedAt) throw new Error(`Target BrandNode ${args.targetNodeId} is archived`);

  // Anti-drift CI test campaign-deliverable-matrix.test.ts vérifiera ça aussi côté DB.
  // Ici on protège runtime : un deliverable ne peut cibler qu'un SKU ou PRODUCT_VARIANT
  // (ou STANDALONE_BRAND fallback pendant la phase de transition Phase 18-A0).
  const allowedKinds = ["SKU", "PRODUCT_VARIANT", "STANDALONE_BRAND"];
  if (!allowedKinds.includes(node.nodeKind)) {
    throw new Error(
      `Target BrandNode ${args.targetNodeId} has nodeKind="${node.nodeKind}" — deliverables doivent cibler SKU ou PRODUCT_VARIANT (ou STANDALONE_BRAND legacy).`,
    );
  }

  const created = await db.campaignDeliverable.create({
    data: {
      campaignId: args.campaignId,
      targetNodeId: args.targetNodeId,
      countryCode: args.countryCode,
      clusterTag: args.clusterTag,
      deliverableType: args.deliverableType,
      language: args.language,
      promoTag: args.promoTag,
      status: "TODO",
      rag: "GREEN", // initial GREEN, recomputed if dueDate proche / status changed
      dueDate: args.dueDate,
      notes: args.notes,
    },
  });

  // Recompute RAG après création (cas où dueDate déjà serrée à l'import)
  const computed = computeRAG({
    status: created.status,
    dueDate: created.dueDate,
    deliveredAt: created.deliveredAt,
    manualOverride: created.manualRagOverride,
  });
  if (computed !== created.rag) {
    return db.campaignDeliverable.update({ where: { id: created.id }, data: { rag: computed } });
  }
  return created;
}

export async function updateCampaignDeliverable(
  deliverableId: string,
  patches: UpdateIntent["patches"],
): Promise<CampaignDeliverable> {
  const existing = await db.campaignDeliverable.findUnique({ where: { id: deliverableId } });
  if (!existing) throw new Error(`CampaignDeliverable ${deliverableId} not found`);

  const allowedKeys = ["status", "dueDate", "deliveredAt", "validatedAt", "notes", "brandAssetId", "delegatedToOperatorId"];
  const data: Prisma.CampaignDeliverableUpdateInput = {};
  for (const [key, value] of Object.entries(patches)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Field "${key}" is immutable or unknown for OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE. Allowed: ${allowedKeys.join(", ")}`);
    }
    if ((key === "dueDate" || key === "deliveredAt" || key === "validatedAt") && typeof value === "string") {
      (data as Record<string, unknown>)[key] = new Date(value);
    } else {
      (data as Record<string, unknown>)[key] = value;
    }
  }

  // Auto-recompute RAG sauf manualRagOverride non-null
  const updated = await db.campaignDeliverable.update({ where: { id: deliverableId }, data });
  if (!updated.manualRagOverride) {
    const newRag = computeRAG({
      status: updated.status,
      dueDate: updated.dueDate,
      deliveredAt: updated.deliveredAt,
      manualOverride: null,
    });
    if (newRag !== updated.rag) {
      return db.campaignDeliverable.update({ where: { id: deliverableId }, data: { rag: newRag } });
    }
  }
  return updated;
}

export async function deleteCampaignDeliverable(deliverableId: string): Promise<void> {
  const existing = await db.campaignDeliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, brandAssetId: true },
  });
  if (!existing) throw new Error(`CampaignDeliverable ${deliverableId} not found`);
  if (existing.brandAssetId) {
    throw new Error(
      `CampaignDeliverable ${deliverableId} a brandAssetId=${existing.brandAssetId} — utiliser cascade BrandAsset (asset versioning), pas delete direct.`,
    );
  }
  await db.campaignDeliverable.delete({ where: { id: deliverableId } });
}

export async function overrideRag(intent: OverrideRagIntent): Promise<{ kind: "campaign" | "deliverable"; id: string; rag: string | null }> {
  const hasCampaign = intent.campaignId != null;
  const hasDeliverable = intent.deliverableId != null;
  if (hasCampaign === hasDeliverable) {
    throw new Error(`OPERATOR_OVERRIDE_RAG : exactement l'un de campaignId / deliverableId doit être non-null`);
  }

  if (hasCampaign && intent.campaignId) {
    const updated = await db.campaign.update({
      where: { id: intent.campaignId },
      data: { manualRagOverride: intent.ragOverride, healthSignal: intent.ragOverride ?? "GREEN" },
      select: { id: true, manualRagOverride: true },
    });
    return { kind: "campaign", id: updated.id, rag: updated.manualRagOverride };
  }

  // Deliverable
  const deliverableId = intent.deliverableId!;
  const updated = await db.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { manualRagOverride: intent.ragOverride, rag: intent.ragOverride ?? "GREEN" },
    select: { id: true, manualRagOverride: true },
  });
  return { kind: "deliverable", id: updated.id, rag: updated.manualRagOverride };
}

// ──────────────────────────────────────────────────────────────────────────
// computeRAG — helper transversal CampaignDeliverable + Campaign
// ──────────────────────────────────────────────────────────────────────────

export interface ComputeRAGInput {
  status: string; // TODO | IN_PROGRESS | DELIVERED | VALIDATED  (deliverable)
  // ou pour Campaign : creativeState/clientState concaténés
  dueDate: Date | null;
  deliveredAt: Date | null;
  manualOverride: string | null;
  blockerCount?: number; // si > 0 → AMBER au minimum
}

/**
 * Calcul RAG GREEN/AMBER/RED depuis status + deadline proximity + blockers.
 *
 * Règles :
 * - Si manualOverride non-null → retourner manualOverride (court-circuit)
 * - Si VALIDATED → GREEN
 * - Si DELIVERED ou IN_PROGRESS et dueDate dans > 7 jours futur → GREEN
 * - Si dueDate dans 0-3 jours futur → AMBER
 * - Si dueDate passée et status != VALIDATED/DELIVERED → RED
 * - Si blockerCount > 0 → AMBER au minimum
 */
export function computeRAG(input: ComputeRAGInput): string {
  if (input.manualOverride) return input.manualOverride;
  if (input.status === "VALIDATED") return "GREEN";

  const now = new Date();
  const due = input.dueDate;

  if (due) {
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0 && input.status !== "DELIVERED") return "RED"; // overdue
    if (diffDays < 3) return "AMBER"; // serré
  }

  if ((input.blockerCount ?? 0) > 0) return "AMBER";
  return "GREEN";
}

// ──────────────────────────────────────────────────────────────────────────
// Read helpers
// ──────────────────────────────────────────────────────────────────────────

export async function listDeliverablesForCampaign(campaignId: string): Promise<CampaignDeliverable[]> {
  return db.campaignDeliverable.findMany({
    where: { campaignId },
    orderBy: [{ rag: "asc" }, { dueDate: "asc" }],
  });
}

export async function listDeliverablesForOperator(args: {
  operatorId: string;
  countryCodes?: string[];
  clusterTags?: string[];
  status?: string[];
  rag?: string[];
}): Promise<(CampaignDeliverable & { campaign: Pick<Campaign, "id" | "name" | "strategyId"> })[]> {
  const where: Prisma.CampaignDeliverableWhereInput = {
    campaign: {
      strategy: {
        operatorId: args.operatorId,
      },
    },
  };
  if (args.countryCodes?.length) where.countryCode = { in: args.countryCodes };
  if (args.clusterTags?.length) where.clusterTag = { in: args.clusterTags };
  if (args.status?.length) where.status = { in: args.status };
  if (args.rag?.length) where.rag = { in: args.rag };

  return db.campaignDeliverable.findMany({
    where,
    include: { campaign: { select: { id: true, name: true, strategyId: true } } },
    orderBy: [{ rag: "asc" }, { dueDate: "asc" }],
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Internal
// ──────────────────────────────────────────────────────────────────────────

function vetoed(tool: string, msg: string): HandlerResult {
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: classifyError(msg),
    estimatedCost: ZERO_COST,
  };
}

function classifyError(msg: string): string {
  if (msg.includes("not found")) return "NOT_FOUND";
  if (msg.includes("archived")) return "ARCHIVED_PRECONDITION";
  if (msg.includes("nodeKind")) return "INVALID_TARGET_NODE_KIND";
  if (msg.includes("immutable")) return "IMMUTABLE_FIELD";
  if (msg.includes("brandAssetId")) return "HAS_BRAND_ASSET_USE_CASCADE";
  if (msg.includes("exactement l'un")) return "AMBIGUOUS_OVERRIDE_TARGET";
  return "VALIDATION_FAILED";
}
