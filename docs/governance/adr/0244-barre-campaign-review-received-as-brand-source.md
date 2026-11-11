# ADR0244 — Le bilan de campagne arrêté dans La Barre, reçu comme document de la marque

11 novembre 2026. Proposed. Candidat local, point LB4 du programme Shinkiro.
Dépend d’ADR0217 (raccord La Barre), ADR0218 (identités de marque La Barre), ADR0223
(éditions documentaires) et ADR0124 (spine d’émission).

## Problème

La fiche mensuelle, le texte de clôture d’un projet, le bilan de campagne et la chronologie de
la marque sont des objets distincts. La Barre portait `campagne.bilan` sans geste pour l’écrire
ni l’arrêter, et La Fusée ne recevait aucun bilan : la campagne suivante repartait sans son
diagnostic. Il fallait un document figé côté La Barre, et un réceptacle côté La Fusée qui
l’accueille sans nouveau modèle, sans migration et sans écrire dans un pilier.

## Réceptacles examinés

- `CampaignReport` (`postmortemStructured`, campaign-tracker cluster E) exige un `Campaign`
  La Fusée. Une campagne La Barre n’en a pas : en créer une, ou inventer la correspondance,
  fabriquerait une campagne que personne n’a ouverte. Écarté.
- `BrandAsset` n’a pas de kind de bilan ; c’est un actif produit ou sélectionné, pas une pièce
  reçue à relire. Écarté.
- `BrandDataSource` et sa lignée `_document` (ADR0223) : document de la marque, versionné par
  famille, statut PROPOSED par défaut (« une édition est une preuve, jamais une adoption
  implicite »), `origin` anti-doublon, certitude DECLARED, aucune analyse sans geste explicite.
  **Retenu.**

## Décision

**Côté La Barre.** « Clore le bilan de campagne » est une décision de la fabrique
(`bilan-campagne`, portée campagne, acteur, journal). Elle fige une version dans
`campagne.bilanVersions` : identité stable `BIL-<campagne>`, numéro, date, campagne et marques,
texte, note, décision, acteur déclaré, empreinte précédente et sienne. L’empreinte est le
SHA-256 du JSON aux clés triées, sans le champ `empreinte`. Une version n’est jamais réécrite ;
une nouvelle version exige ce qu’elle change.

**Transport.** `contexte.json` déclare `campaignReviewReception: "CAMPAIGN_REVIEW_V1"`. La Barre
enregistre sa base, puis `POST /la-barre/bilan` n’envoie que `{ campagneId, bilanId, version,
empreinte }`. Même garde que `publication` : session, affectation relue, rôle ADMIN ou OPERATOR,
origine exacte, corps borné à 2 Kio.

**Côté La Fusée.** La route relit la version dans la base enregistrée de La Barre (jamais dans
la requête), vérifie sa forme stricte, recalcule son empreinte, la compare à la demande et, si la
précédente est présente, la chaîne. Les marques sont résolues par le raccord existant
(`resolveBarreBrands`, extrait de `getBarreBrandContext`) sous la personne connectée : aucune
marque lisible ou plusieurs dossiers sont des refus typés, jamais un premier trouvé.
L’Intent gouverné `INGEST_BARRE_CAMPAIGN_REVIEW` (MESTOR, handler `ingestion-pipeline`) range la
version comme `BrandDataSource` MANUAL_INPUT, DECLARED, `origin = barre:<instance>:bilan:<identité>:v<n>`,
puis l’enregistre comme édition PROPOSED de type `CAMPAIGN_REVIEW` (« Bilan de campagne ») par
`registerDocumentEdition`. Le reçu `_barreReview` conserve la version entière, l’instance, la
révision de base lue, la personne qui transmet et les marques non reliées.

Sous verrou consultatif par marque et identité : rejeu à la même empreinte, reçu existant ;
autre empreinte sous un numéro reçu, refus ; version antérieure à la dernière reçue, refus ;
chaîne d’empreintes rompue, refus ; lignée homonyme d’une autre provenance, jamais rejointe
(second nom, puis refus). Accès, rôle délégué et dossier archivé sont revérifiés dans la
transaction.

## Conséquences

- Un `kind` documentaire ajouté (`CAMPAIGN_REVIEW`), un Intent kind, aucun modèle ni migration,
  aucun pilier, aucun appel de modèle, aucune indexation automatique.
- Le bilan reçu est une preuve à relire ; son adoption (référence de travail) reste la décision
  documentaire existante. Il ne nourrit pas encore automatiquement le brief ou la composition de
  la campagne suivante : cette boucle reste à construire sur les lecteurs documentaires existants.
- L’acteur d’une version reste celui déclaré dans La Barre ; La Fusée enregistre séparément la
  personne connectée qui transmet.

Tests anti-dérive : `tests/unit/portfolio/barre-review.test.ts` (contrat commun, route, refus),
`tests/integration/barre-campaign-review.postgres.test.ts` (réception réelle, rejeu, conflit,
ancienneté, chaîne, homonymie, concurrence, accès), jeu commun
`tests/fixtures/la-barre/bilan-campagne-v1.json` identique à celui de La Barre.
