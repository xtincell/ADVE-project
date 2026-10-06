import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "creative-intelligence", governor: "SESHAT", version: "1.1.0",
  acceptsIntents: ["SESHAT_IMPORT_SPECIMEN", "SESHAT_RECORD_CONTENT_METRIC", "SESHAT_ANNOTATE_CREATIVE", "SESHAT_DISCOVER_RECIPE", "SESHAT_REVIEW_RECIPE", "SESHAT_SAVE_CREATIVE_WATCHLIST", "SESHAT_APPLY_RECIPE", "SESHAT_RESOLVE_RECIPE_APPLICATION", "SESHAT_CAPTURE_NATIVE_CREATIVE_INSIGHTS", "SESHAT_COLLECT_CREATIVE_SOURCE", "SESHAT_IMPORT_CREATIVE_EXPORT", "SESHAT_DRAFT_CREATIVE_ANALYSIS", "SESHAT_REVIEW_CREATIVE_DRAFT", "SESHAT_PROJECT_ARGOS_DOSSIER", "SESHAT_REVIEW_REFERENCE_DOSSIER", "SESHAT_REFRESH_CREATIVE_WATCHLIST", "SESHAT_SET_CREATIVE_WATCH_AUTOMATION"],
  capabilities: [{ name: "observeCreativeEvidence", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ", "DB_WRITE", "EXTERNAL_API", "LLM_CALL", "FILE_WRITE"], qualityTier: "B", latencyBudgetMs: 120000 }],
  dependencies: [], missionContribution: "CHAIN_VIA:campaign-tracker",
  docs: { summary: "Scoped observations, bounded source adapters, reviewed assisted drafts, empirical recipes, brand trials and Argos-studio receipts. Live provider state is explicit." },
});
