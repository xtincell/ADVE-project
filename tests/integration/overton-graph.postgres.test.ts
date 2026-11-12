import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { upsertOvertonPosition, recordZoneTransition, linkActorToPosition, readBrandOvertonPositioning } from "@/server/services/seshat/overton-graph";
import { entryOvertonConcept } from "@/domain/overton-positioning";
import { readOvertonEvidence, type OvertonEvidence } from "@/domain/overton-graph";

const scope = `overton-receipt-${randomUUID()}`;
const ids: string[] = [];
const concept = entryOvertonConcept({ statement: "Proposition de recette isolée", audience: "Public de recette",
  baselineZone: "RADICAL", targetZone: "POPULAR" });
const ref = { key: concept.id, kind: concept.kind, audience: concept.audience };
const proof: OvertonEvidence = { source: "https://example.test/proof", at: "2026-01-01T00:00:00.000Z", zone: "RADICAL",
  stance: "OPPOSES", audience: concept.audience, countryCode: "CI", method: "Recette synthétique, aucun public réel interrogé" };
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
});
afterAll(async () => {
  if (ids.length) {
    await db.overtonZoneTransition.deleteMany({ where: { positionId: { in: ids } } });
    await db.overtonActorLink.deleteMany({ where: { positionId: { in: ids } } });
    await db.overtonPosition.deleteMany({ where: { id: { in: ids } } });
  }
  await db.$disconnect();
});
describe("existing Overton graph, real PostgreSQL persistence", () => {
  it("deduplicates evidence, separates countries and applies an atomic repeat-safe transition", async () => {
    const base = { sectorSlug: scope, countryCode: "CI", statement: concept.statement, concept: ref, evidence: [proof] };
    const first = await upsertOvertonPosition(db, base); ids.push(first.positionId);
    const replay = await upsertOvertonPosition(db, base);
    expect(replay.positionId).toBe(first.positionId);
    expect((await db.overtonPosition.findUniqueOrThrow({ where: { id: first.positionId } })).evidenceCount).toBe(1);
    const link = { positionId: first.positionId, actorKind: "BRAND" as const, actorRef: scope, edgeKind: "HOLDS" as const };
    await linkActorToPosition(db, link);
    expect(await linkActorToPosition(db, link)).toMatchObject({ status: "NOOP" });
    expect(await db.overtonActorLink.count({ where: { positionId: first.positionId } })).toBe(1);
    const other = await upsertOvertonPosition(db, { ...base, countryCode: "CG", evidence: [] }); ids.push(other.positionId);
    expect(other.positionId).not.toBe(first.positionId);
    const input = { positionId: first.positionId, fromZone: null, toZone: "RADICAL" as const, occurredAt: proof.at!, evidence: [proof] };
    await recordZoneTransition(db, input);
    expect(await recordZoneTransition(db, { ...input, occurredAt: "2026-01-01T00:00:00Z" })).toMatchObject({ status: "NOOP" });
    expect(await db.overtonZoneTransition.count({ where: { positionId: first.positionId } })).toBe(1);
    const after = await db.overtonPosition.findUniqueOrThrow({ where: { id: first.positionId } });
    expect(after.zone).toBe("RADICAL");
    expect(readOvertonEvidence(after.evidence).items).toEqual([proof]);
    await expect(recordZoneTransition(db, { ...input, fromZone: "RADICAL", toZone: "POPULAR",
      occurredAt: "2026-02-01T00:00:00.000Z", evidence: [] })).rejects.toThrow(/preuve/);
    expect(await db.overtonZoneTransition.count({ where: { positionId: first.positionId } })).toBe(1);
    expect((await db.overtonPosition.findUniqueOrThrow({ where: { id: first.positionId } })).zone).toBe("RADICAL");
    // A different tenant never receives the global synthetic record.
    const read = await readBrandOvertonPositioning(db, scope, { a: { overtonPositions: [concept] } }, "CI");
    expect(read.positions[0]!.observation).toBeUndefined();
  });
});
