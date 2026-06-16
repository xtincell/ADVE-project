# PROPAGATION-MAP — Tout remonte à l'ADVE

> Carte de **propagation / dérivation** de La Fusée. Doctrine fixée par l'opérateur (2026-06-16) :
> *« Presque tout dans La Fusée a un chemin de propagation qui remonte jusqu'à l'ADVE. Analyser la propagation = tracer ce chemin et voir les trous, même éventuels. »*
>
> Les autres cartes répondent à d'autres questions : `CODE-MAP` (mot métier ↔ entité), `SERVICE-MAP`/`ROUTER-MAP`/`PAGE-MAP`/`COMPONENT-MAP` (inventaires structurels), `VARIABLE-BIBLE-CANON` (champ ↔ code, à plat), `DIMENSIONS` (4 axes temporels de la marque). **Aucune ne trace l'arête « ça dérive de l'ADVE ».** C'est le rôle de ce document.

---

## 1. Doctrine — l'ADVE est le socle, tout le reste en dérive

- **ADVE** (`a` Authenticité · `d` Distinction · `v` Valeur · `e` Engagement) = **socle fondateur**, muté **uniquement** par l'opérateur via `OPERATOR_AMEND_PILLAR` (3 modes). Indépendant : modifier A ne flippe pas E.
- **RTIS** (`r` Risque · `t` Track · `i` Innovation · `s` Stratégie) = **dérivé** de l'ADVE via les Intents `ENRICH_R_FROM_ADVE` / `ENRICH_T_FROM_ADVE_R_SESHAT` / `GENERATE_I_ACTIONS` / `SYNTHESIZE_S`. Jamais édité à la main (contrainte type-level sur `pillarKey`).
- **Tout artefact aval** (Oracle 35 sections, Glory tools, score/palier, calendrier de lancement, deliverables, BrandAction…) doit avoir une **chaîne de dérivation traçable jusqu'à l'ADVE**.

**Définition d'un trou** : une entité / un champ / une surface UI dont le chemin vers l'ADVE est **cassé, implicite, hardcodé, mocké, ou absent**. Un trou est un drift en puissance — il affiche au client quelque chose que la marque n'a pas réellement déclaré.

**Règle NEFER (Phase 2)** : avant d'ajouter un champ, une surface ou un livrable, **tracer sa propagation jusqu'à l'ADVE**. Si la chaîne n'existe pas → soit la créer (lire un pilier), soit documenter le trou ici avec sévérité + owner. Pas de prose libre surfacée comme si elle dérivait de la marque.

---

## 2. Mécanismes canoniques de propagation

| Mécanisme | Rôle | Fichier(s) |
|---|---|---|
| Module pilier (source unique) | `ADVE_KEYS`/`RTIS_KEYS`, `PILLAR_METADATA.phase` | `src/domain/pillars.ts:22-171` |
| Modèle `Pillar` | `content`, `validationStatus`, `staleAt`, `completionLevel` | `prisma/schema.prisma:1423-1473` |
| `resolveEffectivePillars` (Phase 18 tree-aware) | résout ADVE/RTIS effectifs (override nœud → strategy → ancêtre → vide) + provenance | `src/server/services/brand-node/inheritance.ts:92-187` |
| Cascade RTIS | R=analyse(ADVE) · T=analyse(ADVE+R+Seshat) · I=catalogue(ADVE+R+T) · S=synthèse(tout) | `src/server/services/mestor/rtis-cascade.ts:352-820` |
| `OPERATOR_AMEND_PILLAR` (seule écriture ADVE) | `pillarKey: a\|d\|v\|e` type-level ; gate cohérence ; cascade staleness | `src/server/services/mestor/operator-amend.ts:39-249` |
| Gate cohérence narrative (N7) | refuse une amende ADVE qui casse le ton/archétype A | `src/server/services/mestor/gates/narrative-coherence.ts:42-122` |
| Variable Bible (éditable vs dérivé) | `getEditableMode` : `derivedFrom` ou pilier non-ADVE ⇒ `INFERRED_NO_EDIT` ; `feedsInto` = arêtes de propagation | `src/lib/types/variable-bible.ts:798-838` |
| Scorer ADVE → palier | contenu pilier → score structurel × poids biz → composite /200 → `classifyTier` | `src/server/services/advertis-scorer/index.ts:70-239` · `src/domain/brand-tier.ts:56-64` |
| **Topologie canonique de staleness** | `PILLAR_DEPENDENCIES` : A/D/V/E → [R,I,S] ; R→[I,S] ; T→[I,S] ; I→[S] ; S→[] | `src/server/services/staleness-propagator/index.ts:33-42` · `src/lib/types/advertis-vector.ts:106-129` |

---

## 3. Colonne vertébrale — chaque surface aval → l'ADVE

| Surface | Chaîne jusqu'à l'ADVE | Preuve |
|---|---|---|
| Oracle §01–21 (CORE) | `PURE_MAPPER` lisant le contenu pilier (0 LLM) | `strategy-presentation/section-mappers.ts:48-120` |
| Oracle §22–35 (Imhotep/Anubis/BIG4/DISTINCTIVE) | composers déterministes lisant piliers + snapshots mesurés | `strategy-presentation/deterministic-composers.ts:216-687` |
| Glory tools (LLM) | `loadStrategyContext` injecte les 8 piliers + vecteur dans le prompt | `artemis/tools/engine.ts:27-103` |
| Calendrier lancement/social | `compose{Naming,SocialCopy,ContentCalendar,LaunchTimeline}` lisent a/d/e/i/s | `artemis/tools/glory-composers.ts:142-366` |
| Deliverable forge | cible `BrandAssetKind` → DAG de briefs (Glory tools pilier-ancrés) | `deliverable-orchestrator/resolver.ts:39-98` |
| RTIS | R/T/I/S = dérivés ADVE (§2) | `mestor/rtis-cascade.ts:352-589` |
| Score / palier | contenu pilier → composite → `classifyTier` | `advertis-scorer/index.ts` · `brand-tier.ts` |
| BrandAction DB (ADR-0094) | actions ancrées ADVE+R+T ; `pilierImpact: enum(PILLAR_KEYS)` | `action-db/propose.ts:6-56` |
| Cockpit Overton | axe secteur + tags pilier-D + façade Tarsis ; flag `mocked` honnête | `trpc/routers/cockpit-router.ts:38-173` |

---

## 4. Registre des trous (audit 2026-06-16)

Sévérité : 🔴 à corriger · 🟡 par-design mais signalé honnêtement · 🟢 corrigé · ⚪ par-design non-ADVE (intentionnel).

| # | Trou | Sévérité | Statut / Owner | Réf. |
|---|---|---|---|---|
| **H1** | `ContentPost.caption`/`illustration` : squelette (theme/angle) tracé pilier d/e/i, mais le gabarit de prose ne lisait pas la voix de marque | 🟢 **corrigé 2026-06-16** | la dérivation reçoit désormais `PostBrandVoice` (pilier D `tonDeVoix.personnalite` + `assetsLinguistiques.lexique`) côté composer → remonte à l'ADVE(d) ; read-side legacy = gabarit nu honnête | `lib/types/launch-calendar.ts:128-185` · `glory-composers.ts` composeContentCalendar |
| **H2** | `composeContentCalendar` : rythmes de cadence (« 4-5 posts/sem »…) + noms de phases Overton **hardcodés**, non lus d'un pilier (pas de fréquence E ni cadence S) | 🔴 ouvert · Artemis | `glory-composers.ts:294-302` |
| **H3** | `composeManipulationMatrix` : fallback 0.25/mode quand `manipulationMix` null — distribution fabriquée | 🟡 flaggé « Mix uniforme implicite » | `deterministic-composers.ts:530-547` |
| **H4** | Tarsis weak signals → ceiling score + Oracle §35 : intel marché externe (intentionnellement non-ADVE) | ⚪ par-design · `_mocked` honnête + états DEGRADED | `seshat/tarsis/connector.ts` · `advertis-scorer/index.ts:215-218` |
| **H5** | Oracle §22/§23 (Imhotep/Anubis) : `summary = draft.placeholder` quand le Neter est en mode draft (canaux pilier-fed, headline non) | 🟡 ouvert · Imhotep/Anubis | `deterministic-composers.ts:186-214` · `enrich-oracle.ts:728-770` |
| **H6** | Ceiling de palier (CULTE/ICONE) : sources superfans/cult-index/âge/Tarsis = non-ADVE | ⚪ par-design (plafond, jamais plancher ; base composite 100 % ADVE) | `advertis-scorer/index.ts:171-239` |
| **H7** | `composeBainNps` : score NPS = proxy depuis Devotion Ladder quand pas d'eNPS déclaré | 🟡 flaggé `methode` + `allow-adhoc-completion` | `deterministic-composers.ts:326-365` |
| **H8** | **Deux topologies de dépendance pilier divergentes** : `domain/pillars.ts` (cascade linéaire générique) vs `staleness-propagator` (canonique, ADVE socle indépendant). La version `domain/pillars.ts` n'est référencée **que par son test** — dormante mais piégeuse | 🔴 ouvert · domain — à réconcilier (la canonique = `staleness-propagator`) | `domain/pillars.ts:200-206` vs `staleness-propagator/index.ts:33-42` |
| **H9** | `loadStrategyContext` injecte les piliers sans **garde de staleness** : un Glory tool peut lire un RTIS périmé (cascade non rejouée) → output tracé sur une dérivation obsolète | 🟡 ouvert · Artemis | `artemis/tools/engine.ts:49-95` |

> Les 🔴/🟡 ouverts sont à trier par l'opérateur (certains exigent une source pilier qui n'existe pas encore — ex. cadence éditoriale H2). Ne pas « combler » un trou en inventant des données : soit lire un pilier réel, soit afficher l'absence honnêtement (EmptyState / flag `mocked`).

---

## 5. Comment NEFER s'en sert (protocole Phase 2)

Au moment d'ajouter/modifier un champ, une surface ou un livrable :

1. **Tracer la chaîne** : ce champ dérive de quel pilier ? Par quel mécanisme (§2) ? Si la réponse est « d'un littéral / d'un mock / de rien » → c'est un trou.
2. **Brancher ou documenter** : soit lire le pilier (cf. §2 mécanismes), soit inscrire le trou en §4 (sévérité + owner) et l'afficher honnêtement.
3. **Vérifier la propagation amont** (la consigne d'origine) : un changement de type/schéma partagé doit être propagé à *tous* ses consommateurs (`tsc` + grep des importeurs) **et** à la doc (CHANGELOG Phase 6, ce registre, CODE-MAP auto).

---

## 6. Maintenance

Document **hand-authored** (comme `DIMENSIONS.md` / `MISSION.md`). Les arêtes sont aujourd'hui dispersées (`variable-bible.feedsInto`, `staleness-propagator.PILLAR_DEPENDENCIES`, `rtis-cascade`, les composers, `SECTION_REGISTRY`). **Amélioration future** : un générateur (`scripts/gen-propagation-map.ts`) qui moissonne `feedsInto` + `PILLAR_DEPENDENCIES` pour produire le graphe mécaniquement — non implémenté (chantier séparé). En attendant, ré-auditer ce registre quand un pilier, un composer, un Glory tool ou une section Oracle est ajouté/modifié.
