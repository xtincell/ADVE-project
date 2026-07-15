/**
 * ADR-0146 — Overton Graph : cœur déterministe (tests purs).
 */
import { describe, it, expect } from "vitest";
import {
  OVERTON_ZONES,
  zoneIndex,
  zoneDelta,
  tokenize,
  countLexiconHits,
  vocabularyAdoption,
  attributeLastTouch,
} from "@/domain/overton-graph";

describe("zones", () => {
  it("index croît vers l'institué", () => {
    expect(zoneIndex("UNTHINKABLE")).toBe(0);
    expect(zoneIndex("POLICY")).toBe(OVERTON_ZONES.length - 1);
  });
  it("delta > 0 = migration vers la norme", () => {
    expect(zoneDelta("RADICAL", "POPULAR")).toBeGreaterThan(0);
    expect(zoneDelta("POPULAR", "RADICAL")).toBeLessThan(0);
    expect(zoneDelta(null, "POLICY")).toBe(0);
  });
});

describe("vocabulaire — comptage déterministe", () => {
  it("tokenize", () => {
    expect(tokenize("Le Djidji, spawter !")).toEqual(["le", "djidji", "spawter"]);
  });
  it("countLexiconHits (mots + expressions)", () => {
    expect(countLexiconHits("note moyenne 4,2 note moyenne", ["note moyenne"])).toBe(2);
    expect(countLexiconHits("spawter le spawter", ["spawter"])).toBe(2);
  });
  it("adoption WIN quand le lexique marque domine", () => {
    const r = vocabularyAdoption(
      ["spawter", "djidji"],
      ["note moyenne"],
      ["spawter c'est djidji", "encore spawter"],
    );
    expect(r.verdict).toBe("WIN");
    expect(r.adoptionShare).not.toBeNull();
    expect(r.adoptionShare!).toBeGreaterThan(0.5);
  });
  it("adoption LOSS quand l'incumbent domine", () => {
    const r = vocabularyAdoption(["spawter"], ["note moyenne"], ["note moyenne partout note moyenne"]);
    expect(r.verdict).toBe("LOSS");
  });
  it("corpus vide → ABSENT (jamais faux 0, P22-2)", () => {
    expect(vocabularyAdoption(["x"], ["y"], []).verdict).toBe("ABSENT");
    expect(vocabularyAdoption(["x"], ["y"], []).adoptionShare).toBeNull();
  });
  it("déterministe : deux runs = même sortie", () => {
    const a = vocabularyAdoption(["spawter"], ["note"], ["spawter note spawter"]);
    const b = vocabularyAdoption(["spawter"], ["note"], ["spawter note spawter"]);
    expect(a).toEqual(b);
  });
});

describe("attribution last-touch (ADR-0135)", () => {
  const d = (iso: string) => new Date(iso);
  it("prend l'action la plus récente dans la fenêtre avec latence de grâce", () => {
    const transition = d("2026-03-01T00:00:00Z");
    const actions = [
      { ref: "a1", actorKind: "BRAND" as const, occurredAt: d("2026-02-01T00:00:00Z") },
      { ref: "a2", actorKind: "BRAND" as const, occurredAt: d("2026-02-10T00:00:00Z") },
    ];
    // grace 14j → latestAllowed = 2026-02-15 ; a2 (02-10) éligible, a1 aussi ; plus récente = a2
    expect(attributeLastTouch(transition, actions)?.ref).toBe("a2");
  });
  it("action trop récente (dans la grâce) exclue", () => {
    const transition = d("2026-03-01T00:00:00Z");
    const actions = [{ ref: "recent", actorKind: "BRAND" as const, occurredAt: d("2026-02-25T00:00:00Z") }];
    expect(attributeLastTouch(transition, actions)).toBeNull();
  });
  it("hors fenêtre de rappel → null (absence honnête)", () => {
    const transition = d("2026-03-01T00:00:00Z");
    const actions = [{ ref: "old", actorKind: "BRAND" as const, occurredAt: d("2025-12-01T00:00:00Z") }];
    expect(attributeLastTouch(transition, actions)).toBeNull();
  });
});
