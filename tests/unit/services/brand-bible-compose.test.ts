/**
 * Livre de marque composé (ADR-0185) — ce qui doit rester vrai.
 *
 * Le livre est la RÉFÉRENCE d'une marque : c'est ce qu'on ouvre pour savoir ce
 * qu'elle est. Un document de référence qui comblerait ses trous serait la
 * fabrication la mieux reliée du système — plus dangereuse qu'un champ vide,
 * parce qu'elle porterait l'autorité du livre.
 *
 * Ces tests verrouillent donc trois choses : zéro modèle sur ce chemin, aucune
 * mesure rivale de la complétude canonique, et les manquants NOMMÉS.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const COMPOSE = read("src/server/services/brand-bible/compose.ts");
const PAGE = read("src/app/(cockpit)/cockpit/brand/bible/page.tsx");
const PDF = read("src/server/services/value-report-generator/brand-bible-pdf.ts");
const ROUTER = read("src/server/trpc/routers/brand-bible.ts");

describe("zéro modèle sur le chemin du livre", () => {
  it("la composition n'appelle aucun modèle", () => {
    for (const forbidden of [/callLLM\(/, /executeStructuredLLMCall/, /streamChatText/, /executeTool\(/]) {
      expect(COMPOSE).not.toMatch(forbidden);
    }
  });

  it("la vue non plus", () => {
    expect(PAGE).not.toMatch(/callLLM|generate|prompt/i);
  });
});

describe("une seule mesure de complétude", () => {
  it("consomme la mesure canonique, n'en fabrique pas une rivale", () => {
    // `completionPct` (contrats de maturité) est LE chiffre montré ailleurs
    // dans le cockpit. En calculer un autre ici afficherait deux vérités.
    expect(COMPOSE).toMatch(/assessAllPillarsHealth/);
    expect(COMPOSE).toMatch(/completionPct/);
  });

  it("une complétude non mesurée n'est jamais présentée comme complète", () => {
    expect(COMPOSE).toMatch(/pct: number \| null/);
    expect(PDF).toMatch(/bible\.coverage\.pct != null && bible\.coverage\.pct >= 100/);
    expect(PAGE).toMatch(/Complétude non mesurée/);
  });
});

describe("les trous sont nommés, pas masqués", () => {
  it("la composition renvoie les champs manquants", () => {
    expect(COMPOSE).toMatch(/missing: Array<\{ field: string; label: string \}>/);
  });

  it("la vue et le PDF les affichent", () => {
    expect(PAGE).toMatch(/non renseigné/i);
    expect(PDF).toMatch(/Non renseigne/);
  });

  it("un volet sans rien de déclaré le dit", () => {
    expect(PAGE).toMatch(/Rien de déclaré sur ce volet/);
    expect(PDF).toMatch(/Rien de declare sur ce volet/);
  });
});

describe("traçabilité", () => {
  it("chaque valeur porte sa provenance", () => {
    expect(COMPOSE).toMatch(/provenance: coerceProvenance/);
    expect(PAGE).toMatch(/PROVENANCE_LABEL/);
    // Le PDF aussi : lire une valeur sans savoir d'où elle vient est
    // précisément ce qu'on cherche à ne plus faire.
    expect(PDF).toMatch(/entry\.provenance/);
  });

  it("les citations portent le document dont elles sortent", () => {
    expect(COMPOSE).toMatch(/sourceId: e\.sourceId/);
    expect(COMPOSE).toMatch(/certainty: e\.certainty/);
  });

  it("les extraits viennent du RAG partagé, pas d'une lecture maison", () => {
    expect(COMPOSE).toMatch(/loadBrandSourceContext/);
    expect(COMPOSE).not.toMatch(/brandDataSource\.findMany/);
  });
});

describe("surface", () => {
  it("la lecture est scopée à la marque", () => {
    expect(ROUTER).toMatch(/strategyScopedProcedure/);
  });

  it("le livre est en lecture seule — aucune mutation", () => {
    expect(ROUTER).not.toMatch(/\.mutation\(/);
    expect(ROUTER).not.toMatch(/emitIntent/);
  });
});
