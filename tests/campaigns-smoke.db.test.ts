import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du pipeline WP-008 : campagne → actions (coûts
 * référentiel) → brief (gates) → missions (circuit complet) → audit chaîné.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL` : on ne pointe pas un
 * smoke destructif sur une base de travail par accident). Skippé en CI et en
 * local sans env — la suite `npm run test` reste verte partout.
 *
 * Pré-requis quand il tourne : base jetable poussée (`prisma db push`) et
 * seedée (`node prisma/seed.mjs`) — le smoke vérifie les coûts RÉELS du
 * référentiel action-cost (catalogue legacy ADR-0093), il n'en insère aucun.
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

describe.skipIf(!SMOKE_URL)("WP-008 smoke DB — pipeline de production de bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, campaigns] = await Promise.all([
      import("@/lib/db"),
      import("@/server/campaigns"),
    ]);
    return { getDb, ...campaigns };
  }

  async function makeBrand() {
    const { getDb } = await services();
    const db = getDb();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const workspace = await db.workspace.create({
      data: { slug: `smoke-camp-${stamp}`, name: `Smoke campagnes ${stamp}`, kind: "BRAND" },
    });
    const brand = await db.brand.create({
      data: {
        workspaceId: workspace.id,
        slug: `smoke-camp-${stamp}`,
        name: `Marque ${stamp}`,
        countryCode: "CM",
      },
    });
    return { workspace, brand };
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("estimation : CM direct (454 000 XAF), CI mis à l'échelle (476 700 XOF), trous honnêtes", async () => {
    const s = await services();

    // Marché de base CM : la ligne seedée telle quelle (Σ atomes catalogue legacy).
    const cm = await s.estimateActionCost("photo_session_half_day", "CM");
    expect(cm).toMatchObject({ estimated: true, amount: 454000, currency: "XAF" });

    // CI : 454 000 × col(105)/col(100) = 476 700, en XOF (parité CFA).
    const ci = await s.estimateActionCost("photo_session_half_day", "CI");
    expect(ci).toMatchObject({ estimated: true, amount: 476700, currency: "XOF" });
    if (ci.estimated) expect(ci.source).toContain("cost-of-living CI/CM (105/100)");

    // BF (col 90) : compression — 408 600 XOF.
    const bf = await s.estimateActionCost("tv_spot_30s", "BF");
    expect(bf).toMatchObject({ estimated: true, amount: 3510000, currency: "XOF" });

    // custom : hors référentiel — à estimer, jamais chiffré.
    const custom = await s.estimateActionCost("custom", "CM");
    expect(custom.estimated).toBe(false);

    // NE : pays CFA seedé mais SANS indice cost-of-living → à estimer honnête.
    const ne = await s.estimateActionCost("photo_session_half_day", "NE");
    expect(ne.estimated).toBe(false);
    if (!ne.estimated) expect(ne.reason).toMatch(/coût de la vie/i);

    // FR : col seedé (320) mais devise EUR sans famille forex → à estimer honnête.
    const fr = await s.estimateActionCost("photo_session_half_day", "FR");
    expect(fr.estimated).toBe(false);
    if (!fr.estimated) expect(fr.reason).toMatch(/EUR/);

    // Marché inconnu du référentiel pays.
    const zz = await s.estimateActionCost("photo_session_half_day", "ZZ");
    expect(zz.estimated).toBe(false);
  });

  it("pipeline complet : cadre → actions → lancement → brief → missions → audit chaîné", async () => {
    const s = await services();
    const db = s.getDb();
    const { workspace, brand } = await makeBrand();
    const actorId = "smoke-operator";

    // 1. Cadre : campagne DRAFT sur le marché CM (référentiel pays vérifié).
    const campaign = await s.createCampaign({
      brandId: brand.id,
      name: "Rentrée 2026",
      objective: "Doubler la notoriété à Douala",
      countryCode: "CM",
      actorId,
    });
    expect(campaign.status).toBe("DRAFT");
    await expect(
      s.createCampaign({
        brandId: brand.id,
        name: "Fantôme",
        objective: "Marché inventé",
        countryCode: "ZZ",
        actorId,
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_MARKET" });

    // 2. Gate lancement fermée sur cadre vide.
    await expect(
      s.launchCampaign({ brandId: brand.id, campaignId: campaign.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 3. Actions : coût référentiel résolu à la création ; custom → à estimer.
    const photo = await s.addAction({
      brandId: brand.id,
      campaignId: campaign.id,
      name: "Shooting packshots",
      kind: "photo_session_half_day",
      actorId,
    });
    expect(photo.action).toMatchObject({
      status: "PLANNED",
      estimatedCost: 454000,
      costCurrency: "XAF",
    });
    expect(photo.action.costSource).toContain("ADR-0093");

    const custom = await s.addAction({
      brandId: brand.id,
      campaignId: campaign.id,
      name: "Partenariat radio communautaire",
      kind: "custom",
      actorId,
    });
    expect(custom.action.estimatedCost).toBeNull();
    expect(custom.estimate.estimated).toBe(false);

    // 4. Gate brief fermée avant lancement (ADR-0120).
    await expect(
      s.createBriefFromAction({ brandId: brand.id, actionId: photo.action.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 5. Lancement (cadre non vide) — ACTIVE, launchedAt posé, double lancement refusé.
    const launched = await s.launchCampaign({
      brandId: brand.id,
      campaignId: campaign.id,
      actorId,
    });
    expect(launched.status).toBe("ACTIVE");
    expect(launched.launchedAt).not.toBeNull();
    await expect(
      s.launchCampaign({ brandId: brand.id, campaignId: campaign.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 6. Action → brief : flip PLANNED→BRIEFED + brief DRAFT pré-rempli du cadre déclaré.
    const brief = await s.createBriefFromAction({
      brandId: brand.id,
      actionId: photo.action.id,
      actorId,
    });
    expect(brief.status).toBe("DRAFT");
    const briefContent = s.briefContentRecord(brief.content);
    expect(briefContent.objectif).toBe("Doubler la notoriété à Douala");
    expect(briefContent.contexte).toContain("Rentrée 2026");
    const briefedAction = await db.campaignAction.findUniqueOrThrow({
      where: { id: photo.action.id },
    });
    expect(briefedAction.status).toBe("BRIEFED");
    await expect(
      s.createBriefFromAction({ brandId: brand.id, actionId: photo.action.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 7. Éclatement refusé sur brouillon ; validation d'un brief incomplet refusée.
    await expect(
      s.createMissionsFromBrief({
        brandId: brand.id,
        briefId: brief.id,
        titles: ["Trop tôt"],
        actorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    await s.updateBriefContent({
      brandId: brand.id,
      briefId: brief.id,
      content: {
        objectif: "",
        livrable: "",
        specs: "",
        ton: "",
        echeance: "",
        contexte: "",
      },
      actorId,
    });
    await expect(
      s.validateBrief({ brandId: brand.id, briefId: brief.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 8. Contenu complété → validation (version incrémentée, contenu figé).
    await s.updateBriefContent({
      brandId: brand.id,
      briefId: brief.id,
      content: {
        objectif: "Doubler la notoriété à Douala",
        livrable: "12 packshots studio",
        specs: "Fond neutre, 4000×4000",
        ton: "Premium accessible",
        echeance: "Semaine 38",
        contexte: "Campagne Rentrée 2026 — marché Cameroun",
      },
      actorId,
    });
    const validated = await s.validateBrief({ brandId: brand.id, briefId: brief.id, actorId });
    expect(validated.status).toBe("VALIDATED");
    expect(validated.validatedAt).not.toBeNull();
    expect(validated.version).toBe(3); // draft v1 + 2 éditions
    await expect(
      s.validateBrief({ brandId: brand.id, briefId: brief.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    await expect(
      s.updateBriefContent({
        brandId: brand.id,
        briefId: brief.id,
        content: {
          objectif: "trop tard",
          livrable: "figé",
          specs: "",
          ton: "",
          echeance: "",
          contexte: "",
        },
        actorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 9. Éclatement en 2 missions OPEN.
    const missions = await s.createMissionsFromBrief({
      brandId: brand.id,
      briefId: brief.id,
      titles: ["Shooting studio — 12 packshots", "Retouche + déclinaisons"],
      actorId,
    });
    expect(missions).toHaveLength(2);
    expect(missions.every((m) => m.status === "OPEN")).toBe(true);

    // 10. Circuit mission : refus de saut, puis OPEN→ASSIGNED→DELIVERED→VALIDATED.
    const [m1] = missions;
    await expect(
      s.deliverMission({ brandId: brand.id, missionId: m1!.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    const assigned = await s.assignMission({
      brandId: brand.id,
      missionId: m1!.id,
      assignee: "Awa N. (photographe)",
      actorId,
    });
    expect(assigned).toMatchObject({ status: "ASSIGNED", assignee: "Awa N. (photographe)" });
    expect(assigned.assignedAt).not.toBeNull();
    await expect(
      s.validateMission({ brandId: brand.id, missionId: m1!.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    const delivered = await s.deliverMission({ brandId: brand.id, missionId: m1!.id, actorId });
    expect(delivered.status).toBe("DELIVERED");
    const validatedMission = await s.validateMission({
      brandId: brand.id,
      missionId: m1!.id,
      actorId,
    });
    expect(validatedMission.status).toBe("VALIDATED");
    expect(validatedMission.validatedAt).not.toBeNull();

    // 11. Tenancy : une autre marque ne voit ni ne mute rien.
    const intruder = await makeBrand();
    await expect(
      s.launchCampaign({ brandId: intruder.brand.id, campaignId: campaign.id, actorId }),
    ).rejects.toMatchObject({ code: "CAMPAIGN_NOT_FOUND" });
    await expect(
      s.assignMission({
        brandId: intruder.brand.id,
        missionId: missions[1]!.id,
        assignee: "Personne",
        actorId,
      }),
    ).rejects.toMatchObject({ code: "MISSION_NOT_FOUND" });
    expect(await s.listMissions(intruder.brand.id)).toHaveLength(0);

    // 12. Vues : listCampaigns agrège coûts + « à estimer » ; listMissions remonte la provenance.
    const rows = await s.listCampaigns(brand.id);
    const row = rows.find((r) => r.id === campaign.id);
    expect(row).toBeDefined();
    const costs = s.costSummary(row!.actions);
    expect(costs).toMatchObject({ total: 454000, currency: "XAF", unestimated: 1 });
    const missionRows = await s.listMissions(brand.id);
    expect(missionRows).toHaveLength(2);
    expect(missionRows[0]!.brief.action.campaign.name).toBe("Rentrée 2026");

    // 13. AuditLog : la chaîne du workspace est complète, ordonnée, hash-chaînée.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(audit.map((row) => row.action)).toEqual([
      "campaign.create",
      "campaign.action.add",
      "campaign.action.add",
      "campaign.launch",
      "brief.create",
      "brief.update",
      "brief.update",
      "brief.validate",
      "brief.split",
      "mission.assign",
      "mission.deliver",
      "mission.validate",
    ]);
    expect(audit[0]!.prevHash).toBeNull();
    for (let i = 1; i < audit.length; i++) {
      expect(audit[i]!.prevHash).toBe(audit[i - 1]!.selfHash);
    }
  });

  it("campagne CI : les coûts d'action se résolvent au marché de la campagne", async () => {
    const s = await services();
    const { brand } = await makeBrand(); // marque CM — le marché vient de la CAMPAGNE
    const actorId = "smoke-operator";

    const campaign = await s.createCampaign({
      brandId: brand.id,
      name: "Abidjan Q4",
      objective: "Ouvrir le marché ivoirien",
      countryCode: "CI",
      actorId,
    });
    const { action } = await s.addAction({
      brandId: brand.id,
      campaignId: campaign.id,
      name: "Shooting lancement",
      kind: "photo_session_half_day",
      actorId,
    });
    expect(action).toMatchObject({ estimatedCost: 476700, costCurrency: "XOF" });

    // Archivage : gate d'écriture fermée ensuite.
    await s.archiveCampaign({ brandId: brand.id, campaignId: campaign.id, actorId });
    await expect(
      s.addAction({
        brandId: brand.id,
        campaignId: campaign.id,
        name: "Trop tard",
        kind: "custom",
        actorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    await expect(
      s.archiveCampaign({ brandId: brand.id, campaignId: campaign.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
  });
});
