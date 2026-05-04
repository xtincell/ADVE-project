import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PAID_TIER_KEYS_DEFAULT,
  checkPaidTier,
  tierGateDenied,
} from "@/server/services/glory-tools/tier-gate";

vi.mock("@/lib/db", () => {
  const findFirst = vi.fn();
  return {
    db: {
      subscription: { findFirst },
    },
  };
});

import { db } from "@/lib/db";

const mockFindFirst = (db.subscription.findFirst as unknown as ReturnType<typeof vi.fn>);

describe("Glory Tools — Paid Tier Gate (Phase 16-A, ADR-0028)", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
  });

  it("PAID_TIER_KEYS_DEFAULT exclut INTAKE_PDF et ORACLE_FULL (one-shots)", () => {
    expect(PAID_TIER_KEYS_DEFAULT).toContain("COCKPIT_MONTHLY");
    expect(PAID_TIER_KEYS_DEFAULT).toContain("RETAINER_PRO");
    expect(PAID_TIER_KEYS_DEFAULT).not.toContain("INTAKE_PDF");
    expect(PAID_TIER_KEYS_DEFAULT).not.toContain("ORACLE_FULL");
  });

  it("checkPaidTier refuse si aucune subscription trouvée", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const r = await checkPaidTier("op-123");
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Aucune souscription active/);
    expect(r.configureUrl).toBe("/cockpit/subscription");
  });

  it("checkPaidTier accepte si subscription COCKPIT_MONTHLY active", async () => {
    mockFindFirst.mockResolvedValueOnce({ tierKey: "COCKPIT_MONTHLY", status: "active" });
    const r = await checkPaidTier("op-123");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("COCKPIT_MONTHLY");
  });

  it("checkPaidTier accepte le status `trialing`", async () => {
    mockFindFirst.mockResolvedValueOnce({ tierKey: "RETAINER_PRO", status: "trialing" });
    const r = await checkPaidTier("op-123");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("RETAINER_PRO");
  });

  it("checkPaidTier honore la liste override `allowedTiers`", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await checkPaidTier("op-123", ["RETAINER_ENTERPRISE"]);
    const call = mockFindFirst.mock.calls[0]?.[0];
    expect(call?.where?.tierKey?.in).toEqual(["RETAINER_ENTERPRISE"]);
  });

  it("tierGateDenied produit une sortie structurée standard", () => {
    const r = tierGateDenied("Higgsfield Soul réservé aux abonnements payants.");
    expect(r.status).toBe("TIER_GATE_DENIED");
    expect(r.reason).toMatch(/Higgsfield/);
    expect(r.configureUrl).toBe("/cockpit/subscription");
    expect(r.requiredTiers).toEqual(PAID_TIER_KEYS_DEFAULT);
  });

  it("tierGateDenied honore l'override `allowedTiers`", () => {
    const r = tierGateDenied("custom", ["RETAINER_PRO"]);
    expect(r.requiredTiers).toEqual(["RETAINER_PRO"]);
  });
});
