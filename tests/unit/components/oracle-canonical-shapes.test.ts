// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PillarASchema, PillarESchema } from "@/lib/types/pillar-schemas";
import { mapExperienceEngagement, mapPlateformeStrategique } from "@/server/services/strategy-presentation/section-mappers";
import { sectionDataToBody } from "@/server/services/strategy-presentation/export-oracle";
import { PlateformeStrategique } from "@/components/strategy-presentation/sections/04-plateforme-strat";
import { ExperienceEngagement } from "@/components/strategy-presentation/sections/06-experience-engagement";

const strategy = (values: Record<string, unknown>) => ({
  pillars: Object.entries(values).map(([key, content]) => ({ key, content })),
  gloryOutputs: [], devotionSnapshots: [],
});

describe("Oracle — informations canoniques renseignées, lecture et export complets", () => {
  it("transmet la doctrine structurée entière sans la confondre avec une absence", () => {
    const dogmas = Array.from({ length: 12 }, (_, i) => `Dogme documentaire ${i}`);
    const a = PillarASchema.pick({ doctrine: true }).parse({ doctrine: {
      texte: "Promesse et limites du modèle de la marque.", dogmas,
      principles: ["Principe conservé"], practices: ["Pratique conservée"],
    } });
    const data = mapPlateformeStrategique(strategy({ a }));
    const html = renderToStaticMarkup(React.createElement(PlateformeStrategique, { data }));
    const body = sectionDataToBody(data);
    for (const value of ["Promesse et limites du modèle de la marque.", ...dogmas, "Principe conservé", "Pratique conservée"]) {
      expect(data.doctrine).toContain(value);
      expect(html).toContain(value);
      expect(body).toContain(value);
    }
    expect(html).not.toContain("[object Object]");
  });

  it("rend les barrières et leur mitigation issues de E, sans inventer une population mesurée", () => {
    const e = PillarESchema.pick({ barriersEngagement: true }).parse({ barriersEngagement: [
      { level: "INTERESSE", barrier: "Le lieu est difficile à retrouver", mitigation: "Conserver un lien vérifié" },
      { level: "PARTICIPANT", barrier: "Le prix paraît périmé", mitigation: "Montrer la date de vérification" },
    ] });
    const data = mapExperienceEngagement(strategy({ e }));
    const html = renderToStaticMarkup(React.createElement(ExperienceEngagement, { data }));
    const body = sectionDataToBody(data);
    for (const item of e.barriersEngagement!) for (const value of [item.level, item.barrier, item.mitigation!]) {
      expect(html).toContain(value);
      expect(body).toContain(value);
    }
    expect(data.devotionPathway!.currentDistribution).toEqual({});
    expect(data.devotionPathway!.score).toBeNull();
    expect(html).not.toContain("0.0%");
  });

  it("conserve les principes, leur application et les plateformes structurées dans la communauté", () => {
    const e = PillarESchema.pick({ principesCommunautaires: true, communityBuilding: true }).parse({
      principesCommunautaires: Array.from({ length: 5 }, (_, i) => ({ principle: `Principe ${i}`, enforcement: `Application ${i}` })),
      communityBuilding: { platforms: [{ name: "Cercle local", type: "OTHER", memberCount: 0 }], growthMechanics: ["referral", "events"] },
    });
    const data = mapExperienceEngagement(strategy({ e: { ...e, communityStrategy: "Synthèse communautaire conservée" } }));
    const html = renderToStaticMarkup(React.createElement(ExperienceEngagement, { data }));
    for (const value of ["Synthèse communautaire conservée", "Principe 4", "Application 4", "Cercle local", "OTHER", "0 membre(s) déclaré(s)", "referral", "events"]) {
      expect(html).toContain(value);
      expect(sectionDataToBody(data)).toContain(value);
    }
    expect(html).not.toContain("[object Object]");
  });

  it("garde les variantes textuelles déjà admises et ne comble pas une vraie absence", () => {
    expect(mapPlateformeStrategique(strategy({ a: { doctrine: "Doctrine textuelle historique" } })).doctrine)
      .toBe("Doctrine textuelle historique");
    expect(mapExperienceEngagement(strategy({ e: { barriersEngagement: ["Barrière textuelle historique"] } })).devotionPathway!.barriers)
      .toEqual(["Barrière textuelle historique"]);
    expect(mapPlateformeStrategique(strategy({})).doctrine).toBeNull();
    expect(mapExperienceEngagement(strategy({})).devotionPathway).toBeNull();
  });

  it("affiche le rôle renseigné des points de contact et ne demande pas une note de qualité hors schéma", () => {
    const e = PillarESchema.pick({ touchpoints: true }).parse({ touchpoints: Array.from({ length: 5 }, (_, i) => ({
      canal: `Point de contact ${i}`, type: "DIGITAL", channelRef: "WEBSITE",
      role: `Responsabilité de contact ${i}`, aarrStage: "ACQUISITION", devotionLevel: ["SPECTATEUR"],
    })) });
    const data = mapExperienceEngagement(strategy({ e }));
    const html = renderToStaticMarkup(React.createElement(ExperienceEngagement, { data }));
    for (const item of e.touchpoints) expect(html).toContain(item.role);
    expect(html).toContain("Rôle");
    expect(html).not.toContain("Qualite");
    expect(sectionDataToBody(data)).toContain("Responsabilité de contact 4");
    const legacy = mapExperienceEngagement(strategy({ e: { touchpoints: [{ canal: "Archive", qualite: "Qualité documentée" }] } }));
    expect(renderToStaticMarkup(React.createElement(ExperienceEngagement, { data: legacy }))).toContain("Qualité documentée");
  });
});
