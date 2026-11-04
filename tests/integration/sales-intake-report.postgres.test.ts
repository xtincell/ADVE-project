/** Owned PostgreSQL. PSP receipts and premium completion are synthetic fixtures;
 * PDF route dispatch is tested here, never presented as a real money/PDF receipt. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
const premium = vi.hoisted(() => vi.fn<(token: string) => Promise<boolean>>());
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
vi.mock("@/server/services/quick-intake/index", () => ({ premiumReextractAfterPayment: premium }));
vi.mock("@/server/services/value-report-generator/intake-pdf", () => ({ renderIntakePdf: vi.fn(async () => ({ pdf: Buffer.from("owned-route-dispatch"), bytes: 20 })) }));
import { db } from "@/lib/db";
import { salesStateSchema } from "@/server/services/crm-engine/commercial";
import type { SalesStep } from "@/server/services/crm-engine/commercial";
import { applySalesStep } from "@/server/services/crm-engine";
import { receiveCustomerMessage } from "@/server/services/crm-engine/customer";
import { assertSalesIntakeReportReadyIn, grantSalesIntakeReportIn, linkCustomerSalesDiagnostic,
  parseSalesDiagnosticToken, salesIntakeReportProjectionIn, verifySalesIntakeDeliveryIn } from "@/server/services/crm-engine/intake-report";
import { fulfillPaidIntakeReport, readIntakeReportAccess } from "@/server/services/quick-intake/paid-fulfillment";
import { reconcileSalesPayment } from "@/server/services/crm-engine/payments";
import { POST as diagnosticPost } from "@/app/api/sales/[token]/diagnostic/route";
import { GET as pdfGet } from "@/app/api/intake/[token]/pdf/route";

const brands: string[] = [], users: string[] = [], intakes: string[] = [], deals: string[] = [], refs: string[] = [], emails: string[] = [];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
let owned = false;
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/shinkiro_verify") throw new Error("A dedicated loopback shinkiro_verify database is required.");
  owned = true;
});
beforeEach(() => { premium.mockReset(); premium.mockResolvedValue(true); });
afterAll(async () => {
  if (!owned) return;
  await db.cRMActivity.deleteMany({ where: { dealId: { in: deals } } });
  await db.crmMessage.deleteMany({ where: { salesDealId: { in: deals } } });
  await db.crmContact.deleteMany({ where: { email: { in: emails } } });
  await db.intakePayment.deleteMany({ where: { reference: { in: refs } } });
  await db.deal.deleteMany({ where: { id: { in: deals } } });
  await db.gloryOutput.deleteMany({ where: { strategyId: { in: brands } } });
  await db.quickIntake.deleteMany({ where: { id: { in: intakes } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
async function fixture() {
  const owner = await db.user.create({ data: { email: `${randomUUID()}@example.invalid` } }); users.push(owner.id);
  const email = `${randomUUID()}@example.invalid`; emails.push(email);
  const seller = await db.strategy.create({ data: { name: "Seller brand must never be diagnosed", userId: owner.id } }); brands.push(seller.id);
  const buyer = await db.strategy.create({ data: { name: `Analysed brand ${randomUUID()}`, userId: owner.id, status: "QUICK_INTAKE" } }); brands.push(buyer.id);
  const intake = await db.quickIntake.create({ data: { companyName: buyer.name, contactName: "Diagnostic holder", contactEmail: email,
    convertedToId: buyer.id, status: "COMPLETED", responses: { a: { mission: "Owned diagnostic content" } }, diagnostic: { narrativeReport: {
      executiveSummary: "Existing diagnostic", adve: ["a", "d", "v", "e"].map(key => ({ key, full: `Existing qualified ${key} narrative` })),
      rtis: { framing: "Existing strategic frame", pillars: ["r", "t", "i", "s"].map(key => ({ key, full: `Existing qualified ${key} strategy` })) },
    } } } }); intakes.push(intake.id);
  for (const brand of [seller, buyer]) await db.pillar.create({ data: { strategyId: brand.id, key: "a", content: { mission: `Preserved ${brand.id}` } } });
  const token = randomBytes(32).toString("hex"), invoiceName = `Invoice customer ${randomUUID()}`;
  const deal = await db.deal.create({ data: { sellerStrategyId: seller.id, companyName: invoiceName, contactName: "Private customer", customerAccessTokenHash: hash(token) } }); deals.push(deal.id);
  const proposalId = randomUUID(), line = { offerId: "pdf", offerName: "Client report", status: "PRICED", unitPrice: 12000, quantity: 1, lineTotal: 12000,
    currency: "XOF", billing: "ONE_TIME", conditions: ["One existing client diagnostic"], availability: null, sources: [], gaps: [] };
  const output = await db.gloryOutput.create({ data: { strategyId: seller.id, toolSlug: "devis-generator", output: { devis: { schemaVersion: 1, status: "READY", client: { name: invoiceName, reference: deal.id }, lines: [line],
    groups: [{ currency: "XOF", billing: "ONE_TIME", subtotal: 12000, taxTreatment: "INCLUDED_IN_PRICE", taxRatePct: null, tax: null, total: 12000 }], conditions: ["One existing client diagnostic"], scope: ["PDF report"], exclusions: [], validUntil: null,
    sources: [{ kind: "CATALOGUE", reference: "owned-fixture-v3", contentHash: "a".repeat(64), version: 3 }], gaps: [], note: "Synthetic monetary fixture, no provider call." } } } });
  const state = salesStateSchema.parse({ node: "PROPOSAL", mandate: { offerId: "pdf", offerVersion: "3", offerName: "Client report", terms: "One existing client diagnostic", amount: 12000, currency: "XOF", billing: "ONE_TIME",
    pricingRule: { kind: "MARKET_TIER", tierKey: "INTAKE_PDF", countryCodes: ["CI"], maxQuantity: 1 }, sellerId: owner.id, deliveryOwnerId: owner.id, beneficiary: "Synthetic seller",
    expiresAt: new Date(Date.now() + 86400000).toISOString(), paymentInstructions: "No real money in this fixture", channels: ["WEB"],
    collection: { mode: "CINETPAY", destinationRef: "Synthetic destination, no real money", attestedBy: owner.id,
      attestedAt: new Date().toISOString(), financeOwnerId: owner.id, providerAccountHash: "c".repeat(64) } },
    proposal: { id: proposalId, offerId: "pdf", offerName: "Client report", amount: 12000, unitPrice: 12000, currency: "XOF", billing: "ONE_TIME", quantity: 1, countryCode: "CI",
      terms: "One existing client diagnostic", preparedAt: new Date().toISOString(), presentedAt: new Date().toISOString(), sourceVersion: "3", gloryOutputId: output.id } });
  await db.deal.update({ where: { id: deal.id }, data: { commercial: JSON.parse(JSON.stringify(state)), value: 12000, currency: "XOF" } });
  return { seller, buyer, owner, intake, deal, state, token, email };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const input = (f: Fixture) => ({ requestId: randomUUID(), intakeToken: `https://powerupgraders.com/intake/${f.intake.shareToken}/result`, email: f.email, consent: true as const });
const link = (f: Fixture, raw = input(f)) => linkCustomerSalesDiagnostic(f.token, raw, "https://powerupgraders.com");
async function settled(f: Fixture, proof = true, manual = false) {
  const reference = `sales_${randomUUID()}`; refs.push(reference);
  const requestId = randomUUID(), allocationId = `sales-payment-external:${hash(reference)}`;
  const payment = await db.intakePayment.create({ data: { reference, intakeToken: `sales-deal:${f.deal.id}`, tierKey: "SALES_COLLECTION", provider: manual ? "MANUAL_WA" : "CINETPAY", status: "PAID", paidAt: new Date(),
    amount: 12000, currency: "XOF", providerRef: `synthetic-provider-${randomUUID()}`, notificationTokenHash: manual ? null : "b".repeat(64), ...(manual ? { providerEventId: allocationId } : {}) } });
  const state = { ...f.state, node: "ACCEPTED", agreement: "Synthetic independently received agreement", mandate: { ...f.state.mandate!,
    collection: { ...f.state.mandate!.collection!, mode: manual ? "MANUAL" : "CINETPAY" }, intakePaymentReference: reference } };
  await db.deal.update({ where: { id: f.deal.id }, data: { paymentReference: reference, commercial: JSON.parse(JSON.stringify(state)) } });
  if (proof && manual) {
    await db.cRMActivity.create({ data: { id: allocationId, dealId: f.deal.id, activityType: "SALES_PAYMENT_ALLOCATION", performedBy: f.owner.id,
      description: "Owned synthetic cash receipt, not a real collection", metadata: { requestId, paymentReference: reference, externalReference: payment.providerRef, amountMinor: 12000, currency: "XOF" } } });
    await db.cRMActivity.create({ data: { id: `sales-payment:${requestId}`, dealId: f.deal.id, activityType: "SALES_PAYMENT_RECONCILED", performedBy: f.owner.id,
      description: "Owned synthetic human financial confirmation", metadata: { independentHumanProof: true, verifiedBy: f.owner.id, allocationId,
        requestId, proposalId: f.state.proposal!.id, paymentReference: reference, amountMinor: 12000, currency: "XOF", externalReference: payment.providerRef, evidence: "Synthetic cash receipt verified by the fixture finance owner", provider: "MANUAL_WA" } } });
  } else if (proof) await db.cRMActivity.create({ data: { id: `sales-cinetpay-paid:${reference}`, dealId: f.deal.id, activityType: "SALES_PAYMENT_RECONCILED", description: "Owned synthetic PSP receipt, no real money",
    metadata: { independentProviderProof: true, proposalId: f.state.proposal!.id, paymentReference: reference, providerRef: payment.providerRef, amountMinor: 12000, currency: "XOF" } } });
  return { reference, payment, allocationId, requestId };
}
const grant = (f: Fixture, reference: string) => db.$transaction(tx => grantSalesIntakeReportIn(tx, f.deal.id, reference));
async function decide(f: Fixture, command: SalesStep["command"], admin = false) {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
  return applySalesStep(deal.id, { requestId: randomUUID(), expectedRevision: deal.revision, channel: "WEB", command }, { id: f.owner.id, admin });
}
async function clientMessage(f: Fixture, body: string, deliveryActivityId?: string) {
  const requestId = randomUUID();
  await receiveCustomerMessage(f.token, { requestId, body, ...(deliveryActivityId ? { deliveryActivityId } : {}) });
  return db.crmMessage.findFirstOrThrow({ where: { salesDealId: f.deal.id, providerRef: `web:${requestId}` } });
}

describe.sequential("a paid sales report remains the customer's exact diagnostic", () => {
  it("accepts a same-origin result URL or raw token and rejects external, credentialed or parameterized URLs", () => {
    const token = "owned-diagnostic-token";
    expect(parseSalesDiagnosticToken(token, "https://example.invalid")).toBe(token);
    expect(parseSalesDiagnosticToken(`https://example.invalid/intake/${token}/result`, "https://example.invalid")).toBe(token);
    for (const url of [`https://other.invalid/intake/${token}/result`, `https://user@example.invalid/intake/${token}/result`, `https://example.invalid/intake/${token}/result?paid=true`, `https://example.invalid/intake/${token}/result#secret`, `https://example.invalid/api/intake/${token}/pdf`]) expect(() => parseSalesDiagnosticToken(url, "https://example.invalid")).toThrow();
  });
  it("links only by the customer's consent/token/email while keeping invoice identity, price and both ADVE dossiers unchanged", async () => {
    const f = await fixture(), raw = input(f), before = await db.pillar.findMany({ where: { strategyId: { in: [f.seller.id, f.buyer.id] } } });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false);
    const first = await link(f, raw); await link(f, raw);
    expect(first.diagnostic).toMatchObject({ linked: true, companyName: f.intake.companyName, alreadyAvailable: false });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(deal).toMatchObject({ strategyId: f.buyer.id, intakeId: f.intake.id, sellerStrategyId: f.seller.id, companyName: f.deal.companyName, value: 12000, currency: "XOF" });
    expect(deal.companyName).not.toBe(f.intake.companyName);
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_CUSTOMER_DIAGNOSTIC_LINKED" } })).toBe(1);
    expect(await db.crmMessage.count({ where: { salesDealId: deal.id } })).toBe(1);
    expect(await db.pillar.findMany({ where: { strategyId: { in: [f.seller.id, f.buyer.id] } } })).toEqual(before);
    const receipt = await db.cRMActivity.findUniqueOrThrow({ where: { id: `sales-intake-link:${deal.id}` } });
    expect(JSON.stringify(receipt.metadata)).not.toContain(f.intake.shareToken);
    await db.$transaction(tx => assertSalesIntakeReportReadyIn(tx, deal, f.state, f.email));
  });
  it("rejects absent consent, foreign email, unfinished/quarantined diagnostics and the seller's own strategy", async () => {
    const f = await fixture(), raw = input(f);
    await expect(link(f, { ...raw, consent: false as true })).rejects.toThrow();
    await expect(link(f, { ...raw, email: "foreign@example.invalid" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    for (const patch of [{ status: "IN_PROGRESS" as const }, { quarantinedAt: new Date() }, { convertedToId: f.seller.id }]) {
      await db.quickIntake.update({ where: { id: f.intake.id }, data: patch });
      await expect(link(f)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await db.quickIntake.update({ where: { id: f.intake.id }, data: { status: "COMPLETED", quarantinedAt: null, convertedToId: f.buyer.id } });
    }
    expect((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).intakeId).toBeNull();
    await expect(db.$transaction(tx => assertSalesIntakeReportReadyIn(tx, f.deal, f.state, f.email))).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
  it("does not reroute a bound or paid report to another diagnostic, proposal or email", async () => {
    const f = await fixture(), other = await fixture(); await link(f);
    await expect(link(f, { ...input(other), email: other.email })).rejects.toMatchObject({ code: "CONFLICT" });
    const { reference } = await settled(f); await grant(f, reference);
    await expect(link(f, { ...input(f), email: "other@example.invalid" })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.quickIntake.update({ where: { id: f.intake.id }, data: { convertedToId: other.buyer.id } });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false);
    expect((await readIntakeReportAccess(other.intake.shareToken)).unlocked).toBe(false);
    await db.quickIntake.update({ where: { id: f.intake.id }, data: { convertedToId: f.buyer.id } });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    const changed = salesStateSchema.parse(deal.commercial); changed.proposal!.amount += 1;
    await db.deal.update({ where: { id: deal.id }, data: { commercial: JSON.parse(JSON.stringify(changed)) } });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false);
  });
  it("grants the existing PDF from one verified sales payment without a second payment and triggers premium only once for the buyer", async () => {
    const f = await fixture(); await link(f);
    const { reference } = await settled(f), where = { intakeToken: { in: [f.intake.shareToken, `sales-deal:${f.deal.id}`] } }, before = await db.intakePayment.count({ where });
    await grant(f, reference); await grant(f, reference);
    expect(await db.intakePayment.count({ where })).toBe(before);
    expect((await readIntakeReportAccess(f.intake.shareToken))).toEqual({ unlocked: true, reference });
    expect((await pdfGet(new Request(`http://localhost/api/intake/${f.intake.shareToken}/pdf`), { params: Promise.resolve({ token: f.intake.shareToken }) })).status).toBe(200);
    await Promise.all([fulfillPaidIntakeReport(reference), fulfillPaidIntakeReport(reference)]);
    expect(premium).toHaveBeenCalledExactlyOnceWith(f.intake.shareToken);
    expect(premium).not.toHaveBeenCalledWith(f.seller.id);
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_DELIVERY_READY" } })).toBe(1);
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }), state = salesStateSchema.parse(deal.commercial);
    expect(state.node).toBe("ACCEPTED");
    const activity = await db.cRMActivity.findFirstOrThrow({ where: { dealId: deal.id, activityType: "SALES_DELIVERY_READY" } });
    expect(await verifySalesIntakeDeliveryIn(db, deal, { ...state, node: "PAID" }, activity)).toBe(true);
    expect(await verifySalesIntakeDeliveryIn(db, deal, { ...state, node: "PAID" }, { ...activity, metadata: { ...(activity.metadata as object), artifact: "/api/intake/another-token/pdf" } })).toBe(false);
    expect((await salesIntakeReportProjectionIn(db, deal, state))?.preparation).toBe("READY");
    await db.intakePayment.update({ where: { reference }, data: { status: "FAILED" } });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false);
  });
  it("does not grant from a PAID flag without independent proof or from PENDING/FAILED payment", async () => {
    const f = await fixture(); await link(f);
    const { reference } = await settled(f, false);
    await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false);
    for (const status of ["PENDING", "FAILED"] as const) {
      await db.intakePayment.update({ where: { reference }, data: { status } });
      await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
    await fulfillPaidIntakeReport(reference); expect(premium).not.toHaveBeenCalled();
  });
  it("grants the same report after a human-verified cash or Orange Money payment with its own allocation proof", async () => {
    const f = await fixture(); await link(f); const { reference } = await settled(f, true, true);
    const where = { intakeToken: { in: [f.intake.shareToken, `sales-deal:${f.deal.id}`] } }, before = await db.intakePayment.count({ where });
    await grant(f, reference); await grant(f, reference); await fulfillPaidIntakeReport(reference);
    expect(await readIntakeReportAccess(f.intake.shareToken)).toEqual({ unlocked: true, reference });
    expect(await db.intakePayment.count({ where })).toBe(before); expect(premium).toHaveBeenCalledExactlyOnceWith(f.intake.shareToken);
    const proof = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_PAYMENT_RECONCILED" } });
    expect(proof.performedBy).toBe(f.owner.id); expect(proof.metadata).toMatchObject({ independentHumanProof: true, verifiedBy: f.owner.id });
    expect(proof.metadata).not.toHaveProperty("independentProviderProof");
    const delivery = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_DELIVERY_READY" } });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(await verifySalesIntakeDeliveryIn(db, deal, { ...salesStateSchema.parse(deal.commercial), node: "PAID" }, delivery)).toBe(true);
  });
  it("receives the manual entitlement from the real finance validation service, not a fixture-created reconciliation flag", async () => {
    const f = await fixture(); await link(f);
    const { reference } = await settled(f, false, true);
    await db.intakePayment.update({ where: { reference }, data: { status: "PENDING", paidAt: null, providerRef: null, providerEventId: null } });
    const requestId = randomUUID(), raw = { dealId: f.deal.id, requestId, observedAmount: 12000, currency: "XOF",
      externalReference: `OWNED-CASH-${randomUUID()}`, evidence: "Local fixture receipt reviewed by the designated finance owner. No real money transfer." };
    const result = await reconcileSalesPayment(raw, { id: f.owner.id, admin: false, operatorId: null });
    expect(result.status).toBe("PAID"); expect(await readIntakeReportAccess(f.intake.shareToken)).toEqual({ unlocked: true, reference });
    const proof = await db.cRMActivity.findUniqueOrThrow({ where: { id: `sales-payment:${requestId}` } });
    expect(proof.metadata).toMatchObject({ independentHumanProof: true, verifiedBy: f.owner.id, paymentReference: reference, proposalId: f.state.proposal!.id });
    await reconcileSalesPayment(raw, { id: f.owner.id, admin: false, operatorId: null });
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_INTAKE_REPORT_ENTITLEMENT" } })).toBe(1);
    await fulfillPaidIntakeReport(reference); expect(premium).toHaveBeenCalledExactlyOnceWith(f.intake.shareToken);
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${f.deal.id}` } })).toBe(1);
  });
  it("refuses a manual PAID flag, an AI verifier, a foreign human and an allocation attached to another dossier", async () => {
    const f = await fixture(), foreign = await fixture(); await link(f);
    const { reference, allocationId, requestId } = await settled(f, true, true);
    const proofId = `sales-payment:${requestId}`, proof = await db.cRMActivity.findUniqueOrThrow({ where: { id: proofId } });
    for (const actor of ["mcp:forged-finance", foreign.owner.id]) {
      await db.cRMActivity.update({ where: { id: proofId }, data: { performedBy: actor, metadata: { ...(proof.metadata as object), verifiedBy: actor } } });
      await db.cRMActivity.update({ where: { id: allocationId }, data: { performedBy: actor } });
      await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
    await db.cRMActivity.update({ where: { id: proofId }, data: { performedBy: f.owner.id, metadata: { ...(proof.metadata as object), independentHumanProof: false } } });
    await db.cRMActivity.update({ where: { id: allocationId }, data: { performedBy: f.owner.id } });
    await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await db.cRMActivity.update({ where: { id: proofId }, data: { metadata: proof.metadata! } });
    await db.cRMActivity.update({ where: { id: allocationId }, data: { dealId: foreign.deal.id } });
    await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await db.cRMActivity.update({ where: { id: allocationId }, data: { dealId: f.deal.id } });
    const paidDeal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }), paidState = salesStateSchema.parse(paidDeal.commercial);
    await db.deal.update({ where: { id: paidDeal.id }, data: { commercial: JSON.parse(JSON.stringify({ ...paidState,
      mandate: { ...paidState.mandate, collection: { ...paidState.mandate!.collection, financeOwnerId: foreign.owner.id } } })) } });
    await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" }); // Being the seller's owner alone grants no finance approval.
    await db.deal.update({ where: { id: paidDeal.id }, data: { commercial: JSON.parse(JSON.stringify(paidState)) } });
    await db.cRMActivity.update({ where: { id: proofId }, data: { metadata: { ...(proof.metadata as object), independentProviderProof: true } } });
    await expect(grant(f, reference)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(false); expect(premium).not.toHaveBeenCalled();
  });
  it("keeps failed preparation explicit and never marks delivery done or retries the same paid trigger automatically", async () => {
    const f = await fixture(); await link(f); const { reference } = await settled(f); await grant(f, reference);
    premium.mockResolvedValue(false); await fulfillPaidIntakeReport(reference); await fulfillPaidIntakeReport(reference);
    expect(premium).toHaveBeenCalledOnce();
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }), state = salesStateSchema.parse(deal.commercial);
    expect((await salesIntakeReportProjectionIn(db, deal, state))?.preparation).toBe("NEEDS_REVIEW");
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_DELIVERY_READY" } })).toBe(0);
    expect(state.node).toBe("ACCEPTED"); expect(state.delivery).toBeUndefined();
  });
  it("keeps an interrupted preparation for review without changing the acquired payment right", async () => {
    const f = await fixture(); await link(f); const { reference } = await settled(f); await grant(f, reference);
    const receipt = { paymentReference: reference, intakeId: f.intake.id, buyerStrategyId: f.buyer.id, status: "PROCESSING", startedAt: new Date(Date.now() - 16 * 60000).toISOString() };
    await db.cRMActivity.create({ data: { id: `sales-intake-preparation:${reference}`, dealId: f.deal.id, activityType: "SALES_INTAKE_REPORT_PREPARATION", description: "Owned interrupted work", metadata: receipt } });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }), state = salesStateSchema.parse(deal.commercial);
    expect((await salesIntakeReportProjectionIn(db, deal, state))?.preparation).toBe("NEEDS_REVIEW");
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(true);
    await fulfillPaidIntakeReport(reference); expect(premium).not.toHaveBeenCalled();
    expect((await db.cRMActivity.findUniqueOrThrow({ where: { id: `sales-intake-preparation:${reference}` } })).metadata).toEqual(receipt);
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_DELIVERY_READY" } })).toBe(0);
  });
  it("does not announce a full report when the paid treatment returned without its eight stored narrative sections", async () => {
    const f = await fixture(); await link(f); const { reference } = await settled(f); await grant(f, reference);
    await db.quickIntake.update({ where: { id: f.intake.id }, data: { diagnostic: { narrativeReport: null } } });
    await fulfillPaidIntakeReport(reference);
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect((await salesIntakeReportProjectionIn(db, deal, salesStateSchema.parse(deal.commercial)))?.preparation).toBe("NEEDS_REVIEW");
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_DELIVERY_READY" } })).toBe(0);
    expect((await readIntakeReportAccess(f.intake.shareToken)).unlocked).toBe(true);
  });
  it.each(["FAILED", "INTERRUPTED"] as const)("refuses DELIVER after %s preparation even with a customer message after payment", async preparation => {
    const f = await fixture(); await link(f); const { reference } = await settled(f, true, true); await grant(f, reference);
    await decide(f, { type: "PAYMENT", amount: 12000, currency: "XOF", evidence: "Owned native finance receipt" }, true);
    if (preparation === "FAILED") { premium.mockResolvedValue(false); await fulfillPaidIntakeReport(reference); }
    else await db.cRMActivity.create({ data: { id: `sales-intake-preparation:${reference}`, dealId: f.deal.id, activityType: "SALES_INTAKE_REPORT_PREPARATION", description: "Interrupted fixture",
      metadata: { status: "PROCESSING", startedAt: new Date(Date.now() - 16 * 60000).toISOString(), paymentReference: reference } } });
    const message = await clientMessage(f, "Où est mon rapport ? Je n’ai encore reçu aucun document.");
    await expect(decide(f, { type: "DELIVER", customerMessageId: message.id, evidence: "This is not a receipt" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } }), state = salesStateSchema.parse(deal.commercial);
    expect(state.node).toBe("PAID"); expect(state.delivery).toBeUndefined();
    expect((await salesIntakeReportProjectionIn(db, deal, state))?.preparation).toBe("NEEDS_REVIEW");
  });
  it("requires the client's canonical ACK of the ready document before completing the real delivery transition", async () => {
    const f = await fixture(); await link(f); const { reference } = await settled(f, true, true); await grant(f, reference);
    await decide(f, { type: "PAYMENT", amount: 12000, currency: "XOF", evidence: "Owned native finance receipt" }, true);
    const beforeReady = await clientMessage(f, "Merci pour votre réponse.");
    await fulfillPaidIntakeReport(reference);
    const ready = await db.cRMActivity.findFirstOrThrow({ where: { dealId: f.deal.id, activityType: "SALES_DELIVERY_READY" } });
    await expect(decide(f, { type: "DELIVER", customerMessageId: beforeReady.id, evidence: "Old message is not an ACK" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const afterReady = await clientMessage(f, "Quand mon rapport sera-t-il disponible ?");
    await expect(decide(f, { type: "DELIVER", customerMessageId: afterReady.id, evidence: "Free text is not an ACK" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const acknowledgement = await clientMessage(f, "Je confirme avoir reçu le document remis dans cette conversation.", ready.id);
    const receipt = await db.cRMActivity.findUniqueOrThrow({ where: { id: `sales-delivery-acceptance:${acknowledgement.id}` } });
    expect(receipt.metadata).toMatchObject({ deliveryActivityId: ready.id, customerMessageId: acknowledgement.id });
    await db.cRMActivity.update({ where: { id: receipt.id }, data: { metadata: { ...(receipt.metadata as object), artifactHash: "0".repeat(64) } } });
    await expect(decide(f, { type: "DELIVER", customerMessageId: acknowledgement.id, evidence: "Wrong artifact receipt" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await db.cRMActivity.update({ where: { id: receipt.id }, data: { metadata: receipt.metadata! } });
    const delivered = await decide(f, { type: "DELIVER", customerMessageId: acknowledgement.id, evidence: "Canonical receipt of this exact ready report" });
    expect(salesStateSchema.parse(delivered.commercial).node).toBe("DELIVERED");
  });
  it("blocks a useless second charge and returns the already-acquired PDF without forcing an active buyer strategy", async () => {
    const f = await fixture(); const reference = `existing_${randomUUID()}`; refs.push(reference);
    await db.intakePayment.create({ data: { reference, intakeToken: f.intake.shareToken, tierKey: "INTAKE_PDF", provider: "ADMIN_BYPASS", status: "PAID", paidAt: new Date(), amount: 0, currency: "XOF" } });
    await db.strategy.update({ where: { id: f.buyer.id }, data: { status: "ACTIVE" } });
    expect((await link(f)).diagnostic).toMatchObject({ linked: true, alreadyAvailable: true, reportUrl: `/api/intake/${f.intake.shareToken}/pdf` });
    const deal = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    await expect(db.$transaction(tx => assertSalesIntakeReportReadyIn(tx, deal, f.state, f.email))).rejects.toThrow(/déjà accessible/);
    expect(premium).not.toHaveBeenCalled(); expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${deal.id}` } })).toBe(0);
  });
  it("keeps an injected entitlement reader in its own database boundary and preserves ADMIN without writing a ledger", async () => {
    const partial = { intakePayment: { findFirst: vi.fn(async () => null) } };
    const before = await db.intakePayment.count({ where: { intakeToken: "missing-owned-token" } });
    expect(await readIntakeReportAccess("missing-owned-token", undefined, partial as unknown as Pick<typeof db, "intakePayment">)).toEqual({ unlocked: false, reference: null });
    expect(await readIntakeReportAccess("missing-owned-token", "ADMIN", partial as unknown as Pick<typeof db, "intakePayment">)).toEqual({ unlocked: true, reference: null });
    expect(await db.intakePayment.count({ where: { intakeToken: "missing-owned-token" } })).toBe(before);
  });
  it("rejects foreign origins and malformed bodies before associating a diagnostic", async () => {
    const f = await fixture(), url = `http://localhost/api/sales/${f.token}/diagnostic`, params = { params: Promise.resolve({ token: f.token }) };
    expect((await diagnosticPost(new Request(url, { method: "POST", headers: { origin: "https://other.invalid", "content-type": "application/json" }, body: JSON.stringify(input(f)) }), params)).status).toBe(403);
    expect((await diagnosticPost(new Request(url, { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ ...input(f), consent: false }) }), params)).status).toBe(400);
    expect((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).intakeId).toBeNull();
  });
});
