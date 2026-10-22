/** Real governed intake, file store, publication and tenant checks; synthetic DB. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, utimes, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { brandVaultRouter } from "@/server/trpc/routers/brand-vault";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { documentEdition, documentRepresentation, sourceIsUsable } from "@/domain/source-document";
import * as extractors from "@/server/services/ingestion-pipeline/extractors";
import { jsPDF } from "jspdf";
import { readAssetOriginal } from "@/server/services/brand-vault/original";
import { ORIGINAL_CHUNK_BYTES, assetChunkedReceiptSchema } from "@/domain/source-original";
import { purgeExpiredCreativeMedia } from "@/server/services/seshat/creative-intelligence/media-archive";
import { resolveBrandIdentity } from "@/server/services/brand-theme";
import { readPublicBrand } from "@/server/services/brand-vault/publication";
import { GET } from "@/app/api/brand-assets/[assetId]/original/route";
import { GET as publicFile } from "@/app/brand/editions/[editionId]/[file]/route";
import { GET as sourceFile } from "@/app/api/brand-sources/[sourceId]/original/route";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 60_000 });

const brands: string[] = [], users: string[] = [], operators: string[] = [];
let root: string, png: Buffer;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  root = await mkdtemp(join(tmpdir(), "vault-original-"));
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "49".repeat(32)); vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", root);
  vi.stubEnv("AUTH_URL", "https://powerupgraders.com");
  png = await sharp({ create: { width: 3, height: 3, channels: 4, background: "red" } }).png().toBuffer();
  for (const label of ["owner", "foreign"]) {
    const op = await db.operator.create({ data: { name: label, slug: randomUUID(), status: "ACTIVE", licenseType: "TRIAL",
      licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } }); operators.push(op.id);
    users.push((await db.user.create({ data: { email: randomUUID() + "@example.invalid", operatorId: op.id } })).id);
  }
});
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  const ids = (await db.brandAsset.findMany({ where, select: { id: true } })).map(a => a.id);
  await db.fileUpload.deleteMany({ where: { entityType: "BRAND_ASSET", entityId: { in: ids } } });
  await db.brandDataSource.deleteMany({ where });
  await db.brandAsset.updateMany({ where, data: { parentBrandAssetId: null, supersededById: null } });
  await db.brandAsset.deleteMany({ where }); await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: operators } } });
  await rm(root, { recursive: true, force: true }); vi.unstubAllEnvs(); await db.$disconnect();
});
const context = (index = 0) => ({ db, headers: undefined, session: { user: { id: users[index]!, role: "USER" as const, operatorId: operators[index] }, expires: new Date(Date.now() + 60000).toISOString() } });
const caller = (index = 0) => brandVaultRouter.createCaller(context(index));
const documentCaller = (index = 0) => ingestionRouter.createCaller(context(index));
const edition = (label: string) => ({ family: "Modèle documentaire fictif", kind: "OTHER" as const,
  label, status: "PROPOSED" as const, changeSummary: "Recette synthétique : proposition sans adoption." });
const storedDocument = (strategyId: string, assetId: string, bytes: Buffer, label = "v1") => ({ strategyId,
  retainedAsset: { assetId, contentHash: createHash("sha256").update(bytes).digest("hex") }, document: edition(label), prepareAnalysis: false });
async function brand() {
  const s = await db.strategy.create({ data: { name: "Private assets fixture", userId: users[0]!, operatorId: operators[0]!, publicSlug: "LFA-vault-" + randomUUID() } }); brands.push(s.id); return s;
}
const input = (strategyId: string, externalId = randomUUID(), bytes = png) => ({ strategyId, name: "Original logo", type: "LOGO" as const,
  file: { name: "logo.png", mimeType: "image/png", content: bytes.toString("base64") }, pillarTags: { d: 1 },
  provenance: { provider: "GOOGLE_DRIVE" as const, externalId, path: "SPAWT/Brand/Logo/logo.png" } });
const get = (assetId: string, query = "") => GET(new Request(`http://localhost/api/brand-assets/${assetId}/original${query}`), { params: Promise.resolve({ assetId }) });

describe.sequential("private asset originals through the existing vault", () => {
  it("files a received original with versioned labels without selecting it or rewriting its bytes", async () => {
    const s = await brand(), a = await caller().create(input(s.id));
    const beforeUpload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const request = { id: a.id, sourceClassification: {
      expectedOriginalHash: createHash("sha256").update(png).digest("hex"), expectedClassificationVersion: 0,
      classification: { family: "Identité de recette", kind: "ASSET" as const, label: "v2 à examiner", status: "PROPOSED" as const, tags: ["Logo", "Test synthétique"] },
      reason: "Classement documentaire de recette ; aucune identité choisie.",
    } };
    const filed = await caller().updateTags(request);
    expect(filed).toMatchObject({ state: a.state, version: a.version, kind: a.kind, parentBrandAssetId: a.parentBrandAssetId });
    expect(filed.metadata).toMatchObject({ _sourceClassification: { version: 1, family: "Identité de recette", tags: ["Logo", "Test synthétique"] } });
    expect(await db.fileUpload.findUniqueOrThrow({ where: { id: beforeUpload.id } })).toEqual(beforeUpload);
    await expect(caller().updateTags(request)).rejects.toThrow("classement a changé");
    await expect(caller(1).updateTags({ ...request, sourceClassification: { ...request.sourceClassification, expectedClassificationVersion: 1 } })).rejects.toThrow();
    await expect(caller().updateTags({ ...request, sourceClassification: { ...request.sourceClassification, expectedClassificationVersion: 1, expectedOriginalHash: "0".repeat(64) } })).rejects.toThrow("original reçu diffère");
    const next = await caller().updateTags({ ...request, sourceClassification: { ...request.sourceClassification, expectedClassificationVersion: 1,
      classification: { ...request.sourceClassification.classification, label: "v2 — lecture précisée" } } });
    expect(next.metadata).toMatchObject({ _sourceClassification: { version: 2, history: [{ version: 1, label: "v2 à examiner" }] } });
    expect((await readAssetOriginal(a.id))?.bytes.equals(png)).toBe(true);
    expect((await resolveBrandIdentity(s.id)).logo).toBeNull();
  });
  it("retains exact encrypted bytes without selecting a logo or adding automatic tags", async () => {
    const s = await brand(), a = await caller().create(input(s.id));
    expect(a.state).toBe("CANDIDATE"); expect(a.pillarTags).toEqual({ d: 1, level: "production", assetType: "LOGO" });
    expect((await resolveBrandIdentity(s.id)).logo).toBeNull();
    const preview = await strategyRouter.createCaller(context()).publicPage({ id: s.id });
    expect(preview.logos).toHaveLength(0); expect(preview.proposed.logoUrl).toBeNull();
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const receipt = upload.storageReceipt as { objectKey: string };
    expect((await readFile(join(root, receipt.objectKey + ".enc"))).equals(png)).toBe(false);
    expect((await readAssetOriginal(a.id))?.bytes.equals(png)).toBe(true);
    expect(a.metadata).not.toHaveProperty("objectKey"); expect(JSON.stringify(a)).not.toContain(receipt.objectKey);
    const emission = await db.intentEmission.findUniqueOrThrow({ where: { id: a.sourceIntentId! } });
    expect(JSON.stringify(emission.payload)).not.toContain(png.toString("base64"));
    expect(JSON.stringify(emission.payload)).toContain(createHash("sha256").update(png).digest("hex"));
  });
  it("serializes concurrent retries, keeps aliases distinct and records successors without adoption", async () => {
    const s = await brand(), request = input(s.id);
    const [a, replay] = await Promise.all([caller().create(request), caller().create(request)]);
    expect(a.id).toBe(replay.id); expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(1);
    await caller().selectFromBatch({ batchId: a.batchId!, selectedAssetId: a.id });
    const next = await caller().create(input(s.id, request.provenance.externalId, Buffer.concat([png, Buffer.from("next")] )));
    expect(next).toMatchObject({ state: "CANDIDATE", parentBrandAssetId: a.id, version: 2 });
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
    const alias = await caller().create(input(s.id)); expect(alias.id).not.toBe(a.id); expect(alias.version).toBe(1);
    expect(await db.fileUpload.count({ where: { entityType: "BRAND_ASSET", entityId: { in: [a.id, next.id, alias.id] } } })).toBe(3);
  });
  it("resumes a pending receipt and never overwrites corrupted received bytes", async () => {
    const s = await brand(), request = input(s.id), a = await caller().create(request);
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const receipt = upload.storageReceipt as { objectKey: string };
    await rm(join(root, receipt.objectKey + ".enc"));
    await db.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: { ...receipt, state: "PENDING" } } });
    const resumed = await caller().create(request); expect(resumed.id).toBe(a.id);
    expect((await readAssetOriginal(a.id))?.bytes.equals(png)).toBe(true);
    await writeFile(join(root, receipt.objectKey + ".enc"), "corrupt");
    await expect(caller().create(request)).rejects.toThrow();
    expect(await readFile(join(root, receipt.objectKey + ".enc"), "utf8")).toBe("corrupt");
  });
  it("requires current tenant access and rejects invalid or oversized deposits before admission", async () => {
    const s = await brand();
    await expect(caller(1).create(input(s.id))).rejects.toThrow();
    for (const content of ["", "hello!", "YWJj=", "a".repeat(13_981_020)]) {
      await expect(caller().create({ ...input(s.id), file: { name: "bad", mimeType: "image/png", content } })).rejects.toThrow();
    }
    expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(0);
    expect(await db.intentEmission.count({ where: { strategyId: s.id } })).toBe(0);
  });
  it("serves authenticated exact attachments, isolated previews and no bytes to another tenant", async () => {
    const s = await brand(), a = await caller().create(input(s.id));
    vi.mocked(auth).mockResolvedValue({ user: { id: users[0]! } } as never);
    const r = await get(a.id); expect(r.status).toBe(200);
    expect(Buffer.from(await r.arrayBuffer()).equals(png)).toBe(true);
    expect(r.headers.get("x-content-sha256")).toBe(createHash("sha256").update(png).digest("hex"));
    expect(r.headers.get("content-type")).toBe("application/octet-stream"); expect(r.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect((await get(a.id, "?preview=1")).headers.get("content-type")).toBe("image/png");
    const evil = await caller().create({ ...input(s.id, randomUUID(), Buffer.from('<svg onload="evil()"/>')), file: { name: "hostile.svg", mimeType: "image/png", content: Buffer.from('<svg onload="evil()"/>').toString("base64") } });
    expect((await get(evil.id, "?preview=1")).status).toBe(415); expect((await get(evil.id)).status).toBe(200);
    vi.mocked(auth).mockResolvedValue({ user: { id: users[1]! } } as never); expect((await get(a.id)).status).toBe(404);
    vi.mocked(auth).mockResolvedValue(null as never); expect((await get(a.id)).status).toBe(401);
  });
  it("publishes only explicitly selected verified bytes and preserves the private original", async () => {
    const s = await brand(), a = await caller().create(input(s.id));
    await caller().selectFromBatch({ batchId: a.batchId!, selectedAssetId: a.id });
    const strategy = strategyRouter.createCaller(context()), p = await strategy.publicPage({ id: s.id });
    expect(p.logos.map(x => x.id)).toContain(a.id);
    await strategy.update({ id: s.id, recalculateScore: false, publicPage: { expectedRevision: p.revision, expectedPublishedId: null,
      content: { ...p.proposed, logoUrl: p.logos[0]!.url }, logoAssetId: a.id } });
    const page = await readPublicBrand(s.publicSlug!); expect(page?.content.logoUrl).toContain("/brand/editions/");
    const parts = new URL(page!.content.logoUrl!).pathname.split("/");
    const response = await publicFile(new Request(page!.content.logoUrl!), { params: Promise.resolve({ editionId: parts[3]!, file: parts[4]! }) });
    expect(response.status).toBe(200); expect(Buffer.from(await response.arrayBuffer()).equals(png)).toBe(true);
    expect((await readAssetOriginal(a.id))?.bytes.equals(png)).toBe(true);
  });
  it("archives retained assets without deleting originals and refuses hard purge", async () => {
    const s = await brand(), a = await caller().create(input(s.id));
    await expect(caller().purge({ assetIds: [a.id] })).rejects.toThrow("originaux");
    await caller().delete({ id: a.id }); expect((await caller().list({ strategyId: s.id })).map(x => x.id)).not.toContain(a.id);
    expect((await caller().list({ strategyId: s.id, state: "ARCHIVED" })).map(x => x.id)).toContain(a.id);
    expect((await readAssetOriginal(a.id))?.bytes.equals(png)).toBe(true);
    await caller().selectFromBatch({ batchId: a.batchId!, selectedAssetId: a.id, selectedReason: "Réutilisation explicite de l’édition archivée" });
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
  });
  it("filters before paging across more than fifty assets without omissions or duplicates", async () => {
    const s = await brand();
    await db.brandAsset.createMany({ data: Array.from({ length: 63 }, (_, i) => ({ strategyId: s.id, name: `Logo ${i}`, kind: "LOGO_FINAL", state: "CANDIDATE" as const, pillarTags: { d: 1 } })) });
    const first = await caller().list({ strategyId: s.id, type: "LOGO", limit: 50 });
    const rest = await caller().list({ strategyId: s.id, type: "LOGO", cursor: first.at(-1)!.id, limit: 50 });
    expect(new Set([...first, ...rest].map(a => a.id)).size).toBe(63);
    expect((await caller().list({ strategyId: s.id, search: "Logo 0", pillar: "d", type: "LOGO", limit: 1 })).map(a => a.name)).toEqual(["Logo 0"]);
    const other = await brand(), otherAsset = await caller().create(input(other.id));
    await expect(caller().list({ strategyId: s.id, cursor: otherAsset.id })).rejects.toThrow("Page d’actifs");
  });
  it("resumes governed fragments, protects them from cleanup and streams an exact large attachment", async () => {
    const s = await brand(), bytes = Buffer.alloc(ORIGINAL_CHUNK_BYTES * 3 + 29, 83);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const request = { strategyId: s.id, transfer: { action: "BEGIN" as const, name: "Synthetic large original",
      fileName: "fixture.zip", mimeType: "application/zip", contentHash: digest, byteLength: bytes.length, type: "DOCUMENT" as const } };
    const outcomes = await Promise.allSettled([caller().transfer(request), caller().transfer(request)]);
    for (const outcome of outcomes) if (outcome.status === "rejected") throw outcome.reason;
    const received = outcomes.map(outcome => (outcome as PromiseFulfilledResult<Awaited<ReturnType<ReturnType<typeof caller>["transfer"]>>>).value);
    const start = received[0]!, retry = received[1]!;
    expect(retry.assetId).toBe(start.assetId); expect(start).toMatchObject({ state: "PENDING", receivedParts: [], partCount: 4 });
    expect(JSON.stringify(start)).not.toMatch(/objectKey|backendId|keyId/);
    const a = await db.brandAsset.findUniqueOrThrow({ where: { id: start.assetId } });
    await expect(caller().selectFromBatch({ batchId: a.batchId!, selectedAssetId: a.id })).rejects.toThrow();
    vi.mocked(auth).mockResolvedValue({ user: { id: users[0]! } } as never);
    expect((await get(a.id)).status).toBe(503);
    const partInput = (index: number) => ({ strategyId: s.id, transfer: { action: "PART" as const, assetId: a.id, index,
      content: bytes.subarray(index * ORIGINAL_CHUNK_BYTES, (index + 1) * ORIGINAL_CHUNK_BYTES).toString("base64") } });
    await caller().transfer(partInput(0));
    await expect(caller().transfer({ strategyId: s.id, transfer: { action: "FINISH", assetId: a.id } })).rejects.toThrow("incomplet");
    const resumed = await caller().transfer(request); expect(resumed.receivedParts).toEqual([0]);
    await expect(caller(1).transfer(partInput(1))).rejects.toThrow();
    const other = await brand();
    await expect(caller().transfer({ ...partInput(1), strategyId: other.id })).rejects.toThrow();
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const receipt = assetChunkedReceiptSchema.parse(upload.storageReceipt), firstKey = receipt.chunks[0]!.objectKey;
    const firstCipher = await readFile(join(root, firstKey + ".enc"));
    await caller().transfer(partInput(0)); expect(await readFile(join(root, firstKey + ".enc"))).toEqual(firstCipher);
    await expect(caller().transfer({ ...partInput(0), transfer: { ...partInput(0).transfer,
      content: Buffer.alloc(ORIGINAL_CHUNK_BYTES, 42).toString("base64") } })).rejects.toThrow("changé");
    // Recheck the database's current grant on each part, even with the old session.
    await db.strategy.update({ where: { id: s.id }, data: { userId: users[1]!, operatorId: operators[1]! } });
    await expect(caller().transfer(partInput(1))).rejects.toThrow();
    await db.strategy.update({ where: { id: s.id }, data: { userId: users[0]!, operatorId: operators[0]! } });
    for (let index = 1; index < 4; index++) await caller().transfer(partInput(index));
    const finished = await caller().transfer({ strategyId: s.id, transfer: { action: "FINISH", assetId: a.id } });
    expect(finished).toMatchObject({ assetId: a.id, state: "STORED", contentHash: digest, byteLength: bytes.length });
    const finalReceipt = assetChunkedReceiptSchema.parse((await db.fileUpload.findUniqueOrThrow({ where: { id: upload.id } })).storageReceipt);
    const old = new Date(Date.now() - 3 * 86400000);
    for (const key of [finalReceipt.objectKey, ...finalReceipt.chunks.map(part => part.objectKey)]) {
      await utimes(join(root, key + ".enc"), old, old);
      expect(await db.fileUpload.count({ where: { OR: [
        { storageReceipt: { path: ["objectKey"], equals: key } },
        { storageReceipt: { path: ["chunks"], array_contains: [{ objectKey: key }] } },
      ] } })).toBe(1);
    }
    expect((await purgeExpiredCreativeMedia()).orphanedRemoved).toBe(0);
    expect((await readdir(root)).filter(name => name.endsWith(".enc"))).toEqual(expect.arrayContaining(finalReceipt.chunks.map(part => part.objectKey + ".enc")));
    const response = await get(a.id); expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(String(bytes.length));
    expect(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex")).toBe(digest);
    expect((await get(a.id, "?preview=1")).status).toBe(415);
    const emissions = await db.intentEmission.findMany({ where: { strategyId: s.id } });
    expect(JSON.stringify(emissions.map(e => e.payload))).not.toContain(partInput(0).transfer.content.slice(0, 100));
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("CANDIDATE");
    expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(1);
  });

  it("rejects a false complete fingerprint without committing or adopting its original", async () => {
    const s = await brand(), bytes = Buffer.from("synthetic false complete fingerprint");
    const begun = await caller().transfer({ strategyId: s.id, transfer: { action: "BEGIN", name: "Unverified original",
      fileName: "fixture.txt", mimeType: "text/plain", contentHash: "a".repeat(64), byteLength: bytes.length } });
    await caller().transfer({ strategyId: s.id, transfer: { action: "PART", assetId: begun.assetId, index: 0, content: bytes.toString("base64") } });
    await expect(caller().transfer({ strategyId: s.id, transfer: { action: "FINISH", assetId: begun.assetId } })).rejects.toThrow("ne correspondent pas");
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: begun.assetId } });
    const receipt = assetChunkedReceiptSchema.parse(upload.storageReceipt);
    expect(receipt.state).toBe("PENDING"); await expect(readFile(join(root, receipt.objectKey + ".enc"))).rejects.toMatchObject({ code: "ENOENT" });
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: begun.assetId } })).state).toBe("CANDIDATE");
  });

});

describe.sequential("documentary uses of already retained originals", () => {
  it("reads a large chunked document, replays concurrently and retains the same encrypted objects", async () => {
    const s = await brand(), bytes = Buffer.alloc(ORIGINAL_CHUNK_BYTES * 3 + 37, 65);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const start = await caller().transfer({ strategyId: s.id, transfer: { action: "BEGIN", name: "Large fictional document",
      fileName: "fixture.txt", mimeType: "text/plain", contentHash: digest, byteLength: bytes.length, type: "DOCUMENT" } });
    for (let index = 0; index < start.partCount; index++) await caller().transfer({ strategyId: s.id, transfer: {
      action: "PART", assetId: start.assetId, index, content: bytes.subarray(index * ORIGINAL_CHUNK_BYTES, (index + 1) * ORIGINAL_CHUNK_BYTES).toString("base64"),
    } });
    await caller().transfer({ strategyId: s.id, transfer: { action: "FINISH", assetId: start.assetId, autoTag: false } });
    const original = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: start.assetId } });
    const files = (await readdir(root)).sort(), before = await db.brandAsset.findUniqueOrThrow({ where: { id: start.assetId } });
    const [received, replay] = await Promise.all([documentCaller().uploadFile(storedDocument(s.id, start.assetId, bytes)), documentCaller().uploadFile(storedDocument(s.id, start.assetId, bytes))]);
    expect(received.sourceId).toBe(replay.sourceId);
    const source = await db.brandDataSource.findUniqueOrThrow({ where: { id: received.sourceId } });
    const use = await db.fileUpload.findUniqueOrThrow({ where: { sourceId: source.id } });
    expect(use.id).not.toBe(original.id); // Another documentary use, the same physical original.
    expect(use.storageReceipt).toEqual(original.storageReceipt);
    expect((await readdir(root)).sort()).toEqual(files);
    expect(await db.fileUpload.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original);
    expect(await db.brandAsset.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    expect(await db.brandDataSource.count({ where: { strategyId: s.id } })).toBe(1);
    expect(source.rawContent).toBe(bytes.toString()); expect(documentEdition(source.rawData)).toMatchObject(edition("v1"));
    expect(await db.aICostLog.count({ where: { strategyId: s.id } })).toBe(0);
    expect(await db.brandContextNode.count({ where: { strategyId: s.id } })).toBe(0);
    vi.mocked(auth).mockResolvedValue({ user: { id: users[0]! } } as never);
    const response = await sourceFile(new Request("http://localhost/api/brand-sources/" + source.id + "/original"), { params: Promise.resolve({ sourceId: source.id }) });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-sha256")).toBe(digest); expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    vi.mocked(auth).mockResolvedValue({ user: { id: users[1]! } } as never);
    expect((await sourceFile(new Request("http://localhost/api/brand-sources/" + source.id + "/original"), { params: Promise.resolve({ sourceId: source.id }) })).status).toBe(404);
    const payloads = await db.intentEmission.findMany({ where: { strategyId: s.id, intentKind: "LEGACY_INGESTION_UPLOAD_FILE" }, select: { payload: true } });
    expect(payloads).toHaveLength(2); expect(JSON.stringify(payloads)).not.toContain(bytes.subarray(0, 100).toString("base64"));
  });

  it("refuses a changed documentary decision on replay", async () => {
    const s = await brand(), bytes = Buffer.from("version,position\nv1,proposition de recette\n");
    const asset = await caller().create({ ...input(s.id), type: "DOCUMENT", file: { name: "fixture.csv", mimeType: "text/csv", content: bytes.toString("base64") } });
    expect((await caller().get({ id: asset.id })).documentarySource).toBeNull();
    const request = storedDocument(s.id, asset.id, bytes);
    const received = await documentCaller().uploadFile(request);
    const before = await db.brandDataSource.findUniqueOrThrow({ where: { id: received.sourceId } });
    expect((await caller().get({ id: asset.id })).documentarySource).toEqual({ id: before.id, processingStatus: "EXTRACTED" });
    expect((await documentCaller().uploadFile(request)).sourceId).toBe(before.id);
    await expect(documentCaller().uploadFile({ ...request, document: { ...edition("v1"), status: "REFERENCE" } })).rejects.toThrow("déjà classé");
    expect(await db.brandDataSource.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    expect(await db.brandDataSource.count({ where: { strategyId: s.id } })).toBe(1);
    expect(await db.aICostLog.count({ where: { strategyId: s.id } })).toBe(0);
  });

  it("rejects foreign, stale, incomplete and physically corrupted originals without admitting a source", async () => {
    const s = await brand(), bytes = Buffer.from("position,statut\nrecette,proposition\n");
    const a = await caller().create({ ...input(s.id), type: "DOCUMENT", file: { name: "fixture.csv", mimeType: "text/csv", content: bytes.toString("base64") } });
    const request = storedDocument(s.id, a.id, bytes), other = await brand();
    await expect(documentCaller(1).uploadFile(request)).rejects.toThrow();
    await expect(documentCaller().uploadFile({ ...request, strategyId: other.id })).rejects.toThrow();
    await expect(documentCaller().uploadFile({ ...request, retainedAsset: { assetId: a.id, contentHash: "0".repeat(64) } })).rejects.toThrow();
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const receipt = upload.storageReceipt as { objectKey: string };
    await db.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: { ...upload.storageReceipt as object, state: "PENDING" } } });
    await expect(documentCaller().uploadFile(request)).rejects.toThrow();
    await db.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: upload.storageReceipt! } });
    await writeFile(join(root, receipt.objectKey + ".enc"), "damaged");
    await expect(documentCaller().uploadFile(request)).rejects.toThrow();
    expect(await db.brandDataSource.count({ where: { strategyId: { in: [s.id, other.id] } } })).toBe(0);
    expect(await readFile(join(root, receipt.objectKey + ".enc"), "utf8")).toBe("damaged");
  });

  it("rechecks ownership and the stored receipt after physical reading", async () => {
    const s = await brand(), other = await brand(), bytes = Buffer.from("Recette : lecture documentaire, sans adoption.");
    const a = await caller().create({ ...input(s.id), type: "DOCUMENT", file: { name: "fixture.txt", mimeType: "text/plain", content: bytes.toString("base64") } });
    const extract = extractors.extractReceivedFile;
    const spy = vi.spyOn(extractors, "extractReceivedFile").mockImplementationOnce(async (...args) => {
      const result = await extract(...args);
      await db.brandAsset.update({ where: { id: a.id }, data: { strategyId: other.id } });
      return result;
    });
    try { await expect(documentCaller().uploadFile(storedDocument(s.id, a.id, bytes))).rejects.toThrow(); }
    finally { spy.mockRestore(); await db.brandAsset.update({ where: { id: a.id }, data: { strategyId: s.id } }); }
    expect(await db.brandDataSource.count({ where: { strategyId: s.id } })).toBe(0);
    const upload = await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } });
    const receiptSpy = vi.spyOn(extractors, "extractReceivedFile").mockImplementationOnce(async (...args) => {
      const result = await extract(...args);
      await db.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: { ...upload.storageReceipt as object, state: "PENDING" } } });
      return result;
    });
    try { await expect(documentCaller().uploadFile(storedDocument(s.id, a.id, bytes))).rejects.toThrow(); }
    finally { receiptSpy.mockRestore(); await db.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: upload.storageReceipt! } }); }
    expect(await db.brandDataSource.count({ where: { strategyId: s.id } })).toBe(0);
  });

  it("keeps a raster PDF visibly unread, then accepts an explicit manual reading as the same version's format", async () => {
    const s = await brand(), text = Buffer.from("Édition fictive : proposition à vérifier, sans adoption.");
    const textAsset = await caller().create({ ...input(s.id), type: "DOCUMENT", file: { name: "edition.txt", mimeType: "text/plain", content: text.toString("base64") } });
    const first = await documentCaller().uploadFile(storedDocument(s.id, textAsset.id, text));
    const canonical = await db.brandDataSource.findUniqueOrThrow({ where: { id: first.sourceId } });
    const pdf = new jsPDF(); pdf.addImage(png.toString("base64"), "PNG", 20, 20, 30, 30);
    const bytes = Buffer.from(pdf.output("arraybuffer"));
    const a = await caller().create({ ...input(s.id), type: "DOCUMENT", file: { name: "edition.pdf", mimeType: "application/pdf", content: bytes.toString("base64") } });
    const request = { strategyId: s.id, retainedAsset: { assetId: a.id, contentHash: createHash("sha256").update(bytes).digest("hex") }, prepareAnalysis: false,
      documentRepresentation: { canonical: { sourceId: canonical.id, contentHash: sourceFingerprint(canonical) }, reason: "Même édition fictive au format PDF illustré." } };
    const received = await documentCaller().uploadFile(request);
    expect(received).toMatchObject({ needsManualReading: true, readingError: expect.stringContaining("texte lisible") });
    const unread = await db.brandDataSource.findUniqueOrThrow({ where: { id: received.sourceId } });
    expect(unread.processingStatus).toBe("FAILED"); expect(documentEdition(unread.rawData)).toBeNull(); expect(documentRepresentation(unread.rawData)).toBeNull();
    expect((await caller().get({ id: a.id })).documentarySource).toEqual({ id: unread.id, processingStatus: "FAILED" });
    const corrected = await documentCaller().updateSource({ id: unread.id, expectedSourceHash: sourceFingerprint(unread), content: "Lecture humaine fictive, page 1 : un rectangle rouge. Aucun texte ni décision dans l’image." });
    if (!("processingStatus" in corrected)) throw new Error("Expected the corrected source, not a shared-use link");
    expect(corrected.processingStatus).toBe("EXTRACTED"); expect(corrected.errorMessage).toBeNull();
    const result = await documentCaller().updateSource({ id: unread.id, expectedSourceHash: sourceFingerprint(corrected), documentRepresentation: request.documentRepresentation });
    if (!("rawData" in result)) throw new Error("Expected the classified source, not a shared-use link");
    expect(documentRepresentation(result.rawData)?.canonicalSourceId).toBe(canonical.id); expect(sourceIsUsable(result.rawData)).toBe(false);
    expect((await db.fileUpload.findUniqueOrThrow({ where: { sourceId: unread.id } })).storageReceipt).toEqual((await db.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: a.id } })).storageReceipt);
    expect((await db.brandDataSource.findUniqueOrThrow({ where: { id: canonical.id } })).rawData).toEqual(canonical.rawData);
    expect(await db.aICostLog.count({ where: { strategyId: s.id } })).toBe(0);
  });
});
