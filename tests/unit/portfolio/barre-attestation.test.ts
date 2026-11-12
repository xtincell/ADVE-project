/**
 * LB3 — l'acteur authentifié des décisions La Barre (ADR-0245).
 *
 * La route `/la-barre/` relit la base enregistrée chez La Barre, tamponne les
 * décisions, lignes de journal et versions de bilan nouvelles avec la personne
 * de la session, et refuse toute attestation forgée, modifiée ou effacée. La
 * Barre est simulée par un serveur fictif (fetch) qui applique sa précondition.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), actor: vi.fn(), user: vi.fn(), context: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: mocks.actor, canAccessStrategy: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.user } } }));
vi.mock("@/server/services/brand-node/barre-context", () => ({ getBarreBrandContext: mocks.context, resolveBarreBrands: vi.fn() }));
import { GET, PUT } from "@/app/la-barre/[[...path]]/route";
import {
  BARRE_JOURNAL_TRUNCATION_FLOOR, attestBarreEntry, barreEntryDigest, stampBarreBase, verifyBarreAttestation,
} from "@/domain/barre-actor-attestation";
import { barreCampaignReviewDigest, BarreCampaignReviewSchema } from "@/domain/barre-campaign-review";

const ORIGIN = "https://workspace.example";
const KEY = "secret-de-recette-assez-long";
const INSTANCE = "barre-matanga";
const url = `${ORIGIN}/la-barre/depots/beignet-paradise.json`;
const context = (path = ["depots", "beignet-paradise.json"]) => ({ params: Promise.resolve({ path }) });
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const revision = (text: string) => `"${createHash("sha256").update(text, "utf8").digest("hex")}"`;
const ALICE = { userId: "user-alice", nom: "Alice Martin" };
const SHARED = JSON.parse(readFileSync(join(__dirname, "../../fixtures/la-barre/bilan-campagne-atteste-v1.json"), "utf8")) as {
  cleDeRecette: string; instance: string; version: Record<string, unknown> & { empreinte: string; attestation: Record<string, unknown> } };

type Base = Record<string, unknown> & { decisions?: unknown[]; journal?: unknown[]; enregistre_le?: string };
type Entry = Record<string, unknown>;
const decision = (id: string, extra: Entry = {}): Entry => ({ objet: "PRJ-1", type: "piste", projet: "PRJ-1", verdict: "approuve",
  motif: null, quand: "2026-11-11T09:00:00.000Z", qui: "creation", acteur: { personneId: null, nom: "Poste création", poste: "creation" }, titre: "Piste A", id, cree_le: "2026-11-11T09:00:00.000Z", ...extra });
const ligne = (detail: string, extra: Entry = {}): Entry => ({ quand: "2026-11-11T09:00:00.000Z", qui: "creation", action: "création", type: "decisions", id: "DEC-1", detail, ...extra });

/** La Barre fictive : sa base, sa révision, sa précondition. */
let stored: string | null;
let writes: Array<{ headers: Headers; body: string }>;
function barre(initial: Base | null) {
  stored = initial ? JSON.stringify(initial) : null;
  writes = [];
  vi.stubGlobal("fetch", vi.fn(async (_: URL, options: RequestInit = {}) => {
    if (!options.method || options.method === "GET") {
      return stored === null ? new Response("Introuvable", { status: 404 })
        : new Response(stored, { headers: { ETag: revision(stored), "Content-Type": "application/json" } });
    }
    const body = Buffer.from(options.body as Uint8Array).toString("utf8");
    const headers = new Headers(options.headers);
    writes.push({ headers, body });
    if (stored !== null && revision(body) === revision(stored)) return Response.json({ ok: true, dejaRecu: true, revision: revision(body) }, { headers: { ETag: revision(body) } });
    if (stored !== null ? headers.get("if-match") !== revision(stored) : headers.get("if-none-match") !== "*") {
      return Response.json({ ok: false, conflit: true, code: "REVISION_DEPASSEE" }, { status: 409 });
    }
    stored = body;
    return Response.json({ ok: true, revision: revision(body), enregistre_le: JSON.parse(body).enregistre_le ?? null }, { headers: { ETag: revision(body) } });
  }));
}
const put = (body: unknown, headers: Record<string, string> = {}) => PUT(new Request(url, { method: "PUT",
  body: typeof body === "string" ? body : JSON.stringify(body, null, 1),
  headers: { origin: ORIGIN, "content-type": "application/json", ...headers } }), context());
const saved = () => JSON.parse(stored!) as Base & { decisions: Array<Record<string, unknown>>; journal: Array<Record<string, unknown>> };
const attested = (entry: Record<string, unknown>) => verifyBarreAttestation(entry, { key: KEY, instance: INSTANCE });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PORTFOLIO_BARRE_OPERATOR_IDS", "agency-a");
  vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://private-barre:3000");
  vi.stubEnv("AUTH_URL", ORIGIN); vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubEnv("AUTH_SECRET", KEY); vi.stubEnv("NEXTAUTH_SECRET", "");
  mocks.auth.mockResolvedValue({ user: { id: ALICE.userId, name: "Nom périmé du jeton" } });
  mocks.actor.mockResolvedValue({ userId: ALICE.userId, role: "OPERATOR", operatorId: "agency-a" });
  mocks.user.mockResolvedValue({ id: ALICE.userId, name: ALICE.nom });
  mocks.context.mockResolvedValue({ generatedAt: "2026-11-11T09:00:00.000Z", sharingMode: "DOCUMENT_V2", campaignReviewReception: "CAMPAIGN_REVIEW_V1", choices: [], brands: {}, issues: [] });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("contexte.json nomme la personne connectée", () => {
  it("déclare la capacité, l'identifiant stable et le nom relu en base, jamais l'e-mail", async () => {
    mocks.user.mockResolvedValue({ id: ALICE.userId, name: ALICE.nom, email: "alice@example.invalid" });
    const response = await GET(new Request(`${ORIGIN}/la-barre/contexte.json`), context(["contexte.json"]));
    const body = await response.json();
    expect(body).toMatchObject({ campaignReviewReception: "CAMPAIGN_REVIEW_V1", actorAttestation: "SESSION_V1",
      actor: { id: ALICE.userId, name: ALICE.nom } });
    expect(JSON.stringify(body)).not.toContain("@");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("sans clé de signature, ne déclare rien qu'elle ne pourrait sceller", async () => {
    vi.stubEnv("AUTH_SECRET", ""); vi.stubEnv("NEXTAUTH_SECRET", "");
    const body = await (await GET(new Request(`${ORIGIN}/la-barre/contexte.json`), context(["contexte.json"]))).json();
    expect(body.actorAttestation).toBeUndefined(); expect(body.actor).toBeUndefined();
  });
});

describe("enregistrer une base sous la personne connectée", () => {
  it("tamponne la décision, la ligne de journal et la version de bilan nouvelles, et rend ce qu'elle a attesté", async () => {
    const before: Base = { enregistre_le: "2026-11-11T08:00:00.000Z", decisions: [], journal: [], campagnes: [{ id: "C1", bilanVersions: [] }] };
    barre(before);
    const etag = revision(stored!);
    const proposed = { ...copy(before), enregistre_le: "2026-11-11T09:00:01.000Z", decisions: [decision("DEC-1")], journal: [ligne("Piste A")],
      campagnes: [{ id: "C1", bilanVersions: [copy(SHARED.version)] }] };
    delete (proposed.campagnes[0]!.bilanVersions[0] as Record<string, unknown>).attestation;
    const response = await put(proposed, { "if-match": etag });
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect(receipt.ok).toBe(true);
    expect(receipt.attestations.map((a: { chemin: unknown[]; motif: string }) => [a.chemin, a.motif])).toEqual([
      [["decisions", 0], "POSEE"], [["journal", 0], "POSEE"], [["campagnes", 0, "bilanVersions", 0], "POSEE"]]);
    expect(writes).toHaveLength(1);
    expect(writes[0]!.headers.get("if-match")).toBe(etag);
    const after = saved();
    const d = after.decisions[0]!, j = after.journal[0]!;
    const v = (after.campagnes as Array<{ bilanVersions: Array<Record<string, unknown>> }>)[0]!.bilanVersions[0]!;
    for (const entry of [d, j, v]) {
      expect(entry.attestation).toMatchObject({ par: "la-fusee", userId: ALICE.userId, nom: ALICE.nom });
      expect(attested(entry)).toBe(true);
    }
    expect(Object.keys(d).at(-1)).toBe("attestation");
    // L'attestation désigne le contenu exact ; le reste de la décision est inchangé.
    expect({ ...d, attestation: undefined }).toEqual({ ...decision("DEC-1"), attestation: undefined });
    expect((d.attestation as { empreinte: string }).empreinte).toBe(barreEntryDigest(decision("DEC-1")));
    // L'empreinte du bilan ignore l'attestation : la version reste celle que La Barre a scellée.
    expect(barreCampaignReviewDigest(v)).toBe(v.empreinte);
    expect(BarreCampaignReviewSchema.safeParse(v).success).toBe(true);
    // Le JSON enregistré garde la forme envoyée par le navigateur.
    expect(stored).toBe(JSON.stringify(after, null, 1));
  });

  it("rétablit une attestation absente de l'envoi et ne tamponne pas après coup une entrée déclarée", async () => {
    const d1 = decision("DEC-1");
    const legacy = decision("DEC-0", { titre: "Décision d'avant" });
    d1.attestation = attestBarreEntry(d1, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    barre({ enregistre_le: "2026-11-11T09:00:02.000Z", decisions: [legacy, d1], journal: [] });
    const etag = revision(stored!);
    const proposed = { ...saved(), enregistre_le: "2026-11-11T10:00:00.000Z" };
    delete (proposed.decisions[1] as Record<string, unknown>).attestation;
    const response = await put(proposed, { "if-match": etag });
    expect(response.status).toBe(200);
    expect((await response.json()).attestations).toEqual([{ chemin: ["decisions", 1], attestation: d1.attestation, motif: "RETABLIE" }]);
    expect(saved().decisions[1]!.attestation).toEqual(d1.attestation);
    expect(saved().decisions[0]!.attestation).toBeUndefined();
  });

  it("refuse une attestation présentée par le navigateur, sans rien écrire", async () => {
    barre({ enregistre_le: "2026-11-11T08:00:00.000Z", decisions: [], journal: [] });
    const etag = revision(stored!), before = stored;
    const forged = decision("DEC-1");
    forged.attestation = attestBarreEntry(forged, { userId: "user-bob", nom: "Bob" }, { key: "autre-cle-pas-celle-ci", instance: INSTANCE, at: "2026-11-11T09:00:00.000Z" }) as never;
    const response = await put({ ...saved(), decisions: [forged] }, { "if-match": etag });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "ATTESTATION_NOT_RECOGNIZED", chemin: ["decisions", 0] });
    expect(writes).toHaveLength(0); expect(stored).toBe(before);
  });

  it("refuse de modifier une attestation, ou une entrée attestée, et de l'effacer", async () => {
    const d1 = decision("DEC-1");
    d1.attestation = attestBarreEntry(d1, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    const j1 = ligne("Piste A", { marques: ["MQ-1"] });
    j1.attestation = attestBarreEntry(j1, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    const base = { enregistre_le: "2026-11-11T09:00:02.000Z", decisions: [d1], journal: [j1] };
    const cases: Array<[string, (b: ReturnType<typeof copy<typeof base>>) => void, string]> = [
      ["nom changé", (b) => { (b.decisions[0]!.attestation as Record<string, unknown>).nom = "Bob"; }, "ATTESTATION_NOT_RECOGNIZED"],
      ["verdict changé sous la même attestation", (b) => { b.decisions[0]!.verdict = "hors"; }, "ATTESTATION_NOT_RECOGNIZED"],
      ["verdict changé, attestation retirée", (b) => { b.decisions[0]!.verdict = "hors"; delete (b.decisions[0] as Record<string, unknown>).attestation; }, "ATTESTATION_REMOVED"],
      ["décision retirée", (b) => { b.decisions = []; }, "ATTESTATION_REMOVED"],
      ["ligne de marque retirée", (b) => { b.journal = []; }, "ATTESTATION_REMOVED"],
      ["attestation déplacée sur une autre décision", (b) => { b.decisions.push({ ...decision("DEC-2"), attestation: d1.attestation } as never); }, "ATTESTATION_NOT_RECOGNIZED"],
    ];
    for (const [label, change, code] of cases) {
      barre(copy(base));
      const etag = revision(stored!), before = stored;
      const proposed = copy(base);
      change(proposed);
      const response = await put(proposed, { "if-match": etag });
      expect(response.status, label).toBe(422);
      expect((await response.json()).code, label).toBe(code);
      expect(writes, label).toHaveLength(0); expect(stored, label).toBe(before);
    }
  });

  it("une version de bilan attestée ne disparaît pas ; le journal ne perd que des lignes sans marque, par troncature", async () => {
    const v = copy(SHARED.version);
    v.attestation = attestBarreEntry(v, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    barre({ enregistre_le: "2026-11-11T09:00:02.000Z", campagnes: [{ id: "C1", bilanVersions: [v] }] });
    const response = await put({ enregistre_le: "2026-11-11T10:00:00.000Z", campagnes: [{ id: "C1", bilanVersions: [] }] }, { "if-match": revision(stored!) });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "ATTESTATION_REMOVED", chemin: ["campagnes", 0, "bilanVersions", 0] });

    const old = ligne("Vieille ligne sans marque", { quand: "2026-01-01T00:00:00.000Z" });
    old.attestation = attestBarreEntry(old, ALICE, { key: KEY, instance: INSTANCE, at: "2026-01-01T00:00:00.000Z" }) as never;
    const filler = Array.from({ length: BARRE_JOURNAL_TRUNCATION_FLOOR }, (_, i) => ligne(`ligne ${i}`, { quand: `2026-02-01T00:00:${String(i % 60).padStart(2, "0")}.000Z` }));
    barre({ enregistre_le: "2026-11-11T09:00:02.000Z", journal: [old, ...filler] });
    const truncated = await put({ enregistre_le: "2026-11-11T10:00:00.000Z", journal: filler }, { "if-match": revision(stored!) });
    expect(truncated.status).toBe(200);
    barre({ enregistre_le: "2026-11-11T09:00:02.000Z", journal: [old, ...filler] });
    const short = await put({ enregistre_le: "2026-11-11T10:00:00.000Z", journal: filler.slice(1) }, { "if-match": revision(stored!) });
    expect(short.status).toBe(422);
  });

  it("la précondition de révision passe avant l'attestation : une base périmée se rapproche, elle n'est pas refusée comme forgée", async () => {
    const d1 = decision("DEC-1");
    d1.attestation = attestBarreEntry(d1, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    barre({ enregistre_le: "2026-11-11T09:00:02.000Z", decisions: [d1] });
    const stale = await put({ enregistre_le: "2026-11-11T10:00:00.000Z", decisions: [] }, { "if-match": '"une-ancienne-revision"' });
    expect(stale.status).toBe(409);
    expect(stale.headers.get("etag")).toBe(revision(stored!));
    expect(await stale.json()).toMatchObject({ code: "REVISION_DEPASSEE", actuel: "2026-11-11T09:00:02.000Z" });
    const none = await put({ decisions: [] });
    expect(none.status).toBe(428); expect(await none.json()).toMatchObject({ code: "REVISION_REQUISE" });
    expect((await put({ decisions: [] }, { "if-none-match": "*" })).status).toBe(409);
    // X-Base, comme La Barre : la date de la version lue, jamais plus ancienne qu'elle.
    expect((await put({ enregistre_le: "2026-11-11T10:00:00.000Z", decisions: [d1] }, { "x-base": "2026-11-11T08:00:00.000Z" })).status).toBe(409);
    const base = await put({ enregistre_le: "2026-11-11T10:00:00.000Z", decisions: [d1, decision("DEC-2")] }, { "x-base": "2026-11-11T09:00:02.000Z" });
    expect(base.status).toBe(200);
    expect(writes.at(-1)!.headers.get("if-match")).not.toBeNull();
    expect(attested(saved().decisions[1]!)).toBe(true);
    expect(writes).toHaveLength(1);
  });

  it("une réponse perdue : renvoyer la même base est reconnu comme déjà reçu, attestations comprises", async () => {
    barre({ enregistre_le: "2026-11-11T08:00:00.000Z", decisions: [] });
    const first = revision(stored!);
    const proposed = { enregistre_le: "2026-11-11T09:00:00.000Z", decisions: [decision("DEC-1")] };
    expect((await put(proposed, { "if-match": first })).status).toBe(200);
    const attestation = saved().decisions[0]!.attestation;
    const replay = await put(proposed, { "if-match": first });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ dejaRecu: true, attestations: [{ chemin: ["decisions", 0], attestation, motif: "RETABLIE" }] });
    expect(saved().decisions[0]!.attestation).toEqual(attestation);
  });

  it("crée une base absente sous If-None-Match, et refuse un corps illisible ou trop lourd sans écrire", async () => {
    barre(null);
    const created = await put({ enregistre_le: "2026-11-11T09:00:00.000Z", decisions: [decision("DEC-1")] }, { "if-none-match": "*" });
    expect(created.status).toBe(200);
    expect(writes[0]!.headers.get("if-none-match")).toBe("*");
    expect(attested(saved().decisions[0]!)).toBe(true);
    barre({ decisions: [] });
    expect((await put("{", { "if-match": revision(stored!) })).status).toBe(400);
    expect((await put("[]", { "if-match": revision(stored!) })).status).toBe(400);
    expect((await put("{}", { "if-match": revision(stored!), "content-length": String(25 * 1024 * 1024) })).status).toBe(413);
    expect(writes).toHaveLength(0);
  });

  it("garde les gardes existantes : rôle de lecture, autre origine, sans clé de signature", async () => {
    barre({ decisions: [] });
    mocks.actor.mockResolvedValueOnce({ userId: ALICE.userId, role: "USER", operatorId: "agency-a" });
    expect((await put({ decisions: [] }, { "if-match": revision(stored!) })).status).toBe(403);
    expect((await put({ decisions: [] }, { "if-match": revision(stored!), origin: "https://other.example" })).status).toBe(403);
    vi.stubEnv("AUTH_SECRET", ""); vi.stubEnv("NEXTAUTH_SECRET", "");
    expect((await put({ decisions: [] }, { "if-match": revision(stored!) })).status).toBe(503);
    expect(writes).toHaveLength(0);
  });

  it("la lecture de la base reste une transmission inchangée", async () => {
    const d1 = decision("DEC-1");
    d1.attestation = attestBarreEntry(d1, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:02.000Z" }) as never;
    barre({ decisions: [d1] });
    const response = await GET(new Request(url), context());
    expect(await response.text()).toBe(stored);
    expect(response.headers.get("etag")).toBe(revision(stored!));
  });
});

describe("le sceau", () => {
  it("le jeu commun avec La Barre : l'empreinte ignore l'attestation et le sceau se vérifie avec la clé de recette", () => {
    const v = SHARED.version;
    expect(barreCampaignReviewDigest(v)).toBe(v.empreinte);
    expect(BarreCampaignReviewSchema.safeParse(v).success).toBe(true);
    expect(verifyBarreAttestation(v, { key: SHARED.cleDeRecette, instance: SHARED.instance })).toBe(true);
    expect(verifyBarreAttestation(v, { key: SHARED.cleDeRecette, instance: "autre-instance" })).toBe(false);
    expect(verifyBarreAttestation({ ...v, contenu: "réécrit" }, { key: SHARED.cleDeRecette, instance: SHARED.instance })).toBe(false);
    expect(verifyBarreAttestation({ ...v, attestation: { ...v.attestation, nom: "Autre" } }, { key: SHARED.cleDeRecette, instance: SHARED.instance })).toBe(false);
  });
  it("le module de domaine ne modifie pas la base envoyée", () => {
    const proposed = { decisions: [decision("DEC-1")] };
    const before = copy(proposed);
    const result = stampBarreBase({ decisions: [] }, proposed, ALICE, { key: KEY, instance: INSTANCE, at: "2026-11-11T09:00:00.000Z" });
    expect(result.ok && result.changed).toBe(true);
    expect(proposed).toEqual(before);
  });
});
