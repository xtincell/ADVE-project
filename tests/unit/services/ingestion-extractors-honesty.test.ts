/**
 * Extraction de fichiers — ce qu'on sait lire, et ce qu'on refuse d'inventer.
 *
 * `extractImage` envoyait **200 caractères d'en-tête base64** à un modèle
 * **texte**, avec la consigne de décrire l'image « de manière détaillée » :
 * couleurs dominantes, typographies, textes lisibles. Rien de tout cela
 * n'était transmis — tout ce qui ressortait était inventé, puis stocké en
 * `rawContent` d'une `BrandDataSource`, c'est-à-dire présenté au reste de l'OS
 * comme un document de la marque.
 *
 * Depuis l'ancrage documentaire (ADR-0184), c'était devenu franchement
 * dangereux : une description fabriquée serait devenue une source
 * « recouvrante », et la mécanique censée détecter l'invention l'aurait
 * blanchie.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { extractImage, extractText } from "@/server/services/ingestion-pipeline/extractors";

const ROOT = join(__dirname, "..", "..", "..");
const EXTRACTORS = readFileSync(
  join(ROOT, "src/server/services/ingestion-pipeline/extractors.ts"),
  "utf8",
);

describe("lecture d'image — refus honnête", () => {
  it("refuse au lieu de décrire", async () => {
    await expect(extractImage("iVBORw0KGgoAAAANSUhEUg", "strat_1")).rejects.toThrow(
      /Lecture d'image non disponible/,
    );
  });

  it("dit quoi faire à la place", async () => {
    await expect(extractImage("x", "s")).rejects.toThrow(/PDF ou texte|décrivez-le en note/);
  });

  it("n'appelle plus aucun modèle depuis l'extraction d'image", () => {
    // Verrou structurel : une régression réintroduirait la fabrication en
    // silence, et rien dans le produit ne la distinguerait d'une vraie lecture.
    // Un APPEL, pas une mention : le commentaire d'en-tête cite `callLLM` pour
    // expliquer pourquoi il n'y en a plus.
    expect(EXTRACTORS).not.toMatch(/callLLM\(/);
    expect(EXTRACTORS).not.toMatch(/from "@\/server\/services\/llm-gateway"/);
    expect(EXTRACTORS).not.toMatch(/IMAGE_DATA/);
  });
});

describe("dispatch par extension", () => {
  it("le contrat est l'EXTENSION, pas le type MIME", () => {
    // `extractAuto` compare à "PDF"/"DOCX"/… et retombe sinon sur « traiter
    // comme du texte ». Une UI qui passerait `File.type` (`application/pdf`)
    // stockerait donc du base64 en guise de contenu lisible.
    expect(EXTRACTORS).toMatch(/ft === "PDF"/);
    expect(EXTRACTORS).toMatch(/ft === "DOCX"/);
  });

  it("les appelants dérivent bien l'extension du nom de fichier", () => {
    const callers = [
      "src/app/(cockpit)/cockpit/brand/sources/page.tsx",
      "src/app/(console)/console/strategy-operations/ingestion/page.tsx",
    ];
    for (const rel of callers) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, rel).toMatch(/split\("\."\)\.pop\(\)\?\.toUpperCase\(\)/);
      // Le piège exact : passer le type MIME du navigateur.
      expect(src, rel).not.toMatch(/fileType:\s*file\.type/);
    }
  });
});

describe("texte brut", () => {
  it("passe tel quel et compte les mots", () => {
    const r = extractText("le palais compte cinq axes");
    expect(r.text).toBe("le palais compte cinq axes");
    expect(r.metadata).toMatchObject({ wordCount: 5 });
  });
});

describe("dépôt fondateur", () => {
  const PAGE = readFileSync(
    join(ROOT, "src/app/(cockpit)/cockpit/brand/sources/page.tsx"),
    "utf8",
  );

  it("le porteur de marque peut déposer un fichier", () => {
    // La voie serveur (`ingestion.uploadFile`, gouvernée) existait mais n'était
    // atteignable QUE depuis la Console : le fondateur pouvait coller du texte,
    // jamais déposer son PRD ou son brand book. C'est pourtant lui qui les a.
    expect(PAGE).toMatch(/ingestion\.uploadFile\.useMutation/);
    expect(PAGE).toMatch(/type="file"/);
  });

  it("« déposé » ne se fait pas passer pour « exploitable »", () => {
    expect(PAGE).toMatch(/indexedChunks/);
    expect(PAGE).toMatch(/Pas encore analysable/);
  });
});
