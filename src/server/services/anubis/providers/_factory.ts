/**
 * Provider façade factory (Phase 15, ADR-0020 + ADR-0021).
 *
 * DRY pattern : tous les providers Anubis (Meta/Google/X/TikTok/Mailgun/Twilio/email-fallback)
 * ont le même shape :
 *   - testConnection : ping de validation, marque ACTIVE si succès
 *   - send           : envoi (broadcast email/sms ou achat ad)
 *   - fetchReport    : pull metrics
 *
 * En l'absence de credentials valides → retourne DEFERRED_AWAITING_CREDENTIALS.
 * Les providers font appel à `credentialVault.get` au boot de chaque méthode.
 *
 * Pour Phase 15 : implémentations sont des stubs qui simulent un succès quand
 * credentials sont ACTIVES (mocks deterministes). Les vrais SDKs (Meta SDK,
 * Twilio SDK, Mailgun SDK, etc.) seront ajoutés en PRs ultérieures dédiées.
 */

import { credentialVault, deferredCredentials } from "../credential-vault";

export interface ProviderSendPayload {
  /** Subject (email) ou message body (sms) ou ad copy. */
  content: string;
  /** Cible (email recipient list, phone numbers, audience targeting rules). */
  target: Record<string, unknown>;
  /** Budget (ads only). */
  budgetUsd?: number;
}

export interface ProviderSendResult {
  status: "SENT" | "QUEUED";
  providerTaskId: string;
  providerName: string;
  /** "X-Y range" estimate (ads). */
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

/**
 * Factory : crée une façade qui retourne DEFERRED quand credentials absentes,
 * sinon délègue à `mockSend`/`mockReport` (à remplacer par vrai SDK plus tard).
 */
export function createProviderFaçade(args: {
  connectorType: string;
  displayName: string;
  /** Mock implementation utilisée tant que SDK réel pas wiré. */
  mockEstimatedReach?: string;
}): ProviderFaçade {
  const { connectorType, displayName, mockEstimatedReach } = args;

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
      // Phase 15 mock — vrai test SDK sera ajouté par PR dédiée.
      // Pour l'instant : si credentials existent + status ACTIVE → on simule un succès.
      return { success: true };
    },

    async send(operatorId, _payload) {
      const cred = await credentialVault.get(operatorId, connectorType);
      if (!cred) {
        return deferredCredentials(connectorType);
      }
      return {
        status: "QUEUED" as const,
        providerTaskId: `${connectorType}-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        providerName: displayName,
        estimatedReach: mockEstimatedReach,
      };
    },

    async fetchReport(operatorId, providerTaskId) {
      const cred = await credentialVault.get(operatorId, connectorType);
      if (!cred) {
        return deferredCredentials(connectorType);
      }
      // Phase 15 mock report — chiffres déterministes basés sur taskId hash.
      const seed = providerTaskId.length;
      return {
        status: "OK" as const,
        total: seed * 100,
        delivered: seed * 95,
        bounced: seed * 5,
        opened: seed * 50,
        clicked: seed * 12,
        rawMetrics: { providerName: displayName, taskId: providerTaskId, mocked: true },
      };
    },
  };
}
