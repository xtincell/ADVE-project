/**
 * One-off: flip the live ModelPolicy[final-report] row to pipelineVersion=V3.
 *
 * Goes through the proper governance path:
 *   Mestor.emitIntent({ kind: "UPDATE_MODEL_POLICY", ... })
 *     → Artemis dispatcher
 *     → model-policy.updatePolicy()
 *     → Prisma write + cache invalidate
 *     → IntentEmission row (hash-chained audit trail)
 *
 * Idempotent — safe to re-run. Reads the current row first; if already V3 with
 * the desired model values, no-op. Otherwise emits the intent.
 */

// Inline .env loader — defeats Claude Code subshell ANTHROPIC_API_KEY="" pollution.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
for (const file of [".env", ".env.local"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

(async () => {
  // Dynamic imports — must run AFTER the env loader above so that the LLM
  // gateway / db / mestor-emit modules see the loaded process.env.
  const { db } = await import("../src/lib/db");
  const { emitIntent } = await import("../src/server/services/mestor/intents");

  try {
    const before = (await (db as unknown as {
      modelPolicy: {
        findUnique: (a: { where: { purpose: string } }) => Promise<{
          purpose: string;
          pipelineVersion: string;
          anthropicModel: string;
          ollamaModel: string | null;
          allowOllamaSubstitution: boolean;
          notes: string | null;
          version: number;
        } | null>;
      };
    }).modelPolicy.findUnique({ where: { purpose: "final-report" } }));

    if (!before) {
      console.error("[flip] no policy row for purpose='final-report' — run seed-model-policy first.");
      process.exit(1);
    }
    console.log(`[flip] before: pipeline=${before.pipelineVersion} anthropic=${before.anthropicModel} version=${before.version}`);

    if (before.pipelineVersion === "V3") {
      console.log("[flip] already V3 — no-op.");
      return;
    }

    // Emit through Mestor → Artemis → model-policy.updatePolicy.
    // The Artemis dispatcher (commandant.ts case "UPDATE_MODEL_POLICY") writes
    // the row, invalidates the cache, and the IntentEmission row records the
    // mutation in the hash-chained audit trail.
    const result = await emitIntent(
      {
        kind: "UPDATE_MODEL_POLICY",
        strategyId: "(governance)", // sentinel for system-wide intents
        purpose: "final-report",
        anthropicModel: before.anthropicModel,
        ollamaModel: before.ollamaModel,
        allowOllamaSubstitution: before.allowOllamaSubstitution,
        pipelineVersion: "V3",
        notes:
          (before.notes ? before.notes + "\n\n" : "") +
          `Flipped to V3 (RTIS-first pipeline) — bench SPAWT 2026-04-30: 94% verbatim coverage vs 2% V1.`,
        updatedBy: "system:flip-final-report-v3",
      },
      { caller: "scripts/flip-final-report-v3" },
    );

    if (result.status === "OK") {
      console.log(`[flip] ✓ ${result.summary}`);
    } else {
      console.error(`[flip] intent status=${result.status}:`, result.summary, result.reason ?? "");
      process.exit(1);
    }
  } finally {
    await db.$disconnect();
  }
})();
