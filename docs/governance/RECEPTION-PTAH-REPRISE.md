# Ptah — reprise d’une demande différée et sceau du brief

État au 2026-10-09 : fix session 6.27.433 dédié, puis prototype Ptah/sceau
6.27.434, **tous deux non livrés et non acceptés**.
ADR-0213 Proposed ; dossier privé release/preuves-reprise-ptah-434, repère de
preuve et non reçu de livraison. Production reçue demeure 432. Tous les chantiers et gates
programme restent non acceptés ; aucun cycle SPAWT/Noël ou fournisseur reçu.

## Prérequis de session — correctif 433 local

OPERATOR reconnu/canOperate=true, mais strategy.list vide : le callback de session
ne transmet pas operatorId. Correction existante auth/config/types : relire
l’affectation actuelle en base à chaque session, aucun tenant mis en cache JWT
ni changement de rôle/droit. Tests réaffectation/révocation/base indisponible :
trois rouges puis trois verts. La page native retrouve la marque. Ce correctif
est isolé dans le commit d973f735, non poussé/non livré à ce stade. Livraison
prévue dans le bundle 434, aucun runtime 433 autonome. Réception locale finale
après découplage : suite canonique 4 180/399, PostgreSQL 270/14 et gauntlet cinq
exit 0 reçus ; CI/image/runtime restent à recevoir.

## Contrat candidat 434

La mutation ptah.materializeBrief et l’Intent PTAH_MATERIALIZE_BRIEF existants
acceptent resumeTaskId. Les deux entrées tRPC sont strictes : reprise ou nouveau
brief ; leur mélange est refusé BAD_REQUEST avant émission/tâche. Le reçu initial
reste l’autorité du brief : propriétaire,
marque, campagne/brief/actif source, paramètres et sceau individuel contrôlés.
La reprise ne rejoue pas les overrides historiques et repasse les gates actuelles.
Absence de configuration : même tâche DEFERRED, aucune nouvelle matérialisation.
Réservation compare-and-set persistée avant appel réseau ; une concurrence ou
une demande déjà envoyée retourne son état sans nouvel appel. Réservation sans
réponse connue : rapprocher le reçu, aucune réémission aveugle. COMPLETED sans
version matérielle est refusé ; taskReceipt retourne les IDs AssetVersion
existants/scopés, exigés non vides par manifest/schema pour COMPLETED. La reprise
sans configuration et le refus d’un
reçu altéré sont reçus nativement sur fixture locale ; concurrence/interruption
et fournisseur réel restent à recevoir sur les surfaces concernées.

PtahKilnTracker existant est monté dans la page forge existante. Son layout
OperatorSurface bloque le montage des enfants pour canOperate=false ; les
procédures serveur restent opérateur. Le tracker propose liste paginée, états,
attentes/erreurs, montant persisté ou estimation/inconnu, confirmation de reprise
et disponibilité déclarée des adaptateurs. Configuration globale d’environnement,
authentification fournisseur et facture réelle ne sont pas reçues par cet écran.
Aucun service/router/Intent/modèle/agent/droit/page ajouté. Le faux état
« Stratégie Validée » depuis ACTIVE (défaut Prisma) est corrigé dans le candidat :
la page exige aussi synthesisConfidence.validationStatus=VALIDATED, sans valider
un noyau réel par cette correction d’affichage. Confiance S absente affichée 0 %
et validation forçant 1.0 sans S composé restent des défauts distincts planifiés.

Sceau v2 sur IntentEmission.version existant : JSON canonique récursif et version
inclus, périmètre d’émission result:null. v1 conservé ; legacy non recalculable
dit non vérifiable, pas altération prouvée ni validation rétroactive. Le sceau
individuel ne certifie ni l’ascendance complète, ni la complétion mutable.
Horodatage après verrou par stratégie, forcé après le prédécesseur : si l’ancien
timestamp est futur, cet emittedAt garantit un ordre logique, pas l’heure métier
ni la fraîcheur des anciennes lignes. startedAt est distinct, réel et capturé
après verrou ; les durées ne partent plus de l’emittedAt logique futur.
Les ambiguïtés historiques ne sont pas
réécrites. Une fenêtre de vérification bornée et son ancre ne sont pas une
certification de toute la chaîne.

## Reçus intermédiaires

Logs privés relus : émission, deux rouges JSONB/chronologie ; reprise, trois
rouges avec 35 cas non exécutés ; puis 46 PostgreSQL ciblés verts sur deux fichiers.
Complément avant découplage des dates : PostgreSQL complet 270/14 verts ; Ptah ciblé 47 cas avec
pagination, secret filtré, révocation et entrée hybride. Rouge hybride puis vert :
les deux formes strictes refusent le mélange avant effet. Réinjection du sceau
sans tri récursif rouge, source restaurée puis cinq PostgreSQL verts.
La suite tests/unit seule a exposé COMPLETED sans références matérielles :
4 137 verts/un rouge sur 397 fichiers, en excluant les deux fichiers src/__tests__ :
ce passage n’était pas la suite globale. Correction du reçu/manifest/schema sans
supprimer l’ancien refus, assertion PostgreSQL replay renforcée puis 270/14 à nouveau verts ;
quatre cas unitaires ajoutés pour bon reçu et IDs absent/vide/invalide.
Passage avant découplage des dates, après gardes : types/lint/lint:governance/
cycles/gouvernance exit 0,
1 620 gouvernance/166 fichiers et 24 warnings préexistants. Suite globale exacte
npm test -- --run reçue après ajouts : 4 180/399 verts, aucun échec withRetry dans
ce passage. Dernier défaut introduit corrigé avant livraison : ancien timestamp
futur de 60 s, clock-red.log un rouge/quatre verts ; startedAt réel séparé de
emittedAt logique, clock-green.log cinq verts. Cas existant renforcé par
closeEmission réel, bornes de startedAt et durée non négative ; hash encore
vérifiable après clôture. Reçu de ce scénario seulement, aucun SLO global déduit.
Première suite PG après dates, simultanée avec tsc/suite globale : 269 verts/un
rouge, spawnSync du test cross-process change-request ETIMEDOUT à 20 s ; pas
une assertion fonctionnelle. Log conservé, aucun seuil changé/test réduit ;
relance PG complète seule reçue verte, 270/14 en 24,02 s. Cause du timeout non
démontrée, aucune contention racine déduite de cette seule comparaison.
Réception locale finale post-découplage : suite canonique npm test -- --run
4 180/399 exit 0, consignée 09:38:28 ; gauntlet cinq exit 0 et gouvernance
1 620/166, 24 warnings préexistants/zéro erreur, consignés 09:43:32 ; PG complet
seul 270/14 exit 0, consigné 09:44:28. Ces reçus ne valent ni CI/image/runtime,
ni réception des SLO globaux ou de cycles réels.

Commande CLI réellement exercée sur 1 002 lignes synthétiques : historique
intact --all reçu, fenêtre 1 000 explicitement bornée ; reçu ancien altéré hors
fenêtre non détecté par cette seule fenêtre, refusé par --all. Legacy non
vérifiable et absence de sceau refusés ; fixture CLI nettoyée, zéro ligne restante.
Aucune certification de l’historique de production déduite de cet exercice.

Gestes natifs locaux reçus : marque retrouvée après fix session, reprise d’une
DEFERRED HTTP 200 sur le même taskId, toujours DEFERRED et aucun fournisseur
appelé ; reçu original altéré HTTP 412. Le dirigeant USER sans affectation voit
OperatorSurface « pris en charge par votre équipe » ; nouvelle mesure avec les
bons sélecteurs : zéro production-tracker et zéro « Vérifier et reprendre ».
Erratum de mesure : les anciens compteurs utilisant ptah-kiln-tracker et
ptah-forge-row ne sont pas des preuves. Le composant réel est production-tracker,
ses lignes portent data-task-id. La nouvelle recette avec ces sélecteurs reçoit
20 puis 22 lignes, 22 uniques, tous les identifiants fixture et l’original présents,
sans bouton de page suivante restant. Aucun compteur issu des anciens sélecteurs
n’est retenu. Tracker EN/ZH rendu, FR restauré ; aucune forge intégralement
traduite déduite.

Fenêtre native finale complète, non tronquée/hasMore=false : zéro exception
observée, DOM 1 131,1 ms ; titre seulement lu tardivement après un premier wait
3 s échoué, borne supérieure 56 093 ms. Le relevé antérieur H1 ≤ 2 043 ms avait
un tracker non prêt : aucun assemblage de ces mesures en latence ou SLO.

Stress complet isolé exit 0 : 46 HTTP reçus/235 non reçus/zéro échec, trois queries
anonymes sondées, sept kinds et transitions locales. Base générale refusée
SHARED_DATA, puis DB dédiée fraîche ; cinq fournisseurs indisponibles et fetch
externe réellement refusé sur example.invalid. Deux premiers runs sans HTTP
restent non reçus. Runs suivants : 23 puis sept FETCH_FAILED lors du redémarrage
Next dev à 80 % du heap ; logs conservés. Dernier passage : heap local 8 192 MiB
seulement, aucun réglage production ni affaiblissement des tests.
Wrapper local dédié, sans credentials/fetch externe ; harnais général non
réparé. Aucune native protégée, phase 3 Glory ou fournisseur réel reçu par ce
stress ; celui-ci précède les gardes hybride/COMPLETED et le découplage des dates,
pas une preuve de leurs cas ni un stress de la source finale exacte.
Avant nettoyage : 35 DEFERRED, zéro providerTaskId/version/coût/actif/émission.
Après nettoyage stress/native : compteurs fixture à zéro ; ErrorVault de test
conservé. Suite globale 4 180/399, gauntlet et PG 270/14 finaux locaux reçus après
découplage ; parcours restants, CI/image/runtime et déploiement
434 restent en attente.
Preuves : emission-red.log, red.log, emission-green.log du dossier privé, sans
payload, identifiant privé ni secret recopié ici.
Complément : session-red.log/session-green.log, postgres-final.log,
types-final.log, gauntlet.json, seal-cli.json, native-resume-response/events/
native-refusal et native-pagination-final/founder-final/locales/final ;
stress-test-2026-10-09T07-57-54.json, stress-cleanup.json, hybrid-input-red/green,
seal-guard-red/green, completion-guard-green, unit-final.log et clock-red/green.
Aucun résultat de livraison inféré de ces reçus locaux.

## Réception restant requise

Achever les refus/gestes restants : étranger/legacy non vérifiable,
concurrence et reprise sans doublon,
interruption après réservation et état incertain sans nouvel appel. Puis rôles
OPERATOR/FOUNDER natifs complets et reçu fournisseur réel de tâche ;
stress des parcours restants et
CI/image/runtime exact.
L’accès à des clés n’est pas une preuve de production ou de facture fournisseur.

Provenance documentaire/invalidation/activeBriefId, filiation complète,
conservation des octets/CDN, Canva/Figma, coût facturé et fermeture durable du
journal restent distincts. Aucune résolution rétroactive de toutes les anciennes
empreintes, aucune reprise automatique ou configuration Connexions promise.
[ADR proposé](adr/0213-deferred-production-resumption-and-seals.md) ·
[résidus et déclencheurs](RESIDUAL-DEBT.md).
