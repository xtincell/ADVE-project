import { initTRPC } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/trpc/context";

const harness = vi.hoisted(() => ({ fill: vi.fn() }));
const t = initTRPC.context<any>().create();
vi.mock("@/server/trpc/init", () => ({
  createTRPCRouter: t.router, protectedProcedure: t.procedure,
  adminProcedure: t.procedure, operatorProcedure: t.procedure,
}));
vi.mock("@/server/trpc/middleware/strategy-scope", () => ({ strategyScopedProcedure: t.procedure }));
// Exercise the handler and the real canonical source scope/edition policies;
// authorization middleware is covered by the governance suite separately.
vi.mock("@/server/governance/governed-procedure", () => ({
  governedProcedure: (opts: any) => t.procedure.input(opts.inputSchema),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/ingestion-pipeline", () => ({}));
vi.mock("@/server/services/ingestion-pipeline/ai-filler", () => ({ fillPillar: harness.fill }));

type Row = Record<string, any>;
// Small in-memory adapter for the Prisma predicates issued by the real reader.
// No access policy is duplicated here: the reader supplies every predicate.
function matches(value: any, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "AND") return expected.every((part: Row) => matches(value, part));
    if (key === "OR") return expected.some((part: Row) => matches(value, part));
    if (key === "in") return expected.includes(value);
    if (key === "some") return Array.isArray(value) && value.some((item) => matches(item, expected));
    return expected && typeof expected === "object"
      ? matches(value?.[key], expected)
      : value?.[key] === expected;
  });
}

function source(id: string, strategyId: string, options: Row = {}): Row {
  return {
    id, strategyId, strategy: { operatorId: "operator-a" }, uses: [],
    processingStatus: "EXTRACTED", rawContent: `Source ${id}`, rawData: {},
    pillarMapping: null, certainty: "DECLARED", sourceType: "MANUAL_INPUT",
    ...options,
  };
}
function use(strategyId: string, options: Row = {}): Row {
  return {
    strategyId, operatorId: "operator-a", revokedAt: null,
    strategy: { operatorId: "operator-a" }, analysisStatus: "EXTRACTED",
    pillarMapping: null, analyzedSourceHash: null, ...options,
  };
}
function edition(status: string) {
  return { _document: {
    schema: "document-edition-v1", family: "Brief", kind: "STRATEGY", label: "v1",
    status, changeSummary: "Source de travail", edition: 1, recordedAt: "2026-11-05T10:00:00.000Z",
  } };
}

async function reprocess(rows: Row[], strategyId = "peak", operatorId: string | null = "operator-a") {
  const findMany = vi.fn(async ({ where, include }: Row) => rows.filter(row => matches(row, where)).map(row => ({
    ...row, uses: include?.uses ? row.uses.filter((grant: Row) => matches(grant, include.uses.where)) : row.uses,
  })));
  const { ingestionRouter } = await import("@/server/trpc/routers/ingestion");
  const caller = ingestionRouter.createCaller({
    session: { user: { id: "operator-a", role: "ADMIN" }, expires: "2026-11-06T00:00:00Z" },
    db: { brandDataSource: { findMany }, strategy: { findUnique: vi.fn(async () => ({ operatorId })) } } as unknown as Context["db"],
    headers: undefined,
  });
  return caller.reprocessPillar({ strategyId, pillarKey: "A" });
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.fill.mockResolvedValue({ filled: true });
});

describe("reprocess pillar with canonical shared documents", () => {
  it("includes an explicitly shared brief as well as the recipient's own sources", async () => {
    expect(await reprocess([
      source("peak-own", "peak"),
      source("noel-brief", "bonnet-rouge", { uses: [use("peak")] }),
    ])).toEqual({ filled: true });
    expect(harness.fill).toHaveBeenCalledExactlyOnceWith("peak", "A", ["peak-own", "noel-brief"]);
  });

  it("excludes unshared, revoked, foreign and transferred grants without losing the valid one", async () => {
    await reprocess([
      source("valid", "bonnet-rouge", { uses: [use("peak")] }),
      source("unshared", "bonnet-rouge"),
      source("other-recipient", "bonnet-rouge", { uses: [use("belle-hollandaise")] }),
      source("revoked", "bonnet-rouge", { uses: [use("peak", { revokedAt: new Date() })] }),
      source("foreign-owner", "foreign", { strategy: { operatorId: "operator-b" }, uses: [use("peak")] }),
      source("foreign-grant", "bonnet-rouge", { uses: [use("peak", { operatorId: "operator-b" })] }),
      source("transferred-recipient", "bonnet-rouge", { uses: [use("peak", { strategy: { operatorId: "operator-b" } })] }),
    ]);
    expect(harness.fill).toHaveBeenCalledExactlyOnceWith("peak", "A", ["valid"]);
  });

  it("uses readable current or proposed editions, excluding historical, failed and duplicate formats", async () => {
    const grant = [use("peak")];
    await reprocess([
      source("own-reference", "peak", { rawData: edition("REFERENCE") }),
      source("own-archive", "peak", { rawData: edition("ARCHIVED") }),
      source("shared-proposal", "bonnet-rouge", { rawData: edition("PROPOSED"), uses: grant }),
      source("shared-history", "bonnet-rouge", { rawData: edition("SUPERSEDED"), uses: grant }),
      source("pending", "peak", { processingStatus: "PENDING" }),
      source("failed", "bonnet-rouge", { processingStatus: "FAILED", uses: grant }),
      source("representation", "peak", { rawData: { _documentRepresentation: {} } }),
      source("malformed-edition", "peak", { rawData: { _document: {} } }),
    ]);
    expect(harness.fill).toHaveBeenCalledExactlyOnceWith("peak", "A", ["own-reference", "shared-proposal"]);
  });

  it("does not infer reciprocal sharing or global access without an operator", async () => {
    const rows = [source("peak-own", "peak"), source("noel-brief", "bonnet-rouge", { uses: [use("peak")] })];
    await reprocess(rows, "bonnet-rouge");
    expect(harness.fill).toHaveBeenLastCalledWith("bonnet-rouge", "A", ["noel-brief"]);
    await reprocess(rows, "peak", null);
    expect(harness.fill).toHaveBeenLastCalledWith("peak", "A", ["peak-own"]);
  });
});
