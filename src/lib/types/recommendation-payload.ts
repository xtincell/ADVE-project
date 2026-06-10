/**
 * RECOMMENDATION PAYLOAD — typed function-calling contract (ADR-0088)
 *
 * The AI recommendation engine (Notoria) historically emitted text-replaces-text
 * mutations via the untyped `Recommendation.proposedValue: Json` column. This
 * gives that column a discriminated-union shape so the AI emits *targeted*
 * mutation events (function calling / event sourcing) that the apply path can
 * dispatch on `id` rather than re-writing whole text blobs.
 *
 * This is NOT a new Prisma model — it types the existing `Recommendation`
 * (status PENDING/ACCEPTED/REJECTED/APPLIED already drive the lifecycle).
 * Legacy rows whose `proposedValue` does not match this schema fall through to
 * the existing SET/ADD/MODIFY/REMOVE/EXTEND operation path (validate-on-read).
 */

import { z } from "zod";
import { ADVE_KEYS } from "@/domain";
import {
  PotentialActionSchemaV2,
  INITIATIVE_TIMEFRAMES,
  RISK_STATUSES,
} from "./pillar-schemas";

const uuid = z.string().uuid();

/** ADD_INITIATIVE — append a fully-formed initiative (must carry its own id). */
export const AddInitiativePayloadSchema = z.object({
  kind: z.literal("ADD_INITIATIVE"),
  pillar: z.literal("i"),
  channel: z.string().min(1).optional(), // catalogueParCanal key; defaults to a general bucket
  initiative: PotentialActionSchemaV2,
});

/** UPDATE_ADVE_FIELD — set a scalar/structured value on an ADVE pillar field. */
export const UpdateAdveFieldPayloadSchema = z.object({
  kind: z.literal("UPDATE_ADVE_FIELD"),
  pillar: z.enum(ADVE_KEYS),
  field: z.string().min(1),
  value: z.unknown(),
});

/** LINK_RISK — connect an initiative to a risk it mitigates (FK lineage). */
export const LinkRiskPayloadSchema = z.object({
  kind: z.literal("LINK_RISK"),
  initiativeId: uuid,
  riskId: uuid,
});

/** SELECT_INITIATIVE — promote an initiative into the roadmap. */
export const SelectInitiativePayloadSchema = z.object({
  kind: z.literal("SELECT_INITIATIVE"),
  initiativeId: uuid,
  timeframe: z.enum(INITIATIVE_TIMEFRAMES),
});

/** REJECT_INITIATIVE — explicitly drop an initiative from the roadmap. */
export const RejectInitiativePayloadSchema = z.object({
  kind: z.literal("REJECT_INITIATIVE"),
  initiativeId: uuid,
  reason: z.string().min(1),
});

/** SET_RISK_STATUS — move a risk through the mitigation workflow. */
export const SetRiskStatusPayloadSchema = z.object({
  kind: z.literal("SET_RISK_STATUS"),
  riskId: uuid,
  status: z.enum(RISK_STATUSES),
});

export const RecommendationPayloadSchema = z.discriminatedUnion("kind", [
  AddInitiativePayloadSchema,
  UpdateAdveFieldPayloadSchema,
  LinkRiskPayloadSchema,
  SelectInitiativePayloadSchema,
  RejectInitiativePayloadSchema,
  SetRiskStatusPayloadSchema,
]);

export type RecommendationPayload = z.infer<typeof RecommendationPayloadSchema>;
export type RecommendationPayloadKind = RecommendationPayload["kind"];

export const RECOMMENDATION_PAYLOAD_KINDS = [
  "ADD_INITIATIVE",
  "UPDATE_ADVE_FIELD",
  "LINK_RISK",
  "SELECT_INITIATIVE",
  "REJECT_INITIATIVE",
  "SET_RISK_STATUS",
] as const;

/**
 * Parse an untyped `Recommendation.proposedValue` into a typed payload.
 * Returns null for legacy/non-matching rows (caller falls back to the legacy
 * operation path). Never throws.
 */
export function parseRecommendationPayload(value: unknown): RecommendationPayload | null {
  const r = RecommendationPayloadSchema.safeParse(value);
  return r.success ? r.data : null;
}
