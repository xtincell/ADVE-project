/** Real governed intake, file store, publication and tenant checks; synthetic DB. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
import { readAssetOriginal } from "@/server/services/brand-vault/original";
import { resolveBrandIdentity } from "@/server/services/brand-theme";
import { readPublicBrand } from "@/server/services/brand-vault/publication";
import { GET } from "@/app/api/brand-assets/[assetId]/original/route";
import { GET as publicFile } from "@/app/brand/editions/[editionId]/[file]/route";

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
  await db.brandAsset.updateMany({ where, data: { parentBrandAssetId: null, supersededById: null } });
  await db.brandAsset.deleteMany({ where }); await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: operators } } });
  await rm(root, { recursive: true, force: true }); vi.unstubAllEnvs(); await db.$disconnect();
});
const context = (index = 0) => ({ db, headers: undefined, session: { user: { id: users[index]!, role: "USER" as const, operatorId: operators[index] }, expires: new Date(Date.now() + 60000).toISOString() } });
const caller = (index = 0) => brandVaultRouter.createCaller(context(index));
async function brand() {
  const s = await db.strategy.create({ data: { name: "Private assets fixture", userId: users[0]!, operatorId: operators[0]!, publicSlug: "LFA-vault-" + randomUUID() } }); brands.push(s.id); return s;
}
const input = (strategyId: string, externalId = randomUUID(), bytes = png) => ({ strategyId, name: "Original logo", type: "LOGO" as const,
  file: { name: "logo.png", mimeType: "image/png", content: bytes.toString("base64") }, pillarTags: { d: 1 },
  provenance: { provider: "GOOGLE_DRIVE" as const, externalId, path: "SPAWT/Brand/Logo/logo.png" } });
const get = (assetId: string, query = "") => GET(new Request(`http://localhost/api/brand-assets/${assetId}/original${query}`), { params: Promise.resolve({ assetId }) });

describe.sequential("private asset originals through the existing vault", () => {
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
});
