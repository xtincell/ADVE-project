# ADR-0101 — Oracle : cohérence du tier Cult Index + compose déterministe read-time

> **Renumérotation 2026-06-15** — anciennement ADR-0094. Collision de numéro avec `0094-brandaction-canonical-action-database.md` (premier-arrivé 2026-06-13 18:48 conservé) découverte lors de la fusion `vigilant-goldberg` → `focused-hypatia`. Renuméroté vers 0101 (first-come keep, cf. CHANGELOG v6.18.4 + v6.18.8).

**Status** : Accepted (implemented v6.25.28)
**Date** : 2026-06-13
**Phase** : Audit Oracle « inspecte chaque module » (branche galileo)
**Owning Neteru** : Artemis (sections) · Seshat (Cult Index) · Mestor (read-path coherence)
**Relates to** : [ADR-0047](0047-devotion-ladder-vs-brand-classification.md) (corrige une sur-correction), [ADR-0046](0046-cult-index-no-magic-fallback.md), [ADR-0091](0091-oracle-deterministic-compose-fallback.md) (complète la promesse « 35/35 sans LLM »)

---

## 1. Contexte

Audit module-par-module de l'Oracle sur données réelles (CIMENCAM 126/200,
UPgraders 160/200), compilation **sans clé LLM** (chemin déterministe). Les 35
modules sont fonctionnels (aucun ne throw), mais deux incohérences de rendu :

### 1.1 Le Cult Index disparaissait des sections CORE

`cult-index-engine` écrit `CultIndexSnapshot.tier` sur son échelle canonique de
maturité culturelle : **`GHOST` (0-20) · `FUNCTIONAL` (21-40) · `LOVED` (41-60)
· `EMERGING` (61-80) · `CULT` (81-100)**. Or, pour fermer le drift « APPRENTI
sous le label CULT INDEX » (Makrea), [ADR-0047](0047-devotion-ladder-vs-brand-classification.md)
avait imposé que `cultIndex.tier` soit un **`DevotionLadderTier`** strict
(`SPECTATEUR`…`EVANGELISTE`) parsé via `parseDevotionLadderTier`.

**Sur-correction** : `parseDevotionLadderTier("FUNCTIONAL")` → `null`. Donc le
Cult Index — correctement calculé et stocké — était **silencieusement supprimé**
de l'Executive Summary (§01), des KPIs (§16) et du Profil Superfan (§15), alors
que la section distinctive Cult Index (§31, composer) l'affichait brut. *Même
snapshot, rendu contradictoire* (observé sur CIMENCAM : tier="FUNCTIONAL", score
26.35).

### 1.2 Les sections §22-35 étaient vides au read-time avant toute génération

[ADR-0091](0091-oracle-deterministic-compose-fallback.md) a câblé les 14
composers déterministes dans `GENERATE_ORACLE_SECTION` (compose-path). Mais le
**read-path** — `assemblePresentation`, qui alimente le PDF et le lien partagé —
ne lit §22-35 que depuis des `BrandAsset` matérialisés. Une marque jamais
« assemblée » (ou ouverte avant le bouton « Lancer Artemis ») voyait donc
**21 sections pleines + 14 vides**, malgré des données suffisantes pour composer
les 14. La promesse « L'Oracle entier (35/35) compile sans LLM » d'ADR-0091 ne
valait que pour le compose-path, pas pour le rendu réel.

## 2. Décision

### 2.1 `CultIndexTier` canonique en domaine + résolution score-autoritaire

Nouveau `src/domain/cult-index-tier.ts` (source unique) : `CULT_INDEX_TIERS`,
`getCultIndexTier(score)`, `parseCultIndexTier` (tolère casse/accents, **rejette
toute échelle étrangère** — DevotionLadder, BrandClassification, GuildTier — donc
le garde-fou d'ADR-0047 est préservé dans les DEUX sens), et
`resolveCultIndexTier(rawTier, score)`.

`resolveCultIndexTier` n'honore le tier stocké **que s'il concorde avec la bande
du score** ; sinon le score fait foi. Le tier n'étant qu'une étiquette de bande,
tier et score ne peuvent plus se contredire : un tier périmé/étranger ne peut ni
faire disparaître le Cult Index, ni surévaluer la maturité. `cult-index-engine`
réexporte `CultTier`/`getCultTier` depuis le domaine (dé-duplication). Les
mappers §01/§15/§16 et le composer §31 consomment tous le même résolveur.

### 2.2 Compose déterministe read-time dans `assemblePresentation`

Pour toute section §22-35 **sans BrandAsset**, `assemblePresentation` compose le
content à la volée (read-only, **aucun writeback**), contexte chargé **une fois**
pour toutes les sections manquantes. Garde-fous : un BrandAsset ACTIVE/DRAFT
existant (généré ou LLM) n'est **jamais** écrasé ; un composer qui retourne `{}`
laisse la section vide (EmptyState honnête — aucune invention, cf. ADR-0091
§2.1). `checkCompleteness` reconnaît ce content composé (le compteur n'affiche
plus « 14 vides » quand le PDF est plein).

Refactor support : `promoteSectionToBrandAsset` + `capContentSize` extraits dans
`section-writeback.ts` (réexporté par `enrich-oracle`) pour casser le cycle
`index → deterministic-composers → enrich-oracle → index` (vérifié madge).

## 3. Alternatives écartées

- **Garder `DevotionLadderTier` + mapper le score vers un rung** : conflate deux
  axes orthogonaux (maturité de marque vs rung d'un fan). Faux sémantiquement.
- **Faire confiance au tier stocké tel quel** : réintroduit la possibilité d'un
  tier qui contredit le score (sur-évaluation). Écarté.
- **Auto-déclencher `ASSEMBLE_ORACLE` à l'ouverture de l'Oracle** : effet de bord
  d'écriture sur un GET, coût LLM/latence non sollicités. Écarté au profit du
  compose read-only.

## 4. Conséquences

- L'Oracle rendu (PDF + lien partagé + compteur) est **cohérent 35/35 sans LLM
  et sans passe de génération préalable** — la promesse d'ADR-0091 vaut désormais
  aussi sur le read-path. Vérifié sur données réelles (cold state) : CIMENCAM &
  UPgraders rendent 12/14 des §22-35, les 2 restantes honnêtement vides (pas de
  CultIndexSnapshot / pas d'équipe dirigeante / pas de signal TARSIS typé).
- Le Cult Index s'affiche de façon identique en §01/§15/§16/§31.
- Tests : `cult-index-tier.test.ts` (échelle + parse + rejet cross-échelle +
  résolution score-autoritaire), `deterministic-composers` §31 mis à jour
  (tier cohérent avec le score). Suite governance 796/796 verte.
- Cap APOGEE 7/7 préservé — aucun nouveau Neter, aucune nouvelle entité métier
  (composition de l'existant + 1 primitive domaine).
