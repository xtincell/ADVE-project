import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const jwt = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("next-auth/jwt", () => jwt);
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
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
    jwt.getToken.mockResolvedValueOnce({ role: "USER" });
    const response = await proxy(request("https://powerupgraders.com/console/artemis/interventions", true));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/unauthorized");
  });
});
