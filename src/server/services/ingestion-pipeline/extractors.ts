/**
 * Ingestion Pipeline — File Extractors
 * Converts raw files into structured text for AI analysis
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { db } from "@/lib/db";
import type { ExtractionResult } from "./types";

/**
 * Extract text from a PDF buffer
 */
export async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule as { default?: (buf: Buffer) => Promise<{ text: string; numpages: number }> }).default ?? pdfModule;
  const data = await (pdfParse as (buf: Buffer) => Promise<{ text: string; numpages: number }>)(buffer);
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
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = workbook.SheetNames;
  const structured: Record<string, unknown> = {};
  const textParts: string[] = [];

  for (const name of sheets) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    structured[name] = json;
    // Convert to readable text for AI
    const csv = XLSX.utils.sheet_to_csv(sheet);
    textParts.push(`=== Feuille: ${name} ===\n${csv}`);
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
 * Extract description from an image using Claude vision
 */
export async function extractImage(
  base64Data: string,
  strategyId: string,
): Promise<ExtractionResult> {
  const mediaType = base64Data.startsWith("data:image/png") ? "image/png" as const
    : base64Data.startsWith("data:image/gif") ? "image/gif" as const
    : base64Data.startsWith("data:image/webp") ? "image/webp" as const
    : "image/jpeg" as const;

  // Strip data URL prefix if present
  const rawBase64 = base64Data.replace(/^data:image\/[^;]+;base64,/, "");

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: rawBase64,
            mimeType: mediaType,
          },
          {
            type: "text",
            text: `Decris cette image de maniere detaillee dans le contexte d'une marque/entreprise.
Identifie : type de document (logo, charte, photo produit, affiche, etc.),
couleurs dominantes, typographies visibles, textes lisibles, elements graphiques,
ton general, et toute information utile pour definir l'identite de marque.
Reponds en francais.`,
          },
        ],
      },
    ],
    maxTokens: 1500,
  });

  // Track cost
  await db.aICostLog.create({
    data: {
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
      cost: ((result.usage?.promptTokens ?? 0) / 1_000_000) * 3 + ((result.usage?.completionTokens ?? 0) / 1_000_000) * 15,
      context: "ingestion:image-extract",
      strategyId,
    },
  }).catch((err) => { console.warn("[ingestion] image extraction cost log failed:", err instanceof Error ? err.message : err); });

  return {
    text: result.text,
    metadata: {
      dimensions: "image",
      wordCount: result.text.split(/\s+/).length,
    },
  };
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
  if (ft === "XLSX" || ft === "XLS" || ft === "CSV") {
    const buf = Buffer.from(content, "base64");
    return extractXLSX(buf);
  }
  if (ft === "IMG" || ft === "PNG" || ft === "JPG" || ft === "JPEG" || ft === "WEBP" || ft === "GIF" || ft === "SVG") {
    return extractImage(content, strategyId);
  }
  // Default: treat as text
  return extractText(content);
}
