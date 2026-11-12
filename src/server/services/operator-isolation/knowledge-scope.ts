import type { Prisma } from "@prisma/client";

/** Scope before pagination. Orphan or conflicting captures never stand in for a brand. */
export function knowledgeStrategyScope(strategyIds: readonly string[]): Prisma.KnowledgeEntryWhereInput {
  return {
    OR: strategyIds.map((strategyId) => ({
      AND: [
        { data: { path: ["strategyId"], equals: strategyId } },
        { OR: [{ originStrategyId: null }, { originStrategyId: strategyId }] },
      ],
    })),
  };
}
