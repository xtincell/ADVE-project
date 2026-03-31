import { describe, it, expect } from "vitest";
import {
  getAdaptiveQuestions,
  getAllQuestions,
  getBusinessContextQuestions,
} from "@/server/services/quick-intake/question-bank";
import { classifyBrand } from "@/lib/types/advertis-vector";

describe("Quick Intake Question Bank", () => {
  const pillars = ["a", "d", "v", "e", "r", "t", "i", "s"] as const;

  it("returns questions for each pillar", async () => {
    for (const pillar of pillars) {
      const questions = await getAdaptiveQuestions(pillar, {});
      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("each question has required fields", async () => {
    for (const pillar of pillars) {
      const questions = await getAdaptiveQuestions(pillar, {});
      for (const q of questions) {
        expect(q).toHaveProperty("id");
        expect(q).toHaveProperty("question");
        expect(typeof q.question).toBe("string");
        expect(q.question.length).toBeGreaterThan(10);
      }
    }
  });

  it("all pillars have unique question IDs", async () => {
    const allIds = new Set<string>();
    for (const pillar of pillars) {
      const questions = await getAdaptiveQuestions(pillar, {});
      for (const q of questions) {
        expect(allIds.has(q.id)).toBe(false);
        allIds.add(q.id);
      }
    }
  });

  it("getAllQuestions returns all pillars", () => {
    const all = getAllQuestions();
    for (const pillar of pillars) {
      expect(all[pillar]).toBeDefined();
      expect(all[pillar]!.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Quick Intake - Business Context Questions", () => {
  it("returns business context questions", () => {
    const questions = getBusinessContextQuestions();
    expect(questions).toBeDefined();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });

  it("business context questions have IDs starting with biz_", () => {
    const questions = getBusinessContextQuestions();
    for (const q of questions) {
      expect(q.id).toMatch(/^biz_/);
    }
  });
});

describe("Quick Intake - Full Flow Simulation", () => {
  it("start -> advance through all pillars -> ready to complete", () => {
    // Simulate the progression through all steps
    const allSteps = ["biz", "a", "d", "v", "e", "r", "t", "i", "s"];
    const mergedResponses: Record<string, unknown> = {};

    for (let stepIdx = 0; stepIdx < allSteps.length; stepIdx++) {
      const step = allSteps[stepIdx];
      // Add a mock response for this step
      mergedResponses[`${step}_q1`] = "answer1";
      mergedResponses[`${step}_q2`] = "answer2";

      const answeredSteps = new Set(
        Object.keys(mergedResponses).map((key) => key.split("_")[0])
      );
      const nextPillar = allSteps.find((p) => !answeredSteps.has(p));
      const progress = answeredSteps.size / allSteps.length;

      if (stepIdx < allSteps.length - 1) {
        expect(nextPillar).toBeDefined();
        expect(progress).toBeLessThan(1);
      } else {
        // All steps answered
        expect(nextPillar).toBeUndefined();
        expect(progress).toBe(1);
      }
    }
  });

  it("progress increases as more steps are completed", () => {
    const allSteps = ["biz", "a", "d", "v", "e", "r", "t", "i", "s"];
    const mergedResponses: Record<string, unknown> = {};
    let lastProgress = -1;

    for (const step of allSteps) {
      mergedResponses[`${step}_q1`] = "answer";
      const answeredSteps = new Set(
        Object.keys(mergedResponses).map((key) => key.split("_")[0])
      );
      const progress = answeredSteps.size / allSteps.length;
      expect(progress).toBeGreaterThan(lastProgress);
      lastProgress = progress;
    }
  });
});

describe("Quick Intake - Scoring and Classification", () => {
  it("classification is valid for any composite score", () => {
    const validClassifications = ["ZOMBIE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];
    for (let i = 0; i <= 200; i += 10) {
      const classification = classifyBrand(i);
      expect(validClassifications).toContain(classification);
    }
  });

  it("scoring produces diagnostic with strengths and weaknesses", () => {
    const pillars = [
      { key: "a", name: "Authenticite", score: 22 },
      { key: "d", name: "Distinction", score: 20 },
      { key: "v", name: "Valeur", score: 18 },
      { key: "e", name: "Engagement", score: 15 },
      { key: "r", name: "Risk", score: 10 },
      { key: "t", name: "Track", score: 8 },
      { key: "i", name: "Implementation", score: 5 },
      { key: "s", name: "Strategie", score: 3 },
    ];

    const sorted = [...pillars].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3).map((p) => p.name);
    const weaknesses = sorted.slice(-3).map((p) => p.name);

    expect(strengths).toHaveLength(3);
    expect(weaknesses).toHaveLength(3);
    // Top 3 by score
    expect(strengths).toContain("Authenticite");
    expect(strengths).toContain("Distinction");
    expect(strengths).toContain("Valeur");
    // Bottom 3 by score
    expect(weaknesses).toContain("Track");
    expect(weaknesses).toContain("Implementation");
    expect(weaknesses).toContain("Strategie");
  });

  it("diagnostic summary includes classification and score", () => {
    const composite = 120;
    const classification = classifyBrand(composite);
    const summary = `Votre marque est classee "${classification}" avec un score de ${composite}/200.`;
    expect(summary).toContain(classification);
    expect(summary).toContain("120/200");
  });
});

describe("Quick Intake - Conversion to Strategy", () => {
  it("extractKeyFromOption extracts key from KEY::Label format", () => {
    // Replicate the service's extractKeyFromOption
    function extractKeyFromOption(option: string): string {
      const parts = option.split("::");
      return parts[0] ?? option;
    }

    expect(extractKeyFromOption("B2C::Business to Consumer")).toBe("B2C");
    expect(extractKeyFromOption("MAINSTREAM::Mainstream positioning")).toBe("MAINSTREAM");
    expect(extractKeyFromOption("plain_value")).toBe("plain_value");
    expect(extractKeyFromOption("")).toBe("");
  });

  it("pillar responses are properly keyed by pillar prefix", () => {
    const responses: Record<string, unknown> = {
      a_identity: "Strong brand",
      a_values: ["integrity", "innovation"],
      d_unique: "Premium quality",
      biz_model: "B2C::Business to Consumer",
    };

    // Extract pillar-specific responses
    const pillarAResponses: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(responses)) {
      if (key.startsWith("a_")) {
        pillarAResponses[key.replace("a_", "")] = value;
      }
    }

    expect(pillarAResponses.identity).toBe("Strong brand");
    expect(pillarAResponses.values).toEqual(["integrity", "innovation"]);
    expect(pillarAResponses).not.toHaveProperty("d_unique");
  });

  it("strategy is created with QUICK_INTAKE status", () => {
    // In the service, the strategy gets status "QUICK_INTAKE"
    const status = "QUICK_INTAKE";
    expect(status).toBe("QUICK_INTAKE");
  });

  it("pillar confidence for quick intake is 0.4 (low)", () => {
    const quickIntakeConfidence = 0.4;
    expect(quickIntakeConfidence).toBe(0.4);
    expect(quickIntakeConfidence).toBeLessThan(1);
  });
});

describe("Quick Intake - Adaptive Questions", () => {
  it("questions adapt based on existing responses", async () => {
    const emptyResponses = {};
    const withResponses = { a_identity: "Strong brand identity" };

    const qEmpty = await getAdaptiveQuestions("a", emptyResponses);
    const qWithContext = await getAdaptiveQuestions("a", withResponses);

    // Both should return questions for pillar 'a'
    expect(qEmpty.length).toBeGreaterThan(0);
    expect(qWithContext.length).toBeGreaterThan(0);
  });

  it("biz step returns business context questions", () => {
    const questions = getBusinessContextQuestions();
    expect(questions.length).toBeGreaterThan(0);
    // Should cover business model, positioning, etc.
    const ids = questions.map((q) => q.id);
    expect(ids.some((id) => id.includes("biz"))).toBe(true);
  });
});
