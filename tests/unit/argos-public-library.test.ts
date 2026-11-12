/**
 * SHK-0002 point 5 — les lectures publiques Argos passent par la bibliothèque
 * canonique (Argos-studio, `GET /api/v1/references`) quand elle est raccordée,
 * et retombent sur les dossiers publiés par La Fusée, en le disant, quand elle
 * ne l'est pas ou ne répond pas proprement. Studio simulé : aucun appel réseau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { campaignReferenceDossier: { findMany: mocks.findMany, findUnique: mocks.findUnique, findFirst: mocks.findFirst } },
}));
// Frontière DNS seulement ; en production la garde SSRF partagée résout l'hôte.
vi.mock("@/lib/net/ssrf-guard", () => ({ assertPublicUrl: async (url: string) => new URL(url) }));

import {
  listPublicDossiers,
  getPublicDossierByRef,
  listPublicDossierEntries,
  resetArgosLibraryReadState,
} from "@/server/services/seshat/argos";

const STUDIO = "https://studio.example.test";
const journalRow = {
  id: "journal-1",
  ref: "fixture--lancement",
  brand: "Fixture",
  campaign: "Lancement",
  sector: "food",
  market: "CI",
  dna: { voice: "Voix du journal", keyPhrases: ["k1"] },
  editorial: { sections: [{ title: "Lecture", body: "Corps du journal" }] },
  sources: [
    { title: "Source sûre", url: "https://example.test/a" },
    { title: "Lien piégé", url: "javascript:alert(1)" },
  ],
  safetyVerdict: "PASS",
  published: true,
  publishedAt: new Date("2026-11-02T10:00:00.000Z"),
  updatedAt: new Date("2026-11-03T10:00:00.000Z"),
};
const studioRef = {
  id: "ref_studio-fixture-campagne-2026",
  slug: "studio-fixture-campagne-2026",
  title: "Campagne studio",
  brandEmitter: "Studio Fixture",
  sector: "Télécoms",
  marketPrimary: "SN",
  marketsSecondary: [],
  emissionYear: 2026,
  summary: "Résumé canonique de la référence, tenu par la bibliothèque.",
  patternObservation: "Observation du motif.",
  updatedAt: "2026-11-09T08:00:00.000Z",
  axes: [{ name: "PROMISE_STRATEGY", value: "Promesse inversée.", confidence: 0.9, evidence: "Citation." }],
  researchSources: [{ url: "https://press.example.test/1", title: "Communiqué", license: "press-kit", role: "primary" }],
  researcherName: "Chercheuse publique",
  researcherContact: "prive@example.test",
  assets: [],
  performance: { metrics: [] },
};
const listBody = (data: unknown[]) => ({ data, meta: { pagination: { page: 1, perPage: 60, offset: 0, total: data.length, totalPages: 1 } } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  resetArgosLibraryReadState();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.findMany.mockResolvedValue([journalRow]);
  mocks.findUnique.mockResolvedValue(journalRow);
  mocks.findFirst.mockResolvedValue({ publishedAt: journalRow.publishedAt });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("liste publique Argos", () => {
  it("sans bibliothèque configurée, sert les dossiers publiés par La Fusée et le dit", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", "");
    const result = await listPublicDossiers({});
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(result.source).toMatchObject({ origin: "JOURNAL", reason: "NOT_CONFIGURED", latestPublishedAt: "2026-11-02T10:00:00.000Z" });
    expect(result.dossiers.map((d) => d.ref)).toEqual(["fixture--lancement"]);
    expect(result.dossiers[0]!.sources).toEqual([{ title: "Source sûre", url: "https://example.test/a" }]);
    expect(result.dossiers[0]!.libraryUrl).toBeNull();
  });

  it("lit la bibliothèque canonique quand elle répond dans la forme attendue", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(json(listBody([studioRef])));
    const result = await listPublicDossiers({ sector: "Télécoms", limit: 12 });
    const [url, init] = mocks.fetch.mock.calls[0]!;
    expect(String(url)).toBe(`${STUDIO}/api/v1/references?limit=12&sector=telecoms`);
    expect(init).toMatchObject({ method: "GET", redirect: "error" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(result.source.origin).toBe("STUDIO");
    expect(mocks.findMany).not.toHaveBeenCalled();
    const d = result.dossiers[0]!;
    expect(d).toMatchObject({
      ref: "studio-fixture-campagne-2026",
      brand: "Studio Fixture",
      campaign: "Campagne studio",
      sector: "Télécoms",
      market: "SN",
      summary: "Résumé canonique de la référence, tenu par la bibliothèque.",
      updatedAt: "2026-11-09T08:00:00.000Z",
      libraryUrl: `${STUDIO}/work/studio-fixture-campagne-2026`,
      sources: [{ title: "Communiqué", url: "https://press.example.test/1" }],
    });
    expect(JSON.stringify(result)).not.toContain("prive@example.test");
  });

  it("refuse une réponse de forme inconnue et retombe sur La Fusée", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(json({ items: [studioRef] }));
    const result = await listPublicDossiers({});
    expect(result.source).toMatchObject({ origin: "JOURNAL", reason: "INVALID_RESPONSE" });
    expect(result.dossiers.map((d) => d.ref)).toEqual(["fixture--lancement"]);
  });

  it("refuse une référence dont un lien n'est pas http(s)", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(json(listBody([{ ...studioRef, researchSources: [{ url: "javascript:alert(1)", title: "x" }] }])));
    expect((await listPublicDossiers({})).source).toMatchObject({ origin: "JOURNAL", reason: "INVALID_RESPONSE" });
  });

  it("borne le délai : une bibliothèque muette ne bloque pas la page", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockImplementation((_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason))));
    const started = Date.now();
    const result = await listPublicDossiers({});
    expect(Date.now() - started).toBeLessThan(6000);
    expect(result.source).toMatchObject({ origin: "JOURNAL", reason: "TIMEOUT" });
    expect(result.dossiers).toHaveLength(1);
  });

  it("un statut d'erreur vaut injoignable ; la tentative suivante attend la fin du répit", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(new Response("indisponible", { status: 503 }));
    expect((await listPublicDossiers({})).source).toMatchObject({ origin: "JOURNAL", reason: "UNREACHABLE" });
    expect((await listPublicDossiers({})).source).toMatchObject({ origin: "JOURNAL", reason: "UNREACHABLE" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    resetArgosLibraryReadState();
    mocks.fetch.mockResolvedValue(json(listBody([studioRef])));
    expect((await listPublicDossiers({})).source.origin).toBe("STUDIO");
  });

  it("une adresse configurée hors HTTPS est refusée sans appel", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", "http://studio.example.test");
    expect((await listPublicDossiers({})).source).toMatchObject({ origin: "JOURNAL", reason: "MISCONFIGURED" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("dossier public Argos", () => {
  it("lit la fiche dans la bibliothèque canonique", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(json({ data: studioRef }));
    const result = await getPublicDossierByRef("studio-fixture-campagne-2026");
    expect(String(mocks.fetch.mock.calls[0]![0])).toBe(`${STUDIO}/api/v1/references/studio-fixture-campagne-2026`);
    expect(result.source.origin).toBe("STUDIO");
    expect(result.dossier).toMatchObject({ ref: "studio-fixture-campagne-2026", brand: "Studio Fixture" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("un 404 conforme de la bibliothèque vaut introuvable, sans relire le journal", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(json({ ok: false, error: "NOT_FOUND", message: "No reference" }, 404));
    const result = await getPublicDossierByRef("absente");
    expect(result).toMatchObject({ dossier: null, source: { origin: "STUDIO" } });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("un 404 d'une autre forme n'est pas un introuvable : retour sur La Fusée", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    mocks.fetch.mockResolvedValue(new Response("<html>404</html>", { status: 404 }));
    const result = await getPublicDossierByRef("fixture--lancement");
    expect(result.source).toMatchObject({ origin: "JOURNAL", reason: "INVALID_RESPONSE" });
    expect(result.dossier?.ref).toBe("fixture--lancement");
  });

  it("sans bibliothèque, sert le dossier publié et refuse un dossier non PASS", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", "");
    const ok = await getPublicDossierByRef("fixture--lancement");
    expect(ok.source).toMatchObject({ origin: "JOURNAL", reason: "NOT_CONFIGURED", latestPublishedAt: "2026-11-02T10:00:00.000Z" });
    expect(ok.dossier?.brand).toBe("Fixture");
    mocks.findUnique.mockResolvedValue({ ...journalRow, safetyVerdict: "QUARANTINE" });
    expect((await getPublicDossierByRef("fixture--lancement")).dossier).toBeNull();
  });

  it("une ref hors forme slug n'atteint pas la bibliothèque", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    const result = await getPublicDossierByRef("../ingest/dossier");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(result.dossier).toBeNull();
  });
});

describe("sitemap Argos", () => {
  it("parcourt les pages de la bibliothèque et garde ses slugs", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    const many = Array.from({ length: 100 }, (_, i) => ({ ...studioRef, slug: `ref-${i}` }));
    mocks.fetch
      .mockResolvedValueOnce(json({ data: many, meta: { pagination: { total: 101 } } }))
      .mockResolvedValueOnce(json({ data: [{ ...studioRef, slug: "ref-100" }], meta: { pagination: { total: 101 } } }));
    const result = await listPublicDossierEntries();
    expect(String(mocks.fetch.mock.calls[1]![0])).toBe(`${STUDIO}/api/v1/references?limit=100&offset=100`);
    expect(result.source.origin).toBe("STUDIO");
    expect(result.entries).toHaveLength(101);
    expect(result.entries.at(-1)).toEqual({ ref: "ref-100", updatedAt: "2026-11-09T08:00:00.000Z" });
  });

  it("une page invalide fait retomber tout le sitemap sur La Fusée, sans mélange", async () => {
    vi.stubEnv("ARGOS_STUDIO_URL", STUDIO);
    const many = Array.from({ length: 100 }, (_, i) => ({ ...studioRef, slug: `ref-${i}` }));
    mocks.fetch
      .mockResolvedValueOnce(json({ data: many, meta: { pagination: { total: 101 } } }))
      .mockResolvedValueOnce(json({ unexpected: true }));
    mocks.findMany.mockResolvedValue([{ ref: journalRow.ref, updatedAt: journalRow.updatedAt, publishedAt: journalRow.publishedAt }]);
    const result = await listPublicDossierEntries();
    expect(result.source).toMatchObject({ origin: "JOURNAL", reason: "INVALID_RESPONSE" });
    expect(result.entries).toEqual([{ ref: "fixture--lancement", updatedAt: "2026-11-03T10:00:00.000Z" }]);
  });
});
