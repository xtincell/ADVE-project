# ADR-0049 — Brief mandatory gate : aucune production sans brief

**Date** : 2026-05-04 (renuméroté 2026-05-05 — voir note ci-dessous)
**Status** : Accepted
**Auteurs** : NEFER (branche `claude/integrate-brief-system-3fA2I`)
**Supersede** : —
**Lié** : [ADR-0009](0009-neter-ptah-forge.md) (Ptah cascade Glory→Brief→Forge), [ADR-0012](0012-brand-vault-superassets.md) (BrandAsset.briefId), [ADR-0023](0023-operator-amend-pillar.md) (ADVE editable), [ADR-0030](0030-intake-closure-adve-100pct.md) (intake → ADVE → strategy)

> **Note de renumérotation (2026-05-05)** : ADR enregistré initialement sous 0034 (PR #56, commit b0fe734 2026-05-04 08:33) alors qu'un autre ADR avait déjà revendiqué ce numéro le même jour ([ADR-0034 Console oracle namespace residual cleanup](0034-console-oracle-namespace-residual-cleanup.md), commit antérieur). Conflit d'agents parallèles. Renuméroté 0034→0049 en suivant la règle chronologique (first-come keep). Toutes les références CHANGELOG.md, LEXICON.md, NEFER.md, tests et ADR-0037 (devenu [ADR-0050](0050-output-first-deliverable-composition.md) en Phase 18-bis 2026-05-05) ont été mises à jour dans le commit de renumérotation. Compatibility alias historique : "ADR-0034 (brief mandatory gate)" === ADR-0049.

---

## 1. Contexte

Le framework La Fusée séquence l'industrialisation : ADVE (socle) → Brief (Glory tools Artemis) → Forge (Ptah) → Distribution (Anubis) → Mesure (Seshat). La cascade Glory→Brief→Forge ([ADR-0009](0009-neter-ptah-forge.md)) implique un ordre strict : on ne forge pas un asset sans brief, on ne lance pas d'action sans brief, on ne mobilise pas de crew sans brief.

À ce jour, le repo a la **forme** mais pas la **gate** :

- `CampaignBrief` model existe (`prisma/schema.prisma:1593`).
- `Campaign.activeBriefId` + relation `briefs[]` existent (`prisma/schema.prisma:683`).
- `BrandAsset.briefId → CampaignBrief?` existe (`prisma/schema.prisma:948`).
- Le state-machine campaign gate `BRIEF_DRAFT → BRIEF_VALIDATED` sur `brief_complete` (`src/server/services/campaign-manager/state-machine.ts:28`).

**Ce qui manque** :

1. **Côté création**, on peut instancier `CampaignAction`, `Mission` rattachée à une campagne, ou déclencher une production matérielle alors que la `Campaign` est en `BRIEF_DRAFT` sans aucun `CampaignBrief`. Le state-machine ne gate que la *transition* d'état, pas la *création* d'actions/missions.
2. **Côté UX**, le client (founder) n'a pas de surface dans son Cockpit pour ingérer un brief existant — la fonction est seulement disponible dans `/console/strategy-operations/brief-ingest` (interne UPgraders). Le router `briefIngest.preview/confirm` est pourtant déjà publié.
3. **Côté lisibilité**, les portails Agency et Creator listent campagnes/missions sans surfacer la présence ou l'absence du brief associé, ni le brief-source des livrables.

Conséquence : drift narratif silencieux. La cascade A→D→V→E→R→T→I→S est documentée comme stricte (Loi 2 séquencement étages, [APOGEE.md §3](../APOGEE.md)) mais le code permet de la sauter.

## 2. Décision

**Toute mutation qui matérialise un étage post-brief de la cascade DOIT, à la création, refuser silencieusement si la `Campaign` parente n'a ni `activeBriefId` ni `CampaignBrief` rattaché.**

Concrètement :

### 2.1 Brief gate utility

Nouveau module `src/server/services/campaign-manager/brief-gate.ts` exposant :

- `BriefMissingError extends Error` (code `BRIEF_MISSING`)
- `getCampaignBriefStatus(campaignId, db?)` — read-only, retourne `{ hasBrief, briefCount, activeBriefId, primaryBrief }` pour gating UI (badges, CTAs, table columns)
- `assertCampaignHasBrief(campaignId, db?)` — throw `BriefMissingError` si la Campaign n'a ni `activeBriefId` ni `briefs.length > 0`

Re-exporté via `src/server/services/campaign-manager/index.ts`.

### 2.2 Points d'application backend

| Surface | Fichier | Trigger |
|---|---|---|
| `createActionFromType` | `src/server/services/campaign-manager/index.ts:690` | Toute insertion `CampaignAction` |
| `mission.create` (campaign-scoped) | `src/server/trpc/routers/mission.ts:31` | Toute mission avec `campaignId` non-null |

**Hors scope (intentionnel)** :

- **Glory tools brief-only** (`creative-brief-internal`, `pitch-architect`, etc.) — ce sont les producteurs légitimes de briefs. Les gater serait absurde (le brief n'existe pas encore avant qu'ils tournent).
- **`PTAH_MATERIALIZE_BRIEF`** — son input *est* un `ForgeBrief` (issu d'un Glory tool brief-to-forge), donc le brief existe par construction. Pas de gate redondante.
- **Missions sans `campaignId`** — campagne implicite/standalone (research, prospection). La gate s'applique uniquement aux missions rattachées.
- **`BrandAsset.create` direct** — tous les paths légitimes passent par `chainGloryToPtah` ou `sequence-executor` qui sont déjà liés à un brief. Le scope du gate reste sur les *campagnes* qui orchestrent.

### 2.3 Surface tRPC pour les UIs

Nouvelles procedures sur `campaignManager` router :

- `briefStatus({ campaignId })` — query single
- `briefStatusMany({ campaignIds })` — query bulk pour les tables (agency campaigns, console oversight)

### 2.4 Surface UI — exposition du brief client

| Portail | Surface | Ajout |
|---|---|---|
| **Cockpit** | `/cockpit/operate/briefs` | (1) Section "Briefs de campagne" (`CampaignBrief` listing par campagne active, badges status/version/type) ; (2) CTA "Importer un brief existant" (modal qui upload PDF/DOCX et appelle `briefIngest.preview` + `briefIngest.confirm`, déjà publiés) |
| **Cockpit** | `/cockpit/brand/assets` (vault) | Quand `BrandAsset.briefId` est défini, afficher chip "← Brief: {title} v{version}" lié au brief source |
| **Agency** | `/agency/campaigns` | Colonne "Brief" (badge présent/absent + tooltip type primaire) via `briefStatusMany` |
| **Creator** | `/creator/missions/active` (modal "Voir le brief") | Si `mission.campaignId` set : fetch `campaign-manager.listBriefs` et afficher contenu CREATIVE/MEDIA en plus du `briefData` mission-level |

### 2.5 Sémantique de l'état "brief manquant"

Quand la gate refuse :

- **API** : tRPC retourne `BriefMissingError` avec message FR explicite. Caller responsabilité de mapper vers UX adaptée (toast, CTA "Importer un brief").
- **UI** : badge rouge "Brief manquant" + lien direct vers `/cockpit/operate/briefs?import=true` ou modal de génération AI (Glory tool `creative-brief-internal`) selon contexte.

**Pas** d'erreur silencieuse, **pas** de fallback "auto-create empty brief". La gate informe ; l'opérateur décide.

## 3. Conséquences

### Positives

- **Cascade Glory→Brief→Forge enforced.** Plus de path qui saute le brief.
- **Surface brief-ingest enfin exposée côté client** (cockpit). Le router existait depuis Phase 13, l'UI n'était que console.
- **Lisibilité portails** : agency/creator voient le brief comme objet de premier ordre, plus seulement la campagne abstraite.
- **Anti-drift** : ADR explicite + tests rendent le gating non-bypassable.

### Négatives

- **Un test legacy** qui crée des `CampaignAction` sur une `Campaign` toute neuve sans brief va casser. Migration triviale : seed un `CampaignBrief` minimal dans la fixture ou utiliser le helper de test `withBrief(campaign)`.
- **Stress-test** existant `npm run stress:full` peut casser si le path createAction-without-brief était implicite. Ajustement : injecter brief minimal dans le bootstrap stress-test.
- **Aucune migration Prisma** requise (la schema avait déjà tout ce qu'il faut depuis Phase 10 ADR-0012).

### Neutres

- **Mestor cascade reste maître** : le gate est appliqué côté service, donc les Intents qui passent par `mestor.emitIntent()` (la voie canonique) bénéficient automatiquement.

## 4. Plan de validation

1. Test unitaire `tests/unit/services/brief-gate.test.ts` :
   - `assertCampaignHasBrief` throw `BriefMissingError` quand 0 brief
   - Pass quand `activeBriefId` set
   - Pass quand `briefs.length > 0`
   - `getCampaignBriefStatus` retourne forme attendue
2. Test intégration `mission.create` campaign-scoped avec/sans brief.
3. Smoke manuel :
   - Cockpit `/cockpit/operate/briefs` → upload PDF → vérifier `CampaignBrief` créé.
   - Agency `/agency/campaigns` → colonne brief.
   - Creator `/creator/missions/active` → modal enrichie.
4. CI anti-drift `neteru-coherence.test.ts` — pas d'impact (pas de Neter modifié).

## 5. Migration

Aucune migration Prisma. Aucun back-fill nécessaire. Le gate s'applique aux **futures** créations ; les `CampaignAction` / `Mission` orphelines existantes restent dans leur état.

Si une équipe veut auditer l'existant : `SELECT id, name FROM "Campaign" c WHERE NOT EXISTS (SELECT 1 FROM "CampaignBrief" b WHERE b."campaignId" = c.id) AND c."activeBriefId" IS NULL AND c.state NOT IN ('BRIEF_DRAFT', 'CANCELLED', 'ARCHIVED');` retournera les campagnes en état incohérent.

## 6. Anti-drift

- **CODE-MAP** régénéré : entrée brief-gate ajoutée.
- **LEXICON** : entrée "Brief mandatory gate" pointant ici.
- **Cette ADR** est référencée dans le commentaire de `assertCampaignHasBrief` et dans les comments inline aux deux points d'application.
