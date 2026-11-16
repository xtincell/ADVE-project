import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const jwt = vi.hoisted(() => ({ getToken: vi.fn() }));
const users = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("next-auth/jwt", () => jwt);
vi.mock("@/lib/db", () => ({ db: { user: users } }));
vi.mock("@/lib/auth/god-mode", () => ({ isGodModeEmail: (email: unknown) => email === "founder@example.test" }));
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  users.findUnique.mockReset().mockResolvedValue({ role: "USER", email: "member@example.test" });
  jwt.getToken.mockReset().mockImplementation(async (options) => {
    const name = `${options.secureCookie ? "__Secure-" : ""}authjs.session-token=fixture`;
    return options.req.headers.get("cookie")?.includes(name) ? { role: "ADMIN" } : null;
  });
});
afterEach(() => vi.unstubAllEnvs());
function request(url: string, secure: boolean, forwarded?: string) {
  const headers = new Headers({ host: new URL(url).host, cookie: `${secure ? "__Secure-" : ""}authjs.session-token=fixture` });
  if (forwarded) headers.set("x-forwarded-proto", forwarded);
  return new NextRequest(url, { headers });
}
describe("protected page cookie selection under production mode", () => {
  it.each(["127.0.0.1:3317", "localhost:3100"])("accepts the real HTTP cookie shape on %s", async (host) => {
    const response = await proxy(request(`http://${host}/cockpit/operate/requests`, false));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(jwt.getToken.mock.calls[0]![0].secureCookie).toBe(false);
  });
  it.each([
    ["https://powerupgraders.com/cockpit", undefined],
    ["http://powerupgraders.com/cockpit", "https"],
    ["http://powerupgraders.com/cockpit", undefined],
    ["https://localhost:3100/cockpit", undefined],
  ])("keeps Secure cookies for public production or TLS: %s", async (url, forwarded) => {
    const response = await proxy(request(url!, true, forwarded));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(jwt.getToken.mock.calls[0]![0].secureCookie).toBe(true);
  });
  it("still refuses a missing session locally", async () => {
    const response = await proxy(new NextRequest("http://127.0.0.1:3317/cockpit", { headers: { host: "127.0.0.1:3317" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?");
  });
  it("still refuses a founder on the operator console", async () => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "USER" });
    const response = await proxy(request("https://powerupgraders.com/console/artemis/interventions", true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/unauthorized");
  });
});

describe("operator pages use the current persisted identity", () => {
  it.each(["/console/governance/accounts", "/launchpad"])("refuses a stale ADMIN cookie on %s after demotion", async (route) => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "ADMIN" });
    const response = await proxy(request(`https://powerupgraders.com${route}`, true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://powerupgraders.com/unauthorized");
    expect(users.findUnique).toHaveBeenCalledWith({ where: { id: "member" }, select: { role: true, email: true } });
  });

  it("redirects a deleted account to login without granting its old role", async () => {
    jwt.getToken.mockResolvedValueOnce({ id: "deleted", role: "ADMIN", email: "founder@example.test" });
    users.findUnique.mockResolvedValueOnce(null);
    const response = await proxy(request("https://powerupgraders.com/console", true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?callbackUrl=%2Fconsole");
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it.each([undefined, null, "", "  ", 42])("refuses incomplete identity %s before a database lookup", async (id) => {
    jwt.getToken.mockResolvedValueOnce({ id, role: "ADMIN", email: "founder@example.test" });
    const response = await proxy(request("https://powerupgraders.com/console", true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?");
    expect(users.findUnique).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "OPERATOR"])("accepts a current %s despite an older USER cookie", async (role) => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "USER" });
    users.findUnique.mockResolvedValueOnce({ role, email: "member@example.test" });
    const response = await proxy(request("https://powerupgraders.com/launchpad", true));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("honors god-mode only for the current email of an existing account", async () => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "USER", email: "previous@example.test" });
    users.findUnique.mockResolvedValueOnce({ role: "USER", email: "founder@example.test" });
    const response = await proxy(request("https://powerupgraders.com/console", true));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not trust an old god-mode email in the cookie", async () => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "ADMIN", email: "founder@example.test" });
    const response = await proxy(request("https://powerupgraders.com/console", true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/unauthorized");
  });

  it("fails closed on database outage without exposing its error or expiring the session", async () => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "ADMIN" });
    users.findUnique.mockRejectedValueOnce(new Error("private-database-detail"));
    const response = await proxy(request("https://powerupgraders.com/console", true));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("private-database-detail");
  });

  it.each(["/cockpit", "/creator", "/intake", "/"])("does not add a database lookup to %s", async (route) => {
    jwt.getToken.mockResolvedValueOnce({ id: "member", role: "USER" });
    const response = await proxy(request(`https://powerupgraders.com${route}`, true));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(users.findUnique).not.toHaveBeenCalled();
  });
});
