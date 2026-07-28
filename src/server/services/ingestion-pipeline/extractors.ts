/**
 * Ingestion Pipeline — File Extractors
 * Converts raw files into structured text for AI analysis
 */

import { readXlsxWorkbook } from "@/server/services/utils/xlsx-read";
import type { ExtractionResult } from "./types";

/**
 * Extract text from a PDF buffer
 */
export async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule as any).default ?? pdfModule;
  const data = await (pdfParse as any)(buffer);
  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      wordCount: data.text.split(/\s+/).length,
    },
  };
}

/**
 * Extract text from a DOCX buffer
 */
export async function extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    metadata: {
      wordCount: result.value.split(/\s+/).length,
    },
  };
}

/**
 * Extract structured data from an XLSX buffer
 */
export async function extractXLSX(buffer: Buffer): Promise<ExtractionResult> {
  const workbook = await readXlsxWorkbook(buffer);
  const sheets = workbook.sheetNames;
  const structured: Record<string, unknown> = {};
  const textParts: string[] = [];

  for (const name of sheets) {
    const sheet = workbook.getSheet(name);
    if (!sheet) continue;
    structured[name] = sheet.rows;
    // Convert to readable text for AI
    textParts.push(`=== Feuille: ${name} ===\n${sheet.csv}`);
  }

  const text = textParts.join("\n\n");
  return {
    text,
    structured,
    metadata: {
      sheets,
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Lecture d'image — REFUS HONNÊTE, en attendant une vraie voie vision.
 *
 * Cette fonction envoyait `rawBase64.slice(0, 200)` — deux cents caractères
 * d'en-tête base64 — à un modèle **texte**, avec la consigne de décrire
 * l'image « de manière détaillée » : couleurs dominantes, typographies,
 * textes lisibles. Aucun de ces éléments n'était transmis. **Tout ce qui
 * ressortait était inventé**, puis stocké en `rawContent` d'une
 * `BrandDataSource` — c'est-à-dire présenté au reste de l'OS comme un document
 * de la marque.
 *
 * Depuis l'ancrage documentaire (ADR-0184), c'est devenu franchement dangereux :
 * une description fabriquée deviendrait une source « recouvrante », et la
 * mécanique censée détecter l'invention l'aurait au contraire blanchie.
 *
 * Le Gateway n'expose aucune surface vision (`callLLM` ne transporte pas
 * d'image). Tant qu'elle n'existe pas, on refuse en le disant : le fichier
 * reste tracé côté `BrandDataSource`, avec un message qui dit quoi faire.
 *
 * @throws toujours — `ingestFile` marque la source FAILED + `errorMessage`.
 */
export async function extractImage(
  _base64Data: string,
  _strategyId: string,
): Promise<ExtractionResult> {
  throw new Error(
    "Lecture d'image non disponible : nous ne savons pas encore lire le contenu d'une image. " +
      "Déposez la version PDF ou texte du document, ou décrivez-le en note — " +
      "nous préférons ne rien écrire plutôt que d'inventer une description.",
  );
}

/**
 * Passthrough for plain text
 */
export function extractText(content: string): ExtractionResult {
  return {
    text: content,
    metadata: { wordCount: content.split(/\s+/).length },
  };
}

/**
 * Auto-dispatch extraction based on file type
 */
export async function extractAuto(
  fileType: string,
  content: string, // base64 for files, raw text for text
  strategyId: string,
): Promise<ExtractionResult> {
  const ft = fileType.toUpperCase();

  if (ft === "PDF") {
    const buf = Buffer.from(content, "base64");
    return extractPDF(buf);
  }
  if (ft === "DOCX" || ft === "DOC") {
    const buf = Buffer.from(content, "base64");
    return extractDOCX(buf);
  }
  if (ft === "XLSX") {
    return extractXLSX(Buffer.from(content, "base64"));
  }
  if (ft === "XLS") {
    // exceljs ne lit pas le .xls binaire legacy (BIFF) — message clair plutôt
    // qu'un échec cryptique. L'opérateur convertit en .xlsx ou .csv.
    throw new Error("Format .xls (Excel legacy) non supporté — convertir en .xlsx ou .csv.");
  }
  if (ft === "CSV") {
    // CSV = texte délimité ; pas besoin d'un moteur tableur.
    return extractText(Buffer.from(content, "base64").toString("utf8"));
  }
  if (ft === "IMG" || ft === "PNG" || ft === "JPG" || ft === "JPEG" || ft === "WEBP" || ft === "GIF" || ft === "SVG") {
    return extractImage(content, strategyId);
  }
  // Default: treat as text
  return extractText(content);
}
