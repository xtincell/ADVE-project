/**
 * Thot — Canonical action-cost catalog (ADR-0093).
 *
 * Source of truth for the seed (`prisma/seed-action-costs.ts`). Each archetype
 * decomposes into atoms (cout de location matériel, cout horaire prestataire ×
 * durée, location lieu…). `baseRate` values are indicative @ baseZone (CM / XAF)
 * — DATA, seeded into `ActionCostComponent.baseRate`, NOT source-code pricing
 * literals (ADR-0087 : "Computed indice values = ZoneIndex Prisma table"). They
 * are scaled per market by the cost-of-living ZoneIndex and overridable per
 * provider by ProviderCostRate.
 *
 * The catalog is extensible : add templates here + re-seed, or let an operator
 * upsert rows at runtime (THOT_UPSERT_* intents). Definitive shape, growing data.
 */

import type { CatalogTemplate } from "./types";

export const ACTION_COST_CATALOG: CatalogTemplate[] = [
  // ── Flagship : séance photo (l'exemple du mandat opérateur) ──
  {
    actionKey: "PHOTO_SESSION_HALF_DAY",
    label: "Séance photo (demi-journée)",
    category: "PRODUCTION",
    family: "PHOTO",
    unitOfWork: "PROJECT",
    description:
      "Shooting produit/lifestyle en studio sur une demi-journée — atomisé en cout horaire prestataire, location matériel, location studio, post-production.",
    defaultDurationHours: 4,
    tags: ["photo", "studio", "production"],
    source: "UPgraders production survey 2026 (zone Douala/Yaoundé, indicatif)",
    components: [
      { driver: "LABOR", label: "Photographe principal", unit: "HOUR", quantity: 4, rateBasis: "PROVIDER_RATE", rateKey: "PHOTOGRAPHER", baseRate: 25000 },
      { driver: "LABOR", label: "Assistant photo", unit: "HOUR", quantity: 4, baseRate: 8000 },
      { driver: "EQUIPMENT_RENTAL", label: "Boîtier + objectifs", unit: "HALF_DAY", quantity: 1, baseRate: 60000 },
      { driver: "EQUIPMENT_RENTAL", label: "Kit lumière studio", unit: "HALF_DAY", quantity: 1, baseRate: 40000 },
      { driver: "LOCATION", label: "Studio photo", unit: "HALF_DAY", quantity: 1, baseRate: 75000 },
      { driver: "CONSUMABLES", label: "Maquillage / stylisme", unit: "FLAT", quantity: 1, baseRate: 50000, optional: true },
      { driver: "POST_PRODUCTION", label: "Retouche", unit: "HOUR", quantity: 6, baseRate: 12000 },
      { driver: "TRAVEL", label: "Transport équipe + matériel", unit: "FLAT", quantity: 1, baseRate: 25000 },
    ],
  },
  // ── Vidéo 1 jour ──
  {
    actionKey: "VIDEO_SHOOT_1DAY",
    label: "Tournage vidéo (1 jour)",
    category: "PRODUCTION",
    family: "VIDEO",
    description: "Captation vidéo professionnelle sur une journée, équipe complète + post-production.",
    defaultDurationHours: 8,
    tags: ["video", "tournage", "production"],
    components: [
      { driver: "LABOR", label: "Réalisateur", unit: "DAY", quantity: 1, rateBasis: "PROVIDER_RATE", rateKey: "DIRECTOR", baseRate: 150000 },
      { driver: "LABOR", label: "Cadreur", unit: "DAY", quantity: 1, baseRate: 90000 },
      { driver: "LABOR", label: "Ingénieur son", unit: "DAY", quantity: 1, baseRate: 70000 },
      { driver: "EQUIPMENT_RENTAL", label: "Caméra + optiques", unit: "DAY", quantity: 1, baseRate: 200000 },
      { driver: "EQUIPMENT_RENTAL", label: "Kit lumière + machinerie", unit: "DAY", quantity: 1, baseRate: 120000 },
      { driver: "LOCATION", label: "Lieu de tournage", unit: "DAY", quantity: 1, baseRate: 150000 },
      { driver: "PER_DIEM", label: "Restauration équipe", unit: "UNIT", quantity: 8, baseRate: 8000 },
      { driver: "POST_PRODUCTION", label: "Montage + étalonnage", unit: "DAY", quantity: 2, baseRate: 120000 },
      { driver: "TRAVEL", label: "Transport / logistique", unit: "FLAT", quantity: 1, baseRate: 60000 },
    ],
  },
  // ── Batch contenu social ──
  {
    actionKey: "SOCIAL_CONTENT_BATCH",
    label: "Batch contenu social (10 posts)",
    category: "PRODUCTION",
    family: "DIGITAL",
    description: "Production d'un lot de 10 contenus social media déclinés multi-formats.",
    defaultDurationHours: 18,
    tags: ["social", "contenu", "digital"],
    components: [
      { driver: "LABOR", label: "Création visuelle", unit: "HOUR", quantity: 12, baseRate: 12000 },
      { driver: "LABOR", label: "Copywriting", unit: "HOUR", quantity: 6, baseRate: 10000 },
      { driver: "LICENSE", label: "Banque d'images / templates", unit: "FLAT", quantity: 1, baseRate: 15000, optional: true },
      { driver: "POST_PRODUCTION", label: "Déclinaisons formats", unit: "HOUR", quantity: 6, baseRate: 9000 },
    ],
  },
  // ── Spot radio 30s ──
  {
    actionKey: "RADIO_SPOT_30S",
    label: "Spot radio 30s",
    category: "PRODUCTION",
    family: "AUDIO",
    unitOfWork: "SPOT",
    description: "Production d'un spot radio de 30 secondes — écriture, voix, studio, mixage.",
    defaultDurationHours: 4,
    tags: ["radio", "audio", "spot"],
    components: [
      { driver: "LABOR", label: "Écriture script", unit: "HOUR", quantity: 2, baseRate: 12000 },
      { driver: "LABOR", label: "Voix-off comédien", unit: "FLAT", quantity: 1, rateBasis: "PROVIDER_RATE", rateKey: "VOICE_TALENT", baseRate: 75000 },
      { driver: "EQUIPMENT_RENTAL", label: "Studio d'enregistrement", unit: "HOUR", quantity: 2, baseRate: 25000 },
      { driver: "POST_PRODUCTION", label: "Mixage + habillage", unit: "HOUR", quantity: 3, baseRate: 15000 },
      { driver: "LICENSE", label: "Musique / sound design", unit: "FLAT", quantity: 1, baseRate: 30000, optional: true },
    ],
  },
  // ── Spot TV 30s ──
  {
    actionKey: "TV_SPOT_30S",
    label: "Spot TV 30s",
    category: "PRODUCTION",
    family: "VIDEO",
    unitOfWork: "SPOT",
    description: "Film publicitaire TV 30s — réalisation, casting, décors, post-production + droits.",
    defaultDurationHours: 16,
    defaultMarginPct: 0.25,
    tags: ["tv", "spot", "film"],
    components: [
      { driver: "LABOR", label: "Réalisateur", unit: "DAY", quantity: 2, rateBasis: "PROVIDER_RATE", rateKey: "DIRECTOR", baseRate: 250000 },
      { driver: "LABOR", label: "Équipe technique (forfait)", unit: "FLAT", quantity: 1, baseRate: 600000 },
      { driver: "EQUIPMENT_RENTAL", label: "Matériel de production", unit: "DAY", quantity: 2, baseRate: 400000 },
      { driver: "LOCATION", label: "Décors / lieux", unit: "FLAT", quantity: 1, baseRate: 500000 },
      { driver: "LABOR", label: "Casting comédiens", unit: "FLAT", quantity: 1, rateBasis: "PROVIDER_RATE", rateKey: "ACTOR", baseRate: 400000 },
      { driver: "POST_PRODUCTION", label: "Montage + VFX + étalonnage", unit: "DAY", quantity: 4, baseRate: 200000 },
      { driver: "LICENSE", label: "Musique / droits", unit: "FLAT", quantity: 1, baseRate: 300000 },
    ],
  },
  // ── Activation événementielle (1 jour) ──
  {
    actionKey: "EVENT_ACTIVATION_DAY",
    label: "Activation terrain (1 jour)",
    category: "EVENT",
    family: "EVENT",
    description: "Activation de marque sur point de vente / espace public — stand, animation, logistique.",
    defaultDurationHours: 10,
    defaultMarginPct: 0.18,
    tags: ["event", "activation", "btl"],
    components: [
      { driver: "LABOR", label: "Chef de projet event", unit: "DAY", quantity: 1, baseRate: 120000 },
      { driver: "LABOR", label: "Animateurs / hôtesses", unit: "DAY", quantity: 6, baseRate: 25000 },
      { driver: "EQUIPMENT_RENTAL", label: "Stand + mobilier", unit: "FLAT", quantity: 1, baseRate: 400000 },
      { driver: "EQUIPMENT_RENTAL", label: "Sono + lumière", unit: "DAY", quantity: 1, baseRate: 200000 },
      { driver: "LOCATION", label: "Espace / emplacement", unit: "DAY", quantity: 1, baseRate: 300000 },
      { driver: "LOGISTICS", label: "Montage / démontage", unit: "FLAT", quantity: 1, baseRate: 150000 },
      { driver: "CONSUMABLES", label: "Goodies / échantillons", unit: "UNIT", quantity: 200, baseRate: 1500 },
      { driver: "TRAVEL", label: "Transport matériel", unit: "FLAT", quantity: 1, baseRate: 100000 },
    ],
  },
  // ── Affichage OOH (panneau) ──
  {
    actionKey: "OOH_CAMPAIGN_PANEL",
    label: "Affichage OOH (panneau / mois)",
    category: "MEDIA",
    family: "OOH",
    description: "Campagne d'affichage extérieur — conception, impression grand format, location espace, pose.",
    defaultMarginPct: 0.15,
    tags: ["ooh", "affichage", "media"],
    components: [
      { driver: "LABOR", label: "Conception graphique", unit: "HOUR", quantity: 8, baseRate: 12000 },
      { driver: "CONSUMABLES", label: "Impression bâche grand format", unit: "SQUARE_METER", quantity: 12, baseRate: 12000 },
      { driver: "MEDIA_SPACE", label: "Location panneau (mois)", unit: "FLAT", quantity: 1, baseRate: 350000 },
      { driver: "LOGISTICS", label: "Pose / dépose affichage", unit: "FLAT", quantity: 1, baseRate: 80000 },
    ],
  },
  // ── Post influenceur ──
  {
    actionKey: "INFLUENCER_POST",
    label: "Post influenceur",
    category: "TALENT",
    family: "INFLUENCE",
    description: "Collaboration influenceur — cachet talent, brief, coordination, reporting.",
    tags: ["influence", "talent", "social"],
    components: [
      { driver: "LICENSE", label: "Cachet influenceur", unit: "FLAT", quantity: 1, rateBasis: "PROVIDER_RATE", rateKey: "INFLUENCER", baseRate: 250000 },
      { driver: "LABOR", label: "Brief + coordination", unit: "HOUR", quantity: 3, baseRate: 10000 },
      { driver: "POST_PRODUCTION", label: "Validation / reporting", unit: "HOUR", quantity: 2, baseRate: 8000 },
    ],
  },
  // ── Key visual print ──
  {
    actionKey: "PRINT_KV",
    label: "Key visual print",
    category: "PRODUCTION",
    family: "PRINT",
    description: "Conception d'un key visual print — direction artistique, exécution, BAT.",
    tags: ["print", "kv", "design"],
    components: [
      { driver: "LABOR", label: "Direction artistique", unit: "HOUR", quantity: 6, baseRate: 18000 },
      { driver: "LABOR", label: "Exécution PAO", unit: "HOUR", quantity: 8, baseRate: 10000 },
      { driver: "LICENSE", label: "Banque d'images", unit: "FLAT", quantity: 1, baseRate: 40000, optional: true },
      { driver: "CONSUMABLES", label: "Épreuves / BAT", unit: "FLAT", quantity: 1, baseRate: 20000 },
    ],
  },
  // ── Événement presse / RP ──
  {
    actionKey: "PR_PRESS_EVENT",
    label: "Événement presse / RP",
    category: "EVENT",
    family: "EVENT",
    description: "Conférence ou événement presse — attaché de presse, lieu, cocktail, dossiers.",
    defaultMarginPct: 0.18,
    tags: ["pr", "presse", "event"],
    components: [
      { driver: "LABOR", label: "Attaché de presse", unit: "DAY", quantity: 1, baseRate: 100000 },
      { driver: "LOCATION", label: "Salle / lieu", unit: "FLAT", quantity: 1, baseRate: 350000 },
      { driver: "PER_DIEM", label: "Cocktail / restauration", unit: "UNIT", quantity: 40, baseRate: 10000 },
      { driver: "CONSUMABLES", label: "Dossiers de presse", unit: "UNIT", quantity: 40, baseRate: 5000 },
      { driver: "LABOR", label: "Hôtesses accueil", unit: "DAY", quantity: 3, baseRate: 25000 },
    ],
  },
  // ── Design packaging ──
  {
    actionKey: "PACKAGING_DESIGN",
    label: "Design packaging",
    category: "PRODUCTION",
    family: "PRINT",
    description: "Conception d'un packaging produit + déclinaisons gamme + prototypes.",
    defaultMarginPct: 0.22,
    tags: ["packaging", "design", "print"],
    components: [
      { driver: "LABOR", label: "Design packaging", unit: "HOUR", quantity: 16, baseRate: 18000 },
      { driver: "LABOR", label: "Déclinaisons gamme", unit: "HOUR", quantity: 12, baseRate: 12000 },
      { driver: "CONSUMABLES", label: "Prototypes / maquettes", unit: "UNIT", quantity: 3, baseRate: 35000 },
    ],
  },
  // ── Landing page ──
  {
    actionKey: "LANDING_PAGE",
    label: "Landing page",
    category: "PRODUCTION",
    family: "DIGITAL",
    description: "Conception + intégration d'une landing page — UX/UI, dev, recette.",
    tags: ["web", "digital", "dev"],
    components: [
      { driver: "LABOR", label: "UX / UI design", unit: "HOUR", quantity: 16, baseRate: 15000 },
      { driver: "LABOR", label: "Intégration / dev", unit: "HOUR", quantity: 24, baseRate: 14000 },
      { driver: "LICENSE", label: "Hébergement / domaine (an)", unit: "FLAT", quantity: 1, baseRate: 60000, optional: true },
      { driver: "POST_PRODUCTION", label: "Recette / QA", unit: "HOUR", quantity: 6, baseRate: 10000 },
    ],
  },
];

/** Map for O(1) lookup by actionKey. */
export const CATALOG_BY_KEY: Record<string, CatalogTemplate> = Object.fromEntries(
  ACTION_COST_CATALOG.map((t) => [t.actionKey, t]),
);
