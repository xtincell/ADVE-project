import { describe, expect, it, vi } from "vitest";
const payment = vi.hoisted(() => ({ findUnique: vi.fn() }));
const premium = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { intakePayment: payment } }));
vi.mock("@/server/services/crm-engine/outbound-authority", () => ({ assertSalesEffectIn: vi.fn() }));
vi.mock("@/server/services/quick-intake/index", () => ({ premiumReextractAfterPayment: premium }));
import { paymentMajorAmount, salesAmountToMinor } from "@/server/services/crm-engine/payments";
import { fulfillPaidIntakeReport } from "@/server/services/quick-intake/paid-fulfillment";

describe("commercial collection monetary contract", () => {
  it("uses exact ISO units for the supported commercial currencies", () => {
    for (const currency of ["XOF", "XAF"]) expect(salesAmountToMinor(60000, currency)).toBe(60000);
    for (const currency of ["EUR", "USD", "MAD", "NGN", "GHS", "CDF"]) expect(salesAmountToMinor(19.99, currency)).toBe(1999);
    expect(salesAmountToMinor(9.875, "TND")).toBe(9875); expect(salesAmountToMinor(1e-3, "TND")).toBe(1);
    expect(salesAmountToMinor(0, "EUR")).toBe(0); expect(salesAmountToMinor(2147483647, "XOF")).toBe(2147483647);
  });
  it("rejects fractional native units, unsupported tokens, unsafe amounts and silent rounding", () => {
    for (const [amount, currency] of [[0.5, "XOF"], [1.001, "EUR"], [0.0001, "TND"], [1, "WKD"], [1, "BAD"], [2147483648, "XAF"], [Infinity, "EUR"], [-1, "EUR"], [0.1 + 0.2, "EUR"]] as const) expect(() => salesAmountToMinor(amount, currency)).toThrow();
  });
  it("normalizes only the new collection tier and preserves historical intake values", () => {
    expect(paymentMajorAmount({ tierKey: "SALES_COLLECTION", amount: 1999, currency: "EUR" })).toBe(19.99);
    expect(paymentMajorAmount({ tierKey: "SALES_COLLECTION", amount: 9875, currency: "TND" })).toBe(9.875);
    expect(paymentMajorAmount({ tierKey: "INTAKE_PDF", amount: 1999, currency: "EUR" })).toBe(1999);
    expect(paymentMajorAmount({ tierKey: null, amount: 99, currency: "WKD" })).toBe(99);
  });
  it("never starts premium extraction or Oracle fulfillment for commercial collection", async () => {
    payment.findUnique.mockResolvedValue({ status: "PAID", tierKey: "SALES_COLLECTION", intakeToken: "sales-deal:owned" });
    await fulfillPaidIntakeReport("owned-reference"); expect(premium).not.toHaveBeenCalled();
  });
});
