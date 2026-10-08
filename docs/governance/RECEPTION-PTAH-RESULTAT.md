# Ptah — contrat du reçu de demande

2026-10-08. **Candidat 6.27.427 ; production reçue encore 6.27.425.**
La livraison attendue réunit la filiation 426 et ce correctif ; aucune image 426
isolée. Le [reçu historique 426](RECEPTION-PTAH-FILIATION.md) reste inchangé.

## Correctif borné

Le 500 manuel après tâche DEFERRED créée provenait du contrat de sortie : la
route rend une enveloppe Intent, la post-condition attendait la tâche en racine
et excluait DEFERRED. Le candidat reconnaît ForgeTaskCreated en racine ou sous
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
| CI/image/runtime commun 426+427 | À recevoir |
| Provider/média/facture/cycle réel | Non reçus |

Le désaccord de sortie qui provoquait le 500 est fermé sur ce parcours local.
La fixture et son checkpoint synthétique ne prouvent aucune production de média.

## Limites maintenues

DEFERRED signifie demande persistée en attente de configuration, pas production
matérielle. PtahForgeButton affiche encore Intent OK et son badge succès sans
exposer output.status DEFERRED. Aucune interface modifiée par 426/427 ; aucun rendu reçu
par un simple appel de route. Le plan existant doit distinguer état de demande
et état de production, dans la prochaine passe manuelle native avant acceptation
C4/C5/C6, sans nouveau workflow.

Émission upstream, plusieurs sources, reçus documentaires/activeBriefId, octets
durables/CDN, parentAssetId/régénération complète, facture réelle et journal
restent dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md). Aucun cycle SPAWT/Noël ni
achèvement des sept chantiers n’est déduit de ce contrat.
