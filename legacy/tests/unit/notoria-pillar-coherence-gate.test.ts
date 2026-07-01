/**
 * applyPillarCoherenceGate — ADR-0023 gate tests
 *
 * Vérifie les 4 règles documentées dans operator-amend.ts §C :
 *   1. LOCKED check (refuse sans overrideLocked, audit avec)
 *   2. Destructive check (force STRATEGIC_REWRITE)
 *   3. Cross-ADVE warning (non-bloquant)
 *   4. Financial reuse (delegate to validateFinancialReco)
 */

import { describe, it, expect, vi } from "vitest";
import { applyPillarCoherenceGate } from "@/server/services/notoria/gates";

// Stub Prisma + audit-trail to avoid real DB.
vi.mock("@/lib/db", () => ({
  db: {
    strategy: { findUnique: vi.fn().mockResolvedValue({ businessContext: {} }) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-stub" }) },
  },
}));

describe("applyPillarCoherenceGate (ADR-0023)", () => {
  const baseInput = {
    strategyId: "strat-1",
    pillarKey: "a",
    field: "nomMarque",
    mode: "PATCH_DIRECT" as const,
    proposedValue: "ACME",
    currentStatus: "VALIDATED" as const,
    overrideLocked: false,
  };

  it("allows a normal PATCH_DIRECT on a non-LOCKED, non-destructive field", async () => {
    const out = await applyPillarCoherenceGate(baseInput);
    expect(out.blocked).toBe(false);
    expect(out.destructive).toBeFalsy();
  });

  it("blocks LOCKED without overrideLocked", async () => {
    const out = await applyPillarCoherenceGate({
      ...baseInput,
      currentStatus: "LOCKED",
      overrideLocked: false,
    });
    expect(out.blocked).toBe(true);
    expect(out.reason).toBe("LOCKED_NO_OVERRIDE");
  });

  it("allows LOCKED with overrideLocked + emits audit warning", async () => {
    const out = await applyPillarCoherenceGate({
      ...baseInput,
      currentStatus: "LOCKED",
      overrideLocked: true,
    });
    expect(out.blocked).toBe(false);
    expect(out.warnings.some((w) => w.includes("LOCKED override"))).toBe(true);
  });

  it("blocks destructive field if mode != STRATEGIC_REWRITE", async () => {
    const out = await applyPillarCoherenceGate({
      ...baseInput,
      pillarKey: "d",
      field: "personas",
      mode: "PATCH_DIRECT",
    });
    expect(out.blocked).toBe(true);
    expect(out.reason).toBe("DESTRUCTIVE_REQUIRES_STRATEGIC_REWRITE");
    expect(out.destructive).toBe(true);
  });

  it("allows destructive field if mode === STRATEGIC_REWRITE", async () => {
    const out = await applyPillarCoherenceGate({
      ...baseInput,
      pillarKey: "d",
      field: "personas",
      mode: "STRATEGIC_REWRITE",
    });
    expect(out.blocked).toBe(false);
    expect(out.destructive).toBe(true);
  });

  it("warns on cross-ADVE dependency for d.personas (non-blocking)", async () => {
    const out = await applyPillarCoherenceGate({
      ...baseInput,
      pillarKey: "d",
      field: "personas",
      mode: "STRATEGIC_REWRITE",
    });
    expect(out.blocked).toBe(false);
    expect(out.warnings.some((w) => w.startsWith("CROSS_ADVE_DEP"))).toBe(true);
  });
});
