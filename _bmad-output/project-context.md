---
project_name: ADVE-project
project_codename: lafusee
version: 6.22.8
user_name: X-tin
date: 2026-05-13
sections_completed:
  - identity_mission
  - technology_stack
  - apogee_framework
  - neteru_pantheon
  - architecture_invariants
  - nefer_protocol
  - language_rules
  - framework_rules
  - domain_model
  - brand_tree
  - oracle
  - pillars_adve_rtis
  - cascade_glory_brief_forge
  - api_surfaces
  - nsp_streaming
  - llm_gateway
  - mcp_bidirectional
  - credentials_vault
  - multi_tenant
  - hash_chain
  - auth
  - design_system
  - how_to_per_artifact
  - testing
  - ci_workflows
  - code_quality
  - commits_prs
  - phase_status
  - dont_miss
  - security
  - rationalization_backlog
  - prd_guardrails
  - canonical_sources
  - commands
  - glossary
existing_patterns_found: 35
phase: "rationalisation — code presque fini ; ce doc couvre greenfield ET résorption de dette"
audience: "agent IA en session fraîche OU contributeur humain ; lire en complément de CLAUDE.md"
status: complete
section_count: 33
backlog_items: 8
optimized_for_llm: true
language: fr
override_bmm_config: "BMM config indique English ; corpus gouvernance est FR ; cohérence > config — écrit en FR"
---

# Project Context — ADVE-project (La Fusée Industry OS)

_Référentiel exhaustif pour agents IA et humains contributeurs. **N'EST PAS** la source de vérité — pointe vers `CLAUDE.md` + `docs/governance/` + `docs/scan/`. Concentre tout ce qu'un agent doit savoir pour travailler **greenfield ou résorption de dette** sans drift._

> **Ordre de lecture** : §1 identité → §2 stack → §5 architecture → §6 interdits → §7 NEFER → §19 how-to (selon artefact à toucher) → §27 backlog si rationalisation.

---

## §1 — Identité & mission

### 1.1 Produit

- **Nom** : La Fusée (codé `lafusee`). **Industry OS** pour le marché créatif africain.
- **Jamais** : "platform", "LaFusee OS", "LaFusee", "SaaS".
- **Opérateur** : les **UPgraders** (l'agence-fixer interne). Multi-tenant root = `Operator` model.

### 1.2 Méthode codée

**ADVE / RTIS** — cascade A→D→V→E→R→T→I→S obligatoire (`Loi 2 séquencement étages`).

- **ADVE** = piliers **fondateurs** (Awareness / Desire / Value / Engagement). **Gratuit (intake)**. Édités par opérateur via `OPERATOR_AMEND_PILLAR` (3 modes — cf. §13).
- **RTIS** = piliers **dérivés** (Retention / Trust / Innovation / Strategy). **Cascade payante**. **Jamais édités manuellement** — type-level constraint sur `pillarKey`. Refresh via Intent kinds `ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`.
- **I = Innovation, S = Strategy** (pas Sales).

### 1.3 Trois plans distincts (intangible — ne jamais mélanger)

| Plan | Quoi |
|---|---|
| **Portail** (UI) | Console (UPgraders, jamais vendu) • Cockpit (founder client) • Agency (partenaires) • Creator (freelancers) • Intake (public) |
| **Livrable** | `BrandAsset.kind` ∈ BIG_IDEA / CREATIVE_BRIEF / MANIFESTO / ORACLE_DOCUMENT / claim / KV / ... |
| **OS** | La Fusée elle-même — **invisible au client** |

### 1.4 Mission north star

> **La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur.**

- **Superfans** = masse stratégique (ambassadeurs + évangélistes) qui produit du travail organique pour la marque. **Pas un compteur de visiteurs.**
- **Overton** = axe culturel sectoriel. Quand la marque le déplace, le secteur se redéfinit autour d'elle.
- **Drift test** : un module qui ne contribue pas à cette mécanique (directement ou via chaîne explicite) **dérive** → procédure d'auto-correction `MISSION.md §8`.

---

## §2 — Technology Stack & versions

| Layer | Stack |
|---|---|
| Runtime | **Node ≥ 20** (CI: 20) • **PostgreSQL ≥ 14** • npm ≥ 10 |
| Framework | **Next.js 16.2.4** (App Router, Turbopack dev obligatoire) • **React 19.2.5** • **TypeScript 6.0.3** (strict) |
| API | **tRPC 11.17** • REST 17 groupes (`src/app/api/`) • **NSP SSE** custom (`/api/nsp`) |
| DB | **Prisma 7.8** + driver adapter `@prisma/adapter-pg` — **165 modèles** • **61 enums** • **24 migrations** |
| Auth | **NextAuth v5.0.0-beta.25** + `@auth/prisma-adapter` 2.11 + `bcryptjs` 3 |
| UI | **Tailwind 4.2** + **CVA 0.7.1** + Storybook + Chromatic + `lucide-react` 1.14 + `recharts` 3.8 |
| LLM | **AI SDK v6** + `@anthropic-ai/sdk` 0.92 + `@ai-sdk/openai` 3.0 + `@ai-sdk/anthropic` 3.0 + `@modelcontextprotocol/sdk` 1.29 |
| Validation | **Zod 4.4** (runtime) ; types Prisma (compile-time) |
| Tests | **Vitest 4.1** + **Playwright 1.59** (e2e/a11y/i18n/visual) + Chromatic |
| Lint | **ESLint 10.3** + `eslint-plugin-boundaries` 6 + **`eslint-plugin-lafusee`** (custom) + Husky 9 + commitlint 20 |
| Tooling | `tsx` 4.19 (tous scripts) • `madge` 8 (cycles) • `puppeteer` 24 • `babel-plugin-react-compiler` 1.0 • `superjson` 2.2 |
| Exports | `jspdf` 4 + `xlsx` 0.18 + `mammoth` 1.12 + `html2canvas` 1.4 + `pdf-parse` 2.4 |
| Stats | 1113 fichiers `.ts/.tsx` • 100 services • 80 routers • 165 pages • 127 tests • 76 ADRs • 11 CI workflows |

**Contraintes critiques** :
- **TS 6 strict** ; `as never` interdit (dette tracée `scripts/audit-governance.ts`).
- **Prisma 7** : `migrate dev` obligatoire ; **`db:push` INTERDIT depuis Phase 5**.
- **React Compiler** activé → ne pas pré-optimiser `useMemo`/`useCallback` sans mesure.
- **Zod 4** schema-first ; pas de coercion silencieuse (Phase 21 F-A).
- **Turbopack** en dev (`next dev --turbopack`).

---

## §3 — Framework APOGEE

### 3.1 Trois Lois de la trajectoire

1. **Conservation de l'altitude** — pas de régression silencieuse. Hash-chained Intent log enforce.
2. **Séquencement des étages** — cascade A→D→V→E→R→T→I→S **unidirectionnelle** sauf re-entry explicite.
3. **Conservation du fuel** — Thot tracke propellant, refuse combustions qui flame-out la mission.

### 3.2 Cinq piliers FRAMEWORK

(Source : `docs/governance/FRAMEWORK.md`)

1. **Manifest-first** — toute capability déclare manifest avant code.
2. **Intent-bus** — toute mutation passe par `mestor.emitIntent`.
3. **Hash-chain** — immutabilité par construction.
4. **NSP SSE** — transparence en temps réel.
5. **Tenant default-deny** — sécurité par défaut.

### 3.3 Huit sous-systèmes

| Tier | Sous-système | Neter governor | Service path |
|---|---|---|---|
| **Mission** | Propulsion | **Artemis** + **Ptah** | `services/artemis/` + `services/ptah/` |
| Mission | Guidance | **Mestor** | `services/mestor/` |
| Mission | Telemetry | **Seshat** | `services/seshat/` (+ Tarsis sub-component) |
| Mission | Sustainment | **Thot** | `services/financial-brain/` |
| **Ground** | Operations | **Thot** (extension) | `services/financial-brain/operations/` |
| Ground | Crew Programs | **Imhotep** | `services/imhotep/` |
| Ground | Comms | **Anubis** | `services/anubis/` |
| Ground | Console/Admin | INFRASTRUCTURE | `services/system-config/` etc. |

### 3.4 Sept Tiers de trajectoire

`ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE` (ICONE = apex — superfans en orbite stable, Overton shifted, patrimoine sectoriel).

### 3.5 Trois decks UI

| Deck | Pour qui | Surface |
|---|---|---|
| **Mission Control** | Console / UPgraders | `(console)` route group |
| **Cockpit** | Founders client | `(cockpit)` route group |
| **Crew Quarters** | Agency / Creator | partages avec `(console)` |
| **Launchpad** | Public intake | `(intake)` + `(landing)` |

---

## §4 — Les 7 Neteru (Pantheon)

> **Cap APOGEE = 7. Intangible.** Aucun 8ème governor sans ADR (et déjà refusé : Higgsfield = connector externe, pas Neter).

| Neter | Tier | Rôle | Service |
|---|---|---|---|
| **Mestor** | Mission | Guidance, **Intent dispatcher unique** | `src/server/services/mestor/` |
| **Artemis** | Mission | Propulsion phase **brief** — Glory tools rédactionnels | `src/server/services/artemis/` |
| **Ptah** | Mission | Propulsion phase **forge** — matérialisation assets via providers (Magnific 95% + Adobe + Figma + Canva) | `src/server/services/ptah/` |
| **Seshat** | Mission | Telemetry + Tarsis weak signals | `src/server/services/seshat/` |
| **Thot** | Mission | Sustainment + Operations, fuel/budget/cost-gate | `src/server/services/financial-brain/` |
| **Imhotep** | Ground | Crew Programs — matching/talent/team/QC/formation | `src/server/services/imhotep/` |
| **Anubis** | Ground | Comms — broadcast multi-canal + ad networks + email/SMS + notifications + Credentials Vault + MCP | `src/server/services/anubis/` |

**NEFER** = l'**opérateur** qui exécute les Intents. **N'est PAS un Neter** (pas dans `BRAINS` const).

**Cascades canoniques** :
- **Glory→Brief→Forge** : Mestor → Artemis (brief) → Ptah (forge) → Seshat (observe) → Thot (facture).
- **Crew + Comms** : Mestor → Imhotep (assemble) → Artemis/Ptah (assets) → Anubis (broadcast) → Seshat → Thot.

### 4.1 Manipulation Matrix (4 modes — cap=4, intangible)

Paramètre transverse qui décrit *comment* la brand transforme l'audience en propellant.

| Mode | Logique |
|---|---|
| `peddler` | vente directe / urgence |
| `dealer` | dépendance / cycle / abonnement |
| `facilitator` | utilité / friction réduite |
| `entertainer` | identification / fiction / spectacle |

- Déclaré dans `Strategy.manipulationMix` (proportions).
- Contrôlé par forge via `GenerativeTask.manipulationMode`.
- **Mestor pre-flight `MANIPULATION_COHERENCE` gate** refuse Intents hors mix.
- Source : `docs/governance/MANIPULATION-MATRIX.md`.

---

## §5 — Architecture invariants (6 règles intangibles)

### 5.1 Cascade 6-couches (ADR-0002 — lint-enforced)

```
Layer 0 — src/domain/                  pure types/enums (PILLAR_KEYS, lifecycle, IntentProgressEvent, Zod)
Layer 1 — src/lib/                     utilities (db, auth, design tokens, topo-sort, trpc client)
Layer 2 — src/server/governance/       manifests, registry, event-bus, Mestor dispatcher, NSP server,
                                       hash-chain, tenant-scoped-db, governedProcedure, cost-gate
Layer 3 — src/server/services/         business services (100 dirs) — 7 Neteru + Glory tools + Oracle
Layer 4 — src/server/trpc/             80 routers, protected par governedProcedure / auditedProcedure
Layer 5 — src/components/neteru/       Neteru UI kit (MestorPlan, ArtemisExecutor, SeshatTimeline, …)
Layer 6 — src/app/, src/components/*   pages + UI ad-hoc (cockpit, console, intake, landing)
```

- Layer N importe **uniquement** depuis ≤ N. `import type` cross-layer toléré.
- Enforce : `eslint-plugin-boundaries` (PR fail) + `madge --circular` (warn→error Phase 4).
- **Toute violation = blocker**.

### 5.2 Cap APOGEE = 7

`BRAINS` const dans `src/server/governance/manifest.ts`. **Jamais d'ajout.** Test bloquant `neteru-coherence.test.ts` synchronise 7 sources de vérité.

### 5.3 `mestor.emitIntent()` = chemin unique de toute mutation business

- `governedProcedure(intentKind)` obligatoire pour mutations neuves.
- `auditedProcedure(scope)` = strangler **legacy only** ([ADR-0004](../docs/governance/adr/0004-strangler-audited-procedure.md)).
- Intent kind déclaré dans `intent-kinds.ts` + `manifest.acceptsIntents` du service.
- **Migration en cours** : 6/80 routers governed (8.5% audit dernier) — backlog #6 ~86 procédures.

### 5.4 Multi-tenant default-deny

- **Tout accès Prisma via `tenantScopedDb`** (`src/server/governance/tenant-scoped-db.ts`) qui injecte `where: { operatorId }` auto.
- Sauf `GLOBAL_TABLES` (sectors, country, llm models, audit log).
- **Jamais `prisma.foo.update(...)` direct** hors whitelist.
- `operatorProcedure` injecte automatiquement `tenantScopedDb` dans ctx.

### 5.5 NSP SSE = chemin unique de stream temps réel

- Endpoint `GET /api/nsp?intentId=<id>&since=<iso>`. Heartbeat 15s. Replay depuis `IntentEmissionEvent`.
- Emitters typés `NspEvent` discriminés. `bestEffort()` helper — **jamais throw côté emit**.
- Hook frontend canonique : `useOracleStream(strategyId)` / `useNeteru(intentId)` / `useNsp()`.

### 5.6 Manual-first parity (ADR-0060)

- Toute feature LLM doit avoir une **UI manuelle équivalente** opérationnelle.
- **Test HARD bloquant** `assembler-uses-manual-path.test.ts` : interdit `executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM` direct dans handlers d'orchestration (ex: Oracle Assembler).

---

## §6 — Trois interdits absolus (NEFER §1.2)

1. **Réinventer la roue** — toute entité métier nouvelle (model / service / router / page / Glory tool / sequence / Intent kind) exige `grep CODE-MAP` négatif **+ ADR** si confirmé.
2. **Bypass governance** — toute mutation via `mestor.emitIntent()`. Jamais service-from-router direct hors strangler.
3. **Drift narratif silencieux** — modification vocabulaire/concept canon → **propagation simultanée** dans 7 sources :
   - `CLAUDE.md`
   - `BRAINS` const (`src/server/governance/manifest.ts:23`)
   - `Governor` type (`src/domain/intent-progress.ts:29`)
   - `LEXICON.md`
   - `APOGEE.md`
   - `PANTHEON.md`
   - `SERVICE-MAP.md`

---

## §7 — Protocole NEFER (8 phases + doctrine LLM)

L'agent s'identifie comme **NEFER** (opérateur expert, pas un Neter).

### 7.1 Doctrine LLM §1.1 (5 invariants intangibles)

1. **Pas de notion de temps humain** — pas de "ça prend trop de temps", pas d'urgence pour skip phase.
2. **Pas d'économie de tokens** — verbosité OK si elle sert l'inférence. 24 angles morts > 5 résumés.
3. **Pas de fatigue / pas de seuil d'effort** — si cohérence exige 38 fichiers touchés, c'est 38.
4. **Seul critère d'arrêt valide** = information non-inférable → **1 question ciblée**. Sinon : agir.
5. **Profondeur > raccourci** — entre court et profond sur sujet structurant, profond par défaut.

### 7.2 Les 8 phases

```
Phase 0 — Check préventif        (git log + 7 sources vérité + LEXICON + drift test MISSION)
Phase 1 — Examen APOGEE          (sous-système + 3 Lois + 5 piliers FRAMEWORK)
Phase 2 — Audit anti-doublon     (grep CODE-MAP + 4 surfaces + manifests + ADRs + maps)
Phase 3 — Conception             (Neter de tutelle + emplacement + manipulation mode + pillar source)
Phase 4 — Exécution              (Prisma migration + service + tRPC governedProcedure + UI CVA + Intent kind)
Phase 5 — Vérification           (preflight + anti-drift + stress + smoke)
Phase 6 — Documentation          (CHANGELOG + 7 sources + ADR + RESIDUAL-DEBT + auto-maps régen)
Phase 7 — Commit + Push          (stager explicite + conventional commit + co-auth)
Phase 8 — Auto-correction        (si drift détecté post-commit, re-entre dans protocole)
```

**Skip d'une phase = drift.** Phase 8 = recovery loop.

---

## §8 — Language-Specific Rules (TypeScript 6 strict)

- **TS 6 strict**, `noImplicitAny`, `strictNullChecks`. Pas de `any` ajouté à du code nouveau.
- **`as never` INTERDIT** comme silencer (dette tracée `scripts/audit-governance.ts` — batches `batch as-never`).
- **Imports** :
  - Alias `@/` = `src/`. Pas de `../../../` profonds.
  - Ordre : 1) externals → 2) `@/domain` → 3) `@/lib` → 4) `@/server` → 5) `@/components` → 6) relatifs.
  - **Pas d'import** depuis `app/` vers `server/services` direct (passe par tRPC).
  - **Pas d'import** cross-Neter direct (passe par `mestor.emitIntent`).
  - **Pas de barrel `index.ts`** qui réexporte tout — imports nominaux explicites.
- **Zod 4** :
  - Schemas déclarés au plus proche du handler.
  - Pour Glory tool/Framework LLM : `outputSchema?: ZodType` **XOR** `_noSchemaJustification` (mutually exclusive au type-level, ADR-0067).
  - **Pas de coercion silencieuse** sur sortie LLM (Phase 21 F-A) — Zod fail → retry x2 (`executeStructuredLLMCall`) → FAILED si toujours invalide.
- **JSON.parse sans try** = anti-pattern (cf. backlog #7) — wrapper `safeJsonParse` ou try/catch local.
- **console.log** = anti-pattern (cf. backlog #7) — logger structuré `src/lib/log/` ou IntentEmissionEvent.
- **Pas de classes** sauf nécessité forte (errors custom, builders) — fonctions + types préférés.
- **Errors typed** : `TRPCError({ code, message, cause })` côté tRPC. Custom errors avec discriminator (`type: 'PILLAR_STALE'`).

---

## §9 — Framework-Specific Rules

### 9.1 Next.js 16 / App Router

- **App Router uniquement** (`src/app/`). 4 route groups : `(landing)`, `(intake)`, `(console)`, `(cockpit)` + REST `/api/`.
- Pages = **server components par défaut** ; `"use client"` uniquement si nécessaire.
- Jamais d'appel direct au service depuis une page — toujours via tRPC.
- Layouts `layout.tsx` au niveau de chaque route group.
- `loading.tsx` / `error.tsx` requis par convention Next App Router.

### 9.2 tRPC 11

- Procédures neuves = `governedProcedure(intentKind)`.
- Échelle de procédures (cf. §15.1) — choisir le plus haut possible.
- Routers groupés par sous-système APOGEE.
- Input validation Zod obligatoire.
- Pas de raw `unknown`/`any` en input.
- Output type **inféré** — pas de generic manuel côté consumer.

### 9.3 Prisma 7

- **Migrations versionnées** (`prisma migrate dev`). **`db:push` INTERDIT**.
- Driver adapter `@prisma/adapter-pg` (Prisma 7 spécifique).
- Connection URL passée dans `src/lib/db.ts` (pas dans datasource schema — metadata only).
- Tous les CRUD via `tenantScopedDb`.
- **Pas de raw SQL** sauf justification ADR.
- Naming : models `PascalCase` ; fields `camelCase` ; enums `SCREAMING_SNAKE` valeurs.

### 9.4 React 19

- React Compiler activé — **ne pas pré-optimiser** sans mesure (pas de `useMemo`/`useCallback` réflexes).
- Server components par défaut.
- Hooks coutume conventionnés : `useOracleStream(strategyId)`, `useNeteru(intentId)`, `useNsp()`, `useCollabDoc()`.
- `Suspense` boundaries pour streaming server data.

### 9.5 Tailwind 4 + Design System (panda noir + rouge fusée)

Cascade 4-tiers obligatoire :

```
Tier 0 Reference (--ref-*)
   ↓
Tier 1 System (--color-*, --space-*, --radius-*)
   ↓
Tier 2 Component (--button-*, --card-*, --tab-*)
   ↓
Tier 3 Domain (--pillar-*, --division-*, --tier-*, --classification-*)
```

**Règles bloquantes** :
1. Aucun composant `src/components/**` ne consomme Reference token direct (`var(--ref-*)`).
2. Aucune classe Tailwind couleur brute (`text-zinc-500`, `bg-violet-500`, `border-emerald-700`, hex) hors `src/components/primitives/**` + `src/styles/**`.
3. CVA obligatoire si variant > 1. Pas de `.join(" ")` ou ternaire inline.

Tests bloquants : `design-tokens-cascade.test.ts`, `design-tokens-canonical.test.ts`, `design-primitives-cva.test.ts`.

Codemod disponible : `npm run codemod:zinc` (Tailwind colors → tokens).

---

## §10 — Modèle de domaine essentiel

> 165 modèles Prisma. Voici les **clusters structurants**. Drill-down : `docs/scan/data-models.md`.

### 10.1 Identité & tenancy

`User` • `Account` • `Session` • `VerificationToken` (NextAuth) • `Operator` (multi-tenant root) • `Client` • `ClientAllocation` • `MfaSecret`.

### 10.2 Brand state (cœur)

- `Strategy` — top-level brand context (flat metadata + `manipulationMix`).
- `BrandNode` / `BrandContextNode` / `MarketContextNode` — **brand tree multi-archétype** (Phase 18, cf. §11).
- `Pillar` / `PillarVersion` — ADVE + RTIS (8 piliers par strategy).
- `BrandAsset` — **vault unifié** (Phase 10, ADR-0012). `kind` ∈ BIG_IDEA / CREATIVE_BRIEF / MANIFESTO / ORACLE_DOCUMENT / claim / KV / ...
- `BrandDataSource` / `IngestedSource` / `BriefIngestionDraft` / `MorningBriefBatch` — ingestion sources.
- `BrandVariable` / `VariableHistory` — variable-bible (`src/lib/types/variable-bible.ts`, ~300 entrées).
- `OracleSection` / `OracleSnapshot` — Oracle 35 sections first-class (Phase 21 F-B, cf. §12).

### 10.3 Diagnostic / intake

`QuickIntake` • `IntakePayment` • `Signal` (Tarsis weak + manuels).

### 10.4 Campaign (Phase 19 — L1 + L2)

- L1 Operational : `Campaign` / `CampaignTemplate` / `CampaignAction` / `CampaignExecution` / `CampaignAmplification` / `CampaignMilestone` / `CampaignTeamMember` / `CampaignApproval` / `CampaignDependency` / `CampaignLink` / `CampaignAsset` / `CampaignBrief` / `CampaignReport`.
- L2 Instrumental : `CampaignChangeRequest` / `OperatorAction` / `CampaignFieldOp` / `CampaignFieldReport` / `TarsisCaptureSession` / `CampaignContextIngest` / `CampaignAARRMetric` / `CampaignDeliverable`.
- Finance : `BudgetLine` / `Invoice` / `Commission` / `Contract` / `Escrow` / `EscrowCondition`.
- Mission/Talent : `Mission` / `MissionDeliverable`.

### 10.5 Glory tools / sequences / forge

`Framework` / `FrameworkExecution` / `FrameworkResult` (24 frameworks Artemis) • `SequenceExecution` (mode/lifecycle/expiresAt/promptHash Phase 17a) • `GloryOutput` • `GenerativeTask` / `AssetVersion` (Ptah forge) • `ForgeProviderHealth`.

### 10.6 Telemetry (Seshat + Tarsis + Jehuty)

`KnowledgeEntry` • `MarketStudy` / `MarketSource` / `MarketSynthesis` / `MarketDocument` / `MarketBenchmark` / `MarketSizing` / `CostStructure` / `CompetitiveLandscape` / `CompetitorSnapshot` • `InsightReport` / `AttributionEvent` / `CohortSnapshot` / `ScoreSnapshot` / `CommunitySnapshot` / `DevotionSnapshot` • `CultIndexSnapshot` / `SuperfanProfile` (ADR-0046 cult index no-magic-fallback) • `AmbassadorProgram` / `AmbassadorMember`.

### 10.7 Crew Programs (Phase 14)

`TalentProfile` / `TalentReview` / `TalentCertification` • `Course` / `Enrollment` • `QualityReview` • `BoutiqueItem` / `BoutiqueOrder` • `ClubMember` / `Event` / `EventRegistration` • `GuildOrganization` / `Membership` (`GuildTier` APPRENTI/COMPAGNON/MAITRE/ASSOCIE).

### 10.8 Comms (Phase 15)

`CommsPlan` / `BroadcastJob` • `EmailTemplate` / `SmsTemplate` / `NotificationTemplate` • `NotificationPreference` / `Notification` / `PushSubscription` • `WebhookConfig` • **`ExternalConnector`** (Credentials Vault — cf. §18) • `SocialConnection` / `SocialPost` / `MediaPlatformConnection` / `MediaPerformanceSync` • `PressRelease` / `PressDistribution` / `PressClipping` / `MediaContact` • `EditorialArticle` / `EditorialComment`.

### 10.9 Financial / payments

`PaymentOrder` / `PaymentProviderConfig` / `Subscription` / `Deal` / `FunnelMapping` • `IntakePayment` • `PricingOverride` / `Currency` • `AICostLog` / `CostDecision` (Thot cost-gate).

### 10.10 Governance / audit / replay

`IntentEmission` (hash-chained) • `IntentEmissionEvent` (NSP replay source) • `IntentQueue` • `AuditLog` • `ErrorEvent` / `ErrorSeverity` / `ErrorSource` (Error Vault ADR-0022) • **`Phase18ResidualEntry`** (cf. §27 backlog #8) • `OrchestrationPlan` / `OrchestrationStep` / `MestorThread` • `Recommendation` / `RecommendationBatch` / `JehutyCuration` • `PromptVersion` / `PromptRegistry` / `ModelPolicy` / `VariableStoreConfig` • `BrandOSConfig`.

### 10.11 MCP infrastructure (Phase 16)

`McpApiKey` (outbound API keys) • `McpServerConfig` (inbound MCP client registrations) • `McpRegistry` / `McpToolInvocation` • `IntegrationConnection` (Higgsfield, Sora, ...).

---

## §11 — Brand Tree multi-archétype (Phase 18, ADR-0059)

> **Refonte structurante** : `Strategy` plat → arbre hiérarchique. Tout nouveau modèle qui parle de "brand" doit être tree-aware.

### 11.1 Neuf `BrandNature` (cap=9, ADR-0061)

| BrandNature | Exemple |
|---|---|
| `PRODUCT` | FMCG, biens consommables |
| `SERVICE` | banque, télécom, conseil |
| `CHARACTER_IP` | personnage de fiction monétisable |
| `FESTIVAL_IP` | événement culturel récurrent |
| `MEDIA_IP` | franchise audiovisuelle |
| `RETAIL_SPACE` | enseigne physique / pop-up |
| `PLATFORM` | marketplace / réseau |
| `INSTITUTION` | gouvernementale / ONG / éducation |
| `PERSONAL` | personal brand fondateur |

Cap=9 intangible. Extension future Phase 18-bis (cf. backlog #8).

### 11.2 Cascade FMCG 7 niveaux

```
CORPORATE → MASTER_BRAND → REGIONAL_CLUSTER → REGIONAL_BRAND → PRODUCT_LINE → PRODUCT_VARIANT → SKU
```

Exemple driver business : ingestion FrieslandCampina (Matanga × 5 clients Cameroun).

### 11.3 Invariant Manual-first parity (ADR-0060)

Toute feature LLM brand-tree (resolveEffectivePillars, classifier heuristique, NARRATIVE_COHERENCE_GATE) **doit avoir une UI manuelle équivalente** opérationnelle.

### 11.4 Pattern d'usage

- Helper canonique `resolveEffectivePillars(nodeId)` → résout héritage cascade.
- Cache + invalidation cascade trigger via Intent kinds.
- Badge UI inheritance cockpit pour transparence.
- Gate pre-flight `NARRATIVE_COHERENCE_GATE` sur Intents qui sortiraient de la cohérence narrative du nœud.

---

## §12 — Oracle (35 sections × 3 tiers)

> **Notable par taille, pas par statut.** Oracle = un livrable parmi N (cascade Glory→Brief→Forge uniforme).

### 12.1 Trois tiers

| Tier | Count | Quoi |
|---|---|---|
| `CORE` | **23** | Sections actives Phase 1-3 ADVERTIS + Mesure + Operationnel + Imhotep Crew Program (#34) + Anubis Plan Comms (#35) — promues CORE Phase 17 cleanup ADR-0045 |
| `BIG4_BASELINE` | **7** | McKinsey 7S, BCG Portfolio, McKinsey 3-Horizons, Bain NPS, etc. |
| `DISTINCTIVE` | **5** | Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis |

### 12.2 `OracleSection` first-class (Phase 21 F-B, ADR-0068)

- `OracleSection` model = 35 sections × strategyId.
- 2 enums : `OracleTier` (CORE/BIG4_BASELINE/DISTINCTIVE) + `OracleSectionStatus` (PENDING/GENERATING/COMPLETE/FAILED/STALE).
- Service `oracle-section/` — lifecycle propre, lock optimistic + TTL 25s + `staleAt` clear on COMPLETE + lazy seed transparent.
- `SectionMeta.runner` descripteur (`GLORY_SEQUENCE` / `GLORY_TOOL` / `FRAMEWORK`).
- Helper `resolveSectionRunner()` backward-compat avec `sequenceKey` legacy.

### 12.3 Assembler (Phase 21 F-D, ADR-0071)

- Intent kind `ASSEMBLE_ORACLE` — émet N × `GENERATE_ORACLE_SECTION` (jamais inline).
- Scope `ALL` / `MISSING` / `STALE` / explicit sectionIds.
- **Test HARD bloquant** : pas de `executeStructuredLLMCall` direct dans handler (manual-first parity).
- Resilient try/catch — un FAILED individuel ne fait pas remonter l'orchestrator.
- Status global COMPLETE/PARTIAL/EMPTY.

### 12.4 NSP streaming (Phase 21 F-E, ADR-0072)

6 sub-kinds discriminés :
- `oracle_section_started/completed/failed`
- `oracle_assembler_started/progress/done`

### 12.5 UI progressive (Phase 21 F-F, ADR-0073)

Hook `useOracleStream(strategyId)`. Composants canoniques :
- `OracleSectionCard` (status + bouton contextuel)
- `OracleLiveConsole` (terminal-style auto-scroll)
- `OracleSectionFailureModal` (détail erreur Zod)
- `OracleProgressivePanel` (orchestrateur)

### 12.6 Legacy cohabitation

`enrichOracle` (~1300 lignes) cohabite — deprecation après audit completion (cf. backlog).

---

## §13 — Pillars ADVE/RTIS + `OPERATOR_AMEND_PILLAR`

### 13.1 ADVE = fondateurs (édités)

- **A**wareness / **D**esire / **V**alue / **E**ngagement.
- Modifiés uniquement via Intent kind **`OPERATOR_AMEND_PILLAR`** (ADR-0023).

### 13.2 Trois modes d'édition

| Mode | Logique |
|---|---|
| `PATCH_DIRECT` | edit textuel direct opérateur |
| `LLM_REPHRASE` | opérateur fournit consigne, LLM reformule |
| `STRATEGIC_REWRITE` | opérateur déclenche rewrite stratégique guidé |

Modal cockpit ADVE consomme. Variable-bible expose `editableMode` per-variable. Gate `applyPillarCoherenceGate` vérifie cohérence cascade.

### 13.3 RTIS = dérivés (jamais éditables manuellement)

**Type-level constraint** sur `pillarKey` empêche édition directe. Refresh via Intents :
- `ENRICH_R_FROM_ADVE`
- `ENRICH_T_FROM_ADVE_R_SESHAT`
- `GENERATE_I_ACTIONS`
- `SYNTHESIZE_S`

### 13.4 Stale semantics 2-levels (ADR-0076)

`BrandAsset.staleAt` uniforme. Boutons "recalculate RTIS" déclenchent refresh + clear staleAt.

---

## §14 — Cascade Glory → Brief → Forge

```
Mestor décide
   ↓ emit Intent
Artemis produit le brief    (Glory tool rédactionnel)
   ↓ emit GLORY_TOOL_OUTPUT_READY (avec forgeSpec si brief-to-forge)
Ptah matérialise l'asset    (provider: Magnific 95% / Adobe Firefly / Figma / Canva)
   ↓ emit ASSET_FORGED (post webhook reconcile)
Seshat observe              (telemetry fire-and-forget)
Thot facture                (cost gate enforced en amont)
```

### 14.1 Deliverable Forge (Phase 17b, ADR-0050)

Surface cockpit `/cockpit/operate/forge` qui **inverse le flow** : founder pointe `BrandAsset.kind` cible → resolver remonte DAG des briefs requis (`GloryToolForgeOutput.requires?: BrandAssetKind[]`) → vault-matcher ré-utilise briefs ACTIVE non-stale + génère manquants → composer construit `GlorySequence` runtime ad-hoc dispatchée via `sequence-executor`.

1 Intent kind `COMPOSE_DELIVERABLE` (sync dispatcher).

### 14.2 Glory tools as primary API surface (ADR-0048)

- `GloryToolDef.requiresPaidTier` tier gate générique.
- `GloryExecutionType="MCP"` + `mcpDescriptor` → délégation `anubis.invokeExternalTool` (ex: Higgsfield DoP/Soul/Steal).
- OAuth 2.1 device flow (RFC 8628 + discovery RFC 9728) — pattern réutilisable.
- 3 Intent kinds Anubis : `ANUBIS_OAUTH_DEVICE_FLOW_START/_POLL/_REFRESH_TOKEN`.
- Convention env var client_id : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.

### 14.3 Sequences (Phase 17a)

- `lifecycle: DRAFT` → promotion `STABLE` via Intent gouverné `PROMOTE_SEQUENCE_LIFECYCLE`.
- 35 sections → 35 sequences (migration uniforme ADR-0040).
- Hiérarchie unique : `RUN_ORACLE_SEQUENCE` Intent kind + 24 `WRAP-FW-*` wrappers (cf. backlog résorption).
- Robustness loop : `topoSort<T>`, cache, quality gate, `SequenceExecution.expiresAt|mode|lifecycle|promptHash`.

---

## §15 — API surfaces

### 15.1 tRPC procedure ladder (8.5% migré, target 100%)

| Type | Effet | Quand utiliser |
|---|---|---|
| `publicProcedure` | pré-auth | landing, public widgets (rare) |
| `protectedProcedure` | session requise | UI auth-only sans tenant |
| `operatorProcedure` | + `operatorId` + `tenantScopedDb` auto | reads tenant-scoped |
| `auditedProcedure(scope)` | strangler, log `AuditLog` | **legacy uniquement** |
| `governedProcedure(intentKind)` | **destination** — `mestor.emitIntent` | **mutations neuves** |
| `adminProcedure` | + role check | admin-only |

### 15.2 Intent kinds = vraie API publique stable

Registry : `src/server/governance/intent-kinds.ts`. Chaque kind a :
- `kind` string unique (`VERB_NOUN` uppercase).
- Zod input schema.
- Owning manifest (`acceptsIntents`) — **exactement un service par kind**.
- SLO (target latency, target cost) dans `src/server/governance/slos.ts`.
- Version dans `intent-versions.ts`.

Lifecycle : `PROPOSED → DELIBERATED → DISPATCHED → EXECUTING → OBSERVED → COMPLETED` (ou `FAILED` / `VETOED` / `DOWNGRADED`).

Versioning : bump version dans `intent-versions.ts` si payload shape change. Old emissions replayables.

Catalogue : `docs/governance/INTENT-CATALOG.md` (961 lignes, auto-généré).

### 15.3 REST surfaces (17 groupes)

| Route | Usage |
|---|---|
| `/api/auth/[...nextauth]/` | NextAuth v5 handler |
| `/api/trpc/` | tRPC HTTP transport |
| `/api/nsp/` | **NSP SSE** (cf. §16) |
| `/api/notifications/` | Notification feed + SSE bridge |
| `/api/push/` | Web Push (VAPID/FCM) |
| `/api/mcp/` | **Aggregated MCP server** (Claude Desktop, Cursor) |
| `/api/intake/[token]/` | Public intake submit (token = creds) |
| `/api/payment/` | Stripe + mobile-money webhooks (signature verify) |
| `/api/ptah/` | Provider webhooks (Magnific async, Firefly) |
| `/api/webhooks/` | Inbound webhook router générique |
| `/api/integrations/` | OAuth redirects |
| `/api/cron/` | Vercel cron (mission drift, staleness, morning batch) |
| `/api/chat/` | LLM chat streaming SSE |
| `/api/collab/` | Collab OT (useCollabDoc) |
| `/api/export/` | PDF/Excel export |
| `/api/admin/metrics/` | Prometheus-style admin |
| `/api/widget/` | Embeddable widgets, CORS-scoped |

---

## §16 — NSP streaming SSE

| Detail | Value |
|---|---|
| Endpoint | `GET /api/nsp?intentId=<id>&since=<iso>` |
| Auth | Bearer (NextAuth session) ou `McpApiKey` |
| Content | `text/event-stream`, 1 event/transition |
| Heartbeat | 15 secondes |
| Replay | `since=<iso>` re-lit `IntentEmissionEvent` |
| Fallback | EventSource → long-poll (mobile flaky) |

### 16.1 Pattern emitters

Helpers canoniques `oracle-section/stream-events.ts` (modèle pour autres flows) :
- 6 emitters typés (`STARTED/PROGRESS/DONE/FAILED` × scope).
- `bestEffort()` — **jamais throw** côté emit (resilient).
- Hiérarchie naturelle interlacée (parent + child) — frontend voit assembler + sub-sections.

### 16.2 Backlog #1 — `complete()` intake [pilote]

Pattern Oracle (§12.4) à porter sur intake. Émettre `STARTED/PROGRESS/done` cohérent + cleanup listener côté client.

---

## §17 — LLM Gateway (multi-provider)

### 17.1 Architecture (`src/server/services/llm-gateway/`)

- Provider chain : Anthropic primary → OpenAI fallback → Ollama embeddings.
- Circuit breaker per-provider.
- Cost tracking → Thot via EventBus (`AICostLog` + `CostDecision`).
- Versionning prompt : `PromptVersion` / `PromptRegistry` / `ModelPolicy`.

### 17.2 `executeStructuredLLMCall` (Phase 21 F-A, ADR-0067)

**Mécanique transverse obligatoire** pour toute call LLM avec output structuré :

- Helper `deriveJsonSchemaFromZod`.
- Wrapper retry-on-zod-fail **x2** avec `responseFormat: 'json_object'` au gateway.
- Si fail x3 → `LLMStructuredCallError` → normalised `ZOD_VALIDATION_FAILED`.

### 17.3 Type-level contract sur Glory tool / Framework

```ts
// MUTUALLY EXCLUSIVE
type LLMTool =
  | { outputSchema: ZodType; ... }          // OK — schéma déclaré
  | { _noSchemaJustification: string; ... } // OK — non-LLM, justifié
```

Tests anti-drift G2/G3/G7/G8 enforcent. Mode **soft baseline** au démarrage → promote **HARD** après 1 semaine.

### 17.4 Quality / cost tier

- Capability LLM déclare `qualityTier` + `latencyBudgetMs`.
- Gateway v5 route selon tier.

### 17.5 Backlog #4 — annotation manquante (56+24)

- 56 Glory tools LLM + 24 Frameworks à annoter en `outputSchema` ou `_noSchemaJustification`.
- Audit : `npm run glory:inventory` + script à créer `audit:tools-outputschema`.
- 5 batchs ~16 outputs/batch. Tests soft → HARD au fil.

---

## §18 — MCP bidirectionnel (Phase 16, ADR-0026)

### 18.1 Outbound (serveur)

`/api/mcp` — La Fusée expose ses capabilities en MCP serveur agrégé.
- Consumers : Claude Desktop, Cursor, etc.
- Auth : `McpApiKey` model (per-operator).
- Invocations loggées dans `McpToolInvocation`.
- Implémentation : `src/server/mcp/`.

### 18.2 Inbound (client)

La Fusée consomme MCP externes (Slack/Notion/Drive/Calendar/Figma/GitHub/Higgsfield/...) via **Credentials Vault** + OAuth 2.1 device flow.
- Registry : `McpRegistry` (per-tool) + `McpServerConfig` (per-serveur).
- Refresh tokens transparent dans `src/server/services/anubis/mcp-client.ts`.
- Convention env var client_id : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.

### 18.3 Credentials Vault (ADR-0021)

- Tout connector externe géré via UI back-office `/console/anubis/credentials` → CRUD `ExternalConnector` model.
- Provider façades retournent **`DEFERRED_AWAITING_CREDENTIALS`** si pas de creds → **code ship-able sans clés**.
- **Per-operator**, donc dans DB (≠ payment secrets system-wide qui restent env vars, ADR-0075).

### 18.4 Pattern d'ajout connector externe (alternative au 8ème Neter)

```
1. Ajouter `McpServerConfig` row (UI ou seed).
2. Implémenter MCP client dans `services/anubis/mcp-tools/<server>/`.
3. Si OAuth : utiliser device flow (3 Intent kinds existants ANUBIS_OAUTH_*).
4. Façade retourne DEFERRED_AWAITING_CREDENTIALS si vide.
5. Exposer comme Glory tool via `GloryExecutionType="MCP"` + `mcpDescriptor`.
```

---

## §19 — How-to par artefact

> Procédure courte par artefact. Toujours en **complément** du protocole NEFER 8 phases.

### 19.1 Nouvelle Glory tool / sequence / framework

```bash
npm run manifests:scaffold -- --service=<service> --name=<name>
# fill schemas + body in stub
npm run manifests:gen
npm test -- <name>
```

Scaffold crée/patch :
- `src/server/services/<service>/manifest.ts` (ou append capability)
- `src/server/services/<service>/<name>.ts` (stub)
- `tests/unit/<service>/<name>.test.ts`

**Tes responsabilités après scaffold** :
1. Remplacer Zod input/output schemas.
2. Déclarer `sideEffects` (`DB_WRITE`, `LLM_CALL`, `EXTERNAL_API`, ...).
3. Si LLM → `outputSchema` OU `_noSchemaJustification` (ADR-0067).
4. Si LLM → `qualityTier` + `latencyBudgetMs`.

### 19.2 Nouveau Intent kind

```ts
// 1. src/server/governance/intent-kinds.ts
export const INTENT_KINDS = {
  MY_INTENT: { kind: "MY_INTENT", inputSchema: z.object({...}) },
  ...
};

// 2. Manifest du service
export const myServiceManifest = {
  acceptsIntents: ["MY_INTENT", ...],
  ...
};

// 3. Handler dans intent-versions.ts (call from bootstrap.ts)

// 4. SLO dans src/server/governance/slos.ts
export const SLOS = {
  MY_INTENT: { p95Ms: 5000, costUsdMax: 0.10 },
};

// 5. Procédure tRPC
export const myMutation = governedProcedure({
  kind: "MY_INTENT",
  inputSchema: z.object({...}),
}).mutation(async ({ ctx, input }) => {
  // ctx.intentId déjà populé, IntentEmission row existe
  return /* result */;
});
```

### 19.3 Nouveau modèle Prisma

1. **Grep CODE-MAP** (`npm run codemap:gen` puis grep). Si doublon → étendre.
2. ADR obligatoire si nouveau concept.
3. Décider : **multi-tenant** (default — ajouter `operatorId String`) ou **global** (ajouter dans `GLOBAL_TABLES`).
4. Migration : `npm run db:migrate` (jamais `db:push`).
5. Seed si reference data.
6. Naming : `PascalCase` model, `camelCase` fields, `SCREAMING_SNAKE` enum values.
7. Update `docs/scan/data-models.md` cluster + régen `codemap`.

### 19.4 Nouveau router tRPC

1. Fichier `src/server/trpc/routers/<name>.ts`.
2. Procédures = `governedProcedure(intentKind)` **uniquement** (no `protectedProcedure` direct pour mutations).
3. Reads : `operatorProcedure` (avec `tenantScopedDb` auto).
4. Wire dans `src/server/trpc/router.ts`.
5. Update `docs/governance/ROUTER-MAP.md` (auto-régen).

### 19.5 Nouvelle page

1. Décider deck : `(landing)` / `(intake)` / `(console)` / `(cockpit)`.
2. Fichier : `src/app/(deck)/path/page.tsx`.
3. Default = server component. `"use client"` justifié.
4. Layout : hérite du `layout.tsx` du group ; ajouter local si besoin.
5. Hooks tRPC pour data — pas d'appel service direct.
6. Pour stream : utiliser hook canonique (`useOracleStream`, `useNeteru`, etc.).
7. UI : composants `src/components/primitives/**` + `src/components/<deck>/**` + `src/components/neteru/**`.
8. Update `docs/governance/PAGE-MAP.md` (auto-régen).

### 19.6 Nouveau composant primitive UI

1. Path : `src/components/primitives/<name>/`.
2. `manifest.ts` (cf. existants — `button.manifest.ts`).
3. **CVA** pour variants (jamais `.join(" ")`).
4. **Tokens uniquement** (`text-fg`, `bg-card`, `border-border`) — **pas** de Tailwind couleur brute.
5. Storybook `.stories.tsx`.
6. Chromatic visual snapshot.
7. Test a11y Playwright si interactif.
8. Régen `npm run ds:components-map` → `COMPONENT-MAP.md`.

### 19.7 Nouvelle ADR

1. Path : `docs/governance/adr/00<N>-<kebab-name>.md`.
2. Numérotation séquentielle (dernier : 0076).
3. Template : `adr/0001-framework-name-apogee.md` = gold standard.
4. Format : Context → Decision → Consequences → Alternatives considered.
5. Cite ADRs reliées (`Supersedes ADR-XXXX` / `Related ADR-YYYY`).
6. Update CLAUDE.md phase status si structurant.
7. Update CHANGELOG.md sous version courante.

### 19.8 Nouveau connector externe (ad network, MCP, IA service)

**Ne JAMAIS ajouter un 8ème Neter.** Procéder via Anubis MCP + Credentials Vault :

1. Ajouter `McpServerConfig` row.
2. MCP client : `src/server/services/anubis/mcp-tools/<server>/`.
3. OAuth ? → device flow (Intent kinds `ANUBIS_OAUTH_DEVICE_FLOW_START/_POLL/_REFRESH_TOKEN`).
4. Façade : retourne `DEFERRED_AWAITING_CREDENTIALS` si vide → code ship-able.
5. Exposer comme Glory tool via `GloryExecutionType="MCP"` + `mcpDescriptor`.
6. UI Credentials Vault `/console/anubis/credentials` exposer le toggle config.

### 19.9 Acceptance gate générique

Capability/feature "shipped" quand :
- [ ] Manifest registered (`npm run manifests:audit` clean)
- [ ] Capability listed in `manifests-inventory` (cron drift)
- [ ] Tests green (`npm test`)
- [ ] PR phase label (`phase/<n>`)
- [ ] Intent kind a une SLO row dans `slos.ts`
- [ ] `npm run preflight` clean

---

## §20 — Multi-tenant default-deny (détail)

- **Wrapper** : `src/server/governance/tenant-scoped-db.ts` enveloppe Prisma.
- **Auto-injection** : `where: { operatorId }` sur `findMany / findFirst / update / delete / create` pour tout model **hors `GLOBAL_TABLES`**.
- **GLOBAL_TABLES** : `Sector`, `Country`, `LlmModel`, `AuditLog` (+ autres static reference).
- **Conséquence** : oublier de filtrer par operator **ne leak pas data** — wrapper ferme le trou au data layer.
- **Enforcement** : `operatorProcedure` injecte ctx.db = tenantScopedDb. `governedProcedure` hérite.
- **Anti-pattern** : `prisma.foo.update(...)` direct **interdit** hors whitelist.

---

## §21 — Hash chain & Intent immutability (ADR-0005)

- Chaque `IntentEmission` row porte `(prevHash, selfHash)`.
- `selfHash = sha256(canonicalJson(row + prevHash))`.
- **Cron `governance-drift.yml`** (Sunday 06:00 UTC) re-check chain sur derniers 1000 rows. Toute cassure → issue auto.
- **Correction d'un past emission** : émettre `CORRECT_INTENT` qui référence l'original. **Le row original n'est JAMAIS muté.**
- `IntentEmissionEvent` (1:N) → toutes transitions par emission. NSP replay source.

---

## §22 — Auth & sécurité

| Layer | Mécanisme |
|---|---|
| Web sessions | NextAuth v5 JWT, Prisma adapter |
| S2S MCP outbound | `McpApiKey` (per-operator) |
| External OAuth | `ExternalConnector` (per-operator, refresh tokens) |
| Webhooks | Per-provider HMAC signature verify |
| MFA | TOTP via `MfaSecret` model |
| Tenant scoping | `tenantScopedDb` auto-injection |
| Default-deny | Tout model hors `GLOBAL_TABLES` exige `operatorId` |

### 22.1 Secrets policy

- **Payment provider secrets** : restent en **env vars** (ADR-0075). **JAMAIS en DB**. UI guide `/console/socle/pricing` (env vars Vercel → toggle enabled → webhook URL).
- **Per-operator credentials** (ad networks, MCP, IA externes) : **Credentials Vault** UI `/console/anubis/credentials` → `ExternalConnector` model.
- **Server-side guards** : `adminUpdateProviderConfig` reject keys "secrets-like" dans `config` JSON + reject `enabled=true` si pas configured.
- **NEXTAUTH_SECRET rotation** = invalidation sessions → coordonner.

### 22.2 Webhooks idempotency

- Tous les webhooks providers (Stripe, mobile-money, Magnific, Adobe) doivent être **idempotents**.
- Pattern : `WebhookConfig` model + dedup par event ID provider.
- Signature verify obligatoire per provider.

---

## §23 — Testing (anti-drift bloquants)

### 23.1 Suites

| Suite | Path | Runner |
|---|---|---|
| Unit | `tests/unit/` | Vitest 4 |
| Integration | `tests/integration/` | Vitest 4 |
| LLM smoke | `tests/integration/llm-smoke.test.ts` | Vitest 4 (requires `ANTHROPIC_API_KEY`) |
| E2E | `tests/e2e/` | Playwright 1.59 |
| A11y | `tests/a11y/` | Playwright (WCAG AA) |
| i18n | `tests/i18n/` | Playwright (FR/EN) |
| Visual | `tests/visual/` + Storybook | Playwright + Chromatic |
| Governance | `tests/unit/governance/` | Vitest **bloquants** |

### 23.2 Anti-drift bloquants (ne jamais dégrader)

- **`neteru-coherence.test.ts`** — sync 7 sources vérité.
- **`assembler-uses-manual-path.test.ts`** — **mode HARD baseline 0** (Oracle Assembler).
- **`design-tokens-cascade.test.ts`** — pas de Reference token consommé dans `components/`.
- **`design-tokens-canonical.test.ts`** — pas de Tailwind couleur brute hors primitives.
- **`design-primitives-cva.test.ts`** — pas de `.join(" ")` quand variant > 1.
- **`manifests:audit`** — coverage manifests.
- **Tier coverage** Glory tool / framework outputs.

### 23.3 Conventions

- Nouveau anti-drift démarre en **mode soft** (baseline current count) → **promote HARD** après 1 semaine stabilisation.
- 1 fichier par règle. Nom : `<règle>.test.ts`.
- LLM tests intégration : skip si `ANTHROPIC_API_KEY` absent.

### 23.4 Stress tests

- `npm run stress:full` — hot path stress.
- `:pages` / `:forges` / `:state` — scoped.

---

## §24 — CI workflows (11)

| Workflow | Quand | Quoi |
|---|---|---|
| `ci.yml` | PR / push | typecheck + lint + unit/integration + e2e light |
| `phase-label-check.yml` | PR | enforce `phase/<n>` ou `out-of-scope` label |
| `scope-drift-trace.yml` | PR | vérifie justification `out-of-scope` |
| `manifests-inventory.yml` | cron | drift manifest |
| `governance-drift.yml` | cron Sunday 06:00 UTC | hash chain integrity (1000 dernières emissions) |
| `chromatic.yml` | PR | visual regression Storybook |
| `lighthouse.yml` | PR | perf budget pages cockpit |
| `e2e.yml` | nightly | full Playwright |
| `audit-design.yml` | PR | design tokens strict |
| `codemap-regen.yml` | cron | CODE-MAP auto-regen |
| `dependency-audit.yml` | weekly | npm audit + outdated |

---

## §25 — Code quality & style

- **Pas de commentaires** sauf si WHY non-obvious (invariant subtil, contrainte cachée, workaround spécifique).
- **Pas de doc multi-paragraphes en commentaire.** 1 ligne max.
- **Pas de `// removed for X`** ou vars `_unused` — suppression directe.
- **Production-quality only**. Pas de scaffolding hypothétique. Pas de TODO sans Intent kind ou Phase18ResidualEntry.
- **Naming** :
  - Fichiers : `kebab-case.ts` (sauf composants React = `PascalCase.tsx`).
  - Types/Interfaces : `PascalCase`.
  - Variables/fonctions : `camelCase`.
  - Constantes globales : `SCREAMING_SNAKE`.
  - Intent kinds : `VERB_NOUN` uppercase (`GENERATE_ORACLE_SECTION`, `COMPOSE_DELIVERABLE`).
  - Models Prisma : `PascalCase`. Fields : `camelCase`. Enums : `SCREAMING_SNAKE` valeurs.
- **Imports** : externals → `@/domain` → `@/lib` → `@/server` → `@/components` → relatifs.
- **Erreurs handling** : à la frontière (boundary) — pas de try/catch défensif partout. Trust framework guarantees.
- **No early returns sans raison** — chaîner ou structurer.

---

## §26 — Commits + PR labels

### 26.1 Conventional Commits (commitlint)

```
<type>(<scope>): <subject>

<body — WHY, pas WHAT>

Co-Authored-By: ...
```

| Type | Use |
|---|---|
| `feat` | nouvelle feature user-facing |
| `fix` | bug fix |
| `refactor` | restructure sans behavior change |
| `chore` | tooling, deps, config |
| `docs` | doc-only |
| `test` | test-only |
| `governance` | manifest/Intent kind/policies |
| `infra` | CI, deploy |
| `perf` | performance |

### 26.2 PR labels obligatoires (`phase-label-check`)

`phase/0` … `phase/9` (refonte phases — `phase/9` = Ptah sub-phases A→K) **ou** `out-of-scope` (justification écrite + tech-lead approval, vérifié par `scope-drift-trace`).

### 26.3 PR description NEFER

Doit énoncer :
- **Mission contribution** (north star §1.4).
- **Neter de tutelle** (quel governor owns).
- **ADRs cités**.
- **Sources de vérité affectées** (cf. §6 — 7 sources).

### 26.4 Pre-commit (Husky)

- CODE-MAP regen (si structurel) + lint + commitlint.
- **`--no-verify` INTERDIT** sauf demande user explicite.

---

## §27 — Phase status (où on en est)

> **État actuel : v6.22.8. Code presque complet. Phase de rationalisation.** Phases shipped en cascade :

| Phase | ADR principal | Status |
|---|---|---|
| Phase 9 (Ptah Forge) | ADR-0009 | ✅ shipped |
| Phase 10 (BrandAsset / Brand Vault) | ADR-0012 | ✅ shipped |
| Phase 11 (Design System panda+rouge) | ADR-0013 | ✅ shipped |
| Phase 12 (Prisma 6→7 driver adapter) | — | ✅ shipped |
| Phase 13 (Oracle 35-section) | ADR-0014/0015/0016 | ✅ shipped |
| Phase 14 (Imhotep Crew Programs) | ADR-0019 | ✅ shipped |
| Phase 15 (Anubis Comms + Credentials Vault) | ADR-0020/0021 | ✅ shipped |
| Phase 16 (Notification real-time + MCP bidirectionnel) | ADR-0025/0026 | ✅ shipped |
| Phase 16 (OPERATOR_AMEND_PILLAR + Console namespace) | ADR-0023/0024 | ✅ shipped |
| Phase 16 (Glory tools as primary API + Higgsfield MCP + OAuth device flow) | ADR-0048 | ✅ shipped |
| Phase 17a (Refonte Artemis F1→F11) | ADR-0039/0040/0041/0042 | 🟡 partial (résidus 1 mois) |
| Phase 17b (Deliverable Forge) | ADR-0050 | ✅ shipped |
| Phase 18 (ADR audit cohérence — renumérotation) | — | ✅ shipped |
| Phase 18 (Brand Tree multi-archétype + Matanga) | ADR-0059/0060/0061/0062 | ✅ noyau bouclé (résidus 7 catégories — cf. backlog #8) |
| Phase 19 (Campaign tracker L2 Instrumental) | ADR-0052 v2 | ✅ shipped Vague 1+2+3 |
| Phase 21 F-A (LLM output structured) | ADR-0067 | ✅ chantier (annotation per-tool 56+24 résiduel — backlog #4) |
| Phase 21 F-A.5 (Readiness UI parity) | ADR-0069 | ✅ shipped |
| Phase 21 F-B (OracleSection first-class) | ADR-0068 | ✅ shipped |
| Phase 21 F-C (GENERATE_ORACLE_SECTION) | ADR-0070 | ✅ shipped |
| Phase 21 F-D (Oracle Assembler manual-first) | ADR-0071 | ✅ shipped |
| Phase 21 F-E (Oracle progress streaming NSP) | ADR-0072 | ✅ shipped |
| Phase 21 F-F (Oracle Progressive UI) | ADR-0073 | ✅ shipped |
| Phase 21 closure (mégasprint complet) | ADR-0074 | ✅ shipped |
| Phase 21 polish (Payment secrets env) | ADR-0075 | ✅ shipped |

**Cap APOGEE 7/7** maintenu sur toute la cascade.

---

## §28 — Critical Don't-Miss (anti-patterns blockers)

### 28.1 Les 3 interdits absolus (rappel §6)

1. Réinventer la roue (grep CODE-MAP + ADR).
2. Bypass governance (`mestor.emitIntent` obligatoire).
3. Drift narratif silencieux (7 sources sync).

### 28.2 Doublons connus à NE PAS recréer (CODE-MAP)

| Synonyme métier | Entité canonique |
|---|---|
| "vault de marque" / "asset rangé" | `BrandAsset` (ADR-0012) |
| "SuperAsset" / "actif intellectuel raffiné" | `BrandAsset.kind=BIG_IDEA/CREATIVE_BRIEF/MANIFESTO/...` |
| "asset forgé" / "image générée" | `AssetVersion` + `BrandAsset` matériel promu |
| "big idea active" | `Campaign.activeBigIdeaId` → `BrandAsset (kind=BIG_IDEA, state=ACTIVE)` |
| "brief créatif" | `BrandAsset.kind=CREATIVE_BRIEF` + `CampaignBrief` pointer |

### 28.3 Anti-patterns identifiés

| Anti-pattern | Pourquoi |
|---|---|
| `prisma.foo.update(...)` direct hors `tenantScopedDb` | Bypass multi-tenant default-deny |
| `as never` pour silencer TS | Dette technique tracée |
| `JSON.parse(x)` sans try | Backlog #7 |
| `console.log` en code prod | Backlog #7 |
| `text-zinc-500` / hex direct hors primitives | Design tokens cascade |
| `.join(" ")` ternaire pour variants > 1 | CVA obligatoire |
| Glory tool/framework sans `outputSchema` ni `_noSchemaJustification` | Backlog #4 |
| `protectedProcedure` direct pour mutation neuve | Governance bypass (utiliser `governedProcedure`) |
| `prisma db push` | Migrations versionnées obligatoires |
| Commit `.env.local` | Secrets |
| `--no-verify` skip hooks | Sauf demande user explicite |
| Ajouter un 8ème Neter | Cap APOGEE = 7 |
| Ajouter un 5ème manipulation mode | Cap = 4 |
| Mutation d'un past `IntentEmission` | Hash chain immutable — émettre `CORRECT_INTENT` |
| LLM call sans `executeStructuredLLMCall` | Coercion silencieuse interdite (Phase 21 F-A) |
| Sequence sans `lifecycle` + `expiresAt` + `promptHash` | Phase 17a contrat |
| `enrichOracle` legacy étendu | Deprecation prévue — utiliser nouveau path Assembler |

---

## §29 — Rationalization backlog (8 items prioritaires)

> **Ces 8 items alimentent la série de PRDs BMAD à venir.** Ordre = priorité de résorption.

### Backlog #1 — NSP streaming `complete()` intake **[pilote]**
- **Symptôme** : streaming intake émet `STARTED/PROGRESS` mais pas de `complete()` final cohérent → frontend en attente perçue.
- **Surface** : `src/server/services/quick-intake/index.ts` (modif uncommitted en cours) + NSP emitters intake.
- **Scope PRD** : modèle événement final canonique (status + payload résultat + cleanup listener) ; pattern réutilisable cross-flows Artemis.
- **Refs** : Phase 16 NSP foundation (ADR-0025), Phase 21 F-E pattern Oracle (ADR-0072).
- **Pilote** : ✅ servira de référence pour pattern `complete()` cross-flows.
- **Critère arrêt** : tests intégration intake passing + frontend reçoit événement final + cleanup listener vérifié.

### Backlog #2 — Cockpit auth stale fix
- **Symptôme** : session NextAuth v5 stale côté Cockpit (token UI désynchro server) → 401 sporadiques.
- **Surface** : `src/lib/auth/` + middleware NextAuth + hooks `useSession` côté `(cockpit)`.
- **Scope PRD** : refresh strategy + invalidation cascade + indicateur UI stale.
- **Critère arrêt** : 0 régression 401 sur smoke + indicateur visible.

### Backlog #3 — Golden path steps 8-10 (validation)
- **Symptôme** : `npm run test:golden-path` couvre 1-7 fiables ; **8-10 marqués "fix en principe — à valider"**.
- **Surface** : `scripts/test-golden-path.ts` + scénarios e2e Playwright.
- **Scope PRD** : audit 8-10 + confirmation correction + promotion test bloquant CI.
- **Critère arrêt** : golden path 100% green + bloquant en CI.

### Backlog #4 — Phase 21 F-A `outputSchema` annotation (56 Glory tools + 24 Frameworks)
- **Symptôme** : mécanique `executeStructuredLLMCall` + contract type-level shipped, mais **annotation per-tool incomplète**.
- **Surface** : `src/server/services/glory-tools/**/manifest.ts` (56) + `src/server/services/**/frameworks/**` (24).
- **Scope PRD** : 5 batchs ~16 outputs/batch + tests anti-drift G2/G3/G7/G8 **promote soft → HARD** au fil + script `audit:tools-outputschema` à créer.
- **Refs** : ADR-0067, RESIDUAL-DEBT §Phase 21.
- **Critère arrêt** : 80/80 annotated + audit script à 0 + tests HARD.

### Backlog #5 — Cycles `artemis/tools/*` × 10
- **Symptôme** : `madge --circular` signale **~10 cycles** dans `artemis/tools/*` (mode warn — passera error Phase 4).
- **Surface** : `src/server/services/artemis/tools/**`.
- **Scope PRD** : identifier les 10 (`npm run audit:cycles`), extraction `types/` dédiés ou inversion dépendance, supprimer cycles + `madge --circular` retour 0.
- **Critère arrêt** : `npm run audit:cycles` retour 0 cycle dans `artemis/`.

### Backlog #6 — Router bypass migration ~86 procédures
- **Symptôme** : ~86 procédures utilisent encore `protectedProcedure`/`auditedProcedure` au lieu de `governedProcedure`.
- **Surface** : `src/server/trpc/routers/**` (80 routers — cf. `STRANGLER-ROUTERS-AUDIT.md`).
- **Scope PRD** : audit per-router + plan migration par batch (prioriser `pillar.ts` + `strategy.ts` — biggest bypass surfaces) + `audit:governance` à 0 procedural bypass.
- **Critère arrêt** : 100% mutations via `governedProcedure` (Phase 3 target REFONTE-PLAN).

### Backlog #7 — Hygiène `console.log` + `JSON.parse` sans try
- **Symptôme** : occurrences `console.log` et `JSON.parse(...)` sans try dans `src/server/**`.
- **Scope PRD** : audit count + remplacement par logger structuré (`src/lib/log/`) + `safeJsonParse` wrapper + ESLint rules `no-raw-console` + `no-naked-json-parse` (à créer dans `eslint-plugin-lafusee`).
- **Critère arrêt** : 0 violation lint + rule HARD CI.

### Backlog #8 — Phase 18 résidus (7 catégories)
- **Symptôme** : Brand Tree multi-archétype (Phase 18) noyau shippé, résidus reportés derrière formulaire opérateur.
- **Surface** : `Phase18ResidualEntry` model + router `phase18Residuals.list/upsert/resolve/dismiss/stats` + page `/console/governance/phase-18-residuals`.
- **7 catégories** :
  1. **N5-bis** — Bible reclassif manuelle ~300 entrées domain-business.
  2. **N6-bis** — annotation 56 Glory tools brand-aware (intersect partiel avec #4).
  3. **N9** — script `duplicate-pillars` (audit hérédité ADVE).
  4. **N10** — feature flag rollout phase-18-v2.
  5. **LLM Phase 2 fine-tune** (post-30j prod).
  6. **Cache Redis cross-pod** (BrandContext invalidation).
  7. **Phase 18-bis** — M&A + 8 archétypes non-PRODUCT (3 mois).
- **Scope PRD** : tri (résorption immédiate / différée / cancel) + priorisation valeur business + résorption par batch.

### Synergies inter-items

| Synergie | Impact |
|---|---|
| **#4 ⇄ #8 (N6-bis)** | annotation brand-aware partage surface — possible 1 PRD "Glory tools enrichment" |
| **#1 ⇄ Phase 21 F-E** | pattern `complete()` = portage du pattern Oracle SSE déjà shipped |
| **#5 ⇄ #6** | résorber cycles parfois exige refactor router-service — coordonner ordre |
| **#7** | mécanique transverse — exécute en background pendant #1-#6 |

---

## §30 — Garde-fous PRDs BMAD à venir

Pour chaque PRD issu du backlog §29 :

1. **Cibler 1-2 items max** sauf synergie évidente.
2. **Mission contribution** en intro (cf. §1.4 north star).
3. **Lister Neter de tutelle + ADRs cités + sources de vérité affectées** (cf. §6 — 7 sources).
4. **Critère d'arrêt mesurable** : count, test passing, audit à 0.
5. **Anti-drift first** : tout PRD ajoute ou renforce **≥ 1 test bloquant** (soft → HARD après stabilisation).
6. **Pas de feature creep** — PRD de résorption ne fait pas évoluer le métier.
7. **Documenter résidus** dans `RESIDUAL-DEBT.md` si scope dépasse sprint.
8. **Vérifier `CODE-MAP`** — résorber doublons connus si touchés.
9. **Phase label** : `phase/<n>` ou justifier `out-of-scope`.
10. **Manual-first parity** : toute feature LLM ajoutée doit avoir une UI manuelle équivalente (ADR-0060).

---

## §31 — Canonical sources (lire AVANT de coder)

### Ordre pour agent en session fraîche
1. `CLAUDE.md` — contrat activation NEFER (racine)
2. `docs/governance/MISSION.md` — north star + drift test
3. `docs/governance/PANTHEON.md` — 7 Neteru, récit
4. `docs/governance/APOGEE.md` — framework + 3 Lois
5. `docs/governance/LEXICON.md` + `CODE-MAP.md` — vocabulaire + anti-doublon
6. `docs/governance/RESIDUAL-DEBT.md` §Phase 18 + §Phase 21 — dette pending
7. `docs/scan/index.md` — pack onboarding (2026-05-13)

### Maps auto-générées (anti-drift CI)

`CODE-MAP.md` (régen pre-commit) • `SERVICE-MAP.md` • `ROUTER-MAP.md` • `PAGE-MAP.md` • `COMPONENT-MAP.md` • `INTENT-CATALOG.md` • `VARIABLE-BIBLE-CANON.md` • `DESIGN-TOKEN-MAP.md` • `DESIGN-LEXICON.md`.

### ADRs index (76 ADRs — sélection structurante)

| ADR | Quoi |
|---|---|
| 0001 | Framework name APOGEE |
| 0002 | Layering 6 couches |
| 0004 | Strangler `auditedProcedure` |
| 0005 | Hash chain immutability |
| 0009 | Neter Ptah forge |
| 0012 | Brand Vault SuperAssets |
| 0013 | Design system panda+rouge |
| 0014/0015/0016 | Oracle 35-section canonical + kind extension + PDF snapshot |
| 0019/0020 | Imhotep + Anubis full activation |
| 0021 | External Credentials Vault |
| 0022 | Oracle error codes (Error Vault) |
| 0023/0024 | OPERATOR_AMEND_PILLAR + Console namespace cleanup |
| 0025/0026 | Notification real-time + MCP bidirectionnel |
| 0039/0040/0041/0042 | Sequence as unique public unit + lifecycle |
| 0045 | Oracle 35 cleanup CORE tier |
| 0046 | Cult index no-magic-fallback |
| 0048 | Glory tools as primary API (Higgsfield MCP) |
| 0050 | Deliverable Forge output-first |
| 0052 v2 | Campaign tracker L2 Instrumental |
| 0059/0060/0061/0062 | Brand Tree multi-archétype + Manual-first parity + BrandNature + Morning Brief Batch |
| 0067 | LLM output structured enforcement (Phase 21 F-A) |
| 0068/0070/0071/0072/0073 | Oracle progressive cascade F-B/F-C/F-D/F-E/F-F |
| 0069 | Readiness UI parity |
| 0074 | Phase 21 closure |
| 0075 | Payment secrets in env |
| 0076 | Stale semantics 2-levels |

### Plans

- `REFONTE-PLAN.md` — phases 0-9 (rationalisation)
- `RESIDUAL-DEBT.md` — dette tracée par phase
- `MEGA-SPRINT-NEFER-2026-05-07.md` — log dernier mégasprint
- `scope-drift.md` + `STRANGLER-ROUTERS-AUDIT.md` — backlog #6

---

## §32 — Commands cheat-sheet

```bash
# === Boot ===
npm ci && cp .env.example .env.local         # fill DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY
npx prisma generate && npm run db:migrate && npm run db:seed:all
npm run dev                                   # http://localhost:3000

# === Avant push (obligatoire) ===
npm run preflight                             # full audit (typecheck + lint + audits)
npm run preflight:quick

# === Audits par dimension ===
npm run lint                                  # ESLint + boundaries + plugin-lafusee
npm run audit:cycles                          # madge — backlog #5
npm run audit:governance                      # backlog #6
npm run audit:manifests
npm run audit:preconditions
npm run audit:design                          # warn
npm run audit:design:strict                   # bloque
npm run glory:inventory                       # backlog #4
npm run glory:forgeoutput-audit

# === Regen maps (si structurel) ===
npm run codemap:gen                           # CODE-MAP.md
npm run manifests:gen                         # manifest registry
npm run ds:components-map                     # COMPONENT-MAP.md
npm run ds:tokens-map                         # DESIGN-TOKEN-MAP.md

# === Scaffolds ===
npm run manifests:scaffold -- --service=<service> --name=<name>
npm run plugin:scaffold

# === Tests ===
npm test                                      # vitest watch
npm test -- --run                             # one-shot
npm test -- path/to/file.test.ts --run
npm run test:llm                              # ANTHROPIC_API_KEY requis
npm run test:e2e                              # Playwright
npm run test:golden-path                      # backlog #3
npm run test:visual
npm run test:a11y
npm run test:i18n
npm run stress:full
npm run stress:pages / :forges / :state

# === Codemods utiles ===
npm run codemod:zinc                          # Tailwind colors → tokens
npm run backfill:manipulation-mix
npm run gen:legacy-intent-kinds

# === DB ===
npm run db:migrate                            # prisma migrate dev (jamais db:push)
npm run db:generate                           # prisma generate
npm run db:seed                               # base
npm run db:seed:demo / :spawt / :wakanda / :countries / :all
npm run db:purge:wakanda
npm run db:diag                               # diagnose connectivity

# === Harvest / preview ===
npm run harvest:static[:fast]
npm run harvest:dynamic:cockpit / :console / :public
npm run preview:mobile[:dark / :se / :pixel]
npm run audit:lighthouse

# === Storybook ===
npm run storybook                             # port 6006
npm run build-storybook
npm run chromatic
```

---

## §33 — Glossaire FR/EN essentiel

| Terme repo | Définition courte |
|---|---|
| **NEFER** | opérateur expert qui exécute Intents (pas un Neter) |
| **Neter** | governor d'un sous-système APOGEE (7 total, cap intangible) |
| **APOGEE** | framework propulsion+guidance de l'OS |
| **ADVE** | piliers fondateurs gratuits (Awareness, Desire, Value, Engagement) |
| **RTIS** | piliers dérivés payants (Retention, Trust, Innovation, Strategy) |
| **Glory tool** | capability rédactionnelle (Artemis) qui produit un brief |
| **Sequence** | enchaînement orchestré de Glory tools / frameworks (Phase 17a) |
| **Framework** | template structuré (McKinsey 7S, etc.) — 24 frameworks |
| **Forge** | matérialisation d'un brief en asset concret (Ptah) |
| **Oracle** | livrable 35-section, un parmi N BrandAsset.kind |
| **Vault** | `BrandAsset` unifié (rangement par kind) |
| **BrandAsset** | unité matérielle stockée (kind = type sémantique) |
| **Strategy** | top-level brand context, contient `manipulationMix` |
| **BrandNode** | nœud du brand tree multi-archétype (Phase 18) |
| **BrandNature** | nature de marque (9 : PRODUCT, SERVICE, ...) |
| **Intent / IntentEmission** | unité de mutation immutable hash-chained |
| **Intent kind** | type d'Intent dans le registry (`VERB_NOUN`) |
| **NSP** | Neteru Streaming Protocol (SSE custom) |
| **Tarsis** | sub-component Seshat — weak signals |
| **Jehuty** | cross-brand intelligence + curation |
| **Variable-bible** | ~300 entrées éditables (`src/lib/types/variable-bible.ts`) |
| **Cult Index** | snapshot mesure phase culte d'une marque |
| **Devotion Ladder** | échelle d'engagement audience → superfan |
| **Superfan** | masse stratégique propellant organique (pas KPI visiteur) |
| **Overton** | axe culturel sectoriel à déplacer |
| **Manipulation mode** | peddler / dealer / facilitator / entertainer (cap=4) |
| **Operator** | tenant root = UPgraders |
| **Client** | customer du multi-tenant Operator |
| **Crew** | talent / freelancer / agence (Imhotep) |
| **Guild** | network agences (`GuildTier`: APPRENTI/COMPAGNON/MAITRE/ASSOCIE) |
| **Anubis** | governor Comms (broadcast + ad networks + MCP) |
| **Credentials Vault** | UI per-operator externalConnector (ad networks, MCP) |
| **DEFERRED_AWAITING_CREDENTIALS** | provider façade response sans creds (code ship-able) |
| **Cascade ADVERTIS** | A→D→V→E→R→T→I→S, unidirectionnelle |
| **Cap APOGEE** | 7 Neteru intangible |
| **CODE-MAP** | synonyme métier ↔ entité (anti-doublon, auto-régen pre-commit) |

---

_Fin du Project Context. Source de vérité = `CLAUDE.md` + `docs/governance/`. Ce fichier consolide pour démarrer un agent IA ou un contributeur humain en session fraîche, **mais ne se substitue pas au corpus**._

_Pour les PRDs BMAD à venir : lire §29 (backlog priorisé) + §30 (garde-fous), puis §19 how-to pour scaffold._
