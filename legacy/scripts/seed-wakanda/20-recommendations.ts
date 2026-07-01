/**
 * WAKANDA SEED — Cross-brand Recommendations + Batches
 *
 * BLISS: 30 APPLIED, 5 batches
 * VIBRANIUM: 15 PENDING, 1 batch
 * WAKANDA BREW: 8 mixed
 * JABARI: 5 REVERTED
 * SHURI: 10 (8 APPLIED + 2 PENDING)
 * Total: ~73 Recommendation + ~8 RecommendationBatch
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedRecommendations(prisma: PrismaClient, brands: Brands) {
  // ================================================================
  // BLISS — 5 RecommendationBatch
  // ================================================================
  const blissBatches = [
    { id: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", sourcePillars: ["VAULT"], targetPillars: ["A", "D"], totalRecos: 8, appliedCount: 8, agent: "MESTOR", pipelineStage: 0, createdAt: T.vaultEnrichment },
    { id: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", sourcePillars: ["R", "T"], targetPillars: ["A", "D", "V", "E"], totalRecos: 12, appliedCount: 12, agent: "MESTOR", pipelineStage: 1, createdAt: T.notoriaStage1 },
    { id: "wk-batch-bliss-i-gen", missionType: "I_GENERATION", sourcePillars: ["A", "D", "V", "E", "R", "T"], targetPillars: ["I"], totalRecos: 5, appliedCount: 5, agent: "MESTOR", pipelineStage: 2, createdAt: T.notoriaStage2 },
    { id: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", sourcePillars: ["A", "D", "V", "E", "R", "T", "I"], targetPillars: ["S"], totalRecos: 5, appliedCount: 5, agent: "MESTOR", pipelineStage: 3, createdAt: T.notoriaStage3 },
    { id: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", sourcePillars: ["SESHAT"], targetPillars: ["A", "V", "E"], totalRecos: 5, appliedCount: 5, agent: "ARTEMIS", pipelineStage: null, createdAt: daysAfter(T.notoriaStage3, 5) },
  ];

  for (const b of blissBatches) {
    await prisma.recommendationBatch.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        strategyId: brands.bliss.strategy.id,
        missionType: b.missionType,
        sourcePillars: b.sourcePillars as Prisma.InputJsonValue,
        targetPillars: b.targetPillars as Prisma.InputJsonValue,
        totalRecos: b.totalRecos,
        pendingCount: 0,
        acceptedCount: 0,
        appliedCount: b.appliedCount,
        agent: b.agent,
        pipelineStage: b.pipelineStage,
        createdAt: b.createdAt,
      },
    });
    track("RecommendationBatch");
  }

  // ── BLISS 30 Recommendations (all APPLIED) ───────────────────────
  const blissRecos: Array<{
    id: string; pillar: string; field: string; op: string; proposed: string;
    confidence: number; impact: string; urgency: string; explain: string;
    batchId: string; missionType: string; createdAt: Date;
  }> = [
    // Vault enrichment batch (8)
    { id: "wk-reco-bliss-01", pillar: "a", field: "noyauNarratif.herosJourney", op: "SET", proposed: "Parcours initiatique de la femme wakandaise moderne", confidence: 0.92, impact: "HIGH", urgency: "NOW", explain: "Le hero's journey manquait de connexion emotionnelle avec la cible primaire.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: T.vaultEnrichment },
    { id: "wk-reco-bliss-02", pillar: "a", field: "noyauNarratif.mythologie", op: "ADD", proposed: "Legendes de la Reine Bashenga et des herbes sacrees", confidence: 0.88, impact: "HIGH", urgency: "NOW", explain: "Ajout du recit fondateur pour ancrer la marque dans la culture wakandaise.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: T.vaultEnrichment },
    { id: "wk-reco-bliss-03", pillar: "a", field: "valeursExistentielles", op: "MODIFY", proposed: "Beaute revelee, heritage vivant, excellence naturelle", confidence: 0.90, impact: "MEDIUM", urgency: "SOON", explain: "Reformulation pour plus de coherence avec le positionnement premium.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 1) },
    { id: "wk-reco-bliss-04", pillar: "a", field: "archetype", op: "SET", proposed: "Le Sage-Createur: gardienne du savoir ancestral", confidence: 0.85, impact: "HIGH", urgency: "NOW", explain: "Archetype determine depuis les patterns du vault.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 1) },
    { id: "wk-reco-bliss-05", pillar: "d", field: "persona.primaire.nom", op: "SET", proposed: "Aissatou, 28 ans, cadre a Biryongo", confidence: 0.91, impact: "HIGH", urgency: "NOW", explain: "Persona primaire enrichie depuis les donnees CRM du vault.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 2) },
    { id: "wk-reco-bliss-06", pillar: "d", field: "persona.secondaire", op: "ADD", proposed: "Awa, 35 ans, entrepreneure a Wakanda City", confidence: 0.87, impact: "MEDIUM", urgency: "SOON", explain: "Segment secondaire identifie dans les sources de donnees.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 2) },
    { id: "wk-reco-bliss-07", pillar: "d", field: "toneOfVoice.registre", op: "SET", proposed: "Soutenu, poetique, chaleureux — jamais clinique", confidence: 0.89, impact: "MEDIUM", urgency: "SOON", explain: "Registre de voix aligne sur l'univers luxueux-mystique.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 3) },
    { id: "wk-reco-bliss-08", pillar: "d", field: "concurrents", op: "ADD", proposed: "L'Oreal Afrique, Shea Moisture, K-Beauty Wakanda", confidence: 0.84, impact: "MEDIUM", urgency: "LATER", explain: "Cartographie concurrentielle ajoutee pour structurer le positionnement.", batchId: "wk-batch-bliss-vault", missionType: "ADVE_INTAKE", createdAt: hoursAfter(T.vaultEnrichment, 3) },
    // Notoria ADVE_UPDATE batch (12)
    { id: "wk-reco-bliss-09", pillar: "a", field: "promesseFondamentale", op: "MODIFY", proposed: "Reveler la beaute ancestrale, pas la fabriquer", confidence: 0.93, impact: "HIGH", urgency: "NOW", explain: "Promesse recalibree apres analyse R+T : plus differenciante.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: T.notoriaStage1 },
    { id: "wk-reco-bliss-10", pillar: "a", field: "rituels.initiation", op: "ADD", proposed: "Ceremonie du premier eclat — coffret decouverte", confidence: 0.88, impact: "HIGH", urgency: "NOW", explain: "Rituel d'initiation lie au produit d'entree.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: T.notoriaStage1 },
    { id: "wk-reco-bliss-11", pillar: "a", field: "symbolique.couleurs", op: "SET", proposed: "Violet profond (sagesse) + Or (vibranium) + Noir (excellence)", confidence: 0.86, impact: "MEDIUM", urgency: "SOON", explain: "Palette symbolique consolidee a partir de la charte graphique.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 1) },
    { id: "wk-reco-bliss-12", pillar: "d", field: "positionnement.axesDifferenciation", op: "MODIFY", proposed: "Vibranium = ingredient secret, heritage = legitimite, tech = precision", confidence: 0.91, impact: "HIGH", urgency: "NOW", explain: "Les axes de differenciation enrichis par l'analyse concurrentielle de T.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 1) },
    { id: "wk-reco-bliss-13", pillar: "d", field: "langageInterdit", op: "ADD", proposed: "chimique, artificiel, anti-age, synthetique", confidence: 0.82, impact: "MEDIUM", urgency: "SOON", explain: "Mots interdits definis pour proteger le territoire linguistique.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 2) },
    { id: "wk-reco-bliss-14", pillar: "d", field: "assetsLinguistiques.tagline", op: "SET", proposed: "Revelee. Pas inventee.", confidence: 0.94, impact: "HIGH", urgency: "NOW", explain: "Tagline cristallisee — teste aupres du panel interne.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 2) },
    { id: "wk-reco-bliss-15", pillar: "v", field: "catalogueProduits.hero", op: "MODIFY", proposed: "Serum Vibranium Glow a 15,000 XAF — hero product", confidence: 0.90, impact: "HIGH", urgency: "NOW", explain: "Hero product repositionne avec le pricing valide par l'analyse marche.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 3) },
    { id: "wk-reco-bliss-16", pillar: "v", field: "unitEconomics.margeNette", op: "SET", proposed: "68% marge nette sur gamme premium", confidence: 0.87, impact: "HIGH", urgency: "NOW", explain: "Unit economics valides : marge superieure au benchmark sectoriel.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 3) },
    { id: "wk-reco-bliss-17", pillar: "v", field: "modeleAbonnement", op: "ADD", proposed: "BLISS App Premium a 2,500 XAF/mois — routines personnalisees", confidence: 0.85, impact: "MEDIUM", urgency: "SOON", explain: "Revenue recurrent via l'app identifie comme levier de croissance.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 4) },
    { id: "wk-reco-bliss-18", pillar: "e", field: "funnelAARRR.acquisition", op: "SET", proposed: "Instagram + TikTok + OOH Biryongo — 3 canaux primaires", confidence: 0.89, impact: "HIGH", urgency: "NOW", explain: "Canaux d'acquisition definis selon l'affinite persona.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 4) },
    { id: "wk-reco-bliss-19", pillar: "e", field: "touchpoints.decouverte", op: "ADD", proposed: "Pop-up sensoriel en centre commercial premium", confidence: 0.83, impact: "MEDIUM", urgency: "SOON", explain: "Touchpoint physique pour creer l'experience de marque.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 5) },
    { id: "wk-reco-bliss-20", pillar: "e", field: "rituelsEngagement", op: "SET", proposed: "Glow Check hebdo dans l'app + partage communautaire", confidence: 0.86, impact: "MEDIUM", urgency: "SOON", explain: "Mecanique d'engagement recurrente pour la retention.", batchId: "wk-batch-bliss-adve-update", missionType: "ADVE_UPDATE", createdAt: hoursAfter(T.notoriaStage1, 5) },
    // S_SYNTHESIS batch (5)
    { id: "wk-reco-bliss-21", pillar: "s", field: "roadmap.Q2", op: "SET", proposed: "Lancement international Nairobi + Accra", confidence: 0.82, impact: "HIGH", urgency: "SOON", explain: "Roadmap Q2 priorisee par la synthese strategique.", batchId: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", createdAt: T.notoriaStage3 },
    { id: "wk-reco-bliss-22", pillar: "s", field: "roadmap.Q3", op: "SET", proposed: "Collection Heritage x Artisan local", confidence: 0.80, impact: "MEDIUM", urgency: "LATER", explain: "Collab strategique planifiee pour Q3.", batchId: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", createdAt: hoursAfter(T.notoriaStage3, 1) },
    { id: "wk-reco-bliss-23", pillar: "s", field: "kpisCles.nps", op: "SET", proposed: "NPS cible : 75 a fin Q2", confidence: 0.78, impact: "MEDIUM", urgency: "SOON", explain: "KPI NPS calibre sur le benchmark premium.", batchId: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", createdAt: hoursAfter(T.notoriaStage3, 1) },
    { id: "wk-reco-bliss-24", pillar: "s", field: "risquesPrincipaux", op: "ADD", proposed: "Dependance au canal Instagram — diversifier vers TikTok Shop", confidence: 0.85, impact: "HIGH", urgency: "NOW", explain: "Risque de concentration identifie en synthese.", batchId: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", createdAt: hoursAfter(T.notoriaStage3, 2) },
    { id: "wk-reco-bliss-25", pillar: "s", field: "investissement.media", op: "SET", proposed: "Budget media Q2 : 4,500,000 XAF (60% digital, 40% OOH)", confidence: 0.81, impact: "HIGH", urgency: "SOON", explain: "Allocation media recommandee par la synthese.", batchId: "wk-batch-bliss-s-synth", missionType: "S_SYNTHESIS", createdAt: hoursAfter(T.notoriaStage3, 2) },
    // Seshat/Strategic (5)
    { id: "wk-reco-bliss-26", pillar: "a", field: "noyauNarratif.temoignages", op: "ADD", proposed: "Integrer les retours superfans dans le storytelling", confidence: 0.79, impact: "MEDIUM", urgency: "LATER", explain: "Observation Seshat : les temoignages authentiques renforcent la credibilite.", batchId: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", createdAt: daysAfter(T.notoriaStage3, 5) },
    { id: "wk-reco-bliss-27", pillar: "v", field: "pricing.coffret", op: "MODIFY", proposed: "Coffret Decouverte a 12,000 XAF (contre 15,000)", confidence: 0.77, impact: "MEDIUM", urgency: "SOON", explain: "Ajustement prix d'entree pour maximiser la conversion.", batchId: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", createdAt: daysAfter(T.notoriaStage3, 5) },
    { id: "wk-reco-bliss-28", pillar: "e", field: "experienceApp.onboarding", op: "MODIFY", proposed: "Onboarding en 3 etapes avec scan de peau", confidence: 0.82, impact: "HIGH", urgency: "NOW", explain: "L'onboarding actuel est trop long — simplifier.", batchId: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", createdAt: daysAfter(T.notoriaStage3, 6) },
    { id: "wk-reco-bliss-29", pillar: "e", field: "canaux.tiktokShop", op: "ADD", proposed: "Ouvrir TikTok Shop pour le marche 18-25 ans", confidence: 0.75, impact: "MEDIUM", urgency: "LATER", explain: "Canal emergent pour capter la Gen Z.", batchId: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", createdAt: daysAfter(T.notoriaStage3, 6) },
    { id: "wk-reco-bliss-30", pillar: "a", field: "communaute.rituel", op: "ADD", proposed: "Ceremonie mensuelle Glow Circle — evenement communautaire", confidence: 0.80, impact: "MEDIUM", urgency: "SOON", explain: "Rituel communautaire pour renforcer le culte de marque.", batchId: "wk-batch-bliss-seshat", missionType: "SESHAT_OBSERVATION", createdAt: daysAfter(T.notoriaStage3, 7) },
  ];

  for (const r of blissRecos) {
    await prisma.recommendation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        strategyId: brands.bliss.strategy.id,
        targetPillarKey: r.pillar,
        targetField: r.field,
        operation: r.op,
        proposedValue: r.proposed as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: r.batchId.includes("vault") ? "VAULT" : r.batchId.includes("seshat") ? "SESHAT" : "R+T",
        confidence: r.confidence,
        explain: r.explain,
        urgency: r.urgency,
        impact: r.impact,
        status: "APPLIED",
        reviewedBy: IDS.userAmara,
        reviewedAt: hoursAfter(r.createdAt, 4),
        appliedAt: hoursAfter(r.createdAt, 5),
        batchId: r.batchId,
        missionType: r.missionType,
        publishedAt: r.createdAt,
        createdAt: r.createdAt,
      },
    });
    track("Recommendation");
  }

  // ================================================================
  // VIBRANIUM — 1 batch + 15 PENDING recommendations
  // ================================================================
  await prisma.recommendationBatch.upsert({
    where: { id: "wk-batch-vibranium-igen" },
    update: {},
    create: {
      id: "wk-batch-vibranium-igen",
      strategyId: brands.vibranium.strategy.id,
      missionType: "I_GENERATION",
      sourcePillars: ["A", "D", "V", "E", "R", "T"] as Prisma.InputJsonValue,
      targetPillars: ["I"] as Prisma.InputJsonValue,
      totalRecos: 15,
      pendingCount: 15,
      agent: "MESTOR",
      pipelineStage: 2,
      createdAt: daysAfter(T.now, -5),
    },
  });
  track("RecommendationBatch");

  const vibPillars = ["a", "a", "d", "d", "d", "v", "v", "v", "e", "e", "e", "i", "i", "i", "i"];
  const vibFields = [
    "noyauNarratif.mission", "valeursExistentielles", "persona.primaire", "positionnement.prix",
    "toneOfVoice.digital", "catalogueProduits.epargne", "unitEconomics.CAC", "modeleCommission",
    "funnelAARRR.activation", "touchpoints.app", "kpisEngagement", "actions.campagne1",
    "actions.campagne2", "actions.formation", "calendrier.Q2",
  ];
  for (let i = 0; i < 15; i++) {
    await prisma.recommendation.upsert({
      where: { id: `wk-reco-vibranium-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `wk-reco-vibranium-${String(i + 1).padStart(2, "0")}`,
        strategyId: brands.vibranium.strategy.id,
        targetPillarKey: vibPillars[i],
        targetField: vibFields[i],
        operation: i % 3 === 0 ? "SET" : i % 3 === 1 ? "ADD" : "MODIFY",
        proposedValue: `Proposition Vibranium #${i + 1}` as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: "R+T",
        confidence: 0.6 + (i * 0.017),
        explain: `Recommandation en attente de revue pour Vibranium Tech — champ ${vibFields[i]}.`,
        urgency: i < 5 ? "NOW" : i < 10 ? "SOON" : "LATER",
        impact: i < 5 ? "HIGH" : "MEDIUM",
        status: "PENDING",
        batchId: "wk-batch-vibranium-igen",
        missionType: "I_GENERATION",
        publishedAt: daysAfter(T.now, -5),
        createdAt: daysAfter(T.now, -5),
      },
    });
    track("Recommendation");
  }

  // ================================================================
  // WAKANDA BREW — 8 recommendations (5 PENDING, 2 ACCEPTED, 1 REJECTED)
  // ================================================================
  await prisma.recommendationBatch.upsert({
    where: { id: "wk-batch-brew-vault" },
    update: {},
    create: {
      id: "wk-batch-brew-vault",
      strategyId: brands.brew.strategy.id,
      missionType: "ADVE_INTAKE",
      sourcePillars: ["VAULT"] as Prisma.InputJsonValue,
      targetPillars: ["A", "D", "V"] as Prisma.InputJsonValue,
      totalRecos: 8,
      pendingCount: 5,
      acceptedCount: 2,
      rejectedCount: 1,
      agent: "MESTOR",
      pipelineStage: 0,
      createdAt: daysAfter(T.now, -10),
    },
  });
  track("RecommendationBatch");

  const brewStatuses = ["PENDING", "PENDING", "PENDING", "PENDING", "PENDING", "ACCEPTED", "ACCEPTED", "REJECTED"];
  const brewPillars = ["a", "a", "d", "d", "v", "a", "v", "d"];
  const brewFields = [
    "noyauNarratif.origine", "valeursExistentielles", "persona.primaire", "toneOfVoice.registre",
    "catalogueProduits.cafe", "rituels.torrefaction", "pricing.gamme", "positionnement.axe",
  ];
  for (let i = 0; i < 8; i++) {
    await prisma.recommendation.upsert({
      where: { id: `wk-reco-brew-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `wk-reco-brew-${String(i + 1).padStart(2, "0")}`,
        strategyId: brands.brew.strategy.id,
        targetPillarKey: brewPillars[i],
        targetField: brewFields[i],
        operation: "SET",
        proposedValue: `Proposition Brew #${i + 1}` as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: "VAULT",
        confidence: 0.72 + (i * 0.02),
        explain: `Enrichissement vault pour Wakanda Brew — ${brewFields[i]}.`,
        urgency: i < 3 ? "NOW" : "SOON",
        impact: i < 4 ? "HIGH" : "MEDIUM",
        status: brewStatuses[i],
        reviewedBy: brewStatuses[i] !== "PENDING" ? IDS.userRamonda : undefined,
        reviewedAt: brewStatuses[i] !== "PENDING" ? daysAfter(T.now, -8) : undefined,
        batchId: "wk-batch-brew-vault",
        missionType: "ADVE_INTAKE",
        createdAt: daysAfter(T.now, -10),
      },
    });
    track("Recommendation");
  }

  // ================================================================
  // JABARI — 5 REVERTED recommendations
  // ================================================================
  for (let i = 0; i < 5; i++) {
    await prisma.recommendation.upsert({
      where: { id: `wk-reco-jabari-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `wk-reco-jabari-${String(i + 1).padStart(2, "0")}`,
        strategyId: brands.jabari.strategy.id,
        targetPillarKey: ["a", "d", "v", "e", "a"][i],
        targetField: ["noyauNarratif", "persona.primaire", "pricing", "touchpoints", "symbolique"][i],
        operation: "MODIFY",
        proposedValue: `Modification Jabari #${i + 1}` as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: "R+T",
        confidence: 0.72 + (i * 0.03),
        explain: `Recommandation Jabari Heritage revertee — ${["noyauNarratif", "persona", "pricing", "touchpoints", "symbolique"][i]}.`,
        urgency: "SOON",
        impact: "MEDIUM",
        status: "REVERTED",
        reviewedBy: IDS.userMbaku,
        reviewedAt: daysAfter(T.now, -15),
        appliedAt: daysAfter(T.now, -14),
        revertedAt: daysAfter(T.now, -12),
        revertReason: ["Ne correspond pas a la vision artisanale", "Persona trop urbain pour notre cible rurale", "Pricing non adapte au marche local", "Touchpoints digitaux inappropries pour notre clientele", "Symbolique trop moderne, manque de tradition"][i],
        missionType: "ADVE_UPDATE",
        createdAt: daysAfter(T.now, -16),
      },
    });
    track("Recommendation");
  }

  // ================================================================
  // SHURI — 10 recommendations (8 APPLIED, 2 PENDING)
  // ================================================================
  await prisma.recommendationBatch.upsert({
    where: { id: "wk-batch-shuri-adve" },
    update: {},
    create: {
      id: "wk-batch-shuri-adve",
      strategyId: brands.shuri.strategy.id,
      missionType: "ADVE_UPDATE",
      sourcePillars: ["R", "T"] as Prisma.InputJsonValue,
      targetPillars: ["A", "D", "V", "E"] as Prisma.InputJsonValue,
      totalRecos: 10,
      pendingCount: 2,
      appliedCount: 8,
      agent: "MESTOR",
      pipelineStage: 1,
      createdAt: daysAfter(T.now, -20),
    },
  });
  track("RecommendationBatch");

  const shuriPillars = ["a", "a", "d", "d", "v", "v", "e", "e", "a", "v"];
  const shuriFields = [
    "mission.education", "valeurs.accessibilite", "persona.etudiant", "toneOfVoice.pedagogique",
    "catalogueCours.gratuit", "pricing.premium", "funnelAARRR.retention", "parcours.certification",
    "communaute.alumni", "partenariats.entreprises",
  ];
  for (let i = 0; i < 10; i++) {
    const isApplied = i < 8;
    await prisma.recommendation.upsert({
      where: { id: `wk-reco-shuri-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `wk-reco-shuri-${String(i + 1).padStart(2, "0")}`,
        strategyId: brands.shuri.strategy.id,
        targetPillarKey: shuriPillars[i],
        targetField: shuriFields[i],
        operation: i % 2 === 0 ? "SET" : "MODIFY",
        proposedValue: `Proposition Shuri Academy #${i + 1}` as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: "R+T",
        confidence: 0.78 + (i * 0.02),
        explain: `Optimisation pour Shuri Academy — ${shuriFields[i]}.`,
        urgency: i < 4 ? "NOW" : "SOON",
        impact: i < 5 ? "HIGH" : "MEDIUM",
        status: isApplied ? "APPLIED" : "PENDING",
        reviewedBy: isApplied ? IDS.userShuri : undefined,
        reviewedAt: isApplied ? daysAfter(T.now, -18) : undefined,
        appliedAt: isApplied ? daysAfter(T.now, -17) : undefined,
        batchId: "wk-batch-shuri-adve",
        missionType: "ADVE_UPDATE",
        createdAt: daysAfter(T.now, -20),
      },
    });
    track("Recommendation");
  }

  console.log("[OK] Recommendations: 73 recos + 8 batches across 5 brands");
}
