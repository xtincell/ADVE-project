/**
 * Sequence Queue — Actionable sequences per strategy
 *
 * Persistent queue that tracks which sequences are ready to launch,
 * running, blocked, or completed for a given strategy.
 *
 * Flow:
 *   Hypervisor recommends → Queue stages them → Operator launches → Executor runs
 *
 * Status lifecycle:
 *   READY → RUNNING → DONE
 *   READY → BLOCKED (prerequisites not met)
 *   RUNNING → FAILED → READY (retry)
 */

import { db } from "@/lib/db";
import { analyzeAndRecommend, type HypervisorRecommendation } from "./hypervisor";
import { getSequence, type GlorySequenceKey } from "./sequences";
import { assessAllPillarsHealth } from "./pillar-director";
import { ADVE_STORAGE_KEYS } from "@/domain";

// ─── Types ───────────────────────────────────────────────────────────────────

export type QueueItemStatus = "READY" | "BLOCKED" | "RUNNING" | "DONE" | "FAILED";

export interface QueueItem {
  sequenceKey: GlorySequenceKey;
  name: string;
  family: string;
  status: QueueItemStatus;
  priority: number;
  reason: string;
  /** Which pillars block this sequence (empty if READY) */
  blockedBy: string[];
  /** GloryOutput IDs produced when DONE */
  outputIds: string[];
  /** When the sequence was last executed */
  lastExecutedAt: string | null;
  /** Estimated steps (active only) */
  stepCount: number;
  /** How many steps need AI */
  aiSteps: number;
}

// ─── Queue Builder ───────────────────────────────────────────────────────────

/**
 * Build the full sequence queue for a strategy.
 * Combines Hypervisor recommendations with execution history.
 */
export async function buildQueue(strategyId: string): Promise<QueueItem[]> {
  const plan = await analyzeAndRecommend(strategyId);
  const health = await assessAllPillarsHealth(strategyId);

  // Get execution history
  const outputs = await db.gloryOutput.findMany({
    where: { strategyId },
    select: { id: true, toolSlug: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const executedSlugs = new Set(outputs.map((o) => o.toolSlug));

  const queue: QueueItem[] = [];

  // Completed sequences
  for (const seqKey of plan.completedSequences) {
    const seq = getSequence(seqKey);
    if (!seq) continue;

    const seqOutputs = outputs.filter((o) =>
      seq.steps.some((s) => s.type === "GLORY" && s.ref === o.toolSlug)
    );

    queue.push({
      sequenceKey: seqKey,
      name: seq.name,
      family: seq.family,
      status: "DONE",
      priority: 0,
      reason: "Sequence completee",
      blockedBy: [],
      outputIds: seqOutputs.map((o) => o.id),
      lastExecutedAt: seqOutputs[0]?.createdAt.toISOString() ?? null,
      stepCount: seq.steps.filter((s) => s.status === "ACTIVE").length,
      aiSteps: seq.steps.filter((s) => s.type === "GLORY" || s.type === "ARTEMIS").length,
    });
  }

  // Pending sequences (from Hypervisor recommendations)
  for (const rec of plan.recommendations) {
    const seq = getSequence(rec.sequenceKey);
    if (!seq) continue;

    // Check if prerequisites are met
    const blockedBy: string[] = [];
    if (seq.pillar) {
      const pillarHealth = health.find((h) => h.pillarKey === seq.pillar);
      if (pillarHealth && pillarHealth.criticalGaps.length > 0) {
        // Check if required upstream pillars are complete enough
        // For RTIS pillars (R/T/I/S), they need ADVE to be at least 30% complete
        const rtisKeys = ["r", "t", "i", "s"];
        if (rtisKeys.includes(seq.pillar)) {
          for (const adveKey of [...ADVE_STORAGE_KEYS]) {
            const adveHealth = health.find((h) => h.pillarKey === adveKey);
            if (adveHealth && adveHealth.completeness < 20) {
              blockedBy.push(adveKey.toUpperCase());
            }
          }
        }
      }
    }

    queue.push({
      sequenceKey: rec.sequenceKey,
      name: seq.name,
      family: seq.family,
      status: blockedBy.length > 0 ? "BLOCKED" : "READY",
      priority: rec.priority,
      reason: rec.reason,
      blockedBy,
      outputIds: [],
      lastExecutedAt: null,
      stepCount: rec.estimatedSteps,
      aiSteps: rec.aiSteps,
    });
  }

  // Sort: RUNNING first, then READY by priority, then BLOCKED, then DONE
  const statusOrder: Record<QueueItemStatus, number> = { RUNNING: 0, READY: 1, FAILED: 2, BLOCKED: 3, DONE: 4 };
  queue.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.priority - a.priority;
  });

  return queue;
}

/**
 * Get only READY sequences (launchable now).
 */
export async function getReadySequences(strategyId: string): Promise<QueueItem[]> {
  const queue = await buildQueue(strategyId);
  return queue.filter((q) => q.status === "READY");
}

/**
 * Get only DONE sequences (have compilable outputs).
 */
export async function getCompletedSequences(strategyId: string): Promise<QueueItem[]> {
  const queue = await buildQueue(strategyId);
  return queue.filter((q) => q.status === "DONE");
}
