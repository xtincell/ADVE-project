/**
 * LB4 — réception d'un bilan de campagne arrêté dans La Barre.
 * Jeu commun aux deux dépôts : tests/fixtures/la-barre/bilan-campagne-v1.json.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), actor: vi.fn(), snapshot: vi.fn(), resolve: vi.fn(), emit: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: mocks.actor, canAccessStrategy: vi.fn() }));
vi.mock("@/server/services/brand-node/workspace", () => ({ readBarreSnapshot: mocks.snapshot }));
vi.mock("@/server/services/brand-node/barre-context", () => ({ getBarreBrandContext: vi.fn(), resolveBarreBrands: mocks.resolve }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: mocks.emit }));
import { POST, GET } from "@/app/la-barre/[[...path]]/route";
import {
  BarreCampaignReviewSchema, barreCampaignReviewDigest, locateBarreCampaignReview,
} from "@/domain/barre-campaign-review";
import { canonicalJson } from "@/domain/canonical-json";
import { canonicalJson as datacollectorCanonicalJson } from "@/domain/datacollector-receipt";

type Review = Record<string, unknown> & { empreinte: string; version: number; id: string };
const FIXTURE = JSON.parse(readFileSync(join(__dirname, "../../fixtures/la-barre/bilan-campagne-v1.json"), "utf8")) as { versions: Review[] };
const [V1, V2] = FIXTURE.versions as [Review, Review];
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const reseal = (v: Review): Review => { const r = copy(v); r.empreinte = barreCampaignReviewDigest(r); return r; };
const base = (...versions: Review[]) => ({ campagnes: [{ id: "CMP-recette-noel", nom: "Marque de recette — Noël 2026", bilanVersions: versions }] });
const ask = (v: Review) => ({ campagneId: "CMP-recette-noel", bilanId: v.id, version: v.version, empreinte: v.empreinte });

describe("contrat commun avec La Barre", () => {
  it("recalcule la même empreinte que La Barre et accepte la forme figée", () => {
    for (const v of FIXTURE.versions) {
      expect(barreCampaignReviewDigest(v)).toBe(v.empreinte);
      expect(BarreCampaignReviewSchema.safeParse(v).success).toBe(true);
    }
    expect(V2.precedente).toBe(V1.empreinte);
    // Une seule sérialisation canonique pour les deux reçus (DataCollector et La Barre).
    expect(datacollectorCanonicalJson).toBe(canonicalJson);
    expect(canonicalJson({ b: 1, a: [{ d: null, c: "é" }] })).toBe('{"a":[{"c":"é","d":null}],"b":1}');
    expect(() => canonicalJson({ a: undefined })).toThrow();
  });

  it("accepte le compte des reprises facturables, additif et scellé dans l'empreinte (la-barre#27)", () => {
    const shared = JSON.parse(readFileSync(join(__dirname, "../../fixtures/la-barre/bilan-campagne-reprises-v1.json"), "utf8")) as { versions: Review[] };
    const [avant, apres] = shared.versions as [Review, Review];
    expect(avant).not.toHaveProperty("reprises");
    expect(apres).toHaveProperty("reprises");
    for (const v of shared.versions) {
      expect(barreCampaignReviewDigest(v)).toBe(v.empreinte);
      expect(BarreCampaignReviewSchema.safeParse(v).success).toBe(true);
    }
    expect(apres.precedente).toBe(avant.empreinte);
    const campagne = (avant.campagne as { id: string }).id;
    const at = (...versions: Review[]) => ({ campagnes: [{ id: campagne, bilanVersions: versions }] });
    const designe = (v: Review) => ({ campagneId: campagne, bilanId: v.id, version: v.version, empreinte: v.empreinte });
    expect(locateBarreCampaignReview(at(avant, apres), designe(apres))).toEqual({ ok: true, review: apres });
    // Un compte modifié après l'arrêt ne correspond plus à l'empreinte.
    const gonfle = copy(apres) as Review & { reprises: { facturables: number } };
    gonfle.reprises.facturables += 1;
    expect(locateBarreCampaignReview(at(avant, gonfle), designe(apres))).toEqual({ ok: false, code: "REVIEW_DIGEST_INVALID" });
    // Forme stricte : pas de compte négatif, pas de clé inconnue, pas d'origine vide.
    const mauvais: Array<(r: Record<string, unknown>) => void> = [
      (r) => { r.facturables = -1; },
      (r) => { r.montant = 1200; },
      (r) => { r.parOrigine = { donneur: { facturable: true, n: 0 } }; },
      (r) => { r.parOrigine = { donneur: { facturable: "oui", n: 1 } }; },
    ];
    for (const change of mauvais) {
      const v = copy(apres) as Review & { reprises: Record<string, unknown> };
      change(v.reprises);
      const sealed = reseal(v);
      expect(locateBarreCampaignReview(at(avant, sealed), designe(sealed))).toEqual({ ok: false, code: "REVIEW_INVALID" });
    }
  });

  it("retrouve la version désignée et la vérifie de bout en bout", () => {
    expect(locateBarreCampaignReview(base(V1, V2), ask(V2))).toEqual({ ok: true, review: V2 });
    const altere = { ...copy(V2), contenu: V2.contenu + " ajout" };
    expect(locateBarreCampaignReview(base(V1, altere as Review), ask(V2))).toEqual({ ok: false, code: "REVIEW_DIGEST_INVALID" });
    expect(locateBarreCampaignReview(base(V1, V2), { ...ask(V2), empreinte: V1.empreinte })).toEqual({ ok: false, code: "REVIEW_DIGEST_MISMATCH" });
    expect(locateBarreCampaignReview(base(V1), ask(V2))).toEqual({ ok: false, code: "REVIEW_NOT_FOUND" });
    expect(locateBarreCampaignReview({ campagnes: [] }, ask(V1))).toEqual({ ok: false, code: "REVIEW_NOT_FOUND" });
    expect(locateBarreCampaignReview(null, ask(V1))).toEqual({ ok: false, code: "REVIEW_NOT_FOUND" });
    const double = base(V1); double.campagnes.push(copy(double.campagnes[0]!));
    expect(locateBarreCampaignReview(double, ask(V1))).toEqual({ ok: false, code: "REVIEW_AMBIGUOUS" });
    const rompue = reseal({ ...copy(V2), precedente: "f".repeat(64) });
    expect(locateBarreCampaignReview(base(V1, rompue), ask(rompue))).toEqual({ ok: false, code: "REVIEW_CHAIN_MISMATCH" });
    for (const change of [{ inconnu: true }, { note: null }, { precedente: null }, { contenu: "   " }, { schema: "autre" }]) {
      const v = reseal({ ...copy(V2), ...change } as Review);
      expect(locateBarreCampaignReview(base(V1, v), ask(v)), JSON.stringify(change)).toEqual({ ok: false, code: "REVIEW_INVALID" });
    }
  });
});

const url = "https://workspace.example/la-barre/bilan";
const context = { params: Promise.resolve({ path: ["bilan"] }) };
const post = (body: unknown, headers: Record<string, string> = { origin: "https://workspace.example" }) =>
  POST(new Request(url, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers }), context);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PORTFOLIO_BARRE_OPERATOR_IDS", "agency-a");
  vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://private-barre:3000");
  vi.stubEnv("AUTH_URL", ""); vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.auth.mockResolvedValue({ user: { id: "actor-a" } });
  mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
  mocks.snapshot.mockResolvedValue({ data: base(V1, V2), etag: '"rev-a"' });
  mocks.resolve.mockResolvedValue({ brands: [{ id: "MQ-recette", nodeId: "n", strategyId: "s-1", name: "Marque de recette" }], ambiguous: [] });
  mocks.emit.mockResolvedValue({ status: "OK", output: { sourceId: "src-2", edition: 2, version: 2, family: "Bilan de campagne — Marque de recette — Noël 2026", alreadyReceived: false, receivedAt: "2026-11-12T11:00:00.000Z" } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("POST /la-barre/bilan", () => {
  it("relit la version enregistrée, résout la marque et émet l'Intent gouverné", async () => {
    const response = await post(ask(V2));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ sourceId: "src-2", edition: 2, alreadyReceived: false, strategyId: "s-1",
      url: "/cockpit/brand/sources?strategy=s-1" });
    expect(mocks.snapshot).toHaveBeenCalledWith({ fresh: true });
    expect(mocks.resolve).toHaveBeenCalledWith({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" }, ["MQ-recette"]);
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    const [intent, options] = mocks.emit.mock.calls[0]!;
    expect(intent).toEqual({ kind: "INGEST_BARRE_CAMPAIGN_REVIEW", strategyId: "s-1", operatorId: "actor-a", instance: "barre-matanga",
      sourceRevision: '"rev-a"', review: V2, unlinkedBrands: [] });
    expect(options).toEqual({ caller: "la-barre:bilan", operatorId: "actor-a" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("refuse avant toute lecture : anonyme, rôle de lecture, autre origine, corps illisible ou trop lourd, lecture", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await post(ask(V1))).status).toBe(401);
    mocks.actor.mockResolvedValueOnce({ userId: "actor-a", role: "USER", operatorId: "agency-a" });
    expect(await (await post(ask(V1))).json()).toMatchObject({ code: "ROLE_REFUSED" });
    expect((await post(ask(V1), { origin: "https://other.example" })).status).toBe(403);
    expect((await post(ask(V1), {})).status).toBe(403);
    for (const body of ["{", { ...ask(V1), contenu: "texte" }, { ...ask(V1), version: 0 }, { ...ask(V1), empreinte: "x" }]) {
      const response = await post(body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(await response.json()).toMatchObject({ code: "REQUEST_INVALID" });
    }
    expect((await post({ ...ask(V1), campagneId: "x".repeat(2100) })).status).toBe(413);
    expect((await GET(new Request(url), context)).status).toBe(405);
    expect(mocks.snapshot).not.toHaveBeenCalled(); expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("refuse une version modifiée après son arrêt ou une empreinte périmée, sans émettre", async () => {
    mocks.snapshot.mockResolvedValue({ data: base(V1, { ...copy(V2), contenu: "réécrit" } as Review), etag: null });
    const altered = await post(ask(V2));
    expect(altered.status).toBe(422); expect(await altered.json()).toMatchObject({ code: "REVIEW_DIGEST_INVALID" });
    mocks.snapshot.mockResolvedValue({ data: base(V1), etag: null });
    const missing = await post(ask(V2));
    expect(missing.status).toBe(404); expect(await missing.json()).toMatchObject({ code: "REVIEW_NOT_FOUND" });
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("une marque sans dossier lisible ou plusieurs dossiers ne sont jamais tranchés au hasard", async () => {
    mocks.resolve.mockResolvedValueOnce({ brands: [], ambiguous: [] });
    const none = await post(ask(V2));
    expect(none.status).toBe(409); expect(await none.json()).toMatchObject({ code: "BRAND_NOT_LINKED" });
    mocks.resolve.mockResolvedValueOnce({ brands: [], ambiguous: ["MQ-recette"] });
    expect(await (await post(ask(V2))).json()).toMatchObject({ code: "BRANDS_AMBIGUOUS" });
    const deux = reseal({ ...copy(V2), marques: [{ id: "MQ-recette", nom: null }, { id: "MQ-autre", nom: null }] });
    mocks.snapshot.mockResolvedValue({ data: base(V1, deux), etag: null });
    mocks.resolve.mockResolvedValueOnce({ brands: [{ id: "MQ-recette", nodeId: "a", strategyId: "s-1", name: "A" },
      { id: "MQ-autre", nodeId: "b", strategyId: "s-2", name: "B" }], ambiguous: [] });
    expect(await (await post(ask(deux))).json()).toMatchObject({ code: "BRANDS_AMBIGUOUS" });
    expect(mocks.emit).not.toHaveBeenCalled();
    // Une seconde marque non reliée est conservée comme telle, pas ignorée en silence.
    mocks.resolve.mockResolvedValueOnce({ brands: [{ id: "MQ-recette", nodeId: "a", strategyId: "s-1", name: "A" }], ambiguous: [] });
    expect((await post(ask(deux))).status).toBe(200);
    expect(mocks.emit.mock.calls[0]![0]).toMatchObject({ strategyId: "s-1", unlinkedBrands: ["MQ-autre"] });
  });

  it("rend le refus typé du handler, et 503 quand La Barre ne répond pas", async () => {
    mocks.emit.mockResolvedValueOnce({ status: "VETOED", reason: "REVIEW_VERSION_CONFLICT", summary: "conflit" });
    const conflict = await post(ask(V2));
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: "REVIEW_VERSION_CONFLICT", quoi: expect.stringContaining("autre contenu") });
    mocks.emit.mockResolvedValueOnce({ status: "FAILED", reason: "EMISSION_PERSIST_FAILED", summary: "trace" });
    expect((await post(ask(V2))).status).toBe(503);
    mocks.snapshot.mockRejectedValueOnce(new Error("La Barre répond 502"));
    const down = await post(ask(V2));
    expect(down.status).toBe(503); expect(await down.json()).toMatchObject({ code: "RECEPTION_FAILED" });
  });
});

describe("version attestée par La Fusée (LB3, ADR-0245)", () => {
  const SHARED = JSON.parse(readFileSync(join(__dirname, "../../fixtures/la-barre/bilan-campagne-atteste-v1.json"), "utf8")) as {
    cleDeRecette: string; instance: string; version: Review & { attestation: Record<string, unknown> } };
  const attested = SHARED.version;
  beforeEach(() => { vi.stubEnv("AUTH_SECRET", SHARED.cleDeRecette); vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", SHARED.instance); });

  it("la forme accepte l'attestation, l'empreinte l'ignore", () => {
    expect(BarreCampaignReviewSchema.safeParse(attested).success).toBe(true);
    expect(barreCampaignReviewDigest(attested)).toBe(V1.empreinte);
    expect(BarreCampaignReviewSchema.safeParse({ ...copy(attested), attestation: { par: "la-barre" } }).success).toBe(false);
  });

  it("vérifie le sceau à la réception et range la version avec son attestation", async () => {
    mocks.snapshot.mockResolvedValue({ data: base(attested), etag: '"rev-a"' });
    const response = await post(ask(attested));
    expect(response.status).toBe(200);
    expect(mocks.emit.mock.calls[0]![0]).toMatchObject({ review: attested });
  });

  it("refuse une attestation qui n'est pas celle de cette installation, ou qui ne désigne pas ce contenu", async () => {
    const autres = [
      { ...copy(attested), attestation: { ...attested.attestation, nom: "Quelqu’un d’autre" } },
      { ...copy(attested), attestation: { ...attested.attestation, sceau: "0".repeat(64) } },
    ];
    for (const v of autres) {
      mocks.snapshot.mockResolvedValue({ data: base(v as Review), etag: null });
      const response = await post(ask(v as Review));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ code: "REVIEW_ATTESTATION_INVALID" });
    }
    vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", "autre-installation");
    mocks.snapshot.mockResolvedValue({ data: base(attested), etag: null });
    expect(await (await post(ask(attested))).json()).toMatchObject({ code: "REVIEW_ATTESTATION_INVALID" });
    vi.stubEnv("PORTFOLIO_BARRE_INSTANCE", SHARED.instance); vi.stubEnv("AUTH_SECRET", "une-autre-cle-de-session-longue");
    expect(await (await post(ask(attested))).json()).toMatchObject({ code: "REVIEW_ATTESTATION_INVALID" });
    expect(mocks.emit).not.toHaveBeenCalled();
    // Sans vérificateur, une attestation n'est jamais tenue pour vérifiée.
    expect(locateBarreCampaignReview(base(attested), ask(attested))).toEqual({ ok: false, code: "REVIEW_ATTESTATION_INVALID" });
  });

  it("les versions reçues avant, sans attestation, restent reçues", async () => {
    mocks.snapshot.mockResolvedValue({ data: base(V1), etag: null });
    expect((await post(ask(V1))).status).toBe(200);
  });
});
