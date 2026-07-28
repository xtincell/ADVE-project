# ADR-0185 — Le livre de marque composé : référence, et rang 2 de l'ancrage

- **Statut** : Accepted
- **Date** : 2026-07-28
- **Portée** : livrable client (pair de l'Oracle) · cascade d'ancrage documentaire (ADR-0184)
- **Gouverneur** : aucun — **lecture seule, aucun Intent, aucune mutation**. Cap APOGEE 7/7 préservé.
- **Zéro LLM** sur tout le chemin.

## Contexte

Demande opérateur, formulée deux fois dans les mêmes termes :

> *« je rappelle qu'un brandbook au format de la fusée est censé exister et
> puiser dans les sources et l'advertis pour se formaliser afin de devenir la
> seule source de vérité (avec vue html et export pdf, comme l'oracle) »*

Ce qui existait ne répondait pas à ça. `brand-bible-pdf.ts` compile les sorties
de la séquence Glory `BRANDBOOK-D` : douze briefs **produits par modèle**, sur le
**seul pilier Distinction**. C'est un livrable créatif — utile, mais ce n'est pas
un état des lieux. Il ne lit ni les piliers fondateurs, ni un seul document de la
marque. Et il n'avait aucune vue HTML.

Le manque s'est aggravé avec [ADR-0184](0184-source-grounding-measured-not-claimed.md) :
l'ancrage documentaire mesure si une proposition vient des documents. Quand
aucun document ne parle du champ visé, il ne reste rien entre « ancré » et
« inventé ». La cascade d'ancrage annoncée avait un rang 2 vide.

## Décision

Un **livre de marque composé**, distinct du deck créatif, qui devient à la fois
le document de référence et le rang 2 de l'ancrage.

### Composition (`brand-bible/compose.ts`)

Déterministe, zéro modèle. On **assemble ce qui est déjà déclaré et documenté** :

- les piliers, champ par champ, dans l'ordre canonique du registre
  (`FIELD_REGISTRY`), avec le libellé canonique et la **provenance réelle** de
  chaque valeur (`HUMAN` / `SOURCE` / `INFERRED` / `UNKNOWN`) ;
- les extraits de documentation qui parlent de chaque volet, **avec leur
  identifiant de source et leur certitude**, via le RAG partagé
  (`loadBrandSourceContext` — le même pool que le conseil et le MCP) ;
- **les manquants NOMMÉS**, volet par volet.

Par défaut le livre ne publie que le socle fondateur A/D/V/E — c'est lui qui fait
référence ; R/T/I/S sont des outils de lecture, disponibles sur demande
(`includeDerived`).

### Une seule mesure de complétude

Le livre **consomme** `completionPct` (contrats de maturité), la mesure déjà
montrée partout dans le cockpit. Il n'en calcule pas une seconde. Deux chiffres
rivaux sur le même sujet, c'est la dérive qu'on passe notre temps à réparer
ailleurs. Quand la mesure est indisponible, le livre affiche « complétude non
mesurée » et **n'est jamais présenté comme complet**.

### Deux surfaces, parité Oracle

- **Vue HTML** `/cockpit/brand/bible` — lecture seule, provenance par élément,
  citations par volet, manquants dépliables.
- **Export PDF** — même route qu'avant (`/api/export/brand-bible/[id]/pdf`), qui
  sert désormais le **livre composé par défaut**. Le deck créatif `BRANDBOOK-D`
  reste servi sous `?deck=1` : c'est un livrable à part entière, pas une
  régression à supprimer.

Les deux passent par `resolveBrandTheme` — le livre est rendu aux couleurs de la
marque (ADR-0169).

## Ce qui n'est PAS fait, et pourquoi

**Le livre ne comble aucun trou.** Un document de référence qui remplirait ses
blancs serait la fabrication la mieux reliée du système : plus dangereuse qu'un
champ vide, parce qu'elle porterait l'autorité du livre — et qu'ADR-0184
l'aurait ensuite comptée comme « source recouvrante ». Ce qui n'est ni déclaré
ni documenté reste vide **et nommé**.

**Aucune écriture.** Le livre lit ; il ne propose pas, ne corrige pas, n'amende
aucun pilier. L'écriture ADVE reste la décision opérateur d'ADR-0085.

## Conséquences

- Un livre à moitié vide s'affiche à moitié vide, et le dit en tête. C'est le
  but : une couverture honnête vaut mieux qu'une complétude de façade.
- Le rang 2 de la cascade d'ancrage existe désormais **pour les marques qui ont
  un socle déclaré**. Une marque sans piliers ni documents n'a toujours rien —
  et c'est exact.
- 0 nouveau modèle Prisma · 0 migration · 0 Intent kind · 0 LLM.

## Vérification

`tests/unit/services/brand-bible-compose.test.ts` (12) : zéro modèle sur le
chemin · pas de mesure rivale de complétude · complétude non mesurée jamais
présentée comme complète · manquants nommés dans les deux rendus · provenance et
citations traçables · lecture scopée à la marque, aucune mutation.
