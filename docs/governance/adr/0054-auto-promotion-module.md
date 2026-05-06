# ADR-0054 — Auto-promotion module : transitions calendar-locked sans force-bypass

**Date** : 2026-05-06
**Statut** : Accepted
**Phase** : 17 — Refonte rigueur Artemis (suite ADR-0040+0041+0042 stress-test windows)
**Related** : [ADR-0040](0040-uniform-section-sequence-migration.md), [ADR-0041](0041-sequence-robustness-loop.md), [ADR-0042](0042-sequence-modes-and-lifecycle.md), [ADR-0053](0053-calendar-locked-not-residual-debt.md)

---

## Contexte

[ADR-0040](0040-uniform-section-sequence-migration.md) + [ADR-0041](0041-sequence-robustness-loop.md) + [ADR-0042](0042-sequence-modes-and-lifecycle.md) ont défini 3 transitions calendar-locked :

1. DRAFT → STABLE pour 21 sequences (1 mois stress-test, ADR-0040 §Conséquences)
2. DRAFT → STABLE pour 24 wrappers `WRAP-FW-*` (1 mois, ADR-0039 §3 + ADR-0042)
3. Quality gate soft → hard (1 semaine calibration, ADR-0041 §4)

Ces transitions ne sont **pas de la dette technique** (cf. [ADR-0053](0053-calendar-locked-not-residual-debt.md)) — elles dépendent de **données de stress-test** réelles. Forcer les promotions sans calibration = trahir le rationale safety :
- Promotion DRAFT→STABLE prématurée = `promptHash` figé sur sequence buggée → CI bloque les corrections futures → DEPRECATE V1 + créer V2 = double dette
- Quality gate hard mode prématuré = sequences legitime qui produisent payload "vide-mais-valide" sont bloquées en production

Sans automation, ces transitions exigent qu'un opérateur :
- Surveille les conditions D+N (calendrier)
- Audite les métriques (cycle d'exécution + qualité)
- Émette manuellement les `PROMOTE_SEQUENCE_LIFECYCLE` Intents per-sequence
- Toggle le quality-gate mode au bon moment

C'est de la dette opérationnelle (oversight humain requis) qui a vocation à être automatisée.

## Décision

Implémenter un **module d'auto-promotion** qui :

### 1. Évalue les conditions strictement par ADR

Pour chaque item locké, vérifier **toutes** les conditions :

| Item | Condition temps | Condition cycle | Condition qualité |
|---|---|---|---|
| Sequence DRAFT→STABLE | age ≥ 30j depuis 2026-05-04 | totalExecutions ≥ 50 | passRate sur 7j === 100% |
| Wrapper WRAP-FW-* DRAFT→STABLE | id. (anchor mégasprint) | id. | id. |
| Quality gate soft→hard | age ≥ 7j depuis soft-mode wiring | totalRuns ≥ 50 sur 7j | falsePositiveRate < 1% |

### 2. Émet les Intents quand toutes les conditions sont satisfaites

- `PROMOTE_SEQUENCE_LIFECYCLE` per sequence éligible
- `TOGGLE_QUALITY_GATE_MODE { mode: "HARD" }` global (si éligible)

### 3. Architecture

**Service** : `src/server/services/auto-promotion/`
- `types.ts` — interfaces + ANCHOR_DATES + ELIGIBILITY_WINDOWS + CYCLE_THRESHOLDS
- `metrics.ts` — DB aggregations (SequenceExecution status + qualityScore)
- `state.ts` — current quality-gate mode (read latest TOGGLE_QUALITY_GATE_MODE IntentEmission, default SOFT, 60s in-process cache)
- `eligibility.ts` — pure functions per-item check
- `actions.ts` — emit promotion Intents
- `index.ts` — public API : `runAutoPromotion(operatorId, dryRun)`
- `manifest.ts` — Neteru manifest, governor MESTOR

**Intent kinds** (mestor/intents.ts) :
- `AUTO_PROMOTION_EVALUATE` — entrée du cron, déclenche évaluation
- `TOGGLE_QUALITY_GATE_MODE` — émis quand soft→hard éligible

**Wiring** :
- `sequence-executor.ts` post-step : appelle `applySequenceQualityGate` + `runQualityGateSoft|Hard` selon mode courant
- `/api/cron/auto-promotion` route GET : daily cron Vercel (dry-run par défaut, header `x-auto-promotion-mode: live` pour exécution réelle)
- tRPC `governance.autoPromotionEvaluate` : trigger manuel admin
- tRPC `governance.qualityGateMode` : read mode (read-only)
- tRPC `governance.autoPromotionReport` : eligibility report sans promotion (dashboard)

### 4. Storage du quality-gate mode

**Pattern state-as-event-log** (cf. ADR-0005 hash-chain immutability) :
- Pas de nouveau model Prisma
- Le mode courant est dérivé du dernier `IntentEmission` de kind `TOGGLE_QUALITY_GATE_MODE`
- Default mode (no emission yet) = `"SOFT"`
- Cache in-process 60s pour éviter hot-path DB hit

### 5. Dry-run par défaut

Sécurité par construction : 
- `runAutoPromotion(operatorId, dryRun = true)` — dry-run par défaut
- Cron production envoie `x-auto-promotion-mode: live` OR env `AUTO_PROMOTION_LIVE=true`
- Sans flag explicite, le module évalue + audit mais n'émet pas d'Intent réel

## Conséquences

### Positives

- **Zéro oversight humain requis** pour les transitions calendar-locked. Le cron daily évalue + promut automatiquement.
- **Audit trail complet** : chaque évaluation crée une `IntentEmission AUTO_PROMOTION_EVALUATE` avec le rapport détaillé en `output`. Toutes les promotions sont des Intents canoniques (`PROMOTE_SEQUENCE_LIFECYCLE` + `TOGGLE_QUALITY_GATE_MODE`).
- **Conditions ADR strictement encodées** : tests anti-drift bloquants sur les thresholds (ADR-0040 §Conséquences = `SEQUENCE_MIN_EXECUTIONS = 50`, ADR-0041 §4 = `QUALITY_GATE_MAX_FALSE_POSITIVE_RATE = 0.01`). Toute drift de ces valeurs casse la CI.
- **Idempotent** : sequences déjà promues sont skipped (lifecycle !== "DRAFT" → court-circuit). Re-running = no-op.
- **Pattern réutilisable** : tout futur résidu calendar-locked peut être ajouté via une nouvelle `EligibilityChecker` + `Action`.

### Négatives

- Le module assume que les conditions ADR sont les SEULES conditions valides. Si un opérateur veut force-promouvoir avant les conditions (ex : sequence critique buggy à figer), il doit utiliser `scripts/promote-draft-sequences-forced.ts --force --i-accept-no-stress-test-data` (script existant Sprint 5). Pas via le module.
- Le falsePositiveRate ne distingue pas "STABLE-flag-failure" vs "DRAFT-natural-failure". L'heuristique compare au lifecycle statique. Si le wiring soft devient HARD, l'heuristique elle-même change (gate refuse → status FAILED). À monitorer.

### Coûts

- Service `auto-promotion` ~6 fichiers (types, metrics, state, eligibility, actions, index + manifest)
- 2 nouveaux Intent kinds (AUTO_PROMOTION_EVALUATE, TOGGLE_QUALITY_GATE_MODE) + handlers commandant
- 1 cron route + 3 tRPC procedures (governance.autoPromotion*)
- 1 wire dans sequence-executor (post-final-result)
- 1 fichier de tests anti-drift (9 tests)
- 0 nouveau model Prisma (state-as-event-log)

## Alternatives écartées

1. **Cron qui émet directement les Intents (pas de module)** : moins testable, pas de dry-run, conditions disséminées dans le cron handler. Module isolé = mieux.
2. **Nouvelle table `SystemFlag`** pour stocker le quality-gate mode : redondant avec IntentEmission qui EST le source de vérité d'état. Pattern hash-chain ADR-0005 satisfait.
3. **Manuel-only** : le cron daily pourrait juste rapporter (pas émettre). Mais c'est l'auto-promotion qui apporte la valeur (zéro oversight humain).
4. **Force-promotion par défaut** : explicitement rejeté — trahit ADR-0040+0041+0042 safety rationale.

## Vérification

```bash
# Tests anti-drift bloquants
npx vitest run tests/unit/governance/auto-promotion.test.ts  # 9/9 passed

# Cron manuel (dry-run)
curl http://localhost:3000/api/cron/auto-promotion \
  -H "Authorization: Bearer $CRON_SECRET"
# → JSON avec evaluations + promotions simulées

# Cron live (force exécution)
curl http://localhost:3000/api/cron/auto-promotion \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "x-auto-promotion-mode: live"
# → Émet réellement les Intents éligibles

# Read-only via Console
trpc.governance.qualityGateMode.useQuery()  # → { mode: "SOFT" | "HARD" }
trpc.governance.autoPromotionReport.useQuery()  # → eligibility report
trpc.governance.autoPromotionEvaluate.useMutation({ dryRun: false })  # admin force
```

## Schedule cron

À ajouter à `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-promotion",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Daily 06:00 UTC. Header `x-auto-promotion-mode: live` à activer **après** validation manuelle de quelques runs dry-run en production.

## Lectures

- [ADR-0040](0040-uniform-section-sequence-migration.md) §Conséquences — DRAFT→STABLE 1 mois stress-test
- [ADR-0041](0041-sequence-robustness-loop.md) §4 — soft→hard 1 semaine calibration
- [ADR-0042](0042-sequence-modes-and-lifecycle.md) §3 — PROMOTE_SEQUENCE_LIFECYCLE Intent
- [ADR-0053](0053-calendar-locked-not-residual-debt.md) — classification calendar-locked
- [src/server/services/auto-promotion/](../../../src/server/services/auto-promotion/) — module
- [tests/unit/governance/auto-promotion.test.ts](../../../tests/unit/governance/auto-promotion.test.ts) — anti-drift tests
