/**
 * Talent services — tRPC router (ADR-0117). Gigs prestataires façon Fiverr/Malt.
 *
 * Browse public (publicProcedure) + gestion par le propriétaire (gouvernée). Zéro LLM.
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import * as svc from "@/server/services/talent-services";
/* lafusee:governed-active */

const serviceInput = z.object({
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(4000),
  category: z.string().max(40).optional(),
  priceAmount: z.number().nonnegative(),
  currency: z.string().max(8).optional(),
  priceUnit: z.enum(["FORFAIT", "JOUR", "HEURE", "LIVRABLE"]).optional(),
  deliveryDays: z.number().int().positive().optional(),
});

export const talentServicesRouter = createTRPCRouter({
  /** Catalogue public des gigs actifs (browse marketplace). */
  listPublic: publicProcedure
    .input(z.object({ category: z.string().optional(), limit: z.number().int().positive().max(100).optional() }).optional())
    .query(async ({ input }) => {
      return svc.listPublicServices({ category: input?.category, limit: input?.limit });
    }),

  /** Mes gigs (prestataire connecté). */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return svc.listMyServices(ctx.session.user.id);
  }),

  create: governedProcedure({
    kind: "LEGACY_TALENT_SERVICE_CREATE",
    inputSchema: serviceInput,
    caller: "talent-services:create",
  }).mutation(async ({ ctx, input }) => {
    return svc.createService(ctx.session.user.id, input);
  }),

  update: governedProcedure({
    kind: "LEGACY_TALENT_SERVICE_UPDATE",
    inputSchema: serviceInput.partial().extend({ serviceId: z.string() }),
    caller: "talent-services:update",
  }).mutation(async ({ ctx, input }) => {
    const { serviceId, ...patch } = input;
    return svc.updateService(ctx.session.user.id, serviceId, patch);
  }),

  toggle: governedProcedure({
    kind: "LEGACY_TALENT_SERVICE_TOGGLE",
    inputSchema: z.object({ serviceId: z.string(), active: z.boolean() }),
    caller: "talent-services:toggle",
  }).mutation(async ({ ctx, input }) => {
    return svc.toggleService(ctx.session.user.id, input.serviceId, input.active);
  }),
});
