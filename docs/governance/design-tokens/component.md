# design-tokens/component.md — Tier 2 Component Tokens

> Tokens **par primitive**. Permettent d'avoir des couleurs/dimensions internes au composant sans polluer le namespace global.
> Source runtime : [src/styles/tokens/component.css](../../../src/styles/tokens/component.css).
> **Auto-régénéré** par `scripts/generate-token-map.ts` (PR-3+) en lisant les manifests primitives.

## Règle de cascade

Un Component token consomme **uniquement** des System tokens (Tier 1) ou parfois Domain tokens (Tier 3) pour les contextes métier (ex: TierBadge consomme `--tier-*`).

---

## Button

| Token | Source | Description |
|---|---|---|
| `--button-primary-bg` | `--color-accent` | bg variant primary |
| `--button-primary-bg-hover` | `--color-accent-hover` | bg primary hover |
| `--button-primary-bg-active` | `--color-accent-active` | bg primary active |
| `--button-primary-fg` | `--color-accent-foreground` | fg primary |
| `--button-ghost-border` | `--color-border-strong` | border variant ghost |
| `--button-ghost-fg` | `--color-foreground` | fg ghost |
| `--button-ghost-bg-hover` | `--color-surface-elevated` | bg ghost hover |
| `--button-outline-border` | `--color-border-strong` | border outline |
| `--button-outline-fg` | `--color-foreground` | fg outline |
| `--button-subtle-bg` | `--color-surface-raised` | bg subtle |
| `--button-subtle-fg` | `--color-foreground` | fg subtle |
| `--button-destructive-bg` | `--color-error` | bg destructive |
| `--button-destructive-fg` | `--color-foreground-inverse` | fg destructive |
| `--button-link-fg` | `--color-accent` | fg link |
| `--button-link-fg-hover` | `--color-accent-hover` | fg link hover |
| `--button-h-sm` | `28px` | height size sm |
| `--button-h-md` | `36px` | height size md |
| `--button-h-lg` | `44px` | height size lg (≥ touch target WCAG AA) |
| `--button-h-icon` | `36px` | height size icon (square) |
| `--button-px-sm` | `12px` | padding-x sm |
| `--button-px-md` | `16px` | padding-x md |
| `--button-px-lg` | `22px` | padding-x lg |
| `--button-radius` | `var(--radius-md)` | border-radius |

## Card

| Token | Source |
|---|---|
| `--card-bg` | `var(--color-surface-raised)` |
| `--card-bg-hover` | `var(--color-surface-elevated)` |
| `--card-bg-elevated` | `var(--color-surface-elevated)` |
| `--card-bg-overlay` | `var(--color-surface-overlay)` |
| `--card-border` | `var(--color-border)` |
| `--card-border-hover` | `var(--color-border-strong)` |
| `--card-shadow` | `var(--shadow-sm)` |
| `--card-shadow-hover` | `var(--shadow-md)` |
| `--card-radius` | `var(--radius-lg)` |
| `--card-px` | `20px` (override par density) |
| `--card-py` | `20px` (override par density) |
| `--card-gap` | `16px` (override par density) |
| `--card-title-size` | `16px` (override par density) |

## Input / Textarea / Select

| Token | Source |
|---|---|
| `--input-bg` | `var(--color-surface-raised)` |
| `--input-bg-disabled` | `var(--color-surface-elevated)` |
| `--input-border` | `var(--color-border)` |
| `--input-border-hover` | `var(--color-border-strong)` |
| `--input-border-focus` | `var(--color-accent)` |
| `--input-border-invalid` | `var(--color-error)` |
| `--input-border-valid` | `var(--color-success)` |
| `--input-fg` | `var(--color-foreground)` |
| `--input-fg-disabled` | `var(--color-foreground-muted)` |
| `--input-placeholder` | `var(--color-foreground-muted)` |
| `--input-h-sm` | `28px` |
| `--input-h-md` | `36px` |
| `--input-h-lg` | `44px` |
| `--input-px` | `12px` |
| `--input-radius` | `var(--radius-md)` |

## Badge

| Token | Source | tone |
|---|---|---|
| `--badge-bg-neutral` | `var(--color-surface-elevated)` | neutral |
| `--badge-fg-neutral` | `var(--color-foreground-secondary)` | neutral |
| `--badge-bg-accent` | `var(--color-accent-subtle)` | accent |
| `--badge-fg-accent` | `var(--color-accent)` | accent |
| `--badge-bg-success` | `color-mix(in oklab, var(--color-success) 18%, transparent)` | success |
| `--badge-fg-success` | `var(--color-success)` | success |
| `--badge-bg-warning` | `color-mix(in oklab, var(--color-warning) 18%, transparent)` | warning |
| `--badge-fg-warning` | `var(--color-warning)` | warning |
| `--badge-bg-error` | `color-mix(in oklab, var(--color-error) 18%, transparent)` | error |
| `--badge-fg-error` | `var(--color-error)` | error |
| `--badge-bg-info` | `color-mix(in oklab, var(--color-info) 18%, transparent)` | info |
| `--badge-fg-info` | `var(--color-info)` | info |
| `--badge-h` | `20px` | height |
| `--badge-px` | `8px` | padding-x |
| `--badge-radius` | `var(--radius-sm)` | border-radius |

## Modal / Dialog

| Token | Source |
|---|---|
| `--modal-bg` | `var(--color-surface-elevated)` |
| `--modal-border` | `var(--color-border)` |
| `--modal-backdrop` | `oklch(0 0 0 / 0.7)` |
| `--modal-shadow` | `var(--shadow-xl)` |
| `--modal-radius` | `var(--radius-xl)` |
| `--modal-max-w-sm` | `420px` |
| `--modal-max-w-md` | `560px` |
| `--modal-max-w-lg` | `720px` |
| `--modal-max-w-xl` | `960px` |
| `--modal-px` | `24px` |
| `--modal-py` | `24px` |

## Tabs

| Token | Source |
|---|---|
| `--tabs-trigger-fg` | `var(--color-foreground-muted)` |
| `--tabs-trigger-fg-active` | `var(--color-foreground)` |
| `--tabs-trigger-fg-hover` | `var(--color-foreground-secondary)` |
| `--tabs-trigger-border-active` | `var(--color-accent)` |
| `--tabs-list-border` | `var(--color-border)` |

## Toast

| Token | Source |
|---|---|
| `--toast-bg` | `var(--color-surface-elevated)` |
| `--toast-border` | `var(--color-border)` |
| `--toast-fg` | `var(--color-foreground)` |
| `--toast-shadow` | `var(--shadow-lg)` |
| `--toast-radius` | `var(--radius-lg)` |
| `--toast-w` | `360px` |

## Tooltip

| Token | Source |
|---|---|
| `--tooltip-bg` | `var(--color-surface-overlay)` |
| `--tooltip-fg` | `var(--color-foreground)` |
| `--tooltip-border` | `var(--color-border-subtle)` |
| `--tooltip-shadow` | `var(--shadow-md)` |
| `--tooltip-radius` | `var(--radius-md)` |
| `--tooltip-px` | `8px` |
| `--tooltip-py` | `4px` |
| `--tooltip-max-w` | `260px` |

## Popover

| Token | Source |
|---|---|
| `--popover-bg` | `var(--color-surface-overlay)` |
| `--popover-border` | `var(--color-border)` |
| `--popover-shadow` | `var(--shadow-lg)` |
| `--popover-radius` | `var(--radius-lg)` |
| `--popover-p` | `12px` |

## Sheet (drawer)

| Token | Source |
|---|---|
| `--sheet-bg` | `var(--color-surface-raised)` |
| `--sheet-border` | `var(--color-border)` |
| `--sheet-shadow` | `var(--shadow-xl)` |
| `--sheet-w-sm` | `320px` |
| `--sheet-w-md` | `480px` |
| `--sheet-w-lg` | `640px` |

## Données complètes

Ce fichier sera enrichi par PR-2 (Wave 0 primitives) puis PR-5 (primitives complètes) puis auto-régénéré PR-3+ par `scripts/generate-token-map.ts`.

À chaque nouvelle primitive : ajouter sa section ici **dans le même PR** que sa création (test `design-tokens-coherence` bloquant).

## Anti-patterns interdits

- ❌ Component token qui consomme un Reference (`var(--ref-*)`) directement → utiliser System
- ❌ Hardcoder `padding: 16px` dans un composant alors qu'un token Component existe
- ❌ Définir un Component token sans le primitive associée (= dead token)
