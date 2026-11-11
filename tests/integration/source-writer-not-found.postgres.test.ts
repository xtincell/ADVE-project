/** Run only against a disposable database with migrations applied (local receipt cluster or CI container).
 *
 * IN1 — recette d'installation isolée du 19 octobre (6.27.492, `foreign_id_writer_in_B`) :
 * un écrivain de source appelé avec l'id d'une source de l'autre entreprise refusait avant
 * tout effet, mais en HTTP 500 (P2025 non convertie) au lieu du 404 du lecteur. Ici, base
 * PostgreSQL réelle, routeur et procédure gouvernée réels, vraie route HTTP `/api/trpc` :
 * un id absent de l'installation et l'id d'une source d'un autre locataire reçoivent la même
 * réponse 404, sans écriture. Seule l'authentification est simulée (session injectée).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { TRPCError } from "@trpc/server";
const harness = vi.hoisted(() => ({ session: null as null | { user: { id: string; role: string }; expires: string } }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => harness.session) }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
vi.mock("@/server/services/error-vault", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/error-vault")>(),
  capture: vi.fn(async () => null),
}));
import { db } from "@/lib/db";
import { capture } from "@/server/services/error-vault";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
import { POST } from "@/app/api/trpc/[trpc]/route";

let operatorA: string, operatorB: string, userA: string, userB: string;
let strategyA: string, strategyB: string, sourceA: string, sourceB: string;
const strategies: string[] = [];
const ABSENT = `cmabsent${randomUUID().replace(/-/g, "")}`; // l'id d'une source de l'autre installation

const caller = () => ingestionRouter.createCaller({ db, headers: undefined, session: harness.session } as never);
const sourcesSnapshot = () => db.brandDataSource.findMany({ where: { id: { in: [sourceA, sourceB] } }, orderBy: { id: "asc" } });

async function refusal(call: Promise<unknown>) {
  const error = await call.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(TRPCError);
  const e = error as TRPCError;
  return { code: e.code, httpStatus: getHTTPStatusCodeFromError(e), message: e.message };
}

async function http(path: string, input: unknown) {
  const response = await POST(new Request(`http://localhost:3000/api/trpc/${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }),
  }));
  const body = await response.json() as { error?: { json: { message: string; code: number; data: { code: string; httpStatus: number; path: string } } } };
  return { status: response.status, error: body.error?.json ? {
    message: body.error.json.message, code: body.error.json.code, data: {
      code: body.error.json.data.code, httpStatus: body.error.json.data.httpStatus, path: body.error.json.data.path,
    },
  } : null };
}

beforeAll(async () => {
  // Owned disposable targets only: the local receipt cluster on 55439, or the
  // pinned container that this repository's CI job starts on 5432.
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project";
  expect(url.port).toBe(ownedCI ? "5432" : "55439");
  const license = { status: "ACTIVE" as const, licenseType: "TRIAL" as const, licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) };
  operatorA = (await db.operator.create({ data: { ...license, slug: `in1-a-${randomUUID()}`, name: "Entreprise A — recette isolée" } })).id;
  operatorB = (await db.operator.create({ data: { ...license, slug: `in1-b-${randomUUID()}`, name: "Entreprise B — recette isolée" } })).id;
  userA = (await db.user.create({ data: { email: `in1-a-${randomUUID()}@example.invalid`, operatorId: operatorA } })).id;
  userB = (await db.user.create({ data: { email: `in1-b-${randomUUID()}@example.invalid`, operatorId: operatorB } })).id;
  strategyA = (await db.strategy.create({ data: { name: "Marque A — fictive", userId: userA, operatorId: operatorA } })).id;
  strategyB = (await db.strategy.create({ data: { name: "Marque B — fictive", userId: userB, operatorId: operatorB } })).id;
  strategies.push(strategyA, strategyB);
  sourceA = (await db.brandDataSource.create({ data: { strategyId: strategyA, sourceType: "MANUAL_INPUT", fileName: "Brief A",
    rawContent: "Document fictif de l’entreprise A.", processingStatus: "EXTRACTED", certainty: "DECLARED" } })).id;
  sourceB = (await db.brandDataSource.create({ data: { strategyId: strategyB, sourceType: "MANUAL_INPUT", fileName: "Brief B",
    rawContent: "Document fictif de l’entreprise B.", processingStatus: "EXTRACTED", certainty: "DECLARED" } })).id;
});

beforeEach(() => {
  harness.session = { user: { id: userB, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString() };
  vi.mocked(capture).mockClear();
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"));
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (strategies.length) {
    const scope = { strategyId: { in: strategies } };
    await db.brandContextNode.deleteMany({ where: scope });
    await db.brandSourceUse.deleteMany({ where: scope });
    await db.brandDataSource.deleteMany({ where: scope });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  await db.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  await db.operator.deleteMany({ where: { id: { in: [operatorA, operatorB].filter(Boolean) } } });
  await db.$disconnect();
});

const writers = {
  "updateSource (contenu)": (id: string) => caller().updateSource({ id, content: "Écriture refusée" }),
  "updateSource (étiquettes)": (id: string) => caller().updateSource({ id, expectedSourceHash: "a".repeat(64), documentTags: { tags: ["Brief"], reason: "Recette" } }),
  "updateSource (usage)": (id: string) => caller().updateSource({ id, use: { strategyId: strategyB, revoke: false } }),
  "deleteSource": (id: string) => caller().deleteSource({ id }),
  "uploadFile (reprise d’une source)": (id: string) => caller().uploadFile({ strategyId: strategyB, sourceId: id, fileName: "brief.txt", fileType: "TXT", content: "dGVzdA==" }),
  "sourceUses": (id: string) => caller().sourceUses({ id }),
  "previewBrandBook": (id: string) => caller().previewBrandBook({ strategyId: strategyB, sourceId: id, mode: "STRUCTURED" }),
};

describe.sequential("IN1 — source writers on PostgreSQL", () => {
  it.each(Object.entries(writers))("%s : id de l’autre installation et source d’un autre locataire → même 404, aucune écriture", async (_name, call) => {
    const before = await sourcesSnapshot();
    const absent = await refusal(call(ABSENT));
    const foreign = await refusal(call(sourceA));
    expect(absent).toEqual({ code: "NOT_FOUND", httpStatus: 404, message: "Ce document n’est plus accessible dans ce dossier." });
    expect(foreign).toEqual(absent);
    expect(await sourcesSnapshot()).toEqual(before);
    expect(await db.brandSourceUse.count({ where: { sourceId: { in: [sourceA, sourceB] } } })).toBe(0);
  });

  it("le refus de l’écrivain gouverné est journalisé FAILED, à l’identique pour les deux ids", async () => {
    const mark = new Date();
    await refusal(caller().updateSource({ id: ABSENT, content: "Écriture refusée" }));
    await refusal(caller().updateSource({ id: sourceA, content: "Écriture refusée" }));
    const emissions = await db.intentEmission.findMany({
      where: { intentKind: "LEGACY_INGESTION_UPDATE_SOURCE", emittedAt: { gte: mark }, OR: [
        { payload: { path: ["id"], equals: ABSENT } }, { payload: { path: ["id"], equals: sourceA } },
      ] },
      select: { status: true },
    });
    expect(emissions.map((e) => e.status)).toEqual(["FAILED", "FAILED"]);
  });

  it("vraie route /api/trpc : 404 typé, corps identique, classé NOT_FOUND et non erreur serveur", async () => {
    const absent = await http("ingestion.updateSource", { id: ABSENT, content: "Écriture refusée" });
    const foreign = await http("ingestion.updateSource", { id: sourceA, content: "Écriture refusée" });
    expect(absent).toEqual({ status: 404, error: { message: "Ce document n’est plus accessible dans ce dossier.", code: -32004,
      data: { code: "NOT_FOUND", httpStatus: 404, path: "ingestion.updateSource" } } });
    expect(foreign).toEqual(absent);
    expect(await http("ingestion.deleteSource", { id: ABSENT })).toMatchObject({ status: 404, error: { data: { code: "NOT_FOUND" } } });
    await vi.dynamicImportSettled(); // the formatter's error-vault capture is a deferred import
    expect(vi.mocked(capture).mock.calls.map(([input]) => [input.code, input.severity])).toEqual(
      Array.from({ length: 3 }, () => ["NOT_FOUND", "WARN"]));
    harness.session = null;
    expect((await http("ingestion.updateSource", { id: ABSENT, content: "Écriture refusée" })).status).toBe(401);
  });

  it("un dossier cible inconnu reçoit la réponse d’un dossier hors portefeuille, jamais P2025", async () => {
    const absentTarget = await refusal(caller().updateSource({ id: sourceB, use: { strategyId: ABSENT, revoke: false } }));
    const foreignTarget = await refusal(caller().updateSource({ id: sourceB, use: { strategyId: strategyA, revoke: false } }));
    expect(absentTarget).toEqual(foreignTarget);
    expect(absentTarget.message).toBe("Le partage exige deux marques du même opérateur.");
    await expect(caller().updateSource({ id: sourceB, use: { strategyId: ABSENT, revoke: true } })).resolves.toEqual({ linked: false });
    await expect(caller().updateSource({ id: sourceB, use: { strategyId: strategyA, revoke: true } })).resolves.toEqual({ linked: false });
    expect(await db.brandSourceUse.count({ where: { sourceId: sourceB } })).toBe(0);
  });

  it("la source propre reste écrite par le même écrivain", async () => {
    const updated = await caller().updateSource({ id: sourceB, content: "Texte corrigé de l’entreprise B." });
    expect(updated).toMatchObject({ id: sourceB, rawContent: "Texte corrigé de l’entreprise B.", processingStatus: "EXTRACTED" });
    expect((await db.brandDataSource.findUniqueOrThrow({ where: { id: sourceA } })).rawContent).toBe("Document fictif de l’entreprise A.");
  });
});
