/**
 * ADR-0131 — Firewall d'écriture des collaborateurs délégués (Layer 2).
 *
 * Un StrategyCollaborator ACTIVE (ADR-0129) traverse `canAccessStrategy` en
 * LECTURE ; sans ce firewall, chaque mutation gouvernée strategy-scopée lui
 * serait aussi ouverte (sur-délégation silencieuse). Ici : l'utilisateur qui
 * n'est ni owner, ni ADMIN, ni opérateur de la marque ne peut émettre que
 * les kinds catalogués pour SA zone métier (domaine
 * `collaborator-access.ts`) — DENY par défaut, veto audité.
 */

import { db } from "@/lib/db";
import {
  collaboratorCanWrite,
  collaboratorZoneForKind,
} from "@/domain/collaborator-access";

export class CollaboratorWriteVetoError extends Error {
  constructor(
    public readonly kind: string,
    public readonly role: string,
  ) {
    super(
      "Votre rôle sur cette marque est en lecture seule pour cette action — elle reste tenue par l'équipe de la marque.",
    );
    this.name = "CollaboratorWriteVetoError";
  }
}

/**
 * Lève CollaboratorWriteVetoError si `userId` n'agit sur `strategyId` QUE
 * par délégation et que `kind` sort de ses zones d'écriture. No-op pour
 * owner / ADMIN / opérateur de la marque / non-membres (ces derniers sont
 * refusés plus loin par les gardes d'accès existantes).
 */
export async function assertCollaboratorMayEmit(params: {
  userId: string | null | undefined;
  role: string | null | undefined;
  strategyId: string | null | undefined;
  kind: string;
}): Promise<void> {
  const { userId, role, strategyId, kind } = params;
  if (!userId || !strategyId || strategyId === "(none)") return;
  if (role === "ADMIN") return;

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { userId: true, operatorId: true, client: { select: { operatorId: true } } },
  });
  if (!strategy) return; // l'inexistence est gérée par la garde d'accès aval
  if (strategy.userId === userId) return; // owner

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { operatorId: true },
  });
  if (
    user?.operatorId &&
    (user.operatorId === strategy.operatorId || user.operatorId === strategy.client?.operatorId)
  ) {
    return; // staff opérateur de la marque
  }

  const collab = await db.strategyCollaborator.findUnique({
    where: { strategyId_userId: { strategyId, userId } },
    select: { status: true, role: true },
  });
  if (collab?.status !== "ACTIVE") return; // pas collaborateur → gardes d'accès aval

  const zone = collaboratorZoneForKind(kind);
  if (zone && collaboratorCanWrite(String(collab.role), zone)) return;

  throw new CollaboratorWriteVetoError(kind, String(collab.role));
}
