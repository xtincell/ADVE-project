import type { JehutyFeedItem } from "@/lib/types/jehuty";

/** A publisher article must not disappear behind a volume of internal analyses.
 * Explicit pinning remains the first editorial decision; qualification ranks
 * within each family, never disguises an internal hypothesis as news. */
export function selectGazetteEdition(items: readonly JehutyFeedItem[], limit = items.length): JehutyFeedItem[] {
  const pin = (item: JehutyFeedItem) => item.curation?.action === "PINNED" ? 1 : 0;
  const article = (item: JehutyFeedItem) => item.category === "EXTERNAL_SIGNAL" && !!item.externalUrl ? 1 : 0;
  return [...items].sort((a, b) => pin(b) - pin(a) || article(b) - article(a)
    || b.priority - a.priority || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

export function gazetteItemTouchesPillar(item: JehutyFeedItem, pillar: string): boolean {
  const key = pillar.toLowerCase();
  if (item.pillarKey?.toLowerCase() === key) return true;
  // A brand foundation alone is not evidence that this article affects a pillar.
  return !!item.articleContext?.linkedAnalyses.some(a => a.pillarKeys.some(p => p.toLowerCase() === key))
    || !!item.articleContext?.recommendations.some(r => r.targetPillarKey.toLowerCase() === key);
}
