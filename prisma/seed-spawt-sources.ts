/**
 * Seed SPAWT sources — alimente la section « Sources » de la stratégie SPAWT
 * depuis le matériel client réel présent dans le repo (`Customers/SPAWT/`).
 *
 * Pourquoi : `seed-spawt.ts` remplit les 8 piliers ADVE/RTIS depuis le canon,
 * mais ne créait AUCUNE `BrandDataSource`. Résultat : la section Sources du
 * cockpit était vide, et le moteur d'enrichissement (`enrichFromVault`) n'avait
 * rien à scanner pour inférer/vérifier les champs. Ce seed comble ce trou.
 *
 * Déterministe : l'extraction (mammoth pour docx, xlsx pour le formulaire, texte
 * brut sinon) tourne au seed, zéro LLM. Idempotent : upsert par
 * (strategyId, origin) — `origin = "upload:<fichier>"`.
 *
 * Taxonomie certainty (src/domain/source-certainty.ts) :
 *   - OFFICIAL : pièce officielle client (deck top management, rapport terrain,
 *     formulaire ADVE rempli par le client) — vérifié.
 *   - DECLARED : produit/dérivé (corpus texte, calendrier social généré).
 *
 * pillarMapping : quels piliers chaque source nourrit ({ a: true, d: true, ... }).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";

interface SpawtSourceSpec {
  /** Nom de fichier dans Customers/SPAWT/ */
  file: string;
  /** fileType BrandDataSource (PDF/DOCX/XLSX/IMG/CSV/TXT/JSON) */
  fileType: "DOCX" | "XLSX" | "TXT" | "MD";
  /** Niveau de certitude opérateur */
  certainty: "OFFICIAL" | "DECLARED";
  /** Piliers nourris par cette source */
  pillars: ReadonlyArray<"a" | "d" | "v" | "e" | "r" | "t" | "i" | "s">;
  /** Libellé humain affiché dans la UI */
  label: string;
}

const SPAWT_SOURCES: readonly SpawtSourceSpec[] = [
  {
    file: "FORMULAIRE ADVE SPAWT REVISE-3.xlsx",
    fileType: "XLSX",
    certainty: "OFFICIAL",
    pillars: ["a", "d", "v", "e", "r", "t", "i", "s"],
    label: "Formulaire ADVE SPAWT (révisé) — rempli par le client",
  },
  {
    file: "SPAWT_Presentation_Fevrier_2026_V2-2.docx",
    fileType: "DOCX",
    certainty: "OFFICIAL",
    pillars: ["a", "d", "v", "e", "i", "s"],
    label: "Présentation Top Management — Nouvel État du Projet (Février 2026)",
  },
  {
    file: "SPAWT_Mission1_Abidjan_Rapport.docx",
    fileType: "DOCX",
    certainty: "OFFICIAL",
    pillars: ["v", "e", "t"],
    label: "Rapport de Reconnaissance Terrain — Mission 1 Abidjan (mars 2026)",
  },
  {
    file: "spawt_text.txt",
    fileType: "TXT",
    certainty: "DECLARED",
    pillars: ["a", "d", "v", "e", "i"],
    label: "Corpus texte SPAWT (brandbook + GTM)",
  },
  {
    file: "SPAWT-social-et-calendrier-prelancement.md",
    fileType: "MD",
    certainty: "DECLARED",
    pillars: ["e", "i"],
    label: "Présence social + Calendrier digital de prélancement",
  },
] as const;

/** Extraction déterministe selon le type de fichier (zéro LLM). */
async function extractContent(absPath: string, fileType: SpawtSourceSpec["fileType"]): Promise<string> {
  const buffer = readFileSync(absPath);

  if (fileType === "DOCX") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileType === "XLSX") {
    const { readXlsxWorkbook } = await import("@/server/services/utils/xlsx-read");
    const workbook = await readXlsxWorkbook(buffer);
    const parts: string[] = [];
    for (const name of workbook.sheetNames) {
      const sheet = workbook.getSheet(name);
      if (!sheet) continue;
      parts.push(`=== Feuille: ${name} ===\n${sheet.csv}`);
    }
    return parts.join("\n\n");
  }

  // TXT / MD — texte brut
  return buffer.toString("utf8");
}

export async function seedSpawtSources(prisma: PrismaClient, strategyId: string): Promise<void> {
  const baseDir = join(process.cwd(), "Customers", "SPAWT");
  let created = 0;
  let skipped = 0;

  for (const spec of SPAWT_SOURCES) {
    const absPath = join(baseDir, spec.file);
    if (!existsSync(absPath)) {
      console.warn(`[seed-spawt-sources] fichier introuvable, ignoré : ${spec.file}`);
      skipped++;
      continue;
    }

    const origin = `upload:${spec.file}`;
    let rawContent: string;
    try {
      rawContent = await extractContent(absPath, spec.fileType);
    } catch (err) {
      console.warn(`[seed-spawt-sources] extraction échouée pour ${spec.file} :`, err instanceof Error ? err.message : err);
      skipped++;
      continue;
    }

    const pillarMapping = Object.fromEntries(spec.pillars.map((p) => [p, true]));
    const wordCount = rawContent.split(/\s+/).filter(Boolean).length;

    // Idempotent : upsert par (strategyId, origin). Pas de contrainte unique
    // sur (strategyId, origin) → findFirst + create/update manuel.
    const existing = await prisma.brandDataSource.findFirst({
      where: { strategyId, origin },
      select: { id: true },
    });

    const data = {
      sourceType: "FILE",
      fileName: spec.label,
      fileType: spec.fileType === "MD" ? "TXT" : spec.fileType,
      rawContent,
      processingStatus: "EXTRACTED",
      certainty: spec.certainty,
      origin,
      pillarMapping: pillarMapping as Prisma.InputJsonValue,
      extractedFields: { wordCount, fileSource: spec.file } as Prisma.InputJsonValue,
    };

    if (existing) {
      await prisma.brandDataSource.update({ where: { id: existing.id }, data });
    } else {
      await prisma.brandDataSource.create({ data: { strategyId, ...data } });
      created++;
    }
  }

  console.log(`[OK] SPAWT : ${created} source(s) créée(s)${skipped ? `, ${skipped} ignorée(s)` : ""} (vault alimenté pour enrichissement + validation)`);
}
