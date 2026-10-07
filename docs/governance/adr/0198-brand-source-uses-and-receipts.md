# ADR-0198 — Une source canonique, des usages par marque et des reçus de lecture

- **Status** : Accepted — réception locale ; activation cible suivie séparément
- **Date** : 2026-10-07
- **Phase** : 27
- **Depends on** : ADR-0193, ADR-0197
- **Supersedes** : aucun
- Sous-système : Guidance ; Mestor gouverne les gestes, Seshat prépare les index existants.

## Contexte

Le brief de Noël 2026 concerne plusieurs marques. Le déposer dans chaque dossier
dupliquerait son texte, ses corrections et son original. `BrandDataSource.strategyId`
cumule actuellement propriété, lecture, classement et destination des propositions.
Les propositions citent une identité de source sans conserver la version consommée.

## Audit anti-doublon

`CODE-MAP`, le schéma, les cartes de services, routers et pages ont été recherchés
avec source/document/partage/usage/référence/portfolio. `BrandDataSource`,
`FileUpload`, `BrandContextNode`, `Recommendation` et `BrandAsset` existent : ils
sont étendus. `PortfolioReference` désigne une identité d'un outil, sans accès
documentaire. `UsageGrant` porte les droits d'exploitation d'un talent/livrable
(média, territoire, durée, buyout), pas l'utilisation d'une pièce dans un dossier.
Il n'existe pas d'association documentaire source × marque avec classement local.

## Décision

Ajouter uniquement l'association `BrandSourceUse` entre les deux entités
existantes. Elle porte la marque consommatrice, l'opérateur commun au moment du
lien, l'auteur, la révocation et l'état d'analyse propre à cet usage. Aucun texte
ni original n'y est copié. Le propriétaire conserve seul l'édition de la source.
Une marque sans opérateur commun ne peut recevoir le lien ; le changement de
périmètre d'une des marques invalide aussi la lecture.

Les primitives de lecture de `ingestion-pipeline` résolvent propriétaire ou usage
actif, en vérifiant le périmètre courant. La page, le téléchargement, le contexte
déterministe, les index, le classement et les propositions utilisent cette même
résolution. L'état PROCESSED du propriétaire ne signifie pas que les autres usages
ont été analysés. Les Intents existants conservent la stratégie consommatrice au
lieu de la remplacer par celle du propriétaire.

L'empreinte du contenu documentaire effectivement consommé est conservée dans les
reçus des index, recommandations et actifs dérivés. Une correction retire les
fragments concernés dans la même transaction et signale les dérivés périmés ; la
décision historique demeure conservée. Une proposition citant une version ancienne
ou un usage révoqué ne peut être appliquée comme une preuve courante. Les anciens
dérivés sans reçu sont explicitement à revoir, jamais rétroactivement certifiés.

Les liens sont des gestes de persistance de la source : extension du chemin
gouverné `LEGACY_INGESTION_UPDATE_SOURCE`, sans nouvel agent, tool de production,
bus ou dépôt documentaire. La préparation reste explicitement demandée via les
Intents existants ; aucun partage ni affichage ne lance de traitement IA.

## Conséquences

La source et ses usages sont verrouillés avant l'indexation ou la modification.
La reprise d'un même lien est idempotente. L'original demeure sous son propriétaire,
dans le stockage privé reçu en ADR-0197. Les reçus d'analyse ne remplacent jamais
la certitude déclarée de la pièce ni une validation client.

Réception obligatoire : un original et trois usages, correction unique visible
partout, classements distincts, indexations concurrentes, révocation, refus entre
opérateurs, échec/reprise sans doublon, proposition périmée bloquée et historique
préservé. Les parcours manuels sont reçus avec fournisseurs désactivés. Toute
écriture ADVE reste une décision opérateur via le gateway existant.

Huit scénarios PostgreSQL exécutent les liens et reprises concurrents, les lectures
scopées, les classements locaux, la péremption, le transfert d'opérateur, la
révocation/reprise, la correction concurrente et le rollback multi-piliers avec
leurs versions. Les effets de score/cache/événement suivent le commit unique.
Quatre tests unitaires gardent les reçus ; supprimer la comparaison d'empreinte
dans une copie isolée rend le test de correction rouge, puis le code normal vert.
La recette navigateur utilise un original TXT synthétique : consultation et
téléchargement identique depuis la marque consommatrice, correction propriétaire
visible dans l'autre marque, retrait/reprise sans copie et sans fournisseur IA.

Les analyses n'héritent pas d'un état de réussite si l'extraction canonique échoue.
La révocation reste possible après transfert de l'autre dossier ; elle retire
l'accès sans effacer les décisions. La prévisualisation d'un livre de marque porte
son reçu jusqu'au geste d'application ; elle ne requalifie pas sa certitude.

## Portée

Cette association concerne les dossiers natifs de La Fusée. L'autorité des décisions
de campagne reste à La Barre ; son raccord requiert son propre reçu de circulation.
Le document de conception ne vaut ni implémentation ni réception.
