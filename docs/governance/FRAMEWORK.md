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

## Dettes connues (à ne pas masquer)

### D-1. `StrategyLifecyclePhase` orphelin

`src/domain/lifecycle.ts` définit `INTAKE → BOOT → OPERATING → GROWTH`
mais **aucun runtime ne lit / écrit cette phase**. La phase est
implicite, dispersée :

- `Strategy.notoriaPipeline.currentStage` (JSON, 3 stages
  ADVE_UPDATE → I_GENERATION → S_SYNTHESIS — pipeline Notoria, **pas**
  lifecycle)
- `boot-sequence` a sa propre notion de step
- `mestor/hyperviseur.ts` hardcode `phase: "BOOT"`

**Impact** : `pillar-readiness` ne tient pas compte de la phase. Une
stratégie en INTAKE devrait passer ORACLE_ENRICH avec ENRICHED, mais
en OPERATING devrait exiger COMPLETE. Pour l'instant, seuils figés
sur "ENRICHED" pour ORACLE_ENRICH — donc on se trompe peut-être trop
strict en INTAKE et trop laxiste en OPERATING.

**Action** : créer `src/server/governance/strategy-phase.ts` avec une
fonction `getCurrentPhase(strategyId)` qui lit les signaux concrets et
retourne la phase canonique. La phase devient input de
`getStrategyReadiness`. Phase 3 follow-up label `phase/3-lifecycle`.

### D-2. Cache `Pillar.completionLevel` divergeable

Notoria écrit `completionLevel` (`INCOMPLET | COMPLET | FULL`) après
chaque `applyRecos`. Mais :

- `pillar.updateFull` / `pillar.updatePartial` écrivent le contenu
  *sans* recalculer le cache.
- `pillar.transitionStatus` change `validationStatus` *sans* toucher
  le cache.
- L'UI legacy lit le cache et peut afficher `COMPLET` après une
  régression de contenu.

**Action** : centraliser le recompute du cache dans
`pillar-gateway.writePillarAndScore` (qui est déjà l'unique entry
point d'écriture, en théorie). Ajouter un test cross-source dans
`pillar-readiness.test.ts` qui bombarde `(applyRecos → updateFull →
applyRecos)` et vérifie que les 6 sources convergent. Phase 4
follow-up.

### D-3. 6 sources de vérité de "complete"

Le module `pillar-readiness` consolide *4* signaux (Zod strict,
Zod partial, maturity stage, validationStatus). Il manque
explicitement :

- `Pillar.completionLevel` (cache Notoria)
- `Pillar.staleAt` (staleness propagator)

**Action** : étendre `evaluatePillarReadiness` pour les inclure et
détecter les divergences (`cacheConsistent: bool`). Aujourd'hui
ignorées. Phase 4 follow-up couplé à D-2.

### D-4. Lint rule manquante

Aucune règle ESLint n'interdit l'invention de maths de complétion ad-hoc
côté UI (`filledCount / SECTIONS.length`, `completion === 100`, etc.).
3 pages legacy le font.

**Action** : ajouter `lafusee/no-adhoc-completion-math` qui détecte
ces patterns et redirige vers `pillar.readiness` tRPC. Phase 7
follow-up.

### D-5. Routers non-migrés sur `governedProcedure` explicite

69/71 routers ont la strangler middleware (auditedProcedure) mais
*aucun* router métier n'utilise encore `governedProcedure` avec un
`kind` explicite. Conséquence : les pré-conditions du manifest ne
sont *pas* évaluées tant que les routers n'ont pas migré.

**Action** : migrer router-par-router en suivant l'ordre prioritaire
dans REFONTE-PLAN.md §Phase 3 (pillar.ts → strategy.ts → jehuty.ts →
seshat-search.ts → notoria.ts → ingestion.ts → reste). Chaque PR
labelée `phase/3-router-batch-N`. Le strangler reste actif partout
ailleurs jusqu'à ce que la migration soit terminée — zero perte
d'audit.

### D-6. Phases lifecycle ↔ Notoria pipeline ↔ Boot sequence non unifiés

3 state machines parallèles décrivent l'avancement d'une marque :

- `StrategyLifecyclePhase` (concept, non câblé) — D-1
- `notoriaPipeline.currentStage` (cache JSON, 3 stages)
- `boot-sequence step` (en mémoire pendant le boot)

Aucune relation typée entre elles. Le risque : le pipeline Notoria
finit le stage S_SYNTHESIS, mais la stratégie reste perçue comme
"BOOT" par d'autres parties du système.

**Action** : créer un *event-driven* mapping. À chaque transition
Notoria pipeline → publish `pipeline.stage-advanced` sur Event bus →
le module `strategy-phase` écoute et détermine la phase canonique.
Phase 3 follow-up couplé à D-1.

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
