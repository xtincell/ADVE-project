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
