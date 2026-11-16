import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/quick-intake/prospect-emails", () => ({ sendIntakeResumeEmail: vi.fn() }));
vi.mock("@/server/services/quick-intake/question-bank", () => ({
  getBusinessContextQuestions: () => [], getAdaptiveQuestions: async () => [],
}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { start, advance, complete } from "@/server/services/quick-intake";

const tokens: string[] = [];
const emails: string[] = [];
const contactWrites: Promise<unknown>[] = [];
const upsertContact = db.crmContact.upsert.bind(db.crmContact);
const claim = { statement: "Les décisions doivent avoir des preuves", audience: "Public synthétique de recette",
  baselineZone: "RADICAL" as const, targetZone: "POPULAR" as const };
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  // start() deliberately does not await CRM. Track its real writes so cleanup
  // cannot race a late contact insert; no persistence or result is replaced.
  vi.spyOn(db.crmContact, "upsert").mockImplementation(args => {
    const writing = upsertContact(args);
    if (args.where.email && emails.includes(args.where.email)) contactWrites.push(Promise.resolve(writing));
    return writing;
  });
});
afterAll(async () => {
  try {
    await Promise.allSettled(contactWrites);
    const contacts = await db.crmContact.findMany({ where: { email: { in: emails } }, select: { id: true } });
    await db.crmContact.deleteMany({ where: { id: { in: contacts.map(contact => contact.id) } } });
    await db.quickIntake.deleteMany({ where: { shareToken: { in: tokens } } });
  } finally { vi.restoreAllMocks(); await db.$disconnect(); }
});
describe.sequential("Overton entry preserves the real intake progression", () => {
  it("persists the declared idea while business context and ADVE remain distinct steps", async () => {
    const contactEmail = `overton-${randomUUID()}@shinkiro.invalid`; emails.push(contactEmail);
    const result = await start({ companyName: "Overton isolated fixture", contactName: "Synthetic",
      contactEmail, overtonClaim: claim });
    tokens.push(result.token);
    expect(result.currentPillar).toBe("biz"); expect(result.progress).toBe(0);
    const next = await advance({ token: result.token, responses: { biz: { biz_model: "SERVICES" } } });
    expect(next.currentPillar).toBe("a"); expect(next.progress).toBe(0.2);
    for (const [index, phase] of ["a", "d", "v", "e"].entries()) {
      const step = await advance({ token: result.token, responses: { [phase]: { [`${phase}_answer`]: "Réponse de recette" } } });
      expect(step.progress).toBe((index + 2) / 5);
      expect(step.readyToComplete).toBe(index === 3);
    }
    const saved = await db.quickIntake.findUniqueOrThrow({ where: { shareToken: result.token } });
    expect((saved.responses as Record<string, unknown>)._overton).toEqual(claim);
    expect(saved.businessModel).toBe("SERVICES");
  });
  it("does not treat the idea alone as completed ADVE answers", async () => {
    const contactEmail = `overton-${randomUUID()}@shinkiro.invalid`; emails.push(contactEmail);
    const result = await start({ companyName: "Overton no answers", contactName: "Synthetic",
      contactEmail, overtonClaim: claim });
    tokens.push(result.token);
    await expect(complete(result.token)).rejects.toThrow(/no phase has substantive answers/);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { shareToken: result.token } })).convertedToId).toBeNull();
  });
});
