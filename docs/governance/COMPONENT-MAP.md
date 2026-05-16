# COMPONENT-MAP — Inventaire des composants UI

> **Auto-régénéré** par `scripts/generate-component-map.ts` (2026-04-30).
> Ne pas éditer à la main.

## Migrated (36)

| Composant | Fichier | Variants | Mission | a11y |
|---|---|---|---|---|
| `accordion` | `src/components/primitives/accordion.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `alert` | `src/components/primitives/alert.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `avatar` | `src/components/primitives/avatar.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `badge` | `src/components/primitives/badge.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `banner` | `src/components/primitives/banner.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `breadcrumb` | `src/components/primitives/breadcrumb.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `button` | `src/components/primitives/button.manifest.ts` | 6 | GROUND_INFRASTRUCTURE | AA |
| `card` | `src/components/primitives/card.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `checkbox` | `src/components/primitives/checkbox.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `command` | `src/components/primitives/command.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `container` | `src/components/primitives/container.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `dialog` | `src/components/primitives/dialog.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `field` | `src/components/primitives/field.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `grid` | `src/components/primitives/grid.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `heading` | `src/components/primitives/heading.manifest.ts` | 8 | GROUND_INFRASTRUCTURE | AA |
| `icon` | `src/components/primitives/icon.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `input` | `src/components/primitives/input.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `label` | `src/components/primitives/label.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `pagination` | `src/components/primitives/pagination.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `popover` | `src/components/primitives/popover.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `progress` | `src/components/primitives/progress.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `radio` | `src/components/primitives/radio.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `select` | `src/components/primitives/select.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `separator` | `src/components/primitives/separator.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `sheet` | `src/components/primitives/sheet.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |
| `skeleton` | `src/components/primitives/skeleton.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `spinner` | `src/components/primitives/spinner.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `stack` | `src/components/primitives/stack.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `stepper` | `src/components/primitives/stepper.manifest.ts` | 2 | DIRECT_BOTH | AA |
| `switch` | `src/components/primitives/switch.manifest.ts` | 1 | GROUND_INFRASTRUCTURE | AA |
| `tabs` | `src/components/primitives/tabs.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `tag` | `src/components/primitives/tag.manifest.ts` | 2 | GROUND_INFRASTRUCTURE | AA |
| `text` | `src/components/primitives/text.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `textarea` | `src/components/primitives/textarea.manifest.ts` | 3 | GROUND_INFRASTRUCTURE | AA |
| `toast` | `src/components/primitives/toast.manifest.ts` | 5 | GROUND_INFRASTRUCTURE | AA |
| `tooltip` | `src/components/primitives/tooltip.manifest.ts` | 4 | GROUND_INFRASTRUCTURE | AA |

## Phase 23 reusable patterns (PENDING — Epic 6 + Epic 7 document)

Phase 23 introduit **zéro nouvelle primitive** (les 3 absolute DS prohibitions tiennent) mais documente 4 patterns réutilisables comme **Phase-22 reusable patterns** — référencés depuis ici quand activated :

- **Status triad pattern** (UX-DR12) — colour + shape/icon + text label sur tout status indicator (connector state, sub-cluster lifecycle, calibration outcome). Introduit Epic 2 Story 2.4 ; réutilisé Epic 6.
- **Provenance popover pattern** (UX-DR7) — composition fine sur `popover` primitive, signature `{ source, refUrl }`, one-hop "where from" reaching signal source OR calibration snapshot. Introduit Epic 6 Story 6.6 ; réutilisé Epic 7.
- **Honest empty/degraded pattern** (UX-DR10) — composition fine sur `empty-state` primitive : icon + cause + unlock path, info tone (DEFERRED is info, not warning), même footprint que populated state. Introduit Epic 3 Story 3.2 ; réutilisé Epic 4 + Epic 7.
- **Operator-judgement confirmation pattern** (UX-DR14 + UX-DR15) — every consequential decision = explicit operator act → primary/ghost button pair → hash-chained attributed event → confirmation linking the resulting snapshot. Introduit Epic 6 Story 6.4 (`CalibrationReviewPanel`).

`<OvertonRadar>` (existant — `src/components/neteru/overton-radar.tsx`) sera consommé par la route `/cockpit/intelligence/overton` (Phase 23 Epic 7 Story 7.5) via le wrapper `<OvertonPanel>` (Epic 7 Story 7.4). Props extension to `ConnectorResult<T>` + `instance` CVA variant (full/teaser) — Epic 7 Story 7.1.

Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [DESIGN-LEXICON.md](DESIGN-LEXICON.md).