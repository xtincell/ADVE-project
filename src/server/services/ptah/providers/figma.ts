/**
 * Figma provider — REST API + Variables API.
 *
 * Surface : read mockups (file parsing), write Variables (Design System tokens),
 * export assets (PNG/SVG/PDF d'un node Figma).
 *
 * Auth : Personal Access Token (PAT) header `X-Figma-Token` ou OAuth 2.0.
 * Phase 1 utilise PAT (plus simple) ; OAuth peut être branché Phase E ultérieure.
 *
 * Cas d'usage Ptah :
 *   - "design" forge avec providerHint=figma : ingest mockup Figma → asset
 *   - export Design System tokens vers Variables (cf. DESIGN-SYSTEM-PLAN.md)
 */

import { applyDynamicMultiplier, estimateCostForModel } from "../pricing";
import type { ForgeBrief, ForgeProvider } from "../types";

const FIGMA_BASE = "https://api.figma.com";

const DEFAULT_MODEL_BY_KIND: Record<string, string> = {
  design: "figma-export-asset",
  image: "figma-export-asset",
  // pas pour video/audio/etc
};

class FigmaProvider implements ForgeProvider {
  readonly name = "figma" as const;
  readonly externalDomains = ["api.figma.com"];

  estimateCost(brief: ForgeBrief): number {
    const model = this.resolveModel(brief);
    const base = estimateCostForModel("figma", model);
    return applyDynamicMultiplier(base, brief);
  }

  async forge(brief: ForgeBrief, _webhookUrl?: string) {
    const token = this.requireToken();
    const fileKey = brief.forgeSpec.parameters.fileKey as string | undefined;
    const nodeId = brief.forgeSpec.parameters.nodeId as string | undefined;
    if (!fileKey) {
      throw new Error("Figma forge: parameters.fileKey required");
    }

    // Cas: export d'un node spécifique en PNG
    if (nodeId) {
      const params = new URLSearchParams({
        ids: nodeId,
        format: (brief.forgeSpec.parameters.format as string) ?? "png",
        scale: String(brief.forgeSpec.parameters.scale ?? 2),
      });
      const url = `${FIGMA_BASE}/v1/images/${fileKey}?${params.toString()}`;
      const res = await fetch(url, { headers: { "X-Figma-Token": token } });
      if (!res.ok) {
        throw new Error(`Figma export ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as { images?: Record<string, string> };
      const imageUrl = json.images?.[nodeId] ?? "";
      // Figma export = synchrone : retour direct avec URL signée S3
      return {
        providerTaskId: `figma-${fileKey}-${nodeId}-${Date.now()}`,
        providerModel: this.resolveModel(brief),
        estimatedCostUsd: this.estimateCost(brief),
        webhookSecret: imageUrl, // hack synchrone : on stocke l'URL pour reconcile immédiat
      };
    }

    throw new Error("Figma forge: nodeId required for export operations");
  }

  async reconcile(providerTaskId: string, _webhookPayload?: unknown) {
    // Figma export est synchrone — la URL est déjà connue (stockée dans webhookSecret hack ci-dessus).
    // Phase 2 : meilleur design (renvoyer URL directement de forge() en bypass async).
    return {
      resultUrls: [],
      realisedCostUsd: 0,
      completedAt: new Date(),
    };
  }

  verifyWebhook(_req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean {
    // Figma webhooks supportent file_update events mais pas pour génération.
    return false;
  }

  async isAvailable() {
    return Boolean(process.env.FIGMA_PAT);
  }

  private requireToken(): string {
    const token = process.env.FIGMA_PAT;
    if (!token) {
      throw new Error("Figma provider: FIGMA_PAT not set in env.");
    }
    return token;
  }

  private resolveModel(brief: ForgeBrief): string {
    if (brief.forgeSpec.modelHint) return brief.forgeSpec.modelHint;
    return DEFAULT_MODEL_BY_KIND[brief.forgeSpec.kind] ?? "figma-export-asset";
  }
}

export const figmaProvider = new FigmaProvider();
