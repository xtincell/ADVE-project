/**
 * Trend Tracker — COLLECTEUR DÉTERMINISTE (PR-K3-ter).
 *
 * Les 49 variables du Trend Tracker (pilier T) sont des agrégats FACTUELS macro/
 * micro (PIB, inflation, pénétration internet, urbanisation, Gini…). Ce ne sont
 * pas des champs « llmables » : un modèle ne doit ni les inventer, ni les laisser
 * vides par défaut. La bonne architecture (cf. demande produit) :
 *
 *     registre de sources prédéfinies → collecteurs déterministes → Seshat formate
 *       ├─ GRATUIT : World Bank Open Data (sans clé) — branché ici
 *       ├─ GRATUIT : autres API publiques (ITU, UN…) — extensible
 *       ├─ PAYANT  : sources prédéfinies (Statista, Nielsen, Bain…) — stubées,
 *       │            à brancher via le Vault Anubis quand les clés existeront
 *       └─ vide HONNÊTE tant qu'aucune source n'est branchée (jamais d'invention)
 *
 * Les codes World Bank ci-dessous ont été VÉRIFIÉS EN DIRECT contre l'API
 * (workflow trendtracker-source-mapping, 2026-06) : ils renvoient une valeur
 * récente non-nulle pour le marché africain prioritaire (CM, NG, CI, ZA, MA).
 */

import { fetchWorldBankBatch } from "./world-bank";
import type { TrendTrackerExtraction } from "@/server/services/seshat/knowledge/schemas";

interface WorldBankSource {
  /** Code indicateur World Bank Open Data. */
  indicator: string;
  /** Transform de la valeur brute WB vers l'unité de la variable Trend Tracker. */
  transform?: (v: number) => number;
  /** Renseigné si l'indicateur WB APPROXIME la variable TT (mentionné dans la source). */
  proxyNote?: string;
}

/**
 * Codes Trend Tracker → indicateurs World Bank, vérifiés contre l'API live.
 * (Doing Business D1/D2/D3 discontinués, WGI VA.EST/PV.EST dépréciés, balance
 * commerciale/dette sans donnée NG récente → exclus, laissés aux sources payantes.)
 */
const WORLD_BANK_SOURCES: Record<string, WorldBankSource> = {
  A2: { indicator: "FP.CPI.TOTL.ZG" }, // Inflation IPC (annual %)
  A3: { indicator: "NY.GDP.MKTP.KD.ZG" }, // Croissance PIB (%)
  A5: { indicator: "PA.NUS.FCRF" }, // Taux de change officiel (LCU/USD)
  A6: { indicator: "FR.INR.LEND", proxyNote: "taux prêteur bancaire (proxy du taux directeur)" },
  A8: { indicator: "BX.KLT.DINV.CD.WD", transform: (v) => v / 1e9 }, // FDI → USD bn
  A9: { indicator: "SP.POP.1564.TO.ZS" }, // Population 15-64 (% du total)
  A10: { indicator: "NY.GDP.PCAP.PP.CD" }, // PIB/hab PPP (USD courant intl)
  A11: { indicator: "SL.UEM.TOTL.ZS" }, // Chômage (% pop active, ILO modelé)
  B1: { indicator: "IT.NET.USER.ZS" }, // Pénétration internet (% pop)
  B2: { indicator: "IT.CEL.SETS.P2", proxyNote: "abonnements mobiles /100 hab (proxy smartphone)" },
  C3: { indicator: "BX.TRF.PWKR.CD.DT", transform: (v) => v / 1e9 }, // Remittances reçues → USD bn
  C5: { indicator: "SE.TER.ENRR" }, // Taux brut scolarisation supérieur (%)
  C6: { indicator: "SP.URB.TOTL.IN.ZS" }, // Population urbaine (%)
  C9: { indicator: "SI.POV.GINI", transform: (v) => v / 100 }, // Gini 0-100 → 0-1
};

/**
 * Variables sans source gratuite branchable aujourd'hui. Documentées pour que le
 * registre couvre les 49 et indique OÙ brancher une source (gratuite manquante,
 * ou payante via le Vault Anubis). NON collectées → restent absentes (jamais
 * inventées). C'est la « partie payante prédéfinie » du registre.
 */
export const NON_FREE_SOURCE_REGISTRY: Record<string, string> = {
  A1: "Confiance consommateur — INSEE/INS-CM/SARB (pas d'API publique)",
  A4: "Sentiment marque + IA — Brandwatch/Meltwater (payant)",
  A7: "Balance commerciale — WTO/Customs (WB sans donnée NG récente)",
  A12: "Dette publique/PIB — FMI (WB sans donnée NG)",
  B3: "Mobile money — GSMA Mobile Money (payant)",
  B4: "E-commerce share — Statista/eMarketer (payant)",
  B5: "AI/GenAI maturity — Stanford AI Index",
  B6: "Cloud adoption — Gartner/IDC (payant)",
  B7: "Coût broadband — ITU price baskets (pas d'API publique ; ≠ abonnements)",
  B8: "Usage social media — DataReportal/GWI (payant)",
  C1: "Valeurs générationnelles — WVS/Ipsos",
  C2: "Attitude CSR/RSE — Edelman Trust Barometer",
  C4: "Religiosité — Pew Research",
  C7: "Langue dominante shift — surveys locaux",
  C8: "Confiance institutionnelle — WGI (source=3, à brancher séparément)",
  C10: "Engagement civique/vote — IDEA",
  D1: "Pression fiscale — Doing Business (discontinué 2021, plus d'API)",
  D2: "Coût création entreprise — Doing Business (discontinué)",
  D3: "Délai licences — Doing Business (discontinué)",
  D4: "Dépôts OAPI/IP — OAPI/WIPO",
  D5: "Cadre data protection — DLA Piper",
  D6: "Risque sanctions — OFAC/EU (WGI proxy faible)",
  D7: "Cycle électoral — DPI/calendrier électoral",
  E1: "Intensité concurrence HHI — calcul interne",
  E2: "Barrières à l'entrée — PESTEL sectoriel",
  E3: "Marges sectorielles — rapports sectoriels (payant)",
  E4: "Croissance sector CAGR — Statista/IBISWorld (payant)",
  E5: "Activité M&A — Mergermarket (payant)",
  E6: "Prix moyen catégorie — Nielsen/Kantar (payant)",
  E7: "Distribution mix — Nielsen/GfK (payant)",
  E8: "NPS sector — Bain (payant)",
  E9: "Churn rate sector — rapports SaaS",
  E10: "CAC benchmark — rapports sectoriels",
  E11: "LTV benchmark — rapports sectoriels",
  E12: "Parts de marché top 3 — Euromonitor/Nielsen (payant)",
};

/** Au-delà de cet âge, une donnée est jugée trop périmée et n'est pas exposée. */
const MAX_AGE_YEARS = 8;

/**
 * Collecte DÉTERMINISTE du Trend Tracker pour un pays (ISO2), depuis les sources
 * gratuites branchées (World Bank). Seshat formate au schéma `trendTracker`.
 * Best-effort : les variables sans donnée fraîche restent absentes (jamais
 * inventées). Ne throw jamais (le digest ne doit pas dépendre du réseau).
 */
export async function collectTrendTracker(iso2: string): Promise<TrendTrackerExtraction> {
  const out: TrendTrackerExtraction = {};
  const codes = Object.keys(WORLD_BANK_SOURCES);

  let batch: Awaited<ReturnType<typeof fetchWorldBankBatch>>;
  try {
    batch = await fetchWorldBankBatch(iso2, codes.map((c) => WORLD_BANK_SOURCES[c]!.indicator));
  } catch {
    return out; // réseau bloqué → trendTracker vide (honnête), pas d'échec du digest
  }

  const currentYear = new Date().getFullYear();
  for (const code of codes) {
    const src = WORLD_BANK_SOURCES[code]!;
    const point = batch[src.indicator];
    if (!point) continue;
    // Filtre de fraîcheur : pas de donnée vieille de plus de MAX_AGE_YEARS ans.
    if (point.year && currentYear - point.year > MAX_AGE_YEARS) continue;
    const value = src.transform ? src.transform(point.value) : point.value;
    out[code] = {
      value,
      ...(point.year ? { year: point.year } : {}),
      source: src.proxyNote
        ? `World Bank (${point.indicator}) — ${src.proxyNote}`
        : `World Bank (${point.indicator})`,
      confidence: src.proxyNote ? 0.7 : 0.95,
    };
  }

  return out;
}

/** Nombre de variables effectivement renseignées (valeur non-nulle). */
export function countTrendTrackerCovered(tt: TrendTrackerExtraction): number {
  return Object.values(tt).filter((e) => e && e.value != null).length;
}
