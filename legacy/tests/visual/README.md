# Visual regression tests (Playwright snapshots)

> Phase 11 PR-4 scaffolding. Activé fully en PR-9.
> Cf. DESIGN-SYSTEM.md §13 + design-patterns/.

## Setup

```bash
npm run test:e2e -- --update-snapshots   # baseline initiale
npm run test:e2e tests/visual/            # run regression
```

## Coverage cible (PR-9)

- Une spec par primitive × variants × sizes × states
- Une spec par scénario (DESIGN-SYSTEM.md §16, 30 scénarios)
- Threshold 0.1% diff
- Run chromium + firefox + webkit

## Specs (à créer)

- `primitives/button.spec.ts`
- `primitives/card.spec.ts`
- `primitives/input.spec.ts`
- `primitives/badge.spec.ts`
- `primitives/dialog.spec.ts`
- `scenarios/auth-login.spec.ts`
- `scenarios/intake-stepper.spec.ts`
- `scenarios/score-reveal.spec.ts`
- `scenarios/cockpit-dashboard.spec.ts`
- `scenarios/console-intents.spec.ts`
- `scenarios/landing.spec.ts`
- (etc.)

Chromatic en complément (cf. `chromatic.config.json` + `.github/workflows/chromatic.yml`).
