/**
 * Seed UPgraders — DEUX ADVE distincts sous le client « UPgraders » :
 *
 *   1. UPgraders (marque OMBRELLE / société) — nomMarque « UPgraders », nature
 *      SERVICE. Canon : `upgraders-canon.ts`. C'est la face « société qui vend ».
 *   2. La Fusée — Industry OS (marque PRODUIT) — nomMarque « La Fusée », nature
 *      PLATFORM. Canon : `lafusee-canon.ts`. C'est le produit opéré.
 *
 * Décision opérateur 2026-06-24 : séparer proprement société et produit
 * (avant, un seul ADVE affichait « La Fusée » comme nom de business sous le
 * label UPgraders — confusion KB UPGRADERS-LAFUSEE-KB). Les deux stratégies
 * cohabitent sous le même client « UPgraders » (la société possède ses marques).
 *
 * Idempotent : upsert par (strategyId, key). Appelé par prisma/seed.ts.
 * Inclut le compte opérateur NEFER (full admin — chantier 7 validation UX).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertPillarConforms } from "@/lib/types/pillar-conformance";
import type { PillarKey } from "@/lib/types/pillar-schemas";
import {
  UPGRADERS_CANON_PILLARS,
  UPGRADERS_STRATEGY_NAME,
  UPGRADERS_BUSINESS_CONTEXT,
} from "@/server/services/canon/upgraders-canon";
import {
  LAFUSEE_CANON_PILLARS,
  LAFUSEE_STRATEGY_NAME,
  LAFUSEE_BUSINESS_CONTEXT,
} from "@/server/services/canon/lafusee-canon";

const SALT_ROUNDS = 12;

interface SeedStrategyArgs {
  prisma: PrismaClient;
  clientId: string;
  ownerId: string;
  operatorId: string;
  name: string;
  description: string;
  brandNature: "SERVICE" | "PLATFORM";
  businessContext: Record<string, unknown>;
  pillars: ReadonlyArray<{ key: string; content: unknown; confidence: number }>;
}

/** Seed une stratégie + ses 8 piliers (VALIDATED) + score calculé. Idempotent. */
async function seedStrategyFromCanon(args: SeedStrategyArgs): Promise<void> {
  const { prisma, clientId, ownerId, operatorId, name, description, brandNature, businessContext, pillars } = args;

  let strategy = await prisma.strategy.findFirst({ where: { operatorId, name } });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name,
        description,
        status: "ACTIVE",
        brandNature: brandNature as never,
        clientId,
        userId: ownerId,
        operatorId,
        businessContext: businessContext as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`[OK] Strategy: ${strategy.name} (${strategy.id})`);

  for (const p of pillars) {
    // Gate anti-corruption (ADR-0172) — S inclus (formes computed héritées désormais
    // couvertes par unions ; corrige F3 de la revue adversariale : plus de S corrompu VALIDATED).
    assertPillarConforms(p.key.toUpperCase() as PillarKey, p.content, `${name}/${p.key}`);
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
    const existingVersion = await prisma.pillarVersion.findFirst({ where: { pillarId: pillar.id, version: 1 } });
    if (!existingVersion) {
      await prisma.pillarVersion.create({
        data: {
          pillarId: pillar.id,
          version: 1,
          content: p.content as Prisma.InputJsonValue,
          author: "seed",
          reason: `Seed ${name} — ADVERTIS 100 %`,
        },
      });
    }
  }
  console.log(`[OK] ${name} : 8 piliers ADVE/RTIS seedés (contrats COMPLETE couverts)`);

  // Score CALCULÉ (jamais déclaré — Loi 1) + pilier vector matérialisé.
  try {
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    const vector = await scoreObject("strategy", strategy.id);
    await prisma.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: "vector" } },
      update: { content: vector as unknown as Prisma.InputJsonValue },
      create: { strategyId: strategy.id, key: "vector", content: vector as unknown as Prisma.InputJsonValue, validationStatus: "VALIDATED" },
    });
    console.log(`[OK] ${name} : score calculé ${vector.composite}/200 (pilier vector matérialisé)`);
  } catch (err) {
    console.warn(`[seed-upgraders] scoring post-seed échoué pour ${name} (non bloquant):`, err instanceof Error ? err.message : err);
  }
}

// ── Entrée principale ──────────────────────────────────────────────────

export async function seedUpgraders(prisma: PrismaClient): Promise<void> {
  const operator = await prisma.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("Operator 'upgraders' must be seeded before seedUpgraders()");

  // ── Compte NEFER — opérateur expert full admin (chantier 7) ──
  const nefer = await prisma.user.upsert({
    where: { email: "nefer@upgraders.io" },
    update: { role: "ADMIN", operatorId: operator.id },
    create: {
      name: "NEFER",
      email: "nefer@upgraders.io",
      hashedPassword: await bcrypt.hash("imm0rtel", SALT_ROUNDS),
      role: "ADMIN",
      operatorId: operator.id,
    },
  });
  console.log(`[OK] User NEFER (full admin): ${nefer.email}`);

  // ── Client UPgraders (la société qui possède ses marques) ──
  let client = await prisma.client.findFirst({ where: { operatorId: operator.id, name: "UPgraders" } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "UPgraders",
        sector: "Agence-opérateur de marque / Industry OS",
        country: "CM",
        contactName: "Alexandre Djengue",
        contactEmail: "alexandre@upgraders.com",
        operatorId: operator.id,
      },
    });
  }

  // ── 1. ADVE OMBRELLE — UPgraders (société) ──
  await seedStrategyFromCanon({
    prisma,
    clientId: client.id,
    ownerId: nefer.id,
    operatorId: operator.id,
    name: UPGRADERS_STRATEGY_NAME,
    description:
      "ADVE de la marque ombrelle UPgraders — la société/agence-opérateur qui construit et opère La Fusée + Argos (séparation société ≠ produit, décision 2026-06-24).",
    brandNature: "SERVICE",
    businessContext: UPGRADERS_BUSINESS_CONTEXT,
    pillars: UPGRADERS_CANON_PILLARS,
  });

  // ── 2. ADVE PRODUIT — La Fusée (Industry OS) ──
  await seedStrategyFromCanon({
    prisma,
    clientId: client.id,
    ownerId: nefer.id,
    operatorId: operator.id,
    name: LAFUSEE_STRATEGY_NAME,
    description:
      "ADVE de la marque-produit La Fusée — l'Industry OS construit et opéré par UPgraders (dogfooding intégral).",
    brandNature: "PLATFORM",
    businessContext: LAFUSEE_BUSINESS_CONTEXT,
    pillars: LAFUSEE_CANON_PILLARS,
  });
}
