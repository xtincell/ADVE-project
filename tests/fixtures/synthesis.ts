/** Invented local brand only. No real client decision or measurement. */
export function composedSynthesis() {
  return {
    fenetreOverton: { strategieDeplacement: Array.from({ length: 3 }, (_, i) => ({
      etape: `Étape ${i + 1}`, action: `Action synthétique ${i + 1}`,
    })) },
    axesStrategiques: Array.from({ length: 3 }, (_, i) => ({
      axe: `Axe ${i + 1}`, pillarsLinked: ["A", "D"], kpis: ["Indicateur synthétique"],
    })),
    facteursClesSucces: ["Clarté", "Cohérence", "Suivi"],
    sprint90Days: Array.from({ length: 5 }, (_, i) => ({
      action: `Action ${i + 1}`, kpi: "Indicateur synthétique", priority: i + 1,
    })),
    roadmap: Array.from({ length: 3 }, (_, i) => ({ phase: `Phase ${i + 1}`, objectif: "Objectif synthétique" })),
    selectedFromI: Array.from({ length: 3 }, (_, i) => ({ sourceRef: `legacy-${i}`, action: `Action ${i + 1}` })),
    devotionFunnel: [{ phase: "Phase 1" }],
    overtonMilestones: [{ phase: "Phase 1", currentPerception: "Départ", targetPerception: "Cible" }],
  };
}

/** Every PillarSSchema key present and strict-valid (invented values only). */
export function completeSynthesis() {
  return {
    ...composedSynthesis(),
    visionStrategique: "Vision synthétique", syntheseExecutive: "Synthèse synthétique",
    globalBudget: 1000, budgetBreakdown: { media: 500 }, budgetByDevotion: { acquisition: 200 },
    teamStructure: [{ name: "Profil", title: "Rôle", responsibility: "Responsabilité" }],
    coherenceScore: 80, rejectedFromI: [] as Array<{ sourceRef: string; reason: string }>,
    kpiDashboard: Array.from({ length: 5 }, (_, i) => ({ name: `Indicateur ${i + 1}`, pillar: "E", target: "10 %", frequency: "MONTHLY" })),
    northStarKPI: { name: "Indicateur nord", target: "10 %", frequency: "MONTHLY" },
    computed: { selectedRouteKey: "TARGET" },
    recommandationsPrioritaires: [{ recommendation: "Recommandation", source: "I", priority: 1 }],
  };
}
