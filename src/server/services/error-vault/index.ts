/**
 * error-vault — collecteur d'erreurs runtime centralisé (Phase 11).
 *
 * Capture serveur + client + Prisma + NSP + Ptah + stress-test + cron.
 * Déduplication via signature (sha256 des champs structurels). Si même
 * signature vue dans la dernière heure → incrémente `occurrences`, sinon
 * crée nouvelle row.
 *
 * Cf. EXPERT-PROTOCOL.md, ADR-0013.
 */

import { db } from "@/lib/db";
import { createHash } from "node:crypto";
import type { ErrorSeverity, ErrorSource } from "@prisma/client";

export interface CaptureInput {
  source: ErrorSource;
  severity?: ErrorSeverity;
  code?: string;
  message: string;
  stack?: string;
  route?: string;
  userId?: string;
  operatorId?: string;
  strategyId?: string;
  campaignId?: string;
  intentId?: string;
  trpcProcedure?: string;
  componentPath?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 heure

export function computeSignature(input: Pick<CaptureInput, "source" | "code" | "message" | "stack">): string {
  const stackTrimmed = (input.stack ?? "").slice(0, 500);
  const canonical = `${input.source}|${input.code ?? ""}|${input.message}|${stackTrimmed}`;
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

/**
 * Capture une erreur dans le vault. Best-effort — ne throw jamais (pour
 * éviter récursion infinie si la capture elle-même fail).
 */
export async function capture(input: CaptureInput): Promise<string | null> {
  try {
    const signature = computeSignature(input);
    const severity = input.severity ?? "ERROR";

    // Lookup existant dans la fenêtre dedup
    const existing = await db.errorEvent.findFirst({
      where: {
        signature,
        resolved: false,
        lastSeenAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
      },
      orderBy: { lastSeenAt: "desc" },
    });

    if (existing) {
      // Auto-resolve si false positive connu
      if (existing.knownFalsePositive) {
        await db.errorEvent.update({
          where: { id: existing.id },
          data: {
            occurrences: { increment: 1 },
            lastSeenAt: new Date(),
            resolved: true,
            resolvedReason: "knownFalsePositive",
            resolvedAt: new Date(),
          },
        });
        return existing.id;
      }

      await db.errorEvent.update({
        where: { id: existing.id },
        data: {
          occurrences: { increment: 1 },
          lastSeenAt: new Date(),
          // Update mutable fields if they were null
          userId: existing.userId ?? input.userId ?? null,
          operatorId: existing.operatorId ?? input.operatorId ?? null,
          strategyId: existing.strategyId ?? input.strategyId ?? null,
          campaignId: existing.campaignId ?? input.campaignId ?? null,
          intentId: existing.intentId ?? input.intentId ?? null,
        },
      });
      return existing.id;
    }

    const created = await db.errorEvent.create({
      data: {
        source: input.source,
        severity,
        code: input.code ?? null,
        message: input.message,
        stack: input.stack ?? null,
        route: input.route ?? null,
        userId: input.userId ?? null,
        operatorId: input.operatorId ?? null,
        strategyId: input.strategyId ?? null,
        campaignId: input.campaignId ?? null,
        intentId: input.intentId ?? null,
        trpcProcedure: input.trpcProcedure ?? null,
        componentPath: input.componentPath ?? null,
        userAgent: input.userAgent ?? null,
        signature,
        context: (input.context ?? null) as never,
      },
    });
    return created.id;
  } catch (err) {
    // Ne jamais propager une erreur de capture — ça boucle.
    console.error("[error-vault.capture] FAILED to capture:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Helper pour capture rapide d'une Error JS standard.
 */
export async function captureError(
  err: unknown,
  context: Omit<CaptureInput, "message" | "stack"> & { message?: string },
): Promise<string | null> {
  const e = err instanceof Error ? err : new Error(String(err));
  return capture({
    ...context,
    message: context.message ?? e.message,
    stack: e.stack,
  });
}

/**
 * Marque une row comme résolue.
 */
export async function markResolved(args: {
  id: string;
  resolvedById: string;
  reason?: string;
  knownFalsePositive?: boolean;
}) {
  return db.errorEvent.update({
    where: { id: args.id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedById: args.resolvedById,
      resolvedReason: args.reason ?? null,
      knownFalsePositive: args.knownFalsePositive ?? false,
    },
  });
}

/**
 * Batch resolve — par signature ou par filter.
 */
export async function batchMarkResolved(args: {
  filter: { signature?: string; source?: ErrorSource; severity?: ErrorSeverity };
  resolvedById: string;
  reason?: string;
  knownFalsePositive?: boolean;
}) {
  return db.errorEvent.updateMany({
    where: {
      ...(args.filter.signature ? { signature: args.filter.signature } : {}),
      ...(args.filter.source ? { source: args.filter.source } : {}),
      ...(args.filter.severity ? { severity: args.filter.severity } : {}),
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedById: args.resolvedById,
      resolvedReason: args.reason ?? null,
      knownFalsePositive: args.knownFalsePositive ?? false,
    },
  });
}

/**
 * Stats agrégées pour dashboard
 */
export async function getStats(args: { operatorId?: string; sinceHours?: number } = {}) {
  const since = new Date(Date.now() - (args.sinceHours ?? 24) * 3600 * 1000);
  const where = {
    createdAt: { gte: since },
    ...(args.operatorId ? { operatorId: args.operatorId } : {}),
  };
  const [total, unresolved, bySeverity, bySource] = await Promise.all([
    db.errorEvent.count({ where }),
    db.errorEvent.count({ where: { ...where, resolved: false } }),
    db.errorEvent.groupBy({
      by: ["severity"],
      where,
      _count: { _all: true },
    }),
    db.errorEvent.groupBy({
      by: ["source"],
      where,
      _count: { _all: true },
    }),
  ]);
  return { total, unresolved, bySeverity, bySource };
}
