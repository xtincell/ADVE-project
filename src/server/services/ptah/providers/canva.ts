/**
 * Canva Connect provider — gated par flag CANVA_ENABLED (ADR-0009 §Risques).
 *
 * Connect API requires partnership review (2-6 sem onboarding). Phase 1 : code
 * shippé mais désactivé. Activation = `CANVA_ENABLED=true` + credentials valides.
 *
 * Auth : OAuth 2.0 authorization code flow (multi-user) + Connect API tokens.
 * Phase 1 : assume stockage des tokens utilisateur dans `oauth-integrations`.
 */

import { applyDynamicMultiplier, estimateCostForModel } from "../pricing";
import type { ForgeBrief, ForgeProvider } from "../types";

const CANVA_BASE = "https://api.canva.com/rest";

const DEFAULT_MODEL_BY_KIND: Record<string, string> = {
  design: "canva-template-render",
  image: "canva-design-export",
};

class CanvaProvider implements ForgeProvider {
  readonly name = "canva" as const;
  readonly externalDomains = ["api.canva.com"];

  estimateCost(brief: ForgeBrief): number {
    const model = this.resolveModel(brief);
    const base = estimateCostForModel("canva", model);
    return applyDynamicMultiplier(base, brief);
  }

  async forge(brief: ForgeBrief, _webhookUrl?: string) {
    if (!this.isEnabled()) {
      throw new Error(
        "Canva provider: CANVA_ENABLED=false (gated par partnership onboarding). Voir ADR-0009 §Risques.",
      );
    }
    const token = this.requireUserToken(brief);
    const designId = brief.forgeSpec.parameters.designId as string | undefined;
    if (!designId) {
      throw new Error("Canva forge: parameters.designId required");
    }

    // Export design API (sync-ish — renvoie un job ID à poll)
    const url = `${CANVA_BASE}/v1/exports`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        design_id: designId,
        format: { type: (brief.forgeSpec.parameters.format as string) ?? "png" },
      }),
    });
    if (!res.ok) {
      throw new Error(`Canva export ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { job?: { id?: string } };
    return {
      providerTaskId: json.job?.id ?? "",
      providerModel: this.resolveModel(brief),
      estimatedCostUsd: this.estimateCost(brief),
      webhookSecret: "",
    };
  }

  async reconcile(providerTaskId: string, _webhookPayload?: unknown) {
    if (!this.isEnabled()) {
      throw new Error("Canva provider disabled (CANVA_ENABLED=false)");
    }
    // Polling le job — Canva n'a pas de webhook public (utilise polling)
    // Phase 1 : stub — le caller fait le polling externe
    return {
      resultUrls: [],
      realisedCostUsd: 0,
      completedAt: new Date(),
    };
  }

  verifyWebhook(_req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean {
    return false;
  }

  async isAvailable() {
    return this.isEnabled() && Boolean(process.env.CANVA_CLIENT_ID);
  }

  private isEnabled(): boolean {
    return process.env.CANVA_ENABLED === "true";
  }

  private requireUserToken(_brief: ForgeBrief): string {
    // Phase 1 : assume token stocké dans oauth-integrations table par operator.
    // Pour skeleton, on lit env var — en prod, récupérer via oauth-integrations.findToken(operatorId, "canva").
    const token = process.env.CANVA_USER_TOKEN_DEV;
    if (!token) {
      throw new Error(
        "Canva provider: user token not configured (Phase 1 stub via CANVA_USER_TOKEN_DEV ; Phase 2 via oauth-integrations).",
      );
    }
    return token;
  }

  private resolveModel(brief: ForgeBrief): string {
    if (brief.forgeSpec.modelHint) return brief.forgeSpec.modelHint;
    return DEFAULT_MODEL_BY_KIND[brief.forgeSpec.kind] ?? "canva-template-render";
  }
}

export const canvaProvider = new CanvaProvider();
