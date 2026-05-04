/**
 * MarketStudy ingestion orchestrator (ADR-0037 PR-I).
 *
 * Workflow :
 *   1. sha256 file → check dedup (existing MARKET_STUDY_RAW with same hash)
 *   2. extractText (PDF/DOCX/XLSX) — réutilise ingestion-pipeline
 *   3. extractMarketStudy LLM call → MarketStudyExtraction
 *   4. resolveCountryCode + resolveSector (declared || inferred from extraction)
 *   5. persistMarketStudy → N KnowledgeEntry rows
 *
 * Re-export `previewMarketStudy` for the UI flow (PR-J) which extracts
 * but doesn't persist — operator confirms after editing.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { extractPDF, extractDOCX, extractXLSX } from "@/server/services/ingestion-pipeline/extractors";
import { extractMarketStudy } from "./extractor-llm";
import { persistMarketStudy, deleteDerivedEntries } from "./persister";
import type { IngestMarketStudyInput, IngestMarketStudyResult, MarketStudyExtraction } from "./types";

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function extractText(file: { buffer: Buffer; filename: string; mimeType: string }): Promise<string> {
  const lower = file.filename.toLowerCase();
  if (lower.endsWith(".pdf") || file.mimeType.includes("pdf")) {
    const r = await extractPDF(file.buffer);
    return r.text;
  }
  if (lower.endsWith(".docx") || file.mimeType.includes("wordprocessingml")) {
    const r = await extractDOCX(file.buffer);
    return r.text;
  }
  if (lower.endsWith(".xlsx") || file.mimeType.includes("spreadsheetml")) {
    const r = await extractXLSX(file.buffer);
    return r.text;
  }
  throw new Error(`Unsupported file type: ${file.filename} (${file.mimeType})`);
}

async function findExistingByHash(hash: string) {
  return db.knowledgeEntry.findFirst({
    where: { entryType: "MARKET_STUDY_RAW", sourceHash: hash },
    select: { id: true, sector: true, countryCode: true, createdAt: true },
  });
}

function resolveCountryCode(declared: string | undefined, geography: string | undefined): string | undefined {
  if (declared) return declared.toUpperCase();
  if (!geography) return undefined;
  const m = geography.match(/\b([A-Z]{2})\b/);
  if (m) return m[1];
  // Tolerant heuristic for common labels.
  const map: Record<string, string> = {
    "south africa": "ZA", "afrique du sud": "ZA",
    "cameroon": "CM", "cameroun": "CM",
    "côte d'ivoire": "CI", "ivory coast": "CI", "cote d'ivoire": "CI",
    "senegal": "SN", "sénégal": "SN",
    "nigeria": "NG", "ghana": "GH", "morocco": "MA", "maroc": "MA",
    "france": "FR", "united states": "US", "usa": "US",
  };
  return map[geography.toLowerCase().trim()];
}

function resolveSector(declared: string | undefined, sectorCoverage: string[]): string | undefined {
  if (declared) return declared;
  return sectorCoverage[0];
}

/**
 * Main entry point — orchestrates the full ingestion flow.
 * Returns a result envelope ; never throws on parsing/extraction
 * failures — caller decides whether to retry or surface the error.
 */
export async function ingestMarketStudy(input: IngestMarketStudyInput): Promise<IngestMarketStudyResult> {
  const hash = sha256(input.file.buffer);

  // 1. Dedup check
  const existing = await findExistingByHash(hash);
  if (existing) {
    return {
      status: "DUPLICATE",
      sha256: hash,
      countryCode: existing.countryCode ?? undefined,
      sector: existing.sector ?? undefined,
      entriesCreated: 0,
      rawEntryId: existing.id,
    };
  }

  // 2. Extract text
  let text: string;
  try {
    text = await extractText(input.file);
  } catch (err) {
    return { status: "PARSE_FAILED", sha256: hash, entriesCreated: 0, error: err instanceof Error ? err.message : String(err) };
  }

  if (text.trim().length < 200) {
    return { status: "PARSE_FAILED", sha256: hash, entriesCreated: 0, error: `Extracted text too short (${text.length} chars)` };
  }

  // 3. LLM extraction
  const extracted = await extractMarketStudy({
    text,
    declaredCountryCode: input.declaredCountryCode,
    declaredSector: input.declaredSector,
    sourceFilename: input.file.filename,
  });
  if (!extracted.ok) {
    return { status: "PARSE_FAILED", sha256: hash, entriesCreated: 0, error: extracted.error };
  }

  // 4. Resolve scope
  const countryCode = resolveCountryCode(input.declaredCountryCode, extracted.extraction.study.geography);
  const sector = resolveSector(input.declaredSector, extracted.extraction.study.sectorCoverage);

  if (!countryCode || !sector) {
    return {
      status: "EMPTY_EXTRACTION",
      sha256: hash,
      countryCode,
      sector,
      entriesCreated: 0,
      extraction: extracted.extraction,
      error: `Cannot resolve scope: countryCode=${countryCode ?? "?"} sector=${sector ?? "?"}. Operator must declare them in the upload UI.`,
    };
  }

  // 5. Persist
  const persisted = await persistMarketStudy(extracted.extraction, {
    countryCode,
    sector,
    sha256: hash,
    uploadedBy: input.uploadedBy,
    sourceUrl: input.sourceUrl,
    strategyId: input.strategyId,
  });

  return {
    status: "OK",
    sha256: hash,
    countryCode,
    sector,
    entriesCreated: persisted.totalCreated,
    rawEntryId: persisted.rawEntryId,
    extraction: extracted.extraction,
  };
}

/**
 * Preview extraction without persisting. UI calls this to show the
 * operator the extracted MarketStudyExtraction so it can be edited
 * before confirm. Operator confirm → calls `ingestMarketStudy` (or a
 * variant that takes the edited extraction directly — see PR-J).
 */
export async function previewMarketStudy(input: IngestMarketStudyInput): Promise<{
  ok: true;
  sha256: string;
  text: string;
  extraction: MarketStudyExtraction;
  resolvedCountryCode?: string;
  resolvedSector?: string;
  alreadyIngested: boolean;
} | { ok: false; sha256: string; error: string }> {
  const hash = sha256(input.file.buffer);
  const existing = await findExistingByHash(hash);

  let text: string;
  try {
    text = await extractText(input.file);
  } catch (err) {
    return { ok: false, sha256: hash, error: err instanceof Error ? err.message : String(err) };
  }

  if (text.trim().length < 200) {
    return { ok: false, sha256: hash, error: `Extracted text too short (${text.length} chars)` };
  }

  const extracted = await extractMarketStudy({
    text,
    declaredCountryCode: input.declaredCountryCode,
    declaredSector: input.declaredSector,
    sourceFilename: input.file.filename,
  });
  if (!extracted.ok) {
    return { ok: false, sha256: hash, error: extracted.error };
  }

  return {
    ok: true,
    sha256: hash,
    text: text.slice(0, 5000), // truncated preview
    extraction: extracted.extraction,
    resolvedCountryCode: resolveCountryCode(input.declaredCountryCode, extracted.extraction.study.geography),
    resolvedSector: resolveSector(input.declaredSector, extracted.extraction.study.sectorCoverage),
    alreadyIngested: existing !== null,
  };
}

/**
 * Confirm an edited extraction (post-preview operator review).
 * Re-runs persistence with the operator-corrected MarketStudyExtraction.
 */
export async function confirmMarketStudy(input: {
  sha256: string;
  countryCode: string;
  sector: string;
  uploadedBy: string;
  extraction: MarketStudyExtraction;
  sourceUrl?: string;
  strategyId?: string;
}): Promise<IngestMarketStudyResult> {
  const existing = await findExistingByHash(input.sha256);
  if (existing) {
    return {
      status: "DUPLICATE",
      sha256: input.sha256,
      countryCode: existing.countryCode ?? undefined,
      sector: existing.sector ?? undefined,
      entriesCreated: 0,
      rawEntryId: existing.id,
    };
  }
  const persisted = await persistMarketStudy(input.extraction, {
    countryCode: input.countryCode,
    sector: input.sector,
    sha256: input.sha256,
    uploadedBy: input.uploadedBy,
    sourceUrl: input.sourceUrl,
    strategyId: input.strategyId,
  });
  return {
    status: "OK",
    sha256: input.sha256,
    countryCode: input.countryCode,
    sector: input.sector,
    entriesCreated: persisted.totalCreated,
    rawEntryId: persisted.rawEntryId,
    extraction: input.extraction,
  };
}

/**
 * Re-extract a study from its stored RAW entry (when schema evolves).
 * Deletes derived entries, re-runs LLM with current schema, repersists.
 */
export async function reExtractMarketStudy(rawEntryId: string): Promise<IngestMarketStudyResult> {
  const raw = await db.knowledgeEntry.findUnique({ where: { id: rawEntryId } });
  if (!raw || raw.entryType !== "MARKET_STUDY_RAW") {
    return { status: "PARSE_FAILED", sha256: "", entriesCreated: 0, error: "Raw entry not found or wrong type" };
  }

  const data = raw.data as { fullExtraction?: MarketStudyExtraction; uploadedBy?: string; sha256?: string };
  if (!data.fullExtraction || !raw.sourceHash) {
    return { status: "PARSE_FAILED", sha256: raw.sourceHash ?? "", entriesCreated: 0, error: "Raw entry missing fullExtraction or sha256" };
  }

  const deletedCount = await deleteDerivedEntries(raw.sourceHash);
  console.log(`[market-study-reextract] deleted ${deletedCount} derived entries before re-extract`);

  // Note: in a real re-extract we would re-run extractMarketStudy with the
  // archived raw text. Here we only re-persist from the existing fullExtraction
  // — the operator clicks "Re-extract" when the SCHEMA evolved, not the raw text.
  // If text re-extraction is needed, that is a separate flow that re-uploads.
  const persisted = await persistMarketStudy(data.fullExtraction, {
    countryCode: raw.countryCode ?? "",
    sector: raw.sector ?? "",
    sha256: raw.sourceHash,
    uploadedBy: data.uploadedBy ?? "system:re-extract",
  });

  return {
    status: "OK",
    sha256: raw.sourceHash,
    countryCode: raw.countryCode ?? undefined,
    sector: raw.sector ?? undefined,
    entriesCreated: persisted.totalCreated,
    rawEntryId: raw.id,
    extraction: data.fullExtraction,
  };
}
