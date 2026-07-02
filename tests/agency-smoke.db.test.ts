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

  it("WP-018 : clients/missions/campagnes/revenus lisent la flotte, et RIEN d'autre", async () => {
    const s = await services();
    const { shortReference } = await import("@/server/finance");
    const db = s.getDb();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const DAY = 24 * 60 * 60 * 1000;

    // ── L'agence (1 opérateur) + le client W dans la flotte ──
    const operator = await db.user.create({
      data: { email: `op18-${stamp}@smoke.test`, name: "Op WP18" },
    });
    const agencyWs = await db.workspace.create({
      data: { slug: `agence18-${stamp}`, name: `Agence 18 ${stamp}`, kind: "AGENCY" },
    });
    await db.membership.create({
      data: { userId: operator.id, workspaceId: agencyWs.id, role: "OPERATOR" },
    });
    const wsClient = await db.workspace.create({
      data: { slug: `client18-${stamp}`, name: `Client 18 ${stamp}`, kind: "BRAND" },
    });
    await db.membership.create({
      data: { userId: operator.id, workspaceId: wsClient.id, role: "MEMBER" },
    });
    const brand = await db.brand.create({
      data: { workspaceId: wsClient.id, slug: `marque18-${stamp}`, name: "Marque 18" },
    });

    // ── Pipeline réel côté client : campagne ACTIVE → action → brief → missions ──
    const campaign = await db.campaign.create({
      data: {
        brandId: brand.id,
        name: "Lancement 18",
        objective: "Objectif smoke",
        countryCode: "CM",
        status: "ACTIVE",
      },
    });
    const action = await db.campaignAction.create({
      data: {
        campaignId: campaign.id,
        name: "Séance photo",
        kind: "photo-session",
        status: "BRIEFED",
        estimatedCost: 15000,
        costCurrency: "XAF",
      },
    });
    await db.campaignAction.create({
      data: { campaignId: campaign.id, name: "Sans coût", kind: "custom", status: "PLANNED" },
    });
    await db.campaignAction.create({
      data: {
        campaignId: campaign.id,
        name: "Annulée",
        kind: "custom",
        status: "CANCELLED",
        estimatedCost: 99999,
        costCurrency: "XAF",
      },
    });
    const brief = await db.brief.create({
      data: { actionId: action.id, title: "Brief 18", content: {}, status: "VALIDATED" },
    });
    const missionOpen = await db.mission.create({
      data: { briefId: brief.id, title: "Mission ouverte 18", status: "OPEN", openToGuild: true },
    });
    await db.mission.create({
      data: { briefId: brief.id, title: "Mission validée 18", status: "VALIDATED" },
    });

    // Candidature guilde EN ATTENTE sur la mission ouverte.
    const talentUser = await db.user.create({
      data: { email: `talent18-${stamp}@smoke.test`, name: "Talent 18" },
    });
    const talent = await db.talentProfile.create({
      data: {
        userId: talentUser.id,
        headline: "Photographe produit — Douala",
        city: "Douala",
        countryCode: "CM",
      },
    });
    await db.missionApplication.create({
      data: { missionId: missionOpen.id, talentId: talent.id, pitch: "Prêt.", status: "APPLIED" },
    });

    // ── Finance réelle : abo actif + paiement d'activation, mois multiples ──
    const sub = await db.subscription.create({
      data: {
        workspaceId: wsClient.id,
        plan: "cockpit",
        status: "active",
        provider: "manual_whatsapp",
        expiresAt: new Date(Date.now() + 20 * DAY),
      },
    });
    await db.payment.createMany({
      data: [
        {
          workspaceId: wsClient.id,
          amount: 8000,
          currency: "XOF",
          method: "manual_whatsapp",
          status: "confirmed",
          reference: shortReference(sub.id),
        },
        {
          workspaceId: wsClient.id,
          amount: 100,
          currency: "EUR",
          method: "card",
          status: "confirmed",
          createdAt: new Date(Date.now() - 40 * DAY), // un autre mois UTC
        },
        {
          workspaceId: wsClient.id,
          amount: 5000,
          currency: "XOF",
          method: "manual_whatsapp",
          status: "pending", // non confirmé → invisible côté revenus
        },
      ],
    });

    // ── Bruit HORS flotte : même formes, personne de l'agence n'y est membre ──
    const outsider = await db.user.create({
      data: { email: `out18-${stamp}@smoke.test`, name: "Out 18" },
    });
    const wsOut = await db.workspace.create({
      data: { slug: `out18-${stamp}`, name: `Hors flotte 18 ${stamp}`, kind: "BRAND" },
    });
    await db.membership.create({
      data: { userId: outsider.id, workspaceId: wsOut.id, role: "OWNER" },
    });
    const brandOut = await db.brand.create({
      data: { workspaceId: wsOut.id, slug: `out-marque18-${stamp}`, name: "Marque hors flotte" },
    });
    const campaignOut = await db.campaign.create({
      data: {
        brandId: brandOut.id,
        name: "Campagne hors flotte",
        objective: "x",
        countryCode: "CM",
      },
    });
    const actionOut = await db.campaignAction.create({
      data: { campaignId: campaignOut.id, name: "a", kind: "custom" },
    });
    const briefOut = await db.brief.create({
      data: { actionId: actionOut.id, title: "b", content: {} },
    });
    await db.mission.create({ data: { briefId: briefOut.id, title: "Mission hors flotte" } });
    await db.payment.create({
      data: {
        workspaceId: wsOut.id,
        amount: 7777,
        currency: "XOF",
        method: "manual_whatsapp",
        status: "confirmed",
      },
    });

    const session = { userId: operator.id, workspaceId: agencyWs.id };

    // ── Missions cross-flotte : les 2 du client, PAS celle hors flotte ──
    const fleetMissions = (await s.listFleetMissions(session))!;
    expect(fleetMissions.missions).toHaveLength(2);
    expect(fleetMissions.missions.every((m) => m.workspaceId === wsClient.id)).toBe(true);
    const openRow = fleetMissions.missions.find((m) => m.id === missionOpen.id)!;
    expect(openRow).toMatchObject({
      campaignName: "Lancement 18",
      actionName: "Séance photo",
      brandName: "Marque 18",
      workspaceId: wsClient.id,
      openToGuild: true,
      pendingApplications: 1,
    });

    // ── Campagnes cross-flotte : budget réel par devise, annulée exclue ──
    const fleetCampaigns = (await s.listFleetCampaigns(session))!;
    expect(fleetCampaigns.campaigns.map((c) => c.id)).toEqual([campaign.id]);
    const totals = s.totalEstimatedByCurrency(fleetCampaigns.campaigns[0]!.actions);
    expect(totals).toEqual({ byCurrency: { XAF: 15000 }, unestimated: 1 });

    // ── Fiche client : tenancy stricte + agrégats réels ──
    const detail = await s.getFleetClientDetail(session, wsClient.id);
    expect(detail.kind).toBe("ok");
    if (detail.kind === "ok") {
      expect(detail.detail.campaigns).toHaveLength(1);
      expect(detail.detail.campaigns[0]).toMatchObject({
        actionCount: 2, // l'annulée ne compte pas
        costs: { total: 15000, currency: "XAF", unestimated: 1 },
      });
      // Seule la mission NON validée est « en cours ».
      expect(detail.detail.missionsInProgress.map((m) => m.id)).toEqual([missionOpen.id]);
      expect(detail.detail.recentPayments).toHaveLength(3); // tous statuts, statut AFFICHÉ
    }
    const foreign = await s.getFleetClientDetail(session, wsOut.id);
    expect(foreign.kind).toBe("not-found"); // existe en base, hors flotte → introuvable

    // ── Revenus : confirmés uniquement, par mois et PAR DEVISE ; MRR réel ──
    const revenue = (await s.getFleetRevenue(session))!;
    expect(revenue.confirmedPaymentCount).toBe(2);
    expect(revenue.months).toHaveLength(2);
    const thisMonth = revenue.months.find((m) => m.month === s.monthKey(new Date()))!;
    expect(thisMonth.totals).toEqual({ XOF: 8000 }); // le pending 5000 n'existe pas ici
    const otherMonth = revenue.months.find((m) => m.month !== s.monthKey(new Date()))!;
    expect(otherMonth.totals).toEqual({ EUR: 100 });
    expect(revenue.mrr.byCurrency).toEqual({ XOF: 8000 }); // cockpit 30 j → montant tel quel
    expect(revenue.mrr.unresolved).toEqual([]);
    expect(revenue.activeSubscriptions).toBe(1);

    // ── Compteurs du dashboard ──
    const pulse = (await s.getFleetPulse(session))!;
    expect(pulse).toMatchObject({
      campaigns: { total: 1, active: 1 },
      missions: { total: 2, inProgress: 1 },
      pendingApplications: 1,
      confirmedPayments: 2,
    });
  });
});
