import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PAID_TIER_KEYS_DEFAULT,
  checkPaidTier,
  tierGateDenied,
} from "@/server/services/glory-tools/tier-gate";

vi.mock("@/lib/db", () => {
  return {
    db: {
      subscription: { findFirst: vi.fn() },
      user: { findFirst: vi.fn() },
    },
  };
});

import { db } from "@/lib/db";

const mockFindFirst = (db.subscription.findFirst as unknown as ReturnType<typeof vi.fn>);
const mockUserFindFirst = (db.user.findFirst as unknown as ReturnType<typeof vi.fn>);

// ── F5 — per-brand scoping test harness ─────────────────────────────────────
// Faithful evaluation of the EXACT `where` shape checkPaidTier builds, so a
// single mocked findFirst behaves like the DB for the OR/AND scoping logic.
type SubRow = { tierKey: string; status: string; strategyId: string | null; currentPeriodEnd: Date | null };
type GraceClause = { currentPeriodEnd: null } | { currentPeriodEnd: { gte: Date } };
type ScopeClause = { strategyId: string | null } | { tierKey: { in: string[] } };
type TierWhere = {
  status: { in: string[] };
  tierKey: { in: string[] };
  OR: GraceClause[];
  AND?: Array<{ OR: ScopeClause[] }>;
};

function evalWhere(sub: SubRow, where: TierWhere): boolean {
  if (!where.status.in.includes(sub.status)) return false;
  if (!where.tierKey.in.includes(sub.tierKey)) return false;
  // top-level grace-period OR
  const graceOk = where.OR.some((c) => {
    if (c.currentPeriodEnd === null) return sub.currentPeriodEnd === null;
    return sub.currentPeriodEnd !== null && sub.currentPeriodEnd >= c.currentPeriodEnd.gte;
  });
  if (!graceOk) return false;
  // nested brand-scope OR — present ONLY when a strategyId was passed
  for (const clause of where.AND ?? []) {
    const ok = clause.OR.some((c) => {
      if ("strategyId" in c) return c.strategyId === null ? sub.strategyId === null : sub.strategyId === c.strategyId;
      return c.tierKey.in.includes(sub.tierKey);
    });
    if (!ok) return false;
  }
  return true;
}

function installDb(rows: SubRow[]) {
  mockFindFirst.mockImplementation((args: { where: TierWhere }) => {
    const hit = rows.find((r) => evalWhere(r, args.where));
    return Promise.resolve(hit ? { tierKey: hit.tierKey, status: hit.status } : null);
  });
}

describe("Glory Tools — Paid Tier Gate (Phase 16-A, ADR-0048)", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockUserFindFirst.mockReset();
    mockUserFindFirst.mockResolvedValue(null); // non-god operator by default
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
    expect(r.configureUrl).toBe("/pricing");
  });

  it("god mode — un operator founder bypasse le tier gate sans subscription", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockUserFindFirst.mockResolvedValueOnce({ email: "alexandre@upgraders.com" });
    const r = await checkPaidTier("op-god");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("GOD_MODE");
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
    expect(r.configureUrl).toBe("/pricing");
    expect(r.requiredTiers).toEqual(PAID_TIER_KEYS_DEFAULT);
  });

  it("tierGateDenied honore l'override `allowedTiers`", () => {
    const r = tierGateDenied("custom", ["RETAINER_PRO"]);
    expect(r.requiredTiers).toEqual(["RETAINER_PRO"]);
  });

  // ── F5 — per-brand scoping ────────────────────────────────────────────────

  it("F5 (a) — legacy strategyId=null sub grants access for an ARBITRARY brand (backward-compat)", async () => {
    installDb([{ tierKey: "COCKPIT_MONTHLY", status: "active", strategyId: null, currentPeriodEnd: null }]);
    const r = await checkPaidTier("op-123", undefined, "brand-anything");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("COCKPIT_MONTHLY");
    // grep-proof : l'OR de scope inclut bien { strategyId: null } → operator-wide.
    const where = mockFindFirst.mock.calls[0]?.[0]?.where;
    expect(where.AND[0].OR).toContainEqual({ strategyId: null });
  });

  it("F5 (b) — brand-scoped sub grants THAT brand only, denies another brand of the same operator", async () => {
    installDb([{ tierKey: "COCKPIT_MONTHLY", status: "active", strategyId: "brand-A", currentPeriodEnd: null }]);
    const granted = await checkPaidTier("op-123", undefined, "brand-A");
    expect(granted.allowed).toBe(true);
    expect(granted.matchedTier).toBe("COCKPIT_MONTHLY");
    const denied = await checkPaidTier("op-123", undefined, "brand-B");
    expect(denied.allowed).toBe(false);
  });

  it("F5 (c) — no strategyId ⇒ where unchanged (no brand constraint, operator-wide)", async () => {
    // Même un sub scopé matche quand aucun strategyId n'est fourni (pré-F5).
    installDb([{ tierKey: "RETAINER_PRO", status: "active", strategyId: "brand-A", currentPeriodEnd: null }]);
    const r = await checkPaidTier("op-123");
    expect(r.allowed).toBe(true);
    const where = mockFindFirst.mock.calls[0]?.[0]?.where;
    expect(where.AND).toBeUndefined(); // aucune contrainte de marque ajoutée
    expect(where.OR).toContainEqual({ currentPeriodEnd: null }); // OR grâce intact
  });

  it("F5 (d) — god-mode bypass intact even with a brand scope (no sub)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockUserFindFirst.mockResolvedValueOnce({ email: "alexandre@upgraders.com" });
    const r = await checkPaidTier("op-god", undefined, "brand-any");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("GOD_MODE");
  });

  it("F5 — RETAINER_ENTERPRISE (multi-brand) is never restricted to a single brand", async () => {
    // Sub enterprise scopé à brand-A → doit quand même débloquer brand-B.
    installDb([{ tierKey: "RETAINER_ENTERPRISE", status: "active", strategyId: "brand-A", currentPeriodEnd: null }]);
    const r = await checkPaidTier("op-123", undefined, "brand-B");
    expect(r.allowed).toBe(true);
    expect(r.matchedTier).toBe("RETAINER_ENTERPRISE");
  });
});
