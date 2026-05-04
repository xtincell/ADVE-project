/**
 * Trend Tracker — 49 variables canon (ADR-0037 §13).
 *
 * Source : `Workflow ADVE GEN.docx` étape 2 — benchmark express sur 49
 * variables macro/micro tendances. Ces variables sont l'INPUT canonique
 * du pilier T (Track). Quand un opérateur ingère une étude de marché
 * (PR-I), l'extracteur LLM cherche systématiquement ces 49 codes dans
 * le PDF/DOCX/XLSX et les persiste sous `KnowledgeEntry.data.trendTracker`.
 *
 * Catégorisation :
 *   - MACRO_ECO  (12) : confiance conso, inflation, change, PIB, etc.
 *   - MACRO_TECH (8)  : penetration internet/smartphone/mobile-money etc.
 *   - SOCIO_CULT (10) : sentiment marque, valeurs gen, urbanization, etc.
 *   - REGUL_INST (7)  : taxation, licences, OAPI, GDPR-equiv, etc.
 *   - MICRO_SECTOR (12) : concurrence, marges, M&A, NPS sector, etc.
 *
 * Versionné : `TREND_TRACKER_VERSION` est tagué pour traçabilité.
 */

export type TrendTrackerCategory =
  | "MACRO_ECO"
  | "MACRO_TECH"
  | "SOCIO_CULT"
  | "REGUL_INST"
  | "MICRO_SECTOR";

export interface TrendTrackerVariable {
  /** Canonical code from Workflow ADVE GEN (e.g. "A1", "B3", "C7"). */
  code: string;
  category: TrendTrackerCategory;
  label: string;
  /** Unit of the value: "0-200", "%", "USD bn", "score 0-1", "rank", etc. */
  unit: string;
  /** Where to typically find this datapoint (national stats office, sector report, …). */
  source: string;
  /** Keywords the LLM extractor should look for in study PDFs/DOCX. */
  llmExtractionHints: string[];
}

export const TREND_TRACKER_VERSION = "V1_2026_05" as const;

export const TREND_TRACKER_49: TrendTrackerVariable[] = [
  // ── MACRO_ECO (12) ────────────────────────────────────────────────
  { code: "A1",  category: "MACRO_ECO", label: "Confiance consommateur",      unit: "0-200", source: "INSEE / INS-CM / SARB Stats", llmExtractionHints: ["consumer confidence", "indice confiance", "sentiment consommateur"] },
  { code: "A2",  category: "MACRO_ECO", label: "Inflation IPC (12 mois)",      unit: "%",     source: "BEAC / BCEAO / SARB / INSEE", llmExtractionHints: ["inflation", "CPI", "consumer price index", "IPC"] },
  { code: "A3",  category: "MACRO_ECO", label: "Croissance PIB",                unit: "%",     source: "FMI / Banque Mondiale / INS", llmExtractionHints: ["GDP growth", "croissance PIB", "expansion économique"] },
  { code: "A4",  category: "SOCIO_CULT", label: "Sentiment marque + IA (30j)",  unit: "-1..+1", source: "Brandwatch / Meltwater / social listening", llmExtractionHints: ["brand sentiment", "social listening", "buzz score", "AI sentiment"] },
  { code: "A5",  category: "MACRO_ECO", label: "Taux de change USD local",      unit: "x USD", source: "BEAC / BCEAO / SARB", llmExtractionHints: ["exchange rate", "FX", "USD parity", "taux de change"] },
  { code: "A6",  category: "MACRO_ECO", label: "Taux directeur banque centrale", unit: "%",   source: "Banque centrale", llmExtractionHints: ["policy rate", "taux directeur", "central bank rate"] },
  { code: "A7",  category: "MACRO_ECO", label: "Balance commerciale",           unit: "USD bn", source: "WTO / Customs", llmExtractionHints: ["trade balance", "balance commerciale", "exports - imports"] },
  { code: "A8",  category: "MACRO_ECO", label: "Investissements directs étrangers (FDI)", unit: "USD bn", source: "UNCTAD / FMI", llmExtractionHints: ["FDI", "foreign direct investment", "IDE"] },
  { code: "A9",  category: "MACRO_ECO", label: "Demographic dividend",          unit: "% pop 15-64", source: "UN World Population", llmExtractionHints: ["demographic dividend", "working age population", "dividende démographique"] },
  { code: "A10", category: "MACRO_ECO", label: "Pouvoir d'achat (PPP per capita)", unit: "USD",  source: "World Bank PPP", llmExtractionHints: ["PPP", "purchasing power parity", "GDP per capita PPP"] },
  { code: "A11", category: "MACRO_ECO", label: "Taux de chômage",                unit: "%",     source: "ILO / INS", llmExtractionHints: ["unemployment rate", "taux de chômage", "joblessness"] },
  { code: "A12", category: "MACRO_ECO", label: "Dette publique / PIB",          unit: "%",     source: "FMI / Trésor public", llmExtractionHints: ["debt-to-GDP", "dette publique", "public debt ratio"] },

  // ── MACRO_TECH (8) ────────────────────────────────────────────────
  { code: "B1", category: "MACRO_TECH", label: "Pénétration Internet",         unit: "% pop", source: "ITU / DataReportal", llmExtractionHints: ["internet penetration", "online users", "%pop online"] },
  { code: "B2", category: "MACRO_TECH", label: "Pénétration smartphone",        unit: "% pop", source: "GSMA / DataReportal", llmExtractionHints: ["smartphone penetration", "mobile devices", "smart device adoption"] },
  { code: "B3", category: "MACRO_TECH", label: "Mobile money pénétration",      unit: "% pop", source: "GSMA Mobile Money / BCEAO", llmExtractionHints: ["mobile money", "MoMo", "Wave", "MTN MoMo", "M-Pesa"] },
  { code: "B4", category: "MACRO_TECH", label: "E-commerce share retail",       unit: "%",     source: "Statista / eMarketer", llmExtractionHints: ["e-commerce share", "online retail share", "ventes en ligne"] },
  { code: "B5", category: "MACRO_TECH", label: "AI / GenAI maturity",           unit: "score 0-100", source: "Stanford AI Index / cabinet local", llmExtractionHints: ["AI adoption", "GenAI maturity", "intelligence artificielle"] },
  { code: "B6", category: "MACRO_TECH", label: "Cloud adoption entreprises",    unit: "%",     source: "Gartner / IDC", llmExtractionHints: ["cloud adoption", "SaaS adoption", "infrastructure cloud"] },
  { code: "B7", category: "MACRO_TECH", label: "Coût broadband moyen",          unit: "USD/mo", source: "ITU Cost of Broadband", llmExtractionHints: ["broadband cost", "internet pricing", "tarif internet fixe"] },
  { code: "B8", category: "MACRO_TECH", label: "Usage social media",             unit: "h/jour", source: "DataReportal / GWI", llmExtractionHints: ["social media use", "time spent social", "consommation réseaux sociaux"] },

  // ── SOCIO_CULT (10) ───────────────────────────────────────────────
  { code: "C1",  category: "SOCIO_CULT", label: "Valeurs générationnelles dominantes", unit: "%",  source: "WVS / Ipsos", llmExtractionHints: ["generational values", "Gen Z values", "millennial preferences"] },
  { code: "C2",  category: "SOCIO_CULT", label: "Attitude CSR / RSE",          unit: "score 0-100", source: "Edelman Trust Barometer", llmExtractionHints: ["CSR attitudes", "ESG sentiment", "RSE perception"] },
  { code: "C3",  category: "SOCIO_CULT", label: "Influence diaspora",          unit: "USD bn remit", source: "World Bank Migration", llmExtractionHints: ["remittances", "diaspora influence", "transferts diaspora"] },
  { code: "C4",  category: "SOCIO_CULT", label: "Religiosité",                  unit: "% pratiquant", source: "Pew Research", llmExtractionHints: ["religiosity", "religious practice", "religieux pratiquant"] },
  { code: "C5",  category: "SOCIO_CULT", label: "Taux d'éducation supérieure", unit: "%",     source: "UNESCO / INS", llmExtractionHints: ["tertiary education", "higher education enrollment", "enseignement supérieur"] },
  { code: "C6",  category: "SOCIO_CULT", label: "Urbanization rate",            unit: "%",     source: "UN World Urbanization", llmExtractionHints: ["urbanization rate", "population urbaine", "rural-urban shift"] },
  { code: "C7",  category: "SOCIO_CULT", label: "Langue dominante shift",       unit: "%",     source: "Surveys locaux", llmExtractionHints: ["language shift", "lingua franca", "anglicisation"] },
  { code: "C8",  category: "SOCIO_CULT", label: "Confiance institutionnelle",   unit: "score 0-100", source: "Edelman / Afrobarometer", llmExtractionHints: ["institutional trust", "confiance institutions"] },
  { code: "C9",  category: "SOCIO_CULT", label: "Indice inégalité (Gini)",      unit: "0-1",   source: "World Bank Gini", llmExtractionHints: ["Gini index", "inequality", "indice de Gini"] },
  { code: "C10", category: "SOCIO_CULT", label: "Engagement civique / vote",    unit: "% turnout", source: "IDEA / élections", llmExtractionHints: ["voter turnout", "civic engagement", "taux participation"] },

  // ── REGUL_INST (7) ────────────────────────────────────────────────
  { code: "D1", category: "REGUL_INST", label: "Pression fiscale entreprises",  unit: "% revenu", source: "World Bank Doing Business", llmExtractionHints: ["corporate tax rate", "fiscalité entreprises", "tax burden"] },
  { code: "D2", category: "REGUL_INST", label: "Coût création entreprise",      unit: "USD",     source: "World Bank Doing Business", llmExtractionHints: ["business registration cost", "création entreprise", "incorporation"] },
  { code: "D3", category: "REGUL_INST", label: "Délai obtention licences sectorielles", unit: "jours", source: "Doing Business", llmExtractionHints: ["licensing time", "permits days", "délai licences"] },
  { code: "D4", category: "REGUL_INST", label: "Dépôts OAPI / IP locale",        unit: "# / an", source: "OAPI / WIPO", llmExtractionHints: ["OAPI filings", "IP registrations", "trademarks deposits"] },
  { code: "D5", category: "REGUL_INST", label: "Cadre data protection (GDPR-equiv)", unit: "score 0-3", source: "DLA Piper / cabinet juridique", llmExtractionHints: ["data protection", "GDPR equivalent", "loi protection données"] },
  { code: "D6", category: "REGUL_INST", label: "Risque sanctions internationales", unit: "score 0-5", source: "OFAC / EU sanctions", llmExtractionHints: ["sanctions risk", "OFAC list", "embargoed entities"] },
  { code: "D7", category: "REGUL_INST", label: "Cycle électoral / stabilité",    unit: "mois reste", source: "calendrier électoral", llmExtractionHints: ["election cycle", "political stability", "élections présidentielles"] },

  // ── MICRO_SECTOR (12) ─────────────────────────────────────────────
  { code: "E1",  category: "MICRO_SECTOR", label: "Intensité concurrence sectorielle", unit: "HHI", source: "calcul interne / cabinet", llmExtractionHints: ["HHI", "concentration index", "market concentration"] },
  { code: "E2",  category: "MICRO_SECTOR", label: "Barrières à l'entrée",          unit: "score 0-5", source: "PESTEL sectoriel", llmExtractionHints: ["barriers to entry", "barrières entrée", "entry costs"] },
  { code: "E3",  category: "MICRO_SECTOR", label: "Marges typiques sector",       unit: "%",     source: "rapports sectoriels", llmExtractionHints: ["sector margins", "marges sectorielles", "EBITDA"] },
  { code: "E4",  category: "MICRO_SECTOR", label: "Croissance sector (CAGR 5y)",  unit: "%",     source: "Statista / IBISWorld", llmExtractionHints: ["sector CAGR", "growth rate", "5-year growth"] },
  { code: "E5",  category: "MICRO_SECTOR", label: "Activité M&A sector",          unit: "# deals/an", source: "Mergermarket / press releases", llmExtractionHints: ["M&A activity", "fusions acquisitions", "deals count"] },
  { code: "E6",  category: "MICRO_SECTOR", label: "Prix moyen catégorie",          unit: "monnaie locale", source: "panel Nielsen / Kantar", llmExtractionHints: ["average price", "ASP", "prix moyen"] },
  { code: "E7",  category: "MICRO_SECTOR", label: "Distribution mix",              unit: "% canaux", source: "Nielsen / GfK", llmExtractionHints: ["distribution mix", "channel split", "trade share"] },
  { code: "E8",  category: "MICRO_SECTOR", label: "NPS moyen sector",              unit: "-100..+100", source: "Bain / cabinet", llmExtractionHints: ["sector NPS", "Net Promoter Score", "customer satisfaction"] },
  { code: "E9",  category: "MICRO_SECTOR", label: "Churn rate moyen sector",       unit: "%",     source: "rapports SaaS / cabinet", llmExtractionHints: ["churn rate", "customer attrition", "taux de désabonnement"] },
  { code: "E10", category: "MICRO_SECTOR", label: "CAC sector benchmark",          unit: "USD",   source: "rapports sectoriels", llmExtractionHints: ["CAC benchmark", "customer acquisition cost", "coût acquisition"] },
  { code: "E11", category: "MICRO_SECTOR", label: "LTV sector benchmark",          unit: "USD",   source: "rapports sectoriels", llmExtractionHints: ["LTV benchmark", "lifetime value", "valeur client à vie"] },
  { code: "E12", category: "MICRO_SECTOR", label: "Top 3 leaders parts de marché", unit: "%",     source: "Nielsen / Kantar / Euromonitor", llmExtractionHints: ["market share", "leaders", "top players"] },
];

/** Type-safe enum of canonical codes (used as `keyof` in extraction). */
export type TrendTrackerCode = (typeof TREND_TRACKER_49)[number]["code"];

/** Lookup helper. */
export function getTrendTrackerVariable(code: string): TrendTrackerVariable | undefined {
  return TREND_TRACKER_49.find((v) => v.code === code);
}

/** Group by category for UI rendering. */
export function trendTrackerByCategory(): Record<TrendTrackerCategory, TrendTrackerVariable[]> {
  const out: Record<TrendTrackerCategory, TrendTrackerVariable[]> = {
    MACRO_ECO: [],
    MACRO_TECH: [],
    SOCIO_CULT: [],
    REGUL_INST: [],
    MICRO_SECTOR: [],
  };
  for (const v of TREND_TRACKER_49) {
    out[v.category].push(v);
  }
  return out;
}
