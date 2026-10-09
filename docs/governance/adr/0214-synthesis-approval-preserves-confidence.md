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

[Réception courante et limites](../RECEPTION-VALIDATION-SYNTHESE.md) ·
[reprise planifiée des consommateurs transverses](../RESIDUAL-DEBT.md).
ADR Proposed ; aucune approbation SPAWT/FrieslandCampina, aucun coût fournisseur
et aucune acceptation des sept chantiers/dix gates ne sont déduits.
