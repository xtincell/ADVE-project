import { describe, expect, it } from "vitest";
import {
  formatFieldChange,
  lastFieldChange,
  reasonLabel,
  type RevisionSnapshot,
} from "@/components/pillars/field-history";

function rev(
  version: number,
  reason: string,
  content: unknown,
  day: number,
): RevisionSnapshot {
  return { version, reason, createdAt: new Date(Date.UTC(2026, 6, day, 12, 0)), content };
}

describe("lastFieldChange — dernière modification d'UN champ à travers les révisions", () => {
  it("null si le champ n'apparaît dans aucune révision", () => {
    const revisions = [rev(1, "intake", { autre: "x" }, 1), rev(2, "operator_amend", { autre: "y" }, 2)];
    expect(lastFieldChange(revisions, "archetype")).toBeNull();
  });

  it("l'apparition du champ compte comme sa première modification", () => {
    const revisions = [
      rev(1, "intake", { description: "d" }, 1),
      rev(2, "operator_amend", { description: "d", archetype: "Héros" }, 2),
    ];
    expect(lastFieldChange(revisions, "archetype")).toMatchObject({
      version: 2,
      reason: "operator_amend",
    });
  });

  it("un champ inchangé entre révisions garde sa révision d'origine", () => {
    const revisions = [
      rev(1, "intake", { archetype: "Héros" }, 1),
      rev(2, "operator_amend", { archetype: "Héros", valeurs: ["a"] }, 2),
      rev(3, "operator_amend", { archetype: "Héros", valeurs: ["a", "b"] }, 3),
    ];
    expect(lastFieldChange(revisions, "archetype")).toMatchObject({ version: 1, reason: "intake" });
    expect(lastFieldChange(revisions, "valeurs")).toMatchObject({ version: 3 });
  });

  it("détecte le changement de valeur, y compris structuré (ordre de clés ignoré)", () => {
    const revisions = [
      rev(1, "intake", { swot: { a: 1, b: 2 } }, 1),
      rev(2, "rtis_refresh", { swot: { b: 2, a: 1 } }, 2), // égal à clés près → pas un changement
      rev(3, "rtis_refresh", { swot: { a: 1, b: 3 } }, 3),
    ];
    expect(lastFieldChange(revisions, "swot")).toMatchObject({ version: 3 });
  });

  it("l'effacement du champ compte comme une modification", () => {
    const revisions = [
      rev(1, "intake", { archetype: "Héros" }, 1),
      rev(2, "operator_amend", {}, 2),
    ];
    expect(lastFieldChange(revisions, "archetype")).toMatchObject({
      version: 2,
      reason: "operator_amend",
    });
  });

  it("accepte les révisions dans n'importe quel ordre d'entrée (tri par version)", () => {
    const revisions = [
      rev(3, "operator_amend", { archetype: "Sage" }, 3),
      rev(1, "intake", { archetype: "Héros" }, 1),
      rev(2, "operator_amend", { archetype: "Héros" }, 2),
    ];
    expect(lastFieldChange(revisions, "archetype")).toMatchObject({ version: 3 });
  });
});

describe("formatFieldChange / reasonLabel", () => {
  it("formate « v{n} · {reason FR} · {date} »", () => {
    const line = formatFieldChange({
      version: 4,
      reason: "operator_amend",
      createdAt: new Date(Date.UTC(2026, 6, 1, 12, 0)),
    });
    expect(line).toMatch(/^v4 · amendement · /);
    expect(line).toContain("2026");
  });

  it("traduit les reasons connues et laisse passer les inconnues", () => {
    expect(reasonLabel("rtis_refresh")).toBe("dérivation RTIS");
    expect(reasonLabel("intake")).toBe("intake");
    expect(reasonLabel("mystere")).toBe("mystere");
  });
});
