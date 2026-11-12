import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { requestSalesPayment, reconcileSalesPayment, listCommercialPaymentRequests, type SalesPaymentActor } from "@/server/services/crm-engine/payments";
import { salesStateSchema, type SalesState } from "@/server/services/crm-engine/commercial";
import { saveSalesRepresentative, setSalesRepresentativeStatus } from "@/server/services/crm-engine/fleet";
import { crmRouter } from "@/server/trpc/routers/crm";
import { paymentRouter } from "@/server/trpc/routers/payment";
import type { Context } from "@/server/trpc/context";

const dealIds: string[] = [], brandIds: string[] = [], userIds: string[] = [], operatorIds: string[] = [], legacyReferences: string[] = [];
let owner: SalesPaymentActor, finance: SalesPaymentActor, seller: SalesPaymentActor, outsider: SalesPaymentActor, admin: SalesPaymentActor;
let brandId: string, siblingBrandId: string, otherBrandId: string, humanProfileId: string;
let ai: Awaited<ReturnType<typeof saveSalesRepresentative>>;
const seed = randomUUID();
const context = (actor: SalesPaymentActor) => ({ db, session: { user: { id: actor.id, name: "Owned financial receipt", role: actor.id === admin.id ? "ADMIN" : "USER", email: `${actor.id}@example.invalid` }, expires: "2030-01-01T00:00:00.000Z" } } as Context);
async function makeDeal(options: { amount?: number; currency?: string; node?: SalesState["node"]; collection?: boolean; sellerId?: string; financeOwnerId?: string; destinationRef?: string; strategyId?: string; attestedBy?: string } = {}) {
  const amount = options.amount ?? 19.99, currency = options.currency ?? "EUR";
  const node = options.node ?? "ACCEPTED";
  const state: SalesState = { node, ...(node === "ACCEPTED" ? { agreement: "Owned synthetic buyer explicitly accepted the stated terms." } : {}), mandate: {
    offerId: "owned-offer", offerVersion: "1", offerName: "Owned synthetic service", terms: "Synthetic service, no actual money or external customer.", amount, currency,
    sellerId: options.sellerId ?? seller.id, deliveryOwnerId: owner.id, beneficiary: "Owned synthetic beneficiary", expiresAt: "2030-01-01T00:00:00.000Z", channels: ["WEB"], paymentInstructions: "Synthetic destination only; no transfer.",
    ...(options.collection === false ? {} : { collection: { mode: "MANUAL" as const, destinationRef: options.destinationRef ?? `owned-account-${seed}`, financeOwnerId: options.financeOwnerId ?? finance.id, attestedBy: options.attestedBy ?? owner.id, attestedAt: new Date().toISOString() } }),
  } };
  const row = await db.deal.create({ data: { sellerStrategyId: options.strategyId ?? brandId, operatorId: options.strategyId === otherBrandId ? operatorIds[1] : operatorIds[0], companyName: `Owned synthetic buyer ${dealIds.length}`, contactName: "Owned synthetic contact", contactPhone: "+000533000", stage: "NEGOTIATION", value: amount, currency, commercial: JSON.parse(JSON.stringify(state)) } });
  dealIds.push(row.id); return row;
}
async function request(dealId: string, actor = owner) {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  return requestSalesPayment(dealId, randomUUID(), deal.revision, actor);
}
const proof = (dealId: string, externalReference = `synthetic-bank-${randomUUID()}`, observedAmount = 19.99, currency = "EUR") => ({ dealId, requestId: randomUUID(), observedAmount, currency, externalReference, evidence: "Owned synthetic independent statement proof; no real banking operation." });
beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
  if (!["localhost", "127.0.0.1"].includes(target.hostname) || !(target.pathname === "/shinkiro_fleet533_tests" || (process.env.CI && target.pathname === "/shinkiro_verify"))) throw new Error("Only the owned local fleet533 or isolated CI database may receive financial test fixtures.");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "owned-fleet531-encryption-key-32-characters");
  for (let index = 0; index < 2; index++) {
    const op = await db.operator.create({ data: { name: `Owned payment operator ${index}`, slug: `owned-payments-${seed}-${index}`, status: "ACTIVE", licenseType: "OWNER", licensedAt: new Date(), licenseExpiry: new Date("2030-01-01") } }); operatorIds.push(op.id);
  }
  for (const [index, name] of ["Owner without operator", "Finance", "Human seller", "Outsider", "Actual admin"].entries()) {
    const user = await db.user.create({ data: { name, email: `${randomUUID()}@example.invalid`, role: index === 4 ? "ADMIN" : "USER", operatorId: [1, 2].includes(index) ? operatorIds[0] : index === 3 ? operatorIds[1] : null } }); userIds.push(user.id);
  }
  [owner, finance, seller, outsider, admin] = userIds.map((id, index) => ({ id, admin: index === 4, operatorId: [1, 2].includes(index) ? operatorIds[0]! : index === 3 ? operatorIds[1]! : null })) as [SalesPaymentActor, SalesPaymentActor, SalesPaymentActor, SalesPaymentActor, SalesPaymentActor];
  for (const [index, name] of ["Owned payment brand", "Owned sibling brand", "Unrelated payment brand"].entries()) {
    const brand = await db.strategy.create({ data: { name, userId: index === 2 ? outsider.id : owner.id, operatorId: operatorIds[index === 2 ? 1 : 0] } }); brandIds.push(brand.id);
  }
  [brandId, siblingBrandId, otherBrandId] = brandIds as [string, string, string];
  const human = await saveSalesRepresentative({ ...owner, operatorId: null }, { strategyId: brandId, name: "Owned human financial seller", mode: "HUMAN", humanUserId: seller.id }); humanProfileId = human.id;
  await setSalesRepresentativeStatus({ ...owner, operatorId: null }, human.id, "ACTIVE");
  ai = await saveSalesRepresentative({ ...owner, operatorId: null }, { strategyId: brandId, name: "Owned AI payment requester", mode: "AI" });
  await setSalesRepresentativeStatus({ ...owner, operatorId: null }, ai.id, "ACTIVE");
});
afterAll(async () => {
  try {
    const profiles = await db.salesRepresentative.findMany({ where: { strategyId: { in: brandIds } } });
    const conversations = profiles.flatMap(profile => profile.conversationId ? [profile.conversationId] : []);
    await db.message.deleteMany({ where: { conversationId: { in: conversations } } });
    await db.salesRun.deleteMany({ where: { representativeId: { in: profiles.map(profile => profile.id) } } });
    await db.salesRepresentative.deleteMany({ where: { id: { in: profiles.map(profile => profile.id) } } });
    await db.conversation.deleteMany({ where: { id: { in: conversations } } });
    await db.mcpApiKey.deleteMany({ where: { id: { in: profiles.flatMap(profile => profile.mcpKeyId ? [profile.mcpKeyId] : []) } } });
    await db.cRMActivity.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.deal.deleteMany({ where: { id: { in: dealIds } } });
    await db.intakePayment.deleteMany({ where: { OR: [{ intakeToken: { in: dealIds.map(id => `sales-deal:${id}`) } }, { reference: { in: legacyReferences } }] } });
    await db.intentEmission.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.strategy.deleteMany({ where: { id: { in: brandIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.operator.deleteMany({ where: { id: { in: operatorIds } } });
  } finally { vi.unstubAllEnvs(); await db.$disconnect(); }
});

describe("commercial collection in owned PostgreSQL", () => {
  it("lets an owner without operator authorize one native request concurrently through the real route", async () => {
    const deal = await makeDeal(); const input = { dealId: deal.id, requestId: randomUUID(), expectedRevision: 0 };
    const caller = crmRouter.createCaller(context(owner));
    const [first, replay] = await Promise.all([caller.requestSalesPayment(input), caller.requestSalesPayment(input)]);
    expect(first).toEqual(replay); expect(first.amount).toBe(19.99); expect(first.canReconcile).toBe(false);
    const native = await db.intakePayment.findUniqueOrThrow({ where: { reference: first.reference } });
    expect(native).toMatchObject({ intakeToken: `sales-deal:${deal.id}`, amount: 1999, currency: "EUR", provider: "MANUAL_WA", tierKey: "SALES_COLLECTION", status: "PENDING", subscriptionId: null, paidAt: null });
    const current = await db.deal.findUniqueOrThrow({ where: { id: deal.id } }); const state = salesStateSchema.parse(current.commercial);
    expect(current.revision).toBe(1); expect(state.node).toBe("ACCEPTED"); expect(current.strategyId).toBeNull(); expect(current.intakeId).toBeNull();
    expect(current.paymentReference).toBe(first.reference); expect(state.mandate?.intakePaymentReference).toBe(first.reference);
    expect(await db.intakePayment.count({ where: { intakeToken: native.intakeToken } })).toBe(1);
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_PAYMENT_REQUESTED" } })).toBe(1);
    expect((await caller.listCommercialPaymentRequests({ strategyId: brandId })).find(row => row.dealId === deal.id)?.amount).toBe(19.99);
  });
  it("refuses another owner, spoofed admin, absent attestation and missing agreement without payment writes", async () => {
    const unrelated = await makeDeal({ strategyId: otherBrandId, financeOwnerId: outsider.id, attestedBy: outsider.id });
    await expect(request(unrelated.id)).rejects.toThrow("hors de votre marque");
    await expect(listCommercialPaymentRequests(otherBrandId, owner)).rejects.toThrow("hors de votre marque");
    const own = await makeDeal(); await expect(request(own.id, { ...outsider, admin: true })).rejects.toThrow("hors de votre marque");
    const unattested = await makeDeal({ collection: false }); await expect(request(unattested.id)).rejects.toThrow("Confirmez où recevoir");
    const notAccepted = await makeDeal({ node: "PROPOSAL" }); await expect(request(notAccepted.id)).rejects.toThrow("accord explicite");
    for (const deal of [unrelated, own, unattested, notAccepted]) expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${deal.id}` } })).toBe(0);
  });
  it("refuses a paused human seller while preserving the owner's financial duty", async () => {
    const deal = await makeDeal(); await setSalesRepresentativeStatus({ ...owner, operatorId: null }, humanProfileId, "PAUSED");
    await expect(request(deal.id, seller)).rejects.toThrow("suspendu");
    expect((await request(deal.id, owner)).status).toBe("PENDING");
    await setSalesRepresentativeStatus({ ...owner, operatorId: null }, humanProfileId, "ACTIVE");
  });
  it("requires the designated human financier, exact received major amount, currency and external proof", async () => {
    const deal = await makeDeal(); const pending = await request(deal.id); const input = proof(deal.id);
    await expect(reconcileSalesPayment(input, seller)).rejects.toThrow("personne désignée pour vérifier");
    await expect(reconcileSalesPayment(input, owner)).rejects.toThrow("personne désignée pour vérifier");
    await expect(reconcileSalesPayment(input, { id: ai.principalId!, admin: true })).rejects.toThrow("personne doit vérifier");
    await expect(reconcileSalesPayment({ ...input, observedAmount: 20 }, finance)).rejects.toThrow("différents");
    await expect(reconcileSalesPayment({ ...input, currency: "USD" }, finance)).rejects.toThrow("différents");
    await expect(reconcileSalesPayment({ ...input, evidence: "" }, finance)).rejects.toThrow();
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: pending.reference } })).status).toBe("PENDING");
    const caller = crmRouter.createCaller(context(finance)); const paid = await caller.reconcileSalesPayment(input);
    expect(paid).toMatchObject({ status: "PAID", amount: 19.99, canReconcile: true }); expect(paid.paidAt).toBeInstanceOf(Date);
    expect(await caller.reconcileSalesPayment(input)).toEqual(paid);
    await expect(caller.reconcileSalesPayment({ ...input, evidence: "Another proof under the same receipt identifier" })).rejects.toThrow("déjà été utilisée");
    const current = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
    expect(current.revision).toBe(2); expect(salesStateSchema.parse(current.commercial).node).toBe("ACCEPTED");
    expect(await db.cRMActivity.count({ where: { dealId: deal.id, activityType: "SALES_PAYMENT_RECONCILED" } })).toBe(1);
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: pending.reference } })).amount).toBe(1999);
  });
  it("allocates one external receipt per destination and currency under concurrent competing deals", async () => {
    const first = await makeDeal(), second = await makeDeal({ strategyId: siblingBrandId });
    const payments = await Promise.all([request(first.id), request(second.id)]); const external = `same-bank-receipt-${randomUUID()}`;
    const results = await Promise.allSettled([reconcileSalesPayment(proof(first.id, external), finance), reconcileSalesPayment(proof(second.id, external.toLowerCase()), finance)]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1); expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
    expect(await db.intakePayment.count({ where: { reference: { in: payments.map(row => row.reference) }, status: "PAID" } })).toBe(1);
    const otherAccount = await makeDeal({ destinationRef: `another-owned-account-${seed}` }); await request(otherAccount.id);
    expect((await reconcileSalesPayment(proof(otherAccount.id, external), finance)).status).toBe("PAID");
  });
  it("keeps request identifiers, revisions and native allocations bound to the exact affair", async () => {
    const first = await makeDeal(), second = await makeDeal(); const requestId = randomUUID();
    await expect(requestSalesPayment(first.id, requestId, 1, owner)).rejects.toThrow("dossier a évolué");
    await requestSalesPayment(first.id, requestId, 0, owner);
    await expect(requestSalesPayment(second.id, requestId, 0, owner)).rejects.toThrow("déjà été utilisée");
    const next = await makeDeal(); const created = await request(next.id);
    await db.intakePayment.update({ where: { reference: created.reference }, data: { intakeToken: `sales-deal:${first.id}` } });
    await expect(reconcileSalesPayment(proof(next.id), finance)).rejects.toThrow("correspondre à cette affaire");
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${second.id}` } })).toBe(0);
  });
  it("permits a scoped active AI run to request collection and denies a missing lease or paused holder", async () => {
    const deal = await makeDeal({ sellerId: ai.principalId! });
    const actor = { id: ai.principalId!, admin: false };
    await expect(request(deal.id, actor)).rejects.toThrow("tâche en cours");
    const run = await db.salesRun.create({ data: { representativeId: ai.id, dealId: deal.id, requestId: randomUUID(), instruction: "Owned synthetic payment request only", status: "RUNNING", claimedAt: new Date(), leaseToken: randomUUID(), claimRequestId: randomUUID() } });
    expect((await request(deal.id, { ...actor, salesRunId: run.id })).status).toBe("PENDING");
    const next = await makeDeal({ sellerId: ai.principalId! });
    await expect(request(next.id, { ...actor, salesRunId: run.id })).rejects.toThrow("tâche de vente");
    await db.salesRun.update({ where: { id: run.id }, data: { dealId: next.id } });
    await setSalesRepresentativeStatus({ ...owner, operatorId: null }, ai.id, "PAUSED");
    await expect(request(next.id, { ...actor, salesRunId: run.id })).rejects.toThrow("tâche de vente");
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${next.id}` } })).toBe(0);
    await setSalesRepresentativeStatus({ ...owner, operatorId: null }, ai.id, "ACTIVE");
  });
  it("keeps commercial collection out of the old intake approval and rejection paths", async () => {
    const deal = await makeDeal(); const pending = await request(deal.id); const caller = paymentRouter.createCaller(context(admin));
    await expect(caller.approveManualIntakePayment({ reference: pending.reference })).rejects.toThrow("affaire commerciale");
    await expect(caller.rejectManualIntakePayment({ reference: pending.reference })).rejects.toThrow("affaire commerciale");
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: pending.reference } })).status).toBe("PENDING");
    expect((await caller.listManualIntakePayments({ status: "all" })).some(row => row.reference === pending.reference)).toBe(false);
    const reference = `owned-legacy-${randomUUID()}`; legacyReferences.push(reference);
    await db.intakePayment.create({ data: { reference, intakeToken: "owned-legacy-synthetic", amount: 1000, currency: "XOF", tierKey: "INTAKE_PDF", provider: "MANUAL_WA" } });
    expect((await caller.rejectManualIntakePayment({ reference })).status).toBe("FAILED");
  });
  it("supports the owner-financier double role without an operator and stores zero/three-decimal currencies faithfully", async () => {
    const deal = await makeDeal({ amount: 9.875, currency: "TND", financeOwnerId: owner.id });
    const pending = await request(deal.id); expect(pending.canReconcile).toBe(true);
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: pending.reference } })).amount).toBe(9875);
    expect((await reconcileSalesPayment(proof(deal.id, undefined, 9.875, "TND"), owner)).status).toBe("PAID");
    const cfa = await makeDeal({ amount: 60000, currency: "XOF" }); const cfaPayment = await request(cfa.id);
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: cfaPayment.reference } })).amount).toBe(60000);
    for (const options of [{ amount: 1, currency: "WKD" }, { amount: 19.999, currency: "EUR" }]) {
      const invalid = await makeDeal(options); await expect(request(invalid.id)).rejects.toThrow();
      expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${invalid.id}` } })).toBe(0);
    }
  });
});
