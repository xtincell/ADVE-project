/**
 * @upgraders/loyalty-extension — entry point.
 *
 * Implementation runs against the sandbox proxy ctx — never touches `db`
 * or `fetch` directly. The sandbox raises PluginSandboxViolation if the
 * code reaches outside its declared capabilities.
 */

import type { PluginContext } from "@/server/governance/plugin-sandbox";

export interface LoyaltyScoreOutput {
  loyaltyScore: number;
  ambassadorRatio: number;
  devotionAvg: number;
}

export async function computeLoyaltyScore(
  ctx: PluginContext,
  input: { strategyId: string },
): Promise<LoyaltyScoreOutput> {
  // Allowed: superfanProfile + devotionSnapshot reads (declared in manifest).
  const [profiles, snapshot] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx.db as any).superfanProfile.findMany({
      where: { strategyId: input.strategyId },
      select: { engagementDepth: true, segment: true },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx.db as any).devotionSnapshot.findFirst({
      where: { strategyId: input.strategyId },
      orderBy: { measuredAt: "desc" },
    }),
  ]);

  const total = profiles.length;
  const ambassadors = profiles.filter((p: { segment: string }) => p.segment === "AMBASSADEUR" || p.segment === "EVANGELISTE").length;
  const ambassadorRatio = total > 0 ? ambassadors / total : 0;
  const devotionAvg = total > 0
    ? profiles.reduce((acc: number, p: { engagementDepth: number }) => acc + p.engagementDepth, 0) / total
    : 0;

  // Composite loyalty score = 60% ambassador ratio + 40% devotion avg.
  const loyaltyScore = Math.round((ambassadorRatio * 0.6 + devotionAvg * 0.4) * 100);

  // Emit declared event.
  await ctx.emit("loyalty.score.computed", {
    strategyId: input.strategyId,
    loyaltyScore,
    ambassadorRatio,
    devotionAvg,
    snapshotMeasuredAt: snapshot?.measuredAt ?? null,
  });

  return { loyaltyScore, ambassadorRatio, devotionAvg };
}
