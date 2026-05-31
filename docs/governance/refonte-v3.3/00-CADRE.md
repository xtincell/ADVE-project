# 00 — CADRE & INDEX
## Cahier des charges détaillé — Refonte d'alignement Code ↔ Blueprint v3.3 (big-bang sur branche dédiée)

> **Ce document est le cadre + l'index** du cahier détaillé. La spécification opposable vit dans **20
> fichiers-chantiers** (R1-R8 · E1-E3 · C1-C9), un par chantier, chacun implementation-ready. Ce
> fichier pose les invariants, la stratégie d'exécution, et l'ordre des lots. Il **supersède** le
> cahier-maître `docs/governance/CAHIER-REFONTE-ALIGNEMENT-V3.3.md` (qui reste comme synthèse haut-niveau).
>
> Nommage cible : **CANON v3.3**. État actuel du code désigné par l'ancien nom entre `code`.

---

## 0.1 — Objet & hypothèse directrice

**Objet.** Conduire le code à l'état **CANON v3.3 pleinement implémenté** : renommage intégral +
entités-socle manquantes + implémentation des 9 chapitres du `CAHIER_DES_CHARGES.md`.

**Hypothèse directrice (D-0, confirmée par l'opérateur).** Sens = **code → blueprint**. Le corpus fait foi.

**Stratégie d'exécution (D-1, confirmée par l'opérateur).** **Big-bang sur une branche dédiée.** Tout
se fait en un seul chantier coordonné sur une branche isolée ; **`main` n'est jamais cassé**. La CI de
la branche refonte **peut être rouge** en cours de route ; elle doit être **verte avant le merge** vers
`main`. *Alternative écartée — incrémental par PR sur `main` (vagues) :* plus sûr en continu mais
beaucoup plus long, et l'opérateur a tranché le big-bang isolé.

---

## 0.2 — Périmètre : 3 chantiers, 20 fichiers

| Chantier | Fichiers | Comble |
|----------|----------|--------|
| **A — La Grande Renomination** | `R1`…`R8` | Drift de nommage (audit §2) |
| **B — Les entités-socle** | `E1`…`E3` | `PilotingRegime`, score 8-dim, zone-indices |
| **C — Les 9 chapitres** | `C1`…`C9` | 5 trous rouges + 4 jaunes du `CAHIER_DES_CHARGES.md` |

**Index des fichiers-chantiers** (ce répertoire `docs/governance/refonte-v3.3/`) :

```
00-CADRE.md                  ← (ce fichier) cadre, invariants, stratégie, ordre, DoD
R1-mestor-sia.md             R5-jehuty-notoria-argos-perankh.md
R2-artemis-neith.md          R6-yggdrasil-arbre-seve.md
R3-tarsis-shai.md            R7-zombie-latent.md
R4-hunter-wepwawet.md        R8-financial-brain-thot.md
E1-piloting-regime.md   E2-scoring-engine-8dim.md   E3-zone-indices.md
C1-efr-echec-icp.md     C2-donnees-souverainete.md  C3-activation-j0-j7.md
C4-sla.md               C5-amendement-adve.md       C6-pricing-localise.md
C7-console-kpis-agence.md  C8-brownfield-multi-marques.md  C9-pi-contrat-type.md
ANNEXE-A-alias-maps.md   ANNEXE-B-inventaire-fichiers.md   ANNEXE-C-adr-tests.md
```

Chaque fichier-chantier porte la structure canonique : **Trou comblé · Ancrage canon · Décisions
tranchées · Surface code (modèle Prisma · Intent+Zod · gate · service · tRPC · UI manual-first · tests) ·
Inventaire fichiers · Critères d'acceptation · Frictions remontées.**

---

## 0.3 — Hors périmètre

- Aucune fonction métier au-delà des 9 chapitres.
- Aucun relèvement du cap **7/7** (renommage substitue, n'ajoute pas).
- Aucune réécriture de l'historique hash-chaîné (Loi 1).
- Aucune migration de stack.
- Phase 22 Argos (trigger = demande explicite opérateur) ; R5 **pré-câble** seulement son nommage.

---

## 0.4 — Stratégie d'exécution big-bang sur branche

```
   main ───●───────────────────────────────────────────────●─────►  (protégé, jamais rouge)
            \                                              /
             \  refonte/alignement-v3.3                   /  ← UN seul merge final,
              ●──[L0]──[L1]──[L2]──[L3]──[L4 stabilise]──●     quand 100% vert
                 alias  renames entités chapitres  bascule HARD
                 (CI branche : rouge tolérée en L0→L3, verte exigée à L4)
```

**Règles de la branche refonte :**
- **B-1.** Branche longue `refonte/alignement-v3.3` créée depuis `main`. Tout le travail y atterrit.
- **B-2.** Sous-branches optionnelles par lot (`refonte/L1-renames`, …) mergées dans la branche refonte. Pas de PR vers `main` avant L4.
- **B-3.** La CI de la branche refonte est **informative** : elle peut être rouge pendant L0→L3. La CI de `main` reste verte (main intouché).
- **B-4.** **Merge vers `main` = une seule grosse PR**, ouverte seulement quand la DoD de merge (§0.11) est verte. Idéalement derrière une fenêtre de gel produit courte.
- **B-5.** **Rollback = trivial** : tant que L4 n'a pas mergé, `main` est intact ; abandonner = supprimer la branche.

---

## 0.5 — Les 5 invariants intouchables (valables MÊME en big-bang)

- **INV-1 — Cap 7/7.** `BRAINS` = 7 Neteru + étiquette `INFRASTRUCTURE`. Le renommage ne change pas le compte.
- **INV-2 — Layering cascade.** `domain → lib → governance → services → trpc → components/neteru → app`. `madge --circular` vert avant merge.
- **INV-3 — Manual-first parity (ADR-0060).** Toute capability LLM neuve a son UI manuelle. Tests HARD `assembler-uses-manual-path` verts avant merge.
- **INV-4 — Loi 1, hash-chain immuable.** *Le big-bang ne dispense PAS de ceci.* Aucun `UPDATE` rétroactif des lignes `IntentEmission` existantes. Les identifiants persistés (`governor`, `intentKind`, palier en base) gardent leurs valeurs historiques ; la **couche d'alias Classe P (§0.6) est obligatoire** car c'est une contrainte de **données de production**, pas de branche.
- **INV-5 — Anti-drift CI vert avant merge.** La suite `tests/unit/governance/*` est verte au moment du merge vers `main` ; tout test muté l'est dans la branche.

---

## 0.6 — Doctrine des deux classes d'identifiant *(colonne vertébrale — inchangée par le big-bang)*

| Classe | Définition | Exemples (confirmés par audit) | Régime |
|--------|-----------|--------------------------------|--------|
| **S — Symbole** | Vit en code/doc, jamais sérialisé | dossiers (`mestor/`), classes, types (`Governor`), fonctions, texte docs, slugs ADR | **Renommage direct** (codemod), big-bang sur la branche. |
| **P — Persisté/wire** | Sérialisé en base / chaîne | `IntentEmission.governor` (`@default("MESTOR")`), `IntentEmission.intentKind` (`"ARTEMIS_*"`, `"MESTOR_*"`…), palier en snapshot s'il est caché | **Alias** old→new : écriture en v3.3, **lecture tolérante des deux**, **jamais d'UPDATE rétroactif**. |

**Clause hash-chain (opposable).** `selfHash = H(prevHash ‖ payload_tel_qu'écrit)`. Renommer en
écriture **future** n'altère aucun maillon passé ; la vérification lit les valeurs telles qu'écrites.
Le big-bang renomme les **symboles** d'un coup, mais **n'écrase jamais** une valeur déjà chaînée. La
map d'alias (`ANNEXE-A`) est donc livrée en **L0, avant** tout codemod.

---

## 0.7 — Tableau des décisions tranchées

| Réf | Décision | Tranche |
|-----|----------|---------|
| D-0 | Sens de l'alignement | code → blueprint v3.3 |
| D-1 | Stratégie d'exécution | **big-bang sur branche dédiée**, `main` protégé |
| D-2 | Identifiants persistés | alias + écriture v3.3, **zéro UPDATE rétroactif** (Loi 1) |
| D-3 | Découpage livraison | **un seul merge final** vers `main` ; lots internes L0→L4 sur la branche |
| D-4 | Gel de fonctionnalités | **la branche EST le bac à sable** ; `main` reste ouvert au flux normal |
| D-5 | Format de suivi | fold dans `closure-roadmap.md` (cibles #20→#24), pas de ledger parallèle |
| D-6 | Profondeur du cahier | **implementation-ready**, un fichier par chantier |

---

## 0.8 — Ordre des lots de travail (interne à la branche)

| Lot | Contenu | CI branche | Raison de l'ordre |
|-----|---------|-----------|-------------------|
| **L0** | Map d'alias Classe P (`ANNEXE-A`) + 9 gates anti-drift en **mode soft** | doit rester verte | rien ne doit casser la sémantique des données avant les renames |
| **L1** | Renames R1-R8 (sweep big-bang des symboles + bascule écriture v3.3) | rouge tolérée | gros diff mécanique |
| **L2** | Entités-socle E1 → E2 → E3 (E1 d'abord : débloque C1/C3/C8) | rouge tolérée | dépendances socle |
| **L3** | Chapitres C1-C9 (C1 après E1+E2 ; C6 après E3) | rouge tolérée | dépendances métier |
| **L4** | Stabilisation : gates soft→**HARD**, CODE-MAP régén, 7 sources sync, typecheck/lint/madge/suite verts → **PR de merge vers `main`** | **verte exigée** | porte de sortie |

---

## 0.9 — Synchronisation des 7 sources de vérité (rappel, vérifié en L4)

`BRAINS` (`src/server/governance/manifest.ts`) · `Governor`/`GOVERNORS` (`src/domain/intent-progress.ts`) ·
`LEXICON.md` · `APOGEE.md` · `PANTHEON.md` · `CLAUDE.md` · `neteru-coherence.test.ts`.
Plus : `STATE_FINAL_BLUEPRINT.md`, 87 ADR, `CODE-MAP.md` (régénéré), `INTENT-CATALOG.md`, maps.

---

## 0.10 — Critère de complétude (« aligné »)

1. Zéro symbole Classe S legacy en `src/` (hors alias `@deprecated-wire` annotés).
2. Les 7 sources nomment les Neteru en v3.3 ; `neteru-coherence` vert HARD.
3. `PilotingRegime`, `scoring-engine` (8-dim), `seshat/zone-indices` existent, gouvernés par **Sia**, testés.
4. 5 trous rouges fermés (entité + Intent + gate + UI manual-first) ; 4 jaunes fermés/reportés tracés.
5. `closure-roadmap.md` : cibles #20-24 en `SHIPPED`.

---

## 0.11 — Definition of Done du merge vers `main` (porte L4)

```
[ ] typecheck (tsc --noEmit) vert
[ ] lint (next + lafusee/*) vert
[ ] madge --circular vert
[ ] suite tests/unit/governance/* verte, 9 gates refonte en HARD
[ ] CODE-MAP régénéré (npx tsx scripts/gen-code-map.ts)
[ ] 7 sources de vérité synchronisées (v3.3)
[ ] alias Classe P complets (wire-alias-completeness HARD)
[ ] RESIDUAL-DEBT + closure-roadmap mis à jour
[ ] revue opérateur (NEFER/Alexandre) de la PR de merge
→ Si coché : merge big-bang vers main autorisé.
```

---

## 0.12 — Ancrage closure-roadmap

| Cible | Couvre | Phase |
|-------|--------|-------|
| #15 (exist.) | E2 score 8-dim | 24 |
| #18 (exist.) | E3 zone-indices + C6 | 26 |
| #19 (exist.) | R8 `financial-brain→thot` | 25 |
| **#20** (neuve) | Chantier A (R1-R7) | — |
| **#21** | E1 PilotingRegime | — |
| **#22** | C1+C3+C4 | — |
| **#23** | C2+C9 | — |
| **#24** | C7+C8 | — |

Chaque cible neuve = un ADR avant dev (`ANNEXE-C`).

---

*00-CADRE — Cahier détaillé de refonte v3.3. Big-bang sur branche dédiée, main protégé. De la poussière à l'étoile.*
