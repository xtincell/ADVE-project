import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL des commissions talents (WP-024) : à la validation d'une
 * mission gagnée via la Guilde, l'ordre de gain naît dans la MÊME transaction
 * (brut = dailyRate × jours OU montant déclaré par la marque, taux relu du
 * référentiel "commission" — trou de référentiel = refus honnête), puis le
 * circuit opérateur PENDING → APPROVED → PAID (référence momo) est déroulé,
 * flips atomiques, vues talent/admin/flotte, chaîne d'audit re-déroulée.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`). Skippé en CI et en
 * local sans env — la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`) et seedée (`node prisma/seed.mjs`)
 * — référentiel pays + ligne commission (GLOBAL, guild.rate) exigés.
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

describe.skipIf(!SMOKE_URL)("WP-024 smoke DB — commissions talents de bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, guild, campaigns, payouts] = await Promise.all([
      import("@/lib/db"),
      import("@/server/guild"),
      import("@/server/campaigns"),
      import("@/server/payouts"),
    ]);
    return { getDb, guild, campaigns, payouts };
  }

  function stamp() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Marque + pipeline réel jusqu'à N missions OPEN (les gates WP-008 jouent). */
  async function makeBrandWithMissions(titles: string[]) {
    const { getDb, campaigns } = await services();
    const db = getDb();
    const s = stamp();
    const actorId = "smoke-operator";
    const workspace = await db.workspace.create({
      data: { slug: `smoke-payout-${s}`, name: `Smoke payout ${s}`, kind: "BRAND" },
    });
    const brand = await db.brand.create({
      data: {
        workspaceId: workspace.id,
        slug: `smoke-payout-${s}`,
        name: `Marque ${s}`,
        countryCode: "CM",
      },
    });
    const campaign = await campaigns.createCampaign({
      brandId: brand.id,
      name: "Campagne gains",
      objective: "Objectif confidentiel de la marque",
      countryCode: "CM",
      actorId,
    });
    const { action } = await campaigns.addAction({
      brandId: brand.id,
      campaignId: campaign.id,
      name: "Shooting produit",
      kind: "photo_session_half_day",
      actorId,
    });
    await campaigns.launchCampaign({ brandId: brand.id, campaignId: campaign.id, actorId });
    const brief = await campaigns.createBriefFromAction({
      brandId: brand.id,
      actionId: action.id,
      actorId,
    });
    await campaigns.updateBriefContent({
      brandId: brand.id,
      briefId: brief.id,
      content: {
        objectif: "Objectif confidentiel de la marque",
        livrable: "12 packshots",
        specs: "",
        ton: "",
        echeance: "",
        contexte: "",
      },
      actorId,
    });
    await campaigns.validateBrief({ brandId: brand.id, briefId: brief.id, actorId });
    const missions = await campaigns.createMissionsFromBrief({
      brandId: brand.id,
      briefId: brief.id,
      titles,
      actorId,
    });
    return { workspace, brand, missions, actorId };
  }

  /** Talent Guilde complet (compte + profil), tarif journalier paramétrable. */
  async function makeTalent(name: string, dailyRate: string) {
    const { getDb, guild } = await services();
    const db = getDb();
    const s = stamp();
    const user = await db.user.create({ data: { email: `talent-${s}@exemple.test`, name } });
    const workspace = await db.workspace.create({
      data: { slug: `talent-${s}`, name: `Espace ${name}`, kind: "BRAND" },
    });
    const { profile } = await guild.upsertTalentProfile({
      userId: user.id,
      workspaceId: workspace.id,
      actorId: user.id,
      data: guild.talentProfileSchema.parse({
        headline: `${name} — Douala`,
        skills: "Photo produit",
        city: "Douala",
        countryCode: "CM",
        whatsapp: "+237690222222",
        dailyRate,
        availability: "AVAILABLE",
        visibility: "VISIBLE",
      }),
    });
    return { user, workspace, profile };
  }

  /** Mur → candidature → acceptation → livraison : mission DELIVERED du talent. */
  async function assignAndDeliver(
    brandId: string,
    missionId: string,
    talentUserId: string,
    actorId: string,
  ) {
    const { guild, campaigns } = await services();
    await guild.setMissionGuildOpen({ brandId, missionId, open: true, actorId });
    await guild.applyToMission({
      userId: talentUserId,
      missionId,
      pitch: "Studio équipé à Douala, 48 h de délai, références packshots cosmétiques.",
      actorId: talentUserId,
    });
    const [application] = await guild.listMissionApplications(brandId, missionId);
    await guild.acceptApplication({ brandId, applicationId: application!.id, actorId });
    await campaigns.deliverMission({ brandId, missionId, actorId });
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("valider une mission Guilde crée l'ordre : brut dérivé dailyRate × jours, taux du référentiel, tout audité", async () => {
    const { getDb, campaigns, payouts } = await services();
    const db = getDb();
    const { workspace, brand, missions, actorId } = await makeBrandWithMissions([
      "Shooting studio — packshots",
    ]);
    const mission = missions[0]!;
    const talent = await makeTalent("Awa Photographe", "80 000"); // 80 000 XAF/j (CM)

    await assignAndDeliver(brand.id, mission.id, talent.user.id, actorId);

    // Le taux seedé est bien relu du référentiel (0.15, placeholder annoncé).
    const rate = await payouts.getGuildCommissionRate();
    expect(rate).toMatchObject({ value: 0.15, placeholder: true });

    // Contexte du formulaire : estimation dérivable (livraison le jour même = 1 jour).
    const delivered = await db.mission.findUniqueOrThrow({ where: { id: mission.id } });
    const formContext = await payouts.getMissionPayoutContext(delivered);
    expect(formContext).toMatchObject({
      kind: "form",
      currency: "XAF",
      dailyRate: 80_000,
      days: 1,
      estimatedGross: 80_000,
    });

    // Validation SANS montant déclaré → brut = estimation, ventilé au taux seedé.
    const validated = await campaigns.validateMission({
      brandId: brand.id,
      missionId: mission.id,
      actorId,
    });
    expect(validated.status).toBe("VALIDATED");

    const payout = await db.talentPayout.findUniqueOrThrow({ where: { missionId: mission.id } });
    expect(payout).toMatchObject({
      talentId: talent.profile.id,
      workspaceId: workspace.id,
      amountGross: 80_000,
      commissionRate: 0.15,
      commissionAmount: 12_000,
      amountNet: 68_000,
      currency: "XAF",
      status: "PENDING",
      method: "momo",
      reference: null,
    });
    expect(payout.amountNet + payout.commissionAmount).toBe(payout.amountGross);

    // Re-valider est refusé (flip atomique) — et l'ordre reste unique.
    await expect(
      campaigns.validateMission({ brandId: brand.id, missionId: mission.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    expect(await db.talentPayout.count({ where: { missionId: mission.id } })).toBe(1);

    // Côté talent : « Mes gains » montre l'ordre réel.
    const mine = await payouts.listMyPayouts(talent.user.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      missionTitle: "Shooting studio — packshots",
      status: "PENDING",
      amountNet: 68_000,
      currency: "XAF",
    });

    // Récap sur la page mission une fois créé.
    const createdContext = await payouts.getMissionPayoutContext(
      await db.mission.findUniqueOrThrow({ where: { id: mission.id } }),
    );
    expect(createdContext).toMatchObject({
      kind: "created",
      payout: { status: "PENDING", amountNet: 68_000 },
    });

    // Audit : mission.validate PUIS payout.create, chaînés dans le workspace payeur.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const actions = audit.map((row) => row.action);
    expect(actions).toContain("mission.validate");
    expect(actions).toContain("payout.create");
    expect(actions.indexOf("payout.create")).toBeGreaterThan(actions.indexOf("mission.validate"));
    const createRow = audit.find((row) => row.action === "payout.create")!;
    expect(createRow.payload).toMatchObject({
      basis: "daily_rate",
      days: 1,
      amountGross: 80_000,
      amountNet: 68_000,
      currency: "XAF",
      ratePlaceholder: true,
    });
    expect(audit[0]!.prevHash).toBeNull();
    for (let i = 1; i < audit.length; i++) {
      expect(audit[i]!.prevHash).toBe(audit[i - 1]!.selfHash);
    }
  });

  it("montant déclaré par la marque : prime sur l'estimation ; tarif absent : saisie obligatoire (refus honnête)", async () => {
    const { getDb, campaigns, payouts } = await services();
    const db = getDb();
    const { brand, missions, actorId } = await makeBrandWithMissions([
      "Mission au forfait déclaré",
      "Mission sans tarif",
    ]);

    // 1. Talent AVEC tarif — mais la marque déclare un forfait : le déclaré prime.
    const awa = await makeTalent("Awa Forfait", "80000");
    await assignAndDeliver(brand.id, missions[0]!.id, awa.user.id, actorId);
    await campaigns.validateMission({
      brandId: brand.id,
      missionId: missions[0]!.id,
      actorId,
      declaredGross: 250_000,
    });
    const declared = await db.talentPayout.findUniqueOrThrow({
      where: { missionId: missions[0]!.id },
    });
    expect(declared).toMatchObject({
      amountGross: 250_000,
      commissionAmount: 37_500,
      amountNet: 212_500,
      currency: "XAF",
    });
    const declaredAudit = await db.auditLog.findFirst({
      where: { action: "payout.create", entityId: declared.id },
    });
    expect(declaredAudit?.payload).toMatchObject({ basis: "declared" });

    // 2. Talent SANS tarif : sans montant déclaré la validation est refusée
    //    (rien n'est flippé, rien n'est créé), avec le montant elle passe.
    const sansTarif = await makeTalent("Malik Sans Tarif", "");
    await assignAndDeliver(brand.id, missions[1]!.id, sansTarif.user.id, actorId);
    await expect(
      campaigns.validateMission({ brandId: brand.id, missionId: missions[1]!.id, actorId }),
    ).rejects.toMatchObject({ code: "AMOUNT_REQUIRED" });
    expect(
      (await db.mission.findUniqueOrThrow({ where: { id: missions[1]!.id } })).status,
    ).toBe("DELIVERED");
    expect(await db.talentPayout.count({ where: { missionId: missions[1]!.id } })).toBe(0);

    await campaigns.validateMission({
      brandId: brand.id,
      missionId: missions[1]!.id,
      actorId,
      declaredGross: 90_000,
    });
    expect(
      await db.talentPayout.findUniqueOrThrow({ where: { missionId: missions[1]!.id } }),
    ).toMatchObject({ amountGross: 90_000, commissionAmount: 13_500, amountNet: 76_500 });
  });

  it("trou de référentiel : sans ligne commission la validation Guilde est refusée (marche à suivre), hors Guilde elle passe sans ordre", async () => {
    const { getDb, campaigns, payouts } = await services();
    const db = getDb();
    const { brand, missions, actorId } = await makeBrandWithMissions([
      "Mission bloquée sans barème",
      "Mission hors Guilde",
    ]);
    const talent = await makeTalent("Awa Barème", "80000");
    await assignAndDeliver(brand.id, missions[0]!.id, talent.user.id, actorId);

    // On retire la ligne seedée (base jetable) : trou de référentiel assumé.
    const saved = await db.zoneIndex.findMany({ where: { family: "commission" } });
    expect(saved.length).toBeGreaterThan(0);
    await db.zoneIndex.deleteMany({ where: { family: "commission" } });
    try {
      expect(await payouts.getGuildCommissionRate()).toBeNull();
      await expect(
        campaigns.validateMission({ brandId: brand.id, missionId: missions[0]!.id, actorId }),
      ).rejects.toMatchObject({ code: "RATE_UNAVAILABLE" });
      expect(
        (await db.mission.findUniqueOrThrow({ where: { id: missions[0]!.id } })).status,
      ).toBe("DELIVERED");

      // Hors Guilde (nom déclaré, pas de compte talent) : validation SANS ordre.
      await campaigns.assignMission({
        brandId: brand.id,
        missionId: missions[1]!.id,
        assignee: "Prestataire direct",
        actorId,
      });
      await campaigns.deliverMission({ brandId: brand.id, missionId: missions[1]!.id, actorId });
      const direct = await campaigns.validateMission({
        brandId: brand.id,
        missionId: missions[1]!.id,
        actorId,
      });
      expect(direct.status).toBe("VALIDATED");
      expect(await db.talentPayout.count({ where: { missionId: missions[1]!.id } })).toBe(0);
    } finally {
      // Restauration du barème pour les autres tests (mêmes lignes seedées).
      for (const row of saved) {
        await db.zoneIndex.create({
          data: {
            family: row.family,
            countryCode: row.countryCode,
            key: row.key,
            value: row.value,
            source: row.source,
            validFrom: row.validFrom,
            validUntil: row.validUntil,
          },
        });
      }
    }

    // Barème restauré : la validation Guilde passe à nouveau.
    await campaigns.validateMission({ brandId: brand.id, missionId: missions[0]!.id, actorId });
    expect(
      await db.talentPayout.findUniqueOrThrow({ where: { missionId: missions[0]!.id } }),
    ).toMatchObject({ amountGross: 80_000, status: "PENDING" });
  });

  it("circuit opérateur : PENDING → APPROVED → PAID (référence momo), flips atomiques, files/totaux/flotte, audit chaîné", async () => {
    const { getDb, campaigns, payouts } = await services();
    const db = getDb();
    const { workspace, brand, missions, actorId } = await makeBrandWithMissions([
      "Mission à payer",
      "Mission à écarter",
    ]);
    const talent = await makeTalent("Awa Momo", "100000");
    const operatorId = "smoke-admin";

    for (const mission of missions) {
      await assignAndDeliver(brand.id, mission.id, talent.user.id, actorId);
      await campaigns.validateMission({ brandId: brand.id, missionId: mission.id, actorId });
    }
    const paidTarget = await db.talentPayout.findUniqueOrThrow({
      where: { missionId: missions[0]!.id },
    });
    const rejectedTarget = await db.talentPayout.findUniqueOrThrow({
      where: { missionId: missions[1]!.id },
    });

    // File admin : les deux ordres sont à approuver, montants joints du réel.
    let admin = await payouts.listAdminPayouts();
    const pendingIds = admin.pending.map((row) => row.id);
    expect(pendingIds).toContain(paidTarget.id);
    expect(pendingIds).toContain(rejectedTarget.id);
    const pendingRow = admin.pending.find((row) => row.id === paidTarget.id)!;
    expect(pendingRow).toMatchObject({
      missionTitle: "Mission à payer",
      workspaceName: workspace.name,
      amountNet: 85_000,
      currency: "XAF",
      talent: { whatsapp: "+237690222222" },
    });

    // Payer avant d'approuver : refusé (machine d'états).
    await expect(
      payouts.payPayout({
        id: paidTarget.id,
        method: "momo",
        reference: "MP260702.001",
        actorId: operatorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // Approuver — une seule fois (double clic refusé).
    const approved = await payouts.approvePayout({ id: paidTarget.id, actorId: operatorId });
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).not.toBeNull();
    await expect(
      payouts.approvePayout({ id: paidTarget.id, actorId: operatorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // Écarter l'autre — terminal (plus approuvable ensuite).
    const rejected = await payouts.rejectPayout({ id: rejectedTarget.id, actorId: operatorId });
    expect(rejected.status).toBe("REJECTED");
    await expect(
      payouts.approvePayout({ id: rejectedTarget.id, actorId: operatorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // Payer : rail + référence enregistrés, paidAt posé, re-payer refusé.
    const paid = await payouts.payPayout({
      id: paidTarget.id,
      method: "momo",
      reference: "MP260702.001",
      actorId: operatorId,
    });
    expect(paid).toMatchObject({ status: "PAID", method: "momo", reference: "MP260702.001" });
    expect(paid.paidAt).not.toBeNull();
    await expect(
      payouts.payPayout({
        id: paidTarget.id,
        method: "momo",
        reference: "MP260702.002",
        actorId: operatorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // Files et historique reflètent les décisions ; totaux PAR DEVISE réels.
    admin = await payouts.listAdminPayouts();
    expect(admin.pending.map((row) => row.id)).not.toContain(paidTarget.id);
    expect(admin.approved.map((row) => row.id)).not.toContain(paidTarget.id);
    const recentIds = admin.recent.map((row) => row.id);
    expect(recentIds).toContain(paidTarget.id);
    expect(recentIds).toContain(rejectedTarget.id);
    expect(admin.summary.paidNetByCurrency.XAF ?? 0).toBeGreaterThanOrEqual(85_000);
    expect(admin.summary.paidCommissionByCurrency.XAF ?? 0).toBeGreaterThanOrEqual(15_000);

    // Côté talent : statuts et référence visibles sur « Mes gains ».
    const mine = await payouts.listMyPayouts(talent.user.id);
    expect(mine.find((row) => row.id === paidTarget.id)).toMatchObject({
      status: "PAID",
      reference: "MP260702.001",
    });
    expect(mine.find((row) => row.id === rejectedTarget.id)).toMatchObject({
      status: "REJECTED",
    });

    // Audit du workspace payeur : décisions présentes, chaîne intacte.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const payoutActions = audit
      .filter((row) => row.action.startsWith("payout."))
      .map((row) => row.action);
    expect(payoutActions).toEqual([
      "payout.create",
      "payout.create",
      "payout.approve",
      "payout.reject",
      "payout.pay",
    ]);
    const payRow = audit.find((row) => row.action === "payout.pay")!;
    expect(payRow.actorId).toBe(operatorId);
    expect(payRow.payload).toMatchObject({
      method: "momo",
      reference: "MP260702.001",
      amountNet: 85_000,
    });
    expect(audit[0]!.prevHash).toBeNull();
    for (let i = 1; i < audit.length; i++) {
      expect(audit[i]!.prevHash).toBe(audit[i - 1]!.selfHash);
    }
  });
});
