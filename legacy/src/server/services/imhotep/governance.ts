/**
 * Imhotep — governance gates.
 *
 * Pre-flight checks invoked from handlers before delegating to satellite services.
 * Mestor's governedProcedure handles the cross-cutting gates ; this module
 * adds Imhotep-specific business rules that don't belong at the framework level.
 */

import { db } from "@/lib/db";

export class CrewBudgetExceededError extends Error {
  constructor(
    public readonly missionId: string,
    public readonly estimatedUsd: number,
    public readonly capUsd: number,
  ) {
    super(
      `Crew assembly for mission ${missionId} estimated at $${estimatedUsd} exceeds cap $${capUsd}`,
    );
    this.name = "CrewBudgetExceededError";
  }
}

export class MissionNotFoundError extends Error {
  constructor(public readonly missionId: string) {
    super(`Mission ${missionId} not found`);
    this.name = "MissionNotFoundError";
  }
}

export class TalentProfileNotFoundError extends Error {
  constructor(public readonly talentProfileId: string) {
    super(`TalentProfile ${talentProfileId} not found`);
    this.name = "TalentProfileNotFoundError";
  }
}

/** Ensure mission exists and is in a state compatible with crew assembly. */
export async function assertMissionReadyForCrew(missionId: string): Promise<void> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { id: true, status: true },
  });
  if (!mission) throw new MissionNotFoundError(missionId);
  if (["COMPLETED", "ARCHIVED", "CANCELLED"].includes(mission.status)) {
    throw new Error(
      `Mission ${missionId} is in terminal state ${mission.status}; cannot assemble crew`,
    );
  }
}

/** Ensure talent profile exists. */
export async function assertTalentProfileExists(talentProfileId: string): Promise<void> {
  const t = await db.talentProfile.findUnique({
    where: { id: talentProfileId },
    select: { id: true },
  });
  if (!t) throw new TalentProfileNotFoundError(talentProfileId);
}

/** Soft cap : warn if a single creator would exceed the soft load threshold. */
export const SOFT_LOAD_THRESHOLD = 0.85;
