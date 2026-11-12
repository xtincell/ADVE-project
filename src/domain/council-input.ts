import { z } from "zod";

/** Shared bounds for the existing Council query and its cockpit input. */
export const COUNCIL_TOPIC_MAX = 4_000;
export const COUNCIL_DRAFT_MAX = 50_000;

// The question covers the chat's existing 4000-character limit. A position is
// accepted whole or refused, never silently sliced into a different argument.
// Provider, token, cost and rate limits remain the existing Gateway's concern.
export const councilDeliberateInputSchema = z.object({
  strategyId: z.string(),
  topic: z.string().min(3).max(COUNCIL_TOPIC_MAX),
  draft: z.string().max(COUNCIL_DRAFT_MAX).optional(),
});
