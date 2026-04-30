# DESIGN-I18N — Contrats internationalisation

> Marché cible : Afrique francophone créative + extensions (`fr-FR`, `en-US`, `wo-SN` (wolof Sénégal), `sw-KE` (swahili Kenya), futur `ar-MA` (arabe Maroc) → RTL).
> Le DS est **RTL-ready** et **font-scaling-200%-ready** dès PR-5, validé par `tests/i18n/**`.

## 1. Direction (LTR / RTL)

### Logical properties (jamais directional)

```css
/* ❌ INTERDIT */
padding-left: 16px;
margin-right: 8px;
border-left: 1px solid;
text-align: left;

/* ✅ CANONIQUE */
padding-inline-start: 16px;
margin-inline-end: 8px;
border-inline-start: 1px solid;
text-align: start;
```

Tailwind 4 : utiliser `ps-4` (`padding-inline-start`), `pe-4`, `ms-2`, `me-2`, `start-0`, `end-0` au lieu de `pl-4`, `pr-4`, `ml-2`, `mr-2`, `left-0`, `right-0`.

### Test bloquant (PR-9)

```ts
// tests/i18n/rtl/*.spec.ts
test("Sidebar in RTL flips to right", async ({ page }) => {
  await page.goto("/cockpit");
  await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  // Vérifier que sidebar passe à droite, content à gauche, breadcrumb inversé
  const sidebar = page.locator('[data-component="sidebar"]');
  await expect(sidebar).toHaveCSS("inset-inline-start", "0px");
});
```

### Anti-patterns interdits

| ❌ | ✅ |
|---|---|
| `pl-4 pr-2` | `ps-4 pe-2` |
| `left-0` | `start-0` |
| `text-left` | `text-start` |
| `border-l border-r` | `border-s border-e` |
| `ml-auto` | `ms-auto` |
| `rotate(0deg)` (icons "next") | `rotate(0deg)` LTR + `rotate(180deg)` RTL via `[dir="rtl"]` |

### Icons à miroirer en RTL

Icons directionnelles : `ChevronRight`, `ChevronLeft`, `ArrowRight`, `ArrowLeft`, `MoveRight`, `Send` (souvent), `LogOut`, `LogIn`.

```tsx
// primitives/icon.tsx
<Icon name="chevron-right" mirrorOnRtl />
// → ajoute `[dir="rtl"] & { transform: scaleX(-1); }` via class utility
```

Pattern Tailwind : utiliser `rtl:rotate-180` ou classe utility custom `mirror-rtl`.

### Icons à NE PAS miroirer

`Search`, `Heart`, `Star`, `Bookmark`, icons de logos, icons sémantiques fixes (Sun, Moon, Clock).

## 2. Font scaling 200%

### Cible

Utilisateur zoom à 200% (`html { font-size: 200%; }` ou system preference). **Aucun overflow horizontal**, **aucune truncation**, **aucun overlap**.

### Règles

1. **Pas de hauteur fixe en `px`** sur les conteneurs de texte. Utiliser `min-height` + `padding`.
2. **Container queries** sur les cards qui dépendent de leur largeur (`@container (min-width: ...)`).
3. **Word-wrap & overflow-wrap** : `overflow-wrap: anywhere` sur les copy longs (URLs, hashs, dates).
4. **Line-clamp prudent** : si `line-clamp-2`, fournir tooltip avec full text.
5. **Touch targets minimum 44×44px** maintenus même à zoom 200%.

### Test bloquant (PR-9)

```ts
// tests/i18n/font-scaling/*.spec.ts
test("Cockpit dashboard at 200% font scale has no overflow", async ({ page }) => {
  await page.goto("/cockpit");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  // Vérifier aucun overflow horizontal sur la page
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
  // Snapshot visuel
  await expect(page).toHaveScreenshot("cockpit-200%.png");
});
```

## 3. Pluralization

### `Intl.PluralRules` natif (jamais ad-hoc)

```ts
// src/lib/i18n/plural.ts
export function plural(count: number, locale: string, forms: { one: string; other: string; few?: string; many?: string }) {
  const rule = new Intl.PluralRules(locale).select(count);
  return forms[rule] ?? forms.other;
}

// Usage
const text = plural(missions.length, "fr-FR", {
  one: "1 mission",
  other: `${missions.length} missions`,
});
```

`fr-FR` règles : `one` (0,1) / `other` (≥2).
`ar-MA` règles : `zero` / `one` / `two` / `few` (3-10) / `many` (11-99) / `other`.

## 4. Number / currency formatting

### `Intl.NumberFormat` natif

```ts
new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(50000);
// → "50 000 FCFA"

new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(125);
// → "$125.00"
```

### Currencies marché cible

| Locale | Currency | Symbol |
|---|---|---|
| `fr-CI` Côte d'Ivoire | XOF | FCFA |
| `fr-SN` Sénégal | XOF | FCFA |
| `fr-CM` Cameroun | XAF | FCFA |
| `fr-NG` Nigéria* | NGN | ₦ |
| `en-GH` Ghana | GHS | GH₵ |
| `en-ZA` Afrique du Sud | ZAR | R |
| `fr-FR` (HQ) | EUR | € |
| `en-US` | USD | $ |

*Nigéria majoritairement anglophone — locale principale `en-NG`.

### Anti-patterns

- ❌ Concaténer manuellement `{amount} FCFA` → utiliser `Intl.NumberFormat`
- ❌ Hardcoder `,` ou `.` séparateur → varie par locale
- ❌ Hardcoder devise → toujours via le param

## 5. Date / time formatting

### `Intl.DateTimeFormat` natif

```ts
new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
// → "30 avr. 2026, 17:42"

new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" }).format(-2, "day");
// → "avant-hier"
```

## 6. Strings

### Aucune string hardcodée dans `src/components/**`

Toutes les strings UI passent par `useT()` (à créer en PR-9 — Phase 11 inclut `src/lib/i18n/`).

```tsx
const t = useT();
return <h1>{t("cockpit.dashboard.title")}</h1>;
```

Pour PR-1 à 8, on accepte les strings inline en `fr-FR` (locale par défaut), avec un test `tests/i18n/string-coverage.test.ts` qui liste les strings non-extractables (warning, pas blocking).

### Format strings

Toujours utiliser ICU MessageFormat pour interpolations :

```ts
t("creator.missions.count", { count: missions.length });
// → fichier locale fr-FR.json :
// "creator.missions.count": "{count, plural, one {1 mission disponible} other {# missions disponibles}}"
```

## 7. Format scaling — typographie

### Fluid type tolérant

Le scale fluid clamp() de [DESIGN-SYSTEM.md §8](DESIGN-SYSTEM.md) est compatible avec font-scaling utilisateur car il utilise `vw` + `rem`, jamais `px` fixe.

```css
--text-base: clamp(15px, 0.9vw + 0.7rem, 17px);
/* Avec html { font-size: 200% } → 0.7rem = 22.4px → resté lisible */
```

## 8. Tests

### Coverage

| Test | Cible |
|---|---|
| `tests/i18n/rtl/{primitive,scenario}.spec.ts` | 0 overflow/overlap en `dir="rtl"` |
| `tests/i18n/font-scaling/{primitive,scenario}.spec.ts` | 0 overflow/truncation à `font-size: 200%` |
| `tests/i18n/string-coverage.test.ts` | Aucune string hardcodée hors `primitives/**` (warning PR-3, blocking PR-9) |
| `tests/i18n/intl-coverage.test.ts` | Toute date/number/plural utilise `Intl.*` (blocking PR-9) |

## 9. Anti-patterns interdits

- `padding-left/right`, `margin-left/right`, `border-left/right` → logical properties
- `text-align: left/right` → `start/end`
- Strings concaténées `+` au lieu de `Intl.MessageFormat`
- Currency hardcodée `${amount} €` → `Intl.NumberFormat({ style: "currency", currency })`
- Pluriel ad-hoc `${n} mission${n > 1 ? "s" : ""}` → `Intl.PluralRules`
- `width: 240px` sur conteneur texte → utiliser `min-width` ou `max-width: 60ch`

## 10. Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon vivant §8 fluid type
- [DESIGN-A11Y.md](DESIGN-A11Y.md) — touch targets, contraste
- [Tailwind 4 RTL docs](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [WAI Internationalization](https://www.w3.org/International/questions/qa-rtl-stylesheets)
