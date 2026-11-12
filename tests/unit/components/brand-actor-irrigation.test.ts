// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PillarDSchema, PillarVSchema } from "@/lib/types/pillar-schemas";
import { getFieldDef } from "@/lib/types/field-registry";
import { BIBLE_D, BIBLE_V } from "@/lib/types/variable-bible";
import { mapContexteDefi, mapPlateformeStrategique, mapPropositionValeur } from "@/server/services/strategy-presentation/section-mappers";
import { ContexteDefi } from "@/components/strategy-presentation/sections/02-contexte-defi";
import { PropositionValeur } from "@/components/strategy-presentation/sections/04-proposition-valeur";
import { sectionDataToBody } from "@/server/services/strategy-presentation/export-oracle";
import { serializePillar } from "@/server/services/utils/pillar-context";
import { PillarDFields } from "@/components/cockpit/pillars/pillar-d-fields";
import { PillarVFields } from "@/components/cockpit/pillars/pillar-v-fields";
import { deriveActorProductLinks } from "@/domain/brand-actors";

const personas = [
  { name: "Festivaliers", motivations: "Découvrir le festival", actorRoles: ["COMMUNICATION_AUDIENCE", "USER"] },
  { name: "Sponsors", motivations: "Rencontrer une audience", actorRoles: ["PAYER"] },
  { name: "Stands", motivations: "Vendre dans le festival", actorRoles: ["PARTNER", "PAYER"] },
  { name: "Prestataire technique", motivations: "Fournir la sonorisation", actorRoles: ["SUPPLIER"] },
];
const exchanges = [
  { personaName: "Stands", productNames: [], valueToBrand: ["Créer le trafic"], valueToActor: ["Accéder au trafic"], actorCosts: ["Tenir le stand"], dependencyConditions: ["Une audience suffisante rend la participation viable"] },
];
const strategy = (d: unknown = { personas }, v: unknown = { personaSegmentMap: exchanges }) => ({
  name: "Festival de recette", businessContext: {}, pillars: [{ key: "d", content: d }, { key: "v", content: v }],
  gloryOutputs: [], campaigns: [], missions: [], drivers: [], frameworkResults: [], contracts: [],
});

describe("rôles et échanges de valeur d’un modèle à plusieurs publics", () => {
  it("conserve des rôles cumulables au schéma sans en attribuer aux anciens profils", () => {
    const parsed = PillarDSchema.pick({ personas: true }).parse({ personas });
    expect(parsed.personas[2]).toMatchObject({ actorRoles: ["PARTNER", "PAYER"] });
    expect(PillarDSchema.pick({ personas: true }).parse({ personas: personas.map(({ actorRoles: _, ...p }) => p) }).personas[0]).not.toHaveProperty("actorRoles");
  });
  it("conserve l’échange non monétaire sans forcer un achat ou un pourcentage de revenu", () => {
    const parsed = PillarVSchema.pick({ personaSegmentMap: true }).parse({ personaSegmentMap: exchanges });
    expect(parsed.personaSegmentMap?.[0]).toEqual(exchanges[0]);
    expect(parsed.personaSegmentMap?.[0]).not.toHaveProperty("revenueContributionPct");
  });
  it("offre une édition structurée des rôles et des conditions de participation", () => {
    const d = getFieldDef("d", "personas");
    expect(d).toMatchObject({ kind: "array-of-objects", itemFields: { actorRoles: { kind: "multi-enum" } } });
    expect(getFieldDef("v", "personaSegmentMap")).toMatchObject({ kind: "array-of-objects", itemFields: { dependencyConditions: { kind: "array-of-strings" } } });
    expect(BIBLE_D.personas?.rules?.join(" ")).toMatch(/fournisseur/i);
    expect(BIBLE_V.personaSegmentMap?.rules?.join(" ")).toMatch(/non monétaire/i);
  });
  it("transmet tous les acteurs jusqu’à l’Oracle et à l’export sans confondre les stands et le prestataire", () => {
    const section = mapContexteDefi(strategy());
    const html = renderToStaticMarkup(React.createElement(ContexteDefi, { data: section }));
    expect(html).toContain("Public de communication"); expect(html).toContain("Partenaire"); expect(html).toContain("Fournisseur");
    expect(html).toContain("Client payeur"); expect(html).not.toContain("COMMUNICATION_AUDIENCE");
    expect(sectionDataToBody(section)).toContain("Fournisseur");
    expect(mapPlateformeStrategique(strategy()).messagingFramework.map(m => m.audience)).toContain("Prestataire technique");
  });
  it("rend les contreparties et la dépendance dans la valeur sans déclarer de contrat acquis", () => {
    const section = mapPropositionValeur(strategy());
    const html = renderToStaticMarkup(React.createElement(PropositionValeur, { data: section }));
    for (const text of ["Stands", "Créer le trafic", "Accéder au trafic", "Tenir le stand", "Une audience suffisante"]) {
      expect(html).toContain(text); expect(sectionDataToBody(section)).toContain(text);
    }
    expect(html).toMatch(/ne prouvent pas.*contrat/);
  });
  it("ne déduit pas un rôle du nom ou d’un montant absent", () => {
    const section = mapContexteDefi(strategy({ personas: [{ name: "Sponsor ou fournisseur à qualifier", motivations: "Participer" }] }));
    expect(section.personas[0]).toMatchObject({ actorRoles: [] });
    expect(renderToStaticMarkup(React.createElement(ContexteDefi, { data: section }))).toContain("Rôles à qualifier");
  });
  it("porte les échanges complets dans le contexte des calculs existants", () => {
    const d = serializePillar("D", { personas }); const v = serializePillar("V", { personaSegmentMap: exchanges });
    expect(d).toContain("COMMUNICATION_AUDIENCE"); expect(d).toContain("SUPPLIER");
    expect(v).toContain("Une audience suffisante"); expect(v).toContain("Créer le trafic");
  });
  it("affiche également les rôles et dépendances dans les deux fiches ADVE", () => {
    const d = renderToStaticMarkup(React.createElement(PillarDFields, { content: { personas }, certainty: {} }));
    const v = renderToStaticMarkup(React.createElement(PillarVFields, { content: { personaSegmentMap: exchanges }, certainty: {} }));
    expect(d).toContain("Fournisseur"); expect(d).toContain("Partenaire"); expect(d).not.toContain("COMMUNICATION_AUDIENCE");
    expect(v).toContain("Créer le trafic"); expect(v).toContain("Une audience suffisante");
  });
  it("ne transforme pas les premiers produits en achats universels lors de la dérivation", () => {
    const links = deriveActorProductLinks(personas, [{ nom: "Sponsoring", segmentCible: "Sponsors" }, { nom: "Sonorisation", segmentCible: "Autre profil" }]);
    expect(links).toHaveLength(4);
    expect(links[1]).toEqual({ personaName: "Sponsors", productNames: ["Sponsoring"] });
    expect(links[0]).toEqual({ personaName: "Festivaliers", productNames: [] });
    expect(links[3]).toEqual({ personaName: "Prestataire technique", productNames: [] });
  });
});
