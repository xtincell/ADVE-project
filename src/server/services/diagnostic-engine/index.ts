import { db } from "@/lib/db";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import type { BusinessContext, BusinessModelKey, PositioningArchetypeKey } from "@/lib/types/business-context";

export interface DiagnosticResult {
  strategyId: string;
  symptoms: DiagnosticSymptom[];
  diagnosis: DiagnosticFinding[];
  prescriptions: string[];
  frameworksUsed: string[];
  localization: "profile" | "driver" | "creative" | "market" | "mixed";
}

export interface DiagnosticSymptom {
  pillar: PillarKey;
  score: number;
  trend: "declining" | "stagnant" | "improving";
  severity: "low" | "medium" | "high" | "critical";
}

export interface DiagnosticFinding {
  pillar: PillarKey;
  issue: string;
  rootCause: string;
  suggestedFramework: string;
}

/**
 * ARTEMIS extension — diagnostic differentiel.
 * Analyzes a strategy's ADVE profile, identifies problems,
 * and prescribes frameworks and actions.
 * Now business-context-aware: root causes and prescriptions adapt to the model.
 */
export async function runDiagnostic(strategyId: string): Promise<DiagnosticResult> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: { where: { deletedAt: null } },
      devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 3 },
    },
  });

  const vector = strategy.advertis_vector as Record<string, number> | null;
  if (!vector) {
    return {
      strategyId,
      symptoms: [],
      diagnosis: [],
      prescriptions: ["Executer un scoring ADVE complet avant de diagnostiquer"],
      frameworksUsed: [],
      localization: "profile",
    };
  }

  const bizContext = (strategy.businessContext as unknown as BusinessContext) ?? null;

  // Identify symptoms
  const symptoms: DiagnosticSymptom[] = [];
  for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"] as PillarKey[]) {
    const score = vector[key] ?? 0;
    const pillarContent = strategy.pillars.find((p) => p.key === key);
    const confidence = pillarContent?.confidence ?? 0;

    let severity: DiagnosticSymptom["severity"] = "low";
    if (score < 8) severity = "critical";
    else if (score < 12) severity = "high";
    else if (score < 16) severity = "medium";

    if (severity !== "low") {
      symptoms.push({
        pillar: key,
        score,
        trend: confidence < 0.5 ? "stagnant" : "declining",
        severity,
      });
    }
  }

  // Generate diagnosis per symptom — now context-aware
  const diagnosis: DiagnosticFinding[] = symptoms.map((s) => ({
    pillar: s.pillar,
    issue: `Pilier ${PILLAR_NAMES[s.pillar]} faible (${s.score.toFixed(1)}/25)`,
    rootCause: getRootCause(s.pillar, vector, strategy.drivers.length, bizContext),
    suggestedFramework: getFrameworkForPillar(s.pillar),
  }));

  // Localize the problem
  const localization = localizeIssue(symptoms, strategy.drivers.length);

  // Generate prescriptions — now context-aware
  const prescriptions = generatePrescriptions(symptoms, strategy.drivers.length, localization, bizContext);

  const frameworksUsed = [...new Set(diagnosis.map((d) => d.suggestedFramework))];

  // Capture diagnostic as knowledge
  await db.knowledgeEntry.create({
    data: {
      entryType: "DIAGNOSTIC_RESULT",
      sector: undefined,
      businessModel: bizContext?.businessModel,
      data: {
        strategyId,
        symptoms: symptoms.length,
        localization,
        frameworksUsed,
        businessModel: bizContext?.businessModel,
        positioning: bizContext?.positioningArchetype,
        runAt: new Date().toISOString(),
      },
      sourceHash: `diagnostic-${strategyId}`,
    },
  });

  return { strategyId, symptoms, diagnosis, prescriptions, frameworksUsed, localization };
}

/**
 * Context-aware root causes. The same weak pillar has different explanations
 * depending on the business model and positioning.
 */
function getRootCause(
  pillar: PillarKey,
  vector: Record<string, number>,
  driverCount: number,
  bizContext: BusinessContext | null
): string {
  // Default causes
  const defaultCauses: Record<PillarKey, string> = {
    a: "Identite de marque non formalisee ou vision floue",
    d: "Positionnement indifferencie — la marque se fond dans le marche",
    v: "Proposition de valeur mal definie ou non communiquee",
    e: "Absence de strategie d'engagement communautaire",
    r: "Risques non cartographies ou plan de crise inexistant",
    t: "KPIs non definis ou non suivis — pas de culture de mesure",
    i: driverCount === 0
      ? "Aucun Driver configure — pas de canal d'execution"
      : "Roadmap non formalisee ou sous-executee",
    s: "Absence de document strategique unifie (guidelines, bible de marque)",
  };

  if (!bizContext) return defaultCauses[pillar];

  // Context-specific overrides
  const bm = bizContext.businessModel;
  const pos = bizContext.positioningArchetype;
  const sales = bizContext.salesChannel;

  // Authenticity
  if (pillar === "a") {
    if (sales === "DIRECT") return "L'authenticite manque de substance pour une marque en vente directe — le client n'a pas d'intermediaire pour valider la confiance";
    if (isLuxuryPositioning(pos)) return "Le recit de marque n'est pas a la hauteur du positionnement luxe — l'heritage et la mythologie sont insuffisants";
    if (bm === "PLATEFORME") return "Identite de marque diluee entre les deux faces du marketplace — la plateforme manque de personnalite propre";
  }

  // Distinction
  if (pillar === "d") {
    if (isLuxuryPositioning(pos)) return "Le positionnement luxe n'est pas incarne visuellement — la distinction est en dessous du seuil premium attendu";
    if (pos === "LOW_COST") return "Le positionnement low-cost ne dispense pas d'une identite visuelle distinctive — le risque est la banalisation totale";
    if (bm === "FREEMIUM_AD") return "La version gratuite cannibalise la perception de valeur — la distinction entre free et premium est invisible";
  }

  // Valeur
  if (pillar === "v") {
    if (bm === "FREEMIUM_AD" || bizContext.freeLayer) return "La frontiere gratuit/payant est floue — la conversion free-to-paid n'est pas soutenue par une proposition de valeur claire";
    if (bm === "ABONNEMENT") return "Le ratio LTV/CAC et la retention ne sont pas structures — la proposition de valeur recurrente manque de substance";
    if (isLuxuryPositioning(pos)) return "La valeur percue ne justifie pas le positionnement prix — le rapport qualite-prix emotionnel est sous-documente";
    if (pos === "LOW_COST") return "Le volume et l'efficacite operationnelle ne sont pas traduits en proposition de valeur claire pour le client";
  }

  // Engagement
  if (pillar === "e") {
    if (bm === "PLATEFORME") return "L'engagement est desequilibre — une des deux faces du marketplace est sous-adressee, la retention cote offre ou demande est faible";
    if (bm === "ABONNEMENT") return "La strategie de retention et de reduction du churn n'est pas structuree — l'engagement post-acquisition est inexistant";
    if (isLuxuryPositioning(pos) && bizContext.positionalGoodFlag) return "L'exclusivite et le sentiment d'appartenance (bien positionnel) ne sont pas cultives — la communaute manque de rituels";
    if (sales === "INTERMEDIATED") return "La marque n'a pas de relation directe avec le client final — l'intermediaire absorbe l'engagement";
  }

  // Risk
  if (pillar === "r") {
    if (bm === "FINANCIARISATION") return "Les risques reglementaires et de conformite ne sont pas cartographies — critique pour un acteur financier";
    if (bm === "PLATEFORME") return "Risque de desintermediation non gere — les deux cotes du marketplace peuvent se passer de la plateforme";
    if (bizContext.positionalGoodFlag) return "Le risque de dilution de l'exclusivite n'est pas gere — un bien positionnel perd sa valeur s'il se democratise";
  }

  return defaultCauses[pillar];
}

function getFrameworkForPillar(pillar: PillarKey): string {
  const frameworks: Record<PillarKey, string> = {
    a: "FW-03-BRAND-PRISM",
    d: "FW-05-POSITIONING-MAP",
    v: "FW-06-VALUE-PROPOSITION",
    e: "FW-07-COMMUNITY-AUDIT",
    r: "FW-04-SWOT-PLUS",
    t: "FW-08-KPI-FRAMEWORK",
    i: "FW-09-ROADMAP-BUILDER",
    s: "FW-01-BRAND-AUDIT",
  };
  return frameworks[pillar];
}

function localizeIssue(
  symptoms: DiagnosticSymptom[],
  driverCount: number
): DiagnosticResult["localization"] {
  const criticalPillars = symptoms.filter((s) => s.severity === "critical").map((s) => s.pillar);

  if (criticalPillars.includes("a") && criticalPillars.includes("d")) return "profile";
  if (criticalPillars.includes("i") && driverCount === 0) return "driver";
  if (criticalPillars.includes("e") || criticalPillars.includes("v")) return "creative";
  if (criticalPillars.includes("r") || criticalPillars.includes("t")) return "market";
  return "mixed";
}

function generatePrescriptions(
  symptoms: DiagnosticSymptom[],
  driverCount: number,
  localization: DiagnosticResult["localization"],
  bizContext: BusinessContext | null
): string[] {
  const prescriptions: string[] = [];

  if (localization === "profile") {
    prescriptions.push("Priorite 1 : Refondre le profil de marque (Authenticite + Distinction) via un Boot Sequence complet");
  }
  if (localization === "driver" || driverCount === 0) {
    prescriptions.push("Activer au minimum 2 Drivers pour commencer l'execution strategique");
  }
  if (localization === "creative") {
    prescriptions.push("Renforcer la proposition de valeur et la strategie d'engagement communautaire");
  }

  // Business-context-specific prescriptions
  if (bizContext) {
    const bm = bizContext.businessModel;
    const pos = bizContext.positioningArchetype;
    const weakPillars = symptoms.filter((s) => s.severity === "critical" || s.severity === "high").map((s) => s.pillar);

    if (bm === "FREEMIUM_AD" && weakPillars.includes("v")) {
      prescriptions.push("MODELE FREEMIUM : Clarifier la frontiere gratuit/payant — definir les feature gates et la proposition de valeur du tier premium");
    }
    if (bm === "PLATEFORME" && weakPillars.includes("e")) {
      prescriptions.push("MODELE MARKETPLACE : Equilibrer l'engagement des deux cotes — auditer la retention offreurs vs. demandeurs");
    }
    if (bm === "ABONNEMENT" && weakPillars.includes("e")) {
      prescriptions.push("MODELE ABONNEMENT : Structurer la strategie anti-churn — onboarding, engagement loops, et prevention de desabonnement");
    }
    if (isLuxuryPositioning(pos) && weakPillars.includes("d")) {
      prescriptions.push("POSITIONNEMENT LUXE : Le niveau de distinction visuelle et sensorielle n'est pas a la hauteur — investir dans l'identite premium");
    }
    if (bizContext.positionalGoodFlag && weakPillars.includes("e")) {
      prescriptions.push("BIEN POSITIONNEL : Cultiver l'exclusivite et les rituels communautaires — la valeur depend du sentiment d'appartenance a un cercle restreint");
    }
    if (bizContext.salesChannel === "DIRECT" && weakPillars.includes("a")) {
      prescriptions.push("VENTE DIRECTE : Sans intermediaire, la confiance repose entierement sur l'authenticite de la marque — priorite absolue");
    }
    if (bizContext.premiumScope === "PARTIAL") {
      prescriptions.push("PREMIUM PARTIEL : Assurer que la gamme premium est visuellement et narrativement distincte de la gamme standard — eviter la cannibalisation");
    }
  }

  for (const s of symptoms.filter((s) => s.severity === "critical")) {
    prescriptions.push(`URGENT : Pilier ${PILLAR_NAMES[s.pillar]} en zone critique (${s.score.toFixed(1)}/25) — action immediate requise`);
  }

  if (prescriptions.length === 0) {
    prescriptions.push("Profil globalement sain — optimisation continue recommandee");
  }

  return prescriptions;
}

function isLuxuryPositioning(pos: PositioningArchetypeKey): boolean {
  return pos === "ULTRA_LUXE" || pos === "LUXE" || pos === "PREMIUM";
}
