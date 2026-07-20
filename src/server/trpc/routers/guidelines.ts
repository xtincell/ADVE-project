import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import * as guidelinesService from "@/server/services/guidelines-renderer";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const guidelinesRouter = createTRPCRouter({
  generate: governedProcedure({

    kind: "LEGACY_GUIDELINES_GENERATE",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "guidelines:generate",

  })
    .mutation(async ({ input }) => {
      return guidelinesService.generate(input.strategyId);
    }),

  get: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return guidelinesService.generate(input.strategyId);
    }),

  export: strategyScopedProcedure
    .input(z.object({
      strategyId: z.string(),
      format: z.enum(["html", "pdf"]).default("html"),
    }))
    .query(async ({ input }) => {
      if (input.format === "pdf") {
        return guidelinesService.exportPdf(input.strategyId);
      }
      return guidelinesService.exportHtml(input.strategyId);
    }),

  shareLink: governedProcedure({


    kind: "LEGACY_GUIDELINES_SHARE_LINK",


    inputSchema: z.object({
      strategyId: z.string(),
      expiresIn: z.number().optional(),
    }),


    caller: "guidelines:shareLink",


  })
    .mutation(async ({ input }) => {
      // UNE seule implémentation de token : celle du service (persistée dans
      // businessContext.guidelinesShareToken), résolue par la route publique
      // /shared/guidelines/[token]. L'ancien HMAC local fabriquait un lien
      // qui 404ait chez le destinataire (audit 2026-07-16,
      // `guidelines-share-dead-route` — aucune route ne le résolvait).
      const link = await guidelinesService.getShareableLink(input.strategyId);
      return {
        shareUrl: link.url,
        expiresAt: input.expiresIn
          ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
          : null,
      };
    }),
});
