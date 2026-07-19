# ADR-0160 — Valorisation de marque certifiée v1 (spine backend)

- **Statut** : Accepted (2026-07-19)
- **Origine** : Phase D du plan d'état final **RATIFIÉ** ([ETAT-FINAL-RECHERCHE-2026.md](../ETAT-FINAL-RECHERCHE-2026.md) §2.2 — « le produit à haute marge oublié ») : la niche Afrique francophone laissée ouverte par l'incumbent (Brand Finance, biais anglophone/sud-africain). Tutelle **THOT** (économie). Cap 7/7 préservé.

## Décision

1. **Le certificat certifie ce qui est MESURÉ** : composition 100 % déterministe (`financial-brain/brand-valuation/`) depuis force révélée (ScoreVerdict θ/palier), communauté (registre superfans gouverné), trajectoire (derniers relevés audience/empreinte) — chaque ligne porte sa **provenance**.
2. **Estimation monétaire = relief-from-royalty simplifié, UNIQUEMENT sur CA DÉCLARÉ** à l'émission par l'opérateur (jamais lu ailleurs, jamais estimé — ADR-0046). Sans CA déclaré : dossier sans montant, dit tel quel (`NOT_COMPUTABLE`). Fourchette = CA × bande de redevance du palier de force, VAN 5 ans à 25 % — méthode DIVULGUÉE sur le certificat.
3. **Constantes de méthode §4 (PROPOSÉES, à ratifier à la première vente)** : bandes `ROYALTY_BANDS` LATENT 0.5–1 % · FRAGILE 1–2 % · ORDINAIRE 2–3 % · FORTE 3–5 % · CULTE 5–7 % · ICONE 7–9 % ; `VALUATION_YEARS=5` ; `DISCOUNT_RATE=25 %` (coût du capital zone). Éditables par ADR enfant, pattern ADR-0150.
4. **Persistance** : `BrandAsset kind=VALUATION_CERTIFICATE` (extension TS enum, zéro migration — anti-doublon : le certificat EST un livrable) + **hash SHA-256 du contenu** = numéro de certificat vérifiable (le registre de référence commence ici).
5. **Gouvernance** : kind `THOT_COMPOSE_BRAND_VALUATION` (requireOperator, sync, zéro LLM) + tRPC `thot.valuation.compose/list`.

## Déférés (tracés RESIDUAL-DEBT)

- **Surface UI** (console : formulaire CA déclaré + rendu certificat + export PDF lisible pattern ADR-0138) — prochaine session ; le spine est exerçable via tRPC.
- **Page publique de vérification** (`hash → authentique/inconnu`) — à la première vente réelle.
- **Ratification des constantes §4** — à la première vente (valeurs PROPOSÉES d'ici là).
- **Benchmarks percentile marché dans le dossier** (MarketBenchmark ≥ 5 échantillons) — quand la base benchmark a du volume réel.
