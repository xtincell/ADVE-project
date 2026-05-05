# La Fusée — Refonte Governance "Sans Compromis"

## Context

La Fusée est un **Industry OS** (codé comme tel) bâti sur la méthode ADVE/RTIS, dont la vision est de transformer les marques en culte/phénomène culturel via l'accumulation de superfans qui font bouger la fenêtre d'Overton. Il sert 4 portails (Console/UPgraders, Agency, Creator/Freelance, Cockpit/brands) et un produit phare : l'**Oracle** (livrable conseil dynamique modulaire).

**Le problème ressenti par l'utilisateur** : « mon OS n'est pas assez modulaire et robuste — les inputs, outputs, frameworks, règles de validation, c'est difficile d'ajouter une nouvelle fonction sans casser quoi que ce soit » + « même l'UI ça se voit que c'est en chantier ».

**Ce que l'audit a révélé (V5.4 inclus — generic ranker + 4 consumers ajoutés)** :

| Couche | État réel | Symptômes |
|---|---|---|
| **Backend governance** | Architecture défensive *posée et déjà partiellement opérationnelle* : `emitIntent()` existe (`mestor/intents.ts:179`), persiste dans table `IntentEmission`, supporte spawned intents. **6 services backend l'utilisent correctement** (`boot-sequence`, `tarsis`, `feedback-loop`, `enrich-oracle`, `quick-intake`). 13 Intent kinds définis. **Mais 0 router tRPC ne l'appelle directement** — tous les routers contournent. | Bypass concentré sur la couche router : `pillar.ts` (8 lazy imports services), `strategy.ts`, `notoria.ts`, `pr.ts`, `ingestion.ts`, et désormais `jehuty.ts` (338L) + `seshat-search.ts` (145L) ajoutés en V5.4. 6+ sites hardcodent `["A","D","V","E","R","T","I","S"]`. `scoreObject()` appelé depuis 16 endroits. Lazy imports utilisés volontairement pour casser circular deps. ~5 unit tests + 0 CI. |
| **Ranker V5.3/V5.4** | Service générique propre (`seshat/context-store/ranker.ts`, 220L). Les 4 consumers ajoutés (Jehuty cross-brand, console search UI, brand comparables, hyperviseur peer insights) **fonctionnent** mais sont câblés **sans Intent abstraction** | Manque 4 Intent kinds : `RANK_PEERS`, `SEARCH_BRAND_CONTEXT`, `JEHUTY_FEED_REFRESH`, `JEHUTY_CURATE`. Le `strategy.comparables` endpoint, `seshat-search.*` et la curation Jehuty contournent Mestor. |
| **Oracle** | Solide. 21 sections / 5 phases, mappers indépendants, pipeline Seshat→Mestor→Artemis explicite (`enrich-oracle.ts:788`, qui utilise déjà `emitIntent` line 470), refactor V5.2 propre (hybrid RAG, multi-provider embed) | Quelques dettes `legacy_plan` (line 254), pas d'export PDF natif, pas de schema versioning des sections |
| **UI** | Stack moderne stable (Next 15 + React 19 + Tailwind 4 + tRPC 11), design system OKLCH + 35 shared components, 4 portails fonctionnels + nouveaux : Console seshat search, Cockpit insights/benchmarks, brand-comparables-panel | 1 TODO OAuth (`/config/integrations`), 1 placeholder (`/oracle/proposition`), doublons `* 2/` (`landing 2`, `notoria 2`, `financial-brain 2`, `advertis-connectors 2`, `advertis-inbound 2`) |

**Outcome cible** : un OS où **ajouter une fonction = 1 manifest + 1 implémentation + 1 test** (vs ~6 fichiers éparpillés aujourd'hui), où **toute action métier traverse la gouvernance Neteru de bout en bout**, où **0 bypass est possible** (lint + types + runtime), où **les contrats sont versionnés**, où **CI bloque toute régression**.

---

## Ce que ce plan refuse de reporter

Liste explicite des problèmes "vrais" qu'un plan prudent aurait poussés en backlog. Chacun est intégré aux Phases concernées.

1. **Le "wild plant pattern" du dev lui-même** — les commits V5.3/V5.4 ont été ajoutés *pendant l'audit*. Si rien ne change côté discipline, le refactor est mort-né. **Phase 0 instaure un Refactor Code of Conduct** : feature freeze partiel, chaque PR labelée d'une Phase, gates de governance non-négociables, opt-out exceptionnel via approbation explicite (pas par défaut).

2. **Les 91 GLORY Tools sont une zone grise** — jamais auditées dans le plan initial. Cost tracking inexistant, pas de tiers qualité, pas de manifests, pas de A/B variant. C'est l'iceberg caché de la complexité. **Phase 2 inclut un volet Glory Tools Governance** — tous reçoivent un manifest, une tier qualité (S/A/B/C), un cost estimate, et entrent dans le ranker de Mestor.

3. **Les 9 stub routers v3 "Windows machine"** (cf. mémoire projet) — jamais identifiés explicitement dans l'audit, jamais résolus. **Phase 1 les chasse activement** (`grep -rn "TODO.*Windows\|stub\|not implemented"`) et les absorbe ou les supprime. Pas de zone d'ombre tolérée.

4. **L'audit log doit être immuable** — actuellement `IntentEmission` est une table standard, donc altérable. Pour un OS qui sert d'agences clientes payantes + flux financiers (Thot), c'est une dette de conformité. **Phase 3 ajoute un hash-chain** (chaque event chaîne le hash du précédent) + suffisamment de discipline pour rendre le tampering détectable.

5. **L'isolation multi-tenant n'est pas durcie** — `operatorFilter()` middleware existe mais une procedure qui oublie de l'appliquer = fuite cross-tenant. **Phase 3 ajoute un type-level enforcement** : tout `db.<table>.findMany` qui ne passe pas par un wrapper `tenantScopedDb(operatorId)` échoue à la compilation. Default deny.

6. **Le multi-LLM routing est dumb** — LLM Gateway choisit par fallback (Anthropic → OpenAI → Ollama) sans considérer l'Intent kind. Un `EXPORT_ORACLE` n'a pas la même contrainte qu'un `RANK_PEERS`. **Phase 5 (couplé NSP) introduit une routing matrix** — chaque manifest capability déclare `qualityTier`, `latencyBudgetMs`, `costCeilingUsd`. LLM Gateway route en fonction.

7. **L'Oracle est une photo, pas un film** — V5.4 enrichit les sections, mais pas de time-travel. **Phase 7 ajoute Oracle History** : chaque enrichOracleNeteru produit un snapshot versionné, l'utilisateur peut voir l'Oracle "au 15 mars" et diff vs aujourd'hui. Repose sur `IntentEmissionEvent` (P5) + `OracleSnapshot` table.

8. **Pas de collaboration temps réel** — deux opérateurs sur la même strategy = race condition. **Phase 5 (NSP) introduit Yjs ou TipTap collab** sur les champs textuels Oracle + sur le Mestor chat. Conflict-free CRDT.

9. **Pas de performance budgets / SLO** — actuellement aucun seuil ne déclenche d'alerte. **Phase 6 introduit un SLO par Intent kind** (p95 latency, error rate, cost p95) + alerting via le job `governance-drift.yml`.

10. **Le marché est mobile-first et low-bandwidth** — l'OS rend correctement sur desktop mais pas optimisé pour le smartphone moyen Douala/Lagos/Dakar. **Phase 7 audit lighthouse mobile** (cible perf score ≥85) + mode "économie de données" (lazy embeds, images optimisées, NSP fallback long-poll si connexion instable).

11. **Pas de plugin architecture** — un "vrai OS" laisse des tiers étendre. **Phase 2 ouvre la porte** : `NeteruManifest` est public, `scaffold:capability` est exécutable depuis un repo externe (mode `--external-plugin`), et un plugin déclare ses dépendances vers les manifests core. Pas d'app store full pour cette tranche, mais l'API contractuelle est là.

12. **Le quick-intake (rev 9) est pas relié à la cascade** — il produit un PDF mais le fil avec ADVE→RTIS reste manuel côté operator. **Phase 3 instaure un Intent `LIFT_INTAKE_TO_STRATEGY`** qui automatise le passage intake → strategy → première cascade. Zéro clic operator.

13. **`scoreObject` est appelé 16× dont certains avec des seeds différents** — non-déterminisme silencieux. **Phase 4 force un seed canonique** par Intent kind (dérivé de `intentId`) pour que le replay produise des scores reproductibles.

14. **Les imports dynamiques `await import()` sont une dette structurelle** — utilisés pour casser des cycles, mais cassent le tree-shaking et masquent le DAG d'imports. **Phase 4 vise leur élimination totale** (0 lazy import sauf code-splitting Next.js justifié par bundle size, whitelist explicite). C'est plus dur que "réduire" — on s'engage sur 0.

15. **Pas de SDK public / API stable** — un OS qui veut servir des agences partenaires doit exposer une API contractuelle. **Phase 8 documente l'API tRPC en OpenAPI-ish** (via `trpc-openapi`) et publie un client TypeScript versionné comme package `@lafusee/sdk`.

Chacun de ces points est repris explicitement dans la Phase concernée.

---

Le repo a déjà ~75% des briques (`emitIntent` existe et fonctionne dans `mestor/intents.ts:179`, table `IntentEmission` persiste l'audit trail, 6 services backend respectent le pattern, governance registry présent dans `neteru-shared/governance-registry.ts`). La refonte est un travail de **finition et durcissement structurel**, pas de réécriture. Le travail principal = **migrer les ~70 routers tRPC pour qu'ils appellent `emitIntent` au lieu d'imports services directs**, + couvrir les nouvelles fonctions ranker V5.3/V5.4 par des Intent kinds. Estimation 8–9 semaines (1 dev senior plein temps) ou 5–6 semaines (2 devs en parallèle sur P0+P1 et P3+P6).

---

## Architecture cible — Neteru-native, pas générique

L'OS a une identité forte (ADVERTIS, Neteru, Oracle, GLORY tools, Tarsis signals). Le framework qu'on construit autour doit **épouser cette identité**, pas l'aplatir derrière des abstractions techniques génériques. Concrètement :

- Pas de "ServiceA → ServiceB" anonymes — on parle Mestor, Artemis, Seshat, Thot. Le code, les types, les composants UI portent ces noms.
- Pas de `useMutation` brutes côté client pour les opérations LLM — on a `useNeteru.mestor.intent(...)`, `useNeteru.artemis.tool(...)`, `useSeshat.signal(...)`.
- Les composants UI partagés sont préfixés `Mestor*`, `Artemis*`, `Seshat*` quand ils représentent l'activité d'un Neteru.
- Le streaming temps réel s'appelle **NSP — Neteru Streaming Protocol**, pas "tRPC subscriptions".
- Le lifecycle d'un intent (`PROPOSED → DELIBERATED → DISPATCHED → EXECUTING → OBSERVED → COMPLETED`) reflète la chaîne Mestor→Artemis→Seshat, pas un état générique.

**Layering** :
```
Layer 0 — src/domain/                  pure (PILLAR_KEYS, lifecycle, Intent types, Zod)
Layer 1 — src/lib/                     utilities, db, auth helpers
Layer 2 — src/server/governance/       manifests, registry, event-bus, mestor (entry point), NSP server
Layer 3 — src/server/services/         business services, governés (Artemis tools, Seshat ranker, Thot capacity, etc.)
Layer 4 — src/server/trpc/             routers, protégés par governedProcedure
Layer 5 — src/components/neteru/       Neteru UI Kit (MestorPlan, ArtemisExecutor, SeshatTimeline, etc.)
Layer 6 — src/app/, autres composants  pages
```

**Règle absolue** : Layer N ne peut importer que de Layer ≤ N (sauf `import type` cross-layer). Enforced par `eslint-plugin-boundaries` + `madge --circular`.

**Modèle de communication Neteru** :
- **Client → Mestor** : tRPC mutation `mestor.emitIntent` qui retourne immédiatement `{ intentId }` + ouvre une subscription NSP.
- **Mestor → Artemis** : sync, mais émet des `IntentProgressEvent` toutes les ~500ms ou à chaque étape clé.
- **Artemis → Seshat** : async fire-and-forget via `EventBus` interne. Seshat échoue silencieusement, jamais bloquant.
- **Tarsis (Seshat → Mestor)** : async via table `IntentQueue` + cron (PostgreSQL, pas de nouvelle infra).
- **Mestor → Client** : NSP stream (SSE) qui pousse `IntentProgressEvent` vers le frontend. Le client réconcilie l'état UI en temps réel.

---

## Phases

### Phase 0 — Fondations, filets, et Refactor Code of Conduct (S1, ~5j)

Installer le harnais avant de toucher au code métier — **et le contrat humain qui empêche le wild-plant pattern de continuer**.

**Refactor Code of Conduct (non-négociable)** :
- `docs/governance/REFACTOR-CODE-OF-CONDUCT.md` engage formellement :
  1. Toute PR pendant la refonte est labelée `phase/0`, `phase/1`, ... `phase/8` ou `out-of-scope`.
  2. `out-of-scope` exige une justification écrite dans la PR et l'accord explicite du tech lead. Le compteur d'`out-of-scope` est tracké dans `docs/governance/scope-drift.md` (1 ligne par PR).
  3. Aucune nouvelle feature qui ajoute du bypass governance n'est mergeable. Si elle est urgente : elle traverse `mestor.emitIntent` (même rudimentaire) **dans la même PR**.
  4. Pas de nouveaux dossiers `* 2/` en aucun cas (lint rule `no-numbered-duplicates` active dès P0).
  5. Le freeze partiel des features dure jusqu'à fin Phase 5. Les fixes urgents sont autorisés mais doivent respecter la governance.
- Pre-commit hook `husky` valide la présence du label.

**Livrables** :
- `.github/workflows/ci.yml` — jobs `typecheck`, `lint`, `unit`, `e2e-smoke`, `dep-cycle` (`madge --circular`), `governance-audit`, `prisma-validate`, `phase-label-check`. Required checks bloquent le merge.
- `eslint-plugin-lafusee/` (workspace local) avec 3 rules custom :
  1. `no-direct-service-from-router` — fichiers sous `src/server/trpc/routers/` ne peuvent importer `src/server/services/*` qu'avec whitelist (`mestor`, `pillar-gateway`, `audit-trail`, `operator-isolation`, `neteru-shared`).
  2. `no-cross-portal-import` — `(agency)`, `(creator)`, `(console)`, `(cockpit)`, `(intake)` étanches entre eux.
  3. `no-hardcoded-pillar-enum` — détecte les littéraux `["A","D","V","E","R","T","I","S"]` ou `z.enum([...])` similaires.
- `scripts/audit-governance.ts` — parse AST des routers, vérifie que mutations passent par Mestor.
- `docs/governance/baseline-2026-04.md` — snapshot avant : nb cycles, nb violations lint, coverage. Reference pour mesurer l'amélioration.
- Husky + commitlint (Conventional Commits).

**Critères de succès** : CI verte sur main actuel, rules custom listent les violations en `warn`, baseline committed.

---

### Phase 1 — Single Source of Truth domaine (S2, ~5j, parallélisable avec P0)

**Nouveau module `src/domain/`** (Layer 0, zéro dépendance Prisma/tRPC/NextAuth) :

- `src/domain/pillars.ts` :
  ```ts
  export const ADVE_KEYS = ["A","D","V","E"] as const;
  export const RTIS_KEYS = ["R","T","I","S"] as const;
  export const PILLAR_KEYS = [...ADVE_KEYS, ...RTIS_KEYS] as const;
  export type PillarKey = typeof PILLAR_KEYS[number];
  export const PillarKeySchema = z.enum(PILLAR_KEYS);
  export const PILLAR_METADATA: Record<PillarKey, {label, phase, order, storageKey}> = {...};
  ```
- `src/domain/lifecycle.ts` — `StrategyLifecyclePhase` + transitions valides (state machine `INTAKE→BOOT→OPERATING→GROWTH`).
- `src/domain/touchpoints.ts` — `Touchpoint`, `AarrrIntent`.
- `src/domain/index.ts` barrel + `README.md` (interdiction Prisma/tRPC ici).

**Migration des sites hardcodés** (6+ fichiers identifiés) :
- `src/server/trpc/routers/pillar.ts:45,46`
- `src/server/trpc/routers/notoria.ts`, `ingestion.ts`, `pr.ts`, `strategy.ts:64`
- `src/server/services/artemis/tools/sequence-executor.ts`
- `src/server/services/quick-intake/index.ts`
- `src/lib/types/pillar-schemas.ts` — devient ré-export depuis `domain`
- Remplacer les `if (key === "r") ... else if (key === "t")` chains par `Record<PillarKey, Handler>` indexé.

**Activer `no-hardcoded-pillar-enum` en `error`** à la fin de la phase.

**Chasse aux 9 stub routers v3 "Windows machine"** (cf. mémoire projet) :
- `grep -rn "TODO.*Windows\|TODO.*stub\|not implemented\|not yet implemented\|@stub\|@todo-windows" src/server/trpc/routers/` + audit visuel des routers anémiques (≤30 lignes avec un seul endpoint vide).
- Pour chaque stub trouvé : décision binaire par PR — soit on absorbe le code manquant (importé depuis l'historique git/branches/notes utilisateur), soit on supprime le router et son entrée dans `src/server/trpc/router.ts`.
- Aucun stub ne survit à cette phase. Liste finale documentée dans `docs/governance/scope-drift.md`.

**Tests** : `src/domain/__tests__/pillars.test.ts` — ordre cascade, isAdve, validation Zod accept/reject, roundtrip uppercase↔storageKey.

**Critères de succès** : `grep -rn '"A".*"D".*"V".*"E"' src/ | wc -l` → 0 hors `domain/`. TS compile sans `as any` sur piliers.

---

### Phase 2 — Manifests & Registry de gouvernance (S3, ~5j)

Chaque service Neteru déclare *en un seul endroit* qui il est, ce qu'il accepte, ce qu'il produit.

**Format Manifest** (`src/server/governance/manifest.ts`) :
```ts
export interface NeteruManifest {
  service: string;
  governor: "MESTOR"|"ARTEMIS"|"SESHAT"|"THOT"|"INFRASTRUCTURE";
  version: `${number}.${number}.${number}`;
  acceptsIntents: ReadonlyArray<Intent["kind"]>;
  emits?: ReadonlyArray<Intent["kind"]>;
  capabilities: ReadonlyArray<{
    name: string;
    inputSchema: z.ZodSchema;
    outputSchema: z.ZodSchema;
    sideEffects: ReadonlyArray<"DB_WRITE"|"LLM_CALL"|"EXTERNAL_API"|"EVENT_EMIT">;
    costEstimateUsd?: number;
  }>;
  dependencies: ReadonlyArray<string>;
}
```

**Un `manifest.ts` par service** (~110 fichiers sous `src/server/services/`). Co-localisé avec l'implémentation.

**Registry codegen** :
- `scripts/gen-manifest-registry.ts` glob `src/server/services/*/manifest.ts` → écrit `src/server/governance/registry.generated.ts` (committed). Lancé en pre-build et CI.
- Choix codegen vs dynamic import : statique = bundling Next-friendly + tree-shakeable + traçable.

**Audit étendu** (`auditGovernance()` existant `governance-registry.ts:66`) :
- Service FS sans manifest = CI fail.
- Intent kind sans handler ou avec >1 handler = CI fail.
- Cycles via `dependencies[]` détectés.

**Scaffold** : `npm run scaffold:capability -- --service=notoria --name=runDiagnostic` génère manifest entry + Zod schemas + stub + test placeholder + (si Intent) entry dans `intents.ts`. Documente dans `CONTRIBUTING.md` : "ajouter une fonction = scaffold + remplir 3 trous".

**Critères de succès Phase 2 (services)** : 100% des services ont un `manifest.ts`, audit script vert, capability ajoutée e2e via le scaffold prouve le flux.

#### 2.6 — Glory Tools Governance (l'iceberg caché de 91 outils)

Les ~91 GLORY tools utilisés par Artemis sont actuellement non-gouvernés : pas de manifest, pas de cost tracking individuel, pas de tier qualité, pas de A/B variants. C'est la zone d'ombre la plus volumineuse de l'OS.

- Inventaire automatique : `scripts/inventory-glory-tools.ts` parse l'AST de chaque tool (`src/server/services/artemis/tools/*`), extrait nom/inputs/outputs/LLM calls. Génère `docs/governance/glory-tools-inventory.md`.
- Chaque tool reçoit un `manifest.ts` co-localisé :
  ```ts
  export const manifest: GloryToolManifest = {
    tool: "concept-generator",
    governor: "ARTEMIS",
    qualityTier: "S",        // S | A | B | C — pilote le LLM model par défaut
    costTier: "PREMIUM",     // PREMIUM | STANDARD | LITE — caps tokens et model
    inputSchema: ..., outputSchema: ...,
    expectedLatencyMs: 3500,
    deterministicSeed: true,
    variants: ["v1", "v2-experimental"],   // A/B optionnel
    dependencies: [],         // tools en amont (skill tree)
    pillarsAffected: ["A","D","I"],
  };
  ```
- LLM Gateway consomme `qualityTier` + `costTier` pour le routing model.
- A/B framework : Artemis route entre `variants` selon une politique (90/10 par défaut), mesure delta de score Oracle aval.
- Topo-tri des dépendances avant exécution (brandbook avant KV affichage, etc.).
- Coût par tool exposé en `/console/governance/glory-cost`.

**Critères de succès Phase 2 (Glory)** : 91/91 tools avec manifest, ≥1 tool en A/B variant en prod fin de phase, cost tracking par tool fonctionnel.

#### 2.7 — Plugin architecture (extensibilité tierce)

Pour passer de "OS modulaire" à "OS extensible par des partenaires UPgraders ne touchant pas le repo core" :
- `NeteruManifest` est exposé comme contrat public (versionné via le champ `version`).
- `npm run scaffold:capability --external-plugin --target=./plugins/my-tool` génère un dossier autonome avec `package.json` qui dépend de `@lafusee/sdk` (cf. P8).
- Au boot, La Fusée scanne `plugins/*/manifest.ts` (en plus du core), valide signatures + dépendances, registre dynamique merge avec le core.
- Sandboxing : un plugin déclare ses `sideEffects` requis ; ceux non déclarés sont bloqués au runtime (proxy autour du `db` exposé).
- Pas d'app store cette tranche, mais le **contrat** est posé. Premier plugin de démo : `@upgraders/loyalty-extension` qui ajoute un Intent `COMPUTE_LOYALTY_SCORE`.

---

### Phase 3 — Bus d'événements & Intent dispatcher v2 (S4–S5, ~10j) — **CRITIQUE**

Le cœur. Phase à plus haut risque ; à exécuter qu'après P0–P2 stables.

**Nouveau `src/server/governance/event-bus.ts`** :
- `EventBus` typé (discriminated union), scope process Node.
- `subscribe()`, `publish()`, `subscribeOnce()`.
- Listeners Seshat enregistrés au boot via `src/server/governance/bootstrap.ts`.

**Refonte `src/server/services/mestor/index.ts`** :
- `emitIntent(intent: Intent, ctx: GovernanceContext): Promise<IntentResult>` devient l'**unique** point d'entrée pour les routers.
- Persiste intent + résultat dans `IntentLog` (audit trail SQL).
- Émet `BusEvent<"intent.completed">` consommé async par Seshat.

**Schéma Prisma — étendre l'existant `IntentEmission`** (NE PAS recréer une table) :

La table `IntentEmission` existe déjà (référencée dans `mestor/intents.ts:203`). Phase 3 l'enrichit avec les colonnes manquantes via migration versionnée :

```prisma
model IntentEmission {
  // existing fields preserved
  // NEW columns added in migration:
  version        Int      @default(1)
  spawnedFrom    String?
  governor       String   // "MESTOR" | "ARTEMIS" | "SESHAT" | "THOT" | "INFRASTRUCTURE"
  costUsd        Decimal? @db.Decimal(12,4)
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  status         String   // OK|VETOED|DOWNGRADED|FAILED|QUEUED
  @@index([strategyId, createdAt])
  @@index([kind, status])
}
model IntentQueue { /* pending intents async, picked by cron */ }
```

Migration nommée `add_governance_audit_columns` via `prisma migrate dev`. Rétrocompatible (colonnes optionnelles + defaults).

**Audit log immuable (hash-chain)** :
- Chaque `IntentEmission` row gagne un champ `prevHash: String?` + `selfHash: String`.
- À l'insertion : `selfHash = sha256(JSON.stringify({...rowSansHash, prevHash}))`.
- `prevHash` pointe vers le `selfHash` du dernier row du même `strategyId` (ou global si null strategyId).
- Job CI hebdomadaire `governance-drift.yml` vérifie l'intégrité de la chaîne pour les 1000 derniers rows. Toute rupture = alerte critique.
- Pas de backward modification possible — seul l'append est permis. Les "corrections" se font via un nouvel intent `CORRECT_INTENT` qui référence l'original.

**Tenant isolation hardening (default deny)** :
- Tout `db.<table>.findMany|findFirst|update|delete|create` accédé directement depuis services/routers échoue à la compilation.
- Wrapper obligatoire `tenantScopedDb(operatorId).<table>...` qui injecte automatiquement `where: { operatorId }` (ou check ADMIN bypass explicite).
- ESLint custom rule `no-direct-db-access` (en plus des 3 existantes) en `error`.
- Tables qui n'ont pas de `operatorId` (rares — globales comme `Sector`, `LlmModel`) sont déclarées dans une whitelist explicite.
- Test e2e `tests/e2e/tenant-isolation.spec.ts` — un user opérateur A tente de lire/modifier un row de l'opérateur B, asserte 0 fuite.

**Quick-intake → Strategy automatisé** :
- Nouvel Intent `LIFT_INTAKE_TO_STRATEGY` (gouverné Mestor → Artemis).
- Quand un quick-intake (rev 9) atteint le seuil de complétude, Mestor décide automatiquement de spawner cet intent (via spawn pattern existant `intents.ts:241`).
- Le résultat : Strategy créée + first cascade ADVE→RTIS lancée + Oracle pré-rempli sur 8 sections initiales. Zéro clic operator.

**Versioning Intents** : `FILL_ADVE@v1`, `FILL_ADVE@v2`. `src/server/governance/intent-versions.ts` map `{[kind]: { v1: handler, v2: handler }}`. Default v1 si absent. Migration v1→v2 = ajouter v2 + flip défaut + déprécier v1 sur 2 sprints.

**Nouveaux Intent kinds à ajouter pour gouverner V5.3/V5.4 (ranker consumers)** :
- `RANK_PEERS` — utilisé par `strategy.comparables` (lecture peers d'une strategy).
- `SEARCH_BRAND_CONTEXT` — utilisé par `seshat-search.searchAcrossStrategies/findPeers/searchWithinStrategy`.
- `JEHUTY_FEED_REFRESH` — agrégation feed (signals + recos + diagnostics).
- `JEHUTY_CURATE` — actions pin/dismiss + trigger Notoria batch.
- `HYPERVISEUR_PEER_INSIGHTS` — peer insights utilisés par hyperviseur.

Ces 5 nouveaux kinds couvrent les 4 consumers ranker câblés en V5.4 + le peer insights backend. Ajout au type union `Intent` dans `mestor/intents.ts`, handlers dans `artemis/commandant.ts`. Les 4 routers concernés (`strategy.ts`, `seshat-search.ts`, `jehuty.ts`, `hyperviseur.ts`) refactorés pour appeler `emitIntent` au lieu d'imports services directs.

**Forcer le passage par `emitIntent()` (3 mécanismes empilés)** :
1. ESLint `no-direct-service-from-router` en `error`.
2. Type-level : `governedProcedure` wrapper dans tRPC qui n'expose que `ctx.mestor.emitIntent`.
3. Runtime guard (dev/test only) : middleware tRPC inspecte le call stack, warn si une mutation a touché DB sans IntentLog.

**Migration des routers contrevenants** (ordre prioritaire) :
1. `src/server/trpc/routers/pillar.ts` (le pire, 814 lignes, scoreObject + 8 lazy imports vers services).
2. `src/server/trpc/routers/strategy.ts` (`mestor.buildPlan()` direct line 62 + nouveau `comparables` à gouverner via `RANK_PEERS`).
3. `src/server/trpc/routers/jehuty.ts` (338L, ajouté V5.4 — plusieurs `db.*` directs + `notoria/engine.generateBatch` lazy import → migrer vers `JEHUTY_FEED_REFRESH`, `JEHUTY_CURATE`).
4. `src/server/trpc/routers/seshat-search.ts` (145L, ajouté V5.4 — lazy import du ranker → migrer vers `SEARCH_BRAND_CONTEXT`).
5. `notoria.ts`, `ingestion.ts`, `pr.ts`.
6. Sweep des ~50 autres routers, dirigé par `audit-governance` qui produit la todolist.

Pour chaque router migré : créer `tests/governance/<router>.governance.test.ts` qui appelle chaque procedure et vérifie qu'au moins un `IntentLog` row est créé.

**Critères de succès** :
- 100% des mutations tRPC passent par `mestor.emitIntent`.
- IntentLog se remplit en e2e.
- Test "tuer Seshat" → l'intent reste OK (loose coupling vérifié).
- ESLint `no-direct-service-from-router` en error sans exception.

**Stratégie rollout** (sans casse) :
- Trunk-based, PR ≤600 lignes, pas de feature branch long-lived.
- Feature flag `GOVERNANCE_STRICT_MODE` env var, default false en prod 2 semaines.
- **Dual-write** pendant migration : double appel (direct + via Mestor) avec comparaison output, ratio divergence loggé. Quand ratio < 0.1% sur 1 semaine → bascule.
- 5–10 routers migrés / semaine.

---

### Phase 4 — Wrapper scoreObject() + Layering strict (S6, ~5j)

**scoreObject centralisé** :
- `src/server/services/advertis-scorer/index.ts` reste seul export.
- 12/16 callsites transitent obligatoirement par `pillar-gateway.writePillarAndScore()` (scoring après écriture).
- 4 sites "pur scoring" passent par wrapper `assessPillarContent(content, key)` qui logge `IntentLog` (kind=`SCORE_PILLAR`).
- Tests `tests/unit/advertis-scorer.invariants.test.ts` : idempotence, monotonie, borne `[0,100]`, déterminisme (seed fixé).

**Layering enforcement** :
- `eslint-plugin-boundaries` config avec les 6 layers.
- `madge --circular --extensions ts src/` doit retourner 0 cycle.
- CI job `dep-cycle` fail sinon.

**Casser les circular deps connues** :
- `src/server/services/artemis/tools/sequence-executor.ts:11` — extraire l'interface dans `src/domain/sequence-types.ts`, sequence-executor consomme l'interface, implémentation injectée via DI au boot.
- `src/server/services/mestor/intents.ts` — déjà clean (type-only).
- `src/server/services/pillar-maturity/binding-validator.ts` — extraire `BindingContract` dans `src/domain/binding-contracts.ts`.

**Seed canonique pour scoreObject** : chaque Intent kind dérive un seed déterministe `hash(intentId + capability)` qui pilote le LLM temperature/sampling. Replay = scores reproductibles à ±0%.

**Engagement 0 lazy import** : la pratique courante `await import("@/server/services/...")` est éliminée *totalement* (pas réduite). Whitelist Next.js code-splitting explicite avec justification commentée par fichier. Les cycles cassés via DI au boot, pas via lazy.

**Critères de succès** : 0 lazy import non justifié (mesure stricte, pas tolérance), 0 cycle, coverage scoreObject ≥90% lignes, replay d'intent reproduit même score à 0% drift.

---

### Phase 5 — NSP : Neteru Streaming Protocol + Neteru UI Kit (S7–S8, ~10j) — **MAJEUR**

L'utilisateur ressent l'OS comme une "plante sauvage" : les opérations LLM bloquent l'UI sans feedback, l'attente est opaque, l'imprévisible domine. Cette phase pose la **dorsale de prévisibilité visuelle** : tout intent qui appelle un LLM diffuse son état en continu, le frontend rend cet état avec des composants dédiés.

C'est la phase qui transforme l'OS d'un outil "puissant mais nerveux" en un produit "puissant et serein".

#### 5.1 — IntentProgressEvent (lifecycle unifié)

`src/domain/intent-progress.ts` :
```ts
export type IntentPhase =
  | "PROPOSED"     // intent reçu, en attente de Mestor
  | "DELIBERATED"  // Mestor a décidé du plan
  | "DISPATCHED"   // Artemis a reçu le plan
  | "EXECUTING"    // Artemis exécute (peut publier sub-steps)
  | "OBSERVED"     // Seshat a indexé / mesuré
  | "COMPLETED"
  | "FAILED"
  | "VETOED"       // Thot ou Mestor a refusé
  | "DOWNGRADED";  // budget contraint, exécution réduite

export interface IntentProgressEvent {
  intentId: string;
  kind: Intent["kind"];
  phase: IntentPhase;
  step?: { name: string; index: number; total: number };  // ex: "framework 3/12"
  partial?: { sectionKey?: string; tokens?: string; sectionsCompleted?: string[] };
  estimatedSecondsRemaining?: number;
  costSoFarUsd?: number;
  message?: string;
  emittedAt: Date;
  governor: Brain;
}
```

#### 5.2 — NSP Server (transport)

Choix : **Server-Sent Events (SSE)** via tRPC v11 subscriptions, fallback long-poll.

- Endpoint `nsp.subscribe.useSubscription({ intentId })` côté client.
- Backend : `src/server/governance/nsp/server.ts` enregistre un `IntentEmitter` par intentId, branché sur `EventBus` interne. Ferme le canal quand phase ∈ {COMPLETED, FAILED, VETOED}.
- Persistence : chaque `IntentProgressEvent` écrit dans `IntentEmissionEvent` (nouvelle table Prisma — 1:N avec `IntentEmission`). Permet le replay si l'utilisateur recharge la page mid-flight.

```prisma
model IntentEmissionEvent {
  id          String   @id @default(cuid())
  intentId    String   // FK → IntentEmission.id
  phase       String
  stepName    String?
  stepIndex   Int?
  stepTotal   Int?
  partial     Json?
  costUsd     Decimal? @db.Decimal(12,4)
  emittedAt   DateTime @default(now())
  @@index([intentId, emittedAt])
}
```

#### 5.3 — Instrumentation des Neteru existants

- `mestor.emitIntent()` émet `PROPOSED` immédiat puis `DELIBERATED` après le LLM call de planification.
- `artemis.commandant.execute()` wrappe chaque sous-étape (chaque framework, chaque tool GLORY) et émet `EXECUTING` avec `step={name, index, total}`.
- LLM Gateway v4 (`src/server/services/llm-gateway/index.ts`) ajoute callback `onChunk` qui re-émet en `partial.tokens` pour les calls qui supportent le streaming (Anthropic, OpenAI, Ollama tous OK).
- `enrich-oracle.ts` émet `partial.sectionsCompleted` au fur et à mesure des 21 sections.
- `seshat/tarsis` émet `OBSERVED` quand un signal est traité.
- `thot/financial-brain` émet `VETOED` ou `DOWNGRADED` si capacity dépassée.

#### 5.4 — Neteru UI Kit (Layer 5 nouveau)

Nouveau répertoire `src/components/neteru/` :

| Composant | Rôle | Quand l'utiliser |
|---|---|---|
| `<MestorPlan>` | Affiche le plan que Mestor a délibéré (lifecycle, étapes prévues, intents enfants) | Avant exécution longue, donne la prévisibilité |
| `<ArtemisExecutor>` | Stepper vertical animé pour les frameworks/tools en cours, avec partial tokens | Pendant Oracle enrichment, quick-intake processing |
| `<SeshatTimeline>` | Timeline horizontale des signaux/observations Seshat | Pages d'insights, brand context |
| `<ThotBudgetMeter>` | Compteur live du coût + capacité restante | Persistant en topbar pendant intents coûteux |
| `<NeteruActivityRail>` | Rail latéral global qui montre quel Neteru est actif maintenant (pulse + label) | Persistent dans tous les portails |
| `<CascadeProgress>` | 8 nœuds A→D→V→E→R→T→I→S qui s'allument selon avancement | Pages cascade ADVE→RTIS |
| `<OracleEnrichmentTracker>` | Grille 21 sections avec état (queued/in-progress/done/failed) | Page Oracle pendant `enrichOracleNeteru` |
| `<PartialContentReveal>` | Stream tokens dans une section au fur et à mesure | Sections Oracle en cours de rédaction |
| `<IntentReplayButton>` | Bouton pour replay un intent depuis IntentEmissionEvent | Console admin, debug |
| `<CostMeter>` | Coût USD courant du flow utilisateur | Topbar Console, Cockpit |

Chaque composant consomme un hook unifié :
```ts
// src/lib/hooks/use-neteru.ts
const { progress, isStreaming, retry, cancel } = useNeteru.intent(intentId);
// progress: IntentProgressEvent (latest), or aggregated history if needed
```

Skeletons par défaut : tout query/mutation tRPC qui peut prendre >300ms a un skeleton standard `<NeteruSkeleton variant="card|list|oracle" />` — interdiction d'écrans blancs.

#### 5.5 — Pattern d'usage — chaque page LLM-driven respecte ce contrat

```tsx
// pseudo-code attendu pour toute page qui déclenche un intent long
const startEnrichment = useNeteru.mestor.intent("ENRICH_ORACLE");
const handleClick = () => {
  const { intentId } = await startEnrichment.mutate({ strategyId });
  // UI rend immédiatement <ArtemisExecutor intentId={intentId} />
  // L'utilisateur voit : "Mestor délibère...", puis "Artemis lance framework 3/12 — concept-generator", puis tokens streamés dans les sections, etc.
};
```

Remplacer **toutes** les pages qui actuellement font un fetch long sans feedback :
- `/console/strategy-operations/intake` (PDF parse + scoring)
- `/cockpit/brand/proposition` (livrable Oracle dynamique pour le founder)
- `/console/strategy-portfolio/clients/[id]` (enrichOracleNeteru — pilotage opérateur d'une fiche client)
- `/console/seshat/search` (ranker queries — court mais skeleton requis)
- `/cockpit/insights/benchmarks` (peer insights via ranker)
- `/console/mestor` (chat pattern — déjà streamé partiellement, à harmoniser)
- `/console/arene/matching` (matching long)
- Pages Glory tools (chaque sequence GLORY = un intent avec ses sub-steps)
- `/intake` (quick-intake rev 9, scoring + PDF)

#### 5.6 — Storybook + visual regression

- Mise en place Storybook pour le Neteru UI Kit. Chaque composant a 3 états minimum : idle, streaming, error.
- Tests Playwright visual regression sur 5 flows clés (Oracle enrichment, intake processing, mestor chat, cascade, ranker search).

**Critères de succès Phase 5** :
- Aucune page LLM-driven sans feedback visuel (audit manuel + grep `useMutation` qui touche un intent kind sans rendu de progress).
- `IntentEmissionEvent` se remplit pour chaque intent en e2e.
- Replay d'un intent terminé restaure l'état UI complet.
- Tuer une connexion SSE mid-flight → reconnect automatique sans perte d'état (resume from last `emittedAt`).
- Storybook publié pour les 10 composants Neteru UI Kit.
- Test Playwright `tests/e2e/oracle-enrichment-streaming.spec.ts` valide le rendu progressif des 21 sections.

#### 5.7 — Multi-LLM smart routing (LLM Gateway v5)

LLM Gateway v4 fait du fallback (Anthropic → OpenAI → Ollama). v5 fait du **routing intelligent par Intent kind + qualityTier** :

```ts
// src/server/services/llm-gateway/router.ts
export function routeModel(ctx: { kind: Intent["kind"]; qualityTier: "S"|"A"|"B"|"C"; latencyBudgetMs: number; costCeilingUsd: number }) {
  // S/PREMIUM → Claude Opus
  // A/STANDARD → Claude Sonnet
  // B/STANDARD → GPT-4o-mini ou Sonnet
  // C/LITE → Haiku ou Ollama
  // si latencyBudgetMs < 2000 → favoriser Haiku/Ollama
  // si costCeilingUsd dépassé → downgrade tier (Mestor émet DOWNGRADED event)
}
```

- `qualityTier` lu depuis le manifest de la capability appelée.
- Telemetry `llm-gateway-route-decisions.log` pour tuner.
- Thot peut overrider (downgrade) si le brand/operator dépasse son budget.

#### 5.8 — Real-time collaboration (CRDT)

Deux opérateurs sur la même Strategy = race condition aujourd'hui. Solution :
- Yjs CRDT pour les champs textuels longs : pillars content, Oracle sections, Mestor chat history.
- Provider y-websocket sur même endpoint que NSP (réutilise SSE/WS infra).
- Awareness : voir qui édite quoi en live (avatars, cursors).
- Persistance : état Yjs sérialisé périodiquement dans `StrategyDoc` table.
- Limité au texte cette tranche (pas Oracle structure complète) — extension possible plus tard.

#### 5.9 — Offline-first / faible connectivité (marché africain)

- Service worker (`next-pwa` minimal) cache l'app shell + dernier état Strategy chargé.
- Mutations queuées localement (IndexedDB) si offline ; rejouées au reconnect via NSP idempotency keys.
- NSP fallback long-poll automatique si WebSocket/SSE échouent (réseaux mobiles instables).
- "Mode économie de données" toggle en topbar : désactive embeds vidéos, lazy-load images, tronque streams partial à intervals.

**Risques** :
- SSE buffering en production (proxies CDN). Mitigation : flush header + heartbeat toutes les 15s.
- LLM providers non-streaming-friendly. Mitigation : pour les calls non-stream, émettre `PROPOSED → EXECUTING → COMPLETED` en 3 events sans `partial.tokens`.
- Régression UI si refactor mal séquencé. Mitigation : feature flag `NSP_ENABLED` par portail, rollout Console → Cockpit → Agency → Creator.
- Yjs conflicts complexes sur structure Oracle. Mitigation : limiter à champs texte cette tranche, extension structurelle reportée.
- Service worker masque les bugs. Mitigation : opt-in via env var en staging d'abord.

---

### Phase 6 — Filets E2E & gouvernance régression (S9, ~5j)

**Tests cascade ADVE→RTIS** :
- `tests/e2e/cascade-full.spec.ts` — crée strategy → fill ADVE → trigger RTIS, asserte IntentLog contient les 8+ intents dans l'ordre, vérifie pillars persistés.
- `tests/e2e/governance-bypass.spec.ts` — tente d'appeler un service en direct depuis un router test-only, asserte que ESLint+CI fail.

**Tests d'invariants gouvernance** (`tests/integration/governance-invariants.test.ts`) :
- Chaque mutation tRPC ≠ admin produit ≥1 IntentLog row.
- Aucun service hors whitelist n'est appelé sans Mestor (spy mocks).
- Seshat exception ne casse pas le pipeline.
- Thot veto downgrade un intent budgétairement excessif.

**Migration Prisma versionnée** : fin du `prisma db push`. Tous les schema changes via `prisma migrate dev` → `prisma/migrations/`. CI bloque si `schema.prisma` modifié sans nouvelle migration.

**Cron CI hebdomadaire** (`.github/workflows/governance-drift.yml`) : tourne dimanche, lance audit, ouvre issue automatique si drift (nouveau service sans manifest, etc.). Vérifie aussi l'intégrité du hash-chain `IntentEmission`.

**Performance budgets / SLOs par Intent kind** :
- `src/server/governance/slos.ts` déclare un SLO par Intent kind : `{ p95LatencyMs, errorRatePct, costP95Usd }`.
- Job `slo-check` agrège les rolling 7-day metrics depuis `IntentEmission` et fail si breach > 2 jours consécutifs.
- Dashboard `/console/governance/slos` rend la matrice en temps réel.
- Exemple : `EXPORT_ORACLE` SLO = p95 < 45s, error < 2%, cost p95 < $0.40.

**Chaos engineering léger** :
- `tests/chaos/` exécute en staging hebdo : kill Seshat, latence forcée 5s sur LLM Gateway, Thot reject 50% intents → asserte que les filets tiennent.
- Pas Netflix-level, mais assez pour découvrir les couplages cachés.

**Disaster recovery runbooks** :
- `docs/governance/RUNBOOKS.md` couvre : DB corrupted, hash-chain broken, LLM provider down, queue overflow, secret leaked.
- Test annuel restauration depuis backup PITR.

---

### Phase 7 — Périphérie produit : Oracle + UI + Landing/README upgrade (S10, ~6j)

Une fois la gouvernance stable, on règle les dettes UI/produit.

**Oracle exports natifs** :
- Service `value-report-generator` reçoit 2 capabilities supplémentaires :
  - `exportOracleAsPdf(strategyId, options)` via `puppeteer-core` côté serveur (rendu fidèle).
  - `exportOracleAsMarkdown(strategyId)` via templates.
- Nouvel Intent `EXPORT_ORACLE` (gouverné Mestor → Artemis tool).
- Schema versioning des 21 sections (`OracleSectionSchema.v1`, `v2`). Le report stocke `schemaVersion` dans le JSON sérialisé pour replay/migration future.

**Pages UI à finir** :
- `src/app/(intake)/oracle/proposition/page.tsx` — porter depuis `src/app/(cockpit)/cockpit/brand/proposition/page.tsx`. Factoriser en composant unique `ProposalView` dans `src/components/strategy-presentation/`, deux entrées (cockpit + intake) qui le consomment.
- `src/app/(console)/console/config/integrations/page.tsx:173` — implémenter OAuth réel (Google, Meta, LinkedIn) via NextAuth providers étendus + table `IntegrationConnection`. Tokens chiffrés AES-GCM via custom adapter.

**Suppression doublons forks oubliés** :
- `src/components/landing 2/` (confirmé existe)
- `src/server/mcp/notoria 2/`
- `src/server/services/financial-brain 2/`
- `src/server/services/advertis-connectors 2/`
- `src/server/mcp/advertis-inbound 2/`

Pour chaque : `grep -rn "<dossier>"` pour vérifier zéro import → `git rm -r`. CI lint rule `no-numbered-duplicates` ajoutée pour empêcher la régression.

**MFA admin** : NextAuth v5 supporte MFA via custom adapter. Activer TOTP pour `role=ADMIN` uniquement (table `MfaSecret`, librairie `otplib`). Forced challenge à chaque login admin, pas de "remember device".

**Landing page + README — upgrade ambitieux (pas resync)** :

L'état actuel sous-vend l'OS. Le README dit `v4.0.0-alpha` (réalité V5.4), ignore Thot, l'hybrid RAG, le ranker, Jehuty, Tarsis. La landing présente une version obsolète du panthéon NETERU (3 Neter) et 12 sections statiques qui n'expriment ni la modularité, ni la prévisibilité, ni la profondeur de l'Industry OS. Cette phase **réécrit le récit produit avec la profondeur acquise** — pas seulement un patch. Le panthéon canonique est désormais **7 Neteru actifs** (Mestor / Artemis / Seshat / Thot / Ptah / Imhotep / Anubis — cap APOGEE atteint Phase 14/15) — voir [PANTHEON.md](PANTHEON.md).

**Principe directeur** : la landing doit prouver l'OS, pas le décrire. Chaque promesse doit être adossée à une démo visuelle live (extraite du vrai produit en mode read-only public), pas à un slogan.

#### 7.1 — Refonte de la landing : structure cible

Nouvelles sections proposées (12 actuelles → 14, dont 4 ré-architecturées) :

1. **`Navbar`** — quasi-inchangée, ajouter lien vers `/changelog` (nouvelle page) et `/status` (uptime + dernière version Neteru).
2. **`Hero` (réécrit)** — promesse en une ligne : *"L'Industry OS du marché créatif africain. Un brief entre, une marque sort transformée."* Ajouter un **micro-démo vidéo** (15s loop) qui montre l'intake → Oracle apparaissant section par section (récupérée via NSP en mode replay public).
3. **`ProblemSection` (étoffée)** — 3 personas qui souffrent (DA débordé, founder isolé, freelance précaire) avec métriques chiffrées du marché.
4. **`HowItWorks` (réécrit avec NSP demo)** — narration en 5 étapes (Brief → Diagnostic → Stratégie → Production → Mesure). Chaque étape = un mini-composant qui anime le NSP en background : on voit Mestor délibérer, Artemis exécuter ses tools, Seshat indexer. **C'est la vitrine du Neteru UI Kit**.
5. **`NeteruShowcase` (réécrit — septet Mestor/Artemis/Seshat/Thot/Ptah/Imhotep/Anubis + Tarsis sub-component)** — 7 cartes interactives + disclosure pour Tarsis (sub-component Seshat) :
   - **Mestor** — décision (avec exemple d'IntentLog réel rendu)
   - **Artemis** — exécution + GLORY tools rédactionnels (briefs, avec sequence interactive 3 nœuds)
   - **Seshat** — observation (avec disclosure Tarsis = sub-component, graphe weak-signals)
   - **Thot** — gouvernance budgétaire + Operations (avec capacity meter)
   - **Ptah** — forge des assets matériels (avec gallery image/vidéo/audio générés ; Phase 9 ADR-0009)
   - Note historique : Imhotep + Anubis étaient pré-réservés au moment de Phase 7 (la PR landing). Ils sont **actifs depuis Phase 14/15** (ADR-0019/0020). Cap APOGEE 7/7 atteint — landing à actualiser pour refléter le panthéon plein.
6. **`OracleShowcase` (NOUVELLE)** — montre l'Oracle dynamique : un strategyId public sample, les 21 sections rendues, la possibilité d'expand chaque section, la mention "schema v2 — replay supported". Lien vers démo live.
7. **`CrossBrandIntelligence` (NOUVELLE — V5.3/V5.4)** — explique le ranker, Jehuty cross-brand insights, comparables. Avec démo : "Choisis un secteur → voir 3 marques peers anonymisées + leur score ADVERTIS".
8. **`ScoreShowcase` (mis à jour — 8 piliers V5)** — radar interactif ADVERTIS, vocabulaire aligné avec `domain/pillars.ts` (cf. P1). Tooltip pédagogique par pilier.
9. **`PortalsSection` (étoffée — 5 portails)** — Console, Agency, Creator, Cockpit + **Intake public** (route group `(intake)`). Pour chaque portail : 1 capture, 3 cas d'usage chiffrés, 1 témoignage si dispo.
10. **`SocialProof`** — étoffé : marques diagnostiquées (anonymisables), nombre de freelances, nombre d'agences. Si pas encore de chiffres, snapshot interne du repo (ex: "56 GLORY tools, 57 séquences" — chiffres canoniques verrouillés par tests, post Phase 14/15).
11. **`PricingSection` (revue)** — alignée business model V5.4 : intake gratuit, paywall sur Oracle, retainer post-conversion. Comparatif transparent vs Havas/Publicis Africa.
12. **`Architecture` (NOUVELLE)** — section technique courte pour les CTO/founders : "OS modulaire, governance Neteru, NSP streaming, Intent dispatcher v2". Lien vers `/docs/governance/ARCHITECTURE.md`.
13. **`FaqSection`** — Q&A étendues : Thot, Oracle dynamique, ranker, NSP, gouvernance, sécurité, multi-tenant.
14. **`FinalCta` + `Footer`** — Footer avec sitemap, status page, changelog, GitHub si public.

Pages annexes nouvelles :
- `/changelog` — généré depuis `git log` filtré sur tags `feat(neteru):*` + curated.
- `/status` — uptime, version courante, dernier intent processed (depuis `IntentEmission`).
- `/docs/governance/*` — rendu MDX des docs gouvernance (aligné avec P8).

#### 7.2 — Ton & style éditorial

- Vocabulaire **aligné `domain/pillars.ts`** (cf. P1) — pas de glissement entre README, landing, code.
- Phrases courtes, métriques chiffrées partout (pas de "leader", "innovant", "world-class" sans chiffre derrière).
- Bilingue FR/EN dès cette phase (pas d'i18n mid-flight ensuite). Stack : `next-intl` minimaliste sur les sections marketing seulement.

#### 7.3 — Oracle exports natifs + Time Travel

- Service `value-report-generator` reçoit 2 capabilities supplémentaires :
  - `exportOracleAsPdf(strategyId, options)` via `puppeteer-core` côté serveur (rendu fidèle).
  - `exportOracleAsMarkdown(strategyId)` via templates.
- Nouvel Intent `EXPORT_ORACLE` (gouverné Mestor → Artemis tool, instrumenté NSP).
- Schema versioning des 21 sections (`OracleSectionSchema.v1`, `v2`).

**Oracle Time Travel** :
- Nouvelle table `OracleSnapshot { id, strategyId, takenAt, snapshotJson, schemaVersion, parentIntentId }`.
- Chaque `enrichOracleNeteru` produit un snapshot atomique en fin d'intent.
- UI `/cockpit/brand/[id]/oracle/history` : timeline de tous les snapshots, clic = preview, "compare avec courant" = diff visuel section par section.
- Replay : "exporter l'Oracle au 15 mars" génère le PDF/MD à partir du snapshot.
- Permet à un founder de voir l'évolution (ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE) avec dates et drivers.

#### 7.4 — Pages UI à finir

- `src/app/(intake)/oracle/proposition/page.tsx` — porter depuis `src/app/(cockpit)/cockpit/brand/proposition/page.tsx`. Factoriser en composant unique `ProposalView`.
- `src/app/(console)/console/config/integrations/page.tsx:173` — implémenter OAuth réel (Google, Meta, LinkedIn) via NextAuth providers étendus + table `IntegrationConnection`. Tokens chiffrés AES-GCM.

#### 7.5 — Suppression doublons

- `src/components/landing 2/`, `src/server/mcp/notoria 2/`, `src/server/services/financial-brain 2/`, `src/server/services/advertis-connectors 2/`, `src/server/mcp/advertis-inbound 2/`. Pour chaque : `grep -rn "<dossier>"` puis `git rm -r`. Lint rule `no-numbered-duplicates` ajoutée.

#### 7.6 — README upgrade

- Header version dynamique lue depuis `package.json` (script `scripts/sync-readme-version.ts` lancé en pre-commit).
- Panthéon Neteru (7 actifs : Mestor, Artemis, Seshat, Thot, Ptah, Imhotep, Anubis — cap APOGEE atteint depuis Phase 14/15 ; voir [PANTHEON.md](PANTHEON.md)).
- Nouveaux chapitres : **Intelligence cross-brand** (Jehuty + ranker), **NSP — Streaming temps réel**, **Modularité** (résumé du framework custom), **Gouvernance** (Intent dispatcher).
- Diagrammes Mermaid pour le flow d'un intent et le layering.
- Section "Pour les contributeurs" → renvoie à `CONTRIBUTING.md` et `docs/governance/ADDING-A-CAPABILITY.md`.

#### 7.7 — MFA admin

- NextAuth v5 + custom adapter, TOTP pour `role=ADMIN` (table `MfaSecret`, librairie `otplib`). Forced setup, pas de "remember device".

**Critères de succès Phase 7** :
- `grep -c "v4.0" README.md` → 0.
- `grep -c "Thot" README.md` ≥ 3.
- Landing rend 14 sections dont 4 nouvelles (`OracleShowcase`, `CrossBrandIntelligence`, `Architecture`, démos NSP intégrées dans `HowItWorks` + `NeteruShowcase`).
- Test e2e Playwright `tests/e2e/landing.spec.ts` valide que toutes les sections rendent + démos NSP animent en mode replay.
- 0 fichier `* 2/` dans le repo.
- README publié avec diagrammes Mermaid rendus correctement sur GitHub.
- `/changelog` et `/status` accessibles publiquement.

---

### Phase 8 — Hardening & docs (S10–S11, ~5j, parallélisable avec P7)

**Documentation** :
- `docs/governance/ARCHITECTURE.md` — diagramme Mestor↔Artemis↔Seshat↔Thot, flow d'un intent, layering.
- `docs/governance/ADDING-A-CAPABILITY.md` — tutoriel scaffold + manifest + test (avec exemple complet).
- `docs/governance/INTENT-CATALOG.md` — généré depuis manifests, liste tous les intents et versions.

**Observabilité** :
- `IntentLog` exposé dans Console admin (`/console/governance/intents`) — recherche, replay, diff payload v1/v2.
- Endpoint `/api/admin/metrics` — intents/min, success rate par kind, p95 latency, cost.

**Préflight renforcé** : `scripts/preflight.sh --full` étend dep-cycle + governance-audit + e2e cascade + manifest registry diff. Husky pre-push lance `--quick`.

**SDK public `@lafusee/sdk`** :
- Génération automatique depuis tRPC routers via `trpc-openapi` ou type-inference direct.
- Package npm versionné semver (alignement Phase 0 sur conventional commits).
- Documentation Mintlify auto-générée depuis manifests + JSDoc.
- Permet à des partenaires UPgraders de scripter contre l'OS sans toucher au repo (lien fort avec plugin architecture P2.7).
- Premier consumer : un script CLI `lafusee-cli` qui démontre intake → Oracle export end-to-end.

**Mobile-first audit** :
- Lighthouse mobile cible perf score ≥85 sur les 5 pages critiques (intake, cockpit/brand, console/oracle, agency/missions, creator/missions).
- Lazy-load systématique des assets >50KB.
- Topbar simplifiée mobile (déjà partielle via `MobileTabBar`).
- Test sur smartphones réels via BrowserStack ou équivalent (3 devices : low-end Android, mid Android, iOS).

**Internationalisation Oracle output** :
- Le contenu Oracle (21 sections) accepte une `lang` parameter (FR/EN initial).
- Mestor route vers un prompt localisé selon la `lang` du brand.
- `OracleSnapshot.lang` stocké pour traçabilité.
- Étendable plus tard à PT, AR pour marchés africains anglophones/lusophones/arabophones.

### Phase 11 — Design System Migration (panda + rouge fusée) (~6 sem, label `out-of-scope`)

Démarrée 2026-04-30. Refonte complète du DS vers une palette panda noir/bone + accent rouge fusée, gouvernée [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), enforced par CI bloquant.

**Trigger** : 60% du code visuel utilise `text-zinc-*`/`bg-zinc-*`/`text-violet-*`/hex hardcoded au lieu des tokens sémantiques. CVA déclaré mais inutilisé. Aucune primitive `src/components/primitives/`. Aucun manifest UI. Aucun test visuel/a11y/i18n. Drift répété sur `PricingTiers`. Direction brand non-reflétée par la palette violet/emerald (V5.0).

**Architecture** : 4 couches token cascade (Reference → System → Component → Domain) + Primitives CVA + Patterns documentés (~60) + Surfaces avec `data-density` per portail. Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [ADR-0013](adr/0013-design-system-panda-rouge.md).

**9 sous-PRs séquencés** (branche `feat/ds-panda-v1`) :
- **PR-1** : Foundation — DESIGN-SYSTEM.md canon (renommé depuis DESIGN-SYSTEM-PLAN.md), tokens cascade `src/styles/tokens/{reference,system,component,domain,animations}.css`, ADR-0013, 5 docs séparés (LEXICON/TOKEN-MAP/MOTION/A11Y/I18N), 4 catalogues design-tokens, COMPONENT-MAP initial, 2 tests anti-drift bloquants (coherence + cascade). v5.5.0
- **PR-2** : Primitives core — `defineComponentManifest` helper (Zod, mirror backend `defineManifest`), `cva-presets`, 5 primitives Wave 0 (Button/Card/Input/Badge/Dialog) avec manifests + tests unit. Test bloquant `design-primitives-cva`. v5.5.1
- **PR-3** : Storybook + Chromatic + COMPONENT-MAP auto-généré. v5.5.2
- **PR-4** : Codemod zinc→tokens + audit:design + tests warning. v5.5.3
- **PR-5** : Primitives complètes (~33 — Tooltip/Popover/Sheet/Stepper/Command/etc.). v5.5.4
- **PR-6** : Wave 1+2 migration (atomic + composite shared) + data-density per portail (test bloquant). v5.5.5
- **PR-7** : Wave 3+4 migration (Cockpit + Console business). v5.5.6
- **PR-8** : Wave 5+6 — Neteru + Intake/Public + **Landing v5.4 dans `(marketing)/`** (substitution INFRASTRUCTURE → Ptah cohérent BRAINS const). v5.5.7
- **PR-9** : CI strict + cleanup + preview page `/console/governance/design-system` + ESLint rules `lafusee/design-token-only` + `lafusee/no-direct-lucide-import` + husky pre-commit. v5.5.8

**Enforcement** :
- 6 tests anti-drift CI bloquants (`tests/unit/governance/design-*.test.ts`)
- 2 règles ESLint custom (`eslint-plugin-lafusee` étendu)
- Tests visuels Playwright + Chromatic
- Tests a11y axe-core (0 violation critique/sérieuse)
- Tests i18n RTL + zoom 200%
- Codemod automatisé `scripts/codemod-zinc-to-tokens.ts`
- Storybook + page Console preview

**Substitution narrative** : la section "Gouverneurs" landing (HTML Downloads V5.4) listait `INFRASTRUCTURE` à la place de `Ptah`. Aligné sur BRAINS const 5 actifs (Mestor, Artemis, Seshat, Thot, **Ptah**). Cf. ADR-0013 §3 et [PANTHEON.md](PANTHEON.md).

**Sous-système APOGEE concerné** : Console/Admin — INFRASTRUCTURE (Ground Tier §4 [APOGEE.md](APOGEE.md)). Aucun Neter créé, aucune mutation business. `missionContribution: GROUND_INFRASTRUCTURE`, `groundJustification` : "DS unifié → vélocité industrialisation forges/briefs/manifests/signaux → accumulation superfans + Overton plus rapide" (cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) tête).

**Exit criteria** :
- Tests anti-drift CI tous bloquants verts
- Dette zinc résiduelle = 0 (audit:design)
- COMPONENT-MAP : tous composants `migrated`
- Landing v5.4 portée
- `npm run stress:full` vert post-migration

---

## Critical Files

**À créer** :
- `src/domain/pillars.ts`, `src/domain/lifecycle.ts`, `src/domain/touchpoints.ts`, `src/domain/intent-progress.ts`, `src/domain/index.ts`
- `src/server/governance/manifest.ts`, `event-bus.ts`, `intent-versions.ts`, `bootstrap.ts`
- `src/server/governance/registry.generated.ts` (codegen)
- `src/server/governance/nsp/{server,types,replay}.ts` (Neteru Streaming Protocol)
- `src/components/neteru/` — `MestorPlan`, `ArtemisExecutor`, `SeshatTimeline`, `ThotBudgetMeter`, `NeteruActivityRail`, `CascadeProgress`, `OracleEnrichmentTracker`, `PartialContentReveal`, `IntentReplayButton`, `CostMeter`, `NeteruSkeleton`
- `src/lib/hooks/use-neteru.ts` (hook unifié streaming intent)
- `src/components/landing/{oracle-showcase,cross-brand-intelligence,architecture}.tsx` (3 nouvelles sections)
- `src/app/(public)/changelog/page.tsx`, `src/app/(public)/status/page.tsx`
- `eslint-plugin-lafusee/` (workspace, 3 rules + `no-numbered-duplicates`)
- `.github/workflows/ci.yml`, `governance-drift.yml`
- `scripts/audit-governance.ts`, `gen-manifest-registry.ts`, `scaffold-capability.ts`, `sync-readme-version.ts`
- `docs/governance/{ARCHITECTURE,ADDING-A-CAPABILITY,INTENT-CATALOG,NSP-PROTOCOL,baseline-2026-04}.md`
- Storybook config + stories pour Neteru UI Kit

**À modifier (priorité)** :
- `src/server/services/mestor/intents.ts` — devient point d'entrée unique
- `src/server/services/neteru-shared/governance-registry.ts` — fusionne avec nouveau registry
- `src/server/trpc/routers/pillar.ts` — migration #1 (le pire offender)
- `src/server/trpc/routers/strategy.ts:62-64` — migration #2
- `src/server/services/advertis-scorer/index.ts` — exposé via wrapper unique
- `src/lib/types/pillar-schemas.ts` — ré-export depuis `domain/`
- `prisma/schema.prisma` — `IntentLog` + `IntentQueue` + `MfaSecret` + `IntegrationConnection`
- `src/app/(intake)/oracle/proposition/page.tsx` — port depuis cockpit
- `src/app/(console)/console/config/integrations/page.tsx:173` — OAuth réel

**À supprimer** :
- `src/components/landing 2/`
- `src/server/mcp/notoria 2/`, `advertis-inbound 2/`
- `src/server/services/financial-brain 2/`, `advertis-connectors 2/`

---

## Vérification

**Par phase** (gates avant de passer à la suivante) :
- **P0** : CI verte sur main actuel, baseline.md committed.
- **P1** : `grep '"A".*"D".*"V".*"E"' src/` → 0 hors domain. `npm run lint` vert avec `no-hardcoded-pillar-enum: error`.
- **P2** : tous services ont manifest, `npm run scaffold:capability` produit un nouveau capability fonctionnel e2e.
- **P3** : 100% mutations tRPC créent un `IntentLog`, kill-Seshat test vert, `no-direct-service-from-router: error` sans exception.
- **P4** : `madge --circular` → 0, coverage scoreObject ≥90%.
- **P5** : `tests/e2e/cascade-full` vert, governance-bypass test fail comme attendu.
- **P6** : export PDF Oracle diff visuel acceptable vs print, `/oracle/proposition` accessible aux 2 portails, 0 fichier `* 2/` dans le repo.
- **P7** : docs publiées, `/console/governance/intents` fonctionnel.

**End-to-end** :
1. Lancer `npm run dev` + `prisma migrate deploy` sur DB clean.
2. Console : créer brand → quick intake → trigger ADVE→RTIS cascade.
3. Vérifier en DB : `SELECT * FROM "IntentLog" WHERE strategyId=... ORDER BY startedAt` montre la séquence complète Mestor→Artemis→Seshat.
4. Cockpit : ouvrir `/cockpit/brand/<id>/proposition` → Oracle 21 sections rendues.
5. Export PDF → fichier généré identique au browser print à ±2% diff visuel.
6. Cockpit + Intake : `/oracle/proposition` rendent le même composant (0 duplication).
7. Tenter (en branche test) un router qui appelle `notoria.runIntake()` directement → CI fail sur `no-direct-service-from-router`.
8. Tuer Seshat (mock throw) → cascade complète OK, IntentLog status=OK pour tous, Seshat events en `failed` non bloquants.
9. Login admin sans MFA → forced setup TOTP avant accès.

---

## Métriques de succès du programme

Mesurées avant/après (cf. baseline P0) :

| Métrique | Avant | Cible |
|---|---|---|
| Fichiers à toucher pour ajouter une fonction | ~6+ | 3 (manifest, impl, test) |
| Routers qui contournent governance | ≥5 | 0 |
| Sites hardcodant `["A","D","V","E","R","T","I","S"]` | 6+ | 0 |
| Callsites distincts de `scoreObject` | 16 | 1 + wrappers gouvernés |
| Cycles d'imports | ≥3 | 0 |
| Coverage gouvernance (`governance/`, `mestor/`, `artemis/`) | ~5% | ≥80% lignes |
| Durée CI | n/a | <15 min |
| CI vert sur main | n/a | 100% du temps |
| Time-to-first-PR onboarding dev | n/a | ≤2 jours |
| Pages LLM-driven sans feedback visuel | ~10 | 0 |
| Latence p50 perçue (premier feedback visuel après clic) | n/a | <800ms (PROPOSED event) |
| Replay possible d'un intent terminé | non | oui (depuis `IntentEmissionEvent`) |
| Sections landing alignées vocab `domain/pillars.ts` | partiel | 100% |
| Composants Neteru UI Kit publiés en Storybook | 0 | ≥10 |
| Glory tools sans manifest | 91 | 0 |
| Stub routers v3 non résolus | 9 | 0 |
| Tables `db.*` accédées en bypass de `tenantScopedDb` | inconnu | 0 |
| Hash-chain `IntentEmission` rupture (rolling 7d) | n/a | 0 |
| SLOs définis par Intent kind | 0 | 100% |
| Lighthouse mobile perf score (5 pages critiques) | inconnu | ≥85 |
| Plugins externes installables via SDK | 0 | ≥1 (démo loyalty) |
| Oracle snapshots time-travel disponibles | 0 | tous les enrichOracleNeteru |
| PRs avec label `out-of-scope` mergées sans justif écrite | n/a | 0 |

---

## Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Régression silencieuse pendant migration des 70 routers | Élevé | Dual-write + comparaison output + feature flag `GOVERNANCE_STRICT_MODE` + déploiements canary |
| Latence IntentLog write | Moyen | Index Prisma sur `(strategyId, createdAt)`, write asynchrone via `setImmediate`, batch flush cron pour low-priority |
| Manifest auto-discovery casse au build Next | Moyen | Codegen committed (pas runtime), snapshot test sur `registry.generated.ts` |
| Lazy imports difficiles à éliminer (Next.js code-splitting légitime) | Faible | Whitelist explicite avec justification commentée par fichier |
| Équipe fatigue rigueur lint | Moyen | Pair programming P1, scaffold tool qui supprime la friction |
| Rollback impossible mi-P3 | Élevé | Tags git par phase, scripts rollback Prisma testés en staging, additive only |
| Tests Playwright lents en CI | Faible | Smoke set en PR, full set en cron nuit, parallélisation par worker |

---

## Ordre d'exécution

```
S1     P0 (CI/lint)               ──┐
S2     P1 (SSOT domaine)          ──┘   (parallèles)
S3     P2 (Manifests)
S4-5   P3 (Bus + dispatcher v2)         ← critique, dual-write
S6     P4 (Layering + scorer)
S7-8   P5 (NSP + Neteru UI Kit)         ← majeur, prévisibilité visuelle
S9     P6 (Filets E2E governance)
S10    P7 (Oracle exports + Landing/README upgrade) ──┐
S10-11 P8 (Docs + observabilité)                     ──┘   (parallèles)
```

Total : **11–13 semaines** (1 dev senior plein temps), **7–8 semaines** (2 devs en parallèle sur P0+P1, P5+P6, P7+P8). L'extension vs estimation initiale (10–11 sem) absorbe : Glory Tools governance (91 manifests), hash-chain audit log, tenant hardening, CRDT collab, offline PWA, Oracle time travel, multi-LLM smart routing, SDK public, mobile audit, i18n Oracle.

**Le coût "sans compromis"** : ~3 semaines de plus que la version prudente, mais l'OS sort comme un vrai produit shippable industriel, pas comme un prototype ambitieux.

---

## Phase 13 — Sprint Oracle 35-section (PR #26, mai 2026)

**Verrouille l'Oracle dans un framework canonique unique de 35 sections, irrigue le pipeline avec tous les outils des Neteru actifs (5 au moment de Phase 13, désormais 7 depuis Phase 14/15), NSP wired, Ptah forge à la demande.**

Sections cibles : 21 CORE (Phase 1-3 ADVERTIS, inchangées) + 7 BIG4 baseline (McKinsey/BCG/Bain/Deloitte) + 5 distinctifs La Fusée (Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis) + 2 dormantes (Imhotep/Anubis pré-réservés Oracle-stub).

10 batches commitables séquentiels (B1→B10) dans une PR draft progressive (#26) :

| Batch | Scope | Tests créés |
|---|---|---|
| B1 | SECTION_REGISTRY 21→35 + BrandAsset.kind +10 + canonical lock | 14 |
| B2 | 7 nouveaux Glory tools (DC layer) + 3 étendus | 13 |
| B3 | 14 nouvelles Glory sequences + flag `_oracleEnrichmentMode` | 17 |
| B4 | SECTION_ENRICHMENT 35 + BrandAsset promotion writeback (idempotent Loi 1) | 11 |
| B5 | UI 14 sections + dormancy badges (DS Phase 11 strict) | 14 |
| B6 | PDF auto-snapshot pre-export (idempotence SHA256) | 15 |
| B7 | NSP streaming tracker 35-section + tier groups + page wiring | 12 |
| B8 | Ptah on-demand forge buttons (4 sections distinctives) | 17 |
| B9 | Imhotep & Anubis Oracle-only stubs (sortie partielle pré-réserve) | 13 |
| B10 | CHANGELOG + 5 ADRs (0014-0018) + 7-source propagation + APOGEE doc updates | — |

**ADRs Phase 13** :
- [ADR-0014](adr/0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- [ADR-0015](adr/0015-brand-asset-kind-extension.md) — Extension BrandAsset.kind +10
- [ADR-0016](adr/0016-oracle-pdf-auto-snapshot.md) — PDF auto-snapshot pre-export
- [ADR-0017](adr/0017-imhotep-partial-pre-reserve-oracle-only.md) — Imhotep sortie partielle
- [ADR-0018](adr/0018-anubis-partial-pre-reserve-oracle-only.md) — Anubis sortie partielle

**Cap 7 BRAINS preserved** : Imhotep + Anubis restent pré-réservés (statut inchangé). Aucun nouveau Neter ajouté à `BRAINS` const.

**Ptah à la demande** : flag `_oracleEnrichmentMode: true` court-circuite `chainGloryToPtah` durant `enrichOracle`. Forges Ptah déclenchées exclusivement via boutons "Forge now" B8 (4 sections distinctives forgeable).

**DS Phase 11 strict** : composition primitives uniquement, CVA pour variants, tokens cascade Component+Domain, zéro hardcoding hex/Tailwind couleur.

**Anti-doublon NEFER §3** : zéro nouveau modèle Prisma, réutilisation `cult-index-engine`, `seshat/tarsis`, `manipulation-matrix` existants.

Total tests anti-drift Phase 13 : **126 nouveaux** (registry-completeness 14, glory-tools 13, sequences 17, section-enrichment 11, ui 14, pdf-snapshot 15, nsp-streaming 12, ptah-forge 17, imhotep-anubis-stubs 13).

---

## Phase 14 — Imhotep full activation Crew Programs (PR #31, mai 2026)

**Auto-correction NEFER Phase 8** : drift Phase 13 (sortie partielle Oracle-only ratifiée par ADR-0017) signalée par l'opérateur — le scope demandé était le full service Imhotep prévu par ADR-0010. ADR-0017 marqué Superseded par [ADR-0019](adr/0019-imhotep-full-activation.md).

**Imhotep devient le 6ème Neter actif.** Architecture orchestrateur qui wrappe les services satellites existants sous gouvernance unifiée Mestor → Imhotep → satellite :

- `matching-engine` (suggest, scoreCandidates)
- `talent-engine` (matchTalentsForMission, evaluateAllPromotions)
- `team-allocator` (suggestAllocation)
- `tier-evaluator` (evaluateCreator)
- `qc-router` (routeReview, assignReviewer, automatedQc)

**Anti-doublon NEFER §3 strict — 0 nouveau model Prisma.** Réutilise `TalentProfile`, `Course`, `Enrollment`, `TalentCertification`, `TalentReview`, `Mission`, `MissionDeliverable` existants.

8 capabilities manifest : `draftCrewProgram`, `matchTalentToMission`, `assembleCrew`, `evaluateTier`, `enrollFormation`, `certifyTalent`, `qcDeliverable`, `recommendFormation`.

7 nouveaux Intent kinds + SLOs déclarés. 4 nouveaux Glory tools : `crew-matcher` (HYBRID/LLM), `talent-evaluator` (DC/CALC), `formation-recommender` (HYBRID/LLM), `qc-evaluator` (DC/LLM).

tRPC router `imhotep.ts` (9 procédures + dashboard agrégé). Page hub `console/imhotep/page.tsx` qui pivote vers les pages Console existantes (`arene/matching`, `arene/club`, `arene/orgs`, `academie`, `academie/certifications`).

**Cascade Crew** : Mestor → Imhotep assemble crew → Artemis/Ptah produisent les assets → Anubis broadcast → Seshat observe engagement → Thot facture.

---

## Phase 15 — Anubis full activation Comms + Credentials Vault (PR #31, mai 2026)

**Auto-correction NEFER Phase 8 (jumeau Phase 14).** ADR-0018 marqué Superseded par [ADR-0020](adr/0020-anubis-full-activation.md). Pattern transverse Credentials Vault formalisé dans [ADR-0021](adr/0021-external-credentials-vault.md) (demande explicite opérateur : back-office UI pour les API keys).

**Anubis devient le 7ème Neter actif. Cap APOGEE atteint 7/7.**

Architecture orchestrateur wrappant les services satellites comms existants (`email`, `advertis-connectors`, `oauth-integrations`) + introduction du **Credentials Vault** :

**Pattern Credentials Vault (ADR-0021)** : tout connector externe est CRUDé via UI back-office `/console/anubis/credentials` qui pilote `ExternalConnector` (model V5 existant). Provider façades feature-flagged retournent `DEFERRED_AWAITING_CREDENTIALS` quand pas de creds — **code ship-able sans clés API**, l'operator finit la config plus tard via UI. Pattern réutilisable par tout futur Neter.

**4 nouveaux models Prisma** (anti-doublon NEFER §3 — réutilise `Notification`, `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants) :
- `CommsPlan` — plan comms global pour stratégie/campagne
- `BroadcastJob` — queue persistante avec retry + tracking
- `EmailTemplate` + `SmsTemplate` — templates réutilisables

11 capabilities manifest : `draftCommsPlan`, `broadcastMessage`, `buyAdInventory`, `segmentAudience`, `trackDelivery`, `registerCredential`, `revokeCredential`, `testChannel`, `scheduleBroadcast`, `cancelBroadcast`, `fetchDeliveryReport`.

10 nouveaux Intent kinds + SLOs. 3 nouveaux Glory tools : `ad-copy-generator` (CR/LLM), `audience-targeter` (HYBRID/LLM), `broadcast-scheduler` (HYBRID/CALC).

7 provider façades feature-flagged (via `_factory.createProviderFaçade` DRY) : Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio, email-fallback. Stubs Phase 15 — vrais SDKs livrés par PRs ultérieures dédiées par provider, déclenchées une fois que l'operator a fourni les credentials.

tRPC router `anubis.ts` (14 procédures). **Sécurité ADR-0021** : `listCredentials` ne retourne JAMAIS `config` (secrets stay server-side).

Pages : `console/anubis/page.tsx` (dashboard 5 KPIs + warning credentials INACTIVE) + `console/anubis/credentials/page.tsx` (Credentials Center back-office — CRUD avec form dynamique selon provider, action Test/Revoke).

**Cascade Comms** : Mestor → Anubis broadcast vers audience segmentée → Seshat observe engagement → Thot facture campagne.


## Phase 17 — Country-Scoped Knowledge Base + MarketStudy ingestion + Variable-bible canonical audit (PRs sur main, mai 2026)

[ADR-0037](adr/0037-country-scoped-knowledge-base.md). Sprint complet shipping 12 sub-PRs (A→L) qui résolvent 3 dérives architecturales découvertes simultanément :

1. **Seshat KB pas pays-scopé** — `KnowledgeEntry.market` était texte libre, jamais filtré par ISO-2. Conséquence : entry CM hit chaud pour brand ZA même secteur. Pilier T halluciné sur tout pays sans seed dédié (seul Wakanda triche via seed-wakanda).
2. **Aucun pipeline d'ingestion d'études de marché** — un PDF Statista/Nielsen/Kantar/BCG uploadé restait fichier mort dans BrandDataSource. Le moteur ne savait pas absorber.
3. **Canon manuel ADVE pas mappé sur variable-bible.ts** — codes A1-A11/D1-D12/V1-V18/E-* du Workflow ADVE GEN invisibles dans le code. L'opérateur formé sur le manuel se perdait dans la nomenclature TS.

**Sub-PRs livrés :**

- **PR-A** — Migration `KnowledgeEntry.countryCode VARCHAR(2)` + index countryCode + composite (sector, countryCode) + UPDATE backfill 'WK' pour Wakanda. Seed wakanda 26-intelligence pousse `countryCode: 'WK'` à chaque KE create.
- **PR-K** — Variable-bible canonical map. `VariableSpec` étendu avec `canonicalCode/Label/manualSection`. **21 nouveaux fields ADVE** comblant les gaps manuel : A messieFondateur/competencesDivines/preuvesAuthenticite/indexReputation/eNps/turnoverRate/missionStatement/originMyth, D positionnementEmotionnel/swotFlash/esov/barriersImitation/storyEvidenceRatio, V roiProofs/experienceMultisensorielle/sacrificeRequis/packagingExperience, E clergeStructure/pelerinages/programmeEvangelisation/communityBuilding. 62 codes mappés sur 155 entries. Auto-doc régen `VARIABLE-BIBLE-CANON.md`. Test anti-drift CI 65 tests. UI cockpit field-renderers : badge `[A1]/[D5]/[E-Clerge]` à côté de chaque label avec tooltip section manuel.
- **PR-B+C+E** — Tarsis country-aware. `SearchContext` étendu avec `countryCode/countryName/primaryLanguage/purchasingPowerIndex/region/countryMeta`. `buildSearchContext` joint `Country` row. `checkSectorKnowledgeByCountry` filtre strict par ISO-2. Persistence `countryCode` dans tous les `db.knowledgeEntry.create` Tarsis.
- **PR-D** — LLM prompts country-aware. `buildCountryContextPrompt` exporté — bloc CONTRAINTE DURE injecté dans `signal-collector` + `weak-signal-analyzer`. Calqué sur ADR-0030 §PR-Fix-2 anti-hallucination Wakanda. Compat legacy : retourne "" si pas de countryCode.
- **PR-L** — Schema typé `KnowledgeEntry.data`. Migration enum KnowledgeType +5 valeurs (MARKET_STUDY_TAM/COMPETITOR/SEGMENT/RAW + EXTERNAL_FEED_DIGEST). Module `seshat/knowledge/` : Zod schemas par entryType, Trend Tracker 49 catalog (12 MACRO_ECO + 8 MACRO_TECH + 10 SOCIO_CULT + 7 REGUL_INST + 12 MICRO_SECTOR), access helpers `getTamForCountrySector` / `getCompetitorSharesForCountrySector` / `getMarketSegmentsForCountrySector` / `getMacroAndWeakSignalsForCountrySector` / `getTrendTrackerForCountrySector` / `loadCountrySectorIntelligence`.
- **PR-I** — MarketStudy ingestion pipeline. Service `seshat/market-study-ingestion/` : extractor LLM + persister 1→N (RAW + TAM + N COMPETITOR + N SEGMENT + DIGEST) + sha256 dedup + preview/confirm/reExtract. 2 nouveaux Intent kinds (INGEST_MARKET_STUDY + RE_EXTRACT_MARKET_STUDY). Réutilise `extractPDF/DOCX/XLSX` de `ingestion-pipeline/extractors`. Pattern ADR-0027 calqué (output KE au lieu de BrandAsset).
- **PR-J** — UI complète. tRPC router `marketStudyIngestion` (preview/confirm/list/getDetail/reExtract/listTrendTracker/getTrendTrackerForCountrySector/loadCountrySectorIntelligence). Pages : `cockpit/intelligence/market-studies` (drag-drop modal upload) + `cockpit/intelligence/track` (49 variables Trend Tracker exposées par catégorie pour le pays/secteur du brand actif) + `console/seshat/market-studies` (admin all-strategies).
- **PR-G** — Tarsis external feeds. Service `seshat/external-feeds/` qui produit 1 EXTERNAL_FEED_DIGEST KE par (countryCode, sector). 8 priority pairs (CM/NG/CI/ZA/MA × fmcg/fintech). Idempotent day-granularity. Intent kind FETCH_EXTERNAL_FEED. Future iteration : remplace LLM-synthesis par RSS/News API quand keys provisionnées via Anubis Credentials Vault.
- **PR-F** — Anti-drift CI : 11 tests `country-scoped-kb.test.ts` + script `audit-cskb-coverage.ts` (threshold 10% transitional, cible 99%).
- **PR-H** — Closing : ADR statut Accepted, REFONTE-PLAN entry, LEXICON entry CSKB, CHANGELOG v6.17.0 grouped.

**Cap APOGEE 7/7 préservé** — pas de nouveau Neter, pas de bypass governance. Tout passe via `mestor.emitIntent`. Réutilise `BrandDataSource`, `KnowledgeEntry`, `extractText`, `Country` existants.

---

## Phase 17 — Deliverable Forge (output-first composition, ADR-0037, mai 2026)

**ADR figé, code à venir.** Cf. [ADR-0037](adr/0037-output-first-deliverable-composition.md) pour la décision et le découpage.

**Friction observée** : la cascade canonique Glory→Brief→Forge ([ADR-0009](adr/0009-neter-ptah-forge.md), [ADR-0028](adr/0028-glory-tools-as-primary-api-surface.md)) est puissante mais reste **input-first** — le founder doit savoir quel brief il veut avant de cliquer. Le Cockpit n'a pas de surface productive de bout-en-bout : `/cockpit/operate/briefs` listait flat, `/cockpit/brand/deliverables` consultait le vault, mais aucune page ne permettait de pointer un livrable matériel cible et déclencher la chaîne.

**Décision** : surface neuve `/cockpit/operate/forge` qui inverse le point d'entrée. Le founder sélectionne le `BrandAsset.kind` matériel cible (KV_POSTER, VIDEO_AD, MANIFESTO_VIDEO, SALES_DECK, …). Le resolver remonte le DAG des briefs requis via le nouveau champ `GloryToolForgeOutput.requires?: BrandAssetKind[]`. Le vault-matcher scanne `BrandAsset.where({ kind, state: ACTIVE, strategyId })` pour ré-utiliser ce qui existe + propose Régénérer / Rafraîchir / Générer pour le manquant. Le composer construit une `GlorySequence` runtime ad-hoc dispatchée via `sequence-executor` existant. Sortie : grappe `BrandAsset` liée par `parentBrandAssetId`.

**Cap APOGEE préservé 7/7** : Artemis governor (sous-composant Propulsion comme `brief-ingest`), pas de nouveau Neter, pas de nouveau model Prisma — `BrandAsset.parentBrandAssetId` (existant) suffit pour le lineage de la grappe.

**1 nouveau Intent kind** : `COMPOSE_DELIVERABLE` (sync dispatcher) ré-émet `INVOKE_GLORY_TOOL` + `PTAH_MATERIALIZE_BRIEF` + `PROMOTE_BRAND_ASSET_TO_ACTIVE` existants. SLO p95 = 60s (dispatch initial, pas complétion totale).

**Loi 2 séquencement** appliquée : resolver refuse `MISSING_PRECONDITION_PILLAR` si la marque n'a pas de `Strategy.manipulationMix.primary` validé OU aucun pilier ADVE en état ACTIVE — redirige UI vers `/cockpit/brand/proposition`.

**Loi 3 fuel** : Thot pre-flight `CHECK_CAPACITY` avant `compose()` ; modale confirmation user obligatoire avec total estimé (peut atteindre $50–200 pour 5 briefs + 4 forges Magnific).

**Découpage 6 commits atomiques** (cf. ADR-0037 Notes implémentation) :
1. `feat(glory-registry)` — extension `forgeOutput.requires` + remplissage 18 tools `brief→forge` existants
2. `feat(intent)` — `COMPOSE_DELIVERABLE` kind + SLO + handler delegate
3. `feat(deliverable-orchestrator)` — service complet (resolver + vault-matcher + composer) + tests unit
4. `feat(trpc)` — router 3 procédures (`resolveRequirements` / `compose` / `getProgress`) + tests
5. `feat(cockpit)` — page `/cockpit/operate/forge` + composants UI + NSP wiring
6. `docs(governance)` — propagation finale (PAGE-MAP, SERVICE-MAP, ROUTER-MAP, LEXICON, glory-tools-inventory auto-régen)

**Capital cumulatif** : chaque exécution enrichit le vault. La 2ème production réutilise les briefs intellectuels ACTIVE de la 1ère (manifesto, big idea, mood board) — la friction décroît avec le temps.
