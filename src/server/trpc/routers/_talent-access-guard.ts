/**
 * Garde d'accès à un TalentProfile — chokepoint round-10 (scan-entity-idor).
 *
 * Classe fermée : des lectures keyées sur un `talentProfileId` (ou `creatorId`)
 * arbitraire renvoyaient de la télémétrie de carrière PRIVÉE (tier + reco
 * PROMOTE/DEMOTE, first-pass-rate, historique d'adhésions + montants) et, pour
 * deux d'entre elles, le `payoutPhone` (PII mobile-money) — à tout compte
 * authentifié. La surface publique marketplace (`guilde.getProfile`/`list`)
 * publie DÉLIBÉRÉMENT tier + score agrégé + portfolio en omettant `payoutPhone` ;
 * ces gardes couvrent les lectures qui vont AU-DELÀ de cette surface publique.
 */
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { getOperatorContext } from "@/server/services/operator-isolation";

/** Vrai si le caller est staff UPgraders (ADMIN ou rattaché à un Operator). */
export function isStaff(opCtx: { role: string; operatorId: string | null }): boolean {
  return opCtx.role === "ADMIN" || !!opCtx.operatorId;
}

/**
 * Self (le User propriétaire du TalentProfile) OU staff. Lève FORBIDDEN sinon.
 * `talentProfileId` peut être null/undefined (self implicite non résolu) → refuse.
 */
export async function assertTalentProfileAccess(userId: string, talentProfileId: string): Promise<void> {
  const tp = await db.talentProfile.findUnique({
    where: { id: talentProfileId },
    select: { userId: true },
  });
  if (!tp) throw new TRPCError({ code: "NOT_FOUND", message: "Profil talent introuvable" });
  if (tp.userId === userId) return;
  const opCtx = await getOperatorContext(userId);
  if (isStaff(opCtx)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à ce profil talent" });
}
