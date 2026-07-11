---
name: nefer-ds
description: Design System UPgraders — application stricte sur le repo La Fusée. À invoquer AVANT de toucher toute surface UI (composant, page, style, classe Tailwind) et à la revue de chaque diff UI. Impose la cascade de tokens 4 tiers, les 3 interdits DS, CVA, et les tests bloquants.
---

# NEFER — Design System UPgraders (application stricte)

**Procédure impérative. Le DS n'a pas d'exceptions « juste ici ». AUCUNE improvisation.**

## 0 — Canon

- Source de vérité : `docs/design-system/upgraders/` + `docs/governance/DESIGN-SYSTEM.md` (ADR-0097, supersedes ADR-0013 — l'architecture d'ADR-0013 reste canon).
- Signature : panda noir/bone · rouge fusée corail `#E56458` · or `#FACC15` · Clash Display (display) + Satoshi (texte) + JetBrains Mono (data) · rayons bento 6→36 px.
- **MUST** : lire `DESIGN-SYSTEM.md` avant le premier edit UI de la session.

## 1 — Cascade de tokens (sens unique, 4 tiers)

```
Tier 0 Reference (--ref-*) → Tier 1 System (--color-*) → Tier 2 Component (--button-*, --card-*, …) → Tier 3 Domain (--pillar-*, --division-*, --tier-*, --classification-*)
```

Un composant consomme le tier le plus spécifique qui existe pour son usage. Créer un token manquant dans le BON tier plutôt que sauter un niveau.

## 2 — Les trois interdits DS (tests CI bloquants)

1. **NEVER** `var(--ref-*)` dans `src/components/**` — toujours via System/Component/Domain. Test : `design-tokens-cascade.test.ts`.
2. **NEVER** de classe Tailwind couleur brute (`text-zinc-500`, `bg-violet-500`, `border-emerald-700`, hex direct) hors `src/components/primitives/**` + `src/styles/**`. ESLint `lafusee/design-token-only` + test `design-tokens-canonical.test.ts`.
3. **NEVER** de variants inline en `.join(" ")` ou ternaires quand > 1 variant existe → **CVA obligatoire** (`class-variance-authority`). Test : `design-primitives-cva.test.ts`.

## 3 — Patterns imposés

| Besoin | Pattern canonique |
|---|---|
| État d'avertissement / dégradation honnête | `border-warning/30 bg-warning/10 text-warning` |
| Dialogue / confirmation | composants DS (`ConfirmDialog`, `Modal`) — **NEVER** `alert()` / `confirm()` / `prompt()` natifs (0 toléré dans `(cockpit)`) |
| Vide honnête | `EmptyState` avec message métier — jamais un zéro fabriqué |
| Variantes de composant | CVA + tokens Tier 2/3 |
| Composants de marque | `src/components/brand/` (Logo, LevelBadge, Sticker, PortalCard) — réutiliser, ne pas recréer |

## 4 — Vérification (obligatoire avant commit UI)

```bash
npx vitest run tests/unit/governance/design-tokens-cascade.test.ts \
  tests/unit/governance/design-tokens-canonical.test.ts \
  tests/unit/governance/design-primitives-cva.test.ts 2>&1 | tail -4

# Zéro couleur brute sur les lignes AJOUTÉES du diff :
git diff --cached -U0 -- 'src/components/**' 'src/app/**' | grep '^+' \
  | grep -nE "text-(zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]|bg-(zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]|#[0-9a-fA-F]{3,8}\b" \
  || echo "OK - zéro couleur brute ajoutée"
```

(Les hex pré-existants hors composants — data server-side, registres de couleurs de charts — ne sont pas ta cible ; les lignes que TU ajoutes le sont.)

## Conditions STOP

- Le design demandé exige une couleur/typo hors canon ADR-0097 → **STOP** : proposer l'équivalent token ; si l'opérateur veut réellement étendre la palette → ADR + tokens Tier 0/1, jamais une valeur inline.

## Enchaînement

UI touchée = **`nefer-vocab`** obligatoire ensuite (registre client), puis `nefer-ship`.
