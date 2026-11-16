/** Real filesystem and encrypted volume: native separators must not reject local public media. */
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readPublicLogoBytes, retainPublicLogo } from "@/server/services/brand-vault/public-media";

const directory = `media-path-fixture-${randomUUID()}`;
const publicRoot = path.resolve(process.cwd(), "public");
const fixtureRoot = path.join(publicRoot, "brand", directory);
let temporaryRoot: string, bytes: Buffer;
const fetch = vi.fn(async () => { throw new Error("Unexpected network request for an owned file"); });

beforeAll(async () => {
  temporaryRoot = await mkdtemp(path.join(tmpdir(), "public-media-path-"));
  await mkdir(fixtureRoot, { recursive: true });
  await mkdir(path.join(temporaryRoot, "outside"));
  bytes = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).png().toBuffer();
  await writeFile(path.join(fixtureRoot, "logo.png"), bytes);
  await writeFile(path.join(temporaryRoot, "outside", "private.png"), bytes);
  vi.stubEnv("AUTH_URL", "https://media.example.invalid");
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "19".repeat(32));
  vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", path.join(temporaryRoot, "encrypted"));
  vi.stubGlobal("fetch", fetch);
});
afterAll(async () => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals();
  // Bound both recursive cleanups to directories this fixture created.
  expect(path.resolve(fixtureRoot).startsWith(publicRoot + path.sep)).toBe(true);
  await rm(fixtureRoot, { recursive: true, force: true });
  if (temporaryRoot) {
    expect(path.resolve(temporaryRoot).startsWith(path.resolve(tmpdir()) + path.sep)).toBe(true);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

describe("public media — native filesystem containment", () => {
  it("retains and rereads the exact local image without a network request", async () => {
    const receipt = await retainPublicLogo(`https://media.example.invalid/brand/${directory}/logo.png`);
    expect(receipt.mediaType).toBe("image/png");
    expect(receipt.byteLength).toBe(bytes.length);
    expect(await readPublicLogoBytes(receipt)).toEqual(bytes);
    expect(await readFile(path.join(fixtureRoot, "logo.png"))).toEqual(bytes);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a symlink or Windows junction escaping public and writes no archive", async () => {
    await symlink(path.join(temporaryRoot, "outside"), path.join(fixtureRoot, "linked"), "junction");
    const archive = path.join(temporaryRoot, "encrypted");
    const before = await readdir(archive).catch(() => []);
    await expect(retainPublicLogo(`https://media.example.invalid/brand/${directory}/linked/private.png`))
      .rejects.toThrow("Le fichier public sort de son périmètre.");
    expect(await readdir(archive).catch(() => [])).toEqual(before);
    expect(fetch).not.toHaveBeenCalled();
  });
});
