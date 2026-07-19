/**
 * Argos by LaFusée — router (ADR-0100). Sous-domaine Seshat.
 * Hunter gouverné (LLM via Gateway) + création manuelle (manual-first) +
 * revue opérateur + lectures publiques (apps Argos /argos, PASS uniquement).
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */
import {
  harvestReference,
  createReferenceDossierManual,
  listDossiers,
  getDossierById,
  setDossierVerdict,
  listPublicDossiers,
  getPublicDossierByRef,
} from "@/server/services/seshat/argos";
import { manualDossierInputSchema } from "@/server/services/seshat/argos/schemas";

function assertOperator(role: string | null | undefined) {
  if (role !== "ADMIN" && role !== "OPERATOR") {
    throw new Error("Accès réservé aux opérateurs UPgraders.");
  }
}

function intentIdOf(ctx: unknown): string | undefined {
  return (ctx as { intentId?: string }).intentId;
}

export const argosRouter = createTRPCRouter({
  // ── Hunter (LLM via Gateway) ──────────────────────────────────────────────
  hunt: governedProcedure({
    kind: "SESHAT_HARVEST_REFERENCE",
    requireOperator: true,
    inputSchema: z.object({
      brand: z.string().min(1).max(160),
      campaign: z.string().max(200).optional(),
      sector: z.string().max(120).optional(),
      market: z.string().max(120).optional(),
      topics: z.array(z.string().max(80)).max(10).optional(),
    }),
    caller: "argos:hunt",
  }).mutation(async ({ ctx, input }) => {
    assertOperator(ctx.session.user.role);
    return harvestReference({ ...input, intentEmissionId: intentIdOf(ctx) });
  }),

  // ── Création manuelle (parité manual-first, zéro LLM) ─────────────────────
  createManual: governedProcedure({
    kind: "OPERATOR_CREATE_REFERENCE_DOSSIER",
    requireOperator: true,
    inputSchema: manualDossierInputSchema,
    caller: "argos:createManual",
  }).mutation(async ({ ctx, input }) => {
    assertOperator(ctx.session.user.role);
    return createReferenceDossierManual({ ...input, intentEmissionId: intentIdOf(ctx) });
  }),

  // ── Revue opérateur ───────────────────────────────────────────────────────
  list: operatorProcedure
    .input(z.object({ sector: z.string().max(120).optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
    .query(({ input }) => listDossiers(input ?? {})),

  getById: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => getDossierById(input.id)),

  setVerdict: operatorProcedure
    .input(z.object({ id: z.string(), verdict: z.enum(["PASS", "QUARANTINE", "REJECT"]) }))
    .mutation(({ ctx, input }) => {
      assertOperator(ctx.session.user.role);
      return setDossierVerdict({ id: input.id, verdict: input.verdict, reviewedBy: ctx.session.user.id });
    }),

  // ── Lectures publiques (apps Argos) — PASS + publié uniquement ────────────
  listPublic: publicProcedure
    .input(z.object({ sector: z.string().max(120).optional(), limit: z.number().int().min(1).max(60).default(60) }).optional())
    .query(({ input }) => listPublicDossiers(input ?? {})),

  getPublicByRef: publicProcedure
    .input(z.object({ ref: z.string().min(1).max(160) }))
    .query(({ input }) => getPublicDossierByRef(input.ref)),

  /**
   * Newsletter Argos (Phase A état-final) — capture d'audience possédée en
   * propre. Consentement EXPLICITE (le prospect soumet son email pour ça),
   * CrmContact taggé `argos-newsletter`, idempotent. Aucun envoi auto ici.
   */
  subscribeNewsletter: publicProcedure
    .input(z.object({ email: z.string().email().max(200), source: z.string().max(60).optional() }))
    .mutation(async ({ input }) => {
      const { db } = await import("@/lib/db");
      const email = input.email.toLowerCase();
      const existing = await db.crmContact.findUnique({ where: { email }, select: { id: true, tags: true } });
      if (existing) {
        if (!existing.tags.includes("argos-newsletter")) {
          await db.crmContact.update({
            where: { id: existing.id },
            data: { tags: { set: [...existing.tags, "argos-newsletter"] }, newsletterOptIn: true },
          });
        }
      } else {
        await db.crmContact.create({
          data: { email, source: "NEWSLETTER", tags: ["argos-newsletter", ...(input.source ? [`src:${input.source}`] : [])], newsletterOptIn: true },
        });
      }
      return { ok: true };
    }),
});
