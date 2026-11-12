import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const init = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
vi.mock("@/server/services/payment-providers", async actual => ({
  ...await actual<object>(), pickProvider: () => ({ id: "CINETPAY", initPayment: init }),
}));
vi.mock("@/server/services/monetization/compute-price", () => ({ resolvePrice: async () => ({ amount: 10000, currencyCode: "XAF" }) }));
vi.mock("@/server/services/monetization", () => ({ resolvePrice: async () => ({ amount: 10000, currencyCode: "XAF" }) }));
import { db } from "@/lib/db";
import { paymentRouter } from "@/server/trpc/routers/payment";
import { startManualSubscriptionCycle } from "@/server/services/payment-providers/subscription-cycles";
const tokens: string[] = [], intakes: string[] = [], users: string[] = [];
const proof = { paymentUrl: "https://owned.invalid/checkout", providerRef: "owned-init-tx", notificationTokenHash: "ab".repeat(32) };
beforeAll(() => { const u = new URL(process.env.DATABASE_URL!); expect(u.hostname).toBe("127.0.0.1"); expect(u.pathname).toBe("/shinkiro_verify"); });
beforeEach(() => { init.mockReset(); init.mockResolvedValue(proof); });
afterEach(async () => {
  await db.intakePayment.deleteMany({ where: { OR: [{ intakeToken: { in: tokens } }, { subscriptionId: { in: (await db.subscription.findMany({ where: { operatorId: { in: users } }, select: { id: true } })).map(x => x.id) } }] } });
  await db.subscription.deleteMany({ where: { operatorId: { in: users } } });
  await db.quickIntake.deleteMany({ where: { id: { in: intakes } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  tokens.length = intakes.length = users.length = 0;
});
afterAll(() => db.$disconnect());
async function intake() {
  const row = await db.quickIntake.create({ data: { companyName: "Paiement détenu", contactName: "Recette locale", contactEmail: randomUUID() + "@owned.invalid", country: "CM", responses: {}, status: "COMPLETED" } });
  intakes.push(row.id); tokens.push(row.shareToken); return row;
}
describe.sequential("initialization proof persistence on owned PostgreSQL — no PSP", () => {
  it("binds a one-shot checkout before returning its URL, without exposing the proof hash", async () => {
    const row = await intake(); const caller = paymentRouter.createCaller({ db, headers: undefined, session: null });
    const result = await caller.initIntakeReport({ intakeToken: row.shareToken, returnUrl: "https://owned.invalid/intake/result" });
    const stored = await db.intakePayment.findUniqueOrThrow({ where: { reference: result.reference } });
    expect(stored).toMatchObject({ providerRef: proof.providerRef, notificationTokenHash: proof.notificationTokenHash, status: "PENDING", amount: 10000, currency: "XAF" });
    expect(result).not.toHaveProperty("notificationTokenHash"); expect(result.paymentUrl).toBe(proof.paymentUrl);
  });
  it("binds a monthly cycle checkout while leaving the subscription unpaid", async () => {
    const user = await db.user.create({ data: { email: randomUUID() + "@owned.invalid" } }); users.push(user.id);
    const result = await startManualSubscriptionCycle({ userId: user.id, userEmail: user.email, tierKey: "COCKPIT_MONTHLY", countryCode: "CM", returnUrl: "https://owned.invalid/pricing" });
    const stored = await db.intakePayment.findUniqueOrThrow({ where: { reference: result.reference } });
    expect(stored).toMatchObject({ providerRef: proof.providerRef, notificationTokenHash: proof.notificationTokenHash, status: "PENDING" });
    expect((await db.subscription.findUniqueOrThrow({ where: { id: result.subscriptionId } })).status).toBe("unpaid");
    expect(result).not.toHaveProperty("notificationTokenHash");
  });
  it("does not publish a checkout URL after initialization fails", async () => {
    const row = await intake(); init.mockRejectedValueOnce(new Error("owned init failure"));
    const caller = paymentRouter.createCaller({ db, headers: undefined, session: null });
    await expect(caller.initIntakeReport({ intakeToken: row.shareToken, returnUrl: "https://owned.invalid/intake/result" })).rejects.toThrow("owned init failure");
    expect(await db.intakePayment.findFirst({ where: { intakeToken: row.shareToken } })).toMatchObject({ status: "FAILED", notificationTokenHash: null });
  });
});
