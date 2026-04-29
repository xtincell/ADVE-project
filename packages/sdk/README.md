# @lafusee/sdk

Public SDK for **La Fusée Industry OS** — APOGEE framework.

```bash
npm install @lafusee/sdk
```

## Quick start

```ts
import { createLaFuseeClient } from "@lafusee/sdk";

const client = createLaFuseeClient({
  baseUrl: "https://lafusee.com",
  apiToken: process.env.LAFUSEE_API_TOKEN,
});

// Get market-localized pricing for a tier.
const price = await client.getPrice({ tierKey: "ORACLE_FULL", countryCode: "CM" });
// → { tier: "ORACLE_FULL", display: "39 000 FCFA", currencyCode: "XAF", ... }

// Get the full funnel grid (free → PDF → Oracle → Cockpit → Retainer).
const grid = await client.getTierGrid({ countryCode: "FR" });

// Check OS health.
const status = await client.getStatus();
```

## Types

The SDK exports stable types for the OS surface:

- `PillarKey` (`"A" | "D" | ... | "S"`)
- `BrandTier` (`"ZOMBIE" | ... | "ICONE"`)
- `Brain` (Neteru identifier)
- `ResolvedPrice`, `PricingTier`, `IntentEmission`, `StrategySummary`

See [src/types.ts](src/types.ts) for the full surface.

## Versioning

Semver-strict. Breaking changes require major bump. Aligned with the `APOGEE` framework version exposed via `/status`.

## License

UNLICENSED — use restricted to UPgraders partner network. Contact the OS maintainers for commercial licensing.
