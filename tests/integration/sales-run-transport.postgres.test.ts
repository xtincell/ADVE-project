import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { POST } from "@/app/api/mcp/operations/route";
import { applySalesStep } from "@/server/services/crm-engine";
import { saveSalesRepresentative, setSalesRepresentativeStatus, type FleetActor } from "@/server/services/crm-engine/fleet";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import { salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";

let userId: string, brandId: string, representativeId: string, keyId: string, apiKey: string, principalId: string, conversationId: string | null;
let mainDeal: string, otherDeal: string, runId: string, leaseToken: string, buyerMessageId: string;
const ownedDeals: string[] = [];
const actor = (): FleetActor => ({ id: userId, admin: true, operatorId: null });
async function invoke(tool: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return POST(new Request("https://example.invalid/api/mcp/operations", { method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, ...headers }, body: JSON.stringify({ tool, params: { strategyId: brandId, ...params } }) }));
}
const leased = () => ({ "x-sales-run-id": runId, "x-sales-run-lease": leaseToken });
async function decision(dealId: string, revision: number, command: SalesStep["command"]) {
  const response = await invoke("sales_decide", { dealId, step: { requestId: randomUUID(), expectedRevision: revision, channel: "WEB", command } }, leased());
  return { response, body: await response.json() };
}
beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || !(target.pathname === "/shinkiro_fleet531" || (process.env.CI && target.pathname === "/shinkiro_verify"))) throw Error("Owned PostgreSQL receipt database required.");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "isolated-sales-run-transport-key-" + randomUUID());
  userId = (await db.user.create({ data: { name: "Mandant du transport de recette", email: randomUUID() + "@example.invalid" } })).id;
  brandId = (await db.strategy.create({ data: { name: "Marque isolée du transport", userId } })).id;
  const profile = await saveSalesRepresentative(actor(), { strategyId: brandId, name: "Vendeur du transport de recette", mode: "AI" });
  representativeId = profile.id; keyId = profile.mcpKeyId!; principalId = profile.principalId!; conversationId = profile.conversationId;
  const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: representativeId } });
  apiKey = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
  const key = await db.mcpApiKey.findUniqueOrThrow({ where: { id: keyId } });
  expect((key.permissions as { managedBy?: string }).managedBy).toBe("sales-fleet");
  for (const companyName of ["Affaire confiée au run", "Autre affaire du même vendeur"]) {
    const deal = await db.deal.create({ data: { sellerStrategyId: brandId, companyName, contactName: "Acheteur de recette", contactPhone: "+000531002" } });
    ownedDeals.push(deal.id);
    await applySalesStep(deal.id, { requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "MANDATE", mandate: {
      offerId: "gold", offerVersion: "1", offerName: "Gold de recette", terms: "Prestation synthétique sans réservation garantie.", amount: 60000, currency: "XOF", sellerId: principalId, deliveryOwnerId: userId,
      beneficiary: "Entité de recette", expiresAt: "2030-01-01T00:00:00.000Z", channels: ["WEB"], paymentInstructions: "Rapprochement synthétique uniquement.",
    } } }, { id: userId, admin: true });
  }
  [mainDeal, otherDeal] = ownedDeals as [string, string];
  buyerMessageId = (await db.crmMessage.create({ data: { salesDealId: mainDeal, direction: "IN", status: "RECEIVED", channel: "WEB", body: "J’accepte les conditions Gold du scénario de recette.", provider: "SALES_PORTAL", providerRef: randomUUID() } })).id;
  // Seed a claimed receipt directly so no continuously polling real worker can consume a test instruction.
  runId = randomUUID(); leaseToken = randomUUID();
  await db.salesRun.create({ data: { id: runId, representativeId, dealId: mainDeal, requestId: randomUUID(), instruction: "Conduire seulement l’affaire confiée dans le scénario de transport.", status: "RUNNING", leaseToken, claimRequestId: randomUUID(), claimedAt: new Date(), reservedTokens: stored.maxTokens } });
  await db.salesRepresentative.update({ where: { id: representativeId }, data: { status: "ACTIVE", budgetDay: new Date().toISOString().slice(0, 10), dailyTokensReserved: stored.maxTokens, dailyRunsClaimed: 1 } });
  await db.mcpApiKey.update({ where: { id: keyId }, data: { isActive: true } });
});
afterAll(async () => {
  try {
    if (representativeId) { await db.salesRun.deleteMany({ where: { representativeId } }); await db.salesRepresentative.deleteMany({ where: { id: representativeId } }); }
    if (conversationId) { await db.message.deleteMany({ where: { conversationId } }); await db.conversation.deleteMany({ where: { id: conversationId } }); }
    if (ownedDeals.length) { await db.cRMActivity.deleteMany({ where: { dealId: { in: ownedDeals } } }); await db.crmMessage.deleteMany({ where: { salesDealId: { in: ownedDeals } } }); await db.deal.deleteMany({ where: { id: { in: ownedDeals } } }); }
    if (keyId) { await db.mcpApiCall.deleteMany({ where: { apiKeyId: keyId } }); await db.mcpApiKey.deleteMany({ where: { id: keyId } }); }
    if (brandId) await db.strategy.deleteMany({ where: { id: brandId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
  } finally { vi.unstubAllEnvs(); await db.$disconnect(); }
});

describe("sales worker run scope at the actual MCP transport", () => {
  it("requires an active lease and refuses a wrong or expired lease before revealing the portfolio", async () => {
    expect((await invoke("sales_portfolio")).status).toBe(403);
    expect((await invoke("sales_portfolio", {}, { ...leased(), "x-sales-run-lease": randomUUID() })).status).toBe(403);
    await db.salesRun.update({ where: { id: runId }, data: { claimedAt: new Date(Date.now() - 16 * 60000) } });
    expect((await invoke("sales_portfolio", {}, leased())).status).toBe(403);
    await db.salesRun.update({ where: { id: runId }, data: { claimedAt: new Date() } });
  });
  it("shows only the mandated run's deal while retaining same-brand intelligence reads", async () => {
    const response = await invoke("sales_portfolio", {}, leased());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.deals.map((entry: { deal: { id: string } }) => entry.deal.id)).toEqual([mainDeal]);
    expect(JSON.stringify(body)).not.toContain(otherDeal);
    // Same-brand read parameters stay authorized at the boundary; cross-deal writes do not.
    const { authenticateMcpRequest, scopeMcpParams } = await import("@/server/services/anubis/mcp-billing");
    const gate = await authenticateMcpRequest(new Request("https://example.invalid/api/mcp", { headers: { "x-api-key": apiKey, ...leased() } }), "advertis");
    expect(gate.ok).toBe(true);
    expect(scopeMcpParams(gate, "advertis", "getPillarContent", { strategyId: brandId }).denied).toBeUndefined();
  });
  it("rejects another deal even with the right brand, seller and client-auth spoof, without changing that deal", async () => {
    const before = await db.deal.findUniqueOrThrow({ where: { id: otherDeal } });
    const events = await db.cRMActivity.count({ where: { dealId: otherDeal } });
    const response = await invoke("sales_decide", { dealId: otherDeal, __auth: { salesDealId: otherDeal, salesRunId: runId, scopeKind: "SYSTEM" }, step: { requestId: randomUUID(), expectedRevision: before.revision, channel: "WEB", command: { type: "QUALIFY", role: "BUYER", need: "Tentative hors de l’affaire confiée." } } }, leased());
    expect(response.status).toBe(403);
    expect(await db.deal.findUniqueOrThrow({ where: { id: otherDeal } })).toEqual(before);
    expect(await db.cRMActivity.count({ where: { dealId: otherDeal } })).toBe(events);
  });
  it("returns a typed business refusal for premature acceptance, then lets the agent present and accept in the correct order", async () => {
    const current = await db.deal.findUniqueOrThrow({ where: { id: mainDeal } });
    const malformed=await invoke("sales_decide",{dealId:mainDeal,step:{requestId:randomUUID(),expectedRevision:current.revision,channel:"WEB",command:{type:"PLAN_NEXT_ACTION",action:"Attendre la remise"}}},leased());
    expect(malformed.status).toBe(200);
    const malformedBody=await malformed.json();
    expect(malformedBody.result).toMatchObject({status:"REFUSED",errorCode:"BAD_REQUEST",currentState:{revision:current.revision}});
    expect(malformedBody.result.message).toContain("command.basis");
    expect((await db.deal.findUniqueOrThrow({where:{id:mainDeal}})).revision).toBe(current.revision);
    const qualified = await decision(mainDeal, current.revision, { type: "QUALIFY", role: "BUYER", need: "Besoin de visibilité du client fictif." });
    expect(qualified.response.status).toBe(200);
    const revision = qualified.body.result.revision as number;
    const eventCount = await db.cRMActivity.count({ where: { dealId: mainDeal } });
    const premature = await decision(mainDeal, revision, { type: "ACCEPT", evidence: "Message reçu mais proposition pas encore présentée.", customerMessageId: buyerMessageId });
    expect(premature.response.status).toBe(200);
    expect(premature.body.result).toMatchObject({ status: "REFUSED", errorCode: "PRECONDITION_FAILED", currentState: { node: "QUALIFIED", revision } });
    expect(premature.body.result.currentState.nextAction).toEqual(expect.any(String));
    expect(await db.cRMActivity.count({ where: { dealId: mainDeal } })).toBe(eventCount);
    const refusedState = await db.deal.findUniqueOrThrow({ where: { id: mainDeal } });
    expect(salesStateSchema.parse(refusedState.commercial).node).toBe("QUALIFIED");
    expect(refusedState.wonAt).toBeNull();
    const proposed = await decision(mainDeal, premature.body.result.currentState.revision, { type: "PROPOSE" });
    expect(proposed.response.status).toBe(200);
    const accepted = await decision(mainDeal, proposed.body.result.revision, { type: "ACCEPT", evidence: "Accord du client fictif sur les conditions présentées.", customerMessageId: buyerMessageId });
    expect(accepted.response.status).toBe(200);
    expect(accepted.body.result.stage).toBe("WON");
    expect(salesStateSchema.parse(accepted.body.result.commercial).node).toBe("ACCEPTED");
  });
  it("stops further actions on pause but receives and replays the bounded run completion without reopening it", async () => {
    await setSalesRepresentativeStatus(actor(), representativeId, "PAUSED");
    expect((await invoke("sales_portfolio", {}, leased())).status).toBe(403);
    const completion = { runId, leaseToken, status: "DONE", result: "Réception synthétique du run achevée sans envoi externe.", tokensUsed: 100 };
    const first = await invoke("sales_complete_run", completion);
    expect(first.status).toBe(200); expect((await first.json()).result).toMatchObject({ ok: true, runId, status: "DONE" });
    const replay = await invoke("sales_complete_run", completion);
    expect(replay.status).toBe(200); expect((await replay.json()).result).toMatchObject({ ok: true, runId, status: "DONE" });
    const row = await db.salesRun.findUniqueOrThrow({ where: { id: runId } }); expect(row.status).toBe("DONE");
    const claim = await invoke("sales_claim_run", { requestId: randomUUID() });
    expect(claim.status).toBe(200); expect((await claim.json()).result.run).toBeNull();
  });
});
