/**
 * Phase 23 Pattern P22-1 — ConnectorResult<T> discriminated union enforcement.
 *
 * **HARD mode** activated Epic 2 Story 2.5 — no baseline allowed, any violation
 * fails CI. Replaces the Epic 1 Story 1.7 scaffold (it.todo placeholders).
 *
 * # What this test enforces
 *
 * 1. Phase 23 connector façades — `services/seshat/tarsis/connector.ts` and
 *    `services/anubis/providers/crm-provider.ts` — exist and export the
 *    canonical fetch / test functions, AND their bodies use the
 *    `ConnectorResult<T>` discriminator (LIVE / DEFERRED_AWAITING_CREDENTIALS /
 *    DEGRADED) — at least once, with all three branches covered.
 *
 * 2. Neither façade file swallows a caught transport error into a `LIVE`
 *    result. The catch-block of every fetch-style function returns DEGRADED
 *    or re-throws — never reaches a `return { state: "LIVE", ... }` after
 *    catching.
 *
 * 3. The shared `src/domain/connector-result.ts` defines the canonical type
 *    union (sanity check — if it disappears, the whole pattern collapses).
 *
 * # Rationale
 *
 * Pattern P22-1 (cf. ADR-0077, ADR-0079) is the load-bearing primitive that
 * makes ship-without-keys + no-magic-fallback structurally enforceable for
 * Phase 23 — and any future read-only signal connector that follows the
 * pattern. Once HARD, no PR can add a connector that returns `null` or fakes
 * `LIVE` on transient failure.
 *
 * Cf. `src/domain/connector-result.ts`, ADR-0077 + ADR-0079, architecture P22-1.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

const TARSIS_CONNECTOR = path.join(
  REPO_ROOT,
  "src/server/services/seshat/tarsis/connector.ts",
);
const CRM_PROVIDER = path.join(
  REPO_ROOT,
  "src/server/services/anubis/providers/crm-provider.ts",
);
const CONNECTOR_RESULT = path.join(REPO_ROOT, "src/domain/connector-result.ts");

describe("Phase 23 P22-1 — ConnectorResult<T> enforcement (HARD)", () => {
  it("ConnectorResult<T> type exists in src/domain/", () => {
    expect(fs.existsSync(CONNECTOR_RESULT)).toBe(true);
    const src = fs.readFileSync(CONNECTOR_RESULT, "utf8");
    // Type union must declare all three states explicitly — discriminator
    // is the `state` field with three literal branches.
    expect(src).toMatch(/state:\s*"LIVE"/);
    expect(src).toMatch(/state:\s*"DEFERRED_AWAITING_CREDENTIALS"/);
    expect(src).toMatch(/state:\s*"DEGRADED"/);
    expect(src).toMatch(/export type ConnectorResult/);
  });

  // Tarsis n'est plus credential-gated depuis le de-mock 2026-06-14 (ADR-0095
  // suite) : il dérive ses signaux des digests RSS réels (owned data), donc plus
  // de branche DEFERRED — il LIVE sur données réelles ou DEGRADE. Les connecteurs
  // réellement tiers (CRM) gardent les trois états (ship-without-keys).
  for (const [label, file, credentialGated] of [
    ["seshat/tarsis/connector", TARSIS_CONNECTOR, false],
    ["anubis/providers/crm-provider", CRM_PROVIDER, true],
  ] as const) {
    describe(label, () => {
      it("file exists at canonical path", () => {
        expect(fs.existsSync(file)).toBe(true);
      });

      it("imports ConnectorResult from the canonical domain module", () => {
        const src = fs.readFileSync(file, "utf8");
        // Either a value-import or a type-import is fine ; what matters is
        // that the symbol is sourced from `@/domain` (the barrel) and not
        // re-declared locally.
        expect(src).toMatch(
          /import\s+(?:type\s+)?\{[^}]*\bConnectorResult\b[^}]*\}\s+from\s+["']@\/domain["']/,
        );
      });

      it("covers the applicable ConnectorResult states (LIVE + DEGRADED ; +DEFERRED si credential-gated)", () => {
        const src = fs.readFileSync(file, "utf8");
        // Tout connecteur doit pouvoir LIVE (donnée réelle) et DEGRADE (pas de
        // zéro silencieux). DEFERRED n'est requis que pour les connecteurs tiers
        // réellement gated par une credential (CRM) — Tarsis tourne sur RSS owned.
        expect(src).toMatch(/state:\s*"LIVE"/);
        expect(src).toMatch(/state:\s*"DEGRADED"/);
        if (credentialGated) {
          expect(src).toMatch(/state:\s*"DEFERRED_AWAITING_CREDENTIALS"/);
        }
      });

      it("does NOT swallow a caught transport error into LIVE", () => {
        const src = fs.readFileSync(file, "utf8");
        // Heuristic AST-free check : every `catch` block in the file is
        // followed (before the next closing brace) by a `state: "DEGRADED"`
        // return or a `throw`. This is the rule of P22-1 invariant 2 :
        // transient failure → DEGRADED, never silently → LIVE.
        const catchBlocks = src.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\n\s{2,4}\}/g);
        for (const match of catchBlocks) {
          const body = match[1] ?? "";
          const containsDegraded = /state:\s*"DEGRADED"/.test(body);
          const containsThrow = /\bthrow\b/.test(body);
          const containsLive = /state:\s*"LIVE"/.test(body);
          // Forbid catch → LIVE.
          expect(containsLive).toBe(false);
          // Require catch → DEGRADED OR throw.
          expect(containsDegraded || containsThrow).toBe(true);
        }
      });
    });
  }
});
