# UPgraders — Design System

> **« La Passion pour Propulseur »**
> Le système de design de **UPgraders SARL** — agence de marketing, branding & digital
> basée à Douala, Cameroun, au service des entrepreneurs et marques d'Afrique de l'Ouest
> et francophone.

UPgraders aide les petites marques et entrepreneurs ambitieux à **développer leur
visibilité, engager leur audience et booster leur croissance**. Le produit phare est
**La Fusée — un « Industry OS »** qui industrialise la chaîne créative (du brief au
livrable, du diagnostic au paiement) autour d'un système de **portails** (Client /
Collaborateur / Partenaire / Console) et d'une mécanique de **gamification** (niveaux,
XP, trajectoire APOGEE `ZOMBIE → … → ICONE`).

Ce design system capture cette marque : **éditorial, arrondi, propre et lisible**, avec
un **accent rouge fusée** signature, une base **panda noir / blanc**, du **3D**, de la
**photographie**, du **doodlelisme** et des **stickers** culture-startup, le tout posé
sur une **texture géométrique africaine** subtile. Pensé dark-first, déclinable en clair.

---

## Sources

Ce système a été reconstruit à partir des éléments fournis par le client :

- **Codebase** : `ADVE-project` (« La Fusée — Industry OS »), monorepo Next.js 16 / React 19 /
  Tailwind 4. Design system interne « panda + rouge fusée » (OKLCH, cascade 4 tiers
  Reference → System → Component → Domain). Fichiers de référence lus :
  `src/styles/globals.css`, `src/styles/tokens/{reference,system}.css`,
  `src/app/(console)/console/governance/design-system/page.tsx`.
  Repo d'origine : `github.com/xtincell/ADVE-project` (proprietary).
- **Maquettes de marque** (7 visuels « modern marketing branding », fournis en PNG) :
  écrans dashboard gamifié, landing « La Passion pour Propulseur », board de composants,
  variantes LevelUp / Kombo / BrandLevel. **Source de vérité visuelle** de ce système.
- **Logos** (fournis en PNG transparent, vraie artwork de marque) : marque fusée **UP**
  (`upgraders-icon.png`), lockups horizontal & vertical (couleur + mono), wordmark +
  fusée, monogramme **UP** mono, strapline, plus le cachet SARL. Tous dans `assets/logos/`.
- **Polices** (fournies, hébergées localement) : **Clash Display** + **Satoshi** en
  `.woff2` variables dans `assets/fonts/` — aucune dépendance CDN pour le display/texte.
- **Photographie & illustration** (fournies) : portraits d'entrepreneurs ouest-africains
  (ton chaud, wax, marchés, hubs créatifs) dans `assets/photos/` ; planche
  d'illustration 3D / stickers / doodles dans `assets/illustrations/`.

> ⚠️ Le codebase « La Fusée » utilise Inter Tight / Fraunces et un rouge `#e63946`.
> Les **maquettes de marque** (priorité ici) spécifient **Clash Display + Satoshi**. Le
> rouge signature est le **rouge corail `#E56458`** des logos & maquettes fournis. Ce
> système suit les maquettes, en conservant l'architecture de tokens du codebase
> (cascade reference → semantic, mode bone/panda).

---

## Le système, en une phrase

**Panda noir + rouge fusée + or**, type **Clash Display / Satoshi**, surfaces **bento très
arrondies**, profondeur par **superposition translucide**, énergie par **3D + doodles +
stickers**, ancrage local par **texture géométrique africaine** — dark par défaut, clair
pour l'éditorial.

---

## CONTENT FUNDAMENTALS — voix & ton

La langue principale est le **français** (audience Afrique francophone), avec des emprunts
anglais assumés de la culture startup (« Level Up », « Boss Mode », « Brand Portal »).

- **Tu collectif / vous de politesse** : l'app s'adresse à l'utilisateur en **« vous »**
  (« Voici un résumé de votre activité », « Prêt à passer au niveau supérieur ? »).
  L'agence parle d'elle en **« nous / on »** (« Nous aidons les marques… », « on s'occupe
  de tout »).
- **Énergique, motivant, orienté action.** Verbes à l'impératif : *Découvrir, Démarrer,
  Créer, Booster, Propulser, Commencer maintenant.* Promesse de progression constante.
- **Court et concret.** Titres en 3–5 mots, souvent en triade rythmée :
  *« Votre marque, notre mission, votre succès. »* · *« Stratégie, contenu, communauté. »*
  Le mot-clé de la phrase passe **en rouge** (« votre **croissance** », « pour
  **Propulseur** »).
- **Casing** : titres en *Sentence case* (pas de Title Case). Eyebrows / labels en
  **MAJUSCULES** avec interlettrage large (`BIENVENUE`, `PORTAIL`, `NOS SERVICES`).
- **Chiffres lisibles & locaux** : montants en **FCFA** (`2.450.000 FCFA`), séparateur
  milliers à la française, deltas explicites (`+18%`, `+12% ce mois`). Toujours montrer la
  tendance (▲ vert / ▼ rouge).
- **Emoji : oui, avec parcimonie**, en ponctuation chaleureuse — 👋 (accueil), 🚀 (level
  up), 🎉 (succès), 🙏 (remerciement). Jamais en remplacement d'une icône d'UI.
- **Vocabulaire maison** : *portail, mission, niveau (level), campagne, propulser, marque,
  entrepreneur, communauté, Assistant.* Éviter le jargon corporate froid.

**Exemples canon** : `Propulsez votre croissance.` · `La Passion pour Propulseur` ·
`Votre marque, notre mission, votre succès.` · `Bonjour, Awa 👋` ·
`Prêt à passer au niveau supérieur ?` · `Démarrer maintenant →`.

---

## VISUAL FOUNDATIONS

### Couleurs
- **Rouge Fusée `#E56458`** = signature, ~**20 %** de la surface. Réservé aux **CTA
  primaires**, accents, données « live », états actifs. Un seul CTA rouge évident par vue.
  Hover `#EF7D71`, pressed `#C8473C`, ember chaud `#FF6B3D`.
- **Or `#FACC15`** = niveau / récompense / trophée (homéopathique, jamais en aplat large).
- **Panda noir** : page `#0D0D0D`, cartes `#151515`, élevé `#1F1F1F`, overlay/bord `#2E2E2E`.
  Hues neutres légèrement chaudes (anti-réflexion).
- **Blanc / Bone** : `#FFFFFF` (cartes claires sur fond sombre — blocs éditoriaux),
  `#F5F4F1` (pages claires). ~**40 %** de respiration.
- **Texte** : primaire bone `#F5F4F1`, secondaire `#C9C3B6`, muté `#6B6B6B`.
- **Complémentaires** (charts, portails, stickers, **avec parcimonie**) : vert `#10B981`,
  bleu `#3B82F6`, violet `#8B5CF6`, orange `#F59E0B`.
- **Sémantique** : succès vert, attention orange, erreur rouge, info bleu, niveau or — en
  **fills teintés** (~14 % d'opacité) avec icône + titre colorés.

### Typographie
- **Clash Display** (600/700) — titres, hero, chiffres de niveau. Interlettrage serré
  (`-0.02 → -0.04em`), `line-height` ~1.05. C'est la voix forte.
- **Satoshi** (300–900) — **tout le reste** : corps, libellés, boutons, navigation.
- **JetBrains Mono** — données, KPIs, montants FCFA, IDs, timestamps (chiffres tabulaires).
- Échelle fluide `clamp()` (`--text-*`), du `xs 12px` au `hero 120px`. Jamais < 12px.
- Eyebrows : Satoshi bold 12px, MAJUSCULES, `letter-spacing .12em`.

### Forme, rayons, espacement
- Devise formelle : **« du cube au cercle »**. Rayons généreux : cartes **20px** (lg), hero
  **28px** (xl), surfaces **36px** (2xl), pills & avatars **full**. Inputs/boutons 14px.
- Grille **bento** : `repeat(12, 1fr)`, gap fluide 12–20px. Tout est carte.
- Espacement sur base **4px** (`--space-*`).

### Profondeur, surfaces, transparence
- **Superposition** = méthode de lecture. Infos essentielles en surface ; le détail
  « pour ceux qui veulent aller plus loin » en cartes superposées, badges flottants,
  panneaux **glass** (`backdrop-filter: blur`, fills 4–8 %).
- **Cartes** : fond `surface-card`, bord `1px var(--border)`, rayon 20px, pas d'ombre par
  défaut sur sombre ; **hover** → translateY(-3px) + `shadow-lg` + bord renforcé.
- **Ombres** : douces et noires sur sombre (`--shadow-sm/md/lg`) ; **glow rouge**
  (`--glow-red`) réservé au CTA primaire et aux halos de fusée. Glow or pour le niveau.
- **Cartes claires** sur page sombre = blocs éditoriaux (articles, « Prêt à… »), ombres
  plus froides et douces (`--shadow-light-*`).

### Imagerie & illustration
- **Photographie** chaleureuse : portraits d'entrepreneurs africains, packshots produits
  (parfums, mode), tons chauds, grain léger (`.up-grain`). Souvent en cercle/rounded,
  parfois détourée sur fond rouge.
- **3D** : objets ludiques (fusée rouge/blanche, sphères, cubes, cœur/like, trophée, étoile)
  — énergie « propulsion ». *(À fournir en PNG/asset par le client ; ici représentés par
  icônes + placeholders.)*
- **Doodlelisme** : gribouillis blancs tracés main (couronnes, étoiles, flèches, ressorts)
  posés près des titres et de la 3D pour l'énergie.
- **Stickers** : die-cut culture-entrepreneur (« LEVEL UP! », « BOSS MODE », « STAY
  HUMBLE ») — contour blanc, légère rotation, ombre portée.
- **Texture géométrique africaine** : treillis kente/adinkra **très subtil** en fond de
  sections sombres (`.up-texture-geo`, `.up-texture-diamond`) — profondeur, jamais bruit.

### Mouvement & interactions
- **Easing** : `--ease-out` (sorties), `--ease-spring` (rebond ludique sur toggles,
  stickers, badges). Durées 130 / 220 / 380ms ; flip/déroulage 560ms.
- **Hover** : éclaircir (`brightness 1.04`), lever les cartes, révéler le détail.
- **Press** : `translateY(1px) scale(.985)` — tactile.
- **Actions de flip / déroulage** encouragées pour stratifier l'information (recto =
  l'essentiel, verso = le détail).
- Respecte `prefers-reduced-motion`. Pas de boucles décoratives infinies sur le contenu.

---

## ICONOGRAPHY

- **Style** : trait rond, **stroke 2px**, coins arrondis (famille Lucide / Iconsax-like).
  C'est la grammaire d'icône de toute l'UI. Le kit dashboard embarque un set inline
  cohérent (`ui_kits/dashboard/icons.jsx` → `window.UPIcons`) : Home, Grid, Message,
  Calendar, Chart, Megaphone, Rocket, Star, Trophy, Bell, Search, Bolt, Instagram, etc.
  Pour de nouveaux écrans, utilise **Lucide** (CDN `unpkg.com/lucide`) — même poids/rondeur.
- **Logos sociaux** : Instagram / Facebook / X / LinkedIn / YouTube en glyphes simples,
  monochromes sur sombre (couleur de marque seulement quand le réseau est le sujet).
- **Marque** : fusée UPgraders (`assets/logos/upgraders-icon.png`, fond transparent) —
  sur fond sombre tel quel, sur fond clair posé sur cercle blanc. Wordmark = **« Up »
  rouge + « graders »** dans la couleur du texte (composant `Logo`). Cachet SARL pour
  documents officiels (`upgraders-stamp.png`).
- **Emoji** : ponctuation chaleureuse uniquement (👋🚀🎉🙏), jamais comme icône fonctionnelle.
- **Ne pas** redessiner d'icônes à la main en SVG bricolé : réutiliser `UPIcons` ou Lucide.

---

## Index — manifeste du dépôt

| Chemin | Rôle |
|---|---|
| `styles.css` | **Point d'entrée** consommateur — liste d'`@import` uniquement. |
| `tokens/fonts.css` | `@font-face` Clash Display + Satoshi (`.woff2` locaux dans `assets/fonts/`), JetBrains via Google. |
| `tokens/palette.css` | Pigments bruts `--up-*` (rouge, or, panda, bone, complémentaires). |
| `tokens/semantic.css` | Rôles thémables `--surface/text/border/accent/...` (dark + `[data-theme="light"]`). |
| `tokens/typography.css` | Familles, échelle fluide, poids, interlettrage. |
| `tokens/spacing.css` | Espacement 4px, rayons, layout, z-index. |
| `tokens/effects.css` | Ombres, glows, blur, easing/durées. |
| `tokens/base.css` | Defaults `.up-root` + utilitaires (`.up-glass`, `.up-texture-geo`, `.up-grain`, eyebrow). |
| `tokens/fonts.css` | `@font-face` Clash Display + Satoshi (`.woff2` locaux), JetBrains via Google. |
| `assets/fonts/` | Polices variables hébergées (Clash Display, Satoshi + italique). |
| `assets/logos/` | Hexagone, lockups H/V, wordmark, monogramme UP, strapline, cachet SARL. |
| `assets/photos/` | Photographie de marque (entrepreneurs ouest-africains, hubs créatifs). |
| `assets/illustrations/` | Planche d'illustration 3D / stickers / doodles. |
| `components/core/` | **Button, Badge, Tag, Card, StatCard, Avatar(+Group), Progress, Alert, Input(+Select), Switch.** |
| `components/brand/` | **Logo, LevelBadge, Sticker, PortalCard.** |
| `guidelines/` | Cartes spécimens (Colors · Type · Spacing · Brand) du Design System tab. |
| `ui_kits/dashboard/` | Brand Dashboard — bento gamifié (sidebar, hero, KPIs, assistant, calendrier, niveau, modals, dark/clair). |
| `ui_kits/marketing/` | Site vitrine « La Passion pour Propulseur » (hero, services, réalisations, ressources, footer, sélecteur de portail). |
| `SKILL.md` | Mode d'emploi agent (Claude Code compatible). |

**Composants** (`window.UPgradersDesignSystem_6a9ef3`) : Button · Badge · Tag · Card ·
StatCard · Avatar · AvatarGroup · Progress · Alert · Input · Select · Switch · Logo ·
LevelBadge · Sticker · PortalCard.

---

## Caveats connus

- **Polices** : Clash Display & Satoshi sont **hébergées localement** (`.woff2` variables
  dans `assets/fonts/`) ; JetBrains Mono depuis Google Fonts. Fontes réelles, offline-ready
  pour le display/texte.
- **Logos, photos & illustration** : fournis et intégrés (`assets/logos`, `assets/photos`,
  `assets/illustrations`). Le composant `Logo` rend la vraie artwork via `variant`.
- **3D doodle animé** : les objets 3D isolés (fusée, trophy…) restent représentés par
  icônes/placeholders dans les kits ; la planche d'illustration fournit les visuels source.
- **Logos SVG** fournis vides : seuls les PNG (vraie artwork) sont exploités.
