# design-tokens/system.md — Tier 1 System Tokens

> Sémantique transverse. Chaque composant **doit** consommer ces tokens, jamais un Reference directement.
> Source runtime : [src/styles/tokens/system.css](../../../src/styles/tokens/system.css).

## Règle de cascade

```
Tier 0 Reference  →  Tier 1 System (ce fichier)
                       ↓
                     Tier 2 Component  →  Tier 3 Domain
```

Un System token consomme **uniquement** un Reference token. Jamais un autre System (pas de chaîne System → System).

---

## Surfaces

| Token | Source | Description |
|---|---|---|
| `--color-background` | `--ref-ink-0` | Background page (body) |
| `--color-surface-raised` | `--ref-ink-1` | Cards, panels, sidebar |
| `--color-surface-elevated` | `--ref-ink-2` | Hover state, modals fond |
| `--color-surface-overlay` | `--ref-ink-3` | Tooltips, popovers, dropdowns |

## Foreground

| Token | Source | Description |
|---|---|---|
| `--color-foreground` | `--ref-bone` | Text primaire |
| `--color-foreground-secondary` | `--ref-bone-3` | Text secondaire |
| `--color-foreground-muted` | `--ref-mute` | Labels, eyebrows, captions |
| `--color-foreground-inverse` | `--ref-ink-0` | Text on accent fill (ex: button-primary fg) |

## Borders

| Token | Source | Description |
|---|---|---|
| `--color-border` | `--ref-ink-line` | Border default |
| `--color-border-subtle` | `--ref-ink-line-muted` | Border discret (table dividers) |
| `--color-border-strong` | `--ref-bone-3` | Border emphasis (focus, active) |

## Accent (rouge fusée)

| Token | Source | Description |
|---|---|---|
| `--color-accent` | `--ref-rouge` | Accent default (CTA, focus ring) |
| `--color-accent-hover` | `--ref-rouge-2` | Accent hover |
| `--color-accent-active` | `--ref-rouge-deep` | Accent active/pressed |
| `--color-accent-foreground` | `--ref-bone` | Text on accent fill |
| `--color-accent-subtle` | `color-mix(in oklab, var(--ref-rouge) 15%, transparent)` | Background tint accent |
| `--color-accent-secondary` | `--ref-ember` | Accent secondaire chaud (landing hero radial, alarmes Console) |

## Statuts

| Token | Source | Description |
|---|---|---|
| `--color-success` | `--ref-green` | Success state |
| `--color-warning` | `--ref-amber` | Warning state |
| `--color-error` | `--ref-rouge` | Error state (= accent par convention) |
| `--color-info` | `--ref-blue` | Info state |

## Focus

| Token | Source | Description |
|---|---|---|
| `--color-ring` | `--ref-rouge` | Focus ring color |
| `--focus-ring-width` | `2px` | Focus ring width |
| `--focus-ring-offset` | `2px` | Focus ring outline offset |
| `--focus-ring-style` | `solid` | Focus ring style |

## Anti-patterns interdits

- ❌ `var(--ref-rouge)` directement dans un composant → utiliser `var(--color-accent)`
- ❌ `bg-[#0a0a0a]` Tailwind brut → utiliser `bg-background`
- ❌ Créer un nouveau System token sans nécessité Tier 2+ (= dead token)
- ❌ System token qui consomme un autre System (pas de chaîne)

## Modification

Modifier un System token **ne nécessite pas d'ADR** (sauf renommage cassant). Mais doit :
1. Mettre à jour ce fichier (synchronisé via test `design-tokens-coherence`)
2. Mettre à jour [src/styles/tokens/system.css](../../../src/styles/tokens/system.css)
3. Vérifier qu'aucun Tier 2+ ne casse (les Component tokens consomment ces tokens)
4. Snapshot visual baseline sur Storybook
