/**
 * Brief Ingest Pipeline — Types & Zod Schemas
 *
 * Validates LLM output from brief analysis and tRPC inputs.
 * ParsedBrief is the canonical shape for any campaign brief,
 * regardless of source format (PDF, DOCX, manual).
 */

import { z } from "zod";

// ── Client identity ─────────────────────────────────────────────────────────

export const parsedBriefClientSchema = z.object({
  companyName: z.string(),
  brandName: z.string(),
  sector: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

// ── Strategic context ───────────────────────────────────────────────────────

export const parsedBriefContextSchema = z.object({
  marketContext: z.string(),
  problemStatement: z.string(),
  ambition: z.string(),
  competitors: z.array(z.string()).default([]),
  keyMessage: z.string(),
});

// ── Objectives ──────────────────────────────────────────────────────────────

export const parsedBriefObjectivesSchema = z.object({
  primary: z.string(),
  secondary: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
});

// ── Targeting ───────────────────────────────────────────────────────────────

export const parsedBriefTargetingSchema = z.object({
  corePrimary: z.string(),
  secondary: z.array(z.string()).default([]),
  consumerInsight: z.string(),
});

// ── Creative direction ──────────────────────────────────────────────────────

export const parsedBriefCreativeSchema = z.object({
  toneAndStyle: z.array(z.string()).default([]),
  brandPersonality: z.string().optional(),
});

// ── Deliverables (→ become Missions) ────────────────────────────────────────

export const deliverableSchema = z.object({
  type: z.string(),
  description: z.string(),
  format: z.string().optional(),
  quantity: z.number().optional(),
  channel: z.string(),
});

// ── Budget ──────────────────────────────────────────────────────────────────

export const parsedBriefBudgetSchema = z.object({
  total: z.number().optional(),
  currency: z.string().default("XAF"),
  breakdown: z.record(z.number()).optional(),
}).optional();

// ── Timeline ────────────────────────────────────────────────────────────────

export const parsedBriefTimelineSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  milestones: z.array(z.object({
    label: z.string(),
    date: z.string().optional(),
  })).default([]),
}).optional();

// ── Client resolution (system-generated, not from LLM) ─────────────────────

export const clientResolutionSchema = z.object({
  found: z.boolean(),
  clientId: z.string().optional(),
  strategyId: z.string().optional(),
  confidence: z.number().min(0).max(1),
  matchedOn: z.string().optional(),
});

// ── Full ParsedBrief ────────────────────────────────────────────────────────

export const parsedBriefSchema = z.object({
  client: parsedBriefClientSchema,
  context: parsedBriefContextSchema,
  objectives: parsedBriefObjectivesSchema,
  targeting: parsedBriefTargetingSchema,
  creative: parsedBriefCreativeSchema,
  deliverables: z.array(deliverableSchema).min(1),
  budget: parsedBriefBudgetSchema,
  timeline: parsedBriefTimelineSchema,
  campaignType: z.string(),
  campaignName: z.string(),
  // System metadata (not from LLM)
  clientResolution: clientResolutionSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawTextLength: z.number().optional(),
});

export type ParsedBrief = z.infer<typeof parsedBriefSchema>;
export type ParsedBriefClient = z.infer<typeof parsedBriefClientSchema>;
export type Deliverable = z.infer<typeof deliverableSchema>;
export type ClientResolution = z.infer<typeof clientResolutionSchema>;

// ── Ingest status tracking ──────────────────────────────────────────────────

export type IngestPhase =
  | "EXTRACTING"
  | "ANALYZING"
  | "RESOLVING"
  | "SEEDING_ADVE"
  | "CREATING_CAMPAIGN"
  | "SPAWNING_MISSIONS"
  | "DONE"
  | "FAILED";

export interface IngestResult {
  clientId: string;
  strategyId: string;
  campaignId: string;
  briefId: string;
  missionIds: string[];
  suggestedSequences: string[];
}

// ── Deliverable → DriverChannel mapping ─────────────────────────────────────

export const DELIVERABLE_CHANNEL_MAP: Record<string, string> = {
  "TV": "TV",
  "TELEVISION": "TV",
  "FILM": "TV",
  "RADIO": "RADIO",
  "OOH": "OOH",
  "AFFICHAGE": "OOH",
  "BILLBOARD": "OOH",
  "PRINT": "PRINT",
  "PRESSE": "PRINT",
  "DIGITAL": "WEBSITE",
  "WEB": "WEBSITE",
  "SOCIAL": "INSTAGRAM",
  "SOCIAL MEDIA": "INSTAGRAM",
  "INSTAGRAM": "INSTAGRAM",
  "FACEBOOK": "FACEBOOK",
  "TIKTOK": "TIKTOK",
  "LINKEDIN": "LINKEDIN",
  "PACKAGING": "PACKAGING",
  "EVENT": "EVENT",
  "EVENEMENT": "EVENT",
  "RP": "PR",
  "PR": "PR",
  "VIDEO": "VIDEO",
};

// Priority by deliverable type (higher = more urgent/important)
export const DELIVERABLE_PRIORITY: Record<string, number> = {
  "TV": 10,
  "VIDEO": 9,
  "RADIO": 7,
  "OOH": 6,
  "PRINT": 5,
  "DIGITAL": 5,
  "SOCIAL": 4,
  "PACKAGING": 4,
  "EVENT": 3,
  "PR": 3,
};

// Deliverable type → suggested Artemis sequence
export const DELIVERABLE_SEQUENCE_MAP: Record<string, string> = {
  "TV": "SPOT-VIDEO",
  "VIDEO": "SPOT-VIDEO",
  "FILM": "SPOT-VIDEO",
  "RADIO": "SPOT-RADIO",
  "OOH": "KV",
  "AFFICHAGE": "KV",
  "PRINT": "PRINT-AD",
  "SOCIAL": "SOCIAL-POST",
  "PACKAGING": "PACKAGING",
  "WEB": "WEB-COPY",
};
