/**
 * Anubis tRPC router — Phase 8+ (ADR-0011).
 *
 * Procédures :
 *   - dispatchMessage   : message individuel single-channel
 *   - broadcast         : fan-out cohorte
 *   - launchAdCampaign  : campagne paid media (Meta/Google/TikTok/X)
 *   - publishSocial     : post social
 *   - scheduleDrop      : drop multi-canaux coordonné
 *
 * Toutes via `operatorProcedure` (authentifié + scope operator).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, paidMediaProcedure } from "../init";
import { db } from "@/lib/db";
import {
  dispatchMessage,
  broadcast,
  launchAdCampaign,
  publishSocial,
  scheduleDrop,
} from "@/server/services/anubis";
import { MANIPULATION_MODES } from "@/server/services/ptah/types";
import { COMMS_CHANNELS } from "@/server/services/anubis/types";

async function resolveOperatorId(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { operatorId: true },
  });
  if (!user?.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User has no operatorId" });
  }
  return user.operatorId;
}

export const anubisRouter = createTRPCRouter({
  dispatchMessage: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      userId: z.string(),
      channel: z.enum(COMMS_CHANNELS as readonly [string, ...string[]]),
      title: z.string(),
      body: z.string(),
      link: z.string().optional(),
      manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
      tag: z.string().optional(),
    }))
    .mutation(({ input }) => dispatchMessage(input as never)),

  broadcast: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      cohortKey: z.string(),
      channel: z.enum(COMMS_CHANNELS as readonly [string, ...string[]]),
      title: z.string(),
      body: z.string(),
      link: z.string().optional(),
      manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
      respectQuietHours: z.boolean().optional(),
      scheduledAt: z.coerce.date().optional(),
    }))
    .mutation(({ input }) => broadcast(input as never)),

  launchAdCampaign: paidMediaProcedure
    .input(z.object({
      strategyId: z.string(),
      campaignId: z.string(),
      platform: z.enum(["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "X_ADS"]),
      budget: z.number().positive(),
      currency: z.string(),
      durationDays: z.number().int().positive().max(365),
      manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
      audienceTargeting: z.object({
        countries: z.array(z.string()).min(1),
        ageRange: z.tuple([z.number(), z.number()]).optional(),
        interests: z.array(z.string()).optional(),
        customSegmentId: z.string().optional(),
      }),
      creativeAssetVersionId: z.string(),
      expectedSuperfans: z.number().int().min(0),
      benchmarkCostPerSuperfan: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const intentId = `intent-anubis-launch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return launchAdCampaign(input as never, { operatorId, intentId });
    }),

  publishSocial: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      connectionId: z.string(),
      externalPostId: z.string().optional(),
      content: z.string().min(1),
      mediaAssetVersionId: z.string().optional(),
      manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
      scheduledAt: z.coerce.date().optional(),
    }))
    .mutation(({ input }) => publishSocial(input as never)),

  scheduleDrop: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      campaignId: z.string(),
      scheduledAt: z.coerce.date(),
      channels: z.array(
        z.object({
          channel: z.enum(COMMS_CHANNELS as readonly [string, ...string[]]),
          payload: z.object({
            title: z.string(),
            body: z.string(),
            link: z.string().optional(),
            mediaAssetVersionId: z.string().optional(),
          }),
        }),
      ).min(1),
      manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
    }))
    .mutation(({ input }) => scheduleDrop(input as never)),
});
