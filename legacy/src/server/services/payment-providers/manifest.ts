/**
 * Manifest — payment-providers.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): THOT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Provider registry that
 * picks the right payment processor (CinetPay / Stripe / PayPal / Mock)
 * for a given country and tier.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "payment-providers",
  governor: "THOT",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "pickProvider",
      inputSchema: z.object({
        countryCode: z.string(),
        preferred: z.string().optional(),
      }),
      outputSchema: z.object({ id: z.string() }).passthrough(),
      sideEffects: [],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Provider selection is the routing fabric of the paywall; wrong provider = lost conversion = no retainer fueling missions.",
    },
    {
      name: "listProviders",
      inputSchema: z.object({}),
      outputSchema: z.array(z.object({ id: z.string(), configured: z.boolean() })),
      sideEffects: [],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Lists configured providers — used by admin console to verify payment readiness before launch.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Payment infrastructure is non-negotiable: without working providers, no monetization, no retainer, no sustained mission propulsion.",
});
