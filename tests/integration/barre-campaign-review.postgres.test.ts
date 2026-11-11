/**
 * LB4 — un bilan de campagne arrêté dans La Barre est reçu dans les sources de
 * la marque, sur PostgreSQL réel : route `/la-barre/bilan`, spine d'émission,
 * handler et lignée documentaire. La base La Barre est simulée par un serveur
 * HTTP fictif (fetch), avec le jeu commun aux deux dépôts.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { POST } from "@/app/la-barre/[[...path]]/route";
import { ingestBarreCampaignReview } from "@/server/services/ingestion-pipeline/barre-review";
import { barreCampaignReviewDigest } from "@/domain/barre-campaign-review";
import { documentEdition } from "@/domain/source-document";

type Review = Record<string, unknown> & { id: string; version: number; empreinte: string; contenu: string };
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "../fixtures/la-barre/bilan-campagne-v1.json"), "utf8")) as { versions: Review[] };
const [V1, V2] = FIXTURE.versions as [Review, Review];
// LB3 (ADR-0245) : la même version 1, attestée par La Fusée à son enregistrement.
const SHARED = JSON.parse(readFileSync(join(__dirname, "../fixtures/la-barre/bilan-campagne-atteste-v1.json"), "utf8")) as {
  cleDeRecette: string; instance: string; version: Review & { attestation: Record<string, unknown> } };
const V1A = SHARED.version;
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const reseal = (v: Review): Review => { const r = copy(v); r.empreinte = barreCampaignReviewDigest(r); return r; };
const ORIGIN = "https://workspace.example";
const FAMILY = "Bilan de campagne — Marque de recette — Noël 2026";

let operatorId: string, foreignOperatorId: string, userId: string, foreignUserId: string, brand: string;
const strategies: string[] = [], nodes: string[] = [], operators: string[] = [], users: string[] = [];
let barreBase: unknown = {};

async function strategy(name: string, extra: Record<string, unknown> = {}) {
  const s = await db.strategy.create({ data: { name: `${name} ${randomUUID()}`, userId, operatorId, ...extra } });
  strategies.push(s.id);
  return s.id;
}
const intent = (strategyId: string, review: Review, operator = userId) => ({ kind: "INGEST_BARRE_CAMPAIGN_REVIEW" as const,
  strategyId, operatorId: operator, instance: "barre-matanga", sourceRevision: null,
  review: review as never, unlinkedBrands: [] });
const ask = (v: Review) => ({ campagneId: "CMP-recette-noel", bilanId: v.id, version: v.version, empreinte: v.empreinte });
const post = (body: unknown) => POST(new Request(`${ORIGIN}/la-barre/bilan`, { method: "POST", body: JSON.stringify(body),
  headers: { origin: ORIGIN, "content-type": "application/json" } }), { params: Promise.resolve({ path: ["bilan"] }) });
const barre = (...versions: Review[]) => ({ campagnes: [{ id: "CMP-recette-noel", nom: "Marque de recette — Noël 2026",
  marqueIds: ["MQ-recette"], bilanVersions: versions }], projets: [], clients: [], sku: [], assets: [],
  marques: [{ id: "MQ-recette", nom: "Marque de recette" }] });
const sources = (strategyId: string) => db.brandDataSource.findMany({ where: { strategyId }, orderBy: { createdAt: "asc" } });

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  expect(url.port).toBe(process.env.GITHUB_ACTIONS === "true" ? "5432" : "55439");
  const key = randomUUID();
  const license = { status: "ACTIVE" as const, licenseType: "TRIAL" as const, licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) };
  operatorId = (await db.operator.create({ data: { name: "Bilan La Barre", slug: `bilan-barre-${key}`, ...license } })).id;
  foreignOperatorId = (await db.operator.create({ data: { name: "Autre agence", slug: `bilan-autre-${key}`, ...license } })).id;
  operators.push(operatorId, foreignOperatorId);
  userId = (await db.user.create({ data: { email: `bilan-barre-${key}@example.invalid`, role: "OPERATOR", operatorId } })).id;
  foreignUserId = (await db.user.create({ data: { email: `bilan-autre-${key}@example.invalid`, role: "OPERATOR", operatorId: foreignOperatorId } })).id;
  users.push(userId, foreignUserId);
  brand = await strategy("Marque de recette");
  nodes.push((await db.brandNode.create({ data: { name: "Marque de recette", slug: `marque-recette-${key}`, operatorId, nodeKind: "STANDALONE_BRAND",
    strategyId: brand, sourceRefs: [{ system: "LA_BARRE", kind: "brand", id: "MQ-recette" }] } })).id);
});
afterAll(async () => {
  const where = { strategyId: { in: strategies } };
  await db.brandContextNode.deleteMany({ where });
  await db.brandDataSource.deleteMany({ where });
  await db.intentEmission.deleteMany({ where });
  await db.costDecision.deleteMany({ where });
  await db.brandNode.deleteMany({ where: { id: { in: nodes } } });
  await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } });
  await db.$disconnect();
});
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("PORTFOLIO_BARRE_OPERATOR_IDS", `${operatorId},${foreignOperatorId}`);
  vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://barre.test:3000");
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.stubEnv("AUTH_SECRET", SHARED.cleDeRecette);
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  // La base enregistrée de La Barre, servie avec une révision qui suit son contenu.
  vi.stubGlobal("fetch", vi.fn(async (_url: URL, options?: RequestInit) => {
    const text = JSON.stringify(barreBase);
    const etag = `"${createHash("sha256").update(text).digest("hex").slice(0, 16)}"`;
    return new Response(options?.method === "HEAD" ? null : text, { headers: { ETag: etag, "Content-Type": "application/json" } });
  }));
});

describe.sequential("bilan de campagne La Barre reçu dans les sources de la marque", () => {
  it("relit la version 1 dans la base enregistrée et la range comme proposition, sans pilier ni analyse", async () => {
    barreBase = barre(V1);
    const pillarsBefore = await db.pillar.count({ where: { strategyId: brand } });
    const response = await post(ask(V1));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ edition: 1, version: 1, alreadyReceived: false, family: FAMILY, strategyId: brand,
      url: `/cockpit/brand/sources?strategy=${brand}` });
    const [source, ...others] = await sources(brand);
    expect(others).toHaveLength(0);
    expect(source).toMatchObject({ id: body.sourceId, origin: "barre:barre-matanga:bilan:BIL-CMP-recette-noel:v1", sourceType: "MANUAL_INPUT",
      fileType: "TXT", certainty: "DECLARED", processingStatus: "EXTRACTED", rawContent: V1.contenu });
    expect(documentEdition(source!.rawData)).toMatchObject({ family: FAMILY, kind: "CAMPAIGN_REVIEW", status: "PROPOSED", edition: 1,
      changeSummary: "Version 1 arrêtée dans La Barre le 2026-11-11.",
      sourceRevision: `la-barre:barre-matanga:BIL-CMP-recette-noel:v1:${V1.empreinte}` });
    const receipt = (source!.rawData as { _barreReview: Record<string, unknown> })._barreReview;
    expect(receipt).toMatchObject({ schema: "barre-campaign-review-receipt-v1", instance: "barre-matanga", receivedBy: userId, unlinkedBrands: [] });
    expect(receipt.review).toEqual(V1);
    expect(receipt.sourceRevision).toMatch(/^"[a-f0-9]{16}"$/);
    const emissions = await db.intentEmission.findMany({ where: { strategyId: brand, intentKind: "INGEST_BARRE_CAMPAIGN_REVIEW" } });
    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toMatchObject({ status: "OK", caller: "la-barre:bilan", governor: "MESTOR" });
    expect(emissions[0]!.selfHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await db.pillar.count({ where: { strategyId: brand } })).toBe(pillarsBefore);
    expect(await db.brandContextNode.count({ where: { strategyId: brand } })).toBe(0);
  });

  it("un rejeu rend le même reçu sans seconde source", async () => {
    const response = await post(ask(V1));
    expect(response.status).toBe(200);
    const body = await response.json();
    const [source] = await sources(brand);
    expect(body).toMatchObject({ sourceId: source!.id, edition: 1, alreadyReceived: true });
    expect(await sources(brand)).toHaveLength(1);
  });

  it("la version 2 prolonge la lignée ; la version 1 reste conservée, proposition comprise", async () => {
    barreBase = barre(V1, V2);
    const response = await post(ask(V2));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ edition: 2, version: 2, alreadyReceived: false });
    const [one, two] = await sources(brand);
    expect(documentEdition(two!.rawData)).toMatchObject({ edition: 2, previousSourceId: one!.id, status: "PROPOSED",
      changeSummary: "Deuxième lecture de recette." });
    expect(two!.rawContent).toBe(V2.contenu);
    expect(documentEdition(one!.rawData)).toMatchObject({ edition: 1, status: "PROPOSED" });
    expect(one!.rawContent).toBe(V1.contenu);
    expect((await (await post(ask(V1))).json())).toMatchObject({ sourceId: one!.id, alreadyReceived: true });
  });

  it("refuse une version réécrite après son arrêt, et une autre empreinte sous un numéro reçu", async () => {
    barreBase = barre(V1, { ...copy(V2), contenu: "Réécrit après l’arrêt." } as Review);
    const tampered = await post(ask(V2));
    expect(tampered.status).toBe(422);
    expect(await tampered.json()).toMatchObject({ code: "REVIEW_DIGEST_INVALID" });
    const autre = reseal({ ...copy(V2), contenu: "Autre texte pour la même version." });
    expect(await ingestBarreCampaignReview(intent(brand, autre))).toMatchObject({ status: "VETOED", reason: "REVIEW_VERSION_CONFLICT" });
    expect(await sources(brand)).toHaveLength(2);
  });

  it("refuse une version antérieure à la dernière reçue, et une chaîne d’empreintes rompue", async () => {
    const gap = await strategy("Lignée lacunaire");
    expect(await ingestBarreCampaignReview(intent(gap, V2))).toMatchObject({ status: "OK", output: { edition: 1, version: 2 } });
    expect(await ingestBarreCampaignReview(intent(gap, V1))).toMatchObject({ status: "VETOED", reason: "REVIEW_VERSION_STALE" });
    const chain = await strategy("Chaîne rompue");
    expect((await ingestBarreCampaignReview(intent(chain, V1))).status).toBe("OK");
    const rompue = reseal({ ...copy(V2), precedente: "a".repeat(64) });
    expect(await ingestBarreCampaignReview(intent(chain, rompue))).toMatchObject({ status: "VETOED", reason: "REVIEW_CHAIN_MISMATCH" });
    expect(await sources(gap)).toHaveLength(1); expect(await sources(chain)).toHaveLength(1);
  });

  it("ne rejoint jamais en silence une lignée homonyme d’une autre provenance", async () => {
    const homonyme = await strategy("Lignée homonyme");
    const manual = await db.brandDataSource.create({ data: { strategyId: homonyme, sourceType: "MANUAL_INPUT", fileName: "Note",
      rawContent: "Bilan saisi à la main, sans lien avec La Barre.", processingStatus: "EXTRACTED",
      rawData: { _document: { schema: "document-edition-v1", family: FAMILY, kind: "OTHER", label: "Note", status: "PROPOSED",
        changeSummary: "Saisie de recette.", edition: 1, recordedAt: "2026-11-10T08:00:00.000Z" } } } });
    const result = await ingestBarreCampaignReview(intent(homonyme, V1));
    expect(result).toMatchObject({ status: "OK", output: { family: `${FAMILY} · CMP-recette-noel`, edition: 1 } });
    expect(await db.brandDataSource.findUniqueOrThrow({ where: { id: manual.id } })).toEqual(manual);
  });

  it("sérialise des transmissions simultanées : une seule source, les autres retrouvent le reçu", async () => {
    const concurrent = await strategy("Transmissions simultanées");
    const results = await Promise.all(Array.from({ length: 5 }, () => ingestBarreCampaignReview(intent(concurrent, V1))));
    expect(results.every((r) => r.status === "OK")).toBe(true);
    expect(results.filter((r) => !(r.output as { alreadyReceived: boolean }).alreadyReceived)).toHaveLength(1);
    expect(new Set(results.map((r) => (r.output as { sourceId: string }).sourceId)).size).toBe(1);
    expect(await sources(concurrent)).toHaveLength(1);
  });

  it("une version attestée est rangée avec son attestation ; une attestation forgée est refusée sans effet", async () => {
    expect(SHARED.instance).toBe("barre-matanga");
    // La version 1 déjà reçue sans attestation reste le reçu de cette version.
    barreBase = barre(V1A, V2);
    const replay = await post(ask(V1A));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ edition: 1, alreadyReceived: true });
    const forged = { ...copy(V1A), attestation: { ...V1A.attestation, userId: "quelqu-un-d-autre" } } as Review;
    barreBase = barre(forged, V2);
    const refused = await post(ask(forged));
    expect(refused.status).toBe(422);
    expect(await refused.json()).toMatchObject({ code: "REVIEW_ATTESTATION_INVALID" });
    const fresh = await strategy("Bilan attesté");
    expect(await ingestBarreCampaignReview(intent(fresh, forged))).toMatchObject({ status: "VETOED", reason: "REVIEW_ATTESTATION_INVALID" });
    expect(await sources(fresh)).toHaveLength(0);
    expect(await ingestBarreCampaignReview(intent(fresh, V1A))).toMatchObject({ status: "OK", output: { edition: 1, version: 1 } });
    const [source] = await sources(fresh);
    const receipt = (source!.rawData as { _barreReview: { review: Record<string, unknown>; receivedBy: string } })._barreReview;
    expect(receipt.review.attestation).toEqual(V1A.attestation);
    expect(receipt.receivedBy).toBe(userId);
    // Une clé changée ne vérifie plus aucune attestation : refus, jamais acceptation par défaut.
    vi.stubEnv("AUTH_SECRET", "une-autre-cle-de-session-longue");
    const other = await strategy("Autre clé");
    expect(await ingestBarreCampaignReview(intent(other, V1A))).toMatchObject({ status: "VETOED", reason: "REVIEW_ATTESTATION_INVALID" });
  });

  it("une autre agence ne résout pas la marque, et ne peut rien écrire dans ce dossier", async () => {
    mocks.auth.mockResolvedValue({ user: { id: foreignUserId } });
    barreBase = barre(V1);
    const response = await post(ask(V1));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "BRAND_NOT_LINKED" });
    const isolated = await strategy("Dossier isolé");
    expect(await ingestBarreCampaignReview(intent(isolated, V1, foreignUserId))).toMatchObject({ status: "VETOED", reason: "ACCESS_DENIED" });
    const archived = await strategy("Dossier archivé", { archivedAt: new Date() });
    expect(await ingestBarreCampaignReview(intent(archived, V1))).toMatchObject({ status: "VETOED", reason: "STRATEGY_UNAVAILABLE" });
    expect(await sources(isolated)).toHaveLength(0); expect(await sources(archived)).toHaveLength(0);
  });
});
