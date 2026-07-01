/**
 * WAKANDA SEED — Batch 6c: Argos reference dossiers (ADR-0100).
 *
 * Irrigue « argos dossiers de référence » : `CampaignReferenceDossier` signés par
 * Hunter (sub-agent Seshat). La projection publique `/argos` auto-publie sur
 * `safetyVerdict === 'PASS'`. On sème un mix réaliste : PASS publiés, QUARANTINE
 * en attente de revue (mock honnête), REJECT. DNA = données structurées figées.
 *
 * Déterministe. Hunter LLM réel = run port (ADR-0100) ; ici données démo.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedArgosDossiers(prisma: PrismaClient) {
  const dossiers: Array<{
    id: string;
    ref: string;
    brand: string;
    brandUid: string;
    campaign?: string;
    campaignUid?: string;
    sector: string;
    market: string;
    verdict: "PASS" | "QUARANTINE" | "REJECT";
    published: boolean;
    origin: string;
    dna: Prisma.InputJsonValue;
    reasons?: string[];
  }> = [
    {
      id: "wk-argos-fenty",
      ref: "fenty-beauty--africa-launch",
      brand: "Fenty Beauty",
      brandUid: "fenty-beauty",
      campaign: "Africa Launch",
      campaignUid: "fenty-beauty--africa-launch",
      sector: "Cosmetiques & Skincare",
      market: "Afrique de l'Ouest",
      verdict: "PASS",
      published: true,
      origin: "HUNTER",
      dna: {
        palette: ["#1A1A1A", "#E8B86D", "#FFFFFF"],
        typography: ["bold sans-serif", "elegant serif"],
        voice: "inclusif, confiant, premium accessible",
        visualCodes: ["diversité des teints", "packaging mat", "gros plans peau"],
        keyPhrases: ["Beauty for All", "shade range"],
        axes: ["inclusivité", "premium accessible"],
      } as Prisma.InputJsonValue,
    },
    {
      id: "wk-argos-mtn",
      ref: "mtn--mobile-money",
      brand: "MTN",
      brandUid: "mtn",
      campaign: "MoMo Everywhere",
      campaignUid: "mtn--mobile-money",
      sector: "Fintech / Mobile Money",
      market: "Afrique Centrale",
      verdict: "PASS",
      published: true,
      origin: "HUNTER",
      dna: {
        palette: ["#FFCB05", "#003B70"],
        typography: ["rounded sans"],
        voice: "proche, pratique, populaire",
        visualCodes: ["jaune dominant", "scènes de marché", "téléphone en main"],
        keyPhrases: ["Everywhere you go", "Y'ello"],
        axes: ["ubiquité", "accessibilité"],
      } as Prisma.InputJsonValue,
    },
    {
      id: "wk-argos-castel",
      ref: "castel--brasserie",
      brand: "Castel",
      brandUid: "castel",
      sector: "Brasserie Artisanale",
      market: "Cameroun",
      verdict: "QUARANTINE",
      published: false,
      origin: "HUNTER",
      reasons: ["alcool — vérifier conformité réglementaire avant publication", "sources à recouper"],
      dna: {
        palette: ["#C8102E", "#FFD200"],
        voice: "festif, viril, convivial",
        visualCodes: ["célébration", "groupe d'amis"],
        keyPhrases: ["La bière de chez nous"],
        axes: ["convivialité", "fierté locale"],
      } as Prisma.InputJsonValue,
    },
    {
      id: "wk-argos-rejected",
      ref: "unknown-source--scraped",
      brand: "Source non vérifiée",
      brandUid: "unknown-source",
      sector: "Inconnu",
      market: "Inconnu",
      verdict: "REJECT",
      published: false,
      origin: "HUNTER",
      reasons: ["source non fiable", "contenu potentiellement protégé"],
      dna: { _mocked: true } as Prisma.InputJsonValue,
    },
  ];

  for (const d of dossiers) {
    await prisma.campaignReferenceDossier.upsert({
      where: { ref: d.ref },
      update: {},
      create: {
        id: d.id,
        ref: d.ref,
        brand: d.brand,
        brandUid: d.brandUid,
        campaign: d.campaign ?? null,
        campaignUid: d.campaignUid ?? null,
        sector: d.sector,
        market: d.market,
        dna: d.dna,
        editorial: { sections: [{ title: "Analyse", body: `Décryptage de la campagne ${d.brand}.` }] } as Prisma.InputJsonValue,
        sources: [{ title: `${d.brand} — site officiel`, url: `https://example.wk/${d.brandUid}` }] as Prisma.InputJsonValue,
        safetyVerdict: d.verdict,
        safetyReasons: (d.reasons ?? []) as Prisma.InputJsonValue,
        published: d.published,
        publishedAt: d.published ? daysAfter(T.now, -7) : null,
        reviewedBy: d.verdict !== "QUARANTINE" ? "nefer-operator" : null,
        origin: d.origin,
        createdAt: daysAfter(T.now, -14),
      },
    });
    track("CampaignReferenceDossier");
  }

  console.log(`[OK] Argos: ${dossiers.length} reference dossiers (${dossiers.filter((d) => d.published).length} publiés)`);
}
