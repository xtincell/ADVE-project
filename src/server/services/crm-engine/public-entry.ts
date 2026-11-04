/** Public entry is a bounded owner delegation into the existing Deal / STI / fleet. */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma, SalesPublicEntry } from "@prisma/client";
import { db } from "@/lib/db";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { createDealIn } from "./index";
import { advanceSale, mandateSchema, type SalesState } from "./commercial";
import { assertFleetBrand, recordInboundSalesMessageIn, ensureSalesOfferToolsIn, type FleetActor } from "./fleet";
import { issueCustomerAccessIn } from "./customer";
import { serialSalesTransaction } from "./transaction";
import { assertSalesCatalogueOfferIn, assertSalesPrincipalIn } from "./portfolio";
import { saveSalesPublicEntryInput, startPublicSalesConversationInput, projectPublicSalesHumanContact,
  type SaveSalesPublicEntryInput, type StartPublicSalesConversationInput } from "./public-entry-contract";

type Tx = Prisma.TransactionClient;
type Config = ReturnType<typeof saveSalesPublicEntryInput.parse>;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const sameDigest = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const unavailable = () => new TRPCError({ code: "PRECONDITION_FAILED", message: "Cette équipe ne reçoit pas de nouvelles conversations pour le moment." });
const conflict = () => new TRPCError({ code: "CONFLICT", message: "Cette demande ne correspond pas à la conversation initiale. Reprenez le lien conservé dans ce navigateur." });
const publicPath = (id: string) => `/talk/${id}`;
/** Match the existing effective-admin policy using the freshly read DB email. */
const approvedPublisher = (ownerId: string, author: { id: string; role: string; email: string | null } | null) =>
  !!author && (author.id === ownerId || author.role === "ADMIN" || isGodModeEmail(author.email));
const fingerprint = (value: StartPublicSalesConversationInput) => hash(JSON.stringify({
  message: value.message, displayName: value.displayName ?? null, offerId: value.offerId ?? null,
}));

/** An IP is pseudonymised using the app's existing secret; raw addresses never enter a receipt. */
export function publicSalesClientIpHash(ip: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La conversation est momentanément indisponible." });
  return createHmac("sha256", secret).update(`sales-public-ip:${ip}`).digest("hex");
}

async function ownerBrand(tx: Pick<Tx, "strategy" | "user">, actor: FleetActor, strategyId: string) {
  const brand = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId }, select: { id: true, name: true, userId: true, operatorId: true, client: { select: { operatorId: true } } } });
  if (brand.userId !== actor.id && !actor.admin) throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire de la marque peut publier son entrée commerciale." });
  return { ...brand, operatorId: brand.operatorId ?? brand.client?.operatorId ?? null };
}

async function assertConfigIn(tx: Tx, config: Config, authorizedBy: string) {
  const [brand, author] = await Promise.all([
    tx.strategy.findUnique({ where: { id: config.strategyId }, select: { id: true, userId: true, operatorId: true, status: true, client: { select: { operatorId: true } } } }),
    tx.user.findUnique({ where: { id: authorizedBy }, select: { id: true, role: true, email: true } }),
  ]);
  if (!brand || ["ARCHIVED", "DELETED"].includes(brand.status) || !approvedPublisher(brand.userId, author)) throw unavailable();
  const scope = { ...brand, operatorId: brand.operatorId ?? brand.client?.operatorId ?? null };
  const profile = await tx.salesRepresentative.findUnique({ where: { id: config.representativeId } });
  if (!profile || profile.strategyId !== brand.id || profile.status !== "ACTIVE") throw unavailable();
  const sellerId = profile.mode === "AI" ? profile.mcpKeyId && `mcp:${profile.mcpKeyId}` : profile.humanUserId;
  if (!sellerId || !profile.conversationId) throw unavailable();
  await assertSalesPrincipalIn(tx, sellerId, scope, true);
  for (const offer of config.offers) {
    if (new Date(offer.expiresAt) <= new Date()) throw unavailable();
    await assertSalesCatalogueOfferIn(tx, brand.id, offer);
    if (offer.pricingRule) {
      const { lookupCountry } = await import("../country-registry");
      for (const code of offer.pricingRule.countryCodes) {
        const country = await lookupCountry(code);
        if (!country || country.code !== code) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez des pays reconnus pour le calcul du tarif." });
      }
    }
    await assertSalesPrincipalIn(tx, offer.deliveryOwnerId, scope, true);
    if (offer.collection) await assertSalesPrincipalIn(tx, offer.collection.financeOwnerId, scope, false);
  }
  return { brand: scope, profile, sellerId };
}

async function readyEntryIn(tx: Tx, entry: SalesPublicEntry) {
  if (!entry.enabled) throw unavailable();
  const parsed = saveSalesPublicEntryInput.safeParse(entry.config);
  if (!parsed.success || parsed.data.strategyId !== entry.strategyId || parsed.data.representativeId !== entry.representativeId) throw unavailable();
  const config = parsed.data;
  const emission = await tx.intentEmission.findUnique({ where: { id: entry.intentId }, select: { strategyId: true, caller: true } });
  if (!emission || emission.strategyId !== entry.strategyId || emission.caller !== "crm:saveSalesPublicEntry") throw unavailable();
  return { config, ...await assertConfigIn(tx, config, entry.authorizedBy) };
}

/** Only the owner/admin sees private templates and financial instructions. */
export async function getSalesPublicEntry(actor: FleetActor, input: { strategyId: string }) {
  await ownerBrand(db, actor, input.strategyId);
  const entry = await db.salesPublicEntry.findUnique({ where: { strategyId: input.strategyId } });
  let available = false, readinessReason: string | null = entry ? "Entrée en pause." : null;
  if (entry?.enabled) {
    try { await db.$transaction(tx => readyEntryIn(tx, entry)); available = true; readinessReason = null; }
    catch (error) { if (!(error instanceof TRPCError)) throw error; readinessReason = error.message; }
  }
  return { entry: entry ? { publicId: entry.publicId, revision: entry.revision,
    ...saveSalesPublicEntryInput.parse(entry.config), expectedRevision: entry.revision, enabled: entry.enabled } : null,
    path: entry ? publicPath(entry.publicId) : null, available, readinessReason };
}

export async function saveSalesPublicEntry(actor: FleetActor, raw: SaveSalesPublicEntryInput, intentId: string) {
  const input = saveSalesPublicEntryInput.parse(raw);
  await assertFleetBrand(actor, input.strategyId);
  await db.$transaction(async tx => {
    await ownerBrand(tx, actor, input.strategyId);
    // Serialize publishing with inbound admission and the brand's other commercial effects.
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${input.strategyId} FOR UPDATE`;
    const existing = await tx.salesPublicEntry.findUnique({ where: { strategyId: input.strategyId } });
    if ((existing?.revision ?? 0) !== input.expectedRevision) throw new TRPCError({ code: "CONFLICT", message: "L’entrée commerciale a changé. Relisez-la avant de publier." });
    const emission = await tx.intentEmission.findUnique({ where: { id: intentId }, select: { strategyId: true, caller: true, payload: true } });
    if (!emission || emission.strategyId !== input.strategyId || emission.caller !== "crm:saveSalesPublicEntry" ||
      (emission.payload as { expectedRevision?: number } | null)?.expectedRevision !== input.expectedRevision) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Publiez cette entrée depuis le poste commercial de la marque." });
    }
    // A stale catalogue or paused seller must never prevent the owner from closing the door.
    if (input.enabled) {
      const ready = await assertConfigIn(tx, input, actor.id);
      if (ready.profile.mcpKeyId) await ensureSalesOfferToolsIn(tx, ready.profile.mcpKeyId);
    }
    const values = { representativeId: input.representativeId, enabled: input.enabled, authorizedBy: actor.id,
      intentId, config: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonObject };
    if (existing) await tx.salesPublicEntry.update({ where: { id: existing.id }, data: { ...values, revision: { increment: 1 } } });
    else await tx.salesPublicEntry.create({ data: { ...values, strategyId: input.strategyId, publicId: randomBytes(12).toString("hex") } });
  });
  return getSalesPublicEntry(actor, { strategyId: input.strategyId });
}

/** No strategy content, personnel IDs, destination, secret or mandate tree crosses this projection. */
export async function publicSalesEntry(publicId: string) {
  const entry = await db.salesPublicEntry.findUnique({ where: { publicId } });
  if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Cette conversation est indisponible." });
  const parsed = saveSalesPublicEntryInput.safeParse(entry.config);
  if (!parsed.success) throw unavailable();
  let available = false;
  let sellerMode: "AI" | "HUMAN" = "HUMAN";
  try {
    const ready = await db.$transaction(tx => readyEntryIn(tx, entry));
    available = true;
    sellerMode = ready.profile.mode === "AI" ? "AI" : "HUMAN";
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error;
  }
  // The approved human relay remains usable when the AI is unavailable.
  // Closing the public door also withdraws this current public announcement.
  let contactApproved=available;
  if(entry.enabled&&parsed.data.humanContact&&!available){
    const [emission,brand,author]=await Promise.all([
      db.intentEmission.findUnique({where:{id:entry.intentId},select:{strategyId:true,caller:true}}),
      db.strategy.findUnique({where:{id:entry.strategyId},select:{userId:true,status:true}}),
      db.user.findUnique({where:{id:entry.authorizedBy},select:{id:true,role:true,email:true}}),
    ]);
    contactApproved=!!(brand&&!["ARCHIVED","DELETED"].includes(brand.status)&&approvedPublisher(brand.userId,author)&&
      emission?.strategyId===entry.strategyId&&emission.caller==="crm:saveSalesPublicEntry");
  }
  return { publicId: entry.publicId, brandName: parsed.data.publicBrandName, welcome: parsed.data.welcome, available, sellerMode,
    humanContact: entry.enabled&&contactApproved ? projectPublicSalesHumanContact(parsed.data.humanContact) : null,
    informationOnly: parsed.data.informationOnly,
    offers: available ? parsed.data.offers.map(offer => parsed.data.informationOnly ? { id: offer.offerId, name: offer.offerName } : ({ id: offer.offerId, name: offer.offerName,
      terms: offer.terms, ...(offer.pricingRule ? { pricingRequired: true } : { amount: offer.amount, currency: offer.currency }) })) : [] };
}

/** Public brand pages can expose the same stable entry without publishing private ADVE fields. */
export async function publicSalesEntryLink(strategyId: string): Promise<{ path: string; brandName: string } | null> {
  const row = await db.salesPublicEntry.findUnique({ where: { strategyId }, select: { publicId: true } });
  if (!row) return null;
  const projection = await publicSalesEntry(row.publicId);
  return projection.available ? { path: publicPath(row.publicId), brandName: projection.brandName } : null;
}

export async function publicSalesEntryLinkBySlug(slug: string): Promise<{ path: string; brandName: string } | null> {
  const brand = await db.strategy.findUnique({ where: { publicSlug: slug }, select: { id: true } });
  return brand ? publicSalesEntryLink(brand.id) : null;
}

export async function startPublicSalesConversation(publicId: string, raw: StartPublicSalesConversationInput, context: { ipHash?: string } = {}) {
  const input = startPublicSalesConversationInput.parse(raw);
  const secretHash = hash(input.clientSecret), requestFingerprint = fingerprint(input);
  const ipHash = context.ipHash ?? "anonymous";
  return serialSalesTransaction(async tx => {
    const entry = await tx.salesPublicEntry.findUnique({ where: { publicId } });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Cette conversation est indisponible." });
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${entry.strategyId} FOR UPDATE`;
    const current = await tx.salesPublicEntry.findUniqueOrThrow({ where: { id: entry.id } });
    const previous = await tx.salesPublicSession.findFirst({ where: { entryId: current.id,
      OR: [{ requestId: input.requestId }, { secretHash }] } });
    if (previous) {
      if (previous.requestId !== input.requestId || !sameDigest(previous.secretHash, secretHash) || previous.fingerprint !== requestFingerprint) throw conflict();
      // A proven retry recovers this conversation even after expiry/pause/STOP; it grants no new sales effect.
      return issueCustomerAccessIn(tx, previous.dealId);
    }
    const { config, brand, sellerId } = await readyEntryIn(tx, current);
    const selected = input.offerId ? config.offers.find(offer => offer.offerId === input.offerId) : config.offers[0];
    if (!selected) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez une des offres proposées par cette marque." });
    const now = new Date();
    const hour = new Date(now.getTime() - 3600000), day = new Date(now.getTime() - 86400000);
    const [daily, hourly, ipCount] = await Promise.all([
      tx.salesPublicSession.count({ where: { entryId: current.id, createdAt: { gte: day } } }),
      tx.salesPublicSession.count({ where: { entryId: current.id, createdAt: { gte: hour } } }),
      tx.salesPublicSession.count({ where: { entryId: current.id, ipHash, createdAt: { gte: hour } } }),
    ]);
    if (daily >= config.maxConversationsPerDay || hourly >= config.maxConversationsPerHour || ipCount >= 3) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Cette équipe a atteint sa capacité de nouvelles conversations. Réessayez plus tard." });
    }
    const dealId = `sales-public-${hash(JSON.stringify([current.id, input.requestId]))}`;
    const notApplicable = "Non applicable — conversation d’information, aucun paiement autorisé.";
    const approvedOffers = config.offers.map(offer => mandateSchema.parse({ ...offer,
      amount: config.informationOnly || offer.pricingRule ? 0 : offer.amount,
      currency: config.informationOnly ? (offer.currency ?? "XXX") : offer.pricingRule ? "XXX" : offer.currency,
      beneficiary: config.informationOnly ? notApplicable : offer.beneficiary,
      paymentInstructions: config.informationOnly ? notApplicable : offer.paymentInstructions,
      informationOnly: config.informationOnly,
      sellerId, channels: ["WEB" as const], outboundEmailEnabled: false,
      collection: !config.informationOnly && offer.collection ? { ...offer.collection, attestedBy: current.authorizedBy, attestedAt: current.updatedAt.toISOString() } : undefined }));
    const mandate = approvedOffers.find(offer => offer.offerId === selected.offerId)!;
    const state: SalesState = advanceSale({ node: "DISCOVERY" }, { requestId: input.requestId, expectedRevision: 0,
      channel: "WEB", command: { type: "MANDATE", mandate } }, { id: current.authorizedBy, admin: true }, now);
    await createDealIn(tx, { id: dealId, contactName: input.displayName ?? "Visiteur web", companyName: "Demande web",
      operatorId: brand.operatorId ?? undefined, sellerStrategyId: brand.id, value: mandate.informationOnly ? 0 : mandate.pricingRule ? undefined : mandate.amount, currency: mandate.currency,
      source: "PUBLIC_SALES_ENTRY", performedBy: current.authorizedBy,
      creationDescription: "Conversation ouverte par le visiteur",
      creationMetadata: { publicEntryId: current.id, publicEntryRevision: current.revision, authorizationIntentId: current.intentId,
        publicBrandName: config.publicBrandName, humanContact: config.humanContact ?? null,
        market: config.market, initiatedBy: "CUSTOMER", consentScope: "THIS_WEB_CONVERSATION" } });
    await tx.deal.update({ where: { id: dealId }, data: { commercial: JSON.parse(JSON.stringify(state)), revision: 1 } });
    await tx.cRMActivity.create({ data: { dealId, performedBy: current.authorizedBy, activityType: "SALES_DECISION", description: "MANDATE",
      metadata: JSON.parse(JSON.stringify({ actorId: current.authorizedBy, intentId: current.intentId,
        publicEntryId: current.id, publicEntryRevision: current.revision, channel: "WEB", command: { type: "MANDATE", mandate }, from: "DISCOVERY", to: "DISCOVERY" })) } });
    const access = await issueCustomerAccessIn(tx, dealId);
    await tx.salesPublicSession.create({ data: { entryId: current.id, requestId: input.requestId, secretHash,
      fingerprint: requestFingerprint, dealId, approvedOffers: JSON.parse(JSON.stringify(approvedOffers)), ipHash } });
    await recordInboundSalesMessageIn(tx, { dealId, channel: "WEB", body: input.message, externalId: `public-start:${input.requestId}` });
    // Human holders use the same dossier; the existing inbound helper queues only AI holders.
    return access;
  }, { timeout: 20000 });
}
