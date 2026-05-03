/**
 * Anubis tRPC router — Phase 15 (ADR-0020, full activation Comms).
 *
 * Procédures :
 *   Mutations  — draftCommsPlan, broadcast, schedule, cancel, buyAdInventory,
 *                registerCredential, revokeCredential, testChannel
 *   Queries    — dashboard, listCredentials, listCommsPlans, listBroadcastJobs,
 *                segmentAudience, trackDelivery, fetchDeliveryReport
 *
 * Sécurité : `listCredentials` et autres queries credentials NE retournent JAMAIS
 * `config` (les secrets ne quittent jamais le server). Cf. ADR-0021.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import * as anubis from "@/server/services/anubis";

async function resolveOperatorId(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { operatorId: true },
  });
  if (!user?.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User has no operatorId" });
  }
  return user.operatorId;
}

/**
 * Phase 16 / ADR-0028 — mapping serverName → env var name pour le client_id OAuth.
 * Convention : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.
 * Exemples : `higgsfield` → `HIGGSFIELD_OAUTH_CLIENT_ID`.
 */
function oauthClientIdEnvKey(serverName: string): string {
  return `${serverName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_OAUTH_CLIENT_ID`;
}

function resolveOAuthClientId(serverName: string): string | undefined {
  return process.env[oauthClientIdEnvKey(serverName)];
}

export const anubisRouter = createTRPCRouter({
  // ── Mutations Comms ──────────────────────────────────────────────

  draftCommsPlan: operatorProcedure
    .input(z.object({ strategyId: z.string(), audience: z.string().optional() }))
    .mutation(async ({ input }) => anubis.draftCommsPlan(input)),

  broadcastMessage: operatorProcedure
    .input(
      z.object({
        commsPlanId: z.string(),
        channels: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.broadcastMessage({ ...input, operatorId });
    }),

  scheduleBroadcast: operatorProcedure
    .input(z.object({ commsPlanId: z.string(), scheduledFor: z.string() }))
    .mutation(async ({ input }) => anubis.scheduleBroadcast(input)),

  cancelBroadcast: operatorProcedure
    .input(z.object({ broadcastJobId: z.string() }))
    .mutation(async ({ input }) => anubis.cancelBroadcast(input)),

  buyAdInventory: operatorProcedure
    .input(
      z.object({
        campaignId: z.string(),
        provider: z.string().min(1),
        budgetUsd: z.number().positive(),
        adCopy: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.buyAdInventory({ ...input, operatorId });
    }),

  // ── Mutations Credentials Vault (cf. ADR-0021) ───────────────────

  registerCredential: operatorProcedure
    .input(
      z.object({
        connectorType: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.registerCredential({ ...input, operatorId });
    }),

  revokeCredential: operatorProcedure
    .input(z.object({ connectorType: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.revokeCredential({ ...input, operatorId });
    }),

  testChannel: operatorProcedure
    .input(z.object({ connectorType: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.testChannel({ ...input, operatorId });
    }),

  // ── Queries ──────────────────────────────────────────────────────

  segmentAudience: protectedProcedure
    .input(z.object({ rules: z.record(z.string(), z.unknown()) }))
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.segmentAudience({ rules: input.rules, operatorId });
    }),

  trackDelivery: protectedProcedure
    .input(z.object({ broadcastJobId: z.string() }))
    .query(async ({ input }) => anubis.trackDelivery(input)),

  fetchDeliveryReport: protectedProcedure
    .input(z.object({ broadcastJobId: z.string() }))
    .query(async ({ input }) => anubis.fetchDeliveryReport(input)),

  /** Liste les credentials de l'operator. **JAMAIS retourner `config`** (secrets). */
  listCredentials: protectedProcedure.query(async ({ ctx }) => {
    const operatorId = await resolveOperatorId(ctx.session.user.id);
    const creds = await db.externalConnector.findMany({
      where: { operatorId },
      select: {
        id: true,
        connectorType: true,
        status: true,
        lastSyncAt: true,
        signalCount: true,
        avgConfidence: true,
        createdAt: true,
        updatedAt: true,
        // ⚠️ JAMAIS `config` ici — sécurité ADR-0021
      },
      orderBy: { createdAt: "desc" },
    });
    return creds;
  }),

  listCommsPlans: protectedProcedure
    .input(z.object({ strategyId: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return db.commsPlan.findMany({
        where: {
          operatorId,
          ...(input?.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  listBroadcastJobs: protectedProcedure
    .input(z.object({ commsPlanId: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return db.broadcastJob.findMany({
        where: {
          operatorId,
          ...(input?.commsPlanId ? { commsPlanId: input.commsPlanId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }),

  // ── MCP bidirectionnel (ADR-0026) ──────────────────────────────────

  mcpListRegistry: protectedProcedure
    .input(z.object({ direction: z.enum(["INBOUND", "OUTBOUND"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return db.mcpRegistry.findMany({
        where: {
          operatorId,
          ...(input?.direction ? { direction: input.direction } : {}),
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  mcpRegisterServer: operatorProcedure
    .input(
      z.object({
        direction: z.enum(["INBOUND", "OUTBOUND"]),
        serverName: z.string().min(1),
        endpoint: z.string().url().optional(),
        credentialRef: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.mcpRegisterServer({ ...input, operatorId });
    }),

  mcpSyncTools: operatorProcedure
    .input(z.object({ serverName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.mcpSyncRegistry({ ...input, operatorId });
    }),

  mcpInvokeTool: operatorProcedure
    .input(
      z.object({
        serverName: z.string().min(1),
        toolName: z.string().min(1),
        inputs: z.record(z.string(), z.unknown()),
        intentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.mcpInvokeTool({ ...input, operatorId });
    }),

  mcpListInvocations: protectedProcedure
    .input(
      z.object({
        registryId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const registryIds = await db.mcpRegistry.findMany({
        where: {
          operatorId,
          ...(input?.registryId ? { id: input.registryId } : {}),
        },
        select: { id: true },
      });
      return db.mcpToolInvocation.findMany({
        where: {
          registryId: { in: registryIds.map((r) => r.id) },
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  mcpOutboundManifest: protectedProcedure.query(async () => {
    return anubis.mcpBuildAggregatedManifest();
  }),

  // ── OAuth 2.1 Device Flow (Phase 16, ADR-0028) ────────────────────
  // Premier connector device flow : Higgsfield (https://mcp.higgsfield.ai/mcp).
  // Pattern réutilisable pour tout futur MCP server OAuth.

  /**
   * Démarre le device flow pour un MCP server. Lit le clientId depuis env vars
   * server-side (jamais exposé côté client). Retourne verification_uri_complete
   * à présenter au user (open in new tab + countdown).
   */
  mcpOAuthDeviceFlowStart: operatorProcedure
    .input(
      z.object({
        serverName: z.string().min(1),
        scopes: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const clientId = resolveOAuthClientId(input.serverName);
      if (!clientId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `OAuth client_id not configured for ${input.serverName}. Set env ${oauthClientIdEnvKey(input.serverName)}.`,
        });
      }
      return anubis.mcpOAuthDeviceFlowStart({
        operatorId,
        serverName: input.serverName,
        clientId,
        scopes: input.scopes,
      });
    }),

  /**
   * Poll OAuth token endpoint. Caller (UI) doit boucler à `interval` secondes
   * tant que le résultat est { status: "PENDING" }. À OK, le credential est
   * persisté dans Credentials Vault et le tool peut être invoqué.
   */
  mcpOAuthDeviceFlowPoll: operatorProcedure
    .input(z.object({ serverName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return anubis.mcpOAuthDeviceFlowPoll({ operatorId, serverName: input.serverName });
    }),

  // ── Notification templates CRUD (ADR-0025) ────────────────────────

  templatesList: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return db.notificationTemplate.findMany({
        where: {
          OR: [{ operatorId }, { operatorId: null }],
          ...(input?.category ? { category: input.category } : {}),
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  templatesUpsert: operatorProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
        subject: z.string().optional(),
        bodyHbs: z.string().min(1),
        bodyMjml: z.string().optional(),
        variables: z.record(z.string(), z.unknown()),
        category: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const variables = input.variables as Prisma.InputJsonValue;
      return db.notificationTemplate.upsert({
        where: { slug: input.slug },
        create: { ...input, variables, operatorId },
        update: { ...input, variables },
      });
    }),

  templatesDelete: operatorProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const tmpl = await db.notificationTemplate.findUnique({ where: { slug: input.slug } });
      if (!tmpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      if (tmpl.operatorId !== operatorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system or other-operator template" });
      }
      await db.notificationTemplate.delete({ where: { slug: input.slug } });
      return { slug: input.slug, deleted: true };
    }),

  /** Anubis dashboard — KPIs agrégés. */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const operatorId = await resolveOperatorId(ctx.session.user.id);
    const [
      activePlans,
      queuedJobs,
      sentLast30d,
      registeredCredentials,
      activeCredentials,
    ] = await Promise.all([
      db.commsPlan.count({ where: { operatorId, status: { in: ["DRAFT", "SCHEDULED", "ACTIVE"] } } }),
      db.broadcastJob.count({ where: { operatorId, status: { in: ["QUEUED", "SCHEDULED"] } } }),
      db.broadcastJob.count({
        where: {
          operatorId,
          status: "SENT",
          sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.externalConnector.count({ where: { operatorId } }),
      db.externalConnector.count({ where: { operatorId, status: "ACTIVE" } }),
    ]);
    return {
      operatorId,
      activePlans,
      queuedJobs,
      sentLast30d,
      registeredCredentials,
      activeCredentials,
      generatedAt: new Date().toISOString(),
    };
  }),
});
