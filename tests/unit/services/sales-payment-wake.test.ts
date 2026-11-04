import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), deals: vi.fn(), payment: vi.fn(), queue: vi.fn(), proof: vi.fn(), delivery: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { salesRepresentative: { findUnique: mocks.profile }, deal: { findMany: mocks.deals }, intakePayment: { findUnique: mocks.payment }, cRMActivity: { findUnique: mocks.proof } } }));
vi.mock("@/server/services/crm-engine/fleet", () => ({ queueRun: mocks.queue, queueSalesRunIn: vi.fn() }));
vi.mock("@/server/services/crm-engine/customer", () => ({ resolveSalesDeliveryDocument: mocks.delivery }));
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
  mocks.delivery.mockResolvedValue(null);
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
  it("waits for the matching independent provider receipt before waking a seller", async () => {
    const base = deal(10000, "XOF");
    const proposalId = "00000000-0000-4000-8000-000000000545";
    mocks.deals.mockResolvedValue([{ ...base, commercial: { ...base.commercial, proposal: {
      id: proposalId, offerId: "owned", offerName: "Synthetic", amount: 10000, unitPrice: 10000, quantity: 1,
      currency: "XOF", countryCode: "CI", billing: "ONE_TIME", terms: "Synthetic terms",
      preparedAt: "2026-11-04T10:00:00Z", presentedAt: "2026-11-04T10:01:00Z", sourceVersion: "1", gloryOutputId: "owned-output",
    } } }]);
    mocks.payment.mockResolvedValue({ status: "PAID", paidAt: new Date(), amount: 10000, currency: "XOF", tierKey: "SALES_COLLECTION",
      provider: "CINETPAY", providerRef: "owned-provider-ref", intakeToken: "sales-deal:owned-deal" });
    const metadata = { provider: "CINETPAY", paymentReference: "owned-payment", providerRef: "owned-provider-ref", proposalId,
      amountMinor: 10000, currency: "XOF", independentProviderProof: true };
    const receipt = { dealId: "owned-deal", activityType: "SALES_PAYMENT_RECONCILED", metadata };
    for (const invalid of [null, { ...receipt, dealId: "another-deal" }, { ...receipt, metadata: { ...metadata, independentProviderProof: false } },
      { ...receipt, metadata: { ...metadata, amountMinor: 9999 } }, { ...receipt, metadata: { ...metadata, proposalId: "another-proposal" } }]) {
      mocks.proof.mockResolvedValue(invalid);
      await wakeConfirmedSalesPayments("owned-profile");
    }
    expect(mocks.queue).not.toHaveBeenCalled();
    mocks.proof.mockResolvedValue(receipt);
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue).toHaveBeenCalledOnce();
  });
  it("wakes again for a verified report completed after the payment run, without confirming delivery", async () => {
    const base = deal(10000, "XOF");
    const paid = { ...base, sellerStrategyId: "owned-brand", commercial: { ...base.commercial, node: "PAID" } };
    mocks.deals.mockResolvedValue([paid]);
    mocks.delivery.mockResolvedValue(null);
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue).not.toHaveBeenCalled();
    mocks.delivery.mockResolvedValue({ activityId: "owned-ready-receipt", url: "https://example.test/report" });
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue).toHaveBeenCalledWith("owned-profile", expect.objectContaining({ requestId: "delivery:owned-ready-receipt", dealId: "owned-deal" }));
    expect(mocks.queue.mock.calls[0]![1].instruction).toContain("réception explicite");
    await wakeConfirmedSalesPayments("owned-profile");
    expect(mocks.queue.mock.calls[1]![1].requestId).toBe("delivery:owned-ready-receipt");
  });
});
