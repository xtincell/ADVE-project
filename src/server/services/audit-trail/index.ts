/**
 * Audit Trail — Records all significant actions for compliance and debugging
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "APPROVE" | "REJECT" | "ESCALATE" | "EXPORT";

interface AuditEntry {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function log(entry: AuditEntry): Promise<string> {
  const log = await db.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: (entry.oldValue ?? null) as Prisma.InputJsonValue,
      newValue: (entry.newValue ?? null) as Prisma.InputJsonValue,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  });
  return log.id;
}

export async function getEntityHistory(entityType: string, entityId: string) {
  return db.auditLog.findMany({
    where: { entityType, entityId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserActivity(userId: string, limit = 50) {
  return db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRecentActivity(limit = 100) {
  return db.auditLog.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
