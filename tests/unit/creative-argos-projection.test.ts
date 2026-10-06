import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ credential: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { campaignReferenceDossier: { findUnique: async () => ({ id: "fixture-journal", brand: "fixture", campaign: "fixture-campaign", sector: "food", market: "CI", safetyVerdict: "PASS", reviewedBy: "fixture-operator", dna: { voice: "fixture", palette: ["fixture"], keyPhrases: ["one", "two"] }, editorial: null, sources: [{ url: "https://example.test/primary" }] }) } } }));
vi.mock("@/server/services/anubis/credential-vault", () => ({ credentialVault: { get: mocks.credential } }));
// Fixture DNS boundary only; production uses the shared SSRF guard.
vi.mock("@/lib/net/ssrf-guard", () => ({ assertPublicUrl: async (url: string) => new URL(url) }));
import { projectToArgosStudio } from "@/server/services/seshat/argos/studio-client";
import { argosResearchDossierSchema } from "@/domain/argos-projection";
const dossier = argosResearchDossierSchema.parse({ schemaVersion: "research-dossier-v1", researcher: { name: "Fixture" }, researchDate: "2026-10-06", operation: { title: "fixture-campaign", brandEmitter: "fixture", sector: "food", marketPrimary: "CI", emissionYear: 2026 }, sources: [{ url: "https://example.test/primary", title: "Fixture", accessedDate: "2026-10-06", license: "creator-permission", role: "primary" }], assets: [{ function: "HEADLINE", role: "HERO", kind: "TEXT", url: "", text: "Fixture", aspectRatio: "1:1" }], classification: { patternKind: "TEXT", manipulationMode: "FACILITATOR", funnelStage: "AWARENESS", pillars: ["T"], operationGoals: ["AWARENESS"] }, axes: [{ name: "ATTENTION_PATTERN", value: "fixture", confidence: 0.2, evidence: "Synthetic fixture" }], performance: { metrics: [] }, summary: "Synthetic fixture with explicit source; no performance claim." });
const input = { dossierId: "fixture-journal", dossier };
describe("Argos-studio projection protocol (fixtures, not remote publication)", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); mocks.credential.mockResolvedValue({ config: { baseUrl: "https://studio.example.test", apiKey: "UNIT_TEST_CREDENTIAL" } }); });
  afterEach(() => vi.unstubAllGlobals());
  it("uses the canonical POST and records a validated receipt separately from local PASS", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true, slug: "fixture-campaign", assetCount: 1, newlyCreated: true }), { status: 201 }));
    const result = await projectToArgosStudio(input, "fixture-operator");
    expect(result).toMatchObject({ state: "LIVE", dossierId: "fixture-journal", receipt: { assetCount: 1, newlyCreated: true } });
    const [url, request] = mocks.fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://studio.example.test/api/v1/ingest/dossier");
    expect(request).toMatchObject({ method: "POST", redirect: "error", headers: { Authorization: "Bearer UNIT_TEST_CREDENTIAL" } });
    expect(JSON.parse(request.body)).toEqual(dossier);
  });
  it("does not call the remote service without a configured connector", async () => {
    mocks.credential.mockResolvedValue(null);
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEFERRED_AWAITING_CREDENTIALS" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("fails closed on remote taxonomy rejection or an invalid success envelope", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("fixture rejection", { status: 422 }));
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", detail: "REMOTE_CONTRACT_REJECTED" });
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, slug: "fixture" })));
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED" });
  });
  it("checks new payload content against the publication gate before credential or HTTP access", async () => {
    await expect(projectToArgosStudio({ ...input, dossier: { ...dossier, summary: "Synthetic fixture containing hate speech as forbidden payload." } }, "fixture-operator")).rejects.toThrow("publication");
    expect(mocks.credential).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("refuses undocumented sources and unknown licenses instead of inventing provenance", async () => {
    await expect(projectToArgosStudio({ ...input, dossier: { ...dossier, sources: [{ ...dossier.sources[0]!, url: "https://example.test/foreign" }] } }, "fixture-operator")).rejects.toThrow("source");
    expect(argosResearchDossierSchema.safeParse({ ...dossier, sources: [{ ...dossier.sources[0]!, license: "unknown" }] }).success).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
