import { afterEach, describe, expect, it, vi } from "vitest";
import { intakePdfSessionCookies } from "@/server/services/value-report-generator/intake-pdf";
afterEach(() => vi.unstubAllEnvs());
describe("existing session scoped to the PDF application origin", () => {
  it("forwards session chunks only, with a domain-scoped cookie instead of a global header", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://application.example.invalid");
    const cookies = intakePdfSessionCookies("https://application.example.invalid", "theme=dark; __Secure-authjs.session-token.0=part-one; __Secure-authjs.session-token.1=part-two; unrelated=private");
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toEqual({ name: "__Secure-authjs.session-token.0", value: "part-one", url: "https://application.example.invalid", httpOnly: true, secure: true, sameSite: "Lax" });
    expect(cookies[1]?.value).toBe("part-two");
  });
  it("rejects an unconfigured foreign host, credentials in URL and non-HTTP URL", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://application.example.invalid");
    for (const url of ["https://foreign.example.invalid", "https://user:pass@application.example.invalid", "file:///tmp/report"]) {
      expect(() => intakePdfSessionCookies(url, "authjs.session-token=private")).toThrow();
    }
  });
  it("can render a paid anonymous report without passing any session cookie", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3399");
    expect(intakePdfSessionCookies("http://localhost:3399")).toEqual([]);
  });
});
