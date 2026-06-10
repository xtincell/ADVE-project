/**
 * One-off: author new-model R/I/V/S content for the "UPgraders / La Fusée"
 * client (strategy cmq36gsmg0002fs01ds381c5f) and compute S via the REAL
 * computePillarS, so the persisted computed block is consistent with the app.
 * Prints JSON blobs to paste into the DB UPDATE. No DB access needed.
 */
import { computePillarS } from "../src/server/services/rtis-protocols/strategy";

// Deterministic ids so reruns are stable and FK references stay consistent.
const R1 = "a0000000-0000-4000-8000-000000000001";
const R2 = "a0000000-0000-4000-8000-000000000002";
const R3 = "a0000000-0000-4000-8000-000000000003";
const R4 = "a0000000-0000-4000-8000-000000000004";
const R5 = "a0000000-0000-4000-8000-000000000005";
const I1 = "b0000000-0000-4000-8000-000000000001";
const I2 = "b0000000-0000-4000-8000-000000000002";
const I3 = "b0000000-0000-4000-8000-000000000003";
const I4 = "b0000000-0000-4000-8000-000000000004";
const I5 = "b0000000-0000-4000-8000-000000000005";

const r = {
  globalSwot: {
    strengths: ["Méthodologie ADVE/RTIS propriétaire et structurée", "Expertise éprouvée en transformation de marque", "Réseau de créatifs et de partenaires"],
    weaknesses: ["Distinction encore trop déclarative (non prouvée)", "Dépendance à quelques clients clés", "Budget et offre récurrente non formalisés"],
    opportunities: ["Marché africain francophone en structuration", "Demande croissante de stratégie de marque", "Industrialisation via l'OS La Fusée"],
    threats: ["Évolutions du marché", "Dépendance client", "Disruptions technologiques (IA générative)"],
  },
  probabilityImpactMatrix: [
    { id: R1, risk: "Dépendance à un petit nombre de clients clés", probability: "HIGH", impact: "HIGH", severity: 100, status: "UNMITIGATED", category: "MARKET", mitigation: "Diversifier le portefeuille clients et structurer une offre récurrente (retainer)." },
    { id: R2, risk: "Distinction perçue comme déclarative, pas prouvée", probability: "HIGH", impact: "MEDIUM", severity: 67, status: "UNMITIGATED", category: "OVERTON", mitigation: "Documenter des preuves (case studies chiffrés) et bâtir une communauté engagée." },
    { id: R3, risk: "Disruption IA générative banalise le conseil stratégique", probability: "MEDIUM", impact: "HIGH", severity: 67, status: "UNMITIGATED", category: "MARKET", mitigation: "Intégrer l'IA dans l'OS comme avantage différenciant, pas comme menace." },
    { id: R4, risk: "Incohérence narrative Distinction ↔ Valeur", probability: "MEDIUM", impact: "MEDIUM", severity: 44, status: "UNMITIGATED", category: "COHERENCE", mitigation: "Atelier de cohérence : aligner positionnement distinctif et promesse de valeur." },
    { id: R5, risk: "Churn des marques accompagnées (faible rétention)", probability: "MEDIUM", impact: "HIGH", severity: 67, status: "UNMITIGATED", category: "DEVOTION", mitigation: "Programme d'ambassadeurs + parcours de fidélité structuré." },
  ],
  mitigationPriorities: [
    { action: "Lancer une offre retainer pour sécuriser et diversifier le revenu", owner: "Direction", timeline: "Q1", investment: "Moyen" },
    { action: "Produire 3 case studies chiffrés comme preuve de Distinction", owner: "Studio", timeline: "Q1-Q2", investment: "Faible" },
    { action: "Positionner l'IA / l'OS comme avantage différenciant", owner: "Produit", timeline: "Q2", investment: "Moyen" },
    { action: "Aligner Distinction ↔ Valeur via un atelier de cohérence", owner: "Stratégie", timeline: "Q1", investment: "Faible" },
    { action: "Déployer un programme d'ambassadeurs", owner: "Engagement", timeline: "Q2-Q3", investment: "Moyen" },
  ],
  riskScore: 68,
};

const i = {
  catalogueParCanal: {
    DIGITAL: [
      { id: I1, action: "Série de case studies vidéo (preuve de transformation)", format: "Vidéo", objectif: "Prouver la Distinction par la preuve", status: "SELECTED_FOR_ROADMAP", budget: 4000000, timeframe: "SPRINT_90", mitigatesRiskIds: [R2], devotionImpact: "INTERESSE", overtonShift: "De « beau discours » à « résultats prouvés »" },
      { id: I2, action: "Newsletter stratégie de marque (thought leadership)", format: "Email", objectif: "Autorité & nurturing", status: "SELECTED_FOR_ROADMAP", budget: 1500000, timeframe: "PHASE_1", devotionImpact: "PARTICIPANT" },
    ],
    PR_INFLUENCE: [
      { id: I3, action: "Programme d'ambassadeurs (marques accompagnées)", format: "Communauté", objectif: "Rétention + évangélisation", status: "SELECTED_FOR_ROADMAP", budget: 3000000, timeframe: "PHASE_2", mitigatesRiskIds: [R5], devotionImpact: "AMBASSADEUR" },
    ],
    PRODUCTION: [
      { id: I4, action: "Offre retainer packagée (revenu récurrent)", format: "Offre", objectif: "Diversifier et sécuriser le revenu", status: "SELECTED_FOR_ROADMAP", budget: 2000000, timeframe: "SPRINT_90", mitigatesRiskIds: [R1], devotionImpact: "ENGAGE" },
      { id: I5, action: "Intégration IA dans l'OS comme avantage", format: "Produit", objectif: "Différenciation technologique", status: "RECOMMENDED", budget: 5000000, timeframe: "PHASE_2", mitigatesRiskIds: [R3], devotionImpact: "PARTICIPANT" },
    ],
  },
  totalActions: 5,
};

const t = {
  overtonPosition: { currentPerception: "Un bon cabinet de conseil en stratégie de marque parmi d'autres" },
  perceptionGap: { targetPerception: "La référence qui transforme les marques en icônes culturelles", gapDescription: "Passer de « conseil déclaratif » à « transformateur prouvé »", gapScore: 62 },
};

const pillars = { r, i, t } as Record<string, Record<string, unknown>>;
const computed = computePillarS(pillars, { baseRevenue: 150_000_000 });

const s = {
  fenetreOverton: {
    perceptionActuelle: "Un bon cabinet de conseil en stratégie de marque parmi d'autres",
    perceptionCible: "La référence qui transforme les marques en icônes culturelles",
    ecart: "Passer de « conseil déclaratif » à « transformateur prouvé » — par la preuve et la communauté",
    strategieDeplacement: [
      { etape: "Prouver", action: "Publier 3 case studies chiffrés", canal: "Digital", horizon: "Q1", devotionTarget: "INTERESSE", riskId: R2 },
      { etape: "Engager", action: "Activer le programme d'ambassadeurs", canal: "PR/Influence", horizon: "Q2", devotionTarget: "AMBASSADEUR", riskId: R5 },
      { etape: "Sécuriser", action: "Déployer l'offre retainer", canal: "Production", horizon: "Q1", devotionTarget: "ENGAGE", riskId: R1 },
    ],
  },
  axesStrategiques: [
    { axe: "Distinction par la preuve", pillarsLinked: ["D", "R", "I"], kpis: ["3 case studies publiés", "Taux de conversion lead→client"] },
    { axe: "Revenu récurrent & diversification", pillarsLinked: ["V", "R"], kpis: ["% revenu retainer", "Nombre de clients actifs"] },
    { axe: "Communauté & évangélisation", pillarsLinked: ["E", "I"], kpis: ["Nombre d'ambassadeurs", "Taux de recommandation"] },
  ],
  facteursClesSucces: [
    "Documenter et prouver les transformations (data > discours)",
    "Industrialiser via l'OS La Fusée pour scaler sans diluer la qualité",
    "Construire une communauté de marques évangélistes",
  ],
  sprint90Days: [
    { action: "Lancer l'offre retainer packagée", owner: "Direction", kpi: "2 retainers signés", priority: 1, devotionImpact: "ENGAGE", sourceInitiativeId: I4 },
    { action: "Produire la série de case studies vidéo", owner: "Studio", kpi: "3 case studies publiés", priority: 1, devotionImpact: "INTERESSE", isRiskMitigation: true, sourceInitiativeId: I1 },
    { action: "Démarrer la newsletter thought leadership", owner: "Contenu", kpi: "500 abonnés", priority: 2, devotionImpact: "PARTICIPANT", sourceInitiativeId: I2 },
    { action: "Recruter les 10 premiers ambassadeurs", owner: "Engagement", kpi: "10 ambassadeurs onboardés", priority: 2, devotionImpact: "AMBASSADEUR", sourceInitiativeId: I3 },
    { action: "Cadrer l'intégration IA dans l'OS", owner: "Produit", kpi: "Specs validées", priority: 3, devotionImpact: "PARTICIPANT", sourceInitiativeId: I5 },
  ],
  roadmap: [
    { phase: "Phase 1 — Fondations", objectif: "Prouver et sécuriser", objectifDevotion: "spectateur → intéressé", actions: ["Case studies", "Offre retainer"], duree: "Mois 1-2" },
    { phase: "Phase 2 — Engagement", objectif: "Activer la communauté", objectifDevotion: "intéressé → participant", actions: ["Newsletter", "Programme ambassadeurs"], duree: "Mois 3-5" },
    { phase: "Phase 3 — Expansion", objectif: "Scaler via l'OS", objectifDevotion: "participant → engagé", actions: ["Intégration IA", "Nouveaux segments"], duree: "Mois 6-9" },
    { phase: "Phase 4 — Culte", objectif: "Devenir la référence", objectifDevotion: "engagé → évangéliste", actions: ["Communauté évangéliste", "Événement de marque"], duree: "Mois 10-12" },
  ],
  coherenceScore: 100,
  northStarKPI: { name: "Progression Devotion Ladder", target: "+10% d'évangélistes par trimestre", frequency: "MONTHLY", currentValue: "À mesurer" },
  computed,
};

console.log("=== R_IDS ==="); console.log(JSON.stringify({ R1, R2, R3, R4, R5 }));
console.log("=== PILLAR_R ==="); console.log(JSON.stringify(r));
console.log("=== PILLAR_I ==="); console.log(JSON.stringify(i));
console.log("=== PILLAR_T_PATCH ==="); console.log(JSON.stringify(t));
console.log("=== PILLAR_S ==="); console.log(JSON.stringify(s));

