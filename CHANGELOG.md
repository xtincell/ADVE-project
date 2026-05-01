# Changelog — La Fusee

Systeme de versionnage : **`MAJEURE.PHASE.ITERATION`**

- **MAJEURE** : Refonte architecturale ou changement de paradigme (v1 = fondation, v2 = modules, v3 = NETERU, ...)
- **PHASE** : Phase strategique du CdC (0 = fondation, 1 = enrichissement, 2 = intelligence, 3 = production, ...)
- **ITERATION** : Increment au sein d'une phase (fixes, features, polish)

> **Mise à jour OBLIGATOIRE par NEFER en Phase 6** — toute session qui ship un commit `feat(...)` ajoute une entrée ici. Cf. [docs/governance/NEFER.md](docs/governance/NEFER.md). Audit anti-drift : `scripts/audit-changelog-coverage.ts`.

---

## v5.8.0 — Phase 13 : Oracle 35-section sprint (in progress) (2026-05-01)

**Verrouillage du framework canonique Oracle dans une source unique de vérité, irrigation par les outils de tous les Neteru actifs, NSP streaming, Ptah forge à la demande. PR #25.**

Ce sprint étend l'Oracle de 21 à 35 sections : 21 actives (Phase 1-3 ADVERTIS) + 7 baseline Big4 (McKinsey/BCG/Bain/Deloitte) + 5 distinctives (Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis) + 2 dormantes (Imhotep/Anubis pré-réservés Oracle-stub).

### B10 — `docs(nefer)` CHANGELOG + 5 ADRs + 7-source propagation (Phase 13 closing)

Closing du sprint Oracle 35-section : 5 ADRs créés + propagation aux sources de vérité gouvernance (PANTHEON, LEXICON, REFONTE-PLAN).

**5 ADRs créés** :
- `docs/governance/adr/0014-oracle-35-framework-canonical.md` (NEW) — Lock framework canonique 35-section, partition CORE/BIG4/DISTINCTIVE/DORMANT, flag `_oracleEnrichmentMode`
- `docs/governance/adr/0015-brand-asset-kind-extension.md` (NEW) — Extension `BrandAsset.kind` +10 valeurs Phase 13 (non-cassante car String)
- `docs/governance/adr/0016-oracle-pdf-auto-snapshot.md` (NEW) — Auto-snapshot pre-export + idempotence SHA256
- `docs/governance/adr/0017-imhotep-partial-pre-reserve-oracle-only.md` (NEW) — Sortie partielle Imhotep Oracle-stub seulement
- `docs/governance/adr/0018-anubis-partial-pre-reserve-oracle-only.md` (NEW) — Sortie partielle Anubis Oracle-stub seulement

**Propagation 7 sources de vérité** (NEFER §3.3 anti-drift narratif) :
- `docs/governance/REFONTE-PLAN.md` — entry **Phase 13 — Sprint Oracle 35-section** avec table 10 batches B1-B10 + ADRs refs + tests créés (126 anti-drift)
- `docs/governance/LEXICON.md` — section **D-bis Phase 13** : Oracle 35-section framework canonical, BrandAssetKind extension, flag `_oracleEnrichmentMode`, PDF auto-snapshot, section dormante Oracle, Ptah forge button
- `docs/governance/PANTHEON.md` — section **4-bis Sortie partielle pré-réserve** : Imhotep + Anubis Oracle-stub, cap 7 BRAINS preserved, HORS scope strict, refs ADRs 0017/0018
- `CHANGELOG.md` — entry consolidée `v5.8.0 — Phase 13` (header au-dessus) avec sous-sections B1-B10
- `docs/governance/CODE-MAP.md` — auto-régénéré pre-commit (husky)
- `docs/governance/glory-tools-inventory.md` — auto-régénéré (111 tools)
- Memory user (~/.claude/...) — non modifiable depuis ce repo, à la charge du user post-merge

**Total tests anti-drift Phase 13** : 126 nouveaux (registry-completeness 14 + glory-tools 13 + sequences 17 + section-enrichment 11 + ui 14 + pdf-snapshot 15 + nsp-streaming 12 + ptah-forge 17 + imhotep-anubis-stubs 13).

**Total commits PR #26** : B1 + B2 + B3 + B3-bis + B4 + B5 + B6 + B7 + B8 + B9 + B10 = 11 commits cumulés.

**Verify final** : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed.

**Résidus non-bloquants** (à addresser post-merge) :
- Test d'intégration end-to-end du flag `_oracleEnrichmentMode` court-circuitant `chainGloryToPtah` avec mocks (sequence-executor + emit Ptah) — test structurel actuel vérifie présence du flag dans le source
- Full intentId capture depuis `enrichOracle.useMutation` nécessite refactor mutation pour retourner tôt avec intentId trackable (au lieu de await completion) — documenté dans le commentaire de la page proposition
- Visualisation taskId/AssetVersion produit dans section UI à enrichir post-merge (post-B10)
- DEVOTION-LADDER sequence reste en steps PLANNED (`superfan-journey-mapper` + `engagement-rituals-designer` à créer)
- Intent kinds `IMHOTEP_DRAFT_CREW_PROGRAM` + `ANUBIS_DRAFT_COMMS_PLAN` à enregistrer dans `intent-kinds.ts` (deferred — handlers actuellement appelables directement par sections UI)
- I18n FR uniquement pour ce sprint (clés t() à câbler post-merge sur PtahForgeButton + sections Phase 13)

### B9 — `feat(neteru)` Imhotep & Anubis Oracle-only stubs (sortie partielle pré-réserve)

**Sortie partielle de pré-réserve documentée** (ADRs 0017/0018) — Imhotep/Anubis exposent un handler stub Oracle-only pour produire les sections dormantes B5, sans modifier le panthéon Neteru. **Cap 7 BRAINS preserved** (Imhotep/Anubis restent pré-réservés dans BRAINS const, statut inchangé depuis Phase 9).

- `feat(neteru)` `src/server/services/imhotep/types.ts` (NEW) — `ImhotepDraftCrewProgramPayload`, `ImhotepCrewProgramPlaceholder` (status DORMANT_PRE_RESERVED + adrRefs ADR-0010 + ADR-0017). Documente HORS scope strict (pas de Prisma model, pas de page, pas de Glory tools propres, pas de notification center, pas de crew DB).
- `feat(neteru)` `src/server/services/imhotep/index.ts` (NEW) — `draftCrewProgram(payload)` retourne placeholder structuré avec status DORMANT + ADR refs. Optionnel : `sector` pour personnalisation. Activation Phase 7+ (matching talent, formation Académie).
- `feat(neteru)` `src/server/services/anubis/types.ts` (NEW) — `AnubisDraftCommsPlanPayload`, `AnubisCommsPlanPlaceholder` (ADR-0011 + ADR-0018). Mêmes invariants HORS scope que Imhotep.
- `feat(neteru)` `src/server/services/anubis/index.ts` (NEW) — `draftCommsPlan(payload)` retourne placeholder + ADR refs. Optionnel : `audience`. Activation Phase 8+ (broadcast paid + earned media, email/SMS/ad-networks).
- `test(governance)` `tests/unit/governance/oracle-imhotep-anubis-stubs-phase13.test.ts` (NEW) — 13 tests anti-drift verrouillent :
  - Imhotep handler retourne DORMANT_PRE_RESERVED + ADR-0010+0017 + sector-aware
  - Anubis handler retourne DORMANT_PRE_RESERVED + ADR-0011+0018 + audience-aware
  - **Scope strict** : ≤ 3 fichiers par service, types.ts mentionne "cap 7 BRAINS" + "HORS scope strict"
  - **Cap 7 BRAINS preserved** : BRAINS const contient toujours 5 actifs (M/A/S/T/P) + 2 pré-réservés (I/A) + INFRASTRUCTURE — inchangé par B9
  - Manifest core n'importe PAS les services imhotep/anubis (no activation runtime via core)
  - **Anti-doublon NEFER §3** : schema.prisma ne définit AUCUN model Imhotep/Anubis/CrewProgram/CommsPlan

Verify : tsc --noEmit exit 0 ; vitest 56 files / 922 tests passed (909 base + 13 nouveaux).

APOGEE — Sous-systèmes Crew Programs (Ground #6) Imhotep + Comms (Ground #7) Anubis.
Sortie partielle Oracle-only documentée par 2 ADRs dédiés (ADR-0017 Imhotep, ADR-0018
Anubis — créés en B10). Activation complète Phase 7+ (Imhotep) / Phase 8+ (Anubis)
hors scope sprint actuel.

### B8 — `feat(oracle)` Ptah on-demand forge buttons (4 sections distinctives, ADR-0014)

- `feat(neteru)` `src/components/neteru/ptah-forge-button.tsx` (NEW) — composant `<PtahForgeButton>` avec primitives DS Phase 11 (`Button` + `Dialog` + `Spinner` + `Tag`) + dialog confirm + `useToast` notifications. Pattern : click → confirm dialog → mutation tRPC → toast success/warning/error selon `result.status` (OK / VETOED / FAILED).
- `feat(trpc)` `strategyPresentation.forgeForSection` (NEW route) — `governedProcedure({kind: "PTAH_MATERIALIZE_BRIEF", preconditions: ["RTIS_CASCADE"]})`. Lit le BrandAsset DRAFT créé par B4 writeback, construit ForgeBrief (briefText + forgeSpec + pillarSource + manipulationMode), émet via `mestor.emitIntent` cascade hash-chain f9cd9de complète. **Réutilise PTAH_MATERIALIZE_BRIEF existant** — cap 7 BRAINS respecté, aucun nouveau Intent kind.
- `feat(ui)` 4 boutons forge câblés dans les sections distinctives :
  - `BcgPortfolio` → "Forger Portfolio Figma" (forgeKind: design, providerHint: figma, modelHint: deck, brandAssetKind: BCG_PORTFOLIO)
  - `Mckinsey3Horizons` → "Forger 3-Horizons Deck" (design/figma/deck, MCK_3H)
  - `ManipulationMatrix` → "Forger visualisation Matrix" (image/magnific/nano-banana-pro, MANIPULATION_MATRIX)
  - `ImhotepCrewProgramDormant` → "Forger badge crew (placeholder)" (icon, GENERIC)
- `feat(ui)` `presentation-layout.tsx` — `SECTION_COMPONENTS` typage étendu pour passer `strategyId={doc.meta.strategyId}` à chaque composant (nécessaire pour les boutons forge).
- `feat(ui)` `phase13-sections.tsx` — `Props` Phase 13 étendu avec `strategyId?: string` optionnel. Boutons forge gated par `strategyId &&` (no render si missing — replay/share token cases).
- `test(governance)` `tests/unit/governance/oracle-ptah-forge-phase13.test.ts` (NEW) — 17 tests anti-drift verrouillent : PtahForgeButton primitives + tRPC + toast + props 6 fields + dialog confirm pattern, route forgeForSection avec governedProcedure + PTAH_MATERIALIZE_BRIEF (réutilisé) + RTIS_CASCADE precondition + state DRAFT query + emitIntent cascade, 4 sections distinctives ont chaque le bon mapping forgeKind/providerHint/brandAssetKind, **cap 7 BRAINS preserved** (pas de nouveau Intent kind type IMHOTEP_FORGE/ANUBIS_FORGE/FORGE_FOR_SECTION).

Verify : tsc --noEmit exit 0 ; vitest 55 files / 909 tests passed (892 base + 17 nouveaux).

APOGEE — Sous-système Propulsion (Mission #1) — Ptah Forge phase de matérialisation
downstream Artemis. Loi 3 (carburant) : Thot CHECK_CAPACITY pre-flight via
governedProcedure. Pilier 4 (Pre-conditions) : RTIS_CASCADE gate. Cascade
hash-chain Glory→Brief→Forge f9cd9de complète (oracleEnrichmentMode=false hors
enrichissement = comportement par défaut).

Résidus : i18n FR uniquement pour ce sprint (clés t() à câbler post-merge).
Visualisation taskId/AssetVersion produit dans la section UI à enrichir post-B10.

### B7 — `feat(oracle)` NSP streaming tracker 35-section + tier groups + page wiring

- `feat(neteru)` `src/components/neteru/oracle-enrichment-tracker.tsx` — étendu de **21 → 35 sections** avec **tier groups** (CORE 21 / BIG4_BASELINE 7 / DISTINCTIVE 5 / DORMANT 2). Chaque tier affiche son label + `Badge` count `done/total`. Liste sections par tier avec `meta.number` + `id` + tooltip `title="number — title (status)"`.
- `feat(neteru)` Tracker consume `useNeteruIntent(intentId)` (NSP SSE) pour streaming live. **NSP events priorité** sur `completenessReport` (real-time override).
- `feat(neteru)` Nouvelle prop optionnelle `completenessReport?: Record<string, "complete"|"partial"|"empty">` — **fallback polling-based** pour callers qui n'ont pas encore le full intentId capture (mécanisme transitoire B7+ post-merge).
- `feat(cockpit)` `src/app/(cockpit)/cockpit/brand/proposition/page.tsx` — câble `<OracleEnrichmentTracker>` avec `completenessReport={completeness.data}` (polling 3s existant alimente fallback). Le tracker affiche désormais les 35 sections groupées par tier dans le bloc Artemis control.
- `test(governance)` `tests/unit/governance/oracle-nsp-streaming-phase13.test.ts` (NEW) — 12 tests anti-drift verrouillent : SECTION_REGISTRY import, SectionTier type, useNeteruIntent NSP, TIER_LABEL 4 tiers (Core 21 / Big4 7 / Distinctifs 5 / Dormants 2), grouping byTier, completenessReport prop fallback, status mapping (complete→done, partial→in-progress), NSP override priority, page proposition import + render + commentaire B7.

Verify : tsc --noEmit exit 0 ; vitest 54 files / 892 tests passed (880 base + 12 nouveaux).

APOGEE — Sous-système Telemetry (Mission #3). Pilier 5 (Streaming) : NSP SSE
wired via `useNeteruIntent` hook. Pattern obligatoire (mutation > 300ms = composant Neteru UI Kit) respecté.

Résidus : full **intentId capture** depuis `enrichOracle.useMutation` nécessite refactor de la mutation pour retourner tôt avec un intentId trackable (au lieu de `await` la completion). Documenté dans le commentaire de la page proposition. À faire post-merge B10 (refactor architectural plus profond, hors scope sprint actuel).

### B6 — `fix(oracle)` Live PDF export via auto-snapshot pre-export (ADR-0016)

- `fix(oracle)` `export-oracle.ts loadOracle()` — **bug fix critique** : retournait `[]` quand pas de `snapshotId` (ligne 51-52 legacy), ce qui produisait des PDFs/Markdown/snapshots vides en live state. Désormais appelle `assemblePresentation` (dynamic import pour éviter cycle) et map les 35 sections via `SECTION_REGISTRY` + `SECTION_DATA_MAP` interne.
- `feat(oracle)` `export-oracle.ts takeOracleSnapshot()` — **idempotence SHA256** (ADR-0016) :
  - Calcule `createHash("sha256")` sur le content live
  - Query last snapshot ordonné `takenAt desc`
  - Si `_contentHash` du dernier snapshot === hash live → réutilise `snapshotId` (return `{ snapshotId, created: false, reusedFrom }`)
  - Sinon crée nouveau snapshot avec `_contentHash` stocké dans `snapshotJson` (future idempotence)
- `feat(oracle)` helper NEW `ensureSnapshotForExport(strategyId, opts)` — auto-snapshot pre-export :
  - Si `opts.snapshotId` déjà set → return tel quel (replay déterministe)
  - Sinon → `takeOracleSnapshot` + retourne avec snapshotId
- `feat(oracle)` `exportOracleAsPdf` + `exportOracleAsMarkdown` — appellent `ensureSnapshotForExport` avant `loadOracle`. PDF/Markdown post-export ne peut plus être vide. Header PDF affiche désormais `Snapshot ${snapshotId}` au lieu de `Live state` (toujours snapshot après B6).
- `test(governance)` `tests/unit/governance/oracle-pdf-snapshot-phase13.test.ts` (NEW) — 15 tests anti-drift :
  - loadOracle import assemblePresentation + utilise SECTION_REGISTRY
  - SHA256 + createHash from node:crypto
  - orderBy `takenAt desc` (corrigé du faux `createdAt` initial)
  - Reuse snapshotId si content hash match
  - `_contentHash` stocké dans snapshotJson
  - Return `{ snapshotId, created, reusedFrom? }`
  - ensureSnapshotForExport wrapper appelé par les 2 export functions

Verify : tsc --noEmit exit 0 ; vitest 53 files / 880 tests passed (865 base + 15 nouveaux).

APOGEE — Sous-système Telemetry (Mission #3). Loi 1 (altitude) : snapshot
pre-export = preserve l'état exact ; idempotence SHA256 = pas de duplication.

Résidus : test d'intégration end-to-end (mock db.oracleSnapshot + assemblePresentation
puis vérifier idempotence sur 2 calls successifs) — viendra avec B10 audit final.

### B5 — `feat(oracle)` UI 14 new sections + dormancy badges (DS Phase 11 strict)

- `feat(ui)` `src/components/strategy-presentation/sections/phase13-sections.tsx` (NEW) — fichier consolidé exportant 14 composants Phase 13 (7 BIG4 + 5 DISTINCTIVE + 2 DORMANT). DS Phase 11 strict (3 interdits respectés) :
  - Composition primitives uniquement (`Card`, `CardHeader`, `CardBody`, `Badge`, `Banner`, `Heading`, `Text`, `Stack`, `Grid`, `Separator`, `Progress`, `Tag`)
  - CVA `phase13SectionVariants` pour le tier (BIG4_BASELINE / DISTINCTIVE / DORMANT) — pas de `.join(" ")` inline
  - Tokens cascade Component + Domain (`var(--card-*)`, `var(--space-*)`, `var(--opacity-dormant)`) — aucun `var(--ref-*)` direct
  - Aucune classe Tailwind couleur brute (`text-zinc-*`, `bg-violet-*`, hex direct)
  - Helpers `SectionShell`, `SectionTierBadge`, `EmptyState`, `KeyValueGrid` partagés
- `feat(ui)` Sections distinctives :
  - `CultIndex` : score + tier badge + breakdown components avec progress bars
  - `ManipulationMatrix` : grid 4 modes (peddler/dealer/facilitator/entertainer) + Banner annonçant le forge button B8
  - `OvertonDistinctive` : axes culturels avec position actuelle → cible APOGEE + manœuvres
  - `TarsisWeakSignals` : list signaux faibles + badges category/horizon/action + impact score
  - `DevotionLadder` : placeholder data dump (séquence DEVOTION-LADDER PLANNED, refactor B5+ post-merge)
- `feat(ui)` Sections Big4 baseline : data-dense neutre — `Mckinsey7s` (7 dimensions cards), `BcgPortfolio` (4 quadrants grid + health score progress), `BainNps` (score + drivers), `Mckinsey3Horizons` (H1/H2/H3 cards + allocation tags), `BcgStrategyPalette`, `DeloitteGreenhouse`, `DeloitteBudget` (KeyValueGrid).
- `feat(ui)` Sections dormantes : `ImhotepCrewProgramDormant` + `AnubisCommsDormant` — Banner `info` rappelant **cap 7 BRAINS respecté**, références ADRs 0010+0017 (Imhotep) / 0011+0018 (Anubis), opacity-dormant token.
- `feat(ui)` `presentation-layout.tsx` — imports + 14 entries dans `SECTION_COMPONENTS` + 14 entries `SECTION_DATA_MAP` (sectionId direct, pas de remap camelCase pour Phase 13).
- `test(governance)` `tests/unit/governance/oracle-ui-phase13.test.ts` (NEW) — 14 tests anti-drift verrouillent :
  - 14 composants exportés depuis phase13-sections.tsx
  - 14 imports + 14 entries SECTION_COMPONENTS dans presentation-layout
  - **DS Phase 11 compliance** : zéro classe Tailwind couleur brute (regex pattern matching `text-zinc-*` etc.), zéro `var(--ref-*)`, zéro hex dans className, CVA `phase13SectionVariants` déclaré, primitives canonicales importées
  - Dormants → ADR refs (0010/0017 + 0011/0018) + cap 7 BRAINS mention 2x
  - Distinctifs → ManipulationMatrix mentionne 4 modes peddler/dealer/facilitator/entertainer

Verify : tsc --noEmit exit 0 ; vitest 52 files / 865 tests passed (851 base + 14 nouveaux oracle-ui-phase13).

Résidus : `DevotionLadder` est un placeholder (séquence DEVOTION-LADDER avec steps PLANNED — `superfan-journey-mapper`/`engagement-rituals-designer` à créer post-merge).

### B4 — `feat(oracle)` SECTION_ENRICHMENT 35 + BrandAsset promotion writeback + flag `_oracleEnrichmentMode` câblé

- `feat(oracle)` `enrich-oracle.ts` — `SectionEnrichmentSpec` étendu avec 3 champs Phase 13 :
  - `_glorySequence?: string` — séquence Phase 13 à exécuter (court-circuite frameworks Artemis classiques)
  - `_brandAssetKind?: string` — kind cible pour la promotion BrandAsset post-séquence
  - `_isDormant?: boolean` — sections Imhotep/Anubis (handler stub Oracle-only B9)
- `feat(oracle)` `enrich-oracle.ts SECTION_ENRICHMENT` — **+14 entries Phase 13** :
  - 7 BIG4 baseline (mckinsey-7s, bcg-portfolio, bain-nps, deloitte-greenhouse, mckinsey-3-horizons, bcg-strategy-palette, deloitte-budget) → séquences B3 + writeback `pillar.content`
  - 5 DISTINCTIVE (cult-index, manipulation-matrix, devotion-ladder, overton-distinctive, tarsis-weak-signals) → réutilise services SESHAT existants via Glory tools
  - 2 DORMANT (imhotep-crew-program-dormant, anubis-comms-dormant) → handler stub B9 retourne placeholder
- `feat(oracle)` `enrich-oracle.ts` helpers (NEW) :
  - `promoteSectionToBrandAsset()` — promotion BrandAsset post-séquence avec **idempotence** (strategyId, kind, state) :
    - Si BrandAsset state=ACTIVE existe → SKIP (**Loi 1 altitude** — pas de régression)
    - Si BrandAsset state=DRAFT existe → UPDATE content (replay safe)
    - Sinon → CREATE BrandAsset family=INTELLECTUAL state=DRAFT
  - `applySectionWriteback()` — wrapper `pillar-gateway.writePillar` avec validation pillar key A/D/V/E/R/T/I/S
- `feat(oracle)` `enrichAllSections()` — **flag `_oracleEnrichmentMode: true`** passé à `executeSequence(key, strategyId, { _oracleEnrichmentMode: true })` (sequence-executor B3) → `chainGloryToPtah` court-circuité. **Ptah à la demande respecté** (les forgeOutput de creative-evaluation-matrix, bcg-portfolio-plotter, mckinsey-3-horizons-mapper ne se déclenchent PAS pendant enrichOracle — ils restent disponibles via boutons "Forge now" B8).
- `feat(oracle)` import canonical `@/server/services/artemis/tools/sequence-executor` (au lieu du legacy `@/server/services/glory-tools` qui re-exportait via dynamic capability check). Gestion d'erreur structurée (fallback BRANDBOOK-D legacy preservé).
- `feat(oracle)` counts hardcodés mis à jour 21 → 35 (finalScore, finalComplete, messages "Oracle complet").
- `test(governance)` `tests/unit/governance/oracle-section-enrichment-phase13.test.ts` (NEW) — 11 tests anti-drift verrouillent :
  - 14 sections Phase 13 déclarées dans SECTION_ENRICHMENT
  - Chaque entry → _glorySequence valide dans ALL_SEQUENCES (parité B3↔B4)
  - Chaque entry → _brandAssetKind valide dans BrandAssetKind enum (parité B1↔B4)
  - SECTION_REGISTRY.brandAssetKind === SECTION_ENRICHMENT._brandAssetKind (anti-drift transverse)
  - Dormantes → _isDormant: true + brandAssetKind GENERIC + sequenceKey IMHOTEP-CREW/ANUBIS-COMMS
  - promoteSectionToBrandAsset déclaré avec Loi 1 altitude check + idempotence findFirst/update/create
  - executeSequence appelée avec `{ _oracleEnrichmentMode: true }` (flag Ptah à la demande)
  - import depuis canonical path artemis/tools/sequence-executor

Verify : tsc --noEmit exit 0 ; vitest 51 files / 851 tests passed (840 base + 11 nouveaux B4).

Résidus : test d'intégration **end-to-end** du flag _oracleEnrichmentMode court-circuitant chainGloryToPtah avec mocks (sequence-executor + emit Ptah) — à faire avant merge final B10. Test structurel B4 vérifie présence du flag dans le code source.

### B3-bis — `fix(artemis)` Phase 13 tools layer DC (was BRAND) + tests count adjusted

CI failure post-B3 push : `tests/unit/services/glory-tools.test.ts` attendait `getBrandPipeline()` à 10 tools (visual identity pipeline historique terminant par `brand-guidelines-generator`). Mes 5 tools Phase 13 mis en `layer: "BRAND"` cassaient le pipeline (15 au lieu de 10). Reclassement vers `layer: "DC"` (Direction de Création — analyses stratégiques, evaluation/architecture/presentation), cohérent sémantiquement (McKinsey 7S, BCG Portfolio, 3-Horizons, Overton, Cult Index sont des analyses, pas du visual identity).

- `fix(artemis)` `phase13-oracle-tools.ts` : 5 tools BRAND→DC (mckinsey-7s-analyzer, bcg-portfolio-plotter, mckinsey-3-horizons-mapper, overton-window-mapper, cult-index-scorer). Nouveau total Phase 13 : 7 DC tools (0 BRAND).
- `fix(tests)` `tests/unit/services/glory-tools.test.ts` : counts mis à jour (40→47 total, DC 9→16).
- `fix(tests)` `tests/unit/governance/oracle-glory-tools-phase13.test.ts` : assertions layer 5 BRAND + 2 DC → 0 BRAND + 7 DC.

Verify : vitest 840/840 passed (50 files), getBrandPipeline() 10 tools intact.

### B3 — `feat(artemis)` 14 new Glory sequences + flag oracleEnrichmentMode (Ptah à la demande)

- `feat(artemis)` `src/server/services/artemis/tools/phase13-oracle-sequences.ts` (NEW) — 14 séquences Phase 13 :
  - **7 Big4 baseline** : MCK-7S (tier 3), BCG-PORTFOLIO (tier 3, forgeOutput design/Figma manuel B8), BAIN-NPS (tier 2), DELOITTE-GREENHOUSE (tier 3), MCK-3H (tier 4, forgeOutput design/Figma manuel B8), BCG-PALETTE (tier 3), DELOITTE-BUDGET (tier 5).
  - **5 Distinctifs** : CULT-INDEX (invoke cult-index-engine SESHAT), MANIP-MATRIX (forgeOutput image/Banana manuel B8), DEVOTION-LADDER (steps planned — refactor B5+), OVERTON-DISTINCTIVE, TARSIS-WEAK (invoke seshat/tarsis).
  - **2 Dormantes** : IMHOTEP-CREW (tier 0, steps PLANNED), ANUBIS-COMMS (tier 0, steps PLANNED) — handlers stubs Oracle-only B9 + ADRs 0017/0018.
- `feat(artemis)` `sequences.ts` — extension `GlorySequenceKey` (+14 keys) + `GlorySequenceFamily` (+3 valeurs ORACLE_BIG4/ORACLE_DISTINCTIVE/ORACLE_DORMANT). Intégration `PHASE13_ORACLE_SEQUENCES` dans `ALL_SEQUENCES` (préserve rétro-compat `getSequence()`).
- `feat(artemis)` `sequence-executor.ts` — **flag `_oracleEnrichmentMode`** dans `SequenceContext` court-circuite `chainGloryToPtah` durant `enrichAllSectionsNeteru()` (B4). Hors enrichissement Oracle, cascade Glory→Brief→Forge hash-chain f9cd9de complète préservée. Doc explicite des flags internes `_*` reconnus (Phase 9 → Phase 13).
- `test(governance)` `tests/unit/governance/oracle-sequences-phase13.test.ts` (NEW) — 17 tests anti-drift verrouillent : 14 séquences ACTIVE/PLANNED, intégration `ALL_SEQUENCES`, résolution `getSequence()`, families correctes, requires Loi 2 séquencement (MANIP-MATRIX requires MANIFESTE-A + PLAYBOOK-E), dormantes tier 0 sans requires + steps PLANNED uniquement.

Verify : tsc --noEmit exit 0 ; vitest run tests/unit/governance/ 17 files / 118 tests passed (88+13+17 nouveaux).

Résidus : test d'intégration du flag `_oracleEnrichmentMode` court-circuitant `chainGloryToPtah` viendra avec B4 (mocking sequence-executor + emit Ptah).

### B2 — `feat(artemis)` 7 new Glory tools + 3 extended for Oracle 35-section production

- `feat(artemis)` `src/server/services/artemis/tools/phase13-oracle-tools.ts` (NEW) — 7 nouveaux Glory tools (5 BRAND + 2 DC) : `mckinsey-7s-analyzer`, `bcg-portfolio-plotter` (forgeOutput design/Figma), `bain-nps-calculator`, `mckinsey-3-horizons-mapper` (forgeOutput design/Figma), `overton-window-mapper`, `cult-index-scorer` (invoque cult-index-engine SESHAT existant), `tarsis-signal-detector` (invoque seshat/tarsis weak signals existant). Anti-doublon NEFER §3 : zéro `new XxxEngine()` — tout via mestor.emitIntent().
- `feat(artemis)` `src/server/services/artemis/tools/registry.ts` — intégration `PHASE13_ORACLE_TOOLS` dans `CORE_GLORY_TOOLS` (préserve rétro-compat `getGloryTool()` + `getToolsByLayer()`). 104 → 111 tools indexés.
- `feat(artemis)` `creative-evaluation-matrix` (extended in-place) — ajout dimension Manipulation Matrix (4 modes peddler/dealer/facilitator/entertainer) + `forgeOutput` image/Banana pour visualisation matrice (bouton manuel B8 sur section manipulation-matrix). Pendant `enrichOracle` (B4), flag `oracleEnrichmentMode: true` court-circuite l'auto-trigger Ptah.
- `feat(artemis)` `strategic-diagnostic` (extended in-place) — ajout templates `mckinsey-7s` et `overton` (input `framework: 'classic' | 'mckinsey-7s' | 'overton'`).
- `feat(artemis)` `insight-synthesizer` (extended in-place) — Tarsis weak signals integration (input `tarsis_signals` via `t.signauxFaibles`, JEHUTY_FEED_REFRESH side-effect côté caller).
- `chore(scripts)` `scripts/inventory-glory-tools.ts` — étend le scanner pour inclure `phase13-oracle-tools.ts` (mécanisme extensible aux futures Phase X).
- `test(governance)` `tests/unit/governance/oracle-glory-tools-phase13.test.ts` (NEW) — 13 tests anti-drift verrouillent : 7 tools ACTIVE, intégration `CORE_GLORY_TOOLS`, résolution `getGloryTool()`, 3 forgeOutput cohérents (BCG Figma, 3-Horizons Figma, Manipulation Matrix Banana), 2 invocations services existants (cult-index-engine + tarsis), partition 5 BRAND + 2 DC, slugs/orders uniques.

Verify : tsc --noEmit exit 0, vitest 88/88 governance tests passed (15 files), `npm run glory:inventory` 111 tools indexés.

### B1 — `feat(oracle)` SECTION_REGISTRY 21→35 + BrandAsset.kind +10 + canonical framework lock

- `feat(domain)` `src/domain/brand-asset-kinds.ts` (NEW) — source unique TS de la taxonomie `BrandAsset.kind` (~50 kinds Phase 10 + 10 ajouts Phase 13). Export `BRAND_ASSET_KINDS` const, type `BrandAssetKind`, validateur `isBrandAssetKind`, helper `PHASE_13_BRAND_ASSET_KINDS`.
- `feat(oracle)` `src/server/services/strategy-presentation/types.ts` — `SectionMeta` étendu avec `tier` (CORE/BIG4_BASELINE/DISTINCTIVE/DORMANT), `brandAssetKind`, `sequenceKey`, `isDormant`, `isDistinctive`, `isBaseline`. `SECTION_REGISTRY` étendu de 21 → 35 entries. Helpers `getSectionMeta`, `getSectionsByTier`, `ORACLE_SECTION_BRAND_ASSET_KINDS`.
- `feat(prisma)` `prisma/schema.prisma:880` — commentaire BrandAsset.kind documenté avec les 10 kinds Phase 13 (extension non-cassante car `String @default`).
- `test(governance)` `tests/unit/governance/oracle-registry-completeness.test.ts` (NEW) — 14 tests anti-drift verrouillent : 35 sections, partition tiers (21+7+5+2), unicité ids, séquentialité numbers 01..35, validité brandAssetKind, flags cohérents, dormants (Imhotep/Anubis) avec brandAssetKind GENERIC.

Verify : tsc --noEmit exit 0, `vitest run tests/unit/governance/` 88/88 passed (15 files).

---

## v5.7.1 — Phase 12.2 : Prisma 6 → 7 (driver adapter @prisma/adapter-pg) (2026-04-30)

**Closure de la dernière dette Phase 12. Prisma 7 absorbé avec son breaking change `url`→`adapter`.**

- `feat(deps)` `prisma 6.4 → 7.8.0` + `@prisma/client 6.4 → 7.8.0` + nouveau dep `@prisma/adapter-pg ^7.8.0`.
- `feat(prisma)` `prisma/schema.prisma` : retire `url = env("DATABASE_URL")` du datasource block (breaking Prisma 7) — la connection string est désormais passée au runtime via `PrismaPg` adapter dans `src/lib/db.ts`.
- `feat(db)` `src/lib/db.ts` : refactor `createPrismaClient()` pour instancier `new PrismaPg({ connectionString })` puis `new PrismaClient({ adapter })`. Throws explicit si `DATABASE_URL` absente — les seeds + workers Vercel posent déjà cette env.
- `feat(scripts)` `scripts/migrate-prisma-7-clients.ts` (one-shot, idempotent) — patch automatique de 23 seeds + scripts CLI qui instanciaient `new PrismaClient()` directement. Inject l'import `PrismaPg` + factory `makeClient()` + remplace `new PrismaClient()` → `makeClient()`.
- `chore(test)` `vitest.config.ts` : injecte `DATABASE_URL` stub dans `test.env` car le driver adapter exige une string au moment de l'import (les tests mockent les queries mais pas l'instantiation).

Verify : tsc --noEmit exit 0, vitest 47 files / 796 tests passed (7s), `prisma validate` OK, `next build` 165 routes générées.

**Phase 12 complète** : next 16 + react 19.2.5 + eslint 10 + prisma 7 tous absorbés. Reste 0 PR Dependabot ouverte sur le repo.



## v5.7.0 — Phase 12 : next 16 + react 19.2.5 + eslint 10 + polish (2026-04-30)

**Suite directe v5.6.3. Phase 12 partielle : majors next 16 / eslint 10 absorbés, prisma 7 reporté (breaking URL→adapter).**

- `feat(deps)` `next 15.3 → 16.2.4` + `react/react-dom 19.1 → 19.2.5`. Breaking changes traités :
  - `experimental.reactCompiler: true` → `reactCompiler: true` (stabilisé top-level).
  - `next lint` retiré → `npm run lint` migré vers `eslint --config eslint.config.mjs 'src/**/*.{ts,tsx}'` direct.
  - tsconfig `jsx: "preserve"` → `"react-jsx"` (auto-régen par next typegen, intentionnel).
  - Build production validé : 165 routes générées, 0 erreur.
- `feat(deps)` `eslint 9 → 10` + `eslint-config-next 15 → 16` + `eslint-plugin-boundaries 5 → 6`. Aucun changement code, 0 errors / 258 warnings (pré-existants strangler).
- `chore(deps)` Prisma 7 testé puis reverted. Breaking change : `url = env("DATABASE_URL")` n'est plus supporté dans schema.prisma — exige refonte du DB layer (adapter dans `prisma.config.ts`) + tests E2E sur DB live. Reporté dans une PR dédiée Phase 12.2 future.
- `feat(images)` `next.config.ts` ajoute `images.remotePatterns` pour les 6 domaines Ptah forge providers (picsum.photos, cdn.freepik, api.freepik, api.magnific, cdn.magnific, googleapis BBB). Migration `<img>` → `<Image>` dans `ptah-asset-library.tsx` + `ptah-forge-runner.tsx` (avec `unoptimized` car URLs dynamiques).
- `perf(quick-intake)` `question-bank.ts` short-circuit `generateAiFollowUps` quand aucune env LLM n'est configurée. Évite 24s de retry timeouts par test sans `ANTHROPIC_API_KEY`. **78s → 13ms** sur la suite quick-intake (×6000).
- `feat(i18n)` `src/lib/i18n/use-t.ts` — hook client-side `useT()` qui retourne `t()` bound à la locale détectée navigator. Wiring composants `marketing-*.tsx` à faire dans une PR follow-up dédiée (markup éditorial complexe avec `<strong>`, `<em>`, structures imbriquées, risque de casse sans navigateur).

**Verify** : tsc --noEmit exit 0, vitest 47 files / 796 tests passed (6.88s vs 79s pré-short-circuit), `next build` 165 routes générées, lint 0 errors.

**Résidus reporting** :
- Prisma 7 : breaking URL→adapter, exige PR dédiée + DB live tests.
- i18n wiring composants marketing : 14 composants × ~50 strings, refactor mécanique mais risqué sans validation visuelle, PR follow-up.

## v5.6.3 — Tier 2.1 promotion individuelle : 293 mutations → Intent kinds dédiés (2026-04-30)

**Le 100% littéral. Les 293 mutations strangler ont chacune désormais leur Intent kind dédié + SLO. Plus aucune `LEGACY_MUTATION` synthétique anonyme — chaque mutation porte un nom canonique et est traçable individuellement dans le dashboard governance.**

- `feat(governance)` `scripts/generate-legacy-intent-kinds.ts` + `npm run gen:legacy-intent-kinds` — parse les 75 routers strangler, extrait les 293 mutations, génère :
  - Une Intent kind dédiée `LEGACY_<ROUTER>_<MUTATION>` par mutation, injectée dans `intent-kinds.ts` entre marqueurs `AUTOGEN`.
  - Un SLO default (5s p95 / 5% error / 0$ cost) par kind dans `slos.ts`.
  - Idempotent : régénère depuis zéro à chaque run, ne touche que la zone autogen.
- `feat(governance)` `auditedProcedure` détecte automatiquement le kind dédié via `buildLegacyKind(routerName, path)` et l'utilise si registered, sinon fallback `LEGACY_MUTATION`. **Aucun changement aux 75 routers**.
- `chore(governance)` régen `INTENT-CATALOG.md` : 56 → **349 kinds** documentés.

**Impact doctrinal final** :
- Chaque mutation a maintenant un audit trail nominal (filtrer par kind dans le dashboard governance, debug per-mutation, SLO custom possible).
- L'historique strangler `LEGACY_MUTATION` reste valide (rétro-compat), les nouveaux émissions utilisent le kind dédié.
- Les 5 Pillar 4+6 gates de v5.6.2 s'appliquent désormais avec un kind sémantique précis.

Verify : tsc --noEmit exit 0, vitest tests/unit/governance/ → 14 files / 74 tests passed, INTENT-CATALOG.md = 349 kinds.

## v5.6.2 — Tier 2.1 atteint structurellement : auditedProcedure auto-applique Pillar 4 + 6 (2026-04-30)

**Le 1% restant fermé sans 314 micro-promotions. Approche structurelle : un seul changement dans `auditedProcedure` propage Pillar 4 + 6 à tous les LEGACY_MUTATION qui passent par un router dont le nom matche un manifest. Score 99% → 100%.**

- `feat(governance)` `auditedProcedure` étendu (`src/server/governance/governed-procedure.ts`) :
  - Auto-resolve un manifest "primary service" depuis le `routerName` via `getManifest()` avec fallback sur les conventions de naming (`<name>-gateway`, `<name>-engine`, `<name>-service`).
  - Si manifest trouvé + capability représentative (la plus chère) déclare `preconditions[]` → applique Pillar 4 (assertReadyFor) avec véto loud sur `ReadinessVetoError`.
  - Si capability représentative déclare `costEstimateUsd > 0` → applique Pillar 6 (assertCostGate) avec persistance `CostDecision` et véto sur `CostVetoError`.
  - Comportement inchangé pour les routers sans manifest match : synthetic IntentEmission row (audit trail seul, comportement pré-9.x).
- `feat(governance)` `getRawInput()` consommé en middleware (trpc 11.17 API) → l'IntentEmission row porte enfin l'input réel et non `{}`. Bonus collateral : meilleur audit trail pour les 314 mutations LEGACY_MUTATION.

**Impact doctrinal** :
- Avant : 67 routers strangler × ~314 mutations émettaient `LEGACY_MUTATION` sans aucun gate.
- Après : tout router dont le nom matche un manifest hérite **automatiquement** de la gouvernance complète. Pas de migration individuelle nécessaire.
- Le plan d'attaque `legacy-mutation-promotion-plan.md` reste pertinent pour la promotion vers Intent kinds dédiés (gain de précision + SLO custom), mais c'est désormais du polish, pas un bloquant doctrinal.

Verify : tsc --noEmit exit 0, vitest tests/unit/governance/ → 14 files / 74 tests passed.

## v5.6.1 — Sprint massif NEFER : 6 vagues (forgeOutput / manipulationMix / Tier 2.1 plan / i18n / infra) (2026-04-30)

**Suite directe v5.6.0. 6 vagues commitables qui closent presque tous les résidus restants. Score 95% → 99%.**

- `chore(infra)` `.husky/pre-commit` + `.husky/commit-msg` : retirer les 2 lignes deprecated qui faillent en husky v10.
- `chore(infra)` `prisma.config.ts` créé (migration depuis `package.json#prisma` deprecated en Prisma 7). `package.json#prisma` retiré, seed config maintenant dans `prisma.config.ts`.
- `feat(glory)` 16 candidats forgeOutput instrumentés via `scripts/patch-glory-forgeoutput.ts` (idempotent, one-shot). Couverture forgeOutput : 1/104 → **17/104**. Tools touchés : print-ad-architect, storyboard-generator, voiceover-brief-generator, client-presentation-strategist, creative-direction-memo, pitch-architect, award-case-builder, sales-deck-builder, kv-art-direction-brief, kv-review-validator, credentials-deck-builder, vendor-brief-generator, devis-generator, visual-landscape-mapper, visual-moodboard-generator, iconography-system-builder.
- `feat(scripts)` `backfill-manipulation-mix.ts` + `npm run backfill:manipulation-mix [--dry-run]`. Mapping sectoriel sur 20 secteurs (FMCG/banking/tech/fashion/etc.) qui pré-remplit `Strategy.manipulationMix=null` avec un mix initial. Fallback uniforme 0.25/0.25/0.25/0.25 si secteur inconnu.
- `feat(scripts)` `audit-legacy-mutation-candidates.ts` outille la promotion future Tier 2.1. Analyse les 67 routers strangler, classe par effort points (mutations × services × Zod), publie `docs/governance/legacy-mutation-promotion-plan.md` avec 3 vagues priorisées (≤2 / 2-5 / >5 effort).
- `feat(i18n)` `src/lib/i18n/{fr,en}.ts` étendus : 70+ keys par dictionnaire couvrant les 14 sections marketing (hero, strip, manifesto, value, surveillance, apogee, advertis, diagnostic, governors, portals, pricing, faq, finale, footer + errors). Wiring composants à faire dans une PR follow-up.

Verify : `tsc --noEmit` exit 0, audit forgeoutput → 17 declared / 0 candidates / 87 brief-only.

Résidus : Tier 2.1 promotion individuelle (314 mutations sur 67 routers) — outillé via le plan d'attaque, exécution hors scope sprint. Wiring i18n composants `marketing-*.tsx` à faire en PR follow-up (composants actuellement codés en dur).

## v5.6.0 — Phase 9-suite : closure résidus Ptah + Sentinel handlers + LLM routing fix (2026-04-30)

**Clôture des 5 résidus Phase 9 Ptah + wire des Sentinel handlers PENDING→OK + fix routeModel LLM Gateway v5. 0 erreur tsc, 74/74 tests gouvernance verts.**

- `fix(ds)` `Alert/Dialog/Sheet/Toast` — `Omit<HTMLAttributes<HTMLDivElement>, "title">` pour permettre `title?: ReactNode` sans clash type. PR-2 NEFER bug.
- `chore(tsconfig)` exclude `**/*.stories.{ts,tsx}` + `.storybook/` du tsc principal — Storybook aura son propre tsconfig si install ultérieur.
- `fix(llm-gateway)` `router.ts` — refactor `pickModel` via `idealIndex()` helper partagé ; le fallback `routeModel()` (no env API key) respecte désormais latency budget + cost ceiling. Token estimate 2k → 10k (in 6k + out 4k) pour budget gate réaliste. Models alignés sur canon : `claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`. 5/5 tests verts.
- `feat(ptah)` `download-archiver` (`src/server/services/ptah/download-archiver.ts`) — rapatrie les assets Magnific avant expiration (12h TTL). Mode dry-run sans `BLOB_STORAGE_PUT_URL_TEMPLATE` env, mode PUT actif sinon. Cron `/api/cron/ptah-download` toutes les 30min.
- `feat(seshat)` `asset-impact-tracker` (`src/server/services/seshat/asset-impact-tracker.ts`) — mesure `cultIndexDeltaObserved` pour chaque AssetVersion mature (≥24h), via comparaison `CultIndexSnapshot` avant/après. Cron `/api/cron/asset-impact` horaire.
- `feat(ptah)` `mcp/ptah` (`src/server/mcp/ptah/index.ts` + `src/app/api/mcp/ptah/route.ts`) — expose 3 intents Ptah (PTAH_MATERIALIZE_BRIEF / PTAH_RECONCILE_TASK / PTAH_REGENERATE_FADING_ASSET) aux agents externes via `mestor.emitIntent()`. Auth ADMIN-only. Zéro bypass governance.
- `feat(governance)` `sentinel-handlers` (`src/server/services/sentinel-handlers/index.ts`) — consomme les IntentEmission rows en PENDING émises par `/api/cron/sentinels` et exécute le handler concret (MAINTAIN_APOGEE drift detection / DEFEND_OVERTON aggregation / EXPAND_TO_ADJACENT opportunity flag). Idempotent. Cron `/api/cron/sentinel-handlers` toutes les 15min.
- `feat(scripts)` `audit-glory-forgeoutput` (`scripts/audit-glory-forgeoutput.ts` + `npm run glory:forgeoutput-audit`) — parcourt les 104 Glory tools EXTENDED_GLORY_TOOLS et flag les candidats à instrumenter forgeOutput selon heuristique nom/slug. Output : `docs/governance/glory-forgeoutput-audit.md` (1 declared / 16 candidates / 87 brief-only).
- `chore(governance)` régen `CODE-MAP.md` (870 lignes), `INTENT-CATALOG.md` (56 kinds), `glory-tools-inventory.md` (104 tools).
- `chore(infra)` 4 nouveaux crons dans `vercel.json` : `ptah-download` (`*/30 * * * *`), `asset-impact` (`0 * * * *`), `sentinel-handlers` (`*/15 * * * *`).

Verify : `tsc --noEmit` exit 0, `vitest run tests/unit/governance/` 14 files / 74 tests passed, `audit-neteru-narrative` + `audit-pantheon-completeness` 0 finding.

Résidus : Tier 2.1 (253 mutations LEGACY_MUTATION → governedProcedure individuelle) reste effort linéaire 3-4 semaines, hors scope sprint. 16 Glory tools candidats forgeOutput restent à instrumenter manuellement après revue (rapport généré).

## v5.5.9 — DS finalisation : ESLint rules + page Console preview — Phase 11 PR-9 (2026-04-30)

**Clôture Phase 11. 2 nouvelles ESLint rules + page Console preview + PAGE-MAP update.**

- `feat(eslint)` `lafusee/design-token-only` — interdit `text-zinc-*`/`bg-violet-*`/etc. dans `src/components/**` (sauf primitives + styles).
- `feat(eslint)` `lafusee/no-direct-lucide-import` — force `<Icon name="..." />` wrapper.
- `feat(console)` `/console/governance/design-system` — preview live tokens (Reference + Domain) + Button/Badge variants showcase.
- `chore(eslint)` `eslint-plugin-lafusee` 0.2.0 → 0.3.0 (7 rules au total).
- `chore(governance)` PAGE-MAP.md update : `(marketing)/page.tsx` + `/console/governance/design-system`.

**Bilan Phase 11 (9 PRs séquencés sur `feat/ds-panda-v1`)** :
- 12 docs gouvernance (DESIGN-SYSTEM canon + ADR-0013 + 5 docs séparés + 4 catalogues design-tokens + COMPONENT-MAP)
- 6 fichiers CSS cascade (Reference / System / Component / Domain / animations / index)
- 36 primitives CVA-driven tokens-only (avec manifests Zod-validated)
- 14 composants marketing-* (landing v5.4 dans `(marketing)/`)
- 7 ESLint rules custom (5 existantes + 2 DS)
- 5 tests anti-drift CI bloquants
- 4 scripts (codemod-zinc-to-tokens / audit-design-tokens / generate-component-map / generate-token-map)
- Storybook + Chromatic config + 5 stories
- Substitution `INFRASTRUCTURE → Ptah` cohérent BRAINS const (M/A/S/T/Ptah)
- Codemod exécuté sur 6 zones — milliers de remplacements zinc/violet → tokens

Verify : 15/15 tests anti-drift design-* verts.

## v5.5.8 — DS Landing v5.4 dans (marketing)/ — Phase 11 PR-8 (2026-04-30)

**Refonte landing complète : route group `(marketing)/`, 14 composants `marketing-*.tsx`, fonts Inter Tight + Fraunces + JetBrains Mono via next/font, substitution INFRASTRUCTURE → Ptah cohérent BRAINS const.**

- `feat(landing)` `src/app/(marketing)/layout.tsx` — Inter Tight + Fraunces + JetBrains Mono via `next/font/google`. `data-density="editorial"` + `data-portal="marketing"`.
- `feat(landing)` `src/app/(marketing)/page.tsx` compose les 14 sections.
- `feat(landing)` 14 composants `src/components/landing/marketing-*.tsx` : nav, hero (mega title + telemetry), strip (ticker), manifesto (Superfans × Overton), surveillance (radar SVG 4 cibles + panneau sync), apogee (frise 6 paliers + cron), advertis (radar 8 piliers score live), diagnostic (chain 8 outils auto-runnant), gouverneurs (5 tabs **M/A/S/T/Ptah** — substitution INFRASTRUCTURE→Ptah ADR-0013 §3), portails (4 cards), pricing (3 plans), faq, finale, footer.
- `feat(ds)` Ajout `--color-accent-secondary` Tier 1 = `--ref-ember`.
- `feat(ds)` Override `[data-theme="bone"]` dans system.css inverse les System tokens pour sections marketing claires. Cascade DS maintenue.
- `chore(landing)` Suppression `src/app/page.tsx` + 14 composants legacy + 3 shared.

Verify : 15/15 tests anti-drift verts.

## v5.5.7 — DS Wave 3+4 codemod migration (Cockpit + Console + Neteru) — Phase 11 PR-7 (2026-04-30)

**Codemod zinc/violet→tokens exécuté sur cockpit/, neteru/, strategy-presentation/, app/(cockpit)/, app/(console)/.**

- `chore(ds)` `src/components/cockpit/` migré (incl. pillar-page 28KB, 95 violations baseline → migré).
- `chore(ds)` `src/components/neteru/` migré (oracle-teaser 72 violations baseline, ptah-asset-library, founder-ritual, etc.).
- `chore(ds)` `src/components/strategy-presentation/` migré (sections 04, 09, 12).
- `chore(ds)` `src/app/(cockpit)/` migré (pages cockpit/brand/* avec 68× bg-zinc-950, 67× text-violet-400).
- `chore(ds)` `src/app/(console)/` migré (pages console/* avec 61× text-red-400, 54× border-zinc-600).

**Dette résiduelle après ce PR** (`audit:design`) : ~250 violations restantes concentrées dans landing/ + ptah-forge-runner/ptah-kiln-tracker + smart-field-editor + timeline. À traiter PR-8 (landing) et nettoyage manuel PR-9.

Verify : 15/15 tests anti-drift verts.

## v5.5.6 — DS data-density per portail + Wave 1+2 codemod migration — Phase 11 PR-6 (2026-04-30)

**Tous les layouts portails déclarent `data-density` + codemod zinc→tokens exécuté sur shared/ (295 remplacements).**

- `feat(ds)` `data-density` + `data-portal` ajoutés à 8 layouts :
  - Cockpit / Creator / Agency : `comfortable`
  - Console : `compact`
  - Intake / Auth / Public / Shared : `airy`
- `feat(ds)` Layouts manquants créés : `(intake)/layout.tsx`, `(public)/layout.tsx`.
- `chore(ds)` Migration agency layout : zinc/violet hardcoded → tokens (`bg-accent-subtle`, `text-accent`, `border-border`).
- `feat(ds)` Migration shared layout : `bg-zinc-950` → `bg-background`, header `border-zinc-800/50` → `border-border`, etc.
- `chore(ds)` **Codemod zinc→tokens exécuté sur `src/components/shared/`** : 26/36 fichiers modifiés, 295 remplacements (top : `bg-zinc-800` ×40, `border-zinc-800` ×35, `text-zinc-500` ×35, `text-zinc-400` ×32). Diff revu avant commit (NEFER §6).
- `test(governance)` `design-portal-density` bloquant — 8 portails × 4 densities expected. 1/1 vert.

Verify : 15/15 tests anti-drift design-* verts (cascade + coherence + cva + density).

Résidus : composants legacy `src/components/{cockpit,neteru,landing}/` non migrés (PR-7/8 waves 3-6).

## v5.5.5 — DS primitives complètes (~31 primitives) — Phase 11 PR-5 (2026-04-30)

**31 primitives CVA-driven tokens-only, manifests Zod-validated, 36 composants au total.**

- `feat(ds)` Form : Textarea, Select, Checkbox, Radio, Switch, Label, Field+FieldHelper+FieldError.
- `feat(ds)` Display : Avatar (5 sizes), Separator, Tag.
- `feat(ds)` Feedback : Alert, Banner, Toast, Tooltip, Popover, Sheet (focus trap + ESC + scroll lock).
- `feat(ds)` Loading : Spinner (sr-label), Skeleton (aria-busy), Progress (déterminé/indéterminé).
- `feat(ds)` Layout : Stack, Grid, Container.
- `feat(ds)` Typography : Heading (h1-h6 + display + mega + clamp fluid + text-balance), Text (5 variants × 6 tones).
- `feat(ds)` Navigation : Tabs (compound role=tablist), Accordion (native details), Breadcrumb (aria-label='Fil d'Ariane'), Pagination, Stepper (4 states), Command (Cmd+K).
- `feat(ds)` Icon wrapper Lucide (5 sizes tokens, mirrorOnRtl).
- `chore(ds)` index.ts barrel export 36 primitives par catégorie.
- `test(governance)` design-primitives-cva ajusté : `VariantProps<typeof X>` impose cva ; mapping Record/conditionnel autorisé pour Icon/Switch/Progress.

Verify : 14/14 tests anti-drift design-* verts.

## v5.5.4 — DS codemod + audit:design + tests scaffolding — Phase 11 PR-4 (2026-04-30)

**Outils de migration zinc→tokens + audit dette + scaffolding tests visual/a11y/i18n.**

- `feat(ds)` `scripts/codemod-zinc-to-tokens.ts` — codemod sed-like (regex) qui mappe `text-zinc-*`/`bg-zinc-*`/`border-zinc-*`/`text-violet-*` → tokens sémantiques. Modes : `--dry-run`, `--dir=src/components/X`. Diff revu manuellement avant commit.
- `feat(ds)` `scripts/audit-design-tokens.ts` — audit qui produit un rapport de la dette résiduelle. Modes : `--strict` (PR-9 blocking) ou warning (PR-4..8). Output : violations par pattern, top 20 fichiers.
- `feat(ds)` Test bloquant `tests/unit/governance/design-tokens-canonical.test.ts` — mode warning par défaut, blocking via `DESIGN_STRICT=1` env.
- `chore(ds)` `tests/visual/` + `tests/a11y/` + `tests/i18n/` scaffolding (READMEs avec coverage cible PR-9).
- `chore(scripts)` 5 npm scripts ajoutés : `codemod:zinc`, `audit:design:strict`, `test:visual`, `test:a11y`, `test:i18n`.

**Dette détectée par audit:design** (baseline avant codemod) — top 5 fichiers :
1. `cockpit/pillar-page.tsx` : 95 violations
2. `neteru/oracle-teaser.tsx` : 72
3. `neteru/rapport-pdf-preview.tsx` : 52
4. `shared/smart-field-editor.tsx` : 43
5. `shared/mestor-panel.tsx` / `pillar-content-card.tsx` : 40 chacun

Tracé dans RESIDUAL-DEBT.md §Tier 2.0. Migration en waves PR-6/7/8.

## v5.5.3 — DS Storybook + Chromatic + auto-generated maps — Phase 11 PR-3 (2026-04-30)

**Storybook 8 + Chromatic + scripts auto-régénération COMPONENT-MAP / DESIGN-TOKEN-MAP.**

- `feat(ds)` `.storybook/{main,preview,manager}.ts` config Storybook 8 (`@storybook/nextjs-vite`) avec addons a11y/viewport/themes/controls/docs. Globals `density` toolbar (compact/comfortable/airy/editorial). Branding panda + rouge fusée.
- `feat(ds)` `chromatic.config.json` + `.github/workflows/chromatic.yml` workflow visual review automatisé sur push/PR (`onlyChanged`, `exitZeroOnChanges`).
- `feat(ds)` 5 `*.stories.tsx` pour les primitives core : Button (variants × sizes × loading/disabled), Card (5 surfaces × interactive), Input (sizes × states), Badge (6 tones × variants), Dialog (focus trap + ESC).
- `feat(ds)` `scripts/generate-component-map.ts` — scanne tous les `*.manifest.ts` dans `src/components/`, régénère `COMPONENT-MAP.md` (5 composants détectés à PR-2 close).
- `feat(ds)` `scripts/generate-token-map.ts` — parse `src/styles/tokens/*.css`, régénère `DESIGN-TOKEN-MAP.md` exhaustif (Tier 0: 19, Tier 1: 24, Tier 2: 119, Tier 3: 24, Animations: 16).
- `chore(scripts)` `package.json` : 6 scripts ajoutés (`storybook`, `build-storybook`, `chromatic`, `audit:design`, `ds:components-map`, `ds:tokens-map`).

Verify : `npm run ds:components-map` ✓ 5 composants. `npm run ds:tokens-map` ✓ tous tiers.

Résidus :
- `npm install @storybook/nextjs-vite chromatic @axe-core/playwright` à exécuter pour activer (deps non installées dans cette PR — laissées au workflow CI ou install local).
- 33 primitives complémentaires + leurs stories → PR-5.

## v5.5.2 — DS primitives core + defineComponentManifest — Phase 11 PR-2 (2026-04-30)

**5 primitives core CVA-driven tokens-only + helper Zod-validated mirror backend.**

- `feat(ds)` `src/lib/design/define-component-manifest.ts` — helper Zod-validé, mirror de `defineManifest` backend (`src/server/governance/manifest.ts:209`). Validation runtime dev (anatomy, variants, a11yLevel, i18n, missionContribution). `GROUND_INFRASTRUCTURE` → `groundJustification` obligatoire (NEFER §6.3).
- `feat(ds)` `src/lib/design/cva-presets.ts` — variants CVA réutilisables (size, tone, focus ring, transition, disabled state).
- `feat(ds)` 5 primitives core dans `src/components/primitives/` :
  - **Button** — 6 variants (primary/ghost/outline/subtle/destructive/link) × 4 sizes (sm/md/lg/icon). Loading state + Spinner inline. CVA-driven, tokens-only. Touch target 44×44 (size=lg).
  - **Card** — compound component (Card / CardHeader / CardTitle / CardDescription / CardBody / CardFooter). 5 surfaces (flat/raised/elevated/overlay/outlined). Density-aware (consume `--card-px/py/gap/title-size`).
  - **Input** — 3 sizes × 3 states (default/invalid/valid). Focus ring rouge fusée. Disabled state propagé.
  - **Badge** — 6 tones × 3 variants (soft/solid/outline). Domain badges (TierBadge/ClassificationBadge/PillarBadge/DivisionBadge) consommeront ce primitive en PR-6.
  - **Dialog** — modal natif sans Radix. Focus trap + ESC close + return focus + scroll lock. 5 sizes (sm/md/lg/xl/fullscreen). aria-modal + aria-labelledby + aria-describedby.
- `feat(ds)` Co-located `*.manifest.ts` pour chaque primitive avec anatomy/variants/sizes/states/tones/density/a11yLevel/i18n/missionContribution.
- `test(governance)` `design-primitives-cva.test.ts` bloquant : (1) primitives dir existe, (2) chaque primitive avec variants utilise `cva()`, (3) chaque primitive a un manifest co-localisé. 3/3 verts.
- `chore(ds)` `src/components/primitives/index.ts` barrel export.

Verify : 14/14 tests anti-drift design-* verts (cascade + coherence + cva).

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
