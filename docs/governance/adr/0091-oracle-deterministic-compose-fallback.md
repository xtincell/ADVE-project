# ADR-0091 — Oracle sans LLM : composers déterministes des sections 22-35 + boucle Jehuty fermée

**Status** : Accepted (implemented v6.25.17)
**Date** : 2026-06-12
**Phase** : Mégasprint « dernière ligne droite Back-End » — Vague 4 (Oracle & ADVERTIS UPgraders)
**Owning Neteru** : Artemis (sections) · Seshat (snapshots/télémétrie) · Imhotep/Anubis (drafts §22-23) · Mestor (Jehuty/Notoria)
**Relates to** : ADR-0067 (LLM structured enforcement), ADR-0068 (OracleSection), ADR-0070 (GENERATE_ORACLE_SECTION), ADR-0085 (STOP à Jehuty), ADR-0090 (rulers), v6.25.13 (audit 35 sections)

---

## 1. Contexte

Mandat mégasprint : « Assure-toi que la compilation de l'Oracle d'UPgraders,
ainsi que de toute la Fusée, fonctionne **même sans LLM** (fallback
déterministe). » État au 2026-06-12 :

- Les **21 sections CORE** sont `PURE_MAPPER` — déjà 0 LLM (Phase 21.5).
- Les **14 sections 22-35** (Imhotep/Anubis/BIG4/DISTINCTIVE) passaient
  exclusivement par des séquences/frameworks Artemis LLM. Sans clé API (ou
  sur échec LLM), `GENERATE_ORACLE_SECTION` → FAILED, Oracle troué.
- Doctrine Blueprint §3.5 : « ~95 % des outils sont COMPOSE ou CALC —
  déterministes. Le LLM est réservé à la génération créative pure. » Les
  sections 22-35 sont majoritairement de la **composition de données
  existantes** (snapshots, piliers, campagnes) — pas de la création.

Deux compléments du même mandat fermés dans la même vague :
- **Jehuty** (étage amont, STOP ADR-0085) n'avait aucun lien direct vers
  l'application d'une recommandation — l'opérateur devait quitter le feed.
- `trackAssetImpacts` (Seshat) n'était déclenché que par une route cron, or
  les crons Vercel ont été retirés (plan hobby) → boucle de feedback Ptah
  morte.

## 2. Décision

### 2.1 Quatorze composers COMPOSE — données réelles, zéro invention

`src/server/services/strategy-presentation/deterministic-composers.ts` :
un composer par section 22-35, qui assemble **exclusivement** des données
déclarées ou mesurées dans la shape exacte que le composant React consomme :

| § | Section | Sources réelles |
|---|---------|-----------------|
| 22 | Crew Program | `imhotep.draftCrewProgram` (déjà déterministe) |
| 23 | Plan Comms | `anubis.draftCommsPlan` + `e.touchpoints` déclarés |
| 24 | McKinsey 7S | 7 dimensions composées des piliers (état/gap/reco/score = ratio de présence) |
| 25 | BCG Portfolio | offres V (cash-cows), offres citées roadmap S (stars), innovations I (dilemmes) — **jamais de « dogs » auto-accusés sans mesure** |
| 26 | Bain NPS | `eNps` déclaré, sinon proxy Devotion Ladder ((ambassadeurs+évangélistes−spectateurs)/total) |
| 27 | Greenhouse | `a.equipeDirigeante` + complémentarité (rôles distincts/total) + gaps canaux sans compétence |
| 28 | 3 Horizons | initiatives SELECTED par timeframe (H1/H2) + innovations+vision (H3), allocation = ratios réels |
| 29 | Strategy Palette | classification déterministe turbulence (tendances+signaux) × densité concurrentielle, seuils documentés |
| 30 | Budget | budgets campagnes + BudgetLines + histogramme d'intensités du catalogue I |
| 31 | Cult Index | dernier `CultIndexSnapshot` (7 composantes) |
| 32 | Manipulation Matrix | `Strategy.manipulationMix` (uniforme 0.25 si non back-fillé) |
| 33 | Devotion Ladder | dernier `DevotionSnapshot` + superfans trackés + conversionTriggers |
| 34 | Overton | `s.fenetreOverton` réel (perceptions/écart/manœuvres) + `d.positionnement` |
| 35 | Tarsis | rows `Signal` TARSIS/WEAK réelles (40 dernières) |

**Honnêteté structurelle** : une donnée absente → `{}` → EmptyState UI.
Jamais de contenu inventé (cf. v6.25.13 « zéro contrat fictif »).

### 2.2 Deux portes de déclenchement dans `GENERATE_ORACLE_SECTION`

1. **Aucun provider configuré** (`isAnyLLMProviderConfigured()` : env
   ANTHROPIC/OPENAI/OLLAMA absents) → compose directement, pas d'appel voué
   à l'échec.
2. **Runner LLM échoue** (quota, circuit ouvert, Zod fail post-retry) →
   dégradation gracieuse vers le composer. L'erreur d'origine est loggée ;
   si la section n'a pas de composer, l'erreur remonte inchangée.

Confidence : 0.8 (sections lues depuis des mesures : 31/33/35), 0.6
(compositions dérivées). Provenance `_provenance: DETERMINISTIC_COMPOSE`
persistée dans le BrandAsset (strippée de l'UI, conservée pour l'audit).

### 2.3 Writeback canonique partagé

Le composer écrit son BrandAsset via `promoteSectionToBrandAsset`
(enrich-oracle, désormais exporté) — même chemin que la séquence LLM :
discrimination `metadata.sectionId`, Loi 1 (ACTIVE jamais écrasé), cap de
taille. **Aucun chemin d'écriture parallèle.**

### 2.4 Jehuty — la boucle se ferme sans quitter le feed

- `jehuty.applyRecommendation` (governed `APPLY_RECOMMENDATIONS`) : accept
  (si PENDING) + apply via le lifecycle Notoria canonique — le **gate de
  remplacement ADR-0090 s'applique**. Bouton « Appliquer au pilier » sur les
  items RECOMMENDATION du feed. Le STOP ADR-0085 est respecté : c'est un
  clic opérateur explicite, jamais une cascade.
- Ranking curation-aware : PINNED > NOTORIA_TRIGGERED > priority.

### 2.5 Asset impact tracking — opportuniste + manual-first

- Run **opportuniste** fire-and-forget en fin de `runMarketIntelligence`
  (chaque passe de télémétrie mesure les AssetVersions matures ≥24h).
- Parité manuelle (ADR-0060) : `marketIntelligence.trackAssetImpacts`
  (nouveau kind `SESHAT_TRACK_ASSET_IMPACTS`). Idempotent.

### 2.6 ADVERTIS 100 % — métrique + seed UPgraders + compte NEFER

- `getStrategyAdvertisCompletion(strategyId)` (pillar-readiness) :
  `advePct` (moyenne A/D/V/E) + `advertisPct` (8 piliers) dérivés des
  contrats de maturité — aucune heuristique parallèle. Exposé via
  `notoria.getAdvertisCompletion`.
- `prisma/seed-upgraders.ts` : la stratégie « La Fusée — Industry OS »
  d'UPgraders elle-même, **chaque champ des contrats COMPLETE A/D/V/E rempli**
  avec le contenu canon du corpus blueprint (35+20+25+23 champs) + RTIS
  dérivés cohérents. Méta-isomorphisme assumé (Cahier des charges Ch.7 §7.3).
- Compte **NEFER** full admin seedé (`nefer@upgraders.io`) pour la
  validation UX de bout en bout (chantier 7). MFA non-enrôlé = login mot de
  passe seul (le gate MFA ne s'active qu'avec un MfaSecret).

## 3. Alternatives écartées

- **Templates LLM «&nbsp;dégradés&nbsp;» (petit modèle local)** : reste du LLM, reste
  de la variance ; contredit la consigne. Écarté.
- **Sections 22-35 vides sans LLM** (statu quo) : l'Oracle est le livrable
  qui convertit — le vendre troué est commercialement indéfendable. Écarté.
- **Composer qui invente des valeurs plausibles** (croissance estimée, NPS
  supposé) : violerait l'honnêteté structurelle v6.25.13. Une lacune visible
  vaut mieux qu'un chiffre halluciné. Écarté.
- **Cron externe pour trackAssetImpacts** : pas de cron sur le plan Vercel ;
  un service tiers ajouterait une dépendance d'infra pour un besoin couvert
  par l'opportunisme + le manuel. Écarté.

## 4. Conséquences

- **L'Oracle entier (35/35) compile sans LLM** : 21 PURE_MAPPER + 14
  DETERMINISTIC_COMPOSE. Le LLM redevient ce qu'il doit être : un
  enrichissement créatif optionnel, jamais une dépendance de compilation.
- 15 tests : couverture 14/14 composers, shapes exactes des composants,
  déterminisme (variance 0), honnêteté (EmptyState sans snapshot), writeback
  + provenance, zéro import llm-gateway (vérifié statiquement).
- Nouveau kind `SESHAT_TRACK_ASSET_IMPACTS` (483 kinds au catalogue).
- Cap APOGEE 7/7 préservé — aucun nouveau Neter, aucune nouvelle entité
  métier (grep CODE-MAP négatif : composition de l'existant).
