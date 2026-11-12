# ADR-0231 — Complétion ciblée et provenance sous un objet validé

**Status** : Proposed — candidat 531 après main, réceptions combinées et chaîne ouvertes
**Date** : 2026-11-02
**Phase** : 7 — complétion ADVE et irrigation qualifiée
**Depends on** : ADR-0023, ADR-0032, ADR-0172, ADR-0229
**Supersedes** : aucun ; étend le grain des origines sans réécrire les décisions passées

**Amendement doctrinal du3 novembre2026** : [ADR-0236](0236-inferred-premises-and-brand-verification.md)
remplace la protection d’un vide conceptuel comme choix définitif par une
proposition INFERRED utilisable, à vérifier par le responsable de marque. Les
règles et réceptions ci-dessous restent attribuées à leur état antérieur ; les
valeurs remplies, preuves et garanties de version/provenance restent protégées.

## Contexte

Le candidat 531 reprend le correctif ADVE du candidat 530 après intégration
de main `4b09965aae5b5ac9ec59367c0f9ff3ca95f5fea2` (CRM #1114 et version #1115).
La livraison commerciale 530 et son ADR0230 sont conservés ; la provenance
ciblée est désormais ADR0231. PR réelle : #1116, branche
`fix/adve-completion-irrigation530`. Tous les reçus 530 ci-dessous sont
préintégration. Réception combinée 531 reçue : 5 092 unitaires / 485 fichiers,
PostgreSQL sérialisé 534 tests / 33 fichiers en 260,45 s, build exact UI exit 0,
lint et gouvernance sans erreur (24 avertissements préexistants). Timeout initial
et marge du grand document restent tracés, sans réception sous charge.
HTTP compilé : USER intake/lecture/S, MCP via ADMIN existant séparé, garde USER
préservée ; amendement 249 ms, refresh 213 ms, assemblage 163 ms. Source PROPOSED,
feuille INFERRED, parent HUMAN, voisins, autres piliers et exécution conservés ;
ratio calculé depuis les prémisses synthétiques. Pages HTTP 200 en 308 / 155 ms,
hydratation/native non reçue, latences locales sans SLO.
Stress compilé exact exit 0 : 276 pages HTTP reçues / 5 non reçues / 0 échec,
3 requêtes, 7 forges/transitions, 0 finding ; aucune réception native par ces probes.
Arbres source du CRM en production et de main comparés identiques ; contenu CRM
conservé. CI/image/runtime 531, chaîne réelle ADVE/RTIS et MVP toujours ouverts.
Le numéro 0230 commercial est conservé intact ; ce contrat a été renuméroté
0231 après collision de numéros. La rubrique « Réceptions 530 préintégration »
plus bas conserve son dernier delta d’origine ; les contrôles combinés 531 ne
sont pas déduits de ces preuves antérieures.

Un objet ou catalogue validé HUMAN peut encore contenir une cellule vide. Une
protection au seul champ de tête bloque alors tout complément, tandis qu’un
retag global peut faire passer une nouvelle inférence pour une décision humaine.
À l’inverse, un remplacement complet pourrait effacer une feuille protégée sous
un parent moins autoritaire. Les identités de tableaux, les valeurs voisines et
l’origine propre de chaque complément doivent être conservées ensemble.

Le contrat de réception est ADVE rempli ⇒ aucune valeur attendue vide ou inconnue
en aval. La construction du modèle suit source documentée → calcul → postulat
de départ inféré dans ADVE, puis calcul des dépendances. Un brouillon peut
conserver ses lacunes ; leur présence interdit de recevoir sa complétude. Un
postulat justifié reste une proposition avec unité, périmètre, dépendances et
origine ; il ne devient ni mesure, fait biographique, devis réel ou adoption.

## Décision

### Écrire un chemin exact, sous une version attendue

Étendre les chemins et la gateway existants. Seul un SET_FIELDS porteur de
expectedVersion ouvre le traitement ciblé sous un objet protégé. Reconstituer
le candidat depuis le contenu antérieur et les seuls chemins déclarés. La gateway
ne retient que les chemins canoniques dont la valeur passe getFieldZod.safeParse ; toute
modification collatérale, identité ajoutée, suppression ou réorganisation de
collection sort de ce traitement. Les conteneurs et éléments ciblés doivent
exister : aucune nouvelle identité ou index creux par un complément inféré.

Le complément ciblé accepte seulement un scalaire non vide ou une liste non
vide de scalaires ; objet et liste de records suivent la revue normale, car ils
peuvent introduire des identités. Une cellule manquante est distincte d’un choix
rempli : zéro, false et collection vide restent des valeurs à arbitrer selon
HUMAN > SOURCE > INFERRED > UNKNOWN. Les propositions respectent le schéma canonique et les gardes existantes.
Les compléments conservent une origine explicite au chemin exact : INFERRED
pour une déduction/postulat, SOURCE seulement selon les reçus documentaires.
Le parent HUMAN et les cellules voisines gardent leurs valeurs et leurs origines.

### Lire et confirmer au même grain

Le lecteur d’origine retient l’ancêtre explicite le plus précis, après retrait
du préfixe legacy pour comparer les chemins. Une cellule
INFERRED sous un parent HUMAN reste donc à confirmer ; le statut du parent ne
la valide pas. La sérialisation du contexte expose les origines des compléments.
La confirmation opérateur est versionnée, vise la cellule inférée exacte et ne
confirme aucune sœur ; elle ne change pas le contenu de la valeur confirmée.
Les formes legacy sans origine précise gardent leur résolution antérieure.

Un remplacement global ou une suppression reste soumis aux enfants protégés.
Une origine moins autoritaire ne peut les écraser ou transférer leur autorité
à un autre occupant d’un tableau, même si un scalaire semble identique.
La protection couvre aussi les origines sans changement de valeur : redéclarer
INFERRED un parent inchangé ne retire pas l’origine HUMAN d’une de ses cellules.

### Revoir les compléments sans confondre affichage et autorité

Le candidat 531 lit les valeurs de revue avec resolvePillarPath, y compris les
feuilles d’objet/tableau. « Lire la valeur entière » réutilise FocusModal ;
« Revoir l’ensemble » indique que l’éditeur existant porte le parent, alors que
la confirmation « Valider » vise toujours la seule cellule inférée.
makeStatusFor dérive les badges de présentation « Compléments proposés » ou
« Informations complétées » pour le parent d’origines mixtes. Ces badges ne
modifient ni fieldStatusFor d’autorité du writer ni les origines persistées.

Quatre cas UI ajoutés ; ciblé DS/vocabulaire/domain 30 tests / 6 fichiers reçu
avant le dernier ajustement de préfixe d’affichage. Contre-épreuve de lecture
racine rouge puis restauration verte 4 / 1 reçue ; aucune réception native déduite.
Suite combinée antérieure à l’UI : 5 088 unitaires / 484 fichiers verts. Premier
PostgreSQL 533 / 534, timeout 120 s conservé ; reprise entière sans compilation
concurrente ni changement de limites : 534 tests / 33 fichiers verts en 260,45 s.
Grand document en 111,86 s sous 120 s, marge de 8,14 s seulement ; profilage après
gros œuvre dans RESIDUAL-DEBT, aucune réception sous charge. Suite finale UI
5 092 / 485, build exact, HTTP et stress compilés reçus au périmètre ci-dessus ;
natif, CI et production restent ouverts.

### Un chemin canonique et un succès réellement persisté

L’implémentation pure de chemin vit dans domain ; lib conserve un re-export de
compatibilité. Gateway, amendement, lecteurs et confirmation partagent résolution
des objets/tableaux et protection des segments dangereux, sans parser parallèle.
L’auto-filler propose des SET_FIELDS exacts avec expectedVersion et provenance
par chemin ; les valeurs IA sont contrôlées contre leur schéma canonique. Il
compte uniquement les valeurs effectivement conservées par la gateway, et ne
pose pas de certitude INFERRED pour une proposition refusée/non persistée.

Notoria, Mestor/cascade, auto-filler et quick-intake réutilisent le contrat commun
source → calcul → postulat ADVE. Toute prémisse manquante remonte au socle avant
dérivation RTIS ; aucun second modèle documentaire ou moteur d’appels.

## Conséquences

La validation d’un objet cesse de masquer le grain de ses compléments. En
contrepartie, un lot concurrent ou une modification collatérale doit être refusé,
puis rechargé ; une proposition ne peut pas contourner le parcours gouverné par
un remplacement complet. Ni complétude structurelle ni marque HUMAN héritée ne
prouve une mesure ou une adoption de tous les postulats.

Réceptions 530 préintégration, avant le dernier delta : 5 082 unitaires / 483 fichiers, maxWorkers 4 sans
restriction de périmètre ; PostgreSQL 528 tests / 32 fichiers puis 53 ciblés /
3 fichiers. Typage exit 0, lints sans erreur (24 avertissements préexistants),
cycles sans dépendance circulaire et reconstruction webpack finale exit 0.
Premier refus Turbopack sur symlink externe conservé, symlink inchangé. Quatre
contre-épreuves rouges puis restaurées vertes : chirurgie, contrat, parent inchangé
et bornage scalaire.

HTTP compilé reçu sur fixture synthétique : document PROPOSED sous USER, MCP via
ADMIN existant séparé, amendement puis S et Oracle ; source PROPOSED, feuille
INFERRED et parent HUMAN conservés. Le ratio calculé suit les prémisses du modèle,
sans le présenter comme observation réelle ou adoption humaine. Refus de
découverte MCP sous USER conservé : première recette arrêtée, reprise sans
réingestion ni droits créés/élargis. Pages HTTP 200, hydratation/native non reçue ;
ancienne cible locale refusée sans contournement. Mesures de latence locales,
aucun SLO. Stress compilé terminé exit 0 : 276 pages reçues / 5 non reçues /
0 échec, 3 requêtes, 7 forges/transitions, 0 finding ; probes HTTP distinctes de
l’interface native. Données métier et preuves privées hors checkout.

Dernier delta, après ces build/HTTP/stress : l’origine la plus précise est
comparée après retrait du préfixe legacy, afin qu’un parent préfixé HUMAN ne
masque pas une cellule INFERRED. Ciblé final 54 tests / 3 fichiers verts,
contre-épreuve rouge puis restauration verte 16 / 1. Le parcours HTTP aux chemins
nus reste reçu pour l’état précédent ; aucun build/HTTP/stress exact de ce
nouveau head annoncé. CI/image/runtime exacts et chaîne réelle encore requis.

Tests anti-drift concernés : field-provenance, pillar-provenance-guard,
brand-source-single-index et amend-source.postgres. Revoir aussi le refus des
remplacements/suppressions, les identités et valeurs voisines, versions périmées,
valeurs IA non conformes et comptage sur contenu effectivement persisté.
Ce contrat ADVE n’ajoute aucun modèle Prisma, routeur, service, Intent, provider
ou gestionnaire d’appels ; aucun ADVE/RTIS complet, Oracle entier, MVP ou chantier
global reçu.
