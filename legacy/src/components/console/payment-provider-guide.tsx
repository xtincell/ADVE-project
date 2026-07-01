/**
 * PaymentProviderGuide — Phase 21 polish (ADR-0075)
 *
 * Panneau de configuration step-by-step pour un payment provider
 * (CinetPay / Stripe / PayPal). Rend explicite le mécanisme safe :
 *
 *   1. Env vars (Vercel dashboard, jamais en git ni en DB)
 *   2. Enabled flag (toggle DB via paymentProviderConfig)
 *   3. Webhook URL côté provider
 *
 * Refuse de toggler `enabled=true` si le provider n'est pas `configured`
 * (env vars absents) — propage l'erreur serveur au lieu de silencieusement
 * laisser un provider "enabled mais cassé".
 *
 * Cf. ADR-0075 — Payment provider secrets stay in env vars.
 */

"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, Copy, Check, AlertTriangle } from "lucide-react";

interface ProviderGuideEntry {
  id: "CINETPAY" | "STRIPE" | "PAYPAL";
  label: string;
  envVars: ReadonlyArray<{ name: string; description: string }>;
  webhookPath: string;
  providerDashboardUrl: string;
  vercelEnvUrl?: string; // Per-project link if known
}

const GUIDES: ReadonlyArray<ProviderGuideEntry> = [
  {
    id: "CINETPAY",
    label: "CinetPay (Mobile Money + cards — marchés africains)",
    envVars: [
      { name: "CINETPAY_API_KEY", description: "Clé API depuis le dashboard CinetPay > Intégration." },
      { name: "CINETPAY_SITE_ID", description: "ID du site marchand (visible à côté de l'API key)." },
      { name: "CINETPAY_SECRET_KEY", description: "Clé HMAC pour vérifier les webhooks (sécurité défense en profondeur)." },
    ],
    webhookPath: "/api/payment/webhook/cinetpay",
    providerDashboardUrl: "https://app.cinetpay.com",
  },
  {
    id: "STRIPE",
    label: "Stripe (cards — marchés US/EU)",
    envVars: [
      { name: "STRIPE_SECRET_KEY", description: "sk_live_… ou sk_test_… depuis Stripe Dashboard > Developers > API keys." },
      { name: "STRIPE_WEBHOOK_SECRET", description: "whsec_… depuis Stripe Dashboard > Developers > Webhooks." },
    ],
    webhookPath: "/api/payment/webhook/stripe",
    providerDashboardUrl: "https://dashboard.stripe.com",
  },
  {
    id: "PAYPAL",
    label: "PayPal (cards + PayPal account)",
    envVars: [
      { name: "PAYPAL_CLIENT_ID", description: "Client ID depuis PayPal Developer Dashboard." },
      { name: "PAYPAL_CLIENT_SECRET", description: "Client Secret apparié au Client ID." },
      { name: "PAYPAL_ENV", description: "sandbox ou live (default sandbox si absent)." },
    ],
    webhookPath: "/api/payment/webhook/paypal",
    providerDashboardUrl: "https://developer.paypal.com/dashboard",
  },
];

export interface PaymentProviderGuideProps {
  providerId: "CINETPAY" | "STRIPE" | "PAYPAL";
  configured: boolean;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  toggleDisabled?: boolean;
  toggleError?: string | null;
  baseUrl?: string;
}

export function PaymentProviderGuide(props: PaymentProviderGuideProps): React.ReactElement | null {
  const guide = GUIDES.find((g) => g.id === props.providerId);
  if (!guide) return null;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const baseUrl = props.baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const fullWebhookUrl = baseUrl ? `${baseUrl}${guide.webhookPath}` : guide.webhookPath;

  const copy = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/40 p-4 text-xs">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{guide.label}</h3>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            props.configured
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {props.configured ? (
            <>
              <CheckCircle2 className="h-3 w-3" /> Env vars OK
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" /> Env vars manquantes
            </>
          )}
        </span>
      </header>

      {/* Step 1 — env vars */}
      <section>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          1. Configurer les env vars (Vercel Dashboard)
        </p>
        <ul className="space-y-1">
          {guide.envVars.map((v) => (
            <li key={v.name} className="flex items-start justify-between gap-2 rounded border border-border bg-background px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <code className="font-mono text-[11px] text-amber-300">{v.name}</code>
                <p className="mt-0.5 text-[10px] text-foreground-muted">{v.description}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(v.name, v.name)}
                className="shrink-0 rounded border border-border bg-surface-raised p-1 text-foreground-muted transition-colors hover:text-foreground"
                title="Copier le nom de la variable"
              >
                {copiedKey === v.name ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 rounded border border-amber-800/40 bg-amber-900/15 p-1.5 text-[10px] text-amber-200">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Les secrets restent <strong>uniquement en env vars</strong> (Vercel chiffre at-rest).
          Jamais en DB, jamais en git, jamais dans <code>config</code>.
        </p>
      </section>

      {/* Step 2 — enabled toggle */}
      <section>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          2. Activer le provider
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={props.enabled}
            onChange={(e) => props.onToggleEnabled(e.target.checked)}
            disabled={props.toggleDisabled || (!props.configured && !props.enabled)}
            className="h-3.5 w-3.5 accent-amber-500 disabled:opacity-40"
          />
          <span className={props.enabled ? "text-emerald-300" : "text-foreground-muted"}>
            {props.enabled ? "Activé" : "Désactivé"}
          </span>
          {!props.configured && !props.enabled && (
            <span className="text-[10px] text-rose-300">— configure d&apos;abord les env vars</span>
          )}
        </label>
        {props.toggleError && (
          <p className="mt-1 rounded border border-rose-800/50 bg-rose-900/20 p-1.5 text-[10px] text-rose-200">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {props.toggleError}
          </p>
        )}
      </section>

      {/* Step 3 — webhook URL */}
      <section>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          3. Webhook URL (à configurer côté provider)
        </p>
        <div className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-blue-300">{fullWebhookUrl}</code>
          <button
            type="button"
            onClick={() => copy(fullWebhookUrl, "webhook")}
            className="shrink-0 rounded border border-border bg-surface-raised p-1 text-foreground-muted transition-colors hover:text-foreground"
            title="Copier l'URL du webhook"
          >
            {copiedKey === "webhook" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <a
            href={guide.providerDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 rounded border border-border bg-surface-raised px-1.5 py-1 text-[10px] text-foreground-muted transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Dashboard
          </a>
        </div>
      </section>
    </div>
  );
}
