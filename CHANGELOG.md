# Changelog — La Fusee

Systeme de versionnage : **`MAJEURE.PHASE.ITERATION`**

- **MAJEURE** : Refonte architecturale ou changement de paradigme (v1 = fondation, v2 = modules, v3 = NETERU, ...)
- **PHASE** : Phase strategique du CdC (0 = fondation, 1 = enrichissement, 2 = intelligence, 3 = production, ...)
- **ITERATION** : Increment au sein d'une phase (fixes, features, polish)

> **Mise à jour OBLIGATOIRE par NEFER en Phase 6** — toute session qui ship un commit `feat(...)` ajoute une entrée ici. Cf. [docs/governance/NEFER.md](docs/governance/NEFER.md). Audit anti-drift : `scripts/audit-changelog-coverage.ts`.

---

## v5.5.1 — Design System foundation (panda + rouge fusée) — Phase 11 PR-1 (2026-04-30)

**Pose la fondation gouvernée du Design System panda + rouge fusée — cascade 4 tiers, 12 docs canon, 6 fichiers tokens CSS, 2 tests anti-drift bloquants.**

- `feat(ds)` **DESIGN-SYSTEM.md** — canon vivant (renommé depuis `DESIGN-SYSTEM-PLAN.md` 29 avril, status `executing`). Source unique de vérité : 4 couches (Reference → System → Component → Domain), 60 patterns documentés, matrice 30 scénarios concrets, fluid type/spacing scale via `clamp()`, container queries, density `data-density` per portail.
- `feat(ds)` **ADR-0013** — palette panda noir/bone + accent rouge fusée + cascade 4 tiers. Justifie rejet legacy violet/emerald, alternatives rejetées (DS-Marketing isolé, palette tierce). Cite ADR-0009 Ptah (cause renumérotation 0009 → 0013) + ADR-0012 BrandVault.
- `feat(ds)` **5 docs gouvernance séparés** : DESIGN-LEXICON.md (vocabulaire visuel), DESIGN-TOKEN-MAP.md (inventaire), DESIGN-MOTION.md (durations/easings), DESIGN-A11Y.md (WCAG AA, ARIA, focus), DESIGN-I18N.md (RTL, font-scaling 200%, currencies marché africain).
- `feat(ds)` **4 catalogues Tier-par-Tier** : `design-tokens/{reference,system,component,domain}.md` détaillant chaque token avec OKLCH/hex/WCAG ratio + COMPONENT-MAP.md inventaire 130 composants à migrer.
- `feat(ds)` **6 fichiers tokens CSS cascade** : `src/styles/tokens/{reference,system,component,domain,animations}.css` + `index.css` orchestrateur. `globals.css` refactor : import cascade + legacy aliases (rétrocompat zinc/violet pendant migration). Cascade panda résolue correctement vérifiée via preview MCP : `--color-background` cascade `--ref-ink-0` (#0a0a0a), `--color-accent` cascade `--ref-rouge` (#e63946), `--division-mestor` cohérent rouge signature.
- `feat(governance)` **Substitution INFRASTRUCTURE → Ptah** dans Domain tokens — cohérent BRAINS const 5 actifs (Mestor/Artemis/Seshat/Thot/Ptah). Imhotep/Anubis pas de token tant que pré-réservés (anti-drift).
- `feat(governance)` **REFONTE-PLAN.md Phase 11 entry** + RESIDUAL-DEBT.md Tier 2.0 (cause + lessons learned + tracking 130 composants) + LEXICON.md entrée DESIGN_SYSTEM + CLAUDE.md section Design System pointer + memory user `design_system_panda.md`.
- `test(governance)` **2 tests anti-drift bloquants** : `design-tokens-coherence` (CSS vars ↔ docs, 5 actifs Neteru, 8 piliers, 6 classifications, 4 tiers — pas Imhotep/Anubis), `design-tokens-cascade` (aucun composant `src/components/**` ne consomme `var(--ref-*)` directement). 11/11 verts.
- `chore(governance)` Branche `feat/ds-panda-v1` créée pour 9 sous-PRs séquencés (PR-1 → PR-9 = v5.5.1 → v5.5.9). Label PR `phase/11`. `out-of-scope` justifié par mandat user.

**Sous-système APOGEE** : Console/Admin — INFRASTRUCTURE (Ground Tier). Aucun Neter créé, aucune mutation business. `missionContribution: GROUND_INFRASTRUCTURE`.

## v5.4.8 — Sync deps remote (2026-04-29)

- `chore(deps)` Sync package-lock — add darwin-x64 next swc binary (commit `5f9dd27`).

## v5.5.0 — NEFER Persona + Error Vault + Stress-Test (2026-04-30)

**Activation persona expert NEFER + observabilité runtime + batterie de stress-test E2E.**

- `feat(persona)` **NEFER** — opérateur expert auto-activé via CLAUDE.md à chaque session. Identité, mantra, 3 interdits absolus, protocole 8 phases (check préventif → commit → auto-correction), checklist 17 cases, drift signals, comportement par type demande. Doc : `docs/governance/NEFER.md`. NEFER **n'est PAS un Neter** (pas dans BRAINS), c'est l'opérateur qui sert les Neteru.
- `feat(error-vault)` **Phase 11 — observabilité runtime**. Model Prisma `ErrorEvent` + service `error-vault/` avec dedup signature (sha256 source+code+message+stack). Auto-capture serveur via tRPC `errorFormatter` + auto-capture client via `<ErrorVaultListener />` (window.onerror + unhandledrejection). Page admin `/console/governance/error-vault` avec stats 24h, clusters par signature, batch resolve, mark known-false-positive. 2 nouveaux Intent kinds + SLOs.
- `feat(stress-test)` **Stress-test E2E** (`npm run stress:full`) — simule un admin qui slamme l'OS : Phase 1 crawl ~165 pages, Phase 2 tRPC queries readonly, Phase 4 Ptah forges sur 7 forgeKinds (mock fallback), Phase 5 BrandAsset state transitions (createBatch+select+supersede+archive avec invariants). Pre-flight check (HTTP+DB) avec abort early si DB unreachable et skip-HTTP si serveur dev down. Output `logs/stress-test-{ts}.{json,md}`. Erreurs capturées dans error-vault (source=STRESS_TEST). 0 finding sur Phases 1+2+4+5 après fix `supersede`.
- `feat(governance)` **CODE-MAP.md auto-généré** — knowledge graph 870 lignes / 38 KB régénéré par pre-commit hook husky dès qu'une entité structurelle est modifiée (Prisma, services, routers, pages, registry, sequences, intent-kinds). Contient table synonymes "mot du métier" ↔ "entité dans le code" anti-réinvention.
- `chore(scripts)` 5 npm scripts ajoutés : `stress:full`, `stress:pages`, `stress:forges`, `stress:state`, `codemap:gen`.
- `fix(brand-vault)` `supersede()` retournait l'oldAsset pré-update (state=ACTIVE) au lieu de post-update (state=SUPERSEDED). Détecté par stress-test.

## v5.4.10 — BrandVault unifié (Phase 10, ADR-0012) (2026-04-30)

**Vault de marque unifié — `BrandAsset` enrichi devient le réceptacle pour TOUS les actifs (intellectuels + matériels).**

- `feat(brand-vault)` `BrandAsset` enrichi : `kind` taxonomie 50+ canoniques (BIG_IDEA, CREATIVE_BRIEF, BRIEF_360, BRAINSTORM, CLAIM, MANIFESTO, KV_ART_DIRECTION_BRIEF, NAMING, POSITIONING, TONE_CHARTER, PERSONA, SUPERFAN_JOURNEY, SCRIPT, SOUND_BRIEF, KV_VISUAL, VIDEO_SPOT, AUDIO_JINGLE, etc.), `family` (INTELLECTUAL/MATERIAL/HYBRID), `state` machine (DRAFT→CANDIDATE→SELECTED→ACTIVE→SUPERSEDED→ARCHIVED), lineage hash-chain, batch (batchId/batchSize/batchIndex), versioning, supersession.
- `feat(brand-vault)` Service `brand-vault/engine.ts` : createBrandAsset, createCandidateBatch, selectFromBatch, promoteToActive, supersede, archive, kindFromFormat. Mapping FORMAT_TO_KIND (~80 outputFormats Glory tool → kind canonique).
- `feat(governance)` 4 Intent kinds : SELECT_BRAND_ASSET, PROMOTE_BRAND_ASSET_TO_ACTIVE, SUPERSEDE_BRAND_ASSET, ARCHIVE_BRAND_ASSET (+ SLOs).
- `feat(sequence-executor)` `executeGloryStep` patché : `depositInBrandVault` après chaque Glory tool — heuristique d'extraction de candidats (concepts/claims/prompts/names/...) → batch CANDIDATE auto, sinon DRAFT unique.
- `feat(ptah)` `reconcileTask` patché : promote AssetVersion en BrandAsset matériel.
- `feat(campaign)` `Campaign.active{BigIdea,Brief,Claim,Manifesto,KvBrief}Id` → BrandAsset.id pour suivi big-idea-active → brief actif → productions.
- `chore(governance)` `EXPERT-PROTOCOL.md` (devenu NEFER.md en v5.5.0) + suppression doublons `/cockpit/forges` et `/console/ptah`.
- `docs(adr)` ADR-0012 BrandVault unifié — justification rejet doublon SuperAsset standalone.

## v5.4.9 — Ptah Forge multimodale (Phase 9, ADR-0009/0010/0011) (2026-04-30)

**5ème Neter Ptah — matérialisation des briefs Artemis en assets concrets via providers externes.**

- `feat(neter)` **Ptah** = 5ème Neter actif (sous-système Propulsion, downstream Artemis). Démiurge égyptien créateur par le verbe — métaphore prompt→asset. Cascade Glory→Brief→Forge enforced.
- `feat(ptah)` 4 providers : Magnific (95% surface : image Mystic/Flux/NanoBananaPro/Imagen/Seedream + édition upscale/Relight/Style/Inpaint/Outpaint/ChangeCam/BG-removal + vidéo Kling/Veo/Runway/Hailuo/LTX/PixVerse/WAN/Seedance + audio TTS/voice-clone/SFX/lip-sync/SAM-isolation + icon + stock 250M+ + classifier), Adobe Firefly Services, Figma, Canva (gated par flag).
- `feat(ptah)` Mock fallback Magnific sans API key (picsum/sample) — démos client sans credentials.
- `feat(ptah)` 3 Intent kinds : PTAH_MATERIALIZE_BRIEF, PTAH_RECONCILE_TASK, PTAH_REGENERATE_FADING_ASSET.
- `feat(ptah)` Tables Prisma : GenerativeTask, AssetVersion, ForgeProviderHealth + Strategy.{manipulationMix, cultIndex, mixViolationOverrideCount}.
- `feat(governance)` Manipulation Matrix transverse (peddler/dealer/facilitator/entertainer) avec Mestor pre-flight `MANIPULATION_COHERENCE` gate + Thot ROI tables par mode.
- `feat(governance)` Téléologie : pillarSource obligatoire sur GenerativeTask, bayesian superfan_potential pre-flight, sentinel `PTAH_REGENERATE_FADING_ASSET` Loi 4.
- `feat(panthéon)` Imhotep (slot 6, ADR-0010, Phase 7+) + Anubis (slot 7, ADR-0011, Phase 8+) **pré-réservés** — plafond APOGEE = 7 atteint.
- `feat(governance)` Lineage hash-chain Glory→Brief→Forge : `executeTool` crée IntentEmission INVOKE_GLORY_TOOL, GloryToolDef étendu avec `forgeOutput?: ForgeSpec`.
- `feat(sequences)` Séquence ADS-META-CARROUSEL (Production T2) — 3 options ad copy + visuels Nano Banana via Ptah (push Meta = Anubis Phase 8+).
- `feat(landing)` Avatars + hero-bg ouest-africains (Unsplash License commercial).
- `chore(docs)` PANTHEON.md, MANIPULATION-MATRIX.md, ADR-0009/0010/0011 + alignement complet + purge `trio` / `quartet` + MAAT.md → archive/. 2 tests CI anti-drift + 3 audit scripts.

---

## v3.3.0 — Brief Ingest Pipeline (2026-04-10)

**Le systeme peut maintenant recevoir un brief client PDF et le transformer automatiquement en campagne + missions dispatchables.**

- `feat(console)` Brief Ingest UI — stepper 3 phases (Upload, Review, Execution)
- `feat(brief-ingest)` Service d'extraction LLM (PDF/DOCX/TXT + fallback OCR Vision)
- `feat(brief-ingest)` Brand Resolver avec fuzzy matching Levenshtein (dedup client)
- `feat(brief-ingest)` Mission Spawner — 1 Mission par livrable, auto-creation Drivers
- `feat(hyperviseur)` 5 nouveaux StepAgents : SEED_ADVE, SESHAT_ENRICH, CREATE_CAMPAIGN, SPAWN_MISSIONS, ARTEMIS_SUGGEST
- `feat(hyperviseur)` buildBriefIngestPlan() — plan d'orchestration NETERU pour briefs
- `feat(mission)` Endpoint `claim` — self-assign depuis le wall (freelance/agence)
- `feat(pillar-gateway)` BRIEF_INGEST ajoute a AuthorSystem
- Schemas Zod complets : ParsedBrief, deliverables, clientResolution, budget, timeline
- Flow Preview + Confirm : operateur review avant creation
- 2 options nouveau client : Fast Track vs Onboarding First
- Suggestion automatique de sequences Artemis (SPOT-VIDEO, SPOT-RADIO, KV, CAMPAIGN-360)

---

## v3.2.0 — Artemis Context System + Vault (2026-04-08)

**Artemis recoit un systeme de contexte 4 couches et le Vault devient operationnel.**

- `feat(artemis)` 4-layer context system — injection BRIEF pour sequences de campagne
- `feat(artemis)` Step types SEQUENCE + ASSET — systeme de combo/encapsulation
- `feat(artemis)` Sequence MASCOTTE + brand nature CHARACTER_IP
- `feat(artemis)` Sequence CHARACTER-LSI + 6 tools — Layered Semantic Integration
- `feat(vault)` Pipeline execution → vault — pre-flight + accept/reject
- `feat(vault)` Server-side pre-flight + page tools read-only
- `feat(console)` Skill Tree affiche les pipelines complets + selecteur de strategie
- `fix(cockpit)` ObjectCard affiche les valeurs, pas les cles + nouveaux renderers
- `fix(tests)` Alignement tests mestor-insights avec type ScenarioInput

---

## v3.1.0 — NETERU Architecture (2026-04-04)

**Naissance du Trio Divin : Mestor (decision), Artemis (protocole), Seshat (observation). Refonte complete de l'architecture.**

- `feat(neteru)` Oracle NETERU + Sequence Vault + Skill Tree + 9 sequences + 7 tools
- `feat(console)` NETERU UI — pages Mestor, Artemis, Oracle proposition + refonte home
- `feat(console)` Landing page NETERU + badge version + bouton home sidebar
- `feat(console)` Pages reelles : Skill Tree, Vault, Mestor (remplacement des stubs)
- `docs(v5.0)` CdC refonte complete — architecture NETERU

---

## v3.0.0 — Bible ADVERTIS + Design System (2026-03-31)

**134 variables ADVERTIS documentees. Systeme de renderers type-driven. LLM Gateway v2.**

- `feat(bible)` 100% coverage — 134 variables ADVERTIS documentees
- `feat(bible)` Tooltips sur champs vides + suppression Sources + LLM Gateway signature
- `feat(console)` Page annuaire variables — registre complet ADVERTIS
- `feat(bible)` Format bible + wire vault-enrichment
- `feat(design-system)` field-renderers.tsx — systeme visuel type-driven
- `feat(operator)` Full CRUD + creation operateurs licencies + allocation clients
- `feat(enrichir)` Pipeline 2 etapes — derivation cross-pillar + scan LLM focalise
- `fix` Migration callLLMAndParse vers nouvelle signature Gateway (champ caller)
- `fix` Import circulaire glory-tools/hypervisor ↔ neteru-shared/hyperviseur

---

## v2.5.0 — Glory Sequences + Deliverables (2026-03-25)

**31 sequences GLORY operationnelles. Export PDF des livrables. Viewer complet.**

- `feat(glory)` Refonte complete — 91 tools, 31 sequences, architecture 5 niveaux
- `feat(glory)` Sequence queue + deliverable compiler
- `feat(glory)` Mestor auto-complete pour combler les gaps
- `feat(glory)` Viewer resultats sequences — lecture + telechargement individuel
- `feat(glory)` Multi-brand supervisor view + passive pre-flight scan
- `feat(glory)` Per-sequence readiness scan + lancement individuel + liens resultats
- `feat(deliverables)` Sections cliquables + viewer contenu + export PDF
- `feat(oracle)` Territoire creatif via Glory BRAND pipeline
- `feat(oracle)` Wire Glory sequence branching pour enrichOracle
- `fix(rtis)` Empecher faux positifs staleness sur piliers RTIS fraichement generes

---

## v2.4.0 — Vault Enrichment + Cockpit Dense (2026-03-20)

**Enrichissement base sur le vault. Cockpit avec layout dense et renderers riches.**

- `feat` Vault-based enrichment + sources manuelles + dedup fix + recos UX
- `feat(enrichir)` Full vault scan → recommandations par variable
- `feat(cockpit)` Layout dense piliers avec grid, hierarchie, empties collapsibles
- `feat(cockpit)` Focus modal + tout accepter + cartes cliquables denses
- `feat(cockpit)` Champs vides in-situ + rendu objets profonds + panel recos review
- `feat(cockpit)` Renderers specialises : citation/accroche/description/publicCible
- `feat(seed)` ADVE 8/8 COMPLETE — 44 champs ajoutes au seed SPAWT
- `fix(enrichir)` Cross-pillar derivations + feedback toast + contrats derivables
- `fix(enrichir)` Types schema + ciblage champs vides dans vault enrichment
- `fix` Cles dot-notation plates + coercion types recos + challenge champs remplis

---

## v2.3.0 — Maturity Contracts + Scoring (2026-03-16)

**Contrats de completion par pilier. Scoring structurel. Auto-filler + gates de maturite.**

- `feat(maturity)` Pillar Completion Contract — fondation Phase 1
- `feat(scorer)` Contract-aware structural scoring — Phase 4
- `feat(maturity)` Auto-filler + maturity gate + endpoints tRPC — Phase 5
- `feat(maturity)` Unification pillar-director + hypervisor + cascade — Phase 6
- `refactor(schemas)` I = Potentiel/Catalogue, S = Strategie temporalisee
- `fix(bindings)` Zero orphelins, 77% couverture — Phase 3 complete

---

## v2.2.0 — v4 Deep Restructuration (2026-03-12)

**12 chantiers, 3 phases. Pillar Gateway, LLM Gateway, RTIS Protocols.**

- `feat(v4)` Deep restructuration — 12 chantiers, 3 phases
- `feat(cockpit)` Rich pillar renderers + page sources marque + migrations gateway
- `feat(gateway)` Migration router pillar.ts — toutes les ecritures via Gateway
- `feat(p1)` Persistence orchestration + fixes P&L + prisma generate
- `feat(cockpit)` Identity page refactoree + renderers riches + migration v4
- `feat(cockpit)` Tous les champs schema par pilier (remplis + vides)
- `feat(auto-filler)` Wire BrandDataSource comme source de verite avant LLM

---

## v2.1.0 — RTIS Granulaire + Oracle Enrichment (2026-03-05)

**Recommandations RTIS par champ. Oracle enrichi avec 21 sections et moteur Artemis.**

- `feat(rtis)` Recommandations CRUD granulaires + tracker debug Glory
- `feat(oracle)` Engine section-defaults — 21/21 complete avec vraies valeurs
- `feat(oracle)` enrichOracle exhaustif couvrant 12 sections avec prompts specialises
- `refactor(oracle)` Wire enrichOracle vers vrais frameworks Artemis
- `feat(oracle)` Feedback visuel live pendant execution Artemis
- `feat(berkus)` Integration profonde — equipe dirigeante, traction, MVP, IP
- `feat(budget)` Budget-to-Plan Allocator deterministe — zero improvisation LLM
- `feat(strategy)` Proposition Strategique — mini-site partageable, 13 sections

---

## v2.0.0 — Console + Cockpit + Creator (2026-02-20)

**3 portails operationnels. 49 pages console. Pipeline missions complet.**

- `feat(console)` M34 Console Portal (55→90) — 13 stubs fixes + 7 nouvelles pages
- `feat(cockpit)` M01 Cockpit — superfan northstar + identite ADVE + commentaires operateur
- `feat(cockpit)` M01 RTIS — cascade auto + page cockpit RTIS + recos par champ
- `feat(scorer)` M02 AdvertisVector & Scorer (70→95) — batch, snapshots, historique, cron
- `feat(campaign)` M04 Campaign Manager 360 (92→95) — alignement ADVE + devotion tracking
- `feat(pipeline)` M36 Pipeline Orchestrator (70→95) — scheduler auto + modele process
- `feat(operator)` Refactoring semantique : Client model + Console Agence
- `feat(auth)` Register, forgot/reset password + AI premium badge + middleware agence
- `feat(intake)` M35 — 4 methodes (long/short/ingest/ingest+), tooltips, save & quit

---

## v1.1.0 — MCP + Enrichments (2026-02-10)

**6 serveurs MCP. Creative Server AI-powered. Pipeline CRM.**

- `feat(mcp)` M28 MCP Creative Server (30→92) — handlers AI + 7 resources
- `feat(mcp)` M28 MCP Creative (92→95) — driver-linked + ADVE auto-injection
- `feat(intake)` M35 Quick Intake Portal (40→92) + M16 Engine (60→90) + M40 CRM (35→82)
- `feat(readme)` README.md complet du projet

---

## v1.0.0 — Foundation (2026-01-25)

**Premiere version fonctionnelle. Methodologie ADVE-RTIS, Campaign Manager, 42 modules.**

- `feat` Phase 2 complete — ADVE-RTIS process hardening + ingestion pipeline
- `feat` Campaign Manager 360 — 93 procedures, 130 action types
- 42 modules declares, score global 74/100
- Stack : Next.js 15, tRPC v11, Prisma 6, Claude API
- 3 portails (Console, Cockpit, Creator) + widget Intake
