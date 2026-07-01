import { describe, expect, it } from "vitest";
import { diagnose } from "@/domain/diagnostic";
import { ADVE_PILLARS } from "@/domain/pillars";
import { PILLAR_FIELDS } from "@/domain/pillar-fields";
import {
  INTAKE_COUNTRIES,
  intakeCountryName,
  mapIntakeAnswers,
  splitListAnswer,
  toDiagnosticAnswers,
  withIdentityAnswers,
  type RawIntakeAnswers,
} from "@/server/funnel-mapping";

describe("splitListAnswer — textarea « un par ligne »", () => {
  it("splitte par ligne, trim chaque item, omet les vides", () => {
    expect(splitListAnswer("  Concurrent A \n\n  Concurrent B\n   \nConcurrent C  ")).toEqual([
      "Concurrent A",
      "Concurrent B",
      "Concurrent C",
    ]);
  });

  it("supporte les fins de ligne Windows (\\r\\n)", () => {
    expect(splitListAnswer("un\r\ndeux\r\n")).toEqual(["un", "deux"]);
  });

  it("chaîne vide ou blanche → liste vide", () => {
    expect(splitListAnswer("")).toEqual([]);
    expect(splitListAnswer("   \n  \n")).toEqual([]);
  });
});

describe("mapIntakeAnswers — réponses brutes → contenus piliers", () => {
  const answers: RawIntakeAnswers = {
    A: {
      nomMarque: "  SPAWT  ",
      description: "Marque de sport urbain au Cameroun.",
      valeurs: "Dépassement\n\nAncrage local\n",
      citationFondatrice: "   ", // blanc → omis
      champInconnu: "à ignorer", // pas dans la bible → ignoré
    },
    D: {
      paysageConcurrentiel: "Nike\nAdidas\nDécathlon",
    },
    // V et E : aucune réponse
  };
  const mapped = mapIntakeAnswers(answers);

  it("champ texte : trimé et posé tel quel", () => {
    expect(mapped.A.content.nomMarque).toBe("SPAWT");
    expect(mapped.A.content.description).toBe("Marque de sport urbain au Cameroun.");
  });

  it("champ liste : splitté par ligne, vides omis", () => {
    expect(mapped.A.content.valeurs).toEqual(["Dépassement", "Ancrage local"]);
    expect(mapped.D.content.paysageConcurrentiel).toEqual(["Nike", "Adidas", "Décathlon"]);
  });

  it("champ vide/blanc : OMIS du contenu (zéro donnée inventée)", () => {
    expect(mapped.A.content).not.toHaveProperty("citationFondatrice");
    expect(mapped.A.certainty).not.toHaveProperty("citationFondatrice");
  });

  it("id de champ inconnu de la bible : ignoré (payload altéré ≠ contenu)", () => {
    expect(mapped.A.content).not.toHaveProperty("champInconnu");
  });

  it("certainty INFERRED posée sur chaque champ rempli (déclaratif fondateur)", () => {
    expect(mapped.A.certainty.description).toBe("INFERRED");
    expect(mapped.A.certainty.valeurs).toBe("INFERRED");
    expect(mapped.D.certainty.paysageConcurrentiel).toBe("INFERRED");
  });

  it("exception identité : nomMarque est DECLARED (le nom déclaré EST le nom)", () => {
    expect(mapped.A.certainty.nomMarque).toBe("DECLARED");
  });

  it("les clés de certainty sont exactement celles du contenu", () => {
    for (const key of ADVE_PILLARS) {
      expect(Object.keys(mapped[key].certainty).sort()).toEqual(
        Object.keys(mapped[key].content).sort(),
      );
    }
  });

  it("pilier sans réponse : contenu vide mais présent (les 4 ADVE sortent toujours)", () => {
    expect(Object.keys(mapped)).toEqual([...ADVE_PILLARS]);
    expect(mapped.V.content).toEqual({});
    expect(mapped.E.content).toEqual({});
  });

  it("déterministe : même entrée → même sortie", () => {
    expect(mapExec(answers)).toEqual(mapExec(answers));
  });

  function mapExec(a: RawIntakeAnswers) {
    return mapIntakeAnswers(a);
  }
});

describe("withIdentityAnswers — injection de l'étape contact dans A", () => {
  it("injecte brandName → A.nomMarque et secteur → A.secteur", () => {
    const out = withIdentityAnswers({}, { brandName: " SPAWT ", secteur: "Sport" });
    expect(out.A?.nomMarque).toBe("SPAWT");
    expect(out.A?.secteur).toBe("Sport");
  });

  it("n'écrase jamais une réponse déjà saisie dans le wizard", () => {
    const out = withIdentityAnswers(
      { A: { nomMarque: "Nom du wizard" } },
      { brandName: "Autre nom", secteur: "Sport" },
    );
    expect(out.A?.nomMarque).toBe("Nom du wizard");
    expect(out.A?.secteur).toBe("Sport");
  });

  it("non-destructif : la structure d'entrée n'est pas mutée", () => {
    const input: RawIntakeAnswers = { A: { description: "desc" } };
    withIdentityAnswers(input, { brandName: "SPAWT" });
    expect(input.A).toEqual({ description: "desc" });
  });

  it("identité vide/blanche : rien d'injecté", () => {
    const out = withIdentityAnswers({}, { brandName: "  ", secteur: undefined });
    expect(out.A?.nomMarque).toBeUndefined();
    expect(out.A?.secteur).toBeUndefined();
  });
});

describe("toDiagnosticAnswers + diagnose — le funnel nourrit le domaine tel quel", () => {
  const raw: RawIntakeAnswers = {
    D: { paysageConcurrentiel: "Nike\nAdidas\nDécathlon" },
  };
  const answers = withIdentityAnswers(raw, { brandName: "SPAWT", secteur: "Sport" });

  it("les listes mappées comptent comme collections (pas comme un bloc de texte)", () => {
    const diagnostic = diagnose({ answers: toDiagnosticAnswers(mapIntakeAnswers(answers)) });
    // paysageConcurrentiel exige minItems 3 — la collection est complète
    // uniquement parce que le mapping a splitté les 3 lignes.
    expect(diagnostic.byPillar.D.filled).toContain("paysageConcurrentiel");
    const minItems = PILLAR_FIELDS.D.find((f) => f.id === "paysageConcurrentiel")?.minItems;
    expect(minItems).toBe(3);
  });

  it("recalcul déterministe : soumission et page résultat donnent le même diagnostic", () => {
    const first = diagnose({ answers: toDiagnosticAnswers(mapIntakeAnswers(answers)) });
    const second = diagnose({ answers: toDiagnosticAnswers(mapIntakeAnswers(answers)) });
    expect(second).toEqual(first);
  });

  it("le nom déclaré à l'étape contact compte comme champ rempli du pilier A", () => {
    const diagnostic = diagnose({ answers: toDiagnosticAnswers(mapIntakeAnswers(answers)) });
    expect(diagnostic.byPillar.A.filled).toContain("nomMarque");
    expect(diagnostic.byPillar.A.filled).toContain("secteur");
  });
});

describe("INTAKE_COUNTRIES — miroir du seed (pas d'accès DB en public)", () => {
  it("codes ISO-2 uniques", () => {
    const codes = INTAKE_COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("intakeCountryName : nom FR ou null si inconnu", () => {
    expect(intakeCountryName("CM")).toBe("Cameroun");
    expect(intakeCountryName("ZZ")).toBeNull();
    expect(intakeCountryName(undefined)).toBeNull();
  });
});
