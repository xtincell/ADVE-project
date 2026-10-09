/** Real local PostgreSQL, actual routers. No provider or real brand is touched. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { pillarRouter } from "@/server/trpc/routers/pillar";
import { composedSynthesis } from "../fixtures/synthesis";

const brands: string[] = [], users: string[] = [], operators: string[] = [];
let owner: string, operatorId: string, outsider: string, founder: string;
beforeAll(async () => {
  const connection = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(connection.hostname);
  expect(connection.pathname).toBe("/shinkiro_verify");
  for (let i = 0; i < 2; i++) {
    const op = await db.operator.create({ data: { name: "Synthesis fixture", slug: "synth-" + randomUUID(),
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
    operators.push(op.id);
    const user = await db.user.create({ data: { email: "synth-" + randomUUID() + "@example.invalid", operatorId: op.id } });
    users.push(user.id);
  }
  owner = users[0]!; outsider = users[1]!; operatorId = operators[0]!;
  const user = await db.user.create({ data: { email: "synth-founder-" + randomUUID() + "@example.invalid" } });
  users.push(user.id); founder = user.id;
});
beforeEach(() => { vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE")); });
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.pillar.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } }); await db.$disconnect();
});
const context = (userId = owner, role = "USER") => ({ db, headers: undefined, session: {
  user: { id: userId, role }, expires: new Date(Date.now() + 60_000).toISOString(),
} });
const caller = (userId = owner, role = "USER") => strategyRouter.createCaller(context(userId, role));
async function fixture(confidence: number | null = 0.22, content: object | null = composedSynthesis()) {
  const strategy = await db.strategy.create({ data: { name: "Synthesis synthetic", userId: owner, operatorId } });
  brands.push(strategy.id);
  const pillar = content === null ? null : await db.pillar.create({ data: {
    strategyId: strategy.id, key: "s", content: content as Prisma.InputJsonValue,
    currentVersion: 1, confidence, validationStatus: "AI_PROPOSED",
  } });
  return { strategy, pillar, input: { strategyId: strategy.id, expectedVersion: 1 } };
}
async function read(f: Awaited<ReturnType<typeof fixture>>) {
  return { strategy: await db.strategy.findUniqueOrThrow({ where: { id: f.strategy.id } }),
    pillar: await db.pillar.findUnique({ where: { strategyId_key: { strategyId: f.strategy.id, key: "s" } } }) };
}

describe("synthesis approval is a decision, never a confidence measurement", () => {
  it("refuses the forced shortcut when S does not exist", async () => {
    const f = await fixture(null, null);
    await expect(caller().validateSynthesis({ ...f.input, forceConfidence: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await read(f)).strategy.status).toBe("ACTIVE");
    expect((await read(f)).pillar).toBeNull();
  });
  it("refuses an incomplete synthesis through both existing entry points", async () => {
    const f = await fixture(0.9, { axesStrategiques: [] });
    await expect(caller().validateSynthesis({ ...f.input, forceConfidence: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(pillarRouter.createCaller(context()).transitionStatus({ ...f.input, key: "S", targetStatus: "VALIDATED" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await read(f)).pillar?.validationStatus).toBe("AI_PROPOSED");
    expect((await read(f)).strategy.status).toBe("ACTIVE");
  });
  it.each([0.22, 0, null])("retains measured confidence %s across warning, approval and retry", async confidence => {
    const f = await fixture(confidence);
    expect(await caller().validateSynthesis(f.input)).toMatchObject({ warning: true, confidence, updated: null });
    expect((await read(f)).strategy.status).toBe("ACTIVE");
    const result = await caller().validateSynthesis({ ...f.input, forceConfidence: true });
    expect(result).toMatchObject({ warning: false, confidence });
    const first = await read(f);
    expect(first.pillar).toMatchObject({ confidence, validationStatus: "VALIDATED", content: f.pillar!.content, currentVersion: 1 });
    expect(first.strategy.status).toBe("VALIDATED");
    expect(await caller().validateSynthesis({ ...f.input, forceConfidence: true })).toMatchObject({ confidence, alreadyApplied: true });
    expect((await read(f)).pillar?.updatedAt).toEqual(first.pillar!.updatedAt);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    const emissions = await db.intentEmission.findMany({ where: { strategyId: f.strategy.id } });
    expect(emissions).toHaveLength(3);
    expect(emissions.every(e => e.intentKind === "LEGACY_PILLAR_TRANSITION_STATUS" && e.status === "OK")).toBe(true);
  });
  it("keeps the generic transition synchronized without an automatic provider", async () => {
    const f = await fixture(0.81);
    expect(await pillarRouter.createCaller(context()).transitionStatus({ ...f.input, key: "S", targetStatus: "VALIDATED" }))
      .toMatchObject({ success: true, newStatus: "VALIDATED", confidence: 0.81 });
    expect((await read(f)).strategy.status).toBe("VALIDATED");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await pillarRouter.createCaller(context()).transitionStatus({ ...f.input, key: "S", targetStatus: "DRAFT" });
    expect((await read(f)).strategy.status).toBe("DRAFT");
    expect((await read(f)).pillar?.confidence).toBe(0.81);
  });
  it("refuses stale, changed-version and dangling-reference syntheses even with confirmation", async () => {
    const f = await fixture();
    await db.pillar.update({ where: { id: f.pillar!.id }, data: { staleAt: new Date() } });
    await expect(caller().validateSynthesis({ ...f.input, forceConfidence: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await db.pillar.update({ where: { id: f.pillar!.id }, data: { staleAt: null, currentVersion: 2 } });
    await expect(caller().validateSynthesis({ ...f.input, forceConfidence: true })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.pillar.update({ where: { id: f.pillar!.id }, data: { content: {
      ...composedSynthesis(), sprint90Days: composedSynthesis().sprint90Days.map(row => ({ ...row, sourceInitiativeId: randomUUID() })),
    } } });
    await expect(caller().validateSynthesis({ ...f.input, expectedVersion: 2, forceConfidence: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await read(f)).strategy.status).toBe("ACTIVE");
  });
  it("refuses a founder, a foreign operator, and an ADMIN claim revoked in the database", async () => {
    const f = await fixture();
    await db.strategy.update({ where: { id: f.strategy.id }, data: { userId: founder } });
    for (const [userId, role] of [[founder, "USER"], [outsider, "USER"], [founder, "ADMIN"]]) {
      await expect(caller(userId, role).validateSynthesis({ ...f.input, forceConfidence: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect((await read(f)).strategy.status).toBe("ACTIVE");
  });
  it("does not interpret an absent confidence as zero", async () => {
    const f = await fixture(null, null);
    expect(await caller().getSynthesisConfidence({ strategyId: f.strategy.id })).toMatchObject({
      confidence: null, hasLowConfidence: false, exists: false, canValidate: false, currentVersion: null,
    });
  });
  it("rolls back the pillar approval if the strategy write fails", async () => {
    const f = await fixture(0.81);
    const constraint = "fixture_synth_" + randomUUID().replaceAll("-", "");
    await db.$executeRawUnsafe(`ALTER TABLE "Strategy" ADD CONSTRAINT ${constraint} CHECK (id <> '${f.strategy.id}' OR status <> 'VALIDATED') NOT VALID`);
    try {
      await expect(caller().validateSynthesis(f.input)).rejects.toThrow();
      const rows = await read(f);
      expect(rows.pillar?.validationStatus).toBe("AI_PROPOSED"); expect(rows.pillar?.confidence).toBe(0.81);
      expect(rows.strategy.status).toBe("ACTIVE");
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "Strategy" DROP CONSTRAINT ${constraint}`); }
  });
  it("applies concurrent approvals of the same reviewed version only once", async () => {
    const f = await fixture(0.81);
    const results = await Promise.all(Array.from({ length: 3 }, () => caller().validateSynthesis(f.input)));
    expect(results.filter(r => r.success && !r.alreadyApplied)).toHaveLength(1);
    expect(results.filter(r => r.success && r.alreadyApplied)).toHaveLength(2);
    expect((await read(f)).pillar?.confidence).toBe(0.81);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("detects an older synthesis whose dependencies changed without a stale marker", async () => {
    const f = await fixture(0.81);
    await db.pillar.update({ where: { id: f.pillar!.id }, data: { updatedAt: new Date(Date.now() - 600_000) } });
    await db.pillar.create({ data: { strategyId: f.strategy.id, key: "a", content: {}, updatedAt: new Date(Date.now() - 500_000) } });
    await expect(caller().validateSynthesis(f.input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await read(f)).strategy.status).toBe("ACTIVE");
  });
  it("refuses approval after the dossier is archived", async () => {
    const f = await fixture(0.81);
    await db.strategy.update({ where: { id: f.strategy.id }, data: { archivedAt: new Date() } });
    await expect(caller().validateSynthesis(f.input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await read(f)).pillar?.validationStatus).toBe("AI_PROPOSED");
  });
  it("refuses a direct project request without the reviewed synthesis, before effects", async () => {
    const f = await fixture(0.81);
    await expect(caller().generateProjectsFromActions({ strategyId: f.strategy.id, actionIds: [] }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await db.campaign.count({ where: { strategyId: f.strategy.id } })).toBe(0);
    expect(await db.campaignBrief.count({ where: { campaign: { strategyId: f.strategy.id } } })).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
