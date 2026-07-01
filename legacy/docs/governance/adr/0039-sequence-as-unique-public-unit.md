# ADR-0039 — Sequence comme unité publique unique d'Artemis

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — Refonte rigueur Artemis (mégasprint NEFER F1→F11)
**Supersedes** : aucun (étend la sémantique de [ADR-0014](0014-oracle-35-framework-canonical.md) sequence-as-deliverable)
**Related** : [PANTHEON.md](../PANTHEON.md) §Artemis, [NEFER.md](../NEFER.md) §3, [ADR-0040](0040-uniform-section-sequence-migration.md), [ADR-0041](0041-sequence-robustness-loop.md), [ADR-0042](0042-sequence-modes-and-lifecycle.md)

---

## Contexte

Audit gouvernance NEFER 2026-05-04 sur le manifest Artemis ([artemis/manifest.ts:30](../../../src/server/services/artemis/manifest.ts:30)) a révélé **F1 racine** : `EXECUTE_FRAMEWORK` exposé en Intent public au même rang que `EXECUTE_GLORY_SEQUENCE`.

```ts
acceptsIntents: ["EXECUTE_FRAMEWORK", "EXECUTE_GLORY_SEQUENCE"]
```

**Pourquoi c'est une faille** : framework et sequence ne sont pas commensurables.

- **Framework** = atome (1 LLM call → 1 score JSON), pas de promotion BrandAsset, pas de writeback uniforme, pas de journal d'exécution
- **Sequence** = orchestration (N steps hétérogènes incluant `type: "ARTEMIS"` qui wrappe un framework), promotion BrandAsset, writeback `pillar.content`, journal, hash chain via `gloryOutputIds`, mode flag, quality gate

Une sequence **peut contenir** un framework comme step ; l'inverse n'a aucun sens. Mettre les deux au même rang d'Intent public introduit la dette de rigueur F1+F11 (et amplifie F2, F3, F4 par cascade) :

- Mestor peut router des frameworks isolés sans contexte de sequence parent → orphelins dans le hash chain
- `IntentEmission` n'a pas de pointer `parentSequenceExecutionId` pour ces appels
- Aucune garantie qu'un framework appelé seul produise un livrable BrandAsset cohérent
- F11 jumeau : `triggerNextStageFrameworks` ([artemis/index.ts:305](../../../src/server/services/artemis/index.ts:305)) bypasse Mestor en appelant `runDiagnosticBatch` direct, fire-and-forget avec `.catch(...)` qui swallow les erreurs

## Décision

### §1 — Sequence devient l'unité publique unique d'Artemis

`acceptsIntents` du manifest Artemis ne contient plus que `"EXECUTE_GLORY_SEQUENCE"`. `EXECUTE_FRAMEWORK` est retiré.

```ts
// artemis/manifest.ts (après)
acceptsIntents: ["EXECUTE_GLORY_SEQUENCE"]
```

Les capabilities `executeFramework`, `runDiagnosticBatch`, `runPillarDiagnostic` du manifest sont marquées `internal: true` (nouveau flag ajouté à `defineManifest` schema). `internal: true` signifie : appelable uniquement depuis paths whitelist (`sequence-executor.ts` + `framework-wrappers.ts`).

### §2 — Renommage `RUN_ORACLE_FRAMEWORK` → `RUN_ORACLE_SEQUENCE`

Le Intent kind émis par `enrich-oracle.ts` ([enrich-oracle.ts:824-833](../../../src/server/services/strategy-presentation/enrich-oracle.ts:824)) est renommé. Signature avant/après :

```ts
// AVANT
| { kind: "RUN_ORACLE_FRAMEWORK"; strategyId: string; frameworkSlug: string; input: Record<string, unknown> }

// APRÈS
| { kind: "RUN_ORACLE_SEQUENCE"; strategyId: string; sequenceKey: GlorySequenceKey; input: Record<string, unknown>; mode?: SequenceMode }
```

Le commandant Artemis ([commandant.ts:545](../../../src/server/services/artemis/commandant.ts:545)) handler `runOracleFramework` est remplacé par `runOracleSequence` qui appelle `executeSequence(...)`.

Pas de période de coexistence — c'est un mégasprint atomique. Tous les call sites migrés en même temps que le retrait.

### §3 — Helper `wrapFrameworkAsSequence` pour appels framework legacy

Quand un caller veut tourner un framework isolément (tests, debug, triggers post-pillar.validate), il passe par une sequence single-step `WRAP-FW-<slug>` générée à la volée via `wrapFrameworkAsSequence(frameworkSlug)`.

```ts
// src/server/services/artemis/tools/framework-wrappers.ts (NEW)
export function wrapFrameworkAsSequence(frameworkSlug: string): GlorySequenceDef {
  const fw = getFramework(frameworkSlug);
  if (!fw) throw new Error(`Unknown framework: ${frameworkSlug}`);
  return {
    key: `WRAP-FW-${frameworkSlug}` as GlorySequenceKey,
    family: "WRAP",
    name: `Wrap: ${fw.name}`,
    description: `Single-step wrap autour du framework ${frameworkSlug}`,
    pillar: fw.pillarKeys[0],
    steps: [artemisStep(frameworkSlug, fw.name)],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: fw.dependencies.map(dep => ({ type: "FRAMEWORK", slug: dep, status: "COMPLETE" })),
    lifecycle: "DRAFT",
    mode: "ENRICHMENT",
  };
}

export const WRAP_SEQUENCES: GlorySequenceDef[] = FRAMEWORKS.map(fw => wrapFrameworkAsSequence(fw.slug));
```

Branchées dans `ALL_SEQUENCES` ([sequences.ts:1068](../../../src/server/services/artemis/tools/sequences.ts:1068)). Famille `"WRAP"` ajoutée à `GlorySequenceFamily` type union.

### §4 — Fermeture F11 : `triggerNextStageFrameworks` → `triggerNextStageSequences`

[artemis/index.ts:305-336](../../../src/server/services/artemis/index.ts:305) refondue pour émettre via `mestor.emitIntent` au lieu d'appeler `runDiagnosticBatch` direct :

```ts
export async function triggerNextStageSequences(
  strategyId: string,
  completedPillarKey: string,
): Promise<void> {
  const PHASE_TRIGGERS: Record<string, GlorySequenceKey[]> = {
    a: ["WRAP-FW-fw-22-risk-matrix", "WRAP-FW-fw-12-tam-sam-som", /* … */],
    // …
  };
  const sequenceKeys = PHASE_TRIGGERS[completedPillarKey.toLowerCase()] ?? [];
  for (const key of sequenceKeys) {
    await emitIntent({ kind: "EXECUTE_GLORY_SEQUENCE", strategyId, sequenceKey: key, mode: "ENRICHMENT" });
  }
}
```

Erreurs remontent dans `IntentEmission.status = "FAILED"` (plus de `.catch(...)` swallow). Hash chain présent. Loi 1 altitude vérifiable.

### §5 — Suppression endpoints publics framework

- [src/server/trpc/routers/framework.ts:73](../../../src/server/trpc/routers/framework.ts:73) — procedure `executeFramework` supprimée. Remplacement : `executeSequence(sequenceKey: GlorySequenceKey)` qui appelle `mestor.emitIntent({ kind: "EXECUTE_GLORY_SEQUENCE", … })`.
- [src/server/mcp/artemis/index.ts:33](../../../src/server/mcp/artemis/index.ts:33) — endpoint MCP `executeFramework` supprimé. Remplacement : `executeSequence`.

Callers tiers (front, MCP clients externes) doivent migrer vers `executeSequence`. Pour un framework isolé : `executeSequence("WRAP-FW-<slug>")`.

### §6 — Anti-drift CI

Test bloquant `tests/unit/governance/artemis-hierarchy.test.ts` :

```ts
test("EXECUTE_FRAMEWORK Intent kind is removed from manifest", () => {
  expect(artemisManifest.acceptsIntents).not.toContain("EXECUTE_FRAMEWORK");
});

test("no caller invokes executeFramework outside whitelist", async () => {
  const callers = await listCallers("executeFramework");
  for (const c of callers) {
    expect(c.file).toMatch(/sequence-executor\.ts|framework-wrappers\.ts/);
  }
});
```

## Conséquences

### Bénéfices

- **Hiérarchie unique** : sequence est l'API publique. Framework est composant interne.
- **F1 + F11 fermées** : plus de bypass Mestor possible côté framework.
- **F2/F3/F4 dé-blockées** : avec `EXECUTE_FRAMEWORK` retiré, le mutex `SectionEnrichmentSpec.glorySequence` (cf. [ADR-0040](0040-uniform-section-sequence-migration.md)) devient implémentable au type-level.
- **Symétrie gouvernance** : tous les flows passent par `mestor.emitIntent` → audit complet, hash chain, IntentEmission avec status.

### Coûts

- **Migration brutale** : pas de période de coexistence. Tout caller existant doit être migré dans le même sprint.
- **24 wrappers `WRAP-FW-*`** auto-générés gonflent `ALL_SEQUENCES`. Helpers `getSequencesByFamily` filtrent → impact perf négligeable.
- **Coût LLM identique** : un wrapper single-step → 1 framework call → même coût qu'avant. Pas de surcoût direct.

### Risques

- **Callers tRPC/MCP** non migrés cassent en hard. Mitigation : audit complet pre-merge des callers `executeFramework` (~10 sites identifiés via grep).
- **`triggerNextStageSequences`** émet 4-7 Intents par pillar.validate() là où `triggerNextStageFrameworks` faisait 1 batch. Surcharge Mestor négligeable (< 100 ms supplémentaires).

## Open work

Aucun. L'invariant est posé en bloc.

## Références implémentation

- Fichiers modifiés : [artemis/manifest.ts](../../../src/server/services/artemis/manifest.ts), [artemis/index.ts](../../../src/server/services/artemis/index.ts), [artemis/commandant.ts](../../../src/server/services/artemis/commandant.ts), [mestor/intents.ts](../../../src/server/services/mestor/intents.ts), [enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts), [trpc/routers/framework.ts](../../../src/server/trpc/routers/framework.ts), [mcp/artemis/index.ts](../../../src/server/mcp/artemis/index.ts)
- Fichiers nouveaux : [framework-wrappers.ts](../../../src/server/services/artemis/tools/framework-wrappers.ts)
- Tests nouveaux : `tests/unit/governance/artemis-hierarchy.test.ts`
- Mégasprint plan : `~/.claude/plans/les-sections-mckinsey-7s-bcg-portfolio-e-kind-floyd.md`
