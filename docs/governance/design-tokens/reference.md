# design-tokens/reference.md — Tier 0 Reference Tokens

> Palette brute, **immuable hors ADR**. Modifier un Reference token = ADR obligatoire.
> Source de vérité : **UPgraders Design System** ([docs/design-system/upgraders/](../../design-system/upgraders/), "La Passion pour Propulseur").
> Source runtime : [src/styles/tokens/reference.css](../../../src/styles/tokens/reference.css).
> ADR : [ADR-0097](../adr/0097-design-system-upgraders-canon.md) (supersedes [ADR-0013](../adr/0013-design-system-panda-rouge.md)).
> Test bloquant : `tests/unit/governance/design-tokens-coherence.test.ts` (chaque `--ref-*` ↔ entrée ici).

## Rappel cascade

Pigments canoniques `--up-*` → alias `--ref-*` (Tier 0, ce fichier) → Tier 1 [system.md](system.md) → Tier 2 [component.md](component.md) → Tier 3 [domain.md](domain.md).

Aucun composant ne consomme un Reference token directement. Test bloquant `design-tokens-cascade.test.ts`.

---

## Pigments canoniques UPgraders (`--up-*`)

Valeurs immuables fournies par le handoff. `semantic.css` / `system.css` les mappent en rôles light/dark. Panda noir + rouge fusée corail `#E56458` + or `#FACC15`.

| Variable | Hex | Rôle |
|---|---|---|
| `--up-red` | `#e56458` | rouge fusée — CTA, accent, brand (coral) |
| `--up-red-hover` | `#ef7d71` | hover |
| `--up-red-active` | `#c8473c` | pressed / deep |
| `--up-red-ember` | `#ff6b3d` | warm secondary, rocket flame |
| `--up-gold` | `#facc15` | niveau / récompense / trophy (bright) |
| `--up-gold-deep` | `#d4a24c` | patrimoine engraved |
| `--up-ink-0` | `#0a0a0a` | deepest page bg / sunken |
| `--up-ink-1` | `#0d0d0d` | primary dark surface (page) |
| `--up-ink-2` | `#151515` | raised card |
| `--up-ink-3` | `#1f1f1f` | elevated / hovered card |
| `--up-ink-4` | `#2e2e2e` | overlay / strong border |
| `--up-line` | `#262626` | hairline border on dark |
| `--up-line-soft` | `#1a1a1a` | subtle border on dark |
| `--up-white` | `#ffffff` | pure white card |
| `--up-bone` | `#f5f4f1` | warm off-white page |
| `--up-bone-2` | `#ece9e3` | sunken / muted light |
| `--up-slate-900` | `#141414` | text on light |
| `--up-slate-700` | `#3a3a3a` | strong secondary on light |
| `--up-slate-500` | `#6b6b6b` | muted text |
| `--up-slate-400` | `#9a9a9a` | faint / placeholder |
| `--up-slate-300` | `#c9c3b6` | secondary text on dark |
| `--up-slate-200` | `#e8e2d6` | brightened fg on dark |
| `--up-green` | `#10b981` | success, growth |
| `--up-blue` | `#3b82f6` | info, web portal |
| `--up-violet` | `#8b5cf6` | creator portal, design |
| `--up-orange` | `#f59e0b` | warning, agency portal |

---

## Surfaces panda (alias `--ref-ink-*`)

| Variable | Hex | Source | WCAG vs `--ref-bone` |
|---|---|---|---|
| `--ref-ink-0` | `#0d0d0d` | `--up-ink-1` | 15.0 (AAA) |
| `--ref-ink-1` | `#151515` | `--up-ink-2` | 13.6 (AAA) |
| `--ref-ink-2` | `#1f1f1f` | `--up-ink-3` | 11.6 (AAA) |
| `--ref-ink-3` | `#2e2e2e` | `--up-ink-4` | 8.5 (AAA) |
| `--ref-ink-line` | `#262626` | `--up-line` | 9.9 (AAA) |
| `--ref-ink-line-muted` | `#1a1a1a` | `--up-line-soft` | 12.9 (AAA) |
| `--ref-mute-2` | `#3a3a3a` | `--up-slate-700` | decorative only |
| `--ref-mute` | `#6b6b6b` | `--up-slate-500` | 4.7 (AA) |

**Sémantique** : `ink-0` = bg page, `ink-1` à `ink-3` = stratification surfaces (raised → elevated → overlay), `ink-line*` = borders, `mute*` = foreground muted.

---

## Foreground bone (alias `--ref-bone-*`)

| Variable | Hex | Source |
|---|---|---|
| `--ref-bone` | `#f5f4f1` | `--up-bone` |
| `--ref-bone-2` | `#e8e2d6` | `--up-slate-200` |
| `--ref-bone-3` | `#c9c3b6` | `--up-slate-300` |

**Sémantique** : `bone` = text primaire, `bone-2` = brightened (rare emphasis), `bone-3` = text secondaire.

---

## Accent rouge fusée corail (alias `--ref-rouge*`)

| Variable | Hex | Source | Usage |
|---|---|---|---|
| `--ref-rouge` | `#e56458` | `--up-red` | accent default (coral) |
| `--ref-rouge-2` | `#ef7d71` | `--up-red-hover` | hover |
| `--ref-rouge-deep` | `#c8473c` | `--up-red-active` | active / pressed |
| `--ref-ember` | `#ff6b3d` | `--up-red-ember` | secondaire chaud (alarmes Console, particles hero) |

**Note WCAG** : le rouge accent sur fond `--ref-bone` ne passe pas AA pour body text. Usage : uniquement labels courts (badges, eyebrows mono), CTA, ou icônes — pas de paragraphes de copy en rouge. Un seul CTA rouge évident par vue. Test `design-tokens-canonical.test.ts` vérifie l'absence d'usage problématique.

---

## Statuts (alias)

| Variable | Hex | Source | Usage |
|---|---|---|---|
| `--ref-green` | `#10b981` | `--up-green` | success |
| `--ref-amber` | `#f59e0b` | `--up-orange` | warning |
| `--ref-blue` | `#3b82f6` | `--up-blue` | info |
| `--ref-violet` | `#8b5cf6` | `--up-violet` | creator / design portal |

---

## Sectoriel homéopathique — or (alias)

| Variable | Hex | Source | Usage |
|---|---|---|---|
| `--ref-gold` | `#facc15` | `--up-gold` | niveau / récompense (gamification APOGEE) + classification ICONE |
| `--ref-gold-deep` | `#d4a24c` | `--up-gold-deep` | patrimoine engraved / tier-maitre |

**Règle** : l'or reste homéopathique — jamais en aplat large. Réserve son sens "niveau / patrimoine / apex".

---

## Modification

Modifier un token Reference nécessite un **ADR** (cf. [ADR-0097](../adr/0097-design-system-upgraders-canon.md)). Justification + impact + tests visuels avant/après obligatoires. La parole du handoff UPgraders prime : tout drift par rapport à [docs/design-system/upgraders/](../../design-system/upgraders/) est une régression.

**Exemples valides** de modification ADR-driven :
- Ajustement teinte si études contraste daltonisme révèlent un défaut
- Ajout d'un Reference token (ex: `--ref-blue-deep`) — nécessite ADR + propagation Tier 1+
- Suppression d'un Reference token inutilisé (test `design-no-dead-tokens` aide à détecter)

**Exemples invalides** (rejet en review) :
- Changer `--ref-rouge` (corail) à mi-projet sans ADR
- Ajouter `--ref-purple` "pour avoir du choix" sans use case Tier 1+ documenté
- Hardcoder un nouvel hex dans un composant
