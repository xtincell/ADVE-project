import { z } from "zod";
import crypto from "crypto";
import { createTRPCRouter, protectedProcedure } from "../init";
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

  get: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return guidelinesService.generate(input.strategyId);
    }),

  export: protectedProcedure
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
      // Generate a deterministic share token from strategyId + secret so it's
      // reproducible without DB storage and stable across calls.
      const secret = process.env.NEXTAUTH_SECRET ?? "default-secret";
      const token = crypto
        .createHmac("sha256", secret)
        .update(input.strategyId)
        .digest("base64url");
      return {
        shareUrl: `/shared/guidelines/${token}`,
        expiresAt: input.expiresIn
          ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
          : null,
      };
    }),
});
