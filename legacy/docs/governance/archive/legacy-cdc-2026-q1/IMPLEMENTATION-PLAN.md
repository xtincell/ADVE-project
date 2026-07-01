# LaFusee Industry OS — Plan d'Implémentation Complet

## DÉCISIONS ARCHITECTURALES

1. **Single Next.js App** (pas monorepo) — Les portails sont des vues, pas des apps (Principe 4, §1.5). Route groups: `(cockpit)`, `(creator)`, `(console)`, `(intake)`.
2. **tRPC routers par domaine** — 61 routers par fonction (driver, qualityReview, commission…), pas par division.
3. **Single schema.prisma** — ~99 modèles, organisé par sections commentées.
4. **Services = modules TypeScript** — Fonctions exportées, pas de classes ni DI.
5. **Vitest (unit) + Playwright (e2e)** — Conforme §12.1 du spec.

---

## STRUCTURE DES RÉPERTOIRES

```
lafusee/
├── prisma/
│   ├── schema.prisma              # ~99 modèles, 15+ enums
│   ├── migrations/
│   └── seed.ts                    # Knowledge seeder (F.3) + Operator initial
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── (auth)/login, register
│   │   ├── (cockpit)/cockpit/     # Portail Client (Brand OS)
│   │   │   ├── page.tsx           # Cult Dashboard
│   │   │   ├── operate/           # missions, campaigns, briefs, requests
│   │   │   ├── brand/             # guidelines, assets, identity
│   │   │   ├── insights/          # reports, diagnostics, benchmarks, attribution
│   │   │   ├── messages/
│   │   │   └── mestor/
│   │   ├── (creator)/creator/     # Portail Créateur (Guild OS)
│   │   │   ├── page.tsx           # Creator Dashboard
│   │   │   ├── missions/          # available, active, collab
│   │   │   ├── qc/               # submitted, peer
│   │   │   ├── progress/         # metrics, path, strengths
│   │   │   ├── earnings/         # missions, qc, invoices, history
│   │   │   ├── profile/          # skills, portfolio, drivers
│   │   │   ├── learn/            # adve, drivers, cases, resources
│   │   │   ├── messages/
│   │   │   └── community/        # guild, events
│   │   ├── (console)/console/     # Console Fixer (God mode)
│   │   │   ├── page.tsx           # Ecosystem Dashboard
│   │   │   ├── oracle/           # clients, diagnostics, intake, boot
│   │   │   ├── signal/           # intelligence, tarsis, signals, knowledge, market, attribution
│   │   │   ├── arene/            # guild, orgs, matching, club, events
│   │   │   ├── fusee/            # missions, campaigns, drivers, glory, scheduler, pr, social, media, interventions
│   │   │   ├── academie/         # formations, certifications, boutique, content
│   │   │   ├── socle/            # revenue, commissions, value-reports, contracts, invoices, escrow, pipeline
│   │   │   ├── ecosystem/        # operators, metrics, scoring
│   │   │   ├── messages/
│   │   │   └── config/           # thresholds, templates, integrations, system
│   │   ├── (intake)/intake/       # Quick Intake (public, no auth)
│   │   │   ├── page.tsx
│   │   │   ├── [token]/page.tsx
│   │   │   └── [token]/result/page.tsx
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── mcp/               # 6 MCP servers
│   │       └── webhooks/          # mobile-money, social
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   ├── advertis-vector.ts          # AdvertisVector Zod + helpers
│   │   │   ├── ontology/                   # Annexe H (N0-N6, T.01-T.10)
│   │   │   └── pillar-schemas.ts           # Zod A-D-V-E-R-T-I-S
│   │   ├── auth/                           # NextAuth config + middleware
│   │   ├── db.ts                           # Prisma singleton
│   │   ├── ai/                             # Claude client, prompts, cost tracker
│   │   └── utils/                          # scoring, staleness, permissions
│   │
│   ├── server/
│   │   ├── trpc/
│   │   │   ├── init.ts, router.ts, context.ts
│   │   │   ├── middleware/                 # auth, operator, rate-limit
│   │   │   └── routers/                    # ~61 routers (18 nouveaux + 43 existants)
│   │   ├── services/                       # ~19 services
│   │   │   ├── advertis-scorer/            # structural + quality-modulator
│   │   │   ├── driver-engine/
│   │   │   ├── matching-engine/
│   │   │   ├── qc-router/
│   │   │   ├── feedback-loop/
│   │   │   ├── quick-intake/
│   │   │   ├── boot-sequence/
│   │   │   ├── commission-engine/
│   │   │   ├── value-report-generator/
│   │   │   ├── knowledge-capture/
│   │   │   ├── knowledge-aggregator/
│   │   │   ├── guidelines-renderer/
│   │   │   ├── diagnostic-engine/
│   │   │   ├── upsell-detector/
│   │   │   ├── tier-evaluator/
│   │   │   ├── process-scheduler/
│   │   │   ├── team-allocator/
│   │   │   ├── seshat-bridge/
│   │   │   ├── asset-tagger/
│   │   │   └── knowledge-seeder/
│   │   └── mcp/                            # 6 MCP servers
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn/ui
│   │   ├── shared/                         # radar, devotion-ladder, score-badge, mestor-panel
│   │   ├── cockpit/
│   │   ├── creator/
│   │   ├── console/
│   │   └── intake/
│   │
│   └── styles/globals.css
│
├── tests/
│   ├── unit/                               # Vitest
│   ├── integration/                        # Vitest + test DB
│   └── e2e/                                # Playwright
│
├── docs/                                   # Specs (déplacées)
└── config files (package.json, tsconfig, next.config, vitest, playwright, etc.)
```

---

## PHASES D'IMPLÉMENTATION

### PRÉ-PHASE : Scaffolding (~3-4 jours)

1. Init Next.js 16 + TypeScript strict + React Compiler
2. Install deps: tRPC, Prisma, NextAuth, AI SDK, shadcn/ui, Recharts, MCP SDK, Vitest, Playwright
3. Prisma init — schema complet (~99 modèles, 15+ enums), migration initiale
4. tRPC setup — init, context, middleware (auth/operator/rate-limit), root router, HTTP handler
5. Auth setup — NextAuth 5 + Credentials + Google OAuth, Prisma adapter, roles
6. Core types — AdvertisVector Zod, ontologie Annexe H, pillar schemas
7. UI foundation — shadcn/ui init, OKLCH colors, composants partagés (radar, score-badge)
8. Layout shells — Root + Cockpit + Creator + Console + Intake layouts

**~40 fichiers**

---

### PHASE 0 : ADVE Protocol + Quick Intake (Semaines 1-4)

| # | Tâche | Taille | Dépendances |
|---|-------|--------|-------------|
| 0.1 | AdvertisVector type + helpers (classifyBrand, createEmpty, validate) | S | — |
| 0.2 | Operator model + seed UPgraders | S | — |
| 0.3 | KnowledgeEntry model + knowledge-capture service (passif) | M | — |
| 0.4 | Ajouter advertis_vector Json? sur Strategy, Campaign, Mission, TalentProfile, Signal, GloryOutput, BrandAsset | M | 0.1 |
| 0.5 | **Advertis-scorer service** — structural.ts (déterministe, formule Annexe G) + quality-modulator.ts (AI, 0.70-1.00, ≤30% influence) | L | 0.1, 0.4 |
| 0.6 | DevotionSnapshot model + devotionLadder router (6 niveaux) | M | 0.4 |
| 0.7 | **QuickIntake model + router + engine** — start/advance/complete, fourchettes si confidence < 0.7 | L | 0.5 |
| 0.8 | Pages Quick Intake /intake — landing + questionnaire + résultat radar | L | 0.7 |
| 0.9 | Unifier scoring à /200 (aligner ScoreSnapshot avec AdvertisVector) | M | 0.5 |
| 0.10 | Quick Intake → CRM (auto-create Deal PROSPECT) | S | 0.7 |
| 0.11 | Réconcilier AmbassadorProgram avec Devotion Ladder | S | 0.6 |

**Livrables : ~15-18 fichiers. Tous objets scorables /200. Quick Intake live. Knowledge capture passif.**

---

### PHASE 1 : Brand Instance Complete (Semaines 5-9)

| # | Tâche | Taille | Dépendances |
|---|-------|--------|-------------|
| 1.1 | Driver model + router (create, activate, generateSpecs, auditCoherence, translateBrief) | L | P0 |
| 1.2 | **driver-engine service** — generateSpecs, translateBrief, getSuggestedFirstTool (F.2) | L | 1.1 |
| 1.3 | **guidelines-renderer** — generate, exportPdf, exportHtml (agrège ADVE + invoque GLORY) | L | 1.2 |
| 1.4 | BrandVault restructuration — 3 niveaux (system/operator/production) + ADVE tagging | M | P0 |
| 1.5 | DeliverableTracking model + router | M | — |
| 1.6 | **feedback-loop service** — processSignal → recalcul pilier → drift → ARTEMIS → alerte | L | 1.5, Signal |
| 1.7 | Connecter Social/Media/PR au feedback loop (3 sous-tâches M) | M×3 | 1.6 |
| 1.8 | Market Study → Knowledge Graph (KnowledgeEntry SECTOR_BENCHMARK) | M | P0.3 |
| 1.9 | Permissions enrichies (granulaire par Strategy + operatorId) | M | — |
| 1.10 | Approval workflow avec check ADVE par pilier | M | 0.5 |

**Livrables : ~20 fichiers. Brand OS complet avec Drivers, guidelines, feedback loop actif.**

---

### PHASE 2 : Mission Forge + Guild (Semaines 10-15)

| # | Tâche | Taille | Dépendances |
|---|-------|--------|-------------|
| 2.1 | Mission mode DISPATCH/COLLABORATIF + driverId | S | P1 |
| 2.2 | GuildOrganization + router | M | — |
| 2.3 | TalentProfile enrichi (tier, ADVE vector, driverSpecialties, metrics) | M | — |
| 2.4 | **matching-engine** — suggest(briefId), binary puis multi-factor scoring | L | 2.3 |
| 2.5 | Brief generator (driver-engine + Mestor + N2 composites) | L | P1.2 |
| 2.6 | **QualityReview + qc-router** — routing par tier × criticité, automated-qc AI | L | 2.3 |
| 2.7 | **tier-evaluator** — evaluateCreator, promotion/demotion criteria | M | 2.3, 2.6 |
| 2.8 | PortfolioItem CRUD | S | — |
| 2.9 | SLA tracking (alertes D-2, D-1, escalation) | M | 2.1 |
| 2.10 | seshat-bridge (client REST externe, conditionnel) | M | — |
| 2.11 | Translation × Drivers multi-marché | M | P1.1 |
| 2.12 | InterventionRequest → Mission conversion | S | — |

**Livrables : ~15 fichiers. Briefs via Driver, matching créateurs, QC distribué, Guild structurée.**

---

### PHASE 3 : Portails (Semaines 16-22)

| # | Tâche | Taille |
|---|-------|--------|
| 3.1 | **Client Portal /cockpit** — Cult Dashboard + operate(4) + brand(3) + insights(4) + messages + mestor. View modes: EXECUTIVE, MARKETING, FOUNDER, MINIMAL | L |
| 3.2 | **Creator Portal /creator** — Dashboard + missions(3) + qc(2) + progress(3) + earnings(4) + profile(3) + learn(4) + messages + community(2). Visibilité conditionnelle par tier | XL |
| 3.3 | **Fixer Console /console** — Ecosystem Dashboard + oracle(4) + signal(6) + arene(5) + fusee(9) + academie(4) + socle(7) + ecosystem(3) + messages + config(4) | XL |
| 3.4 | Mestor contextuel — 4 system prompts distincts par portail | M |
| 3.5 | Intégration modules existants dans structure portails (Club, Events, PR, Social, Media, CRM, Attribution, etc.) | M |
| 3.6 | Redirections legacy (/os/*, /impulsion/*, /pilotis/* → portails) | M |

**Livrables : ~60 pages + ~30 composants. Tous les acteurs ont leur interface.**

---

### PHASE 4 : Value Capture + Scheduler (Semaines 23-28)

| # | Tâche | Taille |
|---|-------|--------|
| 4.1 | **Commission engine** — calculate par tier + Driver, generatePaymentOrder, operatorFee | L |
| 4.2 | Membership model + router (mensuel par tier) | M |
| 4.3 | **Value Report generator** — agrège évolution piliers, Devotion, missions, QC, prescriptions. Export PDF/HTML. Micro report J+14 (F.2) | L |
| 4.4 | **Upsell detector** — drivers manquants, piliers sous-exploités, quick_intake → conversion | M |
| 4.5 | **Process scheduler** — DAEMON/TRIGGERED/BATCH, cron, alertes arrêt, contention, playbook F.2 | L |
| 4.6 | Team allocator — charge consolidée, bottlenecks, recommandations staffing | M |
| 4.7 | **Boot Sequence** — start/advance/complete (60-90min), arbre décisionnel adaptatif, First Value Protocol | L |
| 4.8 | Mobile Money (Orange Money, MTN, Wave) — webhooks + intégration commission/membership | L |
| 4.9 | Operator fees (prêt mais non activé V1) | M |

**Livrables : ~15 fichiers. Commissions auto, Value Reports, scheduler, Boot Sequence, Mobile Money.**

---

### PHASE 5 : Knowledge Graph + Antifragilité (Semaines 29-35)

| # | Tâche | Taille |
|---|-------|--------|
| 5.1 | **knowledge-aggregator** — batch, agrège KnowledgeEntry depuis P0, benchmarks secteur, rankings framework | XL |
| 5.2 | Benchmarks secteur (cross-strategy anonymisé via sourceHash) | L |
| 5.3 | Ranking performance frameworks ARTEMIS | M |
| 5.4 | Profiling performance créateurs (par type brief, canal, secteur) → matching | M |
| 5.5 | Patterns d'optimisation briefs | M |
| 5.6 | Templates campagne data-driven | M |
| 5.7 | Connecter Tarsis au Knowledge Graph | M |
| 5.8 | **diagnostic-engine** — extension ARTEMIS, diagnostic différentiel, localisation problème, batteries structurées | L |
| 5.9 | **MCP Server Guild** (~10 tools, ~4 resources) | L |
| 5.10 | **MCP Server SESHAT** (~8 tools, ~3 resources) | L |
| 5.11 | Anonymisation données (sourceHash, pipeline) | M |
| 5.12 | Export données RGPD (JSON/CSV) | M |
| 5.13 | Score /200 standard public (stats page + widget embarquable) | M |

**Livrables : ~15 fichiers. Knowledge Graph actif, ARTEMIS apprend du passé, 6 MCP servers, système antifragile.**

---

## STRATÉGIE DE TESTS

| Type | Outil | Priorités |
|------|-------|-----------|
| Unit | Vitest | P0: scorer déterminisme (variance=0), vector validation. P2: matching, QC routing. P4: commissions |
| Integration | Vitest + test DB | P0: Quick Intake flow complet. P1: feedback loop chain. P4: commission calculation |
| E2e | Playwright | P3: les 3 portails + Quick Intake |

### Tests critiques
- **structural-scoring.test.ts** — variance = 0 sur appels répétés (F.1.5)
- **quick-intake.test.ts** — start → advance ×N → complete → vérifier vector + classification
- **qc-router.test.ts** — règles routing par tier × criticité
- **commission-engine.test.ts** — calcul par tier + Driver type

---

## RISQUES ET MITIGATIONS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Déterminisme scoring (F.1) | Scores incohérents | Modulator AI plafonné à 30%, tests variance=0 |
| Cold start (F.3) | Knowledge Graph vide | Seeder expertise Alexandre + capture passive dès P0 (29 sem de données à P5) |
| Quick Intake lent/buggy | Funnel cassé | Construit en P0, testé extensivement, fourchettes si confidence < 0.7 |
| Scope creep P3 (50+ pages) | Retard | Skeleton pages d'abord, composants partagés agressifs |
| Coût AI | Budget explosé | Cost tracker, rate limiting 10 req/min, scoring structural réduit dépendance AI |

---

## FICHIERS SPEC CRITIQUES

| Fichier | Contient |
|---------|----------|
| `LAFUSEE-OS-PART-1-VISION-DATA.md` | Data model: 12 nouveaux modèles Prisma, 15 enums, 10 modèles à modifier, AdvertisVector |
| `LAFUSEE-OS-PART-2-API-UI-SYSTEMES.md` | API surface (18 nouveaux routers, 30 existants à modifier), 19 services, structure UI portails, Mestor contextuel |
| `ANNEXE-F-V2.md` | Résilience: formule scoring déterministe, fourchettes Quick Intake, First Value Protocol, Knowledge Seeder, feedback mensuel |
| `ANNEXE-G-V2.md` | Rubrique scoring par pilier: atomes/collections/cross-refs, formule `(atomes/requis×15)+(collections/totales×7)+(cross_refs/requises×3)×modulator` |
| `ANNEXE-H-PART-1-FONDATIONS.md` | Ontologie types (N0-N6): taxonomies T.01-T.10, atomes N1, composites N2.01-N2.12 |
