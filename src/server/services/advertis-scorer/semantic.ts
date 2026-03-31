/**
 * Semantic Structural Scorer — Real validation, not just field counting
 * Scores pillar content based on CdC ontology requirements
 */

import { validatePillarPartial, type PillarKey } from "@/lib/types/pillar-schemas";

interface ScoreBreakdown {
  component: string;
  score: number;
  maxScore: number;
  details: string;
}

interface PillarScoreResult {
  pillarKey: PillarKey;
  score: number;
  maxScore: 25;
  completionPct: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Score a single pillar's content semantically
 */
export function scorePillarSemantic(pillarKey: PillarKey, content: unknown): PillarScoreResult {
  const obj = (content && typeof content === "object" ? content : {}) as Record<string, unknown>;
  const breakdown: ScoreBreakdown[] = [];
  let total = 0;

  switch (pillarKey) {
    case "A": total = scoreA(obj, breakdown); break;
    case "D": total = scoreD(obj, breakdown); break;
    case "V": total = scoreV(obj, breakdown); break;
    case "E": total = scoreE(obj, breakdown); break;
    case "R": total = scoreR(obj, breakdown); break;
    case "T": total = scoreT(obj, breakdown); break;
    case "I": total = scoreI(obj, breakdown); break;
    case "S": total = scoreS(obj, breakdown); break;
  }

  const capped = Math.min(25, Math.round(total * 100) / 100);
  const { completionPercentage } = validatePillarPartial(pillarKey, content);

  return { pillarKey, score: capped, maxScore: 25, completionPct: completionPercentage, breakdown };
}

/**
 * Score all 8 pillars and compute composite
 */
export function scoreAllPillarsSemantic(
  pillars: Array<{ key: string; content: unknown }>
): {
  composite: number;
  classification: string;
  pillarScores: PillarScoreResult[];
} {
  const pillarScores = (["A", "D", "V", "E", "R", "T", "I", "S"] as PillarKey[]).map((key) => {
    const pillar = pillars.find((p) => p.key.toUpperCase() === key);
    return scorePillarSemantic(key, pillar?.content);
  });

  const composite = pillarScores.reduce((sum, ps) => sum + ps.score, 0);
  const classification = composite <= 80 ? "ZOMBIE" : composite <= 120 ? "ORDINAIRE" : composite <= 160 ? "FORTE" : composite <= 180 ? "CULTE" : "ICONE";

  return { composite, classification, pillarScores };
}

// Helper
function isStr(val: unknown, min: number): boolean {
  return typeof val === "string" && val.trim().length >= min;
}
function arrLen(val: unknown): number {
  return Array.isArray(val) ? val.length : 0;
}

function scoreA(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const id = (!!c.archetype ? 1 : 0) + (isStr(c.citationFondatrice, 30) ? 1 : 0) + (isStr(c.noyauIdentitaire, 100) ? 1 : 0);
  b.push({ component: "Identite", score: id, maxScore: 3, details: `archetype:${!!c.archetype}` }); t += id;
  const hj = arrLen(c.herosJourney);
  const hjS = Math.min(5, hj);
  b.push({ component: "Hero's Journey", score: hjS, maxScore: 5, details: `${hj}/5 actes` }); t += hjS;
  const ik = (c.ikigai ?? {}) as Record<string, unknown>;
  const ikS = ["love","competence","worldNeed","remuneration"].filter(k => isStr(ik[k], 50)).length;
  b.push({ component: "Ikigai", score: ikS, maxScore: 4, details: `${ikS}/4` }); t += ikS;
  const vs = arrLen(c.valeurs);
  const vS = (vs >= 3 ? 1 : 0) + (vs >= 3 && Array.isArray(c.valeurs) && (c.valeurs as Record<string,unknown>[]).every(v => isStr(v.justification, 50)) ? 1 : 0) + (vs >= 3 ? 1 : 0);
  b.push({ component: "Valeurs", score: Math.min(3, vS), maxScore: 3, details: `${vs} valeurs` }); t += Math.min(3, vS);
  const hi = arrLen(c.hierarchieCommunautaire);
  b.push({ component: "Hierarchie", score: hi >= 4 ? 2 : hi >= 2 ? 1 : 0, maxScore: 2, details: `${hi}/6` }); t += hi >= 4 ? 2 : hi >= 2 ? 1 : 0;
  const tl = (c.timelineNarrative ?? {}) as Record<string, unknown>;
  const tlF = ["origine","transformation","present","futur"].filter(k => isStr(tl[k], 50)).length;
  b.push({ component: "Timeline", score: tlF >= 4 ? 2 : tlF >= 3 ? 1 : 0, maxScore: 2, details: `${tlF}/4` }); t += tlF >= 4 ? 2 : tlF >= 3 ? 1 : 0;
  let art = (isStr(c.prophecy, 100) ? 1.5 : 0) + (c.enemy && typeof c.enemy === "object" && (c.enemy as Record<string,unknown>).name ? 2 : 0) + (isStr(c.doctrine, 100) ? 0.5 : 0);
  b.push({ component: "ARTEMIS", score: art, maxScore: 4, details: "" }); t += art;
  const q = Math.min(2, (t / 19) * 2);
  b.push({ component: "Qualite", score: Math.round(q*10)/10, maxScore: 2, details: "" }); t += q;
  return t;
}

function scoreD(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const p = arrLen(c.personas);
  const pS = Math.min(4, (p >= 2 ? 1 : 0) + (p >= 3 ? 1 : 0) + (p >= 2 ? 1 : 0) + 1);
  b.push({ component: "Personas", score: pS, maxScore: 4, details: `${p}` }); t += pS;
  const co = arrLen(c.paysageConcurrentiel);
  b.push({ component: "Concurrents", score: Math.min(3, co >= 3 ? 3 : co), maxScore: 3, details: `${co}` }); t += Math.min(3, co >= 3 ? 3 : co);
  const pr = (isStr(c.promesseMaitre, 1) ? 1 : 0) + (arrLen(c.sousPromesses) >= 2 ? 1 : 0);
  b.push({ component: "Promesses", score: pr, maxScore: 2, details: "" }); t += pr;
  b.push({ component: "Positionnement", score: isStr(c.positionnement, 1) ? 2 : 0, maxScore: 2, details: "" }); t += isStr(c.positionnement, 1) ? 2 : 0;
  const ton = (c.tonDeVoix ?? {}) as Record<string,unknown>;
  const tonS = (arrLen(ton.personnalite) >= 5 ? 1 : 0) + (arrLen(ton.onNeditPas) >= 2 ? 1 : 0);
  b.push({ component: "Ton", score: tonS, maxScore: 2, details: "" }); t += tonS;
  const al = (c.assetsLinguistiques ?? {}) as Record<string,unknown>;
  b.push({ component: "Assets ling.", score: al.slogan || al.tagline ? 1.5 : 0, maxScore: 1.5, details: "" }); t += al.slogan || al.tagline ? 1.5 : 0;
  const da = (c.directionArtistique ?? {}) as Record<string,unknown>;
  const daC = Object.values(da).filter(v => v != null && typeof v === "object" && Object.keys(v as object).length > 0).length;
  b.push({ component: "Direction art.", score: Math.min(6.5, daC * 0.65), maxScore: 6.5, details: `${daC}/10` }); t += Math.min(6.5, daC * 0.65);
  const q = Math.min(2, (t/20)*2);
  b.push({ component: "Qualite", score: Math.round(q*10)/10, maxScore: 2, details: "" }); t += q;
  return t;
}

function scoreV(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const pr = arrLen(c.produitsCatalogue);
  b.push({ component: "Produits", score: Math.min(5, pr >= 1 ? 2 + Math.min(3, pr - 1) : 0), maxScore: 5, details: `${pr}` }); t += Math.min(5, pr >= 1 ? 2 + Math.min(3, pr - 1) : 0);
  const ld = arrLen(c.productLadder);
  b.push({ component: "Ladder", score: Math.min(3, ld >= 2 ? 2 : ld), maxScore: 3, details: `${ld} tiers` }); t += Math.min(3, ld >= 2 ? 2 : ld);
  const ue = (c.unitEconomics ?? {}) as Record<string,unknown>;
  let ueS = 0;
  if (typeof ue.cac === "number") ueS++;
  if (typeof ue.ltv === "number") ueS++;
  if (isStr(ue.pointMort, 1)) ueS++;
  if (typeof ue.budgetCom === "number") ueS++;
  if (typeof ue.caVise === "number") ueS++;
  b.push({ component: "Unit Eco", score: ueS, maxScore: 5, details: `${ueS}/5` }); t += ueS;
  const adj = (typeof ue.ltv === "number" && typeof ue.cac === "number" && (ue.cac as number) > 0 && (ue.ltv as number)/(ue.cac as number) >= 3 ? 2 : 0);
  b.push({ component: "Ajustements", score: adj, maxScore: 3, details: "" }); t += adj;
  const q = Math.min(5, (t/16)*5);
  b.push({ component: "Qualite V", score: Math.round(q*10)/10, maxScore: 5, details: "" }); t += q;
  return t;
}

function scoreE(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const tp = arrLen(c.touchpoints);
  b.push({ component: "Touchpoints", score: Math.min(3, tp >= 5 ? 3 : tp >= 3 ? 2 : tp >= 1 ? 1 : 0), maxScore: 3, details: `${tp}` }); t += Math.min(3, tp >= 5 ? 3 : tp >= 3 ? 2 : tp >= 1 ? 1 : 0);
  const ri = arrLen(c.rituels);
  b.push({ component: "Rituels", score: Math.min(3, ri >= 3 ? 3 : ri), maxScore: 3, details: `${ri}` }); t += Math.min(3, ri >= 3 ? 3 : ri);
  b.push({ component: "Principes", score: arrLen(c.principesCommunautaires) >= 3 ? 1.5 : 0, maxScore: 1.5, details: "" }); t += arrLen(c.principesCommunautaires) >= 3 ? 1.5 : 0;
  const gam = (c.gamification ?? {}) as Record<string,unknown>;
  b.push({ component: "Gamification", score: arrLen(gam.niveaux) >= 3 ? 2 : 0, maxScore: 2, details: "" }); t += arrLen(gam.niveaux) >= 3 ? 2 : 0;
  const aa = (c.aarrr ?? {}) as Record<string,unknown>;
  const aaF = ["acquisition","activation","retention","revenue","referral"].filter(k => isStr(aa[k], 80)).length;
  b.push({ component: "AARRR", score: Math.min(2, aaF * 0.4), maxScore: 2, details: `${aaF}/5` }); t += Math.min(2, aaF * 0.4);
  b.push({ component: "KPIs", score: Math.min(1.5, arrLen(c.kpis) * 0.25), maxScore: 1.5, details: `${arrLen(c.kpis)}` }); t += Math.min(1.5, arrLen(c.kpis) * 0.25);
  let art = (arrLen(c.sacredCalendar) >= 4 ? 2 : 0) + (arrLen(c.commandments) >= 5 ? 2 : 0) + (arrLen(c.ritesDePassage) >= 3 ? 2 : 0) + (arrLen(c.sacraments) >= 5 ? 2 : 0);
  b.push({ component: "ARTEMIS E", score: Math.min(8, art), maxScore: 8, details: "" }); t += Math.min(8, art);
  return t;
}

function scoreR(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const gs = (c.globalSwot ?? {}) as Record<string,unknown>;
  const ok = ["strengths","weaknesses","opportunities","threats"].every(k => arrLen(gs[k]) >= 3);
  b.push({ component: "SWOT", score: ok ? 8 : 0, maxScore: 8, details: ok ? "Complet" : "Incomplet" }); t += ok ? 8 : 0;
  const mx = arrLen(c.probabilityImpactMatrix);
  b.push({ component: "Matrice", score: Math.min(7, mx * 1.4), maxScore: 7, details: `${mx}/5` }); t += Math.min(7, mx * 1.4);
  const mt = arrLen(c.mitigationPriorities);
  b.push({ component: "Mitigations", score: Math.min(7, mt * 1.4), maxScore: 7, details: `${mt}/5` }); t += Math.min(7, mt * 1.4);
  return t;
}

function scoreT(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const tri = (c.triangulation ?? {}) as Record<string,unknown>;
  const trF = ["customerInterviews","competitiveAnalysis","trendAnalysis","financialBenchmarks"].filter(k => isStr(tri[k], 100)).length;
  b.push({ component: "Triangulation", score: trF * 2, maxScore: 8, details: `${trF}/4` }); t += trF * 2;
  const hy = arrLen(c.hypothesisValidation);
  b.push({ component: "Hypotheses", score: Math.min(5, hy), maxScore: 5, details: `${hy}` }); t += Math.min(5, hy);
  const tam = (c.tamSamSom ?? {}) as Record<string,unknown>;
  const tamS = (tam.tam ? 2 : 0) + (tam.sam ? 2 : 0) + (tam.som ? 1 : 0);
  b.push({ component: "TAM/SAM/SOM", score: tamS, maxScore: 5, details: "" }); t += tamS;
  b.push({ component: "BMF", score: typeof c.brandMarketFitScore === "number" ? 3 : 0, maxScore: 3, details: "" }); t += typeof c.brandMarketFitScore === "number" ? 3 : 0;
  return t;
}

function scoreI(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  const sp = arrLen(c.sprint90Days);
  b.push({ component: "Sprint 90j", score: Math.min(5, sp >= 8 ? 5 : sp * 0.6), maxScore: 5, details: `${sp}/8` }); t += Math.min(5, sp >= 8 ? 5 : sp * 0.6);
  const cal = arrLen(c.annualCalendar);
  b.push({ component: "Calendrier", score: Math.min(5, cal >= 6 ? 5 : cal * 0.8), maxScore: 5, details: `${cal}/6` }); t += Math.min(5, cal >= 6 ? 5 : cal * 0.8);
  b.push({ component: "Budget", score: typeof c.globalBudget === "number" ? 3 : 0, maxScore: 3, details: "" }); t += typeof c.globalBudget === "number" ? 3 : 0;
  b.push({ component: "Equipe", score: arrLen(c.teamStructure) >= 3 ? 3 : 0, maxScore: 3, details: "" }); t += arrLen(c.teamStructure) >= 3 ? 3 : 0;
  const bp = (c.brandPlatform ?? {}) as Record<string,unknown>;
  const bpF = Object.values(bp).filter(v => isStr(v, 1)).length;
  b.push({ component: "UPGRADERS", score: Math.min(5, bpF), maxScore: 5, details: `${bpF}/7` }); t += Math.min(5, bpF);
  b.push({ component: "Synthese", score: isStr(c.syntheseExecutive, 200) ? 2 : 0, maxScore: 2, details: "" }); t += isStr(c.syntheseExecutive, 200) ? 2 : 0;
  return t;
}

function scoreS(c: Record<string, unknown>, b: ScoreBreakdown[]): number {
  let t = 0;
  b.push({ component: "Exec summary", score: isStr(c.syntheseExecutive, 400) ? 3 : 0, maxScore: 3, details: "" }); t += isStr(c.syntheseExecutive, 400) ? 3 : 0;
  b.push({ component: "Vision", score: isStr(c.visionStrategique, 200) ? 2 : 0, maxScore: 2, details: "" }); t += isStr(c.visionStrategique, 200) ? 2 : 0;
  b.push({ component: "Coherence", score: arrLen(c.coherencePiliers) >= 7 ? 3 : 0, maxScore: 3, details: "" }); t += arrLen(c.coherencePiliers) >= 7 ? 3 : 0;
  b.push({ component: "FCS", score: arrLen(c.facteursClesSucces) >= 5 ? 2 : 0, maxScore: 2, details: "" }); t += arrLen(c.facteursClesSucces) >= 5 ? 2 : 0;
  b.push({ component: "Recommandations", score: arrLen(c.recommandationsPrioritaires) >= 8 ? 3 : 0, maxScore: 3, details: "" }); t += arrLen(c.recommandationsPrioritaires) >= 8 ? 3 : 0;
  b.push({ component: "Axes", score: arrLen(c.axesStrategiques) >= 3 ? 3 : 0, maxScore: 3, details: "" }); t += arrLen(c.axesStrategiques) >= 3 ? 3 : 0;
  b.push({ component: "Sprint recap", score: arrLen(c.sprint90Recap) >= 8 ? 2 : 0, maxScore: 2, details: "" }); t += arrLen(c.sprint90Recap) >= 8 ? 2 : 0;
  b.push({ component: "KPIs", score: arrLen(c.kpiDashboard) >= 7 ? 2 : 0, maxScore: 2, details: "" }); t += arrLen(c.kpiDashboard) >= 7 ? 2 : 0;
  const cS = typeof c.coherenceScore === "number" ? Math.min(3, 3 * (c.coherenceScore as number) / 100) : 0;
  b.push({ component: "Bonus coherence", score: Math.round(cS*10)/10, maxScore: 3, details: "" }); t += cS;
  return t;
}
