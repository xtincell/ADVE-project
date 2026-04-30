> # ⚠️ DÉPRÉCIÉ — Ce document est superseded par [APOGEE.md](APOGEE.md)
>
> Le framework s'appelle **APOGEE**, pas MAAT. La décision a été prise après remise en question de la cohérence de MAAT avec l'intention produit (cult-building / propulsion / Overton-shifting) et le marché cible (Afrique francophone créative).
>
> Voir [ADR-0001](adr/0001-framework-name-apogee.md) pour le raisonnement complet.
>
> Cette page est conservée pour la traçabilité historique. Ne pas écrire de code nouveau contre MAAT — utiliser APOGEE.

---

# MAAT — Le Framework de La Fusée *(version dépréciée)*

> *Avant les Neteru, il y a MAAT.*
> *Avant les services, il y a le contrat.*
> *Avant l'action, il y a la pesée.*

Ce document définit l'**identité, la philosophie et la logique de croissance** du framework qui régit l'OS La Fusée. Il complète [FRAMEWORK.md](FRAMEWORK.md) (qui décrit *les piliers techniques*) en exprimant *le système de valeurs* qui rend le framework cohérent dans le temps.

Lecture également recommandée : [REFONTE-PLAN.md](REFONTE-PLAN.md), [GITHUB-ACTIONS-GUIDE.md](GITHUB-ACTIONS-GUIDE.md), [context/MEMORY.md](context/MEMORY.md).

---

## 1. Le nom

**MAAT** — déesse égyptienne et principe cosmologique.

Dans la mythologie qui a déjà nommé les Neteru (Mestor, Artemis, Seshat, Thot, Tarsis), **MAAT est ce que les Neteru servent**. Vérité, balance, ordre, justice, harmonie. Le contraire d'isfet (chaos, mensonge, désordre).

Dans l'iconographie : MAAT est représentée par une plume. Dans le rituel funéraire, le cœur du défunt est pesé contre la plume de MAAT. Si le cœur est plus léger, l'âme passe. S'il est plus lourd (alourdi par les actes non rachetés), il est dévoré.

**Application au framework** : tout intent est *pesé contre MAAT* avant de compléter. Pré-conditions (Pillar 4 du FRAMEWORK), post-conditions (à venir, cf. §6.2), hash-chain audit (immuabilité de la trace), Thot budget gate — ce sont autant de pesées. Un intent qui ne satisfait pas ces conditions n'est pas mergé dans l'état du monde : il est `VETOED` ou `DOWNGRADED`.

Acronyme dérivable : **M**odular **A**uditable **A**rchitecture for **T**ransformation. C'est l'excuse rationnelle pour les contextes corporate. Le vrai nom est mythologique.

---

## 2. La philosophie — six principes

Toute décision technique du framework dérive de l'un de ces six principes. Quand un trade-off émerge, on demande "lequel des six honore-t-on ?" — pas "quelle est la meilleure pratique JS courante ?".

### Principe 1 — Aucune action silencieuse

Tout intent est *vu*. Tout effet est *tracé*. Tout coût est *mesuré*. Une mutation qui ne laisse pas de trace n'a pas eu lieu.

Manifestation technique : `IntentEmission` hash-chained, `IntentEmissionEvent` pour les phases, `cost-tracking` LLM Gateway, `audit-trail` côté Prisma.

### Principe 2 — La causalité est sacrée

Chaque artefact (Oracle section, recommandation, score, snapshot) connaît sa **lignée** : quel Intent l'a produit, avec quels inputs, par quel Neteru, à quel coût. La causalité est interrogeable, replay-able, falsifiable.

Manifestation : table `IntentEmission.spawnedFrom`, `OracleSnapshot.parentIntentId`, `ScoreDecision.intentId`. Hash-chain par strategyId rend toute rupture détectable.

### Principe 3 — Pré-conditions plutôt que post-fixes

On refuse les actions dont l'état du monde ne supporte pas l'exécution. Le handler n'a pas à se défendre — `governedProcedure` évalue les `preconditions` du manifest et `VETOED` avant l'invocation.

Manifestation : `pillar-readiness` avec 5 gates fixes (`DISPLAY_AS_COMPLETE`, `RTIS_CASCADE`, `GLORY_SEQUENCE`, `ORACLE_ENRICH`, `ORACLE_EXPORT`). Une nouvelle gate exige un ADR (cf. §7).

### Principe 4 — Modularité par identité, pas par découpage

Chaque module (service, capability, Glory tool, plugin) déclare *qui il est* via son manifest. Un module sans manifest n'existe pas. Un module dont le manifest ne correspond pas à son comportement est rejeté en CI.

Manifestation : `NeteruManifest`, `GloryToolManifest`, `PluginManifest`. Codegen registry. ESLint custom rules. `audit-governance` script.

### Principe 5 — Croissance par rituel, pas par improvisation

Ajouter une capability suit un chemin prescrit (`scaffold:capability`). Modifier l'architecture passe par un ADR. Déprécier suit un cycle ritualisé (2 sprints). Le système refuse l'improvisation parce qu'elle dégrade la cohérence à long terme.

Manifestation : `npm run scaffold:capability`, `docs/governance/adr/`, label `phase/N` obligatoire, `out-of-scope` exigeant justification écrite.

### Principe 6 — Le refus est une fonctionnalité

`VETOED`, `DOWNGRADED`, `FAILED` sont des sorties first-class du lifecycle, pas des erreurs honteuses. Refuser une action coûteuse, refuser une action prématurée, refuser une action contradictoire — c'est *agir*. Le framework expose les refus à l'utilisateur avec autant de soin que les succès.

Manifestation : `IntentPhase` enum inclut explicitement `VETOED` et `DOWNGRADED`. NSP émet ces transitions. UI kit affiche `<MestorVetoExplainer>`, `<ThotDowngradeNotice>`. Le refus n'est jamais un 500 silencieux.

---

## 3. La logique de croissance

Un framework modulaire grandit. Sans direction, il dégénère. MAAT prescrit comment.

### Croissance verticale — Ajouter un Neteru

Un nouveau Neteru ne s'ajoute *que* quand la cosmologie l'exige. Critères :
- Il représente une fonction de gouvernance distincte (pas redondante avec Mestor / Artemis / Seshat / Thot).
- Il a un patronage mythologique cohérent (Anubis pour l'archivage immuable ; Bastet pour la relation client ; Sobek pour la sécurité ; Hathor pour la qualité émotionnelle).
- L'ajout traverse un ADR formel.

Le Pantheon n'est pas illimité. Plus il est dense, plus chaque Neteru perd son identité. **Plafond conseillé : 7 Neteru.** Au-delà, on consolide.

### Croissance horizontale — Ajouter une capability dans un Neteru existant

Pas d'ADR. Suit le rituel : `scaffold:capability` → 3 trous remplis → manifest validé → test → SLO déclaré → PR avec label `phase/N`. Si la capability touche un Glory tool, sous-format `GloryToolManifest`.

### Croissance externe — Plugins tiers

Un partenaire UPgraders crée une capability sans toucher au repo core. Conditions :
- Manifest plugin signé (clé publique du core).
- `sideEffects` déclarés et **réellement enforced** par sandboxing runtime (cf. §6.5).
- Versionning aligné sur l'API publique `@lafusee/sdk`.
- Compatibilité testée via le contract suite distribué (`@lafusee/contract-tests`).

Premier plugin de démo : `@upgraders/loyalty-extension` (Intent `COMPUTE_LOYALTY_SCORE`).

### Croissance intérieure — Apprentissage

Seshat observe. Mais le système doit *apprendre*. Une capability `Pattern Recognition` (à introduire en P6+) agrège les `IntentEmission` historiques pour suggérer :
- Pré-remplissage prédictif des Pillars sur base de brands similaires.
- Recommandation de Glory tools selon la phase de la brand.
- Ajustement de `qualityTier` / `costTier` selon les résultats observés.

Ce n'est pas un Neteru de plus — c'est une fonction transverse de Seshat.

### Décroissance — Mort rituelle d'une capability

Ne pas pouvoir mourir = ne pas pouvoir vivre. MAAT prescrit la dépréciation :
1. Marquer `manifest.deprecated: { since, replacedBy?, removalSprint }` (warn lint au callsite).
2. Sprint+1 : warns deviennent errors hors d'un opt-in explicite.
3. Sprint+2 : suppression. Le code est `git rm`ed, l'Intent kind est retiré du union, l'entrée d'`INTENT-CATALOG.md` est archivée dans `intent-catalog-graveyard.md`.

---

## 4. Le plan des 5 points soulevés

Reprise des 5 points commentés sur FRAMEWORK.md, planifiés dans le système de phases.

### Point 1 — Pillar 6 : Cost (gouvernance Thot active)

**Problème** : `capability.costEstimateUsd` est lu passivement par le LLM Gateway. Thot reste passif. Pour faire de Thot un *Neteru de gouvernance budgétaire active*, il faut un gate.

**Solution** : nouveau pilier `Cost` co-équivalent aux 5 existants.

```ts
// src/server/governance/cost-gate.ts
export interface CostDecision {
  decision: "ALLOW" | "DOWNGRADE" | "VETO";
  estimatedUsd: number;
  remainingBudgetUsd: number;
  downgradeTo?: { qualityTier: QualityTier; expectedDelta: number };
  reason: string;
}

export async function evaluateCostGate(
  intent: Intent,
  manifest: NeteruManifest,
  ctx: GovernanceContext
): Promise<CostDecision>;
```

`governedProcedure` appelle `evaluateCostGate` *après* `evaluatePillarReadiness`, *avant* `commandant.execute`. Décision persistée dans nouvelle table `CostDecision { id, intentId, ...above, decidedAt }`.

**Phase** : P3 (extension de `governedProcedure`).
**Effort** : ~2 jours.
**Critère** : un Operator avec `budgetRemaining < estimatedUsd × 1.2` reçoit `DOWNGRADE` (model dégradé) ou `VETO` selon manifest. UI rend `<ThotDowngradeNotice>`.

### Point 2 — Post-conditions

**Problème** : on vérifie l'état du monde *avant* l'action. Mais après ? Si Notoria écrit un Pillar avec `score=150`, qui le détecte ?

**Solution** : `manifest.capability.postconditions[]` — Zod refinements + invariants métier évalués sur l'output *avant* `status=COMPLETED`.

```ts
capabilities: [{
  name: "writePillarAndScore",
  outputSchema: PillarWriteResult,
  postconditions: [
    { name: "score-in-range", check: (out) => out.score >= 0 && out.score <= 100 },
    { name: "cache-consistent", check: (out, ctx) => isCacheConsistent(out, ctx) },
    { name: "stale-future", check: (out) => out.staleAt > new Date() },
  ],
}]
```

Échec d'une post-condition → l'intent passe `FAILED` avec `reason="POSTCONDITION:<name>"`. Pas de write dans l'état du monde (transactionnel).

**Phase** : P2 (extension du format manifest) + P3 (évaluation dans dispatcher).
**Effort** : ~3 jours (le rollback transactionnel demande de wrapper Artemis).
**Critère** : forcer un score=150 dans Notoria en local → intent fail, DB inchangée, `IntentEmission.status="FAILED"`.

### Point 3 — `GloryToolManifest` allégé

**Problème** : 91 Glory tools. Forcer le format `NeteruManifest` complet est overkill (ils n'acceptent pas d'Intent kinds, ne sont pas gouverneurs).

**Solution** : sous-format dédié.

```ts
export interface GloryToolManifest {
  tool: string;
  governor: "ARTEMIS";          // toujours Artemis
  qualityTier: "S"|"A"|"B"|"C";
  costTier: "PREMIUM"|"STANDARD"|"LITE";
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  postconditions?: Postcondition[];
  expectedLatencyMs: number;
  deterministicSeed: boolean;
  variants?: string[];           // A/B
  dependencies: string[];        // tools en amont (skill tree)
  pillarsAffected: PillarKey[];
  costEstimateUsd: number;
}
```

Validé par `audit-glory-tools` séparé d'`audit-governance`. Inventaire généré dans `docs/governance/glory-tools-inventory.md`.

**Phase** : P2.6 (déjà prévu).
**Effort** : ~5 jours pour les 91 manifests + lint enforcement.

### Point 4 — Clarifier `OBSERVED`

**Problème** : si Seshat plante, est-ce que `IntentEmission.status="COMPLETED"` ou autre chose ? Implicite n'est pas suffisant.

**Solution** : découpler observation et completion. Deux statuts distincts :

```prisma
model IntentEmission {
  // ...
  status            String   // PROPOSED|DELIBERATED|EXECUTING|COMPLETED|VETOED|DOWNGRADED|FAILED
  observationStatus String?  // null|PENDING|OBSERVED|FAILED  (async, indépendant)
}
```

Règle :
- `status` reflète **l'action côté Mestor/Artemis**. Devient `COMPLETED` dès qu'Artemis renvoie un résultat.
- `observationStatus` reflète **Seshat**. Démarre `PENDING` à `COMPLETED`. Devient `OBSERVED` quand Seshat a indexé. `FAILED` si Seshat plante après N retries.
- L'utilisateur voit `COMPLETED` dans l'UI sans attendre Seshat. Si `observationStatus=FAILED`, badge `<SeshatRetryBadge>` (silencieux, ne bloque rien).

**Phase** : P3 (schéma + dispatcher).
**Effort** : ~1.5 jour.

### Point 5 — Plugin sandboxing concret

**Problème** : promesse de sandbox sans implémentation = promesse vide.

**Solution** par type de side-effect :

| Side-effect | Mécanisme de sandbox |
|---|---|
| `DB_WRITE` | Plugin reçoit un `db` proxy qui scope automatiquement `where: { pluginId }` sur toute opération + n'expose que les tables déclarées dans `manifest.tablesAccessed[]` |
| `LLM_CALL` | Plugin n'a pas accès direct au LLM Gateway. Doit appeler `pluginCtx.llm(prompt, opts)` qui passe par un proxy core qui mètre les tokens, applique le `costTier`, route via Thot |
| `EXTERNAL_API` | Plugin déclare `manifest.externalDomains[]` (whitelist explicite). Runtime intercepte `fetch` et rejette si hors whitelist. Pas de `node:net` ni `node:http` direct (lint + Node permissions API) |
| `EVENT_EMIT` | Plugin n'écrit pas dans EventBus directement. Émet via `pluginCtx.emit(eventKind, payload)` qui valide kind contre une whitelist dérivée de `manifest.emits[]` |

Si une de ces 4 garanties n'est pas implémentable proprement, le type de side-effect est désactivé pour les plugins externes (pas pour le core).

**Phase** : P2.7 étendue.
**Effort** : ~5 jours (le proxy `db` est le plus complexe).
**Critère** : `@upgraders/loyalty-extension` plugin de démo prouve les 4 mécanismes en e2e.

---

## 5. Ce qui manquait encore (au-delà des 5 points)

Le framework gagne en identité quand il **nomme et codifie** ce qui flottait implicitement. Voici 5 dimensions supplémentaires.

### 5.1 — Le Lexique

Doc à créer : `docs/governance/LEXICON.md`. Glossaire normatif des termes du framework. Exemples :

- **Intent** : unité atomique de causalité dans MAAT. Tout effet métier dérive d'un Intent.
- **Capability** : fonction nommée et typée exposée par un service via son manifest.
- **Cascade** : enchaînement A→D→V→E→R→T→I→S, avec dépendances (T dépend de R+ADVE, etc.).
- **Délibération** : phase de l'Intent où Mestor décide du plan d'exécution (peut inclure un LLM call).
- **Veto** : refus d'exécution motivé par pré-conditions, budget, ou Mestor.
- **Tarsis Signal** : observation faible captée par Seshat hors du flux des Intents.
- **Glory Sequence** : enchaînement topologiquement trié de Glory tools (skill tree).
- **Strangler Procedure** : `auditedProcedure` qui logge un router non-encore-migré sans bloquer.
- **Pesée** : évaluation d'un Intent contre les pré-conditions/cost-gate/post-conditions (métaphore MAAT).
- **Drift** : divergence entre l'état déclaré (manifests, ADRs) et l'état réel (code, DB).

Sans lexique, "intent" devient flou — un dev pourrait croire que c'est une intention molle alors que c'est l'unité atomique. Le doc s'auto-régule en lisant les manifests pour repérer les termes utilisés sans définition canonique.

### 5.2 — L'Iconographie

Chaque Neteru reçoit son glyphe officiel, dérivé de l'iconographie égyptienne :

- **Mestor** : balance (ou plume MAAT) — décide, pèse.
- **Artemis** : arc (de la déesse grecque associée à la chasse — l'Artemis de La Fusée est un mix iconographique). Représente précision et direction.
- **Seshat** : palette de scribe — observe, archive.
- **Thot** : ibis (ou tablette) — calcule, équilibre.
- **Tarsis** : œil — capte les signaux faibles.

Glyphes `lucide-react` mappés dans `src/components/neteru/glyphs.ts`. Utilisés dans le UI Kit, la navbar, les emails transactionnels, les exports Oracle.

C'est cosmétique en surface, fondateur en pratique. Une marque sans glyphes est une marque fade. Un OS sans iconographie reste un outil.

### 5.3 — Les Rituels (cérémonies)

Le framework a des cron jobs (drift hebdo). Il lui manque des **rituels** humains.

- **Boot ritual** : tout dev/agent qui rejoint le projet lit FRAMEWORK.md → MAAT.md → exécute un scaffold de démo → rédige `docs/governance/adr/onboarding-<name>.md` "ma première capability". Pas optionnel.
- **Sprint review** : fin de chaque Phase, lecture publique du `scope-drift.md` + comptage des `out-of-scope` mergées + validation des SLOs.
- **Monthly ADR review** : revue mensuelle des ADRs (créés, périmés, conflits). 30 min, archivée en `docs/governance/adr-reviews/<YYYY-MM>.md`.
- **Semestriel** : revue de la cosmologie. Faut-il ajouter / consolider un Neteru ? Quels lexiques ont divergé ? Drift de la philosophie ?

Cérémonialiser la rétrospective évite que la doctrine se diluer en silence.

### 5.4 — Méta-observabilité (santé de MAAT)

On observe les Intents. Mais qui observe le framework lui-même ?

Page admin `/console/governance/maat-health` qui rend :

- Nombre de manifests (services + Glory tools + plugins).
- Nombre d'Intents kinds, dont versionnés v1/v2.
- Nombre d'ADRs créés ce trimestre.
- Drift score (ratio violations lint warns / KLOC, tendance 30j).
- Hash-chain integrity (rolling 7d, par operator).
- SLO compliance global.
- Coût rolling 30j par Neteru.
- Liste des `out-of-scope` mergées et leur justification.

Endpoint Prometheus-style pour scraping externe. Sans ces métriques, MAAT devient une religion non vérifiable.

### 5.5 — Réversibilité (Compensating Intents)

Tous les Intents ne sont pas réversibles (un coût LLM est dépensé). Mais beaucoup le sont (write Pillar, snapshot Oracle, etc.).

Solution : `manifest.capability.compensatingIntent?: Intent["kind"]` — déclare l'Intent qui annule celui-ci. Exemple :

- `WRITE_PILLAR` ↔ `ROLLBACK_PILLAR` (réversible)
- `EXPORT_ORACLE` → null (irréversible, fichier généré)
- `SNAPSHOT_ORACLE` ↔ `DELETE_SNAPSHOT_ORACLE` (réversible)

UI `/console/governance/intents` expose un bouton "Compensate" pour les Intents réversibles. Un compensating intent est lui-même un Intent (audité, hash-chained, gouverné).

Permet de dire "annule la cascade RTIS qu'on a lancée par erreur sur la mauvaise strategy" sans intervention manuelle DB.

---

## 6. Synthèse des additions au plan de refonte

Tableau de ce qui s'ajoute au [REFONTE-PLAN.md](REFONTE-PLAN.md), avec phase-d'attache.

| Addition | Phase | Effort | Type |
|---|---|---|---|
| 4.1 Pillar 6 — Cost gate (Thot actif) | P3 | 2j | Code + schéma |
| 4.2 Post-conditions dans manifests | P2 + P3 | 3j | Schéma + dispatcher |
| 4.3 GloryToolManifest sous-format | P2.6 | 5j | 91 manifests |
| 4.4 Découplage `status` / `observationStatus` | P3 | 1.5j | Schéma + UI |
| 4.5 Plugin sandboxing (4 mécanismes) | P2.7 | 5j | Proxy + tests |
| 5.1 LEXICON.md | P0 ou P7 | 1j | Doc |
| 5.2 Iconographie Neteru | P5 (UI Kit) | 2j | Composants |
| 5.3 Rituels (boot, sprint, ADR review, semestriel) | P0 (instaurer) | 1j | Doc |
| 5.4 Page `maat-health` + endpoint metrics | P8 | 4j | Code + UI |
| 5.5 Compensating Intents | P3 | 3j | Schéma + UI |

**Total ajouté** : ~27 jours, soit ~3-4 sprints. Estimation totale du plan passe de **11–13 semaines** à **13–15 semaines** (1 dev senior plein temps), **8–9 semaines** (2 devs).

C'est le coût de l'identité. Le framework devient *MAAT* au lieu de "le framework de La Fusée".

---

## 7. ADRs — Architecture Decision Records

À partir de maintenant, toute décision structurelle traverse un ADR dans `docs/governance/adr/`. Format léger :

```markdown
# ADR-NNNN — <titre court>

**Date** : YYYY-MM-DD
**Statut** : proposed | accepted | superseded by ADR-MMMM | deprecated
**Phase de refonte** : phase/N

## Contexte
Quel problème, quelle observation, quelle pression a fait surgir la décision ?

## Décision
La décision elle-même. Une phrase si possible.

## Conséquences
Ce qui devient vrai, ce qui devient faux. Ce qu'il faut migrer. Ce qu'il faut surveiller.

## Alternatives considérées
1. Option A — pourquoi écartée.
2. Option B — pourquoi écartée.
```

ADRs à créer rétroactivement (l'historique mérite trace) :

- ADR-0001 — Adoption du nom MAAT et de la philosophie en 6 principes.
- ADR-0002 — Layering en 6 couches strict (cf. FRAMEWORK §1).
- ADR-0003 — Pillar 4 (pre-conditions) comme couche de défense centralisée.
- ADR-0004 — `governedProcedure` vs `auditedProcedure` (strangler pattern).
- ADR-0005 — Hash-chain immuable sur `IntentEmission`.
- ADR-0006 — Pillar 6 (cost gate) — création.
- ADR-0007 — Découplage `status` / `observationStatus`.
- ADR-0008 — Plugin sandboxing par type de side-effect.

---

## 8. Ce que MAAT *n'est pas*

Pour éviter les malentendus :

- **MAAT n'est pas un dieu**. C'est le **principe** que les Neteru servent. Le framework est nommé d'après le principe, pas un nouvel acteur.
- **MAAT n'est pas un produit**. C'est l'architecture interne de La Fusée. Le produit visible reste La Fusée + l'Oracle. MAAT ne s'expose au client final que via la marque ("OS gouverné par MAAT" peut figurer sur la landing en discrete claim technique, mais pas comme USP).
- **MAAT n'est pas immuable**. Les principes peuvent évoluer via ADR. Mais leur évolution est ritualisée (révision semestrielle), pas opportuniste.
- **MAAT n'est pas dogmatique sur la stack**. Next.js → Remix, Prisma → Drizzle, tRPC → quelque chose d'autre — le framework survit. Ce qui survit c'est le contrat (manifests, lifecycle Intent, hash-chain, NSP).
- **MAAT n'est pas un substitut au métier**. Le framework rend les bugs structurels impossibles. Les bugs métier (un Glory tool qui produit un mauvais brandbook) restent du ressort des invariants spécifiques.

---

## 9. La promesse

Si tu écris contre MAAT en respectant les six principes :

1. Ton code est *invisible mais lisible* — un autre dev/agent comprend l'intention sans décoder.
2. Ton ajout est *modulaire par identité* — un manifest, pas six fichiers.
3. Tes effets sont *traçables et réversibles* (quand le métier le permet).
4. Tes refus sont *premiers-citoyens* — refuser n'est pas échouer.
5. Ton système *grandit sans diluer* — la cosmologie reste fermée, les capabilities ouvertes.
6. Tu peux *partir un mois* — la CI tient le système, les rituels reprennent au retour.

Ce n'est pas un framework de plus. C'est *l'OS de La Fusée*.

---

## Lectures associées

- [FRAMEWORK.md](FRAMEWORK.md) — les 5 piliers techniques (Identity, Capability, Concurrency, Pre-conditions, Streaming).
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — le plan d'arrivée à cet état.
- [GITHUB-ACTIONS-GUIDE.md](GITHUB-ACTIONS-GUIDE.md) — la mécanisation par CI.
- [context/MEMORY.md](context/MEMORY.md) — index des décisions historiques.
- [adr/](adr/) — Architecture Decision Records (à venir).
- [LEXICON.md](LEXICON.md) — glossaire normatif (à venir).
