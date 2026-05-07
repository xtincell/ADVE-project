import { describe, it, expect } from "vitest";
import { buildMarketResearchPrompt } from "@/server/services/artemis/market-research/prompt-builder";
import { isUrlAllowed } from "@/server/services/artemis/market-research/web-fetcher";

const fakeFetched = (url: string, ok: boolean, text?: string) => ({
  url,
  ok,
  status: ok ? 200 : 0,
  contentType: "text/html",
  text: ok ? (text ?? "<html>...</html>") : undefined,
  error: ok ? undefined : "fail",
  bytesRead: ok ? (text ?? "...").length : 0,
});

describe("buildMarketResearchPrompt — system prompt invariants", () => {
  it("encodes the structured-market-study/v1 contract in the system prompt", () => {
    const built = buildMarketResearchPrompt({
      query: "What is the cosmetics market in ZA?",
      countryCode: "ZA",
      sector: "cosmetics",
      sources: [],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    expect(built.system).toContain("structured-market-study/v1");
    expect(built.system).toContain("scoping.countryCode\` est exactement \`ZA\`");
    expect(built.system).toContain("scoping.sector\` est exactement \`cosmetics\`");
    expect(built.system).toContain("Pas de placeholders");
    expect(built.system).toContain("§1");
    expect(built.system).toContain("§10");
  });

  it("activates memory-only mode when no sources provided", () => {
    const built = buildMarketResearchPrompt({
      query: "Q",
      countryCode: "CM",
      sector: "telco",
      sources: [],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    expect(built.system).toContain("MODE MÉMOIRE-MODÈLE");
    expect(built.system).not.toContain("MODE SOURCES :");
    expect(built.sourcesIncluded).toBe(0);
  });

  it("activates source mode when at least one fetched source is OK", () => {
    const built = buildMarketResearchPrompt({
      query: "Q",
      countryCode: "ZA",
      sector: "cosmetics",
      sources: [fakeFetched("https://example.com/a", true, "Some content")],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    expect(built.system).toContain("MODE SOURCES");
    expect(built.system).not.toContain("MODE MÉMOIRE-MODÈLE");
    expect(built.sourcesIncluded).toBe(1);
    expect(built.prompt).toContain("[Source 1] https://example.com/a");
    expect(built.prompt).toContain("Some content");
  });

  it("includes failed sources in a separate ignored block", () => {
    const built = buildMarketResearchPrompt({
      query: "Q",
      countryCode: "ZA",
      sector: "cosmetics",
      sources: [
        fakeFetched("https://ok.com", true, "ok"),
        fakeFetched("https://fail.com", false),
      ],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    expect(built.prompt).toContain("[Sources non récupérées — à ignorer dans la rédaction]");
    expect(built.prompt).toContain("https://fail.com");
    expect(built.sourcesIncluded).toBe(1);
  });

  it("trims oversized source content to fit budget", () => {
    const longText = "x".repeat(20_000);
    const built = buildMarketResearchPrompt({
      query: "Q",
      countryCode: "ZA",
      sector: "cosmetics",
      sources: [fakeFetched("https://big.com", true, longText)],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    expect(built.prompt).toContain("[truncated]");
    expect(built.prompt.length).toBeLessThan(85_000);
  });

  it("includes the 49 Trend Tracker codes in the system prompt", () => {
    const built = buildMarketResearchPrompt({
      query: "Q",
      countryCode: "ZA",
      sector: "cosmetics",
      sources: [],
      generatedAt: "2026-05-07T12:00:00Z",
    });
    for (const code of ["A1", "A12", "B3", "C1", "D7", "E12"]) {
      expect(built.system).toContain(code);
    }
  });
});

describe("isUrlAllowed — SSRF hardening", () => {
  it("accepts public http and https URLs", () => {
    expect(isUrlAllowed("https://www.statista.com/foo")).toEqual({ ok: true, url: expect.any(URL) });
    expect(isUrlAllowed("http://example.com/")).toEqual({ ok: true, url: expect.any(URL) });
  });

  it("rejects non-http(s) schemes", () => {
    expect(isUrlAllowed("file:///etc/passwd").ok).toBe(false);
    expect(isUrlAllowed("ftp://example.com/").ok).toBe(false);
    expect(isUrlAllowed("javascript:alert(1)").ok).toBe(false);
    expect(isUrlAllowed("gopher://attacker.com").ok).toBe(false);
  });

  it("rejects loopback and link-local hosts", () => {
    expect(isUrlAllowed("http://localhost/").ok).toBe(false);
    expect(isUrlAllowed("http://127.0.0.1/").ok).toBe(false);
    expect(isUrlAllowed("http://0.0.0.0/").ok).toBe(false);
    expect(isUrlAllowed("http://169.254.169.254/").ok).toBe(false); // AWS metadata
    expect(isUrlAllowed("http://[::1]/").ok).toBe(false);
  });

  it("rejects RFC1918 private ranges", () => {
    expect(isUrlAllowed("http://10.0.0.1/").ok).toBe(false);
    expect(isUrlAllowed("http://192.168.1.1/").ok).toBe(false);
    expect(isUrlAllowed("http://172.16.0.1/").ok).toBe(false);
    expect(isUrlAllowed("http://172.31.255.255/").ok).toBe(false);
  });

  it("rejects .local and .internal domains", () => {
    expect(isUrlAllowed("http://service.local/").ok).toBe(false);
    expect(isUrlAllowed("http://api.internal/").ok).toBe(false);
  });

  it("accepts public 172.x ranges outside RFC1918", () => {
    // 172.32.x.x is public (RFC1918 only covers 172.16-31)
    const r = isUrlAllowed("http://172.32.0.1/");
    expect(r.ok).toBe(true);
  });

  it("rejects malformed URLs", () => {
    expect(isUrlAllowed("not a url").ok).toBe(false);
    expect(isUrlAllowed("").ok).toBe(false);
  });
});
