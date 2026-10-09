# Identité publique — logo et octets reçus en production 431

État au 2026-10-09. ADR-0210 reste la décision d’architecture et la recette
locale historique ; ce reçu distingue livraison et usage réel.

## 429 livré, sélection réelle non reçue

Source 383f5e8a2431a25f8d6e28984708fc21564ed553. CI 37868288873,
Chromatic 37868288853, MissionDrift 37868288803 et image 37868294874 verts.
Déploiement si0m9f65tbi2k2bk3dbe6o8p terminé à 01:22:53 UTC ; runtime
6.27.429/nextjs, image sha256:422701bfc908eea24ba950bc30cb246e3ff8c61ab4304e4d7e4c4f3fc2391994,
volume privé RW conservé. Corpus comparé inchangé : 12 sources/40 piliers,
256 actifs/2431 coûts/108 fragments ; édition SPAWT v1 conservée.

La recette locale 429 reste reçue : choix/publication/restauration sur fixture,
six éditions synthétiques puis nettoyage ; gauntlet vert 4167 unitaires,
1617 gouvernance/243 PostgreSQL, types/lints sans erreur, 24 warnings et zéro cycle.
Consommateur vitrine déployé à 01:01:57 UTC après PR #6/CI verte.

En revanche, Connexions réelle en production ne propose que « Sans logo ».
Aucune variante sélectionnée, aucune publication effectuée. La trace native
est tronquée : elle ne prouve pas zéro erreur ou 500 sur toute la fenêtre.
Le diagnostic lit deux chunks compilés où l’origine du publisher est figée à
http://localhost:3000, alors que les origines serveur à l’exécution sont HTTPS.
NEXT_PUBLIC_BASE_URL a été substitué au build avant les replis serveur.

## 430 livré, cause d’origine fermée

resolveBrandDeploymentOrigin étend brand-theme existant : priorité AUTH_URL,
puis NEXTAUTH_URL, puis NEXT_PUBLIC_BASE_URL en dernier repli. Les URL relatives
de la publication exigent HTTPS ; l’export de charte réutilise la primitive en
conservant sa compatibilité HTTP locale. Aucun nouveau modèle/service/router/
page/Intent/permission ni nouvel ADR.

Deux contre-exemples PostgreSQL rouges/27 anciens verts, puis 29/29 verts sur
les deux fichiers concernés.

Recette locale isolée 430 : guidelines.export HTML HTTP 200 en 3380 ms,
HTML imprimable HTTP 200 en 334 ms. Fichiers relus (2341 octets), image absolue
sur localhost:3318/brand/ ; document ouvert nativement, PNG chargé de 4123 px.
La vue sœur cockpit/guidelines est réellement affichée sous session FOUNDER
synthétique, deux logos dont un ACTIVE, sans source ni palette inventée.
Recette chaude : DOM 1565 ms, titre observé au plus tard à 3976 ms. Trace
tronquée : aucune conclusion zéro 500/erreur sur toute la fenêtre. Le passage
froid a rencontré deux timeouts CDP pendant compilation avant rendu ; ces
observations ne reçoivent aucun SLO. Fixture supprimée (zéro actif/stratégie),
serveurs arrêtés.

Contrôles 430 reçus : types/lints sans erreur, 24 warnings préexistants, zéro
cycle, 1617 gouvernance/166 fichiers et 4167 unitaires/397 verts. PostgreSQL
237/13 fichiers sous configuration feedback puis source-uses 8/1 sous
configuration integration, soit 245/14 verts : gauntlet 430 complet vert.
CI 37871315767 verte : 4167 unitaires/397 fichiers et 237 PostgreSQL/13.
Chromatic 37871315716 et MissionDrift 37871315692 verts.

Source livrée 2b9b2fa4520247b06e32a3c18d825a1af8d141fc ; image 37871326006
verte après boot sur base neuve, login HTTP 200 et lecture d’un PDF fixture de
deux pages. Index sha256:78cad84df9b217503e089444c47dc624d2b7b223d7e12b3c08c0aef996138aa7.
Déploiement z12n2ez1xkbaamvdoq9r5jzf terminé à 02:02:23 UTC ; runtime
6.27.430/nextjs/index exact, volume privé RW conservé. Neuf helpers compilés
conservent AUTH_URL/NEXTAUTH_URL avant le repli localhost.

Connexions native réelle propose 17 variantes. Contour horizontal SELECTED v1
choisi, textes v1 relus exactement, puis **une** publication crée l’édition v2.
Acteur et pins id/version présents en privé, sans identifiants recopiés ici.
SPAWT charge ses deux logos en 4123×1714 ; page publique chargée de même. Six
questions, aucun compteur, textes et liens inchangés. HTTP public 200, CORS
trois origines, ETag 304, privé 401, page/image 200 et CSP images bornée au chemin
brand reçus. Les octets de l’image correspondent au checkout à cet instant.

Corpus avant/après déploiement inchangé ; après publication, seule l’édition
ajoute un actif, 256→257. Sources/piliers/usages/fragments/coûts/processus restent
12/40/2/108/2431/19, digest des actifs hors éditions inchangé. Aucun fournisseur
appelé par ce raccord.

Fenêtre initiale de rechargement production complète (truncated=false,
hasMore=false) : DOM 702 ms, H1 observé au plus tard à 2674 ms ; zéro réponse
>=500/exception **dans cette seule fenêtre initiale**. Ce reçu ne couvre pas
toute la fenêtre de publication et ne promet aucun SLO. Les limites des traces
locales et de 429 tronquées restent valables. La cause d’origine inlinée est
fermée et retirée du registre actif ; aucun nouvel ADR ni redéploiement pour
le seul commit documentaire n’est nécessaire.

Les pins restent ceux d’un enregistrement, sans preuve d’immutabilité des
octets. Identité complète, quiz/app, retour de valeur, fournisseurs, cycle réel
et sept chantiers demeurent ouverts. Aucun contenu privé ni inventaire d’actifs
n’est publié par ce reçu.

## 431 — copie d’octets livrée, réceptions locale et production distinctes

La recette locale ne modifie ni ne backfill la production 430/édition SPAWT v2
qui la précédait. [ADR-0211 Accepted, borné](adr/0211-retained-public-logo-bytes.md)
justifie le transport absent malgré le stockage chiffré existant.

brand-vault conserve/décode le fichier admissible, put/get/hash avant commit,
puis reçoit metadata.logoArchive privé et URL par édition/hash. La lecture
anonyme vérifie à chaque appel les octets et l’admission de l’édition, même
avant 304 ; corruption/absence 503 sans repli source, hors périmètre 404.
PNG/JPEG/WebP/SVG autonome, 10 Mo/20 Mpx, garde SSRF existante pour le distant.
Rollback garde l’ancienne édition ; un crash avant commit peut laisser un
jeune orphelin. Nettoyage VOLUME existant après 24 h protège les objets de toute
édition ; balayage HTTP_BLOB non reçu.

Restaurer réutilise la copie vérifiée sous pins/source courants, nouvelle édition
et origine runtime actuelle. Ancien logo sans reçu d’octets : refus du retour
aveugle, relecture/republication explicite, aucun backfill automatique. JSON v1,
lecteur/CSP/DA SPAWT compatibles, aucune nouvelle entité/service/router/Intent/
agent/permission. Continuité de marque et accumulation de superfans restent
la finalité visée, sans résultat business reçu.

Un contre-exemple supplémentaire montre la relecture de texte refusée lorsque
published.content conserve l’URL snapshot, avec bouton invalide. Correctif :
réutiliser le reçu de l’édition ACTIVE seulement si URL et id sélectionné
concordent avec elle, candidat toujours éligible et fingerprint/source actuels.
Le formulaire accepte alors le logo publié inchangé ; un nouveau choix de
variante reprend l’URL source et conserve une copie neuve. Le test republie le
titre modifié après dérive des octets source A→B et exige A dans la nouvelle
édition. Ce passage ciblé rouge (32 autres cas non exécutés) puis 33/33 verts
est reçu localement ; il ne reçoit pas un geste natif ou une production 431.

Trois rouges/22 anciens verts sur dérive source, changement d’origine au retour
et stockage absent ; correctif 25 verts, puis 32 PostgreSQL ciblés verts avec
corruption/ETag/retrait/brouillon/nettoyage/replay/étranger/legacy/image invalide,
puis le contre-exemple de republication ci-dessus porte la suite à 33/33 verts.
Gauntlet final local vert : types/lints sans erreur, 24 warnings préexistants,
zéro cycle et 1617 gouvernance/166 fichiers. Unitaires reçus en trois commandes
conservées dans les preuves : 4129/395 + src 9/1 + adversarial 29/1 = 4167/397.
PostgreSQL local : feedback 248/13 + source-uses integration 8/1 = 256/14 ;
périmètre CI reçu 248/13, distinct du total local.

Recette native locale sous vraie session FOUNDER synthétique : Connexions
HTTP 200, réédition de texte 200, deux refus de corruption 412 (second essai
pour recevoir le toast manqué au premier), puis retour 200 créant le successeur
v3. Refus français réellement lu, version 2 restée active pendant la panne ;
retour affichant version 3. Image HTTP directe chargée nativement 4123×1714,
224112 octets, SHA-256 25a7c390e84fb352a5e433883628f5310460cdf15355e34138e8451ab05ec58c.
Après retour : JSON 78 ms, image 200/35 ms, 304/29 ms, query 404/19 ms,
faux hash 404/21 ms, privé 401/21 ms.

Fenêtres initiale et gestes non tronquées : zéro >=500/exception dans ces
fenêtres. DOM 5790 ms, premier H1 observé au plus tard à 27995 ms en dev local
avec compilation, sans SLO. L’image HTTPS absolue dans la page locale pointe
vers l’origine de production et n’est pas reçue ; seuls transport HTTP direct
et gestes UI le sont, aucune page publique complète locale déduite. Fixture
supprimée : zéro actif/stratégie restant, aucune recette synthétique conservée.

### Livraison et publication réelle 431

Source 3f1040726620a21ba4d2afcd7fc5ab887d8c2e54, CI 37876777265 verte
(4167 unitaires/397 fichiers, 248 PostgreSQL/13), Chromatic 37876777303 et
MissionDrift 37876777213 verts. Image 37876782159 verte après boot PostgreSQL/
migrations/login HTTP 200 et lecture d’un PDF fixture de deux pages.
Index sha256:45fba7bd5026a1ee2eb90d95f64220988b43f1095580465412a9a3c4fdf44376 ;
déploiement unique jxosnqfcj02fkeic91aza9n2 terminé le 9 octobre à 03:07:30 UTC,
runtime 431/nextjs/index exact, volume privé RW conservé.

Avant choix, JSON v2 inchangé. Une publication native FOUNDER réelle crée SPAWT
v3, même logo SELECTED sans promotion, textes/liens identiques. Copie privée
VOLUME 224112 octets, SHA-256 25a7c390e84fb352a5e433883628f5310460cdf15355e34138e8451ab05ec58c ;
hash/header/body/checkout concordants. Transport snapshot HTTP 200/304,
query 404/privé 401/CORS trois origines/page publique 200 reçus. SPAWT charge ses
logos d’en-tête/pied de page depuis v3, 4123×1714 ; /b/LFA-spawt aussi.
Réouverture relire : Publier disponible sans resélection, image chargée après
attente ; annulée sans seconde publication. Aucun retour réel de production ou
corruption réelle déduit des recettes locales.

Corpus hors édition inchangé : actifs 257→258, 12 sources/40 piliers/2 usages/
108 fragments/2431 coûts/19 processus inchangés ; aucun fournisseur. Première
trace production tronquée, aucune conclusion exhaustive de zéro erreur.
Fenêtre fraîche de rechargement chaud Connexions non tronquée/hasMore=false :
document 200, DOM 721 ms, premier titre <=2655 ms, zéro >=500/exception observé
dans cette seule fenêtre. Aucun SLO ni autre parcours reçu par cette mesure.

Cause d’octets des nouvelles éditions /brand/ fermée. Anciennes éditions sans
archive, disponibilité/récupération du stockage et orphelins HTTP_BLOB restent
ouverts avec plan/déclencheur au registre. Moka/palette/polices/voix/quiz-app/
multidestination/retour de valeur et sept chantiers ne sont pas acceptés.

Preuves privées : release/preuves-identite-publique-429 et
release/preuves-origine-marque-430 ; notamment compiled-logo-base-diagnosis.json,
native-production-blocked.json, runtime.json, origin-red/green.log,
export-reception.json, native-export.json, native-guidelines-hot/visible.json,
cleanup.json, compiled-origin.json, native-production-load.json,
native-choices/published/spawt/public-brand.json et production-http-apres-choix.json.
431 : release/preuves-octets-publics-431/ECART.md, avant.log,
apres-initial.log et apres-adversarial.log.
Complément : republish-avant.log et republish-apres.log.
Recette native locale : native-local-reception.json et captures locales voisines.
Livraison 431 : reception.json, runtime.json, production-http-apres-choix.json,
native-spawt.json, native-public-brand.json, native-reopen.json et
native-production-fresh-load-summary.json du même dossier privé.
