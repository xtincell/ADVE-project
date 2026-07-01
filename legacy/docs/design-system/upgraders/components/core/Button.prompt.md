Signature rouge-fusée button — the one obviously-clickable action per view; use `primary` for the main CTA, `secondary`/`outline`/`ghost` to recede.

```jsx
<Button variant="primary" iconRight={<ArrowRight />}>Découvrir nos services</Button>
<Button variant="secondary">Voir la vidéo</Button>
<Button variant="outline">En savoir plus</Button>
<Button variant="ghost" size="sm">Annuler</Button>
<Button variant="primary" pill size="lg">Commencer maintenant</Button>
<Button variant="secondary" iconOnly aria-label="Réglages" icon={<Settings />} />
```

Variants: `primary` (red glow CTA), `secondary` (dark fill), `outline`, `ghost`. Sizes `sm|md|lg`. Flags: `pill`, `block`, `iconOnly`.
