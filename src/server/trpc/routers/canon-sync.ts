/**
 * Canon Sync Router — pousse le canon UPgraders 100 % dans la base LIVE
 * (Vague 10 — constat opérateur : « l'ADVERTIS d'UPgraders n'est pas
 * complet à 100 % en prod, donc Notoria/R/T/I/S non plus »).
 *
 * Le sync passe par le **Pillar Gateway** (writePillarAndScore — LOI 1 :
 * validation Zod + versioning + score + staleness), jamais d'update brut.
 * Idempotent : re-synchroniser ré-applique le canon et re-score.
 * Crée la stratégie si absente (mêmes invariants que le seed).
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const canonSyncRouter = createTRPCRouter({
  /** État courant : stratégie UPgraders trouvée + complétude par pilier. */
  status: adminProcedure.query(async () => {
    const { UPGRADERS_STRATEGY_NAME } = await import("@/server/services/canon/upgraders-canon");
    const strategy = await db.strategy.findFirst({
      where: { name: UPGRADERS_STRATEGY_NAME },
      select: { id: true, name: true, advertis_vector: true },
    });
    if (!strategy) return { exists: false as const };
    const { getStrategyAdvertisCompletion } = await import("@/server/governance/pillar-readiness");
    const completion = await getStrategyAdvertisCompletion(strategy.id);
    return { exists: true as const, strategyId: strategy.id, completion, vector: strategy.advertis_vector };
  }),

  /**
   * Sync gouverné : upsert stratégie + 8 piliers canon via le Gateway,
   * recalcul du score, matérialisation du pilier vector.
   */
  syncUpgraders: governedProcedure({
    kind: "SYNC_UPGRADERS_CANON",
    requireOperator: true,
    inputSchema: z.object({}),
  }).mutation(async ({ ctx }) => {
    const {
      UPGRADERS_CANON_PILLARS,
      UPGRADERS_STRATEGY_NAME,
      UPGRADERS_BUSINESS_CONTEXT,
    } = await import("@/server/services/canon/upgraders-canon");
    const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
    const { scoreObject } = await import("@/server/services/advertis-scorer");
    const { getStrategyAdvertisCompletion } = await import("@/server/governance/pillar-readiness");
    type PillarKey = Parameters<typeof writePillarAndScore>[0]["pillarKey"];

    // ── 1. Stratégie (création si absente — parité seed) ──
    const operator = await db.operator.findUnique({ where: { slug: "upgraders" } });
    if (!operator) throw new Error("Operator 'upgraders' introuvable — seed de base requis.");

    // FK-safe ownerId : `ctx.session.user.id` provient du JWT NextAuth et peut
    // ne PAS correspondre à une ligne User réelle en prod (id synthétique / DB
    // re-seedée) → violation Strategy_userId_fkey. On résout un User qui existe
    // réellement : session si présente en base, sinon l'admin NEFER de
    // l'operator (upsert pour parité avec le seed), sinon n'importe quel User
    // rattaché à l'operator.
    const sessionUser = ctx.session.user.id
      ? await db.user.findUnique({ where: { id: ctx.session.user.id }, select: { id: true } })
      : null;
    let ownerId = sessionUser?.id ?? null;
    if (!ownerId) {
      const nefer = await db.user.upsert({
        where: { email: "nefer@upgraders.io" },
        update: { role: "ADMIN", operatorId: operator.id },
        create: { name: "NEFER", email: "nefer@upgraders.io", role: "ADMIN", operatorId: operator.id },
        select: { id: true },
      });
      ownerId = nefer.id;
    }

    let strategy = await db.strategy.findFirst({
      where: { name: UPGRADERS_STRATEGY_NAME },
    });
    if (!strategy) {
      let client = await db.client.findFirst({ where: { operatorId: operator.id, name: "UPgraders" } });
      if (!client) {
        client = await db.client.create({
          data: {
            name: "UPgraders",
            sector: UPGRADERS_BUSINESS_CONTEXT.sector,
            country: UPGRADERS_BUSINESS_CONTEXT.country,
            contactName: "Alexandre Djengue",
            contactEmail: "alexandre@upgraders.com",
            operatorId: operator.id,
          },
        });
      }
      strategy = await db.strategy.create({
        data: {
          name: UPGRADERS_STRATEGY_NAME,
          description: "La stratégie de marque d'UPgraders elle-même — dogfooding intégral (méta-isomorphisme).",
          status: "ACTIVE",
          clientId: client.id,
          userId: ownerId,
          operatorId: operator.id,
          businessContext: UPGRADERS_BUSINESS_CONTEXT,
        },
      });
    } else if (!strategy.businessContext) {
      await db.strategy.update({
        where: { id: strategy.id },
        data: { businessContext: UPGRADERS_BUSINESS_CONTEXT },
      });
    }

    // ── 2. Les 8 piliers via le Gateway (LOI 1) ──
    const results: Record<string, { ok: boolean; warnings: number; error?: string }> = {};
    for (const p of UPGRADERS_CANON_PILLARS) {
      const res = await writePillarAndScore({
        strategyId: strategy.id,
        pillarKey: p.key as PillarKey,
        operation: { type: "REPLACE_FULL", content: p.content as Record<string, unknown> },
        author: { system: "OPERATOR", reason: "Sync canon UPgraders (Vague 10 — ADVERTIS 100 %)" },
        options: { targetStatus: "VALIDATED" },
      });
      results[p.key] = { ok: res.success, warnings: res.warnings.length, error: res.error ?? undefined };
    }

    // ── 2-bis. Recompute S.computed depuis le backbone fraîchement écrit ──
    // La voie REPLACE_FULL n'exécute pas computePillarS ; sans ça le S stocké
    // n'a pas de roadmapRoutes → le sélecteur de 3 ambitions disparaît. (Le
    // filet client couvre l'affichage ; ici on persiste les valeurs complètes
    // — budget + initiatives par route.)
    try {
      const { computePillarS } = await import("@/server/services/rtis-protocols/strategy");
      const { PILLAR_STORAGE_KEYS } = await import("@/domain");
      const sPillars = await db.pillar.findMany({
        where: { strategyId: strategy.id, key: { in: [...PILLAR_STORAGE_KEYS] } },
      });
      const pillarMap: Record<string, Record<string, unknown> | null> = {};
      for (const sp of sPillars) pillarMap[sp.key] = (sp.content ?? null) as Record<string, unknown> | null;
      const sContent = (pillarMap.s ?? {}) as Record<string, unknown>;
      const computed = computePillarS(pillarMap, {
        roadmap: Array.isArray(sContent.roadmap) ? (sContent.roadmap as unknown[]) : undefined,
      });
      sContent.computed = computed;
      // Miroir d'affichage : le champ globalBudget (déprécié en saisie ADR-0088)
      // reflète le budget du plan calculé → plus de carte « NaN/— » dans l'éditeur.
      const planBudget = (computed as { totalBudget?: unknown }).totalBudget;
      if (typeof planBudget === "number" && Number.isFinite(planBudget)) sContent.globalBudget = planBudget;
      await db.pillar.update({
        where: { strategyId_key: { strategyId: strategy.id, key: "s" } },
        data: { content: sContent as object },
      });
    } catch {
      // best-effort — le filet client garantit l'affichage du sélecteur.
    }

    // ── 3. Score recalculé + pilier vector matérialisé ──
    const vector = await scoreObject("strategy", strategy.id);
    await db.pillar.upsert({
      where: { strategyId_key: { strategyId: strategy.id, key: "vector" } },
      update: { content: vector as unknown as object },
      create: {
        strategyId: strategy.id,
        key: "vector",
        content: vector as unknown as object,
        validationStatus: "VALIDATED",
      },
    });

    const completion = await getStrategyAdvertisCompletion(strategy.id);
    return {
      strategyId: strategy.id,
      pillars: results,
      composite: vector.composite,
      completion,
    };
  }),
});
