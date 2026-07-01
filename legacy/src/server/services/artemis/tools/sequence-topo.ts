/**
 * src/server/services/artemis/tools/sequence-topo.ts
 *
 * Phase 17 (ADR-0041) — Tri topologique inter-sequences. Ferme F5 (DAG
 * inter-sequences absent jusqu'ici, ordre choisi à la main dans
 * enrich-oracle).
 *
 * Utilise `topoSort<T>` générique (`src/lib/topo-sort.ts`). Les dépendances
 * inter-sequences sont déclarées dans `GlorySequenceDef.requires` avec
 * `type: "SEQUENCE"`. Les autres types de prerequisite (PILLAR, SEQUENCE_ANY,
 * FRAMEWORK) sont ignorés ici — ils sont gates pour la décision de tourner
 * la sequence, pas pour son ordre.
 */

import { topoSort } from "@/lib/topo-sort";
import { ALL_SEQUENCES, getSequence, type GlorySequenceDef, type GlorySequenceKey } from "./sequences";

/**
 * Tri topologique d'un set de sequences selon leurs `requires` de type SEQUENCE.
 * Les sequences absentes du registry sont silencieusement filtrées.
 *
 * @example
 * const ordered = topoSortSequences(["MCK-7S", "MANIFESTE-A"]);
 * // → ["MANIFESTE-A", "MCK-7S"] si MCK-7S requires MANIFESTE-A
 */
export function topoSortSequences(keys: readonly GlorySequenceKey[]): GlorySequenceKey[] {
  const seqs: GlorySequenceDef[] = [];
  for (const key of keys) {
    const s = getSequence(key);
    if (s) seqs.push(s);
  }

  return topoSort<GlorySequenceDef>(
    seqs,
    (s) => s.key,
    (s) =>
      s.requires
        .filter((r): r is { type: "SEQUENCE"; key: GlorySequenceKey; status: "ACCEPTED" } => r.type === "SEQUENCE")
        .map((r) => r.key),
  ).map((s) => s.key);
}

/**
 * Helper : retourne tous les sequences requis (transitivement) pour
 * exécuter `target`, en ordre topologique (target en dernier).
 */
export function resolveSequenceClosure(target: GlorySequenceKey): GlorySequenceKey[] {
  const visited = new Set<GlorySequenceKey>();
  const stack: GlorySequenceKey[] = [target];

  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const seq = getSequence(cur);
    if (!seq) continue;
    for (const req of seq.requires) {
      if (req.type === "SEQUENCE" && !visited.has(req.key)) {
        stack.push(req.key);
      }
    }
  }

  return topoSortSequences([...visited]);
}

/**
 * Helper de découverte : retourne toutes les sequences enregistrées en
 * ordre topologique (utilisé par audits CI + introspection UI).
 */
export function topoSortAllSequences(): GlorySequenceKey[] {
  return topoSortSequences(ALL_SEQUENCES.map((s) => s.key));
}
