---
name: nefer-ship
description: Phases 5-7 NEFER — gauntlet de vérification, commit et livraison sur le repo La Fusée. À invoquer quand une modification est prête (après nefer-mutation, et après nefer-docs si la doc a bougé) et JAMAIS sautée avant un commit/push. Impose les commandes de vérification exactes, le format de commit, la lane de livraison (main direct vs branche+PR managée) et les gates CI.
---

# NEFER Phases 5-7 — Vérifier, committer, livrer

**Procédure impérative. Un commit sans ce gauntlet complet = drift. AUCUNE improvisation.**

## PHASE 5 — Gauntlet de vérification (commandes exactes, TOUTES)

```bash
npx tsc --noEmit                                              # attendu : 0 erreur
npm run lint 2>&1 | tail -5                                   # attendu : 0 error (warnings pré-existants tracés RESIDUAL-DEBT)
npm run lint:governance 2>&1 | tail -5                        # attendu : 0 error
npm run audit:cycles 2>&1 | tail -3                           # attendu : 0 cycle
npx vitest run tests/unit/governance/ 2>&1 | tail -6          # attendu : suite gouvernance 100 % verte
```

- **MUST** (si entité structurelle touchée — model/service/router/page/tool/sequence/Intent) :
  ```bash
  npx tsx scripts/gen-code-map.ts
  npx tsx scripts/gen-intent-catalog.ts        # si Intent kinds touchés
  npm run glory:inventory                      # si Glory tools touchés
  ```
- **MUST** (si UI touchée) : les 3 tests DS (`design-tokens-cascade`, `design-tokens-canonical`, `design-primitives-cva`) + `cockpit-vocabulary.test.ts` sont DANS la suite gouvernance — vérifier qu'ils passent sur le périmètre ÉTENDU (skill `nefer-vocab` pour l'extension).
- **MUST** (si modif structurelle profonde) : `npm run stress:full`.
- **NEVER** : désactiver/skipper un test HARD pour « faire passer » ; réduire un périmètre de scan ; ajouter une entrée d'allowlist sans hole id + reason + `reroutePlanned`.
- Erreur PRÉ-EXISTANTE (reproduite sur main vierge) → la tracer dans `RESIDUAL-DEBT.md`, ne pas la réparer en douce dans un commit de feature.

**Sortie attendue (bloquante)** : 0 erreur INTRODUITE. Sinon → corriger, re-gauntlet complet.

## PHASE 6 — Documentation (déléguée, obligatoire)

Invoquer **`nefer-docs`**. Règle dure ici : **NEVER committer un `feat`/`fix` impactant/`refactor` structurel/`chore` significatif/`docs` sans entrée CHANGELOG dans LE MÊME commit** (hook pre-commit `audit-changelog-coverage` le bloque).

## PHASE 7 — Commit + livraison

### 7.1 Staging

- **MUST** : stager explicitement (`git add <paths>`). **NEVER `git add -A`** — le statut est relu (`git status --short`) et chaque fichier stagé est voulu.

### 7.2 Format de commit (imposé)

```
<type>(<scope>): <résumé — LIGNE ≤ 100 CARACTÈRES>

<corps : pourquoi, comment, impacts — CHAQUE ligne ≤ 100 caractères>

Verify : <résultats du gauntlet — tsc/lint/tests>
Résidus : <ouverts + où tracés, ou « aucun »>

Co-Authored-By: <signature modèle fournie par l'environnement de session>
```

- commitlint (CI bloquante) : **TOUTES les lignes ≤ 100 caractères** (seuls les sujets `Merge ...` sont exemptés). Types : Conventional Commits.
- **NEVER** d'identifiant technique de modèle (model ID) dans un artefact du repo.
- Conflit de numéro de version (commit parallèle a pris vX.Y.Z) → bump à `vX.Y.Z+1` immédiatement, sans débat.

### 7.3 Lane de livraison — décision AUTOMATIQUE, pas un choix

| Contexte d'exécution | Lane | Procédure |
|---|---|---|
| **NEFER local (CLI opérateur, aucune branche imposée)** | `main` direct | `git checkout main && git pull --ff-only` → travail → commit → `git push origin main`. Pas de branche, pas de PR (NEFER.md §7.0 — le protocole EST la review). Exception unique : l'opérateur demande explicitement une PR. |
| **Session managée (Claude Code web/remote — le harness désigne une branche)** | branche désignée + PR | 1. Développer sur LA branche désignée (la créer si absente ; **NEVER pousser ailleurs**). 2. `git push -u origin <branche>` — sur échec réseau uniquement : retries 2 s/4 s/8 s/16 s. 3. Ouvrir un **PR draft** avec label **`phase/N`** ou **`out-of-scope`** ; si out-of-scope → ligne ajoutée à `docs/governance/scope-drift.md` DANS le diff (gate CI). 4. S'abonner aux événements du PR (subscribe). 5. **CI 100 % verte → marquer ready → MERGER soi-même immédiatement** (méthode merge-commit — style du repo). Un PR qui traîne n'est pas un livrable. 6. Post-merge : fermer les PRs absorbés, `git fetch origin main && git checkout -B <branche> origin/main`, puis skill `nefer-postmerge`. |

### 7.4 Gates CI à connaître (et ne jamais contourner)

`Commit message lint` (≤100) · `Phase label present` · `Scope drift log updated` · `Typecheck` · `Lint` ×2 · `Unit tests` · `Governance audit` · `Dependency cycles` · `Prisma validate` · `LLM node guardrails` · `Mission contribution audit` · `Golden Path E2E`.

- Un check rouge → diagnostiquer via les logs du job, corriger, re-push. **Deux échecs consécutifs du même check sans cause comprise → STOP, diagnostic complet avant tout re-push** (jamais de re-kick aveugle en boucle).

## Conditions STOP

- Le gauntlet révèle qu'un invariant HARD doit être affaibli pour passer → **STOP** : l'invariant a raison par défaut ; remonter à `nefer-mutation` et re-concevoir.
- Push refusé pour raison non réseau (protection de branche, permission) → **1 question ciblée** à l'opérateur.

## Enchaînement obligatoire

Merge effectué → invoquer **`nefer-postmerge`**. Toujours.
