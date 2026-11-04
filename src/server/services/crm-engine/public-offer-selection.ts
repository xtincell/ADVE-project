/** Resolve an immutable inbound offer without importing the dossier creation services. */
import { TRPCError } from "@trpc/server";
import type { Deal, Prisma } from "@prisma/client";
import { mandateSchema, type SalesActor, type SalesState } from "./commercial";

export async function resolvePublicSalesOfferIn(tx: Prisma.TransactionClient, deal: Deal, previous: SalesState, offerId: string, actor: SalesActor) {
  const session = await tx.salesPublicSession.findUnique({ where: { dealId: deal.id }, include: { entry: { select: { strategyId: true } } } });
  if (!session || session.entry.strategyId !== deal.sellerStrategyId || !["DISCOVERY", "QUALIFIED"].includes(previous.node) ||
    previous.contactStopped || !previous.mandate || previous.mandate.sellerId !== actor.id || deal.paymentReference) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seul le vendeur chargé de cette affaire peut choisir l’offre, avant sa présentation au client." });
  }
  const candidates = Array.isArray(session.approvedOffers) ? session.approvedOffers : [];
  const approved = candidates.map(value => mandateSchema.safeParse(value)).find(result => result.success && result.data.offerId === offerId);
  if (!approved?.success || Boolean(approved.data.informationOnly) !== Boolean(previous.mandate.informationOnly) || approved.data.sellerId !== actor.id || approved.data.channels.length !== 1 || approved.data.channels[0] !== "WEB" ||
    approved.data.outboundEmailEnabled || new Date(approved.data.expiresAt) <= new Date()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cette offre ne fait pas partie des conditions de vente encore valables pour cette conversation." });
  }
  return approved.data;
}
