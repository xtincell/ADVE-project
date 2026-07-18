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
- Erreur / défaut PRÉ-EXISTANT constaté (reproduit, pas supposé) → **jamais l'abandonner** (interdit absolu n°4, NEFER §3.4). Arbre imposé :
  1. **Réparable en passant** (rayon borné, vérifiable dans la session) → le **RÉPARER** dans un commit `fix(...)` dédié (jamais noyé « en douce » dans le `feat`) + consigner le symptôme dans [`PATCHED-SYMPTOMS.md`](../../../docs/governance/PATCHED-SYMPTOMS.md) (1 ligne : patch de surface + hypothèse de cause racine).
  2. **Non réparable en passant** (refactor large, env à clés, décision opérateur) → l'inscrire à `RESIDUAL-DEBT.md` **AVEC un plan de résolution ET un déclencheur de reprise** (jamais un constat nu « on verra »).
  3. **Bloqueur externe pur** (clé/contrat/choix business non-écrit) → **ESCALADER** explicitement à l'opérateur, jamais enterrer en silence.

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
| **Session managée (Claude Code web/remote — le harness désigne une branche)** | branche désignée + PR | 1. Développer sur LA branche désignée (la créer si absente ; **NEVER pousser ailleurs**). 2. `git push -u origin <branche>` — sur échec réseau uniquement : retries 2 s/4 s/8 s/16 s. 3. Ouvrir le **PR draft** → **récupérer le vrai `#N`** (ne JAMAIS deviner le numéro). 4. Si out-of-scope : écrire la ligne `docs/governance/scope-drift.md` avec ce `#N` réel + committer + push (synchronize) — la ligne DOIT être dans le diff (gate CI). 5. Poser le label **`phase/N`** ou **`out-of-scope`** ; s'assurer que le body porte la section **`Justification — out-of-scope`** (gate). 6. S'abonner (subscribe). 7. **CI 100 % verte → marquer ready → MERGER soi-même** (merge-commit — style du repo). Un PR qui traîne n'est pas un livrable. 8. Post-merge : fermer les PRs absorbés, `git fetch origin main && git checkout -B <branche> origin/main`, puis skill `nefer-postmerge`. |

### 7.4 Gates CI à connaître (et ne jamais contourner)

`Commit message lint` (≤100) · `Phase label present` · `Scope drift log updated` · `Typecheck` · `Lint` ×2 · `Unit tests` · `Governance audit` · `Dependency cycles` · `Prisma validate` · `LLM node guardrails` · `Mission contribution audit` · `Golden Path E2E`.

- Un check rouge → diagnostiquer via les logs du job, corriger, re-push. **Deux échecs consécutifs du même check sans cause comprise → STOP, diagnostic complet avant tout re-push** (jamais de re-kick aveugle en boucle).

### 7.5 Pièges récurrents — DÉJÀ ENCODÉS (ne pas les re-découvrir à chaque PR)

Ces faux négatifs / répétitions coûteuses sont connus. **Ne pas les ré-investiguer ni les narrer comme neufs** — appliquer la parade directement.

- **`Phase label present` rouge sur run `opened`** → corrigé À LA SOURCE (`ci.yml` : le job saute `opened`/`reopened`, l'API create-PR ne pouvant pas poser de label). Le 1er run est celui de `labeled` → vert. Si un vieux run `opened` rouge subsiste, il est **superseded** (concurrency `cancel-in-progress`) — le run le plus récent fait foi. Ne PAS re-diagnostiquer.
- **Numéro de PR dans `scope-drift.md`** → créer le PR AVANT d'écrire le numéro (7.3 étapes 3-4). Deviner = ligne fausse à corriger. Ne plus deviner.
- **Version unique** (`nefer-postmerge` §9.2) → 4 emplacements : `package.json`, `package-lock.json` (**2 lignes**), `src/components/landing/marketing-footer.tsx`, tête du `CHANGELOG.md`. Utiliser `node scripts/bump-version.mjs <x.y.z>` (bump atomique + garde-fou). Bump préventif dans le PR qui ship.
- **Commit de merge GitHub signalé par le stop-hook** (committer `noreply@github.com`) → c'est la signature de l'API merge de GitHub ET c'est `origin/main`. **NE JAMAIS l'amender/rebaser** (réécrit l'historique partagé) ; fast-forward le pointeur de branche, point.
- **Migrations en image standalone** → le CLI Prisma est MORT dans l'image (WASM + `@prisma/config`/`effect` élagués par le trace). Le boot applique via `scripts/apply-migrations.mjs` (runner `pg` zéro-dep). Une nouvelle migration se propage donc au prochain déploiement Coolify — ne PAS suggérer `prisma migrate deploy` dans le conteneur (échoue). Cf. `migrate-on-boot-runner.test.ts`.

## Conditions STOP

- Le gauntlet révèle qu'un invariant HARD doit être affaibli pour passer → **STOP** : l'invariant a raison par défaut ; remonter à `nefer-mutation` et re-concevoir.
- Push refusé pour raison non réseau (protection de branche, permission) → **1 question ciblée** à l'opérateur.

## Enchaînement obligatoire

Merge effectué → invoquer **`nefer-postmerge`**. Toujours.
