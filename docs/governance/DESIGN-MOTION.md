# DESIGN-MOTION — Contrats d'animation

> Toutes les durations, easings et patterns d'animation du DS.
> Toute primitive consomme ces tokens — pas d'`animation: 200ms ease-out` inline.

## 1. Durations canoniques

| Token | Valeur | Usage |
|---|---|---|
| `--motion-instant` | 0ms | Réservé `prefers-reduced-motion` |
| `--motion-fast` | 120ms | Hover, focus, micro-interactions |
| `--motion-base` | 200ms | Default — transitions de couleur, opacity |
| `--motion-medium` | 320ms | Slide, fade enter |
| `--motion-slow` | 500ms | Modal/Sheet enter, scale |
| `--motion-slower` | 800ms | Score reveal, success celebration |
| `--motion-deliberate` | 1200ms | Apogee rocket cycle, loading complex |

## 2. Easings canoniques

| Token | Valeur cubic-bezier | Usage |
|---|---|---|
| `--ease-linear` | `linear` | Spinners, progress determinés |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits (disparition) |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | **Default — entries (apparition)** |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Mouvements continus |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Entries spring (scale-in CTA) |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Slide-in deceleration (Sheet) |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Slide-out (idem `--ease-in`) |

## 3. Patterns par catégorie d'interaction

### Entries (apparition)

| Pattern | Duration | Easing | Properties animées |
|---|---|---|---|
| Tooltip enter | `--motion-fast` | `--ease-out` | opacity + translateY(2px → 0) |
| Toast enter | `--motion-base` | `--ease-spring` | opacity + translateX(20px → 0) |
| Dialog enter | `--motion-medium` | `--ease-decelerate` | opacity + scale(0.96 → 1) |
| Sheet enter | `--motion-medium` | `--ease-decelerate` | translateX(100% → 0) |
| Page navigation | `--motion-base` | `--ease-out` | opacity (Next route transition) |

### Exits (disparition)

| Pattern | Duration | Easing |
|---|---|---|
| Tooltip exit | `--motion-fast` | `--ease-in` |
| Toast exit | `--motion-base` | `--ease-accelerate` |
| Dialog exit | `--motion-base` | `--ease-accelerate` |
| Sheet exit | `--motion-base` | `--ease-accelerate` |

### State changes

| Pattern | Duration | Easing |
|---|---|---|
| Hover (color/bg) | `--motion-fast` | `--ease-out` |
| Focus ring apparait | `--motion-fast` | `--ease-out` |
| Active (press) | `--motion-instant` | — |
| Loading state toggle | `--motion-base` | `--ease-out` |
| Theme/density swap | `--motion-base` | `--ease-out` |

### Loading

| Pattern | Duration | Easing |
|---|---|---|
| Spinner | `--motion-deliberate` (cycle 1200ms) | `--ease-linear` |
| Skeleton shimmer | 1500ms | `--ease-in-out` |
| Progress bar (déterminé) | variable selon `value` | `--ease-out` |
| Pulse dot (live indicator) | 1600ms | `--ease-in-out` |

### Décoratives (landing)

| Pattern | Duration | Easing |
|---|---|---|
| Particle rise (hero) | 3-5s | `--ease-out` |
| Float (cue scroll) | 2400ms | `--ease-in-out` |
| Apogee rocket auto-cycle | `--motion-deliberate` × 6 tiers | `--ease-out` |
| Strip ticker (marquee) | 50s | `--ease-linear` |
| Surveillance radar sweep | 8s rotation | `--ease-linear` |
| Surveillance core pulse | 2400ms | `--ease-out` |
| Score reveal | `--motion-slower` | `--ease-spring` |
| Glow pulse CTA | 3s | `--ease-in-out` |

## 4. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Patterns spécifiques** à neutraliser explicitement :
- Particle rise → `display: none`
- Ticker marquee → `animation: none` + content fixe
- Rocket auto-cycle → static (premier tier seulement)
- Radar sweep → static (no rotation)
- Glow pulse CTA → `animation: none`
- Pulse dots → `opacity: 1` constant

## 5. Reduced data

```css
@media (prefers-reduced-data: reduce) {
  .backdrop-blur,
  .blur-xs, .blur-sm, .blur-md, .blur-lg { backdrop-filter: none !important; }
  .particle-rise, .float, .glow-pulse-cta { animation: none !important; }
}
```

Désactive backdrop-blur (coûteux), animations idle, particles. Affecte hero et finale.

## 6. Anti-patterns interdits

- `transition: all` (trop large, force reflow inutile) → préciser les properties
- `transition-duration` hardcodé (`200ms`, `0.3s`) → toujours `var(--motion-*)`
- `cubic-bezier` hardcodé → toujours `var(--ease-*)`
- `animation` sans fallback `@media (prefers-reduced-motion)` → audit CI bloquant `tests/unit/governance/design-motion-reduced.test.ts` (PR-9)

## 7. Lectures

- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — canon vivant
- [DESIGN-A11Y.md](DESIGN-A11Y.md) — focus management & motion
- [src/styles/tokens/animations.css](../../src/styles/tokens/animations.css) — @keyframes consolidées
