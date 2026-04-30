# DESIGN-A11Y — Contrats accessibilité

> Niveau cible : **WCAG 2.1 AA minimum** sur l'ensemble du DS. AAA sur le body text (panda offre nativement 16:1 ratio).
> Vérifié par `tests/a11y/**` (`@axe-core/playwright`) — 0 violation critique/sérieuse autorisée à merge.

## 1. Contraste

### Ratios cibles

| Surface | Foreground | Background | Ratio | WCAG |
|---|---|---|---|---|
| Body text | `--ref-bone` (oklch 0.95) | `--ref-ink-0` (oklch 0.08) | ≈16:1 | **AAA** |
| Secondary | `--ref-bone-3` (oklch 0.81) | `--ref-ink-0` | ≈10:1 | **AAA** |
| Muted | `--ref-mute` (oklch 0.45) | `--ref-ink-0` | ≈4.7:1 | AA |
| Accent on dark | `--ref-rouge` (oklch 0.62) | `--ref-ink-0` | ≈5:1 | AA |
| Accent on bone | `--ref-bone` | `--ref-rouge` | ≈4.6:1 | AA |

### Tests

```bash
# Audit automatique des combinaisons tokens (PR-1)
npx tsx scripts/audit-design-contrast.ts

# Visual regression sur viewer Console (PR-9)
# /console/governance/design-system affiche tous les tokens avec contrast ratio
```

## 2. Focus visible

### Règles

1. **Tout élément interactif** (button, link, input, checkbox, radio, switch, tab, select option) reçoit un focus ring visible quand `:focus-visible`.
2. **Outline 2px solid `--color-ring`** (rouge fusée) + `outline-offset: 2px` + `border-radius` matching le composant.
3. **Jamais `outline: none`** sans replacement visible (test bloquant PR-9).
4. **Skip link** en début de chaque layout portail : `<a href="#main">Aller au contenu</a>` (PR-5).

### Tokens

```css
@theme {
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: var(--color-ring);  /* rouge fusée */
  --focus-ring-style: solid;
}

:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

## 3. ARIA patterns par primitive

| Primitive | Role / ARIA attributes |
|---|---|
| Button | `<button>` natif. `aria-pressed` si toggle. `aria-disabled` si disabled. `aria-busy` si loading. `aria-label` si icon-only. |
| Card interactive | `<button>` ou `<a>` natif. `role="article"` si pure display. |
| Input | `<input>` + `<label for>` matché. `aria-invalid="true"` si erreur. `aria-describedby` pointant helper/error. |
| Checkbox / Radio / Switch | `<input type="...">` natif + label. `aria-checked` géré par le navigateur. |
| Modal/Dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (titre), `aria-describedby` (body), focus trap, ESC close, return focus. |
| Sheet | `role="dialog"`, `aria-modal="true"` (sheet-right) ou `false` (sheet non-modal), idem focus trap. |
| Tooltip | `role="tooltip"`, `aria-describedby` sur le trigger, ouverture sur hover/focus, fermeture sur blur/ESC. |
| Popover | `role="dialog"` non-modal, focus management, `aria-expanded` sur trigger. |
| Tabs | `role="tablist"`, `role="tab"` × N, `role="tabpanel"` × N, `aria-selected`, `aria-controls`, keyboard arrow nav. |
| Accordion | `<button aria-expanded="...">` + `<div role="region">` + ID matched. |
| Toast | `role="status"` (info/success) ou `role="alert"` (error), `aria-live="polite"` ou `assertive`. |
| Stepper | `<ol>` + `<li>` avec `aria-current="step"` sur l'étape active. |
| Breadcrumb | `<nav aria-label="Fil d'Ariane">` + `<ol>` + dernier item `aria-current="page"`. |
| Pagination | `<nav aria-label="Pagination">` + `<button aria-current="page">` sur active. |
| Command palette | `role="combobox"` sur input + `role="listbox"` sur résultats + `aria-activedescendant`. |
| DataTable | `<table>` + `<caption>` + `<th scope>`. Tri : `aria-sort="ascending|descending|none"`. |
| Skeleton | `aria-busy="true"` sur container, `aria-label="Chargement..."`. |
| RadarChart | `<svg role="img" aria-label="Score ADVE-RTIS X/200, palier ...">` + table fallback offscreen pour SR. |

## 4. Keyboard navigation

| Pattern | Comportement |
|---|---|
| Sidebar items | Tab order linéaire, ⏎/Space active |
| Topbar Cmd+K | Cmd/Ctrl+K ouvre command palette |
| Sidebar Cmd+B | Cmd/Ctrl+B toggle collapse |
| Mestor Cmd+. | Cmd/Ctrl+. toggle Mestor panel |
| Modal/Dialog | ESC ferme. Tab/Shift+Tab cycle dans focus trap. ⏎ submit (form-modal). |
| Tabs | ←→ change tab, Home/End saut début/fin |
| Accordion | ⏎/Space toggle, ↑↓ entre summaries |
| Radio group | ↑↓ ←→ change selection (sans Tab — RadioGroup pattern WAI) |
| Checkbox list | Tab entre items, Space toggle |
| Stepper | Tab cycle entre les étapes accessibles, ⏎ active |
| Command palette | ↑↓ navigate results, ⏎ select, ESC close |
| Toast | Tab pour atteindre actions, ESC dismiss (toast persistent) |
| DataTable | Tab cycle entre row actions, ←→ sur cells (advanced — PR-9) |

## 5. Screen reader

### Hidden text utilities

```tsx
<span className="sr-only">Texte uniquement pour SR</span>
```

Tailwind 4 fournit `sr-only` natif. Cas d'usage :
- Icon-only buttons : `<button aria-label="Fermer"><X /></button>` ou `<button><X /><span className="sr-only">Fermer</span></button>`
- Tableaux dense : caption descriptive
- RadarChart : table fallback

### Live regions

```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {streamingMessage}
</div>
```

Cas : Mestor streaming, intent emission live, score reveal, toast notifications.

`aria-live="polite"` (default) — annonce après pause utilisateur.
`aria-live="assertive"` — annonce immédiate (réservé aux erreurs critiques).

## 6. Préférences utilisateur

| Préférence | CSS query | Comportement |
|---|---|---|
| Reduced motion | `@media (prefers-reduced-motion: reduce)` | Animations 1ms, particles off (cf. [DESIGN-MOTION.md](DESIGN-MOTION.md) §4) |
| Reduced data | `@media (prefers-reduced-data: reduce)` | Backdrop-blur off, particles off |
| High contrast | `@media (prefers-contrast: more)` | Borders +1 step strong, foreground bone plus blanc |
| Dark theme | N/A | Panda nativement sombre — pas de toggle |
| Forced colors | `@media (forced-colors: active)` | `border: 1px solid CanvasText` sur bouts critiques (Windows High Contrast Mode) |

## 7. Tests

### `tests/a11y/primitives/*.spec.ts`

```ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Button has no a11y violations", async ({ page }) => {
  await page.goto("/console/governance/design-system#button");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Une spec par primitive × variants × sizes × states. Couverture : 36 primitives × 5 variants moyens = ~180 tests a11y.

### `tests/a11y/scenarios/*.spec.ts`

Une spec par scénario [DESIGN-SYSTEM.md §16](DESIGN-SYSTEM.md) (30 scénarios).

### Threshold CI

`exact: 0` violations critiques + sérieuses. Violations modérées/mineures listées en RESIDUAL-DEBT.md (Tier 2 a11y).

## 8. Anti-patterns interdits

- `outline: none` sans replacement visible
- Click handlers sur `<div>` non-button (utiliser `<button>` ou `role="button"` + tabindex + keyboard handler)
- `aria-label` redondant avec texte visible
- `aria-hidden="true"` sur élément interactif
- `tabindex` positif (>0) — utilise l'ordre du DOM
- Couleur seule pour véhiculer l'info (toujours doubler avec icon ou texte)
- Animations infinites sans pause user (pulses, spinners) → respecter reduced motion
- `placeholder` comme label (utiliser `<label>` toujours)

## 9. Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon vivant
- [DESIGN-MOTION.md](DESIGN-MOTION.md) — reduced motion
- [DESIGN-I18N.md](DESIGN-I18N.md) — RTL + font scaling
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — patterns de référence
