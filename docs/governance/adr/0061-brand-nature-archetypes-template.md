# ADR-0061 — `BRAND_NATURE_ARCHETYPES` — cascade hiérarchique par BrandNature

> **Note de renumérotation (2026-05-06)** : ce document a été créé sous le numéro ADR-0054 sur la branche Phase 18 (`claude/pensive-keller-6afb14`) puis renuméroté **ADR-0061** lors du merge avec Phase 19 (collision de numéro avec le placeholder phantom ADR-0054 (superfan-attribution-model) Phase 19). Cf. [ADR-0059 §note](0059-brand-tree-multi-archetype.md) pour le contexte.

**Status** : Accepted (PRODUCT operable Phase 18-A0 ; 8 autres natures Phase 18-bis)
**Date** : 2026-05-06
**Phase** : 18 — Matanga × FrieslandCampina × Brand Tree
**Supersedes** : aucun
**Related** : [ADR-0059](0059-brand-tree-multi-archetype.md) (Brand Tree — l'enum `BrandNature` est défini ici), [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md), [ADR-0048](0048-glory-tools-as-primary-api-surface.md) (Glory tools applicables par nature)

---

## Contexte

Le repo expose déjà l'enum `BrandNature` dans [CODE-MAP.md §214](../CODE-MAP.md) et dans [src/lib/types/](../../../src/lib/types/) :

```
BrandNature : PRODUCT | SERVICE | CHARACTER_IP | FESTIVAL_IP | MEDIA_IP | RETAIL_SPACE | PLATFORM | INSTITUTION | PERSONAL
```

Mais cette enum n'a **aucune sémantique structurelle** rattachée. Elle est utilisée comme tag descriptif sur `Strategy.brandNature`, sans implication sur :
- La cascade hiérarchique typique (un FESTIVAL_IP ne descend pas vers des SKUs comme un PRODUCT FMCG — il descend vers des éditions, scènes, activations)
- Les Glory tools applicables (un brief packaging n'a pas de sens pour un FESTIVAL_IP ; un brief lineup n'a pas de sens pour un PRODUCT)
- Les variables Bible pertinentes (`shelf-share-target` n'a de sens que pour PRODUCT ; `venue-capacity` que pour FESTIVAL_IP)
- Les KPIs business (Cult Index a des inputs différents par nature)

[ADR-0059 Brand Tree](0059-brand-tree-multi-archetype.md) introduit `BrandNode.nodeKind: String` libre + `nodeNature: BrandNature` validé contre archétype. Cet ADR-0061 **définit ces archétypes** : pour chaque `BrandNature`, la cascade canonique de `nodeKind`, les transitions parent→child autorisées, les Glory tools applicables, les variables Bible applicables, et les KPIs business pertinents.

### Drift identifié si pas d'ADR archétypes

Sans cet ADR, deux dérives garanties :
1. Le `nodeKind` libre devient un free-for-all incohérent : un opérateur déclare un node `nodeKind: "GAMME"` (FR) à côté d'un autre `nodeKind: "PRODUCT_LINE"` (EN) — pas de canon, le RAG cross-niveau s'effondre.
2. Les Glory tools deviennent applicables partout sans contraintes : un Glory tool `ART_DIRECTION_KV_PACKAGING` tourne sur un `MEDIA_IP` et produit du junk parce que la nature ne s'y prête pas.

→ Cet ADR **ferme les deux dérives** en publiant une const TS source de vérité.

---

## Décision

### §1 — Const TS `BRAND_NATURE_ARCHETYPES` source de vérité

Nouveau module : [src/domain/brand-nature-archetypes.ts](../../../src/domain/brand-nature-archetypes.ts) à créer Phase 18-A0 J3.

```typescript
import type { BrandNature } from "@prisma/client";

export interface BrandNatureArchetype {
  /** Cascade canonique de nodeKind, du root vers la feuille */
  cascade: readonly string[];
  /** Matrice transitions parent→children authorisées */
  validTransitions: Record<string, readonly string[]>;
  /** Glory tools applicables (slug du registre) — wildcard "*" = tous */
  applicableGloryTools: readonly string[];
  /** Variables Bible applicables (clés de variable-bible.ts) */
  applicableBibleVars: readonly string[];
  /** Manipulation modes par défaut (cf. MANIPULATION-MATRIX.md) */
  defaultManipulationMix: readonly ("peddler" | "dealer" | "facilitator" | "entertainer")[];
  /** RAG retrieval default scope — quel niveau d'ancêtre est l'identité racine */
  identityRootKind: string;
}

export const BRAND_NATURE_ARCHETYPES: Record<BrandNature, BrandNatureArchetype> = {
  PRODUCT: {
    cascade: [
      "CORPORATE",
      "MASTER_BRAND",
      "REGIONAL_CLUSTER",
      "REGIONAL_BRAND",
      "PRODUCT_LINE",
      "PRODUCT_VARIANT",
      "SKU",
    ],
    validTransitions: {
      ROOT: ["CORPORATE"],
      CORPORATE: ["MASTER_BRAND"],
      MASTER_BRAND: ["REGIONAL_CLUSTER", "REGIONAL_BRAND", "PRODUCT_LINE"],
      REGIONAL_CLUSTER: ["REGIONAL_BRAND"],
      REGIONAL_BRAND: ["PRODUCT_LINE"],
      PRODUCT_LINE: ["PRODUCT_VARIANT", "SKU"],
      PRODUCT_VARIANT: ["SKU"],
      SKU: [], // feuille
    },
    applicableGloryTools: [
      "creative-brief", "kv-art-direction-brief", "manifesto-writing",
      "claim-extraction", "packaging-storytelling", "shelf-share-strategy",
      "shopper-journey-map", "promo-mechanics-brief", "trade-marketing-plan",
      // Higgsfield MCP video tools (ADR-0048 §16-B)
      "higgsfield-dop", "higgsfield-soul", "higgsfield-steal",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_A.tone", "BIBLE_D.unique-mechanism",
      "BIBLE_V.functional-value", "BIBLE_V.emotional-value",
      "BIBLE_E.shopper-journey", "BIBLE_E.shelf-share-target",
      "BIBLE_R.competitor-set", "BIBLE_T.cultural-trends",
      "BIBLE_I.activation-roadmap", "BIBLE_S.synthesis-pillar",
    ],
    defaultManipulationMix: ["peddler", "entertainer"],
    identityRootKind: "MASTER_BRAND",
  },

  SERVICE: {
    cascade: [
      "CORPORATE",
      "SERVICE_BRAND",
      "MARKET",
      "CUSTOMER_SEGMENT",
      "OFFER",
    ],
    validTransitions: {
      ROOT: ["CORPORATE"],
      CORPORATE: ["SERVICE_BRAND"],
      SERVICE_BRAND: ["MARKET"],
      MARKET: ["CUSTOMER_SEGMENT"],
      CUSTOMER_SEGMENT: ["OFFER"],
      OFFER: [],
    },
    applicableGloryTools: [
      "creative-brief", "manifesto-writing", "service-design-brief",
      "customer-experience-map", "pricing-positioning-brief",
      "trust-narrative-strategy", "premium-segment-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_A.tone", "BIBLE_D.service-differentiator",
      "BIBLE_V.functional-value", "BIBLE_V.trust-value",
      "BIBLE_E.customer-touchpoints", "BIBLE_R.competitor-set",
      "BIBLE_T.cultural-trends", "BIBLE_I.experience-roadmap",
    ],
    defaultManipulationMix: ["facilitator", "dealer"],
    identityRootKind: "SERVICE_BRAND",
  },

  CHARACTER_IP: {
    cascade: [
      "IP_OWNER",
      "CHARACTER",
      "UNIVERSE",
      "EXPLOITATION_DOMAIN",
      "FORMAT",
    ],
    validTransitions: {
      ROOT: ["IP_OWNER"],
      IP_OWNER: ["CHARACTER"],
      CHARACTER: ["UNIVERSE", "EXPLOITATION_DOMAIN"], // un character peut avoir plusieurs univers OU des exploitations directes
      UNIVERSE: ["EXPLOITATION_DOMAIN"],
      EXPLOITATION_DOMAIN: ["FORMAT"],
      FORMAT: [],
    },
    applicableGloryTools: [
      "writers-room-outline", "character-bible-extraction",
      "story-arc-brief", "transmedia-extension-brief",
      "merchandising-line-brief", "fan-community-strategy",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_A.character-voice",
      "BIBLE_D.canon-element", "BIBLE_V.fan-emotional-value",
      "BIBLE_E.fan-touchpoints", "BIBLE_T.fan-culture",
      "BIBLE_I.transmedia-roadmap",
    ],
    defaultManipulationMix: ["entertainer", "dealer"],
    identityRootKind: "CHARACTER",
  },

  FESTIVAL_IP: {
    cascade: [
      "ORGANIZATION",
      "FESTIVAL",
      "EDITION",
      "EXPERIENCE_TYPE",
      "ACTIVATION",
    ],
    validTransitions: {
      ROOT: ["ORGANIZATION"],
      ORGANIZATION: ["FESTIVAL"],
      FESTIVAL: ["EDITION"],
      EDITION: ["EXPERIENCE_TYPE"],
      EXPERIENCE_TYPE: ["ACTIVATION"],
      ACTIVATION: [],
    },
    applicableGloryTools: [
      "lineup-reveal-strategy", "edition-narrative-brief",
      "fomo-mechanics-brief", "venue-experience-map",
      "merchandise-drop-brief", "after-movie-brief",
      "ticketing-tier-strategy",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_D.signature-experience",
      "BIBLE_V.attendee-emotional-value", "BIBLE_E.fomo-loops",
      "BIBLE_R.competitor-festivals", "BIBLE_T.subculture-trends",
      "BIBLE_I.activation-calendar",
    ],
    defaultManipulationMix: ["dealer", "entertainer"],
    identityRootKind: "FESTIVAL",
  },

  MEDIA_IP: {
    cascade: [
      "STUDIO",
      "FRANCHISE",
      "TITLE",
      "VARIANT",
      "EPISODE_OR_CHAPTER",
    ],
    validTransitions: {
      ROOT: ["STUDIO"],
      STUDIO: ["FRANCHISE", "TITLE"], // un titre peut être autonome (pas dans une franchise)
      FRANCHISE: ["TITLE"],
      TITLE: ["VARIANT", "EPISODE_OR_CHAPTER"],
      VARIANT: ["EPISODE_OR_CHAPTER"],
      EPISODE_OR_CHAPTER: [],
    },
    applicableGloryTools: [
      "writers-room-outline", "season-arc-brief", "episode-brief",
      "marketing-trailer-brief", "press-kit-brief",
      "festival-circuit-strategy", "streaming-launch-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_A.tone", "BIBLE_D.story-engine",
      "BIBLE_V.emotional-arc-value", "BIBLE_E.fandom-touchpoints",
      "BIBLE_T.cultural-trends",
    ],
    defaultManipulationMix: ["entertainer", "facilitator"],
    identityRootKind: "FRANCHISE",
  },

  RETAIL_SPACE: {
    cascade: [
      "OPERATOR_GROUP",
      "BANNER",
      "REGION",
      "STORE",
      "DEPARTMENT",
    ],
    validTransitions: {
      ROOT: ["OPERATOR_GROUP"],
      OPERATOR_GROUP: ["BANNER"],
      BANNER: ["REGION"],
      REGION: ["STORE"],
      STORE: ["DEPARTMENT"],
      DEPARTMENT: [],
    },
    applicableGloryTools: [
      "store-experience-brief", "banner-positioning-brief",
      "department-merchandising-brief", "loyalty-program-brief",
      "in-store-activation-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_D.shopper-promise",
      "BIBLE_V.convenience-value", "BIBLE_E.in-store-touchpoints",
      "BIBLE_I.store-rollout-plan",
    ],
    defaultManipulationMix: ["facilitator", "peddler"],
    identityRootKind: "BANNER",
  },

  PLATFORM: {
    cascade: [
      "COMPANY",
      "PLATFORM",
      "MARKET",
      "FEATURE_LINE",
      "FEATURE_VERSION",
    ],
    validTransitions: {
      ROOT: ["COMPANY"],
      COMPANY: ["PLATFORM"],
      PLATFORM: ["MARKET", "FEATURE_LINE"],
      MARKET: ["FEATURE_LINE"],
      FEATURE_LINE: ["FEATURE_VERSION"],
      FEATURE_VERSION: [],
    },
    applicableGloryTools: [
      "feature-launch-brief", "user-onboarding-brief",
      "growth-loop-brief", "platform-positioning-brief",
      "developer-ecosystem-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype", "BIBLE_D.network-effect",
      "BIBLE_V.utility-value", "BIBLE_E.user-loops",
      "BIBLE_T.platform-trends", "BIBLE_I.feature-roadmap",
    ],
    defaultManipulationMix: ["facilitator", "dealer"],
    identityRootKind: "PLATFORM",
  },

  INSTITUTION: {
    cascade: [
      "INSTITUTION",
      "DIVISION",
      "MARKET",
      "PROGRAM",
      "ACTIVITY",
    ],
    validTransitions: {
      ROOT: ["INSTITUTION"],
      INSTITUTION: ["DIVISION"],
      DIVISION: ["MARKET", "PROGRAM"],
      MARKET: ["PROGRAM"],
      PROGRAM: ["ACTIVITY"],
      ACTIVITY: [],
    },
    applicableGloryTools: [
      "mission-narrative-brief", "donor-engagement-brief",
      "advocacy-campaign-brief", "field-program-brief",
      "stakeholder-communication-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.mission", "BIBLE_A.values",
      "BIBLE_D.signature-action", "BIBLE_V.civic-value",
      "BIBLE_E.donor-volunteer-touchpoints", "BIBLE_I.program-calendar",
    ],
    defaultManipulationMix: ["facilitator", "entertainer"],
    identityRootKind: "INSTITUTION",
  },

  PERSONAL: {
    cascade: [
      "PERSON",
      "VENTURE_DIVISION",
      "PROJECT",
      "DELIVERABLE",
      "INSTANCE",
    ],
    validTransitions: {
      ROOT: ["PERSON"],
      PERSON: ["VENTURE_DIVISION", "PROJECT"], // un projet personnel peut être autonome
      VENTURE_DIVISION: ["PROJECT"],
      PROJECT: ["DELIVERABLE"],
      DELIVERABLE: ["INSTANCE"],
      INSTANCE: [],
    },
    applicableGloryTools: [
      "personal-narrative-brief", "content-pillars-brief",
      "drop-strategy-brief", "audience-funnel-brief",
      "speaking-circuit-brief", "book-launch-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.personal-archetype", "BIBLE_A.public-voice",
      "BIBLE_D.signature-take", "BIBLE_V.audience-emotional-value",
      "BIBLE_E.audience-touchpoints", "BIBLE_I.content-calendar",
    ],
    defaultManipulationMix: ["entertainer", "dealer"],
    identityRootKind: "PERSON",
  },
} as const;
```

### §2 — Validation runtime au moment de `OPERATOR_CREATE_BRAND_NODE`

Le handler [src/server/services/brand-node/handlers.ts](../../../src/server/services/brand-node/handlers.ts) (créé Phase 18-A0 J3) implémente le gate Mestor `NATURE_TRANSITION_VALIDITY` :

```typescript
import { BRAND_NATURE_ARCHETYPES } from "@/domain/brand-nature-archetypes";

export async function assertValidTransition(
  parentNodeId: string | null,
  childNodeKind: string,
  childNodeNature: BrandNature,
): Promise<void> {
  const archetype = BRAND_NATURE_ARCHETYPES[childNodeNature];
  const parentKind = parentNodeId
    ? (await getNode(parentNodeId)).nodeKind
    : "ROOT";
  const allowed = archetype.validTransitions[parentKind] ?? [];
  if (!allowed.includes(childNodeKind)) {
    throw new IntentVetoed(
      `NATURE_TRANSITION_INVALID: parent=${parentKind} (nature=${childNodeNature}) ne peut engendrer ${childNodeKind}. Transitions valides: ${allowed.join(", ")}`
    );
  }
}
```

### §3 — Mélange de natures dans le même arbre (cas Disney)

Un nœud peut avoir des enfants d'une nature **différente** quand la transition fait sens (ex : Disney = INSTITUTION → Mickey = CHARACTER_IP → Disney Toys = PRODUCT). Le moteur de validation devient :

```typescript
// Si l'enfant change de nature, on vérifie la transition NATURE-LEVEL en plus de la transition KIND-LEVEL.
const NATURE_TRANSITIONS_VALID: Partial<Record<BrandNature, BrandNature[]>> = {
  INSTITUTION: ["CHARACTER_IP", "MEDIA_IP", "FESTIVAL_IP", "PRODUCT", "PERSONAL"],
  CHARACTER_IP: ["MEDIA_IP", "PRODUCT", "FESTIVAL_IP"],
  MEDIA_IP: ["PRODUCT", "FESTIVAL_IP", "MEDIA_IP"],
  PERSONAL: ["MEDIA_IP", "PRODUCT", "INSTITUTION"], // un personal brand fonde une institution
  PLATFORM: ["FEATURE_LINE", "MARKET"], // tend à rester dans PLATFORM mais peut spawn PRODUCT lines
  // SKU/feuilles ne devraient JAMAIS engendrer un MASTER_BRAND/CORPORATE — exception cas spin-off (Phase 18-bis)
};
```

→ Le gate `NATURE_TRANSITION_VALIDITY` valide les **deux dimensions** : kind cohérent dans la nature parent, ET transition de nature autorisée.

### §4 — Glory tools brand-aware (Phase 18 noyau)

Chaque Glory tool reçoit en Phase 18 noyau un champ `applicableNatures: BrandNature[]` dans son `GloryToolDef` ([src/server/services/artemis/tools/registry.ts](../../../src/server/services/artemis/tools/registry.ts)) :

```typescript
{
  slug: "creative-brief",
  applicableNatures: ["PRODUCT", "SERVICE", "MEDIA_IP", "PERSONAL"], // pas FESTIVAL_IP qui a son brief dédié
  // ...
}
```

La cascade Glory→Brief→Forge filtre désormais les tools disponibles selon la `nodeNature` du nœud cible. Un tool `lineup-reveal-strategy` ne s'affiche pas dans le menu si l'opérateur est sur un nœud `PRODUCT`.

### §5 — Variables Bible reclassif (Phase 18 noyau)

Chaque entrée de [src/lib/types/variable-bible.ts](../../../src/lib/types/variable-bible.ts) (~300 entrées, BIBLE_A à BIBLE_S) reçoit en Phase 18 noyau un champ `applicableNatures: BrandNature[]`. Travail manuel non-trivial (5 jours estimés). Les entrées sans `applicableNatures` déclaré sont rejetées par lint dans CI.

### §6 — Périmètre Phase 18-A0 vs Phase 18-bis

**Phase 18-A0 (immédiat)** :
- Const `BRAND_NATURE_ARCHETYPES` shipped
- PRODUCT operable end-to-end (FrieslandCampina ingéré)
- Validation `NATURE_TRANSITION_VALIDITY` active uniquement pour PRODUCT
- 8 autres natures déclarées dans la const mais **read-only** (pas de wizard d'intake spécialisé encore)

**Phase 18 noyau (post 18-A0)** :
- Glory tools annotation `applicableNatures`
- Variables Bible reclassif

**Phase 18-bis (3 mois post-noyau)** :
- Wizards d'intake spécialisés par nature (FESTIVAL_IP wizard, MEDIA_IP wizard, etc.)
- Validation `NATURE_TRANSITION_VALIDITY` active sur toutes les natures
- Glory tools spécialisés (writers-room, lineup-reveal, etc.) shipped

---

## Conséquences

### Bénéfices

1. **Source de vérité unique** : un seul endroit (`BRAND_NATURE_ARCHETYPES` const) pour comprendre comment chaque type de marque s'organise. Élimine le free-for-all.
2. **Validation runtime stricte** : Mestor refuse les transitions absurdes (`SKU → CORPORATE`, `FESTIVAL_IP → SKU`, etc.) avant écriture DB.
3. **Glory tools filtrables par nature** : l'UI affiche uniquement les tools pertinents, pas le catalogue entier.
4. **Onboarding multi-archétype prêt** : ouvrir un nouveau dossier non-PRODUCT (festival, media studio, personal brand) ne demande pas de refonte — juste activation Phase 18-bis.
5. **RAG arborescent default scope intelligent** : `identityRootKind` par nature → le retriever sait quel ancêtre est le "centre identitaire" pour le filtrage par défaut.

### Coûts

- **Travail Phase 18 noyau** : Glory tools annotation (56 tools × ~5 min) + variable bible reclassif (~300 entrées × ~2 min) = ~5-6 jours de travail manuel rigoureux.
- **Si une nature manque de couverture Glory tool** (ex : FESTIVAL_IP n'a aujourd'hui que des tools PRODUCT-style) → Phase 18-bis devra ajouter ces tools spécialisés. Identifié comme follow-up, pas bloquant.

### Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Const `BRAND_NATURE_ARCHETYPES` devient obsolète face à un cas réel non-modélisé | Moyen | Friction onboarding nouveau client | Cas réel → ADR follow-up qui ajoute/modifie la nature concernée. La const est pure data, faciles à patcher. |
| Validation `NATURE_TRANSITION_VALIDITY` bloque un cas légitime | Faible | Friction opérateur | Override via ADR + ajout transition à la matrice. Le gate refuse par défaut, l'override est explicite. |
| Glory tools annotation incohérente | Moyen | Tools pas affichés OU affichés à tort | Test anti-drift CI `tests/unit/governance/glory-tool-archetype-coverage.test.ts` qui vérifie chaque tool a déclaré son `applicableNatures` (lint blocking) |

---

## Tests anti-drift

| Test | Vérifie |
|---|---|
| `tests/unit/governance/brand-nature-archetypes.test.ts` | Const cohérente : tous les `cascade[*]` apparaissent comme clé dans `validTransitions` ; `identityRootKind` est dans `cascade` ; `defaultManipulationMix` non-vide |
| `tests/unit/governance/nature-transition-validity.test.ts` | Tous les tests positifs (transitions valides) + négatifs (transitions invalides) par nature passent |
| `tests/unit/governance/glory-tool-archetype-coverage.test.ts` (Phase 18 noyau) | Chaque GloryTool dans le registre a déclaré `applicableNatures: BrandNature[]` non-vide |
| `tests/unit/governance/bible-archetype-coverage.test.ts` (Phase 18 noyau) | Chaque entrée variable-bible a déclaré `applicableNatures: BrandNature[]` non-vide |

---

## Sources de vérité à propager

- [ ] `LEXICON.md` entrée `BrandNature` enrichie avec lien vers cet ADR + cascade par nature
- [ ] `CODE-MAP.md` régénéré post-création de `src/domain/brand-nature-archetypes.ts`
- [ ] `CHANGELOG.md` v6.18.15 entry mentionne ADR-0061
- [ ] Memory user `architecture_brand_nature_archetypes.md` (à créer post-merge)

---

**9 archétypes prêts. PRODUCT operable Phase 18-A0. 8 autres opérables Phase 18-bis selon pipeline commercial.**
