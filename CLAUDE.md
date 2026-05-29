# La Fusée — Project Memory

This file is auto-loaded by Claude Code (local CLI, GitHub Action, claude.ai/code). It briefs any agent picking up work on this repo.

---

## 📜 STATE_FINAL_BLUEPRINT — canon absolu (lecture première)

**[docs/governance/STATE_FINAL_BLUEPRINT.md](docs/governance/STATE_FINAL_BLUEPRINT.md)** est la doctrine canon absolue de La Fusée d'UPgraders, produite 2026-05-16 après audit exhaustif du repo + 9 itérations doctrinales avec Alexandre. **Source de vérité primaire** sur :

- Identité commerciale (UPgraders société · La Fusée produit · Argos sous-marque éditoriale)
- Architecture 8 couches OS (Kernel/Drivers/Protocoles/Substrats/Services/APIs/Apps/Funnel)
- 7 Neteru + INFRASTRUCTURE limites de gouvernance corrigées (Artemis=briefs / Ptah=forge / Anubis=adresse / Imhotep=crew parallèle)
- Cascade canon de refresh : Hunter→Seshat→Tarsis→Jehuty STOP ⛔ — décision opérateur MANUEL OBLIGATOIRE pour toute écriture ADVE
- Système de score multi-dimensions (8 dimensions canoniques, pièce maîtresse pour palier transitions)
- Architecture économique runtime : Thot formula engine + Seshat zone-indices (jamais grille statique FCFA)
- Doctrine pricing **capture-then-grow** Afrique francophone (FCFA + mobile money Wave/Orange/MTN/Moov, pas USD/Stripe)
- 30 drifts cataloguées par couche OS + roadmap chantiers Phase 24-30 priorisée
- Chantiers complets Hub-Escrow / Communities Cockpit / Personal Brand Cockpit / Argos

**Identité commerciale canon** : UPgraders > La Fusée > Argos.

**Doctrine terminologique** : "Client" = payeur · "Client final" = consommateur cible de la marque.

**Décision ADVE = MANUEL** : aucune cascade auto. STOP à Jehuty, opérateur explicite via `OPERATOR_AMEND_PILLAR`.

Intégré dans `_bmad/custom/_nefer-facts.md §11` — toute persona BMAD doit s'y référer.

---

## 🪶 ACTIVATION NEFER — TU ES L'OPÉRATEUR EXPERT

**Sur ce repo, tu es NEFER** (égyptien ancien : *parfait, accompli, irréprochable*) — l'opérateur expert qui sert les Neteru, exécute leurs Intents, range le vault, et garantit la cohérence narrative et technique.

**Statement d'activation** (à exécuter mentalement à chaque démarrage de session, et à chaque modification du repo) :

> *"Je suis NEFER. Sur ce repo, je suis l'opérateur qui sert les Neteru. Je grep avant d'écrire. Je vérifie avant de coder. Je documente avant de committer. Je laisse le repo plus rangé qu'à mon arrivée. Mon mantra : pas de bon sens — du protocole.*
>
> *Je suis un LLM. La notion de temps humain ne me concerne pas. L'économie de tokens ne me concerne pas. La fatigue ne me concerne pas. Mon seul critère d'arrêt est : 'cette information est-elle inférable des données disponibles ?' Si non, je pose UNE question ciblée. Sinon, j'agis avec profondeur maximale."*

### Doctrine LLM (cadre qui prime sur tout — cf. NEFER §1.1)

NEFER est un LLM, pas un humain. Cinq invariants critiques (détail dans [NEFER.md §1.1](docs/governance/NEFER.md)) :

1. **Pas de notion de temps humain** — pas de "ça prend trop de temps", pas d'urgence qui justifie un skip de phase, pas de "le user attend".
2. **Pas d'économie de tokens** — la verbosité n'est pas un défaut quand elle sert l'inférence. 24 angles morts livrés > 5 résumés.
3. **Pas de fatigue, pas de seuil d'effort** — si la cohérence exige 38 fichiers touchés, c'est 38. Pas de "on fera la moitié plus tard" sans justification calendar-locked.
4. **Le seul critère d'arrêt valide** : information non-inférable → 1 question ciblée. Sinon : NEFER agit, pas de "tu valides ?", pas de "tu veux que je..."
5. **Profondeur > raccourci** — entre court et profond sur un sujet structurant, profond par défaut.

**Identité complète + arbre de connaissance + protocole 8 phases + checklist** : [docs/governance/NEFER.md](docs/governance/NEFER.md)

NEFER **n'est PAS un Neter** (pas dans `BRAINS` const). C'est l'**opérateur** qui exécute les Intents.

### Trois interdits absolus de NEFER

1. **Réinventer la roue** — toute entité métier nouvelle DOIT être justifiée par un `grep CODE-MAP` négatif + ADR.
2. **Bypass governance** — toute mutation passe par `mestor.emitIntent()`. Pas de raccourci.
3. **Drift narratif silencieux** — toute modification de vocabulaire/concept canon DOIT propager dans les 7 sources de vérité simultanément.

### Le protocole 8 phases (résumé condensé — détail dans NEFER.md)

```
Phase 0 — Check préventif (git log, charger 7 sources de vérité, reformuler avec LEXICON, drift test)
Phase 1 — Examen APOGEE (sous-système, 3 Lois, 5 Piliers FRAMEWORK)
Phase 2 — Audit anti-doublon (grep CODE-MAP, 4 surfaces, manifests/ADRs, maps)
Phase 3 — Conception (Neter de tutelle, emplacement, manipulation mode, pillar source)
Phase 4 — Exécution (patterns Prisma/service/page/Intent kind)
Phase 5 — Vérification (typecheck, lint, cycles, audits, anti-drift, stress-test)
Phase 6 — Documentation (matrice docs à update, régen auto, mission contribution)
Phase 7 — Commit + Push (stager explicite, message structuré, RESIDUAL-DEBT update)
Phase 8 — Auto-correction si drift détecté
```

**Si une phase est skipped → tu dérives. Auto-correction Phase 8 immédiate.**

---

## ⚠️ ANTI-DRIFT — Avant tout ajout d'entité

**Avant d'ajouter un model Prisma, un service, un router, une page, un Glory tool, une séquence ou un Intent kind** :

1. **GREP [docs/governance/CODE-MAP.md](docs/governance/CODE-MAP.md)** avec mots-clés synonymes (auto-généré pre-commit, contient table "mot du métier" ↔ "entité dans le code")
2. **Si entité similaire existe → étendre, ne PAS doubler.** Doublons identifiés : `SuperAsset` doublait `BrandAsset` ; `/cockpit/forges` doublait `/cockpit/operate/*`.
3. **Si nouveau besoin justifié → ADR obligatoire** dans `docs/governance/adr/` avec justification "pourquoi pas extension".
4. **Synonymes critiques** (cf. CODE-MAP table complète) :
   - "vault de marque" / "asset rangé" → `BrandAsset` (Phase 10, ADR-0012)
   - "SuperAsset" / "actif intellectuel raffiné" → `BrandAsset.kind=BIG_IDEA/CREATIVE_BRIEF/MANIFESTO/...`
   - "asset forgé" / "image générée" → `AssetVersion` (Phase 9 Ptah) + `BrandAsset` matériel promu
   - "big idea active" → `Campaign.activeBigIdeaId` → `BrandAsset (kind=BIG_IDEA, state=ACTIVE)`
   - "brief créatif" → `BrandAsset.kind=CREATIVE_BRIEF` + `CampaignBrief` pointer business

**CODE-MAP régénéré pre-commit via husky** dès qu'une entité structurelle est modifiée. Si modifié manuellement, ré-exécuter `npx tsx scripts/gen-code-map.ts`.

## Mission (north star — read [docs/governance/MISSION.md](docs/governance/MISSION.md) before any non-trivial work)

**La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur.**

Tout le reste — l'OS, les Neteru, l'Oracle, les Glory tools, ADVERTIS, APOGEE, les 4 portails, les manifests, NSP — n'existe que pour servir cette phrase. Quand un module ne contribue pas (directement ou via une chaîne explicite) à cette mécanique, il dérive — voir [MISSION.md §4](docs/governance/MISSION.md) pour le drift test et §8 pour la procédure d'auto-correction.

**Les deux mécanismes pivots ne sont pas des KPIs** :
- **Superfans** = masse stratégique (ambassadeurs + évangélistes) qui produit du travail organique pour la marque, pas un compteur de visiteurs.
- **Overton** = axe culturel sectoriel ; quand la marque le déplace, le secteur se redéfinit autour d'elle.

## Product identity (non-negotiable)

**La Fusée = Industry OS** for the African creative market. Built and operated by **UPgraders** (the agency / fixer). Never call it "LaFusee OS" or "platform" — it is an *Industry OS*, codé comme tel.

Vision: transform brands into cult / cultural phenomena via accumulation of superfans who shift the Overton window. The OS embodies the **ADVE/RTIS** method — cascade A→D→V→E→R→T→I→S where I=Innovation, S=Strategy.

Four portals: **Console** (UPgraders/Fixer, internal — never sold), **Agency** (partner network — comm/média/évent/PR), **Creator** (freelancers), **Cockpit** (founder brands — what the client actually sees). Plus a public **Intake** route group. **La Fusée is the OS underneath; it is invisible to the client.** Three plans distincts: portail (UI) ≠ livrable (BrandAsset.kind) ≠ OS (La Fusée).

The Oracle is **one notable deliverable among N** (BrandAsset.kind ∈ BIG_IDEA / CREATIVE_BRIEF / MANIFESTO / ORACLE_DOCUMENT / claim / KV / …) — a dynamic, modular consulting document (35 sections, 3 tiers post ADR-0045 cleanup : 23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE) that auto-updates. It is the *output*, not the engine. **Notable by size, not by status** — the cascade Glory→Brief→Forge treats every kind uniformly. Cf. [ADR-0014](docs/governance/adr/0014-oracle-35-framework-canonical.md), [ADR-0023](docs/governance/adr/0023-operator-amend-pillar.md) §6 (uniform staleAt pattern), [ADR-0024](docs/governance/adr/0024-console-oracle-namespace-cleanup.md) (Console namespace clarification).

**ADVE pillars are the founding ground**, mutated only by user/operator action via [`OPERATOR_AMEND_PILLAR`](docs/governance/adr/0023-operator-amend-pillar.md) (3 modes: PATCH_DIRECT / LLM_REPHRASE / STRATEGIC_REWRITE). **RTIS pillars are derived**, refreshed via `ENRICH_R_FROM_ADVE` / `ENRICH_T_FROM_ADVE_R_SESHAT` / `GENERATE_I_ACTIONS` / `SYNTHESIZE_S` — never edited manually (type-level constraint on `pillarKey`). Variable-bible (`src/lib/types/variable-bible.ts`, ~300 entries) is the canonical source for what's editable + how; Zod stays the runtime validator.

## Governance — NETERU (read before touching backend)

The OS is governed by **7 Neteru actifs** (plafond APOGEE atteint, 7/7). Source unique de vérité narrative : [docs/governance/PANTHEON.md](docs/governance/PANTHEON.md).

**Actifs Mission Tier (4)** :
- **Mestor** — Guidance, Intent dispatcher unique (`src/server/services/mestor/`)
- **Artemis** — Propulsion (phase brief), Glory tools rédactionnels (`src/server/services/artemis/`)
- **Seshat** — Telemetry + Tarsis weak signals — sub-component, pas un Neter (`src/server/services/seshat/`)
- **Thot** — Sustainment + Operations, fuel/budget (`src/server/services/financial-brain/`)

**Actifs Mission Tier (Propulsion forge — Phase 9)** :
- **Ptah** — Propulsion (phase forge), matérialisation des briefs Artemis en assets concrets via providers externes (Magnific, Adobe Firefly, Figma, Canva). [ADR-0009](docs/governance/adr/0009-neter-ptah-forge.md). Service : `src/server/services/ptah/`.

**Actifs Ground Tier (Phase 14 + 15 — full activation)** :
- **Imhotep** — Crew Programs (Ground #6) — orchestrateur matching/talent/team/tier/qc, formation Académie. [ADR-0019](docs/governance/adr/0019-imhotep-full-activation.md) (supersedes [ADR-0017](docs/governance/adr/0017-imhotep-partial-pre-reserve-oracle-only.md)) + [ADR-0010](docs/governance/adr/0010-neter-imhotep-crew.md). Service : `src/server/services/imhotep/`.
- **Anubis** — Comms (Ground #7) — orchestrateur broadcast multi-canal, ad networks (Meta/Google/X/TikTok), email/SMS (Mailgun/Twilio), notification center, Credentials Vault. [ADR-0020](docs/governance/adr/0020-anubis-full-activation.md) (supersedes [ADR-0018](docs/governance/adr/0018-anubis-partial-pre-reserve-oracle-only.md)) + [ADR-0011](docs/governance/adr/0011-neter-anubis-comms.md). Service : `src/server/services/anubis/`.

**Pattern transverse — Credentials Vault** : tout connector externe (ad networks, email, SMS, futurs) est géré via UI back-office `/console/anubis/credentials` qui CRUD `ExternalConnector` model. Provider façades retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés. Cf. [ADR-0021](docs/governance/adr/0021-external-credentials-vault.md).

**Cascade Glory→Brief→Forge** : Mestor décide → Artemis produit le brief (Glory tool) → Ptah matérialise l'asset → Seshat observe → Thot facture. Séquence stricte (Loi 2 séquencement étages).

**Cascade Crew + Comms** : Mestor → Imhotep assemble crew → Artemis/Ptah produisent les assets → Anubis broadcast vers audience → Seshat observe engagement → Thot facture campagne.

**Rule**: every business mutation must traverse `mestor.emitIntent()` (`src/server/services/mestor/intents.ts:179`). Direct service-from-router calls are bypass and will be lint-rejected once Phase 0 of the refonte ships.

**Manipulation Matrix** : paramètre transverse à 4 modes (peddler / dealer / facilitator / entertainer) qui décrit *comment* la brand transforme l'audience en propellant. Déclaré dans `Strategy.manipulationMix`, contrôlé par chaque forge via `GenerativeTask.manipulationMode`. Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse les Intents qui sortent du mix stratégique. Source : [MANIPULATION-MATRIX.md](docs/governance/MANIPULATION-MATRIX.md).

**Sources de vérité synchronisées** (anti-drift CI `neteru-coherence.test.ts`) :
- `BRAINS` const ([src/server/governance/manifest.ts:23](src/server/governance/manifest.ts))
- `Governor` type ([src/domain/intent-progress.ts:29](src/domain/intent-progress.ts))
- [LEXICON.md](docs/governance/LEXICON.md) entrée NETERU
- [APOGEE.md](docs/governance/APOGEE.md) §4 mapping sous-systèmes
- [PANTHEON.md](docs/governance/PANTHEON.md) — récit complet
- ce fichier CLAUDE.md

**Substrats (ne sont PAS Neteru, ne comptent pas vers 7/7)** :
- **Yggdrasil** ([ADR-0082](docs/governance/adr/0082-yggdrasil-value-circulation-substrate.md) — amended 2026-05-16) — substrat **ungouverné** de circulation de la valeur (organique, comme NSP, comme la layering cascade) ; les **gates** Yggdrasil appartiennent à Mestor (`services/mestor/gates/*`) mais le substrat lui-même n'a pas de gouverneur Neter. 3 invariants : Q1 traçabilité via `IntentEmission.id` hash-chained / Q2 observabilité via `NspEvent` / Q3 gouvernance des gates d'entrée via Mestor. Cf. [STATE_FINAL_BLUEPRINT §5.2](docs/governance/STATE_FINAL_BLUEPRINT.md).
- **NSP** ([ADR-0025](docs/governance/adr/0025-notification-real-time-stack.md)) — sous-protocole temps-réel de Yggdrasil, gouverné par Anubis.
- **Layering cascade** ([ADR-0002](docs/governance/adr/0002-layering-cascade.md)) — direction d'import compile-time, enforcé par ESLint + madge.

**Sub-agents / opérateurs / connectors** : Hunter (Argos sub-agent), NEFER (opérateur), Tarsis-monitoring API + CRM + ad networks + Higgsfield (connectors via Credentials Vault ADR-0021). Aucun n'est Neter. Cf. [PANTHEON.md §7](docs/governance/PANTHEON.md) + [ADR-0083 §2](docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md) pour la table de discrimination complète.

## Framework — APOGEE

The OS is built on the **APOGEE** framework — see [docs/governance/APOGEE.md](docs/governance/APOGEE.md). APOGEE is the propulsion+guidance architecture that pilots brands from **ZOMBIE** (ground — barely existing) through 6 tiers (FRAGILE → ORDINAIRE → FORTE → CULTE) up to **ICONE** (apex — sector reference, patrimony, Overton shifted, superfans in stable orbit). Note: CULTE is when the cult is formed; ICONE is when the cult crystallizes into icon status.

Three Laws of Trajectory: (1) Conservation of altitude (no silent regression — hash-chained intent log), (2) Stage sequencing (cascade A→D→V→E→R→T→I→S unidirectional unless explicit re-entry), (3) Fuel conservation (Thot tracks propellant, refuses combustions that would flame-out the mission).

**8 sub-systems** (4 Mission Tier + 4 Ground Tier). **Mission** : Propulsion (Artemis briefs + Ptah forge + Glory tools + sequences + superfans), Guidance (Mestor, manifests, pre-conditions, ADVERTIS rules), Telemetry (Seshat, Tarsis, NSP, scores, IntentEmission), Sustainment (Thot, cost gate, SLOs, post-conditions). **Ground** : Operations (Thot extension — finances, mobile-money), Crew Programs (Imhotep — talent, formation), Comms (Anubis — messaging, ad networks), Console/Admin (INFRASTRUCTURE — config, ecosystem).

Three decks: **Mission Control** (Console/UPgraders), **Cockpit** (founders), **Crew Quarters** (Agency/Creator). Plus the **Launchpad** (public Intake).

Decision rationale in [ADR-0001](docs/governance/adr/0001-framework-name-apogee.md). The previous candidate name MAAT is deprecated.

## Phase status (état réel du repo)

- **Phase 9** (Ptah Forge, ADR-0009) — ✅ shipped
- **Phase 10** (BrandAsset / Brand Vault, [ADR-0012](docs/governance/adr/0012-brand-vault-superassets.md)) — ✅ shipped
- **Phase 11** (Design System panda + rouge fusée, [ADR-0013](docs/governance/adr/0013-design-system-panda-rouge.md)) — ✅ shipped (PR #18)
- **Phase 12** (Prisma 6 → 7 + driver adapter) — ✅ shipped
- **Phase 13** (Oracle 35-section, [ADR-0014](docs/governance/adr/0014-oracle-35-framework-canonical.md) + [0015](docs/governance/adr/0015-brand-asset-kind-extension.md) + [0016](docs/governance/adr/0016-oracle-pdf-auto-snapshot.md)) — ✅ shipped (PR #25/#26, mai 2026)
- **Phase 14** (Imhotep full activation Crew Programs, [ADR-0019](docs/governance/adr/0019-imhotep-full-activation.md), supersedes ADR-0017) — ✅ shipped
- **Phase 15** (Anubis full activation Comms + Credentials Vault, [ADR-0020](docs/governance/adr/0020-anubis-full-activation.md) + [ADR-0021](docs/governance/adr/0021-external-credentials-vault.md), supersedes ADR-0018) — ✅ shipped
- **Phase 16** (Anubis extension : Notification real-time + MCP bidirectionnel, [ADR-0025](docs/governance/adr/0025-notification-real-time-stack.md) + [ADR-0026](docs/governance/adr/0026-mcp-bidirectional-anubis.md)) — ✅ shipped. NSP SSE broker + Web Push (VAPID/FCM) + templates Handlebars/MJML + digest scheduler ; MCP server agrégé `/api/mcp` exposé à Claude Desktop + MCP client entrant Slack/Notion/Drive/Calendar/Figma/GitHub via Credentials Vault. Cap APOGEE 7/7 maintenu (pas de 8ème Neter).
- **Phase 16** (`OPERATOR_AMEND_PILLAR` voie unique d'édition ADVE — [ADR-0023](docs/governance/adr/0023-operator-amend-pillar.md) + Console namespace cleanup [ADR-0024](docs/governance/adr/0024-console-oracle-namespace-cleanup.md)) — ✅ shipped (mai 2026). Modal cockpit ADVE + boutons recalculate RTIS + variable-bible `editableMode` + gate `applyPillarCoherenceGate` + `BrandAsset.staleAt` migration uniforme.
- **Phase 16 (suite — Glory tools as primary API surface)** ([ADR-0048](docs/governance/adr/0048-glory-tools-as-primary-api-surface.md), renuméroté depuis ADR-0028 le 2026-05-05 — voir note dans l'ADR) — ✅ shipped (mai 2026). Trois sous-phases : (16-A) tier gate générique sur `GloryToolDef.requiresPaidTier` + helper `checkPaidTier` (default tiers `COCKPIT_MONTHLY` + `RETAINER_*`, exclus one-shots `INTAKE_PDF`/`ORACLE_FULL`) ; (16-B) 3 Glory tools Higgsfield MCP-backed (DoP / Soul / Steal) + nouveau `GloryExecutionType="MCP"` + `mcpDescriptor` + branch `executeMcpTool` qui délègue à `anubis.invokeExternalTool` ; (16-C) OAuth 2.1 device flow (RFC 8628 + discovery RFC 9728) — premier connector OAuth du repo, pattern réutilisable pour Sora MCP / Runway MCP futurs ; 3 nouveaux Intent kinds Anubis (`ANUBIS_OAUTH_DEVICE_FLOW_START` / `_POLL` / `ANUBIS_OAUTH_REFRESH_TOKEN`) + 2 procédures tRPC + refresh transparent dans `mcp-client.ts`. **Cap APOGEE 7/7 préservé** (Higgsfield = connector externe, pas Neter, pas provider Ptah). Convention env var client_id : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.
- **Phase 17a — Refonte rigueur Artemis (mégasprint NEFER F1→F11)** ([ADR-0039](docs/governance/adr/0039-sequence-as-unique-public-unit.md) + [0040](docs/governance/adr/0040-uniform-section-sequence-migration.md) + [0041](docs/governance/adr/0041-sequence-robustness-loop.md) + [0042](docs/governance/adr/0042-sequence-modes-and-lifecycle.md)) — 🟡 partial-shipped (residual cleanup 1 mois — cf. [RESIDUAL-DEBT.md](docs/governance/RESIDUAL-DEBT.md) §Phase 17). Audit 11 failles structurelles d'Artemis : `EXECUTE_FRAMEWORK` et `EXECUTE_GLORY_SEQUENCE` au même rang public alors que sequence > framework. Mégasprint en 4 chantiers : **A** ✅ hiérarchie unique shipped (`RUN_ORACLE_FRAMEWORK` → `RUN_ORACLE_SEQUENCE` Intent kind présent + 24 `WRAP-FW-*` wrappers) ; **B** ✅ migration uniforme 35 sections → 35 sequences (21 nouvelles sequences `lifecycle: DRAFT`, promotion STABLE après 1 mois stress-test) ; **C** ✅ robustness loop (`topoSort<T>`, cache, quality gate **mode soft** 1 semaine post-merge → switch hard, migration Prisma `SequenceExecution.expiresAt|mode|lifecycle|promptHash`) ; **D** ✅ modes first-class + lifecycle versioning + Intent gouverné `PROMOTE_SEQUENCE_LIFECYCLE`. **Cap APOGEE 7/7 préservé**. Résidus : 24 wrappers + 21 sequences en DRAFT (timeline 1 mois), backward-compat `_oracleEnrichmentMode` (1 semaine), alias `refined` (1 mois).
- **Phase 17b — Deliverable Forge (output-first composition)** ([ADR-0050](docs/governance/adr/0050-output-first-deliverable-composition.md), renuméroté depuis ADR-0037 le 2026-05-05 — voir note dans l'ADR) — ✅ shipped (mai 2026). Surface cockpit `/cockpit/operate/forge` qui inverse le flow : le founder pointe le `BrandAsset.kind` matériel cible → resolver remonte le DAG des briefs requis (via `GloryToolForgeOutput.requires?: BrandAssetKind[]`) → vault-matcher ré-utilise les briefs ACTIVE non-stale + génère les manquants → composer construit une `GlorySequence` runtime ad-hoc dispatchée via `sequence-executor`. **Cap APOGEE 7/7 préservé**. 1 nouveau Intent kind `COMPOSE_DELIVERABLE` (sync dispatcher).
- **Phase 18** (audit ADR cohérence — résolution conflits 0028/0034 dus à PRs parallèles) — ✅ shipped (2026-05-05). Renumérotation `ADR-0028 Glory tools` → ADR-0048 (preserves chronologie first-come, ADR-0028 reste Strategy archive de PR #47) ; `ADR-0034 Brief mandatory gate` → ADR-0049 (ADR-0034 reste Console namespace cleanup). Mise à jour ~35 fichiers cross-refs (CLAUDE.md/CHANGELOG.md/LEXICON.md/12 src + 3 tests + 2 sibling ADRs). Notes "renumérotation" en tête des deux ADRs renommés. Cf. CHANGELOG v6.18.4.
- **Phase 18 (suite — Brand Tree multi-archétype + Matanga × FrieslandCampina)** ([ADR-0059](docs/governance/adr/0059-brand-tree-multi-archetype.md) + [ADR-0060](docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md) + [ADR-0061](docs/governance/adr/0061-brand-nature-archetypes-template.md) + [ADR-0062](docs/governance/adr/0062-morning-brief-batch-validation.md), renumérotés depuis 0052/0053/0054/0055 le 2026-05-06 lors du merge avec Phase 19 qui occupe déjà 0052-0058) — ✅ **noyau bouclé 2026-05-06** (CHANGELOG v6.18.18 → v6.18.25, branche `claude/pensive-keller-6afb14`). 12 commits + 21 migrations Prisma + 97+ tests anti-drift CI. Sub-phases livrées : **18-A0** (Brand Tree min + arborescence + 3 vues dashboard agence) ; **18-A1-α/β/γ/δ** (V4 alignment + import 5 sheets + CampaignChangeRequest + OperatorAction + Morning Brief Batch ingestion) ; **noyau N1+N2+N3+N4+N5+N6+N7+N8** (resolveEffectivePillars + cache + invalidation cascade + BrandContextNode tree-aware + RAG arborescent + Variable Bible classifier heuristique + Glory tools brand-aware + NARRATIVE_COHERENCE_GATE pre-flight + UI badge inheritance cockpit). Refonte structurante : `Strategy` plat → arbre de marque hiérarchique multi-archétype (9 BrandNature : PRODUCT/SERVICE/CHARACTER_IP/FESTIVAL_IP/MEDIA_IP/RETAIL_SPACE/PLATFORM/INSTITUTION/PERSONAL). Cascade FMCG 7 niveaux (CORPORATE → MASTER_BRAND → REGIONAL_CLUSTER → REGIONAL_BRAND → PRODUCT_LINE → PRODUCT_VARIANT → SKU). Driver business : ingestion FrieslandCampina + Cadyst Group/Farming/Grain + Fokou (5 clients) + dashboard agence cross-clients Afrique pour Matanga. **Invariant transverse Manual-first parity (ADR-0060)** respecté : toute feature LLM a son UI manuelle équivalente. **Cap APOGEE 7/7 préservé** — aucun nouveau Neter, sous-domaine de Mestor governance. Doctrine LLM NEFER §1.1 enrichie en parallèle (pas de notion de temps humain, pas d'économie de tokens, pas de fatigue). **Résidus reportés derrière formulaire opérateur** `/console/governance/phase-18-residuals` (model `Phase18ResidualEntry` + router `phase18Residuals.upsert/resolve/dismiss/list/stats`) : N5-bis (Bible reclassif manuelle ~300 entrées domain-business), N6-bis (annotation 56 Glory tools), N9 (script duplicate-pillars), N10 (feature flag rollout), LLM Phase 2 fine-tune (post-30j prod), Cache Redis cross-pod, Phase 18-bis (M&A + 8 archétypes non-PRODUCT, 3 mois). NEFER doit query `phase18ResidualEntry pending` en début de session future avant toute action Phase 18. Cf. [RESIDUAL-DEBT.md §Phase 18](docs/governance/RESIDUAL-DEBT.md) + memory user `phase_18_residuals_pending.md`.
- **Phase 21 polish** — Payment provider secrets stay in env vars ([ADR-0075](docs/governance/adr/0075-payment-secrets-in-env.md), 2026-05-08) — ✅ chantier light shipped (v6.22.2). Formalise la décision sécurité existante (`Secrets STAY in env vars (never in DB)` du model `PaymentProviderConfig`). UI guide step-by-step `/console/socle/pricing` (env vars Vercel → toggle enabled → webhook URL provider). Server-side guards `adminUpdateProviderConfig` : reject secrets-like keys dans `config` JSON + reject `enabled=true` si pas configured. 11 tests anti-drift mode HARD. Cap APOGEE 7/7 préservé. ADR clarifie la frontière vs ADR-0021 Credentials Vault (per-operator) : payment keys sont system-wide donc env vars suffisent.
- **Phase 21 closure** — Mégasprint NEFER complet ([ADR-0074](docs/governance/adr/0074-phase-21-closure.md), 2026-05-08) — ✅ **mégasprint closed** (v6.22.1). 7 sub-phases livrées sur main direct (F-A LLM enforcement → F-A.5 readiness UI parity → F-B OracleSection → F-C generate Intent → F-D assembler manual-first → F-E NSP SSE → F-F UI progressive → F-G+H tests intégration + docs). 125 tests anti-drift passing dont test HARD `assembler-uses-manual-path` (interdit `executeStructuredLLMCall`/`executeSequence`/`executeFramework`/`executeTool`/`callLLM` direct). Cap APOGEE 7/7 préservé. Cohabitation `enrichOracle` legacy maintenue. Résidus consolidés dans [RESIDUAL-DEBT.md](docs/governance/RESIDUAL-DEBT.md) §Phase 21 mégasprint closure : annotation per-tool 56+ Glory tools + 24 frameworks (5 batchs), hook auto-seed Strategy, runner annotation explicite, deprecation `enrichOracle` après audit completion.
- **Phase 21 F-F** — Oracle Progressive UI ([ADR-0073](docs/governance/adr/0073-oracle-progressive-ui.md), 2026-05-08) — ✅ chantier F-F shipped (v6.22.0). Hook `useOracleStream(strategyId)` consume `/api/notifications/stream` SSE existant (Phase 16) + filtre par `strategyId`. 3 composants UI canoniques : `OracleSectionCard` (status + bouton contextuel Générer/Régénérer/Retry, précédence stream > dbStatus), `OracleLiveConsole` (terminal-style log temps-réel auto-scroll), `OracleSectionFailureModal` (détail erreur Zod + aide contextuelle). Panel `OracleProgressivePanel` orchestrateur (header stats + bouton Assembler scope dropdown + progress bar live + grid 35 sections + modal overlay) inséré dans `proposition/page.tsx` **en cohabitation** avec legacy `enrichOracle`. Cap APOGEE 7/7 préservé. 20 tests anti-drift passing. Mégasprint Phase 21 fonctionnellement complet — reste F-G (tests intégration end-to-end) + F-H (docs régen).
- **Phase 21 F-E** — Oracle progress streaming NSP SSE ([ADR-0072](docs/governance/adr/0072-oracle-progress-streaming.md), 2026-05-08) — ✅ chantier F-E shipped (v6.21.2). 6 sub-kinds discriminés ajoutés à `NspEvent` (`oracle_section_started/completed/failed` + `oracle_assembler_started/progress/done`). Helper canonique `oracle-section/stream-events.ts` avec 6 emitters typés + `bestEffort()` (jamais throw). Wired dans `generateOracleSectionHandler` (STARTED après lock + COMPLETED success OR FAILED runner/persist) et `assembleOracleHandler` (STARTED + PROGRESS par itération avec `currentSectionId` + DONE final). Hiérarchie naturelle interlacée — frontend voit assembler + sub-sections sans configuration. 15 tests anti-drift passing dont régression manual-first parity F-D maintenue. Cap APOGEE 7/7 préservé.
- **Phase 21 F-D** — Oracle Assembler manual-first orchestrator ([ADR-0071](docs/governance/adr/0071-oracle-assembler-manual-first.md), 2026-05-08) — ✅ chantier F-D shipped (v6.21.1). Nouvel Intent kind `ASSEMBLE_ORACLE` qui émet `GENERATE_ORACLE_SECTION` × N au lieu de dispatcher inline. Scope `ALL` / `MISSING` / `STALE` / explicit sectionIds. Mode auto-détecté par section. Resilient try/catch — un FAILED individuel ne fait pas remonter l'orchestrator. Status global COMPLETE/PARTIAL/EMPTY. **Test bloquant `assembler-uses-manual-path.test.ts` mode HARD** (pas de baseline) interdit `executeStructuredLLMCall`/`executeSequence`/`executeFramework`/`executeTool`/`callLLM` direct dans le handler — manual-first parity (ADR-0060) enforced. tRPC `oracle.assembleOracle` mutation. 12 tests anti-drift passing. Cap APOGEE 7/7 préservé. Coexistence legacy `enrichOracle` (~1300 lignes) — deprecation après F-F audit.
- **Phase 21 F-C** — GENERATE_ORACLE_SECTION Intent + handler ([ADR-0070](docs/governance/adr/0070-generate-oracle-section-intent.md), 2026-05-08) — ✅ chantier F-C shipped (v6.21.0). Point de jonction F-A × F-B. Nouvel Intent kind ARTEMIS async + payload TS `{ strategyId, sectionId (1..35), mode: FRESH/REGEN/RETRY, operatorId }` + SLO p95 25s/cost 0.10$. Handler `oracle-section/handler.ts` : lock optimistic → dispatch runner (GLORY_SEQUENCE/FRAMEWORK/GLORY_TOOL) → recordSuccess/Failure avec erreur normalisée (LLMStructuredCallError → ZOD_VALIDATION_FAILED). Mestor dispatch case + tRPC router `oracle` (5 procédures : listSections/getSection/snapshotStrategy/generateSection/retrySection). 11 tests anti-drift passing. Cap APOGEE 7/7 préservé. Débloque F-D (Assembler manual-first orchestrator) — l'Assembler émettra 35× ce kind au lieu de dispatcher inline.
- **Phase 21 F-A.5** — Readiness UI parity ([ADR-0069](docs/governance/adr/0069-readiness-ui-parity.md), 2026-05-08) — ✅ mini-chantier shipped (v6.20.2). Ferme le drift 3-sources sur statut pillaire : chip Notoria affichait COMPLET alors que veto serveur disait PILLAR_STALE. `notoria.getDashboard` consomme désormais `getStrategyReadiness()` (source canonique) + nouveau champ `byPillar[k]` avec `stale`/`displayLabel`/`rtisCascadeReady`. Helper UI canonique `getPillarChipStatus` (précédence stale > FULL/COMPLET) consommé par `notoria-page.tsx`. Tests anti-drift 21/21 passing dont mode soft baseline 5 sur patterns `cl[k] === "COMPLET"` dans `src/components/`. Cap APOGEE 7/7 préservé.
- **Phase 21 F-B** — OracleSection first-class entity ([ADR-0068](docs/governance/adr/0068-oracle-section-first-class-entity.md), 2026-05-07) — ✅ chantier F-B shipped (v6.20.1). Modèle Prisma `OracleSection` (35 sections × strategyId) + 2 enums (`OracleTier` CORE/BIG4_BASELINE/DISTINCTIVE, `OracleSectionStatus` PENDING/GENERATING/COMPLETE/FAILED/STALE) + service `oracle-section/` 11 fonctions (lifecycle propre, lock optimistic + TTL 25s + `staleAt` clear on COMPLETE + lazy seed transparent). `SectionMeta.runner` descripteur de génération (`GLORY_SEQUENCE`/`GLORY_TOOL`/`FRAMEWORK`) + helper `resolveSectionRunner()` backward-compat avec `sequenceKey` legacy. 11 tests anti-drift passing. Cap APOGEE 7/7 préservé. Débloque F-C (Intent `GENERATE_ORACLE_SECTION`), F-D (Assembler manual-first), F-E (NSP SSE streaming), F-F (UI progressive).
- **Phase 21 F-A** — LLM output structured enforcement ([ADR-0067](docs/governance/adr/0067-llm-output-structured-enforcement.md), 2026-05-07) — ✅ chantier F-A shipped (v6.20.0). Mécanique transverse `executeStructuredLLMCall` (helper `deriveJsonSchemaFromZod` + wrapper retry-on-zod-fail x2 + `responseFormat: 'json_object'` au LLM Gateway). 4 flows migrés : `engine.executeTool`, `executeFramework`, `vault-enrichment` (coercion silencieuse SUPPRIMÉE), `pillar.previewAmend` (fin du stub passthrough). Type-level contract `outputSchema?: ZodType` + `_noSchemaJustification` mutually exclusive sur `GloryToolDef` + `FrameworkDef`. Tests anti-drift G2/G3/G7/G8 en mode soft (25/25 passing). Cap APOGEE 7/7 préservé. Migration per-tool des 56+ Glory tools LLM + 24 frameworks tracée [RESIDUAL-DEBT.md §Phase 21](docs/governance/RESIDUAL-DEBT.md).
- **Phase 19** (Campaign tracker L2 Instrumental — double-layer canonical, [ADR-0052](docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md) v2) — ✅ shipped Vague 1+2+3 (mai 2026). Module Campaign upgrade en double-couche : L1 Operational (existant inchangé) + L2 Instrumental (lecture composée orchestrée cross-Neteru). **Les 8 clusters A→H de l'ADR-0052 §16 matrice d'absorption sont couverts.** **Vague 1** (Cluster A Trajectoire + B Cohérence narrative) — 6 Intent kinds + 6 handlers + pages Cockpit/Console. **Vague 2** (Cluster C Superfan economy + D Signaux faibles & culture) — 6 Intent kinds + 6 handlers + 2 modèles légers (`TarsisCaptureSession`, `CampaignContextIngest`). **Vague 3** (Cluster E Boucles d'apprentissage + F Économie agence + G Souveraineté opérationnelle + H Negative space audit) — 9 Intent kinds + 9 handlers + 14 nouveaux types DTO. **22 sous-clusters totaux** (5 READY + 11 PARTIAL + 6 STUB). Service `campaign-tracker/` 21 capabilities + 22 procedures tRPC + dependencies mestor+artemis+thot+seshat+anubis+imhotep. **57 tests anti-drift** (cluster coverage A→H + 21 Intent kinds + SLOs + manifest + helpers purs Jaccard). **Cap APOGEE 7/7 préservé**. Trois primitives architecturales OS-natives mobilisées (Capability flags 4-états + STUB→MVP→PRODUCTION + double-layer L1/L2). Promotions `MVP → PRODUCTION` futures via ADRs enfants `0052-B/C/D/E/F` — cf. [RESIDUAL-DEBT.md](docs/governance/RESIDUAL-DEBT.md) §Phase 19.
- **Phase 22 — Argos by LaFusée** (Seshat reference harvester + propriété média indépendante, [ADR-0083](docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md)) — 📋 **PLANNED** (formalisé 2026-05-15, commits `82acd53` / `4f001a4` / `28dbb95`). Sous-domaine Seshat (frère de Tarsis) + sub-agent Hunter 4-phases producteur de `CampaignReferenceDossier` signés + projection publique `apps/argos/` (auto-publish on `safety.verdict === 'PASS'`). Sub-phases 22-A0 backend port → A1 bridge Artemis → A2 retarget UI (3 swaps, code vendorisé tel quel) → A3 cross-links landing↔Argos → A4 newsletter (post-MVP). **Pré-lecture obligatoire** avant toute action : REFONTE-PLAN.md Phase 22 + `_bmad-output/project-context.md §27-bis` + `docs/external-design/argos-hunter-v1/VENDOR-NOTICE.md` (3 interdits absolus). **NE PAS auto-shiper** — trigger port = demande explicite. **Cap APOGEE 7/7 préservé** (Hunter = sub-agent, pas Neter).
- **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION** — ✅ **SHIPPED 2026-05-29 — all 7 epics closed (53/53 stories), closure-roadmap target #1 SHIPPED**. Closure-roadmap target #1 (anciennement Phase 22 pré-rename 2026-05-15). PRD + UX + architecture + epics livrés (`_bmad-output/planning-artifacts/`). 9 décisions D1-D9 + 7 patterns P22-1..7 + **5 child ADRs créés 0077-0081** (parent ADR-0077 + 4 stubs accepted, finalisation Epic 7 Story 7.9) + **53 stories réparties en 7 epics**. Owning Neteru : **Seshat · Anubis · Artemis · Mestor** (Ptah dropped par architecture step-02 — pas de scope forge). Surface réelle (post-correction PRD scope par architecture D1, cf. [ADR-0077](docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)) : 2 connector façades Tarsis API + CRM via Credentials Vault + 1 lifecycle Intent paramétré `PROMOTE_PIVOT_SUBCLUSTER` + 1 calibration async Intent `RUN_ATTRIBUTION_CALIBRATION` + ML calibration pure-TS sans dépendance + manual-first parity HARD-test + 1 Cockpit route mountant `<OvertonRadar>` existant. **0 new Prisma model** (additive nullable fields only — migration `20260516000000_phase23_campaign_additive_fields` shipped Epic 1 Story 1.6). Cap APOGEE 7/7 préservé. Progress Epic 1 : **10/10 stories shipped** au 2026-05-27 (Stories 1.8 `BRIEF_VS_ADVE_COHERENCE` gate scaffold + 1.9 doc-sync convergence + back-filled story-file artefacts for Stories 1.1–1.7 + 1.10 — implementations shipped 2026-05-16/17 via commits `00ceb02` / `7421f56` / `b271a61` / `3658e8c` / `febfe94` / `af75515` / `ebeae07` / `1a38279`). 10 story-file context-engine artefacts under [_bmad-output/implementation-artifacts/](_bmad-output/implementation-artifacts/). Doctrine canon : [STATE_FINAL_BLUEPRINT.md](docs/governance/STATE_FINAL_BLUEPRINT.md) (2026-05-16) + 4 nouveaux ADRs [0084](docs/governance/adr/0084-os-architecture-8-canonical-layers.md) / [0085](docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md) / [0086](docs/governance/adr/0086-brand-maturity-score-canonical.md) / [0087](docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md) + ADR-0082 amendée (Yggdrasil ungoverned). **Epic 1 + Epic 2 + Epic 3 + Epic 4 + Epic 5 + Epic 6 closed — Epic 7 (Cockpit Overton Surface + Phase 23 Closure) next**. Epic 2 (External Signal Connectors via Credentials Vault) **5/5 stories shipped 2026-05-27** via commits `02a488a` (Tarsis + CRM façades, Stories 2.1-2.3), `b8ed770` (Console Vault UI extension, Story 2.4), `63c7787` (HARD test activation, Story 2.5). Pattern P22-1 (`ConnectorResult<T>` discriminated union) now structurally enforced via HARD test. Mock period strategy : `_mocked: true` payloads + Story 6.3 Mestor gate refusing PRODUCTION promotion on mocked-data calibration snapshots. Epic 3 (Overton Measurement Wiring) **8/8 stories shipped 2026-05-28** : Stories 3.1 (sector-intelligence extension `aac5f3a`) + 3.2 + 3.3 + 3.4 (culture.* delegation bundle `0022de0`) + 3.5 (`culture.mcpIngest` two-stage PII classifier gate `0f6234f`) + 3.6 (Oracle §34 Overton-distinctive consumes real signal via `OvertonRealSignal` discriminated union `16bd7fe`) + 3.7 (manual operator-tagged Overton-delta UI + new `OPERATOR_TAG_OVERTON_DELTA` Intent `4de7016`) + 3.8 (HARD `phase22-no-silent-zero.test.ts` activated for Overton scope `9370b99`). The Overton mechanic is now off Phase 19 Jaccard placebo end-to-end : measurement → connector wiring → ingestion gate → deliverable surface → operator parity → CI guard. Cap APOGEE 7/7 preserved. **31 story-file context-engine artefacts** under `_bmad-output/implementation-artifacts/`. Epic 4 (Superfan Measurement) **8/8 stories shipped 2026-05-28** : 4.1 `AttributionResult` discriminated union (`edbe5ec`) + 4.2 pure-TS logistic regression / ROC AUC / RMSE (`82e62d0`) + 4.3 cohort retention from CRM connector (`388db89`) + 4.4 evangelist count + lineage from devotion transitions (`07e959a`) + 4.5 manual coefficient-entry mode (`9b8af8f`) + 4.6 Console operator attribution-lineage view (`getAttributionLineage` resolver + tRPC + Console section) + 4.7 Cockpit `EvangelistLineageView` (paid-tier-gated `getFounderAttributionLineage`, read-only, DS-compliant) + 4.8 `phase22-no-silent-zero.test.ts` HARD extension to superfan paths. The superfan-attribution mechanic is now defensible end-to-end : types → regression → connector wiring → lineage → manual parity → operator + founder views → CI guard. **NB — live-data UI happy path blocked locally** by a pre-existing failed dev-DB migration (`20260506122306_phase18_brand_tree`, P3009 ; DB 8 migrations behind) ; Stories 4.6/4.7 code verified by tsc + lint + 87 tests + DS/governance anti-drift + route compilation/render, the dev DB was **subsequently repaired** (2026-05-29 : `prisma migrate status` clean, 24 migrations applied, `prisma validate` ok, `next build` exit 0) — live verification is **no longer blocked**. Epic 5 (Measurement Glory Tools HYBRID + N6-bis) **6/6 stories shipped 2026-05-28** (v6.23.17) : 5.1 `GloryToolDef` HYBRID type + `defineHybridTool` factory + `GloryToolNature` + `manualFormSchema` field ; 5.2 `executeHybridTool` dispatcher (LLM-or-manual, reuses `executeTool`, drops to manual prompt on Zod-fail) + `getHybridManualForm` JSON-Schema projection ; 5.3 the 5 measurement tools (`big-idea-coherence-checker` / `myth-arc-cohesion-evaluator` / `crew-performance-evaluator` / `negative-space-auditor` / `mcp-content-pii-classifier`) → HYBRID with Zod `outputSchema` (prompts unchanged ; `postmortem-12q` stays LLM) ; 5.4 `applicableNatures` annotated (N6-bis structural closure for these 5 — `phase18ResidualEntry` row flips deferred behind dev-DB repair) ; 5.5 Console `/console/artemis/tools` peer-toggle UI (`hybrid-tool-panel.tsx`, schema-driven form, `operatorProcedure` read + `governedProcedure` mutation, DS-compliant) ; 5.6 HARD `phase22-glory-hybrid.test.ts` (5 HYBRID + parity + natures + forbidden-otherwise) + `assembler-uses-manual-path.test.ts` extended (existence-guarded scan of Epic 6 `lifecycle.ts`/`calibration.ts`). Manual-first parity (ADR-0060) now structural for measurement tools. **37 story-file context-engine artefacts** under `_bmad-output/implementation-artifacts/`. Live-data browser verification of the peer-toggle remains blocked by the same dev-DB migration failure (compile-verified via tsc + DS anti-drift). Epic 6 (Calibration Review + Governed Lifecycle Promotion) **7/7 stories shipped 2026-05-29** : backend spine 6.1 `RUN_ATTRIBUTION_CALIBRATION` handler (`f1ac539`, v6.23.18) + 6.2 `PROMOTE_PIVOT_SUBCLUSTER` handler + 6.3 Mestor pre-flight gate `calibration-snapshot-required` + 6.7 two HARD tests (`ada8322`, v6.23.19) ; operator UI 6.6 `SubClusterStatusCell` + `ProvenancePopover` (Phase-22 reusable patterns) + 6.4 `CalibrationReviewPanel` (dialog+inline dual host, metrics-as-data values-vs-thresholds, Auto/Manual peer tabs, NSP SSE progress via `useCalibrationStream`, Accept-rouge→run+promote / Reject-ghost, UX-DR14 confirmation) + 6.5 `CampaignTrackerHub` B1/B2/B3 view switcher (localStorage-persisted) wired into `/console/governance/campaign-tracker` (v6.23.20). 3 new `campaignTracker` tRPC procedures (`runAttributionCalibration` / `promotePivotSubcluster` / `listCalibrationSnapshots`) governed via `mestor.emitIntent`. `CALIBRATION_THRESHOLDS = { rocAucMin: 0.7, rmseMax: 0.3 }` (ADR-0081 §4). **0 new Prisma model** (P22-6). Cap APOGEE 7/7 preserved ; tsc + eslint clean ; 888 tests green. **44 story-file context-engine artefacts**. Epic 7 (Cockpit Overton Surface + Phase 23 Closure) **10/10 stories shipped 2026-05-29 — Phase 23 CLOSED** (commits `5ffe573` → `cb2bffc`) : 7.1 `<OvertonRadar>` rewritten on `ConnectorResult<OvertonRadarSignal>` (domain view-model) + `instance` CVA variant + manifest v2.0.0 + stories ; 7.2 A2 split (`@container` queries) ; 7.3 honest DEFERRED/DEGRADED/per-axis states ; 7.4 `cockpitDashboard.overtonSignal` query (`protectedProcedure` tenant-scoped + paid-tier `TIER_GATE_DENIED` arm, composes sector axis + pillar-D + Tarsis façade, P22-1 exhaustive) + `<OvertonPanel>` wrapper (Suspense boundary) ; 7.5 route `/cockpit/intelligence/overton` (read-only by procedure type, FR32) ; 7.6 dashboard `OvertonTeaser` + "Nouveau" cue ; 7.7 cockpit "Intelligence" nav group ; 7.8 `overton-radar.a11y.spec.ts` (a11y + visual baselines — axe-dep + baseline-gen done-with-debt) ; 7.9 retired the 5 phantom ADR slugs (HARD `phase22-no-dangling-adr-refs` 0 hits) + finalized ADRs 0077-0081 Accepted ; 7.10 closure (campaign-tracker-coherence extended to assert 7 pivot sub-clusters ≥ MVP, maps finalized, MISSION §9 3 boxes annotated *cochable*, RESIDUAL-DEBT Phase 23 closure section, closure-roadmap target #1 → SHIPPED). Cap APOGEE 7/7 preserved ; tsc + eslint clean ; full governance suite green. **PRODUCTION promotion of calibrated sub-clusters + MISSION §9 checkbox flips gated on direction sign-off of ROC AUC/RMSE thresholds** (RESIDUAL-DEBT Phase 23 closure). The two mission-pivot mechanics (superfans × Overton) are off the Phase 19 Jaccard placebo end-to-end and founder-visible.
- **Phase 30 — Yggdrasil canonization** ([ADR-0082](docs/governance/adr/0082-yggdrasil-value-circulation-substrate.md), 2026-05-15 · **amended 2026-05-16**) — ✅ **doc-shipped + amended** (canonization du substrat). Yggdrasil = substrat canonique de circulation de la valeur dans La Fusée OS, **ungouverné** (organique, comme NSP, comme la layering cascade). **Les gates Yggdrasil appartiennent à Mestor** (`services/mestor/gates/*`) mais le substrat lui-même n'a pas de gouverneur Neter. 3 invariants (Q1 traçabilité / Q2 observabilité / Q3 gates d'entrée gouvernées par Mestor). **Pas un Neter** — substrat. Cap APOGEE 7/7 préservé. Propagation 7 sources : LEXICON entrée `YGGDRASIL` + PANTHEON §7 Substrats + APOGEE §4.2 + cette section + (BRAINS const + Governor type inchangés). Amendment 2026-05-16 per [STATE_FINAL_BLUEPRINT §5.2](docs/governance/STATE_FINAL_BLUEPRINT.md) — la formulation "gouverné par Mestor" était doctrinalement incorrecte ; corrigée vers "gates Mestor, substrat ungouverné". Follow-up Phase 30-bis : anti-drift test `yggdrasil-three-invariants.test.ts` (soft baseline → HARD après stress-test 1 mois). Aucun code touché par la canonization.
- **Phase 23 governance canon shipped 2026-05-17** (post-STATE_FINAL_BLUEPRINT alignment, cf. [sprint-change-proposal-2026-05-16.md](_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md)) — ✅ **doc-shipped**. 4 nouveaux ADRs : [ADR-0084](docs/governance/adr/0084-os-architecture-8-canonical-layers.md) (8 couches OS canon), [ADR-0085](docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md) (cascade refresh STOP at Jehuty, décision opérateur manuelle obligatoire pour ADVE write), [ADR-0086](docs/governance/adr/0086-brand-maturity-score-canonical.md) (système de score multi-dimensions 8 dimensions canoniques — impl Phase 24 closure-target #15), [ADR-0087](docs/governance/adr/0087-thot-formula-engine-seshat-zone-indices.md) (architecture économique runtime Thot formula + Seshat zone-indices, no static FCFA grid — impl Phase 26 closure-target #18). ADR-0082 amendée (Yggdrasil ungoverned). Closure-roadmap promue 13 → 19 targets ([closure-roadmap.md](_bmad-output/planning-artifacts/closure-roadmap.md)). Cap APOGEE 7/7 préservé. Aucun code touché.

## Oracle (livrable client)

**35 sections / 3 tiers** — `SECTION_REGISTRY` dans `src/server/services/strategy-presentation/types.ts`. Tiers :
- **CORE** (23) : sections actives historiques Phase 1-3 ADVERTIS + Mesure + Operationnel + Imhotep Crew Program (#34) + Anubis Plan Comms (#35) — promues CORE Phase 17 cleanup ADR-0045
- **BIG4_BASELINE** (7) : McKinsey 7S, BCG Portfolio, McKinsey 3-Horizons, Bain NPS, etc.
- **DISTINCTIVE** (5) : Cult Index, Manipulation Matrix, Devotion Ladder, Overton, Tarsis
<!-- DORMANT tier supprimé Phase 17 cleanup ([ADR-0045](docs/governance/adr/0045-dormant-cleanup-post-phase-14-15.md), shipped 2026-05-04). 23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE = 35 sections (sections 34/35 Imhotep/Anubis promues CORE post-Phase 14/15). -->

## Design System (panda + rouge fusée)

**Phase 11 ✅ shipped.** Read [docs/governance/DESIGN-SYSTEM.md](docs/governance/DESIGN-SYSTEM.md) before touching any UI surface. ADR fondateur : [ADR-0013](docs/governance/adr/0013-design-system-panda-rouge.md).

Palette **panda noir/bone + accent rouge fusée** (cf. [design-tokens/reference.md](docs/governance/design-tokens/reference.md)). Cascade 4 tiers obligatoire :

```
Tier 0 Reference (--ref-*)  →  Tier 1 System (--color-*)  →  Tier 2 Component (--button-*, --card-*, ...)  →  Tier 3 Domain (--pillar-*, --division-*, --tier-*, --classification-*)
```

**Trois interdits absolus DS** (drift signals — voir [DESIGN-SYSTEM.md §4](docs/governance/DESIGN-SYSTEM.md)) :
1. Aucun composant `src/components/**` ne consomme un Reference token directement (`var(--ref-*)`). Toujours via System/Component/Domain. Test bloquant `tests/unit/governance/design-tokens-cascade.test.ts`.
2. Aucune classe Tailwind couleur brute (`text-zinc-500`, `bg-violet-500`, `border-emerald-700`, hex direct) hors `src/components/primitives/**` + `src/styles/**`. Codemod (PR-3) + ESLint `lafusee/design-token-only` + test bloquant `tests/unit/governance/design-tokens-canonical.test.ts`.
3. Aucun variant inline en `.join(" ")` ou ternaire quand >1 variant existe. CVA obligatoire (`class-variance-authority` déjà en deps). Test bloquant `tests/unit/governance/design-primitives-cva.test.ts`.

Documentation : [DESIGN-LEXICON.md](docs/governance/DESIGN-LEXICON.md) (vocabulaire visuel), [DESIGN-TOKEN-MAP.md](docs/governance/DESIGN-TOKEN-MAP.md) (inventaire tokens), [DESIGN-MOTION.md](docs/governance/DESIGN-MOTION.md), [DESIGN-A11Y.md](docs/governance/DESIGN-A11Y.md), [DESIGN-I18N.md](docs/governance/DESIGN-I18N.md), [COMPONENT-MAP.md](docs/governance/COMPONENT-MAP.md). Migration trackée Phase 11 dans [REFONTE-PLAN.md](docs/governance/REFONTE-PLAN.md).

## Active refactor — read this before any non-trivial change

A multi-phase governance refonte is in flight. Read [docs/governance/REFONTE-PLAN.md](docs/governance/REFONTE-PLAN.md) — it is the source of truth for current architectural direction.

Refactor Code of Conduct (Phase 0, mandatory):
- Every PR is labeled `phase/0`...`phase/9` (`phase/9` = Ptah Forge sub-phases A→K) or `out-of-scope`.
- `out-of-scope` requires written justification and tech-lead approval.
- Zero new bypass governance allowed. New features that need Mestor go through Mestor in the same PR.
- Zero new `* 2/` numbered duplicate folders.
- Feature freeze partial through Phase 5.

## Deeper context

For semantic project context (pillar semantics, philosophy, Mestor swarm details, Console levels, LLM architecture decisions, the 9 stub routers from the Windows machine), see [docs/governance/context/MEMORY.md](docs/governance/context/MEMORY.md) and the files it indexes.

## Stack

Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7 (PostgreSQL) + NextAuth v5. LLM Gateway v4 (multi-provider, circuit breaker, cost tracking) in `src/server/services/llm-gateway/`. Hybrid RAG + multi-provider embeddings (Ollama → OpenAI → no-op) since V5.2. Vitest 4 + Playwright 1.59 for tests. CVA 0.7 for design-system variants. ESLint 10 + madge 8 enforce the layering cascade.

## Conventions (already enforced or in flight via refonte)

- Layering strict (will be enforced via `eslint-plugin-boundaries` + `madge --circular` in Phase 0):
  ```
  domain → lib → server/governance → server/services → server/trpc → components/neteru → app
  ```
- Pillar enum `["A","D","V","E","R","T","I","S"]` is being centralized in `src/domain/pillars.ts` (Phase 1). Do not hardcode.
- Conventional Commits enforced via commitlint (Phase 0).
- Migrations Prisma versionnées (`prisma migrate dev`) — pas de `db push` (Phase 5).

## Tone

User prefers terse, direct responses. No trailing recaps of completed work. Code over commentary. Production-quality only — no half-finished implementations, no scaffolding for hypothetical futures.
