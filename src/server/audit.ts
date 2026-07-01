import type { Prisma, PrismaClient, AuditLog } from "@prisma/client";
import { getDb } from "@/lib/db";
import { computeSelfHash } from "./audit-hash";

/**
 * AuditLog hash-chaîné — l'unique trace d'audit du produit (remplace le bus
 * Intents legacy : une table, ~30 lignes, requêtable). Doctrine REBUILD-PLAN §4 :
 * toute mutation métier = 1 service + 1 ligne AuditLog via `logAudit`.
 *
 * Chaîne PAR WORKSPACE (workspaceId null = chaîne « système » : bootstrap,
 * leads publics…). La ligne N pointe le selfHash de la ligne N-1 → toute
 * altération a posteriori est détectable en re-déroulant la chaîne.
 */

export type AuditEntry = {
  workspaceId?: string | null;
  actorId?: string | null;
  action: string; // ex: user.register, pillar.amend, payment.approve
  entity?: string | null;
  entityId?: string | null;
  payload?: Prisma.InputJsonValue;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Écrit une ligne d'audit chaînée. Passer `tx` pour l'inscrire dans la même
 * transaction que la mutation qu'elle trace (atomicité mutation ⇄ audit).
 *
 * Limite assumée V1 : deux écritures strictement concurrentes sur le même
 * workspace peuvent lire le même prevHash (pas de verrou sérialisant) — la
 * chaîne fourche mais rien n'est perdu ni falsifiable ; l'ordre `createdAt`
 * reste la vérité de lecture.
 */
export async function logAudit(entry: AuditEntry, tx?: DbClient): Promise<AuditLog> {
  const db = tx ?? getDb();
  const workspaceId = entry.workspaceId ?? null;

  const last = await db.auditLog.findFirst({
    where: { workspaceId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { selfHash: true },
  });
  const prevHash = last?.selfHash ?? null;

  const selfHash = computeSelfHash(prevHash, {
    workspaceId,
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
    payload: entry.payload === undefined ? null : entry.payload,
  });

  return db.auditLog.create({
    data: {
      workspaceId,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      payload: entry.payload,
      prevHash,
      selfHash,
    },
  });
}
