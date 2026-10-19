import { db } from "@/lib/db";
import { ADVE_KEYS } from "@/domain";
import type { BarreBrandContext } from "@/domain/barre-brand-context";
import { inspectPortfolioReferences, isBarreReference } from "@/domain/portfolio-reference";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { barreBinding } from "./barre-connection";
import { pillarPreciseFields } from "@/server/services/seshat/context-store/oracle-augment";

/** Reuse current assignments; a reference neither selects an old seed nor grants access. */
export async function getBarreBrandContext(actor: Parameters<typeof canAccessStrategy>[1], brandIds?: string[]): Promise<BarreBrandContext> {
  const result: BarreBrandContext = { generatedAt: new Date().toISOString(), sharingMode: "DOCUMENT_V2", choices: [], brands: {}, issues: [] };
  const nodes = await db.brandNode.findMany({
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
  const candidates = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!node.strategyId) continue;
    const id = `MQ-FUSEE-${node.id}`;
    if (node.operatorId === actor.operatorId && await readable(node.strategyId)) {
      result.choices!.push({ id, nodeId: node.id, strategyId: node.strategyId, name: node.name,
        url: `/cockpit/brand/fondation?strategy=${encodeURIComponent(node.strategyId)}` });
      if (brandIds?.includes(id)) candidates.set(id, [...(candidates.get(id) ?? []), node]);
    }
    for (const ref of inspectPortfolioReferences(node.sourceRefs).references) {
      if (!isBarreReference(ref, binding.instance) || ref.kind !== "brand" || (brandIds && !brandIds.includes(ref.id))) continue;
      candidates.set(ref.id, [...(candidates.get(ref.id) ?? []), node]);
    }
  }
  for (const [id, rows] of candidates) {
    // Multiple companies/strategies are an ambiguity, never a first-match rule.
    if (new Set(rows.map((n) => `${n.operatorId}:${n.strategyId}`)).size !== 1) {
      result.issues.push(`La référence ${id} désigne plusieurs plateformes ; son rattachement reste à qualifier.`);
      continue;
    }
    const node = rows[0]!;
    if (!node.strategyId || !await readable(node.strategyId)) continue;
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
