/**
 * Vague C — feeds dynamiques : les paires pays×secteur suivent les stratégies
 * RÉELLES en base (un client Sénégal/cosmétique reçoit ses données marché sans
 * édition de code), les PRIORITY_PAIRS statiques restent en tête, dédupliquées,
 * le tout plafonné. Erreur DB → statique seul (jamais de throw).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    strategy: { findMany: (...args: unknown[]) => findManyMock(...args) },
    knowledgeEntry: { findFirst: vi.fn(), create: vi.fn() },
    signal: { createMany: vi.fn() },
  },
}));

import { listActiveFeedPairs, normalizeSectorKey, PRIORITY_PAIRS } from "@/server/services/seshat/external-feeds";

beforeEach(() => {
  findManyMock.mockReset();
});

describe("normalizeSectorKey", () => {
  it("minuscule + espaces réduits ; rejette les secteurs trop courts", () => {
    expect(normalizeSectorKey("  FMCG   / Agro ")).toBe("fmcg / agro");
    expect(normalizeSectorKey("ab")).toBeNull();
    expect(normalizeSectorKey("   ")).toBeNull();
  });
});

describe("listActiveFeedPairs", () => {
  it("statique en tête + paires dérivées des stratégies, dédupliquées", async () => {
    findManyMock.mockResolvedValue([
      { countryCode: "SN", businessContext: { sector: "Cosmétique" } },
      { countryCode: "CM", businessContext: { sector: "fmcg" } }, // doublon du statique
      { countryCode: "sn", businessContext: { sector: "cosmétique" } }, // doublon casse
      { countryCode: "GA", businessContext: { sector: "x" } }, // secteur trop court → drop
      { countryCode: "BJ", businessContext: null }, // pas de secteur → drop
    ]);
    const pairs = await listActiveFeedPairs();

    // Statique intact et en tête.
    expect(pairs.slice(0, PRIORITY_PAIRS.length)).toEqual(PRIORITY_PAIRS);
    // Dérivée unique : SN/cosmétique une seule fois, CM/fmcg non dupliqué.
    const derived = pairs.slice(PRIORITY_PAIRS.length);
    expect(derived).toEqual([{ countryCode: "SN", sector: "cosmétique" }]);
    // Seules les stratégies non archivées avec countryCode sont considérées.
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ countryCode: { not: null }, status: { not: "ARCHIVED" } }),
      }),
    );
  });

  it("plafonne le total (borne de coût du refresh)", async () => {
    findManyMock.mockResolvedValue(
      Array.from({ length: 60 }, (_, i) => ({
        countryCode: `Z${String.fromCharCode(65 + (i % 26))}`,
        businessContext: { sector: `secteur-${i}` },
      })),
    );
    const pairs = await listActiveFeedPairs();
    expect(pairs.length).toBeLessThanOrEqual(24);
    expect(pairs.slice(0, PRIORITY_PAIRS.length)).toEqual(PRIORITY_PAIRS); // le statique n'est jamais évincé
  });

  it("erreur DB → fallback statique seul, jamais de throw", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));
    const pairs = await listActiveFeedPairs();
    expect(pairs).toEqual(PRIORITY_PAIRS);
  });
});
