// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mapContexteDefi, mapProductionLivrables, mapEquipe, mapTimelineGouvernance, mapConditionsEtapes, mapSwotExterne, mapSwotInterne } from "@/server/services/strategy-presentation/section-mappers";
import { ContexteDefi } from "@/components/strategy-presentation/sections/02-contexte-defi";
import { ProductionLivrables } from "@/components/strategy-presentation/sections/07-production";
import { EquipeDisplay } from "@/components/strategy-presentation/sections/12-equipe";
import { SwotExterne } from "@/components/strategy-presentation/sections/08-swot-externe";
import { ConditionsEtapes } from "@/components/strategy-presentation/sections/13-conditions";
import { DataTable } from "@/components/strategy-presentation/shared/data-table";
import { AARRRFunnel } from "@/components/strategy-presentation/shared/aarrr-funnel";
import { sectionDataToBody } from "@/server/services/strategy-presentation/export-oracle";
const makeStrategy = (values: Record<string,unknown>) => ({ name:"Exemple",businessContext:{},user:{name:"Compte logiciel",email:"test@example.invalid"},operator:{name:"Opérateur",slug:"operateur"},campaigns:[],missions:[],gloryOutputs:[],drivers:[],frameworkResults:[],contracts:[],pillars:Object.entries(values).map(([key,content])=>({key,content})) });
describe("source qualifiée vers vue et export Oracle",()=>{
 it("reprend le contexte courant A/V quand businessContext ne porte que le partage",()=>{
  const strategy=makeStrategy({a:{secteur:"Restauration"},v:{businessModel:"Accès utilisateur gratuit ; services des lieux distincts",economicModels:[{modele:"Services aux lieux envisagés"}],salesChannel:"Terrain B2B",positioningArchetype:"PREMIUM_ACCESSIBLE"}});
  const section=mapContexteDefi(strategy);const html=renderToStaticMarkup(React.createElement(ContexteDefi,{data:section}));
  for(const value of ["Restauration","Accès utilisateur gratuit","Services aux lieux envisagés","Terrain B2B"]){expect(html).toContain(value);expect(sectionDataToBody(section)).toContain(value);}
  expect(html).not.toContain("[object Object]");
 });
 it("transmet les propositions de production sans simuler de mission ou de sortie produite",()=>{
  const section=mapProductionLivrables(makeStrategy({i:{assetsProduisibles:[{asset:"Film manifeste",type:"VIDEO",usage:"Acquisition"},{asset:"Kit QR",type:"PRINT",usage:"Terrain"}]}}));
  const html=renderToStaticMarkup(React.createElement(ProductionLivrables,{data:section}));
  expect(html).toContain("Film manifeste");expect(html).toContain("Kit QR");expect(html).toMatch(/propos/i);expect(section.missions).toEqual([]);
  expect(Object.values(section.gloryOutputsByLayer).flat()).toEqual([]);expect(sectionDataToBody(section)).toContain("Film manifeste");
 });
 it("rend l’équipe dirigeante et ses responsabilités sans promouvoir le compte logiciel en équipe de marque",()=>{
  const strategy=makeStrategy({a:{equipeDirigeante:[{nom:"Fondatrice documentaire",role:"Produit",responsabilites:["Conception","Décisions produit"]}]}});
  const section=mapEquipe(strategy);const html=renderToStaticMarkup(React.createElement(EquipeDisplay,{data:section}));
  expect(html).toContain("Fondatrice documentaire");expect(html).toContain("Conception");expect(sectionDataToBody(section)).toContain("Décisions produit");
  expect(mapTimelineGouvernance(strategy).teamMembers.some(m=>m.name==="Fondatrice documentaire")).toBe(true);
 });
 it("conserve l’échelle canonique du fit sans la deviner à partir de la valeur",()=>{
  const canonical=mapSwotExterne(makeStrategy({t:{brandMarketFitScore:53,_fieldProvenance:{brandMarketFitScore:"INFERRED"}}}));
  const html=renderToStaticMarkup(React.createElement(SwotExterne,{data:canonical}));expect(html).toContain("53/100");expect(html).not.toContain("53/10<");expect(html).toMatch(/vérifier|estim/i);
 });
 it("ne fabrique pas un client ni une cession de droits en absence de contrat",()=>{
  const section=mapConditionsEtapes(makeStrategy({}));expect(section.client).toBeNull();expect(section.contracts).toEqual([]);
  const html=renderToStaticMarkup(React.createElement(ConditionsEtapes,{data:section}));expect(html).not.toContain("creations cedees");expect(html).not.toContain("30 jours");
 });
 it("garde owner et échéance de mitigation sans inventer une priorité",()=>{
  const section=mapSwotInterne(makeStrategy({r:{mitigationPriorities:[{action:"Recevoir le pilote",owner:"Produit",timeline:"Avant lancement",investment:"Recette"}]}}));
  const text=sectionDataToBody(section);expect(text).toContain("Produit");expect(text).toContain("Avant lancement");expect(text).toContain("Recette");expect(text).not.toContain("MEDIUM");
 });
 it("rend les cellules vides explicitement sans perdre les colonnes ni les vrais zéros",()=>{
  const html=renderToStaticMarkup(React.createElement(DataTable,{headers:["Nom","Âge","Montant"],rows:[["Exemple","",0]]}));const c=document.createElement("div");c.innerHTML=html;const cells=c.querySelectorAll("tbody td");expect(cells.length).toBe(3);expect(cells[1]?.textContent).toBe("—");expect(cells[2]?.textContent).toBe("0");
 });
 it("transmet tout le texte AARRR et garde une mesure actuelle inconnue distincte de zéro",()=>{
  const strategy="Le parcours complet contient sa qualification documentaire. ".repeat(4)+"FIN SOURCE";
  const html=renderToStaticMarkup(React.createElement(AARRRFunnel,{data:{acquisition:strategy,activation:{target:100}}}));expect(html).toContain("FIN SOURCE");expect(html).not.toContain("0 / 100");
 });
});
