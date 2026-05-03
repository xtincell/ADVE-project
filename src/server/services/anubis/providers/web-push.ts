/**
 * Web Push provider façade — VAPID via npm:web-push.
 *
 * Cf. ADR-0021 (deferred-awaiting-credentials) + ADR-0025 (real-time stack).
 * Si le ExternalConnector connectorType="vapid" n'a pas de clés enregistrées,
 * retourne DEFERRED_AWAITING_CREDENTIALS — le code reste ship-able sans creds.
 */

import { credentialVault } from "../credential-vault";

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushPayload {
  title: string;
  body: string;
  link?: string;
  notificationId?: string;
}

export type WebPushResult =
  | { status: "OK"; sent: number; failed: number }
  | {
      status: "DEFERRED_AWAITING_CREDENTIALS";
      connectorType: "vapid";
      configureUrl: string;
      reason: string;
    };

export async function sendWebPush(args: {
  operatorId: string | null;
  subscriptions: WebPushSubscription[];
  payload: WebPushPayload;
}): Promise<WebPushResult> {
  const cred = args.operatorId
    ? await credentialVault.get(args.operatorId, "vapid")
    : null;

  if (!cred) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "vapid",
      configureUrl: "/console/anubis/credentials?connector=vapid",
      reason: "VAPID keys not registered for this operator",
    };
  }

  const config = cred.config as {
    publicKey?: string;
    privateKey?: string;
    subject?: string;
  };
  if (!config.publicKey || !config.privateKey || !config.subject) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "vapid",
      configureUrl: "/console/anubis/credentials?connector=vapid",
      reason: "VAPID config missing publicKey/privateKey/subject",
    };
  }

  let webpush: {
    setVapidDetails: (subject: string, pub: string, priv: string) => void;
    sendNotification: (sub: WebPushSubscription, payload: string) => Promise<unknown>;
  };
  try {
    // @ts-expect-error — optional runtime dep, package may not be installed.
    const mod: unknown = await import("web-push");
    webpush = ((mod as { default?: typeof webpush }).default ?? mod) as typeof webpush;
  } catch {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "vapid",
      configureUrl: "/console/anubis/credentials?connector=vapid",
      reason: "web-push package not installed",
    };
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const body = JSON.stringify(args.payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    args.subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body);
        sent++;
      } catch {
        failed++;
      }
    }),
  );

  return { status: "OK", sent, failed };
}
