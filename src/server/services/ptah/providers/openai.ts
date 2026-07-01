/**
 * OpenAI Images provider — génération d'image SYNCHRONE.
 *
 * Décision opérateur 2026-06-30 : « l'API de génération d'image, c'est OpenAI
 * exclusivement ». Provider canonique pour `forgeKind` image/icon (cf.
 * provider-selector). Auth : `OPENAI_API_KEY` (même clé que le LLM Gateway).
 *
 * Modèle : `gpt-image-1` (vérifié en live sur le compte opérateur — dall-e-2/3
 * indisponibles, `response_format` rejeté). L'API renvoie **b64 uniquement**.
 * Surchargeable via `OPENAI_IMAGE_MODEL`.
 *
 * SYNCHRONE (pas de webhook) : `forge()` appelle l'API, persiste l'image et pose
 * l'URL résultat dans `providerTaskId` ; `sync=true` fait que `materializeBrief`
 * réconcilie inline. `reconcile()` écho l'URL.
 *
 * Persistance du b64 (dual-mode) :
 *   - `BLOB_STORAGE_PUT_URL_TEMPLATE` set → PUT binaire (même mécanisme que le
 *     download-archiver) → URL durable légère ;
 *   - sinon → data URL `data:image/png;base64,…` self-contained (marche
 *     out-of-box, jsPDF/`<img>` l'affichent ; lourd → brancher le blob storage
 *     en prod). Aucune dépendance storage requise pour démarrer.
 */

import { createHash } from "node:crypto";
import type { ForgeBrief, ForgeProvider } from "../types";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

const VALID_QUALITY = new Set(["low", "medium", "high", "auto"]);

/**
 * Modèle : `gpt-image-1` = 1K (défaut opérateur). `gpt-image-2` = passe **2K**
 * (même prompt) quand l'opérateur valide le rendu 1K et veut la haute résolution.
 * Pilotable par `parameters.model` (explicite) ou `parameters.resolution="2K"`.
 */
function resolveModel(brief: ForgeBrief): string {
  const p = brief.forgeSpec.parameters ?? {};
  if (typeof p.model === "string" && p.model.trim()) return p.model.trim();
  if (p.resolution === "2K") return "gpt-image-2";
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
}

function resolvePrompt(brief: ForgeBrief): string {
  const p = brief.forgeSpec.parameters?.prompt;
  if (typeof p === "string" && p.trim()) return p.trim();
  return (brief.briefText ?? "").trim() || "Visuel de marque, direction artistique premium.";
}

function resolveSize(brief: ForgeBrief): string {
  const p = brief.forgeSpec.parameters ?? {};
  // Confiance au caller (OpenAI valide la taille selon le modèle). Défaut : 1K,
  // ou 2K (2048²) en passe haute résolution.
  if (typeof p.size === "string" && p.size.trim()) return p.size.trim();
  return p.resolution === "2K" ? "2048x2048" : "1024x1024";
}

function is2K(brief: ForgeBrief): boolean {
  return resolveModel(brief) === "gpt-image-2" || brief.forgeSpec.parameters?.resolution === "2K";
}

function resolveQuality(brief: ForgeBrief): string {
  const q = brief.forgeSpec.parameters?.quality;
  return typeof q === "string" && VALID_QUALITY.has(q) ? q : "medium";
}

/** Persiste un buffer image : blob storage si configuré, sinon data URL. */
async function persistImage(buffer: Buffer): Promise<string> {
  const template = process.env.BLOB_STORAGE_PUT_URL_TEMPLATE;
  if (template) {
    try {
      const hash = createHash("sha256").update(buffer).digest("hex");
      const target = template.replace(/\{hash\}/g, hash);
      const put = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(buffer),
      });
      if (put.ok) return target;
    } catch {
      /* fall through to data URL */
    }
  }
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * Références image (conditionnement) portées par `parameters.referenceImageUrls`
 * — URLs http(s) OU data URLs. Cœur du système de dépendance du case study :
 * chaque planche est forgée À PARTIR des assets verrouillés précédents (identité
 * → pack → KV → déclinaisons) au lieu de les réinventer.
 */
function resolveReferenceUrls(brief: ForgeBrief): string[] {
  const raw = brief.forgeSpec.parameters?.referenceImageUrls;
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

/** Charge une référence image : data URL décodée, sinon fetch http(s). */
async function fetchRefBuffer(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenAI Images: référence inaccessible ${res.status} ${url.slice(0, 80)}`);
  }
  return res.arrayBuffer();
}

class OpenAIImagesProvider implements ForgeProvider {
  readonly name = "openai" as const;
  readonly externalDomains = ["api.openai.com"];
  readonly sync = true;

  estimateCost(brief: ForgeBrief): number {
    // gpt-image-1 (USD/image, ~1024²) : low ≈ 0.02 / medium ≈ 0.06 / high ≈ 0.20.
    const q = resolveQuality(brief);
    const base = q === "low" ? 0.02 : q === "high" ? 0.2 : 0.06;
    const sizeFactor = resolveSize(brief) === "1024x1024" ? 1 : 1.5;
    const resFactor = is2K(brief) ? 4 : 1; // passe 2K gpt-image-2 ≈ ×4
    return Math.round(base * sizeFactor * resFactor * 1000) / 1000;
  }

  async forge(brief: ForgeBrief, _webhookUrl?: string) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI Images: OPENAI_API_KEY manquant (forge différée attendue via isAvailable).");
    }
    const model = resolveModel(brief);
    const refUrls = resolveReferenceUrls(brief);

    // Reference-conditioned (image + prompt → image cohérente) via /v1/images/edits
    // quand des références sont fournies (case study : identité/pack/KV verrouillés) ;
    // sinon text-to-image via /v1/images/generations (planches de fondation).
    const res = refUrls.length > 0
      ? await this.editWithReferences(key, model, brief, refUrls)
      : await fetch(OPENAI_IMAGES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt: resolvePrompt(brief),
            n: 1,
            size: resolveSize(brief),
            quality: resolveQuality(brief),
            // gpt-image-1 renvoie du b64 par défaut ; `response_format` est rejeté.
          }),
        });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI Images ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    const b64 = item?.b64_json;
    // Compat : si un modèle/endpoint renvoyait une URL, on l'utilise telle quelle.
    const url = item?.url ?? (b64 ? await persistImage(Buffer.from(b64, "base64")) : undefined);
    if (!url) {
      throw new Error("OpenAI Images: réponse sans image (ni b64_json ni url).");
    }
    return {
      // Sync : le providerTaskId EST l'URL/data-URL résultat (lu par reconcile()).
      providerTaskId: url,
      providerModel: model,
      estimatedCostUsd: this.estimateCost(brief),
      webhookSecret: "",
    };
  }

  /**
   * /v1/images/edits (multipart) — conditionne la génération sur 1..16 images de
   * référence (`image[]`) + le prompt. gpt-image-1/2 supportent l'input image
   * (vérifié en live). Verrouille la cohérence visuelle entre planches du case
   * study (« enrichir, pas réinventer »).
   */
  private async editWithReferences(
    key: string,
    model: string,
    brief: ForgeBrief,
    refUrls: string[],
  ): Promise<Response> {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", resolvePrompt(brief));
    fd.append("n", "1");
    fd.append("size", resolveSize(brief));
    fd.append("quality", resolveQuality(brief));
    for (const u of refUrls.slice(0, 16)) {
      const buf = await fetchRefBuffer(u);
      fd.append("image[]", new Blob([buf], { type: "image/png" }), "ref.png");
    }
    return fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
  }

  async reconcile(providerTaskId: string, _webhookPayload?: unknown) {
    // Sync : `forge()` a déjà posé l'URL/data-URL dans `providerTaskId`.
    return {
      resultUrls: providerTaskId ? [providerTaskId] : [],
      realisedCostUsd: 0,
      completedAt: new Date(),
    };
  }

  verifyWebhook(_req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean {
    return false; // pas de webhook (provider synchrone)
  }

  async isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY);
  }
}

export const openaiImagesProvider = new OpenAIImagesProvider();
