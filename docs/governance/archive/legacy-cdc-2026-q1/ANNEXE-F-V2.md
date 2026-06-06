# ANNEXE F — Mécanismes de Résilience au Build

**Version** : 2.0
**Date** : 24 mars 2026
**Objet** : 5 mécanismes absents du cahier v2.1 qui affectent la viabilité du produit pendant les 12 premiers mois d'exploitation. Chaque mécanisme est spécifié au même niveau de détail que les annexes A-E : modèle de données, services, routing, critères d'acceptation, phase de build.

> Fondation : ANNEXE H (ontologie) + ANNEXE G v2 (scoring)
> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md §8 (tâches additionnelles par phase)

---

## Changements v1 → v2

- **F.1** : la rubrique de scoring détaillée par pilier a été supprimée (absorbée par Annexe G v2). F.1 ne conserve que le mécanisme structural × modulator, la logique Quick Intake fourchette, et les critères d'acceptation de reproductibilité.
- **F.2** : ajout du DevotionSnapshot initial au micro value report (J+14).
- **F.3** : les seeds du Knowledge Seeder utilisent les types ontologiques de H.
- **F.4** : refonte complète. Le questionnaire mensuel produit des Signals N2.13 structurés qui ciblent des composites spécifiques et déclenchent des recalculs typés (Cult Index, DevotionSnapshot, scores pilier).
- **F.5** : inchangé.

---

## F.1 Scoring /200 Déterministe — Mécanisme Structural × Modulator

### F.1.1 Le problème

Le cahier (§4.1) définit l'`advertis-scorer` comme "AI-assisted via Mestor." Un scoring purement IA a un problème de reproductibilité : la même marque passée deux fois produit des scores différents. Un score non-déterministe ne peut pas être un standard d'industrie.

### F.1.2 Le mécanisme

Le scoring de chaque pilier est **hybride** :

```
score_pilier = score_structural × quality_modulator
```

Le **score structural** est déterministe : il vérifie la complétude des composites N2, la couverture des collections N3, et la validité des cross-refs inter-piliers. Il est calculé par du code, sans LLM. Deux appels avec les mêmes données produisent le même résultat.

Le **quality modulator** (0.70–1.00) est AI-assessed : il évalue la cohérence, la spécificité, et la pertinence du contenu. Il ne peut pas faire varier le score de plus de 30%.

La spec complète des rubriques structurelles et des quality modulators par pilier est dans l'**Annexe G v2**.

### F.1.3 Quick Intake : fourchette au lieu de score point

Le Quick Intake a une confidence basse (données partielles, pas de PillarContent structuré). L'affichage reflète cette incertitude.

| Confidence | Affichage | Exemple |
|---|---|---|
| < 0.5 | Fourchette large : `score ± 15%` | "85-115/200, classification probable : Ordinaire" |
| 0.5–0.7 | Fourchette resserrée : `score ± 8%` | "92-108/200" |
| ≥ 0.7 | Score point | "100/200 — Ordinaire" |

Le Quick Intake produit une confidence entre 0.3 et 0.5. Seul un Boot Sequence complet produit une confidence > 0.7. Un Boot + MarketStudy + ARTEMIS + GLORY BRAND produit une confidence 0.9-1.0.

### F.1.4 Implémentation

**Service** : `advertis-scorer` — mode `structural` (déterministe) + mode `quality` (AI). Le mode structural consomme les composites N2 et les collections N3 de l'Annexe H. Le mode quality appelle Mestor avec le prompt du modulator spécifique à chaque pilier (défini dans G v2).

**Stockage** : enrichir `AdvertisVector` :

```typescript
export const AdvertisVectorSchema = z.object({
  // scores par pilier
  a: z.number(), d: z.number(), v: z.number(), e: z.number(),
  r: z.number(), t: z.number(), i: z.number(), s: z.number(),
  composite: z.number(), // somme /200
  confidence: z.number(), // 0.0-1.0
  // breakdown par pilier
  breakdown: z.record(z.object({
    structural: z.number(),
    modulator: z.number(),
    atomesValides: z.number(),
    atomesRequis: z.number(),
    collectionsCompletes: z.number(),
    collectionsTotales: z.number(),
    crossRefsValides: z.number(),
    crossRefsRequises: z.number(),
  })).optional(),
});
```

**Phase** : Phase 0 (intégré au build de l'`advertis-scorer`).

### F.1.5 Critères d'acceptation

- [ ] Le scoring structural est reproductible : deux appels avec le même PillarContent produisent le même score structural (variance = 0)
- [ ] Le quality modulator varie de ±1 point max entre deux appels avec le même contenu
- [ ] Le breakdown (structural + modulator + compteurs) est stocké dans l'AdvertisVector
- [ ] Le quality modulator ne peut jamais faire descendre le score en dessous de 70% du structural
- [ ] Le Quick Intake affiche une fourchette quand confidence < 0.7
- [ ] Le Quick Intake affiche un score point quand confidence ≥ 0.7
- [ ] Le scoring utilise les types ontologiques de l'Annexe H (composites N2, collections N3, cross-refs) — pas des longueurs de texte

---

## F.2 First Value Protocol — Séquence Post-Onboarding

### F.2.1 Le problème

Le cahier couvre le Boot Sequence (entrée) et le Value Report mensuel (récurrence). Il ne couvre pas les semaines 1-4 entre les deux. Si la première mission n'est pas dispatchée dans les 72h, le client perçoit qu'il a payé pour un document, pas pour un système.

### F.2.2 Mécanisme : Process TRIGGERED "first_value"

Déclenché par `BootSequenceCompleted` (ou `QuickIntakeConverted`).

**Playbook JSON** :

```json
{
  "trigger": "boot_sequence_completed",
  "steps": [
    {
      "day": 0,
      "action": "deliver_diagnostic_report",
      "description": "Brand Diagnostic Report exporté et livré au client via cockpit. Inclut le score /200 avec breakdown par pilier et le radar 8 piliers.",
      "auto": true
    },
    {
      "day": 1,
      "action": "activate_priority_drivers",
      "description": "Les 2-3 drivers prioritaires (identifiés pendant le boot) sont activés. Le driver-engine génère les specs initiales. Le fixer valide.",
      "auto": false,
      "requires_fixer": true
    },
    {
      "day": 2,
      "action": "dispatch_first_mission",
      "description": "Première mission créée — le GLORY tool le plus rapide pour le driver principal. Brief pré-rempli par le driver avec les composites N2 du pilier concerné injectés dans le contexte.",
      "auto": true,
      "glory_tool_selection": "fastest_for_primary_driver"
    },
    {
      "day": 5,
      "action": "first_delivery",
      "description": "SLA: le créatif a livré, le QC est passé, le livrable est dans le cockpit client.",
      "auto": false,
      "sla_alert": true
    },
    {
      "day": 7,
      "action": "generate_guidelines",
      "description": "Guidelines vivantes générées via brand-guidelines-generator (GLORY BRAND #10) et publiées dans le cockpit. Si le pipeline BRAND n'est pas complet, génération partielle avec les sous-composites disponibles (#1-#4 minimum).",
      "auto": true
    },
    {
      "day": 14,
      "action": "micro_value_report",
      "description": "Rapport de démarrage : ce qui s'est passé en 2 semaines, premiers signaux, prochaines actions. Inclut le premier DevotionSnapshot (N2.18) si des canaux sociaux sont connectés — même si c'est 99% AUDIENCE, ça établit la baseline mesurable.",
      "auto": true
    },
    {
      "day": 30,
      "action": "first_full_value_report",
      "description": "Premier Value Report mensuel complet via value-report-generator. Inclut Δ score /200 depuis le boot, premier CommunitySnapshot (N2.17), et Cult Index initial (même si = 0).",
      "auto": true
    }
  ]
}
```

### F.2.3 Implémentation

**Modèle** : instance de `Process` (existant, §2.2.7). Pas de nouveau modèle.

**Service** : enrichir le `process-scheduler` avec la capacité d'exécuter un playbook séquentiel. Chaque step a un `day` relatif au trigger. Les steps `auto: true` s'exécutent sans intervention. Les steps `auto: false` créent une alerte dans la Fixer Console.

**Micro Value Report (J+14)** : template léger du `value-report-generator`. Sections : résumé des actions, premiers signaux, prochaines étapes, score /200 actuel avec Δ depuis le boot, **DevotionSnapshot initial** (distribution de la communauté dans les 6 segments de T.07 même si quasi-vide — c'est la baseline).

**Sélection du premier GLORY tool** : `driver-engine.getSuggestedFirstTool(driverId)` retourne le GLORY tool le plus adapté pour une première livraison rapide. Logique : parmi les tools liés au driver (via DriverGloryTool), sélectionner celui de la liste de priorité `["claim-baseline-factory", "social-copy-engine", "brand-guardian-system", "content-calendar-strategist"]`.

### F.2.4 Phase de build

**Phase 4** (avec le Boot Sequence et le Value Report). Exception : mode dégradé avant Phase 4 = checklist manuelle dans la Fixer Console.

### F.2.5 Critères d'acceptation

- [ ] Un Boot Sequence complété crée automatiquement un Process "First Value Protocol" lié à la Strategy
- [ ] Le scheduler exécute les steps auto aux jours prévus
- [ ] Les steps nécessitant le fixer génèrent des alertes dans la Fixer Console
- [ ] Le step `dispatch_first_mission` crée une Mission avec un brief pré-rempli via le driver principal, injectant les composites N2 pertinents dans le contexte du brief
- [ ] Le micro value report (J+14) inclut le premier DevotionSnapshot (N2.18) si des canaux sociaux sont connectés
- [ ] Le Value Report (J+30) inclut le Δ score /200, le CommunitySnapshot (N2.17), et le Cult Index initial
- [ ] Le fixer voit la progression du First Value Protocol par client dans la Console

---

## F.3 Bootstrap des Systèmes à Cold Start

### F.3.1 Le problème

Trois systèmes ont un cold start : Knowledge Graph (benchmarks vides), SESHAT (non intégré en Phase 0-1), Guilde (pas d'historique).

### F.3.2 Mécanisme A : Knowledge Seeder

L'expertise d'Alexandre est injectée dans le Knowledge Graph au lancement.

**Service** : `knowledge-seeder` dans `server/services/knowledge-graph/seeder.ts`

**Fonctions avec types ontologiques** :

```typescript
seedBenchmark(
  sector: atom.sector,        // → H:T.09
  market: atom.market,        // → H:T.11
  pillar: PillarType,
  data: {
    metric: string,           // ex: "cac_moyen"
    value: atom.currency,     // ex: 50000 XAF
    unit: string,
    confidence: atom.percentage, // 0-100
    sampleDescription: string,  // "10+ ans expérience marchés FMCG Afrique Centrale"
  }
)

seedFrameworkRanking(
  sector: atom.sector,
  frameworkId: string,
  successScore: atom.score_100
)

seedCampaignTemplate(
  sector: atom.sector,
  market: atom.market,
  campaignType: string,
  data: {
    actions: Array<{type: atom.action_type, category: atom.action_category}>, // → H:T.06
    budgetRatio: atom.percentage,  // % du budget total
    aarrStage: atom.aarrr_stage,  // → H:T.05
    typicalKpis: string[],
  }
)
```

Chaque seed est un `KnowledgeEntry` avec `sourceHash: "expert_seed"` et `sampleSize` conventionnel de 10.

**Règle de remplacement** : quand le `knowledge-aggregator` (Phase 5) produit une entrée avec le même contexte (sector + market + pillar + metric) et que le `sampleSize` réel ≥ 5, le seed est archivé et remplacé. Le système s'auto-corrige.

**Seuils d'affichage** :

| sampleSize | Label | Affichage |
|---|---|---|
| < 5 (dont seeds) | "Estimation experte" | Fixer Console uniquement, avec avertissement |
| 5-14 | "Donnée préliminaire" | Fixer Console + Client Portal avec mention |
| ≥ 15 | "Benchmark vérifié" | Partout sans avertissement |

### F.3.3 Mécanisme B : SESHAT Fallback via GLORY

En attendant SESHAT (Phase 2), les briefs manquent de références créatives.

```typescript
async function enrichBriefWithReferences(brief: Brief, driver: Driver): Promise<Brief> {
  try {
    const refs = await seshatBridge.getReferences({
      advertisVector: brief.advertis_vector,
      channel: driver.channel,    // → H:T.08
      sector: brief.strategy.sector, // → H:T.09
    });
    return { ...brief, references: refs };
  } catch {
    const gloryRefs = await generateGloryOutput(
      brief.strategyId,
      "benchmark-reference-finder", // GLORY HYBRID #27
      { channel: driver.channel, pillarFocus: brief.dominantPillar }
    );
    return { ...brief, references: gloryRefs, referenceSource: "glory_fallback" };
  }
}
```

Le champ `referenceSource` ("seshat" | "glory_fallback") trace la provenance.

### F.3.4 Mécanisme C : Seeding initial de la Guilde

Le fixer invite les premiers créatifs (10-15) avec un tier calibré manuellement.

```typescript
invite: roleProtectedProcedure(["ADMIN"])
  .input(z.object({
    email: z.string().email(),
    displayName: z.string(),
    initialTier: GuildTierEnum.optional().default("APPRENTI"), // → H:atom.guild_tier
    specializations: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => { /* ... */ })
```

**Période de grâce** : le `tier-evaluator` ne peut pas rétrograder un créatif seedé pendant ses 5 premières missions.

### F.3.5 Phases et critères d'acceptation

| Mécanisme | Phase |
|---|---|
| Knowledge Seeder | Phase 0 |
| SESHAT Fallback | Phase 1 |
| Guild Seeding | Phase 2 |

- [ ] Le fixer peut créer des KnowledgeEntry seeds avec types ontologiques (atom.currency, atom.sector, atom.action_type)
- [ ] Les seeds sont marquées `sourceHash: "expert_seed"` et distinguées visuellement
- [ ] Quand une donnée réelle avec sampleSize ≥ 5 existe, le seed est archivé
- [ ] Les benchmarks affichent le label approprié selon le sampleSize
- [ ] En l'absence de SESHAT, le brief contient des références via GLORY #27
- [ ] Le champ `referenceSource` trace la provenance
- [ ] Le fixer peut inviter des créatifs avec un tier initial supérieur à APPRENTI
- [ ] Période de grâce de 5 missions avant rétrogradation possible

---

## F.4 Feedback Loop Structuré — Mode Dégradé Phases 0-1

### F.4.1 Le problème

Le cahier câble les sources automatiques en Phase 1 (SocialPost → Signal, MediaPerformanceSync → CampaignAmplification, PressClipping → Signal). Pendant la Phase 0 et le début de Phase 1, le score /200 est statique. Le Value Report dit "aucun changement." Le client perçoit un produit mort.

### F.4.2 Mécanisme : collecte structurée mensuelle via Signals N2.13

Un Process BATCH mensuel par Brand Instance déclenche une session de collecte de feedback guidée par Mestor, remplie par le fixer. Chaque réponse produit un **Signal structuré** (→ H:N2.13) qui cible un composite spécifique et déclenche un recalcul typé.

**Modèle** : instance de `Process` (existant).

```prisma
Process {
  type: BATCH
  name: "Monthly Feedback Collection"
  strategyId: [client]
  frequency: "0 9 1 * *"  // 1er du mois à 9h
  status: RUNNING
  priority: 3
}
```

### F.4.3 Questionnaire structuré par composite

Mestor génère le questionnaire en ciblant les composites les plus stale de chaque pilier. Les questions ne sont plus génériques ("comment va le pilier E ?") — elles visent des variables spécifiques de l'ontologie.

**Structure d'une question** :

```typescript
interface FeedbackQuestion {
  pillar: PillarType;
  targetComposite: string;              // Ex: "E.rituels", "A.enemy", "V.produitsCatalogue"
  targetAtom: string | null;            // Ex: "ritualAdoption", "ugcCount" — si null, question sur le composite entier
  question: string;                     // Générée par Mestor selon le contexte
  responseType: "QUANTITATIVE" | "QUALITATIVE" | "BOOLEAN";
  quantitativeSpec?: {
    metric: string;                     // "ugc_count_month", "new_superfans_month", "sales_volume"
    unit: string;                       // "count", "percentage", "currency"
    previousValue: number | null;       // Valeur précédente pour comparaison
  };
}
```

**Exemples de questions par pilier** :

| Pilier | Composite ciblé | Question | Type | Atome alimenté |
|---|---|---|---|---|
| E | SuperfanProfile agrégé | "Combien de contenus créés par la communauté ce mois ?" | QUANTITATIVE (count) | → ugcCount → ugcGenerationRate → Cult Index |
| E | SuperfanProfile agrégé | "Combien de fois la marque a-t-elle été défendue publiquement ce mois ?" | QUANTITATIVE (count) | → defenseCount → brandDefenseRate → Cult Index |
| E | SuperfanProfile agrégé | "Estimez le nombre de nouveaux superfans (personnes qui recommandent activement)" | QUANTITATIVE (count) | → newSuperfans30d → superfanVelocity → Cult Index |
| E | CommunitySnapshot | "Quel % de la communauté a interagi au moins 1 fois ce mois ?" | QUANTITATIVE (%) | → activityRate → communityCohesion → Cult Index |
| A | enemy | "Les narratifs de l'ennemi ont-ils gagné du terrain ce mois ?" | QUALITATIVE | → Signal enemy impact |
| D | personas | "Le persona principal a-t-il changé de comportement observable ?" | QUALITATIVE | → Signal persona drift |
| V | unitEconomics | "Quel a été le CAC réel ce mois ?" | QUANTITATIVE (currency) | → V.cac (mise à jour) → ltvCacRatio (recalcul) |
| V | produitsCatalogue | "Volume de ventes du produit principal ce mois ?" | QUANTITATIVE (count) | → Signal performance |
| R | mitigationPriorities | "Les actions de mitigation prioritaires ont-elles été exécutées ?" | BOOLEAN | → Signal mitigation status |
| T | marketReality | "Signal de marché notable ce mois ?" | QUALITATIVE | → Signal weak/strong |

### F.4.4 Transformation en Signals N2.13

Chaque réponse crée un Signal structuré :

```typescript
// Exemple : le fixer rapporte 15 UGC créés ce mois
const signal: Signal = {
  id: generateId(),
  layer: "METRIC",                    // Donnée quantitative
  pillarAffected: "E",
  title: "UGC mensuel — feedback fixer",
  description: "15 contenus créés par la communauté (rapporté par le fixer)",
  source: "fixer_feedback",
  confidence: 50,                      // Expert estimate, pas mesure automatique
  advertis_impact: [{
    pillar: "E",
    direction: "positive",             // 15 > 0 = progrès
    magnitude: "medium",
  }],
  status: "ACTIVE",
  urgency: "medium_term",
  recommendedAction: "",               // Mestor remplira lors du traitement
};
```

**Cascade de recalcul déclenchée par le Signal** :

```
Signal (ugcCount = 15)
  → Met à jour les SuperfanProfiles agrégés (ugcCount)
    → Recalcule ugcGenerationRate (dimension Cult Index)
      → Recalcule Cult Index
        → Met à jour CultIndexBreakdown
          → Recalcule cultIndex_bonus du scoring pilier E
            → Recalcule le score /25 du pilier E
              → Recalcule le composite /200
                → Crée un DevotionSnapshot si changement significatif
```

Le `feedback-loop` service orchestre cette cascade. Chaque Signal est un point d'entrée dans le graphe de dépendances (→ H:`variable-registry.ts`).

### F.4.5 Génération adaptative du questionnaire

Mestor ne pose **pas** de questions sur les piliers qui reçoivent déjà des signaux automatiques. La logique :

```typescript
function generateMonthlyQuestions(strategyId: string): FeedbackQuestion[] {
  const autoSignals = getAutoSignalsLast30Days(strategyId);
  const staleComposites = getStaleComposites(strategyId);
  
  // Pour chaque composite stale qui n'a PAS de signal automatique récent
  const questionsNeeded = staleComposites.filter(composite => {
    const hasAutoSignal = autoSignals.some(s => 
      s.pillarAffected === composite.pillar && 
      s.source !== "fixer_feedback"
    );
    return !hasAutoSignal;
  });
  
  // Mestor génère les questions pour ces composites
  return mestorGenerateQuestions(questionsNeeded);
}
```

**Transition vers l'automatique** : quand les câblages arrivent (Phase 1+), les signaux automatiques entrent avec `confidence: 80+`. Les signaux manuels restent à `confidence: 50`. Le scoring pondère par confidence. Le questionnaire s'allège progressivement. Quand tous les piliers d'un client sont couverts automatiquement, le Process BATCH passe en status COMPLETED.

### F.4.6 Phase de build

**Phase 0** : le questionnaire est construit comme page dans la Fixer Console. Mestor génère les questions ciblant les composites stale. Les réponses créent des Signals N2.13. Le feedback-loop les consomme et déclenche les cascades de recalcul.

**Effort** : M (le feedback-loop service est prévu en Phase 1, mais son premier consumer — les signaux manuels structurés — est avancé en Phase 0).

### F.4.7 Critères d'acceptation

- [ ] Un Process BATCH "Monthly Feedback Collection" est créé pour chaque Brand Instance active
- [ ] Le 1er du mois, une alerte apparaît dans la Fixer Console
- [ ] Mestor génère un questionnaire qui cible les composites stale spécifiques (pas des questions génériques par pilier)
- [ ] Chaque question a un `targetComposite` et un `targetAtom` optionnel
- [ ] Les réponses quantitatives créent des Signals N2.13 avec `layer: "METRIC"` et `confidence: 50`
- [ ] Les réponses qualitatives créent des Signals N2.13 avec `layer: "WEAK"` ou `"STRONG"` selon la magnitude
- [ ] Chaque Signal déclenche la cascade de recalcul appropriée (composite → collection → score pilier → composite /200)
- [ ] Les réponses qui alimentent des métriques Cult Index (ugcCount, defenseCount, etc.) déclenchent un recalcul du Cult Index
- [ ] Le score /200 bouge réellement après la collecte de feedback
- [ ] Quand un pilier reçoit des signaux automatiques (Phase 1+), Mestor cesse de poser des questions sur les composites couverts
- [ ] Le Value Report mensuel inclut les données de feedback sans distinction de source visible pour le client

---

## F.5 Économie du QC à Petite Échelle

### F.5.1 Le problème

Le modèle de QC distribué suppose un volume suffisant de Maîtres. Le goulot arrive avant que de nouveaux Maîtres n'émergent organiquement.

### F.5.2 Mécanisme A : QC Apprenti par les Compagnons qualifiés

**Conditions d'activation** (évaluées par le `tier-evaluator`) :
- ≥ 20 missions complétées en tant que Compagnon
- firstPassRate ≥ 0.80
- avgQcScore ≥ 7.5/10
- Aucun rejet critique sur les 10 dernières missions

**Modification TalentProfile** :

```prisma
model TalentProfile {
  canReviewApprentice  Boolean @default(false)
}
```

**Routing** : le qc-router inclut les Compagnons qualifiés dans le pool de reviewers pour les livrables Apprenti. Un Maître est toujours préféré si disponible (délai max configurable, défaut : 48h).

**Compensation** : 50% du taux Maître. L'incitation principale = critère de progression vers Maître.

### F.5.3 Mécanisme B : Spot-check dynamique

Le ratio 1/3 fixe est remplacé par un ratio calculé depuis les 20 derniers QC :

```typescript
function getSpotCheckRatio(talent: TalentProfile): number {
  const recentFPR = computeFirstPassRate(talent, { lastN: 20 });
  
  if (recentFPR >= 0.95) return 0.20; // 1 sur 5
  if (recentFPR >= 0.85) return 0.33; // 1 sur 3 (défaut cahier)
  if (recentFPR >= 0.75) return 0.50; // 1 sur 2
  return 1.00;                         // Toutes les missions
}
```

Recalculé à chaque QC complété.

### F.5.4 Projection de charge QC

| Mois | Clients | Missions/mois | Maîtres | Comp. QC-qualified | QC humains/mois | Charge/reviewer |
|---|---|---|---|---|---|---|
| 1-3 | 5 | 20 | 2 | 0 | 20 | 10/personne |
| 4-6 | 8 | 35 | 2 | 1 | ~28 | 9/personne |
| 7-9 | 12 | 50 | 3 | 2 | ~35 | 7/personne |
| 10-12 | 15 | 65 | 4 | 3 | ~40 | 6/personne |

La charge par reviewer **diminue** même si le volume augmente.

### F.5.5 Phase de build

**Phase 2** (intégré au build de la Guilde et du `qc-router`).

### F.5.6 Critères d'acceptation

- [ ] Un Compagnon qui remplit les 4 conditions reçoit automatiquement `canReviewApprentice: true`
- [ ] Le qc-router inclut les Compagnons qualifiés dans le pool pour livrables Apprenti
- [ ] Un Maître est toujours préféré quand disponible
- [ ] Le spot-check ratio est dynamique (0.20 à 1.00) basé sur les 20 derniers QC
- [ ] Un Compagnon à 95%+ de FPR est spot-checké 1 fois sur 5
- [ ] Un Compagnon en dessous de 75% de FPR est reviewé à 100%
- [ ] La charge de QC par reviewer est visible dans la Fixer Console
- [ ] Le Compagnon qualifié voit ses reviews QC et la compensation dans le Creator Portal

---

## F.6 Résumé des impacts sur le cahier

### Tâches additionnelles par phase

| Phase | Mécanisme | Tâches | Effort |
|---|---|---|---|
| **P0** | F.1 Scoring structural | Implémenter `advertis-scorer` mode structural basé sur ontologie H (composites N2, collections N3, cross-refs) | L |
| **P0** | F.1 Quick Intake fourchette | Implémenter affichage fourchette/point selon confidence | S |
| **P0** | F.3 Knowledge Seeder | Implémenter service avec types ontologiques + UI Fixer Console | M |
| **P0** | F.4 Feedback structuré | Implémenter questionnaire ciblant les composites stale + Signals N2.13 + cascade de recalcul | L |
| **P1** | F.3 SESHAT Fallback | Intégrer fallback GLORY #27 dans `driver-engine.translateBrief()` | S |
| **P2** | F.2 First Value Protocol | Implémenter playbook dans process-scheduler (avec DevotionSnapshot J+14) | M |
| **P2** | F.3 Guild Seeding | Implémenter invitations avec tier initial | S |
| **P2** | F.5 QC Compagnon qualifié | Ajouter `canReviewApprentice`, modifier `qc-router` | M |
| **P2** | F.5 Spot-check dynamique | Modifier `qc-router` ratio | S |

**Effort total** : 2 L + 3 M + 4 S ≈ 4-5 semaines réparties sur Phases 0-2.

Note : l'effort de F.4 est passé de M à L (v1 → v2) parce que le questionnaire structuré par composite avec cascade de recalcul est plus complexe qu'un simple formulaire. Mais le résultat est radicalement meilleur — chaque feedback fait bouger des variables spécifiques au lieu de produire un signal flou.

### Modifications sur modèles existants

| Modèle | Champ ajouté | Source |
|---|---|---|
| `AdvertisVector` (type Zod) | `breakdown` (compteurs structural/modulator/atomes/collections/crossrefs par pilier) | F.1 |
| `TalentProfile` | `canReviewApprentice Boolean @default(false)` | F.5 |

### Nouveaux services

| Service | Source |
|---|---|
| `knowledge-seeder` (avec types ontologiques H) | F.3 |

### Services enrichis

| Service | Enrichissement | Source |
|---|---|---|
| `advertis-scorer` | Mode structural basé sur ontologie H + mode quality via Mestor modulators de G v2 | F.1 |
| `driver-engine` | `getSuggestedFirstTool()` + fallback SESHAT via GLORY #27 | F.2, F.3 |
| `process-scheduler` | Exécution playbooks séquentiels (First Value Protocol avec DevotionSnapshot J+14) | F.2 |
| `value-report-generator` | Template micro Value Report avec DevotionSnapshot initial + Cult Index | F.2 |
| `feedback-loop` | Consumer de Signals N2.13 structurés avec cascade de recalcul par composite | F.4 |
| `qc-router` | Pool élargi (Compagnons qualifiés) + spot-check dynamique | F.5 |
| `tier-evaluator` | Évaluation `canReviewApprentice` | F.5 |

---

*Fin de l'Annexe F v2 — Mécanismes de Résilience au Build*
