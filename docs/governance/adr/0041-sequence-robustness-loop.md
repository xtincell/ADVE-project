# ADR-0041 — Robustness loop sequence (DAG inter-sequences + cache + quality gate)

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — Refonte rigueur Artemis (mégasprint NEFER F1→F11)
**Supersedes** : aucun
**Related** : [ADR-0039](0039-sequence-as-unique-public-unit.md), [ADR-0040](0040-uniform-section-sequence-migration.md), [APOGEE.md](../APOGEE.md) §3 Loi 3 conservation carburant

---

## Contexte

Audit gouvernance NEFER 2026-05-04 sur la machinerie sequence-executor a révélé F5 + F6 + F7 + F10 :

### F5 — Pas de DAG inter-sequences (juste intra-framework)

[artemis/index.ts:16-55](../../../src/server/services/artemis/index.ts:16) `topologicalSort(slugs)` opère sur frameworks via `fw.dependencies`. [sequences.ts:96-113](../../../src/server/services/artemis/tools/sequences.ts:96) `GlorySequenceDef` a un champ `requires: SequencePrerequisite[]` mais **aucun moteur n'en fait un tri topologique automatique**. L'ordre d'exécution des sequences est choisi à la main dans `enrich-oracle.ts` (loop linéaire sur `incomplete`).

→ Si la sequence `MCK-7S` requiert `MANIFESTE-A` accepté, et que les deux sont incomplètes, le code peut tenter `MCK-7S` d'abord et échouer sans erreur claire.

### F6 — Cache au niveau framework uniquement

[enrich-oracle.ts:796-811](../../../src/server/services/strategy-presentation/enrich-oracle.ts:796) `recentResults = await db.frameworkResult.findMany({ … gte: < 1 hour })`. Aucun équivalent pour `SequenceExecution` malgré l'existence du modèle Sequence Vault.

→ Si un Oracle est rerun dans l'heure (ex: opérateur ajuste pillar A puis relance), les frameworks sont mis en cache mais **toutes les Glory sequences se retournent intégralement** → recompose 28 sequences, cost ~+5 $ par run inutile.

### F7 — Pas de quality gate post-sequence

[enrich-oracle.ts:931-950](../../../src/server/services/strategy-presentation/enrich-oracle.ts:931) — sequence considérée OK si `completed > 0`. `qualityScores` calculé hors-sequence sur le **status** complete/partial/empty. Aucun appel LLM "validator" ou Zod schema strict avant promotion BrandAsset.

→ Une sequence qui produit `{ mckinsey7s: {} }` est promue en BrandAsset DRAFT — pollution du vault avec assets vides, compteur 35/35 "vert" alors que des sections sont structurellement vides.

### F10 — `topologicalSort` framework-only, pas réutilisé pour sequences

Helper [artemis/index.ts:16](../../../src/server/services/artemis/index.ts:16) duplique du code Kahn que F5 va devoir re-implémenter pour sequences. Couplage avec F5.

## Décision

### §1 — `topoSort<T>` générique + `topoSortSequences`

Helper générique dans `src/lib/topo-sort.ts` (NEW) :

```ts
export function topoSort<T>(
  items: T[],
  getKey: (t: T) => string,
  getDeps: (t: T) => string[],
): T[] { /* Kahn's algorithm */ }
```

Helper sequence-spécifique dans `src/server/services/artemis/tools/sequence-topo.ts` (NEW) :

```ts
export function topoSortSequences(keys: GlorySequenceKey[]): GlorySequenceKey[] {
  const seqs = keys.map(k => getSequence(k)).filter((s): s is GlorySequenceDef => !!s);
  return topoSort(
    seqs,
    s => s.key,
    s => s.requires.filter(r => r.type === "SEQUENCE").map(r => (r as any).key),
  ).map(s => s.key);
}
```

[artemis/index.ts:16-55](../../../src/server/services/artemis/index.ts:16) `topologicalSort(frameworkSlugs)` re-implémenté avec `topoSort` générique. Comportement identique. F10 fermée par consolidation.

[enrich-oracle.ts:789](../../../src/server/services/strategy-presentation/enrich-oracle.ts:789) `topologicalSort([...neededFrameworks])` remplacé par `topoSortSequences([...neededSequences])` après F2 fermée. F5 fermée.

### §2 — Cache sequence-level

Migration Prisma `sequence-execution-cache` étend `SequenceExecution` :

```prisma
model SequenceExecution {
  id           String           @id @default(cuid())
  strategyId   String
  sequenceKey  String
  output       Json
  mode         SequenceMode
  lifecycle    SequenceLifecycle @default(DRAFT)
  promptHash   String?
  executedAt   DateTime         @default(now())
  expiresAt    DateTime?
  // … champs existants
  @@unique([strategyId, sequenceKey, mode])
  @@index([strategyId, executedAt])
}
```

Helper `src/server/services/sequence-vault/cache.ts` (NEW) expose `getCachedSequence` + `cacheSequenceExecution`. Invalidation par `pillar.updatedAt > sequenceExecution.executedAt` quand l'option `invalidateIfPillarsChanged` est passée.

[sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts) `executeSequence` consulte `getCachedSequence` avant le 1er step. Court-circuit si hit. [enrich-oracle.ts:796-811](../../../src/server/services/strategy-presentation/enrich-oracle.ts:796) `recentResults` framework-only supprimé. F6 fermée.

### §3 — Quality gate post-sequence

`src/server/services/artemis/tools/quality-gate.ts` (NEW) :

```ts
export type QualityGateResult = { ok: true } | { ok: false; reasons: string[] };

export async function applySequenceQualityGate(
  sequenceKey: GlorySequenceKey,
  output: Record<string, unknown>,
  schema?: ZodSchema,
): Promise<QualityGateResult> {
  // 1. Schema validation if provided (Zod safeParse)
  // 2. Empty payload detection (recursively check non-empty leaves)
  // 3. Reasons list returned for journal
}

export class SequenceQualityError extends Error {
  constructor(public sequenceKey: GlorySequenceKey, public reasons: string[]) { /* ... */ }
}
```

[sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts) branche post-dernier-step :

```ts
const gate = await applySequenceQualityGate(sequenceKey, finalContext);
if (!gate.ok) {
  journal.qualityFail(gate.reasons);
  throw new SequenceQualityError(sequenceKey, gate.reasons);
}
```

[enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts) try/catch attrape `SequenceQualityError` et `failed.push(sectionId)`. Plus jamais `enriched.push` sur payload vide. F7 fermée.

### §4 — Mode soft → hard switch

Pendant 1 semaine après merge :
- Quality gate en **mode soft** : warn dans journal + `console.warn`, mais ne throw pas. `failed` continue de fonctionner sur erreurs catastrophiques uniquement.
- Métriques collectées : compteur de sections qui auraient été flagged en mode hard.

Après 1 semaine :
- Quality gate en **mode hard** : throw `SequenceQualityError`, `failed.push(sectionId)`.

Tracking dans [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md). Rollout progressive pour absorber les false positives.

## Conséquences

### Bénéfices

- **F5+F10 fermées** par consolidation (DAG inter-sequences via helper générique réutilisé)
- **F6 fermée** : cache sequence-level économise ~$0,30/run en re-exécution complète
- **F7 fermée** : quality gate force la qualité minimale avant promotion BrandAsset
- **Coût LLM net négatif** sur Oracle complet : +$0,15 (7 nouvelles sequences) - $0,30 (cache) = ~-$0,15
- **Compteurs Oracle 35/35 fiables** : plus de "vert" sur sections vides

### Coûts

- **Migration Prisma** sur table `SequenceExecution` (existante) — non-breaking, ajout de colonnes nullable
- **Quality gate mode soft** 1 semaine alourdit logs mais pas de blocage
- **Test fixtures** `cache-invalidation.test.ts` doit mocker `db.pillar.updatedAt` — pattern existant

### Risques

- **False positives quality gate** sur sections legacy → mode soft 1 semaine atténue
- **Cache mal invalidé** si pillar updatedAt non bumpé après modification → mitigé par `pillar-gateway` qui force `updatedAt: new Date()` à chaque writeback (déjà en place)
- **Cycle topo détecté** dans tests → Kahn's `throw new Error("Topological cycle detected")` explicite

## Open work

- Mode hard quality gate à activer 1 semaine post-merge (cf. [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md))
- Schémas Zod stricts par sequence (au-delà du non-empty check) — chantier futur, ADR séparé si besoin

## Références implémentation

- Fichiers nouveaux : `src/lib/topo-sort.ts`, `src/server/services/artemis/tools/sequence-topo.ts`, `src/server/services/sequence-vault/cache.ts`, `src/server/services/artemis/tools/quality-gate.ts`
- Fichiers modifiés : [sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts), [artemis/index.ts](../../../src/server/services/artemis/index.ts), [enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts), `prisma/schema.prisma`
- Tests nouveaux : `tests/unit/lib/topo-sort.test.ts`, `tests/unit/sequence/topo-sequences.test.ts`, `tests/integration/sequence/cache-invalidation.test.ts`, `tests/unit/sequence/quality-gate.test.ts`
- Migration Prisma : `prisma migrate dev --name sequence-execution-cache`
