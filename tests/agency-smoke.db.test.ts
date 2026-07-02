import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL de la vue flotte agence (/agence) : la définition v7
 * de « la flotte » — workspaces BRAND où AU MOINS UN membre du workspace
 * AGENCY détient une membership — vérifiée contre de vraies lignes.
 *
 * Gated par `SMOKE_DATABASE_URL` (même doctrine que finance-smoke.db.test.ts :
 * jamais `DATABASE_URL`, on ne pointe pas un smoke sur une base de travail).
 * Skippé sans env — `npm run test` reste vert partout. Pré-requis quand il
 * tourne : base jetable poussée (`prisma db push`). Aucun seed requis : le
 * smoke crée toutes ses lignes (suffixe unique par run).
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!SMOKE_URL)("flotte agence — smoke DB de bout en bout", () => {
  // Imports paresseux : rien n'est instancié quand le smoke est skippé.
  async function services() {
    const [{ getDb }, agency] = await Promise.all([
      import("@/lib/db"),
      import("@/server/agency"),
    ]);
    return { getDb, ...agency };
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("ne liste que les workspaces BRAND où l'équipe de l'agence a une membership", async () => {
    const s = await services();
    const db = s.getDb();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ── L'agence : 2 membres (opérateur = session, + un collaborateur) ──
    const operator = await db.user.create({
      data: { email: `op-${stamp}@smoke.test`, name: "Op Smoke" },
    });
    const teammate = await db.user.create({
      data: { email: `team-${stamp}@smoke.test`, name: "Team Smoke" },
    });
    const agencyWs = await db.workspace.create({
      data: { slug: `agence-${stamp}`, name: `Agence ${stamp}`, kind: "AGENCY" },
    });
    await db.membership.createMany({
      data: [
        { userId: operator.id, workspaceId: agencyWs.id, role: "OPERATOR" },
        { userId: teammate.id, workspaceId: agencyWs.id, role: "MEMBER" },
      ],
    });

    // ── Marque A : l'opérateur y est membre → dans la flotte. Abo actif. ──
    const founderA = await db.user.create({
      data: { email: `fa-${stamp}@smoke.test`, name: "Fondateur A" },
    });
    const wsA = await db.workspace.create({
      data: { slug: `marque-a-${stamp}`, name: `Client A ${stamp}`, kind: "BRAND" },
    });
    await db.membership.createMany({
      data: [
        { userId: founderA.id, workspaceId: wsA.id, role: "OWNER" },
        { userId: operator.id, workspaceId: wsA.id, role: "MEMBER" },
      ],
    });
    const brandA = await db.brand.create({
      data: { workspaceId: wsA.id, slug: `marque-a-${stamp}`, name: "Marque A", level: "FRAGILE" },
    });
    await db.brandScore.create({
      data: { brandId: brandA.id, total: 120, dimensions: {}, level: "FRAGILE" },
    });
    const expiresAt = new Date(Date.now() + 20 * DAY_MS);
    await db.subscription.create({
      data: {
        workspaceId: wsA.id,
        plan: "cockpit",
        status: "active",
        provider: "manual_whatsapp",
        expiresAt,
      },
    });

    // ── Marque B : PERSONNE de l'agence n'y est membre → hors flotte. ──
    const founderB = await db.user.create({
      data: { email: `fb-${stamp}@smoke.test`, name: "Fondateur B" },
    });
    const wsB = await db.workspace.create({
      data: { slug: `marque-b-${stamp}`, name: `Client B ${stamp}`, kind: "BRAND" },
    });
    await db.membership.create({
      data: { userId: founderB.id, workspaceId: wsB.id, role: "OWNER" },
    });
    await db.brand.create({
      data: { workspaceId: wsB.id, slug: `marque-b-${stamp}`, name: "Marque B" },
    });

    // ── Marque C : le COLLABORATEUR y est membre (pas l'opérateur) →
    //    dans la flotte quand même (flotte d'équipe). Demande en attente. ──
    const wsC = await db.workspace.create({
      data: { slug: `marque-c-${stamp}`, name: `Client C ${stamp}`, kind: "BRAND" },
    });
    await db.membership.create({
      data: { userId: teammate.id, workspaceId: wsC.id, role: "MEMBER" },
    });
    await db.brand.create({
      data: { workspaceId: wsC.id, slug: `marque-c-${stamp}`, name: "Marque C" },
    });
    await db.subscription.create({
      data: {
        workspaceId: wsC.id,
        plan: "cockpit",
        status: "pending_manual",
        provider: "manual_whatsapp",
        expiresAt: null,
      },
    });

    // ── La flotte vue par l'opérateur ──
    const fleet = await s.getAgencyFleet({ userId: operator.id, workspaceId: agencyWs.id });
    expect(fleet).not.toBeNull();
    expect(fleet!.agency).toMatchObject({ id: agencyWs.id, role: "OPERATOR" });
    expect(fleet!.teamSize).toBe(2);

    const ids = fleet!.workspaces.map((ws) => ws.id).sort();
    expect(ids).toEqual([wsA.id, wsC.id].sort()); // B absent

    const rowA = fleet!.workspaces.find((ws) => ws.id === wsA.id)!;
    expect(rowA.brands).toHaveLength(1);
    expect(rowA.brands[0]).toMatchObject({ name: "Marque A", level: "FRAGILE", score: 120 });
    expect(rowA.subscription.status).toBe("active");
    expect(rowA.subscription.expiresAt?.getTime()).toBe(expiresAt.getTime());

    const rowC = fleet!.workspaces.find((ws) => ws.id === wsC.id)!;
    expect(rowC.brands[0]).toMatchObject({ name: "Marque C", score: null });
    expect(rowC.subscription).toEqual({ status: "pending", expiresAt: null });

    expect(fleet!.totals).toEqual({
      workspaces: 2,
      brands: 2,
      averageScore: 120, // seule Marque A a un score — pas de 0 inventé pour C
      activeSubscriptions: 1,
      pendingSubscriptions: 1,
    });

    // ── Un fondateur SANS membership agence n'a pas de flotte (null). ──
    expect(await s.getAgencyFleet({ userId: founderA.id, workspaceId: wsA.id })).toBeNull();
  });
});
