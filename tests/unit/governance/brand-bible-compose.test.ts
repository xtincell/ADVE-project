/**
 * Anti-drift — le livre de marque ne masque rien.
 *
 * Le livre composé (ADR-0185) promet deux choses : n'écrire que ce qui est
 * déclaré ou documenté, et **nommer ce qui manque**. Une omission silencieuse
 * viole la seconde aussi sûrement qu'une invention violerait la première.
 *
 * Défaut constaté EN PRODUCTION, sur SPAWT, en appelant le composeur sous une
 * session réelle : le livre annonçait « 98 % complété · 0 manquant » sur le
 * volet Authenticité, alors que le pilier porte **32 champs** et que le livre
 * n'en montrait que **13**. Cause : la boucle parcourait `FIELD_REGISTRY`, qui
 * ne décrit qu'un sous-ensemble du pilier. Tout champ déclaré hors registre
 * était donc invisible — ni affiché, ni compté, ni nommé parmi les manquants.
 * `equipeDirigeante`, corrigé à la main le jour même sur pièce officielle,
 * n'apparaissait nulle part.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = readFileSync(join(ROOT, "src/server/services/brand-bible/compose.ts"), "utf8");

describe("aucune valeur déclarée n'est invisible", () => {
  it("le composeur parcourt le pilier, pas seulement le registre", () => {
    expect(SRC).toMatch(/const known = new Set\(Object\.keys\(registry\)\)/);
    expect(SRC).toMatch(/for \(const \[field, value\] of Object\.entries\(content\)\)/);
    // Les clés techniques (`_fieldProvenance`, `_fieldCertainty`…) restent
    // hors du livre : ce sont des métadonnées, pas des déclarations de marque.
    expect(SRC).toMatch(/field\.startsWith\("_"\)/);
  });

  it("une valeur hors registre reste soumise au test de vacuité", () => {
    // Sans ça, un champ vide hors registre entrerait en « renseigné » et
    // gonflerait la couverture — exactement l'inverse du but.
    const block = SRC.slice(SRC.indexOf("const known = new Set"), SRC.indexOf("const known = new Set") + 600);
    expect(block).toMatch(/if \(isEmptyValue\(value\)\) continue;/);
  });

  it("le registre garde la priorité (libellé canonique + ordre)", () => {
    // Le registre est parcouru AVANT le reste du pilier : ses libellés et son
    // ordre font foi ; le complément est appendu, jamais intercalé.
    const iRegistry = SRC.indexOf("for (const [field, def] of Object.entries(registry))");
    const iRest = SRC.indexOf("const known = new Set");
    expect(iRegistry).toBeGreaterThan(-1);
    expect(iRest).toBeGreaterThan(iRegistry);
  });
});

describe("une marque inexistante n'a pas de livre", () => {
  /**
   * Constaté en production le 2026-07-29 : appelé sur un identifiant qui
   * n'existe pas, le composeur rendait un document parfaitement plausible —
   * « Marque », 0/46, « rien de déclaré sur ce volet ». Atteignable par un
   * identifiant périmé (marque supprimée, onglet resté ouvert) ou une faute de
   * frappe d'opérateur.
   *
   * Décrire avec aplomb une marque qui n'existe pas est de la même famille que
   * combler un trou : ça a juste l'air d'un vide honnête.
   */
  it("le composeur rend `null` au lieu d'un livre vide plausible", () => {
    expect(SRC).toMatch(/Promise<BrandBibleDocument \| null>/);
    expect(SRC).toMatch(/if \(!strategy\) return null;/);
  });

  it("le nom de marque n'est plus un repli inventé", () => {
    // `strategy?.name ?? "Marque"` produisait le nom de couverture du livre
    // fantôme. Le nom vient désormais d'une marque dont l'existence est établie.
    expect(SRC).not.toMatch(/\?\?\s*"Marque"/);
    expect(SRC).toMatch(/brandName:\s*strategy\.name/);
  });

  it("les deux surfaces refusent, chacune dans sa langue", () => {
    const router = readFileSync(join(ROOT, "src/server/trpc/routers/brand-bible.ts"), "utf8");
    expect(router).toMatch(/code:\s*"NOT_FOUND"/);
    const pdf = readFileSync(
      join(ROOT, "src/server/services/value-report-generator/brand-bible-pdf.ts"),
      "utf8",
    );
    expect(pdf).toMatch(/if \(!bible\) throw new Error/);
  });
});

describe("le livre ne fabrique aucune mesure", () => {
  it("la complétude est CONSOMMÉE, jamais recalculée", () => {
    // `completionPct` (contrats de maturité) est le chiffre montré partout
    // ailleurs dans le cockpit. Un second pourcentage maison serait la dérive
    // qu'on passe notre temps à réparer.
    expect(SRC).toMatch(/assessAllPillarsHealth/);
    expect(SRC).toMatch(/completionByKey/);
  });

  it("une complétude indisponible se dit, elle ne vaut pas « complet »", () => {
    expect(SRC).toMatch(/measured\.length > 0/);
    expect(SRC).toMatch(/:\s*null;?\s*\n?\s*\}\)\(\)/);
  });

  it("zéro appel de modèle dans la composition", () => {
    for (const forbidden of ["callLLM", "executeStructuredLLMCall", "executeTool", "streamChatText"]) {
      expect(SRC, `${forbidden} n'a rien à faire dans un composeur déterministe`).not.toContain(
        forbidden,
      );
    }
  });
});
