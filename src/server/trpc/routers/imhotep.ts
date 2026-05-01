/**
 * Imhotep tRPC router — Phase 7+ (ADR-0010).
 *
 * Procédures :
 *   - matchCreator       : top-N candidats pondérés devotion-potential
 *   - composeTeam        : équipe multi-bucket × manipulation modes
 *   - evaluateTier       : recommandation tier promotion
 *   - routeQc            : routing humain reviewer
 *   - recommendTraining  : suggestion cours Académie
 *
 * Toutes via `operatorProcedure` (authentifié + scope operator).
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";
import {
  matchCreator,
  composeTeam,
  evaluateTier,
  routeQc,
  recommendTraining,
} from "@/server/services/imhotep";
import { MANIPULATION_MODES } from "@/server/services/ptah/types";

export const imhotepRouter = createTRPCRouter({
  matchCreator: operatorProcedure
    .input(z.object({
      missionId: z.string(),
      topN: z.number().int().min(1).max(20).optional(),
    }))
    .mutation(({ input }) => matchCreator(input)),

  composeTeam: operatorProcedure
    .input(z.object({
      campaignId: z.string().optional(),
      missionId: z.string().optional(),
      buckets: z.array(z.string()).min(1),
      manipulationModes: z.array(
        z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
      ).min(1),
    }))
    .mutation(({ input }) => composeTeam(input as never)),

  evaluateTier: operatorProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .mutation(({ input }) => evaluateTier(input)),

  routeQc: operatorProcedure
    .input(z.object({
      deliverableId: z.string(),
      preferredType: z.enum(["PEER", "FIXER", "CLIENT"]).optional(),
    }))
    .mutation(({ input }) => routeQc(input)),

  recommendTraining: operatorProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(({ input }) => recommendTraining(input)),
});
