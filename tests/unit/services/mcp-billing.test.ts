/**
 * Vague 5 — MCP billable + cycles d'abonnement manuels.
 *
 * Vérifie la mécanique déterministe de facturation :
 *   - billable = max(0, calls − franchise) × tarif (jamais négatif) ;
 *   - relevé gelé à l'émission, WAIVED sous franchise, double émission refusée ;
 *   - extension de cycle +30 j, renouvellement anticipé depuis la fin de
 *     période courante, idempotence sur webhook rejoué ;
 *   - aucun LLM dans le chemin de facturation (scan statique).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  apiKeyFindUnique: vi.fn(),
  apiKeyFindUniqueOrThrow: vi.fn(),
  apiKeyUpdate: vi.fn(),
  apiCallCount: vi.fn(),
  apiCallCreate: vi.fn(),
  stmtFindUnique: vi.fn(),
  stmtCreate: vi.fn(),
  stmtUpdate: vi.fn(),
  stmtFindUniqueOrThrow: vi.fn(),
  subFindUnique: vi.fn(),
  subUpdate: vi.fn(),
  intakeFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    mcpApiKey: {
      findUnique: mocks.apiKeyFindUnique,
      findUniqueOrThrow: mocks.apiKeyFindUniqueOrThrow,
      update: mocks.apiKeyUpdate,
    },
    mcpApiCall: { count: mocks.apiCallCount, create: mocks.apiCallCreate },
    mcpUsageStatement: {
      findUnique: mocks.stmtFindUnique,
      create: mocks.stmtCreate,
      update: mocks.stmtUpdate,
      findUniqueOrThrow: mocks.stmtFindUniqueOrThrow,
    },
    subscription: { findUnique: mocks.subFindUnique, update: mocks.subUpdate },
    intakePayment: { findUnique: mocks.intakeFindUnique },
  },
}));

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn().mockResolvedValue(null) }));

import {
  currentPeriod,
  getCurrentUsage,
  issueStatement,
} from "@/server/services/anubis/mcp-billing";
import { applySubscriptionCycleIfPaid } from "@/server/services/payment-providers/subscription-cycles";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("currentPeriod — période UTC déterministe", () => {
  it("formate YYYY-MM", () => {
    expect(currentPeriod(new Date(Date.UTC(2026, 5, 12)))).toBe("2026-06");
    expect(currentPeriod(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
    expect(currentPeriod(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe("2026-12");
  });
});

describe("getCurrentUsage — franchise et tarif", () => {
  it("billable = max(0, calls − franchise) × tarif", async () => {
    mocks.apiKeyFindUniqueOrThrow.mockResolvedValue({
      id: "key-1",
      ratePerCallUsd: 0.002,
      includedMonthlyCalls: 100,
    });
    mocks.apiCallCount.mockResolvedValue(350);

    const usage = await getCurrentUsage("key-1", "2026-06");
    expect(usage.billableCalls).toBe(250);
    expect(usage.costUsd).toBe(0.5);
  });

  it("sous la franchise → 0 facturable, jamais négatif", async () => {
    mocks.apiKeyFindUniqueOrThrow.mockResolvedValue({
      id: "key-1",
      ratePerCallUsd: 0.01,
      includedMonthlyCalls: 100,
    });
    mocks.apiCallCount.mockResolvedValue(40);

    const usage = await getCurrentUsage("key-1", "2026-06");
    expect(usage.billableCalls).toBe(0);
    expect(usage.costUsd).toBe(0);
  });
});

describe("issueStatement — gel du relevé", () => {
  it("refuse la double émission (idempotence)", async () => {
    mocks.stmtFindUnique.mockResolvedValue({ id: "st-1", status: "ISSUED" });
    await expect(issueStatement("key-1", "2026-05")).rejects.toThrow(/déjà émis/);
    expect(mocks.stmtCreate).not.toHaveBeenCalled();
  });

  it("gèle ISSUED quand facturable, WAIVED sous franchise", async () => {
    mocks.stmtFindUnique.mockResolvedValue(null);
    mocks.apiKeyFindUniqueOrThrow.mockResolvedValue({
      id: "key-1",
      ratePerCallUsd: 0.002,
      includedMonthlyCalls: 100,
    });
    mocks.apiCallCount.mockResolvedValue(150);
    mocks.stmtCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "st-new", ...data }),
    );

    await issueStatement("key-1", "2026-05");
    expect(mocks.stmtCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ISSUED", billableCalls: 50, costUsd: 0.1 }),
      }),
    );

    mocks.apiCallCount.mockResolvedValue(60); // sous franchise
    await issueStatement("key-1", "2026-04");
    expect(mocks.stmtCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "WAIVED", billableCalls: 0, costUsd: 0 }),
      }),
    );
  });
});

describe("applySubscriptionCycleIfPaid — extension de période", () => {
  const PAID_AT = new Date("2026-06-12T10:00:00Z");

  it("no-op si le paiement n'est pas lié à une subscription", async () => {
    mocks.intakeFindUnique.mockResolvedValue({ status: "PAID", subscriptionId: null, paidAt: PAID_AT });
    await applySubscriptionCycleIfPaid("REF-1");
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("no-op si le paiement n'est pas PAID", async () => {
    mocks.intakeFindUnique.mockResolvedValue({ status: "PENDING", subscriptionId: "sub-1", paidAt: null });
    await applySubscriptionCycleIfPaid("REF-1");
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("première activation : période = paidAt → paidAt + 30 j", async () => {
    mocks.intakeFindUnique.mockResolvedValue({ status: "PAID", subscriptionId: "sub-1", paidAt: PAID_AT });
    mocks.subFindUnique.mockResolvedValue({
      id: "sub-1",
      status: "unpaid",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      providerSnapshot: null,
    });
    mocks.subUpdate.mockResolvedValue({});

    await applySubscriptionCycleIfPaid("REF-1");
    const arg = mocks.subUpdate.mock.calls[0]![0] as { data: { status: string; currentPeriodEnd: Date } };
    expect(arg.data.status).toBe("active");
    const expectedEnd = new Date(PAID_AT.getTime() + 30 * 24 * 3600 * 1000);
    expect(arg.data.currentPeriodEnd.toISOString()).toBe(expectedEnd.toISOString());
  });

  it("renouvellement anticipé : étend depuis la fin de période courante (aucun jour perdu)", async () => {
    const futureEnd = new Date(PAID_AT.getTime() + 10 * 24 * 3600 * 1000);
    mocks.intakeFindUnique.mockResolvedValue({ status: "PAID", subscriptionId: "sub-1", paidAt: PAID_AT });
    mocks.subFindUnique.mockResolvedValue({
      id: "sub-1",
      status: "active",
      currentPeriodStart: new Date("2026-05-23T10:00:00Z"),
      currentPeriodEnd: futureEnd,
      providerSnapshot: { lastCycleRef: "REF-OLD" },
    });
    mocks.subUpdate.mockResolvedValue({});

    await applySubscriptionCycleIfPaid("REF-2");
    const arg = mocks.subUpdate.mock.calls[0]![0] as { data: { currentPeriodEnd: Date } };
    const expectedEnd = new Date(futureEnd.getTime() + 30 * 24 * 3600 * 1000);
    expect(arg.data.currentPeriodEnd.toISOString()).toBe(expectedEnd.toISOString());
  });

  it("webhook rejoué (même référence) : idempotent, aucune double extension", async () => {
    mocks.intakeFindUnique.mockResolvedValue({ status: "PAID", subscriptionId: "sub-1", paidAt: PAID_AT });
    mocks.subFindUnique.mockResolvedValue({
      id: "sub-1",
      status: "active",
      currentPeriodStart: PAID_AT,
      currentPeriodEnd: new Date(PAID_AT.getTime() + 30 * 24 * 3600 * 1000),
      providerSnapshot: { lastCycleRef: "REF-3" },
    });

    await applySubscriptionCycleIfPaid("REF-3");
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });
});

describe("zéro LLM dans le chemin de facturation", () => {
  it("mcp-billing et subscription-cycles n'importent aucun module LLM", async () => {
    const fs = await import("node:fs");
    for (const p of [
      "src/server/services/anubis/mcp-billing.ts",
      "src/server/services/payment-providers/subscription-cycles.ts",
    ]) {
      const src = fs.readFileSync(p, "utf8");
      expect(src, p).not.toMatch(/llm-gateway|callLLM|executeStructuredLLMCall/);
    }
  });
});
