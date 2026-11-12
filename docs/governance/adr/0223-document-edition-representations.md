# ADR-0223 — Historique reçu tardivement et formats d’une édition documentaire

- **Status**: Proposed — PostgreSQL, navigateur et contrôles locaux reçus ; CI et livraison 504 à recevoir
- **Date**: 2026-10-20
- **Phase**: 7 — corpus intégral / C2, C3, C4, C7
- **Depends on**: ADR-0197, ADR-0198, ADR-0219
- **Supersedes**: aucun ; complète les éditions et les originaux existants

## Contexte

L’ordre des dépôts n’est pas nécessairement celui des positions de travail.
Une ancienne version peut arriver après la référence et la proposition actuelles.
Un export dans un autre format n’est pas une nouvelle position ; les mêmes octets
reçus sous un autre nom ne constituent pas une deuxième preuve.

`BrandDataSource`, `rawData._document`, `FileUpload`, `BrandSourceUse`, les reçus
d’empreinte et l’invalidation des dérivés existent. Le dossier documentaire et son
lecteur existent dans Sources. L’extension de ces registres suffit : aucun modèle
Prisma, service, routeur, Intent, page, fournisseur ou gestionnaire supplémentaire.

## Décision

Sustainment, sous Mestor pour les écritures gouvernées d’ingestion ; lecteurs
Seshat/Notoria pour la connaissance. Préserver les sources permet un conseil et
des briefs traçables, puis une production adaptée et une valeur d’engagement
mesurable. Leur dépôt ne valide ni stratégie, ni traction, ni décision d’équipe.

- Une édition antérieure reçue tardivement porte `beforeSourceId` dans le même
  `_document`, après vérification du reçu de l’édition qui la suit. Elle entre
  ARCHIVED, sans prédécesseur ajouté simultanément ni remplacement de la référence
  ou de la proposition. Les relations explicites ordonnent la consultation ; le
  numéro d’admission interne ne signifie pas une version métier plus récente.
- Un autre format porte `_documentRepresentation`, avec source canonique,
  empreinte relue, motif humain, acteur et date. Les deux pièces doivent être
  lisibles, dans le même dossier propriétaire ; la cible est une édition classée.
  Ce lien déclare une représentation, sans démontrer automatiquement l’équivalence
  de tous les textes ou visuels. Les originaux restent consultables sous la même
  version ; le format alternatif n’est pas une source indépendante des analyses
  courantes et ses dérivés sont invalidés lors du rapprochement.
- Le dépôt des mêmes octets réutilise la source et le `FileUpload` canoniques.
  Après vérification physique de l’original, le reçu `source-original-v1` conserve
  les noms et emplacements HTTPS explicitement soumis comme alias datés. Un lien
  déclaré n’est pas une provenance contrôlée à distance. Ces alias ne changent
  ni l’empreinte documentaire, ni le texte corrigé, ni le statut de l’édition.
- Les gestes restent dans `ingestion.uploadFile` et `ingestion.updateSource`
  gouvernés. Verrous source/stratégie, droits courants et reçus périmés restent
  applicables. Présence d’une édition ou représentation conservée, même malformée,
  interdit correction ou suppression ordinaire de son historique. Les documents
  legacy restent compatibles ; les usages partagés n’acquièrent aucun droit neuf.
- Le formulaire existant distingue nouvelle version, antérieure et autre format.
  Dossier documentaire, consultation et recherche affichent leurs liens et alias.
  Aucun appel IA, préparation d’embedding ou adoption de fondamentaux implicite.

## Conséquences

Aucune migration de schéma. Référence et proposition successives conservent leur
place ; une piste reste à valider par l’équipe. L’historique peut être complété
sans faire passer un document ancien pour la nouvelle recommandation. Un format
conservé ne pèse pas deux fois dans la sélection documentaire.

Contrôles locaux reçus : 31 tests ciblés, sept PostgreSQL sur deux fichiers,
4 871 tests complets sur 456 fichiers et gouvernance 1 671 / 169 ; typage et deux
lints sans erreur, 24 avertissements historiques, zéro cycle. Trois défauts
réintroduits produisent trois rouges distincts, puis restauration exacte et vert.

Recette native USER lié à un opérateur, quatre sources fictives : cinq mutations
HTTP 200 en 78–284 ms, ordre v3/v2/v1 après recharge, REFERENCE/PROPOSED conservés,
format lisible exclu comme seconde preuve, copie renommée sans source ni original
supplémentaire, empreintes inchangées et original téléchargé exact. Aucun appel
IA ou changement de fondamentaux. DOM à 2 469 ms, titre observé à 4 147 ms incluant
le pilote ; zéro réponse 500 ou exception dans la fenêtre complète des mutations.
Premier rechargement réseau tronqué, 23 réponses conservées sans 500/exception
observée ; fenêtre stable séparée reçue. Le téléchargement direct a été bloqué
par l’inspecteur navigateur ; sa méthode documentée de lien-fichier reçoit les
octets exacts. Ces mesures ne sont pas un SLO de production.

CI et image/runtime exacts restent à recevoir avant rapprochement des pièces
réelles. Restauration, corpus entier et qualité générale du conseil restent dans
leurs lots ; aucun déploiement 504 annoncé au checkpoint.
