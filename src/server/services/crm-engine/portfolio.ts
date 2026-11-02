/** Owner-authorized cohorts reuse Deal, frozen mandates, the journal and bounded sales jobs. */
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createDealIn } from "./index";
import { advanceSale, salesStateSchema } from "./commercial";
import { assertFleetBrand, queueSalesRunIn, type FleetActor } from "./fleet";
import { issueCustomerAccessIn } from "./customer";
import { datedSalesInstruction, firstContactSalesPlan } from "./scheduling";
import {
  authorizeSalesPortfolioInput, type AuthorizeSalesPortfolioInput,
  type AuthorizedSalesPortfolio, type SalesPortfolioReceipt,
} from "./portfolio-contract";

type Tx = Prisma.TransactionClient;
const receiptType = "SALES_PORTFOLIO_AUTHORIZED";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const receiptId = (requestId: string) => `sales-portfolio:${requestId}`;
const phone = (value?: string | null) => value?.replace(/[^\d+]/g, "") ?? "";
const conflict = () => new TRPCError({ code: "CONFLICT", message: "Cette autorisation ou identité d’origine a déjà été utilisée pour un autre portefeuille. Relire les autorisations existantes." });

interface PersistedAuthorization {
  fingerprint: string;
  actorId: string;
  receipt: SalesPortfolioReceipt;
}
function readReceipt(metadata: unknown): PersistedAuthorization | null {
  const stored = metadata as Partial<PersistedAuthorization> | null;
  return stored?.receipt?.requestId && Array.isArray(stored.receipt.members) && typeof stored.fingerprint === "string" && typeof stored.actorId === "string"
    ? stored as PersistedAuthorization : null;
}
async function project(receipt: SalesPortfolioReceipt): Promise<AuthorizedSalesPortfolio> {
  const ids = receipt.members.map(member => member.dealId);
  const [deals, runs] = await Promise.all([
    db.deal.findMany({ where: { id: { in: ids }, sellerStrategyId: receipt.strategyId } }),
    db.salesRun.findMany({ where: { dealId: { in: ids } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  return { receipt, outcomes: deals.map(deal => {
    const state = salesStateSchema.parse(deal.commercial ?? {});
    return { dealId: deal.id, stage: deal.stage, node: state.node, nextAction: state.nextAction ?? null,
      nextDeadline: state.nextDeadline ?? null, contactStopped: Boolean(state.contactStopped),
      runStatus: runs.find(run => run.dealId === deal.id)?.status ?? null };
  }) };
}

/** Read only the chosen brand's authorizations, never the global contact pool. */
export async function listAuthorizedSalesPortfolios(actor: FleetActor, input: { strategyId: string; representativeId?: string }): Promise<AuthorizedSalesPortfolio[]> {
  await assertFleetBrand(actor, input.strategyId);
  const rows = await db.cRMActivity.findMany({
    where: { activityType: receiptType, metadata: { path: ["receipt", "strategyId"], equals: input.strategyId } },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }], take: 100,
  });
  const receipts = rows.flatMap(row => {
    const stored = readReceipt(row.metadata);
    // A free-form CRM note cannot impersonate the governed, uniquely addressed receipt.
    return stored && row.id === receiptId(stored.receipt.requestId) && row.dealId === stored.receipt.members[0]?.dealId &&
      row.performedBy === stored.actorId && stored.receipt.authorizedBy === stored.actorId &&
      (!input.representativeId || stored.receipt.representativeId === input.representativeId) ? [stored.receipt] : [];
  });
  return Promise.all(receipts.map(project));
}

/** Internal principal check shares the selling team; finance is always a real User. */
async function assertPrincipal(tx: Tx, id: string, brand: { id: string; userId: string; operatorId: string | null }, allowAgent: boolean) {
  if (allowAgent && id.startsWith("mcp:")) {
    const key = await tx.mcpApiKey.findUnique({ where: { id: id.slice(4) } });
    const holder = await tx.salesRepresentative.findUnique({ where: { mcpKeyId: id.slice(4) } });
    if (key?.isActive && key.scopeKind === "BRAND" && key.scopeStrategyId === brand.id &&
        (!key.expiresAt || key.expiresAt > new Date()) && (!holder || holder.status === "ACTIVE")) return;
  } else if (!id.startsWith("mcp:")) {
    const user = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, operatorId: true } });
    if (user && (user.id === brand.userId || (brand.operatorId && user.operatorId === brand.operatorId))) return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: allowAgent ? "Responsable de livraison hors de l’équipe vendeuse." : "Le rapprochement doit être confié à un membre humain de la marque." });
}

export async function authorizeSalesPortfolio(actor: FleetActor, raw: AuthorizeSalesPortfolioInput, intentId: string): Promise<AuthorizedSalesPortfolio> {
  const parsed = authorizeSalesPortfolioInput.parse(raw);
  // Order-independent membership and channel sets preserve a stable authorization on retry.
  const input = { ...parsed, members: [...parsed.members].sort((a, b) => a.originKey < b.originKey ? -1 : a.originKey > b.originKey ? 1 : 0),
    mandate: { ...parsed.mandate, channels: [...new Set(parsed.mandate.channels)].sort() } };
  const fingerprint = digest({ actorId: actor.id, input });
  const authorizationId = receiptId(input.requestId);
  const existingReceipt = async (tx: Pick<Tx, "cRMActivity">) => {
    const row = await tx.cRMActivity.findUnique({ where: { id: authorizationId } });
    if (!row) return null;
    const stored = readReceipt(row.metadata);
    if (!stored || stored.fingerprint !== fingerprint || stored.actorId !== actor.id || stored.receipt.strategyId !== input.strategyId) throw conflict();
    return stored.receipt;
  };
  let receipt: SalesPortfolioReceipt | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      receipt = await db.$transaction(async tx => {
        const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { id: true, userId: true, operatorId: true, client: { select: { operatorId: true } } } });
        if (!actor.admin && strategy.userId !== actor.id) throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire de la marque peut autoriser ce portefeuille." });
        const brand = { ...strategy, operatorId: strategy.operatorId ?? strategy.client?.operatorId ?? null };
        const emission = await tx.intentEmission.findUnique({ where: { id: intentId }, select: { strategyId: true, caller: true, payload: true } });
        if (!emission || emission.strategyId !== brand.id || emission.caller !== "crm:authorizeSalesPortfolio" ||
            (emission.payload as { requestId?: string } | null)?.requestId !== input.requestId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’autorisation doit traverser la commande gouvernée de cette marque." });
        }
        const replay = await existingReceipt(tx);
        if (replay) return replay;
        const now = new Date();
        if (new Date(input.mandate.expiresAt) <= now) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le mandat doit être en vigueur." });
        const profile = await tx.salesRepresentative.findUniqueOrThrow({ where: { id: input.representativeId } });
        if (profile.strategyId !== brand.id || profile.status !== "ACTIVE") throw new TRPCError({ code: "FORBIDDEN", message: "Choisir un vendeur actif de cette marque." });
        const sellerId = profile.mode === "AI" ? `mcp:${profile.mcpKeyId}` : profile.humanUserId;
        if (!sellerId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’identité du vendeur doit être prête." });
        await assertPrincipal(tx, sellerId, brand, true);
        await assertPrincipal(tx, input.mandate.deliveryOwnerId, brand, true);
        await assertPrincipal(tx, input.mandate.collection.financeOwnerId, brand, false);
        if (profile.mode === "AI" && profile.mcpKeyId) {
          const key = await tx.mcpApiKey.findUniqueOrThrow({ where: { id: profile.mcpKeyId } });
          const permissions = key.permissions as { managedBy?: unknown; allowedTools?: unknown } | null;
          if (permissions?.managedBy === "sales-fleet") {
            if (!Array.isArray(permissions.allowedTools) || !permissions.allowedTools.every(tool => typeof tool === "string")) {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Les permissions bornées du vendeur doivent être rétablies avant autorisation." });
            }
            if (!permissions.allowedTools.includes("operations.sales_request_payment")) {
              await tx.mcpApiKey.update({ where: { id: key.id }, data: {
                permissions: { ...permissions, allowedTools: [...permissions.allowedTools, "operations.sales_request_payment"] } as Prisma.InputJsonObject,
              } });
            }
          }
        }
        const pillar = await tx.pillar.findUnique({ where: { strategyId_key: { strategyId: brand.id, key: "v" } } });
        const catalogue = (pillar?.content as { produitsCatalogue?: Array<{ id?: string; nom?: string }> } | null)?.produitsCatalogue ?? [];
        if (!catalogue.some(product => product.id === input.mandate.offerId && product.nom === input.mandate.offerName)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’offre doit appartenir au catalogue de la marque vendeuse." });
        if (String(pillar?.currentVersion) !== input.mandate.offerVersion) throw new TRPCError({ code: "CONFLICT", message: "La version de l’offre a changé. Relire les conditions avant autorisation." });
        const stopped = await tx.deal.findMany({ where: { sellerStrategyId: brand.id, commercial: { path: ["contactStopped"], equals: true } }, select: { contactEmail: true, contactPhone: true } });
        if (input.members.some(member => stopped.some(old =>
          (member.contactEmail && old.contactEmail?.toLowerCase() === member.contactEmail.toLowerCase()) ||
          (member.contactPhone && phone(old.contactPhone) === phone(member.contactPhone))))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Un destinataire de cette cohorte a demandé l’arrêt des contacts pour cette marque." });
        }
        const common = { ...input.mandate, sellerId, portfolioAuthorizationId: input.requestId,
          collection: { ...input.mandate.collection, attestedBy: actor.id, attestedAt: now.toISOString() } };
        const members: SalesPortfolioReceipt["members"] = [];
        for (const member of input.members) {
          // Independent of requestId, email and seller: a retry/new authorization cannot duplicate this source opportunity.
          const dealId = `sales-origin-${digest([brand.id, input.source.reference, member.originKey])}`;
          await createDealIn(tx, { id: dealId, contactName: member.contactName, companyName: member.companyName,
            contactEmail: member.contactEmail, contactPhone: member.contactPhone, operatorId: brand.operatorId ?? undefined,
            sellerStrategyId: brand.id, value: common.amount, currency: common.currency, source: "AUTHORIZED_PORTFOLIO",
            performedBy: actor.id, creationDescription: `Affaire autorisée : ${member.companyName}`,
            creationMetadata: { portfolioAuthorizationId: input.requestId, portfolioMemberId: member.originKey, intentId, source: input.source, market: input.market } });
          const mandate = { ...common, portfolioMemberId: member.originKey };
          const state = advanceSale({ node: "DISCOVERY" }, { requestId: input.requestId, expectedRevision: 0, channel: mandate.channels[0]!, command: { type: "MANDATE", mandate } }, { id: actor.id, admin: true }, now);
          const plan = firstContactSalesPlan(mandate, input.requestId, now);
          if (!plan) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le premier contact doit avoir une date et une autorisation explicites." });
          await tx.deal.update({ where: { id: dealId }, data: { commercial: JSON.parse(JSON.stringify({ ...state, nextPlan: plan, nextAction: plan.action, nextDeadline: plan.dueAt })), revision: 1 } });
          await tx.cRMActivity.create({ data: { dealId, performedBy: actor.id, activityType: "SALES_DECISION", description: "MANDATE",
            metadata: { actorId: actor.id, intentId, portfolioAuthorizationId: input.requestId, portfolioMemberId: member.originKey, channel: mandate.channels[0]!, command: { type: "MANDATE", mandate: JSON.parse(JSON.stringify(mandate)) }, from: "DISCOVERY", to: "DISCOVERY" } } });
          if (mandate.channels.includes("WEB")) await issueCustomerAccessIn(tx, dealId);
          const run = new Date(plan.dueAt) <= now ? await queueSalesRunIn(tx, profile, {
            requestId: `deadline:${dealId}:${plan.id}`, dealId,
            instruction: datedSalesInstruction(plan),
          }, actor.id) : null;
          members.push({ ...member, dealId, initialRunId: run?.id ?? null });
        }
        const result: SalesPortfolioReceipt = { requestId: input.requestId, intentId, strategyId: brand.id, market: input.market,
          representativeId: profile.id, representativeName: profile.name, authorizedBy: actor.id, authorizedAt: now.toISOString(),
          source: input.source, mandate: common, members };
        await tx.cRMActivity.create({ data: { id: authorizationId, dealId: members[0]!.dealId, activityType: receiptType,
          performedBy: actor.id, description: `Portefeuille autorisé : ${members.length} affaire(s), ${common.offerName}`,
          metadata: JSON.parse(JSON.stringify({ fingerprint, actorId: actor.id, receipt: result })) } });
        return result;
      }, { isolationLevel: "Serializable", timeout: 20000 });
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2034" && attempt < 2) continue;
      if (code === "P2002") {
        // The winning transaction has committed before PostgreSQL releases its unique-key wait.
        await assertFleetBrand(actor, input.strategyId);
        receipt = await existingReceipt(db) ?? undefined;
        if (receipt) break;
        throw conflict();
      }
      throw error;
    }
  }
  if (!receipt) throw conflict();
  return project(receipt);
}
