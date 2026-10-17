/** Shared writers, real isolated PostgreSQL. No actual brand or provider. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
const draftProvider = vi.hoisted(() => ({
  callLLM: vi.fn(async () => ({ text: "{}" })),
  track: vi.fn(async () => ({ pillarKey: "t", content: {} as Record<string, unknown>, confidence: 0 })),
  innovation: vi.fn(async () => ({ catalogueParCanal: { DIGITAL: [{
    id: "22222222-2222-4222-8222-222222222222", action: "Budget réellement inconnu",
    format: "Text", objectif: "Objectif fictif", status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90",
  }] } })),
}));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: draftProvider.callLLM, extractJSON: JSON.parse }));
// This receipt exercises real persistence, not optional generation completion.
// That helper imports the lower-level router directly, outside the barrel mock.
vi.mock("@/server/services/pillar-maturity/auto-filler", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/pillar-maturity/auto-filler")>(),
  runChunkedFieldGeneration: vi.fn(async () => ({})),
}));
vi.mock("@/server/services/seshat/context-store", () => ({
  getOracleBrandContextByQuery: vi.fn(async () => null), findComparableBrands: vi.fn(async () => []),
}));
vi.mock("@/server/services/quick-intake/multi-agent-orchestrator", () => ({ generatePillarIMultiAgent: draftProvider.innovation }));
// These tests exercise the real S entry points and gateway, with upstream AI disabled.
vi.mock("@/server/services/rtis-protocols/risk", () => ({ executeProtocoleRisk: vi.fn(async () => ({ pillarKey: "r", content: {}, confidence: 0 })) }));
vi.mock("@/server/services/rtis-protocols/track", () => ({ executeProtocoleTrack: draftProvider.track }));
vi.mock("@/server/services/rtis-protocols/innovation", () => ({ executeProtocoleInnovation: vi.fn(async () => ({ pillarKey: "i", content: {}, confidence: 0 })) }));
import { db } from "@/lib/db";
import { writePillar, type PillarWriteRequest } from "@/server/services/pillar-gateway";
import { transitionPillarStatus } from "@/server/services/pillar-gateway/validation-status";
import { pillarRouter } from "@/server/trpc/routers/pillar";
import { resolveBrandSource } from "@/server/services/ingestion-pipeline/source-usage";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import { composedSynthesis } from "../fixtures/synthesis";
import { generateAndPersistRtisDraft } from "@/server/services/quick-intake/rtis-draft";
import { executeNextStep, type OrchestrationPlan } from "@/server/services/mestor/hyperviseur";
import { executeRTISCascade } from "@/server/services/rtis-protocols";
import { actualizePillar } from "@/server/services/mestor/rtis-cascade";

const brands: string[] = [];
let owner: string, operatorId: string;
beforeAll(async () => {
  const connection = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(connection.hostname);
  expect(connection.pathname).toBe("/shinkiro_verify");
  operatorId = (await db.operator.create({ data: { name: "S writer fixture", slug: "s-writer-" + randomUUID(),
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } })).id;
  owner = (await db.user.create({ data: { email: "s-writer-" + randomUUID() + "@example.invalid", operatorId } })).id;
});
beforeEach(() => {
  draftProvider.track.mockReset().mockResolvedValue({ pillarKey: "t", content: {}, confidence: 0 });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"));
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.scoreSnapshot.deleteMany({ where });
  await db.process.deleteMany({ where }); await db.signal.deleteMany({ where });
  await db.variableStoreConfig.deleteMany({ where });
  await db.brandAction.deleteMany({ where });
  await db.pillar.deleteMany({ where }); await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.delete({ where: { id: owner } }); await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
});
async function fixture(args: { confidence?: number | null; status?: "AI_PROPOSED" | "VALIDATED" | "LOCKED"; content?: object } = {}) {
  const strategy = await db.strategy.create({ data: { name: "S writer synthetic", userId: owner, operatorId,
    status: args.status === "VALIDATED" || args.status === "LOCKED" ? "VALIDATED" : "ACTIVE" } });
  brands.push(strategy.id);
  const s = await db.pillar.create({ data: { strategyId: strategy.id, key: "s", content: {
    ...composedSynthesis(), _fieldProvenance: {}, ...args.content,
  } as Prisma.InputJsonValue, currentVersion: 1, confidence: args.confidence === undefined ? 0.92 : args.confidence,
    validationStatus: args.status ?? "AI_PROPOSED" } });
  const i = await db.pillar.create({ data: { strategyId: strategy.id, key: "i", content: {
    catalogueParCanal: { DIGITAL: [{ action: "Prior synthetic", format: "Text", objectif: "Synthetic objective" }] },
  }, currentVersion: 1, confidence: null } });
  return { strategy, s, i };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const request = (f: Fixture, patch: object, extra: Partial<PillarWriteRequest> = {}): PillarWriteRequest => ({
  strategyId: f.strategy.id, pillarKey: "s", operation: { type: "MERGE_DEEP", patch: patch as Record<string, unknown> },
  author: { system: "PROTOCOLE_S", reason: "Synthetic projection refresh" },
  options: { targetStatus: "AI_PROPOSED", expectedVersion: 1 }, ...extra,
});
const read = async (f: Fixture) => ({
  strategy: await db.strategy.findUniqueOrThrow({ where: { id: f.strategy.id } }),
  s: await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } }),
});
const context = () => ({ db, headers: undefined, session: {
  user: { id: owner, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
} });

describe("derived RTIS snapshots replace obsolete work through both existing entry points", () => {
  const refreshedTrack = () => ({
    triangulation: {},
    hypothesisValidation: Array.from({ length: 5 }, (_, n) => ({ id: randomUUID(),
      hypothesis: `Current synthetic hypothesis ${n}`, validationMethod: "Synthetic observation", status: "HYPOTHESIS" })),
    tamSamSom: Object.fromEntries(["tam", "sam", "som"].map(k => [k, { value: 1, description: "Synthetic fixture" }])),
  });
  it.each(["single-pillar", "cascade"])("%s replaces old hypotheses, preserves untouched content and archives the former list", async entry => {
    const f = await fixture();
    const previous = { hypothesisValidation: [{ hypothesis: "Old paid access policy", status: "HYPOTHESIS" }],
      retainedSource: "Independent source not returned by this refresh", _fieldProvenance: {} };
    const t = await db.pillar.create({ data: { strategyId: f.strategy.id, key: "t", content: previous, currentVersion: 1 } });
    const current = refreshedTrack();
    draftProvider.track.mockResolvedValue({ pillarKey: "t", content: current, confidence: 0 });
    for (let attempt = 0; attempt < 2; attempt++) {
      if (entry === "single-pillar") expect(await actualizePillar(f.strategy.id, "T")).toMatchObject({ updated: true });
      else await executeRTISCascade(f.strategy.id);
      const saved = await db.pillar.findUniqueOrThrow({ where: { id: t.id } });
      expect(saved.currentVersion).toBe(attempt + 2);
      expect((saved.content as Record<string, unknown>).hypothesisValidation).toEqual(current.hypothesisValidation);
      expect((saved.content as Record<string, unknown>).retainedSource).toBe(previous.retainedSource);
    }
    const archived = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: t.id, version: 1 } });
    expect(archived.content).toEqual(previous);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("the shared writer still protects a human hypothesis list from a generated replacement", async () => {
    const f = await fixture();
    const previous = { ...refreshedTrack(), _fieldProvenance: { hypothesisValidation: "HUMAN" } };
    const t = await db.pillar.create({ data: { strategyId: f.strategy.id, key: "t", content: previous as Prisma.InputJsonValue } });
    draftProvider.track.mockResolvedValue({ pillarKey: "t", content: refreshedTrack(), confidence: 0 });
    await actualizePillar(f.strategy.id, "T");
    const saved = await db.pillar.findUniqueOrThrow({ where: { id: t.id } });
    expect((saved.content as Record<string, unknown>).hypothesisValidation).toEqual(previous.hypothesisValidation);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
describe("the shared S writer conserves snapshots and human review", () => {
  it("intake replaces the old plan, keeps unknown money absent, and grants no confidence for a pure calculation", async () => {
    const f = await fixture({ content: { globalBudget: 9000, computed: { totalBudget: 9000, selectedRouteKey: "AMBITIOUS" } } });
    const before = (await read(f)).s;
    const result = await generateAndPersistRtisDraft({ strategyId: f.strategy.id, companyName: "Isolated fixture", sector: null, market: null });
    const current = (await read(f)).s;
    expect(result.s).toEqual(current.content);
    expect(current.confidence).toBe(before.confidence);
    expect(current.content).toMatchObject({ computed: { selectedRouteKey: "AMBITIOUS", budgetSummary: { unknownCount: 1 } },
      _sourcePillarVersions: { a: null, d: null, v: null, e: null, r: 2, t: 2, i: 2, s: 1 } });
    expect(current.content).not.toHaveProperty("globalBudget");
    expect(current.content).not.toHaveProperty("computed.totalBudget");
    expect(current).toMatchObject({ currentVersion: 2, validationStatus: "AI_PROPOSED", staleAt: null });
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("intake propagates a human plan refusal without a new S version, retaining already saved source drafts", async () => {
    const f = await fixture({ content: { syntheseExecutive: "Choix humain fictif", _fieldProvenance: { syntheseExecutive: "HUMAN" } } });
    await expect(generateAndPersistRtisDraft({ strategyId: f.strategy.id, companyName: "Isolated fixture", sector: null, market: null })).rejects.toThrow("FIELD_PROVENANCE_REFUSED");
    const current = await read(f);
    expect(current.s.content).toEqual(f.s.content);
    expect(current.s).toMatchObject({ currentVersion: 1, confidence: f.s.confidence });
    expect(current.s.staleAt).toBeInstanceOf(Date);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.i.id } })).currentVersion).toBe(2);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("a locked intake source stops downstream writes and cannot yield a persisted success result", async () => {
    const f = await fixture();
    const r = await db.pillar.create({ data: { strategyId: f.strategy.id, key: "r", content: { narrative: "Conservé" }, validationStatus: "LOCKED" } });
    await expect(generateAndPersistRtisDraft({ strategyId: f.strategy.id, companyName: "Isolated fixture", sector: null, market: null })).rejects.toThrow(/LOCKED/i);
    expect(await db.pillar.findUniqueOrThrow({ where: { id: r.id } })).toEqual(r);
    expect(await db.pillar.findUnique({ where: { strategyId_key: { strategyId: f.strategy.id, key: "t" } } })).toBeNull();
    expect((await read(f)).s).toEqual(f.s);
    expect(await db.pillar.findUniqueOrThrow({ where: { id: f.i.id } })).toEqual(f.i);
  });
  it.each(["hyperviseur", "cascade"])("%s keeps its existing strict schema refusal and the old plan intact", async entry => {
    const f = await fixture({ content: { globalBudget: 9000 } });
    if (entry === "hyperviseur") {
      const plan: OrchestrationPlan = { strategyId: f.strategy.id, phase: "BOOT", pillarHealth: [], estimatedAiCalls: 0,
        createdAt: new Date().toISOString(), steps: [{ id: "s", agent: "PROTOCOLE_S", target: "s", description: "Plan fictif",
          priority: 1, dependsOn: [], status: "PENDING", retryCount: 0, maxRetries: 0 }] };
      expect(await executeNextStep(plan)).toMatchObject({ status: "FAILED", error: expect.stringContaining("Strict schema validation failed") });
    } else {
      const result = await executeRTISCascade(f.strategy.id);
      expect(result.errors).toEqual([expect.stringContaining("Strict schema validation failed")]);
    }
    expect((await read(f)).s).toEqual(f.s);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("replaces generated collections at every depth, preserving untouched fields and previous archives", async () => {
    const f = await fixture({ content: { computed: { selectedRouteKey: "AMBITIOUS", roadmapRoutes: [{ key: "old" }] } } });
    const routes = ["CONSERVATIVE", "TARGET", "AMBITIOUS"].map(key => ({ key, label: key, recommended: key === "TARGET",
      projectedGrowthPct: 0, targetCultIndex: 0, description: "Synthetic projection", budgetByPhase: {
        SPRINT_90: 0, PHASE_1: 0, PHASE_2: 0, LONG_TERM: 0,
      } }));
    const patch = { computed: { roadmapRoutes: routes }, sprint90Days: composedSynthesis().sprint90Days };
    for (let version = 1; version <= 2; version++) {
      const r = await writePillar(request(f, patch, { options: { expectedVersion: version, strictSchemaValidation: true } }));
      expect(r.success, r.error).toBe(true);
    }
    expect((await read(f)).s.content).toMatchObject({ computed: { selectedRouteKey: "AMBITIOUS", roadmapRoutes: routes },
      sprint90Days: composedSynthesis().sprint90Days, axesStrategiques: composedSynthesis().axesStrategiques });
    expect(((await read(f)).s.content as { sprint90Days: unknown[] }).sprint90Days).toHaveLength(5);
    const versions = await db.pillarVersion.findMany({ where: { pillarId: f.s.id }, orderBy: { version: "asc" } });
    expect(versions).toHaveLength(2); expect(versions[0]!.content).toEqual(f.s.content);
  });
  it("keeps additive source collections for I", async () => {
    const f = await fixture();
    const r = await writePillar({ ...request(f, {}), pillarKey: "i", author: { system: "PROTOCOLE_I", reason: "Synthetic enrichment" },
      operation: { type: "MERGE_DEEP", patch: { catalogueParCanal: { DIGITAL: [{ action: "New synthetic", format: "Text", objectif: "Other objective" }] } } } });
    expect(r.success, r.error).toBe(true); expect((r.newContent.catalogueParCanal as { DIGITAL: unknown[] }).DIGITAL).toHaveLength(2);
  });
  it("cannot auto-approve S because confidence is high", async () => {
    const f = await fixture({ confidence: 0.94 });
    const r = await writePillar(request(f, { visionStrategique: "A synthetic vision solely for this isolated fixture." }));
    expect(r.success, r.error).toBe(true); expect((await read(f)).s.validationStatus).toBe("AI_PROPOSED");
    expect(r.warnings.some(w => w.includes("Auto-approved"))).toBe(false); expect((await read(f)).strategy.status).toBe("ACTIVE");
  });
  it.each(["VALIDATED", "LOCKED"] as const)("refuses a content writer requesting approval %s", async targetStatus => {
    const f = await fixture();
    const r = await writePillar(request(f, { visionStrategique: "Synthetic update." }, { options: { targetStatus } }));
    expect(r.success).toBe(false); expect(r.error).toContain("SYNTHESIS_REVIEW_REQUIRED");
    expect((await read(f)).s).toMatchObject({ content: f.s.content, currentVersion: 1, validationStatus: "AI_PROPOSED" });
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it("withdraws the approval of the old S atomically, preserving actual confidence", async () => {
    const f = await fixture({ confidence: 0.22, status: "VALIDATED" });
    const r = await writePillar(request(f, { visionStrategique: "A changed synthetic vision." }, { author: {
      system: "OPERATOR", userId: owner, reason: "Synthetic human source refresh",
    }, options: { expectedVersion: 1 } }));
    expect(r.success, r.error).toBe(true);
    expect(await read(f)).toMatchObject({ strategy: { status: "DRAFT" }, s: { validationStatus: "AI_PROPOSED", confidence: 0.22, currentVersion: 2 } });
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(1);
  });
  it.each(["VALIDATED", "LOCKED"] as const)("invalidates an approved dependency without unlocking S %s", async status => {
    const f = await fixture({ status });
    const r = await writePillar({ ...request(f, {}), pillarKey: "i", author: { system: "PROTOCOLE_I", reason: "Synthetic dependency refresh" },
      operation: { type: "SET_FIELDS", fields: [{ path: "catalogueParCanal.DIGITAL[0].objectif", value: "Changed synthetic objective" }] } });
    expect(r.success, r.error).toBe(true);
    expect(await read(f)).toMatchObject({ strategy: { status: "DRAFT" }, s: {
      content: f.s.content, confidence: f.s.confidence, currentVersion: 1, validationStatus: status === "LOCKED" ? "LOCKED" : "AI_PROPOSED",
    } });
    expect((await read(f)).s.staleAt).toBeInstanceOf(Date);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it.each([0, 0.05])("preserves unknown confidence instead of measuring it through delta %s", async confidenceDelta => {
    const f = await fixture({ confidence: null });
    const r = await writePillar(request(f, { visionStrategique: "Synthetic vision with unknown confidence." }, { options: { confidenceDelta, expectedVersion: 1 } }));
    expect(r.success, r.error).toBe(true); expect((await read(f)).s.confidence).toBeNull();
  });
  it("does not create an absent S for a refused approval shortcut", async () => {
    const f = await fixture(); await db.pillar.delete({ where: { id: f.s.id } });
    const r = await writePillar(request(f, { visionStrategique: "Synthetic import." }, { options: { targetStatus: "VALIDATED" } }));
    expect(r).toMatchObject({ success: false, version: 0 });
    expect((await db.pillar.findUnique({ where: { strategyId_key: { strategyId: f.strategy.id, key: "s" } } }))).toBeNull();
  });
  it("does not withdraw approval when the proposed write is rejected", async () => {
    const f = await fixture({ status: "VALIDATED" });
    const r = await writePillar(request(f, { sprint90Days: "invalid container" }, { options: { strictSchemaValidation: true } }));
    expect(r.success).toBe(false);
    expect(await read(f)).toMatchObject({ strategy: { status: "VALIDATED" }, s: { currentVersion: 1, validationStatus: "VALIDATED" } });
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it("rolls back content and archive if withdrawing the strategy approval fails", async () => {
    const f = await fixture({ status: "VALIDATED" });
    const constraint = "s_writer_" + randomUUID().replaceAll("-", "");
    await db.$executeRawUnsafe(`ALTER TABLE "Strategy" ADD CONSTRAINT ${constraint} CHECK (id <> '${f.strategy.id}' OR status <> 'DRAFT') NOT VALID`);
    try {
      const r = await writePillar(request(f, { visionStrategique: "A changed synthetic vision." })); expect(r.success).toBe(false);
      expect(await read(f)).toMatchObject({ strategy: { status: "VALIDATED" }, s: { content: f.s.content, currentVersion: 1, validationStatus: "VALIDATED" } });
      expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "Strategy" DROP CONSTRAINT ${constraint}`); }
  });
  it("serializes a source edit and approval without retaining approval of an earlier version", async () => {
    const f = await fixture({ confidence: 0.81 });
    const [write, decision] = await Promise.allSettled([
      writePillar(request(f, { visionStrategique: "A concurrent synthetic vision." })),
      transitionPillarStatus({ strategyId: f.strategy.id, key: "s", userId: owner, expectedVersion: 1, targetStatus: "VALIDATED" }),
    ]);
    expect(write.status).toBe("fulfilled");
    if (write.status === "fulfilled") expect(write.value.success, write.value.error).toBe(true);
    if (decision.status === "rejected") expect(decision.reason).toMatchObject({ code: "CONFLICT" });
    const current = await read(f);
    expect(current.s).toMatchObject({ validationStatus: "AI_PROPOSED", currentVersion: 2, confidence: 0.81 });
    expect(current.strategy.status).not.toBe("VALIDATED"); expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("restores the former plan through the actual authorized router without transporting its old approval", async () => {
    const f = await fixture({ status: "VALIDATED", confidence: null });
    expect((await writePillar(request(f, { visionStrategique: "A synthetic changed plan." }))).success).toBe(true);
    const archive = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.s.id } });
    const caller = pillarRouter.createCaller({ db, headers: undefined, session: {
      user: { id: owner, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
    } });
    expect(await caller.rollbackVersion({ strategyId: f.strategy.id, key: "S", versionId: archive.id })).toMatchObject({ success: true });
    const current = await read(f);
    expect(current.s).toMatchObject({ content: f.s.content, confidence: null, validationStatus: "AI_PROPOSED", currentVersion: 3 });
    expect(current.strategy.status).toBe("DRAFT");
    expect(await caller.rollbackVersion({ strategyId: f.strategy.id, key: "S", versionId: archive.id })).toMatchObject({ alreadyRecorded: true });
    expect((await read(f)).s.currentVersion).toBe(3);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("serializes different documentary sources on one strategy without a shared-lock upgrade deadlock", async () => {
    const f = await fixture({ status: "VALIDATED" });
    const sources = await Promise.all(["one", "two"].map(name => db.brandDataSource.create({ data: {
      strategyId: f.strategy.id, sourceType: "MANUAL_INPUT", rawContent: "Synthetic source " + name,
      fileName: "Isolated source " + name, processingStatus: "EXTRACTED", certainty: "DECLARED",
    } })));
    const receipts = await Promise.all(sources.map(async source => ({ sourceId: source.id,
      contentHash: (await resolveBrandSource(source.id, f.strategy.id)).contentHash })));
    try {
      const results = await Promise.all(["i", "v"].map((key, index) => writePillar({
        ...request(f, {}), pillarKey: key as "i" | "v", author: { system: "INGESTION", reason: "Synthetic source receipt" },
        operation: { type: "SET_FIELDS", fields: [{ path: "documentaryNote", value: "Synthetic receipt " + index }] },
        options: { sourceReceipts: [receipts[index]!] },
      })));
      for (const result of results) expect(result.success, result.error).toBe(true);
      expect((await read(f)).strategy.status).toBe("DRAFT");
      expect((await read(f)).s.staleAt).toBeInstanceOf(Date);
    } finally { await db.brandDataSource.deleteMany({ where: { id: { in: sources.map(source => source.id) } } }); }
  });
  it.each(["VALIDATED", "LOCKED"] as const)("withdraws review after a real documentary correction, preserving S %s content and lock", async status => {
    const f = await fixture({ status });
    const source = await db.brandDataSource.create({ data: { strategyId: f.strategy.id, sourceType: "MANUAL_INPUT",
      rawContent: "Synthetic brief before correction", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
    const receipt = { sourceId: source.id, contentHash: (await resolveBrandSource(source.id, f.strategy.id)).contentHash };
    await db.pillar.update({ where: { id: f.i.id }, data: { sources: [receipt] } });
    try {
      await ingestionRouter.createCaller(context()).updateSource({ id: source.id, content: "Synthetic corrected brief" });
      const current = await read(f);
      expect(current.strategy.status).toBe("DRAFT"); expect(current.s.staleAt).toBeInstanceOf(Date);
      expect(current.s).toMatchObject({ content: f.s.content, confidence: f.s.confidence, currentVersion: 1,
        validationStatus: status === "LOCKED" ? "LOCKED" : "AI_PROPOSED" });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    } finally { await db.brandDataSource.delete({ where: { id: source.id } }); }
  });
  it("withdraws review of a shared document's affected use only, through the actual revoke route", async () => {
    const f = await fixture({ status: "VALIDATED" });
    const other = await fixture({ status: "VALIDATED" });
    const source = await db.brandDataSource.create({ data: { strategyId: other.strategy.id, sourceType: "MANUAL_INPUT",
      rawContent: "Synthetic shared document", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
    const caller = ingestionRouter.createCaller(context());
    try {
      await caller.updateSource({ id: source.id, use: { strategyId: f.strategy.id, revoke: false } });
      const receipt = { sourceId: source.id, contentHash: (await resolveBrandSource(source.id, f.strategy.id)).contentHash };
      await db.pillar.update({ where: { id: f.i.id }, data: { sources: [receipt] } });
      await caller.updateSource({ id: source.id, use: { strategyId: f.strategy.id, revoke: true } });
      expect(await read(f)).toMatchObject({ strategy: { status: "DRAFT" }, s: { validationStatus: "AI_PROPOSED", content: f.s.content } });
      expect((await read(f)).s.staleAt).toBeInstanceOf(Date);
      expect(await read(other)).toMatchObject({ strategy: { status: "VALIDATED" }, s: { validationStatus: "VALIDATED", staleAt: null } });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    } finally { await db.brandDataSource.delete({ where: { id: source.id } }); }
  });
  it.each([true, false])("runs the actual age propagation with autoRecalculate=%s and respects manual mode", async autoRecalculate => {
    const f = await fixture({ status: "VALIDATED" });
    await db.variableStoreConfig.create({ data: { strategyId: f.strategy.id, autoRecalculate, stalenessThresholdDays: 30 } });
    await db.pillar.update({ where: { id: f.s.id }, data: { updatedAt: new Date(Date.now() - 31 * 86400000) } });
    const result = await propagateFromPillar(f.strategy.id, "I");
    const current = await read(f);
    expect(result).toMatchObject({ signalsCreated: autoRecalculate ? 1 : 0, refreshProcessesCreated: autoRecalculate ? 1 : 0 });
    expect(current.strategy.status).toBe(autoRecalculate ? "DRAFT" : "VALIDATED");
    expect(current.s.validationStatus).toBe(autoRecalculate ? "AI_PROPOSED" : "VALIDATED");
    expect(Boolean(current.s.staleAt)).toBe(autoRecalculate);
    expect(await db.process.count({ where: { strategyId: f.strategy.id } })).toBe(autoRecalculate ? 1 : 0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
