interface FilterCriteria {
  requiredSkills?: string[];
  minTier?: string;
  maxRate?: number;
  availableAfter?: Date;
  channels?: string[];
}

const TIER_ORDER: Record<string, number> = {
  APPRENTI: 0,
  COMPAGNON: 1,
  MAITRE: 2,
  ASSOCIE: 3,
};

export function applyBinaryFilters(
  candidates: Array<{ tier: string; skills?: string[]; rate?: number; availableFrom?: Date; channels?: string[] }>,
  criteria: FilterCriteria
): typeof candidates {
  return candidates.filter((c) => {
    if (criteria.minTier && (TIER_ORDER[c.tier] ?? 0) < (TIER_ORDER[criteria.minTier] ?? 0)) return false;
    if (criteria.maxRate && c.rate && c.rate > criteria.maxRate) return false;
    if (criteria.availableAfter && c.availableFrom && c.availableFrom > criteria.availableAfter) return false;
    if (criteria.requiredSkills?.length) {
      const hasAll = criteria.requiredSkills.every((s) => c.skills?.includes(s));
      if (!hasAll) return false;
    }
    if (criteria.channels?.length) {
      const hasChannel = criteria.channels.some((ch) => c.channels?.includes(ch));
      if (!hasChannel) return false;
    }
    return true;
  });
}
