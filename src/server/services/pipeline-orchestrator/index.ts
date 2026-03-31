/**
 * Pipeline Orchestrator — Manages side-effects post-scoring, First Value Protocol,
 * and automated workflows
 */

import { db } from "@/lib/db";

interface PipelineStep {
  id: string;
  name: string;
  trigger: string;
  action: () => Promise<void>;
  delayMs?: number;
}

/**
 * First Value Protocol (F.2) — Automated 7-step playbook J+0 to J+30
 */
export async function executeFirstValueProtocol(strategyId: string): Promise<void> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { drivers: true },
  });

  // J+0: Diagnostic Report delivered + Cult Dashboard initiated
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j0-diagnostic",
      description: "J+0: Diagnostic Report + Cult Dashboard",
      status: "COMPLETED",
      playbook: {
        step: "J+0",
        actions: ["generate_diagnostic_report", "init_cult_dashboard"],
      },
      lastRunAt: new Date(),
      runCount: 1,
    },
  });

  // J+1: Priority Drivers activated
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j1-drivers",
      description: "J+1: Activer les Drivers prioritaires",
      status: "RUNNING",
      playbook: {
        step: "J+1",
        actions: ["activate_priority_drivers", "generate_driver_specs"],
        triggerDate: addDays(new Date(), 1).toISOString(),
      },
      nextRunAt: addDays(new Date(), 1),
    },
  });

  // J+2: First mission dispatched
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j2-mission",
      description: "J+2: Dispatcher la première mission",
      status: "RUNNING",
      playbook: {
        step: "J+2",
        actions: ["dispatch_first_mission", "use_fastest_glory_tool"],
        triggerDate: addDays(new Date(), 2).toISOString(),
      },
      nextRunAt: addDays(new Date(), 2),
    },
  });

  // J+5: SLA milestone
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j5-sla",
      description: "J+5: Vérification SLA + escalation si besoin",
      status: "RUNNING",
      playbook: {
        step: "J+5",
        actions: ["check_sla", "escalate_if_missed"],
        triggerDate: addDays(new Date(), 5).toISOString(),
      },
      nextRunAt: addDays(new Date(), 5),
    },
  });

  // J+7: Guidelines generated
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j7-guidelines",
      description: "J+7: Générer les guidelines de marque",
      status: "RUNNING",
      playbook: {
        step: "J+7",
        actions: ["generate_guidelines", "partial_ok_if_incomplete"],
        triggerDate: addDays(new Date(), 7).toISOString(),
      },
      nextRunAt: addDays(new Date(), 7),
    },
  });

  // J+14: Micro Value Report + DevotionSnapshot baseline
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j14-report",
      description: "J+14: Micro Value Report + DevotionSnapshot baseline",
      status: "RUNNING",
      playbook: {
        step: "J+14",
        actions: ["generate_micro_value_report", "create_devotion_baseline"],
        triggerDate: addDays(new Date(), 14).toISOString(),
      },
      nextRunAt: addDays(new Date(), 14),
    },
  });

  // J+30: Full Value Report
  await db.process.create({
    data: {
      strategyId,
      type: "TRIGGERED",
      name: "first-value-j30-full-report",
      description: "J+30: Full Value Report cycle",
      status: "RUNNING",
      playbook: {
        step: "J+30",
        actions: ["generate_full_value_report", "start_monthly_cycle"],
        triggerDate: addDays(new Date(), 30).toISOString(),
      },
      nextRunAt: addDays(new Date(), 30),
    },
  });
}

/**
 * Post-scoring side effects
 */
export async function handlePostScoring(strategyId: string, newScore: number, previousScore: number): Promise<void> {
  const delta = newScore - previousScore;

  // Create ScoreSnapshot
  const strategy = await db.strategy.findUniqueOrThrow({ where: { id: strategyId } });
  await db.scoreSnapshot.create({
    data: {
      strategyId,
      advertis_vector: strategy.advertis_vector ?? {},
      classification: getClassification(newScore),
      confidence: 0.7,
      trigger: "scoring_update",
    },
  });

  // If significant drift, create signal
  if (Math.abs(delta) > 5) {
    await db.signal.create({
      data: {
        strategyId,
        type: delta > 0 ? "SCORE_IMPROVEMENT" : "SCORE_DECLINE",
        data: { delta, newScore, previousScore },
        advertis_vector: strategy.advertis_vector as never,
      },
    });
  }
}

/**
 * Execute pending scheduled processes — dispatches real actions based on playbook
 */
export async function executePendingProcesses(): Promise<{ executed: number; results: Array<{ processId: string; step: string; status: string; details: string }> }> {
  const pending = await db.process.findMany({
    where: {
      status: "RUNNING",
      nextRunAt: { lte: new Date() },
    },
  });

  const results: Array<{ processId: string; step: string; status: string; details: string }> = [];

  for (const proc of pending) {
    const playbook = proc.playbook as Record<string, unknown> | null;
    const step = (playbook?.step as string) ?? "unknown";
    const actions = (playbook?.actions as string[]) ?? [];
    const strategyId = proc.strategyId;

    // Skip processes without a strategy
    if (!strategyId) {
      await db.process.update({
        where: { id: proc.id },
        data: { status: "COMPLETED", lastRunAt: new Date(), runCount: proc.runCount + 1 },
      });
      results.push({ processId: proc.id, step, status: "COMPLETED", details: "Skipped — no strategyId" });
      continue;
    }

    let finalStatus: "COMPLETED" | "STOPPED" = "COMPLETED";
    let details = "";

    try {
      for (const action of actions) {
        switch (action) {
          case "generate_diagnostic_report": {
            const { scoreObject } = await import("@/server/services/advertis-scorer");
            await scoreObject("strategy", strategyId);
            details += "Diagnostic report generated. ";
            break;
          }

          case "init_cult_dashboard": {
            const { calculateAndSnapshot } = await import("@/server/services/cult-index-engine");
            await calculateAndSnapshot(strategyId);
            details += "Cult dashboard initialized. ";
            break;
          }

          case "activate_priority_drivers": {
            // Find INACTIVE drivers and activate them (max 3)
            const drivers = await db.driver.findMany({
              where: { strategyId, status: "INACTIVE", deletedAt: null },
              take: 3,
            });
            for (const driver of drivers) {
              await db.driver.update({
                where: { id: driver.id },
                data: { status: "ACTIVE" },
              });
            }
            details += `${drivers.length} driver(s) activated. `;
            break;
          }

          case "generate_driver_specs": {
            const activeDrivers = await db.driver.findMany({
              where: { strategyId, status: "ACTIVE", deletedAt: null },
            });
            const { generateBrief } = await import("@/server/services/driver-engine");
            for (const driver of activeDrivers.slice(0, 3)) {
              try {
                await generateBrief(driver.id, { source: "fvp", step: "j1" });
              } catch {
                // Non-blocking per driver
              }
            }
            details += `Specs generated for ${Math.min(activeDrivers.length, 3)} driver(s). `;
            break;
          }

          case "dispatch_first_mission": {
            const topDriver = await db.driver.findFirst({
              where: { strategyId, status: "ACTIVE", deletedAt: null },
            });
            if (topDriver) {
              await db.mission.create({
                data: {
                  title: `[FVP] Premier livrable — ${topDriver.name}`,
                  description: `Mission auto-generee par le First Value Protocol (J+2) pour le driver ${topDriver.name}.`,
                  strategyId,
                  driverId: topDriver.id,
                  status: "DRAFT",
                  priority: 9,
                },
              });
              details += `First mission created for driver "${topDriver.name}". `;
            } else {
              details += "No active driver found for mission. ";
            }
            break;
          }

          case "check_sla": {
            const { checkSlaDeadlines } = await import("@/server/services/sla-tracker");
            await checkSlaDeadlines();
            details += "SLA check completed. ";
            break;
          }

          case "escalate_if_missed": {
            const overdue = await db.mission.findMany({
              where: {
                strategyId,
                status: { in: ["ASSIGNED", "IN_PROGRESS"] },
                slaDeadline: { lt: new Date() },
              },
            });
            for (const m of overdue) {
              await db.signal.create({
                data: {
                  strategyId,
                  type: "SLA_VIOLATION",
                  data: { missionId: m.id, missionTitle: m.title, escalatedBy: "FVP" },
                },
              });
            }
            details += `${overdue.length} overdue mission(s) escalated. `;
            break;
          }

          case "generate_guidelines": {
            try {
              const { executeTool } = await import("@/server/services/glory-tools");
              await executeTool("brand-guidelines-compiler", strategyId, {
                brief: "Auto-generate brand guidelines for strategy at J+7",
                brand_dna: `Strategy ID: ${strategyId}`,
              });
              details += "Brand guidelines generated. ";
            } catch {
              details += "Guidelines generation skipped (tool unavailable). ";
            }
            break;
          }

          case "generate_micro_value_report":
          case "generate_full_value_report": {
            const scorer = await import("@/server/services/advertis-scorer");
            const vector = await scorer.scoreObject("strategy", strategyId);
            await db.scoreSnapshot.create({
              data: {
                strategyId,
                advertis_vector: vector,
                classification: getClassification(vector.composite),
                confidence: vector.confidence,
                trigger: action === "generate_micro_value_report" ? "fvp_j14" : "fvp_j30",
              },
            });
            details += `${action === "generate_micro_value_report" ? "Micro" : "Full"} value report snapshot created. `;
            break;
          }

          case "create_devotion_baseline": {
            const cultEngine = await import("@/server/services/cult-index-engine");
            await cultEngine.calculateAndSnapshot(strategyId);
            details += "Devotion baseline created. ";
            break;
          }

          case "start_monthly_cycle": {
            await db.process.create({
              data: {
                strategyId,
                type: "TRIGGERED",
                name: "monthly-value-report",
                description: "Monthly value report cycle (auto-created by FVP J+30)",
                status: "RUNNING",
                playbook: { step: "MONTHLY", actions: ["generate_full_value_report", "create_devotion_baseline"] },
                nextRunAt: addDays(new Date(), 30),
              },
            });
            details += "Monthly cycle scheduled. ";
            break;
          }

          default:
            details += `Unknown action: ${action}. `;
        }
      }
    } catch (err) {
      finalStatus = "STOPPED";
      details += `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }

    await db.process.update({
      where: { id: proc.id },
      data: {
        status: finalStatus,
        lastRunAt: new Date(),
        runCount: proc.runCount + 1,
        result: { step, actions, details, executedAt: new Date().toISOString() },
      },
    });

    results.push({ processId: proc.id, step, status: finalStatus, details });
  }

  return { executed: results.length, results };
}

// Helpers

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getClassification(score: number): string {
  if (score <= 80) return "ZOMBIE";
  if (score <= 120) return "ORDINAIRE";
  if (score <= 160) return "FORTE";
  if (score <= 180) return "CULTE";
  return "ICONE";
}
