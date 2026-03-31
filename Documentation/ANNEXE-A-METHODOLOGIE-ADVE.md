# ANNEXE A — Méthodologie ADVE-RTIS (Spécification complète)

> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md § 1.3

---

## A.1 Vue d'ensemble

L'ADVE-RTIS est une méthodologie propriétaire de cult marketing en 8 piliers. Elle est le cœur du protocole LaFusée. Chaque pilier pose une question fondamentale et produit un contenu structuré spécifique.

Les piliers sont **séquentiels** : A → D → V → E (cœur cult marketing) → R → T → I → S (validation et exécution). Chaque pilier peut consommer les données des piliers précédents via le cascade pattern.

---

## A.2 Pilier A — Authenticité ("Qui êtes-vous vraiment ?")

### Objectif
Construire l'identité profonde de la marque : son mythe fondateur, ses valeurs, sa structure communautaire, son récit.

### Contenu structuré (Zod schema)

| Section | Champs | Description |
|---------|--------|-------------|
| `identite` | archetype, founderCitation, identityCore | Archétype de marque + citation fondatrice + cœur identitaire |
| `herosJourney` | 5 actes : origins, call, trials, transformation, revelation | Voyage du héros de la marque en 5 actes narratifs |
| `ikigai` | love, competence, worldNeed, remuneration | Ikigai de marque (ce qu'on aime, ce qu'on sait faire, ce dont le monde a besoin, ce qui paie) |
| `valeurs` | Array de { value, ranking, justification } | Valeurs classées avec justification |
| `hierarchieCommunautaire` | Array de { level, name, description, privileges } | Niveaux de la communauté (fidèles, initiés, évangélistes...) |
| `timelineNarrative` | origins, growth, pivot, future | Arc narratif temporel de la marque |

### Extensions ARTEMIS (FW-20 Movement Architecture)

| Section | Champs | Description |
|---------|--------|-------------|
| `prophecy` | worldTransformed, pioneers, urgency, horizon | La prophétie du mouvement : quel monde quand on gagne ? |
| `enemy` | existentialForce, manifestations, moralDimension | L'ennemi à vaincre (force existentielle, pas un concurrent) |
| `doctrine` | dogmas (croyances contre-intuitives), principles, practices | La doctrine du mouvement |
| `livingMythology` | canon (founding myth + chapters), extensionRules, captureSystem | Mythologie vivante avec règles d'extension |

### Variables clés extraites
- `interview.A1` → Vision de marque
- `A.identite` → Identité consolidée
- `A.valeurs` → Valeurs ordonnées
- `A.archetype` → Archétype dominant

---

## A.3 Pilier D — Distinction ("Pourquoi vous et pas un autre ?")

### Objectif
Définir le positionnement unique, l'identité visuelle, la voix, les dialectes propriétaires.

### Contenu structuré

| Section | Champs | Description |
|---------|--------|-------------|
| `personas` | Array de { demographics, psychographics, motivations, barriers, priority } | Personas cibles avec profils complets |
| `paysageConcurrentiel` | competitors (forces/faiblesses/SOV), competitiveAdvantages | Paysage concurrentiel + avantages compétitifs |
| `promessesDeMarque` | masterPromise, subPromises[] | Promesse maîtresse + sous-promesses |
| `positionnement` | statement (string) | Positionnement en une phrase |
| `tonDeVoix` | personality, whatWeSay, whatWeDontSay | Tonalité et personnalité de marque |
| `identiteVisuelle` | artisticDirection, colorPalette, mood | Direction artistique initiale |
| `assetsLinguistiques` | mantras, proprietaryVocabulary | Actifs linguistiques propriétaires |

### Extensions ARTEMIS

| Section | Champs | Description |
|---------|--------|-------------|
| `sacredObjects` | Array de { name, form, narrative, stage, socialSignal } | Objets sacrés de la marque (artefacts symboliques) |
| `proofPoints` | Array de { type, claim, evidence, source } | Preuves quantifiées des revendications |
| `symboles` | Array de { symbol, meanings, usageContexts } | Symboles de marque avec significations |

---

## A.4 Pilier V — Valeur ("Que promettez-vous au monde ?")

### Objectif
Structurer l'économie de la marque : catalogue produit, architecture de prix, unit economics, promesse de valeur.

### Contenu structuré (V2 — Atomisé)

| Section | Champs | Description |
|---------|--------|-------------|
| `produitsCatalogue` | Array de ProduitService | Catalogue produit complet avec prix, coûts, segments, leviers psychologiques, mapping Maslow, score émotionnel ADVE |
| `productLadder` | Array de { tier, prix, description, cible, produitIds } | Échelle de prix par palier |
| `valeurMarque` | tangible[], intangible[] | Ce que la marque vaut (tangible et intangible) |
| `valeurClient` | fonctionnels[], emotionnels[], sociaux[] | Ce que le client reçoit |
| `coutMarque` | capex, opex, coutsCaches[] | Ce que la marque coûte |
| `coutClient` | frictions[] (friction + solution) | Ce que le client paie (au-delà du prix) |
| `cac`, `ltv`, `ltvCacRatio` | Float | Unit economics |
| `pointMort`, `marges`, `margeNette` | Mixed | Seuils de rentabilité |
| `roiEstime`, `paybackPeriod`, `dureeLTV` | Mixed | Projections de retour |

### Structure ProduitService (atomisé)

```typescript
{
  id: string,
  nom: string,
  prix: number,
  cout: number,
  description: string,
  categorie: string,
  segmentCible: string,
  phaseLifecycle: "introduction" | "growth" | "maturity" | "decline",
  leviersPsychologiques: string[], // Levier Cialdini, etc.
  maslowMapping: string,           // Niveau Maslow
  nanoBananaPrompt: string,         // Prompt pour génération visuelle
  elasticitePercue: "rigid" | "moderate" | "elastic",
  saisonalite: string,
  cannibalisationRisque: "low" | "medium" | "high",
  scoreEmotionnelADVE: number,      // 0-100
  contraintesReglementaires: string,
  mixMarketing: { product, price, place, promotion }
}
```

---

## A.5 Pilier E — Engagement ("Comment créer la dévotion ?")

### Objectif
Construire les mécaniques de culte : rituels, touchpoints, gamification, ladder de dévotion, funnel AARRR.

### Contenu structuré

| Section | Champs | Description |
|---------|--------|-------------|
| `touchpoints` | Array de { canal, type [physique/digital/humain], role, priority } | Points de contact classés par type et priorité |
| `rituels` | Array de { nom, type [always-on/cyclique], frequence, description } | Rituels de marque (always-on ou cycliques) |
| `principesCommunautaires` | principles[], taboos[] | Principes + tabous communautaires |
| `gamification` | Array de { niveau, nom, condition, recompense } | Gamification par niveau |
| `aarrr` | acquisition, activation, retention, revenue, referral | Funnel AARRR complet |
| `kpis` | Array de { variable, nom, cible, frequence } | KPIs d'engagement |

### Extensions ARTEMIS (Cult Marketing)

| Section | Champs | Description |
|---------|--------|-------------|
| `sacredCalendar` | Array de { nom, date, type, signification, rituel } | Calendrier sacré de la marque |
| `commandments` | Array de { numero, commandement, justification, consequence } | Les 10 commandements de la marque |
| `ritesDePassage` | Array de 5 stades { stade, rituelEntree, symbolesStatut, recompenses, prochainPas } | Rites de passage entre niveaux de dévotion |
| `sacraments` | Array de { nom, etapeAarrr, trigger, action, reward, kpi } | Sacrements : le funnel AARRR reformulé en rituels |

---

## A.6 Pilier R — Risk ("Quels sont vos angles morts ?")

### Objectif
Audit des risques : micro-SWOT par variable, SWOT global, matrice probabilité-impact, plan de mitigation.

### Contenu structuré

| Section | Champs | Description |
|---------|--------|-------------|
| `microSwots` | Array de { variableId, strengths, weaknesses, opportunities, threats, riskLevel, commentary } | SWOT par variable de marque |
| `globalSwot` | strengths[], weaknesses[], opportunities[], threats[] | SWOT global agrégé |
| `riskScore` | 0-100 | Score de risque global |
| `riskScoreJustification` | string | Justification du score |
| `probabilityImpactMatrix` | Array de { risk, probability, impact, priority 1-5 } | Matrice probabilité × impact |
| `mitigationPriorities` | Array de { risk, action, urgency, effort } | Plan de mitigation priorisé |
| `summary` | string | Synthèse exécutive du pilier R |

### Cascade
Le pilier R déclenche un cascade automatique vers T → I → S quand un risque high severity est identifié.

---

## A.7 Pilier T — Track ("Comment mesurez-vous le succès ?")

### Objectif
Validation marché : triangulation des données, test d'hypothèses, TAM/SAM/SOM, benchmark concurrentiel, Brand-Market Fit.

### Contenu structuré

| Section | Champs | Description |
|---------|--------|-------------|
| `triangulation` | internalData, marketData, customerData, synthesis | Triangulation des sources de données |
| `hypothesisValidation` | Array de { variableId, hypothesis, status [validated/invalidated/to_test], evidence } | Validation d'hypothèses stratégiques |
| `marketReality` | macroTrends[], weakSignals[], emergingPatterns[] | Réalité marché (tendances, signaux faibles, patterns) |
| `tamSamSom` | TAM (value+description), SAM, SOM, methodology | Sizing marché |
| `competitiveBenchmark` | Array de { competitor, strengths, weaknesses, marketShare } | Benchmark concurrentiel |
| `brandMarketFitScore` | 0-100 | Score Brand-Market Fit (BMF) |
| `brandMarketFitJustification` | string | Justification du BMF |
| `strategicRecommendations` | string[] | Recommandations stratégiques issues de la validation |
| `summary` | string | Synthèse exécutive du pilier T |

### Side-effects
La génération du pilier T déclenche `syncTrackToMarketContext()` qui synchronise les concurrents et opportunités vers le module Tarsis (market-context router).

---

## A.8 Pilier I — Implementation ("De la stratégie à l'action ?")

### Objectif
Plan d'exécution complet : roadmap, campagnes, budget, équipe, playbook opérationnel. C'est le pilier le plus massif.

### Contenu structuré (13 sections)

| # | Section | Description |
|---|---------|-------------|
| 1 | `brandIdentity` | Archétype, purpose, vision, values, narrative |
| 2 | `positioning` | Statement, differentiators, tone, personas, competitors |
| 3 | `valueArchitecture` | Product ladder, value proposition, unit economics |
| 4 | `engagementStrategy` | Touchpoints, rituels, AARRR, KPIs |
| 5 | `riskSynthesis` | Risk score, global SWOT, top risks |
| 6 | `marketValidation` | BMF score, TAM/SAM/SOM, trends, recommendations |
| 7 | `strategicRoadmap` | Sprint 90 jours (actions + owner + KPI), année 1, vision 3 ans |
| 8 | `campaigns` | Calendrier annuel (campagnes mensuelles avec budget, canaux, métriques), templates, plan d'activation 4 phases |
| 9 | `budgetAllocation` | Enveloppe globale, par poste, par phase, projections ROI |
| 10 | `teamStructure` | Équipe actuelle, recrutements, partenaires externes |
| 11 | `launchPlan` | Phases, milestones |
| 12 | `operationalPlaybook` | Rythmes quotidien/hebdo/mensuel, escalade, stack outils |
| 13 | **UPGRADERS sections** | Brand Platform, Copy Strategy, Big Idea, Activation Dispositif, Governance, Workstreams, Brand Architecture, Guiding Principles |

### Section UPGRADERS (13.*)

| Sous-section | Champs |
|-------------|--------|
| `brandPlatform` | purpose, vision, mission, values, personality, territory, tagline |
| `copyStrategy` | promise, RTB, consumerBenefit, tone, constraint |
| `bigIdea` | concept, mechanism, insightLink, déclinaisons |
| `activationDispositif` | owned/earned/paid/shared channels + parcoursConso |
| `governance` | Comités (stratégique/pilotage/opérationnel), processus de validation, turnaround times |
| `workstreams` | Array de { name, objectif, livrables, fréquence, kpis } |
| `brandArchitecture` | model, hierarchy, coexistence rules |
| `guidingPrinciples` | dos, don'ts, principes de communication, critères de cohérence |

### Side-effects
La génération du pilier I déclenche `seedBudgetTiersIfNeeded()` qui crée les 5 tiers budgétaires par défaut (MICRO, STARTER, IMPACT, CAMPAIGN, DOMINATION).

---

## A.9 Pilier S — Stratégie / Synthèse ("Comment assembler le tout ?")

### Objectif
Synthèse exécutive de l'ensemble de la stratégie. Score de cohérence global.

### Contenu structuré

| Section | Champs | Description |
|---------|--------|-------------|
| `syntheseExecutive` | string | Narrative de synthèse complète |
| `visionStrategique` | string | Vision stratégique consolidée |
| `coherencePiliers` | Array de { pilier, contribution, articulation } | Comment chaque pilier contribue |
| `facteursClesSucces` | string[] | Facteurs clés de succès |
| `recommandationsPrioritaires` | Array de { action, priorite 0-9, impact, delai } | Recommandations priorisées |
| `scoreCoherence` | 0-100 | Score de cohérence inter-piliers |
| `axesStrategiques` | Array de { axe, description, piliersLies, kpisCles } | Axes stratégiques transversaux |
| `sprint90Recap` | actions[] + summary | Récap du sprint 90 jours |
| `campaignsSummary` | totalCampaigns, highlights, budgetTotal | Résumé campagnes |
| `kpiDashboard` | Array de { pilier, kpi, cible, statut } | Tableau de bord KPI |

---

## A.10 Cycle de génération

```
Interview Data (user input)
      ↓
   Pilier A (Authenticité) ─── cascade →
   Pilier D (Distinction)  ─── cascade →
   Pilier V (Valeur)       ─── cascade →
   Pilier E (Engagement)   ─── cascade →
      ↓
   [Market Study optionnel — collecte données externes]
      ↓
   Pilier R (Risk audit)   ─── cascade → T, I, S
   Pilier T (Track)        ─── sync → Tarsis (market context)
   Pilier I (Implementation) ─── seed → Budget Tiers
   Pilier S (Synthèse)     ─── fin → phase "complete"
```

### Chaque génération de pilier déclenche (pipeline-orchestrator) :
1. Phase advancement (si applicable)
2. Clear staleness flag
3. Recalculate all scores (coherence, risk, BMF, invest)
4. Extract variables vers BrandVariable store
5. Side-effects pilier-spécifiques (T: sync market context, I: seed budget tiers)
6. Compute all cockpit widgets
7. Propagate staleness aux piliers dépendants

---

## A.11 Scoring ADVE /200 (nouveau — Industry OS)

### AdvertisVector

```typescript
{
  a: number,  // 0-25 — Authenticité
  d: number,  // 0-25 — Distinction
  v: number,  // 0-25 — Valeur
  e: number,  // 0-25 — Engagement
  r: number,  // 0-25 — Risk (inversé : 25 = peu de risque)
  t: number,  // 0-25 — Track
  i: number,  // 0-25 — Implementation
  s: number,  // 0-25 — Stratégie
  composite: number,  // 0-200 (somme des 8)
  confidence: number  // 0-1 (fiabilité du scoring)
}
```

### Classification

| Score | Classification | Description |
|-------|---------------|-------------|
| 0-80 | **Zombie** | Invisible, pas d'identité distincte |
| 81-120 | **Ordinaire** | Fonctionnel mais interchangeable |
| 121-160 | **Forte** | Reconnue et respectée |
| 161-180 | **Culte** | Adorée, inspire la dévotion |
| 181-200 | **Icône** | Légendaire, référence mondiale |

### Relation avec les scores existants

| Score existant | Pilier source | Contribution au /200 |
|---------------|--------------|---------------------|
| coherenceScore (0-100) | S | Normalisé vers s: 0-25 |
| riskScore (0-100) | R | Inversé et normalisé vers r: 0-25 |
| bmfScore (0-100) | T | Normalisé vers t: 0-25 |
| investScore (0-100) | I | Normalisé vers i: 0-25 |
| Cult Index (0-100) | E | Normalisé vers e: 0-25 |
| Pillar A quality | A | AI-assessed → a: 0-25 |
| Pillar D quality | D | AI-assessed → d: 0-25 |
| Pillar V quality | V | AI-assessed → v: 0-25 |
