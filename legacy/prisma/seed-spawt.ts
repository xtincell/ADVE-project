/**
 * Seed SPAWT — la stratégie « SPAWT — La carte du bon goût », ADVE 100 %.
 *
 * SPAWT est un compagnon de découverte culinaire communautaire pour Abidjan
 * (Côte d'Ivoire), client d'UPgraders. Le noyau ADVE (A/D/V/E) est rempli champ
 * par champ depuis le corpus client (Brandbook v2, Présentation Top Management
 * Février 2026, GTM v3, Rapport Mission 1 Abidjan). R/T/I sont seedés en
 * dérivés cohérents.
 *
 * S est GÉNÉRÉ : son bloc `computed` est recalculé au seed par computePillarS()
 * (pur, ADR-0088/0089) à partir de I + R + T — « le S se remplit » réellement,
 * pas à la main. Les parties narratives de S (roadmap, sprint, overton) sont
 * curées par l'opérateur (regénérables par la cascade SYNTHESIZE_S).
 *
 * Idempotent : upsert par (strategyId, key). Appelé par prisma/seed.ts.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  SPAWT_CANON_PILLARS,
  SPAWT_STRATEGY_NAME,
  SPAWT_BUSINESS_CONTEXT,
  PILLAR_S,
} from "@/server/services/canon/spawt-canon";

export async function seedSpawt(prisma: PrismaClient): Promise<void> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedSpawt()");

  // Opérateur de rattachement : premier ADMIN de l'opérateur (fallback any user).
  const owner =
    (await prisma.user.findFirst({ where: { operatorId: operator.id, role: "ADMIN" } })) ??
    (await prisma.user.findFirst({ where: { operatorId: operator.id } }));
  if (!owner) throw new Error("No user found for operator 'upgraders' — seed users first");

  // ── Client SPAWT ──
  let client = await prisma.client.findFirst({
    where: { operatorId: operator.id, name: "SPAWT" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "SPAWT",
        sector: "FoodTech / Découverte culinaire communautaire",
        country: "CI",
        contactName: "Stéphanie Bidje",
        operatorId: operator.id,
      },
    });
  }

  // ── Strategy SPAWT ──
  let strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: SPAWT_STRATEGY_NAME },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: SPAWT_STRATEGY_NAME,
        description:
          "Compagnon de découverte culinaire communautaire pour Abidjan — ADVE 100 %, RTIS dérivés, S généré par la cascade.",
        status: "ACTIVE",
        clientId: client.id,
        userId: owner.id,
        operatorId: operator.id,
        brandNature: "PLATFORM",
        countryCode: "CI",
        businessContext: SPAWT_BUSINESS_CONTEXT as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`[OK] Strategy SPAWT: ${strategy.name} (${strategy.id})`);

  // ── A → I : upsert canon (la base sur laquelle S se calcule) ──
  for (const p of SPAWT_CANON_PILLARS) {
    if (p.key === "s") continue; // S recalculé ci-dessous
    const pillar = await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: p.key } },
      update: { content: p.content as Prisma.InputJsonValue, confidence: p.confidence, validationStatus: "VALIDATED" },
      create: {
        strategyId: strategy.id,
        key: p.key,
        content: p.content as Prisma.InputJsonValue,
        confidence: p.confidence,
        validationStatus: "VALIDATED",
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
          reason: "Seed SPAWT — ADVE 100 % + RTI dérivés",
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
  const v = pillars.v as Record<string, unknown> | null;
  const ue = (v?.unitEconomics ?? {}) as Record<string, unknown>;
  const computed = computePillarS(pillars, {
    roadmap: PILLAR_S.roadmap as unknown as unknown[],
    baseRevenue: typeof ue.caVise === "number" ? (ue.caVise as number) : undefined,
  });

  const sContent = { ...PILLAR_S, computed } as unknown as Prisma.InputJsonValue;
  const sPillar = await prisma.pillar.upsert({
    where: { strategyId_key: { strategyId: strategy.id, key: "s" } },
    update: { content: sContent, confidence: 0.84, validationStatus: "VALIDATED" },
    create: { strategyId: strategy.id, key: "s", content: sContent, confidence: 0.84, validationStatus: "VALIDATED" },
  });
  const existingS = await prisma.pillarVersion.findFirst({ where: { pillarId: sPillar.id, version: 1 } });
  if (!existingS) {
    await prisma.pillarVersion.create({
      data: { pillarId: sPillar.id, version: 1, content: sContent, author: "seed", reason: "Seed SPAWT — S synthétisé (computed pur ADR-0088/0089)" },
    });
  }
  console.log("[OK] SPAWT : 8 piliers seedés (ADVE 100 % + RTI dérivés + S généré)");

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
    console.log(`[OK] SPAWT : score calculé ${vector.composite}/200 (pilier vector matérialisé)`);
  } catch (err) {
    console.warn("[seed-spawt] scoring post-seed échoué (non bloquant):", err instanceof Error ? err.message : err);
  }

  // ── Sources : alimente la section Sources + le vault d'enrichissement ──
  try {
    const { seedSpawtSources } = await import("./seed-spawt-sources");
    await seedSpawtSources(prisma, strategy.id);
  } catch (err) {
    console.warn("[seed-spawt] seed des sources échoué (non bloquant):", err instanceof Error ? err.message : err);
  }
}
