import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS, PILLAR_NAMES } from "@/lib/types/advertis-vector";
import Anthropic from "@anthropic-ai/sdk";

interface TagResult {
  assetId: string;
  pillarTags: Record<PillarKey, number>; // relevance 0-1 per pillar
  primaryPillar: PillarKey;
  confidence: number;
}

interface TagSuggestion {
  assetId: string;
  suggestions: Array<{
    pillar: PillarKey;
    pillarName: string;
    relevance: number;
    reason: string;
  }>;
  confidence: number;
}

/**
 * Auto-tag a brand asset with relevant ADVE pillars using AI (Claude).
 * Falls back to heuristic tagging if AI is unavailable.
 */
export async function tagAsset(assetId: string): Promise<TagResult> {
  const asset = await db.brandAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: { strategy: { include: { pillars: true } } },
  });

  let tags: Record<string, number>;
  let confidence: number;

  // Try AI-powered tagging first
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const aiResult = await aiTagAsset(asset);
      tags = aiResult.tags;
      confidence = aiResult.confidence;
    } else {
      tags = inferPillarTags(asset.name, asset.fileUrl);
      confidence = 0.6;
    }
  } catch {
    // Fallback to heuristic
    tags = inferPillarTags(asset.name, asset.fileUrl);
    confidence = 0.6;
  }

  // Persist tags
  await db.brandAsset.update({
    where: { id: assetId },
    data: { pillarTags: tags },
  });

  const entries = Object.entries(tags) as [PillarKey, number][];
  const primaryPillar = entries.sort(([, a], [, b]) => b - a)[0]?.[0] ?? "a";

  return {
    assetId,
    pillarTags: tags as Record<PillarKey, number>,
    primaryPillar,
    confidence,
  };
}

/**
 * Tag all untagged assets for a strategy.
 */
export async function batchTag(strategyId: string): Promise<{
  tagged: number;
  skipped: number;
  results: TagResult[];
}> {
  const assets = await db.brandAsset.findMany({
    where: {
      strategyId,
      OR: [
        { pillarTags: { equals: Prisma.JsonNull } },
        { pillarTags: { equals: {} } },
      ],
    },
  });

  const results: TagResult[] = [];
  let skipped = 0;

  for (const asset of assets) {
    try {
      const result = await tagAsset(asset.id);
      results.push(result);
    } catch {
      skipped++;
    }
  }

  return {
    tagged: results.length,
    skipped,
    results,
  };
}

/**
 * Return suggested pillar tags without applying them.
 */
export async function getTagSuggestions(assetId: string): Promise<TagSuggestion> {
  const asset = await db.brandAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: { strategy: { include: { pillars: true } } },
  });

  let tags: Record<string, number>;
  let confidence: number;
  let reasons: Record<string, string> = {};

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const aiResult = await aiTagAsset(asset, true);
      tags = aiResult.tags;
      confidence = aiResult.confidence;
      reasons = aiResult.reasons;
    } else {
      tags = inferPillarTags(asset.name, asset.fileUrl);
      confidence = 0.6;
      reasons = generateHeuristicReasons(asset.name, asset.fileUrl, tags);
    }
  } catch {
    tags = inferPillarTags(asset.name, asset.fileUrl);
    confidence = 0.6;
    reasons = generateHeuristicReasons(asset.name, asset.fileUrl, tags);
  }

  const suggestions = (Object.entries(tags) as [PillarKey, number][])
    .filter(([, relevance]) => relevance > 0.3)
    .sort(([, a], [, b]) => b - a)
    .map(([pillar, relevance]) => ({
      pillar,
      pillarName: PILLAR_NAMES[pillar],
      relevance: Math.round(relevance * 100) / 100,
      reason: reasons[pillar] ?? "Contextual relevance detected",
    }));

  return {
    assetId,
    suggestions,
    confidence,
  };
}

// --- AI Tagging ---

async function aiTagAsset(
  asset: {
    name: string;
    fileUrl: string | null;
    strategy: {
      name: string;
      pillars: Array<{ key: string; content: unknown; confidence: number | null }>;
    };
  },
  includeReasons: boolean = false
): Promise<{
  tags: Record<string, number>;
  confidence: number;
  reasons: Record<string, string>;
}> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const pillarContext = asset.strategy.pillars
    .map((p) => `${p.key.toUpperCase()} (${PILLAR_NAMES[p.key as PillarKey] ?? p.key}): ${JSON.stringify(p.content)}`)
    .join("\n");

  const reasonInstruction = includeReasons
    ? `Also include "reasons": { "pillar_key": "brief explanation" } for each pillar with relevance > 0.3.`
    : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a brand asset analyst using the ADVERTIS framework with 8 pillars:
A = Authenticite (brand identity, values, heritage)
D = Distinction (visual identity, design, differentiation)
V = Valeur (value proposition, products, services)
E = Engagement (community, events, social)
R = Risk (crisis management, legal, reputation)
T = Track (KPIs, metrics, performance tracking)
I = Implementation (planning, roadmaps, budgets)
S = Strategie (brand strategy, guidelines, playbooks)

Analyze this brand asset and rate its relevance to each pillar (0.0 to 1.0):

Asset name: "${asset.name}"
File URL: ${asset.fileUrl ?? "N/A"}
Strategy: "${asset.strategy.name}"

Strategy pillars context:
${pillarContext}

Return JSON only:
{
  "tags": { "a": 0.0, "d": 0.0, "v": 0.0, "e": 0.0, "r": 0.0, "t": 0.0, "i": 0.0, "s": 0.0 },
  "confidence": 0.0${includeReasons ? `,
  "reasons": { "a": "...", "d": "..." }` : ""}
}

${reasonInstruction}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("No text response from AI");
  }

  // Parse JSON from response
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  const parsed = JSON.parse(jsonStr);

  // Validate and normalize tags
  const tags: Record<string, number> = {};
  for (const key of PILLAR_KEYS) {
    const value = parsed.tags?.[key];
    tags[key] = typeof value === "number" ? Math.max(0, Math.min(1, value)) : 0.1;
  }

  return {
    tags,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.8,
    reasons: parsed.reasons ?? {},
  };
}

// --- Heuristic Tagging (fallback) ---

function inferPillarTags(name: string, fileUrl: string | null): Record<string, number> {
  const lower = (name + " " + (fileUrl ?? "")).toLowerCase();
  const tags: Record<string, number> = {};

  for (const key of PILLAR_KEYS) {
    tags[key] = 0.1; // base relevance
  }

  // Keyword-based heuristics
  if (/logo|brand|identity|charte|heritage|histoire|valeur|mission|vision/i.test(lower)) {
    tags.a = 0.9; tags.d = 0.7;
  }
  if (/visual|design|color|typo|palette|font|graphic|moodboard|style/i.test(lower)) {
    tags.d = 0.9;
  }
  if (/product|service|offer|prix|catalog|tarif|gamme|proposition/i.test(lower)) {
    tags.v = 0.8;
  }
  if (/community|event|social|engagement|newsletter|club|ambassador/i.test(lower)) {
    tags.e = 0.8;
  }
  if (/risk|crisis|legal|compliance|regulation|insurance|security/i.test(lower)) {
    tags.r = 0.8;
  }
  if (/kpi|metric|report|dashboard|analytics|performance|roi|track/i.test(lower)) {
    tags.t = 0.8;
  }
  if (/plan|roadmap|budget|timeline|calendar|gantt|sprint|implementation/i.test(lower)) {
    tags.i = 0.8;
  }
  if (/guide|playbook|bible|strategy|strategie|charter|framework|method/i.test(lower)) {
    tags.s = 0.9;
  }

  // File type heuristics
  if (fileUrl) {
    const ext = fileUrl.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "svg", "gif", "webp", "ai", "psd", "fig"].includes(ext)) {
      tags.d = Math.max(tags.d ?? 0, 0.6); // Visual files lean toward Distinction
    }
    if (["pdf", "doc", "docx", "pptx"].includes(ext)) {
      tags.s = Math.max(tags.s ?? 0, 0.5); // Documents lean toward Strategy
    }
    if (["xls", "xlsx", "csv"].includes(ext)) {
      tags.t = Math.max(tags.t ?? 0, 0.6); // Spreadsheets lean toward Track
      tags.i = Math.max(tags.i ?? 0, 0.5); // Also toward Implementation
    }
    if (["mp4", "mov", "avi", "webm"].includes(ext)) {
      tags.d = Math.max(tags.d ?? 0, 0.5);
      tags.e = Math.max(tags.e ?? 0, 0.5); // Video content often for engagement
    }
  }

  return tags;
}

function generateHeuristicReasons(
  name: string,
  fileUrl: string | null,
  tags: Record<string, number>
): Record<string, string> {
  const reasons: Record<string, string> = {};
  const lower = (name + " " + (fileUrl ?? "")).toLowerCase();

  for (const [key, value] of Object.entries(tags)) {
    if (value <= 0.3) continue;

    switch (key) {
      case "a":
        if (/logo|brand|identity|heritage/i.test(lower)) reasons.a = "Asset name suggests brand identity content";
        else reasons.a = "Contextual relevance to brand authenticity";
        break;
      case "d":
        if (/visual|design|color|typo/i.test(lower)) reasons.d = "Asset name indicates visual/design content";
        else if (fileUrl && /\.(jpg|png|svg|ai|psd|fig)/i.test(fileUrl)) reasons.d = "Visual file format suggests design asset";
        else reasons.d = "Contextual relevance to brand distinction";
        break;
      case "v":
        if (/product|service|offer/i.test(lower)) reasons.v = "Asset name relates to product/service offering";
        else reasons.v = "Contextual relevance to value proposition";
        break;
      case "e":
        if (/community|event|social/i.test(lower)) reasons.e = "Asset name suggests community/engagement content";
        else reasons.e = "Contextual relevance to audience engagement";
        break;
      case "r":
        if (/risk|crisis|legal/i.test(lower)) reasons.r = "Asset name indicates risk/compliance content";
        else reasons.r = "Contextual relevance to risk management";
        break;
      case "t":
        if (/kpi|metric|report/i.test(lower)) reasons.t = "Asset name suggests tracking/metrics content";
        else reasons.t = "Contextual relevance to performance tracking";
        break;
      case "i":
        if (/plan|roadmap|budget/i.test(lower)) reasons.i = "Asset name indicates planning/implementation content";
        else reasons.i = "Contextual relevance to implementation planning";
        break;
      case "s":
        if (/guide|playbook|strategy/i.test(lower)) reasons.s = "Asset name suggests strategic document";
        else reasons.s = "Contextual relevance to brand strategy";
        break;
    }
  }

  return reasons;
}
