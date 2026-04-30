# Changelog — La Fusee

Systeme de versionnage : **`MAJEURE.PHASE.ITERATION`**

- **MAJEURE** : Refonte architecturale ou changement de paradigme (v1 = fondation, v2 = modules, v3 = NETERU, ...)
- **PHASE** : Phase strategique du CdC (0 = fondation, 1 = enrichissement, 2 = intelligence, 3 = production, ...)
- **ITERATION** : Increment au sein d'une phase (fixes, features, polish)

> **Mise à jour OBLIGATOIRE par NEFER en Phase 6** — toute session qui ship un commit `feat(...)` ajoute une entrée ici. Cf. [docs/governance/NEFER.md](docs/governance/NEFER.md). Audit anti-drift : `scripts/audit-changelog-coverage.ts`.

---

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
