# Accessibility tests (axe-core/playwright)

> Phase 11 PR-4 scaffolding. Activé fully en PR-9.
> Cf. DESIGN-A11Y.md §7.

## Setup

```bash
npm install --save-dev @axe-core/playwright
npm run test:a11y
```

## Threshold

- 0 violation critique/sérieuse
- Violations modérées/mineures listées en RESIDUAL-DEBT.md (Tier 2 a11y)

## Specs (à créer PR-9)

- `primitives/*.spec.ts` — chaque primitive × variants
- `scenarios/*.spec.ts` — scénarios complets (DESIGN-SYSTEM.md §16)
