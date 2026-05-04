# ADR-0047 — `DevotionLadderTier` vs `BrandClassification` : séparation type-level

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — cleanup résiduel post audit Makrea
**Supersedes** : aucun
**Related** : [ADR-0045](0045-dormant-cleanup-post-phase-14-15.md), [ADR-0046](0046-cult-index-no-magic-fallback.md)

---

## Contexte

Audit Makrea (mai 2026) a observé dans le screenshot Executive Summary :

```
CLASSIFICATION       CULT INDEX
ICONE                25 APPRENTI
```

Trois enums orthogonaux étaient mélangés sur les mêmes champs UI :

| Enum | Valeurs | Sémantique | Source |
|---|---|---|---|
| `BrandClassification` | `ZOMBIE` / `ORDINAIRE` / `FORTE` / `CULTE` / `ICONE` | Mesure de la **marque** (composite ADVERTIS /200) | `src/lib/types/advertis-vector.ts` |
| `DevotionLadderTier` (canonique mais non-typé jusqu'ici) | `SPECTATEUR` / `INTERESSE` / `PARTICIPANT` / `ENGAGE` / `AMBASSADEUR` / `EVANGELISTE` | Rung du parcours **superfan** (audience d'un brand) | `pillar-schemas.ts pillarE` (champs pluriels) + LEXICON |
| `GuildTier` | `APPRENTI` / `COMPAGNON` / `MAITRE` / `ASSOCIE` | Tier interne **creator** (talent freelance) | `src/app/(creator)/...` + `src/app/(console)/console/arene/...` |

`CultIndexSnapshot.tier` côté Prisma est typé `String` libre. Pas d'enum DB. Les valeurs étaient écrites depuis différents producteurs (seed scripts, Glory tools, opérateur saisie manuelle) sans contrainte. Conséquences :

1. **Sur Makrea** : `cultIndexSnapshots[0].tier === "APPRENTI"` (probablement copy-pasted depuis le `GuildTier` creator par un script de seed). Le mapper `mapExecutiveSummary` retournait `tier: cultSnap.tier` sans validation → l'UI rendait "APPRENTI" sous le label "CULT INDEX" alors qu'APPRENTI n'a aucun sens dans la dimension cult/devotion.
2. **Code path divergent** ([ADR-0046](0046-cult-index-no-magic-fallback.md) §1) : la branche fallback `: { score: composite × 0.45, tier: classification }` mélangeait `BrandClassification` (ICONE, …) avec le `cultSnap.tier` (Devotion Ladder, …) sur le même champ `cultIndex.tier`. Le type signature `tier: string` ne distinguait pas les deux.
3. **Tests anti-drift inexistants** : ni au niveau TS (le `tier: string` accepte tout), ni au niveau Zod (le schema CultIndexSnapshot Prisma ne contraint pas le tier), ni au niveau lint.

## Décision

### §1 — `DevotionLadderTier` est un enum first-class

Nouveau module `src/domain/devotion-ladder.ts` :

```ts
export const DEVOTION_LADDER_TIERS = [
  "SPECTATEUR", "INTERESSE", "PARTICIPANT",
  "ENGAGE", "AMBASSADEUR", "EVANGELISTE",
] as const;
export type DevotionLadderTier = (typeof DEVOTION_LADDER_TIERS)[number];
```

Source de vérité pour les rungs canoniques. Aligné avec `pillarE` (champs `spectateurs/interesses/participants/engages/ambassadeurs/evangelistes`).

### §2 — Helper de parse tolérant + canonicalisation

```ts
export function parseDevotionLadderTier(value: unknown): DevotionLadderTier | null {
  // accepte UPPERCASE, lowercase, accents, pluriels, retourne null sur invalid
}
```

Le helper :
- Retourne `null` sur `"APPRENTI"`, `"ICONE"`, `null`, `123`, `""` → invalid as DevotionLadderTier.
- Canonicalise `"ambassadeur"` → `"AMBASSADEUR"`, `"évangéliste"` → `"EVANGELISTE"`, `"participants"` → `"PARTICIPANT"`.

### §3 — Type au type-level dans `ExecutiveSummarySection` + `KpisMesureSection` + `ProfilSuperfanSection`

```ts
// AVANT
cultIndex: { score: number; tier: string } | null;

// APRES (ADR-0047)
cultIndex: { score: number; tier: DevotionLadderTier } | null;
```

Le compilateur TS refuse maintenant qu'un mapper produise un `cultIndex.tier` qui n'est pas un `DevotionLadderTier` — drift attrapé à compile-time.

### §4 — Mapper-side canonicalization

Tous les mappers (`mapExecutiveSummary`, `mapKpisMesure`, `mapProfilSuperfan`) appellent désormais :

```ts
const parsedTier = parseDevotionLadderTier(cultSnap.tier);
if (!parsedTier) return null; // donne honnêtement null plutôt que de propager dirty data
return { score: cultSnap.compositeScore, tier: parsedTier };
```

Si la DB contient une valeur invalide (ex: Makrea avec `tier="APPRENTI"`), l'UI affichera `cultIndex: null` (state honnête « pas mesurable comme rung Devotion Ladder ») au lieu de propager une string non-typée. Un `console.warn` côté `mapExecutiveSummary` log la dirty data pour triage observability.

### §5 — Pas de migration DB destructive

Le tier en DB reste `String` — aucune migration Prisma forcée par cet ADR. Raisons :

- L'invariant est désormais enforced **côté read** (mapper). Aucune valeur dirty ne fuit en UI.
- Une migration Prisma `tier: DevotionLadderTier @default(...)` nécessiterait un backfill complet + downtime + risque de perdre des données legacy mal-classifiées. Hors scope de ce ADR cleanup.
- Sprint follow-up : `scripts/audit-cult-index-tier-integrity.ts` (cron Seshat) qui scan toutes les `CultIndexSnapshot.tier` en DB et alerte sur les valeurs invalides → décision case-by-case (re-run cult-index service ou suppression du snapshot).

## Conséquences

### Bénéfices

- **Compilation safety** : un mapper qui essaie de mettre `BrandClassification` ou `GuildTier` dans `cultIndex.tier` casse `tsc --noEmit`.
- **UI honnête** : Makrea (et tout brand avec dirty cult-snap) verra `cultIndex: null` plutôt qu'un tier non-typé. C'est conforme à ADR-0046 §1 (« —` au lieu d'un nombre fabriqué »).
- **Anti-drift permanent** : le helper canonicalise au passage read, donc même si un futur producteur écrit du dirty en DB, l'UI reste propre.

### Coûts

- Marques avec un cultSnap dont le `tier` n'est pas reconnu voient `cultIndex: null` côté Oracle alors qu'avant elles voyaient une string brute. Pas de régression réelle car cette string brute n'avait aucune sémantique consommable.
- Les autres consommateurs de `CultIndexSnapshot.tier` côté Prisma (s'il y en a hors `section-mappers`) doivent eux aussi appeler `parseDevotionLadderTier`. Audit grep à ajouter en CI : aucun `cultSnap.tier` accédé sans passer par `parseDevotionLadderTier`.

## Open work

- Ajouter `tests/unit/lib/devotion-ladder.test.ts` (parseur + invariants).
- Tester `mapExecutiveSummary` avec `cultSnap.tier === "APPRENTI"` (regression Makrea) → assert `cultIndex === null`.
- Cron audit `scripts/audit-cult-index-tier-integrity.ts` pour rapporter les snapshots dirty en DB.
- Si un produit a besoin d'un mapping inverse `BrandClassification` → `DevotionLadderTier` (par ex. pour seed flow d'onboarding), créer un helper dédié — pas un mix par défaut.
