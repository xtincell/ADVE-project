/** Real registry → fixed calibration → human review → public verdict, local only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
vi.mock("@/server/services/llm-gateway", async (original) => ({
  ...await original<typeof import("@/server/services/llm-gateway")>(),
  isTextLLMAvailable: () => false,
  callLLM: vi.fn(async () => { throw new Error("MODEL_FORBIDDEN_IN_OWNED_FIXTURE"); }),
}));
vi.mock("@/server/services/quick-intake/public-enrichment", () => ({
  enrichPublicFootprint: vi.fn(async () => ({ enrichment: { apify: "DEFERRED" }, followerCounts: [] })),
  persistFootprintToPillarE: vi.fn(),
}));
import { db } from "@/lib/db";
import { scoreurRouter } from "@/server/trpc/routers/scoreur";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { loadAnchorsForLeague, recordEpreuve, resolveLeagueForStrategy, scoreBrand } from "@/server/services/seshat/scoreur";
import { createCandidates, decideCandidate } from "@/server/services/seshat/scoreur/candidates";
import { scoreFromEpreuves } from "@/domain/scoreur";

const operators: string[] = [], users: string[] = [], strategies: string[] = [], clients: string[] = [], refs: string[] = [], candidates: string[] = [];
const prospectNames: string[] = [];
let actor: string, foreign: string, admin: string;
const nowIso = "2026-10-21T00:00:00.000Z";
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.port).toBe("55439"); expect(url.pathname).toBe("/shinkiro_verify");
  vi.stubGlobal("fetch", async () => { throw new Error("NETWORK_FORBIDDEN_IN_OWNED_FIXTURE"); });
  for (const label of ["A", "B"]) {
    const op = await db.operator.create({ data: { name: `Scorer pipeline ${label}`, slug: `scoreur-${randomUUID()}`,
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date("2099-01-01") } });
    operators.push(op.id);
  }
  for (const [operatorId, role] of [[operators[0], "USER"], [operators[1], "USER"], [operators[0], "ADMIN"]] as const) {
    users.push((await db.user.create({ data: { email: `scoreur-${randomUUID()}@example.invalid`, operatorId, role } })).id);
  }
  [actor, foreign, admin] = users as [string, string, string];
});
afterAll(async () => {
  const scope = { in: strategies };
  await db.epreuveCandidate.deleteMany({ where: { OR: [{ subjectStrategyId: scope }, { id: { in: candidates } }] } });
  await db.epreuve.deleteMany({ where: { OR: [{ subjectStrategyId: scope }, { opponentBrandRefId: { in: refs } }] } });
  await db.scoreVerdict.deleteMany({ where: { subjectStrategyId: scope } });
  await db.costDecision.deleteMany({ where: { OR: [{ strategyId: scope }, { operatorId: { in: operators } }] } });
  await db.intentEmission.deleteMany({ where: { OR: [{ strategyId: scope },
    ...strategies.map(id => ({ payload: { path: ["subjectStrategyId"], equals: id } })),
    ...prospectNames.map(name => ({ payload: { path: ["name"], equals: name } })),
    ...candidates.map(id => ({ payload: { path: ["candidateId"], equals: id } }))] } });
  await db.pillar.deleteMany({ where: { strategyId: scope } });
  await db.strategy.deleteMany({ where: { id: scope } });
  await db.client.deleteMany({ where: { id: { in: clients } } });
  await db.brandRef.deleteMany({ where: { id: { in: refs } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } });
  vi.unstubAllGlobals(); await db.$disconnect();
});
const caller = (id = actor, role: "USER" | "ADMIN" = "USER") => scoreurRouter.createCaller({ db, headers: undefined,
  session: { user: { id, role }, expires: new Date(Date.now() + 60000).toISOString() } });
async function fixture(isForeign = false) {
  const client = await db.client.create({ data: { name: `Owned scorer ${randomUUID()}`, operatorId: operators[isForeign ? 1 : 0]!, sector: "Restauration" } }); clients.push(client.id);
  const strategy = await db.strategy.create({ data: { name: client.name, userId: isForeign ? foreign : actor, operatorId: client.operatorId, clientId: client.id, marketScale: "VILLE", countryCode: "CM" } }); strategies.push(strategy.id);
  const league = await resolveLeagueForStrategy(strategy.id);
  const anchor = await db.brandRef.create({ data: { slug: `owned-calibration-${randomUUID()}`, name: "Owned calibration", kind: "ANCHOR", fixedTheta: 1850,
    sectorSlug: league.sectorSlug, marketScale: "VILLE", countryCode: "CM" } }); refs.push(anchor.id);
  return { strategy, league, anchor };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function pending(f: Fixture, patch: Record<string, unknown> = {}) {
  const input = { arena: "D" as const, rivalName: f.anchor.name, rivalBrandRefId: f.anchor.id, proposedResult: "WIN" as const,
    claim: `Synthetic observed comparison ${randomUUID()}`, sourceUrl: "https://example.invalid/owned/comparison" };
  await createCandidates(f.strategy.id, [input]);
  const row = await db.epreuveCandidate.findFirstOrThrow({ where: { subjectStrategyId: f.strategy.id, claim: input.claim } }); candidates.push(row.id);
  if (Object.keys(patch).length) return db.epreuveCandidate.update({ where: { id: row.id }, data: patch });
  return row;
}
const evidence = (f: Fixture) => ({ subjectStrategyId: f.strategy.id, opponentBrandRefId: f.anchor.id, arena: "D" as const,
  league: f.league, result: "WIN" as const, proofWeight: 1, source: "https://example.invalid/owned/direct-observation", occurredAt: nowIso });

describe("existing deterministic scorer as an owned publication pipeline", () => {
  it("joins stored opponent IDs to the exact fixed calibration and preserves semantic slugs", async () => {
    const f = await fixture(); const ep = await recordEpreuve(evidence(f)); const loaded = await loadAnchorsForLeague(f.league);
    expect(loaded[ep.opponentBrandRefId!]).toBe(1850); expect(loaded[f.anchor.slug]).toBe(1850);
  });

  it("does not load another declared league as this league calibration", async () => {
    const f = await fixture();
    const other = await db.brandRef.create({ data: { name: "Other league", slug: `other-calibration-${randomUUID()}`, kind: "ANCHOR", fixedTheta: 1950,
      sectorSlug: f.league.sectorSlug, marketScale: "MONDE", countryCode: "FR" } }); refs.push(other.id);
    const loaded = await loadAnchorsForLeague(f.league); expect(loaded[f.anchor.slug]).toBe(1850); expect(loaded[other.slug]).toBeUndefined();
  });

  it("calibrates the recorded duel and publishes a reproducible verdict, without inventing empty arenas", async () => {
    const f = await fixture(); await recordEpreuve(evidence(f));
    const expected = scoreFromEpreuves({ subjectRef: f.strategy.id, league: f.league,
      anchors: { [f.anchor.id]: 1850 }, itemsMet: new Set(), epreuves: [{ subjectRef: f.strategy.id, opponentRef: f.anchor.id,
        arena: "D", result: "WIN", proofWeight: 1, source: evidence(f).source, occurredAt: nowIso }] });
    const first = await scoreBrand(f.strategy.id, { nowIso, persist: true });
    const replay = await scoreBrand(f.strategy.id, { nowIso, persist: false });
    expect(first.verdict).toEqual(replay.verdict);
    expect(first.verdict.arenas.find(x => x.arena === "D")).toEqual(expected.arenas.find(x => x.arena === "D"));
    expect(first.verdict.arenas.filter(x => x.arena !== "D").every(x => x.epreuveCount === 0 && x.force === 0)).toBe(true);
    expect(await caller(admin, "ADMIN").verdict({ strategyId: f.strategy.id })).toMatchObject({ subjectStrategyId: f.strategy.id, epreuveCount: 1 });
  });

  it("never publishes a ghost subject when the strategy does not exist", async () => {
    const missing = `missing-${randomUUID()}`; strategies.push(missing);
    await expect(scoreBrand(missing, { persist: true })).rejects.toThrow();
    expect(await db.scoreVerdict.count({ where: { subjectStrategyId: missing } })).toBe(0);
  });

  it("approves once under concurrent review: one decision, one observation and one verdict", async () => {
    const f = await fixture(), c = await pending(f);
    const results = await Promise.allSettled([1, 2].map(() => decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso })));
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
    expect(await db.scoreVerdict.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
    expect(await db.epreuveCandidate.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "APPROVED", reviewedBy: actor });
  });

  it("does not consume a review when its subject is missing and publication cannot succeed", async () => {
    const f = await fixture(), c = await pending(f); const missing = `missing-review-${randomUUID()}`; strategies.push(missing);
    await db.epreuveCandidate.update({ where: { id: c.id }, data: { subjectStrategyId: missing } });
    await expect(decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso })).rejects.toThrow();
    expect(await db.epreuveCandidate.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "PENDING", recordedEpreuveId: null });
    expect(await db.epreuve.count({ where: { subjectStrategyId: missing } })).toBe(0);
  });

  it("keeps legacy pending evidence without a source out of the accepted registry", async () => {
    const f = await fixture(), c = await pending(f, { sourceUrl: null });
    await expect(decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso })).rejects.toThrow();
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(0);
  });

  it("requires an identified opponent before an approval becomes a measured duel", async () => {
    const f = await fixture(), c = await pending(f, { rivalBrandRefId: null });
    await expect(decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso })).rejects.toThrow();
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(0);
  });

  it("scopes the review queue, including the branch without a selected subject", async () => {
    const own = await fixture(), other = await fixture(true); await pending(own); const hidden = await pending(other);
    const rows = await caller().listCandidates(); expect(rows.some(x => x.subjectStrategyId === own.strategy.id)).toBe(true);
    expect(rows.some(x => x.id === hidden.id)).toBe(false);
    await expect(caller().listCandidates({ subjectStrategyId: other.strategy.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a foreign candidate ID before changing its decision or publishing a verdict", async () => {
    const f = await fixture(true), c = await pending(f);
    await expect(caller().decideCandidate({ candidateId: c.id, decision: "APPROVE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.epreuveCandidate.findUniqueOrThrow({ where: { id: c.id } })).toEqual(c);
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(0);
  });

  it("refuses the foreign subject alias before a hunt, even when its model is unavailable", async () => {
    const f = await fixture(true);
    await expect(caller().huntVictories({ subjectStrategyId: f.strategy.id, rivalName: "Owned comparator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("treats an exact manual replay as one observation, including concurrent requests", async () => {
    const f = await fixture(), payload = evidence(f);
    const rows = await Promise.all([recordEpreuve(payload), recordEpreuve(payload)]);
    expect(rows[0]!.id).toBe(rows[1]!.id); expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
  });

  it("resolves the operator from stored membership when Auth.js has no operatorId claim", async () => {
    const name = `Owned new prospect ${randomUUID()}`; prospectNames.push(name);
    const result = await caller().scoreProspect({ name, sectorRaw: "Restauration", countryCode: "CM", marketScale: "VILLE" });
    strategies.push(result.strategyId);
    const row = await db.strategy.findUniqueOrThrow({ where: { id: result.strategyId } });
    if (row.clientId) clients.push(row.clientId);
    expect(row).toMatchObject({ operatorId: operators[0], userId: actor });
    expect(result.footprintStatus).toBe("DEFERRED"); expect(result.verdict.coveragePct).toBe(0);
    expect(await db.aICostLog.count({ where: { strategyId: row.id } })).toBe(0);
  });

  it("lists a peer-owned dossier under the same stored operator without a JWT membership field", async () => {
    const f = await fixture(); await db.strategy.update({ where: { id: f.strategy.id }, data: { userId: admin } });
    const api = strategyRouter.createCaller({ db, headers: undefined, session: { user: { id: actor, role: "USER" }, expires: new Date(Date.now() + 60000).toISOString() } });
    const rows = await api.list({}); expect(rows.some(x => x.id === f.strategy.id)).toBe(true);
  });

  it("publishes an existing dossier through manual input and exposes one brand after an exact replay", async () => {
    const f = await fixture(); const { subjectStrategyId, ...input } = evidence(f);
    const first = await caller().recordEpreuve({ ...input, league: { ...input.league, marketScale: "VILLE" }, strategyId: subjectStrategyId });
    const replay = await caller().recordEpreuve({ ...input, league: { ...input.league, marketScale: "VILLE" }, strategyId: subjectStrategyId });
    expect(replay.id).toBe(first.id); expect(replay.score.verdict).toEqual(first.score.verdict);
    const publicRows = await caller().leaderboard({ ...f.league, marketScale: "VILLE", limit: 200 });
    expect(publicRows.filter(x => x.subjectLabel === f.strategy.name)).toHaveLength(1);
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
  });

  it("rolls back the decision and observation if verdict persistence fails, then accepts the same review on retry", async () => {
    const f = await fixture(), c = await pending(f);
    const constraint = `owned_score_${randomUUID().replaceAll("-", "")}`;
    expect(f.strategy.id).toMatch(/^[a-z0-9]+$/);
    // A real PostgreSQL failure, scoped to this exact owned subject. NOT VALID
    // leaves old rows untouched but rejects this fixture's new verdict.
    await db.$executeRawUnsafe(`ALTER TABLE "ScoreVerdict" ADD CONSTRAINT "${constraint}" CHECK ("subjectStrategyId" IS DISTINCT FROM '${f.strategy.id}') NOT VALID`);
    try {
      await expect(decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso })).rejects.toThrow();
      expect(await db.epreuveCandidate.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "PENDING", recordedEpreuveId: null });
      expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(0);
      expect(await db.scoreVerdict.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(0);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "ScoreVerdict" DROP CONSTRAINT "${constraint}"`); }
    await decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: nowIso });
    expect(await db.epreuve.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
    expect(await db.scoreVerdict.count({ where: { subjectStrategyId: f.strategy.id } })).toBe(1);
  });

  it("uses a same-league rival's calibrated duels without counting that rival's evidence as the subject's own coverage", async () => {
    const a = await fixture(), b = await fixture();
    await recordEpreuve({ ...evidence(a), opponentBrandRefId: null, opponentStrategyId: b.strategy.id });
    const before = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    await recordEpreuve(evidence(b));
    await recordEpreuve({ ...evidence(b), arena: "A" });
    const expected = scoreFromEpreuves({ subjectRef: a.strategy.id, league: a.league, anchors: { [b.anchor.id]: 1850 }, itemsMet: new Set(), epreuves: [
      { subjectRef: a.strategy.id, opponentRef: b.strategy.id, arena: "D", result: "WIN", proofWeight: 1, source: evidence(a).source, occurredAt: nowIso },
      { subjectRef: b.strategy.id, opponentRef: b.anchor.id, arena: "D", result: "WIN", proofWeight: 1, source: evidence(b).source, occurredAt: nowIso },
    ] });
    const after = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    expect(after.verdict.arenas.find(x => x.arena === "D")!.theta).toBe(expected.arenas.find(x => x.arena === "D")!.theta);
    expect(after.verdict.arenas.find(x => x.arena === "D")!.theta).toBeGreaterThan(before.verdict.arenas.find(x => x.arena === "D")!.theta);
    expect(after.epreuveCount).toBe(1); expect(after.verdict.coveragePct).toBe(20);
    expect(after.verdict.arenas.find(x => x.arena === "A")).toMatchObject({ force: 0, epreuveCount: 0 });
  });

  it("counts the subject's observed incoming duel once and reverses the win, without copying the rival's other arenas", async () => {
    const a = await fixture(), b = await fixture();
    await recordEpreuve({ ...evidence(b), opponentBrandRefId: null, opponentStrategyId: a.strategy.id });
    await recordEpreuve({ ...evidence(b), arena: "A" });
    const score = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    expect(score.epreuveCount).toBe(1); expect(score.verdict.coveragePct).toBe(20);
    expect(score.verdict.arenas.find(x => x.arena === "D")).toMatchObject({ wins: 0, losses: 1, epreuveCount: 1 });
    expect(score.verdict.arenas.find(x => x.arena === "A")).toMatchObject({ force: 0, epreuveCount: 0 });
  });

  it("does not inject the rival's duel from another stamped league into this calculation", async () => {
    const a = await fixture(), b = await fixture();
    await recordEpreuve({ ...evidence(a), opponentBrandRefId: null, opponentStrategyId: b.strategy.id });
    const before = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    await recordEpreuve({ ...evidence(b), league: { ...b.league, countryCode: "FR" } });
    expect((await scoreBrand(a.strategy.id, { nowIso, persist: false })).verdict).toEqual(before.verdict);
  });

  it("keeps the historical duel in its stamped league after the subject changes country", async () => {
    const a = await fixture(); await recordEpreuve(evidence(a));
    await db.strategy.update({ where: { id: a.strategy.id }, data: { countryCode: "FR" } });
    const score = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    expect(score.epreuveCount).toBe(0); expect(score.verdict.coveragePct).toBe(0);
    expect(await db.epreuve.count({ where: { subjectStrategyId: a.strategy.id, countryCode: "CM" } })).toBe(1);
  });
  it("requires the observed date instead of silently dating a victory at its approval", async () => {
    const f = await fixture(), c = await pending(f);
    await expect(decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor })).rejects.toThrow();
    expect(await db.epreuveCandidate.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ status: "PENDING" });
    await decideCandidate({ candidateId: c.id, decision: "APPROVE", reviewedBy: actor, occurredAt: "2026-09-15T00:00:00.000Z" });
    expect((await db.epreuve.findFirstOrThrow({ where: { subjectStrategyId: f.strategy.id } })).occurredAt.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("does not carry a won must-have item into another league while excluding its duel", async () => {
    const a = await fixture();
    let item = await db.brandRef.findUnique({ where: { slug: "item-actif-distinctif" } });
    if (!item) { item = await db.brandRef.create({ data: { slug: "item-actif-distinctif", kind: "ITEM", name: "Owned distinctive asset" } }); refs.push(item.id); }
    await recordEpreuve({ ...evidence(a), opponentBrandRefId: item.id });
    expect((await scoreBrand(a.strategy.id, { nowIso, persist: false })).verdict.gates.find(x => x.label === "Actif distinctif possédé")?.ok).toBe(true);
    await db.strategy.update({ where: { id: a.strategy.id }, data: { countryCode: "FR" } });
    const after = await scoreBrand(a.strategy.id, { nowIso, persist: false });
    expect(after.epreuveCount).toBe(0);
    expect(after.verdict.gates.find(x => x.label === "Actif distinctif possédé")?.ok).toBe(false);
  });

});
