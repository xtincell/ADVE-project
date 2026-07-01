/**
 * talent-services/ — Gigs prestataires façon Fiverr/Malt (ADR-0117).
 *
 * Un talent liste ses offres (titre, description, prix indicatif) indépendamment
 * des missions ouvertes. Browse public + gestion par le propriétaire. Zéro LLM.
 */

import { db } from "@/lib/db";

async function resolveTalentProfileId(userId: string): Promise<string> {
  const tp = await db.talentProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!tp) throw new Error("Aucun profil talent pour cet utilisateur — inscris-toi à la Guilde d'abord.");
  return tp.id;
}

export interface ServiceInput {
  title: string;
  description: string;
  category?: string;
  priceAmount: number;
  currency?: string;
  priceUnit?: string;
  deliveryDays?: number;
}

export async function createService(userId: string, input: ServiceInput) {
  const talentProfileId = await resolveTalentProfileId(userId);
  return db.talentService.create({
    data: {
      talentProfileId,
      title: input.title,
      description: input.description,
      category: input.category ?? null,
      priceAmount: input.priceAmount,
      currency: input.currency ?? "XAF",
      priceUnit: input.priceUnit ?? "FORFAIT",
      deliveryDays: input.deliveryDays ?? null,
    },
  });
}

/** Mise à jour — réservée au propriétaire (vérifié par le profil). */
export async function updateService(userId: string, serviceId: string, patch: Partial<ServiceInput>) {
  const talentProfileId = await resolveTalentProfileId(userId);
  const svc = await db.talentService.findUniqueOrThrow({ where: { id: serviceId }, select: { talentProfileId: true } });
  if (svc.talentProfileId !== talentProfileId) throw new Error("Service non possédé par cet utilisateur.");
  return db.talentService.update({
    where: { id: serviceId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.priceAmount !== undefined ? { priceAmount: patch.priceAmount } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.priceUnit !== undefined ? { priceUnit: patch.priceUnit } : {}),
      ...(patch.deliveryDays !== undefined ? { deliveryDays: patch.deliveryDays } : {}),
    },
  });
}

export async function toggleService(userId: string, serviceId: string, active: boolean) {
  const talentProfileId = await resolveTalentProfileId(userId);
  const svc = await db.talentService.findUniqueOrThrow({ where: { id: serviceId }, select: { talentProfileId: true } });
  if (svc.talentProfileId !== talentProfileId) throw new Error("Service non possédé par cet utilisateur.");
  return db.talentService.update({ where: { id: serviceId }, data: { active } });
}

/** Catalogue public des gigs actifs (browse marketplace). */
export async function listPublicServices(opts?: { category?: string; limit?: number }) {
  return db.talentService.findMany({
    where: { active: true, ...(opts?.category ? { category: opts.category } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
    include: { talentProfile: { select: { displayName: true, tier: true } } },
  });
}

export async function listMyServices(userId: string) {
  const talentProfileId = await resolveTalentProfileId(userId);
  return db.talentService.findMany({ where: { talentProfileId }, orderBy: { createdAt: "desc" } });
}
