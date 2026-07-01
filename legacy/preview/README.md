# Preview tools

Outils pour reviewer la landing page sans avoir à lancer le dev server, ni un device physique.

## 📄 `landing-mobile-offline.html` — Review hors-ligne sur téléphone

**Fichier HTML self-contained** (~60 KB, CSS inlined, zéro asset externe, zéro JS framework). Ouvre-le directement dans n'importe quel navigateur, y compris hors-ligne sur ton téléphone.

### Usage téléphone

1. **Transfert** : envoie-toi le fichier via AirDrop / Google Drive / WhatsApp / email
2. **Ouvre** dans Safari ou Chrome mobile
3. **Scroll** la landing complète (hero → finale)
4. **Tap** les sections collapsibles (Gouverneurs, FAQ) pour ouvrir/fermer
5. **Aucune connexion requise** une fois téléchargé

### Ce qui est représenté fidèlement

- ✅ Toute la copy de la landing (PR #31)
- ✅ Layout mobile (single column, CTA stack vertical)
- ✅ Hero avec strip Africa-first + CTA "gratuit · 15 min" + persona switcher
- ✅ Manifesto (Superfans + Overton + Devotion ladder + Cult Index)
- ✅ Surveillance (4 cibles persona)
- ✅ APOGEE (6 paliers + métriques mesurables + CTA bottom)
- ✅ ADVERTIS (8 piliers + score /200 + tier, sans le radar SVG interactif)
- ✅ Diagnostic CTA section
- ✅ Gouverneurs (7 cerveaux dans un accordion mobile-friendly)
- ✅ Portails (4 cards persona)
- ✅ Pricing (3 ramps + timelines)
- ✅ FAQ (8 questions accordion)
- ✅ Finale

### Ce qui est simplifié (vs le rendu Next.js réel)

- 🟡 Police : system-ui stack au lieu de Inter Tight / Fraunces / JetBrains Mono (pas de Google Fonts pour offline)
- 🟡 Radar ADVE-RTIS : remplacé par une liste verticale avec barres de progression (le SVG radar interactif nécessite JS)
- 🟡 Ticker : statique au lieu d'animé (scroll horizontal manuel)
- 🟡 Couleurs : tokens approximatifs (panda + rouge fusée) — pas exactement DS Phase 11

## 🖼️ `preview-landing-mobile.ts` — Capture PDF + PNG via Puppeteer

**Script Node** qui rend la landing **réelle** (Next.js dev) en viewport mobile et exporte PDF + PNG.

### Usage

```bash
# 1. Démarre le dev server
npm run dev

# 2. Dans un autre terminal — capture mobile
npm run preview:mobile

# Output : reports/landing-mobile-iphone14pro-<timestamp>.pdf + .png
```

### 4 variantes via npm scripts

| Script | Viewport |
|---|---|
| `npm run preview:mobile` | iPhone 14 Pro (393×852 @ 3x) — défaut |
| `npm run preview:mobile:se` | iPhone SE (375×667 @ 2x) |
| `npm run preview:mobile:pixel` | Pixel 5 (393×851 @ 2.75x) |
| `npm run preview:mobile:dark` | iPhone 14 Pro + dark mode |

### Variables d'env

```bash
PREVIEW_PATH=/intake npm run preview:mobile      # Capture l'intake page
PREVIEW_URL=http://localhost:3001 npm run preview:mobile  # Override port
PREVIEW_URL=https://lafusee.app npm run preview:mobile    # Capture la prod
```

### Différence avec le HTML offline

| | `landing-mobile-offline.html` | `preview-landing-mobile.ts` |
|---|---|---|
| **Setup** | Aucun (juste ouvrir le fichier) | `npm install` + dev server |
| **Fidélité** | ~85% (system fonts, simplifications) | 100% (Chromium headless = device réel) |
| **Mobile review** | ✅ tap-friendly, fonctionne hors-ligne | ❌ génère PDF, pas interactif |
| **Animations** | ❌ statique | ✅ capturées au scroll auto |
| **Quand l'utiliser** | Review copy en mobilité, sans wifi | Capture finale pour stakeholders, QA visuelle |

## Recommandation

Pour le **review copy** (mots, hiérarchie, persona-fit) → utilise le HTML offline. Suffisant à 95%.

Pour la **validation visuelle finale** (typo, espacement, animations, dark mode) → run le script Puppeteer une fois `npm install` fait.
