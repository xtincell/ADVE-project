# ADR-0208 — Un cycle d’actif commun aux décisions manuelles et agentiques

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : Réception Shinkiro C2/C3/C5
- **Depends on** : ADR-0012, ADR-0124, ADR-0198
- **Supersedes** : — (étend le coffre existant, conserve les contrats natifs)

## Contexte

Les commandes SELECT_BRAND_ASSET, PROMOTE_BRAND_ASSET_TO_ACTIVE,
SUPERSEDE_BRAND_ASSET et ARCHIVE_BRAND_ASSET sont déjà cataloguées et ont leurs
SLO, mais manquent à l’union Intent et au dispatcher. Leur exécution directe
retourne undefined. Les mutations natives disposent de wrappers gouvernés ;
le moteur ajoute pourtant ses propres lignes IntentEmission non chaînées.

Les contre-exemples sur PostgreSQL isolé montrent aussi un successeur ACTIVE
laissé après l’échec du remplacement, une filiation entre marques, le rejet d’un
candidat étranger partageant le batchId, et la résurrection d’un ARCHIVED avec
force. Le moteur lit l’actif avant sa transaction ; un slot de campagne peut
changer séparément de la décision qu’il représente. Le remplacement manuel
confondait enfin userId de l’auteur et operatorId de l’équipe.

Guidance/Mestor, contribution DIRECT_BOTH : le coffre matérialise une décision
de marque exploitable et sa filiation. Il est déjà le point de persistance de
BrandAsset. Un Glory tool produit du contenu ; il ne remplace pas cette primitive
de cycle de vie. **Étendre engine/router/manifest/spine existants** est le choix
de factorisation : aucun nouveau modèle, service, router, page, agent, Glory tool
ou Intent kind. Les quatre noms de commande existaient avant ce lot.

## Décision

- Câbler les quatre commandes dans les types, le manifest et artemis.commandant.
  Une commande non prise en charge rend un résultat FAILED explicite plutôt que
  undefined. Le dispatcher appelle les mêmes helpers que les wrappers manuels
  LEGACY_BRAND_VAULT_* ; leurs noms et champs utilisateur sont conservés.
- Résoudre la marque de l’id d’actif dans la transformation du schéma natif,
  avant les gardes du wrapper gouverné. Cette lecture fournit le pivot d’audit,
  jamais une autorisation : les contrôles d’accès sont refaits dans le moteur.
- Une frontière transactionnelle commune verrouille dans l’ordre : sources
  documentaires triées, Strategy concernées, mutex transactionnel de marque,
  campagne, actif. Relire l’actif sous verrou et refuser un changement de marque,
  campagne, nature, brief ou référence documentaire intervenu depuis la première
  lecture. Le mutex commun sérialise également deux candidats du même lot.
- Relire l’acteur User, ses droits canoniques d’accès à Strategy et le firewall
  collaborateur dans cette transaction, avec le rôle administrateur effectif déjà
  accordé par l’authentification. L’équipe du successeur vient de Strategy ;
  un operatorId explicitement incompatible est refusé. Ni la présence d’un id
  d’acteur ni une enveloppe gouvernée ne suffisent à accorder l’accès.
- La sélection ne rejette que les autres CANDIDATE du même batch, de la même
  marque, campagne et nature. SELECTED et ACTIVE sont relus au retry ; répéter
  une sélection ne rétrograde pas un actif déjà ACTIVE.
- La promotion accepte DRAFT ou SELECTED, ou relit ACTIVE sans nouvel effet.
  ARCHIVED, SUPERSEDED, REJECTED et CANDIDATE ne sont pas ressuscités par force.
  Le garde de qualité existant s’applique aussi à la sélection directement ACTIVE
  et au successeur. L’override manuel force conserve sa seule portée de qualité ;
  il ne contourne ni les droits, ni l’état, ni la fraîcheur documentaire.
- Sélection et promotion vérifient le reçu documentaire courant sous les verrous
  communs avec la correction/révocation. Le successeur passe par createBrandAsset
  avec le client transactionnel, donc par son garde documentaire existant.
  Remplacer ou archiver une ancienne preuve périmée reste possible : retirer
  cette preuve ne signifie pas l’utiliser comme preuve actuelle.
- Le remplacement exige un ancien actif ACTIVE, la même marque/nature/campagne
  et un brief appartenant à cette campagne. Création du successeur, parent,
  incrément de version, ancien état SUPERSEDED et slot actif commitent ensemble.
  Échec tardif : aucun successeur, parent ou slot partiellement conservé.
- Un slot occupé par une autre décision ne peut pas être écrasé par une simple
  activation. Le remplacement est explicite. L’archivage ne vide un slot que
  lorsqu’il référence encore exactement l’actif archivé ; archiver l’ancienne
  version ne retire donc pas son successeur.
- Transmettre l’intentId réel du spine au remplacement. Réexécuter cette même
  commande persistée retrouve son successeur, sans nouvelle version. Une nouvelle
  demande sans cette identité n’est pas dédupliquée par son texte ou son nom.
- Retirer les cinq créations IntentEmission locales et leur exception de test.
  Les enveloppes manuelles et emitIntent gardent leur émission chaînée existante.
  Une mutation réussie n’est pas pour autant une preuve de fermeture durable du
  journal : le close best-effort d’emitIntent reste explicitement hors lot.
- Les refus métier attendus du router sont traduits en FORBIDDEN, CONFLICT ou
  PRECONDITION_FAILED ; qualité et source périmée rendent une précondition non
  satisfaite, sans masquer les erreurs inattendues. Le script de stress emploie
  le véritable userId de sa Strategy et nettoie les enfants avant leur parent.

## Conséquences

Le cycle manuel et les commandes cataloguées partagent les mêmes refus, sources,
permissions et transitions. Le mutex sérialise les décisions d’actifs d’une marque ;
sa contention devra être mesurée si ce périmètre devient un goulot. Aucun schéma
Prisma ni historique métier n’est réécrit. ACTIVE conserve son sens d’actif en usage,
sans devenir une approbation humaine ou une autorisation de publication publique.

Les créations autonomes, le lot de candidats, l’expiration documentaire, le
classifieur et la réconciliation Ptah gardent leurs contrats actuels ; leur
convergence et leurs interruptions restent à recevoir séparément. La projection
publique versionnée SPAWT n’est pas livrée par cet ADR. Les sept chantiers Shinkiro
et les parcours complets de marque restent ouverts.

Tests anti-drift : `brand-vault-lifecycle.postgres.test.ts` exerce le vrai moteur,
le dispatcher, le spine et les wrappers tRPC sur fixtures isolées. Les exigences
sont : commandes cataloguées, panne tardive avant/après filiation, scope marque/
équipe/nature/campagne/brief, collisions de batch, états invalides malgré force,
qualité, slots concurrents, acteur étranger/collaborateur, source corrigée ou accès
retiré, deux ordres de concurrence, retry, identité d’émission et transfert de
marque concurrent. Le garde unitaire `emission-spine-unified` ne permet plus de
journal local au moteur. Les résultats complets de CI, la réception HTTP/native
et l’image/runtime exacts sont des preuves de livraison distinctes ; aucun
résultat vert ou déploiement n’est présumé ici.
