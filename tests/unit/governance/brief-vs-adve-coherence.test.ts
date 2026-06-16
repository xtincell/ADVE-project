/**
 * C6 — BRIEF_VS_ADVE_COHERENCE gate (PROPAGATION-MAP §6b).
 *
 * Was a Phase 23 Story 1.8 scaffold (threw NOT_YET_IMPLEMENTED). Now a real
 * deterministic advisory gate. This test enforces:
 *   1. Registry wiring unchanged (key + identity + governor MESTOR).
 *   2. Pure coherence helper: NOT_APPLICABLE / COHERENT / DIVERGENT bands +
 *      determinism (variance = 0, LOI 9 — no LLM).
 *   3. Gate verdicts: PASS on empty/short ADVE, WARN on divergence, PASS on
 *      coherent brief — exercised against a stub db (no real I/O).
 */

import { describe, expect, it } from "vitest";

import { MESTOR_GATE_KEYS, mestorGates } from "@/server/services/mestor/gates";
import {
  briefVsAdveCoherenceGate,
} from "@/server/services/mestor/gates/brief-vs-adve-coherence";
import {
  computeBriefAdveCoherence,
  tokenizeForCoherence,
  flattenPillarText,
} from "@/server/services/mestor/gates/brief-adve-coherence-score";
import type { GateContext } from "@/server/services/mestor/gates/gate-types";

/** Minimal PrismaClient stub: only pillar.findMany, returns the given contents. */
function stubDb(contents: unknown[]): GateContext["db"] {
  return {
    pillar: {
      findMany: async () => contents.map((content) => ({ content })),
    },
  } as unknown as GateContext["db"];
}

describe("C6 — registry wiring (unchanged)", () => {
  it("registers under the canonical key with MESTOR governor + identity", () => {
    expect(MESTOR_GATE_KEYS).toContain("BRIEF_VS_ADVE_COHERENCE");
    expect(mestorGates.BRIEF_VS_ADVE_COHERENCE.governor).toBe("MESTOR");
    expect(mestorGates.BRIEF_VS_ADVE_COHERENCE.handler).toBe(briefVsAdveCoherenceGate);
  });
});

describe("C6 — pure coherence helper (deterministic, no LLM)", () => {
  it("tokenizes lowercased, accent-stripped, stopword-free, ≥3 chars", () => {
    const t = tokenizeForCoherence("La Marque Écologique propose des thés bio");
    expect(t.has("marque")).toBe(true);
    expect(t.has("ecologique")).toBe(true); // accent stripped
    expect(t.has("thes")).toBe(true);
    expect(t.has("les")).toBe(false); // stopword
    expect(t.has("des")).toBe(false); // stopword
  });

  it("flattens nested pillar content to text, skipping _meta keys", () => {
    const text = flattenPillarText({
      mission: "révolutionner le thé",
      values: ["authenticité", "audace"],
      _commentary: { note: "SECRET" },
    });
    expect(text).toContain("révolutionner");
    expect(text).toContain("authenticité");
    expect(text).not.toContain("SECRET");
  });

  it("NOT_APPLICABLE when ADVE noyau is too thin", () => {
    const r = computeBriefAdveCoherence(
      "un brief riche en vocabulaire stratégique différenciant",
      "court",
    );
    expect(r.band).toBe("NOT_APPLICABLE");
  });

  it("DIVERGENT when brief vocabulary is disjoint from ADVE", () => {
    const r = computeBriefAdveCoherence(
      "tournoi football stade billetterie supporters maillot pelouse arbitre",
      "marque thé biologique infusion plantes terroir artisanal récolte producteurs durabilité",
    );
    expect(r.band).toBe("DIVERGENT");
    expect(r.score).toBeLessThan(0.1);
  });

  it("COHERENT when brief declines the ADVE vocabulary", () => {
    const adve =
      "marque thé biologique infusion plantes terroir artisanal récolte producteurs durabilité";
    const r = computeBriefAdveCoherence(
      "campagne autour du thé biologique et du terroir, mettant en avant les producteurs artisanaux",
      adve,
    );
    expect(r.band).toBe("COHERENT");
    expect(r.sharedTokens).toContain("biologique");
  });

  it("is deterministic (variance = 0 over 100 calls)", () => {
    const a = "campagne thé biologique terroir producteurs artisanaux durabilité";
    const b = "marque thé biologique infusion plantes terroir artisanal producteurs";
    const scores = Array.from({ length: 100 }, () => computeBriefAdveCoherence(a, b).score);
    expect(new Set(scores).size).toBe(1);
  });
});

describe("C6 — gate verdicts (stub db, no real I/O)", () => {
  it("PASS (NOT_APPLICABLE) when ADVE pillars are empty", async () => {
    const r = await briefVsAdveCoherenceGate(
      { strategyId: "s1", brief: { content: "un brief riche en vocabulaire stratégique" } },
      { db: stubDb([]) },
    );
    expect(r.verdict).toBe("PASS");
  });

  it("WARN when the brief diverges from an established ADVE noyau", async () => {
    const adve = [
      { mission: "marque thé biologique infusion plantes terroir artisanal" },
      { distinction: "récolte producteurs durabilité artisanat authenticité" },
    ];
    const r = await briefVsAdveCoherenceGate(
      {
        strategyId: "s1",
        brief: { content: "tournoi football stade billetterie supporters maillot pelouse arbitre championnat" },
      },
      { db: stubDb(adve) },
    );
    expect(r.verdict).toBe("WARN");
    expect(r.reason).toMatch(/aligné|recouvrement/i);
  });

  it("PASS when the brief is coherent with the ADVE noyau", async () => {
    const adve = [
      { mission: "marque thé biologique infusion plantes terroir artisanal" },
      { distinction: "récolte producteurs durabilité artisanat authenticité" },
    ];
    const r = await briefVsAdveCoherenceGate(
      {
        strategyId: "s1",
        brief: { content: "campagne thé biologique terroir producteurs artisanal durabilité" },
      },
      { db: stubDb(adve) },
    );
    expect(r.verdict).toBe("PASS");
  });

  it("never throws on internal DB error (advisory — fails safe to PASS)", async () => {
    const brokenDb = {
      pillar: { findMany: async () => { throw new Error("db down"); } },
    } as unknown as GateContext["db"];
    const r = await briefVsAdveCoherenceGate(
      { strategyId: "s1", brief: { content: "any" } },
      { db: brokenDb },
    );
    expect(r.verdict).toBe("PASS");
  });
});
