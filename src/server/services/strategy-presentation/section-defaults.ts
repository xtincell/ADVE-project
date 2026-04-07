/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Strategy Presentation — Section Defaults Engine
 *
 * Generates coherent, context-aware default values for every section
 * when real pillar data is missing. Defaults are derived from whatever
 * brand context IS available: name, sector, business model, archetype,
 * vector scores, classification, etc.
 *
 * These are NOT random placeholders — they form a self-consistent initial
 * strategy skeleton that can be enriched later by Artemis / Oracle.
 */

import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";

// ─── Brand Context (extracted from strategy) ────────────────────────────────

export interface BrandContext {
  name: string;
  sector: string;
  businessModel: string;
  archetype: string;
  positioning: string;
  economicModels: string[];
  salesChannels: string[];
  vector: AdvertisVector;
  classification: BrandClassification;
  country: string;
}

export function extractBrandContext(strategy: any, vector: AdvertisVector, classification: BrandClassification): BrandContext {
  const bCtx = (strategy.businessContext as Record<string, unknown>) ?? {};
  const pillarA = strategy.pillars?.find((p: any) => p.key === "a")?.content as Record<string, unknown> | null;
  const pillarD = strategy.pillars?.find((p: any) => p.key === "d")?.content as Record<string, unknown> | null;

  return {
    name: strategy.name ?? "Marque",
    sector: str(bCtx.sector) || "Services",
    businessModel: str(bCtx.businessModel) || "B2C",
    archetype: str(pillarA?.archetype) || str(bCtx.positioningArchetype) || "Explorer",
    positioning: str(pillarD?.positionnement) || `Leader innovant dans ${str(bCtx.sector) || "son secteur"}`,
    economicModels: safeArr(bCtx.economicModels) as string[],
    salesChannels: safeArr(bCtx.salesChannels) as string[],
    vector,
    classification,
    country: str(strategy.client?.country) || str(bCtx.country) || "Cameroun",
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function str(val: unknown): string {
  return typeof val === "string" && val.length > 0 ? val : "";
}

function safeArr(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

// ─── Archetype-driven value maps ────────────────────────────────────────────

const ARCHETYPE_SCHWARTZ: Record<string, string[]> = {
  Explorer: ["Stimulation", "Autonomie", "Universalisme", "Hedonisme", "Realisation"],
  Sage: ["Universalisme", "Bienveillance", "Autonomie", "Conformite", "Tradition"],
  Hero: ["Realisation", "Pouvoir", "Stimulation", "Securite", "Autonomie"],
  Outlaw: ["Stimulation", "Autonomie", "Hedonisme", "Pouvoir", "Realisation"],
  Magician: ["Universalisme", "Stimulation", "Autonomie", "Realisation", "Hedonisme"],
  "Regular Guy": ["Bienveillance", "Conformite", "Tradition", "Securite", "Universalisme"],
  Lover: ["Hedonisme", "Bienveillance", "Stimulation", "Universalisme", "Realisation"],
  Jester: ["Hedonisme", "Stimulation", "Bienveillance", "Autonomie", "Universalisme"],
  Caregiver: ["Bienveillance", "Universalisme", "Securite", "Conformite", "Tradition"],
  Creator: ["Autonomie", "Stimulation", "Realisation", "Universalisme", "Hedonisme"],
  Ruler: ["Pouvoir", "Realisation", "Securite", "Conformite", "Tradition"],
  Innocent: ["Securite", "Bienveillance", "Conformite", "Tradition", "Universalisme"],
};

const SECTOR_PERSONAS: Record<string, Array<{ nom: string; trancheAge: string; csp: string; insightCle: string; freins: string[]; motivations: string[] }>> = {
  default: [
    { nom: "Le Decideur Pragmatique", trancheAge: "35-50", csp: "Cadre superieur / Dirigeant", insightCle: "Cherche des solutions fiables qui ont fait leurs preuves", freins: ["Risque percu", "Manque de references"], motivations: ["ROI mesurable", "Gain de temps", "Credibilite"] },
    { nom: "L'Adopteur Enthousiaste", trancheAge: "25-35", csp: "Cadre moyen / Professionnel", insightCle: "Veut etre a la pointe et partager ses decouvertes", freins: ["Prix eleve", "Complexite percue"], motivations: ["Innovation", "Statut social", "Experience unique"] },
    { nom: "L'Influenceur Silencieux", trancheAge: "28-45", csp: "Entrepreneur / Freelance", insightCle: "Recommande uniquement ce qui l'a profondement convaincu", freins: ["Surcharge d'options", "Manque d'authenticite"], motivations: ["Qualite superieure", "Valeurs partagees", "Communaute"] },
    { nom: "Le Fidele Exigeant", trancheAge: "30-55", csp: "Professionnel etabli", insightCle: "Loyal mais attend un standard d'excellence constant", freins: ["Inconsistance de qualite", "Service client faible"], motivations: ["Fiabilite", "Relation privilegiee", "Reconnaissance"] },
  ],
  "Food & Beverage": [
    { nom: "Le Foodie Curieux", trancheAge: "22-35", csp: "Jeune professionnel urbain", insightCle: "La nourriture est une aventure et un marqueur identitaire", freins: ["Prix premium", "Accessibilite limitee"], motivations: ["Decouverte gustative", "Partage social", "Authenticite"] },
    { nom: "Le Parent Attentif", trancheAge: "30-45", csp: "Cadre / Parent actif", insightCle: "Veut le meilleur pour sa famille sans compromis", freins: ["Doutes sur la qualite", "Temps de preparation"], motivations: ["Sante familiale", "Praticite", "Confiance dans la marque"] },
    { nom: "L'Epicurien Social", trancheAge: "28-40", csp: "Cadre moyen / Organisateur social", insightCle: "Chaque repas est une occasion de creer du lien", freins: ["Offres standardisees", "Manque de personnalisation"], motivations: ["Convivialite", "Prestige", "Experiences memorables"] },
    { nom: "Le Conscient Engage", trancheAge: "25-45", csp: "Professionnel CSR-sensible", insightCle: "Consomme en accord avec ses valeurs ethiques", freins: ["Greenwashing percu", "Disponibilite limitee"], motivations: ["Impact positif", "Transparence", "Tracabilite"] },
  ],
  Technology: [
    { nom: "L'Early Adopter", trancheAge: "22-35", csp: "Developpeur / Tech lead", insightCle: "Veut tester avant tout le monde et comprendre comment ca marche", freins: ["Documentation incomplete", "Instabilite"], motivations: ["Innovation pure", "Communaute tech", "Performance"] },
    { nom: "Le Decision Maker IT", trancheAge: "35-50", csp: "CTO / DSI", insightCle: "Besoin de solutions qui scalent et s'integrent", freins: ["Lock-in vendor", "Migration complexe"], motivations: ["Scalabilite", "Support enterprise", "ROI demonstrable"] },
    { nom: "L'Utilisateur Final", trancheAge: "25-45", csp: "Collaborateur / Operationnel", insightCle: "Veut que ca marche simplement, sans formation", freins: ["Courbe d'apprentissage", "Changement d'habitudes"], motivations: ["Simplicite d'usage", "Gain de productivite", "Ergonomie"] },
    { nom: "Le Champion Interne", trancheAge: "28-40", csp: "Manager intermediaire", insightCle: "Cherche des outils qui le rendent plus performant et visible", freins: ["Budget a justifier", "Resistance au changement"], motivations: ["Avantage competitif", "Visibilite", "Efficacite d'equipe"] },
  ],
  Services: [
    { nom: "Le Client Exigeant", trancheAge: "30-50", csp: "Dirigeant / Cadre superieur", insightCle: "Attend un service qui anticipe ses besoins", freins: ["Manque de reactivite", "Standardisation excessive"], motivations: ["Service premium", "Relation personnalisee", "Resultats tangibles"] },
    { nom: "Le Prospecteur Rationnel", trancheAge: "25-40", csp: "Responsable achat / Manager", insightCle: "Compare methodiquement avant de s'engager", freins: ["Opacite tarifaire", "Engagements longs"], motivations: ["Rapport qualite-prix", "Flexibilite", "Transparence"] },
    { nom: "L'Ambassadeur Naturel", trancheAge: "28-45", csp: "Entrepreneur / Consultant", insightCle: "Recommande quand le service depasse ses attentes", freins: ["Inconsistance", "Communication insuffisante"], motivations: ["Excellence de service", "Partenariat long terme", "Reciprocite"] },
    { nom: "Le Nouveau Venu", trancheAge: "22-35", csp: "Jeune professionnel", insightCle: "Premier contact avec ce type de service, cherche a etre guide", freins: ["Jargon professionnel", "Peur de se tromper"], motivations: ["Accompagnement", "Pedagogie", "Accessibilite"] },
  ],
};

// ─── Section Default Generators ─────────────────────────────────────────────

export function defaultPersonas(ctx: BrandContext): Array<{ nom: string; trancheAge: string; csp: string; insightCle: string; freinsAchat: string[]; motivations: string[] }> {
  const sectorKey = Object.keys(SECTOR_PERSONAS).find(k => ctx.sector.toLowerCase().includes(k.toLowerCase()));
  const base = SECTOR_PERSONAS[sectorKey ?? "default"] ?? SECTOR_PERSONAS.default!;
  return base.map(p => ({
    nom: p.nom,
    trancheAge: p.trancheAge,
    csp: p.csp,
    insightCle: p.insightCle,
    freinsAchat: p.freins,
    motivations: p.motivations,
  }));
}

export function defaultValeurs(ctx: BrandContext): Array<{ valeur: string; rang: number; justification: string }> {
  const key = Object.keys(ARCHETYPE_SCHWARTZ).find(k => ctx.archetype.toLowerCase().includes(k.toLowerCase()));
  const values = ARCHETYPE_SCHWARTZ[key ?? "Explorer"] ?? ARCHETYPE_SCHWARTZ.Explorer!;
  return values.map((v, i) => ({
    valeur: v,
    rang: i + 1,
    justification: `Valeur ${i === 0 ? "dominante" : i < 3 ? "structurante" : "complementaire"} pour l'archetype ${ctx.archetype}`,
  }));
}

export function defaultMessagingFramework(ctx: BrandContext, personas: Array<{ nom: string; insightCle: string; motivations: string[] }>): Array<{ audience: string; messagePrincipal: string; messagesSupport: string[]; callToAction: string }> {
  return personas.slice(0, 3).map(p => ({
    audience: p.nom,
    messagePrincipal: `${ctx.name} repond a votre besoin : ${p.insightCle}`,
    messagesSupport: p.motivations.slice(0, 2).map(m => `Parce que ${m.toLowerCase()} est essentiel`),
    callToAction: "Decouvrez comment",
  }));
}

export function defaultTouchpoints(ctx: BrandContext): Array<{ nom: string; canal: string; qualite: string; stadeAarrr: string; niveauDevotion?: string }> {
  const base = [
    { nom: "Site web / Landing page", canal: "Digital", qualite: "standard", stadeAarrr: "Acquisition", niveauDevotion: "Spectateur" },
    { nom: "Reseaux sociaux (posts organiques)", canal: "Digital", qualite: "standard", stadeAarrr: "Acquisition", niveauDevotion: "Interesse" },
    { nom: "Newsletter / Emailing", canal: "Digital", qualite: "standard", stadeAarrr: "Activation", niveauDevotion: "Participant" },
    { nom: "Service client / SAV", canal: "Direct", qualite: "premium", stadeAarrr: "Retention", niveauDevotion: "Engage" },
    { nom: "Programme de fidelite", canal: "Direct", qualite: "premium", stadeAarrr: "Revenue", niveauDevotion: "Ambassadeur" },
    { nom: "Evenements / Activations", canal: "Physique", qualite: "premium", stadeAarrr: "Referral", niveauDevotion: "Evangeliste" },
    { nom: "Contenu educatif / Blog", canal: "Digital", qualite: "standard", stadeAarrr: "Retention", niveauDevotion: "Participant" },
  ];
  if (ctx.businessModel.includes("B2B")) {
    base[0]!.nom = "Site corporate / Page LinkedIn";
    base[2]!.nom = "Webinaires / Demos";
    base[5]!.nom = "Salons professionnels / Networking";
  }
  return base;
}

export function defaultRituels(ctx: BrandContext): Array<{ nom: string; frequence: string; description: string; adoptionScore: number | null }> {
  return [
    { nom: `Le rituel ${ctx.name}`, frequence: "Hebdomadaire", description: `Moment recurrent ou les clients interagissent avec ${ctx.name} de maniere distinctive`, adoptionScore: null },
    { nom: "Partage communautaire", frequence: "Mensuel", description: "Les membres partagent leurs experiences et creent du contenu organique", adoptionScore: null },
    { nom: "Celebration de milestones", frequence: "Trimestriel", description: `${ctx.name} celebre les etapes cles de ses clients et de sa communaute`, adoptionScore: null },
  ];
}

export function defaultSwot(ctx: BrandContext): { forces: string[]; faiblesses: string[]; menaces: string[]; opportunites: string[] } {
  const s = ctx.vector;
  const forces: string[] = [];
  const faiblesses: string[] = [];

  if (s.a >= 18) forces.push("Forte authenticite de marque et histoire fondatrice credible");
  else faiblesses.push("Authenticite de marque a renforcer — manque de recit fondateur");

  if (s.d >= 18) forces.push("Distinction claire dans le paysage concurrentiel");
  else faiblesses.push("Positionnement peu differenciateur face a la concurrence");

  if (s.v >= 18) forces.push("Proposition de valeur percue comme superieure");
  else faiblesses.push("Proposition de valeur a clarifier ou renforcer");

  if (s.e >= 18) forces.push("Engagement communautaire fort et rituels etablis");
  else faiblesses.push("Engagement communautaire faible — pas de rituels d'interaction");

  if (forces.length === 0) forces.push(`Marque classifiee ${ctx.classification} avec un potentiel de croissance`, "Presence dans le secteur " + ctx.sector);
  if (faiblesses.length === 0) faiblesses.push("Marges d'amelioration identifiees sur certains piliers");

  return {
    forces,
    faiblesses,
    menaces: [
      "Intensification de la concurrence sur le marche " + ctx.sector,
      "Evolution rapide des attentes consommateurs",
      "Risque de commoditisation du secteur",
    ],
    opportunites: [
      `Marche ${ctx.sector} en croissance au ${ctx.country}`,
      "Digitalisation acceleree des parcours clients",
      "Potentiel de communaute de marque inexploite",
    ],
  };
}

export function defaultMitigations(ctx: BrandContext): Array<{ risque: string; action: string; priorite: string }> {
  return [
    { risque: "Perte de differenciation concurrentielle", action: "Renforcer le territoire de marque et les codes distinctifs", priorite: "HIGH" },
    { risque: "Desengagement communautaire", action: "Lancer un programme de fidelite et des rituels d'interaction", priorite: "HIGH" },
    { risque: "Erosion de la valeur percue", action: "Consolider les preuves de valeur et les temoignages", priorite: "MEDIUM" },
    { risque: "Retard en transformation digitale", action: "Audit et optimisation des touchpoints digitaux", priorite: "MEDIUM" },
    { risque: "Manque de ressources cles", action: "Structurer l'equipe et identifier les competences critiques", priorite: "LOW" },
  ];
}

export function defaultKpis(ctx: BrandContext): Array<{ name: string; metricType: string; target: string; frequency: string }> {
  return [
    { name: "Notoriete assistee", metricType: "Pourcentage", target: "40% a 6 mois", frequency: "Trimestriel" },
    { name: "Taux d'engagement social", metricType: "Pourcentage", target: "5% minimum", frequency: "Mensuel" },
    { name: "Net Promoter Score (NPS)", metricType: "Score", target: "+30 a 12 mois", frequency: "Trimestriel" },
    { name: "Taux de conversion", metricType: "Pourcentage", target: "3% sur le site", frequency: "Mensuel" },
    { name: "Cout d'acquisition client (CAC)", metricType: "Montant", target: `Optimiser de 15%`, frequency: "Mensuel" },
    { name: "Lifetime Value (LTV)", metricType: "Montant", target: "Augmenter de 20%", frequency: "Trimestriel" },
    { name: "Taux de retention", metricType: "Pourcentage", target: "75% a 12 mois", frequency: "Mensuel" },
    { name: "Part de voix (Share of Voice)", metricType: "Pourcentage", target: "15% du secteur", frequency: "Trimestriel" },
    { name: "Taux de referral", metricType: "Pourcentage", target: "10% des clients actifs", frequency: "Mensuel" },
    { name: "Score de devotion moyen", metricType: "Score", target: "3.5/6 paliers", frequency: "Trimestriel" },
    { name: "Nombre de superfans actifs", metricType: "Nombre", target: "50 a 12 mois", frequency: "Mensuel" },
    { name: "ROAS (Return on Ad Spend)", metricType: "Ratio", target: "3:1 minimum", frequency: "Mensuel" },
  ];
}

export function defaultAarrr(): Record<string, unknown> {
  return {
    acquisition: { target: 1000, current: 0, label: "Acquisition" },
    activation: { target: 300, current: 0, label: "Activation" },
    retention: { target: 150, current: 0, label: "Retention" },
    revenue: { target: 75, current: 0, label: "Revenue" },
    referral: { target: 30, current: 0, label: "Referral" },
  };
}

export function defaultRoadmap(ctx: BrandContext): Array<{ phase: string; objectif: string; livrables: string[]; budget: number | null; duree: string }> {
  return [
    { phase: "Phase 1 — Fondations", objectif: "Poser les bases strategiques et identitaires", livrables: ["Plateforme de marque validee", "Charte graphique", "Guidelines de communication"], budget: null, duree: "1-2 mois" },
    { phase: "Phase 2 — Lancement", objectif: "Deployer les premiers touchpoints et campagnes", livrables: ["Site web / landing pages", "Campagne de lancement", "Presence reseaux sociaux"], budget: null, duree: "2-3 mois" },
    { phase: "Phase 3 — Croissance", objectif: "Accelerer l'acquisition et construire la communaute", livrables: ["Programme de contenus", "Campagnes performance", "Premiers rituels communautaires"], budget: null, duree: "3-6 mois" },
    { phase: "Phase 4 — Engagement", objectif: "Approfondir la relation et activer la devotion", livrables: ["Programme de fidelite", "Evenements communautaires", "Ambassadeurs identifies"], budget: null, duree: "6-9 mois" },
    { phase: "Phase 5 — Amplification", objectif: "Exploiter le bouche-a-oreille et scaler", livrables: ["Programme referral", "Expansion geographique", "Partenariats strategiques"], budget: null, duree: "9-12 mois" },
    { phase: "Phase 6 — Maturite", objectif: "Consolider le statut de marque et optimiser", livrables: ["Audit de marque complet", "Optimisation du mix", "Innovation produit/service"], budget: null, duree: "12-18 mois" },
    { phase: "Phase 7 — Evolution", objectif: "Preparer le prochain cycle de croissance", livrables: ["Strategie d'extension", "Nouveaux marches", "Refresh de marque si necessaire"], budget: null, duree: "18-24 mois" },
  ];
}

export function defaultOvertonStrategy(ctx: BrandContext): Array<{ etape: string; action: string; canal: string; horizon: string }> {
  return [
    { etape: "Reconnaissance", action: "Etablir la credibilite et la presence sectorielle", canal: "PR + Contenu expert", horizon: "0-3 mois" },
    { etape: "Consideration", action: "Demontrer la valeur unique et les preuves sociales", canal: "Digital + Evenements", horizon: "3-6 mois" },
    { etape: "Preference", action: "Creer des experiences distinctives et memorables", canal: "Owned media + Communaute", horizon: "6-12 mois" },
    { etape: "Devotion", action: "Transformer les clients en ambassadeurs actifs", canal: "Programme devotion + Rituels", horizon: "12-18 mois" },
  ];
}

export function defaultJalons(ctx: BrandContext): Array<{ date: string; milestone: string; critereSucces: string }> {
  const now = new Date();
  const m = (offset: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 10);
  };
  return [
    { date: m(1), milestone: "Validation plateforme de marque", critereSucces: "Document valide par le client" },
    { date: m(3), milestone: "Lancement campagne inaugurale", critereSucces: "Campagne live sur les canaux cibles" },
    { date: m(6), milestone: "Premiers KPIs atteints", critereSucces: "Objectifs Q1 a 80% minimum" },
    { date: m(12), milestone: "Bilan annuel strategie", critereSucces: "ROI positif et base communautaire active" },
  ];
}

export function defaultMediaDrivers(ctx: BrandContext): Array<{ name: string; channel: string; channelType: string; status: string }> {
  const drivers = [
    { name: "Site web officiel", channel: "Web", channelType: "OWNED", status: "ACTIVE" },
    { name: "Instagram", channel: "Social", channelType: "OWNED", status: "ACTIVE" },
    { name: "LinkedIn", channel: "Social", channelType: "OWNED", status: "ACTIVE" },
  ];
  if (ctx.businessModel.includes("B2C")) {
    drivers.push({ name: "TikTok / YouTube Shorts", channel: "Social", channelType: "OWNED", status: "PLANNED" });
    drivers.push({ name: "Google Ads", channel: "Search", channelType: "PAID", status: "PLANNED" });
  }
  if (ctx.businessModel.includes("B2B")) {
    drivers.push({ name: "Webinaires", channel: "Events", channelType: "OWNED", status: "PLANNED" });
    drivers.push({ name: "LinkedIn Ads", channel: "Social", channelType: "PAID", status: "PLANNED" });
  }
  return drivers;
}

export function defaultSuperfanPortrait(ctx: BrandContext): { nom: string; trancheAge: string; description: string; motivations: string[]; freins: string[] } {
  return {
    nom: `Le Superfan ${ctx.name}`,
    trancheAge: "25-40",
    description: `Client ideal de ${ctx.name} : profondement aligne avec les valeurs de la marque, engage activement dans la communaute, et promoteur naturel aupres de son entourage. Il ne consomme pas seulement — il vit la marque.`,
    motivations: [
      "Adhesion aux valeurs et a la vision de la marque",
      "Sentiment d'appartenance a une communaute exclusive",
      "Experience produit/service qui depasse les attentes",
      "Reconnaissance et statut au sein de la communaute",
    ],
    freins: [
      "Deception par une inconsistance de qualite",
      "Sentiment de ne pas etre ecoute par la marque",
      "Perte du caractere exclusif ou authentique",
    ],
  };
}

export function defaultDevotionJourney(): Array<{ palier: string; trigger: string; experience: string }> {
  return [
    { palier: "Spectateur", trigger: "Premier contact avec la marque (publicite, bouche-a-oreille)", experience: "Decouverte des contenus et de l'univers de marque" },
    { palier: "Interesse", trigger: "Interaction active (visite site, suivi social, inscription newsletter)", experience: "Exploration approfondie de l'offre et des valeurs" },
    { palier: "Participant", trigger: "Premier achat ou utilisation du service", experience: "Experience produit/service conforme ou superieure aux attentes" },
    { palier: "Engage", trigger: "Re-achat + participation aux rituels de marque", experience: "Integration dans les rituels et la communaute active" },
    { palier: "Ambassadeur", trigger: "Recommandation spontanee a l'entourage", experience: "Fierte d'appartenance et envie de partager" },
    { palier: "Evangeliste", trigger: "Defense proactive de la marque + creation de contenu", experience: "Co-creation, statut de leader d'opinion communautaire" },
  ];
}

export function defaultGrowthLoops(ctx: BrandContext): Array<{ nom: string; type: string; potentielViral: number | null; plan: string }> {
  return [
    { nom: "Boucle de referral organique", type: "organique", potentielViral: 0.3, plan: "Chaque client satisfait recommande a 2-3 personnes via le programme de parrainage" },
    { nom: "Boucle de contenu UGC", type: "organique", potentielViral: 0.5, plan: "Les clients partagent leurs experiences, generant du contenu organique qui attire de nouveaux prospects" },
    { nom: "Boucle d'expertise", type: "mixte", potentielViral: 0.2, plan: `${ctx.name} produit du contenu expert qui etablit l'autorite, attire des leads qualifies` },
  ];
}

export function defaultExpansion(ctx: BrandContext): Array<{ marche: string; priorite: number; planEntree: string }> {
  return [
    { marche: `Consolidation ${ctx.country}`, priorite: 1, planEntree: "Renforcer la penetration sur le marche domestique avant toute expansion" },
    { marche: "Afrique de l'Ouest (CEDEAO)", priorite: 2, planEntree: "Expansion regionale via partenariats locaux et adaptation culturelle" },
    { marche: "Diaspora / International", priorite: 3, planEntree: "Ciblage digital de la diaspora et des marches affinitaires" },
  ];
}

export function defaultInnovationPipeline(ctx: BrandContext): Array<{ initiative: string; impact: string; faisabilite: string; timeToMarket: string }> {
  return [
    { initiative: "Experience digitale immersive", impact: "Eleve", faisabilite: "Moyenne", timeToMarket: "3-6 mois" },
    { initiative: "Programme communautaire structure", impact: "Eleve", faisabilite: "Elevee", timeToMarket: "1-3 mois" },
    { initiative: "Extension de gamme / services", impact: "Moyen", faisabilite: "Moyenne", timeToMarket: "6-12 mois" },
    { initiative: "Partenariats strategiques co-branding", impact: "Moyen", faisabilite: "Elevee", timeToMarket: "3-6 mois" },
    { initiative: "Internationalisation du modele", impact: "Tres eleve", faisabilite: "Faible", timeToMarket: "12-24 mois" },
  ];
}

export function defaultMediaActions(ctx: BrandContext): Array<{ name: string; category: string; budget: number | null; driverName: string | null }> {
  return [
    { name: "Campagne notoriete digitale", category: "DIGITAL", budget: null, driverName: "Google Ads" },
    { name: "Strategie de contenu organique", category: "DIGITAL", budget: null, driverName: "Instagram" },
    { name: "Relations presse / Media outreach", category: "ATL", budget: null, driverName: null },
    { name: "Activation terrain / Evenement", category: "BTL", budget: null, driverName: null },
  ];
}

export function defaultCatalogueParCanal(ctx: BrandContext): Record<string, Array<{ action: string; format: string; cout: string | null; impact: string }>> {
  return {
    "Digital (Owned)": [
      { action: "Refonte / optimisation site web", format: "Web", cout: null, impact: "Eleve" },
      { action: "Strategie de contenu editorial", format: "Blog / Articles", cout: null, impact: "Moyen" },
      { action: "Campagne emailing segmentee", format: "Email", cout: null, impact: "Moyen" },
    ],
    "Social Media": [
      { action: "Calendrier editorial social", format: "Posts / Stories / Reels", cout: null, impact: "Eleve" },
      { action: "Campagne d'influence micro/nano", format: "Collaborations", cout: null, impact: "Moyen" },
      { action: "Community management actif", format: "Engagement", cout: null, impact: "Eleve" },
    ],
    "Paid Media": [
      { action: "Campagne acquisition Google/Meta", format: "Ads", cout: null, impact: "Eleve" },
      { action: "Retargeting audiences engagees", format: "Display / Social Ads", cout: null, impact: "Moyen" },
    ],
    "Offline / BTL": [
      { action: "Activation point de vente", format: "Evenementiel", cout: null, impact: "Moyen" },
      { action: "Partenariats locaux", format: "Co-branding", cout: null, impact: "Moyen" },
    ],
  };
}

export function defaultCatalogueParPilier(ctx: BrandContext): Record<string, Array<{ action: string; objectif: string }>> {
  return {
    "Authenticite (A)": [
      { action: "Formaliser le recit fondateur", objectif: "Renforcer la credibilite et l'histoire de marque" },
      { action: "Documenter les preuves d'authenticite", objectif: "Ancrer la legitimite aupres des audiences" },
    ],
    "Distinction (D)": [
      { action: "Audit semiologique et positionnement", objectif: "Identifier et renforcer les codes distinctifs" },
      { action: "Creer un territoire visuel unique", objectif: "Se differencier visuellement dans le secteur" },
    ],
    "Valeur (V)": [
      { action: "Cartographier la chaine de valeur", objectif: "Demontrer la superiorite de l'offre" },
      { action: "Programme de proof points", objectif: "Collecter temoignages et cas clients" },
    ],
    "Engagement (E)": [
      { action: "Lancer le programme de devotion", objectif: "Structurer le parcours spectateur → evangeliste" },
      { action: "Designer les rituels de marque", objectif: "Creer des moments d'interaction recurrents" },
    ],
  };
}

// ─── Operationnel Defaults ──────────────────────────────────────────────────

export function defaultContracts(ctx: BrandContext): Array<{
  title: string; contractType: string; status: string;
  value: number | null; startDate: string | null; endDate: string | null; signedAt: string | null;
}> {
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      title: `Accompagnement strategique ${ctx.name} — Phase 1`,
      contractType: "PRESTATION",
      status: "ACTIVE",
      value: null,
      startDate,
      endDate,
      signedAt: null,
    },
  ];
}

export function defaultGloryOutputsByLayer(ctx: BrandContext): Record<string, Array<{ toolSlug: string; toolName: string; createdAt: string }>> {
  const now = new Date().toISOString();
  return {
    CR: [
      { toolSlug: "manifesto-forge", toolName: "Manifesto Forge", createdAt: now },
      { toolSlug: "claim-baseline-factory", toolName: "Claim Baseline Factory", createdAt: now },
    ],
    DC: [
      { toolSlug: "creative-territory-mapper", toolName: "Creative Territory Mapper", createdAt: now },
      { toolSlug: "campaign-architecture-planner", toolName: "Campaign Architecture Planner", createdAt: now },
    ],
    BRAND: [
      { toolSlug: "semiotic-brand-analyzer", toolName: "Semiotic Brand Analyzer", createdAt: now },
      { toolSlug: "chromatic-strategy-builder", toolName: "Chromatic Strategy Builder", createdAt: now },
      { toolSlug: "typography-system-architect", toolName: "Typography System Architect", createdAt: now },
    ],
    HYBRID: [
      { toolSlug: "brand-guardian-system", toolName: "Brand Guardian System", createdAt: now },
      { toolSlug: "touchpoint-optimizer", toolName: "Touchpoint Optimizer", createdAt: now },
    ],
  };
}

export function defaultTeamMembers(ctx: BrandContext, owner: { name: string | null; email: string | null; image?: string | null }): Array<{
  name: string; role: string; email: string | null; image: string | null;
}> {
  const members: Array<{ name: string; role: string; email: string | null; image: string | null }> = [];

  if (owner.name || owner.email) {
    members.push({
      name: owner.name ?? "Proprietaire",
      role: "Strategy Owner",
      email: owner.email ?? null,
      image: (owner as any).image ?? null,
    });
  }

  members.push(
    { name: "Directeur de creation", role: "Creative Director", email: null, image: null },
    { name: "Chef de projet", role: "Project Manager", email: null, image: null },
  );

  return members;
}

export function defaultOperator(ctx: BrandContext): { name: string; slug: string } {
  return { name: "LaFusee", slug: "lafusee" };
}
