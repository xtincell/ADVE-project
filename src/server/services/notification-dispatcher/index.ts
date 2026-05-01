/**
 * notification-dispatcher — Sprint I push notifications (FCM + APNs).
 *
 * Phase 8+ Anubis sub-service. Dispatch via Firebase Cloud Messaging
 * pour Android + iOS via FCM legacy/HTTP v1 API. APNs fallback non
 * implémenté (les apps mobiles La Fusée passent toutes par FCM).
 */

interface PushInput {
  /** FCM device token — récupéré au login via mobile SDK. */
  deviceToken: string;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

interface PushResult {
  ok: boolean;
  provider: "fcm" | "log";
  externalMessageId?: string;
  error?: string;
}

export async function sendPush(input: PushInput): Promise<PushResult> {
  const projectId = process.env.FCM_PROJECT_ID;
  const accessToken = process.env.FCM_ACCESS_TOKEN; // résolu par cron oauth2 google
  if (!projectId || !accessToken) {
    console.log(`[push:log] token=${input.deviceToken.slice(0, 12)}… title="${input.title}"`);
    return { ok: true, provider: "log" };
  }
  const message = {
    message: {
      token: input.deviceToken,
      notification: { title: input.title, body: input.body },
      data: { ...(input.data ?? {}), link: input.link ?? "" },
      android: { notification: { channel_id: "lafusee_default" } },
      apns: { payload: { aps: { sound: "default" } } },
    },
  };
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );
  const data = (await res.json().catch(() => ({}))) as { name?: string; error?: { message: string } };
  if (!res.ok || !data.name) {
    return { ok: false, provider: "fcm", error: data.error?.message ?? `status ${res.status}` };
  }
  return { ok: true, provider: "fcm", externalMessageId: data.name };
}
