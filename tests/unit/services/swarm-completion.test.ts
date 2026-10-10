import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ steps: [] as Array<{ status: string; description: string }> }));
vi.mock("@/server/services/mestor/hyperviseur", () => ({
  buildPlan: vi.fn(async () => ({ phase: "BOOT", steps: fixture.steps })),
  executePlan: vi.fn(async plan => plan),
}));
vi.mock("@/server/services/mestor/commandant", () => ({}));
vi.mock("@/server/services/mestor/pillar-directors", () => ({}));
vi.mock("@/server/services/rtis-protocols", () => ({}));
import { runPipeline } from "@/server/services/mestor/swarm";

beforeEach(() => { fixture.steps = []; });
describe("the existing pipeline reports its actual terminal state", () => {
  it("a failed final step cannot make a pipeline complete", async () => {
    fixture.steps = [{ status: "FAILED", description: "Plan refusé" }];
    const result = await runPipeline("synthetic");
    expect(result.summary).toMatchObject({ failed: 1, pending: 0, waiting: 0, isComplete: false, isBlocked: true });
    expect(result.summary.needsHumanAction).toBeNull();
  });
  it.each(["PENDING", "RUNNING", "WAITING"])("a %s step remains unfinished", async status => {
    fixture.steps = [{ status, description: "En attente" }];
    expect((await runPipeline("synthetic")).summary.isComplete).toBe(false);
  });
  it("conserves the existing completion meaning of completed and skipped steps", async () => {
    fixture.steps = ["COMPLETED", "SKIPPED"].map(status => ({ status, description: status }));
    expect((await runPipeline("synthetic")).summary).toMatchObject({ completed: 1, failed: 0, isComplete: true, isBlocked: false });
  });
  it("still returns the human step that blocks execution", async () => {
    fixture.steps = [{ status: "WAITING", description: "Relire les choix" }];
    expect((await runPipeline("synthetic")).summary).toMatchObject({ isBlocked: true, needsHumanAction: "Relire les choix" });
  });
});
