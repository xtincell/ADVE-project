/**
 * Phase 23 Pattern P22-1 — ConnectorResult<T> discriminated union enforcement.
 *
 * Activated **HARD** in Epic 2 Story 2.5 against the live Tarsis + CRM connector
 * façades. Scaffolded here at baseline (no assertions yet) per Epic 1 Story 1.7
 * — gives CI a stable file to track even while the façades are being implemented.
 *
 * When activated, this test asserts :
 *   1. Every export under `services/seshat/tarsis/` and
 *      `services/anubis/providers/` whose name matches a connector-fetch pattern
 *      returns `ConnectorResult<T>` (or a compatible discriminated union).
 *   2. No file under those directories contains a `try`/`catch` swallowing
 *      a transport error into a `LIVE` result (pattern check via AST or regex).
 *   3. Mode HARD — any new violation fails CI immediately.
 *
 * Cf. `src/domain/connector-result.ts`, ADR-0079, architecture P22-1.
 */

import { describe, it } from "vitest";

describe("Phase 23 P22-1 — ConnectorResult<T> enforcement", () => {
  it.todo("activated Epic 2 Story 2.5 — Tarsis + CRM façades return ConnectorResult<T>");
  it.todo("activated Epic 2 Story 2.5 — no try/catch swallowing transient into LIVE");
});
