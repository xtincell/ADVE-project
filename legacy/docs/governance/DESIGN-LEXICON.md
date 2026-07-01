# DESIGN-LEXICON — Vocabulaire visuel canonique

> Parallèle à [LEXICON.md](LEXICON.md) (vocabulaire métier).
> Ce doc fixe les termes du DS pour éviter le drift sémantique.
> Chaque terme : définition, exemple, contre-exemples interdits.

## 1. Variants — distinction sémantique

### `recommended` vs `featured` vs `highlighted`

| Terme | Sens | Exemple |
|---|---|---|
| `recommended` | Choix par défaut suggéré, neutre | `<PricingTier recommended />` — plan suggéré pour le prospect moyen |
| `featured` | Mis en avant visuellement (emphasis) | `<Card featured />` — card avec border accent + scale légère |
| `highlighted` | Surligné dans un set (résultat de recherche, sélection courante) | `<TableRow highlighted />` — résultat d'un filtre actif |

**Interdit** : utiliser `featured` quand le sens est `recommended`. Le lecteur attend un emphasis visuel sur `featured`, alors que `recommended` est une *propriété sémantique* (pas forcément de différenciation visuelle).

### `active` vs `current` vs `selected`

| Terme | Sens | Exemple |
|---|---|---|
| `active` | État interactif (en cours d'utilisation, focus, pressed) | `<Button active />` — pendant un click maintenu |
| `current` | État de localisation (où l'on est) | `<NavItem current />` — l'item correspond à la route actuelle |
| `selected` | État de choix (parmi un set) | `<RadioCard selected />` — l'option choisie dans un radio group |

### `loading` vs `pending` vs `disabled`

| Terme | Sens | Comportement |
|---|---|---|
| `loading` | Action déclenchée, en cours | Spinner + bouton non-cliquable |
| `pending` | Attend une action externe (pas déclenchée par l'user) | Skeleton + interactivité conservée |
| `disabled` | Inactif structurellement (permission, prérequis manquant) | Opacity + cursor not-allowed + aria-disabled |

### `subtle` vs `muted` vs `quiet`

| Terme | Sens | Token cible |
|---|---|---|
| `subtle` | Réduit en intensité (opacity, saturation) | `--color-foreground-secondary` |
| `muted` | Sourdine sémantique (foreground décrescendo) | `--color-foreground-muted` |
| `quiet` | Sans bruit visuel (border-only ou ghost) | `--button-ghost-*` variant |

### `glow` vs `accent` vs `emphasized`

| Terme | Sens |
|---|---|
| `glow` | Effet lumineux périphérique (drop-shadow + radial) |
| `accent` | Couleur principale du DS (rouge fusée) |
| `emphasized` | Mis en avant typographiquement (poids, taille) |

## 2. Variants CVA canoniques (rappel obligatoire)

Tout composant à variants utilise ces noms (jamais `kind`, `style`, `appearance`, `mode`, etc.) :

- `variant` — forme visuelle
- `size` — échelle
- `tone` — tonalité sémantique
- `state` — état de contrôle
- `density` — contexte spatial
- `surface` — niveau d'élévation (raised | elevated | overlay | flat)
- `radius` — coin (none | sm | md | lg | full)

## 3. Spacings et rythmes

### Rhythm vs gap vs padding

| Terme | Sens | Token |
|---|---|---|
| `rhythm` | Espacement vertical entre paragraphes/sections | `--space-rhythm-{xs,sm,md,lg,xl}` |
| `gap` | Espace entre items dans un flex/grid | Tailwind `gap-*` consomme `--space-*` |
| `padding` | Espace intérieur d'un conteneur | Tailwind `p-*` consomme `--space-*` |

### Inline vs block

Use logical properties partout (RTL-ready) :
- `padding-inline-start` (≠ `padding-left`)
- `padding-inline-end` (≠ `padding-right`)
- `margin-block-start` (≠ `margin-top`)
- `margin-block-end` (≠ `margin-bottom`)

## 4. Anatomy slots canoniques

| Composant | Slots |
|---|---|
| `Card` | `header`, `body`, `footer`, `actions` |
| `Form` | `label`, `field`, `helper`, `error`, `actions` |
| `Modal/Dialog` | `header` (title + close), `body`, `footer` (actions) |
| `Sheet` | `header`, `body`, `footer` |
| `Toast` | `icon`, `body` (title + description), `actions`, `close` |
| `EmptyState` | `icon`, `title`, `description`, `cta` |
| `PageHeader` | `breadcrumb`, `title`, `description`, `actions` |
| `Stepper` | `step` (number + label), `connector`, `content` |
| `Pricing tier` | `header` (name + tagline), `price-block`, `inclusions` (list), `cta`, `badge` (recommended/featured) |

## 5. États de feedback

| État | Tone | Couleur |
|---|---|---|
| `success` | success | `--color-success` (vert) |
| `warning` | warning | `--color-warning` (ambre) |
| `error` | error | `--color-error` (rouge accent) |
| `info` | info | `--color-info` (bleu) |
| `neutral` | neutral | `--color-foreground-muted` |

## 6. Densité

| `data-density` | Padding card | Gap | Font scale | Cas d'usage |
|---|---|---|---|---|
| `compact` | 12px | 8px | 0.95× | Console (1000+ rows) |
| `comfortable` | 20px | 16px | 1.0× | Cockpit / Agency / Creator |
| `airy` | 32px | 24px | 1.05× | Auth / Intake / Public |
| `editorial` | clamp(24,3vw,40)px | 32px | 1.1× | Landing |

## 7. Z-index nommés (jamais magique)

| Token | Valeur | Usage |
|---|---|---|
| `--z-base` | 0 | Contenu de page |
| `--z-sticky` | 60 | Headers sticky internes |
| `--z-topbar` | 80 | Topbar global |
| `--z-popover` | 90 | Popover, tooltip ancrés |
| `--z-modal-backdrop` | 95 | Backdrop modale |
| `--z-modal` | 100 | Dialog, Sheet, Drawer |
| `--z-mestor` | 110 | Mestor floating panel |
| `--z-command` | 120 | Cmd+K palette |
| `--z-toast` | 130 | Toast notifications |

Toute valeur z-index hardcodée dans `*.tsx` est interdite. Test bloquant `tests/unit/governance/design-tokens-canonical.test.ts`.

## 8. Mots qui drift souvent (à canoniser)

| Drift | Forme canonique |
|---|---|
| `inactive` | `disabled` ou `quiet` selon contexte |
| `selected-row` | `current` (location) ou `highlighted` (filter result) |
| `pressed` | `active` |
| `accent-color` | `--color-accent` |
| `light-text` / `dark-text` | `--color-foreground` (panda mono-mode) |
| `gray-text` / `zinc-text` | `--color-foreground-muted` |
| `cta-bg` | `--button-primary-bg` (Tier 2) |
| `border-light` | `--color-border-subtle` |

## 9. Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon vivant
- [DESIGN-TOKEN-MAP.md](DESIGN-TOKEN-MAP.md) — inventaire exhaustif tokens
- [LEXICON.md](LEXICON.md) — vocabulaire métier (parallèle)
