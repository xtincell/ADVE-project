/**
 * Brief mandatory gate — ADR-0049.
 *
 * Principe : aucune action de campagne, mission de campagne, ou production matérielle
 * (CampaignAction, Mission rattachée, livrable BrandAsset/AssetVersion) ne peut être
 * créée tant que la Campaign n'a pas au moins un CampaignBrief OU un activeBriefId
 * pointant vers un BrandAsset.kind=CREATIVE_BRIEF.
 *
 * Symétrique avec la gate `brief_complete` du state-machine BRIEF_DRAFT → BRIEF_VALIDATED.
 * À utiliser au niveau service (createActionFromType, mission.create campaign-scoped, etc.).
 */

import { db as defaultDb } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

export class BriefMissingError extends Error {
  readonly code = "BRIEF_MISSING";
  constructor(public readonly campaignId: string, public readonly campaignName?: string) {
    super(
      `Action refusée : la campagne ${campaignName ?? campaignId} n'a pas de brief actif. ` +
        `Importez un brief existant ou générez-en un avant toute production (action, mission, forge). ` +
        `Cf. ADR-0049.`,
    );
    this.name = "BriefMissingError";
  }
}

export interface CampaignBriefStatus {
  hasBrief: boolean;
  briefCount: number;
  activeBriefId: string | null;
  primaryBrief: {
    id: string;
    title: string;
    briefType: string | null;
    status: string;
    version: number;
  } | null;
}

/**
 * Read-only check : retourne le statut brief de la Campaign.
 * Utilisable par les UIs (badges, gating front) et les preconditions serveur.
 */
export async function getCampaignBriefStatus(
  campaignId: string,
  db: PrismaClient = defaultDb,
): Promise<CampaignBriefStatus> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      activeBriefId: true,
      briefs: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, briefType: true, status: true, version: true },
      },
    },
  });

  if (!campaign) {
    return { hasBrief: false, briefCount: 0, activeBriefId: null, primaryBrief: null };
  }

  const briefCount = campaign.briefs.length;
  const hasBrief = briefCount > 0 || campaign.activeBriefId != null;
  const primaryBrief = campaign.briefs[0] ?? null;

  return {
    hasBrief,
    briefCount,
    activeBriefId: campaign.activeBriefId,
    primaryBrief,
  };
}

/**
 * Throwing precondition : refuse la suite de l'opération si la Campaign n'a pas de brief.
 *
 * À appeler dans :
 *  - `createActionFromType(campaignId, ...)` avant insert CampaignAction
 *  - `mission.create({ campaignId, ... })` quand campaignId est défini
 *  - tout handler INVOKE_GLORY_TOOL / PTAH_MATERIALIZE_BRIEF rattaché à une campagne
 *    et dont l'output n'est PAS un brief (les Glory tools brief-only sont la voie
 *    légitime pour CRÉER le brief — exempts de la gate).
 */
export async function assertCampaignHasBrief(
  campaignId: string,
  db: PrismaClient = defaultDb,
): Promise<void> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, activeBriefId: true, briefs: { select: { id: true }, take: 1 } },
  });

  if (!campaign) {
    throw new BriefMissingError(campaignId);
  }

  const hasBrief = campaign.briefs.length > 0 || campaign.activeBriefId != null;
  if (!hasBrief) {
    throw new BriefMissingError(campaignId, campaign.name);
  }
}
