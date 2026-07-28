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
 * Decode `content` s'il s'agit REELLEMENT de base64, le rend tel quel sinon.
 *
 * `extractAuto` a deux familles d'appelants, et le contrat n'a jamais ete
 * tranche entre elles :
 *   - `ingestFile` passe du **base64** (c'est ce que l'upload transmet) ;
 *   - les chemins de RE-extraction passent `source.rawContent`, c'est-a-dire du
 *     **texte deja extrait**.
 *
 * La branche texte faisait `extractText(content)` sans distinguer : tout `.txt`
 * ou `.md` depose se retrouvait stocke **en base64 verbatim** dans
 * `rawContent` -- puis indexe, puis servi au moteur comme « documentation de la
 * marque ». Du charabia presente comme une source, ce qui est pire que rien :
 * depuis l'ancrage documentaire, ce charabia compterait comme un document.
 *
 * On ne suppose donc pas, on VERIFIE : un texte n'est traite comme du base64
 * que s'il en a strictement le jeu de caracteres ET que le decodage suivi du
 * re-encodage rend exactement l'entree. Du texte ordinaire (espaces, accents,
 * retours a la ligne, ponctuation) echoue immediatement a ce test.
 */
export function decodeIfBase64(content: string): string {
  const compact = content.trim();
  if (compact.length < 16) return content; // trop court pour trancher
  if (!/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(compact)) return content;
  const stripped = compact.replace(/[\r\n]/g, "");
  if (stripped.length % 4 !== 0) return content;
  try {
    const buf = Buffer.from(stripped, "base64");
    // Aller-retour strict : c'est ce qui distingue un vrai base64 d'un texte
    // qui n'en aurait que l'apparence.
    if (buf.toString("base64") !== stripped) return content;
    const decoded = buf.toString("utf8");
    // Un decodage qui produit des octets de remplacement n'etait pas du texte.
    if (decoded.includes("\uFFFD")) return content;
    return decoded;
  } catch {
    return content;
  }
}

/**
 * Auto-dispatch extraction based on file type
 */
export async function extractAuto(
  fileType: string,
  /** Base64 depuis l'upload, texte deja extrait depuis la re-extraction.
   *  Les types binaires decodent ; les types texte passent par `decodeIfBase64`. */
  content: string,
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
    return extractText(decodeIfBase64(content));
  }
  if (ft === "IMG" || ft === "PNG" || ft === "JPG" || ft === "JPEG" || ft === "WEBP" || ft === "GIF" || ft === "SVG") {
    return extractImage(content, strategyId);
  }
  // Texte (TXT/MD/inconnu) : decoder SI c'est du base64 (chemin upload),
  // sinon passer tel quel (chemin re-extraction). Cf. `decodeIfBase64`.
  return extractText(decodeIfBase64(content));
}
