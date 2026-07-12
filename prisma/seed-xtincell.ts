/**
 * Seed XTINCELL — marque PERSONNELLE d'Alexandre Djengue (xtincell@gmail.com).
 *
 * Correction opérateur 2026-07-12 : « xtincell.powerupgraders.com existe
 * déjà. Je te le donnais pour que tu sources mon ADVERTIS depuis là-bas. »
 * → l'ADVE ci-dessous est EXTRAIT de sa page personnelle officielle
 * (https://xtincell.powerupgraders.com, VER 15.0 — 2026, lue le 12/07/2026).
 * Certitude : DECLARED — c'est la déclaration publique du porteur lui-même.
 * Rien d'inventé : chaque champ correspond à un contenu de la page.
 *
 * Byproduct La Fusée : page publique en SOUS-PAGE /b/xtincell (jamais de
 * sous-domaine — doctrine domaines corrigée le même jour).
 *
 * Idempotent : upsert par publicSlug / (userId, name).
 */

import type { PrismaClient, Prisma } from "@prisma/client";

const SOURCE = "https://xtincell.powerupgraders.com (VER 15.0 — 2026, lu le 12/07/2026)";

const PILLAR_A = {
  nomMarque: "Xtincell",
  description:
    "Alexandre Djengue — Brand Architect, Storytelling Consultant, Toolsmith. Directeur artistique formé en télécommunications (profil T-shaped) : chaque marque est traitée comme un système d'exploitation — ADN, signaux, flux, conversion.",
  accroche: "Je ne crée pas de l'art. Je systémise le succès.",
  noyauIdentitaire:
    "L'architecte de marques qui systémise le succès : 15 ans de création, 25+ marques et artistes accompagnés, 21 projets référencés — CEO d'UPgraders (fondée 2017, « La passion pour propulseur ») et DC&A de MATANGA Agency (depuis janv. 2025).",
  valeurs: [
    { value: "Système avant l'esthétique", detail: "chaque pixel sert un KPI" },
    { value: "Extraction d'ADN", detail: "on extrait l'ADN, on n'imite pas" },
    { value: "Transmission", detail: "réseau La Guilde, partenaires nommés, podcast Créapreneur depuis 2018" },
  ],
  competences: [
    "Direction Artistique", "Brand Systems", "Storytelling", "Photographie",
    "AI Workflows", "Méthode ADVE/RTIS", "LaFusée OS",
  ],
  histoire:
    "Télécoms & réseaux → photographe principal et DA d'Universal Music Africa (2016-2022 : Locko, Mimie, Charlotte Dipanda, Singuila, Cysoul) → chef de projet & directeur marketing de Motion19 (2019-2022) → fondateur d'UPgraders et de la méthode ADVE/RTIS, DC&A MATANGA (FrieslandCampina, Ecobank RCA, Cadyst).",
};

const PILLAR_D = {
  positionnement:
    "Brand Architect pour l'Afrique francophone : conseil stratégie + direction créative + exécution (3 pratiques P·01/02/03), basé YDE · DLA · ABJ, disponible en mission de conseil.",
  promesseMaitre: "Je systémise le succès.",
  tonDeVoix: {
    personnalite: ["Ingénieur du récit", "Direct", "Systémique"],
  },
};

const PILLAR_E = {
  touchpoints: [
    { canal: "Site personnel", detail: "xtincell.powerupgraders.com (VER 15.0)" },
    { canal: "Instagram", handle: "@xtincell" },
    { canal: "X", handle: "@xtincell" },
    { canal: "Facebook", handle: "@xtincell" },
    { canal: "Behance", handle: "behance.net/xtincell" },
    { canal: "LinkedIn", handle: "/in/dmalexandre" },
    { canal: "Podcast", detail: "Créapreneur (hebdo, depuis 2018)" },
  ],
  pressMentions: [
    { titre: "Pixels Hunters — portrait", source: "Iwaria", date: "2022-04" },
  ],
};

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
          "Marque personnelle d'Alexandre Djengue (Brand Architect) — ADVE sourcé depuis sa page officielle xtincell.powerupgraders.com (DECLARED). Page publique La Fusée : /b/xtincell.",
        status: "ACTIVE",
        userId: owner.id,
        operatorId: operator?.id ?? null,
        brandNature: "PERSONAL",
        publicSlug: "xtincell",
        countryCode: "CM",
        currencyCode: "XAF",
      },
    });
  } else if (!strategy.publicSlug) {
    strategy = await prisma.strategy.update({
      where: { id: strategy.id },
      data: { publicSlug: "xtincell" },
    });
  }

  // Piliers A/D/E sourcés (DECLARED — page officielle du porteur).
  const pillars: Array<{ key: string; content: object; confidence: number }> = [
    { key: "a", content: PILLAR_A, confidence: 0.75 },
    { key: "d", content: PILLAR_D, confidence: 0.65 },
    { key: "e", content: PILLAR_E, confidence: 0.6 },
  ];
  for (const p of pillars) {
    const existing = await prisma.pillar.findUnique({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      select: { id: true, content: true },
    });
    // On ne rase jamais un pilier déjà travaillé par le porteur : seed
    // uniquement si vide/embryonnaire (≤ 3 clés).
    const keyCount = existing?.content ? Object.keys(existing.content as object).length : 0;
    if (existing && keyCount > 3) continue;
    await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      update: {
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "DRAFT",
      },
      create: {
        strategyId: strategy.id,
        key: p.key,
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "DRAFT",
      },
    });
  }

  // Source au vault : la page officielle (URL, DECLARED).
  const existingSource = await prisma.brandDataSource.findFirst({
    where: { strategyId: strategy.id, origin: "url:xtincell.powerupgraders.com" },
  });
  if (!existingSource) {
    await prisma.brandDataSource.create({
      data: {
        strategyId: strategy.id,
        sourceType: "URL",
        fileName: "Page personnelle officielle — xtincell.powerupgraders.com",
        rawContent: `Source : ${SOURCE}. Identité : Alexandre Djengue (Xtincell), Brand Architect · Storytelling Consultant · Toolsmith. Tagline : « Je ne crée pas de l'art. Je systémise le succès. » CEO UPgraders (2017), DC&A MATANGA Agency (janv. 2025). Bases YDE·DLA·ABJ. 15 ans, 25+ marques, 21 projets (Motion19 2019-2022, Kemcare, UMA 2016-2022, Chococam, Orange Cameroun…). Réseaux @xtincell (IG/X/FB/Behance), LinkedIn /in/dmalexandre. Contacts : +237 694 17 17 99 · +225 05 46 15 64 56 · xtincell@gmail.com. Presse : Iwaria (04/2022), podcast Créapreneur (2018-).`,
        processingStatus: "EXTRACTED",
        certainty: "DECLARED",
        origin: "url:xtincell.powerupgraders.com",
        pillarMapping: { a: true, d: true, e: true } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`[OK] Xtincell : ADVE sourcé depuis la page officielle (DECLARED) — /b/xtincell (${strategy.id})`);
}
