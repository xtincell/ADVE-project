# ADR-0195 — Acquisition créative et analyse assistée avec revue

- **Status** : Accepted — parcours locaux vérifiés ; activation applicative reçue, intégrations production à qualifier
- **Date** : 2026-10-06
- **Phase** : extension Telemetry — acquisition, analyse assistée et projection Argos-studio
- **Depends on** : ADR-0060, ADR-0083, ADR-0100 amendée, ADR-0124, ADR-0166, ADR-0194, SHK-0002
- **Supersedes** : aucune

## Contexte

ADR-0194 fournit déjà l'unité de contenu, les relevés append-only, l'annotation
manuelle, les recettes versionnées, la revue et les essais. Les accès tiers,
l'analyse multimodale et la projection vers la bibliothèque Argos-studio restaient
à qualifier. Le mandat « Continue » puis « Ratisse large » autorise leur extension,
sans promettre qu'un service étudié possède déjà un connecteur opérationnel.

L'audit anti-doublon a des résultats positifs : le moteur
`seshat/creative-intelligence`, son manifest racine réexporté, `argos.intelligence`,
`ContentSpecimen`, `ContentMetricSnapshot`, `CreativeAnalysis`, `KnowledgeEntry`,
`PatternEvidence`, `RecipeApplication`, `SocialPost`, le LLM Gateway et les moteurs
Glory DELEGATE/HYBRID existent. Les contrats Argos-studio ne doivent pas être
reconstitués depuis le journal local `CampaignReferenceDossier`.

## Décision

### Étendre le circuit, sans nouveau silo

Conserver le gouverneur SESHAT, les primitives d'ADR-0194, les routeurs et pages
existants. Acquisition, export sourcé, analyse assistée, admission de l'annotation
et projection documentaire passent par Intents, SLO et manifest existants étendus.
Aucun nouveau modèle, Neter, routeur racine ou page. Les contrats manuels restent
utilisables sans fournisseur multimodal ou réseau tiers disponible.

Chaque source décrit séparément découverte, identifiants natifs, médias réellement
disponibles, métriques, exposition paid/organique, credentials requis, limites et
provenance. Le statut d'une capacité n'est pas le statut d'un produit concurrent.
Une API capable de trouver des publicités ne prouve pas leur performance.

### Acquisition directe et imports

- **YouTube Data API** : identifiants et observations publiques suivant son
  contrat officiel ; pas de téléchargement vidéo ou métrique privée déduit de
  la seule disponibilité de `videos.list`. Credentials et quotas réels requis.
- **Bluesky public** : profil et publications accessibles via le service public,
  sans clé lorsque l'endpoint le permet. Un reçu réseau réel est distinct d'un
  test sur fixture et ne garantit pas l'accès à tous les comptes.
- **Foreplay** : contrat OpenAPI officiel de `GET /api/discovery/ads`, réponse
  `AdListResponse` et authentification `BearerAuth`. Ces contenus sont des
  publicités PAID ; leurs dates de diffusion et leur présence dans une archive
  ne deviennent pas des vues, du ROAS ou un outlier organique.
- **Comptes propres** : raccorder `SocialPost` et les observations natives déjà
  disponibles. L'accès authentifié d'une marque n'autorise pas leur publication
  ni leur mutualisation brute.
- **Autres fournisseurs** : import d'export borné, validé et sourcé si le
  fournisseur le permet ; un tel import ne se présente pas comme un appel de
  son API. La qualification élargie indique ses liens primaires et son état réel.

Identités, périmètres PUBLIC/BRAND, provenance, dates et valeurs inconnues restent
ceux d'ADR-0194. Les collectes relançables ne remplacent pas les observations.
Paid/unknown ne sont pas admis comme performance organique par convenance.

### Analyse assistée et admission

Le Gateway reçoit une entrée visuelle bornée, avec configuration vision explicite.
Pour une vidéo admissible, ffmpeg produit des images échantillonnées ; le modèle
n'est pas présenté comme ayant vu tout le montage, entendu l'audio ni vérifié
chaque timecode. L'annotation suit le schéma strict du domaine et conserve la
méthode, le hash de l'entrée observée et les limites de l'échantillonnage.

L'analyse assistée produit un **MODEL_DRAFT**. Elle n'alimente ni recette ni
preuve admise avant une revue humaine explicite. La voie MANUAL est conservée
avec les mêmes contraintes descriptives ; aucun modèle n'est requis pour annoter
ou revoir un contenu. La revue ne transforme pas une inférence en effet causal.

Un Glory tool de collecte délègue aux capacités gouvernées existantes ; un outil
HYBRID d'analyse réutilise le moteur Glory et sa parité manuelle, sans appel modèle
ou mutation clandestine derrière un outil de lecture.

### Projection vers Argos-studio

La bibliothèque canonique reste Argos-studio (SHK-0002). La projection emploie
le contrat réel **research-dossier-v1**, validé avant envoi, pour un dossier
local PASS et revu, à partir d'un payload opérateur qualifié. Les licences,
classifications et preuves exigées ne sont pas déduites ni fabriquées par défaut.
Une licence inconnue reste un refus ou une qualification requise selon le contrat.

Le reçu de projection externe est distinct du verdict éditorial et du journal
local : demande, réponse bornée, réussite/échec et reprise sont audités sans
exposer la clé. Connexion et secrets utilisent le Vault/configuration existants.
Une indisponibilité distante ne constitue pas un succès de publication.

La publication locale existante des `CampaignReferenceDossier` sur PASS demeure
conservée ; la nouvelle projection distante et les recettes gardent leurs propres
conditions de revue. Aucun dossier privé n'acquiert des droits publics par transfert.

## Conséquences

- Les fonctions manuelles et données d'ADR-0194 restent compatibles. Les champs
  nécessaires à la méthode, la revue et au reçu s'inscrivent dans les contrats
  et objets existants ; les contrats sont décrits ci-dessous à partir du code inspecté.
- Une matrice large de capacités sert à choisir le fournisseur disponible ;
  elle ne promet pas une intégration authentifiée à tous les produits cités.
- Credentials absents, export non qualifié, média indisponible et vision non
  configurée donnent un état explicite ; aucune observation n'est inventée.
- La performance des contenus et l'attribution des essais restent associatives.
  L'acquisition automatique ne modifie pas ADVE sans décision opérateur.

### État de code inspecté — 2026-10-06

Le parcours local PostgreSQL/réseau, le navigateur et le gauntlet de
livraison sont reçus PASS. Le reçu réseau Bluesky n'est pas une preuve d'accès
authentifié à d'autres fournisseurs ou de publication de production. Version de livraison : 6.27.392.

- `src/domain/creative-sources.ts` : registre `CREATIVE_SOURCE_CAPABILITIES`
  de 16 sources (recompte 2026-10-06) ; quatre chemins de collecte
  `BLUESKY`, `YOUTUBE`, `FOREPLAY`, `CONNECTED_SOCIAL`. Les autres lignes portent
  des capacités à qualifier/exporter ou des signaux existants, pas des adaptateurs
  directs construits. Les compteurs Bluesky sont likes/réponses/republications,
  sans vues ; les relevés YouTube sont actuels, sans historique rétroactif. Vidéos
  YouTube/Foreplay VIDEO_UNCLASSIFIED par défaut : SHORT/LONG doit être déclaré,
  sans inférence de durée ni normalisation outlier d'un format inconnu.
- `source-adapters.ts` et `source-collection.ts` : outil Glory DELEGATE
  `creative-source-fetcher`, import transactionnel de 50 éléments maximum au
  format `creative-source-export-v1`, avec scope/dates validés avant écriture.
  Le bridge `CONNECTED_SOCIAL` lit les métadonnées Facebook/Instagram déjà
  synchronisées, sans importer leurs compteurs par défaut. Les Insights réels
  gardent le chemin natif d'ADR-0194. Les métriques externes sont UNKNOWN ;
  Foreplay ne produit aucun relevé de performance à partir de son archive ads.
- `assisted-analysis.ts`, `media-observations.ts`, `llm-gateway/vision.ts` :
  outil HYBRID `creative-observation-draft`, modes TEXT/MEDIA pour un specimen
  BRAND et une stratégie réelle. Configuration explicite `LLM_VISION_PROVIDER`
  (anthropic/ollama/openrouter) et `LLM_VISION_MODEL` ; aucun repli texte qui
  abandonne les images. Gateway : huit images maximum, 1 Mo par image, 4 Mo
  cumulés. JPEG/PNG ou MP4 uniquement ; téléchargement borné à 25 Mo, vidéo de
  cinq minutes maximum. ffmpeg/ffprobe nécessaires ; frames échantillonnées
  avec repères réellement émis, audio non observé. `MODEL_DRAFT` exclu par SQL
  des observations de recettes (`method: MANUAL`) ; sa revue ajoute une nouvelle
  annotation MANUAL attribuée à l'opérateur, sans modifier le brouillon.
- `watch-collection.ts` : opt-in `businessContext.creativeWatchAutomation`,
  désactivé par défaut. `argos-hunt?mode=corpus` est branché avant le contrôle
  LLM ; le scheduler réutilisé prévoit six heures. Fenêtre de 500 marques,
  deux marques et deux comptes par marque par passage, rotation selon les
  dernières tentatives, y compris différées/échouées pour éviter de bloquer une source publique. Comptes YouTube natifs UC… et Bluesky did:… seulement pour
  cette veille automatique ; résultats par compte et reports/unsupported explicites.
  Aucune exécution de cette cadence en production n'est reçue.
- `seshat/argos/studio-client.ts` : `projectToStudio`, contrat minimum local
  `research-dossier-v1` et autorité du schéma canonique distant sur les enums
  complets. Dossier PASS, revue `reviewedBy`, safety recalculée, correspondance
  exacte marque/campagne/secteur/marché et sources présentes dans le journal.
  Envoi opérateur explicite, pas d'auto-projection. Reçu distinct et hash du
  payload dans le spine. `setVerdict` est désormais gouverné par
  `SESHAT_REVIEW_REFERENCE_DOSSIER`. Publication locale PASS conservée.
- Vault : templates `youtube-data`, `foreplay`, `argos-studio`, avec test de
  connexion GET/read-only ; ce handshake n'atteste pas un POST authentifié de
  projection. Sources YouTube/Foreplay acceptent aussi les clés système
  configurées, sans masquer une clé opérateur révoquée par un repli système.
- Console existante : `source-acquisition`, `assisted-observation` et
  `studio-projection` branchés ; aucun nouveau portail. Manifest Seshat
  `creative-intelligence` 1.1.0, effets EXTERNAL_API/LLM_CALL/FILE_WRITE déclarés.

Intents ajoutés au service existant : `SESHAT_COLLECT_CREATIVE_SOURCE`,
`SESHAT_REFRESH_CREATIVE_WATCHLIST`, `SESHAT_SET_CREATIVE_WATCH_AUTOMATION`,
`SESHAT_IMPORT_CREATIVE_EXPORT`, `SESHAT_DRAFT_CREATIVE_ANALYSIS`,
`SESHAT_REVIEW_CREATIVE_DRAFT`, `SESHAT_PROJECT_ARGOS_DOSSIER`,
`SESHAT_REVIEW_REFERENCE_DOSSIER`. Les registres générés restent produits
par leurs générateurs, sans édition documentaire manuelle.

### Couverture de l'observation et reprise du brouillon

La validation refuse les timecodes non présents dans `frameTimes` effectivement
décodés ; texte et image statique n'acceptent aucune chronologie. La durée doit
correspondre au média observé. La limite audio/mouvements/transitions non établis
est ajoutée au brouillon. Une requête opérateur scopée retrouve les MODEL_DRAFT
après reload ; leur revue append conserve l'original. La safety du payload
Argos additionnel est aussi contrôlée avant projection.

### Reçu local partiel — 2026-10-06

`/workspace/scratch/acquisition-live.log` termine par PASS : deux lectures réelles
Bluesky identiques avec snapshots append-only ; isolation founder/opérateur ;
rollback atomique de l'export ; exclusion MODEL_DRAFT puis admission MANUAL par
ajout ; cron HTTP 200, une émission close OK ; extraction de cinq images réelles
d'une vidéo MP4 synthétique. Cette dernière vérifie ffmpeg local, pas une réponse
de modèle multimodal ni une observation exhaustive.

YouTube et LLM : DEFERRED_NO_KEY. Argos-studio :
DEFERRED_NO_ENDPOINT_OR_CREDENTIAL. Publication externe non testée ; Foreplay
authentifié, provider vision et scheduler de production restent sans reçu.

Suite gouvernance reçue PASS : 157 fichiers / 1547 tests ; avec sources/média,
159 fichiers / 1566 tests. Nouvelle émission `setVerdict` vérifiée, baseline Q3
argos abaissée de 2 à 1. Inventaires recomptés 2026-10-06 : 629 Intent kinds,
56 CORE / 152 registry Glory tools, 94 séquences dont 91 DRAFT, 28 frameworks.
Aucune table, service racine ou page supplémentaire.

### Reçu de livraison locale — 2026-10-06

- Suite complète : **368 fichiers / 3909 tests PASS**, typecheck sans erreur,
  lint et lint gouvernance sans erreur (25 warnings existants), cycles zéro,
  Prisma validé et deux builds production locaux PASS. Le verrou d'exclusion
  du draft a été réinjecté : RED (1 failed / 4 passed), puis restauré GREEN
  (5 passed). Vision (bytes/provider pin/aucun repli), autorité du delegate
  (identité client ignorée/scope refusé), contrat Argos et reprise du draft
  après reload vérifiés ; les cinq tests Argos utilisent des fixtures, sans
  POST distant réel.
- Navigateur HTTPS : Console Argos ADMIN, Credentials ADMIN, Argos public et
  rapport Social FOUNDER HTTP 200, aucun `pageerror` ni réponse >=500.
  Les formulaires réels ont collecté Bluesky LIVE, demandé une annotation texte
  DEFERRED et une projection Argos DEFERRED ; liste de veille du propriétaire
  lue. DOM 129–588 ms, titres 186–790 ms sur ces quatre parcours locaux.
- Cron HTTPS réel : HTTP 200/LIVE et anonymous 401 ; émission persistée close OK
  `c5795c99a96320ea20241febc`. Scheduler corpus six heures opt-in, timeout ciblé
  240 s face à un batch borné à environ 200 s ; autres modes conservés à 120 s.
  Ce passage local ne prouve pas l'activation ou la cadence en production.
- Stress FULL, fixtures opérateur/stratégie qualifiées : **281 pages, zéro
  erreur/avertissement**, trois queries tRPC, sept kinds Ptah et state machine
  des assets traversés. Sans clés externes, les voies différées ont été reçues.
  La campagne complète ferme la dette du précédent stress arrêté par OOM.

Reçus ciblés complémentaires : runner `Dockerfile` équipé du paquet ffmpeg
(incluant ffprobe). Sur la même base `node:22-bookworm-slim` avec paquet installé,
UID 1000, `extractMediaObservations` réel donne cinq frames aux timestamps
[0, 1, 2, 3, 3.8], sans audio (`acquisition-container-media.log`). Ce test ne
constitue ni un build Docker complet ni un déploiement. Le formulaire manuel
Console expose secteur, marché et sources HTTPS ; un ADMIN réel a soumis
`createManual` HTTP 200, trois champs conservés, zéro erreur navigateur/réponse
>=500 (`acquisition-manual-browser.log`). DOM 1911 ms, titre 2217 ms sur ce
parcours dev ciblé. Après ces diffs : typecheck, lint/gouvernance et cycles sans
erreur, suite gouvernance 157 fichiers / 1547 tests PASS. Les reçus précédents
restent distincts de ce contrôle final ciblé.

Reçus locaux : `/workspace/scratch/acquisition-browser.log`,
`acquisition-cron-http.log`, `acquisition-all-tests-final.log`,
`acquisition-stress-full.log` et rapport
`logs/stress-test-2026-10-06T09-36-29.json` (artefacts ignorés, pas de staging).
Parcours reproductibles : `scripts/verify-creative-acquisition.ts` et
`scripts/stress-test.ts` avec PostgreSQL, serveur HTTPS et fixtures qualifiées.

Accepted porte sur la conception et les parcours locaux. Contrôles CI suivis dans la PR #965 ; YouTube/Foreplay authentifiés, réponse vision, runtime vidéo cible,
activation scheduler de production, POST Argos réel et rétention durable des
médias restent à recevoir. Aucun secret, droit d'usage, succès distant ou
publication de production n'est inféré. Plans de reprise dans RESIDUAL-DEBT et
le [plan existant](../plans/2026-10-06-intelligence-creative-concurrentielle.md).


### Reprise opérationnelle — observations initiales avant bascule, 2026-10-06

Main `84fa59c` porte v6.27.392. Les sondes `/api/version` ont répondu HTTP 200
avec v6.27.390 sur `powerupgraders.com` et `lafuseev6.powerupgraders.com` : aucune
bascule de cette extension n'est encore reçue. La voie officielle
`build-image.yml` est lancée sur main avec `notify_coolify=true`, run
[37509162119](https://github.com/xtincell/ADVE-project/actions/runs/37509162119).
Dispatch et exécution en cours ne constituent pas un reçu de déploiement.
L'image complète, UID 1001 et le helper vidéo restent à vérifier ; le reçu
antérieur même base Node/UID 1000 reste une preuve ciblée distincte.

Aucun credential provider/vision ni endpoint Argos prêt n'est reçu dans cet
environnement cloud. Deux défauts préexistants sont bornés dans RESIDUAL-DEBT :
voie legacy `deploy.yml` appelant un script absent, et alertes `npm ci` à trier
par exposition réelle. Ils ne sont pas réparés par cette documentation.


### Addendum — image complète et activation applicative reçues, 2026-10-06

Le run [37509162119](https://github.com/xtincell/ADVE-project/actions/runs/37509162119)
est SUCCESS, source `84fa59c` : build Docker complet, boot/migrations/login HTTP
200, push GHCR et notification Coolify acceptée (demande
`z104gthv4hhqbtay2o4xagxr`). Les deux domaines `powerupgraders.com` et
`lafuseev6.powerupgraders.com` servent `/api/version` HTTP 200 v6.27.392 ; ce reçu
remplace l'état initial v6.27.390 et ferme l'attente d'activation applicative.

Image exacte : `ghcr.io/xtincell/adve-project:sha-84fa59cfd32120783ae00a59b4110633734dcb64`,
digest `sha256:ed27362d12d2cc70eea9b51a639eb7ef097e84554f0444aad0afa3420ae040e8`.
Le helper source bundlé exécuté dans cette image complète, UID 1001, réseau
coupé et root readonly, donne cinq frames [0, 1, 2, 3, 3.8], audio non observé.
Ce reçu ferme la vérification d'image complète ; il ne prouve pas une extraction
sur média de marque dans le processus VPS déployé ni une réponse vision.

Sondes production : RPC `publicRecipes` HTTP 200, tableau vide (zéro recette
publiée), `/argos` HTML HTTP 200/titre présent ; cron corpus et sourceCapabilities
401 anonymes. Aucun test protégé/admin ni provider authentifié en production.
Le navigateur a échoué sur le certificat CA Chromium/proxy : hydratation, DOM
et absence de pageerror ne sont pas réputés vérifiés. Les preuves navigateur
locales demeurent distinctes. `PROD_URL` GitHub absent et écriture refusée 403
par l'intégration ; sondes manuelles reçues, configuration non modifiée.

Credentials provider/vision, endpoint Argos, cadence opt-in réellement activée,
rétention durable et traversée métier protégée restent à qualifier. Aucun POST
Argos distant ni recette publique ne sont inférés du déploiement de l'application.
