import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Contracts Loader — Lazy-builds and caches the 8 maturity contracts.
 *
 * The COMPLETE stage is derived from the GLORY registry. The 4 pillars +
 * 4 RTIS pillars all have a contract by construction (`buildContracts`
 * panics if any is missing). No "absent contract" branch — fail loud.
 *
 * Static import of the registry replaces the historic `require()`
 * dynamic load: there is no cycle today (madge clean), and the static
 * form keeps test runners + bundlers happy with TS path aliases.
 */

import type { PillarMaturityContract } from "@/lib/types/pillar-maturity";
import { buildContracts } from "@/lib/types/pillar-maturity-contracts";
import { EXTENDED_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";

const PILLAR_KEYS_LOWER = PILLAR_STORAGE_KEYS;

function build(): Record<string, PillarMaturityContract> {
  const built = buildContracts(EXTENDED_GLORY_TOOLS);
  // Hard invariant: every ADVE-RTIS pillar must have a contract.
  // Anything else is a build-time bug — better to surface at boot than
  // let `pillar-readiness` quietly degrade to "no contract".
  const missing = PILLAR_KEYS_LOWER.filter((k) => !built[k]);
  if (missing.length > 0) {
    throw new Error(
      `pillar-maturity: missing contract(s) for ${missing.join(", ")}. ` +
        `buildContracts() must produce one per ADVE-RTIS pillar — check ` +
        `EXTENDED_GLORY_TOOLS coverage in src/server/services/artemis/tools/registry.ts.`,
    );
  }
  return built;
}

/**
 * Pas de cache — l'introspection Zod est cheap (quelques ms) et le contrat
 * doit refléter en permanence l'état exact des schemas + Glory bindings.
 * Le caching précédent provoquait des régressions silencieuses lors des
 * iterations sur expectedKeys / requiredKeys (HMR Next ne re-évalue pas
 * toujours le module si seuls les imports tiers changent).
 */
export function getContracts(): Record<string, PillarMaturityContract> {
  return build();
}

export function getContract(pillarKey: string): PillarMaturityContract {
  const contract = getContracts()[pillarKey.toLowerCase()];
  if (!contract) {
    // Should be unreachable thanks to the invariant in build().
    throw new Error(`pillar-maturity: no contract for pillar '${pillarKey}'`);
  }
  return contract;
}

/** No-op kept for backward compatibility — caching has been removed. */
export function resetContracts(): void {}
