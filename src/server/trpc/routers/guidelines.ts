import { z } from "zod";
import crypto from "crypto";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as guidelinesService from "@/server/services/guidelines-renderer";

export const guidelinesRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
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

  shareLink: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      expiresIn: z.number().optional(),
    }))
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
