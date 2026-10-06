import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "creative-intelligence", governor: "SESHAT", version: "1.0.0",
  acceptsIntents: ["SESHAT_IMPORT_SPECIMEN", "SESHAT_RECORD_CONTENT_METRIC", "SESHAT_ANNOTATE_CREATIVE", "SESHAT_DISCOVER_RECIPE", "SESHAT_REVIEW_RECIPE", "SESHAT_SAVE_CREATIVE_WATCHLIST", "SESHAT_APPLY_RECIPE", "SESHAT_RESOLVE_RECIPE_APPLICATION", "SESHAT_CAPTURE_NATIVE_CREATIVE_INSIGHTS"],
  capabilities: [{ name: "observeCreativeEvidence", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ", "DB_WRITE"], qualityTier: "B", latencyBudgetMs: 5000 }],
  dependencies: [], missionContribution: "CHAIN_VIA:campaign-tracker",
  docs: { summary: "Scoped creative observations, immutable metrics/annotations, empirical recipes and measured brand trials. Manual-first, no external provider claim." },
});
