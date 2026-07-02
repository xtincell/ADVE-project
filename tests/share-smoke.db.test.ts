import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du WP-023 — la circulation des livrables de bout en
 * bout : funnel → rapport complet par token, et inscription → conversion →
 * Oracle → lien public audité → résolution publique. Tokens falsifiés /
 * inconnus → null (page morte côté UI).
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`) — skippé en CI et en
 * local sans env, la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`).
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

const RUN = `smoke-share-${Date.now()}`;
const EMAIL = `${RUN}@test.local`;
const BRAND_NAME = `Marque ${RUN}`;

describe.skipIf(!SMOKE_URL)("WP-023 smoke DB — partage Oracle + rapport ADVE", () => {
  async function services() {
    const [{ getDb }, identity, funnel, deliverables, share] = await Promise.all([
      import("@/lib/db"),
      import("@/server/identity"),
      import("@/server/funnel"),
      import("@/server/deliverables"),
      import("@/server/share"),
    ]);
    return { getDb, identity, funnel, deliverables, share };
  }

  afterAll(async () => {
    if (!SMOKE_URL) return;
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const users = await db.user.findMany({
      where: { email: { startsWith: RUN } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const memberships = await db.membership.findMany({
      where: { userId: { in: userIds } },
      select: { workspaceId: true },
    });
    const wsIds = memberships.map((m) => m.workspaceId);
    const brands = await db.brand.findMany({
      where: { workspaceId: { in: wsIds } },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);
    const leads = await db.intakeLead.findMany({
      where: { email: { startsWith: RUN } },
      select: { id: true },
    });
    const leadIds = leads.map((l) => l.id);

    await db.pillarRevision.deleteMany({ where: { pillar: { brandId: { in: brandIds } } } });
    await db.pillar.deleteMany({ where: { brandId: { in: brandIds } } });
    await db.brandScore.deleteMany({ where: { brandId: { in: brandIds } } });
    await db.deliverable.deleteMany({ where: { brandId: { in: brandIds } } });
    await db.auditLog.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.auditLog.deleteMany({ where: { workspaceId: null, entityId: { in: leadIds } } });
    await db.brand.deleteMany({ where: { id: { in: brandIds } } });
    await db.membership.deleteMany({ where: { userId: { in: userIds } } });
    await db.workspace.deleteMany({ where: { id: { in: wsIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.intakeLead.deleteMany({ where: { id: { in: leadIds } } });
    await db.$disconnect();
  });

  it("funnel → rapport par token ; conversion → Oracle → partage public audité", { timeout: 60_000 }, async () => {
    const { getDb, identity, funnel, deliverables, share } = await services();
    const db = getDb();

    // ── 1. Lead public + rapport complet ─────────────────────────────
    const { leadId, diagnostic } = await funnel.submitIntake({
      email: EMAIL,
      brandName: BRAND_NAME,
      secteur: "fintech",
      answers: {
        A: {
          description: "Portefeuille mobile pour commerçants informels de Douala.",
          publicCible: "Commerçants de marché non bancarisés",
        },
        D: { concurrents: "Wave\nOrange Money" },
      },
    });
    expect(diagnostic.score).toBeGreaterThan(0);

    const report = await funnel.getLeadReport(leadId);
    expect(report).not.toBeNull();
    expect(report!.pillars).toHaveLength(4);
    const pillarA = report!.pillars.find((p) => p.key === "A")!;
    const description = pillarA.fields.find((f) => f.id === "description")!;
    expect(description.filled).toBe(true);
    expect(description.answer).toContain("Portefeuille mobile");
    // nomMarque injecté par l'identité du lead (withIdentityAnswers)
    expect(pillarA.fields.find((f) => f.id === "nomMarque")!.answer).toBe(BRAND_NAME);
    // un champ vide reste un constat de vide, avec sa description
    const empty = pillarA.fields.find((f) => !f.filled);
    expect(empty).toBeDefined();
    expect(empty!.answer).toBeUndefined();

    // Lien de rapport signé → résolution = même lead, même score
    const rapportLink = await share.createRapportShareLink(leadId);
    expect(rapportLink.path.startsWith("/intake/rapport/")).toBe(true);
    const rapportToken = rapportLink.path.split("/").pop()!;
    const resolved = await share.resolveSharedRapport(rapportToken);
    expect(resolved?.lead.id).toBe(leadId);
    expect(resolved?.diagnostic.score).toBe(diagnostic.score);

    // Token falsifié / lead inexistant → null (lien mort propre)
    expect(await share.resolveSharedRapport(`${rapportToken.slice(0, -4)}AAAA`)).toBeNull();
    const { getAuthSecretKey } = await import("@/lib/session-token");
    const ghost = await share.signRapportShareToken(
      { leadId: "lead_inexistant" },
      getAuthSecretKey(),
    );
    expect(await share.resolveSharedRapport(ghost)).toBeNull();

    // ── 2. Conversion → Oracle → lien public ─────────────────────────
    const session = await identity.registerUser({
      name: "Fondatrice Smoke",
      email: EMAIL,
      password: "motdepasse-solide",
      brandName: BRAND_NAME,
    });
    const converted = await funnel.convertLead(leadId, {
      userId: session.userId,
      workspaceId: session.workspaceId,
    });
    expect(converted).not.toBeNull();

    // Pas d'Oracle composé → rien à partager (null honnête)
    expect(
      await share.createOracleShareLink({
        brandId: converted!.brandId,
        workspaceId: session.workspaceId,
        actorId: session.userId,
      }),
    ).toBeNull();

    const { deliverable } = await deliverables.composeOracleDeliverable({
      brandId: converted!.brandId,
      actorId: session.userId,
    });

    const link = await share.createOracleShareLink({
      brandId: converted!.brandId,
      workspaceId: session.workspaceId,
      actorId: session.userId,
    });
    expect(link).not.toBeNull();
    expect(link!.path.startsWith("/partage/oracle/")).toBe(true);
    // ~30 jours (à la minute près)
    expect(link!.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000);

    // Audit `deliverable.share` inscrit dans la chaîne du workspace
    const auditRow = await db.auditLog.findFirst({
      where: {
        workspaceId: session.workspaceId,
        action: "deliverable.share",
        entityId: deliverable.id,
      },
    });
    expect(auditRow).not.toBeNull();
    expect(auditRow!.actorId).toBe(session.userId);

    // Résolution publique : document + marque, sans session
    const oracleToken = link!.path.split("/").pop()!;
    const shared = await share.resolveSharedOracle(oracleToken);
    expect(shared).not.toBeNull();
    expect(shared!.brandName).toBe(BRAND_NAME);
    expect(shared!.document.sections.length).toBeGreaterThan(0);
    expect(shared!.document.brand.name).toBe(BRAND_NAME);

    // Falsifié → null ; token de rapport sur le résolveur Oracle → null
    expect(await share.resolveSharedOracle(`${oracleToken.slice(0, -4)}AAAA`)).toBeNull();
    expect(await share.resolveSharedOracle(rapportToken)).toBeNull();
  });
});
