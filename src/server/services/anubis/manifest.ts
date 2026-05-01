/**
 * Manifest — Anubis (Comms — dispatch, broadcast, ad campaigns, social, scheduled drops).
 *
 * 7ème Neter actif (ADR-0011 — promu de pré-réservé à actif). Sous-système APOGEE
 * = Comms (Ground Tier). Téléologie : KPI primaire = cost_per_superfan_recruited.
 *
 * Cf. PANTHEON.md §2.7, ADR-0011.
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { MANIPULATION_MODES } from "@/server/services/ptah/types";
import { COMMS_CHANNELS } from "./types";

export const manifest = defineManifest({
  service: "anubis",
  // Mestor reste dispatcher unique (Pilier 1). BRAINS const inclut "ANUBIS"
  // pour les sub-services Comms auto-gouvernés.
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "ANUBIS_DISPATCH_MESSAGE",
    "ANUBIS_BROADCAST",
    "ANUBIS_LAUNCH_AD_CAMPAIGN",
    "ANUBIS_PUBLISH_SOCIAL",
    "ANUBIS_SCHEDULE_DROP",
  ],
  emits: [
    "MESSAGE_DISPATCHED",
    "AD_CAMPAIGN_LAUNCHED",
    "SOCIAL_POST_PUBLISHED",
    "BROADCAST_SENT",
  ],
  capabilities: [
    {
      name: "dispatchMessage",
      inputSchema: z.object({
        strategyId: z.string(),
        userId: z.string(),
        channel: z.enum(COMMS_CHANNELS as readonly [string, ...string[]]),
        title: z.string(),
        body: z.string(),
        link: z.string().optional(),
        manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
        tag: z.string().optional(),
      }),
      outputSchema: z.object({
        messageId: z.string(),
        channel: z.string(),
        delivered: z.boolean(),
        provider: z.string(),
        costEstimateUsd: z.number(),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 3000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    {
      name: "broadcast",
      inputSchema: z.object({
        strategyId: z.string(),
        cohortKey: z.string(),
        channel: z.enum(COMMS_CHANNELS as readonly [string, ...string[]]),
        title: z.string(),
        body: z.string(),
        link: z.string().optional(),
        manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
        respectQuietHours: z.boolean().optional(),
        scheduledAt: z.coerce.date().optional(),
      }),
      outputSchema: z.object({
        broadcastId: z.string(),
        channel: z.string(),
        estimatedRecipients: z.number(),
        scheduled: z.boolean(),
        scheduledAt: z.coerce.date().optional(),
        costEstimateUsd: z.number(),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    {
      name: "launchAdCampaign",
      inputSchema: z.object({
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
      }),
      outputSchema: z.object({
        amplificationId: z.string(),
        platform: z.string(),
        status: z.enum(["PLANNED", "RUNNING", "REJECTED"]),
        estimatedReach: z.number(),
        estimatedSuperfans: z.number(),
        costPerSuperfanProjected: z.number(),
        benchmarkRatio: z.number(),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "S",
      latencyBudgetMs: 8000,
      idempotent: false,
      // Pre-conditions ADR §3 : RTIS_CASCADE pour avoir les piliers + brand vault prêt
      preconditions: ["RTIS_CASCADE"],
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    {
      name: "publishSocial",
      inputSchema: z.object({
        strategyId: z.string(),
        connectionId: z.string(),
        externalPostId: z.string().optional(),
        content: z.string().min(1),
        mediaAssetVersionId: z.string().optional(),
        manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
        scheduledAt: z.coerce.date().optional(),
      }),
      outputSchema: z.object({
        postId: z.string(),
        externalPostId: z.string(),
        platform: z.string(),
        scheduled: z.boolean(),
        scheduledAt: z.coerce.date().optional(),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 4000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    {
      name: "scheduleDrop",
      inputSchema: z.object({
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
      }),
      outputSchema: z.object({
        dropId: z.string(),
        scheduledAt: z.coerce.date(),
        channelCount: z.number(),
        estimatedReach: z.number(),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 4000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
  ],
  dependencies: [
    "financial-brain",
    "ptah",
    "seshat",
    "oauth-integrations",
    "email",
  ],
  docs: {
    summary:
      "Anubis — 7ème Neter actif (Comms). Routing/scheduling/audience-targeting des messages individuels (DM), broadcasts cohorte, paid media campaigns (Meta/Google/TikTok/X), social posts, scheduled drops multi-canaux. Pre-flight gates : OAuth scopes valid + audience valid + cost_per_superfan_recruited ≤ 2× benchmark sectoriel + manipulation coherence.",
  },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 4,
});
