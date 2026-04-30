# DESIGN-TOKEN-MAP — Inventaire exhaustif tokens

> **Auto-régénéré** par `scripts/generate-token-map.ts` (PR-3+) à chaque modification de `src/styles/tokens/*.css`.
> **Source de vérité runtime** : `src/styles/tokens/{reference,system,component,domain,animations}.css`.
> **Test bloquant** : `tests/unit/governance/design-tokens-coherence.test.ts` — chaque token CSS ↔ entrée ici.

## Cascade

```
Tier 0 Reference  →  Tier 1 System  →  Tier 2 Component  →  Tier 3 Domain
(palette brute)      (sémantique transverse)   (par primitive)        (sémantique métier)
```

## Tier 0 — Reference (palette brute)

Source : [src/styles/tokens/reference.css](../../src/styles/tokens/reference.css). Catalogue : [design-tokens/reference.md](design-tokens/reference.md).

### Surfaces panda (noir → sombre)

| Token | OKLCH | Hex (≈) | Usage |
|---|---|---|---|
| `--ref-ink-0` | `oklch(0.08 0.005 60)` | `#0a0a0a` | bg primaire (body) |
| `--ref-ink-1` | `oklch(0.11 0.005 60)` | `#121212` | surface raised |
| `--ref-ink-2` | `oklch(0.14 0.005 60)` | `#1a1a1a` | surface elevated |
| `--ref-ink-3` | `oklch(0.17 0.005 60)` | `#222222` | surface overlay |
| `--ref-ink-line` | `oklch(0.21 0.005 60)` | `#2a2a2a` | borders default |
| `--ref-ink-line-muted` | `oklch(0.16 0.005 60)` | `#1f1f1f` | borders subtle |
| `--ref-mute` | `oklch(0.45 0.005 60)` | `#6b6b6b` | foreground muted |
| `--ref-mute-2` | `oklch(0.31 0.005 60)` | `#4a4a4a` | foreground deeper muted |

### Foreground bone (chaud)

| Token | OKLCH | Hex | Usage |
|---|---|---|---|
| `--ref-bone` | `oklch(0.95 0.015 80)` | `#f5f1ea` | text primaire |
| `--ref-bone-2` | `oklch(0.91 0.020 80)` | `#e8e2d6` | foreground brightened |
| `--ref-bone-3` | `oklch(0.81 0.025 80)` | `#c9c3b6` | text secondaire |

### Accent rouge fusée

| Token | OKLCH | Hex | Usage |
|---|---|---|---|
| `--ref-rouge` | `oklch(0.62 0.22 25)` | `#e63946` | accent signature |
| `--ref-rouge-2` | `oklch(0.68 0.22 25)` | `#ff4d5e` | hover |
| `--ref-rouge-deep` | `oklch(0.50 0.20 25)` | `#b8232f` | active |
| `--ref-ember` | `oklch(0.72 0.20 40)` | `#ff6b3d` | secondaire chaud |

### Statuts

| Token | OKLCH | Hex | Usage |
|---|---|---|---|
| `--ref-green` | `oklch(0.72 0.18 145)` | `#4ade80` | success |
| `--ref-amber` | `oklch(0.78 0.16 80)` | `#f59e0b` | warning |
| `--ref-blue` | `oklch(0.68 0.16 240)` | `#5fa8e8` | info |

### Sectoriel homéopathique

| Token | OKLCH | Hex | Usage |
|---|---|---|---|
| `--ref-gold` | `oklch(0.74 0.14 80)` | `#d4a24c` | tier-maitre Creator + classification ICONE |

## Tier 1 — System (sémantique transverse)

Source : [src/styles/tokens/system.css](../../src/styles/tokens/system.css). Catalogue : [design-tokens/system.md](design-tokens/system.md).

| Token | Source | Description |
|---|---|---|
| `--color-background` | `--ref-ink-0` | Background page |
| `--color-surface-raised` | `--ref-ink-1` | Surface raised (cards, panels) |
| `--color-surface-elevated` | `--ref-ink-2` | Hover, modals |
| `--color-surface-overlay` | `--ref-ink-3` | Tooltips, popovers |
| `--color-foreground` | `--ref-bone` | Text primaire |
| `--color-foreground-secondary` | `--ref-bone-3` | Text secondaire |
| `--color-foreground-muted` | `--ref-mute` | Text tertiaire / labels |
| `--color-foreground-inverse` | `--ref-ink-0` | Text on accent fill |
| `--color-border` | `--ref-ink-line` | Border default |
| `--color-border-subtle` | `--ref-ink-line-muted` | Border discret |
| `--color-border-strong` | `--ref-bone-3` | Border emphasis |
| `--color-accent` | `--ref-rouge` | Accent signature |
| `--color-accent-hover` | `--ref-rouge-2` | Accent hover |
| `--color-accent-active` | `--ref-rouge-deep` | Accent active |
| `--color-accent-foreground` | `--ref-bone` | Text on accent |
| `--color-accent-subtle` | `color-mix rouge 15%` | Accent background subtle |
| `--color-success` | `--ref-green` | Success state |
| `--color-warning` | `--ref-amber` | Warning state |
| `--color-error` | `--ref-rouge` | Error state |
| `--color-info` | `--ref-blue` | Info state |
| `--color-ring` | `--ref-rouge` | Focus ring |

## Tier 2 — Component (par primitive)

Source : [src/styles/tokens/component.css](../../src/styles/tokens/component.css). Catalogue : [design-tokens/component.md](design-tokens/component.md).

| Component | Tokens (extrait) |
|---|---|
| Button | `--button-primary-bg`, `--button-primary-fg`, `--button-primary-bg-hover`, `--button-ghost-border`, `--button-ghost-fg`, `--button-h-{sm,md,lg}`, `--button-px-{sm,md,lg}` |
| Card | `--card-bg`, `--card-border`, `--card-bg-hover`, `--card-elevated-bg`, `--card-shadow` |
| Input | `--input-bg`, `--input-border`, `--input-border-focus`, `--input-fg`, `--input-placeholder` |
| Badge | `--badge-bg-{neutral,accent,success,warning,error,info}`, `--badge-fg-*` |
| Modal | `--modal-bg`, `--modal-border`, `--modal-backdrop`, `--modal-shadow` |
| Tabs | `--tabs-trigger-fg`, `--tabs-trigger-fg-active`, `--tabs-trigger-border-active` |
| ... | (auto-régénéré par `generate-token-map.ts`) |

## Tier 3 — Domain (sémantique métier)

Source : [src/styles/tokens/domain.css](../../src/styles/tokens/domain.css). Catalogue : [design-tokens/domain.md](design-tokens/domain.md).

### Piliers ADVE-RTIS

| Token | Source | Pilier | Sémantique |
|---|---|---|---|
| `--pillar-A` | `--ref-bone-2` | Authenticité | Bone éclatant |
| `--pillar-D` | `--ref-rouge` | Distinction | Rouge signature |
| `--pillar-V` | `--ref-bone-3` | Valeur | Bone secondaire |
| `--pillar-E` | `--ref-ember` | Engagement | Chaud orange |
| `--pillar-R` | `--ref-mute` | Risque | Mute |
| `--pillar-T` | `--ref-blue` | Track | Froid bleu |
| `--pillar-I` | `--ref-amber` | Innovation | Ambre |
| `--pillar-S` | `--ref-green` | Stratégie | Vert |

### Divisions Neteru (5 actifs — cohérent BRAINS const)

| Token | Source | Neter | Rôle |
|---|---|---|---|
| `--division-mestor` | `--ref-rouge` | Mestor | Décision (rouge signature) |
| `--division-artemis` | `--ref-ember` | Artemis | Exécution (chaud) |
| `--division-seshat` | `--ref-blue` | Seshat | Observation (froid) |
| `--division-thot` | `--ref-amber` | Thot | Finance (ambre) |
| `--division-ptah` | `--ref-bone-2` | Ptah | Matérialisation (bone éclatant) |

Imhotep / Anubis : pas de token tant que pas actifs (anti-drift).

### Tiers Creator

| Token | Source | Tier |
|---|---|---|
| `--tier-apprenti` | `--ref-mute` | APPRENTI |
| `--tier-compagnon` | `--ref-bone-3` | COMPAGNON |
| `--tier-maitre` | `--ref-gold` | MAÎTRE (gold homéopathique) |
| `--tier-associe` | `--ref-rouge` | ASSOCIÉ (élite — rouge signature) |

### Classifications APOGEE

| Token | Source | Classification |
|---|---|---|
| `--classification-zombie` | `--ref-mute-2` | ZOMBIE (sol) |
| `--classification-fragile` | `--ref-mute` | FRAGILE |
| `--classification-ordinaire` | `--ref-bone-3` | ORDINAIRE |
| `--classification-forte` | `--ref-bone-2` | FORTE |
| `--classification-culte` | `--ref-rouge` | CULTE (rouge signature) |
| `--classification-icone` | `--ref-gold` | ICONE (gold — apex) |

## Typography

| Token | Valeur | Usage |
|---|---|---|
| `--font-display` | `var(--font-inter-tight)` | UI + headlines |
| `--font-serif` | `var(--font-fraunces)` | Accent éditorial (italic) |
| `--font-mono` | `var(--font-jetbrains-mono)` | Code, telemetry, eyebrows |
| `--text-xs` | `clamp(11px, 0.7vw + 0.5rem, 13px)` | Micro labels |
| `--text-sm` | `clamp(13px, 0.8vw + 0.6rem, 15px)` | Captions |
| `--text-base` | `clamp(15px, 0.9vw + 0.7rem, 17px)` | Body |
| `--text-lg` | `clamp(17px, 1.1vw + 0.7rem, 20px)` | Lead |
| `--text-xl` | `clamp(20px, 1.4vw + 0.7rem, 24px)` | h3 |
| `--text-2xl` | `clamp(24px, 1.8vw + 0.6rem, 32px)` | h2 |
| `--text-3xl` | `clamp(28px, 2.4vw + 0.5rem, 40px)` | h1 standard |
| `--text-4xl` | `clamp(36px, 3.2vw + 0.5rem, 56px)` | h1 emphasis |
| `--text-display` | `clamp(40px, 6vw, 88px)` | Hero pages internes |
| `--text-mega` | `clamp(48px, 9vw, 140px)` | Landing hero |
| `--lh-tight` | 1.05 | Titres |
| `--lh-normal` | 1.5 | Body |
| `--lh-relaxed` | 1.7 | Long copy |
| `--fw-regular` | 400 | Body weight |
| `--fw-medium` | 500 | Buttons, labels |
| `--fw-semibold` | 600 | Subtitles |
| `--fw-bold` | 700 | Headlines |
| `--tracking-tight` | -0.025em | Display titles |
| `--tracking-normal` | 0em | Body |
| `--tracking-wide` | 0.05em | Eyebrows, mono |

## Spacing & rhythm

| Token | Valeur fluid | Usage |
|---|---|---|
| `--space-1` | `clamp(4px, 0.4vw, 6px)` | Micro gap |
| `--space-2` | `clamp(8px, 0.6vw, 10px)` | Small gap |
| `--space-3` | `clamp(12px, 0.9vw, 14px)` | Compact gap |
| `--space-4` | `clamp(16px, 1.2vw, 20px)` | Default gap |
| `--space-6` | `clamp(24px, 1.8vw, 32px)` | Section gap |
| `--space-8` | `clamp(32px, 2.5vw, 48px)` | Large gap |
| `--space-12` | `clamp(48px, 4vw, 80px)` | Section margin |
| `--space-16` | `clamp(64px, 6vw, 128px)` | Page rhythm |
| `--space-24` | `clamp(96px, 9vw, 192px)` | Hero rhythm |

## Density (par portail via `data-density`)

| Density | `--card-px` | `--card-py` | `--card-gap` | `--card-title-size` |
|---|---|---|---|---|
| compact | 12px | 12px | 8px | 14px |
| comfortable | 20px | 20px | 16px | 16px |
| airy | 32px | 32px | 24px | 20px |
| editorial | clamp(24,3vw,40)px | idem | 32px | clamp(18,1.4vw,24)px |

## Border radius

| Token | Valeur |
|---|---|
| `--radius-xs` | 2px |
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |
| `--radius-2xl` | 16px |
| `--radius-full` | 9999px |

## Shadows & glows

| Token | Valeur |
|---|---|
| `--shadow-xs` | `0 1px 2px oklch(0 0 0 / 0.4)` |
| `--shadow-sm` | `0 2px 4px oklch(0 0 0 / 0.45)` |
| `--shadow-md` | `0 4px 12px oklch(0 0 0 / 0.5)` |
| `--shadow-lg` | `0 8px 24px oklch(0 0 0 / 0.55)` |
| `--shadow-xl` | `0 16px 48px oklch(0 0 0 / 0.6)` |
| `--glow-accent` | `0 0 24px color-mix(in oklab, var(--ref-rouge) 40%, transparent)` |
| `--glow-ember` | `0 0 16px color-mix(in oklab, var(--ref-ember) 40%, transparent)` |

## Motion

(Voir [DESIGN-MOTION.md](DESIGN-MOTION.md) pour patterns complets.)

| Token | Valeur |
|---|---|
| `--motion-instant` | 0ms |
| `--motion-fast` | 120ms |
| `--motion-base` | 200ms |
| `--motion-medium` | 320ms |
| `--motion-slow` | 500ms |
| `--motion-slower` | 800ms |
| `--motion-deliberate` | 1200ms |
| `--ease-linear` | `linear` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |

## Z-index (cf. [DESIGN-LEXICON.md §7](DESIGN-LEXICON.md))

| Token | Valeur |
|---|---|
| `--z-base` | 0 |
| `--z-sticky` | 60 |
| `--z-topbar` | 80 |
| `--z-popover` | 90 |
| `--z-modal-backdrop` | 95 |
| `--z-modal` | 100 |
| `--z-mestor` | 110 |
| `--z-command` | 120 |
| `--z-toast` | 130 |

## Layout

| Token | Valeur |
|---|---|
| `--sidebar-expanded` | 16rem |
| `--sidebar-collapsed` | 4rem |
| `--topbar-height` | 3rem |
| `--mobile-tab-height` | 4rem |
| `--maxw-content` | 1280px |
| `--maxw-prose` | 70ch |
| `--pad-page` | clamp(20px, 4vw, 64px) |

## Breakpoints

| BP | Min width |
|---|---|
| `xs` | 0 |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

## Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon
- [design-tokens/reference.md](design-tokens/reference.md) — Tier 0 détail
- [design-tokens/system.md](design-tokens/system.md) — Tier 1 détail
- [design-tokens/component.md](design-tokens/component.md) — Tier 2 détail
- [design-tokens/domain.md](design-tokens/domain.md) — Tier 3 détail
- [DESIGN-MOTION.md](DESIGN-MOTION.md) — animations
- [DESIGN-A11Y.md](DESIGN-A11Y.md) — contrastes ratios
