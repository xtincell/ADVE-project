/**
 * Emails prospect du funnel intake (audit UX 2026-07-19, P0-1) — LA fuite du
 * funnel : aucun email n'était jamais envoyé au prospect, donc tout onglet
 * fermé sans copier le lien token = lead définitivement perdu.
 *
 * Deux envois, best-effort (jamais bloquants, provider absent → log) :
 *   1. au start() — « reprenez votre diagnostic » avec le lien /intake/[token]
 *   2. au complete() — « votre rapport est prêt » avec /intake/[token]/result
 *
 * Zéro LLM. Copy client ADR-0123 (aucun nom interne).
 */

import { sendEmail } from "@/server/services/email";

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "https://powerupgraders.com").replace(/\/$/, "");
}

const wrap = (title: string, body: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <p style="font-weight:bold;font-size:18px;margin:0 0 16px">${title}</p>
    ${body}
    <p style="margin-top:28px;font-size:12px;color:#777">La Fusée by UPgraders — diagnostic de marque. Vous recevez cet email parce que vous avez démarré un diagnostic.</p>
  </div>`;

/** start() — le lien de reprise part immédiatement (le lead n'est plus jamais perdu). */
export async function sendIntakeResumeEmail(input: {
  email: string;
  name: string;
  companyName: string;
  token: string;
}): Promise<void> {
  try {
    const link = `${baseUrl()}/intake/${input.token}`;
    await sendEmail({
      to: input.email,
      subject: `${input.companyName} — votre diagnostic est ouvert (lien de reprise)`,
      tag: "intake-resume",
      html: wrap(
        `Bonjour ${input.name},`,
        `<p>Votre diagnostic de marque pour <strong>${input.companyName}</strong> est ouvert. Vous pouvez le
         reprendre à tout moment, exactement là où vous vous êtes arrêté :</p>
         <p style="margin:20px 0"><a href="${link}" style="background:#E56458;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reprendre mon diagnostic</a></p>
         <p style="font-size:13px;color:#555">Ou copiez ce lien : ${link}</p>
         <p style="font-size:13px;color:#555">Comptez ~15 minutes de questionnaire — le verdict tombe immédiatement à la fin.</p>`,
      ),
      text: `Bonjour ${input.name}, reprenez votre diagnostic ${input.companyName} : ${link}`,
    });
  } catch (err) {
    console.warn("[quick-intake] email de reprise non envoyé:", err instanceof Error ? err.message : err);
  }
}

/** complete() — le rapport est prêt, le lien du résultat part par email. */
export async function sendReportReadyEmail(input: {
  email: string;
  name: string;
  companyName: string;
  token: string;
}): Promise<void> {
  try {
    const link = `${baseUrl()}/intake/${input.token}/result`;
    await sendEmail({
      to: input.email,
      subject: `${input.companyName} — votre rapport de diagnostic est prêt`,
      tag: "intake-report",
      html: wrap(
        `${input.name}, votre rapport est prêt.`,
        `<p>Le diagnostic de <strong>${input.companyName}</strong> est terminé : socle de marque, radar
         par pilier, plan d'action priorisé.</p>
         <p style="margin:20px 0"><a href="${link}" style="background:#E56458;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Voir mon rapport</a></p>
         <p style="font-size:13px;color:#555">Ou copiez ce lien : ${link}</p>`,
      ),
      text: `${input.name}, votre rapport ${input.companyName} est prêt : ${link}`,
    });
  } catch (err) {
    console.warn("[quick-intake] email rapport-prêt non envoyé:", err instanceof Error ? err.message : err);
  }
}
