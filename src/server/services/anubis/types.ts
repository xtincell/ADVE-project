/**
 * Anubis types — Comms governance (Phase 8+ activation).
 *
 * 7ème Neter, ADR-0011. Sous-système APOGEE = Comms (Ground Tier).
 * Téléologie : KPI primaire = `cost_per_superfan_recruited`, pas reach/CTR.
 */

import type { ManipulationMode } from "@/server/services/ptah/types";

export type AnubisKind =
  | "ANUBIS_DISPATCH_MESSAGE"
  | "ANUBIS_BROADCAST"
  | "ANUBIS_LAUNCH_AD_CAMPAIGN"
  | "ANUBIS_PUBLISH_SOCIAL"
  | "ANUBIS_SCHEDULE_DROP";

export const ANUBIS_KINDS: readonly AnubisKind[] = [
  "ANUBIS_DISPATCH_MESSAGE",
  "ANUBIS_BROADCAST",
  "ANUBIS_LAUNCH_AD_CAMPAIGN",
  "ANUBIS_PUBLISH_SOCIAL",
  "ANUBIS_SCHEDULE_DROP",
] as const;

export type CommsChannel =
  | "EMAIL"
  | "SMS"
  | "PUSH"
  | "IN_APP"
  | "SOCIAL_INSTAGRAM"
  | "SOCIAL_TIKTOK"
  | "SOCIAL_LINKEDIN"
  | "SOCIAL_FACEBOOK"
  | "SOCIAL_TWITTER"
  | "AD_META"
  | "AD_GOOGLE"
  | "AD_TIKTOK"
  | "AD_X";

export const COMMS_CHANNELS: readonly CommsChannel[] = [
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
  "SOCIAL_INSTAGRAM",
  "SOCIAL_TIKTOK",
  "SOCIAL_LINKEDIN",
  "SOCIAL_FACEBOOK",
  "SOCIAL_TWITTER",
  "AD_META",
  "AD_GOOGLE",
  "AD_TIKTOK",
  "AD_X",
] as const;

// ============================================================
// 1) DispatchMessage — un message individuel sur un canal
// ============================================================
export interface DispatchMessageInput {
  strategyId: string;
  userId: string;
  channel: CommsChannel;
  title: string;
  body: string;
  link?: string;
  manipulationMode: ManipulationMode;
  /** Tag for threading (e.g. "founder-digest", "mission-deadline"). */
  tag?: string;
}

export interface DispatchMessageResult {
  messageId: string;
  channel: CommsChannel;
  delivered: boolean;
  /** Provider used (resend, sendgrid, twilio, fcm, log). */
  provider: string;
  costEstimateUsd: number;
}

// ============================================================
// 2) Broadcast — fan-out to a cohort
// ============================================================
export interface BroadcastInput {
  strategyId: string;
  /** Cohort id (Recommendation.targetSegment) or "ALL_USERS_OPERATOR" */
  cohortKey: string;
  channel: CommsChannel;
  title: string;
  body: string;
  link?: string;
  manipulationMode: ManipulationMode;
  /** Whether the broadcast respects NotificationPreference.quiet hours. */
  respectQuietHours?: boolean;
  /** Schedule for later (ISO timestamp); null = immediate. */
  scheduledAt?: Date;
}

export interface BroadcastResult {
  broadcastId: string;
  channel: CommsChannel;
  estimatedRecipients: number;
  scheduled: boolean;
  scheduledAt?: Date;
  costEstimateUsd: number;
}

// ============================================================
// 3) LaunchAdCampaign — Meta/Google/TikTok/X ads
// ============================================================
export interface LaunchAdCampaignInput {
  strategyId: string;
  campaignId: string;
  platform: "META_ADS" | "GOOGLE_ADS" | "TIKTOK_ADS" | "X_ADS";
  budget: number;
  currency: string;
  durationDays: number;
  manipulationMode: ManipulationMode;
  audienceTargeting: {
    countries: readonly string[];
    ageRange?: readonly [number, number];
    interests?: readonly string[];
    customSegmentId?: string;
  };
  creativeAssetVersionId: string;
  /** Expected superfans recruited (used to compute cost_per_superfan baseline). */
  expectedSuperfans: number;
  /** Sectoral benchmark for cost_per_superfan_recruited (Thot vetoes if 2× above). */
  benchmarkCostPerSuperfan?: number;
}

export interface LaunchAdCampaignResult {
  amplificationId: string;
  platform: string;
  status: "PLANNED" | "RUNNING" | "REJECTED";
  estimatedReach: number;
  estimatedSuperfans: number;
  costPerSuperfanProjected: number;
  benchmarkRatio: number;
}

// ============================================================
// 4) PublishSocial — single social post
// ============================================================
export interface PublishSocialInput {
  strategyId: string;
  connectionId: string;
  externalPostId?: string;
  content: string;
  mediaAssetVersionId?: string;
  manipulationMode: ManipulationMode;
  /** Schedule for later (ISO timestamp); null = immediate. */
  scheduledAt?: Date;
}

export interface PublishSocialResult {
  postId: string;
  externalPostId: string;
  platform: string;
  scheduled: boolean;
  scheduledAt?: Date;
}

// ============================================================
// 5) ScheduleDrop — coordinated multi-channel content drop
// ============================================================
export interface ScheduleDropInput {
  strategyId: string;
  campaignId: string;
  scheduledAt: Date;
  channels: readonly {
    channel: CommsChannel;
    payload: {
      title: string;
      body: string;
      link?: string;
      mediaAssetVersionId?: string;
    };
  }[];
  manipulationMode: ManipulationMode;
}

export interface ScheduleDropResult {
  dropId: string;
  scheduledAt: Date;
  channelCount: number;
  estimatedReach: number;
}
