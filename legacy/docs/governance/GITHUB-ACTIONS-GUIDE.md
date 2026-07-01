# GitHub Actions pour La Fusée — Pourquoi, quoi, quand

Ce guide explique **pourquoi GitHub Actions est le bras armé du Refactor Code of Conduct** (cf. [REFONTE-PLAN.md](REFONTE-PLAN.md) Phase 0), et comment activer chaque workflow au bon moment dans la refonte.

---

## 1. Le problème qu'on résout

Diagnostic V5.4 (cf. plan de refonte) :

- **0 router tRPC ne passe par `mestor.emitIntent()`** — le bypass governance s'aggrave à chaque commit.
- **6+ sites hardcodent** `["A","D","V","E","R","T","I","S"]` — divergence inéluctable.
- **5 unit tests, 6 e2e Playwright, 0 CI** — chaque PR est un acte de foi.
- **Wild plant pattern** — V5.3 puis V5.4 ajoutés *pendant* l'audit (jehuty 338L, seshat-search 145L), sans gouvernance.

GitHub Actions ne corrige pas le code, mais **transforme la discipline en mécanisme**. Sans elle, le plan de refonte reposerait sur la bonne volonté humaine (qui a déjà échoué une fois). Avec elle, **un PR qui casse les règles ne peut tout simplement pas être mergée**.

---

## 2. Ce qui est déjà en place

### `claude.yml` — Claude Code Action

Installée en commit `2c1ccae`. Trigger : `@claude` dans une issue, PR, ou commentaire de review.

**Cas d'usage immédiats** :

| Situation | Ce que tu écris | Ce qui se passe |
|---|---|---|
| Tu veux exécuter une étape du plan sans ouvrir ton laptop | Issue : `@claude exécute Phase 0.1 du plan de refonte` | Claude crée une PR `claude/phase-0-ci-foundations` avec les workflows CI |
| Tu reçois une PR d'un contributeur et veux un review qualité | Commentaire PR : `@claude review cette PR contre le Refactor Code of Conduct` | Claude analyse, commente inline, suggère diff |
| Un bug est signalé en issue | Commentaire issue : `@claude reproduis et propose un fix` | Claude crée une PR de fix avec test de régression |
| Refacto ciblé | `@claude migre src/server/trpc/routers/jehuty.ts vers emitIntent (Phase 3)` | PR autonome, gouvernée par le plan déjà committé |

L'agent lit automatiquement [CLAUDE.md](../../CLAUDE.md) à la racine + [REFONTE-PLAN.md](REFONTE-PLAN.md) — il connaît déjà le contexte. Pas besoin de réexpliquer.

**Limite** : un seul agent à la fois par run. Pas de conversation persistante (chaque trigger est un session frais lisant le repo + ta consigne).

---

## 3. Les workflows à ajouter par Phase

L'ordre suit strictement le plan. Chaque workflow ferme une porte de régression.

### Phase 0 — `ci.yml` (le strict minimum)

**Pourquoi** : aujourd'hui n'importe quel commit peut casser le typecheck, le lint, les rares tests, ou introduire un cycle d'imports — personne ne le voit avant de débugger en prod.

**Ce que ça bloque** :
- `tsc --noEmit` rouge → merge bloqué
- ESLint avec les 4 rules custom (`no-direct-service-from-router`, `no-cross-portal-import`, `no-hardcoded-pillar-enum`, `no-numbered-duplicates`) en error → merge bloqué
- `madge --circular` détecte un nouveau cycle → merge bloqué
- `vitest run` rouge → merge bloqué
- `prisma validate` rouge ou schema modifié sans nouvelle migration → merge bloqué

**YAML squelette** (à étendre au fur et à mesure) :

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx vitest run

  dep-cycle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx madge --circular --extensions ts src/

  prisma-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma validate
```

**Effet immédiat** : chaque PR affiche 5 checks verts ou rouges. Les rouges bloquent le merge (configurable dans Settings → Branches → main → Require status checks).

**Coût** : ~3 min par PR. Cache npm divise par 4.

---

### Phase 0 — `phase-label-check.yml` (Refactor Code of Conduct)

**Pourquoi** : sans ce workflow, le wild-plant pattern continue. Une PR sans label `phase/N` ou `out-of-scope` peut être mergée en silence.

```yaml
name: Phase Label Check
on:
  pull_request:
    types: [opened, edited, labeled, unlabeled]

jobs:
  check-label:
    runs-on: ubuntu-latest
    steps:
      - name: Verify phase label exists
        run: |
          LABELS='${{ toJson(github.event.pull_request.labels.*.name) }}'
          if echo "$LABELS" | grep -qE 'phase/[0-8]|out-of-scope'; then
            echo "OK"
          else
            echo "PR must have a phase/N or out-of-scope label."
            exit 1
          fi
```

**Effet** : un PR sans label = check rouge. Force la conversation explicite "à quelle phase ça appartient ?".

---

### Phase 0 — `governance-audit.yml`

**Pourquoi** : c'est l'audit script `scripts/audit-governance.ts` (à écrire en P0) tourné en CI. Détecte si une PR ajoute un router qui contourne `emitIntent`, ou un service sans manifest (P2).

```yaml
name: Governance Audit
on:
  pull_request:
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx scripts/audit-governance.ts --fail-on-violation
```

**Effet à terme (Phase 3+)** : impossible d'introduire un nouveau bypass governance. Le `jehuty.ts` style ne peut plus être commité.

---

### Phase 5 — `e2e.yml` (Playwright + cascade)

**Pourquoi** : la Phase 5 (NSP streaming) introduit du temps réel multi-couche (backend → SSE → React state). Sans e2e qui exercent ce flow, n'importe quelle régression NSP sera invisible jusqu'à ce qu'un user clique en prod.

```yaml
name: E2E
on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      - run: npx playwright test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Tests à exiger** (P5/P6 du plan) :
- `cascade-full.spec.ts` — strategy → fill ADVE → trigger RTIS, asserte 8+ IntentEmission rows en ordre.
- `oracle-enrichment-streaming.spec.ts` — `enrichOracleNeteru` rend les 21 sections progressivement.
- `governance-bypass.spec.ts` — un router test qui appelle un service en direct doit fail au build.
- `tenant-isolation.spec.ts` — operator A ne peut pas lire les rows de operator B.

**Effet** : la prévisibilité visuelle (NSP) est testée. Le ranker, l'Oracle, la cascade sont prouvés à chaque PR.

---

### Phase 6 — `governance-drift.yml` (cron hebdomadaire)

**Pourquoi** : entre deux refactors, le drift est inévitable (une nouvelle dépendance, un service ajouté, un schema modifié). Un job hebdo détecte les divergences et ouvre une issue automatique.

```yaml
name: Governance Drift
on:
  schedule:
    - cron: '0 6 * * 0'  # dimanche 6h UTC
  workflow_dispatch:

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx scripts/audit-governance.ts --report > drift-report.md
      - run: npx tsx scripts/verify-hash-chain.ts --last 1000
      - name: Open issue if drift detected
        if: failure()
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: "Governance drift detected"
          content-filepath: drift-report.md
          labels: governance, automated
```

**Effet** : tu reçois une issue chaque dimanche si le système a dérivé pendant la semaine. Hash-chain `IntentEmission` rompue = alerte critique.

---

### Phase 6 — `slo-check.yml` (Performance budgets)

**Pourquoi** : tu n'as aucune idée de la latence p95 de `EXPORT_ORACLE`, du coût p95 de `ENRICH_ORACLE`, ni du taux d'erreur de `RANK_PEERS`. Les SLOs sans alerte = du décor.

```yaml
name: SLO Check
on:
  schedule:
    - cron: '0 */6 * * *'  # toutes les 6h
  workflow_dispatch:

jobs:
  slo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx scripts/check-slos.ts --rolling-days 7
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Le script lit `IntentEmission` rolling 7-day, calcule p95 latency / error rate / cost p95 par Intent kind, compare aux SLOs déclarés dans `src/server/governance/slos.ts`. Échec = issue auto.

**Effet** : tu sais en continu si l'OS tient ses promesses de perf. Si un nouveau model LLM dégrade `EXPORT_ORACLE`, tu le sais en 6h, pas après que 3 clients aient raccroché.

---

### Phase 7 — `lighthouse.yml` (mobile-first)

**Pourquoi** : marché africain = mobile primary, low-bandwidth. Sans audit Lighthouse mobile à chaque PR, n'importe quel asset lourd peut casser la perf sans alerte.

```yaml
name: Lighthouse Mobile
on:
  pull_request:
    paths: ['src/app/**', 'src/components/**', 'public/**']

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run build
      - run: npm start &
      - run: npx wait-on http://localhost:3000
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/intake
            http://localhost:3000/cockpit/brand
          configPath: '.lighthouserc.json'
          uploadArtifacts: true
```

`.lighthouserc.json` impose `performance ≥ 0.85` mobile. PR < seuil → check rouge.

**Effet** : impossible de dégrader la perf mobile par accident.

---

### Phase 8 — `release.yml` (changelog auto + SDK publish)

**Pourquoi** : la Phase 8 publie `@lafusee/sdk`. Sans automatisation, le bump de version + changelog devient une corvée que personne ne fait. Et le SDK décale la version du repo.

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm run build:sdk
      - run: npm publish --workspace=@lafusee/sdk
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

Tag `v5.5.0` poussé → SDK publié sur npm + release notes GitHub auto-générées depuis les Conventional Commits.

---

## 4. Tester un workflow localement avant de pousser

```bash
# Installer act (lance les Actions en local via Docker)
brew install act

# Tester le job typecheck du CI
act -j typecheck

# Tester avec les secrets locaux
act -j e2e --secret-file .env

# Lister les workflows
act -l
```

Évite les "fix CI" en boucle qui polluent l'historique.

---

## 5. Comment lire un run dans l'Actions tab

`https://github.com/xtincell/ADVE-project/actions`

Pour chaque run :
- **Vert** = check passé.
- **Jaune** = en cours.
- **Rouge** = échec — clique pour voir les logs du step qui a fail.

Astuce : sur une PR, l'onglet "Checks" résume tous les workflows. **Required checks** (configurables dans Settings → Branches) bloquent le bouton "Merge" tant qu'ils ne sont pas verts.

---

## 6. Coût économique des Actions

GitHub offre 2000 minutes/mois gratuites sur les repos privés (illimité sur les publics). Pour ce projet :

| Workflow | Fréquence | Durée typique | Coût mensuel estimé |
|---|---|---|---|
| `ci.yml` | par PR | 3 min × 5 jobs | ~150 min/PR × 20 PR/mois = 3000 min |
| `e2e.yml` | par PR | 8 min | 160 min/mois |
| `governance-drift.yml` | hebdo | 2 min | 8 min/mois |
| `slo-check.yml` | 6h | 1 min | 120 min/mois |
| `lighthouse.yml` | par PR UI | 4 min | 40 min/mois |
| `claude.yml` | sur trigger `@claude` | variable (5-15 min) | dépend de l'usage |

Si le repo passe en public (ce qui semble être le cas — `xtincell/ADVE-project`), tout est **gratuit illimité**. Sinon, considérer GitHub Pro ($4/mois → 3000 min) ou Team ($4/user/mois → 3000 min).

---

## 7. Mapping Phase ↔ Workflow

| Phase du plan | Workflow à ajouter | Prérequis |
|---|---|---|
| **0** Fondations | `ci.yml`, `phase-label-check.yml`, `governance-audit.yml` (initial) | Husky + commitlint installés |
| **1** SSOT domaine | extension de `lint` avec `no-hardcoded-pillar-enum` | `domain/pillars.ts` créé |
| **2** Manifests + Glory | extension de `governance-audit.yml` (manifests obligatoires) | `manifest.ts` par service |
| **3** Bus + Intent v2 | extension de `governance-audit.yml` (no-direct-service-from-router error) + tenant isolation check | `emitIntent` migré côté routers |
| **4** Layering | `dep-cycle` strict, `boundaries` lint | `eslint-plugin-boundaries` configuré |
| **5** NSP + UI Kit | `e2e.yml` + visual regression Playwright | Storybook publié |
| **6** Filets | `governance-drift.yml`, `slo-check.yml`, chaos suite | scripts SLO + hash-chain |
| **7** UI/Oracle/Landing | `lighthouse.yml` | `.lighthouserc.json` configuré |
| **8** Hardening + Docs | `release.yml`, `docs-deploy.yml` | SDK packagé en workspace |

---

## 8. Le pattern à retenir

**Une règle qui n'est pas mécanisée par CI est une règle qui sera violée.**

Le plan de refonte n'est pas un document d'intention — c'est un contrat technique. GitHub Actions est l'organe d'exécution de ce contrat. Sans elle, le travail des 11-13 semaines de refonte sera grignoté commit par commit dès qu'on relâchera l'attention humaine.

Avec elle, tu peux **prendre une semaine de vacances pendant la Phase 5** sans craindre que jehuty.ts numéro 2 apparaisse. Le système refusera de l'absorber.

C'est ça, **un vrai OS** — pas un produit qui *peut* être discipliné, un produit qui *enforce* sa propre discipline.

---

## 9. Checklist d'activation immédiate

- [x] `claude.yml` installé (commit `2c1ccae`)
- [x] Secrets poussés (`ANTHROPIC_API_KEY`, etc.)
- [ ] Tester `@claude` sur une issue de test
- [ ] Settings → Branches → `main` → Require pull request before merging
- [ ] Settings → Branches → `main` → Require status checks (cocher les jobs CI au fur et à mesure qu'ils existent)
- [ ] Phase 0 : créer `ci.yml`, `phase-label-check.yml`, `governance-audit.yml` (premier sprint)
- [ ] Configurer Husky + commitlint en pre-commit
- [ ] Activer Dependabot (`.github/dependabot.yml`) pour les bumps npm + security alerts

---

**Source de vérité** : ce guide est versionné. Si une nouvelle Phase ou un nouveau workflow est ajouté, mettre à jour ici en même temps que le plan.
