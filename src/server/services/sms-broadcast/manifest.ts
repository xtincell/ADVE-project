/**
 * Manifest — sms-broadcast (Phase 8+, sub-service Anubis).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "sms-broadcast",
  governor: "ANUBIS",
  version: "1.0.0",
  capabilities: [
    {
      name: "sendSms",
      inputSchema: z.object({
        to: z.string(),
        body: z.string(),
        countryCode: z.string().optional(),
        tag: z.string().optional(),
      }),
      outputSchema: z.object({
        ok: z.boolean(),
        provider: z.string(),
        externalMessageId: z.string().optional(),
        error: z.string().optional(),
      }),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 4000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "SMS multi-provider (Twilio + Africa's Talking + Vonage). Provider sélectionné par capacité régionale + dispo env. Sub-service d'Anubis (ADR-0011 §8).",
  },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 4,
});
