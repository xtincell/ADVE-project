// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { composeSectionContent } from "@/server/services/strategy-presentation/deterministic-composers";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import { BcgPortfolio, ManipulationMatrix, Mckinsey7s, TarsisWeakSignals } from "@/components/strategy-presentation/sections/phase13-sections";
import { TerritoireCreatif } from "@/components/strategy-presentation/sections/05-territoire-creatif";
import { ExperienceEngagement } from "@/components/strategy-presentation/sections/06-experience-engagement";
import { mapExperienceEngagement } from "@/server/services/strategy-presentation/section-mappers";
const context = (pillars:Record<string,Record<string,unknown>>={}) => ({strategy:{id:"fixture",name:"Exemple",businessContext:null,manipulationMix:null},pillars,cultSnapshot:null,devotionSnapshot:null,superfanCount:0,signals:[],campaigns:[]});
const compose=async(id:string,pillars:Record<string,Record<string,unknown>>={})=>(await composeSectionContent(context(pillars),SECTION_REGISTRY.find(s=>s.id===id)!))!.content;
describe("compositions Oracle : portée réelle et intégrité du texte",()=>{
 it("identifie le mix uniforme comme une proposition implicite, sans mode dominant artificiel",async()=>{
  const data=await compose("manipulation-matrix");const html=renderToStaticMarkup(React.createElement(ManipulationMatrix,{data}));expect(html).toMatch(/exploratoire/);expect(html).toContain("sans décision de marque validée");expect(html).not.toContain("★");expect(html).not.toContain("mix stratégique déclaré");
 });
 it("expose la règle documentaire BCG et l’échelle de sa couverture, sans la déclarer performance",async()=>{
  const data=await compose("bcg-portfolio",{i:{innovationsProduit:[{nom:"Offre proposée"}]}});const html=renderToStaticMarkup(React.createElement(BcgPortfolio,{data}));expect(html).toContain("exploratoire");expect(html).toContain("part de marché");expect(html).toContain("Couverture documentaire");expect(html).not.toContain("Portfolio health score");expect(html).toContain("/10");
 });
 it("qualifie les scores 7S et ne demande pas de recréer un catalogue existant",async()=>{
  const data=await compose("mckinsey-7s",{i:{catalogueParCanal:{DIGITAL:[{id:"source-one",action:"Action déjà documentée",format:"Web",objectif:"Découverte"}]}}});const html=renderToStaticMarkup(React.createElement(Mckinsey7s,{data}));expect(html).toContain("ne mesure pas l’efficacité");expect(html).toContain("Aucune campagne enregistrée");expect(html).not.toContain("Catalogue d&#x27;actions vide");
 });
 it("raccorde les analyses T sans fabriquer une observation datée ni un impact zéro",async()=>{
  const data=await compose("tarsis-weak-signals",{t:{weakSignalAnalysis:[{thesis:"Analyse de marché du dossier",rawEvent:"Événement mentionné"}],marketReality:{weakSignals:["Signal déclaré dans les documents"]}}});const html=renderToStaticMarkup(React.createElement(TarsisWeakSignals,{data}));expect(html).toContain("Analyse de marché du dossier");expect(html).toContain("Signal déclaré dans les documents");expect(html).toContain("aucune observation datée ajoutée");expect(html).not.toContain("Impact 0");
 });
 it("conserve la fin des signaux longs et ne limite pas silencieusement la liste à huit",async()=>{
  const values=Array.from({length:10},(_,n)=>`Signal ${n} `+"texte documentaire ".repeat(30)+`FIN ${n}`);const data=await compose("tarsis-weak-signals",{t:{marketReality:{weakSignals:values}}});const html=renderToStaticMarkup(React.createElement(TarsisWeakSignals,{data}));for(let n=0;n<10;n++)expect(html).toContain(`FIN ${n}`);
 });
 it("garde les compétences de la forme canonique d’équipe",async()=>{
  const data=await compose("deloitte-greenhouse",{a:{equipeDirigeante:[{nom:"Profil déclaré",role:"Produit",competencesCles:["Recherche utilisateur"]}]}});expect(JSON.stringify(data)).toContain("Recherche utilisateur");expect(JSON.stringify(data)).toContain("Diversité des rôles déclarés");
 });
 it("restitue toutes les sous-parties créatives et humanise les clés techniques",()=>{
  const html=renderToStaticMarkup(React.createElement(TerritoireCreatif,{data:{conceptGenerator:null,directionArtistique:{motionIdentity:{personality:"Fluide"}},moodboard:{theme:"Univers",keywords:["Local"],textures:["Papier"],source:"QUALIFICATION CONSERVÉE"},chromaticStrategy:null,typographySystem:null,logoAdvice:null,kvPrompts:null}}));expect(html).toContain("QUALIFICATION CONSERVÉE");expect(html).toContain("Identite mouvement");expect(html).not.toContain("motionIdentity");
 });
 it("ne transforme pas un parcours cible en pyramide de population mesurée",()=>{
  const data=mapExperienceEngagement({pillars:[{key:"e",content:{conversionTriggers:[{fromLevel:"SPECTATEUR",toLevel:"INTERESSE",trigger:"Découvrir"}]}}],devotionSnapshots:[]});const html=renderToStaticMarkup(React.createElement(ExperienceEngagement,{data}));expect(html).toContain("non mesurée");expect(html).not.toContain("0.0%");expect(html).toContain("Découvrir");
 });
});
