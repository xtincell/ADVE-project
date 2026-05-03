/**
 * Anubis — Comms full activation handlers (Phase 15, ADR-0020).
 *
 * 7ème Neter actif. Cap APOGEE = 7 atteint.
 *
 * Anubis orchestre :
 *   - Plan comms (CommsPlan) + broadcasts persistants (BroadcastJob)
 *   - Ad networks externes via providers façades feature-flagged (cf. ADR-0021)
 *   - Credentials Vault — UI back-office /console/anubis/credentials
 *   - Notification center persistent (model Notification existant — extension)
 *
 * Cf. PANTHEON.md §2.7, ADR-0011 + ADR-0020.
 */

import { db } from "@/lib/db";
import { createHash } from "node:crypto";
import {
  assertBroadcastJobExists,
  assertCommsPlanExists,
} from "./governance";
import { credentialVault, deferredCredentials } from "./credential-vault";
import { getProvider } from "./providers";
import type {
  AnubisAudienceSegment,
  AnubisBroadcastCancelled,
  AnubisBroadcastMessagePayload,
  AnubisBroadcastMessageResult,
  AnubisBuyAdInventoryPayload,
  AnubisBuyAdInventoryResult,
  AnubisCancelBroadcastPayload,
  AnubisChannelTestResult,
  AnubisCommsPlanPlaceholder,
  AnubisCredentialRegistered,
  AnubisCredentialRevoked,
  AnubisDeliveryReport,
  AnubisDeliveryReportResult,
  AnubisDraftCommsPlanPayload,
  AnubisFetchDeliveryReportPayload,
  AnubisRegisterCredentialPayload,
  AnubisRevokeCredentialPayload,
  AnubisScheduledBroadcast,
  AnubisScheduleBroadcastPayload,
  AnubisSegmentAudiencePayload,
  AnubisTestChannelPayload,
  AnubisTrackDeliveryPayload,
} from "./types";

export { manifest } from "./manifest";

// ── Notification real-time + MCP bidirectionnel handlers (ADR-0025, ADR-0026) ──
export {
  pushNotification,
  registerPushSubscription,
} from "./notifications";
export { renderTemplate, TemplateNotFoundError } from "./templates";
export { runDigest } from "./digest-scheduler";
export {
  invokeExternalTool as mcpInvokeTool,
  syncRegistry as mcpSyncRegistry,
  registerServer as mcpRegisterServer,
} from "./mcp-client";
export {
  loadAllServers as mcpLoadAllServers,
  buildAggregatedManifest as mcpBuildAggregatedManifest,
  dispatchTool as mcpDispatchTool,
} from "./mcp-server";

// Default channel set when CommsPlan doesn't specify.
const DEFAULT_CHANNELS = ["email", "in-app"] as const;

// ─── 1. draftCommsPlan (Phase 13 compat + Phase 15 enrichment) ────────────

export async function draftCommsPlan(
  payload: AnubisDraftCommsPlanPayload,
): Promise<AnubisCommsPlanPlaceholder> {
  const strategy = await db.strategy.findUnique({
    where: { id: payload.strategyId },
    select: { id: true, name: true },
  });

  // Phase 15+ : real draft persistance possible. Pour Phase 15 baseline on
  // ne crée pas le CommsPlan automatiquement (caller doit appeler une
  // mutation dédiée). Le draft retourné est juste la proposition.
  if (strategy) {
    const channels = [...DEFAULT_CHANNELS];
    return {
      placeholder: payload.audience
        ? `Plan comms ${payload.audience} pour « ${strategy.name} » — ${channels.length} canaux proposés. ADRs: ADR-0011 + ADR-0020.`
        : `Plan comms générique pour « ${strategy.name} » — ${channels.length} canaux proposés. ADRs: ADR-0011 + ADR-0020.`,
      status: "DRAFT",
      adrRefs: ["ADR-0011", "ADR-0020"],
      scaffoldedAt: new Date().toISOString(),
      channels,
    };
  }

  // Back-compat Phase 13 : strategy absente → dormant placeholder.
  return {
    placeholder: payload.audience
      ? `Plan comms ${payload.audience} — strategy non trouvée, placeholder dormant. Cf. ADR-0011 + ADR-0020.`
      : "Plan comms — strategy non trouvée, placeholder dormant. Cf. ADR-0011 + ADR-0020.",
    status: "DORMANT_PRE_RESERVED",
    adrRefs: ["ADR-0011", "ADR-0020"],
    scaffoldedAt: new Date().toISOString(),
  };
}

// ─── 2. broadcastMessage ──────────────────────────────────────────────────

export async function broadcastMessage(
  payload: AnubisBroadcastMessagePayload,
): Promise<AnubisBroadcastMessageResult> {
  await assertCommsPlanExists(payload.commsPlanId);

  const jobsCreated: { channel: string; jobId: string }[] = [];
  let firstDeferred: ReturnType<typeof deferredCredentials> | null = null;

  for (const channel of payload.channels) {
    const provider = getProvider(channel);
    if (provider) {
      const cred = await credentialVault.get(payload.operatorId, channel);
      if (!cred) {
        if (!firstDeferred) firstDeferred = deferredCredentials(channel);
        continue;
      }
    }
    const job = await db.broadcastJob.create({
      data: {
        commsPlanId: payload.commsPlanId,
        channel,
        payload: {} as object,
        status: "QUEUED",
        operatorId: payload.operatorId,
      },
    });
    jobsCreated.push({ channel, jobId: job.id });
  }

  if (jobsCreated.length === 0 && firstDeferred) {
    return firstDeferred;
  }

  return {
    status: "QUEUED",
    broadcastJobId: jobsCreated[0]?.jobId ?? "",
    jobsCreated,
  };
}

// ─── 3. buyAdInventory ────────────────────────────────────────────────────

export async function buyAdInventory(
  payload: AnubisBuyAdInventoryPayload,
): Promise<AnubisBuyAdInventoryResult> {
  const provider = getProvider(payload.provider);
  if (!provider) {
    return deferredCredentials(payload.provider, `Unknown provider ${payload.provider}`);
  }

  const result = await provider.send(payload.operatorId, {
    content: payload.adCopy,
    target: { campaignId: payload.campaignId },
    budgetUsd: payload.budgetUsd,
  });

  if (result.status === "DEFERRED_AWAITING_CREDENTIALS") {
    return result;
  }

  return {
    status: result.status === "SENT" ? "PURCHASED" : "QUEUED",
    providerTaskId: result.providerTaskId,
    providerName: result.providerName,
    estimatedReach: result.estimatedReach ?? "unknown",
  };
}

// ─── 4. segmentAudience ───────────────────────────────────────────────────

export async function segmentAudience(
  payload: AnubisSegmentAudiencePayload,
): Promise<AnubisAudienceSegment> {
  const segmentHash = createHash("sha256")
    .update(JSON.stringify(payload.rules))
    .digest("hex")
    .slice(0, 16);

  // Phase 15 baseline : count via NotificationPreference users matching basic
  // demographics (in real impl, would query CRM/Audience model).
  const totalUsers = await db.notificationPreference.count();
  // Apply naive sampling factor based on rule count (mock).
  const ruleCount = Object.keys(payload.rules).length;
  const samplingFactor = Math.max(0.05, 1 - ruleCount * 0.1);
  const estimatedCount = Math.floor(totalUsers * samplingFactor);

  return {
    estimatedCount,
    segmentHash,
    appliedRules: payload.rules,
  };
}

// ─── 5. trackDelivery ─────────────────────────────────────────────────────

export async function trackDelivery(
  payload: AnubisTrackDeliveryPayload,
): Promise<AnubisDeliveryReport> {
  const job = await db.broadcastJob.findUnique({
    where: { id: payload.broadcastJobId },
  });
  if (!job) {
    throw new Error(`BroadcastJob ${payload.broadcastJobId} not found`);
  }

  // Read existing metrics if peuplées par un fetchDeliveryReport antérieur.
  const metrics = (job.metrics ?? {}) as Record<string, number>;
  return {
    broadcastJobId: job.id,
    total: metrics.total ?? 0,
    delivered: metrics.delivered ?? 0,
    bounced: metrics.bounced ?? 0,
    opened: metrics.opened ?? 0,
    clicked: metrics.clicked ?? 0,
    rawMetrics: (job.metrics ?? {}) as Record<string, unknown>,
  };
}

// ─── 6. registerCredential ────────────────────────────────────────────────

export async function registerCredential(
  payload: AnubisRegisterCredentialPayload,
): Promise<AnubisCredentialRegistered> {
  const cred = await credentialVault.register(
    payload.operatorId,
    payload.connectorType,
    payload.config,
    false, // status INACTIVE — operator doit appeler testChannel pour activer
  );
  return {
    externalConnectorId: cred.id,
    connectorType: cred.connectorType,
    status: cred.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
  };
}

// ─── 7. revokeCredential ──────────────────────────────────────────────────

export async function revokeCredential(
  payload: AnubisRevokeCredentialPayload,
): Promise<AnubisCredentialRevoked> {
  const result = await credentialVault.revoke(payload.operatorId, payload.connectorType);
  return {
    externalConnectorId: result.id,
    previousStatus: result.previousStatus,
  };
}

// ─── 8. testChannel ───────────────────────────────────────────────────────

export async function testChannel(
  payload: AnubisTestChannelPayload,
): Promise<AnubisChannelTestResult> {
  const provider = getProvider(payload.connectorType);
  if (!provider) {
    return {
      success: false,
      connectorType: payload.connectorType,
      reason: `Unknown provider ${payload.connectorType}`,
    };
  }
  const result = await provider.testConnection(payload.operatorId);
  if (result.success) {
    await credentialVault.markActive(payload.operatorId, payload.connectorType);
  }
  return {
    success: result.success,
    connectorType: payload.connectorType,
    reason: result.reason,
  };
}

// ─── 9. scheduleBroadcast ─────────────────────────────────────────────────

export async function scheduleBroadcast(
  payload: AnubisScheduleBroadcastPayload,
): Promise<AnubisScheduledBroadcast> {
  await assertCommsPlanExists(payload.commsPlanId);
  await db.commsPlan.update({
    where: { id: payload.commsPlanId },
    data: {
      status: "SCHEDULED",
      scheduledFor: new Date(payload.scheduledFor),
    },
  });
  return {
    commsPlanId: payload.commsPlanId,
    scheduledFor: payload.scheduledFor,
    status: "SCHEDULED",
  };
}

// ─── 10. cancelBroadcast ──────────────────────────────────────────────────

export async function cancelBroadcast(
  payload: AnubisCancelBroadcastPayload,
): Promise<AnubisBroadcastCancelled> {
  await assertBroadcastJobExists(payload.broadcastJobId);
  const job = await db.broadcastJob.update({
    where: { id: payload.broadcastJobId },
    data: { status: "CANCELLED" },
  });
  return {
    broadcastJobId: payload.broadcastJobId,
    previousStatus: job.status,
    status: "CANCELLED",
  };
}

// ─── 11. fetchDeliveryReport ──────────────────────────────────────────────

export async function fetchDeliveryReport(
  payload: AnubisFetchDeliveryReportPayload,
): Promise<AnubisDeliveryReportResult> {
  const job = await db.broadcastJob.findUnique({
    where: { id: payload.broadcastJobId },
  });
  if (!job) {
    throw new Error(`BroadcastJob ${payload.broadcastJobId} not found`);
  }

  const provider = getProvider(job.channel);
  if (!provider) {
    // Channel sans provider (in-app par exemple) — pas de report externe.
    return {
      status: "OK" as const,
      broadcastJobId: job.id,
      total: 0,
      delivered: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
    };
  }

  if (!job.providerTaskId) {
    return deferredCredentials(job.channel, "broadcast not yet sent (no providerTaskId)");
  }

  const report = await provider.fetchReport(job.operatorId, job.providerTaskId);
  if (report.status === "DEFERRED_AWAITING_CREDENTIALS") {
    return report;
  }

  // Persist metrics back into BroadcastJob.
  await db.broadcastJob.update({
    where: { id: job.id },
    data: {
      metrics: {
        total: report.total,
        delivered: report.delivered,
        bounced: report.bounced,
        opened: report.opened,
        clicked: report.clicked,
      },
    },
  });

  return {
    status: "OK",
    broadcastJobId: job.id,
    total: report.total,
    delivered: report.delivered,
    bounced: report.bounced,
    opened: report.opened,
    clicked: report.clicked,
    rawMetrics: report.rawMetrics,
  };
}
