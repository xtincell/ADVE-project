import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const authMock = vi.hoisted(() => vi.fn<() => Promise<{ user: { id: string; role: "ADMIN" } } | null>>());
vi.mock("@/lib/auth/config", () => ({ auth: authMock }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
// Route dispatch only here; a real browser/PDF receipt is required separately.
vi.mock("@/server/services/value-report-generator/intake-pdf", () => ({ renderIntakePdf: vi.fn(async () => ({ pdf: Buffer.from("route-dispatch-only"), bytes: 19 })) }));
import { db } from "@/lib/db";
import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";
import { paymentRouter } from "@/server/trpc/routers/payment";
import { GET } from "@/app/api/intake/[token]/pdf/route";
import * as intakeService from "@/server/services/quick-intake";

const intakes: string[] = [], tokens: string[] = [], brands: string[] = [], users: string[] = [];
const diagnostic = { narrativeReport: { executiveSummary: "Synthèse gratuite", adve: [{ key: "a", name: "Authenticité", preview: "Aperçu gratuit", full: "DETAIL_ADVE_PAYANT" }],
  rtis: { framing: "Première lecture", pillars: [{ key: "r", name: "Risques", preview: "Résumé", full: Array.from({ length: 10 }, (_, i) => i === 9 ? "DETAIL_RTIS_PAYANT" : `Proposition ${i + 1}`).join("\n"), priority: "P1", keyMove: "Documenter la preuve" }] } } };
function caller(role?: "ADMIN") { return quickIntakeRouter.createCaller({ db, headers: undefined, session: role ? { user: { id: users[0]!, role }, expires: new Date(Date.now() + 60000).toISOString() } : null }); }
const payments = () => paymentRouter.createCaller({ db, headers: undefined, session: null });
async function fixture() {
  const u = await db.user.create({ data: { email: `intake-access-${randomUUID()}@example.invalid` } }); users.push(u.id);
  const s = await db.strategy.create({ data: { name: "Recette droits rapport", userId: u.id, status: "QUICK_INTAKE" } }); brands.push(s.id);
  const i = await db.quickIntake.create({ data: { companyName: "Recette droits", contactName: "Recette locale", contactEmail: u.email, status: "COMPLETED", responses: {}, diagnostic, convertedToId: s.id } }); intakes.push(i.id); tokens.push(i.shareToken);
  await db.pillar.create({ data: { strategyId: s.id, key: "a", content: { missionStatement: "Mission fournie", valeurs: ["Clarté"], originMyth: "TROISIEME_CHAMP_PAYANT", narrativeFull: "NARRATIF_PAYANT", _fieldProvenance: { missionStatement: "SOURCE", valeurs: "INFERRED", originMyth: "INFERRED" } } } });
  await db.recommendation.createMany({ data: Array.from({ length: 3 }, (_, n) => ({ strategyId: s.id, targetPillarKey: "a", targetField: `field-${n}`, agent: "HUMAN", source: "INTAKE", missionType: "ADVE_INTAKE", confidence: .5, explain: `Proposition de recette ${n}`, impact: "HIGH", status: "PENDING" })) });
  return i;
}
async function payment(token: string, status: "PENDING" | "PAID" | "FAILED") {
  return db.intakePayment.create({ data: { intakeToken: token, reference: `local-access-${randomUUID()}`, status, provider: "MOCK", amount: 100, currency: "EUR", tierKey: "INTAKE_PDF" } });
}
beforeAll(() => { const u = new URL(process.env.DATABASE_URL!); expect(["127.0.0.1", "localhost"]).toContain(u.hostname); expect(u.pathname).toBe("/shinkiro_verify"); });
afterAll(async () => {
  await db.intakePayment.deleteMany({ where: { intakeToken: { in: tokens } } });
  await db.quickIntake.deleteMany({ where: { id: { in: intakes } } });
  await db.recommendation.deleteMany({ where: { strategyId: { in: brands } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
describe.sequential("server-authorized intake report on actual PostgreSQL", () => {
  it("ignores a client paid flag when no payment exists", async () => {
    const i = await fixture();
    const r = await caller().getRecosByToken({ token: i.shareToken, paid: true });
    expect(r.recos).toHaveLength(2); expect(r.totalCount).toBe(3); expect(r.isPreview).toBe(true);
  });
  it.each(["PENDING", "FAILED"] as const)("does not unlock with a %s row", async status => {
    const i = await fixture(); await payment(i.shareToken, status);
    expect((await caller().getRecosByToken({ token: i.shareToken, paid: true })).recos).toHaveLength(2);
  });
  it("withholds paid narrative and fields in the anonymous server response", async () => {
    const i = await fixture(); const r = await caller().getByToken({ token: i.shareToken });
    const text = JSON.stringify(r);
    expect(text).toContain("Aperçu gratuit"); expect(text).toContain("Proposition 9");
    expect(text).not.toContain("DETAIL_ADVE_PAYANT"); expect(text).not.toContain("DETAIL_RTIS_PAYANT");
    const pillars = await caller().getPillarsByToken({ token: i.shareToken });
    expect(JSON.stringify(pillars)).not.toContain("TROISIEME_CHAMP_PAYANT");
    expect(JSON.stringify(pillars)).not.toContain("NARRATIF_PAYANT");
    expect(pillars.pillars[0]?.totalFields).toBe(3);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).diagnostic).toEqual(diagnostic);
  });
  it("restores the same paid report without a callback URL or client flag", async () => {
    const i = await fixture(); await payment(i.shareToken, "PAID");
    expect((await caller().getByToken({ token: i.shareToken }))?.reportAccess.unlocked).toBe(true);
    expect(JSON.stringify((await caller().getByToken({ token: i.shareToken }))?.diagnostic)).toContain("DETAIL_ADVE_PAYANT");
    expect((await caller().getRecosByToken({ token: i.shareToken, paid: false })).recos).toHaveLength(3);
    expect(JSON.stringify(await caller().getPillarsByToken({ token: i.shareToken }))).toContain("TROISIEME_CHAMP_PAYANT");
  });
  it("binds a payment reference to its own intake and hides foreign details", async () => {
    const a = await fixture(), b = await fixture(); const row = await payment(a.shareToken, "PAID");
    const foreign = await payments().verifyPayment({ reference: row.reference, intakeToken: b.shareToken });
    expect(foreign.paid).toBe(false); expect(foreign).not.toHaveProperty("intakeToken"); expect(foreign.oracleShareUrl).toBeNull();
    expect((await payments().verifyPayment({ reference: row.reference, intakeToken: a.shareToken })).paid).toBe(true);
    expect((await caller().getRecosByToken({ token: b.shareToken, paid: true })).recos).toHaveLength(2);
  });
  it("rechecks persisted payment status, and keeps admin reads out of the ledger", async () => {
    const i = await fixture(), row = await payment(i.shareToken, "PAID");
    expect((await caller().getRecosByToken({ token: i.shareToken })).recos).toHaveLength(3);
    await db.intakePayment.update({ where: { id: row.id }, data: { status: "FAILED" } });
    expect((await caller().getRecosByToken({ token: i.shareToken, paid: true })).recos).toHaveLength(2);
    const before = await db.intakePayment.count();
    expect((await caller("ADMIN").getRecosByToken({ token: i.shareToken })).recos).toHaveLength(3);
    expect(await db.intakePayment.count()).toBe(before);
  });
  it("replays a completed report without calling generation or changing the saved diagnostic", async () => {
    const i = await fixture();
    const trap = vi.spyOn(intakeService, "complete").mockRejectedValue(new Error("Generation must not run on replay"));
    try {
      const r = await caller().complete({ token: i.shareToken });
      expect(r.strategyId).toBe(i.convertedToId); expect(trap).not.toHaveBeenCalled();
      expect(JSON.stringify(r)).not.toContain("DETAIL_ADVE_PAYANT");
      expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).diagnostic).toEqual(diagnostic);
    } finally { trap.mockRestore(); }
  });
  it("does not let an unpaid caller bypass the paywall through brand activation", async () => {
    const i = await fixture();
    const before = await db.strategy.findUniqueOrThrow({ where: { id: i.convertedToId! } });
    await expect(caller().activateBrand({ token: i.shareToken })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.strategy.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).status).toBe("COMPLETED");
  });
  it("refuses an unpaid PDF but admin route dispatch creates no synthetic payment", async () => {
    const i = await fixture(); const ctx = { params: Promise.resolve({ token: i.shareToken }) };
    authMock.mockResolvedValue(null);
    const req = new Request(`http://localhost:3399/api/intake/${i.shareToken}/pdf`);
    expect((await GET(req, ctx)).status).toBe(402);
    const before = await db.intakePayment.count();
    authMock.mockResolvedValue({ user: { id: users[0]!, role: "ADMIN" } });
    expect((await GET(req, ctx)).status).toBe(200);
    expect(await db.intakePayment.count()).toBe(before);
  });
});
