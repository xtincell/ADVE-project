/**
 * Execution Journal — Structured logging for Glory sequence execution.
 *
 * Writes granular step-by-step logs to:
 *   1. Console (structured, prefixed)
 *   2. A rolling log file at logs/glory-execution.jsonl (one JSON line per event)
 *
 * Events:
 *   SEQ_START   — sequence begins
 *   SEQ_END     — sequence completes
 *   STEP_START  — step begins execution
 *   STEP_OK     — step succeeded
 *   STEP_FAIL   — step failed (includes error)
 *   STEP_SKIP   — step skipped (PLANNED)
 *   PREFLIGHT   — preflight scan result
 *   SCORE       — score recalculation result
 *   AI_CALL     — LLM call (model, tokens, duration)
 *   WARN        — non-fatal warning
 */

import fs from "fs";
import path from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export type JournalEvent =
  | "SEQ_START" | "SEQ_END"
  | "STEP_START" | "STEP_OK" | "STEP_FAIL" | "STEP_SKIP"
  | "PREFLIGHT" | "SCORE" | "AI_CALL" | "WARN";

export interface JournalEntry {
  ts: string;
  event: JournalEvent;
  sequenceKey: string;
  strategyId: string;
  stepIndex?: number;
  stepRef?: string;
  stepType?: string;
  durationMs?: number;
  error?: string;
  meta?: Record<string, unknown>;
}

// ─── Journal Class ──────────────────────────────────────────────────────────

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "glory-execution.jsonl");
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB — rotate after this

class ExecutionJournal {
  private sequenceKey = "";
  private strategyId = "";
  private buffer: JournalEntry[] = [];

  /** Start tracking a sequence */
  begin(sequenceKey: string, strategyId: string) {
    this.sequenceKey = sequenceKey;
    this.strategyId = strategyId;
    this.buffer = [];
    this.log("SEQ_START", {});
  }

  /** Log a step starting */
  stepStart(stepIndex: number, stepRef: string, stepType: string) {
    this.log("STEP_START", { stepIndex, stepRef, stepType });
  }

  /** Log a step succeeding */
  stepOk(stepIndex: number, stepRef: string, stepType: string, durationMs: number, meta?: Record<string, unknown>) {
    this.log("STEP_OK", { stepIndex, stepRef, stepType, durationMs, meta });
  }

  /** Log a step failing */
  stepFail(stepIndex: number, stepRef: string, stepType: string, durationMs: number, error: string) {
    this.log("STEP_FAIL", { stepIndex, stepRef, stepType, durationMs, error });
  }

  /** Log a step skipped */
  stepSkip(stepIndex: number, stepRef: string, reason: string) {
    this.log("STEP_SKIP", { stepIndex, stepRef, meta: { reason } });
  }

  /** Log preflight result */
  preflight(blockers: number, warnings: number, readiness: number) {
    this.log("PREFLIGHT", { meta: { blockers, warnings, readiness } });
  }

  /** Log score recalculation */
  score(composite: number | null, error?: string) {
    this.log("SCORE", { meta: { composite }, error });
  }

  /** Log AI call details */
  aiCall(model: string, inputTokens: number, outputTokens: number, durationMs: number) {
    this.log("AI_CALL", { durationMs, meta: { model, inputTokens, outputTokens } });
  }

  /** Log a warning */
  warn(message: string, meta?: Record<string, unknown>) {
    this.log("WARN", { error: message, meta });
  }

  /** End the sequence — flush to disk */
  end(status: string, totalDurationMs: number, successCount: number, totalSteps: number) {
    this.log("SEQ_END", { durationMs: totalDurationMs, meta: { status, successCount, totalSteps } });
    this.flush();
  }

  /** Get all entries for this sequence (for returning to UI) */
  getEntries(): JournalEntry[] {
    return [...this.buffer];
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private log(event: JournalEvent, data: Partial<JournalEntry>) {
    const entry: JournalEntry = {
      ts: new Date().toISOString(),
      event,
      sequenceKey: this.sequenceKey,
      strategyId: this.strategyId,
      ...data,
    };

    this.buffer.push(entry);

    // Console output — structured and easy to grep
    const prefix = `[glory:${this.sequenceKey}]`;
    const stepInfo = entry.stepRef ? ` [${entry.stepIndex}:${entry.stepType}:${entry.stepRef}]` : "";
    const duration = entry.durationMs ? ` ${(entry.durationMs / 1000).toFixed(1)}s` : "";
    const error = entry.error ? ` ERROR: ${entry.error}` : "";
    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";

    switch (event) {
      case "SEQ_START":
        console.log(`${prefix} ▶ START strategy=${this.strategyId}`);
        break;
      case "SEQ_END":
        console.log(`${prefix} ■ END ${entry.meta?.status}${duration} (${entry.meta?.successCount}/${entry.meta?.totalSteps} steps)`);
        break;
      case "STEP_START":
        console.log(`${prefix}${stepInfo} → start`);
        break;
      case "STEP_OK":
        console.log(`${prefix}${stepInfo} ✓ ok${duration}${meta}`);
        break;
      case "STEP_FAIL":
        console.error(`${prefix}${stepInfo} ✕ FAIL${duration}${error}`);
        break;
      case "STEP_SKIP":
        console.log(`${prefix}${stepInfo} – skip${meta}`);
        break;
      case "PREFLIGHT":
        console.log(`${prefix} preflight${meta}`);
        break;
      case "SCORE":
        console.log(`${prefix} score${meta}${error}`);
        break;
      case "AI_CALL":
        console.log(`${prefix} ai${duration}${meta}`);
        break;
      case "WARN":
        console.warn(`${prefix} ⚠ ${entry.error}${meta}`);
        break;
    }
  }

  private flush() {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      // Rotate if too large
      try {
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
          const rotated = LOG_FILE.replace(".jsonl", `.${Date.now()}.jsonl`);
          fs.renameSync(LOG_FILE, rotated);
        }
      } catch { /* file doesn't exist yet */ }

      // Append all entries as JSONL
      const lines = this.buffer.map(e => JSON.stringify(e)).join("\n") + "\n";
      fs.appendFileSync(LOG_FILE, lines, "utf8");
    } catch (err) {
      console.warn("[journal] Failed to flush to disk:", err instanceof Error ? err.message : err);
    }
  }
}

/** Create a new journal instance for a sequence execution */
export function createJournal(): ExecutionJournal {
  return new ExecutionJournal();
}
