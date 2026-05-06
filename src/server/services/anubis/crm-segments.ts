/**
 * Anubis — CRM segments + cohort retention API (Phase 19, ADR-0052 Cluster C support).
 *
 * 2 APIs minimales pour câblage des sous-clusters campaign-tracker Cluster C :
 *   - `createCrmSegment` — utilisé par `superfan.crmCapture` post-archive
 *   - `measureCohortRetention` — utilisé par `superfan.stickiness` cohort longitudinal J+30/90/180
 *
 * Pattern Anubis Credentials Vault (ADR-0021) : si CRM provider absent, retour
 * structuré `DEFERRED_AWAITING_CREDENTIALS` au lieu de throw. Caller (campaign-tracker)
 * gère la dégradation gracieuse via capability flags 4-états (ADR-0052 §2.5).
 *
 * MVP Phase 19 (ADR-0052-C support) : retours stub structurés pour permettre au caller
 * de continuer + degradation flagué. PRODUCTION future : provider façade CRM dédié
 * (Mailchimp/HubSpot/Brevo) sous Credentials Vault. Cf. providers.ts pattern existant.
 */

import { credentialVault } from "./credential-vault";

export interface CreateCrmSegmentInput {
  readonly name: string;
  readonly strategyId: string;
  readonly memberUserIds: readonly string[];
  /** Tag optionnel pour retrouver la cohorte ultérieurement (ex: `superfans-CAMP-2026-01`). */
  readonly tag?: string;
}

export interface CreateCrmSegmentResult {
  readonly segmentName: string;
  readonly memberCount: number;
  readonly created: boolean;
  readonly deferredReason: string | null;
}

/**
 * Crée un segment CRM nommé pour une cohorte d'utilisateurs.
 *
 * MVP (Phase 19 Vague 3 promotion) : retourne un placeholder `created: true` avec
 * `deferredReason = "MVP_PROVIDER_NOT_CONFIGURED"`. Pas d'écriture DB MVP — le caller
 * verra le segment comme "logiquement créé" mais sait via deferredReason que la
 * persistance réelle attend le provider CRM.
 *
 * PRODUCTION : interrogation Credentials Vault → si provider CRM configuré
 * (`provider: "crm-mailchimp" | "crm-hubspot" | ...`), POST sur l'API avec
 * memberUserIds. Sinon DEFERRED_AWAITING_CREDENTIALS comme pattern Anubis Phase 15.
 */
export async function createCrmSegment(
  input: CreateCrmSegmentInput,
): Promise<CreateCrmSegmentResult> {
  // Vérifier si un provider CRM est configuré dans le Credentials Vault.
  let providerConfigured = false;
  try {
    // Strategy.userId / operatorId est résolu côté caller. Ici on check si un
    // operator quelconque dans le tenant a configuré "crm". Pattern Vague 3 MVP.
    // PRODUCTION : passer operatorId explicite via input.
    providerConfigured = await credentialVault.hasValidCredential("_anyOperator_", "crm");
  } catch {
    providerConfigured = false;
  }

  if (!providerConfigured) {
    return {
      segmentName: input.name,
      memberCount: input.memberUserIds.length,
      created: false,
      deferredReason: "DEFERRED_AWAITING_CREDENTIALS",
    };
  }

  // PRODUCTION ici : provider.createSegment({ name, memberUserIds, tag }).
  // MVP : on retourne created=true comme placeholder optimiste pour permettre
  // au caller de continuer ses cascade Intent kinds. Le caller doit checker
  // deferredReason pour savoir si la persistence réelle a eu lieu.
  return {
    segmentName: input.name,
    memberCount: input.memberUserIds.length,
    created: true,
    deferredReason: "MVP_PROVIDER_LOGIC_NOT_WIRED",
  };
}

export interface MeasureCohortRetentionInput {
  readonly segmentName: string;
  readonly strategyId: string;
  /** Asof date pour mesure (default = now). Permet replays historiques. */
  readonly asOf?: Date;
  /** Initial cohort size si connu côté caller (campaign-tracker peut l'avoir tracké). */
  readonly initialSizeHint?: number;
}

export interface MeasureCohortRetentionResult {
  readonly segmentName: string;
  readonly initialSize: number;
  readonly currentSize: number;
  readonly retentionRate: number; // 0..1
  readonly asOf: string; // ISO timestamp
  readonly deferredReason: string | null;
}

/**
 * Mesure la taille actuelle d'une cohorte CRM par rapport à sa taille initiale.
 *
 * MVP (Phase 19 promotion `superfan.stickiness` STUB → MVP) :
 *   - Si Credentials Vault n'a pas de provider CRM → DEFERRED_AWAITING_CREDENTIALS
 *   - Sinon retour conservateur `currentSize = initialSize, retentionRate = 1.0`
 *     avec `deferredReason = "MVP_NO_DECAY_TRACKED"`
 *
 * Permet au caller (`measureDevotionStickinessCohort`) de passer de STUB
 * (toujours DEFERRED_AWAITING_DEPS) à MVP (decay calculable une fois provider câblé).
 *
 * PRODUCTION : interroge le CRM provider via `provider.getSegmentSize(segmentName)`.
 */
export async function measureCohortRetention(
  input: MeasureCohortRetentionInput,
): Promise<MeasureCohortRetentionResult> {
  const asOf = input.asOf ?? new Date();

  let providerConfigured = false;
  try {
    // Strategy.userId / operatorId est résolu côté caller. Ici on check si un
    // operator quelconque dans le tenant a configuré "crm". Pattern Vague 3 MVP.
    // PRODUCTION : passer operatorId explicite via input.
    providerConfigured = await credentialVault.hasValidCredential("_anyOperator_", "crm");
  } catch {
    providerConfigured = false;
  }

  if (!providerConfigured) {
    return {
      segmentName: input.segmentName,
      initialSize: input.initialSizeHint ?? 0,
      currentSize: 0,
      retentionRate: 0,
      asOf: asOf.toISOString(),
      deferredReason: "DEFERRED_AWAITING_CREDENTIALS",
    };
  }

  // MVP : retour conservateur. PRODUCTION fera l'appel provider réel.
  const initial = input.initialSizeHint ?? 0;
  return {
    segmentName: input.segmentName,
    initialSize: initial,
    currentSize: initial, // placeholder = pas de decay tracké
    retentionRate: initial > 0 ? 1.0 : 0,
    asOf: asOf.toISOString(),
    deferredReason: "MVP_NO_DECAY_TRACKED",
  };
}
