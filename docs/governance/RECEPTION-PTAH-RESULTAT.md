# Ptah — contrat du reçu de demande

Actualisé le 2026-10-09. **Production reçue : 6.27.427.**
La livraison commune réunit la filiation 426 et ce correctif ; 426 n’a pas été
déployée seule. Le [reçu historique 426](RECEPTION-PTAH-FILIATION.md) conserve
les observations antérieures au correctif de sortie.

## Correctif borné

Le 500 manuel après tâche DEFERRED créée provenait du contrat de sortie : la
route rend une enveloppe Intent, la post-condition attendait la tâche en racine
et excluait DEFERRED. Le correctif livré reconnaît ForgeTaskCreated en racine ou sous
output d’une enveloppe Intent OK, avec taskId/provider typés et non vides,
status CREATED/IN_PROGRESS/DEFERRED. FAILED/VETOED et COMPLETED restent refusés.
Le schéma de sortie admet DEFERRED ; les trois références du schéma d’entrée
étaient déjà ajoutées en 426, elles ne constituent pas un correctif 427.

| Preuve | État actuel |
|---|---|
| Test ciblé avant patch | Deux rouges/neuf verts dans ptah-provider-availability |
| Test ciblé après patch | 11 verts ; contrôle des formes racine/enveloppe et refus incompatibles |
| Gates 427 | Types/lints sans erreur, 24 warnings préexistants, zéro cycle ; 4 151 unitaires/395 fichiers et 1 610 gouvernance/165 fichiers verts |
| HTTP Oracle après redémarrage | HTTP 200 en 271 ms, Intent OK/output DEFERRED ; portée de tâche et émission enfant OK vérifiées en base |
| Autres appels locaux | MCP discovery/catalogue 200, entrée OK/DEFERRED, source étrangère FAILED ; tRPC 200/DEFERRED ; réconciliation/replay MCP 200 et corps stables sur checkpoint 426 |
| CI commune | 37856242347 verte sur source 919cebb49fcfc5f5599ccd3dab5101b7b9f62d0e ; 4 151 unitaires/230 PostgreSQL |
| Image et runtime | 37856486468 verte : boot base neuve/login 200, lecture d’un PDF fixture de deux pages et configuration publiée concordante ; runtime exact 427/nextjs, volume privé RW conservé |
| Production : lectures/refus | Version/webhook GET 200, POST absent 400/faux secret 403 ; zéro fixture/fournisseur ; aucun geste de forge |
| Corpus/forge en production | Corpus inchangé, zéro GenerativeTask/AssetVersion avant/après ; aucun historique de forge réparé |
| SPAWT public et Connexions | Édition v1/digest conservés, trois origines CORS exactes, ETag 304/export privé 401 ; Connexions 427/édition v1 relues nativement sans soumission |
| Provider/média/facture/cycle réel | Non reçus |

Le désaccord de sortie qui provoquait le 500 est fermé sur ce parcours local.
La fixture et son checkpoint synthétique ne prouvent aucune production de média.

Déploiement unique `m1ux1sgbxio65esnyfdev7ha` terminé le 2026-10-08 à 23:06:42 UTC.
Index reçu : `sha256:4a88ee5d9914ab389981dc24f0515178f7ae7ed2949362c036a365bd5686af14`.
Le smoke lit un PDF fixture ; il ne reçoit pas un export PDF. Les réceptions
production sont des lectures/refus et comparaisons, pas le scénario métier local.
Preuves privées : `release/preuves-sortie-forge-427/` (gates, HTTP local, CI,
image/boot, runtime, production HTTP et corpus comparé). Connexions a été relue
après hydratation, note affichée puis fermée ; aucune métrique réseau native
capturée, aucun bouton de production reçu.

## Limites maintenues

DEFERRED signifie demande persistée en attente de configuration, pas production
matérielle. Dans la production 427, PtahForgeButton affiche encore Intent OK et son badge succès sans
exposer output.status DEFERRED. Aucune interface modifiée par 426/427 ; aucun rendu reçu
par un simple appel de route. Le plan existant doit distinguer état de demande
et état de production, dans la prochaine passe manuelle native avant acceptation
C4/C5/C6, sans nouveau workflow.
Constats statiques dans cette même passe : forgeForSection ne déclare pas
requireOperator:true et PtahForgeButton n’utilise pas OperatorSurface. Reprendre
les gardes existantes et recevoir OPERATOR/FOUNDER, avec refus sans effet, avant
ces acceptations ; aucune reproduction d’abus ni réparation n’est présumée.
La note 427 publiée parle de « section du livre de marque » ; le parcours reçu
est Oracle. Le [candidat UX 428](RECEPTION-PTAH-UX.md) reçoit localement la
distinction, la garde existante et la relecture du contexte opérateur ; aucun
nouveau droit, ni livraison 428 présumée. Sa note précise Oracle sans réécrire 427.

DEFERRED n’a pas de commande actuelle qui relance cette même tâche après
configuration : materializeBrief en crée une nouvelle, reconcileTask appelle
reconcile avec providerTaskId ou une chaîne vide, sans lancer forge(). Les clés
Ptah sont lues dans l’environnement global ; leur configuration via Connexions
n’est pas reçue. Prochaine C5 : reprise manuelle avec tâche/Intent existants,
gardes de portée/coût et preuve anti-double appel, puis chemin de configuration
réel avant autonomie. Le faux 500 fermé ne ferme pas cette reprise ; l’UX prévue
doit seulement indiquer qu’aucune production n’est lancée et qu’une configuration
est nécessaire, sans lien ni promesse non reçus.

Émission upstream, plusieurs sources, reçus documentaires/activeBriefId, octets
durables/CDN, parentAssetId/régénération complète, facture réelle et journal
restent dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md). Aucun cycle SPAWT/Noël ni
achèvement des sept chantiers ni acceptation métier globale n’est déduit de ce contrat.
