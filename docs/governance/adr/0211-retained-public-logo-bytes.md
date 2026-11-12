# ADR-0211 — Conserver et servir les octets d’un logo publié depuis le coffre existant

- **Status** : Accepted
- **Date** : 2026-10-09
- **Phase** : Réception Shinkiro C2/C3, 6.27.431 livrée — logo public borné
- **Depends on** : ADR-0208, ADR-0209, ADR-0210
- **Supersedes** : — (prolonge la publication existante, sans réécrire les reçus)

Architecture acceptée après 33 PostgreSQL ciblés, gauntlet, image et publication
native réelle 431 reçus. Le reçu porte sur le logo public conservé de SPAWT v3,
sans acceptation de l’univers de marque ou de tous les parcours C2/C3.

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

## Décision

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
Périmètre CI reçu 248/13. Session native FOUNDER synthétique :
Connexions HTTP 200, réédition texte 200, corruption 412 deux fois (toast reçu
au second essai), version 2 gardée active et refus français visible ; retour
200 créant/affichant v3. Transport HTTP direct chargé 4123×1714/224112 octets ;
JSON/image/304/refus query/hash/privé reçus. Fenêtres initiale et gestes non
tronquées sans >=500/exception ; DOM 5790 ms/H1 <=27995 ms en dev/compilation,
sans SLO. Image HTTPS absolue dans la page locale non reçue (origine production),
donc aucune page publique complète locale déduite. Fixture nettoyée, zéro actif/
stratégie. Ces refus/retours restent locaux. Preuves privées :
release/preuves-octets-publics-431/{ECART.md,avant.log,apres-initial.log,apres-adversarial.log}.
Complément local : republish-avant.log et republish-apres.log.
Recette native locale : native-local-reception.json et captures voisines.

Source livrée 3f1040726620a21ba4d2afcd7fc5ab887d8c2e54, CI 37876777265 verte
(4167 unitaires/397 fichiers, 248 PostgreSQL/13), Chromatic 37876777303 et
MissionDrift 37876777213 verts ; image 37876782159 reçue après boot/migrations/
login 200 et lecture PDF fixture deux pages. Index
sha256:45fba7bd5026a1ee2eb90d95f64220988b43f1095580465412a9a3c4fdf44376,
déploiement terminé le 9 octobre à 03:07:30 UTC, runtime exact/nextjs/volume RW.
Publication native réelle unique v2→v3, même logo SELECTED sans promotion,
textes/liens conservés ; copie VOLUME 224112 octets/hash/header/body/checkout
concordants, 200/304/query 404/privé 401/CORS reçus. Deux logos SPAWT et page
publique chargés 4123×1714 ; relire réouvert sans resélection puis annulé sans
publication. Corpus hors cette édition inchangé, actifs 257→258, aucun fournisseur.
Trace initiale production tronquée ; fenêtre fraîche chaude complète document
200/DOM 721 ms/premier titre <=2655 ms, zéro >=500/exception dans cette seule
fenêtre, sans SLO. Preuves : reception.json, runtime.json, production-http-apres-choix.json,
native-reopen.json et native-production-fresh-load-summary.json du même dossier privé.

La cause octets des nouvelles éditions est fermée. Une copie vérifiée ne
garantit pas la disponibilité éternelle du stockage ni des clés ; anciennes
éditions sans reçu, récupération/backup et orphelins HTTP_BLOB restent ouverts.
Aucun archivage de toutes les familles d’identité n’est reçu. Moka, palette,
polices, voix, quiz/app, retour de valeur, fournisseurs/cycles métier et sept
chantiers restent ouverts. Ce lot reçoit une condition de continuité technique,
sans mesurer l’accumulation de superfans.
