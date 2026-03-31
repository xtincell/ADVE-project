# ANNEXE H — Ontologie des Variables du Système ADVE-RTIS

# PARTIE 1/2 — FONDATIONS (Architecture, Taxonomies, Atomes, Composites de Base)

**Version** : 2.0 (consolidation)
**Date** : 24 mars 2026
**Objet** : Taxonomie complète des types atomiques, des règles de composition, et des structures composites du système ADVE-RTIS. Source de vérité pour le data model, le scoring, les prompts de génération, et le moteur de recommandation Mestor.

**Principe fondamental** : le système est un assemblage déterministe de variables de complexité croissante. Chaque niveau se compose à partir du niveau inférieur selon des règles vérifiables sans LLM. Le LLM accélère le remplissage. Les règles garantissent la logique. Mestor opère sur le tout comme moteur de recommandation stratégique.

> Remplace : ANNEXE G (obsolète), ANNEXE H v1.1, ANNEXE H Addendum v1.1-add1
> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md §4.1 (`advertis-scorer`), §6.1 (méthodologie), ANNEXE F §F.1

**Structure du document** :

| Partie | Contenu | Niveaux |
|--------|---------|---------|
| **1/2 — Fondations** (ce document) | Architecture, Taxonomies, Atomes, Composites de base | N0, N1, N2.01–N2.12 |
| **2/2 — Systèmes & Intelligence** | Composites avancés, Collections, Assemblages, Scoring, GLORY | N2.13–N2.18, N3, N4, N5, N6, Scoring, GLORY→Piliers |

---

## Architecture des niveaux

```
N6  MOUVEMENT        Déplacement sur la fenêtre d'Overton
     ↑ se réalise via
N5  STRATÉGIE        Le profil ADVE-RTIS complet (8 piliers assemblés)
     ↑ se compose de
N4  COMPOSITE MAJEUR Le livrable par pilier (manifeste, brand book, offre, playbook...)
     ↑ se compose de
N3  COLLECTION       Ensembles ordonnés de composites (catalogue, roster, calendrier)
     ↑ se compose de
N2  COMPOSITE        Structures composées d'atomes (persona, produit, rituel, action marketing)
     ↑ se compose de
N1  ATOME            La plus petite unité de donnée indivisible
     ↑ puise dans
N0  TAXONOMIE        Énumérations fixes, référentiels fermés
```

Chaque variable du système a un **niveau** (N0-N6), un **type**, un **pilier source** (quel pilier la produit), et des **règles de composition** (quels éléments du niveau inférieur la constituent). Le scoring mesure la complétude structurelle de chaque niveau.

---

# NIVEAU 0 — TAXONOMIES

Énumérations fixes. Jamais modifiées par le client ou le LLM. Ce sont les alphabets du système.

## T.01 — Archétypes de marque (Jung/Pearson)

12 archétypes. Chaque marque en choisit un primaire et optionnellement un secondaire.

| Code | Archétype | Motivation profonde | Peur fondamentale |
|---|---|---|---|
| `HERO` | Le Héros | Prouver sa valeur par le courage | L'impuissance, la faiblesse |
| `SAGE` | Le Sage | Comprendre le monde par la vérité | L'ignorance, l'erreur |
| `MAGICIAN` | Le Magicien | Transformer la réalité | Les conséquences imprévues |
| `EXPLORER` | L'Explorateur | Découvrir, vivre pleinement | L'enfermement, le vide intérieur |
| `REBEL` | Le Rebelle | Renverser ce qui ne fonctionne pas | L'impuissance face au système |
| `CREATOR` | Le Créateur | Donner forme à une vision | La médiocrité, l'insignifiance |
| `RULER` | Le Souverain | Exercer le contrôle, créer l'ordre | Le chaos, le renversement |
| `INNOCENT` | L'Innocent | Retrouver le bonheur simple | La punition, l'abandon |
| `JESTER` | Le Bouffon | Vivre dans le moment, jouir | L'ennui, la banalité |
| `LOVER` | L'Amant | Créer l'intimité, l'expérience sensorielle | La solitude, le rejet |
| `CAREGIVER` | Le Protecteur | Protéger et aider les autres | L'égoïsme, l'ingratitude |
| `EVERYMAN` | L'Homme Ordinaire | Appartenir, se connecter | L'exclusion, le rejet |

**Usage** : A.identite.archetype (N1), D.tonDeVoix (influence), E.rituels (tonalité)

---

## T.02 — Valeurs universelles de Schwartz

10 valeurs universelles. La marque en sélectionne 3-7 et les hiérarchise.

| Code | Valeur | Définition | Tension avec |
|---|---|---|---|
| `SELF_DIRECTION` | Autonomie | Pensée et action indépendante | Conformité, Tradition |
| `STIMULATION` | Stimulation | Excitation, nouveauté, défi | Sécurité |
| `HEDONISM` | Hédonisme | Plaisir et gratification sensorielle | Conformité |
| `ACHIEVEMENT` | Accomplissement | Succès personnel selon les normes sociales | Bienveillance |
| `POWER` | Puissance | Statut social, contrôle des ressources | Universalisme |
| `SECURITY` | Sécurité | Stabilité, harmonie, ordre | Stimulation, Autonomie |
| `CONFORMITY` | Conformité | Respect des normes et attentes | Autonomie, Stimulation |
| `TRADITION` | Tradition | Respect des coutumes et de l'héritage | Autonomie, Stimulation |
| `BENEVOLENCE` | Bienveillance | Préservation du bien-être des proches | Puissance, Accomplissement |
| `UNIVERSALISM` | Universalisme | Compréhension, tolérance, protection de tous | Puissance |

**Propriété critique** : les valeurs en tension (colonne 4) ne peuvent pas être toutes au top du ranking sans contradiction. Le scoring vérifie la cohérence des tensions.

**Usage** : A.valeurs (N2), validation de cohérence cross-pilier

---

## T.03 — LF8 de Whitman (Life Force 8)

8 désirs biologiques fondamentaux. Chaque persona est mappé sur 1-3 LF8 dominants.

| Code | Désir | Description |
|---|---|---|
| `LF1` | Survie / longévité | Rester en vie, prolonger la vie |
| `LF2` | Nourriture / plaisir | Jouir de la nourriture et des boissons |
| `LF3` | Absence de peur | Être libre de la peur, de la douleur, du danger |
| `LF4` | Compagnonnage sexuel | Désir de relations intimes |
| `LF5` | Confort de vie | Conditions de vie confortables |
| `LF6` | Supériorité / compétition | Être supérieur, gagner, suivre le rythme |
| `LF7` | Protection des proches | Protéger ceux qu'on aime |
| `LF8` | Approbation sociale | Être reconnu, approuvé, valorisé |

**Usage** : D.personas.lf8Mapping (N2), E.aarrr (influence des triggers), campagnes (levier de persuasion)

---

## T.04 — Grille des Tensions Identitaires Commerciales

6 axes de tension × N segments par axe. Chaque segment a une peur, un désir caché, et un pattern d'achat.

| Axe | Code |
|---|---|
| Argent & Statut | `TENSION_MONEY` |
| Âge & Mortalité | `TENSION_AGE` |
| Genre & Séduction | `TENSION_GENDER` |
| Identité Sociale & Appartenance | `TENSION_IDENTITY` |
| Pouvoir & Influence | `TENSION_POWER` |
| Relations & Connexion | `TENSION_RELATION` |

Chaque axe contient des segments atomiques (N1) — voir §N1.04.

**Usage** : D.personas.tensionProfile (N2), E.sacraments (trigger design), campagnes (ciblage émotionnel)

---

## T.05 — Étapes AARRR (Pirate Funnel)

| Code | Étape | Question | Métrique primaire |
|---|---|---|---|
| `ACQ` | Acquisition | Comment me découvrent-ils ? | Reach, impressions, trafic |
| `ACT` | Activation | Ont-ils le premier "aha moment" ? | Taux de première action, sign-up |
| `RET` | Rétention | Reviennent-ils ? | MAU, churn rate, fréquence |
| `REV` | Revenue | Paient-ils ? | MRR, ARPU, conversion payant |
| `REF` | Referral | En parlent-ils ? | NPS, taux de referral, viralité |

**Usage** : E.aarrr (N2), E.sacraments (N2 ARTEMIS), Campaign.aarrStage, FieldReport.aarrMetrics, Operation Recommender

---

## T.06 — Types d'actions marketing

### ATL (Above The Line) — 10 types

| Code | Action |
|---|---|
| `ATL_TV` | Spot TV |
| `ATL_RADIO` | Spot Radio |
| `ATL_CINEMA` | Spot Cinéma |
| `ATL_PRESS` | Insertion Presse |
| `ATL_OOH` | Affichage (Out of Home) |
| `ATL_DOOH` | Affichage Digital |
| `ATL_TRANSIT` | Transit (bus, taxi, train) |
| `ATL_AMBIENT` | Ambient marketing |
| `ATL_AERIAL` | Aérien (banderoles, drones) |
| `ATL_SPONSORSHIP` | Sponsoring broadcast |

### BTL (Below The Line) — 38 types

| Code | Action |
|---|---|
| `BTL_SAMPLING` | Sampling / dégustation |
| `BTL_STREET` | Street marketing |
| `BTL_PDV` | Activation point de vente |
| `BTL_EVENT` | Événementiel |
| `BTL_LAUNCH` | Lancement produit |
| `BTL_SPONSORING` | Sponsoring événementiel |
| `BTL_DIRECT_MAIL` | Direct mail |
| `BTL_FASHION` | Fashion show |
| `BTL_CAMPUS` | Activation campus |
| `BTL_SENSIBILISATION` | Sensibilisation / éducation |
| `BTL_TRADE_MARKETING` | Trade marketing |
| `BTL_POPUP` | Pop-up store |
| `BTL_ROADSHOW` | Roadshow |
| `BTL_CONCOURS` | Concours / jeux |
| `BTL_PLV` | PLV (publicité sur lieu de vente) |
| `BTL_MERCHANDISING` | Merchandising |
| `BTL_PACKAGING` | Packaging promotionnel |
| `BTL_BRANDING` | Branding environnemental |
| `BTL_GUERILLA` | Guérilla marketing |
| `BTL_EXPERIENTIAL` | Marketing expérientiel |
| `BTL_VIP` | Événement VIP / hospitality |
| `BTL_DEMO` | Démonstration produit |
| `BTL_WORKSHOP` | Workshop / masterclass |
| `BTL_CHARITY` | Action caritative / RSE |
| `BTL_FLASH_MOB` | Flash mob |
| `BTL_FOOD_TRUCK` | Food truck / véhicule de marque |
| `BTL_FESTIVAL` | Participation festival |
| `BTL_SPORT` | Activation sportive |
| `BTL_CULTURAL` | Activation culturelle |
| `BTL_B2B_EVENT` | Événement B2B / salon |
| `BTL_CONFERENCE` | Conférence / keynote |
| `BTL_LOYALTY` | Programme de fidélité physique |
| `BTL_AMBASSADOR` | Programme ambassadeur terrain |
| `BTL_DOOR_TO_DOOR` | Porte-à-porte |
| `BTL_TELEMARKETING` | Télémarketing |
| `BTL_PARTNERSHIP` | Partenariat de distribution |
| `BTL_IN_STORE` | Animation en magasin |
| `BTL_COMMUNITY` | Animation communautaire terrain |

### TTL (Through The Line) — 27 types

| Code | Action |
|---|---|
| `TTL_SOCIAL_ORGANIC` | Social media organique |
| `TTL_SOCIAL_AD` | Social media paid |
| `TTL_SEA` | Search Engine Advertising |
| `TTL_SEO` | Search Engine Optimization |
| `TTL_INFLUENCER` | Marketing d'influence |
| `TTL_CONTENT` | Content marketing |
| `TTL_CRM` | CRM / nurturing |
| `TTL_EMAIL` | Email marketing |
| `TTL_SMS` | SMS marketing |
| `TTL_WHATSAPP` | WhatsApp marketing |
| `TTL_LOYALTY_DIGITAL` | Programme fidélité digital |
| `TTL_APP_INSTALL` | Campagne d'installation app |
| `TTL_COMMUNITY_MGMT` | Community management |
| `TTL_PODCAST` | Podcast branded |
| `TTL_WEBINAR` | Webinaire |
| `TTL_VIDEO_CONTENT` | Contenu vidéo (YouTube, etc.) |
| `TTL_AFFILIATE` | Marketing d'affiliation |
| `TTL_PROGRAMMATIC` | Publicité programmatique |
| `TTL_NATIVE_AD` | Publicité native |
| `TTL_DISPLAY` | Display advertising |
| `TTL_RETARGETING` | Retargeting |
| `TTL_UGC` | User Generated Content |
| `TTL_LIVE_SHOPPING` | Live shopping |
| `TTL_CHATBOT` | Chatbot marketing |
| `TTL_AR_VR` | Réalité augmentée / VR |
| `TTL_GAMIFICATION` | Gamification digitale |
| `TTL_PR_DIGITAL` | Relations presse digitales |

**Usage** : Campaign.actions (N2), E.touchpoints (sélection de canaux), I.campaigns (composition des opérations), brief composition

---

## T.07 — Devotion Ladder (6 niveaux)

| Code | Niveau | Comportement caractéristique | Transition vers le suivant |
|---|---|---|---|
| `DEV_SPECTATEUR` | Spectateur | Voit la marque, pas d'interaction | Premier contact significatif |
| `DEV_INTERESSE` | Intéressé | Cherche activement des informations | Premier achat ou inscription |
| `DEV_PARTICIPANT` | Participant | Achète, utilise, interagit | Usage régulier, habitude |
| `DEV_ENGAGE` | Engagé | Revient systématiquement, donne du feedback | Recommandation spontanée |
| `DEV_AMBASSADEUR` | Ambassadeur | Recommande activement, défend la marque | Prosélytisme actif |
| `DEV_EVANGELISTE` | Évangéliste | Convertit les autres, crée du contenu, incarne la marque | — (niveau terminal) |

**Usage** : A.hierarchieCommunautaire (mapping), E.gamification (progression), E.ritesDePassage (ARTEMIS), SuperfanProfile.segment (N2.16), DevotionSnapshot (N2.18)

---

## T.08 — Canaux Driver

| Code | Canal | Type |
|---|---|---|
| `CHAN_INSTAGRAM` | Instagram | Digital |
| `CHAN_FACEBOOK` | Facebook | Digital |
| `CHAN_TIKTOK` | TikTok | Digital |
| `CHAN_LINKEDIN` | LinkedIn | Digital |
| `CHAN_YOUTUBE` | YouTube | Digital |
| `CHAN_TWITTER` | Twitter/X | Digital |
| `CHAN_WEBSITE` | Site web | Digital |
| `CHAN_APP` | Application mobile | Digital |
| `CHAN_EMAIL` | Email | Digital |
| `CHAN_SMS` | SMS / WhatsApp | Digital |
| `CHAN_PACKAGING` | Packaging | Physique |
| `CHAN_PLV` | PLV | Physique |
| `CHAN_OOH` | Affichage | Physique |
| `CHAN_PRINT` | Print (flyer, brochure) | Physique |
| `CHAN_EVENT` | Événementiel | Expérientiel |
| `CHAN_POPUP` | Pop-up / activation | Expérientiel |
| `CHAN_PR` | Relations presse | Média |
| `CHAN_TV` | Télévision | Média |
| `CHAN_RADIO` | Radio | Média |
| `CHAN_VIDEO` | Production vidéo | Média |

**Usage** : Driver.channel, E.touchpoints.canal, Campaign.actions (canal d'exécution)

---

## T.09 — Secteurs d'activité

| Code | Secteur | Coefficient α (budget) |
|---|---|---|
| `SECT_FMCG` | Grande consommation | Haut |
| `SECT_BANK` | Banque / Finance | Moyen-haut |
| `SECT_TELECOM` | Télécommunications | Haut |
| `SECT_RETAIL` | Distribution | Moyen |
| `SECT_HEALTH` | Santé / Pharma | Moyen |
| `SECT_TECH` | Technologie / SaaS | Variable |
| `SECT_AGRI` | Agriculture / Agro-industrie | Moyen-bas |
| `SECT_ENERGY` | Énergie | Bas |
| `SECT_REAL_ESTATE` | Immobilier | Moyen |
| `SECT_EDUCATION` | Éducation | Bas |
| `SECT_HOSPITALITY` | Hôtellerie / Restauration | Moyen |
| `SECT_FASHION` | Mode / Luxe | Haut |
| `SECT_MEDIA` | Média / Entertainment | Moyen |
| `SECT_GOVERNMENT` | Secteur public | Bas |
| `SECT_NGO` | ONG / Associatif | Très bas |
| `SECT_TRANSPORT` | Transport / Logistique | Moyen-bas |
| `SECT_CONSTRUCTION` | BTP / Construction | Bas |

**Usage** : Strategy.sector, budget formula (coefficient α), Knowledge Graph (benchmarks sectoriels), VERTICAL_DICTIONARY (vocabulaire)

---

## T.10 — Profils de maturité

| Code | Profil | Coverage attendue | Mode génération | Ratio descriptif/projectif |
|---|---|---|---|---|
| `MAT_MATURE` | Mature | 100% | Descriptif | 100/0 |
| `MAT_GROWTH` | Croissance | 70% | Mixte | 70/30 |
| `MAT_STARTUP` | Startup | 40% | Projectif | 40/60 |
| `MAT_LAUNCH` | Lancement | 0% | Vision | 0/100 |

**Usage** : Strategy.maturityProfile, génération AI (adaptation du ton), scoring (seuils ajustés), budget formula (coefficient β)

---

## T.11 — Marchés géographiques

| Code | Marché | Devise | Coefficient γ (environnement) |
|---|---|---|---|
| `MKT_CM` | Cameroun | XAF | Référence |
| `MKT_CI` | Côte d'Ivoire | XOF | Comparable |
| `MKT_SN` | Sénégal | XOF | Comparable |
| `MKT_GA` | Gabon | XAF | Pouvoir d'achat + |
| `MKT_CG` | Congo-Brazzaville | XAF | Comparable |
| `MKT_CD` | RD Congo | CDF | Volatilité + |
| `MKT_BF` | Burkina Faso | XOF | Pouvoir d'achat - |
| `MKT_ML` | Mali | XOF | Instabilité + |
| `MKT_BJ` | Bénin | XOF | Comparable |
| `MKT_TG` | Togo | XOF | Pouvoir d'achat - |
| `MKT_NE` | Niger | XOF | Pouvoir d'achat -- |
| `MKT_TD` | Tchad | XAF | Instabilité + |
| `MKT_GN` | Guinée | GNF | Volatilité + |
| `MKT_MG` | Madagascar | MGA | Isolé |
| `MKT_FR` | France (diaspora) | EUR | Référence premium |
| `MKT_GLOBAL` | Multi-marché | — | Agrégé |

**Usage** : Strategy.market, Driver (adaptation multi-marché), budget formula (coefficient γ), Market Study, pricing

---

## T.12 — Segments Superfan

| Code | Segment | Comportement | Transition vers le suivant |
|---|---|---|---|
| `AUDIENCE` | Audience | Exposée à la marque, aucune interaction | Premier follow/inscription ou premier clic campagne |
| `FOLLOWER` | Follower | Suit la marque sur au moins un canal | ≥3 interactions en 30 jours |
| `ENGAGED` | Engagé | Interagit régulièrement (likes, comments, clicks) | Premier achat OU ≥1 UGC OU ≥5 shares en 30 jours |
| `FAN` | Fan | Achète, crée du contenu, partage | engagementDepth ≥ 50 ET (referralCount ≥ 1 OU defenseCount ≥ 1) |
| `SUPERFAN` | Superfan | Défend et réfère activement | engagementDepth ≥ 80 ET referralCount ≥ 3 ET ugcCount ≥ 5 ET defenseCount ≥ 2 |
| `EVANGELIST` | Évangéliste | Convertit activement, incarne la marque | — (niveau terminal) |

**Distinction T.07 vs T.12** : T.07 (Devotion Ladder) est le modèle stratégique — comment concevoir la progression d'audience. T.12 (Segments Superfan) est le modèle opérationnel — comment classer les individus réels avec des seuils mesurables. T.07 sert le design (pilier E). T.12 sert le tracking (Cult Index).

**Usage** : SuperfanProfile.segment (N2.16), DevotionSnapshot (N2.18), CommunitySnapshot.bySegment (N2.17), `devotion-evaluator` service

---

## T.13 — Cult Tiers

| Score Cult Index | Code | Label FR | Description |
|---|---|---|---|
| 0-20 | `GHOST` | Marque fantôme | Existe mais personne ne s'en soucie |
| 21-40 | `FUNCTIONAL` | Marque fonctionnelle | On achète par habitude |
| 41-60 | `LOVED` | Marque aimée | Préférence active |
| 61-80 | `EMERGING` | Culte émergent | Les fans commencent à évangéliser |
| 81-100 | `CULT` | Marque culte | La communauté vit pour la marque |

**Usage** : DevotionSnapshot.cultTier (N2.18), CommunitySnapshot (référence), Value Report, Client Portal

---

# NIVEAU 1 — ATOMES

La plus petite unité de donnée indivisible. Chaque atome a un type, des contraintes de valeur, et un pilier source.

## N1.01 — Atomes scalaires

| ID | Nom | Type | Contraintes | Pilier | Exemple |
|---|---|---|---|---|---|
| `atom.text` | Texte libre | string | min/max chars configurable | * | "Notre mission est..." |
| `atom.text_short` | Texte court | string | max:150 chars | * | Un slogan, un nom |
| `atom.text_medium` | Texte moyen | string | min:50, max:500 chars | * | Une description, un acte |
| `atom.text_long` | Texte long | string | min:100, max:2000 chars | * | Un résumé exécutif |
| `atom.number` | Nombre | number | min/max configurable | * | Un prix, un score |
| `atom.currency` | Montant monétaire | number + devise | ≥0, devise dans T.11 | V | 150000 XAF |
| `atom.percentage` | Pourcentage | number | 0-100 | * | 15% |
| `atom.ratio` | Ratio | number | ≥0 | V | LTV/CAC = 3.5 |
| `atom.score_100` | Score /100 | number | 0-100, entier | R,T,E | riskScore, bmfScore, engagementDepth |
| `atom.score_25` | Score /25 | number | 0-25, 2 décimales | * | Score pilier |
| `atom.boolean` | Booléen | boolean | true/false | * | Est-ce vérifié ? |
| `atom.date` | Date | ISO string | format valide | * | 2026-03-24 |
| `atom.duration_months` | Durée en mois | number | ≥1, entier | V | dureeLTV = 24 |
| `atom.rank` | Rang | number | ≥1, unique dans son contexte | A | Rang de valeur = 1 |
| `atom.url` | URL | string | format URL valide | D | portfolioUrl |
| `atom.hex_color` | Couleur | string | format #RRGGBB | D | #10B981 |

---

## N1.02 — Atomes énumérés (sélection dans une taxonomie N0)

| ID | Nom | Taxonomie source | Cardinalité | Pilier |
|---|---|---|---|---|
| `atom.archetype` | Archétype | T.01 | 1 primaire + 0-1 secondaire | A |
| `atom.schwartz_value` | Valeur Schwartz | T.02 | Sélection 3-7 parmi 10 | A |
| `atom.lf8` | Levier LF8 | T.03 | Sélection 1-3 parmi 8 | D |
| `atom.tension_axis` | Axe de tension | T.04 | Sélection 1-2 parmi 6 | D |
| `atom.aarrr_stage` | Étape AARRR | T.05 | 1 parmi 5 | E, Campaign |
| `atom.action_type` | Type d'action | T.06 | 1 parmi 75 (ATL+BTL+TTL) | Campaign |
| `atom.action_category` | Catégorie d'action | {ATL, BTL, TTL} | 1 parmi 3 | Campaign |
| `atom.devotion_level` | Niveau Devotion | T.07 | 1 parmi 6 | A, E |
| `atom.channel` | Canal | T.08 | 1 parmi 20 | Driver |
| `atom.sector` | Secteur | T.09 | 1 parmi 17 | Strategy |
| `atom.maturity` | Maturité | T.10 | 1 parmi 4 | Strategy |
| `atom.market` | Marché | T.11 | 1+ parmi 16 | Strategy |
| `atom.superfan_segment` | Segment Superfan | T.12 | 1 parmi 6 | E |
| `atom.cult_tier` | Cult Tier | T.13 | 1 parmi 5 | E |
| `atom.touchpoint_type` | Type touchpoint | {physique, digital, humain} | 1 parmi 3 | E |
| `atom.ritual_type` | Type rituel | {always-on, cyclique} | 1 parmi 2 | E |
| `atom.risk_level` | Niveau de risque | {low, medium, high, critical} | 1 parmi 4 | R |
| `atom.urgency` | Urgence | {immediate, short_term, medium_term, long_term} | 1 parmi 4 | R |
| `atom.hypothesis_status` | Statut hypothèse | {validated, invalidated, to_test} | 1 parmi 3 | T |
| `atom.lifecycle_phase` | Phase cycle de vie | {launch, growth, mature, decline} | 1 parmi 4 | V |
| `atom.product_category` | Catégorie produit | {produit, service} | 1 parmi 2 | V |
| `atom.cost_category` | Catégorie coût | {capex, opex, cout_cache, friction, migration, apprentissage} | 1 parmi 6 | V |
| `atom.value_category` | Catégorie valeur | {fonctionnel, emotionnel, social} | 1 parmi 3 | V |
| `atom.guild_tier` | Tier guilde | {APPRENTI, COMPAGNON, MAITRE, ASSOCIE} | 1 parmi 4 | Guilde |
| `atom.mission_mode` | Mode mission | {DISPATCH, COLLABORATIF} | 1 parmi 2 | Mission |

---

## N1.03 — Atomes dérivés (calculés depuis d'autres atomes)

| ID | Nom | Formule | Inputs | Pilier |
|---|---|---|---|---|
| `atom.marge_unitaire` | Marge unitaire | `(prix - cout) / prix × 100` | prix, cout d'un produit | V |
| `atom.ltv_cac_ratio` | Ratio LTV/CAC | `ltv / cac` | ltv, cac | V |
| `atom.marge_nette` | Marge nette | `CA - budget_total` | CA visé, budget paramétrique | V |
| `atom.roi_estime` | ROI estimé | `(ltv × clients_estimes - investissement) / investissement` | ltv, cac, som | V |
| `atom.payback_period` | Période de retour | `cac / (ltv / duree_ltv)` | cac, ltv, duree_ltv | V |
| `atom.budget_parametrique` | Budget paramétrique | `CA × α(secteur) × β(maturité) × γ(environnement)` | CA, secteur, maturité, marché | V→I |
| `atom.risk_score` | Score de risque | `Σ(critical×30 + high×15 + medium×5 + low×1) × normalisation` | microSwots.riskLevel | R |
| `atom.bmf_score` | Score Brand-Market Fit | Évaluation multi-critères (validation hypothèses × triangulation × TAM crédibilité) | Données T complètes | T |
| `atom.coherence_score` | Score cohérence | Évaluation cross-pilier (A↔D↔V↔E cohérence) | Tous les piliers | S |
| `atom.engagement_depth` | Profondeur d'engagement | `min(100, ugc×10 + defense×15 + referral×20 + share×2 + event×5 + purchase×3)` — caps par composante | SuperfanProfile counters | E |
| `atom.superfan_velocity` | Vélocité superfan | `f(newSuperfans_30j / newSuperfans_prev30j)` → 50=stable, >50=accélération | SuperfanProfile.promotedAt | E |
| `atom.community_cohesion` | Cohésion communauté | `retentionRate × 0.6 + activityRate × 0.4` (×100) | CommunitySnapshot | E |
| `atom.brand_defense_rate` | Taux de défense | `totalDefenses / (superfanCount × 3)` (×100) | SuperfanProfile agrégés | E |
| `atom.ugc_rate` | Taux UGC | `(totalUGC / totalCommunity) × 1000 × 2` (50/1000=100) | SuperfanProfile agrégés | E |
| `atom.ritual_adoption` | Adoption rituels | `(totalShares / totalCommunity) × 1000` | SuperfanProfile agrégés | E |
| `atom.evangelism_score` | Score évangélisme | `(evangelistRatio × 500 + referralIntensity × 20) / 2` | SuperfanProfile agrégés | E |
| `atom.cult_index` | Cult Index | Somme pondérée de 7 dimensions (détail en Partie 2, §Scoring) | 7 dimensions ci-dessus | E→Signal |
| `atom.superfan_ratio` | Ratio superfan | `(SUPERFAN + EVANGELIST) / totalCommunity × 100` | DevotionSnapshot | E |
| `atom.pyramid_health` | Santé pyramide | Classification par seuils de superfan_ratio (détail N2.18) | DevotionSnapshot | E |
| `atom.bottleneck_segment` | Goulot Devotion | `min(conversionRates.rate)` → segment avec la conversion la plus basse | DevotionSnapshot | E |
| `atom.score_pilier` | Score /25 | `score_structural × quality_modulator` | Rubrique structurelle + AI modulator | Chaque pilier |
| `atom.composite_200` | Score /200 | `Σ score_pilier` (8 piliers) | 8 × score_pilier | S |

---

## N1.04 — Segments de tension (atomes de la Grille T.04)

Chaque segment est un atome composé de 3 sous-champs fixes.

```typescript
interface TensionSegment {
  axis: atom.tension_axis;        // Ex: TENSION_MONEY
  segment: string;                // Ex: "Les nouveaux riches"
  fear: atom.text_short;          // "Terreur de ne pas être légitimes"
  hiddenDesire: atom.text_short;  // "Désir de validation par les codes"
  buyingPattern: atom.text_medium; // "Luxe ostentatoire, clubs privés, marques-signaux, mentors à 10K"
  lf8Mapping: atom.lf8[];         // [LF6, LF8] — Supériorité + Approbation sociale
}
```

**Segments par axe** :

| Axe | Segments |
|---|---|
| TENSION_MONEY | Les riches, Les nouveaux riches, La classe moyenne supérieure, La classe moyenne, Les pauvres ambitieux, Les pauvres résignés |
| TENSION_AGE | Les vieux, Les vieux actifs, Les 40-50, Les 30-35, Les 20-25, Les ados |
| TENSION_GENDER | Les hommes, Les hommes en couple, Les femmes, Les femmes ambitieuses, Les mères, Les pères |
| TENSION_IDENTITY | Les expatriés, Les marginaux/alternatifs, Les convertis, Les premiers de la classe, Les intellectuels, Les créatifs |
| TENSION_POWER | Les leaders, Les entrepreneurs, Les politiques, Les influenceurs, Les employés ambitieux |
| TENSION_RELATION | Les solitaires, Les couples installés, Les divorcés, Les self-made |

**Total : 33 segments × 3 champs + LF8 mapping = le référentiel psychométrique complet.**

**Usage** : D.personas.tensionProfile (chaque persona est mappé sur 1-2 segments), E.sacraments (les triggers sont dérivés des désirs cachés), Campaign (ciblage émotionnel)

---

# NIVEAU 2 — COMPOSITES (Partie 1 : N2.01–N2.12)

Structures composées d'atomes. Chaque composite a un type, une liste de champs atomiques, et des règles de validation.

> Les composites N2.13–N2.18 (Signal, Enemy, DA, Superfan, Community, Devotion) sont dans la Partie 2.

## N2.01 — Valeur de marque

```typescript
interface BrandValue {                      // Pilier A
  value: atom.schwartz_value;               // Sélection dans T.02
  customName: atom.text_short;              // Nom affiné (ex: "L'audace de proposer")
  rank: atom.rank;                          // Unique, séquentiel
  justification: atom.text_medium;          // Pourquoi ce rang
  costOfHolding: atom.text_medium;          // Quand cette valeur coûte quelque chose
  tensionWith: atom.schwartz_value[];       // Valeurs en tension (vérifié contre T.02)
}
```

**Validation** : `rank` unique dans le set, `tensionWith` cohérent avec T.02, `costOfHolding` non vide (une valeur sans coût n'est pas une valeur)

---

## N2.02 — Acte du Hero's Journey

```typescript
interface HeroJourneyAct {                  // Pilier A
  actNumber: 1 | 2 | 3 | 4 | 5;
  title: atom.text_short;                   // "Les origines", "L'appel", etc.
  narrative: atom.text_medium;              // Le récit de cet acte
  emotionalArc: atom.text_short;            // L'émotion dominante (empathie, tension, vulnérabilité, espoir, inspiration)
  causalLink: atom.text_short;              // Lien avec l'acte précédent (vide pour acte 1)
}
```

**Validation** : 5 actes séquentiels, `causalLink` non vide pour actes 2-5, `emotionalArc` suit une progression (pas 5 fois la même émotion)

---

## N2.03 — Ikigai de marque

```typescript
interface BrandIkigai {                     // Pilier A
  love: atom.text_medium;                   // Ce qu'on aime (passion, pas métier)
  competence: atom.text_medium;             // Ce qu'on fait le mieux (vérifiable)
  worldNeed: atom.text_medium;              // Ce dont le monde a besoin (formulé comme manque)
  remuneration: atom.text_medium;           // Ce pour quoi on nous paie (transfert de valeur)
  intersection: atom.text_medium;           // L'intersection (raison d'être — dérivé des 4)
}
```

**Validation** : 4 champs non vides + `intersection` qui doit contenir des éléments des 4 autres champs. Cross-ref : `competence` → D.avantagesCompetitifs, `remuneration` → V.produitsCatalogue

---

## N2.04 — Persona

```typescript
interface Persona {                         // Pilier D
  id: string;                               // "persona-001"
  name: atom.text_short;                    // Prénom + contexte ("Brice, 34 ans, DG PME")
  priority: atom.rank;                      // 1 = persona principal

  // Démographie
  age: atom.number;
  csp: atom.text_short;
  location: atom.market;
  income: atom.text_short;
  familySituation: atom.text_short;

  // Psychométrie
  tensionProfile: TensionSegment;           // N1.04
  lf8Dominant: atom.lf8[];                  // 1-3 LF8 dominants (de T.03)
  schwartzValues: atom.schwartz_value[];    // 2-3 valeurs dominantes du persona (de T.02)
  
  // Psychographie
  lifestyle: atom.text_medium;
  mediaConsumption: atom.text_medium;
  brandRelationships: atom.text_medium;

  // Motivations & Freins
  motivations: atom.text_medium;
  fears: atom.text_medium;
  hiddenDesire: atom.text_medium;           // De tensionProfile.hiddenDesire
  whatTheyActuallyBuy: atom.text_medium;    // De tensionProfile.buyingPattern

  // Parcours
  jobsToBeDone: atom.text_medium[];
  decisionProcess: atom.text_medium;
  devotionPotential: atom.devotion_level;
}
```

**Validation** : au moins `name`, `tensionProfile`, `lf8Dominant`, `motivations`, `fears` non vides. Cross-ref : `schwartzValues` doit avoir au moins 1 valeur en commun avec A.valeurs.

---

## N2.05 — Produit/Service (SKU)

```typescript
interface ProduitService {                  // Pilier V
  id: string;
  nom: atom.text_short;
  categorie: atom.product_category;
  prix: atom.currency;
  cout: atom.currency;
  margeUnitaire: atom.marge_unitaire;       // Dérivé

  // Valeur (matrice 2×2×2 : client/marque × concret/abstrait × gain/coût)
  gainClientConcret: atom.text_medium;
  gainClientAbstrait: atom.text_medium;
  gainMarqueConcret: atom.text_medium;
  gainMarqueAbstrait: atom.text_medium;
  coutClientConcret: atom.text_medium;
  coutClientAbstrait: atom.text_medium;
  coutMarqueConcret: atom.currency;
  coutMarqueAbstrait: atom.text_medium;

  // Positionnement
  lienPromesse: atom.text_medium;           // Comment ce produit incarne la promesse maître (ref D)
  segmentCible: string;                     // ID du persona visé
  phaseLifecycle: atom.lifecycle_phase;
  
  // Persuasion
  leviersPsychologiques: atom.text_short[];
  maslowMapping: atom.text_short;
  lf8Trigger: atom.lf8[];
  scoreEmotionnelADVE: atom.score_100;

  // Distribution
  canalDistribution: atom.channel[];
  disponibilite: atom.text_short;
  
  // Catalogue
  skuRef: atom.text_short;
  variantes: string[];
  dependencies: string[];
}
```

**Validation** : `prix` et `cout` > 0. `margeUnitaire` calculé. `segmentCible` → persona.id existant. `lienPromesse` non vide.

---

## N2.06 — Package (composite de produits)

```typescript
interface Package {                         // Pilier V
  id: string;
  nom: atom.text_short;
  produitIds: string[];
  prixPackage: atom.currency;
  reduction: atom.percentage;
  segmentCible: string;
  rationale: atom.text_medium;
}
```

**Validation** : `produitIds` → V.produitsCatalogue. `prixPackage` ≤ Σ prix des produits inclus.

---

## N2.07 — Tier du Product Ladder

```typescript
interface ProductLadderTier {               // Pilier V
  tier: atom.text_short;                    // "Starter", "Pro", "Enterprise"
  prix: atom.text_short;
  produitIds: string[];
  cible: string;                            // Persona ID
  description: atom.text_medium;
  position: atom.rank;                      // 1 = entrée de gamme
}
```

**Validation** : tiers ordonnés par prix croissant. Chaque tier cible un segment distinct.

---

## N2.08 — Touchpoint

```typescript
interface Touchpoint {                      // Pilier E
  canal: atom.text_short;                   // Spécifique ("Instagram Stories", pas "réseaux sociaux")
  type: atom.touchpoint_type;
  channelRef: atom.channel;
  role: atom.text_medium;
  aarrStage: atom.aarrr_stage;
  devotionLevel: atom.devotion_level[];
  priority: atom.rank;
  frequency: atom.text_short;
}
```

**Validation** : 3 types représentés. Chaque étape AARRR couverte. `channelRef` → canal avec Driver activable.

---

## N2.09 — Rituel

```typescript
interface Ritual {                          // Pilier E
  nom: atom.text_short;
  type: atom.ritual_type;
  frequency: atom.text_short;
  description: atom.text_medium;
  devotionLevels: atom.devotion_level[];
  touchpoints: string[];
  aarrPrimary: atom.aarrr_stage;
  kpiMeasure: atom.text_short;
  sacredCalendarLink: string | null;
}
```

**Validation** : min:1 always-on + min:1 cyclique. `devotionLevels` couvre ≥3 niveaux.

---

## N2.10 — Action Marketing (opération)

```typescript
interface MarketingAction {                 // Pilier E → I → Campaign
  id: string;
  name: atom.text_short;
  type: atom.action_type;                   // De T.06
  category: atom.action_category;           // ATL / BTL / TTL
  
  // Ciblage
  aarrStage: atom.aarrr_stage;
  aarrSecondary: atom.aarrr_stage | null;
  personaTarget: string[];
  devotionTarget: atom.devotion_level[];
  
  // Exécution
  channels: atom.channel[];
  duration: atom.text_short;
  frequency: atom.text_short;
  geography: atom.market[];
  
  // Créatifs nécessaires
  keyVisual: atom.boolean;
  video: atom.boolean;
  audio: atom.boolean;
  copywriting: atom.boolean;
  eventBranding: atom.boolean;

  // Costing
  costingUnit: "CPM" | "CPC" | "CPL" | "CPA" | "FLAT";
  coutUnitaire: atom.currency;
  volumeEstime: atom.number;
  budgetEstime: atom.currency;              // Dérivé
  
  // Performance attendue
  kpiPrimary: atom.text_short;
  kpiTarget: atom.text_short;
  rendementDecroissant: atom.percentage;
  
  // Composition
  subActions: string[];
  skuPromoted: string[];
}
```

**Validation** : `type` cohérent avec `category`. `skuPromoted` → V.produitsCatalogue. Si `eventBranding` = true → voir N2.11.

---

## N2.11 — Événement (sous-marque)

```typescript
interface BrandEvent {                      // Pilier E → I → Campaign
  id: string;
  name: atom.text_short;
  parentBrandRef: string;
  
  // L'événement EST une sous-marque
  eventArchetype: atom.archetype;
  eventPromise: atom.text_short;
  eventIdentity: {
    colorOverride: atom.hex_color[];
    moodOverride: atom.text_medium;
    toneOverride: atom.text_short;
  };
  
  // Opérationnel
  format: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  capacity: atom.number;
  budget: atom.currency;
  
  // Composition
  actions: string[];
  team: Array<{name: string, role: string, fee: atom.currency}>;
  ambassadors: Array<{name: string, handle: string, deliverables: string[]}>;
}
```

**Validation** : `eventArchetype` compatible avec l'archétype de la marque mère. `eventPromise` décline D.promessesDeMarque.promesseMaitre.

---

## N2.12 — Brief de campagne

```typescript
interface CampaignBrief {                   // Pilier I → Campaign Manager
  id: string;
  campaignRef: string;
  
  // Direction stratégique (de A + D)
  axeStrategique: atom.text_medium;
  pisteCreative: atom.text_medium;
  bigIdea: {
    concept: atom.text_medium;
    mechanism: atom.text_short;
    insightLink: atom.text_medium;
    declinaisons: Array<{
      support: atom.channel;
      description: atom.text_medium;
    }>;
  };
  
  // Intention AARRR
  aarrPrimary: atom.aarrr_stage;
  aarrSecondary: atom.aarrr_stage | null;
  aarrIntention: atom.text_medium;
  
  // Budget
  budget: atom.currency;
  budgetAllocation: Array<{
    category: "PRODUCTION" | "MEDIA" | "TALENT" | "LOGISTICS" | "TECHNOLOGY" | "LEGAL" | "CONTINGENCY" | "AGENCY_FEE";
    amount: atom.currency;
  }>;
  
  // Opérations recommandées
  recommendedActions: string[];
  
  // Cibles
  personaTargets: string[];
  devotionObjective: {
    from: atom.devotion_level;
    to: atom.devotion_level;
    targetPercentage: atom.percentage;
  };
  
  // Contraintes
  timeline: {start: atom.date, end: atom.date};
  markets: atom.market[];
  mandatoryChannels: atom.channel[];
  prohibitedChannels: atom.channel[];
}
```

**Validation** : `budget` ≤ budget restant campagne. `aarrPrimary` cohérent avec le type de campagne. `bigIdea.concept` dérivable du positionnement D.

---

*Suite dans la Partie 2 — Systèmes & Intelligence (N2.13–N2.18, N3, N4, N5, N6, Scoring, GLORY→Piliers)*
