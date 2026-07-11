# ADR-0124 — Spine d'émission unifié : `emitIntent` porte la même gouvernance que `governedProcedure`

**Status** : Accepted
**Date** : 2026-07-11
**Phase** : inspection noyau NEFER 2026-07-11 (mandat opérateur « réparer le problème de fond »)
**Depends on** : ADR-0004 (hash-chain), ADR-0038 (gates + post-conditions), ADR-0082 (Yggdrasil Q1/Q2/Q3), ADR-0085 (refresh STOP)
**Enforced by** : `tests/unit/governance/emission-spine-unified.test.ts` (HARD) + `yggdrasil-three-invariants.test.ts` (Q1 renforcé)

## Contexte — le problème de fond

L'audit du noyau (2026-07-11) a révélé **deux chemins de mutation de force
inégale**, alors que la doctrine (Yggdrasil Q1/Q2/Q3, Lois 1 et 3 d'APOGEE)
décrit UN point de passage :

| Mécanique | `governedProcedure` (tRPC, 502 sites) | `mestor.emitIntent` (bus, 109 sites) |
|---|---|---|
| Hash-chain `prevHash`/`selfHash` (Loi 1) | ✅ | ❌ selfHash null → rows **exclues** de la vérification anti-tamper |
| Persistance de l'émission | ✅ bloquante | ❌ best-effort — une panne DB laissait passer une mutation **non tracée** |
| Statut de la row | ✅ PENDING→OK/… | ❌ restait `PENDING` à vie |
| Cost-gate Thot (Loi 3) | ✅ VETO/DOWNGRADE réels | ❌ (`validateExecution` = stub Phase 0 « always ok ») |
| Événements bus → observation Seshat (Q2) | ✅ | ❌ aucun événement → `observationStatus` figé `PENDING_OBSERVATION` |

Aggravants découverts au même audit :

1. **Vérificateur de chaîne mort-né** : `verifyChain` recomputait le hash avec
   le `result` **post-complétion**, alors que `selfHash` est calculé à
   l'émission avec `result: null` — chaque intent complété aurait été flaggé
   « altéré ». Le commentaire de `hash-chain.ts` (« rows written from
   mestor.emitIntent ») était factuellement faux.
2. **Ledger Thot double-mort** : le subscriber `recordCost` de `bootstrap.ts`
   attendait `costUsd` sur `intent.completed` (jamais publié) et appelait
   `financial-brain.recordCost` (n'existait pas).
3. **Verdict `DOWNGRADED` du manipulation-gate avalé** : `emitIntent` ne
   testait que `VETOED` — un override opérateur passait sans warning, sans
   trace, sans incrément de `Strategy.mixViolationOverrideCount`.
4. **Chaîne empoisonnée par interleaving** : `preEmitIntent` lisait la
   *dernière row* (même non hashée) → toute row chemin-B intercalée réamorçait
   `prevHash=null` et cassait la continuité du walk filtré.
5. **Observation partielle** : seule `intent.completed` était souscrite — les
   émissions FAILED/VETOED/DOWNGRADED restaient `PENDING_OBSERVATION` à vie,
   alors que le prédicat pur `nextObservationStatus` sait les router.
6. D'autres writers directs de `IntentEmission` (cron sentinels, router
   governance compensate, ledgers artemis/brand-vault/founder-psychology)
   créaient des rows hors chaîne.

## Décision

### 1. Un spine canonique unique — `src/server/governance/emission-spine.ts`

`openEmission()` / `closeEmission()` deviennent LA mécanique d'émission,
consommée par les deux chemins (`governed-procedure.ts` garde uniquement
l'operator-binding et la traduction TRPCError ; `mestor/intents.ts` l'utilise
en lazy-import) :

- **openEmission** : transaction + `pg_advisory_xact_lock(hashtext(strategyId))`
  (sérialise les ouvertures par stratégie — les `spawnedIntents` fire-and-forget
  ne fourchent plus la chaîne), lecture du dernier `selfHash` **non-null**
  (les rows legacy sont enjambées, plus de réamorçage à null), calcul
  `computeSelfHash` sur le périmètre scellé à l'émission (`result: null`),
  row `PENDING` + `startedAt`, event `intent.proposed` après commit.
  **Jette `EmissionPersistError`** — plus jamais de best-effort.
- **closeEmission** : statut + result + completedAt (+ `costUsd` quand
  réellement connu — jamais un estimé), puis événement terminal
  (`completed`/`failed`/`vetoed`/`downgraded` ; `QUEUED` silencieux).

### 2. `emitIntent` fail-closed + cost-gate + DOWNGRADED tracé

- **Q1 fail-closed** : émission impersistable ⇒ AUCUN dispatch, résultat
  `FAILED reason=EMISSION_PERSIST_FAILED`. Pas de trace ⇒ pas de mutation.
- **Loi 3** : cost-gate Thot (`assertCostGate` + `persistCostDecision`,
  partagés avec le chemin tRPC) quand un operatorId est résolvable (options du
  caller ou payload de l'Intent) ET que la capability manifest déclare un
  coût. VETO ⇒ dispatch refusé (`reason=COST_GATE`) ; DOWNGRADE ⇒ dispatch,
  row marquée `DOWNGRADED`, warning sur le résultat.
- **Manipulation DOWNGRADED** : warning sur `IntentResult.warnings` +
  incrément `Strategy.mixViolationOverrideCount` (best-effort sur les pivots
  `MARKET:<code>`). Le statut du RÉSULTAT rendu au caller reste celui du
  handler — un override assumé ne casse pas les flows `emitIntentTyped` ; la
  vérité de gate vit sur la ROW (même règle que le chemin tRPC).
- Les 3 gate-vetos existants ferment désormais via `closeEmission` (donc
  publient `intent.vetoed` — observables).

### 3. Vérificateur réparé — la chaîne scelle l'ÉMISSION

`verifyChain` recompute avec `result: null`. Le périmètre scellé = ordre +
kind + payload + caller + emittedAt + prevHash. Le `result`, écrit plus tard
par `closeEmission`, est mutable par design et HORS chaîne (l'intégrité du
result est un chantier distinct, non couvert — dit honnêtement).

### 4. Boucle d'observation complète + ledger Thot vivant

- `bootstrap.ts` souscrit `observeIntent` aux **4 états terminaux**.
- `financial-brain/record-cost.ts` : `recordCost({intentId, costUsd})`
  accumule le coût réalisé sur `IntentEmission.costUsd` (COALESCE explicite).
  Le spine publie `costUsd` quand fourni. **Trou déclaré** : aucun producteur
  ne fournit encore un coût réalisé par-intent (le tracking LLM n'est pas
  attribué par émission) — le transport et le consommateur existent, le
  producteur est un follow-up. Aucun chiffre inventé entre-temps.

### 5. Writers directs reroutés ou déclarés

- **Reroutés** : cron sentinels (`emit()` → `openEmission`), router governance
  `compensate` (→ `openEmission`+`closeEmission` — les Intents compensateurs
  de la Loi 1 sont eux-mêmes chaînés).
- **Allowlist « à mes risques et périls »** (pattern C5, purgeable) :
  `artemis/tools/engine.ts` (2), `brand-vault/engine.ts` (5),
  `founder-psychology/index.ts` (1) — ledgers synthétiques antérieurs au
  spine, `reroutePlanned: true`.

## Conséquences

- Q1/Q2 (Yggdrasil) et Lois 1/3 (APOGEE) valent désormais sur les DEUX chemins.
- **Changement de comportement assumé** : une panne DB à l'émission REFUSE la
  mutation (avant : mutation non tracée). Un boot avant migrations échoue
  bruyamment au lieu de muter en silence — c'est voulu.
- Coût : +1 aller-retour (advisory lock) par émission chemin-B ; identique
  chemin-A (le lock remplace la lecture nue et corrige sa race pré-existante).
- Les chaînes existantes gardent leurs points de rupture historiques (rows
  legacy null skippées par le walk) ; elles guérissent en avant. Pas de
  backfill (réécrire l'histoire serait contraire à la Loi 1).
- Limitation connue : deux émissions dans la même milliseconde restent
  ambiguës pour le tri `emittedAt` du walk — follow-up possible : vérificateur
  qui marche par linkage `prevHash` au lieu du temps.

## Alternatives rejetées

- **Étendre `governedProcedure` pour absorber le bus** : impossible sans
  session tRPC ; le bus est appelé depuis services/cron/spawn.
- **Mutex in-process par stratégie** : casse en multi-instance serverless ;
  l'advisory lock Postgres est le canon.
- **Re-hasher à la complétion** : briserait les `prevHash` des enfants déjà
  chaînés ; le hash à double-état n'est pas une chaîne.
