---
name: upgraders-design
description: Use this skill to generate well-branded interfaces and assets for UPgraders ("La Passion pour Propulseur") — a marketing/branding/digital agency serving entrepreneurs in francophone West Africa — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Brand cues: panda-noir + rouge-fusée (#E56458) + gold, Clash Display / Satoshi, very rounded bento surfaces, 3D + doodle + sticker energy, subtle African geometric texture, gamified "level up" system, French copy, dark-first.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy
assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Fast path

1. Link `styles.css` (it `@import`s every token + the webfonts). Wrap your UI in
   `<div class="up-root">`. Dark is default; add `data-theme="light"` for light surfaces.
2. Use the design tokens, never raw hexes: `var(--accent)`, `var(--surface-card)`,
   `var(--text-primary)`, `var(--radius-lg)`, `var(--font-display)`, etc.
3. To use the React components, load the compiled bundle and read the namespace:
   `<script src="…/_ds_bundle.js"></script>` then
   `const { Button, Card, StatCard, LevelBadge, PortalCard } = window.UPgradersDesignSystem_6a9ef3;`
   (run a quick check of the project to confirm the exact namespace suffix).
   Each component also has a `.prompt.md` next to it with usage examples.
4. Icons: reuse `ui_kits/dashboard/icons.jsx` (`window.UPIcons`) or Lucide via CDN — rounded
   2px stroke. Never hand-roll bespoke SVG icons.
5. Logos live in `assets/logos/` (hexagon mark, full lockup, SARL stamp).

## Voice
French, energetic, action-first. Address the user as "vous", the agency as "nous/on".
Sentence-case headings, UPPERCASE eyebrows, the key word in **red**. Amounts in FCFA.
Emoji as warm punctuation only (👋🚀🎉). Examples: "Propulsez votre croissance.",
"Prêt à passer au niveau supérieur ?", "Démarrer maintenant →".

## Look
Rouge-fusée (~20%) for the one obvious CTA per view; white/bone (~40%) for breathing room;
panda-noir surfaces; gold only for level/reward. Very rounded bento cards, layered depth
(glass + floating badges), 3D + doodles + stickers for energy, subtle African geometric
texture. One red CTA per screen. Reach for `LevelBadge`, `Sticker`, `PortalCard` to make it
unmistakably UPgraders.
