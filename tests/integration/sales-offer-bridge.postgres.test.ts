/** Real owned PostgreSQL + public desk + country seed + deterministic Glory.
 * No provider, network, buyer, money transfer or fulfillment is simulated as real. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";

vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
const provider = vi.hoisted(() => vi.fn(async () => { throw new Error("No provider is authorized in the deterministic sales-offer test."); }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: provider }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: provider, LLMStructuredCallError: class extends Error {} }));
vi.mock("@/server/services/anubis/mcp-client", () => ({ invokeExternalTool: provider }));

import { db } from "@/lib/db";
import * as fleet from "@/server/services/crm-engine/fleet";
import { applySalesStep } from "@/server/services/crm-engine";
import { salesStateSchema } from "@/server/services/crm-engine/commercial";
import { prepareSalesOffer } from "@/server/services/crm-engine/offers";
import type { PrepareSalesOfferInput } from "@/server/services/crm-engine/offer-contract";
import { publicSalesEntry, saveSalesPublicEntry, startPublicSalesConversation } from "@/server/services/crm-engine/public-entry";
import type { SaveSalesPublicEntryInput } from "@/server/services/crm-engine/public-entry-contract";
import { customerConversation, sendSalesWebMessage } from "@/server/services/crm-engine/customer";
import { lookupCountry, refreshCache } from "@/server/services/country-registry";
import { resolvePrice } from "@/server/services/monetization/compute-price";
import { commercialQuoteOutputSchema } from "@/server/services/artemis/tools/commercial-offer-schemas";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import { POST as mcpPost } from "@/app/api/mcp/operations/route";
import { POST as customerPost } from "@/app/api/sales/[token]/route";
import { GET as proposalGet } from "@/app/api/sales/[token]/proposal/route";

const brandIds: string[] = [], userIds: string[] = [];
let owner: fleet.FleetActor, outsider: fleet.FleetActor;
let ownedDatabaseConfirmed = false;
const priorStandardCountry = process.env.MONETIZATION_STANDARD_COUNTRY;
type FixtureOptions = {
  rule?: boolean; qualify?: boolean; informationOnly?: boolean;
  billing?: "ONE_TIME" | "MONTHLY" | "YEARLY" | null;
  taxTreatment?: "INCLUDED_IN_PRICE" | "EXCLUDED" | "UNSPECIFIED";
  cataloguePrice?: string | number; approvedAmount?: number;
  clientName?: string | null; declaredClientName?: string;
  humanContact?: { name: string; whatsapp: string };
};
async function fixture(options: FixtureOptions = {}) {
  const brand = await db.strategy.create({ data: { name: `Owned offer bridge ${randomUUID()}`, userId: owner.id, countryCode: "CI" } });
  brandIds.push(brand.id);
  await db.pillar.create({ data: { strategyId: brand.id, key: "v", currentVersion: 7, content: {
    produitsCatalogue: [{ id: "service", nom: "Service autorisé", prix: options.cataloguePrice ?? (options.rule ? "120 000 à 400 000 FCFA" : 60000),
      conditionsTarifaires: "La publicité payante est exclue.", disponibilite: "ALWAYS" }],
  } } });
  const ai = await fleet.saveSalesRepresentative(owner, { strategyId: brand.id, mode: "AI", name: "Owned quotation seller", maxTokens: 5000, dailyTokenBudget: 50000, dailyRunLimit: 20 });
  await fleet.setSalesRepresentativeStatus(owner, ai.id, "ACTIVE");
  const input: SaveSalesPublicEntryInput = {
    strategyId: brand.id, expectedRevision: 0, representativeId: ai.id, enabled: true,
    informationOnly: options.informationOnly ?? false, publicBrandName: "Vitrine de recette devis", welcome: "Parlons du besoin.", market: "Côte d’Ivoire",
    maxConversationsPerDay: 20, maxConversationsPerHour: 10, collectionAttested: false,
    ...(options.humanContact ? { humanContact: options.humanContact } : {}),
    offers: [{ offerId: "service", offerVersion: "7", offerName: "Service autorisé", terms: "Prestation définie ; paiement avant activation. Aucun résultat garanti.",
      ...(options.rule ? { pricingRule: { kind: "MARKET_TIER" as const, tierKey: "COCKPIT_MONTHLY" as const, countryCodes: ["CI"], maxQuantity: 2 } }
        : { amount: options.approvedAmount ?? 60000, currency: "XOF" }),
      ...(options.billing === null ? {} : { billing: options.billing ?? "MONTHLY" }),
      taxTreatment: options.taxTreatment ?? "INCLUDED_IN_PRICE", ...(options.taxTreatment === "EXCLUDED" ? { taxRatePct: 18 } : {}),
      exclusions: ["Budget média", "Prestation non listée"], deliveryOwnerId: owner.id,
      beneficiary: "Marque synthétique autorisée", paymentInstructions: "Aucun paiement réel dans cette recette.",
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }],
  };
  const emission = await db.intentEmission.create({ data: { strategyId: brand.id, caller: "crm:saveSalesPublicEntry", intentKind: "LEGACY_CRM_UPDATE_DEAL", payload: JSON.parse(JSON.stringify(input)) } });
  await saveSalesPublicEntry(owner, input, emission.id);
  const entry = await db.salesPublicEntry.findUniqueOrThrow({ where: { strategyId: brand.id } });
  const requestId = randomUUID();
  const clientName = options.clientName === null ? undefined : options.clientName ?? "Atelier Boréal";
  const opened = await startPublicSalesConversation(entry.publicId, { requestId, clientSecret: randomBytes(32).toString("hex"),
    message: `${clientName ? `Je représente ${options.declaredClientName ?? clientName}. ` : ""}Je cherche le service autorisé en Côte d’Ivoire, pour ${options.rule ? "deux licences" : "une licence"}. Quel est votre devis ?` }, { ipHash: randomUUID() });
  const session = await db.salesPublicSession.findUniqueOrThrow({ where: { entryId_requestId: { entryId: entry.id, requestId } } });
  const claimed = await fleet.claimRun(ai.mcpKeyId!, randomUUID());
  expect(claimed.run?.dealId).toBe(session.dealId);
  const actor = { id: ai.principalId!, admin: false, salesRunId: claimed.run!.id };
  const message = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: session.dealId, direction: "IN", status: "RECEIVED" } });
  if (options.qualify !== false) {
    const current = await db.deal.findUniqueOrThrow({ where: { id: session.dealId } });
    await applySalesStep(current.id, { requestId: randomUUID(), expectedRevision: current.revision, channel: "WEB",
      command: { type: "QUALIFY", role: "BUYER", need: "Le client demande le service autorisé pour son activité en Côte d’Ivoire." } }, actor);
  }
  const deal = await db.deal.findUniqueOrThrow({ where: { id: session.dealId } });
  return { brand, ai, input, entry, opened, session, deal, message, actor, clientName, run: claimed.run! };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const request = (f: Fixture, patch: Partial<PrepareSalesOfferInput> = {}): PrepareSalesOfferInput => ({
  dealId: f.deal.id, requestId: randomUUID(), expectedRevision: f.deal.revision,
  offerId: "service", countryCode: "CI", quantity: 1, customerMessageId: f.message.id, clientName: f.clientName, ...patch,
});
async function outputs(f: Fixture) { return db.gloryOutput.findMany({ where: { strategyId: f.brand.id, toolSlug: "devis-generator" } }); }
async function canonicalQuote(f: Fixture, id: string) {
  const row = await db.gloryOutput.findUniqueOrThrow({ where: { id } });
  expect(row.strategyId).toBe(f.brand.id); expect(row.toolSlug).toBe("devis-generator");
  expect((row.output as { _provenance?: string })._provenance).toBe("DETERMINISTIC_COMPOSE");
  return commercialQuoteOutputSchema.parse(row.output).devis;
}

beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL ?? "postgresql://missing/missing");
  const ownedLocal = database.pathname === "/shinkiro_sales_public_20261104";
  const isolatedCi = process.env.CI === "true" && database.pathname === "/shinkiro_verify";
  if (!["127.0.0.1", "localhost"].includes(database.hostname) || !(ownedLocal || isolatedCi)) throw new Error("Sales offer bridge tests require the explicitly owned loopback database or isolated CI shinkiro_verify database.");
  ownedDatabaseConfirmed = true;
  process.env.INTEGRATION_TOKEN_KEY = "owned-sales-offer-encryption-key-at-least-32-characters";
  process.env.MONETIZATION_STANDARD_COUNTRY = "FR";
  const { seedCountries } = await import("../../prisma/seed-countries");
  await seedCountries(); refreshCache();
  const country = await lookupCountry("CI");
  expect(country).toMatchObject({ code: "CI", currencyCode: "XOF", isFictional: false });
  for (const name of ["Owned sales offer owner", "Unrelated sales offer owner"]) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, name } }); userIds.push(user.id);
  }
  owner = { id: userIds[0]!, admin: false, operatorId: null }; outsider = { id: userIds[1]!, admin: false, operatorId: null };
});
afterAll(async () => {
  if (!ownedDatabaseConfirmed) return;
  try {
    const profiles = await db.salesRepresentative.findMany({ where: { strategyId: { in: brandIds } } });
    const conversations = profiles.flatMap(profile => profile.conversationId ? [profile.conversationId] : []);
    const dealIds = (await db.deal.findMany({ where: { sellerStrategyId: { in: brandIds } }, select: { id: true } })).map(row => row.id);
    await db.salesPublicEntry.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.message.deleteMany({ where: { conversationId: { in: conversations } } });
    await db.salesRun.deleteMany({ where: { representativeId: { in: profiles.map(profile => profile.id) } } });
    await db.salesRepresentative.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.conversation.deleteMany({ where: { id: { in: conversations } } });
    const keyIds = profiles.flatMap(profile => profile.mcpKeyId ? [profile.mcpKeyId] : []);
    await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keyIds } } });
    await db.mcpApiKey.deleteMany({ where: { id: { in: keyIds } } });
    await db.cRMActivity.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.funnelMapping.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.crmMessage.deleteMany({ where: { salesDealId: { in: dealIds } } });
    await db.deal.deleteMany({ where: { id: { in: dealIds } } });
    await db.gloryOutput.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.intentEmission.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: brandIds } } });
    await db.strategy.deleteMany({ where: { id: { in: brandIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    if (priorStandardCountry === undefined) delete process.env.MONETIZATION_STANDARD_COUNTRY; else process.env.MONETIZATION_STANDARD_COUNTRY = priorStandardCountry;
    refreshCache(); await db.$disconnect();
  }
});

describe("approved offer → deterministic quotation → seller on owned PostgreSQL", () => {
  it("freezes the approved human relay per admission, preserves it during pause and never inherits a global payment contact", async () => {
    const firstContact = { name: "Équipe initiale", whatsapp: "2250102030405" };
    const secondContact = { name: "Nouvelle équipe", whatsapp: "2250708091011" };
    const projected = (value: typeof firstContact) => ({ ...value, whatsappUrl: `https://wa.me/${value.whatsapp}` });
    const previousGlobal = process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER;
    process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER = "237699999999";
    try {
      const f = await fixture({ humanContact: firstContact });
      const token = f.opened.path.split("/").at(-1)!;
      expect((await publicSalesEntry(f.entry.publicId)).humanContact).toEqual(projected(firstContact));
      expect((await customerConversation(token)).humanContact).toEqual(projected(firstContact));
      const update: SaveSalesPublicEntryInput = { ...f.input, expectedRevision: f.entry.revision, humanContact: secondContact };
      const emission = await db.intentEmission.create({ data: { strategyId: f.brand.id, caller: "crm:saveSalesPublicEntry", intentKind: "LEGACY_CRM_UPDATE_DEAL", payload: JSON.parse(JSON.stringify(update)) } });
      await saveSalesPublicEntry(owner, update, emission.id);
      expect((await customerConversation(token)).humanContact).toEqual(projected(firstContact));
      const next = await startPublicSalesConversation(f.entry.publicId, { requestId: randomUUID(), clientSecret: randomBytes(32).toString("hex"), message: "Je souhaite parler à votre équipe." }, { ipHash: randomUUID() });
      expect((await customerConversation(next.path.split("/").at(-1)!)).humanContact).toEqual(projected(secondContact));
      const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.ai.id } });
      const key = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
      const response = await mcpPost(new Request("http://localhost/api/mcp/operations", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "x-sales-run-id": f.run.id, "x-sales-run-lease": f.run.leaseToken }, body: JSON.stringify({ tool: "sales_portfolio", params: { strategyId: f.brand.id, view: "ACTIONABLE" } }) }));
      expect(response.status).toBe(200);
      expect((await response.json()).result.deals.find((item: { deal: { id: string } }) => item.deal.id === f.deal.id).humanContact).toEqual(projected(firstContact));
      await fleet.setSalesRepresentativeStatus(owner, f.ai.id, "PAUSED");
      expect((await publicSalesEntry(f.entry.publicId)).humanContact).toEqual(projected(secondContact));
      const latest = await db.salesPublicEntry.findUniqueOrThrow({ where: { id: f.entry.id } });
      const disabled = { ...update, expectedRevision: latest.revision, enabled: false };
      const disabledIntent = await db.intentEmission.create({ data: { strategyId: f.brand.id, caller: "crm:saveSalesPublicEntry", intentKind: "LEGACY_CRM_UPDATE_DEAL", payload: JSON.parse(JSON.stringify(disabled)) } });
      await saveSalesPublicEntry(owner, disabled, disabledIntent.id);
      expect((await publicSalesEntry(f.entry.publicId)).humanContact).toBeNull();
      expect((await customerConversation(token)).humanContact).toEqual(projected(firstContact));
      const other = await fixture();
      expect((await publicSalesEntry(other.entry.publicId)).humanContact).toBeNull();
      expect((await customerConversation(other.opened.path.split("/").at(-1)!)).humanContact).toBeNull();
    } finally {
      if (previousGlobal === undefined) delete process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER; else process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER = previousGlobal;
    }
  });

  it("copies a client name proved in the received message into the real quotation and company field, with normalized accent/case/spacing checks", async () => {
    const f = await fixture({ clientName: "Atelier Boréal", declaredClientName: "ATELIER   BOREAL" });
    const result = await prepareSalesOffer(request(f), f.actor);
    const quote = await canonicalQuote(f, result.proposal.gloryOutputId);
    expect(quote.client?.name).toBe("Atelier Boréal");
    expect((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).companyName).toBe("Atelier Boréal");
    expect(quote.client?.name).not.toBe("Demande web"); expect(quote.client?.name).not.toBe("Visiteur web");
  });

  it("refuses an invented client name or an anonymous placeholder fallback without creating a quotation or proposal", async () => {
    const f = await fixture();
    await expect(prepareSalesOffer(request(f, { clientName: "Entreprise inventée absente du message" }), f.actor)).rejects.toThrow();
    await expect(prepareSalesOffer(request(f, { clientName: "!!!" }), f.actor)).rejects.toThrow();
    const anonymous = await fixture({ clientName: null });
    await expect(prepareSalesOffer(request(anonymous), anonymous.actor)).rejects.toThrow();
    for (const candidate of [f, anonymous]) {
      expect(await outputs(candidate)).toHaveLength(0);
      expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: candidate.deal.id } })).commercial).proposal).toBeUndefined();
    }
  });

  it("prepares the exact fixed monthly price, real sourced GloryOutput and revision without presenting or accepting it", async () => {
    const f = await fixture(); const input = request(f); const result = await prepareSalesOffer(input, f.actor);
    expect(result).toMatchObject({ status: "READY", dealId: f.deal.id, revision: f.deal.revision + 1,
      proposal: { id: input.requestId, offerId: "service", unitPrice: 60000, amount: 60000, currency: "XOF", billing: "MONTHLY", quantity: 1, countryCode: "CI", sourceVersion: "7" }, currentState: { node: "QUALIFIED" } });
    expect(result.proposal.documentUrl).toMatch(/^\/api\/sales\/[a-f0-9]{64}\/proposal$/);
    const quote = await canonicalQuote(f, result.proposal.gloryOutputId);
    expect(quote.status).toBe("READY"); expect(quote.groups).toMatchObject([{ currency: "XOF", billing: "MONTHLY", total: 60000 }]);
    expect(quote.sources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "CATALOGUE", version: 7 }), expect.objectContaining({ kind: "OWNER_INPUT" })]));
    const changed = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(changed.value).toBe(60000); expect(changed.revision).toBe(result.revision);
    const state = salesStateSchema.parse(changed.commercial); expect(state.node).toBe("QUALIFIED"); expect(state.proposal?.id).toBe(input.requestId); expect(state.agreement).toBeUndefined();
    expect(provider).not.toHaveBeenCalled();
  });

  it("uses the real seeded market resolver and approved quantity instead of a catalogue price range", async () => {
    const f = await fixture({ rule: true }); const expected = await resolvePrice("COCKPIT_MONTHLY", "CI");
    const result = await prepareSalesOffer(request(f, { quantity: 2 }), f.actor);
    expect(result.proposal).toMatchObject({ unitPrice: expected.amount, amount: expected.amount * 2, currency: expected.currencyCode, billing: "MONTHLY", quantity: 2 });
    const quote = await canonicalQuote(f, result.proposal.gloryOutputId);
    expect(quote.sources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "MONETIZATION", reference: "monetization.getPrice:COCKPIT_MONTHLY:CI" })]));
    expect(quote.groups).toHaveLength(1); expect(quote.groups[0]!.total).toBe(expected.amount * 2);
    expect(result.proposal.scope.length).toBeGreaterThan(1); expect(provider).not.toHaveBeenCalled();
  });

  it("preserves an approved tax split and commits the final amount without changing the unit price", async () => {
    const f = await fixture({ taxTreatment: "EXCLUDED" }); const result = await prepareSalesOffer(request(f), f.actor);
    expect(result.proposal).toMatchObject({ unitPrice: 60000, subtotal: 60000, taxTreatment: "EXCLUDED", taxRatePct: 18, taxAmount: 10800, amount: 70800, currency: "XOF", billing: "MONTHLY" });
    const quote = await canonicalQuote(f, result.proposal.gloryOutputId);
    expect(quote.groups[0]).toMatchObject({ subtotal: 60000, tax: 10800, total: 70800, taxRatePct: 18 });
    const changed = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(changed.value).toBe(70800); expect(salesStateSchema.parse(changed.commercial).mandate?.amount).toBe(70800);
  });

  it("keeps an explicitly approved yearly fixed period instead of relabelling it monthly", async () => {
    const f = await fixture({ billing: "YEARLY" }); const result = await prepareSalesOffer(request(f), f.actor);
    expect(result.proposal).toMatchObject({ amount: 60000, unitPrice: 60000, billing: "YEARLY" });
    expect((await canonicalQuote(f, result.proposal.gloryOutputId)).groups[0]!.billing).toBe("YEARLY");
  });

  it("refuses missing period, unspecified tax and non-exact catalogue prices without engaging a proposal", async () => {
    for (const options of [{ billing: null }, { taxTreatment: "UNSPECIFIED" }, { cataloguePrice: "à partir de 60 000 FCFA" }] as FixtureOptions[]) {
      const f = await fixture(options); await expect(prepareSalesOffer(request(f), f.actor)).rejects.toThrow();
      const state = salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).commercial);
      expect(state.proposal).toBeUndefined(); expect(state.node).toBe("QUALIFIED");
      for (const output of await outputs(f)) expect(commercialQuoteOutputSchema.parse(output.output).devis.status).toBe("NEEDS_INPUT");
    }
  });

  it("requires the assigned seller and a current deal-bound active worker lease before generating a quotation", async () => {
    const f = await fixture(), other = await fixture(); const input = request(f);
    await expect(prepareSalesOffer(input, { id: outsider.id, admin: false })).rejects.toThrow();
    await expect(prepareSalesOffer(input, { id: f.actor.id, admin: false })).rejects.toThrow();
    await expect(prepareSalesOffer(input, { ...f.actor, salesRunId: other.run.id })).rejects.toThrow();
    await db.salesRun.update({ where: { id: f.run.id }, data: { claimedAt: new Date(Date.now() - 16 * 60000) } });
    await expect(prepareSalesOffer(input, f.actor)).rejects.toThrow();
    await db.salesRun.update({ where: { id: f.run.id }, data: { claimedAt: new Date() } });
    await fleet.setSalesRepresentativeStatus(owner, f.ai.id, "PAUSED");
    await expect(prepareSalesOffer(input, f.actor)).rejects.toThrow();
    expect(await outputs(f)).toHaveLength(0);
  });

  it("fences owner-authorized countries, quantities, offer id and current catalogue version", async () => {
    const f = await fixture({ rule: true });
    for (const patch of [{ countryCode: "NG" }, { quantity: 3 }, { quantity: 0 }, { quantity: 101 }, { quantity: 1.5 }, { offerId: "not-approved" }]) await expect(prepareSalesOffer(request(f, patch), f.actor)).rejects.toThrow();
    await db.pillar.update({ where: { strategyId_key: { strategyId: f.brand.id, key: "v" } }, data: { currentVersion: 8 } });
    await expect(prepareSalesOffer(request(f), f.actor)).rejects.toThrow(); expect(await outputs(f)).toHaveLength(0);
  });

  it("refuses an unrecognized country or a multiplied fixed price instead of inferring approval", async () => {
    const f = await fixture();
    await expect(prepareSalesOffer(request(f, { countryCode: "ZZ" }), f.actor)).rejects.toThrow();
    await expect(prepareSalesOffer(request(f, { quantity: 2 }), f.actor)).rejects.toThrow();
    expect(await outputs(f)).toHaveLength(0);
  });

  it("requires a received message from this same deal and rejects agent-supplied money or conditions", async () => {
    const f = await fixture(), other = await fixture();
    const outbound = await db.crmMessage.create({ data: { salesDealId: f.deal.id, direction: "OUT", channel: "WEB", status: "SENT", body: "Synthetic seller statement, not buyer evidence." } });
    for (const customerMessageId of [undefined, other.message.id, outbound.id, randomUUID()]) await expect(prepareSalesOffer(request(f, { customerMessageId }), f.actor)).rejects.toThrow();
    await expect(prepareSalesOffer({ ...request(f), amount: 1, terms: "Injected conditions" } as PrepareSalesOfferInput, f.actor)).rejects.toThrow();
    expect(await outputs(f)).toHaveLength(0);
  });

  it("does not convert informational or unqualified conversations into proposals", async () => {
    for (const options of [{ informationOnly: true }, { qualify: false }]) {
      const f = await fixture(options); await expect(prepareSalesOffer(request(f), f.actor)).rejects.toThrow();
      expect(await outputs(f)).toHaveLength(0); expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).commercial).proposal).toBeUndefined();
    }
  });

  it("preserves the presented proposal and forbids preparing a replacement after PROPOSE", async () => {
    const f = await fixture(); const result = await prepareSalesOffer(request(f), f.actor);
    await sendSalesWebMessage(f.deal.id, f.actor, { requestId: randomUUID(), text: `Voici le devis approuvé : ${result.proposal.amount} XOF par mois. ${result.proposal.terms} ${result.proposal.documentUrl}` });
    await applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: result.revision, channel: "WEB", command: { type: "PROPOSE" } }, f.actor);
    const current = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    await expect(prepareSalesOffer(request(f, { expectedRevision: current.revision }), f.actor)).rejects.toThrow();
    expect(salesStateSchema.parse(current.commercial).proposal?.id).toBe(result.proposal.id); expect(await outputs(f)).toHaveLength(1);
  });

  it("replays the identical request without regenerating a document and refuses reusing its id for changed inputs", async () => {
    const f = await fixture(); const input = request(f); const first = await prepareSalesOffer(input, f.actor);
    expect(await prepareSalesOffer(input, f.actor)).toEqual(first); expect(await outputs(f)).toHaveLength(1);
    await expect(prepareSalesOffer({ ...input, countryCode: "NG" }, f.actor)).rejects.toThrow();
    expect((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).revision).toBe(first.revision);
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_OFFER_PREPARED" } })).toBe(1);
  });

  it("serializes concurrent retries into one proposal, one receipt and one real Glory document", async () => {
    const f = await fixture(); const input = request(f);
    const settled = await Promise.allSettled([prepareSalesOffer(input, f.actor), prepareSalesOffer(input, f.actor)]);
    for (const result of settled) if (result.status === "rejected") {
      const error = result.reason as { name?: string; code?: string; meta?: { code?: string; driverAdapterError?: { name?: string; cause?: { kind?: string; originalCode?: string } } }; cause?: { kind?: string; originalCode?: string } };
      console.warn("Owned concurrent rollback error shape", { name: error.name, code: error.code, metaCode: error.meta?.code,
        metaKeys: Object.keys(error.meta ?? {}), adapterName: error.meta?.driverAdapterError?.name,
        adapterCause: error.meta?.driverAdapterError?.cause, cause: error.cause });
      throw result.reason;
    }
    const results = settled.map(result => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof prepareSalesOffer>>>).value);
    expect(results[0]).toEqual(results[1]); expect(await outputs(f)).toHaveLength(1);
    expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_OFFER_PREPARED" } })).toBe(1);
  });

  it("allows one of two competing same-revision requests without creating an orphan competing quotation", async () => {
    const f = await fixture(); const results = await Promise.allSettled([prepareSalesOffer(request(f), f.actor), prepareSalesOffer(request(f), f.actor)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect(await outputs(f)).toHaveLength(1); expect(await db.cRMActivity.count({ where: { dealId: f.deal.id, activityType: "SALES_OFFER_PREPARED" } })).toBe(1);
  });

  it("executes the real MCP handler with its brand/deal worker lease and refuses missing lease or another brand", async () => {
    const f = await fixture(); const stored = await db.salesRepresentative.findUniqueOrThrow({ where: { id: f.ai.id } });
    const key = decryptTokenPayload<{ apiKey: string }>(stored.encryptedApiKey!).apiKey;
    const baseHeaders = { "content-type": "application/json", "x-api-key": key };
    const input = request(f); const params = { strategyId: f.brand.id, ...input };
    const invoke = (value: Record<string, unknown>, headers: Record<string, string>) => mcpPost(new Request("http://localhost/api/mcp/operations", {
      method: "POST", headers, body: JSON.stringify({ tool: "sales_prepare_offer", params: value }),
    }));
    const noLease = await invoke(params, baseHeaders); const noLeaseBody = await noLease.json();
    expect(noLease.status === 403 || noLeaseBody.result?.status === "REFUSED").toBe(true); expect(await outputs(f)).toHaveLength(0);
    const headers = { ...baseHeaders, "x-sales-run-id": f.run.id, "x-sales-run-lease": f.run.leaseToken };
    const foreign = await invoke({ ...params, strategyId: randomUUID() }, headers); expect(foreign.status).toBe(403);
    const response = await invoke(params, headers); expect(response.status).toBe(200);
    const result = (await response.json()).result; expect(result.status).toBe("READY"); expect(result.dealId).toBe(f.deal.id);
    expect((await canonicalQuote(f, result.proposal.gloryOutputId)).status).toBe("READY");
    expect(await outputs(f)).toHaveLength(1); expect(provider).not.toHaveBeenCalled();
  });

  it("rejects buyer acceptance of an imported proposal that was never presented", async () => {
    const f = await fixture(); const result = await prepareSalesOffer(request(f), f.actor);
    const changed = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    const state = salesStateSchema.parse(changed.commercial);
    expect(state.proposal?.presentedAt).toBeUndefined();
    // Imported legacy state must not bypass the independent presentation fence.
    await db.deal.update({ where: { id: f.deal.id }, data: { commercial: JSON.parse(JSON.stringify({ ...state, node: "PROPOSAL" })) } });
    await expect(applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: result.revision, channel: "WEB",
      command: { type: "ACCEPT", customerMessageId: f.message.id, evidence: "A received message cannot accept a quotation before presentation." } }, f.actor)).rejects.toThrow(/présentation/);
    expect(salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).commercial).agreement).toBeUndefined();
  });

  it("publishes the private document only after presentation and binds one replay-safe client confirmation to that exact proposal", async () => {
    const f = await fixture(); const result = await prepareSalesOffer(request(f), f.actor);
    const token = f.opened.path.split("/").at(-1)!;
    const params = { params: Promise.resolve({ token }) };
    const url = `http://localhost/api/sales/${token}`;
    const headers = { "content-type": "application/json", host: "localhost", origin: "http://localhost", "x-forwarded-proto": "http" };
    const post = (body: Record<string, unknown>) => customerPost(new Request(url, { method: "POST", headers, body: JSON.stringify(body) }), params);
    expect((await proposalGet(new Request(`${url}/proposal`), params)).status).toBe(404);
    expect((await customerConversation(token)).proposal).toBeNull();
    await sendSalesWebMessage(f.deal.id, f.actor, { requestId: randomUUID(), text: `Voici votre devis : 60 000 XOF par mois. ${result.proposal.terms} ${result.proposal.documentUrl}` });
    await applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: result.revision, channel: "WEB", command: { type: "PROPOSE" } }, f.actor);
    const presented = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    const state = salesStateSchema.parse(presented.commercial); expect(state.proposal?.presentedAt).toBeTruthy();
    await expect(applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: presented.revision, channel: "WEB",
      command: { type: "ACCEPT", customerMessageId: f.message.id, evidence: "The earlier request for a price was not an agreement after presentation." } }, f.actor)).rejects.toThrow(/présentation/);
    const document = await proposalGet(new Request(`${url}/proposal`), params);
    expect(document.status).toBe(200); expect(document.headers.get("cache-control")).toBe("no-store"); expect(document.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await document.text(); expect(html).toContain("Proposition commerciale"); expect(html).toContain("par mois"); expect(html).toContain("Total à payer");
    expect(html).not.toContain(result.proposal.gloryOutputId); expect(html).not.toContain(owner.id); expect(html).not.toContain("contentHash");
    const badParams = { params: Promise.resolve({ token: randomBytes(32).toString("hex") }) };
    expect((await proposalGet(new Request(`${url}/proposal`), badParams)).status).toBe(404);
    expect((await post({ requestId: randomUUID(), body: "Je confirme ce devis.", proposalId: randomUUID() })).status).toBe(409);
    const body = { requestId: randomUUID(), body: "J’accepte cette proposition à 60 000 XOF par mois, dans son périmètre et ses conditions.", proposalId: result.proposal.id };
    const beforeRuns = await db.salesRun.count({ where: { representativeId: f.ai.id } });
    expect((await post(body)).status).toBe(200); expect((await post(body)).status).toBe(200);
    expect((await post({ ...body, body: "Message changé sous la même référence." })).status).toBe(409);
    expect((await post({ ...body, proposalId: randomUUID() })).status).toBe(409);
    const message = await db.crmMessage.findFirstOrThrow({ where: { salesDealId: f.deal.id, direction: "IN", providerRef: `web:${body.requestId}` } });
    expect(await db.crmMessage.count({ where: { salesDealId: f.deal.id, direction: "IN", providerRef: `web:${body.requestId}` } })).toBe(1);
    expect(await db.salesRun.count({ where: { representativeId: f.ai.id } })).toBe(beforeRuns + 1);
    const receipt = await db.cRMActivity.findUniqueOrThrow({ where: { id: `sales-proposal-acceptance:${message.id}` } });
    expect(receipt.activityType).toBe("SALES_CUSTOMER_PROPOSAL_ACCEPTANCE");
    expect(receipt.metadata).toMatchObject({ proposalId: result.proposal.id, customerMessageId: message.id, requestId: body.requestId, gloryOutputId: result.proposal.gloryOutputId, sourceVersion: "7" });
    const pending = await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } });
    expect(salesStateSchema.parse(pending.commercial).node).toBe("PROPOSAL"); expect(salesStateSchema.parse(pending.commercial).agreement).toBeUndefined();
    await applySalesStep(f.deal.id, { requestId: randomUUID(), expectedRevision: pending.revision, channel: "WEB",
      command: { type: "ACCEPT", customerMessageId: message.id, evidence: body.body } }, f.actor);
    const accepted = salesStateSchema.parse((await db.deal.findUniqueOrThrow({ where: { id: f.deal.id } })).commercial);
    expect(accepted.node).toBe("ACCEPTED"); expect(accepted.agreement).toBe(body.body); expect(accepted.payment).toBeUndefined();
  });
});
