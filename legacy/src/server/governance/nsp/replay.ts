/**
 * src/server/governance/nsp/replay.ts — Replay a finished intent.
 *
 * Layer 2. Pulls every IntentEmissionEvent for an intentId in order and
 * returns the reconstructed timeline. Used by the IntentReplayButton in
 * the Neteru UI Kit and by the /console/governance/intents detail view.
 */

import type { PrismaClient } from "@prisma/client";
import type { IntentProgressEvent } from "@/domain";

export async function replayIntent(
  db: PrismaClient,
  intentId: string,
): Promise<readonly IntentProgressEvent[]> {
  const rows = await db.intentEmissionEvent.findMany({
    where: { intentId },
    orderBy: { emittedAt: "asc" },
  });
  return rows.map((r) => ({
    intentId,
    kind: "(replayed)",
    phase: r.phase as IntentProgressEvent["phase"],
    governor: "MESTOR",
    step:
      r.stepName && r.stepIndex !== null && r.stepTotal !== null
        ? { name: r.stepName, index: r.stepIndex, total: r.stepTotal }
        : undefined,
    partial: (r.partial ?? undefined) as IntentProgressEvent["partial"],
    costSoFarUsd:
      typeof r.costUsd === "object" && r.costUsd !== null && "toNumber" in r.costUsd
        ? (r.costUsd as { toNumber: () => number }).toNumber()
        : undefined,
    emittedAt: r.emittedAt,
  }));
}
