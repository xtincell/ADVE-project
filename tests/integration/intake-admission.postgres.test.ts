import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";
import * as service from "@/server/services/quick-intake";
import { _resetProvidersForTest } from "@/server/services/llm-gateway";
import { _resetRateLimiterForTest } from "@/server/services/llm-gateway/rate-policy";
const ids: string[] = [];
const caller = () => quickIntakeRouter.createCaller({ db, session: null, headers: undefined });
async function fixture() {
  const i = await db.quickIntake.create({ data: { companyName: "Admission détenue " + randomUUID(),
    contactName: "Recette", contactEmail: randomUUID() + "@shinkiro.invalid", status: "IN_PROGRESS",
    rawText: "Texte reçu à conserver", responses: { a: { a_mission: "Documenter les décisions reçues." } } } });
  ids.push(i.id); return i;
}
function providers(available: boolean) {
  _resetProvidersForTest({ openai: { available }, anthropic: { available: false }, ollama: { available: false }, openrouter: { available: false } });
}
beforeAll(() => {
  const u = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(u.hostname); expect(u.pathname).toBe("/shinkiro_verify");
});
beforeEach(() => {
  vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai"); vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
  vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "owned-not-a-real-provider-token"); vi.stubEnv("LUNA_CONCURRENCY", "1"); providers(true); _resetRateLimiterForTest();
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); _resetProvidersForTest(); _resetRateLimiterForTest();
  await db.quickIntake.deleteMany({ where: { id: { in: ids } } }); ids.length = 0;
});
afterAll(() => db.$disconnect());

async function overlap(same: boolean, expectedCalls: number) {
  const a = await fixture(), b = same ? a : await fixture();
  let release!: () => void, entered!: () => void, secondSettled = false;
  const gate = new Promise<void>(r => { release = r; }); const started = new Promise<void>(r => { entered = r; });
  // Only the expensive generator is replaced. Claims, policy, transactions and rows are real.
  const work = vi.spyOn(service, "complete").mockImplementation(async () => { entered(); await gate; throw new Error("owned-work-failed"); });
  const first = caller().complete({ token: a.shareToken });
  const firstDone = first.catch(e => e);
  let secondDone: Promise<unknown> | undefined;
  try {
    await started;
    secondDone = caller().complete({ token: b.shareToken }).then(r => { secondSettled = true; return r; }, e => { secondSettled = true; return e; });
    await vi.waitFor(() => expect(secondSettled || work.mock.calls.length > 1).toBe(true));
    release(); const result = await secondDone; await firstDone;
    expect(work).toHaveBeenCalledTimes(expectedCalls);
    return { a, b, result, work };
  } finally { release(); await firstDone; await secondDone; }
}

describe.sequential("owned PostgreSQL public audit admission, no provider request", () => {
  it("admits one concurrent completion for the same intake and leaves a retryable failure", async () => {
    const { a, result } = await overlap(true, 1);
    expect(result).toMatchObject({ code: "CONFLICT" });
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("FAILED");
  });

  it("shares the declared Luna capacity across intakes and releases it after failure", async () => {
    const { a, b, result, work } = await overlap(false, 1);
    expect(result).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    const saved = await db.quickIntake.findUniqueOrThrow({ where: { id: b.id } });
    expect(saved.status).toBe("IN_PROGRESS"); expect(saved.rawText).toBe(b.rawText); expect(saved.responses).toEqual(b.responses);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("FAILED");
    // A fresh caller derives capacity from the terminal rows, without a process-local busy flag.
    await expect(caller().complete({ token: b.shareToken })).rejects.toThrow("owned-work-failed");
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("does not gate two manual completions on an absent model", async () => {
    providers(false);
    const { result } = await overlap(false, 2);
    expect(result).toMatchObject({ message: "owned-work-failed" });
  });

  it("uses the existing model concurrency setting instead of a second independent limit", async () => {
    vi.stubEnv("LUNA_CONCURRENCY", "2"); _resetRateLimiterForTest();
    const { result } = await overlap(false, 2);
    expect(result).toMatchObject({ message: "owned-work-failed" });
  });
});
