# Identité publique — livraison 429 bloquée et candidat 430

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

## 430 candidat, cause encore ouverte

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
CI, image et recette native réelle 430 non reçus.
Fermer la cause uniquement après inspection de l’image et sélection/
publication/rendu en production sur le chemin existant.

Les pins restent ceux d’un enregistrement, sans preuve d’immutabilité des
octets. Identité complète, quiz/app, retour de valeur, fournisseurs, cycle réel
et sept chantiers demeurent ouverts. Aucun contenu privé ni inventaire d’actifs
n’est publié par ce reçu.

Preuves privées : release/preuves-identite-publique-429 et
release/preuves-origine-marque-430 ; notamment compiled-logo-base-diagnosis.json,
native-production-blocked.json, runtime.json, origin-red/green.log,
export-reception.json, native-export.json, native-guidelines-hot/visible.json
et cleanup.json.
