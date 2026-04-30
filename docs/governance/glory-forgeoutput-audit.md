# Glory Tools — forgeOutput audit

Auto-généré par `npx tsx scripts/audit-glory-forgeoutput.ts` (NEFER Phase 9 résidu 4).

Total tools : **104**
- Avec `forgeOutput` déclaré : **1**
- Candidats à instrumenter : **16**
- Brief-only (no forge attendue) : **87**

## ✓ Déjà instrumentés

| slug | name | forgeKind |
|---|---|---|
| `kv-banana-prompt-generator` | Générateur de Prompts Banana pour KV | `image` |

## ⚠ Candidats à instrumenter (heuristique)

| slug | name | layer | forgeKind suggéré | raison |
|---|---|---|---|---|
| `print-ad-architect` | Architecte Print | CR | `image` | print/affiche → image asset |
| `client-presentation-strategist` | Stratège de Présentation Client | DC | `design` | présentation/deck → design asset |
| `creative-direction-memo` | Mémo de Direction Créative | DC | `design` | présentation/deck → design asset |
| `pitch-architect` | Architecte de Pitch | DC | `design` | présentation/deck → design asset |
| `award-case-builder` | Constructeur de Cases Awards | DC | `design` | présentation/deck → design asset |
| `vendor-brief-generator` | Générateur de Brief Fournisseur | HYBRID | `design` | document fournisseur → design asset |
| `devis-generator` | Générateur de Devis | HYBRID | `design` | document fournisseur → design asset |
| `visual-landscape-mapper` | Cartographe du Paysage Visuel | BRAND | `image` | visuel/KV → image asset |
| `visual-moodboard-generator` | Générateur de Moodboard Visuel | BRAND | `image` | visuel/KV → image asset |
| `iconography-system-builder` | Constructeur Système Iconographique | BRAND | `icon` | pictogramme → icon asset |
| `sales-deck-builder` | Constructeur Deck Commercial | DC | `design` | présentation/deck → design asset |
| `kv-art-direction-brief` | Brief Direction Artistique KV | DC | `image` | visuel/KV → image asset |
| `kv-review-validator` | Validateur de KV | DC | `image` | visuel/KV → image asset |
| `storyboard-generator` | Générateur de Storyboard | CR | `image` | visuel/KV → image asset |
| `voiceover-brief-generator` | Brief Voix Off | CR | `audio` | audio brief → audio asset |
| `credentials-deck-builder` | Constructeur Deck Credentials | DC | `design` | présentation/deck → design asset |

## · Brief-only (pas de forge attendue)

<details><summary>87 tools — clic pour développer</summary>

| slug | name | layer |
|---|---|---|
| `concept-generator` | Générateur de Concepts | CR |
| `script-writer` | Scripteur | CR |
| `long-copy-craftsman` | Artisan du Long Copy | CR |
| `dialogue-writer` | Dialoguiste | CR |
| `claim-baseline-factory` | Usine à Claims & Baselines | CR |
| `social-copy-engine` | Moteur Copy Social | CR |
| `storytelling-sequencer` | Séquenceur Narratif | CR |
| `wordplay-cultural-bank` | Banque Jeux de Mots & Références Culturelles | CR |
| `brief-creatif-interne` | Brief Créatif Interne | CR |
| `campaign-architecture-planner` | Planificateur d'Architecture de Campagne | DC |
| `creative-evaluation-matrix` | Matrice d'Évaluation Créative | DC |
| `idea-killer-saver` | Idea Killer/Saver | DC |
| `multi-team-coherence-checker` | Vérificateur de Cohérence Multi-Équipe | DC |
| `campaign-360-simulator` | Simulateur 360° de Campagne | HYBRID |
| `production-budget-optimizer` | Optimiseur Budget Production | HYBRID |
| `content-calendar-strategist` | Stratège Calendrier Éditorial | HYBRID |
| `approval-workflow-manager` | Gestionnaire Workflow d'Approbation | HYBRID |
| `brand-guardian-system` | Système Gardien de Marque | HYBRID |
| `client-education-module` | Module Éducation Client | HYBRID |
| `benchmark-reference-finder` | Chercheur de Benchmarks & Références | HYBRID |
| `post-campaign-reader` | Lecteur Post-Campagne | HYBRID |
| `digital-planner` | Planificateur Digital | HYBRID |
| `semiotic-brand-analyzer` | Analyseur Sémiotique de Marque | BRAND |
| `chromatic-strategy-builder` | Constructeur de Stratégie Chromatique | BRAND |
| `typography-system-architect` | Architecte du Système Typographique | BRAND |
| `logo-type-advisor` | Conseiller en Logotype | BRAND |
| `logo-validation-protocol` | Protocole de Validation Logo | BRAND |
| `design-token-architect` | Architecte de Design Tokens | BRAND |
| `motion-identity-designer` | Designer d'Identité Motion | BRAND |
| `brand-guidelines-generator` | Générateur de Brand Guidelines | BRAND |
| `competitive-analysis-builder` | Constructeur d'Analyse Concurrentielle | DC |
| `brand-audit-scanner` | Scanner d'Audit de Marque | HYBRID |
| `music-sound-brief` | Brief Musique & Sound Design | CR |
| `tone-of-voice-designer` | Designer Ton de Voix | CR |
| `manifesto-writer` | Rédacteur de Manifeste | CR |
| `photography-style-guide` | Guide Style Photographique | BRAND |
| `value-proposition-builder` | Constructeur Proposition de Valeur | DC |
| `pricing-strategy-advisor` | Conseiller Stratégie de Pricing | HYBRID |
| `community-playbook-generator` | Générateur Playbook Communauté | HYBRID |
| `superfan-journey-mapper` | Cartographe Parcours Superfan | DC |
| `engagement-rituals-designer` | Designer de Rituels de Marque | CR |
| `risk-matrix-builder` | Constructeur Matrice de Risques | HYBRID |
| `crisis-communication-planner` | Planificateur Communication de Crise | HYBRID |
| `compliance-checklist-generator` | Générateur Checklist Conformité | HYBRID |
| `market-sizing-estimator` | Estimateur Taille de Marché | HYBRID |
| `trend-radar-builder` | Constructeur Radar de Tendances | HYBRID |
| `insight-synthesizer` | Synthétiseur d'Insights | DC |
| `ideation-workshop-facilitator` | Facilitateur Atelier Idéation | DC |
| `resource-allocation-planner` | Planificateur Allocation Ressources | HYBRID |
| `strategic-diagnostic` | Diagnostic Stratégique | DC |
| `kpi-framework-builder` | Constructeur Framework KPI | HYBRID |
| `milestone-roadmap-builder` | Constructeur Roadmap à Jalons | DC |
| `casting-brief-generator` | Brief Casting | CR |
| `format-declination-engine` | Moteur Déclinaison Formats | HYBRID |
| `seo-copy-optimizer` | Optimiseur Copy SEO | CR |
| `naming-generator` | Générateur de Noms | CR |
| `naming-legal-checker` | Vérificateur Légal de Nom | HYBRID |
| `packaging-layout-advisor` | Conseiller Layout Packaging | BRAND |
| `influencer-brief-generator` | Brief Influenceur | CR |
| `ugc-framework-builder` | Framework UGC | HYBRID |
| `media-plan-builder` | Constructeur Plan Média | HYBRID |
| `launch-timeline-planner` | Planificateur Timeline Lancement | DC |
| `migration-playbook-generator` | Générateur Playbook Migration | DC |
| `seasonal-theme-planner` | Planificateur Thèmes Saisonniers | HYBRID |
| `content-mix-optimizer` | Optimiseur Mix Contenus | HYBRID |
| `roi-calculator` | Calculateur ROI Créatif | HYBRID |
| `hourly-rate-calculator` | Calculateur Taux Horaire | HYBRID |
| `codb-calculator` | Calculateur Cost of Doing Business | HYBRID |
| `service-margin-analyzer` | Analyseur Marge par Service | HYBRID |
| `campaign-cost-estimator` | Estimateur Coût Campagne | HYBRID |
| `budget-tracker` | Suivi Budgétaire | HYBRID |
| `project-pnl-calculator` | Calculateur P&L Projet | HYBRID |
| `client-profitability-analyzer` | Analyseur Rentabilité Client | HYBRID |
| `utilization-rate-tracker` | Suivi Taux d'Utilisation | HYBRID |
| `brand-guardian` | Brand Guardian | DC |
| `coherence-checker` | Vérificateur de Cohérence Cross-Séquence | DC |
| `claim-architect` | Architecte de Claims | CR |
| `tone-matrix` | Matrice de Ton | CR |
| `vocabulary-builder` | Constructeur de Vocabulaire | CR |
| `message-templater` | Générateur de Templates Messages | CR |
| `copy-guidelines` | Guidelines Rédactionnelles | CR |
| `lsi-universe-setup` | LSI Phase 1 — Setup Univers | CR |
| `lsi-symbol-alchemy` | LSI Phase 2 — Alchimie des Symboles | CR |
| `lsi-distribution-matrix` | LSI Phase 3 — Matrice de Distribution 5x5 | CR |
| `lsi-sublimation` | LSI Phase 4 — Sublimation (Reality Check) | DC |
| `lsi-morpho-semantic` | LSI Phase 5 — Definition Morpho-Semantique | CR |
| `lsi-character-sheet` | LSI Phase 6 — Fiche Personnage | CR |

</details>

---

**Action attendue** : pour chaque candidat, l'opérateur ouvre la PR dédiée qui ajoute `forgeOutput: { forgeKind, providerHint, modelHint, manipulationProfile, briefTextPath, defaultPillarSource }` dans le tool def, après vérification que le tool produit bien un livrable matérialisable.