# ADR-0013 — Design System panda + rouge fusée, en cascade 4 tiers

**Date** : 2026-04-30
**Statut** : accepted
**Phase de refonte** : phase/11

## Contexte

La Fusée a accumulé jusqu'en V5.4 une dette visuelle qui freine l'industrialisation :

- **108 tokens CSS OKLCH** correctement déclarés dans [src/styles/globals.css](../../src/styles/globals.css) `@theme`, mais **60% du code visuel** utilise des classes Tailwind brutes (`text-zinc-500` × 818, `border-zinc-800` × 685, `text-zinc-400` × 572) au lieu des tokens sémantiques. Symptôme : drift répété sur `PricingTiers` (cards de hauteurs différentes, badge collisions, vertical rhythm cassé).
- **`class-variance-authority@0.7.1`** déclaré comme dépendance dans `package.json:61` mais jamais utilisé — 36 primitives de `src/components/shared/` réinventent leurs variants en concaténation inline.
- **245 occurrences** de `text-[Npx]` arbitraires (10/9/12px) éparpillées — pas de typography scale.
- **20+ couleurs hex hardcodées** dans constantes métier (`CLASSIFICATION_COLORS`, charts SVG).
- **Aucune primitive** dans `src/components/primitives/` (le dossier n'existe pas).
- **Aucun manifest UI** (le pattern `defineManifest` du backend ([manifest.ts:209](../../src/server/governance/manifest.ts)) n'a pas son équivalent frontend).
- **Aucun test visuel / a11y / i18n** — aucune protection contre les régressions.
- **Mode dark forcé** (`<html className="dark">`) avec palette violet (Oracle) + emerald (Artemis) qui ne reflète pas l'identité brand "La Fusée" (rocket, panda).

Un plan de design system a été ébauché le 2026-04-29 (`DESIGN-SYSTEM-PLAN.md`) mais resté à l'état "planning, not yet executed". Il prévoyait correctement la couche governance (manifests UI, CVA, Storybook, audit CI) mais laissait **ouvert le choix de palette** et **ne précisait pas la cascade 4 tiers** des tokens.

L'ADR ne peut plus être différé : la dette zinc s'accumule (commits récents introduisent encore des `text-zinc-500` au lieu de `text-foreground-muted`), et la landing v5.4 (HTML Downloads vanilla panda + rouge fusée) attend d'être portée en React mais ne peut pas l'être proprement sans DS gouverné.

## Décision

**Le Design System de La Fusée adopte une palette panda noir/bone + accent rouge fusée**, organisée en **cascade 4 tiers** (Reference → System → Component → Domain), gouvernée par [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) (canon vivant — renommé depuis l'ancien `DESIGN-SYSTEM-PLAN.md`), enforced par CI bloquant.

### 1. Palette canonique

**Reference Tokens** (Tier 0, immuable hors ADR) :
- **Surfaces panda** : `--ref-ink-0` à `--ref-ink-3` (oklch 0.08 → 0.17, neutre 60°), bordures `--ref-ink-line`/`--ref-ink-line-muted`.
- **Foreground bone** : `--ref-bone` à `--ref-bone-3` (oklch 0.81 → 0.95, chaud 80°).
- **Accent rouge fusée** : `--ref-rouge` (oklch 0.62 0.22 25 ≈ #e63946), `--ref-rouge-2` (hover), `--ref-rouge-deep` (active), `--ref-ember` (chaud secondaire).
- **Statuts** : `--ref-green` / `--ref-amber` / `--ref-blue`.
- **Sectoriel homéopathique** : `--ref-gold` (réservé tier ICONE et tier-maitre Creator).

Détail complet : [docs/governance/design-tokens/reference.md](../design-tokens/reference.md).

### 2. Cascade 4 tiers (règle non-négociable)

```
Tier 0 — Reference (palette brute, immuable)
  ↓ consommé par
Tier 1 — System (sémantique transverse : --color-background, --color-accent, etc.)
  ↓ consommé par
Tier 2 — Component (par primitive : --button-primary-bg, --card-bg, etc.)
  ↓ consommé par
Tier 3 — Domain (sémantique métier : --pillar-A, --division-mestor, --tier-maitre, etc.)
```

**Règle absolue** : un composant consomme **toujours** un token de la couche supérieure. Un Reference token ne peut **jamais** être consommé directement dans un composant. Garanti par `tests/unit/governance/design-tokens-cascade.test.ts` (bloquant).

Cette discipline **est l'éditabilité** : changer le rouge signature = changer 1 ligne dans `--ref-rouge` → propagation automatique à toutes les surfaces (boutons primary, focus rings, accents pillar D, division Mestor, classification CULTE, tier-associé Creator, etc.).

### 3. Domain tokens cohérents BRAINS const

Les **5 Neteru actifs** ([BRAINS](../../src/server/governance/manifest.ts:23) — Mestor, Artemis, Seshat, Thot, Ptah) reçoivent chacun un Domain token :
- `--division-mestor` = `--ref-rouge` (décision = rouge signature)
- `--division-artemis` = `--ref-ember` (exécution = chaud)
- `--division-seshat` = `--ref-blue` (observation = froid)
- `--division-thot` = `--ref-amber` (finance = ambre)
- `--division-ptah` = `--ref-bone-2` (matérialisation = bone éclatant)

Imhotep et Anubis (pré-réservés [ADR-0010](0010-neter-imhotep-crew.md) / [ADR-0011](0011-neter-anubis-comms.md)) **n'ont pas de token tant qu'ils ne sont pas actifs** — éviter le drift symbolique.

Pour la landing, la section "Gouverneurs" du HTML Downloads listait `INFRASTRUCTURE` à la place de `Ptah`. **Substitution `INFRASTRUCTURE → Ptah`** appliquée pour aligner avec [PANTHEON.md](../PANTHEON.md) et [ADR-0009](0009-neter-ptah-forge.md). Infrastructure reste la **fondation transversale** (couche INFRASTRUCTURE Ground Tier APOGEE), pas un Neter.

### 4. Surfaces & density per portail

Chaque layout portail déclare `data-density="..."` sur son `<body>` :

| Portail | data-density |
|---|---|
| Cockpit | comfortable |
| Console | compact |
| Agency | comfortable |
| Creator | comfortable |
| Intake | airy |
| Auth | airy |
| Public | airy |
| Landing (marketing) | editorial |

Les Component tokens lisent `[data-density="..."]` pour ajuster paddings/gaps/font-sizes sans dupliquer les composants. Test bloquant `tests/unit/governance/design-portal-density.test.ts` (PR-5).

### 5. Mono-mode (panda autoporteur)

La palette panda est **nativement sombre + chaude**. Le flag `<html className="dark">` est **retiré** du root layout — la palette n'a pas besoin de toggle dark/light. `prefers-color-scheme: light` non supporté pour cette refonte (peut être ré-introduit via futur ADR si besoin client validé).

### 6. Typographie

Trois fonts via `next/font/google` (déjà en deps Next 15) :
- **Inter Tight** (`--font-display`, weights 400/500/600/700) — UI + headlines
- **Fraunces** (`--font-serif`, italic/normal, weights 400/500) — accent éditorial (manifesto, score reveal, mega titles)
- **JetBrains Mono** (`--font-mono`, weights 400/500/600) — code, telemetry, eyebrows

Layout root charge les 3, layouts portails utilisent les variables CSS. Fluid type scale via `clamp()` (élimine les 245 `text-[Npx]` arbitraires).

### 7. Enforcement CI

Six tests anti-drift bloquants (à activer progressivement PR-1 → PR-9, voir [DESIGN-SYSTEM.md §13](../DESIGN-SYSTEM.md)) + 2 règles ESLint custom (`lafusee/design-token-only`, `lafusee/no-direct-lucide-import`) + audit `scripts/audit-design-drift.ts` + tests visuels Playwright + tests a11y axe-core + tests i18n RTL/zoom 200% + Storybook + Chromatic optionnel.

## Conséquences

**Positives** :

- **Identité brand cohérente** : "La Fusée" porte la signature rouge partout (boutons, accents, focus, division Mestor, classification CULTE, tier-associé). Distinction immédiate vs SaaS US monochromes.
- **Éditabilité garantie** : la cascade rend le DS modifiable en 1 token. Changement de la teinte rouge propagée automatiquement.
- **0 dette zinc à terme** : codemod (PR-4) + tests CI bloquants (PR-9) suppriment les 818+685+572 occurrences brutes.
- **Manifests primitives** : chaque composant déclare son contrat (anatomy, variants, tokens, a11y, i18n, mission contribution) — 0 drift visuel possible structurellement.
- **Stack robuste** : Storybook + Chromatic + Playwright snapshots + axe-core couvrent les 4 axes de régression (visuel, a11y, i18n, code).
- **Landing v5.4 portée proprement** : route group `(marketing)/` consomme le DS unifié — plus de fragmentation marketing/produit.
- **Substitution Ptah cohérente** avec BRAINS const → 0 drift narratif.
- **Cohérence avec gouvernance backend** : `defineComponentManifest` mirrors `defineManifest`, `tests/unit/governance/design-*.test.ts` mirror `tests/unit/governance/neteru-coherence.test.ts`.

**Négatives** :

- **Coût initial élevé** : 9 sous-PRs, ~6 semaines en exécution séquentielle. Migration des 34+ composants legacy obligatoire (Wave 1-6).
- **Régressions visuelles inévitables** durant la migration — les baselines Chromatic prennent du temps à stabiliser. Mitigation : capture avant/après par PR + revue manuelle visuelle.
- **Mode dark forcé retiré** : risque mineur si clients demandent light mode plus tard. Mitigation : panda est si haut-contraste qu'il a déjà la lisibilité d'un light mode propre, et un futur ADR peut ré-introduire un toggle si besoin réel.
- **Storybook + Chromatic = overhead build** : ~+15-20% temps build. Mitigation : Chromatic optionnel (fallback Playwright snapshots locaux), Storybook isolé `npm run storybook`.
- **Manifests par primitive** : ~50 fichiers `*.manifest.ts` à maintenir. Mitigation : Zod-validated, dev-mode only, pattern stable mirror du backend déjà éprouvé.

**À surveiller** :

- **Risque de re-drift zinc** post-migration si discipline pas tenue : ESLint rule + husky pre-commit obligatoires pour bloquer **avant** la PR.
- **Lisibilité Domain tokens** (pillars/divisions) après désaturation panda : test daltonisme (Sim Deutéranopie/Protanopie) en PR-5 ; ajustement si contrast < 4.5:1.
- **Density compact Console** : les tableaux 1000+ rows doivent rester lisibles. Test utilisateur sur 5 pages console denses (intents, contracts, revenue, clients, missions) en PR-7.

## Alternatives considérées

### Alternative 1 — Garder palette violet/emerald (legacy v5.0)

**Pourquoi écartée** :
- Ne match pas la direction brand "La Fusée / rocket / panda".
- 60% du code utilise déjà zinc hardcodé — la palette OKLCH violet est *déjà* sous-utilisée. Ne pas régler la dette.
- Aucun ancrage culturel — le violet/emerald est générique SaaS US (Linear, Notion).

### Alternative 2 — DS-Internal violet + DS-Marketing panda séparés

**Pourquoi écartée** :
- Fragmente l'expérience opérateur (Cockpit/Console violet) vs brand (landing panda).
- Doublons de tokens, doublons de tests, doublons de gouvernance.
- Plus de complexité pour 0 gain — la signature rouge est suffisante pour distinguer cockpit vs landing si besoin (via density `comfortable` vs `editorial`).
- Le mandat user 2026-04-30 a été explicite : **"vise le panda avec accent rouge partout"**.

### Alternative 3 — Palette tierce (ex: bleu profond + or)

**Pourquoi écartée** :
- Bleu = froid → contredit la métaphore propulsion/intensité du nom "La Fusée".
- Or = patrimoine → confondrait avec `--ref-gold` qui est réservé tier ICONE (sectoriel homéopathique). Briserait la sémantique des classifications.
- Pas d'ancrage culturel marché créatif francophone africain.

### Alternative 4 — Palette panda + rouge fusée

**Pourquoi retenue** :
- Cohérent avec le nom du produit (La Fusée) et le vocabulaire existant (Cockpit, UPgraders, propulsion).
- Lisibilité WCAG AAA native (panda 0.08 ↔ bone 0.95 = ratio ≈ 16:1).
- Distinction visuelle immédiate vs concurrents.
- Sobriété éditoriale qui fait briller les manifests, scores, KV BrandAsset Phase 9.
- Métaphore *active* (rouge = action, propulsion) plutôt que *statique* ou *froide*.

## Décisions techniques connexes

- **Cascade 4 tiers** : alternative à un namespace plat (style `--bg-primary`, `--bg-secondary`, ...). La cascade rend la dépendance explicite et l'éditabilité native. Test `tests/unit/governance/design-tokens-cascade.test.ts` enforce.
- **CVA obligatoire** : alternative à `cn(...).join(" ")` ou ternaires inline. CVA fournit type-safety + introspection runtime. Déjà en deps depuis V5.0.
- **Storybook + Chromatic** : alternative aux snapshots locaux Playwright seuls. Chromatic apporte la review visuelle cloud par PR + baseline auto sur main. Fallback local si pas de budget. Overhead build accepté (gain qualité > coût).
- **Manifests primitives `defineComponentManifest`** : alternative à des conventions implicites. Le backend a `defineManifest` (`src/server/governance/manifest.ts:209`) avec Zod parse runtime ; le frontend reçoit le même pattern pour les primitives.
- **Renommage `DESIGN-SYSTEM-PLAN.md → DESIGN-SYSTEM.md`** via `git mv` : préserve l'historique (auteur Alexandre 29 avril) tout en passant le doc du statut `planning` au statut `executing`.

## Conflit ADR

L'ancien plan (`DESIGN-SYSTEM-PLAN.md` 29 avril) référençait `adr/0009-design-system-governance.md` comme numéro projeté. Cette numérotation est **obsolète** : ADR-0009 a été pris par [adr/0009-neter-ptah-forge.md](0009-neter-ptah-forge.md) (Phase 9 — 5ème Neter). Le présent ADR prend le numéro **0013** (suivant immédiat de [adr/0012-brand-vault-superassets.md](0012-brand-vault-superassets.md)).

## Lectures

- [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) — canon vivant
- [DESIGN-LEXICON.md](../DESIGN-LEXICON.md) — vocabulaire visuel
- [DESIGN-TOKEN-MAP.md](../DESIGN-TOKEN-MAP.md) — inventaire exhaustif tokens
- [DESIGN-MOTION.md](../DESIGN-MOTION.md) — durations/easings
- [DESIGN-A11Y.md](../DESIGN-A11Y.md) — niveaux WCAG, ARIA patterns
- [DESIGN-I18N.md](../DESIGN-I18N.md) — RTL, font scaling
- [design-tokens/reference.md](../design-tokens/reference.md) — Tier 0 catalogue
- [adr/0009-neter-ptah-forge.md](0009-neter-ptah-forge.md) — Ptah 5ème Neter (cause renumérotation)
- [adr/0012-brand-vault-superassets.md](0012-brand-vault-superassets.md) — BrandVault visuel cohérent
- [REFONTE-PLAN.md](../REFONTE-PLAN.md) — Phase 11 entry
- [NEFER.md](../NEFER.md) — protocole 8 phases
