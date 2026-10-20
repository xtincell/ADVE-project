/** Bounded bytes in the existing encrypted store. Admission belongs to callers. */
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ORIGINAL_CHUNK_BYTES, originalChunkSchema, chunkedOriginalManifestSchema,
  type OriginalChunk, type ChunkedOriginalManifest,
} from "@/domain/source-original";
import { getEncryptedMedia, putEncryptedMedia, type MediaStore } from "./encrypted-media-store";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const keySchema = z.string().regex(/^[a-f0-9]{64}$/);
const partPlanSchema = originalChunkSchema.omit({ contentHash: true });

/** A retry may receive an existing exact object; corruption is never overwritten. */
async function retainObject(store: MediaStore, key: string, bytes: Buffer) {
  try {
    const existing = await getEncryptedMedia(store, key);
    if (!existing.equals(bytes)) throw new Error("Les octets de cet objet ont changé.");
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try { await putEncryptedMedia(store, key, bytes); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  if (!(await getEncryptedMedia(store, key)).equals(bytes)) throw new Error("L’intégrité du dépôt n’est pas vérifiée.");
}

export async function retainOriginalChunk(store: MediaStore, part: z.infer<typeof partPlanSchema>, bytes: Buffer): Promise<OriginalChunk> {
  const plan = partPlanSchema.parse(part);
  if (bytes.length !== plan.byteLength || bytes.length > ORIGINAL_CHUNK_BYTES) throw new Error("Fragment hors du plan de transfert.");
  await retainObject(store, plan.objectKey, bytes);
  return { ...plan, contentHash: digest(bytes) };
}

/** The iterator keeps one decrypted fragment at a time, including verification. */
async function* verifiedChunks(store: MediaStore, manifest: ChunkedOriginalManifest) {
  const hash = createHash("sha256"); let length = 0;
  for (const part of manifest.chunks) {
    const bytes = await getEncryptedMedia(store, part.objectKey);
    if (bytes.length !== part.byteLength || digest(bytes) !== part.contentHash) throw new Error("L’intégrité du fragment n’est pas vérifiée.");
    hash.update(bytes); length += bytes.length;
    yield bytes;
  }
  if (length !== manifest.byteLength || hash.digest("hex") !== manifest.contentHash) throw new Error("L’empreinte du fichier complet ne correspond pas au transfert.");
}

/** Seal only after every part and the complete original SHA-256 have been read. */
export async function sealOriginalChunks(store: MediaStore, objectKey: string, input: ChunkedOriginalManifest) {
  const key = keySchema.parse(objectKey), manifest = chunkedOriginalManifestSchema.parse(input);
  if (manifest.chunks.some(part => part.objectKey === key)) throw new Error("Le manifeste ne peut pas être son propre fragment.");
  for await (const _part of verifiedChunks(store, manifest)) { /* verification before visibility */ }
  await retainObject(store, key, Buffer.from(JSON.stringify(manifest), "utf8"));
  return manifest;
}

/** A stored receipt must match the encrypted manifest before any part is yielded. */
export async function* readOriginalChunks(store: MediaStore, objectKey: string, input: ChunkedOriginalManifest) {
  const key = keySchema.parse(objectKey), expected = chunkedOriginalManifestSchema.parse(input);
  const raw = await getEncryptedMedia(store, key);
  if (raw.length > 64_000) throw new Error("Manifeste trop volumineux.");
  const stored = chunkedOriginalManifestSchema.parse(JSON.parse(raw.toString("utf8")));
  if (JSON.stringify(stored) !== JSON.stringify(expected) || stored.chunks.some(part => part.objectKey === key)) throw new Error("Le manifeste du fichier a changé.");
  yield* verifiedChunks(store, stored);
}
