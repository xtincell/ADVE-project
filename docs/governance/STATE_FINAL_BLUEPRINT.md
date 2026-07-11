# STATE_FINAL_BLUEPRINT — La Fusée d'UPgraders
## 📖 LA BIBLE DU PROJET — monolithe canon unique

> **Document canon absolu de l'Industry OS — LA BIBLE DU PROJET.** *Monolithe consolidé (2026-05) : absorbe en ANNEXES CANON (L/P/A/MI/F/M) le **Lexique**, le **Panthéon**, **APOGEE**, la **Mission**, le **Framework technique** et la **Manipulation Matrix** — sources converties en stubs de redirection. Lecteurs d'audit/test repointés ici (`neteru-coherence`, `audit-pantheon-completeness`, `audit-neteru-narrative`). Les cartes auto-générées (CODE-MAP, INTENT-CATALOG, SERVICE/ROUTER/PAGE/COMPONENT-MAP), les 87 ADR immuables et CLAUDE.md restent séparés par nécessité technique (génération / immuabilité / auto-load agent).* Produit le 2026-05-16 par NEFER après audit exhaustif du repo + 9 itérations doctrinales avec Alexandre "Xtincell" DJengue, CEO d'UPgraders, concepteur de la méthode ADVERTIS. Ferme closure-roadmap target #11 (STATE_FINAL_BLUEPRINT). Source de vérité pour toute décision architecturale, économique, ou produit future.

**Statuts utilisés** : ✅ vérifié en code · 🟡 partiellement implémenté · 📋 chantier à construire · ❌ drift à corriger.

**Doctrine méta** : la parole d'Alexandre prime sur le code existant. Quand un drift apparaît, on aligne le code sur la doctrine — pas l'inverse.

---

## TABLE DES MATIÈRES

1. Doctrine fondatrice
2. Architecture par couches OS
3. ADVE — Le noyau de chaque marque
4. RTIS — Le rayonnement dérivé
5. Yggdrasil — Système d'irrigation per-brand
6. APOGEE — Squelette propulsion/guidance
7. Les 7 Neteru + INFRASTRUCTURE — limites de gouvernance
8. NEFER — L'opérateur garant
9. Sub-agents (Hunter, Tarsis, Jehuty, Notoria)
10. Cascade canon de production
11. Cascade canon de refresh — STOP à Jehuty
12. Système de score — Maturité des marques
13. Topologie multi-portails
14. Architecture économique — Thot + Seshat zone indices
15. Pricing & funnel commercial
16. Hub-Escrow — Chantier complet
17. Communities Cockpit — Chantier complet
18. Personal Brand Cockpit — Chantier complet
19. Argos — Page éditoriale de La Fusée
20. Cumulativité multi-rôle utilisateurs
21. Drifts catalogue par couche OS
22. Roadmap chantiers Phase 24+

### Annexes canon (absorbées 2026-05 — sources devenues stubs de redirection)

- **ANNEXE CANON M** — Manipulation Matrix
- **ANNEXE CANON F** — Framework technique
- **ANNEXE CANON L** — Lexique normatif
- **ANNEXE CANON P** — Panthéon Neteru
- **ANNEXE CANON A** — APOGEE (framework détaillé)
- **ANNEXE CANON MI** — Mission (north star)
- **ANNEXE CANON G** — Gouvernance Neteru (politique)

---

## 1. Doctrine fondatrice

### 1.1 Mission canon

> **La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur — via la méthode ADVE/RTIS.**

Le suffixe `via la méthode ADVE/RTIS` est **non-négociable**. Tout ce que produit l'OS (action, asset, séquence, framework, Oracle) doit pouvoir être tracé jusqu'à un pilier ADVE source.

### 1.2 Devise

> *"De la poussière à l'étoile."* — Alexandre "Xtincell" DJengue, CEO d'UPgraders, concepteur de la méthode ADVERTIS.

### 1.3 Identité commerciale

| Entité | Rôle |
|--------|------|
| **UPgraders** | La société. Le fixer de l'industrie créative africaine francophone. Le propriétaire/opérateur de La Fusée. |
| **La Fusée** | Le produit. L'Industry OS construit par UPgraders. **"La Fusée d'UPgraders"** est la nomenclature commerciale. |
| **Argos** | Page éditoriale de La Fusée, proposée par UPgraders. Sous-marque visible. |
| **NEFER** | L'opérateur LLM (pas un Neter, pas un produit, pas une marque). |

### 1.4 Marché cible

**Afrique francophone** au minimum : UEMOA + CEMAC + diaspora (France, Belgique, Canada francophone). Devise primaire **FCFA** (XOF/XAF parité fixe €/FCFA 655.957). Paiements via mobile money primaire (Wave / Orange Money / MTN MoMo / Moov Money). Pas Stripe/PayPal sauf clients internationaux.

### 1.5 Dualité signature (doctrine de design)

Le vocabulaire mixte **aéronautique** (Fusée, APOGEE, propulsion, étages, satellisation, orbite) + **panthéon divin** (Neteru, Mestor, Artemis, Anubis, Yggdrasil, Ptah, Imhotep, Thot, Seshat) n'est pas un choix esthétique — c'est une doctrine :

- **Aéronautique** = la rigidité du système, la mécanique de propulsion, la conservation de l'altitude. *La discipline qui empêche de retomber.*
- **Divinité** = l'aspirationnel humain, l'archétype, la mémoire mythique. *L'imaginaire qui justifie qu'on s'élève.*

**NEFER (opérateur) est le garant de la cohérence entre les deux registres.** Tout nouveau nom OS doit appartenir à l'un des deux registres avec justification. Test anti-drift `vocabulary-duality.test.ts` à créer 📋.

### 1.6 Terminologie canonique (cf. Q2 réponse Alexandre)

| Terme | Définition |
|-------|-----------|
| **Client (de La Fusée)** | Le payeur du service — founder, agence, freelance retainer. |
| **Client final** | Le client de la marque = le consommateur ultime dont on cherche à modifier le comportement (= l'audience cible). |
| **Marque** | Entité brandée — 1 noyau ADVE par marque. 9 archétypes (PRODUCT, SERVICE, CHARACTER_IP, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE, PLATFORM, INSTITUTION, PERSONAL). |
| **Audience** | Ensemble des clients finaux d'une marque, segmenté par Devotion Ladder (6 paliers). |
| **Superfan** | Membre de l'audience ayant atteint le palier Ambassadeur ou Évangéliste — masse stratégique productive pour la marque. |
| **Talent** | Freelance, créateur, agence de production, régie, événementiel — fournisseur de production via Hub-Escrow. |
| **Operator** | Membre UPgraders ou agence fille avec accès Console. |

### 1.7 Périmètre de service — UPgraders fixer industriel

La Fusée équipe UPgraders pour couvrir **toutes les surfaces nécessaires à l'industrie créative africaine francophone** :

| Surface | Neter de tutelle | Statut |
|---------|------------------|--------|
| Stratégie marque (ADVE/RTIS, Oracle, Glory tools) | Artemis | ✅ shipped |
| Production créative (briefs) | Artemis | ✅ shipped |
| Production matérielle (forge) | Ptah | ✅ shipped |
| Conseil + insight industrie | Seshat | 🟡 partial |
| Comms + broadcast + diffusion | Anubis | ✅ shipped |
| Crew + matching + formation Académie | Imhotep | ✅ shipped |
| Admin (paiements, mobile money, escrow, facturation) | Thot | 🟡 partial |
| Publication ouverte (références) | Seshat/Argos | 📋 planifié |
| Hub des tâches + freelance marketplace | Imhotep + Thot | 📋 chantier complet (cf. §16) |

---

## 2. Architecture par couches OS

La Fusée est un OS, traité comme tel. 8 couches concrètes :

| # | Couche | Équivalent La Fusée | Statut |
|---|--------|---------------------|--------|
| 1 | **Hardware/Kernel** | Postgres + Vercel + Node runtime | ✅ |
| 2 | **Drivers** | tenantScopedDb · Prisma · LLM Gateway providers · Anubis providers (Meta/Google/X/Twilio/Mailgun/FCM) · Ptah providers (Adobe/Canva/Figma/Magnific/Higgsfield) · Credentials Vault | ✅ |
| 3 | **Protocoles** | Intent bus (`mestor.emitIntent`) · NSP SSE · hash-chain SHA256 · MCP bidirectionnel · OAuth 2.1 device flow · `ConnectorResult<T>` · Pattern P22-* | ✅ |
| 4 | **Substrats** | Yggdrasil per-brand · tenantScopedDb isolation · layering cascade (ADR-0002) · BrandContextNode tree · Variable Bible | ✅ |
| 5 | **Services système (daemons)** | 7 Neteru + INFRASTRUCTURE | ✅ |
| 6 | **APIs** | tRPC routers (112) · Glory tools (56 CORE / 149 registry) · Frameworks (28) · Sequences (94 dont 91 DRAFT) · Intent kinds (546) — recompte 2026-07-11 sur les registres code (`INTENT_KINDS`, `CORE_GLORY_TOOLS`/`EXTENDED_GLORY_TOOLS`, `ALL_SEQUENCES`, `FRAMEWORKS`) | ✅ |
| 7 | **Applications** | Cockpit · Console · Agency · Creator · Intake · Argos (planifié) | 🟡 (3 surfaces manquantes) |
| 8 | **Funnel commercial** | Wow-effect onboarding · free analysis · paid PDF · CTA retainer · Cockpit subscription | 🟡 (metrics absents) |

**Modularité OS** : chaque couche peut être swappée indépendamment si le contrat avec la couche supérieure tient. Test anti-drift : aucun service inter-Neter ne doit s'importer directement — passage obligé par Intent typé via Mestor.

---

## 3. ADVE — Le noyau de chaque marque

### 3.1 Les 4 piliers (mutables, cœur germinal)

| Pilier | Question canonique |
|--------|---------------------|
| **A** Authenticité | *Qui est cette marque vraiment ?* |
| **D** Distinction | *Pourquoi est-elle irremplaçable ?* |
| **V** Valeur | *Quelle valeur cardinale livre-t-elle ?* |
| **E** Engagement | *Comment fait-elle traverser le seuil ?* |

ADVE est **le sang qui circule dans toute marque** sur La Fusée. C'est ce que Yggdrasil draw pour irriguer les actions et les assets continuellement alignés, même exposés au retour du marché.

### 3.2 Mutation contrôlée — `OPERATOR_AMEND_PILLAR` (ADR-0023)

✅ Vérifié en code [src/server/services/mestor/operator-amend.ts](src/server/services/mestor/operator-amend.ts). **Une seule voie d'écriture**, 3 modes :

| Mode | Coût | Comportement | Cascade |
|------|------|--------------|---------|
| `PATCH_DIRECT` | €0 | Mutation field directe, no LLM | RTIS stale |
| `LLM_REPHRASE` | ~$0.02 | AI-assisted via `pillar.previewAmend` | RTIS stale |
| `STRATEGIC_REWRITE` | ~$0.05 | Rewrite complet, ≥20 char justification | RTIS stale **+** BrandAsset.staleAt=now() sur dépendants ACTIVE |

### 3.3 Doctrine **décision manuelle obligatoire** (Q3 réponse Alexandre)

> *"Les décisions qui peuvent toucher l'ADVE doivent être amendées manuellement."*

**Aucune cascade auto** ne peut écrire sur ADVE. Notoria propose (Recommendation rows status PENDING + confidence score), **l'opérateur décide explicitement** via UI puis émet `OPERATOR_AMEND_PILLAR`. Pas d'auto-amend même sur signal Tarsis fort.

✅ Confirmé en code : aucun déclencheur automatique trouvé.

### 3.4 Effet cascade obligatoire

Amender ADVE marque RTIS comme `stale`, exige recalcul via les 4 Intent kinds RTIS (cf. §4). Sur `STRATEGIC_REWRITE` additionnel : `db.brandAsset.updateMany()` marque dépendants ACTIVE `staleAt=now()` (state reste ACTIVE, UI affiche "regen suggested").

---

## 4. RTIS — Le rayonnement dérivé

### 4.1 Les 4 piliers (non-éditables type-level)

| Pilier | Question | Intent de refresh |
|--------|----------|-------------------|
| **R** Risque | *Qu'est-ce qui menace la marque ?* | `ENRICH_R_FROM_ADVE` |
| **T** Track | *Qu'est-ce qui se passe sur le terrain ?* | `ENRICH_T_FROM_ADVE_R_SESHAT` |
| **I** Innovation | *Quelle action peut-elle prendre ?* | `GENERATE_I_ACTIONS` |
| **S** Strategy | *Quelle synthèse stratégique ?* | `SYNTHESIZE_S` |

✅ Les 4 Intent kinds existent dans [intents.ts](src/server/services/mestor/intents.ts). Dispatch via `artemis/commandant.ts`.

### 4.2 RTIS = chaîne de production

R Risk (menaces détectées) → T Track (capteur Seshat/Tarsis) → I Innovation (actions candidates) → S Strategy (synthèse exécutable). Chaque étage **rejette** ce qui n'est pas viable, l'étage suivant compose à partir du viable.

### 4.3 Aucun auto-déclenchement (✅ vérifié)

Les 4 Intent kinds RTIS sont uniquement routables via `commandant.ts` — **zéro appel auto-déclenché** depuis Tarsis, Notoria, ou OPERATOR_AMEND_PILLAR. La décision est inline pendant l'AMEND opérateur (l'opérateur choisit d'enchaîner ou non) OU explicite via UI séparée. Doctrine = code.

---

## 5. Yggdrasil — Le système d'irrigation per-brand

### 5.1 Définition canonique

Yggdrasil = **système racinaire** qui draw depuis le noyau ADVE de chaque marque pour irriguer ses actions/assets continuellement alignés, **même exposés au retour du marché**. Le pendant organique d'APOGEE (qui est le squelette propulsion).

**Chaque marque a son propre Yggdrasil.** La Fusée connecte tous les Yggdrasils entre eux (cross-brand insights, signal pool, Argos références).

### 5.2 Gouvernance

**Aucune.** Yggdrasil n'est pas gouverné par un Neter. C'est un substrat organique comme NSP, comme la layering cascade. Il transporte, il ne décide pas. Les **gates** (= valves) appartiennent à Mestor (Guidance).

**Note ADR-0082** : amendée ✅ 2026-05-16 — "gouverné par Mestor" retiré → "traverse Mestor mais ungoverned substrate".

### 5.3 Les 8 rôles canoniques

1. **Capter** la sève ADVE (lecture noyau `Strategy.pillars[ADVE]`)
2. **Filtrer** via gates (cohérence ADVE, manipulation, narrative, brief ingestion ← actuellement manquant)
3. **Distribuer** aux Neteru compétents (branches de l'arbre)
4. **Tracer** (hash-chain immuable, ADR-0004)
5. **Observer** retour (NspEvent + Tarsis + conversions)
6. **Ramener** au noyau (sève redescendante = boucle marché↔ADVE)
7. **Isoler** des autres marques (tenantScopedDb)
8. **Connecter** avec autres Yggdrasils via La Fusée

### 5.4 Composition technique (substrat composite)

Yggdrasil n'est pas un module — c'est la composition de :

| Primitive | Localisation | Statut |
|-----------|--------------|--------|
| Intent bus | [src/server/services/mestor/intents.ts](src/server/services/mestor/intents.ts) (1232 lignes, ~35 call-sites) | ✅ |
| Hash-chain SHA256 | [src/server/governance/hash-chain.ts](src/server/governance/hash-chain.ts) | ✅ |
| NSP SSE | [src/server/governance/nsp/server.ts](src/server/governance/nsp/server.ts) | ✅ |
| tenantScopedDb | [src/server/governance/tenant-scoped-db.ts](src/server/governance/tenant-scoped-db.ts) | ✅ |

### 5.5 Les 3 invariants Q1/Q2/Q3

- **Q1 traçabilité** — chaque flux ancré dans `IntentEmission.id` hash-chained
- **Q2 observabilité** — chaque flux émet `NspEvent` (SSE temps-réel)
- **Q3 non-bypass** — passage obligé par `mestor.emitIntent()`

**Test anti-drift** `yggdrasil-three-invariants.test.ts` ✅ shippé (PR #258, 2026-06-19 — Q1/Q2/Q3 runtime-vérifiés).

---

## 6. APOGEE — Le squelette propulsion/guidance

### 6.1 Les 8 sub-systems

| Tier | # | Sub-system | Driver |
|------|---|------------|--------|
| **Mission** | 1 | Propulsion (briefs + forge) | Artemis + Ptah |
| **Mission** | 2 | Guidance | Mestor |
| **Mission** | 3 | Telemetry | Seshat (incl. Tarsis + Argos) |
| **Mission** | 4 | Sustainment | Thot |
| **Ground** | 5 | Operations | Thot (extension) |
| **Ground** | 6 | Crew Programs | Imhotep |
| **Ground** | 7 | Comms | Anubis |
| **Ground** | 8 | Console/Admin | **INFRASTRUCTURE** (driver auto-gouverné) |

**Cap APOGEE 7/7 Neteru préservé.** INFRASTRUCTURE est le driver de la 8ème sub-system (Console/Admin) — pas un Neter conceptuel, mais entrée légitime dans `BRAINS` const comme governor du sub-system auto-administré. L'OS s'administre lui-même.

### 6.2 Les 3 Lois de trajectoire

1. **Conservation altitude** — pas de régression silencieuse (hash-chain)
2. **Séquencement étages** — cascade A→D→V→E→R→T→I→S unidirectionnelle
3. **Conservation carburant** — Thot refuse les combustions flame-out

### 6.3 Les 6 paliers — *"de la poussière à l'étoile"*

LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE.

**5 Intent kinds PROMOTE_*** ✅ existent dans `intent-kinds.ts` (Governor=SESHAT). 5 DEMOTE_* compensateurs aussi. Gates de preuves `PALIER_PROMOTION_PROOFS` ❌ absents — drift à corriger (cf. §21).

---

## 7. Les 7 Neteru + INFRASTRUCTURE — Limites de gouvernance

### 7.1 Tableau canon (gouverne / produit / consomme / NE fait PAS)

| Neter | Service | Gouverne | Produit | Consomme | NE fait PAS |
|-------|---------|----------|---------|----------|---------------|
| **Mestor** | `mestor/` (13 .ts) | Dispatch + gates | `IntentEmission` | Toute intention | n'exécute jamais lui-même |
| **Artemis** | `artemis/` (33 .ts) | Conception briefs | `BrandAsset.kind = BRIEF / MANIFESTO / BIG_IDEA / CREATIVE_BRIEF / KV-CONCEPT` | ADVE + RTIS + signaux Seshat + commandes Mestor | **ne matérialise jamais** les briefs |
| **Ptah** | `ptah/` (14 .ts) | Forge matérielle | `BrandAsset.kind = KV-RENDER / VIDEO / AUDIO / IMAGE / CARROUSEL` | **les briefs produits par Artemis** + providers | **ne conçoit jamais** un brief |
| **Seshat** | `seshat/` (29 .ts) | Observation + signaux | `NspEvent` / `TarsisSignal` / `CampaignReferenceDossier` / health reports | connecteurs externes + DB | **n'agit jamais** sur une marque |
| **Thot** | `financial-brain/` (31 .ts) ❌ à renommer | Carburant + facturation + escrow | Budget / fuel ledger / escrow / transactions / mobile-money | Coûts émis par tous Neteru | **n'initie jamais** une production |
| **Imhotep** | `imhotep/` (4 .ts) | Crew + matching + formation | Missions / promotions / Académie courses | Briefs Artemis + besoins production + portfolio | **ne livre pas** les assets — assigne le crew |
| **Anubis** | `anubis/` (25 .ts) | Comms + broadcast + MCP + adresse | `BroadcastJob` / notifications / ad campaigns | **assets prêts produits par Ptah** + segments CRM | **ne crée pas** les assets — il les **adresse** |
| **INFRASTRUCTURE** | (transverse) | Config + ecosystem + admin | Routing / settings / RBAC infra | tous Neteru | n'est pas un Neter |

### 7.2 Renaming critique : `financial-brain/` → `thot/`

❌ **Drift naming** : le service Thot est nommé `financial-brain/` historiquement. C'est lui Thot. Chantier rename (50-80 fichiers + ADR + imports + CODE-MAP) à planifier Phase 25.

---

## 8. NEFER — L'opérateur garant de cohérence

NEFER ("parfait, accompli" en égyptien) est l'**opérateur LLM** qui exécute les Intents. Pas un Neter. Pas dans `BRAINS` const. Ne compte pas dans cap 7/7.

### 8.1 Rôle canon

Garant de la cohérence **entre la rigueur Fusée (système) et l'aspirationnel Neteru (mythique)**. Le pont entre les deux registres de la dualité §1.5.

### 8.2 Doctrine LLM §1.1 (NEFER.md)

5 invariants critiques :

1. **Pas de notion de temps humain** — pas de "ça prend trop de temps"
2. **Pas d'économie de tokens** — verbosité OK si elle sert l'inférence
3. **Pas de fatigue, pas de seuil d'effort** — 38 fichiers si cohérence l'exige
4. **Seul critère d'arrêt valide** : information non-inférable → 1 question ciblée. Sinon NEFER agit.
5. **Profondeur > raccourci** — profond par défaut sur sujet structurant.

### 8.3 Protocole 8 phases

Check préventif → Examen APOGEE → Audit anti-doublon → Conception → Exécution → Vérification → Documentation → Commit + auto-correction.

### 8.4 3 interdits absolus

1. Réinventer la roue (grep CODE-MAP obligatoire)
2. Bypass governance (tout via `mestor.emitIntent()`)
3. Drift narratif silencieux (propagation 7 sources de vérité simultanément)

---

## 9. Sub-agents — Hunter, Tarsis, Jehuty, Notoria

Pas des Neteru. Pas dans BRAINS const. Cap 7/7 préservé.

### 9.1 Hunter — sub-agent Seshat 📋 ABSENT

**Doctrine** : tracking externe 4-phases (harvest → coerce Zod → ingest → projection-decide), produit `CampaignReferenceDossier` signés + alimente Seshat avec indices marché.

**État code** : ❌ **n'existe pas**. Phase 22 Argos planifié, vendorisé `docs/external-design/argos-hunter-v1/` + ZIP local `ARGOS STUDIO.zip`. Non porté.

**Rôle étendu (doctrine v4)** : Hunter joue aussi un rôle **économique** — alimente Seshat zone-indices avec TJM benchmarks, marketing budgets sectoriels, tarifs production type. C'est l'oracle économique de l'OS.

### 9.2 Tarsis — outil interne Seshat ✅

**Doctrine** : calcule probabilités futures sur mass data (causal chains, impact predictions).

**État code** ✅ : 
- [seshat/tarsis/connector.ts](src/server/services/seshat/tarsis/connector.ts) — connecteur externe shipped Phase 23
- [seshat/tarsis/index.ts](src/server/services/seshat/tarsis/index.ts) — Market Intelligence Engine
- [seshat/tarsis/signal-collector.ts](src/server/services/seshat/tarsis/signal-collector.ts)
- [seshat/tarsis/weak-signal-analyzer.ts](src/server/services/seshat/tarsis/weak-signal-analyzer.ts) — **calcul interne probabiliste** confirmé
- [seshat/tarsis/campaign-capture.ts](src/server/services/seshat/tarsis/campaign-capture.ts)

⚠️ Distinction critique : `tarsis-monitoring` connector externe (registered Credentials Vault Phase 23) **est distinct** de **Tarsis outil interne Seshat**.

### 9.3 Jehuty — éditorial interne Seshat 🟡

**Doctrine** : présente actualité de la marque grâce aux infos système (incluant Tarsis). Stoppe la cascade d'irrigation, informe et notifie. **L'opérateur décide ensuite ce qu'il considère.**

**État code** 🟡 :
- [src/server/services/jehuty/index.ts](src/server/services/jehuty/index.ts) — export seul
- [jehuty/manifest.ts](src/server/services/jehuty/manifest.ts)
- [jehuty/mappers.ts](src/server/services/jehuty/mappers.ts) — mappers Signal/Reco/Diagnostic → FeedItem
- Model Prisma `JehutyCuration` (strategyId, itemType, selected, source) ✅

**Drift** : pas de **queue de notifications en attente de décision opérateur**. La décision est inline pendant `OPERATOR_AMEND_PILLAR`. Doctrine v4 demande extension (notification queue séparée de la décision).

### 9.4 Notoria — sub-agent Mestor ✅

**Doctrine** : propose AMEND_PILLAR scorés. Choix scoré reproductible → reconnaît "best choice" sur plusieurs requêtes. Pas LLM hallucination.

**État code** ✅ :
- [notoria/engine.ts](src/server/services/notoria/engine.ts) — génération batch Recommendations + Zod validation
- [notoria/gates.ts](src/server/services/notoria/gates.ts) — `applyPillarCoherenceGate` (LOCKED/DESTRUCTIVE/OK)
- [notoria/pipeline.ts](src/server/services/notoria/pipeline.ts) — pipeline 3-stage (ADVE_UPDATE → I_GENERATION → S_SYNTHESIS)
- Recommendation rows status PENDING avec `confidence` float (0-1) + `applyPolicy` (auto / suggest / requires_review)

### 9.5 Hiérarchie discriminatoire (cap APOGEE 7/7)

| Catégorie | Items | Compte vers 7/7 ? |
|-----------|-------|-------------------|
| **Neter** | Mestor, Artemis, Seshat, Thot, Ptah, Imhotep, Anubis | OUI |
| **Driver système** | INFRASTRUCTURE | NON |
| **Sub-agent Seshat** | Hunter (📋), Tarsis (✅), Jehuty (🟡) | NON |
| **Sub-agent Mestor** | Notoria (✅) | NON |
| **Opérateur LLM** | NEFER | NON |
| **Substrat** | Yggdrasil per-brand, NSP, hash-chain, layering cascade, tenantScopedDb, Variable Bible, BrandContextNode tree | NON |
| **Driver** | LLM Gateway providers, Anubis providers, Ptah providers, Credentials Vault | NON |
| **Connector externe** | tarsis-monitoring API, CRM, ad networks (Meta/Google/X/TikTok), Higgsfield, mobile money operators | NON |

---

## 10. Cascade canon de production

✅ Vérifié en code.

```
[Cockpit founder OU Console UPgraders OU Agency portal] 
        ↓ déclenche intention
Mestor.emitIntent() 
        ↓ gates ADVERTIS + manipulation + narrative
        ↓ hash-chain anchor
Artemis (conçoit le brief)
        ↓ BrandAsset.kind = BRIEF / BIG_IDEA / MANIFESTO / CREATIVE_BRIEF
Imhotep (en parallèle : assemble crew si besoin)
        ↓ matching freelance/régie
Ptah (forge matérielle, consomme le brief Artemis)
        ↓ providers : Adobe / Canva / Figma / Magnific / Higgsfield
        ↓ BrandAsset.kind = KV-RENDER / VIDEO / AUDIO / IMAGE
Anubis (ADRESSE l'asset au destinataire)
        ↓ broadcast multi-canal + ad networks + segments CRM
[Client final reçoit]
        ↓ retour (impressions, conversions, signals)
Seshat (observe le retour via Tarsis + connecteurs)
        ↓
Thot (facture, met à jour fuel ledger, gère escrow si applicable)
```

**Imhotep n'apparaît PAS dans la chaîne de livraison** — il orchestre en parallèle (matching + payment freelance + QC). Le moment du livrable est gouverné par **Anubis** (l'adresseur), pas Imhotep.

---

## 11. Cascade canon de refresh — STOP à Jehuty

✅ DOCTRINE = CODE confirmé par audit.

### 11.1 Phase 1 — Acquisition (automatique selon tier)

```
Hunter (📋 tracking externe)
    ↓
Seshat ✅ (ingestion + normalisation)
    ↓
Tarsis ✅ (calcule probabilités futures sur mass data)
    ↓
Jehuty 🟡 (éditorial : "voici l'actualité de la marque")
    ⛔ STOP — notification seulement, AUCUNE cascade auto
```

### 11.2 Phase 2 — Délibération + Irrigation (déclenchée par humain)

```
Opérateur lit Jehuty + décide quoi traiter (MANUEL OBLIGATOIRE)
    ↓
Notoria ✅ (proposition scorée d'amendements, confidence 0-1)
    ↓
Opérateur approuve via OPERATOR_AMEND_PILLAR ✅
    ↓
Notoria touche T (pilier Track le plus proche du marché)
    ↓
    ├─ VERS LE BAS : T → R → rétro-feedback ADVE
    │   (la marque se réaligne sur le réel observé via AMEND manuel)
    │
    └─ VERS LE HAUT : T → I (actions candidates) → S (stratégie synthétisée)
        (forward propagation du nouveau Track)
```

### 11.3 Fréquences refresh par tier abonnement

| Tier | Fréquence Phase 1 |
|------|--------------------|
| Free Intake | sur demande uniquement |
| Embarquement (FRAGILE) | mensuelle |
| Starter (ORDINAIRE) | mensuelle |
| Pro (FORTE) | journalière |
| Group (CULTE) | journalière + sur demande |
| Enterprise (ICONE) | journalière + sur demande |
| **Console UPgraders + partenaires** | **horaire** (réservé operator) |

**+ Triggers événementiels** court-circuitent quel que soit le tier :
- Tarsis détecte anomalie majeure (seuil dépassé)
- Marque vient d'amender ADVE → recalcul T
- Marque lance campagne → instrumentation déclenche refresh
- Hunter capte dossier nouveau mentionnant la marque
- Concurrent direct détecté en action majeure
- Réglementation/loi sectorielle bouge

🟡 **Scheduler tier-aware** pas câblé en code. Service générique `process-scheduler/` existe mais pas l'implémentation per-tenant per-tier.

📋 **Trigger bus événementiel** : event `pillar.amended.cascade-due` publié mais aucun handler refresh-trigger côté Seshat.

### 11.4 Conséquence — Le système qui respire

Sans ce STOP, le système ferait dériver toutes les marques sur chaque micro-signal Hunter capte. La discipline = **observe en permanence, informe (Jehuty), propose (Notoria), n'agit qu'avec consentement humain**.

---

## 12. Système de score — Maturité des marques

**Pièce maîtresse formalisée 2026-05-16** (cf. doctrine Alexandre).

### 12.1 Doctrine

Le score multi-dimensions étalonne la maturité d'une marque sur sa trajectoire LATENT→ICONE. **Score le plus élevé = objectifs atteints** :

- Overton politique déplacé dans le secteur
- Communauté de fans culte établie (Devotion Ladder mature)
- Maturité produit atteinte (BrandAssets ACTIVE complets)
- Cult Index élevé
- Superfan ratio significatif

### 12.2 Les 8 dimensions canoniques

| Dimension | Mesure | Service producteur | Statut |
|-----------|--------|---------------------|--------|
| **Cult Index** | 0-100 sur 7 sous-dimensions (engagement, superfan velocity, cohésion, etc.) | `cult-index-engine/` | ✅ |
| **Devotion Distribution** | Pyramide 6 paliers (Spectateur→Évangéliste) | `devotion-engine/` | ✅ |
| **Overton Delta** | Déflection de l'axe sectoriel via proxies (`computeBrandDeflection`) — l'Overton lui-même n'est jamais mesuré directement (cf. annexe MI §2.2) | `sector-intelligence/` | ✅ |
| **Superfan Velocity** | Taux croissance superfans nominaux par période | `cult-index-engine/` | ✅ |
| **Brand Asset Maturity** | % BrandAsset.kind ACTIVE / kinds applicables | `brand-vault/` | 🟡 |
| **Pillar Completeness** | % piliers ADVE/RTIS COMPLETE non-stale | `pillar-readiness.ts` | ✅ |
| **Campaign Performance** | ROI moyen pondéré sur cycle écoulé | `campaign-tracker/` | ✅ |
| **Production Quality** | Glory tool QC moyen sur cycle | `qc-router/` | 🟡 |

**Calibration par échelle (ADR-0126, 2026-07-11)** : les dimensions de preuve culturelle (superfans, signaux) ne s'étalonnent plus sur des cibles absolues universelles mais sur l'**échelle de marché déclarée** (`Strategy.marketScale`, QUARTIER→MONDE) + la densité d'audience adressable — cf. `src/domain/market-scale.ts`. Le palier ne s'affiche jamais sans son référentiel d'échelle. L'Overton par polity (axe sectoriel × portée géo) reste un chantier séparé (registre RESIDUAL-DEBT).

### 12.3 Utilisations du score

1. **Notoria** : score informe la confidence des Recommendations
2. **Palier transitions** : `PROMOTE_*_TO_*` Intent kinds utilisent score comme **preuve** ❌ pas câblé
3. **Cockpit display** : badge palier + score visible dans `/cockpit/insights/`
4. **Pricing dégressivité** : commission Hub-Escrow décroît avec palier (donc score)
5. **Argos showcase** : marques score élevé candidates publication références
6. **UPgraders Console** : leaderboard interne marques en accélération

### 12.4 Drifts identifiés

- ✅ Composants score existent dispersés (cult-index, devotion, pillar-readiness)
- ❌ Pas de service `scoring-engine/` qui AGRÈGE les 8 dimensions en score canonique
- ❌ Pas de table Prisma `BrandMaturityScore` historique par marque
- ❌ Pas d'Intent kind `RECOMPUTE_BRAND_SCORE` qui orchestre le calcul
- ❌ Gates `PALIER_PROMOTION_PROOFS` utilisant le score : absents

→ **Chantier maître** Phase 24 candidate : "Système de score unifié + palier transitions automatisables".

---

## 13. Topologie multi-portails (Couche 7 — Applications)

### 13.1 État actuel — 9 groupes de routes (202 routes total)

| Groupe | Routes | Cible | Statut |
|--------|--------|-------|--------|
| `(console)` | 106 | UPgraders + agences filles | ✅ |
| `(cockpit)` | 44 | Founder direct | ✅ (sauf §17, §16) |
| `(creator)` | 24 | Talent / freelance | ✅ |
| `(agency)` | 13 | Agence conseil partenaire | 🟡 (Phase 18-A0 Matanga shipped, généralisation partielle) |
| `(intake)` | 10 | Public landing + funnel | ✅ |
| `(auth)` | - | Auth pages | ✅ |
| `(marketing)` | - | Pages commerciales | ✅ |
| `(public)` | - | Pages publiques | ✅ |
| `(shared)` | - | Composants partagés | ✅ |

### 13.2 Surfaces à construire

| Surface | Backend | UI | Complexité | Priorité | Cf. § |
|---------|---------|-----|------------|----------|-------|
| Cockpit Communities | ✅ 100% | ❌ 0% | L | P1 | §17 |
| Personal Brand Cockpit | 🟡 40% | ❌ 0% | L | P1 | §18 |
| Hub-Escrow Cockpit | ✅ 90% | ❌ 0% | M | P1 | §16 |
| Argos (frontend + Hunter backend) | 📋 vendorisé | ❌ 0% | XL | P2 | §19 |
| Portfolio multi-brand cockpit | ✅ shipped Phase 18 | ✅ shipped | - | - | §20 |
| Funnel metrics + gates | 🟡 partial | 🟡 partial | M | P2 | §15 |

### 13.3 Cockpit (44 routes) — Vue founder

- `/cockpit/brand/*` (20 routes) — assets, deliverables, diagnostic, engagement, guidelines, identity, jehuty, market, notoria, offer, positioning, potential, proposition, roadmap, rtis, sources, strategy
- `/cockpit/operate/*` (8 routes) — briefs, campaigns, forge (Ptah), missions, requests
- `/cockpit/insights/*` (5 routes) — apogee-maintenance, attribution, benchmarks, diagnostics, reports
- `/cockpit/intelligence/*` (2 routes) — market-studies, track
- `/cockpit/portfolio/*` (2 routes) — incl. `[corporateSlug]` Brand Tree multi-archétype (Phase 18-A0 shipped)
- Autres : mestor, messages, settings, new

### 13.4 Console (106 routes) — Vue UPgraders + agences filles

13 sections : `fusee/`, `artemis/`, `seshat/`, `signal/`, `socle/` (incl. **escrow shipped**), `arene/`, `governance/`, `strategy-operations/`, `strategy-portfolio/`, `operate/`, `imhotep/`, `anubis/`, `academie/`, `audit/`, `oracle/`, `config/`, `ecosystem/`, `mestor/`, `upgraders/`.

### 13.5 Creator (24 routes) — Talent portal

- `/creator/community/*` (guild + events) ✅
- `/creator/earnings/*` (history, invoices, missions, qc) ✅
- `/creator/missions/*` (active, available, collab) ✅
- `/creator/profile/*` (drivers, portfolio, skills) ✅
- `/creator/progress/*` ✅
- `/creator/learn/*` (Académie) ✅
- `/creator/qc/*` (peer review) ✅

Backend : `talent-engine/` (cosine ADVE matching + auto-promotion APPRENTI→ASSOCIE) + `matching-engine/` + `tier-evaluator/` + `qc-router/`. ✅

---

## 14. Architecture économique — Thot formula engine + Seshat zone indices

### 14.1 Doctrine architecturale

**Tout calcul économique = formule runtime Thot à partir d'indices Seshat per-zone.** Pas de grille statique FCFA hardcodée dans code UI ou docs business.

```
Seshat (zone indices) → Thot (formula engine) → Cockpit/Console/Hub-Escrow/Intake
```

### 14.2 Familles de formules Thot — `thot.calc.*` tRPC

**État actuel** : 10/16 calculators ✅, 6 manquants 📋. Détail :

#### Famille Freelance/Talent

| Calculator | Statut | Localisation |
|-----------|--------|--------------|
| `computeTJM(creatorId)` | 🟡 partial | `actors/freelance.ts` (PROJECT_RATES hardcoded XAF) |
| `computeCommissionRate(creatorId, missionValue, brandTier)` | ✅ | `commission-engine/index.ts` (TIER_RATES) |
| `computeFreelanceBreakeven(creatorId)` | ✅ | `actors/freelance.ts` |
| `computeTalentScoreEvolution(creatorId)` | 🟡 | `talent-engine/` |

#### Famille Marque

| Calculator | Statut |
|-----------|--------|
| `computeCODB(strategyId)` | ✅ `glory-tools/calculators.ts` (codbCalculator) |
| `computeOperatingBudget(strategyId, splitMode)` | ✅ `actors/agency.ts` |
| `computeMarketingShareAdvised(strategyId)` | ✅ `glory-tools/calculators.ts` |
| `computeRetainerFitness(strategyId)` | ❌ MANQUE |

#### Famille Agence

| Calculator | Statut |
|-----------|--------|
| `computeAgencyPlanPrice(agencyId)` | ✅ `actors/agency.ts` |
| `computeAgencyMargin(agencyId)` | ✅ |

#### Famille Hub-Escrow

| Calculator | Statut |
|-----------|--------|
| `computeEscrowAmount(taskSpec)` | ❌ MANQUE (service escrow absent) |
| `computeEscrowReleaseDate(escrowId)` | ❌ MANQUE |
| `computeDisputeArbitrage(escrowId)` | ❌ MANQUE |

#### Famille LLM + Infra

| Calculator | Statut |
|-----------|--------|
| `computeLlmAllowance(accountId, currentTier)` | ❌ MANQUE (ai-cost-tracker absent) |
| `computeLlmOverage(accountId)` | ❌ MANQUE |
| `computeForexExposure(period)` | ❌ MANQUE (multi-currency mature mais hedging absent) |
| `computeMobileMoneyFees(amount, operator, country)` | 🟡 partial (detection ok, fee calc non exposé) |

#### Famille Trajectoire Palier

| Calculator | Statut |
|-----------|--------|
| `computeNextPalierProofs(strategyId)` | ❌ MANQUE |
| `computePalierTransitionCost(strategyId, targetPalier)` | ❌ MANQUE |

### 14.3 Seshat zone-indices — 0/7 ❌ chantier complet

Aucun sous-dossier `seshat/zone-indices/` ou `seshat/benchmarks/` au sens canonique. Manquent :

| Indice | Statut |
|--------|--------|
| Cost-of-living index par pays/zone | ❌ |
| TJM médian par skill par zone | ❌ (hardcoded XAF baseline seulement) |
| Marketing budget benchmarks par industrie | ❌ (seulement SECTOR_BENCHMARK knowledgeEntry) |
| Mobile money fee tables par operator × pays | ❌ |
| Forex rate feeds | ❌ (multi-currency mature mais pas de feed) |
| Industry KPIs (CPM ads, conversion) | ❌ |
| TVA/taxes par pays | ❌ (TVA Cameroun 19.25% hardcoded) |

**Alternative existante** : `market-pricing.ts` tRPC router 2 procedures read-only (`getReference`, `getSectorBenchmarks`). Minimal.

### 14.4 Sources d'alimentation indices (chantier Phase 26)

Multi-source orchestrée par Seshat :

| Indice | Source primaire | Refresh |
|--------|-----------------|---------|
| Cost-of-living | Numbeo API + Banque Mondiale | trimestriel |
| Forex | XE/OANDA + BCEAO/BEAC officiel | quotidien |
| Inflation/GDP | Banque Mondiale, BCEAO, INS pays | mensuel |
| TJM créatif | **Hunter sub-agent crawl** + sondages + Académie | trimestriel |
| Marketing budgets | Nielsen Africa + eMarketer + agrégation Tarsis interne | trimestriel |
| Mobile money fees | API operators ou scrape officiel | hebdo |
| TVA/taxes | DGI pays + veille juridique | event-driven |

### 14.5 Fallback voisin économique le plus proche

Si Seshat n'a pas l'indice pour une zone : prend le **voisin économique** (pas géographique seul). Mapping `economicNeighbors: Record<CountryCode, CountryCode[]>` par défaut (ex: BF → [CI, ML, SN], GA → [CM, CG, GQ]). Fallback ultime : médiane UEMOA ou CEMAC selon zone. Réponse Thot inclut `usedFallback: true, fallbackChain: ["BF", "CI"]` pour traçabilité.

### 14.6 Transparence formules — hiérarchie

**Client Cockpit (founder, agence)** : prix final + breakdown haut-niveau. PAS de formule.

**Console UPgraders + agences filles** : formule complète avec variables, coefficients zone/industrie/cumul, breakdown granulaire, insights opérationnels (Hunter détecte croissance secteur, benchmark Nielsen, opportunités upgrade, marge réelle vs coûts LLM). Permet justification client + négociation + customisation.

### 14.7 Mobile money providers (Drift)

- ✅ Wave (Sénégal/CI dominant)
- ✅ Orange Money (multi-pays)
- ✅ MTN MoMo (Cameroun/CI/Bénin)
- ❌ Moov Money — MANQUE provider

Service `mobile-money/index.ts` existant : detection + orchestration + webhook, mais fees pas exposés comme calculator. Chantier petit ajout Phase 25.

---

## 15. Pricing & funnel commercial

### 15.1 Doctrine pricing — capture-then-grow

**Capter le potentiel, pas la richesse.** Les corporates riches restent chez Deloitte/BCG/McKinsey pendant ~3 ans (barrière réputation). La Fusée doit capturer les **forts potentiels à faible pouvoir d'achat** + grandir avec eux.

Crossing the Chasm appliqué à l'industrie créative africaine. Volume + data + success stories années 1-3 → réputation gagnée → basculement Deloitte années 4-5.

### 15.2 Product ladder aligné sur paliers APOGEE

| Tier | Cible palier | Logique | Prix indicatif (zone Dakar/Abidjan)* |
|------|--------------|---------|--------------------------------------|
| Intake gratuit | tout visiteur | hook + base data | 0 FCFA |
| PDF Oracle léger | LATENT→FRAGILE | conversion intake | 5-25k FCFA |
| Embarquement | FRAGILE solo | Cockpit minimal, RTIS manuel, 3 Glory tools/mois | 15-25k FCFA/mois |
| Starter | ORDINAIRE | Cockpit complet, Oracle accessible, 10 Glory tools | 50-75k FCFA/mois |
| Pro | FORTE | Glory tools ∞, Oracle auto, Imhotep matching, escrow réduit | 200-300k FCFA/mois |
| Group | CULTE portfolio | Brand Tree multi-marques, 1 agence fille | 500k-1M FCFA/mois |
| Enterprise | ICONE corporate | Custom, SLA, MCP entrant, équipe UPgraders dédiée | sur devis |

*Prix indicatifs zone Dakar/Abidjan. **Recalculés runtime par Thot** selon zone du tenant via Seshat zone-indices. Tier "Pro" ~1M FCFA à Dakar mais ~800k à Cotonou et ~1.2M à Libreville selon indices.

### 15.3 Pricing agences

| Tier agence | Base | Per-client | Cap clients | Total typique | % budget cible |
|-------------|------|------------|-------------|---------------|----------------|
| Petite agence | 100-150k | 25-30k | 5 | 250-300k pour 5 clients | ~80% |
| Agence agréée | 250-350k | 50-70k | 8 | 650-900k pour 8 clients | ~85% |
| Grande agence | 1-1.5M | 100-130k | 15 | 2.5-3.5M pour 15 clients | ~40% |
| Réseau (gros calibre local) | sur devis | inclus dans forfait | illimité | 5-8M | ~75% |

### 15.4 Cap dégressif + value-add Enterprise

Au-dessus de ~3.5-5M FCFA/mois, basculement linéaire→forfaitaire :

- **Cockpit Group 5-10 brands** : 3-5M (dashboard exécutif + exports)
- **Cockpit Group 10-20 brands + ops** : 6-9M (**rapport stratégique mensuel consolidé de TOUS les clients** + KAM UPgraders dédié + SLA 4h)
- **Cockpit Réseau d'agences** : 12-20M (équipe UPgraders intégrée + MCP custom + audits trimestriels)

Le client comprend : *"je paie 8M/mois mais j'ai un rapport stratégique mensuel sur mes 15 marques + un KAM dédié. Embaucher un strategic planner senior à 2M/mois × 4 mois = 8M, sans le KAM, sans les outils."*

### 15.5 Modèle freelance/production — commission tiered TTC

| Tier Creator | Commission TTC marque acheteuse |
|--------------|----------------------------------|
| APPRENTI | 10% TTC (débutant, tarif difficile à majorer) |
| COMPAGNON | 15% TTC (crédibilité acquise) |
| MAITRE | 20% TTC (senior, défendable) |
| ASSOCIE | 20% TTC + dégressivité sur ses propres marques |

**Tarif jour freelance préservé TTC** — la marque paie tarif + commission, le freelance reçoit son tarif net. La Fusée est l'allié du freelance par design.

### 15.6 3 leviers d'upgrade freelance optionnels

- **(a) Céder % majoré** : +5pts (Pro Folio + Match priority) ou +10pts (+ audit + Argos)
- **(b) Retainer mensuel** : 5k (basique), 15k (audit + Académie), 30k (réseau seniors + Argos régulier)
- **(c) Achat unique** : audit folio 25k, cursus certif 50-100k, mise en avant 30k, etc.

### 15.7 Activité minimum (pas de CA cible)

Compte vivant si ≥1 sur 12 mois : mission complétée OU folio update OU cours Académie OU peer QC OU retainer. Sinon → dormant gracieux (folio archivé, réactivable).

### 15.8 Score d'utilité réseau (économie de réputation parallèle)

Points contribution (peer QC 1pt, mentor 5pts, Académie 10pts, référence cliente 25pts, Argos case study 50pts). Conversion : 100 pts = 1 mois retainer (b) niv1 offert · 500 pts = -2pts commission temporaire · 1000 pts = Cercle Maître.

### 15.9 Cumulativité multi-rôle

`User.roles[]` avec dégressif sur cumul :
- 1 rôle : 0% · 2 rôles : -10% · 3 rôles : -15% · 4+ rôles : -20%

Exemple : célébrité = Creator (0) + Cockpit Marque (250k) = 250k. Cumul Agency externe → 250+250-10% = 450k.

### 15.10 LLM coverage + dépassement transparent

Quota mois inclus par tier (1 unité ≈ 1000 tokens entrants Sonnet). Notifications à 80% / 100% / 120%. 3 options dépassement (configurable) :

- **(a) Cap auto** — stop Glory tools LLM-heavy
- **(b) Overage transparent** — coût réel + 10% margin facturé fin mois
- **(c) Upgrade prorata** — bascule tier supérieur

❌ **ai-cost-tracker absent** en code. Chantier Phase 24 obligatoire (couplé Phase 23 LLM budget).

### 15.11 Funnel commercial (Couche 8) — wow-effect

```
LANDING (Intake) → Score ADVE 4 piliers (gratuit) → Rapport gratuit (WOW)
       → Pay PDF one-shot (Oracle léger) → Asset + CTA retainer
       → Cockpit subscription (retainer mensuel)
       → Onboard founder + Brand Tree setup + activation cascade ADVE/RTIS complète
```

❌ **Métriques funnel** (conversion intake→PDF→retainer) absentes en code. Gate `INTAKE_LEAD_QUALIFICATION` absent. Service `intake-funnel` ou `growth-tracking` absent.

📋 Chantier Phase 25 : instrumentation funnel + dashboards Console UPgraders (time-to-wow, conversion paid PDF, conversion retainer).

---

## 16. Hub-Escrow — Chantier complet (Phase 24 candidate majeure)

**Doctrine** : marketplace de tâches qualifiées avec escrow garantie. UPgraders devient fixer industriel via cette infrastructure. Développe le marché de l'entrepreneuriat créatif africain.

**État actuel** : 🟡 Escrow contractuel existe ([Escrow model Prisma](prisma/schema.prisma) + UI `/console/socle/escrow/`). 📋 Marketplace freelance complet à construire.

### 16.1 Architecture cible

#### Modèles Prisma à créer

```prisma
model Task {
  id              String       @id @default(cuid())
  strategyId      String       // marque ou agence émettrice
  publishedBy     String       // userId (founder OU agency operator)
  type            TaskType     // BRIEF, REVISION, PRODUCTION, AUDIT, etc.
  title           String
  description     String       @db.Text
  briefAssetId    String?      // lien BrandAsset.kind=BRIEF si applicable
  requiredSkills  String[]
  requiredTier    GuildTier?   // APPRENTI/COMPAGNON/MAITRE/ASSOCIE min
  budgetMin       Decimal
  budgetMax       Decimal
  currency        String       @default("XOF")
  deadline        DateTime
  status          TaskStatus   // DRAFT, PUBLISHED, AWARDED, IN_PROGRESS, DELIVERED, COMPLETED, DISPUTED, CANCELLED
  manipulationMix Json?        // hérité de Strategy
  applicableNatures BrandNature[]
  createdAt       DateTime     @default(now())
  bids            TaskBid[]
  award           TaskAward?
}

model TaskBid {
  id              String   @id @default(cuid())
  taskId          String
  creatorId       String   // talent profile
  proposedTjm     Decimal
  estimatedDays   Int
  proposedTotal   Decimal  // computeTaskTotal par Thot
  coverLetter     String   @db.Text
  portfolio       String[] // BrandAsset IDs preuves
  status          BidStatus // PENDING, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN
  submittedAt     DateTime @default(now())
}

model TaskAward {
  id              String   @id @default(cuid())
  taskId          String   @unique
  winningBidId    String   @unique
  escrowId        String   @unique
  awardedAt       DateTime @default(now())
  qcResultId      String?
}

model EscrowOperation {
  id              String       @id @default(cuid())
  taskAwardId     String       @unique
  amount          Decimal
  currency        String
  commission      Decimal
  netToCreator    Decimal
  thotFees        Decimal
  status          EscrowStatus // PENDING, HELD, RELEASED, DISPUTED, REFUNDED
  heldAt          DateTime?
  releasedAt      DateTime?
  releaseCriteria Json         // {requiresQcPass: true, qcMinScore: 0.7, autoReleaseAfter: "7d"}
  paymentRails    Json         // mobile money operator + transaction refs
}

model Dispute {
  id              String        @id @default(cuid())
  escrowOperationId String
  raisedBy        String        // userId
  reason          DisputeReason
  evidence        Json
  status          DisputeStatus // OPEN, MEDIATING, RESOLVED_RELEASE, RESOLVED_REFUND, RESOLVED_PARTIAL
  resolvedAt      DateTime?
  arbitrageNotes  String?       @db.Text
}
```

#### Intent kinds à enregistrer

- `PUBLISH_TASK` (governor: IMHOTEP)
- `BID_TASK` (governor: IMHOTEP)
- `SHORTLIST_BIDS` (governor: IMHOTEP)
- `AWARD_TASK` (governor: IMHOTEP)
- `HOLD_ESCROW` (governor: THOT)
- `SUBMIT_DELIVERY` (governor: IMHOTEP)
- `RUN_DELIVERY_QC` (governor: ARTEMIS)
- `RELEASE_ESCROW` (governor: THOT)
- `RAISE_DISPUTE` (governor: MESTOR)
- `ARBITRATE_DISPUTE` (governor: MESTOR)

#### Surfaces UI à construire

| Route | Cible | Rôle |
|-------|-------|------|
| `/cockpit/hub-escrow/publish` | Founder/Agence | Publier une tâche qualifiée |
| `/cockpit/hub-escrow/tasks` | Founder/Agence | Suivre tâches actives + propositions |
| `/cockpit/hub-escrow/escrow` | Founder/Agence | Voir escrows en cours + libération |
| `/creator/hub-escrow/browse` | Freelance | Browse tâches qualifiées matching skill |
| `/creator/hub-escrow/bid` | Freelance | Soumettre proposition |
| `/creator/hub-escrow/active` | Freelance | Tâches en cours + livrer |
| `/console/hub-escrow/monitor` | UPgraders | Vue cross-tasks, mediation disputes |

#### Gates à câbler (cf. §21)

- ❌ `CREW_VS_BRIEF_FIT` — skill match strict
- ❌ `FREELANCE_QC_HISTORY` — disputes historiques bloquent premium tasks
- ❌ `ESCROW_RELEASE_CRITERIA` — Glory tool QC obligatoire pre-release

### 16.2 Flow canonique end-to-end

```
1. Founder publie Task via Cockpit
       → INTENT PUBLISH_TASK → Imhotep qualifie skills + budget
       → NspEvent "task.published" diffusé Creator portal

2. Freelances candidate (max 5 par Task, Imhotep filtre matching)
       → INTENT BID_TASK × N

3. Founder shortlist + sélectionne winning bid
       → INTENT AWARD_TASK
       → Thot ouvre Escrow via mobile money operator
       → INTENT HOLD_ESCROW

4. Freelance reçoit notification Anubis "task awarded"
       → Travaille hors-plateforme, retour à deadline
       → INTENT SUBMIT_DELIVERY (uploads BrandAsset.kind correspondant)

5. Glory tool QC s'exécute automatiquement
       → INTENT RUN_DELIVERY_QC
       → Score 0-1 + warnings + verdict (PASS/REVIEW/FAIL)

6. Si PASS automatique → INTENT RELEASE_ESCROW après délai légal
       Si REVIEW → Founder valide manuellement + override possible
       Si FAIL → ouverture dispute possible côté freelance OU re-livraison

7. Thot libère escrow vers freelance (mobile money instant)
       → Tarif jour préservé TTC, commission UPgraders prélevée sur marque

8. Dispute path → INTENT RAISE_DISPUTE
       → Mestor gate ARBITRATE_DISPUTE avec mediation
       → Résolution : full release / full refund / partial split
```

### 16.3 Commission tiered Hub-Escrow

| Palier marque acheteuse | Commission UPgraders |
|-------------------------|----------------------|
| FRAGILE | 20% |
| ORDINAIRE | 17% |
| FORTE | 14% |
| CULTE | 11% |
| ICONE | 8% |

Effet : plus la marque mûrit, plus elle effectue de transactions, moins elle paie de commission. Boucle vertueuse contractuelle qui aligne incitations.

### 16.4 Intégration mobile money

Service `mobile-money/` existant : Wave, Orange Money, MTN MoMo ✅. Moov à ajouter 📋. Fees exposés comme calculator Thot `computeMobileMoneyFees`.

---

## 17. Communities Cockpit — Chantier complet

**Doctrine** : le founder voit **sa communauté vivante** dans son Cockpit. Pas un compteur de visiteurs — une carte des humains transformés.

**État actuel** : ✅ Backend 100% complet. 📋 UI Cockpit 0%.

### 17.1 Backend existant (réutilisable directement)

| Composant | Localisation | Rôle |
|-----------|--------------|------|
| `CommunitySnapshot` model Prisma | schema.prisma | Snapshot santé communauté |
| `SuperfanProfile` model Prisma | schema.prisma | Profil individuel superfan |
| `AmbassadorProgram` model Prisma | schema.prisma | Programme ambassadeurs |
| `DevotionSnapshot` model Prisma | schema.prisma | Distribution 6 paliers |
| `devotion-engine/` service | src/server/services/ | Calcul Devotion Ladder ✅ |
| `cult-index-engine/` service | src/server/services/ | Cult Index 0-100 ✅ |

### 17.2 Routes UI à créer

- `/cockpit/community/` — vue principale avec dashboard santé
- `/cockpit/community/superfans/` — grid superfans nominaux
- `/cockpit/community/superfans/[superfanId]` — fiche détaillée superfan + historique interactions
- `/cockpit/community/ambassadors/` — programme ambassadeurs actifs
- `/cockpit/community/devotion-ladder/` — pyramide animée 6 paliers
- `/cockpit/community/cult-index/` — détail 7 dimensions + évolution

### 17.3 Composants UI à créer

| Composant | Description |
|-----------|-------------|
| `<BrandCommunityDashboard>` | Vue agrégée santé communauté |
| `<DevotionLadderPyramid>` | Pyramide animée 6 paliers Spectateur→Évangéliste avec counts + tendances |
| `<SuperfanGrid>` | Grid superfans avec profil + score engagement + dernière interaction |
| `<SuperfanCard>` | Carte individuelle avec timeline + actions ciblées |
| `<AmbassadorList>` | Ambassadeurs actifs + programmes attribués |
| `<CultIndexCard>` | Cult Index 0-100 avec breakdown 7 dimensions |
| `<CommunityHealthChart>` | Évolution temporelle metrics clés |
| `<SegmentBuilder>` | Création segments pour broadcast Anubis ciblé |

### 17.4 Connexion Anubis (broadcast ciblé depuis Cockpit)

Le founder peut, depuis sa vue Community, **déclencher une action Anubis** sur un segment précis (ex: tous les Ambassadeurs inactifs depuis 30j → broadcast d'engagement). Intent `BROADCAST_TO_SEGMENT` (existant si non, à créer).

---

## 18. Personal Brand Cockpit — Chantier complet

**Doctrine** : célébrités / athlètes / influenceurs / personnalités ont leurs propres besoins UX. Backend partiel (40%), UI absente.

### 18.1 Backend existant

- `BrandNature.PERSONAL` ✅ enum + cascade (PERSON → VENTURE_DIVISION → PROJECT → DELIVERABLE → INSTANCE)
- 5 Glory tools dédiés : personal-narrative-brief, content-pillars-brief, drop-strategy-brief, speaking-circuit-brief, book-launch-brief ✅
- `founder-psychology/` service partiel 🟡

### 18.2 Backend à construire

- Model Prisma `Drop` (sortie de contenu, calendrier, lifecycle TEASING/LAUNCH/POST)
- Model Prisma `BrandDeal` (partenariat avec marque tierce, terms, ROI personal)
- Model Prisma `FanEconomy` (revenus directs des fans : tips, subscriptions, merchandise)
- Service `personal-brand-engine/` : agrégation persona + calendrier + brand deals
- Intent kinds : `PLAN_DROP`, `NEGOTIATE_BRAND_DEAL`, `PUBLISH_FAN_PRODUCT`

### 18.3 Routes UI à créer

- `/cockpit/personal/` — dashboard adapté célébrité
- `/cockpit/personal/drops/` — calendrier de sorties (chansons, vidéos, livres, événements)
- `/cockpit/personal/drops/[dropId]` — détail drop avec ADVE alignment check
- `/cockpit/personal/deals/` — brand deals en cours + pipeline + ROI persona
- `/cockpit/personal/fan-economy/` — revenus directs (tips, subs, merch)
- `/cockpit/personal/positioning/` — narrative personnel + sound bites

### 18.4 Composants UI spécifiques

| Composant | Description |
|-----------|-------------|
| `<DropCalendar>` | Calendrier visuel timeline sorties multi-formats |
| `<DropCard>` | Carte drop avec ADVE alignment indicator |
| `<BrandDealManager>` | Pipeline + négociation + alignment check vs ADVE |
| `<FanEconomyDashboard>` | Revenus directs + segmentation fan base |
| `<PersonaPositioning>` | Narrative + sound bites + media kit |

### 18.5 Cumul natif avec compte Talent

Une célébrité est **Talent + Marque cumulés** (cf. §20). Le portail unifié (option γ Q6 default) propose une vue consolidée + switchers vers Cockpit (vue marque) ou Creator (vue talent).

---

## 19. Argos — Page éditoriale de La Fusée

**Doctrine** (Q5 réponse Alexandre) : *"Argos est une page éditoriale de la Fusée proposée par UPgraders."*

**Hiérarchie marque** : UPgraders > La Fusée > Argos (sous-marque éditoriale).

### 19.1 État actuel

- 📋 Frontend hardcodé existant : `docs/external-design/argos-hunter-v1/` + `C:\Users\x-tin\Downloads\ARGOS STUDIO.zip` (local Alexandre)
- ❌ Backend Hunter sub-agent : absent
- ❌ Port `apps/argos/` : non commencé

### 19.2 Architecture cible (chantier complet Phase 26-27)

#### Backend Hunter

```
Hunter (sub-agent Seshat) 4-phases :
  1. Harvest (crawl externe configurable par tenant scope)
  2. Coerce Zod (normalisation schema strict)
  3. Ingest (Seshat persistance + indexation)
  4. Projection-decide (safety.verdict: PASS | QUARANTINE | REJECT)

Output : CampaignReferenceDossier JSON signé
   ├─ Projection (a) Artemis interne : enrichBrief avec références
   └─ Projection (b) Public : auto-publish on safety.verdict === 'PASS'
```

#### Frontend ARGOS STUDIO

- Vendoriser `ARGOS STUDIO.zip` dans `apps/argos/` (turborepo monorepo)
- Code hardcodé tel quel (3 interdits absolus du VENDOR-NOTICE déjà documentés)
- Consomme le JSON Hunter via endpoint Seshat dédié
- 3 swaps UI minimaux pour brand consistency La Fusée
- Cross-links bilatéraux landing↔Argos

#### Rôle économique Hunter (étendu doctrine v4)

Hunter ne crawle pas que des références créatives — il crawle aussi les **indices marché** pour alimenter Seshat zone-indices :
- TJM benchmarks par skill/zone
- Marketing budgets sectoriels
- Tarifs production type (KV simple/complexe, video, événement)
- Mobile money fees actuels

Argos = **oracle économique** de l'OS en plus de référence créative.

### 19.3 Intent kinds à créer

- `HUNTER_HARVEST` (governor: SESHAT, async)
- `HUNTER_COERCE` (governor: SESHAT)
- `HUNTER_INGEST` (governor: SESHAT)
- `HUNTER_PROJECT_DECIDE` (governor: SESHAT)
- `ARGOS_PUBLISH_DOSSIER` (governor: SESHAT)
- `ARGOS_FEATURE_BRAND` (governor: SESHAT)

### 19.4 Cap APOGEE 7/7 préservé

Hunter = sub-agent Seshat, pas Neter. Argos = sous-marque visible, pas Neter.

---

## 20. Cumulativité multi-rôle utilisateurs

### 20.1 Architecture User canon

```typescript
User {
  id, name, email, ...
  roles: Role[]  // multi-rôle natif
  operatorId?     // UPgraders ou agence
  talentProfile?  // freelance/creator
  strategies: Strategy[]  // marques possédées
  agencyMemberships: AgencyMember[]  // appartenance agences
}
```

### 20.2 État actuel

✅ Cumulativité **supportée nativement** : `operatorId` + `talentProfile` + `Strategy[]` peuvent coexister sur un même `User.id`.

⚠️ Champ `role: String` trop simple — pas de `Role[]` enum. RBAC se fait via `operatorId` scoping (operator-isolation/) + `talentProfile` presence. À étendre.

### 20.3 Cas canoniques

| Cumul typique | Exemple | Tarif (cf. §15.9) |
|---------------|---------|---------------------|
| Talent + Marque | Célébrité (artiste avec sa marque) | Creator (0) + Cockpit Marque (X) avec cumul -10% |
| Agence + Marque | Agence avec marque-agence | Agency (Y) + Cockpit Marque (Z) avec cumul -10% |
| Talent + Marque + Agence externe | Founder solo qui fait du freelance | 3 tiers avec cumul -15% |
| UPgraders operator (cas spécial) | Membre UPgraders avec compte personnel | Console (gratuit interne) + autre tier si applicable |

### 20.4 UX multi-rôle — Hybride (Q6 default)

- **Dashboard consolidé** à l'accueil : résume tous les rôles activés ("Vous avez 1 marque + 2 missions actives + 1 client suivi")
- **Liens profonds** vers sections spécifiques : `/cockpit/...` (marque), `/creator/...` (talent), `/agency/...` (agence)
- **Switcher de contexte** en header pour basculer rapide entre vues

📋 Chantier UI Phase 25 : reframe du dashboard utilisateur multi-rôle.

---

## 21. Drifts catalogue par couche OS

Inventaire exhaustif des drifts identifiés post-audit complet 2026-05-16.

### 21.1 Couche 2 — Drivers

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-2.1** Moov mobile money manquant | M | Wave/Orange/MTN OK, Moov absent providers |
| **D-2.2** Compteurs catalog divergence (Glory tools 64 registry/56 CORE vs 105 slugs ; Sequences 100/57 announced ; Frameworks 28/24) | L | Doctrine annoncée vs code à réconcilier (acter en ADR ou nettoyer) |
| **D-2.3** Forex hedging absent | M | Multi-currency mature mais pas de hedging USD↔FCFA |

### 21.2 Couche 3 — Protocoles

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-3.1** ⚠️ CRITIQUE `BRIEF_VS_ADVE_COHERENCE` gate absent | **CRITIQUE** | Briefs clients entrent sans validation cœur ADVE |
| **D-3.2** `PRODUCTION_OUTPUT_VS_BRIEF_COHERENCE` absent | H | Ptah produit-il vraiment ce que Artemis a briefé ? |
| **D-3.3** `BROADCAST_VS_AUDIENCE_FIT` absent | H | Anubis adresse à la bonne audience ? |
| **D-3.4** `YGGDRASIL_INVARIANTS_RUNTIME` test absent | H | Q1/Q2/Q3 non vérifiés runtime |
| **D-3.5** `HASH_CHAIN_TAMPER_DETECT` runtime check pas gated | M | verifyChain() existe mais pas comme gate formelle |
| **D-3.6** Tests `audit-mission-drift.test.ts` absent | H | Doctrine non vérifiable CI |
| **D-3.7** Tests `yggdrasil-three-invariants.test.ts` absent | H | Q1/Q2/Q3 non vérifiés CI |

### 21.3 Couche 4 — Substrats

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-4.1** ADR-0082 Yggdrasil "gouverné par Mestor" doctrinement incorrect | M | À amender → "traverse Mestor, ungoverned substrate" |
| **D-4.2** 5 couches OS conceptuelles non formalisées en ADR | M | Pas de cadre méta documenté |
| **D-4.3** Dualité aéronautique/divinité non formalisée comme principe design | L | NEFER garant non explicité |
| **D-4.4** `TENANT_ISOLATION_VIOLATION` gate explicit absent | M | Implicite dans tenantScopedDb proxy |
| **D-4.5** `MANIPULATION_COHERENCE` défini mais 0/64 Glory tools consomment `manipulationMode` dans promptTemplate | **CRITIQUE** | Feature fantôme |

### 21.4 Couche 5 — Services

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-5.1** `financial-brain/` → `thot/` rename | M | Naming drift historique |
| **D-5.2** Cascade canon Artemis/Ptah/Anubis non documentée formellement | M | Doctrine v4 à shipper en ADR |
| **D-5.3** 6 calculators Thot manquants (retainer fitness, palier transition cost/proofs, forex hedging, escrow amount/release) | H | Cf. §14.2 |
| **D-5.4** Seshat zone-indices 0/7 ❌ | **GROS** | Aucun sous-dossier zone-indices |
| **D-5.5** `CREW_VS_BRIEF_FIT` gate absent | M | Imhotep matching sans gate hard |
| **D-5.6** `FREELANCE_QC_HISTORY` gate absent | M | Disputes historiques sans enforcement |
| **D-5.7** `PALIER_PROMOTION_PROOFS` gate absent | H | Transitions paliers sans preuves |
| **D-5.8** Service `scoring-engine/` absent | H | Système de score §12 non agrégé |
| **D-5.9** Mestor gates explicites sparse (2 fichiers seulement) | M | Beaucoup de validations inline |
| **D-5.10** Hunter sub-agent absent | M | Planifié Phase 22, non porté |
| **D-5.11** Jehuty minimal (curations table, pas notification queue) | M | Doctrine v4 demande extension |
| **D-5.12** Scheduler tier-aware pas câblé | M | process-scheduler générique, pas tier-variated |
| **D-5.13** Trigger bus événementiel partiel | M | event bus light, zéro handler refresh-trigger |

### 21.5 Couche 6 — APIs

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-6.1** 24 wrappers WRAP-FW + 65 sequences DRAFT Phase 17 résidus | L | Promotion STABLE en attente |
| **D-6.2** 0 sequences DEPRECATED pattern | L | ADR-0085 deprecation pattern à institutionnaliser |
| **D-6.3** `enrichOracle` cohabitation | L | ✅ RÉSOLU 2026-07-11 — legacy déposé ([ADR-0125](adr/0125-depose-legacy-enrich-oracle.md)), voie unique = ASSEMBLE_ORACLE + panel progressif |
| **D-6.4** tRPC `thot.calc.*` router 2 procédures seulement | M | Les calculators existants pas exposés UI |
| **D-6.5** Intent kinds Hub-Escrow absent | H | À créer (§16) |

### 21.6 Couche 7 — Applications

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-7.1** Cockpit Communities UI 0% | **H** | Backend 100% prêt, UI à créer (§17) |
| **D-7.2** Personal Brand Cockpit UI 0% | H | Backend 40%, UI à créer (§18) |
| **D-7.3** Hub-Escrow Cockpit UI 0% | **H** | Chantier majeur (§16) |
| **D-7.4** Argos port non commencé | M | Frontend vendorisé, backend Hunter absent (§19) |
| **D-7.5** Agency conseil portal généralisation partielle | L | Cas Matanga shipped, généralisation à formaliser |

### 21.7 Couche 8 — Funnel

| Drift | Sévérité | Description |
|-------|----------|-------------|
| **D-8.1** Métriques funnel intake→PDF→retainer absentes | M | Pas de service growth-tracking |
| **D-8.2** `INTAKE_LEAD_QUALIFICATION` gate absent | M | Leads acceptés sans validation |
| **D-8.3** `ESCROW_RELEASE_CRITERIA` formalisation absente | H | Couplé Hub-Escrow §16 |

### 21.8 Validations inline non-gated (drift transverse)

**D-T.1** 70+ throws Forbidden/Validation dans routers tRPC sans traverser `governed-procedure` → pas d'IntentEmission, pas d'audit trail, pas de hash-chain anchor.

Sévérité : **H** — entrave la doctrine "tout via gate".

---

## 22. Roadmap chantiers Phase 24+

Priorité ordre d'exécution recommandé :

### 22.1 Top 5 chantiers immédiats (post Phase 23)

| # | Chantier | Phase candidate | Complexité | Justification |
|---|----------|-----------------|-------------|---------------|
| 1 | **Finaliser Phase 23** (Epics 3-7, 35 stories restantes) | Phase 23 | L | Closure-roadmap target #1 |
| 2 | **`BRIEF_VS_ADVE_COHERENCE` gate** (D-3.1) | Phase 23 ou 24 | M | CRITIQUE — sécurise toute ingestion |
| 3 | **Système de score unifié** (§12 + D-5.8) | Phase 24 | L | Pièce maîtresse, débloque palier transitions |
| 4 | **Hub-Escrow chantier complet** (§16) | Phase 24 | XL | Coeur économique industrie |
| 5 | **ai-cost-tracker + LLM allowance/overage** (§15.10) | Phase 24 | M | Couvre coûts variables |

### 22.2 Top chantiers Phase 25-27

| # | Chantier | Phase candidate | Complexité |
|---|----------|-----------------|-------------|
| 6 | **Communities Cockpit UI** (§17) | Phase 25 | L |
| 7 | **Personal Brand Cockpit** (§18) | Phase 25 | L |
| 8 | **`financial-brain/` → `thot/` rename** (D-5.1) | Phase 25 | M |
| 9 | **Funnel metrics + INTAKE_LEAD_QUALIFICATION** (D-8.1, D-8.2) | Phase 25 | M |
| 10 | **Seshat zone-indices module** (D-5.4) | Phase 26 | XL |
| 11 | **Hunter sub-agent + Argos port** (§19) | Phase 26-27 | XL |
| 12 | **Manipulation Matrix consumption** (D-4.5) | Phase 27 | L |
| 13 | **Tests HARD audit-mission-drift + yggdrasil-three-invariants** (D-3.6, D-3.7) | Phase 27 | M |

### 22.3 Top chantiers Phase 28-30

| # | Chantier | Phase candidate | Complexité |
|---|----------|-----------------|-------------|
| 14 | **Scheduler tier-aware + trigger bus** (D-5.12, D-5.13) | Phase 28 | L |
| 15 | **Validations inline → gates explicites** (D-T.1) | Phase 28 | XL (chantier transverse) |
| 16 | **Sequences DRAFT promotion + WRAP-FW cleanup** (D-6.1) | Phase 29 | M |
| 17 | **ADR 5 couches OS** (D-4.2) | Phase 29 | S |
| 18 | **ADR vocabulaire dualité + test anti-drift** (D-4.3) | Phase 29 | S |
| 19 | **ADR-0082 amend Yggdrasil ungoverned** (D-4.1) | Phase 29 | S |
| 20 | **PALIER_PROMOTION_PROOFS gates + 5 Intent transitions câblées** (D-5.7) | Phase 30 | L |

### 22.4 Quick wins (à shipper en parallèle)

- **D-2.1** Moov provider ajouté (S, Phase 24)
- **D-2.3** Forex hedging calculator (S, Phase 25)
- **D-6.4** tRPC `thot.calc.*` router exposition (S, Phase 25)
- **D-5.5/5.6** `CREW_VS_BRIEF_FIT` + `FREELANCE_QC_HISTORY` gates (M, Phase 24 couplé Hub-Escrow)

---

## CONCLUSION

La Fusée d'UPgraders est un Industry OS d'**ampleur réelle** : 99 services backend, 202 routes UI, 7 Neteru + INFRASTRUCTURE, 4 substrats Yggdrasil tous codés, 67 tests gouvernance HARD, 83 ADRs documentés, layering cascade ESLint+madge ENFORCED, hash-chain SHA256 fonctionnel.

**Le squelette philosophique tient.** La cascade canon de refresh (STOP à Jehuty) est correctement implémentée en code. La cascade canon de production (Artemis→Ptah→Anubis avec Imhotep parallèle) est codée. ADVE/RTIS plumbing est solide.

**Les drifts sont opérationnels**, pas structurels :
- **CRITIQUE** : `BRIEF_VS_ADVE_COHERENCE` gate absent + `MANIPULATION_COHERENCE` non consommée → 2 trous de sécurité doctrinale
- **MAJEUR** : 3 surfaces UI manquantes (Communities, Personal, Hub-Escrow) malgré backend prêt
- **STRUCTURANT** : Seshat zone-indices 0/7 + Système de score non agrégé + Hunter absent

**Top action immédiate** : finir Phase 23 (35 stories) + démarrer chantiers prioritaires (§22.1).

📊 **Étalonnage final** : Phase 23 18/53 (34%) · Closure roadmap 1/13 (8%) · Niveau de maturité OS estimé : **FORTE → CULTE en transition**. Cible 2027 : ICONE basculement Deloitte.

---

> *Document produit par NEFER 2026-05-16. Cohérent avec MISSION.md, NEFER.md, PANTHEON.md, APOGEE.md, LEXICON.md, ADR 0001-0083. À maintenir en sync avec CODE-MAP.md auto-régénéré.*
>
> *"De la poussière à l'étoile."* — Alexandre "Xtincell" DJengue


---

# ANNEXE CANON M — MANIPULATION MATRIX

> Canon absorbé depuis `MANIPULATION-MATRIX.md` (consolidation bible 2026-05). Source = stub de redirection.


> *Comment* une brand transforme son audience en propellant. Quatre modes opérationnels, un mix par brand, gouverné par les **7 Neteru actifs** (Phase 14/15 — cap APOGEE atteint).

Source unique de vérité sur les 4 modes. Toute discussion qui dévie d'un mode défini ici doit s'aligner ou déclencher un ADR. Lecture associée : [PANTHEON.md](PANTHEON.md), [APOGEE.md](APOGEE.md), [MISSION.md](MISSION.md).

---

## 1. Pourquoi ce paramètre ?

La cascade ADVE→RTIS produit du contenu. Mais "le bon contenu" dépend de *comment* la brand veut transformer son audience. Une brand premium ne convertit pas comme un FMCG mass. Un drop sneakers n'engage pas comme une chaîne YouTube éducative. Sans paramètre explicite, le système produit du contenu générique qui ne sert pas l'apogée — il occupe.

Ce paramètre **force** chaque Neter à adapter son comportement au mode, et **mesure** si le mode utilisé converge avec le mode déclaré. Sans cela, drift narratif silencieux.

---

## 2. Les 4 modes

### 2.1 — PEDDLER (le colporteur)

**Mécanisme** : pousse transactionnel direct. CTA explicite, urgence ("act now"), scarcité ("only 50 left"), prix proéminent. L'audience est traitée comme acheteur potentiel à convertir maintenant.

**Devotion ladder cible** : Spectateur → Intéressé. Recrute les paliers bas.

**Effet Overton** : push court terme. Déplacement brutal mais peu durable. La fenêtre revient à sa position si le push s'arrête.

**Risque** : volatilité, fatigue audience, churn élevé, image "vendeur". Adapté pour acquisition initiale ou drops opportunistes, pas pour cult-building durable.

**Exemples sectoriels (Afrique)** :
- FMCG promotion week ("Bonnet Rouge -20% jusqu'à dimanche")
- Mobile money cashback drops
- Fast fashion flash sales

**Comportement Neteru en peddler** :
- Mestor : séquences courtes, urgence, drops
- Artemis : prompts CTA-first, copy direct
- Ptah : visuels avec prix proéminent, scarcity cues, deadline visible
- Seshat : track conversion rapide (heures/jours) + churn
- Thot : seuil ROI agressif, veto J+7 si pas de conversion
- Anubis : paid search, retargeting agressif
- Imhotep : creators sales-DNA, bons en conversion

### 2.2 — DEALER (le revendeur compulsif)

**Mécanisme** : crée dépendance / addiction structurelle. Drops récurrents, FOMO programmé, hooks compulsifs, micro-narratives répétables. L'audience anticipe le prochain drop, organise sa vie autour. La marque devient routine.

**Devotion ladder cible** : Intéressé → Participant → Engagé. Recrute paliers intermédiaires.

**Effet Overton** : crée nouvelle norme. Le seuil acceptable se déplace par habitude — ce qui était exceptionnel devient standard. Très puissant sur le long terme si bien mesuré.

**Risque** : saturation audience (perte de nouveauté), backlash éthique (manipulation perçue), dépendance opérationnelle aux drops.

**Exemples sectoriels (Afrique)** :
- Sneaker drops Lagos / Abidjan
- Telcos data offers récurrents (drops mensuels)
- Music labels series releases (saisons)

**Comportement Neteru en dealer** :
- Mestor : séquences récurrentes, hooks compulsifs, calendar-driven
- Artemis : prompts à structure répétitive addictive, séries ("episode 3 of 12")
- Ptah : visuels addictifs, micro-narratives répétables, série-cohérente
- Seshat : track récurrence d'engagement (drop-to-drop), addiction patterns
- Thot : seuil ROI cumulatif (pas par-drop mais par-cohort), tolère J+30
- Anubis : push notifs récurrentes, séries email, drop timing
- Imhotep : creators avec DNA séries, capable de produire à cadence

### 2.3 — FACILITATOR (le facilitateur)

**Mécanisme** : aide l'audience à atteindre son objectif propre. Utilité concrète, formation, simplification d'un problème complexe. La marque est *outil* dans la vie de l'audience.

**Devotion ladder cible** : Engagé → Ambassadeur. Recrute paliers élevés (l'audience promeut la marque parce qu'elle l'aide).

**Effet Overton** : élargit Overton par démonstration. "Si la marque X montre que c'est possible, alors c'est dans le champ du faisable" — le seuil se déplace par standard nouveau.

**Risque** : ROI lent, dilution si la facilitation n'est pas distincte (quiconque peut faciliter), commoditisation.

**Exemples sectoriels (Afrique)** :
- Fintech tutorials (Wave, Orange Money éducation financière)
- AgriTech qui forme les agriculteurs (Twiga Foods, Babban Gona)
- Healthtech avec contenu sanitaire (mPharma)

**Comportement Neteru en facilitator** :
- Mestor : séquences éducatives, démonstration, tutoriels structurés
- Artemis : prompts informatifs, valeur d'usage explicite, structure how-to
- Ptah : visuels démonstratifs, infographies, captures d'écran tutorial
- Seshat : track engagement durable (semaines/mois), rétention cohort
- Thot : seuil ROI patient, tolère J+60
- Anubis : newsletters utiles, content syndication, guides
- Imhotep : creators éducateurs / formateurs, pédagogues

### 2.4 — ENTERTAINER (le divertisseur)

**Mécanisme** : engage par valeur de divertissement organique. Story, jeu, esthétique, émotion. La marque est *culture* — elle existe parce que l'audience aime y être.

**Devotion ladder cible** : Ambassadeur → Évangéliste. Recrute les paliers les plus hauts (les superfans organisés autour de la mythologie de marque).

**Effet Overton** : déplace Overton par contagion culturelle. La fenêtre se redéfinit autour de la brand parce que la brand *est* la culture qui l'occupe. C'est l'apogée — où la mission converge.

**Risque** : difficile à industrialiser, brand-dependent (un creator clé peut partir), ROI long, exposition au risque créatif (un faux pas culturel coûte cher).

**Exemples sectoriels (Afrique)** :
- Marques mode-culture (Maison Château Rouge, Tongoro)
- Marques musicale-sonore (Boomplay × artistes culte)
- Sports luxury (Wakanda One, Mosaero)

**Comportement Neteru en entertainer** :
- Mestor : séquences narratives, fiction de marque, world-building
- Artemis : prompts narratifs, esthétiques, structure story-driven
- Ptah : visuels esthétiques, story-rich, world-building, characters
- Seshat : track engagement émotionnel (commentaires qualitatifs, partages organiques, fanart, citations)
- Thot : seuil ROI patient, tolère J+90+, mesure cumulé sur saisons
- Anubis : earned media, viral plays, brand storytelling, partenariats culturels
- Imhotep : creators artistes / narratifs, capables de tenir l'arc créatif

---

## 3. Le Mix — somme = 1

Une brand n'est pas dans un seul mode. Elle a un **mix** — vecteur de 4 valeurs sommant à 1.

```typescript
type ManipulationMix = {
  peddler: number;     // 0..1
  dealer: number;      // 0..1
  facilitator: number; // 0..1
  entertainer: number; // 0..1
}; // invariant: peddler + dealer + facilitator + entertainer === 1
```

Exemples de mix par archétype brand :

| Archétype | peddler | dealer | facilitator | entertainer |
|---|---|---|---|---|
| FMCG mass discount | 0.50 | 0.20 | 0.20 | 0.10 |
| Streetwear drops | 0.10 | 0.55 | 0.05 | 0.30 |
| Fintech B2C éducative | 0.10 | 0.15 | 0.55 | 0.20 |
| Maison de luxe culturelle | 0.05 | 0.05 | 0.10 | 0.80 |
| Telco data offers | 0.30 | 0.40 | 0.20 | 0.10 |
| AgriTech formation | 0.05 | 0.10 | 0.70 | 0.15 |
| Sports brand de niche | 0.10 | 0.20 | 0.20 | 0.50 |

Le mix est déclaré dans `Strategy.manipulationMix`, pré-rempli par `sector-intelligence` au boot, ajusté en cascade pillar S (Strategy) et locké après lockdown S.

---

## 4. Imbrication dans la gouvernance

### 4.1 — DB Schema

```prisma
model Strategy {
  // ... existing fields
  manipulationMix Json   // { peddler, dealer, facilitator, entertainer } sum=1
  // …
}

model GenerativeTask {
  // ...
  manipulationMode String  // exactly one of: peddler / dealer / facilitator / entertainer
  // …
}

model BrandAction {
  // ...
  expectedManipulationMode String
  realisedManipulationMode String? // computed by Seshat post-deployment
  // …
}

model Creator {
  // ...
  manipulationStrengths Json // ["peddler", "entertainer"] etc.
  devotionFootprint     Json // Record<sectorId, superfansAcquis>
  // …
}
```

### 4.2 — Manifest extension

```typescript
// Glory tool manifest
{
  manipulationProfile?: ManipulationMode[];  // modes compatibles
  // undefined = mode-agnostic (e.g. brand-bible-extractor)
}
```

### 4.3 — Mestor pre-flight `MANIPULATION_COHERENCE` gate

Nouvelle precondition. Refuse les Intents qui sortent du mix stratégique :

```
Si mestor.emitIntent({ kind: "PTAH_MATERIALIZE_BRIEF", payload }) :
  → lit Strategy.manipulationMix
  → lit payload.brief.forgeSpec.manipulationMode (= "peddler" par exemple)
  → si Strategy.manipulationMix.peddler < THRESHOLD (default 0.05) :
    → veto avec reason MIX_VIOLATION
    → IntentEmission.status = VETOED
```

Override possible via `payload.overrideMixViolation = true` (rare cas — test, expérimentation isolée), mais loggé `Strategy.mixViolationOverrideCount` et flaggé en console operator.

### 4.4 — Thot ROI table par mode

`src/server/services/financial-brain/manipulation-roi-tables.ts` :

```typescript
export const ROI_BENCHMARKS_BY_MODE: Record<ManipulationMode, ROIBenchmark> = {
  peddler:     { window: "7d",  costPerSuperfanCeilingUsd: 5,   convergenceMinPct: 0.02 },
  dealer:      { window: "30d", costPerSuperfanCeilingUsd: 15,  convergenceMinPct: 0.05 },
  facilitator: { window: "60d", costPerSuperfanCeilingUsd: 25,  convergenceMinPct: 0.10 },
  entertainer: { window: "90d", costPerSuperfanCeilingUsd: 40,  convergenceMinPct: 0.20 },
};
```

Calibré initialement par benchmark sectoriel africain, recalibré mensuellement par Seshat à partir des `realisedSuperfans` observés.

### 4.5 — Anti-drift CI

`tests/governance/manipulation-coherence.test.ts` :
- Vérifie que tout `Strategy.manipulationMix` somme à 1 (invariant)
- Vérifie qu'aucun `GenerativeTask.manipulationMode` n'est hors mix (sauf override loggé)
- Vérifie que tous les Glory tools brief-to-forge ont `manipulationProfile` déclaré

`scripts/audit-manipulation-drift.ts` (cron hebdo) :
- Pour chaque Strategy avec >50 BrandAction déployés : compare `expectedManipulationMode` vs `realisedManipulationMode` (mesuré par Seshat à partir des engagement patterns).
- Si écart >20% sur >10 actions consécutives : flag drift signal, alerte operator.

---

## 5. Évolution

Ajouter un 5ème mode exige un ADR justifiant qu'il n'est pas réductible à un mix des 4 existants. Hypothèses considérées et rejetées :
- *Manipulator pur* (deceptive) — réductible à `peddler` extrême + ROI calibration agressive. Pas un mode opérationnel distinct, juste un peddler sans éthique.
- *Disrupter* (positionnement par contraste) — paramètre orthogonal (vise un concurrent), pas un mode d'engagement audience. À gérer via `brand-positioning`, pas la matrice.
- *Educator pur* — déjà couvert par facilitator.

Les 4 modes sont **exhaustifs et disjoints** par construction.

---

## 6. Lectures associées

- [PANTHEON.md](PANTHEON.md) — comportement par Neter selon mode
- [APOGEE.md](APOGEE.md) — framework général
- [MISSION.md](MISSION.md) — drift test étendu avec manipulation
- [LEXICON.md](LEXICON.md) — entrées Manipulation Matrix / Mix / Mode / 4 modes


---

# ANNEXE CANON F — FRAMEWORK TECHNIQUE

> Canon absorbé depuis `FRAMEWORK.md` (consolidation bible 2026-05). Source = stub de redirection.


Ce document décrit le framework qui régit l'ajout, la composition et le
remplacement des modules de l'OS. Il complète
[ARCHITECTURE.md](ARCHITECTURE.md) (qui décrit *l'état*) en exprimant
*les invariants* et *les dettes connues*.

## Les 5 piliers du framework

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Layer 6: app/, components/                                  │
   │   ↑ consomme uniquement via tRPC                             │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 5: components/neteru/  (Neteru UI Kit)                │
   │   ↑ consomme useNeteru hook (NSP)                            │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 4: server/trpc/                                       │
   │   ↑ governedProcedure (eval preconditions) → emitIntent      │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 3: server/services/                                   │
   │   ↑ ne s'appellent QUE via Mestor (sauf whitelist)           │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 2: server/governance/                                 │
   │   manifests, registry, event-bus, mestor, NSP, tenant-db,    │
   │   hash-chain, pillar-readiness, intent-kinds, slos, …        │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 1: lib/                                               │
   ├──────────────────────────────────────────────────────────────┤
   │  Layer 0: domain/  (zero IO, zero Prisma, zod uniquement)    │
   └──────────────────────────────────────────────────────────────┘
```

Chaque module appartient à une couche. Imports descendants seulement.
Cycles interdits (madge). Pillar enum hardcodé interdit hors `domain/`.

### Pilier 1 — Identity (qui appelle ?)

- Tout traffic métier passe par `mestor.emitIntent(kind, payload)`.
- Chaque intent est tracé dans `IntentEmission` avec
  `(intentKind, strategyId, caller, prevHash, selfHash, status, costUsd)`.
- Hash-chain par `strategyId` → tampering détectable. Job cron
  hebdomadaire vérifie les 1000 dernières lignes.
- Strangler middleware (`auditedProcedure`) loggue les mutations des
  routers non-encore-migrés sous `kind="LEGACY_MUTATION"` —
  l'audit-trail est complet *même pendant* la migration des 70 routers.

### Pilier 2 — Capability (qui peut faire quoi ?)

- Chaque service co-localise un `manifest.ts` qui déclare :
  - `governor` (MESTOR/ARTEMIS/SESHAT/THOT/PTAH/IMHOTEP/ANUBIS/INFRASTRUCTURE) — cf. [PANTHEON.md](PANTHEON.md)
  - `acceptsIntents` (les Intent kinds qu'il sait traiter)
  - `capabilities[]` avec, pour chacune :
    - `inputSchema` / `outputSchema` (Zod)
    - `sideEffects[]` (DB_WRITE / LLM_CALL / EXTERNAL_API / …)
    - `qualityTier` / `latencyBudgetMs` / `costEstimateUsd`
    - `preconditions[]` (gates de readiness — voir Pilier 4)
- Registry codegen (`scripts/gen-manifest-registry.ts`) → registre
  statique → tree-shakeable + auditable + plugin-compatible.
- ESLint custom rules :
  - `no-direct-service-from-router` (whitelist Mestor / pillar-gateway / …)
  - `no-hardcoded-pillar-enum`
  - `no-numbered-duplicates`
  - `no-cross-portal-import`
- Plugin externe : un dossier sous `plugins/<slug>/` avec son propre
  `manifest.ts` est mergé au registry au boot ; sandbox enforce les
  `sideEffects` déclarés.

### Pilier 3 — Concurrency (multi-tenant, idempotence)

- `tenantScopedDb(db, operatorId)` injecte `where: { operatorId }` sur
  *toutes* les opérations Prisma (findMany / findFirst / update /
  delete / create / count / aggregate / groupBy).
- Opt-out explicite via la whitelist `GLOBAL_TABLES` dans
  `src/server/governance/tenant-scoped-db.ts`.
- Capabilities marquent `idempotent: true` → le dispatcher peut retenter
  sans risque (utilisé en réplay de queue).
- `IntentQueue` pour les intents async : pickup par cron, status
  PENDING/RUNNING/DONE/FAILED.

### Pilier 4 — Pre-conditions (l'état du monde permet-il l'action ?)

C'est le pilier qui manquait avant ta question d'aujourd'hui.

- `src/server/governance/pillar-readiness.ts` est la *seule* source de
  vérité pour "ce pillar / cette strategy est-elle prête pour X ?"
- 5 gates : `DISPLAY_AS_COMPLETE`, `RTIS_CASCADE`, `GLORY_SEQUENCE`,
  `ORACLE_ENRICH`, `ORACLE_EXPORT`.
- Une capability déclare ses `preconditions[]` dans son manifest.
  `governedProcedure` les évalue *avant* d'invoquer le handler. Échec
  → `ReadinessVetoError` → `intent.vetoed` event → status `VETOED`.
- Le handler n'a *pas* besoin de re-checker ses inputs. La défense est
  centralisée et déclarative.
- L'UI consomme `pillar.readiness` (tRPC) — interdit d'inventer des
  maths de complétion ad-hoc. Les pages legacy qui font ça sont
  flaggées par `audit-preconditions.ts` (Phase 2 follow-up).

**Limite actuelle (dette ouverte)** : voir §"Dettes connues" plus bas.

### Pilier 5 — Streaming (prévisibilité visuelle)

- NSP (Neteru Streaming Protocol) — SSE sur `/api/nsp` avec resume
  cursor `?since=<iso>` et heartbeat 15s.
- `IntentEmissionEvent` persiste tous les `IntentProgressEvent` →
  replay complet possible après reconnexion.
- `useNeteru.intent(intentId)` côté client + 11 composants Neteru UI
  Kit (`MestorPlan`, `ArtemisExecutor`, `OracleEnrichmentTracker`, …).
- Pattern obligatoire : toute mutation > 300 ms doit rendre un
  composant Neteru UI Kit. `audit-preconditions.ts` flaggera les pages
  qui ne respectent pas (Phase 5 follow-up).

## Comment composer un nouveau module

```bash
# 1. scaffold
npm run manifests:scaffold -- --service=<slug> --name=<capability>

# 2. remplir 3 trous dans le stub
#    - inputSchema / outputSchema (Zod)
#    - sideEffects + preconditions
#    - corps de la fonction

# 3. régénérer le registry
npm run manifests:gen

# 4. test + audit
npm test
npm run audit:governance
npm run audit:preconditions
```

Le module est "shippable" quand :
- manifest passe `manifests:audit`
- ses préconditions sont déclarées (ou opt-out justifié)
- il a au moins 1 test
- il a un SLO dans `src/server/governance/slos.ts` (ou exemption)
- la PR a un label `phase/<n>` (cf. REFACTOR-CODE-OF-CONDUCT.md)

## Dettes adressées (closes)

Toutes les dettes listées ici sont fermées par le commit "purge debts"
(suivi de "ship Phases 0-8" + "pillar-readiness"). Le journal
historique reste pour la traçabilité.

### D-1. `StrategyLifecyclePhase` câblé ✓

`src/server/governance/strategy-phase.ts` expose
`getCurrentPhase(strategyId)` qui lit les signaux concrets (ADVE
maturity stage, validationStatus, Notoria pipeline stage,
OracleSnapshot count) et retourne la phase canonique
(INTAKE/BOOT/OPERATING/GROWTH) avec les blockers explicites pour
atteindre la phase suivante.

Le module **ne dépend pas** de `pillar-readiness` (pour éviter le
cycle) — il consomme directement l'assessor de `pillar-maturity`.

### D-2. Cache `Pillar.completionLevel` réconcilié ✓

`reconcileCompletionLevelCache(strategyId, pillarKey)` exporté par
`pillar-gateway` — appelé automatiquement à la fin de
`writePillarAndScore`. Le cache est désormais une *fonction pure* de
`(stage, validationStatus)` :

- LOCKED → FULL
- COMPLETE + non-LOCKED → COMPLET
- sinon → INCOMPLET

L'ancienne heuristique ad-hoc dans `notoria/lifecycle.ts` (fillRate ≥
0.9 + R+T appliquées) est supprimée — Notoria délègue à la gateway.

### D-3. 6 sources consolidées ✓

`evaluatePillarReadiness` lit maintenant les 6 colonnes :
- `content` (input du Zod strict + Zod partial)
- `validationStatus`
- `completionLevel` (cache — vérifié par `cacheConsistent`)
- `staleAt` (déclenche `PILLAR_STALE` reason sur tous les gates)
- maturity `stage` (assessor)
- (et accepte la phase lifecycle pour moduler les seuils)

Toute divergence du cache vs verdict canonique remonte un blocker
strategy-level avec reason `CACHE_DIVERGENCE`.

### D-4. Lint rule active ✓

`lafusee/no-adhoc-completion-math` détecte trois patterns :
- `<completionIdent> === 100` ou `>= 100`
- `filledCount / total * 100`
- `validationStatus === "VALIDATED" | "LOCKED"` hors gouvernance

Opt-out via `// lafusee:allow-adhoc-completion`. Severity warn (Phase
4 → error).

### D-5. Routers critiques migrés ✓

`enrichOracle`, `enrichOracleNeteru` (strategy-presentation) et
`generateBatch` (notoria) consomment `governedProcedure({kind,
inputSchema, preconditions})`. Les pré-conditions des manifests
firent automatiquement avant le handler.

Les autres routers restent sous `auditedProcedure` strangler — audit
intégral, mais pré-conditions non évaluées tant qu'ils ne migrent
pas. Migration progressive sous label `phase/3-router-batch-N`.

### D-6. Mapping event-driven actif ✓

Le bootstrap inscrit deux listeners :
- `pipeline.stage-advanced` (publié par
  `notoria/pipeline.advancePipeline`)
- `pillar.written` (publié par `pillar-gateway.writePillarAndScore`)

Sur chaque event, le bus appelle `getCurrentPhase` et publie
`strategy.phase-changed` si la phase a évolué. NSP peut donc streamer
la transition à l'UI.

## Dettes restantes / acceptées

- **Routers non-critiques** (≈ 65 sur 71) restent sous strangler
  uniquement. Audit OK, pré-conditions non vérifiées. Migration
  trunk-based, batch par batch.
- **Lint warns** : 245 warns du `audit-governance` (router-bypass +
  hardcoded-pillar-enum dans UI legacy). Convertis en errors à la fin
  de la migration des routers.

## Invariants vérifiés à chaque CI run

- `tsc --noEmit` clean
- 0 cycle (madge)
- 0 secret committé
- `audit-governance` : 0 erreur (warns acceptés sous quota)
- `audit-preconditions` : 0 finding (warn-only Phase 3, error fin Phase 4)
- `manifests:audit` : 0 erreur
- Hash-chain `IntentEmission` cohérent (cron hebdo)
- Phase label sur PR (sauf `out-of-scope` justifié)

## Ce que le framework NE garantit pas (encore)

- L'absence de bugs métier dans les handlers eux-mêmes (le framework
  n'introspecte pas le code business).
- La cohérence sémantique des recos Notoria (un opérateur peut
  accepter une reco contradictoire avec une autre — c'est business).
- L'isolation cross-region (multi-tenant ≠ multi-region — Phase
  ultérieure si scale-out hors d'un seul Postgres).

Le framework est conçu pour rendre les **bugs structurels** détectables
ou impossibles. Les bugs métier restent du ressort des tests
d'invariants spécifiques (cf. `tests/integration/`).


---

# ANNEXE CANON L — LEXIQUE NORMATIF

> Canon absorbé depuis `LEXICON.md` (consolidation bible 2026-05). Source = stub de redirection.


Le vocabulaire de La Fusée. Ce doc tranche les définitions canoniques. Toute discussion qui dévie d'un terme défini ici doit soit (a) être reformulée pour s'aligner, soit (b) déclencher un ADR pour modifier le lexique.

À lire avant : [MISSION.md](MISSION.md), [APOGEE.md](APOGEE.md).

---

## A — Termes mission

### **Apogée**
Point culminant d'une trajectoire orbitale. Dans La Fusée : palier ICONE, où la brand a accumulé assez de masse superfan pour générer son propre champ gravitationnel culturel et déplacer l'Overton dans son secteur. Cf. [MISSION.md §2.2](MISSION.md).

### **Brand**
Entité réelle (la marque). À distinguer de **Strategy** qui est sa représentation DB.

### **Cult formation**
Processus de transformation de l'audience en superfans organisés autour d'une brand. **CULTE** est le palier 5 (cult formed) ; **ICONE** est le palier 6 (cult crystallisé en référence patrimoniale). Cf. [MISSION.md §2](MISSION.md).

### **Cultural axis (axe culturel)**
Dans un secteur donné, vecteur d'orientation des marques (premium↔mass, traditional↔modern, etc.). Modélisé par `Sector.culturalAxis` JSON. Cf. `src/server/services/sector-intelligence/`.

### **DESIGN_SYSTEM**
Le DS canonique panda + rouge fusée. Phase 11 in flight. **4 couches cascade** : Reference (Tier 0 — palette brute, immuable hors ADR), System (Tier 1 — sémantique transverse `--color-*`), Component (Tier 2 — par primitive `--button-*`, `--card-*`...), Domain (Tier 3 — métier `--pillar-*`, `--division-*` (7 Neteru actifs), `--tier-*` (Creator), `--classification-*` (APOGEE)). **Surface** = densité par portail (`data-density="compact|comfortable|airy|editorial"`). Source unique de vérité : [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). ADR fondateur : [ADR-0013](adr/0013-design-system-panda-rouge.md). Anti-drift CI : `tests/unit/governance/design-*.test.ts`. Vocabulaire visuel : [DESIGN-LEXICON.md](DESIGN-LEXICON.md).

### **Devotion Ladder**
Échelle d'engagement audience → superfan : Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste. Les deux derniers paliers sont des superfans au sens strict. Source : `devotion-engine` service + `devotion-ladder` router.

### **Drift**
Divergence entre l'état déclaré (manifests, ADRs) et l'état réel (code, DB). Détecté par `governance-drift.yml` workflow + `audit-mission-drift.ts`. Pour le DS spécifiquement : `audit-design-drift.ts` + 6 tests anti-drift CI bloquants (cf. [DESIGN-SYSTEM.md §13](DESIGN-SYSTEM.md)).

### **Évangéliste**
Palier supérieur de la Devotion Ladder. Superfan qui recrute activement d'autres superfans, défend la brand, internalise sa mythologie. Source de la propagation auto-entretenue.

### **Échelle de marché (marketScale)**
Portée DÉCLARÉE du terrain de jeu d'une marque — QUARTIER → VILLE → REGION → NATION → CONTINENT → MONDE (`Strategy.marketScale`, + `addressableAudience` et `brandFoundedYear`). Étalonne les cibles du plafond d'évidence CULTE/ICONE (une masse absolue ne prouve pas la même chose selon le terrain) et le référentiel affiché du palier (« Forte — échelle nationale »). Canon : `src/domain/market-scale.ts` (ADR-0126, enfant ADR-0086). Sans échelle déclarée : cibles historiques (bande NATION) + « échelle non déclarée » affiché honnêtement. Distinct de `marketScopedDb` (ADR-0105 — visibilité des marchés gelés).

### **Founder**
Le porteur (CEO / fondateur) d'une brand. Pilote son Cockpit. Doit devenir **premier superfan** de sa propre marque. Cf. `founder-psychology` service + `<FounderRitual>` UI.

### **Glory tools**
**56 outils CORE / 149 au registre étendu** de production Artemis (recompte 2026-07-11 — `CORE_GLORY_TOOLS`/`EXTENDED_GLORY_TOOLS` ; décomposition CORE historique : 40 legacy + 9 Phase 13 Oracle + 4 Phase 14 Imhotep + 3 Phase 15 Anubis). Chaque tool = thruster spécialisé (concept-generator, crew-matcher, ad-copy-generator, etc.). Catalogue dans `src/server/services/artemis/tools/registry.ts`. Inventory auto-régénéré : [glory-tools-inventory.md](glory-tools-inventory.md).

### **Glory sequence**
Enchaînement topologiquement trié de Glory tools (skill tree). **94 séquences** cataloguées dont 91 en lifecycle DRAFT (recompte 2026-07-11 — `ALL_SEQUENCES`). Source : `sequence-vault` + `artemis/tools/sequences.ts`.

### **Deliverable Forge** *(Phase 17b, ADR-0050 — anciennement ADR-0037)*
Surface output-first du composer : le founder pointe un `BrandAsset.kind` matériel cible (KV_VISUAL, PRINT_AD_SPEC, …) et l'OS résout en arrière la cascade Glory→Brief→Forge complète — DAG des briefs requis (via `GloryToolForgeOutput.requires`), scan vault pour réutilisation ACTIVE/STALE_REFRESH, composition complète avec estimation coût. Inversion du flow input-first historique (où le founder devait choisir un brief en amont). Page : [/cockpit/operate/forge](../../src/app/(cockpit)/cockpit/operate/forge/page.tsx). Service : [deliverable-orchestrator/](../../src/server/services/deliverable-orchestrator/index.ts) — Propulsion / Artemis governor / `CHAIN_VIA:artemis`. Intent : `COMPOSE_DELIVERABLE` (sync dispatcher, ré-émet `INVOKE_GLORY_TOOL` + `PTAH_MATERIALIZE_BRIEF` + `PROMOTE_BRAND_ASSET_TO_ACTIVE`). Mode actuel : PREVIEW (read-only) — le mode DISPATCHED async (avec NSP streaming) viendra dans un commit ultérieur.

### **Industry OS**
La Fusée. Pas "platform", pas "OS" tout court — *Industry OS* (codé comme tel). Cf. CLAUDE.md.

### **MAAT**
Déesse égyptienne et principe d'ordre/balance. **DÉPRÉCIÉE** comme nom de framework — remplacée par APOGEE. Cf. ADR-0001. Document historique : [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md).

### **NETERU**
Panthéon de gouvernance — **7 Neter actifs (cap APOGEE atteint, 7/7)** depuis Phase 14/15 :
1. **Mestor** — Guidance, décision, dispatcher unique d'Intents
2. **Artemis** — Propulsion (phase brief), Glory tools rédactionnels
3. **Seshat** — Telemetry, observation, capte signaux (incluant Tarsis sub-component)
4. **Thot** — Sustainment + Operations, fuel manager, cost gates, finances
5. **Ptah** — Propulsion (phase forge), matérialisation des briefs en assets concrets — actif Phase 9, ADR-0009
6. **Imhotep** — Crew Programs, talent matching + formation Académie + qc-routing — actif Phase 14, ADR-0019 (supersedes ADR-0017)
7. **Anubis** — Comms, broadcast multi-canal, ad networks, notification center, Credentials Vault — actif Phase 15, ADR-0020 (supersedes ADR-0018) + ADR-0021

Pluriel égyptien de *Neter* = dieu/principe. Source unique de vérité narrative : [PANTHEON.md](PANTHEON.md). Toute fonction nouvelle hors panthéon exige un ADR de relèvement de plafond.

### **Overton (window/fenêtre)**
Axe culturel actuel d'un secteur. Quand la brand bend l'axe (déplace la fenêtre), elle redéfinit le secteur. Pas mesuré directement — observé via Tarsis signaux + computed via `sector-intelligence.computeBrandDeflection`.

### **Palier (cultural)**
Position culturelle d'une brand : LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE. 6 paliers. Source : `quick-intake/brand-level-evaluator.ts` + `advertis-scorer/semantic.ts`. À ne pas confondre avec **Lifecycle phase** ni **Mission step**.

### **Pesée**
Évaluation d'un Intent contre les pré-conditions (Pillar 4) + cost-gate (Pillar 6) + post-conditions. Métaphore directement dérivée de la pesée du cœur dans la mythologie MAAT. Maintenue dans APOGEE comme rituel d'évaluation, sans le nom MAAT.

### **Strategy**
Record DB de la mission profile d'une Brand. C'est la table `Strategy` dans Prisma. À ne pas confondre avec "stratégie marketing" générique. Quand on parle de "la stratégie de Brand X", on parle de son record `Strategy`.

### **Substance**
Premier mécanisme de la séquence opérationnelle. Identité authentique, distincte, valeur claire. Pillars A+D+V. Cf. [MISSION.md §3](MISSION.md).

### **Superfan**
Personne qui recrute, défend, sacrifie pour, et internalise une brand. Pas un client, pas un fan — ambassadeur ou évangéliste de la Devotion Ladder. **Masse stratégique** (cf. SuperfanMassMeter UI), pas KPI.

### **Tarsis**
Sous-domaine de Seshat dédié aux **weak signals temps-réel** : presse, conversations, tendances, vocabulaire sectoriel, claim-imitation, embedding deltas. **Pas un Neter** — sub-domaine de Seshat (frère d'Argos). Source : `seshat/tarsis/`. Cf. [ADR-0083](adr/0083-argos-placement-seshat-yggdrasil-seam.md).

### **Argos**
Sous-domaine de Seshat dédié aux **références culturelles historiques curées** — campagnes mondiales iconiques décodées en `CampaignReferenceDossier` signés (palette/typo/voice/visualCodes/keyPhrases/axes). **Pas un Neter** — sous-domaine Seshat (frère de Tarsis), formalisé Phase 22. Deux projections via Yggdrasil : (a) interne via `seshat/references.queryReferences()` + `enrichBrief()` (consumé par Artemis briefs), (b) publique via le site éditorial sœur `apps/argos/` (auto-publish on `safety.verdict === 'PASS'`). Pattern média Stripe Press / Red Bull Media House appliqué à La Fusée comme sub-brand de service. Cf. [ADR-0083](adr/0083-argos-placement-seshat-yggdrasil-seam.md), [REFONTE-PLAN.md Phase 22](REFONTE-PLAN.md). Code vendorisé `docs/external-design/argos-hunter-v1/` (gelé). Source au port : `src/server/services/seshat/argos/`.

### **Hunter**
Sub-agent 4-phases (harvest → coerce Zod → ingest → projection-decide) qui produit les `CampaignReferenceDossier` du sous-domaine Argos. **Ni Neter ni opérateur** — c'est un *sub-agent* exécuteur d'Intents sous gouvernance Mestor (Intent emission par run), Thot (LLM Gateway cost gate), Anubis (NSP SSE progress), Seshat (rattachement manifest). Distinction tranchée : Neter = gouverneur (compte 7/7) ; sub-agent = exécuteur (ne compte pas). Cf. [ADR-0083 §2](adr/0083-argos-placement-seshat-yggdrasil-seam.md).

### **CampaignReferenceDossier**
Artefact Prisma (à créer au port Phase 22-A0) — dossier signé produit par Hunter qui capture le **DNA exploitable** d'une campagne référence (palette physique + type metrics + voice + visualCodes + keyPhrases + axes culturels) + un `safety.verdict` ∈ `PASS | QUARANTINE | REJECT`. Consommé par Artemis via `seshat/references.queryReferences()` + `enrichBrief()`. PASS → publication automatique sur `apps/argos/`. Cf. [ADR-0083](adr/0083-argos-placement-seshat-yggdrasil-seam.md).

### **Ptah**
Le 5ème Neter actif (Phase 9, ADR-0009). **Forge master** — matérialise les briefs Artemis en assets concrets (image/vidéo/audio/icône/design/stock/classification) via providers externes (Magnific, Adobe Firefly, Figma, Canva). Démiurge égyptien créateur par le verbe — métaphore directe `prompt → asset`. Sous-système APOGEE = Propulsion (downstream Artemis). Source : `src/server/services/ptah/`.

### **Imhotep**
Le 6ème Neter **actif** (Phase 14, ADR-0019 supersedes ADR-0017). Master of Crew Programs — orchestrateur matching talent (matching-engine), évaluation tier (tier-evaluator), composition équipe (team-allocator), formation Académie (Course/Enrollment), qc-routing (qc-router). Sage humain égyptien déifié. Sous-système APOGEE = Crew Programs (Ground #6). Source : `src/server/services/imhotep/`. Page hub : `/console/imhotep`.

### **Anubis**
Le 7ème Neter **actif** (Phase 15, ADR-0020 supersedes ADR-0018 ; étendu Phase 16 par ADR-0025 + ADR-0026). Master of Comms — orchestrateur broadcast multi-canal (CommsPlan + BroadcastJob), ad networks (Meta/Google/X/TikTok), email/SMS (Mailgun/Twilio), notification center temps-réel (in-app SSE + Web Push VAPID/FCM + templates Handlebars/MJML + digest), MCP bidirectionnel (server agrégé + client entrant Slack/Notion/Drive/Calendar/Figma/GitHub), Credentials Vault. Psychopompe égyptien guide entre mondes. Sous-système APOGEE = Comms (Ground #7). Source : `src/server/services/anubis/`. Pages : `/console/anubis` + `/console/anubis/credentials` + `/console/anubis/notifications` + `/console/anubis/mcp`.

### **NSP — Neteru Streaming Protocol**
Couche transport runtime pour push live SSE vers le client (ADR-0025). `src/server/services/nsp/` — pubsub in-memory keyed par `userId`, événements typés (`NotificationEvent | IntentProgressEvent | McpInvocationEvent`). Le modèle persistant correspondant est `IntentEmissionEvent` (Prisma) pour replay/audit ; NSP est l'aiguillage runtime. Pas de manifest (utilitaire pur, pas une capability métier). **Sous-protocole de Yggdrasil** — c'est le canal temps-réel de la circulation de valeur (ADR-0082).

### **Yggdrasil**
**Substrat canonique de circulation de la valeur dans La Fusée OS** (ADR-0082, **amended 2026-05-16**). Topologie par laquelle toute valeur produite à un point quelconque du système (enrichissement de pilier, output Glory tool, drift sectoriel, cascade RTIS, snapshot calibration, transition `BrandAsset.state`, signal Tarsis, dossier Argos, …) atteint tous les consommateurs qui en dépendent, dans le respect de **trois invariants** : (Q1) traçabilité via `IntentEmission.id` hash-chained ; (Q2) observabilité via `NspEvent` ou `IntentEmission.payload` ; (Q3) gouvernance des **gates d'entrée** via Mestor — aucune entrée dans Yggdrasil ne bypasse les gates Mestor. **Pas un Neter** — substrat/protocole organique comme NSP ou la layering cascade. **Substrat ungouverné** (Mestor possède les gates qui filtrent l'entrée dans Yggdrasil, pas le substrat lui-même — distinction structurante per STATE_FINAL_BLUEPRINT §5.2 doctrinal correction). Cap APOGEE 7/7 préservé. Métaphore norroise : l'arbre-monde qui relie les 9 royaumes — La Fusée Yggdrasil relie les 4 portails (Console / Cockpit / Crew / Intake) et les 7 Neteru.

### **Push Subscription**
Endpoint Web Push d'un device (browser/mobile) lié à un `User`. Model Prisma `PushSubscription { endpoint UNIQUE, p256dh, auth, userAgent, isActive }`. Enregistré via `notification.registerPush` mutation après accord du user (`Notification.requestPermission()` + `pushManager.subscribe`). Fan-out via provider façade VAPID (`src/server/services/anubis/providers/web-push.ts`). Cf. ADR-0025.

### **NotificationTemplate**
Template multi-canal (IN_APP/EMAIL/SMS/PUSH) stocké en Prisma. `bodyHbs` (Handlebars subset, escape par défaut) + `bodyMjml` optionnel pour HTML email rendu par MJML. CRUD via `/console/anubis/mcp` onglet Templates. Multi-tenant (`operatorId` null = system template). Slug unique. Cf. ADR-0025 §4.

### **Digest**
Récap périodique (DAILY/WEEKLY) groupant les notifications IN_APP non-lues d'un user dans un email envoyé via template `notification-digest`. Respecte `NotificationPreference.digestFrequency`. Service `src/server/services/anubis/digest-scheduler.ts`. À câbler sur cron Phase 16.1.

### **MCP — Model Context Protocol**
Standard Anthropic d'exposition d'outils LLM (https://modelcontextprotocol.io). La Fusée gère **MCP bidirectionnel** sous Anubis (ADR-0026) :
- **Sortant** (server) : `/api/mcp` agrège les 10 sous-serveurs `src/server/mcp/{advertis-inbound, artemis, creative, guild, intelligence, notoria, operations, ptah, pulse, seshat}` en un manifest unifié pour Claude Desktop / Claude Code / autres clients externes.
- **Entrant** (client) : Anubis consomme des MCP servers tiers (Slack, Notion, Drive, Calendar, Figma, GitHub, **Higgsfield**) via `McpRegistry direction=INBOUND` + Credentials Vault (`connectorType="mcp:<serverName>"`).

Models : `McpRegistry` (cartographie), `McpToolInvocation` (audit log lié à `intentId`). Page : `/console/anubis/mcp` (3 onglets Inbound/Outbound/Templates).

### **OAuth 2.1 Device Flow (RFC 8628)**
Pattern d'authentification pour MCP servers externes qui exposent un OAuth Authorization Server (Phase 16, ADR-0048 — anciennement ADR-0028, renuméroté 2026-05-05). Premier connector du repo : Higgsfield. Discovery via RFC 9728 (`/.well-known/oauth-protected-resource` → `authorization_servers[]` → `/.well-known/oauth-authorization-server`). 4 étapes : (1) discover, (2) `startDeviceFlow` retourne `verification_uri_complete`, (3) `pollTokenEndpoint` jusqu'à autorisation user, (4) `refreshIfNeeded` transparent dans `mcp-client` quand `expires_at < now+60s`. Tokens persistés dans `ExternalConnector.config` (chiffré au repos via pgcrypto). Service : `src/server/services/anubis/oauth-device-flow.ts`. Intent kinds : `ANUBIS_OAUTH_DEVICE_FLOW_START` / `_POLL` / `ANUBIS_OAUTH_REFRESH_TOKEN`. Convention env var client_id : `<UPPERCASE_SERVER_NAME>_OAUTH_CLIENT_ID`.

### **Higgsfield**
MCP server externe (https://mcp.higgsfield.ai/mcp) — provider AI motion/lifestyle imagery exposé via 3 Glory tools optionnels (Phase 16, ADR-0048 — anciennement ADR-0028) : `higgsfield-dop-camera-motion` (DoP, mouvements caméra cinématiques), `higgsfield-soul-portrait` (Soul, portraits lifestyle hyperréalistes), `higgsfield-steal-style-transfer` (Steal, style transfer vidéo). Tous flag `requiresPaidTier: true`. Auth via OAuth 2.1 device flow. **Pas un provider Ptah** — atomique, optionnel, invocable directement par Artemis. Pour matérialiser un output Higgsfield en `BrandAsset`, l'opérateur déclenche `PTAH_MATERIALIZE_BRIEF` après coup.

### **Glory tools — paid tier gate**
Champ `requiresPaidTier?: boolean` sur `GloryToolDef` (Phase 16-A, ADR-0048 — anciennement ADR-0028). Si `true`, `executeTool` vérifie via `checkPaidTier(strategy.userId, paidTierAllowList)` qu'une `Subscription` active existe dans la liste des tiers payants (default : `COCKPIT_MONTHLY` + `RETAINER_BASIC` + `RETAINER_PRO` + `RETAINER_ENTERPRISE` ; exclus `INTAKE_PDF` / `ORACLE_FULL` qui sont one-shots). Sinon retourne output structuré `{status: "TIER_GATE_DENIED", reason, configureUrl, requiredTiers}` sans throw — UI surface CTA upgrade. Helper : `src/server/services/glory-tools/tier-gate.ts`.

### **Credentials Vault**
Pattern back-office (ADR-0021) — tout connector externe (ad networks, email, SMS, futurs) est CRUDé via UI `/console/anubis/credentials` qui pilote le model `ExternalConnector` existant. Provider façades feature-flagged : retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés API. Pattern réutilisable par tout futur Neter qui aurait besoin d'integrations externes.

### **ForgeBrief / ForgeSpec**
Brief Artemis qui contient un `forgeSpec` structuré → handoff downstream Ptah. Glory tools brief-to-forge produisent un `ForgeBrief` ; brief-only produisent un `RawBrief` sans `forgeSpec`.

### **Brief mandatory gate (ADR-0049)**
Précondition runtime qui refuse toute création de `CampaignAction` ou de `Mission` campaign-scoped sur une `Campaign` qui n'a ni `activeBriefId` ni `CampaignBrief` rattaché. Implémentation : `assertCampaignHasBrief(campaignId, db?)` dans `src/server/services/campaign-manager/brief-gate.ts`. Throw `BriefMissingError` (code `BRIEF_MISSING`). Le statut lecture-seule pour gating UI passe par `getCampaignBriefStatus` ou les procedures tRPC `campaignManager.briefStatus` / `briefStatusMany` / `listBriefsForStrategy`. **Hors scope** : Glory tools brief-only (producteurs légitimes), `PTAH_MATERIALIZE_BRIEF` (ForgeBrief en input par construction), missions standalone. Cf. [ADR-0049](adr/0049-brief-mandatory-gate.md) (anciennement ADR-0034, renuméroté 2026-05-05 — conflit d'agents).

### **Devotion Footprint**
Historique de superfans recrutés par un creator dans chaque secteur. `Creator.devotionFootprint: Record<sectorId, superfansAcquis>`. Utilisé par Imhotep pour matching.

### **BrandAsset / Brand Vault**
**Vault unifié de la marque** — réceptacle Prisma (`BrandAsset`) pour TOUS les actifs de la marque, intellectuels comme matériels. Phase 10 (ADR-0012). Couvre :

- **Actifs intellectuels** (`family=INTELLECTUAL`, `content` Json structuré) : Big Idea, Brief créatif, Brief 360°, Brainstorm, Concept, Claim, Manifeste, Naming, Positioning, Tone Charter, Persona, Superfan Journey, KV Art Direction Brief, Script, Storyboard, Sound Brief, Voiceover Brief, Casting Brief, Vendor Brief, Print Ad Spec, Social Copy, Radio Copy, Long Copy, Value Proposition, Pitch, Chromatic Strategy, Typography System, Logo Idea, Trend Radar, Compliance Report, etc.
- **Actifs matériels** (`family=MATERIAL`, `fileUrl` rempli) : KV image (Ptah forgé Nano Banana), spot vidéo (Kling/Veo), jingle audio (TTS/voice clone), packaging mockup, OOH layout, logo final.

Cycle de vie gouverné : **DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED**. Une marque garde 1 BrandAsset ACTIVE par kind clé sur chaque Campaign (`Campaign.activeBigIdeaId`, `activeBriefId`, `activeClaimId`, `activeManifestoId`, `activeKvBriefId`).

Les Glory tools brief-only déposent automatiquement leurs outputs dans le vault via `sequence-executor` (mapping `outputFormat → kind` dans `brand-vault/engine.ts FORMAT_TO_KIND`). Les forges Ptah promeuvent leurs `AssetVersion` en BrandAsset matériel via `chainGloryToPtah`. Lineage hash-chain : `BrandAsset.sourceIntentId` (IntentEmission INVOKE_GLORY_TOOL ou PTAH_MATERIALIZE_BRIEF), `sourceGloryOutputId`, `sourceAssetVersionId`, `parentBrandAssetId` (versioning), `supersededById` (chaîne d'évolution).

Intent kinds gouvernés : `SELECT_BRAND_ASSET`, `PROMOTE_BRAND_ASSET_TO_ACTIVE`, `SUPERSEDE_BRAND_ASSET`, `ARCHIVE_BRAND_ASSET`. Source : `src/server/services/brand-vault/engine.ts` + ADR-0012.

### **SuperAsset (terme déprécié)**
Concept conceptuel utilisé en discussion comme synonyme de "actif intellectuel raffiné, produit de séquence". Dans le code : il n'y a **pas** de table `SuperAsset` — utiliser `BrandAsset` (réceptacle unifié, voir entrée ci-dessus).

### **Filtreur qualifiant**
Service `source-classifier` (governor MESTOR) qui prend une `BrandDataSource` EXTRACTED (PDF brandbook, logo PNG, note manuelle, URL) et propose 1→N `BrandAsset(state=DRAFT)` classés par `kind` canonique (LOGO_FINAL, CHROMATIC_STRATEGY, TONE_CHARTER, MANIFESTO, …) avec `pillarSource` mono-pillaire dérivé de la table `KIND_TO_PILLAR`. Pipeline hybride : heuristique mime+nom+contenu, fallback Claude vision pour images, LLM decomposer pour documents riches (1 brandbook → 5+ BrandAssets distincts couvrant ≥3 piliers ADVERTIS). Lineage source→asset via `BrandAsset.metadata.sourceDataSourceId`. Validation opérateur via la section "Propositions vault" de `/cockpit/brand/sources` (Accepter / Modifier kind / Rejeter). Intent kinds : `CLASSIFY_BRAND_SOURCE`, `PROPOSE_VAULT_FROM_SOURCE`. ADR : [ADR-0027](adr/0027-rag-brand-sources-and-classifier.md).

### **RAG sources**
Indexation des `BrandDataSource` du portail de marque dans le RAG Seshat (`BrandContextNode` avec `kind="BRAND_SOURCE"`). Chaque source EXTRACTED est chunkée (`chunkText`, paragraph/sentence-aware, ≤2500 chars/chunk) et embedée via le pipeline multi-provider existant (Ollama → OpenAI → no-op). Chunks pillar-neutres (`pillarKey=null`) — un brandbook PDF peut être retrouvé pour des queries de n'importe quel pilier ADVERTIS sans biais d'indexation. Citation verbatim disponible via `getOracleBrandContextByQuery(strategyId, query, { includeSources: true })` qui retourne un bloc `sourceReferences[]` distinct du narratif lossy. Intent kind : `INDEX_BRAND_SOURCE`. ADR : [ADR-0027](adr/0027-rag-brand-sources-and-classifier.md).

### **UPgraders**
L'agence/fixer qui opère La Fusée. Industrialise le marché créatif africain. Toujours capitalisé U-P-graders.

---

## B — Termes architecturaux (APOGEE)

### **APOGEE**
Le framework. Architecture de pilotage de trajectoire orbitale. Cf. [APOGEE.md](APOGEE.md), [ADR-0001](adr/0001-framework-name-apogee.md).

### **Capability**
Fonction nommée et typée exposée par un service via son manifest. Unité atomique d'invocation.

### **Cascade (ADVERTIS)**
Enchaînement A→D→V→E→R→T→I→S, avec dépendances unidirectionnelles. Loi 2 d'APOGEE (séquencement étages).

### **Cockpit**
Pont des founders. Portail `(cockpit)/cockpit/*`. À ne pas confondre avec le mot anglais "cockpit" générique — désigne *littéralement le pont de pilotage* d'une fusée.

### **Crew Quarters**
Pont des spécialistes embarqués. Portails Agency + Creator.

### **Deck**
Un des 3 ponts (Mission Control / Cockpit / Crew Quarters) + 1 launchpad (Intake). Cf. APOGEE §5.

### **Intent**
Unité atomique de causalité dans APOGEE. Tout effet métier dérive d'un Intent. Cf. `intent-kinds.ts`.

### **Intent kind**
Type d'Intent (FILL_ADVE, RUN_RTIS_CASCADE, PROMOTE_FORTE_TO_CULTE, etc.). Catalogue dans `src/server/governance/intent-kinds.ts`.

### **Lifecycle phase**
Phase de la relation UPgraders ↔ Brand : INTAKE / BOOT / OPERATING / GROWTH. Source : `strategy-phase.getCurrentPhase()`. À ne pas confondre avec les autres dimensions, cf. [DIMENSIONS.md](DIMENSIONS.md).

### **Manifest**
Fichier `manifest.ts` co-localisé avec un service. Déclare governor, capabilities, side-effects, missionContribution. Format : `NeteruManifest` (services) ou `GloryToolManifest` (Glory tools).

### **Mission**
1. Le travail de transformation d'une brand vers son apogée (sens APOGEE).
2. Une livraison creative ad-hoc dans Operations (sens commercial — table `Mission` Prisma).
Selon contexte. Préférer **brand mission** vs **creative mission** quand ambigu.

### **Mission Control**
Pont des opérateurs UPgraders. Portail `(console)/console/*`.

### **Mission step**
Étape opérationnelle 1-5 de la séquence cult-building : Substance, Engagement, Accumulation, Gravité, Overton. Champ manifest `missionStep`. Cf. [MISSION.md §3](MISSION.md), [DIMENSIONS.md](DIMENSIONS.md).

### **Manipulation Matrix**
Paramètre transverse à 4 modes décrivant *comment* la brand transforme l'audience en propellant : **peddler** (transactionnel direct), **dealer** (addiction structurelle), **facilitator** (utilité), **entertainer** (divertissement organique). Source : [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md).

### **Manipulation Mix**
Vecteur 4 valeurs sommant à 1 : `{ peddler, dealer, facilitator, entertainer }`. Stocké dans `Strategy.manipulationMix`. Locké après lockdown pillar S.

### **Manipulation Mode**
Une des 4 valeurs de la matrice. Champ `GenerativeTask.manipulationMode`, `BrandAction.expectedManipulationMode`, `GloryTool.manipulationProfile[]`.

### **NSP (Neteru Streaming Protocol)**
Protocol SSE pour diffuser les `IntentProgressEvent` du backend vers le frontend en temps réel. Source : `src/server/governance/nsp/`.

### **Oracle**
Le livrable conseil dynamique de **35 sections / 3 tiers** (Phase 13 ADR-0014, composition revue Phase 17 cleanup ADR-0045). Le produit visible côté client. Source : `strategy-presentation` service (`SECTION_REGISTRY` types.ts). Pas le moteur — c'est le *output*. Tiers : CORE (23, incl. Imhotep Crew Program #34 + Anubis Plan Comms #35 promues post-Phase 14/15) + BIG4_BASELINE (7) + DISTINCTIVE (5).

### **Oracle phase**
Section rédactionnelle 1-5 du livrable Oracle. À ne pas confondre avec **Lifecycle phase** ni **Mission step**.

### **OracleError**
Classe d'erreur typée du pipeline d'enrichissement Oracle (`enrichAllSections`, `enrichAllSectionsNeteru`, frameworks Artemis, séquences Glory, writeback pillar-gateway). Tout `throw` du service `strategy-presentation/` doit être une `OracleError` avec un code listé dans `ORACLE_ERROR_CODES`. Le code remonte vers `error-vault` (champ `ErrorEvent.code`) et vers le frontend via `TRPCError.cause = { code, governor, remediation, recoverable, context }`. Source : [src/server/services/strategy-presentation/error-codes.ts](../../src/server/services/strategy-presentation/error-codes.ts). ADR : [ADR-0022](adr/0022-oracle-error-codes.md).

### **OracleErrorCode**
Code typé `ORACLE-NNN` où :
- **1xx** = pre-conditions (utilisateur a un blocker — ADVE pas mûr, budget Thot dépassé)
- **2xx** = exécution (framework Artemis, séquence Glory, LLM Gateway, phase Seshat / Mestor)
- **3xx** = writeback (pillar-gateway refus, Zod validation, seeding)
- **9xx** = infrastructure (sérialisation governance, hash chain, bug NEFER non catégorisé)

Chaque code porte 4 champs : `fr` (message FR), `hint` (où chercher / quoi faire), `governor` (Mestor / Artemis / Seshat / Thot / Infrastructure), `recoverable` (true si l'erreur est attendue / le pipeline peut continuer en circuit-breaker section-level). Catalogue source : `ORACLE_ERROR_CODES` const. Test anti-drift : [tests/unit/governance/oracle-error-codes.test.ts](../../tests/unit/governance/oracle-error-codes.test.ts).

### **Oracle Incidents (page admin)**
Vue dédiée [/console/governance/oracle-incidents](../../src/app/(console)/console/governance/oracle-incidents/page.tsx) qui groupe les `ErrorEvent` par `code` `ORACLE-NNN`, affiche gouverneur + remédiation, fenêtre 24h/3j/7j/30j, stratégies impactées. Distincte de `/console/governance/error-vault` qui reste la vue générique multi-source. Source : router `errorVault.oracleIncidents`.

### **Pillar (ADVERTIS)**
Un des 8 axes : A (Authenticité), D (Distinction), V (Valeur), E (Engagement), R (Risque/Recurrence), T (Track), I (Innovation), S (Strategy). Source : `src/domain/pillars.ts` SSOT. Hardcoder leurs strings en dehors de domain/ = lint fail.

### **Pré-condition / Post-condition**
Garde déclarative évaluée par `governedProcedure`. Pré-conditions (Pillar 4) défendent l'INPUT ; Post-conditions (Pillar 6.2) défendent l'OUTPUT. Cf. APOGEE §6.

### **Stage (rocket)**
1. Stage 1 — Booster : pillars A+D+V+E s'allument ensemble.
2. Stage 2 — Mid : pillars R+T.
3. Stage 3 — Upper : pillars I+S.
À ne pas confondre avec Pillar (qui est une *partie* d'un stage).

### **Strangler procedure (`auditedProcedure`)**
Wrapper tRPC qui logge un router non-encore-migré sans bloquer. Permet d'avoir 100% audit trail pendant la migration progressive Phase 3.

### **Sub-system**
Une des 8 catégories APOGEE : Propulsion, Guidance, Telemetry, Sustainment (Mission Tier) + Operations, Crew Programs, Comms, Admin (Ground Tier).

### **Tier (qualityTier)**
S / A / B / C — qualité demandée pour une capability LLM. Drive le routing du LLM Gateway. À ne pas confondre avec **palier** (LATENT → ICONE).

### **Veto**
Refus structurel d'un Intent, premier-citoyen du lifecycle. Émis par Mestor (préconditions) ou Thot (cost gate).

---

## C — Termes opérationnels

### **Audit trail**
Trace immuable de toute mutation business. Stockée dans `IntentEmission` avec hash-chain (prevHash + selfHash). Vérifiée hebdo par `verify-hash-chain.ts`.

### **Compensating intent**
Intent qui annule un Intent précédent. Mécanise la réversibilité quand le métier le permet. Cf. APOGEE §10.5.

### **Hash-chain**
Mécanisme tamper-evidence : chaque ligne `IntentEmission` calcule `selfHash = sha256(content + prevHash)`. Toute falsification d'une ligne est détectable car la chaîne casse.

### **IntentEmission**
Table Prisma centrale : audit log de tous les Intents émis. Hash-chained. Source de vérité pour le replay.

### **IntentEmissionEvent**
Table Prisma : événements de progression d'un Intent (PROPOSED, EXECUTING, etc.) consommés par NSP.

### **Operator**
Un tenant UPgraders. Ex: agence régionale Cameroun, agence Côte d'Ivoire. Tous les WHERE Prisma sont scopés `operatorId` via `tenantScopedDb`.

### **Plugin (external)**
Module tiers qui ajoute une capability sans toucher au repo core. Doit déclarer son manifest et passer le sandboxing. Cf. APOGEE §7.7.

### **Ruler (Notoria) — ADR-0090**
Évaluateur DÉTERMINISTE attaché à chaque champ ADVE (dérivé de la Variable Bible, ~300 specs). Verdict /100 en 5 dimensions (presence/structure/richesse/specificite/conformite), variance 0, zéro LLM. Alimente le **score pondéré** d'une Recommendation (0.45×ruler + 0.35×impact simulé + 0.20×confidence) et le **gate de remplacement** : une reco ne remplace un contenu existant que si elle le bat (marge d'hystérésis 2 pts). Le chemin manuel OPERATOR_AMEND_PILLAR reste souverain. Source : `src/server/services/notoria/rulers.ts` + [ADR-0090](adr/0090-field-rulers-deterministic-replacement.md).

### **Score composite**
Somme pondérée 0-200 des 8 Pillars. Détermine le palier. Source : `advertis-scorer.semantic.ts`.

### **Sentinel intent**
Intent automatique post-apogée : MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT_SECTOR. Cf. APOGEE §13 (régime apogée).

### **SLO**
Service-Level Objective déclaré par Intent kind (p95 latency, error rate, cost p95). Source : `src/server/governance/slos.ts`.

---

## D — Anti-confusion (les pièges classiques)

| Mot ambigu | Demander quel sens ? | Préfixe canonique |
|---|---|---|
| "phase" | Lifecycle / Oracle / Mission step / Refonte ? | `lifecycle:`, `oracle:`, `mission:`, `refonte:` |
| "stage" | Rocket stage (Booster/Mid/Upper) ou Pillar maturity (N0-N6) ? | `stage:` (rocket) ou `maturity:` (pillar) |
| "tier" | Cultural palier (LATENT→ICONE) ou qualityTier (S/A/B/C) ? | `palier:` ou `qualityTier:` |
| "mission" | Brand transformation (APOGEE) ou Creative delivery (Operations) ? | `brand-mission:` ou `creative-mission:` |
| "tool" | Glory tool ou autre ? | `glory:` pour Glory tools, sinon nom du module |
| "strategy" | Strategy record DB ou stratégie générique ? | `Strategy` (entity) vs "strategy" (concept) |

---

## D-bis — Phase 13 — Oracle 35-section (mai 2026)

### Oracle 35-section framework canonical
Source unique de vérité : `SECTION_REGISTRY` dans `src/server/services/strategy-presentation/types.ts`. 35 sections partitionnées en 3 tiers (`SectionTier`) :
- **CORE** (23) : sections actives historiques Phase 1-3 ADVERTIS + Mesure + Operationnel + Imhotep Crew Program (#34) + Anubis Plan Comms (#35) — promues CORE Phase 17 cleanup ADR-0045 post-Phase 14/15
- **BIG4_BASELINE** (7) : frameworks consulting one-shot McKinsey/BCG/Bain/Deloitte
- **DISTINCTIVE** (5) : valeur ajoutée La Fusée vs Big4 (Cult Index, Manipulation Matrix, Devotion Ladder, Overton Distinctive, Tarsis Weak Signals)

ADR : [ADR-0014](adr/0014-oracle-35-framework-canonical.md).

### BrandAssetKind enum extension Phase 13
Source TS canonique : `src/domain/brand-asset-kinds.ts` avec `BRAND_ASSET_KINDS` const + 10 valeurs Phase 13 ajoutées : `MCK_7S`, `BCG_PORTFOLIO`, `BAIN_NPS`, `MCK_3H`, `BCG_STRATEGY_PALETTE`, `DELOITTE_GREENHOUSE`, `DELOITTE_BUDGET`, `CULT_INDEX`, `MANIPULATION_MATRIX`, `OVERTON_WINDOW`. Extension non-cassante (`BrandAsset.kind` reste `String @default`). ADR : [ADR-0015](adr/0015-brand-asset-kind-extension.md).

### Flag `_oracleEnrichmentMode`
Flag interne du `SequenceContext` (Artemis sequence-executor). Quand `true`, court-circuite `chainGloryToPtah` durant `enrichAllSectionsNeteru()` — les forges Ptah des tools `forgeOutput` ne se déclenchent pas automatiquement. Garantit "Ptah à la demande" — les forges sont déclenchées exclusivement via les boutons "Forge now" (B8) sur les sections Oracle distinctives. Hors enrichissement Oracle, le flag est `false`/absent → cascade Glory→Brief→Forge hash-chain f9cd9de complète préservée.

### Oracle PDF auto-snapshot pre-export
`exportOracleAsPdf` + `exportOracleAsMarkdown` appellent désormais `ensureSnapshotForExport` avant `loadOracle` (B6). `takeOracleSnapshot` calcule SHA256 sur le content live ; si hash identique au dernier snapshot, réutilise son `snapshotId` (idempotence). Plus de PDFs vides en live state. ADR : [ADR-0016](adr/0016-oracle-pdf-auto-snapshot.md).

### Section dormante Oracle (concept retiré Phase 17 — ADR-0045)
**Note historique** : le tier `"DORMANT"` était utilisé Phase 13 (ADRs 0017/0018) pour 2 sections Oracle Imhotep/Anubis pré-réservées avec handler stub `DORMANT_PRE_RESERVED`. ADRs 0017/0018 **superseded par 0019/0020 (Phase 14/15)** — Imhotep + Anubis activés (cap APOGEE 7/7). [ADR-0045](adr/0045-dormant-cleanup-post-phase-14-15.md) (Phase 17 cleanup, shipped 2026-05-04) **a supprimé le tier DORMANT** : `SectionTier = "CORE" | "BIG4_BASELINE" | "DISTINCTIVE"`. Sections renommées : `imhotep-crew-program-dormant` → `imhotep-crew-program` ; `anubis-comms-dormant` → `anubis-plan-comms`. Flag `_isDormant` → `_skipSequenceExecution`. Family `ORACLE_DORMANT` → `ORACLE_NETERU_GROUND`. Toute mention résiduelle `"DORMANT"` / `"-dormant"` / `"pré-réservé"` dans le code applicatif = drift à corriger.

### Ptah forge button (Forge now)
Composant `<PtahForgeButton>` (DS Phase 11 — Button + Dialog confirm + useToast) qui déclenche manuellement `PTAH_MATERIALIZE_BRIEF` pour une section Oracle distinctive forgeable. Cascade hash-chain Glory→Brief→Forge complète (oracleEnrichmentMode=false hors enrichissement). 4 sections câblées : `bcg-portfolio` (design Figma), `mckinsey-3-horizons` (design Figma), `manipulation-matrix` (image Magnific Banana), `imhotep-crew-program-dormant` (icon placeholder).

---

## D-ter — ADR-0023 — OPERATOR_AMEND_PILLAR (mai 2026)

### OPERATOR_AMEND_PILLAR
Intent introduit par [ADR-0023](adr/0023-operator-amend-pillar.md) pour donner à l'opérateur une voie d'édition intentionnelle des piliers ADVE. Trois modes : `PATCH_DIRECT` (scalaire simple), `LLM_REPHRASE` (texte qualitatif avec preview Notoria), `STRATEGIC_REWRITE` (LOCKED ou destructif, double-confirm + override). Type-level constraint `pillarKey: "a" | "d" | "v" | "e"` exclut RTIS.

### variable-bible
Source canonique unique des ~300 variables ADVERTIS, située dans `src/lib/types/variable-bible.ts` (`BIBLE_A`, `BIBLE_D`, `BIBLE_V`, `BIBLE_E`, `BIBLE_R`, `BIBLE_T`, `BIBLE_I`, `BIBLE_S`). Chaque entrée = `{description, format, examples[], minLength, maxLength, rules[], derivedFrom, feedsInto[], editableMode?}`. Exposée en lecture seule via la page Console "Annuaire des Variables ADVERTIS" ([`/console/config/variables`](../../src/app/(console)/console/config/variables/page.tsx)). Source de vérité du dropdown du modal `AmendPillarModal` — **PAS d'introspection Zod**, qui reste le validateur runtime côté gateway.

### Annuaire des Variables Console
Page `/console/config/variables` qui liste les ~300 entrées variable-bible filtrables par pilier/type. Read-only en V1 ; l'action "Amender" lance le modal `AmendPillarModal` (ADR-0023) qui émet `OPERATOR_AMEND_PILLAR`.

### EditableMode
Type discriminant ADR-0023 : `INFERRED_NO_EDIT | PATCH_DIRECT | LLM_REPHRASE | STRATEGIC_REWRITE`. Résolu par `getEditableMode(pillarKey, spec)` heuristique : (1) override explicit dans spec gagne, (2) `derivedFrom != null` ou pilier RTIS → INFERRED_NO_EDIT, (3) minLength≥30 ou maxLength≥200 → LLM_REPHRASE, (4) sinon PATCH_DIRECT. STRATEGIC_REWRITE n'est jamais retourné par l'heuristique seule — décidé runtime par le gate `applyPillarCoherenceGate` selon LOCKED + destructive.

### applyPillarCoherenceGate
Gate Notoria dédié à OPERATOR_AMEND_PILLAR ([gates.ts](../../src/server/services/notoria/gates.ts)). 4 règles ordonnées : LOCKED check (refuse sans override), Destructive amplifier (force STRATEGIC_REWRITE), Cross-ADVE warning (non-bloquant), Financial reuse (delegate validateFinancialReco).

### BrandAsset.staleAt (ADR-0023)
Flag pattern symétrique avec `Pillar.staleAt`. Quand un pilier ADVE est amendé via STRATEGIC_REWRITE, tous les `BrandAsset` ACTIVE liés (`pillarSource = pillarKey`) reçoivent `staleAt = now()` + `staleReason`. **L'asset reste ACTIVE** — sémantique enum `BrandAssetState` préservée. Le pattern s'applique uniformément à tous les kinds (Oracle compilé, briefs Artemis, claims, KV, manifestos…). Pas de hiérarchie.

## D-quater — ADR-0028 — Strategy archive 2-phase (mai 2026)

### Strategy.archivedAt
Soft archive marker (`DateTime?`) ajouté en Phase 16+. `null` = active (default), set = archived (caché des queries default via `WHERE archivedAt IS NULL` filter dans `strategy.list`). Phase 1 du cycle d'archivage 2-temps. Réversible via `OPERATOR_RESTORE_STRATEGY`. Set par `OPERATOR_ARCHIVE_STRATEGY`. Index `@@index([archivedAt])` pour query perf.

### OPERATOR_ARCHIVE_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR (handler: `strategy-archive`). Soft archive d'une marque — `Strategy.archivedAt = now()`. Refuse `isDummy = true` (Wakanda dummies type-protected). Réversible via `OPERATOR_RESTORE_STRATEGY`. Émis par mutation tRPC `strategy.archive` (auditedAdmin + canAccessStrategy gate).

### OPERATOR_RESTORE_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR. Restaure une marque archivée — `Strategy.archivedAt = null`. Réversible (re-archive possible). Émis par mutation tRPC `strategy.restore`.

### OPERATOR_PURGE_ARCHIVED_STRATEGY (ADR-0028)
Intent kind gouverné MESTOR. **Hard delete** d'une marque + cascade BFS sur 30+ tables enfants via `information_schema.table_constraints` discovery dynamique. **Irréversible.** Anti-foot-gun multi-niveau : (a) handler refuse si `archivedAt = null` (purge sans archive interdite), (b) tRPC mutation exige `confirmName == Strategy.name.toUpperCase()` (type-to-confirm), (c) refuse `isDummy = true`. Tout dans une transaction atomique. Émis par mutation tRPC `strategy.purge`.

### strategy-archive (service)
Service `src/server/services/strategy-archive/`. 3 handlers Intent (`archiveStrategyHandler`, `restoreStrategyHandler`, `purgeArchivedStrategyHandler`) + utilitaires plain (`archiveStrategy`, `restoreStrategy`, `purgeStrategy`, `listArchivedStrategies`). Le BFS purge utilise `information_schema` pour découvrir les FK pointing to Strategy + récursif jusqu'aux feuilles, topological sort bottom-up, transaction atomique. Cf. ADR-0028.

### ArchivedStrategiesModal
Composant UI `src/components/strategy/archived-strategies-modal.tsx`. Modal full-screen avec backdrop blur, header (count badge), grid 1/2/3 cols responsive de tuiles. Tuile = avatar lettre initiale, nom, status badge, date relative archive ("il y a N jours"), métriques (piliers/assets/missions/sources), 2 actions Restaurer / Supprimer. Composant interne `<PurgeConfirmDialog />` pour le type-to-confirm en MAJUSCULES sur le purge. Bouton trigger dans `/console/strategy-portfolio/brands` header.

### 4 portails (anti-confusion)
- **Cockpit** : portail des founders/marques (le client final voit ÇA)
- **Console** : portail UPgraders (interne, jamais vendu)
- **Agency** : portail agences partenaires (comm/média/évent/PR)
- **Creator** : portail freelances

**La Fusée** = l'OS sous-jacent invisible. **Oracle** = un livrable BrandAsset parmi N. Trois plans distincts : portail (UI) ≠ livrable (BrandAsset.kind) ≠ OS (La Fusée).

---

## E — Process de mise à jour

Toute proposition de nouveau terme ou de modification d'une définition existante traverse :

1. Open issue avec template `lexicon-change`
2. Discussion en équipe
3. ADR si la modification touche un terme architectural majeur
4. PR de patch sur ce fichier avec label `phase/0` ou phase courante

Pas de modification silencieuse. Le LEXICON est un contrat humain comme APOGEE est un contrat technique.


## D-quinquies — ADR-0037 — Country-Scoped Knowledge Base + MarketStudy ingestion (Phase 17, mai 2026)

### KnowledgeEntry.countryCode (ADR-0037 PR-A)

Champ `String? @db.VarChar(2)` ajouté à `KnowledgeEntry`. **Source de vérité** pays-scopée. Remplace progressivement le legacy `market` (texte libre conservé pour compat). Backfill 'WK' sur les entries Wakanda du seed. Index `countryCode` + composite `(sector, countryCode)`.

### Country-Scoped Knowledge Base (CSKB)

L'architecture qui en découle : Tarsis filtre les `KnowledgeEntry` par `countryCode` strict (via `checkSectorKnowledgeByCountry`), `buildSearchContext` joint `Country` (PPP, marketMeta, primaryLanguage, region) pour injecter un bloc CONTEXTE PAYS dans les LLM prompts. Le pilier T cesse d'être halluciné sur les pays sans seed dédié.

### CONTEXTE PAYS — CONTRAINTE DURE (ADR-0037 PR-D)

Bloc system prompt injecté dans `signal-collector` et `weak-signal-analyzer` quand la stratégie a un `countryCode`. Calqué sur le pattern anti-hallucination Wakanda d'ADR-0030 §PR-Fix-2. Helper exporté `buildCountryContextPrompt(c)` retourne le bloc ou "" si countryCode absent.

### Trend Tracker 49 (ADR-0037 PR-L)

Catalogue canonique des 49 variables macro/micro tendances du Workflow ADVE GEN (12 MACRO_ECO + 8 MACRO_TECH + 10 SOCIO_CULT + 7 REGUL_INST + 12 MICRO_SECTOR). `src/server/services/seshat/knowledge/trend-tracker-49.ts`. Consommé par l'extracteur LLM PR-I et par la page cockpit Track. Versionné `TREND_TRACKER_VERSION`.

### MARKET_STUDY_TAM / MARKET_STUDY_COMPETITOR / MARKET_STUDY_SEGMENT / MARKET_STUDY_RAW

Quatre nouveaux `KnowledgeType` enum values introduits par ADR-0037 PR-L. Décomposent une MarketStudy ingérée (PR-I) en N entries typées indexées par (countryCode, sector, sourceHash). RAW est l'archive brute (audit + re-extraction si schéma évolue).

### EXTERNAL_FEED_DIGEST (ADR-0037 PR-L + PR-G)

Cinquième nouveau `KnowledgeType`. Agrège macroSignals + weakSignals + Trend Tracker pour une (countryCode, sector). Produit soit par `INGEST_MARKET_STUDY` (depuis étude tierce uploadée) soit par `FETCH_EXTERNAL_FEED` (cron LLM-synthesis transitional).

### Variable-bible canonical map (ADR-0037 PR-K)

`src/lib/types/variable-bible-canonical-map.ts`. Mapping bidirectionnel `canonicalCode (A1, D5, E-Clerge…) ↔ (pillarKey, fieldKey)`. Auto-doc régénérée dans [VARIABLE-BIBLE-CANON.md](VARIABLE-BIBLE-CANON.md). Test anti-drift CI 65 tests. UI cockpit field-renderers expose le badge canonical à côté de chaque label.

### 21 nouveaux fields ADVE (ADR-0037 PR-K)

Combler les gaps manuel ADVE :
- **A** : `messieFondateur` (A1bis Le Messie), `competencesDivines` (A6), `preuvesAuthenticite` (A8), `indexReputation` (A10), `eNps` (A11), `turnoverRate` (A11bis), `missionStatement` (A-Mission), `originMyth` (A5myth)
- **D** : `positionnementEmotionnel` (D6), `swotFlash` (D7), `esov` (D10), `barriersImitation` (D11), `storyEvidenceRatio` (D12)
- **V** : `roiProofs` (V7), `experienceMultisensorielle` (V-MultiSens), `sacrificeRequis` (V-Sacrifice), `packagingExperience` (V-Packaging)
- **E** : `clergeStructure` (E-Clerge Le Clergé), `pelerinages` (E-Pelerinages), `programmeEvangelisation` (E-Evangelisation), `communityBuilding` (E-Community)

### `/cockpit/intelligence/market-studies` + `/cockpit/intelligence/track`

Deux nouvelles pages cockpit (ADR-0037 PR-J). La première permet à l'opérateur d'injecter une étude PDF/DOCX/XLSX. La seconde affiche les 49 variables Trend Tracker pour le pays + secteur du brand actif, avec coverage % et synthèse TAM / concurrents / segments.

### `/console/seshat/market-studies`

Vue admin cross-strategies des MarketStudy ingérées. Filtres pays/secteur. Bouton Re-extract.

### Intent kinds Phase 17

- `INGEST_MARKET_STUDY` (governor SESHAT, p95 60s) — opérateur upload → KE.
- `RE_EXTRACT_MARKET_STUDY` (p95 90s) — re-extraction depuis RAW archivé.
- `FETCH_EXTERNAL_FEED` (p95 45s) — cron Tarsis country×sector digest.

---

## Phase 19 — Campaign tracker L2 Instrumental (ADR-0052)

### double-layer canonical

Architecture du module Campaign : **L1 Operational** (CRUD plomberie projet — `Campaign`, `CampaignAction`, `CampaignFieldOp`, etc., shipped) + **L2 Instrumental** (lecture composée orchestrée cross-Neteru — snapshots immutables, drift detection, capitalisation cumulative). L2 strict — n'altère JAMAIS L1. Pattern précédent : `Strategy` (L1) + `strategy-presentation` (L2 lecture composée Oracle).

### Capability flags 4-états (primitive #1 ADR-0052 §2.5)

Chaque sous-cluster L2 expose un état runtime : `READY` (toutes deps disponibles), `PARTIAL` (calculs faits avec ce qu'on a, output flagué `INCOMPLETE_DATA`), `STUB` (deps absentes, retour `DEFERRED_AWAITING_DEPS` — pattern Anubis Credentials Vault ADR-0021), `DISABLED` (décision opérateur). Si un cluster L2 est en STUB/DISABLED → L1 continue identiquement.

### lifecycle STUB → MVP → PRODUCTION (primitive #2 ADR-0052 §2.5)

Cycle de maturité par sous-cluster aligné sur `BrandAsset.state` et `Sequence.lifecycle` (ADR-0042). `STUB` = squelette respectant le contrat I/O mais retours triviaux ; `MVP` = première implémentation utile (heuristic, peut être incorrect sur edge cases) avec quality gate SOFT ; `PRODUCTION` = implémentation complète + tests anti-drift + quality gate HARD + ADR enfant si non-trivial.

### tier delta

Métrique Cluster A — `tierBrandFinal.compositeScore - tierBrandSnapshot.compositeScore`. Mesure le déplacement du `BrandClassification` (LATENT/FRAGILE/ORDINAIRE/FORTE/CULTE/ICONE) provoqué par une campagne. Affiché dans postmortem.

### altitudeRegression

Loi 1 audit Cluster A — `true` si une dimension `byPillar` a régressé silencieusement (ex: gain D, perte V) malgré tier global positif. Code observation `LAW_1_SILENT_REGRESSION`.

### regret-window

Fenêtres temporelles J+3 / J+7 / J+14 post-LIVE où Seshat compare KPIs réalisés vs `aarrTargets`. Émet `EARLY_WARNING_DRIFT` si <30% du target sur 2 fenêtres consécutives.

### myth arc

Cohérence narrative chronologique inter-campagne pour une Strategy. Score similarity entre `bigIdeaSnapshotAssetVersionId` N et N-1. Une marque iconique se construit par arc narratif cumulé (chapitres ↔ campagnes consécutives). MVP heuristic = Jaccard tokens ; PRODUCTION = embeddings.

### cult index delta

Cluster B — `Campaign.cultIndexSnapshotPost.score - cultIndexSnapshotPre.score`. Mesure si une campagne renforce le culte ou le dilue. Snapshots null-honest (ADR-0046) — pas de fallback magic.

### cultural debt

Score 0..1 Cluster B — gap entre `Manifesto.beliefs[]` et `CampaignAction` claims exécutés. 0 = parfait alignement, 1 = totalement détourné. MVP formula = `1 - mean(bigIdeaCoherenceScore non-null)`.

### bigIdeaCoherenceScore

Score 0..1 par `CampaignAction` Cluster B — alignement de l'action vs `bigIdeaSnapshotAssetVersionId` + `manifestoSnapshotAssetVersionId` figés sur la Campaign parente. MVP heuristic = Jaccard tokens (`tokenize` + `jaccardSimilarity` exposés par `campaign-tracker/coherence.ts`). PRODUCTION = LLM eval Glory tool.

### manipulation drift

Cluster B — `true` si `CampaignAction.manipulationModeApplied` n'est pas dans `Campaign.manipulationMixSnapshot.allowed[]`. Strict-mode gate `MANIPULATION_COHERENCE_PER_ACTION` (opt-in via `Strategy.strictModeGates`) refuse l'action si drift détecté.

### Intent kinds Phase 19 (Vague 1 — 6 nouveaux)

- `SNAPSHOT_CAMPAIGN_TRAJECTORY_PRE_LIVE` (sync MESTOR, p95 3s) — fige snapshots immutables au passage `READY_TO_LAUNCH → LIVE`. Idempotent.
- `CHECK_CAMPAIGN_FUEL_BURN_RATE` (sync THOT, p95 1.5s) — gate Loi 3, ALLOWED/WARN/DENIED. Cron 24h pendant LIVE.
- `THOT_PAUSE_CAMPAIGN_FLAME_OUT` (sync THOT, p95 2s) — auto-pause sur flame-out. Hash-chained intent log. Idempotent.
- `CHECK_BIG_IDEA_COHERENCE` (sync ARTEMIS, p95 8s) — score `CampaignAction` vs snapshots Campaign. Persiste `bigIdeaCoherenceScore`.
- `EVALUATE_MYTH_ARC_COHESION` (sync ARTEMIS, p95 12s) — chronologie inter-campagne Strategy. Read-only L1.
- `RECOMPUTE_CULTURAL_DEBT` (async ARTEMIS, p95 30s) — agrège `bigIdeaCoherenceScore` + lexical drift Manifesto.

## Phase 21 — Oracle Generation Robustness (mégasprint NEFER F-A → F-H, mai 2026)

### Section Oracle (entité first-class)

**Définition canonique** : depuis Phase 21 F-B (ADR-0068), une **section Oracle** est une row Prisma `OracleSection` indexée par `(strategyId, sectionId)` avec `sectionId ∈ 1..35` (cf. `SECTION_REGISTRY` dans `src/server/services/strategy-presentation/types.ts`).

**Lifecycle** (state machine) :

```
PENDING ──acquireGenerationLock──▶ GENERATING ──recordGenerationSuccess──▶ COMPLETE
   ▲                                  │
   │                                  └────────recordGenerationFailure────▶ FAILED
   │                                                                          │
   └──forgetGenerationProgress (operator override) ──────────────────────────┤
                                                                              │
COMPLETE ──markSectionsStale (cascade pillar amend) ──▶ STALE                 │
                                                         │                     │
STALE / FAILED ──acquireGenerationLock──▶ GENERATING ────┴─────────────────────┘
```

**Cardinalité** : 35 rows × strategyId, créées via lazy seed transparent (`getSectionsForStrategy`) à la première lecture. Pas de script de backfill nécessaire.

**Synonymes anti-drift** :
- "section Oracle" / "section du livrable" / "fragment Oracle" → `OracleSection`
- "génération de section" / "compilation §07" → Intent `GENERATE_ORACLE_SECTION` (ADR-0070)
- "Assembler" / "lancer Artemis" / "compiler Oracle" → Intent `ASSEMBLE_ORACLE` (ADR-0071, manual-first orchestrator)
- "périmé" / "stale" / "à régénérer" → `OracleSection.staleAt != null` ; UI affiche "PÉRIMÉ" amber (cf. ADR-0069 readiness UI parity)
- "FRESH" / "REGEN" / "RETRY" → 3 modes `GENERATE_ORACLE_SECTION` (FRESH=PENDING→COMPLETE, REGEN=force, RETRY=après FAILED/STALE)

### Runner descriptor

`SectionMeta.runner: { kind: "GLORY_SEQUENCE" | "GLORY_TOOL" | "FRAMEWORK", ref: string, dependsOn?: number[] }` — descripteur de génération. Helper `resolveSectionRunner()` fait le pont avec le legacy `sequenceKey`.

### Manual-first parity (ADR-0060 enforced ADR-0071)

L'**Assembler** (`ASSEMBLE_ORACLE`) émet `GENERATE_ORACLE_SECTION` × N — il n'appelle JAMAIS directement `executeStructuredLLMCall` / `executeSequence` / `executeFramework` / `executeTool` / `callLLM`. Test bloquant `assembler-uses-manual-path.test.ts` mode HARD.

### Stream events NSP (ADR-0072)

6 sub-kinds discriminés dans `NspEvent` :
- `oracle_section_started` / `oracle_section_completed` / `oracle_section_failed`
- `oracle_assembler_started` / `oracle_assembler_progress` / `oracle_assembler_done`

Émis depuis les handlers F-C/F-D via helpers `emitSection*` / `emitAssembler*` (best-effort wrap, jamais throw). Frontend consume via `useOracleStream(strategyId)` qui filtre par `strategyId` côté client.

### Intent kinds Phase 21 (2 nouveaux)

- `GENERATE_ORACLE_SECTION` (async ARTEMIS, p95 25s, cost 0.10$, ADR-0070) — génère 1 section via son runner. Lock optimistic + executeStructuredLLMCall (Zod strict + retry x2) + recordSuccess/Failure. 3 modes FRESH/REGEN/RETRY.
- `ASSEMBLE_ORACLE` (async ARTEMIS, p95 250s scope partiel, cost 1.0$, ADR-0071) — orchestrateur manual-first. Boucle resilient sur `GENERATE_ORACLE_SECTION` × N. Scope `ALL` / `MISSING` / `STALE` / `number[]`.

### Anti-confusion vs `enrichOracle` legacy

`enrichOracle` (~1300 lignes inline dispatch dans `strategy-presentation/`) reste fonctionnel pour cohabitation post-F-F. **Tout nouveau code Oracle DOIT utiliser le path Phase 21** (`oracle.generateSection` / `oracle.assembleOracle` tRPC). Deprecation formelle après audit completion.


---

# ANNEXE CANON P — PANTHÉON NETERU

> Canon absorbé depuis `PANTHEON.md` (consolidation bible 2026-05). Source = stub de redirection.


> *Source unique de vérité narrative sur les Neteru. Toute mention de panthéon réduit (trio, quatuor…) ou de Neter inconnu doit être réconciliée ici.*

Ce document définit le **panthéon Neteru** — les 7 dieux qui gouvernent l'Industry OS. Il complète :
- [LEXICON.md](LEXICON.md) — vocabulaire normatif
- [APOGEE.md](APOGEE.md) — framework de pilotage de trajectoire
- [FRAMEWORK.md](FRAMEWORK.md) — 5 piliers techniques
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement audience

**Plafond canonique : 7 Neteru** ([APOGEE.md §9](APOGEE.md)). **État actuel : 7 actifs (Phase 14/15 — full activation)**. Cap APOGEE atteint — toute fonction nouvelle s'absorbe dans un Neter existant ou exige un ADR de relèvement de plafond.

---

## 1. Les 7 Neteru

| # | Nom | Sous-système APOGEE | Statut | Mythologie |
|---|---|---|---|---|
| 1 | **MESTOR** | Guidance (Mission) | Actif | Conseiller mythologique grec ; figure de la délibération |
| 2 | **ARTEMIS** | Propulsion (Mission) | Actif | Déesse grecque de la chasse — vise et lance |
| 3 | **SESHAT** | Telemetry (Mission) | Actif | Déesse égyptienne de l'écriture, mesure, archives |
| 4 | **THOT** | Sustainment + Operations (Mission + Ground) | Actif | Dieu égyptien de la sagesse, calcul, balance |
| 5 | **PTAH** | Propulsion (Mission, downstream Artemis) | Actif (Phase 9 — ADR-0009) | Démiurge égyptien, créateur du monde par le verbe, patron des artisans |
| 6 | **IMHOTEP** | Crew Programs (Ground) | **Actif** (Phase 14, ADR-0019 supersedes ADR-0017) | Sage humain égyptien déifié, architecte, scribe, médecin |
| 7 | **ANUBIS** | Comms (Ground) | **Actif** (Phase 15, ADR-0020 supersedes ADR-0018) | Psychopompe égyptien, guide entre mondes, gardien des secrets |

**INFRASTRUCTURE** n'est pas un Neter — c'est le placeholder pour le sous-système Console/Admin et tout ce qui est méta-config. Intentionnel.

**NEFER** non plus n'est PAS un Neter (ne figure pas dans `BRAINS` const). C'est l'**opérateur expert** (humain ou agent IA) qui sert les **7 Neteru actifs**, exécute leurs Intents, range le vault, et garantit la cohérence. Activation auto via [CLAUDE.md](../../CLAUDE.md) en tête. Identité complète + protocole 8 phases : [NEFER.md](NEFER.md).

---

## 2. Pour chaque Neter — fonction, contribution mesurable, drift signal

Chaque Neter est documenté ici selon trois axes obligatoires. Test CI `audit-pantheon-completeness.ts` vérifie que les trois sections existent pour les 7.

### 2.1 — MESTOR (Guidance)

**Fonction** : Computer de guidage. Reçoit chaque Intent du système, évalue les pré-conditions ([Pilier 4 FRAMEWORK](FRAMEWORK.md)), délibère sur le plan, dispatche aux services downstream. Seul point d'entrée — `mestor.emitIntent()` est l'API canonique de toute mutation métier.

**Contribution mesurable à la mission** :
- Refus précoce d'Intents qui auraient produit des assets ou décisions stériles (compté en `IntentEmission.status = VETOED`).
- Sélection du chemin Glory→Brief→Forge optimal en fonction du palier brand cible (différentes séquences pour pousser de FRAGILE→ORDINAIRE vs FORTE→CULTE).
- Maintien du principe : zéro mutation hors `emitIntent()`. Mesure : `audit-governance.ts` finding count = 0.

**Drift signal** : si `IntentEmission` croît sans que `Strategy.cultIndex` ou `pillar.completionLevel` ne progresse → Mestor dispatche dans le vide. Cron hebdo `audit-mestor-yield.ts` flagge si ratio `intentions/résultats` < seuil.

**Comportement par manipulation mode** :
- *peddler* — sélectionne séquences courtes, drops, urgence
- *dealer* — séquences récurrentes, hooks compulsifs (drops réguliers)
- *facilitator* — séquences éducatives, démonstration, tutoriels
- *entertainer* — séquences narratives, fiction de marque, world-building

### 2.2 — ARTEMIS (Propulsion — phase brief)

**Fonction** : Thrust controller. Allume les thrusters Glory tools dans le bon ordre, séquence les manœuvres orchestrées (Glory sequences). **Produit les briefs et assets rédactionnels** — output texte structuré (concept, copy, script, brand-bible, naming, kv-prompt). Quand un brief contient un `forgeSpec`, il est handoff à Ptah.

**Contribution mesurable à la mission** :
- Briefs qui débouchent sur des assets matérialisés (`GenerativeTask.sourceIntentId` chaîné à un `INVOKE_GLORY_TOOL`) — taux de matérialisation effectif vs taux de briefs sans aval.
- Score qualité des briefs (mesuré par Seshat post-déploiement : engagement de l'asset matérialisé issu du brief).

**Drift signal** : briefs qui n'aboutissent jamais à un asset (orphelins) — gaspillage LLM. Cron `audit-orphan-briefs.ts` flagge si > 15% briefs sans matérialisation downstream.

**Comportement par manipulation mode** :
- *peddler* — prompts brefs, CTA explicites, urgence textuelle ("act now", "limited")
- *dealer* — prompts à hooks récurrents, structure répétitive addictive
- *facilitator* — prompts informatifs, structurés, valeur d'usage
- *entertainer* — prompts narratifs, esthétiques, worldbuilding

### 2.3 — SESHAT (Telemetry)

**Fonction** : Processeur de télémétrie central. Indexe (BrandContextNode), répond aux requêtes (ranker), capte les signaux faibles via ses **deux sous-domaines** : **Tarsis** (`seshat/tarsis/` — signaux temps-réel : presse, conversations, drift sectoriel, embedding deltas) et **Argos** (`seshat/argos/` au port Phase 22 — références culturelles historiques curées, dossiers signés `CampaignReferenceDossier` produits par le sub-agent Hunter ; pattern Stripe Press / Red Bull Media House appliqué à La Fusée). Mesure l'impact réel des actions sur l'audience. Cf. [ADR-0083](adr/0083-argos-placement-seshat-yggdrasil-seam.md) pour la frontière formelle Tarsis ↔ Argos ↔ market-study-ingestion ↔ external-feeds.

**Contribution mesurable à la mission** :
- `cultIndexDelta` mesuré par asset déployé — signal direct de superfan accumulation.
- `overtonDeflection` calculé via `sector-intelligence.computeBrandDeflection` — signal direct de déplacement Overton.
- Détection des concurrents qui imitent le narratif (alimente Sentinel `DEFEND_OVERTON`).

**Drift signal** : si Seshat n'observe rien (pas d'intégration `ASSET_FORGED` → cron tracking), le système est aveugle. Cron `audit-seshat-coverage.ts` vérifie que chaque AssetVersion déployée a un `cultIndexDeltaObserved` calculé sous 30 jours.

**Comportement par manipulation mode** :
- Tarsis classifie les signaux entrants par mode (engagement court vs long terme).
- Pour *peddler* / *dealer* : track conversion rapide (heures/jours), churn ; for *facilitator* / *entertainer* : track engagement durable (semaines/mois), partage organique, citation.

### 2.4 — THOT (Sustainment + Operations)

**Fonction** : Fuel manager. Connaît le propellant restant par operator/brand, alerte avant flame-out. `CHECK_CAPACITY` pre-flight de chaque Intent coûteux. Veto/downgrade des Intents qui mettraient la mission en faillite. Étend naturellement vers Operations Ground Tier (commission-engine, contracts, escrow, mobile-money) — finances Mission et Operations sont la même mécanique.

**Contribution mesurable à la mission** :
- `cost_per_superfan_recruited` agrégé par Strategy — KPI primaire d'efficacité.
- Tables ROI par manipulation mode dans `financial-brain/manipulation-roi-tables.ts` — calibre le seuil de veto par mode.
- Cash positive UPgraders — sans Operations, l'OS s'arrête en 2 mois indépendamment de la qualité des missions ([APOGEE.md §4 Pourquoi ce découpage](APOGEE.md)).

**Drift signal** : si `cost_per_superfan_recruited` croît sans que `cultIndex` ne suive → Thot vetoe trop tard. Cron `audit-thot-roi.ts` flagge.

**Comportement par manipulation mode** :
- *peddler* / *dealer* : seuil ROI agressif (court terme), veto rapide si pas de conversion observée sous J+7.
- *facilitator* / *entertainer* : seuil ROI patient (long terme), tolère J+30 voire J+60 sans veto.

### 2.5 — PTAH (Propulsion — phase forge)

**Fonction** : Forge master. Matérialise les briefs Artemis en assets concrets (image, vidéo, audio, icône, design layered, asset stock ingéré, asset refiné/transformé/classifié) via providers externes (Magnific, Adobe Firefly, Figma, Canva). **Tous les assets matériels** de l'OS passent par Ptah — point unique de matérialisation.

**Contribution mesurable à la mission** :
- `expectedSuperfans` (bayesien pre-flight) vs `realisedSuperfans` (post-déploiement Seshat) — précision de la prédiction.
- `pillarSource` obligatoire sur chaque `GenerativeTask` — chaque asset traçable à un pillar A/D/V/E/R/T/I/S qui le justifie. Mesure : 100% des tasks ont un pillarSource (sinon refus à création).
- Sentinel `PTAH_REGENERATE_FADING_ASSET` (Phase H) — maintient la masse en orbite ([APOGEE.md §13 Loi 4](APOGEE.md)).

**Drift signal** : assets sans pillarSource (refus à création par la précondition) — drift = 0 cas par construction. Mais drift secondaire : assets dont `realisedSuperfans` < 10% de `expectedSuperfans` — Ptah hallucine son potentiel. Cron `audit-ptah-precision.ts`.

**Comportement par manipulation mode** :
- *peddler* — visuels CTA-first, scarcity cues, prix proéminent
- *dealer* — visuels addictifs, micro-narratives répétables (drops series), patterns de retour
- *facilitator* — visuels démonstratifs, tutoriels, infographies
- *entertainer* — visuels esthétiques, story-rich, world-building, characters

### 2.6 — IMHOTEP (Crew Programs) — **actif Phase 14**

**Fonction** : Master of Crew. Décide qui peut embarquer sur quelle mission (matching), quel niveau de talent est suffisant (tier-evaluator), quelle formation manque (académie). Le seul Neter humain divinisé — pertinent pour le sous-système qui gère des humains.

**Architecture** : Imhotep est un **orchestrateur** qui wrappe les services satellites existants (matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router) sous gouvernance unifiée Mestor → Imhotep → satellite. **0 nouveau model Prisma** (anti-doublon NEFER §3) — réutilise TalentProfile, Course, TalentCertification, TalentReview, Mission existants.

**Capabilities Phase 14** : `draftCrewProgram`, `matchTalentToMission`, `assembleCrew`, `evaluateTier`, `enrollFormation`, `certifyTalent`, `qcDeliverable`, `recommendFormation`. Service : `src/server/services/imhotep/`. Page hub : `/console/imhotep/page.tsx`.

**Contribution mesurable à la mission** :
- `Creator.devotionFootprint` — historique de superfans recrutés par creator dans chaque secteur. Le matching prioritise le devotion footprint, pas seulement la compétence brute.
- Taux de complétion mission par équipe assemblée — un mauvais matching tue la mission même si chaque humain est compétent individuellement.

**Drift signal** : si les missions échouent (`status = FAILED` mais sans veto Thot), souvent c'est un matching humain défaillant. Cron `audit-crew-fit.ts` corrèle `mission.outcome` avec `team.composition`.

**Comportement par manipulation mode** :
- *peddler* — prioritise creators à conversion rapide (sales-DNA)
- *dealer* — prioritise creators avec récurrence (drops-DNA)
- *facilitator* — prioritise creators éducateurs / formateurs
- *entertainer* — prioritise creators narratifs / artistes

### 2.7 — ANUBIS (Comms) — **actif Phase 15, étendu Phase 16**

**Fonction** : Psychopompe — guide les messages entre les ponts (Console/Cockpit/Agency/Creator/Launchpad) et vers le monde extérieur (ad networks, social, email/SMS, MCP servers tiers). Préside à l'embaumement → préservation/transmission de l'historique de communication. Phase 16 ajoute la couche temps-réel (notifications live SSE + Web Push) et la couche MCP bidirectionnelle (sortant pour clients externes type Claude Desktop, entrant pour consommer Slack/Notion/Drive/Calendar/Figma/GitHub).

**Architecture** : Anubis est un **orchestrateur** qui wrappe les services satellites comms existants (email, advertis-connectors, oauth-integrations) + introduit le **Credentials Vault** (ADR-0021) pour gérer les API keys externes via UI back-office au lieu de variables d'env. Provider façades feature-flagged retournent `DEFERRED_AWAITING_CREDENTIALS` si pas de creds — code ship-able sans clés. Phase 16 (ADR-0025 + ADR-0026) ajoute deux couches transverses : MCP bidirectionnel et notification real-time.

**Capabilities Phase 15** (11) : `draftCommsPlan`, `broadcastMessage`, `buyAdInventory`, `segmentAudience`, `trackDelivery`, `registerCredential`, `revokeCredential`, `testChannel`, `scheduleBroadcast`, `cancelBroadcast`, `fetchDeliveryReport`.

**Capabilities Phase 16** (7 nouvelles, ADR-0025 + ADR-0026) : `pushNotification`, `registerPushSubscription`, `renderTemplate`, `runDigest`, `mcpInvokeTool`, `mcpSyncRegistry`, `mcpRegisterServer`.

Service : `src/server/services/anubis/`. Pages : `/console/anubis/` + `/console/anubis/credentials/` + `/console/anubis/notifications/` + `/console/anubis/mcp/`.

**4 models Prisma Phase 15** : `CommsPlan`, `BroadcastJob`, `EmailTemplate`, `SmsTemplate`.
**4 models Prisma Phase 16** : `PushSubscription`, `NotificationTemplate`, `McpRegistry`, `McpToolInvocation`. `Notification` étendu (`type`, `priority`, `metadata`, `entityType`, `entityId`, `operatorId`).
Réutilise `NotificationPreference`, `WebhookConfig`, `ExternalConnector` existants (anti-doublon NEFER §3).

**Contribution mesurable à la mission** :
- `cost_per_superfan_recruited` par campagne (ad networks) — KPI primaire, pas reach/CTR.
- Taux de propagation organique (forwards, partages, citations) post-broadcast.
- Détection de fuites Overton (diffusion non alignée au mode stratégique → Mestor reçoit signal de drift).

**Drift signal** : campagnes Anubis qui consomment du budget Thot mais ne convertissent pas en devotion ladder up-step. Cron `audit-anubis-conversion.ts`.

**Comportement par manipulation mode** :
- *peddler* — paid search, retargeting, urgence
- *dealer* — push notifs récurrentes, séries d'emails, drops timing
- *facilitator* — newsletters utiles, content syndication, guides
- *entertainer* — earned media, viral plays, brand storytelling

---

## 3. Frontières (qui fait quoi vs qui ne fait pas)

| Action | Neter responsable | Neter qui ne le fait PAS |
|---|---|---|
| Décider quel Intent émettre | Mestor | (tous les autres délèguent à Mestor) |
| Produire un brief texte | Artemis (via Glory tools) | Ptah, Mestor, Seshat |
| Matérialiser un asset visuel/audio/vidéo | Ptah | Artemis (qui produit le brief, pas l'asset) |
| Observer l'engagement de l'asset post-déploiement | Seshat | Ptah ne mesure pas son propre output |
| Veto budget | Thot | Mestor ne décide pas du budget |
| Apparier humain à mission | Imhotep | Mestor décide *quelle* mission, pas *qui* |
| Diffuser un message vers l'audience | Anubis | Ptah forge l'asset, Anubis le diffuse |
| Créer un compte / config méta | INFRASTRUCTURE | (intentionnellement pas un Neter) |

---

## 4. Dépendances mutuelles

```
Mestor ──┬─► Artemis ──► Ptah ──► (asset URL)
         │                          │
         │                          ▼
         │                    Anubis ──► (audience reached)
         │                          │
         │                          ▼
         │                    Seshat ◄─── observation flux
         │                          │
         ▼                          ▼
       Thot ◄──── tous les Neter notifient leurs coûts
         │
         ▼
       Imhotep ──── matching humain pour exécution mission
```

- **Mestor** dépend de tous (dispatcher) et est dépendance de tous (point d'entrée).
- **Artemis** dépend de Mestor (input) ; Ptah / Anubis sont ses downstream.
- **Ptah** dépend d'Artemis (brief input) et de Thot (budget pre-flight).
- **Seshat** est dépendance asynchrone de tous (capte les events emis).
- **Thot** veto sur tous.
- **Imhotep** dépend de Seshat (signal sur creators) et alimente Mestor (matching propose composition).
- **Anubis** dépend de Ptah (asset), Thot (budget ad), Mestor (autorisation broadcast).

---

## 4-bis. ⚠️ Phase 13 sortie partielle — **Superseded par Phase 14 + 15** (mai 2026)

> **Note historique conservée pour traçabilité.** Le scope partial Oracle-only de Phase 13 (ADRs 0017/0018) n'avait pas été demandé par l'opérateur (drift Phase 8 NEFER détecté). Phase 14 (Imhotep) + Phase 15 (Anubis) supersèdent cette sortie partielle par une activation full des deux Neteru, comme initialement prévu par ADR-0010 + ADR-0011.

**Cap 7 atteint** : 7/7 Neteru actifs. Imhotep + Anubis désormais inscrits dans le registry (Capability declared via manifest), avec services orchestrateurs complets, Glory tools, Intent kinds, pages UI, et — pour Anubis — pattern Credentials Vault (ADR-0021) qui résout le blocage credentials externes via UI back-office.

ADRs Phase 14/15 :
- [ADR-0019](adr/0019-imhotep-full-activation.md) — Imhotep full activation (supersedes ADR-0017)
- [ADR-0020](adr/0020-anubis-full-activation.md) — Anubis full activation (supersedes ADR-0018)
- [ADR-0021](adr/0021-external-credentials-vault.md) — External Credentials Vault pattern

ADRs Phase 13 historiques (Superseded) :
- [ADR-0017](adr/0017-imhotep-partial-pre-reserve-oracle-only.md) — Superseded by ADR-0019
- [ADR-0018](adr/0018-anubis-partial-pre-reserve-oracle-only.md) — Superseded by ADR-0020

---

## 5. Évolution du panthéon

Ajouter un 8ème Neter exige un **ADR de relèvement de plafond** ([APOGEE.md §9](APOGEE.md)) et un argument que :
- Les 7 existants ne couvrent pas la fonction
- La fonction nouvelle est de gouvernance, pas opérationnelle
- La mythologie est cohérente
- Le naming ne crée pas de confusion

Sinon, la fonction nouvelle doit s'absorber dans un Neter existant via extension de capabilities.

Retirer un Neter exige aussi un ADR + dépréciation cycle (voir [REFACTOR-CODE-OF-CONDUCT.md](REFACTOR-CODE-OF-CONDUCT.md)).

---

## 6. Anti-drift

Sources de vérité synchronisées :
- `BRAINS` const ([src/server/governance/manifest.ts:23-29](../../src/server/governance/manifest.ts)) — liste runtime
- `Governor` type (src/domain/index.ts) — liste compile-time
- `LEXICON.md` entrée NETERU — liste narrative
- `APOGEE.md` §4 — mapping sous-systèmes
- Ce document `PANTHEON.md` — récit complet
- `CLAUDE.md` §Governance — résumé project memory
- `MEMORY.md` user — résumé personal memory

Test CI `tests/governance/neteru-coherence.test.ts` vérifie que les 7 noms apparaissent dans les 7 sources, exactement une fois (hors ADRs historiques). Échec = CI red, merge bloqué.

---

## 7. Substrats (ce qui n'est PAS un Neter mais structure l'OS)

Trois entités structurent La Fusée OS sans être Neteru. Elles **ne comptent pas vers le cap APOGEE 7/7** mais portent des invariants que tout Neter doit respecter. Documentées ici pour éviter qu'une future session les confonde avec un 8ème gouverneur.

| Substrat | ADR | Rôle | Gouverneur de référence |
|---|---|---|---|
| **Yggdrasil** | [ADR-0082](adr/0082-yggdrasil-value-circulation-substrate.md) (amended 2026-05-16) | Topologie de circulation de la valeur. 3 invariants (Q1 traçabilité / Q2 observabilité / Q3 gates d'entrée). | **Substrat ungouverné** — Mestor possède les gates Yggdrasil (`services/mestor/gates/*`) + le journal hash-chainé, pas le substrat lui-même (per [STATE_FINAL_BLUEPRINT §5.2](STATE_FINAL_BLUEPRINT.md)) |
| **NSP — Neteru Streaming Protocol** | [ADR-0025](adr/0025-notification-real-time-stack.md) | Canal SSE / Web Push runtime — sous-protocole de Yggdrasil pour temps-réel. | **Anubis** (Comms) — porte le pubsub + templates + digest |
| **Layering cascade** | [ADR-0002](adr/0002-layering-cascade.md) | Direction d'import au compile-time : `domain → lib → governance → services → trpc → components → app`. | Pas de Neter dédié — enforcé par `eslint-plugin-boundaries` + `madge --circular` |

Et trois **non-Neteru** complémentaires :

| Catégorie | Définition | Exemples |
|---|---|---|
| **Sub-agent** | Programme exécuteur d'Intents sous un Neter | `Hunter` (sous Argos/Seshat), Tarsis weak-signal-analyzer, Notoria cockpit reco |
| **Opérateur** | Exécutant humain ou agent IA des Intents | `NEFER` (CLAUDE.md activation header) |
| **Connector** | Façade externe via Credentials Vault (ADR-0021) | Tarsis-monitoring API, CRM provider, ad networks Meta/Google/X/TikTok, Higgsfield |

**Règle d'évaluation pour une nouvelle entité** :
1. Si elle *gouverne* un sous-système APOGEE → Neter (mais cap 7/7 fermé — ADR de relèvement requis).
2. Si elle *exécute* sous gouvernance → sub-agent.
3. Si elle *structure* sans gouverner → substrat (ADR canonization).
4. Si elle *transporte* depuis l'extérieur → connector (ADR-0021 pattern).

Cf. [ADR-0083 §2](adr/0083-argos-placement-seshat-yggdrasil-seam.md) — table de discrimination Neter / sub-agent / opérateur / substrat / connector.

## Lectures associées

- [APOGEE.md](APOGEE.md) — framework de pilotage
- [LEXICON.md](LEXICON.md) — glossaire
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — bascule MAAT → APOGEE
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction Ptah
- [adr/0010-neter-imhotep-crew.md](adr/0010-neter-imhotep-crew.md) — pré-réservation Imhotep
- [adr/0011-neter-anubis-comms.md](adr/0011-neter-anubis-comms.md) — pré-réservation Anubis


---

# ANNEXE CANON A — APOGEE — FRAMEWORK DÉTAILLÉ

> Canon absorbé depuis `APOGEE.md` (consolidation bible 2026-05). Source = stub de redirection.


> *Une marque n'est pas une chose. C'est une trajectoire.*
> *L'OS ne gère pas des marques. Il les pilote.*
> *L'apogée n'est pas un but. C'est la gravité.*

Ce document définit **APOGEE**, le framework de pilotage de trajectoire qui régit La Fusée. Il remplace MAAT (déprécié, voir [ADR-0001](adr/0001-framework-name-apogee.md) ; document historique : [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md)). Lecture associée : [PANTHEON.md](PANTHEON.md), [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md), [FRAMEWORK.md](FRAMEWORK.md), [REFONTE-PLAN.md](REFONTE-PLAN.md).

---

## 1. Le nom — APOGEE

**Apogée** : le point culminant d'une trajectoire orbitale.

Une marque entre dans le système au sol (état **LATENT** — barely existing, pas de devotion, pas de levier Overton). La mission de l'OS : la propulser jusqu'à son apogée — état **ICONE**, référence sectorielle, patrimoine, transmission, position défendable, fenêtre d'Overton déplacée, superfans accumulés en orbite stable.

La métaphore n'est pas décorative : elle est **déjà inscrite dans le produit**. Le produit s'appelle La Fusée. Le portail founder s'appelle Cockpit. Les opérateurs *upgrade* (UPgraders) les marques en altitude. La cascade ADVERTIS est multi-étages par construction. APOGEE ne fait que **nommer** ce que le produit dit déjà silencieusement.

Toutes les autres pièces — Oracle, GLORY tools, Neteru, score, devotion ladder, Tarsis signals, fenêtre d'Overton, superfans — trouvent leur fonction *exacte* dans la mécanique d'une mission spatiale. C'est le test de qualité d'un framework : si tous les outils s'y goupillent sans contorsion, le framework est juste.

---

## 2. La mission — atteindre l'apogée

**État sol (LATENT)** : la brand existe nominalement mais n'a aucune masse culturelle. Pas de fans, pas d'engagement, juste des transactions résiduelles. L'Overton ne bouge pas.

**État apogée (ICONE)** : la brand est en orbite stable et est devenue *référence sectorielle*. Elle dépasse le simple culte (palier précédent) pour acquérir patrimoine, transmissibilité, position défendable. Le secteur est obligé de se positionner par rapport à elle. La fenêtre d'Overton dans son territoire culturel a bougé. Les superfans portent la propagation organiquement ; la brand ne dépend plus du push budgétaire.

Entre les deux, **3 stages — 8 pillars** (ADVERTIS). Une vraie fusée a peu de stages mais beaucoup d'engines par stage ; ADVERTIS suit la même physique :

- **Stage 1 — Booster** : pillars **A + D + V + E** s'allument ensemble (identité totale au décollage).
- **Stage 2 — Mid** : pillars **R + T** prennent le relais après largage du booster (diagnostic et résilience).
- **Stage 3 — Upper** : pillars **I + S** insèrent en orbite finale (innovation et stratégie d'insertion).

Quand on dit "stage" on parle de l'étage rocket. Quand on dit "pillar" on parle d'un des 8 axes. Quand on dit "palier" on parle du niveau orbital culturel (LATENT → ICONE). Cf. [LEXICON.md](LEXICON.md).

La trajectoire passe par 6 paliers de classification (score composite /200, cf. `src/server/services/quick-intake/brand-level-evaluator.ts` et `src/lib/types/advertis-vector.ts`) :

| Palier | Score /200 | Réalité |
|---|---|---|
| **LATENT** | ≤ 40 | Sol — barely existing, indistinct (ex-« ZOMBIE », terme déprécié — cf. `src/domain/brand-tier.ts`) |
| **FRAGILE** | 41-80 | Décollage instable — existe mais précaire |
| **ORDINAIRE** | 81-120 | Propulsion basique — fonctionnel, générique |
| **FORTE** | 121-160 | Montée en orbite basse — distincte, leveraged |
| **CULTE** | 161-180 | Orbite consolidée — fans identifiables, culture interne (ennemi nommé, rituels, vocabulaire) |
| **ICONE** | > 180 | **Apogée** — référence sectorielle, patrimoine, transmission, position défendable |

> **Source de vérité unique** : `src/domain/brand-tier.ts` (`classifyTier`). Tous les call-sites (scorer, intake, exports, UI) délèguent à cette fonction — fini les ~15 échelles inline dupliquées.
>
> **Plafond d'évidence (CULTE / ICONE)** : ces deux paliers sont *définis* par une masse culturelle prouvée. Le composite structurel d'une marque (stratégie complète) la porte jusqu'à **FORTE** sur son seul mérite ; franchir vers CULTE/ICONE exige des preuves observées (superfans, cult-index, ancienneté, signaux Tarsis). C'est un **plafond**, jamais un plancher — une stratégie excellente n'est jamais rétrogradée sous FORTE faute de preuves (corrige les absurdités « Apple noté bas » / « nouvelles marques bloquées »).

Chaque palier est une stabilisation. Une brand peut redescendre (drift, scandale, dilution opérationnelle). APOGEE rend cette descente détectable (Loi 1) et corrigeable (Tarsis + Mestor course-correct).

**Note sur CULTE vs ICONE** : la formation du culte (palier 5) n'est pas l'apogée — c'est le palier *qui rend l'apogée possible*. ICONE = quand le culte se cristallise en référence patrimoniale. Les superfans accumulés en CULTE génèrent l'inertie qui propulse vers ICONE.

---

## 3. Les Trois Lois de la Trajectoire

Inspirées des lois de la mécanique. Tout Intent du système les respecte. Toute capability qui les viole est rejetée.

### Loi 1 — Conservation de l'altitude

Aucun Intent ne réduit silencieusement l'altitude accumulée. Tous les efforts passés (Pillars maturés, sections d'Oracle écrites, scores gagnés, superfans recrutés) sont préservés ou explicitement détrônés via un Intent compensateur. Pas de régression invisible.

**Mécanismes** :
- Hash-chain `IntentEmission` (`prevHash` / `selfHash`)
- `OracleSnapshot` time travel
- `Pillar.completionLevel` cache réconcilié
- Lineage par `spawnedFrom`
- **Compensating Intents** déclarés dans `intent-kinds.ts:95-105` — `ROLLBACK_PILLAR`, `ROLLBACK_ADVE`, `ROLLBACK_RTIS_CASCADE`, `DISCARD_RECOMMENDATIONS`, `REVERT_RECOMMENDATIONS`, `DEMOTE_FRAGILE_TO_LATENT` à `DEMOTE_ICONE_TO_CULTE` (5 démotions tier-by-tier). Le pattern « COMPENSATING_INTENT » nominal n'existe pas — c'est ces 10 kinds nommés explicitement (un par mutation réversible) qui matérialisent la Loi 1. Cf. ADR-0038 pour le wiring découpé.
- **Post-conditions** (ADR-0038, after-burn checks) : `governedProcedure` invoque `assertPostConditions` après le handler ; un `PostconditionFailedError` flippe `status=FAILED` et empêche que la combustion soit comptée comme succès. Sans ça, un handler peut « réussir » techniquement mais avoir produit un état corrompu.
- **`observationStatus`** (ADR-0038) — colonne séparée du `status` exécutif. La boucle Seshat (asset-impact, knowledge graph, weak signals Tarsis) flippe `OBSERVED` ou `STALE_OBSERVATION`. Permet de distinguer « le handler a renvoyé OK » de « l'effet a été mesuré dans la télémétrie ».

### Loi 2 — Séquencement des étages

Un étage supérieur ne peut s'allumer tant que l'étage en cours n'est pas verrouillé. RTIS attend ADVE complète. Glory sequences de phase 3 attendent les fondations posées en phase 2. La cascade est *physiquement* unidirectionnelle ; revenir en arrière exige un Intent de re-entry explicite (`UNLOCK_PILLAR`, `RESET_STAGE`).

**Mécanismes** : Pillar 4 du FRAMEWORK (pre-conditions), `pillar-readiness` 5 gates, `governedProcedure` qui veto avant exécution.

### Loi 3 — Conservation du carburant

Toute combustion (Intent → LLM call, write DB, dispatch mission, render Oracle) consomme du propellant (USD, tokens, dev hours, attention operator). Le système connaît la jauge en temps réel (Thot). Une combustion qui mettrait la mission en flame-out est refusée (`VETOED`) ou réduite (`DOWNGRADED`). Pas de crédit au-delà de la jauge.

**Mécanismes** : `cost-gate` (Pillar 6 à venir), `LLM Gateway` quality/cost tier, `Thot.financial-brain`, `SLOs`.

---

## 4. Les Sous-systèmes — deux Tiers (Mission + Ground)

L'architecture de l'OS. Toute page, service, router, capability appartient à **un seul** sous-système et **un seul** tier. Le mapping exhaustif est dans [PAGE-MAP.md](PAGE-MAP.md), [SERVICE-MAP.md](SERVICE-MAP.md), [ROUTER-MAP.md](ROUTER-MAP.md).

### MISSION TIER — ce qui pilote une mission active

Sous-systèmes qui propulsent une brand vers son apogée pendant une "mission" (brand transformation cycle).

| # | Sous-système | Question | Composants exemples |
|---|---|---|---|
| 1 | **Propulsion** | Quoi pousse ? | Cascade ADVERTIS, Glory tools, sequences, Notoria pipeline, superfans, devotion ladder |
| 2 | **Guidance** | Quoi dirige ? | Mestor, manifests, pre-conditions (Pillar 4), pillar-gateway, strategy-presentation |
| 3 | **Telemetry** | Quoi observe ? | Seshat, Tarsis, Jehuty, NSP, score, IntentEmission, OracleSnapshot, ranker |
| 4 | **Sustainment** | Quoi maintient en vol ? | Thot, cost gate, LLM Gateway, SLOs, post-conditions, hash-chain, plugin sandboxing |

### GROUND TIER — ce qui tient l'écosystème autour des missions

Sous-systèmes qui ne pilotent pas une mission spécifique mais rendent les missions *possibles* en continu : finances, équipages, communications, administration. Sans Ground Tier, le Mission Tier ne pourrait pas tourner — pas d'argent, pas de crew, pas de comms, pas de config.

| # | Sous-système | Question | Composants exemples |
|---|---|---|---|
| 5 | **Operations** | Quoi alimente l'écosystème en argent et contrats ? | Socle (commissions, contracts, escrow, invoices, value-reports), commission-engine, crm-engine, mobile-money, financial-engine, financial-reconciliation |
| 6 | **Crew Programs** | Quoi prépare et apparie les équipages ? | Arene (matching, guild, club, events, orgs), Academie/Learn (training, certifications, courses), talent-engine, matching-engine, team-allocator, qc-router |
| 7 | **Comms** | Quoi connecte les ponts entre eux ? | Messages cross-portail (Console/Cockpit/Agency/Creator), notifications, messaging service. Layer transverse. |
| 8 | **Console (Admin)** | Quoi configure et administre le système ? | `/console/config/*`, `/console/ecosystem/*`, system-config, boot-sequence, process-scheduler, demo-data, country-registry, translation, neteru-shared registry |

### Pourquoi ce découpage en deux Tiers

Sans Ground Tier, La Fusée serait un OS de mission isolée — capable de propulser une marque, incapable de soutenir un écosystème de centaines. Le Ground Tier est ce qui transforme l'OS d'**outil de transformation individuelle** en **infrastructure d'industrie**.

Le test : enlever Operations → UPgraders ne peut plus facturer ses clients ni payer ses creators → l'OS s'arrête en 2 mois, indépendamment de la qualité des missions. Enlever Crew Programs → pas de talent dispo → les missions n'ont personne à embarquer. Enlever Comms → les decks sont silos étanches → impossible de coordonner Mission Control ↔ Cockpit ↔ Crew Quarters. Enlever Console (Admin) → impossible d'onboarder un nouvel operator, configurer un seuil, ajouter un connecteur.

Les 4 sous-systèmes Ground sont aussi essentiels que les 4 Mission. Le Ground Tier n'est pas un "détail opérationnel" sous-Mission — il est co-équivalent.



### 4.1 — PROPULSION (ce qui génère la poussée)

Tout ce qui ajoute de l'altitude à la brand. Layer 3 du layering technique. **Deux Neter co-occupent ce sous-système** dans une séquence stricte (pas co-gouvernance) : Artemis produit les briefs (phase rédactionnelle) ; Ptah matérialise les briefs en assets concrets (phase forge). Cf. [PANTHEON.md](PANTHEON.md).

| Composant | Rôle propulsion |
|---|---|
| **ADVERTIS cascade** | La trajectoire à 8 étages — booster (ADVE) → intermédiaire (RT) → supérieur (IS) |
| **GLORY tools (56 CORE / 149 registre)** (Artemis) | Thrusters spécialisés rédactionnels. Chaque tool est un moteur orienté (concept-generator pousse sur D+I, kv-prompt sur V+I, etc.). Output = brief texte structuré. Tools `brief-to-forge` produisent un `ForgeBrief` avec `forgeSpec` qui handoff downstream à Ptah. |
| **GLORY sequences (94)** (Artemis) | Manœuvres orchestrées — combinaisons de thrusters dans un ordre topologique (skill tree) |
| **Forge Ptah** (NOUVEAU, ADR-0009) | **Phase de matérialisation downstream Artemis**. Consomme les `ForgeBrief` Artemis et produit les assets concrets (image/vidéo/audio/icône/design layered/stock ingéré/asset refiné/asset classifié) via providers externes (Magnific, Adobe Firefly, Figma, Canva). Cf. `src/server/services/ptah/`. |
| **Notoria pipeline** | Chaîne de production des livrables — assemble les outputs avant insertion en mission |
| **Superfans** | **Le propellant cumulatif**. Pas un KPI, une masse réactive. Plus la brand en accumule, plus elle peut atteindre des orbites hautes (effet Overton). Le seul propellant qui s'auto-régénère organiquement. |
| **Devotion Ladder** | Classification de la masse propellant en 6 paliers canon (Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste ; les 2 derniers = superfans). PAS un KPI (cf. §2.1 annexe MI + `src/domain/devotion-ladder.ts`). |
| **Brand actions** | Touchpoints qui transforment l'audience en propellant (campagnes, contenu, expériences). Chaque BrandAction porte un `expectedManipulationMode` ([MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md)). |

### 4.2 — GUIDANCE (ce qui dirige)

Tout ce qui décide *où* la brand doit aller et *comment*. Layer 2.

| Composant | Rôle guidance |
|---|---|
| **Mestor** | Computer de guidage. Reçoit l'Intent, délibère sur le plan, dispatche à Artemis. |
| **Artemis** | Contrôleur de poussée. Allume les thrusters dans le bon ordre, gère les séquences GLORY. |
| **Manifests** (NeteruManifest, GloryToolManifest) | Type certificates — déclarent les capacités, limites, dépendances de chaque module. |
| **Pillar-readiness gates** | Pre-flight checklists — refusent d'allumer un étage tant que l'étage précédent n'est pas verrouillé. |
| **ADVERTIS rules** | Lois de la cascade encodées dans `domain/pillars.ts` — ordre, dépendances, transitions valides. |
| **Pillar maturity N0-N6** | Granularité de readiness — pour chaque Pillar, 7 niveaux de maturation avant lockdown. |
| **Strategy** | Mission profile — la trajectoire prévue pour cette brand particulière. |
| **Oracle** | Plan de vol détaillé — 35 sections (3 tiers post ADR-0045 : 23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE) décrivant la stratégie pour atteindre l'apogée. Document que cockpit consulte. Phase 13 ADR-0014. |
| **Mestor.intent dispatcher** | Le seul point d'entrée. Toute combustion traverse Mestor. |
| **Yggdrasil** *(substrat)* | Topologie de circulation de la valeur — 3 invariants (Q1 traçabilité / Q2 observabilité / Q3 gates d'entrée gouvernées par Mestor) appliqués à tout flux entre Neteru. **Substrat ungouverné** (organique) ; Mestor possède les **gates** qui filtrent l'entrée dans Yggdrasil, mais le substrat lui-même n'a pas de gouverneur Neter (amendé 2026-05-16 per [STATE_FINAL_BLUEPRINT §5.2](STATE_FINAL_BLUEPRINT.md)). Contributions cross-Neteru. Pas un Neter (cap 7/7 préservé). Cf. [ADR-0082](adr/0082-yggdrasil-value-circulation-substrate.md), [PANTHEON.md §7](PANTHEON.md). |

### 4.3 — TELEMETRY (ce qui observe)

Tout ce qui rapporte la position, la vitesse, le cap, les conditions externes. Distribué Layer 2-3.

| Composant | Rôle télémétrie |
|---|---|
| **Score 0-200** | Altimètre composite — agrège A+D+V+E+R+T+I+S. |
| **Pillar maturity** | Stage gauges — état de chaque étage individuellement (N0-N6). |
| **Paliers** (LATENT/FRAGILE/ORDINAIRE/FORTE/CULTE/ICONE) | Niveau orbital actuel. |
| **Cult Index / Devotion stats** | Mass measurement — combien de propellant accumulé. |
| **Asset impact tracker** (Seshat post-Ptah) | Cron qui mesure pour chaque `AssetVersion` déployée : engagement, viralité, conversions superfans → calcule `cultIndexDeltaObserved`. Alimente la boucle feedback Ptah (forge → impact mesuré). |
| **Seshat** | Processeur de télémétrie central — indexe (BrandContextNode), répond aux requêtes (ranker), et capte les signaux via ses **deux sous-domaines** : **Tarsis** (`seshat/tarsis/` — temps-réel) et **Argos** (`seshat/argos/` — historique curé, Phase 22 ADR-0083 ; sub-agent Hunter produit `CampaignReferenceDossier`). **Pas un Neter** pour les sous-domaines (cf. [PANTHEON.md §2.3 + §7](PANTHEON.md), [LEXICON.md](LEXICON.md), [ADR-0083](adr/0083-argos-placement-seshat-yggdrasil-seam.md)). |
| **IntentEmission + IntentEmissionEvent** | Black box flight recorder — log immuable hash-chained de toute combustion. |
| **NSP (Neteru Streaming Protocol)** | Live downlink — diffuse la télémétrie temps réel au cockpit, à la mission control, aux passagers. |
| **OracleSnapshot** | Replay — voir où était la brand au stage T-3 mois. |
| **Drift detection** (cron hebdo) | Anomaly alarm — détecte si le système lui-même dérive. |

### 4.4 — SUSTAINMENT (ce qui maintient la mission viable)

Tout ce qui empêche la mission de s'éteindre en plein vol. Layer 2.

| Composant | Rôle sustainment |
|---|---|
| **Thot** | Fuel manager — connaît le propellant restant par operator/brand, alerte avant flame-out. |
| **Cost gate** (à venir, P3) | Abort logic — refuse une combustion qui mettrait la mission en faillite. |
| **LLM Gateway** | Engine controller — route entre engines (Opus/Sonnet/Haiku/Ollama) selon le mission profile (qualityTier, latencyBudget, costCeiling). Multi-provider redundancy. |
| **SLOs** | Performance envelope — limites opérationnelles par Intent kind. Breach = alerte. |
| **Post-conditions** (à venir) | After-burn checks — vérifient que la combustion a produit l'effet déclaré, sinon rollback. |
| **Compensating intents** | Reverse maneuvers — annuler une manœuvre si elle mettait la trajectoire en péril. |
| **Hash-chain integrity** | Black box tamper detection — toute falsification du log est détectable. |
| **Plugin sandboxing** | Containment — un module tiers ne peut pas accéder à des sous-systèmes non déclarés. |

### 4.5 — OPERATIONS (le pont financier au sol)

Tout ce qui fait circuler l'argent et les contrats autour des missions. Sans Operations, l'OS ne peut pas se sustainer économiquement, indépendamment de la qualité des missions.

| Composant | Rôle operations |
|---|---|
| **Socle** (`/console/socle/*`) | Tableau de bord financier UPgraders — commissions, contracts, escrow, invoices, pipeline, revenue, value-reports. |
| **commission-engine** | Calcul des commissions UPgraders/agence/creator par mission. |
| **financial-engine** | Logique business financière (facturation, reconciliation, taux). |
| **financial-reconciliation** | Réconciliation des transactions multi-source. |
| **mobile-money** | Intégration paiement mobile (Orange Money, MTN, Wave) — critique marché africain. |
| **crm-engine** | Relation client structurée (renouvellement retainer, upsell). |
| **upsell-detector** | Détection signaux d'upgrade contractuel. |
| **value-report-generator** | Rapport de valeur livré par UPgraders au client (justifie le retainer). |
| **payment**, **mobile-money**, **commission**, **contract** routers | Surface tRPC d'Operations. |

### 4.6 — CREW PROGRAMS (la formation et l'appariement des équipages)

Tout ce qui prépare, certifie, apparie les humains qui embarquent sur les missions. Sans Crew Programs, pas de talent dispo pour les Glory tools, pas de matching, pas de progression de carrière.

| Composant | Rôle crew programs |
|---|---|
| **Arène** (`/console/arene/*`, `/creator/community/*`) | Hub talent — matching, guild, club, events, orgs. Place de marché des creators et agences. |
| **Académie** (`/console/arene/academie/*`, `/creator/learn/*`) | Formation, certifications, courses, contenu pédagogique. Boutique de skill upgrade. |
| **talent-engine** | Évaluation, scoring, ranking des creators. |
| **matching-engine** | Match creator ↔ mission. |
| **team-allocator** | Composition d'équipes optimales par mission. |
| **qc-router** | Routing du quality control (peer review, validation senior). |
| **tier-evaluator** | Promotion APPRENTI → COMPAGNON → MAÎTRE → ASSOCIÉ pour creators. |
| **guild-tier**, **guilde**, **club**, **membership**, **boutique**, **learning**, **event** routers | Surface tRPC de Crew Programs. |

### 4.7 — COMMS (le système radio)

Layer transverse. Connecte les ponts entre eux. Pas un sous-système isolé — utilisé par tous.

| Composant | Rôle comms |
|---|---|
| **Messages cross-portail** | `/console/messages`, `/cockpit/messages`, `/agency/messages`, `/creator/messages` — fil unifié par operator. |
| **messaging** router | Surface tRPC. |
| **notification** router | Push notifications, alerts, drift signals. |
| **NSP** | Live downlink technique (cf. §4.3) — différent de comms humaines mais coexiste. |

Comms est un sous-système *léger*. Sa sophistication arrive en P5+ avec NSP.

### 4.8 — CONSOLE / ADMIN (la baie de configuration)

Tout ce qui configure, administre, instrumente le framework lui-même. Méta-niveau.

| Composant | Rôle console/admin |
|---|---|
| **Config** (`/console/config/*`) | Integrations OAuth, system settings, templates, thresholds, variables. |
| **Ecosystem** (`/console/ecosystem/*`) | Multi-operator admin, scoring cross-tenant, métriques flotte. |
| **system-config** router | Surface tRPC config. |
| **operator** router | Multi-operator admin. |
| **boot-sequence** | Initialisation système au démarrage. |
| **process-scheduler** | Cron + queue des intents async. |
| **demo-data** | Seeding pour staging/demo. |
| **country-registry** | Référentiel pays (devises, langues, secteurs). |
| **translation** | i18n (préparation P7). |
| **neteru-shared** | Registry central de gouvernance (manifests). |
| **data-export**, **board-export** | Sortie de données structurées. |

---

## 5. Les Trois Ponts — qui est à bord

Trois rôles humains, trois consoles, trois portails. Pas de mélange — la mission demande de la discipline d'équipage.

### 5.1 — Mission Control (le pont des UPgraders)

Portail **Console**. Orchestrent N missions en parallèle. Voient toute la flotte.

- `<NeteruActivityRail>` — quelle mission est en EXECUTING là maintenant
- `<MestorPlan>` — quelles déliberations sont en cours
- `<ArtemisExecutor>` — quels Glory tools tournent
- `<ThotBudgetMeter>` — propellant restant par operator
- IntentLog admin — replay, inspect, debug
- Glory tools cost dashboard

Onboarding d'un nouveau fixer : 5 jours, parce que le rôle n'est plus "savoir tout" mais "lire les instruments".

### 5.2 — Cockpit (le pont des founders)

Portail **Cockpit**. Pilote sa propre mission. Une seule brand.

- `<CascadeProgress>` — 8 nœuds A→S, allumés au fur et à mesure
- `<OracleEnrichmentTracker>` — état des 35 sections de leur Oracle (Phase 13)
- `<DevotionLadder>` — propellant social cumulé
- Score altimeter + tier label en topbar permanente
- Time travel sur l'évolution de leur brand
- `<SeshatTimeline>` — observations Tarsis pertinentes pour leur secteur

Le founder n'est pas spectateur. Il pilote. Il voit la fusée monter. Il devient son **premier superfan** — c'est le point d'amorçage du culte.

### 5.3 — Crew Quarters (les passagers spécialistes)

Portails **Agency** et **Creator**. Apportent l'expertise embarquée pour des phases précises.

- Agency : agence RP, production, médias, événementiel — chacune un specialist embarqué pour son leg de la mission
- Creator : photographe, designer, dev, motion — astronaute pour livrable atomique
- Voient leur charge de travail, leur historique de missions, leur paiement, leurs SLAs
- N'ont **pas** accès à la guidance ni à la propulsion globale — focus sur leur livrable

Le système les rend interchangeables (un creator absent ne bloque pas la mission ; le ranker propose un substitut). C'est l'industrialisation du créatif sans l'aliénation : chacun fait ce qu'il fait de mieux, le système fait le reste.

---

## 6. La Tour de Lancement — Intake public

Portail **(intake)** — route group public. Ce n'est pas un pont. C'est la **tour de lancement** : où une brand candidate se présente, est qualifiée, prépare son décollage.

- Quick-intake (rev 9) — formulaire structuré + brief PDF
- Pre-Oracle — diagnostic préliminaire en 5 min
- Paywall conversion — décollage validé = activation Cockpit + premier Oracle complet
- Anyone can self-qualify; the launchpad is open

C'est le canal d'acquisition principal. APOGEE garantit qu'**aucune mission ne décolle sans que les pre-conditions soient satisfaites**, donc aucun founder n'a une mauvaise première expérience due à un état système incohérent.

---

## 7. Comment chaque outil existant se goupille

Récap exhaustif. Chaque concept La Fusée a sa case dans APOGEE.

| Concept La Fusée | Sous-système APOGEE | Fonction précise |
|---|---|---|
| ADVERTIS cascade | Propulsion | Trajectoire à 8 étages (booster A-D-V-E, mid R-T, upper I-S) |
| Pillars A-D-V-E-R-T-I-S | Propulsion | Étages individuels avec vérouillage progressif |
| Pillar maturity N0-N6 | Guidance | Sub-stages de readiness par étage |
| GLORY tools (91) | Propulsion (Artemis) | Thrusters spécialisés rédactionnels (briefs) |
| GLORY sequences (31) | Propulsion (Artemis) | Manœuvres orchestrées (skill tree) |
| **Ptah Forge** | Propulsion (Ptah, downstream Artemis) | Matérialisation des briefs en assets concrets — image/vidéo/audio/icône/design/stock |
| **ForgeBrief / ForgeSpec** | Propulsion | Output Glory tool brief-to-forge → handoff Ptah |
| **AssetVersion / GenerativeTask** | Propulsion (Ptah) + Telemetry (Seshat) | Lineage parent→upscale→relight + tracking impact |
| **Manipulation Mix** | Cross-Neter | `Strategy.manipulationMix` — paramètre transverse `peddler/dealer/facilitator/entertainer` |
| Oracle (35 sections, 3 tiers post ADR-0045) | Guidance | Plan de vol détaillé (Phase 13, ADR-0014) |
| OracleSnapshot | Telemetry | Black box replay |
| Mestor | Guidance | Guidance computer |
| Artemis | Propulsion (briefs) | Thrust controller + Glory tools rédactionnels |
| Seshat | Telemetry | Telemetry processor |
| Thot | Sustainment + Operations | Fuel manager + finances UPgraders |
| Ptah | Propulsion (forge) | Forge master — matérialisation des briefs |
| Imhotep (**actif Phase 14**) | Crew Programs | Orchestrateur talent matching + composition équipe + formation Académie + qc-routing. ADR-0019 (supersedes ADR-0017). |
| Anubis (**actif Phase 15**) | Comms | Orchestrateur broadcast multi-canal + ad networks + notification center + Credentials Vault. ADR-0020 + ADR-0021 (supersedes ADR-0018). |
| Tarsis | Telemetry (sub-component Seshat) | Sensor array externe — pas un Neter |
| Notoria pipeline | Propulsion | Production assembly |
| LLM Gateway | Sustainment | Engine controller multi-provider |
| Score 0-200 | Telemetry | Altimètre composite |
| Paliers LATENT→ICONE | Telemetry | Niveaux orbitaux (6 paliers) |
| Devotion Ladder | Propulsion | Propellant social cumulé |
| Cult Index | Telemetry | Mass measurement |
| Superfans | Propulsion | Propellant organique auto-régénérant |
| Overton Window | Mission target | Fenêtre orbitale culturelle visée |
| Strategy record | Guidance | Mission profile par brand |
| IntentEmission | Telemetry | Flight log immuable |
| IntentEmissionEvent | Telemetry | Stream de phases |
| NSP | Telemetry | Live downlink |
| Hash-chain | Sustainment | Tamper detection |
| Pillar-readiness gates | Guidance | Pre-flight checklists |
| `governedProcedure` | Guidance | Veto autoritaire |
| `auditedProcedure` (strangler) | Telemetry | Mode dégradé pendant la migration |
| Manifests | Guidance | Type certificates |
| ADRs | Sustainment | Engineering change orders |
| Plugin architecture | Sustainment | Modules tiers homologués |
| Cost gate (à venir) | Sustainment | Abort logic |
| Post-conditions (à venir) | Sustainment | After-burn checks |
| Compensating intents (à venir) | Sustainment | Reverse maneuvers |
| SLOs | Sustainment | Performance envelope |
| Drift cron | Telemetry | Anomaly alarm |
| Console portal | Mission Control | Pont opérateurs UPgraders |
| Cockpit portal | Cockpit | Pont founder |
| Agency portal | Crew Quarters | Spécialistes embarqués |
| Creator portal | Crew Quarters | Astronautes ponctuels |
| Intake portal | Launchpad | Qualification pré-décollage |
| Quick-intake rev 9 | Launchpad | Qualification automatisée |

**Aucun concept de La Fusée n'est étranger à APOGEE. Tout est dans la fusée.**

---

## 8. Ce que APOGEE rend possible (les 5 conditions du culte)

Cf. le rappel des 5 conditions du culte (cohérence narrative, composition, échelle, confiance founder, reproductibilité). APOGEE livre chacune via une mécanique précise.

### 8.1 — Cohérence narrative dans le temps

**Loi 1 (conservation altitude)** + **OracleSnapshot time travel** + **hash-chain** = la narration de la brand est une trajectoire ininterrompue. Le founder peut voir où il était il y a 6 mois, et chaque section nouvelle s'inscrit dans la continuité. Pas de pivot silencieux qui contredit le passé.

### 8.2 — Effet de composition

**Propellant Devotion Ladder** + **Glory sequences (skill tree)** + **Pillar maturity progressive** = chaque touchpoint construit sur les précédents. Brand action sur D s'appuie sur A déjà locked. Glory tool TikTok script utilise le brandbook déjà produit. Composition mécanisée.

### 8.3 — Échelle d'intervention

**Architecture multi-mission** (Console orchestre N brands en parallèle) + **plugin extensibility** (agences ajoutent leurs Glory tools) + **NSP visible cross-mission** = UPgraders peut piloter 50 fusées simultanées sans perdre la cohérence. C'est l'industrialisation du créatif.

### 8.4 — Confiance founder

**Cockpit literal** (le founder voit instruments comme un pilote) + **Loi 3 (fuel transparency)** + **Pre-conditions visibles** + **Refusal as feature (DOWNGRADE/VETO honnêtes)** = l'OS ne ment jamais. Le founder devient pilote au lieu de subir, donc devient *premier superfan*. Le culte commence chez lui.

### 8.5 — Reproductibilité

**Manifests** + **Glory tools governance** + **scaffold rituel** + **ADRs** = la méthodologie ADVE/RTIS *est* le code. Pas dans une tête. Pas dans un drive. Dans le système. Un nouveau dev senior arrive, lit APOGEE.md → FRAMEWORK.md → les manifests, et opère en jours, pas en mois.

### 8.6 — Tableau croisé conditions × sous-systèmes

Quel sous-système APOGEE garantit chaque condition ? Lecture stricte :

| Condition du culte | Sous-système(s) responsable(s) | Composants clés |
|---|---|---|
| 1. Cohérence narrative | Telemetry + Sustainment | hash-chain `IntentEmission`, `OracleSnapshot` time travel, post-conditions narratives |
| 2. Effet de composition | Propulsion + Guidance | Glory sequences (skill tree), pillar-readiness gates, Pillar maturity N0-N6 progressive |
| 3. Échelle d'intervention | Mission Control deck + Comms + Crew Programs | Console orchestrate N brands, NSP cross-mission, matching-engine pour les crew |
| 4. Confiance founder | Cockpit deck + Telemetry + Sustainment | `<OvertonRadar>`, `<FounderRitual>`, `<SuperfanMassMeter>`, Loi 3 transparente, refus visibles |
| 5. Reproductibilité | Guidance + Admin + Crew Programs | manifests, scaffold, ADRs, Académie/learn |

Un manquement dans une cellule = la condition correspondante ne tient pas. Donc une brand ne peut pas finir le voyage. C'est l'argument structurel pour ne pas saboter un sous-système au profit d'un autre.

---

## 9. La Logique de Croissance — comment APOGEE évolue sans diluer

### Croissance verticale — nouveaux Neteru

Plafond 7. Nouveau Neteru exige ADR justifiant fonction de gouvernance distincte. Mythologie cohérente. Pas de prolifération opportuniste.

### Croissance horizontale — nouvelles capabilities

Scaffold + manifest + test + SLO + label phase = chemin standard, sans ADR. Speed of innovation préservée.

### Croissance externe — plugins

Manifest signé + sandboxing par side-effect (cf. P2.7 du REFONTE-PLAN) = partenaires UPgraders étendent sans forker. Network effect.

### Croissance intérieure — apprentissage

Seshat aggrège les patterns IntentEmission historiques pour suggérer prédictivement. Le système devient plus intelligent à chaque mission.

### Décroissance — mort rituelle

Versionning, deprecation cycle 2 sprints, archivage `intent-catalog-graveyard.md`. Une capability peut mourir ; l'historique reste.

### Évolution d'APOGEE elle-même

Toute modification structurelle (nouveau sous-système, nouvelle Loi, ajout/retrait d'une couche) traverse un ADR. Revue semestrielle de la cosmologie. APOGEE n'est pas immuable, mais ses changements sont ritualisés.

---

## 10. Les compléments encore à intégrer

Reprise consolidée des 5 points + 5 dimensions soulevés en cours d'écriture. Reformulés dans le vocabulaire APOGEE.

### Les 5 corrections (planifiées dans REFONTE-PLAN.md)

1. **Cost gate actif (Loi 3 incarnée)** — Thot devient Sustainment vivant et non passif. Phase 3.
2. **Post-conditions** — After-burn checks. Pas de write si l'effet n'est pas vérifié. Phase 2 + 3.
3. **GloryToolManifest sous-format** — Type certificate spécifique au thrusters. Phase 2.6.
4. **Découplage `status` / `observationStatus`** — la mission est COMPLETED dès qu'Artemis renvoie ; l'observation Seshat suit en async. Phase 3.
5. **Plugin sandboxing concret** — Containment par type de side-effect. Phase 2.7.

### Les 5 dimensions complémentaires

1. **LEXICON.md** — glossaire normatif (Intent, Stage, Apogée, Drift, Apogeen, Veto, Downgrade, Compensating). Phase 0/7.
2. **Iconographie** — glyphes officiels par Neteru + l'apogée comme symbole central (point d'orbite). Phase 5.
3. **Rituels humains** — boot ritual, sprint review, monthly ADR review, semestriel cosmologie. Phase 0.
4. **Méta-observabilité APOGEE** — page `/console/governance/apogee-health` qui rend la santé du framework lui-même. Phase 8.
5. **Compensating Intents** — reverse maneuvers ritualisées. Phase 3.

---

## 11. Ce que APOGEE n'est pas

- **Pas un dieu, pas une déité.** APOGEE est un *point physique* (l'apogée d'une orbite). Le framework est nommé d'après la cible géographique, pas un acteur. Les Neteru restent les acteurs.
- **Pas un produit visible.** Le client final voit La Fusée, l'Oracle, son score, son cockpit. APOGEE est l'architecture interne. Peut figurer en footer technique pour les CTO ("OS bâti sur le framework APOGEE"), mais pas en USP.
- **Pas immuable.** Les Lois et les sous-systèmes peuvent évoluer via ADR. Mais l'évolution est ritualisée.
- **Pas un substitut au métier.** Le framework garantit que la trajectoire est gouvernée. Si la stratégie elle-même est mauvaise, la brand atteindra une apogée médiocre. APOGEE empêche les *bugs structurels*, pas les *erreurs de jugement créatif*.
- **Pas stack-bound.** Next.js → Remix, tRPC → autre, Prisma → Drizzle — APOGEE survit. Ce qui survit : les Lois, les sous-systèmes, les manifests, le lifecycle Intent.

---

## 12. La promesse — pourquoi écrire contre APOGEE plutôt que contre rien

Si tu respectes les Trois Lois et que tu places ton ajout dans l'un des 4 sous-systèmes :

1. **Tu pousses la trajectoire** — chaque ligne de code que tu écris ajoute concrètement à l'altitude des brands.
2. **Tu n'écrases pas l'altitude existante** — Loi 1 te protège.
3. **Tu n'allumes pas un étage trop tôt** — Loi 2 te corrige.
4. **Tu ne brûles pas la mission** — Loi 3 te limite.
5. **Tu rends ton ajout intelligible aux passagers et au sol** — Mission Control, Cockpit, Crew Quarters consomment ton ajout via les decks Neteru-UI, pas via tes types brut.
6. **Tu hérites des autres sous-systèmes** — ton thruster utilise la guidance de Mestor, le fuel de Thot, la télémétrie de Seshat. Pas de réimplémentation.
7. **Tu peux partir** — la fusée continue de monter sans toi. La CI tient l'envelopppe. Les rituels reprennent au retour.

Si tu *ne* respectes *pas* les Lois — la fusée refuse ton code. C'est ça, **un vrai OS**.

---

## 13. Régime apogée — ce qui se passe APRÈS l'arrivée à ICONE

Atteindre ICONE n'est pas la fin. C'est **un nouveau régime** : la marque est en orbite stable, mais l'orbite peut s'éroder. Sans maintien actif :
- Les évangélistes vieillissent / changent. Sans recrutement continu, la masse s'effrite.
- Les concurrents observent et imitent. Sans **DEFEND_OVERTON**, ils repositionnent leur narratif jusqu'à reprendre la fenêtre.
- Le secteur évolue. Si la brand ne suit pas (sans **EXPAND_TO_ADJACENT_SECTOR**), elle reste icône d'un secteur qui se rétrécit.

### Les 3 Sentinel Intents

Cataloguées dans `intent-kinds.ts` (Phase 3) :

| Intent | Cadence | Mécanisme |
|---|---|---|
| `MAINTAIN_APOGEE` | Cron mensuel par brand ICONE | Vérifie le ratio évangéliste/total. Si dilution (< seuil sectoriel), Mestor déclenche une séquence Glory de réactivation (re-engagement campaign, ritual revival, exclusivity drop). **Cascade vers Ptah** : `PTAH_REGENERATE_FADING_ASSET` régénère les assets dont l'engagement a chuté >30% vs peak (Phase H). |
| `DEFEND_OVERTON` | Cron hebdo par brand ICONE | Tarsis scanne le secteur pour détecter les concurrents qui imitent le narratif ou tentent de reprendre la fenêtre. Mestor propose contre-mesures (positioning sharpening, recursive content, anti-imitation lawsuit si nécessaire). **Cascade vers Ptah** : forge counter-narrative assets sur le mode déclaré dans `Strategy.manipulationMix`. |
| `EXPAND_TO_ADJACENT_SECTOR` | Trigger manuel founder ou auto si saturation | Identifie les secteurs adjacents qui partagent un sous-ensemble du cultural axis de la brand. Lance une mission "expansion" qui transpose la brand dans ce nouveau secteur en réutilisant le playbook capitalisé (cf. `playbook-capitalization`). **Cascade vers Ptah** : forge expansion playbook assets adaptés au nouveau secteur. |

### La Loi 4 (implicite) — Maintien de la masse en orbite

Conséquence des 3 Sentinels : APOGEE a une **Loi 4 émergente** que je formalise ici pour cohérence.

> **Loi 4 — Maintien de la masse en orbite**
>
> Une brand qui atteint son apogée doit continuer à brûler du carburant pour ne pas redescendre. La gravité orbitale (concurrents, mode, nouvelle génération) attire la marque vers le bas. Sans Sentinel Intents actifs, la dégradation de la masse superfan devient un drift, et le palier ICONE peut se dégrader vers CULTE puis FORTE.

C'est la 4e Loi. Elle s'ajoute aux 3 originales (conservation altitude, séquencement étages, conservation carburant). Elle ne s'applique qu'au régime apogée mais elle est *constitutive* du régime — sans elle, atteindre l'apogée ne signifie rien parce qu'on en redescend.

### UI — `<ApogeeMaintenanceDashboard>` (à venir P5+)

Composant Cockpit pour les brands ICONE :
- Ratio évangéliste / total — alerte si < 70% du seuil sectoriel
- Concurrents tentant l'imitation (Tarsis) — liste avec dates, magnitude
- Secteurs adjacents candidats à l'expansion — score d'opportunité
- Calendrier des Sentinel Intents prévus

---

## Postface — pourquoi ce nom plus que les autres

L'arbitrage final entre MAAT (gouvernance/balance), GRIOT (mémoire/transmission), STAGE (mécanique brute) et APOGEE est documenté dans [ADR-0001](adr/0001-framework-name-apogee.md).

L'argument décisif : **APOGEE est le seul nom qui dit ce que La Fusée fait au présent**. MAAT vend la fiabilité (rassurant mais statique). GRIOT vend la mémoire (riche mais passé-tourné). STAGE vend la mécanique (correct mais flat). APOGEE vend l'**ascension** — ce qui est exactement la promesse produit pour le founder qui décolle, le marché qui se transforme, les superfans qui s'accumulent, l'Overton qui se déplace. Le futur est dans le nom.

Et la fusée reste fusée.

---

## Lectures associées

- [PANTHEON.md](PANTHEON.md) — **source unique de vérité narrative sur les 7 Neteru**
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — paramètre transverse d'engagement audience (4 modes)
- [FRAMEWORK.md](FRAMEWORK.md) — les 5 piliers techniques (Identity, Capability, Concurrency, Pre-conditions, Streaming)
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — comment on arrive à cet état
- [GITHUB-ACTIONS-GUIDE.md](GITHUB-ACTIONS-GUIDE.md) — la mécanisation par CI
- [archive/MAAT-DEPRECATED.md](archive/MAAT-DEPRECATED.md) — version dépréciée, conservée pour traçabilité
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — la décision du nom
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction du 5ème Neter (Ptah)
- [adr/0010-neter-imhotep-crew.md](adr/0010-neter-imhotep-crew.md) — pré-réservation Imhotep
- [adr/0011-neter-anubis-comms.md](adr/0011-neter-anubis-comms.md) — pré-réservation Anubis
- [context/MEMORY.md](context/MEMORY.md) — index des décisions historiques


---

# ANNEXE CANON MI — MISSION — NORTH STAR

> Canon absorbé depuis `MISSION.md` (consolidation bible 2026-05). Source = stub de redirection.


Ce document est l'**ancre**. Si toute autre doc te paraît contradictoire, ambiguë, ou t'éloigne de La Fusée — reviens ici. C'est le test ultime auquel toute décision technique, produit, marketing doit se soumettre.

À lire avant : rien. À lire après : [APOGEE.md](APOGEE.md), [PANTHEON.md](PANTHEON.md), [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md), [REFONTE-PLAN.md](REFONTE-PLAN.md).

---

## 1. La Fusée en une phrase

> **La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur — via la méthode ADVE/RTIS.**

Tout le reste — l'OS, les **7 Neteru actifs** (Mestor, Artemis, Seshat, Thot, Ptah, Imhotep Phase 14, Anubis Phase 15 — cap APOGEE atteint), l'Oracle, les Glory tools, ADVERTIS, APOGEE, les 4 portails, les manifests, NSP, la **Manipulation Matrix** — n'existe que pour servir cette phrase. Quand un module ne contribue pas (directement ou via une chaîne explicite) à cette mécanique, il dérive.

---

## 2. Les deux mécanismes pivots — pourquoi ils ne sont pas des KPIs

### 2.1 — Les superfans

Un **superfan** n'est pas un client, ni un fan. C'est quelqu'un qui :

- **Recrute** d'autres personnes à la marque (pas par marketing payé — par conviction).
- **Défend** la marque publiquement contre la critique.
- **Sacrifie** pour la marque (temps, argent, statut social).
- **Internalise** sa mythologie (il *parle* le langage de la marque, sans guillemets).
- **Reproduit** ses rituels, son vocabulaire, ses ennemis.

Conséquence opérationnelle pour APOGEE :

- Un superfan n'est **pas un KPI mesurable comme un visiteur**. C'est une *masse stratégique* qui produit du travail pour la marque sans que la marque le paie.
- Le `cult-index-engine` ne mesure pas "combien de superfans" comme on mesure "combien de visiteurs uniques". Il mesure des **proxies de comportement de superfan** (engagement profond, recrutement organique, signature linguistique partagée, durée d'attachement).
- La **Devotion Ladder** est l'outil de classification de la masse :
  - Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste
  - Seuls les deux derniers paliers sont des superfans au sens strict.
  - L'objectif d'APOGEE n'est pas d'avoir beaucoup d'engagés. C'est d'avoir une **fraction critique d'évangélistes** capable de générer la propagation auto-entretenue.

Métaphore physique : les superfans sont la **mass concentration** qui crée le champ gravitationnel d'une marque. Un nuage diffus de fans = pas de gravité. Une masse dense d'évangélistes = trou noir narratif qui aspire la conversation autour d'elle.

### 2.2 — La fenêtre d'Overton

L'Overton n'est pas un *espace cible* à atteindre. C'est l'**axe culturel actuel** — ce qui est considéré comme acceptable, normal, attendu dans un secteur ou une société à un instant T.

Une marque qui a réussi son apogée **a déplacé l'axe lui-même**. Exemple : avant Nike-Kaepernick, "marque sportive prend position politique" était hors-Overton. Après, ça l'est. Avant Patagonia, "marque vendue par sa propre activisme environnemental" était hors-Overton. Après, c'est la norme. Avant Apple, "design comme religion technique" n'existait pas. Après, *toutes* les marques tech doivent répondre.

Conséquence opérationnelle pour APOGEE :

- L'Overton **n'est pas mesuré directement**. C'est l'effet *secondaire* de l'accumulation des superfans + de la qualité narrative.
- Le système peut **observer la résistance/déplacement** via Tarsis (presse, conversations sectorielles, tendances). Si Tarsis détecte que les concurrents commencent à imiter le langage/positionnement de la marque, c'est un signal Overton.
- L'objectif final d'une mission n'est pas "atteindre ICONE" — c'est "que le secteur se redéfinisse autour de la marque". ICONE est le palier de score qui *coïncide* avec ce déplacement, mais le score n'est pas la cause.

Métaphore physique : si les superfans sont la masse, l'Overton est l'**axe de l'espace culturel** que cette masse plie. Un trou noir suffisant déforme l'espace-temps autour de lui. L'apogée d'une mission, c'est le moment où la marque déforme l'espace culturel de son secteur.

---

## 3. La séquence opérationnelle (comment ça marche concrètement)

L'OS produit cette transformation en 5 étapes auto-renforçantes :

```
[1] Substance       — La marque a une identité authentique, distincte, valeur claire (Pillars A+D+V)
       │
       ▼
[2] Engagement      — Touchpoints répétés produisent une devotion progressive (Pillar E)
       │
       ▼
[3] Accumulation    — Devotion ladder remplie ; ambassadeurs et évangélistes apparaissent
       │
       ▼
[4] Gravité         — Les superfans recrutent d'autres superfans → propagation auto-entretenue
       │
       ▼
[5] Overton shift   — Le secteur commence à se définir par rapport à la marque ; norme déplacée
       │
       ▼
   ICONE atteint — patrimoine, transmission, position défendable
```

Chaque étape est **mécanisée par des composants APOGEE** :

| Étape | Mission Tier | Ground Tier |
|---|---|---|
| 1. Substance | Guidance (Mestor, pillar-gateway, strategy-presentation) | Operations (intake, contrats — Thot) |
| 2. Engagement | Propulsion (Artemis Glory tools brief + Ptah forge assets, campaigns, sequences) | Crew Programs (creators qui exécutent — Imhotep) |
| 3. Accumulation | Telemetry (devotion-engine, cult-index, advertis-scorer — Seshat) | Crew Programs (Académie + community — Imhotep) |
| 4. Gravité | Telemetry (Jehuty cross-brand, Tarsis signals — Seshat) | Comms (cross-portal + ad networks — Anubis) |
| 5. Overton shift | Telemetry (market-intelligence, Tarsis sectorielles — Seshat) | Admin (ecosystem metrics, multi-operator — INFRASTRUCTURE) |

Chaque PR, chaque service, chaque page doit pouvoir **citer son étape** et **son sous-système APOGEE**. Si elle ne peut pas, elle dérive.

---

## 4. Test anti-dérive (le drift check)

Pour toute décision technique, produit, marketing, doc :

> **Question canonique** : *Comment cette unité contribue-t-elle, directement ou via une chaîne explicite, à accumuler de la masse de superfans et/ou à déplacer la fenêtre d'Overton ?*

Trois réponses possibles :

| Réponse | Validité | Action |
|---|---|---|
| **Directe** : "Cette unité produit/mesure du superfan ou observe l'Overton." | ✓ Valide | Documenter la chaîne dans le manifest + commit message. |
| **Chaîne explicite** : "Cette unité enable la directe X qui produit Y qui accumule Z superfans." | ✓ Valide *si* la chaîne est traçable jusqu'à un composant Telemetry/Propulsion mesurable. | Documenter chaîne + composant cible. |
| **Indirecte/infrastructurelle** : "Cette unité tient le système debout sans contribuer à la mission." | ⚠ Ambiguë. Doit appartenir au Ground Tier (Operations / Admin / Crew Programs / Comms) avec justification de pourquoi le Mission Tier ne peut pas tourner sans. Si pas justifiable → dérive. | Re-classer ou supprimer. |

**Exemple de chaîne valide** (test passé) :
> `mobile-money` service → permet aux founders africains de payer le retainer → permet UPgraders de servir leur mission → produit superfans pour la brand client. Ground Tier / Operations. ✓

**Exemple de chaîne invalide** (test échoué) :
> Une page admin qui affiche les logs serveur "parce que c'est utile". → Aucun lien à la mission. Si l'utilité est purement debug, → outil dev local, pas page de l'OS.

---

## 5. Auto-audit — les dérives que j'ai introduites en écrivant APOGEE et les maps

Honnêteté requise pour que le test fonctionne. Voici les dérives détectables dans mes propres docs (commits `fa4ca9d`, `490c395`, `4ef3786`, `d8eaf67`) :

### Dérive 1 — APOGEE met l'accent sur l'ascension, peu sur la **gravité**

APOGEE.md décrit la trajectoire qui mène à l'apogée. Mais l'apogée n'est pas un *point d'arrivée* — c'est un *régime stable* où la marque est devenue gravitationnelle. Le doc ne décrit pas suffisamment ce qui se passe **après** l'arrivée à ICONE : comment la masse superfan est *maintenue*, comment la gravité Overton est *défendue*.

**Correction requise** : ajouter dans APOGEE §2 une section "Régime apogée — maintien" qui couvre `Loi 4 — Maintien de la masse en orbite` (rétention superfan, contre-attaques de concurrents, érosion narrative).

### Dérive 2 — Les maps classent par fonction technique, pas par étape de la séquence opérationnelle

PAGE-MAP, SERVICE-MAP, ROUTER-MAP classent par **sous-système APOGEE** (Propulsion, Guidance, etc.). C'est correct mais incomplet : aucune map ne croise **étape de séquence** (Substance → Engagement → Accumulation → Gravité → Overton).

Conséquence : impossible aujourd'hui de répondre à la question "quels services contribuent à l'étape 4 — Gravité ?" sans relire les maps et tagguer mentalement.

**Correction requise** : ajouter une colonne `Étape mission` dans les 3 maps OU un doc transverse `STEP-MAP.md` qui inverse la lecture (par étape de séquence → liste des composants).

### Dérive 3 — Les paliers LATENT→ICONE sont décrits mais pas les **mécanismes de transition**

J'ai listé les 6 paliers avec leurs scores mais pas **ce qu'il faut faire pour transitionner**. Or c'est ce qui constitue la valeur du conseil UPgraders :
- Comment passer de FORTE à CULTE ?
- Comment passer de CULTE à ICONE ?

Ces transitions ne sont pas mécanisables purement par algorithme — elles dépendent du secteur, du timing, de l'exécution créative. Mais le système doit les *modéliser comme des Intents distincts* avec leurs pré-conditions spécifiques.

**Correction requise** : créer 5 Intent kinds de transition (`PROMOTE_LATENT_TO_FRAGILE`, `PROMOTE_FRAGILE_TO_ORDINAIRE`, ..., `PROMOTE_CULTE_TO_ICONE`) avec leurs pre-conditions et leurs Glory sequences associées. Ajouter au REFONTE-PLAN P3.

### Dérive 4 — Comms et Admin ont une vibe "utility" qui peut diluer le framework

Quand j'ai ajouté le Ground Tier, Comms et Admin sont apparus comme des sous-systèmes nécessaires mais **moins "rocket-coherents"** que les 4 originaux. Risque : ils deviennent dépotoirs pour tout ce qui ne fitte ailleurs.

**Correction requise** : pour chaque service/router classé Comms ou Admin, expliciter sa chaîne vers la mission (cf. §4 ci-dessus). Si la chaîne est faible, requalifier ou flagger pour suppression.

### Dérive 5 — Aucune des docs ne fait du founder le pilote ACTIF de l'Overton

Le founder dans Cockpit voit son score, ses Pillars, ses livrables. Il *pilote sa fusée*. Mais il ne **pilote pas son Overton** — il n'a pas d'instrument explicite qui lui dit "ton secteur commence à parler comme toi, voici les preuves". Or la conscience du shift Overton est précisément ce qui transforme un founder en évangéliste fanatique de sa propre marque.

**Correction requise** : ajouter un composant Neteru UI Kit `<OvertonRadar>` (P5 du plan) qui rend visible au founder le déplacement culturel de son secteur — citations, imitations concurrentes, vocabulaire sectoriel, mentions presse non-payées. Alimenté par Tarsis + market-intelligence.

### Dérive 6 — Le système ne mesure pas le mode d'engagement (manipulation drift)

Une brand peut accumuler des signaux qui ressemblent à du superfan en surface, sans que ce soit le bon type d'engagement pour sa stratégie. Ex: une brand premium qui se déclare *entertainer* mais dont les ads sont tous *peddler* (urgence, prix, drops). L'audience qu'elle accumule n'est pas convertible vers évangéliste — elle est addicted aux promos. Sans détection de cette divergence (`expectedManipulationMode` vs `realisedManipulationMode`), la mission croît dans le faux sens.

**Correction requise** : déployer la [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md). Chaque `BrandAction` porte un `expectedManipulationMode` ; Seshat compute `realisedManipulationMode` post-déploiement à partir des engagement patterns. Cron `audit-manipulation-drift.ts` flagge si écart >20% sur >10 actions consécutives. Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse les Intents qui sortent du `Strategy.manipulationMix`.

---

## 6. Mécanisme de détection automatisée (drift CI)

Au-delà du test humain, un **drift detector automatisé** (à ajouter en P0/P6) :

```bash
# scripts/audit-mission-drift.ts
# Pour chaque manifest service/capability :
#   - vérifier que le manifest contient un champ `missionContribution`
#     valeur : "DIRECT_SUPERFAN" | "DIRECT_OVERTON" | "CHAIN_VIA:<service>" | "GROUND_INFRASTRUCTURE"
#   - si "GROUND_INFRASTRUCTURE", exiger un champ `groundJustification` non vide
# Pour chaque page :
#   - vérifier qu'elle a un mapping dans PAGE-MAP.md
#   - vérifier que sa chaîne mission est documentée dans le frontmatter
# Output : liste des unités sans contribution déclarée → fail CI
```

Ce script tourne en CI. Une PR qui ajoute un service sans `missionContribution` declaré → bloquée. C'est le test §4 mécanisé.

---

## 7. La discipline d'écriture future

Pour toute nouvelle doc, ADR, manifest, page, je m'engage à :

1. **Citer la mission §1 verbatim** dans le préambule de toute doc gouvernance (ou la référencer par lien).
2. **Identifier l'étape de séquence** (1-5) à laquelle la doc s'applique.
3. **Identifier le sous-système APOGEE** dans lequel la doc s'inscrit.
4. **Documenter la chaîne mission** si l'unité décrite n'est pas Direct.
5. **Auto-flagger** toute formulation qui *pourrait* dériver (ex: parler de "engagement" sans préciser "engagement → devotion ladder → superfan").

Le test §4 doit pouvoir être passé sur la doc elle-même.

---

## 8. Auto-correction protocol — si un agent (humain ou IA) détecte une dérive

Procédure :

1. **Identifier** quelle des 5 dérives ci-dessus se rapproche le plus (ou en formuler une 6e).
2. **Citer** le commit et le passage problématique.
3. **Formuler** la correction selon §7.
4. **Soumettre** un ADR si la correction implique une modification structurelle d'APOGEE.
5. **Patcher** la doc impactée.

Ne pas corriger silencieusement — la correction passe par l'audit explicite. Sinon le système oublie qu'il a dérivé et la dérive se reproduira.

---

## 9. Vérification finale — La Fusée en pratique

Test de fidélité à la mission. Ces affirmations doivent être *vraies* :

- [ ] Toute mutation tRPC qui ne contribue pas (direct ou chaîné) à accumuler superfan / shifter Overton est rejetée en review.
- [ ] Tout founder dans Cockpit voit en temps réel **son score**, **son palier**, **sa chaîne devotion ladder**, **son axe Overton sectoriel**. _<!-- Phase 23 Epic 7 : axe Overton sectoriel désormais visible via `/cockpit/intelligence/overton` (route + teaser dashboard + nav Intelligence), alimenté par `cockpitDashboard.overtonSignal` (`ConnectorResult<OvertonRadarSignal>`). Case cochable — flip après sign-off direction des seuils de calibration (RESIDUAL-DEBT Phase 23 closure). -->_
- [ ] Tout creator dans Crew Quarters voit comment ses missions ont contribué à l'accumulation superfan d'un client (lineage personnel).
- [ ] Tout opérateur UPgraders peut afficher pour n'importe quelle brand : "voici les 5 prochaines actions qui maximisent le gain superfan/Overton ratio". _<!-- Phase 23 Epic 6 : surface opérateur calibration-review (`CalibrationReviewPanel` + `CampaignTrackerHub`) sur `/console/governance/campaign-tracker` ; 7 pivot sub-clusters au lifecycle MVP avec ratio réel. Case cochable — flip après sign-off direction. -->_
- [ ] L'Oracle de chaque brand contient une section "État Overton sectoriel" mise à jour par Tarsis. _<!-- Phase 23 Epic 3 Story 3.6 : la section Overton-distinctive de l'Oracle consomme le signal réel via `OvertonRealSignal` (off Jaccard placebo), alimenté par `sector-intelligence/` ← Tarsis connector. Case cochable — flip après sign-off direction. -->_
- [ ] Le drift detector CI passe sur 100% des unités.

État actuel : **0/6 cases cochées** — 3 rendues *cochables* par Phase 23 (axe Overton founder · surface opérateur next-5 / ratio · section Overton de l'Oracle). Le flip de ces 3 cases attend le sign-off direction des seuils de calibration ROC AUC / RMSE (décision business, calendar-tracked dans [RESIDUAL-DEBT.md](RESIDUAL-DEBT.md) Phase 23 closure). Les 3 restantes (review-gate mutation · lineage creator · drift detector CI 100%) relèvent de chantiers ultérieurs.

---

## 10. Lectures ancrées

- [APOGEE.md](APOGEE.md) §4 — sous-systèmes (machinerie qui sert cette mission)
- [PANTHEON.md](PANTHEON.md) — les 7 Neteru et leur contribution mesurable à la mission
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — comment la brand transforme l'audience en propellant
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — comment livrer le système qui tient cette mission
- [FRAMEWORK.md](FRAMEWORK.md) — invariants techniques au service de cette mission
- [PAGE-MAP.md](PAGE-MAP.md) / [SERVICE-MAP.md](SERVICE-MAP.md) / [ROUTER-MAP.md](ROUTER-MAP.md) — où chaque pièce vit
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — pourquoi le framework s'appelle APOGEE
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction de Ptah (5ème Neter)
- [context/MEMORY.md](context/MEMORY.md) — décisions historiques

**Si toi (humain ou IA) lit ce doc dans 6 mois et qu'il sent quelque chose qui dévie de §1 — applique §8.**


---

# ANNEXE CANON G — GOUVERNANCE NETERU (politique)

> Canon absorbé depuis `GOVERNANCE-NETERU.md` (racine, draft v0.1). Source = stub de redirection.

Version: 0.1 — 2026-04-11

Objectif
--------
Décrire une politique opérationnelle et technique pour gouverner les recommandations produites par
NETERU (Mestor / Artemis / Seshat) : traçabilité, sécurité, qualité, contrôle humain et observabilité.

Portée
------
S'applique à toutes les sorties automatisées étiquetées `recommendation`, `reco`, `rtis`, `oracle` ou
produites par les sequences GLORY orchestrées par Artemis et/ou Mestor. Ne couvre pas les opérations
bas niveau infra (deploy, infra-as-code) mais couvre les intégrations (campaign-manager, driver-engine,
vault, feedback-loop).

Principes
---------
- Séparation des rôles : `Mestor` (décision), `Artemis` (orchestration), `Seshat` (observation). La gouvernance
  est une couche transverse (policy + humains).  
- Provenance obligatoire : toute reco porte sa source, sa confiance, et un snapshot d'entrée.  
- Minimal Safe‑Action : bloquer automatiquement les actions destructrices sans approbation.  
- Transparence & Explainability : résumé court (top‑3 raisons) attaché à chaque reco.  
- Mesurabilité : KPIs et alertes pour suivre dérives et impacts.  
- Least Privilege : séparation des droits (read vs suggest vs approve vs apply).

Métadonnées obligatoires (schéma minimal)
----------------------------------------
Chaque recommandation persistée doit contenir au moins :

- `id` : uuid
- `ts` : timestamp
- `agent` : `Mestor` | `Artemis` | `GLORY_TOOL` | `Human`
- `sequenceKey` (si applicable)
- `modelVersion` : string (LLM/tool version)
- `inputSnapshotRef` : reference to stored input state (vault/db id)
- `confidence` : 0.0-1.0
- `source` : `vault` | `manual` | `external` | `derived`
- `variablesUsed` : [string]
- `changeType` : `SET` | `PATCH` | `UPSERT` | `ACTION`
- `destructive` : boolean
- `explain` : short text (1-3 lignes)
- `applyPolicy` : `auto` | `suggest` | `requires_review`

Quality Gates (automatiques)
----------------------------
- Gate: Confidence
  - `confidence >= 0.7` → suggestion auto‑appliquée si `applyPolicy=auto` et non destructive.
  - `0.5 <= confidence < 0.7` → require human review before apply.
  - `confidence < 0.5` → block / do not apply; store as draft for inspection.

- Gate: Destructive changes
  - Toute reco avec `destructive=true` nécessite 2 approbations humaines (Operator + Strategy Governor)
    avant application.

- Gate: Financial validation
  - Toute reco modifiant budgets/prix passe par `financial-brain.validateFinancials(...)` et doit
    satisfaire les règles (BLOCK/WARN/INFORM) avant application.

- Gate: External data freshness
  - Si `source=external` et `source.ts` > X jours (configurable), re-validation manuelle requise.

- Gate: PII / Compliance
  - Les sorties contenant PII doivent être redacted avant exposition et stockées selon la politique GDPR/Local.

Rôles et responsabilités
------------------------
- Strategy Governor (propriétaire de la policy) : valide seuils, approbations, SLA.  
- Model Steward : versioning des LLMs, contrôle retrain, rollback.  
- Protocol Owner (Artemis lead) : maintient sequences, quality gates, tests.  
- Operator / Fixer : exécute revues, applique recos après approbation.  
- Auditor / Compliance : audits périodiques, revue logs immuables.  
- Platform Owner : métriques, dashboards, alerting (feedback-loop).

Cycle de vie d'une recommandation (extrait)
-------------------------------------------
1. Génération : `Mestor` / `Artemis` produit une reco avec métadonnées obligatoires.
2. Évaluation automatique : middleware de gating exécute toutes les gates (confidence, financial, PII...).
3. Explainability : on génère un résumé `explain` attaché.  
4. Approval path : selon `applyPolicy` et flags, envoyer au ou aux humains désignés.  
5. Application : application atomique + log immuable (audit id).  
6. Observabilité : feedback collecté via `feedback-loop` (metrics, success, revert).  

Observabilité & KPIs
--------------------
- Recommendation Acceptance Rate (par agent, par sequence)
- Revert Rate (applied → reverted dans les 30 jours)
- Time to Approve (median)
- Confidence distribution (histogram)
- Business impact signals (A/B, lift après 7/30/90 jours)
- Model drift alerts (confidence drop / input distribution shift)

Stockage & audit trail
----------------------
- Logs immuables (jsonl) : conserver `inputSnapshotRef`, `modelVersion`, `applyTrace`.
- Vault: store external sources with provenance (SOURCES, date, confidence). Voir pattern `financial-brain/benchmarks`.

Versioning, Testing et Déploiement
---------------------------------
- Tagger `modelVersion` et dataset snapshot à chaque release modèle.
- Canary : dry‑run sur X% des stratégies (configurable) avant full apply.
- Backout : chaque change appliqué contient un `rollbackPlan` accessible via audit id.

Checklist d'implémentation (roadmap priorisée)
---------------------------------------------
1. Mandater métadonnées obligatoires et valider leur présence dans les sorties Mestor/Artemis.  
2. Implémenter middleware de gating dans `rtis-cascade` pour bloquer/appliquer selon règles.  
3. Intégrer appel `financial-brain/validateFinancials` pour tout changement financier.  
4. Ajouter stockage d'audit immuable (`logs/reco-execution.jsonl` ou table DB).  
5. Exposer KPIs dans `feedback-loop` + dashboard (alertes).  
6. Lancer canary + mesurer acceptance/revert + itérer politique.

Exemples de règles rapides
--------------------------
- Budget recommendation: call to `financial-brain.validateFinancials(...)` required.  
- Persona SET on `d.personas`: `destructive=true` so 2 approvals required.  

Prochaine étape proposée
-----------------------
- Si d'accord : générer PR minimal qui (a) ajoute la validation des métadonnées et (b) installe le middleware
  de gate dans `src/server/services/mestor/rtis-cascade.ts` pour la gate `confidence`.  

Contact / ownership
-------------------
Policy owner: Strategy Governor (à définir) — pour questions et changements de seuils.

---
Fin du draft.
