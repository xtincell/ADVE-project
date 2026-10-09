/** Verified bytes of a chosen public edition, in the existing encrypted store. */
import { createHash, randomBytes } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/lib/db";
import { PublicWebUrl, PUBLIC_BRAND_FORMAT } from "@/domain/public-brand";
import { isBrandPublicSlug } from "@/domain/brand-slug";
import { mediaStoreConfiguration, putEncryptedMedia, getEncryptedMedia } from "@/lib/encrypted-media-store";
import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";
import { resolveBrandDeploymentOrigin } from "@/server/services/brand-theme";

const MAX_LOGO_BYTES = 10_000_000;
const receiptSchema = z.object({
  schema: z.literal("public-brand-media-v1"),
  objectKey: z.string().regex(/^[a-f0-9]{64}$/),
  storage: z.enum(["VOLUME", "HTTP_BLOB"]),
  backendId: z.string().regex(/^[a-f0-9]{64}$/),
  keyId: z.string().regex(/^[a-f0-9]{16}$/),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive().max(MAX_LOGO_BYTES),
  extension: z.enum(["png", "jpg", "webp", "svg"]),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
  receivedAt: z.string().datetime(),
}).strict();
export type PublicLogoReceipt = z.infer<typeof receiptSchema>;
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export function publicLogoReceipt(metadata: unknown): PublicLogoReceipt | null {
  const value = metadata && typeof metadata === "object" && "logoArchive" in metadata ? metadata.logoArchive : null;
  return value == null ? null : receiptSchema.parse(value);
}

async function sourceBytes(rawUrl: string): Promise<Buffer> {
  const url = new URL(PublicWebUrl.parse(rawUrl));
  // Own public files are read from the deployed image, without a loopback fetch.
  if (url.origin === resolveBrandDeploymentOrigin() && /^\/brand\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|webp|jpe?g|svg)$/.test(url.pathname)) {
    const root = await realpath(join(process.cwd(), "public"));
    const filePath = await realpath(join(root, url.pathname));
    if (!filePath.startsWith(root + "/")) throw new Error("Le fichier public sort de son périmètre.");
    const file = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAX_LOGO_BYTES) throw new Error("Logo hors limites.");
      return await file.readFile();
    } finally { await file.close(); }
  }
  const response = await ssrfSafeFetch(url.href, { signal: AbortSignal.timeout(10000), headers: { Accept: "image/png,image/jpeg,image/webp,image/svg+xml" } });
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error("Logo public indisponible."); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const result = await reader.read(); if (result.done) break;
      length += result.value.length; if (length > MAX_LOGO_BYTES) throw new Error("Logo hors limites.");
      chunks.push(result.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

export async function readPublicLogoBytes(receipt: PublicLogoReceipt) {
  receipt = receiptSchema.parse(receipt);
  const store = mediaStoreConfiguration();
  if (!store || store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) throw new Error("Stockage du logo publié indisponible.");
  const bytes = await getEncryptedMedia(store, receipt.objectKey);
  if (bytes.length !== receipt.byteLength || hash(bytes) !== receipt.contentHash) throw new Error("Intégrité du logo publié non vérifiée.");
  return bytes;
}

export async function retainPublicLogo(rawUrl: string): Promise<PublicLogoReceipt> {
  const store = mediaStoreConfiguration();
  if (!store || !resolveBrandDeploymentOrigin()) throw new Error("Le stockage et l’adresse publique doivent être configurés avant de publier ce logo.");
  const bytes = await sourceBytes(rawUrl);
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) throw new Error("Logo hors limites.");
  const metadata = await sharp(bytes, { limitInputPixels: 20_000_000 }).metadata();
  const formats = { png: ["png", "image/png"], jpeg: ["jpg", "image/jpeg"], webp: ["webp", "image/webp"], svg: ["svg", "image/svg+xml"] } as const;
  const format = metadata.format && formats[metadata.format as keyof typeof formats];
  if (!format || !metadata.width || !metadata.height) throw new Error("Le fichier n’est pas un logo image pris en charge.");
  if (metadata.format === "svg") {
    const svg = bytes.toString("utf8");
    // A retained SVG must be self-contained; changing external resources would
    // change its rendering without changing the bytes we have conserved.
    if (/<!DOCTYPE|<!ENTITY|<(?:script|foreignObject|iframe)\b|\bon\w+\s*=|@import/i.test(svg)
      || [...svg.matchAll(/(?:\bhref|xlink:href)\s*=\s*["']([^"']*)["']/gi)].some(m => !m[1]!.startsWith("#"))
      || [...svg.matchAll(/url\(\s*["']?([^)'"\s]+)/gi)].some(m => !m[1]!.startsWith("#"))) {
      throw new Error("Un logo SVG autonome, sans ressource externe ni script, est requis.");
    }
  }
  // Decode as well as inspect the header; a truncated image is not a receipt.
  await sharp(bytes, { limitInputPixels: 20_000_000 }).resize({ width: 1, height: 1, fit: "inside" }).toBuffer();
  const receipt: PublicLogoReceipt = { schema: "public-brand-media-v1", objectKey: randomBytes(32).toString("hex"),
    storage: store.kind, backendId: store.backendId, keyId: store.keyId, contentHash: hash(bytes), byteLength: bytes.length,
    extension: format[0], mediaType: format[1], receivedAt: new Date().toISOString() };
  await putEncryptedMedia(store, receipt.objectKey, bytes);
  await readPublicLogoBytes(receipt);
  return receipt;
}

export function publicLogoSnapshotUrl(editionId: string, receipt: PublicLogoReceipt) {
  const base = resolveBrandDeploymentOrigin();
  if (!base) throw new Error("Adresse publique HTTPS indisponible.");
  return new URL(`/brand/editions/${editionId}/${receipt.contentHash}.${receipt.extension}`, base).href;
}

/** Anonymous bytes are limited to editions that have actually been public. */
export async function readPublicLogo(editionId: string, file: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(editionId) || !/^[a-f0-9]{64}\.(png|jpg|webp|svg)$/.test(file)) return null;
  const edition = await db.brandAsset.findFirst({ where: { id: editionId, kind: "BRAND_GUIDELINES", format: PUBLIC_BRAND_FORMAT,
    campaignId: null, state: { in: ["ACTIVE", "SUPERSEDED"] } }, include: { strategy: { select: { status: true, publicSlug: true } } } });
  if (!edition || !edition.strategy.publicSlug || !isBrandPublicSlug(edition.strategy.publicSlug)
    || ["ARCHIVED", "DELETED"].includes(edition.strategy.status)) return null;
  const receipt = publicLogoReceipt(edition.metadata);
  if (!receipt || file !== `${receipt.contentHash}.${receipt.extension}`) return null;
  return { bytes: await readPublicLogoBytes(receipt), receipt };
}
