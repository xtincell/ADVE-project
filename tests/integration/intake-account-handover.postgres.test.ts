import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
const mail = vi.hoisted(() => vi.fn(async () => ({ ok: true, provider: "BREVO", providerRef: "owned-test" })));
const emailArmed = vi.hoisted(() => vi.fn(() => true));
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/services/email", () => ({
  sendEmail: mail,
  systemEmailIsArmed: emailArmed,
  renderPasswordResetEmail: ({ resetUrl }: { resetUrl: string }) => ({
    subject: "Owned local password setup", html: resetUrl, text: resetUrl,
  }),
}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { authRouter } from "@/server/trpc/routers/auth";
import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";
import { canAccessStrategy, scopeStrategies } from "@/server/services/operator-isolation";

const userIds: string[] = [], brands: string[] = [], intakes: string[] = [], tokens: string[] = [], clients: string[] = [];
const auth = () => authRouter.createCaller({ db, session: null, headers: undefined });
const intake = () => quickIntakeRouter.createCaller({ db, session: null, headers: undefined });
async function user() {
  const u = await db.user.create({ data: { email: `handover-${randomUUID()}@example.invalid`, name: "Nom conservé" } });
  userIds.push(u.id); return u;
}
async function dossier(companyName: string) {
  const holder = await user();
  const s = await db.strategy.create({ data: { userId: holder.id, name: companyName, status: "QUICK_INTAKE" } }); brands.push(s.id);
  const email = `handover-founder-${randomUUID()}@example.invalid`;
  const i = await db.quickIntake.create({ data: { contactName: "Fondateur fictif", contactEmail: email, companyName,
    country: "Cameroun", sector: "SERVICES", status: "COMPLETED", responses: {}, convertedToId: s.id } });
  intakes.push(i.id); tokens.push(i.shareToken);
  await db.intakePayment.create({ data: { intakeToken: i.shareToken, reference: `handover-${randomUUID()}`,
    amount: 100, currency: "XAF", provider: "MOCK", status: "PAID", tierKey: "INTAKE_PDF" } });
  return { i, s, email };
}
beforeAll(() => {
  const u = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(u.hostname); expect(u.pathname).toBe("/shinkiro_verify");
});
afterAll(async () => {
  await db.intakePayment.deleteMany({ where: { intakeToken: { in: tokens } } });
  await db.quickIntake.deleteMany({ where: { id: { in: intakes } } });
  await db.brandAsset.deleteMany({ where: { strategyId: { in: brands } } });
  await db.brandDataSource.deleteMany({ where: { strategyId: { in: brands } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: brands } } });
  await db.scoreSnapshot.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.client.deleteMany({ where: { id: { in: clients } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});
describe.sequential("owned PostgreSQL account handover and founder isolation", () => {
  it("cannot claim an existing passwordless user from an email alone", async () => {
    const u = await user();
    await expect(auth().register({ name: "Nom usurpé", email: u.email, password: "local-fixture-password" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    const saved = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(saved.hashedPassword).toBeNull(); expect(saved.name).toBe("Nom conservé");
  });
  it("still registers a new founder without any operator authority", async () => {
    const email = `handover-new-${randomUUID()}@example.invalid`;
    const r = await auth().register({ name: "Nouveau compte fictif", email, password: "new-owned-password" });
    userIds.push(r.id);
    const saved = await db.user.findUniqueOrThrow({ where: { id: r.id } });
    expect(r.claimed).toBe(false); expect(saved.role).toBe("USER"); expect(saved.operatorId).toBeNull();
    expect(await bcrypt.compare("new-owned-password", saved.hashedPassword!)).toBe(true);
  });
  it("sets the first password only through the existing emailed reset token, once", async () => {
    const d = await dossier(`Accès conservé ${randomUUID()}`);
    const activated = await intake().activateBrand({ token: d.i.shareToken });
    userIds.push(activated.userId); clients.push(activated.clientId);
    const u = await db.user.findUniqueOrThrow({ where: { id: activated.userId } });
    const before = await db.strategy.findUniqueOrThrow({ where: { id: activated.strategyId } });
    mail.mockClear();
    expect(await auth().forgotPassword({ email: u.email })).toEqual({ success: true, deliveryAvailable: true });
    let current = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    for (let n = 0; n < 100 && (!current.resetToken || !JSON.stringify(mail.mock.calls).includes(current.resetToken)); n++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      current = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    }
    expect(current.hashedPassword).toBeNull(); expect(current.resetToken).toBeTruthy();
    // This is a local token/recipient handover receipt, not an SMTP delivery receipt.
    expect(JSON.stringify(mail.mock.calls)).toContain(current.resetToken!);
    await expect(auth().resetPassword({ token: "invalid-owned-fixture-token", password: "local-fixture-password" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await auth().resetPassword({ token: current.resetToken!, password: "local-fixture-password" });
    const saved = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("local-fixture-password", saved.hashedPassword!)).toBe(true);
    expect(saved.name).toBe(u.name); expect(saved.resetToken).toBeNull(); expect(saved.resetTokenExpiry).toBeNull();
    expect(await db.strategy.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    await expect(auth().resetPassword({ token: current.resetToken!, password: "different-local-password" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("reports unavailable transport equally for all addresses without issuing a reset secret", async () => {
    const u = await user(); const before = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    mail.mockClear(); emailArmed.mockReturnValue(false);
    try {
      const known = await auth().forgotPassword({ email: u.email });
      const unknown = await auth().forgotPassword({ email: `absent-${randomUUID()}@example.invalid` });
      expect(known).toEqual({ success: true, deliveryAvailable: false }); expect(unknown).toEqual(known);
      expect(mail).not.toHaveBeenCalled();
      expect(await db.user.findUniqueOrThrow({ where: { id: u.id } })).toEqual(before);
    } finally { emailArmed.mockReturnValue(true); }
  });
  it("rejects an expired setup proof without setting a password", async () => {
    const u = await user(); const proof = randomUUID();
    await db.user.update({ where: { id: u.id }, data: { resetToken: proof, resetTokenExpiry: new Date(Date.now() - 1000) } });
    await expect(auth().resetPassword({ token: proof, password: "expired-owned-password" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).hashedPassword).toBeNull();
  });
  it("consumes the reset proof atomically under two concurrent attempts", async () => {
    const u = await user(); const proof = randomUUID();
    await db.user.update({ where: { id: u.id }, data: { resetToken: proof, resetTokenExpiry: new Date(Date.now() + 60000) } });
    const outcomes = await Promise.allSettled([
      auth().resetPassword({ token: proof, password: "first-owned-password" }),
      auth().resetPassword({ token: proof, password: "second-owned-password" }),
    ]);
    expect(outcomes.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(x => x.status === "rejected")).toHaveLength(1);
  });
  it("keeps two same-name companies separate without granting the shared operator", async () => {
    const name = `Atelier homonyme ${randomUUID()}`; const a = await dossier(name), b = await dossier(name);
    const aa = await intake().activateBrand({ token: a.i.shareToken }); userIds.push(aa.userId); clients.push(aa.clientId);
    const bb = await intake().activateBrand({ token: b.i.shareToken }); userIds.push(bb.userId); clients.push(bb.clientId);
    expect.soft(aa.clientId).not.toBe(bb.clientId);
    const ua = await db.user.findUniqueOrThrow({ where: { id: aa.userId } });
    const ub = await db.user.findUniqueOrThrow({ where: { id: bb.userId } });
    expect.soft(ua.operatorId).toBeNull(); expect.soft(ub.operatorId).toBeNull();
    const ctx = { userId: ua.id, operatorId: ua.operatorId, role: ua.role };
    expect(await canAccessStrategy(aa.strategyId, ctx)).toBe(true);
    expect.soft(await canAccessStrategy(bb.strategyId, ctx)).toBe(false);
    const visible = await db.strategy.findMany({ where: scopeStrategies(ctx), select: { id: true } });
    expect(visible.map(s => s.id)).toContain(aa.strategyId); expect.soft(visible.map(s => s.id)).not.toContain(bb.strategyId);
    const before = await db.strategy.update({ where: { id: aa.strategyId }, data: { countryCode: "FR", currencyCode: "EUR" } });
    const replay = await intake().activateBrand({ token: a.i.shareToken });
    expect(replay.userId).toBe(aa.userId); expect(replay.clientId).toBe(aa.clientId); expect(replay.strategyId).toBe(aa.strategyId);
    const after = await db.strategy.findUniqueOrThrow({ where: { id: aa.strategyId } });
    expect(after.userId).toBe(before.userId); expect(after.countryCode).toBe("FR"); expect(after.currencyCode).toBe("EUR");
    expect(await db.intakePayment.count({ where: { intakeToken: { in: [a.i.shareToken, b.i.shareToken] } } })).toBe(2);
  });
});
