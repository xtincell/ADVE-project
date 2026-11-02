import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { advanceSale, salesStateSchema } from "@/server/services/crm-engine/commercial";
import { claimRun, saveSalesRepresentative, setSalesRepresentativeStatus, type FleetActor } from "@/server/services/crm-engine/fleet";
import { wakeDueSalesActions } from "@/server/services/crm-engine/events";
import { approvedCadencePlanIn, datedSalesRequestId, firstContactSalesPlan, prepareSalesPlanIn, validateDatedSalesRunIn } from "@/server/services/crm-engine/scheduling";

let actor: FleetActor, brandId: string;
const profileIds: string[] = [], dealIds: string[] = [];
const now = new Date("2027-01-10T12:00:00.000Z");
beforeAll(async () => {
  process.env.INTEGRATION_TOKEN_KEY = "owned-scheduling-test-key-32-characters";
  const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: "Scheduling receipt" } });
  actor = { id: user.id, admin: true, operatorId: null };
  brandId = (await db.strategy.create({ data: { name: "Owned scheduling receipt", userId: actor.id } })).id;
});
afterAll(async () => {
  const profiles = await db.salesRepresentative.findMany({ where: { id: { in: profileIds } } });
  const conversations = profiles.flatMap(p => p.conversationId ? [p.conversationId] : []);
  const keys = profiles.flatMap(p => p.mcpKeyId ? [p.mcpKeyId] : []);
  await db.message.deleteMany({ where: { conversationId: { in: conversations } } });
  await db.salesRun.deleteMany({ where: { representativeId: { in: profileIds } } });
  await db.salesRepresentative.deleteMany({ where: { id: { in: profileIds } } });
  await db.conversation.deleteMany({ where: { id: { in: conversations } } });
  await db.mcpApiKey.deleteMany({ where: { id: { in: keys } } });
  await db.crmMessage.deleteMany({ where: { salesDealId: { in: dealIds } } });
  await db.cRMActivity.deleteMany({ where: { dealId: { in: dealIds } } });
  await db.deal.deleteMany({ where: { id: { in: dealIds } } });
  await db.strategy.delete({ where: { id: brandId } });
  await db.user.delete({ where: { id: actor.id } });
  await db.$disconnect();
});
async function fixture(firstContactAt = "2027-01-10T11:00:00.000Z") {
  const profile = await saveSalesRepresentative(actor, { strategyId: brandId, name: "Dated seller", mode: "AI" });
  profileIds.push(profile.id);
  await setSalesRepresentativeStatus(actor, profile.id, "ACTIVE");
  const mandate = { offerId: "owned", offerName: "Owned synthetic offer", offerVersion: "1", terms: "Synthetic only",
    amount: 60000, currency: "XOF", sellerId: profile.principalId!, deliveryOwnerId: actor.id, beneficiary: "Owned receipt",
    expiresAt: "2028-01-01T00:00:00.000Z", paymentInstructions: "No real payment", channels: ["EMAIL" as const, "WEB" as const], outboundEmailEnabled: true,
    portfolioAuthorizationId: randomUUID(), portfolioMemberId: randomUUID(),
    outreachPolicy: { firstContactAt, followUpAfterDays: [3, 7], dailyOutboundLimit: 1, minIntervalHours: 24 } };
  const plan = firstContactSalesPlan(mandate, mandate.portfolioAuthorizationId, new Date("2027-01-09T12:00:00.000Z"))!;
  const row = await db.deal.create({ data: { sellerStrategyId: brandId, companyName: "Owned buyer", contactName: "Owned buyer", contactEmail: `${randomUUID()}@example.invalid`,
    commercial: { node: "DISCOVERY", mandate, nextPlan: plan, nextDeadline: plan.dueAt, nextAction: plan.action } } });
  dealIds.push(row.id);
  return { row, profile, mandate, plan };
}
async function valid(f: Awaited<ReturnType<typeof fixture>>, time = now) {
  return db.$transaction(tx => validateDatedSalesRunIn(tx, { requestId: datedSalesRequestId(f.row.id, f.plan.id), dealId: f.row.id, representativeId: f.profile.id }, time));
}
async function updateState(f: Awaited<ReturnType<typeof fixture>>, change: Record<string, unknown>) {
  const row = await db.deal.findUniqueOrThrow({ where: { id: f.row.id } });
  return db.deal.update({ where: { id: row.id }, data: { commercial: JSON.parse(JSON.stringify({ ...(row.commercial as object), ...change })) } });
}
describe("explicit commercial deadlines on the existing queue", () => {
  it("does nothing before the date and queues one bounded mission under concurrent due polls", async () => {
    const f = await fixture();
    expect((await wakeDueSalesActions(f.profile.id, new Date("2027-01-10T10:00:00.000Z"))).queued).toBe(0);
    await Promise.all([wakeDueSalesActions(f.profile.id, now), wakeDueSalesActions(f.profile.id, now)]);
    expect(await db.salesRun.count({ where: { dealId: f.row.id } })).toBe(1);
    expect((await valid(f)).allowed).toBe(true);
    expect(await db.cRMActivity.count({ where: { dealId: f.row.id } })).toBe(0);
  });
  it("discards a superseded queued reminder before reserving tokens or invoking the seller", async () => {
    const actual = new Date();
    const f = await fixture(new Date(actual.getTime() - 60_000).toISOString());
    const plan = { ...f.plan, createdAt: new Date(actual.getTime() - 120_000).toISOString() };
    await updateState(f, { nextPlan: plan });
    expect((await wakeDueSalesActions(f.profile.id, actual)).queued).toBe(1);
    await db.crmMessage.create({ data: { salesDealId: f.row.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: "New response replaces silence." } });
    expect((await claimRun(f.profile.mcpKeyId!, randomUUID())).run).toBeNull();
    const run = await db.salesRun.findFirstOrThrow({ where: { dealId: f.row.id } });
    expect(run.status).toBe("FAILED"); expect(run.reservedTokens).toBe(0);
    const profile = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.profile.id } });
    expect(profile.dailyRunsClaimed).toBe(0); expect(profile.dailyTokensReserved).toBe(0);
  });
  it("revalidates STOP, pause and expiration after a task was queued", async () => {
    const f = await fixture(); await wakeDueSalesActions(f.profile.id, now);
    await setSalesRepresentativeStatus(actor, f.profile.id, "PAUSED");
    expect((await valid(f)).allowed).toBe(false);
    await setSalesRepresentativeStatus(actor, f.profile.id, "ACTIVE");
    await updateState(f, { contactStopped: true }); expect((await valid(f)).allowed).toBe(false);
    await updateState(f, { contactStopped: false, mandate: { ...f.mandate, expiresAt: "2027-01-10T11:30:00.000Z" } });
    expect((await valid(f)).allowed).toBe(false);
  });
  it("does not resurrect an old schedule after pause/resume or handover", async () => {
    const f = await fixture();
    await db.message.create({ data: { conversationId: f.profile.conversationId!, channel: "SALES_MANAGER", senderName: "Supervision",
      content: "État du vendeur : PAUSED", createdAt: new Date("2027-01-10T10:00:00.000Z") } });
    expect((await valid(f)).reason).toContain("nouvelle date");
    await db.cRMActivity.create({ data: { id: randomUUID(), dealId: f.row.id, activityType: "SALES_EMAIL_SENT", description: "Contact before pause", performedAt: new Date("2027-01-09T13:00:00.000Z") } });
    expect(await db.$transaction(tx => approvedCadencePlanIn(tx, f.row, salesStateSchema.parse(f.row.commercial), now))).toBeUndefined();
    const state = advanceSale(salesStateSchema.parse(f.row.commercial), { requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "HANDOVER", sellerId: "new-authorized-seller" } }, actor, now);
    expect(state.nextPlan).toBeUndefined();
    expect(state.cadenceSuspended).toBe(true);
    expect(await db.$transaction(tx => approvedCadencePlanIn(tx, f.row, state, now))).toBeUndefined();
  });
  it("blocks a new response and a same-brand stop without sending or replaying uncertainty", async () => {
    const f = await fixture(); await wakeDueSalesActions(f.profile.id, now);
    await db.crmMessage.create({ data: { salesDealId: f.row.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: "A real newer answer", createdAt: new Date("2027-01-10T11:10:00.000Z") } });
    expect((await valid(f)).reason).toContain("réponse");
    const other = await fixture();
    await db.deal.update({ where: { id: other.row.id }, data: { contactEmail: f.row.contactEmail, commercial: { node: "STOPPED", contactStopped: true, mandate: other.mandate } } });
    expect((await valid(f)).reason).toContain("arrêté");
    const uncertain = await fixture();
    await db.cRMActivity.create({ data: { dealId: uncertain.row.id, activityType: "SALES_EMAIL_UNCERTAIN", description: "Uncertain receipt" } });
    expect((await wakeDueSalesActions(uncertain.profile.id, now)).queued).toBe(0);
    expect((await valid(uncertain)).reason).toContain("incertain");
    expect(await db.cRMActivity.count({ where: { dealId: uncertain.row.id } })).toBe(1);
  });
  it("derives successive dates from confirmed contacts, never a pending attempt or an invented model date", async () => {
    const f = await fixture();
    await db.cRMActivity.create({ data: { id: randomUUID(), dealId: f.row.id, activityType: "SALES_EMAIL_SENT", description: "Confirmed first contact", performedAt: new Date("2027-01-10T11:00:00.000Z") } });
    const state = salesStateSchema.parse(f.row.commercial);
    const first = await db.$transaction(tx => approvedCadencePlanIn(tx, f.row, state, now));
    expect(first?.dueAt).toBe("2027-01-13T11:00:00.000Z");
    const normalized = await db.$transaction(tx => prepareSalesPlanIn(tx, f.row.id, state, { requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "PLAN_NEXT_ACTION", basis: "APPROVED_CADENCE", purpose: "FOLLOW_UP", action: "Approved follow-up", nextDeadline: "2027-01-11T00:00:00.000Z" } }, { id: f.mandate.sellerId, admin: false }, now));
    expect(normalized.command).toHaveProperty("nextDeadline", first!.dueAt);
    expect(normalized.channel).toBe("EMAIL");
    await db.cRMActivity.create({ data: { id: randomUUID(), dealId: f.row.id, activityType: "SALES_EMAIL_SENT", description: "Confirmed first follow-up", performedAt: new Date("2027-01-13T11:00:00.000Z") } });
    const second = await db.$transaction(tx => approvedCadencePlanIn(tx, f.row, state, now));
    expect(second?.dueAt).toBe("2027-01-20T11:00:00.000Z");
    await db.cRMActivity.create({ data: { dealId: f.row.id, activityType: "SALES_EMAIL_PENDING", description: "Not a receipt" } });
    await expect(db.$transaction(tx => prepareSalesPlanIn(tx, f.row.id, state, normalized, { id: f.mandate.sellerId, admin: false }, now))).rejects.toThrow("réconciliation");
  });
  it("automatically advances one consumed plan only after confirmed sending, without self-rearming a failed task", async () => {
    const f = await fixture(); await wakeDueSalesActions(f.profile.id, now);
    await db.salesRun.updateMany({ where: { dealId: f.row.id }, data: { status: "DONE", completedAt: now } });
    await db.cRMActivity.create({ data: { id: randomUUID(), dealId: f.row.id, activityType: "SALES_EMAIL_SENT", description: "Confirmed contact", performedAt: now } });
    await wakeDueSalesActions(f.profile.id, now);
    const current = await db.deal.findUniqueOrThrow({ where: { id: f.row.id } });
    expect(salesStateSchema.parse(current.commercial).nextDeadline).toBe("2027-01-13T12:00:00.000Z");
    await wakeDueSalesActions(f.profile.id, new Date("2027-01-13T12:01:00.000Z"));
    expect(await db.salesRun.count({ where: { dealId: f.row.id } })).toBe(2);
    await db.salesRun.updateMany({ where: { dealId: f.row.id, status: "QUEUED" }, data: { status: "FAILED", completedAt: now } });
    await wakeDueSalesActions(f.profile.id, new Date("2027-01-14T12:01:00.000Z"));
    expect(await db.salesRun.count({ where: { dealId: f.row.id } })).toBe(2);
  });
  it("requires the actual received customer appointment and makes delivery review internal only", async () => {
    const f = await fixture();
    const previous = salesStateSchema.parse(f.row.commercial);
    const step = { requestId: randomUUID(), expectedRevision: 0, channel: "WEB" as const, command: { type: "PLAN_NEXT_ACTION" as const, basis: "CUSTOMER_REQUEST" as const, purpose: "FOLLOW_UP" as const, action: "Requested appointment", nextDeadline: "2027-01-12T12:00:00.000Z", customerMessageId: "not-a-received-message" } };
    await expect(db.$transaction(tx => prepareSalesPlanIn(tx, f.row.id, previous, step, actor, now))).rejects.toThrow("demande reçue");
    const received = await db.crmMessage.create({ data: { salesDealId: f.row.id, direction: "IN", status: "RECEIVED", channel: "WEB", body: "Please call on 2027-01-12 at 12:00 UTC", createdAt: now } });
    const accepted = await db.$transaction(tx => prepareSalesPlanIn(tx, f.row.id, previous, { ...step, command: { ...step.command, customerMessageId: received.id } }, actor, now));
    expect(advanceSale(previous, accepted, actor, now).nextDeadline).toBe(step.command.nextDeadline);
    const review = { ...f.plan, purpose: "VALUE_REVIEW" as const };
    await updateState(f, { node: "DELIVERED", delivery: "Actual receipt", nextPlan: review });
    expect(await valid(f)).toEqual({ allowed: true, internalOnly: true });
    expect((await wakeDueSalesActions(f.profile.id, now)).queued).toBe(1);
    expect(await db.cRMActivity.count({ where: { dealId: f.row.id } })).toBe(0);
  });
});
