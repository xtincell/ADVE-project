import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

// AmbassadorProgram tiers mapped to Devotion Ladder segments:
// Bronze = engage (segment 4), Silver = engage (segment 4),
// Gold = ambassadeur (segment 5), Diamond = evangeliste (segment 6)

const TIER_TO_DEVOTION: Record<string, string> = {
  BRONZE: "engage",
  SILVER: "engage",
  GOLD: "ambassadeur",
  DIAMOND: "evangeliste",
};

export const ambassadorRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Derive ambassador list from DevotionSnapshot segments
      const latestSnapshot = await ctx.db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
      if (!latestSnapshot) return { ambassadors: [], evangelists: [], total: 0 };

      return {
        ambassadors: { percentage: latestSnapshot.ambassadeur, segment: 5 },
        evangelists: { percentage: latestSnapshot.evangeliste, segment: 6 },
        total: latestSnapshot.ambassadeur + latestSnapshot.evangeliste,
        devotionScore: latestSnapshot.devotionScore,
      };
    }),

  mapTierToDevotion: protectedProcedure
    .input(z.object({ ambassadorTier: z.enum(["BRONZE", "SILVER", "GOLD", "DIAMOND"]) }))
    .query(({ input }) => {
      return {
        tier: input.ambassadorTier,
        devotionSegment: TIER_TO_DEVOTION[input.ambassadorTier],
        description: getSegmentDescription(TIER_TO_DEVOTION[input.ambassadorTier]!),
      };
    }),

  getProgram: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: 6,
      });

      const latest = snapshots[0];
      const previous = snapshots[1];

      return {
        current: latest ? {
          ambassadors: latest.ambassadeur,
          evangelists: latest.evangeliste,
          devotionScore: latest.devotionScore,
        } : null,
        trend: latest && previous ? {
          ambassadorsDelta: latest.ambassadeur - previous.ambassadeur,
          evangelistsDelta: latest.evangeliste - previous.evangeliste,
          scoreDelta: latest.devotionScore - previous.devotionScore,
        } : null,
        history: snapshots.reverse(),
      };
    }),
});

function getSegmentDescription(segment: string): string {
  const descriptions: Record<string, string> = {
    spectateur: "Connaît la marque mais n'interagit pas",
    interesse: "Suit la marque, consomme du contenu",
    participant: "Interagit activement, commente, partage",
    engage: "Client fidèle, achète régulièrement",
    ambassadeur: "Recommande activement, parle de la marque spontanément",
    evangeliste: "Défend la marque, crée du contenu, recrute d'autres fans",
  };
  return descriptions[segment] ?? "Segment inconnu";
}
