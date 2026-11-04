import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/** One version fence for owner authorizations, the public entry and proposals. */
export async function assertSalesCatalogueOfferIn(tx: Pick<Prisma.TransactionClient, "pillar">, strategyId: string, offer: { offerId: string; offerName: string; offerVersion: string }) {
  const pillar = await tx.pillar.findUnique({ where: { strategyId_key: { strategyId, key: "v" } } });
  const catalogue = (pillar?.content as { produitsCatalogue?: Array<{ id?: string; nom?: string }> } | null)?.produitsCatalogue ?? [];
  if (!catalogue.some(product => product.id === offer.offerId && product.nom === offer.offerName)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’offre doit appartenir au catalogue de la marque vendeuse." });
  if (String(pillar?.currentVersion) !== offer.offerVersion) throw new TRPCError({ code: "CONFLICT", message: "Le catalogue a été mis à jour. Vérifiez les conditions de vente avant de les approuver à nouveau." });
  return pillar!;
}
