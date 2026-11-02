import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import * as fleet from "@/server/services/crm-engine/fleet";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import { applySalesStep } from "@/server/services/crm-engine";
import { POST as operationsPost } from "@/app/api/mcp/operations/route";

const actor: fleet.FleetActor = { id: "", admin: true, operatorId: null };
let brandId: string, secondBrandId: string, ai: Awaited<ReturnType<typeof fleet.saveSalesRepresentative>>;
const profiles: string[] = [];
const deals: string[] = [];
beforeAll(async () => {
  process.env.INTEGRATION_TOKEN_KEY = "owned-sales-fleet-receipt-key-32-characters";
  actor.id = (await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Fleet owner" } })).id;
  brandId = (await db.strategy.create({ data: { name: "Fleet brand A", userId: actor.id } })).id;
  secondBrandId = (await db.strategy.create({ data: { name: "Fleet brand B", userId: actor.id } })).id;
});
afterAll(async () => {
  const rows = await db.salesRepresentative.findMany({ where: { id: { in: profiles } } });
  await db.message.deleteMany({ where: { conversationId: { in: rows.flatMap(row => row.conversationId ? [row.conversationId] : []) } } });
  await db.salesRun.deleteMany({ where: { representativeId: { in: profiles } } });
  await db.salesRepresentative.deleteMany({ where: { id: { in: profiles } } });
  await db.conversation.deleteMany({ where: { id: { in: rows.flatMap(row => row.conversationId ? [row.conversationId] : []) } } });
  await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: rows.flatMap(row => row.mcpKeyId ? [row.mcpKeyId] : []) } } });
  await db.mcpApiKey.deleteMany({ where: { id: { in: rows.flatMap(row => row.mcpKeyId ? [row.mcpKeyId] : []) } } });
  await db.crmMessage.deleteMany({ where: { salesDealId: { in: deals } } });
  await db.cRMActivity.deleteMany({ where: { dealId: { in: deals } } });
  await db.deal.deleteMany({ where: { id: { in: deals } } });
  await db.crmContact.deleteMany({ where: { strategyId: { in: [brandId, secondBrandId] } } });
  await db.strategy.deleteMany({ where: { id: { in: [brandId, secondBrandId] } } });
  await db.user.deleteMany({ where: { id: actor.id } });
  await db.$disconnect();
});
async function createAI(options: { dailyRunLimit?: number } = {}) {
  const profile = await fleet.saveSalesRepresentative(actor, { strategyId: brandId, name: "Autonomous seller", mode: "AI", dailyRunLimit: options.dailyRunLimit });
  profiles.push(profile.id);
  await fleet.setSalesRepresentativeStatus(actor, profile.id, "ACTIVE");
  return profile;
}
async function queue(profileId: string, instruction = "Read assigned opportunities and report actual next actions.") {
  return fleet.dispatchSalesRepresentative(actor, { id: profileId, instruction, requestId: randomUUID() });
}
function mandate(sellerId: string) { return { offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Owned synthetic terms", amount: 60000, currency: "XOF", sellerId, deliveryOwnerId: actor.id, beneficiary: "Owned receipt", expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Synthetic only", channels: ["WEB", "EMAIL", "PHONE"] }; }
async function deal(strategyId: string, sellerId: string, email?: string) {
  const row = await db.deal.create({ data: { sellerStrategyId: strategyId, companyName: "Synthetic buyer", contactName: "Buyer", contactPhone: "+00000", contactEmail: email, commercial: { node: "DISCOVERY", mandate: mandate(sellerId) } } });
  deals.push(row.id); return row;
}
describe("sales holders, dispatch receipts and incoming customer messages", () => {
  it("provisions a brand-scoped encrypted AI identity without exposing its secret and denies another team", async () => {
    ai = await fleet.saveSalesRepresentative(actor, { strategyId: brandId, name: "Seller", mode: "AI" }); profiles.push(ai.id);
    expect(ai).not.toHaveProperty("encryptedApiKey");
    expect(ai.status).toBe("DRAFT");
    const raw = await db.salesRepresentative.findUniqueOrThrow({ where: { id: ai.id } });
    const key = await db.mcpApiKey.findUniqueOrThrow({ where: { id: raw.mcpKeyId! } });
    expect(key.scopeStrategyId).toBe(brandId); expect(key.scopeKind).toBe("BRAND"); expect(key.server).toBe("*"); expect(key.permissions).toEqual({ managedBy: "sales-fleet", allowedTools: ["operations.sales_portfolio", "operations.sales_decide", "operations.sales_send_email", "operations.sales_send_message", "operations.sales_sync_payment", "operations.sales_claim_run", "operations.sales_complete_run", "operations.sales_customer_link", "advertis.getBrandCard", "advertis.getPillarContent", "intelligence.rag_search"] }); expect(key.ratePerCallUsd).toBe(0); expect(key.isActive).toBe(false);
    expect(decryptTokenPayload<{ apiKey: string }>(raw.encryptedApiKey!).apiKey).toHaveLength(64);
    await expect(fleet.listSalesRepresentatives({ id: "other", admin: false, operatorId: "other" }, brandId)).rejects.toThrow();
    await expect(queue(ai.id)).rejects.toThrow("Activer");
    await fleet.setSalesRepresentativeStatus(actor, ai.id, "ACTIVE");
  });
  it("serializes claims, retries the same claim and settles exactly one completion", async () => {
    await queue(ai.id); await queue(ai.id);
    const requestId = randomUUID();
    const first = await fleet.claimRun(ai.mcpKeyId!, requestId);
    expect(first.run).not.toBeNull();
    const replay = await fleet.claimRun(ai.mcpKeyId!, requestId); expect(replay).toEqual(first);
    const competing = await fleet.claimRun(ai.mcpKeyId!, randomUUID()); expect(competing.run).toBeNull();
    const run = first.run!;
    const results = await Promise.all([1, 2].map(() => fleet.completeRun(ai.mcpKeyId!, run.id, run.leaseToken, { status: "DONE", result: "Actual synthetic observation.", tokensUsed: 1234 })));
    expect(results.every(result => result.ok)).toBe(true);
    expect(await db.message.count({ where: { conversationId: ai.conversationId!, externalId: run.id, senderName: ai.name } })).toBe(1);
    const profile = await db.salesRepresentative.findUniqueOrThrow({ where: { id: ai.id } }); expect(profile.dailyTokensReserved).toBe(1234);
    await expect(fleet.completeRun(ai.mcpKeyId!, run.id, run.leaseToken, { status: "DONE", result: "Different receipt", tokensUsed: 1234 })).rejects.toThrow();
  });
  it("pauses new work while accepting the result of a claim already made", async () => {
    const claim = await fleet.claimRun(ai.mcpKeyId!, randomUUID()); expect(claim.run).not.toBeNull();
    await fleet.setSalesRepresentativeStatus(actor, ai.id, "PAUSED");
    expect((await db.mcpApiKey.findUniqueOrThrow({ where: { id: ai.mcpKeyId! } })).isActive).toBe(true);
    await expect(fleet.getAssignedProfile(ai.mcpKeyId!)).rejects.toThrow();
    expect((await fleet.claimRun(ai.mcpKeyId!, randomUUID())).run).toBeNull();
    await fleet.completeRun(ai.mcpKeyId!, claim.run!.id, claim.run!.leaseToken, { status: "DONE", result: "Stopped after pause, no new effect.", tokensUsed: 100 });
    await fleet.setSalesRepresentativeStatus(actor, ai.id, "ACTIVE");
  });
  it("holds an expired result ambiguous until a manager reconciles it, without replaying the job", async () => {
    const profile = await createAI(); await queue(profile.id); await queue(profile.id);
    const taken = await fleet.claimRun(profile.mcpKeyId!, randomUUID());
    await db.salesRun.update({ where: { id: taken.run!.id }, data: { claimedAt: new Date(Date.now() - 16 * 60_000) } });
    expect((await fleet.claimRun(profile.mcpKeyId!, randomUUID())).run).toBeNull();
    expect((await db.salesRun.findUniqueOrThrow({ where: { id: taken.run!.id } })).status).toBe("AMBIGUOUS");
    await fleet.resolveSalesRun(actor, { runId: taken.run!.id, status: "FAILED", result: "Reconciled: leave the old attempt stopped." });
    const next = await fleet.claimRun(profile.mcpKeyId!, randomUUID()); expect(next.run!.id).not.toBe(taken.run!.id);
  });
  it("reserves run and daily token budgets before any model work", async () => {
    const profile = await createAI({ dailyRunLimit: 1 }); await queue(profile.id); await queue(profile.id);
    const taken = await fleet.claimRun(profile.mcpKeyId!, randomUUID());
    await fleet.completeRun(profile.mcpKeyId!, taken.run!.id, taken.run!.leaseToken, { status: "DONE", result: "Completed once.", tokensUsed: 100 });
    expect((await fleet.claimRun(profile.mcpKeyId!, randomUUID())).run).toBeNull();
    expect((await db.salesRepresentative.findUniqueOrThrow({ where: { id: profile.id } })).dailyRunsClaimed).toBe(1);
  });
  it("receives a phone-only message once and preserves a shared contact's original brand", async () => {
    const phone = await deal(brandId, ai.principalId!);
    const request = { dealId: phone.id, channel: "PHONE", body: "Actual synthetic phone report", externalId: randomUUID() };
    const results = await Promise.all([fleet.recordInboundSalesMessage(request), fleet.recordInboundSalesMessage(request)]);
    expect(results[0].message.id).toBe(results[1].message.id);
    expect(results[0].message.contactId).toBeNull();
    expect(await db.salesRun.count({ where: { dealId: phone.id } })).toBe(1);
    await expect(fleet.recordInboundSalesMessage({ ...request, body: "Changed body" })).rejects.toThrow();
    const email = randomUUID() + "@example.invalid";
    const contact = await db.crmContact.create({ data: { email, strategyId: secondBrandId } });
    const scoped = await deal(brandId, ai.principalId!, email);
    const received = await fleet.recordInboundSalesMessage({ dealId: scoped.id, channel: "EMAIL", body: "Shared email reply.", externalId: randomUUID() });
    expect(received.message.salesDealId).toBe(scoped.id);
    expect((await db.crmContact.findUniqueOrThrow({ where: { id: contact.id } })).strategyId).toBe(secondBrandId);
  });
  it("claims only one queued run concurrently and retains the reservation for an uncertain worker result", async () => {
    const profile = await createAI(); await queue(profile.id); await queue(profile.id);
    const candidates = await Promise.all([fleet.claimRun(profile.mcpKeyId!, randomUUID()), fleet.claimRun(profile.mcpKeyId!, randomUUID())]);
    expect(candidates.filter(value => value.run)).toHaveLength(1);
    const run = candidates.find(value => value.run)!.run!;
    const result = { status: "AMBIGUOUS" as const, result: "Worker interrupted after an uncertain model response.", tokensUsed: 0 };
    await fleet.completeRun(profile.mcpKeyId!, run.id, run.leaseToken, result);
    await fleet.completeRun(profile.mcpKeyId!, run.id, run.leaseToken, result);
    expect((await db.salesRepresentative.findUniqueOrThrow({ where: { id: profile.id } })).dailyTokensReserved).toBe(profile.maxTokens);
    expect((await fleet.claimRun(profile.mcpKeyId!, randomUUID())).run).toBeNull();
  });
  it("requires a received post-payment buyer confirmation before an AI can attest delivery through HTTP MCP", async () => {
    const profile = await createAI();
    const row = await deal(brandId, profile.principalId!);
    await db.deal.update({ where: { id: row.id }, data: { commercial: { node: "ACCEPTED", mandate: { ...mandate(profile.principalId!), deliveryOwnerId: profile.principalId! }, agreement: "Synthetic prior agreement." } } });
    const earlier = await db.crmMessage.create({ data: { salesDealId: row.id, direction: "IN", channel: "WEB", status: "RECEIVED", body: "Prior agreement, not a post-payment delivery receipt.", createdAt: new Date(Date.now() - 60000) } });
    const paid = await applySalesStep(row.id, { requestId: randomUUID(), expectedRevision: row.revision, channel: "WEB", command: { type: "PAYMENT", amount: 60000, currency: "XOF", evidence: "Independently recorded synthetic settlement." } }, { id: actor.id, admin: true });
    await fleet.dispatchSalesRepresentative(actor, { id: profile.id, dealId: row.id, requestId: randomUUID(), instruction: "Verify actual buyer confirmation before recording any delivery." });
    const claim = await fleet.claimRun(profile.mcpKeyId!, randomUUID());
    const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: profile.id } });
    const secret = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
    const invoke = async (customerMessageId?: string) => {
      const response = await operationsPost(new Request("http://localhost/api/mcp/operations", { method: "POST", headers: {
        "content-type": "application/json", "x-api-key": secret, "x-sales-run-id": claim.run!.id, "x-sales-run-lease": claim.run!.leaseToken,
      }, body: JSON.stringify({ tool: "sales_decide", params: { strategyId: brandId, dealId: row.id, step: {
        requestId: randomUUID(), expectedRevision: paid.revision, channel: "WEB", command: { type: "DELIVER", evidence: "Customer confirmation checked.", customerMessageId, nextAction: "Review the synthetic result.", nextDeadline: "2030-01-01T00:00:00.000Z" },
      } } }) }));
      expect(response.status).toBe(200);
      return response.json();
    };
    expect(JSON.stringify(await invoke())).toContain("REFUSED");
    expect(JSON.stringify(await invoke(earlier.id))).toContain("REFUSED");
    const unchanged = await db.deal.findUniqueOrThrow({ where: { id: row.id } });
    expect((unchanged.commercial as { node: string }).node).toBe("PAID");
    expect(unchanged.revision).toBe(paid.revision);
    const accepted = await db.crmMessage.create({ data: { salesDealId: row.id, direction: "IN", channel: "WEB", status: "RECEIVED", body: "I confirm that the synthetic delivery was received and accepted." } });
    expect(JSON.stringify(await invoke(accepted.id))).toContain("DELIVERED");
    expect((await db.deal.findUniqueOrThrow({ where: { id: row.id } })).revision).toBe(paid.revision + 1);
    await fleet.completeRun(profile.mcpKeyId!, claim.run!.id, claim.run!.leaseToken, { status: "DONE", result: "Delivery independently confirmed after payment.", tokensUsed: 0 });
  });
  it("keeps human work on the same roster and manager conversation without model claims", async () => {
    const human = await fleet.saveSalesRepresentative(actor, { strategyId: brandId, name: "Named human", mode: "HUMAN", humanUserId: actor.id }); profiles.push(human.id);
    await fleet.setSalesRepresentativeStatus(actor, human.id, "ACTIVE");
    const run = await queue(human.id);
    await fleet.resolveSalesRun(actor, { runId: run.id, status: "DONE", result: "Human report with actual next action." });
    const detail = await fleet.getSalesRepresentative(actor, human.id);
    expect(detail.messages.map(row => row.content)).toContain("Human report with actual next action.");
    expect(detail.profile.principalId).toBe(actor.id);
    expect((await fleet.salesRosterOptions(actor, brandId)).users.some(user => user.id === actor.id)).toBe(true);
  });
});
