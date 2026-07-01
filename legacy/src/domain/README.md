# `src/domain` — Layer 0

Pure domain primitives. Single source of truth for ADVERTIS pillars, strategy
lifecycle, touchpoints, and intent progress events.

## Hard rules

1. **Zero side-effect imports.** Only `zod`. No Prisma, no tRPC, no NextAuth,
   no LLM SDK, no React, no `fs`, no `http`.
2. **Zero hardcoded pillar enums elsewhere in the codebase.** The lint rule
   `lafusee/no-hardcoded-pillar-enum` catches `["A","D","V","E","R","T","I","S"]`
   and similar literals outside this directory.
3. **Two pillar surfaces, one source.** Canonical (uppercase, `PILLAR_KEYS`)
   for Zod and IntentLog. Storage (lowercase, `PILLAR_STORAGE_KEYS`) for the
   DB column `Pillar.key` and the legacy `AdvertisVector` type. Use the
   `toCanonical()` / `toStorage()` helpers at boundaries.
4. **Intent progress is a contract.** `IntentProgressEvent` is the shape NSP
   streams to the client (Phase 5). UI components (`<ArtemisExecutor>`,
   `<OracleEnrichmentTracker>`, …) consume only this type — never an ad-hoc
   Mestor-internal event shape.

## Adding a new domain primitive

Add a new file. Re-export from `index.ts`. Add a test under `__tests__/`.
Done. **Never** import from a higher layer to enrich a domain primitive — if
it needs DB or LLM context, it does not belong here.
