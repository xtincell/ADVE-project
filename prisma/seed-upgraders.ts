/**
 * Seed UPgraders — la stratégie « La Fusée » de l'agence elle-même, ADVE 100 %.
 *
 * Méta-isomorphisme assumé (Cahier des charges Ch.7 §7.3) : UPgraders se
 * pilote comme une marque, dogfooding intégral. Chaque champ des contrats de
 * maturité COMPLETE (A/D/V/E) est rempli avec le contenu canon du corpus
 * blueprint (Livre de la Fusée + Livre de Bord + Cahier des charges détaillé).
 * RTIS seedé en dérivés cohérents (comme le seed Cimencam).
 *
 * Idempotent : upsert par (strategyId, key). Appelé par prisma/seed.ts.
 * Inclut le compte opérateur NEFER (full admin — chantier 7 validation UX).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  UPGRADERS_CANON_PILLARS,
  UPGRADERS_STRATEGY_NAME,
  UPGRADERS_BUSINESS_CONTEXT,
} from "@/server/services/canon/upgraders-canon";

const SALT_ROUNDS = 12;

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

  // ── Client + Strategy UPgraders (méta-isomorphisme) ──
  let client = await prisma.client.findFirst({
    where: { operatorId: operator.id, name: "UPgraders" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "UPgraders",
        sector: "Industry OS / Marketing technologique",
        country: "CM",
        contactName: "Alexandre Djengue",
        contactEmail: "alexandre@upgraders.com",
        operatorId: operator.id,
      },
    });
  }

  let strategy = await prisma.strategy.findFirst({
    where: { operatorId: operator.id, name: UPGRADERS_STRATEGY_NAME },
  });
  if (!strategy) {
    strategy = await prisma.strategy.create({
      data: {
        name: UPGRADERS_STRATEGY_NAME,
        description:
          "La stratégie de marque d'UPgraders elle-même — dogfooding intégral (méta-isomorphisme, Cahier des charges Ch.7 §7.3).",
        status: "ACTIVE",
        clientId: client.id,
        userId: nefer.id,
        operatorId: operator.id,
        businessContext: UPGRADERS_BUSINESS_CONTEXT as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`[OK] Strategy UPgraders: ${strategy.name} (${strategy.id})`);

  // ── 8 piliers — canon partagé (source unique, cf. canon/upgraders-canon.ts) ──
  const pillars = UPGRADERS_CANON_PILLARS;

  for (const p of pillars) {
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
    const existingVersion = await prisma.pillarVersion.findFirst({
      where: { pillarId: pillar.id, version: 1 },
    });
    if (!existingVersion) {
      await prisma.pillarVersion.create({
        data: {
          pillarId: pillar.id,
          version: 1,
          content: p.content as Prisma.InputJsonValue,
          author: "seed",
          reason: "Seed UPgraders — ADVERTIS 100 % (méta-isomorphisme)",
        },
      });
    }
  }
  console.log("[OK] UPgraders : 8 piliers ADVE/RTIS seedés (contrats COMPLETE couverts)");

  // ── Score initial CALCULÉ (jamais déclaré — Loi 1). scoreObject persiste
  // Strategy.advertis_vector ; on matérialise aussi le pilier « vector » que
  // l'assemblage Oracle lit (parité avec le seed Cimencam).
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
    console.log(`[OK] UPgraders : score calculé ${vector.composite}/200 (pilier vector matérialisé)`);
  } catch (err) {
    console.warn("[seed-upgraders] scoring post-seed échoué (non bloquant):", err instanceof Error ? err.message : err);
  }
}
