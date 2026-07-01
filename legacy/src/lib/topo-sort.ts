/**
 * src/lib/topo-sort.ts
 *
 * Phase 17 (ADR-0041) — Tri topologique générique (Kahn's algorithm).
 *
 * Helper générique réutilisable pour toute structure dépendances
 * unidirectionnelles : frameworks Artemis (par fw.dependencies), sequences
 * (par sequence.requires de type SEQUENCE), Glory tools (par
 * tool.dependencies). Ferme F10 (duplication potentielle topologicalSort
 * framework-only) en consolidant en un helper unique.
 *
 * @example
 * const sorted = topoSort(
 *   frameworks,
 *   (fw) => fw.slug,
 *   (fw) => fw.dependencies,
 * );
 *
 * @throws Error si un cycle est détecté
 */
export function topoSort<T>(
  items: readonly T[],
  getKey: (t: T) => string,
  getDeps: (t: T) => readonly string[],
): T[] {
  const byKey = new Map<string, T>();
  for (const t of items) byKey.set(getKey(t), t);

  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const t of items) {
    const k = getKey(t);
    graph.set(k, []);
    inDegree.set(k, 0);
  }

  for (const t of items) {
    const k = getKey(t);
    for (const dep of getDeps(t)) {
      // Ignore les deps externes au set (peuvent être déjà résolues)
      if (!byKey.has(dep)) continue;
      graph.get(dep)!.push(k);
      inDegree.set(k, (inDegree.get(k) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [k, d] of inDegree) {
    if (d === 0) queue.push(k);
  }

  const sorted: T[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const t = byKey.get(cur);
    if (t !== undefined) sorted.push(t);
    for (const next of graph.get(cur) ?? []) {
      const nd = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nd);
      if (nd === 0) queue.push(next);
    }
  }

  if (sorted.length !== items.length) {
    const remaining = items.filter((t) => !sorted.includes(t)).map(getKey);
    throw new Error(`Topological cycle detected — unresolved: ${remaining.join(", ")}`);
  }

  return sorted;
}
