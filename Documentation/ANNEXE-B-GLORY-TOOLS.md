# ANNEXE B — GLORY Tools (39 outils créatifs)

> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md § 6

---

## B.1 Vue d'ensemble

GLORY est un système de 39 outils créatifs/opérationnels organisés en 4 layers. Chaque outil prend en entrée des données de pilier ADVE + contexte (concurrents, missions, budget) et produit un livrable structuré.

Point d'entrée unique : `generateGloryOutput(strategyId, toolSlug, inputData)` → `GloryOutput` (persisté en BDD avec refNumber `GLORY-{layer}-{seq}`).

---

## B.2 Layer CR — Concepteur-Rédacteur (10 outils)

Outils de production de contenu créatif pour rédacteurs et concepteurs.

| # | Slug | Nom | Ce qu'il produit | Piliers requis |
|---|------|-----|-----------------|----------------|
| 1 | `concept-generator` | Concept Generator | Concepts créatifs multiples (axes, promesses, territoires visuels) | A, D |
| 2 | `script-writer` | Script Writer | Scripts publicitaires complets (TV/radio/digital) avec directions de production | A, D, E |
| 3 | `long-copy-craftsman` | Long Copy Craftsman | Manifestes, advertorials, brand stories, éditoriaux, lettres ouvertes | A, D |
| 4 | `dialogue-writer` | Dialogue Writer | Dialogues culturellement ancrés avec authenticité linguistique | A, D, E |
| 5 | `claim-baseline-factory` | Claim & Baseline Factory | Claims, baselines, slogans, taglines (courts, mémorables, différenciants) | A, D, V |
| 6 | `print-ad-architect` | Print Ad Architect | Architectures print complètes (headline, body copy, layout, hiérarchie visuelle, CTA) | A, D, V |
| 7 | `social-copy-engine` | Social Copy Engine | Copies social media natives par plateforme (hashtags, emojis, format optimal) | A, D, E |
| 8 | `storytelling-sequencer` | Storytelling Sequencer | Séquences narratives multi-touchpoints avec arcs dramatiques cohérents (2 variations) | A, D, E |
| 9 | `wordplay-cultural-bank` | Wordplay & Cultural Bank | Références culturelles, jeux de mots, proverbes, expressions par marché | A |
| 10 | `brief-creatif-interne` | Brief Créatif Interne | Brief créatif interne transformé (insights, territoire, contraintes, directions équipe) | A, D, V, E |

---

## B.3 Layer DC — Direction de Création (8 outils)

Outils de supervision créative pour directeurs artistiques et stratèges.

| # | Slug | Nom | Ce qu'il produit | Piliers requis |
|---|------|-----|-----------------|----------------|
| 11 | `campaign-architecture-planner` | Campaign Architecture Planner | Architecture campagne complète : phases, canaux, messages, touchpoints, budget (3 variations) | A, D, V, E |
| 12 | `creative-evaluation-matrix` | Creative Evaluation Matrix | Grille d'évaluation multi-critères : pertinence stratégique, originalité, faisabilité, impact culturel, potentiel viral | A, D |
| 13 | `idea-killer-saver` | Idea Killer / Idea Saver | Audit critique : forces, faiblesses, risques, pistes d'amélioration, sauvetage créatif | A, D |
| 14 | `multi-team-coherence-checker` | Multi-Team Coherence Checker | Vérification de cohérence cross-équipes : ton, message, identité visuelle, territoire | A, D |
| 15 | `client-presentation-strategist` | Client Presentation Strategist | Stratégie de présentation client : storytelling, anticipation objections, arguments de vente | A, D |
| 16 | `creative-direction-memo` | Creative Direction Memo | Briefs de direction créative pour prestataires (photographes, réalisateurs, illustrateurs, musiciens) | A, D |
| 17 | `pitch-architect` | Pitch Architect | Structure de pitch compétitif : stratégie, création, média, budget, différenciants clés (2 variations) | A, D, V, E |
| 18 | `award-case-builder` | Award Case Builder | Case studies pour festivals (narratif, résultats, insights stratégiques, formatage international) | A, D, E |

---

## B.4 Layer HYBRID — Opérationnel (11 outils)

Outils transversaux pour planning, budgets, workflows, coordination multi-équipes.

| # | Slug | Nom | Ce qu'il produit | Piliers requis |
|---|------|-----|-----------------|----------------|
| 19 | `campaign-360-simulator` | 360 Campaign Simulator | Déclinaisons campagne sur tous touchpoints : key visuals et headlines adaptés par format/canal (2 variations) | A, D, V |
| 20 | `production-budget-optimizer` | Production Budget Optimizer | Budget production optimisé : alternatives créatives, mutualisation, trade-offs qualité/coût par marché (3 variations) | A |
| 21 | `vendor-brief-generator` | Vendor Brief Generator | Briefs fournisseurs structurés (imprimeurs, réalisateurs, photographes, devs, CM) | A, D |
| 22 | `production-devis-generator` | Devis de Production | Devis production détaillé : lignes de coût, prix alignés marché, specs techniques, planning, conditions (3 variations) | A |
| 23 | `content-calendar-strategist` | Content Calendar Strategist | Calendrier éditorial social media : thèmes, formats, fréquences, moments clés marchés africains | A, D, E |
| 24 | `approval-workflow-manager` | Approval Workflow Manager | Workflows de validation : étapes, stakeholders, deadlines, checklists par type de projet | — |
| 25 | `brand-guardian-system` | Brand Guardian System | Vérification conformité marque : logo, couleurs, ton, territoire, cohérence | A, D |
| 26 | `client-education-module` | Client Education Module | Contenu éducatif client : bonnes pratiques, processus créatif, standards, métriques | — |
| 27 | `benchmark-reference-finder` | Benchmark & Reference Finder | Benchmarks et références créatives : campagnes inspirantes, case studies, tendances par secteur/mécanisme | A, D |
| 28 | `post-campaign-reader` | Post-Campaign Reader | Analyse post-campagne : interprétation performance, learnings, recommandations prochaine campagne | A, D, E |
| 29 | `digital-planner` | Planning Digital | Calendrier éditorial digital complet : planning semaine par semaine, recommandations format, cibles KPI par plateforme (4-16 semaines) | D, E |

---

## B.5 Layer BRAND — Pipeline identité visuelle (10 outils séquencés)

Pipeline complet de développement d'identité de marque. Les outils sont **séquencés avec dépendances explicites** : chaque outil consomme les outputs des outils précédents.

| # | Seq | Slug | Nom | Dépend de | Ce qu'il produit |
|---|-----|------|-----|-----------|-----------------|
| 30 | 1 | `semiotic-brand-analyzer` | Analyse Sémiotique | — | Analyse sémiotique complète : carré de Greimas, axes de Floch, connotation Barthes, gaps de sens dans le paysage concurrentiel |
| 31 | 2 | `visual-landscape-mapper` | Cartographie Visuelle | #30 | Cartographie visuelle concurrentielle : matrice 2×2, analyse DBA, zones chromatiques/typographiques disponibles |
| 32 | 3 | `visual-moodboard-generator` | Moodboard Visuel | #30, #31 | Moodboard multi-sources (Unsplash, Pexels, Pinterest, Are.na, Brave) avec analyse CMF + prompts Nano Banana AI |
| 33 | 4 | `chromatic-strategy-builder` | Architecte Chromatique | #32 | Système chromatique complet : architecture 5 tiers, specs Munsell/NCS, pairages accessibilité WCAG, builds Pantone+CMYK packaging |
| 34 | 5 | `typography-system-architect` | Architecte Typographique | #33 | Système typographique complet : 4 couches, échelle modulaire, modes IBM productive/expressive, support multi-langue, specs licensing |
| 35 | 6 | `logo-type-advisor` | Conseiller Type de Logo | #33, #34 | Recommandation type de logo : matrice de décision wordmark/symbol/combo/emblem (8 facteurs) + brief designer |
| 36 | 7 | `logo-validation-protocol` | Protocole Validation Logo | #35 | Protocole de validation : scalabilité (16px–billboard), monochrome, associations implicites, métriques 5D, architecture responsive 4 tiers |
| 37 | 8 | `design-token-architect` | Architecte Design Tokens | #33, #34, #36 | Tokens 3 tiers : primitive → semantic → component, multi-plateforme, multi-marque white-label, export JSON/YAML/CSS/Tailwind |
| 38 | 9 | `motion-identity-designer` | Designer Motion Identity | #37 | Système motion identity : principes IBM productive/expressive, courbes Bézier documentées, durées par complexité, chorégraphie multi-éléments, specs Lottie/CSS/Framer |
| 39 | 10 | `brand-guidelines-generator` | Générateur Guidelines | #33, #34, #36, #37, #38 | Guidelines de marque (13 sections, classe Frontify/Brandpad) : fondation, logo, couleurs, typo, imagerie, motion, accessibilité, gouvernance, specs régionales, package fichiers |

---

## B.6 Statistiques

| Dimension | Valeur |
|-----------|--------|
| Total outils | 39 |
| Layer CR | 10 |
| Layer DC | 8 |
| Layer HYBRID | 11 |
| Layer BRAND | 10 (séquencés) |
| Persistables (sauvegardés en BDD) | 21 |
| Non-persistables | 18 |
| Outils avec variations multiples | 7 |

### Contexte requis (plus demandés)
- `budgets` : 11 outils
- `missions` : 11 outils
- `competitors` : 11 outils
- `opportunities` : 5 outils
- Pilier A requis par 37/39 outils
- Pilier D requis par 37/39 outils

---

## B.7 Intégration avec les Drivers (nouveau — Industry OS)

Dans le nouveau système, les GLORY tools sont **liés aux Drivers** via `DriverGloryTool`. Un Driver "Instagram" pour un client FMCG au Cameroun sait quels GLORY tools sont pertinents pour ce canal et génère des briefs pré-configurés pour ces outils.

Le contexte ADVE (AdvertisVector de la Strategy) est automatiquement injecté dans chaque génération GLORY, en plus du contexte pilier existant.
