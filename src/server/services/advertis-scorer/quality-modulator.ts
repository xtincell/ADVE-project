import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import type { ScorableType } from "./index";

const getClient = () => new Anthropic();

// ── Simple in-memory cache with TTL ───────────────────────────────────
const cache = new Map<string, { value: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type: string, id: string, content: unknown): string {
  const hash = createHash("md5").update(JSON.stringify(content)).digest("hex").slice(0, 12);
  return `${type}:${id}:${hash}`;
}

function getCached(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: number): void {
  // Evict old entries if cache grows too large
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * AI-assisted quality modulator. Returns a value between 0.40 and 1.00.
 * Cannot move score more than 60% from structural.
 *
 * Uses Claude to assess pillar content quality on specificity, coherence,
 * actionability, and completeness. Falls back to a heuristic based on
 * content fill ratio, length, and array richness when the API is unavailable.
 */
export async function getQualityModulator(
  type: ScorableType,
  id: string
): Promise<number> {
  // Only strategy type has pillar-level content to assess
  if (type !== "strategy") {
    return 0.85;
  }

  // Fetch all pillar content for this strategy
  const pillars = await db.pillar.findMany({
    where: { strategyId: id },
    select: { key: true, content: true },
  });

  if (!pillars.length) {
    return 0.40;
  }

  // ── Cache check ───────────────────────────────────────────────────
  const cacheKey = getCacheKey(type, id, pillars.map((p) => p.content));
  const cachedValue = getCached(cacheKey);
  if (cachedValue !== null) {
    return cachedValue;
  }

  // ── Evaluate quality ──────────────────────────────────────────────
  let modulator: number;
  try {
    modulator = await aiQualityAssessment(pillars);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[AI fallback] quality-modulator:", reason);
    modulator = heuristicQuality(pillars);
  }

  // Store in cache
  setCache(cacheKey, modulator);

  return modulator;
}

/**
 * Call Claude to rate the overall quality of pillar content.
 * Wrapped with a 5-second timeout via AbortController.
 */
async function aiQualityAssessment(
  pillars: Array<{ key: string; content: unknown }>
): Promise<number> {
  const client = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const pillarSummary = pillars
      .map((p) => `### Pillar "${p.key}":\n${JSON.stringify(p.content, null, 2)}`)
      .join("\n\n");

    const response = await client.messages.create(
      {
        model: "claude-3-5-haiku-20241022",
        max_tokens: 64,
        messages: [
          {
            role: "user",
            content: `You are a brand strategy quality assessor. Evaluate the following pillar content and return ONLY a single decimal number between 0.0 and 1.0 representing overall quality.

Rate based on these criteria (equal weight):
- Specificity: How concrete and detailed is the content?
- Coherence: Does the content make logical sense and align internally?
- Actionability: Can the content be acted upon to build a brand?
- Completeness: Are the key fields filled with substantive information?

Pillar content:
${pillarSummary}

Respond with ONLY a number like 0.72 — nothing else.`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const text =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    const score = parseFloat(text);
    if (isNaN(score) || score < 0 || score > 1) {
      throw new Error(`Unexpected AI response: "${text}"`);
    }

    // Clamp to the allowed modulator range [0.40, 1.00]
    return Math.max(0.4, Math.min(1.0, score));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Heuristic fallback: estimate quality from content fill ratio.
 * Clamp range scales with actual content to avoid inflating empty pillars:
 *   fillRatio < 0.1  (nearly empty)  → clamp to [0.30, 0.50]
 *   fillRatio < 0.3  (sparse)        → clamp to [0.45, 0.70]
 *   fillRatio < 0.6  (partial)       → clamp to [0.60, 0.85]
 *   fillRatio >= 0.6 (substantial)   → clamp to [0.70, 1.00]
 */
function heuristicQuality(
  pillars: Array<{ key: string; content: unknown }>
): number {
  if (!pillars.length) return 0.40;

  let totalScore = 0;

  for (const pillar of pillars) {
    const content = pillar.content;
    if (!content || typeof content !== "object") {
      totalScore += 0;
      continue;
    }

    const record = content as Record<string, unknown>;
    const fields = Object.keys(record);
    const filledFields = fields.filter((k) => {
      const v = record[k];
      if (v === null || v === undefined || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    });

    // Field fill ratio (0-1)
    const fillRatio = fields.length > 0 ? filledFields.length / fields.length : 0;

    // Content length signal — more text generally means richer content
    const jsonStr = JSON.stringify(content);
    const lengthScore = Math.min(1, jsonStr.length / 2000);

    // Array richness — arrays with multiple items suggest more detail
    const arrays = Object.values(record).filter(Array.isArray);
    const arrayRichness =
      arrays.length > 0
        ? arrays.reduce((sum, arr) => sum + Math.min(1, arr.length / 3), 0) /
          arrays.length
        : 0.5;

    // Weighted combination → raw score 0–1
    const rawPillarScore = fillRatio * 0.4 + lengthScore * 0.35 + arrayRichness * 0.25;

    // Determine clamp range based on fillRatio
    const [floor, ceiling] = getClampRange(fillRatio);

    // Clamp the raw score to the appropriate range
    const pillarScore = Math.max(floor, Math.min(ceiling, rawPillarScore));
    totalScore += pillarScore;
  }

  // Average clamped score across all pillars
  return totalScore / pillars.length;
}

/**
 * Returns [floor, ceiling] clamp range based on fill ratio.
 * Prevents nearly-empty pillars from receiving inflated quality scores.
 */
function getClampRange(fillRatio: number): [number, number] {
  if (fillRatio < 0.1) return [0.30, 0.50];
  if (fillRatio < 0.3) return [0.45, 0.70];
  if (fillRatio < 0.6) return [0.60, 0.85];
  return [0.70, 1.00];
}
