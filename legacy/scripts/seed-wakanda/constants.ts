/**
 * WAKANDA MEGA SEED — Shared Constants
 *
 * Deterministic IDs (wk-* prefix), timeline dates, and reusable enums
 * for the entire Wakanda demo ecosystem.
 */

// ============================================================================
// TIMELINE — 3 months of BLISS activity (Jan 15 → Apr 12, 2026)
// ============================================================================

export const T = {
  // Week 1 — Birth
  intake:           new Date("2026-01-15T09:00:00Z"),
  intakeConverted:  new Date("2026-01-16T14:00:00Z"),
  bootStart:        new Date("2026-01-17T08:00:00Z"),
  bootAD:           new Date("2026-01-19T16:00:00Z"),
  bootVE:           new Date("2026-01-20T11:00:00Z"),
  docsUploaded:     new Date("2026-01-21T10:00:00Z"),

  // Week 2 — RTIS Cascade
  rtisCascade:      new Date("2026-01-22T09:00:00Z"),
  vaultEnrichment:  new Date("2026-01-24T14:00:00Z"),
  recosReviewed:    new Date("2026-01-25T16:00:00Z"),
  contractSigned:   new Date("2026-01-27T11:00:00Z"),
  driversConfigured:new Date("2026-01-28T09:00:00Z"),

  // Week 3-4 — Notoria + Team
  notoriaStage1:    new Date("2026-01-29T10:00:00Z"),
  teamAssembled:    new Date("2026-02-01T09:00:00Z"),
  socialConnected:  new Date("2026-02-03T14:00:00Z"),
  notoriaStage2:    new Date("2026-02-05T10:00:00Z"),
  campaignBriefed:  new Date("2026-02-10T09:00:00Z"),

  // Week 5-8 — Production + App Dev
  campaignPlanning: new Date("2026-02-12T09:00:00Z"),
  missionsStart:    new Date("2026-02-15T09:00:00Z"),
  missionsEnd:      new Date("2026-02-28T18:00:00Z"),
  heritageLive:     new Date("2026-03-01T06:00:00Z"),
  superfansWave1:   new Date("2026-03-05T14:00:00Z"),
  heritageMetrics:  new Date("2026-03-08T10:00:00Z"),

  // Week 9-12 — Maturity + Flagship
  notoriaStage3:    new Date("2026-03-12T10:00:00Z"),
  heritagePost:     new Date("2026-03-15T09:00:00Z"),
  glowLaunch:       new Date("2026-03-18T06:00:00Z"),
  appLaunch:        new Date("2026-03-20T12:00:00Z"),
  ambassadorLaunch: new Date("2026-03-25T09:00:00Z"),
  scoresValidated:  new Date("2026-03-28T16:00:00Z"),

  // Current state (demo snapshot)
  now:              new Date("2026-04-10T10:00:00Z"),
} as const;

// ============================================================================
// OPERATOR & CLIENTS
// ============================================================================

export const IDS = {
  // Operator
  operator: "wk-operator-wakanda-digital",

  // Clients (one per brand)
  clientBliss:      "wk-client-bliss",
  clientVibranium:  "wk-client-vibranium",
  clientBrew:       "wk-client-brew",
  clientPanther:    "wk-client-panther",
  clientShuri:      "wk-client-shuri",
  clientJabari:     "wk-client-jabari",

  // Users — Named characters
  userAmara:        "wk-user-amara-udaku",       // BLISS owner
  userShuri:        "wk-user-shuri-udaku",        // Shuri Academy owner
  userNakia:        "wk-user-nakia-okoye",        // Account director
  userOkoye:        "wk-user-okoye-dora",         // Brand manager
  userWkabi:        "wk-user-wkabi-kante",        // Financial controller
  userMbaku:        "wk-user-mbaku-jabari",       // Jabari Heritage owner
  userTchalla:      "wk-user-tchalla-bassari",    // Vibranium Tech owner
  userRamonda:      "wk-user-ramonda-brewster",   // Wakanda Brew owner

  // Freelancers — Creative
  talentDA:         "wk-talent-kofi-asante",      // DA, MAITRE
  talentCopy:       "wk-talent-aya-mensah",       // Copywriter, COMPAGNON
  talentPhoto:      "wk-talent-kwame-fotso",      // Photographe, MAITRE
  talentVideo:      "wk-talent-fatou-diallo",     // Videaste, COMPAGNON
  talentCM:         "wk-talent-issa-ndiaye",      // Community manager, APPRENTI

  // Freelancers — Tech
  talentIOS:        "wk-talent-chinua-dev",       // iOS dev, COMPAGNON
  talentAndroid:    "wk-talent-amadi-tech",       // Android dev, APPRENTI
  talentUX:         "wk-talent-zuri-design",      // UX designer, MAITRE

  // Strategies
  stratBliss:       "wk-strategy-bliss",
  stratVibranium:   "wk-strategy-vibranium-tech",
  stratBrew:        "wk-strategy-wakanda-brew",
  stratPanther:     "wk-strategy-panther-athletics",
  stratShuri:       "wk-strategy-shuri-academy",
  stratJabari:      "wk-strategy-jabari-heritage",

  // Guild
  guild:            "wk-guild-wakanda-creative",

  // Campaigns — BLISS
  campaignHeritage: "wk-campaign-heritage-collection",
  campaignGlow:     "wk-campaign-vibranium-glow",

  // Campaigns — Others
  campaignSchool:   "wk-campaign-back-to-school",
  campaignFreedom:  "wk-campaign-financial-freedom",
  campaignHarvest:  "wk-campaign-harvest-festival",

  // Contracts
  contractBliss:    "wk-contract-bliss-rtis",
  contractShuri:    "wk-contract-shuri-annual",

  // Deals
  dealBliss:        "wk-deal-bliss",
  dealVibranium:    "wk-deal-vibranium",
  dealBrew:         "wk-deal-brew",
  dealPanther:      "wk-deal-panther",
  dealShuri:        "wk-deal-shuri",
  dealJabari:       "wk-deal-jabari",

  // Quick Intakes
  intakeBliss:      "wk-intake-bliss",
  intakePanther:    "wk-intake-panther",

  // Ambassador
  ambassadorBliss:  "wk-ambassador-bliss",

  // Orchestration
  orchBootBliss:    "wk-orch-boot-bliss",
  orchActiveBliss:  "wk-orch-active-bliss",
} as const;

// ============================================================================
// CURRENCY & LOCALE
// ============================================================================

export const WAKANDA = {
  currency: "XAF",
  country: "WK",
  locale: "fr-WK",
  timezone: "Africa/Douala", // same UTC+1 zone
} as const;

// ============================================================================
// PASSWORD (shared for all demo users)
// ============================================================================

export const DEMO_PASSWORD = "Wakanda2026!";
