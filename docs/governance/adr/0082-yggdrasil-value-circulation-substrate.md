# ADR-0082 — Yggdrasil : substrat de circulation de la valeur, gouverné par Mestor

**Status** : Accepted
**Date** : 2026-05-15
**Phase** : 30 (Yggdrasil canonization — small, doc-first)
**Depends on** : ADR-0002 (layering cascade), ADR-0004 (hash-chain immutability), ADR-0025 (NSP SSE broker), ADR-0026 (MCP bidirectional), ADR-0059 (Brand Tree multi-archétype)
**Supersedes** : (none — net-new substrate canonization)

## Contexte

Le 2026-05-14 Alexandre a introduit verbalement deux concepts canon (Yggdrasil, Argos) absents du repo. Argos a été formalisé upstream 2026-05-15 (commits `82acd53` / `4f001a4` / `28dbb95`, Phase 22). **Yggdrasil restait sans définition canonique, sans gouverneur déclaré, sans ADR.**

Le risque concret : la circulation de la valeur dans le système (enrichissement de pilier, output Glory tool, drift sectoriel, cascade RTIS, snapshot calibration, transition `BrandAsset.state`, signal Tarsis, …) repose déjà sur plusieurs substrats — Intent bus (`mestor.emitIntent`), hash-chain `IntentEmission`, NSP SSE (Phase 16), `tenantScopedDb`, variable-bible, `BrandContextNode` tree, layering cascade — mais **personne ne porte la responsabilité de leur cohérence systémique**. Quand un Glory tool produit une valeur, rien ne garantit aujourd'hui qu'elle soit (a) traçable, (b) observable, (c) gouvernée — sauf par discipline humaine.

Par construction (NEFER §3.2 #3), tout concept verbal canonique doit être ADR-isé sous peine de drift narratif silencieux. Yggdrasil entre par cette ADR.

## Décision

### Définition canonique

**Yggdrasil = le substrat de circulation de la valeur dans La Fusée OS.** Il nomme la topologie par laquelle toute valeur produite à un point quelconque du système atteint tous les consommateurs qui en dépendent, dans le respect de trois invariants.

Yggdrasil **n'est pas un nouveau service ni un nouveau pipeline**. Il est l'**articulation nommée** des substrats existants (Intent bus + hash-chain + NSP + pillar cascade + RAG arborescent + isolation tenant + layering cascade) qui, ensemble, *constituent* la circulation.

Métaphore : Yggdrasil dans la mythologie norroise = l'arbre-monde qui relie les 9 royaumes. Dans La Fusée : la colonne vertébrale qui relie les 4 portails (Console / Cockpit / Crew / Intake) et les 7 Neteru.

### Les trois invariants Yggdrasil

Toute API qui propage de la valeur entre deux Neteru, ou entre un Neter et un portail, doit pouvoir répondre :

| Question | Surface canonique |
|---|---|
| **Q1 — Traçabilité.** Quel est l'`IntentEmission` ancêtre de cette valeur ? | `IntentEmission.id` (hash-chained, ADR-0004) |
| **Q2 — Observabilité.** Quel `NspEvent` ou `IntentEmission` a été émis quand cette valeur a circulé ? | NSP SSE event (ADR-0025) ou `IntentEmission.payload` |
| **Q3 — Gouvernance.** Quelle gate Mestor a validé la circulation ? | `services/mestor/gates/*` (pre-flight gate name) |

Si une circulation **ne peut pas** répondre aux trois questions, elle viole Yggdrasil — c'est le drift signal canonique pour la circulation de valeur, exactement comme le grep CODE-MAP négatif est le drift signal pour l'ajout d'entité (NEFER §3.2 #1).

### Yggdrasil n'est PAS un Neter

Substrat / protocole, comme NSP ou la layering cascade. **Cap APOGEE 7/7 préservé** — pas de 8ème gouverneur. `BRAINS` const (`src/server/governance/manifest.ts`) inchangé.

### Gouverneur : MESTOR

Mestor gouverne Yggdrasil parce qu'il gouverne déjà les trois primitives sur lesquelles Yggdrasil repose :

| Primitive Yggdrasil | Possession Mestor |
|---|---|
| Point d'entrée canonique | `mestor.emitIntent()` (NEFER §3.2 #2) |
| Pre-flight gates | `services/mestor/gates/*` |
| Journal hash-chainé | `IntentEmission` (ADR-0004) |

Sous-système APOGEE de rattachement : **Guidance** (§4.2 — *"ce qui dirige"*). Substantivement, Yggdrasil **est** le pilotage du flux de valeur. Même surface conceptuelle que Mestor.

**Alternatives écartées** :
- *Seshat* — observe la circulation (Q2), ne la dispatch pas. Contributeur, pas gouverneur.
- *Anubis* — gouverne NSP (sous-protocole de Yggdrasil) + Credentials Vault + MCP. Mais Anubis = transport (Comms §4.7), pas norme de flux.
- *NEFER* — n'est pas un Neter par construction (cf. PANTHEON.md §1).

### Seams de contribution des 6 autres Neteru

Yggdrasil étant cross-cutting, chaque Neter porte une responsabilité explicite :

| Neter | Contribution à Yggdrasil |
|---|---|
| **Mestor** (gouverneur) | Intent bus + gates + IntentEmission. Définit les invariants. |
| **Seshat** | Q2 observabilité — `NspEvent`, Tarsis signals, sector drift detection, Argos Hunter dossiers (ADR-0083). |
| **Anubis** | Sous-protocole NSP (SSE + Web Push + MCP) — canal temps-réel de Yggdrasil. |
| **Artemis** | `pillarBindings` sur chaque Glory tool — déclare où dans l'arbre une valeur est lue / écrite. |
| **Ptah** | Propagation des `BrandAsset.state` transitions — circulation matérielle des assets dans la vault. |
| **Imhotep** | Propagation de la filiation crew (member → team → tier) lors des promotions/démotions. |
| **Thot** | Q3-bis — chaque circulation coûte du fuel ; applique Loi 3 (Fuel conservation) sur les Intent émis. |

### Anti-doublon (table de discrimination)

| ≠ | Pourquoi |
|---|---|
| **NSP** (ADR-0025/0026) | Sous-protocole de Yggdrasil — canal temps-réel. Yggdrasil couvre aussi async hash-chained, batch RAG, cascade RTIS. |
| **Intent bus** (`mestor.emitIntent`) | Point d'entrée de la circulation. Yggdrasil = topologie complète (entrée + propagation + observation). |
| **Variable bible** (ADR-0023) | Canon des champs éditables (~300). Yggdrasil régit la circulation des valeurs, éditables ou dérivées. |
| **Layering cascade** (ADR-0002) | Discipline d'import au compile-time. Yggdrasil régit le flux de valeur au runtime. |
| **BrandContextNode tree** (ADR-0059) | Topologie d'héritage de contexte par archétype. Yggdrasil est plus large : circulation horizontale entre Neteru + tenants. |
| **`tenantScopedDb`** | Substrat d'isolation (default-deny). Yggdrasil est le substrat d'émission/réception dans cette isolation. |

## Conséquences

### Documentation propagée (NEFER §1 — 7 sources de vérité)

| Source | Mise à jour requise |
|---|---|
| **PANTHEON.md** | Nouvelle section "Substrats" listant Yggdrasil aux côtés de NSP + layering cascade. Cap 7/7 réaffirmé. |
| **LEXICON.md** | Entrée `YGGDRASIL` + cross-ref vers ADR-0082 ; entrée `Hunter` (cf. ADR-0083) ; mise à jour entrée `Argos`. |
| **CLAUDE.md** | Note brève section "Governance — NETERU" : "Yggdrasil = substrat de circulation, gouverné par Mestor ; cf. ADR-0082." |
| **APOGEE.md** | §4.2 (Guidance Mestor) — bullet ajouté : "Mestor gouverne aussi Yggdrasil, substrat de circulation de la valeur (ADR-0082)." |
| **CODE-MAP.md** | Auto-régénéré pre-commit — pas d'action manuelle nécessaire si aucune entité Prisma ajoutée (aucune ici). |
| **`BRAINS` const** | **Inchangé** — Yggdrasil n'est pas un Neter. |
| **`Governor` type** | **Inchangé** — Yggdrasil n'est pas un Neter. |

### Anti-drift test (livrable Phase 30 follow-up)

`tests/unit/governance/yggdrasil-three-invariants.test.ts` (mode soft baseline initial, durcissement HARD après 1 mois stress-test) — pour toute fonction qui propage de la valeur entre deux Neteru :

```ts
// Pseudo : la signature canonique doit accepter ou produire un IntentEmissionRef
type ValueCirculation<T> = {
  data: T;
  emission: IntentEmissionRef;       // Q1 traçabilité
  observability: NspEventKind | "intent-emission-only";  // Q2
  gateName: keyof MestorGates;       // Q3 gouvernance
};
```

Test à mettre en place dans une Phase 30 ultérieure — **hors scope de cette ADR** (ADR = canonization, test = implementation).

### Pas d'impact code immédiat

Cette ADR canonise un état existant. Le système circule déjà la valeur via les 7 substrats listés ; Yggdrasil leur donne un nom + des invariants. **Aucun service touché**, **aucun modèle Prisma ajouté**, **aucune migration**.

### Yggdrasil sort de la liste "ungouverné"

Avant 2026-05-15 : Argos + Yggdrasil = 2 concepts canon ungouvernés. Après :
- **Argos** gouverné par Seshat (Phase 22, ADR-0083 ce même jour).
- **Yggdrasil** gouverné par Mestor (cette ADR).

Plus aucun concept canon flottant. La doctrine NEFER §3.2 #3 (pas de drift narratif silencieux) est tenue.

## Lectures associées

- [ADR-0083](0083-argos-placement-seshat-yggdrasil-seam.md) — Argos placement dans Seshat et seam Yggdrasil
- [PANTHEON.md §7](../PANTHEON.md) — Substrats (Yggdrasil + NSP)
- [LEXICON.md](../LEXICON.md) — entrées `YGGDRASIL`, `Argos`, `Hunter`
- [APOGEE.md §4.2](../APOGEE.md) — Guidance / Mestor sub-system
- [ADR-0002](0002-layering-cascade.md) — layering cascade
- [ADR-0004](0004-hash-chained-intent-log.md) — hash-chain IntentEmission
- [ADR-0025](0025-notification-real-time-stack.md) — NSP SSE broker (sous-protocole de Yggdrasil)
