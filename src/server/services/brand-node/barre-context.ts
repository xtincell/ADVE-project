import { db } from "@/lib/db";
import { ADVE_KEYS } from "@/domain";
import type { BarreBrandContext } from "@/domain/barre-brand-context";
import { BARRE_CAMPAIGN_REVIEW_RECEPTION } from "@/domain/barre-campaign-review";
import { inspectPortfolioReferences, isBarreReference } from "@/domain/portfolio-reference";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { barreBinding } from "./barre-connection";
import { pillarPreciseFields } from "@/server/services/seshat/context-store/oracle-augment";

type Actor = Parameters<typeof canAccessStrategy>[1];
type BrandNodeRow = { id: string; operatorId: string; name: string; strategyId: string | null; sourceRefs: unknown };

/**
 * Reuse current assignments; a reference neither selects an old seed nor grants access.
 * The same resolution serves the reference reader and the campaign review reception.
 */
async function resolveBarreBrandNodes(actor: Actor, brandIds?: string[]) {
  const nodes: BrandNodeRow[] = await db.brandNode.findMany({
    where: { archivedAt: null, ...(actor.role === "ADMIN" ? {} : { operatorId: actor.operatorId ?? "" }) },
    select: { id: true, operatorId: true, name: true, strategyId: true, sourceRefs: true },
    orderBy: { id: "asc" },
  });
  const binding = barreBinding();
  const access = new Map<string, boolean>();
  async function readable(strategyId: string) {
    if (!access.has(strategyId)) access.set(strategyId, await canAccessStrategy(strategyId, actor));
    return access.get(strategyId)!;
  }
  const choices: NonNullable<BarreBrandContext["choices"]> = [];
  const candidates = new Map<string, BrandNodeRow[]>();
  for (const node of nodes) {
    if (!node.strategyId) continue;
    const id = `MQ-FUSEE-${node.id}`;
    if (node.operatorId === actor.operatorId && await readable(node.strategyId)) {
      choices.push({ id, nodeId: node.id, strategyId: node.strategyId, name: node.name,
        url: `/cockpit/brand/fondation?strategy=${encodeURIComponent(node.strategyId)}` });
      if (brandIds?.includes(id)) candidates.set(id, [...(candidates.get(id) ?? []), node]);
    }
    for (const ref of inspectPortfolioReferences(node.sourceRefs).references) {
      if (!isBarreReference(ref, binding.instance) || ref.kind !== "brand" || (brandIds && !brandIds.includes(ref.id))) continue;
      candidates.set(ref.id, [...(candidates.get(ref.id) ?? []), node]);
    }
  }
  const resolved: Array<{ id: string; node: BrandNodeRow & { strategyId: string } }> = [];
  const issues: string[] = [], ambiguous: string[] = [];
  for (const [id, rows] of candidates) {
    // Multiple companies/strategies are an ambiguity, never a first-match rule.
    if (new Set(rows.map((n) => `${n.operatorId}:${n.strategyId}`)).size !== 1) {
      issues.push(`La référence ${id} désigne plusieurs plateformes ; son rattachement reste à qualifier.`);
      ambiguous.push(id);
      continue;
    }
    const node = rows[0]!;
    if (!node.strategyId || !await readable(node.strategyId)) continue;
    resolved.push({ id, node: { ...node, strategyId: node.strategyId } });
  }
  return { choices, resolved, issues, ambiguous };
}

/** Which readable brand dossiers the given La Barre brand identities designate, for this actor. */
export async function resolveBarreBrands(actor: Actor, brandIds: string[]) {
  const { resolved, ambiguous } = await resolveBarreBrandNodes(actor, brandIds);
  return {
    brands: resolved.map(({ id, node }) => ({ id, nodeId: node.id, strategyId: node.strategyId, name: node.name })),
    ambiguous,
  };
}

export async function getBarreBrandContext(actor: Actor, brandIds?: string[]): Promise<BarreBrandContext> {
  const result: BarreBrandContext = { generatedAt: new Date().toISOString(), sharingMode: "DOCUMENT_V2",
    campaignReviewReception: BARRE_CAMPAIGN_REVIEW_RECEPTION, choices: [], brands: {}, issues: [] };
  const { choices, resolved, issues } = await resolveBarreBrandNodes(actor, brandIds);
  result.choices = choices;
  result.issues.push(...issues);
  for (const { id, node } of resolved) {
    const pillars = await db.pillar.findMany({
      where: { strategyId: node.strategyId, key: { in: ADVE_KEYS.map((key) => key.toLowerCase()) } },
      select: { id: true, key: true, currentVersion: true, content: true, fieldCertainty: true, updatedAt: true },
      orderBy: { key: "asc" },
    });
    const fields = Object.fromEntries(pillars.flatMap((p) => pillarPreciseFields(p)).map((field) => [
      `${field.source}.${field.field}`, {
        value: field.value, provenance: field.provenance, sourceId: field.sourceId ?? null,
        sourceVersion: field.sourceVersion ?? null, lastWrittenAt: field.lastWrittenAt?.toISOString() ?? null,
      },
    ]));
    result.brands[id] = { nodeId: node.id, strategyId: node.strategyId, name: node.name,
      url: `/cockpit/brand/fondation?strategy=${encodeURIComponent(node.strategyId)}`, fields };
  }
  return result;
}
