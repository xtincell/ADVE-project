/**
 * email — transactional email send.
 *
 * Delegates to a configured provider (Resend / SendGrid / SES). In dev
 * with no provider, logs to console (existing behavior).
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without email delivery,
 * password reset / payment receipts / digest weekly fail. UPgraders
 * relations break.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Used to thread emails (e.g. founder digest). */
  tag?: string;
}

interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "sendgrid" | "ses" | "log";
  messageId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) return sendViaResend(input);
  if (process.env.SENDGRID_API_KEY) return sendViaSendGrid(input);
  // Dev fallback
  console.log(`[email:log] to=${input.to} subject="${input.subject}"\n  ${input.text ?? input.html.slice(0, 200)}`);
  return { ok: true, provider: "log" };
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.EMAIL_FROM ?? "noreply@lafusee.com";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tag ? [{ name: "category", value: input.tag }] : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, provider: "resend", error: (err as { message?: string }).message ?? "send failed" };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, provider: "resend", messageId: data.id };
}

async function sendViaSendGrid(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY!;
  const from = process.env.EMAIL_FROM ?? "noreply@lafusee.com";
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: from, name: "La Fusée" },
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text ?? "" },
        { type: "text/html", value: input.html },
      ],
      categories: input.tag ? [input.tag] : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, provider: "sendgrid", error: err.slice(0, 200) };
  }
  return { ok: true, provider: "sendgrid", messageId: res.headers.get("x-message-id") ?? undefined };
}

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
