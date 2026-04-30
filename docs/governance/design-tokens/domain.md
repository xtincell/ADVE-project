# design-tokens/domain.md — Tier 3 Domain Tokens

> Tokens **sémantique métier**. Pillars ADVE-RTIS, Divisions Neteru (5 actifs), Tiers Creator, Classifications APOGEE.
> Source runtime : [src/styles/tokens/domain.css](../../../src/styles/tokens/domain.css).

## Règle de cascade

Un Domain token consomme **uniquement** des Reference (Tier 0) ou System (Tier 1) tokens. Jamais Component (le sens métier ne dépend pas du composant — c'est l'inverse).

Composants métier (badges, radar, classification chip) consomment Domain tokens.

---

## Piliers ADVE-RTIS (8)

Cohérent avec [src/domain/pillars.ts](../../../src/domain/pillars.ts) (en cours de centralisation Phase 1) et [LEXICON.md](../LEXICON.md) (canon Authenticité/Distinction/Valeur/Engagement/Risque/Track/Innovation/Stratégie).

| Token | Source | Pilier | Sémantique visuelle |
|---|---|---|---|
| `--pillar-A` | `--ref-bone-2` | Authenticité | Bone éclatant — clarté |
| `--pillar-D` | `--ref-rouge` | **Distinction** | Rouge signature (le pilier de la distinction = la marque elle-même) |
| `--pillar-V` | `--ref-bone-3` | Valeur | Bone secondaire — solidité |
| `--pillar-E` | `--ref-ember` | Engagement | Chaud orange — feu humain |
| `--pillar-R` | `--ref-mute` | Risque | Mute — neutralité analytique |
| `--pillar-T` | `--ref-blue` | Track | Bleu — froid mesure |
| `--pillar-I` | `--ref-amber` | Innovation | Ambre — étincelle |
| `--pillar-S` | `--ref-green` | Stratégie | Vert — chemin |

Usage typique :
- Radar 8 axes (advertis-radar, overton-radar)
- PillarBadge (label de pilier dans missions, manifests)
- ProgressBar par pilier
- AdvertisStrip (landing) qui s'allume en cascade

## Divisions Neteru (5 actifs — cohérent BRAINS const)

Test bloquant `tests/unit/governance/neteru-coherence.test.ts` étendu pour vérifier que ces 5 tokens existent et seulement ceux-là (pas d'Imhotep/Anubis tant qu'ils ne sont pas actifs).

| Token | Source | Neter | Rôle métier | Sémantique visuelle |
|---|---|---|---|---|
| `--division-mestor` | `--ref-rouge` | Mestor | Décision | Rouge signature — Mestor est l'autorité |
| `--division-artemis` | `--ref-ember` | Artemis | Exécution | Chaud — production, urgence |
| `--division-seshat` | `--ref-blue` | Seshat | Observation | Froid — mesure, signal |
| `--division-thot` | `--ref-amber` | Thot | Finance | Ambre — valeur, propellant |
| `--division-ptah` | `--ref-bone-2` | Ptah | Matérialisation | Bone éclatant — la matière qui prend forme |

**Imhotep / Anubis** : pré-réservés ([ADR-0010](../adr/0010-neter-imhotep-crew.md), [ADR-0011](../adr/0011-neter-anubis-comms.md)). **Pas de Domain token tant qu'ils ne sont pas actifs**. Anti-drift : test `design-no-dead-tokens` whitelist absent pour ces deux Neteru.

**Infrastructure** : la fondation transversale [APOGEE.md §4](../APOGEE.md) (Pillar Gateway, hash-chain, multi-tenant RLS, NSP, plugin sandbox) **n'est PAS un Neter**. Pas de Domain token. Visuellement, c'est la grille panda elle-même (`--color-background` + `--color-border-subtle`).

Usage typique :
- DivisionBadge (label de Neter dans intent emission, audit log Console)
- Sidebar groupe coloré (Console divisions)
- Manifests viewer (cockpit/brand/deliverables affiche le Neter responsable)
- Gouverneurs section landing (5 tabs M/A/S/T/Ptah)

## Tiers Creator (4 paliers)

Cohérent avec lifecycle creator (apprenti → compagnon → maître → associé) — voir LEXICON.md `Tier system creator`.

| Token | Source | Tier | Sémantique visuelle |
|---|---|---|---|
| `--tier-apprenti` | `--ref-mute` | APPRENTI | Mute — débutant |
| `--tier-compagnon` | `--ref-bone-3` | COMPAGNON | Bone — solidité acquise |
| `--tier-maitre` | `--ref-gold` | MAÎTRE | Gold homéopathique — patrimoine |
| `--tier-associe` | `--ref-rouge` | ASSOCIÉ | Rouge signature — élite, statut max |

Usage typique :
- TierBadge (Creator profile, mission match, payout calc)
- Skill-tree progression
- Earnings tier multiplier display
- Leaderboard Creator

## Classifications APOGEE (6 paliers)

Cohérent avec [APOGEE.md](../APOGEE.md) (ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE) et `src/server/services/quick-intake/brand-level-evaluator.ts`.

| Token | Source | Classification | Sémantique visuelle |
|---|---|---|---|
| `--classification-zombie` | `--ref-mute-2` | ZOMBIE | Très muted — au sol, invisible |
| `--classification-fragile` | `--ref-mute` | FRAGILE | Mute — instable |
| `--classification-ordinaire` | `--ref-bone-3` | ORDINAIRE | Bone secondaire — sans relief |
| `--classification-forte` | `--ref-bone-2` | FORTE | Bone éclatant — présence |
| `--classification-culte` | `--ref-rouge` | CULTE | Rouge signature — la marque devient le secteur |
| `--classification-icone` | `--ref-gold` | ICONE | Gold — patrimoine, apex |

**Migration** des 5 hex hardcodés `CLASSIFICATION_COLORS` const :
```ts
// Avant (anti-pattern, à corriger PR-3 codemod manuel)
const CLASSIFICATION_COLORS = {
  ZOMBIE: "#ef4444",      // ❌ hardcoded
  FRAGILE: "#f97316",     // ❌
  ORDINAIRE: "#eab308",   // ❌
  FORTE: "#22c55e",       // ❌
  CULTE: "#8b5cf6",       // ❌
};

// Après
import { CLASSIFICATION_TOKENS } from "@/lib/design/classification-tokens";
// CLASSIFICATION_TOKENS.ZOMBIE = "var(--classification-zombie)" — référence dynamique
```

Usage typique :
- ClassificationBadge (cockpit dashboard, intake result, console clients)
- AltitudeBar landing (apogee-trajectory)
- Score reveal (intake/[token]/result)
- Strategy comparables panel

## Anti-patterns interdits

- ❌ Domain token qui consomme un autre Domain (pas de chaîne `--division-mestor → --pillar-D`)
- ❌ Hardcoder une couleur classification dans un composant (`#8b5cf6`) → utiliser `var(--classification-culte)`
- ❌ Créer un Domain token pour Imhotep/Anubis avant qu'ils soient activés (ajouter à `BRAINS` const + ADR)
- ❌ Utiliser `--ref-gold` hors `--tier-maitre` ou `--classification-icone` (réserve sémantique)

## Modification

Modifier un Domain token nécessite **revue narrative** (cohérence avec PANTHEON / LEXICON / APOGEE). Pas d'ADR formel sauf si :
- Ajout d'un Neter (ADR obligatoire — voir ADR-0009 Ptah comme modèle)
- Renommage classification (ADR + propagation 7 sources de vérité)

Pour ajustement teinte (ex: rendre `--pillar-T` plus distinct de `--pillar-S` après test daltonisme) : pas d'ADR, juste mise à jour `domain.css` + ce fichier + visual baselines.

## Lectures

- [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)
- [PANTHEON.md](../PANTHEON.md) — récit Neteru
- [LEXICON.md](../LEXICON.md) — vocabulaire métier
- [APOGEE.md](../APOGEE.md) §4 — sous-systèmes
- [adr/0009-neter-ptah-forge.md](../adr/0009-neter-ptah-forge.md) — Ptah 5ème Neter
- [adr/0010-neter-imhotep-crew.md](../adr/0010-neter-imhotep-crew.md) — Imhotep pré-réservé
- [adr/0011-neter-anubis-comms.md](../adr/0011-neter-anubis-comms.md) — Anubis pré-réservé
