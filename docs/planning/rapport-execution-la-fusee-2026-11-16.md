# Rapport d’exécution La Fusée du 16 novembre 2026

La version **6.27.588 est livrée en production le 16 novembre 2026**, source applicative `c0033985ddbad7e7ae9bfb31ad134874d9081bac`, après reprise de `39423e6` / 6.27.587. Elle apporte la page demandée par Alexandre pour compléter les emails et CinetPay ultérieurement, ainsi que les correctifs de fiabilité décrits ci-dessous. Les réceptions de source, de tests, de production et de métier restent distinctes ; le [plan d’achèvement](achevement-la-fusee-2026-11-16.md) porte le périmètre complet.

## Configuration utilisable depuis la Console

Chemin : **Console → Configuration → Intégrations → Email et paiement**. [Ouvrir la configuration](https://powerupgraders.com/console/config/integrations#email-paiement), sous un compte administrateur.

L’administrateur dispose de deux formulaires indépendants. Il peut enregistrer un brouillon, choisir un fournisseur d’email et un expéditeur, compléter ou remplacer ses secrets et revenir aux valeurs du serveur. CinetPay conserve son adaptateur Aurore v1 : clé API, mot de passe API et mode test ou production. Les lectures masquent les valeurs secrètes ; leur présence, leur source et leur lisibilité restent visibles. L’enregistrement ne déclenche ni email ni paiement et ne certifie pas la connexion au fournisseur.

Les secrets sont chiffrés avec la primitive du coffre existant. La ligne réservée est refusée par les accès génériques de configuration. Les écritures concurrentes email/paiement sont sérialisées ; les paramètres effectifs sont utilisés par les consommateurs existants. [Décision et limites : ADR-0246](../governance/adr/0246-admin-delivery-settings.md).

La recette locale sous une vraie session ADMIN reçoit HTTP 200, une erreur de saisie explicite, la sauvegarde du brouillon et sa conservation après rechargement. Contrôle visuel effectué à 1 440 px et 390 px : aucun débordement horizontal ; aucune exception de page ni réponse serveur 5xx dans la fenêtre observée. Les valeurs utilisées sont fictives et restent dans l’environnement de recette.

## Correctifs réalisés

| Domaine | Défaut établi et correction |
|---|---|
| Contrôle hebdomadaire | Node 20 remplacé par la version de `.nvmrc`. Variables effectives acceptées sans imposer un fichier `.env`. Codes réels des outils pris en compte ; une notification ne masque plus un échec. Recette CLI avec vrais outils et erreurs provoquées. |
| Accès | Console et Launchpad relisent l’identité et le rôle actuels. Le JWT relit aussi l’email avant le privilège du fondateur. Ancien rôle, compte supprimé et identité incomplète refusés ; indisponibilité de la base signalée. |
| Statistiques | Absences conservées, zéro explicite préservé, couverture indiquée. Engagement, clics, CTR et ROAS ne deviennent plus un même score. Provenance déclarée, webhook signé et historique distingués ; secteurs séparés par marché. Les lecteurs gardent les inconnus. L’aperçu des comparaisons ne répartit plus un composite sur huit axes : propres valeurs reçues, moyenne globale qualifiée, rang partagé, distribution comptée et absence de faux historique. |
| Instagram | Insights orientés vers le fournisseur réellement connecté, permissions adaptées, zéro reçu conservé, panne/absence de mesure explicites. Une nouvelle permission nécessite une reconnexion du compte concerné ; aucun consentement fournisseur réel n’est fabriqué. |
| Variation après publication | Le suivi exige le matériel choisi, un paquet relu, un reçu de publication, l’identifiant du réseau et des relevés avant/après la date de publication. Il conserve la preuve d’une variation de marque, sans l’attribuer causalement au média. |
| Médias et Windows | Un fichier public valide était refusé après résolution de son chemin Windows. Le contrôle utilise désormais un chemin relatif natif et continue de refuser les sorties de dossier, y compris une jonction. |
| Vérifications et journal public | Scans de sources portables, chemins et fins de ligne normalisés sans réduire les garde-fous. Les appels Git passent par des arguments distincts. Le journal public réellement vide en production reçoit désormais un snapshot produit avant Docker ; le smoke exige le commit du checkout dans le JSON et le HTML de l’image avant publication. |

## Production et sauvegardes vérifiées

À **18:31 UTC**, la lecture réelle reçoit `/api/version` **6.27.588** et le conteneur portant l’image épinglée `sha-c0033985ddbad7e7ae9bfb31ad134874d9081bac`. Son digest correspond à l’index publié et testé. Le déploiement Coolify `4l9ycd6hsxihrshinz4xmtop` est terminé à 18:28:43 UTC, sur la ressource Docker Image existante ; aucune compilation n’a été lancée sur le VPS.

Les **108 migrations** sont appliquées sans échec. Comptes préservés : 31 utilisateurs, 69 stratégies, 544 piliers, 521 sources, 2 329 actifs, quatre tâches génératives, quatre versions matérielles, 23 connexions sociales et 47 posts. Le volume privé existant reste monté en lecture/écriture sous `nextjs` et les trois clés de restauration sont identiques à la sauvegarde. Aucun réglage de livraison n’a été écrit dans la base de production. L’accès administratif temporaire utilisé pour la bascule est révoqué.

La recette Chrome anonyme de production reçoit `/login`, `/status` et `/changelog` HTTP 200, zéro exception JavaScript, zéro réponse 5xx et zéro requête échouée dans la fenêtre observée. Journal HTML et JSON contiennent `c003398`. La configuration anonyme reçoit HTTP 307 vers la connexion. Les formulaires sous rôle ADMIN ont été exercés en recette locale ; les contrôles de production portent sur l’accès public non connecté.

Avant la bascule, sur la fenêtre glissante de sept jours relue le 16 novembre, **sept types d’opérations sont mesurés et tous respectent leurs seuils**. Les opérations IA historiques en dépassement ne sont pas présentes dans cette mesure ; ce reçu ne les qualifie pas et ne mesure pas toute la capacité du produit.

Une sauvegarde privée de la base (~153 Mo), des médias (~3,3 Go) et des clés de restauration a été créée sur l’hôte. La restauration dans un PostgreSQL isolé avec l’extension `vector` retrouve 69 stratégies, 544 piliers, 2 329 actifs, 521 sources et 108 migrations. Comparaison des médias restaurés à l’archive reçue ; **3 132 objets sur 3 132 authentifiés au déchiffrement**, zéro échec. Le premier essai avec PostgreSQL sans `vector` a été refusé, puis repris avec l’image adaptée.

Les deux volumes persistants La Barre ont aussi été sauvegardés et restaurés : quatre fichiers de dépôt, dont trois JSON valides, et 2 140 fichiers de revue ; octets identiques aux archives. Les conteneurs de restauration n’ont aucun accès réseau extérieur. Ce reçu est un exercice sur le même hôte : la copie hors hôte, le délai de service contractuel et la reprise de toutes les applications clientes restent des réceptions distinctes.

La copie hors hôte est lancée vers un dossier local à accès restreint. **Six fichiers sur huit sont reçus et vérifiés SHA256**, dont le dump de la base, les clés de restauration, les manifestes/reçus et l’archive des dépôts La Barre. Les médias privés et la grande archive de revue La Barre restent en transfert au dernier contrôle. Le débit cumulé mesuré est d’environ 241 ko/s, même avec plusieurs connexions : un processus privé masqué poursuit la copie, la reprise des fragments, l’assemblage et les contrôles de source, de SHA256 et d’accès. La copie complète reste ouverte tant que son reçu final ne confirme pas les huit fichiers ; le démarrage du processus ne la clôt pas.

Le diagnostic des accès CinetPay a été corrigé : ses deux identifiants requis sont présents et conservés sur le serveur ; un identifiant de site n’est pas utilisé par cet adaptateur. Le serveur associe actuellement une clé marquée Live au point d’entrée de test : la garde de production maintient CinetPay « non configuré ». Le choix d’un mode cohérent reste à faire dans la nouvelle page ; l’approbation marchande et le paiement réel gardent leur recette distincte. Aucun fournisseur ni expéditeur d’email système n’est configuré ; leur saisie est reportée par décision d’Alexandre. Aucun envoi ou paiement réel n’a été déclenché par la recette.

## Vérifications du code livré

Source applicative : **`c0033985ddbad7e7ae9bfb31ad134874d9081bac`**. Les journaux complets, captures et données de recette restent hors du dépôt.

- [CI 43926006495](https://github.com/xtincell/ADVE-project/actions/runs/43926006495) : **6 168 tests unitaires dans 618 fichiers**, **870 tests PostgreSQL dans 69 fichiers** et **cinq tests supplémentaires du reçu de publication sociale**, tous verts. Neuf jobs exécutés réussissent ; trois gardes réservées aux PR sont ignorées sur le push direct. Typage et lints passent ; gouvernance sans erreur avec 42 avertissements historiques, aucun cycle sur 1 923 fichiers.
- [Contrôle hebdomadaire 43926011762](https://github.com/xtincell/ADVE-project/actions/runs/43926011762) : **17 contrôles réussis, zéro échec, 11 avertissements** ; 13 scénarios CLI de verdict reçus, rapport conservé. Le premier essai avait correctement propagé un arrêt par manque de mémoire et créé l’issue 1205. Le budget mémoire aligné sur la CI reçoit la reprise verte ; l’issue est fermée.
- [Audit de mission 43926006727](https://github.com/xtincell/ADVE-project/actions/runs/43926006727) : 120 manifestes, 610 capacités, aucune dérive. [Chromatic 43926006534](https://github.com/xtincell/ADVE-project/actions/runs/43926006534) passe sans publication, faute de jeton configuré ; aucune validation visuelle distante n’en est déduite.
- [Image 43926887453](https://github.com/xtincell/ADVE-project/actions/runs/43926887453) : construction et publication reçues. PostgreSQL neuf, migrations, `/login` HTTP 200 en six secondes, session JSON, commit attendu dans le journal JSON **et** HTML, JSDOM avec VM native et lecture d’un PDF de deux pages reçus avant publication. Le manifeste applicatif testé est identique à celui poussé ; l’index publié est `sha256:46c5c3f3b1b1ac065dbcca196fdf259a6a78ec810079a698f9e1335e864d5acf`.
- Neuf écrans ouverts dans Chrome sous session ADMIN locale sur la version compilée : HTTP 200, zéro exception JavaScript, zéro réponse 5xx et aucun débordement horizontal dans la fenêtre observée. Configuration et comparaisons examinées à 1 440 et 390 px ; captures lues. Les neuf tests de rendu des mesures comprennent huit contre-épreuves rouges sur les anciennes pages, puis passent après correction. Les tests du journal exercent aussi un checkout superficiel et le rendu sans Git.
- Audit des dépendances de production : zéro alerte lors de la mesure du 16 novembre. Les recettes ciblées de droits, chiffrement, indépendance/concurrence des formulaires, rotation CinetPay, publication, mesures et fichiers Windows font partie des suites reçues ci-dessus.

Les premières passes ont révélé des défauts d’environnement et de test, puis des défauts supplémentaires corrigés : séparateurs Windows, exécutables shell absents, chemins de médias refusés, fixture email non adaptée aux réglages et projections graphiques présentées comme des comparaisons. Les scénarios simulés ne valent pas publication, paiement ou réception client réels ; l’aperçu de comparaison demeure interne.

**La base de recette n’est pas vidée.** Quatre anciennes suites conservent certaines fixtures : cette passe ajoute cinq utilisateurs fictifs, quatre opérateurs fictifs, dix stratégies et vingt sources de test, en plus de résidus antérieurs. Aucun actif, média social, version matérielle, tâche générative ou relevé de CultIndex ne demeure au contrôle final. Le nettoyage par identifiants propres à chaque suite est planifié dans [RESIDUAL-DEBT](../governance/RESIDUAL-DEBT.md), sans purge globale. Aucune donnée de production n’est modifiée par cette recette.

## Travail restant pour recevoir le fonctionnement complet

| Travail | État et condition de clôture |
|---|---|
| Formes ADVE historiques | L’inventaire réel relu reste à 263 piliers refusés par le schéma strict sur 274 examinés ; 546 valeurs refusées sont comptées présentes par la maturité. Cela décrit une incompatibilité de forme, pas la fausseté de toutes ces données. Préparer les correspondances sémantiques par famille, conserver sources/versions et faire trancher les ambiguïtés avant admission et cascade. |
| Oracle, Playbook et calendrier | Recevoir les éditions courantes sur les dossiers retenus, leur fraîcheur, leurs exports et leur acceptation. Les anciens reçus, dont Oracle 540, restent acquis à leur périmètre. |
| Production et diffusion | Recevoir les versions DA/texte réellement transmises, les fichiers image/vidéo/audio demandés, leur remise et les publications autorisées. Quatre tâches et quatre versions matérielles terminées sont présentes en production ; cela ne valide pas toute la chaîne créative. |
| Comparaisons de marques | Les endpoints actuels couvrent les stratégies actives, tous secteurs confondus. Leurs moyennes ne permettent pas une répartition par axe ni un groupe sectoriel comparable. Conserver l’aperçu interne et recevoir des groupes de comparaison explicites avant exposition client. |
| Services externes | Compléter l’email dans la page demandée, reconnecter les comptes nécessitant de nouvelles permissions et recevoir les opérations réelles des fournisseurs retenus. Aucun message ou paiement réel n’est émis par la recette de configuration. |
| Cycle commercial | Reprendre les offres déjà approuvées et les parcours existants, puis recevoir règlement, ouverture des droits, remise et confirmation du client. Le rail manuel ne dépend pas de la saisie d’un fournisseur de paiement supplémentaire. |
| Exploitation étendue | Recevoir copie hors hôte, charge, coût rapproché des factures et continuité du service annoncée. Les tests de panne, de rôle et de reprise ne constituent pas une mesure du résultat commercial. |

### Reprise ADVE préparée, sans modification des marques

Les 2 691 chemins se répartissent en **708 valeurs présentes incompatibles** (27 formes de conteneur, 182 types, 353 valeurs de taxonomie, 146 longueurs/cardinalités), **1 422 absences avec clés voisines** et **561 absences simples**. Ce ne sont ni 2 691 dossiers ni autant de conversions automatiques.

| Famille | Relevé et reprise structurelle | Points à faire trancher sur les sources |
|---|---|---|
| A — 738 chemins | 40 piliers portent des clés d’intake plates ; reprendre seulement une correspondance exacte et conserver original/provenance. | Valeurs Schwartz, archétype, récit et qualifications de l’équipe. Aucun texte complété pour atteindre une longueur minimale. |
| D — 467 chemins | 38 piliers avec clés plates ; reprendre positionnement/promesse sans écraser les formes compactes déjà admises. | 13 parts de marché textuelles, deux références de persona incompatibles et contraintes de cardinalité. Conserver unité/période et remapper toutes les références si une identité change. |
| V — 671 chemins | 37 piliers avec clés plates ; convertir un nombre seulement si unité et période sont univoques. | 20 prix textuels, coûts/marges/CAC/LTV inconnus, fourchettes, « sur devis », HT/TTC et cycles de vie. Ne pas transformer l’inconnu en zéro. |
| E — 815 chemins | 41 piliers avec clés plates ; corriger seulement les graphies strictement équivalentes dans la taxonomie. | 40 types de touchpoint incompatibles, rôles/stades/niveaux manquants et 11 fréquences KPI. Un canal ne permet pas de déduire un rôle, un stade ou un résultat observé. |

Ordre de reprise : figer un dossier pilote et l’édition de ses sources, traiter les correspondances exactes puis les conteneurs, faire arbitrer les types/taxonomies/longueurs ambigus, admettre les changements par le gateway avec version attendue, puis relire forme, maturité et affichage avant cascade. Neuf liaisons de sources demandent une réconciliation entre reçu et édition actuelle. Les correspondances de questions existent dans `quick-intake/salvage-responses.ts`, mais ce service produit aussi des objets partiels et des découpages/troncatures : il ne constitue pas une migration historique à relancer en bloc. Le bornage strict de la maturité concerne encore S ; son extension à ADVE reste une réception distincte.

Le premier chemin métier à recevoir reste **dossier normalisé → stratégie courante → livrable accepté → fichier matériel → remise/publication → observation → décision suivante**, puis les autres dossiers actifs et rôles. La nouvelle page rend la configuration ultérieure possible ; elle ne remplace pas ces décisions et leurs preuves.
