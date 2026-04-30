/**
 * scripts/seed-model-policy.ts
 *
 * Seeds the canonical `purpose → model` policy. Runs idempotently — safe
 * to invoke on every deploy. Each entry mirrors `FALLBACK` in
 * model-policy/index.ts; the table's purpose is to make these values
 * mutable AT RUNTIME via UPDATE_MODEL_POLICY without code changes.
 *
 * `pipelineVersion` for `final-report` is V3 — the RTIS-first pipeline:
 * upstream ADVE narration (DB-verbatim) → RAG-grounded RTIS draft → Sonnet
 * tension synthesis → Opus single-pass diagnostic + recommendation. V1 is
 * kept as the safe in-code fallback for DB outages.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface SeedRow {
  purpose: string;
  anthropicModel: string;
  ollamaModel: string | null;
  allowOllamaSubstitution: boolean;
  pipelineVersion: "V1" | "V2" | "V3";
  notes: string;
}

const SEEDS: ReadonlyArray<SeedRow> = [
  {
    purpose: "final-report",
    anthropicModel: "claude-opus-4-20250514",
    ollamaModel: null,
    allowOllamaSubstitution: false,
    pipelineVersion: "V3",
    notes: "Final written deliverables (intake narrative, Oracle synthesis). Always Opus — never substitute. V3 = RTIS-first: upstream ADVE narration (DB-verbatim) → RAG-grounded RTIS draft → tension synthesis → Opus diagnostic + recommendation block. Bench (SPAWT, 2026-04-30): 94% verbatim coverage vs 2% V1.",
  },
  {
    purpose: "agent",
    anthropicModel: "claude-sonnet-4-20250514",
    ollamaModel: "llama3.1:70b",
    allowOllamaSubstitution: true,
    pipelineVersion: "V1",
    notes: "Background reasoning for recommendations, narrative section drafting, brand-level evaluation, batch tooling. Ollama substitutes when configured to preserve Anthropic budget.",
  },
  {
    purpose: "intermediate",
    anthropicModel: "claude-sonnet-4-20250514",
    ollamaModel: "llama3.1:70b",
    allowOllamaSubstitution: true,
    pipelineVersion: "V1",
    notes: "Synonym of `agent` — kept distinct so future policy can diverge (e.g. promote `agent` to Opus while keeping `intermediate` on Sonnet).",
  },
  {
    purpose: "intake-followup",
    anthropicModel: "claude-haiku-4-5-20251001",
    ollamaModel: "llama3.1:8b",
    allowOllamaSubstitution: true,
    pipelineVersion: "V1",
    notes: "Adaptive question generation during the public intake funnel — high volume, throwaway. Haiku as the cheap default; Ollama 8B substitutes when local server is up.",
  },
  {
    purpose: "extraction",
    anthropicModel: "claude-sonnet-4-20250514",
    ollamaModel: "llama3.1:70b",
    allowOllamaSubstitution: true,
    pipelineVersion: "V1",
    notes: "Structured-data extraction from user free-form text (parsing intake responses into pillar fields, classifying signals).",
  },
];

async function main() {
  console.log(`[seed-model-policy] seeding ${SEEDS.length} policies (idempotent upsert)...`);
  const writer = (db as unknown as { modelPolicy: { upsert: (a: unknown) => Promise<unknown> } }).modelPolicy;
  for (const s of SEEDS) {
    await writer.upsert({
      where: { purpose: s.purpose },
      update: {}, // do NOT overwrite operator-set values on re-seed
      create: {
        purpose: s.purpose,
        anthropicModel: s.anthropicModel,
        ollamaModel: s.ollamaModel,
        allowOllamaSubstitution: s.allowOllamaSubstitution,
        pipelineVersion: s.pipelineVersion,
        notes: s.notes,
        updatedBy: "system:seed-model-policy",
        version: 1,
      },
    });
    console.log(`  ✓ ${s.purpose} → ${s.anthropicModel}${s.ollamaModel ? ` (or ${s.ollamaModel} via Ollama)` : ""}`);
  }
  console.log("[seed-model-policy] done.");
}

main()
  .catch((err) => {
    console.error("[seed-model-policy] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
