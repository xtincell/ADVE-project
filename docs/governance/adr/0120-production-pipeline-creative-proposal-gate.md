# ADR-0120 — Le Nouveau Pipeline de Production : la Proposition Créative comme gate de génération

**Status** : Accepted (doctrine — implémentation phasée)
**Date** : 2026-06-29
**Phase** : 24+ — refonte de l'aspect opérationnel (de la validation de la stratégie à la demande de ticket et l'escalade)
**Depends on** : ADR-0119 (campagnes canon depuis Pilier S), ADR-0088/0089 (routes roadmap S = niveaux d'exécution), ADR-0085 (STOP-à-Jehuty), ADR-0086 (tier de marque), ADR-0012 (BrandAsset : BIG_IDEA/CREATIVE_BRIEF/KV), ADR-0098 (La Guilde), ADR-0060 (manual-first parity), ADR-0099 (coûts base marché Seshat)
**Refines (flux)** : ADR-0119 amorçait les campagnes canon **et** y rattachait les actions « automatiquement depuis le Pilier I ». ADR-0120 **scinde** ce flux : l'amorçage canon reste Advertis-dérivé (frames + brief client), mais la **génération des actions + briefs de production déménage** du « Pilier S calculé / Advertis complet » vers la **validation de la direction créative** (Proposition Créative). Les invariants ADR-0119 (toute action a une campagne ; 3 canon × route ; budget unique + 3 niveaux dérivés ; tier conditionne tout ; AARRR par campagne ; BrandMoment ; boucle mensuelle) sont **préservés**.

## Contexte

Capture opérateur (2026-06-29) : « j'ai généré pour un advertis complet, mais les
actions ne se sont pas créé » → l'onglet Campagnes affichait « 3 campagne(s) canon
générée(s) · 0 action(s) rattachée(s) ». Diagnostic du circuit réel :

1. `generateCanonicalCampaigns` ne **crée jamais** d'action — il **rattache** les
   `BrandAction` déjà `selected: true` (`campaign-canon/index.ts`). Aucune sélectionnée
   → 3 campagnes, 0 action.
2. Les actions naissent du blob Pilier I via `syncBrandActionsFromBlob` (ADR-0094) en
   `selected: false`, sauf si l'initiative est `SELECTED_FOR_ROADMAP`.
3. La promotion `→ SELECTED_FOR_ROADMAP` ne se fait qu'à la **synthèse S**
   (`rtis-protocols/strategy.ts`, via `selectedFromI`).

Donc le « 0 actions » n'est pas une mécanique absente : c'est une **chaîne de
promotion non déclenchée**. Mais surtout, l'enchaînement « Advertis → actions » est
**doctrinalement à l'envers** pour l'opérateur : *les actions de production ne
doivent pas exister tant qu'une **direction créative** n'a pas été validée.* La
stratégie pose le **cadre** ; la création concrète (actions, briefs de prod, missions)
est **commandée par la validation d'une Proposition Créative** — produite soit par La
Fusée (IA), soit par La Guilde (humain), dans **un format de données identique**.

## Décision (modèle canonique — validé opérateur)

### Les deux « 3 » orthogonaux (ne pas confondre)

- **3 campagnes canon** (`canonType` ∈ GTM_90 / ANNUAL / ALWAYS_ON) — le **cadre**
  temporel, **amorcé + préfillé directement depuis l'Advertis**, gouverné par **un
  seul brief client partagé**. ADR-0119.
- **3 niveaux d'exécution** (`routeKey` ∈ CONSERVATIVE / TARGET / AMBITIOUS, alias
  *Aligné / Compressé / Dépassement* côté lecture) — **fonction des choix Advertis**,
  déjà calculés par `computeRoadmapRoutes` (ADR-0088/0089, `lib/strategy/roadmap-routes.ts`).
  C'est ce que l'étape de **direction créative** tranche.

Le frame existant porte déjà les deux axes : `Campaign.canonType` × `Campaign.routeKey`.

### Le pipeline

```
Advertis ──► stratégie SEULE
   └─ La Forge ──► brief(s) de CAMPAGNE uniquement (découplé des assets)   [GATE : brief client validé]
        └─ amorçage canon : 3 frames (× route) + 1 brief client partagé, préfillés depuis l'Advertis
           (cadre stratégique, AUCUNE action — en attente de direction créative)
             └─ RFP / Demande de Proposition ──► Brief Créatif (Big Idea / insight / axe / pistes)
                  ├─ Voie A — La Fusée IA : Glory sequences + Glory tools → Roadmap 3 niveaux
                  │             (Aligné/Compressé/Dépassement, dérivés Advertis) + mockups / social sim + KV (image API)
                  └─ Voie B — La Guilde : formulaire humain / agence + import image manuel
                       ▲ même Data Contract canonique (cf. §Data Contract) ▲
                       [GATE : Proposition Créative = Validée]  ◄── ★ LE TRIGGER DÉMÉNAGE ICI
                            └─ génération dans les frames : Actions + Briefs de PRODUCTION (niveau choisi)
                                 └─ Missions → Activités → Briefs de prod (avec dépendances)
                                      └─ Calendrier rétroplanning ancré sur T0 (date de lancement)
                                           └─ Dashboard micro (par activité) + Roadmap macro
```

1. **L'Advertis n'a plus le droit de créer des actions.** Une stratégie complète
   amorce le **cadre** (frames canon + brief client) mais **zéro action**. Le trigger
   de création (Actions + briefs de prod) est **« direction créative validée »**.
2. **Frames canon = cadre Advertis-dérivé.** `generateCanonicalCampaigns` persiste les
   3 frames (× route) avec budget conseillé + AARRR + dates ; **sans rattacher d'action**
   (découplage ADR-0120). Reste une **exception déterministe à STOP-à-Jehuty** (projection
   aval, pas écriture ADVE).
3. **Un seul brief client gouverne les 3 canon.** Le brief de campagne (La Forge,
   `CampaignBrief`) est l'intention client partagée par les 3 `canonType` d'une route.
   Découplé des assets : La Forge produit **le brief**, pas les visuels.
4. **La Proposition Créative est l'unité-gate.** Elle valide une **direction créative**
   (Big Idea / insight / axe / pistes) ; les **3 niveaux d'exécution** présentés sont
   `computeRoadmapRoutes` (Advertis-dérivés). Deux voies de production, **un seul Data
   Contract** :
   - **Voie A — La Fusée (IA)** : Glory sequences + 2 Glory tools → roadmap 3 niveaux +
     mockups / simulation social + KV (image API).
   - **Voie B — La Guilde (humain)** : formulaire freelance/agence + import d'image manuel.
5. **À la validation** (`VALIDATE_CREATIVE_PROPOSAL`) : génération des `BrandAction` +
   `CampaignBrief` (briefType=PRODUCTION) **dans les frames**, au **niveau d'exécution
   choisi** (le `routeKey` sélectionné filtre le jeu d'initiatives, ADR-0089).
6. **Cascade aval inchangée dans ses primitives** : `Mission` → `MissionActivity` →
   briefs de prod (dépendances via `CampaignDependency`), puis **rétroplanning** ancré
   sur **T0** (`launch-calendar.ts`, `anchorJ1`) + dashboards micro/macro.

## Anti-doublon — la cible s'appuie sur des primitives existantes

| Besoin du revamp | Primitive canonique réutilisée |
|---|---|
| 3 niveaux d'exécution (Aligné/Compressé/Dépassement) | `ROADMAP_ROUTE_KEYS` CONSERVATIVE/TARGET/AMBITIOUS + `computeRoadmapRoutes` (ADR-0089) |
| 3 campagnes canon × niveau | `Campaign.canonType` × `Campaign.routeKey` (ADR-0119) |
| Brief client unique | `CampaignBrief` (briefType CREATIVE/MEDIA/PRODUCTION…) |
| Direction créative (Big Idea/axe/KV) | `Campaign.activeBigIdeaId/activeBriefId/activeKvBriefId` → `BrandAsset.kind` (ADR-0012) |
| Voie B humaine | portail `/LaGuilde` (ADR-0098) |
| Voie A IA | Glory sequences + tools (Artemis) |
| Dépendances inter-éléments | `CampaignDependency` (source/target, BLOCKS) |
| Rétroplanning depuis T0 | `launch-calendar.ts` — `launch-timeline-planner` (`anchorJ1`=T0, checkpoints/gates) + `content-calendar-strategist` |
| Missions → Activités → briefs prod | `Mission` / `MissionActivity` / `MissionDeliverable` |

**Seul élément vraiment neuf** : l'entité-gate **Proposition Créative** + son **Data
Contract**. Tout le reste se **rebranche**.

## Data Contract — la Proposition Créative (Voie A ≡ Voie B)

L'objet Proposition est **identique** que la source soit l'API La Fusée (IA) ou le
front La Guilde (humain). Forme canonique (Zod, à figer en PR-2) :

```
CreativeProposalContract {
  strategyId; routeKey (niveau d'exécution choisi);
  source: "LAFUSEE_AI" | "LAGUILDE_HUMAN";
  direction: { bigIdea; insight; axe; pistes: string[] };
  executionLevels: RoadmapRoute[3];          // computeRoadmapRoutes — Advertis-dérivé, non ré-inventé
  visuals: { mockups: AssetRef[]; socialSim: AssetRef[]; keyVisual: AssetRef | null };
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
}
```

`AssetRef` = pointeur `BrandAsset` (Voie A : généré via image API ; Voie B : importé
manuellement). La validation est gouvernée (`VALIDATE_CREATIVE_PROPOSAL`) et **idempotente**.

## Plan d'implémentation (phasé)

- **PR-1** ✅ — Découplage : `generateCanonicalCampaigns` n'attache plus d'action ; les
  frames canon sont le **cadre stratégique** « en attente de direction créative » (UI
  honnête, fin du « 0 actions rattachées » trompeur). Cette ADR.
- **PR-2** — Entité **Proposition Créative** + Data Contract Zod + `VALIDATE_CREATIVE_PROPOSAL` ;
  brief client partagé (La Forge → brief uniquement) ; Voie A scaffold (Glory) + Voie B
  scaffold (La Guilde / import manuel).
- **PR-3** — **Relocalisation du trigger** : à la validation, génération Actions + briefs
  de production **dans les frames** au niveau choisi. Retrait des chemins résiduels de
  création d'action côté Advertis (le catalogue I reste, l'attache campagne passe par la
  proposition).
- **PR-4** — Cascade Missions → Activités → briefs prod (dépendances) + **rétroplanning T0**
  (`launch-calendar`) + dashboards micro/macro. Fold-in de la WIP `mission-fiche-revamp`
  (couche Activités : auto-seed, assignation prestataire, brief cliquable).

## Conséquences

- L'onglet Campagnes ne ment plus : un frame sans direction créative dit « en attente
  de direction créative », pas « 0 actions ».
- Manual-first parity (ADR-0060) **structurelle** : Voie B (La Guilde) est l'équivalent
  manuel de Voie A (La Fusée IA), même Data Contract.
- Cap APOGEE 7/7 **préservé** — sous-domaine Mestor (gate) / Artemis (Voie A) / Imhotep
  (La Guilde) ; aucun nouveau Neter.
- Découplage assets/briefs : La Forge produit le **brief** ; les **visuels** sont produits
  à l'étape Proposition (Voie A image API / Voie B import).
- ADR-0119 reste la doctrine du **cadre** canon ; ADR-0120 régit le **déclenchement** de
  la production par la direction créative.
