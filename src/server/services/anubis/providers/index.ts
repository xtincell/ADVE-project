/**
 * Anubis providers — façades feature-flagged (Phase 15, ADR-0020 + ADR-0021).
 *
 * Chaque provider expose 3 méthodes minimum :
 *   - testConnection(operatorId) → CheckResult
 *   - send(operatorId, payload)  → SendResult | DeferredAwaitingCredentials
 *   - fetchReport(operatorId, providerTaskId) → Report | DeferredAwaitingCredentials
 *
 * Aucun SDK external installé en Phase 15 — façades stub qui :
 *   - Si credentials ACTIVES en DB : log INFO + retournent un mock structuré
 *     (la vraie implémentation SDK sera ajoutée par PR dédiée par provider)
 *   - Si pas de credentials : retournent DEFERRED_AWAITING_CREDENTIALS
 *
 * Cette stratégie permet de shipper le scaffolding complet Anubis sans
 * dépendre des comptes/clés que l'operator doit fournir via Credentials Center.
 */

export { metaAdsProvider } from "./meta-ads";
export { googleAdsProvider } from "./google-ads";
export { xAdsProvider } from "./x-ads";
export { tiktokAdsProvider } from "./tiktok-ads";
export { mailgunProvider } from "./mailgun";
export { twilioProvider } from "./twilio";
export { emailFallbackProvider } from "./email-fallback";

import { metaAdsProvider } from "./meta-ads";
import { googleAdsProvider } from "./google-ads";
import { xAdsProvider } from "./x-ads";
import { tiktokAdsProvider } from "./tiktok-ads";
import { mailgunProvider } from "./mailgun";
import { twilioProvider } from "./twilio";
import { emailFallbackProvider } from "./email-fallback";

export type Provider = typeof metaAdsProvider;

/** Resolve a provider façade by connectorType. */
export function getProvider(connectorType: string): Provider | null {
  switch (connectorType) {
    case "meta-ads":
      return metaAdsProvider;
    case "google-ads":
      return googleAdsProvider;
    case "x-ads":
      return xAdsProvider;
    case "tiktok-ads":
      return tiktokAdsProvider;
    case "mailgun":
      return mailgunProvider;
    case "twilio":
      return twilioProvider;
    case "email-fallback":
      return emailFallbackProvider;
    default:
      return null;
  }
}
