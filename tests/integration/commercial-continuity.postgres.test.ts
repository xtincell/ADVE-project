import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { POST } from "@/app/api/mcp/operations/route";
import { crmRouter } from "@/server/trpc/routers/crm";
import { salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";

let adminId: string, sellerId: string, deliveryId: string, otherId: string, brandId: string;
const caller = (id: string, role: "ADMIN" | "USER" = "USER") => crmRouter.createCaller({
  db, headers: undefined, session: { user: { id, role }, expires: new Date(Date.now() + 3600000).toISOString() },
});
let dealId: string;
const fixtureOperatorIds: string[] = [];
const fixturePayments: string[] = [];
beforeAll(async () => {
  const op = await db.operator.create({ data: { name: "Commercial fixture", slug: randomUUID(), status: "ACTIVE", licenseType: "OWNER", licensedAt: new Date(), licenseExpiry: new Date("2030-01-01") } });
  fixtureOperatorIds.push(op.id);
  const createUser = async (name: string, operatorId?: string) => db.user.create({ data: { name, email: randomUUID() + "@example.invalid", operatorId } });
  adminId = (await createUser("Mandant")).id;
  sellerId = (await createUser("Commercial autonome", op.id)).id;
  deliveryId = (await createUser("Livraison", op.id)).id;
  const other = await db.operator.create({ data: { name: "Autre", slug: randomUUID(), status: "ACTIVE", licenseType: "OWNER", licensedAt: new Date(), licenseExpiry: new Date("2030-01-01") } });
  fixtureOperatorIds.push(other.id);
  otherId = (await createUser("Autre vendeur", other.id)).id;
  brandId = (await db.strategy.create({ data: { name: "Marque de recette", userId: adminId, operatorId: op.id } })).id;
  await db.pillar.create({ data: { strategyId: brandId, key: "v", content: { produitsCatalogue: [{ id: "gold", nom: "Gold" }] } } });
});
afterAll(async () => {
  if (process.env.KEEP_COMMERCIAL_FIXTURES !== "1" && brandId) {
    const owned = await db.deal.findMany({ where: { sellerStrategyId: brandId }, select: { id: true } });
    const ids = owned.map(item => item.id);
    await db.cRMActivity.deleteMany({ where: { dealId: { in: ids } } });
    await db.funnelMapping.deleteMany({ where: { dealId: { in: ids } } });
    await db.deal.deleteMany({ where: { id: { in: ids } } });
    const keys = await db.mcpApiKey.findMany({ where: { scopeStrategyId: brandId }, select: { id: true } });
    await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keys.map(key => key.id) } } });
    await db.mcpApiKey.deleteMany({ where: { scopeStrategyId: brandId } });
    await db.intakePayment.deleteMany({ where: { reference: { in: fixturePayments } } });
    await db.intentEmission.deleteMany({ where: { strategyId: brandId } });
    await db.pillar.deleteMany({ where: { strategyId: brandId } });
    await db.strategy.delete({ where: { id: brandId } });
    await db.user.deleteMany({ where: { id: { in: [adminId, sellerId, deliveryId, otherId] } } });
    await db.operator.deleteMany({ where: { id: { in: fixtureOperatorIds } } });
  }
  await db.$disconnect();
});

async function step(userId: string, command: SalesStep["command"], role: "ADMIN" | "USER" = "USER", channel: SalesStep["channel"] = "EMAIL") {
  const client = caller(userId, role);
  const row = await client.getDeal({ id: dealId });
  const salesStep: SalesStep = { requestId: randomUUID(), expectedRevision: row.revision, channel, command };
  await client.updateDeal({ dealId, salesStep });
  return salesStep;
}

describe("commercial continuity through the governed router and PostgreSQL", () => {
  it("creates a phone-only buyer in the seller portfolio and denies the other operator", async () => {
    dealId = await caller(sellerId).createDeal({ sellerStrategyId: brandId, companyName: "Restaurant de recette", contactName: "Acheteur", contactPhone: "+00000000" });
    const row = await caller(sellerId).getDeal({ id: dealId });
    expect(row.contactEmail).toBeNull();
    expect(row.strategyId).toBeNull();
    await expect(caller(otherId).getDeal({ id: dealId })).rejects.toThrow();
    await expect(caller(otherId).addNote({ dealId, content: "intrusion" })).rejects.toThrow();
    const list = await caller(otherId).listDeals({});
    expect(list.find(item => item.id === dealId)).toBeUndefined();
  });
  it("approves the brand offer, then the autonomous seller qualifies, presents, handles an objection and closes across channels", async () => {
    await step(adminId, { type: "MANDATE", mandate: {
      offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Visibilité mensuelle, aucune réservation garantie.",
      amount: 60000, currency: "XOF", sellerId, deliveryOwnerId: deliveryId, beneficiary: "Marque de recette",
      expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Attendre le rapprochement de la référence de recette.",
      channels: ["PHONE", "EMAIL", "WHATSAPP"],
    } }, "ADMIN");
    await step(sellerId, { type: "QUALIFY", role: "BUYER", need: "Faire découvrir le restaurant." }, "USER", "PHONE");
    await step(sellerId, { type: "PROPOSE" }, "USER", "WHATSAPP");
    await step(sellerId, { type: "OBJECTION", evidence: "Le client demande une garantie de réservations." });
    await step(sellerId, { type: "PROPOSE" });
    const accepted = await step(sellerId, { type: "ACCEPT", evidence: "Accord explicite du client fictif sur Gold mensuel." });
    const before = await db.cRMActivity.count({ where: { dealId } });
    await caller(sellerId).updateDeal({ dealId, salesStep: accepted });
    expect(await db.cRMActivity.count({ where: { dealId } })).toBe(before);
    const row = await caller(sellerId).getDeal({ id: dealId });
    expect(row.stage).toBe("WON");
    expect(row.strategyId).toBeNull();
    expect(salesStateSchema.parse(row.commercial).node).toBe("ACCEPTED");
    await expect(caller(sellerId).advanceDeal({ dealId })).rejects.toThrow();
    await expect(caller(sellerId).convertToStrategy({ dealId, userId: sellerId })).rejects.toThrow();
  });
  it("requires independent finance and delivery evidence, keeping amount and currency exact", async () => {
    await expect(step(sellerId, { type: "PAYMENT", evidence: "unsupported", amount: 60000, currency: "XOF" })).rejects.toThrow();
    await expect(step(adminId, { type: "PAYMENT", evidence: "partial", amount: 1000, currency: "XOF" }, "ADMIN")).rejects.toThrow();
    await step(adminId, { type: "PAYMENT", evidence: "Rapprochement financier de recette, aucun argent réel.", amount: 60000, currency: "XOF" }, "ADMIN");
    await expect(step(sellerId, { type: "DELIVER", evidence: "unsupported", nextAction: "suivi", nextDeadline: "2030-01-01T00:00:00.000Z" })).rejects.toThrow();
    await step(deliveryId, { type: "DELIVER", evidence: "Prestation fictive acceptée.", nextAction: "Revoir la valeur avant renouvellement.", nextDeadline: "2027-01-01T00:00:00.000Z" });
    const row = await caller(sellerId).getDeal({ id: dealId });
    expect(salesStateSchema.parse(row.commercial).node).toBe("DELIVERED");
    expect((await caller(sellerId).getRevenueForecast({ currency: "XAF" })).totalPipeline).toBe(0);
    expect((await caller(sellerId).getRevenueForecast({ currency: "XOF" })).totalPipeline).toBe(60000);
  });
  it("runs the agent through the real MCP HTTP entry point with a scoped key and an independent payment receipt", async () => {
    const secret = randomUUID();
    const paymentReference = randomUUID();
    fixturePayments.push(paymentReference);
    await db.intakePayment.create({ data: { reference: paymentReference, intakeToken: randomUUID(), amount: 60000, currency: "XOF", provider: "CINETPAY" } });
    const key = await db.mcpApiKey.create({ data: { name: "Owned autonomous recipe", keyHash: createHash("sha256").update(secret).digest("hex"),
      server: "operations", scopeKind: "BRAND", scopeStrategyId: brandId, ratePerCallUsd: 0 } });
    dealId = await caller(sellerId).createDeal({ sellerStrategyId: brandId, companyName: "Acheteur autonome de recette", contactName: "Acheteur fictif", contactPhone: "+00000001" });
    await step(adminId, { type: "MANDATE", mandate: {
      offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Conditions de recette approuvées.", intakePaymentReference: paymentReference,
      amount: 60000, currency: "XOF", sellerId: `mcp:${key.id}`, deliveryOwnerId: `mcp:${key.id}`, beneficiary: "Marque de recette",
      expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Référence de règlement de recette.", channels: ["PHONE", "WHATSAPP", "EMAIL"],
    } }, "ADMIN");
    const invoke = async (tool: string, params: Record<string, unknown>) => {
      const response = await POST(new Request("http://localhost/api/mcp/operations", { method: "POST",
        headers: { "content-type": "application/json", "x-api-key": secret }, body: JSON.stringify({ tool, params: { strategyId: brandId, ...params } }) }));
      expect(response.status).toBe(200);
      return response.json();
    };
    // The driver decides from the server state. The buyer and finance are separate fixtures.
    for (let turn = 0; turn < 8; turn++) {
      const current = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
      const state = salesStateSchema.parse(current.commercial);
      if (state.node === "DELIVERED") break;
      if (state.node === "ACCEPTED") {
        await db.intakePayment.update({ where: { reference: paymentReference }, data: { status: "PAID", paidAt: new Date() } });
        await invoke("sales_sync_payment", { dealId, requestId: randomUUID(), expectedRevision: current.revision });
        continue;
      }
      const decisions: Record<string, SalesStep["command"]> = {
        DISCOVERY: { type: "QUALIFY", role: "BUYER", need: "Demande du client fictif." },
        QUALIFIED: { type: "PROPOSE" },
        PROPOSAL: { type: "ACCEPT", evidence: "Acceptation donnée par l’acheteur simulé." },
        PAID: { type: "DELIVER", evidence: "Remise synthétique acceptée par le client.", nextAction: "Revoir la valeur livrée.", nextDeadline: "2027-01-01T00:00:00.000Z" },
      };
      await invoke("sales_decide", { dealId, step: { requestId: randomUUID(), expectedRevision: current.revision,
        channel: turn % 2 ? "WHATSAPP" : "EMAIL", command: decisions[state.node] } });
    }
    const final = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
    expect(salesStateSchema.parse(final.commercial).node).toBe("DELIVERED");
    expect(final.strategyId).toBeNull();
    const portfolio = await invoke("sales_portfolio", {});
    expect(JSON.stringify(portfolio)).toContain(dealId);
    await db.mcpApiKey.update({ where: { id: key.id }, data: { isActive: false } });
    const revoked = await POST(new Request("http://localhost/api/mcp/operations", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": secret }, body: JSON.stringify({ tool: "sales_portfolio", params: { strategyId: brandId } }) }));
    expect(revoked.status).toBe(401);
  });

  it("commits one decision under concurrent updates and retains one immutable journal event", async () => {
    dealId = await caller(sellerId).createDeal({ sellerStrategyId: brandId, companyName: "Concurrent fixture", contactName: "Buyer", contactPhone: "+00000002" });
    await step(adminId, { type: "MANDATE", mandate: {
      offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Concurrent fixture",
      amount: 60000, currency: "XOF", sellerId, deliveryOwnerId: deliveryId, beneficiary: "Fixture",
      expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Fixture only", channels: ["EMAIL"],
    } }, "ADMIN");
    const current = await caller(sellerId).getDeal({ id: dealId });
    const action: SalesStep = { requestId: randomUUID(), expectedRevision: current.revision, channel: "EMAIL",
      command: { type: "QUALIFY", role: "BUYER", need: "One buyer." } };
    const results = await Promise.allSettled([
      caller(sellerId).updateDeal({ dealId, salesStep: action }),
      caller(sellerId).updateDeal({ dealId, salesStep: action }),
    ]);
    expect(results.some(result => result.status === "fulfilled")).toBe(true);
    expect((await caller(sellerId).getDeal({ id: dealId })).revision).toBe(current.revision + 1);
    expect(await db.cRMActivity.count({ where: { dealId, metadata: { path: ["salesRequestId"], equals: action.requestId } } })).toBe(1);
    await expect(caller(sellerId).updateDeal({ dealId, salesStep: { ...action, command: { type: "QUALIFY", role: "PARTNER", need: "Other meaning." } } })).rejects.toThrow();
  });

});
