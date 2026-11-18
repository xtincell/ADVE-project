// @vitest-environment jsdom
/**
 * Résultat du diagnostic gratuit (lot 3, 18 novembre 2026) — premier écran :
 * une note /100, un palier, trois constats, une action ; le reste replié, sans
 * rien retirer du PDF payant (rendu depuis la même page, en impression).
 */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  buildFirstScreen,
  clientText,
  pillarOn100,
} from "@/app/(intake)/intake/[token]/result/first-screen";
import { ResultFold } from "@/app/(intake)/intake/[token]/result/result-fold";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("pillarOn100 — une seule échelle dans le parcours gratuit", () => {
  it("ramène un pilier noté sur 25 à une note sur 100, bornée et arrondie", () => {
    expect(pillarOn100(4.75)).toBe(19);
    expect(pillarOn100(25)).toBe(100);
    expect(pillarOn100(31)).toBe(100);
    expect(pillarOn100(-2)).toBe(0);
    expect(pillarOn100(undefined)).toBe(0);
    expect(pillarOn100(Number.NaN)).toBe(0);
  });

  it("garde la cohérence avec la note : la moyenne des piliers /100 retombe sur la somme /25", () => {
    const vector = { a: 4.75, d: 4.42, v: 2.11, e: 1.56 };
    const sum = vector.a + vector.d + vector.v + vector.e;
    const mean = (pillarOn100(vector.a) + pillarOn100(vector.d) + pillarOn100(vector.v) + pillarOn100(vector.e)) / 4;
    expect(Math.abs(mean - sum)).toBeLessThan(1);
  });
});

describe("buildFirstScreen — trois constats et une action, tirés du diagnostic", () => {
  const vector = { a: 4.75, d: 4.42, v: 2.11, e: 1.56 };
  const diagnostic = {
    strengths: [{ key: "a", insight: "Votre identité est claire." }],
    recommendations: [
      { key: "e", diagnostic: "Vous avez une audience mais pas une communauté.", actions: ["Identifier vos premiers ambassadeurs"] },
      { key: "v", diagnostic: "Votre proposition de valeur manque de précision.", actions: ["Chiffrer votre impact"] },
    ],
    brandLevel: { nextMilestone: { moves: ["Créer un rituel de marque"] } },
  };

  it("donne le pilier le plus solide, puis les deux plus faibles (du plus faible au moins faible)", () => {
    const screenData = buildFirstScreen(vector, diagnostic);
    expect(screenData.findings.map((f) => [f.kind, f.pillar, f.score100])).toEqual([
      ["strength", "a", 19],
      ["gap", "e", 6],
      ["gap", "v", 8],
    ]);
    expect(screenData.findings.map((f) => f.text)).toEqual([
      "Votre identité est claire.",
      "Vous avez une audience mais pas une communauté.",
      "Votre proposition de valeur manque de précision.",
    ]);
  });

  it("propose une seule action : celle du pilier le plus faible", () => {
    expect(buildFirstScreen(vector, diagnostic).action).toBe("Identifier vos premiers ambassadeurs");
  });

  it("préfère la première action priorisée du bloc stratégique quand il existe", () => {
    const withV3 = { ...diagnostic, narrativeReport: { recommendation: { prioritizedActions: [{ title: "Nommer l'ennemi" }] } } };
    expect(buildFirstScreen(vector, withV3).action).toBe("Nommer l'ennemi");
  });

  it("n'invente rien : sans texte enregistré, le constat reste vide (phrase type côté page)", () => {
    const screenData = buildFirstScreen(vector, null);
    expect(screenData.findings).toHaveLength(3);
    expect(screenData.findings.every((f) => f.text === null)).toBe(true);
    expect(screenData.action).toBeNull();
  });

  it("retombe sur le premier mouvement vers le palier suivant", () => {
    expect(buildFirstScreen(vector, { brandLevel: { nextMilestone: { moves: ["Créer un rituel"] } } }).action).toBe("Créer un rituel");
  });
});

describe("clientText — aucune mention de fabrication devant le client", () => {
  it("retire « Évaluation déterministe (sans LLM) : » des anciennes fiches", () => {
    expect(clientText("Évaluation déterministe (sans LLM) : le pilier le plus faible place la marque au palier Ordinaire."))
      .toBe("le pilier le plus faible place la marque au palier Ordinaire.");
    expect(clientText("  ")).toBeNull();
    expect(clientText(undefined)).toBeNull();
  });

  it("ramène sur 100 les notes « /25 » déjà écrites dans les anciens constats", () => {
    expect(clientText("Engagement est parmi les volets les moins renseignés du dossier (1.6/25 de complétude structurelle)."))
      .toBe("Engagement est parmi les volets les moins renseignés du dossier (6/100 de complétude structurelle).");
    expect(clientText("Valeur : 2,1 / 25")).toBe("Valeur : 8/100");
  });
});

describe("ResultFold — replié à l'écran, toujours imprimé", () => {
  it("s'ouvre et se ferme au clic, et garde son contenu dans le PDF", () => {
    render(React.createElement(ResultFold, { title: "La synthèse", children: React.createElement("p", null, "Contenu imprimé") }));
    const button = screen.getByRole("button", { name: "La synthèse" });
    const content = screen.getByText("Contenu imprimé").parentElement!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(content.className).toContain("hidden");
    expect(content.className).toContain("print:block");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(content.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(content.className).toContain("print:block");
    expect(button.getAttribute("aria-controls")).toBe(content.id);
  });
});
