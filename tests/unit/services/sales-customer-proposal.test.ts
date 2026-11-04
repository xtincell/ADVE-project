import { createHash, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { customerConversation, customerProposalDocument, receiveCustomerMessage } from "@/server/services/crm-engine/customer";
import { GET as documentGet } from "@/app/api/sales/[token]/proposal/route";
import { POST as messagePost } from "@/app/api/sales/[token]/route";

const store = vi.hoisted(() => ({
  deal: {} as Record<string, unknown>, output: {} as Record<string, unknown>,
  messages: [] as Array<Record<string, unknown>>, events: [] as Array<Record<string, unknown>>,
  inbound: vi.fn(), transaction: vi.fn(), lock: vi.fn(), sourceRead: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const database = {
    deal: { findUnique: vi.fn(async () => store.deal), findUniqueOrThrow: vi.fn(async () => store.deal) },
    strategy: { findUnique: vi.fn(async () => ({ name: "Marque & client <test>" })) },
    salesPublicSession: { findUnique: vi.fn(async () => null) },
    crmMessage: {
      findMany: vi.fn(async () => []), count: vi.fn(async () => store.messages.length),
      findFirst: vi.fn(async ({ where }: { where: { providerRef: string } }) => store.messages.find(message => message.providerRef === where.providerRef) ?? null),
    },
    cRMActivity: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.events.find(event => event.id === where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { store.events.push(data); return data; }),
    },
    gloryOutput: { findFirst: store.sourceRead }, $queryRaw: store.lock, $transaction: store.transaction,
  };
  store.transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run(database));
  return { db: database };
});
vi.mock("@/server/services/crm-engine/fleet", () => ({ recordInboundSalesMessageIn: store.inbound }));
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));

const token = "a".repeat(64);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const params = { params: Promise.resolve({ token }) };
const proposalId = "00000000-0000-4000-8000-000000000001";
const proposal = { id: proposalId, offerId: "starter", offerName: "Starter reçu", amount: 59000, unitPrice: 59000,
  currency: "XOF", billing: "MONTHLY", quantity: 1, countryCode: "CI", terms: "Conditions <script>alert(1)</script>",
  scope: ["Accompagnement"], exclusions: ["Achat média"], preparedAt: "2026-11-04T10:00:00.000Z", presentedAt: "2026-11-04T10:01:00.000Z",
  sourceVersion: "3", gloryOutputId: "quote-1", taxTreatment: "INCLUDED_IN_PRICE", subtotal: 59000, taxRatePct: null, taxAmount: null };
function saleState(node = "PROPOSAL") {
  return { node, proposal: { ...proposal }, mandate: {
    offerId: "starter", offerName: "Starter reçu", offerVersion: "3", amount: 59000, currency: "XOF", billing: "MONTHLY",
    terms: proposal.terms, sellerId: "seller", deliveryOwnerId: "owner", beneficiary: "Entité autorisée",
    expiresAt: "2030-01-01T00:00:00.000Z", paymentInstructions: "Paiement à vérifier séparément", channels: ["WEB"],
    pricingRule: { kind: "MARKET_TIER", tierKey: "RETAINER_BASE", countryCodes: ["CI"], maxQuantity: 1 },
  } };
}
function quote() {
  const source = { kind: "CATALOGUE", reference: "strategy:private-brand:v.produitsCatalogue[0]", contentHash: "b".repeat(64), version: 3 };
  return { devis: { schemaVersion: 1, status: "READY", client: { name: "Client & prospect" },
    lines: [{ offerId: "starter", offerName: "Starter reçu", status: "PRICED", unitPrice: 59000, currency: "XOF", billing: "MONTHLY", availability: null,
      conditions: [proposal.terms], sources: [source], gaps: [], quantity: 1, lineTotal: 59000 }],
    groups: [{ currency: "XOF", billing: "MONTHLY", subtotal: 59000, taxTreatment: "INCLUDED_IN_PRICE", taxRatePct: null, tax: null, total: 59000 }],
    conditions: [proposal.terms], scope: proposal.scope, exclusions: proposal.exclusions,
    validUntil: "2030-01-01T00:00:00.000Z", sources: [source], gaps: [], note: "Document figé ; ne prouve aucun paiement." } };
}
beforeEach(() => {
  vi.clearAllMocks(); store.messages.length = 0; store.events.length = 0;
  store.deal = { id: "deal", sellerStrategyId: "private-brand", commercial: saleState(), customerAccessTokenHash: hash(token), paymentReference: null };
  store.output = quote();
  store.sourceRead.mockImplementation(async ({ where }: { where: { id: string; strategyId: string } }) =>
    where.id === "quote-1" && where.strategyId === "private-brand" ? { output: store.output } : null);
  store.inbound.mockImplementation(async (_tx: unknown, input: { body: string; externalId: string }) => {
    const message = { id: `message-${store.messages.length + 1}`, body: input.body, providerRef: input.externalId, direction: "IN", status: "RECEIVED" };
    store.messages.push(message); return { message, run: { id: "queued" } };
  });
});

describe("Private frozen sales proposal", () => {
  it("does not expose a prepared quotation until PROPOSE, or a pending formula price", async () => {
    store.deal.commercial = saleState("QUALIFIED");
    expect(await customerConversation(token)).toMatchObject({ proposal: null, offer: null });
    expect((await documentGet(new Request(`https://brand.invalid/api/sales/${token}/proposal`), params)).status).toBe(404);
    expect(store.sourceRead).not.toHaveBeenCalled();
    const pending = saleState("DISCOVERY"); delete (pending as { proposal?: unknown }).proposal;
    pending.mandate.amount = 0; pending.mandate.currency = "XXX"; store.deal.commercial = pending;
    expect(await customerConversation(token)).toMatchObject({ proposal: null, offer: null });
  });

  it("reads the stored same-brand document, escapes it, and preserves unventilated included taxes", async () => {
    const view = await customerConversation(token);
    expect(view).toMatchObject({ proposal: { id: proposalId, documentUrl: `/api/sales/${token}/proposal` }, offer: { amount: 59000, currency: "XOF" } });
    const response = await documentGet(new Request(`https://brand.invalid/api/sales/${token}/proposal`), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await response.text();
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;"); expect(html).not.toContain("<script>");
    expect(html).toContain("Taxes incluses dans le prix final"); expect(html).not.toContain("Taxes (0 %)");
    expect(html).toContain("Catalogue de marque, version 3"); expect(html).toContain("@media print");
    expect(html).toContain("4 novembre 2026"); expect(html).toContain("Services non inclus");
    expect(html).not.toContain("Empreinte"); expect(html).not.toContain("b".repeat(64));
    expect(store.sourceRead).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", strategyId: "private-brand", toolSlug: "devis-generator" } }));
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("refuses a mismatching source and keeps an already contracted document readable after STOP", async () => {
    const changed = quote(); changed.devis.groups[0]!.total = 59001; store.output = changed;
    await expect(customerProposalDocument(token)).rejects.toMatchObject({ code: "NOT_FOUND" });
    store.output = quote(); store.deal.commercial = { ...saleState("PAID"), contactStopped: true };
    expect((await documentGet(new Request(`https://brand.invalid/api/sales/${token}/proposal`), params)).status).toBe(200);
    store.deal.commercial = { ...saleState("STOPPED"), contactStopped: true };
    await expect(customerProposalDocument(token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("records confirmation and the exact proposal event in the inbound transaction, with exact retries", async () => {
    const input = { body: "J’accepte la proposition affichée.", proposalId, requestId: randomUUID() };
    await expect(receiveCustomerMessage(token, input)).resolves.toEqual({ received: true });
    await expect(receiveCustomerMessage(token, input)).resolves.toEqual({ received: true });
    expect(store.inbound).toHaveBeenCalledTimes(1); expect(store.messages).toHaveLength(1); expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({ id: "sales-proposal-acceptance:message-1", activityType: "SALES_CUSTOMER_PROPOSAL_ACCEPTANCE",
      metadata: { proposalId, customerMessageId: "message-1", requestId: input.requestId, bodyFingerprint: hash(input.body), gloryOutputId: "quote-1", sourceVersion: "3" } });
    expect((store.deal.commercial as { node: string }).node).toBe("PROPOSAL");
    await expect(receiveCustomerMessage(token, { ...input, proposalId: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(receiveCustomerMessage(token, { ...input, body: "Texte modifié" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(receiveCustomerMessage(token, { body: input.body, requestId: input.requestId })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(store.inbound).toHaveBeenCalledTimes(1);
  });

  it("rejects stale proposal IDs before writing, and retains local/proxy-origin and body bounds", async () => {
    const post = (body: unknown, headers: Record<string, string> = {}) => messagePost(new Request(`http://localhost:3412/api/sales/${token}`, {
      method: "POST", headers: { "content-type": "application/json", host: "127.0.0.1:3412", origin: "http://127.0.0.1:3412", "x-forwarded-proto": "http", ...headers }, body: JSON.stringify(body),
    }), params);
    const input = { body: "Confirmation reçue.", proposalId, requestId: randomUUID() };
    expect((await post({ ...input, proposalId: randomUUID() })).status).toBe(409); expect(store.inbound).not.toHaveBeenCalled();
    expect((await post(input, { origin: "https://attacker.invalid" })).status).toBe(403); expect(store.inbound).not.toHaveBeenCalled();
    expect((await post({ ...input, body: "a".repeat(4001) })).status).toBe(400); expect(store.inbound).not.toHaveBeenCalled();
    expect((await post(input)).status).toBe(200);
    const proxy = await messagePost(new Request(`http://internal/api/sales/${token}`, { method: "POST", headers: {
      "content-type": "application/json", host: "powerupgraders.com", "x-forwarded-proto": "https", origin: "https://powerupgraders.com",
    }, body: JSON.stringify(input) }), params);
    expect(proxy.status).toBe(200); expect(store.inbound).toHaveBeenCalledTimes(1);
  });
});
