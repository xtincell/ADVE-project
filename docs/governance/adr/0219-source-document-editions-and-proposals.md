# ADR-0219 — Éditions documentaires et propositions stratégiques

- **Status**: Proposed — recette locale reçue, livraison production ouverte
- **Date**: 2026-10-19
- **Phase**: 7 — dossier de marque et guidance
- **Depends on**: ADR-0197, ADR-0198, ADR-0023

## Contexte

Le Lean, le BMC, les études, présentations et autres pièces évoluent. Corriger rawContent détruirait la lecture d’une édition précédente. Une publication plus récente ne prouve pas son adoption : le nouveau BMC SPAWT est une piste postérieure à la précédente, à faire valider par l’équipe.

Audit anti-doublon : CODE-MAP et schema exposent BrandDataSource, BrandSourceUse, FileUpload, BrandContextNode et les versions de piliers. Aucun magasin documentaire séparé n’est nécessaire. Le versionning de piliers et AssetVersion ne sont pas celui du document source.

## Décision

Étendre les sources canoniques et updateSource gouverné : chaque source retenue porte rawData._document, une lignée, une édition séquentielle, le prédécesseur, le label externe, la provenance et la place documentaire. L’inscription d’une édition et une décision d’usage sont des primitives de persistance, sans orchestration Glory, génération, embedding ou nouvel Intent. Le spine existant enregistre l’acteur et l’émission.

- PROPOSED est une hypothèse explicitement non validée par l’équipe. Elle ne retire pas la référence précédente.
- REFERENCE est une référence de travail ; elle ne certifie ni les assertions, ni la traction, ni la décision d’équipe. La retenir est un geste explicite qui conserve la référence précédente en SUPERSEDED.
- ARCHIVED et SUPERSEDED restent lisibles, exclus des analyses courantes. Classement et décision invalident index/dérivés ; les reçus anciens sont refusés avant écriture.
- Texte et original d’une édition retenue sont conservés. Correction, purge et suppression ordinaires ne détruisent pas cet historique. Une nouvelle édition est une nouvelle source ; les droits d’usage ne sont pas transférés automatiquement.
- La lignée est sérialisée par verrous source puis stratégie ; le prédécesseur et l’empreinte relus sont requis. Deux éditions concurrentes fondées sur le même prédécesseur ne peuvent pas être reçues ensemble.
- Dossier documentaire dans Sources, lecteur partagé et études de marché utilisent les mêmes pièces. La liste d’analyses se borne à la marque choisie, même pour l’admin.

Tutelle : Guidance / Mestor pour l’entrée gouvernée, lecteurs Seshat pour la connaissance. La chaîne explicite est source fidèle → conseil qualifié → décision de marque → production et relation d’audience. Pas d’écriture ADVE automatique ; amendement opérateur par la voie existante uniquement. Pas de nouveau modèle Prisma, routeur, service autonome, agent, provider ou gestionnaire d’appels.

## Conséquences

Migration de schéma inutile ; sources legacy compatibles. Les assertions d’un fichier et son statut documentaire restent distincts de leur certitude. Tous les formats entrent au dossier avec leur état réel de lecture ; un original binaire ou une archive inventoriée ne vaut pas lecture sémantique de son contenu.

Tests métier : préservation référence/proposition, succession, décision humaine, historique immutable, reçus périmés, isolement et concurrence réelle PostgreSQL. Recette native synthétique distincte de la réception de source/CI/image/runtime et de l’absorption du Drive réel. Aucun chantier global clôturé par ce seul lot.
