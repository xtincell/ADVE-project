import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du WP-015 (console vague 1) : listes console
 * (utilisateurs / workspaces / abonnements), CRUD référentiels audité,
 * vérification de chaîne d'audit — y compris détection d'une altération.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`) — skippé en CI et en
 * local sans env, la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`).
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

const RUN = `smoke-admin-${Date.now()}`;

describe.skipIf(!SMOKE_URL)("WP-015 smoke DB — console opérateur vague 1", () => {
  async function services() {
    const [{ getDb }, admin, { logAudit }] = await Promise.all([
      import("@/lib/db"),
      import("@/server/admin"),
      import("@/server/audit"),
    ]);
    return { getDb, admin, logAudit };
  }

  afterAll(async () => {
    if (!SMOKE_URL) return;
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    // Nettoyage best-effort du lot de ce run — base JETABLE de toute façon
    // (le test altère volontairement une ligne d'audit : la chaîne système de
    // cette base ne re-vérifiera plus OK, c'est attendu).
    const users = await db.user.findMany({ where: { email: { startsWith: RUN } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
    const ws = await db.workspace.findMany({ where: { slug: { startsWith: RUN } } });
    const wsIds = ws.map((w) => w.id);
    await db.auditLog.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.subscription.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.payment.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.membership.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.brand.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.workspace.deleteMany({ where: { id: { in: wsIds } } });
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await db.zoneIndex.deleteMany({ where: { source: { contains: RUN } } });
    await db.country.deleteMany({ where: { code: "ZZ", name: { contains: RUN } } });
    await db.$disconnect();
  });

  it("liste utilisateurs / workspaces / abonnements avec statuts dérivés", async () => {
    const { getDb, admin } = await services();
    const db = getDb();

    const user = await db.user.create({
      data: { email: `${RUN}@exemple.test`, name: "Awa Smoke", passwordHash: "x" },
    });
    const workspace = await db.workspace.create({
      data: { slug: `${RUN}-ws`, name: `Atelier ${RUN}`, kind: "BRAND" },
    });
    await db.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
    });
    // Une souscription « active » mais échue par date → doit s'afficher Échue.
    await db.subscription.create({
      data: {
        workspaceId: workspace.id,
        plan: "cockpit",
        status: "active",
        provider: "manual_whatsapp",
        startedAt: new Date("2026-01-01"),
        expiresAt: new Date("2026-01-31"),
      },
    });

    const users = await admin.listUsers({ query: RUN });
    expect(users.rows.map((r) => r.email)).toContain(`${RUN}@exemple.test`);
    expect(users.rows[0]!.memberships[0]!.role).toBe("OWNER");

    const detail = await admin.getUserDetail(user.id);
    expect(detail?.memberships[0]?.workspaceSlug).toBe(`${RUN}-ws`);
    expect(detail?.lastActivityAt).toBeNull(); // aucune ligne d'audit encore

    const workspaces = await admin.listWorkspaces({ query: `${RUN}-ws` });
    expect(workspaces.total).toBe(1);
    expect(workspaces.rows[0]!.memberCount).toBe(1);
    expect(workspaces.rows[0]!.currentPlan).toBeNull(); // échue ⇒ pas de plan courant

    const echus = await admin.listAllSubscriptions({ filter: "echus", query: RUN });
    expect(echus.rows.some((r) => r.workspaceId === workspace.id)).toBe(true);
    expect(echus.rows.find((r) => r.workspaceId === workspace.id)?.displayStatus).toBe("expired");

    const wsDetail = await admin.getWorkspaceDetail(workspace.id);
    expect(wsDetail?.subscriptions).toHaveLength(1);
  });

  it("CRUD référentiels audité + vérification de chaîne (intacte puis altérée)", async () => {
    const { getDb, admin } = await services();
    const db = getDb();
    const actor = await db.user.create({
      data: { email: `${RUN}-op@exemple.test`, name: "Op Smoke" },
    });

    // Pays : upsert (create puis update) — tracé sur la chaîne système.
    await admin.upsertCountry(
      { code: "ZZ", name: `Testland ${RUN}`, currency: "XOF", zone: "UEMOA" },
      actor.id,
    );
    await admin.upsertCountry(
      { code: "ZZ", name: `Testland ${RUN} v2`, currency: "XOF", zone: "UEMOA" },
      actor.id,
    );
    const country = await db.country.findUnique({ where: { code: "ZZ" } });
    expect(country?.name).toBe(`Testland ${RUN} v2`);

    // ZoneIndex : create → update → delete, source obligatoire portée partout.
    const created = await admin.createZoneIndex(
      {
        family: "pricing",
        countryCode: "ZZTEST",
        key: "plan.cockpit.monthly",
        value: 9000,
        source: `décision opérateur ${RUN}`,
        validFrom: new Date("2026-07-01"),
        validUntil: null,
      },
      actor.id,
    );
    const updated = await admin.updateZoneIndex(
      {
        id: created.id,
        family: "pricing",
        countryCode: "ZZTEST",
        key: "plan.cockpit.monthly",
        value: 9500,
        source: `décision opérateur ${RUN} corrigée`,
        validFrom: new Date("2026-07-01"),
        validUntil: null,
      },
      actor.id,
    );
    expect(updated.value).toBe(9500);
    await admin.deleteZoneIndex(created.id, actor.id);
    expect(await db.zoneIndex.findUnique({ where: { id: created.id } })).toBeNull();

    // Chaque mutation a laissé sa ligne chaînée sur la chaîne système.
    const auditActions = await db.auditLog.findMany({
      where: { actorId: actor.id },
      orderBy: { createdAt: "asc" },
      select: { action: true, prevHash: true, selfHash: true },
    });
    expect(auditActions.map((a) => a.action)).toEqual([
      "country.upsert",
      "country.upsert",
      "zone_index.create",
      "zone_index.update",
      "zone_index.delete",
    ]);

    // Vérification : chaîne système intacte.
    const okBefore = await admin.verifyAuditChains({ chain: "system" });
    expect(okBefore.ok).toBe(true);
    expect(okBefore.scanned).toBeGreaterThanOrEqual(5);

    // Altération a posteriori d'une ligne → rupture localisée HASH_ALTERE.
    const victim = await db.auditLog.findFirst({
      where: { actorId: actor.id, action: "zone_index.update" },
    });
    await db.auditLog.update({
      where: { id: victim!.id },
      data: { payload: { falsifie: true } },
    });
    const broken = await admin.verifyAuditChains({ chain: "system" });
    expect(broken.ok).toBe(false);
    expect(broken.breaks.some((b) => b.id === victim!.id && b.reason === "HASH_ALTERE")).toBe(
      true,
    );

    // Journal filtrable : l'action éditée ressort avec son acteur résolu.
    const journal = await admin.listAuditLogs({ action: "zone_index.create", chain: "system" });
    expect(journal.rows.some((r) => r.actorEmail === `${RUN}-op@exemple.test`)).toBe(true);
  });
});
