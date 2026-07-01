import { describe, expect, it } from "vitest";
import { diagnose, DIAGNOSTIC_MAX_SCORE } from "@/domain/diagnostic";
import { makeRichAdve, makeRichPillar } from "./fixtures";

describe("diagnostic gratuit — intake vide", () => {
  const result = diagnose({ answers: {} });

  it("score 0/100, palier LATENT", () => {
    expect(DIAGNOSTIC_MAX_SCORE).toBe(100);
    expect(result.score).toBe(0);
    expect(result.level).toBe("LATENT");
    expect(result.levelLabel.length).toBeGreaterThan(0);
  });

  it("aucune force inventée", () => {
    expect(result.forces).toEqual([]);
  });

  it("les faiblesses citent des champs réellement vides, cascade A d'abord", () => {
    expect(result.faiblesses.length).toBeGreaterThan(0);
    expect(result.faiblesses[0]).toContain("Nom de la marque");
    expect(result.faiblesses[0]).toContain("Authenticité");
  });

  it("exactement 3 actions, la première sur la première décision humaine de A", () => {
    expect(result.next3Actions).toHaveLength(3);
    expect(result.next3Actions[0]).toContain("Déclarer");
    expect(result.next3Actions[0]).toContain("Nom de la marque");
    expect(result.next3Actions[0]).toContain("Authenticité");
  });
});

describe("diagnostic gratuit — socle partiel (A riche, reste vide)", () => {
  const result = diagnose({ answers: { A: makeRichPillar("A") } });

  it("score = 25/100 (un pilier sur quatre), palier FRAGILE", () => {
    expect(result.score).toBe(25);
    // 25/100 → 50/200 → ≤ 80 = FRAGILE
    expect(result.level).toBe("FRAGILE");
  });

  it("forces réelles : le pilier A rempli est constaté", () => {
    expect(result.forces.some((f) => f.includes("Authenticité"))).toBe(true);
    expect(result.forces.some((f) => f.includes("Archétype de marque"))).toBe(true);
  });

  it("aucune faiblesse ne cite le pilier rempli", () => {
    expect(result.faiblesses.some((f) => f.includes("(pilier Authenticité)"))).toBe(false);
  });

  it("les actions suivent la cascade : D d'abord, décision humaine en tête", () => {
    expect(result.next3Actions[0]).toContain("Positionnement");
    expect(result.next3Actions[0]).toContain("Distinction");
  });

  it("détail par pilier exposé pour l'UI", () => {
    expect(result.byPillar.A.score).toBe(100);
    expect(result.byPillar.D.score).toBe(0);
  });
});

describe("diagnostic gratuit — socle ADVE complet", () => {
  const result = diagnose({ answers: makeRichAdve() });

  it("score 100/100, projection meilleur palier", () => {
    expect(result.score).toBe(100);
    expect(result.level).toBe("ICONE");
  });

  it("aucune faiblesse fabriquée", () => {
    expect(result.faiblesses).toEqual([]);
  });

  it("les 3 actions passent aux étapes suivantes (RTIS, Oracle)", () => {
    expect(result.next3Actions).toHaveLength(3);
    expect(result.next3Actions.some((a) => a.includes("RTIS"))).toBe(true);
    expect(result.next3Actions.some((a) => a.includes("Oracle"))).toBe(true);
  });
});

describe("diagnostic — déterminisme", () => {
  it("même intake → même diagnostic, toujours", () => {
    const intake = { answers: { A: { nomMarque: "SPAWT", secteur: "Sport" } } };
    expect(diagnose(intake)).toEqual(diagnose(intake));
  });
});
