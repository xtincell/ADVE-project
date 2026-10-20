import { z } from "zod";

/** Receipt of the received bytes, never a claim about their truth or approval. */
export const sourceOriginalReceiptSchema = z.object({
  schema: z.literal("source-original-v1"),
  state: z.enum(["PENDING", "STORED"]),
  objectKey: z.string().regex(/^[a-f0-9]{64}$/),
  storage: z.enum(["VOLUME", "HTTP_BLOB"]),
  backendId: z.string(),
  keyId: z.string(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive().max(10 * 1024 * 1024),
  fileType: z.string(),
  receivedAt: z.string().datetime(),
});
export type SourceOriginalReceipt = z.infer<typeof sourceOriginalReceiptSchema>;
/** Same received-byte contract for the existing BrandAsset/FileUpload register. */
export const assetOriginalReceiptSchema = sourceOriginalReceiptSchema.extend({ schema: z.literal("asset-original-v1") });
export type AssetOriginalReceipt = z.infer<typeof assetOriginalReceiptSchema>;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** Physical transfer bounds, separate from format-specific reading limits. */
export const ORIGINAL_CHUNK_BYTES = 4 * 1024 * 1024;
export const MAX_CHUNKED_ORIGINAL_BYTES = 200 * 1024 * 1024;
export const originalChunkSchema = z.object({
  objectKey: z.string().regex(/^[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive().max(ORIGINAL_CHUNK_BYTES),
}).strict();
export const chunkedOriginalManifestSchema = z.object({
  schema: z.literal("original-chunks-v1"),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive().max(MAX_CHUNKED_ORIGINAL_BYTES),
  chunks: z.array(originalChunkSchema).min(1).max(MAX_CHUNKED_ORIGINAL_BYTES / ORIGINAL_CHUNK_BYTES),
}).strict().superRefine((value, ctx) => {
  if (value.chunks.reduce((sum, part) => sum + part.byteLength, 0) !== value.byteLength
    || value.chunks.slice(0, -1).some(part => part.byteLength !== ORIGINAL_CHUNK_BYTES)
    || new Set(value.chunks.map(part => part.objectKey)).size !== value.chunks.length) {
    ctx.addIssue({ code: "custom", message: "Plan de fragments incohérent." });
  }
});
export type OriginalChunk = z.infer<typeof originalChunkSchema>;
export type ChunkedOriginalManifest = z.infer<typeof chunkedOriginalManifestSchema>;

export function sourceOriginalSummary(value: unknown) {
  const parsed = sourceOriginalReceiptSchema.safeParse(value);
  if (!parsed.success) return null;
  const { state, contentHash, byteLength, receivedAt } = parsed.data;
  return { state, contentHash, byteLength, receivedAt };
}

/** FileUpload owns this plan before IO. No part or root key comes from a client. */
export const assetChunkedReceiptSchema = assetOriginalReceiptSchema.omit({ schema: true, byteLength: true }).extend({
  schema: z.literal("asset-original-v2"),
  byteLength: z.number().int().positive().max(MAX_CHUNKED_ORIGINAL_BYTES),
  chunks: z.array(originalChunkSchema.extend({ contentHash: originalChunkSchema.shape.contentHash.nullable() }))
    .min(1).max(MAX_CHUNKED_ORIGINAL_BYTES / ORIGINAL_CHUNK_BYTES),
}).strict().superRefine((value, ctx) => {
  if (value.chunks.reduce((sum, part) => sum + part.byteLength, 0) !== value.byteLength
    || value.chunks.slice(0, -1).some(part => part.byteLength !== ORIGINAL_CHUNK_BYTES)
    || new Set([value.objectKey, ...value.chunks.map(part => part.objectKey)]).size !== value.chunks.length + 1
    || (value.state === "STORED" && value.chunks.some(part => !part.contentHash))) {
    ctx.addIssue({ code: "custom", message: "Plan de conservation incohérent." });
  }
});
export const anyAssetOriginalReceiptSchema = z.union([assetOriginalReceiptSchema, assetChunkedReceiptSchema]);
export type AssetChunkedReceipt = z.infer<typeof assetChunkedReceiptSchema>;
export const assetTransferInputSchema = z.object({
  strategyId: z.string().min(1),
  transfer: z.discriminatedUnion("action", [
    z.object({ action: z.literal("BEGIN"), name: z.string().trim().min(1).max(500),
      fileName: z.string().min(1).max(500), mimeType: z.string().min(1).max(200),
      contentHash: originalChunkSchema.shape.contentHash,
      byteLength: z.number().int().positive().max(MAX_CHUNKED_ORIGINAL_BYTES),
      type: z.enum(["LOGO", "FONT", "COLOR", "IMAGE", "DOCUMENT"]).default("DOCUMENT"),
      pillarTags: z.record(z.string(), z.number()).default({}),
      provenance: z.object({ provider: z.literal("GOOGLE_DRIVE"), externalId: z.string().min(1).max(200),
        path: z.string().min(1).max(2000), modifiedAt: z.string().datetime().optional() }).strict().optional(),
    }).strict(),
    z.object({ action: z.literal("PART"), assetId: z.string().min(1), index: z.number().int().min(0).max(49),
      content: z.string().min(4).max(Math.ceil(ORIGINAL_CHUNK_BYTES / 3) * 4) }).strict(),
    z.object({ action: z.literal("FINISH"), assetId: z.string().min(1), autoTag: z.boolean().default(false) }).strict(),
  ]),
}).strict();
