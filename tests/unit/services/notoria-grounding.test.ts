/**
 * Ancrage documentaire des recommandations (ADR-0184) — mesure déterministe.
 *
 * Ce que ces tests protègent : la différence entre « cette proposition vient
 * des documents de la marque » et « le modèle a écrit qu'elle en venait ».
 * Sans elle, la consigne d'ancrage n'est qu'une politesse adressée au modèle.
 */

import { describe, expect, it } from "vitest";

import {
  computeRecoGrounding,
  extractCitedSourceIds,
  flattenProposedValue,
  GROUNDING_THRESHOLDS,
} from "@/server/services/notoria/grounding";

const PRD = {
  sourceId: "src_prd",
  text: `Le Palais SPAWT organise la découverte culinaire en cinq axes : la table,
         le voisinage, la trouvaille, la meute et la mue. Chaque Spawter progresse
         par stades successifs, du curieux au prescripteur reconnu du quartier.`,
};

const NOTE_HORS_SUJET = {
  sourceId: "src_rh",
  text: `Procédure de remboursement des notes de frais : joindre le justificatif
         original, respecter le plafond mensuel, transmettre avant le cinq du mois.`,
};

describe("citations revendiquées", () => {
  it("extrait les identifiants au format demandé", () => {
    expect(
      extractCitedSourceIds("Repris du PRD (source:src_prd) et confirmé source:src_rh."),
    ).toEqual(["src_prd", "src_rh"]);
  });

  it("ne confond pas une phrase avec une citation", () => {
    expect(extractCitedSourceIds("La source de cette idée est le fondateur.")).toEqual([]);
  });

  it("dédoublonne", () => {
    expect(extractCitedSourceIds("source:src_prd puis source:src_prd")).toEqual(["src_prd"]);
  });
});

describe("mesure d'ancrage", () => {
  it("une proposition tirée du document est ancrée et pointe le document", () => {
    const g = computeRecoGrounding(
      "Le Palais organise la découverte culinaire en cinq axes : table, voisinage, trouvaille, meute, mue.",
      "Repris du PRD (source:src_prd).",
      [PRD, NOTE_HORS_SUJET],
    );
    expect(g.band).toBe("GROUNDED");
    expect(g.score).toBeGreaterThanOrEqual(GROUNDING_THRESHOLDS.grounded);
    expect(g.groundedSourceIds).toEqual(["src_prd"]);
    expect(g.unverifiedCitations).toEqual([]);
  });

  it("une proposition inventée reste non ancrée MALGRÉ une citation", () => {
    // Le cas qui compte : le modèle affirme sa source, la mesure ne la retrouve
    // pas. C'est ce signal-là qui force la relecture humaine.
    const g = computeRecoGrounding(
      "Ouvrir dix-huit boutiques franchisées en Europe centrale dès le premier trimestre.",
      "Documenté (source:src_prd).",
      [PRD, NOTE_HORS_SUJET],
    );
    expect(g.band).toBe("UNGROUNDED");
    expect(g.groundedSourceIds).toEqual([]);
    expect(g.unverifiedCitations).toEqual(["src_prd"]);
  });

  it("sans documentation, l'absence est nommée — pas comptée comme un échec d'ancrage", () => {
    const g = computeRecoGrounding("Une proposition quelconque mais suffisamment longue.", "", []);
    expect(g.band).toBe("NO_SOURCE");
    expect(g.score).toBe(0);
  });

  it("sans documentation, une citation est nécessairement fabriquée", () => {
    const g = computeRecoGrounding("Proposition.", "Tiré de source:src_inexistant.", []);
    expect(g.unverifiedCitations).toEqual(["src_inexistant"]);
  });

  it("un document hors sujet ne compte pas comme appui", () => {
    const g = computeRecoGrounding(
      "Le Palais organise la découverte culinaire en cinq axes distincts.",
      "",
      [NOTE_HORS_SUJET],
    );
    expect(g.groundedSourceIds).toEqual([]);
    expect(g.band).toBe("UNGROUNDED");
  });

  it("la justification ne peut pas ancrer à la place de la valeur proposée", () => {
    // Une justification bien tournée qui recopie le document ne doit pas faire
    // passer une proposition sortie de nulle part.
    const g = computeRecoGrounding(
      "Recruter un directeur financier basé à Genève.",
      "Le Palais organise la découverte culinaire en cinq axes : table, voisinage, trouvaille, meute, mue.",
      [PRD],
    );
    expect(g.band).toBe("UNGROUNDED");
  });

  it("est reproductible — deux passes, même verdict", () => {
    const args = ["Le Palais et ses cinq axes de découverte culinaire.", "source:src_prd", [PRD]] as const;
    expect(computeRecoGrounding(...args)).toEqual(computeRecoGrounding(...args));
  });
});

describe("aplatissement de la valeur proposée", () => {
  it("descend dans les objets et les tableaux", () => {
    const flat = flattenProposedValue({
      titre: "Palais",
      axes: ["table", "meute"],
      detail: { note: "mue" },
    });
    expect(flat).toContain("Palais");
    expect(flat).toContain("meute");
    expect(flat).toContain("mue");
  });

  it("ignore les clés de service", () => {
    expect(flattenProposedValue({ _meta: "interne", valeur: "publique" })).not.toContain("interne");
  });

  it("borne la profondeur", () => {
    let deep: unknown = "trouvaille";
    for (let i = 0; i < 12; i++) deep = { niveau: deep };
    expect(flattenProposedValue(deep)).not.toContain("trouvaille");
  });
});
