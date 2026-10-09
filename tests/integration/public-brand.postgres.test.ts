import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { previewPublicBrand, readPublicBrand, freezeObservedPublicBrand, publishPublicBrand } from "@/server/services/brand-vault/publication";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { brandVaultRouter } from "@/server/trpc/routers/brand-vault";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { PublicBrandContent, PublicBrandEdition, PublicBrandEditionV2, type PublicIdentityChoice } from "@/domain/public-brand";
import { GET } from "@/app/api/export/[strategyId]/route";
import { GET as imageGet } from "@/app/brand/editions/[editionId]/[file]/route";
import { mediaStoreConfiguration, putEncryptedMedia } from "@/lib/encrypted-media-store";
import { purgeExpiredCreativeMedia } from "@/server/services/seshat/creative-intelligence/media-archive";

afterEach(() => vi.unstubAllEnvs());
const brands: string[] = [], users: string[] = [], ops: string[] = [];
const sourcePath = `/brand/public-fixture-${randomUUID()}`;
let storeRoot: string, pngOne: Buffer, pngTwo: Buffer;
const digestBytes = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
beforeEach(() => {
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "15".repeat(32));
  vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", storeRoot);
  vi.stubEnv("AUTH_URL", "https://powerupgraders.com");
});
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  storeRoot = await mkdtemp(path.join(tmpdir(), "public-brand-bytes-"));
  await mkdir(path.join(process.cwd(), "public", sourcePath), { recursive: true });
  pngOne = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).png().toBuffer();
  pngTwo = await sharp({ create: { width: 2, height: 2, channels: 4, background: "blue" } }).png().toBuffer();
  for (const name of ["contour", "versioned", "runtime-logo"]) await writeFile(path.join(process.cwd(), "public", sourcePath, name + ".png"), pngOne);
  for (let i = 0; i < 2; i++) {
    const op = await db.operator.create({ data: { name: "Public edition fixture", slug: randomUUID(), status: "ACTIVE",
      licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } }); ops.push(op.id);
    users.push((await db.user.create({ data: { email: randomUUID() + "@example.invalid", operatorId: op.id } })).id);
  }
});
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  // Remove descendants first to retain the actual FK constraints in tests.
  const assets = await db.brandAsset.findMany({ where, orderBy: { version: "desc" } });
  await db.brandAsset.updateMany({ where, data: { supersededById: null } });
  for (const a of assets) await db.brandAsset.delete({ where: { id: a.id } });
  await db.brandDataSource.deleteMany({ where }); await db.pillar.deleteMany({ where });
  await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.campaign.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: ops } } });
  await rm(path.join(process.cwd(), "public", sourcePath), { recursive: true, force: true });
  await rm(storeRoot, { recursive: true, force: true });
  await db.$disconnect();
});
async function fixture(slug = "LFA-fixture-" + randomUUID()) {
  const s = await db.strategy.create({ data: { name: "Synthetic public brand", userId: users[0]!, operatorId: ops[0]!, publicSlug: slug,
    businessContext: { contactEmail: "PRIVATE@example.invalid", secret: "NEVER_PUBLIC" } } }); brands.push(s.id);
  await db.pillar.create({ data: { strategyId: s.id, key: "a", content: { accroche: "Draft not a publication", privateNotes: "NEVER_PUBLIC" }, validationStatus: "AI_PROPOSED", fieldCertainty: { accroche: "INFERRED" } } });
  return s;
}
function caller(userId = users[0]!) { return strategyRouter.createCaller({ db, headers: undefined, session: {
  user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60000).toISOString() } }); }
async function publish(id: string, title: string) {
  const p = await caller().publicPage({ id });
  await caller().update({ id, recalculateScore: false, publicPage: { expectedRevision: p.revision,
    expectedPublishedId: p.published?.id ?? null, content: { ...p.proposed, title } } });
  return p;
}
// Exercise static serving before the fix, then the actual bounded image route.
async function renderedLogoBytes(url: string) {
  const pathname = new URL(url).pathname;
  if (pathname.startsWith("/brand/editions/")) {
    const [, , , editionId, file] = pathname.split("/");
    const response = await imageGet(new Request(url), { params: Promise.resolve({ editionId: editionId!, file: file! }) });
    expect(response.status).toBe(200);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", pathname));
}
async function imageResponse(url: string, headers?: HeadersInit) {
  const [, , , editionId, file] = new URL(url).pathname.split("/");
  return imageGet(new Request(url, { headers }), { params: Promise.resolve({ editionId: editionId!, file: file! }) });
}
async function logoFixture(name: string) {
  const s = await fixture(), relative = `${sourcePath}/${randomUUID()}.png`;
  await writeFile(path.join(process.cwd(), "public", relative), pngOne);
  const logo = await db.brandAsset.create({ data: { strategyId: s.id, name, kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: relative } });
  return { s, logo, relative };
}
async function identityFixture() {
  const s = await fixture(), quote = "Ton chat a flairé un spot que tu n’as jamais testé.";
  const source = await db.brandDataSource.create({ data: { strategyId: s.id, sourceType: "MANUAL_INPUT", rawContent: "PRIVATE CHARTER\n" + quote, processingStatus: "EXTRACTED" } });
  const create = (kind: string, name: string, content?: object, fileUrl?: string) => db.brandAsset.create({ data: {
    strategyId: s.id, kind, name, content, fileUrl, state: "ACTIVE" } });
  const colors = { ink: "#0A0A0A", signature: "#C8A44E", community: "#2D6B4F", paper: "#FAFAF8", warm: "#E89A39", soft: "#EFE8DC" };
  const palette = await create("CHROMATIC_STRATEGY", "Palette", { full: Object.values(colors) });
  const displayUrl = `${sourcePath}/${randomUUID()}.otf`, bodyUrl = `${sourcePath}/${randomUUID()}.ttf`, mascotUrl = `${sourcePath}/${randomUUID()}.png`;
  for (const [target, original] of [[displayUrl, "/brand/spawt/fonts/Klinsman-Regular.otf"], [bodyUrl, "/brand/spawt/fonts/Gotham-Book.ttf"]])
    await writeFile(path.join(process.cwd(), "public", target!), await readFile(path.join(process.cwd(), "public", original!)));
  await writeFile(path.join(process.cwd(), "public", mascotUrl), pngOne);
  const typography = await create("TYPOGRAPHY_SYSTEM", "Typography with an explicit historical ambiguity", {
    primary: { family: "Klinsman", role: "body and display", files: [displayUrl] }, secondary: { family: "Gotham", role: "body and display", files: [bodyUrl] } });
  const display = await create("GENERIC", "Display file", undefined, displayUrl), body = await create("GENERIC", "Body file", undefined, bodyUrl);
  const persona = await create("PERSONA", "Character"), mascot = await create("KV_VISUAL", "A name that does not determine the role", undefined, mascotUrl);
  const pick = (a: { id: string; version: number }) => ({ assetId: a.id, version: a.version });
  const choice: PublicIdentityChoice = { referenceSourceId: source.id, palette: { ...pick(palette), roles: colors },
    typography: { ...pick(typography), display: { family: "Klinsman", faces: [{ ...pick(display), weight: 400 }] }, body: { family: "Gotham", faces: [{ ...pick(body), weight: 400 }] } },
    mascots: { ...pick(persona), uses: [{ ...pick(mascot), role: "guide", alt: "Character guides" }] }, voice: { quote, attribution: "Character" } };
  const submit = async (identity = choice) => { const p = await caller().publicPage({ id: s.id });
    return caller().update({ id: s.id, recalculateScore: false, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published?.id ?? null, content: p.published?.content ?? p.proposed, identity } }); };
  return { s, source, palette, typography, display, body, mascot, choice, submit, mascotUrl, bodyUrl };
}
describe("Public brand editions", () => {
  it("publishes selected palette, font roles, mascot and exact voice without exporting private references", async () => {
    const f = await identityFixture(); await f.submit();
    const edition = PublicBrandEditionV2.parse(await readPublicBrand(f.s.publicSlug!, true));
    expect(edition.content.identity?.palette).toEqual(f.choice.palette!.roles);
    expect(edition.content.identity?.typography?.body.family).toBe("Gotham");
    expect(edition.content.identity?.mascots[0]?.role).toBe("guide");
    expect(edition.content.identity?.voice).toEqual(f.choice.voice);
    expect(JSON.stringify(edition)).not.toMatch(/PRIVATE CHARTER|referenceSourceId|identityChoice|assetId|identityArchives|sourceReceipts/);
    const body = edition.content.identity!.typography!.body.faces[0]!.file;
    const response = await imageResponse(body.url, { Origin: "https://spawt.online" });
    expect(response.headers.get("content-type")).toBe("font/ttf");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://spawt.online");
    expect(digestBytes(Buffer.from(await response.arrayBuffer()))).toBe(body.hash);
    expect(PublicBrandEdition.parse(await readPublicBrand(f.s.publicSlug!)).content).not.toHaveProperty("identity");
    const v2 = await GET(new Request(`https://example.invalid/api/export/${f.s.publicSlug}?format=public-brand-v2`), { params: Promise.resolve({ strategyId: f.s.publicSlug! }) });
    expect(PublicBrandEditionV2.parse(await v2.json()).digest).toBe(edition.digest);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: f.typography.id } })).content).toMatchObject({ primary: { role: "body and display" } });
  });
  it("retains and restores every identity file without reading changed mutable sources", async () => {
    const f = await identityFixture(); await f.submit(); const one = PublicBrandEditionV2.parse(await readPublicBrand(f.s.publicSlug!, true));
    await writeFile(path.join(process.cwd(), "public", f.mascotUrl), pngTwo);
    await writeFile(path.join(process.cwd(), "public", f.bodyUrl), "broken new source");
    await publish(f.s.id, "Text-only review"); const p = await caller().publicPage({ id: f.s.id });
    await caller().update({ id: f.s.id, recalculateScore: false, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id, content: p.published!.content, restoreId: one.edition } });
    const restored = PublicBrandEditionV2.parse(await readPublicBrand(f.s.publicSlug!, true));
    expect(restored.edition).not.toBe(one.edition);
    expect(restored.content.identity?.mascots[0]?.file.hash).toBe(digestBytes(pngOne));
    expect(digestBytes(await renderedLogoBytes(restored.content.identity!.mascots[0]!.file.url))).toBe(digestBytes(pngOne));
    expect(digestBytes(await renderedLogoBytes(restored.content.identity!.typography!.body.faces[0]!.file.url))).toBe(one.content.identity!.typography!.body.faces[0]!.file.hash);
  });
  it("refuses foreign, draft, wrong-version and campaign identity choices without replacing the edition", async () => {
    const f = await identityFixture(), other = await identityFixture(); await f.submit();
    const first = await readPublicBrand(f.s.publicSlug!, true);
    for (const palette of [{ ...f.choice.palette!, assetId: other.palette.id }, { ...f.choice.palette!, version: 999 },
      { ...f.choice.palette!, roles: { ...f.choice.palette!.roles, ink: "#FFFFFF" } }]) {
      await expect(f.submit({ ...f.choice, palette })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
    const draft = await db.brandAsset.create({ data: { strategyId: f.s.id, kind: "CHROMATIC_STRATEGY", name: "Unselected proposal", state: "DRAFT", content: { full: Object.values(f.choice.palette!.roles) } } });
    await expect(f.submit({ ...f.choice, palette: { ...f.choice.palette!, assetId: draft.id } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const campaign = await db.campaign.create({ data: { strategyId: f.s.id, name: "Campaign-only palette" } });
    const scoped = await db.brandAsset.create({ data: { strategyId: f.s.id, campaignId: campaign.id, kind: "CHROMATIC_STRATEGY", name: "Campaign palette", state: "ACTIVE", content: { full: Object.values(f.choice.palette!.roles) } } });
    await expect(f.submit({ ...f.choice, palette: { ...f.choice.palette!, assetId: scoped.id } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(f.submit({ ...f.choice, voice: { quote: "An invented instruction", attribution: "Character" } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(f.submit({ ...f.choice, palette: { ...f.choice.palette!, roles: { ...f.choice.palette!.roles, paper: f.choice.palette!.roles.ink } } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(f.submit({ ...f.choice, typography: { ...f.choice.typography!, body: { ...f.choice.typography!.body, faces: [{ assetId: f.display.id, version: f.display.version, weight: 400 }] } } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(f.submit({ ...f.choice, typography: { ...f.choice.typography!, body: { ...f.choice.typography!.body, faces: [{ assetId: f.body.id, version: f.body.version, weight: 700 }] } } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readPublicBrand(f.s.publicSlug!, true))?.edition).toBe(first!.edition);
  });
  it("fences identity edits and documentary corrections between review and publish", async () => {
    const f = await identityFixture(), p = await caller().publicPage({ id: f.s.id });
    await db.brandAsset.update({ where: { id: f.palette.id }, data: { content: { full: ["#FFFFFF"] } } });
    await expect(caller().update({ id: f.s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed, identity: f.choice } })).rejects.toMatchObject({ code: "CONFLICT" });
    const q = await caller().publicPage({ id: f.s.id });
    await db.brandDataSource.update({ where: { id: f.source.id }, data: { rawContent: "Corrected reference" } });
    await expect(caller().update({ id: f.s.id, publicPage: { expectedRevision: q.revision, expectedPublishedId: null, content: q.proposed, identity: f.choice } })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await readPublicBrand(f.s.publicSlug!, true)).toBeNull();
  });
  it("does not purge retained identity files and refuses a corrupt font before 304 or republication", async () => {
    const f = await identityFixture(); await f.submit(); const edition = PublicBrandEditionV2.parse(await readPublicBrand(f.s.publicSlug!, true));
    const asset = await db.brandAsset.findUniqueOrThrow({ where: { id: edition.edition } });
    const archives = (asset.metadata as unknown as { identityArchives: Array<{ role: string; receipt: { objectKey: string } }> }).identityArchives;
    const old = new Date(Date.now() - 2 * 86400000);
    for (const item of archives) await utimes(path.join(storeRoot, item.receipt.objectKey + ".enc"), old, old);
    await purgeExpiredCreativeMedia();
    for (const item of archives) expect(await readFile(path.join(storeRoot, item.receipt.objectKey + ".enc"))).not.toHaveLength(0);
    const font = edition.content.identity!.typography!.body.faces[0]!.file;
    const good = await imageResponse(font.url);
    await writeFile(path.join(storeRoot, archives.find(a => a.role === "body:400")!.receipt.objectKey + ".enc"), "corrupt");
    expect((await imageResponse(font.url, { "If-None-Match": good.headers.get("etag")! })).status).toBe(503);
    await expect(publish(f.s.id, "Refused corrupt copy")).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readPublicBrand(f.s.publicSlug!, true))?.edition).toBe(edition.edition);
  });
  it("republishes a reviewed edition with the same retained logo despite a changed source", async () => {
    const { s, relative } = await logoFixture("Reviewed logo"); await publish(s.id, "First text");
    const p = await caller().publicPage({ id: s.id });
    await writeFile(path.join(process.cwd(), "public", relative), pngTwo);
    await caller().update({ id: s.id, recalculateScore: false, publicPage: {
      expectedRevision: p.revision, expectedPublishedId: p.published!.id,
      content: { ...p.published!.content, title: "Reviewed second text" }, logoAssetId: p.published!.logoAssetId!,
    } });
    const next = (await readPublicBrand(s.publicSlug!))!;
    expect(next.content.title).toBe("Reviewed second text"); expect(next.edition).not.toBe(p.published!.id);
    expect(digestBytes(await renderedLogoBytes(next.content.logoUrl!))).toBe(digestBytes(pngOne));
  });
  it("refuses damaged storage instead of returning source bytes or a false 304", async () => {
    const { s, relative } = await logoFixture("Corrupt retained copy");
    await publish(s.id, "Keep this edition"); const edition = (await readPublicBrand(s.publicSlug!))!;
    const first = await imageResponse(edition.content.logoUrl!);
    expect(first.status).toBe(200); expect(first.headers.get("content-type")).toBe("image/png");
    expect(first.headers.get("x-content-sha256")).toBe(digestBytes(pngOne));
    expect((await imageResponse(edition.content.logoUrl!, { "If-None-Match": first.headers.get("etag")! })).status).toBe(304);
    const receipt = await db.brandAsset.findUniqueOrThrow({ where: { id: edition.edition } });
    const archive = (receipt.metadata as { logoArchive: { objectKey: string } }).logoArchive;
    await writeFile(path.join(storeRoot, archive.objectKey + ".enc"), "corrupt");
    await writeFile(path.join(process.cwd(), "public", relative), pngTwo);
    const broken = await imageResponse(edition.content.logoUrl!, { "If-None-Match": first.headers.get("etag")! });
    expect(broken.status).toBe(503); expect(broken.headers.get("cache-control")).toBe("no-store");
    expect((await readPublicBrand(s.publicSlug!))?.edition).toBe(edition.edition);
  });
  it("serves only the published edition and exact hash while respecting brand withdrawal", async () => {
    const { s } = await logoFixture("Bounded public copy"); await publish(s.id, "Public");
    const edition = (await readPublicBrand(s.publicSlug!))!;
    expect((await imageResponse(edition.content.logoUrl! + "?token=wrong")).status).toBe(404);
    expect((await imageResponse(edition.content.logoUrl!.replace(digestBytes(pngOne), "0".repeat(64)))).status).toBe(404);
    const publicAsset = await db.brandAsset.findUniqueOrThrow({ where: { id: edition.edition } });
    const privateCopy = await db.brandAsset.create({ data: { strategyId: s.id, name: "Never public", kind: "BRAND_GUIDELINES", format: "public-brand-v1", state: "DRAFT", content: publicAsset.content!, metadata: publicAsset.metadata! } });
    expect((await imageResponse(edition.content.logoUrl!.replace(edition.edition, privateCopy.id))).status).toBe(404);
    await db.strategy.update({ where: { id: s.id }, data: { status: "ARCHIVED" } });
    expect((await imageResponse(edition.content.logoUrl!)).status).toBe(404);
  });
  it("keeps historical archive references during cleanup and removes actual orphans", async () => {
    const { s } = await logoFixture("Historical retained copy"); await publish(s.id, "One");
    const edition = (await readPublicBrand(s.publicSlug!))!;
    const published = await db.brandAsset.findUniqueOrThrow({ where: { id: edition.edition } });
    const archive = (published.metadata as { logoArchive: { objectKey: string } }).logoArchive;
    await publish(s.id, "Two");
    const orphan = "c7".repeat(32); await putEncryptedMedia(mediaStoreConfiguration()!, orphan, pngTwo);
    const old = new Date(Date.now() - 2 * 86400000);
    for (const key of [archive.objectKey, orphan]) await utimes(path.join(storeRoot, key + ".enc"), old, old);
    expect((await purgeExpiredCreativeMedia()).orphanedRemoved).toBe(1);
    expect((await readdir(storeRoot)).includes(orphan + ".enc")).toBe(false);
    expect(digestBytes(await renderedLogoBytes(edition.content.logoUrl!))).toBe(digestBytes(pngOne));
  });
  it("never invents historical bytes when restoring an edition that has no byte receipt", async () => {
    const { s, relative } = await logoFixture("Legacy source");
    const old = await db.brandAsset.create({ data: { strategyId: s.id, name: "Legacy publication", kind: "BRAND_GUIDELINES", format: "public-brand-v1", state: "ACTIVE",
      content: { name: s.name, title: "Legacy", tagline: "", description: "", links: [], logoUrl: "https://powerupgraders.com" + relative } } });
    await publish(s.id, "Current retained version"); const p = await caller().publicPage({ id: s.id });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id, content: p.proposed, restoreId: old.id } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readPublicBrand(s.publicSlug!))?.content.title).toBe("Current retained version");
  });
  it("replays a retained publication without capturing changed source bytes or writing another object", async () => {
    const { s, relative } = await logoFixture("Idempotent capture"), p = await caller().publicPage({ id: s.id });
    const intentId = await openEmission({ kind: "LEGACY_STRATEGY_UPDATE", strategyId: s.id, caller: "test:byte-replay", payload: {} });
    const input = { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed };
    const first = await publishPublicBrand(s.id, users[0]!, intentId, input), files = await readdir(storeRoot);
    await writeFile(path.join(process.cwd(), "public", relative), pngTwo);
    const replay = await publishPublicBrand(s.id, users[0]!, intentId, input);
    expect(replay.id).toBe(first.id); expect(await readdir(storeRoot)).toEqual(files);
    expect(digestBytes(await renderedLogoBytes((replay.content as { logoUrl: string }).logoUrl))).toBe(digestBytes(pngOne));
    await closeEmission({ intentId, status: "OK", result: {} });
  });
  it("does not write a retained object for a foreign publisher", async () => {
    const { s } = await logoFixture("Foreign publisher"), p = await caller().publicPage({ id: s.id }), files = await readdir(storeRoot);
    await expect(caller(users[1]).update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await readdir(storeRoot)).toEqual(files); expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("refuses invalid images and SVGs with external resources without replacing the live edition", async () => {
    const { s, relative } = await logoFixture("Bad source"); await publish(s.id, "Keep retained image");
    const edition = (await readPublicBrand(s.publicSlug!))!;
    for (const bytes of [Buffer.from("not an image"), pngOne.subarray(0, 40), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><image href="https://example.invalid/changing.png"/></svg>')]) {
      await writeFile(path.join(process.cwd(), "public", relative), bytes);
      await expect(publish(s.id, "Refused image")).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect((await readPublicBrand(s.publicSlug!))?.edition).toBe(edition.edition);
    }
    expect(digestBytes(await renderedLogoBytes(edition.content.logoUrl!))).toBe(digestBytes(pngOne));
  });
  it("keeps the published bytes when the source file changes at the same URL", async () => {
    const s = await fixture(), relative = `${sourcePath}/mutable.png`;
    await writeFile(path.join(process.cwd(), "public", relative), pngOne);
    await db.brandAsset.create({ data: { strategyId: s.id, name: "Mutable source", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: relative } });
    await publish(s.id, "Frozen bytes"); const edition = (await readPublicBrand(s.publicSlug!))!;
    await writeFile(path.join(process.cwd(), "public", relative), pngTwo);
    expect(digestBytes(await renderedLogoBytes(edition.content.logoUrl!))).toBe(digestBytes(pngOne));
  });
  it("restores the bytes of the old edition after the source changes and the origin moves", async () => {
    const s = await fixture(), relative = `${sourcePath}/restored.png`;
    await writeFile(path.join(process.cwd(), "public", relative), pngOne);
    await db.brandAsset.create({ data: { strategyId: s.id, name: "Restore source", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: relative } });
    await publish(s.id, "One"); const one = (await readPublicBrand(s.publicSlug!))!;
    await publish(s.id, "Two");
    await writeFile(path.join(process.cwd(), "public", relative), pngTwo);
    vi.stubEnv("AUTH_URL", "https://next-public.example.invalid");
    const p = await caller().publicPage({ id: s.id });
    await caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id,
      content: p.proposed, restoreId: one.edition } });
    const restored = (await readPublicBrand(s.publicSlug!))!;
    expect(digestBytes(await renderedLogoBytes(restored.content.logoUrl!))).toBe(digestBytes(pngOne));
    expect(new URL(restored.content.logoUrl!).origin).toBe("https://next-public.example.invalid");
  });
  it("does not acknowledge a logo publication without configured byte retention", async () => {
    const s = await fixture(), relative = `${sourcePath}/no-store.png`;
    await writeFile(path.join(process.cwd(), "public", relative), pngOne);
    await db.brandAsset.create({ data: { strategyId: s.id, name: "No store", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: relative } });
    vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "");
    await expect(publish(s.id, "No receipt")).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("never publishes from a slug or an anonymous read", async () => {
    const s = await fixture(); expect(await readPublicBrand(s.publicSlug!)).toBeNull();
    expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(0);
  });
  it("activates from the chosen public name, not the internal dossier label", async () => {
    const s = await fixture(); await db.strategy.update({ where: { id: s.id }, data: { publicSlug: null } });
    const p = await caller().publicPage({ id: s.id }); const name = "Short " + randomUUID();
    await caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null,
      content: { ...p.proposed, name } } });
    const current = await db.strategy.findUniqueOrThrow({ where: { id: s.id } });
    expect(current.publicSlug).toBe("LFA-" + name.toLowerCase().replaceAll(" ", "-"));
    expect((await readPublicBrand(current.publicSlug!))?.content.name).toBe(name);
  });
  it("preserves an observed page once without inventing a human selection", async () => {
    const s = await fixture();
    const id = await openEmission({ kind: "LEGACY_STRATEGY_UPDATE", strategyId: s.id, caller: "test:observed-publication", payload: {} });
    expect(await freezeObservedPublicBrand(s.id, id)).toBe(true);
    await closeEmission({ intentId: id, status: "OK", result: {} });
    expect(await freezeObservedPublicBrand(s.id, id)).toBe(false);
    await db.pillar.update({ where: { strategyId_key: { strategyId: s.id, key: "a" } }, data: { content: { accroche: "Unreviewed later draft" }, currentVersion: 2 } });
    const edition = await readPublicBrand(s.publicSlug!);
    expect(edition?.selection).toBe("observed"); expect(edition?.content.tagline).toBe("Draft not a publication");
    expect(JSON.stringify(edition)).not.toMatch(/PRIVATE|NEVER_PUBLIC|sourceReceipts|operatorId|pillarVersions/);
  });
  it("publishes through the existing governed wrapper and stays frozen after a draft edit", async () => {
    const s = await fixture(); await publish(s.id, "Chosen public title");
    await db.pillar.update({ where: { strategyId_key: { strategyId: s.id, key: "a" } }, data: { content: { accroche: "Next private draft" }, currentVersion: 2 } });
    const edition = await readPublicBrand(s.publicSlug!);
    expect(edition?.content.title).toBe("Chosen public title"); expect(edition?.content.tagline).toBe("Draft not a publication");
    expect(edition?.selection).toBe("chosen"); expect(PublicBrandEdition.safeParse(edition).success).toBe(true);
    expect(await db.intentEmission.count({ where: { strategyId: s.id, selfHash: { not: null }, status: "OK" } })).toBe(1);
  });
  it("refuses a stale proposal without disturbing the current public edition", async () => {
    const s = await fixture(); await publish(s.id, "Keep this online"); const p = await caller().publicPage({ id: s.id });
    await db.pillar.update({ where: { strategyId_key: { strategyId: s.id, key: "a" } }, data: { currentVersion: 2 } });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id, content: { ...p.proposed, title: "Refused" } } })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await readPublicBrand(s.publicSlug!))?.content.title).toBe("Keep this online");
  });
  it("refuses a foreign operator on preview and publication", async () => {
    const s = await fixture(), p = await caller().publicPage({ id: s.id });
    await expect(caller(users[1]).publicPage({ id: s.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(users[1]).update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("fences documentary corrections between preview and publication", async () => {
    const s = await fixture();
    const source = await db.brandDataSource.create({ data: { strategyId: s.id, sourceType: "DOCUMENT", rawContent: "Original", processingStatus: "EXTRACTED" } });
    const p = await caller().publicPage({ id: s.id });
    await db.brandDataSource.update({ where: { id: source.id }, data: { rawContent: "Corrected documentary evidence" } });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed } })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("rejects private fields and unsafe links by construction", () => {
    const c = { name: "Brand", title: "Title", tagline: "", description: "", logoUrl: null, links: [] };
    expect(PublicBrandContent.safeParse({ ...c, contactEmail: "secret" }).success).toBe(false);
    for (const url of ["javascript:alert(1)", "https://private:secret@example.com/", "https://example.com/?token=secret"]) {
      expect(PublicBrandContent.safeParse({ ...c, links: [{ label: "A", url }] }).success).toBe(false);
    }
  });
  it("does not select a stale or signed logo", async () => {
    const s = await fixture();
    await db.brandAsset.create({ data: { strategyId: s.id, name: "Stale logo", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: "https://example.invalid/logo.png", staleAt: new Date() } });
    await db.brandAsset.create({ data: { strategyId: s.id, name: "Private logo", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: "https://example.invalid/logo.png?signature=secret" } });
    expect((await caller().publicPage({ id: s.id })).proposed.logoUrl).toBeNull();
  });
  it("lists selected variants with versions and never picks the first of several active logos", async () => {
    const s = await fixture();
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://powerupgraders.com");
    const dark = await db.brandAsset.create({ data: { strategyId: s.id, name: "Contour pour fond sombre", kind: "LOGO_FINAL", state: "SELECTED", version: 3, fileUrl: `${sourcePath}/contour.png` } });
    await db.brandAsset.createMany({ data: ["one", "two"].map((name) => ({ strategyId: s.id, name, kind: "LOGO_FINAL", state: "ACTIVE" as const, fileUrl: `https://example.invalid/${name}.png` })) });
    const p = await caller().publicPage({ id: s.id });
    expect(p.proposed.logoUrl).toBeNull();
    expect(p.logos).toContainEqual({ id: dark.id, name: dark.name, version: 3, state: "SELECTED", url: `https://powerupgraders.com${sourcePath}/contour.png` });
    await caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null,
      content: { ...p.proposed, logoUrl: p.logos.find(l => l.id === dark.id)!.url }, logoAssetId: dark.id } });
    const e = (await readPublicBrand(s.publicSlug!))!;
    expect(e.content.logoUrl).toBe(`https://powerupgraders.com/brand/editions/${e.edition}/${digestBytes(pngOne)}.png`);
    expect(digestBytes(await renderedLogoBytes(e.content.logoUrl!))).toBe(digestBytes(pngOne));
    const receipt = await db.brandAsset.findUniqueOrThrow({ where: { id: e.edition } });
    expect(receipt.metadata).toMatchObject({ logoAsset: { id: dark.id, version: 3, fileUrl: dark.fileUrl } });
    expect(JSON.stringify(e)).not.toContain(dark.id);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: dark.id } })).state).toBe("SELECTED");
  });
  it("rejects a foreign variant or an ambiguous address without explicit asset selection", async () => {
    const s = await fixture(), foreign = await fixture();
    const outside = await db.brandAsset.create({ data: { strategyId: foreign.id, name: "Other brand", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: "https://example.invalid/shared.png" } });
    await db.brandAsset.createMany({ data: ["first", "second"].map((name) => ({ strategyId: s.id, name, kind: "LOGO_FINAL", state: "SELECTED" as const, fileUrl: outside.fileUrl })) });
    const p = await caller().publicPage({ id: s.id });
    const input = { expectedRevision: p.revision, expectedPublishedId: null, content: { ...p.proposed, logoUrl: outside.fileUrl } };
    await expect(caller().update({ id: s.id, publicPage: { ...input, logoAssetId: outside.id } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(caller().update({ id: s.id, publicPage: input })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("fences variant changes and refuses restoration after its selected asset version changed", async () => {
    const s = await fixture();
    const logo = await db.brandAsset.create({ data: { strategyId: s.id, name: "Chosen", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: `${sourcePath}/versioned.png` } });
    await publish(s.id, "One"); const one = (await readPublicBrand(s.publicSlug!))!;
    const p = await caller().publicPage({ id: s.id });
    await db.brandAsset.update({ where: { id: logo.id }, data: { version: 2 } });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: one.edition, content: p.proposed } })).rejects.toMatchObject({ code: "CONFLICT" });
    await publish(s.id, "Two"); const fresh = await caller().publicPage({ id: s.id });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: fresh.revision, expectedPublishedId: fresh.published!.id, content: fresh.proposed, restoreId: one.edition } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readPublicBrand(s.publicSlug!))?.content.title).toBe("Two");
  });
  it("keeps private, draft, campaign and malformed relative logos out of the publication pool", async () => {
    const s = await fixture(); vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://powerupgraders.com");
    await db.brandAsset.createMany({ data: ["/private-media/logo.png", "/api/logo.png", "/brand/../private-media/logo.png", "//evil.invalid/brand/logo.png", "/brand/%2e%2e/private.png", "https://example.invalid/private-media/logo.png"].map((fileUrl) => ({ strategyId: s.id, name: "Refused", kind: "LOGO_FINAL", state: "ACTIVE" as const, fileUrl })) });
    await db.brandAsset.create({ data: { strategyId: s.id, name: "Unselected draft", kind: "LOGO_FINAL", state: "DRAFT", fileUrl: "https://example.invalid/draft.png" } });
    const campaign = await db.campaign.create({ data: { strategyId: s.id, name: "Campaign-only identity" } });
    await db.brandAsset.create({ data: { strategyId: s.id, campaignId: campaign.id, name: "Campaign lockup", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: "https://example.invalid/campaign.png" } });
    expect((await caller().publicPage({ id: s.id })).logos).toEqual([]);
  });
  it("does not publish an asset already based on a corrected or unavailable document", async () => {
    const s = await fixture();
    const source = await db.brandDataSource.create({ data: { strategyId: s.id, sourceType: "MANUAL_INPUT", rawContent: "Current document", processingStatus: "EXTRACTED" } });
    const logo = await db.brandAsset.create({ data: { strategyId: s.id, name: "Outdated derivative", kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: "https://example.invalid/outdated.png", metadata: { sourceDataSourceId: source.id, sourceContentHash: "0".repeat(64) } } });
    const p = await caller().publicPage({ id: s.id });
    expect(p.logos).toEqual([]);
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null, content: { ...p.proposed, logoUrl: logo.fileUrl }, logoAssetId: logo.id } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await readPublicBrand(s.publicSlug!)).toBeNull();
  });
  it("publishes a relative logo using runtime HTTPS despite the frozen build placeholder", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
    vi.stubEnv("AUTH_URL", "https://runtime.example.invalid");
    vi.stubEnv("NEXTAUTH_URL", "https://other.example.invalid");
    const s = await fixture();
    const logo = await db.brandAsset.create({ data: { strategyId: s.id, name: "Runtime logo", kind: "LOGO_FINAL", state: "SELECTED", fileUrl: `${sourcePath}/runtime-logo.png` } });
    const p = await caller().publicPage({ id: s.id });
    expect(p.logos).toEqual([expect.objectContaining({ id: logo.id, url: `https://runtime.example.invalid${sourcePath}/runtime-logo.png` })]);
    await caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: null,
      content: { ...p.proposed, logoUrl: p.logos[0]!.url }, logoAssetId: logo.id } });
    const edition = (await readPublicBrand(s.publicSlug!))!;
    expect(edition.content.logoUrl).toBe(`https://runtime.example.invalid/brand/editions/${edition.edition}/${digestBytes(pngOne)}.png`);
  });
  it("serializes two publishers from the same preview", async () => {
    const s = await fixture(), p = await caller().publicPage({ id: s.id });
    const results = await Promise.allSettled(["First", "Second"].map((title) => caller().update({ id: s.id, publicPage: {
      expectedRevision: p.revision, expectedPublishedId: null, content: { ...p.proposed, title } } })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.brandAsset.count({ where: { strategyId: s.id, format: "public-brand-v1", state: "ACTIVE" } })).toBe(1);
  });
  it("restores a prior edition as a successor, retaining all versions", async () => {
    const s = await fixture(); await publish(s.id, "Edition one"); const one = (await readPublicBrand(s.publicSlug!))!;
    await publish(s.id, "Edition two"); const p = await caller().publicPage({ id: s.id });
    await caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id, content: p.proposed, restoreId: one.edition } });
    const three = (await readPublicBrand(s.publicSlug!))!;
    expect(three.content.title).toBe("Edition one"); expect(three.version).toBe(3); expect(three.edition).not.toBe(one.edition);
    expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(3);
  });
  it("refuses a foreign or archived rollback target", async () => {
    const s = await fixture(), other = await fixture(); await publish(s.id, "Keep");
    await publish(other.id, "Other one"); const foreign = (await readPublicBrand(other.publicSlug!))!; await publish(other.id, "Other two");
    const p = await caller().publicPage({ id: s.id });
    await expect(caller().update({ id: s.id, publicPage: { expectedRevision: p.revision, expectedPublishedId: p.published!.id,
      content: p.proposed, restoreId: foreign.edition } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await readPublicBrand(s.publicSlug!))?.content.title).toBe("Keep");
  });
  it("rolls back the entire publication when the successor insert fails", async () => {
    const s = await fixture(); await publish(s.id, "Survives failure");
    const constraint = "fixture_public_" + randomUUID().replaceAll("-", "");
    await db.$executeRawUnsafe(`ALTER TABLE "BrandAsset" ADD CONSTRAINT ${constraint} CHECK (NOT ("strategyId"='${s.id}' AND version=2)) NOT VALID`);
    try {
      await expect(publish(s.id, "Cannot commit")).rejects.toThrow();
      expect((await readPublicBrand(s.publicSlug!))?.content.title).toBe("Survives failure");
      expect(await db.brandAsset.count({ where: { strategyId: s.id } })).toBe(1);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "BrandAsset" DROP CONSTRAINT ${constraint}`); }
  });
  it("keeps generic vault mutations from deleting a published edition", async () => {
    const s = await fixture(); await publish(s.id, "Keep lineage"); const e = (await readPublicBrand(s.publicSlug!))!;
    const c = brandVaultRouter.createCaller({ db, headers: undefined, session: { user: { id: users[0]!, role: "USER" }, expires: new Date(Date.now() + 60000).toISOString() } });
    await expect(c.archive({ brandAssetId: e.edition })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(c.purge({ assetIds: [e.edition] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
  it("replays the same persisted emission without creating a second edition", async () => {
    const s = await fixture(), p = await caller().publicPage({ id: s.id });
    const intentId = await openEmission({ kind: "LEGACY_STRATEGY_UPDATE", strategyId: s.id, caller: "test:replay", payload: {} });
    const input = { expectedRevision: p.revision, expectedPublishedId: null, content: p.proposed };
    const a = await publishPublicBrand(s.id, users[0]!, intentId, input), b = await publishPublicBrand(s.id, users[0]!, intentId, input);
    expect(b.id).toBe(a.id); await closeEmission({ intentId, status: "OK", result: {} });
  });
  it("exports only the public edition anonymously, with exact CORS and ETag", async () => {
    const s = await fixture(); await publish(s.id, "Public export");
    const request = new Request(`https://powerupgraders.com/api/export/${s.publicSlug}?format=public-brand`, { headers: { Origin: "https://spawt.online" } });
    const response = await GET(request, { params: Promise.resolve({ strategyId: s.publicSlug! }) });
    expect(response.status).toBe(200); expect(response.headers.get("access-control-allow-origin")).toBe("https://spawt.online");
    const payload = await response.json(); expect(PublicBrandEdition.safeParse(payload).success).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/PRIVATE|NEVER_PUBLIC|businessContext|sourceReceipts/);
    const cached = await GET(new Request(request, { headers: { "If-None-Match": response.headers.get("etag")! } }), { params: Promise.resolve({ strategyId: s.publicSlug! }) }); expect(cached.status).toBe(304);
    const foreign = await GET(new Request(request, { headers: { Origin: "https://other.invalid" } }), { params: Promise.resolve({ strategyId: s.publicSlug! }) }); expect(foreign.headers.get("access-control-allow-origin")).toBeNull();
    for (const origin of ["https://www.spawt.online", "https://portail.spawt.online"]) {
      const alias = await GET(new Request(request, { headers: { Origin: origin } }), { params: Promise.resolve({ strategyId: s.publicSlug! }) });
      expect(alias.headers.get("access-control-allow-origin")).toBe(origin);
    }
    for (const origin of ["http://portail.spawt.online", "https://portail.spawt.online.other.invalid"]) {
      const unknown = await GET(new Request(request, { headers: { Origin: origin } }), { params: Promise.resolve({ strategyId: s.publicSlug! }) });
      expect(unknown.headers.get("access-control-allow-origin")).toBeNull();
    }
    const privateResponse = await GET(new Request(`https://powerupgraders.com/api/export/${s.id}`), { params: Promise.resolve({ strategyId: s.id }) }); expect(privateResponse.status).toBe(401);
  });
});
