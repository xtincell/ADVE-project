/**
 * Campaign Tracker — Souveraineté opérationnelle (Phase 19, ADR-0052 Cluster G).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 3 (2) :
 *   - souverainete.complianceCheck      — règles ARPP/CONAC/ASA par lieu (réutilise ADR-0037)
 *   - souverainete.credentialsChainSnapshot — audit chain of custody ExternalConnector[]
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 * + ADR-0037 (country-scoped knowledge base) + ADR-0021 (Credentials Vault)
 */

import { db } from "@/lib/db";
import { createHash } from "node:crypto";
import {
  type ComplianceCheckResult,
  type CredentialsChainSnapshotResult,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster souverainete.complianceCheck (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface CheckFieldOpComplianceInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignFieldOpId: string;
}

/**
 * MVP : Mappe un CampaignFieldOp.location vers son country code via heuristic
 * regex, puis applique des règles statiques par pays. PRODUCTION : intégrera
 * country-scoped knowledge base (ADR-0037) qui contient les règles canon.
 */
const COUNTRY_RULES_MVP: Record<string, readonly string[]> = {
  CM: ["CONAC_CAM_PUB", "ASA_AFFICHAGE_PUB"], // Cameroun
  SN: ["ARPP_SEN_PUB"], // Sénégal
  CI: ["ARPP_CIV_PUB"], // Côte d'Ivoire
  FR: ["ARPP_FR_PUB", "RGPD_FR"], // France
  // ... PRODUCTION étendra via ADR-0037 country-registry
};

export async function checkCampaignFieldOpCompliance(
  input: CheckFieldOpComplianceInput,
): Promise<ComplianceCheckResult> {
  const fieldOp = await db.campaignFieldOp.findUnique({
    where: { id: input.campaignFieldOpId },
    select: {
      id: true,
      location: true,
      campaign: {
        select: {
          strategyId: true,
          strategy: { select: { countryCode: true } },
        },
      },
    },
  });
  if (!fieldOp) throw new Error(`CampaignFieldOp ${input.campaignFieldOpId} not found`);
  if (fieldOp.campaign.strategyId !== input.strategyId) {
    throw new Error(`FieldOp ${fieldOp.id} not in strategy ${input.strategyId}`);
  }

  const country = fieldOp.campaign.strategy?.countryCode ?? extractCountryFromLocation(fieldOp.location);
  const degradationCodes: string[] = [];

  if (!country) {
    degradationCodes.push("MISSING_COUNTRY_CODE");
    return {
      campaignFieldOpId: fieldOp.id,
      country: null,
      applicableRules: [],
      blockingFlags: [],
      warningFlags: [],
      degradationCodes,
    };
  }

  const applicableRules = COUNTRY_RULES_MVP[country] ?? [];
  if (applicableRules.length === 0) {
    degradationCodes.push("NO_RULES_REGISTERED_FOR_COUNTRY");
  }

  // MVP : pas de checks bloquants — placeholder pour PRODUCTION via ADR-0037 PR.
  return {
    campaignFieldOpId: fieldOp.id,
    country,
    applicableRules,
    blockingFlags: [],
    warningFlags: applicableRules.map((rule) => ({
      rule,
      reason: "MVP placeholder — règle déclarée mais check business non câblé",
    })),
    degradationCodes,
  };
}

function extractCountryFromLocation(location: string): string | null {
  // Heuristic MVP : mots-clés communs.
  const lower = location.toLowerCase();
  if (/cameroun|cameroon|douala|yaound[eé]/.test(lower)) return "CM";
  if (/s[eé]n[eé]gal|dakar/.test(lower)) return "SN";
  if (/c[oô]te d.ivoire|ivory coast|abidjan/.test(lower)) return "CI";
  if (/france|paris|lyon|marseille/.test(lower)) return "FR";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster souverainete.credentialsChainSnapshot (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface SnapshotCredentialsChainInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * MVP : à LIVE, snapshot ExternalConnector.id[] utilisés. Hash audit pour
 * intent log. PRODUCTION : récupère via Anubis Credentials Vault scope-aware.
 *
 * Pas de lecture des secrets — uniquement les `id` des connectors. Audit
 * hash-chain ref permet le tracé "qui a tourné les clés quand".
 */
export async function snapshotCredentialsChain(
  input: SnapshotCredentialsChainInput,
): Promise<CredentialsChainSnapshotResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      credentialsChainSnapshot: true,
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  // MVP : on récupère les ExternalConnector liés à l'opérateur de la strategy.
  // PRODUCTION : récupère via Anubis Credentials Vault scope-aware par campaign.
  let connectorIds: string[] = [];
  try {
    const strategy = await db.strategy.findUnique({
      where: { id: input.strategyId },
      select: { operatorId: true },
    });
    if (strategy?.operatorId) {
      const connectors = await db.externalConnector.findMany({
        where: { operatorId: strategy.operatorId },
        select: { id: true },
      });
      connectorIds = connectors.map((c) => c.id);
    }
  } catch {
    connectorIds = [];
  }

  const now = new Date();
  const snapshotAt = now.toISOString();
  const auditHash = createHash("sha256")
    .update(`${campaign.id}|${snapshotAt}|${connectorIds.join(",")}`)
    .digest("hex");

  // Persister le snapshot pour audit.
  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      credentialsChainSnapshot: {
        snapshotAt,
        connectorIds,
        auditHash,
      } as object,
    },
  });

  return {
    campaignId: campaign.id,
    snapshotAt,
    connectorIds,
    auditHash,
  };
}
