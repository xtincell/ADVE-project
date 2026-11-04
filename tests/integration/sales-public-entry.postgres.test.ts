import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";

vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));

import { db } from "@/lib/db";
import * as fleet from "@/server/services/crm-engine/fleet";
import { applySalesStep } from "@/server/services/crm-engine";
import { customerConversation, receiveCustomerMessage, sendSalesWebMessage } from "@/server/services/crm-engine/customer";
import { salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";
import { requestSalesPayment, reconcileSalesPayment } from "@/server/services/crm-engine/payments";
import { tools as operationsTools } from "@/server/mcp/operations";
import { crmRouter } from "@/server/trpc/routers/crm";
import { GET as publicGet, POST as publicPost } from "@/app/api/sales-entry/[publicId]/route";
import { POST as customerPost } from "@/app/api/sales/[token]/route";
import { POST as mcpPost } from "@/app/api/mcp/operations/route";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import {
  getSalesPublicEntry, saveSalesPublicEntry, publicSalesEntry, startPublicSalesConversation,
} from "@/server/services/crm-engine/public-entry";
import {
  saveSalesPublicEntryInput, startPublicSalesConversationInput,
  type SaveSalesPublicEntryInput, type StartPublicSalesConversationInput,
} from "@/server/services/crm-engine/public-entry-contract";
import type { Context } from "@/server/trpc/context";

const brandIds: string[] = [], userIds: string[] = [];
let owner: fleet.FleetActor, outsider: fleet.FleetActor;
let ownedDatabaseConfirmed = false;
const cap = () => randomBytes(32).toString("hex");
const received = (overrides: Partial<StartPublicSalesConversationInput> = {}): StartPublicSalesConversationInput => ({
  requestId: randomUUID(), clientSecret: cap(), message: "Je cherche une offre adaptée à mon restaurant.", ...overrides,
});
const context = (actor: fleet.FleetActor) => ({ db, session: { user: { id: actor.id, role: "USER", name: "Owned public-entry owner", email: `${actor.id}@example.invalid` }, expires: "2030-01-01T00:00:00.000Z" } }) as Context;
async function emission(input: SaveSalesPublicEntryInput) {
  return (await db.intentEmission.create({ data: { strategyId: input.strategyId, caller: "crm:saveSalesPublicEntry", intentKind: "LEGACY_CRM_UPDATE_DEAL", payload: JSON.parse(JSON.stringify(input)) } })).id;
}
async function save(input: SaveSalesPublicEntryInput, actor = owner) {
  return saveSalesPublicEntry(actor, input, await emission(input));
}
async function fixture(overrides: Partial<SaveSalesPublicEntryInput> = {}, withoutCollection = false, unpriced = false) {
  const brand = await db.strategy.create({ data: { name: `Private synthetic identity ${randomUUID()}`, userId: owner.id } });
  brandIds.push(brand.id);
  await db.pillar.create({ data: { strategyId: brand.id, key: "v", currentVersion: 1,
    content: { produitsCatalogue: [{ id: "gold", nom: "Gold" }, { id: "basic", nom: "Basic" }], privateFinancialNote: "Never publish the brand's private finance assumptions." } } });
  const ai = await fleet.saveSalesRepresentative(owner, { strategyId: brand.id, mode: "AI", name: "Owned public sales holder", maxTokens: 5000, dailyTokenBudget: 50000, dailyRunLimit: 20 });
  await fleet.setSalesRepresentativeStatus(owner, ai.id, "ACTIVE");
  const input: SaveSalesPublicEntryInput = {
    strategyId: brand.id, representativeId: ai.id, expectedRevision: 0, enabled: true,
    publicBrandName: `Public recipe ${randomUUID()}`, welcome: "Parlons de votre projet.", market: "Côte d’Ivoire",
    maxConversationsPerDay: 20, maxConversationsPerHour: 10, collectionAttested: true,
    offers: [{ offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Synthetic monthly service; no result guarantee.",
      amount: 60000, currency: "XOF", deliveryOwnerId: ai.principalId!, beneficiary: "Owned synthetic beneficiary",
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), paymentInstructions: "Private synthetic payment instructions, no money transfer.",
      collection: { mode: "MANUAL", destinationRef: "private-synthetic-bank-destination", financeOwnerId: owner.id } }], ...overrides,
  };
  if (withoutCollection) {
    input.offers = input.offers.map(({ collection: _privateCollection, ...offer }) => offer);
    input.collectionAttested = false;
  }
  if (unpriced) input.offers = input.offers.map(({ amount: _amount, beneficiary: _beneficiary, paymentInstructions: _instructions, ...offer }) => offer);
  await save(input);
  const entry = await db.salesPublicEntry.findUniqueOrThrow({ where: { strategyId: brand.id } });
  return { brand, ai, input, entry };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function start(f: Fixture, input = received(), ipHash = cap()) {
  const result = await startPublicSalesConversation(f.entry.publicId, input, { ipHash });
  const session = await db.salesPublicSession.findUniqueOrThrow({ where: { entryId_requestId: { entryId: f.entry.id, requestId: input.requestId } } });
  const deal = await db.deal.findUniqueOrThrow({ where: { id: session.dealId } });
  return { result, session, deal, token: result.path.split("/").at(-1)! };
}

beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL ?? "postgresql://missing/missing");
  const ownedLocal = database.pathname === "/shinkiro_sales_public_20261104";
  const isolatedCi = process.env.CI === "true" && database.pathname === "/shinkiro_verify";
  if (!["127.0.0.1", "localhost"].includes(database.hostname) || !(ownedLocal || isolatedCi)) {
    throw new Error("Public sales tests require the explicitly owned loopback database or isolated CI shinkiro_verify database.");
  }
  ownedDatabaseConfirmed = true;
  process.env.INTEGRATION_TOKEN_KEY = "owned-public-sales-encryption-key-at-least-32-characters";
  process.env.NEXTAUTH_SECRET = "owned-public-entry-ip-hash-secret-not-a-production-credential";
  for (const name of ["Owned public sales owner", "Unrelated public sales owner"]) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name } }); userIds.push(user.id);
  }
  owner = { id: userIds[0]!, admin: false, operatorId: null };
  outsider = { id: userIds[1]!, admin: false, operatorId: null };
});
afterAll(async () => {
  if (!ownedDatabaseConfirmed) return;
  try {
    const profiles = await db.salesRepresentative.findMany({ where: { strategyId: { in: brandIds } } });
    const conversations = profiles.flatMap(profile => profile.conversationId ? [profile.conversationId] : []);
    const deals = await db.deal.findMany({ where: { sellerStrategyId: { in: brandIds } }, select: { id: true } }); const ids = deals.map(row => row.id);
    await db.salesPublicEntry.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.message.deleteMany({ where: { conversationId: { in: conversations } } });
    await db.salesRun.deleteMany({ where: { representativeId: { in: profiles.map(profile => profile.id) } } });
    await db.salesRepresentative.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.conversation.deleteMany({ where: { id: { in: conversations } } });
    const keyIds = profiles.flatMap(profile => profile.mcpKeyId ? [profile.mcpKeyId] : []);
    await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keyIds } } });
    await db.mcpApiKey.deleteMany({ where: { id: { in: keyIds } } });
    await db.cRMActivity.deleteMany({ where: { dealId: { in: ids } } });
    await db.funnelMapping.deleteMany({ where: { dealId: { in: ids } } });
    await db.crmMessage.deleteMany({ where: { salesDealId: { in: ids } } });
    await db.deal.deleteMany({ where: { id: { in: ids } } });
    await db.intakePayment.deleteMany({ where: { intakeToken: { in: ids.map(id => `sales-deal:${id}`) } } });
    await db.intentEmission.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.strategy.deleteMany({ where: { id: { in: brandIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  } finally { await db.$disconnect(); }
});

describe("brand public sales entry on owned PostgreSQL", () => {
  it("publishes only a curated projection and keeps owner-only mandate and financial data private", async () => {
    const f = await fixture(); const publicView = await publicSalesEntry(f.entry.publicId);
    const serialized = JSON.stringify(publicView);
    expect(serialized).toContain(f.input.publicBrandName); expect(serialized).toContain("Gold");
    expect(serialized).not.toContain(f.brand.name); expect(serialized).not.toContain(owner.id);
    expect(serialized).not.toContain(f.ai.principalId); expect(serialized).not.toContain(f.input.offers[0]!.collection!.destinationRef);
    expect(serialized).not.toContain(f.input.offers[0]!.paymentInstructions); expect(serialized).not.toContain("privateFinancialNote");
    await expect(getSalesPublicEntry(outsider, { strategyId: f.brand.id })).rejects.toThrow();
    await expect(save({ ...f.input, expectedRevision: f.entry.revision }, outsider)).rejects.toThrow();
  });

  it("requires owner approval, exact catalogue version and a valid holder before enabling public entry", async () => {
    const f = await fixture(), foreign = await fixture();
    const update = { ...f.input, expectedRevision: f.entry.revision };
    await expect(saveSalesPublicEntry(owner, update, randomUUID())).rejects.toThrow();
    await expect(save({ ...update, representativeId: foreign.ai.id })).rejects.toThrow();
    await expect(save({ ...update, offers: [{ ...update.offers[0]!, offerVersion: "0" }] })).rejects.toThrow();
    await expect(save({ ...update, offers: [{ ...update.offers[0]!, collection: { ...update.offers[0]!.collection!, financeOwnerId: foreign.ai.principalId! } }] })).rejects.toThrow();
    expect((await db.salesPublicEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).revision).toBe(f.entry.revision);
  });

  it("accepts an anonymous HTTP message with no session and rejects malformed or foreign-origin requests before writing", async () => {
    const f = await fixture(); const params = { params: Promise.resolve({ publicId: f.entry.publicId }) };
    const url = `http://localhost/api/sales-entry/${f.entry.publicId}`;
    const headers = { "content-type": "application/json", origin: "http://localhost" };
    const info = await publicGet(new Request(url), params);
    expect(info.status).toBe(200); expect(info.headers.get("cache-control")).toBe("no-store");
    const foreign = await publicPost(new Request(url, { method: "POST", headers: { ...headers, origin: "https://other.example.invalid" }, body: JSON.stringify(received()) }), params);
    expect(foreign.status).toBe(403);
    const malformed = await publicPost(new Request(url, { method: "POST", headers, body: "{" }), params);
    expect(malformed.status).toBe(400);
    const oversized = await publicPost(new Request(url, { method: "POST", headers, body: JSON.stringify({ ...received(), message: "x".repeat(13000) }) }), params);
    expect([400, 413]).toContain(oversized.status);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(0);
    const input = received(); const response = await publicPost(new Request(url, { method: "POST", headers, body: JSON.stringify(input) }), params);
    expect(response.status).toBe(200); expect((await response.json()).path).toMatch(/^\/sales\/[a-f0-9]{64}$/);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(1);
    expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(1);
  });

  it("accepts the real browser Host origin when Next normalizes the internal request URL to localhost", async () => {
    const f = await fixture(); const publicParams = { params: Promise.resolve({ publicId: f.entry.publicId }) };
    const headers = { "content-type": "application/json", host: "127.0.0.1:3412", origin: "http://127.0.0.1:3412", "x-forwarded-proto": "http" };
    const response = await publicPost(new Request(`http://localhost:3412/api/sales-entry/${f.entry.publicId}`, {
      method: "POST", headers, body: JSON.stringify(received()),
    }), publicParams);
    expect(response.status).toBe(200);
    const { path } = await response.json(); const token = String(path).split("/").at(-1)!;
    const privateParams = { params: Promise.resolve({ token }) };
    const reply = { requestId: randomUUID(), body: "Réponse du navigateur dans la conversation privée." };
    const privateResponse = await customerPost(new Request(`http://localhost:3412/api/sales/${token}`, {
      method: "POST", headers, body: JSON.stringify(reply),
    }), privateParams);
    expect(privateResponse.status).toBe(200);
    const foreignHeaders = { ...headers, origin: "https://foreign.example.invalid" };
    expect((await publicPost(new Request(`http://localhost:3412/api/sales-entry/${f.entry.publicId}`, { method: "POST", headers: foreignHeaders, body: JSON.stringify(received()) }), publicParams)).status).toBe(403);
    expect((await customerPost(new Request(`http://localhost:3412/api/sales/${token}`, { method: "POST", headers: foreignHeaders, body: JSON.stringify({ ...reply, requestId: randomUUID() }) }), privateParams)).status).toBe(403);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(1);
  });

  it("accepts the external TLS origin through the existing reverse-proxy public URL contract", async () => {
    const f = await fixture(); const publicParams = { params: Promise.resolve({ publicId: f.entry.publicId }) };
    const headers = { "content-type": "application/json", host: "powerupgraders.com", origin: "https://powerupgraders.com", "x-forwarded-proto": "https" };
    const response = await publicPost(new Request(`http://internal:3000/api/sales-entry/${f.entry.publicId}`, {
      method: "POST", headers, body: JSON.stringify(received()),
    }), publicParams);
    expect(response.status).toBe(200);
    const { path } = await response.json(); const token = String(path).split("/").at(-1)!;
    const privateParams = { params: Promise.resolve({ token }) };
    const reply = { requestId: randomUUID(), body: "Réponse privée reçue à travers le proxy TLS." };
    expect((await customerPost(new Request(`http://internal:3000/api/sales/${token}`, { method: "POST", headers, body: JSON.stringify(reply) }), privateParams)).status).toBe(200);
    const foreignHeaders = { ...headers, origin: "https://foreign.example.invalid" };
    expect((await publicPost(new Request(`http://internal:3000/api/sales-entry/${f.entry.publicId}`, { method: "POST", headers: foreignHeaders, body: JSON.stringify(received()) }), publicParams)).status).toBe(403);
    expect((await customerPost(new Request(`http://internal:3000/api/sales/${token}`, { method: "POST", headers: foreignHeaders, body: JSON.stringify({ ...reply, requestId: randomUUID() }) }), privateParams)).status).toBe(403);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(1);
  });

  it("lets an authenticated owner without an operator govern and reread the public entry", async () => {
    const f = await fixture(); const caller = crmRouter.createCaller(context(owner));
    await caller.saveSalesPublicEntry({ ...f.input, expectedRevision: f.entry.revision, welcome: "Bonjour, expliquez-nous votre besoin." });
    expect(JSON.stringify(await caller.getSalesPublicEntry({ strategyId: f.brand.id }))).toContain("Bonjour, expliquez-nous votre besoin.");
    const event = await db.intentEmission.findFirstOrThrow({ where: { strategyId: f.brand.id, caller: "crm:saveSalesPublicEntry", status: "OK" } });
    expect(event.strategyId).toBe(f.brand.id);
  });

  it("admits a visitor for a named human holder through the same private desk without an AI job", async () => {
    const f = await fixture();
    const human = await fleet.saveSalesRepresentative(owner, { strategyId: f.brand.id, mode: "HUMAN", humanUserId: owner.id, name: "Owned human public seller" });
    await fleet.setSalesRepresentativeStatus(owner, human.id, "ACTIVE");
    await save({ ...f.input, expectedRevision: f.entry.revision, representativeId: human.id,
      offers: f.input.offers.map(offer => ({ ...offer, deliveryOwnerId: owner.id })) });
    const { deal, token } = await start(f);
    expect(salesStateSchema.parse(deal.commercial).mandate?.sellerId).toBe(owner.id);
    expect(await db.crmMessage.count({ where: { salesDealId: deal.id } })).toBe(1);
    expect(await db.salesRun.count({ where: { dealId: deal.id } })).toBe(0);
    const conversation = await customerConversation(token);
    expect(conversation.state).toBe("DISCOVERY"); expect(conversation.replyStatus).toBe("HUMAN_REPLY");
  });

  it("creates one scoped lead, received message, private access and queued AI job from an anonymous first message", async () => {
    const f = await fixture(); const original = await db.pillar.findUniqueOrThrow({ where: { strategyId_key: { strategyId: f.brand.id, key: "v" } } });
    const input = received(); const { result, deal, token } = await start(f, input);
    expect(result.path).toMatch(/^\/sales\/[a-f0-9]{64}$/); expect(deal.customerAccessTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(deal.contactEmail).toBeNull(); expect(deal.contactPhone).toBeNull(); expect(deal.strategyId).toBeNull(); expect(deal.intakeId).toBeNull();
    expect(deal.stage).toBe("LEAD"); expect(deal.sellerStrategyId).toBe(f.brand.id); expect(deal.paymentReference).toBeNull(); expect(deal.wonAt).toBeNull();
    const state = salesStateSchema.parse(deal.commercial);
    expect(state.node).toBe("DISCOVERY"); expect(state.mandate?.sellerId).toBe(f.ai.principalId); expect(state.mandate?.channels).toEqual(["WEB"]);
    expect(state.mandate?.amount).toBe(60000); expect(state.mandate?.collection?.attestedBy).toBe(owner.id);
    expect(await db.crmMessage.count({ where: { salesDealId: deal.id, direction: "IN", status: "RECEIVED", body: input.message } })).toBe(1);
    expect(await db.salesRun.count({ where: { dealId: deal.id, representativeId: f.ai.id, status: "QUEUED" } })).toBe(1);
    expect(await db.funnelMapping.count({ where: { dealId: deal.id, step: "LEAD" } })).toBe(1);
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${deal.id}` } })).toBe(0);
    expect((await customerConversation(token)).messages[0]?.body).toBe(input.message);
    expect(await db.pillar.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original);
  });

  it("replays one anonymous submission concurrently without duplicating the lead, message, token or job", async () => {
    const f = await fixture(); const input = received(), ipHash = cap();
    const [first, replay] = await Promise.all([
      startPublicSalesConversation(f.entry.publicId, input, { ipHash }),
      startPublicSalesConversation(f.entry.publicId, input, { ipHash }),
    ]);
    expect(first).toEqual(replay);
    const sessions = await db.salesPublicSession.findMany({ where: { entryId: f.entry.id } }); expect(sessions).toHaveLength(1);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(1);
    expect(await db.crmMessage.count({ where: { salesDealId: sessions[0]!.dealId } })).toBe(1);
    expect(await db.salesRun.count({ where: { dealId: sessions[0]!.dealId } })).toBe(1);
    expect(JSON.stringify(sessions)).not.toContain(input.clientSecret);
  });

  it("never returns an existing private conversation for a guessed requestId or changed payload", async () => {
    const f = await fixture(); const input = received(); const first = await start(f, input);
    await expect(startPublicSalesConversation(f.entry.publicId, { ...input, clientSecret: cap() }, { ipHash: cap() })).rejects.toThrow();
    await expect(startPublicSalesConversation(f.entry.publicId, { ...input, message: "Changed request content" }, { ipHash: cap() })).rejects.toThrow();
    await expect(startPublicSalesConversation(f.entry.publicId, { ...input, requestId: randomUUID() }, { ipHash: cap() })).rejects.toThrow();
    expect(await db.salesPublicSession.count({ where: { entryId: f.entry.id } })).toBe(1);
    expect((await startPublicSalesConversation(f.entry.publicId, input, { ipHash: cap() })).path).toBe(first.result.path);
  });

  it("separates brands even when the browser reuses its requestId and capability", async () => {
    const first = await fixture(), second = await fixture(), input = received();
    const a = await start(first, input), b = await start(second, input);
    expect(a.deal.id).not.toBe(b.deal.id); expect(a.result.path).not.toBe(b.result.path);
    expect((await customerConversation(a.token)).brand).toBe(first.input.publicBrandName);
    expect((await customerConversation(b.token)).brand).toBe(second.input.publicBrandName);
    expect(a.deal.sellerStrategyId).toBe(first.brand.id); expect(b.deal.sellerStrategyId).toBe(second.brand.id);
  });

  it("keeps the approved public brand name through private conversation and later publication changes", async () => {
    const f = await fixture({ publicBrandName: "Vitrine client" }); const first = await start(f);
    const initial = await customerConversation(first.token);
    expect(initial.brand).toBe("Vitrine client"); expect(JSON.stringify(initial)).not.toContain(f.brand.name);
    await save({ ...f.input, expectedRevision: f.entry.revision, publicBrandName: "Nouvelle vitrine" });
    expect((await customerConversation(first.token)).brand).toBe("Vitrine client");
    expect((await publicSalesEntry(f.entry.publicId)).brandName).toBe("Nouvelle vitrine");
    const next = await start(f);
    expect((await customerConversation(next.token)).brand).toBe("Nouvelle vitrine");
  });

  it("welcomes information-only visitors without a ready commercial offer, public price or projected revenue", async () => {
    const f = await fixture({ informationOnly: true }, true, true);
    const publicView = await publicSalesEntry(f.entry.publicId);
    expect(publicView.informationOnly).toBe(true); expect(publicView.offers[0]).toEqual({ id: "gold", name: "Gold" });
    const first = await start(f); const state = salesStateSchema.parse(first.deal.commercial);
    expect(state.mandate).toMatchObject({ informationOnly: true, amount: 0 }); expect(state.mandate?.collection).toBeUndefined();
    expect(first.deal.value).toBe(0); expect(first.deal.stage).toBe("LEAD");
    const conversation = await customerConversation(first.token);
    expect(conversation.informationOnly).toBe(true); expect(conversation.offer).toBeNull(); expect(conversation.payment).toBeNull();
    expect(saveSalesPublicEntryInput.safeParse({ ...f.input, informationOnly: false }).success).toBe(false);
  });

  it("keeps an information-only conversation and all approved subjects immutable after republication and subject selection", async () => {
    const f = await fixture({ informationOnly: true });
    const basic = { ...f.input.offers[0]!, offerId: "basic", offerName: "Basic", amount: 10000 };
    const approved = { ...f.input, expectedRevision: f.entry.revision, offers: [...f.input.offers, basic] };
    await save(approved); const first = await start(f);
    const published = await db.salesPublicEntry.findUniqueOrThrow({ where: { id: f.entry.id } });
    await save({ ...approved, expectedRevision: published.revision, informationOnly: false });
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(claimed.run?.dealId).toBe(first.deal.id);
    const actor = { id: f.ai.principalId!, admin: false, salesRunId: claimed.run!.id };
    let current = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
    await applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command: { type: "SELECT_OFFER", offerId: "basic" } }, actor);
    current = await db.deal.findUniqueOrThrow({ where: { id: current.id } });
    await applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command: { type: "QUALIFY", role: "BUYER", need: "The visitor asks about Basic; this remains information only." } }, actor);
    current = await db.deal.findUniqueOrThrow({ where: { id: current.id } });
    expect(salesStateSchema.parse(current.commercial).mandate).toMatchObject({ offerId: "basic", informationOnly: true, amount: 0 }); expect(current.value).toBe(0);
    const frozen = await db.salesPublicSession.findUniqueOrThrow({ where: { id: first.session.id } });
    expect(Array.isArray(frozen.approvedOffers) && frozen.approvedOffers.every(value => !!value && typeof value === "object" && !Array.isArray(value) && value.informationOnly === true)).toBe(true);
    expect((await customerConversation(first.token)).informationOnly).toBe(true);
    const next = await start(f, received({ offerId: "basic" }));
    expect(salesStateSchema.parse(next.deal.commercial).mandate?.informationOnly).not.toBe(true); expect(next.deal.value).toBe(10000);
  });

  it("refuses a visitor or AI attempt to turn an informational conversation into a sales mandate", async () => {
    const f = await fixture({ informationOnly: true }); const payload = received();
    expect(startPublicSalesConversationInput.safeParse({ ...payload, informationOnly: false }).success).toBe(false);
    const first = await start(f, payload); const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID());
    const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.ai.id } });
    const key = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
    const invoke = async (command: Record<string, unknown>) => {
      const current = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
      const response = await mcpPost(new Request("http://localhost/api/mcp/operations", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "x-sales-run-id": claimed.run!.id, "x-sales-run-lease": claimed.run!.leaseToken },
        body: JSON.stringify({ tool: "sales_decide", params: { strategyId: f.brand.id, dealId: first.deal.id, step: { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command } } }) }));
      expect(response.status).toBe(200); return (await response.json()).result;
    };
    const current = salesStateSchema.parse(first.deal.commercial);
    expect((await invoke({ type: "MANDATE", mandate: { ...current.mandate, informationOnly: false } })).status).toBe("REFUSED");
    await invoke({ type: "SELECT_OFFER", offerId: "gold", informationOnly: false });
    const after = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
    expect(salesStateSchema.parse(after.commercial).mandate?.informationOnly).toBe(true); expect(after.value).toBe(0);
  });

  it("refuses proposal, acceptance and collection for information-only conversations even in an imported accepted state", async () => {
    const f = await fixture({ informationOnly: true }); const first = await start(f);
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); const actor = { id: f.ai.principalId!, admin: false, salesRunId: claimed.run!.id };
    const step = async (command: SalesStep["command"]) => {
      const current = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
      return applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command }, actor);
    };
    await step({ type: "QUALIFY", role: "BUYER", need: "Information request from a possible future buyer." });
    await expect(step({ type: "PROPOSE" })).rejects.toThrow();
    const requestId = randomUUID(); await receiveCustomerMessage(first.token, { requestId, body: "J’aimerais accepter, mais cette conversation n’autorise aucune vente." });
    const reply = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: first.deal.id, providerRef: `web:${requestId}` } });
    let row = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } }); let state = salesStateSchema.parse(row.commercial);
    // Owned legacy/corrupt-state counterexample: these seeds are not customer agreement or money received.
    await db.deal.update({ where: { id: row.id }, data: { commercial: JSON.parse(JSON.stringify({ ...state, node: "PROPOSAL" })), revision: { increment: 1 } } });
    await expect(step({ type: "ACCEPT", evidence: "Synthetic reply does not grant sales authority.", customerMessageId: reply.id })).rejects.toThrow();
    row = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } }); state = salesStateSchema.parse(row.commercial);
    const mandate = { ...state.mandate!, collection: { ...f.input.offers[0]!.collection!, attestedBy: owner.id, attestedAt: new Date().toISOString() } };
    await db.deal.update({ where: { id: row.id }, data: { commercial: JSON.parse(JSON.stringify({ ...state, mandate, node: "ACCEPTED" })), revision: { increment: 1 } } });
    row = await db.deal.findUniqueOrThrow({ where: { id: row.id } });
    await expect(requestSalesPayment(row.id, randomUUID(), row.revision, actor)).rejects.toThrow("répondre aux questions");
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${row.id}` } })).toBe(0);
    expect((await customerConversation(first.token)).payment).toBeNull(); expect(row.value).toBe(0);
  });

  it("rejects unknown, disabled and suspended doors without creating any job", async () => {
    await expect(startPublicSalesConversation(`missing-${randomUUID()}`, received(), { ipHash: cap() })).rejects.toThrow();
    const disabled = await fixture({ enabled: false });
    await expect(startPublicSalesConversation(disabled.entry.publicId, received(), { ipHash: cap() })).rejects.toThrow();
    const paused = await fixture(); await fleet.setSalesRepresentativeStatus(owner, paused.ai.id, "PAUSED");
    await expect(startPublicSalesConversation(paused.entry.publicId, received(), { ipHash: cap() })).rejects.toThrow();
    await save({ ...paused.input, expectedRevision: paused.entry.revision, enabled: false });
    expect((await db.salesPublicEntry.findUniqueOrThrow({ where: { id: paused.entry.id } })).enabled).toBe(false);
    for (const f of [disabled, paused]) {
      expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(0);
      expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(0);
    }
  });

  it("refuses a stale catalogue and an expired delegation while allowing capability-protected historical access", async () => {
    const stale = await fixture(); const input = received(); const first = await start(stale, input);
    await db.pillar.update({ where: { strategyId_key: { strategyId: stale.brand.id, key: "v" } }, data: { currentVersion: 2 } });
    await expect(startPublicSalesConversation(stale.entry.publicId, received(), { ipHash: cap() })).rejects.toThrow();
    expect((await startPublicSalesConversation(stale.entry.publicId, input, { ipHash: cap() })).path).toBe(first.result.path);
    const expired = await fixture();
    const row = await db.salesPublicEntry.findUniqueOrThrow({ where: { id: expired.entry.id } });
    const config = row.config as unknown as SaveSalesPublicEntryInput;
    await db.salesPublicEntry.update({ where: { id: row.id }, data: { config: JSON.parse(JSON.stringify({ ...config, offers: config.offers.map(offer => ({ ...offer, expiresAt: new Date(Date.now() - 1000).toISOString() })) })) } });
    await expect(startPublicSalesConversation(expired.entry.publicId, received(), { ipHash: cap() })).rejects.toThrow();
    expect(await db.salesRun.count({ where: { representativeId: expired.ai.id } })).toBe(0);
  });

  it("serializes the hourly public budget under competing new visitors", async () => {
    const f = await fixture({ maxConversationsPerDay: 10, maxConversationsPerHour: 2 });
    const attempts = await Promise.allSettled(Array.from({ length: 4 }, () => startPublicSalesConversation(f.entry.publicId, received(), { ipHash: cap() })));
    expect(attempts.filter(row => row.status === "fulfilled")).toHaveLength(2);
    expect(await db.salesPublicSession.count({ where: { entryId: f.entry.id } })).toBe(2);
    expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(2);
  });

  it("enforces the daily budget after the hourly window and retains exact retries", async () => {
    const f = await fixture({ maxConversationsPerDay: 2, maxConversationsPerHour: 2 }); const input = received();
    const first = await start(f, input); await start(f);
    await db.salesPublicSession.updateMany({ where: { entryId: f.entry.id }, data: { createdAt: new Date(Date.now() - 2 * 3600000) } });
    await expect(startPublicSalesConversation(f.entry.publicId, received(), { ipHash: cap() })).rejects.toThrow();
    expect((await startPublicSalesConversation(f.entry.publicId, input, { ipHash: cap() })).path).toBe(first.result.path);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(2);
  });

  it("bounds repeated new sessions from one source while accepting a capability-protected retry", async () => {
    const f = await fixture(); const ipHash = cap(), input = received(); const first = await start(f, input, ipHash);
    await start(f, received(), ipHash); await start(f, received(), ipHash);
    await expect(startPublicSalesConversation(f.entry.publicId, received(), { ipHash })).rejects.toThrow();
    expect((await startPublicSalesConversation(f.entry.publicId, input, { ipHash })).path).toBe(first.result.path);
    expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(3);
  });

  it("rejects forged offer or financial parameters in the anonymous contract", async () => {
    const f = await fixture();
    await expect(startPublicSalesConversation(f.entry.publicId, received({ offerId: "basic" }), { ipHash: cap() })).rejects.toThrow();
    expect(startPublicSalesConversationInput.safeParse({ ...received(), amount: 1, beneficiary: "Attacker", sellerId: outsider.id }).success).toBe(false);
    expect(saveSalesPublicEntryInput.safeParse({ ...f.input, offers: [{ ...f.input.offers[0], channels: ["EMAIL"], outboundEmailEnabled: true }] }).success).toBe(false);
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(0);
  });

  it("welcomes an uncommitted visitor with several approved offers and also respects an explicit subject", async () => {
    const f = await fixture();
    const basic = { ...f.input.offers[0]!, offerId: "basic", offerName: "Basic", amount: 10000, terms: "Original approved synthetic Basic terms." };
    await save({ ...f.input, expectedRevision: f.entry.revision, offers: [...f.input.offers, basic] });
    const undecided = await start(f, received({ message: "Je ne sais pas encore quelle offre me correspond." }));
    const selected = await start(f, received({ offerId: "basic" }));
    expect(salesStateSchema.parse(undecided.deal.commercial).mandate?.offerId).toBe("gold");
    expect(salesStateSchema.parse(selected.deal.commercial).mandate).toMatchObject({ offerId: "basic", amount: 10000 });
    expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(2);
    expect(undecided.deal.id).not.toBe(selected.deal.id);
  });

  it("lets only the assigned seller choose a frozen approved offer before proposal without rewriting the public catalogue", async () => {
    const f = await fixture();
    const basic = { ...f.input.offers[0]!, offerId: "basic", offerName: "Basic", amount: 10000, terms: "Original approved synthetic Basic terms." };
    const approved = { ...f.input, expectedRevision: f.entry.revision, offers: [...f.input.offers, basic] };
    await save(approved);
    const first = await start(f);
    const configured = await db.salesPublicEntry.findUniqueOrThrow({ where: { id: f.entry.id } });
    await save({ ...approved, expectedRevision: configured.revision,
      offers: [approved.offers[0]!, { ...basic, amount: 11000, terms: "Later approval must not rewrite the existing conversation." }] });
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(claimed.run?.dealId).toBe(first.deal.id);
    const actor = { id: f.ai.principalId!, admin: false, salesRunId: claimed.run!.id };
    const step = async (command: SalesStep["command"], principal = actor) => {
      const current = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
      return applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command }, principal);
    };
    await expect(step({ type: "SELECT_OFFER", offerId: "basic" }, { id: outsider.id, admin: false, salesRunId: claimed.run!.id })).rejects.toThrow();
    await expect(step({ type: "SELECT_OFFER", offerId: "unapproved-offer" })).rejects.toThrow();
    const storedHolder = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.ai.id } });
    const apiKey = decryptTokenPayload<{ apiKey: string }>(storedHolder.encryptedApiKey!).apiKey;
    const beforeSelection = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
    const command = { tool: "sales_decide", params: { strategyId: f.brand.id, dealId: first.deal.id,
      step: { requestId: randomUUID(), expectedRevision: beforeSelection.revision, channel: "WEB", command: { type: "SELECT_OFFER", offerId: "basic" } } } };
    const baseHeaders = { "content-type": "application/json", "x-api-key": apiKey };
    const withoutLease = await mcpPost(new Request("http://localhost/api/mcp/operations", { method: "POST", headers: baseHeaders, body: JSON.stringify(command) }));
    expect(withoutLease.status).toBe(403);
    const selected = await mcpPost(new Request("http://localhost/api/mcp/operations", { method: "POST",
      headers: { ...baseHeaders, "x-sales-run-id": claimed.run!.id, "x-sales-run-lease": claimed.run!.leaseToken }, body: JSON.stringify(command) }));
    expect(selected.status).toBe(200);
    expect(salesStateSchema.parse((await selected.json()).result.commercial).mandate?.offerId).toBe("basic");
    const chosen = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
    expect(salesStateSchema.parse(chosen.commercial).mandate).toMatchObject({ offerId: "basic", amount: 10000, terms: basic.terms,
      sellerId: f.ai.principalId, deliveryOwnerId: f.ai.principalId, channels: ["WEB"] });
    expect(chosen.value).toBe(10000);
    const frozen = await db.salesPublicSession.findUniqueOrThrow({ where: { id: first.session.id } });
    expect(JSON.stringify(frozen.approvedOffers)).toContain(basic.terms); expect(JSON.stringify(frozen.approvedOffers)).not.toContain("Later approval");
    const next = await start(f, received({ offerId: "basic" }));
    expect(salesStateSchema.parse(next.deal.commercial).mandate?.amount).toBe(11000);
    await step({ type: "QUALIFY", role: "BUYER", need: "Synthetic buyer chose the approved Basic service." });
    await step({ type: "PROPOSE" });
    await expect(step({ type: "SELECT_OFFER", offerId: "gold" })).rejects.toThrow();
    expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } })).commercial).node).toBe("PROPOSAL");
    expect((await db.pillar.findUniqueOrThrow({ where: { strategyId_key: { strategyId: f.brand.id, key: "v" } } })).currentVersion).toBe(1);
  });

  it("permits contact and proposal without a financial destination but never fabricates collection authority", async () => {
    const f = await fixture({}, true); const { deal, token } = await start(f);
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(claimed.run?.dealId).toBe(deal.id);
    const actor = { id: f.ai.principalId!, admin: false, salesRunId: claimed.run!.id };
    const step = async (command: SalesStep["command"]) => {
      const current = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
      return applySalesStep(deal.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command }, actor);
    };
    await step({ type: "QUALIFY", role: "BUYER", need: "Synthetic buyer asks about the approved service." });
    await step({ type: "PROPOSE" });
    const requestId = randomUUID(); await receiveCustomerMessage(token, { requestId, body: "J’accepte les conditions présentées pour cette recette." });
    const acceptance = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: deal.id, providerRef: `web:${requestId}` } });
    await step({ type: "ACCEPT", evidence: "Synthetic buyer agreement only; no money received.", customerMessageId: acceptance.id });
    const accepted = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
    expect(salesStateSchema.parse(accepted.commercial).mandate?.collection).toBeUndefined();
    await expect(requestSalesPayment(deal.id, randomUUID(), accepted.revision, actor)).rejects.toThrow();
    expect(await db.intakePayment.count({ where: { intakeToken: `sales-deal:${deal.id}` } })).toBe(0);
  });

  it("keeps subsequent customer messages in the same dossier and never clears an existing STOP", async () => {
    const f = await fixture(); const input = received(); const first = await start(f, input);
    const requestId = randomUUID(); await receiveCustomerMessage(first.token, { requestId, body: "Je précise mon besoin sans créer un autre dossier." });
    expect(await db.deal.count({ where: { sellerStrategyId: f.brand.id } })).toBe(1);
    expect(await db.crmMessage.count({ where: { salesDealId: first.deal.id } })).toBe(2);
    expect(await db.salesRun.count({ where: { dealId: first.deal.id } })).toBe(2);
    const current = await db.deal.findUniqueOrThrow({ where: { id: first.deal.id } });
    await applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command: { type: "STOP", evidence: "Synthetic visitor requested no more contact." } }, { id: owner.id, admin: true });
    expect((await startPublicSalesConversation(f.entry.publicId, input, { ipHash: cap() })).path).toBe(first.result.path);
    expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: current.id } })).commercial).contactStopped).toBe(true);
    await expect(sendSalesWebMessage(current.id, { id: f.ai.principalId!, admin: false }, { requestId: randomUUID(), text: "Must not restart a stopped conversation." })).rejects.toThrow();
  });

  it("returns the actionable STI node, current buyer reply and delivery evidence without repeating the complete tree", async () => {
    const f = await fixture();
    const currentNode = { id: "welcome", prompt: "Quel résultat souhaitez-vous ?", choices: [{ id: "buyer", label: "Présenter mon besoin", next: "later", decision: { type: "QUALIFY" as const, role: "BUYER" as const } }] };
    const tree = { version: "owned-actionable-v1", start: currentNode.id, nodes: [currentNode,
      { id: "later", prompt: `INACTIVE_NODE_ONLY_${"x".repeat(1000)}`, choices: [] }] };
    await save({ ...f.input, expectedRevision: f.entry.revision, offers: f.input.offers.map(offer => ({ ...offer, conversationTree: tree })) });
    const first = await start(f); const oldAt = new Date(Date.now() - 60000);
    await db.crmMessage.createMany({ data: Array.from({ length: 3 }, (_, i) => ({ salesDealId: first.deal.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: `OLD_REPLY_ONLY_${i}`, createdAt: new Date(oldAt.getTime() + i) })) });
    await receiveCustomerMessage(first.token, { requestId: randomUUID(), body: "LATEST_BUYER_REPLY: je souhaite parler de mon besoin actuel." });
    await db.cRMActivity.createMany({ data: [
      ...Array.from({ length: 3 }, (_, i) => ({ dealId: first.deal.id, performedBy: f.ai.principalId!, activityType: "SALES_WEB_SENT", description: `Owned sent ${i}`, metadata: { body: `SENT_REPLY_${i}` }, performedAt: new Date(oldAt.getTime() + i) })),
      { dealId: first.deal.id, performedBy: owner.id, activityType: "SALES_DELIVERY_READY", description: "Owned artifact https://example.invalid/actionable-delivery", performedAt: new Date() },
      { dealId: first.deal.id, performedBy: owner.id, activityType: "SALES_PAYMENT_RECONCILED", description: "Owned historical finance note for projection test", performedAt: new Date() },
    ] });
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(claimed.run?.dealId).toBe(first.deal.id);
    const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.ai.id } });
    const key = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
    const read = async (view?: "ACTIONABLE" | "FULL") => {
      const response = await mcpPost(new Request("http://localhost/api/mcp/operations", { method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "x-sales-run-id": claimed.run!.id, "x-sales-run-lease": claimed.run!.leaseToken },
        body: JSON.stringify({ tool: "sales_portfolio", params: { strategyId: f.brand.id, ...(view ? { view } : {}) } }) }));
      expect(response.status).toBe(200); return (await response.json()).result.deals;
    };
    const actionable = await read("ACTIONABLE"); expect(actionable).toHaveLength(1);
    expect(actionable[0].contextView).toBe("ACTIONABLE"); expect(actionable[0].currentTreeNode).toEqual(currentNode);
    expect(actionable[0].deal.commercial.mandate).toMatchObject({ amount: 60000, currency: "XOF", terms: f.input.offers[0]!.terms });
    expect(actionable[0].deal.commercial.mandate.conversationTree).toBeUndefined();
    expect(actionable[0].replies).toHaveLength(2); expect(JSON.stringify(actionable)).toContain("LATEST_BUYER_REPLY");
    expect(JSON.stringify(actionable)).toContain("https://example.invalid/actionable-delivery"); expect(actionable[0].history).toHaveLength(4);
    expect(actionable[0].replyEarlierCount).toBe(3); expect(actionable[0].historyEarlierCount).toBeGreaterThan(0); expect(actionable[0].contextNotice).toBeTruthy();
    expect(JSON.stringify(actionable)).not.toContain("INACTIVE_NODE_ONLY"); expect(JSON.stringify(actionable)).not.toContain("OLD_REPLY_ONLY");
    const full = await read(); expect(full[0].deal.commercial.mandate.conversationTree).toEqual(tree);
    expect(full[0].currentTreeNode).toEqual(currentNode); expect(JSON.stringify(full)).toContain("INACTIVE_NODE_ONLY");
  });

  it("reports whether an AI reply is queued, processing, sent or awaiting team review after failure", async () => {
    const f = await fixture(); const { deal, token } = await start(f);
    expect((await customerConversation(token)).replyStatus).toBe("QUEUED");
    const first = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(first.run?.dealId).toBe(deal.id);
    expect((await customerConversation(token)).replyStatus).toBe("PROCESSING");
    await sendSalesWebMessage(deal.id, { id: f.ai.principalId!, admin: false, salesRunId: first.run!.id },
      { requestId: randomUUID(), text: "Réponse synthétique effectivement inscrite dans la conversation." });
    expect((await customerConversation(token)).replyStatus).toBe("UP_TO_DATE");
    await fleet.completeRun(f.ai.mcpKeyId!, first.run!.id, first.run!.leaseToken,
      { status: "DONE", result: "Owned deterministic reply-status test; no model called.", tokensUsed: 0 });
    await receiveCustomerMessage(token, { requestId: randomUUID(), body: "Autre question reçue du client de recette." });
    const next = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(next.run?.dealId).toBe(deal.id);
    await fleet.completeRun(f.ai.mcpKeyId!, next.run!.id, next.run!.leaseToken,
      { status: "FAILED", result: "Owned deterministic budget/failure fixture; no model called.", tokensUsed: 0 });
    expect((await customerConversation(token)).replyStatus).toBe("TEAM_REVIEW");
  });

  it("carries a newly arrived buyer through the existing STI, independent collection and accepted delivery", async () => {
    const f = await fixture(); const { deal, token } = await start(f, received({ displayName: "Synthetic new buyer" }));
    const claimed = await fleet.claimRun(f.ai.mcpKeyId!, randomUUID()); expect(claimed.run?.dealId).toBe(deal.id);
    const actor = { id: f.ai.principalId!, admin: false, salesRunId: claimed.run!.id };
    const step = async (command: SalesStep["command"]) => {
      const current = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
      return applySalesStep(deal.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB", command }, actor);
    };
    await step({ type: "QUALIFY", role: "BUYER", need: "Qualified synthetic restaurant wants the approved monthly service." });
    await step({ type: "PROPOSE" });
    const acceptRequest = randomUUID(); await receiveCustomerMessage(token, { requestId: acceptRequest, body: "J’accepte Gold à 60 000 XOF selon les conditions présentées." });
    const acceptMessage = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: deal.id, providerRef: `web:${acceptRequest}` } });
    await step({ type: "ACCEPT", evidence: "Explicit synthetic buyer acceptance.", customerMessageId: acceptMessage.id });
    const accepted = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
    const payment = await requestSalesPayment(deal.id, randomUUID(), accepted.revision, actor);
    const proof = { dealId: deal.id, requestId: randomUUID(), observedAmount: 60000, currency: "XOF", externalReference: `synthetic-proof-${randomUUID()}`, evidence: "Owned test finance independently observed full synthetic payment. No money moved." };
    await expect(reconcileSalesPayment(proof, actor)).rejects.toThrow();
    expect((await reconcileSalesPayment(proof, owner)).status).toBe("PAID");
    const sync = operationsTools.find(tool => tool.name === "sales_sync_payment")!;
    const beforePayment = await db.deal.findUniqueOrThrow({ where: { id: deal.id } });
    await sync.handler({ strategyId: f.brand.id, dealId: deal.id, requestId: randomUUID(), expectedRevision: beforePayment.revision,
      __auth: { scopeKind: "BRAND", scopeStrategyId: f.brand.id, apiKeyId: f.ai.mcpKeyId, salesRunId: claimed.run!.id } });
    expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: deal.id } })).commercial).node).toBe("PAID");
    await expect(step({ type: "DELIVER", evidence: "Unsupported delivery." })).rejects.toThrow();
    await sendSalesWebMessage(deal.id, actor, { requestId: randomUUID(), text: "Votre livrable synthétique est disponible : https://example.invalid/owned-recipe-delivery" });
    const ackRequest = randomUUID(); await receiveCustomerMessage(token, { requestId: ackRequest, body: "J’ai reçu et accepté le livrable synthétique." });
    const ack = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: deal.id, providerRef: `web:${ackRequest}` } });
    await step({ type: "DELIVER", evidence: "Buyer acknowledged the synthetic delivery after payment.", customerMessageId: ack.id });
    await fleet.completeRun(f.ai.mcpKeyId!, claimed.run!.id, claimed.run!.leaseToken, { status: "DONE", result: "Synthetic public-entry sale received through delivery. No real money or customer.", tokensUsed: 0 });
    const final = await db.deal.findUniqueOrThrow({ where: { id: deal.id } }); const state = salesStateSchema.parse(final.commercial);
    expect(state.node).toBe("DELIVERED"); expect(state.nextDeadline).toBeUndefined(); expect(state.nextPlan).toBeUndefined();
    expect(final.paymentReference).toBe(payment.reference); expect((await customerConversation(token)).state).toBe("DELIVERED");
    expect((await db.intakePayment.findUniqueOrThrow({ where: { reference: payment.reference } })).paidAt).not.toBeNull();
  });
});
