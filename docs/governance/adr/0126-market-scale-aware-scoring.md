# ADR-0126 — Scoring conscient de l'échelle de marché (marketScale + évidence par densité)

**Status** : Accepted · **Amended 2026-07-12 (nuit)** — suggestion d'audience adressable (mandat opérateur « câble la suggestion ») : `computeAudienceSuggestion` (domaine pur — somme + plancher des DERNIERS relevés réels par réseau, null sans donnée), query lecture `strategy.getAudienceSuggestion` tenant-gardée, et pré-remplissage du champ sur la carte Échelle de marché. La doctrine est INCHANGÉE : la valeur reste DÉCLARÉE — le clic « Utiliser cette valeur » remplit le champ, seul « Enregistrer » du porteur écrit (verrous `audience-suggestion.test.ts` : un seul chemin d'écriture, module domaine pur, suggestion affichée seulement tant que rien n'est déclaré).
**Date** : 2026-07-11
**Phase** : hors plan séquencé (carte blanche opérateur) — s'inscrit dans l'implémentation du score canonique (ADR-0086 / Phase 24 closure-target #15)
**Depends on** : ADR-0086 (8 dimensions canoniques), ADR-0102 (base structurelle figée — non touchée), ADR-0046/0047 (cult-index), ADR-0085 (STOP Jehuty — les champs sont DÉCLARÉS, jamais auto-écrits)
**Enfant de** : ADR-0086

## Contexte

Inspection opérateur 2026-07-11 (« le scoring met des notes similaires à une marque de quartier, de ville, de nation… comme si l'entreprise nationale d'électricité pouvait compétir avec Apple sur la maturité de marque ») — confirmée sur pièces :

1. **Cibles d'évidence absolues universelles** (`advertis-scorer`) : le plafond CULTE/ICONE saturait à 1000 superfans / 20 signaux Tarsis / cult-index 80 / 5 ans, identiques pour toutes les marques. Un footprint national banquait de l'évidence gratuite ; une marque de quartier à densité de culte exceptionnelle ne pouvait structurellement pas l'atteindre.
2. **« Âge » mensonger** : le bras patrimoine lisait `strategy.createdAt` — l'ancienneté du **compte La Fusée**, pas de la marque.
3. **Bug d'unités devotion→cult** : les champs `DevotionSnapshot` sont des pourcentages 0-100 (devotion-engine « Distribution as percentages », router `z.max(100)`), mais `cult-index-engine` les multipliait par 100/200/300/500 comme des fractions 0-1 → `engagementDepth`, `ritualAdoption`, `evangelismScore` (40 % du poids) saturaient à 100 dès ~1 % de dévotion — et gonflaient l'évidence.
4. **Poids mort** : `ugcGenerationRate` codé 0 (aucune source sociale branchée) comptait comme un vrai zéro — 10 % du score fabriqué.
5. **Aucun champ d'échelle** nulle part : le concept « quartier / ville / région / nation / continent / monde » n'existait pas dans le modèle (grep CODE-MAP + schema négatifs). `marketScopedDb` (ADR-0105) est un homonyme — visibilité des marchés gelés, aucun lien ; le nommage `marketScale` évite la collision.

## Décision

### A. Échelle déclarée (3 champs additifs nullable sur `Strategy`)

- `marketScale MarketScale?` (enum QUARTIER/VILLE/REGION/NATION/CONTINENT/MONDE), `addressableAudience Int?`, `brandFoundedYear Int?`. Migration `20260711130000_adr0126_market_scale_additive`, backfill-safe.
- **DÉCLARÉS** par l'opérateur/founder (doctrine ADR-0085 : jamais auto-écrits par une cascade). null = non qualifié, traité honnêtement (fallback ci-dessous).

### B. Canon domaine `src/domain/market-scale.ts` (layer 0, pur, LOI 9)

- `EVIDENCE_TARGETS_BY_SCALE` : cibles superfans/signaux par échelle, croissantes (QUARTIER 50/5 → MONDE 8000/40). **NATION == constantes historiques (1000/20)** : point de continuité.
- `resolveEvidenceTargets({marketScale, addressableAudience})` : échelle absente → cibles historiques (**zéro régression silencieuse, Loi 1**) ; audience adressable déclarée → le bras superfans sature à **5 % de l'adressable** (densité de culte de classe mondiale), borné [25, cible d'échelle] — la densité ne GONFLE jamais la cible (pas d'évidence gratuite pour les gros footprints).
- `formatTierReferential(tier, scale)` : le palier ne s'affiche plus sans son référentiel (« Forte — échelle nationale » ; absence affichée « échelle non déclarée », jamais masquée).

### C. Câblage scorer (`advertis-scorer`)

`computeEvidenceScore` lit `marketScale`/`addressableAudience`/`brandFoundedYear`, résout ses cibles via le domaine, et calcule le patrimoine sur l'**année de fondation déclarée** (fallback `createdAt` = ancienneté système, assumée comme telle). Poids inchangés (0.45/0.30/0.10/0.15) ; seuils CULTE 0.20 / ICONE 0.50 inchangés ; bandes `classifyTier` inchangées ; base structurelle ADR-0102 non touchée.

### D. Fixes de mesure cult-index

- Multiplicateurs fraction corrigés en amplificateurs de pourcentage (×1/×2/×3/×5) dans `calculateAndSnapshot` ET `connectDevotionToCultIndex`.
- `computeCultIndex(dimensions, unavailable)` : les dimensions sans source branchée (`ugcGenerationRate`) sortent du **dénominateur** — l'absence de mesure n'est pas une mesure de zéro. Rétro-compatible (défaut = tout inclus).

### E. Référentiel affiché

KPI « Score de marque » du dashboard cockpit : ligne référentiel sous le score (registre client ADR-0123 respecté — « échelle nationale », vocabulaire business).

## Hors périmètre (tranché, tracé RESIDUAL-DEBT)

- **Overton par polity** : `Sector.slug @unique` = un seul axe culturel global par secteur ; déplacer la fenêtre d'un quartier ≠ d'un continent. Exige de re-clé-er `Sector` (secteur × portée géo) + le harvesting Tarsis par polity + backfill — chantier propre séparé. Le shipper à moitié créerait un trou pire que l'existant.
- **Writer gouverné `SuperfanProfile`** : aucun chemin applicatif ne crée ces rows aujourd'hui — leur naissance (future ingestion CRM) devra passer par un Intent gouverné, sinon vecteur d'inflation d'évidence.
- **UI d'édition** des 3 champs (réglages Strategy cockpit/console) + **leaderboard segmenté par échelle** + **référentiel dans l'EFR contractuel**.

## Conséquences

- L'électricien national sans dévotion réelle ne peut plus atteindre CULTE/ICONE par simple footprint (cibles pleines de sa bande + cult-index désormais discriminant) ; la marque de quartier à 40 évangélistes sur 3 000 adressables passe son bras superfans à saturation honnête.
- Les scores cult-index vont **bouger** (baisse pour les saturés artificiels, hausse ~+11 % de renormalisation UGC) — changement de doctrine de mesure assumé par cet ADR, pas un drift. Snapshots historiques immuables (Loi 1).
- Tests anti-drift : `tests/unit/governance/scoring-scale-aware.test.ts` (16) — continuité NATION==legacy, monotonie des cibles, cap densité, purge des multiplicateurs fraction, exclusion UGC, bandes classifyTier figées, schéma/migration présents, pureté LOI 9 du domaine.
