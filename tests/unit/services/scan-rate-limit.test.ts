/**
 * ADR-0161 — rate-limit du scoreur sur store partagé : résolution de l'IP
 * client réelle derrière la chaîne Cloudflare → Traefik → Next. Pur, zéro IO.
 */

import { describe, it, expect } from "vitest";
import { resolveClientIp } from "@/server/services/seshat/scan-rate-limit";

function headers(map: Record<string, string>): { get(name: string): string | null } {
  const lower = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

describe("resolveClientIp (ADR-0161)", () => {
  it("cf-connecting-ip prime sur tout (posé par Cloudflare, non falsifiable en aval)", () => {
    const h = headers({
      "cf-connecting-ip": "41.202.10.9",
      "x-real-ip": "10.0.0.2",
      "x-forwarded-for": "10.0.0.2, 172.16.0.1",
    });
    expect(resolveClientIp(h)).toBe("41.202.10.9");
  });

  it("x-real-ip ensuite (Traefik sans Cloudflare)", () => {
    const h = headers({ "x-real-ip": "196.1.95.3", "x-forwarded-for": "196.1.95.3, 172.16.0.1" });
    expect(resolveClientIp(h)).toBe("196.1.95.3");
  });

  it("x-forwarded-for : premier hop uniquement (jamais l'IP du proxy)", () => {
    const h = headers({ "x-forwarded-for": " 102.244.1.7 , 172.18.0.4, 127.0.0.1" });
    expect(resolveClientIp(h)).toBe("102.244.1.7");
  });

  it("aucun en-tête → seau global anon (jamais un throw)", () => {
    expect(resolveClientIp(headers({}))).toBe("anon");
    expect(resolveClientIp(null)).toBe("anon");
    expect(resolveClientIp(undefined)).toBe("anon");
  });

  it("en-têtes vides/blancs → fallback propre", () => {
    const h = headers({ "cf-connecting-ip": "  ", "x-forwarded-for": "" });
    expect(resolveClientIp(h)).toBe("anon");
  });
});
