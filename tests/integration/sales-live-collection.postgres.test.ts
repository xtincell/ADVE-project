import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
const wire = vi.hoisted(() => ({ init: vi.fn(), verify: vi.fn(), fulfill: vi.fn(), cycle: vi.fn() }));
vi.mock("@/server/services/payment-providers/cinetpay", () => ({ cinetpayProvider: { initPayment: wire.init, verifyPayment: wire.verify } }));
vi.mock("@/server/services/quick-intake/paid-fulfillment", () => ({ fulfillPaidIntakeReport: wire.fulfill }));
vi.mock("@/server/services/payment-providers/subscription-cycles", () => ({ applySubscriptionCycleIfPaid: wire.cycle }));
import { db } from "@/lib/db";
import { freezeSalesCollectionIn, cinetpayCredentialFingerprint } from "@/server/services/crm-engine/collection-provider";
import { requestCustomerSalesPayment, resolveSalesPaymentReturn, customerSalesCheckout, reconcileCinetpaySalesPayment, reconcileSalesPayment, requestSalesPayment } from "@/server/services/crm-engine/payments";
import { issueCustomerAccess } from "@/server/services/crm-engine/customer";
import { salesStateSchema, salesStepSchema, type SalesState } from "@/server/services/crm-engine/commercial";
import { applySalesStep } from "@/server/services/crm-engine";
import { POST as notify } from "@/app/api/payment/webhook/cinetpay/route";
import { POST as checkoutPost } from "@/app/api/sales/[token]/payment/route";
import { GET as paymentReturn } from "@/app/api/sales/payment-return/[returnId]/route";
import { saveSalesPublicEntry } from "@/server/services/crm-engine/public-entry";
import type { SaveSalesPublicEntryInput } from "@/server/services/crm-engine/public-entry-contract";

const seed = randomUUID(), dealIds: string[] = [];
let ownerId: string, founderId: string, brandId: string, profileId: string;
let account: Record<string, unknown>;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
async function providerConfig(overrides: Record<string, unknown> = {}) {
  const config = JSON.parse(JSON.stringify({ salesCollection: { ...account, ...overrides } }));
  return db.paymentProviderConfig.upsert({ where: { providerId: "CINETPAY" }, create: { providerId: "CINETPAY", updatedBy: founderId, enabled: true, config },
    update: { updatedBy: founderId, enabled: true, config } });
}
async function fixture(override: { state?: Partial<SalesState>; country?: string; currency?: string; email?: string } = {}) {
  const collection = await freezeSalesCollectionIn(db, brandId, "Owned merchant", { mode: "CINETPAY", destinationRef: "owned-merchant-destination", financeOwnerId: ownerId, attestedBy: ownerId, attestedAt: new Date().toISOString() });
  const proposalId = randomUUID(), currency = override.currency ?? "XOF";
  const state = salesStateSchema.parse({ node: "ACCEPTED", agreement: "Synthetic buyer explicitly accepted the presented quotation.",
    mandate: { offerId: "owned-offer", offerVersion: "1", offerName: "Owned report", terms: "Synthetic owned terms; no real purchase.", amount: 10000, currency,
      sellerId: ownerId, deliveryOwnerId: ownerId, beneficiary: "Owned merchant", paymentInstructions: "Pay the approved merchant only.", expiresAt: "2030-01-01T00:00:00.000Z", channels: ["WEB"], collection },
    proposal: { id: proposalId, offerId: "owned-offer", offerName: "Owned report", amount: 10000, unitPrice: 10000, quantity: 1,
      currency, countryCode: override.country ?? "CI", billing: "ONE_TIME", terms: "Synthetic owned terms; no real purchase.", preparedAt: new Date(Date.now() - 2000).toISOString(), presentedAt: new Date(Date.now() - 1000).toISOString(), sourceVersion: "owned1", gloryOutputId: "owned-glory" }, ...override.state });
  const deal = await db.deal.create({ data: { sellerStrategyId: brandId, companyName: "Owned customer", contactName: "Owned person", contactEmail: override.email ?? null,
    value: 10000, currency, commercial: JSON.parse(JSON.stringify(state)) } });
  dealIds.push(deal.id);
  const access = await issueCustomerAccess(deal.id);
  return { deal, state, proposalId, token: access.path.split("/").at(-1)!, input: { requestId: randomUUID(), proposalId, email: "buyer@example.invalid" } };
}
const request = (f: Awaited<ReturnType<typeof fixture>>, input = f.input) => requestCustomerSalesPayment(f.token, input, "https://owned.invalid");
const webhook = (reference: string, extra: Record<string, unknown> = {}) => notify(new Request("https://owned.invalid/api/payment/webhook/cinetpay", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ merchant_transaction_id: reference, transaction_id: `tx-${reference}`, notify_token: "owned-proof-only", ...extra }) }));
beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/shinkiro_verify" || (!process.env.CI && target.port !== "5445")) throw new Error("Only the owned collection5445 or isolated CI database may receive these fixtures.");
  vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.co"); vi.stubEnv("CINETPAY_API_KEY", "sk_live_owned_synthetic_only"); vi.stubEnv("CINETPAY_API_PASSWORD", "owned-password-only");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "owned-sales-collection-key-32-characters");
  vi.stubEnv("AUTH_URL", "https://owned.invalid"); vi.stubEnv("NEXTAUTH_URL", "https://owned.invalid");
  const owner = await db.user.create({ data: { name: "Owned merchant owner", email: `${seed}@example.invalid` } }); ownerId = owner.id;
  const founder = await db.user.create({ data: { name: "Owned effective founder", email: "alexandre@upgraders.com", role: "FOUNDER" } }); founderId = founder.id;
  const brand = await db.strategy.create({ data: { name: `Owned collection ${seed}`, userId: ownerId } }); brandId = brand.id;
  const profile = await db.salesRepresentative.create({ data: { strategyId: brandId, name: "Owned seller", mode: "HUMAN", status: "ACTIVE", humanUserId: ownerId } }); profileId = profile.id;
  account = { version: 1, mode: "LIVE", credentialFingerprint: cinetpayCredentialFingerprint(), merchantAccountId: "owned-merchant", beneficiary: "Owned merchant", destinationRef: "owned-merchant-destination",
    countryCode: "CI", currency: "XOF", authorizedStrategyIds: [brandId], accountActive: true, attestedAt: new Date().toISOString(), expiresAt: "2030-01-01T00:00:00.000Z", evidenceRef: "Owned synthetic account receipt; not a real account." };
  await providerConfig();
});
beforeEach(async () => {
  wire.init.mockReset(); wire.verify.mockReset(); wire.fulfill.mockReset(); wire.cycle.mockReset();
  vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.co"); vi.stubEnv("CINETPAY_API_KEY", "sk_live_owned_synthetic_only");
  await providerConfig(); await db.salesRepresentative.update({ where: { id: profileId }, data: { status: "ACTIVE" } });
  wire.init.mockImplementation(async (input: { reference: string }) => ({ paymentUrl: `https://secure.cinetpay.co/checkout/${input.reference}`, providerRef: `tx-${input.reference}`, notificationTokenHash: digest("owned-proof-only") }));
});
afterAll(async () => { try {
  await db.salesPublicEntry.deleteMany({ where: { strategyId: brandId } });
  await db.intentEmission.deleteMany({ where: { strategyId: brandId } });
  await db.cRMActivity.deleteMany({ where: { dealId: { in: dealIds } } });
  await db.deal.deleteMany({ where: { id: { in: dealIds } } });
  await db.intakePayment.deleteMany({ where: { intakeToken: { in: dealIds.map(id => `sales-deal:${id}`) } } });
  await db.salesRepresentative.deleteMany({ where: { id: profileId } }); await db.paymentProviderConfig.deleteMany({ where: { providerId: "CINETPAY", updatedBy: founderId } });
  await db.strategy.deleteMany({ where: { id: brandId } }); await db.user.deleteMany({ where: { id: { in: [ownerId, founderId] } } });
} finally { vi.unstubAllEnvs(); await db.$disconnect(); } });

describe.sequential("owned Sales → existing CinetPay collection; all PSP transport mocked", () => {
  it("accepts a freshly read effective FOUNDER approver without changing the stored role", async () => {
    const f = await fixture(); expect(f.state.mandate!.collection!.providerAccountHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await db.user.findUniqueOrThrow({ where: { id: founderId } })).role).toBe("FOUNDER");
  });
  it("derives direct MANDATE attestation from the authorized actor, ignoring fabricated input authority", async () => {
    const f = await fixture(); await db.deal.update({ where: { id: f.deal.id }, data: { commercial: { node: "DISCOVERY" } } });
    const step = salesStepSchema.parse({ requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "MANDATE", mandate: {
      ...f.state.mandate, collection: { ...f.state.mandate!.collection, attestedBy: "fabricated-person", attestedAt: "2020-01-01T00:00:00.000Z", providerAccountHash: "f".repeat(64) },
    } } });
    if (step.command.type !== "MANDATE") throw new Error("Unexpected fixture command");
    expect(step.command.mandate.collection).not.toHaveProperty("attestedBy"); expect(step.command.mandate.collection).not.toHaveProperty("providerAccountHash");
    const changed = await applySalesStep(f.deal.id, step, { id: ownerId, admin: true });
    const collection = salesStateSchema.parse(changed.commercial).mandate!.collection!;
    expect(collection.attestedBy).toBe(ownerId); expect(Date.parse(collection.attestedAt)).toBeGreaterThan(Date.now() - 30000);
    expect(collection.providerAccountHash).not.toBe("f".repeat(64));
  });
  it("initializes exactly once outside the transaction and preserves the canonical receipt on retry", async () => {
    const f = await fixture(); const first = await request(f), second = await request(f);
    expect(first).toEqual(second); expect(wire.init).toHaveBeenCalledTimes(1);
    const sent = wire.init.mock.calls[0]![0]; expect(sent).toMatchObject({ amount: 10000, currency: "XOF", customer: { email: f.input.email } });
    expect(JSON.stringify(sent)).not.toContain(f.token); expect(sent.returnUrl).toMatch(/^https:\/\/owned.invalid\/api\/sales\/payment-return\/[a-f0-9]{32}$/);
    const p = await db.intakePayment.findUniqueOrThrow({ where: { reference: first.reference } });
    expect(p).toMatchObject({ provider: "CINETPAY", tierKey: "SALES_COLLECTION", amount: 10000, status: "PENDING", notificationTokenHash: digest("owned-proof-only") });
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${f.deal.id}` } })).toBe(1);
  });
  it("concurrent clicks cannot create duplicate checkouts, even using different request ids", async () => {
    const f = await fixture(); const results = await Promise.allSettled([request(f), request(f, { ...f.input, requestId: randomUUID() })]);
    expect(results.some(r => r.status === "fulfilled")).toBe(true); expect(wire.init).toHaveBeenCalledTimes(1);
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${f.deal.id}` } })).toBe(1);
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_CUSTOMER_PAYMENT_REQUEST" } })).toBe(1);
  });
  it("keeps an uncertain effect durable and never posts again for same or new request ids", async () => {
    const f = await fixture(); wire.init.mockRejectedValue(new Error("synthetic transport timeout"));
    await expect(request(f)).rejects.toThrow("vérifiée"); await expect(request(f)).rejects.toThrow("vérifiée");
    await expect(request(f, { ...f.input, requestId: randomUUID() })).rejects.toThrow("vérifiée"); expect(wire.init).toHaveBeenCalledTimes(1);
    const a = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_PSP_INITIALIZATION" } });
    expect(a.metadata).toMatchObject({ status: "UNKNOWN" });
    expect((await db.intakePayment.findFirstOrThrow({ where: { intakeToken: `sales-deal:${f.deal.id}` } })).status).toBe("PENDING");
  });
  it("does not disclose a ready checkout if the customer capability was revoked while the PSP call completed", async () => {
    const f = await fixture(); wire.init.mockImplementationOnce(async (input: { reference: string }) => {
      await db.deal.update({ where: { id: f.deal.id }, data: { customerAccessTokenHash: null } });
      return { paymentUrl: `https://secure.cinetpay.co/checkout/${input.reference}`, providerRef: `tx-${input.reference}`, notificationTokenHash: digest("owned-proof-only") };
    });
    await expect(request(f)).rejects.toThrow("vérifiée"); expect(wire.init).toHaveBeenCalledTimes(1);
    const receipt = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_PSP_INITIALIZATION" } });
    expect(receipt.metadata).toMatchObject({ status: "READY" });
    await expect(request(f)).rejects.toThrow("indisponible"); expect(wire.init).toHaveBeenCalledTimes(1);
  });
  it.each(["sandbox", "credentials", "scope", "beneficiary", "country", "currency", "expired"])("refuses %s mismatch before any PSP initialization", async mode => {
    const f = await fixture(mode === "country" ? { country: "CM" } : mode === "currency" ? { currency: "XAF" } : {});
    if (mode === "sandbox") vi.stubEnv("CINETPAY_BASE_URL", "https://api.cinetpay.net");
    if (mode === "credentials") vi.stubEnv("CINETPAY_API_KEY", "sk_live_different_synthetic");
    if (mode === "scope") await providerConfig({ authorizedStrategyIds: ["another-brand"] });
    if (mode === "beneficiary") await providerConfig({ beneficiary: "Another owned merchant" });
    if (mode === "expired") await providerConfig({ expiresAt: "2020-01-01T00:00:00.000Z" });
    await expect(request(f)).rejects.toThrow(); expect(wire.init).not.toHaveBeenCalled();
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${f.deal.id}` } })).toBe(0);
  });
  it("refuses a changed request, stale quotation, information-only state and paused seller", async () => {
    const f = await fixture(); await request(f);
    await expect(request(f, { ...f.input, email: "other@example.invalid" })).rejects.toThrow("déjà été utilisée");
    await expect(request(f, { ...f.input, proposalId: randomUUID() })).rejects.toThrow("proposition");
    const info = await fixture(); await db.deal.update({ where: { id: info.deal.id }, data: { commercial: JSON.parse(JSON.stringify({ ...info.state, mandate: { ...info.state.mandate, informationOnly: true } })) } });
    await expect(request(info)).rejects.toThrow("uniquement");
    const paused = await fixture(); await db.salesRepresentative.update({ where: { id: profileId }, data: { status: "PAUSED" } });
    await expect(request(paused)).rejects.toThrow("disponible"); expect(wire.init).toHaveBeenCalledTimes(1);
  });
  it("requires the browser return cookie; the opaque return id alone reveals no private conversation", async () => {
    const f = await fixture(), paid = await request(f); const id = paid.returnCookie.name.slice("sales-return-".length);
    await expect(resolveSalesPaymentReturn(id, undefined)).rejects.toThrow(); await expect(resolveSalesPaymentReturn(id, "f".repeat(64))).rejects.toThrow();
    expect((await resolveSalesPaymentReturn(id, paid.returnCookie.value)).path).toBe(`/sales/${f.token}`);
    const result = await paymentReturn(new Request(`http://localhost:3412/api/sales/payment-return/${id}`, { headers: { host: "evil.invalid", "x-forwarded-host": "evil.invalid", "x-forwarded-proto": "https", cookie: `${paid.returnCookie.name}=${paid.returnCookie.value}` } }), { params: Promise.resolve({ returnId: id }) });
    expect(result.status).toBe(303); expect(result.headers.get("location")).toBe(`https://owned.invalid/sales/${f.token}`);
    await db.deal.update({ where: { id: f.deal.id }, data: { customerAccessTokenHash: null } });
    await expect(resolveSalesPaymentReturn(id, paid.returnCookie.value)).rejects.toThrow();
  });
  it("withdraws checkout after account revocation while preserving the private conversation and reference", async () => {
    const f = await fixture(); const first = await request(f);
    await db.paymentProviderConfig.update({ where: { providerId: "CINETPAY" }, data: { enabled: false } });
    await expect(request(f)).rejects.toThrow("compte");
    const current = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(await customerSalesCheckout(current, salesStateSchema.parse(current.commercial))).toMatchObject({ available: false });
    expect(current.customerAccessTokenHash).toBe(digest(f.token)); expect(current.paymentReference).toBe(first.reference); expect(wire.init).toHaveBeenCalledTimes(1);
  });
  it("lets the fresh owner only pause the existing entry when its account expires, never reopen or edit its financial terms", async () => {
    const f = await fixture();
    const { sellerId: _seller, channels: _channels, collection: fullCollection, ...offer } = f.state.mandate!;
    const { attestedBy: _by, attestedAt: _at, ...collection } = fullCollection!;
    const input: SaveSalesPublicEntryInput = { strategyId: brandId, representativeId: profileId, expectedRevision: 0, enabled: true, informationOnly: false,
      publicBrandName: "Owned public merchant", welcome: "Owned test conversation", market: "CI", collectionAttested: true,
      maxConversationsPerDay: 10, maxConversationsPerHour: 5, offers: [{ ...offer, collection }] };
    const emission = async (value: SaveSalesPublicEntryInput) => (await db.intentEmission.create({ data: { strategyId: brandId, caller: "crm:saveSalesPublicEntry", intentKind: "LEGACY_CRM_UPDATE_DEAL", payload: JSON.parse(JSON.stringify(value)) } })).id;
    const initialIntent = await emission(input);
    const entry = await db.salesPublicEntry.create({ data: { strategyId: brandId, representativeId: profileId, publicId: randomUUID().replaceAll("-", "").slice(0, 24), enabled: true, authorizedBy: ownerId, intentId: initialIntent, config: JSON.parse(JSON.stringify(input)) } });
    await providerConfig({ expiresAt: "2020-01-01T00:00:00.000Z" });
    const disabled = { ...input, expectedRevision: entry.revision, enabled: false };
    await saveSalesPublicEntry({ id: ownerId, admin: false, operatorId: null }, disabled, await emission(disabled));
    const stored = await db.salesPublicEntry.findUniqueOrThrow({ where: { id: entry.id } }); expect(stored.enabled).toBe(false);
    const reopened = { ...input, expectedRevision: stored.revision, enabled: true };
    await expect(saveSalesPublicEntry({ id: ownerId, admin: false, operatorId: null }, reopened, await emission(reopened))).rejects.toThrow("compte");
    const edited = { ...disabled, expectedRevision: stored.revision, offers: [{ ...disabled.offers[0]!, amount: 1 }] };
    await expect(saveSalesPublicEntry({ id: ownerId, admin: false, operatorId: null }, edited, await emission(edited))).rejects.toThrow("compte");
    expect((await db.salesPublicEntry.findUniqueOrThrow({ where: { id: entry.id } })).revision).toBe(stored.revision);
  });
  it("verifies canonical SUCCESS once and dispatches the bound Sales right without a subscription cycle", async () => {
    const f = await fixture(), p = await request(f);
    wire.verify.mockResolvedValue({ paid: true, raw: { status: "SUCCESS", merchant_transaction_id: p.reference, transaction_id: `tx-${p.reference}` } });
    expect((await webhook(p.reference, { status: "FAILED" })).status).toBe(200); expect((await webhook(p.reference)).status).toBe(200);
    expect(wire.fulfill).toHaveBeenCalledWith(p.reference); expect(wire.cycle).not.toHaveBeenCalled(); expect(wire.verify).toHaveBeenCalledTimes(1);
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_PAYMENT_RECONCILED" } })).toBe(1);
    const current = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }); expect(salesStateSchema.parse(current.commercial).node).toBe("ACCEPTED");
    expect((await reconcileCinetpaySalesPayment(p.reference)).received).toBe(true);
  });
  it("refuses wrong notification proof, canonical amount and durable price tampering without settling", async () => {
    const f = await fixture(), p = await request(f);
    wire.verify.mockResolvedValue({ paid: true, raw: { status: "SUCCESS", merchant_transaction_id: p.reference, transaction_id: `tx-${p.reference}`, amount: 1, currency: "XOF" } });
    expect((await webhook(p.reference, { notify_token: "wrong" })).status).toBe(401); expect(wire.verify).not.toHaveBeenCalled();
    expect((await webhook(p.reference)).status).toBe(409);
    wire.verify.mockResolvedValue({ paid: true, raw: { status: "SUCCESS", merchant_transaction_id: p.reference, transaction_id: `tx-${p.reference}` } });
    const init = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_PSP_INITIALIZATION" } });
    await db.cRMActivity.update({ where: { id: init.id }, data: { metadata: { ...(init.metadata as object), amountMinor: 1 } } });
    expect((await webhook(p.reference)).status).toBe(409); expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: p.reference } })).status).toBe("PENDING");
  });
  it("never lets a human or AI assert a CinetPay settlement via the manual reconciliation route", async () => {
    const f = await fixture(); await request(f);
    await expect(reconcileSalesPayment({ dealId: f.deal.id, requestId: randomUUID(), observedAmount: 10000, currency: "XOF", externalReference: "owned-proof", evidence: "Owned synthetic evidence" }, { id: ownerId, admin: false })).rejects.toThrow("prestataire");
  });
  it("does not let a claimed native PAID row advance the sale before its canonical business proof commits", async () => {
    const f = await fixture(), p = await request(f);
    await db.intakePayment.update({ where: { reference: p.reference }, data: { status: "PAID", paidAt: new Date() } });
    const current = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    await expect(applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command: { type: "PAYMENT", evidence: "Synthetic native claim without committed receipt", amount: 10000, currency: "XOF" } }, { id: ownerId, admin: true })).rejects.toThrow("reçu indépendant");
  });
  it("retains the existing MANUAL collection path", async () => {
    const f = await fixture(); const state = { ...f.state, mandate: { ...f.state.mandate!, collection: { ...f.state.mandate!.collection!, mode: "MANUAL" as const } } };
    await db.deal.update({ where: { id: f.deal.id }, data: { commercial: JSON.parse(JSON.stringify(state)) } });
    const p = await requestSalesPayment(f.deal.id, randomUUID(), 0, { id: ownerId, admin: false }); expect(p.provider).toBe("MANUAL_WA"); expect(wire.init).not.toHaveBeenCalled();
    expect((await reconcileSalesPayment({ dealId: f.deal.id, requestId: randomUUID(), observedAmount: 10000, currency: "XOF", externalReference: `owned-${randomUUID()}`, evidence: "Owned synthetic independent proof" }, { id: ownerId, admin: false })).status).toBe("PAID");
  });
  it("uses an existing email without projecting it and the HTTP API rejects caller prices and foreign origins", async () => {
    const f = await fixture({ email: "existing@example.invalid" });
    expect(await customerSalesCheckout(f.deal, f.state)).toMatchObject({ available: true, requiresEmail: false });
    const options = { params: Promise.resolve({ token: f.token }) };
    const foreign = await checkoutPost(new Request("http://localhost:3412/api/sales/token/payment", { method: "POST", headers: { host: "owned.invalid", "x-forwarded-proto": "https", origin: "https://foreign.invalid", "content-type": "application/json" }, body: JSON.stringify(f.input) }), options);
    expect(foreign.status).toBe(403);
    const bad = await checkoutPost(new Request("http://localhost:3412/api/sales/token/payment", { method: "POST", headers: { host: "owned.invalid", "x-forwarded-proto": "https", origin: "https://owned.invalid", "content-type": "application/json" }, body: JSON.stringify({ ...f.input, amount: 1 }) }), options);
    expect(bad.status).toBe(400);
    const r = await request(f, { ...f.input, email: "" }); expect(r.amount).toBe(10000); expect(wire.init.mock.calls[0]![0].customer.email).toBe("existing@example.invalid");
  });
});
