import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { makeStatusFor, StatusDot } from "@/components/cockpit/pillars/pillar-kit";
import { BESPOKE_PILLAR_RENDERERS } from "@/components/cockpit/pillars";

const badge = (status?: string, empty = false) =>
  renderToStaticMarkup(createElement(StatusDot, { status, empty }));

describe("Origine des valeurs de la plateforme de marque", () => {
  it("ne transforme pas l'absence de trace ou une trace inconnue en déclaration", () => {
    for (const status of [undefined, "UNKNOWN", "unexpected", "constructor", "__proto__"])
      expect(badge(status)).toContain("Origine inconnue");
  });

  it("lit la provenance réelle avant l'ancienne certitude, sans assimiler source et approbation", () => {
    const statusFor = makeStatusFor({ doctrine: "DECLARED", mission: "INFERRED" }, "a", {
      doctrine: "INFERRED", mission: "HUMAN", vision: "SOURCE",
    });
    expect(badge(statusFor("doctrine"))).toContain("Déduit — à vérifier");
    expect(badge(statusFor("mission"))).toContain("Saisi par l&#x27;humain");
    expect(badge(statusFor("vision"))).toContain("Issu d&#x27;une source");
    expect(badge(statusFor("vision"))).not.toMatch(/Officiel|Validé|Déclaré/);
  });

  it("conserve les marqueurs legacy explicites, jamais un défaut déclaré", () => {
    const statusFor = makeStatusFor({ "v.businessModel": "DECLARED", roiProofs: "ARBITRARY" }, "V");
    expect(badge(statusFor("businessModel"))).toContain("Déclaré");
    expect(badge(statusFor("roiProofs"))).toContain("Arbitraire");
    expect(badge(statusFor("mvp"))).toContain("Origine inconnue");
    expect(badge("CALCULATED")).toContain("Calculé");
  });

  it("ne lit pas une valeur de certitude comme une provenance", () => {
    expect(badge(makeStatusFor(null, "a", { mission: "OFFICIAL" })("mission")))
      .toContain("Origine inconnue");
  });

  it("un champ vide reste à saisir quelle que soit sa trace", () => {
    expect(badge("HUMAN", true)).toContain("À saisir");
    expect(badge("INFERRED", true)).not.toContain("Déduit");
  });

  it.each([undefined, null, "", "inconnu", Number.NaN, Number.POSITIVE_INFINITY])(
    "ne transforme pas une cohérence absente ou invalide (%s) en score",
    (score) => {
      const html = renderToStaticMarkup(createElement(BESPOKE_PILLAR_RENDERERS.s!, {
        content: { computed: { selectedInitiativeCount: 1, coherenceScore: score } }, certainty: null,
      }));
      expect(html).toContain("<span>—<i>/100</i></span>");
      expect(html).not.toContain("<span>0<i>/100</i></span>");
    },
  );

  it("conserve un vrai zéro et sa priorité sur le score calculé", () => {
    const html = renderToStaticMarkup(createElement(BESPOKE_PILLAR_RENDERERS.s!, {
      content: { coherenceScore: 0, computed: { coherenceScore: 80 } }, certainty: null,
    }));
    expect(html).toContain("<span>0<i>/100</i></span>");
    expect(html).not.toContain("<span>80<i>/100</i></span>");
  });

  it.each([
    ["a", "missionStatement"], ["d", "positionnement"], ["v", "businessModel"], ["e", "promesseExperience"],
    ["r", "globalSwot"], ["t", "overtonPosition"], ["i", "brandPlatform"], ["s", "syntheseExecutive"],
  ])("le volet %s relaie sa provenance sans créer de déclaration", (key, field) => {
    const Renderer = BESPOKE_PILLAR_RENDERERS[key]!;
    const content = { [field]: "Valeur conservée", _fieldProvenance: { [field]: "INFERRED" } };
    const html = renderToStaticMarkup(createElement(Renderer, { content, certainty: null }));
    expect(html).toContain("Valeur conservée");
    expect(html).toContain("Déduit — à vérifier");
    expect(html).not.toContain(">Déclaré<");
  });
});
