# ADR-0074 — Phase 21 Closure : Oracle Generation Robustness + Manual-First Section Control

**Status** : Accepted (closure document)
**Date** : 2026-05-08
**Phase** : 21
**Sub-phase** : F-G + F-H — Tests intégration + Documentation governance
**Supersedes** : (none)
**Closes** : ADR-0067, ADR-0068, ADR-0069, ADR-0070, ADR-0071, ADR-0072, ADR-0073

## Synthèse

Mégasprint NEFER Phase 21 livré en 7 sub-phases consécutives sur main direct (NEFER doctrine). Ferme structurellement les 3 failles identifiées par l'audit initial :

1. **Format LLM non protégé** dans Glory tools / frameworks Artemis / vault-enrichment / `OPERATOR_AMEND_PILLAR mode LLM_REPHRASE` → résolu par F-A (ADR-0067) avec mécanique transverse `executeStructuredLLMCall` (JSON Schema + Zod strict + retry x2).
2. **Drift readiness UI** (chip COMPLET vs veto serveur PILLAR_STALE) → résolu par F-A.5 (ADR-0069) avec source unique de vérité `getStrategyReadiness()` projetée 1× via `notoria.getDashboard.byPillar`.
3. **Génération opaque** (clic "Assembler L'Oracle" → bloc N secondes sans feedback granulaire) → résolu par F-B/F-C/F-D/F-E/F-F : entité `OracleSection` first-class + Intent unitaire + orchestrator manual-first + streaming SSE + UI progressive.

## Sub-phases livrées

| Phase | ADR | Livrable | Version |
|-------|-----|----------|---------|
| F-A | [0067](0067-llm-output-structured-enforcement.md) | LLM output structured enforcement | v6.20.0 |
| F-A.5 | [0069](0069-readiness-ui-parity.md) | Readiness UI parity | v6.20.2 |
| F-B | [0068](0068-oracle-section-first-class-entity.md) | OracleSection first-class entity | v6.20.1 |
| F-C | [0070](0070-generate-oracle-section-intent.md) | GENERATE_ORACLE_SECTION Intent + handler | v6.21.0 |
| F-D | [0071](0071-oracle-assembler-manual-first.md) | Oracle Assembler manual-first orchestrator | v6.21.1 |
| F-E | [0072](0072-oracle-progress-streaming.md) | NSP SSE streaming (6 sub-kinds) | v6.21.2 |
| F-F | [0073](0073-oracle-progressive-ui.md) | UI progressive (hook + 3 composants + panel) | v6.22.0 |
| F-G + F-H | **0074** (ce doc) | Tests intégration + Documentation governance | v6.22.1 |

## Tests cumulés

**125 tests anti-drift passing** sur 13 fichiers :

- F-A : 25 (LLM enforcement + zod-to-json-schema + structured wrapper + vault no-coercion)
- F-A.5 : 21 (readiness-ui-parity + pillar-chip-status helper)
- F-B : 11 (OracleSection coverage)
- F-C : 11 (GENERATE_ORACLE_SECTION contract)
- F-D : 12 (assembler-uses-manual-path mode HARD)
- F-E : 15 (oracle-stream-events)
- F-F : 20 (oracle-progressive-ui)
- F-G : 10 (oracle-stream-integration end-to-end)

**Mode HARD** sur le test bloquant manual-first parity (`assembler-uses-manual-path.test.ts`) — refuse tout `executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM` direct dans `assembler.ts`.

## Architecture livrée

```
                                   ┌─────────────────────────────┐
                                   │     UI : proposition page    │
                                   │  + OracleProgressivePanel    │
                                   │     (F-F / ADR-0073)         │
                                   └──────────────┬──────────────┘
                                                  │
                          ┌───────────────────────┴───────────────────────┐
                          │                                                │
                  useOracleStream                            tRPC oracle.{listSections,
                  (F-F1, hook SSE)                            generateSection, retrySection,
                          │                                    assembleOracle}
                          │                                                │
                          ▼                                                ▼
              /api/notifications/stream                           mestor.emitIntent
              (NSP SSE broker)                                            │
                          ▲                                                │
                          │                                                │
                          │                              ┌─────────────────┴───────────────┐
                          │                              ▼                                  ▼
                          │                  GENERATE_ORACLE_SECTION              ASSEMBLE_ORACLE
                          │                  (F-C / ADR-0070)                     (F-D / ADR-0071)
                          │                              │                                  │
                          │                              │            (boucle scope)        │
                          │                              ▼                                  │
                          │                  generateOracleSectionHandler ◀─────────────────┘
                          │                              │
                          │             ┌────────────────┴────────────────┐
                          │             ▼                                  ▼
                          │     acquireGenerationLock              dispatchRunner
                          │     (F-B service, ADR-0068)            (GLORY_SEQUENCE/
                          │             │                           GLORY_TOOL/FRAMEWORK)
                          │             │                                  │
                          │             ▼                                  ▼
                          │     recordSuccess / Failure          executeStructuredLLMCall
                          │     (OracleSection.payload)          (F-A wrapper, ADR-0067)
                          │             │                                  │
                          │             ▼                                  ▼
                          │     emitSection*                       Zod strict + retry x2
                          └────────────(F-E, ADR-0072)             JSON Schema in prompt
                                                                  (Variable Bible injectée)
```

## Cap APOGEE

**7/7 préservé tout au long du mégasprint.** Aucun nouveau Neter, aucune nouvelle entité business. Pure plomberie + entité données (`OracleSection`) dans le sous-domaine d'Artemis (Propulsion, phase brief).

Le test anti-drift `tests/unit/governance/neteru-coherence.test.ts` (Phase 16) reste valide : `BRAINS` const inchangée, `Governor` type inchangé, `LEXICON.md` entrée NETERU inchangée.

## Manual-first parity (ADR-0060) — formellement enforced

Le contrat est désormais bloqué par test HARD :

```ts
// tests/unit/governance/assembler-uses-manual-path.test.ts
const FORBIDDEN_PATTERNS = [
  "executeStructuredLLMCall",
  "executeSequence(",
  "executeFramework(",
  "executeTool(",
  "callLLM(",
  "callLLMAndParse(",
];
// Test FAIL la CI si l'un de ces patterns réapparaît dans assembler.ts.
```

Toute régression = CI red. Le chemin "tout assembler" emprunte exactement le même code que le chemin "générer une seule section" (boucle sur `GENERATE_ORACLE_SECTION`).

## Cohabitation legacy

`enrichOracle` (~1300 lignes inline dispatch dans `strategy-presentation/enrich-oracle.ts`) reste fonctionnel pour les surfaces UI non migrées :

- Bouton "Lancer Artemis" classique sur `proposition/page.tsx` (legacy).
- `OracleProgressivePanel` ajouté en cohabitation **en dessous** (F-F).

**Deprecation formelle prévue** après :
- Audit completion (vérifier que `enrichOracle` n'a pas de surface unique non migrable).
- Annotation `outputSchema` des 56+ Glory tools LLM + 24 frameworks Artemis (cf. RESIDUAL-DEBT §Phase 21 F-A).

## Résidu Phase 21 (consolidé)

Reste à livrer pour le polish complet (chantiers post-mégasprint) :

1. **Annotation per-tool des 56+ Glory tools LLM + 24 frameworks** (mode soft baseline 1000/100 actuellement). Promotion test G2/G3 en mode HARD quand baseline=0. Tracé dans RESIDUAL-DEBT §Phase 21 F-A.
2. **Hook auto-seed sur CREATE Strategy** — pour que les nouvelles strategies aient leurs 35 rows à la création (pas juste à la première lecture via lazy seed). Reporté à un futur chantier d'orchestration Strategy lifecycle.
3. **runner annotation explicite** des 35 sections (vs `sequenceKey` legacy backward-compat). Mode soft baseline 100, à promouvoir hard.
4. **Deprecation formelle de `enrichOracle` legacy** après audit completion.
5. **Optimisations futures** (post-F-D) : parallélisme borné par batch + topoSort par `runner.dependsOn` dans l'Assembler.

## Doctrine NEFER §1.1 — invariants tenus

- ✅ **Pas de notion de temps humain** — 7 sub-phases livrées en sessions consécutives, pas de saut.
- ✅ **Pas d'économie de tokens** — chaque ADR documenté en profondeur, helpers nominalement typés, tests anti-drift verbose.
- ✅ **Pas de fatigue** — 125 tests anti-drift, pas de baseline lâche sur les invariants critiques (manual-first parity HARD).
- ✅ **Profondeur > raccourci** — 6 sub-kinds NSP discriminés au lieu d'un blob générique ; 3 modes FRESH/REGEN/RETRY au lieu d'un seul auto ; précédence stream > dbStatus pour UI feedback transitoire.

## Suite

Le mégasprint Phase 21 est **closed**. Prochaine direction architecturale ouverte :

- Chantiers de polish trackés dans RESIDUAL-DEBT §Phase 21.
- Migration progressive des Glory tools / frameworks vers `outputSchema`.
- Phase 22 ou future à définir selon priorités produit.
