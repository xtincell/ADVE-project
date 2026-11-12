/**
 * Transactional account email uses Anubis' existing system transport.
 * No parallel provider cascade or successful console-only delivery.
 * Brand newsletter credentials remain scoped to their own brand.
 */
export { sendEmail, systemEmailIsArmed } from "../anubis/email-sender";

/** Helper: render a password reset email. */
export function renderPasswordResetEmail(opts: { resetUrl: string; userName?: string }): { subject: string; html: string; text: string } {
  return {
    subject: "Réinitialisation de votre mot de passe — La Fusée",
    text: `Bonjour ${opts.userName ?? ""},\n\nVous avez demandé une réinitialisation de mot de passe.\nLien (1h) : ${opts.resetUrl}\n\nSi ce n'est pas vous, ignorez cet email.`,
    html: `
<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;background:#0c0c0d;color:#e4e4e7;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#f59e0b;font-size:18px;margin:0 0 16px;letter-spacing:0.05em;text-transform:uppercase;">La Fusée</h1>
  <p style="color:#d4d4d8;line-height:1.6;">Bonjour ${opts.userName ?? ""},</p>
  <p style="color:#d4d4d8;line-height:1.6;">Vous avez demandé une réinitialisation de votre mot de passe. Le lien ci-dessous expire dans 1 heure.</p>
  <p style="margin:24px 0;text-align:center;">
    <a href="${opts.resetUrl}" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Réinitialiser le mot de passe</a>
  </p>
  <p style="color:#71717a;font-size:12px;line-height:1.6;">Si ce n'est pas vous, ignorez cet email. Votre mot de passe restera inchangé.</p>
</div></body></html>`,
  };
}
