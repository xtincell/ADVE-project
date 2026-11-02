import { describe, expect, it } from "vitest";
import { advanceSale, conversationTreeSchema, outreachPolicySchema, salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";
import { firstContactSalesPlan } from "@/server/services/crm-engine/scheduling";

const now = new Date("2026-11-02T12:00:00Z");
const actor = { id: "seller", admin: false };
const mandate = {
  offerId: "gold", offerName: "Gold", offerVersion: "3", terms: "Conditions approuvées",
  amount: 60000, currency: "XOF", sellerId: actor.id, deliveryOwnerId: "delivery",
  beneficiary: "Marque", expiresAt: "2027-01-01T00:00:00.000Z", paymentInstructions: "Référence bancaire approuvée",
  channels: ["EMAIL" as const],
};
const step = (command: SalesStep["command"]): SalesStep => ({
  requestId: "00000000-0000-4000-8000-000000000001", expectedRevision: 0, channel: "EMAIL", command,
});
describe("commercial decision boundaries", () => {
  it("preserves a brand-specific approved tree while changing the business state", () => {
    const conversationTree = conversationTreeSchema.parse({ version: "custom-3", start: "hello", nodes: [
      { id: "hello", prompt: "Comment votre restaurant est-il découvert ?", choices: [
        { id: "need", label: "Besoin exprimé", next: "offer", decision: { type: "QUALIFY", role: "BUYER" } },
      ] },
      { id: "offer", prompt: "Présenter les conditions Gold de la marque.", choices: [] },
    ] });
    const initial = salesStateSchema.parse({ mandate: { ...mandate, conversationTree }, treeNodeId: "hello" });
    const result = advanceSale(initial, step({ type: "BRANCH", choiceId: "need", evidence: "Besoin décrit par le client." }), actor, now);
    expect(result.node).toBe("QUALIFIED");
    expect(result.treeNodeId).toBe("offer");
    expect(result.nextAction).toContain("Gold");
    expect(() => advanceSale(result, step({ type: "BRANCH", choiceId: "need", evidence: "rejeu" }), actor, now)).toThrow();
  });
  it("rejects dangling branches and ambiguous choices", () => {
    expect(conversationTreeSchema.safeParse({ version: "1", start: "missing", nodes: [{ id: "a", prompt: "Question", choices: [] }] }).success).toBe(false);
  });
  it("stops solicitation after refusal while preserving an existing contract", () => {
    const previous = salesStateSchema.parse({ mandate, node: "ACCEPTED", agreement: "client" });
    const stopped = advanceSale(previous, step({ type: "STOP", evidence: "Refus de relance." }), actor, now);
    expect(stopped.node).toBe("ACCEPTED");
    expect(() => advanceSale(stopped, step({ type: "PROPOSE" }), actor, now)).toThrow();
    expect(advanceSale(stopped, step({ type: "PAYMENT", evidence: "Finance", amount: 60000, currency: "XOF" }), { id: "finance", admin: true }, now).node).toBe("PAID");
  });
  it("retains fulfilment rights after the selling mandate expires", () => {
    const previous = salesStateSchema.parse({ mandate: { ...mandate, expiresAt: "2020-01-01T00:00:00.000Z" }, node: "PAID" });
    const result = advanceSale(previous, step({ type: "DELIVER", evidence: "Réception", nextAction: "Revue de valeur", nextDeadline: "2027-01-01T00:00:00.000Z" }), { id: "delivery", admin: false }, now);
    expect(result.node).toBe("DELIVERED");
  });
  it("denies wrong principals, unauthorized channels and sale attempts to partners", () => {
    const initial = salesStateSchema.parse({ mandate });
    expect(() => advanceSale(initial, step({ type: "QUALIFY", role: "BUYER", need: "besoin" }), { id: "other", admin: false }, now)).toThrow();
    expect(() => advanceSale(initial, { ...step({ type: "PROPOSE" }), channel: "SMS" }, actor, now)).toThrow();
    const partner = advanceSale(initial, step({ type: "QUALIFY", role: "PARTNER", need: "Apporter une audience." }), actor, now);
    expect(() => advanceSale(partner, step({ type: "PROPOSE" }), actor, now)).toThrow();
  });
  it("does not invent a cadence, owner permission or a customer appointment", () => {
    const initial = salesStateSchema.parse({ mandate });
    const plan = { type: "PLAN_NEXT_ACTION" as const, action: "Relire le besoin", nextDeadline: "2026-11-05T12:00:00.000Z", purpose: "FOLLOW_UP" as const };
    expect(() => advanceSale(initial, step({ ...plan, basis: "APPROVED_CADENCE" }), actor, now)).toThrow("cadence");
    expect(() => advanceSale(initial, step({ ...plan, basis: "OWNER" }), actor, now)).toThrow("mandant");
    expect(() => advanceSale(initial, step({ ...plan, basis: "CUSTOMER_REQUEST" }), actor, now)).toThrow("rendez-vous");
    const result = advanceSale(initial, step({ ...plan, basis: "OWNER" }), { ...actor, admin: true }, now);
    expect(result.nextDeadline).toBe(plan.nextDeadline);
    expect(result.nextPlan?.id).toBe(step({ ...plan, basis: "OWNER" }).requestId);
    expect(advanceSale(result, step({ type: "STOP", evidence: "Ne plus contacter" }), actor, now).nextPlan).toBeUndefined();
  });
  it("bounds the approved policy and creates independent stable first-contact plans", () => {
    const policy = { firstContactAt: "2026-11-05T12:00:00.000Z", followUpAfterDays: [3, 7], dailyOutboundLimit: 1, minIntervalHours: 24 };
    expect(outreachPolicySchema.safeParse({ ...policy, followUpAfterDays: [3, 3] }).success).toBe(true);
    expect(outreachPolicySchema.safeParse({ ...policy, followUpAfterDays: [0] }).success).toBe(false);
    expect(outreachPolicySchema.safeParse({ ...policy, followUpAfterDays: [1, 2, 3, 4] }).success).toBe(false);
    expect(outreachPolicySchema.safeParse({ ...policy, dailyOutboundLimit: 0 }).success).toBe(false);
    expect(firstContactSalesPlan(mandate, "authorization", now)).toBeUndefined();
    const ownerMandate = { ...mandate, outreachPolicy: policy, portfolioMemberId: "member-a" };
    const one = firstContactSalesPlan(ownerMandate, "authorization", now)!;
    expect(firstContactSalesPlan(ownerMandate, "authorization", now)).toEqual(one);
    expect(firstContactSalesPlan({ ...ownerMandate, portfolioMemberId: "member-b" }, "authorization", now)?.id).not.toBe(one.id);
    expect(one.dueAt).toBe(policy.firstContactAt);
  });
  it("clears a dated solicitation at acceptance and keeps delivery review internal", () => {
    const initial = salesStateSchema.parse({ mandate, node: "PROPOSAL", nextDeadline: "2026-11-05T12:00:00.000Z" });
    const accepted = advanceSale(initial, step({ type: "ACCEPT", evidence: "Accord" }), actor, now);
    expect(accepted.nextDeadline).toBeUndefined();
    const delivered = advanceSale({ ...accepted, node: "PAID" }, step({ type: "DELIVER", evidence: "Réception indépendante", nextAction: "Revue de valeur", nextDeadline: "2026-11-10T12:00:00.000Z" }), { id: "delivery", admin: false }, now);
    expect(delivered.nextPlan?.purpose).toBe("VALUE_REVIEW");
    expect(delivered.node).toBe("DELIVERED");
  });
});
