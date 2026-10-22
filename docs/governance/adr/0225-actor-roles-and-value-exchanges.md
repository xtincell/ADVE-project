# ADR-0225 — Rôles cumulables et échanges de valeur des acteurs de marque

**Status** : Proposed
**Date** : 2026-10-21
**Phase** : Core / fidélité Oracle, C6-03
**Depends on** : ADR-0037, ADR-0088, ADR-0095, ADR-0174
**Supersedes** : aucune entité ; précise D.personas et V.personaSegmentMap

## Contexte

L’opérateur explicite un modèle à plusieurs publics : un festival communique aux
festivaliers, vend aux sponsors et dépend de stands qui créent et reçoivent du
trafic. Pour SPAWT, les blogueurs foodies sont des partenaires, leur audience est
le public de communication et les restaurateurs sont les clients payants visés.
Une personne peut cumuler des rôles. Le seul paiement ou un intérêt mutuel ne
suffit pas à qualifier un partenaire ou un fournisseur.

D conservait les profils, mais ne structurait pas leurs rôles. La bible V imposait
un produit acheté par persona. L’auto-filler associait arbitrairement les deux
premiers produits aux trois premiers profils et inventait SPECTATEUR si le niveau
manquait. Le lecteur pouvait donc confondre la demande, la contribution et le
financement. Le tronquage propre à Notoria pouvait également perdre des profils.

## Décision

Guidance reste gouverné par Mestor ; D.personas et V.personaSegmentMap existent :
on les étend. Aucun modèle Prisma, contact CRM, service, route, page, Intent,
gestionnaire d’appels, fournisseur, acteur autonome ou Neter supplémentaire.
BRAINS/Governor et le cap 7/7 ne changent pas.

- `D.personas[].actorRoles` est une liste optionnelle et cumulable :
  COMMUNICATION_AUDIENCE, USER, PAYER, PARTNER, SUPPLIER, PRESCRIBER, DISTRIBUTOR.
  Un rôle absent reste inconnu ; aucun classement d’après le nom ou le prix.
- `V.personaSegmentMap[]` reste relié au nom D et aux références produit déjà
  contrôlées. Il reçoit `valueToBrand`, `valueToActor`, `actorCosts` et
  `dependencyConditions`. `productNames: []` est légitime pour un échange sans
  offre. Aucun revenu, achat, niveau d’engagement ou contrepartie n’est obligatoire.
- La dérivation ne conserve que les liens explicitement ciblés par le catalogue,
  sur tous les profils nommés ; aucune attribution par position de tableau.
- Le questionnaire, la bible, l’éditeur existant, les fiches D/V, les mappers
  Oracle et l’export lisent ces mêmes champs. Le contexte qualifié existant porte
  leur sémantique aux calculs et à Notoria. Aucun routage de modèle nouveau.
- Un profil ou un échange documente le modèle, sans prouver un contrat signé,
  un partenaire acquis, une audience mesurée ou un chiffre d’affaires.
- Toute modification réelle reste un amendement ADVE humain par la voie
  `OPERATOR_AMEND_PILLAR`, version attendue, historique et péremption conservés.
  R/T/I/S demandent ensuite une actualisation ; aucun recalcul métier implicite.

## Conséquences

L’analyse peut examiner les dépendances offre/audience/financement et les
conditions de participation sans réduire tous les acteurs à des acheteurs. Ce
contrat permet d’exprimer galerie, festival ou plateforme sans écran sectoriel
parallèle. Les partenaires ne reçoivent aucun accès applicatif par leur rôle D.

La clarification SPAWT est une instruction humaine limitée au schéma économique.
Elle ne valide pas l’intégralité du BMC proposé et ne réécrit pas ses contrats,
tarifs, historiques ou mesures. Les anciennes lignes sans rôles restent lisibles.

Tests : conservation au schéma, édition, fiches D/V, Oracle HTML et texte exporté,
absence d’achat/rôle inféré, contexte des calculs, dérivation sans produits
arbitraires ; route d’amendement réelle sur PostgreSQL isolé, deux émissions,
aucun contrat ou coût modèle créé. Ces tests ne prouvent pas la qualité d’une
analyse IA réelle, la réception de l’ADVE entier ou les 35 chaînes de l’Oracle.
