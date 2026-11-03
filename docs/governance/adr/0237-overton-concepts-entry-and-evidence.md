# ADR-0237 — Concepts Overton, jalons d’entrée et preuves qualifiées

- **Status** : Accepted
- **Date** : 2026-11-03
- **Phase** : 27 — irrigation et réception MVP
- **Depends on** : ADR-0148, ADR-0149, ADR-0236
- **Supersedes** : aucun ; extension du graphe existant

## Contexte

Mandat opérateur : suivre la conviction incarnée, la catégorie et la marque, avec un point
de départ et des preuves qui déplacent la position. SPAWT porte un rôle éditorial foodie
qui donne voix aux créateurs ; ce mandat ne prouve pas son adoption publique. Bonnet Rouge
et la place du lait sont deux sujets, avec des publics et des pays explicites.

Les six zones historiques restent UNTHINKABLE, RADICAL, ACCEPTABLE, SENSIBLE, POPULAR,
POLICY. Le cadre politique d’origine (https://www.mackinac.org/overtonwindow) est adapté ici
au suivi de propositions de marque. Ce n’est ni une échelle universelle de popularité ni
une preuve de notoriété, de préférence ou de causalité commerciale.

## Décision

- Étendre A.overtonPositions : id, type de sujet, proposition, public, territoire,
  départ DECLARED/INFERRED justifié et sourcé, cible, consigne de vérification, rôle éditorial.
- À fondations complètes, les trois sujets sont cadrés. L’entrée peut n’en cadrer qu’un.
  Le questionnaire et la maturité restent distincts ; aucune déclaration ne crée un résultat.
- Le domaine pur overton-positioning partage la grille et les jalons. Les lecteurs reprennent
  les mêmes identifiants. Les critères demandent des refus/essais/choix/soutiens/pratiques
  adaptés au public ; un article isolé ne démontre pas un soutien populaire.
- Réutiliser OvertonPosition, OvertonZoneTransition, OvertonActorLink et les portes gouvernées.
  L’enveloppe JSON existante porte concept et preuves, compatible avec les anciens tableaux.
  Les preuves exigent source, date, méthode, position sur la proposition, public et territoire.
- Identité par marque/secteur/échelle/pays/concept ; un changement de proposition documentée,
  de public ou de cible nécessite une position distincte. Les preuves antérieures restent intactes.
- Transitions chronologiques atomiques et idempotentes. Pas de zone future ni de changement
  silencieux via upsert. Départ et arrivée prouvés pour alimenter le scoreur. Le signe dépend
  du rapprochement de la cible, y compris une cible de rejet ; aucune réussite déduite d’un postulat.
- Les lecteurs sans preuve montrent la vérification à mener et le plan disponible. L’absence
  de preuve ne produit ni zéro fictif, ni zone impensable, ni bonus au classement.
- Aucun Neter, Governor, Intent, router, service autonome, table ou migration ajouté. BRAINS et
  Governor inchangés ; Seshat reste responsable de la mesure, Thot du récit, Mestor de l’admission.

## Conséquences

- Source unique ADVE pour le cadrage ; le scan R+T peut proposer de compléter ces champs via
  les mécanismes d’inférence existants. Les observations ne sont pas générées par ce mécanisme.
- Le scoreur public passe le cadrage à l’intake ; la conversion le conserve dans A. L’Oracle
  et le radar exposent des niveaux de preuve différents sans changer la proposition.
- Contrôles : six jalons/deux sens, schéma/identifiants, Oracle, preuve sans date/public/méthode,
  héritage non prouvé, déplacement vers le rejet et PostgreSQL réel avec replay/pays/rollback.
- La collecte et qualification automatique de toutes les preuves, l’étude de popularité et
  la calibration terrain ne sont pas reçues par cette tranche. Voir RESIDUAL-DEBT pour le plan.
- La réception production et les résultats SPAWT restent des reçus distincts du code.
