# UPgraders × La Fusée — Base de connaissance canonique (anti-confusion)

> **But.** Verrouiller l'identité et le vocabulaire d'UPgraders / La Fusée pour qu'aucun agent ne
> reproduise le drift commis le 2026-06-21 (`sales-response-tree`, PR #277) : avoir traité **« La
> Fusée »** comme « non-vendable » et mélangé **l'arbre de vente d'UPgraders** avec les **arbres
> internes de La Fusée**. Le blueprint conceptuel nomme lui-même cette faute : *« On a longtemps
> appelé "arbre" trois choses différentes, et cette confusion fut la source du drift le plus tenace
> du système »* (LA_FUSEE_BLUEPRINT §0.7). **À lire avant tout travail commercial / identité /
> funnel / nommage.**

---

## §0 — Provenance & couches de canon (l'ordre d'autorité)

Trois couches, empilées. Quand elles divergent, on applique la règle de préséance ci-dessous.

| Couche | Source | Autorité sur… | Statut |
|---|---|---|---|
| **Base** | Les **4 PDF** fournis (Écosystème Complet · Manifeste « Bâtir le Système d'Exploitation » · Analyse du Modèle Économique · Bio Alexandre Djengue/Xtincell) | l'**offre commerciale historique** + l'origine + le marché | Connaissance de base (oct. 2025). |
| **Canon opérationnel** | **Ce repo** (`ADVE-project`) : `STATE_FINAL_BLUEPRINT.md` (la bible, absorbe PANTHEON/MISSION/LEXICON/APOGEE), `CLAUDE.md`, ADR 0001-0104, `CODE-MAP.md` | l'**implémentation** : noms de code, modèles, Intents, Glory tools, ce qui tourne | **Prime pour le code.** |
| **Canon conceptuel** | Repo voisin **`la-fusee-blueprint`** : `LA_FUSEE_BLUEPRINT.md` (Le Livre de la Fusée, 9 Livres), `LIVRE_DE_BORD.md`, `CAHIER_DES_CHARGES.md` (spec opposable), `NAMING_CANON v3.3` | la **doctrine, la vision, le nommage-cible**, la mécanique commerciale (EFR, livrables, régime) | **Prime pour la doctrine & le nommage-cible.** |

**Règles de préséance :**
1. Pour **écrire/lire du code** → le **canon opérationnel** (ce repo) fait foi. Les noms de code actuels sont `Mestor/Artemis/Tarsis/Hunter/Yggdrasil/Jehuty/Argos` (cf. §3).
2. Pour la **doctrine, le récit, le nommage-cible** → le **canon conceptuel** (blueprint) fait foi. Le nommage égyptien-pur v3.3 (`Sia/Neith/Shaï/Wepwawet/Sève/Notoria/Per-Ankh`) est **scellé mais pas encore migré dans le code**.
3. Les **PDF** donnent l'offre et l'origine ; quand le repo les contredit (ex. pricing FCFA, plans Cockpit), **le repo gagne**.
4. Le blueprint conceptuel le dit lui-même : *« Le canon opérationnel de l'OS reste `STATE_FINAL_BLUEPRINT.md` (dans le repo ADVE-project). Ce repo-ci archive la représentation conceptuelle. »*

---

## §1 — LA RÈGLE D'OR (jamais l'enfreindre)

| Entité | Nature | Rôle | Jamais… |
|---|---|---|---|
| **UPgraders** | La **société / agence** — *« l'Agence Spatiale Industrielle »* | **VEND / OPÈRE** | …confondue avec son produit. C'est le **vendeur** et l'opérateur. |
| **La Fusée** | Le **produit / l'Industry OS** d'UPgraders | **EST VENDU** (face client) **+ propulse** (moteur) | …dite « non-vendable » : sa face client (**Cockpit/Oracle/PDF/score**) **se vend**. Seul son **moteur** (OS, Neteru, Sève) est invisible. |
| **Argos** | **Sous-marque éditoriale visible** (façade publique de Per-Ankh) | Rayonne / observe | …prise pour une société ou pour l'OS. C'est la vitrine + l'oracle économique public. |
| **NEFER** | L'**opérateur** (humain senior ou agent IA) | Sert les Neteru | …compté comme un Neter. Hors `BRAINS`. |

**Les deux interdits qui résument l'erreur de NEFER :**

1. ❌ *« On ne vend pas La Fusée. »* → **FAUX.** On vend **ce que La Fusée donne/produit** : abonnement **Cockpit**, **Oracle**, **PDF d'intake**, **score**. On **n'expose pas** l'OS/les Neteru en jargon au client. *Vendre La Fusée = vendre l'accès et la valeur, pas décrire la plomberie.*
2. ❌ *Confondre l'arbre de vente avec les arbres internes.* → voir **§12**. L'**arbre de vente d'UPgraders** (`sales-response-tree`) appartient au **Plan commercial** (« vendre ») ; les **arbres internes** (ADVE-RTIS, Brand Tree/Ished, Sève, funnel, arbre de décision EFR) appartiennent aux autres plans (« penser / faire / savoir » + substrat).

> **Mnémonique :** *UPgraders est l'Agence Spatiale ; La Fusée est le véhicule produit en série (la charge utile vendue = Cockpit/Oracle) ; l'arbre de vente place les véhicules, les arbres internes les construisent et les font voler.*

---

## §2 — Identité commerciale (canon conceptuel §0.3)

**UPgraders > La Fusée > Argos** (société > produit-phare > sous-marque).

- **UPgraders = l'Agence Spatiale Industrielle.** Pas l'éditeur d'un SaaS parmi d'autres. Une marque qui entre ne « reçoit pas un outil » — elle **devient une mission propulsée** (équipage, trajectoire, contrôle au sol, apogée visé). À l'échelle, UPgraders ne produit pas un client : il produit un **marché** (le constellateur de l'industrie créative africaine francophone).
- **La Fusée = le produit, l'Industry OS** — le véhicule reproductible. *« La Fusée d'UPgraders. »* Jamais « LaFusee OS » ni « plateforme ».
- **Argos = sous-marque éditoriale visible** — vitrine de la flotte + oracle économique public. Seul nom **grec** du système (exception assumée, valeur commerciale conservée) ; côté code/doctrine c'est la **façade publique de Per-Ankh** (sous-domaine de Seshat).
- **NEFER = l'opérateur** qui sert les Neteru (« parfait, accompli, irréprochable »). Pas un Neter.

Doctrine terminologique : **« Client » = le payeur ; « client final » = le consommateur cible de la marque du client.**

---

## §3 — Réconciliation de nommage (conceptuel ↔ opérationnel) — CRITIQUE

Le blueprint a **scellé** un nommage égyptien-pur (`NAMING_CANON v3.3`) que **le code n'a pas encore adopté**. Pour ne jamais se tromper : **dans le code, utilise la colonne opérationnelle ; dans la doctrine/le blueprint, reconnais la colonne conceptuelle.**

| Conceptuel (blueprint v3.3, doctrine) | Opérationnel (ce repo, code aujourd'hui) | Fonction |
|---|---|---|
| **Sia** | **Mestor** | Guidance — dispatcher d'Intent unique |
| **Neith** | **Artemis** | Propulsion phase brief (Glory tools) |
| **Ptah** | Ptah | Propulsion phase forge (matérialisation) |
| **Seshat** | Seshat | Telemetry — observe/mesure/archive |
| **Thot** | Thot | Sustainment + Operations (carburant + escrow/mobile money/CRM) |
| **Imhotep** | Imhotep | Crew Programs (talents/agences/Académie) |
| **Anubis** | Anubis | Comms (ad networks, email/SMS, MCP) |
| **Wepwawet** | **Hunter** | Sub-agent récolte de références (Argos) |
| **Shaï** | **Tarsis** | Signaux faibles / capture culturelle |
| **Per-Ankh** | sous-domaine **Seshat (ex-Argos)** | Veille / référentiel éditorial |
| **Argos** (façade publique) | **Argos** (projection publique) | Sous-marque éditoriale visible — **même nom** |
| **l'Arbre (Ished) + la Sève** | **Yggdrasil** (substrat) | Image-monde + substrat de circulation (cf. §12) |
| **Notoria** (2 étages) | **Jehuty** (+ fonctions repliées) | Catalogue des amendements scorés |
| palier **LATENT** | **LATENT** (repo a purgé Zombie→Latent) | Palier d'orbite le plus bas |

**Invariants communs aux deux couches :** `BRAINS = exactement 7 Neteru` (cap APOGEE **7/7**) ; INFRASTRUCTURE (Console/Admin) **n'est pas un Neter** ; la **Sève / Yggdrasil** est un **substrat ungouverné** (pas un Neter, pas dans BRAINS).

---

## §4 — Le fondateur & l'origine (PDF Bio)

- **Alexandre Djengue**, alias **« Xtincell »** (ex-« Brazier »), Camerounais, **Douala**. CEO d'UPgraders, concepteur de la méthode **ADVE/ADVERTIS**. Devise : *« De la poussière à l'étoile. »*
- Polymathe : ingénierie (Licence Pro télécoms/réseaux, certif. sécurité Cisco) **×** créatif (Brand Identity, design, photo), « autodidacte guidé par mentorat ».
- **Xtincell** : *« nous ne sommes qu'étincelle dans le brasier qu'est l'univers »* (claque d'humilité). Blog **« Geek de brousse »** = son leadership d'opinion (le « Messie » de la marque).
- **Origin myth** : agence de marketing digital → **pivot** vers la « conciergerie créative » / l'écosystème intégré → aujourd'hui **Agence Spatiale Industrielle**. *Le modèle devient la marque* (le nom « Upgrade » est générique ; le modèle unique distingue).
- Homonymes sans lien : `upgraderz.com`, `upgrademg.com` (MMA), `upgrade.paris`, etc.

---

## §5 — Le problème de marché (« le pourquoi »)

**Double déficit :** confiance (entreprises ↔ talents locaux) **+** compétences structurantes (talents : gestion de projet, relation client, légal/financier). Aggravé par l'informalité des ICC, la fragmentation, et les **frictions de paiement** (pas de Stripe/PayPal grand public ; commissions globales prohibitives).

**Marché-monde :** **Afrique francophone** (UEMOA + CEMAC + diaspora). **FCFA** primaire (XOF/XAF, parité fixe 655,957/€). **Mobile money** primaire (Wave, Orange Money, MTN MoMo, Moov). Cadres : **OHADA** (affaires, signature électronique), **OAPI** (PI, 17 États), **BCEAO/UEMOA** (agréments paiement). **Escrow** = séquestre jusqu'à validation.

**Doctrine de capture — `capture-then-grow` :** on ne vise **pas** frontalement les corporates riches (qui restent 3-5 ans chez Deloitte/BCG/McKinsey) ; on capture les **forts potentiels à faible pouvoir d'achat** (l'étoffe d'icônes, pas encore les moyens) et on grandit avec eux. *Crossing the Chasm* appliqué. *« La Fusée capture l'ambition, pas la fortune. »*

---

## §6 — Les 5 Plans ontologiques de la Mission (clé anti-confusion — blueprint §0.10)

La taxonomie qui **sauve l'OS de la confusion sémantique la plus dangereuse** : ne jamais mélanger un brief, un asset, une campagne, une mission et un rapport. **Cinq verbes, cinq natures, cinq producteurs.**

| Plan | Verbe | Quoi | Producteur (concept / code) |
|---|---|---|---|
| **Intellectuel** | *penser* | le **brief** (concept, story, manifeste, positionnement) | Neith **conçoit** / Artemis |
| **Matériel** | *montrer* | l'**asset** (image, vidéo, audio, design) | Ptah **forge** |
| **Opérationnel** | *faire* | la **campagne + action** (déploiement réel) | Sia orchestre · Anubis adresse / Mestor + Anubis |
| **Commercial** | ***vendre*** | la **mission + le livrable** (cargaison payante au client) | Imhotep crew · Thot facture · qc-router juge |
| **Analytique** | *savoir* | le **rapport + l'Oracle** (synthèse, insight, reco) | Seshat observe · sequences DERIVED assemblent |

> **Conséquence directe pour la confusion #277 :** l'**arbre de vente** opère dans le **Plan commercial (« vendre »)**. L'**Oracle** est un livrable du **Plan analytique (« savoir »)** — mais il **se vend** (c'est une cargaison payante). Les **campagnes** sont le **Plan opérationnel (« faire »)**. On ne confond pas *vendre une mission* avec *faire une campagne* avec *savoir via un Oracle*.

---

## §7 — Le modèle économique : Flywheel + 5 piliers (PDF + canon)

Hybride **Conseil × Marketplace × SaaS**, **flywheel auto-renforçant** : Impulsion attire des clients → projets de qualité → alimentent La Guilde → attirent les talents → renforcent la crédibilité → (re)nourrissent Impulsion. Source Insights crédibilise (donnée propriétaire) ; Sérénité rend l'écosystème *collant*. **L'actif défendable = la flotte (N marques dans un substrat unifié) + la trace (hash-chain + score).**

| Pilier (PDF, ™) | Fonction | Ancrage repo / Neter |
|---|---|---|
| **Impulsion™** | Conseil stratégique (Audit Express, Workshop, Retainer/CMO délégué) — porte d'entrée premium | Oracle + funnel intake→Oracle ; **Artemis/Neith** (briefs) |
| **Pilotis™** | Gestion de projets déléguée (chef de projet, COO créatif, QA) | Mission/Deal + `/console/operations` ; **Mestor/Sia** orchestre, **Imhotep** crew |
| **Source Insights™** | Veille / intelligence de marché (baromètres, rapports, abonnement, sur-mesure) | **Seshat** + **Tarsis/Shaï** + **Argos/Per-Ankh** |
| **La Guilde™** | Marketplace de talents curatés (**CORE** freelances / **EXTENDED** agences / **RÉSEAU** spécialisés) | portail public `/LaGuilde` (**Imhotep**) |
| **Sérénité™** | Conciergerie admin & financière (portage/EoR, facturation, **escrow**, contrats, paiements) | **Thot** (Operations) + mobile money + Credentials Vault |

**+ La plateforme SaaS/Marketplace** qui orchestre les 5 piliers = **La Fusée** (l'Industry OS ; dans les PDF : « plateforme mobile-first » / « ADVE Studio »).

---

## §8 — La Fusée : ce qui **se vend** vs ce qui est **invisible** + portails + pricing

**5 portails** (blueprint §0.11) :

| Portail | Pont | Acteur | Vendu ? |
|---|---|---|---|
| **Cockpit** | pont du founder | propriétaire de marque (pilote SA mission) | **OUI — abonnement** (c'est *la* vente de La Fusée côté produit) |
| **Console** | Mission Control | opérateurs UPgraders / agences filles | **Jamais vendu** (interne) |
| **Crew Quarters** (Creator + Agency) | quartiers passagers | talents freelance + agences | accès embarquement |
| **Launchpad** (Intake) | tour de lancement | visiteur public en qualification | **gratuit** (porte du funnel) |
| **Argos** | vitrine + observatoire | public éditorial + oracle économique | sous-marque visible |

**Ce qui se vend (face client) :** abonnement **Cockpit**, **Oracle** (diagnostic dynamique 35 sections), **PDF d'intake**, score, livrables (BrandAsset.kind). **Ce qui est invisible :** l'OS, les **7 Neteru**, la **Sève/Yggdrasil**, les Glory tools, NSP, IntentEmission.

**Pricing canon (blueprint §1.3/§2, doctrine capture-then-grow) :**
- **Intake = gratuit** (la reconnaissance ne se paie pas).
- **PDF Oracle = 5-25k FCFA** (« le prix d'un bon repas »).
- **Embarquement (1ᵉʳ abonnement Cockpit) = 15-25k FCFA/mois** en zone Dakar-Abidjan.
- Le **paywall de conversion = un rituel d'ignition** (le 1ᵉʳ `OPERATOR_AMEND` : le founder déclare prendre sa marque au sérieux), pas une transaction Netflix.
- Prix **localisé par zone** (Thot formula engine + Seshat zone-indices) — Dakar ≠ Libreville. **Jamais** de grille FCFA statique ; **jamais** imposer USD/Stripe (sauf international). Un commercial **n'annonce pas de prix ferme hors mandat** → `/pricing` ou escalade.

---

## §9 — EFR / obligation d'effet (le repositionnement commercial — Cahier des Charges Ch.1)

La rupture commerciale n°1 — *l'agence à obligation d'effet* :

- **EFR = État Final Recherché** : *« On ne vend pas des moyens, on vend un état final mesuré »* = palier visé **+** score cible **+** horizon. Gelés et hash-chaînés à la signature.
- **Obligation d'effet tracé** (composite) : **résultat ferme** sur ce que l'Agence contrôle ; **effort intégralement prouvé** (hash-chain) sur ce qu'elle co-détermine. L'effort cesse d'être une allégation → grandeur **auditée**.
- **Score cible S\*** par défaut = seuil d'entrée du palier visé : **FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180** (sur 200).
- **ICP (Indice de Co-Pilotage)** : mesure la co-responsabilité (l'effet dépend aussi du founder/du marché).
- **Constat d'échec calculé, pas négocié** (score + hash-chain) ; **4 recours** (remédiation / renégociation du cap / geste / sortie). **Loi 1** : l'altitude acquise reste acquise — un échec interrompt une trajectoire, il ne rembobine pas la marque.
- Le moat : **la flotte + la trace** (pas les Glory tools). 7 ruptures : *agence à obligation d'effet · marque comme actif auditable · miroir sectoriel vivant · communauté possédée · curseur de délégation · marketing-patrimoine · Coalition Stellaire.*

---

## §10 — Méthode ADVE/RTIS, APOGEE, paliers, score

- **ADVE (PDF) = Architecture Divine des Expériences** : **A**uthenticité · **D**istinction · **V**aleur · **E**ngagement, /50 chacun → **score /200**.
- **Repo = cascade ADVE-RTIS à 8 piliers A→D→V→E→R→T→I→S** (R=Risk, T=Track, I=Innovation, S=Strategy). **3 stages rocket** : Booster (A+D+V+E), Mid (R+T), Upper (I+S). **ADVE = noyau mutable** (`OPERATOR_AMEND_PILLAR` seul) ; **RTIS = couronne dérivée** (non éditable).
- **APOGEE** = framework de pilotage de trajectoire (8 sous-systèmes, 3 Lois + Loi 4). Pas un dieu, pas une maison — le **point culminant d'orbite**.
- **6 paliers d'orbite culturelle** : LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → **ICONE**.
- **9 archétypes (BrandNature / familles de poussière)** : PRODUCT · SERVICE · CHARACTER_IP · FESTIVAL_IP · MEDIA_IP · RETAIL_SPACE · PLATFORM · INSTITUTION · PERSONAL. Même framework, sous-systèmes adaptés à l'archétype.
- **Satellisation organique** : chaque marque-cliente = un **satellite isomorphe** (son propre noyau ADVE, sa couronne RTIS, sa Sève-satellite, ses 7 Neteru tenant-scopés). **Connexion (Sève-mère), pas fusion.** Aucune valeur métier ne fuit entre satellites (isolation tenant default-deny).

---

## §11 — La Doctrine du Mouvement Cosmique (blueprint §0.13)

1. **UPgraders = Agence Spatiale Industrielle** — industrialise la production de **marchés** (flotte de N satellites en orbites diverses ; véhicule en série, mission unique, façon SpaceX).
2. **Superfans = Équipage de Propagation** — pas une audience achetée, des **équipiers** qui propagent la mythologie par conviction. **Devotion Ladder = hiérarchie d'équipage (6 paliers)** : **Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste** (commandant de mission satellite, propage en autonomie). Le founder = **premier équipier enrôlé** (pas premier client).
3. **Coalition Stellaire** — plusieurs marques ICONE **coordonnées dans la même direction** rendent le basculement de l'**Overton** sectoriel **irréversible** (Apple+Sony+B&O… ; Patagonia+North Face+REI…). Convergence structurelle, pas cartel. Le **client ultime de La Fusée = l'industrie créative africaine francophone** elle-même. UPgraders **organise** ces coalitions (Argos cartographie · signal pool via Sève-mère · véhicule commun).

> **Superfans & Overton ne sont pas des KPIs** — ce sont les **mécaniques pivots** (masse d'équipage + axe culturel). Anubis a un KPI proxy : le **coût par superfan recruté**.

---

## §12 — LES « ARBRES » : désambiguïsation complète (le cœur de l'erreur)

Le mot « arbre » désigne **sept** choses distinctes à travers les deux couches de canon. **Ne jamais les confondre.** (Le blueprint §0.7 désigne lui-même cette confusion comme « le drift le plus tenace ».)

| # | « Arbre » | Couche | Appartient à | Sert à | C'est… |
|---|---|---|---|---|---|
| 1 | **Arbre de VENTE d'UPgraders** | opérationnel | UPgraders (l'agence) — **Plan commercial** | qualifier → vendre → capturer le lead → escalader | `sales-response-tree` (PR #277). **Vend La Fusée (Cockpit/Oracle) ET le reste de l'offre.** Instrument commercial. |
| 2 | **Cascade ADVE-RTIS** | les deux | La Fusée (méthode) — **Plan intellectuel** | construire la marque d'un client (A→S) | la méthode propulsive. Mutée via `OPERATOR_AMEND_PILLAR`. **Pas un script de vente.** |
| 3 | **Brand Tree** | les deux | La Fusée (produit) — un **satellite** | structurer le portfolio d'un client (`archétype → VENTURE_DIVISION → PROJECT → DELIVERABLE → INSTANCE`) | l'arbre-miniature **isomorphe** de la marque-cliente. C'est l'**Ished au niveau satellite**. |
| 4 | **L'Arbre (Ished)** | conceptuel | La Fusée **entière** (image-monde) | métaphore ombrelle de l'organisme | l'arbre sacré des annales (Héliopolis). Tronc+branches = **l'architecture** (APOGEE + 7 Neteru, qui *décide*). Ex-Yggdrasil. |
| 5 | **La Sève** | les deux | substrat **ungouverné** | faire **circuler** la valeur (ne décide rien) | 7 racines (Intent bus, hash-chain, NSP, pillar cascade, RAG, tenant isolation, layering). = **Yggdrasil** côté code. **Pas un arbre décisionnel, pas un Neter.** |
| 6 | **Funnel AARRR** | opérationnel | La Fusée (OS) + UPgraders (acquisition) | mesurer Acquisition/Activation/Rétention/Revenue/Référral | `CampaignAARRMetric` / `aarrStage`. L'arbre de vente **vise** un AARRR ; il n'**est** pas le funnel. |
| 7 | **Arbre de décision d'échec EFR** | conceptuel | UPgraders (contrat) | trancher le recours quand l'EFR n'est pas atteint | Cahier des Charges §1.7 (Artefact C). Un arbre **contractuel**, pas un script de vente ni une méthode. |

**Conséquence pour `sales-response-tree` :** c'est **l'arbre #1** (Plan commercial). Il **vend La Fusée explicitement** (Cockpit/Oracle = produits, pas tabous) **et** les autres piliers ; il ne se présente **jamais** comme #2/#3/#4 (construction de marque) ni comme un livrable produit ; il garde l'OS/les Neteru/la Sève **hors** du discours client.

---

## §13 — Lexique anti-drift (paires à ne jamais confondre)

- **UPgraders** (vendeur/agence/Agence Spatiale) ≠ **La Fusée** (produit/OS) ≠ **Argos** (sous-marque éditoriale).
- **« Vendre La Fusée »** = vendre **Cockpit/Oracle/accès** (OK) ≠ **« exposer l'OS / les Neteru / la Sève »** au client (interdit).
- Les **7 arbres** de §12 — chacun distinct.
- **Cockpit** (portail client, vendu) ≠ **Console** (portail interne, jamais vendu).
- **Client** (payeur) ≠ **client final** (cible de la marque du client).
- **Oracle** = livrable du **Plan analytique** (savoir), **vendable** ≠ « le moteur » (= l'OS).
- **Plan opérationnel** (faire / campagnes) ≠ **Plan commercial** (vendre / missions) ≠ **Plan analytique** (savoir / Oracle).
- **Noms de code** (Mestor/Artemis/Tarsis/Hunter/Yggdrasil/Jehuty) ≠ **noms de doctrine** (Sia/Neith/Shaï/Wepwawet/Sève/Notoria) — cf. §3. **Dans le code : opérationnel. Dans la doctrine : conceptuel.**
- **Sève / Yggdrasil** = substrat **ungouverné** (circule) ≠ **Sia/Mestor** (décide). Substrat ≠ governor.
- **EFR** (état final vendu) ≠ moyens (ce qu'on ne vend plus).
- **Superfans / Overton** = mécaniques pivots ≠ KPIs.
- **Impulsion/Pilotis/Source Insights/La Guilde/Sérénité** (noms **commerciaux** ™ des piliers) ≠ leurs implémentations (Oracle/Artemis, Mission/Imhotep, Seshat, `/LaGuilde`, Thot).

---

## §14 — 100 Questions / Réponses

### A. Identité & frontières (1–12)

1. **UPgraders, c'est quoi ?** — La société/agence — *« l'Agence Spatiale Industrielle »* — qui **vend et opère** La Fusée. Fondée par Alexandre Djengue (Douala).
2. **La Fusée, c'est quoi ?** — Le **produit / l'Industry OS** d'UPgraders (le véhicule reproductible). Incarne ADVE/RTIS.
3. **Argos, c'est quoi ?** — La **sous-marque éditoriale visible** (vitrine + oracle économique public) ; façade publique de Per-Ankh (sous-domaine Seshat). Seul nom grec.
4. **NEFER ?** — L'**opérateur** (humain senior ou agent IA) qui sert les Neteru. **Pas un Neter.**
5. **La hiérarchie d'identité ?** — UPgraders > La Fusée > Argos.
6. **La Fusée se vend-elle ?** — **Oui**, sa face client (Cockpit/Oracle/PDF/score). Seul son moteur (OS/Neteru/Sève) est invisible. Ne jamais dire « on ne vend pas La Fusée ».
7. **Que vend le commercial quand il vend La Fusée ?** — Un **abonnement Cockpit**, un **Oracle**, un **PDF**, l'accès au score — la valeur et l'accès, pas la plomberie.
8. **Le commercial cite-t-il les Neteru/l'OS au client ?** — **Non.** Jargon interne. Au client : valeur, livrables, résultats.
9. **UPgraders ne vend-il que La Fusée ?** — **Non** : La Fusée **ET** conseil (Impulsion), projet (Pilotis), talents (La Guilde), admin/paiements (Sérénité), veille (Source Insights), certif, events.
10. **« Industry OS » ou « plateforme » ?** — **Industry OS** (codé comme tel). Jamais « plateforme » ni « LaFusee OS ».
11. **Cockpit vs Console ?** — **Cockpit** = portail client (vendu). **Console** = Mission Control interne (jamais vendu).
12. **Le positionnement ?** — **Premium curated** (≠ Fiverr/Upwork) ; *consulting-led marketplace*.

### B. Couches de canon & nommage (13–22)

13. **Quelles sont les 3 couches de canon ?** — PDF (base/offre), repo `ADVE-project` (**opérationnel**, prime pour le code), repo `la-fusee-blueprint` (**conceptuel**, prime pour la doctrine/le nommage).
14. **Si le PDF et le repo divergent ?** — **Le repo gagne** (ex. pricing FCFA, plans Cockpit).
15. **Pour écrire du code, quel nommage ?** — L'**opérationnel** : Mestor, Artemis, Tarsis, Hunter, Yggdrasil, Jehuty, Argos.
16. **Pour la doctrine, quel nommage ?** — Le **conceptuel v3.3** : Sia, Neith, Shaï, Wepwawet, Sève/Ished, Notoria, Per-Ankh.
17. **Sia = ?** — **Mestor** (Guidance, dispatcher d'Intent unique).
18. **Neith = ?** — **Artemis** (Propulsion phase brief).
19. **Shaï / Wepwawet = ?** — **Tarsis** (signaux faibles) / **Hunter** (récolte de références Argos).
20. **Yggdrasil = ?** — Dans la doctrine : dissous en **l'Arbre (Ished)** + **la Sève**. Dans le code : **Yggdrasil** (substrat ungouverné).
21. **Notoria = ?** — **Jehuty** (catalogue des amendements scorés ; deux étages côté doctrine).
22. **Le nommage v3.3 est-il dans le code ?** — **Non** — scellé en doctrine, **pas encore migré**. Ne pas utiliser « Sia » dans le code.

### C. Le fondateur (23–28)

23. **Qui a fondé UPgraders ?** — **Alexandre Djengue**, alias **« Xtincell »**, Douala.
24. **Origine de « Xtincell » ?** — *« Nous ne sommes qu'étincelle dans le brasier qu'est l'univers »* (ex-« Brazier »).
25. **Son profil ?** — Polymathe : ingénierie (télécoms/Cisco) × création (Brand Identity, design, photo).
26. **Son média d'influence ?** — Le blog **« Geek de brousse »**.
27. **L'origin myth ?** — Agence digitale → pivot « conciergerie créative » → Agence Spatiale Industrielle. *Le modèle devient la marque.*
28. **La devise ?** — *« De la poussière à l'étoile. »*

### D. Marché & doctrine de capture (29–35)

29. **Le double déficit ?** — Confiance (entreprises) + compétences structurantes (talents).
30. **La vraie opportunité ?** — **Fabriquer la confiance** (sélection + formation + pilotage + cadre sécurisé), pas seulement connecter offre & demande.
31. **Le marché-monde ?** — Afrique francophone (UEMOA + CEMAC + diaspora), mobile-first.
32. **La devise ? Le paiement ?** — **FCFA** ; **mobile money** (Wave/Orange/MTN/Moov). Jamais USD/Stripe imposé.
33. **`capture-then-grow` ?** — Capturer les **forts potentiels à faible pouvoir d'achat** (pas les corporates riches, qui restent chez Deloitte/BCG/McKinsey), grandir avec eux. *Crossing the Chasm.*
34. **Quels cadres légaux ?** — OHADA (affaires/signature), OAPI (PI), BCEAO/UEMOA (paiement).
35. **L'escrow ?** — Séquestre : fonds gelés jusqu'à validation du livrable (Sérénité / Thot Operations).

### E. Les 5 Plans ontologiques (36–43)

36. **Quels sont les 5 plans ?** — Intellectuel (penser), Matériel (montrer), Opérationnel (faire), **Commercial (vendre)**, Analytique (savoir).
37. **Plan intellectuel ?** — Le **brief** ; producteur **Neith/Artemis** (conçoit).
38. **Plan matériel ?** — L'**asset** ; producteur **Ptah** (forge).
39. **Plan opérationnel ?** — La **campagne + action** ; Sia/Mestor orchestre, Anubis adresse.
40. **Plan commercial ?** — La **mission + le livrable** (cargaison payante) ; Imhotep crew, Thot facture, qc-router juge.
41. **Plan analytique ?** — Le **rapport + l'Oracle** ; Seshat observe, sequences DERIVED assemblent.
42. **Où vit l'arbre de vente ?** — Dans le **Plan commercial** (vendre).
43. **L'Oracle est dans quel plan ? Se vend-il ?** — Plan **analytique** (savoir) ; **oui, il se vend** (cargaison payante).

### F. Modèle économique & 5 piliers (44–54)

44. **La nature du modèle ?** — Hybride **Conseil × Marketplace × SaaS**, flywheel auto-renforçant.
45. **L'actif défendable (le moat) ?** — **La flotte + la trace** (N marques dans un substrat unifié + hash-chain/score). Pas les Glory tools.
46. **Les 5 piliers ?** — **Impulsion** (conseil), **Pilotis** (projet), **Source Insights** (veille), **La Guilde** (talents), **Sérénité** (admin/finance).
47. **Impulsion ?** — Conseil premium (Audit/Workshop/Retainer/CMO délégué) ; porte d'entrée.
48. **Pilotis ?** — Gestion de projet déléguée (chef de projet, COO créatif, QA).
49. **Source Insights ?** — Veille/intelligence de marché (baromètres, rapports, abonnement, sur-mesure).
50. **La Guilde — 3 catégories ?** — **CORE** (freelances, portage), **EXTENDED** (agences, B2B forfait), **RÉSEAU** (spécialisés, referral).
51. **Sérénité ?** — Admin/finance : portage/EoR, facturation, **escrow**, contrats, mobile money.
52. **Où vivent les piliers dans le repo ?** — Impulsion→Oracle/Artemis ; Pilotis→Mission/Imhotep/`/console/operations` ; Source Insights→Seshat/Tarsis/Argos ; La Guilde→`/LaGuilde` (Imhotep) ; Sérénité→Thot (Operations).
53. **Le flywheel en une phrase ?** — Impulsion attire → projets → La Guilde → talents → crédibilité → Impulsion ; Source Insights crédibilise ; Sérénité rend *collant*.
54. **La Fusée est-elle un pilier ?** — **Non** — c'est la **plateforme/OS** qui **orchestre** les 5 piliers.

### G. La Fusée, portails, pricing (55–66)

55. **Combien de portails ?** — **5** : Cockpit, Console, Crew Quarters (Creator+Agency), Launchpad (Intake), Argos.
56. **Lequel se vend ?** — Le **Cockpit** (abonnement).
57. **Lequel n'est jamais vendu ?** — La **Console** (Mission Control interne).
58. **Le Launchpad/Intake ?** — **Gratuit** — la porte du funnel (la reconnaissance ne se paie pas).
59. **Prix du PDF Oracle ?** — **5-25k FCFA** (« le prix d'un bon repas »).
60. **Prix du 1ᵉʳ abonnement Cockpit (Embarquement) ?** — **15-25k FCFA/mois** (zone Dakar-Abidjan).
61. **Le paywall, c'est quoi doctrinalement ?** — Un **rituel d'ignition** (1ᵉʳ `OPERATOR_AMEND`), pas une transaction Netflix.
62. **Le prix est-il une grille fixe ?** — **Non** — localisé par zone (Thot formula engine + Seshat zone-indices). Dakar ≠ Libreville.
63. **Le commercial annonce-t-il un prix ferme ?** — **Non hors mandat** → `/pricing` ou escalade.
64. **Ce qui se vend (face client) ?** — Cockpit, Oracle, PDF, score, livrables.
65. **Ce qui reste invisible ?** — L'OS, les 7 Neteru, la Sève/Yggdrasil, les Glory tools, NSP.
66. **Le Cockpit, c'est un dashboard ?** — **Non** — un **pont de pilotage** (altimètre = score /200, tier label, instruments = Glory tools, vault, Notoria).

### H. EFR / obligation d'effet (67–73)

67. **EFR = ?** — **État Final Recherché** : *on ne vend pas des moyens, on vend un état final mesuré* (palier visé + score cible + horizon).
68. **C'est quelle innovation ?** — La n°1 : **l'agence à obligation d'effet**.
69. **Obligation de résultat ou de moyens ?** — **Obligation d'effet tracé** (composite) : résultat ferme sur ce que l'Agence contrôle, effort **prouvé** (hash-chain) sur ce qu'elle co-détermine.
70. **Score cible par palier ?** — FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180 (sur 200).
71. **L'ICP ?** — Indice de Co-Pilotage : la part de co-responsabilité (founder/marché).
72. **Que se passe-t-il si l'EFR échoue ?** — Constat **calculé** (score+hash-chain), **4 recours** (remédiation/renégociation/geste/sortie). Loi 1 : l'altitude acquise reste acquise.
73. **Les 7 ruptures disruptives ?** — Obligation d'effet · marque actif auditable · miroir sectoriel · communauté possédée · curseur de délégation · marketing-patrimoine · Coalition Stellaire.

### I. ADVE/RTIS, APOGEE, archétypes (74–82)

74. **ADVE (PDF) ?** — Authenticité, Distinction, Valeur, Engagement ; /50 → **/200**.
75. **Repo ?** — Cascade **A→D→V→E→R→T→I→S** (R=Risk, T=Track, I=Innovation, S=Strategy).
76. **Les 3 stages rocket ?** — Booster (A+D+V+E), Mid (R+T), Upper (I+S).
77. **ADVE vs RTIS — éditable ?** — ADVE = noyau **mutable** (`OPERATOR_AMEND_PILLAR` seul) ; RTIS = couronne **dérivée**.
78. **APOGEE ?** — Framework de **trajectoire** (point culminant d'orbite). Pas un dieu, pas une maison.
79. **Les 6 paliers ?** — LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → **ICONE**.
80. **Les 9 archétypes ?** — PRODUCT, SERVICE, CHARACTER_IP, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE, PLATFORM, INSTITUTION, PERSONAL.
81. **La satellisation organique ?** — Chaque marque = un **satellite isomorphe** (noyau ADVE, RTIS, Sève, 7 Neteru tenant-scopés). **Connexion (Sève-mère), pas fusion.**
82. **Les 7 Neteru ?** — Mestor/Sia, Artemis/Neith, Seshat, Thot, Ptah, Imhotep, Anubis. **Cap 7/7.** INFRASTRUCTURE n'est pas un Neter.

### J. Doctrine du Mouvement Cosmique (83–89)

83. **Premier principe ?** — UPgraders = **Agence Spatiale Industrielle** (produit un **marché**, pas un client ; une flotte de N satellites).
84. **Deuxième principe ?** — Superfans = **Équipage de Propagation** (équipiers par conviction).
85. **La Devotion Ladder (6 paliers) ?** — Spectateur → Intéressé → Participant → Engagé → Ambassadeur → **Évangéliste**.
86. **Le founder, c'est qui dans l'équipage ?** — Le **premier équipier enrôlé** (pas le premier client).
87. **Troisième principe ?** — **Coalition Stellaire** : marques ICONE coordonnées → basculement Overton **irréversible**.
88. **Le client ultime de La Fusée ?** — L'**industrie créative africaine francophone** elle-même.
89. **Superfans/Overton sont-ils des KPIs ?** — **Non** — mécaniques pivots. (KPI proxy Anubis : coût par superfan recruté.)

### K. Les arbres (90–96)

90. **Combien de « arbres » distincts ?** — **Sept** (§12).
91. **L'arbre de vente appartient à qui ?** — **UPgraders** (Plan commercial). Il **vend**.
92. **L'arbre de vente vend-il La Fusée ?** — **Oui, explicitement** (Cockpit/Oracle) **ET** le reste de l'offre.
93. **Brand Tree = ?** — L'arbre-portfolio d'un **client** (`archétype → VENTURE_DIVISION → PROJECT → DELIVERABLE → INSTANCE`) — l'**Ished au niveau satellite**.
94. **L'Arbre (Ished) = ?** — L'**image-monde** : La Fusée entière. Tronc+branches = l'architecture (APOGEE + 7 Neteru) qui **décide**.
95. **La Sève = ?** — Le **substrat** (7 racines) qui **circule** sans décider (= Yggdrasil côté code). **Pas un arbre décisionnel, pas un Neter.**
96. **L'« arbre de décision d'échec EFR » = ?** — Un arbre **contractuel** (Cahier des Charges §1.7), pas un script de vente ni une méthode.

### L. La faute & sa correction (97–100)

97. **Quelle était l'erreur de NEFER (2026-06-21) ?** — (a) écrire « ne vends pas La Fusée » ; (b) confondre l'arbre de **vente** d'UPgraders avec les arbres **internes** de La Fusée.
98. **Comment formuler la consigne au commercial ?** — *« Vends la valeur et l'accès que donne La Fusée (Cockpit/Oracle/score) **et** les services UPgraders ; n'expose pas l'OS/les Neteru. »*
99. **`sales-response-tree` est-il un livrable de marque ?** — **Non** — un **outil interne d'aide à la vente** (Plan commercial), pas un Oracle/BrandAsset livré au client.
100. **La règle d'or en une phrase ?** — **UPgraders (l'Agence Spatiale) vend ; La Fusée est le véhicule-produit vendu via Cockpit/Oracle (et il y a d'autres offres) ; l'arbre de vente place les véhicules, les sept arbres internes les construisent et les font circuler — on ne les confond jamais.**

---

*Maintenu par NEFER. Provenance : 4 PDF UPgraders (base) + canon opérationnel `ADVE-project` + canon
conceptuel `la-fusee-blueprint` (LA_FUSEE_BLUEPRINT / LIVRE_DE_BORD / CAHIER_DES_CHARGES,
NAMING_CANON v3.3). Toute correction de vocabulaire canon doit propager dans les sources de vérité —
interdit anti-drift #3.*
