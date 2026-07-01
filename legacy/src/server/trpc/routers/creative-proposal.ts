/**
 * creativeProposal router — la gate de génération de production (ADR-0120).
 *
 * Lectures `protectedProcedure` ; mutations `governedProcedure` (traversent
 * `mestor.emitIntent`). `validate` est la gate : génère actions + briefs de prod
 * dans les frames canon au niveau d'exécution choisi. Voie A (IA) et Voie B (Guilde)
 * appellent `create` avec le MÊME Data Contract — seul `source` diffère.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { creativeProposalContractSchema, creativeDirectionSchema } from "@/lib/types/creative-proposal";
import { ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";

export const creativeProposalRouter = createTRPCRouter({
  listByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const { listCreativeProposalsByStrategy } = await import("@/server/services/creative-proposal");
      return listCreativeProposalsByStrategy(input.strategyId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { getCreativeProposal } = await import("@/server/services/creative-proposal");
      return getCreativeProposal(input.id);
    }),

  executionLevels: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const { getExecutionLevels } = await import("@/server/services/creative-proposal");
      return getExecutionLevels(input.strategyId);
    }),

  create: governedProcedure({
    kind: "CREATE_CREATIVE_PROPOSAL",
    inputSchema: creativeProposalContractSchema,
    caller: "creativeProposal:create",
  }).mutation(async ({ input }) => {
    const { createCreativeProposal } = await import("@/server/services/creative-proposal");
    return createCreativeProposal(input);
  }),

  submit: governedProcedure({
    kind: "SUBMIT_CREATIVE_PROPOSAL",
    inputSchema: z.object({ id: z.string() }),
    caller: "creativeProposal:submit",
  }).mutation(async ({ input }) => {
    const { submitCreativeProposal } = await import("@/server/services/creative-proposal");
    return submitCreativeProposal(input.id);
  }),

  validate: governedProcedure({
    kind: "VALIDATE_CREATIVE_PROPOSAL",
    inputSchema: z.object({ id: z.string() }),
    caller: "creativeProposal:validate",
  }).mutation(async ({ ctx, input }) => {
    const { validateCreativeProposal } = await import("@/server/services/creative-proposal");
    return validateCreativeProposal(input.id, ctx.session.user.id);
  }),

  reject: governedProcedure({
    kind: "REJECT_CREATIVE_PROPOSAL",
    inputSchema: z.object({ id: z.string(), reason: z.string().min(1).max(2000) }),
    caller: "creativeProposal:reject",
  }).mutation(async ({ input }) => {
    const { rejectCreativeProposal } = await import("@/server/services/creative-proposal");
    return rejectCreativeProposal(input.id, input.reason);
  }),

  /**
   * Voie A IA — pré-remplit un BROUILLON de direction depuis l'ADVE (LLM via Gateway).
   * Ne persiste rien : l'opérateur corrige avant `create`. Gateway indispo → échec propre,
   * la saisie manuelle (Voie B) prend le relais (manual-first parity ADR-0060).
   */
  draftDirection: governedProcedure({
    kind: "DRAFT_CREATIVE_PROPOSAL_FROM_STRATEGY",
    inputSchema: z.object({ strategyId: z.string() }),
    caller: "creativeProposal:draftDirection",
  }).mutation(async ({ input }) => {
    const { draftCreativeDirectionFromStrategy } = await import("@/server/services/creative-proposal");
    return draftCreativeDirectionFromStrategy(input.strategyId);
  }),

  /**
   * Amorçage multi-axes — si la gate est vide ET que des frames canon existent, seed
   * 2 propositions DRAFT (2 axes créatifs distincts). Idempotent. Rend le « déjà
   * amorcé » attendu : l'opérateur n'a plus qu'à choisir l'axe 1 ou l'axe 2 (ADR-0120).
   */
  seedAxesIfEmpty: governedProcedure({
    kind: "SEED_CREATIVE_AXES",
    inputSchema: z.object({ strategyId: z.string() }),
    caller: "creativeProposal:seedAxesIfEmpty",
  }).mutation(async ({ input }) => {
    const { seedCreativeAxesIfEmpty } = await import("@/server/services/creative-proposal");
    return seedCreativeAxesIfEmpty(input.strategyId);
  }),

  // ── Voie B La Guilde — surface membre guilde (creator portal) ──

  /** Stratégies pour lesquelles le membre guilde connecté peut proposer (≥1 mission assignée). */
  guildProposableStrategies: protectedProcedure.query(async ({ ctx }) => {
    const { listGuildProposableStrategies } = await import("@/server/services/creative-proposal");
    return listGuildProposableStrategies(ctx.session.user.id);
  }),

  /**
   * Voie B — un membre guilde soumet une direction créative pour une stratégie où il
   * est missionné → SUBMITTED dans la file opérateur. Accès gardé côté service (lien mission).
   */
  submitGuildProposal: governedProcedure({
    kind: "GUILD_SUBMIT_CREATIVE_PROPOSAL",
    inputSchema: z.object({
      strategyId: z.string(),
      routeKey: z.enum(ROADMAP_ROUTE_KEYS),
      direction: creativeDirectionSchema,
    }),
    caller: "creativeProposal:submitGuildProposal",
  }).mutation(async ({ ctx, input }) => {
    const { submitGuildCreativeProposal } = await import("@/server/services/creative-proposal");
    return submitGuildCreativeProposal(ctx.session.user.id, input);
  }),
});
