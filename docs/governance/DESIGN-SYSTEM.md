# DESIGN-SYSTEM — La Fusée (canon vivant)

> **Statut** : `executing` — Phase 11 Design System Migration. Démarrée 2026-04-30.
> **Auteurs** : Alexandre (29 avril, plan d'origine) + NEFER session du 30 avril (extension cascade + palette panda + matrice scénarios).
> **Trigger initial** : drift répété sur `PricingTiers` (cards de hauteurs différentes, badge collisions, vertical rhythm cassé) + 60% du code visuel utilisant `text-zinc-*`/`bg-zinc-*` au lieu des tokens sémantiques (818× `text-zinc-500`, 685× `border-zinc-800`).
> **Décision palette** : panda noir/bone + accent rouge fusée, partout (cf. §3 et [adr/0013-design-system-panda-rouge.md](adr/0013-design-system-panda-rouge.md)).
> **Scope** : zéro hors-scope — la totalité de la couche design (governance + tokens + primitives + Storybook + migration legacy + CI + a11y + i18n + landing v5.4).
> **Sous-système APOGEE** : Console/Admin — INFRASTRUCTURE (Ground Tier §4 [APOGEE.md](APOGEE.md)). Aucun Neter créé. Aucune mutation business introduite.
> **`missionContribution`** : `GROUND_INFRASTRUCTURE`.
> **`groundJustification`** : *"Le DS unifie la production visuelle des 5 Neteru actifs sur 4 portails + landing. Sa cohérence accélère la vélocité d'industrialisation des forges (Glory→Brief→Forge), briefs, manifests, signaux — donc l'accumulation de superfans (mission §1). Sans DS gouverné, chaque ajout d'écran reproduit la dette zinc/hex et fragmente l'expérience opérateur (Cockpit/Console) et brand (landing/Cockpit), ralentissant la cascade ADVERTIS."*

---

## 1. Context

État réel cartographié au 2026-04-30 (post-audit NEFER) :

| Layer | Status |
|---|---|
| Color tokens (OKLCH semantic) dans [globals.css](../../src/styles/globals.css) `@theme` | ⚠️ 108 tokens déclarés, 0 dead, MAIS 60% du code utilise `text-zinc-*`/`bg-zinc-*` au lieu |
| Typography tokens | ❌ **Absents** — 245 instances de `text-[10px]`/`text-[9px]`/`text-[12px]` éparpillées |
| Usage des tokens dans composants | ❌ Hardcoded `text-amber-400`, `bg-zinc-800`, hex direct (CLASSIFICATION_COLORS const, charts SVG, ~20+ occurrences) |
| Primitives (Button/Card/Badge/Dialog/Input/...) | ❌ **Aucune** — 36 composants `src/components/shared/` ré-inventent inline |
| CVA / variant grammar | ❌ `class-variance-authority@0.7.1` en `package.json:61` mais **jamais utilisé** — variantes en `[a, b, c].join(" ")` |
| Storybook | ❌ Absent |
| Régression visuelle | ❌ Playwright `only-on-failure`, pas de baseline visual |
| Component manifest UI | ❌ Pattern `defineManifest` existe pour services backend ([manifest.ts:209](../../src/server/governance/manifest.ts)) — non miroré frontend |
| A11y testing | ❌ Aucun |
| i18n contracts (RTL, font scaling) | ❌ Aucun (alors que marché africain = multi-langue : `fr-FR`, `en-US`, `wo-SN`, `sw-KE`) |
| Drift design dans RESIDUAL-DEBT | ❌ Non tracé |
| Densité par portail | ❌ Aucune — Console (1000+ rows) et Cockpit (storytelling) partagent la même density |
| Landing v5.4 (HTML Downloads) | ❌ Pas portée — drift narratif (Gouverneurs liste INFRASTRUCTURE au lieu de Ptah) |

**Décision** : livraison **atomique complète**, sans hors-scope. Tout ce qui est nécessaire pour qu'un nouveau drift soit impossible structurellement est inclus. La migration des 34+ composants legacy + la landing v5.4 + l'application de la palette panda sur **tous** les portails font partie de la livraison, pas d'un "fil-de-l'eau" indéfini.

---

## 2. Architecture — couches qui mirroir la governance backend

```
Backend governance              →  Design governance
─────────────────────────          ─────────────────────────
CLAUDE.md                       →  CLAUDE.md (+ Design Governance pointer)
MISSION.md (vision + drift §4)  →  DESIGN-SYSTEM.md (vision + drift test)
ADR-0001..0012                  →  ADR-0013 (palette panda + cascade)
LEXICON.md                      →  DESIGN-LEXICON.md
SERVICE-MAP / ROUTER-MAP        →  DESIGN-TOKEN-MAP / COMPONENT-MAP
manifest.ts par service         →  manifest.ts par primitive
audit-mission-drift CI          →  audit-design-drift + a11y + visual + i18n CI
defineManifest()                →  defineComponentManifest()
```

Le DS s'organise en **4 couches token cascadées** + 1 couche primitives + 1 couche patterns + 1 couche surfaces. Chaque couche respecte le principe NEFER : *grep avant d'écrire, vérifier avant de coder, documenter avant de committer*.

```
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 4 — SURFACES (contextes d'usage)                        │
│  data-density per portail | Portal accent | Layout shell        │
├─────────────────────────────────────────────────────────────────┤
│  COUCHE 3 — PATTERNS (~60 compositions documentées)             │
│  Cards × density | Forms × validation | Bento | Modales | Radio │
│  Pricing | Fiches produits | DataTable | Streaming | Cascade    │
├─────────────────────────────────────────────────────────────────┤
│  COUCHE 2 — PRIMITIVES (briques + variants CVA + manifest)      │
│  Button | Card | Input | Badge | Modal | Tabs | Tooltip | etc.  │
│  Chacune ships : *.tsx + *.manifest.ts + *.stories.tsx + *.test │
├─────────────────────────────────────────────────────────────────┤
│  COUCHE 1 — TOKENS (langage canonique en cascade 4 tiers)       │
│  Tier 0 Reference → Tier 1 System → Tier 2 Component → Tier 3   │
│  Domain (pillars / divisions / tiers / classifications)         │
├─────────────────────────────────────────────────────────────────┤
│  COUCHE 0 — GOUVERNANCE                                         │
│  DESIGN-SYSTEM.md | DESIGN-LEXICON | DESIGN-TOKEN-MAP           │
│  DESIGN-MOTION | DESIGN-A11Y | DESIGN-I18N                      │
│  ADR-0013 | tests anti-drift CI | codemod | Storybook+Chromatic │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Palette canonique — panda + rouge fusée

**Décision arrêtée 2026-04-30** : palette **panda noir/bone + accent rouge fusée** comme signature globale de tout l'OS. Plus de violet/emerald (legacy v5.0). La direction visuelle est décrite dans [adr/0013-design-system-panda-rouge.md](adr/0013-design-system-panda-rouge.md).

**Pourquoi panda + rouge** :
- **Cohérence brand** : le produit s'appelle La Fusée. Rouge fusée (≈ NASA Saturn V red, panda blanc/bone des étages) = signature univoque.
- **Lisibilité** : palette panda (noir profond `#0a0a0a` + bone chaleureux `#f5f1ea`) offre un contraste WCAG AAA natif, sans avoir à arbitrer light/dark.
- **Sobriété éditoriale** : le marché créatif africain francophone valorise la rigueur typographique. Le panda est un canevas qui fait briller le contenu (manifests, score, KV BrandAsset Phase 9), pas l'interface.
- **Distinction concurrentielle** : les SaaS US dominants (Notion, Linear, Figma) sont monochromes bleus ou pastel. Le panda + rouge fusée distingue.

Détail des Reference Tokens : voir [§5 Tier 0](#tier-0--reference-tokens) ci-dessous + [design-tokens/reference.md](design-tokens/reference.md).

---

## 4. Token discipline (règle non-négociable)

**Zéro classe Tailwind brute** (`text-amber-400`, `bg-zinc-800`, `text-[10px]`, `border-violet-500`, hex `#xxxxxx`) hors `src/components/primitives/**` et `src/styles/**`.

**Trois interdits absolus DS** (drift signals) :
1. **Aucun composant ne consomme un Reference token directement** (`var(--ref-rouge)`). Toujours via System/Component/Domain.
2. **Aucun composant ne déclare de variant en `.join(" ")` ou ternaire inline** quand >1 variant existe. CVA obligatoire.
3. **Aucune classe Tailwind couleur brute** dans `src/components/**` (sauf `primitives/**` autorisés à consumer Tier 2). Codemod automatisé + test CI bloquant.

Override possible avec `// eslint-disable-next-line lafusee/design-token-only` + commentaire de justification obligatoire (audit trail).

---

## 5. Token cascade — 4 tiers

### Tier 0 — Reference Tokens (palette brute, immuable hors ADR)

Déclarés dans `src/styles/tokens/reference.css`. Catalogue complet : [design-tokens/reference.md](design-tokens/reference.md).

```css
@theme {
  /* === PANDA — surfaces & encres === */
  --ref-ink-0: oklch(0.08 0.005 60);      /* #0a0a0a — bg primaire */
  --ref-ink-1: oklch(0.11 0.005 60);      /* #121212 — surface raised */
  --ref-ink-2: oklch(0.14 0.005 60);      /* #1a1a1a — surface elevated */
  --ref-ink-3: oklch(0.17 0.005 60);      /* #222222 — surface overlay */
  --ref-ink-line: oklch(0.21 0.005 60);   /* #2a2a2a — borders */
  --ref-ink-line-muted: oklch(0.16 0.005 60);
  --ref-mute: oklch(0.45 0.005 60);       /* #6b6b6b — foreground muted */
  --ref-mute-2: oklch(0.31 0.005 60);     /* #4a4a4a */
  --ref-bone: oklch(0.95 0.015 80);       /* #f5f1ea — text primaire */
  --ref-bone-2: oklch(0.91 0.020 80);     /* #e8e2d6 */
  --ref-bone-3: oklch(0.81 0.025 80);     /* #c9c3b6 */

  /* === ROUGE FUSÉE — accent signature === */
  --ref-rouge: oklch(0.62 0.22 25);       /* #e63946 */
  --ref-rouge-2: oklch(0.68 0.22 25);     /* #ff4d5e — hover */
  --ref-rouge-deep: oklch(0.50 0.20 25);  /* #b8232f — active */
  --ref-ember: oklch(0.72 0.20 40);       /* #ff6b3d — secondaire chaud */

  /* === STATUTS === */
  --ref-green: oklch(0.72 0.18 145);      /* success */
  --ref-amber: oklch(0.78 0.16 80);       /* warning */
  --ref-blue: oklch(0.68 0.16 240);       /* info */

  /* === Sectoriel homéopathique === */
  --ref-gold: oklch(0.74 0.14 80);        /* #d4a24c — ICONE only */
}
```

### Tier 1 — System Tokens (sémantique transverse)

Déclarés dans `src/styles/tokens/system.css`. Catalogue : [design-tokens/system.md](design-tokens/system.md).

Tout composant doit consommer ces tokens, **jamais un Reference directement**.

```css
@theme {
  --color-background:           var(--ref-ink-0);
  --color-surface-raised:       var(--ref-ink-1);
  --color-surface-elevated:     var(--ref-ink-2);
  --color-surface-overlay:      var(--ref-ink-3);
  --color-foreground:           var(--ref-bone);
  --color-foreground-secondary: var(--ref-bone-3);
  --color-foreground-muted:     var(--ref-mute);
  --color-foreground-inverse:   var(--ref-ink-0);
  --color-border:               var(--ref-ink-line);
  --color-border-subtle:        var(--ref-ink-line-muted);
  --color-border-strong:        var(--ref-bone-3);
  --color-accent:               var(--ref-rouge);
  --color-accent-hover:         var(--ref-rouge-2);
  --color-accent-active:        var(--ref-rouge-deep);
  --color-accent-foreground:    var(--ref-bone);
  --color-accent-subtle:        color-mix(in oklab, var(--ref-rouge) 15%, transparent);
  --color-success:              var(--ref-green);
  --color-warning:              var(--ref-amber);
  --color-error:                var(--ref-rouge);
  --color-info:                 var(--ref-blue);
  --color-ring:                 var(--ref-rouge);
}
```

### Tier 2 — Component Tokens (par primitive)

Déclarés dans `src/styles/tokens/component.css`. Catalogue : [design-tokens/component.md](design-tokens/component.md).

Permettent à 1 primitive d'avoir ses couleurs internes sans polluer le namespace global. Lisent uniquement Tier 1.

```css
@theme {
  --button-primary-bg:         var(--color-accent);
  --button-primary-fg:         var(--color-accent-foreground);
  --button-primary-bg-hover:   var(--color-accent-hover);
  --button-ghost-border:       var(--color-border-strong);
  --button-ghost-fg:           var(--color-foreground);
  --card-bg:                   var(--color-surface-raised);
  --card-border:               var(--color-border);
  --card-bg-hover:             var(--color-surface-elevated);
  --card-elevated-bg:          var(--color-surface-elevated);
  /* ...idem pour Input, Badge, Modal, Tabs, etc. */
}
```

### Tier 3 — Domain Tokens (sémantique métier)

Déclarés dans `src/styles/tokens/domain.css`. Catalogue : [design-tokens/domain.md](design-tokens/domain.md). Cohérents avec `BRAINS` const ([manifest.ts:23](../../src/server/governance/manifest.ts)) — **5 Neteru actifs** : Mestor / Artemis / Seshat / Thot / Ptah.

```css
@theme {
  /* === PILIERS ADVE — désaturés panda === */
  --pillar-A: var(--ref-bone-2);          /* Authenticité */
  --pillar-D: var(--ref-rouge);           /* Distinction — rouge signature */
  --pillar-V: var(--ref-bone-3);          /* Valeur */
  --pillar-E: var(--ref-ember);           /* Engagement */
  --pillar-R: var(--ref-mute);            /* Risque */
  --pillar-T: var(--ref-blue);            /* Track */
  --pillar-I: var(--ref-amber);           /* Innovation */
  --pillar-S: var(--ref-green);           /* Stratégie */

  /* === DIVISIONS NETERU (5 actifs) === */
  --division-mestor:   var(--ref-rouge);  /* décision = rouge signature */
  --division-artemis:  var(--ref-ember);  /* exécution = chaud */
  --division-seshat:   var(--ref-blue);   /* observation = froid */
  --division-thot:     var(--ref-amber);  /* finance = ambre */
  --division-ptah:     var(--ref-bone-2); /* matérialisation = bone éclatant */
  /* (Imhotep / Anubis pré-réservés — pas de token tant que non actifs) */

  /* === TIERS CREATOR === */
  --tier-apprenti:   var(--ref-mute);
  --tier-compagnon:  var(--ref-bone-3);
  --tier-maitre:     var(--ref-gold);
  --tier-associe:    var(--ref-rouge);

  /* === CLASSIFICATIONS APOGEE === */
  --classification-zombie:    var(--ref-mute-2);
  --classification-fragile:   var(--ref-mute);
  --classification-ordinaire: var(--ref-bone-3);
  --classification-forte:     var(--ref-bone-2);
  --classification-culte:     var(--ref-rouge);
  --classification-icone:     var(--ref-gold);
}
```

**Règle de cascade absolue** : un composant consomme **toujours** un token de la couche supérieure. `--button-primary-bg` consomme `--color-accent`, jamais `--ref-rouge`. Cette discipline = éditabilité (changer le rouge signature = changer 1 Reference token et propagation automatique partout).

---

## 6. Anatomy contracts (préexistant, conservé)

Chaque primitive déclare son anatomie (header / body / footer / action zones), contraintes de hauteur, padding rhythm, baseline grid. Voir [§Livrables.B.13 `defineComponentManifest`](#b13-helper-definecomponentmanifest).

---

## 7. Variant grammar (préexistant, conservé + précisé)

CVA obligatoire dès >1 variante visuelle. Nommage canonique imposé :
- `variant`: forme visuelle (primary | ghost | outline | subtle | destructive | link | accent)
- `size`: échelle (sm | md | lg | icon | xl pour cas extrêmes)
- `tone`: tonalité sémantique (neutral | accent | success | warning | error | info)
- `state`: état de contrôle (default | hover | focus | filled | invalid | valid | disabled | readonly | loading)
- `density`: contexte spatial (compact | comfortable | airy | editorial)

---

## 8. Surfaces & density per portail (NEW)

Chaque portail a un **density token** et un **accent secondaire** *qui modulent la signature rouge sans la remplacer* :

| Portail | data-density | Accent secondaire | Notes |
|---|---|---|---|
| **Cockpit** (Brand/Founder) | comfortable | rouge signature | Storytelling-heavy, cards larges, bento asymmetric |
| **Console** (UPgraders/Admin) | compact | rouge + ember (alarmes) | Tableaux denses 1000+ rows, governance, kpi-grid 4-8 cells |
| **Agency** | comfortable | rouge | Multi-client, bento featured, commission tables |
| **Creator** | comfortable | rouge + gold (tiers) | Mobile-first, feed missions, mobile money summaries |
| **Intake** (public) | airy | rouge | Conversion, score reveal, stepper card-radio |
| **Auth** | airy | rouge | Card centrée max-w-md |
| **Public** (changelog/status) | airy | rouge | Lecture longue, print-friendly |
| **Landing** (marketing) | editorial | rouge + ember | Hero editorial + telemetry, manifesto-pair, surveillance |

Density déclarée via `data-density="..."` sur le `<body>` du layout. Tokens conditionnels :

```css
[data-density="compact"]      { --card-px: 12px; --card-py: 12px; --card-gap: 8px;  --card-title-size: 14px; }
[data-density="comfortable"]  { --card-px: 20px; --card-py: 20px; --card-gap: 16px; --card-title-size: 16px; }
[data-density="airy"]         { --card-px: 32px; --card-py: 32px; --card-gap: 24px; --card-title-size: 20px; }
[data-density="editorial"]    { --card-px: clamp(24px,3vw,40px); --card-py: clamp(24px,3vw,40px); --card-gap: 32px; --card-title-size: clamp(18px,1.4vw,24px); }
```

### Stratégie responsive — breakpoints, fluid type, container queries

**Breakpoints unifiés** (Tailwind 4 défaut, déclarés dans [DESIGN-TOKEN-MAP.md](DESIGN-TOKEN-MAP.md)) :

| BP | Min width | Cible | Pivot patterns |
|---|---|---|---|
| `xs` | 0 | Mobile portrait | Stack vertical, bottom tab bar, sheet bottom |
| `sm` | 640px | Mobile landscape | 2 cols, début pricing horizontal |
| `md` | 768px | Tablet | **Sidebar apparaît, topbar visible, mobile tab bar disparaît** |
| `lg` | 1024px | Desktop | 3-4 cols grids, bento dense |
| `xl` | 1280px | Wide desktop | 5+ cols grids, max content 1280-1440px |
| `2xl` | 1536px | Ultra-wide | Idem xl avec padding accru |

**Fluid type scale** (élimine 80% des `text-sm md:text-base lg:text-lg`) :
```css
--text-xs:   clamp(11px, 0.7vw + 0.5rem, 13px);
--text-sm:   clamp(13px, 0.8vw + 0.6rem, 15px);
--text-base: clamp(15px, 0.9vw + 0.7rem, 17px);
--text-lg:   clamp(17px, 1.1vw + 0.7rem, 20px);
--text-xl:   clamp(20px, 1.4vw + 0.7rem, 24px);
--text-2xl:  clamp(24px, 1.8vw + 0.6rem, 32px);
--text-3xl:  clamp(28px, 2.4vw + 0.5rem, 40px);
--text-4xl:  clamp(36px, 3.2vw + 0.5rem, 56px);
--text-display: clamp(40px, 6vw, 88px);
--text-mega:    clamp(48px, 9vw, 140px);
```

**Container queries** : Tailwind 4 supporte natif (`@container`). Cards qui dépendent de leur parent (bento) utilisent `@container (min-width: ...)` au lieu de `md:`.

**Touch targets** : minimum 44×44px (WCAG AA), même en density compact.

**Print** : `@media print` reset → `bg-white text-black`, hide nav/sidebar, force serif, page-break-inside: avoid sur cards. Cible : Oracle export PDF, mission brief impression.

**Reduced motion** : `@media (prefers-reduced-motion: reduce)` → durations 1ms, suppression `animation` sur shimmer/particle/float/glow-pulse.

**RTL** : préparer logical properties (`padding-inline-start`) pour future support langue arabe (Afrique du Nord). Détails [DESIGN-I18N.md](DESIGN-I18N.md).

---

## 9. Drift test (5 questions, mirror MISSION.md §4)

À chaque PR qui touche un composant ou un token, répondre :

1. **Tokens semantic uniquement ?** (zéro `text-zinc-*`/`#xxxxxx`/`bg-violet-*` dans le diff)
2. **Variantes déclarées dans le manifest ?** (`*.manifest.ts` co-localisé avec le composant, Zod-parsed dev mode)
3. **Régression visuelle attrapée par snapshot ?** (Playwright + Chromatic visual baseline mise à jour intentionnellement)
4. **Tests a11y axe passent ?** (0 violation critique/sérieuse)
5. **Comportement RTL + font-scaling 200% testé ?** ([DESIGN-I18N.md](DESIGN-I18N.md) checklist)

Si une réponse est NON → le composant n'est pas livré. Auto-correction avant merge.

---

## 10. Auto-correction (NEFER §Phase 8)

Quand un composant échoue le drift test :
1. Identifier la dérive (lequel des 5 critères)
2. Citer file:line + commit où elle a été introduite
3. Patcher (token cascade + manifest + visual baseline + a11y + i18n)
4. Re-run audits
5. Update RESIDUAL-DEBT.md si lessons learned

---

## 11. Anatomy de référence (préexistant, conservé)

- **Card** : Header / Body / Footer slots compound. Constraints : `min-height` selon density, `aspect-ratio` selon variant.
- **Form** : Label / Field / Helper / Error slots. Validation states 9 (default → loading).
- **Pattern composite (PricingTier)** : 3 plans alignés en hauteur (cas test originel — voir [DESIGN-LEXICON.md](DESIGN-LEXICON.md) `recommended` vs `featured` vs `highlighted`).

---

## 12. Mission contribution (préexistant, conservé)

Chaque manifest primitive déclare comment elle accélère la cascade ADVERTIS :
- `DIRECT_SUPERFAN` (engagement direct, ex: `score-reveal`, `tier-badge`)
- `DIRECT_OVERTON` (positionnement, ex: `manifesto-pair`, `radar-chart`)
- `DIRECT_BOTH`
- `CHAIN_VIA:<service>` (ex: `pricing-tiers` → CHAIN_VIA:thot)
- `GROUND_INFRASTRUCTURE` (ex: `button`, `input`, `modal` — fondation transversale)

Pour `GROUND_INFRASTRUCTURE`, `groundJustification` non vide obligatoire.

---

## 13. CI gates (préexistant + extensions panda)

Tous bloquants pour merge :

| Job | Vérifie |
|---|---|
| `audit:design` | 0 occurrence `text-(amber|emerald|zinc|red|blue|violet|slate|gray|stone)-\d+` dans `src/components/**` (sauf `primitives/**` whitelist) |
| `test:visual` | Playwright snapshots 0.1% diff max, baseline committée |
| `test:a11y` | `@axe-core/playwright` 0 violation critique/sérieuse |
| `test:i18n` | RTL + font-scaling 200% sans overlap/truncation |
| `chromatic` | Visual review cloud (si configuré) |
| `manifest-validation` | Tous `*.manifest.ts` Zod parse |
| `design-tokens-coherence` | Chaque var CSS ↔ entrée `design-tokens/*.md` |
| `design-tokens-cascade` | Aucun composant ne consomme `var(--ref-*)` directement |
| `design-no-dead-tokens` | Chaque token déclaré utilisé ≥ 1× |
| `design-primitives-cva` | Composants à variants utilisent `cva()` |
| `design-portal-density` | Chaque layout portail a `data-density` |
| `audit-changelog-coverage` | Chaque feat/fix commit a entry CHANGELOG.md |

Override via `// eslint-disable-next-line lafusee/design-token-only` + commentaire justification obligatoire.

---

## 14. Migration policy (préexistant + ajouts panda)

Tout PR qui touche un composant non-migré **doit le migrer**. Statut tracé dans [COMPONENT-MAP.md](COMPONENT-MAP.md) (auto-généré). 6 waves canoniques :

- **Wave 1 — Atomic legacy** : `tier-badge`, `metric-card`, `mission-card`, `devotion-ladder`, `cost-meter`, `oracle-teaser`, `score-showcase`, `apogee-trajectory`, `command-palette`
- **Wave 2 — Composite shared** : `modal` (→ wrapper Dialog), `smart-field-editor`, `field-renderers`, navigation/topbar, navigation/sidebar
- **Wave 3 — Cockpit-specific** : `pillar-page` (28KB), `notoria-page`, brand/edit page components
- **Wave 4 — Console-specific** : seshat/search, governance/intents, oracle/proposition, insights/benchmarks, config/integrations
- **Wave 5 — Neteru** : `pricing-tiers` (cas test originel — peut être Wave 1 pour valider le pattern), 23 composants `src/components/neteru/*`
- **Wave 6 — Intake/Public + Landing v5.4** : intake/result page components + **route group `(marketing)/`** (substitution Ptah, palette panda, fonts Inter Tight + Fraunces + JetBrains Mono)

Chaque migration suit la check-list :
- Composant utilise primitives (jamais HTML brut + Tailwind)
- Zéro classe Tailwind brute (CI valide)
- Manifest co-localisé
- Story Storybook
- Snapshot baseline
- Tests a11y axe
- Tests RTL + font-scaling

---

## 15. Patterns matrix — ~60 patterns

Chaque pattern documenté dans `docs/governance/design-patterns/<famille>/<pattern>.md`. Aperçu :

### A. CARDS (10 — densité × type × interactivité)
`card-flat` | `card-outlined` | `card-elevated` | `card-interactive` | `card-stat` | `card-metric` | `card-promo` | `card-pricing` | `card-product` | `card-testimonial`

### B. FORMS (12 — types × layouts × états)
`form-single-column` | `form-two-column` | `form-multi-step` | `form-inline-edit` | `form-modal` | `form-drawer` | `field-text` | `field-number` | `field-date-time` | `field-file-upload` | `field-rich-text` | `field-array-repeatable`

### C. RADIO/CHECKBOX/SWITCH (6)
`radio-standard` | `radio-button` | `radio-card` | `checkbox-list` | `checkbox-card` | `switch-toggle`

### D. MODALES & OVERLAYS (10)
`dialog-alert` | `dialog-confirm` | `dialog-form` | `dialog-wide` | `dialog-fullscreen` | `sheet-right` | `sheet-bottom` | `popover` | `tooltip` | `command-palette`

### E. PRICING & TARIFS (5)
`pricing-3-tier` | `pricing-feature-matrix` | `pricing-period-switch` | `pricing-slider` | `pricing-quote`

### F. FICHES PRODUIT/ASSET/SERVICE (8)
`asset-card-thumb` | `asset-card-detail` | `mission-card` | `client-card` | `campaign-card` | `manifest-card` | `glory-tool-card` | `creator-profile-card`

### G. BENTO LAYOUTS (5)
`bento-2x2` | `bento-asymmetric` | `bento-featured` | `bento-masonry` | `bento-nested`

### H. NAVIGATION & DISCLOSURE (8)
`sidebar-collapsible` | `topbar-sticky` | `mobile-tab-bar` | `breadcrumb` | `pagination` | `tabs-horizontal` | `tabs-vertical` | `accordion`

### I. DATA DISPLAY (10)
`data-table-dense` | `data-table-comparison` | `kpi-grid` | `stat-grid` | `radar-chart` | `cascade-tree` | `timeline` | `streaming-feed` | `pdf-preview` | `gallery-grid`

### J. STATES & FEEDBACK (6)
`empty-state` | `loading-skeleton` | `loading-spinner` | `error-boundary` | `success-celebration` | `progress-bar` + `progress-circle`

### K. MARKETING / EDITORIAL (6 — landing)
`hero-editorial` | `hero-with-telemetry` | `manifesto-pair` | `surveillance-radar` | `apogee-trajectory` | `gouverneurs-tabs`

---

## 16. Coverage matrix — 30 scénarios concrets

Checklist exhaustive avant merge PR-9. Voir [DESIGN-A11Y.md](DESIGN-A11Y.md) + [DESIGN-I18N.md](DESIGN-I18N.md) pour les variantes a11y/i18n par scénario.

| # | Scénario | Patterns mobilisés | Tests visuels |
|---|---|---|---|
| 1 | Sign-up / Login `(auth)/login` | `auth-card`, `form-single-column`, `field-text/password`, `button-primary` | xs/md/lg, error state, loading |
| 2 | Intake stepper `(intake)/intake/[token]` | `form-multi-step`, `radio-card` (4 méthodes), `field-rich-text`, `progress-stepper` | xs/md, persistence reload, validation per step |
| 3 | Score reveal `(intake)/intake/[token]/result` | `radar-chart`, `success-celebration`, `stat-grid`, `card-elevated` | Animation reveal, reduced-motion, mobile portrait |
| 4 | Cockpit dashboard `/cockpit` | `bento-asymmetric`, `card-stat`, `card-metric`, `card-promo` | xs/md/lg, empty state, 5+ missions |
| 5 | Cockpit pillar editor | `manifest-card`, `field-rich-text`, `form-inline-edit`, `tabs-horizontal` (5 phases), `progress-bar` | Title très long, copy 2000+ chars |
| 6 | Cockpit messages Mestor | `streaming-feed` (SSE), `card-flat`, `field-text`, `loading-skeleton` | Stream interruption, long message, code block |
| 7 | Console clients table | `data-table-dense`, `tier-badge`, `classification-badge`, `pagination`, `search-filter` | 50/500/1000 rows, sticky header scroll |
| 8 | Console intents audit | `data-table-dense`, `streaming-feed`, `dialog-confirm` (compensate), `tone-status` (6 states) | Filter combo, replay action |
| 9 | Console design system preview | `bento-2x2`, `card-flat`, `tabs-horizontal`, `popover` (token detail) | Live drift status |
| 10 | Console contracts | `data-table-comparison`, `dialog-form` (edit), `card-product`, `field-date` | Long titles ellipsis, multiple actions per row |
| 11 | Agency dashboard | `bento-featured`, `card-client`, `kpi-grid`, `pricing-period-switch` | Mobile collapse, no clients empty state |
| 12 | Creator missions feed | `card-mission`, `tier-badge`, `field-search`, `tabs-horizontal` (filters) | Card title 1-line / 3-line, payout currency |
| 13 | Creator earnings | `data-table-dense` (mobile-first → cards stack), `timeline`, `card-stat` | Mobile money formats (FCFA, NGN), 6 months |
| 14 | Creator profile | `gallery-grid`, `card-asset-thumb`, `dialog-wide` | Image 1:1 / 16:9 / vertical, tag overflow |
| 15 | Pricing landing | `pricing-3-tier`, `pricing-feature-matrix` (mobile collapse) | Sur devis vs amount, featured highlight |
| 16 | Asset Ptah library | `gallery-grid`, `card-asset-detail`, `dialog-form`, `field-file-upload` | Drag-drop reorder, bulk select |
| 17 | Oracle deliverable viewer | `manifest-card`, `bento-nested` (5 phases), `print-layout` | Print export, mobile read |
| 18 | FAQ landing | `accordion`, `card-flat` | 6 items, ARIA expanded, keyboard nav |
| 19 | Surveillance radar landing | `surveillance-radar`, `card-elevated`, `tabs-horizontal` | Hover transitions, mobile click-only |
| 20 | APOGEE trajectory landing | `apogee-trajectory`, `tier-badge`, `card-flat` | Auto-cycle on view, reduced-motion fallback |
| 21 | Gouverneurs landing | `gouverneurs-tabs` (5 brains M/A/S/T/Ptah) | Tab keyboard nav, content swap |
| 22 | Hero landing | `hero-with-telemetry`, `card-elevated`, `kpi-grid` | Mega title 2/3 lines, telemetry update |
| 23 | Public status page | `kpi-grid`, `timeline`, `card-stat` | 7d/24h windows, OK/FAILED counts |
| 24 | 404 / Error / Global error | `error-boundary`, `empty-state`, buttons | Full screen, mobile center |
| 25 | Toast notifications | `toast` (4 tones), stack management | Multi-toast simultaneous, dismiss |
| 26 | Cmd+K command palette | `command-palette`, `field-search` | Empty query, fuzzy match, keyboard nav |
| 27 | Mobile drawer | `sheet-bottom`, `bento-2x2` (3-col grid icons) | Touch slide-down, scroll lock |
| 28 | Sidebar collapse Cmd+B | `sidebar-collapsible`, persistence localStorage | 16rem ↔ 4rem, label hide animation |
| 29 | Form long avec validation | `form-multi-step`, `field-*` × 8 types, `tooltip`, `dialog-confirm` (cancel dirty) | All field states, on-blur vs on-submit |
| 30 | Drag-and-drop asset upload | `field-file-upload`, `progress-bar`, `toast`, `loading-skeleton` | Multi-file, 100MB+ progress, error retry |

**Cas limites systématiques** par pattern : valeur vide / très courte / moyenne / très longue / liste 0 / 1 / N items / loading / error / disabled / readonly / RTL / slow network / offline.

---

## 17. Livrables (atomiques, ordre d'exécution — 9 sous-PRs)

### A. Governance spec — docs (PR-1)

1. **`docs/governance/DESIGN-SYSTEM.md`** (ce fichier — déjà rédigé) — source unique de vérité
2. **`docs/governance/adr/0013-design-system-panda-rouge.md`** — ADR fondateur (palette + cascade + alternatives rejetées)
3. **`docs/governance/DESIGN-LEXICON.md`** — vocabulaire visuel (`recommended` vs `featured`, `active` vs `current`, `subtle` vs `muted` vs `quiet`, etc.)
4. **`docs/governance/DESIGN-TOKEN-MAP.md`** — inventaire exhaustif tokens (color, typography, spacing, radius, shadow, motion, z-index, breakpoint, sidebar/topbar) avec usage attendu
5. **`docs/governance/COMPONENT-MAP.md`** — inventaire composants avec statut (`migrated` / `pending-migration` / `deprecated`). Mis à jour automatiquement par script.
6. **`docs/governance/DESIGN-MOTION.md`** — durations canoniques, easing, transitions par catégorie (entry/exit/state-change/loading), `prefers-reduced-motion`
7. **`docs/governance/DESIGN-A11Y.md`** — niveaux WCAG (AA min), focus visible, contrast ratios, ARIA patterns, keyboard nav, screen reader behavior
8. **`docs/governance/DESIGN-I18N.md`** — RTL, font scaling 200%, pluralization, locale-specific number/currency (`fr-FR`, `en-US`, `wo-SN`, `sw-KE`)
9. **`CLAUDE.md`** — bloc "Design Governance" pointant vers DESIGN-SYSTEM.md
10. **`docs/governance/RESIDUAL-DEBT.md`** — entrée Tier 2 migration legacy avec checklist 34+ composants
11. **`docs/governance/REFONTE-PLAN.md`** — Phase 11 ajoutée
12. **`docs/governance/LEXICON.md`** — entrée `DESIGN_SYSTEM` + sous-entrées
13. **Memory user `design_system_panda.md`** + index MEMORY.md

### A.bis Catalogues design-tokens 4 tiers (PR-1)

14. **`docs/governance/design-tokens/reference.md`** — Tier 0 panda + rouge, valeurs OKLCH + hex + WCAG ratios
15. **`docs/governance/design-tokens/system.md`** — Tier 1 sémantique transverse
16. **`docs/governance/design-tokens/component.md`** — Tier 2 par primitive
17. **`docs/governance/design-tokens/domain.md`** — Tier 3 pillars/divisions/tiers/classifications

### B0. Token CSS files cascade (PR-1)

18. **`src/styles/tokens/reference.css`** — Tier 0 (panda + rouge + statuts + gold)
19. **`src/styles/tokens/system.css`** — Tier 1 (consomme Reference)
20. **`src/styles/tokens/component.css`** — Tier 2 (consomme System)
21. **`src/styles/tokens/domain.css`** — Tier 3 (consomme Reference/System pour pillars/divisions/tiers/classifications)
22. **`src/styles/tokens/animations.css`** — @keyframes consolidées (15 existantes + 5 nouvelles)
23. **`src/styles/tokens/index.css`** — imports les 5 ci-dessus
24. **`src/styles/globals.css`** — refactor : `@import "tailwindcss"` + `@import "./tokens/index.css"` + base layer

### B. Helper + presets (PR-2)

25. **`src/lib/design/define-component-manifest.ts`** — helper Zod-validé, mirror de [defineManifest backend](../../src/server/governance/manifest.ts:209) :
    ```ts
    defineComponentManifest({
      component: "pricing-tiers",
      governor: "NETERU_UI",
      version: "1.0.0",
      anatomy: ["header", "price-block", "inclusions", "cta"],
      variants: [
        { name: "default", tokens: ["color-card", "spacing-rhythm-md"] },
        { name: "recommended", tokens: ["color-accent", "shadow-glow-accent"] },
      ],
      constraints: { minHeight: "20rem", badgeReserve: "0.75rem", maxInclusionsLines: 8 },
      a11yLevel: "AA",
      i18n: { rtl: true, fontScaling: "200%" },
      missionContribution: "DIRECT_ENGAGEMENT",
      missionStep: 4,
    })
    ```
    Validation runtime en dev, no-op en prod.

26. **`src/lib/design/cva-presets.ts`** — variantes CVA réutilisables (size, tone, density, state).

### B. Primitives library (PR-2 + PR-5)

**PR-2 (Wave 0 — 5 primitives core)** : `button`, `card`, `input`, `badge`, `dialog` (modal refonte).

**PR-5 (primitives complètes)** :
- **Form** : `textarea`, `select`, `checkbox`, `radio`, `switch`, `label`, `field`, `field-error`
- **Display** : `avatar`, `separator`, `tag`
- **Feedback** : `toast`, `banner`, `alert`, `tooltip`, `popover`
- **Layout** : `stack`, `grid`, `container`
- **Typography** : `heading`, `text`
- **Loading** : `skeleton`, `spinner`, `progress`
- **Navigation** : `tabs`, `breadcrumbs`, `pagination`, `command` (Cmd+K), `accordion`
- **Icon wrapper** : `icon` (autour de lucide-react)

Chaque primitive ships : `*.tsx` (CVA, tokens-only, accessible) + `*.manifest.ts` (Zod) + `*.stories.tsx` (Storybook) + `*.test.tsx` (unit).

### B1. Storybook + Chromatic (PR-3)

27. **`.storybook/main.ts`** — config Storybook 8 + addons : a11y, viewport, themes, controls, docs
28. **`.storybook/preview.ts`** — globals.css importé, theme switcher (light retiré — panda mono-mode)
29. **`.storybook/manager.ts`** — branding La Fusée
30. **`*.stories.tsx`** par primitive — autogénérée depuis manifest dans la mesure du possible
31. **`chromatic.config.json`** + **`.github/workflows/chromatic.yml`** — visual review sur chaque PR, baseline auto sur main. Fallback Playwright snapshots locaux si pas de budget Chromatic.

### C0. Migration legacy (PR-4 codemod, PR-6/7/8 waves)

32. **`scripts/codemod-zinc-to-tokens.ts`** — codemod jscodeshift/ts-morph qui mappe :
    ```
    text-zinc-{50..400}  → text-foreground / text-foreground-secondary
    text-zinc-{500..700} → text-foreground-muted
    bg-zinc-{800,900}    → bg-surface-raised / bg-background
    border-zinc-{700..900} → border-border-{strong,base,subtle}
    text-violet-* / bg-violet-* → text-accent / bg-accent (legacy primary → rouge)
    text-emerald-* (auditer contexte) → text-success ou domain token spécifique
    ```
    Diff revu manuellement, pas auto-commit.

33. **`scripts/list-components.ts`** + **`scripts/generate-component-map.ts`** → `COMPONENT-MAP.md` initial (PR-3).

34. **Migration des 6 waves** (PR-6/7/8) — voir §14 Migration policy.

### C. Enforcement — CI gate strict (PR-9)

35. **`scripts/audit-design-drift.ts`** — mode strict (post-migration) : 0 violation autorisée hors `src/components/primitives/**` + `src/styles/**`. Output : `file:line + token semantic suggéré`.
36. **`tests/visual/**`** — Playwright `toHaveScreenshot()` baseline committée. Une spec par primitive × variants × sizes × states. Threshold 0.1%. Run chromium + firefox + webkit.
37. **`tests/a11y/**`** — `@axe-core/playwright`. 0 violation critique/sérieuse. Focus visible, keyboard nav, ARIA roles.
38. **`tests/i18n/**`** — `dir="rtl"` + `font-size: 200%`. 0 overlap/truncation/clipping.
39. **`.github/workflows/design-drift.yml`** — jobs : audit / visual / a11y / i18n / chromatic / manifest-validation. Tous bloquants.
40. **`eslint.config.mjs`** — règles custom :
    - `lafusee/design-token-only` : interdit Tailwind couleur brute hors `primitives/**` + `styles/**`
    - `lafusee/no-direct-lucide-import` : force `<Icon />` wrapper
    - Override : `// eslint-disable-next-line ...` + commentaire justification
41. **`.husky/pre-commit`** — `audit-design-drift` mode diff sur fichiers stagés ; échoue rapidement avant CI.

### D. Documentation vivante (PR-3 + PR-9)

42. **`scripts/generate-component-map.ts`** — scanne `*.manifest.ts`, met à jour `COMPONENT-MAP.md` (statut, variants, mission contribution, a11y level). Run en CI.
43. **`scripts/generate-token-map.ts`** — parse `globals.css` + `src/styles/tokens/*.css`, met à jour `DESIGN-TOKEN-MAP.md`.
44. **Storybook docs MDX** — chaque primitive a sa page docs autogénérée depuis manifest + props types.
45. **Page Console preview `/console/governance/design-system`** — preview live tokens/primitives/patterns + drift status (pas Storybook complet, juste preview ergonomique pour ops).

### E. Landing v5.4 (PR-8)

46. **`src/app/(marketing)/layout.tsx`** — fonts Inter Tight + Fraunces + JetBrains Mono via `next/font`, `data-density="editorial"`.
47. **`src/app/(marketing)/page.tsx`** — compose 14 sections.
48. **`src/components/landing/marketing-{nav,hero,strip,manifesto,surveillance,apogee,advertis,diagnostic,gouverneurs,portails,pricing,faq,finale,footer}.tsx`** — port HTML Downloads, **substitution `INFRASTRUCTURE → Ptah`** dans gouverneurs (cohérent BRAINS const 5 actifs).
49. Suppression : ancien `src/app/page.tsx` + 14 composants `src/components/landing/{hero,navbar,...}.tsx` legacy + `shared/{glow-button,animated-counter,section-wrapper}.tsx`.

---

## 18. Build sequence — 9 sous-PRs

Branche racine `feat/ds-panda-v1`. Chaque PR exécute le **protocole NEFER complet (Phase 0→7)**. CHANGELOG.md entry obligatoire (NEFER §6.0). Stage explicite, jamais `-A`.

| PR | Titre | Périmètre | CHANGELOG |
|---|---|---|---|
| **PR-1** | `feat(ds): foundation — DESIGN-SYSTEM.md + tokens cascade + ADR-0013` | Docs (A + A.bis), tokens CSS (B0), refactor globals.css, MAJ CLAUDE/LEXICON/REFONTE-PLAN/RESIDUAL-DEBT/MEMORY. Tests `coherence` + `cascade` bloquants | v5.5.0 |
| **PR-2** | `feat(ds): primitives core — define-component-manifest + Button/Card/Input/Badge/Dialog CVA` | Helper + presets + 5 primitives Wave 0 + manifests + tests unit. Test `primitives-cva` bloquant | v5.5.1 |
| **PR-3** | `feat(ds): Storybook + Chromatic + COMPONENT-MAP auto-généré` | Storybook config, stories des 5 primitives Wave 0, Chromatic workflow, scripts list/generate component-map | v5.5.2 |
| **PR-4** | `feat(ds): codemod zinc→tokens + audit:design + tests warning` | Codemod exécuté src/components/** (commits par sous-dossier), tests visual/a11y/i18n scaffolding, RESIDUAL-DEBT update | v5.5.3 |
| **PR-5** | `feat(ds): primitives complètes — 30+ composants + Tooltip/Popover/Sheet/Stepper/Command` | Toutes primitives restantes + manifests + stories + tests | v5.5.4 |
| **PR-6** | `feat(ds): Wave 1+2 migration — atomic + composite shared` | tier-badge, metric-card, mission-card, devotion-ladder, etc. + modal→Dialog, smart-field-editor, navigation/* + data-density per portail (test bloquant) | v5.5.5 |
| **PR-7** | `feat(ds): Wave 3+4 migration — Cockpit + Console business` | pillar-page, notoria-page, brand/edit, seshat/search, governance/intents, oracle/proposition, etc. | v5.5.6 |
| **PR-8** | `feat(ds): Wave 5+6 — Neteru + Intake/Public + Landing v5.4 (marketing)/` | pricing-tiers + 23 neteru/* + intake/result + route group (marketing) avec substitution Ptah | v5.5.7 |
| **PR-9** | `feat(ds): CI strict + cleanup + preview page + ESLint rules` | audit-design-drift mode strict, tous tests anti-drift bloquants, ESLint `design-token-only` + `no-direct-lucide-import`, husky pre-commit, page Console design-system preview, suppression aliases legacy, npm run stress:full final | v5.5.8 |

---

## 19. Verification end-to-end (Phase 5 NEFER, par PR)

```bash
# Typecheck
npx tsc --noEmit 2>&1 | grep -v puppeteer | head

# Lint
npm run lint && npm run lint:governance

# Cycles
npm run audit:cycles

# Anti-drift NEFER existants (PRs ne doivent jamais les casser)
npx tsx scripts/audit-neteru-narrative.ts
npx tsx scripts/audit-pantheon-completeness.ts
npx tsx scripts/audit-production-lineage.ts
npx tsx scripts/audit-mission-drift.ts
npx tsx scripts/audit-governance.ts

# Anti-drift DS nouveaux (à partir des PRs où ils sont activés)
npm run audit:design

# Tests unitaires governance
npx vitest run tests/unit/governance/{neteru,manipulation}-coherence.test.ts
npx vitest run tests/unit/governance/design-*.test.ts

# Tests visuels (PR-3+)
npm run test:visual

# Tests a11y (PR-9)
npm run test:a11y

# Tests i18n (PR-9)
npm run test:i18n

# Tests E2E smoke
npm run test:e2e -- --grep "@smoke"

# Régen sources auto
npx tsx scripts/gen-code-map.ts
npx tsx scripts/generate-component-map.ts  # PR-3+
npx tsx scripts/generate-token-map.ts       # PR-3+

# Stress-test E2E (modif structurelle — PR-4, 6, 7, 8, 9)
npm run stress:full
```

**Manuel** (preview MCP, `npm run dev` port 3000) : visite des 30 scénarios §16 sur 4 breakpoints (375/768/1280/1920).

**Lighthouse** : `npm run audit:lighthouse` — perf ≥ 90, a11y ≥ 90, contrastes WCAG AA (4.5:1 body, 3:1 large), focus rings visibles.

---

## 20. Critical files (à lire avant édition)

- [CLAUDE.md](../../CLAUDE.md) — ton terse / pyramid pointer
- [NEFER.md](NEFER.md) — protocole 8 phases (obligatoire avant tout commit)
- [MISSION.md](MISSION.md) — modèle structurel pour drift test §4
- [APOGEE.md](APOGEE.md) — codes visuels par tier + sous-systèmes
- [PANTHEON.md](PANTHEON.md) — 5 Neteru actifs + 2 pré-réservés
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — Phase 11 entry
- [LEXICON.md](LEXICON.md) — entrée DESIGN_SYSTEM
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — modèle ADR
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — Ptah 5ème Neter (pourquoi `--division-ptah`)
- [adr/0012-brand-vault-superassets.md](adr/0012-brand-vault-superassets.md) — BrandVault visuel cohérent
- [adr/0013-design-system-panda-rouge.md](adr/0013-design-system-panda-rouge.md) — ADR DS (à créer en PR-1)
- [src/styles/globals.css](../../src/styles/globals.css) — tokens existants (typography manquante)
- [src/server/governance/manifest.ts:209](../../src/server/governance/manifest.ts) — `defineManifest` à mirrorer
- [src/server/services/artemis/manifest.ts](../../src/server/services/artemis/manifest.ts) — modèle manifest backend
- [src/components/neteru/pricing-tiers.tsx](../../src/components/neteru/pricing-tiers.tsx) — cas test originel
- [src/components/shared/modal.tsx](../../src/components/shared/modal.tsx) — devient Dialog deprecated
- [src/lib/utils/index.ts](../../src/lib/utils/index.ts) — `cn()` réutilisé
- [playwright.config.ts](../../playwright.config.ts) — étendu projects `visual` / `a11y` / `i18n`
- [package.json](../../package.json) — nouvelles deps : `@storybook/nextjs-vite`, `chromatic`, `@axe-core/playwright`, `cmdk`

---

## 21. Réutilisations (zéro duplication)

- `cn()` (`clsx + tailwind-merge`) — déjà en place
- `class-variance-authority@0.7.1` — déjà en deps, enfin utilisé
- `defineManifest` pattern backend — étendu via `defineComponentManifest`
- Tokens dans `@theme` — consommés via Tailwind 4 auto-mapping
- ADR template — emprunté à 0001
- Drift test §4 — emprunté à MISSION.md
- LEXICON pattern — emprunté à LEXICON.md
- Map doc pattern — emprunté à SERVICE-MAP / ROUTER-MAP / PAGE-MAP
- Strangler migration approach — emprunté à backend (REFONTE-PLAN Phase 4)
- `eslint-plugin-lafusee@0.2.0` — étendu (5 règles existantes + 2 nouvelles)
- Husky pre-commit — déjà actif (régen CODE-MAP), étendu avec `audit:design`

---

## 22. Anti-patterns interdits (bloquants CI)

| Anti-pattern | Rule | Override |
|---|---|---|
| `text-zinc-*` / `bg-zinc-*` / `border-zinc-*` hors `primitives/**` | `lafusee/design-token-only` | `// eslint-disable-next-line ... — <justification>` |
| `text-violet-*` / `bg-emerald-*` / etc. | idem | idem |
| `#[0-9a-fA-F]{3,8}` direct dans `*.tsx` | idem | whitelist : SVG icons LaFusée logo |
| `var(--ref-*)` consommé hors Tier 1/2/3 | `tests/unit/governance/design-tokens-cascade.test.ts` | aucun |
| Variant en `[a, b, c].join(" ")` ou ternaire | `tests/unit/governance/design-primitives-cva.test.ts` | aucun |
| Composant sans `*.manifest.ts` | `tests/unit/governance/design-manifest-coverage.test.ts` (PR-2+) | `primitives/**` only |
| Layout portail sans `data-density` | `tests/unit/governance/design-portal-density.test.ts` | aucun |
| Direct `import { X } from 'lucide-react'` hors `primitives/icon.tsx` | `lafusee/no-direct-lucide-import` | `primitives/icon.tsx` only |
| Commit `feat/fix/refactor/chore` sans CHANGELOG entry | `scripts/audit-changelog-coverage.ts` (NEFER §6.0) | aucun |

---

**NEFER signe son commit. NEFER laisse le repo plus rangé. NEFER ne dérive pas.**

*Le bon sens dérive. Le protocole tient. Le repo reste propre.*
