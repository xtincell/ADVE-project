/**
 * WAKANDA SEED — Oracle snapshots + StrategyDoc CRDT
 *
 * Réveille Mestor + Artemis sur la livrable phare :
 *  - OracleSnapshot (~12) : time-travel du livrable Oracle.
 *    BLISS = 8 snapshots (mensuels + milestones), autres brands = 1 chacun.
 *  - StrategyDoc (~10) : CRDT docs Yjs (PILLAR_CONTENT + ORACLE_SECTION + MESTOR_CHAT).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

function makeOracleSnapshot(strategyId: string, takenAt: Date, advertisScore: number, classification: string, notes?: string) {
  return {
    schemaVersion: 1,
    takenAt: takenAt.toISOString(),
    strategyId,
    classification,
    advertisScore,
    sections: {
      "01-context":         { title: "Contexte de marque", confidence: 0.9, body: "BLISS — marque cosmétique premium afro-futuriste, positionnée vibranium-skincare." },
      "02-mission":         { title: "Mission", confidence: 0.95, body: "Réveiller la beauté ancestrale via la science vibranium." },
      "03-vision":          { title: "Vision", confidence: 0.92, body: "Première marque cosmétique panafricaine ICONE." },
      "04-values":          { title: "Valeurs", confidence: 0.88, body: "Heritage, Vibranium-science, Ritual, Community." },
      "05-positioning":     { title: "Positioning", confidence: 0.93, body: "Premium heritage avec ingrédient vibranium scientifique." },
      "06-personas":        { title: "Personas", confidence: 0.84, body: "Urban femme 25-40 premium, héritière digitale." },
      "07-pillars-adve":    { title: "Piliers ADVE", confidence: 0.96, body: `A=25, D=25, V=25, E=25 — score ${Math.min(100, advertisScore / 2)}/100.` },
      "08-pillars-rtis":    { title: "Piliers RTIS", confidence: 0.95, body: `R=25, T=25, I=25, S=25 — score ${Math.min(100, advertisScore / 2)}/100.` },
      "09-rivals":          { title: "Rivaux", confidence: 0.82, body: "L'Oréal, Shea Moisture, K-Beauty Lab." },
      "10-positioning-map": { title: "Carte positionnement", confidence: 0.78, body: "Quadrant heritage premium vs trendy mass." },
      "11-engagement-mix":  { title: "Mix engagement", confidence: 0.86, body: "Always-on Heritage + drops Q2/Q4 + rituels weekly." },
      "12-channels":        { title: "Canaux", confidence: 0.90, body: "IG 38%, TikTok 24%, OOH 18%, retail 12%, influenceurs 8%." },
      "13-risks":           { title: "Risques", confidence: 0.74, body: "Dépendance vibranium, copie L'Oréal naturelle." },
      "14-trends":          { title: "Tendances", confidence: 0.84, body: "Clean beauty +145%, K-Beauty -22%, app-engagement +210%." },
      "15-implementations": { title: "Implementations", confidence: 0.94, body: "Heritage live, Glow live, App live, Ambassadors live." },
      "16-synthesis":       { title: "Synthèse stratégique", confidence: 0.92, body: notes ?? "BLISS atteint ICONE en 90 jours via la cascade rituel + tech + app." },
      "17-roadmap":         { title: "Roadmap Q2-Q4", confidence: 0.78, body: "Q2 Lagos+Accra, Q3 capsule artist, Q4 boutique flagship Biryongo." },
      "18-budget":          { title: "Budget", confidence: 0.86, body: "Q1 réalisé 95M FCFA, Q2 prévu 145M FCFA." },
      "19-ambassador":      { title: "Programme Ambassadeurs", confidence: 0.88, body: "5 tiers, ladder gamifiée, 142 membres au lancement." },
      "20-superfans-map":   { title: "Cartographie superfans", confidence: 0.82, body: "Cohorte Q1 1247, retention 75%, NPS 72." },
      "21-overton":         { title: "Overton sectoriel", confidence: 0.76, body: "Marché cosmétique premium drift +0.18 vers heritage — BLISS pivot." },
    },
  };
}

export async function seedOracleStrategy(prisma: PrismaClient, brands: Brands) {
  const blissId = brands.bliss.strategy.id;

  // ============================================================
  // ORACLE SNAPSHOTS — BLISS (time-travel)
  // ============================================================
  const blissSnapshots: Array<{ id: string; at: Date; score: number; classification: string; parentIntent?: string; notes?: string }> = [
    { id: "wk-oracle-bliss-w01-boot",      at: T.bootStart,         score: 142, classification: "FORTE",     notes: "Snapshot initial post-boot — ADVE seul rempli, RTIS pending." },
    { id: "wk-oracle-bliss-w02-rtis",      at: T.rtisCascade,       score: 168, classification: "FORTE",     notes: "RTIS cascade exécutée — pillars R/T/I encore partiels." },
    { id: "wk-oracle-bliss-w04-vault",     at: T.vaultEnrichment,   score: 178, classification: "FORTE",     notes: "Vault enrichi via documents heritage uploadés." },
    { id: "wk-oracle-bliss-w08-camp",      at: T.campaignBriefed,   score: 186, classification: "CULTE",     notes: "Brief campaign Heritage approuvé — promotion FORTE→CULTE." },
    { id: "wk-oracle-bliss-w10-live",      at: T.heritageLive,      score: 192, classification: "CULTE",     notes: "Campagne Heritage live — premiers superfans wave 1." },
    { id: "wk-oracle-bliss-w12-glow",      at: T.glowLaunch,        score: 196, classification: "CULTE",     notes: "Vibranium Glow lancé — engagement spike +210%." },
    { id: "wk-oracle-bliss-w13-app",       at: T.appLaunch,         score: 198, classification: "CULTE",     notes: "App live — 850 téléchargements first 24h." },
    { id: "wk-oracle-bliss-final",         at: T.scoresValidated,   score: 200, classification: "ICONE",     notes: "ICONE confirmée — score 200/200, Overton drift +0.18 acquis." },
  ];

  for (const s of blissSnapshots) {
    await prisma.oracleSnapshot.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: blissId,
        takenAt: s.at,
        schemaVersion: 1,
        parentIntentId: s.parentIntent ?? null,
        lang: "fr",
        snapshotJson: makeOracleSnapshot(blissId, s.at, s.score, s.classification, s.notes) as Prisma.InputJsonValue,
      },
    });
    track("OracleSnapshot");
  }

  // Other brands — 1 snapshot each (current state)
  const otherSnapshots: Array<{ id: string; strategyId: string; score: number; classification: string }> = [
    { id: "wk-oracle-vibranium-current", strategyId: brands.vibranium.strategy.id, score: 132, classification: "ORDINAIRE" },
    { id: "wk-oracle-brew-current",      strategyId: brands.brew.strategy.id,      score: 102, classification: "FRAGILE" },
    { id: "wk-oracle-panther-current",   strategyId: brands.panther.strategy.id,   score:  88, classification: "ORDINAIRE" },
    { id: "wk-oracle-shuri-current",     strategyId: brands.shuri.strategy.id,     score: 156, classification: "FORTE" },
    { id: "wk-oracle-jabari-current",    strategyId: brands.jabari.strategy.id,    score:  74, classification: "FRAGILE" },
  ];
  for (const s of otherSnapshots) {
    await prisma.oracleSnapshot.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: s.strategyId,
        takenAt: daysAfter(T.now, -2),
        schemaVersion: 1,
        parentIntentId: null,
        lang: "fr",
        snapshotJson: makeOracleSnapshot(s.strategyId, daysAfter(T.now, -2), s.score, s.classification) as Prisma.InputJsonValue,
      },
    });
    track("OracleSnapshot");
  }

  // ============================================================
  // STRATEGY DOC — Yjs CRDT (PILLAR_CONTENT, ORACLE_SECTION, MESTOR_CHAT)
  // ============================================================
  // Yjs state encoded as Bytes — we use a small fake binary buffer with the
  // strategy/doc identifier so it's deterministic and unique per row.
  function fakeYState(strategyId: string, kind: string, key: string): Buffer {
    const tag = `wkydoc:${strategyId}:${kind}:${key}:v1`;
    return Buffer.from(tag, "utf-8");
  }

  const docs: Array<{ id: string; strategyId: string; docKind: string; docKey: string; version: number; lastEditor: string }> = [
    // BLISS — pillars CRDT
    { id: "wk-doc-bliss-pillar-a", strategyId: blissId, docKind: "PILLAR_CONTENT", docKey: "a", version: 4, lastEditor: IDS.userAmara },
    { id: "wk-doc-bliss-pillar-d", strategyId: blissId, docKind: "PILLAR_CONTENT", docKey: "d", version: 3, lastEditor: IDS.userNakia },
    { id: "wk-doc-bliss-pillar-v", strategyId: blissId, docKind: "PILLAR_CONTENT", docKey: "v", version: 5, lastEditor: IDS.userOkoye },
    { id: "wk-doc-bliss-pillar-e", strategyId: blissId, docKind: "PILLAR_CONTENT", docKey: "e", version: 3, lastEditor: IDS.userAmara },
    { id: "wk-doc-bliss-pillar-s", strategyId: blissId, docKind: "PILLAR_CONTENT", docKey: "s", version: 6, lastEditor: IDS.userAmara },
    // BLISS — Oracle sections most-edited
    { id: "wk-doc-bliss-oracle-16", strategyId: blissId, docKind: "ORACLE_SECTION", docKey: "16-synthesis", version: 4, lastEditor: IDS.userAmara },
    { id: "wk-doc-bliss-oracle-17", strategyId: blissId, docKind: "ORACLE_SECTION", docKey: "17-roadmap",  version: 3, lastEditor: IDS.userNakia },
    { id: "wk-doc-bliss-oracle-21", strategyId: blissId, docKind: "ORACLE_SECTION", docKey: "21-overton",  version: 2, lastEditor: IDS.userAmara },
    // BLISS — Mestor chat threads
    { id: "wk-doc-bliss-chat-strategy",  strategyId: blissId, docKind: "MESTOR_CHAT",   docKey: "strategy-q1-review",  version: 8, lastEditor: IDS.userAmara },
    { id: "wk-doc-bliss-chat-glow",      strategyId: blissId, docKind: "MESTOR_CHAT",   docKey: "glow-launch-prep",    version: 5, lastEditor: IDS.userOkoye },
  ];
  for (const d of docs) {
    await prisma.strategyDoc.upsert({
      where: { strategyId_docKind_docKey: { strategyId: d.strategyId, docKind: d.docKind, docKey: d.docKey } },
      update: {},
      create: {
        id: d.id,
        strategyId: d.strategyId,
        docKind: d.docKind,
        docKey: d.docKey,
        yState: fakeYState(d.strategyId, d.docKind, d.docKey),
        version: d.version,
        lastEditor: d.lastEditor,
        createdAt: daysAfter(T.now, -45),
      },
    });
    track("StrategyDoc");
  }

  console.log(
    `  [OK] Oracle/Strategy: ${blissSnapshots.length} BLISS oracle snapshots + ${otherSnapshots.length} other oracle snapshots, ${docs.length} CRDT docs`,
  );
}
