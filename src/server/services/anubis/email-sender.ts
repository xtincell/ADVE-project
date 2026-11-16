/**
 * ANUBIS — Sender email transactionnel RÉEL (Vague 10, CRM/newsletter).
 *
 * Configuration administrateur chiffrée, avec repli sur l'environnement :
 *   1. Resend   (RESEND_API_KEY)            — POST api.resend.com/emails
 *   2. Mailgun  (MAILGUN_API_KEY + DOMAIN)  — POST api.mailgun.net/v3/.../messages
 *   3. SendGrid (SENDGRID_API_KEY)          — POST api.sendgrid.com/v3/mail/send
 *
 * Sans aucune clé : échec EXPLICITE `DEFERRED_AWAITING_CREDENTIALS` —
 * jamais un succès simulé (doctrine « ne stub rien », cf. payouts momo).
 * `EMAIL_FROM` requis (ex: "La Fusée <postmaster@mg.lafusee.io>").
 */
import { resolveDeliverySettings, configuredEmailProviders } from "./delivery-settings";

export interface SendEmailInput {
  to: string;
  /** Sales outbox must keep uncertain attempts on one transport. */
  allowFallback?: boolean;
  subject: string;
  html: string;
  text?: string;
  /** Transactional category, retained when the account email adapter delegates here. */
  tag?: string;
  /** En-têtes additionnels (List-Unsubscribe pour la newsletter). */
  headers?: Record<string, string>;
}

export type EmailProviderName = "RESEND" | "MAILGUN" | "SENDGRID" | "BREVO";

export type SendEmailResult =
  | { ok: true; provider: EmailProviderName; providerRef: string | null }
  | { ok: false; provider: string | null; error: string; deferred?: boolean };

const TIMEOUT_MS = 10_000;

/** Readiness is global and reveals no account existence or credential value. */
export async function systemEmailIsArmed(): Promise<boolean> {
  try {
    const { email } = await resolveDeliverySettings();
    return Boolean(email.from && configuredEmailProviders(email).length);
  } catch { return false; }
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

async function viaResend(input: SendEmailInput, sender: string, apiKey: string): Promise<SendEmailResult> {
  const res = await timedFetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
      ...(input.tag ? { tags: [{ name: "category", value: input.tag }] } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, provider: "RESEND", error: `Resend ${res.status}: envoi refusé` };
  return { ok: true, provider: "RESEND", providerRef: data.id ?? null };
}

async function viaMailgun(input: SendEmailInput, sender: string, apiKey: string, domain: string, region: string): Promise<SendEmailResult> {
  const base = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const params = new URLSearchParams({
    from: sender,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (input.text) params.set("text", input.text);
  if (input.tag) params.set("o:tag", input.tag);
  for (const [k, v] of Object.entries(input.headers ?? {})) params.set(`h:${k}`, v);

  const res = await timedFetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false, provider: "MAILGUN", error: `Mailgun ${res.status}: envoi refusé` };
  return { ok: true, provider: "MAILGUN", providerRef: data.id ?? null };
}

async function viaSendgrid(input: SendEmailInput, sender: string, apiKey: string): Promise<SendEmailResult> {
  const res = await timedFetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
      ...(input.tag ? { categories: [input.tag] } : {}),
    }),
  });
  if (res.status !== 202) {
    return { ok: false, provider: "SENDGRID", error: `SendGrid ${res.status}: envoi refusé` };
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
      ...(input.tag ? { tags: [input.tag] } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
  if (!res.ok) {
    return { ok: false, provider: "BREVO", error: `Brevo ${res.status}: envoi refusé` };
  }
  return { ok: true, provider: "BREVO", providerRef: data.messageId ?? null };
}

/**
 * Envoie un email via le premier provider configuré ; bascule sur le suivant
 * en cas d'échec. DEFERRED explicite si aucun provider n'est armé.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  let email: Awaited<ReturnType<typeof resolveDeliverySettings>>["email"];
  try { email = (await resolveDeliverySettings()).email; }
  catch { return { ok: false, provider: null, deferred: true, error: "DELIVERY_SETTINGS_UNAVAILABLE" }; }
  const sender = email.from;
  if (!sender) {
    return { ok: false, provider: null, deferred: true, error: "DEFERRED_AWAITING_CREDENTIALS: EMAIL_FROM absent — sender email non armé." };
  }

  const implementations: Record<EmailProviderName, () => Promise<SendEmailResult>> = {
    RESEND: () => viaResend(input, sender, email.credentials.RESEND.value!),
    MAILGUN: () => viaMailgun(input, sender, email.credentials.MAILGUN.value!, email.mailgunDomain!, email.mailgunRegion),
    SENDGRID: () => viaSendgrid(input, sender, email.credentials.SENDGRID.value!),
    BREVO: () => sendViaBrevo(input, sender, email.credentials.BREVO.value!),
  };
  const armed = configuredEmailProviders(email).map(provider => implementations[provider]);
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
      const result = await provider();
      if (result.ok) return result;
      lastError = result.error;
      if (input.allowFallback === false) return result;
    } catch {
      lastError = "Connexion au fournisseur indisponible";
      if (input.allowFallback === false) break;
    }
  }
  return { ok: false, provider: "CHAIN", error: `Tous les providers email ont échoué — dernier: ${lastError}` };
}
