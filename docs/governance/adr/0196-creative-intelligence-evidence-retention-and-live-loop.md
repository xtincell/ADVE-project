# ADR-0196 — Conservation des preuves et boucle créative mesurée

- **Status** : Accepted — conception et parcours vérifiés localement ; CI et déploiement de cette extension à venir
- **Date** : 2026-10-06
- **Phase** : extension Telemetry — conservation, observation audiovisuelle et comparaison
- **Depends on** : ADR-0060, ADR-0100 amendée, ADR-0108, ADR-0166, ADR-0186, ADR-0194, ADR-0195, SHK-0002
- **Supersedes** : aucune

## Contexte

Le mandat de continuation vise les manques du plan d'intelligence créative et
concurrentielle, au-delà de la V1 manuelle et de l'acquisition d'ADR-0195.
L'audit est effectué sur main `c7123ca`, v6.27.394, branche
`codex/creative-intelligence-completion`. Les preuves locales et d'activation
applicative précédentes ne prouvent pas les nouveaux traitements ni les accès
externes : credentials vision/fournisseurs et endpoint Argos restent absents.

L'anti-doublon identifie des points d'extension réels : corpus et snapshots,
`CreativeAnalysis`, `PatternEvidence`, `RecipeApplication`, `KnowledgeEntry`,
`SocialPost`, pipeline publication/Insights, Vault, Gateway embeddings/vision,
Glory, context-store et knowledge-gateway. `advertis-scorer/semantic.ts` calcule
un score de pilier ; ce module n'est pas une recherche de voisins créatifs.
Il n'y a pas de raison de créer un Neter, un score de marque ou une bibliothèque
éditoriale parallèle à Argos-studio.

### Écarts constatés avant implémentation — état initial de l'audit

- `media-observations.ts` traite des médias HTTPS bornés, extrait des frames
  et supprime les fichiers temporaires ; pas d'archive durable ou de purge
  d'archive. Audio explicitement non observé, aucune transcription.
- `creative-sources.ts` admet quatre chemins de collecte : Bluesky, YouTube,
  Foreplay et métadonnées propres FB/IG. La matrice des autres fournisseurs est
  une qualification, pas une série de connecteurs exécutés.
- `normalizedPerformance` utilise `prior-account-median-age-v1`, avec exclusions
  temporelles et abstention ; aucun modèle conditionnel entraîné/validé hors
  comptes et temps. `evaluatePattern` rapproche hook/narrative/visual exacts,
  sans voisinage sémantique, dispersion, intervalle ou correction de multiplicité.
- La diffusion existe déjà comme deux fenêtres hebdomadaires et part dans le
  corpus annoté. Manquent composition/collecte/couverture détaillées, nouveaux
  adoptants, historique étendu et relations de propagation documentées.
- `RecipeApplication` gèle une recette et accepte action/asset ; sa résolution
  reçoit un specimen et un snapshot choisis, sans boucle automatique publication
  puis collecte, ni contrôle d'identité action/asset→publication dans ce lecteur.
- La veille est propre à la marque et les snapshots concurrentiels sont scopés
  secteur/pays/provenance ; leur lecteur ne filtre pas encore sur les acteurs
  ratifiés de la watchlist. Pas de comparaison créative par acteur servie ici.

Deux points bornés doivent être traités dans cette extension : le raccord
`captureNativeInsights` classe toute vidéo comme SHORT_VIDEO à partir de
`mediaType` seul, et le résultat d'essai n'est pas encore lié à sa publication
par une identité vérifiée. Les résoudre sans inventer de métadonnées ou
réinterpréter silencieusement les preuves historiques.

## Décision

### Étendre les contrats existants

Les choix de schéma, stockage, algorithmes, Intents, providers et limites
retenus sont consignés dans les états de code et reçus ci-dessous. Les étapes
intermédiaires gardent leur statut historique ; l’état courant est Accepted localement. Les étapes manuelles et les méthodes reçues restent utilisables. L'absence
d'accès externe donne un état explicite, jamais une preuve simulée de connexion.

### Conserver les médias sous un périmètre et des droits explicites

Prévoir stockage durable chiffré, identité de contenu par hash, droits/source,
propriétaire PUBLIC/BRAND, durée et motif de rétention. Lecture et déchiffrement
respectent le scope ; une URL source publique ne vaut pas licence d'archive ou de
republication. La purge efface les bytes et qualifie les dérivés conservés,
preuves/recettes devenues indisponibles et reprises. La réussite de suppression
physique ne doit pas être confondue avec la seule écriture d'un état en base.

### Qualifier les sources et l'observation audiovisuelle

Ajouter seulement des adaptateurs aux contrats officiels inspectés, identités
natives et permissions compatibles. Les comptes propres, comptes concurrents,
bibliothèques publicitaires et exports conservent leurs capacités distinctes.
Médias, métriques, audio, droits et paid inconnus restent inconnus. Formats vidéo
non établis s'abstiennent ; durée seule et présence d'une vidéo ne prouvent pas Shorts.

Un parcours audiovisuel indique les frames/segments réellement observés, la
transcription avec timestamps et méthode, l'audio disponible ou absent, coûts,
bornes et erreurs. L'extraction audio ne vaut pas transcription. Un provider non
configuré peut différer cette étape ; manuel et preuve fournie restent possibles.
L'observation de montage/mouvement requiert une couverture réelle distincte de
quelques images. MODEL_DRAFT reste exclu avant revue MANUAL append-only.

### Comparer sans fuite et rapprocher sans confondre

Le modèle attendu conditionnel conserve features réellement disponibles,
version, corpus et dates d'entraînement, exclusions, diagnostic hors comptes et
hors temps. Audience actuelle n'est pas audience à publication ; paid inconnu
n'est pas neutralisé par magie. Référentiel insuffisant ou validation absente
conduit à l'abstention ou à la méthode V1 explicitement nommée.

Le voisinage sémantique réutilise le Gateway existant et sépare sujet/mécanique.
Méthode, modèle, dimensions, distance et preuves sont conservés ; un repli lexical
est nommé comme tel. Les voisins ne deviennent ni recettes identiques ni preuves
de performance par seule proximité. Comptes indépendants, contre-exemples,
incertitude et contrôle des nombreuses combinaisons restent visibles.

### Suivre l'adoption et la boucle d'essai réelle

La diffusion rapporte corpus, fenêtres, éligibilité, sélection, fraîcheur et
composition. Première observation n'est pas origine ; adoption par plusieurs
marchés n'établit pas migration causale ; présence faible n'est pas saturation
faible du marché. La comparaison concurrentielle rapporte les acteurs ratifiés
et dénominateurs mesurés, sans globalisation des études privées.

Raccorder recette gelée→direction/brief→action/asset/version→publication native
identifiée→specimen→snapshot→résultat, avec objectif et fenêtre déclarés avant
publication. Identités/scope sont vérifiés ; un contenu arbitraire de la même
marque ne résout pas l'essai. Les tâches bornées, reprises et défauts de mesure
restent observables. Tout amendement ADVE demeure une décision gouvernée.

## Conséquences

Aucun nouveau score de marque ni causalité revendiquée. Les décisions techniques
et validations à venir devront distinguer : capacité codée, contrat testé sur
fixture, parcours local réel, image complète, activation applicative et reçu
métier externe authentifié. L'activation v6.27.392 ne valide pas cette extension.

Critères de réception : archive chiffrée/scopée et purge physique ; sources
qualifiées sans compteurs fabriqués ; audio/transcription et couverture honnêtes ;
refus des MODEL_DRAFT ; comparaisons sans futur ou mélange des comptes de
validation ; voisinage explicable ; diffusion bornée au corpus ; essai rattaché
à sa publication et mesure réelle ou état non résolu. Les premiers tests locaux de cette
extension sont reçus (voir réception finale ci-dessous). Accepted porte sur
la conception et les parcours locaux, avec limites externes conservées au ship.

Le [plan existant](../plans/2026-10-06-intelligence-creative-concurrentielle.md)
conserve la matrice des écarts auditée et les étapes de clôture proposées.


### Décisions techniques et code inspecté en cours — 2026-10-06

Typecheck reçu PASS, neuf fichiers/71 tests créatifs PASS et parcours réel
PostgreSQL/tRPC `verify-creative-intelligence.ts` PASS avec publicationBinding.
Les validations complémentaires restent attendues ; aucun reçu live des nouveaux
fournisseurs, provider audiovisuel ou Argos externe. Les capacités suivantes
sont des contrats inspectés, sans réception externe inférée.

- **Archive** : `ContentSpecimen.mediaArchive` et `mediaRetentionUntil`, payload
  `creative-media-archive-v1`. AES-256-GCM avec AAD objectKey, clé configurée et
  empreinte keyId et backendId figé (root volume ou templates BLOB) ; volume privé ou templates BLOB HTTP PUT/GET/DELETE requis.
  Droits OWNED/LICENSED/PUBLIC_DOMAIN attestés par URL/note ; échéance future
  bornée à 366 jours avant nouvelle revue. Reçu PENDING avant IO, écriture et
  relecture/hash avant STORED ; suppression avant PURGED. Cron d'échéance et
  nettoyage des orphelins volume. Suppression HTTP suivie d'un GET confirmant
  404/410 avant PURGED ; changement de backend refusé/différé, pas de suppression
  prétendue sur un nouvel emplacement. Reprises d'erreur encore à recevoir ;
  archives HTTP et volume sont distinctes.
- **Audiovisuel** : mode AUDIOVISUAL distinct du mode frames existant. Gateway
  vidéo OpenRouter avec configuration explicite `LLM_VIDEO_PROVIDER` et
  `LLM_VIDEO_MODEL` google/gemini ; MP4 maximum 20 Mo/cinq minutes, piste audio
  détectée par ffprobe. Vidéo native transmise, réponse stricte avec scènes et
  transcript, puis MODEL_DRAFT et revue MANUAL append-only. Une piste audio
  détectée n'est pas un reçu de compréhension/transcription du provider. Le mode
  frames conserve audio non observé et timestamps limités aux frames décodées.
- **Sources** : adaptateurs supplémentaires Meta Ad Library, Instagram Business
  Discovery, TikTok Research/Commercial, Reddit, X, LinkedIn, Brandwatch, RSS et
  dataset Apify au contrat acquiredContent. Permissions, identités, versions API
  et capacités text/media/metrics restent séparées. BuzzSumo et Exploding Topics
  ne sont pas présentés comme directs faute de contrat qualifié dans ce lot.
  Audit documentaire signalé HTTP 200 sauf Reddit HTTP 403 ; ces statuts ne
  prouvent aucun accès API authentifié. Tests des contrats encore attendus.
- **Comparaison** : `conditional-log-ridge-v1` avec médiane antérieure du compte,
  âge, calendrier et topic revu. Compte cible exclu ; entraînement et validation
  disjoints par comptes et temps, preprocessing entraînement seul. Minimum
  60 lignes comparables/huit comptes, contrôles de fit et comparaison MAE log
  au baseline ; intervalle empirique, sans causalité ni garantie de couverture
  future. Admission uniquement si MAE modèle < MAE baseline × 0,98 ; égalité
  ou gain insuffisant s'abstiennent. Évaluation réseau/données réelles à recevoir.
- **Voisins** : embeddings sur `BrandContextNode` et `MarketContextNode`
  existants (KnowledgeEntry conserve la recette) via Gateway et Glory
  DELEGATE `creative-pattern-indexer`, descriptions de recettes revues ; même
  provider/modèle/dimensions, mécanismes compatibles, cosine et seuil 0,75.
  Aucun transfert automatique de preuves, fusion ou efficacité supposée.
- **Diffusion** : trajectoire de huit semaines, fenêtres et comptes communs
  stables avant états RISING/DECLINING/PEAK_OBSERVED/STABLE. Chronologie des
  imports/observations collectées ; aucune origine ou migration causale déduite.
  Dénominateurs observed/annotated séparés, share dans le corpus annoté et
  annotationCoverage explicite ; états soumis à couverture ≥60 % et comptes
  stables. Date d'import n'est pas date d'origine culturelle.
- **Essais** : `RecipeApplication.publicationBinding` confirmé explicitement,
  immuable, identité native/source, action/asset/version et attestation. Résolution
  refusant un autre specimen ou URL. Une liaison déclarée n'est pas une preuve
  de diffusion par Anubis : traversée publication/mesure réelle encore à recevoir.
- **Corrections inspectées** : vidéo native FB/IG maintenant VIDEO_UNCLASSIFIED,
  liaison de résultat imposée, champ `CompetitorSnapshot.brandRefId` et migration
  additive présents. Vérifications migration/ownership/reprise encore attendues.

### Réserves d'audit corrigées et réception partielle

Les quatre réserves initiales sont corrigées dans le code relu : backendId dans
receipt et vérification lors de lecture/retrait ; DELETE HTTP puis GET 404/410
obligatoire ; gain du modèle strictement supérieur à 2 % sur MAE log ; observed,
annotated et annotationCoverage séparés, couverture minimale avant état de
trajectoire. Ce constat de code n'invente pas un reçu de stockage distant.

Le parcours PostgreSQL/tRPC gouverné vérifie désormais publicationBinding. Les
71 tests créatifs et le typecheck sont reçus, sans suite globale ni navigateur
ou production authentifiée déduits. Watch multi-provider et verrou de concurrence sont maintenant codés et
le refus ALREADY_RUNNING est reçu dans le parcours local ; détails ci-dessous. ADR reste Proposed. Credentials absents, live fournisseurs et
projection Argos externe demeurent non validés.


### Reçu runtime étendu et état courant — v6.27.396 en préparation

Main v6.27.395 `fb970d0` intégré, code de l'extension en préparation v6.27.396.
ADR reste Proposed jusqu'aux vérifications finales ; aucune activation de cette
extension en production n'est reçue.

`/workspace/scratch/completion-full-runtime.log` termine PASS : PostgreSQL réel,
tRPC gouverné, scopes marque/concurrents, snapshots immuables, revue, binding
publication et résultat immuable. Un média réel NASA a été archivé AES, relu
avec hash identique ; expiration bloque la lecture ; cron `mode=retention`
HTTP 200 a supprimé le fichier. Les droits et la date sont explicitement fournis
au parcours ; ce test ne confère pas de droits généraux aux médias collectés.
Voisins testés avec vecteurs **synthétiques**, index sans clé DEFERRED ; modèle
conditionnel et trajectoire vérifient l'abstention. Aucun embedding ou réponse
AV de fournisseur réel n'est inféré. Lease watch concurrente ALREADY_RUNNING reçue.

Veille : `accounts.collection{provider,account}` explicite étend les sources,
fallback natif YouTube UC…/Bluesky did:… conservé ; lock transaction PostgreSQL
partagé par lancement manuel et cron. Registre recompté 2026-10-06 : 14 chemins
de collecte, dont 13 DIRECT et le bridge CONNECTED_SOCIAL. BuzzSumo reste export
qualifié, Exploding Topics signaux seulement ; disponibilité API/authentification
ne découlent pas du code d'adaptateur.

Rétention : `mode=retention` séparé, toutes les quinze minutes dans GitHub et
ops-daemon, budget nominal 60 s pour les retraits ; rotation des orphelins volume
par lots de 50. Les objets HTTP après suppression du propriétaire nécessitent
un lifecycle/inventaire externe qualifié : aucune énumération distante n'est
prétendue. Index embeddings soumis au budget, réserve SLO 0,05 $ inscrite comme
**estimée** ; AV conserve le coût déclaré par provider ou provision estimée,
sans facturation exacte fabriquée. Tests complets et UI restent en cours.


### Réception suite et navigateur — locale, build/stress encore attendus

Suite finale `vitest run --maxWorkers=2` : **370 fichiers/3938 tests PASS**
(`completion-full-suite-final.log`). Gouvernance séparée : 158 fichiers/1551 tests
PASS ; typecheck zéro erreur ; lint/gouvernance zéro erreur et 25 warnings
préexistants ; audit zéro erreur/42 warnings ; cycles zéro, Prisma valid.
Contrats LLM stricts 78/78 et 28/28, sortie gardée. Verrou HARD de vocabulaire
élargi : injection Seshat RED (un échec), restauration GREEN (cinq tests).

`completion-browser-verified.log` : quatre surfaces locales ADMIN/FOUNDER/public
HTTP 200, zéro pageerror/réponse >=500. Console DOM/titre 651/1184 ms, Credentials
8047/8396 ms (compilation dev), Argos 1009/1110 ms, rapport Social FOUNDER
738/2132 ms. Collecte formulaire Bluesky LIVE, texte/audiovisuel/Argos DEFERRED
honnêtes ; contrôles de rétention affichés et comparaison propriétaire en
abstention. Ces timings locaux ne sont pas des mesures de production.

`completion-acquisition-rss-live.log` et `verify-creative-acquisition.ts` reçus
PASS : Bluesky et flux RSS NASA réels, watch RSS explicite puis cron LIVE,
MP4 synthétiques silencieux et avec piste audio testés en mode natif. Ce dernier
reçu établit présence/absence de piste et transport préparé, pas transcription ou
compréhension par un provider AV. Credentials YouTube/LLM et endpoint Argos restent
absents ; publication distante non testée. Build production et stress complets
encore en cours : ADR demeure Proposed, sans annonce de livraison exhaustive.


### Réception finale locale — Accepted, 2026-10-06

`npm run build` PASS (`completion-production-build.log`) : compilation,
typecheck et génération des routes. Stress **FULL authentifié** PASS,
`completion-stress-authenticated.log` et rapport ignoré
`logs/stress-test-2026-10-06T19-30-40.json` : 281 pages, trois queries tRPC,
sept kinds de forge et state machine, zéro finding/erreur/avertissement.
La fixture ADMIN a été vérifiée avant crawl par `/api/auth/session` et Console
200 sans redirection. Le premier stress 19-28-38, susceptible d'avoir suivi des
redirections login, est exclu des preuves de réception.

Le serveur de build production local utilise des cookies Secure ; la session de
fixture a été préparée avec les mêmes claims et le salt Secure, puis transmise
localement sans en exposer le jeton. Ce contrôle d'authentification ne modifie
pas l'auth du produit. La tentative navigateur sur production locale HTTP
redirige vers login : elle n'est pas un PASS navigateur du build production.
Les quatre surfaces dev précédemment reçues restent la preuve navigateur locale.

Suite 370 fichiers/3938 tests, gouvernance 158/1551, typecheck/lint/cycles/Prisma
et guards reçus comme ci-dessus ; warnings préexistants conservés. ADR-0196 est
Accepted pour ce périmètre local. CI et déploiement de v6.27.396 encore à venir,
sans livraison externe proclamée. AV/embeddings réels, providers authentifiés,
Argos distant, corpus calibré et exploitation du stockage/scheduler restent à
recevoir selon les plans de RESIDUAL-DEBT.

Mise en service et conditions d'accès :
[runbook d’exploitation](../../deploy/CREATIVE-INTELLIGENCE.md). Il décrit les
sources, droits et volume privé/BLOB, cycle de vie distant, configuration AV,
index et essais. Reproduction : `scripts/verify-creative-intelligence.ts`,
`scripts/verify-creative-acquisition.ts` et `scripts/stress-test.ts` sur serveur
et PostgreSQL qualifiés ; logs/fixtures ignorés ne sont pas livrés comme données.
