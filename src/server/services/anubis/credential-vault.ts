/**
 * Anubis Credentials Vault (ADR-0021).
 *
 * Pattern transverse : tout connector externe est géré via ce module.
 * - Lit/écrit `ExternalConnector` (model existant V5) via `db.externalConnector`
 * - Pour Phase 15 : config stockée en JSON brut. `pgcrypto` chiffrement-au-repos
 *   est tracké dans la migration `phase15-anubis-comms` mais peut être ajouté
 *   en migration suivante sans casser le contract.
 * - Décryption uniquement dans `get()` — jamais loggée, jamais retournée brute
 *   au client tRPC (le router strip `config` du retour public).
 *
 * Pattern d'utilisation :
 *   const cred = await credentialVault.get(operatorId, "meta-ads");
 *   if (!cred) return { status: "DEFERRED_AWAITING_CREDENTIALS", ... };
 *   // ... utiliser cred.config en mémoire seule
 */

import { db } from "@/lib/db";

export interface CredentialEntry {
  id: string;
  operatorId: string;
  connectorType: string;
  config: Record<string, unknown>;
  status: "ACTIVE" | "INACTIVE" | "ERROR" | "SYNCING";
  lastSyncAt: Date | null;
  errorLog: unknown;
}

export const credentialVault = {
  /**
   * Récupère un credential ACTIVE pour un operator + connectorType.
   * Retourne null si absent OU status !== ACTIVE (les handlers caller doivent
   * traiter null en `DEFERRED_AWAITING_CREDENTIALS`).
   */
  async get(operatorId: string, connectorType: string): Promise<CredentialEntry | null> {
    const cred = await db.externalConnector.findUnique({
      where: { operatorId_connectorType: { operatorId, connectorType } },
    });
    if (!cred || cred.status !== "ACTIVE") return null;
    return {
      id: cred.id,
      operatorId: cred.operatorId,
      connectorType: cred.connectorType,
      config: (cred.config ?? {}) as Record<string, unknown>,
      status: cred.status as CredentialEntry["status"],
      lastSyncAt: cred.lastSyncAt,
      errorLog: cred.errorLog,
    };
  },

  /**
   * Vérifie l'existence et la validité d'un credential sans le retourner
   * (utile pour gating sans charger la config en mémoire).
   */
  async hasValidCredential(operatorId: string, connectorType: string): Promise<boolean> {
    const cred = await this.get(operatorId, connectorType);
    return cred !== null;
  },

  /**
   * Crée ou update un ExternalConnector (upsert sur operatorId + connectorType).
   * Status par défaut INACTIVE — operator doit appeler testChannel pour passer ACTIVE.
   */
  async register(
    operatorId: string,
    connectorType: string,
    config: Record<string, unknown>,
    activate = false,
  ): Promise<CredentialEntry> {
    const cred = await db.externalConnector.upsert({
      where: { operatorId_connectorType: { operatorId, connectorType } },
      create: {
        operatorId,
        connectorType,
        config,
        status: activate ? "ACTIVE" : "INACTIVE",
      },
      update: {
        config,
        status: activate ? "ACTIVE" : undefined,
      },
    });
    return {
      id: cred.id,
      operatorId: cred.operatorId,
      connectorType: cred.connectorType,
      config: (cred.config ?? {}) as Record<string, unknown>,
      status: cred.status as CredentialEntry["status"],
      lastSyncAt: cred.lastSyncAt,
      errorLog: cred.errorLog,
    };
  },

  /**
   * Soft-delete : status → INACTIVE. Conservé pour traçabilité audit.
   */
  async revoke(
    operatorId: string,
    connectorType: string,
  ): Promise<{ id: string | null; previousStatus: string | null }> {
    const existing = await db.externalConnector.findUnique({
      where: { operatorId_connectorType: { operatorId, connectorType } },
    });
    if (!existing) return { id: null, previousStatus: null };
    const previousStatus = existing.status;
    await db.externalConnector.update({
      where: { id: existing.id },
      data: { status: "INACTIVE" },
    });
    return { id: existing.id, previousStatus };
  },

  /**
   * Marque un credential comme ACTIVE après un test channel réussi.
   */
  async markActive(operatorId: string, connectorType: string): Promise<void> {
    await db.externalConnector.update({
      where: { operatorId_connectorType: { operatorId, connectorType } },
      data: {
        status: "ACTIVE",
        lastSyncAt: new Date(),
      },
    });
  },

  /**
   * Marque un credential comme ERROR avec log.
   */
  async markError(
    operatorId: string,
    connectorType: string,
    errorLog: unknown,
  ): Promise<void> {
    await db.externalConnector.update({
      where: { operatorId_connectorType: { operatorId, connectorType } },
      data: {
        status: "ERROR",
        errorLog: errorLog as object,
      },
    });
  },
};

export function deferredCredentials(connectorType: string, reason?: string) {
  return {
    status: "DEFERRED_AWAITING_CREDENTIALS" as const,
    connectorType,
    configureUrl: `/console/anubis/credentials?type=${encodeURIComponent(connectorType)}`,
    reason: reason ?? "no active credential registered for this connector",
  };
}
