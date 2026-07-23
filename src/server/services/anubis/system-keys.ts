/**
 * État des CLÉS SYSTÈME (variables d'environnement) — lecture seule, booléens only.
 *
 * Mandat go-live opérateur : « je ne trouve même pas mes clés ». Distinct du
 * Credentials Vault (ADR-0021, clés PAR-OPÉRATEUR en base) : ces clés-ci sont
 * SYSTEM-WIDE, posées en env (Coolify) et jamais en base (ADR-0075). Ce module
 * dit seulement CONFIGURÉ / MANQUANT — il ne renvoie JAMAIS la valeur.
 */

export interface SystemKeyStatus {
  key: string;
  label: string;
  configured: boolean;
}

export interface SystemKeyGroup {
  group: string;
  hint: string;
  keys: SystemKeyStatus[];
}

/** true si l'env var est posée et non vide. */
function has(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

/** true si AU MOINS une des env vars est posée (fallback multi-provider). */
function hasAny(...names: string[]): boolean {
  return names.some(has);
}

/**
 * Snapshot des clés système, groupées par usage. AUCUNE valeur n'est lue/exposée —
 * uniquement « posée ou non ». Déterministe, zéro I/O.
 */
export function getSystemKeyStatus(): SystemKeyGroup[] {
  return [
    {
      group: "Scraping & empreinte",
      hint: "Débloque le scorer (relevés d'audience, presse, performance). Sans clé, ces dimensions sont déférées, pas fausses.",
      keys: [
        { key: "APIFY_TOKEN", label: "Apify (followers publics)", configured: has("APIFY_TOKEN") },
        { key: "BRAVE_API_KEY", label: "Brave Search (découverte réseaux/presse)", configured: has("BRAVE_API_KEY") },
        { key: "PAGESPEED_API_KEY", label: "PageSpeed (performance site)", configured: has("PAGESPEED_API_KEY") },
        { key: "YOUTUBE_API_KEY", label: "YouTube (abonnés chaîne)", configured: has("YOUTUBE_API_KEY") },
      ],
    },
    {
      group: "LLM (Gateway multi-provider)",
      hint: "Ollama Cloud primaire (URL + clé + OLLAMA_MODEL) → OpenRouter en repli → Anthropic (premium opt-in). Au moins un provider suffit à faire tourner l'assist/brief.",
      keys: [
        { key: "OLLAMA_BASE_URL", label: "Ollama (URL — cloud ou local, primaire)", configured: has("OLLAMA_BASE_URL") },
        { key: "OLLAMA_API_KEY", label: "Ollama Cloud (clé API)", configured: has("OLLAMA_API_KEY") },
        { key: "OLLAMA_MODEL", label: "Ollama (modèle épinglé, ex. deepseek flash)", configured: has("OLLAMA_MODEL") },
        { key: "OPENROUTER_API_KEY", label: "OpenRouter (repli)", configured: has("OPENROUTER_API_KEY") },
        { key: "ANTHROPIC_API_KEY", label: "Anthropic (premium opt-in)", configured: has("ANTHROPIC_API_KEY") },
        { key: "EMBED_SERVICE_URL", label: "Embeddings — serveur self-hosted (Ollama-compatible, chemin PROD)", configured: has("EMBED_SERVICE_URL") },
        { key: "OPENAI_API_KEY", label: "OpenAI (embeddings — repli du self-host)", configured: has("OPENAI_API_KEY") },
      ],
    },
    {
      group: "Paiement",
      hint: "Stripe (récurrent international) + mobile money Afrique. Le paiement manuel WhatsApp marche sans aucune de ces clés.",
      keys: [
        { key: "STRIPE_SECRET_KEY", label: "Stripe", configured: has("STRIPE_SECRET_KEY") },
        { key: "WAVE_API_KEY", label: "Wave", configured: has("WAVE_API_KEY") },
        { key: "MTN_MOMO_SUBSCRIPTION_KEY", label: "MTN MoMo", configured: has("MTN_MOMO_SUBSCRIPTION_KEY") },
        { key: "ORANGE_CLIENT_ID", label: "Orange Money", configured: hasAny("ORANGE_CLIENT_ID", "ORANGE_CLIENT_SECRET") },
        { key: "CINETPAY_API_KEY", label: "CinetPay", configured: has("CINETPAY_API_KEY") },
        { key: "MANUAL_PAYMENT_WHATSAPP_NUMBER", label: "WhatsApp (paiement manuel)", configured: has("MANUAL_PAYMENT_WHATSAPP_NUMBER") },
      ],
    },
    {
      group: "Email & notifications",
      hint: "Un provider transactionnel suffit pour l'envoi (broadcast Anubis, digests).",
      keys: [
        { key: "MAILGUN_API_KEY", label: "Mailgun", configured: has("MAILGUN_API_KEY") },
        { key: "BREVO_API_KEY", label: "Brevo", configured: has("BREVO_API_KEY") },
        { key: "RESEND_API_KEY", label: "Resend", configured: has("RESEND_API_KEY") },
        { key: "SENDGRID_API_KEY", label: "SendGrid", configured: has("SENDGRID_API_KEY") },
      ],
    },
  ];
}
