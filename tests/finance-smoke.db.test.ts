import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du cycle WP-007 : request → approve → hasActive → gate.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL` : on ne pointe pas un
 * smoke destructif sur une base de travail par accident). Skippé en CI et en
 * local sans env — la suite `npm run test` reste verte partout.
 *
 * Pré-requis quand il tourne : base jetable poussée (`prisma db push`) et
 * seedée (`node prisma/seed.mjs`) — le smoke vérifie les montants RÉELS du
 * référentiel, il n'en insère aucun.
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!SMOKE_URL)("WP-007 smoke DB — souscription manuelle de bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, finance, entitlements, market] = await Promise.all([
      import("@/lib/db"),
      import("@/server/finance"),
      import("@/server/entitlements"),
      import("@/server/market"),
    ]);
    return { getDb, ...finance, ...entitlements, ...market };
  }

  async function makeWorkspace(countryCode: string | null) {
    const { getDb } = await services();
    const db = getDb();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const workspace = await db.workspace.create({
      data: { slug: `smoke-${stamp}`, name: `Smoke ${stamp}`, kind: "BRAND" },
    });
    await db.brand.create({
      data: {
        workspaceId: workspace.id,
        slug: `smoke-${stamp}`,
        name: `Marque ${stamp}`,
        countryCode,
      },
    });
    return workspace;
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("pricing : CM → zone CEMAC/XAF, sans pays → fallback UEMOA/XOF, retainer placeholder", async () => {
    const { getPlanPricing } = await services();

    const cm = await getPlanPricing("CM");
    expect(cm.zone).toBe("CEMAC");
    expect(cm.currency).toBe("XAF");
    expect(cm.cockpitMonthly).toBeGreaterThan(0);
    expect(cm.byPlan.cockpit.placeholder).toBe(false);
    expect(cm.byPlan.retainer.placeholder).toBe(true); // seed : trimestriel à confirmer

    const fallback = await getPlanPricing(undefined);
    expect(fallback.zone).toBe("UEMOA");
    expect(fallback.currency).toBe("XOF");

    const fr = await getPlanPricing("FR"); // zone null → fallback UEMOA
    expect(fr.zone).toBe("UEMOA");
    expect(fr.cockpitMonthly).toBe(fallback.cockpitMonthly);
  });

  it("cycle complet : grâce → request → approve → hasActive → gate → refus double", async () => {
    const s = await services();
    const db = s.getDb();
    const workspace = await makeWorkspace("CM");
    const actorId = "smoke-operator";

    // 1. Workspace neuf → grâce découverte ouverte.
    const fresh = await s.canComposeOracle(workspace.id);
    expect(fresh).toMatchObject({ allowed: true, via: "grace" });

    // 2. Grâce échue (compte vieilli de 20 j) → gate fermé.
    await db.workspace.update({
      where: { id: workspace.id },
      data: { createdAt: new Date(Date.now() - 20 * DAY_MS) },
    });
    const lapsed = await s.canComposeOracle(workspace.id);
    expect(lapsed.allowed).toBe(false);
    expect(lapsed.via).toBeNull();

    // 3. Demande de souscription cockpit → pending_manual + instructions réelles.
    const cmQuote = (await s.getPlanPricing("CM")).byPlan.cockpit;
    const instructions = await s.requestSubscription({
      workspaceId: workspace.id,
      plan: "cockpit",
      actorId,
    });
    expect(instructions.reused).toBe(false);
    expect(instructions.amount).toBe(cmQuote.amount);
    expect(instructions.currency).toBe("XAF");
    expect(instructions.reference).toBe(s.shortReference(instructions.subscriptionId));
    expect(instructions.whatsappUrl).toContain("https://wa.me/");
    expect(decodeURIComponent(instructions.whatsappUrl)).toContain(instructions.reference);

    const pendingRow = await db.subscription.findUniqueOrThrow({
      where: { id: instructions.subscriptionId },
    });
    expect(pendingRow).toMatchObject({
      plan: "cockpit",
      status: "pending_manual",
      provider: "manual_whatsapp",
      expiresAt: null,
    });

    // 4. pending n'accorde rien ; re-demander ré-affiche la MÊME demande.
    expect(await s.hasActiveSubscription(workspace.id)).toBe(false);
    const again = await s.requestSubscription({
      workspaceId: workspace.id,
      plan: "cockpit",
      actorId,
    });
    expect(again.reused).toBe(true);
    expect(again.subscriptionId).toBe(instructions.subscriptionId);
    expect(
      await db.subscription.count({ where: { workspaceId: workspace.id } }),
    ).toBe(1);

    // 5. La demande apparaît dans la file admin avec le montant attendu.
    const queue = await s.listPendingSubscriptions();
    const inQueue = queue.find((row) => row.id === instructions.subscriptionId);
    expect(inQueue?.workspaceName).toBe(workspace.name);
    expect(inQueue?.expected?.amount).toBe(cmQuote.amount);

    // 6. Validation opérateur → active 30 j + Payment confirmé.
    const { subscription, payment } = await s.approveSubscription({
      id: instructions.subscriptionId,
      actorId,
    });
    expect(subscription.status).toBe("active");
    expect(subscription.expiresAt).not.toBeNull();
    expect(subscription.expiresAt!.getTime() - subscription.startedAt.getTime()).toBe(
      30 * DAY_MS,
    );
    expect(payment).toMatchObject({
      workspaceId: workspace.id,
      amount: cmQuote.amount,
      currency: "XAF",
      method: "manual_whatsapp",
      status: "confirmed",
      reference: instructions.reference,
    });

    // 7. hasActive + gate ouvert via subscription (grâce pourtant échue).
    expect(await s.hasActiveSubscription(workspace.id)).toBe(true);
    const entitled = await s.canComposeOracle(workspace.id);
    expect(entitled).toMatchObject({ allowed: true, via: "subscription" });

    // 8. Refus de double souscription + refus de double validation.
    await expect(
      s.requestSubscription({ workspaceId: workspace.id, plan: "retainer", actorId }),
    ).rejects.toMatchObject({ code: "ALREADY_ACTIVE" });
    await expect(
      s.approveSubscription({ id: instructions.subscriptionId, actorId }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });

    // 9. AuditLog : chaîne du workspace intacte (request → approve).
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(audit.map((row) => row.action)).toEqual([
      "subscription.request",
      "subscription.approve",
    ]);
    expect(audit[0]!.prevHash).toBeNull();
    expect(audit[1]!.prevHash).toBe(audit[0]!.selfHash);
  });

  it("rejet : la demande retainer est rejetée, auditée, et n'accorde rien", async () => {
    const s = await services();
    const db = s.getDb();
    const workspace = await makeWorkspace("SN"); // UEMOA
    const actorId = "smoke-operator";

    const instructions = await s.requestSubscription({
      workspaceId: workspace.id,
      plan: "retainer",
      actorId,
    });
    expect(instructions.currency).toBe("XOF");
    expect(instructions.placeholder).toBe(true); // montant trimestriel seed à confirmer

    const rejected = await s.rejectSubscription({
      id: instructions.subscriptionId,
      actorId,
    });
    expect(rejected.status).toBe("rejected");
    expect(await s.hasActiveSubscription(workspace.id)).toBe(false);

    const queue = await s.listPendingSubscriptions();
    expect(queue.some((row) => row.id === instructions.subscriptionId)).toBe(false);

    const history = await s.listRecentSubscriptionDecisions(50);
    expect(history.some((row) => row.id === instructions.subscriptionId)).toBe(true);

    const actions = (
      await db.auditLog.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    ).map((row) => row.action);
    expect(actions).toEqual(["subscription.request", "subscription.reject"]);

    await expect(
      s.rejectSubscription({ id: instructions.subscriptionId, actorId }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
  });
});
