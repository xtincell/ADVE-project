# Plan — Design System Governance for La Fusée (full atomic delivery)

> Status: planning document. Not yet executed. Author: Alexandre + Claude session 2026-04-29.
> Trigger: drift répété sur `PricingTiers` (cards de hauteurs différentes, badge collisions, vertical rhythm cassé).
> Scope: zero hors-scope — couvre la totalité de la couche design (governance + tokens + primitives + Storybook + migration legacy + CI + a11y + i18n).

## Context

**Pourquoi maintenant** : `PricingTiers` drifte parce qu'il n'existe aucun contrat visuel. Ce n'est pas un bug local — c'est le symptôme d'une couche entière manquante. État réel cartographié :

| Layer | Status |
|---|---|
| Color tokens (OKLCH semantic) dans [globals.css](../../src/styles/globals.css) `@theme` | ✅ Riches mais sous-utilisés |
| Typography tokens | ❌ **Absents** — explique les 245 instances de `text-[10px]`/`text-[9px]`/`text-[12px]` éparpillées |
| Usage des tokens dans composants | ❌ Hardcoded `text-amber-400`, `bg-zinc-800`, hex direct |
| Primitives (Button/Card/Badge/Dialog/Input/...) | ❌ Aucune — chaque composant ré-invente |
| CVA / variant grammar | ❌ Absent — variantes en `[a, b, c].join(" ")` |
| Storybook | ❌ Absent |
| Régression visuelle | ❌ Playwright `only-on-failure`, pas de baseline |
| Component manifest UI | ❌ Pattern existe pour services backend, inutilisé UI |
| A11y testing | ❌ Aucun |
| i18n contracts (RTL, font scaling) | ❌ Aucun (alors que marché africain = multi-langue) |
| Drift design dans RESIDUAL-DEBT | ❌ Non tracé |

**Décision** : livraison **atomique complète**, sans hors-scope. Tout ce qui est nécessaire pour qu'un nouveau drift soit impossible structurellement est inclus. La migration des 34+ composants legacy fait partie de la livraison, pas d'un "fil-de-l'eau" indéfini.

## Architecture — couches qui mirroir la governance backend

```
Backend governance              →  Design governance
─────────────────────────          ─────────────────────────
CLAUDE.md                       →  CLAUDE.md (+ Design pointer)
MISSION.md (vision + drift §4)  →  DESIGN-SYSTEM.md (vision + drift test)
ADR-0001..0008                  →  ADR-0009
LEXICON.md                      →  DESIGN-LEXICON.md
SERVICE-MAP / ROUTER-MAP        →  DESIGN-TOKEN-MAP / COMPONENT-MAP
manifest.ts par service         →  manifest.ts par composant
audit-mission-drift CI          →  audit-design-drift + a11y + visual CI
```

## Livrables (atomiques, ordre d'exécution)

### A. Governance spec — docs

1. **`docs/governance/DESIGN-SYSTEM.md`** (~500 lignes, structure MISSION.md) :
   - **§1 Mission** — design = propulsion culturelle. Chaque portail a son identité (Cockpit/Creator/Console/Agency). Chaque palier APOGEE (ZOMBIE→ICONE) a ses codes visuels. Le design accélère Spectateur→Évangéliste sur la Devotion Ladder.
   - **§2 Token discipline** — règle non-négociable : zéro classe Tailwind brute (`text-amber-400`, `bg-zinc-800`, `text-[10px]`) hors `src/components/primitives/**` et `src/styles/**`.
   - **§3 Anatomy contracts** — chaque composant déclare son anatomie (header / body / footer / action zones), contraintes de hauteur, padding rhythm, baseline grid.
   - **§4 Variant grammar** — CVA obligatoire dès >1 variante visuelle ; nommage canonique (`variant`, `size`, `tone`, `state`, `density`).
   - **§5 Drift test** — 5 questions (mirror MISSION.md §4) :
     - Tokens semantic uniquement ?
     - Variantes déclarées dans le manifest ?
     - Régression visuelle attrapée par snapshot ?
     - Tests a11y axe passent ?
     - Comportement RTL + font-scaling 200% testé ?
   - **§6 Auto-correction** — procédure quand un composant échoue.
   - **§7 Anatomy de référence** — Card (Header / Body / Footer slots), Form (Label / Field / Helper / Error), Pattern composite (PricingTier).
   - **§8 Mission contribution** — chaque manifest déclare comment le composant accélère la cascade ADVERTIS (ex : `DIRECT_ENGAGEMENT`, `INDIRECT_NOTORIETY`).
   - **§9 CI gates** — pattern bloqués, override path.
   - **§10 Migration policy** — règle : tout PR qui touche un composant non-migré doit le migrer ; cf. COMPONENT-MAP pour le statut.

2. **`docs/governance/adr/0009-design-system-governance.md`** — Context / Decision / Consequences. Trace : manifests UI + CVA + tokens semantic + Storybook + Chromatic + audit CI + a11y + i18n contracts.

3. **`docs/governance/DESIGN-LEXICON.md`** — vocabulaire visuel (parallèle à [LEXICON.md](LEXICON.md)) : `recommended` vs `highlighted` vs `featured`, `active` vs `current` vs `selected`, `loading` vs `pending` vs `disabled`, `subtle` vs `muted` vs `quiet`, `glow` vs `accent`.

4. **`docs/governance/DESIGN-TOKEN-MAP.md`** — inventaire exhaustif des tokens (color, typography, spacing, radius, shadow, motion, z-index, breakpoint, sidebar/topbar layout) avec usage attendu et exemples.

5. **`docs/governance/COMPONENT-MAP.md`** — inventaire des composants existants avec statut (`migrated` / `pending-migration` / `deprecated`). Mis à jour automatiquement par script.

6. **`docs/governance/DESIGN-MOTION.md`** — contrats d'animation : durations canoniques, easing, transitions par catégorie d'interaction (entry/exit/state-change/loading), respect de `prefers-reduced-motion`.

7. **`docs/governance/DESIGN-A11Y.md`** — contrats accessibilité : niveaux WCAG attendus (AA minimum), focus visible, contrast ratios, ARIA patterns par primitive, keyboard nav, screen reader behavior.

8. **`docs/governance/DESIGN-I18N.md`** — contrats internationalisation : RTL behavior (logical properties `start`/`end`), font scaling (zoom 200%), pluralization, locale-specific number/currency formatting (`fr-FR`, `en-US`, `wo-SN`, `sw-KE` pour marché africain).

9. **`CLAUDE.md`** — bloc ~5 lignes "Design Governance" pointant vers DESIGN-SYSTEM.md, calqué sur "Governance — NETERU".

10. **`docs/governance/RESIDUAL-DEBT.md`** — tracking de la migration legacy (entrée Tier 2 avec checklist des 34+ composants).

### B0. Token audit & extension

11. **Audit `src/styles/globals.css`** :
    - Color tokens : déjà bons, validés
    - Typography : **manquants** — ajouter `--font-size-2xs/xs/sm/md/lg/xl/2xl/3xl/4xl/5xl` + `--line-height-tight/normal/relaxed` + `--font-weight-{regular,medium,semibold,bold}` + `--font-tracking-{tight,normal,wide}`
    - Spacing : audit pour rhythm tokens (`--space-rhythm-xs/sm/md/lg/xl` distincts du Tailwind brut, pour padding/gap canoniques)
    - Print : ajouter `@media print` overrides minimaux
    - Reduced motion : `@media (prefers-reduced-motion: reduce)` pour neutraliser les animation tokens
    - Dark mode contracts : confirmer que tous les semantic tokens ont leur pair light/dark (actuellement le projet est dark-first ; vérifier si light est sur la roadmap)

### B. Primitives library — code

12. **`src/components/primitives/`** — librairie complète. Chaque primitive ships avec :
    - `*.tsx` (CVA, tokens-only, accessible by default)
    - `*.manifest.ts` (anatomy, variants, tokens, mission contribution, a11y level)
    - `*.stories.tsx` (Storybook, une story par variante)
    - `*.test.tsx` (unit tests)

    **Form primitives** :
    - `button.tsx` (5 variants × 3 sizes × tones)
    - `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio.tsx`, `switch.tsx`
    - `label.tsx`, `field.tsx` (wrapper avec helper/error slots), `field-error.tsx`

    **Display primitives** :
    - `card.tsx` (Header / Body / Footer slots compound)
    - `badge.tsx` (variants tier/state/notification)
    - `avatar.tsx`
    - `separator.tsx`
    - `tag.tsx`

    **Feedback primitives** :
    - `toast.tsx`, `banner.tsx`, `alert.tsx`
    - `tooltip.tsx`, `popover.tsx`
    - `dialog.tsx` (refonte de [modal.tsx](../../src/components/shared/modal.tsx) ; modal.tsx devient wrapper deprecated)

    **Layout primitives** :
    - `stack.tsx` (vertical/horizontal avec gap tokens)
    - `grid.tsx`
    - `container.tsx`

    **Typography primitives** :
    - `heading.tsx` (h1-h6 avec scale tokens)
    - `text.tsx` (body/caption/label avec scale tokens)

    **Loading primitives** :
    - `skeleton.tsx`
    - `spinner.tsx`
    - `progress.tsx`

    **Navigation primitives** :
    - `tabs.tsx`
    - `breadcrumbs.tsx`
    - `pagination.tsx`

    **Icon wrapper** :
    - `icon.tsx` — wrapper autour de lucide-react avec sizing en tokens, jamais d'import direct dans le reste du code

13. **`src/lib/design/define-component-manifest.ts`** — helper Zod-validé, calqué sur [defineManifest](../../src/server/governance/governed-procedure.ts) :
    ```ts
    defineComponentManifest({
      component: "pricing-tiers",
      governor: "NETERU_UI",
      anatomy: ["header", "price-block", "inclusions", "cta"],
      variants: [
        { name: "default", tokens: ["color-card", "spacing-rhythm-md"] },
        { name: "recommended", tokens: ["color-primary", "shadow-glow-primary"] },
      ],
      constraints: { minHeight: "20rem", badgeReserve: "0.75rem", maxInclusionsLines: 8 },
      a11yLevel: "AA",
      i18n: { rtl: true, fontScaling: "200%" },
      missionContribution: "DIRECT_ENGAGEMENT",
      missionStep: 4,
    })
    ```
    Validation runtime en dev, no-op en prod.

14. **`src/lib/design/cva-presets.ts`** — variantes CVA réutilisables (size, tone, density, state) pour ne pas réinventer dans chaque primitive.

### B1. Storybook + Chromatic

15. **`.storybook/`** — config Storybook 8 :
    - `main.ts` — addons : a11y, viewport, themes, controls, docs
    - `preview.ts` — globals.css importé, theme switcher (dark/light si applicable)
    - `manager.ts` — branding La Fusée

16. **`*.stories.tsx`** par primitive — une story par variante × size × state (autogénérée depuis le manifest dans la mesure du possible).

17. **Chromatic** :
    - `chromatic.config.json`
    - `.github/workflows/chromatic.yml` — visual review sur chaque PR, baseline auto sur main
    - Note : si pas de budget Chromatic, fallback Playwright snapshots locaux (cf. C.21)

### C0. Migration legacy (atomic, non hors-scope)

18. **Inventaire complet** — script `scripts/list-components.ts` qui scanne `src/components/**` et produit COMPONENT-MAP.md initial avec statut `pending-migration` pour tous.

19. **Migration des 34+ composants** par groupe, du plus simple au plus complexe, avec manifest + refactor sur primitives + story Storybook + snapshot baseline. Ordre suggéré :
    - **Wave 1 — Atomic legacy** : `tier-badge`, `metric-card`, `mission-card`, `devotion-ladder`, `cost-meter`, `oracle-teaser`, `score-showcase`, `apogee-trajectory`, `command-palette`
    - **Wave 2 — Composite shared** : `modal` (→ wrapper Dialog), `smart-field-editor`, `field-renderers`, navigation/topbar, navigation/sidebar
    - **Wave 3 — Cockpit-specific** : `pillar-page`, `notoria-page`, brand/edit page components
    - **Wave 4 — Console-specific** : seshat/search, governance/intents, oracle/proposition, insights/benchmarks, config/integrations
    - **Wave 5 — Neteru** : `pricing-tiers` (cas test originel — peut être fait en Wave 1 pour valider le pattern), autres composants neteru
    - **Wave 6 — Intake/Public** : intake/result page components, landing/hero
    - Chaque wave = un commit atomique distinct dans la PR finale, avec son lot de visual baselines

20. **Chaque migration suit la même check-list** :
    - Composant utilise primitives (jamais HTML brut + Tailwind)
    - Zéro classe Tailwind brute (CI valide)
    - Manifest co-localisé
    - Story Storybook
    - Snapshot baseline
    - Tests a11y axe
    - Tests RTL + font-scaling

### C. Enforcement — CI gate strict (pas diff-only après migration complète)

21. **`scripts/audit-design-drift.ts`** :
    - Mode strict (post-migration) : 0 violation autorisée hors `src/components/primitives/**` + `src/styles/**`
    - Règles : grep `text-\[\d+px\]`, `text-(amber|emerald|zinc|red|blue|violet|slate|gray|stone|neutral)-\d+`, `bg-(...)-\d+`, `border-(...)-\d+`, hex direct (`#[0-9a-fA-F]{3,8}`), inline `style={{...color...}}`
    - Output structuré : file:line + token semantic suggéré par règle de mapping

22. **`tests/visual/`** — Playwright `toHaveScreenshot()` avec baseline committée :
    - Une spec par primitive couvrant toutes les variants × sizes × states déclarés
    - Une spec par pattern composite (PricingTiers, etc.)
    - Run en parallèle sur chromium + firefox + webkit
    - Threshold : 0.1% diff max
    - Couplé à Chromatic en cloud si dispo, sinon snapshots locaux suffisants

23. **`tests/a11y/`** — `@axe-core/playwright` :
    - Une spec par primitive (axe.run() doit retourner 0 violation)
    - Test focus visible, keyboard nav, ARIA roles
    - Threshold : 0 violation sérieuses ou critiques

24. **`tests/i18n/`** — RTL + font-scaling :
    - Force `dir="rtl"` sur primitives, vérifie absence d'overlap visuel
    - Force `font-size: 200%` au root, vérifie absence de truncation/clipping

25. **`.github/workflows/design-drift.yml`** :
    - Job `audit` : `pnpm audit-design-drift`
    - Job `visual` : `pnpm test:visual`
    - Job `a11y` : `pnpm test:a11y`
    - Job `i18n` : `pnpm test:i18n`
    - Job `chromatic` : si configuré
    - Job `manifest-validation` : tous les `*.manifest.ts` doivent passer Zod parse
    - Tous bloquants pour merge

26. **`eslint.config.js`** :
    - Règle custom `design-token-only` : interdit les classes Tailwind brutes (color/spacing magique) hors `src/components/primitives/**` et `src/styles/**`
    - Règle `no-direct-lucide-import` : force l'usage de `<Icon />` wrapper
    - Override possible avec `// eslint-disable-next-line design-token-only` + commentaire de justification obligatoire

27. **`.husky/pre-commit`** ou git hook équivalent — lance `audit-design-drift` en mode diff sur fichiers stagés ; échoue rapidement avant CI.

### D. Documentation vivante (auto-générée)

28. **`scripts/generate-component-map.ts`** — scanne tous les `*.manifest.ts`, met à jour COMPONENT-MAP.md avec : statut, variants déclarés, mission contribution, niveau a11y. Run en CI.

29. **`scripts/generate-token-map.ts`** — parse `globals.css` `@theme`, met à jour DESIGN-TOKEN-MAP.md.

30. **Storybook docs MDX** — chaque primitive a sa page docs autogénérée depuis le manifest + props types.

## Critical files (à lire avant édition)

- [CLAUDE.md](../../CLAUDE.md) — ton terse / pyramid pointer
- [docs/governance/MISSION.md](MISSION.md) — modèle structurel pour DESIGN-SYSTEM.md
- [docs/governance/APOGEE.md](APOGEE.md) — codes visuels par tier
- [docs/governance/REFONTE-PLAN.md](REFONTE-PLAN.md) — phase label à appliquer
- [docs/governance/adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — modèle ADR
- [docs/governance/LEXICON.md](LEXICON.md) — modèle lexicon
- [src/styles/globals.css](../../src/styles/globals.css) — tokens existants à compléter (typography manquante)
- [src/components/neteru/pricing-tiers.tsx](../../src/components/neteru/pricing-tiers.tsx) — cas test originel
- [src/components/shared/modal.tsx](../../src/components/shared/modal.tsx) — devient wrapper Dialog deprecated
- [src/components/shared/tier-badge.tsx](../../src/components/shared/tier-badge.tsx), [metric-card.tsx](../../src/components/shared/metric-card.tsx), [mission-card.tsx](../../src/components/shared/mission-card.tsx) — Wave 1 migration
- [src/components/shared/smart-field-editor.tsx](../../src/components/shared/smart-field-editor.tsx) — Wave 2 (drift constants documentés)
- [src/server/services/campaign-manager/manifest.ts](../../src/server/services/campaign-manager/manifest.ts) — modèle manifest backend
- [src/server/governance/governed-procedure.ts](../../src/server/governance/governed-procedure.ts) — `defineManifest` à mirrorer
- [src/lib/utils/index.ts](../../src/lib/utils/index.ts) — `cn()` réutilisé
- [playwright.config.ts](../../playwright.config.ts) — étendu avec projects `visual` / `a11y` / `i18n`
- [package.json](../../package.json) — nouvelles deps : `class-variance-authority`, `@storybook/nextjs-vite`, `chromatic`, `@axe-core/playwright`, addons Storybook (a11y, viewport, themes, controls, docs)

## Réutilisations (zéro duplication)

- `cn()` (`clsx + tailwind-merge`) — déjà en place
- `defineManifest` pattern — étendu, pas dupliqué
- Tokens dans `@theme` — consommés via Tailwind 4 auto-mapping
- ADR template — emprunté à 0001
- Drift test §4 — emprunté à MISSION.md
- Lexicon doc pattern — emprunté à LEXICON.md
- Map doc pattern — emprunté à SERVICE-MAP / ROUTER-MAP
- Strangler migration approach — emprunté à backend (REFONTE-PLAN Phase 4)

## Build sequence

1. **A** : tous les docs (DESIGN-SYSTEM, ADR-0009, LEXICON, TOKEN-MAP, COMPONENT-MAP, MOTION, A11Y, I18N) + update CLAUDE.md + update RESIDUAL-DEBT.
2. **B0** : extension typography/spacing tokens dans globals.css.
3. **B.13 + B.14** : helper `defineComponentManifest` + cva-presets.
4. **B.12** : primitives par catégorie (typography → display → form → feedback → layout → loading → navigation → icon). Chaque primitive : tsx + manifest + story + test + visual baseline.
5. **B1** : Storybook + Chromatic config.
6. **C0.18** : script inventaire + COMPONENT-MAP initial.
7. **C0.19 + C0.20** : migration des 6 waves dans l'ordre. PricingTiers idéalement Wave 1 (preuve du pattern).
8. **C.21-27** : scripts CI + workflows + eslint + husky.
9. **D.28-30** : docs autogénérés + Storybook MDX.

Cette séquence est non-négociable globalement (les snapshots ne peuvent baseliner que ce qui existe), mais à l'intérieur d'un step les composants peuvent partir en parallèle.

## Verification end-to-end

**Docs (A)** :
- DESIGN-SYSTEM.md entre 400 et 600 lignes ; passes les 5 questions du drift test sur lui-même
- Cross-links : `grep -r 'DESIGN-SYSTEM.md' docs/ CLAUDE.md` retourne tous les pointers attendus
- ADR-0009 lié dans CLAUDE.md ET REFONTE-PLAN.md

**Tokens (B0)** :
- `globals.css` contient les nouveaux tokens typography
- `pnpm typecheck` passe
- Aucune régression visuelle sur les composants legacy non encore migrés (les nouveaux tokens sont additifs)

**Primitives (B)** :
- `pnpm typecheck` passe
- `pnpm test` passe (unit tests par primitive)
- `pnpm storybook` lance Storybook ; toutes les primitives ont au moins une story par variant
- `pnpm test:visual --update-snapshots` génère baselines complètes
- `pnpm test:a11y` passe (0 violation critique/sérieuse)
- `pnpm test:i18n` passe (RTL + zoom 200%)

**Migration (C0)** :
- Après Wave complète : `grep -E 'text-(amber|emerald|zinc|red|blue|violet|slate|gray|stone)-[0-9]+|text-\[[0-9]+px\]' src/components/ | grep -v primitives/` → 0 résultat
- `pnpm audit-design-drift` mode strict → 0 violation
- Manuel : ouvrir chaque page critique (`/intake/[token]/result`, `/cockpit/*`, `/console/*`) via `pnpm dev` et preview tools, capturer screenshots, comparer avec pré-migration → aucune régression visuelle

**Cas test PricingTiers** :
- Les 3 cartes ont des hauteurs alignées dans tous les cas (avec/sans `localizedBadge`, avec/sans `recommended`, avec/sans `current`)
- Le badge `localizedBadge` ne collisionne jamais avec le prix
- Vertical rhythm consistent
- Screenshot final via `preview_screenshot` sur `/intake/[token]/result` ET `/cockpit` → pixel-parfait

**CI (C)** :
- Push branche test avec violation intentionnelle (`text-amber-400` dans un composant) → `audit-design-drift` rouge
- Modification visuelle d'une primitive → `test:visual` rouge avec PNG diff lisible
- Composant sans manifest → `manifest-validation` rouge
- A11y violation introduite → `test:a11y` rouge
- Tous les jobs verts sur la PR finale

**Storybook + Chromatic** :
- `pnpm build-storybook` produit un static build
- Chromatic baseline acceptée sur main
- Lien Storybook public ajouté dans README + DESIGN-SYSTEM.md

**Docs vivants (D)** :
- `pnpm generate-component-map` met à jour COMPONENT-MAP.md → toutes les entrées en `migrated`
- `pnpm generate-token-map` met à jour DESIGN-TOKEN-MAP.md → exhaustif vs `globals.css`
