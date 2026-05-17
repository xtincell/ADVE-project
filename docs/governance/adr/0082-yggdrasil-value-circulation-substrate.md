# ADR-0082 — Yggdrasil : substrat de circulation de la valeur, ungoverned

**Status** : Accepted (originally 2026-05-15) · **Amended 2026-05-16** post-STATE_FINAL_BLUEPRINT canon
**Date** : 2026-05-15 · **Amendment** : 2026-05-16
**Phase** : 30 (Yggdrasil canonization — small, doc-first) · **Amendment phase** : 23 (post-blueprint alignment, cf. [sprint-change-proposal-2026-05-16.md](../../../_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md))
**Depends on** : ADR-0002 (layering cascade), ADR-0004 (hash-chain immutability), ADR-0025 (NSP SSE broker), ADR-0026 (MCP bidirectional), ADR-0059 (Brand Tree multi-archétype)
**Supersedes** : (none — net-new substrate canonization)
**Amends** : self — §"Gouverneur: MESTOR" replaced with §"Mestor possède les gates, pas le substrat" per STATE_FINAL_BLUEPRINT §5.2 doctrinal correction

> **AMENDMENT 2026-05-16** — [STATE_FINAL_BLUEPRINT §5.2](../STATE_FINAL_BLUEPRINT.md) + §21.3 (drift D-4.1) corrige cette ADR sur un point doctrinalement structurant : **Yggdrasil n'est gouverné par AUCUN Neter** — c'est un substrat organique (comme NSP, comme la layering cascade). Mestor possède les **gates** (= valves) qui filtrent ce qui traverse Yggdrasil, mais Yggdrasil lui-même reste **ungouverné**. La distinction est doctrinalement structurante : Yggdrasil *transporte* la valeur ; les gates Mestor *décident* ce qui peut entrer. **Substrat ≠ governor.** Le titre, les sections §"Yggdrasil n'est PAS un Neter" et §"Gouverneur: MESTOR", ainsi que la table "Documentation propagée" sont amendés. Les trois invariants Q1/Q2/Q3, les 6 seams Neteru, et la définition canonique restent inchangés.

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

### Yggdrasil n'est PAS un Neter, et n'a PAS de gouverneur Neter

*(Amended 2026-05-16 per STATE_FINAL_BLUEPRINT §5.2.)*

Substrat / protocole organique, comme NSP ou la layering cascade. **Cap APOGEE 7/7 préservé** — pas de 8ème gouverneur. `BRAINS` const (`src/server/governance/manifest.ts`) inchangé. Yggdrasil n'apparaît dans aucun `Governor` type, dans aucun manifest `acceptsIntents`, dans aucune table `BRAINS`. C'est un fait d'architecture, pas une omission.

### Les gates Yggdrasil appartiennent à Mestor (pas le substrat lui-même)

*(Amended 2026-05-16 — section originale "Gouverneur: MESTOR" remplacée.)*

Mestor possède les **valves** qui filtrent ce qui traverse Yggdrasil — pas Yggdrasil. La distinction structurelle :

| Couche | Propriétaire | Nature |
|---|---|---|
| **Substrat Yggdrasil** | Aucun Neter | Topologie organique. Transporte la valeur. Ne décide pas. |
| **Point d'entrée canonique** | Mestor | `mestor.emitIntent()` — la porte d'entrée. |
| **Pre-flight gates** | Mestor | `services/mestor/gates/*` — les valves filtrant ce qui peut traverser. |
| **Journal hash-chainé** | Mestor | `IntentEmission` (ADR-0004) — la trace de ce qui a traversé. |

Sous-système APOGEE de rattachement des **gates** : **Guidance** (§4.2 — *"ce qui dirige"*). Mais Yggdrasil substrate elle-même est cross-cutting, hors sous-système. Substantivement, Yggdrasil **est** la topologie de circulation de la valeur ; les gates Mestor **filtrent** ce qui peut y entrer. La distinction n'est pas cosmétique — elle empêche le contre-sens "Mestor *contrôle* la circulation" (faux : Mestor contrôle uniquement *l'entrée* dans la circulation ; une fois qu'une valeur est entrée, Yggdrasil la transporte de manière organique selon la topologie substrate).

**Alternatives écartées (pour le rôle de "propriétaire des gates", pas du substrat)** :
- *Seshat* — observe la circulation (Q2), ne la dispatch pas. Contributeur, pas owner gates.
- *Anubis* — gouverne NSP (sous-protocole temps-réel de Yggdrasil) + Credentials Vault + MCP. Anubis = transport (Comms §4.7), pas norme de flux d'entrée.
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
| **CLAUDE.md** | Note brève section "Governance — NETERU" : "Yggdrasil = substrat **ungouverné** de circulation de la valeur ; les **gates** Yggdrasil appartiennent à Mestor ; cf. ADR-0082 amendée 2026-05-16." |
| **APOGEE.md** | §4.2 (Guidance Mestor) — bullet ajouté : "Mestor possède les **gates** qui filtrent l'entrée dans Yggdrasil, substrat ungouverné de circulation de la valeur (ADR-0082 amendée 2026-05-16)." |
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
