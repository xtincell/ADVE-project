/**
 * Seed MOTION19 — « Motion19 — La Boutique Des Créatifs » (Douala, Cameroun).
 *
 * Marque cliente de TEST opérateur (demande Alexandre, 2026-07-12) : ADVE
 * pré-rempli par NEFER depuis les SOURCES PUBLIQUES uniquement (motion19.com,
 * catalogue Shopify, réseaux sociaux publics, DataReportal 2026 — cf.
 * src/server/services/canon/motion19-canon.ts pour la provenance détaillée).
 *
 * Différences doctrinales vs seed-spawt (corpus client curé) :
 *   - `validationStatus: "DRAFT"` — pré-rempli IA/opérateur-web, PAS validé ;
 *   - `fieldCertainty` posé (INFERRED) sur tous les jugements stratégiques
 *     (doctrine needsHuman — l'opérateur valide puis flippe à DECLARED) ;
 *   - marketScale / addressableAudience / brandFoundedYear laissés NULL :
 *     ce sont les 3 faits DÉCLARÉS par le porteur (jamais auto-écrits) ;
 *   - AUCUNE traction inventée — les compteurs non publiés restent à 0.
 *
 * En plus des piliers : relevés d'audience OBSERVÉS (FollowerSnapshot source
 * MANUAL — FB/IG/TikTok publics du 12/07/2026) + logo officiel (BrandAsset
 * kind LOGO_FINAL, fileUrl CDN du site) → le tableau de bord cockpit affiche
 * l'identité réelle de la marque dès le seed, prête pour la connexion des
 * comptes sociaux par l'opérateur (ADR-0128).
 *
 * Idempotent : upsert par (strategyId, key) / (strategyId, platform, handle) /
 * (strategyId, kind LOGO_FINAL). Exécution : `npm run db:seed:motion19`.
 */

import bcrypt from "bcryptjs";
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  MOTION19_CANON_PILLARS,
  MOTION19_STRATEGY_NAME,
  MOTION19_BUSINESS_CONTEXT,
  MOTION19_FIELD_CERTAINTY,
  MOTION19_SOCIAL_SNAPSHOTS,
  MOTION19_LOGO,
  MOTION19_BRAND_PALETTE,
  MOTION19_TYPOGRAPHY,
  MOTION19_CONTACT,
  MOTION19_BRANDBOOK,
  PILLAR_S,
} from "@/server/services/canon/motion19-canon";
import { guildMissionBriefSchema, slugifyMissionTitle } from "@/lib/types/guild-mission-brief";

export async function seedMotion19(prisma: PrismaClient): Promise<void> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedMotion19()");

  // Opérateur de rattachement : premier ADMIN de l'opérateur (fallback any user).
  const owner =
    (await prisma.user.findFirst({ where: { operatorId: operator.id, role: "ADMIN" } })) ??
    (await prisma.user.findFirst({ where: { operatorId: operator.id } }));
  if (!owner) throw new Error("No user found for operator 'upgraders' — seed users first");

  // ── Client MOTION 19 SARL ──
  let client = await prisma.client.findFirst({
    where: { operatorId: operator.id, name: "Motion19" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "Motion19",
        sector: "Équipement audiovisuel & créateurs",
        country: "CM",
        contactName: "MOTION 19 SARL (direction à documenter)",
        contactEmail: "hello@motion19.com",
        contactPhone: "+237 656 99 99 89",
        notes:
          "Boutique d'équipement photo/vidéo/audio/drone — 1203 Bvd de la Liberté, Akwa Douala. Fiche créée depuis les sources publiques (test opérateur 2026-07-12) ; coordonnées relevées sur motion19.com/pages/contact.",
        operatorId: operator.id,
      },
    });
  }

  // ── Strategy Motion19 ──
  let strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: MOTION19_STRATEGY_NAME },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: MOTION19_STRATEGY_NAME,
        description:
          "Boutique spécialisée de l'équipement audiovisuel à Douala (magasin Akwa + motion19.com) — ADVE pré-rempli depuis les sources publiques, jugements marqués INFERRED, à valider par l'opérateur. Échelle de marché / audience adressable / année de fondation : à DÉCLARER par le porteur (hub Fondation).",
        status: "ACTIVE",
        clientId: client.id,
        userId: owner.id,
        operatorId: operator.id,
        brandNature: "RETAIL_SPACE",
        countryCode: "CM",
        currencyCode: "XAF",
        businessContext: MOTION19_BUSINESS_CONTEXT as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`[OK] Strategy Motion19: ${strategy.name} (${strategy.id})`);

  // ── A → I : upsert canon (DRAFT + fieldCertainty INFERRED sur ADVE) ──
  for (const p of MOTION19_CANON_PILLARS) {
    if (p.key === "s") continue; // S recalculé ci-dessous
    const certainty =
      p.key === "a" || p.key === "d" || p.key === "v" || p.key === "e"
        ? (MOTION19_FIELD_CERTAINTY[p.key] as unknown as Prisma.InputJsonValue)
        : undefined;
    const pillar = await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      update: {
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "DRAFT",
        ...(certainty ? { fieldCertainty: certainty } : {}),
      },
      create: {
        strategyId: strategy.id,
        key: p.key,
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "DRAFT",
        ...(certainty ? { fieldCertainty: certainty } : {}),
      },
    });
    const existing = await prisma.pillarVersion.findFirst({ where: { pillarId: pillar.id, version: 1 } });
    if (!existing) {
      await prisma.pillarVersion.create({
        data: {
          pillarId: pillar.id,
          version: 1,
          content: p.content as Prisma.InputJsonValue,
          author: "seed",
          reason:
            "Seed Motion19 — pré-rempli NEFER depuis sources publiques (12/07/2026), jugements INFERRED à valider par l'opérateur",
        },
      });
    }
  }

  // ── S : génération du bloc `computed` (pur, depuis I + R + T) ──
  const dbPillars = await prisma.pillar.findMany({
    where: { strategyId: strategy.id, key: { in: ["a", "d", "v", "e", "r", "t", "i", "s"] } },
  });
  const pillars: Record<string, Record<string, unknown> | null> = {};
  for (const p of dbPillars) pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;

  const { computePillarS } = await import("@/server/services/rtis-protocols/strategy");
  const computed = computePillarS(pillars, {
    roadmap: PILLAR_S.roadmap as unknown as unknown[],
  });

  const sContent = { ...PILLAR_S, computed } as unknown as Prisma.InputJsonValue;
  const sPillar = await prisma.pillar.upsert({
    where: { strategyId_key: { strategyId: strategy.id, key: "s" } },
    update: { content: sContent, confidence: 0.6, validationStatus: "DRAFT" },
    create: { strategyId: strategy.id, key: "s", content: sContent, confidence: 0.6, validationStatus: "DRAFT" },
  });
  const existingS = await prisma.pillarVersion.findFirst({ where: { pillarId: sPillar.id, version: 1 } });
  if (!existingS) {
    await prisma.pillarVersion.create({
      data: { pillarId: sPillar.id, version: 1, content: sContent, author: "seed", reason: "Seed Motion19 — S synthétisé (computed pur ADR-0088/0089)" },
    });
  }
  console.log("[OK] Motion19 : 8 piliers seedés (ADVE sources publiques + RTI dérivés + S généré) — statut DRAFT");

  // ── Score CALCULÉ (jamais déclaré — Loi 1) + pilier vector matérialisé ──
  try {
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    const vector = await scoreObject("strategy", strategy.id);
    await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: "vector" } },
      update: { content: vector as unknown as Prisma.InputJsonValue },
      create: {
        strategyId: strategy.id,
        key: "vector",
        content: vector as unknown as Prisma.InputJsonValue,
        validationStatus: "VALIDATED",
      },
    });
    console.log(`[OK] Motion19 : score calculé ${vector.composite}/200 (pilier vector matérialisé)`);
  } catch (err) {
    console.warn("[seed-motion19] scoring post-seed échoué (non bloquant):", err instanceof Error ? err.message : err);
  }

  // ── Relevés d'audience OBSERVÉS (source MANUAL, 12/07/2026) ──
  // Idempotence : un relevé (platform, handle, followerCount) identique déjà
  // présent n'est pas re-créé — un re-seed ne fabrique pas de faux historique.
  let snapshotsCreated = 0;
  for (const snap of MOTION19_SOCIAL_SNAPSHOTS) {
    const already = await prisma.followerSnapshot.findFirst({
      where: {
        strategyId: strategy.id,
        platform: snap.platform,
        handle: snap.handle,
        followerCount: snap.followerCount,
        source: "MANUAL",
      },
    });
    if (already) continue;
    await prisma.followerSnapshot.create({
      data: {
        strategyId: strategy.id,
        platform: snap.platform,
        handle: snap.handle,
        followerCount: snap.followerCount,
        source: "MANUAL",
      },
    });
    snapshotsCreated++;
  }
  console.log(`[OK] Motion19 : ${snapshotsCreated} relevé(s) d'audience publics posés (FB 4 252 · IG 1 753 · TikTok 1 308)`);

  // ── Logo officiel (BrandAsset LOGO_FINAL, fileUrl CDN du site) ──
  const existingLogo = await prisma.brandAsset.findFirst({
    where: { strategyId: strategy.id, kind: "LOGO_FINAL" },
  });
  if (!existingLogo) {
    await prisma.brandAsset.create({
      data: {
        strategyId: strategy.id,
        name: MOTION19_LOGO.name,
        kind: "LOGO_FINAL",
        family: "MATERIAL",
        fileUrl: MOTION19_LOGO.fileUrl,
        mimeType: "image/png",
        summary: MOTION19_LOGO.summary,
        state: "ACTIVE",
        pillarSource: "D",
        metadata: {
          provenance: "site officiel motion19.com (CDN Shopify), relevé 12/07/2026",
          colorway: "anthracite + bleu vif, O-objectif",
        } as Prisma.InputJsonValue,
      },
    });
    console.log("[OK] Motion19 : logo officiel posé dans le coffre (LOGO_FINAL, ACTIVE)");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Vague 2 (demande opérateur 2026-07-12) — La Guilde + Maximus
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mission Guilde « Gestion du Digital » (200 000 FCFA/mois) publiée pour la
 * marque EXISTANTE Motion19 + compte freelance Maximus + candidature.
 *
 * Voie canonique reproduite à l'identique de `laguilde.postMission` →
 * `publishMission` (ADR-0098) : la mission est créée DRAFT + guildSubmittedAt
 * + publicSlug dérivé de l'id, brief validé par `guildMissionBriefSchema`
 * AVANT écriture, puis publiée (guildPublished=true) — la décision PUBLISH
 * est celle de l'opérateur (instruction explicite Alexandre 2026-07-12,
 * `postMission` ne prend pas de strategyId : seul le seed peut rattacher la
 * mission à la Strategy Motion19 canon sans dupliquer un shell).
 *
 * Rémunération : `Mission.budget` est un montant UNIQUE (aucune colonne de
 * récurrence, cf. schéma) — la mensualité (200 000 FCFA/mois, renouvelable)
 * est déclarée dans le brief (summary + constraints), pattern guilde.
 *
 * Candidature Maximus : STATUS PENDING — l'opérateur vit la décision réelle
 * dans /console (DECIDE_MISSION_APPLICATION ACCEPTED → assignation). L'accès
 * cockpit délégué de Maximus est accordé séparément (StrategyCollaborator,
 * ADR-0129) — il ne dépend pas de l'acceptation de la candidature.
 *
 * Idempotent : mission par (strategyId, title), user par email, candidature
 * par (missionId, applicantId).
 */
export async function seedMotion19Guild(prisma: PrismaClient): Promise<{
  missionId: string;
  missionSlug: string | null;
  maximusUserId: string;
}> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedMotion19Guild()");

  const strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: MOTION19_STRATEGY_NAME },
    select: { id: true, userId: true },
  });
  if (!strategy) throw new Error("Run seedMotion19() first — Strategy Motion19 introuvable");

  // ── Mission Guilde « Gestion du Digital » ──
  const MISSION_TITLE = "Gestion du Digital — Motion19 (mission mensuelle)";

  const briefData = guildMissionBriefSchema.parse({
    _kind: "GUILD_MISSION_BRIEF",
    brandName: "Motion19",
    brandWebsite: "https://motion19.com",
    summary:
      "Motion19, la boutique des créatifs (équipement photo/vidéo/audio/drone, Douala), cherche son directeur ou sa directrice du digital en mission mensuelle : pilotage des réseaux, du calendrier éditorial et des publications — 200 000 FCFA/mois, renouvelable.",
    context:
      "Motion19 (MOTION 19 SARL, boutique à Akwa Douala + e-commerce motion19.com, 373 produits, 30+ marques officielles) a une offre solide mais une présence digitale sous-exploitée : Facebook 4 252, Instagram 1 753 (1 602 publications), TikTok 1 308, aucune chaîne YouTube alors que le blog Motion19 Academy (guides par budget) existe depuis juin 2026. La mission : prendre la direction du digital — tenir le calendrier éditorial, publier sur tous les réseaux, décliner l'Academy en vidéo, animer #MadeForCreators (mise en avant des créateurs équipés), coordonner avec l'équipe boutique pour les tournages produits, et rendre compte chaque mois (audience, engagement, ventes assistées). Rémunération forfaitaire mensuelle de 200 000 FCFA, premier mois d'essai puis renouvellement tacite.",
    targetAudience:
      "Créateurs de contenu (YouTube/TikTok), vidéastes et photographes professionnels, podcasteurs et streamers, équipes média d'églises et institutions, entreprises B2B (studios, agences, TV) — au Cameroun, français d'abord.",
    deliverables: [
      { title: "Calendrier éditorial mensuel tenu à jour", description: "4 semaines glissantes, validé avec la direction, mis à jour en continu dans le cockpit de la marque." },
      { title: "12 à 16 publications par mois multi-réseaux", description: "Instagram, Facebook, TikTok (+ X) — nouveautés, setups par usage, démos, marronniers saisonniers." },
      { title: "Lancement de la chaîne YouTube Motion19 Academy", description: "Décliner les guides du blog en vidéo (matériel de tournage disponible en boutique)." },
      { title: "Community management sous 24 h ouvrées", description: "Réponses commentaires/DM en cohérence avec la charte de ton (tutoiement TikTok, vouvoiement site)." },
      { title: "Reporting mensuel", description: "Audience par réseau, engagement, ventes assistées par le contenu — livré le 5 de chaque mois." },
    ],
    channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "WEBSITE"],
    skillsRequired: [
      "stratégie éditoriale",
      "community management",
      "création de contenu court (Reels/TikTok)",
      "tournage & montage vidéo de base",
      "programmation et publication multi-réseaux",
      "analytics & reporting",
      "français impeccable",
    ],
    remoteOk: true,
    constraints:
      "Mission mensuelle récurrente — forfait 200 000 FCFA/mois (XAF), premier mois d'essai puis renouvellement tacite. Présence ponctuelle en boutique (1203 Bvd de la Liberté, Akwa Douala) pour les tournages produits. Respect strict de la charte : produits authentiques uniquement, jamais de promesse produit sans validation de la direction, ton chaleureux-pro (tutoiement réseaux courts, vouvoiement site/B2B).",
    qualityCriteria: [
      "Cadence tenue : ≥ 12 publications/mois",
      "Calendrier éditorial à jour chaque semaine",
      "Croissance nette des abonnés cumulés (base 7 313 au 12/07/2026)",
      "Reporting livré le 5 de chaque mois",
    ],
    references: [
      { label: "Site Motion19", url: "https://motion19.com" },
      { label: "Instagram @motion19store", url: "https://www.instagram.com/motion19store/" },
      { label: "TikTok @motion19sarl", url: "https://www.tiktok.com/@motion19sarl" },
    ],
    contactName: "Direction MOTION 19 SARL",
    contactEmail: "hello@motion19.com",
  });

  let mission = await prisma.mission.findFirst({
    where: { strategyId: strategy.id, title: MISSION_TITLE },
  });
  if (!mission) {
    mission = await prisma.mission.create({
      data: {
        title: MISSION_TITLE,
        strategyId: strategy.id,
        mode: "DISPATCH",
        description: briefData.summary,
        status: "DRAFT", // « ouverte » sur le mur = DRAFT + guildPublished + sans assignee
        priority: 3,
        budget: 200000,
        briefData: briefData as unknown as Prisma.InputJsonValue,
        guildPublished: true,
        guildSubmittedAt: new Date(),
        guildPublishedAt: new Date(),
        postedByUserId: strategy.userId,
        sector: "Équipement audiovisuel & créateurs",
        location: "Douala, Cameroun (hybride — boutique Akwa + à distance)",
        category: "CONTENT",
      },
    });
    const slug = slugifyMissionTitle(MISSION_TITLE, mission.id.slice(-6));
    mission = await prisma.mission.update({ where: { id: mission.id }, data: { publicSlug: slug } });
  }
  console.log(`[OK] Guilde : mission « ${MISSION_TITLE} » publiée (slug: ${mission.publicSlug})`);

  // ── Compte freelance Maximus ──
  const MAXIMUS_EMAIL = "maximus@upgraders.io";
  let maximus = await prisma.user.findUnique({ where: { email: MAXIMUS_EMAIL } });
  if (!maximus) {
    maximus = await prisma.user.create({
      data: {
        email: MAXIMUS_EMAIL,
        name: "Maximus",
        role: "FREELANCE",
        hashedPassword: await bcrypt.hash("Maximus2026!", 12),
      },
    });
  }
  await prisma.talentProfile.upsert({
    where: { userId: maximus.id },
    update: {},
    create: {
      userId: maximus.id,
      displayName: "Maximus",
      bio: "Directeur du digital freelance — marques retail & créateurs (Douala). Stratégie éditoriale, calendriers multi-réseaux, contenu court (Reels/TikTok), lancement de chaînes YouTube, reporting orienté ventes. Français natif, à l'aise en boutique comme en remote.",
      skills: [
        "stratégie éditoriale",
        "community management",
        "calendrier éditorial",
        "création de contenu court",
        "YouTube",
        "analytics & reporting",
      ] as unknown as Prisma.InputJsonValue,
      driverSpecialties: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE"] as unknown as Prisma.InputJsonValue,
    },
  });
  const maximusProfile = await prisma.talentProfile.findUnique({ where: { userId: maximus.id }, select: { id: true } });
  console.log(`[OK] Guilde : compte freelance Maximus prêt (${MAXIMUS_EMAIL} / Maximus2026! — à changer à la première connexion)`);

  // ── Candidature de Maximus (PENDING — la décision reste à l'opérateur) ──
  await prisma.missionApplication.upsert({
    where: { missionId_applicantId: { missionId: mission.id, applicantId: maximus.id } },
    update: {},
    create: {
      missionId: mission.id,
      applicantId: maximus.id,
      talentProfileId: maximusProfile?.id ?? null,
      status: "PENDING",
      message:
        "Bonjour Motion19 — votre catalogue mérite une présence à sa hauteur. Ma proposition pour le premier mois : (1) calendrier éditorial 4 semaines aligné sur vos setups par usage et les marronniers, (2) cadence 14 publications/mois IG+FB+TikTok, (3) lancement de la chaîne YouTube Academy avec vos 6 guides existants déclinés en vidéo, (4) reporting le 5 du mois avec ventes assistées trackées. Le forfait de 200 000 FCFA/mois me convient ; disponible pour passer en boutique à Akwa chaque semaine pour les tournages produits.",
      proposedRate: 200000,
      currency: "XAF",
    },
  });
  console.log("[OK] Guilde : candidature Maximus déposée (PENDING — décision opérateur dans /console)");

  // ── Accès délégué : Maximus directeur du digital de Motion19 (ADR-0129) ──
  // Décision opérateur explicite (instruction Alexandre 2026-07-12) — le grant
  // runtime passe par l'Intent gouverné GRANT_STRATEGY_COLLABORATOR ; le seed
  // reproduit son effet (upsert (strategyId, userId), status ACTIVE).
  await prisma.strategyCollaborator.upsert({
    where: { strategyId_userId: { strategyId: strategy.id, userId: maximus.id } },
    update: { role: "SOCIAL_MANAGER", scopes: ["calendar", "publications", "social"] as unknown as Prisma.InputJsonValue, status: "ACTIVE", revokedAt: null, grantedByUserId: strategy.userId },
    create: {
      strategyId: strategy.id,
      userId: maximus.id,
      role: "SOCIAL_MANAGER",
      scopes: ["calendar", "publications", "social"] as unknown as Prisma.InputJsonValue,
      status: "ACTIVE",
      grantedByUserId: strategy.userId,
      note: "Directeur du digital délégué — voir/publier + calendrier éditorial (instruction opérateur 2026-07-12, ADR-0129)",
    },
  });
  console.log("[OK] Accès délégué : Maximus = SOCIAL_MANAGER de Motion19 (écriture : calendrier/publications/réseaux — ADR-0131)");

  return { missionId: mission.id, missionSlug: mission.publicSlug, maximusUserId: maximus.id };
}

/**
 * Vague 3 (brand book fourni 2026-07-12) — le VAULT contient les actifs
 * officiels de la marque, structurés : palette (CHROMATIC_STRATEGY), système
 * typographique (TYPOGRAPHY_SYSTEM), brand book intégral (BrandDataSource
 * certainty OFFICIAL), logo enrichi (monogramme M19), coordonnées officielles.
 * Idempotent (upserts par kind / origin).
 */
export async function seedMotion19BrandVault(prisma: PrismaClient): Promise<void> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedMotion19BrandVault()");
  const strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: MOTION19_STRATEGY_NAME },
    select: { id: true, clientId: true },
  });
  if (!strategy) throw new Error("Run seedMotion19() first — Strategy Motion19 introuvable");

  // ── Palette officielle (actif intellectuel structuré) ──
  const chromatic = await prisma.brandAsset.findFirst({ where: { strategyId: strategy.id, kind: "CHROMATIC_STRATEGY" } });
  if (!chromatic) {
    await prisma.brandAsset.create({
      data: {
        strategyId: strategy.id,
        name: "Palette signature Motion19 (officielle)",
        kind: "CHROMATIC_STRATEGY",
        family: "INTELLECTUAL",
        content: MOTION19_BRAND_PALETTE as unknown as Prisma.InputJsonValue,
        summary: "Bleu #4867B0 (print) · Bleu digital #3384FF (accent écran) · Anthracite #1D1D1D · Gris #B5B5B5 — proportions 62/26/12. Source : Brand Book 2026 V2 §06.",
        state: "ACTIVE",
        pillarSource: "D",
      },
    });
  } else {
    await prisma.brandAsset.update({
      where: { id: chromatic.id },
      data: { content: MOTION19_BRAND_PALETTE as unknown as Prisma.InputJsonValue, state: "ACTIVE" },
    });
  }

  // ── Système typographique officiel ──
  const typo = await prisma.brandAsset.findFirst({ where: { strategyId: strategy.id, kind: "TYPOGRAPHY_SYSTEM" } });
  if (!typo) {
    await prisma.brandAsset.create({
      data: {
        strategyId: strategy.id,
        name: "Système typographique Motion19 (officiel)",
        kind: "TYPOGRAPHY_SYSTEM",
        family: "INTELLECTUAL",
        content: MOTION19_TYPOGRAPHY as unknown as Prisma.InputJsonValue,
        summary: "Exo 2 (titrage, Regular→ExtraBold) + Roboto (texte courant). Source : Brand Book 2026 V2 §06.",
        state: "ACTIVE",
        pillarSource: "D",
      },
    });
  }

  // ── Logo : enrichir le résumé avec le système complet (wordmark + M19) ──
  await prisma.brandAsset.updateMany({
    where: { strategyId: strategy.id, kind: "LOGO_FINAL" },
    data: {
      summary:
        "Système logo officiel (Brand Book §05) : wordmark MOTION19 (le O devient objectif, ligne métier Photo · Vidéo · Audio · Lumière) + monogramme M19 (M en barres verticales — égaliseur et rideau de lumière) pour les usages réduits. Le « 19 » porte toujours le bleu. Fichier : wordmark noir officiel (CDN motion19.com).",
    },
  });

  // ── Brand book intégral au vault des sources (certainty OFFICIAL) ──
  const existingSource = await prisma.brandDataSource.findFirst({
    where: { strategyId: strategy.id, origin: MOTION19_BRANDBOOK.origin },
  });
  if (!existingSource) {
    await prisma.brandDataSource.create({
      data: {
        strategyId: strategy.id,
        sourceType: "FILE",
        fileName: MOTION19_BRANDBOOK.fileName,
        fileType: "PDF",
        rawContent: MOTION19_BRANDBOOK.extractedText,
        processingStatus: "EXTRACTED",
        certainty: "OFFICIAL",
        origin: MOTION19_BRANDBOOK.origin,
        pillarMapping: { a: true, d: true, e: true } as unknown as Prisma.InputJsonValue,
        extractedFields: {
          tagline: "Feel free to create",
          palette: MOTION19_BRAND_PALETTE,
          typographie: MOTION19_TYPOGRAPHY,
          contact: MOTION19_CONTACT,
          reseauxOfficiels: ["Instagram @motion19store", "X @motion19store", "Facebook /motion19store"],
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ── Coordonnées officielles sur la fiche Client (Brand Book §10) ──
  if (strategy.clientId) {
    await prisma.client.update({
      where: { id: strategy.clientId },
      data: {
        contactEmail: MOTION19_CONTACT.email,
        contactPhone: MOTION19_CONTACT.telephones.join(" · "),
        notes:
          "Boutique d'équipement photo/vidéo/audio — " + MOTION19_CONTACT.boutique + " (" + MOTION19_CONTACT.bp + "). Coordonnées OFFICIELLES du Brand Book 2026 V2 §10 ; hello@motion19.com (page contact du site) reste un alias observé. Brand book intégral au vault des sources.",
      },
    });
  }

  console.log("[OK] Vault identité : palette + typo + logo système + brand book (OFFICIAL) + coordonnées officielles");
}
