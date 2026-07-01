/**
 * @deprecated Use @/server/services/neteru-shared/pillar-directors instead.
 * This file exists for backward compatibility.
 */
export {
  PillarDirector,
  PILLAR_DIRECTORS,
  getDirector,
  assessAllPillarsHealth,
  type PillarKey,
  type PillarHealthReport,
  type WritebackVerdict,
} from "@/server/services/neteru-shared/pillar-directors";
