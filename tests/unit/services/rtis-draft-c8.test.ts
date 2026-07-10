/**
 * Vague D — C8 (Seshat→T nom-vs-réalité). Le draft T ne peut plus citer
 * `marketSize.source: "Seshat"` sans qu'un digest marché réel
 * (EXTERNAL_FEED_DIGEST) ait été injecté dans son prompt :
 *   1. loadMarketDigestForT charge le digest frais (countryCode résolu +
 *      secteur insensible) et le formate avec la RÈGLE de provenance ;
 *   2. enforceSeshatProvenance (pur, zéro LLM) rétrograde tout "Seshat"
 *      auto-proclamé en "inferred" quand aucun digest n'a été trouvé.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    knowledgeEntry: { findFirst: (...args: unknown[]) => findFirstMock(...args) },
    strategy: { findMany: vi.fn().mockResolvedValue([]) },
    pillar: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/server/services/country-registry", () => ({
  lookupCountry: vi.fn(async (name: string) =>
    name.toLowerCase().includes("cameroun") ? { code: "CM", currencyCode: "XAF" } : null,
  ),
}));

import { loadMarketDigestForT, enforceSeshatProvenance } from "@/server/services/quick-intake/rtis-draft";

beforeEach(() => {
  findFirstMock.mockReset();
});

describe("enforceSeshatProvenance (garde déterministe)", () => {
  it("sans digest : 'Seshat' auto-proclamé → 'inferred'", () => {
    const out = enforceSeshatProvenance(
      { marketSize: { value: "12 Mds FCFA", source: "Seshat" }, narrative: "x" },
      false,
    );
    expect((out.marketSize as { source: string }).source).toBe("inferred");
    expect(out.narrative).toBe("x"); // le reste est intact
  });

  it("avec digest : la provenance déclarée est conservée", () => {
    const draft = { marketSize: { value: "12 Mds FCFA", source: "Seshat" } };
    expect(enforceSeshatProvenance(draft, true)).toBe(draft);
  });

  it("sans champ marketSize ou déjà 'ADVE'/'inferred' : no-op", () => {
    expect(enforceSeshatProvenance({ narrative: "x" }, false)).toEqual({ narrative: "x" });
    const adve = { marketSize: { value: "3 boutiques", source: "ADVE" } };
    expect(enforceSeshatProvenance(adve, false)).toBe(adve);
  });
});

describe("loadMarketDigestForT", () => {
  it("résout le pays libre → ISO-2, charge le digest frais et formate la RÈGLE", async () => {
    findFirstMock.mockResolvedValue({
      countryCode: "CM",
      sector: "fmcg",
      createdAt: new Date("2026-07-09T06:00:00Z"),
      data: {
        macroSignals: [
          { label: "Croissance PIB", value: "3,9 %" },
          { label: "Inflation", value: "5,2 %" },
        ],
        trendTracker: { pibParHabitant: "1 660 USD", penetrationInternet: "45 %" },
      },
    });
    const res = await loadMarketDigestForT("Cameroun", "FMCG");
    expect(res.found).toBe(true);
    expect(res.block).toContain("DONNÉES MARCHÉ RÉELLES");
    expect(res.block).toContain("Croissance PIB : 3,9 %");
    expect(res.block).toContain("pibParHabitant");
    expect(res.block).toContain('"source": "Seshat" UNIQUEMENT');
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entryType: "EXTERNAL_FEED_DIGEST", countryCode: "CM" }),
      }),
    );
  });

  it("aucun digest → found=false (la garde rétrogradera 'Seshat')", async () => {
    findFirstMock.mockResolvedValue(null);
    const res = await loadMarketDigestForT("CM", "cosmétique");
    expect(res).toEqual({ found: false, block: "" });
  });

  it("digest vide (aucun signal exploitable) → found=false, pas de bloc creux", async () => {
    findFirstMock.mockResolvedValue({
      countryCode: "CM",
      sector: "fmcg",
      createdAt: new Date(),
      data: { macroSignals: [], trendTracker: {} },
    });
    const res = await loadMarketDigestForT("CM", "fmcg");
    expect(res.found).toBe(false);
  });

  it("erreur DB → found=false, jamais de throw", async () => {
    findFirstMock.mockRejectedValue(new Error("db down"));
    await expect(loadMarketDigestForT("CM", "fmcg")).resolves.toEqual({ found: false, block: "" });
  });
});
