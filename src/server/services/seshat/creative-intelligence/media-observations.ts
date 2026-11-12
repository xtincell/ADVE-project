/** Authorized media bytes only: bounded downloads and local-only frame extraction. */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";
import { validateGatewayImages, type GatewayImage } from "@/server/services/llm-gateway/vision";

const exec = promisify(execFile);
/** A model cannot attach invented timestamps to frames or supplied text. */
export function annotationFitsCoverage(annotation: { scenes?: unknown[]; transcript?: unknown[]; durationSeconds?: number; evidence: Array<{ startSeconds?: number; endSeconds?: number }> }, coverage: { method: string; frameTimes?: number[]; durationSeconds?: number; audioObserved?: boolean }) {
  if (coverage.method !== "NATIVE_VIDEO" && (annotation.scenes?.length || annotation.transcript?.length)) return false;
  if (coverage.method === "NATIVE_VIDEO" && !coverage.audioObserved && annotation.transcript?.length) return false;
  if (coverage.method === "NATIVE_VIDEO") return annotation.durationSeconds != null && Math.abs(annotation.durationSeconds - (coverage.durationSeconds ?? 0)) <= 0.05 && annotation.evidence.every(e => [e.startSeconds, e.endSeconds].every(t => t == null || t <= coverage.durationSeconds!));
  if (coverage.method !== "SAMPLED_FRAMES") return annotation.durationSeconds == null && annotation.evidence.every(e => e.startSeconds == null && e.endSeconds == null);
  if (annotation.durationSeconds != null && Math.abs(annotation.durationSeconds - (coverage.durationSeconds ?? 0)) > 0.05) return false;
  return annotation.evidence.every(e => [e.startSeconds, e.endSeconds].every(t => t == null || (coverage.frameTimes ?? []).some(frame => Math.abs(frame - t) <= 0.05)));
}
export async function readMediaBytes(response: Response, limit = 25_000_000) {
  if (!response.ok || !response.body || Number(response.headers.get("content-length") ?? 0) > limit) { await response.body?.cancel(); throw new Error("Média indisponible ou trop volumineux."); }
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error("Média trop volumineux."); chunks.push(value); }
    return Buffer.concat(chunks);
  } finally { await reader.cancel().catch(() => {}); }
}
export function sampledFrameTimes(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 300) throw new Error("Vidéo hors limites : durée maximale de cinq minutes.");
  return [...new Set([0, Math.min(1, durationSeconds / 4), Math.min(2, durationSeconds / 2), ...[0.25, 0.5, 0.75, 0.95].map(f => Math.round(durationSeconds * f * 1000) / 1000)])].sort((a, b) => a - b);
}
const probeSchema = z.object({ format: z.object({ duration: z.string() }), streams: z.array(z.object({ codec_type: z.string(), width: z.number().optional(), height: z.number().optional() })) });
export async function extractMediaObservations(bytes: Buffer, mediaType: string, nativeVideo = false) {
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  if (["image/jpeg", "image/png"].includes(mediaType)) {
    if (nativeVideo) throw new Error("Le mode audiovisuel exige une vidéo MP4.");
    const image = { bytes, mediaType: mediaType as GatewayImage["mediaType"] }; validateGatewayImages([image]);
    return { contentHash, images: [image], coverage: { method: "SINGLE_IMAGE" as const, frameTimes: [0], audioObserved: false } };
  }
  // Only an MP4 container, never an HLS playlist or a remote URL passed to ffmpeg.
  if (mediaType !== "video/mp4" || bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp") throw new Error("Format accepté : MP4, JPEG ou PNG.");
  const dir = await mkdtemp(join(tmpdir(), "creative-observations-"));
  try {
    const file = join(dir, "input.mp4"); await writeFile(file, bytes, { mode: 0o600 });
    const common = ["-protocol_whitelist", "file,pipe", "-threads", "1", "-max_alloc", "67108864"];
    const probe = await exec("ffprobe", ["-v", "error", ...common, "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", file], { timeout: 10000, maxBuffer: 20000 });
    const parsed = probeSchema.parse(JSON.parse(probe.stdout));
    if (!parsed.streams.some(s => s.codec_type === "video")) throw new Error("Aucune piste vidéo.");
    if (parsed.streams.some(s => s.codec_type === "video" && (!s.width || !s.height || s.width > 4096 || s.height > 4096))) throw new Error("Dimensions vidéo hors limites.");
    const durationSeconds = Number(parsed.format.duration), times = sampledFrameTimes(durationSeconds);
    if (nativeVideo) {
      if (bytes.length > 20_000_000) throw new Error("Vidéo native limitée à vingt Mo.");
      const hasAudio = parsed.streams.some(s => s.codec_type === "audio");
      return { contentHash, images: undefined, video: { bytes, mediaType: "video/mp4" as const, durationSeconds, hasAudio }, coverage: { method: "NATIVE_VIDEO" as const, durationSeconds, audioObserved: hasAudio, audioEvidence: hasAudio ? "MODEL_OBSERVATION_REQUIRES_REVIEW" : "NO_AUDIO_TRACK" } };
    }
    // One bounded decode; select the first frame at/after each requested time.
    const expression = times.map(t => `gte(t,${t})*lt(prev_selected_t,${t})`).join("+");
    const decoded = await exec("ffmpeg", ["-nostdin", "-v", "info", ...common, "-i", file, "-an", "-vf", `select='isnan(prev_selected_t)+${expression}',scale=512:512:force_original_aspect_ratio=decrease,showinfo`, "-fps_mode", "vfr", "-frames:v", String(times.length), "-q:v", "5", join(dir, "frame-%02d.jpg")], { timeout: 30000, maxBuffer: 100000 });
    const frames = (await readdir(dir)).filter(f => /^frame-\d+\.jpg$/.test(f)).sort();
    // The decoder cannot report a timestamp it did not emit: require all selected frames.
    if (frames.length !== times.length) throw new Error("Échantillonnage vidéo incomplet.");
    const actualTimes = [...decoded.stderr.matchAll(/showinfo[^\n]*pts_time:([+\-\deE.]+)/g)].map(m => Number(m[1])).slice(0, frames.length);
    if (actualTimes.length !== frames.length || actualTimes.some(t => !Number.isFinite(t) || t < 0 || t > durationSeconds)) throw new Error("Repères vidéo indisponibles.");
    const images: GatewayImage[] = await Promise.all(frames.map(async f => ({ bytes: await readFile(join(dir, f)), mediaType: "image/jpeg" as const })));
    validateGatewayImages(images);
    return { contentHash, images, coverage: { method: "SAMPLED_FRAMES" as const, frameTimes: actualTimes, durationSeconds, audioObserved: false } };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
export async function downloadCreativeMedia(url: string) {
  if (new URL(url).protocol !== "https:") throw new Error("Média HTTPS requis.");
  const response = await ssrfSafeFetch(url, { signal: AbortSignal.timeout(20000) });
  const mediaType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!["video/mp4", "image/jpeg", "image/png"].includes(mediaType)) { await response.body?.cancel(); throw new Error("Type de média non pris en charge."); }
  return { bytes: await readMediaBytes(response), mediaType };
}

export async function fetchMediaObservations(url: string, nativeVideo = false) {
  const { bytes, mediaType } = await downloadCreativeMedia(url);
  return extractMediaObservations(bytes, mediaType, nativeVideo);
}
