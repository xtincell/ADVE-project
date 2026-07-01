# ANNEXE D — Systèmes existants (ARTEMIS, Mestor, Serenite, Tarsis, Brand OS, Guilde)

> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md § 6

---

## D.1 ARTEMIS — Système de frameworks analytiques

### Vue d'ensemble
24 frameworks organisés en 9 couches philosophiques. ARTEMIS est la batterie de diagnostic et d'analyse qui alimente les piliers ADVE.

### Les 24 frameworks par couche

**COUCHE 0 — PHILOSOPHIE**
| ID | Nom | Type | Description |
|----|-----|------|-------------|
| FW-01 | ADVE Cult Marketing | théorique | Cadre théorique (pas d'implémentation code) |
| FW-20 | Movement Architecture | hybride | Prophétie, ennemi, doctrine, artefacts, mythologie vivante |

**COUCHE 1 — IDENTITÉ**
| FW-02 | ADVERTIS Pipeline | hybride | Moteur 8 piliers (pipeline existant) |
| FW-05 | Grammar Systems | IA | Triple grammaire (conceptuelle, iconographique, transconcept), validation C×F×P |

**COUCHE 2 — VALEUR**
| FW-03 | Parametric Budget | calcul | Modélisation de coûts déterministe |
| FW-13 | Value Exchange Design | hybride | Mapping tier-segment, signaux d'appartenance, gradient d'exclusivité |
| FW-21 | Value Capture Engine | hybride | Modélisation revenus, mécaniques de pricing, scénarios de monétisation |
| FW-24 | Alliance Architecture | IA | Taxonomie partenariats B2B, protocoles de négociation, matrices de valeur mutuelle |

**COUCHE 3 — EXPÉRIENCE**
| FW-11 | Experience Architecture | hybride | Transitions de conversion superfan, arcs émotionnels, moments de vérité, cartographie frictions |
| FW-12 | Narrative Engineering | IA | Arcs narratifs par étape, textes sacrés, vocabulaire par étape, banque d'histoires |
| FW-04 | Narrative Immersive | IA | Narratif événementiel (North Star, factions, cartes spatiales, quêtes, PNJ, sponsoring diégétique) |

**COUCHE 4 — VALIDATION**
| FW-06 | Signal Intelligence System | hybride | Intelligence marché temps réel (utilise TARSIS existant) |

**COUCHE 5 — EXÉCUTION**
| FW-09 | GLORY Production System | IA | Système créatif 39 outils (GLORY existant) |
| FW-18 | Internal Alignment System | IA | Dimension organique (internalisation, rituels, cartographie clergé) |
| FW-22 | Creative Methodology Layer | calcul | Kubo Titling, Nano Banana, Pinterest Curation, DA Diagnostic |
| FW-23 | Execution Sequencing Engine | hybride | GTM launch, planification annuelle, production événementielle, rétroplanning |

**COUCHE 6 — MESURE**
| FW-07 | Cult Index Engine | calcul | Score d'engagement communautaire 0-100, 7 métriques composites |
| FW-08 | Superfan Segmentation | calcul | Ladder 6 étapes avec tracking de transition |
| FW-10 | Attribution & Cohort Analysis | calcul | Attribution canal, LTV cohorte, conversion touchpoint |

**COUCHE 7 — CROISSANCE**
| FW-19 | Growth Mechanics Engine | hybride | Flywheel, breakpoints de scaling, matrice Ansoff, monétisation communauté |
| FW-15 | Cultural Expansion Protocol | IA | Adaptation nouveau marché, transposition culturelle, légitimité locale |
| FW-16 | Brand Architecture System | calcul | Gestion portfolio, règles d'héritage, cult index cross-marque |

**COUCHE 8 — SURVIE**
| FW-14 | Brand Evolution Engine | calcul | Mutation contrôlée, identité immuable vs mutable, détection de dérive |
| FW-17 | Brand Defense Protocol | hybride | Cartographie menaces, défense communautaire, narratif de crise, ennemi comme carburant |

### Modèle d'exécution
- **théorique** : pas de code
- **calcul** : synchrone, résultat immédiat
- **IA** : asynchrone, retourne runId pour polling
- **hybride** : choisit selon complexité

### Pipeline d'exécution
1. Valider framework + vérifier implémentation
2. Créer/réutiliser `FrameworkRun` (status, durée, inputs/outputs)
3. Résoudre variables d'entrée depuis `BrandVariable` store
4. Vérifier condition `nodeType` (certains frameworks = EVENT, EDITION uniquement)
5. Exécuter handler
6. Persister `FrameworkOutput` (JSON, staleness tracking)
7. Synchroniser variables de sortie vers `BrandVariable` store
8. Mettre à jour statut `FrameworkRun`

### Procédures router (14)
`list`, `get`, `getGraph` (graphe de dépendances), `getStale`, `getOutput`, `getOutputs`, `execute`, `getRunHistory`, `orchestrate` (exécution en série avec tri topologique), `getQualityGates`, `getArtemisScore`, `getOrchestrationHistory`, `getLayerDetail`

---

## D.2 MESTOR — Assistant IA stratégique

### Vue d'ensemble
Mestor est l'assistant IA contextuel embarqué. Il fonctionne en 3 modes : conversation, insights proactifs, scénarios.

### Mode Conversation (threads)
- Threads par utilisateur × stratégie
- Historique : 40 messages chargés pour contexte
- Système prompt : expert ADVERTIS 8 piliers, campagnes, Brand OS, GLORY, RADAR, BOOST, GUILDE, SOCLE
- Sortie : français, professionnel, actionnable, 400 mots max, structuré (bullet points/markdown)

**Procédures** : `listThreads`, `getThread`, `createThread`, `sendMessage`, `deleteThread`

### Mode Insights (proactif)
Insights rule-based + optionnels AI-generated :

| Règle | Condition | Sévérité |
|-------|-----------|----------|
| Cohérence < 30 | Score coherence snapshot | CRITICAL |
| Cohérence < 50 | Score coherence snapshot | HIGH |
| Piliers incomplets | Phase ≠ "fiche" et piliers pending | RECOMMENDATION |
| Signaux critiques | Signaux status CRITICAL/WARNING | ALERT |
| Cult Index < 30 | Cult index snapshot | OPPORTUNITY |

Déduplication 24h. Expiration 7 jours. Types : OPPORTUNITY, RISK, RECOMMENDATION, ALERT, TREND.

**Procédures** : `insights.list`, `insights.markRead`, `insights.markActioned`, `insights.unreadCount`, `insights.generate`

### Mode Scénarios
Types : WHAT_IF, BUDGET_REALLOC, MARKET_ENTRY, COMPETITOR_RESPONSE

Analyse AI : prend paramètres + assumptions → projectedOutcomes + aiAnalysis + recommendation.

**Procédures** : `scenarios.list`, `scenarios.create`, `scenarios.analyze`

### Context Builder
Charge pour chaque appel AI :
- Métadonnées stratégie (nom, secteur, phase, scores)
- Statut piliers (A-D-V-E-R-T-I-S completion)
- Signaux actifs (10 derniers)
- Campagnes actives (5 dernières)
- Dernier Cult Index snapshot
- Dernier Community snapshot

### Enrichissement Industry OS
Mestor devient **contextuel par portal** :
- Client Portal : contexte Brand OS, ne révèle jamais les mécaniques internes
- Creator Portal : mission + guidelines Driver, niveau ADVE selon tier
- Fixer Console : tout l'écosystème, comparaisons cross-clients
- Quick Intake : guide conversationnel (mode interview dirigée)

---

## D.3 SERENITE — Module financier

### Vue d'ensemble
Gestion complète du cycle de vie financier : factures, contrats, escrow, commissions.

### Factures
- Types : FACTURE, DEVIS, BON_COMMANDE, AVOIR
- Machine à états : DRAFT → SENT → ACCEPTED → PAID (+ OVERDUE, CANCELLED)
- Numérotation séquentielle auto (`FAC-2024-00123`)
- Items liés aux assignments pour traçabilité
- Currency par défaut : XAF

### Contrats
- Types : NDA, PRESTATION, CESSION_DROITS, PORTAGE
- Machine à états : DRAFT → SENT → SIGNED → ACTIVE → EXPIRED / TERMINATED
- Signature data stockée (signatureData JSON)

### Escrow
- Machine à états : PENDING → HELD → PARTIALLY_RELEASED → RELEASED / REFUNDED
- Support release partiel (releasedAmount cumulatif)
- releaseCondition en texte libre

### Commissions (existant)
- Calcul basé sur level talent (NOVICE → EXPERT) × COMMISSION_RATES
- grossAmount − commissionAmount = netAmount
- Statuts : CALCULATED → INVOICED → PAID

### Dashboard financier
- totalRevenue (factures PAID)
- unpaidAmount (SENT/ACCEPTED/OVERDUE)
- escrowHeld
- totalCommissions
- avgCommissionRate
- invoicesByStatus (agrégé)
- recentInvoices (10 dernières)

### Enrichissement Industry OS
- Ajout `tierAtTime GuildTier` sur Commission (tier au moment du calcul)
- Ajout `operatorFee Float` (part reversée à UPgraders par opérateur licencié)
- Ajout Membership model (cotisation Guilde par tier)
- Intégration Mobile Money (webhooks Orange/MTN/Wave) en Phase 4

---

## D.4 TARSIS — Intelligence marché

### Vue d'ensemble
Système d'intelligence en 2 parties : Signal Intelligence System (SIS) + Market Context Intelligence.

### Signal Intelligence System (SIS)
3 couches de signaux :
- **METRIC** : KPIs quantitatifs
- **STRONG** : tendances confirmées
- **WEAK** : signaux faibles émergents

Chaque signal est lié à un pilier (A-D-V-E-R-T-I-S) et porte un confidence score.

Mutations avec audit trail complet (SignalMutation : fromStatus → toStatus + reason).

Propagation : signal CRITICAL/BET → Decision Queue automatique. Mutation → marque le pilier stale.

**Procédures** : `create`, `getByStrategy`, `getByPillar`, `mutate`, `delete`, `getMutationHistory`, `bulkCreateFromAudit`

### Market Context Intelligence

| Sous-module | Procédures | Description |
|-------------|-----------|-------------|
| Competitors | `getByStrategy`, `upsert`, `delete` | SOV, positionnement, forces/faiblesses, moves récents |
| Opportunities | `getByStrategy`, `create`, `update`, `delete` | Calendrier opportunités (SEASONAL/CULTURAL/COMPETITIVE/INTERNAL) avec impact et canaux |
| Budget Tiers | `getByStrategy`, `upsert`, `seedDefaults`, `delete` | 5 tiers (MICRO → DOMINATION) avec canaux et KPIs |
| Cross-Brand Intel | `getAll` | Agrégation cross-stratégies : patterns sectoriels récurrents (2+ marques même secteur) |
| Metric Thresholds | `getByStrategy`, `upsert`, `delete` | Seuils d'alerte par métrique/pilier |

### Enrichissement Industry OS
- Ajout `advertis_vector Json?` sur Signal (impact ADVE du signal)
- Connexion feedback loop : Signal → recalcul score pilier → diagnostic ARTEMIS → prescription
- Connexion Knowledge Graph : patterns cross-clients alimentent benchmarks sectoriels

---

## D.5 Brand OS (Cult Index, Superfans, Community)

### Cult Index Engine
Score 0-100 calculé sur 7 dimensions :

| Dimension | Source | Calcul |
|-----------|--------|--------|
| Engagement Depth | SuperfanProfile.avgEngagementDepth | Moyenne |
| Superfan Velocity | Nouveaux superfans 30j vs 30j précédents | Accélération |
| Community Cohesion | Rétention × activité | 0.6 × retention + 0.4 × activity |
| Brand Defense Rate | % superfans défendant la marque | totalDefenses / superfanCount / 3 |
| UGC Generation Rate | Contenu généré par la communauté | UGC per 1000 members |
| Ritual Adoption | Proxy via shares | Shares per 1000 |
| Evangelism Score | Ratio évangélistes + intensité referral | evangelist ratio (500x) + referral (20x) |

Weights par défaut : distribution égale (1/7 chacun).

### SuperfanProfile (6 segments Devotion Ladder)
AUDIENCE → FOLLOWER → ENGAGED → FAN → SUPERFAN → EVANGELIST

Métriques trackées : engagementDepth (0-100), totalInteractions, ugcCount, defenseCount, shareCount, purchaseCount, referralCount.

### CommunitySnapshot
Snapshots périodiques : healthScore, growthRate, retentionRate, activityRate, sentimentAvg, totalMembers, topTopics, toxicityLevel, crisisSignals.

### BrandOSConfig
Configuration par stratégie : theme (primaryColor, logoUrl, fontFamily), enabledViews, refreshCadence (HOURLY/DAILY/WEEKLY), socialCredentials, cultWeights.

### Social Channels
6 plateformes : INSTAGRAM, FACEBOOK, TIKTOK, TWITTER, YOUTUBE, LINKEDIN. Métriques : followers, engagementRate, avgReach, avgImpressions, postFrequency, responseTime, sentimentScore, healthStatus.

### Ambassador Program
Tiers : BRONZE → SILVER → GOLD → PLATINUM → DIAMOND. Métriques : referralCount, contentCount, eventCount, revenueGenerated, engagementScore, pointsBalance.

---

## D.6 La Guilde (Talent Engine)

### TalentProfile (existant)
- displayName, bio, headline, experienceYears
- location, country, languages, specializations, skills, tools, sectors
- portfolioUrls, linkedinUrl, showreel
- tjmMin, tjmMax, currency (XAF), category (CORE/EXTENDED/RESEAU)
- availability, level (NOVICE → COMPETENT → CONFIRMED → EXPERT → LEGEND)
- totalMissions, avgScore

### Talent Engine (services)
- `upsertProfile`, `getProfile`, `searchTalents` (paginated avec filtres)
- `matchTalents` (scoring pondéré multi-facteurs)
- `computeLevel` (recalcul depuis missions + score moyen)
- `createReview`, `getTalentStats`, `createCertification`, `getProgressionPath`

### Enrichissement Industry OS
- Ajout `tier GuildTier` (APPRENTI → COMPAGNON → MAITRE → ASSOCIE)
- Ajout `advertis_vector Json?` (forces ADVE du créatif)
- Ajout `driverSpecialties Json?` (spécialités par canal)
- Ajout `guildOrganizationId` (appartenance organisation)
- Ajout métriques : `firstPassRate`, `collabMissions`, `peerReviews`
- Ajout QualityReview (QC distribué par tier)
- Ajout PortfolioItem (portfolio lié aux livrables validés)
- Ajout Membership (cotisation par tier)

---

## D.7 Modules additionnels existants

### Club (Upgraded Brands Club)
- `ClubMember` : userId, strategyId, tier (FREE/SILVER/GOLD/PLATINUM), status, points
- `ClubEvent` : events du club avec format (IN_PERSON/VIRTUAL/HYBRID), capacité, prix
- `ClubEventRegistration` : inscription + check-in + satisfaction
- `ClubActivity` : activités avec points

### Events (Upgrade Summit)
- `Event` : événements liés à stratégie/campagne, budget, attendees
- `EventAttendee` : inscription + check-in + satisfaction
- `EventLogistic` : logistique par catégorie

### Boutique (L'Académie — playbooks)
- `BoutiqueTemplate` : templates payants/gratuits avec prix, catégorie, downloads
- `TemplatePurchase` : achats trackés

### Courses (L'Académie — formations)
- `Course` : cours avec durée, prix, programme (JSON), prérequis, max participants
- `CourseEnrollment` : inscription + progression (0-100) + score final

### Editorial (Le Signal — The Upgrade)
- `EditorialArticle` : articles avec catégorie, tags, readTime, isPremium
- `EditorialNewsletter` : newsletters avec segmentation

### Source Insights / RADAR
- `InsightReport` : rapports (BAROMETRE/SECTORIEL/FLASH/CUSTOM) avec données structurées
- `InsightDataPoint` : points de données avec source, métriques, tendances
- `InsightAlert` : alertes par sévérité (INFO/WARNING/CRITICAL)
- `InsightSubscription` : abonnements par tier (FREE → SUR_MESURE)
- `InsightRequest` : demandes custom avec budget et deadline

### PR
- `PressRelease` : communiqués avec embargo, distribution, clippings
- `MediaContact` : contacts presse avec outlet, tier, relation
- `PressClipping` : retombées avec sentiment, reach estimé, ad equivalent value

### Social
- `SocialConnection` : connexions plateformes avec tokens OAuth
- `SocialPost` : posts publiés avec métriques (likes, comments, shares, reach)

### Media Buying
- `MediaPlatformConnection` : connexions GOOGLE_ADS, META_ADS, DV360, TIKTOK, LINKEDIN
- `MediaPerformanceSync` : sync quotidien des métriques de performance
