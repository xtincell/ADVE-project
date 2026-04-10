import { db } from "@/lib/db";

import { scoreObject } from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";

interface BootState {
  strategyId: string;
  currentStep: number;
  totalSteps: number;
  currentPillar: string | null;
  responses: Record<string, unknown>;
  completed: boolean;
}

const BOOT_STEPS = [
  { pillar: "a", title: "Authenticité — Qui êtes-vous vraiment ?", questions: 5 },
  { pillar: "d", title: "Distinction — Pourquoi vous et pas un autre ?", questions: 4 },
  { pillar: "v", title: "Valeur — Que promettez-vous au monde ?", questions: 4 },
  { pillar: "e", title: "Engagement — Comment créer la dévotion ?", questions: 4 },
  { pillar: "r", title: "Risk — Quels sont vos angles morts ?", questions: 3 },
  { pillar: "t", title: "Track — Comment mesurez-vous le succès ?", questions: 3 },
  { pillar: "i", title: "Implementation — De la stratégie à l'action ?", questions: 3 },
  { pillar: "s", title: "Stratégie — Comment assembler le tout ?", questions: 3 },
];

export async function start(strategyId: string): Promise<BootState> {
  return {
    strategyId,
    currentStep: 0,
    totalSteps: BOOT_STEPS.length,
    currentPillar: BOOT_STEPS[0]!.pillar,
    responses: {},
    completed: false,
  };
}

export async function advance(
  strategyId: string,
  step: number,
  responses: Record<string, unknown>
): Promise<BootState> {
  const nextStep = step + 1;
  const completed = nextStep >= BOOT_STEPS.length;

  // Save pillar content
  const currentBoot = BOOT_STEPS[step];
  if (currentBoot) {
    // Persist via Gateway
    const { writePillar } = await import("@/server/services/pillar-gateway");
    await writePillar({
      strategyId,
      pillarKey: currentBoot.pillar as import("@/lib/types/advertis-vector").PillarKey,
      operation: { type: "MERGE_DEEP", patch: responses as Record<string, unknown> },
      author: { system: "OPERATOR", reason: `Boot sequence step ${step}: ${currentBoot.pillar}` },
      options: { confidenceDelta: 0.05 },
    });
  }

  return {
    strategyId,
    currentStep: nextStep,
    totalSteps: BOOT_STEPS.length,
    currentPillar: completed ? null : BOOT_STEPS[nextStep]?.pillar ?? null,
    responses,
    completed,
  };
}

export async function complete(strategyId: string): Promise<{
  vector: Record<string, number>;
  classification: string;
}> {
  const vector = await scoreObject("strategy", strategyId);
  const classification = classifyBrand(vector.composite);

  await db.strategy.update({
    where: { id: strategyId },
    data: { status: "ACTIVE" },
  });

  return { vector, classification };
}
