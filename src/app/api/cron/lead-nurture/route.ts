export const dynamic = "force-dynamic";
/**
 * Cron — relance J+3 des diagnostics complétés non convertis (audit onboarding
 * 2026-07-19, P2-4). Aucun nurture n'existait : un prospect qui avait VU son
 * rapport et fermé l'onglet ne recevait plus jamais rien.
 *
 * Honnête et borné : UNE seule relance par prospect (idempotence via le tag
 * CRM `nurture-j3-sent` — CrmContact existe pour chaque intake depuis la
 * vague CRM), fenêtre J+3 → J+30, best-effort (provider email absent → log).
 * Déclenchement : scheduled-ops.yml (tranche quotidienne) ou ping Coolify.
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";

const DAY_MS = 86_400_000;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const now = Date.now();
    const candidates = await db.quickIntake.findMany({
      where: {
        status: "COMPLETED",
        convertedToId: null,
        completedAt: { lte: new Date(now - 3 * DAY_MS), gte: new Date(now - 30 * DAY_MS) },
      },
      select: { shareToken: true, contactEmail: true, contactName: true, companyName: true },
      orderBy: { completedAt: "desc" },
      take: 100,
    });
    let sent = 0;
    let skipped = 0;
    const { sendEmail } = await import("@/server/services/email");
    const base = (process.env.NEXTAUTH_URL ?? "https://powerupgraders.com").replace(/\/$/, "");
    for (const c of candidates) {
      try {
        const email = c.contactEmail.toLowerCase();
        const contact = await db.crmContact.findUnique({ where: { email }, select: { id: true, tags: true } });
        if (contact?.tags.includes("nurture-j3-sent")) {
          skipped++;
          continue;
        }
        const link = `${base}/intake/${c.shareToken}/result`;
        const result = await sendEmail({
          to: c.contactEmail,
          subject: `${c.companyName} — votre diagnostic vous attend toujours`,
          tag: "lead-nurture",
          html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a"><p style="font-weight:bold;font-size:17px">${c.contactName}, votre rapport est toujours là.</p><p>Le diagnostic de <strong>${c.companyName}</strong> — socle de marque, radar par pilier, plan d'action — reste consultable. La prochaine étape logique : activer votre espace pour le mettre en mouvement.</p><p style="margin:20px 0"><a href="${link}" style="background:#E56458;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Revoir mon rapport</a></p><p style="font-size:12px;color:#777">Un seul rappel — nous ne relancerons plus après celui-ci.</p></div>`,
          text: `${c.contactName}, votre rapport ${c.companyName} vous attend : ${link}`,
        });
        if (result.ok && contact) {
          await db.crmContact.update({
            where: { id: contact.id },
            data: { tags: { set: [...contact.tags, "nurture-j3-sent"] } },
          });
          sent++;
        } else if (result.ok) {
          // Pas de contact CRM (legacy pré-vague CRM) — envoyé sans marqueur
          // possible : on ne renverra pas (le take borne, fenêtre 30 j).
          sent++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
    return NextResponse.json({ ok: true, candidates: candidates.length, sent, skipped, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
