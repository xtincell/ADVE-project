# ADR-0199 — Observation par marque et recommandations explicitement demandées

- **Status** : Accepted — réception locale ; livraison cible suivie séparément
- **Date** : 2026-10-07
- **Phase** : 27
- **Depends on** : ADR-0085, ADR-0166, ADR-0198
- **Supersedes** : aucun
- Sous-système : Guidance ; Mestor gouverne les gestes, Jehuty présente les observations.

## Contexte

La boucle de retour pouvait appeler un modèle pendant une écriture ordinaire,
créer une prescription dans un `Process` RUNNING et émettre FEEDBACK_VALIDATED
sans décision humaine. Ce chemin doublait la file `Recommendation` existante.
La recherche du dernier diagnostic ne filtrait pas sa marque avant le tri :
une mesure d'une autre marque pouvait servir de référence. Le mode agence de la
Gazette lisait aussi des marques hors du portefeuille accessible ; filtrer
après les cinquante premières entrées masquait les données autorisées.

La réception native a montré deux autres erreurs : une mesure à la une était
accompagnée du texte « votre score n'a pas bougé », et une analyse ayant produit
zéro proposition était présentée comme une recommandation en cours d'exécution.
Les qualifications absentes étaient remplacées par urgence, impact ou confiance
fabriqués. Ces défauts empêchent une exploitation lisible et une IA facultative.

## Audit anti-doublon

`CODE-MAP`, les cartes de services, routers et pages, le schéma et les lignées
ADVERTIS ont été recherchés par signal/diagnostic/prescription/recommandation/
observation/feedback. `Signal`, `KnowledgeEntry`, `Recommendation`,
`RecommendationBatch`, `JehutyCuration`, `generateBatch` et les gestes gouvernés
existent. Ils portent déjà observation, proposition, revue et application.
L'intervention est une factorisation et une correction de portée ; aucune
nouvelle entité métier, file, métrique, page ou agent n'est nécessaire.

## Décision

`processSignal` recalcule et conserve les observations déterministes ; il
n'appelle aucun fournisseur, ne crée plus de prescription parallèle et n'émet
plus une validation humaine supposée. Les anciennes prescriptions restent des
archives à qualifier ; elles ne sont pas effacées par ce changement.

La demande explicite `jehuty.triggerNotoria` utilise le moteur de recommandations
existant. Les propositions demeurent PENDING ; génération et application sont
deux gestes distincts. Une erreur sans proposition renvoie un refus visible et
ne crée aucune curation de réussite. Un résultat vide permet un nouvel essai ;
un résultat partiel est signalé. Une demande passée ne prouve pas une exécution
en cours. Le rafraîchissement de la Gazette ne demande pas de génération par
défaut ; l'option est explicitement cochée par l'utilisateur.

`knowledgeStrategyScope` factorise l'attribution du diagnostic :
`data.strategyId` doit désigner la marque et l'origine canonique, lorsqu'elle
existe, doit être cohérente. Les captures orphelines ou contradictoires ne
servent jamais de référence. La portée des marques réellement accessibles est
appliquée à toutes les lectures de la Gazette avant pagination, y compris en
mode agence. Une alerte mentionnant une autre marque ne lui confère pas un droit
de lecture. La capture passive conserve l'origine déjà reçue par sa fonction.

Une référence absente, nulle ou mal formée reste inconnue. Le contrôle de dérive
retourne son statut, son reçu et sa date ; une référence réelle à zéro demeure
distincte d'une référence manquante. Il compare au score antérieur du dernier
événement de dérive, pas à une nouvelle série temporelle ni à une preuve de
performance commerciale. `signalObservation` rend le même constat factuel dans
la Gazette et dans l'entrée de l'analyse assistée.

## Conséquences

Les sources de vérité métier et les Intents restent les mêmes. Le chemin manuel
cesse de dépendre d'un modèle ; le chemin assisté reste une proposition à revoir.
Urgence, impact, confiance, taux d'acceptation et confiance du contexte indiquent
l'absence d'information au lieu de la convertir en zéro ou en une estimation.
Le poids neutre du tri interne n'est jamais affiché comme une mesure.

Réception locale : PostgreSQL neuf avec toutes les migrations, huit scénarios de
portée et de reprise, tests de calcul et de mapping ; fournisseur simulé pour le
test de recommandations. Le navigateur authentifié montre la variation réelle,
l'option décochée, les qualifications inconnues, le refus HTTP 412 sans fournisseur
et le bouton de nouvel essai. Les anciens prédicats réintroduits rendent les
gardes de marque rouges avant restauration du code normal.

Restent séparés : qualité des propositions d'un fournisseur réel, concurrence
des écritures de fondation à leur application, réentrance du scoreur, réception
des événements déjà recalculés et parcours complet de décision jusqu'au résultat.
Le suivi Shinkiro conserve ces exigences ouvertes ; ce lot ne clôt aucun des sept
chantiers à lui seul.
