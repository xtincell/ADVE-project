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
 *
 * La santé de campagne en mode automatique agrège ce même computeRAG
 * (`computeCampaignHealth`) et se recalcule dans la transaction de chaque
 * commande tâche/reprise ; non calculable → `UNKNOWN`, jamais un vert par défaut.
 * Les éditions qui remplacent un contenu, un visuel ou une délégation exigent la
 * version lue (`expectedUpdatedAt`) : une version périmée reçoit CONFLICT.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { CampaignDeliverable, Campaign, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateTaskCode } from "@/domain/campaign-code";
import { assertCampaignScope, CampaignScopeError, type CampaignScope } from "@/server/services/operator-isolation";

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
      strategyId: intent.strategyId, operatorId: intent.operatorId,
    });
    return {
      status: "OK",
      summary: `CampaignDeliverable créé : ${deliverable.deliverableType} pour SKU ${deliverable.targetNodeId} (${deliverable.countryCode ?? "—"})`,
      tool: "campaign-deliverable.create",
      output: { id: deliverable.id, rag: deliverable.rag },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.create", err);
  }
}

export async function updateCampaignDeliverableHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const deliverable = await updateCampaignDeliverable(intent.deliverableId, intent.patches, intent);
    return {
      status: "OK",
      summary: `CampaignDeliverable ${intent.deliverableId} mis à jour (status=${deliverable.status}, rag=${deliverable.rag})`,
      tool: "campaign-deliverable.update",
      output: { id: deliverable.id, status: deliverable.status, rag: deliverable.rag },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.update", err);
  }
}

export async function deleteCampaignDeliverableHandler(intent: DeleteIntent): Promise<HandlerResult> {
  try {
    await deleteCampaignDeliverable(intent.deliverableId, intent);
    return {
      status: "OK",
      summary: `CampaignDeliverable ${intent.deliverableId} supprimé`,
      tool: "campaign-deliverable.delete",
      output: { id: intent.deliverableId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.delete", err);
  }
}

export async function overrideRagHandler(intent: OverrideRagIntent): Promise<HandlerResult> {
  try {
    const result = await overrideRag(intent);
    const automatic = result.health
      ? `retour au calcul automatique : ${result.health.signal ?? "non calculable"}`
      : `RAG override appliqué (${intent.ragOverride ?? "CLEARED"})`;
    return {
      status: "OK",
      summary: `${automatic} — ${intent.reason}`,
      tool: "campaign-deliverable.override-rag",
      output: result,
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-deliverable.override-rag", err);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Business helpers
// ──────────────────────────────────────────────────────────────────────────

export interface CreateCampaignDeliverableArgs extends CampaignScope {
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
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${args.campaignId} FOR UPDATE`;
    const campaign = await assertCampaignScope(args.campaignId, args, tx);
    const node = await tx.brandNode.findUnique({ where: { id: args.targetNodeId },
      select: { nodeKind: true, archivedAt: true, operatorId: true } });
    if (!node) throw new CampaignScopeError("NOT_FOUND", "Produit cible introuvable.");
    if (node.operatorId !== args.operatorId) throw new CampaignScopeError("FORBIDDEN", "Ce produit relève d’une autre équipe.");
    if (node.archivedAt || !["SKU", "PRODUCT_VARIANT", "STANDALONE_BRAND"].includes(node.nodeKind)) {
      throw new CampaignScopeError("BAD_REQUEST", "Le livrable doit cibler un produit actif compatible.");
    }
    let taskCode: string | null = null;
    if (campaign.code) {
      if (await tx.campaign.count({ where: { code: campaign.code, id: { not: campaign.id } } })) {
        throw new CampaignScopeError("CONFLICT", "Code de campagne partagé : qualifier les identités avant de numéroter une tâche.");
      }
      const tasks = await tx.campaignDeliverable.findMany({ where: { campaignId: campaign.id }, select: { taskCode: true } });
      let maxIndex = tasks.length;
      for (const task of tasks) {
        if (task.taskCode?.startsWith(`${campaign.code}.`)) {
          const suffix = task.taskCode.slice(campaign.code.length + 1);
          const index = /^[0-9]+$/.test(suffix) ? Number(suffix) : NaN;
          if (!Number.isSafeInteger(index) || index < 1 || index >= Number.MAX_SAFE_INTEGER) {
            throw new CampaignScopeError("CONFLICT", "Numérotation des tâches à qualifier.");
          }
          maxIndex = Math.max(maxIndex, index);
        }
      }
      taskCode = generateTaskCode(campaign.code, maxIndex + 1);
    }
    const rag = computeRAG({ status: "TODO", dueDate: args.dueDate, deliveredAt: null, manualOverride: null });
    const created = await tx.campaignDeliverable.create({ data: {
      campaignId: args.campaignId, targetNodeId: args.targetNodeId, taskCode,
      countryCode: args.countryCode, clusterTag: args.clusterTag, deliverableType: args.deliverableType,
      language: args.language, promoTag: args.promoTag, status: "TODO", rag,
      dueDate: args.dueDate, notes: args.notes,
    } });
    await refreshCampaignHealth(tx, campaign.id);
    return created;
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Version lue — contrôle optimiste par updatedAt (même règle que le portefeuille)
// ──────────────────────────────────────────────────────────────────────────

/** Scope d'une édition : marque/équipe déclarées + version lue de la ligne modifiée. */
export interface VersionedCampaignScope extends CampaignScope {
  /** `updatedAt` ISO de la ligne lue par l'éditeur ; une version périmée reçoit CONFLICT. */
  expectedUpdatedAt?: string | null;
}

/**
 * Compare la version lue à la ligne verrouillée. Requise dès que l'édition remplace un
 * contenu, un rattachement ou une délégation ; facultative pour une simple transition
 * de statut, qui reste sérialisée sous le même verrou.
 */
export function assertReadVersion(current: Date, expected: string | null | undefined,
  required: boolean, messages: { missing: string; stale: string }): void {
  if (expected == null || expected === "") {
    if (required) throw new CampaignScopeError("CONFLICT", messages.missing);
    return;
  }
  const at = Date.parse(expected);
  if (!Number.isFinite(at)) throw new CampaignScopeError("BAD_REQUEST", "Version lue illisible : relisez la fiche.");
  if (current.getTime() !== at) throw new CampaignScopeError("CONFLICT", messages.stale);
}

/** Version suivante strictement croissante, même pour deux écritures dans la même milliseconde. */
export function nextVersion(current: Date): Date {
  return new Date(Math.max(Date.now(), current.getTime() + 1));
}

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DELIVERED", "VALIDATED"];
/** Champs dont le remplacement exige la version lue (contenu, rattachement d'actif, délégation). */
const VERSIONED_TASK_FIELDS = ["dueDate", "deliveredAt", "validatedAt", "notes", "brandAssetId", "delegatedToOperatorId"];
const TASK_DATE_FIELDS = ["dueDate", "deliveredAt", "validatedAt"];
const TASK_VERSION_MESSAGES = {
  missing: "Relisez la tâche avant de modifier son contenu, son visuel ou sa délégation : sa version est requise.",
  stale: "La tâche a été modifiée depuis votre lecture : relisez-la avant d’enregistrer.",
};

export async function updateCampaignDeliverable(
  deliverableId: string,
  patches: UpdateIntent["patches"],
  scope: VersionedCampaignScope,
): Promise<CampaignDeliverable> {
  const allowedKeys = ["status", ...VERSIONED_TASK_FIELDS];
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patches)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Field "${key}" is immutable or unknown for OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE. Allowed: ${allowedKeys.join(", ")}`);
    }
    if (value === undefined) continue;
    if (key === "status" && (typeof value !== "string" || !TASK_STATUSES.includes(value))) {
      throw new CampaignScopeError("BAD_REQUEST", "Statut de tâche inconnu.");
    }
    if (TASK_DATE_FIELDS.includes(key) && value !== null) {
      const date = new Date(value as string);
      if (typeof value !== "string" || !Number.isFinite(date.getTime())) throw new CampaignScopeError("BAD_REQUEST", "Date de tâche illisible.");
      data[key] = date;
    } else {
      data[key] = value;
    }
  }
  const versioned = Object.keys(data).some(key => VERSIONED_TASK_FIELDS.includes(key));

  return db.$transaction(async tx => {
    // Same row lock as the change requests: concurrent edits, attachments, transfers
    // and deletion of one task are applied one after the other, never interleaved.
    await tx.$queryRaw`SELECT "id" FROM "CampaignDeliverable" WHERE "id" = ${deliverableId} FOR UPDATE`;
    const existing = await tx.campaignDeliverable.findUnique({ where: { id: deliverableId } });
    if (!existing) throw new CampaignScopeError("NOT_FOUND", "Livrable introuvable.");
    const campaign = await assertCampaignScope(existing.campaignId, scope, tx);
    if (typeof data.brandAssetId === "string") {
      const asset = await tx.brandAsset.findUnique({ where: { id: data.brandAssetId }, select: { strategyId: true } });
      if (!asset) throw new CampaignScopeError("NOT_FOUND", "Visuel introuvable.");
      if (asset.strategyId !== campaign.strategyId) {
        throw new CampaignScopeError("FORBIDDEN", "Ce visuel relève d’une autre marque que la campagne.");
      }
    }
    if (typeof data.delegatedToOperatorId === "string" && !await tx.operator.findUnique({
      where: { id: data.delegatedToOperatorId }, select: { id: true },
    })) throw new CampaignScopeError("NOT_FOUND", "Agence de délégation introuvable.");
    assertReadVersion(existing.updatedAt, scope.expectedUpdatedAt, versioned, TASK_VERSION_MESSAGES);

    const next = { ...existing, ...data } as CampaignDeliverable;
    // A manual task status keeps its stored health; otherwise recompute it from the final row.
    const rag = existing.manualRagOverride ? existing.rag : computeRAG({
      status: next.status, dueDate: next.dueDate, deliveredAt: next.deliveredAt, manualOverride: null,
    });
    const updated = await tx.campaignDeliverable.update({
      where: { id: deliverableId },
      data: { ...(data as Prisma.CampaignDeliverableUncheckedUpdateInput), rag, updatedAt: nextVersion(existing.updatedAt) },
    });
    await refreshCampaignHealth(tx, existing.campaignId);
    return updated;
  });
}

export async function deleteCampaignDeliverable(deliverableId: string, scope: CampaignScope): Promise<void> {
  await db.$transaction(async tx => {
    // Locked like an edit: an asset attached concurrently is seen before deletion.
    await tx.$queryRaw`SELECT "id" FROM "CampaignDeliverable" WHERE "id" = ${deliverableId} FOR UPDATE`;
    const existing = await tx.campaignDeliverable.findUnique({ where: { id: deliverableId }, select: {
      id: true, campaignId: true, brandAssetId: true, _count: { select: { changeRequests: true } },
    } });
    if (!existing) throw new CampaignScopeError("NOT_FOUND", "Livrable introuvable.");
    await assertCampaignScope(existing.campaignId, scope, tx);
    if (existing.brandAssetId) {
      throw new CampaignScopeError("CONFLICT", "Un visuel est rattaché à cette tâche : passez par le cycle de vie de l’actif plutôt que par une suppression.");
    }
    if (existing._count.changeRequests > 0) {
      throw new CampaignScopeError("CONFLICT", "Cette tâche porte des reprises : elle est conservée avec leur historique.");
    }
    await tx.campaignDeliverable.delete({ where: { id: deliverableId } });
    await refreshCampaignHealth(tx, existing.campaignId);
  });
}

export interface OverrideRagResult {
  kind: "campaign" | "deliverable";
  id: string;
  rag: string | null;
  /** Retour d'une campagne au calcul automatique : résultat du calcul, calculable ou non. */
  health?: CampaignHealth;
}

export async function overrideRag(intent: OverrideRagIntent): Promise<OverrideRagResult> {
  const hasCampaign = intent.campaignId != null;
  const hasDeliverable = intent.deliverableId != null;
  if (hasCampaign === hasDeliverable) {
    throw new Error(`OPERATOR_OVERRIDE_RAG : exactement l'un de campaignId / deliverableId doit être non-null`);
  }

  if (hasCampaign && intent.campaignId) {
    const campaignId = intent.campaignId;
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${campaignId} FOR UPDATE`;
      await assertCampaignScope(campaignId, intent, tx);
      if (intent.ragOverride !== null) {
        const updated = await tx.campaign.update({
          where: { id: campaignId },
          data: { manualRagOverride: intent.ragOverride, healthSignal: intent.ragOverride },
          select: { id: true, manualRagOverride: true },
        });
        return { kind: "campaign" as const, id: updated.id, rag: updated.manualRagOverride };
      }
      // Back to automatic: the existing task calculation decides, or says it cannot.
      await tx.campaign.update({ where: { id: campaignId }, data: { manualRagOverride: null } });
      const health = await refreshCampaignHealth(tx, campaignId);
      if (!health) throw new Error("Campaign health refresh skipped after clearing its manual status");
      return { kind: "campaign" as const, id: campaignId, rag: null, health };
    });
  }

  // Deliverable
  const deliverableId = intent.deliverableId!;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "CampaignDeliverable" WHERE "id" = ${deliverableId} FOR UPDATE`;
    const existing = await tx.campaignDeliverable.findUnique({ where: { id: deliverableId } });
    if (!existing) throw new CampaignScopeError("NOT_FOUND", "Livrable introuvable.");
    await assertCampaignScope(existing.campaignId, intent, tx);
    const rag = computeRAG({ status: existing.status, dueDate: existing.dueDate,
      deliveredAt: existing.deliveredAt, manualOverride: intent.ragOverride });
    const updated = await tx.campaignDeliverable.update({
      where: { id: deliverableId },
      data: { manualRagOverride: intent.ragOverride, rag, updatedAt: nextVersion(existing.updatedAt) },
      select: { id: true, manualRagOverride: true },
    });
    await refreshCampaignHealth(tx, existing.campaignId);
    return { kind: "deliverable" as const, id: updated.id, rag: updated.manualRagOverride };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// computeRAG — helper transversal CampaignDeliverable + Campaign
// ──────────────────────────────────────────────────────────────────────────

export interface ComputeRAGInput {
  status: string; // TODO | IN_PROGRESS | DELIVERED | VALIDATED  (deliverable)
  dueDate: Date | null;
  deliveredAt: Date | null;
  manualOverride: string | null;
  blockerCount?: number; // si > 0 → AMBER au minimum
  /** Date de référence injectable (déterminisme des calculs et des tests). */
  now?: Date;
}

/**
 * Calcul RAG GREEN/AMBER/RED depuis status + deadline proximity + blockers.
 *
 * Règles :
 * - Si manualOverride non-null → retourner manualOverride (court-circuit)
 * - Si VALIDATED → GREEN
 * - Si dueDate passée et status != VALIDATED/DELIVERED → RED
 * - Si dueDate à moins de 3 jours (ou passée et DELIVERED) → AMBER
 * - Si blockerCount > 0 → AMBER au minimum
 * - Sinon → GREEN (le calcul de campagne ne compte ce vert que s'il repose sur une preuve)
 */
export function computeRAG(input: ComputeRAGInput): string {
  if (input.manualOverride) return input.manualOverride;
  if (input.status === "VALIDATED") return "GREEN";

  const now = input.now ?? new Date();
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
// Santé automatique de campagne — agrégat déterministe de computeRAG
// ──────────────────────────────────────────────────────────────────────────

export type CampaignHealthSignal = "GREEN" | "AMBER" | "RED";
/** Valeur stockée dans Campaign.healthSignal quand le calcul automatique n'est pas possible. */
export const CAMPAIGN_HEALTH_UNKNOWN = "UNKNOWN";
/** Reprises qui bloquent encore leur tâche. */
export const OPEN_CHANGE_REQUEST_STATUSES = ["PENDING", "IN_PROGRESS", "ESCALATED"] as const;

export interface CampaignHealthTask {
  status: string;
  dueDate: Date | null;
  deliveredAt: Date | null;
  manualRagOverride: string | null;
  /** Reprises ouvertes (PENDING / IN_PROGRESS / ESCALATED) de cette tâche. */
  openChangeRequests: number;
}
export interface CampaignHealthInput {
  tasks: CampaignHealthTask[];
  isCritical: boolean;
  /** CreativeProductionStatus de la campagne (BLOQUE = production bloquée). */
  creativeState: string;
  now?: Date;
}
export type CampaignHealth =
  | { calculable: true; signal: CampaignHealthSignal; reasons: string[] }
  | { calculable: false; signal: null; reasons: string[] };

const HEALTH_SEVERITY: Record<CampaignHealthSignal, number> = { GREEN: 0, AMBER: 1, RED: 2 };
const isHealthSignal = (value: string): value is CampaignHealthSignal => value in HEALTH_SEVERITY;
const tasksLabel = (count: number) => `${count} tâche${count > 1 ? "s" : ""}`;

/**
 * Santé d'une campagne, sans modèle ni valeur inventée :
 * 1. sans tâche, la santé n'est pas calculable ;
 * 2. chaque tâche passe par computeRAG (son statut manuel s'il existe), ses reprises ouvertes comptant comme blocages ;
 * 3. une tâche ni validée, ni livrée, sans échéance ni statut manuel et sans signal n'est pas mesurable ;
 * 4. la campagne prend la pire santé des tâches ; campagne critique ou production bloquée : au moins orange, les deux : rouge ;
 * 5. un vert n'est rendu que si toutes les tâches sont mesurables ; sinon la santé n'est pas calculable.
 */
export function computeCampaignHealth(input: CampaignHealthInput): CampaignHealth {
  if (input.tasks.length === 0) {
    return { calculable: false, signal: null, reasons: ["Aucune tâche : la santé de la campagne n’est pas calculable."] };
  }
  const now = input.now ?? new Date();
  let worst: CampaignHealthSignal = "GREEN";
  const raise = (signal: CampaignHealthSignal) => { if (HEALTH_SEVERITY[signal] > HEALTH_SEVERITY[worst]) worst = signal; };
  let late = 0, close = 0, blocked = 0, manual = 0, unmeasured = 0;
  for (const task of input.tasks) {
    const rag = computeRAG({ status: task.status, dueDate: task.dueDate, deliveredAt: task.deliveredAt,
      manualOverride: task.manualRagOverride, blockerCount: task.openChangeRequests, now });
    if (!isHealthSignal(rag)) { unmeasured++; continue; }
    const evidence = task.manualRagOverride != null || task.status === "VALIDATED" || task.status === "DELIVERED"
      || task.dueDate != null || rag !== "GREEN";
    if (!evidence) { unmeasured++; continue; }
    if (task.manualRagOverride != null) manual++;
    else if (rag === "RED") late++;
    else if (rag === "AMBER") { if (task.openChangeRequests > 0) blocked++; else close++; }
    raise(rag);
  }
  const reasons: string[] = [];
  if (late) reasons.push(`${tasksLabel(late)} en retard.`);
  if (close) reasons.push(`${tasksLabel(close)} à échéance dans moins de trois jours.`);
  if (blocked) reasons.push(`${tasksLabel(blocked)} avec une reprise ouverte.`);
  if (manual) reasons.push(`${tasksLabel(manual)} au statut fixé manuellement.`);
  const stalled = input.creativeState === "BLOQUE";
  if (input.isCritical && stalled) { raise("RED"); reasons.push("Campagne critique et production bloquée."); }
  else if (input.isCritical) { raise("AMBER"); reasons.push("Campagne marquée critique."); }
  else if (stalled) { raise("AMBER"); reasons.push("Production bloquée."); }
  if (unmeasured) reasons.push(`${tasksLabel(unmeasured)} sans échéance, livraison ni statut manuel : santé non mesurée.`);
  if (worst === "GREEN" && unmeasured) {
    return { calculable: false, signal: null, reasons: [...reasons, "Un état sain ne peut pas être affirmé."] };
  }
  return { calculable: true, signal: worst, reasons };
}

/**
 * Recalcule et enregistre la santé d'une campagne en mode automatique, dans la
 * transaction appelante. Une campagne au statut manuel n'est pas modifiée (null).
 * Non calculable → `UNKNOWN`, jamais un vert par défaut.
 */
export async function refreshCampaignHealth(tx: Prisma.TransactionClient, campaignId: string,
  now: Date = new Date()): Promise<CampaignHealth | null> {
  // Serializes concurrent refreshes without blocking inserts of child rows.
  await tx.$queryRaw`SELECT "id" FROM "Campaign" WHERE "id" = ${campaignId} FOR NO KEY UPDATE`;
  const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: {
    manualRagOverride: true, healthSignal: true, isCritical: true, creativeState: true,
  } });
  if (!campaign || campaign.manualRagOverride) return null;
  const rows = await tx.campaignDeliverable.findMany({ where: { campaignId }, select: {
    status: true, dueDate: true, deliveredAt: true, manualRagOverride: true,
    _count: { select: { changeRequests: { where: { status: { in: [...OPEN_CHANGE_REQUEST_STATUSES] } } } } },
  } });
  const health = computeCampaignHealth({
    tasks: rows.map(row => ({ status: row.status, dueDate: row.dueDate, deliveredAt: row.deliveredAt,
      manualRagOverride: row.manualRagOverride, openChangeRequests: row._count.changeRequests })),
    isCritical: campaign.isCritical, creativeState: campaign.creativeState, now,
  });
  const signal = health.signal ?? CAMPAIGN_HEALTH_UNKNOWN;
  if (signal !== campaign.healthSignal) await tx.campaign.update({ where: { id: campaignId }, data: { healthSignal: signal } });
  return health;
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

function vetoed(tool: string, error: unknown): HandlerResult {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: error instanceof CampaignScopeError ? error.code : classifyError(msg),
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
