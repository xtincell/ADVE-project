# ADR-0205 — Identité catalogue et confirmation au point d'écriture commun

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : réception Shinkiro C2/C3/C5
- **Depends on** : ADR-0171, ADR-0203, ADR-0204
- **Supersedes** : aucune doctrine métier

## Contexte

Le catalogue est la référence produit mais seul addProduct attribue les ids.
L'amendement et les recommandations peuvent donc produire des liens instables.
Une copie superficielle dans SET_FIELDS modifie aussi previousContent lorsqu'une
feuille est éditée : le garde ne voit plus de différence et une source peut
écraser un champ humain. Le défaut est reproduit sur PostgreSQL isolé.

La confirmation ne consulte que fieldCertainty, écrit la provenance puis retire
ce marqueur séparément. Une inférence canonique sans marqueur est faussement
annoncée déjà confirmée ; une ancienne lecture n'est pas protégée contre une
édition ultérieure. Le lecteur 416 avait rendu ce décalage visible.

Audit anti-doublon : product-catalog, field-provenance, provenance-guard,
confirmInferredField et OPERATOR_AMEND_PILLAR existent. Guidance/Mestor gouverne
la revue ; aucun nouveau service, modèle, router, page, Intent ou Neter.

## Décision

- Cloner profondément le précédent avant SET_FIELDS, puis arbitrer la provenance.
- Attribuer les ids uniquement au catalogue V accepté et réellement modifié.
  Conserver les ids acquis, récupérer un id omis par nom exact non ambigu,
  réserver ceux de l'état précédent et refuser les doublons explicites.
  Un renommage sans id et sans correspondance certaine n'est pas rapproché par
  position. Les références rompues restent à corriger, sans identité inventée.
- Réancrer les liens par nom exact unique lors de ce même changement : ids dans
  gammes/système, noms lisibles actualisés dans personaSegmentMap. Préserver leur
  destination et provenance, sans changer les conditions commerciales. Les noms
  ambigus/approximatifs et produits retirés ne sont pas rapprochés.
- Factoriser statut affiché et champs confirmables dans field-provenance Layer 0.
  L'origine canonique prime sur l'ancien marqueur ; sans origine, pas de déclaration.
  Le grain de confirmation est celui du garde : tout le champ de tête affiché.
- Exiger la version relue dans la procédure existante. Contrôler cette version
  dans la transaction du gateway, puis écrire contenu/provenance/fieldCertainty
  et version ensemble. Le verrou optimiste final annule aussi l'archive au conflit.
  L'amendement Mestor transmet la version chargée avant ses traitements.
- Ni SOURCE→OFFICIAL, ni validation automatique, ni génération IA, ni rétroaction
  silencieuse sur un catalogue inchangé. La confirmation est une décision humaine
  sur une valeur, pas une certification du document source.

## Preuves et bornage

22 tests PostgreSQL réels : cinq opérations d'écriture, ids stables et conflits,
ancien état, refus source imbriqué, legacy qualifié/nu, priorité canonique,
ancienne version et deux courses concurrentes. Six défauts catalogue/provenance,
puis trois défauts de confirmation sont rouges avant correction. CI PostgreSQL
étendue sans retirer aucun cas. Corpus synthétique, aucun provider sollicité.
Le renommage natif a révélé la rupture d'un lien historique par nom ; le contrat
de transition catalogue/gamme/système/personas échoue avant cette correction.

La compilation finale est reçue nativement sous session opérateur locale :
confirmation sans modification du catalogue, puis condition commerciale et
renommage à id acquis sans rupture de gamme. Versions 1→2→3→4, trois archives,
second produit inchangé, zéro appel IA. Trois réponses réelles relues, HTTP 200 ;
70 réponses sans erreur ni exception, 23 requêtes annulées, trace non tronquée.
DOM 1 122,5 ms ; titre observé sous 11 147 ms, borne incluant les appels d'outil,
pas une mesure de first paint. La gamme unique de fixture reste un brouillon.
Le runtime déployé et l'amendement du vrai corpus sont des reçus distincts.
Le programme Shinkiro et ses sept chantiers restent ouverts.

## Résidus

Les marqueurs legacy des anciens remplisseurs sont encore écrits séparément de
leur contenu. L'origine canonique protège l'affichage/confirmation mais ne rend
pas ce journal historique atomique. Plan : transmettre leur delta dans la même
transaction existante, versions attendues et refus de provenance éprouvés ; reprise
avant prochaine exécution d'inférence/auto-remplissage sur le corpus réel.
La stabilisation globale des ids anciens n'est pas un backfill automatique : elle
se reçoit lors de l'amendement gouverné et du rapprochement des références.
La réservation couvre l'état précédent, pas tous les produits supprimés de
l'histoire. Plan : qualifier les références historiques avant toute réintroduction
d'un produit retiré, avec allocation bornée au contexte/version existant si besoin.
Reprise : avant un cycle réel de retrait/réintroduction ; aucun rapprochement de
produits par simple similarité de nom n'est reçu ici.

## Amendement 568 — retraits, réintroductions et leur historique (2026-11-11)

**Défaut reproduit.** La réservation ne couvrait que l'état précédent. Un produit
retiré à la version N, puis un nouveau produit homonyme ajouté sans identifiant,
recevait par ressemblance de slug l'identifiant du retiré ; les gammes qui
pointaient encore vers lui, ou vers son nom, basculaient silencieusement sur le
nouveau. Une écriture pouvait aussi reprendre l'identifiant retiré sans autre
preuve que sa présence dans la charge utile (formulaire périmé, import, proposition
automatique). L'historique existait dans `PillarVersion` mais aucune lecture ne
disait quand un produit avait été retiré ou réintroduit, ni par quelle écriture.

**Décision.**

- Le writer commun lit les états archivés du catalogue (`PillarVersion`, chemin
  `produitsCatalogue` seul, dans sa transaction) : tous les identifiants de
  l'historique sont réservés à l'allocation (`acquireEntityIds(…, reserved)`),
  et un nouvel homonyme reçoit un identifiant nouveau.
- Règle de réintroduction, la plus prudente : un identifiant retiré ne revient
  que par la restauration gouvernée de la version qui le contenait (ADR-0207,
  `rollbackPillar`) ; l'archive restaurée est la preuve. Toute autre écriture qui
  porte un identifiant retiré est refusée avant version ou archive
  (`CATALOGUE_RETIRED_ID`) ; le produit peut être ajouté sans identifiant et en
  reçoit un nouveau. Aucune voie déclarative supplémentaire n'est ajoutée : elle
  demanderait une décision métier (qui peut affirmer qu'un nouvel ajout est le
  produit retiré) qui n'est pas prise ici.
- Une référence à un produit retiré plus tôt, par son identifiant ou par un nom
  qu'il portait, n'est plus réancrée vers un homonyme : elle reste à corriger.
- Lecture : `catalogueIdentityHistory` (domaine, pur) dérive des versions
  conservées les entrées, retraits, renommages et réintroductions, avec l'écriture
  de chacun (date, auteur, motif, intention et son type lus dans le journal de la
  même marque, restauration). Une écriture n'est attribuée que si la version
  suivante suit exactement et que l'archive est unique ; sinon le passage est
  listé sans auteur. Un identifiant revenu sans restauration avant cette règle est
  qualifié « repris sans preuve, à vérifier ». Les produits sans identifiant sont
  comptés, jamais rapprochés par nom ou position. Procédure
  `pillar.getCatalogueHistory` (lecture, `strategyScopedProcedure`) et panneau
  « Historique du catalogue » de la page Offre & Pricing, chargé à l'ouverture.

Aucun modèle, migration, service, Intent ou routeur nouveau ; zéro modèle de langue.

**Preuves.** Unitaires `catalogue-history.test.ts` : 7 rouges sur 8 contre le code
566, 8 verts après ; composant 2/2. PostgreSQL `catalogue-history.postgres.test.ts` :
3 rouges sur 3 contre le code 566 (identifiant `palais` réattribué au nouvel
homonyme, réintroduction non déclarée acceptée, procédure absente), 3 verts après ;
contre-épreuve sans réservation ni refus : 2 rouges, restaurés verts. Recette native
locale sous vrai compte propriétaire, fixture synthétique : page HTTP 200, lecture
200, sept événements dans l'ordre, aucune réponse ≥ 500 ni erreur de page, 390 px
sans débordement. CI, image et production 568 restent à recevoir.

**Résidu.** La résolution tolérante en lecture (`resolveProductRef`, ADR-0171)
rapproche encore une référence par nom ou slug, sans casse : une gamme qui vise
l'identifiant retiré `palais` s'affiche résolue vers un nouveau « Palais ». Plan et
déclencheur : RESIDUAL-DEBT § catalogue.
