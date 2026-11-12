# Ptah — réception courante de l’admission des résultats

Date : 2026-10-08. Code livré et dernière production reçue : **6.27.425**.
Ce document décrit le correctif courant ; les ADR historiques restent inchangés.

## Frontière réparée

Un résultat de fournisseur n’était pas un actif admis : COMPLETED précédait les
versions, l’admission au coffre pouvait échouer sans faire échouer la tâche et
une reprise terminale ne réparait pas ce manque.

Le correctif étend les primitives existantes, sans modèle, service ni Intent ajouté :

1. Le résultat est validé puis checkpointé dans GenerativeTask.resultUrls et
   realisedCostUsd. Une liste vide, des URLs dupliquées ou un montant invalide
   sont refusés. Le format image embarquée OpenAI existant reste admis ; cela
   ne constitue pas une vérification des octets.
2. L’admission relit la portée marque/équipe/campagne/brief/source et les états
   interdits. Le verrou partagé du coffre et celui de la tâche sérialisent les
   callbacks ; les ambiguïtés préexistantes sont refusées au lieu d’être devinées.
3. AssetVersion, BrandAsset, reçu de coût et COMPLETED sont validés dans une
   seule transaction. L’échec d’un second fichier annule aussi le premier ; le
   checkpoint reste disponible pour reprendre sans recontacter le fournisseur.
4. La reprise retrouve les mêmes ids et complète le manque compatible d’une
   ancienne tâche terminale. Elle préserve l’état courant d’un actif déjà admis,
   y compris ARCHIVED ; elle ne constitue pas une publication publique.

Webhook authentifié et réconciliation synchrone passent par l’Intent existant
PTAH_RECONCILE_TASK. Le commandant utilise l’identifiant réel de l’émission parent
pour les futures forges ; aucune émission historique n’est reconstruite.

## Preuves reçues et non reçues

| Réception | État au 2026-10-08 | Portée |
|---|---|---|
| Contre-exemples initiaux | Dix tests rouges avant correction | Reproduction locale de la frontière défaillante |
| PostgreSQL isolé | 24 tests verts | Admission, concurrence, reprise, rollback, archives, scope, coût et callback gouverné |
| Suites locales complètes | 4 144 unitaires / 219 PostgreSQL / 1 610 gouvernance verts | Les 24 cas d’admission sont inclus dans les 219 PostgreSQL |
| Cycles et lint | Zéro cycle, zéro erreur lint / 24 warnings | Réception locale ; ne vaut pas livraison |
| HTTP sur serveur local | 400 paramètres manquants / 403 secret erroné / 400 JSON invalide / 500 sur panne coffre injectée | Démarrage et refus reçus après le correctif instrumentation 424 |
| HTTP local après arrêt/reprise | Retry 200 puis replay 200, corps identiques et mêmes ids | Serveur coupé puis nouveau processus ; checkpoint synthétique déjà persisté, aucun fournisseur contacté |
| Stress isolé sans credentials | Portée partielle | HTTP non atteignable : pages/tRPC non reçus ; forges différées, machine d’états bornée ; pas de stress E2E entier |
| CI finale 37850685120 | Verte, 4 144 unitaires / 219 PostgreSQL | Source 2a296152 ; les 24 cas d’admission sont inclus |
| Image/déploiement/runtime 425 | Reçus, index exact rapproché | Boot sur base neuve/login 200/lecture d’un PDF fixture de deux pages, puis déploiement terminé à 22:14:28 UTC |
| Lectures/refus de production | Version 425, GET webhook 200, POST sans paramètres 400/faux secret 403 | Aucun callback de forge réel ni fixture de production créé |
| Corpus/édition SPAWT de production | Inchangés avant/après | Aucune tâche/version de forge présente ; export public sur trois origines, ETag 304 et export privé 401 |
| Lecture native Connexions | Session existante rechargée, version 425 et « Version 1 en ligne » après hydratation | Liens relus, note 425 vue puis fermée ; aucun formulaire/publication soumis, métriques réseau non capturées |
| Lecture native séparée de la vitrine | Six questions visibles, aucun décompte expiré | Rechargement enregistré avant le déploiement La Fusée ; aucune réception du moteur d’app ni d’un geste de forge |
| Fournisseur réel, médias et facture | Non reçus par ce lot | Aucune forge réelle SPAWT ou Noël démontrée |

Suite locale : `tests/integration/ptah-admission.postgres.test.ts`, PostgreSQL
isolé avec fournisseurs synthétiques et réseau externe interdit dans les cas
testés. Ces preuves ne démontrent pas l’exécution d’un prestataire ni l’intégralité
du cycle d’un livrable métier.

La panne tardive injectée dans le coffre laisse IN_PROGRESS, le checkpoint et
l’erreur persistés, zéro version/actif/coût et une émission FAILED. Après arrêt
du serveur puis lancement d’un nouveau processus, retry et replay rendent le
même corps : COMPLETED, une version/un actif/un coût, ids stables. La chaîne
FAILED→OK→OK est vérifiée par ses hashes. Le résultat Magnific est une fixture
déjà checkpointée : zéro appel au fournisseur, aucune forge réelle. Fixture
nettoyée à zéro et serveur arrêté après recette.

Reçus privés relus : `preuves-admission-forge-424/http-restart-receipt.json`,
`runtime-failed.json` et `runtime-resumed.json`. Le nom historique du dossier
de preuve reste 424 ; ce reçu porte le correctif Ptah 425.

## Livraison de code en production

Source exacte : `2a2961522b20c41a98f385ea47fe278235256cf5`. CI `37850685120` et
image `37850690058` reçues ; l’image a booté sur une base neuve, servi le login
200 et relu un PDF de deux pages, avec ses deux textes sources, avant publication.
Ce smoke exerce PDFParse sur une fixture copiée dans l’image ; il ne reçoit
pas la production d’un export PDF.

- Index publié et runtime :
  `sha256:73b98b427ccb4ed0d39e9e4349cd5b27d14c46cee3e59be6a7883e6f0b977bca`.
- Manifest publié :
  `sha256:563d88435d831ec7ead23ae77e23fc7e545b711a906f026eb0e676709ad8133a`.
- Déploiement unique `a5d0qfsttw95xja1wjvncn9d` terminé à **22:14:28 UTC** le
  8 octobre ; conteneur running sous nextjs, version 6.27.425, volume privé
  conservé et monté en lecture/écriture.

La production a été reçue par lectures et refus, sans création de fixture :
version, GET webhook, POST sans paramètres et faux secret ; édition publique
SPAWT inchangée sur trois origines avec ETag 304, export Markdown privé refusé
401. Corpus privé conservé. GenerativeTask et AssetVersion restent à zéro avant
et après : cette livraison ne démontre ni réparation d’une forge réelle existante
ni fournisseur, média, facture ou cycle métier reçu. La reprise après redémarrage
décrite plus haut reste exclusivement une preuve locale sur checkpoint synthétique.

Reçus privés dans `preuves-admission-forge-424/` : `reception.json`, `runtime.json`,
`image-digest.json`, `deploiement.json`, `production-http.json`,
`deploiement-corpus-apres.json`, `forge-production-after.json` et `ci-test-counts.json`.
La mise à jour documentaire garde l’équivalence applicative avec l’image de cette
source ; elle ne demande pas de redéploiement.

Lectures natives complémentaires : `connections-native.json` reçoit Connexions
authentifiée après rechargement/hydratation, version 425, statut « Version 1 en
ligne », liens exacts et fermeture de la note de version, sans soumission.
`spawt-native.json` et `spawt-live.png` reçoivent séparément la vitrine rechargée,
ses six questions et l’absence de décompte expiré ; cette lecture précède le
déploiement La Fusée. Aucune métrique réseau native capturée, aucun geste de
forge ou cycle métier reçu par ces lectures.

## Limites et reprise

- Un checkpoint d’URL survit à l’interruption en base ; il ne conserve pas à lui
  seul les octets d’un média temporaire. Le stockage, la relecture après expiration
  et la propagation ultérieure d’AssetVersion.cdnUrl au BrandAsset sont à recevoir.
  Constat statique voisin : le descriptif MCP ptah_reconcile_task promet encore
  download CDN/ASSET_FORGED, contrairement au contrat reçu. À réaligner et exercer
  par tools/list puis appel borné dans la prochaine passe upstream/MCP, sans
  modifier le runtime de cette livraison documentaire.
- Canva et Figma renvoient encore une liste vide depuis leurs adaptateurs. Le
  correctif refuse cette réponse ; il ne termine pas leur raccord fournisseur.
- Le montant déclaré est enregistré une seule fois. Plusieurs adaptateurs
  déclarent zéro sans facture : ce chiffre ne prouve ni gratuité ni dépense réelle.
- La portée des références présentes est contrôlée ; materializeBrief ne propage
  pas encore toutes les références business upstream jusqu’à GenerativeTask.
  Le cas positif conserve sourceBrandAssetId en metadata et campaignId/briefId/
  sourceIntentId. Il ne propage pas les reçus documentaires sourceDataSourceId/
  sourceContentHash jusqu’au matériau ; l’invalidation après correction de la
  source/staleAt n’est pas reçue. Ni provenance complète ni source courante
  garantie. Constat statique : regenerateFadingAsset filtre la version par marque
  et opérateur, puis réutilise sa tâche historique incluse sans vérifier leur
  concordance métier ; la FK ne suffit pas. Le plan upstream doit éprouver une
  version locale pointant vers une tâche étrangère, refuser avant fournisseur
  et conserver campagne/brief/source. Déclencheur d’irrigation désormais atteint
  par la livraison 425 ; ces deux constats statiques ne sont pas des reproductions E2E.
- Une émission peut encore rester PENDING si sa fermeture échoue après le commit
  métier. Le checkpoint et l’admission atomique ne ferment pas cette dette commune
  du spine.

Plans, efforts et déclencheurs sont dans
[RESIDUAL-DEBT.md](RESIDUAL-DEBT.md#ptah--limites-après-admission-atomique-locale-425-2026-10-08).
Les sept chantiers Shinkiro et les parcours réels SPAWT/Noël restent ouverts ;
aucune maturité globale n’est déduite de cette réparation.
