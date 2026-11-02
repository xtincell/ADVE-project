import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, createHmac, randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { applySalesStep } from "@/server/services/crm-engine";
import { issueCustomerAccess, customerConversation, receiveCustomerMessage } from "@/server/services/crm-engine/customer";
import { saveSalesRepresentative, listSalesRepresentatives, getSalesRepresentative } from "@/server/services/crm-engine/fleet";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import { GET as customerGet, POST as customerPost } from "@/app/api/sales/[token]/route";
import { GET as workerGet } from "@/app/api/internal/sales-fleet/route";
import { POST as webhookPost } from "@/app/api/webhooks/sales/route";
import { POST as mcpPost } from "@/app/api/mcp/operations/route";
import type { SalesState } from "@/server/services/crm-engine/commercial";

const workerSecret = "owned-worker-secret-" + randomUUID();
const bridgeSecret = "owned-bridge-secret-" + randomUUID();
const encryptionKey = "owned-encryption-key-" + randomUUID();
const fixtureEmail = randomUUID() + "@example.invalid";
const deals: string[] = [];
let userId: string, brandId: string, otherBrandId: string, representativeId: string, keyId: string, principalId: string, apiKey: string, conversationId: string | null;
let emailDeal: string, phoneDeal: string, token: string;
const context = (value: string) => ({ params: Promise.resolve({ token: value }) });
const nowActor = () => ({ id: userId, admin: true, operatorId: null });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function state(): SalesState { return { node: "PROPOSAL", mandate: {
  offerId: "gold", offerVersion: "1", offerName: "Gold de recette", terms: "Présence synthétique, aucune réservation garantie.",
  amount: 60000, currency: "XOF", sellerId: principalId, deliveryOwnerId: userId, beneficiary: "Entité de recette",
  expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Aucun argent réel dans cette recette.", channels: ["WEB", "EMAIL", "PHONE"],
} }; }
async function makeDeal(contactEmail?: string) {
  const result = await db.deal.create({ data: { sellerStrategyId: brandId, companyName: "Acheteur isolé de recette", contactName: "Client fictif", contactEmail,
    contactPhone: "+000531001", stage: "PROPOSAL", commercial: JSON.parse(JSON.stringify(state())) } });
  deals.push(result.id); return result.id;
}
beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid/invalid");
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || !(target.pathname === "/shinkiro_fleet531" || (process.env.CI && target.pathname === "/shinkiro_verify"))) {
    throw Error("Run this receipt only against owned local shinkiro_fleet531 or the isolated CI shinkiro_verify database.");
  }
  vi.stubEnv("INTEGRATION_TOKEN_KEY", encryptionKey); vi.stubEnv("SALES_WORKER_TOKEN", workerSecret); vi.stubEnv("SALES_WEBHOOK_SECRET", bridgeSecret);
  userId = (await db.user.create({ data: { email: randomUUID() + "@example.invalid", name: "Mandant de recette privée" } })).id;
  brandId = (await db.strategy.create({ data: { name: "Marque de recette privée", userId } })).id;
  otherBrandId = (await db.strategy.create({ data: { name: "Autre marque de recette privée", userId } })).id;
  const profile = await saveSalesRepresentative(nowActor(), { strategyId: brandId, name: "Vendeur privé de recette", mode: "AI" });
  representativeId = profile.id; keyId = profile.mcpKeyId!; principalId = profile.principalId!; conversationId = profile.conversationId;
  const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: representativeId } });
  apiKey = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
  // Key validity is exercised independently; DRAFT profile keeps the real worker from consuming our test fixtures.
  await db.mcpApiKey.update({ where: { id: keyId }, data: { isActive: true } });
  emailDeal = await makeDeal(fixtureEmail); phoneDeal = await makeDeal();
  token = (await issueCustomerAccess(emailDeal)).path.split("/").pop()!;
});
afterAll(async () => {
  try {
    if (representativeId) { await db.salesRun.deleteMany({ where: { representativeId } }); await db.salesRepresentative.deleteMany({ where: { id: representativeId } }); }
    if (conversationId) { await db.message.deleteMany({ where: { conversationId } }); await db.conversation.deleteMany({ where: { id: conversationId } }); }
    if (deals.length) { await db.crmMessage.deleteMany({ where: { salesDealId: { in: deals } } }); await db.cRMActivity.deleteMany({ where: { dealId: { in: deals } } }); await db.deal.deleteMany({ where: { id: { in: deals } } }); }
    if (keyId) { await db.mcpApiCall.deleteMany({ where: { apiKeyId: keyId } }); await db.mcpApiKey.deleteMany({ where: { id: keyId } }); }
    await db.crmContact.deleteMany({ where: { email: fixtureEmail } });
    await db.strategy.deleteMany({ where: { id: { in: [brandId, otherBrandId].filter(Boolean) } } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
  } finally { vi.unstubAllEnvs(); await db.$disconnect(); }
});

async function signedBridge(input: Record<string, unknown>, signatureSecret = bridgeSecret) {
  const raw = JSON.stringify(input);
  return webhookPost(new Request("https://example.invalid/api/webhooks/sales", { method: "POST", body: raw,
    headers: { "content-type": "application/json", "x-webhook-signature": "sha256=" + createHmac("sha256", signatureSecret).update(raw).digest("hex") } }));
}
describe("private customer conversation and sales ingress", () => {
  it("issues one stable encrypted private link under concurrent issuance and omits private state from the customer projection", async () => {
    const paths = await Promise.all(Array.from({ length: 5 }, () => issueCustomerAccess(phoneDeal)));
    expect(new Set(paths.map(item => item.path)).size).toBe(1);
    const phoneToken = paths[0]!.path.split("/").pop()!;
    const stored = await db.deal.findUniqueOrThrow({ where: { id: phoneDeal } });
    expect(stored.customerAccessTokenHash).toBe(hash(phoneToken));
    expect(stored.customerAccessTokenEncrypted).not.toContain(phoneToken);
    const view = JSON.stringify(await customerConversation(phoneToken));
    for (const secret of [phoneToken, stored.customerAccessTokenEncrypted!, keyId, principalId, "customerAccessTokenHash", "encryptedApiKey", "operatorId"]) expect(view).not.toContain(secret);
    expect(view).toContain("Marque de recette privée");
    const profiles = JSON.stringify(await listSalesRepresentatives(nowActor(), brandId));
    const detail = JSON.stringify(await getSalesRepresentative(nowActor(), representativeId));
    expect(profiles).not.toContain(apiKey); expect(detail).not.toContain(apiKey); expect(profiles).not.toContain("encryptedApiKey");
  });
  it("returns uniform unavailable results for malformed and unknown capability tokens", async () => {
    for (const invalid of ["bad", "f".repeat(64)]) {
      const response = await customerGet(new Request("https://example.invalid/api/sales/" + invalid), context(invalid));
      expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "Conversation indisponible." });
    }
    const response = await customerGet(new Request("https://example.invalid/api/sales/" + token), context(token));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("denies a foreign-origin browser POST and accepts/replays the same-origin message only once", async () => {
    const payload = { body: "Question réellement reçue dans le scénario fictif.", requestId: randomUUID() };
    const request = (origin: string) => new Request("https://example.invalid/api/sales/" + token, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload) });
    expect((await customerPost(request("https://attacker.invalid"), context(token))).status).toBe(403);
    expect(await db.crmMessage.count({ where: { salesDealId: emailDeal } })).toBe(0);
    expect((await customerPost(request("https://example.invalid"), context(token))).status).toBe(200);
    expect((await customerPost(request("https://example.invalid"), context(token))).status).toBe(200);
    expect(await db.crmMessage.count({ where: { salesDealId: emailDeal, providerRef: "web:" + payload.requestId } })).toBe(1);
  });
  it("verifies exact signed channel events, their freshness and the bound sender before storing them", async () => {
    const event = { dealId: emailDeal, externalId: randomUUID(), channel: "EMAIL", sender: fixtureEmail, body: "Réponse reçue par le pont de recette.", timestamp: Date.now() };
    expect((await signedBridge(event, "wrong-key")).status).toBe(401);
    expect((await signedBridge({ ...event, timestamp: Date.now() - 600001 })).status).toBe(401);
    expect((await signedBridge({ ...event, sender: "spoof@example.invalid" })).status).toBe(403);
    expect(await db.crmMessage.count({ where: { salesDealId: emailDeal, providerRef: event.externalId } })).toBe(0);
    expect((await signedBridge(event)).status).toBe(200);
    expect((await signedBridge(event)).status).toBe(200);
    expect(await db.crmMessage.count({ where: { salesDealId: emailDeal, providerRef: event.externalId } })).toBe(1);
  });
  it("keeps agreement proof bound to one deal even for the same email, and supports phone-only customer agreement", async () => {
    const anotherDeal = await makeDeal(fixtureEmail);
    const incoming = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: emailDeal, direction: "IN" } });
    await expect(applySalesStep(anotherDeal, { requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "ACCEPT", evidence: "Unsafe reuse of another deal's reply.", customerMessageId: incoming.id } }, { id: principalId, admin: false })).rejects.toThrow();
    const phoneToken = (await issueCustomerAccess(phoneDeal)).path.split("/").pop()!;
    const requestId = randomUUID();
    await receiveCustomerMessage(phoneToken, { body: "J’accepte ces conditions pour mon restaurant fictif.", requestId });
    const proof = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: phoneDeal, providerRef: "web:" + requestId } });
    expect(proof.contactId).toBeNull();
    const accepted = await applySalesStep(phoneDeal, { requestId: randomUUID(), expectedRevision: 0, channel: "WEB", command: { type: "ACCEPT", evidence: "Accord reçu dans la conversation privée du scénario.", customerMessageId: proof.id } }, { id: principalId, admin: false });
    expect(accepted.stage).toBe("WON"); expect(accepted.contactEmail).toBeNull();
  });
  it("denies worker credential discovery without the exact internal authorization, including non-ASCII same-length headers", async () => {
    for (const authorization of [undefined, "Bearer wrong", "Bearer " + workerSecret.slice(1) + "é"]) {
      const response = await workerGet(new Request("https://example.invalid/api/internal/sales-fleet", { headers: authorization ? { authorization } : {} }));
      expect(response.status).toBe(401); const text = await response.text(); expect(text).not.toContain(apiKey); expect(text).not.toContain(representativeId);
    }
  });
  it("enforces the actual auto-provisioned seller tool list before dispatch and rejects cross-brand scope spoofing", async () => {
    const invoke = (tool: string, params: Record<string, unknown>) => mcpPost(new Request("https://example.invalid/api/mcp/operations", { method: "POST", headers: { "x-api-key": apiKey, "content-type": "application/json" }, body: JSON.stringify({ tool, params }) }));
    const response = await invoke("campaign_list", { strategyId: brandId });
    expect(response.status).toBe(403); expect((await response.json()).error).toBe("SCOPE_DENIED");
    const spoof = await invoke("sales_portfolio", { strategyId: otherBrandId, __auth: { scopeKind: "SYSTEM", apiKeyId: keyId } });
    expect(spoof.status).toBe(403); expect((await spoof.json()).error).toBe("SCOPE_DENIED");
  });
});
