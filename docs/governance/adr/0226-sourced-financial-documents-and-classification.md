# ADR-0226 — Classement versionné et fiche financière depuis les sources conservées

**Status** : Proposed — contrôles ciblés reçus ; recette des surfaces et livraison 520 ouvertes
**Date** : 2026-10-22
**Phase** : 7 — C2, corpus documentaire et exploitation financière
**Depends on** : ADR-0197, ADR-0198, ADR-0219, ADR-0220, ADR-0223, ADR-0225
**Supersedes** : aucun ; étend les sources, le coffre, le calculateur et Glory existants

## Contexte

Recevoir un corpus ne suffit pas à le rendre exploitable. Documents métier,
code, ressources, archives et propositions doivent conserver une place explicite.
Un BMC récent reste une piste à valider. Une dépense ancienne peut éclairer un
scénario, sans devenir une facture actuelle ; un public mesuré n’est pas un client
payeur. Une fiche de seuil doit donc conserver les hypothèses et pièces utilisées
à chaque édition, sans déduire la rentabilité de la seule présence des fichiers.

L’audit anti-doublon retrouve `BrandDataSource`, `_document`, `FileUpload`,
`BrandAsset`, `GloryOutput`, les routes d’ingestion et d’export, le registre Glory
et `financial-brain.calculateBreakeven`. Leur extension suffit. Le slug financier
`break-even-calculator` existait dans les calculateurs ; il est exposé dans le
registre par un compositeur déterministe, sans deuxième formule de seuil.
Aucun Neter, modèle Prisma, routeur, page, Intent, agent, fournisseur ou
journal comptable supplémentaire n’est créé.

## Décision

Guidance/Mestor conserve les écritures gouvernées et la continuité des décisions ;
les lecteurs de connaissance conservent les statuts des pièces. La chaîne reste
source fidèle → analyse qualifiée → décision explicite → livrable exploitable.

### Classer sans adopter

- Une édition documentaire accepte des étiquettes descriptives dans son
  `_document`. `ingestion.updateSource` exige l’empreinte relue, verrouille source
  et stratégie, attribue l’annotation et invalide les dérivés. Texte, original,
  lignée, numéro d’édition, statut et décisions restent conservés. Ajouter une
  étiquette n’adopte aucune proposition.
- Les recherches de lignée sont filtrées par marque et famille en base. Le
  dossier existant recherche labels et étiquettes, pagine les familles et garde
  archives et ressources techniques accessibles séparément des documents métier.
- Le classement d’un actif passe par `brandVault.updateTags` existant, séparément
  des tags stratégiques. Le reçu complet FileUpload STORED, son hash et sa taille
  doivent correspondre au résumé visible du même actif. Empreinte de l’original
  et version de classement attendues sont requises ; l’historique est daté et
  attribué dans `_sourceClassification`. Ce classement ne change ni octets,
  version physique, sélection de logo, adoption ou droit de publication.
- La récupération sémantique conserve le contexte documentaire et refuse les
  fragments dont l’empreinte ne correspond plus à la source courante. TECHNICAL
  est exclu par défaut du conseil métier ; un accès explicite reste possible.
  Les calculs R/T/I et la complétion réutilisent les passages retenus et leurs
  reçus dans les rails existants, sans indexation ou génération à la lecture.

Une correction de famille est permise uniquement pour TECHNICAL/ASSET, par
`ingestion.updateSource.resourceFiling` et un reçu courant. Elle répare les fichiers
homonymes de dossiers différents (README, manifeste, prompt), jamais un BMC ou
une autre pièce métier. Le classement antérieur, ses liens et le motif attribué
restent dans `filingCorrections`, consultables dans le dossier ; le texte,
l’original, le numéro d’admission et les décisions métier ne sont pas réécrits.
Une ressource portant déjà une décision explicite refuse cette correction.
Le nouveau classement n’invente aucune validation créative ou publication.

### Produire une fiche depuis une édition financière explicite

- `adve-break-even-model-v1` est le contenu structuré d’une source FINANCE
  PROPOSED ou REFERENCE, pas une nouvelle entité. Il déclare payeur, unité,
  devise, période mensuelle, base fiscale, prix, coûts fixes et variables,
  exclusions et hypothèses. Une valeur absente reste `null` ; un zéro doit être
  déclaré. Chaque montant est SOURCED, HISTORICAL ou ASSUMPTION avec note ;
  les deux premières qualifications exigent une source et un emplacement.
  Le contrat ne certifie pas à lui seul la validité fiscale ou comptable.
- L’utilisateur choisit le modèle et son empreinte, puis utilise `glory.execute`
  existant. Le compositeur vérifie accès à la marque, statut du modèle et
  empreinte de chaque pièce. Une pièce archivée ne peut soutenir un montant
  SOURCED actuel. Le lien facultatif au persona doit viser un profil courant
  portant PAYER ; audience et partenaires ne sont pas convertis en payeurs.
- Le résultat conserve les pièces, leurs statuts et les versions A/D/V utilisées.
  Avant l’écriture existante du GloryOutput, sources et stratégie sont verrouillées
  puis les empreintes et versions revérifiées. Une modification concurrente
  refuse le résultat ; aucune écriture ADVE ni adoption du modèle n’en découle.
- La composition réutilise `calculateBreakeven` : données insuffisantes,
  contribution ne permettant pas de seuil fini et calcul réussi sont distincts.
  Seuil entier, CA théorique et CA au volume entier restent distincts. Aucune
  accumulation de revenus ne transforme les charges mensuelles en délai de
  remboursement. Un premier mois couvrant les charges n’est calculé qu’avec
  une trajectoire déclarée ; il reste une projection conditionnelle.
- Les sensibilités du modèle Catalyse réutilisent cette formule. Le calcul CODB
  legacy est hors de cette chaîne ; sa quantité nommée « seuil » n’est pas
  utilisée comme résultat de rentabilité de cette fiche.
- Le panneau dans Sources montre hypothèses, résultats et éditions conservées.
  L’export authentifié `break-even-docx` réutilise le gabarit modulaire FIN-06,
  avec graphique et annexe de provenance. Il sélectionne le GloryOutput de la
  même marque autorisée ; une édition historique reste téléchargeable comme
  telle, sans recalcul, nouvelle écriture ou prétention de fraîcheur implicite.

## Conséquences

L’absorption reste mesurable par original reçu, lecture exploitable, classement,
index utile et réception du parcours. Un inventaire, une archive conservée ou un
export généré ne certifie pas la lecture de chaque pièce ni la qualité du conseil.
Les étiquettes peuvent rendre des dérivés périmés ; les modèles financiers citant
ces pièces doivent alors être relus avant une nouvelle production.

Le modèle financier doit être préparé comme source structurée avant la production.
Le panneau ne remplace pas cette préparation par une extraction comptable
implicite ; prix, terrain, salaires et missions non mesurés restent des hypothèses
ou manques. Le document produit ne vaut ni budget adopté, ni comptes certifiés,
ni ventes ou rentabilité observées.

Tests anti-drift créés/étendus : étiquettes sans adoption et reçu périmé ; requêtes
bornées par famille ; statut PROPOSED conservé dans la recherche sémantique ;
classement d’actif sous reçu FileUpload, version et droit courant ; valeurs
financières absentes distinctes de zéro, contribution insuffisante, unités et
périodes ; source étrangère/périmée, payeur incompatible et changement concurrent ;
vraie route Glory persistant une édition déterministe ; relecture du Word,
contrôles remplis, données de sensibilité et image de graphique.

Réception bornée : tests unitaires et PostgreSQL ciblés reçus dans les preuves
`finance520-labels-unit.log`, `finance520-unit-docx-reprise.log`,
`finance520-source-and-assets-pg-reprise.log` (actifs uniquement ; refus initial
financier conservé) et `finance520-financial-route-postgres.log`. Les cas sont
synthétiques et ne prouvent pas la fiche SPAWT réelle. Gauntlet final, rendu visuel
intégral du Word, navigateur authentifié, CI/image/runtime et conservation après
bascule restent à recevoir. Le statut Proposed ne vaut pas livraison, réception
intégrale du corpus ou validation de l’ADVE, de l’Oracle ou du MVP.

Réception locale finale du22octobre : build compilé, stress HTTP anonyme sans
échec (46reçus/235non reçus), panneau Sources sous session d’équipe, correction
et historique relus, calcul et deux éditions conservées, Word téléchargé et ses
4pages inspectées. Les premiers redémarrage mémoire/timeout de la recette de
développement restent conservés ; le plus grand original repasse6/6 isolé sans
changer sa limite. CI/image/runtime et corpus/fiche SPAWT réels restent ouverts.
