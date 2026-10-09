# ADR-0213 — Reprendre une production différée sur son brief et son reçu

- **Status** : Proposed
- **Date** : 2026-10-09
- **Phase** : Réception partielle Shinkiro C3/C4/C5/C6 — prototype non livré
- **Depends on** : ADR-0009, ADR-0021, ADR-0124, ADR-0207
- **Supersedes** : — (extension, aucune réécriture des reçus historiques)

## Contexte

Le parcours actuel ne relance pas une GenerativeTask DEFERRED : une nouvelle
matérialisation crée une autre tâche. Le tracker existant est exporté mais non
monté. Les contre-exemples PostgreSQL du lot privé 434 reproduisent la duplication,
l'absence de conservation du brief et la concurrence. Un autre test réel montre
que le hash d'une émission inchangée ne se recalcule pas après lecture JSONB :
l'ordre des clés imbriquées change. Ce défaut relève du spine commun, pas d'un
second journal Ptah.

La recette native révèle ensuite OPERATOR reconnu mais strategy.list vide :
la session ne transporte pas son operatorId réel. Réparer le callback existant
par relecture de l’affectation en base, sans l’enfermer dans le JWT ni changer
les rôles/droits, est requis pour atteindre le parcours. Tests de réaffectation,
révocation et base indisponible exigés.

Ce raccord appartient à Propulsion/PTAH, avec conservation et contrôle MESTOR,
carburant THOT et observation SESHAT : décision → production → actif traçable.
Il ne prouve ni livraison client, ni revenu, ni coût fournisseur facturé.

## Décision

- Étendre materializeBrief et l'Intent existant par resumeTaskId. La mutation
  manuelle lit le reçu initial, vérifie propriétaire, dossier, références et
  paramètres, puis reprend le brief original. Aucun override historique rejoué.
  Les formes tRPC reprise et nouveau brief sont strictes ; leur mélange est
  refusé BAD_REQUEST avant toute émission ou tâche.
- Recontrôler les gates actuelles. L'absence de configuration laisse la même
  tâche DEFERRED. Réserver par compare-and-set avant l'appel réseau. Une reprise
  concurrente ou déjà envoyée retourne l'état existant sans nouvel appel.
- Conserver la réservation dans les paramètres privés de la tâche existante,
  filtrée avant tout envoi fournisseur. Une réponse inconnue/interruption ne
  permet pas une réémission aveugle. Un COMPLETED sans AssetVersion est refusé ;
  son reçu retourne les IDs existants/scopés, exigés non vides par manifest/schema.
- Monter le tracker existant dans la page de production existante, sous la même
  restriction opérateur. Afficher attentes, erreurs, état réel et prix connu ou
  inconnu, confirmation explicite de reprise et pagination des tâches.
- Utiliser IntentEmission.version existant pour un sceau v2 : JSON canonique
  récursif, version incluse, périmètre d'émission (result:null). Conserver le
  calcul v1. Une ancienne empreinte non recalculable est non vérifiable, pas une
  preuve d'altération ; aucun hash ni payload historique n'est réécrit.
- Vérifier le sceau individuel du brief avant reprise. Ce contrôle ne certifie
  pas toute l'ancienne chaîne. Le vérificateur distingue chaîne cassée,
  historique non vérifiable, lignes sans sceau et fenêtre partielle.
- Horodater sous le verrou par stratégie, après lecture de la dernière émission,
  avec progression stricte en millisecondes. Si le prédécesseur est futur, cette
  progression est un ordre logique, pas une preuve de l’heure métier ni de
  fraîcheur historique. Capturer séparément startedAt réel après verrou, afin
  que les durées ne dépendent pas d’une ancienne date logique future.
  Cela ordonne les nouvelles lignes ;
  les ambiguïtés historiques ne sont pas réparées rétroactivement.

## Conséquences

Pas de modèle Prisma, service, router, Intent, agent, fournisseur, droit ou écran
supplémentaire. Réception locale finale post-découplage : suite canonique 4 180/399,
PostgreSQL 270/14/Ptah 47 cas, gauntlet après gardes exit 0 et gouvernance
1 620/166, 24 warnings préexistants. Contre-exemples émission/reprise, hybride,
références COMPLETED et sceau réinjecté rouges puis verts. Gestes natifs locaux
même DEFERRED/refus/restriction opérateur/pagination/locales tracker reçus.
Scénario horloge future de 60 s : un rouge/quatre verts avant correction,
cinq PostgreSQL verts après startedAt réel/emittedAt logique séparés, clôture
réelle/durée non négative/hash vérifiable reçus. Aucun SLO global déduit.
Stress isolé 46 HTTP reçus/235 non reçus/zéro échec avant les dernières gardes et
ce découplage,
sans native protégée/Glory phase 3/fournisseur réel et sans réparation du harnais
général. Timeout PG concurrent conservé, relance complète seule 270/14 verte en
24,02 s, cause non démontrée. CI/image/runtime et native production restent
à recevoir ; auth 433 committée séparément, livraison prévue dans le bundle 434
sans runtime 433 autonome. [Bornes et preuves locales](../RECEPTION-PTAH-REPRISE.md).
Réponses fournisseur incertaines, preuves historiques irrécupérables, lineage
source complet, coût facturé et cycle client intégral restent à recevoir.
Les sept chantiers et les dix gates globales demeurent ouverts.
