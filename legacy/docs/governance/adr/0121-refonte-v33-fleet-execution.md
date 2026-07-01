# ADR-0121 — Revamp intégral : couche d'exécution par flotte d'agents pour la refonte v3.3

- **Status** : Accepted
- **Date** : 2026-07-01
- **Deciders** : Alexandre (mandat « carte blanche » du 2026-07-01) · NEFER (session fondatrice)
- **Périmètre** : `docs/governance/refonte-v3.3/{EXECUTION,FLEET-PROTOCOL,WP-PROMPTS,STATUS}.md` + ouverture des cibles closure-roadmap #20-24

## Contexte

L'opérateur demande un **revamp intégral** du projet, structuré pour qu'une **équipe d'agents**
puisse le terminer **sans rien casser**. L'audit de session (2026-07-01, `main`=`f8b4378`) établit :

1. Le revamp est **déjà spéccé** : `docs/governance/refonte-v3.3/` (00-CADRE + 20 fichiers-chantiers
   + 3 annexes, implementation-ready, stratégie big-bang sur branche tranchée par l'opérateur — D-1).
   Interdit n°1 (réinventer la roue) → on n'écrit pas une nouvelle spec, on ajoute la **couche
   d'exécution** qui lui manque : découpage en work packages mono-session, dépendances, gates,
   doctrine anti-collision, board d'état, prompts.
2. La branche `refonte/alignement-v3.3` **n'existe pas** ; aucune implémentation v3.3 n'a commencé.
3. Le repo a avancé depuis la rédaction du cahier (2026-05-31) : ADRs 0104-0120 occupés (l'ANNEXE-C
   réservait 0088-0095, désormais **en collision**), CHANGELOG v6.27.75, cibles closure-roadmap
   partiellement périmées (ex. cible #3 largement couverte par les LOTs sécurité LLM #313-317).
4. Baseline saine : tsc 0 · eslint 0 erreur · governance 876/876 · madge 0 cycle.
5. Dette vivante hors-v3.3 substantielle mais tracée (RESIDUAL-DEBT, heal-report 2026-06-30, plans).

## Décision

1. **Trois flux** : **A** = big-bang v3.3 sur `refonte/alignement-v3.3` (L0→L4, sous-branches par WP,
   PRs vers la branche refonte, un seul merge final) ; **B** = dette main-flow en PRs normales vertes
   (permis par D-4) ; **C** = ledger de décisions opérateur (needsHuman → draft `INFERRED`, jamais de
   blocage silencieux). Catalogue complet : [EXECUTION.md](../refonte-v3.3/EXECUTION.md).
2. **Un WP = une session d'agent = une sous-branche = une PR = un claim de fichiers** déclaré dans
   [STATUS.md](../refonte-v3.3/STATUS.md) (anti-collision par possession de fichiers, single-writer
   par ligne). STATUS est l'état **d'exécution WP** — il ne duplique pas le ledger des **cibles**
   (D-5 respecté : les cibles restent dans closure-roadmap).
3. **Codemod-first** : tout rename L1 est un script idempotent committé (`scripts/refonte-v33/`),
   ce qui rend la branche longue **rebasable à volonté** sur un `main` vivant (rebase aux frontières
   de lot + re-run codemods) — condition de survie du big-bang face au flux B.
4. **Renumérotation ADR** : les numéros 0088-0095 de l'ANNEXE-C sont symboliques (occupés depuis) ;
   numéro réel = premier libre à la création (règle first-come, précédent Phase 18) ; correspondance
   consignée dans l'en-tête d'ANNEXE-C au fil de l'eau.
5. **Ouverture des cibles #20-24** dans closure-roadmap (statut NOT_STARTED), au titre du mandat
   carte blanche — l'ANNEXE-C §C.4 requérait une décision opérateur explicite ; la ratification
   formelle = review de la PR porteuse (**DEC-1**).
6. **Gates non négociables par session** : typecheck + madge toujours verts (même en lots à CI
   « rouge tolérée ») ; tout rouge de branche est listé avec son WP résorbeur et la liste finit vide
   à L4 ; `main` ne reçoit que du vert. Détail : [FLEET-PROTOCOL.md](../refonte-v3.3/FLEET-PROTOCOL.md).

## Alternatives écartées

- **Une méga-session unique** qui exécute tout le big-bang : contradiction avec la demande (équipe
  d'agents), non-résiliente (une session perdue = tout perdu), et incompatible avec les points de
  review opérateur (socle L2, merge L4).
- **Incrémental sur `main`** : déjà écarté par l'opérateur (D-1, v1 du cahier archivée).
- **Nouveau répertoire `docs/governance/revamp/`** : créerait une 2ᵉ maison pour la même refonte —
  la couche d'exécution vit DANS `refonte-v3.3/` (« tout vit dans refonte-v3.3/ », stub du cahier).
- **Manifest JSON parallèle** : STATUS.md markdown suffit aux agents et aux humains ; un JSON
  dupliquerait l'état (drift garanti).

## Conséquences

- Une flotte peut exécuter les 22 WP flux A + 10 WP flux B en sessions indépendantes, avec 3 points
  de review humaine (socle L2, L4, décisions C).
- `main` reste vert en permanence ; l'échec du big-bang resterait sans impact (B-5 : abandonner =
  supprimer la branche).
- Coût : discipline STATUS/claims à chaque session ; rebases périodiques de la branche longue.
- Suivi : cibles #20-24 (closure-roadmap) + STATUS.md ; clôture = DoD 00-CADRE §0.10-0.11 + flux B
  soldé + ledger C sans bloquant.
