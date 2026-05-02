/**
 * Firebase Cloud Messaging provider façade — mobile push.
 *
 * Cf. ADR-0021. Lit ExternalConnector connectorType="fcm".config (serviceAccount).
 */

import { credentialVault } from "../credential-vault";

export type FcmResult =
  | { status: "OK"; messageId: string }
  | {
      status: "DEFERRED_AWAITING_CREDENTIALS";
      connectorType: "fcm";
      configureUrl: string;
      reason: string;
    };

export async function sendFcm(args: {
  operatorId: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<FcmResult> {
  const cred = await credentialVault.get(args.operatorId, "fcm");
  if (!cred) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "fcm",
      configureUrl: "/console/anubis/credentials?connector=fcm",
      reason: "Firebase service account not registered",
    };
  }

  const config = cred.config as { serviceAccount?: Record<string, unknown> };
  if (!config.serviceAccount) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "fcm",
      configureUrl: "/console/anubis/credentials?connector=fcm",
      reason: "FCM config missing serviceAccount JSON",
    };
  }

  type AdminApp = unknown;
  type AdminMessaging = { send: (msg: unknown) => Promise<string> };
  let admin: {
    initializeApp: (opts: { credential: unknown }) => AdminApp;
    credential: { cert: (sa: Record<string, unknown>) => unknown };
    messaging: () => AdminMessaging;
  };
  try {
    // @ts-expect-error — optional runtime dep, package may not be installed.
    const mod: unknown = await import("firebase-admin");
    admin = ((mod as { default?: typeof admin }).default ?? mod) as typeof admin;
  } catch {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: "fcm",
      configureUrl: "/console/anubis/credentials?connector=fcm",
      reason: "firebase-admin package not installed",
    };
  }

  try {
    admin.initializeApp({ credential: admin.credential.cert(config.serviceAccount) });
  } catch {
    // Already initialized — ignore.
  }

  const messageId = await admin.messaging().send({
    token: args.token,
    notification: { title: args.title, body: args.body },
    data: args.data ?? {},
  });

  return { status: "OK", messageId };
}
