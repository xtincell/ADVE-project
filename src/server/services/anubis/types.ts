/**
 * Anubis — Comms (Ground #7) — full activation Phase 15 (ADR-0020).
 *
 * Psychopompe égyptien — guide entre mondes. Master of Comms.
 *
 * Anubis orchestre broadcast multi-canal, ad networks, notification center
 * persistent, et gère les credentials externes via le pattern Credentials Vault
 * (ADR-0021). Provider façades feature-flagged : retournent
 * DEFERRED_AWAITING_CREDENTIALS si pas de creds en DB.
 *
 * Cf. PANTHEON.md §2.7 ; ADR-0011 (pré-réserve) ; ADR-0018 (Superseded) ; ADR-0020 (full).
 */

// ─── draftCommsPlan (Phase 13 back-compat + Phase 15 enrichment) ─────────────

export interface AnubisDraftCommsPlanPayload {
  strategyId: string;
  /** Optionnel : context audience pour personnaliser le draft. */
  audience?: string;
}

/**
 * Output du draftCommsPlan. **Nom conservé** pour back-compat avec Phase 13
 * (commandant.ts utilise `.status` et `.adrRefs`).
 */
export interface AnubisCommsPlanPlaceholder {
  /** Texte humain résumant le plan comms. */
  placeholder: string;
  /** "DRAFT" en Phase 15+ ; "DORMANT_PRE_RESERVED" reste valide pour back-compat. */
  status: "DRAFT" | "DORMANT_PRE_RESERVED";
  /** Lien ADRs. */
  adrRefs: readonly string[];
  /** Date d'émission. */
  scaffoldedAt: string;
  /** [Phase 15+] Canaux planifiés. */
  channels?: readonly string[];
  /** [Phase 15+] CommsPlanId si persisté. */
  commsPlanId?: string;
}

// ─── Provider deferred state (cf. ADR-0021) ─────────────────────────────────

/**
 * Retour standard quand un connector externe n'a pas de credentials valides.
 * Le caller affiche un CTA "Configure provider X" qui linke vers `configureUrl`.
 */
export interface DeferredAwaitingCredentials {
  status: "DEFERRED_AWAITING_CREDENTIALS";
  connectorType: string;
  configureUrl: string;
  reason: string;
}

// ─── broadcastMessage ───────────────────────────────────────────────────────

export interface AnubisBroadcastMessagePayload {
  commsPlanId: string;
  channels: readonly string[];
  operatorId: string;
}

export type AnubisBroadcastMessageResult =
  | {
      status: "QUEUED" | "SENDING";
      broadcastJobId: string;
      jobsCreated: readonly { channel: string; jobId: string }[];
    }
  | DeferredAwaitingCredentials;

// ─── buyAdInventory ─────────────────────────────────────────────────────────

export interface AnubisBuyAdInventoryPayload {
  campaignId: string;
  provider: string;
  budgetUsd: number;
  adCopy: string;
  operatorId: string;
}

export type AnubisBuyAdInventoryResult =
  | {
      status: "PURCHASED" | "QUEUED";
      providerTaskId: string;
      providerName: string;
      estimatedReach: string;
    }
  | DeferredAwaitingCredentials;

// ─── segmentAudience ────────────────────────────────────────────────────────

export interface AnubisSegmentAudiencePayload {
  rules: Record<string, unknown>;
  operatorId: string;
}

export interface AnubisAudienceSegment {
  estimatedCount: number;
  /** Hash des règles pour réutilisation/cache. */
  segmentHash: string;
  /** Règles appliquées (echo input pour audit). */
  appliedRules: Record<string, unknown>;
}

// ─── trackDelivery ──────────────────────────────────────────────────────────

export interface AnubisTrackDeliveryPayload {
  broadcastJobId: string;
}

export interface AnubisDeliveryReport {
  broadcastJobId: string;
  total: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  /** Métriques brutes du provider (audit). */
  rawMetrics?: Record<string, unknown>;
}

// ─── registerCredential ─────────────────────────────────────────────────────

export interface AnubisRegisterCredentialPayload {
  operatorId: string;
  connectorType: string;
  config: Record<string, unknown>;
}

export interface AnubisCredentialRegistered {
  externalConnectorId: string;
  connectorType: string;
  status: "ACTIVE" | "INACTIVE";
}

// ─── revokeCredential ──────────────────────────────────────────────────────

export interface AnubisRevokeCredentialPayload {
  operatorId: string;
  connectorType: string;
}

export interface AnubisCredentialRevoked {
  externalConnectorId: string | null;
  previousStatus: string | null;
}

// ─── testChannel ───────────────────────────────────────────────────────────

export interface AnubisTestChannelPayload {
  operatorId: string;
  connectorType: string;
}

export interface AnubisChannelTestResult {
  success: boolean;
  connectorType: string;
  reason?: string;
}

// ─── scheduleBroadcast ─────────────────────────────────────────────────────

export interface AnubisScheduleBroadcastPayload {
  commsPlanId: string;
  scheduledFor: string;
}

export interface AnubisScheduledBroadcast {
  commsPlanId: string;
  scheduledFor: string;
  status: "SCHEDULED";
}

// ─── cancelBroadcast ───────────────────────────────────────────────────────

export interface AnubisCancelBroadcastPayload {
  broadcastJobId: string;
}

export interface AnubisBroadcastCancelled {
  broadcastJobId: string;
  previousStatus: string;
  status: "CANCELLED";
}

// ─── fetchDeliveryReport ───────────────────────────────────────────────────

export interface AnubisFetchDeliveryReportPayload {
  broadcastJobId: string;
}

export type AnubisDeliveryReportResult =
  | (AnubisDeliveryReport & { status: "OK" })
  | DeferredAwaitingCredentials;

// ─── Provider types ────────────────────────────────────────────────────────

/** Connector types supported by Phase 15 façades. Extensible via custom strings. */
export const KNOWN_CONNECTOR_TYPES = [
  "meta-ads",
  "google-ads",
  "x-ads",
  "tiktok-ads",
  "mailgun",
  "twilio",
  "email-fallback",
] as const;

export type KnownConnectorType = (typeof KNOWN_CONNECTOR_TYPES)[number];
