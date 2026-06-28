/**
 * Escrow arbitration — tRPC router (ADR-0116).
 *
 * Interface d'arbitrage du séquestre Guilde, réservée aux ARBITRES UPgraders.
 * Lecture = file d'arbitrage (adminProcedure) ; mutations gouvernées (`emitIntent`)
 * + garde arbitre explicite : libérer / rembourser / valider conditions / litige.
 * Zéro LLM.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import * as escrow from "@/server/services/escrow-arbitration";
/* lafusee:governed-active */

/** Seuls les ARBITRES UPgraders (ADMIN) arbitrent un séquestre. */
function assertArbiter(ctx: { session: { user: { role: string } } }) {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Arbitrage réservé aux agents UPgraders." });
  }
}

export const escrowArbitrationRouter = createTRPCRouter({
  /** File d'arbitrage : escrows (filtrable par statut) + conditions + mission. */
  list: adminProcedure
    .input(z.object({ status: z.enum(["HELD", "RELEASED", "DISPUTED", "REFUNDED"]).optional() }).optional())
    .query(async ({ input }) => {
      return escrow.listEscrows({ status: input?.status });
    }),

  /** Met les fonds d'une mission sous séquestre. */
  hold: governedProcedure({
    kind: "LEGACY_ESCROW_HOLD",
    inputSchema: z.object({
      missionId: z.string(),
      amount: z.number().positive(),
      currency: z.string().max(8).optional(),
      commissionId: z.string().optional(),
      conditions: z.array(z.string().min(1).max(300)).optional(),
    }),
    caller: "escrow:hold",
  }).mutation(async ({ ctx, input }) => {
    assertArbiter(ctx);
    return escrow.holdEscrowForMission(input);
  }),

  /** L'arbitre marque une condition remplie. */
  meetCondition: governedProcedure({
    kind: "LEGACY_ESCROW_MEET_CONDITION",
    inputSchema: z.object({ conditionId: z.string() }),
    caller: "escrow:meetCondition",
  }).mutation(async ({ ctx, input }) => {
    assertArbiter(ctx);
    return escrow.meetEscrowCondition({ conditionId: input.conditionId, verifiedBy: ctx.session.user.id });
  }),

  /** Libère le séquestre (→ payout momo PENDING). `force` outrepasse les conditions. */
  release: governedProcedure({
    kind: "LEGACY_ESCROW_RELEASE",
    inputSchema: z.object({ escrowId: z.string(), force: z.boolean().optional(), reason: z.string().max(500).optional() }),
    caller: "escrow:release",
  }).mutation(async ({ ctx, input }) => {
    assertArbiter(ctx);
    return escrow.releaseEscrow({ escrowId: input.escrowId, arbitratedBy: ctx.session.user.id, force: input.force, reason: input.reason });
  }),

  /** Rejette le séquestre (remboursement marque). */
  refund: governedProcedure({
    kind: "LEGACY_ESCROW_REFUND",
    inputSchema: z.object({ escrowId: z.string(), reason: z.string().min(1).max(500) }),
    caller: "escrow:refund",
  }).mutation(async ({ ctx, input }) => {
    assertArbiter(ctx);
    return escrow.refundEscrow({ escrowId: input.escrowId, arbitratedBy: ctx.session.user.id, reason: input.reason });
  }),

  /** Met l'escrow en litige (file d'arbitrage). */
  dispute: governedProcedure({
    kind: "LEGACY_ESCROW_DISPUTE",
    inputSchema: z.object({ escrowId: z.string(), reason: z.string().min(1).max(500) }),
    caller: "escrow:dispute",
  }).mutation(async ({ ctx, input }) => {
    assertArbiter(ctx);
    return escrow.disputeEscrow(input);
  }),
});
