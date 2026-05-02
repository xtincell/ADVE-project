/**
 * Anubis — Notification fan-out unifié (in-app + push + email + SMS).
 *
 * Cf. ADR-0024. Respecte NotificationPreference (channels, quiet hours).
 * In-app → Notification model + NSP publish (real-time UI).
 * Push    → web-push provider (façade VAPID, deferred si pas de creds).
 * Email   → providers/mailgun (existant).
 * SMS     → providers/twilio (existant).
 */

import { db } from "@/lib/db";
import { publish as nspPublish } from "@/server/services/nsp";
import { sendWebPush } from "./providers/web-push";

export type NotificationChannelKey = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

export interface PushNotificationPayload {
  userId: string;
  type?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  operatorId?: string;
  channels?: NotificationChannelKey[];
}

export interface PushNotificationResult {
  notificationId: string;
  delivered: NotificationChannelKey[];
  deferred: string[];
  suppressedByQuiet: boolean;
}

interface QuietHours {
  start?: string;
  end?: string;
  timezone?: string;
}

function isInQuietWindow(quiet: QuietHours | null | undefined, now: Date = new Date()): boolean {
  if (!quiet?.start || !quiet?.end) return false;
  const startParts = quiet.start.split(":").map(Number);
  const endParts = quiet.end.split(":").map(Number);
  const startH = startParts[0], startM = startParts[1];
  const endH = endParts[0], endM = endParts[1];
  if (
    startH === undefined || startM === undefined ||
    endH === undefined || endM === undefined ||
    Number.isNaN(startH) || Number.isNaN(startM) ||
    Number.isNaN(endH) || Number.isNaN(endM)
  ) return false;

  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  return startMin <= endMin
    ? minutes >= startMin && minutes < endMin
    : minutes >= startMin || minutes < endMin;
}

export async function pushNotification(
  payload: PushNotificationPayload,
): Promise<PushNotificationResult> {
  const channels = payload.channels ?? ["IN_APP"];
  const priority = payload.priority ?? "NORMAL";
  const type = payload.type ?? "SYSTEM";

  const prefs = await db.notificationPreference.findUnique({
    where: { userId: payload.userId },
  });

  const quiet = (prefs?.quiet ?? null) as QuietHours | null;
  const enabledMap = (prefs?.channels ?? {}) as Record<string, boolean>;

  const inQuiet = isInQuietWindow(quiet);
  const suppressedByQuiet = inQuiet && priority !== "CRITICAL";

  const notification = await db.notification.create({
    data: {
      userId: payload.userId,
      channel: "IN_APP",
      type,
      priority,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      metadata: (payload.metadata ?? null) as never,
      entityType: payload.entityType,
      entityId: payload.entityId,
      operatorId: payload.operatorId,
    },
  });

  const delivered: NotificationChannelKey[] = [];
  const deferred: string[] = [];

  if (suppressedByQuiet) {
    return {
      notificationId: notification.id,
      delivered,
      deferred: ["quiet_hours"],
      suppressedByQuiet: true,
    };
  }

  if (channels.includes("IN_APP") && enabledMap["IN_APP"] !== false) {
    nspPublish(payload.userId, {
      kind: "notification",
      id: notification.id,
      userId: payload.userId,
      type,
      priority,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
      createdAt: notification.createdAt.toISOString(),
    });
    delivered.push("IN_APP");
  }

  if (channels.includes("PUSH") && enabledMap["PUSH"] !== false) {
    const subs = await db.pushSubscription.findMany({
      where: { userId: payload.userId, isActive: true },
    });
    if (subs.length === 0) {
      deferred.push("push_no_subscription");
    } else {
      const result = await sendWebPush({
        operatorId: payload.operatorId ?? null,
        subscriptions: subs.map((s) => ({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        })),
        payload: {
          title: payload.title,
          body: payload.body,
          link: payload.link,
          notificationId: notification.id,
        },
      });
      if (result.status === "DEFERRED_AWAITING_CREDENTIALS") {
        deferred.push(`push:${result.connectorType}`);
      } else {
        delivered.push("PUSH");
      }
    }
  }

  // EMAIL / SMS : déléguer au flow broadcast (broadcastMessage capability
  // existante) plutôt que dupliquer ici. Les notifications individuelles
  // out-of-app passent par CommsPlan + BroadcastJob avec les provider façades
  // mailgun/twilio. On marque deferred pour signaler l'aiguillage.
  if (channels.includes("EMAIL") && enabledMap["EMAIL"] !== false) {
    deferred.push("email:via_broadcast_flow");
  }
  if (channels.includes("SMS") && enabledMap["SMS"] !== false) {
    deferred.push("sms:via_broadcast_flow");
  }

  return {
    notificationId: notification.id,
    delivered,
    deferred,
    suppressedByQuiet: false,
  };
}

export async function registerPushSubscription(args: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ pushSubscriptionId: string; endpoint: string; isActive: boolean }> {
  const sub = await db.pushSubscription.upsert({
    where: { endpoint: args.endpoint },
    create: {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      isActive: true,
      lastSeenAt: new Date(),
      userAgent: args.userAgent,
    },
  });
  return { pushSubscriptionId: sub.id, endpoint: sub.endpoint, isActive: sub.isActive };
}
