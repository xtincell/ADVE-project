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
