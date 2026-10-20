import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ORIGINAL_CHUNK_BYTES, chunkedOriginalManifestSchema, type ChunkedOriginalManifest, type OriginalChunk } from "@/domain/source-original";
import { retainOriginalChunk, sealOriginalChunks, readOriginalChunks } from "@/lib/chunked-original-store";
import { type MediaStore } from "@/lib/encrypted-media-store";

const objects = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock("@/lib/net/ssrf-guard", () => ({ ssrfSafeFetch: async (url: string, options: RequestInit) => {
  if (options.method === "PUT") { objects.set(url, new Uint8Array(options.body as Uint8Array)); return new Response(null, { status: 201 }); }
  return objects.has(url) ? new Response(new Uint8Array(objects.get(url)!)) : new Response(null, { status: 404 });
} }));

const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const plan = ({ objectKey, byteLength }: OriginalChunk) => ({ objectKey, byteLength });
const rootKey = sha("isolated-manifest");
let directory: string, store: MediaStore;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "original-chunks-"));
  store = { kind: "VOLUME", root: directory, key: Buffer.alloc(32, 9), keyId: "synthetic", backendId: "synthetic" };
});
afterEach(async () => { vi.unstubAllEnvs(); objects.clear(); await rm(directory, { recursive: true, force: true }); });

it("resumes and streams the corpus maximum original without assembling a whole-file Buffer", async () => {
  // Exact size of the largest original in the measured SPAWT corpus, above both
  // previous 10 MiB admission and 25 MB physical-object limits. Synthetic bytes.
  const total = 162_437_099, hash = createHash("sha256");
  const manifest: ChunkedOriginalManifest = { schema: "original-chunks-v1", contentHash: "0".repeat(64), byteLength: total, chunks: [] };
  for (let offset = 0, index = 0; offset < total; index++) {
    const length = Math.min(ORIGINAL_CHUNK_BYTES, total - offset), bytes = Buffer.alloc(length, index);
    hash.update(bytes); manifest.chunks.push({ objectKey: sha("isolated-part-" + index), contentHash: sha(bytes), byteLength: length });
    offset += length;
  }
  manifest.contentHash = hash.digest("hex");
  for (let i = 0; i < 5; i++) await retainOriginalChunk(store, plan(manifest.chunks[i]!), Buffer.alloc(manifest.chunks[i]!.byteLength, i));
  await expect(sealOriginalChunks(store, rootKey, manifest)).rejects.toMatchObject({ code: "ENOENT" });
  await expect(readFile(join(directory, rootKey + ".enc"))).rejects.toMatchObject({ code: "ENOENT" });
  const firstCipher = await readFile(join(directory, manifest.chunks[0]!.objectKey + ".enc"));
  for (let i = 5; i < manifest.chunks.length; i++) await retainOriginalChunk(store, plan(manifest.chunks[i]!), Buffer.alloc(manifest.chunks[i]!.byteLength, i));
  await retainOriginalChunk(store, plan(manifest.chunks[0]!), Buffer.alloc(ORIGINAL_CHUNK_BYTES));
  expect(await readFile(join(directory, manifest.chunks[0]!.objectKey + ".enc"))).toEqual(firstCipher);
  await sealOriginalChunks(store, rootKey, manifest);
  let received = 0, largestYield = 0; const recovered = createHash("sha256");
  for await (const bytes of readOriginalChunks(store, rootKey, manifest)) {
    largestYield = Math.max(largestYield, bytes.length); recovered.update(bytes); received += bytes.length;
  }
  expect(received).toBe(total); expect(largestYield).toBe(ORIGINAL_CHUNK_BYTES);
  expect(recovered.digest("hex")).toBe(manifest.contentHash);
  expect(await readdir(directory)).toHaveLength(manifest.chunks.length + 1);
}, 30_000);

it("refuses corruption and preserves the damaged object instead of fabricating recovery", async () => {
  const bytes = Buffer.from("retained exact bytes"), key = sha("corruption-case");
  const part = await retainOriginalChunk(store, { objectKey: key, byteLength: bytes.length }, bytes);
  await writeFile(join(directory, key + ".enc"), "damaged");
  await expect(retainOriginalChunk(store, plan(part), bytes)).rejects.toThrow("corrompue");
  expect(await readFile(join(directory, key + ".enc"), "utf8")).toBe("damaged");
});

it("refuses a complete-file hash mismatch before creating a manifest", async () => {
  const bytes = Buffer.from("received bytes"), part = await retainOriginalChunk(store, { objectKey: sha("hash-case"), byteLength: bytes.length }, bytes);
  await expect(sealOriginalChunks(store, rootKey, { schema: "original-chunks-v1", contentHash: sha("different bytes"), byteLength: bytes.length, chunks: [part] })).rejects.toThrow("fichier complet");
  await expect(readFile(join(directory, rootKey + ".enc"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("never treats a different manifest as the stored receipt", async () => {
  const bytes = Buffer.from("one original"), part = await retainOriginalChunk(store, { objectKey: sha("manifest-case"), byteLength: bytes.length }, bytes);
  const manifest: ChunkedOriginalManifest = { schema: "original-chunks-v1", contentHash: sha(bytes), byteLength: bytes.length, chunks: [part] };
  await sealOriginalChunks(store, rootKey, manifest);
  const changed = { ...manifest, contentHash: sha("another original") };
  await expect((async () => { for await (const _ of readOriginalChunks(store, rootKey, changed)) { /* consume */ } })()).rejects.toThrow("manifeste");
});

it("uses the same encrypted object contract with the existing HTTP blob backend", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) vi.stubEnv("BLOB_STORAGE_" + method + "_URL_TEMPLATE", "https://objects.example.test/{hash}");
  const remote: MediaStore = { ...store, kind: "HTTP_BLOB", root: undefined };
  const bytes = Buffer.from("remote exact bytes"), part = await retainOriginalChunk(remote, { objectKey: sha("remote-case"), byteLength: bytes.length }, bytes);
  const manifest: ChunkedOriginalManifest = { schema: "original-chunks-v1", contentHash: sha(bytes), byteLength: bytes.length, chunks: [part] };
  await sealOriginalChunks(remote, rootKey, manifest);
  const result: Buffer[] = []; for await (const b of readOriginalChunks(remote, rootKey, manifest)) result.push(b);
  expect(Buffer.concat(result)).toEqual(bytes);
  expect([...objects.values()].every(value => !Buffer.from(value).includes(bytes))).toBe(true);
});

it("rejects duplicate keys, non-final short parts and sizes outside the transfer plan", () => {
  const part = { objectKey: sha("schema-case"), contentHash: sha("data"), byteLength: 4 };
  expect(chunkedOriginalManifestSchema.safeParse({ schema: "original-chunks-v1", contentHash: part.contentHash, byteLength: 8, chunks: [part, part] }).success).toBe(false);
  expect(chunkedOriginalManifestSchema.safeParse({ schema: "original-chunks-v1", contentHash: part.contentHash, byteLength: 5, chunks: [part] }).success).toBe(false);
});
