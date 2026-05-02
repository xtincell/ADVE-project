/**
 * Manifest — Anubis (Comms Ground #7) — full activation Phase 15.
 *
 * 7ème Neter actif (ADR-0020, supersedes ADR-0018). Sous-système APOGEE = Comms (Ground Tier).
 *
 * Anubis orchestre broadcast multi-canal, ad networks (Meta/Google/X/TikTok),
 * email/SMS (Mailgun/Twilio), notification center persistent, et Credentials Vault
 * (cf. ADR-0021).
 *
 * Cf. PANTHEON.md §2.7, ADR-0011 + ADR-0020 + ADR-0021.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

export const manifest = defineManifest({
  service: "anubis",
  // Phase 13 R5 a établi le pattern Neter-as-governor (cf. intent-kinds.ts). Mestor
  // reste dispatcher unique via mestor.emitIntent ; le governor narratif désigne
  // le Neter sous tutelle pour audit/observability.
  governor: "ANUBIS",
  version: "1.0.0",
  acceptsIntents: [
    "ANUBIS_DRAFT_COMMS_PLAN",
    "ANUBIS_BROADCAST_MESSAGE",
    "ANUBIS_BUY_AD_INVENTORY",
    "ANUBIS_SEGMENT_AUDIENCE",
    "ANUBIS_TRACK_DELIVERY",
    "ANUBIS_REGISTER_CREDENTIAL",
    "ANUBIS_REVOKE_CREDENTIAL",
    "ANUBIS_TEST_CHANNEL",
    "ANUBIS_SCHEDULE_BROADCAST",
    "ANUBIS_CANCEL_BROADCAST",
    "ANUBIS_FETCH_DELIVERY_REPORT",
    "ANUBIS_PUSH_NOTIFICATION",
    "ANUBIS_REGISTER_PUSH_SUBSCRIPTION",
    "ANUBIS_RENDER_TEMPLATE",
    "ANUBIS_RUN_DIGEST",
    "ANUBIS_MCP_INVOKE_TOOL",
    "ANUBIS_MCP_SYNC_REGISTRY",
    "ANUBIS_MCP_REGISTER_SERVER",
  ],
  emits: [
    "BROADCAST_QUEUED",
    "BROADCAST_SENT",
    "BROADCAST_FAILED",
    "BROADCAST_DEFERRED",
    "AD_INVENTORY_PURCHASED",
    "CREDENTIAL_REGISTERED",
    "CREDENTIAL_REVOKED",
    "DELIVERY_TRACKED",
    "NOTIFICATION_PUSHED",
    "DIGEST_SENT",
    "MCP_TOOL_INVOKED",
    "MCP_SERVER_REGISTERED",
  ],
  capabilities: [
    {
      name: "draftCommsPlan",
      inputSchema: z.object({
        strategyId: StringId,
        audience: z.string().optional(),
      }),
      outputSchema: z.object({
        placeholder: z.string(),
        status: z.enum(["DRAFT", "DORMANT_PRE_RESERVED"]),
        adrRefs: z.array(z.string()),
        scaffoldedAt: z.string(),
        channels: z.array(z.string()).optional(),
        commsPlanId: z.string().optional(),
      }),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 2000,
      idempotent: false,
    },
    {
      name: "broadcastMessage",
      inputSchema: z.object({
        commsPlanId: StringId,
        channels: z.array(z.string().min(1)),
        operatorId: StringId,
      }),
      outputSchema: z.union([
        z.object({
          status: z.enum(["QUEUED", "SENDING"]),
          broadcastJobId: z.string(),
          jobsCreated: z.array(z.object({ channel: z.string(), jobId: z.string() })),
        }),
        z.object({
          status: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
          connectorType: z.string(),
          configureUrl: z.string(),
          reason: z.string(),
        }),
      ]),
      sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 30000,
      idempotent: false,
    },
    {
      name: "buyAdInventory",
      inputSchema: z.object({
        campaignId: StringId,
        provider: z.string().min(1),
        budgetUsd: z.number().positive(),
        adCopy: z.string().min(1),
        operatorId: StringId,
      }),
      outputSchema: z.union([
        z.object({
          status: z.enum(["PURCHASED", "QUEUED"]),
          providerTaskId: z.string(),
          providerName: z.string(),
          estimatedReach: z.string(),
        }),
        z.object({
          status: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
          connectorType: z.string(),
          configureUrl: z.string(),
          reason: z.string(),
        }),
      ]),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 15000,
      idempotent: false,
    },
    {
      name: "segmentAudience",
      inputSchema: z.object({
        rules: z.record(z.string(), z.unknown()),
        operatorId: StringId,
      }),
      outputSchema: z.object({
        estimatedCount: z.number().int().nonnegative(),
        segmentHash: z.string(),
        appliedRules: z.record(z.string(), z.unknown()),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 2000,
      idempotent: true,
    },
    {
      name: "trackDelivery",
      inputSchema: z.object({ broadcastJobId: StringId }),
      outputSchema: z.object({
        broadcastJobId: z.string(),
        total: z.number(),
        delivered: z.number(),
        bounced: z.number(),
        opened: z.number(),
        clicked: z.number(),
        rawMetrics: z.record(z.string(), z.unknown()).optional(),
      }),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 3000,
      idempotent: true,
    },
    {
      name: "registerCredential",
      inputSchema: z.object({
        operatorId: StringId,
        connectorType: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
      }),
      outputSchema: z.object({
        externalConnectorId: z.string(),
        connectorType: z.string(),
        status: z.enum(["ACTIVE", "INACTIVE"]),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 1000,
      idempotent: false,
    },
    {
      name: "revokeCredential",
      inputSchema: z.object({
        operatorId: StringId,
        connectorType: z.string().min(1),
      }),
      outputSchema: z.object({
        externalConnectorId: z.string().nullable(),
        previousStatus: z.string().nullable(),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 500,
      idempotent: true,
    },
    {
      name: "testChannel",
      inputSchema: z.object({
        operatorId: StringId,
        connectorType: z.string().min(1),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        connectorType: z.string(),
        reason: z.string().optional(),
      }),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      idempotent: true,
    },
    {
      name: "scheduleBroadcast",
      inputSchema: z.object({
        commsPlanId: StringId,
        scheduledFor: z.string(),
      }),
      outputSchema: z.object({
        commsPlanId: z.string(),
        scheduledFor: z.string(),
        status: z.literal("SCHEDULED"),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 1000,
      idempotent: false,
    },
    {
      name: "cancelBroadcast",
      inputSchema: z.object({ broadcastJobId: StringId }),
      outputSchema: z.object({
        broadcastJobId: z.string(),
        previousStatus: z.string(),
        status: z.literal("CANCELLED"),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 500,
      idempotent: true,
    },
    {
      name: "fetchDeliveryReport",
      inputSchema: z.object({ broadcastJobId: StringId }),
      outputSchema: z.union([
        z.object({
          status: z.literal("OK"),
          broadcastJobId: z.string(),
          total: z.number(),
          delivered: z.number(),
          bounced: z.number(),
          opened: z.number(),
          clicked: z.number(),
          rawMetrics: z.record(z.string(), z.unknown()).optional(),
        }),
        z.object({
          status: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
          connectorType: z.string(),
          configureUrl: z.string(),
          reason: z.string(),
        }),
      ]),
      sideEffects: ["EXTERNAL_API", "DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 10000,
      idempotent: true,
    },
    // ── Notification real-time + MCP bidirectionnel (ADR-0025, ADR-0026) ──
    {
      name: "pushNotification",
      inputSchema: z.object({
        userId: StringId,
        type: z.string().default("SYSTEM"),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
        title: z.string().min(1),
        body: z.string().min(1),
        link: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        operatorId: z.string().optional(),
        channels: z.array(z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"])).default(["IN_APP"]),
      }),
      outputSchema: z.object({
        notificationId: z.string(),
        delivered: z.array(z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"])),
        deferred: z.array(z.string()),
        suppressedByQuiet: z.boolean(),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 500,
      idempotent: false,
    },
    {
      name: "registerPushSubscription",
      inputSchema: z.object({
        userId: StringId,
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        userAgent: z.string().optional(),
      }),
      outputSchema: z.object({
        pushSubscriptionId: z.string(),
        endpoint: z.string(),
        isActive: z.boolean(),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 500,
      idempotent: true,
    },
    {
      name: "renderTemplate",
      inputSchema: z.object({
        slug: z.string().min(1),
        vars: z.record(z.unknown()),
      }),
      outputSchema: z.object({
        slug: z.string(),
        subject: z.string().optional(),
        html: z.string().optional(),
        text: z.string(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 200,
      idempotent: true,
    },
    {
      name: "runDigest",
      inputSchema: z.object({
        frequency: z.enum(["DAILY", "WEEKLY"]),
      }),
      outputSchema: z.object({
        usersProcessed: z.number().int().nonnegative(),
        digestsSent: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
      }),
      sideEffects: ["DB_READ", "DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "B",
      latencyBudgetMs: 60000,
      idempotent: false,
    },
    {
      name: "mcpInvokeTool",
      inputSchema: z.object({
        operatorId: StringId,
        serverName: z.string().min(1),
        toolName: z.string().min(1),
        inputs: z.record(z.unknown()),
        intentId: z.string().optional(),
      }),
      outputSchema: z.union([
        z.object({
          status: z.literal("OK"),
          invocationId: z.string(),
          output: z.unknown(),
          durationMs: z.number().int().nonnegative(),
        }),
        z.object({
          status: z.literal("FAILED"),
          invocationId: z.string(),
          errorMessage: z.string(),
        }),
        z.object({
          status: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
          connectorType: z.string(),
          configureUrl: z.string(),
          reason: z.string(),
        }),
      ]),
      sideEffects: ["DB_WRITE", "EXTERNAL_API", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 10000,
      idempotent: false,
    },
    {
      name: "mcpSyncRegistry",
      inputSchema: z.object({
        operatorId: StringId,
        serverName: z.string().min(1),
      }),
      outputSchema: z.union([
        z.object({
          status: z.literal("OK"),
          serverName: z.string(),
          toolCount: z.number().int().nonnegative(),
        }),
        z.object({
          status: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
          connectorType: z.string(),
          configureUrl: z.string(),
          reason: z.string(),
        }),
      ]),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      idempotent: true,
    },
    {
      name: "mcpRegisterServer",
      inputSchema: z.object({
        operatorId: StringId,
        direction: z.enum(["INBOUND", "OUTBOUND"]),
        serverName: z.string().min(1),
        endpoint: z.string().url().optional(),
        credentialRef: z.string().optional(),
      }),
      outputSchema: z.object({
        registryId: z.string(),
        serverName: z.string(),
        direction: z.enum(["INBOUND", "OUTBOUND"]),
        status: z.string(),
      }),
      sideEffects: ["DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 1000,
      idempotent: false,
    },
  ],
  dependencies: [
    "email",
    "advertis-connectors",
    "oauth-integrations",
    "financial-brain",
    "nsp",
  ],
  docs: {
    summary:
      "Master of Comms (Ground Tier #7). Orchestre broadcast multi-canal, ad networks (Meta/Google/X/TikTok), email/SMS (Mailgun/Twilio), notification center persistent, Credentials Vault (ADR-0021). Provider façades feature-flagged : retournent DEFERRED_AWAITING_CREDENTIALS si pas de creds.",
  },
  // Comms alimente la mission via diffusion qui touche la masse audience.
  // Les superfans recrutés via campagnes Anubis convertissent en devotion ladder.
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
