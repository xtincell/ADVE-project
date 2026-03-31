import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

/**
 * AI-assisted technical conformity check.
 * Returns a preliminary score and flags issues.
 */
export interface AutomatedQcResult {
  passed: boolean;
  score: number;
  issues: Array<{
    type: "format" | "brand" | "content" | "pillar";
    severity: "info" | "warning" | "error";
    message: string;
  }>;
}

/**
 * Run AI-powered automated QC on a deliverable.
 * Uses Claude to analyze deliverable context against strategy pillars and driver criteria.
 */
export async function runAutomatedQc(
  deliverableId: string,
  qcCriteria: Record<string, unknown>
): Promise<AutomatedQcResult> {
  const deliverable = await db.missionDeliverable.findUniqueOrThrow({
    where: { id: deliverableId },
    include: {
      mission: {
        include: {
          driver: true,
          strategy: { include: { pillars: true } },
        },
      },
    },
  });

  const issues: AutomatedQcResult["issues"] = [];
  let score = 10;

  // Structural checks first (no AI needed)

  // Check file presence
  if (!deliverable.fileUrl) {
    issues.push({
      type: "format",
      severity: "error",
      message: "No file attached to deliverable",
    });
    score -= 3;
  }

  // Check title
  if (!deliverable.title || deliverable.title.trim().length < 3) {
    issues.push({
      type: "content",
      severity: "error",
      message: "Deliverable title is missing or too short",
    });
    score -= 2;
  }

  // Check format compliance from qcCriteria
  if (qcCriteria.requiredFormat && deliverable.fileUrl) {
    const required = String(qcCriteria.requiredFormat).toLowerCase();
    const ext = deliverable.fileUrl.split(".").pop()?.toLowerCase() ?? "";
    if (required && ext && !ext.includes(required)) {
      issues.push({
        type: "format",
        severity: "warning",
        message: `Expected format: ${required}, found: ${ext}`,
      });
      score -= 1;
    }
  }

  // Check dimensions if specified
  if (qcCriteria.minWidth || qcCriteria.minHeight) {
    issues.push({
      type: "format",
      severity: "info",
      message: "Dimension check requires manual verification (automated check not available for file content)",
    });
  }

  // Pillar alignment check using strategy vector
  const strategyVector = deliverable.mission.strategy.advertis_vector as Record<string, number> | null;
  if (strategyVector) {
    const weakPillars = (["a", "d", "v", "e", "r", "t", "i", "s"] as PillarKey[])
      .filter((k) => (strategyVector[k] ?? 0) < 8);

    if (weakPillars.length > 4) {
      issues.push({
        type: "pillar",
        severity: "warning",
        message: `Strategy has ${weakPillars.length} weak pillars (<8/25): ${weakPillars.map((k) => PILLAR_NAMES[k]).join(", ")}. Deliverable may need extra pillar focus.`,
      });
      score -= 1;
    }
  }

  // AI-powered content analysis (if API key available)
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const aiResult = await runAiContentAnalysis(deliverable, qcCriteria);
      if (aiResult) {
        for (const issue of aiResult.issues) {
          issues.push(issue);
        }
        // Blend AI score with structural score
        score = (score + aiResult.score) / 2;
      }
    }
  } catch {
    // AI analysis is supplementary; don't fail the whole QC
    issues.push({
      type: "content",
      severity: "info",
      message: "AI-assisted analysis unavailable; relying on structural checks only",
    });
  }

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  const passed = score >= 6 && !issues.some((i) => i.severity === "error");

  return { passed, score, issues };
}

async function runAiContentAnalysis(
  deliverable: {
    title: string;
    fileUrl: string | null;
    mission: {
      title: string;
      driver: { name: string; channel: string; qcCriteria: unknown } | null;
      strategy: {
        name: string;
        pillars: Array<{ key: string; content: unknown }>;
      };
    };
  },
  qcCriteria: Record<string, unknown>
): Promise<{ score: number; issues: AutomatedQcResult["issues"] } | null> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const pillarSummary = deliverable.mission.strategy.pillars
    .map((p) => `${PILLAR_NAMES[p.key as PillarKey] ?? p.key}: ${JSON.stringify(p.content)}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a brand QC analyst for the ADVERTIS framework. Evaluate this deliverable for brand conformity.

Deliverable: "${deliverable.title}"
Mission: "${deliverable.mission.title}"
Driver/Channel: ${deliverable.mission.driver?.name ?? "N/A"} (${deliverable.mission.driver?.channel ?? "N/A"})
Strategy: "${deliverable.mission.strategy.name}"

Brand pillars:
${pillarSummary}

QC criteria: ${JSON.stringify(qcCriteria)}

Evaluate the deliverable title and context for:
1. Brand alignment with strategy pillars
2. Channel appropriateness
3. Naming convention quality

Return JSON only:
{
  "score": <number 0-10>,
  "issues": [
    {"type": "brand"|"content"|"pillar"|"format", "severity": "info"|"warning"|"error", "message": "..."}
  ]
}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) return null;

  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = textBlock.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    return {
      score: typeof parsed.score === "number" ? parsed.score : 7,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return null;
  }
}
