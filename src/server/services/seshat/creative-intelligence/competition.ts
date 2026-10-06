import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** ADR-0194: external market evidence + this brand's studies, never global private history. */
export function competitorScope(strategyId: string | undefined, sector: string, countryCode: string): Prisma.CompetitorSnapshotWhereInput {
  return {
    sector, countryCode,
    OR: [
      { visibility: "PUBLIC", strategyId: null, studyId: null, source: { not: null } },
      ...(strategyId ? [
        { visibility: "BRAND", strategyId },
        { visibility: "BRAND", strategyId: null, study: { strategyId } },
      ] : []),
    ],
  };
}

export async function loadScopedCompetitors(strategyId: string) {
  const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { countryCode: true, businessContext: true } });
  const sector = (strategy?.businessContext as { sector?: string } | null)?.sector;
  if (!sector || !strategy?.countryCode) return [];
  return db.competitorSnapshot.findMany({ where: competitorScope(strategyId, sector, strategy.countryCode), orderBy: { measuredAt: "desc" }, take: 10 });
}
