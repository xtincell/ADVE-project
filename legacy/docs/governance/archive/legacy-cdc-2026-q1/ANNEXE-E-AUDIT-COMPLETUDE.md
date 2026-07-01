# ANNEXE E — AUDIT DE COMPLÉTUDE

**Version** : 2.0
**Date** : 23 mars 2026
**Objet** : Vérification que toutes les capacités fonctionnelles de LaFusée sont prises en compte dans le Cahier de Charges Industry OS v2.1

---

## 1. MÉTHODOLOGIE

Ce document passe en revue chaque **capacité fonctionnelle** de la solution — ce que l'utilisateur peut faire, pas ce que le code contient — et vérifie si le cahier Industry OS :
1. La mentionne
2. Lui donne un placement clair dans les portals (Client, Creator, Fixer, Intake)
3. Définit son enrichissement ADVE
4. L'intègre dans une phase de build

**Verdict** : ✅ = pleinement couvert | ⚠️ = mentionné mais incomplètement traité | ❌ = absent ou oublié

---

## 2. FEATURES PLEINEMENT COUVERTES ✅

### 2.1 Construire et piloter une marque (L'Oracle)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Diagnostic de marque ADVE (8 piliers) | Remplir son profil de marque pilier par pilier, recevoir un score /200 | §1.3, §2.1, §4.1, §6.1 | ✅ |
| Quick Intake (15 min) | Scorer sa marque sans compte, en 15 min, via un lien partageable | §2.2.12, §4.1, §5.2 | ✅ |
| Boot Sequence (onboarding 60-90 min) | Être guidé par Mestor pour calibrer son profil complet | §4.2, §8 P4 | ✅ |
| Devotion Ladder | Voir la répartition de son audience (Spectateur → Évangéliste) et sa progression | §2.2.9, §5.3 | ✅ |
| Cult Index | Voir un score 0-100 de "force cultuelle" de sa marque | §6.8, §7 | ✅ |
| Diagnostics ARTEMIS | Lancer des frameworks analytiques pour comprendre un problème | §6.4, §7 | ✅ |
| Guidelines vivantes | Générer, consulter et exporter les guidelines de sa marque | §4.2, §5.3 | ✅ |
| Value Reports mensuels | Recevoir un rapport justifiant la valeur produite | §4.2, §8 P4 | ✅ |

### 2.2 Produire des livrables créatifs (La Fusée)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| GLORY Tools (39 outils) | Générer des livrables créatifs (copy, visuels, stratégie, identité) | §6.2, §7 | ✅ |
| Drivers (canaux de production) | Configurer des canaux (Instagram, packaging, event...) avec specs et briefs qualifiés | §2.2.2, §4.1 | ✅ |
| Missions (dispatch et collaboratif) | Créer des missions, les assigner, suivre les livrables | §7, §8 P2 | ✅ |
| QC distribué | Soumettre un livrable pour review, recevoir du feedback structuré par pilier | §2.2.4, §4.1 | ✅ |
| BrandVault | Stocker, tagger et retrouver tous les assets de marque | §7 | ✅ |
| Feedback Loop | Mesurer l'impact réel d'un livrable → recalibrer les scores | §4.1, §8 P1 | ✅ |

### 2.3 Gérer des campagnes (La Fusée — BOOST)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Campaign Manager 360 | Créer, planifier, exécuter des campagnes (12 états, ATL/BTL/TTL) | §6.3, §7 | ✅ |
| Actions terrain (Field Ops) | Gérer des activations terrain avec équipes et ambassadeurs | §6.3 (via Annexe C) | ✅ |
| Budget et variance | Suivre le budget par catégorie, anticiper le burn | §6.3, Annexe C §C.3.7 | ✅ |
| Reporting AARRR | Mesurer l'impact terrain + digital par étape funnel | Annexe C §C.3.18 | ✅ |
| Briefs générés par IA | Générer des briefs créatifs, média, production, vendor | Annexe C §C.3.10 | ✅ |

### 2.4 Intelligence et veille (Le Signal)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Signaux (Tarsis) | Détecter des signaux faibles/forts et les relier aux piliers | §6.7, §7 | ✅ |
| RADAR / Source Insights | Consulter des rapports d'intelligence marché (baromètre, sectoriel, flash) | §6.10, §7 | ✅ |
| Knowledge Graph | Capitaliser les patterns cross-clients (anonymisés) pour apprendre | §2.2.10, §4.2, §8 P5 | ✅ |

### 2.5 Communauté (L'Arène)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| La Guilde (créatifs) | S'inscrire comme freelance, voir ses missions, progresser en tier | §6.9, §7, §5.4 | ✅ |
| Guild Organizations | Rejoindre/créer une agence de prod collective | §2.2.3 | ✅ |
| Matching engine | Être matché automatiquement aux bons briefs | §4.1, §8 P2 | ✅ |
| Club (Upgraded Brands Club) | Rejoindre la communauté de marques, accumuler des points | §6.10, §7 | ✅ |
| Events (Upgrade Summit) | S'inscrire à des événements, check-in, satisfaction | §6.10, §7 | ✅ |

### 2.6 Formation (L'Académie)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Cours et formations | S'inscrire, suivre, compléter des formations | §6.10, §7 | ✅ |
| Boutique (templates/playbooks) | Acheter ou télécharger des templates | §6.10, §7 | ✅ |
| Section /learn du Creator Portal | Apprendre l'ADVE progressivement par tier | §5.4 | ✅ |

### 2.7 Finance (SOCLE)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Factures et devis | Créer, envoyer, suivre des factures/devis | §6.6, §7 | ✅ |
| Contrats | Gérer des contrats (NDA, prestation, cession) | §6.6 | ✅ |
| Escrow | Séquestrer des fonds avec conditions de libération | §6.6 | ✅ |
| Commissions | Calculer les commissions par mission/tier | §2.2.8, §4.2, §8 P4 | ✅ |
| Memberships (cotisation Guilde) | Gérer les cotisations mensuelles par tier | §2.2.8, §8 P4 | ✅ |
| Mobile Money | Payer/recevoir via Orange/MTN/Wave | §8 P4, §9.5 | ✅ |

### 2.8 IA et assistance (Transversal)

| Feature | Ce que l'utilisateur fait | Cahier | Verdict |
|---------|--------------------------|--------|---------|
| Mestor conversations | Poser des questions stratégiques à l'IA | §6.5, §5.6 | ✅ |
| Mestor insights proactifs | Recevoir des alertes et recommandations IA | §6.5, §5.6 | ✅ |
| Mestor scénarios (what-if) | Simuler des scénarios stratégiques | §6.5 | ✅ |
| Scoring IA (advertis-scorer) | Scorer n'importe quel objet /200 via IA | §4.1 | ✅ |

---

## 3. FEATURES INCOMPLÈTEMENT TRAITÉES ⚠️

### 3.1 Relations Presse

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Rédiger et diffuser des communiqués de presse | ✅ PressRelease, PressDistribution | §6.10 (une ligne) |
| Gérer une base de contacts presse (journalistes, outlets) | ✅ MediaContact (tier, relation, outlet) | §6.10 (une ligne) |
| Tracker les retombées presse (clippings, reach, ad equivalent value) | ✅ PressClipping | §6.10 (une ligne) |

**Ce qui manque** :
- **Pas de Driver PR**. Le cahier définit `DriverChannel.PR` dans l'enum (§2.3) mais ne décrit jamais comment un Driver PR traduit le profil ADVE en angles presse, messages clés, et talking points.
- **Pas de feedback loop PR**. Les clippings (PressClipping) mesurent le reach et le sentiment — c'est exactement la donnée que le feedback loop (§4.1) devrait consommer pour recalculer les piliers D (Distinction) et E (Engagement).
- **Pas de portal**. Un client en retainer RP ne sait pas où voir ses communiqués et clippings dans `/cockpit`. Le fixer ne sait pas où piloter le RP cross-clients dans `/console`.

**Recommandation** : intégrer le PR comme un **Driver de premier ordre**. Un Driver PR génère des angles presse qualifiés depuis le profil ADVE. Les clippings alimentent le feedback loop. Le client voit les retombées dans `/cockpit/operate`. Le fixer pilote dans `/console/fusee`. Phase 1 (avec les Drivers).

---

### 3.2 Publication sociale et collecte de métriques

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Connecter ses comptes sociaux (Instagram, Facebook, TikTok, LinkedIn, YouTube, Twitter) | ✅ SocialConnection (OAuth tokens) | §6.10 (une ligne) |
| Publier du contenu sur les réseaux | ✅ SocialPost | §6.10 (une ligne) |
| Voir les métriques de ses posts (likes, comments, shares, reach) | ✅ SocialPost.metrics | §6.10 (une ligne) |

**Ce qui manque** :
- **Pas de câblage Driver ↔ compte réel**. Le cahier crée des Drivers INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN — mais ne dit jamais que ces Drivers doivent être connectés aux SocialConnection correspondantes. Sans ça, un Driver INSTAGRAM génère des specs et des briefs... mais ne sait pas que le compte existe, ni quelles sont ses métriques réelles.
- **Pas de boucle retour**. Les métriques des SocialPost (engagement rate, reach, etc.) sont **la source de données #1** pour le feedback loop. Le cahier décrit le feedback loop (§4.1) comme "Signal entrant → recalcul score pilier" mais ne dit pas d'où viennent ces signaux en pratique. La réponse : des métriques sociales réelles.
- **Pas de portal**. Où le client voit-il les performances de ses posts ? Où le fixer gère-t-il les connexions ?

**Recommandation** : le Social est le **canal mesurable par excellence** — c'est là que le feedback loop prend vie. Connecter SocialConnection aux Drivers. Câbler SocialPost.metrics → Signal automatiquement. Afficher les performances dans `/cockpit/operate` et `/console/fusee`. Phase 1 (critique pour que le feedback loop fonctionne).

---

### 3.3 Achat média et performance publicitaire

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Connecter ses plateformes publicitaires (Google Ads, Meta Ads, DV360, TikTok Ads, LinkedIn Ads) | ✅ MediaPlatformConnection | §6.10 (une ligne) |
| Voir la performance quotidienne synchronisée | ✅ MediaPerformanceSync (impressions, clicks, spend, conversions) | §6.10 (une ligne) |
| Gérer les amplifications dans les campagnes | ✅ CampaignAmplification (11 types média) | Annexe C §C.3.4 |

**Ce qui manque** :
- **Pas de lien entre CampaignAmplification et les données réelles**. Les amplifications existent dans le Campaign Manager (Annexe C §C.3.4) avec CPM, CPC, conversions... mais ces chiffres sont saisis manuellement. Les MediaPerformanceSync ramènent les données réelles quotidiennement. Le cahier ne prévoit pas de les câbler.
- **Pas d'alimentation Knowledge Graph**. Les benchmarks CPM/CPC/CTR par secteur/marché/canal sont une mine d'or pour le Knowledge Graph — le cahier ne le prévoit pas.
- **Le media mix calculator existe** (`media-mix-calculator.ts`) mais n'est pas mentionné dans le cahier. Il devrait alimenter les Drivers et le recommandeur de campagnes.

**Recommandation** : câbler les MediaPerformanceSync aux CampaignAmplification (données réelles au lieu de saisie manuelle). Alimenter le Knowledge Graph avec les benchmarks média. Intégrer le media mix calculator au driver-engine. Phase 1-2.

---

### 3.4 Études de marché

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Lancer une étude de marché multi-sources | ✅ MarketStudy + 6 adaptateurs (Google Trends, Semrush, SerpAPI, SimilarWeb, SocialBlade, Crunchbase) | §7 "✅ Existe" |
| Recevoir une synthèse IA des données collectées | ✅ synthesis.ts | Non détaillé |

**Ce qui manque** :
- Mentionné en §7 comme existant mais **aucun enrichissement défini**. Pas de lien avec les Drivers (un Driver devrait pouvoir déclencher une étude ciblée). Pas de lien avec le Knowledge Graph (les études sont une source idéale de KnowledgeEntry type SECTOR_BENCHMARK). Pas de placement client — le Client Portal §5.3 a `/cockpit/insights/benchmarks` mais sans lien explicite avec les Market Study.

**Recommandation** : les études de marché sont l'input du pilier T (Track/Validation). Connecter Market Study → Knowledge Graph. Permettre aux Drivers de déclencher des études ciblées. Rendre les résultats visibles dans `/cockpit/insights`. Phase 1-2.

---

### 3.5 Ambassadeurs de marque

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Gérer un programme ambassadeurs à 5 tiers (Bronze → Diamond) | ✅ AmbassadorProgram (referrals, content, events, revenue, points) | §7 "✅ Existe" |

**Ce qui manque** :
- Le modèle AmbassadorProgram est listé en §7 mais jamais relié à la **Devotion Ladder** (§2.2.9). Or les ambassadeurs = niveau 5 de la Devotion Ladder (Ambassadeur) et les évangélistes = niveau 6. Les deux systèmes parlent de la même chose avec des modèles différents. Le cahier ne prévoit pas leur réconciliation.

**Recommandation** : le programme ambassadeurs est l'**implémentation opérationnelle** du haut de la Devotion Ladder. Connecter AmbassadorProgram aux DevotionSnapshot (les ambassadeurs actifs = segment "ambassadeur" de la ladder). Unifier les métriques. Phase 1 (avec DevotionSnapshot).

---

### 3.6 Présentations stratégiques et exports

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Générer une présentation HTML complète des 8 piliers | ✅ html-presentation/ (8 renderers spécialisés par pilier) | Non mentionné |
| Exporter en PDF | ✅ pdf-generator.ts | Mentionné pour guidelines + Value Reports |
| Exporter en Excel | ✅ excel-generator.ts | Non mentionné |

**Ce qui manque** :
- Le cahier mentionne l'export pour les guidelines (§4.2) et les Value Reports (§4.2) mais **oublie les présentations stratégiques**. Un livrable core de L'Oracle est la présentation IMPULSION™ — le pitch deck qui présente la stratégie de marque complète au client. 8 renderers HTML existent déjà pour ça. Le `guidelines-renderer` (§4.2) ne couvre qu'une partie du besoin.

**Recommandation** : le `guidelines-renderer` devrait être renommé ou étendu en **brand-document-renderer** couvrant : guidelines, présentations stratégiques, et Value Reports. Les 8 renderers HTML existants sont réutilisables. Phase 1.

---

## 4. FEATURES ABSENTES ❌

### 4.1 Messagerie inter-acteurs

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Envoyer un message au fixer, à un créatif, ou à un client | ✅ Conversation, Message | ❌ Absent |
| Recevoir des notifications | ✅ (via messagerie) | Mentionné vaguement |

**Pourquoi c'est un problème** :
Le cahier définit 3 portals et 7 populations (§1.6). Ces populations doivent communiquer :
- Le fixer donne des retours au créatif sur un livrable
- Le client pose une question sur son brief
- Le créatif signale un problème de specs

Mestor (§5.6) est l'IA. La messagerie est l'humain. Les deux doivent coexister. Le cahier ne place la messagerie dans aucun portal.

**Recommandation** : ajouter un composant de messagerie contextuelle dans chaque portal — contextualisé par Strategy/Mission/Campaign. Pas un système de chat généraliste — une messagerie liée aux objets métier. Phase 3 (avec les portals).

---

### 4.2 Pipeline commercial (CRM)

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Suivre les opportunités commerciales (prospects → clients) | ✅ Deal, FunnelMapping | ❌ Absent |
| Convertir un Quick Intake en deal | Pas encore câblé | ❌ Absent |

**Pourquoi c'est un problème** :
Le cahier crée le Quick Intake (§2.2.12) comme porte d'entrée du funnel. Mais **après le Quick Intake, que se passe-t-il ?** Le DG a scoré sa marque 94/200. Alexandre reçoit une notification. Et ensuite ?

Sans CRM : Alexandre doit se souvenir de rappeler le DG, noter dans un carnet, relancer manuellement.
Avec CRM : Quick Intake complété → Deal créé automatiquement en statut PROSPECT → pipeline visible → conversion trackée → revenue forecasting.

Le CRM est le **pont entre le marketing (Quick Intake) et le commerce (Boot Sequence → Brand Instance)**.

**Recommandation** : intégrer le CRM dans `/console/socle/pipeline` ou `/console/oracle/pipeline`. Câbler Quick Intake → Deal. Phase 0 (en même temps que le Quick Intake).

---

### 4.3 Traduction et adaptation linguistique

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Traduire des contenus stratégiques | ✅ TranslationDocument, translation-generator.ts | ❌ Absent |

**Pourquoi c'est un problème** :
Le cahier positionne LaFusée pour l'Afrique francophone — Cameroun, Côte d'Ivoire, Sénégal, Gabon... Même en français, les dialectes, expressions et références culturelles varient. Le ARTEMIS FW-15 (Cultural Expansion Protocol) produit des adaptations — mais le service de traduction qui les matérialise n'est pas dans le plan.

De plus, les Drivers multi-marchés (un Driver Instagram Cameroun vs Instagram Côte d'Ivoire) devraient pouvoir produire des briefs culturellement adaptés.

**Recommandation** : intégrer la traduction comme capacité des Drivers multi-marchés. Connecter TranslationDocument au FW-15. Phase 2.

---

### 4.4 Pricing de référence marché

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Consulter les tarifs marché par prestation/secteur | ✅ MarketPricing, market-pricing.ts | ❌ Absent |

**Pourquoi c'est un problème** :
Le matching-engine (§4.1) croise briefs et créatifs, avec scoring multi-facteurs incluant le tarif. Mais sans référentiel de pricing marché, comment savoir si un TJM de 150 000 XAF est compétitif pour un DA vidéo à Douala ? Le commission-engine (§4.2) a le même besoin.

**Recommandation** : alimenter le matching-engine et le commission-engine avec le MarketPricing comme référentiel. Phase 2 (avec le matching-engine).

---

### 4.5 Demandes d'intervention (support ponctuel)

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Soumettre une demande ponctuelle (hors mission/campagne) | ✅ InterventionRequest | ❌ Absent |

**Pourquoi c'est un problème** :
Pas tout est une mission ou une campagne. Un client peut avoir besoin d'un dépannage urgent, d'une relecture, d'un conseil ponctuel. Le portail client actuel a déjà `/requests` pour ça. Le cahier ne le place nulle part dans les nouveaux portals.

**Recommandation** : placer les interventions dans `/cockpit/operate/requests`. Permettre la conversion InterventionRequest → Mission si l'intervention grossit. Phase 3 (avec les portals).

---

### 4.6 Attribution et analyse de cohortes

| Ce que l'utilisateur fait | Existe dans le code | Dans le cahier |
|--------------------------|--------------------|-|
| Comprendre d'où viennent ses clients (attribution multi-touch) | ✅ AttributionEvent | ARTEMIS FW-10 mentionné mais router non placé |
| Analyser la rétention et LTV par cohorte | ✅ CohortSnapshot | ARTEMIS FW-10 mentionné mais router non placé |

**Pourquoi c'est un problème** :
"D'où viennent mes clients ?" et "Est-ce qu'ils restent ?" sont les deux questions que tout DG pose. Le framework ARTEMIS FW-10 (Attribution & Cohort Analysis) est listé en Annexe D mais les routers et les pages ne sont placés dans aucun portal.

**Recommandation** : placer dans `/cockpit/insights` (côté client) et `/console/signal` (côté fixer). Alimenter le Knowledge Graph avec les patterns d'attribution par secteur. Phase 2-3.

---

## 5. SYNTHÈSE DES RECOMMANDATIONS

### Intégrations critiques (le système est incomplet sans elles)

| Feature | Impact | Action | Phase |
|---------|--------|--------|-------|
| **Social → feedback loop** | Le feedback loop tourne à vide sans métriques sociales réelles | Câbler SocialPost.metrics → Signal → pillar recalculation | P1 |
| **CRM → Quick Intake** | Le funnel n'a pas de suivi commercial | Quick Intake complété → Deal créé | P0 |
| **Media Buying → Campaign Manager** | Les rapports campagne sont déclaratifs au lieu de réels | MediaPerformanceSync → CampaignAmplification | P1 |

### Intégrations importantes (valeur perçue dégradée sans elles)

| Feature | Impact | Action | Phase |
|---------|--------|--------|-------|
| **PR comme Driver** | Les clients RP n'ont pas de workflow | Driver PR + clippings → feedback loop | P1 |
| **Messagerie inter-acteurs** | Les populations ne peuvent pas communiquer | Messagerie contextuelle dans les 3 portals | P3 |
| **Market Study → Knowledge Graph** | Les données de marché ne capitalisent pas | Résultats → KnowledgeEntry | P1 |
| **Ambassadeurs → Devotion Ladder** | Deux systèmes parallèles pour le même concept | Réconcilier AmbassadorProgram et DevotionSnapshot | P1 |
| **Présentations stratégiques** | Livrable core de L'Oracle non couvert | Étendre guidelines-renderer | P1 |

### Intégrations souhaitables (complétude)

| Feature | Action | Phase |
|---------|--------|-------|
| Traduction → Drivers multi-marchés | Connecter TranslationDocument au FW-15 + Drivers | P2 |
| Pricing marché → matching + commissions | Alimenter matching-engine + commission-engine | P2 |
| Attribution + Cohortes → portals + Knowledge Graph | Placer dans portals, alimenter KG | P2-3 |
| Interventions → portals | Placer dans `/cockpit/operate/requests` | P3 |

---

## 6. CRITÈRES D'ACCEPTATION ADDITIONNELS

### Phase 0

- [ ] Un Quick Intake complété crée automatiquement un Deal dans le CRM avec statut PROSPECT
- [ ] Le fixer voit un pipeline de conversion Quick Intake → Deal → Brand Instance

### Phase 1

- [ ] Les SocialConnection sont liées aux Drivers correspondants (un Driver Instagram connaît le compte Instagram du client)
- [ ] Les métriques de SocialPost alimentent automatiquement le feedback loop via Signal
- [ ] Les MediaPerformanceSync remontent les données réelles dans les CampaignAmplification
- [ ] Les PressClipping génèrent des Signals qui alimentent le feedback loop
- [ ] Les résultats de Market Study produisent des KnowledgeEntry
- [ ] L'AmbassadorProgram est relié aux DevotionSnapshot (segments ambassadeur/évangéliste)
- [ ] Le guidelines-renderer peut aussi produire des présentations stratégiques (8 piliers)

### Phase 2

- [ ] Le matching-engine utilise le MarketPricing comme référence tarifaire
- [ ] Les Drivers multi-marchés peuvent déclencher des adaptations linguistiques

### Phase 3

- [ ] La messagerie est disponible dans les 3 portals, contextualisée par objet métier
- [ ] Le PR, le Social et le Media Buying sont accessibles dans la Fixer Console
- [ ] Les demandes d'intervention sont gérables dans le Client Portal
- [ ] L'attribution et les cohortes sont consultables dans le Client Portal

---

*Fin de l'Annexe E — Audit de Complétude*
