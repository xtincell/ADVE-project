/**
 * Panneau « Clés système » — booléens ONLY, jamais la valeur (ADR-0075).
 */
import { describe, it, expect, afterEach } from "vitest";
import { getSystemKeyStatus } from "@/server/services/anubis/system-keys";

const SAVED = { ...process.env };
afterEach(() => {
  process.env = { ...SAVED };
});

describe("getSystemKeyStatus", () => {
  it("ne renvoie que des booléens configured — jamais de valeur", () => {
    process.env.APIFY_TOKEN = "super-secret-token-value";
    const groups = getSystemKeyStatus();
    const flat = groups.flatMap((g) => g.keys);
    const serialized = JSON.stringify(groups);
    expect(serialized).not.toContain("super-secret-token-value");
    for (const k of flat) {
      expect(typeof k.configured).toBe("boolean");
      expect(k).not.toHaveProperty("value");
    }
  });

  it("reflète présence/absence d'une clé", () => {
    process.env.APIFY_TOKEN = "x";
    delete process.env.BRAVE_API_KEY;
    const groups = getSystemKeyStatus();
    const flat = groups.flatMap((g) => g.keys);
    expect(flat.find((k) => k.key === "APIFY_TOKEN")?.configured).toBe(true);
    expect(flat.find((k) => k.key === "BRAVE_API_KEY")?.configured).toBe(false);
  });

  it("une valeur vide ou blanche compte comme manquante", () => {
    process.env.APIFY_TOKEN = "   ";
    const flat = getSystemKeyStatus().flatMap((g) => g.keys);
    expect(flat.find((k) => k.key === "APIFY_TOKEN")?.configured).toBe(false);
  });
});
