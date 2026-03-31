/**
 * Mestor Scenarios — What-if analysis engine
 * Budget reallocation, market entry, competitor response simulations
 */

export type ScenarioType = "BUDGET_REALLOCATION" | "MARKET_ENTRY" | "COMPETITOR_RESPONSE" | "DRIVER_ACTIVATION" | "PRICING_CHANGE";

export interface ScenarioInput {
  type: ScenarioType;
  strategyId: string;
  parameters: Record<string, unknown>;
}

export interface ScenarioResult {
  type: ScenarioType;
  title: string;
  summary: string;
  impacts: ScenarioImpact[];
  risks: string[];
  recommendations: string[];
  confidence: number;
}

interface ScenarioImpact {
  dimension: string;
  currentValue: number;
  projectedValue: number;
  delta: number;
  timeframe: string;
}

/**
 * Run a what-if scenario
 */
export async function runScenario(input: ScenarioInput): Promise<ScenarioResult> {
  switch (input.type) {
    case "BUDGET_REALLOCATION":
      return simulateBudgetReallocation(input);
    case "MARKET_ENTRY":
      return simulateMarketEntry(input);
    case "COMPETITOR_RESPONSE":
      return simulateCompetitorResponse(input);
    case "DRIVER_ACTIVATION":
      return simulateDriverActivation(input);
    case "PRICING_CHANGE":
      return simulatePricingChange(input);
    default:
      throw new Error(`Type de scénario inconnu: ${input.type}`);
  }
}

async function simulateBudgetReallocation(input: ScenarioInput): Promise<ScenarioResult> {
  const params = input.parameters as {
    fromChannel?: string;
    toChannel?: string;
    amount?: number;
    percentage?: number;
  };

  return {
    type: "BUDGET_REALLOCATION",
    title: `Réallocation budget: ${params.fromChannel} → ${params.toChannel}`,
    summary: `Simulation de la réallocation de ${params.amount?.toLocaleString() ?? "N/A"} XAF de ${params.fromChannel} vers ${params.toChannel}.`,
    impacts: [
      { dimension: "Reach", currentValue: 100000, projectedValue: 85000, delta: -15, timeframe: "30 jours" },
      { dimension: "Engagement", currentValue: 5.2, projectedValue: 7.1, delta: 1.9, timeframe: "30 jours" },
      { dimension: "Conversions", currentValue: 150, projectedValue: 180, delta: 30, timeframe: "30 jours" },
      { dimension: "CAC", currentValue: 5000, projectedValue: 4200, delta: -800, timeframe: "30 jours" },
    ],
    risks: [
      `Perte de visibilité sur ${params.fromChannel}`,
      "Période d'apprentissage algorithmique sur le nouveau canal",
      "Risque de saturation audience si le canal cible est petit",
    ],
    recommendations: [
      "Commencer par 30% du montant prévu pour tester",
      "Maintenir un budget minimum sur le canal source",
      "Mesurer l'impact après 2 semaines avant d'aller plus loin",
    ],
    confidence: 0.65,
  };
}

async function simulateMarketEntry(input: ScenarioInput): Promise<ScenarioResult> {
  const params = input.parameters as { targetMarket?: string; entryStrategy?: string; budget?: number };

  return {
    type: "MARKET_ENTRY",
    title: `Entrée marché: ${params.targetMarket}`,
    summary: `Simulation d'entrée sur le marché ${params.targetMarket} avec stratégie ${params.entryStrategy}.`,
    impacts: [
      { dimension: "TAM", currentValue: 0, projectedValue: 500000000, delta: 500000000, timeframe: "12 mois" },
      { dimension: "SAM", currentValue: 0, projectedValue: 50000000, delta: 50000000, timeframe: "12 mois" },
      { dimension: "SOM", currentValue: 0, projectedValue: 5000000, delta: 5000000, timeframe: "12 mois" },
      { dimension: "Budget requis", currentValue: 0, projectedValue: params.budget ?? 10000000, delta: params.budget ?? 10000000, timeframe: "6 mois" },
    ],
    risks: [
      "Méconnaissance du marché local",
      "Concurrence établie",
      "Différences culturelles à adapter",
      "Réglementation spécifique",
    ],
    recommendations: [
      "Commencer par une phase de market study (TARSIS)",
      "Identifier un partenaire local",
      "Adapter les Drivers au contexte culturel",
      "Budget minimum recommandé pour la phase test",
    ],
    confidence: 0.45,
  };
}

async function simulateCompetitorResponse(input: ScenarioInput): Promise<ScenarioResult> {
  const params = input.parameters as { competitor?: string; theirAction?: string };

  return {
    type: "COMPETITOR_RESPONSE",
    title: `Réponse concurrentielle: ${params.competitor}`,
    summary: `Analyse de l'impact si ${params.competitor} ${params.theirAction}.`,
    impacts: [
      { dimension: "Part de marché", currentValue: 15, projectedValue: 12, delta: -3, timeframe: "6 mois" },
      { dimension: "Brand Awareness", currentValue: 60, projectedValue: 55, delta: -5, timeframe: "3 mois" },
      { dimension: "Cult Index", currentValue: 45, projectedValue: 40, delta: -5, timeframe: "6 mois" },
    ],
    risks: [
      "Perte de clients non-fidélisés",
      "Guerre des prix potentielle",
      "Dilution du positionnement si réaction excessive",
    ],
    recommendations: [
      "Renforcer les rituels de marque (Devotion Ladder)",
      "Activer le programme Ambassador",
      "Différencier par la valeur, pas par le prix",
      "Surveiller via TARSIS (signaux faibles)",
    ],
    confidence: 0.55,
  };
}

async function simulateDriverActivation(input: ScenarioInput): Promise<ScenarioResult> {
  const params = input.parameters as { driver?: string; budget?: number };

  return {
    type: "DRIVER_ACTIVATION",
    title: `Activation Driver: ${params.driver}`,
    summary: `Projection de l'activation du canal ${params.driver} avec un budget de ${params.budget?.toLocaleString()} XAF.`,
    impacts: [
      { dimension: "Reach additionnel", currentValue: 0, projectedValue: 50000, delta: 50000, timeframe: "30 jours" },
      { dimension: "Engagement", currentValue: 0, projectedValue: 3.5, delta: 3.5, timeframe: "30 jours" },
      { dimension: "Score pilier E", currentValue: 15, projectedValue: 17, delta: 2, timeframe: "90 jours" },
    ],
    risks: [
      "ROI incertain en phase de lancement",
      "Besoin de contenu spécifique au canal",
      "Capacité équipe à gérer un canal supplémentaire",
    ],
    recommendations: [
      "Utiliser le GLORY tool 'content-calendar-strategist'",
      "Commencer par 3 publications/semaine",
      "Mesurer après 4 semaines",
    ],
    confidence: 0.70,
  };
}

async function simulatePricingChange(input: ScenarioInput): Promise<ScenarioResult> {
  const params = input.parameters as { product?: string; changePercent?: number };

  return {
    type: "PRICING_CHANGE",
    title: `Changement prix: ${params.product} (${(params.changePercent ?? 0) > 0 ? "+" : ""}${params.changePercent}%)`,
    summary: `Impact d'un changement de prix de ${params.changePercent}% sur ${params.product}.`,
    impacts: [
      { dimension: "Volume ventes", currentValue: 1000, projectedValue: 1000 * (1 - (params.changePercent ?? 0) * 0.01 * 0.5), delta: -(1000 * (params.changePercent ?? 0) * 0.01 * 0.5), timeframe: "30 jours" },
      { dimension: "Revenue", currentValue: 10000000, projectedValue: 10000000 * (1 + (params.changePercent ?? 0) * 0.005), delta: 10000000 * (params.changePercent ?? 0) * 0.005, timeframe: "30 jours" },
      { dimension: "Perception marque", currentValue: 70, projectedValue: 70 + (params.changePercent ?? 0) * 0.2, delta: (params.changePercent ?? 0) * 0.2, timeframe: "90 jours" },
    ],
    risks: [
      "Élasticité prix incertaine",
      "Réaction concurrentielle",
      "Impact sur la fidélisation",
    ],
    recommendations: [
      "Tester sur un segment avant déploiement global",
      "Communiquer la justification de la valeur ajoutée",
      "Préparer un plan de rollback",
    ],
    confidence: 0.50,
  };
}
