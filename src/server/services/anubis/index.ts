/**
 * Anubis — public API + handlers.
 *
 * 7ème Neter actif. Comms governance : routing/scheduling/audience-targeting
 * des messages, broadcasts, ad campaigns, social posts, drops multi-canaux.
 *
 * Téléologie ADR-0011 §3 : KPI primaire = cost_per_superfan_recruited
 * (pas reach/CTR/CPM/CPC). Thot peut vetoer une campagne paid si projected
 * cost_per_superfan > 2× benchmark sectoriel.
 *
 * Architecture : Anubis délègue les envois externes aux services L3
 * existants (email pour transactionnel, oauth-integrations pour les ad
 * networks) et à Prisma pour la persistence (Notification, SocialPost,
 * CampaignAmplification). Pas de duplication d'algos.
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/server/services/email";
import { sendSms } from "@/server/services/sms-broadcast";
import { sendPush } from "@/server/services/notification-dispatcher";
import { getAdClient } from "@/server/services/oauth-integrations/ad-clients";
import { publishToSocial } from "@/server/services/social-publishing";
import {
  AnubisOAuthMissingError,
  assertAudienceValid,
  assertCostPerSuperfanFits,
  assertManipulationFitsMix,
  assertOAuthScopeActive,
} from "./governance";
import { emitAnubisEvent, recordAnubisCost } from "./events";
import type {
  BroadcastInput,
  BroadcastResult,
  DispatchMessageInput,
  DispatchMessageResult,
  LaunchAdCampaignInput,
  LaunchAdCampaignResult,
  PublishSocialInput,
  PublishSocialResult,
  ScheduleDropInput,
  ScheduleDropResult,
} from "./types";

export { manifest } from "./manifest";

const PROVIDER_LATENCY_BUDGET_MS = 4000;

// Cost estimates for cost-tracking (USD per send) — used for Thot capacity
// pre-check (`CHECK_CAPACITY` runs before the handler dispatches).
const CHANNEL_COST_USD: Record<string, number> = {
  EMAIL:           0.0008,
  SMS:             0.025,
  PUSH:            0.0001,
  IN_APP:          0,
  SOCIAL_INSTAGRAM: 0,
  SOCIAL_TIKTOK:    0,
  SOCIAL_LINKEDIN:  0,
  SOCIAL_FACEBOOK:  0,
  SOCIAL_TWITTER:   0,
  AD_META:         0,    // budget separate, not unit cost
  AD_GOOGLE:       0,
  AD_TIKTOK:       0,
  AD_X:            0,
};

function nowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// 1) DISPATCH MESSAGE — single-recipient
// ============================================================
export async function dispatchMessage(
  input: DispatchMessageInput,
): Promise<DispatchMessageResult> {
  await assertManipulationFitsMix(input.strategyId, input.manipulationMode);

  // Persist Notification (in-app/email/sms/push channels supported by enum)
  const channelEnum = ["IN_APP", "EMAIL", "SMS", "PUSH"].includes(input.channel)
    ? input.channel as "IN_APP" | "EMAIL" | "SMS" | "PUSH"
    : "IN_APP";
  const notif = await db.notification.create({
    data: {
      userId: input.userId,
      channel: channelEnum,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  });

  // External delivery (best-effort, par canal)
  let provider = "in_app";
  let delivered = true;
  if (input.channel === "EMAIL") {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const r = await sendEmail({
        to: user.email,
        subject: input.title,
        html: `<p>${input.body}</p>${input.link ? `<p><a href="${input.link}">Ouvrir</a></p>` : ""}`,
        text: `${input.body}${input.link ? `\n\n${input.link}` : ""}`,
        tag: input.tag,
      });
      provider = r.provider;
      delivered = r.ok;
    } else {
      delivered = false;
      provider = "missing_email";
    }
  } else if (input.channel === "SMS") {
    type UserContact = { phone: string | null } | null;
    const user = (await db.user.findUnique({
      where: { id: input.userId },
      select: { phone: true } as never,
    })) as UserContact;
    if (user?.phone) {
      const r = await sendSms({
        to: user.phone,
        body: `${input.title} — ${input.body}${input.link ? ` ${input.link}` : ""}`.slice(0, 320),
        tag: input.tag,
      });
      provider = r.provider;
      delivered = r.ok;
    } else {
      delivered = false;
      provider = "missing_phone";
    }
  } else if (input.channel === "PUSH") {
    type DeviceUser = { fcmDeviceToken: string | null } | null;
    const user = (await db.user.findUnique({
      where: { id: input.userId },
      select: { fcmDeviceToken: true } as never,
    })) as DeviceUser;
    if (user?.fcmDeviceToken) {
      const r = await sendPush({
        deviceToken: user.fcmDeviceToken,
        title: input.title,
        body: input.body,
        link: input.link,
      });
      provider = r.provider;
      delivered = r.ok;
    } else {
      delivered = false;
      provider = "missing_fcm_token";
    }
  }

  const cost = CHANNEL_COST_USD[input.channel] ?? 0;
  await recordAnubisCost(`anubis:dispatchMessage:${input.channel}`, cost, input.strategyId, input.userId);
  await emitAnubisEvent(null, "MESSAGE_DISPATCHED", {
    messageId: notif.id, channel: input.channel, provider, delivered,
  });

  return {
    messageId: notif.id,
    channel: input.channel,
    delivered,
    provider,
    costEstimateUsd: cost,
  };
}

// ============================================================
// 2) BROADCAST — fan-out to a cohort
// ============================================================
export async function broadcast(input: BroadcastInput): Promise<BroadcastResult> {
  await assertManipulationFitsMix(input.strategyId, input.manipulationMode);

  // Resolve cohort. ALL_USERS_OPERATOR is shorthand for all users sharing
  // the operator of this strategy.
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { operatorId: true },
  });
  if (!strategy?.operatorId) {
    return {
      broadcastId: nowId("anubis-bcast"),
      channel: input.channel,
      estimatedRecipients: 0,
      scheduled: false,
      costEstimateUsd: 0,
    };
  }

  const recipients = await db.user.findMany({
    where: { operatorId: strategy.operatorId, isDummy: false },
    select: { id: true },
    take: 5000, // hard cap to prevent runaway broadcasts
  });

  const broadcastId = nowId("anubis-bcast");
  const scheduledAt = input.scheduledAt ?? null;
  const isScheduled = scheduledAt != null && scheduledAt.getTime() > Date.now();

  // For non-scheduled broadcasts, persist Notifications immediately.
  if (!isScheduled) {
    const channelEnum = ["IN_APP", "EMAIL", "SMS", "PUSH"].includes(input.channel)
      ? input.channel as "IN_APP" | "EMAIL" | "SMS" | "PUSH"
      : "IN_APP";
    type Recipient = { id: string };
    await db.notification.createMany({
      data: (recipients as Recipient[]).map((r: Recipient) => ({
        userId: r.id,
        channel: channelEnum,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const totalCost = (CHANNEL_COST_USD[input.channel] ?? 0) * recipients.length;
  await recordAnubisCost(`anubis:broadcast:${input.channel}`, totalCost, input.strategyId);
  await emitAnubisEvent(null, "BROADCAST_SENT", {
    broadcastId, channel: input.channel, recipients: recipients.length, scheduled: isScheduled,
  });

  return {
    broadcastId,
    channel: input.channel,
    estimatedRecipients: recipients.length,
    scheduled: isScheduled,
    scheduledAt: scheduledAt ?? undefined,
    costEstimateUsd: totalCost,
  };
}

// ============================================================
// 3) LAUNCH AD CAMPAIGN — gates : OAuth + audience + KPI cost_per_superfan
//    + appel provider (Meta / Google / TikTok / X) via oauth-integrations
// ============================================================
export async function launchAdCampaign(
  input: LaunchAdCampaignInput,
  ctx: { operatorId: string; intentId: string },
): Promise<LaunchAdCampaignResult> {
  await assertManipulationFitsMix(input.strategyId, input.manipulationMode);
  assertAudienceValid(input);
  await assertOAuthScopeActive(ctx.operatorId, input.platform);
  const { projected, benchmark, ratio } = await assertCostPerSuperfanFits(input);

  const amplificationId = nowId("anubis-amp");
  const estimatedSuperfans = input.expectedSuperfans;

  // Call the provider client (Meta / Google / TikTok / X). The client is
  // resolved by platform, validates env credentials, calls the provider's
  // campaign-create endpoint, and returns externalCampaignId + reach.
  const adClient = getAdClient(input.platform);
  const launched = await adClient.createCampaign(ctx.operatorId, {
    strategyId: input.strategyId,
    amplificationId,
    budget: input.budget,
    currency: input.currency,
    durationDays: input.durationDays,
    audienceTargeting: input.audienceTargeting,
    creativeAssetVersionId: input.creativeAssetVersionId,
  });

  // Status mapping : provider PAUSED/PENDING_REVIEW → CampaignAmplification PLANNED
  // (operator must explicitly RESUME to flip RUNNING). Provider RUNNING → RUNNING.
  const persistedStatus = launched.status === "RUNNING" ? "RUNNING" : "PLANNED";

  await db.campaignAmplification.create({
    data: {
      id: amplificationId,
      campaignId: input.campaignId,
      platform: input.platform,
      budget: input.budget,
      currency: input.currency,
      status: persistedStatus,
      mediaType: "DIGITAL_AD",
      mediaCost: input.budget * 0.85,
      productionCost: 0,
      agencyFee: input.budget * 0.05,
      reach: launched.estimatedReach,
      metrics: {
        intentId: ctx.intentId,
        creativeAssetVersionId: input.creativeAssetVersionId,
        manipulationMode: input.manipulationMode,
        audienceTargeting: input.audienceTargeting,
        costPerSuperfanProjected: projected,
        costPerSuperfanBenchmark: benchmark,
        benchmarkRatio: ratio,
        durationDays: input.durationDays,
        expectedSuperfans: estimatedSuperfans,
        externalCampaignId: launched.externalCampaignId,
        billingReference: launched.billingReference,
        providerStatus: launched.status,
        providerEstimatedCpm: launched.estimatedCpm ?? null,
      } as never,
    },
  });

  await recordAnubisCost(
    `anubis:launchAdCampaign:${input.platform}`,
    input.budget * 0.001,  // gateway cost (provider call), not the campaign budget itself
    input.strategyId,
  );
  await emitAnubisEvent(ctx.intentId, "AD_CAMPAIGN_LAUNCHED", {
    amplificationId,
    platform: input.platform,
    externalCampaignId: launched.externalCampaignId,
    status: persistedStatus,
    benchmarkRatio: ratio,
  });

  return {
    amplificationId,
    platform: input.platform,
    status: persistedStatus,
    estimatedReach: launched.estimatedReach,
    estimatedSuperfans,
    costPerSuperfanProjected: projected,
    benchmarkRatio: ratio ?? 0,
  };
}

// ============================================================
// 4) PUBLISH SOCIAL — single post (immediate or scheduled)
// ============================================================
export async function publishSocial(input: PublishSocialInput): Promise<PublishSocialResult> {
  await assertManipulationFitsMix(input.strategyId, input.manipulationMode);

  const conn = await db.socialConnection.findUnique({
    where: { id: input.connectionId },
    select: { id: true, platform: true, accountId: true, status: true, strategyId: true },
  });
  if (!conn) {
    throw new AnubisOAuthMissingError(`SocialConnection:${input.connectionId}`);
  }
  if (conn.status !== "ACTIVE") {
    throw new AnubisOAuthMissingError(`SocialConnection ${input.connectionId} is ${conn.status}`);
  }
  if (conn.strategyId !== input.strategyId) {
    throw new AnubisOAuthMissingError("SocialConnection.strategyId mismatch");
  }

  const externalPostId = input.externalPostId ?? `anubis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const scheduledAt = input.scheduledAt ?? null;
  const isScheduled = scheduledAt != null && scheduledAt.getTime() > Date.now();

  // Resolve operatorId via strategy → for OAuth token lookup
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { operatorId: true },
  });

  // Provider call : push réellement vers le réseau social via social-publishing.
  // Si le post est scheduled → pas d'appel externe maintenant (drop-scheduler-worker
  // reprendra à scheduledAt). Si l'opérateur n'a pas de token actif → DB-only.
  let providerExternalId = externalPostId;
  if (!isScheduled && strategy?.operatorId) {
    try {
      const result = await publishToSocial({
        operatorId: strategy.operatorId,
        platform: conn.platform,
        accountId: conn.accountId,
        content: input.content,
        scheduledAt: undefined,
      });
      if (result.ok && result.externalPostId) {
        providerExternalId = result.externalPostId;
      }
    } catch {
      // Provider call failed — keep DB row, log via error-vault auto-capture.
    }
  }

  const post = await db.socialPost.create({
    data: {
      connectionId: input.connectionId,
      strategyId: input.strategyId,
      externalPostId: providerExternalId,
      content: input.content,
      publishedAt: isScheduled ? null : new Date(),
    },
  });

  await emitAnubisEvent(null, "SOCIAL_POST_PUBLISHED", {
    postId: post.id,
    externalPostId,
    platform: conn.platform,
    scheduled: isScheduled,
  });

  return {
    postId: post.id,
    externalPostId,
    platform: conn.platform,
    scheduled: isScheduled,
    scheduledAt: scheduledAt ?? undefined,
  };
}

// ============================================================
// 5) SCHEDULE DROP — coordinated multi-channel content drop
// ============================================================
export async function scheduleDrop(input: ScheduleDropInput): Promise<ScheduleDropResult> {
  await assertManipulationFitsMix(input.strategyId, input.manipulationMode);

  const dropId = nowId("anubis-drop");

  // Use Notification rows tagged with the dropId to materialise the
  // schedule. A future cron picks them up at scheduledAt and ships via the
  // appropriate channel handler. We pre-create one notification per channel
  // for the strategy owner so the drop is auditable in the admin console.
  const owner = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { userId: true },
  });
  if (!owner?.userId) {
    return { dropId, scheduledAt: input.scheduledAt, channelCount: 0, estimatedReach: 0 };
  }

  let estimatedReach = 0;
  for (const ch of input.channels) {
    const channelEnum = ["IN_APP", "EMAIL", "SMS", "PUSH"].includes(ch.channel)
      ? ch.channel as "IN_APP" | "EMAIL" | "SMS" | "PUSH"
      : "IN_APP";
    await db.notification.create({
      data: {
        userId: owner.userId,
        channel: channelEnum,
        title: `[DROP ${dropId}] ${ch.payload.title}`,
        body: ch.payload.body,
        link: ch.payload.link ?? null,
      },
    });
    estimatedReach += channelEnum === "IN_APP" ? 1 : 100; // rough scale
  }

  return {
    dropId,
    scheduledAt: input.scheduledAt,
    channelCount: input.channels.length,
    estimatedReach,
  };
}
