/**
 * Campaign Activation Bridge — Creates Campaign drafts from I pillar
 * Each recommended campaign in sprint90Days / annualCalendar becomes
 * an activatable Campaign (BRIEF_DRAFT) in the Campaign Manager.
 */

import { db } from "@/lib/db";

interface MarketingAction {
  action: string;
  description?: string;
  type?: string;         // ATL | BTL | TTL
  driver?: string;
  budget?: number;
  kpiCible?: string;
  owner?: string;
  priority?: string;
  aarrStage?: string;
  week?: string;
}

interface CalendarEntry {
  name: string;
  quarter?: string;
  objective?: string;
  budget?: number;
  drivers?: string[];
  aarrStage?: string;
  kpi?: string;
}

/**
 * Create Campaign BRIEF_DRAFT records from I pillar recommendations
 */
export async function createCampaignDrafts(
  strategyId: string,
  sprint90Days: MarketingAction[],
  annualCalendar: CalendarEntry[],
): Promise<string[]> {
  const campaignIds: string[] = [];

  // Create campaigns from sprint 90 days actions (grouped by logical campaign)
  const sprintActions = Array.isArray(sprint90Days) ? sprint90Days : [];
  for (const action of sprintActions) {
    if (!action.action) continue;

    const campaign = await db.campaign.create({
      data: {
        strategyId,
        name: action.action,
        state: "BRIEF_DRAFT",
        objectives: action.kpiCible ? [action.kpiCible] : [],
        advertis_vector: buildVectorFromAARR(action.aarrStage),
        budget: action.budget ?? 0,
      },
    });
    campaignIds.push(campaign.id);
  }

  // Create campaigns from annual calendar
  const calendarEntries = Array.isArray(annualCalendar) ? annualCalendar : [];
  for (const entry of calendarEntries) {
    if (!entry.name) continue;

    const campaign = await db.campaign.create({
      data: {
        strategyId,
        name: `${entry.name} (${entry.quarter ?? "TBD"})`,
        state: "BRIEF_DRAFT",
        objectives: entry.objective ? [entry.objective] : [],
        advertis_vector: buildVectorFromAARR(entry.aarrStage),
        budget: entry.budget ?? 0,
      },
    });
    campaignIds.push(campaign.id);
  }

  return campaignIds;
}

/**
 * Map AARRR stage to a weighted advertis_vector
 */
function buildVectorFromAARR(aarrStage?: string): Record<string, number> {
  const base = { a: 10, d: 10, v: 10, e: 10, r: 10, t: 10, i: 10, s: 10 };

  switch (aarrStage?.toUpperCase()) {
    case "ACQUISITION":
      return { ...base, d: 20, e: 15 };
    case "ACTIVATION":
      return { ...base, e: 20, v: 15 };
    case "RETENTION":
      return { ...base, e: 20, a: 15 };
    case "REFERRAL":
      return { ...base, e: 20, a: 20 };
    case "REVENUE":
      return { ...base, v: 20, d: 15 };
    default:
      return base;
  }
}
