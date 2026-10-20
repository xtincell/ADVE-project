import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { putEncryptedMedia, getEncryptedMedia, type MediaStore } from "@/lib/encrypted-media-store";

const pause = vi.hoisted(() => ({
  nextWrite: false,
  prefixWritten: null as (() => void) | null,
  continueWrite: null as (() => void) | null,
}));

// Pause real filesystem IO halfway through a write, rather than simulating a
// successful object. Readers must not see that uncommitted encrypted prefix.
vi.mock("node:fs/promises", async importOriginal => {
  const fs = await importOriginal<typeof import("node:fs/promises")>();
  return { ...fs, open: async (...args: Parameters<typeof fs.open>) => {
    const file = await fs.open(...args);
    if (!pause.nextWrite || typeof args[1] !== "number" || !(args[1] & 1)) return file;
    pause.nextWrite = false;
    return new Proxy(file, { get(target, property) {
      if (property === "writeFile") return async (bytes: Buffer) => {
        const half = Math.floor(bytes.length / 2);
        await target.writeFile(bytes.subarray(0, half));
        const continued = new Promise<void>(resolve => { pause.continueWrite = resolve; });
        pause.prefixWritten?.();
        await continued;
        await target.writeFile(bytes.subarray(half));
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    } });
  } };
});

let root: string, store: MediaStore;
const key = "b".repeat(64);
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "private-atomic-"));
  store = { kind: "VOLUME", root, key: Buffer.alloc(32, 7), keyId: "synthetic", backendId: "synthetic" };
});
afterEach(async () => {
  pause.nextWrite = false; pause.continueWrite?.();
  pause.prefixWritten = null; pause.continueWrite = null;
  await rm(root, { recursive: true, force: true });
});

it("exposes an original only after its entire encrypted write commits", async () => {
  const bytes = Buffer.alloc(256_000, 19);
  const prefix = new Promise<void>(resolve => { pause.prefixWritten = resolve; });
  pause.nextWrite = true;
  const writing = putEncryptedMedia(store, key, bytes);
  await prefix;
  try {
    await expect(getEncryptedMedia(store, key)).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    pause.continueWrite?.();
    await writing;
  }
  expect(await getEncryptedMedia(store, key)).toEqual(bytes);
  expect(await readdir(root)).toEqual([key + ".enc"]);
});

it("keeps an already committed object unchanged when another writer collides", async () => {
  await putEncryptedMedia(store, key, Buffer.from("original retained"));
  const before = await readFile(join(root, key + ".enc"));
  await expect(putEncryptedMedia(store, key, Buffer.from("different bytes"))).rejects.toMatchObject({ code: "EEXIST" });
  expect(await readFile(join(root, key + ".enc"))).toEqual(before);
  expect(await readdir(root)).toEqual([key + ".enc"]);
});
