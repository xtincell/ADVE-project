/**
 * Manifest — oauth-integrations.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Provides OAuth 2.0
 * Authorization Code flows for outbound SaaS integrations
 * (Google, Meta, LinkedIn).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "oauth-integrations",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "buildAuthorizeUrl",
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.string(),
      sideEffects: [],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Authorize URL builder — pure function, prerequisite for any outbound integration consent flow.",
    },
    {
      name: "exchangeCode",
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "A",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Authorization-code → tokens exchange; without it OAuth integrations remain stubs and operators cannot connect ad accounts to fuel campaigns.",
    },
    {
      name: "fetchUserInfo",
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["EXTERNAL_API"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Resolves the connected provider's user identity so multiple-account operators can disambiguate connections.",
    },
    {
      name: "encryptTokenPayload",
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.string(),
      sideEffects: [],
      idempotent: true,
      qualityTier: "A",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "AES-GCM encryption of OAuth tokens at rest; without it, tokens leak from a DB read = breach. Non-negotiable.",
    },
    {
      name: "decryptTokenPayload",
      inputSchema: z.string(),
      outputSchema: z.unknown(),
      sideEffects: [],
      idempotent: true,
      qualityTier: "A",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Counterpart to encrypt; only path to read tokens for outbound API calls.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "OAuth is the gate to ad-account access; without working consent flows operators cannot wire campaigns and the funnel stops at ADVE without engaging Glory tools.",
});
