import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_NAMES } from "@/lib/types/advertis-vector";
import type { Prisma } from "@prisma/client";
import { validateCrossReferences, type CrossRefValidation } from "@/server/services/cross-validator";
import * as auditTrail from "@/server/services/audit-trail";

import { PILLAR_STORAGE_KEYS } from "@/domain";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalType =
  | "DELIVERABLE"
  | "BRIEF"
  | "CAMPAIGN"
  | "BUDGET"
  | "STRATEGY";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalRecord {
  id: string;
  type: ApprovalType;
  entityId: string;
  requesterId: string;
  status: ApprovalStatus;
  approverId: string | null;
  notes: string | null;
  reason: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface ApprovalCheck {
  pillar: PillarKey;
  pillarName: string;
  score: number;
  isConform: boolean;
  issues: string[];
}

export interface ApprovalResult {
  approved: boolean;
  overallScore: number;
  checks: ApprovalCheck[];
  recommendation: string;
}

// ---------------------------------------------------------------------------
// We store approval workflow records as Process entries with type TRIGGERED
// and a well-known name prefix "approval::" so they can be queried.
// The playbook JSON field holds the approval metadata.
// ---------------------------------------------------------------------------

const APPROVAL_PREFIX = "approval::";

function makeProcessName(type: ApprovalType, entityId: string): string {
  return `${APPROVAL_PREFIX}${type}::${entityId}`;
}

// ---------------------------------------------------------------------------
// requestApproval — Create an approval request
// ---------------------------------------------------------------------------

export interface CrossValidationBlockResult {
  blocked: true;
  violations: CrossRefValidation[];
  message: string;
}

export async function requestApproval(
  type: ApprovalType,
  entityId: string,
  requesterId: string
): Promise<ApprovalRecord | CrossValidationBlockResult> {
  // Resolve strategyId from the entity if possible
  const strategyId = await resolveStrategyId(type, entityId);

  // -----------------------------------------------------------------------
  // Cross-validation gate for STRATEGY and CAMPAIGN approvals
  // -----------------------------------------------------------------------
  if ((type === "STRATEGY" || type === "CAMPAIGN") && strategyId) {
    const validations = await validateCrossReferences(strategyId);
    const criticalViolations = validations.filter((v) => v.status === "INVALID");

    if (criticalViolations.length > 0) {
      return {
        blocked: true,
        violations: criticalViolations,
        message: `Approval blocked: ${criticalViolations.length} critical cross-pillar violation(s) detected. ${criticalViolations.map((v) => `[Rule ${v.ruleId}] ${v.rule}: ${v.message}`).join("; ")}`,
      };
    }
  }

  const process = await db.process.create({
    data: {
      type: "TRIGGERED",
      name: makeProcessName(type, entityId),
      description: `Approval request: ${type} for ${entityId}`,
      status: "RUNNING",
      priority: type === "BUDGET" ? 10 : type === "STRATEGY" ? 8 : 5,
      assigneeId: requesterId,
      strategyId,
      playbook: {
        approvalType: type,
        entityId,
        requesterId,
        status: "PENDING",
        approverId: null,
        notes: null,
        reason: null,
        requestedAt: new Date().toISOString(),
        resolvedAt: null,
      } as Prisma.InputJsonValue,
    },
  });

  return processToApprovalRecord(process);
}

// ---------------------------------------------------------------------------
// approve — Approve a pending request
// ---------------------------------------------------------------------------

export async function approve(
  approvalId: string,
  approverId: string,
  notes?: string
): Promise<ApprovalRecord> {
  const process = await db.process.findUniqueOrThrow({
    where: { id: approvalId },
  });

  const playbook = process.playbook as Record<string, unknown>;
  if (playbook.status !== "PENDING") {
    throw new Error(
      `Approval ${approvalId} is already ${playbook.status as string}`
    );
  }

  const updated = await db.process.update({
    where: { id: approvalId },
    data: {
      status: "COMPLETED",
      playbook: {
        ...playbook,
        status: "APPROVED",
        approverId,
        notes: notes ?? null,
        resolvedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  // Side-effect: update the entity status if applicable
  await onApprovalResolved(updated, "APPROVED");

  // Audit trail (non-blocking)
  auditTrail.log({
    userId: approverId,
    action: "APPROVE",
    entityType: playbook.approvalType as string,
    entityId: playbook.entityId as string,
    oldValue: { status: "PENDING" },
    newValue: { status: "APPROVED", notes: notes ?? null },
  }).catch((err) => { console.warn("[audit-trail] approval log failed:", err instanceof Error ? err.message : err); });

  return processToApprovalRecord(updated);
}

// ---------------------------------------------------------------------------
// reject — Reject a pending request
// ---------------------------------------------------------------------------

export async function reject(
  approvalId: string,
  approverId: string,
  reason: string
): Promise<ApprovalRecord> {
  const process = await db.process.findUniqueOrThrow({
    where: { id: approvalId },
  });

  const playbook = process.playbook as Record<string, unknown>;
  if (playbook.status !== "PENDING") {
    throw new Error(
      `Approval ${approvalId} is already ${playbook.status as string}`
    );
  }

  const updated = await db.process.update({
    where: { id: approvalId },
    data: {
      status: "STOPPED",
      playbook: {
        ...playbook,
        status: "REJECTED",
        approverId,
        reason,
        resolvedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  await onApprovalResolved(updated, "REJECTED");

  // Audit trail (non-blocking)
  auditTrail.log({
    userId: approverId,
    action: "REJECT",
    entityType: playbook.approvalType as string,
    entityId: playbook.entityId as string,
    oldValue: { status: "PENDING" },
    newValue: { status: "REJECTED", reason },
  }).catch((err) => { console.warn("[audit-trail] rejection log failed:", err instanceof Error ? err.message : err); });

  return processToApprovalRecord(updated);
}

// ---------------------------------------------------------------------------
// getMyPendingApprovals — List all pending approvals for a user
// ---------------------------------------------------------------------------

export async function getMyPendingApprovals(
  userId: string
): Promise<ApprovalRecord[]> {
  // Pending approvals are Process entries with status RUNNING and the approval prefix.
  // A user sees approvals they requested OR that are assigned to them.
  const processes = await db.process.findMany({
    where: {
      name: { startsWith: APPROVAL_PREFIX },
      status: "RUNNING",
      OR: [
        { assigneeId: userId },
        // Also match if requesterId in playbook matches
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter further by checking playbook for requesterId or approver assignment
  return processes
    .filter((p) => {
      const playbook = p.playbook as Record<string, unknown>;
      return (
        playbook.status === "PENDING" &&
        (p.assigneeId === userId || playbook.requesterId === userId)
      );
    })
    .map(processToApprovalRecord);
}

// ---------------------------------------------------------------------------
// getApprovalHistory — Get the full approval chain for an entity
// ---------------------------------------------------------------------------

export async function getApprovalHistory(
  entityId: string
): Promise<ApprovalRecord[]> {
  const processes = await db.process.findMany({
    where: {
      name: { contains: `::${entityId}` },
    },
    orderBy: { createdAt: "desc" },
  });

  return processes
    .filter((p) => p.name.startsWith(APPROVAL_PREFIX))
    .map(processToApprovalRecord);
}

// ---------------------------------------------------------------------------
// checkAdveConformity — Existing function: checks ADVE conformity
// ---------------------------------------------------------------------------

export async function checkAdveConformity(
  deliverableId: string
): Promise<ApprovalResult> {
  const deliverable = await db.missionDeliverable.findUniqueOrThrow({
    where: { id: deliverableId },
    include: {
      mission: {
        include: {
          strategy: { include: { pillars: true } },
          driver: true,
        },
      },
    },
  });

  const strategy = deliverable.mission.strategy;
  const driver = deliverable.mission.driver;
  const vector = strategy.advertis_vector as Record<string, number> | null;
  const driverPriority =
    (driver?.pillarPriority as Record<string, number>) ?? {};

  const checks: ApprovalCheck[] = [];
  let totalScore = 0;
  let pillarCount = 0;

  for (const key of [...PILLAR_STORAGE_KEYS] as PillarKey[]) {
    const pillarContent = strategy.pillars.find((p) => p.key === key);
    const pillarScore = vector?.[key] ?? 0;
    const priority = driverPriority[key] ?? 1;
    const issues: string[] = [];

    if (
      !pillarContent?.content ||
      Object.keys(pillarContent.content as object).length === 0
    ) {
      issues.push(
        `Pilier ${PILLAR_NAMES[key]} : contenu manquant dans la strategie`
      );
    }

    if (pillarScore < 10 && priority > 1) {
      issues.push(
        `Score ${PILLAR_NAMES[key]} faible (${pillarScore.toFixed(1)}/25) pour un canal prioritaire`
      );
    }

    const confidence = pillarContent?.confidence ?? 0;
    if (confidence < 0.5 && priority > 1) {
      issues.push(
        `Confidence faible (${(confidence * 100).toFixed(0)}%) — donnees insuffisantes`
      );
    }

    const isConform = issues.length === 0;
    const checkScore = isConform ? 10 : Math.max(0, 10 - issues.length * 3);
    totalScore += checkScore;
    pillarCount++;

    checks.push({
      pillar: key,
      pillarName: PILLAR_NAMES[key],
      score: checkScore,
      isConform,
      issues,
    });
  }

  const overallScore = pillarCount > 0 ? totalScore / pillarCount : 0;
  const approved =
    overallScore >= 7 && checks.filter((c) => !c.isConform).length <= 2;

  const nonConformPillars = checks
    .filter((c) => !c.isConform)
    .map((c) => c.pillarName);
  const recommendation = approved
    ? "Livrable conforme au protocole ADVE. Approbation recommandee."
    : `Livrable non conforme sur ${nonConformPillars.join(", ")}. Revision recommandee avant approbation.`;

  return { approved, overallScore, checks, recommendation };
}

// ---------------------------------------------------------------------------
// checkBriefConformity — Quick conformity check for a mission brief
// ---------------------------------------------------------------------------

export async function checkBriefConformity(
  missionId: string
): Promise<{ isReady: boolean; missingElements: string[] }> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: {
      strategy: { include: { pillars: true } },
      driver: true,
    },
  });

  const missingElements: string[] = [];

  if (!mission.driver) {
    missingElements.push("Aucun Driver assigne");
  }

  if (!mission.advertis_vector) {
    missingElements.push("Vecteur ADVE manquant sur la mission");
  }

  const strategyVector = mission.strategy.advertis_vector as Record<
    string,
    number
  > | null;
  if (!strategyVector || (strategyVector.confidence ?? 0) < 0.5) {
    missingElements.push(
      "Profil ADVE de la strategie incomplet (confidence < 50%)"
    );
  }

  const pillarCount = mission.strategy.pillars.length;
  if (pillarCount < 8) {
    missingElements.push(`Seulement ${pillarCount}/8 piliers documentes`);
  }

  return {
    isReady: missingElements.length === 0,
    missingElements,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function processToApprovalRecord(process: {
  id: string;
  playbook: unknown;
  createdAt: Date;
}): ApprovalRecord {
  const playbook = process.playbook as Record<string, unknown>;

  return {
    id: process.id,
    type: (playbook.approvalType as ApprovalType) ?? "DELIVERABLE",
    entityId: (playbook.entityId as string) ?? "",
    requesterId: (playbook.requesterId as string) ?? "",
    status: (playbook.status as ApprovalStatus) ?? "PENDING",
    approverId: (playbook.approverId as string) ?? null,
    notes: (playbook.notes as string) ?? null,
    reason: (playbook.reason as string) ?? null,
    requestedAt:
      (playbook.requestedAt as string) ?? process.createdAt.toISOString(),
    resolvedAt: (playbook.resolvedAt as string) ?? null,
  };
}

async function resolveStrategyId(
  type: ApprovalType,
  entityId: string
): Promise<string | null> {
  try {
    switch (type) {
      case "DELIVERABLE": {
        const d = await db.missionDeliverable.findUnique({
          where: { id: entityId },
          include: { mission: { select: { strategyId: true } } },
        });
        return d?.mission.strategyId ?? null;
      }
      case "BRIEF": {
        const m = await db.mission.findUnique({
          where: { id: entityId },
          select: { strategyId: true },
        });
        return m?.strategyId ?? null;
      }
      case "CAMPAIGN": {
        const c = await db.campaign.findUnique({
          where: { id: entityId },
          select: { strategyId: true },
        });
        return c?.strategyId ?? null;
      }
      case "STRATEGY":
        return entityId;
      case "BUDGET":
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function onApprovalResolved(
  process: { playbook: unknown },
  resolution: "APPROVED" | "REJECTED"
): Promise<void> {
  const playbook = process.playbook as Record<string, unknown>;
  const type = playbook.approvalType as ApprovalType;
  const entityId = playbook.entityId as string;

  try {
    switch (type) {
      case "DELIVERABLE": {
        await db.missionDeliverable.update({
          where: { id: entityId },
          data: {
            status: resolution === "APPROVED" ? "APPROVED" : "REVISION_NEEDED",
          },
        });
        break;
      }
      case "BRIEF": {
        await db.mission.update({
          where: { id: entityId },
          data: {
            status:
              resolution === "APPROVED" ? "READY_FOR_DISPATCH" : "DRAFT",
          },
        });
        break;
      }
      case "CAMPAIGN": {
        await db.campaign.update({
          where: { id: entityId },
          data: {
            status: resolution === "APPROVED" ? "ACTIVE" : "DRAFT",
          },
        });
        break;
      }
      case "STRATEGY": {
        await db.strategy.update({
          where: { id: entityId },
          data: {
            status: resolution === "APPROVED" ? "ACTIVE" : "DRAFT",
          },
        });
        break;
      }
      case "BUDGET":
        // Budget approvals don't have a direct model update
        break;
    }
  } catch {
    // Entity update is best-effort; approval record is the source of truth
  }
}
