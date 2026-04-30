# ADR-0009 — Ptah, 5ème Neter (Forge — matérialisation des briefs Artemis)

**Date** : 2026-04-30
**Statut** : accepted
**Phase de refonte** : phase/9-ptah

## Contexte

L'Industry OS La Fusée gouverne aujourd'hui la cascade ADVE→RTIS via 4 Neteru (Mestor / Artemis / Seshat / Thot). Cette cascade produit des **briefs et concepts texte** via les Glory tools d'Artemis, mais **aucun service backend ne matérialise ces briefs en assets concrets** (image, vidéo, audio, icône, design layered). C'est un gap de capacité core mission : la fusée n'a pas de fonderie. Les KV / spots / packshots / posts sont produits manuellement hors-OS, sans gouvernance d'Intent, sans cost gate, sans hash-chain audit, sans mesure d'impact via Seshat.

Trois forces poussent à formaliser un Neter dédié :
1. **L'API Magnific** (ex-Freepik) couvre 95% du gap multimodal (39+ modèles image, 15+ modèles vidéo, audio complet, MCP remote, 250M+ stock). Plus Adobe Firefly Services + Figma + Canva pour la finition design. Surface massive qui mérite un point unique de gouvernance.
2. **Plafond 7 Neteru** ([APOGEE §9](../APOGEE.md)) — 3 slots disponibles. Mythologie cohérente exigée. Fonction distincte exigée.
3. **Loi 2 d'APOGEE** (séquencement étages) — la matérialisation est *en aval* du brief, pas concurrente. Pas de co-gouvernance, mais séquence stricte Glory→Brief→Forge.

## Décision

**Introduire Ptah comme 5ème Neter actif**, dans le sous-système Propulsion, **séquentiellement downstream d'Artemis** (séquence stricte, pas co-gouvernance).

### Délimitation des fonctions

- **Artemis** continue de produire les **briefs et assets rédactionnels** via Glory tools (concept-generator, kv-prompt, video-script-generator, brand-bible-extractor, naming-tool, copy-tool, etc.). Output Artemis = textes structurés.
- **Ptah** consomme les briefs Artemis qui contiennent un `forgeSpec` et **matérialise** en assets concrets via providers externes (Magnific, Adobe Firefly, Figma, Canva).

Cascade : `Mestor décide → Artemis produit le brief → Ptah matérialise → Seshat observe → Thot facture`.

### Mythologie

**Ptah** = démiurge égyptien créateur du monde par le verbe (Memphite Theology). Patron des artisans, sculpteurs, architectes, fondeurs. Métaphore directe `prompt → asset`. Cohérent avec le panthéon égyptien dominant (Seshat, Thot).

Alternatives évaluées et rejetées :
- *Hephaistos* — équivalent fonctionnel grec, mais double-emploi du registre déjà occupé par Artemis.
- *Khnoum* — potier qui modèle les corps. Trop spécifique au vivant, ne couvre pas l'audio/vidéo/icônes.
- *Heka* — magie créatrice. Trop abstrait, perd la métaphore artisan.
- *Garder Ptah comme simple sous-service d'Artemis* — sous-dimensionne la fonction. Notoria/Jehuty sont des services gouvernés ; Ptah a la masse d'un Neter (10+ modèles image, 15+ vidéo, audio, design tools, stock 250M+).

### Position dans APOGEE

APOGEE conserve ses **8 sous-systèmes** (4 Mission + 4 Ground). Ptah s'inscrit dans **Propulsion** (Mission Tier) en tant que phase aval d'Artemis. Pas de nouveau sous-système.

[APOGEE §4.1](../APOGEE.md) gagne une ligne dans le tableau Propulsion :
> **Forge Ptah** — Phase de matérialisation downstream Artemis. Consomme les ForgeBrief Artemis et produit les assets concrets via providers externes.

### Plafond Neteru

Avec Ptah, le panthéon passe à **5 Neteru actifs / 7** (plafond APOGEE atteint avec les pré-réservations Imhotep+Anubis dans ADR-0010 et ADR-0011). Plafond respecté.

### Manifest

Ptah est exposé comme service `src/server/services/ptah/` avec un `manifest.ts` :

```typescript
{
  service: "ptah",
  governor: "MESTOR",        // dispatcher unique reste Mestor
  acceptsIntents: ["PTAH_MATERIALIZE_BRIEF", "PTAH_RECONCILE_TASK"],
  emits: ["ASSET_FORGED", "ASSET_REFINED", "ASSET_CLASSIFIED", "FORGE_TASK_FAILED"],
  capabilities: [/* materializeBrief, reconcileTask */],
  dependencies: ["ai-cost-tracker", "financial-brain", "oauth-integrations", "artemis"],
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 2,
}
```

`BRAINS` const ([src/server/governance/manifest.ts:23-29](../../../src/server/governance/manifest.ts)) étendu à `[..., "PTAH", ...]` pour autoriser de futurs sub-services Ptah auto-gouvernés.

### Database schema

Nouveaux modèles Prisma :
- `GenerativeTask` (intentId, sourceIntentId, operatorId, strategyId, forgeKind, provider, providerModel, status, parameters, resultUrls, expiresAt 12h Magnific, costs, manipulationMode, pillarSource, expectedSuperfans, realisedSuperfans, …)
- `AssetVersion` (chaîne parent→upscale→relight, cdnUrl, dimensions, cultIndexDeltaObserved, …)
- `ForgeProviderHealth` (circuit breaker state per-provider)

### Providers (4 dès Phase 1)

| Provider | Auth | Surface | Statut Phase 1 |
|---|---|---|---|
| **Magnific** | API key (`x-freepik-api-key`) | génération image/vidéo/audio/icônes, édition (upscale/relight/style/inpaint/outpaint/change-camera/bg-removal), stock 250M+, classifier | actif |
| **Adobe Firefly Services** | OAuth 2.0 server-to-server | Photoshop API (compositing), Lightroom API (color), Illustrator API (vector), Firefly text-to-image/vector | actif |
| **Figma** | PAT ou OAuth | REST API (read mockups, write Variables) + Plugin API | actif |
| **Canva** | OAuth 2.0 + partnership | Connect API (templates branded, brand kit sync) | gated par flag `CANVA_ENABLED=false` (onboarding 2-6 sem) |

Plugin sandboxing ([ADR-0008](0008-plugin-sandboxing.md)) appliqué : chaque provider déclare `sideEffects: ["EXTERNAL_API", "DB_WRITE"]`, `externalDomains[]` whitelist, `tablesAccessed: ["GenerativeTask", "AssetVersion"]`.

### Téléologie — comment Ptah sert l'apogée

Ptah n'est pas un *forgeur de fichiers*, c'est un *forgeur de superfans*. Trois ancrages obligatoires :

1. **`GenerativeTask.pillarSource: PillarKey`** non-null. Chaque asset traçable à un pillar A/D/V/E/R/T/I/S qui le justifie. Refus à création si absent.
2. **Boucle Seshat post-déploiement** — `ASSET_FORGED` event déclenche un cron `seshat/asset-impact-tracker.ts` qui mesure engagement, viralité, conversions superfans → calcule `cultIndexDeltaObserved`. Sans ça, Ptah forge dans le vide.
3. **Pre-flight `superfan_potential` bayesien** — Thot estime `expectedSuperfans` via prior bayesien (historique forges similaires + benchmark sectoriel + manipulation mode). Veto si `cost_per_potential_superfan > seuil sectoriel`.

### Manipulation Matrix

Ptah implémente le paramètre transverse [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md) :
- `GenerativeTask.manipulationMode: "peddler" | "dealer" | "facilitator" | "entertainer"`
- Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse si mode hors `Strategy.manipulationMix`
- Comportement Ptah documenté par mode (cf. [PANTHEON.md §2.5](../PANTHEON.md))

### Sentinel Intent (Loi 4 — régime apogée)

Phase H : `PTAH_REGENERATE_FADING_ASSET` câblé. Cron mensuel par brand ICONE — Seshat détecte assets dont engagement a chuté >30% vs peak ; Mestor déclenche régénération via Ptah avec brief mis à jour.

## Conséquences

### Positives

- **Couverture multimodale complète** — image/vidéo/audio/icône/design/stock/classifier sous une seule gouvernance.
- **Cost gate strict** — chaque forge passe par Thot pre-flight + ai-cost-tracker post-fact.
- **Lineage traçable** — chaîne `INVOKE_GLORY_TOOL → PTAH_MATERIALIZE_BRIEF → PTAH_RECONCILE_TASK` hash-chained par strategyId.
- **MCP wrapper** Phase K — Ptah expose ses capabilities en MCP server, agents externes consomment sans bypass governance.
- **Fonderie disponible pour Sentinel Intents** — MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT_SECTOR peuvent maintenant déclencher des régénérations d'assets.

### Négatives

- **4 providers à maintenir dès Phase 1** — multiplie API keys, OAuth flows, rate limit monitoring. Mitigation : interface `ForgeProvider` unifiée.
- **URLs Magnific 12h** — fenêtre étroite pour download vers CDN. Mitigation : cron `expiresAt < NOW + 1h` + reconciliation webhook immédiate.
- **Onboarding Canva** — 2-6 semaines partnership review. Mitigation : flag `CANVA_ENABLED=false`, code shippé sans activation.
- **Glory tools à classifier** — ~91 manifests existants. Mitigation : algorithmique via field `forgeOutput?: ForgeSpec` (script audit ajoute selon type de livrable).

### Drift signal Ptah

Cron `audit-ptah-precision.ts` flagge si `realisedSuperfans` < 10% de `expectedSuperfans` agrégé sur 30 jours — Ptah hallucine son potentiel. Si drift confirmé, recalibrage des priors bayesiens dans `financial-brain/manipulation-roi-tables.ts`.

## Alternatives considérées

1. **Pas de Neter — service simple** sous Artemis (analogue Notoria) : sous-dimensionne. Notoria/Jehuty sont mono-fonction. Ptah orchestre 4 providers et 9 forgeKinds — masse d'un Neter.
2. **Étendre APOGEE à 5 sous-systèmes (nouveau "Forge")** : cassant. APOGEE§4 détaillé sur 4 Mission + 4 Ground stable. Pas de bénéfice à le casser.
3. **Co-gouvernance Artemis+Ptah dans Propulsion** (entité égale, pas séquentielle) : viole Loi 2 (séquencement). Le brief précède la matérialisation, ce n'est pas concurrent.
4. **Branchement direct du MCP Magnific** : bypass total de Ptah/Mestor/Thot. Pas de cost tracking, pas de hash-chain. Rejeté.

## Lectures

- [PANTHEON.md](../PANTHEON.md) §2.5 — fonction Ptah, contribution mesurable, drift signal
- [APOGEE.md §4.1](../APOGEE.md) — Propulsion (Artemis + Ptah)
- [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md) — comportement Ptah par mode
- [ADR-0008](0008-plugin-sandboxing.md) — plugin sandboxing appliqué aux providers Magnific/Adobe/Figma/Canva
- [ADR-0010](0010-neter-imhotep-crew.md) — pré-réservation Imhotep (slot 6)
- [ADR-0011](0011-neter-anubis-comms.md) — pré-réservation Anubis (slot 7)
