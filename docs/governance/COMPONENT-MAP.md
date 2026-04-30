# COMPONENT-MAP — Inventaire des composants UI

> **Auto-régénéré** par `scripts/generate-component-map.ts` (PR-3+).
> **Source de vérité** : `src/components/**/*.manifest.ts`.

## Statuts

| Statut | Signification |
|---|---|
| `migrated` | Refactoré CVA + tokens-only + manifest + story + tests visual/a11y/i18n |
| `pending-migration` | À migrer — utilise encore `text-zinc-*` ou variants inline |
| `deprecated` | Wrapper temporaire (ex: modal.tsx → Dialog) — marqué pour suppression |
| `created` | Nouveau (PR-2 ou suivant), démarre directement migré |

## Primitives (`src/components/primitives/`)

À créer en PR-2 (Wave 0) puis PR-5 (complètes).

| Fichier | Statut | Variants | Mission contribution | a11yLevel | PR |
|---|---|---|---|---|---|
| `button.tsx` | _to-create_ | primary/ghost/outline/subtle/destructive/link × sm/md/lg/icon | GROUND_INFRASTRUCTURE | AA | PR-2 |
| `card.tsx` | _to-create_ | flat/outlined/elevated/interactive × density | GROUND_INFRASTRUCTURE | AA | PR-2 |
| `input.tsx` | _to-create_ | sm/md/lg × default/invalid/valid/disabled | GROUND_INFRASTRUCTURE | AA | PR-2 |
| `badge.tsx` | _to-create_ | tone(neutral/accent/success/warning/error/info) × variant(solid/soft/outline) | GROUND_INFRASTRUCTURE | AA | PR-2 |
| `dialog.tsx` | _to-create_ | sm/md/lg/xl/fullscreen | GROUND_INFRASTRUCTURE | AA | PR-2 |
| `textarea.tsx` | _to-create_ | sm/md/lg | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `select.tsx` | _to-create_ | sm/md/lg | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `checkbox.tsx` | _to-create_ | default/indeterminate | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `radio.tsx` | _to-create_ | standard/button/card | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `switch.tsx` | _to-create_ | sm/md | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `label.tsx` | _to-create_ | required/optional | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `field.tsx` | _to-create_ | wrapper helper/error | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `field-error.tsx` | _to-create_ | — | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `avatar.tsx` | _to-create_ | sm/md/lg/xl | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `separator.tsx` | _to-create_ | horizontal/vertical | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `tag.tsx` | _to-create_ | dismissible/static | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `toast.tsx` | _to-create_ | tone × variant | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `banner.tsx` | _to-create_ | tone × dismissible | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `alert.tsx` | _to-create_ | tone | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `tooltip.tsx` | _to-create_ | top/bottom/left/right | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `popover.tsx` | _to-create_ | placement | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `sheet.tsx` | _to-create_ | right/left/top/bottom × sm/md/lg | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `stack.tsx` | _to-create_ | direction × gap | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `grid.tsx` | _to-create_ | cols × gap | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `container.tsx` | _to-create_ | maxw | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `heading.tsx` | _to-create_ | level h1-h6 × scale | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `text.tsx` | _to-create_ | body/caption/label | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `skeleton.tsx` | _to-create_ | rect/circle/text | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `spinner.tsx` | _to-create_ | sm/md/lg | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `progress.tsx` | _to-create_ | bar/circle × determinate/indeterminate | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `tabs.tsx` | _to-create_ | horizontal/vertical | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `breadcrumbs.tsx` | _to-create_ | — | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `pagination.tsx` | _to-create_ | sm/md | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `command.tsx` | _to-create_ | (Cmd+K) | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `accordion.tsx` | _to-create_ | single/multiple | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `icon.tsx` | _to-create_ | wrapper lucide-react | GROUND_INFRASTRUCTURE | AA | PR-5 |
| `radar-chart.tsx` | _to-create_ | extracted from advertis-radar | DIRECT_BOTH | AA | PR-5 |
| `stepper.tsx` | _to-create_ | horizontal/vertical | GROUND_INFRASTRUCTURE | AA | PR-5 |

**Total primitives** : 38 (5 PR-2 + 33 PR-5).

## Composants existants (`src/components/shared/`)

À migrer en PR-6 (Wave 1+2). 36 fichiers.

| Fichier | Statut | Wave |
|---|---|---|
| `stat-card.tsx` | pending-migration | Wave 1 |
| `metric-card.tsx` | pending-migration | Wave 1 |
| `mission-card.tsx` | pending-migration | Wave 1 |
| `tier-badge.tsx` | pending-migration | Wave 1 |
| `status-badge.tsx` | pending-migration | Wave 1 |
| `ai-badge.tsx` | pending-migration | Wave 1 |
| `score-badge.tsx` | pending-migration | Wave 1 |
| `modal.tsx` | pending-migration | Wave 2 (→ Dialog wrapper deprecated) |
| `confirm-dialog.tsx` | pending-migration | Wave 2 |
| `notification-toast.tsx` | pending-migration | Wave 2 |
| `data-table.tsx` | pending-migration | Wave 2 |
| `search-filter.tsx` | pending-migration | Wave 2 |
| `select-input.tsx` | pending-migration | Wave 2 |
| `tabs.tsx` | pending-migration | Wave 2 |
| `timeline.tsx` | pending-migration | Wave 2 |
| `empty-state.tsx` | pending-migration | Wave 1 |
| `loading-skeleton.tsx` | pending-migration | Wave 1 |
| `page-header.tsx` | pending-migration | Wave 2 |
| `mestor-panel.tsx` | pending-migration | Wave 2 |
| `advertis-radar.tsx` | pending-migration | Wave 5 |
| `devotion-ladder.tsx` | pending-migration | Wave 1 |
| `cult-index.tsx` | pending-migration | Wave 5 |
| `pillar-progress.tsx` | pending-migration | Wave 1 |
| `pillar-content-card.tsx` | pending-migration | Wave 3 |
| `conversation-list.tsx` | pending-migration | Wave 2 |
| `message-thread.tsx` | pending-migration | Wave 2 |
| `smart-field-editor.tsx` | pending-migration | Wave 2 |
| `brand-comparables-panel.tsx` | pending-migration | Wave 4 |
| `view-mode-selector.tsx` | pending-migration | Wave 2 |
| `pipeline-progress.tsx` | pending-migration | Wave 2 |
| `campaign-card.tsx` | pending-migration | Wave 1 |

## Composants Neteru (`src/components/neteru/`)

À migrer en PR-8 (Wave 5+6). 23 fichiers.

| Fichier | Statut | Wave |
|---|---|---|
| `oracle-teaser.tsx` | pending-migration | Wave 5 |
| `oracle-enrichment-tracker.tsx` | pending-migration | Wave 5 |
| `ptah-asset-library.tsx` | pending-migration | Wave 5 |
| `ptah-forge-runner.tsx` | pending-migration | Wave 5 |
| `ptah-kiln-tracker.tsx` | pending-migration | Wave 5 |
| `overton-radar.tsx` | pending-migration | Wave 5 |
| `founder-ritual.tsx` | pending-migration | Wave 5 |
| `pricing-tiers.tsx` | pending-migration | Wave 5 (cas test originel) |
| `cascade-progress.tsx` | pending-migration | Wave 5 |
| `artemis-executor.tsx` | pending-migration | Wave 5 |
| `intent-replay-button.tsx` | pending-migration | Wave 5 |
| `rapport-pdf-preview.tsx` | pending-migration | Wave 5 |
| `superfan-mass-meter.tsx` | pending-migration | Wave 5 |
| `thot-budget-meter.tsx` | pending-migration | Wave 5 |
| `seshat-timeline.tsx` | pending-migration | Wave 5 |

## Composants Cockpit (`src/components/cockpit/`)

À migrer en PR-7 (Wave 3+4).

| Fichier | Statut | Wave |
|---|---|---|
| `pillar-page.tsx` (28KB) | pending-migration | Wave 3 |
| `field-renderers.tsx` (81KB) | pending-migration | Wave 3 |

## Landing legacy (`src/components/landing/`)

**Suppression complète** PR-8 (remplacés par `marketing-*.tsx` route group `(marketing)/`).

| Fichier | Statut | Action |
|---|---|---|
| `hero.tsx` | deprecated | DELETE PR-8 |
| `navbar.tsx` | deprecated | DELETE PR-8 |
| `mission-manifesto.tsx` | deprecated | DELETE PR-8 |
| `problem-section.tsx` | deprecated | DELETE PR-8 |
| `how-it-works.tsx` | deprecated | DELETE PR-8 |
| `score-showcase.tsx` | deprecated | DELETE PR-8 |
| `neteru-showcase.tsx` | deprecated | DELETE PR-8 |
| `apogee-trajectory.tsx` | deprecated | DELETE PR-8 |
| `social-proof.tsx` | deprecated | DELETE PR-8 |
| `portals-section.tsx` | deprecated | DELETE PR-8 |
| `pricing-section.tsx` | deprecated | DELETE PR-8 |
| `faq-section.tsx` | deprecated | DELETE PR-8 |
| `final-cta.tsx` | deprecated | DELETE PR-8 |
| `footer.tsx` | deprecated | DELETE PR-8 |
| `shared/glow-button.tsx` | deprecated | DELETE PR-8 |
| `shared/animated-counter.tsx` | deprecated | DELETE PR-8 |
| `shared/section-wrapper.tsx` | deprecated | DELETE PR-8 |

## Composants à créer Landing (`src/components/landing/marketing-*.tsx`)

PR-8 — 14 nouveaux composants.

| Fichier | Statut | Wave |
|---|---|---|
| `marketing-nav.tsx` | _to-create_ | Wave 6 |
| `marketing-hero.tsx` | _to-create_ | Wave 6 |
| `marketing-strip.tsx` | _to-create_ | Wave 6 |
| `marketing-manifesto.tsx` | _to-create_ | Wave 6 |
| `marketing-surveillance.tsx` | _to-create_ | Wave 6 (port radar SVG 4 cibles) |
| `marketing-apogee.tsx` | _to-create_ | Wave 6 (port frise + rocket) |
| `marketing-advertis.tsx` | _to-create_ | Wave 6 (port radar 8 piliers drag) |
| `marketing-diagnostic.tsx` | _to-create_ | Wave 6 (chain 8 outils) |
| `marketing-gouverneurs.tsx` | _to-create_ | Wave 6 (5 tabs M/A/S/T/Ptah substitution) |
| `marketing-portails.tsx` | _to-create_ | Wave 6 |
| `marketing-pricing.tsx` | _to-create_ | Wave 6 |
| `marketing-faq.tsx` | _to-create_ | Wave 6 |
| `marketing-finale.tsx` | _to-create_ | Wave 6 |
| `marketing-footer.tsx` | _to-create_ | Wave 6 |

## Stats

- **Total à migrer** (existants) : ~71 composants (36 shared + 23 neteru + 2 cockpit + 2 cards × multi + 14 landing legacy à supprimer)
- **Total à créer** : 38 primitives + 14 landing marketing = 52
- **Total final** : ~109 fichiers composants, tous CVA + tokens-only + manifest + stories + tests visual/a11y/i18n

## Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon
- [DESIGN-LEXICON.md](DESIGN-LEXICON.md) — vocabulaire (recommended/featured/highlighted, anatomy slots)
- [DESIGN-A11Y.md](DESIGN-A11Y.md) — niveaux a11y attendus par primitive
