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

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  MOTION19_CANON_PILLARS,
  MOTION19_STRATEGY_NAME,
  MOTION19_BUSINESS_CONTEXT,
  MOTION19_FIELD_CERTAINTY,
  MOTION19_SOCIAL_SNAPSHOTS,
  MOTION19_LOGO,
  PILLAR_S,
} from "@/server/services/canon/motion19-canon";

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
