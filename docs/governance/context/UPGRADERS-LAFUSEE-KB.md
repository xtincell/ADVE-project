# UPgraders × La Fusée — Base de connaissance (vocable business)

> **But.** Vérité unique consolidée sur UPgraders / La Fusée, **en vocabulaire business**, pour
> qu'aucun agent ne reproduise le drift du 2026-06-21 (`sales-response-tree`, PR #277) : avoir
> traité **« La Fusée »** comme « non-vendable » et mélangé **l'arbre de vente d'UPgraders** avec
> les **arbres internes de La Fusée**. À lire avant tout travail commercial / identité / funnel /
> nommage.
>
> **Règle de vocabulaire (NOUVEAU — directive opérateur 2026-06-21).** Ce document parle **business**.
> Le canon historique habille l'OS d'un **registre mythologique/religieux** (« Neteru », noms de
> divinités, « la Pesée », « Messie », « Gospel », « Temples », « évangélisation »…). **Ces termes
> sont des alias internes** : on les conserve **entre parenthèses** pour la traçabilité avec le
> code et le blueprint, mais **le vocable par défaut est business**, et **aucun terme religieux ne
> s'expose jamais au client**. Le registre **aéronautique** (Fusée, Cockpit, orbite, apogée,
> trajectoire) est la **signature produit** d'une marque créative — il reste, ce n'est pas du
> religieux. Seul le registre **divin** est remplacé. La table de traduction est la **§3**.

---

## §0 — Provenance & couches de canon (l'ordre d'autorité)

| Couche | Source | Autorité sur… |
|---|---|---|
| **Base** | Les **4 PDF** (Écosystème · Manifeste « Bâtir le Système d'Exploitation » · Analyse du Modèle Économique · Bio Alexandre Djengue/Xtincell) | l'**offre commerciale** + l'origine + le marché |
| **Canon opérationnel** | **Ce repo** (`ADVE-project`) : `STATE_FINAL_BLUEPRINT.md`, `CLAUDE.md`, ADR 0001-0104, `CODE-MAP.md` | l'**implémentation** : noms de code, modèles, ce qui tourne — **prime pour le code** |
| **Canon conceptuel** | Repo voisin **`la-fusee-blueprint`** : `LA_FUSEE_BLUEPRINT.md`, `LIVRE_DE_BORD.md`, `CAHIER_DES_CHARGES.md`, `NAMING_CANON v3.3` | la **doctrine / la vision / le nommage-cible** — **prime pour la doctrine** |
| **Vocable business** | **Ce document (§3)** | le **registre de communication** : business par défaut, **client-facing** |

**Préséance.** Code → canon opérationnel (noms `Mestor/Artemis/…`). Doctrine → canon conceptuel
(noms `Sia/Neith/…`, **scellés mais pas migrés dans le code**). Communication/business/client →
**vocable business (§3)**. Si un PDF contredit le repo (ex. pricing FCFA) → **le repo gagne**.

---

## §1 — LA RÈGLE D'OR (jamais l'enfreindre)

| Entité | Nature | Rôle | Jamais… |
|---|---|---|---|
| **UPgraders** | La **société / agence** qui industrialise la production de marques | **VEND / OPÈRE** | …confondue avec son produit. C'est le **vendeur** et l'opérateur. |
| **La Fusée** | Le **produit / l'Industry OS** d'UPgraders | **EST VENDU** (face client) **+ propulse** (moteur) | …dite « non-vendable » : sa face client (**Cockpit/Oracle/PDF/score**) **se vend**. Seul son **moteur** (l'OS et ses rouages internes) est invisible. |
| **Argos** | **Sous-marque éditoriale visible** | Rayonne / observe | …prise pour une société ou pour l'OS. C'est la vitrine + l'observatoire de marché public. |
| **NEFER** | L'**opérateur** (humain senior ou agent IA) | Exécute / range / garantit la cohérence | …compté comme un moteur de gouvernance. |

**Les deux interdits qui résument l'erreur de NEFER :**

1. ❌ *« On ne vend pas La Fusée. »* → **FAUX.** On vend **ce que La Fusée donne** : abonnement
   **Cockpit**, **Oracle**, **PDF d'intake**, **score**. On **n'expose pas** la mécanique interne
   au client. *Vendre La Fusée = vendre l'accès et la valeur, pas décrire la plomberie.*
2. ❌ *Confondre l'arbre de vente avec les arbres internes* (voir **§12**). L'**arbre de vente
   d'UPgraders** (`sales-response-tree`) sert à **vendre** ; les **arbres internes** (ADVE-RTIS,
   Brand Tree, substrat de circulation, funnel, arbre de décision de contrat) servent à
   **construire/faire circuler/contractualiser**, pas à vendre.

> **Mnémonique :** *UPgraders est l'usine ; La Fusée est le produit-phare vendu (Cockpit/Oracle) —
> et il y a d'autres offres ; l'arbre de vente place les produits, les arbres internes les
> construisent et les font fonctionner.*

---

## §2 — Identité commerciale

**UPgraders > La Fusée > Argos** (société > produit-phare > sous-marque).

- **UPgraders = l'agence qui industrialise la production de marques.** Pas l'éditeur d'un SaaS
  qu'on utilise seul : une marque qui entre **devient un projet piloté de bout en bout** (équipe,
  trajectoire, pilotage, objectif de palier visé). À l'échelle, UPgraders ne sert pas un client —
  il **structure un marché** (le référent de l'industrie créative africaine francophone).
  *(Registre produit : « Agence Spatiale Industrielle ».)*
- **La Fusée = le produit, l'Industry OS** — le moteur reproductible. *« La Fusée d'UPgraders. »*
  Jamais « plateforme » ni « LaFusee OS ».
- **Argos = sous-marque éditoriale visible** — vitrine de la flotte + observatoire de marché
  public. Côté technique c'est la façade publique d'un sous-domaine de veille (*Per-Ankh / Argos*).
- **NEFER = l'opérateur** qui exécute, range, garantit la cohérence. Pas un moteur de gouvernance.

Doctrine terminologique : **« Client » = le payeur ; « client final » = le consommateur cible de
la marque du client.**

---

## §3 — LEXIQUE BUSINESS (le vocable à utiliser) — pièce maîtresse

**Règle :** colonne 1 = le terme **business** (par défaut, et seul autorisé face au client) ;
colonne 2 = son **impact business** ; colonnes 3-4 = les **alias internes** (code / doctrine),
jamais exposés au client.

### 3.1 — Les 7 moteurs de gouvernance *(alias historique : « les 7 Neteru »)*

> Le plafond est de **7** (jamais un 8ᵉ). « INFRASTRUCTURE » = la fonction Console/Admin
> (configuration), pas un moteur. Impact business global : **chaque fonction de l'OS a un
> propriétaire unique et responsable**, ce qui rend l'exécution traçable et gouvernée.

| Terme business | Impact business | Alias code | Alias doctrine |
|---|---|---|---|
| **Orchestrateur** (Guidance) | Point d'entrée unique : valide, arbitre et route **chaque décision/action** métier. Aucun raccourci, tout est tracé. | Mestor | Sia |
| **Studio de Brief** (Conception) | Produit les **briefs** créatifs & stratégiques (concepts, copy, manifestes, positionnement). | Artemis | Neith |
| **Forge d'Assets** (Production) | **Matérialise** les briefs en assets concrets (image, vidéo, audio, design) via prestataires/outils. | Ptah | Ptah |
| **Télémétrie & Analytics** (Mesure) | **Observe, mesure, archive** le réel ; alimente les scores et la veille. | Seshat | Seshat |
| **Moteur Financier & Opérations** | Budget, **facturation, escrow, mobile money, CRM**, garde-fou de coût. Refuse ce qui mettrait en faillite. | Thot | Thot |
| **Moteur Talent / Marketplace** | **Matching** des talents, niveaux de qualité, **formation** (Académie). | Imhotep | Imhotep |
| **Moteur de Diffusion** (Comms) | **Diffusion multicanal** (ad networks, email/SMS, push, notifications). KPI : **coût par superfan recruté**. | Anubis | Anubis |

### 3.2 — Sous-agents, connecteurs, substrat, gouvernance

| Terme business | Impact business | Alias code | Alias doctrine |
|---|---|---|---|
| **Récolteur de références** (sous-agent) | Collecte les **références de campagnes** qui alimentent Argos. | Hunter | Wepwawet |
| **Radar de signaux faibles** | Capte les **signaux culturels émergents** (tendances faibles). | Tarsis | Shaï |
| **Référentiel marché / veille** | Base éditoriale & de veille (nourrit Source Insights / Argos). | sous-domaine Seshat (ex-Argos) | Per-Ankh |
| **Substrat de circulation de la valeur** *(le « réseau interne »)* | **Fait circuler** la valeur de façon **tracée** (bus d'actions, journal immuable, temps réel, cloisonnement par client). Ne décide rien ; ungouverné. | Yggdrasil | la Sève / l'Arbre (Ished) |
| **Validation pré-vol** (gate de gouvernance) | **Contrôle chaque action** avant exécution : pré-conditions remplies ? budget suffisant ? Sinon : refus. | gates Mestor | la Pesée (héritage MAAT) |
| **Catalogue d'amendements** (revue de changements) | Liste les **propositions de changement** de l'ADVE, scorées, **en attente de décision opérateur**. | Jehuty | Notoria |
| **La couche de gouvernance** | L'ensemble des 7 moteurs + la Console/Admin. | BRAINS | le panthéon |
| **Activation des moteurs** | Mise en service des fonctions de l'OS pour une nouvelle marque. | bootstrap | « Descente des Dieux » |

### 3.3 — Vocabulaire de marque (registre cult-marketing → business)

> Le canon emploie un **cult-marketing** à forte coloration religieuse. **Glose business
> obligatoire face au client.**

| Terme business | Impact business | Alias (canon religieux) |
|---|---|---|
| **Figure de proue** / visage de la marque | Le porte-étendard charismatique (fondateur, CEO, personnage) qui **incarne** la marque. | « Le Messie » |
| **Récit fondateur** / narratif de marque | L'histoire + les valeurs qui **fondent** la marque et la rendent mémorable. | « Gospel » |
| **Points de contact** (physiques & digitaux) | Les surfaces où la marque **rencontre** son public. | « Temples » |
| **Rituels d'usage** / habitudes | Les actions répétées qui **créent l'habitude**. | « Rituels » |
| **Ambassadeurs / animateurs de communauté** | Le noyau qui **anime** la communauté. | « Clergé » |
| **Événements phares** | Les grands rendez-vous annuels qui **rassemblent**. | « Pèlerinages » |
| **Recommandation / bouche-à-oreille** (referral) | La **propagation organique** par les fans (K-factor > 1). | « Évangélisation » |
| **Offres / produits** | Les offerings tangibles **vendus**. | « Sacrements » |
| **Superfans** (base d'ambassadeurs & prescripteurs) | **Masse stratégique** qui produit du travail organique pour la marque. | « Équipage de Propagation » |
| **Prescripteur / champion** (haut de l'échelle) | Le fan qui **propage en autonomie** (recrute sans coût marketing). | « Évangéliste » |
| **Échelle d'engagement** (6 niveaux) | Mesure la **montée en fidélité** d'un contact. | « Devotion Ladder » / « dévotion » |
| **Indice d'attachement** | Mesure la **ferveur** d'une communauté autour de la marque. | « Cult Index » |
| **Coalition de marques leaders** | Plusieurs marques leaders qui **déplacent ensemble** le standard d'un secteur. | « Coalition Stellaire » |

---

## §4 — Le fondateur & l'origine

- **Alexandre Djengue**, alias **« Xtincell »** (ex-« Brazier »), Camerounais, **Douala**. CEO
  d'UPgraders, concepteur de la méthode **ADVE/ADVERTIS**. Devise : *« De la poussière à l'étoile. »*
- Polymathe : ingénierie (Licence Pro télécoms/réseaux, certif. Cisco) **×** créatif (Brand
  Identity, design, photo), « autodidacte guidé par mentorat ». Blog **« Geek de brousse »** = son
  leadership d'opinion (la **figure de proue** de la marque).
- **Origin myth** : agence de marketing digital → **pivot** « conciergerie créative » → agence qui
  **industrialise la production de marques**. *Le modèle devient la marque.*

---

## §5 — Le problème de marché

**Double déficit :** confiance (entreprises ↔ talents locaux) **+** compétences structurantes
(talents). Aggravé par l'informalité des ICC et les **frictions de paiement**. **Marché-monde :**
Afrique francophone (UEMOA + CEMAC + diaspora), mobile-first. **FCFA** primaire ; **mobile money**
(Wave/Orange/MTN/Moov). Cadres : OHADA, OAPI, BCEAO/UEMOA. **Escrow** = séquestre jusqu'à
validation. **Doctrine `capture-then-grow` :** viser les **forts potentiels à faible pouvoir
d'achat** (pas les corporates riches), grandir avec eux. *« La Fusée capture l'ambition, pas la
fortune. »*

---

## §6 — Les 5 types de valeur produite (la taxonomie anti-confusion)

Ne **jamais** mélanger un brief, un asset, une campagne, une mission et un rapport. **Cinq natures,
cinq verbes, cinq producteurs.** *(Canon : « les 5 Plans ontologiques ».)*

| Type | Verbe | Quoi | Producteur (business) |
|---|---|---|---|
| **Intellectuel** | *penser* | le **brief** (concept, story, manifeste) | Studio de Brief |
| **Matériel** | *montrer* | l'**asset** (image, vidéo, audio, design) | Forge d'Assets |
| **Opérationnel** | *faire* | la **campagne + action** (déploiement réel) | Orchestrateur + Moteur de Diffusion |
| **Commercial** | ***vendre*** | la **mission + le livrable** (cargaison payante au client) | Moteur Talent + Moteur Financier (facture) |
| **Analytique** | *savoir* | le **rapport + l'Oracle** (synthèse, insight, reco) | Télémétrie + assemblage dérivé |

> **Conséquence #277 :** l'**arbre de vente** opère dans le type **commercial (« vendre »)**.
> L'**Oracle** est de type **analytique (« savoir »)** — mais il **se vend** (cargaison payante).
> Les **campagnes** sont **opérationnelles (« faire »)**. On ne confond pas *vendre une mission*,
> *faire une campagne*, et *savoir via un Oracle*.

---

## §7 — Le modèle économique : flywheel + 5 piliers

Hybride **Conseil × Marketplace × SaaS**, **flywheel auto-renforçant**. **L'actif défendable = la
flotte (N marques dans un substrat unifié) + la trace (journal immuable + score).**

| Pilier (™ PDF) | Fonction | Ancrage (business) |
|---|---|---|
| **Impulsion™** | Conseil stratégique (Audit, Workshop, Retainer/CMO délégué) — porte d'entrée | Oracle + funnel intake→Oracle ; Studio de Brief |
| **Pilotis™** | Gestion de projets déléguée (chef de projet, COO créatif, QA) | Mission/Deal + `/console/operations` ; Orchestrateur + Moteur Talent |
| **Source Insights™** | Veille / intelligence de marché | Télémétrie + Radar de signaux faibles + Argos |
| **La Guilde™** | Marketplace de talents curatés (**CORE** freelances / **EXTENDED** agences / **RÉSEAU** spécialisés) | portail public `/LaGuilde` (Moteur Talent) |
| **Sérénité™** | Conciergerie admin & financière (portage/EoR, facturation, **escrow**, contrats, paiements) | Moteur Financier & Opérations + mobile money |

**+ La plateforme** qui orchestre les 5 piliers = **La Fusée** (l'Industry OS).

---

## §8 — La Fusée : ce qui **se vend** vs ce qui est **invisible** + portails + pricing

**5 portails :**

| Portail | Acteur | Vendu ? |
|---|---|---|
| **Cockpit** | propriétaire de marque (pilote sa mission) | **OUI — abonnement** (la vente de La Fusée côté produit) |
| **Console** (Mission Control) | opérateurs UPgraders / agences | **Jamais vendu** (interne) |
| **Crew Quarters** (Creator + Agency) | talents + agences | accès embarquement |
| **Launchpad** (Intake) | visiteur public | **gratuit** (porte du funnel) |
| **Argos** | public éditorial + observatoire | sous-marque visible |

**Ce qui se vend (face client) :** abonnement **Cockpit**, **Oracle** (diagnostic dynamique 35
sections), **PDF d'intake**, score, livrables. **Ce qui est invisible :** l'OS, les 7 moteurs, le
substrat de circulation, les outils internes.

**Pricing canon (capture-then-grow) :** Intake **gratuit** ; PDF Oracle **5-25k FCFA** ;
Embarquement (1ᵉʳ abonnement Cockpit) **15-25k FCFA/mois** (zone Dakar-Abidjan) ; prix **localisé
par zone** (jamais grille FCFA statique ; jamais USD/Stripe imposé). Un commercial **n'annonce pas
de prix ferme hors mandat** → `/pricing` ou escalade.

---

## §9 — EFR / obligation d'effet (le repositionnement commercial)

La rupture n°1 — *l'agence à obligation d'effet* :

- **EFR = État Final Recherché** : *« On ne vend pas des moyens, on vend un état final mesuré »* =
  palier visé **+** score cible **+** horizon **+ échelle de marché déclarée** (ADR-0126 — le palier
  promis se mesure sur SON terrain : quartier ≠ nation ≠ monde ; sans référentiel d'échelle au
  contrat, l'obligation d'effet serait juridiquement floue). Gelés et tracés (journal immuable) à la signature.
- **Obligation d'effet tracé** : **résultat ferme** sur ce que l'Agence contrôle ; **effort
  prouvé** sur ce qu'elle co-détermine. L'effort devient une grandeur **auditée**.
- **Score cible par palier = seuil d'entrée de la bande canon** (`classifyTier`, `src/domain/brand-tier.ts`) :
  FRAGILE > 40 · ORDINAIRE > 80 · FORTE > 120 · CULTE > 160 · ICONE > 180 (/200). Un EFR « palier P »
  n'est atteint que si le score composite **entre dans la bande de P** — jamais la borne haute du
  palier précédent (l'ancienne table FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180
  classifiait un point SOUS le palier promis).
- **ICP (Indice de Co-Pilotage)** : la part de co-responsabilité (founder/marché).
- Échec **calculé** (score + journal), **4 recours** (remédiation / renégociation / geste /
  sortie) ; l'altitude acquise reste acquise. Le moat : **la flotte + la trace**.

---

## §10 — Méthode ADVE/RTIS, paliers, score

- **ADVE = Architecture des Expériences** *(canon : « Architecture Divine des Expériences » —
  « Divine » est du registre religieux, on dit simplement « Architecture des Expériences »)* :
  **A**uthenticité · **D**istinction · **V**aleur · **E**ngagement, /50 → **score /200**.
- **Repo = cascade A→D→V→E→R→T→I→S** (R=Risk, T=Track, I=Innovation, S=Strategy). **3 étages** :
  Booster (A+D+V+E), Mid (R+T), Upper (I+S). **ADVE = noyau mutable** (`OPERATOR_AMEND_PILLAR`
  seul) ; **RTIS = couronne dérivée**.
- **Composantes du pilier Authenticité** (gloses business) : la **figure de proue** *(« Messie »)*,
  la Vision, la Mission, les Valeurs, le **récit fondateur** *(« Gospel »/Origin Myth)*, les
  compétences distinctives.
- **Composantes du pilier Engagement** (gloses business) : l'**échelle d'engagement**
  *(« devotion ladder »)*, les **points de contact** *(« temples »)*, les **rituels d'usage**, les
  **ambassadeurs** *(« clergé »)*, les **événements phares** *(« pèlerinages »)*, la
  **recommandation** *(« évangélisation »)*.
- **6 paliers de maturité de marque** : LATENT → FRAGILE → ORDINAIRE → FORTE → **CULTE** → **ICONE**
  *(« marque culte » et « icône » sont du vocabulaire marketing standard — conservés)*.
- **9 archétypes de marque** : PRODUCT · SERVICE · CHARACTER_IP · FESTIVAL_IP · MEDIA_IP ·
  RETAIL_SPACE · PLATFORM · INSTITUTION · PERSONAL.
- **Modèle multi-tenant organique** : chaque marque-cliente = une **instance isolée** (son propre
  ADVE, son RTIS, sa circulation interne, ses moteurs scopés). **Connexion mutualisée, pas
  fusion** ; aucune donnée métier ne fuit entre clients.

---

## §11 — La doctrine de croissance *(canon : « Mouvement Cosmique »)*

1. **UPgraders industrialise la production de marchés** — il maintient une **flotte** de N marques
   à différents stades, façon ligne de production (véhicule reproductible, projet unique).
2. **Les superfans sont une base d'ambassadeurs active** — pas une audience achetée, des
   **prescripteurs** qui propagent par conviction. **Échelle d'engagement (6 niveaux)** :
   Spectateur → Intéressé → Participant → Engagé → **Ambassadeur** → **Prescripteur/champion**
   *(« évangéliste »)*. Le founder = **premier ambassadeur enrôlé**.
3. **Coalition de marques leaders** — plusieurs marques **ICONE coordonnées** déplacent le standard
   (l'**Overton**) d'un secteur de façon **irréversible**. Le client ultime = **l'industrie
   créative africaine francophone** elle-même.

> **Superfans & Overton ne sont pas des KPIs** — ce sont les **mécaniques pivots** (masse
> d'ambassadeurs + axe culturel). KPI proxy : **coût par superfan recruté**.

---

## §12 — LES « ARBRES » : désambiguïsation complète

Le mot « arbre » désigne **sept** choses distinctes. **Ne jamais les confondre.**

| # | « Arbre » | Appartient à | Sert à | C'est… |
|---|---|---|---|---|
| 1 | **Arbre de VENTE d'UPgraders** | UPgraders (commercial) | qualifier → vendre → capturer le lead → escalader | `sales-response-tree` (PR #277). **Vend La Fusée (Cockpit/Oracle) ET le reste de l'offre.** |
| 2 | **Cascade ADVE-RTIS** | La Fusée (méthode) | construire la marque d'un client (A→S) | la méthode. Mutée via `OPERATOR_AMEND_PILLAR`. **Pas un script de vente.** |
| 3 | **Brand Tree** | un **client** (son portfolio) | `archétype → DIVISION → PROJET → LIVRABLE → INSTANCE` | l'arbre-portfolio **isomorphe** de la marque-cliente. |
| 4 | **L'image-monde** *(« l'Arbre / Ished »)* | La Fusée **entière** | métaphore d'ensemble de l'organisme | la vue d'ensemble : architecture (les 7 moteurs) = ce qui **décide**. |
| 5 | **Le substrat de circulation** *(« la Sève », code : Yggdrasil)* | substrat **ungouverné** | faire **circuler** la valeur (ne décide rien) | la « tuyauterie » tracée. **Pas un arbre décisionnel, pas un moteur.** |
| 6 | **Funnel AARRR** | La Fusée + UPgraders (acquisition) | mesurer Acquisition/Activation/Rétention/Revenue/Référral | `CampaignAARRMetric`. L'arbre de vente **vise** un AARRR ; il n'**est** pas le funnel. |
| 7 | **Arbre de décision de contrat (échec EFR)** | UPgraders (contrat) | trancher le recours si l'objectif n'est pas atteint | Cahier des Charges §1.7. Arbre **contractuel**, pas un script de vente. |

**Conséquence pour `sales-response-tree` :** c'est **l'arbre #1**. Il **vend La Fusée explicitement**
(Cockpit/Oracle) **et** les autres piliers ; il ne se présente **jamais** comme #2/#3/#4 ; il garde
la mécanique interne **hors** du discours client.

---

## §13 — Lexique anti-drift (paires à ne jamais confondre)

- **UPgraders** (vendeur/agence) ≠ **La Fusée** (produit/OS) ≠ **Argos** (sous-marque).
- **« Vendre La Fusée »** = vendre **Cockpit/Oracle/accès** (OK) ≠ **exposer la mécanique
  interne / les moteurs** au client (interdit).
- Les **7 arbres** de §12 — chacun distinct.
- **Cockpit** (vendu) ≠ **Console** (interne, jamais vendu). **Client** (payeur) ≠ **client final**.
- **Vocable business (§3)** = par défaut + client-facing ≠ **alias code** (Mestor/Artemis…) ≠
  **alias doctrine** (Sia/Neith…). **Aucun terme religieux face au client.**
- **Substrat de circulation** (circule) ≠ **Orchestrateur** (décide). Substrat ≠ décideur.
- **EFR** (état final vendu) ≠ moyens (plus vendus seuls). **Superfans/Overton** = pivots ≠ KPIs.
- **Type opérationnel** (faire/campagnes) ≠ **type commercial** (vendre/missions) ≠ **type
  analytique** (savoir/Oracle).

---

## §14 — 100 Questions / Réponses

### A. Identité & frontières (1–12)

1. **UPgraders ?** — La société/agence qui **vend et opère** La Fusée et industrialise la
   production de marques. Fondée par Alexandre Djengue (Douala).
2. **La Fusée ?** — Le **produit / Industry OS** d'UPgraders.
3. **Argos ?** — La **sous-marque éditoriale visible** (vitrine + observatoire de marché).
4. **NEFER ?** — L'**opérateur**. Pas un moteur de gouvernance.
5. **Hiérarchie ?** — UPgraders > La Fusée > Argos.
6. **La Fusée se vend ?** — **Oui** (Cockpit/Oracle/PDF/score). Seul son moteur est invisible.
   Ne jamais dire « on ne vend pas La Fusée ».
7. **Que vend-on en vendant La Fusée ?** — Cockpit, Oracle, PDF, accès au score — la valeur, pas
   la plomberie.
8. **Le commercial cite-t-il la mécanique interne ?** — **Non** — jargon interne, jamais client.
9. **UPgraders ne vend que La Fusée ?** — **Non** : + conseil, projet, talents, admin/paiements,
   veille, certif, events.
10. **« Industry OS » ou « plateforme » ?** — **Industry OS**.
11. **Cockpit vs Console ?** — Cockpit = client (vendu) ; Console = interne (jamais vendu).
12. **Positionnement ?** — **Premium curated** (≠ Fiverr/Upwork).

### B. Vocable business & couches de canon (13–24)

13. **Quel vocabulaire par défaut ?** — **Business** (§3). Les termes religieux (« Neteru »,
    « Messie », « la Pesée »…) sont des **alias internes**, jamais client-facing.
14. **Pourquoi remplacer le religieux ?** — Directive opérateur : le registre divin sonne
    religieux ; on parle business. Le registre **aéronautique** (Fusée/Cockpit) reste — c'est la
    signature produit, pas du religieux.
15. **Les 3 couches de canon ?** — PDF (offre), repo `ADVE-project` (**opérationnel**, prime
    code), repo `la-fusee-blueprint` (**conceptuel**, prime doctrine).
16. **PDF vs repo ?** — **Le repo gagne** (ex. pricing FCFA).
17. **Pour le code, quel nommage ?** — Opérationnel : Mestor, Artemis, Tarsis, Hunter, Yggdrasil,
    Jehuty, Argos.
18. **Pour la doctrine, quel nommage ?** — Conceptuel v3.3 : Sia, Neith, Shaï, Wepwawet,
    Sève/Ished, Notoria, Per-Ankh (**scellé, pas migré dans le code**).
19. **« Orchestrateur » = ?** — Code : **Mestor** ; doctrine : **Sia**. Impact : valide et route
    chaque action métier.
20. **« Studio de Brief » = ?** — Code : **Artemis** ; doctrine : **Neith**. Produit les briefs.
21. **« Forge d'Assets » = ?** — **Ptah**. Matérialise les briefs en assets.
22. **« Moteur Financier & Opérations » = ?** — **Thot**. Budget, escrow, mobile money, CRM.
23. **« Moteur de Diffusion » = ?** — **Anubis**. Diffusion multicanal ; KPI coût/superfan.
24. **« Substrat de circulation » = ?** — Code : **Yggdrasil** ; doctrine : **la Sève**. Fait
    circuler la valeur de façon tracée ; ungouverné.

### C. Les 7 moteurs & la gouvernance (25–33)

25. **Combien de moteurs de gouvernance ?** — **7** (plafond strict).
26. **Lesquels ?** — Orchestrateur, Studio de Brief, Forge d'Assets, Télémétrie, Moteur Financier,
    Moteur Talent, Moteur de Diffusion *(Mestor, Artemis, Ptah, Seshat, Thot, Imhotep, Anubis)*.
27. **INFRASTRUCTURE est-il un moteur ?** — **Non** — c'est la fonction Console/Admin.
28. **« Télémétrie & Analytics » = ?** — **Seshat**. Observe, mesure, archive.
29. **« Moteur Talent / Marketplace » = ?** — **Imhotep**. Matching, niveaux, Académie.
30. **« Récolteur de références » / « Radar de signaux faibles » ?** — **Hunter** / **Tarsis**.
31. **« Validation pré-vol » = ?** — Le **contrôle de chaque action** avant exécution
    (pré-conditions + budget). *(Canon : « la Pesée ».)*
32. **« Catalogue d'amendements » = ?** — La liste des **propositions de changement ADVE** scorées,
    en attente de décision opérateur *(code : Jehuty ; doctrine : Notoria)*.
33. **Impact business des 7 moteurs ?** — Chaque fonction de l'OS a un **propriétaire unique et
    responsable** → exécution traçable et gouvernée (aucun bypass).

### D. Le fondateur & le marché (34–40)

34. **Fondateur ?** — Alexandre Djengue (« Xtincell »), Douala.
35. **Profil ?** — Ingénierie × création ; blog « Geek de brousse ».
36. **Origin myth ?** — Agence digitale → conciergerie créative → industrialisation de la
    production de marques.
37. **Double déficit du marché ?** — Confiance (entreprises) + compétences (talents).
38. **Marché-monde ?** — Afrique francophone (UEMOA+CEMAC+diaspora), mobile-first.
39. **Paiement / devise ?** — **FCFA** + **mobile money** (Wave/Orange/MTN/Moov). Pas d'USD imposé.
40. **`capture-then-grow` ?** — Capturer les forts potentiels à faible pouvoir d'achat ; grandir
    avec eux.

### E. Les 5 types de valeur (41–46)

41. **Les 5 types ?** — Intellectuel (penser), Matériel (montrer), Opérationnel (faire),
    **Commercial (vendre)**, Analytique (savoir).
42. **Brief / asset ?** — Brief = type intellectuel (Studio de Brief) ; asset = type matériel
    (Forge d'Assets).
43. **Campagne ?** — Type **opérationnel** (faire) : Orchestrateur + Moteur de Diffusion.
44. **Mission/livrable ?** — Type **commercial** (vendre) : Moteur Talent + Moteur Financier
    facture.
45. **Oracle/rapport ?** — Type **analytique** (savoir) : Télémétrie + assemblage dérivé.
46. **Où vit l'arbre de vente ?** — Type **commercial**. L'Oracle (analytique) **se vend** quand
    même.

### F. Modèle économique & 5 piliers (47–56)

47. **Nature du modèle ?** — Conseil × Marketplace × SaaS, flywheel.
48. **Le moat ?** — **La flotte + la trace** (pas les outils).
49. **Les 5 piliers ?** — Impulsion (conseil), Pilotis (projet), Source Insights (veille), La
    Guilde (talents), Sérénité (admin/finance).
50. **Impulsion ?** — Conseil premium (Audit/Workshop/Retainer/CMO délégué) ; porte d'entrée.
51. **Pilotis ?** — Gestion de projet déléguée (chef de projet, COO créatif, QA).
52. **Source Insights ?** — Veille / intelligence de marché.
53. **La Guilde — 3 catégories ?** — **CORE** (freelances), **EXTENDED** (agences), **RÉSEAU**
    (spécialisés).
54. **Sérénité ?** — Admin/finance : portage, facturation, **escrow**, contrats, mobile money.
55. **Le flywheel en une phrase ?** — Conseil → projets → talents → crédibilité → conseil ;
    veille crédibilise ; admin rend *collant*.
56. **La Fusée est un pilier ?** — **Non** — la plateforme/OS qui orchestre les 5 piliers.

### G. La Fusée, portails, pricing (57–66)

57. **Combien de portails ?** — **5** : Cockpit, Console, Crew Quarters, Launchpad, Argos.
58. **Lequel se vend ?** — Le **Cockpit** (abonnement).
59. **Lequel n'est jamais vendu ?** — La **Console**.
60. **L'Intake ?** — **Gratuit** (porte du funnel).
61. **Prix PDF Oracle ?** — **5-25k FCFA**.
62. **Prix 1ᵉʳ abonnement Cockpit ?** — **15-25k FCFA/mois** (Dakar-Abidjan).
63. **Prix = grille fixe ?** — **Non** — localisé par zone.
64. **Le commercial donne un prix ferme ?** — **Non hors mandat** → `/pricing` ou escalade.
65. **Ce qui se vend ?** — Cockpit, Oracle, PDF, score, livrables.
66. **Ce qui est invisible ?** — L'OS, les 7 moteurs, le substrat de circulation, les outils.

### H. EFR / obligation d'effet (67–72)

67. **EFR ?** — État Final Recherché : on vend un **état final mesuré** (palier + score + horizon).
68. **L'innovation n°1 ?** — L'agence à **obligation d'effet**.
69. **Résultat ou moyens ?** — **Obligation d'effet tracé** (résultat ferme sur ce qu'on contrôle,
    effort prouvé sur ce qu'on co-détermine).
70. **Score cible par palier ?** — FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180.
71. **L'ICP ?** — Indice de Co-Pilotage (part de co-responsabilité).
72. **Si l'objectif échoue ?** — Constat **calculé**, **4 recours** ; l'altitude acquise reste
    acquise.

### I. Méthode & maturité (73–80)

73. **ADVE ?** — Architecture des Expériences : Authenticité, Distinction, Valeur, Engagement
    (/200).
74. **Repo ?** — A→D→V→E→R→T→I→S ; 3 étages Booster/Mid/Upper.
75. **ADVE vs RTIS éditable ?** — ADVE mutable (`OPERATOR_AMEND_PILLAR`) ; RTIS dérivé.
76. **La « figure de proue » ?** — Le porte-étendard charismatique de la marque *(« Messie »)*.
77. **Le « récit fondateur » ?** — L'histoire + valeurs qui fondent la marque *(« Gospel »)*.
78. **Les 6 paliers ?** — LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE.
79. **Les 9 archétypes ?** — PRODUCT, SERVICE, CHARACTER_IP, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE,
    PLATFORM, INSTITUTION, PERSONAL.
80. **Multi-tenant ?** — Chaque marque = **instance isolée** (ADVE/RTIS/moteurs scopés). Connexion
    mutualisée, **pas fusion** ; aucune fuite de données métier.

### J. Doctrine de croissance (81–86)

81. **Premier principe ?** — UPgraders **industrialise la production de marchés** (une flotte).
82. **Deuxième principe ?** — Les superfans = **base d'ambassadeurs active** (prescripteurs par
    conviction).
83. **L'échelle d'engagement (6 niveaux) ?** — Spectateur → Intéressé → Participant → Engagé →
    Ambassadeur → **Prescripteur/champion** *(« évangéliste »)*.
84. **Le founder dans cette échelle ?** — Le **premier ambassadeur enrôlé**.
85. **Troisième principe ?** — **Coalition de marques leaders** → bascule l'Overton sectoriel
    irréversiblement.
86. **Le client ultime de La Fusée ?** — L'**industrie créative africaine francophone**.

### K. Les arbres (87–93)

87. **Combien d'« arbres » distincts ?** — **Sept** (§12).
88. **L'arbre de vente appartient à qui ?** — **UPgraders** (commercial). Il **vend**.
89. **Il vend La Fusée ?** — **Oui, explicitement** (Cockpit/Oracle) **ET** le reste.
90. **Brand Tree ?** — L'arbre-portfolio d'un **client** (`archétype → DIVISION → PROJET →
    LIVRABLE → INSTANCE`).
91. **L'image-monde ?** — La vue d'ensemble de La Fusée ; l'architecture (7 moteurs) **décide**.
92. **Le substrat de circulation ?** — La « tuyauterie » tracée qui **circule** sans décider
    *(code : Yggdrasil)*. Pas un moteur.
93. **L'arbre de décision de contrat ?** — Un arbre **contractuel** (recours si l'objectif n'est
    pas atteint), pas un script de vente.

### L. La faute, sa correction, le vocabulaire (94–100)

94. **L'erreur de NEFER (2026-06-21) ?** — (a) « ne vends pas La Fusée » ; (b) confondre l'arbre de
    **vente** avec les arbres **internes**.
95. **La consigne correcte au commercial ?** — *« Vends la valeur et l'accès que donne La Fusée
    (Cockpit/Oracle/score) **et** les services UPgraders ; n'expose pas la mécanique interne. »*
96. **`sales-response-tree` est un livrable de marque ?** — **Non** — un outil interne d'aide à la
    vente (type commercial).
97. **Faut-il dire « Neteru » au client ?** — **Jamais.** On dit « les moteurs internes » (ou rien).
98. **Faut-il dire « le Messie » / « évangélisation » au client ?** — **Non** → « figure de proue »
    / « recommandation, bouche-à-oreille ».
99. **Le registre aéronautique (Fusée/Cockpit) est-il religieux ?** — **Non** — c'est la signature
    produit. Il reste.
100. **La règle d'or en une phrase ?** — **UPgraders vend ; La Fusée est le produit-phare vendu via
     Cockpit/Oracle (et il y a d'autres offres) ; on parle business (jamais religieux) au client ;
     et on ne confond jamais l'arbre de vente avec les sept arbres internes.**

---

*Maintenu par NEFER. Provenance : 4 PDF UPgraders (base) + canon opérationnel `ADVE-project` +
canon conceptuel `la-fusee-blueprint` (NAMING_CANON v3.3). Vocabulaire : **business par défaut**,
alias mythologiques entre parenthèses pour traçabilité, jamais exposés au client. Toute correction
de vocabulaire canon doit propager dans les sources de vérité — interdit anti-drift #3.*
