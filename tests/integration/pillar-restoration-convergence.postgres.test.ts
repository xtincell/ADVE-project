/** The history action and the Notoria withdrawal restore through the ADR-0207
 * compensation engine: same version check, refusals, metadata and history.
 * Real tRPC procedures, real gateway/spine, isolated PostgreSQL only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
const provider = vi.hoisted(() => ({ callLLM: vi.fn(async () => { throw new Error("PROVIDER_FORBIDDEN_IN_FIXTURE"); }) }));
vi.mock("@/server/services/llm-gateway", async original => ({ ...await original<typeof import("@/server/services/llm-gateway")>(), ...provider }));
import { db } from "@/lib/db";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { governanceRouter } from "@/server/trpc/routers/governance";
import { pillarRouter } from "@/server/trpc/routers/pillar";
import { notoriaRouter } from "@/server/trpc/routers/notoria";

const brands: string[] = [], users: string[] = [], operators: string[] = [];
let owner: string, stranger: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  vi.stubGlobal("fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"); });
  for (const name of ["local", "foreign"]) {
    const op = await db.operator.create({ data: { name: "Restore " + name, slug: "restore-" + randomUUID(), status: "ACTIVE",
      licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
    operators.push(op.id);
    users.push((await db.user.create({ data: { email: "restore-" + randomUUID() + "@example.invalid", operatorId: op.id } })).id);
  }
  [owner, stranger] = users as [string, string];
});
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.recommendation.deleteMany({ where }); await db.recommendationBatch.deleteMany({ where });
  await db.scoreSnapshot.deleteMany({ where }); await db.intentEmission.deleteMany({ where });
  await db.costDecision.deleteMany({ where }); await db.signal.deleteMany({ where }); await db.process.deleteMany({ where });
  await db.pillar.deleteMany({ where }); await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: operators } } });
  vi.unstubAllGlobals(); await db.$disconnect();
});

async function fixture(content: Record<string, unknown> = { promesseDeValeur: "Avant", salesChannel: "DIRECT",
  _fieldProvenance: { promesseDeValeur: "INFERRED", salesChannel: "HUMAN" } }) {
  const s = await db.strategy.create({ data: { name: "Restore synthetic", userId: owner, operatorId: operators[0]! } });
  brands.push(s.id);
  const p = await db.pillar.create({ data: { strategyId: s.id, key: "v", content: content as object,
    fieldCertainty: { promesseDeValeur: "INFERRED" }, confidence: 0.4, validationStatus: "AI_PROPOSED" } });
  return { s, p };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const session = (userId: string) => ({ db, headers: undefined,
  session: { user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60000).toISOString() } }) as never;
const history = (userId = owner) => pillarRouter.createCaller(session(userId));
const journal = (userId = owner) => governanceRouter.createCaller(session(userId));
const notoria = (userId = owner) => notoriaRouter.createCaller(session(userId));
const readV = (f: Fixture) => db.pillar.findUniqueOrThrow({ where: { id: f.p.id } });
const archives = (f: Fixture) => db.pillarVersion.count({ where: { pillarId: f.p.id } });

async function change(f: Fixture, path: string, value: unknown) {
  const current = await readV(f);
  const id = await openEmission({ kind: "WRITE_PILLAR", strategyId: f.s.id, caller: "fixture:restore", payload: { strategyId: f.s.id, key: "v" } });
  const r = await writePillarAndScore({ strategyId: f.s.id, pillarKey: "v", operation: { type: "SET_FIELDS", fields: [{ path, value }] },
    author: { system: path === "salesChannel" ? "OPERATOR" : "MESTOR", userId: owner, intentId: id, reason: "Synthetic decision" },
    options: { expectedVersion: current.currentVersion, skipValidation: true } });
  expect(r.success, r.error).toBe(true);
  await closeEmission({ intentId: id, status: "OK", result: r });
  return id;
}
const archiveOf = (f: Fixture, intentId: string) => db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.p.id, intentId } });
const lastEmission = (strategyId: string, intentKind: string) =>
  db.intentEmission.findFirstOrThrow({ where: { strategyId, intentKind }, orderBy: { emittedAt: "desc" } });
const state = (p: Awaited<ReturnType<typeof readV>>) => ({ content: p.content, fieldCertainty: p.fieldCertainty, confidence: p.confidence,
  validationStatus: p.validationStatus, staleAt: p.staleAt, sources: p.sources, currentVersion: p.currentVersion });

describe("history action — same engine and same refusals as the journal compensation", () => {
  it("restores exactly what the journal compensation restores, and links the same effect", async () => {
    const viaHistory = await fixture(), viaJournal = await fixture();
    const a = await change(viaHistory, "promesseDeValeur", "Proposition"); await change(viaHistory, "salesChannel", "HYBRID");
    const b = await change(viaJournal, "promesseDeValeur", "Proposition"); await change(viaJournal, "salesChannel", "HYBRID");
    const restored = await history().rollbackVersion({ strategyId: viaHistory.s.id, key: "V", versionId: (await archiveOf(viaHistory, a)).id });
    expect(restored).toMatchObject({ success: true, alreadyRecorded: false });
    expect(await journal().compensate({ originalIntentId: b, reason: "Synthetic journal undo" })).toMatchObject({ executed: true });
    const [h, j] = [await readV(viaHistory), await readV(viaJournal)];
    expect(state(h)).toEqual(state(j));
    expect(h.content).toMatchObject({ promesseDeValeur: "Avant", salesChannel: "HYBRID", _fieldProvenance: { promesseDeValeur: "INFERRED", salesChannel: "HUMAN" } });
    expect((await db.pillarVersion.findUniqueOrThrow({ where: { pillarId_compensatedFrom: { pillarId: viaHistory.p.id, compensatedFrom: a } } })).intentId)
      .toBe((await lastEmission(viaHistory.s.id, "LEGACY_PILLAR_ROLLBACK_VERSION")).id);
    expect(await db.pillarVersion.findUnique({ where: { pillarId_compensatedFrom: { pillarId: viaJournal.p.id, compensatedFrom: b } } })).not.toBeNull();
  });

  it("retries once without a second version, score or effect", async () => {
    const f = await fixture(), a = await change(f, "promesseDeValeur", "Proposition"), versionId = (await archiveOf(f, a)).id;
    await history().rollbackVersion({ strategyId: f.s.id, key: "V", versionId });
    const after = state(await readV(f)), count = await archives(f);
    expect(await history().rollbackVersion({ strategyId: f.s.id, key: "V", versionId })).toMatchObject({ success: true, alreadyRecorded: true });
    expect(state(await readV(f))).toEqual(after); expect(await archives(f)).toBe(count);
  });

  it("refuses a later conflicting value with a typed 412, not a 500, and leaves the pillar untouched", async () => {
    const f = await fixture(), a = await change(f, "promesseDeValeur", "Proposition"); await change(f, "promesseDeValeur", "Décision ultérieure");
    const before = state(await readV(f));
    await expect(history().rollbackVersion({ strategyId: f.s.id, key: "V", versionId: (await archiveOf(f, a)).id }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_CONFLICT") });
    expect(state(await readV(f))).toEqual(before); expect(await archives(f)).toBe(2);
    expect((await lastEmission(f.s.id, "LEGACY_PILLAR_ROLLBACK_VERSION")).status).toBe("FAILED");
  });

  it("refuses an archive without an applied checkpoint with a typed 412 and invents nothing", async () => {
    const f = await fixture();
    const legacy = await db.pillarVersion.create({ data: { pillarId: f.p.id, version: 0, content: { promesseDeValeur: "Legacy" } } });
    await expect(history().rollbackVersion({ strategyId: f.s.id, key: "V", versionId: legacy.id }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_CHECKPOINT_UNAVAILABLE") });
    expect((await readV(f)).currentVersion).toBe(1); expect(await archives(f)).toBe(1);
  });

  it("refuses a foreign operator with 403 before any emission or effect", async () => {
    const f = await fixture(), a = await change(f, "promesseDeValeur", "Proposition"), before = state(await readV(f));
    const emissions = await db.intentEmission.count({ where: { strategyId: f.s.id } });
    await expect(history(stranger).rollbackVersion({ strategyId: f.s.id, key: "V", versionId: (await archiveOf(f, a)).id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state(await readV(f))).toEqual(before);
    expect(await db.intentEmission.count({ where: { strategyId: f.s.id } })).toBe(emissions);
  });

  it("answers 404 for an archive of another brand and for an absent pillar", async () => {
    const mine = await fixture(), other = await fixture(), a = await change(other, "promesseDeValeur", "Proposition");
    const before = state(await readV(mine));
    await expect(history().rollbackVersion({ strategyId: mine.s.id, key: "V", versionId: (await archiveOf(other, a)).id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(history().rollbackVersion({ strategyId: mine.s.id, key: "A", versionId: (await archiveOf(other, a)).id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state(await readV(mine))).toEqual(before);
  });
});

async function appliedReco(f: Fixture, field: string, value: string) {
  const reco = await db.recommendation.create({ data: { strategyId: f.s.id, targetPillarKey: "v", targetField: field, operation: "SET",
    agent: "MESTOR", source: "R+T", impact: "MEDIUM", confidence: 0.9, explain: "Synthetic proposal", status: "ACCEPTED",
    missionType: "ADVE_UPDATE", proposedValue: value } });
  const result = await notoria().applyRecos({ strategyId: f.s.id, recoIds: [reco.id] });
  expect(result.applied, result.warnings.join(" | ")).toBe(1);
  return reco;
}
const recoStatus = async (id: string) => (await db.recommendation.findUniqueOrThrow({ where: { id } })).status;
const PROPOSAL = "Une proposition de valeur claire : des repas maison livrés chaque soir aux familles pressées du quartier.";

describe("Notoria withdrawal — compensates the application write through the same engine", () => {
  it("withdraws one applied proposal and keeps an independent later decision", async () => {
    const f = await fixture({ salesChannel: "DIRECT", _fieldProvenance: { salesChannel: "HUMAN" } });
    const reco = await appliedReco(f, "promesseDeValeur", PROPOSAL);
    expect((await readV(f)).content).toMatchObject({ promesseDeValeur: PROPOSAL });
    await change(f, "salesChannel", "HYBRID");
    expect(await notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic withdrawal" })).toMatchObject({ reverted: true });
    const v = await readV(f);
    expect(v.content).toMatchObject({ salesChannel: "HYBRID", _fieldProvenance: { salesChannel: "HUMAN" } });
    expect((v.content as Record<string, unknown>).promesseDeValeur).toBeUndefined();
    expect(await recoStatus(reco.id)).toBe("REVERTED");
    const undo = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.p.id, compensatedFrom: { not: null } } });
    const withdrawal = await lastEmission(f.s.id, "LEGACY_NOTORIA_REVERT_RECO");
    expect(undo).toMatchObject({ intentId: withdrawal.id, compensatedFrom: (await db.recommendation.findUniqueOrThrow({ where: { id: reco.id } })).appliedIntentId });
    expect(withdrawal.status).toBe("OK");
  });

  it("retries the withdrawal without a second effect", async () => {
    const f = await fixture({ salesChannel: "DIRECT" }), reco = await appliedReco(f, "promesseDeValeur", PROPOSAL);
    await notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic withdrawal" });
    const after = state(await readV(f)), count = await archives(f);
    expect(await notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic retry" }))
      .toMatchObject({ reverted: true, alreadyRecorded: true });
    expect(state(await readV(f))).toEqual(after); expect(await archives(f)).toBe(count);
  });

  it("refuses when the same value changed after the application and keeps the proposal applied", async () => {
    const f = await fixture({ salesChannel: "DIRECT" }), reco = await appliedReco(f, "promesseDeValeur", PROPOSAL);
    await change(f, "promesseDeValeur", "Décision ultérieure");
    const before = state(await readV(f));
    await expect(notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic withdrawal" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_CONFLICT") });
    expect(state(await readV(f))).toEqual(before); expect(await recoStatus(reco.id)).toBe("APPLIED");
    expect((await lastEmission(f.s.id, "LEGACY_NOTORIA_REVERT_RECO")).status).toBe("FAILED");
  });

  it("refuses an application without recorded filiation instead of guessing the archive by date", async () => {
    const f = await fixture();
    await db.pillarVersion.create({ data: { pillarId: f.p.id, version: 0, content: { promesseDeValeur: "Ancienne" } } });
    const reco = await db.recommendation.create({ data: { strategyId: f.s.id, targetPillarKey: "v", targetField: "promesseDeValeur",
      operation: "SET", agent: "MESTOR", source: "R+T", impact: "MEDIUM", confidence: 0.9, explain: "Historical application",
      status: "APPLIED", appliedAt: new Date(), missionType: "ADVE_UPDATE", proposedValue: "Avant" } });
    const before = state(await readV(f));
    await expect(notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic withdrawal" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_ARCHIVE_UNLINKED") });
    expect(state(await readV(f))).toEqual(before); expect(await archives(f)).toBe(1); expect(await recoStatus(reco.id)).toBe("APPLIED");
  });

  it("refuses a foreign operator with 403 and leaves the proposal applied", async () => {
    const f = await fixture({ salesChannel: "DIRECT" }), reco = await appliedReco(f, "promesseDeValeur", PROPOSAL), before = state(await readV(f));
    await expect(notoria(stranger).revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Foreign withdrawal" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state(await readV(f))).toEqual(before); expect(await recoStatus(reco.id)).toBe("APPLIED");
  });

  it("refuses to withdraw one of several proposals applied by the same write and changes nothing", async () => {
    const f = await fixture({ salesChannel: "DIRECT" });
    const proposal = (targetField: string, proposedValue: string) => db.recommendation.create({ data: { strategyId: f.s.id,
      targetPillarKey: "v", targetField, operation: "SET", agent: "MESTOR", source: "R+T", impact: "MEDIUM", confidence: 0.9,
      explain: "Synthetic proposal", status: "ACCEPTED", missionType: "ADVE_UPDATE", proposedValue } });
    const a = await proposal("promesseDeValeur", PROPOSAL);
    const b = await proposal("pricingJustification", "Un prix accessible justifié par des portions familiales et une livraison groupée chaque soir.");
    const applied = await notoria().applyRecos({ strategyId: f.s.id, recoIds: [a.id, b.id] });
    expect(applied.applied, applied.warnings.join(" | ")).toBe(2);
    const before = state(await readV(f));
    await expect(notoria().revertReco({ strategyId: f.s.id, recoId: a.id, reason: "Synthetic withdrawal" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_SHARED_WRITE") });
    expect(state(await readV(f))).toEqual(before);
    expect([await recoStatus(a.id), await recoStatus(b.id)]).toEqual(["APPLIED", "APPLIED"]);
  });

  it("refuses a typed multi-pillar proposal instead of compensating one pillar of its write", async () => {
    const f = await fixture(), before = state(await readV(f));
    const reco = await db.recommendation.create({ data: { strategyId: f.s.id, targetPillarKey: "i", targetField: "catalogueParCanal",
      operation: "ADD", agent: "MESTOR", source: "R+T", impact: "MEDIUM", confidence: 0.8, explain: "Typed choice", status: "APPLIED",
      appliedAt: new Date(), appliedIntentId: "synthetic-application", missionType: "I_GENERATION",
      proposedValue: { kind: "SELECT_INITIATIVE", initiativeId: randomUUID(), timeframe: "SPRINT_90" } } });
    await expect(notoria().revertReco({ strategyId: f.s.id, recoId: reco.id, reason: "Synthetic withdrawal" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("RESTORE_MULTI_PILLAR") });
    expect(state(await readV(f))).toEqual(before); expect(await recoStatus(reco.id)).toBe("APPLIED");
  });

  it("answers 404 for a proposal of another brand", async () => {
    const mine = await fixture({ salesChannel: "DIRECT" }), other = await fixture({ salesChannel: "DIRECT" });
    const reco = await appliedReco(other, "promesseDeValeur", PROPOSAL), before = state(await readV(other));
    await expect(notoria().revertReco({ strategyId: mine.s.id, recoId: reco.id, reason: "Cross-brand withdrawal" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state(await readV(other))).toEqual(before); expect(await recoStatus(reco.id)).toBe("APPLIED");
  });
});
