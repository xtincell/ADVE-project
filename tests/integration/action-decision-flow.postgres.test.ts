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
