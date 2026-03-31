import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

export type CaptureEventType =
  | "DIAGNOSTIC_RESULT"
  | "MISSION_OUTCOME"
  | "BRIEF_PATTERN"
  | "CREATOR_PATTERN"
  | "SECTOR_BENCHMARK"
  | "CAMPAIGN_TEMPLATE";

export interface CaptureContext {
  sector?: string;
  market?: string;
  channel?: string;
  pillarFocus?: string;
  businessModel?: string;
  data: Record<string, unknown>;
  successScore?: number;
  sourceId?: string; // Will be hashed for anonymization
}

/**
 * Passive knowledge capture service.
 * Called as a side-effect from other services to build the Knowledge Graph.
 * Runs from Phase 0 onwards.
 */
export async function captureEvent(
  type: CaptureEventType,
  context: CaptureContext
): Promise<void> {
  try {
    const sourceHash = context.sourceId
      ? crypto.createHash("sha256").update(context.sourceId).digest("hex").substring(0, 16)
      : undefined;

    await db.knowledgeEntry.create({
      data: {
        entryType: type,
        sector: context.sector,
        market: context.market,
        channel: context.channel,
        pillarFocus: context.pillarFocus,
        businessModel: context.businessModel,
        data: context.data as Prisma.InputJsonValue,
        successScore: context.successScore,
        sourceHash,
      },
    });
  } catch {
    // Knowledge capture is passive — never fail the parent operation
  }
}
