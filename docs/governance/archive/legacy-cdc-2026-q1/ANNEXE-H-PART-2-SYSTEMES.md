# ANNEXE H — Ontologie des Variables du Système ADVE-RTIS

# PARTIE 2/2 — SYSTÈMES & INTELLIGENCE (Composites Avancés, Collections, Assemblages, Scoring, GLORY)

**Version** : 2.0 (consolidation)
**Date** : 24 mars 2026

> Suite de : ANNEXE-H-PART-1-FONDATIONS.md (N0, N1, N2.01–N2.12)

---

# NIVEAU 2 — COMPOSITES (Partie 2 : N2.13–N2.18)

## N2.13 — Signal (atome d'intelligence)

```typescript
interface Signal {                          // Pilier R + T (Tarsis)
  id: string;
  layer: "METRIC" | "STRONG" | "WEAK";
  pillarAffected: atom.text_short;          // Quel pilier ce signal impacte (A, D, V, E...)
  
  // Contenu
  title: atom.text_short;
  description: atom.text_medium;
  source: atom.text_short;                  // D'où vient le signal (veille, client, terrain, social...)
  confidence: atom.percentage;
  
  // Impact
  advertis_impact: {
    pillar: string;
    direction: "positive" | "negative" | "neutral";
    magnitude: "low" | "medium" | "high";
  }[];
  
  // Action
  status: "ACTIVE" | "ACKNOWLEDGED" | "ACTIONED" | "DISMISSED";
  urgency: atom.urgency;
  recommendedAction: atom.text_medium;
}
```

**Usage** : le feedback loop consomme les signaux et recalibre les scores des piliers. Mestor agrège les signaux actifs pour ses recommandations quotidiennes.

---

## N2.14 — Ennemi (Le Sheitan du culte)

> L'ennemi n'est PAS un concept abstrait ("la médiocrité"). C'est un **mouvement miroir concret** avec des adeptes, des marques, des valeurs opposées, et des actions d'opposition mesurables. La haine commune de l'ennemi est le liant de fraternité le plus puissant entre les superfans — plus fort que l'amour de la marque elle-même.

```typescript
interface Enemy {                           // Pilier A (ARTEMIS FW-20)
  // Identité du mouvement ennemi
  name: atom.text_short;                    // Le MOUVEMENT, pas un concurrent
  manifesto: atom.text_medium;
  narrative: atom.text_medium;              // Le récit dominant de l'ennemi
  
  // Opposition axiologique (Schwartz)
  enemySchwartzValues: atom.schwartz_value[];
  brandSchwartzValues: atom.schwartz_value[];  // Nos valeurs pour vérifier la tension
  tensionProof: atom.text_medium;
  
  // Position sur la fenêtre d'Overton
  overtonMap: {
    ourPosition: atom.text_medium;
    enemyPosition: atom.text_medium;
    battleground: atom.text_medium;         // Zone contestée
    shiftDirection: atom.text_medium;       // Direction du push Overton
  };
  
  // Forces concrètes de l'ennemi
  enemyBrands: Array<{
    name: atom.text_short;
    sector: atom.sector;
    marketShare: atom.text_short;
    howTheyFight: atom.text_medium;
    theirSuperfans: atom.text_short;
  }>;
  enemySuperfanProfile: {
    tensionSegments: TensionSegment[];
    lf8Exploited: atom.lf8[];              // Typiquement LF3 peur, LF5 confort
    count: atom.text_short;
  };
  enemyNarratives: Array<{
    narrative: atom.text_medium;
    channel: atom.channel;
    effectiveness: atom.risk_level;
  }>;
  
  // Modes d'opposition
  activeOpposition: Array<{
    action: atom.text_medium;
    frequency: atom.text_short;
    impact: atom.risk_level;
  }>;
  passiveOpposition: Array<{
    resistance: atom.text_medium;           // Habitudes, normes, inertie
    entrenchment: atom.risk_level;
  }>;
  
  // Notre stratégie de combat
  counterStrategy: {
    marketingCounter: atom.text_long;
    lobbyingCounter: atom.text_medium;
    alliances: Array<{
      name: atom.text_short;
      type: atom.text_short;               // "Marque alliée", "Institution", "Influenceur", "Média"
      sharedEnemy: atom.text_short;
    }>;
    overtonActions: atom.text_medium[];
  };
  
  // Fraternité (lien Devotion)
  fraternityFuel: {
    sharedHatred: atom.text_medium;
    recognitionSignal: atom.text_medium;
    tribalRituals: atom.text_medium;
    warStories: atom.text_medium;
  };
}
```

**Validation** : `enemySchwartzValues` en tension avec `brandSchwartzValues` (vérifié via T.02). `enemyBrands` min:1. `activeOpposition` + `passiveOpposition` min:2 total. `counterStrategy.alliances` min:1. Cross-ref : `fraternityFuel.tribalRituals` → au moins un rituel dans E.rituels. `overtonMap.shiftDirection` cohérent avec `A.prophecy.worldTransformed`.

---

## N2.15 — Direction Artistique (Pipeline BRAND GLORY)

> La DA est un système de production visuelle composé de **10 sous-composites séquencés**, chacun correspondant à un outil GLORY de la couche BRAND. Le pipeline a des dépendances explicites.

### Pipeline et dépendances

```
BRAND #1  SemioticAnalysis         → []              (Greimas, Floch, Barthes)
BRAND #2  VisualLandscapeMap       → [#1]            (cartographie concurrentielle)
BRAND #3  Moodboard                → [#1, #2]        (+ prompts Nano Banana)
BRAND #4  ChromaticSystem          → [#3]            (5 niveaux)
BRAND #5  TypographySystem         → [#4]            (4 couches)
BRAND #6  LogoTypeRecommendation   → [#4, #5]
BRAND #7  LogoValidation           → [#6]
BRAND #8  DesignTokens             → [#4, #5, #6]    (3-tier Salesforce)
BRAND #9  MotionIdentity           → [#8]
BRAND #10 BrandGuidelines          → [tout]          (13 sections)
```

### Sous-composite #1 — Analyse Sémiotique

```typescript
interface SemioticAnalysis {                // GLORY: semiotic-brand-analyzer
  greimas: {
    subject: atom.text_short;
    contrary: atom.text_short;
    contradictory: atom.text_short;
    implication: atom.text_short;
    brandPosition: atom.text_medium;
  };
  flochAxes: {
    practicalVsUtopian: atom.text_medium;
    criticalVsLudic: atom.text_medium;
    brandQuadrant: atom.text_short;
  };
  barthesConnotation: {
    denotation: atom.text_medium;
    connotation: atom.text_medium;
    myths: atom.text_medium;
  };
  semanticGaps: atom.text_medium[];
  culturalContext: atom.market[];
}
```

### Sous-composite #2 — Cartographie Visuelle Concurrentielle

```typescript
interface VisualLandscapeMap {              // GLORY: visual-landscape-mapper
  matrix: {
    axisX: atom.text_short;                // Ex: "Premium ↔ Accessible"
    axisY: atom.text_short;                // Ex: "Modern ↔ Heritage"
    competitors: Array<{
      name: atom.text_short;
      positionX: atom.number;              // -100 à +100
      positionY: atom.number;
      dominantColors: atom.hex_color[];
      typographyStyle: atom.text_short;
    }>;
    brandTarget: { x: atom.number; y: atom.number };
    availableZones: atom.text_medium[];
  };
  dba: Array<{                             // Distinctive Brand Assets
    competitor: atom.text_short;
    assets: atom.text_short[];
    ownershipStrength: atom.risk_level;
  }>;
  chromaticTerritory: {
    occupied: atom.hex_color[];
    available: atom.hex_color[];
  };
}
```

### Sous-composite #3 — Moodboard

```typescript
interface Moodboard {                       // GLORY: visual-moodboard-generator
  direction: atom.text_long;
  mood: atom.text_short[];
  references: Array<{
    source: atom.text_short;
    url: atom.url;
    rationale: atom.text_short;
  }>;
  cmfAnalysis: {                           // Color, Material, Finish
    colors: atom.text_medium;
    materials: atom.text_medium;
    finishes: atom.text_medium;
  };
  nanoBananaPrompts: atom.text_long[];
  applications: atom.text_short[];
}
```

### Sous-composite #4 — Système Chromatique

```typescript
interface ChromaticSystem {                 // GLORY: chromatic-strategy-builder
  tiers: {
    primary: Array<{                       // Tier 1 — 2-3 couleurs maîtresses
      hex: atom.hex_color;
      name: atom.text_short;
      munsell: atom.text_short;
      pantone: atom.text_short;
      cmyk: atom.text_short;
      meaning: atom.text_medium;           // Signification sémiotique (lien LSI)
      usage: atom.text_short;
    }>;
    secondary: Array<{hex: atom.hex_color; name: atom.text_short; usage: atom.text_short}>;
    accent: Array<{hex: atom.hex_color; name: atom.text_short; usage: atom.text_short}>;
    neutral: Array<{hex: atom.hex_color; name: atom.text_short; usage: atom.text_short}>;
    semantic: Array<{hex: atom.hex_color; name: atom.text_short; role: atom.text_short}>;
  };
  accessibility: {
    wcagLevel: "AA" | "AAA";
    contrastPairs: Array<{fg: atom.hex_color; bg: atom.hex_color; ratio: atom.number}>;
  };
  forbidden: Array<{hex: atom.hex_color; reason: atom.text_short}>;
  applicationRules: atom.text_medium;
}
```

### Sous-composite #5 — Système Typographique

```typescript
interface TypographySystem {                // GLORY: typography-system-architect
  layers: {
    primary: { family: atom.text_short; weight: atom.text_short; rationale: atom.text_medium; license: atom.text_short };
    secondary: { family: atom.text_short; weight: atom.text_short; rationale: atom.text_medium; license: atom.text_short };
    display: { family: atom.text_short | null; usage: atom.text_short };
    functional: { family: atom.text_short; usage: atom.text_short };
  };
  scale: {
    ratio: atom.text_short;               // "Major Third 1.25" ou "Perfect Fourth 1.333"
    baseSize: atom.number;
    sizes: Array<{name: atom.text_short; px: atom.number; usage: atom.text_short}>;
  };
  modes: {
    productive: atom.text_medium;          // IBM productive
    expressive: atom.text_medium;          // IBM expressive
  };
  languageSupport: atom.text_short[];
}
```

### Sous-composite #6 — Recommandation Logo

```typescript
interface LogoTypeRecommendation {          // GLORY: logo-type-advisor
  recommendation: "wordmark" | "symbol" | "combination" | "emblem" | "lettermark" | "abstract";
  decisionMatrix: Array<{
    factor: atom.text_short;               // 8 facteurs
    assessment: atom.text_medium;
    implication: atom.text_short;
  }>;
  briefDesigner: atom.text_long;
  constraints: atom.text_medium[];
}
```

### Sous-composite #7 — Validation Logo

```typescript
interface LogoValidation {                  // GLORY: logo-validation-protocol
  scalability: {
    favicon16: atom.boolean;
    appIcon: atom.boolean;
    businessCard: atom.boolean;
    billboard: atom.boolean;
    score: atom.score_100;
  };
  monochromeTest: atom.boolean;
  associationsTest: atom.text_medium;
  metrics5D: {
    memorability: atom.score_100;
    distinctiveness: atom.score_100;
    relevance: atom.score_100;
    versatility: atom.score_100;
    timelessness: atom.score_100;
  };
  responsiveTiers: Array<{
    tier: 1 | 2 | 3 | 4;
    description: atom.text_short;
    minWidth: atom.number;
  }>;
}
```

### Sous-composite #8 — Design Tokens

```typescript
interface DesignTokens {                    // GLORY: design-token-architect
  architecture: "3-tier";                  // Salesforce 3-tier (global → alias → component)
  globalTokens: Array<{
    name: atom.text_short;
    value: atom.text_short;
    type: "color" | "spacing" | "typography" | "shadow" | "border" | "motion";
  }>;
  aliasTokens: Array<{
    name: atom.text_short;
    ref: atom.text_short;
    context: atom.text_short;
  }>;
  exportFormats: Array<"JSON" | "YAML" | "CSS" | "Tailwind" | "Figma" | "iOS" | "Android">;
  platforms: atom.text_short[];
}
```

### Sous-composite #9 — Motion Identity

```typescript
interface MotionIdentity {                  // GLORY: motion-identity-designer
  principles: {
    productive: atom.text_medium;
    expressive: atom.text_medium;
  };
  curves: Array<{
    name: atom.text_short;
    bezier: atom.text_short;
    usage: atom.text_short;
  }>;
  durations: Array<{
    name: atom.text_short;
    ms: atom.number;
    usage: atom.text_short;
  }>;
  exportFormats: Array<"Lottie" | "CSS" | "Framer" | "After Effects">;
  signature: atom.text_medium;
}
```

### Sous-composite #10 — Brand Guidelines (document final)

```typescript
interface BrandGuidelines {                 // GLORY: brand-guidelines-generator
  sections: {                              // 13 sections classe Frontify/Brandpad
    brandStory: atom.text_long;            // 1. (de A)
    missionVisionValues: atom.text_long;   // 2. (de A)
    positioning: atom.text_long;           // 3. (de D)
    logos: atom.text_long;                 // 4. (de #6 + #7)
    colors: atom.text_long;               // 5. (de #4)
    typography: atom.text_long;            // 6. (de #5)
    photography: atom.text_long;           // 7. (de #3 + LSI)
    iconography: atom.text_long;           // 8.
    layout: atom.text_long;               // 9.
    motion: atom.text_long;               // 10. (de #9)
    voice: atom.text_long;                // 11. (de D.tonDeVoix)
    applications: atom.text_long;          // 12.
    dosAndDonts: atom.text_long;           // 13.
  };
  version: atom.text_short;
  lastUpdated: atom.date;
  exportFormats: Array<"PDF" | "HTML" | "Notion">;
}
```

### LSI — Framework transversal de la DA

La matrice LSI (Layered Semantic Integration) structure l'ensemble du pipeline BRAND. Chaque concept abstrait de la marque est distribué sur 5 couches pour éviter le littéralisme :

```typescript
interface LSIMatrix {                       // Transversal à toute la DA
  concepts: atom.text_short[];             // 3-5 concepts (tirés de A.valeurs + A.archetype + D.positionnement + A.enemy)
  distribution: Array<{
    concept: atom.text_short;
    anatomy: atom.text_medium;             // Formes, proportions, structures
    outfit: atom.text_medium;              // Textiles, packaging, imprimés
    texture: atom.text_medium;             // Surfaces, patines, finitions
    accessories: atom.text_medium;         // Objets, icônes, signalétique
    attitude: atom.text_medium;            // Postures, compositions, dynamiques
  }>;
  sublimationRules: Array<{
    literal: atom.text_short;              // L'interprétation littérale à ÉVITER
    sublimated: atom.text_short;           // L'évocation à utiliser
  }>;
  visualHierarchy: Array<{
    level: 1 | 2 | 3;
    element: atom.text_short;
    role: atom.text_short;
  }>;
}
```

**La DA complète** :

```typescript
interface DirectionArtistique {             // Pilier D — 10 sous-composites + LSI
  lsi: LSIMatrix;
  semioticAnalysis: SemioticAnalysis;      // BRAND #1
  visualLandscape: VisualLandscapeMap;     // BRAND #2
  moodboard: Moodboard;                   // BRAND #3
  chromaticSystem: ChromaticSystem;        // BRAND #4
  typographySystem: TypographySystem;      // BRAND #5
  logoRecommendation: LogoTypeRecommendation; // BRAND #6
  logoValidation: LogoValidation;          // BRAND #7
  designTokens: DesignTokens;             // BRAND #8
  motionIdentity: MotionIdentity;         // BRAND #9
  guidelines: BrandGuidelines;            // BRAND #10
}
```

**Validation** : chaque sous-composite complet quand l'outil GLORY correspondant a été exécuté et validé. Séquence respectée — pas de `TypographySystem` sans `ChromaticSystem`. `LSIMatrix` rempli avant ou pendant le moodboard (#3).

---

## N2.16 — SuperfanProfile

> L'unité atomique du mouvement. Chaque SuperfanProfile est un point de données qui alimente le Cult Index.

```typescript
interface SuperfanProfile {                 // Pilier E → Brand OS
  id: string;
  strategyId: string;

  // Identité
  externalId: atom.text_short;              // ID plateforme source
  platform: atom.channel;
  displayName: atom.text_short;
  avatarUrl: atom.url | null;

  // Segmentation Devotion
  segment: SuperfanSegment;                 // T.12
  previousSegment: SuperfanSegment | null;
  promotedAt: atom.date | null;
  segmentHistory: Array<{
    from: SuperfanSegment;
    to: SuperfanSegment;
    date: atom.date;
    trigger: atom.text_short;
  }>;

  // Engagement — métriques cumulées
  engagementDepth: atom.score_100;          // Formule : voir N1.03 atom.engagement_depth
  ugcCount: atom.number;
  defenseCount: atom.number;
  shareCount: atom.number;
  referralCount: atom.number;
  purchaseCount: atom.number;
  eventAttendance: atom.number;
  interactionFrequency: "daily" | "weekly" | "monthly" | "quarterly" | "rare";

  // Valeur économique
  lifetimeValue: atom.currency;
  lastPurchaseDate: atom.date | null;
  averageOrderValue: atom.currency;

  // Psychométrie (optionnel — rempli si enrichi)
  tensionSegment: TensionSegment | null;
  lf8Dominant: atom.lf8[] | null;
  personaMatch: string | null;             // ID du persona D.personas

  // Tags et notes
  tags: atom.text_short[];
  notes: atom.text_medium | null;
}
```

**Formule `engagementDepth`** :

```
engagementDepth = min(100,
  min(40, ugcCount × 10)
  + min(30, defenseCount × 15)
  + min(40, referralCount × 20)
  + min(20, shareCount × 2)
  + min(25, eventAttendance × 5)
  + min(15, purchaseCount × 3)
)
```

Chaque composante cappée individuellement pour éviter qu'un seul comportement écrase les autres.

**Validation** : `segment` correspond aux critères de T.12 (pas de promotion manuelle sans override fixer). `promotedAt` set automatiquement. `personaMatch` → persona.id existant dans D.personas.

---

## N2.17 — CommunitySnapshot

> Instantané de santé communautaire. Pris périodiquement (hebdomadaire ou mensuel). Alimente le Cult Index.

```typescript
interface CommunitySnapshot {               // Pilier E → Signal
  id: string;
  strategyId: string;
  createdAt: atom.date;

  // Taille
  totalCommunity: atom.number;
  bySegment: Record<SuperfanSegment, atom.number>;
  byPlatform: Record<atom.channel, atom.number>;

  // Santé
  retentionRate: atom.percentage;
  activityRate: atom.percentage;
  growthRate: atom.percentage;
  churnRate: atom.percentage;

  // Velocity
  promotions: Array<{ from: SuperfanSegment; to: SuperfanSegment; count: atom.number }>;
  degradations: Array<{ from: SuperfanSegment; to: SuperfanSegment; count: atom.number }>;

  // Engagement agrégé
  totalUGC: atom.number;
  totalDefenses: atom.number;
  totalShares: atom.number;
  totalReferrals: atom.number;
  totalPurchases: atom.number;
  averageEngagementDepth: atom.score_100;

  // Sentiment (optionnel)
  sentimentScore: atom.score_100 | null;
  topMentionThemes: atom.text_short[];
}
```

**Validation** : `bySegment` doit sommer à `totalCommunity`. `retentionRate + churnRate` ≈ 100%. Les `promotions` respectent les transitions (pas de saut de segment).

---

## N2.18 — DevotionSnapshot

> Radar de la Devotion Ladder à un instant T. Distribution d'audience dans les 6 segments + métriques de conversion inter-segments.

```typescript
interface DevotionSnapshot {                // Pilier E → L'Oracle cockpit
  id: string;
  strategyId: string;
  createdAt: atom.date;

  // Distribution
  ladder: Array<{
    segment: SuperfanSegment;
    count: atom.number;
    percentage: atom.percentage;
    trend: "up" | "down" | "stable";
    deltaAbsolute: atom.number;
  }>;

  // Conversions inter-segments
  conversionRates: Array<{
    from: SuperfanSegment;
    to: SuperfanSegment;
    rate: atom.percentage;
    velocity: atom.number;                  // Jours moyens pour la transition
  }>;

  // Métriques dérivées
  superfanRatio: atom.percentage;           // (SUPERFAN + EVANGELIST) / totalCommunity × 100
  pyramidHealth: "inverted" | "heavy_bottom" | "balanced" | "top_heavy";
  bottleneck: SuperfanSegment | null;
  estimatedTimeToNextCultTier: atom.number | null;

  // Lien Cult Index
  cultIndexAtSnapshot: atom.score_100;
  cultTier: CultTier;                       // T.13
}
```

**Formule `pyramidHealth`** :

```
ratio = (SUPERFAN + EVANGELIST) / totalCommunity

ratio < 0.01   → "heavy_bottom"    (moins de 1% — base massive, pas de conversion)
ratio 0.01-0.05 → "balanced"       (pyramide saine)
ratio 0.05-0.15 → "top_heavy"      (communauté mûre, attention renouvellement)
ratio > 0.15    → "inverted"       (plus de superfans que de base — n'attire plus)
```

---

# NIVEAU 3 — COLLECTIONS

Ensembles ordonnés de composites N2. Chaque collection a des règles de cardinalité et de couverture.

| Collection | Composite source | Min | Max | Règle de couverture | Pilier |
|---|---|---|---|---|---|
| Valeurs de marque | N2.01 BrandValue | 3 | 7 | Rangs uniques, tensions cohérentes | A |
| Hero's Journey | N2.02 HeroJourneyAct | 5 | 5 | 5 actes séquentiels, arc émotionnel | A |
| Hiérarchie communautaire | (Devotion Ladder mapping) | 4 | 8 | Correspond aux niveaux T.07 | A |
| Marques ennemies | N2.14 Enemy.enemyBrands | 1 | 10 | ≥1 avec howTheyFight non vide | A |
| Narratifs ennemis | N2.14 Enemy.enemyNarratives | 1 | 10 | ≥1 avec effectiveness ≥ medium | A |
| Personas | N2.04 Persona | 2 | 5 | ≥1 par tier du product ladder, priorités uniques | D |
| Pipeline DA | N2.15 DirectionArtistique (10 sous-composites) | 4 | 10 | Séquence respectée, min #1-#4 pour MVP | D |
| Catalogue produits | N2.05 ProduitService | 1 | 50 | Chaque persona a ≥1 produit | V |
| Packages | N2.06 Package | 0 | 20 | Chaque package référence des produits existants | V |
| Product Ladder | N2.07 ProductLadderTier | 2 | 5 | Tiers ordonnés par prix, couvrent ≥2 personas | V |
| Quadrants valeur/coût | ValeurCoutItem | 1/cat | 10/cat | 8 catégories, toutes représentées | V |
| Touchpoints | N2.08 Touchpoint | 5 | 15 | 3 types représentés, 5 étapes AARRR couvertes | E |
| Rituels | N2.09 Ritual | 3 | 10 | ≥1 always-on + ≥1 cyclique, ≥3 niveaux Ladder | E |
| SuperfanProfiles | N2.16 SuperfanProfile | 0 | ∞ | Flux continu, 6 segments représentés quand totalCommunity > 100 | E |
| CommunitySnapshots | N2.17 CommunitySnapshot | 1/mois | 1/semaine | Au moins 1/mois pour le Cult Index, idéalement 1/semaine | E |
| DevotionSnapshots | N2.18 DevotionSnapshot | 1/mois | 1/semaine | Synchrone avec CommunitySnapshot | E |
| Micro-SWOTs | MicroSwot (de R) | 5 | 26 | ≥1 par pilier A-D-V-E | R |
| Hypothèses | HypothesisValidation (de T) | 5 | 20 | ≥1 par pilier A-D-V-E | T |
| Concurrents | CompetitiveBenchmark (de T) | 3 | 10 | Inclut D.concurrents + ≥1 indirect | T |
| Campagnes annuelles | CampaignBrief (via I) | 6 | 24 | 4 trimestres couverts, ≥1 rituel cyclique | I |
| Actions marketing | N2.10 MarketingAction | 10 | 200 | 3 catégories ATL/BTL/TTL représentées | I/Campaign |
| GLORY Outputs | GloryOutput (existant dans le code) | 0 | ∞ | Par tool, par Strategy — persisté et versionné | Transversal |
| Recommandations | StrategicRecommendation | 8 | 15 | ≥2 de R (mitigations) + ≥2 de T (marché) | S |
| Signaux actifs | N2.13 Signal | 0 | ∞ | Flux continu | R/T |

---

# NIVEAU 4 — COMPOSITES MAJEURS (un par pilier)

Le livrable principal de chaque pilier. C'est ce que le client reçoit.

| Pilier | Composite majeur | Équivalent Big Four | Composé de |
|---|---|---|---|
| **A** | **Manifeste de marque** | Brand Purpose (McKinsey), Brand Belief (Havas) | identite + herosJourney + ikigai + valeurs + hiérarchie + timeline + prophecy + **enemy (N2.14)** + doctrine + mythology |
| **D** | **Brand Book DA** | Brand Identity System (Landor) | personas + paysageConcurrentiel + promesses + positionnement + tonDeVoix + **directionArtistique (N2.15 — pipeline 10 sous-composites + LSI)** + assetsLinguistiques + sacredObjects + proofPoints + symboles |
| **V** | **Offre Commerciale Structurée** | Value Architecture (Bain) | produitsCatalogue + packages + productLadder + 8 quadrants valeur/coût + unitEconomics + budget paramétrique |
| **E** | **Playbook d'Engagement** | Community Playbook (Accenture) | touchpoints + rituels + principes + gamification + aarrr + kpis + sacredCalendar + commandments + ritesDePassage + sacraments |
| **R** | **Recommandations Stratégiques** | Risk Assessment (Deloitte) | microSwots + globalSwot + riskScore + matrix + mitigations + summary |
| **T** | **Étude de Marché Validée** | Market Sizing (BCG) | triangulation + hypothèses + marketReality + tamSamSom + benchmark + bmfScore + recommendations |
| **I** | **Plan de Campagnes** | Integrated Campaign Plan (WPP) | roadmap + campagnes annuelles + budget + team + launchPlan + playbook + sections UPGRADERS (platform, copy strategy, big idea, activation, governance, workstreams, architecture, principles) |
| **S** | **Roadmap Annuelle** | Strategic Roadmap (McKinsey) | synthèse + vision + coherencePiliers + FCS + recommandations + axes + sprint90 + kpiDashboard |

**Validation N4** : chaque composite majeur "complet" quand toutes ses collections N3 constituantes sont complètes selon leurs règles de couverture. Le score structural /25 mesure cette complétude.

---

# NIVEAU 5 — STRATÉGIE (profil ADVE-RTIS)

L'assemblage des 8 composites majeurs constitue la stratégie complète.

```
Stratégie = A(Manifeste) + D(BrandBook) + V(Offre) + E(Playbook) 
          + R(Audit) + T(Étude) + I(Plan) + S(Roadmap)
```

Le score /200 est la mesure de complétude et de qualité de cet assemblage.

**Équivalent marché** : une stratégie complète = contrat one-shot avec McKinsey (positionnement + audit) + Havas (DA + plan de campagnes) + BCG (étude de marché + value architecture) + Accenture (playbook + customer experience). Sauf que c'est un système vivant, pas un PDF.

---

# NIVEAU 6 — MOUVEMENT

> Un mouvement est un déplacement de la marque sur la fenêtre d'Overton.

Le mouvement n'est pas un livrable — c'est le résultat cumulé de l'exécution de la stratégie via les campagnes.

```
Mouvement = Σ Campagnes exécutées × Impact mesuré (feedback loop)
```

Chaque campagne :

```
Brief (N2.12) → Actions (N2.10[]) → Exécution → Mesure (AARRR + signaux) → Recalibration
```

Le mouvement est mesuré par : **Δ Score /200** (progression composite), **Δ Devotion Ladder** (distribution vers les niveaux supérieurs), **Δ Cult Index** (engagement cultuel), **Δ Perception marché** (signaux Tarsis).

### Le Superfan dans le Mouvement

```
Mouvement = Δ Overton
         = f(nombre critique de superfans coordonnés × intensité de comportement)
         
intensité = f(engagementDepth moyen des SUPERFAN+EVANGELIST)
          × f(brandDefenseRate)
          × f(evangelismScore)
          × f(ritualAdoption)
```

Mestor utilise ces métriques pour :

1. **Prédire la suffisance** : assez de superfans pour le prochain déplacement d'Overton ?
2. **Identifier les leviers** : quel comportement est le plus faible (UGC ? defense ? referral ?) → quelle campagne lancer
3. **Mesurer l'impact ennemi** : si le Cult Index baisse alors que les rituels sont maintenus → les narratifs ennemis (N2.14) gagnent → contre-offensive
4. **Timing des campagnes** : superfanVelocity accélère → optimal pour un Overton shift. Décélère → consolider la base.

### Le rôle de Mestor au N6

Mestor ne génère pas le mouvement — il le pilote. Chaque jour, Mestor agrège les signaux R/T actifs, l'état des campagnes, les métriques de la Devotion Ladder, le budget restant, et les événements du calendrier sacré. Et recommande les ajustements : accélérer, pivoter, saisir, réagir. C'est de l'aide à la décision stratégique en continu.

---

# SCORING — Depuis l'ontologie

Le scoring /25 par pilier est basé sur la **complétude structurelle de la composition**, pas sur des longueurs de texte.

**Principes** :

1. Chaque atome N1 correctement rempli (non vide, type valide, dans les contraintes) = 1 unité de complétude
2. Chaque composite N2 correctement assemblé (atomes valides + cross-ref vérifiées) = bonus de composition
3. Chaque collection N3 complète (cardinalité + couverture respectées) = bonus de couverture
4. Le composite majeur N4 est "structurellement complet" quand toutes ses collections N3 sont complètes
5. Le quality modulator (AI) porte sur la **cohérence inter-composites** et la **pertinence stratégique**, pas sur la "qualité du texte"

**Formule révisée** :

```
score_pilier = (atomes_valides / atomes_requis × 15) 
             + (collections_complètes / collections_totales × 7) 
             + (cross_refs_valides / cross_refs_requises × 3)
             × quality_modulator (0.70-1.00)
```

Le quality modulator évalue :
- Pour A-D-V-E : cohérence narrative + spécificité + puissance
- Pour R-T : pertinence analytique (conclusions logiquement dérivées ?)
- Pour I-S : faisabilité + fidélité (plan exécutable et fidèle à la stratégie ?)

### Scoring spécial du Pilier E — Bonus Cult Index

Le pilier E a deux composantes :

**Composante 1 — Design (0-22 points)** : l'architecture d'engagement est-elle bien conçue ? (touchpoints, rituels, gamification, AARRR, KPIs, extensions ARTEMIS)

**Composante 2 — Adoption (0-3 points)** : est-ce que ça fonctionne dans la réalité ?

```
score_E = min(25, score_design + cultIndex_bonus)

score_design = scoring structural actuel (0-22)
cultIndex_bonus = min(3, cultIndex / 33)
```

Effet : playbook parfait + 0 adoption = 22/25. Playbook bon (18/22) + adoption forte (Cult Index 90 → bonus 2.7) = 20.7/25. La preuve de terrain ne remplace pas le design, mais elle le bonifie.

Pour un Quick Intake ou Boot Sequence récent, cultIndex_bonus = 0 (pas encore de données). Le score repose sur le design seul.

### Cult Index — Formule complète

Score composite 0-100 calculé depuis 7 dimensions pondérées :

| # | Dimension | Poids | Formule |
|---|---|---|---|
| 1 | Engagement Depth | 0.25 | `avg(SuperfanProfile.engagementDepth)` |
| 2 | Superfan Velocity | 0.20 | `f(newSuperfans_30j / prev30j)` — 50=stable |
| 3 | Community Cohesion | 0.15 | `retentionRate × 0.6 + activityRate × 0.4` (×100) |
| 4 | Brand Defense Rate | 0.15 | `totalDefenses / (superfanCount × 3)` (×100) |
| 5 | UGC Generation Rate | 0.10 | `(totalUGC / totalCommunity) × 1000 × 2` |
| 6 | Ritual Adoption | 0.10 | `(totalShares / totalCommunity) × 1000` |
| 7 | Evangelism Score | 0.05 | `(evangelistRatio × 500 + referralIntensity × 20) / 2` |

```
cultIndex = clamp(0, 100, round(
  engagementDepth      × 0.25
  + superfanVelocity   × 0.20
  + communityCohesion  × 0.15
  + brandDefenseRate   × 0.15
  + ugcGenerationRate  × 0.10
  + ritualAdoption     × 0.10
  + evangelismScore    × 0.05
))
```

**Poids ajustables** : les poids par défaut sont stockés dans `BrandOSConfig.cultWeights` et ajustables par le fixer. Cas d'usage : B2B où l'UGC est rare mais les défenses (recommandations entre pairs) sont le signal fort.

**Cold start** : avec 0 SuperfanProfile, Cult Index = 0 (GHOST). Le Knowledge Seeder ne seed PAS le Cult Index — c'est une métrique émergente. Le First Value Protocol inclut la création des premiers SuperfanProfile dès connexion des canaux sociaux.

---

# GLORY → PRODUCTION DE VARIABLES PILIER

Chaque outil GLORY consomme des variables pilier et **produit** des variables qui enrichissent ces mêmes piliers ou d'autres.

## Layer BRAND (10 outils) → Pilier D (Direction Artistique)

Formalisé dans N2.15. Chaque outil = un sous-composite de la DA. Pipeline séquentiel #1→#10.

## Layer CR (10 outils) → Production créative (Piliers A+D+E → Campaign deliverables)

| # | Outil | Consomme | Produit | Variable pilier enrichie |
|---|---|---|---|---|
| 1 | `concept-generator` | A (archetype, valeurs), D (positionnement, promesse) | 3-5 pistes créatives (axe, promesse, territoire, score, risque) | I.bigIdea, Campaign.brief.pisteCreative |
| 2 | `script-writer` | A (mythologie), D (ton), E (rituels) | Scripts publicitaires complets | Campaign.actions (ATL_TV, ATL_RADIO, TTL_VIDEO_CONTENT) |
| 3 | `long-copy-craftsman` | A (hero's journey, valeurs), D (ton, positionnement) | Manifestes, brand stories, éditos | A.doctrine.canon, I.brandPlatform |
| 4 | `dialogue-writer` | A (valeurs), D (ton, assetsLinguistiques), E (touchpoints) | Dialogues spots, podcasts, scripts CS | Campaign.actions, E.rituels (scripts rituels humains) |
| 5 | `claim-baseline-factory` | A (noyau), D (promesse, positionnement), V (product ladder) | Claims, baselines, taglines par produit/tier | D.assetsLinguistiques.mantras, V.produitsCatalogue[].lienPromesse |
| 6 | `print-ad-architect` | A (archetype), D (DA, positionnement), V (produits) | Annonces presse structurées | Campaign.actions (ATL_PRESS, ATL_OOH) |
| 7 | `social-copy-engine` | A (valeurs, mythologie), D (ton, vocabulaire), E (rituels, calendrier) | Posts par plateforme | Campaign.actions (TTL_SOCIAL_ORGANIC), E.rituels (always-on) |
| 8 | `storytelling-sequencer` | A (hero's journey), D (personas, ton), E (rites de passage) | Séquences narratives multi-épisodes | Campaign.actions (TTL_CONTENT, TTL_PODCAST), E.rituels (séries) |
| 9 | `wordplay-cultural-bank` | A (valeurs, références culturelles) | Banque de jeux de mots, expressions, références | D.assetsLinguistiques.vocabulaireProprietaire |
| 10 | `brief-creatif-interne` | A+D+V+E (tous piliers core) | Brief créatif structuré complet | N2.12 CampaignBrief (alimentation directe) |

## Layer DC (8 outils) → Direction créative (Piliers A+D → qualité et cohérence)

| # | Outil | Consomme | Produit | Variable pilier enrichie |
|---|---|---|---|---|
| 11 | `campaign-architecture-planner` | A+D+V+E (stratégie complète) | Architecture campagne 360 | I.campaigns.annualCalendar, N2.12 CampaignBrief |
| 12 | `creative-evaluation-matrix` | A (valeurs), D (positionnement, promesse) | Matrice d'évaluation créations | QualityReview, I.guidingPrinciples |
| 13 | `idea-killer-saver` | A (valeurs), D (positionnement) | Analyse kill/save de concepts | Filtrage pré-production |
| 14 | `multi-team-coherence-checker` | A (noyau), D (DA, ton, positionnement) | Audit cohérence cross-équipes | S.coherenceScore, brand-guardian-system |
| 15 | `client-presentation-strategist` | A+D (positionnement, promesse, archetype) | Stratégie de présentation client | I.governance, Pitch delivery |
| 16 | `creative-direction-memo` | A (valeurs), D (DA complète) | Mémo direction créative | N2.15 LSIMatrix, Driver.specs |
| 17 | `pitch-architect` | A+D+V+E (tous piliers core) | Architecture pitch complet | I.launchPlan, Business development |
| 18 | `award-case-builder` | A (mythologie), D (positionnement), E (KPIs) | Case study awards | post-campaign-reader, PR content |

## Layer HYBRID (11 outils) → Opérations (Piliers V+E+I → exécution)

| # | Outil | Consomme | Produit | Variable pilier enrichie |
|---|---|---|---|---|
| 19 | `campaign-360-simulator` | A+D+V (stratégie + budget) | Simulation campagne 360 (reach, conversions, ROI, scénarios) | I.budgetAllocation, I.campaigns |
| 20 | `production-budget-optimizer` | A (scope) | Budget production optimisé | I.budgetAllocation.production, Campaign.budgetAllocation |
| 21 | `vendor-brief-generator` | A+D (DA, ton, positionnement) | Brief fournisseur structuré | Mission.brief (Guilde) |
| 22 | `production-devis-generator` | A (specs) | Devis production détaillé | Serenite (facturation), Mission.budget |
| 23 | `content-calendar-strategist` | A+D+E (rituels, touchpoints, calendrier sacré) | Calendrier éditorial | I.campaigns, E.rituels (matérialisation) |
| 24 | `approval-workflow-manager` | (aucun pilier) | Workflow approbation | I.governance |
| 25 | `brand-guardian-system` | A+D (DA, ton, valeurs, positionnement) | Garde-fou de marque | I.guidingPrinciples, QualityReview |
| 26 | `client-education-module` | (aucun pilier) | Module éducatif client | L'Académie (onboarding) |
| 27 | `benchmark-reference-finder` | A+D (positionnement, DA, archetype) | Références créatives contextualisées | SESHAT fallback, brief enrichissement |
| 28 | `post-campaign-reader` | A+D+E (objectifs, KPIs, résultats) | Bilan campagne structuré | R.microSwots, T.hypothesisValidation, Knowledge Graph |
| 29 | `digital-planner` | D+E (personas, touchpoints, canaux) | Plan média digital | I.activationDispositif.paid + .owned, Campaign.budgetAllocation.media |

## Synthèse : ce que chaque pilier reçoit de GLORY

| Pilier | Outils enrichissants | Variables enrichies |
|---|---|---|
| **A** | #3 (long-copy → mythologie), #9 (wordplay → banque culturelle) | A.doctrine.canon, A.livingMythology |
| **D** | #1-#10 BRAND (DA complète), #5 (claims → mantras), #9 (wordplay → vocabulaire), #16 (creative memo → LSI) | D.identiteVisuelle (→ N2.15), D.assetsLinguistiques, D.promessesDeMarque |
| **V** | #5 (claims → lien promesse par produit), #22 (devis → coûts) | V.produitsCatalogue[].lienPromesse, V.coutMarqueTangible |
| **E** | #7 (social copy → rituels), #8 (storytelling → séries), #23 (calendrier → rituels) | E.rituels (contenu), E.sacredCalendar (activation) |
| **R** | #28 (post-campaign → signaux performance) | R.microSwots (via Signals) |
| **T** | #28 (post-campaign → validation hypothèses) | T.hypothesisValidation |
| **I** | #1 (concepts → big idea), #10 (brief), #11 (architecture → calendrier), #19 (simulation → budget), #20 (budget prod), #23 (calendrier éditorial), #24 (workflow → governance), #25 (guardian → principles), #29 (digital plan → activation) | I.bigIdea, I.campaigns, I.budgetAllocation, I.governance, I.guidingPrinciples, I.activationDispositif |
| **S** | #14 (cohérence → coherenceScore), #17 (pitch → présentation exécutive) | S.scoreCoherence, S.syntheseExecutive |

---

*Fin de l'Annexe H — Ontologie des Variables du Système ADVE-RTIS*
