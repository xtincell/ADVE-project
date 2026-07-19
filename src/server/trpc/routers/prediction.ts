/**
 * Registre des paris — router (ADR-0159, étend ADR-0156).
 *
 * Déclaration + résolution manuelle GOUVERNÉES (voie unique, single-writer
 * `seshat/prediction`), lectures opérateur, et registre PUBLIC /paris.
 *
 * Règle Domino's (gravée, plan d'état final §2.1) : un pari PUBLIC exige
 * l'attestation structurelle que son échec coûte à la marque/l'agence — JAMAIS
 * un pari qui incite des tiers à prendre des risques pour tenir la promesse.
 * L'attestation est dans l'input Zod (refus au parse) ET persistée dans
 * l'émission hash-chainée (audit).
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */
import {
  declarePrediction,
  resolvePredictionManually,
  listDueForManualResolution,
  listPublicPledges,
  getCalibrationByKind,
  PUBLIC_PLEDGE_MAX_HORIZON_DAYS,
} from "@/server/services/seshat/prediction";
import { db } from "@/lib/db";

const declareSchema = z
  .object({
    strategyId: z.string(),
    kind: z.enum(["PLEDGE", "ACTION_EFFECT"]),
    subjectType: z.string().min(2).max(60),
    subjectKey: z.string().max(120).optional(),
    statement: z.string().min(20).max(500),
    predictedValue: z.number().finite().optional(),
    predictedDirection: z.enum(["UP", "DOWN", "FLAT"]).optional(),
    confidence: z.number().min(0.05).max(0.95),
    horizonDays: z.number().int().min(7).max(365),
    isPublic: z.boolean().default(false),
    /**
     * Attestation règle Domino's — obligatoire pour tout pari public :
     * « l'échec de ce pari coûte à la marque/l'agence ; il n'incite aucun
     * tiers à prendre des risques pour tenir la promesse ».
     */
    dominosAttestation: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.isPublic && v.dominosAttestation !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DOMINOS_ATTESTATION_REQUIRED — un pari public exige l'attestation règle Domino's.",
        path: ["dominosAttestation"],
      });
    }
    if (v.isPublic && v.horizonDays > PUBLIC_PLEDGE_MAX_HORIZON_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `PUBLIC_PLEDGE_HORIZON_TOO_FAR — max ${PUBLIC_PLEDGE_MAX_HORIZON_DAYS} jours pour un pari public.`,
        path: ["horizonDays"],
      });
    }
  });

export const predictionRouter = createTRPCRouter({
  /** Déclare un pari (opérateur — séquençage « paris modestes d'abord »). */
  declare: governedProcedure({
    kind: "SESHAT_DECLARE_PREDICTION",
    requireOperator: true,
    inputSchema: declareSchema,
    caller: "prediction:declare",
  }).mutation(async ({ ctx, input }) => {
    return declarePrediction({
      ...input,
      predictedValue: input.predictedValue ?? null,
      predictedDirection: input.predictedDirection ?? null,
      declaredBy: ctx.session.user.id,
    });
  }),

  /** Résolution manuelle d'un pari échu non auto-mesurable. */
  resolveManual: governedProcedure({
    kind: "SESHAT_RESOLVE_PREDICTION",
    requireOperator: true,
    inputSchema: z.object({
      id: z.string(),
      outcome: z.enum(["HIT", "MISS", "UNRESOLVED"]),
      note: z.string().min(10).max(500),
      outcomeValue: z.number().finite().optional(),
    }),
    caller: "prediction:resolveManual",
  }).mutation(async ({ input }) => {
    return resolvePredictionManually({ ...input, outcomeValue: input.outcomeValue ?? null });
  }),

  /** Paris échus à trancher à la main (file opérateur). */
  due: operatorProcedure.query(() => listDueForManualResolution()),

  /** Tous les paris d'une marque (panneau opérateur). */
  listForStrategy: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) =>
      db.predictionRecord.findMany({
        where: { strategyId: input.strategyId, kind: { in: ["PLEDGE", "ACTION_EFFECT"] } },
        orderBy: [{ status: "asc" }, { horizonAt: "asc" }],
        take: 50,
      }),
    ),

  /** Le registre public /paris — paris publics uniquement, jamais declaredBy. */
  listPublic: publicProcedure.query(() => listPublicPledges()),

  /** Calibration par famille (agrégats uniquement — la preuve de la méthode). */
  calibration: publicProcedure.query(() => getCalibrationByKind()),
});
