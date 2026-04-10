/**
 * Contracts Loader — Lazy-loads and caches the maturity contracts.
 * Imports the Glory registry at first call to derive COMPLETE stage requirements.
 */

import type { PillarMaturityContract } from "@/lib/types/pillar-maturity";
import { buildContracts } from "@/lib/types/pillar-maturity-contracts";

let _contracts: Record<string, PillarMaturityContract> | null = null;

/**
 * Get all pillar maturity contracts (lazy-initialized on first call).
 * The COMPLETE stage is derived from the Glory registry at load time.
 */
export function getContracts(): Record<string, PillarMaturityContract> {
  if (!_contracts) {
    // Dynamic require to avoid circular dependency at module init
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ALL_GLORY_TOOLS } = require("@/server/services/glory-tools/registry");
    _contracts = buildContracts(ALL_GLORY_TOOLS);
  }
  return _contracts;
}

/**
 * Get contract for a single pillar.
 */
export function getContract(pillarKey: string): PillarMaturityContract | null {
  return getContracts()[pillarKey.toLowerCase()] ?? null;
}

/**
 * Force re-derivation (useful in tests or after registry changes).
 */
export function resetContracts(): void {
  _contracts = null;
}
