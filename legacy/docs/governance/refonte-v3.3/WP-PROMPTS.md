# WP-PROMPTS — prompts prêts à coller pour la flotte

> Un opérateur (ou un orchestrateur) lance une session Claude Code par WP avec le prompt
> correspondant. Remplacer `<WP-ID>` et laisser l'agent dérouler [FLEET-PROTOCOL.md](FLEET-PROTOCOL.md).

---

## Préambule commun (inclus dans chaque prompt)

```
Tu es NEFER sur le repo ADVE-project. Exécute le work package <WP-ID> du programme de revamp.

Ordre de lecture OBLIGATOIRE avant toute action :
1. docs/governance/refonte-v3.3/EXECUTION.md        (ton bloc WP + dépendances + fenêtres)
2. docs/governance/refonte-v3.3/FLEET-PROTOCOL.md   (les 10 règles + gates + cycle de vie)
3. docs/governance/refonte-v3.3/STATUS.md           (claims actifs + rouges attendus)
4. La spec de ton chantier (fichier R*/E*/C* référencé par ton bloc WP) + ses ADRs
5. docs/governance/refonte-v3.3/00-CADRE.md         (invariants INV-1..5, classes S/P)

Ensuite : Phase 0bis baseline d'entrée, claim dans STATUS.md, puis exécution.
Ta PR cible la branche indiquée par la règle n°3 du protocole. Tu ne fais RIEN hors de ton claim.
Si une information n'est pas inférable : une seule question ciblée (ledger DEC), draft INFERRED.
```

## Variante RENAME (WP-A1..A8)

```
<préambule commun>
Spécificités rename :
- Livre un codemod idempotent scripts/refonte-v33/codemod-<chantier>.ts AVANT le sweep, committé avec lui.
- Classe P : ne touche JAMAIS une valeur persistée — écriture nouvelle en v3.3, lecture via
  src/domain/wire-aliases.ts (livré par WP-A0). Zéro UPDATE rétroactif.
- Garde R2.3 : id des Glory tools et key des sequences = intouchables.
- Critère de sortie : grep-zéro du terme legacy dans src/ (hors alias @deprecated-wire annotés),
  typecheck + madge verts, critères de TA spec cochés un par un dans le body de PR.
- Recompte la surface réelle avant de sweeper (les chiffres d'ANNEXE-B datent de 2026-05-31).
```

## Variante ENTITÉ-SOCLE (WP-A9..A11)

```
<préambule commun>
Spécificités socle :
- ADR d'abord (premier commit) — numéro = premier libre, consigner la correspondance dans ANNEXE-C.
- Modèle Prisma conforme à la spec, migration ADDITIVE versionnée (prisma migrate dev), jamais db push.
- Toute mutation via sia.emitIntent (post-R1) ; manual-first parity (INV-3) : chaque capability LLM
  a son chemin manuel équivalent, testé.
- Producteur de données partiel → INSUFFICIENT_DATA explicite, jamais de valeur fabriquée (ADR-0046).
- Tests HARD de ta spec livrés ET verts dans la même PR.
- Cette PR exige une review (pair-agent ou opérateur) avant merge dans la branche refonte.
```

## Variante CHAPITRE (WP-A12..A20)

```
<préambule commun>
Spécificités chapitre :
- Vérifie que tes dépendances (colonne « Dépend » d'EXECUTION §3) sont SHIPPED dans STATUS.md ;
  sinon prends un autre WP.
- Structure canonique de livraison : modèle Prisma → Intent+Zod → gate → service → tRPC →
  UI manual-first → tests (l'ordre de ta spec).
- Étends l'existant (la spec liste les briques : value-report-generator, sla-tracker, brand-node,
  staleness-propagator…) — ne double jamais.
- Décision business absente → draft INFERRED + question DEC ; jamais de blocage silencieux.
```

## Variante MAIN-FLOW (WP-B*)

```
<préambule commun — remplacer l'item 4 par la source citée dans le bloc WP (RESIDUAL-DEBT,
heal-report, plan concerné)>
Spécificités main-flow :
- PR courte vers main, TOUS les gates verts (main n'est jamais rouge) : typecheck, lint, cycles,
  suite governance complète, build si surface app touchée.
- Respecte la fenêtre anti-collision de ton bloc (EXECUTION §6.3) — vérifie où en est le flux A
  dans STATUS.md avant de toucher une zone renommée.
- CHANGELOG + (si out-of-scope) ligne scope-drift.md dans la même PR.
```

## Variante STABILISATION (WP-A21, L4)

```
<préambule commun>
Tu es la porte de sortie du big-bang. Ta mission : amener la branche refonte à la DoD du
00-CADRE §0.11, PUIS ouvrir la PR de merge vers main (review opérateur OBLIGATOIRE, pas de self-merge).
Checklist stricte : rebase final sur main + re-run codemods → 13 gates ANNEXE-C en HARD →
CODE-MAP régénéré → 7 sources de vérité en v3.3 (inclut la refresh complète de CLAUDE.md) →
commitlint scopes basculés → RESIDUAL-DEBT + closure-roadmap (cibles #15/#18/#19/#20-24 → SHIPPED) →
typecheck/lint/madge/suite complète verts → PR + tableau de preuve dans le body.
Aucun rouge attendu ne survit à L4 : la liste STATUS §Rouges-attendus doit finir VIDE.
```

---

*WP-PROMPTS.md — créé 2026-07-01 (ADR-0121).*
