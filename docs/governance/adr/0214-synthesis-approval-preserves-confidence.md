# ADR-0214 — Approuver une synthèse relue sans fabriquer sa confiance

- **Status** : Proposed
- **Date** : 2026-10-09
- **Phase** : Réception partielle Shinkiro C3/C4/C6 — runtime 6.27.436 reçu
- **Depends on** : ADR-0060, ADR-0088, ADR-0102, ADR-0124, ADR-0174
- **Supersedes** : — (extension des routes et du gateway existants)

## Contexte

Le faux label « Stratégie Validée » depuis le seul statut ACTIVE avait été
réparé en 434. Deux défauts distincts restent alors : l’absence de mesure rendue
0 % et strategy.validateSynthesis qui impose confidence=1.0 après confirmation,
y compris sans S composé. Deux écritures indépendantes de S et Strategy peuvent
laisser une décision partielle ; la route générique de transition n’en partage
pas le contrat. Une approbation humaine doit désigner le contenu effectivement
relu, pas fabriquer une certitude ni lancer une production implicite.

S est un tableau de synthèse calculé (ADR-0088), pas un second questionnaire.
Les contrats canoniques séparent sa composition ENRICHED des entrées
supplémentaires nécessaires à la maturité globale COMPLETE. Exiger cette dernière
comme unique permission d’approbation introduirait une dépendance artificielle
aux outils de maturité ; l’approbation ne peut pas déclarer ces exigences reçues.

Cette décision appartient à Guidance, dans le spine MESTOR et l’infrastructure
de transition existants. Elle précède les projets explicitement dérivés de la
synthèse ; elle ne conditionne pas chaque travail indépendant de campagne ou
d’actif et ne démontre ni superfans, livraison client, revenu ou cycle complet.

## Décision

- Étendre le service existant pillar-gateway par validation-status.ts, une
  primitive de décision d’état réutilisée par pillar.transitionStatus et l’entrée
  compatible strategy.validateSynthesis. Réutiliser
  LEGACY_PILLAR_TRANSITION_STATUS et la restriction opérateur, sans nouvelle
  entité, service, kind, router, page, outil, Neter ou permission.
- Inspecter S par son contrat canonique : stade ENRICHED ou COMPLETE et
  PillarSSchema strict. Afficher les états absent/incomplet/composé ; ne pas
  déclarer COMPLETE depuis la seule approbation.
- Exiger expectedVersion pour l’approbation S. Recharger si la version a changé.
  Relire l’acteur et sa portée actuels sous verrou de Strategy et des lignes
  Pillar source ; contrôler staleAt, fraîcheur des dépendances et validations
  croisées dans la même transaction. Contrôler aussi les références S déclarées
  vers une cible absente, y compris sprint90Days, risques et hypothèses.
- Conserver confidence, content, provenance et currentVersion. null, valeur non
  finie ou hors intervalle ne sont pas des mesures ; zéro reste une mesure zéro.
  Le champ compatible forceConfidence signifie seulement confirmation de la
  décision après lecture lorsque la confiance est faible ou inconnue.
- Persister S.validationStatus et Strategy.status atomiquement. Réessayer la
  même approbation/version ne réécrit pas ses timestamps ; retourner S en DRAFT
  retire Strategy VALIDATED. Une erreur sur la seconde écriture annule la première.
- L’approbation S ne déclenche ni fournisseur ni framework automatique. Les
  déclenchements ADVE existants ne sont pas redéfinis par cette extension.
- generateProjectsFromActions conserve son kind existant mais requiert
  l’opérateur et une synthèse approuvée/composée/fraîche au début de la commande,
  avant ses effets. Ce contrôle ne vaut pas atomicité de l’ensemble de la
  production après libération des verrous.
- Dans la page forge existante, garder la confiance visible après approbation,
  rendre l’inconnu sans barre artificielle, expliquer la composition et rendre
  les refus visibles. La confirmation conserve la version relue ; aucune marque
  réelle n’est approuvée par une recette synthétique.

## Conséquences

La composition, la mesure de confiance et la décision humaine deviennent trois
faits distincts. La maturité globale et les autres chemins métier restent
soumis à leurs contrats propres ; la réparation de deux routes ne certifie pas
tous les écrivains ou consommateurs S.

Contre-exemples locaux PostgreSQL : absence/partiel, confiance 0.22/0/null,
version changée, staleAt/référence orpheline, acteurs hors portée/rôle périmé,
rollback, concurrence/retry et refus de projet avant effets. Quatorze cas ciblés
verts, cinq cas natifs synthétiques reçus : absence/partiel non approuvables,
confirmations gardant 22 % ou mesure inconnue, conflit 409 puis nouvelle
lecture/approbation. Contenu inchangé/zéro AICostLog, sans production ; suites
locales complètes 4 190/400 unitaires et 288/15 PG vertes. Stress-full en échec
après redémarrage mémoire Next dev. Copie native finale reçue sur fixture, deux
réponses 200 et zéro ≥500/exception sur ses gestes complets seulement, confiance
null/contenu conservés. Le défaut confidence=1.0 remis en place donne trois
rouges puis trois verts après restauration exacte, onze non sélectionnés.
Gauntlet final cinq exit 0/gouvernance 1 620/166 reçu, 24 warnings préexistants ;
fixture nettoyée et serveur arrêté. Source 80e2122f/CI 37979818869/image
37980217686/runtime 436 exact reçus. Native réelle SPAWT en lecture seule : S
existe à 91 %/AI_PROPOSED v3 mais non approuvable. Readiness canonique
COMPLETE/100/stale et schéma strict en désaccord sur 80 chemins de types/liens/
structure, pas 80 faits business absents. Réconcilier contrats/formes historiques/
S calculé et consommateurs avant C3/C4/C6, sans gate affaiblie ou contenu inventé.
Postmerge documentaire et parcours réels restent ouverts ; revue statique
d’autres écrivains/consommateurs S bornée, sans couverture globale.
Aucun verrou ni borne n’est affaibli, ADR Proposed conservé.

## Amendement 6.27.564 — un contrat S unique (point F2 Shinkiro, 11 novembre 2026)

**Désaccord reproduit sur `main` 6.27.562.** La maturité canonique de S
(`pillar-maturity/assessor.ts:assessPillar`, contrat
`pillar-maturity-contracts.ts:buildContracts`) ne vérifiait que la présence des
champs ; le schéma strict (`pillar-schemas.ts:PillarSSchema`) était lu à part par
`validation-status.ts:inspectSynthesis`. Une forme historique synthétique, toutes
clés présentes, était COMPLETE/100 pour la maturité et refusée sur dix chemins
par le schéma (identifiants non UUID, montant en texte, fréquence hors
énumération, cardinalités, `pillarsLinked` à un seul pilier, route unique) ; un S
courant à un seul indicateur pour cinq exigés, COMPLETE/100 aussi ; un S calculé
à trois objectifs ou à un objectif trop long pour un critère court, ENRICHED
(« Enrichi ») sans être composable. Le gateway persistait alors `COMPLET` dans
le cache de complétude d’un S refusé. Le consommateur `sequence-vault` jugeait
la maturité de S par sa confiance (≥ 0,3 / ≥ 0,6) : un S historique à 0,912
ouvrait les séquences, un S calculé composé (confiance 0 par construction) les
fermait. Lecture locale des quatre S de canon du dépôt : trois COMPLETE/100 et
un ENRICHED/95, chacun refusé par le schéma sur 23 à 26 chemins (comptes
seulement, contenus non repris dans les tests).

**Décision.** Un seul contrat, le schéma strict, lu à trois niveaux :

- *Admission* (tout écrivain de S, dans `pillar-gateway/index.ts`) : le gate de
  forme existant s’applique à toute écriture de S, quelle que soit l’option de
  l’appelant (import de canon, édition partielle, complétion). Un brouillon
  incomplet reste admis ; une corruption de forme, qu’aucun niveau ne sait
  classer, est refusée. Restauration exemptée comme avant.
- *Composition* (`ENRICHED`) : `strictContentIssues` (contrats de maturité,
  `STRICT_CONTENT_PILLARS = {s}`) borne le stade : un S que le schéma refuse
  reste `INTAKE` (« Brouillon »), ses chemins refusés sont listés dans `invalid`,
  `missing` et `needsHuman`, son pourcentage est plafonné sous 100. `readiness`
  émet enfin la raison déclarée `ZOD_STRICT_FAILED` ; `consistencyCheck` gagne
  l’invariant « stade composé ⇒ schéma accepté ». `inspectSynthesis` ne parse
  plus de son côté : composé ⇔ stade ENRICHED ou COMPLETE.
- *Complétude* (`COMPLETE`) : toutes les clés présentes et acceptées.

Aucune normalisation implicite : le contenu stocké est lu tel quel. Le
normaliseur d’ADR-0172 n’est pas utilisé pour ce verdict, car il transforme des
identifiants lisibles en UUID qui ne désignent rien et extrait des nombres de
textes qualitatifs ; les lecteurs, eux, lisent le contenu stocké, et un verdict
sur une vue normalisée recréerait le désaccord. La reprise explicite et tracée
d’une forme historique est le recalcul gouverné existant (`PROTOCOLE_S`,
`REPLACE_FULL`, version archivée, revue retirée). L’auto-filler ne réécrit
jamais une valeur présente refusée (`requirementsToFill`). Le score structurel
reste gelé (ADR-0102) : `satisfied` est inchangé, seuls le stade, le
pourcentage et les manques changent. `sequence-vault` lit la maturité de S par
le contrat ; les autres piliers gardent leur règle. Seul S est concerné : les
piliers ADVE gardent leur tolérance documentée aux brouillons (ADR-0172).

**Conséquences.** Les S historiques ou incomplets cessent d’être annoncés
complets ; leur cache stocké se réaligne à la prochaine écriture (d’ici là
`cacheConsistent=false` les signale). Les séquences qui exigent S `ENRICHED`
exigent un S composé. L’écrivain calculé produit un S composé quand ses
sources sont complètes et un brouillon classé sinon, sans remplissage ni
troncature (cinq indicateurs restent exigés). Réception : voir CHANGELOG
6.27.564 ; aucune donnée réelle, CI, image ni production reçues par ce lot.

[Réception courante et limites](../RECEPTION-VALIDATION-SYNTHESE.md) ·
[reprise planifiée des consommateurs transverses](../RESIDUAL-DEBT.md).
ADR Proposed ; aucune approbation SPAWT/FrieslandCampina, aucun coût fournisseur
et aucune acceptation des sept chantiers/dix gates ne sont déduits.
