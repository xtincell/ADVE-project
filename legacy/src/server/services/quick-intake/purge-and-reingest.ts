/**
 * INTAKE_SOURCE_PURGE_AND_REINGEST handler — ADR-0033.
 *
 * Atomic operation that "depollutes" a brand's intake-origin source when the
 * extraction produced bad data (hallucinations, wrong sector, garbage). In a
 * single Prisma transaction :
 *
 *   1. Verifies the source exists and has origin="intake:<id>" (refuse to
 *      purge non-intake sources to avoid accidents — the cockpit UI only
 *      surfaces this button next to intake-origin rows anyway, but we
 *      defend in depth).
 *   2. Verifies the brand name (case-insensitive) matches confirmName for
 *      anti-foot-gun (mirrors ADR-0028 strategy-archive purge pattern).
 *   3. Deletes the BrandDataSource row.
 *   4. Deletes the BrandAsset INTAKE_REPORT row (auto-recreated on next
 *      activateBrand call if needed).
 *   5. Resets the ADVE Pillar.content (A/D/V/E) to {} — RTIS pillars stay
 *      untouched since they're derived (will be marked staleAt by the next
 *      ENRICH_R_FROM_ADVE intent).
 *   6. Recreates a fresh BrandDataSource with the original QuickIntake
 *      responses + rawText — same content, but reset extractedFields
 *      (operator can then re-trigger the extraction pipeline manually via
 *      ingestion.process or wait for Notoria).
 *
 * Called only via mestor.emitIntent("INTAKE_SOURCE_PURGE_AND_REINGEST").
 *
 * Cf. ADR-0028 (strategy-archive 2-phase pattern) + ADR-0032 (origin marker).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ADVE_KEYS } from "@/domain";
import type { Intent, IntentResult } from "@/server/services/mestor/intents";

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

type PurgeIntent = Extract<Intent, { kind: "INTAKE_SOURCE_PURGE_AND_REINGEST" }>;

export interface PurgeReingestOutput {
  strategyId: string;
  intakeId: string;
  oldSourceId: string;
  newSourceId: string;
  intakeReportDeleted: boolean;
  pillarsReset: readonly string[];
  reingested: {
    rawDataKeys: number;
    rawTextLength: number;
  };
}

export async function purgeAndReingestHandler(
  intent: PurgeIntent,
): Promise<HandlerResult> {
  try {
    const result = await purgeAndReingest(
      intent.strategyId,
      intent.sourceId,
      intent.confirmName,
    );
    return {
      status: "OK",
      summary:
        `Source ${result.oldSourceId} purged + re-ingested as ${result.newSourceId} ` +
        `(intake ${result.intakeId}, reset ${result.pillarsReset.join(",")} pillars).`,
      tool: "quick-intake.purge-and-reingest",
      output: result,
      estimatedCost: { amount: 0, currency: "USD" },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "VETOED",
      summary: msg,
      tool: "quick-intake.purge-and-reingest",
      reason: msg.includes("confirmName")
        ? "CONFIRM_NAME_MISMATCH"
        : msg.includes("not an intake source")
          ? "NOT_INTAKE_ORIGIN"
          : msg.includes("intake not found")
            ? "INTAKE_NOT_FOUND"
            : "NOT_FOUND",
    };
  }
}

export async function purgeAndReingest(
  strategyId: string,
  sourceId: string,
  confirmName: string,
): Promise<PurgeReingestOutput> {
  // ── Pre-flight checks (outside transaction — read-only) ──

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, name: true },
  });
  if (!strategy) throw new Error(`Strategy ${strategyId} not found`);

  // Anti-foot-gun: confirmName must equal the brand name uppercased. Empty
  // string is rejected explicitly to prevent silent skips.
  const expected = strategy.name.trim().toUpperCase();
  if (!confirmName || confirmName.trim().toUpperCase() !== expected) {
    throw new Error(
      `confirmName mismatch — expected "${expected}", got "${confirmName?.trim() ?? ""}"`,
    );
  }

  const source = await db.brandDataSource.findUnique({
    where: { id: sourceId },
    select: { id: true, strategyId: true, origin: true, fileName: true },
  });
  if (!source) throw new Error(`Source ${sourceId} not found`);
  if (source.strategyId !== strategyId) {
    throw new Error(`Source ${sourceId} does not belong to strategy ${strategyId}`);
  }
  if (!source.origin?.startsWith("intake:")) {
    throw new Error(
      `Source ${sourceId} is not an intake source (origin="${source.origin ?? "null"}"). ` +
        `Use ingestion.deleteSource for non-intake rows.`,
    );
  }

  const intakeId = source.origin.slice("intake:".length);
  const intake = await db.quickIntake.findUnique({
    where: { id: intakeId },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      sector: true,
      country: true,
      businessModel: true,
      positioning: true,
      rawText: true,
      responses: true,
    },
  });
  if (!intake) {
    throw new Error(
      `intake not found (id="${intakeId}") — source.origin pointer is dangling, ` +
        `cannot re-ingest. Use ingestion.deleteSource to clean up.`,
    );
  }

  // ── Atomic purge + reset + re-create ──

  const result = await db.$transaction(async (tx) => {
    // 1. Delete the polluted source.
    await tx.brandDataSource.delete({ where: { id: sourceId } });

    // 2. Delete the INTAKE_REPORT BrandAsset (deleteMany is idempotent —
    //    activateBrand stub strategies may not have one yet, and admin-converted
    //    strategies pre-ADR-0032 also won't).
    const reportDelete = await tx.brandAsset.deleteMany({
      where: { strategyId, kind: "INTAKE_REPORT" },
    });

    // 3. Reset ADVE Pillar.content to {}. updateMany skips RTIS rows.
    //    confidence reset to null + validationStatus → DRAFT (per Pillar
    //    schema default semantics). staleAt left untouched — the next
    //    ENRICH_R_FROM_ADVE intent will recompute it on RTIS rows naturally.
    await tx.pillar.updateMany({
      where: { strategyId, key: { in: [...ADVE_KEYS] } },
      data: {
        content: {} as Prisma.InputJsonValue,
        confidence: null,
        validationStatus: "DRAFT",
      },
    });

    // 4. Recreate a fresh source from the original intake responses. Same
    //    rawData/extractedFields as activateBrand does — the purge resets
    //    the upstream operator changes (deletions, edits) but keeps the
    //    canonical source of truth (intake.responses) intact.
    const newSource = await tx.brandDataSource.create({
      data: {
        strategyId,
        sourceType: "MANUAL_INPUT",
        fileName: `Quick Intake (re-ingéré) — ${intake.companyName ?? intake.contactName ?? ""}`,
        rawContent: [
          intake.companyName ? `Entreprise: ${intake.companyName}` : "",
          intake.sector ? `Secteur: ${intake.sector}` : "",
          intake.country ? `Pays: ${intake.country}` : "",
          intake.businessModel ? `Modele: ${intake.businessModel}` : "",
          intake.positioning ? `Positionnement: ${intake.positioning}` : "",
          intake.rawText ?? "",
        ].filter(Boolean).join("\n"),
        rawData: (intake.responses ?? {}) as Prisma.InputJsonValue,
        extractedFields: (intake.responses ?? {}) as Prisma.InputJsonValue,
        pillarMapping: { a: true, d: true, v: true, e: true } as Prisma.InputJsonValue,
        processingStatus: "EXTRACTED", // Ready for ingestion.process re-run.
        certainty: "DECLARED",
        origin: `intake:${intake.id}`,
      },
    });

    return {
      newSourceId: newSource.id,
      intakeReportDeleted: reportDelete.count > 0,
      pillarsReset: ADVE_KEYS,
    };
  });

  const responseKeys = Object.keys(
    (intake.responses ?? {}) as Record<string, unknown>,
  );

  return {
    strategyId,
    intakeId: intake.id,
    oldSourceId: sourceId,
    newSourceId: result.newSourceId,
    intakeReportDeleted: result.intakeReportDeleted,
    pillarsReset: result.pillarsReset,
    reingested: {
      rawDataKeys: responseKeys.length,
      rawTextLength: (intake.rawText ?? "").length,
    },
  };
}
