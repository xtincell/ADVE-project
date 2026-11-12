/** Native audiovisual transport, called exclusively from the governed LLM Gateway. */
import { z } from "zod";

export interface GatewayVideo { bytes: Uint8Array; mediaType: "video/mp4"; durationSeconds: number; hasAudio: boolean }
export function videoConfiguration() {
  const model = process.env.LLM_VIDEO_MODEL?.trim();
  // Explicitly selected OpenRouter video-capable model; no text or image fallback.
  return process.env.LLM_VIDEO_PROVIDER === "openrouter" && model?.startsWith("google/gemini-") && process.env.OPENROUTER_API_KEY
    ? { provider: "openrouter" as const, model } : null;
}
export function validateGatewayVideo(video: GatewayVideo) {
  if (video.mediaType !== "video/mp4" || video.bytes.length < 12 || video.bytes.length > 20_000_000 || Buffer.from(video.bytes).toString("ascii", 4, 8) !== "ftyp" || !Number.isFinite(video.durationSeconds) || video.durationSeconds <= 0 || video.durationSeconds > 300) throw new Error("Vidéo native hors limites (MP4, vingt Mo, cinq minutes).");
}
const responseSchema = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }), finish_reason: z.string().nullable().optional() })).min(1), usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative(), cost: z.number().finite().nonnegative().optional() }) });
export async function callNativeVideo(options: { system: string; prompt: string; caller: string; maxOutputTokens?: number; signal?: AbortSignal }, video: GatewayVideo, model: string) {
  validateGatewayVideo(video);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", redirect: "error", signal: options.signal ?? AbortSignal.timeout(90000),
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, max_tokens: options.maxOutputTokens ?? 6000, temperature: 0,
      provider: { allow_fallbacks: false }, response_format: { type: "json_object" },
      messages: [{ role: "system", content: options.system }, { role: "user", content: [{ type: "text", text: options.prompt }, { type: "video_url", video_url: { url: `data:video/mp4;base64,${Buffer.from(video.bytes).toString("base64")}` } }] }],
    }),
  });
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error(`Fournisseur audiovisuel indisponible (${response.status}).`); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 1_000_000) throw new Error("Réponse audiovisuelle trop volumineuse."); chunks.push(next.value); } }
  finally { await reader.cancel().catch(() => {}); }
  const payload = responseSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  if (payload.choices[0]!.finish_reason !== "stop") throw new Error("Réponse audiovisuelle incomplète.");
  return { text: payload.choices[0]!.message.content, usage: { inputTokens: payload.usage.prompt_tokens, outputTokens: payload.usage.completion_tokens }, reportedCostUsd: payload.usage.cost ?? null };
}
