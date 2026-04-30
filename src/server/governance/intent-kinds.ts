/**
 * src/server/governance/intent-kinds.ts — Canonical Intent kind catalog.
 *
 * Layer 2. The Phase-3 catalog includes the Mestor v1 kinds plus the 6
 * new ones surfaced by the V5.4 audit (the ranker consumers + the
 * intake → strategy lift + Oracle export).
 *
 * Each Intent kind is associated with:
 *   - the governing Neteru
 *   - the manifest service that handles it
 *   - whether it is async (queued) or sync
 */

import type { Brain } from "./manifest";

export interface IntentKindMeta {
  readonly kind: string;
  readonly governor: Brain;
  readonly handler: string;
  readonly async: boolean;
  readonly description: string;
}

export const INTENT_KINDS: readonly IntentKindMeta[] = [
  // ── Mestor v1 ──
  { kind: "FILL_ADVE", governor: "MESTOR", handler: "mestor", async: false, description: "Fill ADVE pillars from sources." },
  { kind: "RUN_RTIS_CASCADE", governor: "MESTOR", handler: "mestor", async: false, description: "Run R→T→I→S cascade on a strategy." },
  { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", handler: "notoria", async: false, description: "Generate Notoria recos for a strategy." },
  { kind: "APPLY_RECOMMENDATIONS", governor: "MESTOR", handler: "notoria", async: false, description: "Apply accepted recos." },
  { kind: "BUILD_PLAN", governor: "MESTOR", handler: "mestor", async: false, description: "Build an action plan for a touchpoint/AARRR slice." },
  { kind: "RUN_BOOT_SEQUENCE", governor: "MESTOR", handler: "boot-sequence", async: true, description: "Post-paywall full ADVE+RTIS bootstrap." },
  { kind: "RUN_QUICK_INTAKE", governor: "MESTOR", handler: "quick-intake", async: false, description: "Public rev-9 intake." },

  // ── V5.3 / V5.4 additions (ranker consumers) ──
  { kind: "RANK_PEERS", governor: "SESHAT", handler: "seshat", async: false, description: "Generic peer ranking via context-store ranker." },
  { kind: "SEARCH_BRAND_CONTEXT", governor: "SESHAT", handler: "seshat", async: false, description: "Search across strategies / find peers / search within a strategy." },
  { kind: "JEHUTY_FEED_REFRESH", governor: "SESHAT", handler: "jehuty", async: false, description: "Refresh Jehuty feed (signals + recos + diagnostics)." },
  { kind: "JEHUTY_CURATE", governor: "SESHAT", handler: "jehuty", async: false, description: "Pin / dismiss / trigger curation on Jehuty feed item." },
  { kind: "HYPERVISEUR_PEER_INSIGHTS", governor: "SESHAT", handler: "seshat", async: false, description: "Cross-brand peer insights for the Console hyperviseur." },

  // ── Quick-intake → Strategy automation (Phase 3) ──
  { kind: "LIFT_INTAKE_TO_STRATEGY", governor: "MESTOR", handler: "mestor", async: true, description: "Auto-lift a complete quick-intake into a Strategy + first ADVE→RTIS cascade." },

  // ── Oracle (Phase 7 export, declared now) ──
  { kind: "ENRICH_ORACLE", governor: "ARTEMIS", handler: "strategy-presentation", async: true, description: "Enrich the 21 Oracle sections via Mestor→Artemis→Seshat pipeline." },
  { kind: "EXPORT_ORACLE", governor: "ARTEMIS", handler: "strategy-presentation", async: true, description: "Export Oracle as PDF or Markdown." },

  // ── GLORY ──
  { kind: "INVOKE_GLORY_TOOL", governor: "ARTEMIS", handler: "glory-tools", async: false, description: "Invoke a single atomic GLORY tool." },
  { kind: "EXECUTE_GLORY_SEQUENCE", governor: "ARTEMIS", handler: "artemis", async: true, description: "Run the Artemis sequenceur over a curated chain of GLORY tools." },

  // ── Scoring / pillars ──
  { kind: "SCORE_PILLAR", governor: "INFRASTRUCTURE", handler: "advertis-scorer", async: false, description: "Score a pillar without writing — used by validation flows." },
  { kind: "WRITE_PILLAR", governor: "INFRASTRUCTURE", handler: "pillar-gateway", async: false, description: "Atomic write+score+staleness propagation." },

  // ── Thot (financial brain) ──
  { kind: "CHECK_CAPACITY", governor: "THOT", handler: "financial-brain", async: false, description: "Check operator capacity before LLM call." },
  { kind: "RECORD_COST", governor: "THOT", handler: "financial-brain", async: false, description: "Record realised cost." },
  { kind: "VETO_INTENT", governor: "THOT", handler: "financial-brain", async: false, description: "Veto / downgrade an intent for budget reasons." },

  // ── Audit log corrections ──
  { kind: "CORRECT_INTENT", governor: "MESTOR", handler: "mestor", async: false, description: "Append a correction referencing a previous (immutable) intent. The original row is never mutated." },

  // ── Strangler ──
  { kind: "LEGACY_MUTATION", governor: "INFRASTRUCTURE", handler: "infrastructure", async: false, description: "Synthetic kind logged by the strangler middleware for not-yet-migrated mutations." },

  // ── Tier transitions (palier ZOMBIE → ICONE) — see MISSION.md §5.3 ──
  { kind: "PROMOTE_ZOMBIE_TO_FRAGILE", governor: "MESTOR", handler: "mestor", async: false, description: "Mechanize transition palier ZOMBIE → FRAGILE (substance achieved)." },
  { kind: "PROMOTE_FRAGILE_TO_ORDINAIRE", governor: "MESTOR", handler: "mestor", async: false, description: "Mechanize transition palier FRAGILE → ORDINAIRE (basic propulsion stable)." },
  { kind: "PROMOTE_ORDINAIRE_TO_FORTE", governor: "MESTOR", handler: "mestor", async: false, description: "Mechanize transition palier ORDINAIRE → FORTE (distinction leveraged)." },
  { kind: "PROMOTE_FORTE_TO_CULTE", governor: "MESTOR", handler: "mestor", async: false, description: "Mechanize transition palier FORTE → CULTE (cult formation begins)." },
  { kind: "PROMOTE_CULTE_TO_ICONE", governor: "MESTOR", handler: "mestor", async: false, description: "Mechanize transition palier CULTE → ICONE (cult crystallizes into icon, Overton shift)." },

  // ── Régime apogée — sentinel intents (defend post-ICONE state) — APOGEE §13 ──
  { kind: "MAINTAIN_APOGEE", governor: "MESTOR", handler: "mestor", async: true, description: "Sentinel: maintain ICONE state, refresh evangelist mass, rebuke dilution drift." },
  { kind: "DEFEND_OVERTON", governor: "SESHAT", handler: "seshat", async: true, description: "Sentinel: detect competitor Overton counter-moves, propose Mestor responses." },
  { kind: "EXPAND_TO_ADJACENT_SECTOR", governor: "MESTOR", handler: "mestor", async: true, description: "Sentinel: expand the cult mass to adjacent sectors via cross-sector playbook." },

  // ── Funnel : free showcase → paywalled tiers (Operations + Mission) ──
  { kind: "DEDUCE_ADVE_FROM_OFFER", governor: "MESTOR", handler: "quick-intake", async: false, description: "From a brief offer paragraph, deduce a structured ADVE (4 pillars, scoring, narrative). The free killer-demo." },
  { kind: "EXPORT_RTIS_PDF", governor: "ARTEMIS", handler: "value-report-generator", async: true, description: "Generate paid ADVE+RTIS PDF deliverable (shareable, brand-customized)." },
  { kind: "ACTIVATE_RETAINER", governor: "THOT", handler: "monetization", async: false, description: "Activate a retainer subscription tier (BASE / PRO / ENTERPRISE) for an operator/strategy." },

  // ── Compensating intents (reverse maneuvers) — APOGEE §10.5 ──
  { kind: "ROLLBACK_PILLAR", governor: "MESTOR", handler: "pillar-gateway", async: false, description: "Rollback a previous WRITE_PILLAR — restores the pre-write content + score." },
  { kind: "ROLLBACK_ADVE", governor: "MESTOR", handler: "mestor", async: false, description: "Rollback a FILL_ADVE — restores ADVE to pre-fill state." },
  { kind: "ROLLBACK_RTIS_CASCADE", governor: "MESTOR", handler: "mestor", async: false, description: "Rollback a RUN_RTIS_CASCADE — clears R/T/I/S writes." },
  { kind: "DISCARD_RECOMMENDATIONS", governor: "MESTOR", handler: "notoria", async: false, description: "Discard pending recos generated by GENERATE_RECOMMENDATIONS." },
  { kind: "REVERT_RECOMMENDATIONS", governor: "MESTOR", handler: "notoria", async: false, description: "Revert recos previously applied via APPLY_RECOMMENDATIONS." },
  { kind: "DEMOTE_FRAGILE_TO_ZOMBIE", governor: "MESTOR", handler: "mestor", async: false, description: "Compensator for PROMOTE_ZOMBIE_TO_FRAGILE." },
  { kind: "DEMOTE_ORDINAIRE_TO_FRAGILE", governor: "MESTOR", handler: "mestor", async: false, description: "Compensator for PROMOTE_FRAGILE_TO_ORDINAIRE." },
  { kind: "DEMOTE_FORTE_TO_ORDINAIRE", governor: "MESTOR", handler: "mestor", async: false, description: "Compensator for PROMOTE_ORDINAIRE_TO_FORTE." },
  { kind: "DEMOTE_CULTE_TO_FORTE", governor: "MESTOR", handler: "mestor", async: false, description: "Compensator for PROMOTE_FORTE_TO_CULTE." },
  { kind: "DEMOTE_ICONE_TO_CULTE", governor: "MESTOR", handler: "mestor", async: false, description: "Compensator for PROMOTE_CULTE_TO_ICONE." },

  // ── Plugin extension intents (loyalty-extension demo) ──
  { kind: "COMPUTE_LOYALTY_SCORE", governor: "INFRASTRUCTURE", handler: "loyalty-extension", async: false, description: "Plugin: compute loyalty score from SuperfanProfile + DevotionSnapshot for a strategy." },

  // ── Governance — LLM model policy ──
  { kind: "UPDATE_MODEL_POLICY", governor: "INFRASTRUCTURE", handler: "model-policy", async: false, description: "Update the purpose→model resolution policy used by the LLM Gateway. Hash-chained for full audit trail." },

  // ── Ptah — Forge multimodale (Phase 9, ADR-0009). Cascade Glory→Brief→Forge. ──
  { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", handler: "ptah", async: true, description: "Matérialise un ForgeBrief Artemis en asset concret via le provider sélectionné (Magnific/Adobe/Figma/Canva). Async — task créé synchrone, asset livré via webhook reconcile." },
  { kind: "PTAH_RECONCILE_TASK", governor: "MESTOR", handler: "ptah", async: false, description: "Compensating intent — réconcilie un GenerativeTask depuis un webhook provider : download URLs vers CDN, crée AssetVersion, track cost réalisé, emit ASSET_FORGED." },
  { kind: "PTAH_REGENERATE_FADING_ASSET", governor: "MESTOR", handler: "ptah", async: true, description: "Sentinel (régime apogée, Loi 4) : régénère un asset dont l'engagement a chuté >30% vs peak. Cron mensuel pour brands ICONE." },

  // ── BrandAsset / Brand Vault (Phase 10, ADR-0012). Cycle de vie gouverné. ──
  { kind: "SELECT_BRAND_ASSET", governor: "MESTOR", handler: "brand-vault", async: false, description: "Sélectionne un BrandAsset parmi un batch de candidats CANDIDATE → SELECTED (et REJECTED pour les autres). Optionnellement promote en ACTIVE et update Campaign.active{Kind}Id." },
  { kind: "PROMOTE_BRAND_ASSET_TO_ACTIVE", governor: "MESTOR", handler: "brand-vault", async: false, description: "Promote un BrandAsset SELECTED en ACTIVE et update Campaign.active{Kind}Id (BigIdea/Brief/Claim/Manifesto/KvBrief)." },
  { kind: "SUPERSEDE_BRAND_ASSET", governor: "MESTOR", handler: "brand-vault", async: false, description: "Remplace un BrandAsset ACTIVE par une nouvelle version. L'ancien passe SUPERSEDED, le nouveau ACTIVE. Lineage parent/version préservée." },
  { kind: "ARCHIVE_BRAND_ASSET", governor: "MESTOR", handler: "brand-vault", async: false, description: "Archive un BrandAsset (mort rituelle — lecture seule). Lineage préservée." },

  // ── Error Vault (Phase 11) — observabilité runtime. ──
  { kind: "CAPTURE_ERROR_EVENT", governor: "INFRASTRUCTURE", handler: "error-vault", async: false, description: "Capture une erreur runtime (server/client/Prisma/NSP/Ptah/cron/webhook/stress-test) avec dedup par signature." },
  { kind: "RESOLVE_ERROR_EVENT", governor: "INFRASTRUCTURE", handler: "error-vault", async: false, description: "Marque un ErrorEvent comme résolu (ou false-positive connu — auto-resolve futurs occurrences)." },
] as const;

export const INTENT_KIND_BY_NAME = new Map(INTENT_KINDS.map((k) => [k.kind, k]));

export function intentKindExists(name: string): boolean {
  return INTENT_KIND_BY_NAME.has(name);
}
