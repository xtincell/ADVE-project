import { createHash } from "node:crypto";
import sharp from "sharp";
import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";
import { readMediaBytes } from "@/server/services/seshat/creative-intelligence/media-observations";

const maxBytes = 25_000_000;
export const mediaHash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Read the material actually received, never a temporary provider-only URL. */
export async function readReceivedImage(file: { url: string; cdnUrl: string | null; fileSizeBytes: number | null; metadata: unknown }) {
  let bytes: Buffer;
  const inline = /^data:image\/(?:png|jpeg|webp);base64,/.exec(file.url);
  if (inline && file.url.length <= Math.ceil(maxBytes / 3) * 4 + inline[0].length) {
    bytes = Buffer.from(file.url.slice(inline[0].length), "base64");
  } else {
    const hash = (file.metadata as { archiveHash?: string } | null)?.archiveHash;
    if (!file.cdnUrl || !hash || !file.fileSizeBytes || file.fileSizeBytes > maxBytes)
      throw new Error("Le fichier matériel n’a pas encore été reçu dans la banque d’assets.");
    const response = await ssrfSafeFetch(file.cdnUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("Archive indisponible.");
    bytes = await readMediaBytes(response, maxBytes);
    if (bytes.length !== file.fileSizeBytes || mediaHash(bytes) !== hash) throw new Error("L’archive du visuel a changé.");
  }
  const image = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  if (!["png", "jpeg", "webp"].includes(image.format ?? "") || !image.width || !image.height || (image.pages ?? 1) > 1)
    throw new Error("Une image fixe PNG, JPEG ou WebP est nécessaire.");
  return { bytes, contentHash: mediaHash(bytes), width: image.width, height: image.height };
}

/** Deterministic delivery encoding, reviewed BEFORE any network send. No crop. */
export async function encodePublicationImage(bytes: Buffer) {
  const encoded = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toBuffer({ resolveWithObject: true });
  return { bytes: encoded.data, contentHash: mediaHash(encoded.data), width: encoded.info.width,
    height: encoded.info.height, byteLength: encoded.data.length,
    encoding: "jpeg-q95-white-v1" as const, mimeType: "image/jpeg" as const };
}

export function publicationPlacement(format: string | null): "FEED" | "STORIES" | null {
  const name = (format ?? "").trim().toLowerCase();
  if (/^(story|stories|story image)$/.test(name)) return "STORIES";
  if (/^(post|photo|image|feed|static|post statique|publication|image fixe)$/.test(name)) return "FEED";
  return null; // Never silently turn a carousel or video brief into a single feed image.
}
