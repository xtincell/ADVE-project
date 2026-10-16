import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), actor: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: mocks.actor }));
import { GET, HEAD, PUT } from "@/app/la-barre/[[...path]]/route";
import { barreUpstreamUrl } from "@/server/services/brand-node/barre-connection";

const context = (path = ["depots", "beignet-paradise.json"]) => ({ params: Promise.resolve({ path }) });
const url = "https://workspace.example/la-barre/depots/beignet-paradise.json";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PORTFOLIO_BARRE_OPERATOR_IDS", " agency-a ");
  vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://private-barre:3000");
  vi.stubEnv("AUTH_URL", ""); vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.auth.mockResolvedValue({ user: { id: "actor-a" } });
  mocks.actor.mockResolvedValue({ userId: "actor-a", role: "USER", operatorId: "agency-a" });
  mocks.fetch.mockImplementation(async () => new Response('{"projets":[]}', { headers: { ETag: '"rev-a"', "Content-Type": "application/json" } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("native La Barre through the existing authenticated session", () => {
  it("refuses anonymous corpus reads and writes without touching the source", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(new Request(url), context())).status).toBe(401);
    expect((await PUT(new Request(url, { method: "PUT", body: "{}" }), context())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.actor).not.toHaveBeenCalled();
  });
  it("sends a navigation to the existing login with a same-origin return", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("https://workspace.example/la-barre/index.html", { headers: { "sec-fetch-mode": "navigate" } }), context(["index.html"]));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html");
  });
  it("refuses another company even when its query supplies the configured operator", async () => {
    mocks.actor.mockResolvedValue({ userId: "actor-b", role: "OPERATOR", operatorId: "agency-b" });
    const response = await GET(new Request(url + "?operator=agency-a"), context());
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("reads the current assignment on each call and stops after a revocation", async () => {
    expect((await GET(new Request(url), context())).status).toBe(200);
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "USER", operatorId: null });
    expect((await GET(new Request(url), context())).status).toBe(403);
    expect(mocks.actor).toHaveBeenCalledTimes(2); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("conserves bytes and revision, without forwarding cookies, authorization or operator headers", async () => {
    const response = await GET(new Request(url, { headers: { cookie: "private-session", authorization: "private-access", "x-operator-id": "agency-a" } }), context());
    expect(await response.text()).toBe('{"projets":[]}');
    expect(response.headers.get("etag")).toBe('"rev-a"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [target, options] = mocks.fetch.mock.calls[0]!;
    expect(String(target)).toBe("http://private-barre:3000/depots/beignet-paradise.json");
    expect([...options.headers.keys()]).toEqual([]);
  });
  it("preserves a conditional write and the source's conflict without retry or overwrite", async () => {
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
    mocks.fetch.mockImplementation(async (_: URL, options: RequestInit) => {
      expect(await new Response(options.body).text()).toBe('{"projets":["proposal"]}');
      expect(new Headers(options.headers).get("if-match")).toBe('"stale"');
      return new Response('{"conflit":true}', { status: 409, headers: { ETag: '"new"' } });
    });
    const response = await PUT(new Request(url, { method: "PUT", body: '{"projets":["proposal"]}', headers: { origin: "https://workspace.example", "content-type": "application/json", "if-match": '"stale"' } }), context());
    expect(response.status).toBe(409); expect(response.headers.get("etag")).toBe('"new"');
    expect(await response.text()).toBe('{"conflit":true}'); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, "https://other.example"])("rejects a write from origin %s", async (origin) => {
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
    const response = await PUT(new Request(url, { method: "PUT", body: "{}", headers: origin ? { origin } : {} }), context());
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("a team read permission alone does not grant editing", async () => {
    const response = await PUT(new Request(url, { method: "PUT", body: "{}", headers: { origin: "https://workspace.example" } }), context());
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("uses the configured public auth origin behind an internal HTTP proxy", async () => {
    vi.stubEnv("AUTH_URL", "https://workspace.example");
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost:3000/la-barre/index.html", { headers: { "sec-fetch-mode": "navigate" } }), context(["index.html"]));
    expect(response.headers.get("location")).toContain("https://workspace.example/login?");
    mocks.auth.mockResolvedValue({ user: { id: "actor-a" } });
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
    expect((await PUT(new Request("http://localhost:3000/la-barre/depots/beignet-paradise.json", { method: "PUT", body: "{}", headers: { origin: "https://workspace.example" } }), context())).status).toBe(200);
  });
  it.each([[".env"], ["assets", "production", "original.psd"], ["disque", "matanga", "secret"], ["app", "..", "config"], ["assets", "%2e%2e", "secret"]])("refuses non-native or ambiguous paths %j", async (...path) => {
    expect((await GET(new Request(url), context(path))).status).toBe(404); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("keeps a real file name with accents and spaces and the native video range", async () => {
    mocks.fetch.mockResolvedValue(new Response("clip", { status: 206, headers: { "Content-Range": "bytes 0-3/30", "Content-Type": "video/mp4" } }));
    const response = await GET(new Request(url, { headers: { range: "bytes=0-3" } }), context(["assets", "review", "La fête.mp4"]));
    expect(response.status).toBe(206); expect(response.headers.get("content-range")).toBe("bytes 0-3/30");
    expect(mocks.fetch.mock.calls[0]![0].href).toContain("La%20f%C3%AAte.mp4");
    expect(mocks.fetch.mock.calls[0]![1].headers.get("range")).toBe("bytes=0-3");
  });
  it("HEAD does not transmit a body and source failure is not an empty corpus", async () => {
    expect(await (await HEAD(new Request(url, { method: "HEAD" }), context())).text()).toBe("");
    mocks.fetch.mockRejectedValue(new Error("source down"));
    expect((await GET(new Request(url), context())).status).toBe(503);
  });
  it("a missing connection never falls back to the former public source", async () => {
    vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "");
    expect((await GET(new Request(url), context())).status).toBe(503); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not accept installation addresses with credentials, query or directory", () => {
    for (const value of ["https://user:secret@host", "https://host/dir/", "https://host/?target=other", "file:///etc/"]) {
      vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", value);
      expect(() => barreUpstreamUrl(["index.html"])).toThrow();
    }
  });
});
