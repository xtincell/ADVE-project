# ADR-0230 — Complétion ciblée et provenance sous un objet validé

**Status** : Proposed — candidat 530, réception finale et livraison ouvertes
**Date** : 2026-11-02
**Phase** : 7 — complétion ADVE et irrigation qualifiée
**Depends on** : ADR-0023, ADR-0032, ADR-0172, ADR-0229
**Supersedes** : aucun ; étend le grain des origines sans réécrire les décisions passées

## Contexte

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

Réceptions locales avant le dernier delta : 5 082 unitaires / 483 fichiers, maxWorkers 4 sans
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
Aucun nouveau modèle Prisma, routeur, service, Intent, provider ou gestionnaire
d’appels ; aucun ADVE/RTIS complet, Oracle entier, MVP ou chantier global reçu.
