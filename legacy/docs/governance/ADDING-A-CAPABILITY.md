# Adding a capability

Three commands and you're done.

```bash
npm run manifests:scaffold -- --service=notoria --name=runDiagnostic
# fill in the input/output schemas + body in the generated stub
npm run manifests:gen
npm test -- runDiagnostic
```

The scaffold creates / patches:

- `src/server/services/<service>/manifest.ts` (or appends a capability)
- `src/server/services/<service>/<name>.ts` (stub implementation)
- `tests/unit/<service>/<name>.test.ts` (placeholder)

After scaffolding, three things stay your responsibility:

1. **Schemas** — replace the empty Zod schemas in the manifest with the
   real input/output. The runtime registry validates manifests at boot.
2. **Side-effects array** — declare every category your code touches
   (`DB_WRITE`, `LLM_CALL`, `EXTERNAL_API`, …). Plugin sandbox uses this
   list (Phase 2.7).
3. **Quality / cost tier** — if your capability calls an LLM, set
   `qualityTier` and `latencyBudgetMs`. Gateway v5 routes accordingly.

## Hooking it into Mestor

If your capability is reachable through an Intent:

1. Add the kind to `src/server/governance/intent-kinds.ts`.
2. Declare it in `acceptsIntents` of your manifest.
3. Register a handler in `src/server/governance/intent-versions.ts` (call
   from `bootstrap.ts`).

The router-layer call shape becomes:

```ts
import { governedProcedure } from "@/server/governance/governed-procedure";
import { z } from "zod";

export const myMutation = governedProcedure({
  kind: "MY_INTENT",
  inputSchema: z.object({ strategyId: z.string() }),
}).mutation(async ({ ctx, input }) => {
  // ctx.intentId is populated; the IntentEmission row already exists.
  return /* … */;
});
```

## External plugin

```bash
npm run manifests:scaffold -- \
  --service=loyalty-extension \
  --name=computeScore \
  --external-plugin \
  --target=./plugins/loyalty-extension
```

The generated folder has its own `package.json` depending on
`@lafusee/sdk` (Phase 8). At boot, La Fusée scans `plugins/*/manifest.ts`
in addition to the core; sandbox enforces declared `sideEffects`.

## Acceptance gate

Your capability is "shipped" when:

- [ ] manifest registered (`npm run manifests:audit` clean)
- [ ] capability listed in `manifests-inventory` (cron drift output)
- [ ] tests green (`npm test`)
- [ ] phase label set on PR (`phase/<n>` per
  [REFACTOR-CODE-OF-CONDUCT.md](REFACTOR-CODE-OF-CONDUCT.md))
- [ ] Intent kind has an SLO row in
  [`src/server/governance/slos.ts`](../../src/server/governance/slos.ts)
  (unless explicitly exempted)
