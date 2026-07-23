import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import {
  scoreObject,
  batchScore,
  getScoreHistory,
  snapshotAllStrategies,
  type ScorableType,
} from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

const scorableTypes = z.enum(["strategy", "campaign", "mission", "talentProfile", "signal", "gloryOutput", "brandAsset"]);

export const advertisScorerRouter = createTRPCRouter({
  /** Score a single object and persist the AdvertisVector */
  scoreObject: governedProcedure({

    kind: "LEGACY_ADVERTIS_SCORER_SCORE_OBJECT",

    // IDOR (round-10) : keyé sur `{ type, id }` arbitraire → re-score/écrase le
    // vecteur ADVE de N'IMPORTE quel objet (marque d'autrui incluse). Primitive
    // scoring système/opérateur, jamais un geste founder cross-tenant.
    requireOperator: true,

    inputSchema: z.object({ type: scorableTypes, id: z.string() }),

    caller: "advertis-scorer:scoreObject",

  })
    .mutation(async ({ input }) => {
      const vector = await scoreObject(input.type as ScorableType, input.id);
      return { ...vector, classification: classifyBrand(vector.composite) };
    }),

  /** Optimized batch scoring with concurrency limit and partial results */
  batchScore: governedProcedure({

    kind: "LEGACY_ADVERTIS_SCORER_BATCH_SCORE",

    requireOperator: true, // IDOR round-10 : batch re-score d'ids arbitraires.

    inputSchema: z.object({ type: scorableTypes, ids: z.array(z.string()).max(500) }),

    caller: "advertis-scorer:batchScore",

  })
    .mutation(async ({ input }) => {
      return batchScore(input.type as ScorableType, input.ids);
    }),

  /** Score history for a strategy — time series of ScoreSnapshots */
  getHistory: strategyScopedProcedure
    .input(z.object({
      strategyId: z.string(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      return getScoreHistory(input.strategyId, input.limit);
    }),

  /** Admin: force recalculate a score */
  recalculate: governedProcedure({

    kind: "LEGACY_ADVERTIS_SCORER_RECALCULATE",

    requireOperator: true, // IDOR round-10 : « Admin: force recalculate » — id arbitraire.

    inputSchema: z.object({ type: scorableTypes, id: z.string() }),

    caller: "advertis-scorer:recalculate",

  })
    .mutation(async ({ input }) => {
      const vector = await scoreObject(input.type as ScorableType, input.id);
      return { ...vector, classification: classifyBrand(vector.composite) };
    }),

  /** Admin: snapshot all strategies (called by cron, also callable manually) */
  snapshotAll: governedProcedure({
    kind: "LEGACY_ADVERTIS_SCORER_SNAPSHOT_ALL",
    requireOperator: true, // IDOR round-10 : re-snapshot de TOUTES les marques (churn/DoS) — cron passe par emitIntent système.
    inputSchema: z.object({}),
    caller: "advertis-scorer:snapshotAll",
  }).mutation(async () => {
    return snapshotAllStrategies();
  }),
});
