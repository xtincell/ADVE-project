# ADR-0050 — Output-first deliverable composition

**Date** : 2026-05-04
**Statut** : Accepted
**Phase** : 17 (Deliverable Forge)
**Auteur direction** : opérateur (user)

> **Note de renumérotation (2026-05-05)** : ADR enregistré initialement sous 0037 (commit ae7843a 2026-05-04 22:49) alors qu'un autre ADR avait déjà revendiqué ce numéro le même jour ([ADR-0037 Country-Scoped Knowledge Base](0037-country-scoped-knowledge-base.md), commit 4ce7677 2026-05-04 11:55). Conflit d'agents parallèles. Renuméroté 0037→0050 en suivant la règle chronologique (first-come keep) — pattern Phase 18 (cf. ADR-0048/0049). Toutes les références CLAUDE.md, CHANGELOG.md, REFONTE-PLAN.md, ROUTER-MAP.md, PAGE-MAP.md, SERVICE-MAP.md, LEXICON.md, ADR-0051 ont été mises à jour dans le commit de renumérotation. Compatibility alias historique : "ADR-0037 (output-first deliverable composition)" === ADR-0050.

## Contexte

Aujourd'hui le repo expose deux surfaces qui produisent des `BrandAsset` :

1. **Cockpit `/cockpit/operate/briefs`** — création/listing flat de briefs (`BrandAsset.kind=CREATIVE_BRIEF`). Le founder doit savoir *quel brief* il veut avant de cliquer.
2. **Console `/console/artemis/tools` + `/console/artemis/skill-tree`** — catalogue Glory tools + séquences. Surface **input-first** : opérateur choisit un outil (`creative-brief`, `kv-art-direction-brief`…) puis l'outil tombe en cascade vers Ptah si `forgeOutput` est déclaré.

**Cascade canonique existante** ([ADR-0009](0009-neter-ptah-forge.md), [ADR-0012](0012-brand-vault-superassets.md), [ADR-0048](0048-glory-tools-as-primary-api-surface.md) — anciennement ADR-0028) :

```
Glory tool (brief intellectuel)
  → BrandAsset.kind=CREATIVE_BRIEF / KV_PROMPT / ...
    → mestor.emitIntent(PTAH_MATERIALIZE_BRIEF)
      → AssetVersion (forge brut)
        → BrandAsset matériel promu (kind=KV / VIDEO_AD / ...)
```

**Friction observée** : le founder ne pense pas en briefs intermédiaires. Il pense en livrable cible — *"je veux un KV pour Black Friday"*, *"je veux un manifesto vidéo"*, *"je veux un sales deck"*. Le flow input-first lui demande de connaître la chaîne upstream (quels briefs sont nécessaires, dans quel ordre, lesquels existent déjà dans son vault) — ce qui est justement le travail que l'OS devrait faire pour lui.

**Drift identifié** : sans correction, la surface productive reste réservée à l'opérateur UPgraders (Console). Le Cockpit founder reste cantonné à la consultation (`/cockpit/brand/deliverables`) et à la création de briefs flat (`/cockpit/operate/briefs`). La cascade canonique est puissante mais inaccessible au founder. **Drift de mission** : le founder ne déclenche pas lui-même les productions qui accumulent ses superfans.

## Décision

**Inverser le point d'entrée** côté Cockpit : exposer une surface **output-first** où le founder pointe le `BrandAsset.kind` matériel cible et l'OS résout en arrière la cascade complète (briefs requis, vault scan, forges Ptah enchaînés).

### Schéma cible

```
Étape 0 — Founder pointe le livrable matériel cible
  └─ kind ∈ {KV_POSTER, VIDEO_AD, MANIFESTO_VIDEO, SALES_DECK, ...}

Étape 1 — Resolver remonte le DAG des briefs requis
  └─ Lit GloryTool.forgeOutput.requires?: BrandAssetKind[] (champ neuf)
  └─ Construit graph topologique : {target_kind ← brief_kinds[] ← ... ← root_pillars}

Étape 2 — Vault matcher (par strategyId tenant-scoped)
  └─ Pour chaque brief_kind requis :
       • ACTIVE & non-stale  → réutilisé (lien lecture seule)
       • ACTIVE & staleAt<now → proposé "Rafraîchir"
       • absent              → proposé "Générer"

Étape 3 — Composition validée + Loi 3 cost gate
  └─ Total estimé = somme(LLM Glory tools manquants) + somme(Ptah forges)
  └─ Modale confirmation : "Lancer la production pour $X" ?

Étape 4 — Composer dispatch GlorySequence ad-hoc
  └─ Construit runtime une GlorySequence (pas persistée canonique)
  └─ Délègue à sequence-executor existant (ADR-0048 — anciennement ADR-0028)
  └─ Streaming NSP par étape (chaque BrandAsset commit visible)

Étape 5 — Sortie : grappe BrandAssets liée par parentBrandAssetId
  └─ Le livrable cible (matériel)
  └─ + tous les briefs intermédiaires créés (capitalisés vault)
```

### Surfaces structurelles

| Surface | Création | Pattern |
|---|---|---|
| Service | `src/server/services/deliverable-orchestrator/` | manifest governor=`artemis`, missionContribution=`CHAIN_VIA:artemis` |
| Router tRPC | `src/server/trpc/routers/deliverable-orchestrator.ts` | 3 procedures : `resolveRequirements` (sync), `compose` (async), `getProgress` (NSP subscribe) |
| Page UI | `src/app/(cockpit)/cockpit/operate/forge/page.tsx` | Wizard 4 étapes (target / requirements / vault diff / progress) |
| Intent kind | `COMPOSE_DELIVERABLE` | sync resolver + delegate vers composer |
| Field GloryTool | `forgeOutput.requires?: BrandAssetKind[]` | déclare upstream attendu — extension non-breaking |

### Cap APOGEE

**7/7 préservé** ([ADR-0019](0019-imhotep-full-activation.md), [ADR-0020](0020-anubis-full-activation.md)) :
- Pas de nouveau Neter (Artemis est governor, le service est un sous-composant Propulsion comme `brief-ingest`)
- Pas de nouvelle Capability primaire — `COMPOSE_DELIVERABLE` est un **dispatcher** qui ré-utilise `INVOKE_GLORY_TOOL` + `PTAH_MATERIALIZE_BRIEF` + `PROMOTE_BRAND_ASSET_TO_ACTIVE` existants.
- Pas de nouveau modèle Prisma — `BrandAsset.parentBrandAssetId` (existant) suffit pour le lineage de la grappe.

### Trois Lois APOGEE

1. **Loi 1 — altitude** : neutre. Chaque BrandAsset produit est nouveau (pas d'écrasement silencieux). Si un brief ACTIVE est ré-utilisé, il reste ACTIVE — la nouvelle grappe matérielle est un enfant, pas un remplaçant.
2. **Loi 2 — séquencement** : **gate critique**. Le resolver refuse `MISSING_PRECONDITION_PILLAR` si la marque n'a pas de `Strategy.manipulationMix.primary` validé OU aucun pilier ADVE en état ACTIVE. Redirige UI vers `/cockpit/brand/proposition`.
3. **Loi 3 — fuel** : Thot pre-flight `CHECK_CAPACITY` avant `compose()`. Le total estimé inclut la somme des Glory tools LLM manquants (briefs) + somme des Ptah forges déclenchés. Confirmation user obligatoire avec total affiché.

### Cinq Piliers FRAMEWORK

1. **Identity** — un seul nouveau Intent : `COMPOSE_DELIVERABLE` (sync handler dans `mestor.emitIntent`)
2. **Capability** — manifest `deliverable-orchestrator` déclare `governor: "artemis"`, `acceptsIntents: ["COMPOSE_DELIVERABLE"]`, `missionContribution: "CHAIN_VIA:artemis"`
3. **Concurrency** — `tenantScopedDb` strict ; vault-matcher filtre toutes les requêtes par `strategyId` du contexte courant
4. **Pre-conditions** — `governedProcedure` + `applyManipulationCoherenceGate` + `applyPillarCoherenceGate` (les deux gates existent déjà)
5. **Streaming** — NSP obligatoire ; resolver = sync (preview DAG), composer = async streamé étape par étape

### Champ `GloryTool.forgeOutput.requires`

**Type** : `requires?: readonly BrandAssetKind[]`

Sémantique : déclare *les BrandAsset.kind upstream que ce Glory tool consomme*. Le resolver lit ce champ pour construire le DAG inversé.

Exemples (à remplir par sous-PR commit 1) :
- `kv-banana-prompt-generator.requires = ["KV_ART_DIRECTION_BRIEF", "BIG_IDEA"]`
- `video-script-generator.requires = ["BIG_IDEA", "MANIFESTO"]`
- `creative-brief.requires = ["BIG_IDEA"]` (un brief créatif suppose une big idea ACTIVE)
- `kv-art-direction-brief.requires = ["BIG_IDEA", "MOOD_BOARD"]`
- `casting-brief-generator.requires = ["CREATIVE_BRIEF"]`

Validateur DAG dans le resolver : refuse les cycles (A `requires` B et B `requires` A) avec erreur structurée `RESOLVER_CYCLE_DETECTED`.

## Conséquences

### Positives

- **Capital cumulatif** : chaque exécution enrichit le vault. La 2ème production réutilise les briefs intellectuels de la 1ère (manifesto, big idea, mood board ACTIVE).
- **Friction founder réduite** : le founder ne pense plus en chaîne, il pense en résultat.
- **Lineage automatique** : `parentBrandAssetId` câblé par le composer — visible en arbre dans `/cockpit/brand/deliverables/[key]`.
- **Réutilise existant** : sequence-executor, mestor, Glory tools, Ptah providers, Credentials Vault — aucun re-codage.
- **Rétrocompatible** : le champ `requires` est optionnel (`?:`). Tools sans `requires` restent invocables individuellement comme avant.

### Négatives / risques

- **Travail one-shot** de remplissage `requires` sur les ~18 Glory tools `brief→forge` existants. Sans ce remplissage, le resolver ignore la chaîne upstream pour ces tools.
- **DAG runtime** non persisté — il est reconstruit à chaque `resolveRequirements`. Acceptable (sub-ms) mais pas cacheable trivialement. Si performance pose problème : cache mémoire avec invalidation sur changement registry.
- **Coût visible explosif** : un single click peut afficher $50–200 (5 briefs + 4 forges Magnific). UI doit présenter le total **lisiblement** sinon abandon panier.
- **Erreur partielle** : si un brief intermédiaire échoue, la grappe reste partielle. Le composer doit committer les BrandAssets DRAFT (pas ACTIVE) jusqu'à validation utilisateur de toute la grappe — sinon vault pollué.

### Pas de drift

- N'introduit pas de nouveau "livrable canon" (Oracle reste un kind parmi N — ADR-0024).
- N'éditorialise pas RTIS (les piliers RTIS restent dérivés via Intents `ENRICH_*` — ADR-0023).
- Ne bypasse pas mestor (toutes mutations passent par `COMPOSE_DELIVERABLE` puis ré-emission interne des Intents existants).

## Alternatives écartées

### A1 — Étendre `/cockpit/operate/briefs` avec un toggle "Forger directement"

**Rejeté** : enrichit une surface flat list avec un wizard caché. Perd la lisibilité founder (il pense livrable, pas brief). Ne résout pas le vault matching.

### A2 — Wizard sur `/console/artemis/skill-tree` (séquences existantes)

**Rejeté** : skill-tree affiche les séquences **persistées canoniques**. Le composer construit des `GlorySequence` runtime ad-hoc dépendant du vault — différent du modèle persisté. Mélanger = drift.

### A3 — Persister les `GlorySequence` ad-hoc dans schema.prisma

**Rejeté** : pollue la table avec des séquences éphémères one-shot. Le runtime suffit ; le lineage `parentBrandAssetId` capte ce qui doit être tracé.

### A4 — Page `/cockpit/forges` listée dans PAGE-MAP comme "à créer"

**Rejeté** : PAGE-MAP §3 mentionne explicitement que `/cockpit/forges` doublait `/cockpit/operate/*` (cf. [ADR-0024](0024-console-oracle-namespace-cleanup.md)). On choisit `/cockpit/operate/forge` pour rester dans le namespace `operate` (acte de production), distinct de `/cockpit/brand/*` (consultation vault).

## ADRs liés

- [ADR-0009](0009-neter-ptah-forge.md) — Ptah forge, source de `PTAH_MATERIALIZE_BRIEF` réutilisé tel quel
- [ADR-0012](0012-brand-vault-superassets.md) — `BrandAsset` réceptacle unifié, kinds matériels + intellectuels
- [ADR-0023](0023-operator-amend-pillar.md) — ADVE éditable, RTIS dérivés ; le composer respecte le scope (lecture seule des piliers)
- [ADR-0024](0024-console-oracle-namespace-cleanup.md) — Namespace cockpit (justifie placement `/cockpit/operate/forge`)
- [ADR-0048](0048-glory-tools-as-primary-api-surface.md) (anciennement ADR-0028) — Glory tools = surface API primaire ; le composer s'appuie sur cette canonisation
- [ADR-0049](0049-brief-mandatory-gate.md) (anciennement ADR-0034) — Brief gate ; le composer respecte le gate pour les briefs créés en cours de cascade

## Notes implémentation

Découpage en 6 commits atomiques (chaque commit ship CI verte) :

| # | Commit | Scope |
|---|---|---|
| 1 | `feat(glory-registry): forgeOutput.requires field + 18 tools filled` | Extension type + remplissage BrandAssetKind upstream |
| 2 | `feat(intent): COMPOSE_DELIVERABLE kind + SLO + handler delegate` | Mestor + slos + intent-kinds |
| 3 | `feat(deliverable-orchestrator): service resolver + vault-matcher + composer` | Service complet + tests unit |
| 4 | `feat(trpc): deliverable-orchestrator router 3 procedures` | resolveRequirements / compose / getProgress + tests |
| 5 | `feat(cockpit): /cockpit/operate/forge page + components + NSP wiring` | UI 4 étapes |
| 6 | `docs(governance): ADR-0050 propagation` (anciennement ADR-0037) | Update PAGE-MAP, SERVICE-MAP, ROUTER-MAP, LEXICON, CLAUDE.md (Phase 17), REFONTE-PLAN, CHANGELOG |

**SLO suggéré** : `COMPOSE_DELIVERABLE` p95 = 60s (DAG resolve sync ~1s + N briefs LLM async streamés ~10–40s + M forges Ptah async ~variable). Le SLO mesure le **dispatch initial**, pas la complétion totale (qui dépend des forges Ptah eux-mêmes monitorés par leur propre SLO).

**Tests anti-drift** :
- `tests/unit/services/deliverable-orchestrator/resolver.test.ts` — DAG topologique deterministe, détection cycle
- `tests/unit/services/deliverable-orchestrator/vault-matcher.test.ts` — match ACTIVE only, exclude staleAt, tenant isolation
- `tests/integration/deliverable-orchestrator.test.ts` — full e2e mock Ptah + assert lineage `parentBrandAssetId`

**Migration data** : aucune. Champ `requires` optionnel, BrandAsset schema inchangé.
