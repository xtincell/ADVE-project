# ANNEXE G — Règles de Remplissage, Validation et Scoring des 8 Piliers

**Version** : 2.0
**Date** : 24 mars 2026
**Objet** : Pour chaque pilier, ce document définit les règles de remplissage (ce que Mestor vise), les critères de validation programmatique (ce que le code vérifie), et la rubrique de scoring /25. Construit sur l'Annexe H (ontologie des variables) — chaque règle référence un type N0, un atome N1, un composite N2, ou une collection N3.

> Remplace : ANNEXE G v1 Parties 1 et 2 (obsolètes — traitaient les champs comme des blocs de texte)
> Fondation : ANNEXE H v1.1 + Addendum (ontologie du système)
> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md §4.1 (`advertis-scorer`)

---

## Convention

| Symbole | Signification |
|---|---|
| `→ H:N2.XX` | Référence au composite N2.XX de l'Annexe H |
| `→ H:T.XX` | Référence à la taxonomie T.XX de l'Annexe H |
| `[S]` | Critère structural (programmatique, déterministe) |
| `[Q]` | Critère qualitatif (évalué par le quality modulator AI) |
| `[X]` | Cross-référence inter-pilier (vérifié par cohérence cross-composite) |

**Formule de scoring universelle** :

```
score_pilier = (atomes_valides / atomes_requis × 15)
             + (collections_complètes / collections_totales × 7)
             + (cross_refs_valides / cross_refs_requises × 3)
             × quality_modulator (0.70 – 1.00)
```

Sauf R et T qui utilisent leurs scores quantitatifs natifs (riskScore, bmfScore) normalisés sur /25.

---

# PILIER A — AUTHENTICITÉ (/25)

> Composite majeur : **Manifeste de marque** (→ H:N4)
> Input : A0-A6 (interview) → génération AI → extensions ARTEMIS FW-20
> Cascade : ∅ (premier pilier)

## A.1 Composites et collections

### `identite` — N2 composite (3 atomes)

| Champ | Type ontologique | Règle de remplissage | Validation `[S]` |
|---|---|---|---|
| `archetype` | `atom.archetype` → H:T.01 | Sélection de 1 archétype primaire parmi les 12 jungiens. Optionnel : 1 secondaire. Mestor déduit depuis A1 (identité) + A4 (valeurs Schwartz). L'archétype n'est pas un adjectif — c'est un pattern narratif profond. | Contient 1+ archétype de T.01. Non vide. |
| `citationFondatrice` | `atom.text_medium` | La conviction intime qui a engendré le projet. Pas un slogan — une croyance. Formulation : "Je crois que...", "Le monde a besoin de...". Si le fondateur a une vraie citation, la reprendre. Sinon, Mestor formule depuis A1. | Non vide. ≥30 chars. |
| `noyauIdentitaire` | `atom.text_medium` | L'ADN en 2-3 phrases. Ce que fait la marque, pour qui, pourquoi différemment. N'est PAS un copier-coller du positionnement D — le noyau regarde vers l'intérieur, le positionnement vers le marché. | Non vide. ≥100 chars. `[X]` Doit différer de D.positionnement (overlap < 50% par cosine similarity). |

**Scoring** : 3 pts (1/atome valide)

### `herosJourney` — N3 collection de 5 × N2.02 HeroJourneyAct

| Champ | Type | Règle | Validation `[S]` |
|---|---|---|---|
| `acte1Origines` | N2.02 `.narrative` | Le monde ordinaire avant la marque. Établir le manque. Émotion : empathie. | Non vide. ≥100 chars. |
| `acte2Appel` | N2.02 `.narrative` | Le déclencheur. Un moment de bascule identifiable, pas "nous avons décidé de lancer." | Non vide. ≥100 chars. `causalLink` implicite avec acte 1. |
| `acte3Epreuves` | N2.02 `.narrative` | Les obstacles. Au moins 1 obstacle concret. L'acte qui rend la marque humaine et crédible. | Non vide. ≥100 chars. |
| `acte4Transformation` | N2.02 `.narrative` | Le pivot. Conséquence logique de l'acte 3. Ce qui a changé concrètement. | Non vide. ≥100 chars. |
| `acte5Revelation` | N2.02 `.narrative` | La vision actuelle. Connecte passé (1-4) au futur. Doit résonner avec `citationFondatrice`. | Non vide. ≥100 chars. `[X]` Cohérent avec A.identite.citationFondatrice. |

**Scoring** : 5 pts (1/acte rempli ≥100 chars)

**`[Q]` Arc narratif** : les 5 actes doivent former une progression narrative (pas 5 paragraphes indépendants). Le quality modulator vérifie la causalité inter-actes.

### `ikigai` — N2.03 BrandIkigai

| Champ | Type | Règle | Validation `[S]` |
|---|---|---|---|
| `aimer` | `atom.text_medium` | Passion, pas métier. Spécificité requise. | Non vide. ≥50 chars. |
| `competence` | `atom.text_medium` | Savoir-faire différenciant. Vérifiable. | Non vide. ≥50 chars. `[X]` → D.paysageConcurrentiel.avantagesCompetitifs |
| `besoinMonde` | `atom.text_medium` | Formulé comme un manque ou une injustice, pas une opportunité commerciale. | Non vide. ≥50 chars. |
| `remuneration` | `atom.text_medium` | Le transfert de valeur vu par le client. | Non vide. ≥50 chars. `[X]` → V.produitsCatalogue (doit se matérialiser dans le catalogue) |

**Scoring** : 4 pts (1/quadrant rempli)

### `valeurs` — N3 collection de 3-7 × N2.01 BrandValue

| Champ par valeur | Type | Règle | Validation `[S]` |
|---|---|---|---|
| `value` | `atom.schwartz_value` → H:T.02 | Sélection dans les 10 valeurs de Schwartz. | Valeur valide de T.02. |
| `customName` | `atom.text_short` | Nom affiné propre à la marque. | Non vide. |
| `rank` | `atom.rank` | Unique, séquentiel. #1 = la plus importante. | Unique dans le set. |
| `justification` | `atom.text_medium` | Pourquoi ce rang. Doit contenir un coût : quand cette valeur coûte quelque chose. | ≥50 chars. |
| `costOfHolding` | `atom.text_medium` | Situation concrète où respecter cette valeur est coûteux. | ≥30 chars. |
| `tensionWith` | `atom.schwartz_value[]` | Valeurs en tension (vérifié contre T.02 colonne 4). | Cohérent avec T.02 — les tensions listées sont correctes. |

**Collection** : min:3, max:7. Rangs uniques et séquentiels. Les valeurs en tension ne peuvent pas être toutes au top du ranking sans contradiction (vérification programmatique contre T.02).

**Scoring** : 3 pts — 1 si ≥3 valeurs, 1 si toutes ont justification ≥50 chars + costOfHolding ≥30 chars, 1 si tensions cohérentes avec T.02

### `hierarchieCommunautaire` — N3 collection mappée sur H:T.07

| Champ par niveau | Règle | Validation `[S]` |
|---|---|---|
| `niveau` | Séquentiel, correspond à un segment de T.07. | ≥4 niveaux. |
| `nom` | Nom mémorable, propre à la marque (pas "Niveau 1"). | Non vide. |
| `description` | Qui sont ces gens, que font-ils. | ≥40 chars. |
| `privileges` | Ce qu'ils obtiennent que le niveau inférieur n'a pas. | ≥30 chars. |

**`[X]`** Les niveaux doivent correspondre aux SuperfanSegments (T.07) et aux niveaux de E.gamification.

**Scoring** : 2 pts — 1 si ≥4 niveaux avec descriptions, 1 si tous ont privileges ≥30 chars

### `timelineNarrative` — 4 sections

Au moins 3 des 4 sections remplies (origines, croissance, pivot, futur). Chaque section ≥60 chars. Cohérent avec le Hero's Journey (les 4 temps correspondent aux 5 actes).

**Scoring** : 2 pts — 1 si ≥3 sections remplies, 1 si les 4 sont remplies

### Extensions ARTEMIS — Movement Architecture (FW-20)

#### `prophecy` — Prophétie du mouvement

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `worldTransformed` | Le monde quand on gagne. Formulé au futur. Transcende le produit. | ≥100 chars. |
| `pioneers` | Les premiers croyants — qui ils sont. | Non vide. |
| `urgency` | Pourquoi maintenant. | Non vide. |
| `horizon` | Temporalité (3 ans, 10 ans, une génération). | Non vide. |

**Scoring** : 1.5 pts

#### `enemy` — Le Sheitan → H:N2.14

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `name` | Nom du mouvement ennemi (pas un concurrent — le MOUVEMENT). | Non vide. |
| `manifesto` | Ce que l'ennemi croit et prêche. | ≥50 chars. |
| `enemySchwartzValues` | Valeurs Schwartz incarnées par l'ennemi (→ T.02). | ≥1 valeur. En tension avec A.valeurs (vérifié contre T.02). |
| `overtonMap` | 4 champs : ourPosition, enemyPosition, battleground, shiftDirection. | Les 4 non vides. |
| `enemyBrands` | Marques concrètes qui incarnent l'ennemi. | ≥1 marque avec howTheyFight non vide. |
| `activeOpposition` | Actions délibérées de l'ennemi. | ≥1 action. |
| `passiveOpposition` | Résistances structurelles. | ≥1 résistance. |
| `counterStrategy` | Notre stratégie de combat (marketing, lobbying, alliances, Overton actions). | marketingCounter ≥100 chars. alliances ≥1. |
| `fraternityFuel` | Comment la haine commune soude les superfans. | sharedHatred non vide. |

**Scoring** : 2 pts — 1 si enemy structuré (≥5 champs clés non vides), 1 si enemyBrands ≥1 + counterStrategy complet

#### `doctrine` + `livingMythology`

| Composite | Règle | Scoring |
|---|---|---|
| `doctrine.dogmas` | ≥3 croyances contre-intuitives commençant par "Nous croyons que..." et contestables. | 0.5 pt |
| `doctrine.principles` | ≥3 principes de conduite dérivés des dogmes. | 0.5 pt |
| `livingMythology.canon` | Mythe fondateur ≥200 chars + extensionRules non vide. | 1 pt |

**Total extensions ARTEMIS : 5.5 pts**

### Ajustement : 0.5 pt si l'archétype (identite) est cohérent avec le Hero's Journey et l'Ikigai (`[Q]` — évalué par modulator).

---

## A — Quality Modulator (0.70–1.00)

Évalue 3 dimensions :

1. **Cohérence narrative** (×0.4) : archétype ↔ Hero's Journey ↔ Ikigai ↔ valeurs ↔ prophétie — racontent-ils la même histoire ?
2. **Spécificité** (×0.3) : les contenus sont-ils uniques à cette marque ou interchangeables avec un concurrent du secteur ?
3. **Puissance du mouvement** (×0.3) : la prophétie donne-t-elle envie d'y croire ? L'ennemi provoque-t-il une réaction ? La doctrine est-elle contestable ?

---

## A — Récapitulatif

| Section | Points | Source |
|---|---|---|
| identite (3 atomes) | 3 | Structural |
| herosJourney (5 actes) | 5 | Structural |
| ikigai (4 quadrants) | 4 | Structural |
| valeurs (collection 3-7) | 3 | Structural |
| hierarchieCommunautaire | 2 | Structural |
| timelineNarrative | 2 | Structural |
| prophecy (ARTEMIS) | 1.5 | Structural |
| enemy (ARTEMIS N2.14) | 2 | Structural |
| doctrine + mythology (ARTEMIS) | 2 | Structural |
| Ajustement cohérence | 0.5 | Quality |
| **TOTAL** | **25** | |

---

# PILIER D — DISTINCTION (/25)

> Composite majeur : **Brand Book Direction Artistique** (→ H:N4)
> Input : D1-D7 (interview) → génération AI → GLORY pipeline BRAND (10 outils) → extensions ARTEMIS
> Cascade : consomme A (archétype, valeurs, noyau identitaire, prophétie, enemy)

## D.1 Composites et collections

### `personas` — N3 collection de 2-5 × N2.04 Persona

Chaque persona est un composite structuré de 25+ champs (→ H:N2.04), pas un textarea.

| Groupe | Champs requis | Validation `[S]` |
|---|---|---|
| Identité | `name`, `age`, `csp`, `location` | 4 champs non vides. `name` ≠ "Persona 1". `location` = valeur de T.11. |
| Psychométrie | `tensionProfile` (→ N1.04), `lf8Dominant` (→ T.03), `schwartzValues` (→ T.02) | tensionProfile avec segment + fear + hiddenDesire non vides. lf8Dominant ≥1. schwartzValues ≥2. |
| Psychographie | `lifestyle`, `mediaConsumption`, `brandRelationships` | Au moins 2 sur 3 non vides, chacun ≥50 chars. |
| Motivations & Freins | `motivations`, `fears`, `hiddenDesire`, `whatTheyActuallyBuy` | motivations + fears non vides ≥40 chars. hiddenDesire dérivé de tensionProfile. |
| Parcours | `jobsToBeDone`, `decisionProcess`, `devotionPotential` | jobsToBeDone ≥1 item. |

**Collection** : min:2. Priorités uniques. `[X]` schwartzValues doit avoir ≥1 valeur en commun avec A.valeurs (le persona partage une valeur avec la marque). `[X]` Chaque persona doit être ciblé par ≥1 tier du V.productLadder.

**Scoring** : 4 pts — 1 si ≥2 personas, 1 si tous ont psychométrie complète (tension + LF8 + Schwartz), 1 si ≥3 personas, 1 si cross-refs V.productLadder validées

### `paysageConcurrentiel` — composite

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `concurrents[]` | min:3, max:8. Chaque concurrent a nom, forces (≥40 chars), faiblesses (≥40 chars), partDeMarche. ≥1 concurrent indirect (substitut). | min:3 avec nom + forces + faiblesses non vides. |
| `avantagesCompetitifs[]` | min:3. Chaque avantage doit correspondre à une faiblesse d'au moins 1 concurrent listé. | min:3 non vides. `[X]` → A.ikigai.competence (les avantages reflètent les compétences). |

**Scoring** : 3 pts — 1 si ≥3 concurrents, 1 si PDM renseignée pour tous, 1 si ≥3 avantages avec cross-ref faiblesses

### `promessesDeMarque` — composite

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `promesseMaitre` | Une phrase. ≤150 chars. Mémorable, vérifiable, différenciante. | Non vide. ≤150 chars. |
| `sousPromesses[]` | min:2. Chaque sous-promesse décline la maître pour un segment/produit/contexte. | min:2 non vides. `[X]` → V.productLadder (chaque tier pointe vers une sous-promesse). |

**Scoring** : 2 pts — 1 si promesseMaitre ≤150 chars, 1 si ≥2 sous-promesses

### `positionnement` — `atom.text_medium`

Format : "Pour [cible], [marque] est [catégorie] qui [bénéfice clé] parce que [raison de croire]." ≤300 chars. `[X]` Le bénéfice clé doit être relié à un avantage compétitif. `[X]` ≠ A.noyauIdentitaire (version marché vs version intérieure).

**Scoring** : 2 pts — 1 si non vide et structuré, 1 si ≤200 chars (concision = mémorabilité)

### `tonDeVoix` — composite

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `personnalite` | 3-5 adjectifs avec explication. Pas "professionnelle et chaleureuse" — des descriptions incarnées. | ≥60 chars. |
| `onDit[]` | min:3 expressions typiques de la marque. | min:3 non vides. |
| `onNeditPas[]` | min:2 anti-expressions. Chaque anti-expression = opposé d'un trait de personnalité. | min:2 non vides. |

`[X]` Le ton doit incarner A.valeurs. Si valeur #1 = audace, le ton ne peut pas être tiède.

**Scoring** : 2 pts — 1 si personnalite + onDit ≥3, 1 si onNeditPas ≥2

### `directionArtistique` — N2.15 Pipeline BRAND GLORY (10 sous-composites)

C'est le composite le plus complexe du système. La DA n'est pas un champ texte — c'est un **système de production visuelle** construit par le pipeline BRAND de GLORY (→ H:N2.15).

| Sous-composite | Outil GLORY | Validation `[S]` minimale | Scoring |
|---|---|---|---|
| #1 Analyse sémiotique | `semiotic-brand-analyzer` | Carré de Greimas rempli (4 pôles). brandPosition non vide. | 0.5 pt |
| #2 Cartographie visuelle | `visual-landscape-mapper` | Matrice 2×2 avec ≥3 concurrents positionnés. ≥1 zone disponible identifiée. | 0.5 pt |
| #3 Moodboard | `visual-moodboard-generator` | Direction visuelle non vide. ≥5 références. CMF analysis non vide. | 0.5 pt |
| #4 Système chromatique | `chromatic-strategy-builder` | ≥2 couleurs primaires avec hex + meaning. ≥1 paire accessibilité vérifiée. ≥1 couleur interdite (de l'ennemi). | 1 pt |
| #5 Système typographique | `typography-system-architect` | Primary + secondary families définies. Scale ratio défini. | 0.5 pt |
| #6 Logo recommendation | `logo-type-advisor` | Type recommandé (wordmark/symbol/combo/etc.) + ≥3 facteurs de décision. | 0.5 pt |
| #7 Logo validation | `logo-validation-protocol` | Score scalabilité. Monochrome test. ≥3 des 5 métriques 5D renseignées. | 0.5 pt |
| #8 Design tokens | `design-token-architect` | ≥10 tokens globaux. ≥1 format d'export. | 0.5 pt |
| #9 Motion identity | `motion-identity-designer` | ≥1 courbe bézier documentée. Principe productive ou expressive défini. | 0.5 pt |
| #10 Guidelines | `brand-guidelines-generator` | ≥8 des 13 sections remplies. | 1 pt |
| **LSI Matrix** | Transversal | ≥3 concepts distribués × 5 couches. ≥2 sublimation rules. | 1 pt |

**Pipeline minimum** : les sous-composites #1-#4 + LSI Matrix doivent être complétés pour un score DA non-nul. Les sous-composites #5-#10 sont progressifs.

**Scoring DA total** : 6.5 pts

### `assetsLinguistiques` — composite

| Champ | Règle | Validation | Scoring |
|---|---|---|---|
| `mantras[]` | ≥1 mantra interne. Enrichi par GLORY `claim-baseline-factory`. | min:1 | 0.5 pt |
| `vocabulaireProprietaire[]` | ≥3 termes. Enrichi par GLORY `wordplay-cultural-bank`. Le vocabulaire crée un dialecte de marque. | min:3 | 0.5 pt si ≥3, +0.5 pt si ≥5 |

**Scoring assetsLinguistiques** : 1.5 pts

### Extensions ARTEMIS — Sacred Objects + Proof Points + Symboles

| Sous-champ | Validation | Scoring |
|---|---|---|
| `sacredObjects[]` | ≥1 objet avec nom + narrative non vides | 0.5 pt |
| `proofPoints[]` | ≥2 preuves avec claim + evidence non vides | 0.5 pt |
| `symboles[]` | ≥1 symbole avec meanings non vides | 0.5 pt |

**Total extensions** : 1.5 pts

---

## D — Quality Modulator (0.70–1.00)

1. **Différenciation réelle** (×0.4) : le positionnement est-il distinctif par rapport aux concurrents listés, ou est-ce du langage générique ?
2. **Cascade A→D** (×0.3) : le ton incarne-t-il les valeurs ? L'archétype se retrouve-t-il dans la DA (LSI) ? Le positionnement découle-t-il du noyau ?
3. **Profondeur psychométrique** (×0.3) : les personas ont-ils des tensions réelles (Grille T.04) avec LF8 mappés, ou sont-ils des profils démographiques plats ?

---

## D — Récapitulatif

| Section | Points |
|---|---|
| personas (collection 2-5, psychométrie) | 4 |
| paysageConcurrentiel | 3 |
| promessesDeMarque | 2 |
| positionnement | 2 |
| tonDeVoix | 2 |
| directionArtistique (pipeline BRAND + LSI) | 6.5 |
| assetsLinguistiques | 1.5 |
| Extensions ARTEMIS | 1.5 |
| Ajustement cohérence A→D | 2.5 |
| **TOTAL** | **25** |

Note : l'ajustement de 2.5 pts est distribué par le quality modulator — il récompense la cohérence cascade (archétype → DA, valeurs → ton, noyau → positionnement). Score max si modulator = 1.00.

---

# PILIER V — VALEUR (/25)

> Composite majeur : **Offre Commerciale Structurée** (→ H:N4)
> Input : V0-V8 (interview) → génération AI (format V2 atomisé)
> Cascade : consomme A (ikigai.remuneration, valeurs) + D (personas, promesses, positionnement)

## V.1 Composites et collections

### `produitsCatalogue` — N3 collection de 1-50 × N2.05 ProduitService

Chaque produit est un composite atomisé (→ H:N2.05) avec 8 dimensions de valeur/coût.

| Groupe | Champs requis | Validation `[S]` |
|---|---|---|
| Core | `id`, `nom`, `prix`, `cout`, `categorie` | Tous non vides. prix > 0. cout > 0. margeUnitaire calculé automatiquement. |
| Valeur client | `gainClientConcret`, `gainClientAbstrait` | Au moins 1 des 2 non vide. |
| Valeur marque | `gainMarqueConcret`, `gainMarqueAbstrait` | Au moins 1 des 2 non vide. |
| Coût client | `coutClientConcret`, `coutClientAbstrait` | Au moins 1 des 2 non vide. |
| Positionnement | `lienPromesse`, `segmentCible`, `phaseLifecycle` | lienPromesse non vide. `[X]` segmentCible → D.personas.id. |
| Persuasion | `lf8Trigger`, `leviersPsychologiques` | Optionnel — enrichit le scoring. lf8Trigger → T.03. |

**Collection** : min:1. `[X]` Chaque D.persona doit avoir ≥1 produit qui le cible.

**Scoring** : 5 pts — 1 si ≥1 produit, 1 si tous ont les 4 champs core, 1 si tous ont ≥1 gain client + ≥1 lienPromesse, 1 si segmentCible valide pour tous, 1 si ≥3 produits (richesse catalogue)

### `productLadder` — N3 collection de 2-5 × N2.07 ProductLadderTier

| Champ | Règle | Validation `[S]` |
|---|---|---|
| `tier` | Nom du tier ("Starter", "Pro", "Enterprise" — pas "Tier 1"). | Non vide. |
| `prix` | Fourchette de prix. | Non vide. |
| `produitIds[]` | Références vers produitsCatalogue. | Tous existent dans V.produitsCatalogue. |
| `cible` | Persona visé. | `[X]` → D.personas.id. |
| `position` | Rang (1 = entrée de gamme). | Unique, séquentiel. |

**Collection** : min:2. Prix croissants. `[X]` Chaque tier doit cibler un persona distinct (ou un usage distinct du même persona).

**Scoring** : 3 pts — 1 si ≥2 tiers, 1 si prix croissants vérifiés, 1 si ≥3 tiers avec cibles non vides

### 8 quadrants valeur/coût — 8 × N3 collections de ValeurCoutItem

| Quadrant | Min | Validation `[S]` |
|---|---|---|
| `valeurMarqueTangible` | 1 | ≥1 item non vide |
| `valeurMarqueIntangible` | 1 | ≥1 item non vide |
| `valeurClientTangible` (fonctionnel) | 1 | ≥1 item non vide |
| `valeurClientIntangible` (émotionnel + social) | 1 | ≥1 item non vide, categorie ∈ {emotionnel, social} |
| `coutMarqueTangible` (capex) | 1 | ≥1 item non vide |
| `coutMarqueIntangible` (coûts cachés) | 1 | ≥1 item non vide |
| `coutClientTangible` (frictions) | 1 | ≥1 item avec solution non vide |
| `coutClientIntangible` | 1 | ≥1 item non vide |

**Scoring** : 4 pts — 0.5 pt par quadrant rempli (8 × 0.5 = 4)

### `unitEconomics` — atomes dérivés (→ H:N1.03)

| Champ | Type | Règle | Validation `[S]` |
|---|---|---|---|
| `cac` | `atom.currency` | Coût d'acquisition client. Peut être estimé. | Non vide. |
| `ltv` | `atom.currency` | Valeur vie client. Inclut `dureeLTV` en mois. | Non vide. |
| `ltvCacRatio` | `atom.ratio` | Dérivé : `ltv / cac`. Signal d'alarme si < 3. | Calculé automatiquement. |
| `pointMort` | `atom.text_short` | Volume ou date de break-even. | Non vide. |
| `margeNette` | `atom.currency` | Dérivée : `CA - budget_total`. | Calculé si V8 renseigné. |
| `roiEstime` | `atom.percentage` | Dérivé. | Calculé si suffisamment de données. |
| `paybackPeriod` | `atom.duration_months` | Dérivé : `cac / (ltv / dureeLTV)`. | Calculé. |
| V7 `budgetCom` | `atom.currency` | Budget communication annuel. Validé contre formule paramétrique `atom.budget_parametrique`. | Non vide. Si écart > 30% vs formule → alerte. |
| V8 `caVise` | `atom.currency` | CA annuel visé. | Non vide. |

**Scoring** : 5 pts — 1 si cac non vide, 1 si ltv non vide, 1 si pointMort non vide, 1 si V7 renseigné, 1 si V8 renseigné

### Ajustement : 3 pts

1 pt si produitsCatalogue utilise le format V2 atomisé complet (avec les 8 dimensions valeur/coût par produit). 1 pt si ltvCacRatio ≥ 3 (économie saine). 1 pt si budget V7 validé contre la formule paramétrique (écart < 30%).

---

## V — Quality Modulator (0.70–1.00)

1. **Cohérence économique** (×0.4) : les unit economics tiennent-ils ? Le pricing du ladder est-il logique ?
2. **Symétrie valeur/coût** (×0.3) : la valeur promise justifie-t-elle le coût client ?
3. **Cascade D→V** (×0.3) : chaque produit est-il relié à une promesse ? Chaque tier cible-t-il un persona ?

---

## V — Récapitulatif

| Section | Points |
|---|---|
| produitsCatalogue (collection, atomisé) | 5 |
| productLadder | 3 |
| 8 quadrants valeur/coût | 4 |
| unitEconomics + V7 + V8 | 5 |
| Ajustement (format V2 + sanité éco + budget) | 3 |
| **Avant modulator** | **20** |
| **Quality modulator max bonus** | **5** |
| **TOTAL** | **25** |

Note : les 5 points de quality modulator bonus sont calculés comme : `min(5, 20 × (modulator - 0.70) / 0.30 × 5/20)`. En pratique : modulator 1.00 → +5, modulator 0.85 → +2.5, modulator 0.70 → +0.

---

# PILIER E — ENGAGEMENT (/25)

> Composite majeur : **Playbook d'Engagement** (→ H:N4)
> Input : E1-E6 (interview) → génération AI → ARTEMIS FW-20 → adoption mesurée par Cult Index
> Cascade : consomme A + D + V

## E.1 Composites design (0-22 pts)

### `touchpoints` — N3 collection de 5-15 × N2.08 Touchpoint

| Champ | Type | Validation `[S]` |
|---|---|---|
| `canal` | `atom.text_short` | Non vide. Spécifique ("Instagram Stories", pas "réseaux sociaux"). |
| `type` | `atom.touchpoint_type` | physique / digital / humain. |
| `channelRef` | `atom.channel` → T.08 | Valeur valide de T.08. |
| `aarrStage` | `atom.aarrr_stage` → T.05 | Valeur valide de T.05. |
| `devotionLevel[]` | `atom.devotion_level[]` → T.07 | ≥1 niveau. |
| `role` | `atom.text_medium` | ≥30 chars. |

**Collection** : min:5. ≥1 type physique, ≥1 digital, ≥1 humain. Les 5 étapes AARRR doivent être couvertes.

**Scoring** : 3 pts — 1 si ≥5 touchpoints, 1 si 3 types représentés, 1 si 5 étapes AARRR couvertes

### `rituels` — N3 collection de 3-10 × N2.09 Ritual

| Champ | Type | Validation `[S]` |
|---|---|---|
| `nom` | `atom.text_short` | Non vide. Propre à la marque. |
| `type` | `atom.ritual_type` | always-on / cyclique. |
| `aarrPrimary` | `atom.aarrr_stage` | Valeur de T.05. |
| `devotionLevels[]` | `atom.devotion_level[]` | ≥1 niveau. |
| `description` | `atom.text_medium` | ≥60 chars. |
| `kpiMeasure` | `atom.text_short` | Non vide (comment on mesure si le rituel fonctionne). |

**Collection** : min:3. ≥1 always-on + ≥1 cyclique. Les rituels doivent adresser ≥3 niveaux de la Devotion Ladder.

**Scoring** : 3 pts — 1 si ≥3 rituels, 1 si 2 types présents, 1 si ≥3 niveaux Ladder couverts

### `principesCommunautaires`, `gamification`, `aarrr`, `kpis`

| Section | Règle clé | Scoring |
|---|---|---|
| `principesCommunautaires` | principes ≥5, tabous ≥2. `[X]` Les principes incarnent A.valeurs. Les tabous reflètent D.tonDeVoix.onNeditPas. | 1.5 pt |
| `gamification` | ≥3 niveaux avec condition mesurable + recompense. `[X]` Niveaux correspondent à A.hierarchieCommunautaire. | 2 pts |
| `aarrr` | 5 champs non vides (≥80 chars chacun). Chaque étape est formulée comme un moment de transformation, pas juste une métrique. | 2 pts |
| `kpis` | ≥6 KPIs avec nom + cible chiffrée. `[X]` ≥2 KPIs mesurent des rituels. ≥3 étapes AARRR couvertes. | 1.5 pts |

### Extensions ARTEMIS — Cult Marketing (FW-20)

| Sous-champ | Règle clé | Scoring |
|---|---|---|
| `sacredCalendar` | ≥4 dates avec nom + signification. Mix dates marque + dates culturelles marché. | 2 pts |
| `commandments` | 10 commandements avec commandement + justification. | 2 pts |
| `ritesDePassage` | ≥3 rites (transitions Devotion) avec stade + rituelEntree + symbolesStatut. `[X]` Les stades correspondent à T.07 et A.hierarchieCommunautaire. | 2 pts |
| `sacraments` | ≥5 sacrements (1/étape AARRR) avec nom sacré + trigger + action + reward + kpi. `[X]` Noms propres à la marque (pas "Acquisition" mais "La Première Rencontre"). | 2 pts |

**Scoring design** : 3 + 3 + 1.5 + 2 + 2 + 1.5 + 2 + 2 + 2 + 2 = **21 pts** (tronqué à 22 max pour permettre le bonus adoption)

## E.2 Bonus adoption — Cult Index (0-3 pts)

```
cultIndex_bonus = min(3, cultIndex / 33)
```

| Cult Index | Bonus | Signification |
|---|---|---|
| 0 | 0 pt | Pas de données (Quick Intake, Boot Sequence récent) |
| 33 | 1 pt | Début d'adoption mesurable |
| 66 | 2 pts | Adoption significative |
| 100 | 3 pts | Culte confirmé par les données |

Le Cult Index est calculé depuis 7 dimensions (→ H:Addendum §2) avec les données de SuperfanProfile (N2.16) et CommunitySnapshot (N2.17).

## E — Quality Modulator (0.70–1.00)

1. **Cascade A→D→E** (×0.3) : les rituels incarnent-ils les valeurs ? La gamification correspond-elle à la hiérarchie communautaire ? Les sacrements combattent-ils l'ennemi ?
2. **Actionnabilité** (×0.4) : chaque rituel est-il exécutable ? Chaque KPI est-il mesurable ? Les conditions de gamification sont-elles vérifiables ?
3. **Pouvoir de conversion** (×0.3) : le funnel AARRR / sacrements crée-t-il un parcours convaincant ?

---

## E — Récapitulatif

| Section | Points |
|---|---|
| Design (touchpoints + rituels + principes + gamification + aarrr + kpis + ARTEMIS) | 22 max |
| Adoption (Cult Index bonus) | 3 max |
| **TOTAL** | **25** |

---

# PILIER R — RISK (/25)

> Composite majeur : **Recommandations Stratégiques** (→ H:N4)
> Généré par : `audit-generation.ts` (micro-SWOTs + synthèse)
> Cascade : consomme A-D-V-E

Le pilier R est **dérivé** — pas d'input utilisateur. Le scoring évalue la pertinence analytique.

**Scoring natif** : le `riskScore` (0-100) est inversé et normalisé sur /25.

```
r_base = 25 - (riskScore × 0.25)
```

Un riskScore de 0 (aucun risque) → 25/25. Un riskScore de 100 (risque maximal) → 0/25.

**Bonus complétude structurelle** (ajuste le score final) :

| Critère `[S]` | Points |
|---|---|
| ≥5 micro-SWOTs | requis (sinon r = 0) |
| micro-SWOTs couvrent les 4 piliers A-D-V-E | +2 pts |
| globalSwot : 4 quadrants avec ≥3 éléments chacun | +2 pts |
| probabilityImpactMatrix : ≥5 risques | +2 pts |
| mitigationPriorities : ≥5 actions avec action ≥40 chars | +2 pts |
| riskScoreJustification ≥100 chars | +1 pt |
| summary ≥200 chars | +1 pt |

**Formule finale** :

```
r = min(25, r_base + bonus_completude × quality_modulator_R)
```

**Quality Modulator R** (0.70–1.00) :
1. **Spécificité des risques** (×0.4) : propres à cette marque, pas génériques sectoriels
2. **Actionnabilité des mitigations** (×0.35) : concrètes et exécutables
3. **Cohérence avec ADVE** (×0.25) : les forces du SWOT reflètent les atouts réels des piliers

---

# PILIER T — TRACK (/25)

> Composite majeur : **Étude de Marché Validée** (→ H:N4)
> Généré par : `audit-generation.ts`
> Cascade : consomme A-D-V-E + R

**Scoring natif** : le `brandMarketFitScore` (0-100) est normalisé sur /25.

```
t_base = bmfScore × 0.25
```

**Bonus complétude structurelle** :

| Critère `[S]` | Points |
|---|---|
| triangulation : 4 champs ≥100 chars chacun | +2 pts |
| hypothesisValidation : ≥5 hypothèses, ≥2 `validated` | +3 pts |
| marketReality : macroTrends ≥3, weakSignals ≥2 | +2 pts |
| tamSamSom : 3 niveaux avec value + description | +2 pts |
| competitiveBenchmark : ≥3 concurrents (inclut ceux de D) | +1 pt |
| Enrichi par MarketStudy (données réelles) | +2 pts |
| Enrichi par Tarsis (concurrents synchronisés) | +1 pt |

**Formule finale** :

```
t = min(25, t_base + bonus_completude × quality_modulator_T)
```

**Quality Modulator T** (0.70–1.00) :
1. **Honnêteté analytique** (×0.4) : le système distingue-t-il ce qu'il sait de ce qu'il suppose ?
2. **Utilisation des données** (×0.3) : les données MarketStudy/Tarsis sont-elles intégrées ?
3. **Actionnabilité** (×0.3) : les recommandations sont-elles exécutables ?

---

# PILIER I — IMPLEMENTATION (/25)

> Composite majeur : **Plan de Campagnes** (→ H:N4)
> Généré par : `implementation-generation.ts` (3 passes ~28K tokens)
> Cascade : consomme tout (A-D-V-E + R + T)

| Groupe | Sections | Validation `[S]` | Scoring |
|---|---|---|---|
| **Synthèses** (6 sections) | brandIdentity, positioning, valueArchitecture, engagementStrategy, riskSynthesis, marketValidation | Chaque section non vide, cohérente avec le pilier source. | 6 pts (1/section) |
| **Roadmap** | sprint90Days (≥8 actions), year1 (≥200 chars), vision3years (≥100 chars) | Actions avec action + owner + kpi. `[X]` Sprint inclut ≥2 mitigations de R. | 3 pts |
| **Campagnes** | annualCalendar (≥6 campagnes), templates (≥2), activationPlan | 4 trimestres couverts. `[X]` ≥1 campagne = rituel cyclique de E. Budgets ≤ V7. | 3 pts |
| **Budget** | globalBudget, répartition par poste (8 catégories), ROI | globalBudget non vide. ≥3 postes. `[X]` Validé contre budget paramétrique. | 2 pts |
| **Opérationnel** | teamStructure (≥3 rôles), launchPlan (≥3 phases), playbook | Chaque section non vide. | 2 pts |
| **UPGRADERS** | brandPlatform, copyStrategy, bigIdea, activationDispositif (owned/earned/paid/shared), governance, workstreams, brandArchitecture, guidingPrinciples | brandPlatform ≥5/7 champs. copyStrategy promise + RTB. bigIdea concept + ≥1 déclinaison. ≥2 canaux par catégorie activation. | 5 pts |
| **Executive** | executiveSummary ≥200 chars + coherenceScore 0-100 | Valides. | 1.5 pts |
| **Ajustement GLORY** | Enrichi par campaign-architecture-planner (#11), campaign-360-simulator (#19), digital-planner (#29) | ≥1 outil GLORY hybride exécuté pour ce client. | 2.5 pts |

**Quality Modulator I** (0.70–1.00) :
1. **Faisabilité** (×0.4) : le plan est-il réaliste avec les ressources de cette marque ?
2. **Cohérence ADVERT** (×0.3) : le plan découle-t-il logiquement de la stratégie ?
3. **Complétude opérationnelle** (×0.3) : le plan est-il exécutable sans interprétation ?

---

# PILIER S — STRATÉGIE / SYNTHÈSE (/25)

> Composite majeur : **Roadmap Annuelle** (→ H:N4)
> Généré par : `ai-generation.ts` (generateSyntheseContent)
> Cascade : consomme TOUT

| Section | Validation `[S]` | Scoring |
|---|---|---|
| `syntheseExecutive` | ≥400 chars. Autonome (compréhensible sans les autres piliers). | 3 pts |
| `visionStrategique` | ≥200 chars. `[X]` Résonance avec A.prophecy + I.roadmap.vision3years. | 2 pts |
| `coherencePiliers` | ≥7 entrées (1/pilier). Chaque contribution + articulation non vides. | 3 pts |
| `facteursClesSucces` | ≥5 FCS. Phrases actionnables, pas mots-clés. | 2 pts |
| `recommandationsPrioritaires` | ≥8 recommandations ordonnées. `[X]` ≥2 de R (mitigations) + ≥2 de T (marché). | 3 pts |
| `axesStrategiques` | ≥3 axes. Chaque axe lie ≥2 piliers + KPIs clés. | 3 pts |
| `sprint90Recap` | ≥8 actions extraites de I.sprint90Days. | 2 pts |
| `campaignsSummary` | totalCampaigns > 0. | 1 pt |
| `activationSummary` | ≥100 chars. | 1 pt |
| `kpiDashboard` | ≥7 KPIs (1/pilier minimum). | 2 pts |
| **coherenceScore bonus** | `3 × (scoreCoherence / 100)`. | 3 pts max |

**Quality Modulator S** (0.70–1.00) :
1. **Autonomie** (×0.4) : la synthèse est-elle compréhensible seule ?
2. **Fidélité** (×0.3) : les recommandations reflètent-elles fidèlement les 7 piliers ?
3. **Actionnabilité** (×0.3) : le sprint et les recommandations sont-ils exécutables ?

---

# CROSS-REFS INTER-PILIERS — Matrice complète

Ces relations sont vérifiées par le `coherence-calculator.ts` et alimentent le quality modulator de chaque pilier cible.

| # | Source | Cible | Relation | Vérification |
|---|---|---|---|---|
| 1 | A.identite.archetype | D.lsiMatrix.concepts | L'archétype est un des concepts distribués dans la LSI | `[S]` présence dans concepts[] |
| 2 | A.identite.noyauIdentitaire | D.positionnement | Version intérieure vs version marché | `[Q]` overlap < 50% |
| 3 | A.ikigai.competence | D.avantagesCompetitifs | Les compétences alimentent les avantages | `[Q]` cohérence sémantique |
| 4 | A.ikigai.remuneration | V.produitsCatalogue | Ce pour quoi on est payé = le catalogue | `[Q]` matérialisation |
| 5 | A.valeurs | D.tonDeVoix | Le ton incarne les valeurs | `[Q]` alignement |
| 6 | A.valeurs | E.principesCommunautaires | Les principes incarnent les valeurs | `[Q]` dérivation |
| 7 | A.valeurs.schwartz | D.personas.schwartzValues | ≥1 valeur partagée par persona | `[S]` intersection ≥1 |
| 8 | A.hierarchieCommunautaire | E.gamification | Niveaux correspondants | `[S]` même nombre de niveaux ±1 |
| 9 | A.hierarchieCommunautaire | E.ritesDePassage | Stades correspondent aux transitions | `[S]` mapping |
| 10 | A.prophecy | E.sacredCalendar | Le calendrier célèbre la progression vers la prophétie | `[Q]` alignement |
| 11 | A.enemy.enemySchwartzValues | A.valeurs.schwartz | En tension (T.02) | `[S]` vérifié contre T.02 |
| 12 | A.enemy | E.commandments | ≥1 commandement combat l'ennemi | `[Q]` présence |
| 13 | A.doctrine.dogmas | E.principesCommunautaires | Principes découlent des dogmes | `[Q]` dérivation |
| 14 | D.personas | V.productLadder.cible | Chaque tier cible un persona | `[S]` persona.id existe |
| 15 | D.promessesDeMarque | V.produitsCatalogue.lienPromesse | Chaque produit lié à une promesse | `[S]` non vide |
| 16 | D.personas | E.touchpoints | Touchpoints sur les canaux des personas | `[Q]` médias alignés |
| 17 | D.tonDeVoix.onNeditPas | E.principesCommunautaires.tabous | Tabous reflètent les anti-expressions | `[Q]` cohérence |
| 18 | V.produitsCatalogue | E.aarrr.revenue | Le modèle de monétisation reflète le catalogue | `[Q]` cohérence |
| 19 | V.produitsCatalogue.segmentCible | D.personas.id | Chaque produit cible un persona existant | `[S]` ID valide |
| 20 | E.kpis | E.rituels | ≥2 KPIs mesurent des rituels | `[S]` variable match |
| 21 | E.aarrr | E.sacraments | Chaque étape AARRR a un sacrement | `[S]` 5 étapes couvertes |
| 22 | R.mitigationPriorities | I.sprint90Days | Mitigations urgentes dans le sprint | `[Q]` ≥2 reprises |
| 23 | T.strategicRecommendations | I.strategicRoadmap | Recommandations reflétées dans le roadmap | `[Q]` ≥2 reprises |
| 24 | T.competitiveBenchmark | D.paysageConcurrentiel | Concurrents de T incluent ceux de D | `[S]` inclusion |
| 25 | T.tamSamSom.som | V.unitEconomics | SOM crédible par rapport au CAC | `[Q]` cohérence |
| 26 | I.positioning.statement | D.positionnement | Statement identique | `[S]` égalité string |
| 27 | I.budgetAllocation.globalBudget | V7 | Total correspond | `[S]` ≤ V7 |
| 28 | I.campaigns | E.rituels | ≥1 campagne = rituel cyclique | `[S]` match |
| 29 | S.recommandationsPrioritaires | R + T | ≥2 de R + ≥2 de T | `[S]` count |
| 30 | S.kpiDashboard | E.kpis + I.sprint90Days | Sélection des KPIs de E et I | `[Q]` couverture |

**Score de cohérence** = nombre de cross-refs validées / nombre total × 100. Stocké dans S.scoreCoherence.

---

# SCORE COMPOSITE /200

```
composite = a + d + v + e + r + t + i + s
```

| Score | Classification | Description |
|---|---|---|
| 0-80 | **Zombie** | Invisible, pas d'identité distincte |
| 81-120 | **Ordinaire** | Fonctionnel mais interchangeable |
| 121-160 | **Forte** | Reconnue et respectée |
| 161-180 | **Culte** | Adorée, inspire la dévotion |
| 181-200 | **Icône** | Légendaire, référence mondiale |

**Confidence** : moyenne pondérée des confidences par pilier. Pilier non généré = 0. Quick Intake = 0.3-0.5. Boot Sequence complet = 0.7-0.9. Boot + MarketStudy + ARTEMIS + GLORY BRAND = 0.9-1.0.

**Affichage Quick Intake** : si confidence < 0.7 → fourchette (score ± 15%). Si ≥ 0.7 → score point.

---

*Fin de l'Annexe G v2 — Règles de Remplissage, Validation et Scoring des 8 Piliers*
