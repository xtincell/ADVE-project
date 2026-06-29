/**
 * creative-proposal/ — Proposition Créative : la gate de génération de production (ADR-0120).
 *
 * L'unité-gate du Nouveau Pipeline de Production. Une Proposition Créative porte une
 * direction (Big Idea / insight / axe / pistes) + un niveau d'exécution (`routeKey`,
 * ADR-0089). Sa VALIDATION est le moment où la production naît : on rattache le jeu
 * d'initiatives de la route (ADR-0089) aux frames canon et on génère leurs briefs de
 * production. Le trigger de création a déménagé de « Advertis complet » vers ici.
 *
 * Voie A (La Fusée IA) et Voie B (La Guilde) produisent le MÊME Data Contract
 * (`src/lib/types/creative-proposal.ts`) — ce service ne distingue que la valeur
 * `source`. 100 % déterministe : aucune génération LLM ici (Voie A enrichit la
 * direction en amont via Glory, mais la gate elle-même est déterministe).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  creativeProposalContractSchema,
  type CreativeProposalContract,
} from "@/lib/types/creative-proposal";
import { routeInitiativeSet, ROUTE_SPECS, type RouteKey } from "@/lib/strategy/roadmap-routes";
import { canonTypeForTimeframe } from "@/server/services/campaign-canon/plan";

const CANON_TYPES = ["GTM_90", "ANNUAL", "ALWAYS_ON"] as const;

/** Mappe une `BrandAction` → la forme attendue par `routeInitiativeSet` (ADR-0089). PUR, exporté pour test. */
export function toRouteInitiative(a: { id: string; selected: boolean; status: string; metadata: unknown }): Record<string, unknown> {
  const meta = (a.metadata ?? {}) as Record<string, unknown>;
  const timeframe = typeof meta.timeframe === "string" ? meta.timeframe : null;
  // selected:true ≈ SELECTED_FOR_ROADMAP ; PROPOSED (non sélectionné) ≈ RECOMMENDED.
  const status = a.selected
    ? "SELECTED_FOR_ROADMAP"
    : a.status === "PROPOSED"
      ? "RECOMMENDED"
      : a.status;
  return { id: a.id, status, timeframe };
}

export interface ValidateProposalResult {
  proposalId: string;
  status: "VALIDATED";
  routeKey: string;
  actionsAttached: number;
  briefsGenerated: number;
  frames: number;
  alreadyValidated: boolean;
}

/**
 * Crée une Proposition Créative DRAFT depuis le Data Contract. Snapshot les 3 niveaux
 * d'exécution depuis le Pilier S calculé (read-only, best-effort).
 */
export async function createCreativeProposal(input: CreativeProposalContract) {
  const parsed = creativeProposalContractSchema.parse(input);

  const sPillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId: parsed.strategyId, key: "s" } },
    select: { content: true },
  });
  const sComputed = ((sPillar?.content as Record<string, unknown> | null)?.computed ?? {}) as Record<string, unknown>;
  const executionLevels = Array.isArray(sComputed.roadmapRoutes) ? sComputed.roadmapRoutes : undefined;

  return db.creativeProposal.create({
    data: {
      strategyId: parsed.strategyId,
      routeKey: parsed.routeKey,
      source: parsed.source,
      status: "DRAFT",
      direction: parsed.direction as unknown as Prisma.InputJsonValue,
      executionLevels: executionLevels as Prisma.InputJsonValue | undefined,
      visuals: (parsed.visuals ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** DRAFT → SUBMITTED (Voie B : La Guilde soumet pour validation opérateur). Idempotent. */
export async function submitCreativeProposal(id: string) {
  const p = await db.creativeProposal.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (p.status === "VALIDATED" || p.status === "SUBMITTED") return db.creativeProposal.findUniqueOrThrow({ where: { id } });
  return db.creativeProposal.update({ where: { id }, data: { status: "SUBMITTED" } });
}

/** Rejette une proposition avec motif (n'amorce aucune production). */
export async function rejectCreativeProposal(id: string, reason: string) {
  return db.creativeProposal.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason.slice(0, 2000) },
  });
}

/**
 * LA GATE — valide la direction créative et amorce la production. Idempotent (déjà
 * VALIDATED → recompte sans regénérer). Déterministe, zéro LLM.
 *
 * 1) Résout les frames canon de la route (auto-amorçage si absents, house style ADR-0119).
 * 2) Calcule le jeu d'initiatives de la route (ADR-0089) sur les `BrandAction` matérialisés.
 * 3) Rattache chaque action à son frame (timeframe → canonType) + génère son brief de production.
 * 4) Flip VALIDATED + audit.
 */
export async function validateCreativeProposal(id: string, validatedBy?: string): Promise<ValidateProposalResult> {
  const proposal = await db.creativeProposal.findUniqueOrThrow({ where: { id } });
  const routeKey = proposal.routeKey as RouteKey;

  if (proposal.status === "VALIDATED") {
    const frameIds = (
      await db.campaign.findMany({
        where: { strategyId: proposal.strategyId, routeKey, canonType: { in: [...CANON_TYPES] } },
        select: { id: true },
      })
    ).map((f) => f.id);
    const attached = frameIds.length > 0 ? await db.brandAction.count({ where: { campaignId: { in: frameIds } } }) : 0;
    return { proposalId: id, status: "VALIDATED", routeKey, actionsAttached: attached, briefsGenerated: 0, frames: frameIds.length, alreadyValidated: true };
  }

  // 1) Frames canon de la route — auto-amorçage si absents.
  let frames = await db.campaign.findMany({
    where: { strategyId: proposal.strategyId, routeKey, canonType: { in: [...CANON_TYPES] } },
    select: { id: true, canonType: true },
  });
  if (frames.length === 0) {
    const { generateCanonicalCampaigns } = await import("@/server/services/campaign-canon");
    await generateCanonicalCampaigns({ strategyId: proposal.strategyId, routeKey });
    frames = await db.campaign.findMany({
      where: { strategyId: proposal.strategyId, routeKey, canonType: { in: [...CANON_TYPES] } },
      select: { id: true, canonType: true },
    });
  }
  const frameByCanonType = new Map<string, string>(frames.map((f) => [f.canonType ?? "ANNUAL", f.id]));
  const fallbackFrameId = frameByCanonType.get("ANNUAL") ?? frames[0]?.id ?? null;

  // 2) Jeu d'initiatives de la route (ADR-0089) depuis les BrandAction matérialisés.
  const actions = await db.brandAction.findMany({
    where: { strategyId: proposal.strategyId },
    select: { id: true, selected: true, status: true, metadata: true },
  });
  const routeSet = routeInitiativeSet(routeKey, actions.map(toRouteInitiative));
  const routeIds = new Set(routeSet.map((r) => r.id as string));
  const selectedActions = actions.filter((a) => routeIds.has(a.id));

  // 3) Rattache + génère les briefs de production.
  const { generateBriefFromBrandAction } = await import("@/server/services/campaign-manager");
  let attached = 0;
  let briefs = 0;
  for (const a of selectedActions) {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const timeframe = typeof meta.timeframe === "string" ? meta.timeframe : null;
    const frameId = frameByCanonType.get(canonTypeForTimeframe(timeframe)) ?? fallbackFrameId;
    if (!frameId) continue;
    await db.brandAction.update({
      where: { id: a.id },
      data: { campaignId: frameId, selected: true, status: "ACCEPTED" },
    });
    attached++;
    try {
      await generateBriefFromBrandAction(a.id);
      briefs++;
    } catch (err) {
      console.warn(`[creative-proposal] brief de prod échoué pour action ${a.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // 4) Flip VALIDATED + audit.
  await db.creativeProposal.update({
    where: { id },
    data: { status: "VALIDATED", validatedAt: new Date(), validatedBy: validatedBy ?? null },
  });

  return { proposalId: id, status: "VALIDATED", routeKey, actionsAttached: attached, briefsGenerated: briefs, frames: frames.length, alreadyValidated: false };
}

export async function listCreativeProposalsByStrategy(strategyId: string) {
  return db.creativeProposal.findMany({ where: { strategyId }, orderBy: { createdAt: "desc" } });
}

export async function getCreativeProposal(id: string) {
  return db.creativeProposal.findUnique({ where: { id } });
}

// ── Niveaux d'exécution (ADR-0089) — preview Voie A déterministe ─────────────────
// Les 3 niveaux d'exécution sont « fonction des choix Advertis » : ce sont les routes
// `computeRoadmapRoutes` (Pilier S). On affiche, pour chaque niveau, ce que sa
// validation générerait RÉELLEMENT — le jeu d'initiatives de la route appliqué aux
// `BrandAction` matérialisés (même calcul que `validateCreativeProposal`). Zéro LLM.

export interface ExecutionLevel {
  key: string;
  label: string;
  recommended: boolean;
  selected: boolean;
  /** Croissance projetée (Pilier S) si calculée, sinon null. */
  projectedGrowthPct: number | null;
  /** Nombre d'actions que la validation de ce niveau rattacherait aux frames. */
  actionCount: number;
  /** Budget total des actions de ce niveau (somme budgetMax ?? budgetMin). */
  totalBudget: number;
}

/**
 * PUR — agrège, par niveau d'exécution, le compte + budget des actions que ce niveau
 * rattacherait (via `routeInitiativeSet`), enrichi du `projectedGrowthPct` stocké.
 * Exporté pour test.
 */
export function summarizeExecutionLevels(
  initiatives: Array<Record<string, unknown>>,
  budgetById: Map<string, number>,
  storedByKey: Map<string, Record<string, unknown>>,
): ExecutionLevel[] {
  return ROUTE_SPECS.map((spec) => {
    const ids = routeInitiativeSet(spec.key, initiatives).map((r) => r.id as string);
    const totalBudget = ids.reduce((sum, id) => sum + (budgetById.get(id) ?? 0), 0);
    const stored = storedByKey.get(spec.key);
    return {
      key: spec.key,
      label: spec.label,
      recommended: spec.recommended,
      selected: stored?.selected === true,
      projectedGrowthPct: stored && typeof stored.projectedGrowthPct === "number" ? (stored.projectedGrowthPct as number) : null,
      actionCount: ids.length,
      totalBudget,
    };
  });
}

/** Les 3 niveaux d'exécution d'une stratégie, avec preview du jeu d'actions par niveau. */
export async function getExecutionLevels(strategyId: string): Promise<ExecutionLevel[]> {
  const [sPillar, actions] = await Promise.all([
    db.pillar.findUnique({ where: { strategyId_key: { strategyId, key: "s" } }, select: { content: true } }),
    db.brandAction.findMany({
      where: { strategyId },
      select: { id: true, selected: true, status: true, metadata: true, budgetMin: true, budgetMax: true },
    }),
  ]);
  const computed = ((sPillar?.content as Record<string, unknown> | null)?.computed ?? {}) as Record<string, unknown>;
  const storedRoutes = Array.isArray(computed.roadmapRoutes) ? (computed.roadmapRoutes as Array<Record<string, unknown>>) : [];
  const storedByKey = new Map<string, Record<string, unknown>>(storedRoutes.map((r) => [String(r.key), r]));
  const budgetById = new Map<string, number>(actions.map((a) => [a.id, (a.budgetMax ?? a.budgetMin ?? 0) || 0]));
  const initiatives = actions.map(toRouteInitiative);
  return summarizeExecutionLevels(initiatives, budgetById, storedByKey);
}
