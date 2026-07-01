/**
 * WAKANDA SEED — Jehuty Feed (Signals + Curations)
 *
 * 50+ Signal records across brands + 10 JehutyCuration for BLISS
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";
import type { WakandaUsers } from "./02-users";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedJehutyFeed(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {
  // ================================================================
  // BLISS — 15 signals (all 6 categories)
  // ================================================================
  const blissSignals = [
    // RECOMMENDATION (3)
    { id: "wk-signal-bliss-01", type: "RECOMMENDATION", pillar: "a", title: "Nouvelle recommandation Authenticite", content: "Enrichissement du hero's journey recommande par Mestor suite a l'analyse vault.", urgency: "NOW", impact: "HIGH", confidence: 0.92, severity: "important", relatedPillars: ["a", "d"], date: T.vaultEnrichment },
    { id: "wk-signal-bliss-02", type: "RECOMMENDATION", pillar: "v", title: "Ajustement pricing coffret", content: "Le prix du coffret decouverte pourrait etre optimise pour la conversion.", urgency: "SOON", impact: "MEDIUM", confidence: 0.77, severity: "moderate", relatedPillars: ["v", "e"], date: daysAfter(T.notoriaStage3, 5) },
    { id: "wk-signal-bliss-03", type: "RECOMMENDATION", pillar: "s", title: "Roadmap Q2 — expansion regionale", content: "La synthese recommande l'ouverture des marches Nairobi et Accra en Q2.", urgency: "SOON", impact: "HIGH", confidence: 0.82, severity: "important", relatedPillars: ["s", "v"], date: T.notoriaStage3 },
    // MARKET_SIGNAL (3)
    { id: "wk-signal-bliss-04", type: "MARKET_SIGNAL", pillar: "d", title: "Tendance clean beauty en hausse", content: "Les recherches 'clean beauty Africa' ont augmente de 145% en Q1 2026.", urgency: "SOON", impact: "HIGH", confidence: 0.88, severity: "important", relatedPillars: ["d", "v"], date: daysAfter(T.now, -15) },
    { id: "wk-signal-bliss-05", type: "MARKET_SIGNAL", pillar: "v", title: "Concurrence prix segment premium", content: "Shea Moisture lance une gamme premium a prix agressif sur le marche wakandais.", urgency: "NOW", impact: "HIGH", confidence: 0.85, severity: "critical", relatedPillars: ["v", "d"], date: daysAfter(T.now, -10) },
    { id: "wk-signal-bliss-06", type: "MARKET_SIGNAL", pillar: "e", title: "TikTok Shop disponible au Wakanda", content: "TikTok Shop est maintenant actif pour les vendeurs wakandais — nouveau canal.", urgency: "SOON", impact: "MEDIUM", confidence: 0.90, severity: "moderate", relatedPillars: ["e", "v"], date: daysAfter(T.now, -7) },
    // WEAK_SIGNAL (2)
    { id: "wk-signal-bliss-07", type: "WEAK_SIGNAL", pillar: "e", title: "Mention marque dans podcast mode", content: "BLISS mentionne dans le podcast 'Wakanda Style' — audience 50K.", urgency: "LATER", impact: "LOW", confidence: 0.65, severity: "low", relatedPillars: ["e"], date: daysAfter(T.now, -3) },
    { id: "wk-signal-bliss-08", type: "WEAK_SIGNAL", pillar: "a", title: "Interet musee pour collab heritage", content: "Le Musee National du Wakanda explore des collaborations marques heritage.", urgency: "LATER", impact: "MEDIUM", confidence: 0.60, severity: "moderate", relatedPillars: ["a", "d"], date: daysAfter(T.now, -5) },
    // SCORE_DRIFT (3)
    { id: "wk-signal-bliss-09", type: "SCORE_DRIFT", pillar: "e", title: "Score Engagement en progression", content: "Le pilier E est passe de 23 a 25/25 — validation complete.", urgency: "LATER", impact: "LOW", confidence: 0.97, severity: "positive", relatedPillars: ["e"], date: T.scoresValidated },
    { id: "wk-signal-bliss-10", type: "SCORE_DRIFT", pillar: "i", title: "Score Implementation stabilise", content: "Le pilier I atteint 25/25 apres generation du catalogue actions.", urgency: "LATER", impact: "LOW", confidence: 0.93, severity: "positive", relatedPillars: ["i", "s"], date: T.notoriaStage2 },
    { id: "wk-signal-bliss-11", type: "SCORE_DRIFT", pillar: "a", title: "Composite ADVERTIS a 200/200", content: "BLISS atteint le score maximal — classification ICONE confirmee.", urgency: "LATER", impact: "LOW", confidence: 0.97, severity: "positive", relatedPillars: ["a", "d", "v", "e", "r", "t", "i", "s"], date: T.scoresValidated },
    // DIAGNOSTIC (2)
    { id: "wk-signal-bliss-12", type: "DIAGNOSTIC", pillar: "r", title: "Audit risques operationnels Q1", content: "Risque principal identifie : dependance fournisseur vibranium unique.", urgency: "SOON", impact: "HIGH", confidence: 0.85, severity: "important", relatedPillars: ["r", "v"], date: T.rtisCascade },
    { id: "wk-signal-bliss-13", type: "DIAGNOSTIC", pillar: "t", title: "Benchmark sectoriel cosmetiques", content: "BLISS se positionne dans le top 3 du marche premium wakandais.", urgency: "LATER", impact: "MEDIUM", confidence: 0.88, severity: "positive", relatedPillars: ["t", "d"], date: T.rtisCascade },
    // EXTERNAL_SIGNAL (2)
    { id: "wk-signal-bliss-14", type: "EXTERNAL_SIGNAL", pillar: "d", title: "Article presse Vogue Africa", content: "BLISS citee dans l'article 'Les 10 marques beaute qui reinventent l'Afrique'.", urgency: "LATER", impact: "MEDIUM", confidence: 0.92, severity: "positive", relatedPillars: ["d", "a"], date: daysAfter(T.heritagePost, 3) },
    { id: "wk-signal-bliss-15", type: "EXTERNAL_SIGNAL", pillar: "e", title: "Partenariat influenceuse confirme", content: "L'influenceuse Amina Diop (350K followers) confirme sa collaboration BLISS.", urgency: "NOW", impact: "HIGH", confidence: 0.90, severity: "important", relatedPillars: ["e", "d"], date: daysAfter(T.now, -2) },
  ];

  for (const s of blissSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.bliss.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: s.content,
          urgency: s.urgency,
          impact: s.impact,
          confidence: s.confidence,
          severity: s.severity,
          relatedPillars: s.relatedPillars,
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // SHURI — 10 signals
  // ================================================================
  const shuriSignals = [
    { id: "wk-signal-shuri-01", type: "RECOMMENDATION", title: "Ajout module IA dans le cursus", pillar: "v", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -12) },
    { id: "wk-signal-shuri-02", type: "MARKET_SIGNAL", title: "Boom edtech en Afrique de l'Ouest", pillar: "d", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -20) },
    { id: "wk-signal-shuri-03", type: "WEAK_SIGNAL", title: "Mention LinkedIn par ministre education", pillar: "a", urgency: "LATER", impact: "MEDIUM", date: daysAfter(T.now, -8) },
    { id: "wk-signal-shuri-04", type: "SCORE_DRIFT", title: "Score V en progression +3 pts", pillar: "v", urgency: "LATER", impact: "LOW", date: daysAfter(T.now, -5) },
    { id: "wk-signal-shuri-05", type: "DIAGNOSTIC", title: "Taux abandon cours trop eleve", pillar: "e", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -15) },
    { id: "wk-signal-shuri-06", type: "MARKET_SIGNAL", title: "Google for Startups Africa grants", pillar: "v", urgency: "SOON", impact: "MEDIUM", date: daysAfter(T.now, -18) },
    { id: "wk-signal-shuri-07", type: "RECOMMENDATION", title: "Optimisation tunnel inscription", pillar: "e", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -10) },
    { id: "wk-signal-shuri-08", type: "EXTERNAL_SIGNAL", title: "Partenariat UNESCO en discussion", pillar: "a", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -6) },
    { id: "wk-signal-shuri-09", type: "WEAK_SIGNAL", title: "Forum Reddit mentionne Shuri Academy", pillar: "d", urgency: "LATER", impact: "LOW", date: daysAfter(T.now, -3) },
    { id: "wk-signal-shuri-10", type: "SCORE_DRIFT", title: "Composite +12 pts ce mois", pillar: "a", urgency: "LATER", impact: "LOW", date: daysAfter(T.now, -1) },
  ];

  for (const s of shuriSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.shuri.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: `Signal ${s.type} pour Shuri Academy — ${s.title}.`,
          urgency: s.urgency,
          impact: s.impact,
          confidence: 0.75,
          severity: s.impact === "HIGH" ? "important" : s.impact === "MEDIUM" ? "moderate" : "low",
          relatedPillars: [s.pillar],
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // VIBRANIUM — 8 signals
  // ================================================================
  const vibSignals = [
    { id: "wk-signal-vib-01", type: "MARKET_SIGNAL", title: "Regulation fintech en revision", pillar: "r", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -14) },
    { id: "wk-signal-vib-02", type: "RECOMMENDATION", title: "Simplifier le KYC mobile", pillar: "e", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -10) },
    { id: "wk-signal-vib-03", type: "WEAK_SIGNAL", title: "Emergence stablecoins locaux", pillar: "v", urgency: "LATER", impact: "MEDIUM", date: daysAfter(T.now, -8) },
    { id: "wk-signal-vib-04", type: "SCORE_DRIFT", title: "Pilier A en baisse -2 pts", pillar: "a", urgency: "SOON", impact: "MEDIUM", date: daysAfter(T.now, -6) },
    { id: "wk-signal-vib-05", type: "DIAGNOSTIC", title: "Audit conformite reglementaire", pillar: "r", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -12) },
    { id: "wk-signal-vib-06", type: "MARKET_SIGNAL", title: "MTN MoMo baisse ses commissions", pillar: "t", urgency: "SOON", impact: "MEDIUM", date: daysAfter(T.now, -5) },
    { id: "wk-signal-vib-07", type: "EXTERNAL_SIGNAL", title: "Article TechCrunch Africa", pillar: "d", urgency: "LATER", impact: "MEDIUM", date: daysAfter(T.now, -3) },
    { id: "wk-signal-vib-08", type: "RECOMMENDATION", title: "Ajouter epargne automatique", pillar: "v", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -7) },
  ];

  for (const s of vibSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.vibranium.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: `Signal ${s.type} pour Vibranium Tech — ${s.title}.`,
          urgency: s.urgency,
          impact: s.impact,
          confidence: 0.72,
          severity: s.impact === "HIGH" ? "important" : "moderate",
          relatedPillars: [s.pillar],
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // BREW — 5 signals
  // ================================================================
  const brewSignals = [
    { id: "wk-signal-brew-01", type: "MARKET_SIGNAL", title: "Hausse prix cafe vert +12%", pillar: "v", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -10) },
    { id: "wk-signal-brew-02", type: "RECOMMENDATION", title: "Diversifier sourcing fournisseurs", pillar: "r", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -8) },
    { id: "wk-signal-brew-03", type: "WEAK_SIGNAL", title: "Tendance cold brew en croissance", pillar: "v", urgency: "LATER", impact: "MEDIUM", date: daysAfter(T.now, -6) },
    { id: "wk-signal-brew-04", type: "DIAGNOSTIC", title: "NPS en baisse sur le delivery", pillar: "e", urgency: "SOON", impact: "MEDIUM", date: daysAfter(T.now, -5) },
    { id: "wk-signal-brew-05", type: "SCORE_DRIFT", title: "Pilier E stagne a 14/25", pillar: "e", urgency: "SOON", impact: "MEDIUM", date: daysAfter(T.now, -3) },
  ];

  for (const s of brewSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.brew.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: `Signal pour Wakanda Brew — ${s.title}.`,
          urgency: s.urgency,
          impact: s.impact,
          confidence: 0.70,
          severity: s.impact === "HIGH" ? "important" : "moderate",
          relatedPillars: [s.pillar],
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // JABARI — 5 signals
  // ================================================================
  const jabariSignals = [
    { id: "wk-signal-jabari-01", type: "MARKET_SIGNAL", title: "Tourisme culturel +25% au Wakanda", pillar: "v", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -20) },
    { id: "wk-signal-jabari-02", type: "RECOMMENDATION", title: "Creer un site e-commerce", pillar: "e", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -15) },
    { id: "wk-signal-jabari-03", type: "WEAK_SIGNAL", title: "Interet galeries internationales", pillar: "d", urgency: "LATER", impact: "MEDIUM", date: daysAfter(T.now, -10) },
    { id: "wk-signal-jabari-04", type: "DIAGNOSTIC", title: "Absence totale de presence digitale", pillar: "e", urgency: "NOW", impact: "HIGH", date: daysAfter(T.now, -12) },
    { id: "wk-signal-jabari-05", type: "EXTERNAL_SIGNAL", title: "Label UNESCO artisanat en vue", pillar: "a", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -8) },
  ];

  for (const s of jabariSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.jabari.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: `Signal pour Jabari Heritage — ${s.title}.`,
          urgency: s.urgency,
          impact: s.impact,
          confidence: 0.68,
          severity: s.impact === "HIGH" ? "important" : "moderate",
          relatedPillars: [s.pillar],
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // PANTHER — 2 signals
  // ================================================================
  const pantherSignals = [
    { id: "wk-signal-panther-01", type: "MARKET_SIGNAL", title: "Boom equipement sportif Afrique", pillar: "v", urgency: "SOON", impact: "HIGH", date: daysAfter(T.now, -18) },
    { id: "wk-signal-panther-02", type: "WEAK_SIGNAL", title: "Wakanda aux JO 2028 — opportunite", pillar: "d", urgency: "LATER", impact: "HIGH", date: daysAfter(T.now, -10) },
  ];

  for (const s of pantherSignals) {
    await prisma.signal.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: brands.panther.strategy.id,
        type: s.type,
        data: {
          pillarKey: s.pillar,
          title: s.title,
          content: `Signal pour Panther Athletics — ${s.title}.`,
          urgency: s.urgency,
          impact: s.impact,
          confidence: 0.72,
          severity: "important",
          relatedPillars: [s.pillar],
        } as Prisma.InputJsonValue,
        createdAt: s.date,
      },
    });
    track("Signal");
  }

  // ================================================================
  // JEHUTY CURATIONS — 10 for BLISS
  // ================================================================
  const curations = [
    // 5 PINNED
    { id: "wk-curation-bliss-01", itemType: "SIGNAL", itemId: "wk-signal-bliss-01", action: "PINNED", note: "Signal cle pour la strategie A — a suivre de pres." },
    { id: "wk-curation-bliss-02", itemType: "SIGNAL", itemId: "wk-signal-bliss-05", action: "PINNED", note: "Menace concurrentielle serieuse — action requise." },
    { id: "wk-curation-bliss-03", itemType: "SIGNAL", itemId: "wk-signal-bliss-12", action: "PINNED", note: "Risque fournisseur a traiter en priorite." },
    { id: "wk-curation-bliss-04", itemType: "RECOMMENDATION", itemId: "wk-reco-bliss-28", action: "PINNED", note: "Simplification onboarding — impact direct sur la retention." },
    { id: "wk-curation-bliss-05", itemType: "SIGNAL", itemId: "wk-signal-bliss-15", action: "PINNED", note: "Collab influenceuse strategique pour Heritage phase 2." },
    // 3 DISMISSED
    { id: "wk-curation-bliss-06", itemType: "SIGNAL", itemId: "wk-signal-bliss-07", action: "DISMISSED", note: "Mention trop faible — pas de suite a donner." },
    { id: "wk-curation-bliss-07", itemType: "SIGNAL", itemId: "wk-signal-bliss-08", action: "DISMISSED", note: "Piste musee — timing pas adapte pour le moment." },
    { id: "wk-curation-bliss-08", itemType: "SIGNAL", itemId: "wk-signal-bliss-09", action: "DISMISSED", note: "Score stabilise — information notee, pas d'action." },
    // 2 NOTORIA_TRIGGERED
    { id: "wk-curation-bliss-09", itemType: "SIGNAL", itemId: "wk-signal-bliss-04", action: "NOTORIA_TRIGGERED", note: "Declenche mise a jour Notoria sur le pilier D." },
    { id: "wk-curation-bliss-10", itemType: "SIGNAL", itemId: "wk-signal-bliss-06", action: "NOTORIA_TRIGGERED", note: "TikTok Shop — Notoria doit evaluer l'impact sur I." },
  ];

  for (const c of curations) {
    await prisma.jehutyCuration.upsert({
      where: { strategyId_itemType_itemId: { strategyId: brands.bliss.strategy.id, itemType: c.itemType, itemId: c.itemId } },
      update: {},
      create: {
        id: c.id,
        strategyId: brands.bliss.strategy.id,
        itemType: c.itemType,
        itemId: c.itemId,
        action: c.action,
        userId: users.amara.id,
        note: c.note,
        createdAt: daysAfter(T.now, -3),
      },
    });
    track("JehutyCuration");
  }

  console.log("[OK] Jehuty Feed: 45 signals + 10 curations across 6 brands");
}
