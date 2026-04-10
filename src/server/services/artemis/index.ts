/**
 * ARTEMIS — Diagnostic Engine with 24 Frameworks
 * Topological sort for dependency resolution, execution orchestration
 * Real Claude AI calls for framework execution
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { FRAMEWORKS, getFramework, getFrameworksByPillar, type FrameworkDef } from "./frameworks";

export { FRAMEWORKS, getFramework, getFrameworksByPillar, getFrameworksByLayer } from "./frameworks";

/**
 * Topological sort of frameworks respecting dependencies
 */
export function topologicalSort(slugs: string[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const slug of slugs) {
    const fw = getFramework(slug);
    if (!fw) continue;
    graph.set(slug, []);
    inDegree.set(slug, 0);
  }

  for (const slug of slugs) {
    const fw = getFramework(slug);
    if (!fw) continue;
    for (const dep of fw.dependencies) {
      if (slugs.includes(dep)) {
        graph.get(dep)!.push(slug);
        inDegree.set(slug, (inDegree.get(slug) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [slug, degree] of inDegree) {
    if (degree === 0) queue.push(slug);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of graph.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

/**
 * Execute a single framework against a strategy
 */
export async function executeFramework(
  frameworkSlug: string,
  strategyId: string,
  input: Record<string, unknown>
): Promise<{ resultId: string; output: Record<string, unknown> | null; score: number | null }> {
  const fw = getFramework(frameworkSlug);
  if (!fw) throw new Error(`Framework inconnu: ${frameworkSlug}`);

  // Find or create the framework in DB
  let dbFramework = await db.framework.findUnique({ where: { slug: frameworkSlug } });
  if (!dbFramework) {
    dbFramework = await db.framework.create({
      data: {
        slug: fw.slug,
        name: fw.name,
        layer: fw.layer as never,
        description: fw.description,
        dependencies: fw.dependencies,
        inputSchema: fw.inputFields,
        outputSchema: fw.outputFields,
        promptTemplate: fw.promptTemplate,
      },
    });
  }

  // Create result record
  const result = await db.frameworkResult.create({
    data: {
      frameworkId: dbFramework.id,
      strategyId,
      pillarKey: fw.pillarKeys[0],
      input: input as never,
    },
  });

  // Create execution record
  const execution = await db.frameworkExecution.create({
    data: {
      resultId: result.id,
      status: "RUNNING",
      input: input as never,
      startedAt: new Date(),
    },
  });

  // Load strategy context for the AI call
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { pillars: true, drivers: { where: { deletedAt: null, status: "ACTIVE" } } },
  });

  const vec = strategy?.advertis_vector as Record<string, number> | null;
  const bizCtx = strategy?.businessContext as Record<string, unknown> | null;

  const strategyLines = [
    "--- CONTEXTE STRATEGIE ---",
    `Marque: ${strategy?.name ?? "N/A"}`,
    `Description: ${strategy?.description ?? "N/A"}`,
  ];
  if (vec) {
    strategyLines.push(`Score ADVE: A=${vec.a ?? 0}, D=${vec.d ?? 0}, V=${vec.v ?? 0}, E=${vec.e ?? 0}, R=${vec.r ?? 0}, T=${vec.t ?? 0}, I=${vec.i ?? 0}, S=${vec.s ?? 0}`);
    strategyLines.push(`Score composite: ${["a", "d", "v", "e", "r", "t", "i", "s"].reduce((s, k) => s + (vec[k] ?? 0), 0).toFixed(0)}/200`);
  }
  if (bizCtx) {
    strategyLines.push(`Modele d'affaires: ${bizCtx.businessModel ?? "N/A"}`);
    strategyLines.push(`Positionnement: ${bizCtx.positioningArchetype ?? "N/A"}`);
  }
  if (strategy?.pillars) {
    for (const p of strategy.pillars) {
      const content = p.content as Record<string, unknown> | null;
      if (content?.summary) strategyLines.push(`Pilier ${p.key}: ${content.summary}`);
    }
  }
  strategyLines.push("--- FIN CONTEXTE ---");

  const systemPrompt = `Tu es ARTEMIS, le moteur de diagnostic strategique de LaFusee.
Tu analyses les marques selon le protocole ADVE-RTIS (8 piliers /25 chacun, total /200).
Tu es dans la couche "${fw.layer}" et tu executes le framework "${fw.name}".
Tu dois produire une analyse structuree avec:
1. Un diagnostic detaille couvrant les champs: ${fw.outputFields.join(", ")}
2. Un score sur 10 pour la dimension analysee
3. Des prescriptions concretes et actionnables
4. Un niveau de confiance (0-1) sur ton diagnostic
Reponds en JSON avec les champs: analysis, score (0-10), prescriptions (array), confidence (0-1), ${fw.outputFields.map((f) => f).join(", ")}

${strategyLines.join("\n")}`;

  const userPrompt = `${fw.promptTemplate}

Donnees fournies:
${JSON.stringify(input, null, 2)}`;

  const startTime = Date.now();
  let output: Record<string, unknown>;
  let score: number | null = null;
  let aiCost = 0;

  try {
    const aiResult = await callLLM({
      system: systemPrompt,
      prompt: userPrompt,
      caller: `artemis:${fw.slug}`,
      strategyId,
      maxTokens: 4096,
    });

    const durationMs = Date.now() - startTime;
    const aiText = aiResult.text;

    // Parse JSON from response
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      output = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: aiText };
    } catch {
      output = { analysis: aiText };
    }

    score = typeof output.score === "number" ? output.score : null;
    const confidence = typeof output.confidence === "number" ? output.confidence : null;
    const prescriptions = Array.isArray(output.prescriptions) ? output.prescriptions : null;

    aiCost = ((aiResult.usage?.promptTokens ?? 0) / 1_000_000) * 3 + ((aiResult.usage?.completionTokens ?? 0) / 1_000_000) * 15;

    // Update execution with real data
    await db.frameworkExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        output: output as never,
        completedAt: new Date(),
        durationMs,
        aiCost,
      },
    });

    // Update result with score, confidence, prescriptions
    await db.frameworkResult.update({
      where: { id: result.id },
      data: {
        output: output as never,
        score,
        confidence,
        prescriptions: prescriptions as never,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    output = {
      error: true,
      message: error instanceof Error ? error.message : "Erreur inconnue",
      framework: fw.slug,
    };

    await db.frameworkExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Erreur inconnue",
        completedAt: new Date(),
        durationMs,
      },
    });

    await db.frameworkResult.update({
      where: { id: result.id },
      data: { output: output as never },
    });
  }

  return { resultId: result.id, output, score };
}

/**
 * Run a diagnostic batch — executes multiple frameworks in dependency order
 */
export async function runDiagnosticBatch(
  strategyId: string,
  frameworkSlugs: string[],
  inputs: Record<string, Record<string, unknown>>
): Promise<Array<{ slug: string; resultId: string; status: string }>> {
  const sorted = topologicalSort(frameworkSlugs);
  const results: Array<{ slug: string; resultId: string; status: string }> = [];

  for (const slug of sorted) {
    try {
      const input = inputs[slug] ?? {};
      const { resultId } = await executeFramework(slug, strategyId, input);
      results.push({ slug, resultId, status: "COMPLETED" });
    } catch (error) {
      results.push({ slug, resultId: "", status: "FAILED" });
    }
  }

  return results;
}

/**
 * Run all frameworks for a specific pillar
 */
export async function runPillarDiagnostic(
  strategyId: string,
  pillarKey: string,
  inputs: Record<string, Record<string, unknown>>
): Promise<Array<{ slug: string; resultId: string; status: string }>> {
  const frameworks = getFrameworksByPillar(pillarKey);
  return runDiagnosticBatch(strategyId, frameworks.map((f) => f.slug), inputs);
}

/**
 * Get diagnostic history for a strategy
 */
export async function getDiagnosticHistory(strategyId: string) {
  return db.frameworkResult.findMany({
    where: { strategyId },
    include: { framework: true, executions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Differential diagnosis — compare two points in time
 */
export async function differentialDiagnosis(strategyId: string, fromDate: Date, toDate: Date) {
  const before = await db.frameworkResult.findMany({
    where: { strategyId, createdAt: { lte: fromDate } },
    include: { framework: true },
    orderBy: { createdAt: "desc" },
  });

  const after = await db.frameworkResult.findMany({
    where: { strategyId, createdAt: { gte: fromDate, lte: toDate } },
    include: { framework: true },
    orderBy: { createdAt: "desc" },
  });

  const changes: Array<{ framework: string; beforeScore: number | null; afterScore: number | null; delta: number }> = [];

  for (const a of after) {
    const b = before.find((r) => r.frameworkId === a.frameworkId);
    changes.push({
      framework: a.framework.name,
      beforeScore: b?.score ?? null,
      afterScore: a.score ?? null,
      delta: (a.score ?? 0) - (b?.score ?? 0),
    });
  }

  return changes;
}

/**
 * Auto-trigger relevant frameworks when a pillar phase completes.
 * ADVE validated → run SURVIVAL (R) + VALIDATION (T) frameworks
 * R+T validated → run EXECUTION (I) frameworks
 * I validated → run GROWTH + EVOLUTION (S) frameworks
 *
 * This is the bridge between the 3-phase pipeline and Artemis.
 * Called non-blocking after pillar.validate() succeeds.
 */
export async function triggerNextStageFrameworks(
  strategyId: string,
  completedPillarKey: string,
): Promise<void> {
  const PHASE_TRIGGERS: Record<string, string[]> = {
    // When any ADVE pillar validates → trigger R+T diagnostic frameworks
    a: ["fw-22-risk-matrix", "fw-12-tam-sam-som", "fw-11-brand-market-fit", "fw-25-berkus-team-assessment"],
    d: ["fw-24-competitive-defense", "fw-11-brand-market-fit"],
    v: ["fw-04-value-architecture", "fw-06-unit-economics", "fw-27-berkus-product", "fw-28-berkus-ip"],
    e: ["fw-07-touchpoint-mapping", "fw-09-devotion-pathway"],
    // When R validates → trigger T + execution prep
    r: ["fw-12-tam-sam-som", "fw-10-attribution-model"],
    // When T validates → trigger I (execution catalog) + Berkus traction
    t: ["fw-13-90-day-roadmap", "fw-14-campaign-architecture", "fw-15-team-blueprint", "fw-26-berkus-traction"],
    // When I validates → trigger S (growth + strategy)
    i: ["fw-18-growth-loops", "fw-19-expansion-strategy", "fw-20-brand-evolution"],
    // S validated → trigger measurement
    s: ["fw-16-kpi-framework"],
  };

  const frameworkSlugs = PHASE_TRIGGERS[completedPillarKey.toLowerCase()];
  if (!frameworkSlugs || frameworkSlugs.length === 0) return;

  // Filter to only existing frameworks
  const validSlugs = frameworkSlugs.filter((slug) => getFramework(slug));
  if (validSlugs.length === 0) return;

  // Non-blocking execution — don't wait for completion
  runDiagnosticBatch(strategyId, validSlugs, {}).catch((err) => {
    console.warn(`[artemis] Auto-trigger failed for ${completedPillarKey}:`, err instanceof Error ? err.message : err);
  });
}

// ============================================================================
// GLORY Tools — Artemis's arsenal (Phase 3 migration)
// Re-export everything from tools/ so Artemis exposes both frameworks AND tools
// ============================================================================
export * from "./tools";

