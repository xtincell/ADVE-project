export const dynamic = "force-dynamic";
export const maxDuration = 120;
/**
 * POST /api/admin/seed-brands — exécute les seeds de marques de test
 * (Motion19 complet + vault + guilde/Maximus + Xtincell sourcé) depuis la
 * console, SANS SSH (réponse au blocage opérateur du 12/07 : « le logo ne
 * s'affiche pas » ← le seed prod n'avait jamais tourné faute d'accès shell).
 *
 * ADMIN uniquement (session god-mode). Idempotent — les seeds upsert.
 * Écritures = données de marque de test + comptes de démo ; pas une mutation
 * métier d'une marque cliente réelle (précédent : scripts prisma/seed-*).
 */
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

// Sérialise les exécutions concurrentes (audit adversarial 2026-07-22) : le
// patch GLOBAL de `console.log` ci-dessous n'est pas ré-entrant — deux appels
// simultanés interleavaient leurs captures et, pire, le `finally` de l'un
// pouvait restaurer `console.log` vers le patch de l'autre (fuite mémoire +
// double-log permanents). Un seed en cours ⇒ 409, jamais de patch imbriqué.
let seedRunning = false;

export async function POST(request: Request) {
  // Deux voies d'autorisation, même privilège : (1) session ADMIN (bouton
  // console) ; (2) bearer CRON_SECRET (déclenchement serveur-à-serveur /
  // ops, même niveau de confiance que le cron). L'une OU l'autre suffit.
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const isCron = verifyCronSecret(request);
  if (!isAdmin && !isCron) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs (session ADMIN ou bearer CRON_SECRET)" },
      { status: 403 },
    );
  }

  if (seedRunning) {
    return NextResponse.json(
      { ok: false, error: "Un seed est déjà en cours — réessayez dans un instant." },
      { status: 409 },
    );
  }
  seedRunning = true;

  const log: string[] = [];
  const capture = (line: string) => log.push(line);
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    capture(args.map(String).join(" "));
    origLog(...args);
  };

  // `?only=spawt|motion19|xtincell` cible UNE marque (utile pour re-seeder
  // SPAWT seul sans retoucher les autres). Absent → toutes les marques de démo.
  const only = new URL(request.url).searchParams.get("only");

  try {
    const prisma = db;

    // ── Tunnel de DIAGNOSTIC (lecture seule) — voir l'état réel du vault sans
    // être « coincé dehors ». `?diag=spawt` ou `?diag=<strategyId>`. Renvoie,
    // pour chaque stratégie correspondante : actifs par kind+state, nb de
    // campagnes, nb de piliers. Aucune écriture.
    const diag = new URL(request.url).searchParams.get("diag");
    if (diag) {
      const sid = diag === "spawt" ? "spawt-strategy" : diag;
      const strategies = await prisma.strategy.findMany({
        where: { OR: [{ id: sid }, { name: { contains: diag === "spawt" ? "spawt" : diag, mode: "insensitive" } }] },
        select: { id: true, name: true, userId: true, countryCode: true, businessContext: true },
      });
      const report = [];
      for (const s of strategies) {
        const ctx = (s.businessContext ?? {}) as Record<string, unknown>;
        const [assetsByKind, campaigns, pillars, campaignList, missionList] = await Promise.all([
          prisma.brandAsset.groupBy({ by: ["kind", "state"], where: { strategyId: s.id }, _count: { _all: true } }),
          prisma.campaign.count({ where: { strategyId: s.id } }),
          prisma.pillar.count({ where: { strategyId: s.id } }),
          // Détail campagnes + missions (générique) — nécessaire pour piloter un
          // reparentage/réconciliation par le tunnel `?op=patch` (on a besoin des ids).
          prisma.campaign.findMany({
            where: { strategyId: s.id },
            select: { id: true, name: true, canonType: true, routeKey: true, state: true, status: true },
            orderBy: { createdAt: "asc" },
          }),
          prisma.mission.findMany({
            where: { strategyId: s.id },
            select: { id: true, title: true, status: true, campaignId: true, priority: true },
            orderBy: { priority: "asc" },
          }),
        ]);
        report.push({
          id: s.id,
          name: s.name,
          userId: s.userId,
          countryCode: s.countryCode,
          sector: typeof ctx.sector === "string" ? ctx.sector : null,
          campaigns,
          pillars,
          assets: assetsByKind.map((a) => ({ kind: a.kind, state: a.state, n: a._count._all })),
          campaignList,
          missionList,
        });
      }
      return NextResponse.json({ ok: true, diag: sid, strategyCount: report.length, strategies: report });
    }

    // ── Tunnel de RE-PARENTAGE — un doublon de stratégie a été créé (le seed a
    // écrit sur "spawt-strategy" alors que la marque vit sur "spawt-strategy-001").
    // `?reparent=<fromId>&to=<toId>` déplace campagnes + actions de la marque du
    // doublon vers la vraie stratégie (les actifs d'identité sont RE-CRÉÉS via
    // `?only=spawt-assets&target=<toId>`, pas déplacés, pour prendre le canon à jour).
    const reparentFrom = new URL(request.url).searchParams.get("reparent");
    if (reparentFrom) {
      const to = new URL(request.url).searchParams.get("to");
      if (!to) {
        return NextResponse.json({ ok: false, error: "reparent requires &to=<strategyId>" }, { status: 400 });
      }
      const [campaigns, actions] = await Promise.all([
        prisma.campaign.updateMany({ where: { strategyId: reparentFrom }, data: { strategyId: to } }),
        prisma.brandAction.updateMany({ where: { strategyId: reparentFrom }, data: { strategyId: to } }),
      ]);
      return NextResponse.json({
        ok: true,
        reparent: { from: reparentFrom, to, campaigns: campaigns.count, actions: actions.count },
      });
    }

    // ── Tunnel DATA-OPS GÉNÉRAL (`?op=patch`, corps JSON POST) — éditer les
    // données SANS redéploiement. Réutilisable pour toujours : campagnes,
    // actions/tâches (BrandAction), stratégie (businessContext). Champs
    // WHITELISTÉS. C'est le « clé en main » de la modif de données via agent
    // distant — le tunnel EST l'interface data-ops (à exposer aussi en tool MCP).
    const op = new URL(request.url).searchParams.get("op");
    if (op === "patch") {
      const body = (await request.json().catch(() => ({}))) as {
        campaigns?: Array<{ id: string; data: Record<string, unknown> }>;
        archiveCampaigns?: string[];
        actions?: Array<{ where: { id?: string; strategyId?: string; sourceInitiativeId?: string }; data: Record<string, unknown> }>;
        missions?: Array<{ id: string; data: Record<string, unknown> }>;
        strategies?: Array<{ id: string; mergeBusinessContext?: Record<string, unknown>; data?: Record<string, unknown> }>;
      };
      const result: Record<string, unknown> = {};
      const CAMPAIGN_FIELDS = new Set(["name", "code", "state", "status", "budget", "budgetCurrency", "startDate", "endDate", "objectives", "canonType", "routeKey"]);
      const ACTION_FIELDS = new Set(["title", "description", "timingStart", "timingEnd", "status", "touchpoint", "campaignId", "source", "selected", "metadata"]);
      const MISSION_FIELDS = new Set(["campaignId", "status", "title", "description", "priority", "briefData", "slaDeadline", "budget"]);
      const DATE_FIELDS = new Set(["startDate", "endDate", "timingStart", "timingEnd", "slaDeadline"]);
      const coerce = (obj: Record<string, unknown>, allowed: Set<string>) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj ?? {})) {
          if (!allowed.has(k)) continue;
          out[k] = DATE_FIELDS.has(k) && typeof v === "string" ? new Date(v) : v;
        }
        return out;
      };

      if (Array.isArray(body.campaigns)) {
        const updated: string[] = [];
        for (const c of body.campaigns) {
          if (!c?.id) continue;
          const data = coerce(c.data ?? {}, CAMPAIGN_FIELDS);
          if (Object.keys(data).length) {
            await prisma.campaign.update({ where: { id: c.id }, data: data as Prisma.CampaignUpdateInput });
            updated.push(c.id);
          }
        }
        result.campaignsUpdated = updated;
      }
      if (Array.isArray(body.archiveCampaigns) && body.archiveCampaigns.length) {
        const r = await prisma.campaign.updateMany({ where: { id: { in: body.archiveCampaigns } }, data: { state: "ARCHIVED", status: "ARCHIVED" } });
        result.campaignsArchived = r.count;
      }
      if (Array.isArray(body.actions)) {
        let upserted = 0;
        for (const a of body.actions) {
          const data = coerce(a?.data ?? {}, ACTION_FIELDS);
          if (a?.where?.id) {
            await prisma.brandAction.update({ where: { id: a.where.id }, data: data as Prisma.BrandActionUpdateInput });
          } else if (a?.where?.strategyId && a?.where?.sourceInitiativeId) {
            const existing = await prisma.brandAction.findFirst({
              where: { strategyId: a.where.strategyId, sourceInitiativeId: a.where.sourceInitiativeId },
              select: { id: true },
            });
            if (existing) {
              await prisma.brandAction.update({ where: { id: existing.id }, data: data as Prisma.BrandActionUpdateInput });
            } else {
              await prisma.brandAction.create({
                data: { strategyId: a.where.strategyId, sourceInitiativeId: a.where.sourceInitiativeId, ...data } as unknown as Prisma.BrandActionUncheckedCreateInput,
              });
            }
          } else continue;
          upserted++;
        }
        result.actionsUpserted = upserted;
      }
      if (Array.isArray(body.missions)) {
        // Reparentage / édition de Mission (le tunnel campagnes/actions ne couvrait
        // pas les missions). Générique : campaignId/status/title/briefData/…
        const updated: string[] = [];
        for (const m of body.missions) {
          if (!m?.id) continue;
          const data = coerce(m.data ?? {}, MISSION_FIELDS);
          if (Object.keys(data).length) {
            await prisma.mission.update({ where: { id: m.id }, data: data as Prisma.MissionUpdateInput });
            updated.push(m.id);
          }
        }
        result.missionsUpdated = updated;
      }
      if (Array.isArray(body.strategies)) {
        const STRAT_FIELDS = new Set(["name", "countryCode", "publicSlug"]);
        const touched: string[] = [];
        for (const s of body.strategies) {
          if (!s?.id) continue;
          const data: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(s.data ?? {})) if (STRAT_FIELDS.has(k)) data[k] = v;
          if (s.mergeBusinessContext) {
            const cur = await prisma.strategy.findUnique({ where: { id: s.id }, select: { businessContext: true } });
            data.businessContext = { ...((cur?.businessContext ?? {}) as Record<string, unknown>), ...s.mergeBusinessContext };
          }
          if (Object.keys(data).length) {
            await prisma.strategy.update({ where: { id: s.id }, data: data as Prisma.StrategyUpdateInput });
            touched.push(s.id);
          }
        }
        result.strategiesUpdated = touched;
      }
      return NextResponse.json({ ok: true, op: "patch", ...result });
    }

    if (!only || only === "motion19") {
      const { seedMotion19, seedMotion19BrandVault, seedMotion19Guild } = await import(
        "../../../../../prisma/seed-motion19"
      );
      await seedMotion19(prisma);
      await seedMotion19BrandVault(prisma);
      await seedMotion19Guild(prisma);
    }
    if (!only || only === "xtincell") {
      const { seedXtincell } = await import("../../../../../prisma/seed-xtincell");
      await seedXtincell(prisma);
    }
    if (!only || only === "spawt") {
      // Seed SPAWT exécuté DANS le runtime de l'app (client injecté) — pas de
      // `tsx`, pas de terminal. Rendu importable 2026-07-14 (feed veille vide).
      const { seedSpawtComplete } = await import("../../../../../scripts/seed-spawt-complete");
      await seedSpawtComplete(prisma);
      // Assets visuels du coffre (logos/mascottes/palette) — APRÈS le complete
      // (a besoin de la strategy `spawt-strategy`). Dégradation honnête si
      // public/brand/spawt n'est pas lisible au runtime standalone.
      const { seedSpawtAssets } = await import("../../../../../scripts/seed-spawt-assets");
      const a = await seedSpawtAssets(prisma);
      capture(`assets SPAWT : ${a.created} créé(s), ${a.skipped} présent(s)${a.note ? ` — ${a.note}` : ""}`);
      // GTM v2 (campagne canon LIVE + calendrier 14 slides + jalons) — importé
      // ici pour que les campagnes remontent en prod (idempotent : upsert par
      // canonType+routeKey). Répond à « importer des campagnes » sans SSH.
      const { seedSpawtGtm } = await import("../../../../../scripts/seed-spawt-gtm");
      await seedSpawtGtm();
      capture("GTM SPAWT v2 : campagne canon LIVE + calendrier importés");
    }
    if (only === "spawt-assets") {
      // Assets seuls (strategy déjà seedée) — utile pour rejouer le coffre OU
      // pour viser la VRAIE stratégie via `&target=<id>` (cas doublon).
      const target = new URL(request.url).searchParams.get("target") ?? undefined;
      const { seedSpawtAssets } = await import("../../../../../scripts/seed-spawt-assets");
      const a = await seedSpawtAssets(prisma, target);
      capture(`assets SPAWT (${target ?? "spawt-strategy"}) : ${a.created} créé(s), ${a.skipped} présent(s)${a.note ? ` — ${a.note}` : ""}`);
    }
    return NextResponse.json({ ok: true, only: only ?? "all", log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, log, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    console.log = origLog;
    seedRunning = false;
  }
}
