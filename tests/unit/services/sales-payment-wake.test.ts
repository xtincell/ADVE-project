import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), deals: vi.fn(), payment: vi.fn(), queue: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { salesRepresentative: { findUnique: mocks.profile }, deal: { findMany: mocks.deals }, intakePayment: { findUnique: mocks.payment } } }));
vi.mock("@/server/services/crm-engine/fleet", () => ({ queueRun: mocks.queue, queueSalesRunIn: vi.fn() }));
import { wakeConfirmedSalesPayments } from "@/server/services/crm-engine/events";

function deal(amount: number, currency: string) {
  return { id: "owned-deal", paymentReference: "owned-payment", commercial: { node: "ACCEPTED", mandate: {
    offerId: "owned", offerName: "Synthetic", offerVersion: "1", terms: "Synthetic terms", amount, currency,
    sellerId: "mcp:owned-key", deliveryOwnerId: "owned-delivery", beneficiary: "Owned beneficiary",
    expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Owned instructions", channels: ["WEB"],
  } } };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({ id: "owned-profile", status: "ACTIVE", mode: "AI", mcpKeyId: "owned-key", strategyId: "owned-brand" });
  mocks.queue.mockResolvedValue({ id: "owned-run" });
});
describe("commercial payment wake amount contract", () => {
  it("normalizes new ISO minor-unit collections before matching the approved major-unit offer", async () => {
    mocks.deals.mockResolvedValue([deal(123.45, "EUR")]);
    mocks.payment.mockResolvedValue({ status: "PAID", paidAt: new Date(), amount: 12345, currency: "EUR", tierKey: "SALES_COLLECTION" });
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue).toHaveBeenCalledWith("owned-profile", expect.objectContaining({ requestId: "payment:owned-payment", dealId: "owned-deal" }));
    expect(mocks.payment.mock.calls[0]![0].select.tierKey).toBe(true);
  });
  it("preserves historical intake units and zero-decimal FCFA collections", async () => {
    mocks.deals.mockResolvedValue([deal(123, "EUR")]);
    mocks.payment.mockResolvedValue({ status: "PAID", paidAt: new Date(), amount: 123, currency: "EUR", tierKey: "GOLD" });
    await wakeConfirmedSalesPayments("owned-profile");
    mocks.deals.mockResolvedValue([deal(60000, "XOF")]);
    mocks.payment.mockResolvedValue({ status: "PAID", paidAt: new Date(), amount: 60000, currency: "XOF", tierKey: "SALES_COLLECTION" });
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue).toHaveBeenCalledTimes(2);
  });
  it("never wakes from pending, mismatched or undated settlement", async () => {
    mocks.deals.mockResolvedValue([deal(123.45, "EUR")]);
    for (const payment of [
      { status: "PENDING", paidAt: null, amount: 12345, currency: "EUR", tierKey: "SALES_COLLECTION" },
      { status: "PAID", paidAt: new Date(), amount: 12346, currency: "EUR", tierKey: "SALES_COLLECTION" },
      { status: "PAID", paidAt: null, amount: 12345, currency: "EUR", tierKey: "SALES_COLLECTION" },
    ]) { mocks.payment.mockResolvedValue(payment); await wakeConfirmedSalesPayments("owned-profile"); }
    expect(mocks.queue).not.toHaveBeenCalled();
  });
});
