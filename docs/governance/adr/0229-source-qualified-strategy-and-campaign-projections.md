# ADR-0229 — ADVE qualifié, projections S et cadres de campagne

**Status** : Proposed — 528 reçue au périmètre tracé ; lisibilité 529 et chaîne complète à recevoir
**Date** : 2026-11-02
**Phase** : 7 — continuité des sources vers stratégie et cadres de campagne
**Depends on** : ADR-0023, ADR-0088, ADR-0089, ADR-0119, ADR-0120, ADR-0228
**Supersedes** : aucun ; complète le contrat préférences/scénarios sans modifier ses réceptions


## Chaîne de référence — correction opérateur prioritaire

**Documentation + inputs des parties prenantes → ADVE qualifié → RTIS dérivé.**
La documentation riche doit garantir un ADVE complet ; l’ADVE complet doit
garantir le RTIS complet. **Si une information nécessaire ne peut être déduite de
l’ADVE, c’est l’ADVE qui doit être mis à jour.** Identifier le champ amont et
réconcilier le socle avant recalcul ; conserver les travaux existants pendant
cette mise à jour. C’est un contrat de fonctionnement à recevoir sur
l’intégralité de la chaîne, pas une promesse déjà obtenue ni une complétude
mesurée au nombre de champs, KPI ou cartes. Un champ ADVE absent alors que
l’information est disponible dans les pièces signale un défaut d’absorption,
qualification ou irrigation à corriger ; il ne justifie pas un second socle RTIS.

Après qualification du socle, les pièces consultées dans RTIS servent surtout
au contrôle d’alignement, à l’explication et à la traçabilité. Une nouveauté
structurante ou un desideratum doit remonter en proposition d’amendement ADVE,
être traité par les décisions/writers gouvernés, puis irriguer la cascade. Il ne
doit pas alimenter directement I ou S pour contourner l’absence d’un champ ADVE.

Faits/mesures, hypothèses/desiderata et décisions adoptées restent distingués.
Un input de partie prenante porte auteur, date, périmètre et statut ; l’attribution
ne vaut ni vérité observée ni décision adoptée. Les pièces, propositions et reçus
existants suffisent à ce contrat, sans nouveau modèle stakeholder ou base miroir.

## Réception courante 528 et amendement candidat 529

528 est reçue en production, source `ad6f9b8b0667085aba3e25dd3f5d0eb21e2d2c35`,
digest `50deb3e2899707a58cf071b33dabac64c0323abf4c8374fcdd22ee6715194f91`.
Contenu métier comparé conservé exactement ; seuls les diagnostics E dérivés de
validation ont été recalculés. Réconciliation E via Agent et recalcul S reçus ;
les sources de cet amendement restent PROPOSED, sans adoption humaine fabriquée.
La lecture native 528 constate une définition North Star perdue dans S, une
prose dense et des campagnes encore à qualifier. Les preuves métier restent
privées hors checkout. Cette réception ne reçoit ni ADVE entière ni le MVP.
La lecture native 528 de la section 16 d’Oracle reçoit définitions,
qualifications et inconnues conservées ; elle ne reçoit pas Oracle entier,
dont les analyses restent périmées.

Le candidat 529 conserve la définition de l’unique North Star explicitement
nommée parmi E.kpis, même avec cible/fréquence nulles. Le dashboard S continue
d’exiger nom, cible et fréquence. Les candidates multiples restent ambiguës ;
une seule cible chiffrée ne suffit pas à arbitrer entre elles. Définition et
métadonnées ne deviennent ni mesure ni décision ; les inconnues renvoient à E.

La roadmap conserve objectif et actions sans coupe à 200 caractères ni limite
courte de schéma ; les seuils de cardinalité restent inchangés. L’UI S propose
une largeur de lecture utile, de vraies listes d’actions/FCS, détails de définition /
fenêtre / contexte / source au clavier et suivi visible sur mobile. L’état
« mesure non disponible » reste un affichage, sans mutation du socle.
Contrôles locaux 529 reçus : 5 034 unitaires / 481 fichiers, PostgreSQL
527 tests / 32 fichiers, tsc exit 0, lint et lint:governance sans erreur
(24 avertissements préexistants), cycles sans dépendance circulaire. Le premier
lancement PostgreSQL visait une configuration inexistante : erreur de commande
conservée, puis suite complète verte avec la bonne configuration ; aucun défaut
produit déduit. Build complet reçu exit 0. HTTP compilé sous USER reçu sur la
fixture synthétique 528 existante, sans rejouer ingestion ou amendement : refresh S
259 ms, assemblage 96 ms ; North Star définie avec cible/cadence nulles conservées,
six objectifs complets / sept définitions, autres sept piliers, dates et exécution
inchangés. Deux pages HTTP 200 en 246 / 38 ms ; hydratation/UI non reçue, cible
navigateur locale précédemment refusée sans contournement. Mesures locales sans
SLO ; natif, CI/image/runtime 529 encore ouverts.

Les titres/slugs de campagne, qualification réelle ADVE entière puis cascade,
devis et MVP gardent leurs lots ouverts. Aucun nouveau modèle, routeur, service,
Intent ou gestionnaire d’appels ; ADR Proposed pour la chaîne entière.
Le checkpoint 528 suivant décrit les réceptions locales antérieures à sa livraison.

## Réception courante et qualification candidate 528

527 est reçue en production, source `79c912dd1a6dff7475ff5883dbe27d6c1e6d081f`,
digest `9886144552a2f473b5661846d8695d628a3976d553095ac2bf358abbe4c62e80`.
Conservation comparée, actualisation S seule et lecture native de la roadmap
reçues ; exécution non armée. Les objectifs hérités des données initiales ne
sont pas validés sémantiquement par cette réception. Preuves métier privées
hors checkout ; les checkpoints locaux 527 ci-dessous restent historiques.

Le candidat 528 accepte une définition E.kpis avec target/frequency nulls sans
faire compter ces lacunes complètes. La cible peut être textuelle ou numérique
finie ; un zéro documenté reste zéro. Qualification PROPOSED / DECLARED,
definition, unit, observationWindow, targetContext et sourceNotes conservent les
limites de la source. Une fenêtre n’est pas une fréquence, une cible future
n’est pas une mesure, une proposition n’est pas une adoption humaine.

S ne projette que les objectifs dotés de nom/cible/fréquence, avec leurs
métadonnées et leur qualification lorsqu’établies, y compris pour une North Star
unique explicitement nommée. Oracle conserve les définitions E, même sans cible
décidée, plutôt que ranimer des objectifs S antérieurs. Les lecteurs présentent
la qualification et les lacunes ; l’indication de mesure indisponible relève de
l’affichage, sans valeur mesurée ajoutée au socle.

Notoria partage ce contrat ADVE/docs/inputs attribués au-delà de I et retire
quotas minimaux et injonctions de remplir toutes les cellules. Une lacune doit
être expliquée et réconciliée via les propositions/amendements ADVE existants,
puis cascade ; aucun socle RTIS parallèle, modèle, routeur, Intent ou provider
nouveau. La qualification et la complétude de toute la chaîne restent à recevoir.
Contrôles locaux finaux reçus : 5 032 unitaires / 481 fichiers, PostgreSQL
527 tests / 32 fichiers, typage vert, lints sans erreur (24 avertissements
préexistants), cycles sans dépendance circulaire. HTTP local reçu sur fixture
privée : ingestion PROPOSED sous USER, amendement ADVE attribué Agent puis S et
Oracle avec définition, unité, fenêtre, contexte, notes et qualification conservés.
Définitions incomplètes et objectifs qualifiés restent distincts ; autres piliers,
dates et exécution préservés, aucune mesure ou adoption humaine inventée.

MCP passe par une fixture ADMIN existante ; l’énumération d’outils refusée au USER
simple reste la politique. Première recette interrompue sur cette attente erronée
avant amendement, puis reprise documentée sans rejouer les uploads, créer une clé
ou découvrir un défaut produit. Latences locales observées seulement, aucun SLO
production. Natif, CI/image/production 528 et réconciliation réelle restent à
recevoir ; ADR Proposed pour la chaîne complète.

## Contexte

La 526 reçue en production compose trois scénarios et distingue les préférences
de l’exécution. La 527 reçoit les projections des champs E.kpis et
A.equipeDirigeante ; elle ne reçoit pas la validité sémantique des objectifs
hérités ni S complète. Les initiatives réelles n’ont pas toutes une famille de
campagne, une cadence, une période de coût ou des bornes qualifiées.

Additionner un coût mensuel à un coût ponctuel, réduire une fourchette à un point
ou assimiler LONG_TERM à ALWAYS_ON produit une fausse précision. Lire les seules
BrandAction.selected pour préparer les cadres recrée un autre jeu d’actions que le
scénario S. Le candidat étend les projections et règles existantes ; aucune
nouvelle entité Prisma, top-level S, route, Intent ou chaîne d’appels n’est requise.

## Décision proposée

### 1. Dériver depuis ADVE, contrôler les sources sans socle alternatif

Le composeur S existant reprend les cibles de E.kpis seulement si nom, cible et
fréquence explicite sont disponibles. Ce sont des objectifs, pas des mesures.
North Star n’est repris que si une unique entrée le nomme explicitement ; ni
premier KPI choisi par position, ni résolution implicite de deux candidats.
A.equipeDirigeante nourrit l’équipe déclarée quand ses champs sont renseignés,
sans transformer une fonction en owner d’action ou inventer une responsabilité.
Les recommandations prioritaires viennent des actions du scénario I retenu.

Les prompts existants de I partagent un contrat d’alignement avec le socle ADVE,
sans nouvel appel. La recherche Notoria vise campagnes, horizons, cadences et
budgets, pas la seule lettre « i » ; les résultats contrôlent la concordance et
identifient les lacunes du socle. Ils ne remplacent pas ADVE. Reprendre les éditions
courantes ; le GTM archivé de juillet n’est pas le plan actuel. Si l’information
structurante manque au socle, proposer sa qualification/écriture ADVE gouvernée
avant la cascade. Une ancre MEDIUM n’est pas injectée en cas d’absence. Une
annotation I manquante ne devient pas une campagne réelle par capacité du lecteur.

### 2. Distinguer horizon, famille, cadence et période monétaire

Champs optionnels I dérivés du socle qualifié, conservés jusqu’à normalisation,
routes et matérialisation :
`budgetRange`, `budgetPeriod`, `campaignCanonType`, `cadence`. Ils étendent le JSON
existant, pas une nouvelle SSOT. Familles existantes : GTM_90, ANNUAL, ALWAYS_ON,
PUNCTUAL ; cadence de répétition et horizon de stratégie restent distincts.
LONG_TERM n’est pas une preuve d’ALWAYS_ON. Les fallbacks de classification doivent
rester identifiables ; une classe inconnue reste à qualifier.

La roadmap peut grouper par famille et cadence documentées, avec les mêmes IDs
que le scénario. Ne pas inventer des dates, des owners, une récurrence ou un nombre
d’occurrences pour remplir des groupes. Sans date choisie, les créations de cadres canon
gardent startDate/endDate nulles ; une suggestion d’interface n’est pas
un calendrier accepté. Un programme ponctuel reste lié à son
cadre explicite existant s’il est cohérent ; sinon refus avant matérialisation.
Le générateur des trois cadres ne reçoit pas à lui seul tout le flux ponctuel.

### 3. Préserver les bornes et les unités des budgets

Une fourchette conserve minimum et maximum ; ni midpoint ni borne haute choisie
comme enveloppe. Les montants sont groupés par période monétaire déclarée :
ponctuel, par occurrence, mensuel, trimestriel, annuel ou période à préciser.
Ne pas annualiser sans nombre de périodes ; cadence ne fournit pas ce nombre.
Un montant mensuel et une dépense ponctuelle ne sont pas une somme scalaire de plan.
Le total top-level reste absent lorsque les sources sont inconnues, en fourchette
ou non comparables ; les groupes et limites demeurent lisibles. Zéro sourcé reste
zéro, budget inconnu n’est pas gratuit. Aucun devis importé n’est reçu dans ce lot.

### 4. Préparer les cadres depuis le scénario, préserver les engagements

Le canon lit S frais, route calculée et ensemble d’IDs I correspondant ; il ne
reconstitue pas sa sélection depuis les seules lignes `selected=true`. Une route
absente, périmée ou non réconciliée refuse/diffère avant écriture.
Le budget conseillé vient des coûts comparables du jeu source ; ni part de
budget de template ni multiplicateur de tier ne peut les modifier. Il reste
nullable. Conseillé ne devient pas budget adopté : préserver budget existant,
campagne live et programmation déjà reçue. Un refresh de proposition ne planifie
pas des dates en silence ; date choisie et simple suggestion restent distinctes.

La validation créative vérifie l’ensemble, ses cadres et classifications avant
de matérialiser ou rattacher ; l’inconnu ou le ponctuel sans cadre cohérent rend
un refus, pas une campagne générique fabriquée. L’accord de production explicite
et les gates actuelles restent requis ; la préférence ou le calcul S n’active rien.

## Conséquences et réceptions à recevoir

ADVE qualifié puis RTIS dérivé alimentent les cadres ; les pièces contrôlent
l’alignement, sans coût remodelé ou calendrier fictif. La contrepartie est de rendre les absences et unités visibles ; elle ne
justifie pas de forcer 100 % par des defaults. Les premiers refus de tests/typage
sont conservés ; le ciblé suivant reçoit 58 tests / 7 fichiers, gauntlet en cours.
Aucune réception finale 527 de contrôle, API/UI, CI ou production n’est annoncée. Les réceptions 526 restent attribuées à 526.

Vérifier avant livraison : sources KPI/équipe et ambiguïté North Star ; annotations
I conservées dans tous les lecteurs ; fourchettes/périodes sans faux scalaire ;
scénario frais/IDs exacts vers cadres ; budget adopté/live préservé ; refus créatif
avant effet sur classification inconnue ; ponctuel lié à un cadre existant cohérent
ou refusé ; dates explicitement choisies et propriétaires non inventés.

Le pont roadmap/campagnes S → La Barre reste non reçu : son brand-context courant
lit ADVE. Raccorder ensuite une projection minimale, sourcée et gouvernée au
circuit projet/campagne existant, sans exposer tout S ou doubler une base.

Reste métier : reprendre les éditions courantes SPAWT et les inputs attribués,
qualifier les informations structurantes dans ADVE via propositions/writers
existants, puis dériver et versionner les annotations I manquantes et recevoir
la cascade/les lecteurs réels. Ne pas compléter I directement depuis les documents
en contournant ADVE. Catégories de coûts, raccord devis et
calendrier opérationnel restent des lots à recevoir. Aucun S entier, Oracle
complet, MVP ou chantier global accepté par cette décision Proposed.

## Réception locale au 2 novembre — chaîne et production encore ouvertes

Réception locale527 : 5022 unitaires/480fichiers verts ; PostgreSQL526/32 puis39/1 dont un nouveau cas de bornes/cadence/période. Typage, deux lints sans erreur (24avertissements préexistants), cycles et build reçus. Stress compilé :276pages reçues,5non reçues,0échec ; trois requêtes en lecture,sept forges/transitions,0finding. Les passes HTTP sautée/interrompue sont conservées hors réception. USER réel sur copie privée : six cibles KPI, NorthStar et trois profils A→S, autres piliers et exécution/dates conservés, mêmes références dans roadmap/Oracle ; HTML200, pas de réception native. P23 source527-gauntlet-received.json et source527-http-received.json. CI/image/runtime527 et complétude ADVE/RTIS/MVP restent ouverts.

Le roster A conserve désormais la contribution facultative `responsabilites`.
Le lecteur S reprend cette contribution, ou le profil `bio` déjà renseigné dans A,
sans exiger une seconde description ni affecter une action à une personne.
Les tests sont synthétiques dans le dépôt public ; les données du dossier réel
restent dans les preuves privées.

La recherche documentaire ADVE est également qualifiée par les thèmes métier de
chaque pilier (fondation/équipe, personas, économie, engagement), au lieu des
lettres de stockage. Même lecteur scopé/versionné, aucune voie parallèle de
qualification ou d’amendement. Cette correction soutient la mise à jour amont.
