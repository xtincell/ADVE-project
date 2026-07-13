import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import {
  SEED_REGISTRY,
  CRON_ACTIONS,
  prodOpsReadiness,
  triggerDeploy,
  triggerCron,
  triggerProdFinish,
} from "@/lib/prod-ops";
import { APP_VERSION } from "@/lib/version";

/**
 * Prod-Ops Router — pilotage opérateur du cycle en 3 temps (skill `nefer-ops`).
 *
 * INJECTION (registre de seeds, lecture seule — l'exécution prod reste un geste
 * opérateur), DÉPLOIEMENT (déclenche Coolify), ACTION SUR DÉPLOYÉ (crons gardés +
 * finaliseur). Actes d'INFRASTRUCTURE, pas de mutation métier : `adminProcedure`
 * (les mutations métier vivent DANS les endpoints ciblés, déjà gouvernées via
 * emitIntent). Aucun secret n'est renvoyé au client — readiness = booléens.
 */
export const prodOpsRouter = createTRPCRouter({
  /** État courant : version de cette instance, readiness credentials, catalogues. */
  status: adminProcedure.query(() => {
    return {
      instanceVersion: APP_VERSION,
      readiness: prodOpsReadiness(),
      seeds: SEED_REGISTRY,
      crons: CRON_ACTIONS.map((c) => ({ key: c.key, label: c.label, note: c.note })),
    };
  }),

  /** TEMPS 2 — déclenche un déploiement Coolify (DEFERRED honnête sans credentials). */
  triggerDeploy: adminProcedure.mutation(() => triggerDeploy()),

  /** TEMPS 3 — déclenche un cron du catalogue fermé (whitelist par `key`). */
  triggerCron: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(({ input }) => triggerCron(input.key)),

  /** TEMPS 3 — finaliseur d'installation prod (login de marque + post planifié). */
  triggerProdFinish: adminProcedure
    .input(
      z.object({
        loginBrand: z.string().trim().min(1).optional(),
        postBrand: z.string().trim().min(1).optional(),
        delayMin: z.number().int().min(2).max(1440).optional(),
      }),
    )
    .mutation(({ input }) => triggerProdFinish(input)),
});
