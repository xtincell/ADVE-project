# Identité publique — échec 429 et logo reçu en production 430

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

Preuves privées : release/preuves-identite-publique-429 et
release/preuves-origine-marque-430 ; notamment compiled-logo-base-diagnosis.json,
native-production-blocked.json, runtime.json, origin-red/green.log,
export-reception.json, native-export.json, native-guidelines-hot/visible.json,
cleanup.json, compiled-origin.json, native-production-load.json,
native-choices/published/spawt/public-brand.json et production-http-apres-choix.json.
