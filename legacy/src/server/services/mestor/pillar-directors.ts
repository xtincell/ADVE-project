/**
 * @deprecated Use @/server/services/neteru-shared/pillar-directors instead.
 * This file exists for backward compatibility.
 */
export {
  PillarDirector,
  PILLAR_DIRECTORS,
  getDirector,
  assessDirector,
  assessAllDirectors,
  assessAllPillarsHealth,
  canExecuteSequence,
  type PillarKey,
  type PillarHealthReport,
  type WritebackVerdict,
} from "@/server/services/neteru-shared/pillar-directors";

// Legacy standalone validateWriteback function (used by swarm.ts)
import { PILLAR_DIRECTORS } from "@/server/services/neteru-shared/pillar-directors";

export function validateWriteback(
  pillarKey: string,
  currentContent: Record<string, unknown>,
  proposedChanges: Record<string, unknown>,
  authorSystem: string = "OPERATOR",
) {
  const key = pillarKey as "a" | "d" | "v" | "e" | "r" | "t" | "i" | "s";
  const director = PILLAR_DIRECTORS[key];
  if (!director) {
    return { allowed: false, approved: false, overwrites: [], newFields: [], conflicts: [], reason: `Unknown pillar: ${pillarKey}` };
  }
  return director.validateWriteback(currentContent, proposedChanges, authorSystem);
}
