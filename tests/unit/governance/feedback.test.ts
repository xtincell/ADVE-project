/**
 * ADR-0155 — Canal feedback testeurs : verrous.
 *  1. Single-writer `Feedback` (seul `services/tester-feedback/`).
 *  2. Kinds `SUBMIT_FEEDBACK`/`TRIAGE_FEEDBACK` catalogués (governor INFRASTRUCTURE)
 *     + SLO présent.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const SERVICE_DIR = "src/server/services/tester-feedback/";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

describe("ADR-0155 — single-writer Feedback", () => {
  it("aucune écriture feedback.create/update hors de tester-feedback/", () => {
    const re = /\bfeedback\s*\.\s*(create|createMany|update|updateMany|upsert|delete)\s*\(/;
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel.startsWith(SERVICE_DIR)) continue;
      // `feedback-loop`/`feedback-processor` = autres concepts (pas le modèle Feedback).
      if (re.test(readFileSync(file, "utf8"))) violations.push(rel);
    }
    expect(violations, `écritures hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("ADR-0155 — kinds catalogués + SLO", () => {
  for (const kind of ["SUBMIT_FEEDBACK", "TRIAGE_FEEDBACK"] as const) {
    it(`${kind} : governor INFRASTRUCTURE + SLO`, () => {
      const meta = INTENT_KINDS.find((k) => k.kind === kind);
      expect(meta, `${kind} absent du catalogue`).toBeTruthy();
      expect(meta!.governor).toBe("INFRASTRUCTURE");
      expect(INTENT_SLOS.some((s) => s.kind === kind), `${kind} sans SLO`).toBe(true);
    });
  }
});
