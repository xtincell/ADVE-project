import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), actor: vi.fn(), fetch: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: mocks.actor }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.user } } }));
import { GET, HEAD, PUT, POST } from "@/app/la-barre/[[...path]]/route";
import { barreUpstreamUrl } from "@/server/services/brand-node/barre-connection";
import { barreAccessContact } from "@/app/la-barre/access-page";
import { CONTACT } from "@/components/upgraders/data";

const context = (path = ["depots", "beignet-paradise.json"]) => ({ params: Promise.resolve({ path }) });
const url = "https://workspace.example/la-barre/depots/beignet-paradise.json";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PORTFOLIO_BARRE_OPERATOR_IDS", " agency-a ");
  vi.stubEnv("PORTFOLIO_BARRE_UPSTREAM", "http://private-barre:3000");
  vi.stubEnv("AUTH_URL", ""); vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubEnv("AUTH_SECRET", "secret-de-recette-assez-long");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.user.mockResolvedValue({ id: "actor-a", name: "Personne A" });
  mocks.auth.mockResolvedValue({ user: { id: "actor-a" } });
  mocks.actor.mockResolvedValue({ userId: "actor-a", role: "USER", operatorId: "agency-a" });
  mocks.fetch.mockImplementation(async () => new Response('{"projets":[]}', { headers: { ETag: '"rev-a"', "Content-Type": "application/json" } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("native La Barre through the existing authenticated session", () => {
  it("does not let an anonymous visitor publish a document", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(new Request(url, { method: "POST", body: "{}" }), context(["publication"]));
    expect(response.status).toBe(401); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not turn a team read permission into a publication permission", async () => {
    const response = await POST(new Request(url, { method: "POST", body: "{}", headers: { origin: "https://workspace.example" } }), context(["publication"]));
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("refuses a publication from a foreign origin before consulting the source", async () => {
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
    const response = await POST(new Request(url, { method: "POST", body: "{}", headers: { origin: "https://other.example" } }), context(["publication"]));
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejects an unrecognized publication without exporting anything", async () => {
    mocks.actor.mockResolvedValue({ userId: "actor-a", role: "OPERATOR", operatorId: "agency-a" });
    const response = await POST(new Request(url, { method: "POST", body: '{"projectId":"PRJ-EOTY26","doc":"corpus"}', headers: { origin: "https://workspace.example" } }), context(["publication"]));
    expect(response.status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled();
  });
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
    const write = (ifMatch: string) => PUT(new Request(url, { method: "PUT", body: '{"projets":["proposal"]}', headers: { origin: "https://workspace.example", "content-type": "application/json", "if-match": ifMatch } }), context());
    // A stale revision is refused against the base read from La Barre, before any write (ADR-0245).
    const stale = await write('"stale"');
    expect(stale.status).toBe(409); expect(stale.headers.get("etag")).toBe('"rev-a"');
    expect(await stale.json()).toMatchObject({ code: "REVISION_DEPASSEE", revision: '"rev-a"' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0]![1].method).toBeUndefined();
    // A concurrent write between that read and the write is still refused by La Barre itself.
    mocks.fetch.mockImplementation(async (_: URL, options: RequestInit) => {
      if (options.method !== "PUT") return new Response('{"projets":[]}', { headers: { ETag: '"rev-a"' } });
      expect(await new Response(options.body).text()).toBe('{"projets":["proposal"]}');
      expect(new Headers(options.headers).get("if-match")).toBe('"rev-a"');
      expect(new Headers(options.headers).get("cookie")).toBeNull();
      return new Response('{"conflit":true}', { status: 409, headers: { ETag: '"new"' } });
    });
    const race = await write('"rev-a"');
    expect(race.status).toBe(409); expect(race.headers.get("etag")).toBe('"new"');
    expect(await race.text()).toBe('{"conflit":true}'); expect(mocks.fetch).toHaveBeenCalledTimes(3);
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
    expect((await PUT(new Request("http://localhost:3000/la-barre/depots/beignet-paradise.json", { method: "PUT", body: "{}", headers: { origin: "https://workspace.example", "if-match": '"rev-a"' } }), context())).status).toBe(200);
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

describe("the entrance shows a person the way in, data keeps its plain refusal", () => {
  const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  const index = "https://workspace.example/la-barre/index.html";
  beforeEach(() => { vi.stubEnv("PORTFOLIO_BARRE_CONTACT", "Responsable du studio <studio@agence.example>"); });

  it("treats an in-app browser that sends no Fetch Metadata as a navigation", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request(index + "?vue=revue", { headers: { accept: browser } }), context(["index.html"]));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html%3Fvue%3Drevue");
  });
  it("brings the bare address back to the application after sign-in", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("https://workspace.example/la-barre", { headers: { "sec-fetch-mode": "navigate", accept: browser } }), { params: Promise.resolve({}) });
    expect(response.headers.get("location")).toBe("https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html");
  });
  it.each(["application/xhtml+xml", "text/html;q=0.5", "TEXT/HTML", "application/json, Text/Html ; Q=0.5"])("reads HTML in any spelling of Accept as a navigation (%s)", async (accept) => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request(index, { headers: { accept } }), context(["index.html"]));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html");
  });
  it.each([undefined, "*/*", "application/json", "text/html;q=0, */*"])("keeps the plain 401 of curl and the delivery receipts (Accept %s)", async (accept) => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request(index, { headers: accept ? { accept } : {} }), context(["index.html"]));
    expect(response.status).toBe(401); expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await response.text()).toBe("Connectez-vous pour ouvrir La Barre.");
  });
  it("keeps the plain 401 for a HEAD that accepts anything", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await HEAD(new Request(index, { method: "HEAD", headers: { accept: "*/*" } }), context(["index.html"]));
    expect(response.status).toBe(401); expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
  });
  it.each([["POST", POST], ["HEAD", HEAD]] as const)("gives a %s navigation without session the 401 page, never a redirect", async (method, handler) => {
    mocks.auth.mockResolvedValue(null);
    const response = await handler(new Request(index, { method, headers: { "sec-fetch-mode": "navigate", accept: browser } }), context(["index.html"]));
    expect(response.status).toBe(401); expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    if (method === "POST") expect(await response.text()).toContain("<h1>Connectez-vous pour ouvrir La Barre.</h1>");
    expect(mocks.actor).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("gives a script asking for HTML a readable page, never a redirect to sign in", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request(index, { headers: { accept: "text/html", "sec-fetch-mode": "cors" } }), context(["index.html"]));
    expect(response.status).toBe(401); expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    const html = await response.text();
    expect(html).toContain("<h1>Connectez-vous pour ouvrir La Barre.</h1>");
    expect(html).toContain('<a class="action" href="https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html">Se connecter avec La&nbsp;Fusée</a>');
    expect(html).toContain('href="mailto:studio@agence.example?subject=Acc%C3%A8s%20%C3%A0%20La%20Barre&#38;body=');
    expect(html).toContain("Demander l’accès à Responsable du studio</a>");
    expect(html).not.toMatch(/<script|<form/i);
    expect(mocks.actor).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("tells a signed-in person outside the team whom to ask, without reaching the source", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "actor-b", email: "personne.b@agence.example" } });
    mocks.actor.mockResolvedValue({ userId: "actor-b", role: "OPERATOR", operatorId: "agency-b" });
    const response = await GET(new Request(index, { headers: { "sec-fetch-mode": "navigate", accept: browser } }), context(["index.html"]));
    expect(response.status).toBe(403); expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain("<h1>La Barre n’est pas reliée à votre équipe.</h1>");
    expect(html).toContain("Compte connecté : <strong>personne.b@agence.example</strong>");
    expect(html).toContain("Demander l’accès à Responsable du&nbsp;studio</a>");
    expect(html).toContain(encodeURIComponent("rattacher mon compte personne.b@agence.example"));
    // The other ways out are a list, one link per line, each tall enough for a finger.
    expect(html).toContain('<ul class="autres">\n<li><a href="https://workspace.example/login?callbackUrl=%2Fla-barre%2Findex.html">Se connecter avec un autre compte</a></li>\n<li><a href="/portals">Ouvrir mes espaces La Fusée</a></li>\n</ul>');
    expect(html).toContain(".autres a{display:flex;align-items:center;min-height:44px}");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("keeps the plain 403 for the native application's data requests", async () => {
    mocks.actor.mockResolvedValue({ userId: "actor-b", role: "OPERATOR", operatorId: "agency-b" });
    const response = await GET(new Request(url), context());
    expect(response.status).toBe(403); expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await response.text()).toBe("La Barre n’est pas reliée à votre équipe.");
  });
  it("falls back to La Fusée's public contact and reports an invalid setting once, without its value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      vi.stubEnv("PORTFOLIO_BARRE_CONTACT", "");
      expect(barreAccessContact()).toEqual({ name: "l’équipe La Fusée", email: CONTACT.email });
      expect(warn).not.toHaveBeenCalled();
      // The module reports each new invalid setting once per process. Start from a setting
      // of this test only, so an earlier test or a retry cannot absorb the first report.
      vi.stubEnv("PORTFOLIO_BARRE_CONTACT", "réglage préalable propre à ce test");
      barreAccessContact();
      warn.mockClear();
      const invalid = ["pas une adresse", "Nom <pas-une-adresse>", `${"N".repeat(81)} <studio@agence.example>`, "Studio <studio@agence.example?cc=autre@agence.example>"];
      for (const setting of invalid) {
        vi.stubEnv("PORTFOLIO_BARRE_CONTACT", setting);
        expect(barreAccessContact()).toEqual({ name: "l’équipe La Fusée", email: CONTACT.email });
        expect(barreAccessContact()).toEqual({ name: "l’équipe La Fusée", email: CONTACT.email });
      }
      expect(warn).toHaveBeenCalledTimes(invalid.length);
      expect(String(warn.mock.calls[0]![0])).toContain("PORTFOLIO_BARRE_CONTACT ignoré");
      expect(warn.mock.calls.flat().join(" ")).not.toContain("studio@agence.example");
    } finally { warn.mockRestore(); }
  });
  it("accepts an address alone, in brackets or not, and a name of 80 characters", () => {
    vi.stubEnv("PORTFOLIO_BARRE_CONTACT", "studio@agence.example");
    expect(barreAccessContact()).toEqual({ name: "studio@agence.example", email: "studio@agence.example" });
    vi.stubEnv("PORTFOLIO_BARRE_CONTACT", " <studio@agence.example> ");
    expect(barreAccessContact()).toEqual({ name: "studio@agence.example", email: "studio@agence.example" });
    vi.stubEnv("PORTFOLIO_BARRE_CONTACT", `"${"N".repeat(80)}" <studio@agence.example>`);
    expect(barreAccessContact()).toEqual({ name: "N".repeat(80), email: "studio@agence.example" });
  });
  it("prints the address beside a name, and only once for a contact set without a name", async () => {
    const pages = async () => {
      mocks.auth.mockResolvedValue(null);
      const signIn = await (await GET(new Request(index, { headers: { accept: "text/html", "sec-fetch-mode": "cors" } }), context(["index.html"]))).text();
      mocks.auth.mockResolvedValue({ user: { id: "actor-b", email: "personne.b@agence.example" } });
      mocks.actor.mockResolvedValue({ userId: "actor-b", role: "OPERATOR", operatorId: "agency-b" });
      const team = await (await GET(new Request(index, { headers: { "sec-fetch-mode": "navigate", accept: browser } }), context(["index.html"]))).text();
      return [signIn, team] as const;
    };
    // Shown to the reader, mail links aside.
    const shown = (html: string) => html.replace(/href="[^"]*"/g, "").split("studio@agence.example").length - 1;
    const [namedSignIn, namedTeam] = await pages();
    expect(namedSignIn).toContain("Demander l’accès à Responsable du studio</a> (studio@agence.example).</p>");
    expect(namedTeam).toContain("<p>Adresse : studio@agence.example. Une fois le compte rattaché, rouvrez simplement ce lien.</p>");
    for (const setting of ["<studio@agence.example>", "studio@agence.example"]) {
      vi.stubEnv("PORTFOLIO_BARRE_CONTACT", setting);
      const [signIn, team] = await pages();
      expect(signIn).toContain("Demander l’accès à studio@agence.example</a>.</p>");
      expect(team).toContain("Demander l’accès à&nbsp;studio@agence.example</a>");
      expect(team).toContain("<p>Une fois le compte rattaché, rouvrez simplement ce lien.</p>");
      expect([shown(signIn), shown(team)]).toEqual([1, 1]);
    }
  });
  it("escapes the contact and the account it prints", async () => {
    vi.stubEnv("PORTFOLIO_BARRE_CONTACT", '"<b>Studio</b>" <studio@agence.example>');
    mocks.auth.mockResolvedValue({ user: { id: "actor-b", email: "<img src=x onerror=1>@agence.example" } });
    mocks.actor.mockResolvedValue({ userId: "actor-b", role: "USER", operatorId: null });
    const html = await (await GET(new Request(index, { headers: { accept: browser } }), context(["index.html"]))).text();
    expect(html).toContain("Demander l’accès à&nbsp;&#60;b&#62;Studio&#60;/b&#62;</a>");
    expect(html).not.toContain("<b>"); expect(html).not.toContain("<img src=x");
  });
});
