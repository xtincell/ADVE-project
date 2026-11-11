import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { Prisma } from "@prisma/client";

/**
 * IN1 — recette d'installation isolée du 19 octobre (6.27.492, cas
 * `foreign_id_writer_in_B`) : un écrivain de source appelé avec l'identifiant
 * d'une source de l'autre entreprise refusait bien avant tout effet, mais en
 * HTTP 500 (erreur Prisma P2025 non convertie). Le lecteur répondait déjà 404.
 *
 * Contrat : un identifiant inconnu et l'identifiant d'une source d'un autre
 * locataire reçoivent exactement la même réponse NOT_FOUND / 404, avant toute
 * écriture. Les autres erreurs (base, Prisma ≠ introuvable) ne deviennent pas 404.
 */
const h = vi.hoisted(() => ({
  rows: new Map<string, { id: string; strategyId: string; rawData?: unknown }>(),
  db: {
    brandDataSource: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    strategy: { findUnique: vi.fn(async () => null) },
    fileUpload: { findUnique: vi.fn(async () => null) },
    brandContextNode: { deleteMany: vi.fn() },
    brandSourceUse: { updateMany: vi.fn() },
    brandAsset: { findMany: vi.fn(async () => []), updateMany: vi.fn() },
    recommendation: { findMany: vi.fn(async () => []) },
    pillar: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(), $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  assertRead: vi.fn(),
  ingestFile: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: h.assertRead }));
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context<any>().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure, adminProcedure: t.procedure, operatorProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: any) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/trpc/middleware/strategy-scope", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { strategyScopedProcedure: protectedProcedure };
});
vi.mock("@/server/services/ingestion-pipeline", () => ({ ingestFile: h.ingestFile }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: h.emit }));
vi.mock("@/server/services/operator-isolation", () => ({
  getOperatorContext: vi.fn(async () => ({ userId: "operator-b", operatorId: "team-b", role: "USER" })),
  canAccessStrategy: vi.fn(async () => true),
}));

import { ingestionRouter } from "@/server/trpc/routers/ingestion";

const caller = () => ingestionRouter.createCaller({ db: h.db, session: { user: { id: "operator-b" } } } as any);
const OWN = "source-own", FOREIGN = "source-of-company-a", UNKNOWN = "source-from-other-installation";

function p2025() {
  return new Prisma.PrismaClientKnownRequestError("No record was found for a query.", { code: "P2025", clientVersion: "test" });
}

/** The full client-visible refusal: tRPC code, HTTP status and message. */
async function refusal(call: Promise<unknown>) {
  const error = await call.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(TRPCError);
  const e = error as TRPCError;
  return { code: e.code, httpStatus: getHTTPStatusCodeFromError(e), message: e.message };
}

function expectNoEffect() {
  expect(h.db.$transaction).not.toHaveBeenCalled();
  expect(h.db.brandDataSource.update).not.toHaveBeenCalled();
  expect(h.db.brandDataSource.delete).not.toHaveBeenCalled();
  expect(h.db.brandContextNode.deleteMany).not.toHaveBeenCalled();
  expect(h.ingestFile).not.toHaveBeenCalled();
  expect(h.emit).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rows = new Map([[OWN, { id: OWN, strategyId: "brand-b" }], [FOREIGN, { id: FOREIGN, strategyId: "brand-a" }]]);
  // Prisma semantics: findUnique → null, findUniqueOrThrow → P2025 on an absent row.
  h.db.brandDataSource.findUnique.mockImplementation(async ({ where }: any) => h.rows.get(where.id) ?? null);
  h.db.brandDataSource.findUniqueOrThrow.mockImplementation(async ({ where }: any) => {
    const row = h.rows.get(where.id);
    if (!row) throw p2025();
    return row;
  });
  // Scoped reads (AND [id, dossier]) find nothing outside the caller's dossier;
  // an unscoped read by id finds the row wherever it lives.
  h.db.brandDataSource.findFirst.mockImplementation(async ({ where }: any) => (where.id ? h.rows.get(where.id) ?? null : null));
  h.db.strategy.findUnique.mockResolvedValue(null);
  h.db.$transaction.mockImplementation(async (operations: any) => typeof operations === "function" ? operations(h.db) : Promise.all(operations));
  h.assertRead.mockImplementation(async (_userId: string, strategyId: string) => {
    if (strategyId !== "brand-b") throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" });
  });
});

const writers = {
  "updateSource (contenu)": (id: string) => caller().updateSource({ id, content: "Écriture refusée" }),
  "updateSource (étiquettes)": (id: string) => caller().updateSource({ id, expectedSourceHash: "a".repeat(64), documentTags: { tags: ["Brief"], reason: "Recette" } }),
  "updateSource (usage)": (id: string) => caller().updateSource({ id, use: { strategyId: "brand-b", revoke: false } }),
  "deleteSource": (id: string) => caller().deleteSource({ id }),
  "uploadFile (reprise d’une source)": (id: string) => caller().uploadFile({ strategyId: "brand-b", sourceId: id, fileName: "brief.txt", fileType: "TXT", content: "dGVzdA==" }),
  "sourceUses": (id: string) => caller().sourceUses({ id }),
};

describe("source writers refuse an unknown or foreign source id with one typed 404", () => {
  it.each(Object.entries(writers))("%s : id absent de cette installation → NOT_FOUND 404 avant tout effet", async (_name, call) => {
    const unknown = await refusal(call(UNKNOWN));
    expect(unknown).toMatchObject({ code: "NOT_FOUND", httpStatus: 404 });
    expect(unknown.message).not.toMatch(/prisma|P2025|findUnique|invocation/i);
    expectNoEffect();
  });

  it.each(Object.entries(writers))("%s : source d’un autre locataire → exactement la réponse d’un id inconnu", async (_name, call) => {
    const unknown = await refusal(call(UNKNOWN));
    vi.clearAllMocks();
    const foreign = await refusal(call(FOREIGN));
    expect(foreign).toEqual(unknown);
    expect(h.assertRead).toHaveBeenCalledWith("operator-b", "brand-a");
    expectNoEffect();
  });

  it("previewBrandBook : une source hors du dossier reçoit le même 404 qu’une source inconnue", async () => {
    const preview = (sourceId: string) => caller().previewBrandBook({ strategyId: "brand-b", sourceId, mode: "STRUCTURED" });
    const unknown = await refusal(preview(UNKNOWN));
    const foreign = await refusal(preview(FOREIGN));
    expect(unknown).toMatchObject({ code: "NOT_FOUND", httpStatus: 404 });
    expect(foreign).toEqual(unknown);
    expect(h.emit).not.toHaveBeenCalled();
  });

  it("une panne de lecture ou une autre erreur Prisma ne devient jamais un 404", async () => {
    h.db.brandDataSource.findUnique.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Can't reach database server", { code: "P1001", clientVersion: "test" }));
    expect(await refusal(caller().updateSource({ id: OWN, content: "Texte" }))).toMatchObject({ code: "INTERNAL_SERVER_ERROR", httpStatus: 500 });
    h.assertRead.mockRejectedValueOnce(new TRPCError({ code: "UNAUTHORIZED" }));
    expect(await refusal(caller().updateSource({ id: OWN, content: "Texte" }))).toMatchObject({ code: "UNAUTHORIZED", httpStatus: 401 });
    h.db.brandDataSource.update.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }));
    expect(await refusal(caller().updateSource({ id: OWN, content: "Texte" }))).toMatchObject({ code: "INTERNAL_SERVER_ERROR", httpStatus: 500 });
  });

  it("la source accessible reste écrite normalement", async () => {
    h.db.brandDataSource.update.mockImplementation(async ({ data }: any) => ({ id: OWN, ...data }));
    await expect(caller().updateSource({ id: OWN, content: "Texte corrigé" })).resolves.toMatchObject({ id: OWN, rawContent: "Texte corrigé" });
    expect(h.assertRead).toHaveBeenCalledWith("operator-b", "brand-b");
  });
});

describe("le lecteur getSource ne distingue pas un id inconnu d'un id étranger", () => {
  it("sans dossier précisé : même refus pour l'id inconnu et la source d'un autre locataire", async () => {
    const unknown = await refusal(caller().getSource({ id: UNKNOWN }));
    const foreign = await refusal(caller().getSource({ id: FOREIGN }));
    // Contrat existant du lecteur conservé (403, retrait d'un partage compris) ;
    // seul l'indice d'existence porté par le message disparaît.
    expect(unknown).toMatchObject({ code: "FORBIDDEN", httpStatus: 403 });
    expect(foreign).toEqual(unknown);
    expect(h.assertRead).toHaveBeenCalledWith("operator-b", "brand-a");
  });

  it("la source accessible reste lue", async () => {
    await expect(caller().getSource({ id: OWN })).resolves.toMatchObject({ id: OWN });
  });
});
