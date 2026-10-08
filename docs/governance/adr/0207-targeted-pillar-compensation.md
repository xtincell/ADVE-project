# ADR-0207 — Compenser une écriture sans effacer les suivantes

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : Réception Shinkiro C3/C5/C7
- **Depends on** : ADR-0176, ADR-0198, ADR-0206
- **Supersedes** : — (précise ADR-0176, conserve ses interfaces)

## Contexte

Deux écritures indépendantes via le vrai gateway, puis rollback de la première,
effacent la seconde sur PostgreSQL isolé (code 81391cc3). Le rollback promeut aussi
une valeur historique en HUMAN. Le spine perd son identifiant avant le handler
amendement ; les archives SPAWT reçues V19→21 ont intentId null. L’archive conserve
le contenu d’avant, mais pas l’état appliqué ni ses métadonnées. Le compensateur
par id ne vérifie pas l’accès à la marque résolue. La restauration choisie garde
un writer distinct malgré son enveloppe governedProcedure.

Guidance/Mestor, GROUND_INFRASTRUCTURE : la réversibilité protège la substance de
marque. CODE-MAP référence déjà PillarVersion, gateway, compensation et les deux
surfaces. **On étend ces mécanismes**, sans nouvelle table, page, service, agent,
intention métier ni second historique.

## Décision

- Transmettre l’id réel du spine comme contexte d’exécution hors payload métier.
  L’amendement et la compensation le donnent au gateway.
- Ajouter à PillarVersion un checkpoint JSON nullable : delta appliqué du contenu,
  métadonnées avant/après et reçus disponibles à l’écriture. Le contenu d’avant
  existe déjà dans l’archive. Capturer dans la transaction, après arbitrage final.
  Aucun backfill déduit pour les anciennes archives.
- Le gateway reçoit RESTORE_VERSION sur l’archive immuable. Trois états servent
  la compensation : avant / appliqué / courant. Les feuilles indépendantes sont
  préservées, un changement concurrent de la même valeur est refusé. Les tableaux
  métier restent atomiques ; aucune identité d’item n’est devinée. Provenance et
  certitudes suivent les feuilles sans passer par une nouvelle déclaration HUMAN.
- Sources : réconcilier par id les reçus non ambigus, préserver les références
  utilisées ensuite ; une version remplacée encore utilisée est un conflit. Les
  formats legacy ambigus ne sont pas normalisés en silence. Vérifier les reçus
  résultants dans la transaction ; source corrigée, retirée ou étrangère refuse.
  Après des écritures ultérieures, conserver statut/confiance/fraîcheur globaux
  courants plutôt que réintroduire une validation historique sur ces nouveaux
  contenus. La restitution intégrale des métadonnées s’applique au dernier état.
- Version attendue, verrou de ligne et vérification de l’état relu protègent le
  persist. Contrôler l’accès à la marque résolue et les rattachements actuels avec
  les helpers canoniques ; garder leurs règles ADMIN/propriétaire/opérateur/grant.
- Un compensatedFrom nullable et unique par pilier journalise l’effet une fois.
  Un retry rend le reçu existant sans version, score ou effet supplémentaire.
  L’historique et le journal résolvent la même identité d’effet.
  Une compensation est annulable par une nouvelle compensation ; une ancienne
  action déjà compensée ne s’exécute pas une seconde fois silencieusement.
- WRITE_PILLAR, OPERATOR_AMEND_PILLAR, ROLLBACK_PILLAR et
  LEGACY_PILLAR_ROLLBACK_VERSION utilisent le même moteur.
  La restauration choisie converge vers le gateway et sa propre émission existante.
  Archive absente, ambiguë ou sans checkpoint : refus explicite, aucune estimation.
- La console réutilise le Modal et les champs du design system pour le motif,
  puis affiche le résultat ou le refus. Le prompt navigateur a échoué en recette
  native intégrée (`prompt() is not supported`), avant toute requête métier.
  Aucun nouveau parcours ni contournement de la mutation canonique.

## Conséquences

Migration additive et nullable ; aucun document historique réécrit. Le delta
évite de doubler tout le contenu dans chaque archive. Coût stockage à mesurer,
pas de coût LLM. Les formats anciens restent consultables mais une compensation
précise ne peut pas être inventée. Les autres compensateurs multi-piliers ne sont
pas reçus par ce lot. Parité manuelle/agent : même gateway et mêmes refus.

Tests requis : deux décisions indépendantes, conflit de feuille/tableau, null et
suppression, sources corrigées/retirées/partagées, filiation réelle, retry et course
au persist, restitution des origines/certitudes/états, compensation de compensation,
archive insuffisante/ambiguë et deux opérateurs. Surface tRPC réelle sur fixtures,
lecture native, CI/image/runtime exacts avant revendication de livraison.
