/**
 * Output schemas (Zod) for the 4 launch/social Glory tools.
 *
 * These lock the contract for the deterministic ADVERTIS composers
 * (`glory-composers.ts`) AND serve as `outputSchema` on the tool registry
 * entries — so the canonical `executeTool` path is schema-enforced whether the
 * output comes from a composer (validated here) or, absent a composer, the LLM
 * fallback (ADR-0067 `executeStructuredLLMCall`).
 *
 * Kept dependency-free (zod only) so `registry.ts` can import without pulling in
 * the db-backed composer module.
 */

import { z } from "zod";

export const namingOutputSchema = z.object({
  brandName: z.string(),
  tagline: z.string().nullable().optional(),
  mascot: z.string().nullable().optional(),
  handleStrategy: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  handles: z.record(z.string(), z.string()),
  fallbacks: z.record(z.string(), z.array(z.string())).optional(),
  doNotName: z.array(z.string()),
  availabilityToVerify: z.array(z.string()),
});

export const socialProfileSchema = z.object({
  platform: z.string(),
  handle: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  about: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  pinned: z.string().nullable().optional(),
  contentAngle: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  highlights: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  shortDescription: z.string().nullable().optional(),
  fullDescription: z.string().nullable().optional(),
});

export const socialCopyOutputSchema = z.object({
  brand: z.string(),
  voice: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  handleBaseline: z.string().nullable().optional(),
  profiles: z.array(socialProfileSchema),
  linkInBio: z
    .object({ recommendation: z.string().nullable(), avoid: z.string().nullable() })
    .nullable()
    .optional(),
  doNot: z.array(z.string()),
});

export const contentPostSchema = z.object({
  date: z.string(),
  weekday: z.string(),
  week: z.string().nullable().optional(),
  platform: z.string(),
  format: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  angle: z.string().nullable().optional(),
  hashtags: z.array(z.string()),
  status: z.string(),
});

export const contentCalendarOutputSchema = z.object({
  brand: z.string(),
  cadenceParCanal: z.record(
    z.string(),
    z.object({
      rythme: z.string().nullable().optional(),
      piliers: z.array(z.string()).optional(),
      formats: z.array(z.string()).optional(),
      format: z.string().nullable().optional(),
    }),
  ),
  themesParPhaseOverton: z.array(z.object({ phase: z.string(), contenus: z.array(z.string()) })),
  hashtags: z.object({ signature: z.array(z.string()), local: z.array(z.string()) }),
  doNot: z.array(z.string()),
  posts: z.array(contentPostSchema),
});

export const launchTimelineWeekSchema = z.object({
  semaine: z.string(),
  dates: z.string(),
  phase: z.string(),
  theme: z.string(),
  kpi: z.string(),
  canaux: z.array(z.string()),
  actions: z.array(z.string()),
  opsDigitales: z.array(z.string()),
});

export const launchTimelineOutputSchema = z.object({
  brand: z.string(),
  weeks: z.array(launchTimelineWeekSchema),
  anchor: z
    .object({
      j1: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
      budgetGtm: z.string().nullable().optional(),
    })
    .optional(),
  warRoom: z.string().nullable().optional(),
  checkpoints: z.array(z.object({ at: z.string(), gate: z.string() })).optional(),
});

/** slug → schema. Single source for both the registry and the composers. */
export const LAUNCH_SOCIAL_SCHEMAS = {
  "naming-generator": namingOutputSchema,
  "social-copy-engine": socialCopyOutputSchema,
  "content-calendar-strategist": contentCalendarOutputSchema,
  "launch-timeline-planner": launchTimelineOutputSchema,
} as const;
