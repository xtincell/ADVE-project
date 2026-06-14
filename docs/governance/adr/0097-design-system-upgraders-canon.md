# ADR-0097 — UPgraders Design System = source de vérité unique du design

**Date** : 2026-06-14
**Statut** : accepted
**Phase de refonte** : phase/11 (DS canon refresh)
**Supersedes** : [ADR-0013](0013-design-system-panda-rouge.md)

## Contexte

Le client (Alexandre, UPgraders SARL) a produit, via Claude Design (claude.ai/design), un
**handoff complet du Design System UPgraders** — *« La Passion pour Propulseur »* —
reconstruit à partir des maquettes de marque réelles (7 visuels), des logos, polices et
photographies fournis, en lisant le codebase existant. Le bundle est livré en
[docs/design-system/upgraders/](../../design-system/upgraders/) (tokens CSS, composants,
guidelines, `SKILL.md`, `_ds_manifest.json`).

Ce handoff **diverge volontairement** de la palette Phase 11 ([ADR-0013](0013-design-system-panda-rouge.md)) :

| Dimension | ADR-0013 (Phase 11) | UPgraders DS (canon) |
|---|---|---|
| Rouge signature | `#e63946` | **corail `#E56458`** (hover `#EF7D71`, active `#C8473C`, ember `#FF6B3D`) |
| Accent niveau | — | **or `#FACC15`** (gamification APOGEE, homéopathique) |
| Display font | Inter Tight | **Clash Display** (self-hosted woff2) |
| Text font | Inter / Inter Tight | **Satoshi** (self-hosted woff2) |
| Mono | JetBrains Mono | JetBrains Mono (inchangé) |
| Rayons | 2 → 24px | **bento "du cube au cercle" 6 → 36px** |
| Texture | — | **géométrique africaine** (kente/adinkra, `.up-texture-geo`) |
| Composants marque | — | **Logo, LevelBadge, Sticker, PortalCard** |
| Photographie | — | portraits entrepreneurs ouest-africains (`public/brand/photos`) |

Décision opérateur (2026-06-14) : *« le nouveau DS est la seule source de vérité pour le
design system, aligne tout le reste à ça »*. Adoption canon complète, pas de cohabitation.

## Décision

**Le UPgraders Design System ([docs/design-system/upgraders/](../../design-system/upgraders/))
devient la source de vérité unique du design.** Tout le reste s'aligne dessus.

### 1. Architecture conservée, valeurs remplacées

La **cascade 4 tiers** (Reference → System → Component → Domain), les **3 interdits DS** et la
**gouvernance CI** d'ADR-0013 restent en vigueur. Seules changent les **valeurs canoniques** :

- **Tier 0 — `src/styles/tokens/reference.css`** : pigments canoniques `--up-*` (valeurs hex
  exactes du handoff) ; les `--ref-*` historiques deviennent des **alias** de `--up-*`
  (rétro-compat des Tiers 1/2/3 sans réécriture). 2 nouveaux refs : `--ref-violet`,
  `--ref-gold-deep`.
- **Tier 1 — `src/styles/tokens/system.css`** : `--color-*` inchangés en nom, revalués via la
  cascade. Ajout `--color-level` / `--color-level-subtle` (or). Theme clair via
  `[data-theme="bone"]` **ou** `[data-theme="light"]` (alias DS).
- **Couche sémantique DS — `src/styles/tokens/upgraders.css`** (nouveau, hors `@theme`) :
  vocabulaire du handoff (`--surface-*`, `--accent`, `--text-primary`, `--glass-*`,
  `--glow-*`, `--ease-*`, motion) + utilitaires de marque (`.up-glass`, `.up-texture-geo`,
  `.up-eyebrow`, `.up-grain`) + CSS des composants de marque. Volontairement hors `@theme`
  car `--text-*` y est réservé aux tailles de police Tailwind (collision évitée).
- **`src/styles/globals.css`** : familles `--font-*` → Clash/Satoshi/JetBrains ; rayons bento ;
  échelle type étendue (`--text-2xs`, `--text-hero`).

### 2. Polices self-hosted

Clash Display + Satoshi (woff2 variables) → `src/assets/fonts/upgraders/`, chargées via
`next/font/local` au RootLayout (vars `--font-clash`, `--font-satoshi`) + JetBrains Mono via
`next/font/google`. Le `(marketing)/layout` hérite (plus de double chargement Inter
Tight/Fraunces). Offline-ready, aucune dépendance CDN pour le display/texte.

### 3. Assets de marque

`public/brand/` : `logos/` (11 PNG — hexagone, lockups, wordmark, monogramme, cachet SARL),
`photos/` (8 portraits/hubs), `illustrations/` (planche 3D/stickers/doodles).

### 4. Composants de marque

`src/components/brand/` : `Logo` (rend l'artwork réel par variant), `LevelBadge` (médaille
hexagonale niveau/XP), `Sticker` (die-cut culture-entrepreneur), `PortalCard` (sélecteur de
portail). Portés du handoff en TSX SSR-safe (CSS statique dans `upgraders.css`, pas
d'injection runtime).

### 5. Bundle vendorisé

Le handoff complet (tokens, composants, guidelines, `SKILL.md`, manifest) est vendorisé en
[docs/design-system/upgraders/](../../design-system/upgraders/) — **artefact source de vérité
en repo**. Les `uploads/` (150 Mo d'installeurs de polices) sont exclus ; les binaires réels
vivent dans `public/brand/` et `src/assets/fonts/upgraders/`.

## Conséquences

- **Positives** : identité brand réelle (logos/photos/polices fournis), cohérence avec les
  maquettes, gamification (or/niveau) et ancrage africain (texture) first-class, source de
  vérité unique et vendorisée. Aucune réécriture des composants existants (cascade alias).
- **Coûts** : `#e63946` → corail propagé ; ADR-0013 archivé ; +47 Mo de photos en repo.
- **Risques** : contraste WCAG du corail à surveiller (même règle qu'ADR-0013 : pas de body
  copy en rouge) ; tests visuels Storybook à re-baseliner.

## Alignement (7 sources de vérité)

reference.md / system.md (catalogues) · DESIGN-SYSTEM.md · DESIGN-LEXICON.md · CLAUDE.md
(section DS) · CHANGELOG.md · ADR-0013 (banner superseded). Tests `design-tokens-coherence`
+ `design-tokens-cascade` + `design-tokens-canonical` restent verts.
