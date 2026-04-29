# La Fusée — Framework modulaire (doctrine)

Ce document décrit le framework qui régit l'ajout, la composition et le
remplacement des modules de l'OS. Il complète
[ARCHITECTURE.md](ARCHITECTURE.md) (qui décrit *l'état*) en exprimant
*les invariants* et *les dettes connues*.

## Les 5 piliers du framework

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Layer 6: app/, components/                                  │
   │   ↑ consomme uniquement via tRPC                             │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 5: components/neteru/  (Neteru UI Kit)                │
   │   ↑ consomme useNeteru hook (NSP)                            │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 4: server/trpc/                                       │
   │   ↑ governedProcedure (eval preconditions) → emitIntent      │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 3: server/services/                                   │
   │   ↑ ne s'appellent QUE via Mestor (sauf whitelist)           │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 2: server/governance/                                 │
   │   manifests, registry, event-bus, mestor, NSP, tenant-db,    │
   │   hash-chain, pillar-readiness, intent-kinds, slos, …        │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 1: lib/                                               │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 0: domain/  (zero IO, zero Prisma, zod uniquement)    │
   └──────────────────────────────────────────────────────────────┘
```

Chaque module appartient à une couche. Imports descendants seulement.
Cycles interdits (madge). Pillar enum hardcodé interdit hors `domain/`.

### Pilier 1 — Identity (qui appelle ?)

- Tout traffic métier passe par `mestor.emitIntent(kind, payload)`.
- Chaque intent est tracé dans `IntentEmission` avec
  `(intentKind, strategyId, caller, prevHash, selfHash, status, costUsd)`.
- Hash-chain par `strategyId` → tampering détectable. Job cron
  hebdomadaire vérifie les 1000 dernières lignes.
- Strangler middleware (`auditedProcedure`) loggue les mutations des
  routers non-encore-migrés sous `kind="LEGACY_MUTATION"` —
  l'audit-trail est complet *même pendant* la migration des 70 routers.

### Pilier 2 — Capability (qui peut faire quoi ?)

- Chaque service co-localise un `manifest.ts` qui déclare :
  - `governor` (MESTOR/ARTEMIS/SESHAT/THOT/INFRASTRUCTURE)
  - `acceptsIntents` (les Intent kinds qu'il sait traiter)
  - `capabilities[]` avec, pour chacune :
    - `inputSchema` / `outputSchema` (Zod)
    - `sideEffects[]` (DB_WRITE / LLM_CALL / EXTERNAL_API / …)
    - `qualityTier` / `latencyBudgetMs` / `costEstimateUsd`
    - `preconditions[]` (gates de readiness — voir Pilier 4)
- Registry codegen (`scripts/gen-manifest-registry.ts`) → registre
  statique → tree-shakeable + auditable + plugin-compatible.
- ESLint custom rules :
  - `no-direct-service-from-router` (whitelist Mestor / pillar-gateway / …)
  - `no-hardcoded-pillar-enum`
  - `no-numbered-duplicates`
  - `no-cross-portal-import`
- Plugin externe : un dossier sous `plugins/<slug>/` avec son propre
  `manifest.ts` est mergé au registry au boot ; sandbox enforce les
  `sideEffects` déclarés.

### Pilier 3 — Concurrency (multi-tenant, idempotence)

- `tenantScopedDb(db, operatorId)` injecte `where: { operatorId }` sur
  *toutes* les opérations Prisma (findMany / findFirst / update /
  delete / create / count / aggregate / groupBy).
- Opt-out explicite via la whitelist `GLOBAL_TABLES` dans
  `src/server/governance/tenant-scoped-db.ts`.
- Capabilities marquent `idempotent: true` → le dispatcher peut retenter
  sans risque (utilisé en réplay de queue).
- `IntentQueue` pour les intents async : pickup par cron, status
  PENDING/RUNNING/DONE/FAILED.

### Pilier 4 — Pre-conditions (l'état du monde permet-il l'action ?)

C'est le pilier qui manquait avant ta question d'aujourd'hui.

- `src/server/governance/pillar-readiness.ts` est la *seule* source de
  vérité pour "ce pillar / cette strategy est-elle prête pour X ?"
- 5 gates : `DISPLAY_AS_COMPLETE`, `RTIS_CASCADE`, `GLORY_SEQUENCE`,
  `ORACLE_ENRICH`, `ORACLE_EXPORT`.
- Une capability déclare ses `preconditions[]` dans son manifest.
  `governedProcedure` les évalue *avant* d'invoquer le handler. Échec
  → `ReadinessVetoError` → `intent.vetoed` event → status `VETOED`.
- Le handler n'a *pas* besoin de re-checker ses inputs. La défense est
  centralisée et déclarative.
- L'UI consomme `pillar.readiness` (tRPC) — interdit d'inventer des
  maths de complétion ad-hoc. Les pages legacy qui font ça sont
  flaggées par `audit-preconditions.ts` (Phase 2 follow-up).

**Limite actuelle (dette ouverte)** : voir §"Dettes connues" plus bas.

### Pilier 5 — Streaming (prévisibilité visuelle)

- NSP (Neteru Streaming Protocol) — SSE sur `/api/nsp` avec resume
  cursor `?since=<iso>` et heartbeat 15s.
- `IntentEmissionEvent` persiste tous les `IntentProgressEvent` →
  replay complet possible après reconnexion.
- `useNeteru.intent(intentId)` côté client + 11 composants Neteru UI
  Kit (`MestorPlan`, `ArtemisExecutor`, `OracleEnrichmentTracker`, …).
- Pattern obligatoire : toute mutation > 300 ms doit rendre un
  composant Neteru UI Kit. `audit-preconditions.ts` flaggera les pages
  qui ne respectent pas (Phase 5 follow-up).

## Comment composer un nouveau module

```bash
# 1. scaffold
npm run manifests:scaffold -- --service=<slug> --name=<capability>

# 2. remplir 3 trous dans le stub
#    - inputSchema / outputSchema (Zod)
#    - sideEffects + preconditions
#    - corps de la fonction

# 3. régénérer le registry
npm run manifests:gen

# 4. test + audit
npm test
npm run audit:governance
npm run audit:preconditions
```

Le module est "shippable" quand :
- manifest passe `manifests:audit`
- ses préconditions sont déclarées (ou opt-out justifié)
- il a au moins 1 test
- il a un SLO dans `src/server/governance/slos.ts` (ou exemption)
- la PR a un label `phase/<n>` (cf. REFACTOR-CODE-OF-CONDUCT.md)

## Dettes adressées (closes)

Toutes les dettes listées ici sont fermées par le commit "purge debts"
(suivi de "ship Phases 0-8" + "pillar-readiness"). Le journal
historique reste pour la traçabilité.

### D-1. `StrategyLifecyclePhase` câblé ✓

`src/server/governance/strategy-phase.ts` expose
`getCurrentPhase(strategyId)` qui lit les signaux concrets (ADVE
maturity stage, validationStatus, Notoria pipeline stage,
OracleSnapshot count) et retourne la phase canonique
(INTAKE/BOOT/OPERATING/GROWTH) avec les blockers explicites pour
atteindre la phase suivante.

Le module **ne dépend pas** de `pillar-readiness` (pour éviter le
cycle) — il consomme directement l'assessor de `pillar-maturity`.

### D-2. Cache `Pillar.completionLevel` réconcilié ✓

`reconcileCompletionLevelCache(strategyId, pillarKey)` exporté par
`pillar-gateway` — appelé automatiquement à la fin de
`writePillarAndScore`. Le cache est désormais une *fonction pure* de
`(stage, validationStatus)` :

- LOCKED → FULL
- COMPLETE + non-LOCKED → COMPLET
- sinon → INCOMPLET

L'ancienne heuristique ad-hoc dans `notoria/lifecycle.ts` (fillRate ≥
0.9 + R+T appliquées) est supprimée — Notoria délègue à la gateway.

### D-3. 6 sources consolidées ✓

`evaluatePillarReadiness` lit maintenant les 6 colonnes :
- `content` (input du Zod strict + Zod partial)
- `validationStatus`
- `completionLevel` (cache — vérifié par `cacheConsistent`)
- `staleAt` (déclenche `PILLAR_STALE` reason sur tous les gates)
- maturity `stage` (assessor)
- (et accepte la phase lifecycle pour moduler les seuils)

Toute divergence du cache vs verdict canonique remonte un blocker
strategy-level avec reason `CACHE_DIVERGENCE`.

### D-4. Lint rule active ✓

`lafusee/no-adhoc-completion-math` détecte trois patterns :
- `<completionIdent> === 100` ou `>= 100`
- `filledCount / total * 100`
- `validationStatus === "VALIDATED" | "LOCKED"` hors gouvernance

Opt-out via `// lafusee:allow-adhoc-completion`. Severity warn (Phase
4 → error).

### D-5. Routers critiques migrés ✓

`enrichOracle`, `enrichOracleNeteru` (strategy-presentation) et
`generateBatch` (notoria) consomment `governedProcedure({kind,
inputSchema, preconditions})`. Les pré-conditions des manifests
firent automatiquement avant le handler.

Les autres routers restent sous `auditedProcedure` strangler — audit
intégral, mais pré-conditions non évaluées tant qu'ils ne migrent
pas. Migration progressive sous label `phase/3-router-batch-N`.

### D-6. Mapping event-driven actif ✓

Le bootstrap inscrit deux listeners :
- `pipeline.stage-advanced` (publié par
  `notoria/pipeline.advancePipeline`)
- `pillar.written` (publié par `pillar-gateway.writePillarAndScore`)

Sur chaque event, le bus appelle `getCurrentPhase` et publie
`strategy.phase-changed` si la phase a évolué. NSP peut donc streamer
la transition à l'UI.

## Dettes restantes / acceptées

- **Routers non-critiques** (≈ 65 sur 71) restent sous strangler
  uniquement. Audit OK, pré-conditions non vérifiées. Migration
  trunk-based, batch par batch.
- **Lint warns** : 245 warns du `audit-governance` (router-bypass +
  hardcoded-pillar-enum dans UI legacy). Convertis en errors à la fin
  de la migration des routers.

## Invariants vérifiés à chaque CI run

- `tsc --noEmit` clean
- 0 cycle (madge)
- 0 secret committé
- `audit-governance` : 0 erreur (warns acceptés sous quota)
- `audit-preconditions` : 0 finding (warn-only Phase 3, error fin Phase 4)
- `manifests:audit` : 0 erreur
- Hash-chain `IntentEmission` cohérent (cron hebdo)
- Phase label sur PR (sauf `out-of-scope` justifié)

## Ce que le framework NE garantit pas (encore)

- L'absence de bugs métier dans les handlers eux-mêmes (le framework
  n'introspecte pas le code business).
- La cohérence sémantique des recos Notoria (un opérateur peut
  accepter une reco contradictoire avec une autre — c'est business).
- L'isolation cross-region (multi-tenant ≠ multi-region — Phase
  ultérieure si scale-out hors d'un seul Postgres).

Le framework est conçu pour rendre les **bugs structurels** détectables
ou impossibles. Les bugs métier restent du ressort des tests
d'invariants spécifiques (cf. `tests/integration/`).
