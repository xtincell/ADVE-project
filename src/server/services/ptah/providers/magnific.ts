/**
 * Magnific (ex-Freepik) provider — REST async + webhooks.
 *
 * Surface : génération image (Mystic, Flux, Imagen, Nano Banana Pro, Seedream),
 * édition (Magnific Upscaler Creative+Precision, Relight, Style Transfer,
 * Inpainting Ideogram, Outpainting Flux/Ideogram/Seedream, Change Camera, BG Removal),
 * vidéo (Kling, Veo, Runway, Hailuo, LTX, PixVerse, WAN, Seedance),
 * audio (TTS, voice clone, SFX, lip-sync, SAM Audio isolation),
 * icônes (text-to-icon PNG/SVG), stock 250M+, AI classifier, image-to-prompt.
 *
 * Auth : header `x-freepik-api-key: $FREEPIK_API_KEY`. Compatibilité ancien
 * endpoint api.freepik.com et nouveau api.magnific.com (rebrand avril 2026).
 *
 * Cf. ADR-0009 §Providers.
 */

import { applyDynamicMultiplier, estimateCostForModel } from "../pricing";
import type { ForgeBrief, ForgeProvider } from "../types";

const MAGNIFIC_BASE = process.env.MAGNIFIC_BASE_URL ?? "https://api.freepik.com";

// ── Endpoint mapping (ForgeKind × modelHint → URL path) ───────────────

const ENDPOINTS: Record<string, string> = {
  // Image generation
  "image:mystic": "/v1/ai/mystic",
  "image:nano-banana-pro": "/v1/ai/gemini-2-5-flash-image-preview",
  "image:flux-2-pro": "/v1/ai/flux-pro/v1.1",
  "image:imagen-4-ultra": "/v1/ai/imagen3",
  "image:seedream-4": "/v1/ai/seedream-4",
  "image:hyperflux": "/v1/ai/hyperflux",
  "image:ideogram-3": "/v1/ai/ideogram",
  // Image edit
  "refine:magnific-upscale-creative": "/v1/ai/image-upscaler",
  "refine:magnific-upscale-precision": "/v1/ai/image-upscaler",
  "refine:magnific-relight": "/v1/ai/image-relight",
  "refine:magnific-style-transfer": "/v1/ai/image-style-transfer",
  // Transform
  "transform:ideogram-inpaint": "/v1/ai/ideogram-image-edit",
  "transform:flux-pro-outpaint": "/v1/ai/image-expand/flux-pro",
  "transform:ideogram-outpaint": "/v1/ai/image-expand/ideogram",
  "transform:seedream-outpaint": "/v1/ai/image-expand/seedream-v4-5",
  "transform:image-change-camera": "/v1/ai/image-change-camera",
  "transform:image-bg-removal": "/v1/ai/beta/remove-background",
  // Video
  "video:kling-3": "/v1/ai/kling-v3",
  "video:veo-3-1": "/v1/ai/veo-3-1",
  "video:runway-gen4-5": "/v1/ai/runway-gen-4-5",
  "video:wan-2-7": "/v1/ai/wan-2-7",
  "video:minimax-hailuo-2-3": "/v1/ai/minimax-hailuo-2-3",
  "video:ltx-2-pro": "/v1/ai/ltx-2-pro",
  "video:ltx-2-fast": "/v1/ai/ltx-2-fast",
  "video:pixverse-v5": "/v1/ai/pixverse-v5",
  "video:seedance-pro": "/v1/ai/seedance-pro",
  // Audio
  "audio:tts-standard": "/v1/ai/text-to-speech",
  "audio:tts-premium": "/v1/ai/text-to-speech",
  "audio:voice-clone": "/v1/ai/voice-cloning",
  "audio:sound-effects": "/v1/ai/sound-effects",
  "audio:lip-sync": "/v1/ai/lip-sync",
  "audio:sam-audio-isolation": "/v1/ai/audio-isolation",
  // Icon
  "icon:text-to-icon": "/v1/ai/text-to-icon",
  // Classifier (sync)
  "classify:ai-classifier": "/v1/ai/classifier/image",
  "classify:image-to-prompt": "/v1/ai/image-to-prompt",
  "classify:improve-prompt": "/v1/ai/improve-prompt",
  // Stock (lookup)
  "stock:resources": "/v1/resources",
  "stock:icons": "/v1/icons",
};

const DEFAULT_MODEL_BY_KIND: Record<string, string> = {
  image: "mystic",
  refine: "magnific-upscale-creative",
  transform: "image-bg-removal",
  video: "kling-3",
  audio: "tts-standard",
  icon: "text-to-icon",
  classify: "ai-classifier",
  stock: "resources",
  design: "", // Adobe/Figma/Canva — pas Magnific
};

// ── Provider impl ─────────────────────────────────────────────────────

class MagnificProvider implements ForgeProvider {
  readonly name = "magnific" as const;
  readonly externalDomains = [
    "api.freepik.com",
    "api.magnific.com",
    "cdn.freepik.com",
  ];

  estimateCost(brief: ForgeBrief): number {
    const model = this.resolveModel(brief);
    const base = estimateCostForModel("magnific", model);
    return applyDynamicMultiplier(base, brief);
  }

  async forge(brief: ForgeBrief, webhookUrl?: string) {
    const apiKey = this.requireApiKey();
    const model = this.resolveModel(brief);
    const endpoint = ENDPOINTS[`${brief.forgeSpec.kind}:${model}`];
    if (!endpoint) {
      throw new Error(
        `Magnific: no endpoint for kind=${brief.forgeSpec.kind} model=${model}`,
      );
    }

    const body: Record<string, unknown> = {
      prompt: brief.briefText,
      ...brief.forgeSpec.parameters,
    };
    if (webhookUrl) body.webhook_url = webhookUrl;

    const url = new URL(endpoint, MAGNIFIC_BASE).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-freepik-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Magnific ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data?: { task_id?: string; status?: string } };
    const providerTaskId = json.data?.task_id ?? "";
    if (!providerTaskId) {
      throw new Error(`Magnific response missing task_id: ${JSON.stringify(json)}`);
    }

    return {
      providerTaskId,
      providerModel: model,
      estimatedCostUsd: this.estimateCost(brief),
      // webhookSecret est généré par task-store.ts en amont — Magnific n'a pas de
      // signature HMAC documentée. Mitigation : webhookSecret unique par task,
      // injecté dans webhookUrl en query param, vérifié côté Ptah.
      webhookSecret: "",
    };
  }

  async reconcile(providerTaskId: string, webhookPayload?: unknown) {
    // Si webhook contient déjà le résultat, on le parse directement.
    if (webhookPayload && typeof webhookPayload === "object") {
      const payload = webhookPayload as {
        status?: string;
        result?: {
          images?: string[];
          videos?: string[];
          audios?: string[];
          generated?: string[];
        };
      };
      if (payload.status === "completed" || payload.status === "COMPLETED") {
        const urls = [
          ...(payload.result?.images ?? []),
          ...(payload.result?.videos ?? []),
          ...(payload.result?.audios ?? []),
          ...(payload.result?.generated ?? []),
        ];
        return {
          resultUrls: urls,
          realisedCostUsd: 0, // Magnific ne renvoie pas le cost dans le webhook — pricing.ts table source.
          completedAt: new Date(),
        };
      }
    }

    // Fallback : poll GET /v1/ai/{tool}/{task_id}
    // Sans le model context on ne peut pas construire l'URL exacte — caller doit
    // fournir webhookPayload depuis route.ts ou polling savant. Phase 1 :
    // throw si payload manquant.
    throw new Error("Magnific reconcile: webhookPayload required (polling fallback Phase 2).");
  }

  verifyWebhook(req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean {
    // Magnific n'a pas de signature HMAC documentée Phase 1. On utilise un
    // secret query param vérifié par route.ts. Cette méthode retourne true
    // si l'expectedSecret existe (assumption : route.ts a déjà extrait + comparé).
    return req.expectedSecret.length > 0;
  }

  async isAvailable() {
    return Boolean(process.env.FREEPIK_API_KEY ?? process.env.MAGNIFIC_API_KEY);
  }

  // ── helpers ───────────────────────────────────────────────────────

  private requireApiKey(): string {
    const key = process.env.FREEPIK_API_KEY ?? process.env.MAGNIFIC_API_KEY;
    if (!key) {
      throw new Error(
        "Magnific provider: FREEPIK_API_KEY (alias MAGNIFIC_API_KEY) not set in env.",
      );
    }
    return key;
  }

  private resolveModel(brief: ForgeBrief): string {
    if (brief.forgeSpec.modelHint) return brief.forgeSpec.modelHint;
    return DEFAULT_MODEL_BY_KIND[brief.forgeSpec.kind] ?? "mystic";
  }
}

export const magnificProvider = new MagnificProvider();
