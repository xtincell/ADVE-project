# ADR-0213 — Reprendre une production différée sur son brief et son reçu

- **Status** : Proposed
- **Date** : 2026-10-09
- **Phase** : Réception partielle Shinkiro C3/C4/C5/C6 — runtime 435, suivi vide reçu
- **Depends on** : ADR-0009, ADR-0021, ADR-0124, ADR-0207
- **Supersedes** : — (extension, aucune réécriture des reçus historiques)

## Contexte

Avant 434, le parcours ne relançait pas une GenerativeTask DEFERRED : une nouvelle
matérialisation créait une autre tâche. Le tracker existant était exporté mais non
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

434 livré au runtime révèle ensuite tracker natif 403 pour compte non affecté.
La lecture du dossier choisi en supervision ADMIN effectif et l’exécution pour
son équipe doivent rester distinctes ; correctif séparé 435 sans nouvelle permission.

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
- 435 : listForges seulement résout le dossier explicitement sélectionné pour
  ADMIN effectif via getOperatorContext canonique, god-mode déjà existant compris,
  sans équipe par défaut. canResume dépend de l’affectation actuelle ; lecture
  seule sans bouton si absente. Mutations/getForge/getAssetVersion restent
  strictes ; aucun rôle/affectation/droit/allowlist modifié.
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
24,02 s, cause non démontrée. CI/image/runtime 434 reçus, auth 433 incluse sans
runtime autonome ; native tracker 403/écran non reçu, trace tronquée et H1 borne
tardive sans zéro exhaustif ou SLO déduit. 435 : deux rouges/49 verts puis 51 PG
ciblés verts. Native locale par URL connue sur deux dossiers/deux équipes : chacun
sa tâche en lecture seule/canResume=false, sans bouton ni secret. Actualiser
HTTP 200/zéro exception dans une fenêtre complète ; copie FR finale relue, fixture
nettoyée. Sélecteur local 0/0 historique. Gauntlet local final 435 cinq exit 0,
gouvernance 1620/166/24 warnings préexistants ; PG complet seul 274/14 en 41,09 s,
Ptah 51 inclus. Suite globale 435 non répétée localement ; CI 435 reçue
4180/399 unitaires et 274/14 PG, image/runtime exacts source d554276e reçus.
Native réelle SPAWT listForges HTTP 200/zéro ligne : refus 403 disparu, suivi
vide reçu. Fenêtre complète 63 réponses/aucune ≥500/zéro exception/log, sans SLO
déduit des bornes tardives. Liste réelle du sélecteur reçue après chargement,
0/0 initial transitoire ; passage par son lien vers le portefeuille groupe
FrieslandCampina non pilotable reçu en lecture seule, portée et ambiguïtés
rendues. Cette navigation ne reçoit aucune métrique isolée, production/reprise
réelle, validation S ou cycle client. Reload local tronqué historique conservé.
[Bornes et preuves](../RECEPTION-PTAH-REPRISE.md). ADR reste Proposed.
Réponses fournisseur incertaines, preuves historiques irrécupérables, lineage
source complet, coût facturé et cycle client intégral restent à recevoir.
Les sept chantiers et les dix gates globales demeurent ouverts.
