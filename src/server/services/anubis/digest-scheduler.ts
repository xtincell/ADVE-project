/**
 * Anubis — Digest scheduler.
 *
 * Cf. ADR-0024. Cron daily/weekly qui groupe les notifications IN_APP non-lues
 * par user et envoie un email récap via le NotificationTemplate `notification-digest`.
 *
 * Ne crée pas de Notification additionnelle (pour éviter la boucle digest-of-digest).
 * Utilise le template engine + provider mailgun (via getProvider).
 */

import { db } from "@/lib/db";
import { renderTemplate, TemplateNotFoundError } from "./templates";
import { credentialVault } from "./credential-vault";
import { getProvider } from "./providers";

type Frequency = "DAILY" | "WEEKLY";

export async function runDigest(frequency: Frequency): Promise<{
  usersProcessed: number;
  digestsSent: number;
  skipped: number;
}> {
  const prefs = await db.notificationPreference.findMany({
    where: { digestFrequency: frequency },
  });

  let digestsSent = 0;
  let skipped = 0;
  const cutoff = new Date(
    Date.now() - (frequency === "DAILY" ? 24 : 7 * 24) * 60 * 60 * 1000,
  );

  for (const pref of prefs) {
    const notifications = await db.notification.findMany({
      where: {
        userId: pref.userId,
        isRead: false,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (notifications.length === 0) {
      skipped++;
      continue;
    }

    const user = await db.user.findUnique({
      where: { id: pref.userId },
      select: { email: true, name: true, operatorId: true },
    });
    if (!user?.email) {
      skipped++;
      continue;
    }

    let rendered;
    try {
      rendered = await renderTemplate("notification-digest", {
        user: { name: user.name ?? "" },
        period: frequency.toLowerCase(),
        count: notifications.length,
        items: notifications.map((n) => ({
          title: n.title,
          body: n.body,
          link: n.link ?? "",
          priority: n.priority,
        })),
      });
    } catch (err) {
      if (err instanceof TemplateNotFoundError) {
        skipped++;
        continue;
      }
      throw err;
    }

    const operatorId = user.operatorId ?? null;
    if (!operatorId) {
      skipped++;
      continue;
    }
    const cred = await credentialVault.get(operatorId, "mailgun");
    if (!cred) {
      skipped++;
      continue;
    }

    const provider = getProvider("mailgun");
    if (!provider) {
      skipped++;
      continue;
    }
    const sendResult = await provider.send(operatorId, {
      content: rendered.subject ?? `Récap ${frequency.toLowerCase()} La Fusée`,
      target: {
        recipients: [user.email],
        html: rendered.html ?? rendered.text,
        text: rendered.text,
      },
    });
    if ("status" in sendResult && sendResult.status === "DEFERRED_AWAITING_CREDENTIALS") {
      skipped++;
    } else {
      digestsSent++;
    }
  }

  return {
    usersProcessed: prefs.length,
    digestsSent,
    skipped,
  };
}
