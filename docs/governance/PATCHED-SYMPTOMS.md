# PATCHED SYMPTOMS — journal heuristique des fixes en passant

> Doctrine : [NEFER.md §3.4](NEFER.md) — interdit absolu n°4 (« un problème découvert se résout, se
> patche-et-trace, ou se planifie — jamais ne s'enterre »).

Ce registre journalise les **réparations en passant** de défauts **pré-existants** (que NEFER n'a pas
introduits) croisés en cours de route. Il n'est **pas** un backlog : ce qui y figure est **déjà réparé**.

**À quoi il sert** : chaque ligne consigne un *patch de surface* + une *hypothèse de cause racine*.
Quand plusieurs lignes convergent vers la même hypothèse, c'est le signal — mesuré, pas intuité — qu'un
**diagnostic de fond** est mûr. L'accumulation est le matériau heuristique ; la relecture est le
diagnostic.

**Ce qui va ICI vs ailleurs** (arbre §3.4) :

| Situation | Registre |
|---|---|
| Défaut pré-existant **réparé en passant** (rayon borné, prouvé tsc/lint/test/repro) | **PATCHED-SYMPTOMS.md** (ici) + `fix(...)` dédié |
| Défaut pré-existant **non réparable en passant** (refactor large, env à clés, décision opérateur) | [`RESIDUAL-DEBT.md`](RESIDUAL-DEBT.md) **avec plan + déclencheur** |
| **Bloqueur externe pur** (clé/contrat/choix business non-écrit) | Escalade opérateur (jamais enterré) |

**Relecture obligatoire** : `nefer-boot` Phase 0.2.bis (début de session) et `nefer-postmerge` 9.5.bis
(après merge) relisent ce fichier + RESIDUAL-DEBT et tentent de refermer le refermable. Les deux
registres sont **transitoires** : un diagnostic de fond qui ferme une cause racine **purge le jour même**
les lignes qui en dérivaient (+ mention CHANGELOG).

**Format d'une entrée** : `Date · Symptôme patché (où/quoi) · Commit · Hypothèse cause racine · Dette liée`.

---

## Entrées actives

2026-10-10 · **444 livré, réception bornée, fidélité des projections** : le même
normaliseur transformait absence de budget en zéro et échéance inconnue en
LONG_TERM, perdait l’origine qualitative et projetait des entrées sans texte ;
agrégations présentaient un total partiel comme complet. Cause : normalisation,
estimation de méthode et fait déclaré confondus, états perdus chez consommateurs.
Correctif conserve absent/zéro/DECLARED/QUALITATIVE_ESTIMATE/UNKNOWN, sous-total/
couverture et horizon absent ; source brute intacte, overrides opérationnels
conservés. Scénarios/formules conservés, baselines 30/60 explicitées ; helper
inutilisé de promotion floue retiré. partialRecord sur phases des routes sans
modifier seuils S. Onze rouges puis 47/cinq ciblés verts, unité 4 253/406 en
deux passages/PG 347/18 verts reçus. Trois rouges UI dus à pollution de fixture,
isolée par beforeEach, aucune garde affaiblie ; chemin ciblé roadmap erroné
conservé/couvert par suite complète. Native locale a révélé Base d’actions zéro
rendu « — XAF »/estimation non nommée : formatter falsy et origine non rendue.
Trois rouges/quatre verts puis sept verts ; relecture Budget à préciser/0 XAF/
Estimation · 500 k XAF reçue, trois choix USER/TRIAL 200. Estimation seulement
sur metadata QUAL/budgetMin=projectedBudget, pas sur override opérationnel.
Premier gauntlet tsc 2/autres quatre 0, annotation type roadmap corrigée ; unité
4 256/406 ensuite verte avant deux CSS mobiles, PG 347/18 inchangé. Native S
200/chiffrage partiel fidèle reçue ; titre écrasé par feedback et grille créative
serrée à 390 corrigés par header responsive/empilement puis visuellement relus.
UI 38/quatre verts après header ; aperçu créatif partiel/hypothèses 30/60 reçu,
ouvrir/Annuler sans création/IA. Desktop recapturé/Oracle HTML et PDF 18 pages reçus, données fidèles mais
finition PDF non reçue ; cinq contrôles finaux après CSS 0/gouvernance 1 624/166,
fixture nettoyée. CI après toutes CSS 4 256/406 et 347/18 PG verts ;
image/runtime 444 exacts reçus. Lecture réelle SPAWT ADMIN passive seulement,
S toujours Périmé, aucune mutation/recalcul réel ; sept réponses 200/trois
annulations dans la fenêtre complète, aucune mesure production/SLO reçue. Compteurs reçus seulement avant créatif/PDF.
Doublons McKinsey7S/ThreeHorizons, inconnus assimilés H2/100 %, locale SSR/client
Oracle et libellés/glyphes PDF non réparés dans 444 : plan/reprise 445 dans la
dette S existante, avant cycle réel. Aucune nouvelle entité/route/service/
Intent/ADR/provider, ni correction des budgets réels ou réception globale.
Devise des ancres, autres chemins S et projection/remap restent en dette.
[Preuves](REFONTE-PLAN.md) · [dette](RESIDUAL-DEBT.md).

2026-10-10 · **443 livré, causes UI reçues au périmètre** : droits globaux
opérateur confondus avec l’autorité sur une marque, boutons de mutation visibles
en lecture seule ; useBrandWriteAccess lit getMyAccess et sépare stratégie/
calendrier/sync, fermeture en absence/chargement/erreur, propriétaire conserve
recalcul manuel. Panel permissions false par défaut, proposition MANUAL/IA
facultative. Compteur I confondait formes du catalogue et projection : même
collectNormalizedInitiatives sur trois collections/déduplication, absence
inconnue distincte de zéro. Retour S exposait stage brut ; sauvegarde/proposition
à relire et refus métier, updated non vrai refusé. Treize rouges/huit verts,
huit retours rouges, puis 29/trois et 33/quatre verts ; premier checkpoint
unité/gauntlet reçu. Ambition LOCKED découverte active nativement : un rouge/
quinze verts puis 34/quatre verts et relecture native reçue. Catalogue source/
projection distingué, MANUAL sans IA, propriétaire non opérateur garde choix/
recalcul/Sync absent ; plan vide sauvegardé sans budget fabriqué. Lecture seule
reçue, fixture nettoyée ; unité finale 4 237/404 verte, cinq contrôles finaux à zéro/
gouvernance 1 624/166 reçus ; source c2a0b0f6/CI 38016938304/image
38017164762/runtime exact 443 reçus.
Lecture réelle ADMIN seulement, source 15/projection 36/28 retenues, formulaire
manuel sans soumission/ancien S non recalculé ; aucune mutation réelle ni recette
USER en production. Compilation/timeout conservés. Autorités serveur inchangées ; aucune clôture
globale des accès, budgets, projections ou autres chemins S.
[Preuves et bornes](REFONTE-PLAN.md) · [dette en place](RESIDUAL-DEBT.md).

2026-10-10 · **442 livré, deux chemins S convergent** : SYNTHESIZE_S
retournait des recommandations Notoria, la cascade S complétait par LLM et la
sauvegarde ne gardait pas les versions source du calcul. Deux entrées partagent
désormais calcul transactionnel/gateway, huit versions/absences contrôlées avant
upsert, REPLACE_FULL/historique/retrait de revue ; LOCKED/provenance refusés,
S exclu de post-complétion IA. Retrait des paddings et splits non sourcés,
draft sparse non approuvable selon contrat strict inchangé. Cause bornée :
calcul, assistance narrative et remplissage de forme confondus, snapshot source
non transporté au writer. Six rouges sur 441 puis 24 verts ; ciblé local final
70/trois fichiers reçu, full PG 345/18 avant derniers correctifs. Observation
locale USER/TRIAL recalcul 200/draft 35 %/budget 1 000 ; incohérences observées
puis patchées : R.coherenceRisks absent ne vaut plus 100, provenance de champ
INFERRED « Déduit — à vérifier » pour calcul ou IA, autorités inchangées.
Cause : absence assimilée à absence de risque et déduction assimilée à IA.
Cohérence un rouge puis un vert ciblé ; renderer fallback 0 erroné : sept rouges/
treize verts→vingt verts, « — /100 » inconnu/vrai zéro conservé. Cause : absence
perdue entre calcul et rendu. Native USER/TRIAL relue/rechargée, S v4/trois
archives/I v2 ; fenêtre recalcul complète/reload tronqué, aucun zéro global/SLO.
Fixture nettoyée. Premier gauntlet deux repères rouges corrigés sans nouvelle
exception ; finaux 4 210/401 unitaires/345/18 PG/cinq contrôles 0/gouvernance
1 624/166 reçus. Source f7f39c23/CI 38012819228/image 38012838924/runtime 442
exact reçus ; lecture réelle SPAWT ADMIN seulement, aucune mutation/recalcul
ou réception USER de production. Timeouts conservés, ancien S/budgets/roadmap
et copie succès technique en dette UX ; aucune acceptation globale.
Normalisation budget/absence/timeframe, roadmap, protocol index strict et autres
chemins S en dette Guidance existante ; compteur/boutons readonly ouverts.
Aucune acceptation globale. [Preuves](REFONTE-PLAN.md) · [dette](RESIDUAL-DEBT.md).

2026-10-10 · **441 livré, choix/projection reçus localement** : SELECT
modifiait seulement BrandAction, puis le refresh réécrivait le choix/planning
et le calcul promouvait des propositions. Le choix passe désormais par I
versionné et BrandAction atomiques, même Intent/contexte ; refus du writer rendu
au routeur. La matérialisation protège données d’exécution/lignes manuelles ;
provenance limitée au statut de l’initiative identifiée, sans figer le catalogue.
Calcul uniquement SELECTED_FOR_ROADMAP, aucune promotion ni LLM implicite.
Cause bornée : décision, proposition et projection d’exécution confondues ;
verrouiller toute une collection aurait aussi empêché son renouvellement.
Onze rouges→onze verts puis régénération un rouge/douze verts→treize verts ;
PG final 335/18 verts, dix-huit cas de choix, provenance 17/17/gateway 25/trois.
Transaction partagée withPillarTransaction, deux refus du premier gauntlet
réparés sans ajouter d’exception. Bump/CODE-MAP effectués, cinq contrôles finaux
exit 0 (24 avertissements connus), gouvernance 1 624/166 verts. Le panel invalide
get/assess/readiness après succès, bloque le choix en cours et affiche les refus
choix/sync en alerte métier ; cause UI bornée : succès/fraîcheur/refus mal relayés.
La projection suit le statut I dont le gateway conserve le choix humain.
Budget hérité vide reprenant le montant source 1 000 reçu après un rouge,
affiché 1k XAF nativement. Native locale USER/TRIAL retenir→sync→retirer/refus
LOCKED reçus, cache relu ; ART_DIRECTOR ACTIVE d’un autre opérateur refuse
403/FORBIDDEN avec alerte métier, I/versions/archives inchangés. Stress
mock/base seulement, pages/tRPC SKIPPED ; source 3a8a2c97/CI 38008417812
success (4 203/401 unitaires, 335/18 PG), Mission/Chromatic success ;
image 38008635901/runtime 441 exact reçus, index 5d95a400. Lecture réelle SPAWT
ADMIN reçue sans mutation ; USER/TRIAL et ART_DIRECTOR uniquement locaux.
Ancien S/budgets, boutons hors zone/compteur catalogue,
SYNTHESIZE_S, post-complétion IA et versions source de la cascade, remplissages S historiques demeurent dans
la dette Guidance ; aucune acceptation globale ni nouvelle capacité.
[Checkpoint et limites](REFONTE-PLAN.md) · [dette liée](RESIDUAL-DEBT.md).

2026-10-09 · **440 livré, garde d’accès reçue localement** : actions.sync
rematérialisait BrandAction sous la seule appartenance opérateur. Le contrôle
calendrier existant assertCalendarWrite est désormais appliqué avant le writer,
mêmes autorités ; NOT_FOUND pour cible absente USER, contrôle ADMIN conservé.
Cause bornée : reconstruction de projection traitée comme neutre malgré ses
écritures. Baseline accès quatre rouges/deux verts puis six verts ; PostgreSQL
cinq rouges/trois verts puis huit ciblés/complet 317/17 verts. Native locale
403 conserve la ligne ; propriétaire 200 perd encore selected/SCHEDULED,
contre-exemple non réparé dans la dette Guidance existante. Source e217c08e/
CI 38001813652/image 38002258278/runtime 440 exact et contrôles finaux reçus.
Lecture réelle SPAWT USER PÉRIMÉ/deux 100 % seulement, aucune sync de production,
décision réelle ou fournisseur ; sept chantiers/dix gates ouverts.
[Preuves et bornes](REFONTE-PLAN.md) · [dette liée](RESIDUAL-DEBT.md).

2026-10-09 · **439 livré, cause d’affichage/corpus fermée** : PillarPage affichait Complet à partir
de assess.currentStage malgré readiness stale/Périmé, avec un autre badge de
validation. Un seul Badge lit désormais pillar.readiness ; chargement/échec
restent inconnus, pourcentages nommés comme présence des champs, couleurs selon
DISPLAY_AS_COMPLETE. Rafraîchissement commun contenu/assess/readiness, y compris
onComplete du recalcul existant, ligne wrap. Cause bornée : présence, fraîcheur
et revue confondues par deux projections UI et des callbacks incomplets.
Six cas de rendu rouges puis checkpoint 57/trois verts ; ciblées finales 58/trois,
sept UI dont fondation needsHuman. Première compilation rouge stageLabel TS2552
dans le panel needsHuman après retrait du mapping local : badge secondaire
restant supprimé, tsc-final vert. Cinq contrôles complets relancés exit 0,
gouvernance 1 620/166 ; gauntlet-final.json/gauntlet.json finaux verts, première
erreur conservée sous first-gauntlet/ et gauntlet-first.json.
Six mentions canon
SPAWT/copy actuelle à cinq questions corrigées en six/cinq axes, sans réimport.
Cause : corpus réimportable resté sur la description antérieure du quiz.
Build compilée exit 0/native locale USER/TRIAL fictive reçue : Périmé avec deux
100 %, captures desktop/mobile inspectées ; 65 réponses/zéro ≥500/exception,
14 ERR_ABORTED annulés, badge dans les bornes à 384 px mesurés. Fixture nettoyée,
serveur arrêté/onglet fermé ; premier sélecteur S — Roadmap erroné conservé,
titre réel Stratégie, pas défaut produit. Source b0399f4f/CI 37997965596 (4 197/401
unitaires, 309/16 PG)/image 37998236655/runtime 439 exact reçus. Native réelle
SPAWT USER lecture seule : PÉRIMÉ avec deux 100 %, 116 réponses toutes 200/zéro
≥500/exception, 32 ERR_ABORTED conservés ; notice initiale fermée normalement,
capture inspectée. Aucune approbation/réimport/production, budgets/formes strictes/
cycle et sept chantiers/dix gates ouverts. [Plan et preuves](REFONTE-PLAN.md).

2026-10-09 · Infra 438 livrée, lot applicatif 437 inclus : job PostgreSQL
114024488078/run 37990904417 bloqué avant checkout après trois retries, quota
anonyme Docker Hub. Tous les autres jobs applicables sont verts ; aucun test
PG CI exécuté dans ce job. Acquisition ECR des mêmes Docker Official Images
PostgreSQL 16/16-alpine et Node 22-bookworm-slim, index épinglés après égalité
des trois corps Hub/ECR et références amd64, six réponses 200. Frontend BuildKit
embarqué sans directive #syntax, aucun nouveau job/service/action ni suppression
du test. Cause bornée : disponibilité d’acquisition externe assimilée à verdict
applicatif. Préflight puis source 912e481e/CI 37992424716/image 37992697193/runtime
438 exact reçus, PostgreSQL effectif 309/seize ; pins à maintenir explicitement
après comparaison et validation. Native plan réel SPAWT en lecture seule reçue,
61 réponses/zéro ≥500/exception, 14 annulations réseau conservées ; modal
« Quoi de neuf » masque d’abord le titre, borne tardive pas premier affichage/SLO.
Forge SPAWT réelle également reçue en lecture seule : 65 réponses/zéro ≥500/
exception, 17 ERR_ABORTED annulés ; S v3 AI_PROPOSED/91,2 % non approuvable.
COMPLETE/100 par présence mais stale/Périmé et affichage complet/export refusés
contredisent le plan Complet : symptôme non corrigé, inscrit dans la dette S.
Aucune marque réelle modifiée/approuvée/recalculée ; écarts de contenu ouverts,
sept chantiers/dix gates ouverts. [Périmètre et sources](../deploy/BUILD-DEPORT.md).

2026-10-09 · 437 livré dans le bundle 438, contre-exemples PostgreSQL reçus : régénérations S
appendant les anciens plans à toute profondeur, writer/PROTOCOLE_S donnant une
approbation implicite et Strategy VALIDATED survivant à une nouvelle version ou
dépendance. Le gateway remplace les collections S, archive l’ancien contenu et
rétracte les anciennes approbations dans la transaction ; dépendance modifiée
garde S LOCKED/stale. Restauration exige une nouvelle revue et null reste null.
canon-sync passe son import/recalcul S par le gateway et remonte les refus ;
exception directe S retirée, vector reste projection légitime. Cause bornée :
fusion d’une collection source confondue avec remplacement d’un plan dérivé,
et statut de revue traité comme propriété transmissible du contenu. Ordre source
→ Strategy UPDATE → piliers évite l’upgrade SHARE→UPDATE entre deux writers.
Dix rouges/trois verts puis treize verts ; checkpoint 70/quatre fichiers ;
checkpoint complet 304 PostgreSQL/seize fichiers verts, seize cas S dont rollback réel/retry,
sources distinctes et refus sans ghost row. Cleanup FK intermédiaire conservé
puis fixture corrigée/nettoyée. Ce checkpoint précède l’extension et les recettes
finales ci-dessous ; CI/runtime désormais reçus par 438. Choix/calcul/contrats/
consommateurs restent dans la dette S unique.
[Réception livrée et limites métier](RECEPTION-ECRITURE-SYNTHESE.md).

Extension du même lot : review-invalidation.ts factorise la rétraction/staleness
pour gateway, correction/suppression/révocation documentaires et les deux writers
du staleness-propagator. Correction réelle ingestion.updateSource et révocation
d’usage partagé isolées du propriétaire/autre dossier : trois nouveaux PG verts.
La propagation d’âge recherchait key S alors que le stockage est s : un rouge/
un vert reproduits, lookup lowercase réparé ; deux PG true/false exécutent
propagateFromPillar, Process seulement en mode auto existant/zéro fetch. Cause
bornée supplémentaire : marquage stale dupliqué sans rétraction de revue et casse
de clé divergente. Strategy UPDATE triées avant piliers/sourceUse directement
UPDATE ; 21 S ciblés verts. Le complet 304/seize reste antérieur à ces cinq cas,
suite complète finale 309/seize reçue, 21 S inclus. Premiers offsets gateway des
gardes unitaires/gouvernance corrigés 724/755. HARD collections rouge exit 1 puis
restauration exacte/vert exit 0 reçu ; unitaire complet 4 189/4 190, seul délai
withRetry 102 ms/seuil <50 sous charge build, premier rouge conservé. Recontrôles
36/1 puis complet 4 190/400 verts sans changer le test, aucune correction produit
du délai déduite. Cinq contrôles finaux exit 0/gouvernance 1 620/166 verts ; build
isolé terminé exit 0. Native locale USER/TRIAL : approbation S null v1, vraie
écriture v2 retire revue S/Strategy, proposition à relire puis nouvelle
approbation v2/200/null. Stress isolé compilé exit 0/zéro finding, 46 HTTP reçus/
235 non reçus/sept DEFERRED sans fournisseur, estimation zéro/sans providerTaskId
dans la fenêtre 20:49:00–20:49:23 UTC. Sept tâches/quatre marques synthétiques
nettoyées/remaining=0, serveur isolé arrêté ; scan final.json historique écarté.
Fenêtre native complète bornée avec 17 annulations réseau conservées ; aucun
import canon-sync privilégié natif, aucun noyau réel approuvé/cycle reçu ; livraison reçue
par le bundle 438, aucune acceptation globale
ni réception globale de l’agentique déduite.

2026-10-09 · 436 livré au runtime, correctif reçu sur contre-exemples PostgreSQL locaux
et quatorze cas ciblés verts : confiance absente rendue 0 %, confirmation transformant la mesure
en 1.0 et S absent pouvant valider Strategy. Les deux routes de validation utilisent
la même décision d’état dans pillar-gateway ; composition, version relue et
sources exigées, confiance conservée, S/Strategy atomiques. La page existante
sépare confiance inconnue, composition et approbation ; projets issus des
initiatives contrôlent S approuvé avant leurs effets. Cause bornée : mesure,
composition et décision humaine confondues, avec deux écritures de validation
indépendantes. Revue native : la boîte Risque affirmait encore que les briefs/KPI
reposeraient sur des hypothèses non validées, conclusion non établie par une
confiance faible/null. Boîte retirée et lien renommé « Relire la synthèse et ses
sources », même route ; copie finale native reçue, aucune hypothèse certifiée
par ce retrait. Native locale synthétique absence/partiel, confirmations gardant
22 % ou mesure inconnue et conflit 409 puis nouvelle lecture reçus, sans production.
Suites locales complètes 4 190/400 unitaires et 288/15 PG vertes ; stress global
en échec. Confidence=1.0 réintroduit : trois cas rouges puis
trois verts après restauration exacte, onze non sélectionnés ; aucune marque réelle approuvée.
Gauntlet final cinq exit 0/1 620 gouvernance, fixture nettoyée et serveur arrêté ;
Source 80e2122f/CI 37979818869/image/runtime reçus ; lecture réelle SPAWT S existant,
confiance 91 %/AI_PROPOSED v3 non approuvable reçue, aucune approbation ou production.
Contrats de composition en désaccord, dette S maintenue ; documentation/postmerge
et audit global distincts, aucun stress vert déduit.
Couverture globale des écrivains/
consommateurs et concurrence entre
précondition et création de projets restent dans RESIDUAL-DEBT.
[Réception en cours](RECEPTION-VALIDATION-SYNTHESE.md).

2026-10-09 · 435 livré, réception partielle : tracker réel 403 en 434 pour compte
sans affectation malgré rôle ADMIN effectif. listForges seulement résout le dossier
explicitement choisi via getOperatorContext canonique ; canResume selon
affectation actuelle, lecture seule sans bouton si absente. Mutations et autres
lectures gardent cette affectation stricte, aucun droit/équipe/rôle nouveau.
Deux rouges/49 verts puis 51 PostgreSQL ciblés verts. Cause : supervision du
dossier choisi et capacité d’exécuter pour son équipe étaient confondues dans
le même résolveur. Native locale par URL connue sur deux dossiers/deux équipes :
chacun sa tâche, lecture seule/canResume=false, sans bouton ni secret. Actualiser
HTTP 200/zéro exception dans une fenêtre complète ; copie FR finale relue,
fixture nettoyée. Sélecteur local 0/0 historique ; gauntlet 435 cinq exit 0, gouvernance
1620/166/24 warnings préexistants, PG complet seul 274/14/Ptah 51 inclus reçus.
CI 435 : 4 180/399 unitaires et 274/14 PG/image/runtime reçus. Cause du403 en supervision
fermée : native SPAWT listForges HTTP 200/zéro ligne, suivi vide reçu ; fenêtre complète
63 réponses/aucune ≥500/zéro exception/log. Liste du sélecteur reçue après chargement,
passage par son lien vers le portefeuille groupe FrieslandCampina non pilotable
reçu en lecture seule, portée/ambiguïtés rendues, sans métriques isolées. Pas de
reprise réelle/ADMIN sans affectation reçue ni SLO déduit des reloads ou bornes
tardives production. [Bornes](RECEPTION-PTAH-REPRISE.md).

2026-10-09 · Fix session 433 dédié : OPERATOR/canOperate=true, mais strategy.list
vide faute d’operatorId dans la session. Callback auth et types existants relisent
l’affectation actuelle en base à chaque session, sans tenant JWT ni rôle/droit
nouveau. Trois rouges puis trois verts réaffectation/révocation/base indisponible ;
la page native retrouve la marque. Cause : rôle reconnu et portée courante de
l’équipe étaient assimilés. Code livré avec le bundle 434, recette métier locale,
sans runtime 433 autonome ni élargissement d’accès annoncé.

2026-10-09 · Code Ptah 434 livré au runtime, recette locale : ACTIVE (valeur Prisma par défaut)
affichait « Stratégie Validée » sans validation enregistrée. La page forge exige
aussi synthesisConfidence.validationStatus=VALIDATED. Cause : état de dossier
et décision de validation confondus. Aucune validation de marque réelle déduite,
confiance absente affichée 0 %/validation à 1.0 sans S composé restent dans
RESIDUAL-DEBT. Contrôles finaux post-découplage : suite canonique 4 180/399,
270 PostgreSQL/14 et 1 620 gouvernance/166, 24 warnings préexistants.
Stress isolé reçu avant les dernières gardes ; ses limites, les parcours restants
et les parcours réels demeurent distincts ; native tracker refusée 403,
correctif de lecture435 séparé livré, suivi vide SPAWT reçu. Timeout PG concurrent conservé,
relance complète seule verte/cause non démontrée.

2026-10-09 · Code 434 livré au runtime, preuves locales : une émission inchangée
ne se recalcule pas après lecture JSONB ; l’horodatage pris avant verrou peut
ordonner les nouvelles lignes avant leur prédécesseur. Spine commun/hash-chain,
deux rouges observés puis suite ciblée 46 PostgreSQL verte. JSON canonique
récursif/versionné v2 et temps strictement croissant sous verrou ; v1 et payloads
historiques conservés, legacy non recalculable dit non vérifiable plutôt
qu’altéré. Cause bornée : sérialisation et ordre d’écriture n’étaient pas un
contrat stable de relecture. Tri récursif retiré volontairement : rouge puis
source restaurée, cinq PostgreSQL verts. Suites canoniques/gauntlet après gardes
verts après découplage des dates ; parcours restants à recevoir. Contrôle
individuel hors ascendance/complétion mutable. Le rapprochement historique et
la fermeture durable restent planifiés dans RESIDUAL-DEBT, aucun journal
globalement certifié. CLI réellement reçu sur 1 002 lignes synthétiques : fenêtre
1 000 bornée/--all et refus legacy non vérifiable/sans sceau ; reprise native
même tâche DEFERRED/refus HTTP 412 reçus localement, pas parcours de production ou contrôle
de tout l’historique de production. emittedAt forcé après un prédécesseur futur
constitue un ordre logique, aucune preuve d’heure métier/fraîcheur historique.
startedAt est désormais réel et séparé après verrou ; scénario horloge future/
clôture reçu localement, aucune réception de SLO global.
[ADR-0213 Proposed](adr/0213-deferred-production-resumption-and-seals.md).

2026-10-08 · Ptah écrivait ses coûts de forge dans un journal zéro-token attribué
à Anthropic : montant zéro même lorsqu’un résultat persisté portait un autre
montant/fournisseur. v6.27.425 transmet ces valeurs checkpointées dans la
transaction d’admission et répare ce cas legacy strict sans nouveau reçu ni
nouvelle charge. Les identifiants de parent inventés dans le commandant sont
aussi remplacés par la vraie émission pour les futures forges. Cause plus large :
forme LLM, filiation et preuve fournisseur étaient assimilées. La cause
COMPLETED avant coffre est corrigée et retirée de RESIDUAL-DEBT.
Vingt-quatre tests PostgreSQL locaux verts ;
les factures absentes, références business upstream, octets/CDN et close du spine
restent distincts, planifiés dans RESIDUAL-DEBT. Code 425 reçu en production
le 8 octobre ; aucun fournisseur ni cycle de forge réel reçu.

2026-10-08 · L’instrumentation Edge tentait de résoudre `http` via web-push
malgré le retour anticipé `NEXT_RUNTIME !== "nodejs"`. v6.27.424 enveloppe les
imports Node dans une branche positive `NEXT_RUNTIME === "nodejs"`, reconnue
par webpack. Échec de compilation reproduit, puis démarrage et quatre réponses
HTTP locales reçus. Cause : une garde d’exécution ne délimitait pas les imports
pour le bundler Edge. Portée démarrage seulement ; aucune production reçue.

2026-10-08 · `strategy.update` recevait id mais pas strategyId : sa mutation
gouvernée pouvait réussir sans émission scoped sur la marque. Le test de
publication a échoué sur ce reçu manquant avant correction. v6.27.423 résout
strategyId dans le schéma avant gouvernance, sans second champ de formulaire.
Cause : identité du contrat natif et pivot de gouvernance étaient divergents.
ADR-0209 reçoit cette voie ; la portée des autres écrivains et la fermeture
durable de l’émission restent au registre de dette, sans succès global présumé.

2026-10-08 · Le système produit affichait ses ids de catalogue et perdait
l’origine du champ sur les sous-cartes ; le fond des gammes rendait leurs
conditions peu contrastées. Le lot 420 relit les noms sans changer les données,
relaie l’origine existante et retire la couleur/largeur progressive par index.
Le résolveur commun refuse les homonymes au lieu de choisir le premier.
Cause : relations et provenance étaient rendues comme des données isolées.
Réception source documentaire, disponibilité et publication restent distinctes.

2026-10-08 · L’amendement ignorait les reçus documentaires, le MCP ne transmettait
pas la version lue, et Recommendation attribuait une validation humaine à l’agent.
Un refus de provenance était aussi accusé comme APPLIED. v6.27.419 raccorde le
contrat existant au contrôle transactionnel des sources, journalise MESTOR sans
revue humaine et refuse avant version tout amendement agent non autorisé. Cause :
métadonnées de preuve et accusé d’application divergeaient du writer. ADR-0206.

2026-10-08 · SET_FIELDS profond mutait aussi le précédent état et masquait la
différence au garde ; une source pouvait écraser une feuille de catalogue humain.
v6.27.418 clone profondément avant arbitrage. Le même lot factorise les ids au
point commun, retire les faux « déjà confirmé » des inférences canoniques et
rend confirmation/version/retrait legacy atomiques. Cause : référence mémoire
partagée et lecteurs/écrivains divergents. Contrats PostgreSQL adversariaux reçus ;
corpus réel et anciens remplisseurs séparés restent à recevoir, ADR-0205.

2026-10-08 · Catalogue : gratuit masqué, chaîne historique convertie en NaN,
conditions HT/TTC et périodes perdues ; prix de repli et moyenne non pondérée
alimentaient budget/CAC. v6.27.417 factorise lecture et abstention dans
product-catalog ; éditeur coût réaligné numérique, manifest budget en DB_READ.
La gamme expose ses références, son nom libre et les rangs admis par le schéma ;
les liens cassés, vides ou mal formés restent visibles au lieu de relire un vieux prix.
Hypothèse : les consommateurs assimilaient scalaire, panier et preuve financière.
Dette liée : projection économique locale / mesures datées, ADR-0204.

2026-10-08 · Les huit volets de marque affichaient « Déclaré » en l’absence
de fieldCertainty et ignoraient la provenance réelle conservée dans content.
v6.27.416 branche le kit partagé sur cette trace et rend l’origine absente
explicitement inconnue. Treize tests de lecture, dont douze rouges sur l’ancien
lecteur, couvrent les huit volets. Cause : deux métadonnées distinctes et une
absence de trace transformée en affirmation positive. Aucun contenu confirmé
automatiquement ; le rapprochement SPAWT reste ouvert dans RESIDUAL-DEBT.

2026-10-08 · Le portefeuille ignorait les BrandSourceUse pourtant reçus dans
Sources : Peak ne retrouvait pas le brief commun. v6.27.415 factorise la liste
canonique et ouvre le lecteur avec le dossier consommateur. La recette de
retrait a révélé un ancien texte en cache pendant la vérification et un refus
classé en erreur 500 ; le lecteur attend la réponse courante et getSource
traduit ce refus connu en FORBIDDEN, sans relances automatiques sur ce refus.
Les erreurs temporaires conservent leurs trois reprises. Causes : projection par propriété seule,
durée de vie du cache confondue avec la validité de l’accès, frontière tRPC
sans traduction de l’indisponibilité documentaire. Aucun droit élargi ; les
recettes bornées ne reçoivent ni arbitrage de corpus ni publication complète.

2026-10-08 · AmendPillarModal conservait proposition/motif entre deux champs et
acceptait une réponse tardive dans un autre brouillon. Une lecture actualisée
remplaçait aussi expectedVersion sous une saisie ancienne. v6.27.414 lie la
session au contexte, isole les brouillons et fige valeur/version ensemble.
Cause : durée de vie du composant confondue avec celle de la décision éditée.
Onze contre-exemples rouges ; douze tests verts, écriture/relecture et conflit
reçus nativement sur fixture locale. La conservation après interruption et le
raccord vers la publication restent des parcours distincts ouverts au registre.
Réception production 414 : changement de champ et réouverture dans SPAWT,
sans soumission ; seize piliers et six sources identiques après livraison.

2026-10-07 · Boot Phase 18 : l’exemple utilisait le littéral `pending`, rejeté
par l’enum Prisma. Commande corrigée en `PENDING`, exercée sur PostgreSQL local :
zéro résidu en attente. Cause : exemple non confronté au schéma ; aucun état
métier ni contrôle de production modifié.

2026-10-07 · Dossier SPAWT : deux cartes et un compteur doublé pour le même
lien de logo dans deux stratégies. v6.27.407 factorise la projection de lecture
par source et adresse de fichier, conserve chaque contenu/état/dossier et filtre
les archives avant regroupement. Trois contre-exemples rouges, rendu statique
reçu. Cause : une référence de rattachement était comptée comme un fichier distinct.
Réception native 407 : une carte, deux lectures distinctes, recherche et archives ;
mobile 390 × 844 et non-régression Noël reçus. Corpus et décisions restent ouverts.

2026-10-07 · Le retour flottant masquait l’action de dernière ligne d’une liste
filtrée, reçue au clavier mais interceptée à la souris. Le shell commun réserve
une fin de défilement en 406, pour les portails et la navigation mobile existants.
Cause : contrôle fixé au viewport sans espace réservé dans le conteneur défilant.
Réception souris et mobile CSS 390 × 844 confirmée ; le dernier bouton ouvre
le bon dialogue. Le contrôle reste borné à cette action.

2026-10-07 · Missions : la console affichait zéro alors que le détail ouvrait une
mission non assignée. PostgreSQL prouve que OR:[{},assigné] réduit au seul assigné.
v6.27.405 conserve la portée admin existante, sans changer les autres rôles.
Colonnes métier, besoin et erreurs de lecture remplacent les projections creuses.
Le cockpit comptait une mission active comme livraison à l'heure et comparait
un ratio courant à une période inexistante ; mesure déclarée indisponible.
Cause : portée vide et absence de reçu prises pour des filtres/valeurs ordinaires.
Réception native 405 reçue ; ADR-0201 borne le cycle déjà reçu en 404.

2026-10-07 · Recette locale : session API valide, pages 307 login ; le stress suivait
le login et annonçait un succès. v6.27.404 distingue transport HTTP local et TLS
public pour le nom/salt du cookie, sans changer les droits. Le contrôle HTTP
classe route finale, refus et absence, et construit correctement la racine.
Causes : NODE_ENV confondu avec HTTPS ; statut final confondu avec page demandée.
Contre-test réel : 230 refus détectés avant, zéro après ; 276 réponses reçues,
cinq routes demo non reçues. Couverture native/métier restante au registre.

2026-10-07 · Demandes : états incohérents, affectation non persistée, SLA et moyenne
de résolution fabriqués ; conversion/rejet concurrents pouvaient perdre la suite.
v6.27.404 raccorde le Signal existant à une Mission atomique et à un reçu commun.
Cause : deux taxonomies confondues et écritures indépendantes sans version lue.
ADR-0201 traite le cycle ; réception native et table dormante restent au registre.

2026-10-07 · Présentation publique : compteurs Artemis périmés, catalogue confondu
avec disponibilité, révision automatique et fin du travail manuel promises.
Le correctif de copy 403 décrit les rôles, choix humains et services configurés.
Cause : copy promotionnelle non confrontée aux registres et aux reçus de release.
Sept onglets reçus nativement le 7 octobre en 403. Les promesses des autres
sections restent une dette distincte ; cette réception ne vaut pas cycle complet.

2026-10-07 · Portfolio : une référence invalide masquait tout le tableau ; deux
éditions pouvaient écraser les liens récents. v6.27.403 préserve les entrées saines,
signale les rejets et compare la version dans l’écriture commune. Cause : lecture
all-or-nothing prise pour absence et remplacement de tableau sans précondition.
Identité d’instance traitée en ADR-0200. Ajout manuel reçu en production pour
Bonnet Rouge, Peak et Belle Hollandaise : même brief 491, instance radar-matanga,
origine barre-matanga / PRJ-EOTY26. La vue groupe reçoit un projet et un seul
accès FRC-076. Anciens raccords conservés ; aucun état métier recopié. La réception
de l'écran Radar, des autres rôles natifs et du cycle complet reste ouverte.

2026-10-07 · Gazette : mesure à la une contredite par son état vide, qualifications
fabriquées, demande assistée échouée affichée en exécution et reprise masquée.
v6.27.402 rend le constat factuel, les inconnues et l’échec visibles, avec nouvel
examen explicite. Cause : la curation d’une demande était prise pour l’état de son
résultat. Portée de marque et séparation observation/décision traitées en ADR-0199 ;
cycle métier, concurrence et anciennes prescriptions restent au registre de dette.

2026-10-06 · La fraîcheur documentaire ne comparait que la tête du texte et son
nombre de fragments ; la préparation complète réécrivait un second jeu. v6.27.399
factorise l’écrivain, compare toutes les empreintes et verrouille la source avant
le remplacement atomique. Six régressions reproduites ; panne et deux ordres de
concurrence reçus sur PostgreSQL. Cause : snapshot et projections sans frontière commune.

2026-10-06 · Le tableau de bord cherchait des piliers en majuscules alors que
les lignes portent les clés de stockage minuscules : A/D renseignés apparaissaient
vides. v6.27.398 réutilise la maturité canonique et distingue commencé/complet.
Le bouton « Sources » qui lançait l’IA porte désormais un verbe explicite et ses
erreurs sont visibles. Cause : résumés et libellés découplés de leur acte réel.
La recette a aussi montré que « Enrichir ADVE » appelait le remplissage des huit
piliers et qu’un résultat contenant huit échecs pouvait afficher « Terminé » :
le périmètre passe aux quatre fondations annoncées et les résultats partiels sont explicites.

2026-10-06 · La correction d’un document laissait son ancien index et ses valeurs
structurées disponibles pour l’extraction suivante. v6.27.398 invalide les fragments
avec la correction dans une transaction et retire les valeurs issues du texte changé.
Cause : les projections n’étaient invalidées qu’à la suppression de la source.
L’indexation concurrente et les autres écrivains restent suivis dans RESIDUAL-DEBT.

2026-10-06 · Les dépôts de fichier, texte et note lançaient de l’indexation et du
classement sans choix utilisateur ; un échec de lecture renvoyait pourtant un id
de succès. v6.27.397 expose le choix explicite et remonte l’échec sans perdre sa
trace. Cause : dépôt, préparation et exploitation avaient été confondus.
La consultation du texte réutilise la lecture scopée existante, sans droit d’édition.

2026-10-06 · La lecture PDF appelait une fonction v1 absente de pdf-parse v2 ; le
premier correctif passait en Node mais échouait dans Next, faute de worker à son
chemin d’origine. v6.27.397 utilise PDFParse et conserve son worker au build.
Cause : mise à jour de dépendance et packaging non exercés sur un vrai fichier.
Une extraction de deux pages dans l’image exacte verrouille désormais cette frontière.
Cette recette a refusé l’image 397, dont le traçage omettait encore le chargeur et le
binaire `@napi-rs/canvas`. Leur inclusion explicite est ajoutée en 398 ; la réception
du conteneur demeure obligatoire, indépendamment des tests sur le poste de travail.

2026-10-06 · Un amendement manuel persisté laissait le contenu de la page pilier
inchangé, et le formulaire suivant pouvait garder l’ancienne version. v6.27.395
rafraîchit `pillar.get` et invalide `listEditableFields` au succès. Cause : seul
`pillar.assess` était rafraîchi ; le score bougeait sans que le champ soit relu.
Reproduit sur le parcours local réel, puis vérifié par deux amendements consécutifs.
La bannière assimilait aussi le stade de maturité EMPTY à zéro donnée : elle indique
désormais « à compléter » pour un contenu partiel, sans compteur inventé.

2026-10-06 · Créer une plateforme par `strategy.create` ajoutait un Deal `WON`
avec le nom de la marque et le contact de l’opérateur. Couplage retiré en v6.27.394.
Cause : assimilation d’un dossier opérationnel à une conversion commerciale ; le
CRM dispose déjà de ses propres commandes. Les anciennes lignes restent à qualifier.

2026-10-05 · `strategy.create` persistait des réponses non données comme source
`DECLARED` (fidélité 10–30 %, expérience 5, budget <2 %, etc.). v6.27.393 initialise
le diagnostic vide et conserve seulement le contexte fourni. Cause : confusion
entre les valeurs proposées par un formulaire et un témoignage effectivement reçu.
La qualification des anciennes sources reste dans RESIDUAL-DEBT ; aucune purge automatique.

2026-10-06 · Le bouton de plateforme du portefeuille ouvrait l’étage stratégique
dérivé. v6.27.393 ouvre les fondations et porte l’identité de la stratégie dans
l’URL. Cause : lien générique d’exploitation réutilisé au point d’entrée du cadrage.
Création et réouverture reçues en navigateur local, sans changement de contrat.

Recette portfolio du 2026-10-02 : le pied de navigation conservait `v5.0` en dur.
Il lit désormais `APP_VERSION` (v6.27.390). Cause : une surface d’affichage restée
hors de la factorisation de version. Le correctif des chemins d’assets introduits
avec le portfolio est documenté au CHANGELOG, sans dette de donnée supplémentaire.

| Date | Symptôme patché (où / quoi) | Commit | Hypothèse cause racine | Dette liée (RESIDUAL-DEBT) |
|---|---|---|---|---|
| 2026-10-06 | `argos.setVerdict` modifiait le verdict des dossiers sans émission gouvernée. La procédure utilise désormais `SESHAT_REVIEW_REFERENCE_DOSSIER` ; nouvelle émission vérifiée dans le parcours PostgreSQL local. Suite gouvernance 157 fichiers / 1547 tests PASS ; baseline Q3 `argos` abaissée de 2 à 1, sans masque supplémentaire. | v6.27.392 (`d128785`, ADR-0195 ; PR #965) | La revue éditoriale legacy avait gardé une écriture directe lors de la généralisation du spine ; mutation opérateur et mutation gouvernée avaient été assimilées. | — (réparation locale prouvée ; projection distante distincte non testée) |
| 2026-10-06 | `rtis-protocols/track.ts` chargeait dix snapshots concurrentiels récents sans utiliser `strategyId`. Le lecteur partagé filtre secteur/pays et provenance publique ou propre à la stratégie ; aucun repli global. Refus croisés vérifiés par le parcours tRPC PostgreSQL local et le verrou HARD réinjecté/restauré. | v6.27.391 (ADR-0194) | La connaissance de marché mutualisée avait été confondue avec les documents d'étude privés ; le contrat de provenance n'avait pas atteint tous les lecteurs. | — (fix local vérifié ; aucun reçu de production inféré) |
| 2026-10-06 | `analytics.getCompetitors` autorisait des filtres optionnels sans imposer le propriétaire d'étude. La lecture valide le scope et applique le même périmètre que T ; la saisie opérateur conserve visibilité/pays/source et refuse les associations d'étude incohérentes. Isolement marques/concurrents vérifié par `verify-creative-intelligence.ts`. | v6.27.391 (ADR-0194) | La frontière document/connaissance d'ADR-0186 n'avait pas été propagée aux snapshots concurrentiels. Une provenance historique inconnue doit rester privée, pas être promue en observation publique. | — (backfill depuis les origines d'étude seulement, pas d'identité inventée) |
| 2026-07-27 | **Test de gouvernance vert ou rouge selon les clés d'API de la machine — `llm-routing.test.ts` rouge sur arbre propre** (3 cas sur 5) : il asseyait la matrice de routage sur `routeModel`, qui applique la décision **puis descend le catalogue** selon les providers réellement configurés. Sur un environnement où seule `OPENAI_API_KEY` est posée, « tier S → opus » retombe légitimement sur `gpt-4o-mini` — comportement runtime CORRECT, assertion FAUSSE. Le test passait en CI (aucune clé) et échouait en local : il protégeait en réalité l'absence de clés, pas la matrice. **Correction de ce constat le jour même (v6.27.338)** : la première réparation avait extrait un `idealModel(ctx)` pour asseoir la matrice — mais l'inspection suivante a montré que **cette matrice était morte ET périmée** (zéro appelant, doctrine « tier S → Opus, Ollama en tier C » contredisant la cascade réelle Ollama Cloud → OpenRouter → Anthropic). `idealModel` et `routeModel` ont donc été SUPPRIMÉS avec les deux modules de routage morts ; le test a été réécrit sur `resolveTextProviderOrder`/`isPremiumMode`, les fonctions pures qui décident vraiment. L'état final ne contient ni `idealModel` ni `routeModel`. | `fix(seshat)` v6.27.337 | **Classe (nouvelle)** : un test qui asserte une **décision** à travers une fonction qui mêle décision **et** disponibilité de l'environnement mesure l'environnement, pas le code — et son verdict s'inverse selon la machine. Signal : un test de gouvernance qui lit une fonction dont le résultat dépend de `process.env` sans le stubber. Remède : extraire la décision pure et l'asserter elle ; garder un cas séparé, à assertion *relationnelle* (ici « jamais plus cher que la décision »), pour le chemin runtime. | — (clos par le fix) |
| 2026-07-27 | **« Le score renvoie `null` » alors qu'il est calculé, stocké et affiché ailleurs** : trois lecteurs (`mcp/advertis` ×2, `campaign-canon`) lisaient `advertis_vector.compositeScore` — clé **inexistante** dans ce vecteur (le scorer écrit `composite`, `advertis-scorer/index.ts:136`). Effets : tout agent MCP concluait « pas de score » sur une marque à 164/200, et le cadrage de campagne canon résolvait un tier **LATENT systématique** (budgets conseillés sous-dimensionnés, silencieusement). Même commit : `getBrandCard` sélectionnait `sector` sur `Strategy` (colonne portée par `Client`) → `PrismaClientValidationError` renvoyée telle quelle à l'appelant, **énumérant tout le modèle**. Réparés + canon `domain/brand-scores.ts` + test HARD `score-single-truth`. | `fix(seshat)` v6.27.337 | **Classe** : quand un système porte **plusieurs mesures voisines dont les noms se recouvrent** (`advertis_vector.composite` /200 vs `CultIndexSnapshot.compositeScore` /100 vs `ScoreVerdict.force` /200), le nom de l'une migre dans le lecteur de l'autre — et l'échec est **silencieux et plausible** (`null`, pas une exception), donc lu comme « la donnée n'existe pas » au lieu de « je lis mal ». Signal : deux entités du même domaine avec un champ quasi-homonyme d'échelles différentes. Remède : un module canon qui NOMME chaque mesure et détient l'unique lecture, + un test qui interdit la relecture directe du champ. Corollaire : `null` comme échec de lecture est indistinguable de `null` « non mesuré » — d'où l'exigence de passer par un lecteur nommé. | — (clos par le fix) |
| 2026-07-27 | **« La base est vide / perdue » — en réalité `DATABASE_URL` pointait vers un hôte inexistant** : à la création de la ressource Coolify « Docker Image », `DATABASE_URL` a été recopié avec l'hôte `base` au lieu de `qosouizh7eszymg7z4dupsa7`. L'app démarrait, servait les pages statiques, **et toute lecture base échouait** (`getaddrinfo EAI_AGAIN base`) : `prisma.user.findUnique` → login mort → « 0 utilisateurs » ; `prisma.scoreVerdict.findMany` → `/leaderboard` 500 ; 3 crons en 500. Diagnostiqué par un tiers comme « DB vide, authentification exclusivement OAuth » — les deux affirmations fausses (le repo a bien un provider `Credentials`+bcrypt, `src/lib/auth/config.ts:38`, et c'est lui qui plantait). Réparé : valeur restaurée depuis l'app sœur sur les 2 entrées (prod + preview) via l'API Coolify, redémarrage → 0 `EAI_AGAIN`, 0 erreur Prisma. Les logs de boot prouvaient l'intégrité : `2 migration(s) appliquée(s) sur 91 (le reste déjà en base)` = 89 migrations déjà présentes. | `docs(deploy)` v6.27.334 (garde-fou doc ; correctif = config Coolify, hors repo) | **Classe** : une **panne de résolution de nom** vers la base se présente exactement comme une **perte de données** — l'app est UP, les pages statiques répondent, seules les lectures base échouent — et invite au pire diagnostic possible (« restaurer une sauvegarde », qui écraserait des données saines). Signal discriminant : `EAI_AGAIN <hôte>` dans les logs du conteneur (DNS, jamais données), et le compteur de migrations au boot (`N sur 91, le reste déjà en base` = base historique jointe ; `91 sur 91` = base neuve). Remède : avant tout geste de restauration, exiger la preuve par le compteur de migrations. Corollaire : recopier un secret verrouillé à la main lors d'une recréation de ressource est un vecteur de panne silencieuse — vérifier caractère par caractère. | — (clos par le fix) |
| 2026-07-27 | **Doc d'ops qui décrit une UI inexistante — `BUILD-DEPORT.md` étape 2 « Build Pack → Docker Image »** : cette option n'existe pas (le Build Pack d'une app git n'offre que Nixpacks/Railpack/Static/Dockerfile/Docker Compose ; « Docker Image » est un type de ressource choisi à la création). L'opérateur a cherché l'option, puis rempli la section *Docker Registry* du même écran — qui nomme l'image **construite sur le VPS**, ne tire rien — donc build VPS inchangé (OOM persistant) **et champ des domaines vidé par la sauvegarde** (prod encore servie par les labels Traefik du conteneur en cours ; un redeploy aurait tué le routage). Étape 2 réécrite en manip réelle (nouvelle ressource Docker Image, domaines basculés en dernier, ancienne app arrêtée = rollback) + piège *Docker Registry* documenté. | `docs(deploy)` v6.27.334 | **Classe (nouvelle)** : une doc d'ops rédigée sur une UI tierce **jamais vérifiée dans la version réellement déployée** est pire qu'une doc absente — elle fait chercher un chemin qui n'existe pas, puis pousse à improviser sur le champ voisin qui *ressemble*, et cette improvisation mute la config de prod. Signal : une instruction d'UI tierce sans capture ni numéro de version. Remède : toute étape d'UI tierce nomme les options **réellement** présentes (les énumérer vaut preuve de vérification) et signale explicitement les champs voisins homonymes qui ne font pas ce qu'on croit. | — (clos par le fix) |
| 2026-07-27 | **Déploiement Coolify de `main` bloqué — `next build` rouge sur `cinetpay.ts:66`** : `splitName` retournait `parts[0]` (`string \| undefined` sous `noUncheckedIndexedAccess`) dans un champ `first: string` — le commit v6.27.332 (migration Aurore) avait été poussé sans `tsc --noEmit`. Assertion non-nulle `parts[0]!` (longueur vérifiée juste avant). En passant : désync de version du même commit resynchronisée (`version.ts`/lock restés à 6.27.331 alors que package.json disait 6.27.332 — le bump script ne remplace que l'ancienne version exacte, une désync préalable le rend partiel). | `fix(thot)` v6.27.333 | **Classe** : un push direct sur `main` sans gauntlet local (tsc) casse le build de TOUTE la chaîne de déploiement — le type-check n'est vérifié qu'au build Docker, trop tard. Signal : tout commit qui touche `src/` doit passer `npx tsc --noEmit` avant push (NEFER Phase 5) ; la CI GitHub l'attrape mais Coolify build depuis `main` sans attendre la CI. | — (clos par le fix) |
| 2026-07-24 | **« Le nom de Betsy apparaît dans Awa » — un résumé lossy de contexte LLM effaçait l'identité des items d'un tableau → fabrication/contamination inter-items** (capture opérateur SPAWT) : `summarizePillar` (auto-filler) condense tout pilier > 6 kB et écrasait TOUT tableau en `[Array×N]` ; le LLM à qui on demandait `personas[2].fears` recevait `"personas":"[Array×3]"` (nom/âge/motivations d'« Awa » effacés) → il inventait « Betsy » dans la case d'Awa. Le twin `compactPillar` (I-actions séquencées) faisait `[N éléments]`. Ancre d'identité par champ (`buildFieldAnchor`, contenu BRUT) + les deux résumés gardent désormais les identités (`[Array×3: Awa, Betsy]`). | `fix(pillar-maturity)` v6.27.326 | **Classe (nouvelle, converge avec « une mécanique unifiée, une copie oubliée »)** : un RÉSUMÉ lossy d'un contexte LLM (cap de fenêtre) qui condense un tableau d'objets en un compte opaque efface l'IDENTITÉ des items — le modèle, sommé de remplir `arr[i].leaf`, n'a plus de quoi ancrer l'item `i` et FABRIQUE une identité. Signal : DEUX résumés jumeaux (`summarizePillar`/`compactPillar`) avec la même collapse `[N]` = la classe. Remède : ce qu'on demande de remplir en profondeur doit porter SON ancre d'identité (voyage avec le champ, survit au chunking), et tout résumé de contexte doit préserver les identités des items. | §Enrichir/guidelines (Root 2 divergence vault↔pilier tracé) |
| 2026-07-24 | **Write-back cascade RTIS en `split(".")` object-only → piège de corruption d'index de tableau** (croisé au fix contamination) : `rtis-cascade.ts` écrivait `filled` via un walk manuel object-only qui aurait créé une clé littérale « foo[0] » au lieu d'indexer le tableau — exactement la corruption que `lib/pillar-path.ts` (Phase 0) a supprimée ailleurs (gateway/assessor/auto-filler). Latent (les paths RTIS sont object-only aujourd'hui), donc jamais déclenché — mais un piège si un contrat RTIS émettait un jour un path indexé. Rebranché sur `setNestedValue` (array-index + proto-guardé). | `fix(pillar-maturity)` v6.27.326 | **Classe (récurrente « une mécanique unifiée, une copie oubliée »)** : la Phase 0 a unifié l'écriture de chemin profond PARTOUT sauf CE call-site resté object-only — même famille que la branche `APPLY_RECOS_RESOLVED` oubliée (v6.27.319). Signal : tout `split(".")`+walk manuel sur un dot-path pilier est un candidat au remplacement par `setNestedValue`. Auditer les call-sites restants qui n'importent pas `@/lib/pillar-path`. | — (clos par le fix) |
| 2026-07-23 | **Panneau recos : la justification de CHAQUE reco s'affichait VIDE** (trouvé à l'audit adversarial) : `pillar-page.tsx` lisait `reco.justification`, mais le moteur persiste la rationale dans la colonne **`explain`** (`engine.ts` : `explain: reco.justification ?? …`) — il n'existe AUCUNE colonne `justification` sur le modèle `Recommendation`. `String(reco.justification ?? "")` valait donc `""` pour toute reco depuis toujours. Lu `reco.explain` (fallback `justification`). | `fix(notoria)` v6.27.321 | **Classe** : un lecteur UI qui lit un nom de champ qui n'a jamais existé sur l'entité (dérive nom d'input `justification` du LLM ≠ nom de colonne `explain` du persist) → rendu vide silencieux, jamais une erreur. Signal : le writer (`engine.ts`) mappe explicitement `justification → explain` ; le reader aurait dû lire le nom PERSISTÉ, pas le nom d'input. Auditer tout `reco.<champ>` du panneau contre le schéma Prisma réel. | — (clos par le fix) |
| 2026-07-23 | **Auto-filler : une valeur financière BLOQUÉE restait persistée** (trouvé à l'audit adversarial) : le post-check `validateFinancials` (pilier V) retirait le champ invalide de `filled`/`aiFilled` (tracking) mais **ne supprimait jamais `content.unitEconomics[field]`** — le commentaire « Remove the invalid financial values » ne correspondait pas au code → la valeur incohérente était écrite par le gateway malgré le BLOCK. `delete ue[blocker.field]` ajouté. | `fix(notoria)` v6.27.321 | **Classe** : un commentaire qui décrit l'intention (« remove the values ») alors que le code ne retire que la MÉTADONNÉE de suivi, pas la donnée elle-même — la valeur invalide survit au « rejet ». Signal : un rejet/blocage doit muter la DONNÉE (content) qui sera persistée, pas seulement les listes de tracking retournées. Vérifier que tout post-check « reject » supprime bien de la structure écrite. | — (clos par le fix) |
| 2026-07-23 | **Gateway `APPLY_RECOS_RESOLVED` object-only → une reco profonde s'appliquait SILENCIEUSEMENT sans effet** (chantier notoria profondeur) : la branche écrivait `newContent[op.field]` — une reco ciblant `prophecy.pioneers` créait une clé LITTÉRALE `"prophecy.pioneers"` (ensuite purgée comme artefact dot-notation) au lieu d'écrire `content.prophecy.pioneers`. + la base était shallow-copiée (`{...previousContent}`) → une op ADD sur une matrice imbriquée mutait AUSSI l'instantané PillarVersion « précédent ». Extraite en module pur `apply-resolved-ops.ts`, profondeur-consciente (`setNestedValue`/`resolvePillarPath`) + `structuredClone`. | `fix(notoria)` v6.27.319 | **Classe (récurrente « une mécanique unifiée, une copie oubliée »)** : le chantier Phase 0 (`@/lib/pillar-path`) a unifié l'écriture de chemin profond PARTOUT — gateway `SET_FIELDS`, assessor, auto-filler — SAUF la branche `APPLY_RECOS_RESOLVED` du même gateway, restée object-only. Signal : quand une mécanique de chemin devient array-index-aware, auditer TOUTES ses branches d'écriture/lecture (pas seulement l'entrée principale). Corollaire : un shallow-copy d'un contenu suivi de mutations de tableaux en place corrompt tout snapshot « avant » partagé — cloner en profondeur. | §chantier notoria (per-cellule matrice déféré) |
| 2026-07-23 | **La notoria proposait `t.traction` (donnée réelle NEEDS_HUMAN) au remplissage LLM** (chantier notoria profondeur) : `engine.ts emptyFields` listait TOUTES les clés top-level vides du schema, sans filtrer NEEDS_HUMAN → le LLM se voyait demander d'inventer une traction (LOIs, MRR, users) — fabrication (interdit n°3). En plus la détection était **top-level seulement** (objets imbriqués partiels invisibles). Remplacée par `findEmptyLeafPaths` (profondeur + exclusion NEEDS_HUMAN + garde union-string). | `fix(notoria)` v6.27.319 | **Classe (double)** : (1) **trois notions divergentes de « champ vide »** coexistaient (contrat/assessor profond, notoria top-level, auto-filler contrat+Phase3) → une seule notion canonique partagée (`findEmptyLeafPaths`) supprime la divergence. (2) une liste « champs à faire remplir par l'IA » DOIT exclure la donnée réelle non-inférable (NEEDS_HUMAN) à la source — sinon le garde anti-fabrication repose sur l'espoir que le LLM « n'inventera pas ». Signal : le contrat de maturité excluait déjà `traction`, la notoria non → divergence = tell. | — (clos par le fix) |
| 2026-07-23 | **Panneau recos : `content[fieldName]` cassé pour un chemin imbriqué → « Actuel » invisible (remplacement d'apparence silencieuse)** + score déterministe ADR-0090 jamais affiché (chantier notoria profondeur) : la carte lisait `content["prophecy.pioneers"]` (= `undefined`) → le bloc « Actuel » ne s'affichait pas ; et `weightedScore`/verdict ruler/`validationWarning` (PERSISTÉS par le moteur) n'étaient pas rendus → « la logique de score » restait invisible. `resolvePillarPath` + badge de verdict + chip score + avertissement gate + tri par score. | `fix(notoria)` v6.27.319 | **Classe** : un LECTEUR UI en accès plat (`obj[field]`) sur un système de champ qui est DEVENU profond (dot-paths imbriqués) échoue silencieusement — le lecteur doit utiliser le même résolveur profond que l'écrivain (`resolvePillarPath`). Corollaire : une donnée déjà CALCULÉE et PERSISTÉE (ici `weightedScore`) mais non affichée = travail invisible ; surfacer plutôt que recalculer. | — (clos par le fix) |
| 2026-07-23 | **`signal.configureThresholds` — `upsert({ where: { sourceHash } })` sur un champ NON unique → `PrismaClientValidationError` au runtime** (purge dette) : `KnowledgeEntry.sourceHash` n'a aucune contrainte `@unique`/`@@unique` (market-study en crée N lignes/sha256, entryTypes distincts) ; l'`upsert` castait `{ sourceHash } as WhereUniqueInput` pour tromper `tsc`, mais Prisma jette à l'exécution → l'opérateur ne pouvait pas configurer les seuils de feedback (feature morte). Réécrit sur le PK `id` déterministe (`thresholds-${strategyId}`, pattern `knowledge-seeder`/`aggregator`) ; le create pose `id` ET `sourceHash` → le lecteur `checkThresholds` (findFirst sur sourceHash) reste compatible. | `fix(governance)` v6.27.305 | **Classe** : un `as WhereUniqueInput` qui force un champ non-unique dans un `where` d'upsert passe `tsc` mais JETTE au runtime — le cast ment au compilateur sans créer la contrainte DB. Signal : les sibling upserts corrects (`knowledge-seeder`/`aggregator`) keyent tous sur `id` déterministe, pas sur `sourceHash` ; la divergence est le tell. Remède : upsert sur une vraie clé unique (PK), jamais un cast d'un champ ambigu. | §sourceHash (plan CORRIGÉ : contrainte unique refusée — sourceHash légitimement non-unique) |
| 2026-07-23 | **IDOR entité-id sur la face marketplace/créateur (scan proactif 122 procédures)** (round-10 a+b) : `strategy.getWithScore` (piliers ADVE complets), cluster driver ×11, sources d'ingestion (rawContent), mission/activités ×14, scoring, PII `payoutPhone` (guild-org/guild-tier), télémétrie de carrière, budget client (quality-review) — tout compte authentifié lisait/mutait cross-tenant. Gardes par entité + `omit` PII + operator-flip. | `fix(governance)` v6.27.287 + v6.27.288 | **Classe (STRUCTURELLE, récurrente rounds 4→10)** : la garde d'ownership (ADR-0175 `governedProcedure` + `strategyScoped`) ne se déclenche QUE sur un `strategyId` de TÊTE ; toute procédure keyée sur un id d'ENTITÉ (`{ id }`, `driverId`, `talentProfileId`, `deliverableId`, ou un strategyId NOMMÉ `id`) échappe. Le scanner d'ownership historique keyait sur le token littéral `strategyId` → aveugle à la classe. **Remède de fond** : un scan PROACTIF (`scan-entity-idor`) qui INVENTORIE tout procédure entité-id non gardée (au lieu d'énumérer les gardes connues) → promu en verrou CI permanent (round-10 c). La leçon : un scanner qui liste « ce qui EST gardé » ne trouve jamais « ce qui NE l'est PAS » — il faut scanner l'univers et prouver la couverture, pas l'inverse (même famille que round-6 e « périmètre par opt-in »). | §Gouvernance/sécurité (IDOR entité-id — cluster brand-core+marketplace CLOS round-10 ; campaign-manager+intake → c) |
| 2026-07-23 | **Match par substring first-wins sur un dictionnaire de tokens + parité de comptage manquante** (round-10 correctness) : le résolveur d'archétype de coût (ADR-0093) matchait `« standard » ⊃ « stand »`, `« tournage » ⊃ « tour »`, `« whatsapp » ⊃ « app »` → post/tournage/WhatsApp costés comme une journée d'event (le plus cher) ; `deliverable-compiler` omettait le `else { missingOutputs.push }` sur la branche ARTEMIS → `isComplete` mentait (parité perdue avec GLORY/CALC). Tokens délimités + branche ARTEMIS comptée. | `fix(thot)` v6.27.286 | **Classe (double)** : (1) un dictionnaire de mots-clés testé par `haystack.includes(token)` first-wins doit garantir que chaque token court n'est pas un préfixe/substring d'un mot légitime plus long — sinon la super-chaîne est captée par erreur ; délimiter (`« stand »` avec espace) ou choisir un token sans super-chaîne fréquente. (2) un agrégateur qui accumule un `missing[]` sur PLUSIEURS branches (GLORY/CALC/ARTEMIS) doit pousser dans `missing[]` sur CHAQUE branche non-satisfaite — une branche sans `else` fausse tout invariant `missing.length === 0`. Auditer chaque `if (found) push(section) ` pour son `else push(missing)`. | §Gouvernance (correctness round-10 — CLOS) |
| 2026-07-23 | **Contrôle de sécurité gaté sur un attribut calculé TROP TÔT / drapeau de commodité laissé actif** (round-9 auth) : le MFA était gaté sur le rôle DB alors que le privilège god-mode est accordé plus tard (callback JWT) → comptes sensibles jamais challengés ; `allowDangerousEmailAccountLinking: true` (commodité démo « à durcir avant prod ») ouvrait le pre-account-hijacking. Rôle EFFECTIF + drapeau retiré. | `fix(governance)` v6.27.285 | **Classe (double)** : (1) un contrôle d'autorisation ne doit lire l'attribut de décision (rôle/privilège) qu'APRÈS sa résolution COMPLÈTE — le gater sur une valeur intermédiaire (rôle DB avant l'élévation god-mode) crée un trou pour la population élevée-plus-tard. (2) un drapeau de commodité « dangereux » annoté « à durcir avant prod » est une dette qui survit à la prod si rien ne la force — préférer le défaut sûr + opt-in explicite tracé. | §Gouvernance (auth round-9 — partiel, 2 résidus tracés) |
| 2026-07-23 | **Deux calculs du même nombre qui divergent + littéral sensible à la casse** (round-9 correctness) : l'Oracle re-calculait le plafond d'évidence via un MIROIR périmé du scorer (au lieu de lire la valeur persistée déjà plafonnée) → palier Oracle ≠ palier dashboard ; §15 filtrait `segment === "evangeliste"` (jamais matché, valeur `"EVANGELISTE"`) → sous-comptage. Miroir supprimé (lecture de la source unique) + littéral majuscule + seuils canoniques `TIER_MIN_DEPTH`. | `fix(oracle)` v6.27.284 | **Classe (double)** : (1) DEUX implémentations du même calcul (un « miroir maintenu en sync manuellement ») dérivent fatalement quand l'une évolue (ADR-0126 scale-aware) et l'autre non → préférer LIRE la valeur canonique déjà calculée/persistée plutôt que la recalculer. (2) une comparaison de chaîne sensible à la casse contre une constante d'enum stockée en MAJUSCULES = branche morte silencieuse → comparer via la constante/enum, jamais un littéral ad-hoc. | §Gouvernance (correctness round-9 — CLOS) |
| 2026-07-23 | **IDOR entité-id sur 2 routeurs MANQUÉS par le sweep round-4/5** (round-9) : `creative-proposal` (proposition par `{id}`) + `brand-node` (nœud par `nodeId`, le `strategyId` de tête étant un « pivot d'audit » de la marque DU CALLER) muté cross-tenant ; `media-buying.syncToCampaign` écrivait sur un `campaignId` non vérifié. Chokepoints `assertProposalAccess`/`assertNodeAccess`/`assertOperatorAccess` + garde campagne posés ; verrou HARD étendu. | `fix(governance)` v6.27.283 | **Classe (récurrente)** : un sweep de sécurité guidé par un TEST/scanner ne couvre que ce que le test énumère — les routeurs absents de la liste échappent. Corollaire du round-8 (e) : le verrou doit couvrir l'univers par défaut. + le « strategyId de tête » n'est une garde QUE s'il désigne la CIBLE ; un `strategyId` décoratif (pivot d'audit, marque du caller) coexistant avec un id d'entité-cible non gardé = fausse couverture. Auditer tout `governedProcedure` où le `strategyId` de tête ≠ l'entité réellement mutée. | §Gouvernance/sécurité (round-6 (c) — CLOS round-9) |
| 2026-07-22 | **Verrou CI limité par un marqueur d'opt-in = angle mort** (round-8) : `governed-active-no-new-bypass` ne scannait que les routeurs portant `lafusee:governed-active` → 18 routeurs non tagués (`payment`/`auth`/`newsletter`/`blog`…) pouvaient ajouter une mutation ungoverned sans signal CI. Gate retiré → scan de TOUS les routeurs, baseline complet. | `fix(governance)` v6.27.282 | **Classe** : un garde CI dont le PÉRIMÈTRE dépend d'un marqueur d'inclusion volontaire (tag/allowlist opt-in) ne protège QUE le sous-ensemble déjà conscient — le code neuf hors marqueur échappe. Un verrou de sécurité doit couvrir l'univers par DÉFAUT (opt-out justifié), jamais l'inverse. Même famille que « middleware inerte sur champ absent » (fausse confiance de couverture). | §Gouvernance/sécurité (round-6 (e) — CLOS round-8) |
| 2026-07-22 | **Intégrité financière : create nu sans dedup + webhook public non signé + update inconditionnel** (round-8) : `generatePaymentOrder` créait un `PaymentOrder` sans vérifier l'existant (double-payout) ; `mobileMoney.webhook` mutait le ledger en `publicProcedure` sans signature ; Stripe/CinetPay re-fulfillaient sur redelivery (`update` au lieu d'un claim atomique). Dedup + secret fail-closed + `updateMany` conditionnel. | `fix(governance)` v6.27.281 | **Classe** : toute écriture monétaire idempotente-par-nature (payout, encaissement) doit être GARDÉE contre le rejeu — (a) create-if-not-exists sur la clé métier, (b) webhook = entrée non-fiable qui DOIT être signée (jamais `publicProcedure` nu), (c) transition d'état déclenchant un effet de bord (email/LLM/argent) = claim atomique conditionnel, jamais un `update` inconditionnel. Le sibling correct (PayPal, MTN idempotency-key) est le patron ; les frères non alignés sont le signal. | §Gouvernance/sécurité (intégrité financière — CLOS round-8) |
| 2026-07-22 | **Lectures cross-tenant : scope conditionnel + include/select sur-exposé** (round-8) : `campaignManager.search` ne scopait QUE `if (input.strategyId)` → strategyId omis = toutes les campagnes ; `guilde`/`membership` remontaient `TalentProfile` entier (payoutPhone PII) faute de `select`/`omit` ; `mission.listForCreator` incluait `advertis_vector`. Scope inconditionnel + `omit`/`select` restreints. | `fix(governance)` v6.27.280 | **Classe** : (1) un scope d'ownership posé SOUS condition d'un paramètre optionnel (`if (input.strategyId)`) laisse la branche « param omis » non gardée — le scope doit être INCONDITIONNEL (AND systématique), le paramètre ne fait que restreindre. (2) une lecture ouverte qui remonte une entité SANS projection (`include: true`, pas de `select`/`omit`) expose fatalement ses champs PII — toute lecture cross-utilisateur doit projeter explicitement. Même famille que la fuite newsletter (round-7). | §Gouvernance/sécurité (fuites include/select — CLOS round-8) |
| 2026-07-22 | **MCP — deux chemins de dispatch à enforcement inégal** (round-8 CRITICAL) : l'agrégat `/api/mcp` déléguait à `dispatchTool` (→ `enforceBrandScope` fail-closed) mais les 10 routes PAR-SERVEUR appelaient `handler()` en direct après `scopeMcpParams` (check `params.strategyId` seul) → tout outil keyé entité-id (campaignId/missionId/…) contournait la portée BRAND (cross-marque read+write via une clé BRAND self-mintée). Unifié : les 10 routes délèguent à `dispatchTool`. | `fix(governance)` v6.27.279 | **Classe (répétée)** : deux implémentations du MÊME point de contrôle (ici le dispatch MCP), une gardée, l'autre non — exactement la famille « garde inerte / lanes inégales » déjà vue (governedProcedure vs auditedProcedure ; middleware.use sur champ absent). Remède structurel : UN seul chemin d'exécution partagé, jamais deux copies du dispatch dont une oublie la garde. Signal : quand un guard vit dans un chemin A, auditer que TOUS les chemins vers la même cible passent par A. | §Gouvernance/sécurité (round-6 (a) entité-id MCP — fermé round-8) |
| 2026-07-22 | **XSS stocké — `<title>` non échappé dans un template par ailleurs échappé** (round-8) : `guidelines-renderer` interpolait `<title>${doc.title}</title>` (nom de marque fondateur-éditable) SANS `escapeHtml`, alors que TOUS les autres points d'interpolation (h1, sections, tags, drivers) l'utilisaient — et le `<title>` du builder PDF sœur, lui, l'utilisait. Sortie rendue brute (`dangerouslySetInnerHTML`) sur une page PUBLIQUE partagée. Échappé + verrou `guidelines-renderer-xss.test.ts`. | `fix(security)` v6.27.278 | **Classe** : un template HTML construit par littéraux avec échappement point-par-point (pas par construction) laisse fatalement UN point non échappé (ici le `<title>`, moins visible que le corps). Signal : deux builders sœurs du même document, un champ échappé dans l'un et pas dans l'autre = l'oubli. Remède structurel supérieur (non fait, non nécessaire ici) : un helper de template auto-échappant (`html\`...\``) plutôt que `escapeHtml` manuel à chaque point. | §Gouvernance/sécurité (XSS guidelines — CLOS round-8) |
| 2026-07-22 | **SSRF — garde d'URL appliquée à l'URL INITIALE mais pas aux redirections** (round-8) : `web-footprint` (chemin intake PUBLIC) + `web-fetcher` fetchaient en suivi automatique de redirection ; `assertPublicUrl` (DNS + rejet IP privée) ne couvrait que le 1ᵉʳ saut → `302 → http://169.254.169.254/…` suivi jusqu'aux métadonnées. `web-fetcher` en plus ne résolvait pas le DNS (regex hostname seul). Garde partagée `ssrf-guard.ts` : `ssrfSafeFetch` re-valide CHAQUE saut (redirect manuel). | `fix(security)` v6.27.278 | **Classe** : une garde SSRF qui valide l'URL fournie mais délègue les redirections au client (`redirect:"follow"`) est contournable par un 302 — la validation doit s'appliquer à CHAQUE cible effectivement contactée, pas seulement à l'entrée. Corollaire : une garde « hostname regex » sans résolution DNS est aveugle aux noms publics→privés et aux IP décimales. | §Gouvernance/sécurité (SSRF — CLOS round-8 ; pin anti-rebinding tracé) |
| 2026-07-22 | **`newslettersList` fuyait TOUTES les campagnes cross-marque** (round-7, pré-existant — round-6 avait fermé la sœur `newslettersStats` par un gate `operatorProcedure` qui, lui, cassait la modale « Consulter » du fondateur). `NewsletterCampaign` n'avait pas de `strategyId` alors que ses entités sœurs en portent (abonnés `CrmContact`, fournisseur `BrandEmailConnector`) → la liste renvoyait toutes marques confondues + aucune clé pour scoper le point-read. Champ `strategyId` additif + scoping `accessibleStrategyIds` sur les deux reads (fondateur = SES campagnes ; legacy null = opérateur-only) + stamp à la création + garde de cohérence à l'envoi. | `fix(security)` v6.27.277 | **Classe** : une feature par-marque dont l'entité ENFANT omet le `strategyId` que ses entités SŒURS portent → (a) les list-reads fuient globalement, (b) le point-read n'a rien à scoper → on gate en `operatorProcedure` par dépit (stopgap qui casse l'UX fondateur au lieu de scoper). Le fix n'est pas de gater plus haut, c'est de donner à l'enfant le `strategyId` de ses sœurs. Signal : un gate `operatorProcedure` posé sur une lecture d'une page fondateur = odeur de « l'entité n'est pas scopable ». | §Gouvernance/sécurité (Newsletter par marque — CLOS round-7 ; écritures gouvernées par-marque tracées) |
| 2026-07-22 | **Lane gouverné : combustion REFUSÉE close `status="OK"`** (round-4, trouvé à la vérif adversariale du diff round-3) : `governedProcedure` posait `finalStatus="OK"` + `postEmitIntent(OK)` + `intent.completed` même quand le handler/middleware AVAL avait refusé (garde d'ownership) ou échoué — parce que tRPC v11 `next()` NE JETTE PAS sur échec aval : il renvoie `{ok:false}`, donc le `catch` du lane ne captait que ses PROPRES throws (jamais atteint pour un throw aval). Le commentaire du code d'origine unwrappait déjà `{ok:false}` (`unwrapMiddlewareResult`) mais n'ajustait pas le statut. Résultat : Seshat marquait OBSERVED des intents refusés (falsification Q1/Q2). Corrigé : tester `result.ok` → `VETOED`/`FAILED` (parité avec `auditedProcedure` qui le faisait déjà). | `fix(governance)` v6.27.274 | **Classe** : présumer qu'un framework RE-JETTE une erreur alors qu'il la CATCH-and-returns (contrat de `next()` mal lu). Deux implémentations sœurs (`governedProcedure` vs `auditedProcedure`) du même invariant, une seule correcte → la divergence est le signal. Vérifier le contrat réel du framework (lire sa source), pas son comportement présumé. | §Gouvernance/sécurité (Audit gouverné statut honnête — CLOS) |
| 2026-07-22 | **Garde middleware INERTE sur les procédures keyées entité-id** (round-3 adversarial) : `campaign-manager` posait `.use(enforceCampaignRawScope)` (lit `campaignId` de l'input) sur ~24 procédures keyées sur un id de SOUS-ENTITÉ (`updateAction({id})`, `deleteBudgetLine({id})`, `updateBrief({id})`…) → `campaignId` absent → garde **no-op silencieux** → écritures/suppressions/lectures cross-tenant, AVEC un commentaire affirmant faussement « gardées inline ». Idem : le scoping CRM `{ strategy: scopeStrategies }` (relation-to-one) sur `Deal.strategyId` NULLABLE **excluait** tous les deals pré-conversion (régression : pipeline vide). Résolution entité→`campaignId`→`enforceCampaignAccess` (governés dans le `.use()`, reads/operator inline) + inclusion `{strategyId:null}` CRM. Verrou `api-route-auth-guards.test.ts`. | `fix(security)` v6.27.273 | **Classe (double)** : (1) un middleware de garde qui lit un champ ABSENT de l'input du procédure est silencieusement INERTE — pire qu'absent car il crée une fausse confiance (commentaire « gardé »). Une garde doit lire un champ que TOUTES les procédures qu'elle décore possèdent, sinon résoudre l'entité. (2) Un filtre Prisma relation-to-one sur une FK NULLABLE EXCLUT les lignes à FK null — jamais les « inclut sans scope ». Même famille que le footgun fail-OPEN de `middleware/operator.ts`. | §Gouvernance/sécurité (IDOR round-2/3 — CLOS ; Deal.operatorId structurel restant) |
| 2026-07-22 | **`middleware/operator.ts` — dead code footgun de fuite tenant** : `operatorFilter(ctx)` renvoyait `{}` (aucun filtre = TOUTES les lignes cross-tenant) pour tout non-ADMIN car il lit `session.user.operatorId` jamais peuplé ; `enforceOperatorIsolation` idem. 0 import en prod (le vrai `enforceOperatorIsolation` vit dans `operator-isolation/index.ts` et prend un `OperatorContext` résolu en base). Supprimé — un futur câblage naïf de `operatorFilter` aurait ouvert une fuite. Détecté à l'audit B1 (session.operatorId). | `chore(security)` v6.27.267 | `session.user.operatorId` n'a jamais été posé par le callback NextAuth ; deux implémentations homonymes (`middleware/operator` session-based morte vs `operator-isolation` DB-based vivante) → la morte lisait un champ vide et fail-OPEN (`{}`). Classe : un helper d'isolation qui fail-OPEN (renvoie « pas de filtre ») sur donnée manquante est un footgun ; préférer fail-CLOSED. Cause racine (surcharge `User.operatorId`) tracée RESIDUAL-DEBT. | §Gouvernance/sécurité (session.operatorId) |
| 2026-07-22 | **`setNestedValue` (pillar-gateway C5) corrompait l'amendement d'un item de tableau** : un dot-path avec index (`personas[0].name`, forme documentée dans l'Intent `OPERATOR_AMEND_PILLAR`) était `split(".")` → segment littéral « personas[0] » traité comme une CLÉ d'objet → création de `content["personas[0]"] = {name}` au lieu d'indexer `content.personas[0]`. L'amendement écrivait à côté ; la vraie donnée n'était jamais touchée. Détecté à l'audit ADVE 2026-07-22. Tokenizer `key[index]` + navigation tableau (vérifié E2E : index écrit, voisin intact, zéro clé parasite). | `fix(cockpit)` Lot 2 v6.27.248 | Le dot-path applicator du gateway n'a jamais supporté la notation index de tableau, alors que le contrat d'amendement l'expose (`personas[0].name`). Classe : un applicateur de chemin doit couvrir TOUTE la grammaire de chemin que son contrat annonce — sinon corruption silencieuse sur la partie non-supportée. | — (clos par le fix) |
| 2026-07-20 | **CHANGELOG.md ordre inversé après résolution de conflit de rebase** (PR #599) : le script de résolution avait placé le bloc `main` (v6.27.232) AVANT mes 3 entrées renumérotées (.235/.234/.233), cassant l'ordre décroissant (le plus récent en tête). Détecté à une re-vérification demandée par l'opérateur après le push initial — pas par la CI (aucun test n'audite l'ordre, seulement la couverture). Réordonné, contenu vérifié intact (comptes 1/1 par titre). | `fix(governance)` 1bfff65 | Résolution de conflit multi-fichiers (CHANGELOG + 3 fichiers de version) faite en une passe scriptée sans relecture visuelle de l'ordre final — l'attention était sur « pas de doublon de numéro », pas sur « ordre chronologique préservé ». Classe : toute résolution de conflit sur un fichier à ordre sémantique (changelog, journal, liste triée) doit relire l'ordre, pas seulement l'absence de marqueurs. | — (clos par le fix) |

| Date | Symptôme patché (où / quoi) | Commit | Hypothèse cause racine | Dette liée (RESIDUAL-DEBT) |
|---|---|---|---|---|
| 2026-07-20 | **Fuite cross-tenant gazette Jehuty** : `jehuty.feed` tirait TOUS les `DIAGNOSTIC_RESULT` sans filtre et estampillait les entrées sans `data.strategyId` (événements funnel avec PII prospect) avec l'id de l'APPELANT → chaque founder voyait les intakes des autres marques (« Diagnostic NETERU » ×7 chez Motion19). + aucune garde d'ownership sur le strategyId passé. Règle pure `diagnosticBelongsToFeed` + gardes ownership/opérateur. | `fix(jehuty)` v6.27.230 | Deux classes : (1) fallback « faute de mieux » sur l'identité de l'appelant = anti-pattern d'attribution ; (2) `protectedProcedure` + id libre sans garde d'ownership — même classe que le trou calendrier fermé par ADR-0129. Auditer les autres routers `protectedProcedure` à strategyId libre. | **Cause racine FERMÉE 2026-07-20** — [ADR-0166](adr/0166-strategy-ownership-guard-routers.md) (middleware `strategyScopedProcedure` + 85 procédures migrées + verrou HARD `strategy-ownership-guard.test.ts`) ; suivi lane governed founder inscrit RESIDUAL-DEBT |
| 2026-07-20 | Incohérence de palier sur la page résultat intake (header « FRAGILE » vs synthèse « ressort au niveau LATENT » — signalée par l'opérateur sur le rapport « Top », reproduite sur les 5 marques du test qualité) : le narratif était généré avec la classification threshold-based, écrasée APRÈS coup par `brandLevel`. Await du brandLevel déplacé AVANT la génération du narratif (complete() + regenerateAnalysis). | `fix(intake)` v6.27.228 | Optimisation de parallélisme 2026-05-11 annotée « pas de changement de comportement vs séquentiel » — faux : l'ordre d'écrasement était porteur de sens. Classe : deux sources de vérité du même champ vivantes en même temps dans un pipeline. | — (clos) |
| 2026-07-20 | Domaine parqué adopté comme site officiel (`dovv.com` « This Domain May Be For Sale » → site 75/100, YouTube poubelle scrapé du parking, email 0/100 sur domaine squatté) : une page de parking mentionne toujours le slug → la garde de mention est structurellement aveugle. `looksLikeParkedDomain` déterministe dans la découverte. | `fix(intake)` v6.27.228 | La validation « la page mentionne la marque » teste la MENTION, pas la PROPRIÉTÉ. Classe : tout contenu qui cite mécaniquement le nom cherché (parking, SERP, annuaires) passe une garde de mention. | — (clos pour la découverte ; annuaires/SERP si symptôme réapparaît) |
| 2026-07-20 | Taxonomie secteur aveugle aux pluriels/dérivés (« Télécommunications » ↛ `telecom`, « Boissons » ↛ `boisson` → AUTRE) + CODE canon rendu brut au client (« pour Orange dans AUTRE »). Match par préfixe (keywords ≥ 5) + `sectorDisplayLabel()`. | `fix(intake)` v6.27.228 | Match mot-entier strict pensé contre les faux positifs (art⊂carte) sans corpus de test en français réel ; et aucune frontière code interne / libellé client sur ce champ. | — (clos) |
| 2026-07-20 | Verrou `forecast-engine` single-writer cassé en local macOS : grep BSD émet `src//server/…` (double slash) → assertion d'égalité stricte rouge sur arbre propre. Normalisation `//`→`/` dans le test. | `fix(intake)` v6.27.228 | Test d'égalité de chemins sur une sortie d'outil shell non normalisée — classe : verrous grep-based sensibles à la plateforme. | — (clos) |
| 2026-07-20 | Apify Maps en `run-sync-get-dataset-items` : la connexion long-poll (30-75 s de run actor) était tuée par les intermédiaires coupant à ~60 s (NAT FAI, proxys/edge prod) → maps ERROR chronique. Converti en pattern async 2 temps (start tôt / poll court / collect tard) + abort best-effort. | `fix(seshat+intake)` v6.27.227 | Tout long-poll > 60 s est structurellement fragile derrière NAT/proxy — pattern à proscrire pour les actors Apify (le follower-fetch `social-audit` n'utilise pas run-sync, non concerné). | — (clos pour maps) |
| 2026-07-20 | `detectSocialLinks` produisait un profil « discover » depuis `tiktok.com/discover/...` (chemin réservé de plateforme parsé comme handle) → Apify aurait scrapé un non-profil. Stoplist élargie (discover/explore/stories/live/videos/music/foryou/pages/groups/…). | `fix(seshat+intake)` v6.27.227 | La stoplist initiale (p/reel/posts/watch/hashtag/share) était partielle — construite sur les cas vus, pas sur l'inventaire des chemins réservés des 6 plateformes. | — (clos ; compléter si nouveau chemin réservé apparaît) |
| 2026-07-20 | `countryCodeGuess` ne mappait que l'ISO-2 : « Côte d'Ivoire » → null → locale presse retombée `gl=CM`, aucun TLD `.ci` probé, démonymes entity-gate absents. Référentiel statique nom→ISO-2 ajouté (FR/EN, pays COUNTRY_TLD). | `fix(seshat+intake)` v6.27.225 | Le pays intake est du texte libre mais tous les consommateurs supposaient un ISO-2 — jamais testé avec un nom de pays réel avant le test BK Abidjan. | — (clos) |
| 2026-07-20 | `fetchRssText` (rss.ts) et `fetchPublic` (web-footprint) à tentative UNIQUE : sur FAI à résolveurs round-robin dont certaines IP Google sont mortes (connect ETIMEDOUT ~300 ms, ou SYN pendu), la collecte rendait NULL/unreachable en silence. Retries bornés (5×/3×, timeout par tentative 3,5 s, backoff progressif 400·n). | `fix(seshat+intake)` v6.27.225 | Fetchs réseau écrits pour un datacenter sain ; jamais éprouvés sur réseau dégradé (contexte africain = le marché cible). Classe de bug : tout `fetch` single-shot du repo sans retry réseau. | — (clos pour rss/web-footprint ; autres collecteurs si symptôme réapparaît) |
| 2026-07-19 | Accents restaurés **en passant** au-delà du mandat F5 strict (`question-bank.ts`) : dict fr `intake-result.ts` (~98 chaînes + « La Fusée » ×16 fr/en/zh), page publique `/score` (11 chaînes TIERS/PILLARS), labels `business-context.ts` (6). Remplacements exacts assertés (script python, `assert old in s`), zéro regex aveugle. | `fix(intake+seshat)` v6.27.223 | Contenu FR historique saisi en ASCII sans accents ; les sweeps précédents (v6.27.219-220) ont procédé par surface, pas par inventaire global — chaque passe en découvre une autre. Le fond = pas de verrou structurel anti-sans-accents. | § « Accents hors funnel — surfaces cockpit/console restantes » |
| 2026-07-19 | `intake/[token]/ingest*` — l'écran de traitement s'affichait sur `mutation.isSuccess` : au retour de l'écran de décision (« Revenir à mes sources »), un « Terminé 100 % » fantôme s'affichait au lieu du formulaire. Condition ré-ancrée sur l'état de suivi réel (`watching \|\| isPending`). | `fix(intake+seshat)` v6.27.223 | État UI dérivé du cycle de vie de la MUTATION au lieu de l'état métier de la row — classe de bug fermée par le hook de suivi F1 (source de vérité = statut en base). | — (clos avec F1) |

---

## Causes racines diagnostiquées (purges)

**Cause racine « `protectedProcedure` + id de marque libre sans garde d'ownership » — FERMÉE
2026-07-20** par [ADR-0166](adr/0166-strategy-ownership-guard-routers.md) (recensement au niveau
procédure sur les 123 routeurs, middleware canonique, 85 procédures migrées, gardes inline entité
— conversations, nœuds d'arbre, drivers, outputs Glory — et verrou CI HARD à allowlist décroissante).
La classe signalée par la ligne gazette Jehuty ne peut plus réapparaître silencieusement.


**Cause racine « `processIngest` synchrone dépasse le timeout proxy » — FERMÉE 2026-07-19** par le root
fix F1 (ingestion asynchrone, v6.27.223, RESIDUAL-DEBT § intake clos, `npm run verify:intake-async`).
Lignes dérivées purgées :

| Date | Symptôme patché (où / quoi) | Résolution |
|---|---|---|
| ~~2026-07-18~~ | ~~`src/app/api/trpc/[trpc]/route.ts` — `maxDuration = 300` (inerte sous Coolify, contrat Vercel-only)~~ | Root fix F1 v6.27.223 — plus aucune requête longue à plafonner ; `maxDuration` reste inoffensif. |
| ~~2026-07-18~~ | ~~`intake/[token]/ingest*` — sondage de récupération ~45 s après coupure réseau (mitigation de surface)~~ | Root fix F1 v6.27.223 — remplacé par le suivi de statut `use-intake-processing-watch` (terminal réel, jamais de faux succès, couvre aussi la coupure réseau via row restée `IN_PROGRESS` → « timeout »). |

## 2026-10-02 — Contexte du portefeuille

- Fil d’ancêtres rendu dans un ordre aléatoire : restauration de l’ordre de la chaîne
  après la requête `IN`. Cause : l’ordre SQL était confondu avec l’ordre hiérarchique.
- Administrateur sans équipe personnelle laissé en chargement : résolution par les
  équipes autorisées et paramètre d’URL. Cause : `getOwn` utilisé comme accès global.
- Navigation inactive avec un paramètre d’équipe : comparaison des chemins sans
  paramètres tout en conservant le lien complet. Cause : URL confondue avec pathname.


## Sources multimarques — 2026-10-07 (401)

- Le sélecteur acceptait une marque issue d’une liste plus récente que celle du
  contexte, puis revenait silencieusement à la première marque. Rafraîchissement
  du contexte à la sélection, sans fallback durant ce choix explicite ; cas reçu
  avec une marque créée après ouverture du cockpit. Le paramètre de lien profond
  suit aussi le choix afin de le conserver au rechargement. Cause : deux caches indépendants.
- Une erreur d’acceptation d’une proposition était invisible, et le bouton groupé
  était imbriqué dans le bouton d’ouverture. Refus documentaire
  renvoyé comme conflit 409, erreur lisible avec reprise explicite et contrôles séparés.
  Cause : affichage des succès seul, sans parcours de refus reçu.
- Les versions de piliers étaient écrites sur une autre connexion que leur contenu.
  Le gateway transmet désormais sa transaction ; rollback multi-piliers et snapshots
  reçus ensemble sur PostgreSQL. Cause : versionnement sorti de la frontière atomique.

## 2026-10-07 — Reprises de campagne (ADR-0202)

- Deux tâches produisaient le même code de reprise, et leur propre code n'était
  pas généré. Verrou PostgreSQL, code tâche et maximum historique rétablis ;
  retry explicite persistant dans l'identifiant existant. Cause : identité de
  campagne utilisée au niveau tâche et absence de frontière atomique.
- Les commandes acceptaient un pivot marque sans comparer la campagne réelle ;
  le détail utilisait une marque fictive et la liste cherchait MissionDeliverable.
  Garde commune réelle et bon modèle rétablis, refus visibles. Cause : plusieurs
  identités supposées équivalentes entre lecture, router et handler.
- Un arbitrage rouvrait un ticket résolu ; remise automatique du statut de tâche
  forçait GREEN. Terminaux et reçu protégés, calcul existant réutilisé ; campagne
  sans calcul refusée explicitement. Cause : écriture de statut sans transition
  ni preuve de calcul. Réception native et cycle complet restent ouverts.
- Le portefeuille et le détail chargeaient indéfiniment un compte sans équipe,
  reçu nativement en 407 avec HTTP 200/null. Absence et refus de contexte rendus
  explicitement en 408. Cause : null métier assimilé à une requête en cours.
  Le choix admin multi-équipe reste à raccorder au contexte existant.

- **2026-10-07 — 410, actions et arrivée des campagnes** : pivot de marque fictif,
  liens non bornés et campagne sans tâche invisible reproduits sur PostgreSQL
  et rendu. Extension des écrivains et du lecteur existants ; mêmes règles
  manuel/handler et refus typés. Cause : contexte transverse d’équipe confondu
  avec un contexte de marque et projection de campagnes dérivée des seules tâches.
  Réception finale à suivre dans RESIDUAL-DEBT, sans clôture du cycle métier.
