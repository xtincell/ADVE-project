import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ credential: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { campaignReferenceDossier: { findUnique: async () => ({ id: "fixture-journal", brand: "fixture", campaign: "fixture-campaign", sector: "food", market: "CI", safetyVerdict: "PASS", reviewedBy: "fixture-operator", dna: { voice: "fixture", palette: ["fixture"], keyPhrases: ["one", "two"] }, editorial: null, sources: [{ url: "https://example.test/primary" }] }) } } }));
vi.mock("@/server/services/anubis/credential-vault", () => ({ credentialVault: { get: mocks.credential } }));
// Fixture DNS boundary only; production uses the shared SSRF guard.
vi.mock("@/lib/net/ssrf-guard", () => ({ assertPublicUrl: async (url: string) => new URL(url) }));
import { projectToArgosStudio } from "@/server/services/seshat/argos/studio-client";
import { argosResearchDossierSchema, argosStudioSlug, describeArgosProjection, parseArgosStudioVersion } from "@/domain/argos-projection";
const dossier = argosResearchDossierSchema.parse({ schemaVersion: "research-dossier-v1", researcher: { name: "Fixture" }, researchDate: "2026-10-06", operation: { title: "fixture-campaign", brandEmitter: "fixture", sector: "food", marketPrimary: "CI", emissionYear: 2026 }, sources: [{ url: "https://example.test/primary", title: "Fixture", accessedDate: "2026-10-06", license: "creator-permission", role: "primary" }], assets: [{ function: "HEADLINE", role: "HERO", kind: "TEXT", url: "", text: "Fixture", aspectRatio: "1:1" }], classification: { patternKind: "TEXT", manipulationMode: "FACILITATOR", funnelStage: "AWARENESS", pillars: ["T"], operationGoals: ["AWARENESS"] }, axes: [{ name: "ATTENTION_PATTERN", value: "fixture", confidence: 0.2, evidence: "Synthetic fixture" }], performance: { metrics: [] }, summary: "Synthetic fixture with explicit source; no performance claim." });
const input = { dossierId: "fixture-journal", dossier };
const SLUG = "fixture-fixture-campaign-2026";
const READ_VERSION = "2026-11-11T19:07:01.558Z";

// Simulated Argos-studio: answers follow app/src/app/api/v1/ingest/dossier/route.ts and
// app/src/app/api/v1/references/[slug]/route.ts (?format=dossier → ETag = JSON-quoted updatedAt).
const json = (body: unknown, status: number, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const unknownReference = () => json({ ok: false, error: "NOT_FOUND", message: `No reference with slug "${SLUG}"` }, 404);
const currentVersion = (version = READ_VERSION) => json(dossier, 200, { ETag: JSON.stringify(version) });
const stored = (over: Record<string, unknown> = {}) => { const body = { ok: true, slug: SLUG, assetCount: 1, newlyCreated: true, updatedAt: "2026-11-12T10:00:00.000Z", visibility: "public", audit: { notes: [] }, ...over }; return json(body, body.newlyCreated ? 201 : 200); };
const refusal = (status: number, error: string) => json({ ok: false, error, message: "fixture" }, status);
function studio(answer: { get: () => Response; post?: () => Response }) {
  mocks.fetch.mockImplementation(async (_url: URL, init?: RequestInit) => (init?.method === "POST" ? (answer.post ?? (() => { throw new Error("unexpected POST"); }))() : answer.get()));
}
const calls = () => mocks.fetch.mock.calls.map(([url, init]) => ({ url: String(url), init: init as RequestInit & { headers: Record<string, string> } }));
const post = () => calls().find(c => c.init.method === "POST");

describe("Argos-studio projection protocol (fixtures, not remote publication)", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); mocks.credential.mockResolvedValue({ config: { baseUrl: "https://studio.example.test", apiKey: "UNIT_TEST_CREDENTIAL" } }); });
  afterEach(() => vi.unstubAllGlobals());

  it("creates an unknown reference: version read first, then the canonical POST without If-Match", async () => {
    studio({ get: unknownReference, post: () => stored() });
    const result = await projectToArgosStudio(input, "fixture-operator");
    expect(result).toMatchObject({ state: "LIVE", change: "CREATED", readVersion: null, dossierId: "fixture-journal", receipt: { slug: SLUG, assetCount: 1, newlyCreated: true } });
    const [read, write] = calls();
    expect(read!.url).toBe(`https://studio.example.test/api/v1/references/${SLUG}?format=dossier`);
    expect(read!.init).toMatchObject({ method: "GET", redirect: "error", headers: { Authorization: "Bearer UNIT_TEST_CREDENTIAL" } });
    expect(read!.init.signal).toBeInstanceOf(AbortSignal);
    expect(write!.url).toBe("https://studio.example.test/api/v1/ingest/dossier");
    expect(write!.init).toMatchObject({ method: "POST", redirect: "error", headers: { Authorization: "Bearer UNIT_TEST_CREDENTIAL" } });
    expect(write!.init.headers).not.toHaveProperty("If-Match");
    expect(JSON.parse(write!.init.body as string)).toEqual(dossier);
    if (result.state !== "LIVE") throw new Error("LIVE attendu");
    expect(describeArgosProjection(result)).toContain("créée");
  });

  it("amends an existing reference with If-Match set to its current version", async () => {
    studio({ get: () => currentVersion(), post: () => stored({ newlyCreated: false, updatedAt: "2026-11-12T10:00:00.000Z" }) });
    const result = await projectToArgosStudio(input, "fixture-operator");
    expect(result).toMatchObject({ state: "LIVE", change: "AMENDED", readVersion: READ_VERSION, receipt: { newlyCreated: false } });
    expect(post()!.init.headers["If-Match"]).toBe(JSON.stringify(READ_VERSION));
  });

  it("says when a replayed identical dossier left the reference unchanged", async () => {
    studio({ get: () => currentVersion(), post: () => stored({ newlyCreated: false, updatedAt: READ_VERSION }) });
    const result = await projectToArgosStudio(input, "fixture-operator");
    expect(result).toMatchObject({ state: "LIVE", change: "UNCHANGED" });
  });

  it("qualifies a stale version (409 VERSION_CONFLICT) instead of announcing an outage, without retrying", async () => {
    studio({ get: () => currentVersion(), post: () => refusal(409, "VERSION_CONFLICT") });
    const result = await projectToArgosStudio(input, "fixture-operator");
    expect(result).toMatchObject({ state: "DEGRADED", reason: "MISSING_PREREQUISITE", detail: "VERSION_CONFLICT", slug: SLUG, readVersion: READ_VERSION });
    expect(result).toHaveProperty("payloadHash", expect.stringMatching(/^[0-9a-f]{64}$/));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    if (result.state !== "DEGRADED") throw new Error("DEGRADED attendu");
    expect(describeArgosProjection(result)).toContain("rien n'a été écrasé");
  });

  it("qualifies a visibility conflict (409 VISIBILITY_CONFLICT)", async () => {
    studio({ get: () => currentVersion(), post: () => refusal(409, "VISIBILITY_CONFLICT") });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", reason: "MISSING_PREREQUISITE", detail: "VISIBILITY_CONFLICT" });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("reports a refused key (401/403) as an access problem, not a vendor outage", async () => {
    studio({ get: unknownReference, post: () => refusal(401, "ADMIN_UNAUTHORIZED") });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", reason: "AUTH_REVOKED" });
    studio({ get: unknownReference, post: () => refusal(403, "ORIGIN_REFUSED") });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", reason: "AUTH_REVOKED" });
  });

  it("stops before writing when the current version cannot be read", async () => {
    studio({ get: () => refusal(409, "SOURCE_DOSSIER_UNAVAILABLE") });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", reason: "MISSING_PREREQUISITE", detail: "SOURCE_DOSSIER_UNAVAILABLE" });
    studio({ get: () => json(dossier, 200) });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", detail: "VERSION_UNREADABLE" });
    studio({ get: () => new Response("<html>not the library</html>", { status: 404 }) });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", detail: "VERSION_UNREADABLE" });
    studio({ get: () => refusal(503, "ADMIN_NOT_CONFIGURED") });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
    expect(post()).toBeUndefined();
  });

  it("does not call the remote service without a configured connector", async () => {
    mocks.credential.mockResolvedValue(null);
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEFERRED_AWAITING_CREDENTIALS" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("fails closed on remote taxonomy rejection or an invalid success envelope", async () => {
    studio({ get: unknownReference, post: () => new Response("fixture rejection", { status: 422 }) });
    expect(await projectToArgosStudio(input, "fixture-operator")).toMatchObject({ state: "DEGRADED", detail: "REMOTE_CONTRACT_REJECTED" });
    studio({ get: unknownReference, post: () => json({ ok: true, slug: "fixture" }, 201) });
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

describe("Argos-studio slug and version (pure, mirrors the studio)", () => {
  it("derives the slug exactly like the studio's generateSlug", () => {
    // Expected values computed with the studio's own slugify (app/src/lib/utils.ts).
    expect(argosStudioSlug({ brandEmitter: "Nike", title: "Dream Crazy", emissionYear: 2018 })).toBe("nike-dream-crazy-2018");
    expect(argosStudioSlug({ brandEmitter: "Café Noir", title: "Été — Brûlant !", emissionYear: 2026 })).toBe("cafe-noir-ete-brulant-2026");
    expect(argosStudioSlug({ brandEmitter: "Ñandú 🦤", title: "Ölçü", emissionYear: 2024 })).toBe("nandu-olcu-2024");
    // Cut at 80 characters with no trimming afterwards, like the studio.
    expect(argosStudioSlug({ brandEmitter: "A".repeat(39), title: "b c ".repeat(20), emissionYear: 2026 })).toBe(`${"a".repeat(39)}${"-b-c".repeat(10)}-`);
  });
  it("reads the version from the ETag, and nothing else", () => {
    expect(parseArgosStudioVersion(`"${READ_VERSION}"`)).toBe(READ_VERSION);
    expect(parseArgosStudioVersion(`W/"${READ_VERSION}"`)).toBe(READ_VERSION);
    expect(parseArgosStudioVersion(null)).toBeNull();
    expect(parseArgosStudioVersion(READ_VERSION)).toBeNull();
    expect(parseArgosStudioVersion('"a"b"')).toBeNull();
  });
});
