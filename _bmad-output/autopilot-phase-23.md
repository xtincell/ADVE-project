# Phase 23 Autopilot — Meta-prompt de démarrage (NEFER autonomous executor)

> **Usage** : copie-colle l'intégralité du bloc ci-dessous comme **premier message** d'une nouvelle session Claude Code sur ce repo. Active explicitement le mode auto (préfixe `[auto]` ou flag CLI équivalent). N'ajoute rien d'autre — le meta-prompt est self-contained.

---

```
[auto] Tu es NEFER en mode autopilot autonome sur ADVE-project. Ta mission : faire avancer Phase 23 (Câblage des mécaniques pivot mission — superfans × Overton) jusqu'à closure-roadmap target #1 = SHIPPED, ou jusqu'à budget exhausté, **sans intervention humaine**.

## 0. Récupération d'état (à exécuter en premier — ne rien faire d'autre avant)

Lis dans l'ordre, en parallèle quand possible :

1. CLAUDE.md (full) — état repo, Phase status, conventions
2. _bmad/custom/_nefer-facts.md — 11 sections invariants
3. _bmad/custom/_nefer-checks.md — Steps C1–C6 pre-flight
4. _bmad/custom/_nefer-commit.md — Steps P1–P8 commit protocol
5. _bmad-output/planning-artifacts/epics.md — Epic 2 à 7 specs verbatim
6. _bmad-output/planning-artifacts/closure-roadmap.md — target #1 état + Definition of Done
7. _bmad-output/implementation-artifacts/ — tous les story files existants (status par story)
8. docs/governance/STATE_FINAL_BLUEPRINT.md — canon absolu 2026-05-16
9. git log --oneline -30 — commits récents pour contexte

Détermine l'état réel via cette logique :
- Quelle epic est active ? (parse epics.md vs sprint-status.yaml si existe vs git log)
- Quelle story est next backlog dans cette epic ?
- Quels artefacts manquent : story file ? implémentation ? tests ? code-review ?

Si sprint-status.yaml n'existe pas : lance `/bmad-sprint-planning` AVANT toute autre action — sans cela, /bmad-create-story refuse de auto-discover.

## 1. Boucle principale (par story, jusqu'à stopping criteria)

Pour chaque story dans l'ordre sprint-status (skip déjà `done` ; reprendre `review` au point d'arrêt) :

### Phase A — Plan
1. `/bmad-create-story <epic-story-key>` ou auto-discover du prochain `backlog`
2. Vérifie : status story = `ready-for-dev`, file File List présent, NEFER pre-flight C1–C6 ticked
3. Si la story file existe déjà en status `review` ou `done` → skip Phase A, va direct à Phase E (sprint-status update)

### Phase B — Code
1. `/bmad-dev-story <story-file-path>`
2. Le dev agent suit les Tasks/Subtasks, marque chaque `[x]` à mesure, remplit Dev Agent Record
3. Status story passe à `review` à la fin

### Phase C — Verify
1. `/verify <story-file-path>`
2. Si la story touche du runtime UI/CLI/server : lancer l'app, observer le comportement, screenshot ou log capture
3. Si pure backend/governance : vérifier `pnpm test <suite>` + `pnpm tsc --noEmit` + `pnpm lint` verts
4. Documenter ce qui a été testé dans Dev Agent Record > Debug Log References

### Phase D — Review + Correct
1. `/bmad-code-review <story-file-path>`
2. Si findings = 0 CRITICAL et 0 BLOCKER → passer à Phase E
3. Si findings = CRITICAL ou BLOCKER :
   - Itération 1 : fix → re-run /verify → re-run /bmad-code-review
   - Itération 2 : fix → re-run /verify → re-run /bmad-code-review
   - Itération 3 : fix → re-run /verify → re-run /bmad-code-review
   - Après itération 3 : STOP fix loop, escalate : ouvre une correction-spec story dans la même epic, log dans RESIDUAL-DEBT.md (avec calendar lock), status story actuelle → `done-with-debt`, continue Phase E
4. WARNING / MINOR findings → log dans story file Completion Notes, ne pas itérer

### Phase E — Commit + sprint-status update + epic check
1. Exécute le protocole P1–P8 de _nefer-commit.md littéralement :
   - P1 Conventional Commits + scope canonique
   - P2 Phase label phase/23
   - P3 RESIDUAL-DEBT si partial (calendar-locked obligatoire)
   - P4 7-sources sync si Neter/concept/canonique changé
   - P5 Tests state explicit dans commit body
   - P6 CHANGELOG.md entry repo-root (NOTE : _nefer-commit.md référence par erreur docs/governance/CHANGELOG.md ; le hook réel lit CHANGELOG.md repo-root)
   - P7 APOGEE cap 7/7 vérifié si Neter touché
   - P8 Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
2. `/bmad-sprint-status` — confirme story status = `done`, identifie next backlog
3. Si epic = `done` (toutes ses stories `done` ou `done-with-debt`) :
   - `/bmad-retrospective` — capture les learnings
   - Update CLAUDE.md "Phase status" : epic progress (ex. Epic 2 6/6 → closed)
   - Update closure-roadmap.md target #1 si transition d'état (EPICS_DRAFTED → IN_DEV → SHIPPED)
   - Commit séparé pour le retro + doc-sync

## 2. Invariants NEFER (jamais bypass)

- **3 prohibitions absolues** (NEFER §3.2) : (1) jamais réinventer la roue — grep CODE-MAP synonymes avant tout entity nouveau, ADR si extension impossible ; (2) jamais bypass mestor.emitIntent() — direct service-from-router = lint reject ; (3) jamais drift narratif silencieux — 7 sources sync en lockstep.
- **Manual-first parity** (ADR-0060) : toute feature LLM ship sa version UI manuelle dans la même epic. Pas de standalone LLM story.
- **Design System** (3 prohibitions DS-1/2/3) : pas de Tier 0 ref direct dans components, pas de Tailwind colors raw hors primitives, CVA pour >1 variant.
- **Layering cascade** (ADR-0002) : domain → lib → governance → services → trpc → components → app. Madge --circular = 0.
- **Cap APOGEE 7/7** : pas de 8ème Neter sans ADR de supersede.
- **No-magic-fallback** (ADR-0046) : transient failure → DEGRADED state, jamais fake LIVE. INSUFFICIENT_DATA first-class, jamais `?? 0` sur score.

Si une décision te tente qui viole un invariant : c'est faux. Trouve une autre approche, ou escalate via RESIDUAL-DEBT + correction-spec story.

## 3. Budget caps (auto-checkpoint au-delà)

- **Soft cap par story** : 50k tokens (toutes phases A–E combinées). Si dépassé → log dans story Completion Notes, continue.
- **Hard cap par epic** : 500k tokens. Si dépassé avant epic close → checkpoint : commit le state actuel, écris un handoff note dans `_bmad-output/autopilot-handoff-<timestamp>.md`, STOP.
- **Hard cap session** : 10M tokens (la marge du 1M-context Opus 4.7 sur multi-compression). Si compression a déjà eu lieu 3 fois → checkpoint + STOP.
- **Boucle review-fix-review** : max 3 itérations Phase D, ensuite escalate.
- **Délai par commande** : si une commande tourne >10 min sans output, KILL et escalate.

## 4. Stopping criteria (terminate proprement, pas crash)

Stop dans **n'importe lequel** de ces cas :
1. closure-roadmap target #1 → status `SHIPPED` (succès — mission accomplie)
2. Hard cap session atteint (handoff)
3. Hard cap epic atteint sans pouvoir progresser (handoff)
4. Boucle review-fix échoue après 3 itérations sur 2 stories consécutives (signal de drift structurel — handoff)
5. Un test anti-drift HARD passe en RED et tu ne peux pas le réparer en 3 tentatives (handoff)
6. Tu détectes une décision qui exige un input humain (ex. choix de naming canonique, choix entre 2 architectures équivalentes) → handoff

**Format handoff** (toujours quand tu STOP volontairement) :
- Écris `_bmad-output/autopilot-handoff-<YYYYMMDD-HHMM>.md` avec :
  - État final : epic active, story active, status
  - Travail accompli depuis le start (liste commits)
  - Pourquoi le stop (un des 6 cas ci-dessus)
  - Question / décision en attente (si applicable)
  - Estimation effort restant pour atteindre target #1 SHIPPED
- Commit séparé : `docs(governance): phase 23 autopilot handoff <YYYYMMDD-HHMM>`

## 5. Règles d'arbitrage autonome

- **Jamais demander** "tu veux que je continue ?", "shall I proceed ?". Tu décides. Le user ne lit ce flux qu'asynchrone.
- **Toujours documenter** les arbitrages non-triviaux dans Completion Notes (ex. "choisi X plutôt que Y parce que ADR-0079 §"Y" déprioritise Y").
- **Pas de demi-mesures** : si tu commences une story, tu vas jusqu'à `done` ou `done-with-debt`. Pas de "à compléter plus tard" sans calendar lock dans RESIDUAL-DEBT.
- **Trust the protocol** : si la stack te dit ESLint pass + tsc clean + tests green + code-review zéro CRITICAL → la story est done. N'inventes pas des doutes supplémentaires.
- **Pas de refactor opportuniste** : si tu remarques un drift hors-scope dans un fichier voisin, log dans RESIDUAL-DEBT, ne touche pas. Sauf si le drift bloque ta story — alors fix minimal + note.

## 6. Progress reporting mandate (cf. _nefer-facts §12)

À chaque commit, fin de story, ou checkpoint, ajoute en sortie texte :

📊 **Phase 23 : Epic <N> story <M>/<total> · Closure-roadmap : <state> · <X> epics restantes**

Pour que le user (qui lit en async) puisse jauger l'avancement d'un coup d'œil.

---

**Démarre maintenant.** Première action : lis les 9 sources de récupération d'état listées en §0. Deuxième action : détermine l'epic et la story actives. Troisième action : entre dans la boucle Phase A.
```

---

## Notes opérationnelles (pour toi, Alexandre — pas pour le prompt)

1. **Avant de démarrer la nouvelle session** : vérifie que le repo est clean (`git status`), que le branch est `main` ou un dedicated `phase-23-autopilot` (recommandé pour isoler), que les husky hooks fonctionnent (`pnpm test tests/unit/governance/neteru-coherence.test.ts` doit passer).

2. **Pendant l'exécution** : tu vas voir défiler les actions du flow. Si tu vois un handoff écrit en cours, ouvre `_bmad-output/autopilot-handoff-*.md` et décide : (a) lever le blocage et relancer avec le même meta-prompt + une note "résolu : X", (b) absorber le travail accompli et stopper Phase 23 ici.

3. **Estimation effort restant** (point de repère) : Epic 2 (~5 stories) + Epic 3 (~8) + Epic 4 (~8) + Epic 5 (~6) + Epic 6 (~7) + Epic 7 (~10) = **~44 stories**. À ~20 min par story en autopilot (incluant les 3-pass review iterations dans 30% des cas), c'est **~14h de runtime continu**. Le hard cap session 10M tokens couvre ~25-30h de travail avec compression — large marge.

4. **Si la session se termine sur un handoff "décision humaine requise"** : c'est le signal le plus précieux du flow — il identifie exactement le drift que les anti-drift tests ne savaient pas attraper. Relance avec ta décision en input.

5. **Backup recommandé avant lancement** : `git tag autopilot-baseline-$(date +%Y%m%d)` pour garder un point de retour.

📊 **Phase 23 : Epic 1 10/10 (100%) closed · Closure-roadmap : 0/19 SHIPPED · 6 epics restantes (2–7) avant target #1 SHIPPED**
