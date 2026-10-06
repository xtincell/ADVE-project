/** Encrypted private objects. Extends the existing BLOB_STORAGE template contract. */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { mkdir, open, unlink, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, join } from "node:path";
import { ssrfSafeFetch } from "./net/ssrf-guard";

export type MediaStore = { kind: "VOLUME" | "HTTP_BLOB"; key: Buffer; keyId: string; backendId: string; root?: string };
const objectName = (key: string) => { if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Identifiant média invalide."); return `${key}.enc`; };
export function mediaStoreConfiguration(): MediaStore | null {
  const raw = process.env.CREATIVE_MEDIA_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) return null;
  const key = Buffer.from(raw, "hex"), keyId = createHash("sha256").update(key).digest("hex").slice(0, 16);
  const root = process.env.CREATIVE_MEDIA_ARCHIVE_DIR;
  if (root && isAbsolute(root)) return { kind: "VOLUME", key, keyId, root, backendId: createHash("sha256").update(`VOLUME:${root}`).digest("hex") };
  if (["PUT", "GET", "DELETE"].every(method => process.env[`BLOB_STORAGE_${method}_URL_TEMPLATE`]?.includes("{hash}"))) return { kind: "HTTP_BLOB", key, keyId, backendId: createHash("sha256").update(["PUT", "GET", "DELETE"].map(m => process.env[`BLOB_STORAGE_${m}_URL_TEMPLATE`]).join("|" )).digest("hex") };
  return null;
}
export function encryptMedia(bytes: Buffer, store: MediaStore, objectKey: string) {
  objectName(objectKey);
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", store.key, iv);
  cipher.setAAD(Buffer.from(objectKey));
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([Buffer.from("ADVE1"), iv, cipher.getAuthTag(), data]);
}
export function decryptMedia(encrypted: Buffer, store: MediaStore, objectKey: string) {
  objectName(objectKey);
  if (encrypted.length < 34 || encrypted.toString("ascii", 0, 5) !== "ADVE1") throw new Error("Archive corrompue.");
  const cipher = createDecipheriv("aes-256-gcm", store.key, encrypted.subarray(5, 17));
  cipher.setAAD(Buffer.from(objectKey)); cipher.setAuthTag(encrypted.subarray(17, 33));
  return Buffer.concat([cipher.update(encrypted.subarray(33)), cipher.final()]);
}
async function remote(_store: MediaStore, objectKey: string, method: "GET" | "PUT" | "DELETE", bytes?: Buffer) {
  objectName(objectKey);
  const template = process.env[`BLOB_STORAGE_${method}_URL_TEMPLATE`];
  if (!template) throw new Error("Stockage privé incomplet.");
  const url = template.replaceAll("{hash}", objectKey);
  if (new URL(url).protocol !== "https:") throw new Error("Stockage HTTPS requis.");
  return ssrfSafeFetch(url, { method, signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/octet-stream", ...(process.env.BLOB_STORAGE_TOKEN ? { Authorization: `Bearer ${process.env.BLOB_STORAGE_TOKEN}` } : {}) }, ...(bytes ? { body: new Uint8Array(bytes) } : {}) }, 0);
}
export async function putEncryptedMedia(store: MediaStore, objectKey: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > 25_000_000) throw new Error("Média hors limites.");
  const encrypted = encryptMedia(bytes, store, objectKey);
  if (store.kind === "VOLUME") {
    await mkdir(store.root!, { recursive: true, mode: 0o700 });
    const file = await open(join(store.root!, objectName(objectKey)), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { await file.writeFile(encrypted); await file.sync(); } finally { await file.close(); }
  } else {
    const response = await remote(store, objectKey, "PUT", encrypted); await response.body?.cancel();
    if (!response.ok) throw new Error("Écriture du stockage refusée.");
  }
}
export async function getEncryptedMedia(store: MediaStore, objectKey: string) {
  let bytes: Buffer;
  if (store.kind === "VOLUME") {
    const file = await open(join(store.root!, objectName(objectKey)), constants.O_RDONLY | constants.O_NOFOLLOW);
    try { if ((await file.stat()).size > 25_000_100) throw new Error("Archive trop volumineuse."); bytes = await file.readFile(); } finally { await file.close(); }
  } else {
    const response = await remote(store, objectKey, "GET");
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error("Archive indisponible."); }
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 25_000_100) throw new Error("Archive trop volumineuse."); chunks.push(r.value); } }
    finally { await reader.cancel().catch(() => {}); }
    bytes = Buffer.concat(chunks);
  }
  return decryptMedia(bytes, store, objectKey);
}
export async function deleteEncryptedMedia(store: MediaStore, objectKey: string) {
  if (store.kind === "VOLUME") await unlink(join(store.root!, objectName(objectKey))).catch(e => { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; });
  else {
    const response = await remote(store, objectKey, "DELETE"); await response.body?.cancel();
    if (!response.ok && response.status !== 404) throw new Error("Retrait du stockage refusé.");
    const check = await remote(store, objectKey, "GET"); await check.body?.cancel();
    if (![404, 410].includes(check.status)) throw new Error("Le stockage ne confirme pas le retrait physique.");
  }
}
export async function oldVolumeObjects(store: MediaStore, before: Date, limit = 50) {
  if (store.kind !== "VOLUME") return [];
  const files = await readdir(store.root!).catch(e => { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; });
  const old: string[] = [];
  const names = files.filter(f => /^[a-f0-9]{64}\.enc$/.test(f)).sort();
  // Rotate each maintenance tick so retained files cannot starve later orphans.
  const offset = names.length ? (Math.floor(Date.now() / 900000) * limit) % names.length : 0;
  for (const file of [...names.slice(offset), ...names.slice(0, offset)]) {
    if ((await stat(join(store.root!, file))).mtime < before) old.push(file.slice(0, -4));
    if (old.length >= limit) break;
  }
  return old;
}
