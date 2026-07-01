import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { braveWebSearch, formatWebHits, isBraveConfigured } from "@/server/services/seshat/web-search";

/**
 * web-search — point d'accès internet canonique de Seshat (ADR-0108).
 *
 * Zéro mock : on teste la dégradation honnête sans clé (DEFERRED_NO_KEY) en
 * manipulant `process.env.BRAVE_API_KEY` réel, et le formateur pur. Le chemin
 * réseau réel (status OK) n'est pas testé ici — il dépend d'une clé + du réseau.
 */

describe("seshat/web-search — braveWebSearch (dégradation honnête)", () => {
  const original = process.env.BRAVE_API_KEY;
  beforeEach(() => {
    delete process.env.BRAVE_API_KEY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.BRAVE_API_KEY;
    else process.env.BRAVE_API_KEY = original;
  });

  it("sans BRAVE_API_KEY → DEFERRED_NO_KEY, jamais de throw, jamais de résultat inventé", async () => {
    expect(isBraveConfigured()).toBe(false);
    const res = await braveWebSearch("burger king wrap croustillant");
    expect(res.status).toBe("DEFERRED_NO_KEY");
    if (res.status === "OK") throw new Error("ne doit pas arriver");
  });

  it("isBraveConfigured reflète la présence de la clé", () => {
    process.env.BRAVE_API_KEY = "test-key";
    expect(isBraveConfigured()).toBe(true);
    delete process.env.BRAVE_API_KEY;
    expect(isBraveConfigured()).toBe(false);
  });
});

describe("seshat/web-search — formatWebHits (pur)", () => {
  it("liste vide → chaîne vide", () => {
    expect(formatWebHits([])).toBe("");
  });

  it("formate titre, url et description", () => {
    const out = formatWebHits([
      { title: "BK Wrap", url: "https://example.com/bk", description: "La campagne wrap croustillant" },
      { title: "Sans desc", url: "https://example.com/2", description: "" },
    ]);
    expect(out).toContain("BK Wrap");
    expect(out).toContain("https://example.com/bk");
    expect(out).toContain("La campagne wrap croustillant");
    expect(out).toContain("https://example.com/2");
    expect(out).toContain("[1]");
    expect(out).toContain("[2]");
  });
});
