/**
 * Binding Validator — Validates that Glory tool bindings are satisfiable.
 *
 * Scans ALL_GLORY_TOOLS and checks:
 * 1. Every pillarBinding path resolves to a field in the Zod schema
 * 2. Every bound path is covered by the COMPLETE stage contract
 * 3. Every unbound inputField is classified (sequence_context vs truly unbound)
 *
 * Should run in tests and CI to catch binding drift.
 */

import type { BindingValidationReport, BindingValidationEntry } from "@/lib/types/pillar-maturity";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { getContracts } from "./contracts-loader";

/**
 * Known sequence-context fields — these are outputs from previous steps,
 * NOT pillar data. They're intentionally unbound.
 */
/**
 * Fields resolved by the GLOBAL_BINDINGS layer in sequence-executor.ts.
 * These are automatically resolved from pillar data for every tool.
 */
const GLOBAL_BINDING_FIELDS = new Set([
  "sector", "market", "platforms", "platform", "channel", "channels",
  "usage_contexts", "frequency", "deadline", "timeline", "references",
  "campaign_results", "hourly_cost",
]);

const KNOWN_SEQUENCE_FIELDS = new Set([
  "concept", "concepts_list", "script", "dialogue", "storyboard",
  "casting_brief", "sound_brief", "voiceover_brief", "social_copy_set",
  "story_sequence", "content_calendar", "community_playbook",
  "superfan_journey", "brand_rituals", "long_copy", "seo_report",
  "compliance_report", "print_ad_spec", "format_specs", "kv_brief",
  "kv_prompts_list", "kv_validation", "campaign_architecture",
  "direction_memo", "budget_optimization", "resource_plan",
  "digital_plan", "simulation_report", "coherence_report",
  "media_plan", "launch_timeline", "evaluation_matrix",
  "idea_triage", "presentation_strategy", "sales_deck",
  "name_proposals", "legal_check", "wordplay_bank",
  "moodboard_directions", "visual_landscape_map", "semiotic_analysis",
  "chromatic_strategy", "typography_system", "logo_proposals",
  "logo_validation", "design_tokens", "motion_guidelines",
  "brand_guidelines", "devis", "pricing_strategy",
  "duration", "format", "length", "episodes",
  "creative_work", "content", "scenario",
]);

/**
 * Check if a dot-path could resolve in a Zod schema.
 * Does a best-effort check: verifies the first-level field exists in the schema shape.
 */
function pathExistsInSchema(pillarKey: string, fieldPath: string): boolean {
  const schemaKey = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[schemaKey];
  if (!schema) return false;

  const topField = fieldPath.split(".")[0];
  if (!topField) return false;

  const shape = (schema as any).shape;
  return topField in shape;
}

/**
 * Validate all Glory tool bindings against schemas and contracts.
 */
export function validateAllBindings(): BindingValidationReport {
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ALL_GLORY_TOOLS } = require("@/server/services/glory-tools/registry");
  const contracts = getContracts();

  const entries: BindingValidationEntry[] = [];
  const orphanBindings: BindingValidationReport["orphanBindings"] = [];
  const missingBindings: BindingValidationReport["missingBindings"] = [];

  let pillarBound = 0;
  let sequenceContext = 0;
  let unbound = 0;

  for (const tool of ALL_GLORY_TOOLS) {
    const bindings = tool.pillarBindings ?? {};
    const inputFields: string[] = tool.inputFields ?? [];

    for (const field of inputFields) {
      const bindingPath = bindings[field] as string | undefined;

      if (bindingPath) {
        // This field has a pillar binding
        const dot = bindingPath.indexOf(".");
        const pillarKey = dot >= 0 ? bindingPath.slice(0, dot).toLowerCase() : "";
        const fieldPath = dot >= 0 ? bindingPath.slice(dot + 1) : "";

        const schemaValid = pathExistsInSchema(pillarKey, fieldPath);
        const contract = contracts[pillarKey];
        const contractCovered = contract
          ? contract.stages.COMPLETE.some(r => r.path === fieldPath || fieldPath.startsWith(r.path + "."))
          : false;

        if (!schemaValid) {
          orphanBindings.push({ toolSlug: tool.slug, field, path: bindingPath });
        }

        entries.push({
          toolSlug: tool.slug,
          inputField: field,
          bindingPath,
          schemaValid,
          contractCovered,
          classification: "pillar_bound",
        });
        pillarBound++;

      } else if (GLOBAL_BINDING_FIELDS.has(field)) {
        // Resolved by the global bindings layer in sequence-executor
        entries.push({
          toolSlug: tool.slug,
          inputField: field,
          bindingPath: `(global: ${field})`,
          schemaValid: true,
          contractCovered: true,
          classification: "pillar_bound",
        });
        pillarBound++;

      } else if (KNOWN_SEQUENCE_FIELDS.has(field)) {
        // Known sequence context field — intentionally unbound
        entries.push({
          toolSlug: tool.slug,
          inputField: field,
          bindingPath: null,
          schemaValid: true,
          contractCovered: true,
          classification: "sequence_context",
        });
        sequenceContext++;

      } else {
        // Truly unbound — should probably have a binding
        entries.push({
          toolSlug: tool.slug,
          inputField: field,
          bindingPath: null,
          schemaValid: false,
          contractCovered: false,
          classification: "unbound",
        });
        missingBindings.push({ toolSlug: tool.slug, field, suggestedPath: null });
        unbound++;
      }
    }
  }

  const total = pillarBound + sequenceContext + unbound;

  return {
    totalTools: ALL_GLORY_TOOLS.length,
    totalInputFields: total,
    pillarBound,
    sequenceContext,
    unbound,
    coveragePct: total > 0 ? Math.round(((pillarBound + sequenceContext) / total) * 100) : 100,
    orphanBindings,
    missingBindings,
    entries,
  };
}
