/** Run only against a disposable database with migrations applied (local receipt cluster or CI container).
 *
 * IN1, suite de 557 (sources) — même classe dans les autres routeurs. Une lecture
 * `findUniqueOrThrow` keyée par un identifiant d'entrée répondait HTTP 500 à un
 * identifiant inconnu (P2025, message Prisma qui expose le chemin d'un fichier
 * serveur) ; placée avant la garde de marque, elle répondait 403 à l'identifiant
 * d'un autre locataire : la réponse disait si l'identifiant existait ailleurs.
 *
 * Ici, base PostgreSQL réelle, routeurs et procédures gouvernées réels, vraie route
 * HTTP `/api/trpc` : entreprise A et entreprise B. Appelé depuis B, un identifiant
 * absent de l'installation et l'identifiant d'une entité de A reçoivent exactement
 * la même réponse 404, sans écriture. Les identifiants propres à B restent servis.
 * Les refus métier des documents (557, second point) sont typés, mêmes messages.
 * Seule l'authentification est simulée (session injectée).
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
import { signalRouter } from "@/server/trpc/routers/signal";
import { campaignManagerRouter } from "@/server/trpc/routers/campaign-manager";
import { campaignRouter } from "@/server/trpc/routers/campaign";
import { consultingRouter } from "@/server/trpc/routers/consulting";
import { publicationRouter } from "@/server/trpc/routers/publication";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
import { POST } from "@/app/api/trpc/[trpc]/route";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

const ABSENT = `cmabsent${randomUUID().replace(/-/g, "")}`; // l'id d'une entité de l'autre installation
let operatorA: string, operatorB: string, userA: string, userB: string, adminId: string;
let strategyA: string, strategyB: string;
const a = {} as Record<"signal" | "campaign" | "report" | "milestone" | "reco" | "engagement" | "hypothesis" | "output" | "action" | "source", string>;
const b = {} as Record<"signal" | "campaign" | "report" | "reco" | "output" | "source", string>;

const ctx = () => ({ db, headers: undefined, session: harness.session }) as never;
const as = (id: string, role = "USER") => { harness.session = { user: { id, role }, expires: new Date(Date.now() + 60_000).toISOString() }; };

async function refusal(call: Promise<unknown>) {
  const error = await call.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(TRPCError);
  const e = error as TRPCError;
  return { code: e.code, httpStatus: getHTTPStatusCodeFromError(e), message: e.message };
}

async function http(path: string, input: unknown, method: "GET" | "POST") {
  const url = `http://localhost:3000/api/trpc/${path}`;
  const response = method === "POST"
    ? await POST(new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }) }))
    : await (await import("@/app/api/trpc/[trpc]/route")).GET(new Request(`${url}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`));
  const body = await response.json() as { error?: { json: { message: string; data: { code: string; httpStatus: number; path: string } } } };
  return { status: response.status, error: body.error?.json ? { message: body.error.json.message, code: body.error.json.data.code, path: body.error.json.data.path } : null };
}

/** Lignes de A comparées avant/après : aucun refus ne doit écrire. */
const snapshotA = async () => ({
  milestone: await db.campaignMilestone.findUnique({ where: { id: a.milestone } }),
  reco: await db.recommendation.findUnique({ where: { id: a.reco } }),
  output: await db.gloryOutput.findUnique({ where: { id: a.output } }),
  action: await db.brandAction.findUnique({ where: { id: a.action } }),
  signal: await db.signal.findUnique({ where: { id: a.signal } }),
  campaignsOfB: await db.campaign.count({ where: { strategyId: strategyB } }),
  recoB: await db.recommendation.findUnique({ where: { id: b.reco }, select: { hypothesisId: true } }),
});

beforeAll(async () => {
  // Owned disposable targets only: the local receipt cluster on 55439, or the
  // pinned container that this repository's CI job starts on 5432.
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project";
  expect(url.port).toBe(ownedCI ? "5432" : "55439");
  const license = { status: "ACTIVE" as const, licenseType: "TRIAL" as const, licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) };
  operatorA = (await db.operator.create({ data: { ...license, slug: `in1r-a-${randomUUID()}`, name: "Entreprise A — recette isolée" } })).id;
  operatorB = (await db.operator.create({ data: { ...license, slug: `in1r-b-${randomUUID()}`, name: "Entreprise B — recette isolée" } })).id;
  userA = (await db.user.create({ data: { email: `in1r-a-${randomUUID()}@example.invalid`, operatorId: operatorA } })).id;
  userB = (await db.user.create({ data: { email: `in1r-b-${randomUUID()}@example.invalid`, operatorId: operatorB } })).id;
  adminId = (await db.user.create({ data: { email: `in1r-admin-${randomUUID()}@example.invalid`, role: "ADMIN" } })).id;
  strategyA = (await db.strategy.create({ data: { name: "Marque A — fictive", userId: userA, operatorId: operatorA } })).id;
  strategyB = (await db.strategy.create({ data: { name: "Marque B — fictive", userId: userB, operatorId: operatorB } })).id;
  for (const [bag, strategyId] of [[a, strategyA], [b, strategyB]] as const) {
    bag.signal = (await db.signal.create({ data: { strategyId, type: "IN1_FIXTURE", data: { note: "fictif" } } })).id;
    bag.campaign = (await db.campaign.create({ data: { strategyId, name: "Campagne fictive" } })).id;
    bag.report = (await db.campaignReport.create({ data: { campaignId: bag.campaign, title: "Rapport fictif", reportType: "WEEKLY", data: {} } })).id;
    bag.reco = (await db.recommendation.create({ data: { strategyId, targetPillarKey: "a", targetField: "mission", agent: "HUMAN",
      source: "INTAKE", confidence: 0.5, explain: "Recommandation fictive.", impact: "LOW", missionType: "ADVE_UPDATE" } })).id;
    bag.output = (await db.gloryOutput.create({ data: { strategyId, toolSlug: "in1-fixture", output: { note: "fictif" } } })).id;
    bag.source = (await db.brandDataSource.create({ data: { strategyId, sourceType: "MANUAL_INPUT", fileName: "Brief fictif",
      rawContent: "Document fictif.", processingStatus: "EXTRACTED", certainty: "DECLARED" } })).id;
  }
  a.milestone = (await db.campaignMilestone.create({ data: { campaignId: a.campaign, title: "Jalon A", dueDate: new Date("2030-01-01") } })).id;
  a.engagement = (await db.consultingEngagement.create({ data: { strategyId: strategyA, title: "Mission de conseil A" } })).id;
  a.hypothesis = (await db.hypothesis.create({ data: { engagementId: a.engagement, statement: "Hypothèse A fictive." } })).id;
  a.action = (await db.brandAction.create({ data: { strategyId: strategyA, title: "Action A fictive" } })).id;
});

beforeEach(() => {
  as(userB);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"));
});

afterAll(async () => {
  vi.restoreAllMocks();
  const strategies = [strategyA, strategyB].filter(Boolean);
  if (strategies.length) {
    const scope = { strategyId: { in: strategies } };
    const campaigns = (await db.campaign.findMany({ where: scope, select: { id: true } })).map((c) => c.id);
    await db.campaignBrief.deleteMany({ where: { campaignId: { in: campaigns } } });
    await db.campaignMilestone.deleteMany({ where: { campaignId: { in: campaigns } } });
    await db.campaignReport.deleteMany({ where: { campaignId: { in: campaigns } } });
    await db.campaign.deleteMany({ where: { id: { in: campaigns } } });
    await db.recommendation.deleteMany({ where: scope });
    await db.hypothesis.deleteMany({ where: { engagement: scope } });
    await db.consultingEngagement.deleteMany({ where: scope });
    await db.brandAction.deleteMany({ where: scope });
    await db.gloryOutput.deleteMany({ where: scope });
    await db.signal.deleteMany({ where: scope });
    await db.brandContextNode.deleteMany({ where: scope });
    await db.brandSourceUse.deleteMany({ where: scope });
    await db.brandDataSource.deleteMany({ where: scope });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  await db.user.deleteMany({ where: { id: { in: [userA, userB, adminId].filter(Boolean) } } });
  await db.operator.deleteMany({ where: { id: { in: [operatorA, operatorB].filter(Boolean) } } });
  await db.$disconnect();
});

const signal = () => signalRouter.createCaller(ctx());
const cm = () => campaignManagerRouter.createCaller(ctx());
const consulting = () => consultingRouter.createCaller(ctx());
const publication = () => publicationRouter.createCaller(ctx());

/** Écrivains et lecteurs keyés par un identifiant d'entrée, et le message unique attendu. */
const cases: Array<[string, (id: string) => Promise<unknown>, () => string, string]> = [
  ["signal.get", (id) => signal().get({ id }), () => a.signal, "Signal introuvable."],
  ["signal.reprocess (écrivain gouverné)", (id) => signal().reprocess({ signalId: id }), () => a.signal, "Signal introuvable."],
  ["campaignManager.getReport", (id) => cm().getReport({ id }), () => a.report, "Rapport introuvable."],
  ["campaignManager.completeMilestone (écrivain gouverné)", (id) => cm().completeMilestone({ id }), () => a.milestone, "Jalon introuvable."],
  ["consulting.setRice (écrivain gouverné)", (id) => consulting().setRice({ recommendationId: id, reach: 10 }), () => a.reco, "Recommandation introuvable."],
  ["consulting.addHypothesis (écrivain gouverné)", (id) => consulting().addHypothesis({ engagementId: id, statement: "Écriture refusée." }), () => a.engagement, "Mission de conseil introuvable."],
  ["publication.get", (id) => publication().get({ id }), () => a.output, "Publication introuvable."],
  ["publication.delete (écrivain gouverné)", (id) => publication().delete({ id }), () => a.output, "Publication introuvable."],
  // L'entité keyée doit appartenir à la marque gardée : sur main, ces deux écritures
  // acceptaient l'entité d'une autre marque (IDOR) et un id inconnu donnait 500.
  ["campaignManager.createFromValidatedAction (action de A dans la marque B)",
    (id) => cm().createFromValidatedAction({ strategyId: strategyB, actionId: id }), () => a.action, "Action introuvable dans cette marque."],
  ["consulting.linkRecommendation (hypothèse de A sur une recommandation de B)",
    (id) => consulting().linkRecommendation({ recommendationId: b.reco, hypothesisId: id }), () => a.hypothesis, "Hypothèse introuvable."],
];

describe.sequential("IN1 — routeurs hors sources, sur PostgreSQL", () => {
  it.each(cases)("%s : id absent de l’installation et id de l’entreprise A → même 404, aucune écriture", async (_name, call, foreignId, message) => {
    const before = await snapshotA();
    const absent = await refusal(call(ABSENT));
    const foreign = await refusal(call(foreignId()));
    expect(absent).toEqual({ code: "NOT_FOUND", httpStatus: 404, message });
    expect(foreign).toEqual(absent);
    expect(await snapshotA()).toEqual(before);
  });

  it("les identifiants propres à B restent servis, sans changement de réponse", async () => {
    await expect(signal().get({ id: b.signal })).resolves.toMatchObject({ id: b.signal, strategyId: strategyB });
    await expect(cm().getReport({ id: b.report })).resolves.toMatchObject({ id: b.report, campaignId: b.campaign });
    await expect(publication().get({ id: b.output })).resolves.toMatchObject({ id: b.output, toolSlug: "in1-fixture" });
    await expect(consulting().setRice({ recommendationId: b.reco, reach: 100, impact: 2, confidence: 0.8, effort: 4 })).resolves.toMatchObject({ id: b.reco });
    expect(await db.recommendation.findUnique({ where: { id: b.reco }, select: { riceReach: true } })).toEqual({ riceReach: 100 });
  });

  it("ADMIN : une lecture gardée en amont répond 404 à un id inconnu, plus 500", async () => {
    as(adminId, "ADMIN");
    expect(await refusal(campaignRouter.createCaller(ctx()).get({ id: ABSENT })))
      .toEqual({ code: "NOT_FOUND", httpStatus: 404, message: "Campagne introuvable." });
    await expect(campaignRouter.createCaller(ctx()).get({ id: a.campaign })).resolves.toMatchObject({ id: a.campaign });
  });

  it("vraie route /api/trpc : 404 typé, corps identique, sans message Prisma", async () => {
    const absent = await http("signal.get", { id: ABSENT }, "GET");
    const foreign = await http("signal.get", { id: a.signal }, "GET");
    expect(absent).toEqual({ status: 404, error: { message: "Signal introuvable.", code: "NOT_FOUND", path: "signal.get" } });
    expect(foreign).toEqual(absent);
    const writerAbsent = await http("campaignManager.completeMilestone", { id: ABSENT }, "POST");
    const writerForeign = await http("campaignManager.completeMilestone", { id: a.milestone }, "POST");
    expect(writerAbsent).toEqual({ status: 404, error: { message: "Jalon introuvable.", code: "NOT_FOUND", path: "campaignManager.completeMilestone" } });
    expect(writerForeign).toEqual(writerAbsent);
    expect(JSON.stringify([absent, writerAbsent])).not.toMatch(/prisma|P2025|findUnique|invocation/i);
    harness.session = null;
    expect((await http("campaignManager.completeMilestone", { id: ABSENT }, "POST")).status).toBe(401);
  });

  it("refus métier des documents : CONFLICT et FORBIDDEN typés, mêmes messages, aucune écriture", async () => {
    const ingestion = ingestionRouter.createCaller(ctx());
    const source = await db.brandDataSource.findUniqueOrThrow({ where: { id: b.source } });
    expect(await refusal(ingestion.updateSource({ id: b.source, expectedSourceHash: "a".repeat(64), documentTags: { tags: ["Brief"], reason: "Recette" } })))
      .toEqual({ code: "CONFLICT", httpStatus: 409, message: "SOURCE_CHANGED: relisez cette édition avant de la classer." });
    expect(await refusal(ingestion.updateSource({ id: b.source, expectedSourceHash: sourceFingerprint(source), documentTags: { tags: ["Brief"], reason: "Recette" } })))
      .toEqual({ code: "CONFLICT", httpStatus: 409, message: "Classez cette édition avant de lui ajouter des étiquettes." });
    const absentTarget = await refusal(ingestion.updateSource({ id: b.source, use: { strategyId: ABSENT, revoke: false } }));
    const foreignTarget = await refusal(ingestion.updateSource({ id: b.source, use: { strategyId: strategyA, revoke: false } }));
    expect(absentTarget).toEqual({ code: "FORBIDDEN", httpStatus: 403, message: "Le partage exige deux marques du même opérateur." });
    expect(foreignTarget).toEqual(absentTarget);
    expect(await refusal(ingestion.updateSource({ id: b.source, use: { strategyId: strategyB, revoke: false } })))
      .toEqual({ code: "CONFLICT", httpStatus: 409, message: "Le document appartient déjà à cette marque." });
    expect(await db.brandDataSource.findUniqueOrThrow({ where: { id: b.source } })).toEqual(source);
    expect(await db.brandSourceUse.count({ where: { sourceId: b.source } })).toBe(0);
  });
});
