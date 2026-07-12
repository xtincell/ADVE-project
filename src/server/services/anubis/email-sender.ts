/**
 * ANUBIS — Sender email transactionnel RÉEL (Vague 10, CRM/newsletter).
 *
 * Cascade de providers par variables d'environnement (ADR-0075 : clés
 * système en env, jamais en DB) :
 *   1. Resend   (RESEND_API_KEY)            — POST api.resend.com/emails
 *   2. Mailgun  (MAILGUN_API_KEY + DOMAIN)  — POST api.mailgun.net/v3/.../messages
 *   3. SendGrid (SENDGRID_API_KEY)          — POST api.sendgrid.com/v3/mail/send
 *
 * Sans aucune clé : échec EXPLICITE `DEFERRED_AWAITING_CREDENTIALS` —
 * jamais un succès simulé (doctrine « ne stub rien », cf. payouts momo).
 * `EMAIL_FROM` requis (ex: "La Fusée <postmaster@mg.lafusee.io>").
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** En-têtes additionnels (List-Unsubscribe pour la newsletter). */
  headers?: Record<string, string>;
}

export type EmailProviderName = "RESEND" | "MAILGUN" | "SENDGRID" | "BREVO";

export type SendEmailResult =
  | { ok: true; provider: EmailProviderName; providerRef: string | null }
  | { ok: false; provider: string | null; error: string; deferred?: boolean };

const TIMEOUT_MS = 10_000;

function from(): string | null {
  return process.env.EMAIL_FROM ?? null;
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function viaResend(input: SendEmailInput, sender: string): Promise<SendEmailResult> {
  const res = await timedFetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, provider: "RESEND", error: `Resend ${res.status}: ${data.message ?? "refusé"}` };
  return { ok: true, provider: "RESEND", providerRef: data.id ?? null };
}

async function viaMailgun(input: SendEmailInput, sender: string): Promise<SendEmailResult> {
  const domain = process.env.MAILGUN_DOMAIN!;
  const region = (process.env.MAILGUN_REGION ?? "us").toLowerCase();
  const base = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const params = new URLSearchParams({
    from: sender,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (input.text) params.set("text", input.text);
  for (const [k, v] of Object.entries(input.headers ?? {})) params.set(`h:${k}`, v);

  const res = await timedFetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, provider: "MAILGUN", error: `Mailgun ${res.status}: ${data.message ?? "refusé"}` };
  return { ok: true, provider: "MAILGUN", providerRef: data.id ?? null };
}

async function viaSendgrid(input: SendEmailInput, sender: string): Promise<SendEmailResult> {
  const res = await timedFetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }], ...(input.headers ? { headers: input.headers } : {}) }],
      from: parseSender(sender),
      subject: input.subject,
      content: [
        ...(input.text ? [{ type: "text/plain", value: input.text }] : []),
        { type: "text/html", value: input.html },
      ],
    }),
  });
  if (res.status !== 202) {
    const body = await res.text().catch(() => "");
    return { ok: false, provider: "SENDGRID", error: `SendGrid ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true, provider: "SENDGRID", providerRef: res.headers.get("x-message-id") };
}

function parseSender(sender: string): { email: string; name?: string } {
  const m = sender.match(/^(.*)<([^>]+)>\s*$/);
  return m ? { name: m[1]!.trim().replace(/^"|"$/g, ""), email: m[2]!.trim() } : { email: sender };
}

/**
 * Brevo (ex-Sendinblue) transactional — POST api.brevo.com/v3/smtp/email,
 * header `api-key`. Exporté (avec la clé en argument) pour l'envoi PAR MARQUE
 * (BrandEmailConnector, clé du compte du client) autant que pour la cascade
 * système (env `BREVO_API_KEY`). N'accepte QUE le sender passé — le sender doit
 * être vérifié côté Brevo, sinon l'API refuse (échec explicite, pas simulé).
 */
export async function sendViaBrevo(
  input: SendEmailInput,
  sender: string,
  apiKey: string,
): Promise<SendEmailResult> {
  const { email, name } = parseSender(sender);
  const res = await timedFetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: name ? { email, name } : { email },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text ? { textContent: input.text } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
  if (!res.ok) {
    return { ok: false, provider: "BREVO", error: `Brevo ${res.status}: ${data.message ?? "refusé"}` };
  }
  return { ok: true, provider: "BREVO", providerRef: data.messageId ?? null };
}

/**
 * Envoie un email via le premier provider configuré ; bascule sur le suivant
 * en cas d'échec. DEFERRED explicite si aucun provider n'est armé.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const sender = from();
  if (!sender) {
    return { ok: false, provider: null, deferred: true, error: "DEFERRED_AWAITING_CREDENTIALS: EMAIL_FROM absent — sender email non armé." };
  }

  const chain: Array<{ enabled: boolean; fn: () => Promise<SendEmailResult> }> = [
    { enabled: Boolean(process.env.RESEND_API_KEY), fn: () => viaResend(input, sender) },
    { enabled: Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN), fn: () => viaMailgun(input, sender) },
    { enabled: Boolean(process.env.SENDGRID_API_KEY), fn: () => viaSendgrid(input, sender) },
    { enabled: Boolean(process.env.BREVO_API_KEY), fn: () => sendViaBrevo(input, sender, process.env.BREVO_API_KEY!) },
  ];

  const armed = chain.filter((c) => c.enabled);
  if (armed.length === 0) {
    return {
      ok: false,
      provider: null,
      deferred: true,
      error: "DEFERRED_AWAITING_CREDENTIALS: aucun provider email configuré (RESEND_API_KEY | MAILGUN_API_KEY+MAILGUN_DOMAIN | SENDGRID_API_KEY | BREVO_API_KEY).",
    };
  }

  let lastError = "";
  for (const provider of armed) {
    try {
      const result = await provider.fn();
      if (result.ok) return result;
      lastError = result.error;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, provider: "CHAIN", error: `Tous les providers email ont échoué — dernier: ${lastError}` };
}
