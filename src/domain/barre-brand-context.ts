import type { FieldProvenance } from "./field-provenance";

/** A reader projection, never persisted as another brand platform. */
export type BarreBrandContext = {
  generatedAt: string;
  sharingMode: "DOCUMENT_V2";
  /** La route `/la-barre/bilan` reçoit un bilan de campagne arrêté (LB4). */
  campaignReviewReception?: "CAMPAIGN_REVIEW_V1";
  /** Les gestes enregistrés par cette session sont attestés par La Fusée (LB3, ADR-0245). */
  actorAttestation?: "SESSION_V1";
  /** La personne connectée : identifiant stable et nom affichable, jamais d'e-mail. */
  actor?: { id: string; name: string | null };
  choices?: Array<{ id: string; nodeId: string; strategyId: string; name: string; url: string }>;
  brands: Record<string, {
    nodeId: string;
    strategyId: string;
    name: string;
    url: string;
    fields: Record<string, {
      value: unknown;
      provenance: FieldProvenance;
      sourceId: string | null;
      sourceVersion: number | null;
      lastWrittenAt: string | null;
    }>;
  }>;
  issues: string[];
};
