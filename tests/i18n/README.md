# i18n tests (RTL + font-scaling 200%)

> Phase 11 PR-4 scaffolding. Activé fully en PR-9.
> Cf. DESIGN-I18N.md §1-2 et §8.

## Setup

```bash
npm run test:i18n
```

## Coverage cible

- `rtl/{primitive,scenario}.spec.ts` — `dir="rtl"` injecté, 0 overflow/overlap
- `font-scaling/{primitive,scenario}.spec.ts` — `font-size: 200%`, 0 truncation/clipping
- `string-coverage.test.ts` — aucune string hardcodée hors `primitives/**`
- `intl-coverage.test.ts` — toute date/number/plural utilise `Intl.*`
