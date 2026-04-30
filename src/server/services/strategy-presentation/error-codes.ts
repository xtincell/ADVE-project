/**
 * Oracle Error Codes — catalogue gouverné des erreurs du pipeline d'enrichissement.
 *
 * Tout `throw` du service `strategy-presentation` (et des sites qui touchent à
 * l'Oracle) doit être un `OracleError` avec un code listé ici. Le code remonte :
 *   1. vers `error-vault` (ErrorEvent.code = "ORACLE-NNN", context = { governor, ... })
 *   2. vers le frontend via `TRPCError.cause.{ code, governor, remediation }`
 *
 * Voir [ADR-0022](../../../../docs/governance/adr/0022-oracle-error-codes.md).
 */

export type OracleGovernor = "MESTOR" | "ARTEMIS" | "SESHAT" | "THOT" | "INFRASTRUCTURE";

export interface OracleErrorEntry {
  /** Message FR explicite affiché à l'opérateur. */
  fr: string;
  /** Conseil d'auto-remédiation (où chercher, quoi vérifier). */
  hint: string;
  /** Neter responsable du domaine fautif (pour triage). */
  governor: OracleGovernor;
  /** True si l'erreur est attendue / récupérable (pas un bug serveur). */
  recoverable: boolean;
}

export const ORACLE_ERROR_CODES = {
  // ── 1xx — Pre-conditions (utilisateur a un blocker) ─────────────────────
  "ORACLE-101": {
    fr: "Piliers ADVE pas assez mûrs pour enrichir l'Oracle.",
    hint: "Compléter A/D/V/E jusqu'au stade ENRICHED via /cockpit/brand/[a|d|v|e].",
    governor: "MESTOR",
    recoverable: true,
  },
  "ORACLE-102": {
    fr: "Budget Thot insuffisant pour cette enrichment.",
    hint: "Augmenter le budget mensuel Operator ou attendre le reset (1er du mois).",
    governor: "THOT",
    recoverable: true,
  },
  "ORACLE-103": {
    fr: "User non lié à un Operator.",
    hint: "Vérifier le binding user.operatorId dans /console/operators.",
    governor: "MESTOR",
    recoverable: true,
  },
  "ORACLE-104": {
    fr: "StrategyId manquant ou invalide.",
    hint: "Sélectionner une stratégie valide depuis le selector du Cockpit.",
    governor: "MESTOR",
    recoverable: true,
  },

  // ── 2xx — Exécution (un framework / sequence a foiré) ────────────────────
  "ORACLE-201": {
    fr: "Framework Artemis a échoué.",
    hint: "Voir context.frameworkSlug pour identifier le framework. Re-tenter avec circuit-breaker.",
    governor: "ARTEMIS",
    recoverable: true,
  },
  "ORACLE-202": {
    fr: "Séquence Glory (BRANDBOOK-D) a échoué.",
    hint: "Vérifier que les outils Glory sont configurés et que les briefs amonts sont disponibles.",
    governor: "ARTEMIS",
    recoverable: true,
  },
  "ORACLE-203": {
    fr: "Cycle de dépendances détecté entre frameworks.",
    hint: "Auditer le graphe Artemis dependsOn — un cycle a été introduit. Voir docs/governance/CODE-MAP.md.",
    governor: "ARTEMIS",
    recoverable: false,
  },
  "ORACLE-204": {
    fr: "LLM Gateway en circuit-breaker (provider down).",
    hint: "Réessayer dans 60s. Vérifier le status providers dans /console/governance/llm-gateway.",
    governor: "INFRASTRUCTURE",
    recoverable: true,
  },
  "ORACLE-205": {
    fr: "Phase Seshat (observation) a échoué.",
    hint: "Tarsis ou queryReferences indisponible. Pipeline continue sans benchmarks.",
    governor: "SESHAT",
    recoverable: true,
  },
  "ORACLE-206": {
    fr: "Phase Mestor (priorisation LLM) a échoué.",
    hint: "Fallback ordre par défaut appliqué. Voir LLM Gateway logs.",
    governor: "MESTOR",
    recoverable: true,
  },

  // ── 3xx — Writeback (écriture pillar refusée) ────────────────────────────
  "ORACLE-301": {
    fr: "Écriture pillar refusée par pillar-gateway.",
    hint: "Vérifier les ManifestRules ou le ModelPolicy. Voir context.pillarKey.",
    governor: "MESTOR",
    recoverable: false,
  },
  "ORACLE-302": {
    fr: "Validation Zod du pillar a échoué après writeback.",
    hint: "Voir context.zodError pour les champs fautifs. Le framework a produit un output mal formé.",
    governor: "MESTOR",
    recoverable: false,
  },
  "ORACLE-303": {
    fr: "Seeding (DevotionSnapshot/CultIndexSnapshot/confidence) a échoué.",
    hint: "Pipeline continue mais les métriques dérivées seront stale. Voir context.seedStage.",
    governor: "SESHAT",
    recoverable: true,
  },

  // ── 9xx — Infrastructure (bug, sérialisation, base) ──────────────────────
  "ORACLE-901": {
    fr: "Sérialisation governance corrompue (stack overflow / circular).",
    hint: "Bug post-emit-intent. Vérifier que le wrapper extract result.data avant Prisma JSON.",
    governor: "INFRASTRUCTURE",
    recoverable: false,
  },
  "ORACLE-902": {
    fr: "Persistence IntentEmission impossible.",
    hint: "Vérifier la connexion Prisma + migrations à jour.",
    governor: "INFRASTRUCTURE",
    recoverable: false,
  },
  "ORACLE-903": {
    fr: "Hash chain IntentEmission rompue.",
    hint: "Audit-tamper-evidence breach. Lancer scripts/verify-hash-chain.ts.",
    governor: "INFRASTRUCTURE",
    recoverable: false,
  },
  "ORACLE-999": {
    fr: "Erreur interne non catégorisée.",
    hint: "Bug NEFER : tout throw doit avoir un code. Voir error-vault stack pour identifier la frame.",
    governor: "INFRASTRUCTURE",
    recoverable: false,
  },
} as const satisfies Record<string, OracleErrorEntry>;

export type OracleErrorCode = keyof typeof ORACLE_ERROR_CODES;

const CODE_REGEX = /^ORACLE-\d{3}$/;

export function isOracleErrorCode(value: unknown): value is OracleErrorCode {
  return typeof value === "string" && CODE_REGEX.test(value) && value in ORACLE_ERROR_CODES;
}

/**
 * Erreur typée du pipeline Oracle. Toujours throwable — capturée par le wrapper
 * `governedProcedure` qui la convertit en TRPCError + ErrorEvent.
 */
export class OracleError extends Error {
  readonly code: OracleErrorCode;
  readonly entry: OracleErrorEntry;
  readonly context: Record<string, unknown>;

  constructor(
    code: OracleErrorCode,
    context: Record<string, unknown> = {},
    options: { cause?: unknown } = {},
  ) {
    const entry = ORACLE_ERROR_CODES[code];
    super(`[${code}] ${entry.fr}`);
    this.name = "OracleError";
    this.code = code;
    this.entry = entry;
    this.context = context;
    if (options.cause !== undefined) {
      (this as unknown as { cause: unknown }).cause = options.cause;
    }
  }

  toCausePayload(): {
    code: OracleErrorCode;
    governor: OracleGovernor;
    remediation: string;
    recoverable: boolean;
    context: Record<string, unknown>;
  } {
    return {
      code: this.code,
      governor: this.entry.governor,
      remediation: this.entry.hint,
      recoverable: this.entry.recoverable,
      context: this.context,
    };
  }
}

/**
 * Promote any thrown value to an OracleError. Preserves OracleError as-is,
 * recognises governance-specific errors (Readiness, Cost), and falls back to
 * ORACLE-999 for unknowns.
 */
export function toOracleError(err: unknown): OracleError {
  if (err instanceof OracleError) return err;

  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name?: string }).name;
    if (name === "ReadinessVetoError") {
      const blockers = (err as { blockers?: unknown }).blockers ?? [];
      return new OracleError("ORACLE-101", { blockers }, { cause: err });
    }
    if (name === "CostVetoError") {
      const result = (err as { result?: unknown }).result ?? null;
      return new OracleError("ORACLE-102", { decision: result }, { cause: err });
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  return new OracleError("ORACLE-999", { originalMessage: message }, { cause: err });
}

/**
 * Convenience: get the entry without instantiating an error.
 */
export function lookupOracleEntry(code: OracleErrorCode): OracleErrorEntry {
  return ORACLE_ERROR_CODES[code];
}
