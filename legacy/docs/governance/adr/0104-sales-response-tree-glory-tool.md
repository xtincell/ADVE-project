# ADR-0104 — Glory tool `sales-response-tree` : arbre de réponse commercial

**Status** : Accepted
**Date** : 2026-06-21
**Phase** : galileo / sales enablement
**Depends on** : ADR-0048 (Glory tools as primary API surface), ADR-0067 (LLM output structured enforcement), ADR-0060 (parité manual-first), ADR-0077 §P22-3 (executionType HYBRID), ADR-0061 (applicableNatures / N6-bis)
**Enforced by** : `tests/unit/governance/sales-response-tree.test.ts` + `tests/unit/governance/phase22-glory-hybrid.test.ts`

## Contexte

Les commerciaux UPgraders n'avaient aucun outil Artemis pour cadrer leurs
conversations de vente. Un Artemis tool n'est rien d'autre qu'un **skill d'agent**
codé comme `GloryToolDef` (registry Artemis). Demande opérateur : un **arbre de
réponse** dont l'objectif est de **vendre — directement ou indirectement**, qui
sait **quoi vendre à qui** (identifier le QUI), **collecte le minimum CRM** (nom
+ téléphone) et **escalade à l'opérateur** sur scénario non anticipé ou demande
explicite du client.

Anti-doublon (NEFER interdit #1) — grep `CODE-MAP` : `sales-deck-builder` produit
un **deck** (artefact COMPOSE), pas une décision conversationnelle ; le CRM existe
déjà (`CrmContact` source=MANUAL avec `name`+`phone`, pipeline `Deal`/`DealStage`,
métriques `CampaignAARRMetric`). Rien à doubler — on **étend**.

## Décision

Ajouter **un** Glory tool HYBRID `sales-response-tree` (layer CR, ordre 24_001)
dans `src/server/services/artemis/tools/sales-response-tree-tools.ts`, branché
sur `EXTENDED_GLORY_TOOLS` (**pas CORE** — préserve la cardinalité 56).

### Transform pur, état porté par le caller

Comme tout Glory tool, l'outil est **sans état** : il traite UN tour de
conversation. Le caller (bot WhatsApp / UI rep / front-desk) ré-invoque l'outil à
chaque tour en passant le contexte (`conversation_history`, `known_lead`). Les
canaux couverts : **WhatsApp (primaire)** + DM social + appel outbound + intake.

### Contrat de sortie (outputSchema = manualFormSchema, ADR-0060)

À chaque tour, une décision structurée : `segment` (le QUI parmi 9),
`aarrrObjective` + `saleType` (DIRECT=REVENUE / INDIRECT=Acquisition·Activation·
Rétention·Référral), `recommendedOffer` (quoi vendre × value ladder
FREE→ULTRA_PREMIUM), `suggestedReply` (la réponse prête à envoyer),
`leadCapture` (nom/téléphone/email/société + `missingRequired ⊆ {name,phone}` +
`crmAction` + `crmSource="MANUAL"` + `dealStageHint`), et `escalate` +
`escalationReason` (dont les deux déclencheurs **obligatoires**
`UNANTICIPATED_SCENARIO` et `EXPLICIT_CLIENT_REQUEST`).

### Persistance CRM : par les Intents existants (pas d'écriture dans l'outil)

L'outil **n'écrit pas** en base — il **émet** `leadCapture`. Le caller persiste
via les voies gouvernées existantes : `crm-contacts.upsertContact`
(source=MANUAL) pour le contact minimal, `crm.createDealFromIntake` /
`LEGACY_CRM_*` pour le pipeline `Deal`. **Zéro nouveau modèle Prisma.**

### Ancrage de marque

Exécuter contre la Strategy maison UPgraders (seed `prisma/seed-upgraders.ts`) :
`loadStrategyContext` injecte alors l'ADVE d'UPgraders, ancrant ton + offre dans
la réponse. La carte d'offres (Oracle/Audit, Cockpit, Workshop, Retainer/CMO
délégué, La Guilde CORE/EXTENDED, Réseau, Sérénité, Source Insights, Certification)
suit la value ladder et la doctrine **premium curated / capture-then-grow**
(FCFA + mobile money) ; aucun prix ferme hors mandat → `PRICING_BEYOND_MANDATE`.

## Conséquences

- Invocation : `glory.executeHybrid({ toolSlug: "sales-response-tree", … })`
  (Intent gouverné `LEGACY_GLORY_EXECUTE`) — LLM, manuel (`preferManual` +
  `manualEntry`), ou `fullAuto` (3ᵉ mode « à mes risques »).
- **Cap APOGEE 7/7 préservé** — aucun nouveau Neter, sous-domaine d'Artemis
  (Propulsion / phase brief) sous gouvernance Mestor.
- Surface UI : apparaît dans le catalogue `/console/artemis/tools` (peer-toggle
  HYBRID) via `glory.getManualForm`.
- Suite anti-drift verte (tsc 0 · eslint 0 · tests ciblés 75 verts).
