import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { scoreObject } from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { getAdaptiveQuestions, getBusinessContextQuestions } from "./question-bank";
import type { BusinessContext, BusinessModelKey, EconomicModelKey, PositioningArchetypeKey, SalesChannel, PremiumScope } from "@/lib/types/business-context";
import { POSITIONING_ARCHETYPES } from "@/lib/types/business-context";

export interface QuickIntakeStartInput {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName: string;
  sector?: string;
  country?: string;
  businessModel?: string;
  economicModel?: string;
  positioning?: string;
  source?: string;
}

export interface QuickIntakeAdvanceInput {
  token: string;
  responses: Record<string, unknown>;
}

export async function start(input: QuickIntakeStartInput) {
  const intake = await db.quickIntake.create({
    data: {
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      companyName: input.companyName,
      sector: input.sector,
      country: input.country,
      businessModel: input.businessModel,
      economicModel: input.economicModel,
      positioning: input.positioning,
      source: input.source,
      responses: {} as Prisma.InputJsonValue,
      status: "IN_PROGRESS",
    },
  });

  // Start with business context questions, then move to ADVE pillars
  const firstQuestions = getBusinessContextQuestions();

  return {
    token: intake.shareToken,
    questions: firstQuestions,
    currentPillar: "biz",
    progress: 0,
  };
}

export async function advance(input: QuickIntakeAdvanceInput) {
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: input.token },
  });

  if (!intake) throw new Error("Intake not found");
  if (intake.status !== "IN_PROGRESS") throw new Error("Intake already completed");

  // Merge new responses with existing
  const existingResponses = (intake.responses as Record<string, unknown>) ?? {};
  const mergedResponses = { ...existingResponses, ...input.responses };

  // Determine next pillar based on progress (biz first, then ADVE pillars)
  const allSteps = ["biz", "a", "d", "v", "e", "r", "t", "i", "s"];
  const answeredSteps = new Set(
    Object.keys(mergedResponses).map((key) => key.split("_")[0])
  );
  const nextPillar = allSteps.find((p) => !answeredSteps.has(p));
  const progress = answeredSteps.size / allSteps.length;

  // If biz step just completed, persist business context fields on the intake
  if (answeredSteps.has("biz") && mergedResponses.biz_model) {
    const bizModel = extractKeyFromOption(mergedResponses.biz_model as string);
    const bizPositioning = extractKeyFromOption(mergedResponses.biz_positioning as string);
    const bizRevenue = Array.isArray(mergedResponses.biz_revenue)
      ? (mergedResponses.biz_revenue as string[]).map(extractKeyFromOption).join(",")
      : typeof mergedResponses.biz_revenue === "string"
        ? extractKeyFromOption(mergedResponses.biz_revenue)
        : undefined;

    await db.quickIntake.update({
      where: { id: intake.id },
      data: {
        businessModel: bizModel,
        economicModel: bizRevenue,
        positioning: bizPositioning,
      },
    });
  }

  await db.quickIntake.update({
    where: { id: intake.id },
    data: { responses: mergedResponses as Prisma.InputJsonValue },
  });

  if (!nextPillar) {
    // All pillars covered, ready to complete
    return {
      token: input.token,
      questions: [],
      currentPillar: null,
      progress: 1,
      readyToComplete: true,
    };
  }

  const questions = await getAdaptiveQuestions(nextPillar, mergedResponses);

  return {
    token: input.token,
    questions,
    currentPillar: nextPillar,
    progress,
    readyToComplete: false,
  };
}

export async function complete(token: string) {
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: token },
  });

  if (!intake) throw new Error("Intake not found");

  // Build BusinessContext from intake responses
  const businessContext = buildBusinessContext(intake);

  // Ensure a system user exists for auto-generated strategies
  const systemUser = await db.user.upsert({
    where: { email: "system@lafusee.io" },
    update: {},
    create: {
      email: "system@lafusee.io",
      name: "System",
      role: "ADMIN",
    },
  });

  // Create a temporary strategy for scoring
  const strategy = await db.strategy.create({
    data: {
      name: `Quick Intake: ${intake.companyName}`,
      description: `Auto-generated from Quick Intake ${intake.id}`,
      userId: systemUser.id,
      status: "QUICK_INTAKE",
      businessContext: businessContext as unknown as Prisma.InputJsonValue,
    },
  });

  // Populate pillar content from responses
  // Responses are structured as { "a": { "q0": "...", "q1": "...", "q2": "..." }, "d": { ... }, ... }
  const responses = intake.responses as Record<string, Record<string, unknown>>;
  const pillars = ["a", "d", "v", "e", "r", "t", "i", "s"];

  for (const pillar of pillars) {
    const pillarResponses = responses[pillar];
    if (pillarResponses && typeof pillarResponses === "object" && Object.keys(pillarResponses).length > 0) {
      await db.pillar.create({
        data: {
          strategyId: strategy.id,
          key: pillar,
          content: pillarResponses as Prisma.InputJsonValue,
          confidence: 0.4, // Low confidence for quick intake
        },
      });
    }
  }

  // Score the strategy
  const vector = await scoreObject("strategy", strategy.id);
  const classification = classifyBrand(vector.composite);

  // Generate diagnostic based on actual responses
  const diagnostic = generateDiagnostic(
    vector,
    classification,
    responses as Record<string, Record<string, string>> | null,
    intake.companyName,
  );

  // Update the intake with results
  await db.quickIntake.update({
    where: { id: intake.id },
    data: {
      advertis_vector: vector,
      classification,
      diagnostic,
      convertedToId: strategy.id,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  // Auto-create CRM Deal from intake
  const deal = await db.deal.create({
    data: {
      contactName: intake.contactName,
      contactEmail: intake.contactEmail,
      companyName: intake.companyName,
      stage: "LEAD",
      source: "QUICK_INTAKE",
      intakeId: intake.id,
      strategyId: strategy.id,
      value: estimateDealValue(intake.sector, intake.businessModel),
      currency: "XAF",
    },
  });

  // Track funnel entry
  await db.funnelMapping.create({
    data: { dealId: deal.id, step: "LEAD" },
  });

  // Capture knowledge
  await db.knowledgeEntry.create({
    data: {
      entryType: "DIAGNOSTIC_RESULT",
      sector: intake.sector,
      market: intake.country,
      data: {
        type: "quick_intake_completed",
        intakeId: intake.id,
        strategyId: strategy.id,
        dealId: deal.id,
        classification,
        composite: vector.composite,
      } as Prisma.InputJsonValue,
      sourceHash: `intake-${intake.id}`.slice(0, 16),
    },
  }).catch((err) => { console.warn("[knowledge] capture failed:", err instanceof Error ? err.message : err); });

  return {
    token,
    vector,
    classification,
    diagnostic,
    strategyId: strategy.id,
    dealId: deal.id,
  };
}

function estimateDealValue(sector?: string | null, businessModel?: string | null): number {
  const baseValues: Record<string, number> = {
    FMCG: 5000000, BANQUE: 15000000, STARTUP: 2000000, TECH: 8000000,
    RETAIL: 4000000, HOSPITALITY: 6000000, EDUCATION: 3000000,
  };
  const modelMultiplier: Record<string, number> = {
    B2C: 1.0, B2B: 1.5, B2B2C: 1.3, D2C: 0.8, MARKETPLACE: 1.2,
  };
  const base = baseValues[sector ?? ""] ?? 5000000;
  const multiplier = modelMultiplier[businessModel ?? ""] ?? 1.0;
  return Math.round(base * multiplier);
}

/**
 * Extracts the key portion from "KEY::Label" format options.
 */
function extractKeyFromOption(option: string): string {
  const parts = option.split("::");
  return parts[0] ?? option;
}

/**
 * Builds a BusinessContext from a QuickIntake record's responses and fields.
 */
function buildBusinessContext(
  intake: { businessModel: string | null; economicModel: string | null; positioning: string | null; responses: unknown }
): BusinessContext | null {
  if (!intake.businessModel) return null;

  const responses = (intake.responses ?? {}) as Record<string, unknown>;
  const salesChannelRaw = extractKeyFromOption((responses.biz_sales_channel as string) ?? "HYBRID");
  const premiumScopeRaw = extractKeyFromOption((responses.biz_premium_scope as string) ?? "NONE");
  const freeElementRaw = extractKeyFromOption((responses.biz_free_element as string) ?? "NONE");

  const positioningKey = (intake.positioning ?? "MAINSTREAM") as PositioningArchetypeKey;
  const archetype = POSITIONING_ARCHETYPES[positioningKey];
  const isPositionalGood = archetype?.positionalGood === true;

  const economicModels = intake.economicModel
    ? intake.economicModel.split(",") as EconomicModelKey[]
    : ["VENTE_DIRECTE" as EconomicModelKey];

  const ctx: BusinessContext = {
    businessModel: intake.businessModel as BusinessModelKey,
    economicModels,
    positioningArchetype: positioningKey,
    salesChannel: salesChannelRaw as SalesChannel,
    positionalGoodFlag: isPositionalGood,
    premiumScope: premiumScopeRaw as PremiumScope,
  };

  // Build free layer if applicable
  if (freeElementRaw !== "NONE") {
    const freeDetail = (responses.biz_free_detail as string) ?? "";
    ctx.freeLayer = {
      whatIsFree: freeElementRaw,
      whatIsPaid: freeDetail || "Non précisé",
      conversionLever: freeElementRaw === "FREEMIUM" ? "feature_gate" : freeElementRaw === "CONTENT" ? "content_upsell" : "ad_conversion",
    };
  }

  return ctx;
}

/**
 * Analyse les réponses réelles du prospect pour générer des recommandations
 * contextuelles et spécifiques — pas des templates génériques.
 */
function generateDiagnostic(
  vector: Record<string, number>,
  classification: string,
  responses?: Record<string, Record<string, string>> | null,
  companyName?: string
) {
  const pillars = [
    { key: "a", name: "Authenticite", score: vector.a ?? 0 },
    { key: "d", name: "Distinction", score: vector.d ?? 0 },
    { key: "v", name: "Valeur", score: vector.v ?? 0 },
    { key: "e", name: "Engagement", score: vector.e ?? 0 },
    { key: "r", name: "Risk", score: vector.r ?? 0 },
    { key: "t", name: "Track", score: vector.t ?? 0 },
    { key: "i", name: "Implementation", score: vector.i ?? 0 },
    { key: "s", name: "Strategie", score: vector.s ?? 0 },
  ];

  const sorted = [...pillars].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const weaknesses = sorted.slice(-3).reverse();

  // Analyse each weak pillar based on actual responses
  const recommendations = weaknesses.map((w) => {
    const weakPillarData = responses?.[w.key];
    const analysis = analyzePillarResponses(w.key, w.name, w.score, weakPillarData);
    return analysis;
  });

  // Build contextual summary
  const strongNames = strengths.map((p) => p.name).join(", ");
  const weakNames = weaknesses.map((p) => p.name).join(", ");
  const brand = companyName || "Votre marque";

  let summaryIntro: string;
  if (classification === "ZOMBIE") {
    summaryIntro = `${brand} presente des fondations fragiles. Plusieurs piliers strategiques sont absents ou sous-developpes, ce qui la rend vulnerable et invisible sur son marche.`;
  } else if (classification === "ORDINAIRE") {
    summaryIntro = `${brand} possede une base fonctionnelle mais manque d'elements differenciants. Elle risque d'etre substituable par n'importe quel concurrent.`;
  } else if (classification === "FORTE") {
    summaryIntro = `${brand} a des fondations solides avec des forces reelles en ${strongNames}. L'enjeu est maintenant de combler les lacunes pour passer au niveau superieur.`;
  } else if (classification === "CULTE") {
    summaryIntro = `${brand} approche le statut culte avec une communaute naissante. Les piliers ${strongNames} sont vos moteurs. Optimiser ${weakNames} peut declencher un mouvement.`;
  } else {
    summaryIntro = `${brand} transcende son marche. Focus sur la perennite et la transmission.`;
  }

  return {
    classification,
    strengths: strengths.map((p) => ({
      pillar: p.name,
      key: p.key,
      score: p.score,
      insight: generateStrengthInsight(p.key, pillarResponses(responses, p.key)),
    })),
    weaknesses: weaknesses.map((p) => ({
      pillar: p.name,
      key: p.key,
      score: p.score,
    })),
    summary: summaryIntro,
    recommendations,
  };
}

function pillarResponses(
  responses: Record<string, Record<string, string>> | null | undefined,
  key: string
): Record<string, string> | undefined {
  return responses?.[key] ?? undefined;
}

function generateStrengthInsight(
  key: string,
  responses?: Record<string, string>
): string {
  if (!responses) return "Ce pilier montre de bonnes fondations.";

  const answers = Object.values(responses).filter((v) => v?.trim());
  const totalLength = answers.reduce((sum, a) => sum + a.length, 0);

  // Richer answers = stronger signal
  if (totalLength > 200) {
    return "Vos reponses detaillees montrent une vraie maturite sur ce pilier. Capitalisez dessus dans votre communication.";
  }
  return "Ce pilier montre du potentiel. Approfondissez-le pour en faire un vrai avantage concurrentiel.";
}

/**
 * Analyse les réponses d'un pilier faible pour générer une recommandation
 * basée sur le contenu réel — pas un template.
 */
function analyzePillarResponses(
  key: string,
  name: string,
  score: number,
  responses?: Record<string, string>
): { pillar: string; key: string; score: number; diagnostic: string; actions: string[] } {
  const answers = responses
    ? Object.values(responses).filter((v) => v?.trim())
    : [];
  const totalContent = answers.join(" ").toLowerCase();
  const hasSubstance = totalContent.length > 50;
  const isVague = answers.some((a) => a.length < 15);
  const saysNo = answers.some((a) => /^(non|no|aucun|pas encore|rien|0|nope)/i.test(a.trim()));

  // Pillar-specific analysis
  switch (key) {
    case "a": {
      const noStory = saysNo || totalContent.includes("pas d'histoire") || !hasSubstance;
      const noValues = answers.length < 3 || isVague;
      return {
        pillar: name, key, score,
        diagnostic: noStory
          ? "Votre marque n'a pas de mythologie fondatrice articulee. Sans histoire, il n'y a pas d'emotion, et sans emotion, pas de connexion avec votre audience."
          : noValues
            ? "Vous avez une histoire mais vos valeurs restent floues. Une marque authentique doit pouvoir articuler clairement ce en quoi elle croit."
            : "Votre authenticite existe mais manque de structure. Elle doit etre codifiee pour devenir un outil strategique.",
        actions: noStory
          ? [
              "Documenter votre histoire fondatrice : le moment declencheur, le probleme que vous avez voulu resoudre, votre transformation personnelle",
              "Identifier votre archetype de marque (Heros, Sage, Rebelle...) pour ancrer votre narration",
              "Formuler 3 valeurs non-negociables qui guident chaque decision",
            ]
          : [
              "Structurer votre narration fondatrice en un recit de 90 secondes",
              "Decliner vos valeurs en comportements observables par vos clients",
              "Creer un manifeste de marque d'une page",
            ],
      };
    }
    case "d": {
      const noDiff = saysNo || totalContent.includes("pas de difference") || totalContent.includes("inexistant");
      const noVisual = answers.length >= 2 && answers[1] && answers[1].length < 20;
      return {
        pillar: name, key, score,
        diagnostic: noDiff
          ? "Vous n'avez pas identifie ce qui vous rend unique. Sur un marche competitif, l'absence de distinction signifie l'invisibilite."
          : noVisual
            ? "Votre positionnement verbal existe mais votre identite visuelle est sous-developpee. Le visuel represente 80% de la premiere impression."
            : "Votre distinction a du potentiel mais n'est pas assez tranchante pour marquer les esprits.",
        actions: noDiff
          ? [
              "Cartographier 5 concurrents directs et identifier les espaces non occupes",
              "Definir votre 'Only Statement' : Nous sommes les seuls a [X] pour [Y] parce que [Z]",
              "Tester votre proposition aupres de 10 clients : peuvent-ils vous decrire en une phrase ?",
            ]
          : [
              "Creer un moodboard de direction artistique avec codes couleurs, typographies, imagerie",
              "Definir votre ton de voix : 3 mots qu'on utilise, 3 mots qu'on n'utilise jamais",
              "Auditer la coherence visuelle sur tous vos points de contact",
            ],
      };
    }
    case "v": {
      const noPromise = saysNo || !hasSubstance;
      const weakOffer = totalContent.includes("service") && totalContent.length < 100;
      return {
        pillar: name, key, score,
        diagnostic: noPromise
          ? "Votre promesse de valeur n'est pas articulee. Sans promesse claire, vos clients ne savent pas pourquoi acheter chez vous plutot qu'ailleurs."
          : weakOffer
            ? "Vous avez une offre mais elle n'est pas structuree en proposition de valeur. Il y a une difference entre decrire ce que vous faites et promettre un resultat."
            : "Votre proposition de valeur existe mais manque de precision. Passez du vague au mesurable.",
        actions: noPromise
          ? [
              "Formuler votre promesse en une phrase : 'Pour [cible], nous promettons [resultat] grace a [methode]'",
              "Lister les 3 resultats concrets que vos clients obtiennent en travaillant avec vous",
              "Definir votre pricing ladder : offre d'appel, offre principale, offre premium",
            ]
          : [
              "Quantifier votre impact : delais, pourcentages, montants concrets",
              "Creer un catalogue structure avec benefices clients (pas juste des features)",
              "Mettre en place un systeme de temoignages clients pour prouver votre promesse",
            ],
      };
    }
    case "e": {
      const noCommunity = saysNo || totalContent.includes("pas de communaut");
      const passiveEngagement = !totalContent.includes("interag") && !totalContent.includes("echange");
      return {
        pillar: name, key, score,
        diagnostic: noCommunity
          ? "Aucune communaute active. Votre marque parle mais personne ne repond. L'engagement est le carburant de la croissance organique."
          : passiveEngagement
            ? "Vous avez une audience mais pas une communaute. La difference : une audience consomme, une communaute participe et evangelise."
            : "Votre engagement existe mais n'est pas structure en rituels repetables.",
        actions: noCommunity
          ? [
              "Choisir UN canal principal et publier 3x/semaine pendant 90 jours sans interruption",
              "Creer un rituel de marque hebdomadaire (live, rubrique, challenge)",
              "Repondre a 100% des commentaires et DMs pendant 30 jours",
            ]
          : [
              "Mettre en place une Devotion Ladder : identifier vos spectateurs, participants, ambassadeurs",
              "Creer un programme de referral pour transformer vos clients satisfaits en apporteurs d'affaires",
              "Lancer un format de contenu UGC pour que vos clients deviennent co-createurs",
            ],
      };
    }
    case "r": {
      const noRiskMgmt = saysNo || totalContent.includes("pas de plan") || totalContent.includes("ignore");
      return {
        pillar: name, key, score,
        diagnostic: noRiskMgmt
          ? "Aucune gestion de risque structuree. Vous naviguez a vue. Un seul evenement negatif pourrait detruire des mois de travail sans plan de contingence."
          : "Vous etes conscient de certains risques mais il manque un cadre structure pour les anticiper et les mitiger.",
        actions: noRiskMgmt
          ? [
              "Realiser une analyse SWOT honnete : 3 forces, 3 faiblesses, 3 opportunites, 3 menaces",
              "Identifier votre 'Sheitan' — l'ennemi existentiel de votre marque (pas un concurrent, une force)",
              "Rediger un protocole de crise en une page : qui fait quoi quand ca deraille",
            ]
          : [
              "Prioriser vos risques avec une matrice probabilite x impact",
              "Mettre en place une veille concurrentielle mensuelle",
              "Preparer 3 scenarios de reponse pour les types de crises les plus probables",
            ],
      };
    }
    case "t": {
      const noKPIs = saysNo || totalContent.includes("pas de kpi") || !hasSubstance;
      return {
        pillar: name, key, score,
        diagnostic: noKPIs
          ? "Aucun systeme de mesure en place. Sans donnees, vous prenez des decisions a l'aveugle et ne pouvez pas prouver votre valeur."
          : "Vous mesurez certaines choses mais il manque un tableau de bord structure avec des KPIs actionables.",
        actions: noKPIs
          ? [
              "Definir 5 KPIs vitaux : 2 d'acquisition, 1 de retention, 1 de revenue, 1 de satisfaction",
              "Mettre en place Google Analytics + un outil de social listening basique",
              "Creer un rapport mensuel de 1 page avec vos metriques cles et tendances",
            ]
          : [
              "Automatiser votre reporting avec un dashboard unifie",
              "Ajouter des metriques de Brand-Market Fit : NPS, brand recall, part de voix",
              "Faire une etude de marche TAM/SAM/SOM pour quantifier votre potentiel",
            ],
      };
    }
    case "i": {
      const noRoadmap = saysNo || totalContent.includes("aucune structure") || totalContent.includes("0 fcfa") || totalContent.includes("0 cfa");
      const noBudget = totalContent.includes("0") || totalContent.includes("aucun") || totalContent.includes("pas de budget");
      return {
        pillar: name, key, score,
        diagnostic: noRoadmap
          ? "Aucune structure d'execution. Vous avez peut-etre des idees mais sans roadmap, equipe, ni budget, rien ne se materialise."
          : noBudget
            ? "Vous avez une idee de votre direction mais pas de ressources allouees. Une strategie sans budget est un souhait, pas un plan."
            : "Votre implementation est en cours mais manque de rigueur operationnelle.",
        actions: noRoadmap
          ? [
              "Creer une roadmap 90 jours avec 3 objectifs maximum et des jalons hebdomadaires",
              "Allouer un budget minimum viable : meme 50K FCFA/mois est un debut si c'est constant",
              "Identifier une personne responsable du marketing, meme a temps partiel",
            ]
          : [
              "Structurer vos campagnes en sprints de 2 semaines avec objectifs mesurables",
              "Mettre en place un calendrier editorial 30 jours a l'avance",
              "Definir un processus de validation clair : qui decide quoi et en combien de temps",
            ],
      };
    }
    case "s": {
      const noStrategy = saysNo || totalContent.includes("freestyle") || !hasSubstance;
      return {
        pillar: name, key, score,
        diagnostic: noStrategy
          ? "Pas de strategie documentee. Vous improvisez. Le 'freestyle' n'est pas une strategie — c'est l'absence de strategie deguisee en agilite."
          : "Vous avez des elements strategiques mais ils ne forment pas un tout coherent. La strategie, c'est le liant entre tous les autres piliers.",
        actions: noStrategy
          ? [
              "Rediger un document strategique d'une page : vision, mission, positionnement, 3 priorites",
              "Creer des guidelines de marque meme basiques : logo usage, couleurs, ton de voix",
              "Planifier une session de reflexion strategique trimestrielle (meme 2h suffit)",
            ]
          : [
              "Auditer la coherence entre vos canaux : le meme message est-il porte partout ?",
              "Creer un score de coherence interne : vos equipes peuvent-elles pitcher la marque de la meme facon ?",
              "Documenter vos apprentissages : qu'est-ce qui a marche, qu'est-ce qui a echoue, pourquoi",
            ],
      };
    }
    default:
      return {
        pillar: name, key, score,
        diagnostic: "Ce pilier necessite un renforcement.",
        actions: ["Approfondir l'analyse avec un diagnostic complet IMPULSION."],
      };
  }
}
