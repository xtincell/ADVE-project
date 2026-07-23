/**
 * Anubis — Digest scheduler.
 *
 * Cf. ADR-0025. Cron daily/weekly qui groupe les notifications IN_APP non-lues
 * par user et envoie un email récap via le NotificationTemplate `notification-digest`.
 *
 * Ne crée pas de Notification additionnelle (pour éviter la boucle digest-of-digest).
 * Utilise le template engine + provider mailgun (via getProvider).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - (frequency === "DAILY" ? 24 : 7 * 24) * 60 * 60 * 1000,
  );
  // round-13c : bucket de période pour l'idempotence — un re-fire (double scheduler
  // Coolify, curl opérateur) ne doit pas ré-emailer le MÊME digest à chaque user.
  const bucket = digestBucket(frequency, now);

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

    // Idempotence par période (round-13c) : runDigest ne marquait RIEN → un re-fire
    // ré-emailait le MÊME digest à chaque user. Marqueur (userId, freq, bucket) via
    // KnowledgeEntry (pattern founder-digest / webhooks mobile-money). Pas de champ
    // Notification.digestedAt — la répétition cross-période est hors périmètre (le bug
    // rapporté est la ré-émission MÊME période).
    const sourceHash = `anubis-digest-${pref.userId}-${frequency}-${bucket}`;
    const already = await db.knowledgeEntry.findFirst({ where: { sourceHash } });
    if (already) {
      skipped++;
      continue;
    }
    // Claim-then-send : marqueur AVANT envoi, libéré si non-envoyé (deferred/throw
    // via finally) pour autoriser un retry sans dupliquer sur ré-invocation
    // SÉQUENTIELLE (le dominant). `sourceHash` n'a pas de contrainte unique → TOCTOU
    // sous fire TRULY-concurrent = doublon d'email rare (pattern codebase, cf.
    // webhooks/mobile-money), jamais de corruption ; durcissement unique+P2002 tracé
    // RESIDUAL-DEBT §round-13.
    const marker = await db.knowledgeEntry.create({
      data: {
        entryType: "MISSION_OUTCOME",
        data: { userId: pref.userId, frequency, count: notifications.length } as unknown as Prisma.InputJsonValue,
        sourceHash,
      },
    });
    let sent = false;
    try {
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
        sent = true;
      }
    } finally {
      if (!sent) await db.knowledgeEntry.delete({ where: { id: marker.id } }).catch(() => undefined);
    }
  }

  return {
    usersProcessed: prefs.length,
    digestsSent,
    skipped,
  };
}

/**
 * Bucket de période stable pour l'idempotence du digest (round-13c).
 * DAILY → jour UTC (YYYY-MM-DD). WEEKLY → lundi UTC de la semaine (change 1×/sem).
 */
function digestBucket(frequency: Frequency, now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (frequency === "WEEKLY") {
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    d.setUTCDate(d.getUTCDate() - dow);
  }
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}
