/**
 * Mission Spawner — Creates Missions + Drivers from brief deliverables
 *
 * Each deliverable in the ParsedBrief becomes a Mission linked to a Driver.
 * Drivers are auto-created if they don't exist for the Strategy.
 */

import { db } from "@/lib/db";
import type { ParsedBrief, Deliverable } from "./types";
import {
  DELIVERABLE_CHANNEL_MAP,
  DELIVERABLE_PRIORITY,
  DELIVERABLE_SEQUENCE_MAP,
} from "./types";
import type { DriverChannel } from "@prisma/client";

// ── Resolve or create Driver ────────────────────────────────────────────────

async function resolveDriver(
  strategyId: string,
  deliverable: Deliverable,
): Promise<string> {
  const channelKey = deliverable.type.toUpperCase();
  const driverChannel = (DELIVERABLE_CHANNEL_MAP[channelKey] ?? "CUSTOM") as DriverChannel;

  // Look for existing driver on this strategy with same channel
  const existing = await db.driver.findFirst({
    where: {
      strategyId,
      channel: driverChannel,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  // Create a new driver for this channel
  const driver = await db.driver.create({
    data: {
      strategyId,
      channel: driverChannel,
      channelType: getChannelType(driverChannel),
      name: `${driverChannel} — Auto`,
      formatSpecs: { format: deliverable.format ?? "standard" },
      constraints: {},
      briefTemplate: {},
      qcCriteria: {},
      pillarPriority: {},
    },
  });

  return driver.id;
}

function getChannelType(channel: string): "DIGITAL" | "PHYSICAL" | "EXPERIENTIAL" {
  const digital = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WEBSITE", "VIDEO"];
  const experiential = ["EVENT"];
  if (digital.includes(channel)) return "DIGITAL";
  if (experiential.includes(channel)) return "EXPERIENTIAL";
  return "PHYSICAL";
}

// ── Build briefData for a mission ───────────────────────────────────────────

function buildMissionBriefData(brief: ParsedBrief, deliverable: Deliverable): Record<string, unknown> {
  return {
    brandName: brief.client.brandName,
    campaignName: brief.campaignName,
    campaignType: brief.campaignType,
    deliverable: {
      type: deliverable.type,
      description: deliverable.description,
      format: deliverable.format,
      quantity: deliverable.quantity,
    },
    context: {
      marketContext: brief.context.marketContext,
      keyMessage: brief.context.keyMessage,
      problemStatement: brief.context.problemStatement,
    },
    targeting: {
      corePrimary: brief.targeting.corePrimary,
      consumerInsight: brief.targeting.consumerInsight,
    },
    creative: {
      toneAndStyle: brief.creative.toneAndStyle,
      brandPersonality: brief.creative.brandPersonality,
    },
    objectives: brief.objectives,
  };
}

// ── Spawn missions ──────────────────────────────────────────────────────────

export interface SpawnResult {
  missionIds: string[];
  suggestedSequences: string[];
}

export async function spawnMissions(
  brief: ParsedBrief,
  strategyId: string,
  campaignId: string,
): Promise<SpawnResult> {
  const missionIds: string[] = [];
  const suggestedSequences = new Set<string>();

  // Always suggest CAMPAIGN-360 for multi-deliverable briefs
  if (brief.deliverables.length > 1) {
    suggestedSequences.add("CAMPAIGN-360");
  }

  for (const deliverable of brief.deliverables) {
    const driverId = await resolveDriver(strategyId, deliverable);
    const typeKey = deliverable.type.toUpperCase();
    const priority = DELIVERABLE_PRIORITY[typeKey] ?? 5;

    const mission = await db.mission.create({
      data: {
        title: `${brief.client.brandName} — ${deliverable.description}`,
        strategyId,
        campaignId,
        driverId,
        mode: "DISPATCH",
        description: `Livrable: ${deliverable.description}${deliverable.format ? ` (${deliverable.format})` : ""}. Campagne ${brief.campaignType} ${brief.campaignName}.`,
        status: "DRAFT",
        priority,
        briefData: buildMissionBriefData(brief, deliverable) as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    missionIds.push(mission.id);

    // Create deliverable record
    await db.missionDeliverable.create({
      data: {
        missionId: mission.id,
        title: deliverable.description,
        description: `${deliverable.type} — ${deliverable.format ?? "standard"}${deliverable.quantity ? ` × ${deliverable.quantity}` : ""}`,
        status: "PENDING",
      },
    });

    // Suggest Artemis sequence
    const sequence = DELIVERABLE_SEQUENCE_MAP[typeKey];
    if (sequence) suggestedSequences.add(sequence);
  }

  return {
    missionIds,
    suggestedSequences: Array.from(suggestedSequences),
  };
}
