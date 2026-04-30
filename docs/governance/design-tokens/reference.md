# design-tokens/reference.md — Tier 0 Reference Tokens

> Palette brute, **immuable hors ADR**. Modifier un Reference token = ADR obligatoire.
> Source runtime : [src/styles/tokens/reference.css](../../../src/styles/tokens/reference.css).
> Test bloquant : `tests/unit/governance/design-tokens-coherence.test.ts` (chaque var ↔ entrée ici).

## Rappel cascade

Tier 0 (ce fichier) → Tier 1 [system.md](system.md) → Tier 2 [component.md](component.md) → Tier 3 [domain.md](domain.md).

Aucun composant ne consomme un Reference token directement. Test bloquant `design-tokens-cascade.test.ts`.

---

## Surfaces panda (anti-réflexion, neutre 60° hue)

| Variable | OKLCH | Hex (≈) | WCAG ratio vs `--ref-bone` |
|---|---|---|---|
| `--ref-ink-0` | `oklch(0.08 0.005 60)` | `#0a0a0a` | 16.0 (AAA) |
| `--ref-ink-1` | `oklch(0.11 0.005 60)` | `#121212` | 15.1 (AAA) |
| `--ref-ink-2` | `oklch(0.14 0.005 60)` | `#1a1a1a` | 13.4 (AAA) |
| `--ref-ink-3` | `oklch(0.17 0.005 60)` | `#222222` | 11.6 (AAA) |
| `--ref-ink-line` | `oklch(0.21 0.005 60)` | `#2a2a2a` | 9.6 (AAA) |
| `--ref-ink-line-muted` | `oklch(0.16 0.005 60)` | `#1f1f1f` | 12.1 (AAA) |
| `--ref-mute-2` | `oklch(0.31 0.005 60)` | `#4a4a4a` | 6.0 (AA) |
| `--ref-mute` | `oklch(0.45 0.005 60)` | `#6b6b6b` | 4.7 (AA) |

**Sémantique** : `ink-0` = bg page, `ink-1` à `ink-3` = stratification surfaces (raised → elevated → overlay), `ink-line*` = borders, `mute*` = foreground muted.

---

## Foreground bone (chaud, 80° hue)

| Variable | OKLCH | Hex (≈) | WCAG ratio vs `--ref-ink-0` |
|---|---|---|---|
| `--ref-bone` | `oklch(0.95 0.015 80)` | `#f5f1ea` | 16.0 (AAA) |
| `--ref-bone-2` | `oklch(0.91 0.020 80)` | `#e8e2d6` | 13.8 (AAA) |
| `--ref-bone-3` | `oklch(0.81 0.025 80)` | `#c9c3b6` | 9.4 (AAA) |

**Sémantique** : `bone` = text primaire, `bone-2` = brightened (rare emphasis), `bone-3` = text secondaire.

---

## Accent rouge fusée (signature, 25° hue)

| Variable | OKLCH | Hex (≈) | WCAG ratio vs `--ref-ink-0` | WCAG vs `--ref-bone` |
|---|---|---|---|---|
| `--ref-rouge` | `oklch(0.62 0.22 25)` | `#e63946` | 5.1 (AA) | 3.1 (AA Large) |
| `--ref-rouge-2` | `oklch(0.68 0.22 25)` | `#ff4d5e` | 6.4 (AAA) | 2.5 (AA Large only) |
| `--ref-rouge-deep` | `oklch(0.50 0.20 25)` | `#b8232f` | 3.4 (AA Large) | 4.7 (AA) |
| `--ref-ember` | `oklch(0.72 0.20 40)` | `#ff6b3d` | 7.0 (AAA) | 2.3 (AA Large only) |

**Sémantique** : `rouge` = accent default, `rouge-2` = hover, `rouge-deep` = active/pressed, `ember` = secondaire chaud (alarmes Console, particles hero).

**Note WCAG** : le rouge accent sur fond `--ref-bone` ne passe pas AA pour body text. Usage : uniquement labels courts (badges, eyebrows mono) ou icônes — pas de paragraphes de copy en rouge. Test `design-tokens-canonical.test.ts` vérifie l'absence d'usage problématique.

---

## Statuts

| Variable | OKLCH | Hex (≈) | Hue | Usage |
|---|---|---|---|---|
| `--ref-green` | `oklch(0.72 0.18 145)` | `#4ade80` | vert | success |
| `--ref-amber` | `oklch(0.78 0.16 80)` | `#f59e0b` | ambre | warning |
| `--ref-blue` | `oklch(0.68 0.16 240)` | `#5fa8e8` | bleu | info |

**WCAG vs ink-0** : tous AA (≥6:1).

---

## Sectoriel homéopathique

| Variable | OKLCH | Hex (≈) | Usage |
|---|---|---|---|
| `--ref-gold` | `oklch(0.74 0.14 80)` | `#d4a24c` | tier-maitre Creator + classification ICONE uniquement |

**Règle** : `--ref-gold` est interdit hors `--tier-maitre` et `--classification-icone`. Réserve son sens "patrimonial / apex". Test `design-no-dead-tokens` whitelist ces 2 usages.

---

## Modification

Modifier un token Reference nécessite un **ADR** (cf. [ADR-0013](../adr/0013-design-system-panda-rouge.md) modèle). Justification + impact + tests visuels avant/après obligatoires.

**Exemples valides** de modification ADR-driven :
- Ajustement teinte rouge si études contraste daltonisme révèlent un défaut
- Ajout d'un Reference token (ex: `--ref-blue-deep` si besoin info active) — nécessite ADR + propagation Tier 1+
- Suppression d'un Reference token inutilisé (test `design-no-dead-tokens` aide à détecter)

**Exemples invalides** (rejet en review) :
- Changer `--ref-rouge` à mi-projet sans ADR
- Ajouter `--ref-purple` "pour avoir du choix" sans use case Tier 1+ documenté
- Hardcoder un nouvel hex dans un composant en disant "j'ai pas le temps de faire le token"
