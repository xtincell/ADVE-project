# PROTOCOLE FLOTTE — exécuter un WP sans rien casser

> Doctrine **par session d'agent**. S'applique à tout WP de [EXECUTION.md](EXECUTION.md).
> C'est la déclinaison opérationnelle du protocole NEFER 8 phases ([NEFER.md](../NEFER.md)) au cas
> « flotte d'agents sur un même programme ». En cas de conflit apparent : la spec du chantier prime,
> puis 00-CADRE, puis ce protocole.

---

## 1. Les dix règles d'or

1. **Un WP par session.** Tu prends UN WP dans [STATUS.md](STATUS.md), tu le finis ou tu le rends
   BLOCKED(raison). Jamais deux WP entamés, jamais de scope opportuniste hors claim.
2. **Claim avant code.** Passe ta ligne STATUS à `IN_PROGRESS` + déclare tes fichiers/globs dans la
   colonne claim, **dans ton premier commit**. Chevauchement avec un claim actif → STOP, prends un
   autre WP.
3. **Bonne cible de PR.** Flux A → PR vers `refonte/alignement-v3.3` (sous-branche
   `refonte/<lot>-<chantier>-<slug>`). Flux B → PR vers `main` (branche `claude/...` ou `fix/...`).
   La SEULE PR flux A → `main` est celle du WP-A21 (L4).
4. **La spec fait foi.** Le fichier-chantier (R*/E*/C*) est opposable : décisions tranchées,
   critères d'acceptation, frictions. Tu ne re-décides pas ce qui est tranché ; tu remontes une
   friction si la réalité contredit la spec (elle a peut-être bougé depuis 2026-05-31 — le repo
   avance vite ; **grep d'abord**, la surface réelle prime sur les comptes de l'annexe).
5. **Typecheck + madge toujours verts**, même quand la CI de branche est « rouge tolérée ». Les
   rouges tolérés sont UNIQUEMENT des tests listés dans STATUS §Rouges-attendus, avec le WP résorbeur.
6. **Zéro invention de données.** Trou → `EmptyState` / `_mocked` / `DEFERRED_AWAITING_CREDENTIALS`
   + ligne au registre. Zéro `UPDATE` rétroactif d'une ligne hash-chaînée (INV-4). Zéro bypass
   `emitIntent` (interdit n°2). Zéro entité doublon sans grep CODE-MAP + ADR (interdit n°1).
7. **Codemod-first pour tout rename** : script idempotent sous `scripts/refonte-v33/`, committé avec
   son sweep. Si ton WP n'est pas un rename mais en croise un, tu ne renommes RIEN toi-même.
8. **needsHuman = draft INFERRED, pas blocage.** Information non-inférable → tu poses UNE question
   (ledger DEC d'EXECUTION §5 + body de ta PR), tu livres la version draft marquée `INFERRED` quand
   la doctrine le permet, l'opérateur flippe ensuite.
9. **Documente dans la même PR** : CHANGELOG (obligatoire — hook husky), STATUS.md (ta ligne),
   RESIDUAL-DEBT si tu crées/rembourses de la dette, scope-drift.md si label `out-of-scope`,
   CODE-MAP régénéré si entité structurelle touchée (hook pre-commit le fait).
10. **Rends l'état meilleur que trouvé.** Tout rouge non listé que tu découvres : tu le répares si
    ≤ 30 min, sinon tu l'inscris (STATUS §Rouges-attendus ou RESIDUAL-DEBT) — jamais silencieux.

---

## 2. Cycle de vie d'un WP (mapping NEFER 8 phases)

```
Phase 0 — Contexte : lire CLAUDE.md, 00-CADRE.md, EXECUTION.md (ton bloc WP), STATUS.md,
          TA spec chantier, les ADRs cités. git log -10 sur ta branche de base.
Phase 0bis — Baseline d'entrée : npm ci && npx prisma generate, puis
          `npm run typecheck && npm run lint && npx vitest run tests/unit/governance && npm run audit:cycles`.
          Compare aux Rouges-attendus de STATUS. Écart inattendu → STOP, ne bâtis pas sur du sable :
          consigne l'écart dans STATUS + prends contact (PR draft ou question DEC).
Phase 1-2 — Examen + anti-doublon : grep CODE-MAP + surfaces réelles (les chiffres de l'ANNEXE-B
          datent de 2026-05-31 ; recompte avant de sweeper).
Phase 3 — Claim : STATUS → IN_PROGRESS + fichiers. Crée ta sous-branche.
Phase 4 — Exécution : petite série de commits Conventional Commits (scopes commitlint valides).
Phase 5 — Vérification : baseline de sortie (mêmes commandes) + critères d'acceptation de TA spec,
          un par un, cochés dans le body de PR.
Phase 6 — Documentation : CHANGELOG + STATUS + docs listées par ta spec.
Phase 7 — PR : cible correcte (règle n°3), body = spec-checklist + baseline avant/après + frictions.
          Label phase/* ou out-of-scope (+ ligne scope-drift même PR).
Phase 8 — Si tu détectes un drift que TU as introduit : corrige avant handoff, pas de dette muette.
```

## 3. Gates de sortie (commandes exactes)

| Gate | Commande | Flux A (L1-L3) | Flux B / L0 / L4 |
|---|---|---|---|
| Typecheck | `npm run typecheck` | **0 erreur** | **0 erreur** |
| Lint | `npm run lint` | 0 erreur (warnings pré-existants tolérés) | 0 erreur |
| Cycles | `npm run audit:cycles` | **vert** | **vert** |
| Governance | `npx vitest run tests/unit/governance` | vert **hors** Rouges-attendus listés | **876+/876+ vert** |
| Suite complète | `npx vitest run` | recommandé | requis si surface runtime touchée |
| Prisma | `npx prisma validate` (+ migration additive si modèle) | requis si schéma touché | idem |
| Build | `npm run build` | — | requis si surface app/route touchée |
| Critères spec | checklist du fichier-chantier | **tous cochés ou tracés** | idem |

Baseline de référence du programme (2026-07-01, `f8b4378`) : tsc 0 · eslint 0 erreur/1 warning
(`xlsx-parser.ts` no-direct-service) · governance 876/876 (83 fichiers) · madge 0 cycle/1410 fichiers.

## 4. Conventions

- **Branches** : flux A `refonte/L<lot>-<chantier>-<slug>` (ex. `refonte/L1-R1-sia`) ; flux B au
  format habituel du repo. La branche longue `refonte/alignement-v3.3` est créée par WP-A0 depuis
  `main` et **rebasée aux frontières de lot** (re-run codemods après rebase).
- **Commits** : Conventional Commits, scope dans l'enum commitlint (WP-A0 ajoute les scopes v3.3).
  Pas de mention de modèle/outil IA dans le contenu versionné.
- **PRs** : draft d'abord ; body = « Spec / Fait / Preuves (baseline avant→après) / Frictions /
  Décisions demandées ». Une PR flux A n'attend PAS la review opérateur pour merger dans la branche
  refonte (self-merge quand gates OK) **sauf** A0, A9-A11 (socle : review d'un pair-agent ou
  opérateur) et A21 (review opérateur obligatoire).
- **ADRs** : « avant dev » d'une cible neuve = l'ADR est le **premier commit** du WP concerné.
  Numéro = premier libre (les 0088-0095 d'ANNEXE-C sont symboliques — occupés depuis).

## 5. Escalade

| Situation | Action |
|---|---|
| Information non-inférable | 1 question ciblée → ledger DEC (EXECUTION §5) + body PR ; livrer draft `INFERRED` si doctrine le permet |
| Spec contredite par le code actuel | Friction dans body PR + note dans le fichier-chantier (section « Frictions remontées ») ; ne pas trancher seul si structurant |
| Claim en collision | Prendre un autre WP ; noter la collision dans STATUS |
| Baseline d'entrée cassée (hors liste) | STOP ; consigner ; réparer si trivial ; sinon la casse devient LE sujet (mini-WP) avant le tien |
| Décision opérateur qui n'arrive pas | Le WP reste BLOCKED ; la flotte prend le prochain WP libre — jamais d'attente active |

## 6. Ce qu'un agent ne fait JAMAIS

- Pousser sur `main` depuis le flux A (hors PR L4 approuvée) ; force-push sur la branche longue ;
  réécrire l'historique partagé.
- `npm audit fix --force` (incident 2026-06-29) ; `prisma db push` ; migration destructive sans
  sign-off ; `UPDATE` d'une ligne chaînée.
- Renommer un identifiant Classe P sans passer par `wire-aliases` ; renommer les `id` Glory /
  `key` sequence (garde R2.3).
- Ajouter un 8ᵉ Neter (INV-1), un test HARD flip sans que son périmètre soit vert, une baseline
  soft sans date de durcissement.
- Déclarer « fait » un critère non vérifié ; laisser un rouge non consigné ; terminer une session
  sans mettre STATUS.md à jour.

---

*FLEET-PROTOCOL.md — créé 2026-07-01 (ADR-0121).*
