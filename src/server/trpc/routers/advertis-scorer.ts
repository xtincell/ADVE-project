import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import {
  scoreObject,
  batchScore,
  getScoreHistory,
  snapshotAllStrategies,
  type ScorableType,
} from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "advertis-scorer");
const _auditedAdmin = auditedProcedure(adminProcedure, "advertis-scorer");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

const scorableTypes = z.enum(["strategy", "campaign", "mission", "talentProfile", "signal", "gloryOutput", "brandAsset"]);

export const advertisScorerRouter = createTRPCRouter({
  /** Score a single object and persist the AdvertisVector */
  scoreObject: protectedProcedure
    .input(z.object({ type: scorableTypes, id: z.string() }))
    .mutation(async ({ input }) => {
      const vector = await scoreObject(input.type as ScorableType, input.id);
      return { ...vector, classification: classifyBrand(vector.composite) };
    }),

  /** Optimized batch scoring with concurrency limit and partial results */
  batchScore: protectedProcedure
    .input(z.object({ type: scorableTypes, ids: z.array(z.string()).max(500) }))
    .mutation(async ({ input }) => {
      return batchScore(input.type as ScorableType, input.ids);
    }),

  /** Score history for a strategy — time series of ScoreSnapshots */
  getHistory: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      return getScoreHistory(input.strategyId, input.limit);
    }),

  /** Admin: force recalculate a score */
  recalculate: adminProcedure
    .input(z.object({ type: scorableTypes, id: z.string() }))
    .mutation(async ({ input }) => {
      const vector = await scoreObject(input.type as ScorableType, input.id);
      return { ...vector, classification: classifyBrand(vector.composite) };
    }),

  /** Admin: snapshot all strategies (called by cron, also callable manually) */
  snapshotAll: adminProcedure
    .mutation(async () => {
      return snapshotAllStrategies();
    }),
});
