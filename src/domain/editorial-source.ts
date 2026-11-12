import { z } from "zod";

export const editorialSourceSchema = z.object({
  sourceId: z.string(), contentHash: z.string(), label: z.string(), edition: z.number().int(),
});

export const editorialPlanSchema = z.object({
  source: editorialSourceSchema, scope: z.array(z.string()), subjects: z.array(z.string()),
});

export const recordedPostSchema = z.object({
  externalPostId: z.string(), scheduledOrPublishedAt: z.string().datetime(), source: editorialSourceSchema,
});

export const recordedEditorialCalendarSchema = z.object({
  calendarRole: z.literal("EXTERNAL_SCHEDULE_SNAPSHOT"),
  reading: z.string(),
  sources: z.array(editorialSourceSchema),
  planning: z.array(editorialPlanSchema),
  posts: z.array(recordedPostSchema.extend({platform:z.string(), status:z.string(), caption:z.string()})),
});
