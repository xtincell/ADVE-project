# ADR-0193 — Relier les dossiers de marque à leurs sources existantes

- **Status** : Accepted
- **Date** : 2026-10-02
- **Phase** : 18 — architecture de marque et parité manuelle
- **Depends on** : ADR-0059, ADR-0060, ADR-0129, ADR-0166
- **Supersedes** : aucune

## Contexte

Le portefeuille natif décrit déjà les groupes, marques, gammes, produits et services.
Ses formulaires ne pouvaient pas relier un élément à ses identités dans La Barre,
à un ancien dossier de stratégie ou à un produit déployé. Les marques en cours de
travail n’y étaient pas ventilées. Le passage d’un outil à l’autre dépendait de
la mémoire de l’opérateur. Une seconde liste de marques serait un doublon.

Écart traité : retrouver l’architecture, les campagnes, les fichiers et les sources
d’un même dossier, puis agir manuellement à partir de celui-ci. Ce raccord ne ferme
pas à lui seul l’audit ni la release de toutes les IP de Shinkiro.

## Décision

Étendre **BrandNode**, le router `brandNode` et les pages portfolio existants.
`sourceRefs` conserve uniquement des identités typées et des liens : système,
nature, identifiant, libellé et URL facultative. Ce champ ne copie aucun état métier.
La modification passe par les commandes gouvernées existantes de création/édition.
Le schéma partagé refuse les protocoles exécutables, les identifiants dans les URLs,
les combinaisons incohérentes et les références répétées.

La Fusée porte l’architecture et les stratégies natives. La Barre reste l’autorité
pour les campagnes, projets et références qu’elle héberge. `brandNode.workspace`
projette leur contenu à la demande, par identifiant exact ; les noms ne prouvent
jamais une appartenance. Un projet multimarque reste un projet. La projection
préserve les archives, signale les contradictions client/marque et les références
introuvables ; elle n’approuve ni une inférence ni un brief comme stratégie.

Le connecteur initial lit le dépôt La Barre existant, avec cache de 60 secondes et
expiration réseau de 12 secondes. Une source invalide ou indisponible donne un état
explicite, jamais un faux portefeuille vide. Aucun processus autonome n’est ajouté.
Le dépôt partagé est lisible par les administrateurs ; l’accès d’un opérateur doit
être activé dans `PORTFOLIO_BARRE_OPERATOR_IDS` (identifiants séparés par virgules).
Cette configuration autorise ce dépôt pour l’équipe entière : elle ne doit pas être
activée pour un locataire sans droit sur son contenu. Les dossiers de stratégie
restent soumis à `canAccessStrategy` : une référence n’accorde aucun droit.

Les écrans portfolio ont une navigation propre au portefeuille, desktop et mobile,
pour ne pas proposer les actions d’une autre stratégie encore active dans le cockpit.
Les formulaires d’architecture et de raccordement restent accessibles sans agent.
Les produits retrouvent le socle de stratégie de leur ancêtre, avec mention de son
origine. Le contenu intégral des assets est lu uniquement à l’ouverture de la fiche,
par `brandVault.get` et ses permissions existantes.

`scripts/onboard-portfolio.ts` applique un plan privé explicite via les mêmes
procédures gouvernées que l’interface. Prévalidation de toute la structure,
simulation par défaut, import relançable et fusion additive des références.
Un conflit de parent, de nature ou de stratégie bloque avant la première écriture.
Chaque commande reste journalisée ; une erreur en cours d’import ne rend pas les
commandes précédentes atomiques : relancer le même plan reprend les éléments manquants.
Les plans et corpus client sont exclus du dépôt de code.

## Conséquences

- Migration additive nullable ; les portefeuilles existants restent compatibles.
- Les stratégies multiples, produits à achever et versions produit ambiguës restent
  visibles. Aucun contenu de stratégie ni fichier n’est fusionné ou détruit.
- Ce raccord assure la lecture vivante et la modification des identités. Il ne
  constitue pas un bus de synchronisation des décisions ni une admission ADVE.
- La normalisation des noyaux de marque, le rapprochement de stratégies anciennes,
  les droits plus fins par client et les autres outils restent des travaux distincts
  avec preuves de réception requises, suivis dans `RESIDUAL-DEBT.md`.
- Tests : identités exactes, campagne multimarque, inférences, archives, source
  cassée, URLs, doublons et contexte de navigation. Recette avec vrais corpus copiés
  en base locale isolée, mutations manuelles, refus inter-opérateur et administrateur
  sans équipe ; le reçu de production est conservé dans le dossier privé d’intégration.
