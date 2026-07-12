/**
 * Email PAR MARQUE (newsletter) — résolution du connecteur `BrandEmailConnector`
 * et envoi via le PROPRE compte fournisseur du client (ex: Brevo).
 *
 * Doctrine :
 *   - La clé vit en DB (Vault, ADR-0021), scopée à la Strategy → n'envoie QUE
 *     les newsletters de cette marque (multi-tenant). Distinct de l'email
 *     SYSTÈME (email-sender.ts, env, ADR-0075).
 *   - Aucun envoi simulé : si la marque n'a pas de connecteur ACTIVE et qu'aucun
 *     provider système n'est armé, on retourne un échec `deferred` EXPLICITE.
 *   - La clé n'est JAMAIS renvoyée au client tRPC (le router projette sans `apiKey`).
 */

import { db } from "@/lib/db";
import { sendEmail, sendViaBrevo, type SendEmailInput, type SendEmailResult } from "./email-sender";

export interface BrandEmailConnectorView {
  provider: string;
  fromEmail: string;
  fromName: string | null;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  hasKey: boolean;
  lastTestAt: Date | null;
  lastError: string | null;
}

/** Projection publique — SANS `apiKey`. À utiliser dans tout retour tRPC. */
export async function getBrandEmailConnectorView(
  strategyId: string,
): Promise<BrandEmailConnectorView | null> {
  const c = await db.brandEmailConnector.findUnique({ where: { strategyId } });
  if (!c) return null;
  return {
    provider: c.provider,
    fromEmail: c.fromEmail,
    fromName: c.fromName,
    status: c.status as BrandEmailConnectorView["status"],
    hasKey: c.apiKey.length > 0,
    lastTestAt: c.lastTestAt,
    lastError: c.lastError,
  };
}

/**
 * Envoie un email pour une marque. Priorité au connecteur ACTIVE de la marque
 * (son propre compte) ; à défaut, bascule sur l'email SYSTÈME (env) ; sinon
 * échec `deferred` explicite. Jamais de succès simulé.
 */
export async function sendBrandEmail(
  strategyId: string,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const c = await db.brandEmailConnector.findUnique({ where: { strategyId } });

  if (c && c.status === "ACTIVE" && c.apiKey) {
    const sender = c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail;
    if (c.provider === "BREVO") {
      return sendViaBrevo(input, sender, c.apiKey);
    }
    // Provider marque non câblé → on n'invente rien : bascule système ci-dessous.
  }

  // Pas de connecteur marque exploitable → email système (env). DEFERRED explicite
  // si le système n'est pas armé non plus.
  return sendEmail(input);
}

/** Un provider d'envoi (marque ou système) est-il disponible pour cette marque ? */
export async function brandEmailIsArmed(strategyId: string): Promise<boolean> {
  const c = await db.brandEmailConnector.findUnique({ where: { strategyId } });
  if (c && c.status === "ACTIVE" && c.apiKey) return true;
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) ||
      process.env.SENDGRID_API_KEY ||
      process.env.BREVO_API_KEY,
  );
}

// ── Validation fournisseur (Brevo) — clé réelle, aucun mock ──────────────────

export interface BrevoValidation {
  ok: boolean;
  accountEmail?: string;
  companyName?: string;
  /** Senders vérifiés côté Brevo (obligatoires comme `fromEmail`). */
  verifiedSenders?: Array<{ email: string; name: string; active: boolean }>;
  error?: string;
}

const BREVO_TIMEOUT_MS = 10_000;

async function brevoFetch(path: string, apiKey: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
  try {
    return await fetch(`https://api.brevo.com${path}`, {
      headers: { "api-key": apiKey, accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Valide une clé Brevo (GET /v3/account) + récupère les senders vérifiés. */
export async function validateBrevoKey(apiKey: string): Promise<BrevoValidation> {
  try {
    const acc = await brevoFetch("/v3/account", apiKey);
    if (acc.status === 401) return { ok: false, error: "Clé Brevo invalide (401)." };
    if (!acc.ok) return { ok: false, error: `Brevo /account ${acc.status}.` };
    const account = (await acc.json().catch(() => ({}))) as {
      email?: string;
      companyName?: string;
    };

    const sendersRes = await brevoFetch("/v3/senders", apiKey);
    const sendersJson = (await sendersRes.json().catch(() => ({}))) as {
      senders?: Array<{ email?: string; name?: string; active?: boolean }>;
    };
    const verifiedSenders = (sendersJson.senders ?? [])
      .filter((s) => s.email)
      .map((s) => ({ email: s.email!, name: s.name ?? "", active: Boolean(s.active) }));

    return {
      ok: true,
      accountEmail: account.email,
      companyName: account.companyName,
      verifiedSenders,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
