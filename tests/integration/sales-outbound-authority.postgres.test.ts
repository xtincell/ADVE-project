import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { reserveSalesOutbound } from "@/server/services/crm-engine/outbound-authority";
import * as fleet from "@/server/services/crm-engine/fleet";
import { type SalesActor, type SalesState } from "@/server/services/crm-engine/commercial";

const HOUR = 3600000, DAY = 24 * HOUR;
const brands: string[] = [], deals: string[] = [];
let owner: fleet.FleetActor;
beforeAll(async () => {
  process.env.INTEGRATION_TOKEN_KEY = "owned-outbound-authority-synthetic-key-32-characters";
  owner = { id: (await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Owned outbound test owner" } })).id, admin: false, operatorId: null };
});
afterAll(async () => {
  const profiles = await db.salesRepresentative.findMany({ where: { strategyId: { in: brands } } });
  await db.message.deleteMany({ where: { conversationId: { in: profiles.flatMap(row => row.conversationId ? [row.conversationId] : []) } } });
  await db.salesRun.deleteMany({ where: { representativeId: { in: profiles.map(row => row.id) } } });
  await db.salesRepresentative.deleteMany({ where: { strategyId: { in: brands } } });
  await db.conversation.deleteMany({ where: { strategyId: { in: brands } } });
  await db.mcpApiKey.deleteMany({ where: { id: { in: profiles.flatMap(row => row.mcpKeyId ? [row.mcpKeyId] : []) } } });
  await db.cRMActivity.deleteMany({ where: { dealId: { in: deals } } });
  await db.crmMessage.deleteMany({ where: { salesDealId: { in: deals } } });
  await db.deal.deleteMany({ where: { id: { in: deals } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.delete({ where: { id: owner.id } });
  await db.$disconnect();
});
async function brand() {
  const row = await db.strategy.create({ data: { name: `Owned outbound brand ${randomUUID()}`, userId: owner.id } }); brands.push(row.id);
  return row;
}
function mandate(sellerId = owner.id, portfolioAuthorizationId = randomUUID()) {
  return { sellerId, portfolioAuthorizationId, portfolioMemberId: randomUUID(), offerId: "synthetic-gold", offerVersion: "1", offerName: "Synthetic Gold", terms: "Synthetic permitted terms only", amount: 60000, currency: "XOF", deliveryOwnerId: owner.id, beneficiary: "Synthetic owned beneficiary", paymentInstructions: "No transfer; owned test", expiresAt: new Date(Date.now() + 30 * DAY).toISOString(), channels: ["WEB" as const, "EMAIL" as const], outboundEmailEnabled: true,
    outreachPolicy: { firstContactAt: new Date(Date.now() - DAY).toISOString(), followUpAfterDays: [3], dailyOutboundLimit: 2, minIntervalHours: 24 } };
}
async function deal(strategyId: string, options: { email?: string | null; phone?: string; state?: SalesState } = {}) {
  const row = await db.deal.create({ data: { sellerStrategyId: strategyId, companyName: "Owned synthetic business", contactName: "Synthetic buyer", contactEmail: options.email === null ? null : options.email ?? `${randomUUID()}@example.invalid`, contactPhone: options.phone, commercial: JSON.parse(JSON.stringify(options.state ?? { node: "DISCOVERY", mandate: mandate() })), customerAccessTokenHash: randomUUID() } }); deals.push(row.id);
  return row;
}
function send(dealId: string, actor: SalesActor = { id: owner.id, admin: false }, requestId: string = randomUUID()) {
  return reserveSalesOutbound(dealId, actor, { requestId, fingerprint: `synthetic:${requestId}`, channel: "WEB", body: "Synthetic authorized message, persisted only; no external transport." });
}
async function sent(dealId: string, at: Date) {
  return db.cRMActivity.create({ data: { dealId, activityType: "SALES_EMAIL_SENT", description: "Synthetic confirmed prior message", performedAt: at, metadata: { proactive: true } } });
}

describe("atomic outbound business authority in PostgreSQL", () => {
  it("reserves one remaining portfolio slot under competing members, permits exact replay and does not alter brand data", async () => {
    const b = await brand(), portfolioId = randomUUID();
    const rows = await Promise.all([0, 1, 2].map(() => {
      const approved = mandate(owner.id, portfolioId); approved.outreachPolicy.dailyOutboundLimit = 1;
      return deal(b.id, { state: { node: "DISCOVERY", mandate: approved } });
    }));
    const ids = rows.map(() => randomUUID());
    const results = await Promise.allSettled(rows.map((row, index) => send(row.id, undefined, ids[index]!)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected").map(result => String((result as PromiseRejectedResult).reason))).toEqual(expect.arrayContaining([expect.stringContaining("Limite du portefeuille")]));
    const receipts = await db.cRMActivity.findMany({ where: { dealId: { in: rows.map(row => row.id) } } }); expect(receipts).toHaveLength(1);
    const receipt = receipts[0]!; const replay = await send(receipt.dealId, undefined, receipt.id);
    expect(replay.replay).toBe(true); expect(replay.receipt.id).toBe(receipt.id);
    expect(await db.strategy.findUnique({ where: { id: b.id } })).toEqual(b);
    const otherPortfolio = await deal(b.id); expect((await send(otherPortfolio.id)).replay).toBe(false);
  });
  it("honors STOP from another deal for the same email in this brand while keeping another brand independent", async () => {
    const a = await brand(), b = await brand(), email = `${randomUUID()}@example.invalid`;
    await deal(a.id, { email: email.toUpperCase(), state: { node: "STOPPED", contactStopped: true, mandate: mandate() } });
    const same = await deal(a.id, { email }), other = await deal(b.id, { email });
    await expect(send(same.id)).rejects.toThrow("Contact arrêté");
    expect((await send(other.id)).replay).toBe(false);
  });
  it("recognizes a phone-only STOP despite harmless formatting differences", async () => {
    const b = await brand();
    await deal(b.id, { email: null, phone: "+000123456", state: { node: "STOPPED", contactStopped: true, mandate: mandate() } });
    const same = await deal(b.id, { email: null, phone: "+000 123-456" });
    await expect(send(same.id)).rejects.toThrow("Contact arrêté");
  });
  it("checks the contact interval across deals and does not treat a different authorization as a new person", async () => {
    const b = await brand(), email = `${randomUUID()}@example.invalid`;
    const earlier = await deal(b.id, { email }), next = await deal(b.id, { email });
    await sent(earlier.id, new Date(Date.now() - HOUR));
    await expect(send(next.id)).rejects.toThrow("Intervalle minimal");
    expect(await db.cRMActivity.count({ where: { dealId: next.id } })).toBe(0);
  });
  it("allows an actual recent customer reply without inventing a cold cadence or consuming another proactive slot", async () => {
    const b = await brand(), approved = mandate(); approved.outreachPolicy.dailyOutboundLimit = 1;
    const row = await deal(b.id, { state: { node: "PROPOSAL", mandate: approved } });
    await sent(row.id, new Date(Date.now() - 10000));
    await db.crmMessage.create({ data: { salesDealId: row.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: "Synthetic actual customer question after the prior send." } });
    const response = await send(row.id);
    expect(response.receipt.metadata).toMatchObject({ proactive: false });
    expect(await db.cRMActivity.count({ where: { dealId: row.id, metadata: { path: ["proactive"], equals: true } } })).toBe(1);
  });
  it("anchors interval and the meaning of a new reply to actual delivery confirmation rather than an older reservation", async () => {
    const b = await brand(), row = await deal(b.id, { state: { node: "PROPOSAL", mandate: mandate() } });
    const reserved = new Date(Date.now() - 2 * DAY), confirmed = new Date(Date.now() - HOUR);
    const receipt = await sent(row.id, reserved);
    await db.cRMActivity.update({ where: { id: receipt.id }, data: { metadata: { proactive: true, confirmedAt: confirmed.toISOString() } } });
    const earlierReply = await db.crmMessage.create({ data: { salesDealId: row.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: "Synthetic message before the delayed outbound confirmation.", createdAt: new Date(Date.now() - 2 * HOUR) } });
    await expect(send(row.id)).rejects.toThrow("Intervalle minimal");
    expect(await db.cRMActivity.count({ where: { dealId: row.id } })).toBe(1);
    await db.crmMessage.update({ where: { id: earlierReply.id }, data: { createdAt: new Date(), body: "Synthetic actual reply after confirmed contact." } });
    expect((await send(row.id)).receipt.metadata).toMatchObject({ proactive: false });
  });
  it("counts a delayed confirmed contact in the current portfolio day even when its reservation was older", async () => {
    const b = await brand(), portfolioId = randomUUID(), approved = mandate(owner.id, portfolioId);
    approved.outreachPolicy.dailyOutboundLimit = 1;
    const earlier = await deal(b.id, { state: { node: "DISCOVERY", mandate: approved } });
    const next = await deal(b.id, { state: { node: "DISCOVERY", mandate: { ...approved, portfolioMemberId: randomUUID() } } });
    const receipt = await sent(earlier.id, new Date(Date.now() - 2 * DAY));
    await db.cRMActivity.update({ where: { id: receipt.id }, data: { metadata: { proactive: true, confirmedAt: new Date(Date.now() - HOUR).toISOString() } } });
    await expect(send(next.id)).rejects.toThrow("Limite du portefeuille");
    expect(await db.cRMActivity.count({ where: { dealId: next.id } })).toBe(0);
  });
  it("rejects an AI run after its date is replaced and prevents a value review from sending to a customer", async () => {
    const b = await brand(); const profile = await fleet.saveSalesRepresentative(owner, { strategyId: b.id, name: "Synthetic dated seller", mode: "AI" }); await fleet.setSalesRepresentativeStatus(owner, profile.id, "ACTIVE");
    const approved = mandate(profile.principalId!);
    const plan = { id: randomUUID(), basis: "OWNER" as const, purpose: "FOLLOW_UP" as const, action: "Synthetic due follow-up", channel: "WEB" as const, dueAt: new Date(Date.now() - HOUR).toISOString(), sellerId: profile.principalId!, createdAt: new Date(Date.now() - 2 * HOUR).toISOString() };
    const row = await deal(b.id, { state: { node: "PROPOSAL", mandate: approved, nextPlan: plan, nextDeadline: plan.dueAt } });
    const run = await db.salesRun.create({ data: { representativeId: profile.id, dealId: row.id, requestId: `deadline:${row.id}:${randomUUID()}`, instruction: "Obsolete plan", status: "RUNNING", claimedAt: new Date() } });
    const actor = { id: profile.principalId!, admin: false, salesRunId: run.id, salesRequestId: run.requestId };
    await expect(send(row.id, actor)).rejects.toThrow("remplacée");
    const internal = { ...plan, id: randomUUID(), purpose: "VALUE_REVIEW" as const };
    await db.deal.update({ where: { id: row.id }, data: { commercial: JSON.parse(JSON.stringify({ node: "DELIVERED", mandate: approved, nextPlan: internal, nextDeadline: internal.dueAt })) } });
    const updatedRun = await db.salesRun.update({ where: { id: run.id }, data: { requestId: `deadline:${row.id}:${internal.id}` } });
    await expect(send(row.id, { ...actor, salesRequestId: updatedRun.requestId })).rejects.toThrow("interne");
    expect(await db.cRMActivity.count({ where: { dealId: row.id } })).toBe(0);
  });
  it("blocks pending or uncertain sends and ambiguous work across cases of the same contact", async () => {
    const b = await brand(), email = `${randomUUID()}@example.invalid`;
    const old = await deal(b.id, { email }), next = await deal(b.id, { email });
    for (const activityType of ["SALES_EMAIL_PENDING", "SALES_EMAIL_UNCERTAIN"]) {
      const receipt = await db.cRMActivity.create({ data: { dealId: old.id, activityType, description: "Synthetic unresolved send" } });
      await expect(send(next.id)).rejects.toThrow("réconciliation");
      await db.cRMActivity.delete({ where: { id: receipt.id } });
    }
    const profile = await fleet.saveSalesRepresentative(owner, { strategyId: b.id, name: "Synthetic human holder", mode: "HUMAN", humanUserId: owner.id });
    await fleet.setSalesRepresentativeStatus(owner, profile.id, "ACTIVE");
    await db.salesRun.create({ data: { representativeId: profile.id, dealId: old.id, requestId: randomUUID(), instruction: "Unresolved synthetic run", status: "AMBIGUOUS" } });
    await expect(send(next.id)).rejects.toThrow("réconciliation");
    expect(await db.cRMActivity.count({ where: { dealId: next.id } })).toBe(0);
  });
  it("allows an active human using the STI to follow the approved due date without fabricating an AI lease, and refuses a future date", async () => {
    const b = await brand(); const profile = await fleet.saveSalesRepresentative(owner, { strategyId: b.id, name: "Synthetic STI human", mode: "HUMAN", humanUserId: owner.id }); await fleet.setSalesRepresentativeStatus(owner, profile.id, "ACTIVE");
    const approved = mandate(); const due = new Date(Date.now() - HOUR).toISOString();
    const plan = { id: randomUUID(), basis: "OWNER" as const, purpose: "FOLLOW_UP" as const, action: "Synthetic STI follow-up", channel: "WEB" as const, dueAt: due, sellerId: owner.id, createdAt: new Date(Date.now() - 3 * DAY).toISOString() };
    const row = await deal(b.id, { state: { node: "PROPOSAL", mandate: approved, nextPlan: plan, nextDeadline: due } });
    await sent(row.id, new Date(Date.now() - 2 * DAY));
    const result = await send(row.id); expect(result.replay).toBe(false);
    expect(await db.salesRun.count({ where: { dealId: row.id } })).toBe(0);
    const futureAt = new Date(Date.now() + DAY).toISOString();
    const next = await deal(b.id, { state: { node: "PROPOSAL", mandate: mandate(), nextPlan: { ...plan, id: randomUUID(), dueAt: futureAt }, nextDeadline: futureAt } });
    await sent(next.id, new Date(Date.now() - 2 * DAY));
    await expect(send(next.id)).rejects.toThrow();
    expect(await db.cRMActivity.count({ where: { dealId: next.id } })).toBe(1);
  });
});
