import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/anubis/notifications", () => ({ pushNotification: vi.fn(async () => undefined) }));

import { db } from "@/lib/db";
import { GET as cron } from "@/app/api/cron/social-sync/route";
import { encryptTokenPayload } from "@/server/services/oauth-integrations";
import { listScheduledPublications, publishSocialPost } from "@/server/services/anubis/social-publish";

const send = vi.fn<typeof fetch>();
let strategyId: string, userId: string, ig: string, fb: string;
const input = (targets = ["INSTAGRAM"]) => ({
  strategyId, userId, targets, text: "Post de recette", imageUrl: "https://example.invalid/synthetic.jpg",
});
const cronRequest = () => cron(new Request("http://localhost/api/cron/social-sync?mode=publish", {
  headers: { authorization: "Bearer isolated-receipt" },
}));

beforeAll(async () => {
  // Ce cron lit TOUTES les échéances : seulement une base locale dédiée, vide.
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.port).toBe("55439");
  expect(url.pathname).toMatch(/^\/shinkiro_social_receipt_[a-z0-9]+$/);
  expect(await db.strategy.count()).toBe(0);
  vi.stubEnv("CRON_SECRET", "isolated-receipt");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "synthetic-only-encryption-key-for-social-run");
  vi.stubGlobal("fetch", send);
  const op = await db.operator.create({ data: { name: "Recette", slug: "social-receipt", status: "ACTIVE",
    licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
  userId = (await db.user.create({ data: { email: "simulation@example.invalid", operatorId: op.id } })).id;
  strategyId = (await db.strategy.create({ data: { name: "Marque synthétique", userId, operatorId: op.id } })).id;
  const base = { userId, strategyId, accountName: "Compte de test", accessToken: encryptTokenPayload({ access_token: "test-only" }) };
  ig = (await db.socialConnection.create({ data: { ...base, platform: "INSTAGRAM", accountId: "ig-test",
    metadata: { provider: "instagram", scopes: ["instagram_business_content_publish"] } } })).id;
  fb = (await db.socialConnection.create({ data: { ...base, platform: "FACEBOOK", accountId: "fb-test",
    metadata: { scopes: [] } } })).id;
});
afterAll(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await db.$disconnect(); });
beforeEach(() => {
  send.mockReset().mockImplementation(async () => { throw new Error("Unexpected network call in offline test"); });
});

describe("reçus ANUBIS et cockpit de publication", () => {
  it("refuse la publication sans scope et relit les anciens EXECUTED par leurs reçus", async () => {
    const post = await publishSocialPost(input(["FACEBOOK"]));
    expect(post).toMatchObject({ mode: "FAILED", results: [{ state: "SCOPE_MISSING" }] });
    const action = await db.brandAction.findUniqueOrThrow({ where: { id: post.brandActionId } });
    expect(action.status).toBe("ACCEPTED");
    await db.brandAction.update({ where: { id: action.id }, data: { status: "EXECUTED" } });
    expect((await listScheduledPublications(strategyId)).find((p) => p.brandActionId === action.id)?.status).toBe("FAILED");
    expect(send).not.toHaveBeenCalled();
  });

  it("bloque une nouvelle tentative après un HTTP 2xx sans ID publié", async () => {
    send.mockResolvedValueOnce(Response.json({ id: "container" })).mockResolvedValueOnce(Response.json({}));
    const post = await publishSocialPost(input());
    expect(post).toMatchObject({ mode: "UNCONFIRMED", results: [{ state: "UNCONFIRMED", externalPostId: null }] });
    const retry = await publishSocialPost({ ...input(), brandActionId: post.brandActionId });
    expect(retry.mode).toBe("UNCONFIRMED");
    expect(send).toHaveBeenCalledTimes(2);
    expect((await db.brandAction.findUniqueOrThrow({ where: { id: post.brandActionId } })).status).toBe("ACCEPTED");
  });

  it("reprend uniquement le réseau refusé et rapproche l'ID émis avec le bon compte", async () => {
    const targets = ["INSTAGRAM", "FACEBOOK"];
    send.mockResolvedValueOnce(Response.json({ id: "container" })).mockResolvedValueOnce(Response.json({ id: "ig-received" }));
    const first = await publishSocialPost(input(targets));
    expect(first.mode).toBe("PARTIAL");
    expect((await db.brandAction.findUniqueOrThrow({ where: { id: first.brandActionId } })).status).toBe("ACCEPTED");
    expect([...new URLSearchParams(send.mock.calls[1]![1]!.body as URLSearchParams)]).toContainEqual(["creation_id", "container"]);
    expect(send.mock.calls.map(([url]) => String(url))).toEqual([
      "https://graph.instagram.com/ig-test/media", "https://graph.instagram.com/ig-test/media_publish",
    ]);
    await db.socialConnection.update({ where: { id: fb }, data: { metadata: { scopes: ["pages_manage_posts"] } } });
    send.mockResolvedValueOnce(Response.json({ post_id: "fb-received" }));
    const final = await publishSocialPost({ ...input(targets), brandActionId: first.brandActionId });
    expect(final).toMatchObject({ mode: "PUBLISHED", results: [{ externalPostId: "ig-received" }, { externalPostId: "fb-received" }] });
    await publishSocialPost({ ...input(targets), brandActionId: first.brandActionId });
    expect(send).toHaveBeenCalledTimes(3);
    const wrong = "https://example.invalid/wrong-account";
    await db.socialPost.create({ data: { connectionId: fb, strategyId, externalPostId: "ig-received", permalinkUrl: wrong } });
    const view = async () => (await listScheduledPublications(strategyId)).find((p) => p.brandActionId === first.brandActionId)!;
    expect((await view()).results[0]?.permalinkUrl).toBeUndefined();
    const link = "https://example.invalid/synthetic-permalink";
    await db.socialPost.create({ data: { connectionId: ig, strategyId, externalPostId: "ig-received", permalinkUrl: link } });
    expect((await view()).results[0]?.permalinkUrl).toBe(link);
  });

  it("un refus dans le vrai cron ne devient ni exécuté ni repris au tick suivant", async () => {
    await db.socialConnection.update({ where: { id: fb }, data: { metadata: { scopes: [] } } });
    const scheduled = await publishSocialPost({ ...input(["FACEBOOK"]), scheduleAt: new Date(Date.now() + 900_000).toISOString() });
    await db.brandAction.update({ where: { id: scheduled.brandActionId }, data: { timingStart: new Date(Date.now() - 10_000) } });
    const run = await (await cronRequest()).json();
    expect(run.published[0].status).toMatch(/^FAILED/);
    expect((await db.brandAction.findUniqueOrThrow({ where: { id: scheduled.brandActionId } })).status).toBe("ACCEPTED");
    expect((await (await cronRequest()).json()).due).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("deux ticks du vrai cron ne publient qu'une fois via Mestor et Artémis", async () => {
    const scheduled = await publishSocialPost({ ...input(), scheduleAt: new Date(Date.now() + 900_000).toISOString() });
    expect(scheduled.mode).toBe("SCHEDULED");
    expect(send).not.toHaveBeenCalled();
    await db.brandAction.update({ where: { id: scheduled.brandActionId }, data: { timingStart: new Date(Date.now() - 10_000) } });
    send.mockResolvedValueOnce(Response.json({ id: "cron-container" })).mockResolvedValueOnce(Response.json({ id: "cron-media" }));
    const ticks = await Promise.all([cronRequest(), cronRequest()]);
    const logs = await Promise.all(ticks.map((r) => r.json()));
    const entries = logs.flatMap((r) => r.published ?? []);
    expect(entries, JSON.stringify(logs)).toContainEqual({ brandActionId: scheduled.brandActionId, status: "PUBLISHED" });
    expect(entries.every((r: { status: string }) => ["PUBLISHED", "SKIPPED"].includes(r.status))).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await db.brandAction.findUniqueOrThrow({ where: { id: scheduled.brandActionId } })).status).toBe("EXECUTED");
    expect(await db.intentEmission.count({ where: { strategyId, intentKind: "ANUBIS_PUBLISH_SOCIAL_POST" } })).toBeGreaterThan(0);
    await cronRequest();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
