# Ptah — réception bornée des références métier

Date : 2026-10-08. **Candidat 6.27.426 ; production reçue encore 6.27.425.**
Le [reçu 425](RECEPTION-PTAH-ADMISSION.md) reste historique ; ses preuves ne
certifient pas ce nouveau lot.

Suite distincte : le [reçu du contrat 427](RECEPTION-PTAH-RESULTAT.md) consigne
la correction locale du 500 manuel et la livraison commune reçue le 8 octobre ;
les constats de ce reçu 426 restent historiques.

## Périmètre du candidat

Les champs existants campaignId, briefId et sourceBrandAssetId sont transmis
MCP/tRPC→Intent→Artemis→Ptah/task-store, ainsi que depuis les séquences et la
forge manuelle d’un BrandAsset. Un contrôle partagé vérifie leur portée
marque/opérateur/campagne/brief/source avant sélection fournisseur et pendant
admission. La gate existante vérifie la présence d’un CampaignBrief ou d’un
activeBriefId non-null ; ce dernier n’est pas relu par portée/kind/état.

La régénération refuse une tâche historique hors marque/opérateur avant tout
fournisseur et reprend ses références métier. Le descriptif MCP de
ptah_reconcile_task décrit l’admission checkpointée/atomique ; il ne promet
plus de téléchargement CDN ni d’émission ASSET_FORGED.

L’admission 425 est réutilisée. Aucun nouveau modèle, service, Intent, outil,
agent ou ADR ; aucune validation de marque ni sélection de source inventée.

## État des preuves

| Réception | État actuel | Limite |
|---|---|---|
| Contre-exemples avant patch | Neuf rouges, 25 verts dans la suite ciblée | Dix cas ajoutés ; ce résultat précède le correctif |
| PostgreSQL après patch | 35 ciblés / 230 complets sur 13 fichiers verts | 24 cas existants, dix contre-exemples et un passage commandant/fournisseur synthétique sélectionné |
| Unitaires globaux/gouvernance | 4 144 unitaires sur 395 fichiers / 1 610 gouvernance sur 165 fichiers verts | Logs finaux reçus ; aucune preuve de cycle réel |
| Types/lint/lint:governance/cycles | Zéro erreur, 24 warnings préexistants, zéro cycle | Types finaux verts ; stress isolé sans pages/tRPC, forges différées, zéro finding |
| MCP JSON-RPC réel | tools/list 200 puis catalogue(call 200), descriptif borné relu | /api/mcp/rpc local ; aucun fournisseur réel |
| Entrée MCP et tRPC | MCP invoke 200/status OK/tâche DEFERRED, tRPC 200/DEFERRED sous connexion credentials OPERATOR | Source étrangère MCP 200/status FAILED ; HTTP 200 ne transforme pas ce refus métier en succès |
| Réconciliation/replay MCP | HTTP 200/status OK, corps stables | Checkpoint injecté sur fixture ; aucun média ou fournisseur reçu |
| Forge manuelle Oracle | HTTP 412 sans préconditions ADVE, puis 500 avec ADVE synthétique ENRICHED et gate satisfaite, après tâche DEFERRED créée | Parcours non reçu ; correctif 427 dédié immédiat avant image, aucune marque validée |
| CI/image/déploiement/runtime | À recevoir après correctif 427 | Pas de livraison 426 isolée ; production reçue encore 425 |
| Forge/provider/média/facture/cycle réel | Non reçus | Ni SPAWT ni Noël réel certifié |

Preuves privées : `release/preuves-filiation-forge-426/`. Les compteurs de
fixtures évoluent pendant les passes ; aucun total tâche/émission/appel n’est
figé ici. Les preuves 425 ne sont pas substituées à la recette 426.

Le 500 manuel est un désaccord de contrat : la route rend une enveloppe
{status: IntentResult.status, output: ForgeTaskCreated}, tandis que la
post-condition task-created-with-provider-id attend taskId/provider/status
CREATED|IN_PROGRESS en racine.
Son schéma de sortie exclut aussi DEFERRED. Le schéma d’entrée transmet
désormais les trois références dans 426. La tâche créée ne prouve pas que la route a réussi. Reprise planifiée
au lot 427 avant image, avec recette HTTP du même parcours.

## Limites maintenues

- sourceIntentId conserve encore des fallbacks GloryOutput ou BrandAsset : une
  référence transmise ne prouve pas qu’elle désigne une vraie émission upstream.
- Une séquence ne transmet sourceBrandAssetId que lorsqu’un seul actif source
  est disponible. Un lot multiple reste ambigu ; aucun premier candidat n’est élu.
- sourceDataSourceId/sourceContentHash et l’invalidation après correction/staleAt
  ne sont pas propagés jusqu’au matériau ; aucune provenance complète garantie.
- Constat statique sur la gate brief : activeBriefId non-null suffit sans contrôle
  de portée/kind/état. À reprendre dans le prochain lot de brief documentaire
  réel avant acceptation C3/C6, dans le plan de filiation existant.
- Le contrôle de tâche source et la conservation du contexte ne complètent pas
  parentAssetId ni toute la sémantique de régénération.
- Octets durables/CDN, Canva/Figma, facture fournisseur, fermeture durable du
  journal, stress E2E et cycle manuel réel restent des réceptions distinctes.

Plans et déclencheurs dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md). Les sept chantiers
restent ouverts ; la transmission de trois références ne reçoit pas tout le
cycle de vie d’une marque ou d’une campagne.
