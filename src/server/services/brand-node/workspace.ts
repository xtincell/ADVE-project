import type { BrandNode } from "@prisma/client";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { db } from "@/lib/db";
import { inspectPortfolioReferences, portfolioReferenceKey } from "@/domain/portfolio-reference";
import { BARRE_ORIGIN, projectBarreWorkspace, type BarreWorkspace } from "@/domain/portfolio-barre";

/** Short, process-local read cache. A failed refresh is surfaced, never an empty portfolio. */
let cache: { data: unknown; fetchedAt: number } | undefined;
let pending: Promise<{ data: unknown; fetchedAt: number }> | undefined;
async function readBarre() {
  if (cache && Date.now() - cache.fetchedAt < 60_000) return cache;
  if (!pending) pending = (async () => {
    const response = await fetch(`${BARRE_ORIGIN}/depots/beignet-paradise.json`, {
      signal: AbortSignal.timeout(12_000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) throw new Error(`La Barre répond ${response.status}`);
    const data: unknown = await response.json();
    // Reject invalid successful responses before caching.
    projectBarreWorkspace(data, []);
    cache = { data, fetchedAt: Date.now() };
    return cache;
  })().finally(() => { pending = undefined; });
  return pending;
}

export async function getPortfolioWorkspace(root: BrandNode, options: { allowBarre: boolean; actor: Parameters<typeof canAccessStrategy>[1] }) {
  const allNodes = await db.brandNode.findMany({ where: { operatorId: root.operatorId, archivedAt: null }, orderBy: { name: "asc" } });
  const ids = new Set([root.id]);
  // Bounded fixed point; corrupt cycles cannot hang a read.
  for (let i = 0; i < allNodes.length; i++) {
    const before = ids.size;
    for (const node of allNodes) if (node.parentNodeId && ids.has(node.parentNodeId)) ids.add(node.id);
    if (before === ids.size) break;
  }
  const nodes = allNodes.filter((n) => ids.has(n.id));
  const ancestors: BrandNode[] = [];
  let parentId = root.parentNodeId;
  while (parentId && ancestors.length < allNodes.length) {
    const parent = allNodes.find((n) => n.id === parentId);
    if (!parent || ancestors.some((n) => n.id === parent.id)) break;
    ancestors.push(parent); parentId = parent.parentNodeId;
  }
  const inheritedFrom = root.strategyId ? null : ancestors.find((n) => n.strategyId) ?? null;
  const inspected = nodes.map((node) => ({ node, ...inspectPortfolioReferences(node.sourceRefs) }));
  const referenceIssues = inspected.flatMap(({ node, issues }) => issues.map((i) => `${node.name} · ${i.message}`));
  const references = [...new Map(inspected.flatMap((n) => n.references)
    .map((r) => [portfolioReferenceKey(r), r])).values()];
  const strategyIds = [...new Set([...nodes.flatMap((n) => n.strategyId ? [n.strategyId] : []), ...(inheritedFrom?.strategyId ? [inheritedFrom.strategyId] : []),
    ...references.filter((r) => r.system === "LA_FUSEE" && r.kind === "strategy").map((r) => r.id)])];
  const accessibleIds = (await Promise.all(strategyIds.map(async (id) =>
    await canAccessStrategy(id, options.actor) ? id : null))).filter((id): id is string => id !== null);
  // A source reference is not an access grant; apply the native access policy.
  const strategies = await db.strategy.findMany({
    where: { id: { in: accessibleIds } },
    select: { id: true, name: true, status: true,
      pillars: { select: { key: true, validationStatus: true, completionLevel: true, staleAt: true, currentVersion: true } },
      dataSources: { select: { id: true, fileName: true, certainty: true, processingStatus: true, updatedAt: true } },
      brandAssets: { select: { id: true, name: true, kind: true, state: true, fileUrl: true, staleAt: true } },
      campaigns: { select: { id: true, name: true, status: true } },
    },
  });
  let barre: BarreWorkspace | null = null;
  let sourceStatus: "LIVE" | "UNAVAILABLE" | "NOT_CONNECTED" = "NOT_CONNECTED";
  let sourceError: string | null = null, fetchedAt: string | null = null;
  if (references.some((r) => r.system === "LA_BARRE")) {
    if (!options.allowBarre) sourceError = "La connexion de votre équipe à La Barre reste à configurer.";
    else try {
      const snapshot = await readBarre();
      barre = projectBarreWorkspace(snapshot.data, references);
      sourceStatus = "LIVE"; fetchedAt = new Date(snapshot.fetchedAt).toISOString();
    } catch (error) {
      sourceStatus = "UNAVAILABLE";
      sourceError = error instanceof Error ? error.message : "La Barre est momentanément indisponible.";
    }
  }
  return { root, nodes, strategies, referenceIssues, inheritedFrom: inheritedFrom ? { name: inheritedFrom.name, strategyId: inheritedFrom.strategyId } : null, barre, sourceStatus, sourceError, fetchedAt };
}
export type PortfolioWorkspace = Awaited<ReturnType<typeof getPortfolioWorkspace>>;
