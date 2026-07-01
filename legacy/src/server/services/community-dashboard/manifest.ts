/**
 * Manifest — community-dashboard (SESHAT).
 *
 * Composition (lecture seule) du suivi communauté : agrège superfans, paliers
 * de dévotion (spectateur→ambassadeur→évangéliste), santé communauté et
 * followers en silos via shaper pur (zéro DB, zéro LLM). Observabilité Seshat.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "community-dashboard",
  governor: "SESHAT",
  version: "1.0.0",
  capabilities: [
    { name: "shapeCommunityDashboard", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: [], idempotent: true },
    { name: "latestFollowerPerPlatform", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: [], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
});
