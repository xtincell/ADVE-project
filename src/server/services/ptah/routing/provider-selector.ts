/**
 * Provider selector — choisit le provider selon brief + disponibilité + coût.
 *
 * Stratégie :
 *   1. Si brief.forgeSpec.providerHint et provider disponible → use it
 *   2. Sinon, mapper par forgeKind vers le provider canonique
 *   3. Fail si tous les providers candidats sont indisponibles (circuit OPEN)
 */

import { PROVIDERS, getProvider } from "../providers";
import { getProviderHealth } from "../task-store";
import type { ForgeBrief, ForgeKind, ForgeProvider, ProviderName } from "../types";

const KIND_TO_PROVIDER: Record<ForgeKind, ProviderName[]> = {
  // image → Magnific d'abord (95% surface), Adobe Firefly fallback
  image: ["magnific", "adobe"],
  refine: ["magnific"],
  transform: ["magnific"],
  video: ["magnific"],
  audio: ["magnific"],
  icon: ["magnific"],
  classify: ["magnific"],
  stock: ["magnific"],
  // design → Figma + Adobe + Canva (préférer Figma car free + REST simple)
  design: ["figma", "adobe", "canva"],
};

export class NoAvailableProviderError extends Error {
  constructor(public readonly kind: ForgeKind, public readonly tried: ProviderName[]) {
    super(
      `Ptah: no available provider for forge kind "${kind}" (tried: ${tried.join(", ")}). Check API keys + ForgeProviderHealth.circuitState.`,
    );
    this.name = "NoAvailableProviderError";
  }
}

export async function selectProvider(brief: ForgeBrief): Promise<ForgeProvider> {
  const candidates = brief.forgeSpec.providerHint
    ? [brief.forgeSpec.providerHint, ...KIND_TO_PROVIDER[brief.forgeSpec.kind].filter((p) => p !== brief.forgeSpec.providerHint)]
    : KIND_TO_PROVIDER[brief.forgeSpec.kind];

  for (const name of candidates) {
    const provider = getProvider(name);
    const health = await getProviderHealth(name);
    if (health?.circuitState === "OPEN") {
      const resetAt = health.circuitResetAt;
      if (resetAt && resetAt > new Date()) continue;
    }
    if (await provider.isAvailable()) {
      return provider;
    }
  }
  throw new NoAvailableProviderError(brief.forgeSpec.kind, candidates);
}

export function listProviders(): ForgeProvider[] {
  return Object.values(PROVIDERS);
}
