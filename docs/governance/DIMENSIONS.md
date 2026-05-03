# DIMENSIONS — les 4 axes temporels d'une Brand dans l'OS

L'OS modélise une marque selon **4 dimensions distinctes**. Elles ne sont pas redondantes ; elles répondent à 4 questions différentes. Cette doc lève l'ambiguïté soulevée dans [COMPLETION-AUDIT.md §5.1](COMPLETION-AUDIT.md).

À lire avant : [MISSION.md](MISSION.md), [APOGEE.md](APOGEE.md).

---

## Les 4 dimensions

| Dimension | Question répondue | Énumération | Source de vérité |
|---|---|---|---|
| **Lifecycle phase** | Où en est la relation UPgraders ↔ Brand ? | INTAKE / BOOT / OPERATING / GROWTH | `src/server/governance/strategy-phase.ts` (`getCurrentPhase`) |
| **Cultural palier** | Quelle position culturelle la marque occupe-t-elle dans la conscience publique ? | ZOMBIE / FRAGILE / ORDINAIRE / FORTE / CULTE / ICONE | `src/server/services/quick-intake/brand-level-evaluator.ts` + `src/server/services/advertis-scorer/semantic.ts` |
| **Mission step** | Sur quel mécanisme transformationnel la marque est-elle en train d'opérer ? | 1 Substance / 2 Engagement / 3 Accumulation / 4 Gravité / 5 Overton shift | [MISSION.md §3](MISSION.md) — manifest field `missionStep` (1-5) |
| **Oracle phase** | Quelle section du livrable conseil est en train de se rédiger ? | 1 ADVE Identity / 2 R+T Diagnostic / 3 I+S Recommendations / 4 Mesure & Superfan / 5 Operationnel | `src/server/services/strategy-presentation/types.ts` |

---

## Pourquoi 4 dimensions distinctes

### Ce qu'elles mesurent — comparaison

```
Lifecycle phase  : INTAKE → BOOT → OPERATING → GROWTH
                   └─ contractuel/opérationnel UPgraders. Bumped quand la
                      relation commerciale franchit un seuil.

Cultural palier  : ZOMBIE → FRAGILE → ... → ICONE
                   └─ position culturelle réelle de la marque, vue depuis
                      le marché. Bumped quand le score composite franchit
                      un seuil dérivé de cult-index + advertis-vector.

Mission step     : 1 Substance → 2 Engagement → ... → 5 Overton
                   └─ étape de transformation à laquelle TRAVAILLE la
                      capability courante. Tag du manifest, pas un état
                      stocké de la brand.

Oracle phase     : 1 Identity → 2 Diagnostic → ... → 5 Operationnel
                   └─ section rédactionnelle du livrable courant. Tag
                      des 21 sections d'Oracle.
```

Mêmes mots qui sonnent pareil mais SENS différents :

- "Phase 1" peut désigner soit l'étape de Lifecycle (INTAKE), soit la section d'Oracle (Identity), soit le step de Mission (Substance). **Toujours préfixer** : `lifecycle:INTAKE`, `oracle:Identity`, `mission:Substance` quand le contexte est ambigu.
- "Stage" est réservé à la **mécanique fusée** (3 stages : Booster A+D+V+E / Mid R+T / Upper I+S). Ne pas confondre avec Lifecycle phase.
- "Tier" est réservé au **Cultural palier** (ZOMBIE → ICONE). Ne pas confondre avec qualityTier (S/A/B/C des manifests Glory).

---

## Comment les dimensions s'articulent

Elles sont **partiellement orthogonales** mais avec corrélations.

### Corrélations attendues

- `lifecycle=INTAKE` ⇒ `palier ∈ {ZOMBIE, FRAGILE}` typiquement (la marque vient d'arriver).
- `lifecycle=GROWTH` ⇒ `palier ∈ {FORTE, CULTE, ICONE}` (la marque dans le système depuis longtemps).
- `mission_step=5 (Overton)` ⇒ `palier ∈ {CULTE, ICONE}` (seules les marques très avancées peuvent travailler le déplacement de fenêtre).
- `oracle_phase=5 (Operationnel)` peut intervenir à tout palier — c'est purement éditorial.

### Tableau croisé recommandé (partial)

| Lifecycle | Palier typique | Mission step en cours | Oracle phase active |
|---|---|---|---|
| INTAKE | ZOMBIE / FRAGILE | 1 Substance | 1 Identity |
| BOOT | FRAGILE / ORDINAIRE | 1-2 Substance/Engagement | 1-3 Identity/Diagnostic/Reco |
| OPERATING | ORDINAIRE / FORTE | 2-3 Engagement/Accumulation | 3-4 Reco/Mesure |
| GROWTH | FORTE / CULTE | 3-4 Accumulation/Gravité | 4-5 Mesure/Operationnel |
| GROWTH (avancée) | CULTE / ICONE | 5 Overton shift | 5 Operationnel + maintenance |

---

## Implications pour le code

### Manifests

Toute capability déclare son `missionStep` dans son manifest. La dimension Lifecycle n'est PAS dans les manifests — elle est dérivée à la volée par `strategy-phase.getCurrentPhase()` à partir de l'état des Pillars.

### Routers

Aucun router n'a besoin de connaître les 4 dimensions à la fois. Les routers consomment :
- `getCurrentPhase()` pour décider si la mutation est applicable au lifecycle (ex: `RUN_BOOT_SEQUENCE` exige `lifecycle=INTAKE` ou `lifecycle=BOOT`).
- `tier-evaluator.classify(score)` pour le palier.
- Le manifest `missionStep` pour tagger l'audit IntentEmission.

### UI

Cockpit affiche au founder :
- Lifecycle : badge en topbar ("BOOT — En orchestration")
- Palier : `<CascadeProgress>` avec les 6 paliers
- Mission step : implicite via les composants Neteru qui rendent l'étape courante (ex: `<OvertonRadar>` n'apparaît qu'à step 4-5)
- Oracle phase : tabs dans `<OracleEnrichmentTracker>`

### Recherche / filtres

Une page `/console/strategy-portfolio/brands` peut filtrer sur n'importe laquelle des 4 dimensions indépendamment. Exemples :
- "Brands en lifecycle:GROWTH ET palier<CULTE" → brands stagnantes
- "Brands en mission_step=5 ET oracle_phase<5" → le livrable Oracle n'a pas encore documenté l'Overton shift (à mettre à jour via `/console/oracle/compilation`)

---

## Anti-confusion

Si tu lis "phase" sans contexte clair, **demande lequel**. Le LEXICON ([LEXICON.md](LEXICON.md)) impose le préfixage dans toute nouvelle doc.

Si tu écris du code qui touche à une de ces dimensions, **utilise les types officiels** :

```ts
import type { StrategyLifecyclePhase } from "@/server/services/mestor/intents";  // INTAKE | BOOT | OPERATING | GROWTH
import type { BrandLevel } from "@/server/services/quick-intake/brand-level-evaluator";  // ZOMBIE | FRAGILE | ... | ICONE
// missionStep: 1 | 2 | 3 | 4 | 5 — typé directement dans NeteruManifest.Capability
// Oracle phase : implicite dans les section keys "01-..." à "21-..."
```

---

## Ce qui reste à faire (pour clore complètement la dérive 5.1)

- [ ] Ajouter une colonne `Mission step` dans PAGE-MAP.md, SERVICE-MAP.md, ROUTER-MAP.md (cf. drift 2 de MISSION.md §5)
- [ ] Créer un script `scripts/cross-dim-report.ts` qui génère un rapport "brands × 4 dimensions" pour le Console operator
- [ ] Page `/console/governance/dimensions` qui rend ce rapport en UI
