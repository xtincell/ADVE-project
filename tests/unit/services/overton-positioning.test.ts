import { describe, expect, it, vi } from "vitest";
import { EntryOvertonClaimSchema, entryOvertonConcept, readOvertonPositioning, overtonPlanningMilestones, overtonPath, OVERTON_MILESTONES } from "@/domain/overton-positioning";
import { qualifyingOvertonEvidence, type OvertonEvidence } from "@/domain/overton-graph";
import { PillarASchema } from "@/lib/types/pillar-schemas";
import { mapFenetreOverton } from "@/server/services/strategy-presentation/section-mappers";
vi.mock("@/lib/db", () => ({ db: {} }));
import { upsertOvertonPosition, recordZoneTransition, readBrandOvertonPositioning, getOvertonSignalsForBrand } from "@/server/services/seshat/overton-graph";

const claim = EntryOvertonClaimSchema.parse({ statement: "Les choix doivent être étayés par l’expérience.", audience: "Public test CI",
  baselineZone: "ACCEPTABLE", targetZone: "POPULAR" });
const concept = entryOvertonConcept(claim);
const framed = [concept, { ...concept, id: "category", kind: "CATEGORY" as const, statement: "Catégorie test" },
  { ...concept, id: "brand", kind: "BRAND" as const, statement: "Marque test" }];
const proof: OvertonEvidence = { source: "https://example.org/etude", at: "2026-01-01T00:00:00.000Z", stance: "SUPPORTS",
  zone: "ACCEPTABLE", audience: claim.audience, countryCode: "CI", method: "Entretiens documentés" };
const envelope = { concept: { key: concept.id, kind: concept.kind, audience: concept.audience }, items: [proof] };

describe("Overton: shared six-zone frame", () => {
  it("keeps six precise milestones and supports reverse movement", () => {
    expect(OVERTON_MILESTONES.map(x => x.zone)).toEqual(["UNTHINKABLE", "RADICAL", "ACCEPTABLE", "SENSIBLE", "POPULAR", "POLICY"]);
    expect(overtonPath("SENSIBLE", "RADICAL")).toEqual(["SENSIBLE", "ACCEPTABLE", "RADICAL"]);
  });
  it("quotes legacy ADVE without deriving public acceptance from a good brand story", () => {
    const read = readOvertonPositioning({ a: { nomMarque: "Test", secteur: "Cuisine", promesseFondamentale: "Une expérience vérifiable" } });
    expect(read.positions).toHaveLength(3);
    expect(read.status).toBe("PARTIAL");
    expect(read.positions.every(p => !p.baseline && !p.observation)).toBe(true);
  });
  it("carries a declared entry belief without turning it into a measurement", () => {
    const read = readOvertonPositioning({ a: { overtonPositions: framed } });
    expect(read.status).toBe("FRAMED");
    expect(read.positions[0]!.baseline?.basis).toBe("DECLARED");
    expect(read.positions[0]!.observation).toBeUndefined();
    expect(overtonPlanningMilestones(read).map(x => x.zone)).toEqual(Array(3).fill(["ACCEPTABLE", "SENSIBLE", "POPULAR"]).flat());
  });
  it("rejects a complete-looking profile with duplicate concepts or only brand positions", () => {
    const schema = PillarASchema.shape.overtonPositions;
    expect(schema.safeParse([concept]).success).toBe(true);
    expect(schema.safeParse([concept, concept, concept]).success).toBe(false);
    expect(schema.safeParse(framed).success).toBe(true);
  });
  it("irrigates the Oracle from the same ADVE concept IDs", () => {
    const result = mapFenetreOverton({ pillars: [{ key: "a", content: { overtonPositions: framed } }] });
    expect(result.positioning?.positions.map(p => p.id)).toEqual(framed.map(p => p.id));
    expect(result.positioning?.positions.every(p => !p.observation)).toBe(true);
  });
});

describe("Overton: observations cannot be fabricated by missing evidence", () => {
  it("requires the same audience, country, zone, date and method", () => {
    expect(qualifyingOvertonEvidence([proof], "ACCEPTABLE", claim.audience, "CI")).toHaveLength(1);
    for (const bad of [{ ...proof, countryCode: "CG" }, { ...proof, audience: "Other" }, { ...proof, method: undefined },
      { ...proof, at: undefined }, { ...proof, at: "2100-01-01" }, { ...proof, zone: "POPULAR" as const }, { ...proof, stance: "CONTEXT" as const }]) {
      expect(qualifyingOvertonEvidence([bad], "ACCEPTABLE", claim.audience, "CI")).toEqual([]);
    }
    expect(qualifyingOvertonEvidence([{ ...proof, stance: "OPPOSES", zone: "RADICAL" }], "RADICAL", claim.audience, "CI")).toHaveLength(1);
  });
  it("refuses assigning a measured zone from an unsupported upsert", async () => {
    const tx = { overtonPosition: { findFirst: vi.fn(async () => null), create: vi.fn() } };
    const client = { $transaction: (fn: (c: typeof tx) => unknown) => fn(tx) };
    await expect(upsertOvertonPosition(client as never, { sectorSlug: "test", statement: "Test", zone: "POPULAR", evidence: [] })).rejects.toThrow(/preuve/);
    expect(tx.overtonPosition.create).not.toHaveBeenCalled();
  });
  it("preserves evidence and separates country identity on repeated upserts", async () => {
    const tx = { overtonPosition: { findFirst: vi.fn(async () => ({ id: "p", zone: null, statement: concept.statement, evidence: envelope })), update: vi.fn(async (_request: unknown) => ({})) } };
    const client = { $transaction: (fn: (c: typeof tx) => unknown) => fn(tx) };
    await upsertOvertonPosition(client as never, { strategyId: "brand", sectorSlug: "test", countryCode: "CI", statement: concept.statement,
      concept: envelope.concept, evidence: [Object.fromEntries(Object.entries(proof).reverse()) as typeof proof] });
    expect(tx.overtonPosition.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ countryCode: "CI", marketScale: null, strategyId: "brand" }) }));
    const values = tx.overtonPosition.update.mock.calls[0]![0] as { data: { evidenceCount: number; evidence: { items: unknown[] } } };
    expect(values.data.evidenceCount).toBe(1);
    expect(values.data.evidence.items).toEqual([proof]);
  });
  it("refuses a stale departure without changing the graph", async () => {
    const tx = { overtonPosition: { findUnique: vi.fn(async () => ({ id: "p", zone: "ACCEPTABLE", countryCode: "CI", evidence: envelope })), update: vi.fn(async (_request: unknown) => ({})) },
      overtonZoneTransition: { findFirst: vi.fn(async () => null), create: vi.fn() } };
    await expect(recordZoneTransition({ $transaction: (fn: (c: typeof tx) => unknown) => fn(tx) } as never, {
      positionId: "p", fromZone: "RADICAL", toZone: "POPULAR", occurredAt: "2026-02-01T00:00:00.000Z", evidence: [proof],
    })).rejects.toThrow(/départ/);
    expect(tx.overtonZoneTransition.create).not.toHaveBeenCalled();
  });
  it("does not attach a different public or a legacy unproved zone to the ADVE", async () => {
    const client = { overtonPosition: { findMany: vi.fn(async () => [
      { id: "wrong", zone: "POPULAR", evidence: { ...envelope, concept: { ...envelope.concept, audience: "Other" } } },
      { id: "legacy", zone: "POPULAR", evidence: [] },
      { id: "right", statement: concept.statement, zone: "ACCEPTABLE", evidence: envelope, countryCode: "CI" },
    ]) } };
    const r = await readBrandOvertonPositioning(client as never, "brand", { a: { overtonPositions: framed } }, "CI");
    expect(r.positions[0]!.observation?.positionId).toBe("right");
    expect(r.positions[1]!.observation).toBeUndefined();
  });
  it("counts a move toward rejection as favorable when it is the explicit brand target", async () => {
    const from = { ...proof, zone: "SENSIBLE" as const };
    const to = { ...proof, zone: "RADICAL" as const, stance: "OPPOSES" as const, at: "2026-02-01T00:00:00.000Z" };
    const client = { overtonActorLink: { findMany: vi.fn(async () => []) }, overtonZoneTransition: { findMany: vi.fn(async () => [{
      positionId: "reverse", fromZone: "SENSIBLE", toZone: "RADICAL", occurredAt: new Date(to.at), evidence: [to],
      position: { evidence: { concept: { ...envelope.concept, targetZone: "UNTHINKABLE" }, items: [from, to] }, countryCode: "CI" },
    }]) } };
    const r = await getOvertonSignalsForBrand(client as never, "brand");
    expect(r.favorableTransitions).toMatchObject([{ positionId: "reverse", delta: 2 }]);
    expect(r.adverseTransitions).toEqual([]);
  });
  it("does not score unproved historic transitions as victories", async () => {
    const client = { overtonActorLink: { findMany: vi.fn(async () => [{ position: { id: "old", statement: "Legacy", zone: "POPULAR", evidence: [], countryCode: "CI" } }]) }, overtonZoneTransition: { findMany: vi.fn(async () => [
      { positionId: "old", fromZone: "RADICAL", toZone: "POPULAR", occurredAt: new Date("2026-01-02"), evidence: [], position: { evidence: [], countryCode: "CI" } },
    ]) } };
    const r = await getOvertonSignalsForBrand(client as never, "brand");
    expect(r.favorableTransitions).toEqual([]);
    expect(r.heldPositions).toEqual([{ id: "old", statement: "Legacy", zone: null }]);
  });
});
