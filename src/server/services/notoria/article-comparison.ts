import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { object, productionModes, readMixDecision, type ProductionMode } from "@/domain/production-mix";
import { compareObjective } from "@/domain/recommendation-comparison";
import { collectNormalizedInitiatives } from "@/lib/types/pillar-schemas";

type Reference = { id: string; label: string; mode?: string | null };
export type ArticleComparisonScope = {
  id: string; objective: string; audience: string; period: string; channel: string; evidence: string[];
  references: Reference[]; mix?: Record<ProductionMode, number>;
};

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const describesMix = (s: string) => /\b(mix (editorial|de manipulation)|repartition (editoriale|des modes))\b/.test(fold(s));
const adoptedStatus = ["APPROVED", "IN_PROGRESS", "COMPLETED"];

export async function readArticleComparisonScopes(strategyId: string, reader: Pick<Prisma.TransactionClient, "campaign" | "strategy" | "pillar"> = db) {
  const [strategy, campaigns, pillars] = await Promise.all([
    reader.strategy.findUnique({ where: { id: strategyId }, select: { manipulationMix: true } }),
    reader.campaign.findMany({ where: { strategyId, state: { in: ["READY_TO_LAUNCH", "LIVE"] }, startDate: { not: null }, endDate: { not: null } },
      select: { id: true, name: true, objectives: true, startDate: true, endDate: true,
        briefs: { where: { status: "VALIDATED", briefType: "CREATIVE" }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 1, select: { id: true, version: true, content: true } },
        actions: {
        where: { status: { in: [...adoptedStatus, "PLANNED"] } }, orderBy: { id: "asc" },
        select: { id: true, name: true, status: true, category: true, aarrStage: true, devotionRungTargeted: true, manipulationModeApplied: true },
      } }, orderBy: { id: "asc" } }),
    reader.pillar.findMany({ where: { strategyId, key: { in: ["i", "s"] } }, select: { key: true, content: true, currentVersion: true, validationStatus: true, staleAt: true } }),
  ]);
  const result: ArticleComparisonScope[] = [];
  const i = pillars.find(p => p.key === "i" && !p.staleAt);
  const s = pillars.find(p => p.key === "s" && !p.staleAt && ["VALIDATED", "LOCKED"].includes(p.validationStatus));
  const selected = object(s?.content).selectedFromI;
  if (i && s && Array.isArray(selected)) {
    const ids = new Set(selected.map(entry => object(entry).sourceInitiativeId));
    for (const row of collectNormalizedInitiatives(i.content)) {
      if (!ids.has(row.id) || !row.objectif || !row.targetsPersonaIds.length || !row.timeframe) continue;
      result.push({ id: "I:" + row.id, objective: row.objectif, audience: row.targetsPersonaIds.join(", "), period: row.timeframe,
        channel: row.channel, references: [{ id: row.id, label: row.action }],
        evidence: [`S.v${s.currentVersion}.selectedFromI.${row.id}`, `I.v${i.currentVersion}.${row.id}`] });
    }
  }
  const mix = readMixDecision(strategy?.manipulationMix);
  for (const campaign of campaigns) {
    const description = object(campaign.objectives).description;
    if (typeof description !== "string" || !description.trim() || !campaign.startDate || !campaign.endDate) continue;
    const brief = campaign.briefs[0];
    const audience = object(object(brief?.content).briefClient).cible_principale;
    if (!brief || typeof audience !== "string" || audience.trim().length < 3 || /^(non spéci|non renseig|à préciser)/i.test(audience.trim())) continue;
    const groups = new Map<string, ArticleComparisonScope>();
    for (const a of campaign.actions) {
      if (!a.aarrStage || !a.devotionRungTargeted) continue;
      const id = JSON.stringify([campaign.id, a.category, a.aarrStage, a.devotionRungTargeted]);
      const group = groups.get(id) ?? { id, objective: description, channel: a.category,
        audience: audience + " · " + a.devotionRungTargeted, period: campaign.startDate.toISOString().slice(0, 10) + " / " + campaign.endDate.toISOString().slice(0, 10),
        evidence: [`Campaign:${campaign.id} · ${campaign.name} · ${a.aarrStage}`, `CampaignBrief:${brief.id}.v${brief.version}`], references: [] as Reference[] };
      if (adoptedStatus.includes(a.status)) group.references.push({ id: a.id, label: a.name, mode: a.manipulationModeApplied });
      groups.set(id, group);
    }
    for (const group of groups.values()) {
      if (describesMix(description) && mix.percent && mix.version) {
        group.mix = mix.percent;
        group.evidence.push(`Strategy:${strategyId}.manipulationMix · décision v${mix.version}`);
      }
      result.push(group);
    }
  }
  return result;
}

export function compareArticleAction(action: { action: string; objective: string }, scope?: ArticleComparisonScope, mode?: ProductionMode, equivalentId?: string) {
  const validScope = scope && fold(scope.objective) === fold(action.objective) ? scope : undefined;
  const references = validScope?.references ?? [];
  const duplicate = references.find(entry => fold(entry.label) === fold(action.action) || entry.id === equivalentId);
  const evidence = validScope ? [...validScope.evidence,
    `Public · ${validScope.audience} · Canal · ${validScope.channel} · Période · ${validScope.period}`,
    ...references.map(entry => "Action:" + entry.id + " · " + entry.label + (entry.mode ? " · " + entry.mode : ""))] : [];
  const base = { objective: action.objective, criterion: "", unit: "", candidate: null, direction: "lower" as const, basis: "projection" as const, evidence };
  if (duplicate) return compareObjective({ ...base, duplicate: true, incumbent: { id: duplicate.id, label: duplicate.label, value: null } });
  if (!validScope?.mix || !mode || references.some(a => !productionModes.includes(a.mode as ProductionMode))) {
    const ref = references[0];
    return compareObjective({ ...base, ...(ref ? { incumbent: { id: ref.id, label: ref.label, value: null } } : {}) });
  }
  const modes = references.map(entry => entry.mode);
  const mix = validScope.mix;
  // Total variation in percentage points. Each action counts once, irrespective of audience or revenue.
  function gap(items: (string | null | undefined)[]) {
    let absoluteDistance = 0;
    for (const productionMode of productionModes) {
      const count = items.filter(value => value === productionMode).length;
      const share = (100 * count) / items.length;
      absoluteDistance += Math.abs(share - mix[productionMode]);
    }
    return Number((absoluteDistance / 2).toFixed(4));
  }
  evidence.push("Répartition cible " + productionModes.map(m => m + " " + mix[m] + " %").join(" · "), "Mode proposé · " + mode);
  // With no adopted action there is no prior distribution. The documented exact
  // target admits a first action only when its distribution actually matches it.
  const anchor = references.length
    ? { incumbent: { id: validScope.id, label: "Répartition des actions adoptées", value: gap(modes) } }
    : { threshold: 0 };
  return compareObjective({ ...base, criterion: "Écart entre les parts du plan et le mix éditorial adopté", unit: "points de pourcentage",
    candidate: gap([...modes, mode]), ...anchor });
}
