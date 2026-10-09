# Ptah — demande et production dans l’Oracle

2026-10-09. **Production reçue : 6.27.428 ; bouton/rôles reçus localement sur fixture.**
Le [reçu historique 427](RECEPTION-PTAH-RESULTAT.md) reste distinct. Gauntlet
local final, CI/image/runtime et livraison 428 sont reçus.

## Contrat et garde existants

PtahForgeButton sépare l’état de demande Intent de l’état de tâche. DEFERRED
affiche en ambre « En attente de configuration » : aucune production démarrée,
demande conservée. CREATED/IN_PROGRESS/inconnu/refus/échec restent distincts.
Confirmation explicite et textes FR/EN/ZH ; aucun succès de production, coût $0,
reprise automatique ou lien de configuration n’est promis pour DEFERRED.

OperatorSurface ne monte le contrôle et son hook de mutation qu’après
auth.me.canOperate ; forgeForSection exige requireOperator:true. La recette
native a révélé un staff non propriétaire refusé : Auth.js ne projette pas
operatorId dans sa session. Le chokepoint governedProcedure relit maintenant
getOperatorContext(userId, ctx.db) avant canAccessStrategy et émission ; le JWT
périmé ne vaut plus rattachement courant. Aucun nouveau droit ni entité/service/
router/page/Intent/outil/ADR. La note 428 précise Oracle ; la note 427 reste publiée.

## Réception locale synthétique

| Preuve | Reçu et limite |
|---|---|
| UI ciblée | Huit rouges/un vert avant patch, puis neuf verts |
| Garde ciblée | Deux rouges/cinq verts puis sept verts, plus cinq ownership ; JWT operatorId périmé désormais refusé |
| Opérateur natif avant correction de contexte | HTTP 403, zéro effet |
| Opérateur natif après correction | HTTP 200/Intent OK/DEFERRED ; une tâche et deux émissions, zéro version matérielle/coût/appel MCP |
| Founder | Page sans commande ; session USER via vrais credentials, appel direct HTTP 403 en 30 ms ; comptes/émissions/décisions de coût/tâche strictement inchangés |
| Fenêtres natives | Zéro réponse >=500 et zéro exception ; confirmation et rendu différé observés |
| Chargement local opérateur | HTTP 200, DOM 1 387 ms, premier titre observé <=1 445 ms |
| Chargement local founder | HTTP 200, DOM 10 695 ms, premier titre observé <=10 271 ms |
| Suites finales locales | 4 167 unitaires/397 fichiers, 1 617 gouvernance/166 fichiers incluant DS/vocab, 230 PostgreSQL/13 fichiers ; environnement sans clés externes |
| Lints/cycles | Deux lints exit 0, 24 warnings préexistants ; zéro cycle sur 1 741 fichiers |
| Typecheck final | Exit 0, aucun message d’erreur |
| CI 428 | 37862693091 verte sur cdd9f6c01423bdfb8b9da37240c5f9fcb8bef5e4 ; 4 167 unitaires/230 PostgreSQL |
| Nettoyage | cleaned:true, zéro tâche/actif de fixture conservé, Next local arrêté volontairement |
| Vitrine SPAWT native, réception séparée | Deux URL relues sans décompte et avec six questions ; ne reçoit pas un cycle quiz/application |

Ces temps viennent du serveur dev webpack ; aucune promesse SLO n’en découle.
Les préconditions ADVE/RTIS sont synthétiques locales, sans validation d’un
noyau de marque réel. Aucun fournisseur ni donnée de production modifiés.
Fixture nettoyée, aucune donnée de recette conservée en base et serveur arrêté.
Preuves privées :
`release/preuves-ux-forge-428/` (rouge/vert opérateur, founder/refus, captures et
snapshots avant/après), sans identifiants de fixture propagés dans cette prose.

## Livraison de production

Image 37862922982 reçue : login sur base neuve et lecture d’un PDF fixture de
deux pages, sans réception d’export PDF. Déploiement `x4psf7p6m4gb84co610yrcrg`
terminé le 2026-10-09 à 00:19:53 UTC ; runtime 6.27.428/nextjs et volume privé RW
conservé, index exact :
`sha256:dd0b929865341017fb3a64ead096b5953f672bbd385051c1998e9b1e2b13f973`.

Production : lectures/refus 200/400/403, corpus privé inchangé, toujours zéro
GenerativeTask/AssetVersion avant/après. Édition publique SPAWT v1/digest conservés,
CORS trois origines exactes, ETag 304 et export privé 401 reçus. Connexions
rechargée puis hydratée : version 428/édition v1, annonce lue puis fermée ; aucune
saisie ni production métier. Ces reçus ne déplacent pas la recette native du
bouton/rôles en production : elle reste locale et synthétique.

Reçus privés complémentaires : reception/runtime/deploiement/image-digest/
production-http/native-connections dans le même dossier de preuves.

## Limites maintenues

Le code de distinction/garde est livré ; sa recette métier reste locale.
La même tâche DEFERRED n’est toujours pas relancée après configuration : prochaine
C5 via tâche/Intent existants, portée/coûts/anti-double appel et chemin de
configuration réel avant autonomie. Aucune efficacité de Connexions ni reprise
automatique présumée. Fallbacks d’émission, multisource, provenance documentaire/
invalidation/activeBriefId, coffre/octets/CDN, parentAssetId, Canva/Figma, facture
et journal restent dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md). Aucun fournisseur,
média, coût réel, cycle SPAWT/Noël ni achèvement des sept chantiers n’est reçu ;
les acceptations métier restent ouvertes.
