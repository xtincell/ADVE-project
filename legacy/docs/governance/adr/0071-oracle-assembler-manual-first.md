# ADR-0071 — Oracle Assembler manual-first orchestrator (Phase 21 F-D)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-D — Assembler manual-first orchestrator
**Depends on** : ADR-0060 (LLM as UI orchestrator manual-first), ADR-0067 (LLM enforcement F-A), ADR-0068 (OracleSection F-B), ADR-0070 (GENERATE_ORACLE_SECTION F-C)
**Enables** : F-E (NSP SSE streaming), F-F (UI progressive)

## Contexte

L'Assembler Oracle existe déjà sous le nom `enrichOracle` dans [`strategy-presentation/enrich-oracle.ts`](../../src/server/services/strategy-presentation/enrich-oracle.ts) (~1300 lignes). Il dispatche **inline** : boucle sur sections et appelle directement `executeSequence` / `executeFramework` / `executeTool`.

C'est l'anti-pattern que la Phase 21 F-D doit fermer. Conséquences du legacy inline :

- L'opérateur clique "Assembler L'Oracle" → bloc opaque pendant N secondes.
- Pas de retry par section — un échec individuel propage en bloc.
- Pas de génération manuelle équivalente — l'opérateur n'a pas de chemin pour générer §07 seule.
- **Violation manual-first parity (ADR-0060)** — le chemin "tout assembler" et le chemin "générer une seule section" emprunteraient des codes différents.

## Décision

**Nouveau Intent kind `ASSEMBLE_ORACLE`** gouverné par ARTEMIS, avec orchestrator dans [`oracle-section/assembler.ts`](../../src/server/services/oracle-section/assembler.ts) qui **émet `GENERATE_ORACLE_SECTION` × N** au lieu de dispatcher inline.

### Invariant manual-first parity

Le handler `ASSEMBLE_ORACLE` n'appelle JAMAIS directement :
- `executeStructuredLLMCall`
- `executeSequence`
- `executeFramework`
- `executeTool`
- `callLLM` / `callLLMAndParse`

Il émet uniquement `mestor.emitIntent({ kind: "GENERATE_ORACLE_SECTION", ... })`.

**Test bloquant `assembler-uses-manual-path.test.ts`** mode HARD (pas de baseline) — toute violation fait FAIL la CI.

### Intent payload

```ts
| {
    kind: "ASSEMBLE_ORACLE";
    strategyId: string;
    scope: "ALL" | "MISSING" | "STALE" | readonly number[];
    operatorId: string;
  }
```

### Scopes

| Scope | Filtre | Mode auto-détecté par section |
|-------|--------|------------------------------|
| `ALL` | Toutes les 35 sections | PENDING→FRESH, COMPLETE→REGEN, FAILED/STALE→RETRY |
| `MISSING` | Sections `status=PENDING` uniquement | FRESH |
| `STALE` | Sections `status=STALE` ou `FAILED` | RETRY |
| `number[]` | sectionIds explicites | Auto-détecté par section |

### Resilient by design

L'orchestrator capture les erreurs par section (try/catch dans la boucle). Un FAILED individuel ne bloque pas les suivants. Status global :

- `COMPLETE` — zéro échec
- `PARTIAL` — au moins un échec, au moins un succès
- `EMPTY` — scope vide ou tout échoué

Le SLO `errorRatePct: 0.10` est plus tolérant que `GENERATE_ORACLE_SECTION` (0.05) pour refléter cette résilience (l'orchestrator ne fail pas si une section fail).

### tRPC procedure

```ts
oracle.assembleOracle.mutation({
  strategyId,
  scope: "ALL" | "MISSING" | "STALE" | sectionIds[]
})
```

Émet l'Intent via `mestor.emitIntent()` — LOI 1 conservée.

### SLO budget

```ts
{ kind: "ASSEMBLE_ORACLE", p95LatencyMs: 250_000, errorRatePct: 0.10, costP95Usd: 1.0 }
```

p95 250s = ~10 sections séquentielles à 25s chacune (scope partiel typique). Cost p95 1.0$ = ~10 × 0.10$. Pour scope=ALL (35 sections), latence et cost dépassent ce budget — c'est documenté dans l'UI (warning + progress bar).

## Cap APOGEE

**7/7 préservé.** ARTEMIS gouverne. Aucun nouveau Neter, aucune nouvelle entité business. Pure orchestration au-dessus de F-C (`GENERATE_ORACLE_SECTION`).

## Coexistence avec `enrichOracle` legacy

Cette ADR n'implémente PAS la suppression de `enrichOracle`. Le legacy reste fonctionnel pour les surfaces UI qui ne sont pas encore migrées (notamment le bouton "Assembler L'Oracle" actuel sur la page Oracle, qui appellera la nouvelle procédure dans F-F). Une fois F-F shipped + audit completion, `enrichOracle` sera deprecated formellement (suite mégasprint).

## Tests anti-drift (12 tests passing)

[`tests/unit/governance/assembler-uses-manual-path.test.ts`](../../tests/unit/governance/assembler-uses-manual-path.test.ts) :

**Manual-first parity (mode HARD, pas de baseline)** :
- Pas d'`executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM` / `callLLMAndParse` dans `assembler.ts` (modulo commentaires explicatifs).
- Émission `GENERATE_ORACLE_SECTION` via `emitIntent` confirmée.
- Boucle `for ... try/catch` resilient confirmée.
- Les 4 scope variants (ALL/MISSING/STALE/explicit) implémentés.
- Auto-détection de mode (PENDING→FRESH, COMPLETE→REGEN, FAILED/STALE→RETRY).
- Summary structuré { total, succeeded, failed, overallStatus, results }.

**Intent kind + dispatch + tRPC** :
- Intent kind enregistré (governor=ARTEMIS, handler=oracle-section, async=true).
- SLO budget présent (errorRate ≤ 10%, resilient by design).
- Mestor commandant ARTEMIS dispatch case présent.
- `intentTouchesPillars` retourne `[]`.
- tRPC `oracle.assembleOracle` mutation enregistrée.

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — orchestrator complet (4 scopes + auto-mode + status global), pas un MVP "ALL only".
- **Pas d'économie de tokens** — handler entièrement documenté, test bloquant détaille les patterns interdits.
- **Profondeur > raccourci** — orchestrator séquentiel pour cette première vague (ne pas prématurément optimiser le parallélisme avant que F-E SSE soit là pour la backpressure UI).

## Suite

- **F-E** — Progress streaming via NSP SSE channel `oracle:strategy:{id}` + events `section.STARTED/.PROGRESS/.COMPLETED/.FAILED` + `assembler.PROGRESS/.DONE`. Permettra à l'UI de voir l'avancement sans pull.
- **F-F** — Page `/cockpit/{brand}/oracle` refit consomme `oracle.listSections` + `oracle.generateSection` + `oracle.assembleOracle` + stream SSE. Bouton "Assembler" devient transparent (le user voit chaque section qui passe à GENERATING/COMPLETE/FAILED en live).
- **Suite cleanup** : deprecation formelle de `enrichOracle` legacy après F-F audit.
- **Optimisations futures** (F-D-suite si besoin) : parallélisme borné par batch + topoSort par `runner.dependsOn`.
