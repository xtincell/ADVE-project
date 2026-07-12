/**
 * Seed XTINCELL — marque PERSONNELLE d'Alexandre (xtincell@gmail.com),
 * vague « cockpit qui ramène tout » (2026-07-12) : « Crée ma page Xtincell
 * ou mets-la à jour via xtincell.powerupgraders.com. Je ferai les OAuth dans
 * mon compte dans l'onglet prévu à cet effet. »
 *
 * Doctrine : marque personnelle MINIMALE et honnête — brandNature PERSONAL,
 * publicSlug "xtincell", pilier A embryonnaire marqué DRAFT (le porteur
 * complète depuis le cockpit ; rien d'inventé au-delà du factuel public :
 * fondateur d'UPgraders / La Fusée). Les connexions sociales se font PAR LUI
 * via /cockpit/settings/connections (jamais de credentials en seed).
 *
 * Idempotent : upsert par (userId owner + name) / publicSlug.
 */

import type { PrismaClient, Prisma } from "@prisma/client";

export async function seedXtincell(prisma: PrismaClient): Promise<void> {
  const owner = await prisma.user.findUnique({ where: { email: "xtincell@gmail.com" } });
  if (!owner) {
    console.log("[skip] seed-xtincell : compte xtincell@gmail.com absent (login Google requis d'abord)");
    return;
  }
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });

  let strategy = await prisma.strategy.findFirst({
    where: { OR: [{ publicSlug: "xtincell" }, { userId: owner.id, name: "Xtincell" }] },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: "Xtincell",
        description:
          "Marque personnelle d'Alexandre — fondateur d'UPgraders et de La Fusée. Fiche embryonnaire à compléter par le porteur depuis le cockpit (Fondation) ; page publique xtincell.powerupgraders.com.",
        status: "ACTIVE",
        userId: owner.id,
        operatorId: operator?.id ?? null,
        brandNature: "PERSONAL",
        publicSlug: "xtincell",
        countryCode: "CM",
        currencyCode: "XAF",
      },
    });
    // Pilier A embryonnaire (DRAFT — le porteur complète ; rien d'inventé).
    await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: "a" } },
      update: {},
      create: {
        strategyId: strategy.id,
        key: "a",
        content: {
          nomMarque: "Xtincell",
          description: "Fondateur d'UPgraders — l'agence qui opère La Fusée, l'OS des marques africaines.",
          accroche: null,
        } as Prisma.InputJsonValue,
        confidence: 0.1,
        validationStatus: "DRAFT",
      },
    });
    console.log(`[OK] Xtincell : marque personnelle créée (${strategy.id}) — page publique /b/xtincell`);
  } else if (!strategy.publicSlug) {
    await prisma.strategy.update({ where: { id: strategy.id }, data: { publicSlug: "xtincell" } });
    console.log("[OK] Xtincell : publicSlug posé sur la marque existante");
  } else {
    console.log("[OK] Xtincell : marque personnelle déjà en place");
  }
}
