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
 * un reçu matériel séparé de l’identifiant fournisseur ; `sync=true` fait que `materializeBrief`
 * réconcilie inline. `reconcile()` écho l'URL.
 *
 * Persistance du b64 (dual-mode) :
 *   - `BLOB_STORAGE_PUT_URL_TEMPLATE` set → PUT binaire (même mécanisme que le
 *     download-archiver) → URL durable légère ;
 *   - sinon → data URL `data:image/png;base64,…` self-contained (marche
 *     out-of-box, jsPDF/`<img>` l'affichent ; lourd → brancher le blob storage
 *     en prod). Aucune dépendance storage requise pour démarrer.
 */

import { runWithRateLimit } from "@/server/services/llm-gateway/rate-policy";
import { persistImage } from "./image-storage";
import type { ProductionArtwork } from "@/domain/production-artwork";
import { createHash } from "node:crypto";
import type { ForgeBrief, ForgeProvider } from "../types";

function imageRelay() {
  return process.env.OPENAI_TEXT_RELAY_URL && process.env.OPENAI_TEXT_RELAY_TOKEN
    ? { url: process.env.OPENAI_TEXT_RELAY_URL.replace(/\/$/, ""), token: process.env.OPENAI_TEXT_RELAY_TOKEN } : null;
}

// The existing Dan relay caps the entire UTF-8 JSON request at eight MiB.
const RELAY_MAX_BODY_BYTES = 8 * 1024 * 1024;
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
  return process.env.OPENAI_IMAGE_MODEL ?? (imageRelay() ? "gpt-image-2" : "gpt-image-1");
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
async function fetchReferenceImage(url: string): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const buf = Buffer.from(b64, "base64");
    const mimeType = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(url)?.[1] ?? "image/png";
    return {bytes:buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,mimeType};
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenAI Images: référence inaccessible ${res.status} ${url.slice(0, 80)}`);
  }
  return {bytes:await res.arrayBuffer(),mimeType:res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"};
}

/** Only relay-owned fixed messages and enumerated codes may enter a receipt. */
async function safeImageFailure(response: Response): Promise<string> {
  const generic="Le moteur a refusé la génération avec les références sélectionnées.";
  if(!response.headers.get("content-type")?.includes("application/json"))return generic;
  try {
    const declared=Number(response.headers.get("content-length") ?? 0);
    if(declared>16_384)return generic;
    const reader=response.body?.getReader();
    if(!reader)return generic;
    const chunks:Uint8Array[]=[]; let total=0;
    try {
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.length;
        if(total>16_384){await reader.cancel();return generic;}
        chunks.push(value);
      }
    } finally {reader.releaseLock();}
    const data=JSON.parse(Buffer.concat(chunks).toString("utf8")) as {error?:{code?:string;message?:string}};
    const codes:Record<string,string>={
      oauth_worker_failed:"Le processus OAuth n’a pas terminé correctement.",
      oauth_timeout:"Le relais a atteint son délai d’attente.", local_busy:"Tous les créneaux du relais sont occupés.",
      rate_limit_exceeded:"Le fournisseur applique une limite de débit.",insufficient_quota:"Le fournisseur signale un quota insuffisant.",
      request_size:"La requête dépasse la taille acceptée par le relais.",
    };
    const messages:Record<string,string>={
      "Image stream failed":"Le flux de génération a signalé un échec avant la fin.",
      "Image stream ended without one completed image":"Le flux s’est terminé sans image complète.",
      "Image carrier model mismatch":"Le modèle reçu ne correspond pas à celui demandé.",
    };
    const code=data?.error?.code || "",msg=data?.error?.message || "";
    return Object.hasOwn(codes,code) ? codes[code]! : Object.hasOwn(messages,msg) ? messages[msg]! : generic;
  } catch {return generic;}
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

  async forge(brief: ForgeBrief, _webhookUrl?: string, artwork?: {original:Buffer;slot:ProductionArtwork;taskId:string}) {
    if ((brief.forgeSpec.parameters.productionArtwork !== undefined) !== Boolean(artwork) || (artwork && artwork.slot.photoPolicy!=="GENERATED_CANDIDATE"))
      throw new Error("Le master de production doit être reçu avant la génération de l’illustration.");
    if(artwork){
      const {artworkPhotoGuide}=await import("../artwork-master");
      const guide=await artworkPhotoGuide(artwork.original,artwork.slot);
      brief={...brief,forgeSpec:{...brief.forgeSpec,parameters:{...brief.forgeSpec.parameters,size:guide.size,prompt:resolvePrompt(brief)+"\n\n"+guide.prompt}}};
    }
    const relay = imageRelay();
    const key = relay?.token ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI Images: OPENAI_API_KEY manquant (forge différée attendue via isAvailable).");
    }
    const model = resolveModel(brief);
    const refUrls = resolveReferenceUrls(brief);
    const pins = brief.forgeSpec.parameters.productionReferences;
    if (pins !== undefined && (!Array.isArray(pins) || !pins.length || pins.length !== refUrls.length))
      throw new Error("Les références visuelles du coffre doivent être reçues avant la génération.");

    // Reference-conditioned (image + prompt → image cohérente) via /v1/images/edits
    // quand des références sont fournies (case study : identité/pack/KV verrouillés) ;
    // sinon text-to-image via /v1/images/generations (planches de fondation).
    const res = relay ? await runWithRateLimit("gpt-5.6-luna", async () => {
      if (!await this.isAvailable()) throw new Error("La génération d’images n’est pas encore raccordée au service de production.");
      const referenceImages = await Promise.all(refUrls.slice(0, 16).map(async url => {
        const {bytes,mimeType} = await fetchReferenceImage(url);
        return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
      }));
      const body = JSON.stringify({ model, prompt: resolvePrompt(brief), n: 1, size: resolveSize(brief), quality: resolveQuality(brief), referenceImages });
      if (Buffer.byteLength(body) > RELAY_MAX_BODY_BYTES)
        throw new Error("Le brief et ses images dépassent les 8 Mio du relais Luna. Sélectionnez moins de références ou des versions plus légères.");
      return fetch(`${relay.url}/images/generations`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body, signal: AbortSignal.timeout(330_000) });
    }) : refUrls.length > 0
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
      // A provider may echo its input in an error. Never persist private reference bytes in a failure trace.
      const detail = pins !== undefined || artwork || refUrls.length ? await safeImageFailure(res) : await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI Images ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    const b64 = item?.b64_json;
    // Compat : si un modèle/endpoint renvoyait une URL, on l'utilise telle quelle.
    let url: string | undefined;
    if (artwork) {
      let photo:Buffer;
      if(b64) photo=Buffer.from(b64,"base64");
      else if(item?.url) {
        const {ssrfSafeFetch}=await import("@/lib/net/ssrf-guard");
        const {readMediaBytes}=await import("@/server/services/seshat/creative-intelligence/media-observations");
        const response=await ssrfSafeFetch(item.url,{signal:AbortSignal.timeout(20_000)});
        if(!response.ok)throw new Error("La photo générée n’est pas accessible pour le montage.");
        photo=await readMediaBytes(response,25_000_000);
      } else throw new Error("La génération n’a pas fourni la photo attendue.");
      const {composeArtworkWithLayer}=await import("../artwork-master");
      const composition=await composeArtworkWithLayer(artwork.original,artwork.slot,photo);
      if(!composition.photoLayer)throw new Error("Le montage n’a pas restitué son calque photo.");
      const {retainArtworkLayer}=await import("../artwork-layer");
      await retainArtworkLayer(artwork.taskId,artwork.slot,composition.photoLayer,createHash("sha256").update(photo).digest("hex"),model);
      url=await persistImage(composition.png);
    } else url=item?.url ?? (b64 ? await persistImage(Buffer.from(b64, "base64")) : undefined);
    if (!url) {
      throw new Error("OpenAI Images: réponse sans image (ni b64_json ni url).");
    }
    return {
      // The image can exceed PostgreSQL's btree entry limit. Its bytes belong in
      // the non-indexed result receipt, never in the provider identity.
      providerTaskId: `openai-image:${createHash("sha256").update(url).digest("hex")}`,
      synchronousResult: { resultUrls: [url], realisedCostUsd: 0 },
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
      const {bytes,mimeType} = await fetchReferenceImage(u);
      fd.append("image[]", new Blob([bytes], {type:mimeType}), "ref."+(mimeType.split("/")[1] || "png"));
    }
    return fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
  }

  async reconcile(providerTaskId: string, _webhookPayload?: unknown) {
    if (providerTaskId.startsWith("openai-image:")) throw new Error("Le reçu synchrone de l’image doit être relu depuis la tâche conservée.");
    // Legacy URL receipts remain readable; new synchronous receipts are persisted with the task.
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
    const relay = imageRelay();
    if (!relay) return Boolean(process.env.OPENAI_API_KEY);
    try {
      const response = await fetch(relay.url.replace(/\/v1$/, "") + "/health", { signal: AbortSignal.timeout(3000) });
      const health = await response.json() as { images?: boolean };
      return response.ok && health.images === true;
    } catch { return false; }
  }
}

export const openaiImagesProvider = new OpenAIImagesProvider();
