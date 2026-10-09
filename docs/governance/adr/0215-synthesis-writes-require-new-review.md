# ADR-0215 — Réécrire un plan dérivé sans transporter son approbation

- **Status** : Accepted
- **Date** : 2026-10-09
- **Phase** : Guidance — candidat 6.27.437, réception locale bornée
- **Depends on** : ADR-0088, ADR-0198, ADR-0207, ADR-0214
- **Supersedes** : — (extension du gateway et de la revue existants)

## Contexte

La revue S de 436 distingue composition, confiance et décision humaine. D’autres
écrivains conservent pourtant l’approbation après currentVersion++, PROTOCOLE_S
auto-approuve une confiance élevée et MERGE_DEEP cumule les plans successifs.
Un changement de dépendance laisse aussi Strategy VALIDATED. canon-sync recalcule
S.computed hors gateway et masque ses erreurs. Ces chemins peuvent contredire
la version relue sans passer par les deux routes de revue réparées.

S est une projection dérivée. Son plan courant doit pouvoir remplacer le
précédent ; l’accumulation de matière appartient aux archives existantes.
PillarVersion, le writer commun, les reçus documentaires et la transition
gouvernée existent : aucune entité ni surcouche supplémentaire n’est nécessaire.

## Décision

- MERGE_DEEP remplace les tableaux S à toute profondeur et conserve les champs
  non concernés. La fusion additive des autres piliers reste en place.
  PillarVersion garde le contenu antérieur, sans archive parallèle.
- Refuser les demandes VALIDATED/LOCKED d’un writer de contenu S et exclure S
  de l’auto-approbation PROTOCOLE. Une confiance élevée n’est pas une revue.
- Toute nouvelle version S retire son ancienne validation et Strategy VALIDATED
  dans la transaction d’écriture. Restaurer l’ancien contenu crée une nouvelle
  version AI_PROPOSED à relire ; son retry ne crée pas une seconde restauration.
- Si une dépendance change, marquer S stale et retirer Strategy VALIDATED ;
  S VALIDATED redevient AI_PROPOSED. S LOCKED conserve son verrou : staleness ne
  donne aucune permission de réécriture. Un refus annule contenu, archive et
  rétraction ensemble ; aucune décision partielle n’est acceptée.
- Conserver la confiance réelle. null reste null, y compris avec confidenceDelta ;
  la restauration retrouve sa mesure historique sans restaurer son approbation.
- Verrouiller les sources documentaires d’abord, Strategy ensuite, les piliers
  enfin. Le writer prend directement Strategy UPDATE pour éviter deux upgrades
  SHARE→UPDATE concurrents ; les lecteurs gardent leur read fence existant.
- Factoriser retrait de revue/marquage stale dans review-invalidation.ts, module
  interne du gateway existant. Le writer, invalidateSourceDerivatives pour
  correction/suppression/révocation documentaires, et les deux écrivains du
  staleness-propagator le réutilisent. Verrouiller les Strategy UPDATE en ordre
  stable avant les piliers ; sourceUse prend directement UPDATE. Normaliser
  les clés d’âge vers leur stockage lowercase. Dans propagateFromPillar, respecter autoRecalculate :
  Process de refresh seulement dans le mode auto existant, sans ajouter un mode.
- Importer et recalculer S dans canon-sync via writePillarAndScore avec version
  attendue et statut AI_PROPOSED. Rendre les erreurs dans results.s. Retirer
  l’exception directe S du keystone ; vector reste la projection de score
  légitime existante. Ne pas déduire de ce reroutage un snapshot prouvé de toutes
  les sources du calcul.

## Conséquences

Le plan courant, l’historique, la confiance et la revue de sa version restent
distincts. Aucun modèle/page/service/router/kind/Neter/droit nouveau ; aucun
fournisseur ni approbation de marque réelle n’est requis par cette réparation.

Baseline treize cas : dix rouges/trois verts puis treize verts ; checkpoint
combiné 70/quatre fichiers. Checkpoint complet PostgreSQL : 304/seize fichiers
verts, dont seize cas S, avant cinq ajouts. Maintenant 21 S ciblés verts :
trois corrections VALIDATED/LOCKED/révocation par ingestion.updateSource
préservant propriétaire/autre dossier, deux propagateFromPillar true/false
réels/zéro fetch. Baseline âge : un rouge/un vert, lookup S→s réparé.
Rollback via router réel avec retry, sources documentaires
distinctes sur la même marque sans deadlock et S absent sans ghost row inclus.
Cleanup FK intermédiaire en échec conservé puis fixture corrigée/nettoyée.
Suite PostgreSQL complète finale 309/seize reçue, 21 S inclus. HARD collections
rouge exit 1/restauration exacte/vert exit 0 reçu. Unitaire complet 4 189/4 190 :
seul délai withRetry sous charge build, premier rouge conservé. Recontrôles
36/1 puis complet 4 190/400 verts sans modification du test. Cinq contrôles
finaux exit 0/gouvernance 1 620/166 verts. Build isolé terminé exit 0 ; aucune
réparation produit du délai déduite. Native locale USER/TRIAL/login normal :
S null v1 approuvé, vraie écriture v2 rétracte S/Strategy, nouvelle vision
relue/réapprouvée v2 HTTP 200/null conservé. Fenêtre complète bornée avec 17
annulations ERR_ABORTED ; pas zéro transport/SLO. Stress compiled isolé exit 0/
zéro finding, 46 HTTP reçus/235 non reçus/sept DEFERRED sans credentials/réseau
externe interdit, pas cycle/fournisseur réel. canon-sync statique + writer PG,
aucun import privilégié natif. Sept DEFERRED dans la fenêtre exacte du stress,
estimation zéro/sans providerTaskId ; sept tâches et quatre marques synthétiques
nettoyées/remaining=0, serveur isolé arrêté. CI/image/runtime 437 restent à
recevoir. Premiers offsets internes de gardes 724/755 corrigés.

Le contenu et ses décisions ne sont pas globalement certifiés par ces tests.
Standards de sélection/temps/budget, dispatch manuel SYNTHESIZE_S vers Notoria,
writeback I/BrandAction, remap UUID, versions source et contrat COMPLETE/strict
restent à factoriser avant C3/C4/C6. L’entrée manuelle doit converger vers le
calcul existant avec assistance Notoria facultative. Cycles, modes, isolation et les sept chantiers
restent ouverts. Décision Accepted : factorisation de doctrine existante, sans
doctrine ni fonction nouvelle ; livraison et réception restent candidates.
auditAllStrategies reste une limite statique non reproduite/corrigée : ACTIVE
seul et flag manuel false non consulté avant Process. Reproduire DRAFT/VALIDATED
et manuel false, puis séparer fraîcheur/lancement automatique à C5/échéances ;
la réception de propagateFromPillar ne vaut pas réception de cet audit global.

[Réception bornée](../RECEPTION-ECRITURE-SYNTHESE.md) ·
[dette et déclencheur Guidance](../RESIDUAL-DEBT.md).
