# Audit Frontend Design — landings, motion, DS, respiration — 2026-07-16

> **Mandat opérateur** (verbatim) : « il manque ÉNORMÉMENT d'éléments, de micro-interactions, du three.js, les landing pages de l'accueil et de la fusée ne sont ni à jour, ni finies. On a un design system impressionnant mais il reste encore des dizaines voire des centaines d'éléments. Ce qui fait que ça semble encore chargé et peu respirant. Audite. »
>
> **Méthode** : 3 passes d'inventaire ground-truth parallèles (surfaces publiques · motion/3D · DS/densité) + **captures d'écran réelles** de 13 routes publiques en desktop 1440px et mobile 390px (app bootée localement : PG 16 + migrations + seeds, Next dev, Playwright/Chromium). Grille de lecture : skill `frontend-design` (vendorisé ce jour dans `.claude/skills/frontend-design/`) appliqué **à l'intérieur** du canon UPgraders DS (ADR-0097, `docs/governance/DESIGN-SYSTEM.md`, `docs/governance/DESIGN-MOTION.md`). **Commit épinglé : `ff7560146182f8fa38cb8b77e8fcab6766e6748a`** — toutes les réfs `fichier:ligne` sont vraies à ce commit.
>
> **Aucune correction implémentée dans cette passe.** La section E est une roadmap proposée, pas une implémentation.

---

## Verdict — adjudication des 4 intuitions du mandat

| # | Intuition opérateur | Verdict | Résumé de la preuve |
|---|---|---|---|
| 1 | « Les landings de l'accueil et de la fusée ne sont ni à jour, ni finies » | **VRAI, mais pas où on l'attend** | Les 3 landings sont visuellement *composées* et quasi complètes structurellement. Le « pas fini » réel = **claims mensongers** (email jamais envoyé, télémétrie « LIVE » statique, témoignages inventés), **features récentes invisibles** (leaderboard, pages `/b/[slug]` vendus nulle part), **chiffres contradictoires** (7 ans vs 8 ans, v6.27 en dur vs `APP_VERSION`), et **jargon interne exposé** (§A) |
| 2 | « Il manque énormément de micro-interactions, du three.js » | **VRAI, chiffré** | 0 lib motion, 0 three.js/WebGL/canvas, 562 `transition-colors` pour 14 `transition-transform`, hover primitives couleur-only, **animations modal/toast littéralement mortes** (classes `animate-in` sans plugin), 8/17 keyframes orphelines, hook scroll-reveal jamais importé, View Transitions absentes (§B) |
| 3 | « DS impressionnant mais des dizaines/centaines d'éléments manquants » | **INVERSE** | Le DS a **38 primitives CVA + 4 brand** — plus que le handoff (15). Ce qui « manque » n'est pas des primitives : ce sont **3 systèmes UI parallèles** (primitives vs `shared/` vs ~2 700 lignes de CSS bespoke `ck-*`/`lf-*`/`lb-*`/`pb-*`) et ~10 primitives applicatives réellement absentes (DataTable, DatePicker, FileUpload…) (§C) |
| 4 | « Ça semble chargé, peu respirant » | **VRAI, et le levier existe déjà** | Dashboard = 15-18 panneaux, gap 16px uniforme, titres de carte 14px, 674 occurrences `text-[9-11px]`, bordure 1px sur chaque tuile. **Le système de densité `data-density="airy/editorial"` est défini dans les tokens (`component.css:133-157`) et consommé 0 fois** (§D) |

**Le diagnostic en une phrase** : le problème n'est pas la quantité d'éléments — c'est que **les surfaces app n'utilisent pas le DS qui existe** (CSS main-roulé, densité jamais activée, illustrations livrées jamais branchées), que **le motion s'arrête à `transition-colors`**, et que **les landings vendent un produit d'il y a 3 mois avec des données inventées**.

---

## A. Landings — fraîcheur & finition

### A.0 Cartographie — trois landings qui se chevauchent, sans arbitrage

- `/` — **UPgraders** (agence), chrome `SiteNav`/`SiteFooter` — `src/app/(marketing)/page.tsx` (323 l.)
- `/lafusee` — **La Fusée** (l'OS produit), chrome `MarketingNav`/`MarketingFooter` — `src/app/(marketing)/lafusee/page.tsx` (44 l. + 13 composants ≈ 1 388 l.)
- `/landingintake` — **« La Fusée by UPgraders »** (acquisition PME) — `src/app/(marketing)/landingintake/page.tsx` (518 l., stylesheet scopée `.lf`)

Trois heros, trois promesses, deux chromes, deux systèmes de tokens. C'est cohérent avec la doctrine UPgraders ≠ La Fusée, mais **aucune des trois ne référence clairement les deux autres comme des étages d'un même funnel** — et elles divergent sur les chiffres (A3).

### A1 — P0 · `/landingintake` : claims faux côté client

- **Le modal de diagnostic prétend envoyer un email qui n'existe pas** : « Une copie du lien a été envoyée à {email} » (`src/app/(marketing)/landingintake/page.tsx:460`) alors que `goToIntake()` ne fait que router vers `/intake?…` (`:438-441`). Aucun appel backend. C'est un mensonge UI de confiance sur la surface d'acquisition n°1.
- **Témoignages entièrement inventés présentés comme réels** : « Awa Mensah · Zola Apparel · +19 pts », « Fatou Diané · Sira Cosmetics · +24 pts », « Kwame Boateng · Boateng & Fils · +16 pts » (`:300-302`), portraits `public/brand/people/`. Doublés de social proof chiffrée fabriquée : « +250 dirigeants accompagnés », « 4,9/5 de satisfaction » (`:120-121`, `:332-336`). Le rapport ADVE flotté « Zola Apparel 78/100 » est codé en dur (`:230`, piliers 82/64/71/88 `:55-60`). Règle circuit-de-la-donnée : *ne jamais combler un trou en inventant des données* — c'est exactement ce que fait cette page, face au prospect.
- Footer : `<a onClick role="button">` sans `href` (`:397`).

### A2 — P0 · `/lafusee` : fausse télémétrie « LIVE »

- Panneau hero « TELEMETRY · LIVE » : `brand.diagnosed 127`, `superfans.tracked 142,388`, `talents.tier_3+ 214`, « updated / **now** » (`src/components/landing/marketing-hero.tsx:91-108`) — **tout est statique**. La barre système « 47 MARQUES DIAGNOSTIQUÉES · SCORE MOYEN /200 · 142 » (`:33-39`) aussi. Le ticker défile 9 faux événements (`marketing-strip.tsx:3-13`). Une landing qui vend « zéro jury, zéro IA, la mesure » ne peut pas simuler sa propre mesure — c'est l'attaque la plus facile contre le produit.
- Le diagnostic simulé affiche l'exemple `https://luxorhotels.ci` → score 115/200 en dur (`marketing-diagnostic.tsx:86,90,125`).

### A3 — P1 · Incohérences de fraîcheur inter-surfaces

- **Ancienneté** : « 7 ans » sur `/` (`src/components/upgraders/data.ts:604-609`) et `/lafusee` vs « **8 ans** d'expertise terrain » sur `/landingintake` (`:335`).
- **Version** : tag « v6.27 » **codé en dur** dans la nav (`marketing-nav.tsx:56`) vs `v{APP_VERSION}` réel au footer (`marketing-footer.tsx:4,105`) — la nav mentira à chaque bump.
- **Emails** : `bonjour@upgraders.pro` / `trust@lafusee.upgraders.io` (`trust-center/page.tsx:127`) / `xtincell@gmail.com` — trois domaines selon la surface.
- **Casse** : « Argos by LaFusée » (`argos/layout.tsx:26,38`) vs « La Fusée » partout ailleurs.

### A4 — P1 · Les features récentes ne sont pas vendues

- **`/leaderboard`** (championnat public, ADR-0149, LE hook viral du scoreur) : **invisible** depuis `/`, `/lafusee`, `/landingintake` et les deux footers. Seul `/scorer` y lie (`src/app/scorer/page.tsx:117-141`).
- **`/b/[slug]`** (pages publiques de marque, ADR-0132) : **jamais mentionnées** sur aucune surface marketing — alors que chaque page de marque est un canal d'acquisition gratuit (« Propulsé par La Fusée »).
- **Mobile money** : bien vendu sur `/lafusee` et `/LaGuilde` ; réduit à une micro-mention sur `/` (`page.tsx:90`) ; absent de `/landingintake` (WhatsApp-contact seulement) — la cible PME de cette page est précisément celle qui paie en mobile money.

### A5 — P1 · Jargon interne exposé au public sur `/lafusee`

`MarketingDiagnostic` affiche les outils internes `Mestor.scan, Artemis.diff, Seshat.tone, Ptah.brand, Thot.audit` (`marketing-diagnostic.tsx:6-15`) et `MarketingGouverneurs` étale les 7 Neteru avec leurs règles techniques (`marketing-gouverneurs.tsx:20-77`). La doctrine (KB + ADR-0123 + commentaire `data.ts:9`) interdit les alias mythologiques côté client. Le test HARD `cockpit-vocabulary` ne couvre pas `(marketing)` — trou de périmètre.

### A6 — P2 · `/intake` : finition de copy

- **Accents manquants systématiques** : « Methode guidee », « Repondez », « Demarrage », « donnees confidentielles » (`src/app/(intake)/intake/page.tsx:52,60,262,386,510,517`) — sur le funnel payant.
- En-tête de module CdC laissé dans le source (`:1-19`, « Score: 95/100 | Status: FUNCTIONAL »).
- La page utilise `primary` là où les landings utilisent `accent` — deux vocabulaires de tokens sur le même funnel.

### A7 — P2 · Divers

- Commentaire mort de 9 lignes expliquant une `figcaption` retirée (`(marketing)/page.tsx:120-128`).
- Dates légales figées « 12 juin 2026 » (`cgv`, `trust-center`) — vraies au moment de la rédaction, à surveiller.
- Chaque portail public réimplémente son chrome (GuildShell, argos/layout, nav inline `/scorer`, LegalShell) — pas de nav/footer public universel.

---

## B. Motion / micro-interactions / 3D

### B0 — État des lieux chiffré

- **Dépendances** : `three` / `@react-three/fiber` / `framer-motion` / `gsap` / `lottie` / `react-spring` / `tailwindcss-animate` — **toutes ABSENTES** de `package.json`. Toute l'animation du repo = CSS keyframes + `requestAnimationFrame` maison + transitions Tailwind.
- **Usages** : `transition-colors` ×562 · `transition-all` ×104 (anti-pattern interdit par le canon `DESIGN-MOTION.md` §6) · `transition-opacity` ×32 · `transition-transform` ×14. `animate-spin` ×115, `animate-pulse` ×63. Une seule `active:scale-*` sur tout le repo.
- **Keyframes** : 17 définies dans `globals.css:375-458`, **8 orphelines** (`slide-down`, `slide-in-right`, `score-count`, `glow-pulse-cta`, `float`, `draw-line`, `slide-up-lg`, `blur-in`).

### B1 — P0 · Animations modal/toast MORTES (bug silencieux)

`modal.tsx:107` (`animate-in fade-in zoom-in-95`), `notification-toast.tsx:91` (`animate-in slide-in-from-top-2`), `intake-processing-screen.tsx:236` — syntaxe du plugin **`tailwindcss-animate` qui n'est pas installé**, et aucune de ces keyframes n'existe en CSS. En Tailwind 4 ces classes ne génèrent **rien** : les modals et toasts apparaissent **secs**, sans transition, partout dans l'app. À réparer en premier — c'est le micro-motion le plus visible au quotidien.

### B2 — P1 · Les primitives n'ont pas d'états travaillés

`TRANSITION_BASE = "transition-colors …"` (`src/components/primitives/cva-presets.ts:24`) : Button et Card ne réagissent qu'en **couleur** (`button.tsx:14-46`, `card.tsx:12,22`). Pas de press feedback (`active:scale`), pas de lift (`hover:-translate-y` + ombre), pas de transition d'apparition du focus ring. Le canon motion (`--ease-spring`, durées tokenisées) existe (`src/styles/tokens/animations.css:6-35`) mais les composants ne le consomment presque jamais — les durées utilisées sont hardcodées (`duration-500` ×11, `duration-700` ×5 vs `duration-fast` ×2).

### B3 — P1 · La landing produit est statique ; l'infra de reveal existe et n'est pas branchée

- `/lafusee` = **14 sections empilées sans aucune orchestration** (Server Component, 0 reveal, 0 stagger, 0 séquence d'entrée). La seule landing orchestrée est `/landingintake` (IntersectionObserver + stagger 80ms, `landingintake/page.tsx:35-53`).
- Le hook générique `src/hooks/use-scroll-reveal.ts` (stagger + reduced-motion, bien écrit) a **zéro consommateur** — code mort.
- Patterns du canon jamais implémentés : radar sweep 8s (`marketing-surveillance.tsx` est statique), particle rise hero, glow pulse CTA (keyframe définie, orpheline), « Page navigation opacity » (View Transitions API : **0 usage**, pas de `view-transition-name`, pas de flag Next).
- `animations.css:2` prétend contenir les « @keyframes consolidées » — il n'en contient aucune (elles sont dans `globals.css`) ; le renvoi de `DESIGN-MOTION.md:127` est donc mensonger.

### B4 — P1 · Accessibilité motion incomplète

Le neutraliseur global `prefers-reduced-motion` existe (`globals.css:316-323`) mais **les count-up rAF ne le vérifient pas** : `score-badge.tsx:78-101` (anneau SVG + nombre) et `cult-index.tsx:41-63` (jauge à aiguille) animent toujours. Idem ticker inline `marketing-strip.tsx:26`.

### B5 — P2 · three.js : absent, et à introduire *chirurgicalement*

Zéro `<canvas>`, zéro WebGL, zéro SMIL. Les « props 3D » du canon sont des PNG flottés en CSS (`.up-float`, `patterns.css:129`). Recommandation (grille skill frontend-design : *un* moment signature, pas des effets saupoudrés) :

1. **Un seul théâtre 3D justifiable : le hero de `/lafusee`** — la fusée (l'objet du produit) en scène three.js légère (`@react-three/fiber` + `drei`, chargée en `next/dynamic`, `IntersectionObserver`-gated, fallback = le PNG actuel, `prefers-reduced-motion` → statique). Budget : < 150 Ko gzip, 60fps mid-range mobile sinon fallback.
2. **Alternatives à coût quasi nul avant/à la place du 3D** : le radar de surveillance en vrai sweep SVG/CSS (le composant interactif existe déjà), `draw-line` branché sur les trajectoires APOGEE (keyframe déjà définie), les 13 PNG 3D déjà rendus (voir C5) en parallax CSS léger.
3. **Ne PAS mettre de three.js** sur le cockpit/console (surfaces de travail, données d'abord) ni sur `/landingintake` (cible PME, connexions modestes, le poids prime).

### B6 — P2 · Micro-délices absents des moments de valeur

Le produit a des *moments* (score qui tombe, palier franchi, mission publiée, Oracle assemblé) sans aucune célébration : pas de confetti/spring sur le reveal du score `/scorer`, entrées de log `OracleLiveConsole` sans fade/stagger (`live-console.tsx:44-46` — seul un auto-scroll), pas de count-up sur les KPI cockpit (le composant existe : `score-badge.tsx`). Ce sont les micro-interactions à plus fort ROI émotionnel — avant tout WebGL.

---

## C. Design System — gaps réels & systèmes parallèles

### C0 — Le DS canon est plus riche que le handoff

Handoff `docs/design-system/upgraders/` = 15 composants spécifiés (11 core + 4 brand). Code réel = **38 primitives CVA** (`src/components/primitives/index.ts:1-61`, toutes avec manifest + a11y AA, familles form/display/feedback/loading/layout/typo/nav) + 4 brand. Tabs, Accordion, Tooltip, Popover, Pagination, Breadcrumb, Stepper, Command palette, Sheet/Drawer, Banner : **tous existent déjà**. L'intuition « il manque des centaines d'éléments » ne vise pas les primitives.

### C1 — P0 · Trois systèmes UI parallèles (la cause racine du « chargé »)

1. **`primitives/`** — 38 composants CVA tokens-only (le canon).
2. **`shared/`** — 32 composants (`shared/index.ts:1-32`) qui **dupliquent** les primitives : `shared/tabs` ⟂ `primitives/tabs` · `shared/modal`+`confirm-dialog` ⟂ `primitives/dialog` · `shared/select-input` ⟂ `primitives/select` · `shared/notification-toast` ⟂ `primitives/toast` · `shared/loading-skeleton` ⟂ `primitives/skeleton` · `shared/form-field` ⟂ `primitives/field`.
3. **CSS bespoke** — ≈ **2 727 lignes** : `cockpit/dashboard.css` (390 l., **210 classes `.ck-*`**), `pillars.css` (682 l.), `notoria.css` (178), `oracle*.css` (218), `landingintake.css` (405), `leaderboard.css`… Le dashboard cockpit et les pages piliers ne consomment **quasi aucune primitive** — des `<div className="ck-...">` main-roulés.

Chaque nouveau panneau choisit son système → trois rendus différents pour « une carte avec un titre », d'où l'impression de charge. **La remédiation n'est pas « créer des composants », c'est migrer les surfaces vers les 38 qui existent.**

### C2 — P1 · Surfaces publiques divorcées des tokens

- **`/leaderboard`** (vitrine publique du scoreur !) : palette crème/or/vert propre en hex (`--lb-*`, `src/styles/leaderboard.css:5-33`) et **`font-family: ui-sans-serif, system-ui…`** (`:19`) — ni Clash, ni Satoshi, ni un seul token DS. Vérifié en capture : la page ne ressemble à aucune autre surface de la marque. C'est en outre exactement le « look IA par défaut n°1 » (crème + terracotta) contre lequel le skill frontend-design met en garde.
- **`/landingintake`** : `.lf` redéfinit toute sa palette en hex codés en dur (`landingintake.css:18-40`) **alors que son propre en-tête prétend « ce fichier consomme des tokens, jamais de couleurs en dur »** (`:12`).
- **`/b/[slug]`** : classes `pb-*` logées dans `cockpit/dashboard.css:285-297` — styles d'une page publique dans le CSS du dashboard.

### C3 — P1 · Primitives réellement manquantes (vérifié par grep, 0 hit)

| Manquant | État actuel |
|---|---|
| **DataTable** | `shared/data-table.tsx` seul (pas de manifest/variants) — à promouvoir |
| **Timeline** | `shared/timeline.tsx` seul — à promouvoir |
| **StatCard / MetricCard** | `shared/` seul (spécifié par le handoff pourtant) — à promouvoir |
| **DatePicker / Calendar** | absent (panneaux calendrier cockpit main-roulés) |
| **FileUpload / Dropzone** | absent |
| **DropdownMenu** (menu générique) | absent (Select/Popover/Command seuls) |
| **Slider / Range** | absent |
| **Carousel** | absent |
| **Rating** | absent |
| **Kanban** | main-roulé inline (`console/socle/pipeline/page.tsx:190-277`) |
| **TreeView** | app-spécifique (`portfolio/PortfolioTreeView.tsx`) |

### C4 — P2 · Doublons `shared/` à résorber

Les 6 paires listées en C1.2 + `StatusBadge`/`TierBadge`/`ScoreBadge` (3 badges spécialisés hors variants du `badge` primitif).

### C5 — P2 · Illustrations de marque livrées, jamais branchées

`public/brand/illustrations/` = **13 PNG 3D** (rocket, trophy, heart, target, lightbulb, megaphone, coins, gift, growth, speech, sphere, thumbsup, camera). **Usage réel : 3** (`rocket-3d` ×2, `trophy-3d` ×1). Les EmptyStates — le composant le plus vu d'un produit jeune — sont du texte nu + icône Lucide monochrome (`shared/empty-state.tsx:24-47`), alors que le canon prévoit 3D « propulsion », doodlelisme, stickers (`readme.md:134-146`). Brancher les 10 illustrations dormantes dans EmptyState/onboarding/célébrations = le délice le moins cher du backlog.

---

## D. Densité / respiration

### D1 — P1 · Le levier de respiration existe et est débranché

`component.css:133-157` définit **4 tiers de densité** `[data-density="compact|comfortable|airy|editorial"]` (`--card-px/py/gap` 12px → 32px → clamp(24,3vw,40)). Consommation dans `src/app` + `src/components` : **0**. Tout rend au défaut serré. Les pages marketing prouvent que la respiration est dans l'ADN possible du produit (`.sec { padding: 96px 0 }`, `landingintake.css:217`) — le problème est **app-only** (cockpit + console).

### D2 — P1 · Aucun token d'espacement sémantique

Grep `--section-gap|--stack-gap|--layout-gap` = 0. Il n'existe que l'échelle brute `--space-1..24` + `--bento-gap` + `--pad-page` : chaque page choisit sa respiration à la main (`space-y-6`, `gap-4`, `gap: 16px`) → incohérence structurelle de densité entre surfaces.

### D3 — P1 · Le dashboard chiffré (pourquoi « ça semble chargé »)

`src/app/(cockpit)/cockpit/page.tsx` + `dashboard.css` :
- **15-18 panneaux** sur la vue MARKETING (`page.tsx:323`) ;
- gap **16px uniforme** (`.ck-dash`/`.ck-grid`, `dashboard.css:7,36`), padding cartes 18-20px (`:159`) ;
- **titres de carte 14px** (`.ck-card__t`, `:161`) — en Satoshi, pas en Clash (la « voix » display est réservée au titre de page et aux gros chiffres) ; labels 12px, deltas **11px** (`:150-154`) ;
- **bordure 1px sur chaque tuile** → l'œil ne repose jamais ;
- à l'échelle du repo : **674 occurrences `text-[9-11px]` sur 143 fichiers**, violant le canon « jamais < 12px » (`readme.md:114`) — ex. console pipeline `text-[10px]` ×7 + `text-[9px]` (`console/socle/pipeline/page.tsx:213-390`).

### D4 — P2 · Couleurs Tailwind brutes dans les consoles

`text-blue-400`, `bg-blue-500/5`, `text-cyan-400`, `text-amber-400`, `from-zinc-700` (`console/socle/pipeline/page.tsx:55-89,302`) — violations de l'interdit DS #2 hors périmètre du test bloquant actuel.

---

## E. Roadmap de remédiation proposée (lots)

| Lot | Périmètre | Contenu | Effort |
|---|---|---|---|
| **A — Honnêteté marketing** (P0) | `/landingintake`, `/lafusee` | Supprimer le faux « email envoyé » (ou brancher un vrai envoi Resend), télémétrie hero branchée sur compteurs réels (mêmes procédures publiques que `/intake` `getCompletedCount`) ou étiquetée « démo », témoignages réels ou étiquetés « scénario illustratif », social proof chiffrée retirée tant que non mesurée, `v6.27` → `APP_VERSION`, 7/8 ans unifiés, un seul domaine email | S-M |
| **B — Fondation motion** (P1) | primitives + tokens | Réparer les `animate-in` morts (keyframes locales ou `tw-animate-css`), presets CVA `hover-lift`/`press` consommant `--ease-spring`/`--motion-*`, purge des 8 keyframes orphelines, reduced-motion sur les count-up rAF, brancher `use-scroll-reveal` sur `/lafusee` (14 sections), View Transitions Next | M |
| **C — Respiration app** (P1) | cockpit + console | Activer `data-density` (dashboard=`comfortable`, pages lecture=`airy`, marketing=`editorial`), tokens `--section-gap`/`--stack-gap`, dashboard : titres de carte 14→16-18px Clash, gap 16→24, remplacer 50 % des bordures par l'élévation, purge `text-[9-11px]` (verrou CI), étendre le test DS #2 aux consoles | M-L |
| **D — Unification DS** (P1-P2) | surfaces publiques + shared/ | `/leaderboard` et `/landingintake` re-basés sur les tokens + fonts DS, `pb-*` sorti de `dashboard.css`, promotion DataTable/Timeline/StatCard en primitives, résorption des 6 doublons `shared/`, DatePicker + FileUpload + DropdownMenu | L |
| **E — Signature & delight** (P2) | landings + moments produit | Vendre `/leaderboard` + `/b/[slug]` sur les 3 landings et footers, purge jargon Neteru de `/lafusee` (+ extension test vocabulaire au groupe `(marketing)`), illustrations 3D dans EmptyStates, célébrations (score reveal, palier), radar sweep, **puis seulement** le hero three.js de `/lafusee` (budget B5) | M-L |

Ordre recommandé : **A (jours) → B (débloque tout le reste) → C → D → E**. Le three.js arrive en dernier délibérément : sans lot B, une scène WebGL sur une app dont les toasts apparaissent secs serait un accessoire, pas une signature (règle Chanel du skill).

## F. Verrous CI proposés (classes de problèmes, pas instances)

1. `no-dead-tailwind-animate` : interdire `animate-in|zoom-in|slide-in-from` tant que le plugin/keyframes n'existent pas.
2. `marketing-vocabulary` : étendre le test HARD `cockpit-vocabulary` au groupe `(marketing)` (Neteru/outils internes).
3. `no-microtype` : bloquer `text-[<12px]` hors allowlist data-viz.
4. `tokens-on-public-surfaces` : interdire les hex bruts dans `src/styles/leaderboard.css`-like (retirer l'exemption `styles/**` pour les feuilles *scopées à une page publique*).
5. `no-hardcoded-app-version` : grep `v6\.\d+` dans les composants (hors `APP_VERSION`).

---

*Captures d'écran de référence (13 routes × desktop/mobile) archivées hors repo — session d'audit 2026-07-16. Reproductibles : PG local + `npm run db:seed && npm run db:seed:demo` + Playwright sur les routes listées §A0.*
