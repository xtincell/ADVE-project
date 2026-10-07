import { describe, expect, it } from "vitest";
import { classifyPageProbe, pageRouteFromFile } from "../../../scripts/_stress_helpers";

describe("HTTP page routes", () => {
  it.each([
    ["src/app/(marketing)/page.tsx", "/"],
    ["src/app/page.tsx", "/"],
    ["src/app/(console)/console/artemis/missions/page.tsx", "/console/artemis/missions"],
    ["src/app/(public)/b/[slug]/page.tsx", "/b/demo"],
  ])("uses a navigable route for %s", (file, expected) => {
    expect(pageRouteFromFile(file)).toBe(expected);
  });
});

describe("HTTP crawl receipt, distinct from native UI acceptance", () => {
  it("rejects a login page reached with a supposedly valid session", () => {
    expect(classifyPageProbe(200, "http://localhost/console/artemis", "http://localhost/login?callbackUrl=x", true))
      .toMatchObject({ state: "FAILED", category: "AUTH_REDIRECT", severity: "ERROR" });
  });
  it("rejects a role refusal reached behind an authenticated redirect", () => {
    expect(classifyPageProbe(200, "https://powerupgraders.com/console", "https://powerupgraders.com/unauthorized", true))
      .toMatchObject({ state: "FAILED", category: "AUTH_REDIRECT" });
  });
  it("keeps an anonymous authentication gate unreceived, never successful", () => {
    expect(classifyPageProbe(200, "http://localhost/cockpit", "http://localhost/login", false))
      .toMatchObject({ state: "UNRECEIVED" });
  });
  it.each([401, 403])("flags a direct authenticated refusal %s", (status) => {
    expect(classifyPageProbe(status, "http://localhost/console", "http://localhost/console", true))
      .toMatchObject({ state: "FAILED", category: "AUTH_REJECTED" });
  });
  it("does not count a missing demo identity as a received page", () => {
    expect(classifyPageProbe(404, "http://localhost/b/demo", "http://localhost/b/demo", true))
      .toMatchObject({ state: "UNRECEIVED" });
  });
  it("accepts a deliberate login-page probe and a successful canonical redirect", () => {
    expect(classifyPageProbe(200, "http://localhost/login", "http://localhost/login", true).state).toBe("RECEIVED");
    expect(classifyPageProbe(200, "http://localhost/console/fusee/missions", "http://localhost/console/artemis/missions", true).state).toBe("RECEIVED");
  });
  it("keeps server failures as errors", () => {
    expect(classifyPageProbe(500, "http://localhost/cockpit", "http://localhost/cockpit", true))
      .toMatchObject({ state: "FAILED", severity: "ERROR" });
  });
});
