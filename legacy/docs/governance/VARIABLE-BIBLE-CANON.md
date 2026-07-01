# Variable Bible — Canonical Map (manuel ADVE ↔ code)

> **AUTO-GÉNÉRÉ** — ne pas éditer à la main. Source : `src/lib/types/variable-bible-canonical-map.ts`. Régen : `npx tsx scripts/gen-variable-bible-canon.ts`. Cf. [ADR-0037](adr/0037-country-scoped-knowledge-base.md) §11 + PR-K.

Total : **62 codes manuel mappés** sur **155 entries variable-bible**.

---

## Pilier A — Authenticité (Le Gospel)

| Code manuel | Label canon | Section manuel | Field code (path) | Description |
|---|---|---|---|---|
| `A-Equipe` | Équipe dirigeante | PILIER 1 §1.x | `a.equipeDirigeante` | Les profils des membres de l'équipe dirigeante |
| `A-Hierarchy` | Devotion Ladder (hiérarchie) | PILIER 4 §4.1 (mappé en A pour hiérarchie communautaire) | `a.hierarchieCommunautaire` | Les niveaux de la communauté de marque, mappés sur la Devotion Ladder |
| `A-Ikigai` | Ikigai | PILIER 1 §1.x | `a.ikigai` | Le framework Ikigai appliqué à la marque — 4 quadrants |
| `A-Mission` | Mission Statement | PILIER 1 §1.3 | `a.missionStatement` | Mission Statement — comment la marque réalise sa Vision (max 25 mots) |
| `A-Valeurs` | Valeurs / Commandements | PILIER 1 §1.4 | `a.valeurs` | Les 1-3 valeurs fondamentales de la marque (modèle Schwartz — roue de 10 valeurs, la marque en choisit 3 MAXIMUM) |
| `A-Vision` | Vision Statement | PILIER 1 §1.2 | `a.prophecy` | La vision transformatrice de la marque — le monde qu'elle veut créer |
| `A1` | Marque (nom commercial) | PILIER 1 §1.1 | `a.nomMarque` | Le nom commercial de la marque |
| `A10` | Index de réputation | PILIER 1 §1.10 | `a.indexReputation` | Index public de réputation — Google Reviews, Trustpilot, NPS, etc. |
| `A11` | eNPS | PILIER 1 §1.11 | `a.eNps` | Employee Net Promoter Score — engagement interne (proxy turnover) |
| `A11bis` | Turnover interne | PILIER 1 §1.11 | `a.turnoverRate` | Taux de rotation interne — % collaborateurs partis sur 12 mois |
| `A1bis` | Le Messie | PILIER 1 §1.1 | `a.messieFondateur` | Le Messie — figure charismatique principale qui incarne la marque (fondateur ou autre) |
| `A2` | Accroche identitaire | PILIER 1 §1.2 | `a.accroche` | Phrase identitaire qui résume l'essence de la marque en moins de 15 mots |
| `A3` | Description factuelle | PILIER 1 §1.3 | `a.description` | Ce que fait la marque, en 2-3 phrases factuelles |
| `A4` | Secteur | PILIER 1 §1.4 | `a.secteur` | Le secteur d'activité de la marque |
| `A5` | Pays / Marché | PILIER 1 §1.5 | `a.pays` | Le pays/marché principal de la marque |
| `A5myth` | Origin Myth | PILIER 1 §1.5 | `a.originMyth` | Origin Myth en 3 versions — l'histoire fondatrice qui justifie l'existence |
| `A6` | Compétences Divines | PILIER 1 §1.6 | `a.competencesDivines` | Les 1-3 compétences que SEUL la marque peut accomplir (Compétences Divines du manuel) |
| `A7` | NorthStar Metric (justification) | PILIER 1 §1.7 | `a.promesseFondamentale` | La croyance intime qui fonde le projet — pas un slogan, une CONVICTION |
| `A8` | Preuves d'authenticité | PILIER 1 §1.8 | `a.preuvesAuthenticite` | Les preuves tangibles d'origine et légitimité (ancienneté, certifications, reconnaissance fondateur) |
| `A9` | Archétype primaire | PILIER 1 §1.9 | `a.archetype` | L'archétype jungien primaire de la marque (pattern narratif profond) |
| `A9bis` | Archétype secondaire | PILIER 1 §1.9 | `a.archetypeSecondary` | Archétype jungien secondaire (nuance le primaire) |
| `D3` | Secteur (alias A4) | PILIER 2 §2.3 (alias) | `a.secteur` | Le secteur d'activité de la marque |
| `E-DevotionLadder` | Devotion Ladder (8 niveaux) | PILIER 4 §4.1 | `a.hierarchieCommunautaire` | Les niveaux de la communauté de marque, mappés sur la Devotion Ladder |

## Pilier D — Distinction (Le Mythe)

| Code manuel | Label canon | Section manuel | Field code (path) | Description |
|---|---|---|---|---|
| `D-Position` | Positionnement business | PILIER 2 §2.1 | `d.positionnement` | La position unique de la marque sur le marché, en 1-2 phrases |
| `D-Proofs` | Preuves de différenciation | PILIER 2 §2.x | `d.proofPoints` | Les preuves tangibles des promesses de la marque |
| `D-Symboles` | Symboles | PILIER 2 §2.x | `d.symboles` | Les symboles visuels et culturels associés à la marque |
| `D-Ton` | Ton de Voix | PILIER 2 §2.4 | `d.tonDeVoix` | Le ton et la personnalité verbale de la marque |
| `D1` | Persona cible | PILIER 2 §2.5 | `d.personas` | Les 2-5 profils types de clients de la marque |
| `D10` | ESOV (Excess Share of Voice) | PILIER 2 §2.10 | `d.esov` | Excess Share of Voice — écart entre part de voix et part de marché |
| `D11` | Barrières imitation | PILIER 2 §2.11 | `d.barriersImitation` | Barrières à l'imitation par la concurrence (au-delà de la PI) |
| `D12` | Ratio Storytelling/Evidence | PILIER 2 §2.12 | `d.storyEvidenceRatio` | Ratio Storytelling/Evidence dans la communication (équilibre récit / preuve) |
| `D2` | Concurrents | PILIER 2 §2.2 | `d.paysageConcurrentiel` | Les 3+ concurrents directs avec forces/faiblesses |
| `D4` | USP / Promesse maître | PILIER 2 §2.4 | `d.promesseMaitre` | La promesse principale de la marque au client, en 1 phrase |
| `D5` | DA / Territoire visuel | PILIER 2 §2.2 | `d.directionArtistique` | Système de production visuelle — 11 sous-composites produits par le pipeline BRAND GLORY |
| `D6` | Positionnement émotionnel | PILIER 2 §2.6 | `d.positionnementEmotionnel` | Le ressenti unique que la marque déclenche chez son audience (distinct du positionnement business) |
| `D7` | SWOT Flash | PILIER 2 §2.7 | `d.swotFlash` | SWOT version courte (1 phrase par quadrant) — usage marketing rapide vs r.globalSwot exhaustif |
| `D8` | Codes propriétaires / Dialecte | PILIER 2 §2.3 | `d.assetsLinguistiques` | Le vocabulaire propriétaire de la marque — slogan, tagline, mantras, lexique |
| `V-Promesse` | Promesse Divine (alias D4) | PILIER 3 §3.1 | `d.promesseMaitre` | La promesse principale de la marque au client, en 1 phrase |

## Pilier V — Valeur (Le Miracle)

| Code manuel | Label canon | Section manuel | Field code (path) | Description |
|---|---|---|---|---|
| `D9` | Portefeuille IP (placement V mais signal D) | PILIER 2 §2.x | `v.proprieteIntellectuelle` | Brevets, secrets commerciaux, barrières à l'entrée (Berkus: IP milestone) |
| `V-Benefits` | Bénéfices directs (tangibles) | PILIER 3 §3.5 | `v.valeurClientTangible` | Bénéfices fonctionnels pour le client |
| `V-BenefitsInt` | Bénéfices indirects (intangibles) | PILIER 3 §3.5 | `v.valeurClientIntangible` | Bénéfices émotionnels et sociaux pour le client |
| `V-Ladder` | Value Ladder | PILIER 3 §3.4 | `v.productLadder` | L'échelle de produits par tier (entrée de gamme → premium) |
| `V-MultiSens` | Architecture Multisensorielle | PILIER 3 §3.3 | `v.experienceMultisensorielle` | Architecture des 5 sens — comment la marque engage chaque modalité sensorielle |
| `V-MVP` | MVP / Stage produit | PILIER 3 §3.x | `v.mvp` | Statut du produit/prototype (Berkus: Product/Prototype milestone) |
| `V-Packaging` | Packaging & Delivery | PILIER 3 §3.7 | `v.packagingExperience` | L'expérience d'unboxing / réception / découverte du produit |
| `V-Sacrifice` | Sacrifice Requis | PILIER 3 §3.6 | `v.sacrificeRequis` | Le sacrifice demandé au client (prix, temps, effort) et sa justification |
| `V1` | Besoins client / Proposition | PILIER 3 §3.1 | `v.promesseDeValeur` | La proposition de valeur globale de la marque (synthèse V) |
| `V12` | Coût acquisition (CAC) | PILIER 3 §3.12 | `v.unitEconomics` | Les métriques économiques unitaires de la marque |
| `V4` | Offres & Prix | PILIER 3 §3.2 | `v.produitsCatalogue` | Le catalogue complet des produits/services de la marque |
| `V7` | ROI Proof | PILIER 3 §3.7 | `v.roiProofs` | Preuves chiffrées de ROI client — testimoniaux quantifiés |

## Pilier E — Engagement (L'Église)

| Code manuel | Label canon | Section manuel | Field code (path) | Description |
|---|---|---|---|---|
| `E-Clerge` | Le Clergé | PILIER 4 §4.5 | `e.clergeStructure` | Le Clergé — équipe d'incarnation de la marque (CM, ambassadeurs, evangelists, support) |
| `E-Commandments` | Commandements | PILIER 4 §4.x | `e.commandments` | Les commandements de la marque — règles non-négociables |
| `E-Community` | Community Building | PILIER 4 §4.8 | `e.communityBuilding` | Architecture de construction communautaire (vs e.principesCommunautaires qui sont les règles) |
| `E-Evangelisation` | Programme d'Évangélisation | PILIER 4 §4.7 | `e.programmeEvangelisation` | Système qui transforme clients en recruteurs actifs |
| `E-Gamification` | Gamification | PILIER 4 §4.x | `e.gamification` | Système de progression ludique |
| `E-Pelerinages` | Les Pèlerinages | PILIER 4 §4.6 | `e.pelerinages` | Les Pèlerinages — événements majeurs (vs touchpoints quotidiens en e.touchpoints) |
| `E-Retention` | Retention Strategy (AARRR) | PILIER 4 §4.9 | `e.aarrr` | Le funnel AARRR appliqué à la marque |
| `E-RitualCalendar` | Ritual Calendar | PILIER 4 §4.4 | `e.sacredCalendar` | Le calendrier sacré de la marque — dates et moments clés |
| `E-Rituels` | Les Rituels | PILIER 4 §4.3 | `e.rituels` | Les 3-10 rituels de marque qui créent l'habitude et la fidélité |
| `E-Sacraments` | Sacrements | PILIER 4 §4.x | `e.sacraments` | Les sacrements de la marque — moments d'engagement profond |
| `E-Taboos` | Tabous | PILIER 4 §4.x | `e.taboos` | Les tabous de la communauté — ce qu'on ne fait JAMAIS |
| `E-Temples` | Les Temples (points contact) | PILIER 4 §4.2 | `e.touchpoints` | Les 5-15 points de contact entre la marque et son audience |

---

## Anti-drift

Test CI : `tests/unit/governance/variable-bible-canonical-coverage.test.ts` vérifie que tout code listé dans `CANONICAL_MAP` pointe vers une entry existante de `VARIABLE_BIBLE`. Toute désynchronisation = échec CI.

Lecture inverse — quels fields code n'ont PAS de code manuel : champs marqués `derivedFrom` (RTIS, calculs cross-pilier) + champs code-only (extensions du framework). Liste explicite dans la section ci-dessous.

### Fields code sans code manuel (96)

Ces fields sont soit (a) dérivés/calculés, soit (b) extensions code-only du framework La Fusée. Aucun code manuel correspondant n'est attendu.

- **A** : `brandNature`, `langue`, `publicCible`, `citationFondatrice`, `noyauIdentitaire`, `herosJourney`, `enemy`, `doctrine`, `livingMythology`, `timelineNarrative`, `equipeComplementarite`
- **D** : `archetypalExpression`, `sousPromesses`, `sacredObjects`
- **V** : `businessModel`, `pricingJustification`, `economicModels`, `positioningArchetype`, `salesChannel`, `freeLayer`, `personaSegmentMap`, `valeurMarqueTangible`, `valeurMarqueIntangible`, `coutMarqueTangible`, `coutMarqueIntangible`, `coutClientTangible`, `coutClientIntangible`
- **E** : `promesseExperience`, `superfanPortrait`, `primaryChannel`, `productExperienceMap`, `ladderProductAlignment`, `channelTouchpointMap`, `conversionTriggers`, `barriersEngagement`, `principesCommunautaires`, `kpis`, `ritesDePassage`
- **R** : `globalSwot`, `overtonBlockers`, `riskScore`, `pillarGaps`, `coherenceRisks`, `devotionVulnerabilities`, `microSWOTs`, `probabilityImpactMatrix`, `mitigationPriorities`
- **T** : `overtonPosition`, `perceptionGap`, `tamSamSom`, `riskValidation`, `competitorOvertonPositions`, `triangulation`, `hypothesisValidation`, `marketReality`, `brandMarketFitScore`, `weakSignalAnalysis`, `marketDataSources`, `lastMarketDataRefresh`, `sectorKnowledgeReused`, `traction`
- **I** : `catalogueParCanal`, `innovationsProduit`, `actionsByDevotionLevel`, `actionsByOvertonPhase`, `riskMitigationActions`, `hypothesisTestActions`, `assetsProduisibles`, `activationsPossibles`, `formatsDisponibles`, `totalActions`, `brandPlatform`, `copyStrategy`, `bigIdea`, `potentielBudget`, `mediaPlan`, `generationMeta`
- **S** : `fenetreOverton`, `selectedFromI`, `devotionFunnel`, `northStarKPI`, `visionStrategique`, `syntheseExecutive`, `axesStrategiques`, `facteursClesSucces`, `sprint90Days`, `roadmap`, `globalBudget`, `budgetBreakdown`, `teamStructure`, `kpiDashboard`, `coherenceScore`, `rejectedFromI`, `overtonMilestones`, `budgetByDevotion`, `recommandationsPrioritaires`

