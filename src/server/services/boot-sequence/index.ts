import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

import { scoreObject } from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { callLLM } from "@/server/services/llm-gateway";
import { getFormatInstructions } from "@/lib/types/variable-bible";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";

interface BootState {
  strategyId: string;
  currentStep: number;
  totalSteps: number;
  currentPillar: string | null;
  responses: Record<string, unknown>;
  completed: boolean;
  questions?: GeneratedQuestion[];
}

interface GeneratedQuestion {
  key: string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "select";
  options?: string[];
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

// ── LLM-driven question generation per pillar ─────────────────────────────

async function generateQuestions(
  pillarKey: string,
  existingContent: Record<string, unknown>,
): Promise<GeneratedQuestion[]> {
  const schemaKey = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[schemaKey];
  if (!schema) return [];

  const fieldKeys = Object.keys(schema);
  const bibleRules = getFormatInstructions(pillarKey, fieldKeys);

  const filled = Object.keys(existingContent).filter(
    (k) => existingContent[k] !== null && existingContent[k] !== undefined && existingContent[k] !== "",
  );

  const { text } = await callLLM({
    system: `Tu es Mestor, le commandant strategique du systeme ADVE.
Tu generes des questions de diagnostic de marque pour le pilier "${pillarKey}".
Reponds UNIQUEMENT en JSON (array d'objets).

Regles Bible format:
${bibleRules}`,
    prompt: `Pilier: ${pillarKey}
Schema du pilier: ${JSON.stringify(schema, null, 2)}
Champs deja remplis: ${JSON.stringify(filled)}
Contenu existant: ${JSON.stringify(existingContent)}

Genere 3-5 questions adaptatives pour les champs manquants ou incomplets.
Chaque question: { "key": "<field_key>", "label": "<question en francais>", "hint": "<aide contextuelle>", "type": "text"|"textarea"|"select", "options": ["..."] }
Si le type n'est pas "select", omets "options".
Retourne un JSON array pur, sans markdown.`,
    caller: "boot-sequence:generate-questions",
    maxOutputTokens: 2000,
  });

  try {
    const parsed = JSON.parse(text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Persistence helpers ───────────────────────────────────────────────────

async function persistBootState(strategyId: string, state: BootState): Promise<void> {
  const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { businessContext: true } });
  const ctx = (strategy?.businessContext as Record<string, unknown>) ?? {};
  await db.strategy.update({
    where: { id: strategyId },
    data: {
      businessContext: JSON.parse(JSON.stringify({ ...ctx, bootState: state })) as Prisma.InputJsonValue,
    },
  });
}

// ── getState — Resume mid-session ─────────────────────────────────────────

export async function getState(strategyId: string): Promise<BootState | null> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { businessContext: true },
  });
  if (!strategy) return null;
  const ctx = strategy.businessContext as Record<string, unknown> | null;
  const saved = ctx?.bootState as BootState | undefined;
  return saved ?? null;
}

// ── start ─────────────────────────────────────────────────────────────────

export async function start(strategyId: string): Promise<BootState> {
  const firstPillar = BOOT_STEPS[0]!.pillar;
  const questions = await generateQuestions(firstPillar, {});

  const state: BootState = {
    strategyId,
    currentStep: 0,
    totalSteps: BOOT_STEPS.length,
    currentPillar: firstPillar,
    responses: {},
    completed: false,
    questions,
  };

  await persistBootState(strategyId, state);
  return state;
}

export async function advance(
  strategyId: string,
  step: number,
  responses: Record<string, unknown>
): Promise<BootState> {
  const nextStep = step + 1;
  const completed = nextStep >= BOOT_STEPS.length;

  // Save pillar content via Gateway
  const currentBoot = BOOT_STEPS[step];
  if (currentBoot) {
    const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
    await writePillarAndScore({
      strategyId,
      pillarKey: currentBoot.pillar as import("@/lib/types/advertis-vector").PillarKey,
      operation: { type: "MERGE_DEEP", patch: responses as Record<string, unknown> },
      author: { system: "OPERATOR", reason: `Boot sequence step ${step}: ${currentBoot.pillar}` },
      options: { confidenceDelta: 0.05 },
    });
  }

  // Generate questions for next step via Mestor
  let questions: GeneratedQuestion[] = [];
  const nextPillar = completed ? null : BOOT_STEPS[nextStep]?.pillar ?? null;
  if (!completed && nextPillar) {
    // Load existing content for the next pillar to adapt questions
    const pillarRow = await db.pillar.findFirst({
      where: { strategyId, key: nextPillar },
      select: { content: true },
    });
    const existing = (pillarRow?.content as Record<string, unknown>) ?? {};
    questions = await generateQuestions(nextPillar, existing);
  }

  const state: BootState = {
    strategyId,
    currentStep: nextStep,
    totalSteps: BOOT_STEPS.length,
    currentPillar: nextPillar,
    responses,
    completed,
    questions,
  };

  // Persist boot state for resume
  await persistBootState(strategyId, state);

  return state;
}

export async function complete(strategyId: string): Promise<{
  vector: Record<string, number>;
  classification: string;
}> {
  // Normalize all pillar content before scoring
  const { normalizePillarForIntake } = await import("@/server/services/pillar-normalizer");
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  for (const p of pillars) {
    const content = (p.content as Record<string, unknown>) ?? {};
    const normalized = normalizePillarForIntake(p.key, content);
    if (normalized !== content) {
      await db.pillar.update({
        where: { id: p.id },
        data: { content: normalized as Prisma.InputJsonValue },
      });
    }
  }

  // Score and classify
  const vector = await scoreObject("strategy", strategyId);
  const classification = classifyBrand(vector.composite);

  // Activate strategy and clear boot state
  const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { businessContext: true } });
  const ctx = (strategy?.businessContext as Record<string, unknown>) ?? {};
  delete ctx.bootState;
  await db.strategy.update({
    where: { id: strategyId },
    data: {
      status: "ACTIVE",
      businessContext: ctx as Prisma.InputJsonValue,
    },
  });

  // Trigger Notoria batch via Mestor.emitIntent.
  // Phase=BOOT → Artemis routes to ADVE_BOOT_FILL (R+T optional, not required).
  // Spawns INDEX_BRAND_CONTEXT for Seshat indexing (FULL scope at boot).
  try {
    const { emitIntent } = await import("@/server/services/mestor/intents");
    await emitIntent(
      {
        kind: "FILL_ADVE",
        phase: "BOOT",
        strategyId,
      },
      { caller: "boot-sequence" },
    );
  } catch {
    // Non-blocking — boot still completes if intent dispatch fails
  }

  return { vector, classification };
}
