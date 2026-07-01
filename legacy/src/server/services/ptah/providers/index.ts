/**
 * Provider registry — tous les providers Ptah indexés par nom.
 */

import { adobeProvider } from "./adobe";
import { canvaProvider } from "./canva";
import { figmaProvider } from "./figma";
import { magnificProvider } from "./magnific";
import { openaiImagesProvider } from "./openai";
import type { ForgeProvider, ProviderName } from "../types";

export const PROVIDERS: Record<ProviderName, ForgeProvider> = {
  magnific: magnificProvider,
  adobe: adobeProvider,
  figma: figmaProvider,
  canva: canvaProvider,
  openai: openaiImagesProvider,
};

export function getProvider(name: ProviderName): ForgeProvider {
  const p = PROVIDERS[name];
  if (!p) {
    throw new Error(`Ptah: unknown provider "${name}"`);
  }
  return p;
}
