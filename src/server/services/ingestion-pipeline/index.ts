// ============================================================================
// MODULE M41 — Ingestion Pipeline + AI ADVE Filler
// Score: 60/100 | Priority: P1 | Status: IN_PROGRESS
// Spec: Plan Phase 2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Ingest any document (PDF, website, social, brand book)
// [x] REQ-2  Extract structured data via specialized extractors
// [x] REQ-3  AI ADVE Filler: map extracted data to 8 ADVE pillars
// [x] REQ-4  Orchestrator: ingest → extract → analyze → fill → validate → RTIS
// [ ] REQ-5  BrandDataSource model tracking (source URL, type, extractedAt, status)
// [ ] REQ-6  Validation step: confidence score per filled field
// [ ] REQ-7  RTIS cascade: after ADVE fill, auto-trigger R→T→I→S generation
// [ ] REQ-8  Batch ingestion (multiple sources for same strategy)
// [ ] REQ-9  Incremental updates (re-ingest changed sources only)
//
// EXPORTS: ingest, extract, fillADVE, orchestrate
// FLOW: Source → Extract → Analyze → Fill ADVE pillars → Validate → Trigger RTIS
// ============================================================================

/**
 * Ingestion Pipeline — Orchestrator
 * Manages the full lifecycle: ingest → extract → analyze → fill ADVE → validate → RTIS
 */

import { db } from "@/lib/db";
import { extractAuto } from "./extractors";
import { analyzeAndMapSources, fillPillar, fillRTISPillar } from "./ai-filler";
import { scoreObject } from "@/server/services/advertis-scorer";
import { executeFirstValueProtocol } from "@/server/services/pipeline-orchestrator";
import { getCrossRefSummary } from "@/server/services/cross-validator";
import type { IngestionStatus, PillarFillResult } from "./types";
import type { Prisma } from "@prisma/client";

export { analyzeAndMapSources } from "./ai-filler";

// ============================================================================
// INGEST FILE — Creates a BrandDataSource and extracts content
// ============================================================================

export async function ingestFile(
  strategyId: string,
  file: { name: string; content: string; type: string },
): Promise<string> {
  const source = await db.brandDataSource.create({
    data: {
      strategyId,
      sourceType: "FILE",
      fileName: file.name,
      fileType: file.type.toUpperCase(),
      processingStatus: "EXTRACTING",
    },
  });

  try {
    const result = await extractAuto(file.type, file.content, strategyId);
    await db.brandDataSource.update({
      where: { id: source.id },
      data: {
        rawContent: result.text,
        rawData: result.structured as Prisma.InputJsonValue ?? undefined,
        extractedFields: result.metadata as Prisma.InputJsonValue,
        processingStatus: "EXTRACTED",
      },
    });
  } catch (error) {
    await db.brandDataSource.update({
      where: { id: source.id },
      data: {
        processingStatus: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Extraction failed",
      },
    });
  }

  return source.id;
}

// ============================================================================
// INGEST TEXT — Manual text input
// ============================================================================

export async function ingestText(
  strategyId: string,
  text: string,
  label?: string,
): Promise<string> {
  const source = await db.brandDataSource.create({
    data: {
      strategyId,
      sourceType: "MANUAL_INPUT",
      fileName: label ?? "Texte saisi",
      fileType: "TXT",
      rawContent: text,
      processingStatus: "EXTRACTED",
      extractedFields: { wordCount: text.split(/\s+/).length } as Prisma.InputJsonValue,
    },
  });

  return source.id;
}

// ============================================================================
// PROCESS STRATEGY — Full pipeline: extract → analyze → fill ADVE
// ============================================================================

export async function processStrategy(
  strategyId: string,
  onProgress?: (status: IngestionStatus) => void,
): Promise<IngestionStatus> {
  const status: IngestionStatus = {
    strategyId,
    phase: "EXTRACTING",
    currentPillar: null,
    progress: 0,
    results: [],
    errors: [],
  };

  const emit = () => onProgress?.(status);

  try {
    // --- Phase 1: Extract pending sources ---
    const pendingSources = await db.brandDataSource.findMany({
      where: { strategyId, processingStatus: "PENDING" },
    });

    for (const src of pendingSources) {
      try {
        await db.brandDataSource.update({ where: { id: src.id }, data: { processingStatus: "EXTRACTING" } });
        const result = await extractAuto(src.fileType ?? "TXT", src.rawContent ?? "", strategyId);
        await db.brandDataSource.update({
          where: { id: src.id },
          data: {
            rawContent: result.text,
            rawData: result.structured as Prisma.InputJsonValue ?? undefined,
            extractedFields: result.metadata as Prisma.InputJsonValue,
            processingStatus: "EXTRACTED",
          },
        });
      } catch (error) {
        await db.brandDataSource.update({
          where: { id: src.id },
          data: {
            processingStatus: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Extraction failed",
          },
        });
        status.errors.push(`Extraction echouee: ${src.fileName ?? src.id}`);
      }
    }

    status.progress = 0.1;
    emit();

    // --- Phase 2: Analyze and map sources to pillars ---
    status.phase = "ANALYZING";
    emit();

    const mapping = await analyzeAndMapSources(strategyId);
    status.progress = 0.2;
    emit();

    // --- Phase 3: Fill ADVE pillars (A → D → V → E) ---
    status.phase = "FILLING_ADVE";
    const pillarKeys = ["A", "D", "V", "E"] as const;

    for (let i = 0; i < pillarKeys.length; i++) {
      const key = pillarKeys[i]!;
      status.currentPillar = key as string;
      status.progress = 0.2 + (i / pillarKeys.length) * 0.6;
      emit();

      const sourceIds = mapping[key] ?? [];
      // If no specific sources mapped, use all extracted sources
      const effectiveSourceIds = sourceIds.length > 0
        ? sourceIds
        : (await db.brandDataSource.findMany({ where: { strategyId, processingStatus: "EXTRACTED" }, select: { id: true } })).map((s) => s.id);

      try {
        const result = await fillPillar(strategyId, key, effectiveSourceIds);
        status.results.push(result);

        // Mark sources as processed
        for (const sid of effectiveSourceIds) {
          await db.brandDataSource.update({
            where: { id: sid },
            data: { processingStatus: "PROCESSED" },
          }).catch((err) => { console.warn("[ingestion] source status update failed:", err instanceof Error ? err.message : err); });
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
        status.errors.push(`Remplissage pilier ${key} echoue: ${errMsg}`);
        status.results.push({
          pillarKey: key,
          content: {},
          confidence: 0,
          sources: [],
          gloryToolsUsed: [],
          validationErrors: [{ path: "root", message: error instanceof Error ? error.message : "Erreur" }],
          completionPercentage: 0,
        });
      }
    }

    status.phase = "COMPLETE";
    status.currentPillar = null;
    status.progress = 1;
    emit();

    return status;
  } catch (error) {
    status.phase = "FAILED";
    status.errors.push(error instanceof Error ? error.message : "Pipeline error");
    emit();
    return status;
  }
}

// ============================================================================
// VALIDATE PILLAR — Operator validates an AI-proposed pillar
// ============================================================================

export async function validatePillar(
  strategyId: string,
  pillarKey: string,
  edits?: Record<string, unknown>,
): Promise<void> {
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillarKey } },
  });
  if (!pillar) throw new Error(`Pilier ${pillarKey} non trouve`);

  // Gate: check cross-references before allowing validation
  const crossRefSummary = await getCrossRefSummary(strategyId);
  if (crossRefSummary.invalid > 0) {
    throw new Error(
      `Impossible de valider le pilier ${pillarKey}: ${crossRefSummary.invalid} violation(s) cross-pilier detectee(s). Corrigez-les d'abord.`,
    );
  }

  const currentContent = (pillar.content as Record<string, unknown>) ?? {};
  const finalContent = edits ? { ...currentContent, ...edits } : currentContent;

  // Persist via Gateway — operator validation write
  const { writePillar } = await import("@/server/services/pillar-gateway");
  await writePillar({
    strategyId,
    pillarKey: pillarKey as import("@/lib/types/advertis-vector").PillarKey,
    operation: { type: "MERGE_DEEP", patch: finalContent },
    author: { system: "INGESTION", reason: `Operator validated pillar ${pillarKey}` },
    options: { targetStatus: "VALIDATED", confidenceDelta: 0.05 },
  });

  // Check if all 4 ADVE pillars are validated → auto-trigger RTIS
  const advePillars = await db.pillar.findMany({
    where: { strategyId, key: { in: ["A", "D", "V", "E"] } },
  });

  const allValidated = advePillars.length === 4 && advePillars.every((p) => p.validationStatus === "VALIDATED");
  if (allValidated) {
    await triggerRTIS(strategyId);
  }
}

// ============================================================================
// TRIGGER RTIS — Auto-fills R/T/I/S, scores, and starts First Value Protocol
// ============================================================================

export async function triggerRTIS(strategyId: string): Promise<void> {
  // Fill RTIS pillars
  for (const key of ["R", "T", "I", "S"] as const) {
    await fillRTISPillar(strategyId, key);
  }

  // Score the strategy
  await scoreObject("strategy", strategyId);

  // Start the First Value Protocol
  await executeFirstValueProtocol(strategyId).catch((err) => { console.warn("[ingestion] first-value-protocol failed:", err instanceof Error ? err.message : err); });

  // Update strategy status
  await db.strategy.update({
    where: { id: strategyId },
    data: { status: "ACTIVE" },
  });
}

// ============================================================================
// STATUS — Get current ingestion status
// ============================================================================

export async function getIngestionStatus(strategyId: string): Promise<IngestionStatus> {
  const sources = await db.brandDataSource.findMany({
    where: { strategyId },
    select: { processingStatus: true },
  });

  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, validationStatus: true, confidence: true },
  });

  const adveStatuses = ["A", "D", "V", "E"].map((k) => {
    const p = pillars.find((pil) => pil.key === k);
    return p?.validationStatus ?? "DRAFT";
  });

  const allADVEProposed = adveStatuses.every((s) => s === "AI_PROPOSED" || s === "VALIDATED" || s === "LOCKED");
  const allADVEValidated = adveStatuses.every((s) => s === "VALIDATED" || s === "LOCKED");
  const anyProcessing = sources.some((s) => s.processingStatus === "EXTRACTING" || s.processingStatus === "PROCESSING");

  let phase: IngestionStatus["phase"] = "IDLE";
  if (anyProcessing) phase = "EXTRACTING";
  else if (allADVEValidated) phase = "COMPLETE";
  else if (allADVEProposed) phase = "FILLING_ADVE";

  const progress = pillars.filter((p) => p.validationStatus !== "DRAFT").length / 8;

  return {
    strategyId,
    phase,
    currentPillar: null,
    progress,
    results: pillars.map((p) => ({
      pillarKey: p.key,
      content: {},
      confidence: p.confidence ?? 0,
      sources: [],
      gloryToolsUsed: [],
      validationErrors: [],
      completionPercentage: (p.confidence ?? 0) * 100,
    })),
    errors: [],
  };
}
