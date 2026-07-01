/**
 * MCP Billing Router — gestion des clés API + relevés d'usage (Vague 5).
 *
 * ADMIN only. La clé en clair n'est retournée qu'À LA CRÉATION (seul le hash
 * SHA-256 est persisté). Les relevés sont gelés à l'émission et réglés via
 * les payment providers existants (paymentRef).
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/lib/db";
import {
  createApiKey,
  getCurrentUsage,
  issueStatement,
  settleStatement,
  currentPeriod,
} from "@/server/services/anubis/mcp-billing";
/* lafusee:governed-active — router adminProcedure d'infra de facturation MCP (clés API, relevés gelés + paymentRef = audit propre) ; pas une mutation de marque gouvernée par mestor */

export const mcpBillingRouter = createTRPCRouter({
  // ── Clés ────────────────────────────────────────────────────────────

  createKey: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(80),
        server: z.string().min(1).max(60), // nom de serveur MCP ou "*"
        ratePerCallUsd: z.number().min(0).max(10).default(0.002),
        includedMonthlyCalls: z.number().int().min(0).max(1_000_000).default(100),
        ownerEmail: z.string().email().optional(),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // plaintextKey affichée UNE fois — jamais re-dérivable depuis le hash.
      return createApiKey(input);
    }),

  listKeys: adminProcedure.query(async () => {
    const period = currentPeriod();
    const keys = await db.mcpApiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        server: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        ratePerCallUsd: true,
        includedMonthlyCalls: true,
        ownerEmail: true,
        createdAt: true,
      },
    });
    const usages = await Promise.all(
      keys.map((k) => getCurrentUsage(k.id, period).catch(() => null)),
    );
    return keys.map((k, i) => ({ ...k, currentUsage: usages[i] }));
  }),

  setKeyActive: adminProcedure
    .input(z.object({ keyId: z.string(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      db.mcpApiKey.update({
        where: { id: input.keyId },
        data: { isActive: input.isActive },
      }),
    ),

  updateKeyBilling: adminProcedure
    .input(
      z.object({
        keyId: z.string(),
        ratePerCallUsd: z.number().min(0).max(10).optional(),
        includedMonthlyCalls: z.number().int().min(0).max(1_000_000).optional(),
        ownerEmail: z.string().email().nullable().optional(),
      }),
    )
    .mutation(({ input }) =>
      db.mcpApiKey.update({
        where: { id: input.keyId },
        data: {
          ...(input.ratePerCallUsd !== undefined ? { ratePerCallUsd: input.ratePerCallUsd } : {}),
          ...(input.includedMonthlyCalls !== undefined ? { includedMonthlyCalls: input.includedMonthlyCalls } : {}),
          ...(input.ownerEmail !== undefined ? { ownerEmail: input.ownerEmail } : {}),
        },
      }),
    ),

  // ── Usage live ──────────────────────────────────────────────────────

  getUsage: adminProcedure
    .input(z.object({ keyId: z.string(), period: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
    .query(({ input }) => getCurrentUsage(input.keyId, input.period)),

  recentCalls: adminProcedure
    .input(z.object({ keyId: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) =>
      db.mcpApiCall.findMany({
        where: input.keyId ? { apiKeyId: input.keyId } : {},
        orderBy: { createdAt: "desc" },
        take: input.limit,
      }),
    ),

  // ── Relevés ─────────────────────────────────────────────────────────

  issueStatement: adminProcedure
    .input(z.object({ keyId: z.string(), period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(({ input }) => issueStatement(input.keyId, input.period)),

  settleStatement: adminProcedure
    .input(z.object({ statementId: z.string(), paymentRef: z.string().min(3).max(120) }))
    .mutation(({ input }) => settleStatement(input.statementId, input.paymentRef)),

  listStatements: adminProcedure
    .input(z.object({ keyId: z.string().optional(), status: z.enum(["ISSUED", "SETTLED", "WAIVED"]).optional() }).optional())
    .query(({ input }) =>
      db.mcpUsageStatement.findMany({
        where: {
          ...(input?.keyId ? { apiKeyId: input.keyId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        include: { apiKey: { select: { name: true, server: true, ownerEmail: true } } },
        orderBy: [{ period: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
    ),
});
