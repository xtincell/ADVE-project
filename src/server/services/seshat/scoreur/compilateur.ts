/**
 * ADR-0149 — compilateur : signaux mesurés → épreuves (la « matrice » canon).
 *
 * Ne compile QUE ce qui est réellement mesuré en base (zéro fabrication, P22-2) :
 *  - arène E ← Identity Graph (superfans dédupliqués par personne) vs plancher de
 *    ligue (item Rasch) ;
 *  - arène T ← Overton Graph (transitions favorables = victoires, adverses =
 *    défaites) + duel de vocabulaire.
 * A / D / V arrivent en épreuves persistées (registre, sourcées) — pas inventées ici.
 * Source inaccessible ⇒ épreuve absente ⇒ RD large en aval.
 */

import { db } from "@/lib/db";
import { getOvertonSignalsForBrand } from "../overton-graph";
import type { CompiledEpreuve } from "@/domain/scoreur";
import { PROOF_WEIGHTS } from "@/domain/scoreur";

/** Slugs d'items canon (opponents Rasch à difficulté fixée). */
export const ITEM_OPPONENTS = {
  eMassFloor: "item-e-mass-floor",
  tFrame: "item-t-frame",
  aAudienceFloor: "item-a-audience-floor",
  vGrowth: "item-v-growth",
} as const;

/** ADR-0153 — fenêtres temporelles de la preuve d'historique (footprint). */
const SUSTAIN_DAYS = 60; // audience maintenue ≥ ce nb de jours → preuve « forte »
const GROWTH_MIN_DAYS = 30; // ≥ ce span entre 2 relevés → l'arène V (croissance) joue

/** Compte les superfans DÉDUPLIQUÉS par personne (Identity Graph). */
export async function countDistinctSuperfans(strategyId: string): Promise<number> {
  const profiles = await db.superfanProfile.findMany({
    where: { strategyId },
    select: { id: true, personId: true },
  });
  const persons = new Set<string>();
  for (const p of profiles) persons.add(p.personId ?? p.id);
  return persons.size;
}

export interface CompileContext {
  readonly strategyId: string;
  readonly nowIso: string;
  /** Plancher de masse superfan de la ligue (resolveEvidenceTargets). */
  readonly superfanFloor: number;
  /** Plancher d'audience de la ligue (resolveEvidenceTargets, ADR-0153). */
  readonly audienceFloor: number;
}

/**
 * ADR-0153 — épreuves d'HISTORIQUE depuis le footprint MESURÉ (`FollowerSnapshot`,
 * horodaté, collecté quotidiennement). Rien d'inventé : pas de relevé ⇒ pas
 * d'épreuve (absence honnête, P22-2). L'audience = attention (arène A), pas
 * dévotion (arène E, superfans). La série temporelle nourrit la croissance
 * (arène V) dès qu'il y a ≥ 2 relevés espacés.
 */
export async function compileFootprintEpreuves(ctx: {
  readonly strategyId: string;
  readonly nowIso: string;
  readonly audienceFloor: number;
}): Promise<CompiledEpreuve[]> {
  const snaps = await db.followerSnapshot.findMany({
    where: { strategyId: ctx.strategyId },
    select: { platform: true, followerCount: true, capturedAt: true },
    orderBy: { capturedAt: "desc" },
  });
  if (snaps.length === 0) return []; // absence honnête

  const out: CompiledEpreuve[] = [];

  // Dernier count par plateforme → audience cumulée mesurée (attention).
  const latestByPlatform = new Map<string, number>();
  for (const s of snaps) if (!latestByPlatform.has(s.platform)) latestByPlatform.set(s.platform, s.followerCount);
  let totalAudience = 0;
  for (const c of latestByPlatform.values()) totalAudience += c;

  const newest = snaps[0]!.capturedAt;
  const oldest = snaps[snaps.length - 1]!.capturedAt;
  const spanDays = (newest.getTime() - oldest.getTime()) / 86_400_000;

  // ── Arène A : audience cumulée vs plancher de ligue ─────────────────────────
  out.push({
    subjectRef: ctx.strategyId,
    opponentRef: ITEM_OPPONENTS.aAudienceFloor,
    arena: "A",
    result: totalAudience >= ctx.audienceFloor ? "WIN" : "LOSS",
    proofWeight: spanDays >= SUSTAIN_DAYS ? PROOF_WEIGHTS.fort : latestByPlatform.size >= 2 ? PROOF_WEIGHTS.moyen : PROOF_WEIGHTS.item,
    source: `footprint:audience=${totalAudience}/floor=${ctx.audienceFloor} platforms=${latestByPlatform.size} span=${Math.round(spanDays)}d`,
    occurredAt: newest.toISOString(),
  });

  // ── Arène V : croissance dans le temps (≥ 2 dates distinctes espacées) ───────
  const perDay = new Map<string, Map<string, number>>(); // jour → plateforme → count le + récent ce jour
  for (const s of snaps) {
    const day = s.capturedAt.toISOString().slice(0, 10);
    const pm = perDay.get(day) ?? perDay.set(day, new Map()).get(day)!;
    if (!pm.has(s.platform)) pm.set(s.platform, s.followerCount); // desc → 1er vu = + récent ce jour
  }
  const days = [...perDay.keys()].sort();
  if (days.length >= 2) {
    const dayTotal = (day: string) => { let t = 0; for (const c of perDay.get(day)!.values()) t += c; return t; };
    const first = dayTotal(days[0]!);
    const last = dayTotal(days[days.length - 1]!);
    const growthDays = (new Date(days[days.length - 1]!).getTime() - new Date(days[0]!).getTime()) / 86_400_000;
    if (growthDays >= GROWTH_MIN_DAYS) {
      out.push({
        subjectRef: ctx.strategyId,
        opponentRef: ITEM_OPPONENTS.vGrowth,
        arena: "V",
        result: last >= first ? "WIN" : "LOSS",
        proofWeight: growthDays >= 90 ? PROOF_WEIGHTS.fort : PROOF_WEIGHTS.moyen,
        source: `footprint:growth ${first}->${last} over ${Math.round(growthDays)}d`,
        occurredAt: newest.toISOString(),
      });
    }
  }
  return out;
}

/**
 * Compile les épreuves E + T mesurées. Le sujet est référencé par `strategyId`
 * (le node id du sujet dans l'estimateur).
 */
export async function compileMeasuredEpreuves(ctx: CompileContext): Promise<{
  epreuves: CompiledEpreuve[];
  superfanCount: number;
  favorableOverton: number;
}> {
  const out: CompiledEpreuve[] = [];

  // ── Arène E : masse superfan dédupliquée vs plancher de ligue (item) ────────
  const superfanCount = await countDistinctSuperfans(ctx.strategyId);
  if (superfanCount > 0 || ctx.superfanFloor > 0) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.eMassFloor,
      arena: "E",
      result: superfanCount >= ctx.superfanFloor ? "WIN" : "LOSS",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `identity-graph:superfans=${superfanCount}/floor=${ctx.superfanFloor}`,
      occurredAt: ctx.nowIso,
    });
  }

  // ── Arènes A + V : historique mesuré (footprint horodaté, ADR-0153) ─────────
  const footprint = await compileFootprintEpreuves({
    strategyId: ctx.strategyId,
    nowIso: ctx.nowIso,
    audienceFloor: ctx.audienceFloor,
  });
  out.push(...footprint);

  // ── Arène T : transitions Overton attribuées (favorables = victoires) ───────
  const overton = await getOvertonSignalsForBrand(db, ctx.strategyId);
  for (const t of overton.favorableTransitions) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.tFrame,
      arena: "T",
      result: "WIN",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `overton:transition+${t.delta}@${t.occurredAt.toISOString()}`,
      occurredAt: t.occurredAt.toISOString(),
    });
  }
  for (const t of overton.adverseTransitions) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.tFrame,
      arena: "T",
      result: "LOSS",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `overton:transition${t.delta}@${t.occurredAt.toISOString()}`,
      occurredAt: t.occurredAt.toISOString(),
    });
  }

  return {
    epreuves: out,
    superfanCount,
    favorableOverton: overton.favorableTransitions.length,
  };
}
