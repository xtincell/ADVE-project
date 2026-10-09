# Ptah — demande et production dans l’Oracle

2026-10-09. **Candidat 6.27.428 reçu localement ; production reçue encore 6.27.427.**
Le [reçu livré 427](RECEPTION-PTAH-RESULTAT.md) reste distinct. Le gauntlet local
final est entièrement vert ; CI/image/runtime et livraison 428 restent à recevoir.

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
| CI/image/runtime 428 | À recevoir |
| Nettoyage | cleaned:true, zéro tâche/actif de fixture conservé, Next local arrêté volontairement |
| Vitrine SPAWT native, réception séparée | Deux URL relues sans décompte et avec six questions ; ne reçoit pas un cycle quiz/application |

Ces temps viennent du serveur dev webpack ; aucune promesse SLO n’en découle.
Les préconditions ADVE/RTIS sont synthétiques locales, sans validation d’un
noyau de marque réel. Aucun fournisseur ni donnée de production modifiés.
Fixture nettoyée, aucune donnée de recette conservée en base et serveur arrêté.
Preuves privées :
`release/preuves-ux-forge-428/` (rouge/vert opérateur, founder/refus, captures et
snapshots avant/après), sans identifiants de fixture propagés dans cette prose.

## Limites maintenues

La distinction et la garde sont reçues localement, leur livraison reste ouverte.
La même tâche DEFERRED n’est toujours pas relancée après configuration : prochaine
C5 via tâche/Intent existants, portée/coûts/anti-double appel et chemin de
configuration réel avant autonomie. Aucune efficacité de Connexions ni reprise
automatique présumée. Fallbacks d’émission, multisource, provenance documentaire/
invalidation/activeBriefId, coffre/octets/CDN, parentAssetId, Canva/Figma, facture
et journal restent dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md). Aucun fournisseur,
média, coût réel, cycle SPAWT/Noël ni achèvement des sept chantiers n’est reçu ;
les acceptations métier restent ouvertes.
