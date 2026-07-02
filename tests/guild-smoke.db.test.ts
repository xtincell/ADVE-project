import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL de la Guilde (WP-011) : profil talent (création/édition
 * auditées), publication d'une mission sur le mur (gate opérateur), projection
 * anti-fuite, candidatures (unicité), décision (shortlist → accepter =
 * mission ASSIGNED + sœurs déclinées, transaction unique), contact WhatsApp
 * servi seulement après acceptation, tenancy, chaîne d'audit re-déroulée.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`). Skippé en CI et en
 * local sans env — la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`) et seedée (`node prisma/seed.mjs`)
 * — le référentiel pays (CM…) doit exister, il n'est jamais inventé ici.
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

describe.skipIf(!SMOKE_URL)("WP-011 smoke DB — la Guilde de bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, guild, campaigns] = await Promise.all([
      import("@/lib/db"),
      import("@/server/guild"),
      import("@/server/campaigns"),
    ]);
    return { getDb, guild, campaigns };
  }

  function stamp() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Marque + pipeline réel jusqu'à 2 missions OPEN (les gates WP-008 jouent). */
  async function makeBrandWithMissions() {
    const { getDb, campaigns } = await services();
    const db = getDb();
    const s = stamp();
    const actorId = "smoke-operator";
    const workspace = await db.workspace.create({
      data: { slug: `smoke-guild-${s}`, name: `Smoke guilde ${s}`, kind: "BRAND" },
    });
    const brand = await db.brand.create({
      data: {
        workspaceId: workspace.id,
        slug: `smoke-guild-${s}`,
        name: `Marque ${s}`,
        countryCode: "CM",
      },
    });
    const campaign = await campaigns.createCampaign({
      brandId: brand.id,
      name: "Rentrée Guilde",
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
      titles: ["Shooting studio — packshots", "Retouche & déclinaisons"],
      actorId,
    });
    return { workspace, brand, campaign, missions, actorId };
  }

  /** Compte + workspace d'un talent (l'inscription v7 donne un workspace à chacun). */
  async function makeTalentAccount(name: string) {
    const { getDb } = await services();
    const db = getDb();
    const s = stamp();
    const user = await db.user.create({
      data: { email: `talent-${s}@exemple.test`, name },
    });
    const workspace = await db.workspace.create({
      data: { slug: `talent-${s}`, name: `Espace ${name}`, kind: "BRAND" },
    });
    return { user, workspace };
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("profil talent : création puis édition auditées, pays du référentiel obligatoire", async () => {
    const { getDb, guild } = await services();
    const db = getDb();
    const { user, workspace } = await makeTalentAccount("Awa Ndiaye");

    // Pays inventé → refus référentiel.
    await expect(
      guild.upsertTalentProfile({
        userId: user.id,
        workspaceId: workspace.id,
        actorId: user.id,
        data: guild.talentProfileSchema.parse({
          headline: "Photographe produit — Douala",
          skills: "Photo produit\nRetouche",
          city: "Douala",
          countryCode: "ZZ",
          availability: "AVAILABLE",
          visibility: "VISIBLE",
        }),
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_COUNTRY" });

    // Création (tarif indicatif déclaré, skills normalisées).
    const created = await guild.upsertTalentProfile({
      userId: user.id,
      workspaceId: workspace.id,
      actorId: user.id,
      data: guild.talentProfileSchema.parse({
        headline: "Photographe produit — Douala",
        skills: "Photo produit\nRetouche, photo produit",
        city: "Douala",
        countryCode: "cm",
        whatsapp: "+237 690 00 00 00",
        portfolioUrl: "https://behance.net/awa",
        dailyRate: "75 000",
        availability: "AVAILABLE",
        visibility: "VISIBLE",
      }),
    });
    expect(created.created).toBe(true);
    expect(created.profile).toMatchObject({
      countryCode: "CM",
      dailyRate: 75000,
      whatsapp: "+237690000000",
      skills: ["Photo produit", "Retouche"],
    });

    // Édition — un seul profil par compte (upsert, pas de doublon).
    const updated = await guild.upsertTalentProfile({
      userId: user.id,
      workspaceId: workspace.id,
      actorId: user.id,
      data: guild.talentProfileSchema.parse({
        headline: "Photographe produit & packshot — Douala",
        skills: "Photo produit",
        city: "Douala",
        countryCode: "CM",
        dailyRate: "90000",
        availability: "BUSY",
        visibility: "VISIBLE",
      }),
    });
    expect(updated.created).toBe(false);
    expect(updated.profile.id).toBe(created.profile.id);
    expect(updated.profile.dailyRate).toBe(90000);
    expect(updated.profile.whatsapp).toBeNull(); // champ vidé = null, pas de résidu

    // Lecture : la devise du tarif vient du référentiel pays.
    const profile = await guild.getTalentProfile(user.id);
    expect(profile?.country).toMatchObject({ code: "CM", currency: "XAF" });

    // Audit : create puis update, chaînés dans le workspace du talent.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(audit.map((row) => row.action)).toEqual([
      "talent.profile.create",
      "talent.profile.update",
    ]);
    expect(audit[0]!.prevHash).toBeNull();
    expect(audit[1]!.prevHash).toBe(audit[0]!.selfHash);
  });

  it("mur + candidatures + acceptation : le circuit complet, audité, sans fuite", async () => {
    const { getDb, guild } = await services();
    const db = getDb();
    const { workspace, brand, missions, actorId } = await makeBrandWithMissions();
    const [mission, privateMission] = missions;

    const awa = await makeTalentAccount("Awa Photographe");
    const malik = await makeTalentAccount("Malik Rédacteur");
    const profileData = (headline: string) =>
      guild.talentProfileSchema.parse({
        headline,
        skills: "Photo produit",
        city: "Douala",
        countryCode: "CM",
        whatsapp: "+237690111111",
        dailyRate: "80000",
        availability: "AVAILABLE",
        visibility: "VISIBLE",
      });
    const awaProfile = (
      await guild.upsertTalentProfile({
        userId: awa.user.id,
        workspaceId: awa.workspace.id,
        actorId: awa.user.id,
        data: profileData("Photographe produit — Douala"),
      })
    ).profile;
    const malikProfile = (
      await guild.upsertTalentProfile({
        userId: malik.user.id,
        workspaceId: malik.workspace.id,
        actorId: malik.user.id,
        data: profileData("Plume publicitaire — Douala"),
      })
    ).profile;

    // 1. Sans profil, candidater est refusé honnêtement.
    const sansProfil = await makeTalentAccount("Sans Profil");
    await expect(
      guild.applyToMission({
        userId: sansProfil.user.id,
        missionId: mission!.id,
        pitch: "Je suis très motivé par cette mission de photographie produit.",
        actorId: sansProfil.user.id,
      }),
    ).rejects.toMatchObject({ code: "PROFILE_REQUIRED" });

    // 2. Mission pas encore publiée : invisible du mur, candidature impossible
    //    (l'existence même de la mission ne fuite pas).
    const countBefore = await guild.countWallMissions();
    expect((await guild.listWallMissions()).some((m) => m.id === mission!.id)).toBe(false);
    await expect(
      guild.applyToMission({
        userId: awa.user.id,
        missionId: mission!.id,
        pitch: "Je connais parfaitement ce type de shooting produit en studio.",
        actorId: awa.user.id,
      }),
    ).rejects.toMatchObject({ code: "MISSION_NOT_FOUND" });

    // 3. Publication sur le mur (gate opérateur) — idempotence refusée.
    await guild.setMissionGuildOpen({
      brandId: brand.id,
      missionId: mission!.id,
      open: true,
      actorId,
    });
    await expect(
      guild.setMissionGuildOpen({ brandId: brand.id, missionId: mission!.id, open: true, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    expect(await guild.countWallMissions()).toBe(countBefore + 1);

    // 4. Projection anti-fuite : la ligne du mur ne contient RIEN de la marque.
    const wallRow = (await guild.listWallMissions()).find((m) => m.id === mission!.id);
    expect(wallRow).toMatchObject({
      title: "Shooting studio — packshots",
      kindLabel: "Séance photo (demi-journée)",
      market: "Cameroun (CM)",
    });
    const serialized = JSON.stringify(wallRow);
    expect(serialized).not.toContain(brand.name);
    expect(serialized).not.toContain("Rentrée Guilde");
    expect(serialized).not.toContain("confidentiel");
    expect(serialized).not.toContain(workspace.id);

    // 5. Candidatures : unicité (mission × talent), la sœur privée reste fermée.
    await guild.applyToMission({
      userId: awa.user.id,
      missionId: mission!.id,
      pitch: "Studio équipé à Douala, 48 h de délai, référence packshots cosmétiques.",
      actorId: awa.user.id,
    });
    await expect(
      guild.applyToMission({
        userId: awa.user.id,
        missionId: mission!.id,
        pitch: "Je re-candidate par erreur — cela doit être refusé proprement.",
        actorId: awa.user.id,
      }),
    ).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
    await expect(
      guild.applyToMission({
        userId: awa.user.id,
        missionId: privateMission!.id,
        pitch: "Cette mission n'est pas sur le mur, je ne devrais pas la voir.",
        actorId: awa.user.id,
      }),
    ).rejects.toMatchObject({ code: "MISSION_NOT_FOUND" });
    await guild.applyToMission({
      userId: malik.user.id,
      missionId: mission!.id,
      pitch: "Je propose un angle éditorial complet autour des packshots.",
      actorId: malik.user.id,
    });

    // 6. Côté talent : mes candidatures + état du mur.
    const myApps = await guild.listMyApplications(awa.user.id);
    expect(myApps).toHaveLength(1);
    expect(myApps[0]).toMatchObject({
      status: "APPLIED",
      mission: { kindLabel: "Séance photo (demi-journée)", market: "Cameroun (CM)" },
    });
    expect((await guild.listMyAppliedMissionIds(awa.user.id)).has(mission!.id)).toBe(true);

    // 7. Côté marque : le WhatsApp reste caché tant que rien n'est accepté.
    let rows = await guild.listMissionApplications(brand.id, mission!.id);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.talent.whatsapp === null)).toBe(true);
    expect(rows[0]!.talent).toMatchObject({ dailyRate: 80000, currency: "XAF" });

    // 8. Tenancy : une marque étrangère ne voit ni ne décide rien.
    const intruder = await makeBrandWithMissions();
    expect(await guild.listMissionApplications(intruder.brand.id, mission!.id)).toHaveLength(0);
    const awaApplication = rows.find((row) => row.talent.id === awaProfile.id)!;
    await expect(
      guild.acceptApplication({
        brandId: intruder.brand.id,
        applicationId: awaApplication.id,
        actorId,
      }),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
    await expect(
      guild.setMissionGuildOpen({
        brandId: intruder.brand.id,
        missionId: mission!.id,
        open: false,
        actorId,
      }),
    ).rejects.toMatchObject({ code: "MISSION_NOT_FOUND" });

    // 9. Shortlist puis acceptation : mission ASSIGNED, sœurs déclinées, en une décision.
    await guild.shortlistApplication({
      brandId: brand.id,
      applicationId: awaApplication.id,
      actorId,
    });
    const accepted = await guild.acceptApplication({
      brandId: brand.id,
      applicationId: awaApplication.id,
      actorId,
    });
    expect(accepted.application.status).toBe("ACCEPTED");
    expect(accepted.application.decidedAt).not.toBeNull();
    expect(accepted.declinedCount).toBe(1);
    expect(accepted.mission).toMatchObject({
      status: "ASSIGNED",
      assignee: "Awa Photographe",
      assigneeTalentId: awaProfile.id,
    });
    expect(accepted.mission.assignedAt).not.toBeNull();

    // 10. Après décision : WhatsApp servi UNIQUEMENT sur la candidature acceptée ;
    //     la sœur est déclinée ; plus aucune décision possible (mission assignée).
    rows = await guild.listMissionApplications(brand.id, mission!.id);
    const awaRow = rows.find((row) => row.talent.id === awaProfile.id)!;
    const malikRow = rows.find((row) => row.talent.id === malikProfile.id)!;
    expect(awaRow.status).toBe("ACCEPTED");
    expect(awaRow.talent.whatsapp).toBe("+237690111111");
    expect(malikRow.status).toBe("DECLINED");
    expect(malikRow.talent.whatsapp).toBeNull();
    await expect(
      guild.acceptApplication({ brandId: brand.id, applicationId: malikRow.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 11. La mission a quitté le mur (assignée) ; la retirer/publier est refusé.
    expect((await guild.listWallMissions()).some((m) => m.id === mission!.id)).toBe(false);
    await expect(
      guild.setMissionGuildOpen({ brandId: brand.id, missionId: mission!.id, open: false, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 12. Côté talents : Awa voit sa mission assignée, Malik sa candidature déclinée.
    expect((await guild.listMyApplications(awa.user.id))[0]).toMatchObject({
      status: "ACCEPTED",
      mission: { status: "ASSIGNED" },
    });
    expect((await guild.listMyApplications(malik.user.id))[0]).toMatchObject({
      status: "DECLINED",
    });

    // 13. Audit : la chaîne du workspace MARQUE porte tout le circuit guilde
    //     (l'acteur d'une candidature reste le talent), hash-chaînée sans rupture.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const guildActions = audit
      .map((row) => row.action)
      .filter((action) => action.startsWith("mission."));
    expect(guildActions).toEqual([
      "mission.guild.open",
      "mission.apply",
      "mission.apply",
      "mission.application.shortlist",
      "mission.assign",
    ]);
    const assignRow = audit.find((row) => row.action === "mission.assign")!;
    expect(assignRow.payload).toMatchObject({
      via: "guilde",
      talentId: awaProfile.id,
      declinedApplications: 1,
    });
    const applyRow = audit.find((row) => row.action === "mission.apply")!;
    expect(applyRow.actorId).toBe(awa.user.id);
    expect(audit[0]!.prevHash).toBeNull();
    for (let i = 1; i < audit.length; i++) {
      expect(audit[i]!.prevHash).toBe(audit[i - 1]!.selfHash);
    }
  });
});
