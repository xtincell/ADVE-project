import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { previewPublicBrand, readPublicBrand, freezeObservedPublicBrand, publishPublicBrand } from "@/server/services/brand-vault/publication";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { brandVaultRouter } from "@/server/trpc/routers/brand-vault";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { PublicBrandContent, PublicBrandEdition } from "@/domain/public-brand";
import { GET } from "@/app/api/export/[strategyId]/route";

const brands: string[] = [], users: string[] = [], ops: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
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
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: ops } } });
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
describe("Public brand editions", () => {
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
    const privateResponse = await GET(new Request(`https://powerupgraders.com/api/export/${s.id}`), { params: Promise.resolve({ strategyId: s.id }) }); expect(privateResponse.status).toBe(401);
  });
});
