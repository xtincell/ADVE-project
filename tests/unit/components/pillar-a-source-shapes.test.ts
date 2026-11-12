// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PillarAFields } from "@/components/cockpit/pillars/pillar-a-fields";
import { ValeursCard, EquipeDirigenteCard } from "@/components/cockpit/field-renderers";
import { validatePillarPartial } from "@/lib/types/pillar-schemas";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Same declared shapes as the admitted brand corpus, without adding a Schwartz
// assignment, cost, biography or credentials which the source never supplied.
const values = [
  Object.freeze({ valeur: "Communauté avant funnel", rang: 3, justification: "La communauté produit la donnée." }),
  Object.freeze({ valeur: "Instinct avant formulaire", rang: 1, justification: "Observer les comportements réels." }),
  Object.freeze({ valeur: "Identité avant utilité", rang: 2, justification: "Une identité qui se construit." }),
];
const team = [Object.freeze({ nom: "Aline", role: "Fondatrice", responsabilites: "Arbitre le produit et les retours." })];

describe("stored identity sources remain readable without rewriting their meaning", () => {
  it("bespoke identity shows all declared value labels in the supplied rank order", () => {
    const before = JSON.stringify(values);
    const { container } = render(React.createElement(PillarAFields, { content: { valeurs: values }, certainty: null }));
    const names = [...container.querySelectorAll(".ck-a-val__name")].map(n => n.textContent);
    expect(names).toEqual(["Instinct avant formulaire", "Identité avant utilité", "Communauté avant funnel"]);
    expect(container.querySelectorAll(".ck-a-val__schwartz")).toHaveLength(0);
    expect(container.querySelectorAll(".ck-a-val__cost")).toHaveLength(0);
    expect(JSON.stringify(values)).toBe(before);
  });

  it("the generic identity reader preserves the same labels and rank order", () => {
    const { container } = render(React.createElement(ValeursCard, { valeurs: values }));
    const text = container.textContent!;
    expect(text).toContain("Instinct avant formulaire");
    expect(text.indexOf("Instinct avant formulaire")).toBeLessThan(text.indexOf("Identité avant utilité"));
    expect(text.indexOf("Identité avant utilité")).toBeLessThan(text.indexOf("Communauté avant funnel"));
    expect(text).not.toContain("sans nom");
  });

  it("bespoke team keeps declared responsibilities visible without pretending they are a biography", () => {
    const { container } = render(React.createElement(PillarAFields, { content: { equipeDirigeante: team }, certainty: null }));
    expect(container.textContent).toContain("Aline");
    expect(container.textContent).toContain("Responsabilités");
    expect(container.textContent).toContain(team[0]!.responsabilites);
    expect(Object.keys(team[0]!)).toEqual(["nom", "role", "responsabilites"]);
  });

  it("the generic team reader shows biography and responsibilities as separate source information", () => {
    const { container } = render(React.createElement(EquipeDirigenteCard, { equipe: [{ ...team[0], bio: "Parcours documenté dans la source." }] }));
    expect(container.textContent).toContain("Parcours documenté dans la source.");
    expect(container.textContent).toContain("Responsabilités");
    expect(container.textContent).toContain(team[0]!.responsabilites);
  });

  it("canonical value fields retain precedence over aliases, with no source mutation", () => {
    const canonical = Object.freeze({ customName: "Autonomie documentée", value: "AUTONOMIE", rank: 1, valeur: "Ancien libellé", rang: 7, justification: "Justification conservée.", costOfHolding: "Coût documenté." });
    for (const element of [
      React.createElement(PillarAFields, { content: { valeurs: [canonical] }, certainty: null }),
      React.createElement(ValeursCard, { valeurs: [canonical] }),
    ]) {
      const { container, unmount } = render(element);
      expect(container.textContent).toContain("Autonomie documentée");
      expect(container.textContent).toContain("Coût documenté.");
      expect(container.textContent).not.toContain("Ancien libellé");
      unmount();
    }
    expect(canonical.rang).toBe(7);
  });

  it("rendering the declared shape does not manufacture contractual completeness", () => {
    const result = validatePillarPartial("A", { valeurs: values, equipeDirigeante: team });
    expect(result.success).toBe(false);
    expect(values[0]).not.toHaveProperty("value");
    expect(values[0]).not.toHaveProperty("costOfHolding");
    expect(team[0]).not.toHaveProperty("bio");
  });
});
