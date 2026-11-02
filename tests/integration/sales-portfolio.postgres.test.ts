import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import * as fleet from "@/server/services/crm-engine/fleet";
import { applySalesStep } from "@/server/services/crm-engine";
import { crmRouter } from "@/server/trpc/routers/crm";
import { authorizeSalesPortfolio, listAuthorizedSalesPortfolios } from "@/server/services/crm-engine/portfolio";
import { authorizeSalesPortfolioInput, type AuthorizeSalesPortfolioInput } from "@/server/services/crm-engine/portfolio-contract";
import { salesStateSchema } from "@/server/services/crm-engine/commercial";
import type { Context } from "@/server/trpc/context";

const brands: string[] = [], users: string[] = [], contacts: string[] = [];
let owner: fleet.FleetActor, outsider: fleet.FleetActor;
let brandId: string, otherBrandId: string, ai: Awaited<ReturnType<typeof fleet.saveSalesRepresentative>>;
const seed = randomUUID();
function input(overrides: Partial<AuthorizeSalesPortfolioInput> = {}): AuthorizeSalesPortfolioInput {
  return {
    strategyId: brandId, representativeId: ai.id, requestId: randomUUID(), market: "Côte d’Ivoire",
    source: { label: "Owned synthetic cohort", reference: randomUUID(), eligibilityBasis: "Explicitly authorized synthetic test prospects; no external send." },
    mandate: { offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Synthetic Gold terms; no traffic guarantee.",
      amount: 60000, currency: "XOF", deliveryOwnerId: owner.id, beneficiary: "Owned synthetic beneficiary",
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(), paymentInstructions: "Synthetic instructions; no money transfer.",
      channels: ["WEB", "EMAIL"], outboundEmailEnabled: true,
      outreachPolicy: { firstContactAt: new Date(Date.now() - 1000).toISOString(), followUpAfterDays: [3, 7], dailyOutboundLimit: 2, minIntervalHours: 24 },
      collection: { mode: "MANUAL", destinationRef: "synthetic-account-proof", financeOwnerId: owner.id } },
    collectionAttested: true,
    members: [{ originKey: "synthetic-business-1", contactName: "Synthetic owner", companyName: "Owned synthetic restaurant", contactEmail: `${randomUUID()}@example.invalid` }],
    ...overrides,
  };
}
async function emission(payload: AuthorizeSalesPortfolioInput) {
  return (await db.intentEmission.create({ data: { intentKind: "LEGACY_CRM_CREATE_DEAL", strategyId: payload.strategyId, caller: "crm:authorizeSalesPortfolio", payload: JSON.parse(JSON.stringify(payload)) } })).id;
}
async function authorize(payload: AuthorizeSalesPortfolioInput, actor = owner) {
  return authorizeSalesPortfolio(actor, payload, await emission(payload));
}
function callerFor(actor: fleet.FleetActor) {
  return crmRouter.createCaller({ db, session: { user: { id: actor.id, name: "Synthetic portfolio owner", role: "USER", email: `${actor.id}@example.invalid` }, expires: "2030-01-01T00:00:00.000Z" } } as Context);
}
async function createBrand(name: string) {
  const brand = await db.strategy.create({ data: { name: `${name} ${seed}`, userId: owner.id } }); brands.push(brand.id);
  await db.pillar.create({ data: { strategyId: brand.id, key: "v", currentVersion: 1, content: { produitsCatalogue: [{ id: "gold", nom: "Gold" }] } } });
  return brand.id;
}
beforeAll(async () => {
  process.env.INTEGRATION_TOKEN_KEY = "owned-sales-portfolio-key-with-32-characters";
  for (const name of ["Portfolio owner", "Unrelated owner"]) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name } }); users.push(user.id);
  }
  owner = { id: users[0]!, admin: false, operatorId: null };
  outsider = { id: users[1]!, admin: false, operatorId: null };
  brandId = await createBrand("Owned portfolio brand A"); otherBrandId = await createBrand("Owned portfolio brand B");
  ai = await fleet.saveSalesRepresentative(owner, { strategyId: brandId, name: "Owned synthetic AI seller", mode: "AI" });
  await fleet.setSalesRepresentativeStatus(owner, ai.id, "ACTIVE");
});
afterAll(async () => {
  const profiles = await db.salesRepresentative.findMany({ where: { strategyId: { in: brands } } });
  const runs = await db.salesRun.findMany({ where: { representativeId: { in: profiles.map(profile => profile.id) } }, select: { id: true } });
  const dealRows = await db.deal.findMany({ where: { sellerStrategyId: { in: brands } }, select: { id: true } }); const ids = dealRows.map(deal => deal.id);
  await db.message.deleteMany({ where: { conversationId: { in: profiles.flatMap(profile => profile.conversationId ? [profile.conversationId] : []) } } });
  await db.salesRun.deleteMany({ where: { representativeId: { in: profiles.map(profile => profile.id) } } });
  await db.salesRepresentative.deleteMany({ where: { strategyId: { in: brands } } });
  await db.conversation.deleteMany({ where: { strategyId: { in: brands } } });
  await db.mcpApiKey.deleteMany({ where: { id: { in: profiles.flatMap(profile => profile.mcpKeyId ? [profile.mcpKeyId] : []) } } });
  await db.cRMActivity.deleteMany({ where: { dealId: { in: ids } } });
  await db.funnelMapping.deleteMany({ where: { dealId: { in: ids } } });
  await db.crmMessage.deleteMany({ where: { salesDealId: { in: ids } } });
  await db.deal.deleteMany({ where: { id: { in: ids } } });
  await db.crmContact.deleteMany({ where: { id: { in: contacts } } });
  await db.intentEmission.deleteMany({ where: { OR: [
    { strategyId: { in: brands } },
    ...profiles.map(profile => ({ caller: { startsWith: "crm:" }, payload: { path: ["id"], equals: profile.id } })),
    ...runs.map(run => ({ caller: "crm:resolveSalesRun", payload: { path: ["runId"], equals: run.id } })),
  ] } });
  await db.pillar.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

describe("owner-authorized sales portfolios in PostgreSQL", () => {
  it("lets an authenticated owner without an operator prepare, dispatch and receive the scoped fleet while refusing another owner", async () => {
    const caller = callerFor(owner), unrelated = callerFor(outsider);
    const options = await caller.salesRosterOptions({ strategyId: brandId });
    expect(options.canManage).toBe(true); expect(options.financeUserIds).toContain(owner.id);
    const holder = await caller.saveSalesRepresentative({ strategyId: brandId, name: "Synthetic owner-operated holder", mode: "HUMAN", humanUserId: owner.id });
    await caller.setSalesRepresentativeStatus({ id: holder.id, status: "ACTIVE" });
    expect((await caller.listSalesRepresentatives({ strategyId: brandId })).some(profile => profile.id === holder.id)).toBe(true);
    const payload = input({ representativeId: holder.id });
    payload.mandate.outreachPolicy.firstContactAt = new Date(Date.now() + 86400000).toISOString();
    const cohort = await caller.authorizeSalesPortfolio(payload);
    const run = await caller.dispatchSalesRepresentative({ id: holder.id, dealId: cohort.receipt.members[0]!.dealId,
      requestId: randomUUID(), instruction: "Internal synthetic dossier review, without customer contact." });
    expect((await caller.getSalesRepresentative({ id: holder.id })).runs.some(item => item.id === run.id)).toBe(true);
    await expect(unrelated.listSalesRepresentatives({ strategyId: brandId })).rejects.toThrow();
    await expect(unrelated.getSalesRepresentative({ id: holder.id })).rejects.toThrow();
    await expect(unrelated.salesRosterOptions({ strategyId: brandId })).rejects.toThrow();
    await expect(unrelated.saveSalesRepresentative({ strategyId: brandId, name: "Unauthorized holder", mode: "AI" })).rejects.toThrow();
    await expect(unrelated.setSalesRepresentativeStatus({ id: holder.id, status: "PAUSED" })).rejects.toThrow();
    await expect(unrelated.dispatchSalesRepresentative({ id: holder.id, requestId: randomUUID(), instruction: "Unauthorized instruction." })).rejects.toThrow();
    await expect(unrelated.resolveSalesRun({ runId: run.id, status: "DONE", result: "Unauthorized receipt." })).rejects.toThrow();
    const foreign = await db.deal.create({ data: { sellerStrategyId: otherBrandId, contactName: "Synthetic unrelated buyer", companyName: "Other selling brand" } });
    await expect(caller.dispatchSalesRepresentative({ id: holder.id, dealId: foreign.id, requestId: randomUUID(), instruction: "Wrong selling brand, must not be queued." })).rejects.toThrow("cette marque");
    const receipt = await caller.resolveSalesRun({ runId: run.id, status: "DONE", result: "Synthetic internal review actually completed; no external effect." });
    expect(receipt.ok).toBe(true);
    await caller.setSalesRepresentativeStatus({ id: holder.id, status: "PAUSED" });
    // Fleet access does not remove the existing operator boundary of the global CRM.
    await expect(caller.listDeals({ limit: 5 })).rejects.toThrow();
  });
  it("onboards five explicit opportunities through the real governed route without inventing a sale, payment or buyer brand", async () => {
    const payload = input({ members: Array.from({ length: 5 }, (_, i) => ({ originKey: `governed-${i}`, contactName: `Synthetic person ${i}`, companyName: `Owned synthetic business ${i}`, contactEmail: `${randomUUID()}@example.invalid` })) });
    const caller = crmRouter.createCaller({ db, session: { user: { id: owner.id, name: "Portfolio owner", role: "USER", email: `${seed}@example.invalid` }, expires: "2030-01-01T00:00:00.000Z" } } as Context);
    const result = await caller.authorizeSalesPortfolio(payload);
    expect(result.receipt.members).toHaveLength(5); expect(result.receipt.authorizedBy).toBe(owner.id);
    const intent = await db.intentEmission.findUniqueOrThrow({ where: { id: result.receipt.intentId } });
    expect(intent.caller).toBe("crm:authorizeSalesPortfolio"); expect(intent.status).toBe("OK");
    expect((intent.payload as { requestId: string }).requestId).toBe(payload.requestId);
    const rows = await db.deal.findMany({ where: { id: { in: result.receipt.members.map(member => member.dealId) } } });
    expect(rows).toHaveLength(5);
    const hashes = new Set<string>();
    for (const row of rows) {
      const state = salesStateSchema.parse(row.commercial);
      expect(row.stage).toBe("LEAD"); expect(row.strategyId).toBeNull(); expect(row.intakeId).toBeNull(); expect(row.paymentReference).toBeNull(); expect(row.wonAt).toBeNull();
      expect(state.node).toBe("DISCOVERY"); expect(state.agreement).toBeUndefined(); expect(state.payment).toBeUndefined(); expect(state.delivery).toBeUndefined();
      expect(state.mandate?.portfolioAuthorizationId).toBe(payload.requestId); expect(state.mandate?.sellerId).toBe(ai.principalId);
      expect(state.mandate?.collection?.attestedBy).toBe(owner.id); expect(state.mandate?.intakePaymentReference).toBeUndefined();
      expect(row.customerAccessTokenHash).toMatch(/^[a-f0-9]{64}$/); hashes.add(row.customerAccessTokenHash!);
      expect(await db.funnelMapping.count({ where: { dealId: row.id, step: "LEAD" } })).toBe(1);
      expect(await db.salesRun.count({ where: { dealId: row.id, status: "QUEUED" } })).toBe(1);
    }
    expect(hashes.size).toBe(5);
    expect(await db.intakePayment.count({ where: { intakeToken: { in: rows.map(row => `sales-deal:${row.id}`) } } })).toBe(0);
    expect((await caller.listAuthorizedSalesPortfolios({ strategyId: brandId })).find(item => item.receipt.requestId === payload.requestId)?.receipt).toEqual(result.receipt);
  });

  it("makes concurrent retries one cohort, preserves the receipt and reloads actual outcomes after pause", async () => {
    const payload = input(); const intents = await Promise.all([emission(payload), emission(payload)]);
    const [first, replay] = await Promise.all([
      authorizeSalesPortfolio(owner, payload, intents[0]!), authorizeSalesPortfolio(owner, payload, intents[1]!),
    ] as const);
    expect(first.receipt).toEqual(replay.receipt);
    const dealId = first.receipt.members[0]!.dealId;
    expect(await db.salesRun.count({ where: { dealId } })).toBe(1);
    await applySalesStep(dealId, { requestId: randomUUID(), expectedRevision: 1, channel: "WEB", command: { type: "STOP", evidence: "Synthetic prospect refused further contact." } }, { id: owner.id, admin: true });
    await fleet.setSalesRepresentativeStatus(owner, ai.id, "PAUSED");
    const afterPause = await authorize(payload);
    expect(afterPause.receipt).toEqual(first.receipt); expect(afterPause.outcomes[0]?.node).toBe("STOPPED");
    expect(afterPause.outcomes[0]?.contactStopped).toBe(true);
    await fleet.setSalesRepresentativeStatus(owner, ai.id, "ACTIVE");
  });

  it("rejects changed payloads, another actor and a new approval that reuses the same source opportunity", async () => {
    const payload = input(); const first = await authorize(payload);
    await expect(authorize({ ...payload, market: "Another market" })).rejects.toThrow("déjà");
    await expect(authorize(payload, { ...outsider, admin: true })).rejects.toThrow("déjà");
    await expect(authorize({ ...payload, requestId: randomUUID() })).rejects.toThrow("identité d’origine");
    expect(await db.salesRun.count({ where: { dealId: first.receipt.members[0]!.dealId } })).toBe(1);
  });

  it("checks owner, brand, offer version, principals and the real governed emission before writing", async () => {
    const payload = input();
    const before = await db.deal.count({ where: { sellerStrategyId: brandId } });
    await expect(authorize(payload, outsider)).rejects.toThrow("propriétaire");
    await expect(authorize({ ...payload, strategyId: otherBrandId })).rejects.toThrow("vendeur actif");
    await expect(authorize({ ...payload, mandate: { ...payload.mandate, offerVersion: "0" } })).rejects.toThrow("version");
    await expect(authorize({ ...payload, mandate: { ...payload.mandate, collection: { ...payload.mandate.collection, financeOwnerId: ai.principalId! } } })).rejects.toThrow("humain");
    await expect(authorizeSalesPortfolio(owner, payload, randomUUID())).rejects.toThrow("gouvernée");
    expect(authorizeSalesPortfolioInput.safeParse({ ...payload, mandate: { ...payload.mandate, intakePaymentReference: "another-payment" } }).success).toBe(false);
    expect(authorizeSalesPortfolioInput.safeParse({ ...payload, mandate: { ...payload.mandate, collection: { ...payload.mandate.collection, attestedBy: outsider.id } } }).success).toBe(false);
    expect(authorizeSalesPortfolioInput.safeParse({ ...payload, members: Array.from({ length: 6 }, (_, index) => ({ ...payload.members[0], originKey: `oversized-${index}` })) }).success).toBe(false);
    expect(await db.deal.count({ where: { sellerStrategyId: brandId } })).toBe(before);
  });

  it("rolls back every new member, funnel and job when a later origin collides", async () => {
    const payload = input({ members: [{ originKey: "z-already-onboarded", contactName: "Synthetic existing", companyName: "Collision existing", contactPhone: "+000001" }] });
    await authorize(payload);
    const uniqueCompany = `Must roll back ${randomUUID()}`;
    const before = await db.deal.count({ where: { sellerStrategyId: brandId } });
    await expect(authorize({ ...payload, requestId: randomUUID(), members: [
      { originKey: "a-created-before-collision", contactName: "Synthetic fresh", companyName: uniqueCompany, contactPhone: "+000002" }, payload.members[0]!,
    ] })).rejects.toThrow("identité d’origine");
    expect(await db.deal.count({ where: { sellerStrategyId: brandId } })).toBe(before);
    expect(await db.cRMActivity.count({ where: { description: { contains: uniqueCompany } } })).toBe(0);
  });

  it("keeps same-email brands and phone-only targets separate without taking over a global employer contact", async () => {
    const email = `${randomUUID()}@example.invalid`;
    const employerContact = await db.crmContact.create({ data: { email, name: "Employer-owned synthetic contact", source: "EMPLOYER_ONLY", strategyId: otherBrandId } }); contacts.push(employerContact.id);
    const a = await authorize(input({ members: [{ originKey: "shared-buyer", contactName: "Shared synthetic person", companyName: "Restaurant A", contactEmail: email }] }));
    const other = await fleet.saveSalesRepresentative(owner, { strategyId: otherBrandId, name: "Other brand seller", mode: "AI" }); await fleet.setSalesRepresentativeStatus(owner, other.id, "ACTIVE");
    const b = await authorize(input({ strategyId: otherBrandId, representativeId: other.id, members: [{ originKey: "shared-buyer", contactName: "Shared synthetic person", companyName: "Restaurant B", contactEmail: email }] }));
    expect(a.receipt.members[0]!.dealId).not.toBe(b.receipt.members[0]!.dealId);
    const phoneOnly = await authorize(input({ members: [{ originKey: "phone-only", contactName: "Phone owner", companyName: "Phone-only business", contactPhone: "+000003" }] }));
    expect((await db.deal.findUniqueOrThrow({ where: { id: phoneOnly.receipt.members[0]!.dealId } })).contactEmail).toBeNull();
    expect(await db.crmContact.findUnique({ where: { id: employerContact.id } })).toMatchObject({ strategyId: otherBrandId, source: "EMPLOYER_ONLY" });
    await expect(listAuthorizedSalesPortfolios(outsider, { strategyId: brandId })).rejects.toThrow();
  });

  it("persists future first-contact authority without starting the worker early and cancels obsolete queued deadlines", async () => {
    const payload = input(); payload.mandate.outreachPolicy.firstContactAt = new Date(Date.now() + 86400000).toISOString();
    const future = await authorize(payload); const futureId = future.receipt.members[0]!.dealId;
    expect(future.receipt.members[0]!.initialRunId).toBeNull(); expect(await db.salesRun.count({ where: { dealId: futureId } })).toBe(0);
    expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: futureId } })).commercial).nextDeadline).toBe(payload.mandate.outreachPolicy.firstContactAt);
    const fresh = await fleet.saveSalesRepresentative(owner, { strategyId: brandId, name: "Isolated stale queue seller", mode: "AI" }); await fleet.setSalesRepresentativeStatus(owner, fresh.id, "ACTIVE");
    const ready = await authorize(input({ representativeId: fresh.id })); const dealId = ready.receipt.members[0]!.dealId;
    const original = await db.salesRun.findUniqueOrThrow({ where: { id: ready.receipt.members[0]!.initialRunId! } });
    await db.salesRun.update({ where: { id: original.id }, data: { requestId: `deadline:${dealId}:obsolete-plan`, createdAt: new Date(Date.now() - 10000) } });
    const valid = await fleet.queueRun(fresh.id, { requestId: `synthetic-manual:${randomUUID()}`, dealId, instruction: "Read the actual dossier, no customer send." });
    const claimed = await fleet.claimRun(fresh.mcpKeyId!, randomUUID());
    expect(claimed.run?.id).toBe(valid.id);
    expect(await db.salesRun.findUnique({ where: { id: original.id } })).toMatchObject({ status: "FAILED", tokensUsed: 0 });
    await fleet.completeRun(fresh.mcpKeyId!, claimed.run!.id, claimed.run!.leaseToken, { status: "DONE", result: "Synthetic dossier read only.", tokensUsed: 0 });
  });
  it("adds only the payment-request scope to a managed legacy key on explicit new authorization and never reactivates revocation", async () => {
    const key = await db.mcpApiKey.findUniqueOrThrow({ where: { id: ai.mcpKeyId! } });
    const permissions = key.permissions as { managedBy: string; allowedTools: string[] };
    const legacy = { ...permissions, allowedTools: permissions.allowedTools.filter(tool => tool !== "operations.sales_request_payment") };
    await db.mcpApiKey.update({ where: { id: key.id }, data: { permissions: legacy } });
    await authorize(input());
    const upgraded = await db.mcpApiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(upgraded.permissions).toEqual({ ...legacy, allowedTools: [...legacy.allowedTools, "operations.sales_request_payment"] });
    expect(upgraded.isActive).toBe(key.isActive); expect(upgraded.scopeStrategyId).toBe(key.scopeStrategyId);
    await db.mcpApiKey.update({ where: { id: key.id }, data: { isActive: false, permissions: legacy } });
    await expect(authorize(input())).rejects.toThrow();
    expect(await db.mcpApiKey.findUnique({ where: { id: key.id } })).toMatchObject({ isActive: false, permissions: legacy });
    await fleet.setSalesRepresentativeStatus(owner, ai.id, "ACTIVE");
  });
});
