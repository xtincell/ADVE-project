/**
 * Provider façade factory (Phase 15, ADR-0020 + ADR-0021) — **de-mocké 2026-06-14**.
 *
 * Tous les providers Anubis (Meta/Google/X/TikTok/Mailgun/Twilio/email-fallback)
 * partagent le shape : testConnection / send / fetchReport.
 *
 * # Honnêteté (fin des faux succès)
 *
 * Ces providers appellent de VRAIS tiers (Meta, Twilio, Mailgun…). Tant que
 * l'intégration REST/SDK réelle n'est pas câblée pour un provider donné, la
 * façade **ne fabrique plus** ni succès d'envoi (`QUEUED` factice) ni métriques
 * inventées : elle retourne un état DEFERRED explicite. Aucune donnée fausse.
 *   - pas de credential → DEFERRED (configurer la clé).
 *   - credential présente mais intégration non câblée → DEFERRED + raison claire.
 * Le vrai envoi se branche provider par provider (REST via fetch + clés du Vault),
 * key-gated. NB : l'email CRM transactionnel (CRM_SEND_MESSAGE) est, lui, déjà
 * réel (Resend/Mailgun) — distinct de ce broadcast Anubis.
 */

import { credentialVault, deferredCredentials } from "../credential-vault";

export interface ProviderSendPayload {
  content: string;
  target: Record<string, unknown>;
  budgetUsd?: number;
}

export interface ProviderSendResult {
  status: "SENT" | "QUEUED";
  providerTaskId: string;
  providerName: string;
  estimatedReach?: string;
}

export interface ProviderReport {
  status: "OK";
  total: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  rawMetrics?: Record<string, unknown>;
}

export interface ProviderTestResult {
  success: boolean;
  reason?: string;
}

export interface ProviderFaçade {
  readonly connectorType: string;
  readonly displayName: string;
  testConnection(operatorId: string): Promise<ProviderTestResult>;
  send(
    operatorId: string,
    payload: ProviderSendPayload,
  ): Promise<ProviderSendResult | ReturnType<typeof deferredCredentials>>;
  fetchReport(
    operatorId: string,
    providerTaskId: string,
  ): Promise<ProviderReport | ReturnType<typeof deferredCredentials>>;
}

const NOT_WIRED =
  "Credential présente mais intégration provider réelle (REST/SDK) non câblée — aucun envoi ni métrique fabriqués (de-mock 2026-06-14). Brancher le provider pour des envois réels.";

/**
 * Factory : DEFERRED si pas de credential, DEFERRED + raison si credential
 * présente mais intégration réelle non câblée. **Jamais de donnée fabriquée.**
 */
export function createProviderFaçade(args: {
  connectorType: string;
  displayName: string;
  /** Legacy — conservé pour compat des call-sites, plus utilisé depuis le de-mock. */
  mockEstimatedReach?: string;
}): ProviderFaçade {
  const { connectorType, displayName } = args;

  return {
    connectorType,
    displayName,

    async testConnection(operatorId: string): Promise<ProviderTestResult> {
      const cred = await credentialVault.get(operatorId, connectorType);
      if (!cred) {
        return {
          success: false,
          reason: `No active credential for ${connectorType}. Configure via /console/anubis/credentials.`,
        };
      }
      // Credential stockée + ACTIVE. La validation upstream réelle (ping provider)
      // se branche avec l'intégration ; on confirme ici la présence de la clé.
      return { success: true };
    },

    async send(operatorId, _payload) {
      const cred = await credentialVault.get(operatorId, connectorType);
      if (!cred) return deferredCredentials(connectorType);
      return deferredCredentials(connectorType, NOT_WIRED);
    },

    async fetchReport(operatorId, _providerTaskId) {
      const cred = await credentialVault.get(operatorId, connectorType);
      if (!cred) return deferredCredentials(connectorType);
      return deferredCredentials(connectorType, NOT_WIRED);
    },
  };
}
