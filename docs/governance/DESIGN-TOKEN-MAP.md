# DESIGN-TOKEN-MAP — Inventaire exhaustif tokens (auto-régénéré)

> **Auto-régénéré** par `scripts/generate-token-map.ts` (2026-10-07).
> Source runtime : `src/styles/tokens/*.css`. Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) §5.

## Tier — reference (47)

| Token | Valeur |
|---|---|
| `--up-red` | `#e56458` |
| `--up-red-hover` | `#ef7d71` |
| `--up-red-active` | `#c8473c` |
| `--up-red-ember` | `#ff6b3d` |
| `--up-gold` | `#facc15` |
| `--up-gold-deep` | `#d4a24c` |
| `--up-ink-0` | `#0a0a0a` |
| `--up-ink-1` | `#0d0d0d` |
| `--up-ink-2` | `#151515` |
| `--up-ink-3` | `#1f1f1f` |
| `--up-ink-4` | `#2e2e2e` |
| `--up-line` | `#262626` |
| `--up-line-soft` | `#1a1a1a` |
| `--up-white` | `#ffffff` |
| `--up-bone` | `#f5f4f1` |
| `--up-bone-2` | `#ece9e3` |
| `--up-slate-900` | `#141414` |
| `--up-slate-700` | `#3a3a3a` |
| `--up-slate-500` | `#6b6b6b` |
| `--up-slate-400` | `#9a9a9a` |
| `--up-slate-300` | `#c9c3b6` |
| `--up-slate-200` | `#e8e2d6` |
| `--up-green` | `#10b981` |
| `--up-blue` | `#3b82f6` |
| `--up-violet` | `#8b5cf6` |
| `--up-orange` | `#f59e0b` |
| `--ref-ink-0` | `var(--up-ink-1)` |
| `--ref-ink-1` | `var(--up-ink-2)` |
| `--ref-ink-2` | `var(--up-ink-3)` |
| `--ref-ink-3` | `var(--up-ink-4)` |
| `--ref-ink-line` | `var(--up-line)` |
| `--ref-ink-line-muted` | `var(--up-line-soft)` |
| `--ref-mute-2` | `var(--up-slate-700)` |
| `--ref-mute` | `var(--up-slate-500)` |
| `--ref-bone-3` | `var(--up-slate-300)` |
| `--ref-bone-2` | `var(--up-slate-200)` |
| `--ref-bone` | `var(--up-bone)` |
| `--ref-rouge` | `var(--up-red)` |
| `--ref-rouge-2` | `var(--up-red-hover)` |
| `--ref-rouge-deep` | `var(--up-red-active)` |
| `--ref-ember` | `var(--up-red-ember)` |
| `--ref-green` | `var(--up-green)` |
| `--ref-amber` | `var(--up-orange)` |
| `--ref-blue` | `var(--up-blue)` |
| `--ref-violet` | `var(--up-violet)` |
| `--ref-gold` | `var(--up-gold)` |
| `--ref-gold-deep` | `var(--up-gold-deep)` |

## Tier — system (40)

| Token | Valeur |
|---|---|
| `--color-background` | `var(--ref-ink-0)` |
| `--color-surface-raised` | `var(--ref-ink-1)` |
| `--color-surface-elevated` | `var(--ref-ink-2)` |
| `--color-surface-overlay` | `var(--ref-ink-3)` |
| `--color-media-light` | `var(--ref-bone)` |
| `--color-media-dark` | `var(--ref-ink-0)` |
| `--color-foreground` | `var(--ref-bone)` |
| `--color-foreground-secondary` | `var(--ref-bone-3)` |
| `--color-foreground-muted` | `var(--ref-mute)` |
| `--color-foreground-inverse` | `var(--ref-ink-0)` |
| `--color-border` | `var(--ref-ink-line)` |
| `--color-border-subtle` | `var(--ref-ink-line-muted)` |
| `--color-border-strong` | `var(--ref-bone-3)` |
| `--color-accent` | `var(--ref-rouge)` |
| `--color-accent-hover` | `var(--ref-rouge-2)` |
| `--color-accent-active` | `var(--ref-rouge-deep)` |
| `--color-accent-foreground` | `var(--up-white)` |
| `--color-accent-subtle` | `color-mix(in oklab, var(--ref-rouge) 15%, transparent)` |
| `--color-accent-secondary` | `var(--ref-ember)` |
| `--color-level` | `var(--ref-gold)` |
| `--color-level-subtle` | `color-mix(in oklab, var(--ref-gold) 15%, transparent)` |
| `--color-success` | `var(--ref-green)` |
| `--color-warning` | `var(--ref-amber)` |
| `--color-error` | `var(--ref-rouge)` |
| `--color-info` | `var(--ref-blue)` |
| `--color-ring` | `var(--ref-rouge)` |
| `--focus-ring-width` | `2px` |
| `--focus-ring-offset` | `2px` |
| `--focus-ring-style` | `solid` |
| `--color-background` | `var(--ref-bone)` |
| `--color-surface-raised` | `var(--up-white)` |
| `--color-surface-elevated` | `var(--ref-bone-2)` |
| `--color-surface-overlay` | `var(--up-white)` |
| `--color-foreground` | `var(--up-slate-900)` |
| `--color-foreground-secondary` | `var(--up-slate-700)` |
| `--color-foreground-muted` | `var(--ref-mute)` |
| `--color-foreground-inverse` | `var(--ref-bone)` |
| `--color-border` | `color-mix(in oklab, var(--up-slate-900) 14%, transparent)` |
| `--color-border-subtle` | `color-mix(in oklab, var(--up-slate-900) 8%, transparent)` |
| `--color-border-strong` | `color-mix(in oklab, var(--up-slate-900) 30%, transparent)` |

## Tier — component (121)

| Token | Valeur |
|---|---|
| `--button-primary-bg` | `var(--color-accent)` |
| `--button-primary-bg-hover` | `var(--color-accent-hover)` |
| `--button-primary-bg-active` | `var(--color-accent-active)` |
| `--button-primary-fg` | `var(--color-accent-foreground)` |
| `--button-ghost-border` | `var(--color-border-strong)` |
| `--button-ghost-fg` | `var(--color-foreground)` |
| `--button-ghost-bg-hover` | `var(--color-surface-elevated)` |
| `--button-outline-border` | `var(--color-border-strong)` |
| `--button-outline-fg` | `var(--color-foreground)` |
| `--button-subtle-bg` | `var(--color-surface-raised)` |
| `--button-subtle-fg` | `var(--color-foreground)` |
| `--button-destructive-bg` | `var(--color-error)` |
| `--button-destructive-fg` | `var(--color-foreground-inverse)` |
| `--button-link-fg` | `var(--color-accent)` |
| `--button-link-fg-hover` | `var(--color-accent-hover)` |
| `--button-h-sm` | `28px` |
| `--button-h-md` | `36px` |
| `--button-h-lg` | `44px` |
| `--button-h-icon` | `36px` |
| `--button-px-sm` | `12px` |
| `--button-px-md` | `16px` |
| `--button-px-lg` | `22px` |
| `--button-radius` | `var(--radius-md)` |
| `--card-bg` | `var(--color-surface-raised)` |
| `--card-bg-hover` | `var(--color-surface-elevated)` |
| `--card-bg-elevated` | `var(--color-surface-elevated)` |
| `--card-bg-overlay` | `var(--color-surface-overlay)` |
| `--card-border` | `var(--color-border)` |
| `--card-border-hover` | `var(--color-border-strong)` |
| `--card-shadow` | `var(--shadow-sm)` |
| `--card-shadow-hover` | `var(--shadow-md)` |
| `--card-radius` | `var(--radius-lg)` |
| `--asset-preview-bg-light` | `var(--color-media-light)` |
| `--asset-preview-bg-dark` | `var(--color-media-dark)` |
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
| `--badge-bg-neutral` | `var(--color-surface-elevated)` |
| `--badge-fg-neutral` | `var(--color-foreground-secondary)` |
| `--badge-bg-accent` | `var(--color-accent-subtle)` |
| `--badge-fg-accent` | `var(--color-accent)` |
| `--badge-bg-success` | `color-mix(in oklab, var(--color-success) 18%, transparent)` |
| `--badge-fg-success` | `var(--color-success)` |
| `--badge-bg-warning` | `color-mix(in oklab, var(--color-warning) 18%, transparent)` |
| `--badge-fg-warning` | `var(--color-warning)` |
| `--badge-bg-error` | `color-mix(in oklab, var(--color-error) 18%, transparent)` |
| `--badge-fg-error` | `var(--color-error)` |
| `--badge-bg-info` | `color-mix(in oklab, var(--color-info) 18%, transparent)` |
| `--badge-fg-info` | `var(--color-info)` |
| `--badge-h` | `20px` |
| `--badge-px` | `8px` |
| `--badge-radius` | `var(--radius-sm)` |
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
| `--tabs-trigger-fg` | `var(--color-foreground-muted)` |
| `--tabs-trigger-fg-active` | `var(--color-foreground)` |
| `--tabs-trigger-fg-hover` | `var(--color-foreground-secondary)` |
| `--tabs-trigger-border-active` | `var(--color-accent)` |
| `--tabs-list-border` | `var(--color-border)` |
| `--toast-bg` | `var(--color-surface-elevated)` |
| `--toast-border` | `var(--color-border)` |
| `--toast-fg` | `var(--color-foreground)` |
| `--toast-shadow` | `var(--shadow-lg)` |
| `--toast-radius` | `var(--radius-lg)` |
| `--toast-w` | `360px` |
| `--tooltip-bg` | `var(--color-surface-overlay)` |
| `--tooltip-fg` | `var(--color-foreground)` |
| `--tooltip-border` | `var(--color-border-subtle)` |
| `--tooltip-shadow` | `var(--shadow-md)` |
| `--tooltip-radius` | `var(--radius-md)` |
| `--tooltip-px` | `8px` |
| `--tooltip-py` | `4px` |
| `--tooltip-max-w` | `260px` |
| `--popover-bg` | `var(--color-surface-overlay)` |
| `--popover-border` | `var(--color-border)` |
| `--popover-shadow` | `var(--shadow-lg)` |
| `--popover-radius` | `var(--radius-lg)` |
| `--popover-p` | `12px` |
| `--sheet-bg` | `var(--color-surface-raised)` |
| `--sheet-border` | `var(--color-border)` |
| `--sheet-shadow` | `var(--shadow-xl)` |
| `--sheet-w-sm` | `320px` |
| `--sheet-w-md` | `480px` |
| `--sheet-w-lg` | `640px` |
| `--card-px` | `12px` |
| `--card-py` | `12px` |
| `--card-gap` | `8px` |
| `--card-title-size` | `14px` |
| `--card-px` | `20px` |
| `--card-py` | `20px` |
| `--card-gap` | `16px` |
| `--card-title-size` | `16px` |
| `--card-px` | `32px` |
| `--card-py` | `32px` |
| `--card-gap` | `24px` |
| `--card-title-size` | `20px` |
| `--card-px` | `clamp(24px, 3vw, 40px)` |
| `--card-py` | `clamp(24px, 3vw, 40px)` |
| `--card-gap` | `32px` |
| `--card-title-size` | `clamp(18px, 1.4vw, 24px)` |

## Tier — domain (23)

| Token | Valeur |
|---|---|
| `--pillar-A` | `var(--ref-bone-2)` |
| `--pillar-D` | `var(--ref-rouge)` |
| `--pillar-V` | `var(--ref-bone-3)` |
| `--pillar-E` | `var(--ref-ember)` |
| `--pillar-R` | `var(--ref-mute)` |
| `--pillar-T` | `var(--ref-blue)` |
| `--pillar-I` | `var(--ref-amber)` |
| `--pillar-S` | `var(--ref-green)` |
| `--division-mestor` | `var(--ref-rouge)` |
| `--division-artemis` | `var(--ref-ember)` |
| `--division-seshat` | `var(--ref-blue)` |
| `--division-thot` | `var(--ref-amber)` |
| `--division-ptah` | `var(--ref-bone-2)` |
| `--tier-apprenti` | `var(--ref-mute)` |
| `--tier-compagnon` | `var(--ref-bone-3)` |
| `--tier-maitre` | `var(--ref-gold)` |
| `--tier-associe` | `var(--ref-rouge)` |
| `--classification-latent` | `var(--ref-mute-2)` |
| `--classification-fragile` | `var(--ref-mute)` |
| `--classification-ordinaire` | `var(--ref-bone-3)` |
| `--classification-forte` | `var(--ref-bone-2)` |
| `--classification-culte` | `var(--ref-rouge)` |
| `--classification-icone` | `var(--ref-gold)` |

## Tier — animations (24)

| Token | Valeur |
|---|---|
| `--motion-instant` | `0ms` |
| `--motion-fast` | `120ms` |
| `--motion-base` | `200ms` |
| `--motion-medium` | `320ms` |
| `--motion-slow` | `500ms` |
| `--motion-slower` | `800ms` |
| `--motion-deliberate` | `1200ms` |
| `--duration-instant` | `var(--motion-instant)` |
| `--duration-fast` | `var(--motion-fast)` |
| `--duration-normal` | `var(--motion-base)` |
| `--duration-slow` | `var(--motion-medium)` |
| `--duration-slower` | `var(--motion-slow)` |
| `--ease-linear` | `linear` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--ease-default` | `var(--ease-in-out)` |
| `--ease-bounce` | `var(--ease-spring)` |
| `--animate-modal-in` | `scale-in var(--motion-base) var(--ease-spring) both` |
| `--animate-toast-in` | `slide-down var(--motion-medium) var(--ease-out) both` |
| `--animate-rise-in` | `slide-up var(--motion-slow) var(--ease-out) both` |
