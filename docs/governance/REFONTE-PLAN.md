# La Fusée — Refonte Governance "Sans Compromis"

## Droits de marque → catalogue source → proposition à relire — 443 livré, réception bornée (2026-10-10)

useBrandWriteAccess dans use-can-operate réutilise strategy.getMyAccess : zone
stratégique `*`, calendrier `calendar` et capacité opérateur restent distincts.
Le chargement/rafraîchissement, l’absence de marque ou l’échec d’accès ferment
les droits ; une capacité opérateur seule n’autorise pas une autre marque.
PillarPage raccorde ses gestes à ces droits, propriétaire autorisé au recalcul
manuel ; LOCKED garde son refus. ActionDatabasePanel exige canWrite/canSync
explicites, false par défaut, et propose MANUAL par défaut avec IA facultative.
Aucun droit, service, router, page, modèle, Intent, Neter ou ADR ajouté ; choix,
source I, writers et gates serveur inchangés.

Le compteur du catalogue I utilise collectNormalizedInitiatives sur
catalogueParCanal/actionsByDevotionLevel/actionsByOvertonPhase, déduplique les
identités et distingue catalogue absent (« Nombre d’actions à vérifier ») et
catalogue explicitement vide (zéro). La Base d’actions affiche sa projection
synchronisée ; son nombre ne remplace pas celui de la source. Le recalcul S
réussi dit « Plan recalculé et sauvegardé — proposition à relire » ; updated
non vrai ou erreur rend un refus métier sans code/stage brut dans ce retour.
Cela ne vaut ni approbation, ni génération de contenu, ni réception de tous les
messages du cockpit.

Preuves privées release/preuves-guidance-443 : red.log treize rouges/huit verts
sur 442 ; red-feedback.log huit rouges. green.log 29/trois puis 33/quatre verts,
dont quatre interactions ActionDatabasePanel. DS/vocab dix/quatre verts ;
full-unit.log checkpoint 4 236/404, premier gauntlet cinq sorties 0/gouvernance
1 624/166 et 24 warnings connus, antérieurs à la garde ambition LOCKED. Cette
ambition encore active a été révélée nativement : red-locked.log un rouge/
quinze verts, garde du contrôle existant corrigée, green-locked.log 34/quatre
verts. Unité finale après garde : 4 237/404 verts ; cinq contrôles finaux reçus à zéro,
gouvernance 1 624/166 et lint 24 avertissements existants/aucune erreur.
Gauntlet final : tsc/lint/lint-governance/cycles/gouvernance cinq sorties 0.
Source c2a0b0f6fff04f56d2e473cf5ce6747e99eed814 ; CI 38016938304 success,
ci.log relu 4 237/404 unitaires et 345/18 PostgreSQL. Mission 38016938297 et
Chromatic 38016938248 success. Image 38017164762 success, smoke boot migrations/
login 200 et PDF deux pages reçus. Index exact
sha256:680962a922df960e77df9133a16ac3d1e3db4427862f1d94f867c21f94d37f37.
Déploiement unique rds2yj62bot2l6ji9ci1mxwf fini, application
q9b4m57yh93gxbjykj470giy ; runtime 6.27.443 running/nextjs, private-media RW,
/api/version 200. Source/image/runtime distincts du présent reçu documentaire.

native-local-receipt.json relu : locale USER/TRIAL fictive, connexion normale.
Catalogue source trois/projection initiale une puis trois après sync ; formulaire
MANUAL actif sans soumission IA. Propriétaire opérateur : choix/sync/recalcul S
HTTP 200, updated=true/v2 et message sauvegardé/à relire ; fenêtre de ces gestes
non tronquée/hasMore=false, zéro exception/loadingFailed dans cette fenêtre.
Propriétaire USER sans opérateur (canOperate=false/getMyAccess owner[*]) : choix
et recalcul sauvegardé disponibles, Sync absent ; dernier choix réellement
retiré par UI puis plan vide sauvegardé, brouillon sans budget fabriqué, pas refus
ni approbation. État final fixture I v3/deux archives, S v4/trois archives,
zéro GenerativeTask/CostDecision, six Intents dont premier refus. Ce refus 400
venait de formats/objectif Overton/FAN hors schéma de la fixture : donnée fictive
seule corrigée, reçu native-first-refusal.json conservé.

ART_DIRECTOR d’un autre opérateur, canOperate=true mais writeZones [] : catalogue
une ligne bien chargée/choix désactivé, Proposer et Sync absents. Identité chargée
sans bouton/lien Modifier ; recalcul/deux ambitions désactivés et Enrichir absent.
Dernière garde LOCKED relue après HMR/navigation : recalcul et deux ambitions
désactivés, aucun geste forcé. Mobile demandé 390×844, document/body 384 px,
message de sauvegarde visible/capture native-mobile-plan-saved.jpg conservée,
aucun débordement global observé, viewport restauré. Calendrier délégué reçu en
test seulement, pas de troisième rôle natif.

Compilation froide cockpit 70 s/premier batch 72 s, timeouts Page.navigate/wait
conservés, même onglet/serveur jusqu’au rendu. Première fenêtre réseau tronquée :
aucun zéro réseau global ni SLO déduit. fixture-cleanup remaining=0/cleaned=true,
onglet 15 fermé/session dev arrêtée volontairement (130). Toutes les mutations
restent fictives/locales, aucune marque réelle modifiée ; wholeJourneyAccepted=false.

native-runtime-receipt.json relu/capture native-runtime.jpg inspectée : lecture
réelle SPAWT ADMIN, auth.me/getMyAccess admin[*], canOperate=true. Catalogue source
15 distinct de la projection 36/28 retenues ; formulaire Ajouter manuel actif,
ouvert/fermé sans soumission. Libellé Recalculer le plan reçu, ancien S Périmé
non recalculé ; aucune mutation métier, recalcul source, approbation ni recette
USER de production. Fenêtre bornée après chargement S : navigation stratégie/I,
formulaire et accès, truncated=false/hasMore=false, 16 réponses toutes 200/zéro
≥500 ou exception observée, quatre net::ERR_ABORTED canceled=true conservés.
Reload initial tronqué/attente trois secondes expirée puis page chargée ; retour
document final sans télémétrie complète. Aucun zéro réseau global/SLO/parcours
complet ; runtime.nativeReceived=false, nativeProductionReadReceived=true,
wholeJourneyAccepted=false.

spawt-public-live.json : vitrine fraîche six questions/sans compteur, stores
bientôt/liens inactifs, aucune soumission ; brandReconnectionReceived=false.
La vitrine live/décompte retiré et l’[identité choisie reçue en 432](RECEPTION-IDENTITE-PUBLIQUE.md)
(lot de preuve 433 : édition SPAWT v6, palette/cinq polices/trois usages Moka/
citation) restent des réceptions antérieures. C2 poursuit l’extension aux autres
destinations/variantes/quiz/application/retour ; aucun univers intégral reçu.

**Reprise en place** : contrôle/commit/CI du reçu documentaire restent distincts
et ultérieurs. Causes locales compteur/droits/retour reçues sur ce périmètre ; les autres surfaces de droits/messages restent dans la passe cockpit
existante. Budget qualitatif, absence→0/horizon défaut, projections roadmap et
autres écrivains/consommateurs S restent dans le lot Guidance C3/C4/C6 ; pas de
gate stricte affaiblie ou donnée inventée. Les sondes pures locales du
normaliseur (absence→0/LONG_TERM, LOW→500k, entrées invalides) restent des
contre-exemples de normalisation, pas des données réelles ni une invalidation
générale des politiques ADVE d’estimation. Sept chantiers/dix gates ouverts.
[Dette et déclencheurs](RESIDUAL-DEBT.md).

## SYNTHESIZE_S et recalcul S → calcul transactionnel commun — 442 livré, réception bornée (2026-10-10)

Les deux entrées existantes délèguent à recalculateSynthesis : executeProtocoleStrategy
lit les choix conservés dans I sous transaction/verrou Strategy. Le gateway
contrôle les versions A/D/V/E/R/T/I/S, y compris sources absentes null et S
précédent, avant tout upsert. REPLACE_FULL archive et retire la revue précédente,
refus LOCKED/provenance humaine remontés, contexte d’intention conservé. Les IDs
fournis à la commande doivent déjà correspondre aux choix source/projection ;
ils ne constituent pas une sélection implicite. S sort de la post-complétion
runChunkedFieldGeneration par LLM ; assistance narrative reste explicite.

Le composeur retire padding axes/facteurs, KPI/targets/funnels zéro et splits
budget/devotion non sourcés. Un jeu sparse reste un draft sparse, non approuvable
selon le contrat strict inchangé ; le writer de brouillon ne vaut pas revue.
Pas de service, route, Intent, modèle ou ADR ajouté.

Deux observations natives locales ont déclenché un correctif : sans
R.coherenceRisks, computed.coherenceScore est absent plutôt que 100. Le badge
de provenance de champ INFERRED devient « Déduit — à vérifier », car il couvre
aussi des calculs sans IA ; enum/autorités humaines inchangés. Copie du modal
existant/tests rendu alignés, domaine inclus dans le scan vocab HARD ; ce
raccord de scan ne constitue pas un reçu HARD final.
La relecture révélait encore « 0 /100 » dans le renderer malgré l’absence du
score : red-render-coherence.log sept rouges/treize verts, puis
green-render-coherence.log vingt verts. Le rendu affiche désormais « — /100 »
sans score et conserve un vrai zéro, sans attribuer un fait à l’absence.

Preuves privées release/preuves-synthese-442 : red.log six contre-exemples rouges
sur 441/dix-huit verts, green.log checkpoint 24 ciblés verts ; checkpoint ciblé
local 70/trois fichiers reçu, 28 action-decision-flow (dix nouveaux 442),
21 synthesis-write et 21 pillar-compensation. Source apparue après snapshot,
source versionnée modifiée, absence S, deux recalculs/archives, LOCKED et refus
de provenance testés. Full PostgreSQL 345/18 verts avant correctifs cohérence/
libellé ; red-coherence.log un rouge/27 non sélectionnés puis green-coherence.log
un vert/27 non sélectionnés. Premier gauntlet tsc/lint/lint-governance/cycles 0,
gouvernance 1 622 verts/deux rouges sur repères des deux exceptions internes
existantes (722/766→737/781), corrigés sans ajout d’exception. gauntlet.json final
cinq sorties 0/gouvernance 1 624/166 ; finaux locaux 4 210/401 unitaires et
345/18 PostgreSQL après derniers correctifs reçus. Stress exit 0 borné à sept
forges mock/états DB, pages/tRPC HTTP SKIPPED au port 3323 : aucune réception
globale UX/performance/provider déduite.

Native synthétique USER/TRIAL, authentification formulaire normale : propriétaire
choisi, retenir→sync→roadmap→recalcul, trois POST pillar.actualize HTTP 200.
native-recalc-response.json relu : updated=true/version4/selectedFromICount=1,
INTAKE 35 %. native-source-final.json : I reste v2, S v4/trois archives,
choix/budget 1 000 conservés, zéro GenerativeTask et CostDecision/quatre
IntentEmission dans cette fixture. Badge « Déduit — à vérifier » et score
inconnu corrects, reload conserve le plan ; native-synthese-final.png inspecté.
native-final-load.json : DOM observé ≤980 ms/titre ≤5 711 ms, bornes observées,
télémétrie reload truncated=true ; aucun zéro global ≥500/exception ou SLO déduit.
Fenêtre native-recalc-events.json et suivi sans troncature : POST 200, zéro
≥500/exception observé sur ces gestes, corps reçu. Affichages trompeurs 100/IA
et 0 de la première observation, retards/timeouts de recompilation conservés.
fixture-cleanup.json scoped cleaned=true/remaining=0 ; Next isolé et onglet 13
fermés. Aucun recalcul de vraie marque ni acceptation globale déduite de cette
fixture.

Source f7f39c2395214933fff29d5caf99f43adfa083dc ; CI 38012819228 success,
ci.log relu 4 210/401 unitaires/345/18 PG ; Mission 38012819206 et Chromatic
38012819173 success. Image 38012838924 success, candidate/config matched,
index sha256:9b93806b3b3ee7ce756498ea7aca9135d94ad9e84f02cb9e1c0ec905ff38a6f4.
Déploiement unique eoxc3odbydloc8k66bl8r7dg terminé 01:33:06 UTC le 10 octobre ;
runtime 6.27.442 running/nextjs/index exact/volume privé RW, /api/version 200.
native-runtime-receipt.json : lecture réelle SPAWT ADMIN potentiel→roadmap,
aucune mutation métier ni recalcul source, aucune réception USER en production.
Navigation complète truncated=false/hasMore=false : 59 réponses toutes 200,
zéro ≥500/exception et onze annulations conservées ; reload initial non exhaustif.
DOM observé ≤1 099 ms/titre ≤12 043 ms, bornes observées, pas premier affichage
précis/SLO. native-runtime.png inspecté : Périmé avec deux 100 %, ancienne S,
budgets/roadmap contradictoires conservés. runtime.nativeReceived=false et
nativeProductionReadReceived=true bornent cette lecture, wholeJourneyAccepted=false.
Vitrine spawt.online relue indépendamment : six questions, aucun décompte visible,
« bientôt » concerne les apps ; ces éléments étaient livrés avant 442, aucune
réception de l’univers/quiz applicatif complet déduite. Sept chantiers/dix gates
ouverts ; reçu documentaire et sa CI ultérieure distincts de la source livrée.

**Reprise Guidance existante** : normalisation LOW/MEDIUM/HIGH en montants,
absence→0 et timeframe défaut restent dans collectNormalizedInitiatives ;
projections roadmap/computed et autres consommateurs/écrivains S restent à
recevoir. executeRTISCascade utilise encore rtis-protocols/index.persistViaGateway
avec MERGE_DEEP/strictSchemaValidation : un sparse y est refusé, ce troisième
chemin n’est pas déclaré convergent. Préserver faits/absence/estimation dès
normalisation, puis tracer chaque projection et writer avec ses versions source,
sans affaiblir le contrat de revue. **Déclencheur** : prochain incrément du parcours
manuel Guidance avant C3/C4/C6 et preuve de release ; effort : un lot borné
normalisation/projections/écrivains, puis recette manuelle transverse. Compteur
catalogue, boutons readonly et copie succès « stage INTAKE 35 % » restent dans
le prochain lot UX C3/C7 ; réutiliser les libellés métier de readiness, puis
recevoir succès/refus nativement sans jargon technique dans le message.
[Dette Guidance en place](RESIDUAL-DEBT.md).

## Choix d’action → I versionné → calcul du plan — 441 livré, réception bornée (2026-10-10)

Le chemin existant SET_BRAND_ACTION_STATUS/SELECT écrit le statut source dans
I par writePillar et BrandAction dans la même transaction : expectedVersion,
PillarVersion, staleness S et contexte intentId conservés. Le refus d’écriture
remonte au routeur. La provenance humaine vise `initiatives.<id>.status` :
le choix d’une initiative ne fige pas l’ensemble du catalogue et n’empêche pas
l’ajout ou la modification d’autres propositions. La matérialisation suit le
statut I après conservation des choix humains par le gateway ; BrandAction reste
sa projection d’exécution. Planning, exécution, métadonnées et lignes manuelles
protégés, avec verrou Strategy commun.
withPillarTransaction factorise le chemin transactionnel partagé dans le gateway
existant et réutilisé par writePillarsAtomically. Les deux exceptions internes
existantes restent exactes, les anciennes exceptions d’écriture directe S/I
sont supprimées ; aucune nouvelle allowlist ou capacité.
executeProtocoleStrategy consomme seulement SELECTED_FOR_ROADMAP dans
catalogueParCanal/actionsByDevotionLevel/actionsByOvertonPhase ; il ne choisit
pas à la place du dirigeant, ne promeut pas I et ne lance aucun LLM implicitement.
Extension des chemins existants, sans Neter, Intent, service, modèle, route ou ADR.

ActionDatabasePanel invalide get/assess/readiness des piliers pour la stratégie
courante après succès d’un choix. Bouton désactivé pendant mutation ; refus de
choix/synchronisation rendus role=alert en texte métier sans détails internes.
Réceptions locales propriétaire et lecture seule reçues ci-dessous.

Preuves privées release/preuves-choix-441 : decisions-before/after.log,
onze contre-exemples PG rouges puis onze verts. regeneration-before.log :
un rouge/douze verts ; regeneration-after.log : treize verts sur PostgreSQL réel.
postgres-final.log final actuel après factorisation : 335 tests/18 fichiers
verts, dont dix-huit action-decision-flow. Proposition manuelle rattachée une
fois à I, budget calculé
250 dans la fixture, refresh/choix concurrent et projection du choix source
versionné inclus. choice-provenance.log : 17/17 verts, quatre ajouts ;
gateway-final.log : 25 tests/trois fichiers verts.
empty-budget-before.log : un cas rouge/dix-sept non sélectionnés, puis correctif
du budget vide hérité repris depuis le montant source réel 1 000, sans estimation
fabriquée ; nouveau cas inclus dans le complet 335/18.
Bump atomique 441 effectué aux quatre emplacements, CODE-MAP régénéré par racine
dans l’état final : 1 825 lignes/139 301 caractères.
Première passe gauntlet deux violations des gardes, puis factorisation du
writer existant ci-dessus ; gauntlet.json final cinq sorties 0,
tsc/lint/lint-governance/cycles reçus et gouvernance 1 624 tests/166 fichiers
verte à 01:09:46. Aucun changement de code depuis les quatre lignes finales du
matérialiseur ; 24 avertissements connus. stress:full exit 0 mais
HTTP http://localhost:3000 injoignable : pages/tRPC SKIPPED, uniquement sept
forges mock et états DB ; aucun reçu UX ou SLO déduit.
Native locale USER/TRIAL par authentification formulaire normale, fixture deux
marques : SELECT 200/updated=1 → I v2/archive1/provenance HUMAN du seul statut ;
sync 200/upsert1 conserve ID et choix Retenu ; retrait 200/updated=1 → I v3/
archive2/RECOMMENDED et BrandAction false/PROPOSED visibles sans reload.
get/assess/readiness effectivement relus ; source LOCKED synthétique refuse
400/BAD_REQUEST avec alerte métier visible. Budget sync 1k XAF reçu.
native-select/sync/withdraw/locked-http.json et états native-selected/withdrawn/
refused.json relus. ART_DIRECTOR ACTIVE d’un autre opérateur : sync 403/FORBIDDEN
avec alerte métier visible ; I, sources, versions et archives de l’autre marque
exactement inchangés après comparaison des reçus. native-local-receipt.json :
synthetic=true, production=false, nativeReadReceived=true,
nativeMutationsReceived=true, wholeJourneyAccepted=false ; onze sources modifiées
du manifeste racine/builder aux hashes identiques. Fenêtre fraîche entière
truncated=false : zéro réponse ≥500 et zéro exception, sans décompte de réponses
affirmé. Document HTTP 200, DOM 5 515 ms depuis navigation CDP ; titre Potentiel
observé ≤85 520 ms, borne incluant l’écart entre appels après une première
attente du titre sans réception. Compilation dev froide incluse ; cette
borne ne mesure ni le premier affichage ni une performance native précise/SLO.

api-scheduling-receipt.json : appels HTTP locaux indépendants du navigateur,
credentials ordinaires USER synthétique. setTiming 200/updated=1 sur une
proposition non retenue conserve PROPOSED ; action absente 400/BAD_REQUEST.
autoSchedule 200/scheduled=0 sans choix ; autre stratégie ART_DIRECTOR
403/FORBIDDEN. Corps réels relus, aucune recette calendrier de production ni
wholeJourney déduit. Les deux passes de fixture sont nettoyées (remaining=0),
serveur 3322 arrêté et onglet local fermé avant commit.

Source 3a8a2c9732dab7a0fb27092ca56f41451ee60849 poussée. CI 38008417812,
Mission 38008417796 et Chromatic 38008417809 success ; ci.log relu : 4 203
unitaires/401 fichiers et 335 PostgreSQL/18 fichiers. Image 38008635901 success,
image-digest.json relu : index
sha256:5d95a400f4f483bb75547ad28d6abe2bb483c26a29c44a15254cade543c48a28,
manifest sha256:b14f5774c365b9eb95dd43fc8d3bbcd319527fbd19226cf3567c0f07c2be5e1d,
config candidate/publication et registre latest concordants. Déploiement unique
sjm9z0o3prx8yspf46dlp34o terminé 2026-10-10T00:32:40Z ; runtime.json reçu :
441 running, user nextjs, index exact, volume privé RW, /api/version HTTP 200.

Lecture native réelle SPAWT le 10 octobre, native-runtime-receipt.json/DOM/
body actions et capture inspectés : 36 actions/28 retenues. Session préexistante
sans injection, /api/auth/session relu : rôle ADMIN ; aucune réception USER en
production. USER/TRIAL et ART_DIRECTOR ACTIVE sont uniquement les fixtures
locales reçues ci-dessus. Fenêtre fraîche non tronquée : 61 réponses toutes 200,
zéro ≥500 et zéro exception, neuf ERR_ABORTED tous canceled=true conservés.
Document HTTP 200, DOM 655 ms depuis le départ de requête au DOMContentLoaded,
pas temps de page utilisable/premier affichage/SLO. Première fenêtre tronquée et
attente Synchroniser échouée avant chargement conservées dans les preuves.
Aucune mutation de vraie marque, approbation, recalcul ou production métier ;
S historique pré-lancement et budgets discordants observés restent ouverts.
wholeJourneyAccepted=false ; sept chantiers/dix gates toujours ouverts.
Deux écarts UX restent tracés : boutons de mutation visibles en lecture seule,
et fixture partielle avec une action mais compteur catalogue/footer à zéro.
Prochain lot UX C3/C7 : lecture canonique des droits calendrier existants pour
le panel et diagnostic du compteur I sur ses trois collections, sans fabrication.
[Dettes et déclencheurs](RESIDUAL-DEBT.md).

**Prochaine étape du parcours manuel** : SYNTHESIZE_S appelle encore Notoria
et retourne des recommandations, sans calcul S versionné convergent. Lecture
statique de rtis-cascade.ts:496–557 : S reste inclus dans la post-complétion
runChunkedFieldGeneration par LLM ; savePillar:37–64 sauvegarde sans garde des
versions source du calcul. Le calcul pur 441 ne garantit donc pas toute la
cascade S sans IA. Le calcul
historique complète les facteurs jusqu’à cinq et garde des valeurs, targets ou
types par défaut. Le schéma exige notamment trois axes, trois facteurs et cinq
actions de sprint ; ces exigences de forme ne prouvent pas l’origine métier.
Factoriser commande et cascade S vers le calcul existant et le gateway,
contrôler les versions source avant sauvegarde, rendre la post-complétion IA
explicitement facultative, assistance Notoria comprise. Séparer faits sourcés,
absence et estimation ; retirer les
remplissages utilisés comme preuve de complétude sans abaisser le contrat strict.
Recevoir le parcours choix → refresh sans effacement → calcul versionné → revue
de la version actuelle, en prouvant les versions des sources et le remap UUID.
**Déclencheur** : prochain incrément manuel Guidance avant C3/C4/C6 et preuve de
release ; effort : un lot borné dispatch/calcul/contrat, puis recette locale
normale et réception transverse. [Dette Guidance existante](RESIDUAL-DEBT.md).

## Synchronisation d’actions — 440 livré, réception bornée (2026-10-09 UTC)

actions.sync réutilise assertCalendarWrite avant syncBrandActionsFromBlob :
propriétaire, même opérateur, ADMIN et délégation calendrier ACTIVE conservent
leur autorité ; autre opérateur, ART_DIRECTOR en lecture seule et délégation
révoquée sont refusés, cible absente NOT_FOUND pour USER ; contrôle ADMIN existant
conservé. Aucun nouveau droit, modèle,
service, route, kind, Neter, page ou ADR. La vérification répare un chemin
d’écriture existant ; elle ne réconcilie pas les décisions de la projection.

Preuves privées : release/preuves-decisions-actions-440. Accès isolé
access-baseline-red.json : quatre rouges/deux verts, puis six verts. Suite
PostgreSQL persistante : baseline cinq rouges/trois verts sur huit cas,
postgres-targeted-green.log huit/un fichier verts ; postgres-final.log complet
317/dix-sept fichiers verts. Configuration de suite inclut le nouveau fichier.

Native locale USER/TRIAL fictive, login normal, patch 440 sur serveur de
développement affichant encore 439 : actions.sync HTTP 403/FORBIDDEN pour la
lecture seule, notice « Votre rôle sur cette marque est en lecture seule sur le
calendrier. », selected=true/SCHEDULED/titre préservés. Propriétaire HTTP 200,
une initiative/une action upsertée/zéro supprimée/même identifiant. Deux fenêtres
d’appel complètes truncated=false/hasMore=false sans ≥500 ni exception ; fenêtre
login/navigation tronquée, aucun zéro global ni SLO. Première navigation en
timeout de compilation froide et ancien cookie localhost non déchiffrable
conservés comme historique de recette, puis authentification normale réussie.
Captures lecture seule/propriétaire inspectées ; native-api-receipt.json,
native-call-windows.json et corps 403/200 relus. fixture-cleanup.json et
native-cleanup-receipt.json : remaining=0, serveur 3321 arrêté/onglet 11 fermé.
Aucun dossier réel modifié ni appel fournisseur/production payante.

**Contre-exemple métier ouvert** : le geste propriétaire autorisé transforme
encore selected=true/SCHEDULED en selected=false/PROPOSED. Le droit d’accès ne
prouve donc pas la préservation des choix, états ou budgets. La prochaine
exécution Guidance avant C3/C4/C6 doit réconcilier I versionné et projection
BrandAction, préserver décisions/états finis/publications armées, coordonner
remap UUID et versions source du calcul, puis recevoir le parcours choix →
synchronisation → calcul S → nouvelle revue manuelle. Estimations standards
distinctes des décisions ; assistance des agents facultative. Effort borné :
reproduction propriétaire, factorisation des chemins existants, puis réception
transverse ; aucun backfill global ou fait métier inventé.
[Dette Guidance existante](RESIDUAL-DEBT.md).

**Contrôles locaux finaux reçus** : gauntlet.json, cinq sorties 0 ; gouvernance
1 620 tests/166 fichiers verts, 24 warnings connus sans erreur. Régénération
officielle CODE-MAP réussie, aucun diff.

**Source, CI et image reçues** : e217c08e447761dcdfa4298208fb94decb0ae2ba,
CI 38001813652 success (4 197 tests/401 fichiers unitaires, 317/17 PostgreSQL),
Mission 38001813576/Chromatic 38001813575 success. Image 38002258278 success,
configuration candidate/publiée identique, index
sha256:92b1b601c98af11264f075061809827f2032cb7e6ad9176ffc9c7042331b5be8
exact vérifié au registre ; ci-tests-receipt.json/image-digest.json relus.

**Runtime et lecture de production reçus** : déploiement unique
ltimbilw87f2raani3h9hbi2 terminé 2026-10-09T23:13:52Z ; runtime 6.27.440
running/nextjs/volume privé RW, index 92b1b601 exact, source e217c08e et version
publique HTTP 200. runtime.json reçu à 23:14:50 UTC. Lecture seule réelle USER
SPAWT après reload, titre Stratégie/v440 visible : PÉRIMÉ avec deux 100 %
inchangés. Journal complet truncated=false/hasMore=false : 60 réponses toutes
200, zéro ≥500 et zéro exception ; douze net::ERR_ABORTED tous canceled=true,
aucun zéro transport global. native-runtime-receipt/events/ax/png et corps
readiness relus, capture inspectée. headingObservedWithinMs=16 203 est une borne
supérieure incluant le délai entre appels, ni premier paint exact ni SLO.

Aucune actions.sync sur un vrai dossier de production, aucune décision réelle,
approbation ou production payante ; mutations d’accès 403/200 reçues seulement
sur fixture locale avant commit. nativeReadReceived=true/nativeReceived=false
rend cette limite explicite, wholeJourneyAccepted=false. Source/image/runtime
distincts du présent reçu documentaire. Aucune connexion de vitrine attribuée
à ce lot de plomberie ; sept chantiers/dix gates restent ouverts. Le résidu
propriétaire, les contrats I/S, versions sources et remap UUID gardent leur plan
et déclencheur Guidance ci-dessus.

## État actuel de marque et six questions — 439 livré (2026-10-09)

Le contre-exemple réel 438 Complet/Périmé est traité dans le lecteur existant :
PillarPage réutilise pillar.readiness pour un seul Badge d’état. assess conserve
la mesure des champs renseignés ; chargement/échec ne promettent aucun état
Complet. Contenu/assess/readiness relus après les gestes existants et onComplete
du recalcul RTIS, ligne wrap. Six mentions canon SPAWT et copy actuelle alignées
sur six questions/cinq axes ; « Ton radar » mesure Foule/Secret dans le quiz livré.
Aucun nouveau modèle/service/router/page/kind/Neter/ADR ni mutation/import réel.

Baseline six cas de rendu rouges (ui-red.log), puis 57 verts/trois fichiers
(targeted.log/tests-summary.json), checkpoint conservé ; targeted-final.log
reçoit 58/trois verts, sept UI dont fondation needsHuman. Première compilation
stageLabel TS2552 conservée sous first-gauntlet/tsc.log et gauntlet-first.json,
référence/badge secondaire retiré puis tsc-final vert. Cinq contrôles complets
relancés exit 0, gouvernance 1 620/166 ; gauntlet-final.json et gauntlet.json
contiennent maintenant la passe finale verte. Build compilée exit 0.

Native locale USER/TRIAL fictive, login normal, roadmap HTTP 200 : Périmé avec
deux 100 %, 65 réponses/zéro ≥500/exception, 14 ERR_ABORTED canceled conservés.
DOM 350,053/load 368,845 ms ; titre exact Stratégie observé ≤858 ms, borne
supérieure et non paint/SLO. Premier sélecteur erroné S — Roadmap conservé dans
native-initial-navigation.json, pas défaut produit. Captures desktop/mobile
inspectées : mobile demandé 390×844, clientWidth/documentScrollWidth mesurés
384 px, badge dans les bornes. native-local-receipt.json/native-mobile-receipt.json
et local-cleanup-receipt.json : fixture cleaned/remaining=0, serveur arrêté,
onglet fermé. Aucun noyau réel modifié, approuvé ou produit.

**Livraison reçue** : source b0399f4fccbc4637f5222ec05468b98048b33240,
CI 37997965596 success (4 197 tests/401 fichiers unitaires, 309/16 PostgreSQL),
Mission 37997965599/Chromatic 37997965541 success, image 37998236655 success.
Configuration candidate/publiée identique, index
sha256:20fc879c98528eb86bbedad7f70f55562c3ec72c3ea4a6bc0ebe18fe6efeb3cb
exact au runtime 439 running/nextjs/volume privé RW/version publique 200.
Déploiement unique la3ylsl6n7mb0ta0ycr9fl1k terminé à 22:30:20 UTC, runtime reçu
22:32:53 UTC. Native réelle SPAWT USER en lecture seule HTTP 200 à 22:34:22 UTC :
PÉRIMÉ avec deux 100 %, S COMPLETE/100 en présence, AI_PROPOSED/stale/Périmé.
116 réponses toutes 200/zéro ≥500/exception ; 32 échecs net::ERR_ABORTED conservés,
aucun autre type d’échec dans cette fenêtre. Le flag canceled n’est pas conservé
dans ce JSON ; aucun zéro transport global/SLO déduit. Notice de livraison
masquant la première attente de lien fermée normalement ; capture inspectée,
aucune mutation métier, approbation, réimport ou appel fournisseur.
Native-runtime-receipt/events/ax/png et runtime.json relus ; wholeJourneyAccepted=false.
Pas responsive global reçu. Source/image/runtime distincts du présent reçu
documentaire ; vitrine live et retrait du décompte reçus avant 439.

L’état affiché ne réconcilie pas les anciens budgets, sélections, formes/liens
stricts S ou versions du calcul. Aucune approbation ou production réelle ;
continuer la reprise Guidance ci-dessous puis quiz/application/retour au noyau.
Sept chantiers/dix gates restent ouverts. Les réceptions 437/438 ci-dessous
conservent leurs preuves et contre-exemples datés.

## Plan courant et relecture — 437 livré dans 438 (2026-10-09)

ADR-0215 Accepted étend le gateway et les archives existants : collections S
remplacées à toute profondeur, pas d’auto-approbation par writer, version restaurée
à relire et rétraction atomique S/Strategy après écriture ou dépendance modifiée.
Le verrou LOCKED reste ; la mesure inconnue reste null. Sources documentaires
→ Strategy UPDATE → piliers, canon-sync par gateway avec erreur rendue ; aucune
entité/service/kind/page/Neter ajouté. review-invalidation.ts, module interne,
partage rétraction/staleness avec invalidation documentaire et deux writers du
staleness-propagator ; Strategy UPDATE triées/sourceUse directement UPDATE.
S→s corrigé après un rouge/un vert ; propagateFromPillar true/false reçu, Process
seulement en mode auto existant/zéro fetch. 21 cas S ciblés verts ; complet
304/seize reçu avant cinq ajouts, puis final complet 309/seize reçu. Baseline
dix rouges/trois verts puis treize verts, checkpoint 70/quatre fichiers.
Cleanup intermédiaire corrigé, fixture nettoyée ; HARD collections rouge/
restauration exacte/vert reçu. Unitaire 4 189/4 190 : seul délai withRetry sous
charge build conservé ; recontrôles 36/1 puis complet 4 190/400 verts sans changement
du test. Cinq contrôles finaux exit 0/gouvernance 1 620/166 verts ; build isolé
terminé exit 0. Native locale USER/TRIAL approbation null v1 → écriture v2/revue
retirée → proposition relue/réapprouvée v2/200/null reçue. Stress isolé compiled
exit 0/zéro finding, 46 HTTP reçus/235 non reçus/sept DEFERRED sans fournisseur ;
pas réception des autres parcours ni clôture des 22 findings 436. canon-sync
statique + writer PG seulement. Sept tâches de la fenêtre stress bornée DEFERRED/
estimation zéro/sans providerTaskId, nettoyées avec quatre marques synthétiques,
remaining=0 ; serveur isolé arrêté. Source 912e481e/CI 37992424716/image 37992697193/
runtime 438 exact reçus ; décision architecturale acceptée et code livré.
Lecture seule réelle du plan et de la Forge SPAWT reçue, sans approbation/recalcul :
S v3 AI_PROPOSED/91,2 %, composed=false/canValidate=false. Readiness COMPLETE/100
par présence mais stale, displayLabel=Périmé et DISPLAY_AS_COMPLETE/ORACLE_EXPORT
refusés ; le plan affiche pourtant Complet. Ce contre-exemple UX rejoint la
réconciliation des contrats/formes, pas un besoin de 80 faits métier inventés.
Tous autres modes/agents, sept chantiers/dix gates non reçus.

Prochaine exécution Guidance avant C3/C4/C6 : séparer estimations standards et
décisions de sélection/temps/budget, converger SYNTHESIZE_S manuel vers calcul
existant avec assistance Notoria facultative,
passer le writeback I par le chemin versionné et réconcilier BrandAction,
coordonner le remap UUID et prouver les versions source au recalcul. Réconcilier
les formes historiques, maturité par présence, affichage Complet/Périmé et contrat
strict sans abaisser la gate ou inventer des faits. Reprendre ensuite consommateurs, cycles/modes/
isolation et recette réelle SPAWT/Noël ; les sept chantiers restent ouverts.
À C5/échéances : reproduire auditAllStrategies sur DRAFT/VALIDATED + manuel false,
puis séparer fraîcheur/lancement automatique. Lecture ACTIVE seul/flag non
consulté statique, ni reproduite ni corrigée dans 437.
[Décision Accepted](adr/0215-synthesis-writes-require-new-review.md) ·
[réception bornée](RECEPTION-ECRITURE-SYNTHESE.md) ·
[dette et déclencheur](RESIDUAL-DEBT.md).

## Décision de synthèse — runtime 436 reçu, métier partiel (2026-10-09)

ADR-0214 Proposed factorise l’état de validation dans pillar-gateway existant,
partagé par strategy.validateSynthesis et pillar.transitionStatus, sous le kind
déjà présent. Composition ENRICHED/COMPLETE + schéma S, version relue, sources,
acteur et portée contrôlés ; persistance S/Strategy atomique, confidence jamais
réécrite par la confirmation. La maturité globale COMPLETE garde ses exigences
propres. Approuver S ne déclenche aucun fournisseur ; les projets explicitement
issus des initiatives requièrent S approuvé/composé/frais au début de la commande.
Les autres travaux de marque restent indépendants. Quatorze PostgreSQL ciblés
verts et cinq cas natifs synthétiques reçus, dont confirmations sans modifier
22 %/inconnu et conflit de version puis nouvelle lecture, sans production.
Suites locales complètes vertes ; stress-full en échec après redémarrage mémoire
Next dev, reprise sur artifact build/instance isolée planifiée dans la dette du
harnais. Copie native finale et faute confidence=1.0 remise en rouge/restaurée
reçues. Gauntlet final vert/fixture nettoyée, source 80e2122f/CI/image/runtime reçus.
Lecture réelle SPAWT : S existe à 91 %/AI_PROPOSED v3, non approuvable ; readiness
COMPLETE/100/stale et 80 chemins de types/liens/structure refusés par schéma strict,
pas 80 faits absents. Prochain lot : factoriser les contrats/formes historiques/S
calculé depuis les sources, sans affaiblir la gate ni inventer du contenu.
La suite documentaire/postmerge et les écrivains 437 sont reçus par 438 ci-dessus ;
autres consommateurs S et concurrence de création des projets restent ouverts. Aucun noyau
réel validé, sept chantiers/dix gates toujours non acceptés.
[Contrat proposé](adr/0214-synthesis-approval-preserves-confidence.md) ·
[réception et limites](RECEPTION-VALIDATION-SYNTHESE.md).

## Reprise et supervision — runtime 435, suivi vide reçu (2026-10-09)

434/source 24ddb3c8/CI 37907427545/image 37907430453/runtime reçus ; native
tracker 403 pour compte sans affectation, écran non reçu. Chokepoint existant
repris par listForges seulement : dossier explicitement choisi/ADMIN effectif
canonique, aucune équipe par défaut ; canResume selon affectation actuelle,
lecture seule sans bouton si absente. Mutations/autres lectures restent strictes.
435 livré : quatre cas PG ajoutés, deux rouges/49 verts puis 51 ciblés verts ;
native locale par URL connue sur deux dossiers/deux équipes reçue : chacun sa
tâche en lecture seule/canResume=false, sans bouton ni secret. Actualiser HTTP 200/
zéro exception, fenêtre complète ; copie FR finale relue, fixture nettoyée.
Sélecteur local 0/0 historique ; liste réelle reçue après chargement en production,
passage vers le portefeuille groupe FrieslandCampina non pilotable reçu par son
lien en lecture seule, portée/ambiguïtés rendues, sans métriques isolées ;
gauntlet 435 cinq exit 0/gouvernance 1620/166/24 warnings préexistants et PG complet
seul 274/14/Ptah 51 inclus reçus. CI 435 : 4 180/399 unitaires et 274/14 PG/image/runtime reçus.
Native SPAWT listForges HTTP 200/zéro ligne, 403 disparu ; fenêtre complète : 63 réponses/
aucune ≥500/zéro exception/log. Suivi vide seulement, aucune reprise/production réelle.
Reload local tronqué et timings production bornés, sans SLO déduit.

ADR-0213 Proposed : demande différée → reçu original vérifié/portée relue →
gates actuelles → réservation même tâche avant réseau → état connu ou incertain →
admission existante du résultat. Deux entrées strictes reprise/nouveau brief,
hybride refusé avant émission/tâche ; COMPLETED exige les IDs AssetVersion
existants/scopés non vides. Tracker/page/gardes existants, pas de second
journal ni nouveau service/router/Intent/modèle/permission. Sceau v2 canonique
et horodatage sous verrou du spine commun ; v1 conservé, historique non
recalculable non vérifiable, aucun backfill de payload ou de validation.
Fix session 433 dédié d973f735 avant Ptah/sceau 434, livré dans le bundle 434
sans runtime 433 autonome : affectation relue en base par session,
trois rouges/verts auth et marque native retrouvée, sans tenant JWT/rôle/droit.
Faux vert ACTIVE corrigé par validationStatus explicite dans forge.
Deux rouges émission/trois rouges reprise puis garde hybride rouge/verte ;
PostgreSQL 270/14/Ptah 47 cas reçus. Sceau sans tri réinjecté rouge/restauré,
cinq PostgreSQL verts ; garde COMPLETED renforcée après rouge tests/unit seul.
Suite globale exacte npm test -- --run : 4 180/399 verts après ces gardes et
découplage des dates, PG 270/14 final reçu seul ; timeout concurrent conservé,
cause non démontrée.
CLI 1 002 lignes : fenêtre 1 000 bornée, --all détecte
l’altération hors fenêtre ; legacy non vérifiable/sans sceau refusés.
Reprise même tâche DEFERRED HTTP 200/refus reçu altéré HTTP 412 et dirigeant sans
affectation sans montage tracker/Reprendre natifs locaux reçus ; anciens
compteurs par mauvais sélecteurs invalides, nouvelle pagination 20 puis 22 uniques
reçue. Types/lints/cycles/gouvernance finaux verts après découplage,
1620/166 ; tracker EN/ZH reçu,
FR restauré sans forge intégralement traduite. Horodatage logique après verrou,
pas preuve d’heure métier/fraîcheur des lignes historiques ; startedAt réel
distinct après verrou. Horloge future 60 s : un rouge/quatre verts puis cinq
PostgreSQL verts, clôture/durée/hash relus ; aucun SLO global déduit.
Stress isolé exit 0 : 46 HTTP reçus/235 non reçus/zéro échec, trois queries
anonymes/sept kinds et transitions locales, hors native protégée/Glory phase 3/
fournisseur réel. Wrapper/heap locaux uniquement, harnais général non réparé,
fixtures nettoyées ; ce stress précède les dernières gardes de contrat et dates.
Prochaine réception C3/C4/C5/C6 : achever les parcours natifs restants,
concurrence/interruption/réponse incertaine sans doublon,
stress des parcours restants ; CI/runtime 435 et suivi vide SPAWT déjà reçus.
Recevoir ensuite le suivi natif des productions présentes et les reprises
effectives, sans assimiler les lectures du sélecteur/portefeuille à un cycle reçu.
Puis configuration et fournisseur réels, octets,
provenance et facture ; le sceau ne ferme pas le close best-effort du journal.
Passe S/validation reçue au runtime 436 ci-dessus, encore partielle avant acceptation
C3/C4/C6 : confiance inconnue, composition et décision séparées ; réception
finale et consommateurs transverses restent ouverts. Le faux label ACTIVE seul
était réparé en 434 ; [résidu et déclencheur](RESIDUAL-DEBT.md).
Runtime 435/suivi vide SPAWT reçus, métier partiel ; sept chantiers/dix gates non
acceptés. [Contrat](adr/0213-deferred-production-resumption-and-seals.md) ·
[réception bornée](RECEPTION-PTAH-REPRISE.md).

## Identité projetée par usage — 432 livrée, reçu partiel C2/C3/C4 (2026-10-09)

ADR-0212 Accepted borné étend le circuit reçu du logo et la référence admise : source
→ choix explicite id/version/rôle → édition publique v2 → copies conservées →
lecteur vitrine vérifiant l’ensemble. Palette, familles/fichiers OTF/TTF, poses
et citation de référence restent facultatifs ; styles par destination et lecture
v1 conservés, sans promouvoir une charte ni ajouter de service ou d’Intent.
La revue PublicIdentityReview est dans Connexions/strategy.update existants ;
brand-vault/Sustainment/MESTOR conserve les reçus et le transport borné.

Gauntlet local reçu : 4170 unitaires/1617 gouvernance/253 PostgreSQL, types/lints/
cycles sans erreur, 24 warnings ; vitrine 38/types/build verts. Native locale
publication/revue/retour producer et première consommation sous harness reçus ;
retour local consumer interrompu historique. CI/image/runtime 432 exact reçus,
source 3968c0a1. Publication réelle v4/revue inchangée v5/retour v6 reçus côté
producer et consumer : huit copies stables, cinq polices/trois poses/six couleurs/
citation, origines/CSP conservées ; trois éditions seulement ajoutées. Espacement
16 px/mobile 390 sans overflow reçu. Réception partielle C2/C3/C4 ; reprendre
filiation HD/WOFF2, legacy sans archive, récupération stockage et autres
destinations/quiz-app/retour de valeur. Déclencheur : prochaine destination ou
recette stockage/filiation, avant acceptation de ces parcours. Production reçue
432/SPAWT v6, sept chantiers/dix gates programme non acceptés.
[ADR reçu, borné](adr/0212-versioned-public-identity-projection.md) ·
[réceptions distinctes](RECEPTION-IDENTITE-PUBLIQUE.md).

## Octets de publication — 431 livré et reçu (2026-10-09)

Le transport d’une copie publique vérifiée complète le stockage chiffré
existant. ADR-0211 Accepted l’étend depuis brand-vault/Sustainment/MESTOR :
reçu d’octets privé, conservation/relecture avant commit, URL par édition/hash et
lecture bornée avec contrôle avant 304. Retour sous pins/source courants, aucun
backfill des anciennes éditions ; nettoyage volume protège les copies référencées.
Trois rouges/22 verts puis 25, 32 et 33 PostgreSQL ciblés verts ; gauntlet local
vert : 4167 unitaires en trois commandes/1617 gouvernance/256 PostgreSQL,
types/lints sans erreur/24 warnings et zéro cycle. Source 3f104072, CI/image/runtime
431 reçus le 9 octobre à 03:07:30 UTC. Publication native réelle unique SPAWT v3,
copie VOLUME vérifiée, logos vitrine/page publique chargés ; textes/liens conservés,
corpus hors édition inchangé (actifs 257→258). Refus corruption/retour reçus sur
fixture locale nettoyée ; réouverture relire en production annulée sans publication.
Cause octets des nouvelles éditions fermée. Prochaine étape : legacy sans archive,
récupération/disponibilité du stockage, lifecycle HTTP_BLOB et autres familles
d’identité, avant réception multidestination/quiz-app/retour de valeur. Continuité
de marque visée, aucun résultat business ni acceptation globale déduit.
[Architecture reçue, bornée](adr/0211-retained-public-logo-bytes.md) ·
[reçu courant](RECEPTION-IDENTITE-PUBLIQUE.md).

## Origine de marque — 430 livré après blocage 429 (2026-10-09)

429 est livrée, source 383f5e8a/image 37868294874/runtime exact, déploiement
terminé à 01:22:53 UTC ; corpus et édition SPAWT v1 conservés. Mais le sélecteur
réel ne propose que « Sans logo », sans publication : NEXT_PUBLIC_BASE_URL reste
inliné à localhost:3000 dans deux chunks, malgré les origines serveur HTTPS.
430 centralise la résolution runtime dans brand-theme existant, réutilisée par
publisher HTTPS et export compatible HTTP local. Deux rouges/27 verts puis
29 ciblés verts ; gauntlet complet 4167 unitaires/1617 gouvernance/245 PostgreSQL,
types/lints sans erreur/24 warnings et zéro cycle. Source 2b9b2fa4, CI 37871315767
et image 37871326006 reçues ; runtime 430 exact déployé à 02:02:23 UTC.
Neuf helpers compilés et sélection native réelle reçus : une seule publication
SPAWT v2, deux logos et page publique chargés, textes/liens conservés ; seuls
les actifs augmentent de l’édition, 256→257. Cause d’origine fermée et purgée.
Prochaine étape C2/C3 : conservation d’octets et familles d’identité non reçues,
puis quiz/app/retour de valeur. Aucune acceptation globale déduite.
Trace native 429 tronquée, aucune réception exhaustive déduite.
[Reçu de livraison, échec et bornes](RECEPTION-IDENTITE-PUBLIQUE.md).

## Variante de logo publiée — recette locale 429 (2026-10-09)

ADR-0210 raccorde pool resolveBrandIdentity, choix explicite Connexions/pins
privés et deux logos de vitrine/CSP bornée/repli, sans promotion ni contrat public
supplémentaire. 27 PostgreSQL ciblés et native FOUNDER publication/restauration/
page publique reçus sur fixture, six éditions synthétiques reçues puis fixture
nettoyée. Gauntlet final vert : 4167 unitaires/397 fichiers, 1617 gouvernance/166,
243 PostgreSQL/14, types/lints sans erreur, 24 warnings préexistants, zéro cycle.
Vitrine 33 tests verts, PR #6 fusionnée/CI verte/déploiement reçu à 01:01:57 UTC,
logo natif en production non reçu à cette étape. Trois causes C2 retirées des actions locales.
Après premier passage 4166/4167 et timing 93 ms, isolé 36/36 puis relance complète
après arrêt du serveur verts ; cause non démontrée, diagnostic si récidive.
CI/image/livraison backend 429 reçues ; choix natif alors bloqué, cause fermée
par 430 ci-dessus. La recette locale 429 ne reçoit pas l’identité réelle.
Pins d’enregistrement sans immutabilité d’octets, identité complète/quiz-app/
retour de valeur/sept chantiers ouverts : [décision et reçus bornés](adr/0210-explicit-public-logo-variants.md).

## État de production Oracle — code 428 livré (2026-10-09)

Distinction Intent/tâche, DEFERRED ambre sans faux succès/coût $0, confirmation
explicite, FR/EN/ZH et gardes OperatorSurface/requireOperator reçus localement.
Le faux refus du staff révèle la lecture d’un operatorId absent de la session :
getOperatorContext courant remplace ce raccourci dans le chokepoint existant,
avant accès/émission ; JWT périmé refusé, sans nouveau droit ni nouvelle couche.
UI neuf verts après huit rouges ; garde sept verts après deux rouges et cinq
ownership. Natif : opérateur 403 sans effet puis 200/OK/DEFERRED, une tâche/deux
émissions sans version/coût ; founder sans commande et 403 sans effet. Zéro
exception/500 dans les fenêtres, préconditions synthétiques locales uniquement.
Suites finales 4 167 unitaires/1 617 gouvernance/230 PostgreSQL, types/deux lints
sans erreur, 24 warnings, zéro cycle reçus ; fixture nettoyée/Next arrêté.
Source cdd9f6c0, CI 37862693091/image 37862922982 et runtime 428 reçus à
00:19:53 UTC ; corpus/édition SPAWT et zéro tâche/version inchangés, volume privé
RW conservé. Connexions relue/hydratée sans saisie ; bouton/rôles toujours reçus
localement seulement. Distinction/garde/livraison fermées, pas d’acceptation C4/C5/C6.
Même tâche DEFERRED/configuration réelle restent à recevoir en C5 ; autres
résidus et sept chantiers inchangés : [reçu UX](RECEPTION-PTAH-UX.md).

## Filiation et reçu de demande — livraison commune 426+427 (2026-10-09)

Le code 426 transmet campaignId/briefId/sourceBrandAssetId jusqu’à la tâche et
partage le contrôle de portée avant fournisseur/admission ; la régénération relit
sa tâche historique, le descriptif MCP décrit l’admission. Le correctif 427
reconnaît le résultat racine ou enveloppé par Intent OK et admet DEFERRED.
Neuf rouges de filiation puis 35 ciblés/230 PostgreSQL verts ; deux rouges de
contrat puis 11 verts. Oracle HTTP 200/DEFERRED après redémarrage, portée et
émission enfant vérifiées ; MCP/tRPC/replay reçus sur fixtures locales, zéro
fournisseur. Suites finales 4 151 unitaires/1 610 gouvernance, types/lints sans
erreur, 24 warnings, zéro cycle.

Source 919cebb4, CI 37856242347, image 37856486468 et runtime 427 reçus le 8 octobre
à 23:06:42 UTC ; 426 n’a pas été déployée seule. Corpus/édition SPAWT conservés,
zéro tâche/version de forge en production avant/après. Transport des références
et désaccord de sortie fermés ; aucun fournisseur/média/facture/cycle réel reçu.
Connexions 427/édition v1 relues nativement sans soumission, pas le bouton Oracle
en production. Distinction/garde et OPERATOR/FOUNDER sont reçus localement dans
le code 428 livré ci-dessus ; cette recette reste locale. Note 428 précisée Oracle,
note 427 publiée conservée. Prochaine C5 : relance manuelle de la même tâche DEFERRED via
tâche/Intent existants, portée/coûts/anti-double appel et configuration réelle
reçus avant autonomie ; aucun chemin Connexions ni reprise automatique prouvés.
activeBriefId, upstream/multisource/documentaire/invalidation,
octets/CDN, Canva/Figma, parentAssetId, facture et journal restent au registre.
Aucun nouveau concept, modèle, service, Intent, outil ou ADR ; sept chantiers et
acceptations métier restent ouverts : [reçu courant](RECEPTION-PTAH-RESULTAT.md),
[constats historiques 426](RECEPTION-PTAH-FILIATION.md).

## Admission Ptah après résultat — 2026-10-08

Correctif 6.27.425 livré, sur les primitives existantes. Le résultat
fournisseur est checkpointé dans GenerativeTask avant une transaction commune
AssetVersion/BrandAsset/reçu de coût/COMPLETED. Verrou coffre partagé et verrou
de tâche rendent la reprise stable, sans doublon ni réactivation d’une archive.
La portée marque/équipe/campagne/brief/source est relue ; webhook et sync utilisent
PTAH_RECONCILE_TASK, et les futures forges portent leur émission parent réelle.
Aucun nouveau modèle, service, Intent, agent ou Glory tool.

Vingt-quatre tests PostgreSQL isolés verts, après dix contre-exemples initiaux
rouges, reçoivent cette frontière locale avec fournisseur synthétique. Suites
locales reçues : 4 144 unitaires/219 PostgreSQL/1 610 gouvernance ; zéro cycle,
lint sans erreur/24 warnings. HTTP après panne coffre et vrai redémarrage reçu :
checkpoint conservé sans admission, puis retry/replay 200 identiques, mêmes ids
et une version/un actif/un coût ; chaîne FAILED→OK→OK vérifiée. Zéro appel
fournisseur, fixture nettoyée. Source 2a296152, CI 37850685120 et image 37850690058
reçues ; déploiement terminé à 22:14:28 UTC, runtime 425/index exact rapprochés,
volume privé conservé. Lectures/refus de production reçus, corpus et édition
SPAWT inchangés ; aucune tâche/version de forge en production avant et après.
Stress isolé sans credentials : pages/tRPC non atteints, forges différées,
machine d’états bornée ; aucun stress E2E entier reçu.
L’ancienne dette COMPLETED avant coffre est retirée.
Octets/CDN, réponses vides Canva/Figma, facture fournisseur, filiation business
upstream et journal terminal durable restent ouverts avec plans et déclencheurs.
Les constats statiques de concordance de tâche historique en régénération et de
descriptif MCP trop large rejoignent ces plans existants. Déclencheur upstream
atteint après livraison 425 ; aucun test E2E de ces défauts n’est présumé.
Voir [la réception courante](RECEPTION-PTAH-ADMISSION.md) et RESIDUAL-DEBT ; aucune
forge réelle SPAWT/Noël ni clôture des sept chantiers n’en est déduite.

## Édition publique distincte du brouillon — 2026-10-08

ADR-0209 étend BrandAsset BRAND_GUIDELINES/public-brand-v1, Connexions,
strategy.update et l’export existants. La copie explicitement choisie est bornée,
versionnée, liée aux sources/piliers relus et servie sans dossier privé. Les
changements privés ne la réécrivent plus ; revenir à une ancienne copie crée une
nouvelle édition. Aucun nouveau service, modèle, page, agent ou Glory tool.

Production 423 reçue : source 5abee4ff, CI 37843378476 verte (4 144 unitaires,
195 PostgreSQL), image 37843924558 bootée, 101 migrations/login 200/PDF deux pages.
Déploiement terminé à 21:10:56 UTC, runtime exact rapproché. Le défaut de
dépendances externes du bundle est fermé par les copies complètes postgres-array
3.0.4 et zod ; les gardes et la capture ne sont pas contournés. Erratum : zéro
page historique admissible ; deux anciens slugs non LFA- étaient déjà refusés
en 422. Aucun renommage, publication automatique ou reçu historique inventé.

SPAWT canonique : v1 LFA-spawt choisie dans Connexions réelle, acteur/émission
chaînée reçus ; copie publique existante conservée à l’identique. Principal et
portail consomment la même édition/digest, titre et promesse concordants ; WWW
redirige au principal. CORS exact/ETag/export privé/page publique reçus ; hors
origines, la ressource publique répond 200 sans en-tête CORS. Six questions,
aucun compteur expiré, aucune exception, réponse 500 ou chargement échoué observé.
Corpus privé et actifs ordinaires conservés,
un seul nouvel actif pour l’édition ; zéro IA. Les fonts sont reçues sans substitution.

La réception porte les textes/liens v1 ; tokens, voix, variantes, version du
quiz/application et retour des résultats, brouillon interrompu, autres écrivains,
réception fournisseur Ptah et journal durable restent ouverts. Sept chantiers EN_COURS/accepted=false,
116 examens bornés et 80 donneurs ouverts au registre programme ; aucun parcours
large accepté. Les preuves détaillées et leurs limites figurent dans ADR-0209.

## Décisions d’actifs factorisées — 2026-10-08

ADR-0208 étend le moteur BrandVault existant : les quatre commandes déjà
cataloguées et les wrappers manuels utilisent une frontière transactionnelle
commune, avec accès courant, source relue, état valide et scope de filiation.
Remplacement/version/slot sont atomiques ; les retries préservent la décision
existante et les émissions locales non chaînées sont retirées. Aucun nouveau
modèle, service, page, agent ou Glory tool. Les preuves PostgreSQL, la recette
native et le runtime restent des réceptions distinctes. Création, expiration,
classifieur, réception fournisseur/média Ptah et fermeture durable du
spine restent au registre de dette.
Un ACTIVE générique n’est ni une validation humaine ni une publication : ADR-0209
ajoute le choix explicite de l’édition publique ; sa consommation SPAWT et la
réception des surfaces restent distinctes du cycle d’actif.

## Identité et revue de fondation — 2026-10-08

ADR-0205 factorise l'identité produit dans le gateway existant après arbitrage,
et la lecture des valeurs confirmables dans le domaine. L'édition profonde
conserve le précédent état ; confirmation et marqueurs legacy sont atomiques,
conditionnés à la version effectivement relue. Courses et refus sont reçus sur
PostgreSQL isolé ; la revue du corpus SPAWT et le cycle Shinkiro restent distincts.
Le lien historique par nom est réancré au même changement de catalogue, par
correspondance exacte unique. Renommer conserve la destination, jamais par index.

## Demande et mission reçues séparément — 2026-10-07

ADR-0201 étend les demandes Signal et les missions existantes : décision opérateur
versionnée, préparation atomique, rejet motivé, droit de traitement projeté et reçu
commun console/cockpit. Conversion n'est pas livraison. Aucun deuxième suivi,
agent, table ou Intent ; données historiques et modèle InterventionRequest dormant
à qualifier avant convergence. Les preuves serveur et réception native restent
distinctes ; la réception complète du cycle de mission reste au chantier C6.

En 404, demande/conversion/conflit/relecture/retrait et liens exacts sont reçus
nativement sur BLISS sans IA. Cette recette découvre la liste console admin vide.
Le lot 405 rétablit sa portée existante et ses colonnes métier, montre le besoin
dans les deux détails et retire les taux/comparaisons temporels sans preuve.
Quatre scénarios PostgreSQL vérifient visibilité et isolation ; la réception
native du lot 405 est reçue ; le cycle C6 complet reste ouvert. Le retour
flottant recouvre une action de dernière ligne : espace commun corrigé en 406,
réception souris après livraison et responsive restant à éprouver.

## Observation et décision séparées — 2026-10-07

ADR-0199 retire le diagnostic LLM implicite et la file de prescriptions parallèle.
Les observations restent dans Signal/KnowledgeEntry ; la demande explicite utilise
Notoria et ses propositions PENDING existantes. La Gazette et le contrôle de
référence filtrent les marques avant pagination. Les inconnues et les échecs sont
visibles, avec nouvel essai. PostgreSQL neuf et réception native locale reçus ;
qualité provider, réentrance et cycle complet restent des réceptions distinctes.

## Autorité documentaire par marque — 2026-10-07

ADR-0198 étend les sources, usages et dérivés existants : une pièce canonique,
des classements locaux et la version réellement consommée. Correction/révocation
retirent les anciens index et signalent les décisions à revoir ; une proposition
périmée est refusée dans la transaction d'écriture. Le lot Notoria multi-piliers
et ses versions sont atomiques. PostgreSQL et parcours natifs synthétiques reçus.
Ce lot ne clôt ni les échanges avec La Barre, ni tous les dérivés transitifs,
ni la qualification du corpus ; ils restent au contrat de release Shinkiro.

## Raccordement opérationnel du portefeuille — 2026-10-02

ADR-0193 étend les BrandNode et les pages portfolio existants : identités externes,
lecture vivante des dossiers et raccordements manuels. Il ne crée ni agent ni
modèle concurrent et ne clôt pas les noyaux ADVE, la parité de tous les parcours
ou la release transversale Shinkiro. Réception : tests de conservation et de
relance, interface avec données réelles en recette, puis reçu d’import en production.

## Context

La Fusée est un **Industry OS** (codé comme tel) bâti sur la méthode ADVE/RTIS, dont la vision est de transformer les marques en culte/phénomène culturel via l'accumulation de superfans qui font bouger la fenêtre d'Overton. Il sert 4 portails (Console/UPgraders, Agency, Creator/Freelance, Cockpit/brands) et un produit phare : l'**Oracle** (livrable conseil dynamique modulaire).

**Le problème ressenti par l'utilisateur** : « mon OS n'est pas assez modulaire et robuste — les inputs, outputs, frameworks, règles de validation, c'est difficile d'ajouter une nouvelle fonction sans casser quoi que ce soit » + « même l'UI ça se voit que c'est en chantier ».

**Ce que l'audit a révélé (V5.4 inclus — generic ranker + 4 consumers ajoutés)** :

| Couche | État réel | Symptômes |
|---|---|---|
| **Backend governance** | Architecture défensive *posée et déjà partiellement opérationnelle* : `emitIntent()` existe (`mestor/intents.ts:179`), persiste dans table `IntentEmission`, supporte spawned intents. **6 services backend l'utilisent correctement** (`boot-sequence`, `tarsis`, `feedback-loop`, `enrich-oracle`, `quick-intake`). 13 Intent kinds définis. **Mais 0 router tRPC ne l'appelle directement** — tous les routers contournent. | Bypass concentré sur la couche router : `pillar.ts` (8 lazy imports services), `strategy.ts`, `notoria.ts`, `pr.ts`, `ingestion.ts`, et désormais `jehuty.ts` (338L) + `seshat-search.ts` (145L) ajoutés en V5.4. 6+ sites hardcodent `["A","D","V","E","R","T","I","S"]`. `scoreObject()` appelé depuis 16 endroits. Lazy imports utilisés volontairement pour casser circular deps. ~5 unit tests + 0 CI. |
| **Ranker V5.3/V5.4** | Service générique propre (`seshat/context-store/ranker.ts`, 220L). Les 4 consumers ajoutés (Jehuty cross-brand, console search UI, brand comparables, hyperviseur peer insights) **fonctionnent** mais sont câblés **sans Intent abstraction** | Manque 4 Intent kinds : `RANK_PEERS`, `SEARCH_BRAND_CONTEXT`, `JEHUTY_FEED_REFRESH`, `JEHUTY_CURATE`. Le `strategy.comparables` endpoint, `seshat-search.*` et la curation Jehuty contournent Mestor. |
| **Oracle** | Solide. 21 sections / 5 phases, mappers indépendants, pipeline Seshat→Mestor→Artemis explicite (`enrich-oracle.ts:788`, qui utilise déjà `emitIntent` line 470), refactor V5.2 propre (hybrid RAG, multi-provider embed) | Quelques dettes `legacy_plan` (line 254), pas d'export PDF natif, pas de schema versioning des sections |
| **UI** | Stack moderne stable (Next 15 + React 19 + Tailwind 4 + tRPC 11), design system OKLCH + 35 shared components, 4 portails fonctionnels + nouveaux : Console seshat search, Cockpit insights/benchmarks, brand-comparables-panel | 1 TODO OAuth (`/config/integrations`), 1 placeholder (`/oracle/proposition`), doublons `* 2/` (`landing 2`, `notoria 2`, `financial-brain 2`, `advertis-connectors 2`, `advertis-inbound 2`) |

**Outcome cible** : un OS où **ajouter une fonction = 1 manifest + 1 implémentation + 1 test** (vs ~6 fichiers éparpillés aujourd'hui), où **toute action métier traverse la gouvernance Neteru de bout en bout**, où **0 bypass est possible** (lint + types + runtime), où **les contrats sont versionnés**, où **CI bloque toute régression**.

---

## Ce que ce plan refuse de reporter

Liste explicite des problèmes "vrais" qu'un plan prudent aurait poussés en backlog. Chacun est intégré aux Phases concernées.

1. **Le "wild plant pattern" du dev lui-même** — les commits V5.3/V5.4 ont été ajoutés *pendant l'audit*. Si rien ne change côté discipline, le refactor est mort-né. **Phase 0 instaure un Refactor Code of Conduct** : feature freeze partiel, chaque PR labelée d'une Phase, gates de governance non-négociables, opt-out exceptionnel via approbation explicite (pas par défaut).

2. **Les 91 GLORY Tools sont une zone grise** — jamais auditées dans le plan initial. Cost tracking inexistant, pas de tiers qualité, pas de manifests, pas de A/B variant. C'est l'iceberg caché de la complexité. **Phase 2 inclut un volet Glory Tools Governance** — tous reçoivent un manifest, une tier qualité (S/A/B/C), un cost estimate, et entrent dans le ranker de Mestor.

3. **Les 9 stub routers v3 "Windows machine"** (cf. mémoire projet) — jamais identifiés explicitement dans l'audit, jamais résolus. **Phase 1 les chasse activement** (`grep -rn "TODO.*Windows\|stub\|not implemented"`) et les absorbe ou les supprime. Pas de zone d'ombre tolérée.

4. **L'audit log doit être immuable** — actuellement `IntentEmission` est une table standard, donc altérable. Pour un OS qui sert d'agences clientes payantes + flux financiers (Thot), c'est une dette de conformité. **Phase 3 ajoute un hash-chain** (chaque event chaîne le hash du précédent) + suffisamment de discipline pour rendre le tampering détectable.

5. **L'isolation multi-tenant n'est pas durcie** — `operatorFilter()` middleware existe mais une procedure qui oublie de l'appliquer = fuite cross-tenant. **Phase 3 ajoute un type-level enforcement** : tout `db.<table>.findMany` qui ne passe pas par un wrapper `tenantScopedDb(operatorId)` échoue à la compilation. Default deny.

6. **Le multi-LLM routing est dumb** — LLM Gateway choisit par fallback (Anthropic → OpenAI → Ollama) sans considérer l'Intent kind. Un `EXPORT_ORACLE` n'a pas la même contrainte qu'un `RANK_PEERS`. **Phase 5 (couplé NSP) introduit une routing matrix** — chaque manifest capability déclare `qualityTier`, `latencyBudgetMs`, `costCeilingUsd`. LLM Gateway route en fonction.

7. **L'Oracle est une photo, pas un film** — V5.4 enrichit les sections, mais pas de time-travel. **Phase 7 ajoute Oracle History** : chaque assemblage (`ASSEMBLE_ORACLE`, ADR-0071 — legacy déposé ADR-0125) produit un snapshot versionné, l'utilisateur peut voir l'Oracle "au 15 mars" et diff vs aujourd'hui. Repose sur `IntentEmissionEvent` (P5) + `OracleSnapshot` table.

8. **Pas de collaboration temps réel** — deux opérateurs sur la même strategy = race condition. **Phase 5 (NSP) introduit Yjs ou TipTap collab** sur les champs textuels Oracle + sur le Mestor chat. Conflict-free CRDT.

9. **Pas de performance budgets / SLO** — actuellement aucun seuil ne déclenche d'alerte. **Phase 6 introduit un SLO par Intent kind** (p95 latency, error rate, cost p95) + alerting via le job `governance-drift.yml`.

10. **Le marché est mobile-first et low-bandwidth** — l'OS rend correctement sur desktop mais pas optimisé pour le smartphone moyen Douala/Lagos/Dakar. **Phase 7 audit lighthouse mobile** (cible perf score ≥85) + mode "économie de données" (lazy embeds, images optimisées, NSP fallback long-poll si connexion instable).

11. **Pas de plugin architecture** — un "vrai OS" laisse des tiers étendre. **Phase 2 ouvre la porte** : `NeteruManifest` est public, `scaffold:capability` est exécutable depuis un repo externe (mode `--external-plugin`), et un plugin déclare ses dépendances vers les manifests core. Pas d'app store full pour cette tranche, mais l'API contractuelle est là.

12. **Le quick-intake (rev 9) est pas relié à la cascade** — il produit un PDF mais le fil avec ADVE→RTIS reste manuel côté operator. **Phase 3 instaure un Intent `LIFT_INTAKE_TO_STRATEGY`** qui automatise le passage intake → strategy → première cascade. Zéro clic operator.

13. **`scoreObject` est appelé 16× dont certains avec des seeds différents** — non-déterminisme silencieux. **Phase 4 force un seed canonique** par Intent kind (dérivé de `intentId`) pour que le replay produise des scores reproductibles.

14. **Les imports dynamiques `await import()` sont une dette structurelle** — utilisés pour casser des cycles, mais cassent le tree-shaking et masquent le DAG d'imports. **Phase 4 vise leur élimination totale** (0 lazy import sauf code-splitting Next.js justifié par bundle size, whitelist explicite). C'est plus dur que "réduire" — on s'engage sur 0.

15. **Pas de SDK public / API stable** — un OS qui veut servir des agences partenaires doit exposer une API contractuelle. **Phase 8 documente l'API tRPC en OpenAPI-ish** (via `trpc-openapi`) et publie un client TypeScript versionné comme package `@lafusee/sdk`.

Chacun de ces points est repris explicitement dans la Phase concernée.

---

Le repo a déjà ~75% des briques (`emitIntent` existe et fonctionne dans `mestor/intents.ts:179`, table `IntentEmission` persiste l'audit trail, 6 services backend respectent le pattern, governance registry présent dans `neteru-shared/governance-registry.ts`). La refonte est un travail de **finition et durcissement structurel**, pas de réécriture. Le travail principal = **migrer les ~70 routers tRPC pour qu'ils appellent `emitIntent` au lieu d'imports services directs**, + couvrir les nouvelles fonctions ranker V5.3/V5.4 par des Intent kinds. Estimation 8–9 semaines (1 dev senior plein temps) ou 5–6 semaines (2 devs en parallèle sur P0+P1 et P3+P6).

---

## Architecture cible — Neteru-native, pas générique

L'OS a une identité forte (ADVERTIS, Neteru, Oracle, GLORY tools, Tarsis signals). Le framework qu'on construit autour doit **épouser cette identité**, pas l'aplatir derrière des abstractions techniques génériques. Concrètement :

- Pas de "ServiceA → ServiceB" anonymes — on parle Mestor, Artemis, Seshat, Thot. Le code, les types, les composants UI portent ces noms.
- Pas de `useMutation` brutes côté client pour les opérations LLM — on a `useNeteru.mestor.intent(...)`, `useNeteru.artemis.tool(...)`, `useSeshat.signal(...)`.
- Les composants UI partagés sont préfixés `Mestor*`, `Artemis*`, `Seshat*` quand ils représentent l'activité d'un Neteru.
- Le streaming temps réel s'appelle **NSP — Neteru Streaming Protocol**, pas "tRPC subscriptions".
- Le lifecycle d'un intent (`PROPOSED → DELIBERATED → DISPATCHED → EXECUTING → OBSERVED → COMPLETED`) reflète la chaîne Mestor→Artemis→Seshat, pas un état générique.

**Layering** :
```
Layer 0 — src/domain/                  pure (PILLAR_KEYS, lifecycle, Intent types, Zod)
Layer 1 — src/lib/                     utilities, db, auth helpers
Layer 2 — src/server/governance/       manifests, registry, event-bus, mestor (entry point), NSP server
Layer 3 — src/server/services/         business services, governés (Artemis tools, Seshat ranker, Thot capacity, etc.)
Layer 4 — src/server/trpc/             routers, protégés par governedProcedure
Layer 5 — src/components/neteru/       Neteru UI Kit (MestorPlan, ArtemisExecutor, SeshatTimeline, etc.)
Layer 6 — src/app/, autres composants  pages
```

**Règle absolue** : Layer N ne peut importer que de Layer ≤ N (sauf `import type` cross-layer). Enforced par `eslint-plugin-boundaries` + `madge --circular`.

**Modèle de communication Neteru** :
- **Client → Mestor** : tRPC mutation `mestor.emitIntent` qui retourne immédiatement `{ intentId }` + ouvre une subscription NSP.
- **Mestor → Artemis** : sync, mais émet des `IntentProgressEvent` toutes les ~500ms ou à chaque étape clé.
- **Artemis → Seshat** : async fire-and-forget via `EventBus` interne. Seshat échoue silencieusement, jamais bloquant.
- **Tarsis (Seshat → Mestor)** : async via table `IntentQueue` + cron (PostgreSQL, pas de nouvelle infra).
- **Mestor → Client** : NSP stream (SSE) qui pousse `IntentProgressEvent` vers le frontend. Le client réconcilie l'état UI en temps réel.

---

## Phases

### Phase 0 — Fondations, filets, et Refactor Code of Conduct (S1, ~5j)

Installer le harnais avant de toucher au code métier — **et le contrat humain qui empêche le wild-plant pattern de continuer**.

**Refactor Code of Conduct (non-négociable)** :
- `docs/governance/REFACTOR-CODE-OF-CONDUCT.md` engage formellement :
  1. Toute PR pendant la refonte est labelée `phase/0`, `phase/1`, ... `phase/8` ou `out-of-scope`.
  2. `out-of-scope` exige une justification écrite dans la PR et l'accord explicite du tech lead. Le compteur d'`out-of-scope` est tracké dans `docs/governance/scope-drift.md` (1 ligne par PR).
  3. Aucune nouvelle feature qui ajoute du bypass governance n'est mergeable. Si elle est urgente : elle traverse `mestor.emitIntent` (même rudimentaire) **dans la même PR**.
  4. Pas de nouveaux dossiers `* 2/` en aucun cas (lint rule `no-numbered-duplicates` active dès P0).
  5. Le freeze partiel des features dure jusqu'à fin Phase 5. Les fixes urgents sont autorisés mais doivent respecter la governance.
- Pre-commit hook `husky` valide la présence du label.

**Livrables** :
- `.github/workflows/ci.yml` — jobs `typecheck`, `lint`, `unit`, `e2e-smoke`, `dep-cycle` (`madge --circular`), `governance-audit`, `prisma-validate`, `phase-label-check`. Required checks bloquent le merge.
- `eslint-plugin-lafusee/` (workspace local) avec 3 rules custom :
  1. `no-direct-service-from-router` — fichiers sous `src/server/trpc/routers/` ne peuvent importer `src/server/services/*` qu'avec whitelist (`mestor`, `pillar-gateway`, `audit-trail`, `operator-isolation`, `neteru-shared`).
  2. `no-cross-portal-import` — `(agency)`, `(creator)`, `(console)`, `(cockpit)`, `(intake)` étanches entre eux.
  3. `no-hardcoded-pillar-enum` — détecte les littéraux `["A","D","V","E","R","T","I","S"]` ou `z.enum([...])` similaires.
- `scripts/audit-governance.ts` — parse AST des routers, vérifie que mutations passent par Mestor.
- `docs/governance/archive/snapshots-2026/baseline-2026-04.md` — snapshot avant : nb cycles, nb violations lint, coverage. Reference pour mesurer l'amélioration.
- Husky + commitlint (Conventional Commits).

**Critères de succès** : CI verte sur main actuel, rules custom listent les violations en `warn`, baseline committed.

---

### Phase 1 — Single Source of Truth domaine (S2, ~5j, parallélisable avec P0)

**Nouveau module `src/domain/`** (Layer 0, zéro dépendance Prisma/tRPC/NextAuth) :

- `src/domain/pillars.ts` :
  ```ts
  export const ADVE_KEYS = ["A","D","V","E"] as const;
  export const RTIS_KEYS = ["R","T","I","S"] as const;
  export const PILLAR_KEYS = [...ADVE_KEYS, ...RTIS_KEYS] as const;
  export type PillarKey = typeof PILLAR_KEYS[number];
  export const PillarKeySchema = z.enum(PILLAR_KEYS);
  export const PILLAR_METADATA: Record<PillarKey, {label, phase, order, storageKey}> = {...};
  ```
- `src/domain/lifecycle.ts` — `StrategyLifecyclePhase` + transitions valides (state machine `INTAKE→BOOT→OPERATING→GROWTH`).
- `src/domain/touchpoints.ts` — `Touchpoint`, `AarrrIntent`.
- `src/domain/index.ts` barrel + `README.md` (interdiction Prisma/tRPC ici).

**Migration des sites hardcodés** (6+ fichiers identifiés) :
- `src/server/trpc/routers/pillar.ts:45,46`
- `src/server/trpc/routers/notoria.ts`, `ingestion.ts`, `pr.ts`, `strategy.ts:64`
- `src/server/services/artemis/tools/sequence-executor.ts`
- `src/server/services/quick-intake/index.ts`
- `src/lib/types/pillar-schemas.ts` — devient ré-export depuis `domain`
- Remplacer les `if (key === "r") ... else if (key === "t")` chains par `Record<PillarKey, Handler>` indexé.

**Activer `no-hardcoded-pillar-enum` en `error`** à la fin de la phase.

**Chasse aux 9 stub routers v3 "Windows machine"** (cf. mémoire projet) :
- `grep -rn "TODO.*Windows\|TODO.*stub\|not implemented\|not yet implemented\|@stub\|@todo-windows" src/server/trpc/routers/` + audit visuel des routers anémiques (≤30 lignes avec un seul endpoint vide).
- Pour chaque stub trouvé : décision binaire par PR — soit on absorbe le code manquant (importé depuis l'historique git/branches/notes utilisateur), soit on supprime le router et son entrée dans `src/server/trpc/router.ts`.
- Aucun stub ne survit à cette phase. Liste finale documentée dans `docs/governance/scope-drift.md`.

**Tests** : `src/domain/__tests__/pillars.test.ts` — ordre cascade, isAdve, validation Zod accept/reject, roundtrip uppercase↔storageKey.

**Critères de succès** : `grep -rn '"A".*"D".*"V".*"E"' src/ | wc -l` → 0 hors `domain/`. TS compile sans `as any` sur piliers.

---

### Phase 2 — Manifests & Registry de gouvernance (S3, ~5j)

Chaque service Neteru déclare *en un seul endroit* qui il est, ce qu'il accepte, ce qu'il produit.

**Format Manifest** (`src/server/governance/manifest.ts`) :
```ts
export interface NeteruManifest {
  service: string;
  governor: "MESTOR"|"ARTEMIS"|"SESHAT"|"THOT"|"INFRASTRUCTURE";
  version: `${number}.${number}.${number}`;
  acceptsIntents: ReadonlyArray<Intent["kind"]>;
  emits?: ReadonlyArray<Intent["kind"]>;
  capabilities: ReadonlyArray<{
    name: string;
    inputSchema: z.ZodSchema;
    outputSchema: z.ZodSchema;
    sideEffects: ReadonlyArray<"DB_WRITE"|"LLM_CALL"|"EXTERNAL_API"|"EVENT_EMIT">;
    costEstimateUsd?: number;
  }>;
  dependencies: ReadonlyArray<string>;
}
```

**Un `manifest.ts` par service** (~110 fichiers sous `src/server/services/`). Co-localisé avec l'implémentation.

**Registry codegen** :
- `scripts/gen-manifest-registry.ts` glob `src/server/services/*/manifest.ts` → écrit `src/server/governance/registry.generated.ts` (committed). Lancé en pre-build et CI.
- Choix codegen vs dynamic import : statique = bundling Next-friendly + tree-shakeable + traçable.

**Audit étendu** (`auditGovernance()` existant `governance-registry.ts:66`) :
- Service FS sans manifest = CI fail.
- Intent kind sans handler ou avec >1 handler = CI fail.
- Cycles via `dependencies[]` détectés.

**Scaffold** : `npm run scaffold:capability -- --service=notoria --name=runDiagnostic` génère manifest entry + Zod schemas + stub + test placeholder + (si Intent) entry dans `intents.ts`. Documente dans `CONTRIBUTING.md` : "ajouter une fonction = scaffold + remplir 3 trous".

**Critères de succès Phase 2 (services)** : 100% des services ont un `manifest.ts`, audit script vert, capability ajoutée e2e via le scaffold prouve le flux.

#### 2.6 — Glory Tools Governance (l'iceberg caché de 91 outils)

Les ~91 GLORY tools utilisés par Artemis sont actuellement non-gouvernés : pas de manifest, pas de cost tracking individuel, pas de tier qualité, pas de A/B variants. C'est la zone d'ombre la plus volumineuse de l'OS.

- Inventaire automatique : `scripts/inventory-glory-tools.ts` parse l'AST de chaque tool (`src/server/services/artemis/tools/*`), extrait nom/inputs/outputs/LLM calls. Génère `docs/governance/glory-tools-inventory.md`.
- Chaque tool reçoit un `manifest.ts` co-localisé :
  ```ts
  export const manifest: GloryToolManifest = {
    tool: "concept-generator",
    governor: "ARTEMIS",
    qualityTier: "S",        // S | A | B | C — pilote le LLM model par défaut
    costTier: "PREMIUM",     // PREMIUM | STANDARD | LITE — caps tokens et model
    inputSchema: ..., outputSchema: ...,
    expectedLatencyMs: 3500,
    deterministicSeed: true,
    variants: ["v1", "v2-experimental"],   // A/B optionnel
    dependencies: [],         // tools en amont (skill tree)
    pillarsAffected: ["A","D","I"],
  };
  ```
- LLM Gateway consomme `qualityTier` + `costTier` pour le routing model.
- A/B framework : Artemis route entre `variants` selon une politique (90/10 par défaut), mesure delta de score Oracle aval.
- Topo-tri des dépendances avant exécution (brandbook avant KV affichage, etc.).
- Coût par tool exposé en `/console/governance/glory-cost`.

**Critères de succès Phase 2 (Glory)** : 91/91 tools avec manifest, ≥1 tool en A/B variant en prod fin de phase, cost tracking par tool fonctionnel.

#### 2.7 — Plugin architecture (extensibilité tierce)

Pour passer de "OS modulaire" à "OS extensible par des partenaires UPgraders ne touchant pas le repo core" :
- `NeteruManifest` est exposé comme contrat public (versionné via le champ `version`).
- `npm run scaffold:capability --external-plugin --target=./plugins/my-tool` génère un dossier autonome avec `package.json` qui dépend de `@lafusee/sdk` (cf. P8).
- Au boot, La Fusée scanne `plugins/*/manifest.ts` (en plus du core), valide signatures + dépendances, registre dynamique merge avec le core.
- Sandboxing : un plugin déclare ses `sideEffects` requis ; ceux non déclarés sont bloqués au runtime (proxy autour du `db` exposé).
- Pas d'app store cette tranche, mais le **contrat** est posé. Premier plugin de démo : `@upgraders/loyalty-extension` qui ajoute un Intent `COMPUTE_LOYALTY_SCORE`.

---

### Phase 3 — Bus d'événements & Intent dispatcher v2 (S4–S5, ~10j) — **CRITIQUE**

Le cœur. Phase à plus haut risque ; à exécuter qu'après P0–P2 stables.

**Nouveau `src/server/governance/event-bus.ts`** :
- `EventBus` typé (discriminated union), scope process Node.
- `subscribe()`, `publish()`, `subscribeOnce()`.
- Listeners Seshat enregistrés au boot via `src/server/governance/bootstrap.ts`.

**Refonte `src/server/services/mestor/index.ts`** :
- `emitIntent(intent: Intent, ctx: GovernanceContext): Promise<IntentResult>` devient l'**unique** point d'entrée pour les routers.
- Persiste intent + résultat dans `IntentLog` (audit trail SQL).
- Émet `BusEvent<"intent.completed">` consommé async par Seshat.

**Schéma Prisma — étendre l'existant `IntentEmission`** (NE PAS recréer une table) :

La table `IntentEmission` existe déjà (référencée dans `mestor/intents.ts:203`). Phase 3 l'enrichit avec les colonnes manquantes via migration versionnée :

```prisma
model IntentEmission {
  // existing fields preserved
  // NEW columns added in migration:
  version        Int      @default(1)
  spawnedFrom    String?
  governor       String   // "MESTOR" | "ARTEMIS" | "SESHAT" | "THOT" | "INFRASTRUCTURE"
  costUsd        Decimal? @db.Decimal(12,4)
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  status         String   // OK|VETOED|DOWNGRADED|FAILED|QUEUED
  @@index([strategyId, createdAt])
  @@index([kind, status])
}
model IntentQueue { /* pending intents async, picked by cron */ }
```

Migration nommée `add_governance_audit_columns` via `prisma migrate dev`. Rétrocompatible (colonnes optionnelles + defaults).

**Audit log immuable (hash-chain)** :
- Chaque `IntentEmission` row gagne un champ `prevHash: String?` + `selfHash: String`.
- À l'insertion : `selfHash = sha256(JSON.stringify({...rowSansHash, prevHash}))`.
- `prevHash` pointe vers le `selfHash` du dernier row du même `strategyId` (ou global si null strategyId).
- Job CI hebdomadaire `governance-drift.yml` vérifie l'intégrité de la chaîne pour les 1000 derniers rows. Toute rupture = alerte critique.
- Pas de backward modification possible — seul l'append est permis. Les "corrections" se font via un nouvel intent `CORRECT_INTENT` qui référence l'original.

**Tenant isolation hardening (default deny)** :
- Tout `db.<table>.findMany|findFirst|update|delete|create` accédé directement depuis services/routers échoue à la compilation.
- Wrapper obligatoire `tenantScopedDb(operatorId).<table>...` qui injecte automatiquement `where: { operatorId }` (ou check ADMIN bypass explicite).
- ESLint custom rule `no-direct-db-access` (en plus des 3 existantes) en `error`.
- Tables qui n'ont pas de `operatorId` (rares — globales comme `Sector`, `LlmModel`) sont déclarées dans une whitelist explicite.
- Test e2e `tests/e2e/tenant-isolation.spec.ts` — un user opérateur A tente de lire/modifier un row de l'opérateur B, asserte 0 fuite.

**Quick-intake → Strategy automatisé** :
- Nouvel Intent `LIFT_INTAKE_TO_STRATEGY` (gouverné Mestor → Artemis).
- Quand un quick-intake (rev 9) atteint le seuil de complétude, Mestor décide automatiquement de spawner cet intent (via spawn pattern existant `intents.ts:241`).
- Le résultat : Strategy créée + first cascade ADVE→RTIS lancée + Oracle pré-rempli sur 8 sections initiales. Zéro clic operator.

**Versioning Intents** : `FILL_ADVE@v1`, `FILL_ADVE@v2`. `src/server/governance/intent-versions.ts` map `{[kind]: { v1: handler, v2: handler }}`. Default v1 si absent. Migration v1→v2 = ajouter v2 + flip défaut + déprécier v1 sur 2 sprints.

**Nouveaux Intent kinds à ajouter pour gouverner V5.3/V5.4 (ranker consumers)** :
- `RANK_PEERS` — utilisé par `strategy.comparables` (lecture peers d'une strategy).
- `SEARCH_BRAND_CONTEXT` — utilisé par `seshat-search.searchAcrossStrategies/findPeers/searchWithinStrategy`.
- `JEHUTY_FEED_REFRESH` — agrégation feed (signals + recos + diagnostics).
- `JEHUTY_CURATE` — actions pin/dismiss + trigger Notoria batch.
- `HYPERVISEUR_PEER_INSIGHTS` — peer insights utilisés par hyperviseur.

Ces 5 nouveaux kinds couvrent les 4 consumers ranker câblés en V5.4 + le peer insights backend. Ajout au type union `Intent` dans `mestor/intents.ts`, handlers dans `artemis/commandant.ts`. Les 4 routers concernés (`strategy.ts`, `seshat-search.ts`, `jehuty.ts`, `hyperviseur.ts`) refactorés pour appeler `emitIntent` au lieu d'imports services directs.

**Forcer le passage par `emitIntent()` (3 mécanismes empilés)** :
1. ESLint `no-direct-service-from-router` en `error`.
2. Type-level : `governedProcedure` wrapper dans tRPC qui n'expose que `ctx.mestor.emitIntent`.
3. Runtime guard (dev/test only) : middleware tRPC inspecte le call stack, warn si une mutation a touché DB sans IntentLog.

**Migration des routers contrevenants** (ordre prioritaire) :
1. `src/server/trpc/routers/pillar.ts` (le pire, 814 lignes, scoreObject + 8 lazy imports vers services).
2. `src/server/trpc/routers/strategy.ts` (`mestor.buildPlan()` direct line 62 + nouveau `comparables` à gouverner via `RANK_PEERS`).
3. `src/server/trpc/routers/jehuty.ts` (338L, ajouté V5.4 — plusieurs `db.*` directs + `notoria/engine.generateBatch` lazy import → migrer vers `JEHUTY_FEED_REFRESH`, `JEHUTY_CURATE`).
4. `src/server/trpc/routers/seshat-search.ts` (145L, ajouté V5.4 — lazy import du ranker → migrer vers `SEARCH_BRAND_CONTEXT`).
5. `notoria.ts`, `ingestion.ts`, `pr.ts`.
6. Sweep des ~50 autres routers, dirigé par `audit-governance` qui produit la todolist.

Pour chaque router migré : créer `tests/governance/<router>.governance.test.ts` qui appelle chaque procedure et vérifie qu'au moins un `IntentLog` row est créé.

**Critères de succès** :
- 100% des mutations tRPC passent par `mestor.emitIntent`.
- IntentLog se remplit en e2e.
- Test "tuer Seshat" → l'intent reste OK (loose coupling vérifié).
- ESLint `no-direct-service-from-router` en error sans exception.

**Stratégie rollout** (sans casse) :
- Trunk-based, PR ≤600 lignes, pas de feature branch long-lived.
- Feature flag `GOVERNANCE_STRICT_MODE` env var, default false en prod 2 semaines.
- **Dual-write** pendant migration : double appel (direct + via Mestor) avec comparaison output, ratio divergence loggé. Quand ratio < 0.1% sur 1 semaine → bascule.
- 5–10 routers migrés / semaine.

---

### Phase 4 — Wrapper scoreObject() + Layering strict (S6, ~5j)

**scoreObject centralisé** :
- `src/server/services/advertis-scorer/index.ts` reste seul export.
- 12/16 callsites transitent obligatoirement par `pillar-gateway.writePillarAndScore()` (scoring après écriture).
- 4 sites "pur scoring" passent par wrapper `assessPillarContent(content, key)` qui logge `IntentLog` (kind=`SCORE_PILLAR`).
- Tests `tests/unit/advertis-scorer.invariants.test.ts` : idempotence, monotonie, borne `[0,100]`, déterminisme (seed fixé).

**Layering enforcement** :
- `eslint-plugin-boundaries` config avec les 6 layers.
- `madge --circular --extensions ts src/` doit retourner 0 cycle.
- CI job `dep-cycle` fail sinon.

**Casser les circular deps connues** :
- `src/server/services/artemis/tools/sequence-executor.ts:11` — extraire l'interface dans `src/domain/sequence-types.ts`, sequence-executor consomme l'interface, implémentation injectée via DI au boot.
- `src/server/services/mestor/intents.ts` — déjà clean (type-only).
- `src/server/services/pillar-maturity/binding-validator.ts` — extraire `BindingContract` dans `src/domain/binding-contracts.ts`.

**Seed canonique pour scoreObject** : chaque Intent kind dérive un seed déterministe `hash(intentId + capability)` qui pilote le LLM temperature/sampling. Replay = scores reproductibles à ±0%.

**Engagement 0 lazy import** : la pratique courante `await import("@/server/services/...")` est éliminée *totalement* (pas réduite). Whitelist Next.js code-splitting explicite avec justification commentée par fichier. Les cycles cassés via DI au boot, pas via lazy.

**Critères de succès** : 0 lazy import non justifié (mesure stricte, pas tolérance), 0 cycle, coverage scoreObject ≥90% lignes, replay d'intent reproduit même score à 0% drift.

---

### Phase 5 — NSP : Neteru Streaming Protocol + Neteru UI Kit (S7–S8, ~10j) — **MAJEUR**

L'utilisateur ressent l'OS comme une "plante sauvage" : les opérations LLM bloquent l'UI sans feedback, l'attente est opaque, l'imprévisible domine. Cette phase pose la **dorsale de prévisibilité visuelle** : tout intent qui appelle un LLM diffuse son état en continu, le frontend rend cet état avec des composants dédiés.

C'est la phase qui transforme l'OS d'un outil "puissant mais nerveux" en un produit "puissant et serein".

#### 5.1 — IntentProgressEvent (lifecycle unifié)

`src/domain/intent-progress.ts` :
```ts
export type IntentPhase =
  | "PROPOSED"     // intent reçu, en attente de Mestor
  | "DELIBERATED"  // Mestor a décidé du plan
  | "DISPATCHED"   // Artemis a reçu le plan
  | "EXECUTING"    // Artemis exécute (peut publier sub-steps)
  | "OBSERVED"     // Seshat a indexé / mesuré
  | "COMPLETED"
  | "FAILED"
  | "VETOED"       // Thot ou Mestor a refusé
  | "DOWNGRADED";  // budget contraint, exécution réduite

export interface IntentProgressEvent {
  intentId: string;
  kind: Intent["kind"];
  phase: IntentPhase;
  step?: { name: string; index: number; total: number };  // ex: "framework 3/12"
  partial?: { sectionKey?: string; tokens?: string; sectionsCompleted?: string[] };
  estimatedSecondsRemaining?: number;
  costSoFarUsd?: number;
  message?: string;
  emittedAt: Date;
  governor: Brain;
}
```

#### 5.2 — NSP Server (transport)

Choix : **Server-Sent Events (SSE)** via tRPC v11 subscriptions, fallback long-poll.

- Endpoint `nsp.subscribe.useSubscription({ intentId })` côté client.
- Backend : `src/server/governance/nsp/server.ts` enregistre un `IntentEmitter` par intentId, branché sur `EventBus` interne. Ferme le canal quand phase ∈ {COMPLETED, FAILED, VETOED}.
- Persistence : chaque `IntentProgressEvent` écrit dans `IntentEmissionEvent` (nouvelle table Prisma — 1:N avec `IntentEmission`). Permet le replay si l'utilisateur recharge la page mid-flight.

```prisma
model IntentEmissionEvent {
  id          String   @id @default(cuid())
  intentId    String   // FK → IntentEmission.id
  phase       String
  stepName    String?
  stepIndex   Int?
  stepTotal   Int?
  partial     Json?
  costUsd     Decimal? @db.Decimal(12,4)
  emittedAt   DateTime @default(now())
  @@index([intentId, emittedAt])
}
```

#### 5.3 — Instrumentation des Neteru existants

- `mestor.emitIntent()` émet `PROPOSED` immédiat puis `DELIBERATED` après le LLM call de planification.
- `artemis.commandant.execute()` wrappe chaque sous-étape (chaque framework, chaque tool GLORY) et émet `EXECUTING` avec `step={name, index, total}`.
- LLM Gateway v4 (`src/server/services/llm-gateway/index.ts`) ajoute callback `onChunk` qui re-émet en `partial.tokens` pour les calls qui supportent le streaming (Anthropic, OpenAI, Ollama tous OK).
- `enrich-oracle.ts` émet `partial.sectionsCompleted` au fur et à mesure des 21 sections.
- `seshat/tarsis` émet `OBSERVED` quand un signal est traité.
- `thot/financial-brain` émet `VETOED` ou `DOWNGRADED` si capacity dépassée.

#### 5.4 — Neteru UI Kit (Layer 5 nouveau)

Nouveau répertoire `src/components/neteru/` :

| Composant | Rôle | Quand l'utiliser |
|---|---|---|
| `<MestorPlan>` | Affiche le plan que Mestor a délibéré (lifecycle, étapes prévues, intents enfants) | Avant exécution longue, donne la prévisibilité |
| `<ArtemisExecutor>` | Stepper vertical animé pour les frameworks/tools en cours, avec partial tokens | Pendant Oracle enrichment, quick-intake processing |
| `<SeshatTimeline>` | Timeline horizontale des signaux/observations Seshat | Pages d'insights, brand context |
| `<ThotBudgetMeter>` | Compteur live du coût + capacité restante | Persistant en topbar pendant intents coûteux |
| `<NeteruActivityRail>` | Rail latéral global qui montre quel Neteru est actif maintenant (pulse + label) | Persistent dans tous les portails |
| `<CascadeProgress>` | 8 nœuds A→D→V→E→R→T→I→S qui s'allument selon avancement | Pages cascade ADVE→RTIS |
| `<OracleProgressivePanel>` (a remplacé `<OracleEnrichmentTracker>`, ADR-0073/0125) | Grille 35 sections avec état (queued/in-progress/done/failed) + console live NSP | Page proposition pendant l'assemblage |
| `<PartialContentReveal>` | Stream tokens dans une section au fur et à mesure | Sections Oracle en cours de rédaction |
| `<IntentReplayButton>` | Bouton pour replay un intent depuis IntentEmissionEvent | Console admin, debug |
| `<CostMeter>` | Coût USD courant du flow utilisateur | Topbar Console, Cockpit |

Chaque composant consomme un hook unifié :
```ts
// src/lib/hooks/use-neteru.ts
const { progress, isStreaming, retry, cancel } = useNeteru.intent(intentId);
// progress: IntentProgressEvent (latest), or aggregated history if needed
```

Skeletons par défaut : tout query/mutation tRPC qui peut prendre >300ms a un skeleton standard `<NeteruSkeleton variant="card|list|oracle" />` — interdiction d'écrans blancs.

#### 5.5 — Pattern d'usage — chaque page LLM-driven respecte ce contrat

```tsx
// pseudo-code attendu pour toute page qui déclenche un intent long
const startEnrichment = useNeteru.mestor.intent("ENRICH_ORACLE");
const handleClick = () => {
  const { intentId } = await startEnrichment.mutate({ strategyId });
  // UI rend immédiatement <ArtemisExecutor intentId={intentId} />
  // L'utilisateur voit : "Mestor délibère...", puis "Artemis lance framework 3/12 — concept-generator", puis tokens streamés dans les sections, etc.
};
```

Remplacer **toutes** les pages qui actuellement font un fetch long sans feedback :
- `/console/strategy-operations/intake` (PDF parse + scoring)
- `/cockpit/brand/proposition` (livrable Oracle dynamique pour le founder)
- `/console/strategy-portfolio/clients/[id]` (assemblage Oracle — pilotage opérateur d'une fiche client)
- `/console/seshat/search` (ranker queries — court mais skeleton requis)
- `/cockpit/insights/benchmarks` (peer insights via ranker)
- `/console/mestor` (chat pattern — déjà streamé partiellement, à harmoniser)
- `/console/arene/matching` (matching long)
- Pages Glory tools (chaque sequence GLORY = un intent avec ses sub-steps)
- `/intake` (quick-intake rev 9, scoring + PDF)

#### 5.6 — Storybook + visual regression

- Mise en place Storybook pour le Neteru UI Kit. Chaque composant a 3 états minimum : idle, streaming, error.
- Tests Playwright visual regression sur 5 flows clés (Oracle enrichment, intake processing, mestor chat, cascade, ranker search).

**Critères de succès Phase 5** :
- Aucune page LLM-driven sans feedback visuel (audit manuel + grep `useMutation` qui touche un intent kind sans rendu de progress).
- `IntentEmissionEvent` se remplit pour chaque intent en e2e.
- Replay d'un intent terminé restaure l'état UI complet.
- Tuer une connexion SSE mid-flight → reconnect automatique sans perte d'état (resume from last `emittedAt`).
- Storybook publié pour les 10 composants Neteru UI Kit.
- Test Playwright `tests/e2e/oracle-enrichment-streaming.spec.ts` valide le rendu progressif des 21 sections.

#### 5.7 — Multi-LLM smart routing (LLM Gateway v5)

LLM Gateway v4 fait du fallback (Anthropic → OpenAI → Ollama). v5 fait du **routing intelligent par Intent kind + qualityTier** :

```ts
// src/server/services/llm-gateway/router.ts
export function routeModel(ctx: { kind: Intent["kind"]; qualityTier: "S"|"A"|"B"|"C"; latencyBudgetMs: number; costCeilingUsd: number }) {
  // S/PREMIUM → Claude Opus
  // A/STANDARD → Claude Sonnet
  // B/STANDARD → GPT-4o-mini ou Sonnet
  // C/LITE → Haiku ou Ollama
  // si latencyBudgetMs < 2000 → favoriser Haiku/Ollama
  // si costCeilingUsd dépassé → downgrade tier (Mestor émet DOWNGRADED event)
}
```

- `qualityTier` lu depuis le manifest de la capability appelée.
- Telemetry `llm-gateway-route-decisions.log` pour tuner.
- Thot peut overrider (downgrade) si le brand/operator dépasse son budget.

#### 5.8 — Real-time collaboration (CRDT)

Deux opérateurs sur la même Strategy = race condition aujourd'hui. Solution :
- Yjs CRDT pour les champs textuels longs : pillars content, Oracle sections, Mestor chat history.
- Provider y-websocket sur même endpoint que NSP (réutilise SSE/WS infra).
- Awareness : voir qui édite quoi en live (avatars, cursors).
- Persistance : état Yjs sérialisé périodiquement dans `StrategyDoc` table.
- Limité au texte cette tranche (pas Oracle structure complète) — extension possible plus tard.

#### 5.9 — Offline-first / faible connectivité (marché africain)

- Service worker (`next-pwa` minimal) cache l'app shell + dernier état Strategy chargé.
- Mutations queuées localement (IndexedDB) si offline ; rejouées au reconnect via NSP idempotency keys.
- NSP fallback long-poll automatique si WebSocket/SSE échouent (réseaux mobiles instables).
- "Mode économie de données" toggle en topbar : désactive embeds vidéos, lazy-load images, tronque streams partial à intervals.

**Risques** :
- SSE buffering en production (proxies CDN). Mitigation : flush header + heartbeat toutes les 15s.
- LLM providers non-streaming-friendly. Mitigation : pour les calls non-stream, émettre `PROPOSED → EXECUTING → COMPLETED` en 3 events sans `partial.tokens`.
- Régression UI si refactor mal séquencé. Mitigation : feature flag `NSP_ENABLED` par portail, rollout Console → Cockpit → Agency → Creator.
- Yjs conflicts complexes sur structure Oracle. Mitigation : limiter à champs texte cette tranche, extension structurelle reportée.
- Service worker masque les bugs. Mitigation : opt-in via env var en staging d'abord.

---

### Phase 6 — Filets E2E & gouvernance régression (S9, ~5j)

**Tests cascade ADVE→RTIS** :
- `tests/e2e/cascade-full.spec.ts` — crée strategy → fill ADVE → trigger RTIS, asserte IntentLog contient les 8+ intents dans l'ordre, vérifie pillars persistés.
- `tests/e2e/governance-bypass.spec.ts` — tente d'appeler un service en direct depuis un router test-only, asserte que ESLint+CI fail.

**Tests d'invariants gouvernance** (`tests/integration/governance-invariants.test.ts`) :
- Chaque mutation tRPC ≠ admin produit ≥1 IntentLog row.
- Aucun service hors whitelist n'est appelé sans Mestor (spy mocks).
- Seshat exception ne casse pas le pipeline.
- Thot veto downgrade un intent budgétairement excessif.

**Migration Prisma versionnée** : fin du `prisma db push`. Tous les schema changes via `prisma migrate dev` → `prisma/migrations/`. CI bloque si `schema.prisma` modifié sans nouvelle migration.

**Cron CI hebdomadaire** (`.github/workflows/governance-drift.yml`) : tourne dimanche, lance audit, ouvre issue automatique si drift (nouveau service sans manifest, etc.). Vérifie aussi l'intégrité du hash-chain `IntentEmission`.

**Performance budgets / SLOs par Intent kind** :
- `src/server/governance/slos.ts` déclare un SLO par Intent kind : `{ p95LatencyMs, errorRatePct, costP95Usd }`.
- Job `slo-check` agrège les rolling 7-day metrics depuis `IntentEmission` et fail si breach > 2 jours consécutifs.
- Dashboard `/console/governance/slos` rend la matrice en temps réel.
- Exemple : `EXPORT_ORACLE` SLO = p95 < 45s, error < 2%, cost p95 < $0.40.

**Chaos engineering léger** :
- `tests/chaos/` exécute en staging hebdo : kill Seshat, latence forcée 5s sur LLM Gateway, Thot reject 50% intents → asserte que les filets tiennent.
- Pas Netflix-level, mais assez pour découvrir les couplages cachés.

**Disaster recovery runbooks** :
- `docs/governance/RUNBOOKS.md` couvre : DB corrupted, hash-chain broken, LLM provider down, queue overflow, secret leaked.
- Test annuel restauration depuis backup PITR.

---

### Phase 7 — Périphérie produit : Oracle + UI + Landing/README upgrade (S10, ~6j)

Une fois la gouvernance stable, on règle les dettes UI/produit.

**Oracle exports natifs** :
- Service `value-report-generator` reçoit 2 capabilities supplémentaires :
  - `exportOracleAsPdf(strategyId, options)` via `puppeteer-core` côté serveur (rendu fidèle).
  - `exportOracleAsMarkdown(strategyId)` via templates.
- Nouvel Intent `EXPORT_ORACLE` (gouverné Mestor → Artemis tool).
- Schema versioning des 21 sections (`OracleSectionSchema.v1`, `v2`). Le report stocke `schemaVersion` dans le JSON sérialisé pour replay/migration future.

**Pages UI à finir** :
- `src/app/(intake)/oracle/proposition/page.tsx` — porter depuis `src/app/(cockpit)/cockpit/brand/proposition/page.tsx`. Factoriser en composant unique `ProposalView` dans `src/components/strategy-presentation/`, deux entrées (cockpit + intake) qui le consomment.
- `src/app/(console)/console/config/integrations/page.tsx:173` — implémenter OAuth réel (Google, Meta, LinkedIn) via NextAuth providers étendus + table `IntegrationConnection`. Tokens chiffrés AES-GCM via custom adapter.

**Suppression doublons forks oubliés** :
- `src/components/landing 2/` (confirmé existe)
- `src/server/mcp/notoria 2/`
- `src/server/services/financial-brain 2/`
- `src/server/services/advertis-connectors 2/`
- `src/server/mcp/advertis-inbound 2/`

Pour chaque : `grep -rn "<dossier>"` pour vérifier zéro import → `git rm -r`. CI lint rule `no-numbered-duplicates` ajoutée pour empêcher la régression.

**MFA admin** : NextAuth v5 supporte MFA via custom adapter. Activer TOTP pour `role=ADMIN` uniquement (table `MfaSecret`, librairie `otplib`). Forced challenge à chaque login admin, pas de "remember device".

**Landing page + README — upgrade ambitieux (pas resync)** :

L'état actuel sous-vend l'OS. Le README dit `v4.0.0-alpha` (réalité V5.4), ignore Thot, l'hybrid RAG, le ranker, Jehuty, Tarsis. La landing présente une version obsolète du panthéon NETERU (3 Neter) et 12 sections statiques qui n'expriment ni la modularité, ni la prévisibilité, ni la profondeur de l'Industry OS. Cette phase **réécrit le récit produit avec la profondeur acquise** — pas seulement un patch. Le panthéon canonique est désormais **7 Neteru actifs** (Mestor / Artemis / Seshat / Thot / Ptah / Imhotep / Anubis — cap APOGEE atteint Phase 14/15) — voir [PANTHEON.md](PANTHEON.md).

**Principe directeur** : la landing doit prouver l'OS, pas le décrire. Chaque promesse doit être adossée à une démo visuelle live (extraite du vrai produit en mode read-only public), pas à un slogan.

#### 7.1 — Refonte de la landing : structure cible

Nouvelles sections proposées (12 actuelles → 14, dont 4 ré-architecturées) :

1. **`Navbar`** — quasi-inchangée, ajouter lien vers `/changelog` (nouvelle page) et `/status` (uptime + dernière version Neteru).
2. **`Hero` (réécrit)** — promesse en une ligne : *"L'Industry OS du marché créatif africain. Un brief entre, une marque sort transformée."* Ajouter un **micro-démo vidéo** (15s loop) qui montre l'intake → Oracle apparaissant section par section (récupérée via NSP en mode replay public).
3. **`ProblemSection` (étoffée)** — 3 personas qui souffrent (DA débordé, founder isolé, freelance précaire) avec métriques chiffrées du marché.
4. **`HowItWorks` (réécrit avec NSP demo)** — narration en 5 étapes (Brief → Diagnostic → Stratégie → Production → Mesure). Chaque étape = un mini-composant qui anime le NSP en background : on voit Mestor délibérer, Artemis exécuter ses tools, Seshat indexer. **C'est la vitrine du Neteru UI Kit**.
5. **`NeteruShowcase` (réécrit — septet Mestor/Artemis/Seshat/Thot/Ptah/Imhotep/Anubis + Tarsis sub-component)** — 7 cartes interactives + disclosure pour Tarsis (sub-component Seshat) :
   - **Mestor** — décision (avec exemple d'IntentLog réel rendu)
   - **Artemis** — exécution + GLORY tools rédactionnels (briefs, avec sequence interactive 3 nœuds)
   - **Seshat** — observation (avec disclosure Tarsis = sub-component, graphe weak-signals)
   - **Thot** — gouvernance budgétaire + Operations (avec capacity meter)
   - **Ptah** — forge des assets matériels (avec gallery image/vidéo/audio générés ; Phase 9 ADR-0009)
   - Note historique : Imhotep + Anubis étaient pré-réservés au moment de Phase 7 (la PR landing). Ils sont **actifs depuis Phase 14/15** (ADR-0019/0020). Cap APOGEE 7/7 atteint — landing à actualiser pour refléter le panthéon plein.
6. **`OracleShowcase` (NOUVELLE)** — montre l'Oracle dynamique : un strategyId public sample, les 35 sections rendues (3 tiers, ADR-0014/0045), la possibilité d'expand chaque section, la mention "schema v2 — replay supported". Lien vers démo live.
7. **`CrossBrandIntelligence` (NOUVELLE — V5.3/V5.4)** — explique le ranker, Jehuty cross-brand insights, comparables. Avec démo : "Choisis un secteur → voir 3 marques peers anonymisées + leur score ADVERTIS".
8. **`ScoreShowcase` (mis à jour — 8 piliers V5)** — radar interactif ADVERTIS, vocabulaire aligné avec `domain/pillars.ts` (cf. P1). Tooltip pédagogique par pilier.
9. **`PortalsSection` (étoffée — 5 portails)** — Console, Agency, Creator, Cockpit + **Intake public** (route group `(intake)`). Pour chaque portail : 1 capture, 3 cas d'usage chiffrés, 1 témoignage si dispo.
10. **`SocialProof`** — étoffé : marques diagnostiquées (anonymisables), nombre de freelances, nombre d'agences. Si pas encore de chiffres, snapshot interne du repo (recompter au moment de l'implémentation sur les registres code — au 2026-07-11 : 56 GLORY tools CORE / 149 registre, 94 séquences).
11. **`PricingSection` (revue)** — alignée business model V5.4 : intake gratuit, paywall sur Oracle, retainer post-conversion. Comparatif transparent vs Havas/Publicis Africa.
12. **`Architecture` (NOUVELLE)** — section technique courte pour les CTO/founders : "OS modulaire, governance Neteru, NSP streaming, Intent dispatcher v2". Lien vers `/docs/governance/ARCHITECTURE.md`.
13. **`FaqSection`** — Q&A étendues : Thot, Oracle dynamique, ranker, NSP, gouvernance, sécurité, multi-tenant.
14. **`FinalCta` + `Footer`** — Footer avec sitemap, status page, changelog, GitHub si public.

Pages annexes nouvelles :
- `/changelog` — généré depuis `git log` filtré sur tags `feat(neteru):*` + curated.
- `/status` — uptime, version courante, dernier intent processed (depuis `IntentEmission`).
- `/docs/governance/*` — rendu MDX des docs gouvernance (aligné avec P8).

#### 7.2 — Ton & style éditorial

- Vocabulaire **aligné `domain/pillars.ts`** (cf. P1) — pas de glissement entre README, landing, code.
- Phrases courtes, métriques chiffrées partout (pas de "leader", "innovant", "world-class" sans chiffre derrière).
- Bilingue FR/EN dès cette phase (pas d'i18n mid-flight ensuite). Stack : `next-intl` minimaliste sur les sections marketing seulement.

#### 7.3 — Oracle exports natifs + Time Travel

- Service `value-report-generator` reçoit 2 capabilities supplémentaires :
  - `exportOracleAsPdf(strategyId, options)` via `puppeteer-core` côté serveur (rendu fidèle).
  - `exportOracleAsMarkdown(strategyId)` via templates.
- Nouvel Intent `EXPORT_ORACLE` (gouverné Mestor → Artemis tool, instrumenté NSP).
- Schema versioning des 21 sections (`OracleSectionSchema.v1`, `v2`).

**Oracle Time Travel** :
- Nouvelle table `OracleSnapshot { id, strategyId, takenAt, snapshotJson, schemaVersion, parentIntentId }`.
- Chaque `ASSEMBLE_ORACLE` produit un snapshot atomique en fin d'intent (shippé ADR-0016 pour les exports ; legacy déposé ADR-0125).
- UI `/cockpit/brand/[id]/oracle/history` : timeline de tous les snapshots, clic = preview, "compare avec courant" = diff visuel section par section.
- Replay : "exporter l'Oracle au 15 mars" génère le PDF/MD à partir du snapshot.
- Permet à un founder de voir l'évolution (LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE) avec dates et drivers.

#### 7.4 — Pages UI à finir

- `src/app/(intake)/oracle/proposition/page.tsx` — porter depuis `src/app/(cockpit)/cockpit/brand/proposition/page.tsx`. Factoriser en composant unique `ProposalView`.
- `src/app/(console)/console/config/integrations/page.tsx:173` — implémenter OAuth réel (Google, Meta, LinkedIn) via NextAuth providers étendus + table `IntegrationConnection`. Tokens chiffrés AES-GCM.

#### 7.5 — Suppression doublons

- `src/components/landing 2/`, `src/server/mcp/notoria 2/`, `src/server/services/financial-brain 2/`, `src/server/services/advertis-connectors 2/`, `src/server/mcp/advertis-inbound 2/`. Pour chaque : `grep -rn "<dossier>"` puis `git rm -r`. Lint rule `no-numbered-duplicates` ajoutée.

#### 7.6 — README upgrade

- Header version dynamique lue depuis `package.json` (script `scripts/sync-readme-version.ts` lancé en pre-commit).
- Panthéon Neteru (7 actifs : Mestor, Artemis, Seshat, Thot, Ptah, Imhotep, Anubis — cap APOGEE atteint depuis Phase 14/15 ; voir [PANTHEON.md](PANTHEON.md)).
- Nouveaux chapitres : **Intelligence cross-brand** (Jehuty + ranker), **NSP — Streaming temps réel**, **Modularité** (résumé du framework custom), **Gouvernance** (Intent dispatcher).
- Diagrammes Mermaid pour le flow d'un intent et le layering.
- Section "Pour les contributeurs" → renvoie à `CONTRIBUTING.md` et `docs/governance/ADDING-A-CAPABILITY.md`.

#### 7.7 — MFA admin

- NextAuth v5 + custom adapter, TOTP pour `role=ADMIN` (table `MfaSecret`, librairie `otplib`). Forced setup, pas de "remember device".

**Critères de succès Phase 7** :
- `grep -c "v4.0" README.md` → 0.
- `grep -c "Thot" README.md` ≥ 3.
- Landing rend 14 sections dont 4 nouvelles (`OracleShowcase`, `CrossBrandIntelligence`, `Architecture`, démos NSP intégrées dans `HowItWorks` + `NeteruShowcase`).
- Test e2e Playwright `tests/e2e/landing.spec.ts` valide que toutes les sections rendent + démos NSP animent en mode replay.
- 0 fichier `* 2/` dans le repo.
- README publié avec diagrammes Mermaid rendus correctement sur GitHub.
- `/changelog` et `/status` accessibles publiquement.

---

### Phase 8 — Hardening & docs (S10–S11, ~5j, parallélisable avec P7)

**Documentation** :
- `docs/governance/ARCHITECTURE.md` — diagramme Mestor↔Artemis↔Seshat↔Thot, flow d'un intent, layering.
- `docs/governance/ADDING-A-CAPABILITY.md` — tutoriel scaffold + manifest + test (avec exemple complet).
- `docs/governance/INTENT-CATALOG.md` — généré depuis manifests, liste tous les intents et versions.

**Observabilité** :
- `IntentLog` exposé dans Console admin (`/console/governance/intents`) — recherche, replay, diff payload v1/v2.
- Endpoint `/api/admin/metrics` — intents/min, success rate par kind, p95 latency, cost.

**Préflight renforcé** : `scripts/preflight.sh --full` étend dep-cycle + governance-audit + e2e cascade + manifest registry diff. Husky pre-push lance `--quick`.

**SDK public `@lafusee/sdk`** :
- Génération automatique depuis tRPC routers via `trpc-openapi` ou type-inference direct.
- Package npm versionné semver (alignement Phase 0 sur conventional commits).
- Documentation Mintlify auto-générée depuis manifests + JSDoc.
- Permet à des partenaires UPgraders de scripter contre l'OS sans toucher au repo (lien fort avec plugin architecture P2.7).
- Premier consumer : un script CLI `lafusee-cli` qui démontre intake → Oracle export end-to-end.

**Mobile-first audit** :
- Lighthouse mobile cible perf score ≥85 sur les 5 pages critiques (intake, cockpit/brand, console/oracle, agency/missions, creator/missions).
- Lazy-load systématique des assets >50KB.
- Topbar simplifiée mobile (déjà partielle via `MobileTabBar`).
- Test sur smartphones réels via BrowserStack ou équivalent (3 devices : low-end Android, mid Android, iOS).

**Internationalisation Oracle output** :
- Le contenu Oracle (21 sections) accepte une `lang` parameter (FR/EN initial).
- Mestor route vers un prompt localisé selon la `lang` du brand.
- `OracleSnapshot.lang` stocké pour traçabilité.
- Étendable plus tard à PT, AR pour marchés africains anglophones/lusophones/arabophones.

### Phase 11 — Design System Migration (panda + rouge fusée) (~6 sem, label `out-of-scope`)

Démarrée 2026-04-30. Refonte complète du DS vers une palette panda noir/bone + accent rouge fusée, gouvernée [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), enforced par CI bloquant.

**Trigger** : 60% du code visuel utilise `text-zinc-*`/`bg-zinc-*`/`text-violet-*`/hex hardcoded au lieu des tokens sémantiques. CVA déclaré mais inutilisé. Aucune primitive `src/components/primitives/`. Aucun manifest UI. Aucun test visuel/a11y/i18n. Drift répété sur `PricingTiers`. Direction brand non-reflétée par la palette violet/emerald (V5.0).

**Architecture** : 4 couches token cascade (Reference → System → Component → Domain) + Primitives CVA + Patterns documentés (~60) + Surfaces avec `data-density` per portail. Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [ADR-0013](adr/0013-design-system-panda-rouge.md).

**9 sous-PRs séquencés** (branche `feat/ds-panda-v1`) :
- **PR-1** : Foundation — DESIGN-SYSTEM.md canon (renommé depuis DESIGN-SYSTEM-PLAN.md), tokens cascade `src/styles/tokens/{reference,system,component,domain,animations}.css`, ADR-0013, 5 docs séparés (LEXICON/TOKEN-MAP/MOTION/A11Y/I18N), 4 catalogues design-tokens, COMPONENT-MAP initial, 2 tests anti-drift bloquants (coherence + cascade). v5.5.0
- **PR-2** : Primitives core — `defineComponentManifest` helper (Zod, mirror backend `defineManifest`), `cva-presets`, 5 primitives Wave 0 (Button/Card/Input/Badge/Dialog) avec manifests + tests unit. Test bloquant `design-primitives-cva`. v5.5.1
- **PR-3** : Storybook + Chromatic + COMPONENT-MAP auto-généré. v5.5.2
- **PR-4** : Codemod zinc→tokens + audit:design + tests warning. v5.5.3
- **PR-5** : Primitives complètes (~33 — Tooltip/Popover/Sheet/Stepper/Command/etc.). v5.5.4
- **PR-6** : Wave 1+2 migration (atomic + composite shared) + data-density per portail (test bloquant). v5.5.5
- **PR-7** : Wave 3+4 migration (Cockpit + Console business). v5.5.6
- **PR-8** : Wave 5+6 — Neteru + Intake/Public + **Landing v5.4 dans `(marketing)/`** (substitution INFRASTRUCTURE → Ptah cohérent BRAINS const). v5.5.7
- **PR-9** : CI strict + cleanup + preview page `/console/governance/design-system` + ESLint rules `lafusee/design-token-only` + `lafusee/no-direct-lucide-import` + husky pre-commit. v5.5.8

**Enforcement** :
- 6 tests anti-drift CI bloquants (`tests/unit/governance/design-*.test.ts`)
- 2 règles ESLint custom (`eslint-plugin-lafusee` étendu)
- Tests visuels Playwright + Chromatic
- Tests a11y axe-core (0 violation critique/sérieuse)
- Tests i18n RTL + zoom 200%
- Codemod automatisé `scripts/codemod-zinc-to-tokens.ts`
- Storybook + page Console preview

**Substitution narrative** : la section "Gouverneurs" landing (HTML Downloads V5.4) listait `INFRASTRUCTURE` à la place de `Ptah`. Aligné sur BRAINS const 5 actifs (Mestor, Artemis, Seshat, Thot, **Ptah**). Cf. ADR-0013 §3 et [PANTHEON.md](PANTHEON.md).

**Sous-système APOGEE concerné** : Console/Admin — INFRASTRUCTURE (Ground Tier §4 [APOGEE.md](APOGEE.md)). Aucun Neter créé, aucune mutation business. `missionContribution: GROUND_INFRASTRUCTURE`, `groundJustification` : "DS unifié → vélocité industrialisation forges/briefs/manifests/signaux → accumulation superfans + Overton plus rapide" (cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) tête).

**Exit criteria** :
- Tests anti-drift CI tous bloquants verts
- Dette zinc résiduelle = 0 (audit:design)
- COMPONENT-MAP : tous composants `migrated`
- Landing v5.4 portée
- `npm run stress:full` vert post-migration

---

## Critical Files

**À créer** :
- `src/domain/pillars.ts`, `src/domain/lifecycle.ts`, `src/domain/touchpoints.ts`, `src/domain/intent-progress.ts`, `src/domain/index.ts`
- `src/server/governance/manifest.ts`, `event-bus.ts`, `intent-versions.ts`, `bootstrap.ts`
- `src/server/governance/registry.generated.ts` (codegen)
- `src/server/governance/nsp/{server,types,replay}.ts` (Neteru Streaming Protocol)
- `src/components/neteru/` — `MestorPlan`, `ArtemisExecutor`, `SeshatTimeline`, `ThotBudgetMeter`, `NeteruActivityRail`, `CascadeProgress`, `OracleEnrichmentTracker`, `PartialContentReveal`, `IntentReplayButton`, `CostMeter`, `NeteruSkeleton`
- `src/lib/hooks/use-neteru.ts` (hook unifié streaming intent)
- `src/components/landing/{oracle-showcase,cross-brand-intelligence,architecture}.tsx` (3 nouvelles sections)
- `src/app/(public)/changelog/page.tsx`, `src/app/(public)/status/page.tsx`
- `eslint-plugin-lafusee/` (workspace, 3 rules + `no-numbered-duplicates`)
- `.github/workflows/ci.yml`, `governance-drift.yml`
- `scripts/audit-governance.ts`, `gen-manifest-registry.ts`, `scaffold-capability.ts`, `sync-readme-version.ts`
- `docs/governance/{ARCHITECTURE,ADDING-A-CAPABILITY,INTENT-CATALOG,NSP-PROTOCOL}.md` (+ `archive/snapshots-2026/baseline-2026-04.md`)
- Storybook config + stories pour Neteru UI Kit

**À modifier (priorité)** :
- `src/server/services/mestor/intents.ts` — devient point d'entrée unique
- `src/server/services/neteru-shared/governance-registry.ts` — fusionne avec nouveau registry
- `src/server/trpc/routers/pillar.ts` — migration #1 (le pire offender)
- `src/server/trpc/routers/strategy.ts:62-64` — migration #2
- `src/server/services/advertis-scorer/index.ts` — exposé via wrapper unique
- `src/lib/types/pillar-schemas.ts` — ré-export depuis `domain/`
- `prisma/schema.prisma` — `IntentLog` + `IntentQueue` + `MfaSecret` + `IntegrationConnection`
- `src/app/(intake)/oracle/proposition/page.tsx` — port depuis cockpit
- `src/app/(console)/console/config/integrations/page.tsx:173` — OAuth réel

**À supprimer** :
- `src/components/landing 2/`
- `src/server/mcp/notoria 2/`, `advertis-inbound 2/`
- `src/server/services/financial-brain 2/`, `advertis-connectors 2/`

---

## Vérification

**Par phase** (gates avant de passer à la suivante) :
- **P0** : CI verte sur main actuel, baseline.md committed.
- **P1** : `grep '"A".*"D".*"V".*"E"' src/` → 0 hors domain. `npm run lint` vert avec `no-hardcoded-pillar-enum: error`.
- **P2** : tous services ont manifest, `npm run scaffold:capability` produit un nouveau capability fonctionnel e2e.
- **P3** : 100% mutations tRPC créent un `IntentLog`, kill-Seshat test vert, `no-direct-service-from-router: error` sans exception.
- **P4** : `madge --circular` → 0, coverage scoreObject ≥90%.
- **P5** : `tests/e2e/cascade-full` vert, governance-bypass test fail comme attendu.
- **P6** : export PDF Oracle diff visuel acceptable vs print, `/oracle/proposition` accessible aux 2 portails, 0 fichier `* 2/` dans le repo.
- **P7** : docs publiées, `/console/governance/intents` fonctionnel.

**End-to-end** :
1. Lancer `npm run dev` + `prisma migrate deploy` sur DB clean.
2. Console : créer brand → quick intake → trigger ADVE→RTIS cascade.
3. Vérifier en DB : `SELECT * FROM "IntentLog" WHERE strategyId=... ORDER BY startedAt` montre la séquence complète Mestor→Artemis→Seshat.
4. Cockpit : ouvrir `/cockpit/brand/<id>/proposition` → Oracle 21 sections rendues.
5. Export PDF → fichier généré identique au browser print à ±2% diff visuel.
6. Cockpit + Intake : `/oracle/proposition` rendent le même composant (0 duplication).
7. Tenter (en branche test) un router qui appelle `notoria.runIntake()` directement → CI fail sur `no-direct-service-from-router`.
8. Tuer Seshat (mock throw) → cascade complète OK, IntentLog status=OK pour tous, Seshat events en `failed` non bloquants.
9. Login admin sans MFA → forced setup TOTP avant accès.

---

## Métriques de succès du programme

Mesurées avant/après (cf. baseline P0) :

| Métrique | Avant | Cible |
|---|---|---|
| Fichiers à toucher pour ajouter une fonction | ~6+ | 3 (manifest, impl, test) |
| Routers qui contournent governance | ≥5 | 0 |
| Sites hardcodant `["A","D","V","E","R","T","I","S"]` | 6+ | 0 |
| Callsites distincts de `scoreObject` | 16 | 1 + wrappers gouvernés |
| Cycles d'imports | ≥3 | 0 |
| Coverage gouvernance (`governance/`, `mestor/`, `artemis/`) | ~5% | ≥80% lignes |
| Durée CI | n/a | <15 min |
| CI vert sur main | n/a | 100% du temps |
| Time-to-first-PR onboarding dev | n/a | ≤2 jours |
| Pages LLM-driven sans feedback visuel | ~10 | 0 |
| Latence p50 perçue (premier feedback visuel après clic) | n/a | <800ms (PROPOSED event) |
| Replay possible d'un intent terminé | non | oui (depuis `IntentEmissionEvent`) |
| Sections landing alignées vocab `domain/pillars.ts` | partiel | 100% |
| Composants Neteru UI Kit publiés en Storybook | 0 | ≥10 |
| Glory tools sans manifest | 91 | 0 |
| Stub routers v3 non résolus | 9 | 0 |
| Tables `db.*` accédées en bypass de `tenantScopedDb` | inconnu | 0 |
| Hash-chain `IntentEmission` rupture (rolling 7d) | n/a | 0 |
| SLOs définis par Intent kind | 0 | 100% |
| Lighthouse mobile perf score (5 pages critiques) | inconnu | ≥85 |
| Plugins externes installables via SDK | 0 | ≥1 (démo loyalty) |
| Oracle snapshots time-travel disponibles | 0 | tous les assemblages `ASSEMBLE_ORACLE` |
| PRs avec label `out-of-scope` mergées sans justif écrite | n/a | 0 |

---

## Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Régression silencieuse pendant migration des 70 routers | Élevé | Dual-write + comparaison output + feature flag `GOVERNANCE_STRICT_MODE` + déploiements canary |
| Latence IntentLog write | Moyen | Index Prisma sur `(strategyId, createdAt)`, write asynchrone via `setImmediate`, batch flush cron pour low-priority |
| Manifest auto-discovery casse au build Next | Moyen | Codegen committed (pas runtime), snapshot test sur `registry.generated.ts` |
| Lazy imports difficiles à éliminer (Next.js code-splitting légitime) | Faible | Whitelist explicite avec justification commentée par fichier |
| Équipe fatigue rigueur lint | Moyen | Pair programming P1, scaffold tool qui supprime la friction |
| Rollback impossible mi-P3 | Élevé | Tags git par phase, scripts rollback Prisma testés en staging, additive only |
| Tests Playwright lents en CI | Faible | Smoke set en PR, full set en cron nuit, parallélisation par worker |

---

## Ordre d'exécution

```
S1     P0 (CI/lint)               ──┐
S2     P1 (SSOT domaine)          ──┘   (parallèles)
S3     P2 (Manifests)
S4-5   P3 (Bus + dispatcher v2)         ← critique, dual-write
S6     P4 (Layering + scorer)
S7-8   P5 (NSP + Neteru UI Kit)         ← majeur, prévisibilité visuelle
S9     P6 (Filets E2E governance)
S10    P7 (Oracle exports + Landing/README upgrade) ──┐
S10-11 P8 (Docs + observabilité)                     ──┘   (parallèles)
```

Total : **11–13 semaines** (1 dev senior plein temps), **7–8 semaines** (2 devs en parallèle sur P0+P1, P5+P6, P7+P8). L'extension vs estimation initiale (10–11 sem) absorbe : Glory Tools governance (91 manifests), hash-chain audit log, tenant hardening, CRDT collab, offline PWA, Oracle time travel, multi-LLM smart routing, SDK public, mobile audit, i18n Oracle.

**Le coût "sans compromis"** : ~3 semaines de plus que la version prudente, mais l'OS sort comme un vrai produit shippable industriel, pas comme un prototype ambitieux.

---

## Phase 13 — Sprint Oracle 35-section (PR #26, mai 2026)

**Verrouille l'Oracle dans un framework canonique unique de 35 sections, irrigue le pipeline avec tous les outils des Neteru actifs (5 au moment de Phase 13, désormais 7 depuis Phase 14/15), NSP wired, Ptah forge à la demande.**

Sections cibles (état Phase 13 historique) : 21 CORE (Phase 1-3 ADVERTIS, inchangées) + 7 BIG4 baseline (McKinsey/BCG/Bain/Deloitte) + 5 distinctifs La Fusée (Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis) + 2 dormantes (Imhotep/Anubis pré-réservés Oracle-stub). **Note Phase 17 cleanup ADR-0045 (2026-05-04)** : tier DORMANT supprimé, les 2 sections passées à `tier: "CORE"` post-Phase 14/15 (cap APOGEE 7/7 atteint). Composition canonique courante : **23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE = 35 sections**.

10 batches commitables séquentiels (B1→B10) dans une PR draft progressive (#26) :

| Batch | Scope | Tests créés |
|---|---|---|
| B1 | SECTION_REGISTRY 21→35 + BrandAsset.kind +10 + canonical lock | 14 |
| B2 | 7 nouveaux Glory tools (DC layer) + 3 étendus | 13 |
| B3 | 14 nouvelles Glory sequences + flag `_oracleEnrichmentMode` | 17 |
| B4 | SECTION_ENRICHMENT 35 + BrandAsset promotion writeback (idempotent Loi 1) | 11 |
| B5 | UI 14 sections + dormancy badges (DS Phase 11 strict) | 14 |
| B6 | PDF auto-snapshot pre-export (idempotence SHA256) | 15 |
| B7 | NSP streaming tracker 35-section + tier groups + page wiring | 12 |
| B8 | Ptah on-demand forge buttons (4 sections distinctives) | 17 |
| B9 | Imhotep & Anubis Oracle-only stubs (sortie partielle pré-réserve) | 13 |
| B10 | CHANGELOG + 5 ADRs (0014-0018) + 7-source propagation + APOGEE doc updates | — |

**ADRs Phase 13** :
- [ADR-0014](adr/0014-oracle-35-framework-canonical.md) — Oracle 35-section canonical
- [ADR-0015](adr/0015-brand-asset-kind-extension.md) — Extension BrandAsset.kind +10
- [ADR-0016](adr/0016-oracle-pdf-auto-snapshot.md) — PDF auto-snapshot pre-export
- [ADR-0017](adr/0017-imhotep-partial-pre-reserve-oracle-only.md) — Imhotep sortie partielle
- [ADR-0018](adr/0018-anubis-partial-pre-reserve-oracle-only.md) — Anubis sortie partielle

**Cap 7 BRAINS preserved** : Imhotep + Anubis restent pré-réservés (statut inchangé). Aucun nouveau Neter ajouté à `BRAINS` const.

**Ptah à la demande** : flag `_oracleEnrichmentMode: true` court-circuite `chainGloryToPtah` durant `enrichOracle`. Forges Ptah déclenchées exclusivement via boutons "Forge now" B8 (4 sections distinctives forgeable).

**DS Phase 11 strict** : composition primitives uniquement, CVA pour variants, tokens cascade Component+Domain, zéro hardcoding hex/Tailwind couleur.

**Anti-doublon NEFER §3** : zéro nouveau modèle Prisma, réutilisation `cult-index-engine`, `seshat/tarsis`, `manipulation-matrix` existants.

Total tests anti-drift Phase 13 : **126 nouveaux** (registry-completeness 14, glory-tools 13, sequences 17, section-enrichment 11, ui 14, pdf-snapshot 15, nsp-streaming 12, ptah-forge 17, imhotep-anubis-stubs 13).

---

## Phase 14 — Imhotep full activation Crew Programs (PR #31, mai 2026)

**Auto-correction NEFER Phase 8** : drift Phase 13 (sortie partielle Oracle-only ratifiée par ADR-0017) signalée par l'opérateur — le scope demandé était le full service Imhotep prévu par ADR-0010. ADR-0017 marqué Superseded par [ADR-0019](adr/0019-imhotep-full-activation.md).

**Imhotep devient le 6ème Neter actif.** Architecture orchestrateur qui wrappe les services satellites existants sous gouvernance unifiée Mestor → Imhotep → satellite :

- `matching-engine` (suggest, scoreCandidates)
- `talent-engine` (matchTalentsForMission, evaluateAllPromotions)
- `team-allocator` (suggestAllocation)
- `tier-evaluator` (evaluateCreator)
- `qc-router` (routeReview, assignReviewer, automatedQc)

**Anti-doublon NEFER §3 strict — 0 nouveau model Prisma.** Réutilise `TalentProfile`, `Course`, `Enrollment`, `TalentCertification`, `TalentReview`, `Mission`, `MissionDeliverable` existants.

8 capabilities manifest : `draftCrewProgram`, `matchTalentToMission`, `assembleCrew`, `evaluateTier`, `enrollFormation`, `certifyTalent`, `qcDeliverable`, `recommendFormation`.

7 nouveaux Intent kinds + SLOs déclarés. 4 nouveaux Glory tools : `crew-matcher` (HYBRID/LLM), `talent-evaluator` (DC/CALC), `formation-recommender` (HYBRID/LLM), `qc-evaluator` (DC/LLM).

tRPC router `imhotep.ts` (9 procédures + dashboard agrégé). Page hub `console/imhotep/page.tsx` qui pivote vers les pages Console existantes (`arene/matching`, `arene/club`, `arene/orgs`, `academie`, `academie/certifications`).

**Cascade Crew** : Mestor → Imhotep assemble crew → Artemis/Ptah produisent les assets → Anubis broadcast → Seshat observe engagement → Thot facture.

---

## Phase 15 — Anubis full activation Comms + Credentials Vault (PR #31, mai 2026)

**Auto-correction NEFER Phase 8 (jumeau Phase 14).** ADR-0018 marqué Superseded par [ADR-0020](adr/0020-anubis-full-activation.md). Pattern transverse Credentials Vault formalisé dans [ADR-0021](adr/0021-external-credentials-vault.md) (demande explicite opérateur : back-office UI pour les API keys).

**Anubis devient le 7ème Neter actif. Cap APOGEE atteint 7/7.**

Architecture orchestrateur wrappant les services satellites comms existants (`email`, `advertis-connectors`, `oauth-integrations`) + introduction du **Credentials Vault** :

**Pattern Credentials Vault (ADR-0021)** : tout connector externe est CRUDé via UI back-office `/console/anubis/credentials` qui pilote `ExternalConnector` (model V5 existant). Provider façades feature-flagged retournent `DEFERRED_AWAITING_CREDENTIALS` quand pas de creds — **code ship-able sans clés API**, l'operator finit la config plus tard via UI. Pattern réutilisable par tout futur Neter.

**4 nouveaux models Prisma** (anti-doublon NEFER §3 — réutilise `Notification`, `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants) :
- `CommsPlan` — plan comms global pour stratégie/campagne
- `BroadcastJob` — queue persistante avec retry + tracking
- `EmailTemplate` + `SmsTemplate` — templates réutilisables

11 capabilities manifest : `draftCommsPlan`, `broadcastMessage`, `buyAdInventory`, `segmentAudience`, `trackDelivery`, `registerCredential`, `revokeCredential`, `testChannel`, `scheduleBroadcast`, `cancelBroadcast`, `fetchDeliveryReport`.

10 nouveaux Intent kinds + SLOs. 3 nouveaux Glory tools : `ad-copy-generator` (CR/LLM), `audience-targeter` (HYBRID/LLM), `broadcast-scheduler` (HYBRID/CALC).

7 provider façades feature-flagged (via `_factory.createProviderFaçade` DRY) : Meta Ads, Google Ads, X Ads, TikTok Ads, Mailgun, Twilio, email-fallback. Stubs Phase 15 — vrais SDKs livrés par PRs ultérieures dédiées par provider, déclenchées une fois que l'operator a fourni les credentials.

tRPC router `anubis.ts` (14 procédures). **Sécurité ADR-0021** : `listCredentials` ne retourne JAMAIS `config` (secrets stay server-side).

Pages : `console/anubis/page.tsx` (dashboard 5 KPIs + warning credentials INACTIVE) + `console/anubis/credentials/page.tsx` (Credentials Center back-office — CRUD avec form dynamique selon provider, action Test/Revoke).

**Cascade Comms** : Mestor → Anubis broadcast vers audience segmentée → Seshat observe engagement → Thot facture campagne.


## Phase 17 — Country-Scoped Knowledge Base + MarketStudy ingestion + Variable-bible canonical audit (PRs sur main, mai 2026)

[ADR-0037](adr/0037-country-scoped-knowledge-base.md). Sprint complet shipping 12 sub-PRs (A→L) qui résolvent 3 dérives architecturales découvertes simultanément :

1. **Seshat KB pas pays-scopé** — `KnowledgeEntry.market` était texte libre, jamais filtré par ISO-2. Conséquence : entry CM hit chaud pour brand ZA même secteur. Pilier T halluciné sur tout pays sans seed dédié (seul Wakanda triche via seed-wakanda).
2. **Aucun pipeline d'ingestion d'études de marché** — un PDF Statista/Nielsen/Kantar/BCG uploadé restait fichier mort dans BrandDataSource. Le moteur ne savait pas absorber.
3. **Canon manuel ADVE pas mappé sur variable-bible.ts** — codes A1-A11/D1-D12/V1-V18/E-* du Workflow ADVE GEN invisibles dans le code. L'opérateur formé sur le manuel se perdait dans la nomenclature TS.

**Sub-PRs livrés :**

- **PR-A** — Migration `KnowledgeEntry.countryCode VARCHAR(2)` + index countryCode + composite (sector, countryCode) + UPDATE backfill 'WK' pour Wakanda. Seed wakanda 26-intelligence pousse `countryCode: 'WK'` à chaque KE create.
- **PR-K** — Variable-bible canonical map. `VariableSpec` étendu avec `canonicalCode/Label/manualSection`. **21 nouveaux fields ADVE** comblant les gaps manuel : A messieFondateur/competencesDivines/preuvesAuthenticite/indexReputation/eNps/turnoverRate/missionStatement/originMyth, D positionnementEmotionnel/swotFlash/esov/barriersImitation/storyEvidenceRatio, V roiProofs/experienceMultisensorielle/sacrificeRequis/packagingExperience, E clergeStructure/pelerinages/programmeEvangelisation/communityBuilding. 62 codes mappés sur 155 entries. Auto-doc régen `VARIABLE-BIBLE-CANON.md`. Test anti-drift CI 65 tests. UI cockpit field-renderers : badge `[A1]/[D5]/[E-Clerge]` à côté de chaque label avec tooltip section manuel.
- **PR-B+C+E** — Tarsis country-aware. `SearchContext` étendu avec `countryCode/countryName/primaryLanguage/purchasingPowerIndex/region/countryMeta`. `buildSearchContext` joint `Country` row. `checkSectorKnowledgeByCountry` filtre strict par ISO-2. Persistence `countryCode` dans tous les `db.knowledgeEntry.create` Tarsis.
- **PR-D** — LLM prompts country-aware. `buildCountryContextPrompt` exporté — bloc CONTRAINTE DURE injecté dans `signal-collector` + `weak-signal-analyzer`. Calqué sur ADR-0030 §PR-Fix-2 anti-hallucination Wakanda. Compat legacy : retourne "" si pas de countryCode.
- **PR-L** — Schema typé `KnowledgeEntry.data`. Migration enum KnowledgeType +5 valeurs (MARKET_STUDY_TAM/COMPETITOR/SEGMENT/RAW + EXTERNAL_FEED_DIGEST). Module `seshat/knowledge/` : Zod schemas par entryType, Trend Tracker 49 catalog (12 MACRO_ECO + 8 MACRO_TECH + 10 SOCIO_CULT + 7 REGUL_INST + 12 MICRO_SECTOR), access helpers `getTamForCountrySector` / `getCompetitorSharesForCountrySector` / `getMarketSegmentsForCountrySector` / `getMacroAndWeakSignalsForCountrySector` / `getTrendTrackerForCountrySector` / `loadCountrySectorIntelligence`.
- **PR-I** — MarketStudy ingestion pipeline. Service `seshat/market-study-ingestion/` : extractor LLM + persister 1→N (RAW + TAM + N COMPETITOR + N SEGMENT + DIGEST) + sha256 dedup + preview/confirm/reExtract. 2 nouveaux Intent kinds (INGEST_MARKET_STUDY + RE_EXTRACT_MARKET_STUDY). Réutilise `extractPDF/DOCX/XLSX` de `ingestion-pipeline/extractors`. Pattern ADR-0027 calqué (output KE au lieu de BrandAsset).
- **PR-J** — UI complète. tRPC router `marketStudyIngestion` (preview/confirm/list/getDetail/reExtract/listTrendTracker/getTrendTrackerForCountrySector/loadCountrySectorIntelligence). Pages : `cockpit/intelligence/market-studies` (drag-drop modal upload) + `cockpit/intelligence/track` (49 variables Trend Tracker exposées par catégorie pour le pays/secteur du brand actif) + `console/seshat/market-studies` (admin all-strategies).
- **PR-G** — Tarsis external feeds. Service `seshat/external-feeds/` qui produit 1 EXTERNAL_FEED_DIGEST KE par (countryCode, sector). 8 priority pairs (CM/NG/CI/ZA/MA × fmcg/fintech). Idempotent day-granularity. Intent kind FETCH_EXTERNAL_FEED. Future iteration : remplace LLM-synthesis par RSS/News API quand keys provisionnées via Anubis Credentials Vault.
- **PR-F** — Anti-drift CI : 11 tests `country-scoped-kb.test.ts` + script `audit-cskb-coverage.ts` (threshold 10% transitional, cible 99%).
- **PR-H** — Closing : ADR statut Accepted, REFONTE-PLAN entry, LEXICON entry CSKB, CHANGELOG v6.17.0 grouped.

**Cap APOGEE 7/7 préservé** — pas de nouveau Neter, pas de bypass governance. Tout passe via `mestor.emitIntent`. Réutilise `BrandDataSource`, `KnowledgeEntry`, `extractText`, `Country` existants.

---

## Phase 17 — Deliverable Forge (output-first composition, ADR-0050 — anciennement ADR-0037, mai 2026)

**ADR figé, code à venir.** Cf. [ADR-0050](adr/0050-output-first-deliverable-composition.md) pour la décision et le découpage.

**Friction observée** : la cascade canonique Glory→Brief→Forge ([ADR-0009](adr/0009-neter-ptah-forge.md), [ADR-0028](adr/0028-glory-tools-as-primary-api-surface.md)) est puissante mais reste **input-first** — le founder doit savoir quel brief il veut avant de cliquer. Le Cockpit n'a pas de surface productive de bout-en-bout : `/cockpit/operate/briefs` listait flat, `/cockpit/brand/deliverables` consultait le vault, mais aucune page ne permettait de pointer un livrable matériel cible et déclencher la chaîne.

**Décision** : surface neuve `/cockpit/operate/forge` qui inverse le point d'entrée. Le founder sélectionne le `BrandAsset.kind` matériel cible (KV_POSTER, VIDEO_AD, MANIFESTO_VIDEO, SALES_DECK, …). Le resolver remonte le DAG des briefs requis via le nouveau champ `GloryToolForgeOutput.requires?: BrandAssetKind[]`. Le vault-matcher scanne `BrandAsset.where({ kind, state: ACTIVE, strategyId })` pour ré-utiliser ce qui existe + propose Régénérer / Rafraîchir / Générer pour le manquant. Le composer construit une `GlorySequence` runtime ad-hoc dispatchée via `sequence-executor` existant. Sortie : grappe `BrandAsset` liée par `parentBrandAssetId`.

**Cap APOGEE préservé 7/7** : Artemis governor (sous-composant Propulsion comme `brief-ingest`), pas de nouveau Neter, pas de nouveau model Prisma — `BrandAsset.parentBrandAssetId` (existant) suffit pour le lineage de la grappe.

**1 nouveau Intent kind** : `COMPOSE_DELIVERABLE` (sync dispatcher) ré-émet `INVOKE_GLORY_TOOL` + `PTAH_MATERIALIZE_BRIEF` + `PROMOTE_BRAND_ASSET_TO_ACTIVE` existants. SLO p95 = 60s (dispatch initial, pas complétion totale).

**Loi 2 séquencement** appliquée : resolver refuse `MISSING_PRECONDITION_PILLAR` si la marque n'a pas de `Strategy.manipulationMix.primary` validé OU aucun pilier ADVE en état ACTIVE — redirige UI vers `/cockpit/brand/proposition`.

**Loi 3 fuel** : Thot pre-flight `CHECK_CAPACITY` avant `compose()` ; modale confirmation user obligatoire avec total estimé (peut atteindre $50–200 pour 5 briefs + 4 forges Magnific).

**Découpage 6 commits atomiques** (cf. ADR-0037 Notes implémentation) :
1. `feat(glory-registry)` — extension `forgeOutput.requires` + remplissage 18 tools `brief→forge` existants
2. `feat(intent)` — `COMPOSE_DELIVERABLE` kind + SLO + handler delegate
3. `feat(deliverable-orchestrator)` — service complet (resolver + vault-matcher + composer) + tests unit
4. `feat(trpc)` — router 3 procédures (`resolveRequirements` / `compose` / `getProgress`) + tests
5. `feat(cockpit)` — page `/cockpit/operate/forge` + composants UI + NSP wiring
6. `docs(governance)` — propagation finale (PAGE-MAP, SERVICE-MAP, ROUTER-MAP, LEXICON, glory-tools-inventory auto-régen)

**Capital cumulatif** : chaque exécution enrichit le vault. La 2ème production réutilise les briefs intellectuels ACTIVE de la 1ère (manifesto, big idea, mood board) — la friction décroît avec le temps.


---

## Phase 18 — Brand Tree multi-archétype + Matanga × FrieslandCampina (J1 shipped 2026-05-06, sprint 18-A0 en cours)

**Ingestion FrieslandCampina dans l'OS + dashboard agence cross-clients Afrique pour Matanga.** Refonte structurante qui transforme `Strategy` plat en **arbre de marque hiérarchique multi-archétype**, capable de modéliser les 9 BrandNature (PRODUCT FMCG / SERVICE / CHARACTER_IP / FESTIVAL_IP / MEDIA_IP / RETAIL_SPACE / PLATFORM / INSTITUTION / PERSONAL).

**Plan opérationnel complet** : [docs/governance/plans/PHASE-18-MATANGA-FC.md](plans/PHASE-18-MATANGA-FC.md) — 15 sections incluant audit terrain Matanga (3 fichiers XLSX), architecture cible, sub-phases jour par jour, tests anti-drift, ADRs, migration legacy, risques, décisions, critères go-live.

**Driver business** : opérateur Matanga prépare ingestion FC (1 corporate + 6 master brands + 4 clusters géo + 15 pays + ~30 SKU). Audit fichiers réels (Ramadan 2026 Checklist 193 livrables + Projets en cours juin 2025 9 projets) révèle 8 manques structurels du schéma plat actuel.

### ADRs publiés (J1, 2026-05-06)

- [ADR-0059](adr/0059-brand-tree-multi-archetype.md) — Brand Tree multi-archétype hiérarchique (renuméroté depuis ADR-0052 le 2026-05-06 lors merge avec Phase 19). Cascade FMCG 7 niveaux (CORPORATE → MASTER_BRAND → REGIONAL_CLUSTER → REGIONAL_BRAND → PRODUCT_LINE → PRODUCT_VARIANT → SKU). `BrandNode` model générique + `CampaignDeliverable` matrice 6D. Migration legacy non-cassante (Strategy → BrandNode `STANDALONE_BRAND`).
- [ADR-0060](adr/0060-llm-as-ui-orchestrator-manual-first.md) — **Invariant transverse Manual-first parity** (renuméroté depuis ADR-0053). Toute feature LLM doit avoir UI manuelle équivalente. LLM orchestre via mêmes endpoints qu'opérateur humain. Pattern Preview/Validate/Confirm (middle portal). Lint rule `lafusee/llm-orchestrates-only` + 4 tests anti-drift CI.
- [ADR-0061](adr/0061-brand-nature-archetypes-template.md) — Const TS `BRAND_NATURE_ARCHETYPES` (renuméroté depuis ADR-0054). Source de vérité unique pour les 9 archétypes (cascade canonique + transitions valides + Glory tools applicables + variables Bible applicables + manipulation mix défaut + identityRootKind par nature). Validation runtime via Mestor gate `NATURE_TRANSITION_VALIDITY`. PRODUCT operable Phase 18-A0 ; 8 autres natures Phase 18-bis.
- [ADR-0062](adr/0062-morning-brief-batch-validation.md) — Morning Brief Batch (renuméroté depuis ADR-0055). Cadence quotidienne paste mail/slack → extraction LLM → middle portal validation → matérialisation. 60% du squelette existe déjà (brief-ingest, ingestion-pipeline, market-study-ingestion pattern, Anubis MCP, NSP). 3 nouveaux models Prisma + 7 Intent kinds.

### Doctrine LLM NEFER étendue (corrigée 2026-05-06)

[NEFER.md §1.1](NEFER.md) — nouvelle section ajoutée à la demande explicite de l'opérateur : pas de notion de temps humain, pas d'économie de tokens, pas de fatigue, seul critère d'arrêt valide = inférence impossible. 6 sous-sections + drift signals + cohérence inter-tour. [CLAUDE.md](../../CLAUDE.md) section ACTIVATION étendue avec récap 5 invariants.

### Phasage

| Phase | Durée | Status | Output |
|---|---|---|---|
| **18-A0** | 8-10j | 🔵 J1 shipped | Brand Tree min + 3 vues dashboard + crew Matanga + portfolio import wizard |
| **18-A1** | 5-7j | ⏸️ post 18-A0 | Morning Brief Batch (paste manuel + middle portal validation) |
| **18-A2** | 4-5j | ⏸️ optionnel | Auto-pull connectors Slack/Gmail/WhatsApp |
| **18 noyau** | 14-18j | ⏸️ post 18-A1 | Héritage piliers `resolveEffectivePillars()` + RAG arborescent + Variable Bible reclassif (~300 entrées × 9 natures) + Glory tools brand-aware |
| **18-bis** | 3 mois | ⏸️ trigger M&A | NodeOwnershipTransfer + lineage hash-chain + BrandPartnership/License + 8 archétypes non-PRODUCT |

### Audit terrain Matanga effectué (3 fichiers XLSX)

Les 3 fichiers de pilotage agence Matanga audités (production réelle pré-OS) ont alimenté la conception :

- **`Checklist_Ramadan_2026_LISTE.xlsx`** — 193 livrables granulaires Ramadan 2026 FC. Matrice 6D `{ZONE × PAYS × MARQUE/SKU × CATÉGORIE × PACKAGING × PROMO × LIVRABLE × LANGUE}`. → Révèle nécessité `CampaignDeliverable` matrice 6D + 7 niveaux hiérarchie + tags saisonniers `nodeRole`.
- **`Projets en cours 180625.xlsx`** — project tracker juin 2025. Header CLIENT/PROJET/LIVRABLES/STAFF CREA/STATUT créa/STATUT client/Commentaires/RAG. 9 projets FC actifs. → Révèle nécessité workflow dual `Campaign.creativeState + clientState + healthSignal RAG`.
- **`PROJETS EN COURS_MATANGA AGENCY.xlsx`** — sandbox macOS Mail bloque lecture. À récupérer manuellement par opérateur (Finder drag → `~/Downloads/`) avant J5.

Équipe créa Matanga confirmée 2026-05-06 : Alex (DA lead) + Papin (graphiste) + William (graphiste). Serge & Stuart partis. Pré-import Imhotep CrewMember sur ces 3 personnes uniquement.

### Cap APOGEE 7/7 préservé

Aucun nouveau Neter. Phase 18 = sous-domaine de Mestor governance (Brand Tree CRUD) + extension Anubis (entrant Slack/Gmail) + extension Imhotep (crew Matanga 3 membres) + Seshat telemetry agrégée Afrique. Tout passe via `mestor.emitIntent`. Manual-first parity garantie par ADR-0060.

### Critères de go-live FC (5 acceptance criteria)

- [ ] Portefeuille FC structuré (1 CORPORATE + 6 MASTER_BRAND + 4 REGIONAL_CLUSTER + 15 REGIONAL_BRAND + N PRODUCT_LINE + N PRODUCT_VARIANT + N SKU)
- [ ] 9 projets actifs BACK2SCH + 193 livrables Ramadan importés et visibles dans dashboard
- [ ] Crew Matanga (Alex DA + Papin + William) assignables
- [ ] Morning intake fonctionnel (paste matin → briefs validés → dashboard NSP refresh)
- [ ] Audit chain navigable depuis tout CampaignBrief vers source originale

---

## Phase 22 — Argos by LaFusée (Seshat reference harvester + propriété média indépendante) — 🟢 backend + app publique shippés (ADR-0100)

**Actualisation 2026-10-06** : le découpage monorepo et la checklist ci-dessous
conservent la conception historique, pas l'état d'exécution présent. La bibliothèque
canonique est `Argos-studio` depuis l'amendement ADR-0100 / SHK-0002 ; le journal
et les gates restent dans La Fusée. [ADR-0194](adr/0194-creative-corpus-and-competitive-intelligence.md)
ajoute la revue explicite des recettes avec preuves publiques ; la publication
des dossiers `CampaignReferenceDossier` sur PASS demeure conservée.
Les surfaces natives `/argos` et `/console/seshat/argos` existent ; aucun second
fonds documentaire ni déploiement de monorepo n'est créé par ce chantier.


**Status** : porté SOUS gouvernance le 2026-06-14 ([ADR-0100](adr/0100-argos-hunter-backend-port.md), v6.25.27-31) — modèle `CampaignReferenceDossier` + Hunter via LLM Gateway + manual-first + verdict sûreté déterministe + app publique `src/app/(public)/argos` + console. Le code de référence vendorisé reste gelé intact dans [`docs/external-design/argos-hunter-v1/`](../external-design/argos-hunter-v1/) — lire [VENDOR-NOTICE.md](../external-design/argos-hunter-v1/VENDOR-NOTICE.md) (3 interdits) avant toute interaction avec le vendor. Restant : A4 newsletter (post-MVP).

### Mission contribution (north star)

Argos sert **deux mécanismes Overton simultanément** :

1. **Outil interne** — alimente Artemis en DNA culturel exploitable (palette, structure, voice, visualCodes, keyPhrases, axes stratégiques, performance). Les Glory tools rédactionnels (briefs) et Ptah forge produisent des assets **culturellement ancrés** au lieu de prompts génériques.
2. **Machine à autorité publique** — service éditorial **indépendant** « Argos by LaFusée » qui publie des décodages systématiques sourcés verbatim des campagnes mondiales iconiques. Levier ADVE appliqué à La Fusée elle-même comme sous-brand de service. Pattern média autonome type Stripe Press / Red Bull Media House / Basecamp Signal v. Noise.

Le coût LLM par hunt ($3-5 estimé) se justifie sur **les deux axes simultanément**, pas un seul.

### Architecture triptyque

```
┌─────────────────────────────────────────────────────────┐
│  LaFusée OS (lafusee.com)                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  L0  Hunter (sub-agent Seshat)                  │    │
│  │       4-phases pipeline                         │    │
│  │  L1  Dossier en DB (CampaignReferenceDossier) ─┐│    │
│  │  L2b Console/Cockpit (Artemis RAG)             ││    │
│  └────────────────────────────────────────────────┼┘    │
└───────────────────────────────────────────────────┼─────┘
                                                    │ même DB
                                                    ▼
┌─────────────────────────────────────────────────────────┐
│  Argos by LaFusée (apps/argos/, domaine propre)         │
│  L2a éditorial public, DS distinct, pas de login        │
└─────────────────────────────────────────────────────────┘
```

**L0 — Le Hunter** (sub-agent Seshat, **pas un Neter** — cap APOGEE 7/7 préservé) exécute un 4-phases pipeline :

| Phase | Output | Tool Anthropic |
|---|---|---|
| 1 | Campaign ID (`brand`, `year`, `slug`, `title`, `agency`, `markets`, `confidence`, `sources[]`) | `web_search` + `submit_phase_output` |
| 2 | Assets + DNA par kind (image/video/text/audio — DNA = `palette`, `composition`, `typography`, `tone`, `structure`, `keyPhrases`, `voice`, `visualCodes`...) | idem |
| 3 | Strategic axes (2-4) + performance (evidenceLevel: ANECDOTAL/REPORTED/PROVEN_CAUSAL) + victories | idem |
| 4 | Editorial (summary + patternObservation + significance) + Safety audit (`PASS`/`QUARANTINE`/`REJECT`) | idem |

**Sidecar findings** — pollinisation cross-campagnes (« en cherchant X, j'ai croisé Y notable ») émis à chaque phase, max 3, avec `targetCreateHints` pour enrichissement futur sans hunt explicite.

**UID hiérarchique déterministe** :
- `brand:apple`
- `campaign:apple.think-different.1997`
- `asset:apple.think-different.1997.video-heres-to-the-crazy-ones`

### Décisions de fondation verrouillées (2026-05-15)

1. **Monorepo turborepo** — `apps/lafusee/` (repo actuel) + `apps/argos/` (nouveau) partageant `packages/db`, `packages/ui-tokens` (Tier 0 reference), `packages/llm-gateway`, etc. Deux apps Next.js, deux déploiements Vercel, deux domaines.
2. **Sous-DS Argos** — ADR séparé pour l'identité visuelle. Hérite Tier 0 reference de LaFusée (palette physique, type metrics, motion primitives) mais Tier 2/3 distincts. Argos a son identité éditoriale propre.
3. **Dossiers : auto-publication sur PASS (ADR-0100)** — comportement existant conservé. `QUARANTINE` et `REJECT` restent exclus du public. **Recettes : revue explicite et preuves PUBLIC (ADR-0194)**, sans publication automatique d'une découverte.

### Anti-doublon (Phase 2 NEFER déjà fait — 2026-05-15)

| Argos | Seshat actuel | Verdict |
|---|---|---|
| `research-dossier-v1` | `KnowledgeEntry` (article/case_study/benchmark générique) | **distinct** — Dossier hiérarchique brand→campaign→asset, KnowledgeEntry plat |
| `Dossier` | `BrandAsset` (kind ∈ BIG_IDEA/CREATIVE_BRIEF/MANIFESTO/...) | **distinct** — BrandAsset = livrable interne ; Dossier = référence externe |
| `Dossier` | `TarsisCaptureSession` ([tarsis/campaign-capture.ts:37](../../src/server/services/seshat/tarsis/campaign-capture.ts)) | **distinct** — capture session = signaux runtime d'une campagne LIVE propre |
| `queryReferences()` consumer | `seshat/references.ts:39` + `enrichBrief()` ([references.ts:64](../../src/server/services/seshat/references.ts)) | **point de jonction existant** — Argos doit hook ici, pas dupliquer |

→ **Nouveau modèle justifié** : `CampaignReferenceDossier` + projections (`BrandReference`, `CampaignReference`, `AssetReference`, `MentionAggregate`). ADR à écrire le jour du port.

### Plan de livraison (corrigé 2026-05-15 — scope réel précisé par Alexandre)

**Correction de scope importante** : l'UI Argos + le lecteur JSON **existent déjà et fonctionnent**. Ils sont **réutilisés tels quels** (cf. code vendorisé `docs/external-design/argos-hunter-v1/`). Le port Phase 22 ne reconstruit PAS l'UI dans un sous-DS LaFusée — il **raccorde** l'UI existante au backend LaFusée via 3 swaps ciblés (~50 lignes JSX touchées) + branche la "base JSON Argos" sur Seshat + ajoute les cross-links landing↔Argos.

**22-A0 — Socle monorepo + Hunter backend LaFusée**
- Turborepo init + déplacement repo actuel dans `apps/lafusee/` (ou création `apps/argos/` à côté — choix opérationnel).
- Migration Prisma `CampaignReferenceDossier` + 4 projections (Brand/Campaign/Asset/Mentions) + indexes UID hiérarchique.
- Service `src/server/services/seshat/argos/hunter.ts` (port du `runPhase` + `SUBMIT_TOOLS` + `PHASE_PROMPTS` depuis le vendor) **via LLM Gateway** (pas de `fetch` direct Anthropic — non-négociable).
- Coercion défensive Zod : `seshat/argos/coerce-dossier.ts` entre `submit_phase_output.input` Anthropic et `ingestDossier()`.
- Intent kind `SESHAT_HARVEST_REFERENCE` + handler dispatch Mestor + Thot cost gate pre-flight (Loi 3 APOGEE).
- NSP SSE streaming `argos_phase_started/completed/failed` + `argos_hunt_done` (pattern Phase 16 / Phase 21 F-E réutilisé).
- **API endpoints** que l'UI Argos consomme :
  - `POST /api/seshat/argos/hunt` — déclenche un hunt complet (orchestré server-side, key Anthropic scellée)
  - `GET /api/seshat/argos/dossiers` — liste paginée
  - `GET /api/seshat/argos/dossiers/:id` — détail
  - `DELETE /api/seshat/argos/dossiers/:id` — purge (auth opérateur)

**22-A1 — Branchement base JSON Argos ↔ Seshat (bridge Artemis)**
- Hook dans `seshat/references.ts:queryReferences()` pour matcher `CampaignReferenceDossier` par `sector` / `market` / `pillarFocus`.
- Bridge dans `enrichBrief()` : Artemis Glory tools rédactionnels consomment le DNA (palette/typo/voice/visualCodes/keyPhrases/axes) via RAG.
- Glory tool exposable `seshat:argosHunt` avec `requiresPaidTier=true` (ADR-0048) — déclenchable depuis Console et Cockpit.

**22-A2 — Retarget UI Argos vers backend LaFusée (3 swaps)**
- Déployer `argos-generator.jsx` (du vendor) tel quel via Vercel sur `argos.lafusee.com` — **sans rebuild de l'UI**, l'identité visuelle existante reste.
- 3 modifications ciblées dans le JSX (~50 lignes touchées max) :

  | Argos actuel | À remplacer par |
  |---|---|
  | `fetch('/api/anthropic/v1/messages')` direct vers Anthropic | `fetch('/api/seshat/argos/hunt')` LaFusée (orchestre les 4 phases server-side) |
  | `window.storage.set('dossier:...')` localStorage | `fetch('/api/seshat/argos/dossiers', POST)` → écrit dans `CampaignReferenceDossier` Postgres |
  | `window.storage.list/get/del` localStorage | `fetch('/api/seshat/argos/dossiers...')` GET/DELETE |

- Suppression du panel "Clé Anthropic" client-side (clé scellée server-side via LLM Gateway).
- Dossiers : verdict `PASS` → publication existante (ADR-0100). Recettes : revue explicite avec preuves PUBLIC (ADR-0194). `QUARANTINE` et `REJECT` exclus du public.

**22-A3 — Cross-link landing ↔ Argos footer (signal d'autorité bilatéral)**
- **LaFusée landing** ([src/components/landing/marketing-footer.tsx](../../src/components/landing/marketing-footer.tsx)) : entrée meta-row "Argos by La Fusée — éditorial" → `https://argos.lafusee.com`. **Déjà préposée en mode "(bientôt)" 2026-05-15**, retire le marker au moment du go-live.
- **Argos footer** (à ajouter dans `argos-generator.jsx` au port) : bloc retour vers `https://lafusee.com` avec mention "Argos est une propriété éditoriale de La Fusée".
- Pattern bilatéral assure que les superfans de chaque surface découvrent l'autre.

**22-A4 — Engagement loop (post-MVP, optionnel)**
- Newsletter Argos (re-engage superfans Argos).
- Re-hunt automatique si sidecar findings accumulent X mentions pour une cible non-couverte (graphe auto-enrichi).

### Sources de vérité à synchroniser (anti-drift — 7 sources NEFER)

Au moment du port :
- `BRAINS` const ([manifest.ts:23](../../src/server/governance/manifest.ts)) — **pas modifié** (Hunter pas un Neter).
- `Governor` type ([intent-progress.ts:29](../../src/domain/intent-progress.ts)) — **pas modifié**.
- [LEXICON.md](LEXICON.md) — nouvelle entrée `ARGOS` + `HUNTER` + `RESEARCH_DOSSIER`.
- [APOGEE.md](APOGEE.md) §4 — note sub-component Seshat additionnel.
- [PANTHEON.md](PANTHEON.md) — pas modifié (pas de Neter ajouté).
- [CODE-MAP.md](CODE-MAP.md) — entrées `« référence campagne »` / `« décodage Apple Think Different »` / `« DNA asset »` → `CampaignReferenceDossier` + helpers Argos.
- [CLAUDE.md](../../CLAUDE.md) — section Phase 22 ajoutée au Phase status.

### Cap APOGEE 7/7 préservé

Aucun nouveau Neter. Argos = sous-domaine Seshat (comme Tarsis et market-study-ingestion le sont déjà). Le Hunter est un **sub-agent**, pas un governor (cf. NEFER §1.1 — opérateurs ≠ Neteru).

### Critères de go-live (acceptance criteria)

- [ ] Monorepo turborepo fonctionnel (`apps/lafusee/` + `apps/argos/` build & deploy indépendants).
- [ ] Hunt complet en mode réel via LLM Gateway (1 dossier coût ≤ $5).
- [ ] Dossier ingéré + projections Brand/Campaign/Asset/Mentions visibles `/console/seshat/argos`.
- [ ] **UI Argos déployée sur `argos.lafusee.com`** (code vendorisé réutilisé, identité visuelle préservée, 3 swaps API/storage appliqués).
- [ ] Page éditoriale `argos.lafusee.com/apple/think-different` rendue + SEO meta + sources verbatim.
- [ ] Artemis Glory tool brief consomme DNA Argos (test : générer un brief « campagne café Cameroun rebellion-tone » → DNA Apple Think Different cité comme référence avec source verbatim).
- [ ] Dossiers : comportement PASS conservé. Recettes : revue explicite et preuves PUBLIC ; refus des preuves BRAND (ADR-0194).
- [ ] NSP streaming events affichés temps-réel dans UI pendant le hunt.
- [ ] Cost gate Thot : un hunt > budget alloué refusé pre-flight.
- [ ] **Cross-link landing → Argos** : marker "(bientôt)" retiré du footer LaFusée, lien `https://argos.lafusee.com` fonctionnel.
- [ ] **Cross-link Argos → landing** : footer Argos contient retour vers `https://lafusee.com` + mention "propriété éditoriale de La Fusée".
- [ ] 7 sources de vérité synchronisées + anti-drift CI green.

### Phase candidate alternative

Extension Phase 19 Cluster D (signaux faibles & culture) — promotion `culture.tarsisBridge` STUB → MVP pourrait absorber le sub-A0 (Hunter v1 + Dossier persistence). Mais l'app Argos publique justifie probablement une phase dédiée distincte.

### Patterns architecturaux qu'Argos a déjà découverts indépendamment

Argos hors-repo a convergé vers les mêmes patterns que la doctrine LaFusée :

| Pattern Argos | Pattern LaFusée équivalent |
|---|---|
| `tool_use` natif > JSON text parsing | Phase 21 F-A `executeStructuredLLMCall` (ADR-0067) |
| Dossier-as-contract / projections derived | Manual-first parity (ADR-0060) |
| Coercion Zod entre LLM output et code typé | Phase 21 F-A coercion stricte (ADR-0063) |
| Sidecar findings (cross-pollination) | Tarsis weak signals (Seshat) |
| UID hiérarchique déterministe | (gap LaFusée — Argos peut canoniser le pattern Seshat) |

Convergence indépendante = validation forte du pattern.

### Refs externes

- Code de référence vendorisé : [`docs/external-design/argos-hunter-v1/`](../external-design/argos-hunter-v1/) + [VENDOR-NOTICE.md](../external-design/argos-hunter-v1/VENDOR-NOTICE.md) (lecture obligatoire)
  - [argos-generator.jsx](../external-design/argos-hunter-v1/argos-generator.jsx) — Hunter agent + projection registry
  - [server.mjs](../external-design/argos-hunter-v1/server.mjs) — mock Anthropic + proxy
  - [README-original.md](../external-design/argos-hunter-v1/README-original.md) — README original d'Alexandre (4 fixes + principes architecturaux)
- Archive originale : `/Users/imacmatanga1/Downloads/argos-hunter-v1.tar.gz` (locale Alexandre, source du vendoring)
- Memory NEFER : `memory/project_argos_seshat_harvester.md` (persisté 2026-05-15)
- Session de fondation : 2026-05-15 (questions architecturales tranchées : monorepo / sous-DS / auto-publish PASS / vendoring code-référence)


## Extension Telemetry — intelligence créative et concurrence (2026-10-06)

Décision : [ADR-0194](adr/0194-creative-corpus-and-competitive-intelligence.md).
Plan source et critères par lot : [plan opérationnel](plans/2026-10-06-intelligence-creative-concurrentielle.md).

Étendre Seshat/Argos, les références et KnowledgeEntry avant tout nouveau système.
Le corpus PUBLIC/BRAND conserve publications, relevés et annotations ; les recettes
restent des connaissances versionnées et les applications des essais propres à
une marque. Concurrence via BrandRef/CompetitorSnapshot, pas un autre score.
La gouvernance précède import, annotation, recette, application et publication.

Ordre opérationnel : séparation des périmètres concurrents → corpus et relevés →
annotation/ratio temporel → preuves et recettes → essai/résultat → projection
Argos explicitement revue. Les lots manuels codés doivent être recensés dans les
maps ; l'ADR consigne leur validation avant toute affirmation de livraison.
Les accès externes et la traversée Argos-studio restent dans RESIDUAL-DEBT avec
leurs déclencheurs réels, sans réinventer le fonds documentaire de SHK-0002.

### Réception 8 octobre 2026 — lecteurs de guidelines (ADR-0203)

Guidance, ARTEMIS existant : le lecteur de guidelines et le cockpit consomment
la même sélection d’identité que les rendus. Aucun modèle/Intent/service créé.
Le contrat structuré remplace la recherche heuristique de neuf titres HTML ;
la consultation documentaire réutilise le lecteur de Sources. Les références
et les propositions restent distinctes d’une charte adoptée. La réconciliation
des corpus et l’irrigation vers les publications ne sont pas closes par ce lot.

### Réception 8 octobre 2026 — compensation ciblée (ADR-0207)

Étendre PillarVersion, spine et gateway existants : delta accepté, métadonnées,
identité d’effet partagée entre historique et journal, contrôle d’accès relu sous
verrou et refus des conflits. L’action d’historique perd son writer direct ;
l’amendement conserve l’id serveur réel. Aucun nouveau modèle, Intent ou agent.
Les anciennes archives et les autres compensateurs ne sont pas reçus par ce lot.
La restauration intégrale du SI demeure au chantier C7 Shinkiro.
