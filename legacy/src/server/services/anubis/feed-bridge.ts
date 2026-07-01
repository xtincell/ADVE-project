/**
 * Anubis — Feed Signal → Notification bridge (ADR-0031).
 *
 * Pont entre les producteurs de Signal (Notoria batches, Tarsis weak signals,
 * market-intelligence) et le notification center. Quand un Signal de type
 * "feed" est créé en DB, ce helper push une `Notification` au(x) destinataire(s)
 * via {@link pushNotification}, ce qui allume la cloche du topbar et publie
 * un event NSP temps réel.
 *
 * Phase 16 (ADR-0025) avait posé la stack push (Notification model + NSP
 * broker + SSE stream + bell UI), mais aucun service métier ne s'y branchait.
 * Ce module ferme la boucle.
 *
 * **Destinataire MVP** : `Strategy.userId` (le founder qui possède la marque).
 * Étendre vers les UPgraders Console (operatorId → users) dans un sprint
 * ultérieur si la demande émerge.
 *
 * Failure mode : non-bloquant. La création du Signal réussit même si la
 * notif échoue — on ne veut pas qu'un bug du notification center casse
 * Notoria ou Tarsis.
 */

import { db } from "@/lib/db";
import { pushNotification } from "./notifications";

type FeedSignalPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

const PRIORITY_BY_SIGNAL: Record<string, FeedSignalPriority> = {
  WEAK_SIGNAL_ALERT: "HIGH",
  MARKET_SIGNAL: "NORMAL",
  NOTORIA_BATCH_READY: "NORMAL",
  STRONG: "HIGH",
  WEAK: "LOW",
  METRIC: "LOW",
  SCORE_IMPROVEMENT: "NORMAL",
  SCORE_DECLINE: "HIGH",
};

const FEED_SIGNAL_TYPES = new Set(Object.keys(PRIORITY_BY_SIGNAL));

export interface NotifyOnFeedSignalArgs {
  signalId: string;
  signalType: string;
  strategyId: string;
  title: string;
  body: string;
  /** Default: /cockpit/brand/jehuty?signal=<signalId> */
  link?: string;
  /** Override the auto-mapped priority. */
  priority?: FeedSignalPriority;
}

export interface NotifyOnFeedSignalResult {
  status: "DELIVERED" | "SKIPPED_UNKNOWN_TYPE" | "SKIPPED_NO_STRATEGY" | "SKIPPED_NO_RECIPIENT";
  notifiedUserIds: string[];
}

export async function notifyOnFeedSignal(
  args: NotifyOnFeedSignalArgs,
): Promise<NotifyOnFeedSignalResult> {
  if (!FEED_SIGNAL_TYPES.has(args.signalType)) {
    return { status: "SKIPPED_UNKNOWN_TYPE", notifiedUserIds: [] };
  }

  const strategy = await db.strategy.findUnique({
    where: { id: args.strategyId },
    select: { userId: true },
  });

  if (!strategy) {
    return { status: "SKIPPED_NO_STRATEGY", notifiedUserIds: [] };
  }

  const recipients = new Set<string>();
  if (strategy.userId) recipients.add(strategy.userId);

  if (recipients.size === 0) {
    return { status: "SKIPPED_NO_RECIPIENT", notifiedUserIds: [] };
  }

  const priority = args.priority ?? PRIORITY_BY_SIGNAL[args.signalType] ?? "NORMAL";
  const link = args.link ?? `/cockpit/brand/jehuty?signal=${args.signalId}`;

  const notified: string[] = [];
  await Promise.allSettled(
    Array.from(recipients).map(async (userId) => {
      try {
        await pushNotification({
          userId,
          type: "FEED_SIGNAL",
          priority,
          title: args.title,
          body: args.body,
          link,
          entityType: "Signal",
          entityId: args.signalId,
          metadata: {
            signalType: args.signalType,
            strategyId: args.strategyId,
          },
          channels: ["IN_APP"],
        });
        notified.push(userId);
      } catch {
        /* non-blocking — feed signal creation must succeed even if notif fails */
      }
    }),
  );

  return { status: "DELIVERED", notifiedUserIds: notified };
}
