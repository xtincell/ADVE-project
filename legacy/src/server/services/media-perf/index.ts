/**
 * media-perf/ — Ingestion de performance média (ADR-0115, acteur Média).
 *
 * Pipeline DÉTERMINISTE qui normalise une perf vers `CampaignAmplification` :
 *   - chemin MANUEL : l'opérateur fournit les chiffres RÉELS (POS, export
 *     plateforme) → normalisés → persistés. Zéro mock, zéro LLM.
 *   - chemin LIVE : credential-gated via le Credentials Vault. Sans clé →
 *     `DEFERRED_AWAITING_CREDENTIALS` ; avec clé mais SDK provider non câblé →
 *     `DEGRADED` HONNÊTE (jamais de chiffre inventé).
 */

import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain/connector-result";
import { credentialVault } from "@/server/services/anubis/credential-vault";
import { normalizePerfPayload, platformToConnectorType, type RawPerfPayload, type NormalizedPerf } from "./normalize";

export * from "./normalize";

export interface IngestResult {
  amplificationId: string;
  normalized: NormalizedPerf;
}

/**
 * Ingestion MANUELLE : persiste des chiffres perf RÉELS fournis par l'opérateur,
 * normalisés vers `CampaignAmplification`. Upsert sur (campaign, platform).
 */
export async function ingestManualPerformance(input: {
  campaignId: string;
  platform: string;
  raw: RawPerfPayload;
  budget?: number;
  currency?: string;
}): Promise<IngestResult> {
  const n = normalizePerfPayload(input.raw);
  const existing = await db.campaignAmplification.findFirst({
    where: { campaignId: input.campaignId, platform: input.platform },
    select: { id: true },
  });
  const data = {
    impressions: n.impressions,
    clicks: n.clicks,
    conversions: n.conversions,
    reach: n.reach,
    views: n.views,
    engagements: n.engagements,
    cpa: n.cpa,
    roas: n.roas,
    mediaCost: n.mediaCost,
    status: "MEASURED",
  };
  const amp = existing
    ? await db.campaignAmplification.update({ where: { id: existing.id }, data })
    : await db.campaignAmplification.create({
        data: {
          campaignId: input.campaignId,
          platform: input.platform,
          budget: input.budget ?? n.mediaCost ?? 0,
          currency: input.currency ?? "XAF",
          ...data,
        },
      });
  return { amplificationId: amp.id, normalized: n };
}

/**
 * Ingestion LIVE credential-gated. Renvoie un `ConnectorResult` honnête — jamais
 * de données mockées. DEFERRED sans clé ; DEGRADED si le SDK provider n'est pas
 * encore câblé (les clés seules ne suffisent pas tant que l'appel réel n'existe pas).
 */
export async function ingestLivePerformance(input: {
  operatorId: string;
  campaignId: string;
  platform: string;
}): Promise<ConnectorResult<IngestResult>> {
  const connectorType = platformToConnectorType(input.platform);
  if (!connectorType) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }
  const cred = await credentialVault.get(input.operatorId, connectorType);
  if (!cred) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: connectorType };
  }
  // Clé présente mais l'appel SDK réel (Meta/Google/TikTok/POS) n'est pas encore
  // câblé dans ce repo → on le déclare HONNÊTEMENT plutôt que d'inventer des
  // chiffres. Le pipeline de normalisation/persistance, lui, est prêt (chemin manuel).
  return { state: "DEGRADED", reason: "INSUFFICIENT_DATA", lastObservedAt: cred.lastSyncAt?.toISOString() };
}
