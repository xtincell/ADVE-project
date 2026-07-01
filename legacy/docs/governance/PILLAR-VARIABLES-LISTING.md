# Listing intégral des variables ADVE & RTIS

> **AUTO-GÉNÉRÉ** — ne pas éditer à la main. Source : `src/lib/types/pillar-schemas.ts` (`PILLAR_SCHEMAS`, schéma Zod compilé) croisé avec `src/lib/types/variable-bible.ts` (`VARIABLE_BIBLE`). Régen : `npx tsx scripts/gen-pillar-variables-listing.ts`.

Ce document descend **récursivement** dans tout l'arbre Zod (objets imbriqués, éléments d'array notés `[]`, options d'union notées `(optN)`, records notés `{clé}`). La page `/console/config/variables` n'affiche que le **premier niveau** — ce listing comble cet écart pour garantir qu'aucun champ n'est oublié.

## Synthèse

- **8 piliers** : 4 ADVE fondateurs (A·D·V·E, édités manuellement) + 4 RTIS dérivés (R·T·I·S, régénérés via cascade — jamais édités à la main, cf. ADR-0023).
- **156 champs de premier niveau** (ce que montre la page Console).
- **1051 entrées totales** une fois l'arbre déplié récursivement (objets + sous-champs + éléments d'array + options d'union + records).
- **156/156 champs de premier niveau documentés** dans la Variable Bible.

| Pilier | Nom | Champs niveau 1 | Entrées dépliées | Documentés (N1) |
|---|---|---:|---:|---:|
| **A** (ADVE) | Authenticité | 32 | 129 | 32/32 |
| **D** (ADVE) | Distinction | 17 | 211 | 17/17 |
| **V** (ADVE) | Valeur | 25 | 109 | 25/25 |
| **E** (ADVE) | Engagement | 23 | 131 | 23/23 |
| **R** (RTIS) | Risk | 9 | 54 | 9/9 |
| **T** (RTIS) | Track | 14 | 97 | 14/14 |
| **I** (RTIS) | Innovation | 16 | 192 | 16/16 |
| **S** (RTIS) | Strategy | 20 | 128 | 20/20 |

---

## Pilier A — Authenticité

_ADVE — fondateur (édition manuelle)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `nomMarque` | `string` | ✓ | min 1 car. | Le nom commercial de la marque |
| `accroche` | `string` | — | max 100 car. | Phrase identitaire qui résume l'essence de la marque en moins de 15 mots |
| `description` | `string` | ✓ | min 1 car. | Ce que fait la marque, en 2-3 phrases factuelles |
| `secteur` | `string` | ✓ | min 1 car. | Le secteur d'activité de la marque |
| `pays` | `string` | ✓ | min 1 car. | Le pays/marché principal de la marque |
| `brandNature` | `string` | — | min 1 car. | La nature fondamentale de ce que la marque EST |
| `langue` | `string` | — | min 1 car. | La langue principale de communication de la marque |
| `publicCible` | `string` | — | min 1 car. | Description générale de l'audience cible, en 1-2 phrases |
| `promesseFondamentale` | `string` | — | min 1 car. | La croyance intime qui fonde le projet — pas un slogan, une CONVICTION |
| `archetype` | `enum` | ✓ | valeurs: INNOCENT, SAGE, EXPLORATEUR, REBELLE, MAGICIEN, HEROS, AMOUREUX, BOUFFON, CITOYEN, SOUVERAIN, CREATEUR, PROTECTEUR | L'archétype jungien primaire de la marque (pattern narratif profond) |
| `archetypeSecondary` | `enum` | — | valeurs: INNOCENT, SAGE, EXPLORATEUR, REBELLE, MAGICIEN, HEROS, AMOUREUX, BOUFFON, CITOYEN, SOUVERAIN, CREATEUR, PROTECTEUR | Archétype jungien secondaire (nuance le primaire) |
| `citationFondatrice` | `string` | ✓ | min 1 car. | La conviction intime du fondateur qui a engendré le projet |
| `noyauIdentitaire` | `string` | ✓ | min 1 car. | L'ADN de la marque en 2-3 phrases — ce qu'elle fait, pour qui, pourquoi différemment |
| `herosJourney` | `array<object>` | ✓ | min 3 car. · max 5 car. | Le parcours héroïque de la marque en 5 actes narratifs |
|   `herosJourney[].actNumber` | `union(literal \| literal \| literal \| literal \| literal)` | ✓ |  |  |
|   `herosJourney[].title` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `herosJourney[].narrative` | `string` | ✓ | min 1 car. |  |
|   `herosJourney[].emotionalArc` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `herosJourney[].causalLink` | `string` | — |  |  |
| `ikigai` | `object` | ✓ |  | Le framework Ikigai appliqué à la marque — 4 quadrants |
|   `ikigai.love` | `string` | ✓ | min 1 car. |  |
|   `ikigai.competence` | `string` | ✓ | min 1 car. |  |
|   `ikigai.worldNeed` | `string` | ✓ | min 1 car. |  |
|   `ikigai.remuneration` | `string` | ✓ | min 1 car. |  |
| `valeurs` | `array<object>` | ✓ | min 1 car. · max 3 car. | Les 1-3 valeurs fondamentales de la marque (modèle Schwartz — roue de 10 valeurs, la marque en choisit 3 MAXIMUM) |
|   `valeurs[].value` | `enum` | ✓ | valeurs: POUVOIR, ACCOMPLISSEMENT, HEDONISME, STIMULATION, AUTONOMIE, UNIVERSALISME, BIENVEILLANCE, TRADITION, CONFORMITE, SECURITE |  |
|   `valeurs[].customName` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `valeurs[].rank` | `number` | ✓ | safeint · > 1 |  |
|   `valeurs[].justification` | `string` | ✓ | min 1 car. |  |
|   `valeurs[].costOfHolding` | `string` | ✓ | min 1 car. |  |
|   `valeurs[].tensionWith` | `array<enum>` | — | valeurs: POUVOIR, ACCOMPLISSEMENT, HEDONISME, STIMULATION, AUTONOMIE, UNIVERSALISME, BIENVEILLANCE, TRADITION, CONFORMITE, SECURITE |  |
| `hierarchieCommunautaire` | `array<object>` | ✓ | min 4 car. · max 6 car. | Les niveaux de la communauté de marque, mappés sur la Devotion Ladder |
|   `hierarchieCommunautaire[].level` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `hierarchieCommunautaire[].description` | `string` | ✓ | min 1 car. |  |
|   `hierarchieCommunautaire[].privileges` | `string` | ✓ | min 1 car. |  |
|   `hierarchieCommunautaire[].entryCriteria` | `string` | — | min 1 car. · max 200 car. |  |
| `timelineNarrative` | `object` | — |  | L histoire de la marque en 4 époques : origines, transformation, présent, futur |
|   `timelineNarrative.origine` | `string` | — | min 1 car. |  |
|   `timelineNarrative.transformation` | `string` | — | min 1 car. |  |
|   `timelineNarrative.present` | `string` | — | min 1 car. |  |
|   `timelineNarrative.futur` | `string` | — | min 1 car. |  |
| `prophecy` | `union(object \| string)` | — |  | La vision transformatrice de la marque — le monde qu'elle veut créer |
|   `prophecy(opt1).worldTransformed` | `string` | ✓ | min 1 car. |  |
|   `prophecy(opt1).pioneers` | `string` | ✓ | min 1 car. |  |
|   `prophecy(opt1).urgency` | `string` | ✓ | min 1 car. |  |
|   `prophecy(opt1).horizon` | `string` | ✓ | min 1 car. |  |
| `enemy` | `object` | — |  | L'ennemi déclaré de la marque — ce contre quoi elle se bat |
|   `enemy.name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `enemy.manifesto` | `string` | — | min 1 car. |  |
|   `enemy.narrative` | `string` | — | min 1 car. |  |
|   `enemy.enemySchwartzValues` | `array<enum>` | — | valeurs: POUVOIR, ACCOMPLISSEMENT, HEDONISME, STIMULATION, AUTONOMIE, UNIVERSALISME, BIENVEILLANCE, TRADITION, CONFORMITE, SECURITE |  |
|   `enemy.overtonMap` | `object` | — |  |  |
|     `enemy.overtonMap.ourPosition` | `string` | — | min 1 car. |  |
|     `enemy.overtonMap.enemyPosition` | `string` | — | min 1 car. |  |
|     `enemy.overtonMap.battleground` | `string` | — | min 1 car. |  |
|     `enemy.overtonMap.shiftDirection` | `string` | — | min 1 car. |  |
|   `enemy.enemyBrands` | `array<object>` | — |  |  |
|     `enemy.enemyBrands[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `enemy.enemyBrands[].howTheyFight` | `string` | — | min 1 car. · max 200 car. |  |
|   `enemy.activeOpposition` | `array<string>` | — |  |  |
|   `enemy.passiveOpposition` | `array<string>` | — |  |  |
|   `enemy.counterStrategy` | `object` | — |  |  |
|     `enemy.counterStrategy.marketingCounter` | `string` | — | min 1 car. |  |
|     `enemy.counterStrategy.alliances` | `array<string>` | — |  |  |
|   `enemy.fraternityFuel` | `object` | — |  |  |
|     `enemy.fraternityFuel.sharedHatred` | `string` | — | min 1 car. |  |
|     `enemy.fraternityFuel.bondingRituals` | `array<string>` | — |  |  |
| `doctrine` | `union(object \| string)` | — |  | Les dogmes et principes non-négociables de la marque |
|   `doctrine(opt1).dogmas` | `array<string>` | ✓ | min 3 car. |  |
|   `doctrine(opt1).principles` | `array<string>` | ✓ | min 3 car. |  |
|   `doctrine(opt1).practices` | `array<string>` | — |  |  |
| `livingMythology` | `object` | — |  | Le récit mythologique vivant de la marque — son canon narratif |
|   `livingMythology.canon` | `string` | ✓ | min 1 car. |  |
|   `livingMythology.extensionRules` | `string` | ✓ | min 1 car. |  |
|   `livingMythology.captureSystem` | `string` | — | min 1 car. |  |
| `equipeDirigeante` | `array<object>` | — | min 1 car. · max 10 car. | Les profils des membres de l'équipe dirigeante |
|   `equipeDirigeante[].nom` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `equipeDirigeante[].role` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `equipeDirigeante[].bio` | `string` | ✓ | min 1 car. |  |
|   `equipeDirigeante[].experiencePasse` | `array<string>` | ✓ | min 1 car. |  |
|   `equipeDirigeante[].competencesCles` | `array<string>` | ✓ | min 2 car. |  |
|   `equipeDirigeante[].credentials` | `array<string>` | — |  |  |
|   `equipeDirigeante[].linkedinUrl` | `string` | — | string_format |  |
|   `equipeDirigeante[].allocationPct` | `number` | — | > 0 · < 100 |  |
| `equipeComplementarite` | `object` | — |  | Score de complémentarité de l'équipe dirigeante (dérivé automatiquement) |
|   `equipeComplementarite.scoreGlobal` | `number` | ✓ | > 0 · < 10 |  |
|   `equipeComplementarite.couvertureTechnique` | `boolean` | ✓ |  |  |
|   `equipeComplementarite.couvertureCommerciale` | `boolean` | ✓ |  |  |
|   `equipeComplementarite.couvertureOperationnelle` | `boolean` | ✓ |  |  |
|   `equipeComplementarite.capaciteExecution` | `enum` | ✓ | valeurs: faible, moyenne, forte, exceptionnelle |  |
|   `equipeComplementarite.lacunes` | `array<string>` | — |  |  |
|   `equipeComplementarite.verdict` | `string` | ✓ | min 1 car. |  |
| `messieFondateur` | `object` | — |  | Le Messie — figure charismatique principale qui incarne la marque (fondateur ou autre) _(code A1bis)_ |
|   `messieFondateur.nom` | `string` | ✓ | min 1 car. |  |
|   `messieFondateur.role` | `string` | ✓ | min 1 car. |  |
|   `messieFondateur.charismaScore` | `object` | — |  |  |
|     `messieFondateur.charismaScore.conviction` | `number` | ✓ | > 0 · < 10 |  |
|     `messieFondateur.charismaScore.storytelling` | `number` | ✓ | > 0 · < 10 |  |
|     `messieFondateur.charismaScore.presence` | `number` | ✓ | > 0 · < 10 |  |
|     `messieFondateur.charismaScore.authenticity` | `number` | ✓ | > 0 · < 10 |  |
|   `messieFondateur.narrative` | `string` | ✓ | min 50 car. |  |
| `competencesDivines` | `array<object>` | — | min 1 car. · max 3 car. | Les 1-3 compétences que SEUL la marque peut accomplir (Compétences Divines du manuel) _(code A6)_ |
|   `competencesDivines[].competence` | `string` | ✓ | min 50 car. |  |
|   `competencesDivines[].justification` | `string` | ✓ | min 1 car. |  |
|   `competencesDivines[].exclusivityProof` | `string` | ✓ | min 1 car. |  |
| `preuvesAuthenticite` | `array<object>` | — |  | Les preuves tangibles d'origine et légitimité (ancienneté, certifications, reconnaissance fondateur) _(code A8)_ |
|   `preuvesAuthenticite[].type` | `enum` | ✓ | valeurs: heritage, certification, recognition, press, datapoint |  |
|   `preuvesAuthenticite[].claim` | `string` | ✓ | min 1 car. |  |
|   `preuvesAuthenticite[].evidence` | `string` | ✓ | min 1 car. |  |
|   `preuvesAuthenticite[].source` | `string` | ✓ | min 1 car. |  |
|   `preuvesAuthenticite[].year` | `number` | — | safeint |  |
| `indexReputation` | `object` | — |  | Index public de réputation — Google Reviews, Trustpilot, NPS, etc. _(code A10)_ |
|   `indexReputation.source` | `enum` | ✓ | valeurs: GOOGLE_REVIEWS, TRUSTPILOT, NPS, YELP, TRIPADVISOR, OTHER |  |
|   `indexReputation.score` | `number` | ✓ |  |  |
|   `indexReputation.sampleSize` | `number` | ✓ | safeint |  |
|   `indexReputation.lastMeasured` | `string` | ✓ |  |  |
|   `indexReputation.publicProofUrl` | `string` | — | string_format |  |
| `eNps` | `object` | — |  | Employee Net Promoter Score — engagement interne (proxy turnover) _(code A11)_ |
|   `eNps.score` | `number` | ✓ | > -100 · < 100 |  |
|   `eNps.sampleSize` | `number` | ✓ | safeint |  |
|   `eNps.frequency` | `enum` | ✓ | valeurs: QUARTERLY, ANNUAL |  |
|   `eNps.lastMeasured` | `string` | ✓ |  |  |
|   `eNps.verbatims` | `array<string>` | — |  |  |
| `turnoverRate` | `number` | — | > 0 · < 1 | Taux de rotation interne — % collaborateurs partis sur 12 mois _(code A11bis)_ |
| `missionStatement` | `string` | — | max 200 car. | Mission Statement — comment la marque réalise sa Vision (max 25 mots) _(code A-Mission)_ |
| `originMyth` | `object` | — |  | Origin Myth en 3 versions — l'histoire fondatrice qui justifie l'existence _(code A5myth)_ |
|   `originMyth.elevator` | `string` | ✓ | max 400 car. |  |
|   `originMyth.storytelling` | `string` | — | min 100 car. |  |
|   `originMyth.longue` | `string` | — | min 500 car. |  |

---

## Pilier D — Distinction

_ADVE — fondateur (édition manuelle)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `archetypalExpression` | `object` | — |  | Comment l archetype A se traduit en expression visuelle et verbale |
|   `archetypalExpression.visualTranslation` | `string` | — | min 1 car. |  |
|   `archetypalExpression.verbalTranslation` | `string` | — | min 1 car. |  |
|   `archetypalExpression.emotionalRegister` | `string` | — | min 1 car. |  |
| `personas` | `array<object>` | ✓ | min 2 car. · max 5 car. | Les 2-5 profils types de clients de la marque |
|   `personas[].id` | `string` | — | string_format |  |
|   `personas[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `personas[].age` | `number` | — | safeint · > 1 · < 120 |  |
|   `personas[].csp` | `string` | — | min 1 car. · max 200 car. |  |
|   `personas[].location` | `string` | — | min 1 car. · max 200 car. |  |
|   `personas[].income` | `string` | — | min 1 car. · max 200 car. |  |
|   `personas[].familySituation` | `string` | — | min 1 car. · max 200 car. |  |
|   `personas[].tensionProfile` | `object` | — |  |  |
|     `personas[].tensionProfile.segmentId` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `personas[].tensionProfile.category` | `string` | ✓ |  |  |
|     `personas[].tensionProfile.position` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `personas[].lf8Dominant` | `array<enum>` | — | min 1 car. · max 3 car. · valeurs: SURVIE_SANTE, NOURRITURE_PLAISIR, LIBERTE_DANGER, COMPAGNON_SEXUEL, CONDITIONS_CONFORT, SUPERIORITE_STATUT, PROTECTION_PROCHES, APPROBATION_SOCIALE |  |
|   `personas[].schwartzValues` | `array<enum>` | — | min 1 car. · max 3 car. · valeurs: POUVOIR, ACCOMPLISSEMENT, HEDONISME, STIMULATION, AUTONOMIE, UNIVERSALISME, BIENVEILLANCE, TRADITION, CONFORMITE, SECURITE |  |
|   `personas[].lifestyle` | `string` | — | min 1 car. |  |
|   `personas[].mediaConsumption` | `string` | — | min 1 car. |  |
|   `personas[].brandRelationships` | `string` | — | min 1 car. |  |
|   `personas[].motivations` | `string` | ✓ | min 1 car. |  |
|   `personas[].fears` | `string` | — | min 1 car. |  |
|   `personas[].hiddenDesire` | `string` | — | min 1 car. |  |
|   `personas[].whatTheyActuallyBuy` | `string` | — | min 1 car. |  |
|   `personas[].jobsToBeDone` | `array<string>` | — | min 1 car. · max 3 car. |  |
|   `personas[].decisionProcess` | `string` | — | min 1 car. · max 200 car. |  |
|   `personas[].devotionPotential` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `personas[].rank` | `number` | ✓ | safeint · > 1 |  |
| `paysageConcurrentiel` | `array<object>` | ✓ | min 3 car. | Les 3+ concurrents directs avec forces/faiblesses |
|   `paysageConcurrentiel[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `paysageConcurrentiel[].partDeMarcheEstimee` | `number` | — | > 0 · < 100 |  |
|   `paysageConcurrentiel[].avantagesCompetitifs` | `array<string>` | ✓ | min 1 car. |  |
|   `paysageConcurrentiel[].faiblesses` | `array<string>` | — |  |  |
|   `paysageConcurrentiel[].strategiePos` | `string` | — | min 1 car. · max 200 car. |  |
|   `paysageConcurrentiel[].distinctiveAssets` | `array<string>` | — |  |  |
| `promesseMaitre` | `string` | ✓ | max 150 car. | La promesse principale de la marque au client, en 1 phrase |
| `sousPromesses` | `array<string>` | ✓ | min 2 car. | Déclinaisons de la promesse maître pour chaque segment/produit/contexte |
| `positionnement` | `string` | ✓ | max 200 car. | La position unique de la marque sur le marché, en 1-2 phrases |
| `tonDeVoix` | `object` | ✓ |  | Le ton et la personnalité verbale de la marque |
|   `tonDeVoix.personnalite` | `array<string>` | ✓ | min 5 car. · max 7 car. |  |
|   `tonDeVoix.onDit` | `array<string>` | ✓ | min 3 car. |  |
|   `tonDeVoix.onNeditPas` | `array<string>` | ✓ | min 2 car. |  |
| `assetsLinguistiques` | `object` | — |  | Le vocabulaire propriétaire de la marque — slogan, tagline, mantras, lexique |
|   `assetsLinguistiques.languePrincipale` | `string` | — | min 1 car. |  |
|   `assetsLinguistiques.languesSecondaires` | `array<string>` | — |  |  |
|   `assetsLinguistiques.slogan` | `string` | — | max 50 car. |  |
|   `assetsLinguistiques.tagline` | `string` | — | max 100 car. |  |
|   `assetsLinguistiques.motto` | `string` | — | min 1 car. · max 150 car. |  |
|   `assetsLinguistiques.mantras` | `array<string>` | — |  |  |
|   `assetsLinguistiques.lexiquePropre` | `array<object>` | — | min 3 car. |  |
|     `assetsLinguistiques.lexiquePropre[].word` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `assetsLinguistiques.lexiquePropre[].definition` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `directionArtistique` | `object` | — |  | Système de production visuelle — 11 sous-composites produits par le pipeline BRAND GLORY |
|   `directionArtistique.semioticAnalysis` | `object` | — |  |  |
|     `directionArtistique.semioticAnalysis.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.semioticAnalysis.dominantSigns` | `array<object>` | — |  |  |
|       `directionArtistique.semioticAnalysis.dominantSigns[].sign` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.semioticAnalysis.dominantSigns[].meaning` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.semioticAnalysis.dominantSigns[].culturalContext` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.semioticAnalysis.archetypeVisual` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.semioticAnalysis.semioticTensions` | `array<object>` | — |  |  |
|       `directionArtistique.semioticAnalysis.semioticTensions[].tension` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.semioticAnalysis.semioticTensions[].resolution` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.semioticAnalysis.recommendations` | `array<string>` | — |  |  |
|   `directionArtistique.visualLandscape` | `object` | — |  |  |
|     `directionArtistique.visualLandscape.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.visualLandscape.competitors` | `array<object>` | — |  |  |
|       `directionArtistique.visualLandscape.competitors[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.visualLandscape.competitors[].visualIdentity` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.visualLandscape.competitors[].differentiator` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.visualLandscape.whitespace` | `array<string>` | — |  |  |
|     `directionArtistique.visualLandscape.positioningMap` | `object` | — |  |  |
|       `directionArtistique.visualLandscape.positioningMap.xAxis` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.visualLandscape.positioningMap.yAxis` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.visualLandscape.positioningMap.brandPosition` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.visualLandscape.opportunities` | `array<string>` | — |  |  |
|   `directionArtistique.moodboard` | `object` | — |  |  |
|     `directionArtistique.moodboard.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.moodboard.theme` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.moodboard.keywords` | `array<string>` | — |  |  |
|     `directionArtistique.moodboard.colorPalette` | `array<object>` | — |  |  |
|       `directionArtistique.moodboard.colorPalette[].hex` | `string` | ✓ |  |  |
|       `directionArtistique.moodboard.colorPalette[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.moodboard.colorPalette[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.moodboard.textures` | `array<string>` | — |  |  |
|     `directionArtistique.moodboard.references` | `array<object>` | — |  |  |
|       `directionArtistique.moodboard.references[].source` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.moodboard.references[].description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `directionArtistique.chromaticStrategy` | `object` | — |  |  |
|     `directionArtistique.chromaticStrategy.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.chromaticStrategy.primaryColors` | `array<object>` | — |  |  |
|       `directionArtistique.chromaticStrategy.primaryColors[].hex` | `string` | ✓ |  |  |
|       `directionArtistique.chromaticStrategy.primaryColors[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.chromaticStrategy.primaryColors[].emotion` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.chromaticStrategy.primaryColors[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.chromaticStrategy.secondaryColors` | `array<object>` | — |  |  |
|       `directionArtistique.chromaticStrategy.secondaryColors[].hex` | `string` | ✓ |  |  |
|       `directionArtistique.chromaticStrategy.secondaryColors[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.chromaticStrategy.secondaryColors[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.chromaticStrategy.gradients` | `array<object>` | — |  |  |
|       `directionArtistique.chromaticStrategy.gradients[].from` | `string` | ✓ |  |  |
|       `directionArtistique.chromaticStrategy.gradients[].to` | `string` | ✓ |  |  |
|       `directionArtistique.chromaticStrategy.gradients[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.chromaticStrategy.forbiddenColors` | `array<object>` | — |  |  |
|       `directionArtistique.chromaticStrategy.forbiddenColors[].hex` | `string` | ✓ |  |  |
|       `directionArtistique.chromaticStrategy.forbiddenColors[].reason` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.chromaticStrategy.accessibilityNotes` | `string` | — | min 1 car. · max 200 car. |  |
|   `directionArtistique.typographySystem` | `object` | — |  |  |
|     `directionArtistique.typographySystem.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.typographySystem.primaryFont` | `object` | — |  |  |
|       `directionArtistique.typographySystem.primaryFont.name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.primaryFont.category` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.primaryFont.usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.typographySystem.secondaryFont` | `object` | — |  |  |
|       `directionArtistique.typographySystem.secondaryFont.name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.secondaryFont.category` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.secondaryFont.usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.typographySystem.hierarchy` | `array<object>` | — |  |  |
|       `directionArtistique.typographySystem.hierarchy[].level` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.hierarchy[].font` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.hierarchy[].size` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.typographySystem.hierarchy[].weight` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.typographySystem.rules` | `array<string>` | — |  |  |
|   `directionArtistique.logoTypeRecommendation` | `object` | — |  |  |
|     `directionArtistique.logoTypeRecommendation.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.logoTypeRecommendation.logoType` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.logoTypeRecommendation.rationale` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.logoTypeRecommendation.variations` | `array<object>` | — |  |  |
|       `directionArtistique.logoTypeRecommendation.variations[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.logoTypeRecommendation.variations[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.logoTypeRecommendation.variations[].description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.logoTypeRecommendation.doNots` | `array<string>` | — |  |  |
|   `directionArtistique.logoValidation` | `object` | — |  |  |
|     `directionArtistique.logoValidation.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.logoValidation.score` | `number` | — | > 0 · < 100 |  |
|     `directionArtistique.logoValidation.strengths` | `array<string>` | — |  |  |
|     `directionArtistique.logoValidation.weaknesses` | `array<string>` | — |  |  |
|     `directionArtistique.logoValidation.recommendations` | `array<string>` | — |  |  |
|     `directionArtistique.logoValidation.culturalFit` | `string` | — | min 1 car. · max 200 car. |  |
|   `directionArtistique.designTokens` | `object` | — |  |  |
|     `directionArtistique.designTokens.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.designTokens.spacing` | `record<string, string>` | — |  |  |
|     `directionArtistique.designTokens.borderRadius` | `record<string, string>` | — |  |  |
|     `directionArtistique.designTokens.shadows` | `record<string, string>` | — |  |  |
|     `directionArtistique.designTokens.breakpoints` | `record<string, string>` | — |  |  |
|     `directionArtistique.designTokens.customTokens` | `record<string, string>` | — |  |  |
|   `directionArtistique.motionIdentity` | `object` | — |  |  |
|     `directionArtistique.motionIdentity.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.motionIdentity.personality` | `string` | — | min 1 car. · max 200 car. |  |
|     `directionArtistique.motionIdentity.principles` | `array<string>` | — |  |  |
|     `directionArtistique.motionIdentity.transitions` | `array<object>` | — |  |  |
|       `directionArtistique.motionIdentity.transitions[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.motionIdentity.transitions[].duration` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.motionIdentity.transitions[].easing` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.motionIdentity.transitions[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.motionIdentity.microInteractions` | `array<object>` | — |  |  |
|       `directionArtistique.motionIdentity.microInteractions[].trigger` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.motionIdentity.microInteractions[].animation` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `directionArtistique.brandGuidelines` | `object` | — |  |  |
|     `directionArtistique.brandGuidelines.gloryOutputId` | `string` | — |  |  |
|     `directionArtistique.brandGuidelines.sections` | `array<object>` | — |  |  |
|       `directionArtistique.brandGuidelines.sections[].title` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.brandGuidelines.sections[].content` | `string` | ✓ | min 1 car. |  |
|     `directionArtistique.brandGuidelines.dosAndDonts` | `array<object>` | — |  |  |
|       `directionArtistique.brandGuidelines.dosAndDonts[].do` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.brandGuidelines.dosAndDonts[].dont` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `directionArtistique.brandGuidelines.applicationExamples` | `array<object>` | — |  |  |
|       `directionArtistique.brandGuidelines.applicationExamples[].medium` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.brandGuidelines.applicationExamples[].description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `directionArtistique.lsiMatrix` | `object` | — |  |  |
|     `directionArtistique.lsiMatrix.concepts` | `array<string>` | — | min 3 car. · max 5 car. |  |
|     `directionArtistique.lsiMatrix.layers` | `record<string, array>` | — |  |  |
|     `directionArtistique.lsiMatrix.sublimationRules` | `array<object>` | — |  |  |
|       `directionArtistique.lsiMatrix.sublimationRules[].literal` | `string` | ✓ | min 1 car. · max 200 car. |  |
|       `directionArtistique.lsiMatrix.sublimationRules[].sublimated` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `sacredObjects` | `array<object>` | — |  | Les objets sacrés de la marque — artefacts qui incarnent son identité |
|   `sacredObjects[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacredObjects[].form` | `string` | — | min 1 car. · max 200 car. |  |
|   `sacredObjects[].narrative` | `string` | — | min 1 car. · max 200 car. |  |
|   `sacredObjects[].stage` | `string` | — | min 1 car. · max 200 car. |  |
|   `sacredObjects[].socialSignal` | `string` | — | min 1 car. · max 200 car. |  |
| `proofPoints` | `array<object>` | — |  | Les preuves tangibles des promesses de la marque |
|   `proofPoints[].type` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `proofPoints[].claim` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `proofPoints[].evidence` | `string` | — | min 1 car. · max 200 car. |  |
|   `proofPoints[].source` | `string` | — | min 1 car. · max 200 car. |  |
| `symboles` | `array<object>` | — |  | Les symboles visuels et culturels associés à la marque |
|   `symboles[].symbol` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `symboles[].meanings` | `array<string>` | — |  |  |
|   `symboles[].usageContexts` | `array<string>` | — |  |  |
| `positionnementEmotionnel` | `string` | — | max 200 car. | Le ressenti unique que la marque déclenche chez son audience (distinct du positionnement business) _(code D6)_ |
| `swotFlash` | `object` | — |  | SWOT version courte (1 phrase par quadrant) — usage marketing rapide vs r.globalSwot exhaustif _(code D7)_ |
|   `swotFlash.strength` | `string` | ✓ | max 120 car. |  |
|   `swotFlash.weakness` | `string` | ✓ | max 120 car. |  |
|   `swotFlash.opportunity` | `string` | ✓ | max 120 car. |  |
|   `swotFlash.threat` | `string` | ✓ | max 120 car. |  |
| `esov` | `object` | — |  | Excess Share of Voice — écart entre part de voix et part de marché _(code D10)_ |
|   `esov.value` | `number` | ✓ | > -1 · < 1 |  |
|   `esov.measurementMethod` | `string` | ✓ | min 1 car. |  |
|   `esov.lastMeasured` | `string` | ✓ |  |  |
|   `esov.source` | `string` | ✓ | min 1 car. |  |
| `barriersImitation` | `array<object>` | — |  | Barrières à l'imitation par la concurrence (au-delà de la PI) _(code D11)_ |
|   `barriersImitation[].barrier` | `string` | ✓ | min 40 car. |  |
|   `barriersImitation[].defensibility` | `enum` | ✓ | valeurs: LOW, MEDIUM, HIGH |  |
|   `barriersImitation[].expectedDuration` | `number` | — | safeint |  |
|   `barriersImitation[].category` | `enum` | — | valeurs: data, network, brand, process, cost |  |
| `storyEvidenceRatio` | `object` | — |  | Ratio Storytelling/Evidence dans la communication (équilibre récit / preuve) _(code D12)_ |
|   `storyEvidenceRatio.storytellingPct` | `number` | ✓ | > 0 · < 100 |  |
|   `storyEvidenceRatio.evidencePct` | `number` | ✓ | > 0 · < 100 |  |
|   `storyEvidenceRatio.target` | `string` | — |  |  |

---

## Pilier V — Valeur

_ADVE — fondateur (édition manuelle)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `businessModel` | `string` | — | min 1 car. | Le modèle d'affaires fondamental |
| `economicModels` | `array<string>` | — |  | Les modèles économiques de capture de valeur |
| `positioningArchetype` | `string` | — | min 1 car. | L'archétype de positionnement prix (de ultra-luxe à low-cost) |
| `salesChannel` | `enum` | — | valeurs: DIRECT, INTERMEDIATED, HYBRID | Le canal de vente principal — comment le produit atteint le client final |
| `freeLayer` | `object` | — |  | Pour les modèles freemium : ce qui est gratuit vs payant |
|   `freeLayer.whatIsFree` | `string` | ✓ | min 1 car. |  |
|   `freeLayer.whatIsPaid` | `string` | ✓ | min 1 car. |  |
|   `freeLayer.conversionLever` | `string` | ✓ | min 1 car. |  |
| `pricingJustification` | `string` | — | min 1 car. | Pourquoi CE prix pour CE positionnement |
| `personaSegmentMap` | `array<object>` | — |  | Quel persona (D) achète quel produit (V) à quel niveau Devotion |
|   `personaSegmentMap[].personaName` | `string` | ✓ | min 1 car. |  |
|   `personaSegmentMap[].productNames` | `array<string>` | ✓ |  |  |
|   `personaSegmentMap[].devotionLevel` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `personaSegmentMap[].revenueContributionPct` | `number` | — | > 0 · < 100 |  |
| `produitsCatalogue` | `array<object>` | ✓ | min 1 car. · max 50 car. | Le catalogue complet des produits/services de la marque |
|   `produitsCatalogue[].id` | `string` | — | min 1 car. · max 200 car. |  |
|   `produitsCatalogue[].nom` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `produitsCatalogue[].categorie` | `enum` | ✓ | valeurs: PRODUIT_PHYSIQUE, SERVICE, ABONNEMENT, LICENCE, FORMATION, EXPERIENCE, CONTENU, PLATEFORME, CONSEIL, CUSTOM |  |
|   `produitsCatalogue[].prix` | `number` | — | > 0 |  |
|   `produitsCatalogue[].cout` | `number` | — | > 0 |  |
|   `produitsCatalogue[].margeUnitaire` | `number` | — | > 0 |  |
|   `produitsCatalogue[].gainClientConcret` | `string` | ✓ | min 1 car. |  |
|   `produitsCatalogue[].gainClientAbstrait` | `string` | ✓ | min 1 car. |  |
|   `produitsCatalogue[].gainMarqueConcret` | `string` | — | min 1 car. |  |
|   `produitsCatalogue[].gainMarqueAbstrait` | `string` | — | min 1 car. |  |
|   `produitsCatalogue[].coutClientConcret` | `string` | — | min 1 car. |  |
|   `produitsCatalogue[].coutClientAbstrait` | `string` | — | min 1 car. |  |
|   `produitsCatalogue[].coutMarqueConcret` | `number` | — | > 0 |  |
|   `produitsCatalogue[].coutMarqueAbstrait` | `string` | — | min 1 car. |  |
|   `produitsCatalogue[].lienPromesse` | `string` | ✓ | min 1 car. |  |
|   `produitsCatalogue[].segmentCible` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `produitsCatalogue[].phaseLifecycle` | `enum` | ✓ | valeurs: LAUNCH, GROWTH, MATURITY, DECLINE |  |
|   `produitsCatalogue[].leviersPsychologiques` | `array<string>` | — | min 1 car. |  |
|   `produitsCatalogue[].maslowMapping` | `enum` | — | valeurs: PHYSIOLOGICAL, SAFETY, BELONGING, ESTEEM, SELF_ACTUALIZATION |  |
|   `produitsCatalogue[].lf8Trigger` | `array<enum>` | — | min 1 car. · max 3 car. · valeurs: SURVIE_SANTE, NOURRITURE_PLAISIR, LIBERTE_DANGER, COMPAGNON_SEXUEL, CONDITIONS_CONFORT, SUPERIORITE_STATUT, PROTECTION_PROCHES, APPROBATION_SOCIALE |  |
|   `produitsCatalogue[].scoreEmotionnelADVE` | `number` | — | > 0 · < 100 |  |
|   `produitsCatalogue[].canalDistribution` | `array<enum>` | ✓ | min 1 car. · valeurs: INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, WEBSITE, APP, EMAIL, SMS, PACKAGING, PLV, OOH, PRINT, EVENT, POPUP, PR, TV, RADIO, VIDEO |  |
|   `produitsCatalogue[].disponibilite` | `enum` | — | valeurs: ALWAYS, SEASONAL, LIMITED, PRE_ORDER, PENDING |  |
|   `produitsCatalogue[].skuRef` | `string` | — | min 1 car. · max 200 car. |  |
| `productLadder` | `array<object>` | ✓ | min 2 car. · max 5 car. | L'échelle de produits par tier (entrée de gamme → premium) |
|   `productLadder[].tier` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `productLadder[].prix` | `number` | — | > 0 |  |
|   `productLadder[].produitIds` | `array<string>` | ✓ | min 1 car. |  |
|   `productLadder[].cible` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `productLadder[].description` | `string` | ✓ | min 1 car. |  |
|   `productLadder[].position` | `number` | ✓ | safeint · > 1 |  |
| `unitEconomics` | `object` | ✓ |  | Les métriques économiques unitaires de la marque |
|   `unitEconomics.cac` | `number` | — | > 0 |  |
|   `unitEconomics.ltv` | `number` | — | > 0 |  |
|   `unitEconomics.ltvCacRatio` | `number` | — |  |  |
|   `unitEconomics.pointMort` | `string` | — | min 1 car. · max 200 car. |  |
|   `unitEconomics.margeNette` | `number` | — |  |  |
|   `unitEconomics.roiEstime` | `number` | — | > 0 · < 100 |  |
|   `unitEconomics.paybackPeriod` | `number` | — |  |  |
|   `unitEconomics.budgetCom` | `number` | ✓ | > 0 |  |
|   `unitEconomics.caVise` | `number` | ✓ | > 0 |  |
| `promesseDeValeur` | `string` | — | min 1 car. | La proposition de valeur globale de la marque (synthèse V) |
| `valeurMarqueTangible` | `array<string>` | — |  | Valeurs tangibles créées pour la marque |
| `valeurMarqueIntangible` | `array<string>` | — |  | Valeurs intangibles créées pour la marque |
| `valeurClientTangible` | `array<string>` | — |  | Bénéfices fonctionnels pour le client |
| `valeurClientIntangible` | `array<string>` | — |  | Bénéfices émotionnels et sociaux pour le client |
| `coutMarqueTangible` | `array<string>` | — |  | Coûts tangibles pour la marque (CAPEX, production) |
| `coutMarqueIntangible` | `array<string>` | — |  | Coûts cachés pour la marque (complexité, risques) |
| `coutClientTangible` | `array<string>` | — |  | Frictions pour le client (prix, délai, effort) |
| `coutClientIntangible` | `array<string>` | — |  | Coûts psychologiques pour le client (peur, honte, doute) |
| `mvp` | `object` | — |  | Statut du produit/prototype (Berkus: Product/Prototype milestone) |
|   `mvp.exists` | `boolean` | ✓ |  |  |
|   `mvp.stage` | `enum` | ✓ | valeurs: IDEA, POC, PROTOTYPE, MVP, PRODUCT, SCALED |  |
|   `mvp.description` | `string` | ✓ | min 1 car. |  |
|   `mvp.features` | `array<string>` | — |  |  |
|   `mvp.launchDate` | `string` | — |  |  |
|   `mvp.userCount` | `number` | — | > 0 |  |
|   `mvp.feedbackSummary` | `string` | — |  |  |
| `proprieteIntellectuelle` | `object` | — |  | Brevets, secrets commerciaux, barrières à l'entrée (Berkus: IP milestone) |
|   `proprieteIntellectuelle.brevets` | `array<object>` | — |  |  |
|     `proprieteIntellectuelle.brevets[].titre` | `string` | ✓ | min 1 car. |  |
|     `proprieteIntellectuelle.brevets[].statut` | `enum` | ✓ | valeurs: DEPOSE, EN_COURS, ACCORDE, REFUSE |  |
|     `proprieteIntellectuelle.brevets[].numero` | `string` | — |  |  |
|   `proprieteIntellectuelle.secretsCommerciaux` | `array<string>` | — |  |  |
|   `proprieteIntellectuelle.technologieProprietary` | `string` | — |  |  |
|   `proprieteIntellectuelle.barrieresEntree` | `array<string>` | — |  |  |
|   `proprieteIntellectuelle.licences` | `array<object>` | — |  |  |
|     `proprieteIntellectuelle.licences[].nom` | `string` | ✓ | min 1 car. |  |
|     `proprieteIntellectuelle.licences[].type` | `string` | ✓ | min 1 car. |  |
|   `proprieteIntellectuelle.protectionScore` | `number` | — | > 0 · < 10 |  |
| `roiProofs` | `array<object>` | — |  | Preuves chiffrées de ROI client — testimoniaux quantifiés _(code V7)_ |
|   `roiProofs[].client` | `string` | — |  |  |
|   `roiProofs[].beforeMetric` | `string` | ✓ | min 1 car. |  |
|   `roiProofs[].afterMetric` | `string` | ✓ | min 1 car. |  |
|   `roiProofs[].lift` | `string` | ✓ | min 1 car. |  |
|   `roiProofs[].timeframe` | `string` | ✓ | min 1 car. |  |
|   `roiProofs[].attestation` | `string` | — |  |  |
| `experienceMultisensorielle` | `object` | — |  | Architecture des 5 sens — comment la marque engage chaque modalité sensorielle _(code V-MultiSens)_ |
|   `experienceMultisensorielle.vue` | `string` | — |  |  |
|   `experienceMultisensorielle.ouie` | `string` | — |  |  |
|   `experienceMultisensorielle.odorat` | `string` | — |  |  |
|   `experienceMultisensorielle.toucher` | `string` | — |  |  |
|   `experienceMultisensorielle.gout` | `string` | — |  |  |
| `sacrificeRequis` | `object` | — |  | Le sacrifice demandé au client (prix, temps, effort) et sa justification _(code V-Sacrifice)_ |
|   `sacrificeRequis.prix` | `string` | — |  |  |
|   `sacrificeRequis.temps` | `string` | — |  |  |
|   `sacrificeRequis.effort` | `string` | — |  |  |
|   `sacrificeRequis.justification` | `string` | ✓ | min 1 car. |  |
| `packagingExperience` | `object` | — |  | L'expérience d'unboxing / réception / découverte du produit _(code V-Packaging)_ |
|   `packagingExperience.unboxingRitual` | `array<string>` | — |  |  |
|   `packagingExperience.packagingMaterial` | `enum` | — | valeurs: premium, standard, eco |  |
|   `packagingExperience.deliveryMode` | `enum` | — | valeurs: express, standard, event |  |
|   `packagingExperience.sensoryNotes` | `string` | — |  |  |
|   `packagingExperience.instagrammable` | `boolean` | — |  |  |

---

## Pilier E — Engagement

_ADVE — fondateur (édition manuelle)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `promesseExperience` | `string` | — | min 1 car. | L'expérience que chaque interaction avec la marque garantit |
| `primaryChannel` | `enum` | — | valeurs: INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, WEBSITE, APP, EMAIL, SMS, PACKAGING, PLV, OOH, PRINT, EVENT, POPUP, PR, TV, RADIO, VIDEO | Canal principal d'engagement de la marque |
| `superfanPortrait` | `object` | — |  | Le profil du superfan cible — l'évangéliste qu'on vise |
|   `superfanPortrait.personaRef` | `string` | — | min 1 car. |  |
|   `superfanPortrait.motivations` | `array<string>` | — |  |  |
|   `superfanPortrait.barriers` | `array<string>` | — |  |  |
|   `superfanPortrait.profile` | `string` | — | min 1 car. |  |
| `productExperienceMap` | `array<object>` | — |  | Comment chaque produit (V) se traduit en expérience |
|   `productExperienceMap[].productRef` | `string` | ✓ | min 1 car. |  |
|   `productExperienceMap[].experienceDescription` | `string` | ✓ | min 1 car. |  |
|   `productExperienceMap[].touchpointRefs` | `array<string>` | — |  |  |
|   `productExperienceMap[].emotionalOutcome` | `string` | — | min 1 car. |  |
| `ladderProductAlignment` | `array<object>` | — |  | Mapping Devotion Ladder ↔ Product Ladder |
|   `ladderProductAlignment[].devotionLevel` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `ladderProductAlignment[].productTierRef` | `string` | — | min 1 car. |  |
|   `ladderProductAlignment[].entryAction` | `string` | — | min 1 car. |  |
|   `ladderProductAlignment[].upgradeAction` | `string` | — | min 1 car. |  |
| `channelTouchpointMap` | `array<object>` | — |  | Quels touchpoints sur quels canaux de vente |
|   `channelTouchpointMap[].salesChannel` | `enum` | ✓ | valeurs: DIRECT, INTERMEDIATED, HYBRID |  |
|   `channelTouchpointMap[].touchpointRefs` | `array<string>` | ✓ |  |  |
| `conversionTriggers` | `array<object>` | — |  | Ce qui fait passer quelqu'un d'un niveau Devotion au suivant |
|   `conversionTriggers[].fromLevel` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `conversionTriggers[].toLevel` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `conversionTriggers[].trigger` | `string` | ✓ | min 1 car. |  |
|   `conversionTriggers[].channel` | `string` | — | min 1 car. |  |
| `barriersEngagement` | `array<object>` | — |  | Ce qui bloque la montée dans la Devotion Ladder |
|   `barriersEngagement[].level` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `barriersEngagement[].barrier` | `string` | ✓ | min 1 car. |  |
|   `barriersEngagement[].mitigation` | `string` | — | min 1 car. |  |
| `touchpoints` | `array<object>` | ✓ | min 5 car. · max 15 car. | Les 5-15 points de contact entre la marque et son audience |
|   `touchpoints[].canal` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `touchpoints[].type` | `enum` | ✓ | valeurs: PHYSIQUE, DIGITAL, HUMAIN |  |
|   `touchpoints[].channelRef` | `enum` | ✓ | valeurs: INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, WEBSITE, APP, EMAIL, SMS, PACKAGING, PLV, OOH, PRINT, EVENT, POPUP, PR, TV, RADIO, VIDEO |  |
|   `touchpoints[].role` | `string` | ✓ | min 1 car. |  |
|   `touchpoints[].aarrStage` | `enum` | ✓ | valeurs: ACQUISITION, ACTIVATION, RETENTION, REVENUE, REFERRAL |  |
|   `touchpoints[].devotionLevel` | `array<enum>` | ✓ | min 1 car. · valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `touchpoints[].priority` | `number` | — | safeint · > 1 |  |
|   `touchpoints[].frequency` | `enum` | — | valeurs: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, AD_HOC |  |
| `rituels` | `array<object>` | ✓ | min 3 car. · max 10 car. | Les 3-10 rituels de marque qui créent l'habitude et la fidélité |
|   `rituels[].nom` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `rituels[].type` | `enum` | ✓ | valeurs: ALWAYS_ON, CYCLIQUE |  |
|   `rituels[].frequency` | `enum` | — | valeurs: DAILY, WEEKLY, MONTHLY, YEARLY, SEASONAL, AD_HOC |  |
|   `rituels[].description` | `string` | ✓ | min 1 car. |  |
|   `rituels[].devotionLevels` | `array<enum>` | ✓ | min 1 car. · valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `rituels[].touchpoints` | `array<string>` | — |  |  |
|   `rituels[].aarrPrimary` | `enum` | ✓ | valeurs: ACQUISITION, ACTIVATION, RETENTION, REVENUE, REFERRAL |  |
|   `rituels[].kpiMeasure` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `principesCommunautaires` | `array<object>` | — | min 3 car. | Les règles de la communauté de marque |
|   `principesCommunautaires[].principle` | `string` | ✓ | min 1 car. |  |
|   `principesCommunautaires[].enforcement` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `gamification` | `object` | — |  | Système de progression ludique |
|   `gamification.niveaux` | `array<object>` | ✓ | min 3 car. |  |
|     `gamification.niveaux[].niveau` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `gamification.niveaux[].condition` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `gamification.niveaux[].reward` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `gamification.niveaux[].duration` | `string` | — | min 1 car. · max 200 car. |  |
|   `gamification.recompenses` | `array<string>` | — |  |  |
| `aarrr` | `object` | ✓ |  | Le funnel AARRR appliqué à la marque |
|   `aarrr.acquisition` | `string` | ✓ | min 1 car. |  |
|   `aarrr.activation` | `string` | ✓ | min 1 car. |  |
|   `aarrr.retention` | `string` | ✓ | min 1 car. |  |
|   `aarrr.revenue` | `string` | ✓ | min 1 car. |  |
|   `aarrr.referral` | `string` | ✓ | min 1 car. |  |
| `kpis` | `array<object>` | ✓ | min 6 car. | Les KPIs de mesure d'engagement |
|   `kpis[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `kpis[].metricType` | `enum` | ✓ | valeurs: ENGAGEMENT, FINANCIAL, BEHAVIORAL, SATISFACTION |  |
|   `kpis[].target` | `number` | ✓ |  |  |
|   `kpis[].frequency` | `enum` | ✓ | valeurs: DAILY, WEEKLY, MONTHLY |  |
| `taboos` | `array<object>` | — |  | Les tabous de la communauté — ce qu'on ne fait JAMAIS |
|   `taboos[].taboo` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `taboos[].consequence` | `string` | — | min 1 car. · max 200 car. |  |
| `sacredCalendar` | `array<object>` | — | min 4 car. | Le calendrier sacré de la marque — dates et moments clés |
|   `sacredCalendar[].date` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacredCalendar[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacredCalendar[].significance` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `commandments` | `array<object>` | — | max 10 car. | Les commandements de la marque — règles non-négociables |
|   `commandments[].commandment` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `commandments[].justification` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `ritesDePassage` | `array<object>` | — |  | Les rituels de transition entre niveaux Devotion |
|   `ritesDePassage[].fromStage` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `ritesDePassage[].toStage` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `ritesDePassage[].rituelEntree` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `ritesDePassage[].symboles` | `array<string>` | — |  |  |
| `sacraments` | `array<object>` | — | min 5 car. | Les sacrements de la marque — moments d'engagement profond |
|   `sacraments[].nomSacre` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacraments[].trigger` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacraments[].action` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacraments[].reward` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacraments[].kpi` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sacraments[].aarrStage` | `enum` | ✓ | valeurs: ACQUISITION, ACTIVATION, RETENTION, REVENUE, REFERRAL |  |
| `clergeStructure` | `object` | — |  | Le Clergé — équipe d'incarnation de la marque (CM, ambassadeurs, evangelists, support) _(code E-Clerge)_ |
|   `clergeStructure.communityManager` | `object` | — |  |  |
|     `clergeStructure.communityManager.name` | `string` | ✓ | min 1 car. |  |
|     `clergeStructure.communityManager.role` | `string` | ✓ | min 1 car. |  |
|     `clergeStructure.communityManager.status` | `enum` | ✓ | valeurs: FULL_TIME, PART_TIME, VOLUNTEER |  |
|   `clergeStructure.ambassadeurs` | `array<object>` | — |  |  |
|     `clergeStructure.ambassadeurs[].name` | `string` | ✓ | min 1 car. |  |
|     `clergeStructure.ambassadeurs[].reach` | `number` | — | safeint |  |
|     `clergeStructure.ambassadeurs[].tier` | `enum` | — | valeurs: ALPHA, BETA, MICRO |  |
|   `clergeStructure.supportTeam` | `object` | — |  |  |
|     `clergeStructure.supportTeam.size` | `number` | ✓ | safeint · > 0 |  |
|     `clergeStructure.supportTeam.sla` | `string` | — |  |  |
|   `clergeStructure.specialists` | `array<object>` | — |  |  |
|     `clergeStructure.specialists[].name` | `string` | ✓ | min 1 car. |  |
|     `clergeStructure.specialists[].expertise` | `string` | ✓ | min 1 car. |  |
| `pelerinages` | `array<object>` | — |  | Les Pèlerinages — événements majeurs (vs touchpoints quotidiens en e.touchpoints) _(code E-Pelerinages)_ |
|   `pelerinages[].name` | `string` | ✓ | min 1 car. |  |
|   `pelerinages[].frequency` | `enum` | ✓ | valeurs: ANNUAL, BIANNUAL, QUARTERLY |  |
|   `pelerinages[].location` | `string` | ✓ | min 1 car. |  |
|   `pelerinages[].expectedAttendance` | `number` | — | safeint · > 0 |  |
|   `pelerinages[].devotionLevelTarget` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `pelerinages[].entryRitual` | `string` | — |  |  |
| `programmeEvangelisation` | `object` | — |  | Système qui transforme clients en recruteurs actifs _(code E-Evangelisation)_ |
|   `programmeEvangelisation.referralProgram` | `object` | — |  |  |
|     `programmeEvangelisation.referralProgram.incentive` | `string` | ✓ | min 1 car. |  |
|     `programmeEvangelisation.referralProgram.viralCoefficient` | `number` | — |  |  |
|     `programmeEvangelisation.referralProgram.launchedAt` | `string` | — |  |  |
|   `programmeEvangelisation.brandAdvocacyProgram` | `object` | — |  |  |
|     `programmeEvangelisation.brandAdvocacyProgram.tiers` | `array<string>` | — |  |  |
|     `programmeEvangelisation.brandAdvocacyProgram.rewards` | `string` | — |  |  |
|     `programmeEvangelisation.brandAdvocacyProgram.kpi` | `string` | — |  |  |
|   `programmeEvangelisation.communityRecruitment` | `object` | — |  |  |
|     `programmeEvangelisation.communityRecruitment.channels` | `array<string>` | — |  |  |
|     `programmeEvangelisation.communityRecruitment.conversionRate` | `number` | — |  |  |
| `communityBuilding` | `object` | — |  | Architecture de construction communautaire (vs e.principesCommunautaires qui sont les règles) _(code E-Community)_ |
|   `communityBuilding.platforms` | `array<object>` | — | min 1 car. |  |
|     `communityBuilding.platforms[].name` | `string` | ✓ | min 1 car. |  |
|     `communityBuilding.platforms[].type` | `enum` | ✓ | valeurs: DISCORD, SLACK, FACEBOOK_GROUP, FORUM, CIRCLE, OTHER |  |
|     `communityBuilding.platforms[].memberCount` | `number` | — | safeint · > 0 |  |
|   `communityBuilding.moderationRules` | `array<string>` | — | min 3 car. |  |
|   `communityBuilding.growthMechanics` | `array<enum>` | — | valeurs: referral, content, events |  |

---

## Pilier R — Risk

_RTIS — dérivé (régénéré par cascade)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `pillarGaps` | `object` | — |  | Diagnostic par pilier ADVE — score + lacunes |
|   `pillarGaps.a` | `object` | — |  |  |
|     `pillarGaps.a.score` | `number` | — |  |  |
|     `pillarGaps.a.gaps` | `array<string>` | — |  |  |
|   `pillarGaps.d` | `object` | — |  |  |
|     `pillarGaps.d.score` | `number` | — |  |  |
|     `pillarGaps.d.gaps` | `array<string>` | — |  |  |
|   `pillarGaps.v` | `object` | — |  |  |
|     `pillarGaps.v.score` | `number` | — |  |  |
|     `pillarGaps.v.gaps` | `array<string>` | — |  |  |
|   `pillarGaps.e` | `object` | — |  |  |
|     `pillarGaps.e.score` | `number` | — |  |  |
|     `pillarGaps.e.gaps` | `array<string>` | — |  |  |
| `coherenceRisks` | `array<object>` | — |  | Contradictions détectées entre piliers |
|   `coherenceRisks[].pillar1` | `string` | ✓ | min 1 car. |  |
|   `coherenceRisks[].pillar2` | `string` | ✓ | min 1 car. |  |
|   `coherenceRisks[].field1` | `string` | ✓ | min 1 car. |  |
|   `coherenceRisks[].field2` | `string` | ✓ | min 1 car. |  |
|   `coherenceRisks[].contradiction` | `string` | ✓ | min 1 car. |  |
|   `coherenceRisks[].severity` | `enum` | ✓ | valeurs: LOW, MEDIUM, HIGH |  |
| `overtonBlockers` | `array<object>` | — |  | Les risques qui bloquent spécifiquement le déplacement de la Fenêtre d'Overton |
|   `overtonBlockers[].risk` | `string` | ✓ | min 1 car. |  |
|   `overtonBlockers[].blockingPerception` | `string` | ✓ | min 1 car. |  |
|   `overtonBlockers[].mitigation` | `string` | ✓ | min 1 car. |  |
|   `overtonBlockers[].devotionLevelBlocked` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
| `devotionVulnerabilities` | `array<object>` | — |  | Niveaux de la Devotion Ladder où la marque perd du monde |
|   `devotionVulnerabilities[].level` | `enum` | ✓ | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `devotionVulnerabilities[].churnCause` | `string` | ✓ | min 1 car. |  |
|   `devotionVulnerabilities[].mitigation` | `string` | — | min 1 car. |  |
| `microSWOTs` | `record<string, object>` | — |  | SWOT detaille par pilier ADVE — forces/faiblesses/opportunites/menaces specifiques a chaque dimension |
|   `microSWOTs.{clé}.strengths` | `array<string>` | ✓ | min 3 car. |  |
|   `microSWOTs.{clé}.weaknesses` | `array<string>` | ✓ | min 3 car. |  |
|   `microSWOTs.{clé}.opportunities` | `array<string>` | ✓ | min 3 car. |  |
|   `microSWOTs.{clé}.threats` | `array<string>` | ✓ | min 3 car. |  |
| `globalSwot` | `object` | ✓ |  | Analyse SWOT globale de la marque |
|   `globalSwot.strengths` | `array<string>` | ✓ | min 3 car. |  |
|   `globalSwot.weaknesses` | `array<string>` | ✓ | min 3 car. |  |
|   `globalSwot.opportunities` | `array<string>` | ✓ | min 3 car. |  |
|   `globalSwot.threats` | `array<string>` | ✓ | min 3 car. |  |
| `probabilityImpactMatrix` | `array<object>` | ✓ | min 5 car. | Matrice de risques avec probabilité × impact |
|   `probabilityImpactMatrix[].risk` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `probabilityImpactMatrix[].probability` | `enum` | ✓ | valeurs: LOW, MEDIUM, HIGH |  |
|   `probabilityImpactMatrix[].impact` | `enum` | ✓ | valeurs: LOW, MEDIUM, HIGH |  |
|   `probabilityImpactMatrix[].mitigation` | `string` | ✓ | min 1 car. |  |
|   `probabilityImpactMatrix[].id` | `string` | — | string_format |  |
|   `probabilityImpactMatrix[].severity` | `number` | — | > 0 · < 100 |  |
|   `probabilityImpactMatrix[].status` | `enum` | — | valeurs: UNMITIGATED, MITIGATED, ACCEPTED |  |
|   `probabilityImpactMatrix[].category` | `enum` | — | valeurs: COHERENCE, OVERTON, DEVOTION, MARKET |  |
| `mitigationPriorities` | `array<object>` | ✓ | min 5 car. | Actions de mitigation prioritaires |
|   `mitigationPriorities[].action` | `string` | ✓ | min 1 car. |  |
|   `mitigationPriorities[].owner` | `string` | — | min 1 car. · max 200 car. |  |
|   `mitigationPriorities[].timeline` | `string` | — | min 1 car. · max 200 car. |  |
|   `mitigationPriorities[].investment` | `string` | — | min 1 car. · max 200 car. |  |
| `riskScore` | `number` | — | > 0 · < 100 | Score de risque global 0-100 (0 = pas de risque, 100 = risque maximal) |

---

## Pilier T — Track

_RTIS — dérivé (régénéré par cascade)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `riskValidation` | `array<object>` | — |  | Chaque risque R confronté au marché |
|   `riskValidation[].riskRef` | `string` | — | min 1 car. |  |
|   `riskValidation[].riskId` | `string` | — | string_format |  |
|   `riskValidation[].marketEvidence` | `string` | ✓ | min 1 car. |  |
|   `riskValidation[].status` | `enum` | ✓ | valeurs: CONFIRMED, DENIED, UNKNOWN |  |
|   `riskValidation[].source` | `enum` | — | valeurs: ai_estimate, verified, calculated, operator_input |  |
| `overtonPosition` | `object` | — |  | La position actuelle de la Fenêtre d'Overton — comment le marché perçoit la marque MAINTENANT |
|   `overtonPosition.currentPerception` | `string` | ✓ | min 1 car. |  |
|   `overtonPosition.marketSegments` | `array<object>` | — |  |  |
|     `overtonPosition.marketSegments[].segment` | `string` | ✓ | min 1 car. |  |
|     `overtonPosition.marketSegments[].perception` | `string` | ✓ | min 1 car. |  |
|   `overtonPosition.measurementMethod` | `string` | — | min 1 car. |  |
|   `overtonPosition.measuredAt` | `string` | — |  |  |
|   `overtonPosition.confidence` | `number` | — | > 0 · < 1 |  |
| `perceptionGap` | `object` | — |  | L'écart entre la perception actuelle (T) et la perception cible (A.prophecy + D.positionnement) |
|   `perceptionGap.currentPerception` | `string` | ✓ | min 1 car. |  |
|   `perceptionGap.targetPerception` | `string` | ✓ | min 1 car. |  |
|   `perceptionGap.gapDescription` | `string` | ✓ | min 1 car. |  |
|   `perceptionGap.gapScore` | `number` | — | > 0 · < 100 |  |
| `competitorOvertonPositions` | `array<object>` | — |  | Position des concurrents sur la Fenêtre d'Overton |
|   `competitorOvertonPositions[].competitorName` | `string` | ✓ | min 1 car. |  |
|   `competitorOvertonPositions[].overtonPosition` | `string` | ✓ | min 1 car. |  |
|   `competitorOvertonPositions[].relativeToUs` | `enum` | — | valeurs: AHEAD, BEHIND, PARALLEL, DIVERGENT |  |
| `triangulation` | `object` | ✓ |  | Croisement de 4 sources de données marché |
|   `triangulation.customerInterviews` | `string` | — | min 1 car. |  |
|   `triangulation.competitiveAnalysis` | `string` | — | min 1 car. |  |
|   `triangulation.trendAnalysis` | `string` | — | min 1 car. |  |
|   `triangulation.financialBenchmarks` | `string` | — | min 1 car. |  |
| `hypothesisValidation` | `array<object>` | ✓ | min 5 car. | Hypothèses de marché à valider |
|   `hypothesisValidation[].id` | `string` | — | string_format |  |
|   `hypothesisValidation[].hypothesis` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `hypothesisValidation[].validationMethod` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `hypothesisValidation[].status` | `enum` | ✓ | valeurs: HYPOTHESIS, TESTING, VALIDATED, INVALIDATED |  |
|   `hypothesisValidation[].evidence` | `string` | — | min 1 car. · max 200 car. |  |
| `marketReality` | `object` | — |  | Macro-tendances et signaux faibles du marché |
|   `marketReality.macroTrends` | `array<string>` | ✓ | min 3 car. |  |
|   `marketReality.weakSignals` | `array<string>` | ✓ | min 2 car. |  |
| `tamSamSom` | `object` | ✓ |  | Taille du marché adressable (Total, Serviceable, Obtainable) |
|   `tamSamSom.tam` | `object` | ✓ |  |  |
|     `tamSamSom.tam.value` | `number` | ✓ | > 0 |  |
|     `tamSamSom.tam.description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `tamSamSom.tam.source` | `enum` | — | valeurs: ai_estimate, verified, calculated, operator_input |  |
|     `tamSamSom.tam.sourceRef` | `string` | — |  |  |
|   `tamSamSom.sam` | `object` | ✓ |  |  |
|     `tamSamSom.sam.value` | `number` | ✓ | > 0 |  |
|     `tamSamSom.sam.description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `tamSamSom.sam.source` | `enum` | — | valeurs: ai_estimate, verified, calculated, operator_input |  |
|     `tamSamSom.sam.sourceRef` | `string` | — |  |  |
|   `tamSamSom.som` | `object` | ✓ |  |  |
|     `tamSamSom.som.value` | `number` | ✓ | > 0 |  |
|     `tamSamSom.som.description` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `tamSamSom.som.source` | `enum` | — | valeurs: ai_estimate, verified, calculated, operator_input |  |
|     `tamSamSom.som.sourceRef` | `string` | — |  |  |
| `brandMarketFitScore` | `number` | — | > 0 · < 100 | Score d'adéquation marque-marché (0-100) |
| `weakSignalAnalysis` | `array<object>` | — |  | Analyse des signaux faibles avec chaînes causales (TARSIS) |
|   `weakSignalAnalysis[].id` | `string` | — |  |  |
|   `weakSignalAnalysis[].thesis` | `string` | ✓ | min 1 car. |  |
|   `weakSignalAnalysis[].rawEvent` | `string` | ✓ | min 1 car. |  |
|   `weakSignalAnalysis[].causalChain` | `array<object>` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].causalChain[].from` | `string` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].causalChain[].to` | `string` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].causalChain[].mechanism` | `string` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].causalChain[].confidence` | `number` | ✓ | > 0 · < 1 |  |
|   `weakSignalAnalysis[].impactCategory` | `enum` | ✓ | valeurs: SUPPLY_CHAIN, PRICING, DEMAND, REGULATORY, COMPETITIVE, TECHNOLOGICAL, SOCIAL |  |
|   `weakSignalAnalysis[].brandImpact` | `string` | ✓ | min 1 car. |  |
|   `weakSignalAnalysis[].confidence` | `number` | ✓ | > 0 · < 1 |  |
|   `weakSignalAnalysis[].urgency` | `enum` | ✓ | valeurs: LOW, MEDIUM, HIGH, CRITICAL |  |
|   `weakSignalAnalysis[].relatedPillars` | `array<string>` | — |  |  |
|   `weakSignalAnalysis[].supportingSignals` | `array<object>` | — |  |  |
|     `weakSignalAnalysis[].supportingSignals[].title` | `string` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].supportingSignals[].content` | `string` | ✓ | min 1 car. |  |
|     `weakSignalAnalysis[].supportingSignals[].addedConfidence` | `number` | ✓ | > 0 · < 0.3 |  |
|     `weakSignalAnalysis[].supportingSignals[].link` | `string` | ✓ | min 1 car. |  |
|   `weakSignalAnalysis[].recommendedAction` | `string` | — | min 1 car. |  |
| `marketDataSources` | `array<object>` | — |  | Sources de données marché utilisées |
|   `marketDataSources[].sourceType` | `string` | ✓ |  |  |
|   `marketDataSources[].title` | `string` | ✓ |  |  |
|   `marketDataSources[].collectedAt` | `string` | — |  |  |
|   `marketDataSources[].reliability` | `number` | — | > 0 · < 1 |  |
| `lastMarketDataRefresh` | `string` | — |  | Date de dernière actualisation des données marché |
| `sectorKnowledgeReused` | `boolean` | — |  | Si les données sectorielles cross-brand ont été réutilisées |
| `traction` | `object` | — |  | Preuves de traction marché (Berkus: Business Relationships) |
|   `traction.loisSignees` | `array<object>` | — |  |  |
|     `traction.loisSignees[].partenaire` | `string` | ✓ | min 1 car. |  |
|     `traction.loisSignees[].type` | `enum` | ✓ | valeurs: LOI, MOU, CONTRAT, PRECOMMANDE, PILOTE |  |
|     `traction.loisSignees[].valeur` | `number` | — |  |  |
|     `traction.loisSignees[].date` | `string` | — |  |  |
|   `traction.utilisateursInscrits` | `number` | — | > 0 |  |
|   `traction.utilisateursActifs` | `number` | — | > 0 |  |
|   `traction.croissanceHebdo` | `number` | — |  |  |
|   `traction.revenusRecurrents` | `number` | — | > 0 |  |
|   `traction.metriqueCle` | `object` | — |  |  |
|     `traction.metriqueCle.nom` | `string` | ✓ | min 1 car. |  |
|     `traction.metriqueCle.valeur` | `number` | ✓ |  |  |
|     `traction.metriqueCle.tendance` | `enum` | ✓ | valeurs: UP, DOWN, STABLE |  |
|   `traction.preuvesTraction` | `array<string>` | — |  |  |
|   `traction.tractionScore` | `number` | — | > 0 · < 10 |  |

---

## Pilier I — Innovation

_RTIS — dérivé (régénéré par cascade)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `actionsByDevotionLevel` | `object` | — |  | Le catalogue trié par niveau Devotion Ladder au lieu de par canal |
|   `actionsByDevotionLevel.SPECTATEUR` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.SPECTATEUR[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.SPECTATEUR[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.SPECTATEUR[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.SPECTATEUR[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.SPECTATEUR[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.SPECTATEUR[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.SPECTATEUR[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.SPECTATEUR[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.SPECTATEUR[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.SPECTATEUR[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.SPECTATEUR[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.SPECTATEUR[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.SPECTATEUR[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.SPECTATEUR[].targetsPersonaIds` | `array<string>` | — |  |  |
|   `actionsByDevotionLevel.INTERESSE` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.INTERESSE[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.INTERESSE[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.INTERESSE[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.INTERESSE[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.INTERESSE[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.INTERESSE[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.INTERESSE[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.INTERESSE[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.INTERESSE[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.INTERESSE[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.INTERESSE[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.INTERESSE[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.INTERESSE[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.INTERESSE[].targetsPersonaIds` | `array<string>` | — |  |  |
|   `actionsByDevotionLevel.PARTICIPANT` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.PARTICIPANT[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.PARTICIPANT[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.PARTICIPANT[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.PARTICIPANT[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.PARTICIPANT[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.PARTICIPANT[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.PARTICIPANT[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.PARTICIPANT[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.PARTICIPANT[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.PARTICIPANT[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.PARTICIPANT[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.PARTICIPANT[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.PARTICIPANT[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.PARTICIPANT[].targetsPersonaIds` | `array<string>` | — |  |  |
|   `actionsByDevotionLevel.ENGAGE` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.ENGAGE[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.ENGAGE[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.ENGAGE[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.ENGAGE[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.ENGAGE[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.ENGAGE[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.ENGAGE[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.ENGAGE[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.ENGAGE[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.ENGAGE[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.ENGAGE[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.ENGAGE[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.ENGAGE[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.ENGAGE[].targetsPersonaIds` | `array<string>` | — |  |  |
|   `actionsByDevotionLevel.AMBASSADEUR` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.AMBASSADEUR[].targetsPersonaIds` | `array<string>` | — |  |  |
|   `actionsByDevotionLevel.EVANGELISTE` | `array<object>` | — |  |  |
|     `actionsByDevotionLevel.EVANGELISTE[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByDevotionLevel.EVANGELISTE[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.EVANGELISTE[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.EVANGELISTE[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByDevotionLevel.EVANGELISTE[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByDevotionLevel.EVANGELISTE[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByDevotionLevel.EVANGELISTE[].id` | `string` | — | string_format |  |
|     `actionsByDevotionLevel.EVANGELISTE[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByDevotionLevel.EVANGELISTE[].budget` | `number` | — | > 0 |  |
|     `actionsByDevotionLevel.EVANGELISTE[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByDevotionLevel.EVANGELISTE[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByDevotionLevel.EVANGELISTE[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByDevotionLevel.EVANGELISTE[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByDevotionLevel.EVANGELISTE[].targetsPersonaIds` | `array<string>` | — |  |  |
| `actionsByOvertonPhase` | `array<object>` | — |  | Actions groupées par phase de déplacement Overton |
|   `actionsByOvertonPhase[].phase` | `string` | ✓ | min 1 car. |  |
|   `actionsByOvertonPhase[].actions` | `array<object>` | ✓ |  |  |
|     `actionsByOvertonPhase[].actions[].action` | `string` | ✓ | min 1 car. |  |
|     `actionsByOvertonPhase[].actions[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByOvertonPhase[].actions[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `actionsByOvertonPhase[].actions[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `actionsByOvertonPhase[].actions[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `actionsByOvertonPhase[].actions[].overtonShift` | `string` | — | min 1 car. |  |
|     `actionsByOvertonPhase[].actions[].id` | `string` | — | string_format |  |
|     `actionsByOvertonPhase[].actions[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `actionsByOvertonPhase[].actions[].budget` | `number` | — | > 0 |  |
|     `actionsByOvertonPhase[].actions[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `actionsByOvertonPhase[].actions[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `actionsByOvertonPhase[].actions[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `actionsByOvertonPhase[].actions[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `actionsByOvertonPhase[].actions[].targetsPersonaIds` | `array<string>` | — |  |  |
| `riskMitigationActions` | `array<object>` | — |  | Actions qui mitigent spécifiquement les risques R |
|   `riskMitigationActions[].riskRef` | `string` | — | min 1 car. |  |
|   `riskMitigationActions[].riskId` | `string` | — | string_format |  |
|   `riskMitigationActions[].action` | `string` | ✓ | min 1 car. |  |
|   `riskMitigationActions[].canal` | `string` | — | min 1 car. |  |
|   `riskMitigationActions[].expectedImpact` | `string` | — | min 1 car. |  |
| `hypothesisTestActions` | `array<object>` | — |  | Actions qui testent les hypothèses T non-validées |
|   `hypothesisTestActions[].hypothesisRef` | `string` | — | min 1 car. |  |
|   `hypothesisTestActions[].hypothesisId` | `string` | — | string_format |  |
|   `hypothesisTestActions[].testAction` | `string` | ✓ | min 1 car. |  |
|   `hypothesisTestActions[].expectedOutcome` | `string` | — | min 1 car. |  |
|   `hypothesisTestActions[].cost` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
| `innovationsProduit` | `array<object>` | — |  | Les innovations produit/marque possibles — extensions, pivots, co-branding |
|   `innovationsProduit[].name` | `string` | ✓ | min 1 car. |  |
|   `innovationsProduit[].type` | `enum` | ✓ | valeurs: EXTENSION_GAMME, EXTENSION_MARQUE, CO_BRANDING, PIVOT, DIVERSIFICATION |  |
|   `innovationsProduit[].description` | `string` | ✓ | min 1 car. |  |
|   `innovationsProduit[].feasibility` | `enum` | ✓ | valeurs: HIGH, MEDIUM, LOW |  |
|   `innovationsProduit[].horizon` | `enum` | ✓ | valeurs: COURT, MOYEN, LONG |  |
|   `innovationsProduit[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
| `catalogueParCanal` | `record<string, array>` | — |  | Catalogue EXHAUSTIF de toutes les actions possibles, organisé par canal |
|   `catalogueParCanal.{clé}[]` | `array<object>` | — |  |  |
|     `catalogueParCanal.{clé}[].action` | `string` | ✓ | min 1 car. |  |
|     `catalogueParCanal.{clé}[].format` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `catalogueParCanal.{clé}[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `catalogueParCanal.{clé}[].pilierImpact` | `enum` | — | valeurs: A, D, V, E |  |
|     `catalogueParCanal.{clé}[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `catalogueParCanal.{clé}[].overtonShift` | `string` | — | min 1 car. |  |
|     `catalogueParCanal.{clé}[].id` | `string` | — | string_format |  |
|     `catalogueParCanal.{clé}[].status` | `enum` | — | valeurs: DRAFT, RECOMMENDED, SELECTED_FOR_ROADMAP, REJECTED |  |
|     `catalogueParCanal.{clé}[].budget` | `number` | — | > 0 |  |
|     `catalogueParCanal.{clé}[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
|     `catalogueParCanal.{clé}[].channel` | `string` | — | min 1 car. · max 200 car. |  |
|     `catalogueParCanal.{clé}[].timeframe` | `enum` | — | valeurs: SPRINT_90, PHASE_1, PHASE_2, LONG_TERM |  |
|     `catalogueParCanal.{clé}[].mitigatesRiskIds` | `array<string>` | — |  |  |
|     `catalogueParCanal.{clé}[].targetsPersonaIds` | `array<string>` | — |  |  |
| `assetsProduisibles` | `array<object>` | — | min 5 car. | Tous les assets créatifs que la marque peut produire |
|   `assetsProduisibles[].asset` | `string` | ✓ | min 1 car. |  |
|   `assetsProduisibles[].type` | `enum` | ✓ | valeurs: VIDEO, PRINT, DIGITAL, PHOTO, AUDIO, PACKAGING, EXPERIENCE |  |
|   `assetsProduisibles[].usage` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `activationsPossibles` | `array<object>` | — | min 5 car. | Toutes les activations terrain/digitales possibles |
|   `activationsPossibles[].activation` | `string` | ✓ | min 1 car. |  |
|   `activationsPossibles[].canal` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `activationsPossibles[].cible` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `activationsPossibles[].budgetEstime` | `enum` | — | valeurs: LOW, MEDIUM, HIGH |  |
| `formatsDisponibles` | `array<string>` | — | min 5 car. | Tous les formats créatifs possibles |
| `totalActions` | `number` | — | safeint · > 0 | Compteur total d'actions dans le catalogue |
| `brandPlatform` | `object` | — |  | Plateforme de marque — synthèse stratégique |
|   `brandPlatform.name` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.benefit` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.target` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.competitiveAdvantage` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.emotionalBenefit` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.functionalBenefit` | `string` | — | min 1 car. · max 200 car. |  |
|   `brandPlatform.supportedBy` | `string` | — | min 1 car. · max 200 car. |  |
| `copyStrategy` | `object` | — |  | Stratégie de copywriting — promesse, RTB, ton, messages clés |
|   `copyStrategy.promise` | `string` | — | min 1 car. · max 200 car. |  |
|   `copyStrategy.rtb` | `string` | — | min 1 car. · max 200 car. |  |
|   `copyStrategy.tonOfVoice` | `string` | — | min 1 car. · max 200 car. |  |
|   `copyStrategy.keyMessages` | `array<string>` | — |  |  |
|   `copyStrategy.doNot` | `array<string>` | — |  |  |
| `bigIdea` | `object` | — |  | Le concept central de la marque |
|   `bigIdea.concept` | `string` | — | min 1 car. · max 200 car. |  |
|   `bigIdea.mechanism` | `string` | — | min 1 car. · max 200 car. |  |
|   `bigIdea.insight` | `string` | — | min 1 car. · max 200 car. |  |
|   `bigIdea.adaptations` | `array<string>` | — |  |  |
| `potentielBudget` | `object` | — |  | Fourchettes budgétaires pour le potentiel identifié |
|   `potentielBudget.production` | `number` | — | > 0 |  |
|   `potentielBudget.media` | `number` | — | > 0 |  |
|   `potentielBudget.talent` | `number` | — | > 0 |  |
|   `potentielBudget.logistics` | `number` | — | > 0 |  |
|   `potentielBudget.technology` | `number` | — | > 0 |  |
|   `potentielBudget.total` | `number` | — | > 0 |  |
| `mediaPlan` | `object` | — |  | Plan media potentiel — repartition budgetaire par canal avec objectifs et KPIs |
|   `mediaPlan.totalBudget` | `number` | — | > 0 |  |
|   `mediaPlan.channels` | `array<object>` | — |  |  |
|     `mediaPlan.channels[].channel` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `mediaPlan.channels[].budget` | `number` | — | > 0 |  |
|     `mediaPlan.channels[].percentage` | `number` | — | > 0 · < 100 |  |
|     `mediaPlan.channels[].objective` | `string` | — | min 1 car. · max 200 car. |  |
|     `mediaPlan.channels[].kpi` | `string` | — | min 1 car. · max 200 car. |  |
| `generationMeta` | `object` | — |  | Métadonnées de génération du pilier I |
|   `generationMeta.gloryToolsUsed` | `array<string>` | — |  |  |
|   `generationMeta.qualityScore` | `number` | — | > 0 · < 100 |  |
|   `generationMeta.generatedAt` | `string` | — |  |  |

---

## Pilier S — Strategy

_RTIS — dérivé (régénéré par cascade)_

| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |
|---|---|:--:|---|---|
| `fenetreOverton` | `object` | — |  | La Fenêtre d'Overton — cœur narratif de S. Perception actuelle vs cible, stratégie de déplacement. DÉRIVÉE (ADR-0088), jamais saisie. |
|   `fenetreOverton.perceptionActuelle` | `string` | — | min 1 car. |  |
|   `fenetreOverton.perceptionCible` | `string` | — | min 1 car. |  |
|   `fenetreOverton.ecart` | `string` | — | min 1 car. |  |
|   `fenetreOverton.strategieDeplacement` | `array<object>` | ✓ | min 3 car. |  |
|     `fenetreOverton.strategieDeplacement[].etape` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `fenetreOverton.strategieDeplacement[].action` | `string` | ✓ | min 1 car. · max 200 car. |  |
|     `fenetreOverton.strategieDeplacement[].canal` | `string` | — | min 1 car. · max 200 car. |  |
|     `fenetreOverton.strategieDeplacement[].horizon` | `string` | — | min 1 car. · max 200 car. |  |
|     `fenetreOverton.strategieDeplacement[].devotionTarget` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|     `fenetreOverton.strategieDeplacement[].riskRef` | `string` | — |  |  |
|     `fenetreOverton.strategieDeplacement[].riskId` | `string` | — | string_format |  |
|     `fenetreOverton.strategieDeplacement[].hypothesisRef` | `string` | — |  |  |
|     `fenetreOverton.strategieDeplacement[].hypothesisId` | `string` | — | string_format |  |
| `visionStrategique` | `string` | — | min 1 car. | La vision stratégique à long terme |
| `syntheseExecutive` | `string` | — | min 1 car. | Résumé exécutif de la stratégie complète. @deprecated comme saisie (ADR-0088) — produit par le chemin de synthèse, jamais tapé. |
| `axesStrategiques` | `array<object>` | ✓ | min 3 car. | Les 3+ axes stratégiques de la marque |
|   `axesStrategiques[].axe` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `axesStrategiques[].pillarsLinked` | `array<enum>` | ✓ | min 2 car. · valeurs: A, D, V, E, R, T, I, S |  |
|   `axesStrategiques[].kpis` | `array<string>` | ✓ | min 1 car. |  |
| `facteursClesSucces` | `array<string>` | ✓ | min 3 car. | Les facteurs clés de succès de la stratégie |
| `sprint90Days` | `array<object>` | ✓ | min 5 car. | Les actions prioritaires des 90 prochains jours |
|   `sprint90Days[].action` | `string` | ✓ | min 1 car. |  |
|   `sprint90Days[].owner` | `string` | — | min 1 car. · max 200 car. |  |
|   `sprint90Days[].kpi` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `sprint90Days[].priority` | `number` | ✓ | safeint · > 1 |  |
|   `sprint90Days[].isRiskMitigation` | `boolean` | — |  |  |
|   `sprint90Days[].devotionImpact` | `enum` | — | valeurs: SPECTATEUR, INTERESSE, PARTICIPANT, ENGAGE, AMBASSADEUR, EVANGELISTE |  |
|   `sprint90Days[].sourceRef` | `string` | — |  |  |
|   `sprint90Days[].sourceInitiativeId` | `string` | — | string_format |  |
| `roadmap` | `array<object>` | — | min 3 car. | La roadmap en 3-4 phases avec objectifs Devotion |
|   `roadmap[].phase` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `roadmap[].objectif` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `roadmap[].objectifDevotion` | `string` | — | min 1 car. |  |
|   `roadmap[].actions` | `array<string>` | — |  |  |
|   `roadmap[].budget` | `number` | — | > 0 |  |
|   `roadmap[].duree` | `string` | — | min 1 car. · max 200 car. |  |
| `globalBudget` | `number` | — | > 0 | Budget total de la strategie. @deprecated saisie (ADR-0088) — voir computed.totalBudget (Σ des initiatives sélectionnées). |
| `budgetBreakdown` | `object` | — |  | Ventilation du budget par poste |
|   `budgetBreakdown.production` | `number` | — | > 0 |  |
|   `budgetBreakdown.media` | `number` | — | > 0 |  |
|   `budgetBreakdown.talent` | `number` | — | > 0 |  |
|   `budgetBreakdown.logistics` | `number` | — | > 0 |  |
|   `budgetBreakdown.technology` | `number` | — | > 0 |  |
|   `budgetBreakdown.contingency` | `number` | — | > 0 |  |
|   `budgetBreakdown.agencyFees` | `number` | — | > 0 |  |
| `teamStructure` | `array<object>` | — | min 1 car. | L'équipe mobilisée pour exécuter la stratégie |
|   `teamStructure[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `teamStructure[].title` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `teamStructure[].responsibility` | `string` | ✓ | min 1 car. · max 200 car. |  |
| `kpiDashboard` | `array<object>` | — | min 5 car. | Tableau de bord KPIs — 1 KPI par pilier minimum |
|   `kpiDashboard[].name` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `kpiDashboard[].pillar` | `enum` | ✓ | valeurs: A, D, V, E, R, T, I, S |  |
|   `kpiDashboard[].target` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `kpiDashboard[].frequency` | `enum` | ✓ | valeurs: DAILY, WEEKLY, MONTHLY, QUARTERLY |  |
| `coherenceScore` | `number` | — | > 0 · < 100 | Score de cohérence entre les piliers (0-100) |
| `selectedFromI` | `array<object>` | — |  | Les actions choisies depuis I.catalogueParCanal pour la roadmap |
|   `selectedFromI[].sourceRef` | `string` | ✓ | min 1 car. |  |
|   `selectedFromI[].sourceInitiativeId` | `string` | — | string_format |  |
|   `selectedFromI[].action` | `string` | ✓ | min 1 car. |  |
|   `selectedFromI[].phase` | `string` | — | min 1 car. |  |
|   `selectedFromI[].priority` | `number` | — | safeint · > 1 |  |
| `rejectedFromI` | `array<object>` | — |  | Actions de I explicitement non-sélectionnées pour la roadmap |
|   `rejectedFromI[].sourceRef` | `string` | ✓ | min 1 car. |  |
|   `rejectedFromI[].sourceInitiativeId` | `string` | — | string_format |  |
|   `rejectedFromI[].reason` | `string` | ✓ | min 1 car. |  |
| `devotionFunnel` | `array<object>` | — |  | Objectifs quantifiés de progression Devotion Ladder par phase de la roadmap |
|   `devotionFunnel[].phase` | `string` | ✓ | min 1 car. |  |
|   `devotionFunnel[].spectateurs` | `number` | — |  |  |
|   `devotionFunnel[].interesses` | `number` | — |  |  |
|   `devotionFunnel[].participants` | `number` | — |  |  |
|   `devotionFunnel[].engages` | `number` | — |  |  |
|   `devotionFunnel[].ambassadeurs` | `number` | — |  |  |
|   `devotionFunnel[].evangelistes` | `number` | — |  |  |
| `overtonMilestones` | `array<object>` | — |  | Jalons de déplacement de la Fenêtre d'Overton par phase |
|   `overtonMilestones[].phase` | `string` | ✓ | min 1 car. |  |
|   `overtonMilestones[].currentPerception` | `string` | ✓ | min 1 car. |  |
|   `overtonMilestones[].targetPerception` | `string` | ✓ | min 1 car. |  |
|   `overtonMilestones[].measurementMethod` | `string` | — | min 1 car. |  |
| `budgetByDevotion` | `object` | — |  | Répartition du budget par objectif Devotion Ladder |
|   `budgetByDevotion.acquisition` | `number` | — | > 0 |  |
|   `budgetByDevotion.conversion` | `number` | — | > 0 |  |
|   `budgetByDevotion.retention` | `number` | — | > 0 |  |
|   `budgetByDevotion.evangelisation` | `number` | — | > 0 |  |
| `northStarKPI` | `object` | — |  | Le KPI ultime — progression sur la Devotion Ladder |
|   `northStarKPI.name` | `string` | ✓ | min 1 car. |  |
|   `northStarKPI.target` | `string` | ✓ | min 1 car. |  |
|   `northStarKPI.frequency` | `enum` | ✓ | valeurs: DAILY, WEEKLY, MONTHLY, QUARTERLY |  |
|   `northStarKPI.currentValue` | `string` | — |  |  |
| `computed` | `object` | — |  | Tableau de bord PUREMENT CALCULÉ de S (ADR-0088 + ADR-0089) — agrégations sur le jeu de stratégie de l'ambition retenue + 3 trajectoires de roadmap (chacune avec son jeu d'initiatives/budget/couverture). Aucune saisie texte ; la seule mutation possible est la sélection d'ambition via l'Intent gouverné SELECT_ROADMAP_ROUTE. |
|   `computed.totalBudget` | `number` | — | > 0 |  |
|   `computed.budgetByPhase` | `record<enum, number>` | — |  |  |
|   `computed.riskCoverage` | `number` | — | > 0 · < 100 |  |
|   `computed.mitigatedRiskIds` | `array<string>` | — |  |  |
|   `computed.selectedInitiativeCount` | `number` | — | safeint · > 0 |  |
|   `computed.devotionFunnel` | `array<object>` | — |  |  |
|     `computed.devotionFunnel[].phase` | `string` | ✓ | min 1 car. |  |
|     `computed.devotionFunnel[].spectateurs` | `number` | — |  |  |
|     `computed.devotionFunnel[].interesses` | `number` | — |  |  |
|     `computed.devotionFunnel[].participants` | `number` | — |  |  |
|     `computed.devotionFunnel[].engages` | `number` | — |  |  |
|     `computed.devotionFunnel[].ambassadeurs` | `number` | — |  |  |
|     `computed.devotionFunnel[].evangelistes` | `number` | — |  |  |
|   `computed.overtonPosition` | `object` | — |  |  |
|     `computed.overtonPosition.current` | `string` | ✓ | min 1 car. |  |
|     `computed.overtonPosition.target` | `string` | ✓ | min 1 car. |  |
|     `computed.overtonPosition.gapScore` | `number` | — | > 0 · < 100 |  |
|   `computed.coherenceScore` | `number` | — | > 0 · < 100 |  |
|   `computed.roadmapRoutes` | `array<object>` | — | exactement 3 car. |  |
|     `computed.roadmapRoutes[].key` | `enum` | ✓ | valeurs: CONSERVATIVE, TARGET, AMBITIOUS |  |
|     `computed.roadmapRoutes[].label` | `string` | ✓ | min 1 car. |  |
|     `computed.roadmapRoutes[].recommended` | `boolean` | ✓ |  |  |
|     `computed.roadmapRoutes[].selected` | `boolean` | — |  |  |
|     `computed.roadmapRoutes[].projectedGrowthPct` | `number` | ✓ |  |  |
|     `computed.roadmapRoutes[].projectedRevenue` | `number` | — | > 0 |  |
|     `computed.roadmapRoutes[].targetCultIndex` | `number` | ✓ | > 0 · < 100 |  |
|     `computed.roadmapRoutes[].description` | `string` | ✓ | min 1 car. |  |
|     `computed.roadmapRoutes[].initiativeIds` | `array<string>` | — |  |  |
|     `computed.roadmapRoutes[].initiativeCount` | `number` | — | safeint · > 0 |  |
|     `computed.roadmapRoutes[].totalBudget` | `number` | — | > 0 |  |
|     `computed.roadmapRoutes[].budgetByPhase` | `record<enum, number>` | — |  |  |
|     `computed.roadmapRoutes[].riskCoverage` | `number` | — | > 0 · < 100 |  |
|   `computed.selectedRouteKey` | `enum` | — | valeurs: CONSERVATIVE, TARGET, AMBITIOUS |  |
|   `computed.computedAt` | `string` | — |  |  |
| `recommandationsPrioritaires` | `array<object>` | — |  | Recommandations stratégiques prioritaires |
|   `recommandationsPrioritaires[].recommendation` | `string` | ✓ | min 1 car. · max 200 car. |  |
|   `recommandationsPrioritaires[].source` | `enum` | — | valeurs: A, D, V, E, R, T, I, S |  |
|   `recommandationsPrioritaires[].priority` | `number` | — | safeint · > 1 |  |

---

## Contrôle de cohérence — entrées Bible orphelines

Entrées présentes dans `VARIABLE_BIBLE` mais sans champ de premier niveau correspondant dans le schéma Zod (drift potentiel — clé renommée ou supprimée du schéma) :

_(Aucune entrée orpheline — la Bible est alignée sur le schéma au premier niveau.)_

