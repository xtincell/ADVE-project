# Ptah — réception courante de l’admission des résultats

Date : 2026-10-08. Candidat : **6.27.425**. Dernière production reçue : **6.27.423**.
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
| HTTP sur serveur réel | 400 paramètres manquants / 403 secret erroné / 400 JSON invalide / 500 sur panne coffre injectée | Démarrage et refus reçus après le correctif instrumentation 424 |
| HTTP après arrêt/reprise | Retry 200 puis replay 200, corps identiques et mêmes ids | Serveur coupé puis nouveau processus ; checkpoint synthétique déjà persisté, aucun fournisseur contacté |
| Stress isolé sans credentials | Portée partielle | HTTP non atteignable : pages/tRPC non reçus ; forges différées, machine d’états bornée ; pas de stress E2E entier |
| Build/image/déploiement/runtime 425 | À recevoir | Production reçue encore 423 |
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
de preuve reste 424 ; ce reçu porte le candidat Ptah 425. Aucune valeur de secret
ni donnée privée de marque n’est recopiée ici.

## Limites et reprise

- Un checkpoint d’URL survit à l’interruption en base ; il ne conserve pas à lui
  seul les octets d’un média temporaire. Le stockage, la relecture après expiration
  et la propagation ultérieure d’AssetVersion.cdnUrl au BrandAsset sont à recevoir.
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
  garantie : reprise du chantier d’irrigation après livraison 425.
- Une émission peut encore rester PENDING si sa fermeture échoue après le commit
  métier. Le checkpoint et l’admission atomique ne ferment pas cette dette commune
  du spine.

Plans, efforts et déclencheurs sont dans
[RESIDUAL-DEBT.md](RESIDUAL-DEBT.md#ptah--limites-après-admission-atomique-locale-425-2026-10-08).
Les sept chantiers Shinkiro et les parcours réels SPAWT/Noël restent ouverts ;
aucune maturité globale n’est déduite de cette réparation.
