# ADR-0211 — Conserver et servir les octets d’un logo publié depuis le coffre existant

- **Status** : Proposed
- **Date** : 2026-10-09
- **Phase** : Réception Shinkiro C2/C3, candidat 6.27.431
- **Depends on** : ADR-0208, ADR-0209, ADR-0210
- **Supersedes** : — (prolonge la publication existante, sans réécrire les reçus)

Architecture proposée avec 33 PostgreSQL ciblés et gauntlet final local verts.
Transport HTTP et gestes natifs locaux reçus sur fixture FOUNDER ; page publique
complète et CI/image/livraison production 431 non reçues. Production 430/édition SPAWT v2.

## Contexte

Le logo est choisi et rendu en production 430, mais les pins décrivent son
enregistrement. Une URL /brand/ peut servir d’autres octets sans modifier
l’édition JSON. Le stockage chiffré existe déjà ; il manque le reçu liant sa
copie à l’édition publique et un transport anonyme borné à cette copie.
Étendre ce raccord évite un coffre ou un service média parallèle.

La responsabilité appartient à **brand-vault, Sustainment, sous MESTOR** :
conservation d’identité publique → continuité de marque → accumulation de
superfans visée. La stabilité d’un logo n’est pas une preuve de résultat
business ni d’achèvement du système.

## Décision proposée

- Réutiliser encrypted-media-store et conserver metadata.logoArchive privé dans
  BrandAsset : backend/clé/objet, hash, longueur, type et date du reçu. Aucun
  modèle, service, router, Intent, agent ou permission ajouté ; strategy.update,
  spine, droits, source/version/pins existants restent le chemin d’écriture.
- Lire les propres fichiers /brand/ dans l’image déployée ; utiliser la garde
  SSRF existante pour les URL distantes. Accepter PNG/JPEG/WebP/SVG autonome
  décodés, au plus 10 Mo/20 Mpx ; refuser scripts et ressources externes du SVG.
- À la publication, put/get/hash précèdent le commit de l’édition. Échec de
  conservation : l’ancienne édition reste active. Il n’existe pas de transaction
  distribuée stockage/DB : crash précommit peut laisser un objet jeune orphelin.
- Ajouter le seul transport manquant, GET /brand/editions/[editionId]/[file], où
  file=hash.extension. Autoriser les BRAND_GUIDELINES/public-brand-v1 hors campagne,
  ACTIVE/SUPERSEDED, d’une marque non archivée/supprimée et à slug public valide.
  Query, édition privée ou hash faux : 404. Absence/corruption du stockage : 503,
  sans relire la source mutable. Vérifier les octets avant chaque réponse, y
  compris avant ETag 304 ; cache revalidé, nosniff et CSP sandbox sans scripts.
- Retour : réutiliser la copie vérifiée, contrôler les pins/source actuels,
  créer un successeur et employer l’origine runtime courante. Ancien logo sans
  reçu d’octets : relecture/republication explicite avant un nouveau retour,
  aucun backfill ni validation de marque déduit.
- Réédition de texte : réutiliser le reçu de l’édition ACTIVE seulement si son
  URL snapshot et l’id sélectionné concordent, avec fingerprint/source actuels
  et candidat toujours éligible. Le formulaire accepte ce logo publié inchangé.
  Nouveau choix de variante : URL source et copie neuve, sans assimiler les deux
  gestes ni relire des octets mutables pour une simple correction de texte.
- Le nettoyage VOLUME existant après 24 h protège tout objet référencé par une
  édition, en plus de ses propriétaires déjà connus. Le balayage des orphelins
  HTTP_BLOB n’est pas reçu par ce lot.
- Conserver le contrat JSON v1 et le lecteur/CSP/DA SPAWT ; le chemin /brand/
  admissible transporte la copie. Le transport n’est pas une nouvelle page ni
  un nouveau produit.

## Conséquences et réception

Trois contre-exemples rouges/22 verts sur l’ancien code : dérive d’octets source,
retour après changement d’origine, stockage absent. Correctif : 25 verts, puis
32 PostgreSQL ciblés verts couvrant aussi corruption/ETag/retrait/brouillon/
nettoyage/replay/étranger/legacy/image invalide. Un nouveau contre-exemple reçoit
le refus de republication de published.content et le bouton invalide ; rouge
ciblé puis 33/33 verts après correction, titre modifié/source A→B et copie A
exigée dans la nouvelle édition. Gauntlet local : types/lints sans erreur,
24 warnings préexistants, zéro cycle et 1617 gouvernance/166 fichiers ;
unitaires reçus en trois commandes 4129/395 + src 9/1 + adversarial 29/1 =
4167/397 ; PostgreSQL feedback 248/13 + source-uses integration 8/1 = 256/14.
Périmètre CI attendu 248/13, sans reçu CI. Session native FOUNDER synthétique :
Connexions HTTP 200, réédition texte 200, corruption 412 deux fois (toast reçu
au second essai), version 2 gardée active et refus français visible ; retour
200 créant/affichant v3. Transport HTTP direct chargé 4123×1714/224112 octets ;
JSON/image/304/refus query/hash/privé reçus. Fenêtres initiale et gestes non
tronquées sans >=500/exception ; DOM 5790 ms/H1 <=27995 ms en dev/compilation,
sans SLO. Image HTTPS absolue dans la page locale non reçue (origine production),
donc aucune page publique complète déduite. CI/image/livraison production 431
non reçues ; décision toujours Proposed, cause octets ouverte. Preuves privées :
release/preuves-octets-publics-431/{ECART.md,avant.log,apres-initial.log,apres-adversarial.log}.
Complément local : republish-avant.log et republish-apres.log.
Recette native locale : native-local-reception.json et captures voisines.

La cause octets reste ouverte jusqu’à livraison et réception native. Une copie
vérifiée ne garantit pas la disponibilité éternelle du stockage ni des clés ;
aucun archivage de toutes les familles d’identité n’est reçu. Moka, palette,
polices, voix, quiz/app, retour de valeur, fournisseurs/cycles métier et sept
chantiers restent ouverts. Ce lot reçoit une condition de continuité technique,
sans mesurer l’accumulation de superfans.
