/**
 * social-report — rapport de performance social (ADR-0133).
 *
 * Owning Neter : ANUBIS (lecture composée). 100 % déterministe, zéro LLM :
 * agrège ce qui a été RÉELLEMENT collecté (SocialPost + insights quand
 * mesurés, FollowerSnapshot) sur 30/90 j. L'absence de mesure reste null —
 * jamais un zéro fabriqué (un post sans insights ne compte pas dans la
 * portée totale ; le rapport dit combien de posts sont mesurés).
 */

import { db } from "@/lib/db";

export interface SocialReportPlatformBlock {
  platform: string;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  /** Somme des portées MESURÉES (posts avec reach > 0) — null si aucune. */
  reach: number | null;
  postsWithReach: number;
  avgEngagementPerPost: number;
  followerCount: number | null;
  followerDelta: number | null;
}

export interface SocialReportTopPost {
  id: string;
  platform: string;
  content: string | null;
  publishedAt: string | null;
  engagement: number;
  reach: number;
  permalinkUrl: string | null;
  mediaUrl: string | null;
}

export interface SocialReport {
  days: 30 | 90;
  generatedAt: string;
  totals: {
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    reach: number | null;
    postsWithReach: number;
    followers: number | null;
    followersDelta: number | null;
  };
  platforms: SocialReportPlatformBlock[];
  topPosts: SocialReportTopPost[];
  /** Interactions inbox sur la période (reçues / traitées). */
  inbox: { received: number; replied: number };
  /** Honnêteté : plateformes connectées sans aucune donnée collectée. */
  connectedWithoutData: string[];
}

export async function buildSocialReport(strategyId: string, days: 30 | 90): Promise<SocialReport> {
  const since = new Date(Date.now() - days * 86_400_000);

  const [posts, snapshots, connections, inboxReceived, inboxReplied] = await Promise.all([
    db.socialPost.findMany({
      where: { strategyId, OR: [{ publishedAt: { gte: since } }, { publishedAt: null, createdAt: { gte: since } }] },
      select: {
        id: true, content: true, publishedAt: true, likes: true, comments: true,
        shares: true, reach: true, permalinkUrl: true, mediaUrl: true,
        connection: { select: { platform: true } },
      },
    }),
    db.followerSnapshot.findMany({
      where: { strategyId, capturedAt: { gte: since } },
      orderBy: { capturedAt: "asc" },
      select: { platform: true, followerCount: true, capturedAt: true },
    }),
    db.socialConnection.findMany({
      where: { strategyId, status: "ACTIVE" },
      select: { platform: true },
    }),
    db.socialInboxItem.count({ where: { strategyId, createdAt: { gte: since } } }),
    db.socialInboxItem.count({ where: { strategyId, status: "REPLIED", repliedAt: { gte: since } } }),
  ]);

  // Audience : premier + dernier relevé par plateforme sur la période.
  const firstSnap = new Map<string, number>();
  const lastSnap = new Map<string, number>();
  for (const s of snapshots) {
    const key = String(s.platform);
    if (!firstSnap.has(key)) firstSnap.set(key, s.followerCount);
    lastSnap.set(key, s.followerCount);
  }

  const byPlatform = new Map<string, SocialReportPlatformBlock>();
  for (const p of posts) {
    const key = String(p.connection.platform);
    const block = byPlatform.get(key) ?? {
      platform: key,
      posts: 0, likes: 0, comments: 0, shares: 0,
      reach: null, postsWithReach: 0, avgEngagementPerPost: 0,
      followerCount: lastSnap.get(key) ?? null,
      followerDelta:
        lastSnap.has(key) && firstSnap.has(key)
          ? lastSnap.get(key)! - firstSnap.get(key)!
          : null,
    };
    block.posts++;
    block.likes += p.likes;
    block.comments += p.comments;
    block.shares += p.shares;
    if (p.reach > 0) {
      block.reach = (block.reach ?? 0) + p.reach;
      block.postsWithReach++;
    }
    byPlatform.set(key, block);
  }
  // Plateformes avec audience mais zéro post collecté — visibles quand même.
  for (const [key, count] of lastSnap) {
    if (!byPlatform.has(key)) {
      byPlatform.set(key, {
        platform: key,
        posts: 0, likes: 0, comments: 0, shares: 0,
        reach: null, postsWithReach: 0, avgEngagementPerPost: 0,
        followerCount: count,
        followerDelta: firstSnap.has(key) ? count - firstSnap.get(key)! : null,
      });
    }
  }
  for (const block of byPlatform.values()) {
    const engagement = block.likes + block.comments + block.shares;
    block.avgEngagementPerPost = block.posts > 0 ? Math.round((engagement / block.posts) * 10) / 10 : 0;
  }

  const totalsReachPosts = posts.filter((p) => p.reach > 0);
  const totalFollowers = [...lastSnap.values()].reduce((a, b) => a + b, 0);
  const totalFirst = [...firstSnap.entries()]
    .filter(([k]) => lastSnap.has(k))
    .reduce((a, [, v]) => a + v, 0);

  const topPosts: SocialReportTopPost[] = posts
    .map((p) => ({
      id: p.id,
      platform: String(p.connection.platform),
      content: p.content ? p.content.slice(0, 160) : null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      engagement: p.likes + p.comments + p.shares,
      reach: p.reach,
      permalinkUrl: p.permalinkUrl,
      mediaUrl: p.mediaUrl,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 8);

  const platformsWithData = new Set([...byPlatform.keys()]);
  const connectedWithoutData = connections
    .map((c) => String(c.platform))
    .filter((p) => !platformsWithData.has(p));

  return {
    days,
    generatedAt: new Date().toISOString(),
    totals: {
      posts: posts.length,
      likes: posts.reduce((n, p) => n + p.likes, 0),
      comments: posts.reduce((n, p) => n + p.comments, 0),
      shares: posts.reduce((n, p) => n + p.shares, 0),
      engagement: posts.reduce((n, p) => n + p.likes + p.comments + p.shares, 0),
      reach: totalsReachPosts.length > 0 ? totalsReachPosts.reduce((n, p) => n + p.reach, 0) : null,
      postsWithReach: totalsReachPosts.length,
      followers: lastSnap.size > 0 ? totalFollowers : null,
      followersDelta: firstSnap.size > 0 && lastSnap.size > 0 ? totalFollowers - totalFirst : null,
    },
    platforms: [...byPlatform.values()].sort((a, b) => b.posts - a.posts),
    topPosts,
    inbox: { received: inboxReceived, replied: inboxReplied },
    connectedWithoutData: [...new Set(connectedWithoutData)],
  };
}
