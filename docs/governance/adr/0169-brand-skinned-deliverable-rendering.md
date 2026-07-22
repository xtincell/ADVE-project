# ADR-0169 — Rendu des livrables aux couleurs de la marque (brand-skinning)

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Phase 1 (débloqueur), suite du mandat « fermer tous les gaps » (Brand Books Motion19/SPAWT fournis par l'opérateur)
- **Depends on** : ADR-0130 (accent cockpit par marque — même donnée, côté client), ADR-0097 (UPgraders DS = fallback), ADR-0168 (tolérance de forme du coffre)
- **Supersedes** : —

## Contexte

Les Brand Books réels fournis par l'opérateur (Motion19 16 p., SPAWT 40 p.) ont rendu vivant un constat :
**La Fusée est forte en intelligence, faible en production.** Le générateur de Bible de Marque
(`brand-bible-pdf.ts`) compilait déjà honnêtement la séquence `BRANDBOOK-D` (empty-states, zéro
fabrication) — mais **rendait dans la palette UPgraders EN DUR** (`const C`, corail/panda/or). L'Oracle PDF
(`export-oracle.ts`) était pire : noir sur blanc, sans aucune identité. Un livrable censé porter la marque
du client sortait au gabarit générique de l'agence.

Aucun **résolveur de thème serveur** n'existait : le seul theming par marque était côté client, accent-only
(`getBrandIdentity` + `BrandAccentVars`, ADR-0130). Pourtant la **matière** pour skinner est déjà produite
et persistée : la séquence `BRANDBOOK-D` elle-même (étapes `chromatic-strategy-builder` +
`typography-system-architect`) écrit la palette et la typo de la marque dans le coffre
(`CHROMATIC_STRATEGY` / `TYPOGRAPHY_SYSTEM`), + le logo (`LOGO_FINAL`/`LOGO_IDEA`). Le trou était un
trou de **rendu**, pas de collecte.

## Décision

### 1. Résolveur de thème serveur — `src/server/services/brand-theme/index.ts`

`resolveBrandTheme(strategyId) → BrandTheme` : **déterministe, zéro LLM, lecture seule**. Dérive un thème
de rendu des couleurs de la marque depuis son coffre (`CHROMATIC_STRATEGY` / `TYPOGRAPHY_SYSTEM` ACTIVE en
priorité puis récent ; logo `LOGO_FINAL` ACTIVE > récent > `LOGO_IDEA`). Cœur pur `buildBrandTheme(...)`
testable sans DB.

- **Tolérant de forme** (même leçon qu'ADR-0168) : `collectHexes` récolte tout hex valide où qu'il soit —
  champs `accent`/`primary`, tableau `full[]`, champs nommés, et **clés** `roles[hex]` (Motion19 indexe par
  hex). `extractFontFamilies` tolère `primary/secondary` (SPAWT) comme `display/text` (Motion19).
- **Lisibilité garantie** : chaque couleur de texte est calculée contrastée sur son fond (ratio WCAG).
  `readableTextOn` = blanc par défaut (norme design), noir-quasi si le blanc est illisible (or/crème) —
  **ferme le bug latent « blanc sur or illisible »**. `accentOnLight` = l'accent comme texte sur fond clair,
  rétrogradé sur l'encre si trop clair.
- **Fallback honnête** : aucune palette de marque → thème UPgraders DS **identique** au comportement actuel
  (`isFallback: true`, réversible — comme ADR-0130). Le logo et les familles de police sont conservés même
  en fallback.
- **Zéro fabrication** : le thème ne vient QUE de la donnée du coffre ; rien n'est inventé.

### 2. Générateurs re-thémés

- **`brand-bible-pdf.ts`** : `const C` supprimé → thème threadé (`opts.themeOverride ?? resolveBrandTheme`)
  dans couverture/section/cadre/légende ; **logo dessiné sur la couverture** (`embedLogo` : data-URL direct,
  http en best-effort avec timeout, échec → pas de logo jamais d'exception) ; nom de marque en couleur
  d'accent. La signature producteur reste (« Propulsé par La Fusée » — honnête).
- **`export-oracle.ts`** : touche légère — barre + titre + titres de section en accent lisible ; le corps
  reste noir sur blanc (lisibilité). `opts.themeOverride` ajouté.

L'embarquement des **fichiers de police** (jsPDF `addFont` depuis `TYPOGRAPHY_SYSTEM.files[]`) est déféré
(réseau + TTF-only + souvent absent) : le thème expose les familles déclarées ; les PDF gardent helvetica
en attendant (résidu tracé). L'identité passe déjà par **couleurs + logo + nom**, le signal dominant.

## Conséquences

- La Bible de Marque de Motion19 sort **aux couleurs de Motion19** — vérifié E2E sur la base réelle :
  `coverBg #1d1d1d` (anthracite), bandeaux `#3384ff` (bleu digital), texte blanc lisible, `accentOnLight`
  lisible, fontes Exo 2/Roboto exposées, logo embarqué, 13 slides, PDF `%PDF-` valide. Une marque sans
  palette retombe proprement sur UPgraders.
- **Tests** : `tests/unit/services/brand-theme.test.ts` (8 — 2 formes réelles, fallback, lisibilité
  garantie gold/blue) ; `brand-bible-deck.test.ts` étendu (`themeOverride` pour rester pur).
- **0 modèle Prisma**, **0 migration**, **0 LLM**, **0 Intent kind**, cap APOGEE 7/7 préservé. Le résolveur
  est réutilisable par tout générateur de livrable (Phases 2-4).

## Hors périmètre (déféré, tracé RESIDUAL-DEBT)

- Embarquement réel des fichiers de police (jsPDF `addFont`).
- Skinning de la voie puppeteer `oracle-pdf.ts` (via le CSS de la route `/shared/strategy`).
- Le livrable **Brand Book complet** deux-strates (identité + système produit) — Phase 4 du chantier.

## Lectures associées

- ADR-0130 (accent cockpit par marque), ADR-0097 (UPgraders DS canon = fallback), ADR-0168 (tolérance de forme)
