"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";
import { SECTION_REGISTRY, type SectionTier } from "@/server/services/strategy-presentation/types";
import { Badge } from "@/components/primitives";

interface Props {
  /** IntentEmission id pour le streaming SSE NSP. Si null, le tracker affiche les
   *  35 sections en queued. Le caller peut aussi passer `completenessReport` pour
   *  afficher un statut basé sur le polling existant (compat backward avant le full
   *  intentId capture refactor). */
  intentId: string | null;
  /** Optionnel : sections à afficher (default = SECTION_REGISTRY 35 ids). */
  sections?: readonly string[];
  /** Optionnel : completeness report (id → "complete"|"partial"|"empty") pour
   *  alimenter le statut hors NSP (fallback polling existant). */
  completenessReport?: Record<string, "complete" | "partial" | "empty">;
  className?: string;
}

type Status = "queued" | "in-progress" | "done" | "failed";

const TIER_LABEL: Record<SectionTier, string> = {
  CORE: "Core (21)",
  BIG4_BASELINE: "Big4 baseline (7)",
  DISTINCTIVE: "Distinctifs (5)",
  DORMANT: "Dormants (2)",
};

/**
 * <OracleEnrichmentTracker> — 35-section grid (Phase 13) showing per-section
 * state during ENRICH_ORACLE intents.
 *
 * Phase 13 (B7, ADR-0014) :
 * - Étendu à 35 sections (était 21) avec groups par tier (CORE / BIG4 / DISTINCTIVE / DORMANT)
 * - Consume `useNeteruIntent` (NSP SSE) pour le streaming live
 * - Fallback `completenessReport` prop pour caller polling-based en attendant
 *   le full intentId capture refactor (B7+)
 */
export function OracleEnrichmentTracker({
  intentId,
  sections,
  completenessReport,
  className = "",
}: Props) {
  const { history, progress } = useNeteruIntent(intentId);
  const sectionIds = sections ?? SECTION_REGISTRY.map((s) => s.id);

  // Initialize all sections to queued
  const statuses: Record<string, Status> = Object.fromEntries(
    sectionIds.map((s) => [s, "queued" as Status]),
  );

  // Phase 13 (B7) — fallback : si completenessReport fourni, l'utilise pour
  // alimenter le statut (compat avec polling-based existant page proposition).
  if (completenessReport) {
    for (const [id, status] of Object.entries(completenessReport)) {
      if (!(id in statuses)) continue;
      statuses[id] = status === "complete" ? "done" : status === "partial" ? "in-progress" : "queued";
    }
  }

  // NSP SSE events (priorité sur completenessReport — temps réel)
  for (const e of history) {
    const completed = e.partial?.sectionsCompleted ?? [];
    for (const c of completed) statuses[c] = "done";
    if (e.partial?.sectionKey && statuses[e.partial.sectionKey] !== "done") {
      statuses[e.partial.sectionKey] = "in-progress";
    }
    if (e.phase === "FAILED" && e.partial?.sectionKey) {
      statuses[e.partial.sectionKey] = "failed";
    }
  }
  if (progress?.partial?.sectionKey && statuses[progress.partial.sectionKey] === "queued") {
    statuses[progress.partial.sectionKey] = "in-progress";
  }

  // Group sections by tier
  const byTier: Record<SectionTier, typeof SECTION_REGISTRY> = {
    CORE: [],
    BIG4_BASELINE: [],
    DISTINCTIVE: [],
    DORMANT: [],
  };
  for (const meta of SECTION_REGISTRY) {
    if (!sectionIds.includes(meta.id)) continue;
    byTier[meta.tier ?? "CORE"].push(meta);
  }

  return (
    <div className={`oracle-enrichment-tracker space-y-3 ${className}`}>
      {(Object.keys(byTier) as SectionTier[]).map((tier) => {
        const items = byTier[tier];
        if (items.length === 0) return null;
        return (
          <div key={tier} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                {TIER_LABEL[tier]}
              </span>
              <Badge tone={tier === "DISTINCTIVE" ? "accent" : "neutral"}>
                {items.filter((s) => statuses[s.id] === "done").length}/{items.length}
              </Badge>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {items.map((meta) => {
                const status = statuses[meta.id];
                return (
                  <li
                    key={meta.id}
                    title={`${meta.number} — ${meta.title} (${status})`}
                    className={`rounded border px-2 py-1 text-xs transition-opacity ${
                      status === "done"
                        ? "border-current/50 bg-current/10"
                        : status === "in-progress"
                          ? "border-current animate-pulse"
                          : status === "failed"
                            ? "border-current opacity-90"
                            : "opacity-50"
                    }`}
                  >
                    <span className="font-mono text-[10px]">{meta.number}</span>{" "}
                    <span className="truncate">{meta.id}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
