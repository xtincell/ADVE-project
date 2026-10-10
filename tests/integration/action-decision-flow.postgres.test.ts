/** Operator decision → versioned I → projection → deterministic S, real local DB. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
const provider = vi.hoisted(() => ({ callLLM: vi.fn(async () => { throw new Error("PROVIDER_FORBIDDEN_IN_FIXTURE"); }) }));
vi.mock("@/server/services/llm-gateway", () => provider);
import { db } from "@/lib/db";
import { syncBrandActionsFromBlob } from "@/server/services/artemis/action-db/materializer";
import { setBrandActionStatus } from "@/server/services/artemis/action-db/set-status";
import { executeProtocoleStrategy } from "@/server/services/rtis-protocols/strategy";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { composedSynthesis } from "../fixtures/synthesis";
import { actualizePillar } from "@/server/services/mestor/rtis-cascade";
import { execute } from "@/server/services/artemis/commandant";
import { generateTypedRecommendations } from "@/server/services/notoria/generate-typed-recos";
import { dispatchTypedRecos } from "@/server/services/notoria/apply-payload";
import { collectInitiatives } from "@/lib/types/pillar-schemas";
import { acceptRecos, applyRecos } from "@/server/services/notoria/lifecycle";

const brands: string[] = [];
let owner: string, operatorId: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  vi.stubGlobal("fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"); });
  operatorId = (await db.operator.create({ data: { name: "Decision flow", slug: `decision-flow-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } })).id;
  owner = (await db.user.create({ data: { email: `decision-flow-${randomUUID()}@example.invalid`, operatorId } })).id;
});
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.recommendation.deleteMany({ where }); await db.recommendationBatch.deleteMany({ where });
  await db.brandAction.deleteMany({ where }); await db.intentEmission.deleteMany({ where });
  await db.costDecision.deleteMany({ where }); await db.scoreSnapshot.deleteMany({ where });
  await db.process.deleteMany({ where }); await db.signal.deleteMany({ where });
  await db.variableStoreConfig.deleteMany({ where });
  await db.pillar.deleteMany({ where }); await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.delete({ where: { id: owner } }); await db.operator.delete({ where: { id: operatorId } });
  vi.unstubAllGlobals(); await db.$disconnect();
});
async function fixture() {
  const strategy = await db.strategy.create({ data: { name: "Decision flow synthetic", userId: owner, operatorId, status: "VALIDATED" } });
  brands.push(strategy.id);
  const initiativeId = randomUUID();
  const initiative = { id: initiativeId, action: "One actual synthetic initiative", format: "Text", objectif: "Fixture objective",
    budget: 1000, status: "RECOMMENDED", timeframe: "SPRINT_90", mitigatesRiskIds: [], targetsPersonaIds: [] };
  const i = await db.pillar.create({ data: { strategyId: strategy.id, key: "i", content: { catalogueParCanal: { DIGITAL: [initiative] } },
    currentVersion: 1, confidence: null, validationStatus: "AI_PROPOSED" } });
  const s = await db.pillar.create({ data: { strategyId: strategy.id, key: "s", content: composedSynthesis(),
    currentVersion: 1, confidence: null, validationStatus: "VALIDATED" } });
  await syncBrandActionsFromBlob(strategy.id);
  const action = await db.brandAction.findUniqueOrThrow({ where: { strategyId_sourceInitiativeId: {
    strategyId: strategy.id, sourceInitiativeId: initiativeId,
  } } });
  return { strategy, i, s, action, initiative };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const choose = (f: Fixture, selected: boolean) => setBrandActionStatus({ strategyId: f.strategy.id,
  op: { type: "SELECT", actionId: f.action.id, selected } });
const readI = (f: Fixture) => db.pillar.findUniqueOrThrow({ where: { id: f.i.id } });

describe("one operator choice survives the whole existing action path", () => {
  it("one typed recommendation reconciles all source copies, the operational row and the full saved plan", async () => {
    const f = await fixture();
    await db.pillar.update({ where: { id: f.i.id }, data: { content: {
      catalogueParCanal: { DIGITAL: [f.initiative] }, actionsByDevotionLevel: { ENGAGE: [{ ...f.initiative }] },
      actionsByOvertonPhase: [{ phase: "POPULAR", actions: [{ ...f.initiative }] }],
    } } });
    const generated = await generateTypedRecommendations(f.strategy.id);
    expect(generated.count).toBe(1);
    const rows = await db.recommendation.findMany({ where: { strategyId: f.strategy.id } });
    const result = await dispatchTypedRecos(f.strategy.id, rows.map(r => ({ id: r.id, proposedValue: r.proposedValue })));
    expect(result.appliedRecoIds).toEqual(rows.map(r => r.id));
    const i = await readI(f);
    for (const raw of collectInitiatives(i.content) as Array<Record<string, unknown>>) expect(raw.status).toBe("SELECTED_FOR_ROADMAP");
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ selected: true, status: "ACCEPTED" });
    const s = await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } });
    expect(s.content).toMatchObject({ selectedFromI: [{ sourceInitiativeId: f.initiative.id }],
      computed: { selectedInitiativeCount: 1, totalBudget: 1000 }, _sourcePillarVersions: { i: 2, s: 1 } });
    expect((s.content as any).selectedFromI).toHaveLength(1);
    expect((s.content as any).roadmap.flatMap((row: any) => row.actions)).toEqual([f.initiative.action]);
    expect(provider.callLLM).not.toHaveBeenCalled();
  });

  it("never reports a typed decision as applied after a human source decision is refused", async () => {
    const f = await fixture(); await choose(f, true);
    const before = await readI(f);
    const result = await dispatchTypedRecos(f.strategy.id, [{ id: "synthetic-reject", proposedValue: {
      kind: "REJECT_INITIATIVE", initiativeId: f.initiative.id, reason: "Synthetic stale recommendation",
    } }]);
    expect(result.appliedRecoIds).toEqual([]);
    expect(result.warnings.join(" ")).toContain("FIELD_PROVENANCE_REFUSED");
    expect(await readI(f)).toEqual(before);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });

  it("keeps the persisted recommendation pending application when a later human choice contradicts it", async () => {
    const f = await fixture();
    await generateTypedRecommendations(f.strategy.id);
    const reco = await db.recommendation.findFirstOrThrow({ where: { strategyId: f.strategy.id } });
    await acceptRecos(f.strategy.id, [reco.id], owner);
    await choose(f, false);
    const before = await readI(f);
    const result = await applyRecos(f.strategy.id, [reco.id]);
    expect(result.applied).toBe(0);
    expect(result.warnings.join(" ")).toContain("FIELD_PROVENANCE_REFUSED");
    expect(await db.recommendation.findUniqueOrThrow({ where: { id: reco.id } })).toMatchObject({ status: "ACCEPTED", appliedAt: null });
    expect(await readI(f)).toEqual(before);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });

  it.each(["i", "a"] as const)("refuses the old complete read snapshot when source %s changes before the typed transaction", async key => {
    const f = await fixture();
    const added = { ...f.initiative, id: randomUUID(), action: "Concurrent retained source" };
    const originalFind = db.pillar.findMany.bind(db.pillar);
    // The awaited test interception is not used as a Prisma batch transaction.
    const interceptedRead = (async (args: Parameters<typeof originalFind>[0]) => {
      const rows = await originalFind(args);
      const write = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: key,
        operation: { type: "SET_FIELDS", fields: key === "i"
          ? [{ path: "catalogueParCanal", value: { DIGITAL: [f.initiative, added] } }]
          : [{ path: "nomMarque", value: "New source after read" }] },
        author: { system: "MESTOR", reason: "Synthetic concurrent source change" }, options: { expectedVersion: 1 } });
      expect(write.success, write.error).toBe(true);
      return rows;
    }) as unknown as typeof originalFind;
    const spy = vi.spyOn(db.pillar, "findMany").mockImplementationOnce(interceptedRead);
    let result;
    try { result = await dispatchTypedRecos(f.strategy.id, [{ id: "synthetic-old-snapshot", proposedValue: {
      kind: "SELECT_INITIATIVE", initiativeId: f.initiative.id, timeframe: "SPRINT_90",
    } }]); } finally { spy.mockRestore(); }
    expect(result.appliedRecoIds).toEqual([]);
    expect(result.warnings.join(" ")).toContain("PILLAR_SOURCE_VERSION_CONFLICT");
    const i = await readI(f);
    expect(i.currentVersion).toBe(key === "i" ? 2 : 1);
    if (key === "i") expect((i.content as any).catalogueParCanal.DIGITAL[1].id).toBe(added.id);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });

  it("keeps a declared zero operational override when the source amount becomes unknown", async () => {
    const f = await fixture();
    await db.brandAction.update({ where: { id: f.action.id }, data: { budgetMin: 0, budgetMax: 0 } });
    const { budget: _budget, ...unknown } = f.initiative;
    await db.pillar.update({ where: { id: f.i.id }, data: { content: { catalogueParCanal: { DIGITAL: [unknown] } } } });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ budgetMin: 0, budgetMax: 0,
      metadata: { projectedBudget: null, budgetBasis: "UNKNOWN" } });
  });
  it("preserves unknown budgets and horizons through projection and the saved S draft", async () => {
    const f = await fixture();
    const { budget: _budget, timeframe: _timeframe, ...unknown } = f.initiative;
    const zero = { ...unknown, id: randomUUID(), action: "Declared zero", budget: 0 };
    const estimate = { ...unknown, id: randomUUID(), action: "Qualitative estimate", budgetEstime: "LOW" };
    await db.pillar.update({ where: { id: f.i.id }, data: { content: { catalogueParCanal: { DIGITAL: [unknown, zero, estimate] } } } });
    await syncBrandActionsFromBlob(f.strategy.id);
    const actions = await db.brandAction.findMany({ where: { strategyId: f.strategy.id } });
    expect(actions.find(a => a.sourceInitiativeId === unknown.id)).toMatchObject({ budgetMin: null, budgetMax: null,
      metadata: { budgetBasis: "UNKNOWN", timeframe: null, projectedBudget: null } });
    expect(actions.find(a => a.sourceInitiativeId === zero.id)).toMatchObject({ budgetMin: 0, budgetMax: 0,
      priority: null, metadata: { budgetBasis: "DECLARED", timeframe: null, projectedBudget: 0 } });
    expect(actions.find(a => a.sourceInitiativeId === estimate.id)).toMatchObject({ budgetMin: 500_000, budgetMax: 500_000,
      priority: null, metadata: { budgetBasis: "QUALITATIVE_ESTIMATE", projectedBudget: 500_000 } });
    for (const a of actions) await setBrandActionStatus({ strategyId: f.strategy.id, op: { type: "SELECT", actionId: a.id, selected: true } });
    const result = await actualizePillar(f.strategy.id, "S");
    expect(result.updated, result.error).toBe(true);
    const s = (await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).content as any;
    expect(s.globalBudget).toBeUndefined(); expect(s.computed.totalBudget).toBeUndefined();
    expect(s.computed.budgetSummary).toMatchObject({ unknownCount: 1, declaredCount: 1, estimatedCount: 1, knownSubtotal: 500_000 });
    expect(s.roadmap).toHaveLength(1); expect(s.roadmap[0].phase).toBe("Échéance à préciser");
    expect(s.roadmap[0].budget).toBeUndefined();
    expect(s.selectedFromI.every((a: any) => a.phase === undefined)).toBe(true);
    expect(s.fenetreOverton.strategieDeplacement.every((a: any) => a.horizon === undefined)).toBe(true);
    expect(provider.callLLM).not.toHaveBeenCalled();
  });
  it("the manual S command saves the same source choices without an implicit provider", async () => {
    const f = await fixture(); await choose(f, true);
    provider.callLLM.mockClear();
    const beforeI = await readI(f);
    const result = await execute({ kind: "SYNTHESIZE_S", strategyId: f.strategy.id });
    expect(result.status, result.summary).toBe("OK");
    const s = await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } });
    expect(s).toMatchObject({ currentVersion: 2, validationStatus: "AI_PROPOSED", confidence: null,
      content: { computed: { selectedInitiativeCount: 1, totalBudget: 1000 },
        selectedFromI: [{ sourceInitiativeId: f.initiative.id }], _sourcePillarVersions: { i: 2, s: 1 } } });
    expect(await readI(f)).toEqual(beforeI);
    expect(provider.callLLM).not.toHaveBeenCalled();
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(1);
  });
  it("the individual S refresh also persists without post-completion AI", async () => {
    const f = await fixture(); await choose(f, true); provider.callLLM.mockClear();
    const result = await actualizePillar(f.strategy.id, "S");
    expect(result.updated, result.error).toBe(true);
    expect(provider.callLLM).not.toHaveBeenCalled();
    expect(await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).toMatchObject({ currentVersion: 2,
      content: { computed: { selectedInitiativeCount: 1 }, _sourcePillarVersions: { i: 2, s: 1 } } });
  });
  it("never treats command IDs as an unrecorded choice", async () => {
    const f = await fixture();
    const result = await execute({ kind: "SYNTHESIZE_S", strategyId: f.strategy.id, selectedActionIds: [f.action.id] });
    expect(result.status).toBe("FAILED"); expect(result.summary).toContain("SYNTHESIS_CHOICE_REQUIRED");
    expect(await readI(f)).toEqual(f.i);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it("refuses stale source versions before saving or archiving a computed plan", async () => {
    const f = await fixture(); const source = await executeProtocoleStrategy(f.strategy.id);
    await choose(f, true);
    const before = await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } });
    const result = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: "s",
      operation: { type: "REPLACE_FULL", content: source.content }, author: { system: "PROTOCOLE_S", reason: "Synthetic old snapshot" },
      options: { expectedVersion: 1, ...{ expectedPillarVersions: source.content._sourcePillarVersions as Record<string, number | null> } } });
    expect(result.success).toBe(false); expect(result.error).toContain("PILLAR_SOURCE_VERSION_CONFLICT");
    expect(await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).toEqual(before);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it("records missing sources and refuses a source appearing after the snapshot", async () => {
    const f = await fixture(); const source = await executeProtocoleStrategy(f.strategy.id);
    expect(source.content._sourcePillarVersions).toMatchObject({ a: null, d: null, v: null, e: null, r: null, t: null });
    await db.pillar.create({ data: { strategyId: f.strategy.id, key: "a", content: { nomMarque: "Synthetic" } } });
    const result = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: "s",
      operation: { type: "REPLACE_FULL", content: source.content }, author: { system: "PROTOCOLE_S", reason: "Synthetic missing source" },
      options: { ...{ expectedPillarVersions: source.content._sourcePillarVersions as Record<string, number | null> } } });
    expect(result.success).toBe(false); expect(result.error).toContain("PILLAR_SOURCE_VERSION_CONFLICT");
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
  });
  it("does not pad sparse choices with invented strategic objectives", async () => {
    const f = await fixture(); await choose(f, true);
    const result = await executeProtocoleStrategy(f.strategy.id);
    expect(result.content).toMatchObject({ axesStrategiques: [], facteursClesSucces: [], kpiDashboard: [], devotionFunnel: [], budgetByDevotion: {} });
    expect(result.content.northStarKPI).toBeUndefined();
    expect(result.content.computed).not.toHaveProperty("coherenceScore");
    expect(result.content.roadmap).toHaveLength(1);
    expect(result.content.sprint90Days).toMatchObject([{ sourceInitiativeId: f.initiative.id }]);
    expect((result.content.sprint90Days as object[])[0]).not.toHaveProperty("devotionImpact");
  });
  it("archives the previous S and withdraws its review without changing measured confidence", async () => {
    const f = await fixture();
    const result = await execute({ kind: "SYNTHESIZE_S", strategyId: f.strategy.id });
    expect(result.status, result.summary).toBe("OK");
    expect(await db.strategy.findUniqueOrThrow({ where: { id: f.strategy.id } })).toMatchObject({ status: "DRAFT" });
    expect(await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).toMatchObject({ confidence: null, validationStatus: "AI_PROPOSED", currentVersion: 2 });
    const version = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.s.id } });
    expect(version.content).toEqual(f.s.content);
  });
  it("refuses locked or human-protected S without a partial archive or review change", async () => {
    for (const mode of ["locked", "human"] as const) {
      const f = await fixture();
      await db.pillar.update({ where: { id: f.s.id }, data: mode === "locked" ? { validationStatus: "LOCKED" }
        : { content: { ...composedSynthesis(), syntheseExecutive: "Human synthetic text preserved", _fieldProvenance: { syntheseExecutive: "HUMAN" } } } });
      const before = await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } });
      const result = await execute({ kind: "SYNTHESIZE_S", strategyId: f.strategy.id });
      expect(result.status).toBe("FAILED");
      expect(result.summary).toContain(mode === "locked" ? "LOCKED" : "FIELD_PROVENANCE_REFUSED");
      expect(await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).toEqual(before);
      expect(await db.strategy.findUniqueOrThrow({ where: { id: f.strategy.id } })).toMatchObject({ status: "VALIDATED" });
      expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(0);
    }
  });
  it("serializes two recalculations and replaces current arrays while retaining both archives", async () => {
    const f = await fixture(); await choose(f, true);
    const results = await Promise.all([actualizePillar(f.strategy.id, "S"), actualizePillar(f.strategy.id, "S")]);
    expect(results.every(result => result.updated)).toBe(true);
    const s = await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } });
    expect(s.currentVersion).toBe(3);
    expect((s.content as { selectedFromI: unknown[] }).selectedFromI).toHaveLength(1);
    expect((s.content as { sprint90Days: unknown[] }).sprint90Days).toHaveLength(1);
    expect(await db.pillarVersion.count({ where: { pillarId: f.s.id } })).toBe(2);
  });
  it("a stale calculation cannot create a ghost S when the target was absent", async () => {
    const f = await fixture(); await db.pillar.delete({ where: { id: f.s.id } });
    const source = await executeProtocoleStrategy(f.strategy.id); await choose(f, true);
    const result = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: "s",
      operation: { type: "REPLACE_FULL", content: source.content }, author: { system: "PROTOCOLE_S", reason: "Synthetic absent target" },
      options: { expectedPillarVersions: source.content._sourcePillarVersions as Record<string, number | null> } });
    expect(result.success).toBe(false); expect(result.error).toContain("PILLAR_SOURCE_VERSION_CONFLICT");
    expect(await db.pillar.count({ where: { strategyId: f.strategy.id, key: "s" } })).toBe(0);
  });
  it("persists selection in a versioned initiative and withdraws the former S review", async () => {
    const f = await fixture(); await choose(f, true);
    expect(await readI(f)).toMatchObject({ currentVersion: 2, content: { catalogueParCanal: { DIGITAL: [
      { ...f.initiative, status: "SELECTED_FOR_ROADMAP" },
    ] } } });
    expect(await db.pillarVersion.findMany({ where: { pillarId: f.i.id } })).toHaveLength(1);
    expect(await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).toMatchObject({ validationStatus: "AI_PROPOSED", confidence: null });
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.s.id } })).staleAt).toBeInstanceOf(Date);
    expect((await db.strategy.findUniqueOrThrow({ where: { id: f.strategy.id } })).status).not.toBe("VALIDATED");
  });
  it("retains choice, planning, priority, cost and execution metadata during refresh", async () => {
    const f = await fixture(); await choose(f, true);
    const data = { selected: true, status: "SCHEDULED", priority: "P0", budgetMin: 777, budgetMax: 777,
      timingStart: new Date("2026-12-01T09:00:00Z"), timingEnd: new Date("2026-12-02T09:00:00Z"),
      metadata: { socialPublish: { provider: "synthetic" }, chosenNote: "Keep my execution context" } };
    await db.brandAction.update({ where: { id: f.action.id }, data });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject(data);
  });
  it("deselects the source instead of resurrecting the choice at the next refresh", async () => {
    const f = await fixture(); await choose(f, true); await choose(f, false);
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await readI(f)).toMatchObject({ currentVersion: 3, content: { catalogueParCanal: { DIGITAL: [
      { status: "RECOMMENDED" },
    ] } } });
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ selected: false, status: "PROPOSED" });
  });
  it("fills an empty legacy projection with the actual source budget without inventing an estimate", async () => {
    const f = await fixture();
    await db.brandAction.update({ where: { id: f.action.id }, data: { budgetMin: null, budgetMax: null, metadata: {} } });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ budgetMin: 1000, budgetMax: 1000 });
    expect((await readI(f)).currentVersion).toBe(1);
  });
  it("does not replace a manual row that shares a source initiative identity", async () => {
    const f = await fixture();
    const before = await db.brandAction.update({ where: { id: f.action.id }, data: { source: "OPERATOR_PROPOSED",
      title: "Actual manual definition", selected: true, status: "ACCEPTED", metadata: { provenance: "operator" } } });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(before);
  });
  it.each(["SCHEDULED", "EXECUTED", "CANCELLED"])("preserves execution history %s if the proposal disappears", async status => {
    const f = await fixture();
    const before = await db.brandAction.update({ where: { id: f.action.id }, data: { status,
      timingStart: new Date("2026-12-01T09:00:00Z"), selected: status !== "CANCELLED" } });
    await db.pillar.update({ where: { id: f.i.id }, data: { content: { catalogueParCanal: {} } } });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(before);
  });
  it("does not report selection success when I refuses a locked source", async () => {
    const f = await fixture(); await db.pillar.update({ where: { id: f.i.id }, data: { validationStatus: "LOCKED" } });
    await expect(choose(f, true)).rejects.toThrow(/LOCKED/);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(f.action);
    expect((await readI(f)).currentVersion).toBe(1);
    expect(await db.pillarVersion.count({ where: { pillarId: f.i.id } })).toBe(0);
  });
  it("never rearms an executed task when selecting or editing its old deadline", async () => {
    const f = await fixture();
    await db.brandAction.update({ where: { id: f.action.id }, data: { selected: true, status: "EXECUTED" } });
    await choose(f, true);
    await expect(setBrandActionStatus({ strategyId: f.strategy.id,
      op: { type: "TIMING", actionId: f.action.id, timingStart: "2026-12-01T09:00:00Z" } })).rejects.toThrow();
    expect((await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).status).toBe("EXECUTED");
  });
  it("allows a regenerated catalogue to add proposals while preserving a human selection by identity", async () => {
    const f = await fixture(); await choose(f, true);
    const nextId = randomUUID();
    const result = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: "i",
      operation: { type: "SET_FIELDS", fields: [{ path: "catalogueParCanal", value: { DIGITAL: [
        { ...f.initiative, action: "Updated source wording", status: "RECOMMENDED" },
        { ...f.initiative, id: nextId, action: "New unselected proposal" },
      ] } }] }, author: { system: "PROTOCOLE_I", reason: "Synthetic catalogue regeneration" },
      options: { expectedVersion: 2, shapeGate: true } });
    expect(result.success).toBe(true);
    expect(await readI(f)).toMatchObject({ currentVersion: 3, content: { catalogueParCanal: { DIGITAL: [
      { id: f.initiative.id, action: "Updated source wording", status: "SELECTED_FOR_ROADMAP" },
      { id: nextId, status: "RECOMMENDED" },
    ] } } });
    await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.count({ where: { strategyId: f.strategy.id } })).toBe(2);
    expect((await executeProtocoleStrategy(f.strategy.id)).content).toMatchObject({ computed: { selectedInitiativeCount: 1 } });
  });
  it("projects a versioned source selection rather than retaining an obsolete projection flag", async () => {
    const f = await fixture();
    const result = await writePillarAndScore({ strategyId: f.strategy.id, pillarKey: "i",
      operation: { type: "SET_FIELDS", fields: [{ path: "catalogueParCanal", value: { DIGITAL: [
        { ...f.initiative, status: "SELECTED_FOR_ROADMAP" },
      ] } }] }, author: { system: "MESTOR", reason: "Synthetic typed source choice" }, options: { expectedVersion: 1, shapeGate: true } });
    expect(result.success).toBe(true); await syncBrandActionsFromBlob(f.strategy.id);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ selected: true, status: "ACCEPTED" });
  });
  it("serializes a refresh and a human choice without losing either half", async () => {
    const f = await fixture();
    await Promise.all([syncBrandActionsFromBlob(f.strategy.id), choose(f, true)]);
    expect(await readI(f)).toMatchObject({ currentVersion: 2, content: { catalogueParCanal: { DIGITAL: [{ status: "SELECTED_FOR_ROADMAP" }] } } });
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ selected: true, status: "ACCEPTED" });
  });
  it("onboards an actual manual proposal into I once so S counts the same decision", async () => {
    const f = await fixture();
    const manual = await db.brandAction.create({ data: { strategyId: f.strategy.id, source: "OPERATOR_PROPOSED",
      title: "Actual manual initiative", description: "Actual manual objective", budgetMin: 250, budgetMax: 250, status: "PROPOSED" } });
    await setBrandActionStatus({ strategyId: f.strategy.id, op: { type: "SELECT", actionId: manual.id, selected: true } });
    const row = await db.brandAction.findUniqueOrThrow({ where: { id: manual.id } });
    expect(row.sourceInitiativeId).toMatch(/^[0-9a-f-]{36}$/);
    const before = await readI(f);
    await setBrandActionStatus({ strategyId: f.strategy.id, op: { type: "SELECT", actionId: manual.id, selected: true } });
    expect(await readI(f)).toEqual(before);
    await syncBrandActionsFromBlob(f.strategy.id);
    expect((await executeProtocoleStrategy(f.strategy.id)).content).toMatchObject({ computed: { selectedInitiativeCount: 1, totalBudget: 250 } });
    expect(await db.brandAction.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });
  it("records human confirmation of a previously generated choice without freezing the catalogue", async () => {
    const f = await fixture();
    await db.pillar.update({ where: { id: f.i.id }, data: { content: { catalogueParCanal: { DIGITAL: [
      { ...f.initiative, status: "SELECTED_FOR_ROADMAP" },
    ] } } } });
    await syncBrandActionsFromBlob(f.strategy.id); await choose(f, true);
    const first = await readI(f);
    expect(first).toMatchObject({ currentVersion: 2, content: { _fieldProvenance: { [`initiatives.${f.initiative.id}.status`]: "HUMAN" } } });
    await choose(f, true); expect(await readI(f)).toEqual(first);
  });
  it("refuses retaining a cancelled action without changing source or execution history", async () => {
    const f = await fixture();
    const before = await db.brandAction.update({ where: { id: f.action.id }, data: { status: "CANCELLED" } });
    await expect(choose(f, true)).rejects.toThrow(/ACTION_TERMINAL/);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(before);
    expect((await readI(f)).currentVersion).toBe(1);
  });
  it("calculates the chosen set without choosing new proposals or invoking an AI", async () => {
    const f = await fixture(); await choose(f, true); provider.callLLM.mockClear();
    const iBefore = await readI(f); const actionBefore = await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } });
    const output = await executeProtocoleStrategy(f.strategy.id);
    expect(output.error).toBeUndefined();
    expect(output.content).toMatchObject({ computed: { selectedInitiativeCount: 1, totalBudget: 1000 } });
    expect(await readI(f)).toEqual(iBefore);
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(actionBefore);
    expect(provider.callLLM).not.toHaveBeenCalled();
  });
  it("leaves a non-selected proposal out of S, preserving its actual source status", async () => {
    const f = await fixture(); provider.callLLM.mockClear(); const before = await readI(f);
    const output = await executeProtocoleStrategy(f.strategy.id);
    expect(output.error).toBeUndefined();
    expect(output.content).toMatchObject({ computed: { selectedInitiativeCount: 0, totalBudget: 0 }, selectedFromI: [] });
    expect(await readI(f)).toEqual(before); expect(provider.callLLM).not.toHaveBeenCalled();
  });
});
