/**
 * Brief Ingest Pipeline — Thin Extraction Layer
 *
 * NETERU-Governed Architecture:
 *   This service handles ONLY extraction and analysis (PDF → ParsedBrief).
 *   All creation logic (ADVE seeding, Campaign, Missions, RTIS cascade)
 *   is delegated to the Hyperviseur via buildBriefIngestPlan().
 *
 * Flow:
 *   1. previewBrief()     — Extract + LLM parse + client resolution → for operator review
 *   2. confirmIngest()    — Resolve brand → hand off to Hyperviseur for full orchestration
 */

import { db } from "@/lib/db";
import { extractPDF, extractDOCX } from "@/server/services/ingestion-pipeline/extractors";
import { analyzeBrief, type AnalysisResult } from "./analyzer";
import { resolveClient, createClientAndStrategy } from "./brand-resolver";
import { buildBriefIngestPlan, executePlan, type OrchestrationPlan } from "@/server/services/mestor/hyperviseur";
import type { ParsedBrief } from "./types";
import type { Prisma } from "@prisma/client";

// Re-exports for router
export type { AnalysisResult } from "./analyzer";
export { spawnMissions } from "./mission-spawner";

// ── Phase 1: Preview (extraction only — no side effects) ────────────────────

export interface PreviewResult {
  analysis: AnalysisResult;
  rawText: string;
}

export async function previewBrief(
  fileName: string,
  fileType: string,
  content: string,
): Promise<PreviewResult> {
  const rawText = await extractText(fileType, content);
  const analysis = await analyzeBrief(rawText);

  if (analysis.parsed) {
    const resolution = await resolveClient(analysis.parsed.client);
    analysis.parsed.clientResolution = resolution;
  }

  return { analysis, rawText };
}

// ── Phase 2: Confirm → Resolve brand, then delegate to Hyperviseur ──────────

export interface ConfirmResult {
  clientId: string;
  strategyId: string;
  plan: OrchestrationPlan;
}

export async function confirmIngest(
  parsed: ParsedBrief,
  operatorId: string,
  options: {
    newClientMode?: "FAST_TRACK" | "ONBOARDING_FIRST";
    operatorNotes?: string;
  } = {},
): Promise<ConfirmResult> {
  // Step 1: Resolve or create Client + Strategy (the ONLY direct creation here)
  const { clientId, strategyId } = await resolveOrCreateBrand(parsed, operatorId, options);

  // Step 2: Store brief as BrandDataSource for traceability
  await db.brandDataSource.create({
    data: {
      strategyId,
      sourceType: "FILE",
      fileName: `Brief — ${parsed.campaignName}`,
      fileType: "PDF",
      rawContent: JSON.stringify(parsed),
      processingStatus: "PROCESSED",
      pillarMapping: { a: true, d: true, v: true, e: true } as Prisma.InputJsonValue,
    },
  });

  // Step 3: Build orchestration plan — Hyperviseur decides what happens next
  const plan = await buildBriefIngestPlan(strategyId, parsed);

  // Step 4: Execute plan (runs until first WAIT_HUMAN or completion)
  await executePlan(plan);

  return { clientId, strategyId, plan };
}

// ── Brand resolution (only thing that MUST happen before Hyperviseur) ────────

async function resolveOrCreateBrand(
  parsed: ParsedBrief,
  operatorId: string,
  options: { newClientMode?: "FAST_TRACK" | "ONBOARDING_FIRST" },
): Promise<{ clientId: string; strategyId: string }> {
  // Existing client found
  if (parsed.clientResolution?.found && parsed.clientResolution.clientId) {
    let strategyId = parsed.clientResolution.strategyId;

    if (!strategyId) {
      const strategy = await db.strategy.create({
        data: {
          name: `${parsed.client.brandName} — Strategy`,
          description: parsed.context.marketContext,
          businessContext: JSON.stringify({
            sector: parsed.client.sector,
            country: parsed.client.country,
          }),
          brandNature: "PRODUCT",
          status: "IN_PROGRESS",
          clientId: parsed.clientResolution.clientId,
          userId: operatorId,
          operatorId,
        },
      });
      strategyId = strategy.id;
    }

    return { clientId: parsed.clientResolution.clientId, strategyId };
  }

  // New client
  const result = await createClientAndStrategy(parsed, operatorId);

  if (options.newClientMode === "ONBOARDING_FIRST") {
    await db.strategy.update({
      where: { id: result.strategyId },
      data: { status: "PENDING_ONBOARDING" as string },
    });
  }

  return result;
}

// ── Text extraction helpers ─────────────────────────────────────────────────

async function extractText(fileType: string, base64Content: string): Promise<string> {
  const buffer = Buffer.from(base64Content, "base64");
  const ft = fileType.toUpperCase();

  if (ft === "PDF") {
    const result = await extractPDF(buffer);
    if (result.text.trim().length < 100) {
      return await extractWithVision(base64Content);
    }
    return result.text;
  }

  if (ft === "DOCX") {
    const result = await extractDOCX(buffer);
    return result.text;
  }

  return buffer.toString("utf-8");
}

async function extractWithVision(base64Content: string): Promise<string> {
  const { callLLM } = await import("@/server/services/llm-gateway");
  const result = await callLLM({
    system: "Tu es un expert en OCR. Extrais tout le texte visible de cette image de document, en préservant la structure (titres, listes, paragraphes).",
    prompt: `[Image du document en base64 — ${base64Content.length} caractères]`,
    caller: "brief-ingest:vision-ocr",
    model: "claude-sonnet-4-20250514",
    maxTokens: 4000,
    tags: ["brief-ingest", "ocr"],
  });
  return result.text;
}
