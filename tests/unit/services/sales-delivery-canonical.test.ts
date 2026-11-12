import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalSalesArtifactUrl, resolveSalesDeliveryDocument, sendSalesWebMessage } from "@/server/services/crm-engine/customer";
import { salesStateSchema } from "@/server/services/crm-engine/commercial";

const store = vi.hoisted(() => ({
  deal: {} as Record<string, unknown>, activity: null as Record<string, unknown> | null,
  receipts: new Map<string, Record<string, unknown>>(), reserve: vi.fn(), read: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  deal: { findUniqueOrThrow: vi.fn(async () => store.deal) },
  strategy: { findUnique: vi.fn(async () => ({ userId: "brand-owner" })) },
  cRMActivity: { findFirst: store.read, findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.receipts.get(where.id) ?? null) },
} }));
vi.mock("@/server/services/crm-engine/outbound-authority", () => ({ reserveSalesOutbound: store.reserve }));
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));

const actor = { id: "mcp:seller", admin: false };
function state(node = "PAID") { return salesStateSchema.parse({ node, mandate: {
  offerId: "pdf", offerVersion: "3", offerName: "Rapport", amount: 10000, currency: "XOF", terms: "Périmètre approuvé",
  sellerId: actor.id, deliveryOwnerId: "delivery-owner", beneficiary: "UPgraders", expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Modalités approuvées", channels: ["WEB"],
} }); }
beforeEach(() => {
  vi.clearAllMocks(); store.receipts.clear();
  store.deal = { id: "deal", sellerStrategyId: "brand", customerAccessTokenHash: "private", commercial: state() };
  store.activity = { id: "delivery-activity", dealId: "deal", activityType: "SALES_DELIVERY_READY", performedBy: "brand-owner", metadata: { artifact: "https://delivery.example.invalid/report-123.pdf?signature=exact" } };
  store.read.mockImplementation(async ({ where }: { where: { dealId: string; activityType: string } }) => store.activity?.dealId === where.dealId && store.activity?.activityType === where.activityType ? store.activity : null);
  store.reserve.mockImplementation(async (dealId: string, sender: { id: string }, input: { requestId: string; fingerprint: string; body: string }) => {
    const receipt = { id: input.requestId, dealId, performedBy: sender.id, metadata: { fingerprint: input.fingerprint, body: input.body } };
    store.receipts.set(input.requestId, receipt); return { receipt, replay: false };
  });
});

describe("Server-owned delivery links", () => {
  it("resolves only an owner-approved structured artifact after payment, preserving signed URLs", async () => {
    const { db } = await import("@/lib/db");
    expect(await resolveSalesDeliveryDocument(db, { id: "deal", sellerStrategyId: "brand" }, state())).toEqual({ activityId: "delivery-activity", url: "https://delivery.example.invalid/report-123.pdf?signature=exact" });
    expect(await resolveSalesDeliveryDocument(db, { id: "deal", sellerStrategyId: "brand" }, state("ACCEPTED"))).toBeNull();
    expect(await resolveSalesDeliveryDocument(db, { id: "other-deal", sellerStrategyId: "brand" }, state())).toBeNull();
    store.activity!.performedBy = "unapproved-user";
    expect(await resolveSalesDeliveryDocument(db, { id: "deal", sellerStrategyId: "brand" }, state())).toBeNull();
    store.activity!.performedBy = "delivery-owner";
    expect(await resolveSalesDeliveryDocument(db, { id: "deal", sellerStrategyId: "brand" }, { ...state("DELIVERED"), contactStopped: true })).not.toBeNull();
    store.activity!.metadata = {}; store.activity!.description = "https://delivery.example.invalid/unstructured.pdf";
    expect(await resolveSalesDeliveryDocument(db, { id: "deal", sellerStrategyId: "brand" }, state())).toBeNull();
  });

  it("uses the existing request origin for app-relative artifacts and rejects unsafe paths", () => {
    expect(canonicalSalesArtifactUrl("/sales-receipts/exact.pdf", "http://127.0.0.1:3412")).toBe("http://127.0.0.1:3412/sales-receipts/exact.pdf");
    for (const url of ["//other.invalid/file.pdf", "javascript:alert(1)", "data:text/plain,hello", "https://user:password@example.invalid/file.pdf", "/sales-receipts/../private.pdf", "https://example.invalid/%2e%2e/file.pdf", "/sales-receipts/\\file.pdf"]) expect(canonicalSalesArtifactUrl(url)).toBeNull();
  });

  it("attaches the canonical server URL and retries one stable body even if a newer artifact appears", async () => {
    const input = { requestId: randomUUID(), text: "Votre document est prêt. Merci de confirmer sa réception.", deliveryActivityId: "delivery-activity" };
    const first = await sendSalesWebMessage("deal", actor, input);
    expect(first.metadata).toMatchObject({ body: `${input.text}\n\n[Ouvrir votre document](<https://delivery.example.invalid/report-123.pdf?signature=exact>)` });
    store.activity!.id = "new-delivery"; store.activity!.metadata = { artifact: "https://delivery.example.invalid/new.pdf" };
    expect(await sendSalesWebMessage("deal", actor, input)).toEqual(first);
    expect(store.reserve).toHaveBeenCalledTimes(1);
    await expect(sendSalesWebMessage("deal", actor, { ...input, text: "Autre message" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((store.deal.commercial as { node: string }).node).toBe("PAID");
  });

  it("refuses links in attachment prose, wrong activity IDs, unapproved authors and pre-payment sends", async () => {
    await expect(sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Voir https://example.invalid/wrong.pdf", deliveryActivityId: "delivery-activity" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Votre document", deliveryActivityId: "other-activity" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    store.activity!.performedBy = "another-user";
    await expect(sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Votre document", deliveryActivityId: "delivery-activity" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    store.activity!.performedBy = "brand-owner"; store.deal.commercial = state("ACCEPTED");
    await expect(sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Votre document", deliveryActivityId: "delivery-activity" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(store.reserve).not.toHaveBeenCalled();
  });

  it("rejects a legacy PDF URL with even one corrupted character instead of silently rewriting it", async () => {
    await expect(sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Votre rapport : https://delivery.example.invalid/report-12.pdf?signature=exact" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(store.reserve).not.toHaveBeenCalled();
    await sendSalesWebMessage("deal", actor, { requestId: randomUUID(), text: "Votre rapport : https://delivery.example.invalid/report-123.pdf?signature=exact" });
    expect(store.reserve).toHaveBeenCalledTimes(1);
  });
});
