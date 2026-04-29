/**
 * Cron — Founder Weekly Digest (Tier 3.11 of the residual debt).
 *
 * Schedule: every Monday 06:00 UTC.
 * Iterates active strategies that have a bound founder user, composes a
 * `WeeklyDigest` from `founder-psychology`, renders an HTML email, and
 * delivers it via the `email` service. Each digest is also persisted as
 * a `KnowledgeEntry` (entryType=MISSION_OUTCOME) so it can be replayed.
 *
 * Vercel cron entry (vercel.json):
 *   { "path": "/api/cron/founder-digest", "schedule": "0 6 * * 1" }
 */

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { composeWeeklyDigest, type WeeklyDigest } from "@/server/services/founder-psychology";
import { sendEmail } from "@/server/services/email";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const out = {
    composed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Active strategies with their owning User (founder).
  const activeStrategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      userId: true,
      user: { select: { id: true, name: true, email: true, hashedPassword: true } },
    },
    take: 100,
  });

  for (const strat of activeStrategies) {
    const founder = strat.user;
    if (!founder?.email || !founder.hashedPassword) {
      out.skipped++;
      continue;
    }
    try {
      const digest = await composeWeeklyDigest(founder.id, strat.id);
      out.composed++;
      const rendered = renderDigestEmail(digest, founder.name ?? null, strat.name);
      const sendResult = await sendEmail({
        to: founder.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tag: "founder-weekly-digest",
      }).catch(() => ({ ok: false } as const));
      if (sendResult.ok) out.sent++;
      // Persist the digest for replay/history.
      await db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          data: digest as never,
          sourceHash: `founder-digest-${strat.id}-${digest.weekOf}`,
        },
      }).catch(() => undefined);
    } catch (err) {
      out.errors.push(`${strat.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt.getTime(),
    ...out,
  });
}

function renderDigestEmail(
  digest: WeeklyDigest,
  founderName: string | null,
  strategyName: string,
): { subject: string; html: string; text: string } {
  const greeting = founderName ? `Bonjour ${founderName.split(" ")[0]}` : "Bonjour";
  const subject = `${strategyName} — Digest hebdo du ${digest.weekOf}`;

  const sectionsHtml = digest.sections
    .map((s) => {
      const sentiment =
        s.sentiment === "celebrate" ? "✨"
        : s.sentiment === "alert" ? "⚠"
        : "·";
      return `<section style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid ${
        s.sentiment === "celebrate" ? "#10b981"
        : s.sentiment === "alert" ? "#f59e0b"
        : "#3f3f46"
      }; background: #18181b;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #fafafa;">${sentiment} ${escapeHtml(s.heading)}</h3>
        <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 12px; color: #d4d4d8;">${escapeHtml(s.body)}</pre>
      </section>`;
    })
    .join("");

  const ctaHtml = digest.callToActionIntent
    ? `<p style="margin: 24px 0 8px; padding: 12px 16px; background: #1e293b; border: 1px solid #334155; color: #93c5fd; font-size: 12px;">
        Prochain pas suggéré : <strong>${digest.callToActionIntent}</strong>
      </p>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin: 0; padding: 24px; background: #09090b; color: #fafafa; font-family: -apple-system, system-ui, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #27272a; padding: 24px;">
    <h1 style="margin: 0 0 4px; font-size: 16px; color: #fafafa;">${escapeHtml(greeting)},</h1>
    <p style="margin: 0 0 16px; color: #a1a1aa; font-size: 12px;">Voici ton digest pour ${escapeHtml(strategyName)}.</p>
    ${sectionsHtml}
    ${ctaHtml}
    <p style="margin: 32px 0 0; color: #52525b; font-size: 10px; text-align: center;">La Fusée — Industry OS</p>
  </div>
</body></html>`;

  const text = [
    `${greeting},`,
    `Digest ${strategyName} — ${digest.weekOf}`,
    "",
    ...digest.sections.flatMap((s) => [s.heading, s.body, ""]),
    digest.callToActionIntent ? `Prochain pas: ${digest.callToActionIntent}` : "",
    "",
    "La Fusée — Industry OS",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
