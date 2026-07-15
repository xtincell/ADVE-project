/**
 * ADR-0155 — Canal feedback / bug des testeurs.
 * `submit` : governedProcedure (testeur connecté, sans requireOperator).
 * `triage`/`list`/`unresolvedCount` : opérateur (inbox console).
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { submitFeedback, triageFeedback, listFeedback, unresolvedFeedbackCount } from "@/server/services/tester-feedback";

export const feedbackRouter = createTRPCRouter({
  submit: governedProcedure({
    kind: "SUBMIT_FEEDBACK",
    inputSchema: z.object({
      kind: z.enum(["BUG", "IDEA", "OTHER"]),
      message: z.string().min(3).max(4000),
      pageUrl: z.string().max(500).nullish(),
      userAgent: z.string().max(500).nullish(),
      email: z.string().email().max(200).nullish(),
    }),
    caller: "feedback:submit",
  }).mutation(async ({ input, ctx }) => {
    const user = ctx.session!.user;
    const operatorId = (user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
    const fb = await submitFeedback({
      userId: user.id,
      operatorId,
      email: input.email ?? user.email ?? null,
      kind: input.kind,
      message: input.message,
      pageUrl: input.pageUrl ?? null,
      userAgent: input.userAgent ?? null,
    });
    return { id: fb.id, status: fb.status };
  }),

  triage: governedProcedure({
    kind: "TRIAGE_FEEDBACK",
    requireOperator: true,
    inputSchema: z.object({ id: z.string().min(1), status: z.enum(["NEW", "TRIAGED", "RESOLVED"]) }),
    caller: "feedback:triage",
  }).mutation(async ({ input, ctx }) => {
    return triageFeedback({ id: input.id, status: input.status, reviewedBy: ctx.session?.user?.id ?? "operator" });
  }),

  list: operatorProcedure
    .input(z.object({ status: z.enum(["NEW", "TRIAGED", "RESOLVED"]).nullish() }).optional())
    .query(async ({ input }) => {
      const rows = await listFeedback({ status: input?.status ?? undefined });
      return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null }));
    }),

  unresolvedCount: operatorProcedure.query(async () => ({ count: await unresolvedFeedbackCount() })),
});
