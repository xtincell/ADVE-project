/** Local PostgreSQL only. No provider invocation or public publication. */
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/services/anubis/notifications", () => ({ pushNotification: vi.fn(async () => undefined) }));
import { auth } from "@/lib/auth/config";
import { GET as mediaRoute } from "@/app/api/production/publication/[id]/route";
import { publicationMediaUrl, verifyPublicationMediaGrant } from "@/server/services/anubis/publication-access";
import { mediaHash } from "@/server/services/anubis/publication-media";
import { publishSocialPost, listDueScheduledPublications } from "@/server/services/anubis/social-publish";
import { encryptTokenPayload } from "@/server/services/oauth-integrations";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { calendarPreparation } from "@/domain/calendar-production";
import { prepareCalendarBriefRows, calendarProductionRows } from "@/server/services/deliverable-orchestrator/calendar-production";
import { getPublicationPackage, listPublicationPackages, preparePublicationPackage } from "@/server/services/anubis/publication-package";
import { assertOrdinaryAsset } from "@/server/services/brand-vault/engine";
import { SOCIAL_PUBLICATION_PACKAGE } from "@/domain/social-publication-package";

const suffix = randomUUID(), brand = `publication-${suffix}`, user = `user-${suffix}`, otherUser = `other-${suffix}`, op = `op-${suffix}`, source = `calendar-${suffix}`;
const json = (v: unknown) => v as Prisma.InputJsonValue;
const post = { date: "2026-11-05", format: "Post", platform: "Instagram", theme: "Sortie du quartier", angle: "Vérifier une adresse", caption: "Copy EXACTE : 2 000 F.\nPas d’invention.", illustration: "Conserver les choix de marque.", hashtags: ["#Sortie"] };
const output = { posts: [post, { ...post, format: "Story", theme: "Story du quartier" }], cadenceParCanal: { Instagram: { rythme: "1 post/sem", format: "Post", piliers: ["Lieu"] } }, themesParPhaseOverton: [{ phase: "A", contenus: ["Marché"] }] };
const send = vi.fn<typeof fetch>();
let connectionId = "";
let safe = false, briefs: {assetId: string; version: number}[], imageIds: string[] = [], packetId = "", otherPacketId = "";
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify"); safe = true;
  vi.stubEnv("NEXTAUTH_SECRET", "local-publication-image-signing-secret-only");
  vi.stubEnv("AUTH_SECRET", "local-publication-image-signing-secret-only");
  vi.stubEnv("NEXTAUTH_URL", "http://127.0.0.1:3411");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "local-publication-fixture-token-key-only");
  vi.stubGlobal("fetch", send);
  send.mockImplementation(async () => { throw new Error("Unplanned network call: isolated test"); });
  await db.operator.create({ data: { id: op, name: "Recette publication", slug: op, status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
  await db.user.createMany({ data: [{ id: user, email: `${user}@example.invalid`, operatorId: op }, { id: otherUser, email: `${otherUser}@example.invalid` }] });
  await db.strategy.create({ data: { id: brand, userId: user, operatorId: op, name: "Publication locale" } });
  connectionId = (await db.socialConnection.create({ data: { strategyId: brand, userId: user, platform: "INSTAGRAM",
    accountId: "ig-local-receipt", accountName: "Simulation Instagram — aucun compte réel",
    accessToken: encryptTokenPayload({ access_token: "local-only-token" }),
    metadata: { provider: "instagram", scopes: ["instagram_business_content_publish"] } } })).id;
  await db.pillar.create({ data: { strategyId: brand, key: "d", currentVersion: 1, content: { directionArtistique: { univers: "Terrain documentaire" } } } });
  await db.gloryOutput.create({ data: { id: source, strategyId: brand, toolSlug: "content-calendar-strategist", output } });
  const rows = await calendarProductionRows({ strategyId: brand });
  const command = calendarPreparation.parse({ strategyId: brand, calendarVersion: rows.calendarVersion, postKeys: rows.rows.map(row => row.key), optionsPerPost: 2 });
  const intentId = randomUUID();
  await db.intentEmission.create({ data: { id: intentId, strategyId: brand, intentKind: "COMPOSE_DELIVERABLE", status: "PENDING", payload: json({ calendarPreparation: command }) } });
  const prepared = await prepareCalendarBriefRows(command, user, intentId);
  await db.intentEmission.update({ where: { id: intentId }, data: { status: "OK", result: json({ output: prepared }) } });
  expect(prepared.rows[0]?.error).toBeNull(); briefs = prepared.rows.flatMap(row => row.briefs);
  for (const [index, b] of briefs.entries()) {
    const bytes = await sharp({ create: { width: 1080, height: index < 2 ? 1350 : 1920, channels: 3, background: index ? "red" : "blue" } }).png().toBuffer();
    const task = await db.generativeTask.create({ data: { intentId: randomUUID(), sourceBrandAssetId: b.assetId, strategyId: brand, operatorId: op, forgeKind: "image", provider: "Luna-fixture", providerModel: "image-fixture", status: "COMPLETED", promptHash: "a".repeat(64), parameters: {}, pillarSource: "D", manipulationMode: "entertainer", estimatedCostUsd: 0, webhookSecret: "local-test-only" } });
    const image = await db.assetVersion.create({ data: { strategyId: brand, operatorId: op, generativeTaskId: task.id, kind: "image", url: `data:image/png;base64,${bytes.toString("base64")}`, metadata: {}, fileSizeBytes: bytes.length } });
    imageIds.push(image.id);
  }
});
afterAll(async () => {
  if (!safe) return;
  await db.brandAction.deleteMany({ where: { strategyId: brand } });
  await db.brandAsset.updateMany({ where: { strategyId: brand }, data: { sourceAssetVersionId: null, parentBrandAssetId: null, supersededById: null } });
  await db.assetVersion.deleteMany({ where: { strategyId: brand } });
  await db.generativeTask.deleteMany({ where: { strategyId: brand } });
  await db.brandAsset.deleteMany({ where: { strategyId: brand } });
  await db.intentEmission.deleteMany({ where: { strategyId: brand } });
  await db.gloryOutput.deleteMany({ where: { strategyId: brand } });
  await db.pillar.deleteMany({ where: { strategyId: brand } });
  await db.socialConnection.deleteMany({ where: { strategyId: brand } });
  await db.strategy.deleteMany({ where: { id: brand } });
  await db.user.deleteMany({ where: { id: { in: [user, otherUser] } } });
  await db.operator.deleteMany({ where: { id: op } }); await db.$disconnect(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
async function select(index: number, image = imageIds[index]!) {
  const b = briefs[index]!;
  const intentId = randomUUID();
  await db.intentEmission.create({ data: { id: intentId, strategyId: brand, intentKind: "ANUBIS_PREPARE_SOCIAL_POST", status: "PENDING", payload: {} } });
  return preparePublicationPackage({ operation: "SELECT", strategyId: brand, briefId: b.assetId, briefVersion: b.version, assetVersionId: image }, user, intentId);
}
describe("Calendar → material choice → separate editorial review", () => {
  it("freezes exact copy and material, keeps generator distinct, and replays without creating an action", async () => {
    const first = await select(0); packetId = first.packageId;
    expect(await select(0)).toEqual(first);
    const p = await getPublicationPackage(brand, packetId, user);
    expect(p.content.caption).toBe(post.caption);
    expect(p.content.publicationText).toBe(post.caption + "\n\n#Sortie");
    expect(p.content.material.author.provider).toBe("Luna-fixture"); expect(p.selectedById).toBe(user); expect(p.review).toBeNull();
    expect(p.issue).toBeNull(); expect(await db.brandAction.count({ where: { strategyId: brand } })).toBe(1);
    expect(await db.brandAction.findUnique({ where: { id: first.actionId } })).toMatchObject({ status: "DRAFT", metadata: { publicationPackageId: packetId } });
  });
  it("a different task, inaccessible brand, provider-only URL and generic vault write are refused", async () => {
    await expect(select(0, imageIds[1])).rejects.toThrow(/ne provient pas/);
    await expect(getPublicationPackage(brand, packetId, otherUser)).rejects.toThrow(/refusé/);
    const material = await db.assetVersion.findUniqueOrThrow({ where: { id: imageIds[0] } });
    await db.assetVersion.update({ where: { id: material.id }, data: { url: "https://example.invalid/temporary-image.png" } });
    await expect(select(0)).rejects.toThrow(/pas encore été reçu/);
    await db.assetVersion.update({ where: { id: material.id }, data: { url: material.url } });
    expect(() => assertOrdinaryAsset(SOCIAL_PUBLICATION_PACKAGE)).toThrow(/figée/);
  });
  it("only an explicit review of the exact fingerprint approves the packet, never sends it", async () => {
    const p = await getPublicationPackage(brand, packetId, user);
    const fetch = vi.spyOn(globalThis, "fetch");
    const request = { operation: "REVIEW" as const, strategyId: brand, packageId: packetId, contentHash: p.contentHash, approved: true as const };
    await expect(preparePublicationPackage({ ...request, contentHash: "f".repeat(64) }, user, "local-review")).rejects.toThrow(/changé/);
    await preparePublicationPackage(request, user, "local-review");
    const reviewed = await getPublicationPackage(brand, packetId, user);
    expect(reviewed.review).toMatchObject({ userId: user }); expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
    expect(await db.brandAction.findUnique({ where: { id: reviewed.actionId } })).toMatchObject({ status: "ACCEPTED" });
  });
  it("changing the selected variant preserves the approved edition and resets review", async () => {
    const old = await db.brandAsset.findUniqueOrThrow({ where: { id: packetId } });
    const next = await select(1); otherPacketId = next.packageId;
    expect(next.version).toBe(2); expect(next.packageId).not.toBe(packetId);
    const current = await getPublicationPackage(brand, otherPacketId, user);
    expect(current.review).toBeNull(); expect(current.issue).toBeNull();
    expect(await db.brandAsset.findUnique({ where: { id: packetId } })).toMatchObject({ content: old.content, metadata: old.metadata, state: "SUPERSEDED", supersededById: next.packageId });
    expect((await getPublicationPackage(brand, packetId, user)).issue).toMatch(/autre version/);
    expect(await listPublicationPackages(brand, user)).toHaveLength(1);
    await expect(preparePublicationPackage({ operation: "REVIEW", strategyId: brand, packageId: packetId, contentHash: (await getPublicationPackage(brand, packetId, user)).contentHash, approved: true }, user, "old-review")).rejects.toThrow(/sélection a changé/);
  });
  it("refuses sending an unreviewed package and refuses a generic override", async () => {
    const p = await getPublicationPackage(brand, otherPacketId, user);
    await expect(publishSocialPost({ strategyId: brand, userId: user, targets: [], text: "",
      publicationPackageId: p.id, publicationPackageHash: p.contentHash,
      publicationTarget: { connectionId, accountId: "ig-local-receipt" } })).rejects.toThrow(/relue|relecture/);
    await expect(publishSocialPost({ strategyId: brand, userId: user, targets: ["INSTAGRAM"], text: "Override",
      imageUrl: "https://example.invalid/fake.jpg", brandActionId: p.actionId })).rejects.toThrow(/paquet relu/);
    expect(send).not.toHaveBeenCalled();
    await preparePublicationPackage({ operation: "REVIEW", strategyId: brand, packageId: p.id, contentHash: p.contentHash, approved: true }, user, "review-send");
  });
  it("serves only the exact reviewed JPEG privately, and rejects malformed/expired/cross-package grants", async () => {
    const p = await getPublicationPackage(brand, otherPacketId, user);
    vi.mocked(auth).mockResolvedValue({ user: { id: user } } as never);
    const image = await mediaRoute(new Request(`http://localhost${p.previewUrl}`), { params: Promise.resolve({ id: p.id }) });
    expect(image.status).toBe(200); expect(image.headers.get("Content-Type")).toBe("image/jpeg");
    expect(mediaHash(Buffer.from(await image.arrayBuffer()))).toBe(p.content.delivery.contentHash);
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await mediaRoute(new Request(`http://localhost${p.previewUrl}`), { params: Promise.resolve({ id: p.id }) })).status).toBe(401);
    const signed = new URL(publicationMediaUrl(p.id, p.contentHash));
    expect(verifyPublicationMediaGrant(p.id, signed.searchParams)).toBe(p.contentHash);
    expect(verifyPublicationMediaGrant(packetId, signed.searchParams)).toBeNull();
    expect(verifyPublicationMediaGrant(p.id, signed.searchParams, Date.now() + 601000)).toBeNull();
    signed.searchParams.set("hash", "f".repeat(64));
    expect(verifyPublicationMediaGrant(p.id, signed.searchParams)).toBeNull();
    expect((await mediaRoute(new Request(signed), { params: Promise.resolve({ id: p.id }) })).status).toBe(404);
  });
  it("schedules the frozen version without POST or public grant and preserves its account for the cron", async () => {
    const p = await getPublicationPackage(brand, otherPacketId, user);
    const input = { strategyId: brand, userId: user, targets: [], text: "", publicationPackageId: p.id,
      publicationPackageHash: p.contentHash, publicationTarget: { connectionId, accountId: "ig-local-receipt" } };
    await expect(publishSocialPost({ ...input, scheduleAt: new Date(Date.now() - 1000).toISOString() })).rejects.toThrow(/deux minutes/);
    const result = await publishSocialPost({ ...input, scheduleAt: new Date(Date.now() + 900000).toISOString() });
    expect(result.mode).toBe("SCHEDULED"); expect(send).not.toHaveBeenCalled();
    const stored = await db.brandAction.findUniqueOrThrow({ where: { id: p.actionId } });
    expect(JSON.stringify(stored.metadata)).not.toContain("signature");
    expect(stored.metadata).toMatchObject({ socialPublish: { publicationPackageHash: p.contentHash,
      publicationTarget: input.publicationTarget, text: p.content.publicationText, imageUrl: p.previewUrl } });
    const signed = publicationMediaUrl(p.id, p.contentHash);
    expect((await mediaRoute(new Request(signed), { params: Promise.resolve({ id: p.id }) })).status).toBe(404);
    await db.brandAction.update({ where: { id: p.actionId }, data: { timingStart: new Date(Date.now() - 1000) } });
    const due = (await listDueScheduledPublications()).find(j => j.brandActionId === p.actionId)!;
    expect(due.input).toMatchObject({ publicationPackageId: p.id, publicationPackageHash: p.contentHash, publicationTarget: input.publicationTarget });
    await expect(publishSocialPost({ ...due.input, userId: otherUser })).rejects.toThrow(/refusé/);
    await expect(publishSocialPost({ ...due.input, publicationTarget: { connectionId, accountId: "other-account" } })).rejects.toThrow(/destinataire a changé/);
  });
  it("the existing Anubis transport sends the frozen copy and exact JPEG, then replay sends nothing", async () => {
    const p = await getPublicationPackage(brand, otherPacketId, user);
    const due = (await listDueScheduledPublications()).find(j => j.brandActionId === p.actionId)!;
    send.mockImplementation(async (url, init) => {
      expect(init?.method).toBe("POST");
      const body = new URLSearchParams(init!.body as URLSearchParams);
      if (String(url) === "https://graph.instagram.com/ig-local-receipt/media") {
        expect(body.get("caption")).toBe(p.content.publicationText);
        const imageUrl = body.get("image_url")!;
        const response = await mediaRoute(new Request(imageUrl), { params: Promise.resolve({ id: p.id }) });
        expect(response.status).toBe(200);
        expect(mediaHash(Buffer.from(await response.arrayBuffer()))).toBe(p.content.delivery.contentHash);
        return Response.json({ id: "local-container" });
      }
      expect(String(url)).toBe("https://graph.instagram.com/ig-local-receipt/media_publish");
      expect(body.get("creation_id")).toBe("local-container");
      return Response.json({ id: "local-post-receipt" });
    });
    const result = await publishSocialPost(due.input);
    expect(result).toMatchObject({ mode: "PUBLISHED", results: [{ externalPostId: "local-post-receipt", connectionId }] });
    expect(send).toHaveBeenCalledTimes(2);
    const repeat = await publishSocialPost({ ...due.input, scheduledVersion: undefined });
    expect(repeat.mode).toBe("PUBLISHED"); expect(send).toHaveBeenCalledTimes(2);
    const stored = await db.brandAction.findUniqueOrThrow({ where: { id: p.actionId } });
    expect(stored.status).toBe("EXECUTED"); expect(JSON.stringify(stored.metadata)).not.toContain("signature=");
    expect((await getPublicationPackage(brand, p.id, user)).review?.userId).toBe(user);
  });
  it("publishes a story image using the story transport and never sends a discarded caption", async () => {
    const selected = await select(2);
    const p = await getPublicationPackage(brand, selected.packageId, user);
    expect(p.content.delivery.placement).toBe("STORIES");
    await preparePublicationPackage({ operation: "REVIEW", strategyId: brand, packageId: p.id, contentHash: p.contentHash, approved: true }, user, "review-story");
    send.mockReset().mockImplementation(async (url, init) => {
      const body = new URLSearchParams(init!.body as URLSearchParams);
      if (String(url).endsWith("/media")) {
        expect(body.get("media_type")).toBe("STORIES"); expect(body.has("caption")).toBe(false);
        const image = await mediaRoute(new Request(body.get("image_url")!), { params: Promise.resolve({ id: p.id }) });
        expect(image.status).toBe(200); expect(mediaHash(Buffer.from(await image.arrayBuffer()))).toBe(p.content.delivery.contentHash);
        return Response.json({ id: "story-container" });
      }
      expect(body.get("creation_id")).toBe("story-container");
      return Response.json({ id: "story-receipt" });
    });
    expect(await publishSocialPost({ strategyId: brand, userId: user, targets: [], text: "", publicationPackageId: p.id,
      publicationPackageHash: p.contentHash, publicationTarget: { connectionId, accountId: "ig-local-receipt" } })).toMatchObject({ mode: "PUBLISHED", results: [{ externalPostId: "story-receipt" }] });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("a changed calendar invalidates downstream review instead of silently updating frozen content", async () => {
    const p = await getPublicationPackage(brand, otherPacketId, user);
    await db.gloryOutput.update({ where: { id: source }, data: { output: { ...output, posts: [{ ...post, caption: "Nouvelle copy" }] } } });
    expect((await getPublicationPackage(brand, otherPacketId, user)).issue).toMatch(/calendrier a changé/);
    await expect(preparePublicationPackage({ operation: "REVIEW", strategyId: brand, packageId: otherPacketId, contentHash: p.contentHash, approved: true }, user, "stale-review")).rejects.toThrow(/calendrier a changé/);
  });
});
