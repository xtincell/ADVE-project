/**
 * ADR-0150 — canon éditable du scoreur (ratification opérateur a posteriori).
 *
 * Résout la jauge + la liste d'items en fusionnant les overrides `ScoreurCanonOverride`
 * (donnée, éditable sans redeploy) PAR-DESSUS les défauts canon en code
 * (`anchors.ts`/`palier.ts`). Les θ des ancres/items vivent sur `BrandRef.fixedTheta`
 * (éditables en place). Single-writer gouverné (SESHAT). 100 % déterministe, zéro LLM.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { MarketScale } from "@/domain/market-scale";
import { MARKET_SCALES } from "@/domain/market-scale";
import {
  GAUGE_BY_SCALE,
  MUST_HAVE_ITEMS,
  type GaugeMap,
  type MustHaveItem,
} from "@/domain/scoreur";
import { BRAND_TIERS } from "@/domain/brand-tier";
import { SCOREUR_ARENAS } from "@/domain/scoreur";

export interface ResolvedCanon {
  gauge: GaugeMap;
  items: MustHaveItem[];
}

const VALID_ITEM_ARENAS = new Set<string>([...SCOREUR_ARENAS, "R", "TENURE"]);
const VALID_TIERS = new Set<string>(BRAND_TIERS.filter((t) => t !== "LATENT"));

/** Résout le canon effectif = défauts code + overrides DB actifs. */
export async function resolveScoreurCanon(): Promise<ResolvedCanon> {
  const overrides = await db.scoreurCanonOverride.findMany({ where: { active: true } });

  // ── Jauge ──────────────────────────────────────────────────────────────────
  const gauge: GaugeMap = { ...GAUGE_BY_SCALE };
  for (const o of overrides) {
    if (o.kind !== "GAUGE") continue;
    if (!MARKET_SCALES.includes(o.key as MarketScale)) continue;
    const d = o.data as { floor?: number; icone?: number } | null;
    if (d && typeof d.floor === "number" && typeof d.icone === "number" && d.icone > d.floor) {
      gauge[o.key as MarketScale] = { floor: d.floor, icone: d.icone };
    }
  }

  // ── Items : override par id, ajout de nouveaux, retrait des inactifs ─────────
  const byId = new Map<string, MustHaveItem & { order: number }>();
  MUST_HAVE_ITEMS.forEach((it, i) => byId.set(it.id, { ...it, order: i }));
  for (const o of overrides) {
    if (o.kind !== "ITEM") continue;
    const d = (o.data ?? {}) as { tier?: string; label?: string; arena?: string; order?: number; removed?: boolean };
    if (d.removed) {
      byId.delete(o.key);
      continue;
    }
    const base = byId.get(o.key);
    const tier = d.tier && VALID_TIERS.has(d.tier) ? d.tier : base?.tier ?? "FRAGILE";
    const arena = d.arena && VALID_ITEM_ARENAS.has(d.arena) ? d.arena : base?.arena ?? "A";
    byId.set(o.key, {
      id: o.key,
      tier: tier as MustHaveItem["tier"],
      label: d.label ?? base?.label ?? o.key,
      arena: arena as MustHaveItem["arena"],
      order: typeof d.order === "number" ? d.order : base?.order ?? 999,
    });
  }
  const items: MustHaveItem[] = [...byId.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...it }) => it);

  return { gauge, items };
}

// ── single-writers (gouvernés) ───────────────────────────────────────────────

/** Upsert d'un override de jauge (par échelle de marché). */
export async function upsertGaugeOverride(input: {
  marketScale: MarketScale;
  floor: number;
  icone: number;
  userId?: string | null;
}) {
  return db.scoreurCanonOverride.upsert({
    where: { kind_key: { kind: "GAUGE", key: input.marketScale } },
    update: { data: { floor: input.floor, icone: input.icone }, active: true, updatedByUserId: input.userId ?? null },
    create: {
      kind: "GAUGE",
      key: input.marketScale,
      data: { floor: input.floor, icone: input.icone },
      updatedByUserId: input.userId ?? null,
    },
  });
}

/** Upsert d'un override d'item (edit/déplacement de palier, ou ajout). */
export async function upsertItemOverride(input: {
  itemId: string;
  tier: string;
  label: string;
  arena: string;
  order?: number;
  userId?: string | null;
}) {
  const data: Prisma.InputJsonValue = {
    tier: input.tier,
    label: input.label,
    arena: input.arena,
    ...(typeof input.order === "number" ? { order: input.order } : {}),
  };
  return db.scoreurCanonOverride.upsert({
    where: { kind_key: { kind: "ITEM", key: input.itemId } },
    update: { data, active: true, updatedByUserId: input.userId ?? null },
    create: { kind: "ITEM", key: input.itemId, data, updatedByUserId: input.userId ?? null },
  });
}

/** Retire un item (override `removed:true` — l'item code par défaut n'existe plus comme porte). */
export async function removeItemOverride(input: { itemId: string; userId?: string | null }) {
  return db.scoreurCanonOverride.upsert({
    where: { kind_key: { kind: "ITEM", key: input.itemId } },
    update: { data: { removed: true }, active: true, updatedByUserId: input.userId ?? null },
    create: { kind: "ITEM", key: input.itemId, data: { removed: true }, updatedByUserId: input.userId ?? null },
  });
}

/** Réinitialise un override (retour au canon code). */
export async function resetCanonOverride(input: { kind: "GAUGE" | "ITEM"; key: string }) {
  await db.scoreurCanonOverride.deleteMany({ where: { kind: input.kind, key: input.key } });
  return { status: "OK" as const };
}

/** Édite le θ d'une ancre/item en place (BrandRef.fixedTheta). */
export async function updateAnchorTheta(input: { slug: string; fixedTheta: number }) {
  const existing = await db.brandRef.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (!existing) return { status: "NOOP" as const };
  await db.brandRef.update({ where: { slug: input.slug }, data: { fixedTheta: input.fixedTheta } });
  return { status: "OK" as const };
}

/** Lecture pour la console : ancres/items (θ) + jauge + items résolus. */
export async function getCanonForConsole() {
  const [anchors, resolved] = await Promise.all([
    db.brandRef.findMany({
      where: { fixedTheta: { not: null } },
      orderBy: [{ kind: "asc" }, { fixedTheta: "desc" }],
      select: { slug: true, name: true, kind: true, fixedTheta: true, marketScale: true },
    }),
    resolveScoreurCanon(),
  ]);
  return { anchors, gauge: resolved.gauge, items: resolved.items };
}
