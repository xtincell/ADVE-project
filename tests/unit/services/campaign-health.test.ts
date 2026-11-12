/**
 * Santé automatique de campagne — calcul déterministe à partir des tâches réelles.
 * Aucun modèle ni horloge implicite : `now` est injecté, la même entrée rend la même sortie.
 */
import { describe, expect, it } from "vitest";
import { computeCampaignHealth, computeRAG, type CampaignHealthTask } from "@/server/services/campaign-deliverable";

const NOW = new Date("2026-11-11T12:00:00.000Z");
const day = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * day);
function task(overrides: Partial<CampaignHealthTask> = {}): CampaignHealthTask {
  return { status: "TODO", dueDate: null, deliveredAt: null, manualRagOverride: null, openChangeRequests: 0, ...overrides };
}
const calm = { isCritical: false, creativeState: "EN_PRODUCTION", now: NOW };

describe("computeCampaignHealth — no green without evidence", () => {
  it("declares a campaign without task not computable instead of green", () => {
    const health = computeCampaignHealth({ ...calm, tasks: [] });
    expect(health).toMatchObject({ calculable: false, signal: null });
    expect(health.reasons.join(" ")).toMatch(/Aucune tâche/);
  });

  it("does not turn undated, unfinished tasks into a healthy campaign", () => {
    const health = computeCampaignHealth({ ...calm, tasks: [task(), task({ status: "IN_PROGRESS" })] });
    expect(health).toMatchObject({ calculable: false, signal: null });
    expect(health.reasons.join(" ")).toMatch(/2 tâches sans échéance/);
  });

  it("returns green only when every task carries evidence", () => {
    const health = computeCampaignHealth({ ...calm, tasks: [
      task({ status: "VALIDATED" }),
      task({ status: "DELIVERED", deliveredAt: at(-1) }),
      task({ dueDate: at(10) }),
      task({ manualRagOverride: "GREEN" }),
    ] });
    expect(health).toEqual({ calculable: true, signal: "GREEN", reasons: expect.any(Array) });
  });

  it("is red as soon as one task is overdue, even beside unmeasured tasks", () => {
    const health = computeCampaignHealth({ ...calm, tasks: [task({ dueDate: at(-2) }), task()] });
    expect(health).toMatchObject({ calculable: true, signal: "RED" });
    expect(health.reasons.join(" ")).toMatch(/1 tâche en retard/);
  });

  it("is amber when a deadline is close, and reports the unmeasured task", () => {
    const health = computeCampaignHealth({ ...calm, tasks: [task({ dueDate: at(2) }), task()] });
    expect(health).toMatchObject({ calculable: true, signal: "AMBER" });
    expect(health.reasons.join(" ")).toMatch(/1 tâche sans échéance/);
  });

  it("counts an open change request as a blocker of its task", () => {
    expect(computeCampaignHealth({ ...calm, tasks: [task({ status: "VALIDATED", openChangeRequests: 0 }), task({ dueDate: at(10), openChangeRequests: 1 })] }))
      .toMatchObject({ calculable: true, signal: "AMBER" });
    expect(computeCampaignHealth({ ...calm, tasks: [task({ openChangeRequests: 2 })] }))
      .toMatchObject({ calculable: true, signal: "AMBER" });
  });

  it("keeps a task's manual status as that task's health", () => {
    expect(computeCampaignHealth({ ...calm, tasks: [task({ dueDate: at(-5), manualRagOverride: "AMBER" })] }))
      .toMatchObject({ calculable: true, signal: "AMBER" });
    expect(computeCampaignHealth({ ...calm, tasks: [task({ status: "VALIDATED", manualRagOverride: "RED" })] }))
      .toMatchObject({ calculable: true, signal: "RED" });
  });

  it("raises a critical or blocked campaign to amber and both together to red", () => {
    const tasks = [task({ status: "VALIDATED" })];
    expect(computeCampaignHealth({ ...calm, tasks, isCritical: true })).toMatchObject({ signal: "AMBER" });
    expect(computeCampaignHealth({ ...calm, tasks, creativeState: "BLOQUE" })).toMatchObject({ signal: "AMBER" });
    expect(computeCampaignHealth({ ...calm, tasks, isCritical: true, creativeState: "BLOQUE" })).toMatchObject({ signal: "RED" });
  });

  it("does not let a campaign flag make an empty campaign computable", () => {
    expect(computeCampaignHealth({ ...calm, tasks: [], isCritical: true, creativeState: "BLOQUE" }))
      .toMatchObject({ calculable: false, signal: null });
  });

  it("is deterministic for the same input and injected date", () => {
    const input = { ...calm, tasks: [task({ dueDate: at(1) }), task({ status: "VALIDATED" })] };
    expect(computeCampaignHealth(input)).toEqual(computeCampaignHealth(input));
  });

  it("reuses the task calculation instead of a second engine", () => {
    const tasks = [task({ dueDate: at(-1) }), task({ dueDate: at(1) }), task({ dueDate: at(20) })];
    const perTask = tasks.map(t => computeRAG({ status: t.status, dueDate: t.dueDate, deliveredAt: t.deliveredAt,
      manualOverride: t.manualRagOverride, blockerCount: t.openChangeRequests, now: NOW }));
    expect(perTask).toEqual(["RED", "AMBER", "GREEN"]);
    expect(computeCampaignHealth({ ...calm, tasks })).toMatchObject({ signal: "RED" });
  });
});
