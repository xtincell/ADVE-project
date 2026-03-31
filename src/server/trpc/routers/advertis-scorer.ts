import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { scoreObject, batchScore, type ScorableType } from "@/server/services/advertis-scorer";

const scorableTypes = z.enum(["strategy", "campaign", "mission", "talentProfile", "signal", "gloryOutput", "brandAsset"]);

export const advertisScorerRouter = createTRPCRouter({
  scoreObject: protectedProcedure
    .input(z.object({ type: scorableTypes, id: z.string() }))
    .mutation(async ({ input }) => {
      return scoreObject(input.type as ScorableType, input.id);
    }),

  batchScore: protectedProcedure
    .input(z.object({ type: scorableTypes, ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return batchScore(input.type as ScorableType, input.ids);
    }),

  getHistory: protectedProcedure
    .input(z.object({ type: scorableTypes, id: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      // Score history tracked via audit log pattern
      return { type: input.type, id: input.id, history: [] };
    }),

  recalculate: adminProcedure
    .input(z.object({ type: scorableTypes, id: z.string() }))
    .mutation(async ({ input }) => {
      return scoreObject(input.type as ScorableType, input.id);
    }),
});
