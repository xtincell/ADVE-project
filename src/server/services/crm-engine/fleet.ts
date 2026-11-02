/** Brand-bound sales holders and bounded invocations of the existing Galahad loop. */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma, SalesRepresentative, SalesRun } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptTokenPayload } from "@/server/services/oauth-integrations";
import { salesStateSchema } from "./commercial";

export const representativeInput = z.object({
  id: z.string().optional(), strategyId: z.string(), name: z.string().trim().min(1).max(120),
  mode: z.enum(["HUMAN", "AI"]), humanUserId: z.string().optional(),
  maxTurns: z.number().int().min(1).max(24).default(12),
  maxTokens: z.number().int().min(1000).max(100000).default(60000),
  dailyTokenBudget: z.number().int().min(1000).max(1000000).default(150000),
  dailyRunLimit: z.number().int().min(1).max(100).default(10),
}).refine(v => v.dailyTokenBudget >= v.maxTokens, "Le budget journalier doit couvrir une exécution.");
export type FleetActor = { id: string; admin: boolean; operatorId: string | null };
type Tx = Prisma.TransactionClient;
const publicProfile = ({ encryptedApiKey: _secret, ...profile }: SalesRepresentative) => ({ ...profile,
  principalId: profile.mode === "AI" ? `mcp:${profile.mcpKeyId}` : profile.humanUserId,
});
export async function assertFleetBrand(actor: FleetActor, strategyId: string) {
  const brand = await db.strategy.findUniqueOrThrow({ where: { id: strategyId }, select: { id: true, userId: true, operatorId: true, client: { select: { operatorId: true } } } });
  const operatorId = brand.operatorId ?? brand.client?.operatorId ?? null;
  if (!actor.admin && brand.userId !== actor.id && (!operatorId || operatorId !== actor.operatorId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Gestion des vendeurs réservée à l’équipe de cette marque." });
  }
  return { ...brand, operatorId };
}
export async function assertFleetProfile(actor: FleetActor, id: string) {
  const profile = await db.salesRepresentative.findUniqueOrThrow({ where: { id } });
  await assertFleetBrand(actor, profile.strategyId);
  return profile;
}
export async function listSalesRepresentatives(actor: FleetActor, strategyId: string) {
  await assertFleetBrand(actor, strategyId);
  return (await db.salesRepresentative.findMany({ where: { strategyId }, orderBy: { createdAt: "asc" } })).map(publicProfile);
}
export async function salesRosterOptions(actor: FleetActor, strategyId: string) {
  const brand = await assertFleetBrand(actor, strategyId);
  const users = await db.user.findMany({ where: { OR: [{ id: brand.userId }, { id: actor.id }, ...(brand.operatorId ? [{ operatorId: brand.operatorId }] : [])] }, select: { id: true, name: true, email: true, operatorId: true }, orderBy: { name: "asc" } });
  return { users: users.map(({ operatorId: _operator, ...user }) => user),
    financeUserIds: users.filter(user => user.id === brand.userId || Boolean(brand.operatorId && user.operatorId === brand.operatorId)).map(user => user.id),
    brandOwnerId: brand.userId, canManage: actor.admin || brand.userId === actor.id };
}
export async function saveSalesRepresentative(actor: FleetActor, raw: z.input<typeof representativeInput>) {
  const input = representativeInput.parse(raw);
  const brand = await assertFleetBrand(actor, input.strategyId);
  if (input.mode === "HUMAN") {
    if (!input.humanUserId || !(await salesRosterOptions(actor, input.strategyId)).users.some(u => u.id === input.humanUserId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Choisir un membre de l’équipe vendeuse." });
    }
  }
  if (input.id) {
    const old = await assertFleetProfile(actor, input.id);
    if (old.strategyId !== input.strategyId || old.mode !== input.mode || old.humanUserId !== (input.mode === "HUMAN" ? input.humanUserId : null)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le titulaire et la marque restent liés à leur historique. Créer un autre vendeur pour les changer." });
    return publicProfile(await db.salesRepresentative.update({ where: { id: old.id }, data: { name: input.name, maxTurns: input.maxTurns, maxTokens: input.maxTokens, dailyRunLimit: input.dailyRunLimit, dailyTokenBudget: input.dailyTokenBudget, revision: { increment: 1 } } }));
  }
  const secret = input.mode === "AI" ? randomBytes(32).toString("hex") : null;
  // Fail before any write if the existing credential encryption key is unavailable.
  const encryptedApiKey = secret ? encryptTokenPayload({ apiKey: secret }) : null;
  return db.$transaction(async tx => {
    const key = secret ? await tx.mcpApiKey.create({ data: { name: `Commercial · ${input.name}`, keyHash: createHash("sha256").update(secret).digest("hex"), server: "*", scopeKind: "BRAND", scopeStrategyId: input.strategyId, permissions: { managedBy: "sales-fleet", allowedTools: ["operations.sales_portfolio", "operations.sales_decide", "operations.sales_send_email", "operations.sales_send_message", "operations.sales_sync_payment", "operations.sales_request_payment", "operations.sales_claim_run", "operations.sales_complete_run", "operations.sales_customer_link", "advertis.getBrandCard", "advertis.getPillarContent", "intelligence.rag_search"] }, ratePerCallUsd: 0, isActive: false } }) : null;
    const conversation = await tx.conversation.create({ data: { strategyId: input.strategyId, title: input.name, channel: "SALES_MANAGER", participants: [actor.id], status: "ACTIVE" } });
    const profile = await tx.salesRepresentative.create({ data: { strategyId: input.strategyId, operatorId: brand.operatorId, name: input.name, mode: input.mode, humanUserId: input.mode === "HUMAN" ? input.humanUserId : null, mcpKeyId: key?.id, encryptedApiKey, conversationId: conversation.id, maxTurns: input.maxTurns, maxTokens: input.maxTokens, dailyTokenBudget: input.dailyTokenBudget, dailyRunLimit: input.dailyRunLimit } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { externalRef: profile.id } });
    return publicProfile(profile);
  });
}
export async function setSalesRepresentativeStatus(actor: FleetActor, id: string, status: "DRAFT" | "ACTIVE" | "PAUSED") {
  const profile = await assertFleetProfile(actor, id);
  if (status === "ACTIVE" && profile.mode === "AI" && (!profile.mcpKeyId || !profile.encryptedApiKey)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Accès serveur du vendeur absent." });
  return db.$transaction(async tx => {
    if (profile.mcpKeyId) await tx.mcpApiKey.update({ where: { id: profile.mcpKeyId }, data: { isActive: status !== "DRAFT" } });
    const changed = await tx.salesRepresentative.update({ where: { id }, data: { status, revision: { increment: 1 } } });
    await tx.message.create({ data: { conversationId: profile.conversationId!, senderId: actor.id, senderName: "Supervision", content: `État du vendeur : ${status}`, channel: "SALES_MANAGER" } });
    return publicProfile(changed);
  });
}
export async function getSalesRepresentative(actor: FleetActor, id: string) {
  const profile = await assertFleetProfile(actor, id);
  const [runs, messages] = await Promise.all([
    db.salesRun.findMany({ where: { representativeId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.message.findMany({ where: { conversationId: profile.conversationId ?? "__none__" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200 }),
  ]);
  return { profile: publicProfile(profile), runs: runs.map(({ leaseToken: _lease, ...run }) => run), messages: messages.reverse() };
}
export async function queueSalesRunIn(tx: Tx, profile: SalesRepresentative, input: { requestId: string; instruction: string; dealId?: string }, actorId?: string) {
  const replay = await tx.salesRun.findUnique({ where: { requestId: input.requestId } });
  if (replay) {
    if (replay.representativeId !== profile.id || replay.instruction !== input.instruction || replay.dealId !== (input.dealId ?? null)) throw new TRPCError({ code: "CONFLICT", message: "Référence déjà utilisée pour une autre instruction." });
    return replay;
  }
  if (profile.status !== "ACTIVE") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activer le vendeur avant de lui confier une tâche." });
  if (input.dealId) {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: input.dealId } });
    const mandate = salesStateSchema.parse(deal.commercial ?? {}).mandate;
    const principalId = profile.mode === "AI" ? `mcp:${profile.mcpKeyId}` : profile.humanUserId;
    if (deal.sellerStrategyId !== profile.strategyId || mandate?.sellerId !== principalId) throw new TRPCError({ code: "FORBIDDEN", message: "L’affaire doit être mandatée à ce vendeur pour cette marque." });
  }
  const run = await tx.salesRun.create({ data: { representativeId: profile.id, requestId: input.requestId, instruction: input.instruction, dealId: input.dealId } });
  await tx.message.create({ data: { conversationId: profile.conversationId!, senderId: actorId, senderName: actorId ? "Supervision" : "Événement client", content: input.instruction, channel: "SALES_MANAGER", externalId: run.id } });
  return run;
}
export async function queueRun(representativeId: string, input: { requestId: string; instruction: string; dealId?: string }, actorId?: string) {
  try {
    return await db.$transaction(async tx => queueSalesRunIn(tx, await tx.salesRepresentative.findUniqueOrThrow({ where: { id: representativeId } }), input, actorId));
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const replay = await db.salesRun.findUnique({ where: { requestId: input.requestId } });
    if (!replay || replay.representativeId !== representativeId || replay.instruction !== input.instruction || replay.dealId !== (input.dealId ?? null)) throw new TRPCError({ code: "CONFLICT", message: "Référence déjà utilisée pour une autre instruction." });
    return replay;
  }
}
export async function dispatchSalesRepresentative(actor: FleetActor, input: { id: string; requestId: string; instruction: string; dealId?: string }) {
  await assertFleetProfile(actor, input.id);
  return queueRun(input.id, input, actor.id);
}
export async function getAssignedProfile(keyId: string) {
  const profile = await db.salesRepresentative.findUnique({ where: { mcpKeyId: keyId } });
  if (!profile) return null;
  const key = await db.mcpApiKey.findUnique({ where: { id: keyId }, select: { isActive: true, expiresAt: true, scopeKind: true, scopeStrategyId: true } });
  if (profile.status !== "ACTIVE" || profile.mode !== "AI" || !key?.isActive || key.scopeKind !== "BRAND" || key.scopeStrategyId !== profile.strategyId || (key.expiresAt && key.expiresAt <= new Date())) throw new TRPCError({ code: "FORBIDDEN", message: "Vendeur suspendu ou accès révoqué." });
  return publicProfile(profile);
}
export async function claimRun(keyId: string, requestId: string) {
  const candidate = await db.salesRepresentative.findUnique({ where: { mcpKeyId: keyId }, select: { status: true } });
  if (!candidate || candidate.status !== "ACTIVE") return { run: null };
  const assigned = await getAssignedProfile(keyId);
  if (!assigned) return { run: null };
  return db.$transaction(async tx => {
    const profile = await tx.salesRepresentative.findUniqueOrThrow({ where: { id: assigned.id } });
    if (profile.status !== "ACTIVE") return { run: null };
    const locked = await tx.salesRepresentative.updateMany({ where: { id: profile.id, revision: profile.revision, status: "ACTIVE" }, data: { revision: { increment: 1 } } });
    if (locked.count !== 1) return { run: null };
    const cutoff = new Date(Date.now() - 15 * 60_000);
    await tx.salesRun.updateMany({ where: { representativeId: profile.id, status: "RUNNING", claimedAt: { lt: cutoff } }, data: { status: "AMBIGUOUS", result: "Le résultat de cette exécution est inconnu ; réconcilier avant toute nouvelle exécution." } });
    const replay = await tx.salesRun.findUnique({ where: { claimRequestId: requestId } });
    const shape = (run: SalesRun) => ({ run: { id: run.id, representativeId: profile.id, strategyId: profile.strategyId, dealId: run.dealId, instruction: run.instruction, leaseToken: run.leaseToken!, maxTurns: profile.maxTurns, maxTokens: profile.maxTokens, grantMinutes: 15 } });
    if (replay) {
      if (replay.representativeId !== profile.id) throw new TRPCError({ code: "CONFLICT", message: "Référence de prise en charge déjà utilisée." });
      return replay.status === "RUNNING" ? shape(replay) : { run: null };
    }
    if (await tx.salesRun.count({ where: { representativeId: profile.id, status: { in: ["RUNNING", "AMBIGUOUS"] } } })) return { run: null };
    const today = new Date().toISOString().slice(0, 10);
    const tokens = profile.budgetDay === today ? profile.dailyTokensReserved : 0;
    const count = profile.budgetDay === today ? profile.dailyRunsClaimed : 0;
    const { validateDatedSalesRunIn } = await import("./scheduling");
    // Stale deadlines are terminal receipts, so they neither send nor block the next valid job.
    let next: SalesRun | null = null;
    const queued = await tx.salesRun.findMany({ where: { representativeId: profile.id, status: "QUEUED" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 25 });
    for (const candidate of queued) {
      const validity = await validateDatedSalesRunIn(tx, candidate, new Date());
      if (validity.allowed) { next = candidate; break; }
      await tx.salesRun.updateMany({ where: { id: candidate.id, status: "QUEUED" }, data: {
        status: "FAILED", result: validity.reason ?? "Échéance devenue sans objet : aucun effet exécuté.", completedAt: new Date(), tokensUsed: 0,
      } });
    }
    if (!next) return { run: null };
    if (tokens + profile.maxTokens > profile.dailyTokenBudget || count >= profile.dailyRunLimit) return { run: null };
    const claimed = await tx.salesRun.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "RUNNING", leaseToken: randomUUID(), claimRequestId: requestId, claimedAt: new Date(), reservedTokens: profile.maxTokens } });
    if (claimed.count !== 1) return { run: null };
    await tx.salesRepresentative.update({ where: { id: profile.id }, data: { budgetDay: today, dailyTokensReserved: tokens + profile.maxTokens, dailyRunsClaimed: count + 1 } });
    return shape(await tx.salesRun.findUniqueOrThrow({ where: { id: next.id } }));
  });
}
async function finishIn(tx: Tx, profile: SalesRepresentative, run: SalesRun, input: { status: "DONE" | "FAILED" | "AMBIGUOUS"; result: string; tokensUsed?: number }, senderId?: string) {
  const tokensUsed = input.status === "AMBIGUOUS" ? Math.max(input.tokensUsed ?? 0, run.reservedTokens) : (input.tokensUsed ?? 0);
  if (["DONE", "FAILED"].includes(run.status) || (run.status === "AMBIGUOUS" && run.completedAt && input.status === "AMBIGUOUS")) {
    if (run.status !== input.status || run.result !== input.result || (input.tokensUsed !== undefined && tokensUsed !== run.tokensUsed)) throw new TRPCError({ code: "CONFLICT", message: "Un résultat a déjà été reçu pour cette exécution." });
    return { ok: true, runId: run.id, status: run.status };
  }
  if (!Number.isSafeInteger(tokensUsed) || tokensUsed < 0 || input.result.length > 20000) throw new TRPCError({ code: "BAD_REQUEST", message: "Résultat ou mesure de consommation invalide." });
  const result = input.result;
  const changed = await tx.salesRun.updateMany({ where: { id: run.id, status: run.status }, data: { status: input.status, result, tokensUsed, completedAt: new Date() } });
  if (changed.count !== 1) {
    const current = await tx.salesRun.findUniqueOrThrow({ where: { id: run.id } });
    if (current.status === input.status && current.result === result) return { ok: true, runId: run.id, status: current.status };
    throw new TRPCError({ code: "CONFLICT", message: "Un résultat différent vient d’être reçu." });
  }
  if (!run.completedAt && run.claimedAt?.toISOString().slice(0, 10) === profile.budgetDay) await tx.salesRepresentative.update({ where: { id: profile.id }, data: { dailyTokensReserved: { increment: tokensUsed - run.reservedTokens }, revision: { increment: 1 } } });
  await tx.message.create({ data: { conversationId: profile.conversationId!, senderId, senderName: profile.name, content: result, channel: "SALES_MANAGER", externalId: run.id } });
  return { ok: true, runId: run.id, status: input.status };
}
export async function completeRun(keyId: string, runId: string, leaseToken: string, input: { status: "DONE" | "FAILED" | "AMBIGUOUS"; result: string; tokensUsed?: number }) {
  // Completion receipts remain acceptable after pause; they never restart effects.
  return db.$transaction(async tx => {
    const profile = await tx.salesRepresentative.findUniqueOrThrow({ where: { mcpKeyId: keyId } });
    const run = await tx.salesRun.findUniqueOrThrow({ where: { id: runId } });
    if (run.representativeId !== profile.id || run.leaseToken !== leaseToken || !["RUNNING", "AMBIGUOUS", "DONE", "FAILED"].includes(run.status)) throw new TRPCError({ code: "FORBIDDEN", message: "Accusé de réception hors de sa prise en charge." });
    return finishIn(tx, profile, run, input);
  });
}
export async function resolveSalesRun(actor: FleetActor, input: { runId: string; status: "DONE" | "FAILED"; result: string }) {
  const run = await db.salesRun.findUniqueOrThrow({ where: { id: input.runId } });
  const profile = await assertFleetProfile(actor, run.representativeId);
  if (run.status === "RUNNING") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Attendre le résultat ou l’expiration de l’exécution active." });
  if (run.status === "QUEUED" && profile.mode !== "HUMAN") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La tâche IA attend son exécution ; la suspendre ou la traiter par passation." });
  return db.$transaction(tx => finishIn(tx, profile, run, { ...input, tokensUsed: run.tokensUsed ?? run.reservedTokens }, actor.id));
}
function assertSameInbound(message: { channel: string; body: string; subject: string | null }, input: { channel: string; body: string; subject?: string }) {
  if (message.channel !== input.channel || message.body !== input.body || message.subject !== (input.subject ?? null)) throw new TRPCError({ code: "CONFLICT", message: "Référence de message déjà utilisée avec un contenu différent." });
}
export async function recordInboundSalesMessage(input: { dealId: string; channel: string; body: string; subject?: string; externalId: string }, actorId?: string) {
  try { return await db.$transaction(async tx => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: input.dealId } });
    const existing = await tx.crmMessage.findFirst({ where: { salesDealId: deal.id, providerRef: input.externalId, direction: "IN" } });
    if (existing) { assertSameInbound(existing, input); return { message: existing, run: null }; }
    const contact = deal.contactEmail ? await tx.crmContact.upsert({ where: { email: deal.contactEmail.toLowerCase() }, create: { email: deal.contactEmail.toLowerCase(), name: deal.contactName, strategyId: deal.sellerStrategyId, source: "SALES" }, update: {} }) : null;
    const message = await tx.crmMessage.create({ data: { id: "sales-in-" + createHash("sha256").update(JSON.stringify([deal.id, input.externalId])).digest("hex"), contactId: contact?.id, salesDealId: deal.id, direction: "IN", channel: input.channel, body: input.body, subject: input.subject, providerRef: input.externalId, provider: actorId ? "MANUAL" : "SALES_PORTAL", status: "RECEIVED", sentBy: actorId } });
    const mandate = salesStateSchema.parse(deal.commercial ?? {}).mandate;
    const profile = mandate?.sellerId.startsWith("mcp:") ? await tx.salesRepresentative.findUnique({ where: { mcpKeyId: mandate.sellerId.slice(4) } }) : null;
    const run = profile?.status === "ACTIVE" ? await queueSalesRunIn(tx, profile, { requestId: `inbound:${message.id}`, dealId: deal.id, instruction: `Nouvelle réponse du client sur ${input.channel}, message ${message.id}. Relire l’affaire et cette réponse, répondre selon le mandat et le canal autorisé. Ne pas inventer de paiement ni de livraison.` }) : null;
    return { message, run };
  }); } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const message = await db.crmMessage.findFirst({ where: { salesDealId: input.dealId, providerRef: input.externalId, direction: "IN" } });
    if (!message) throw error;
    assertSameInbound(message, input);
    const run = await db.salesRun.findUnique({ where: { requestId: `inbound:${message.id}` } });
    return { message, run };
  }
}

/** Pausing a named human prevents new sales effects while preserving legacy callers and receipts. */
export async function assertHumanSalesActive(strategyId:string,userId:string){
  const holder=await db.salesRepresentative.findFirst({where:{strategyId,humanUserId:userId,mode:"HUMAN"},select:{status:true}});
  if(holder&&holder.status!=="ACTIVE")throw new TRPCError({code:"FORBIDDEN",message:"Ce vendeur humain est en pause. Réactiver son poste ou transmettre l’affaire."});
}
