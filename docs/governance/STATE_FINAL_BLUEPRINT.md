# STATE_FINAL_BLUEPRINT — La Fusée d'UPgraders
## 📖 LA BIBLE DU PROJET — monolithe canon unique

> **Document canon absolu de l'Industry OS.** *Monolithe consolidé (2026-05) : absorbe en ANNEXES CANON le Framework technique et la Manipulation Matrix — et, à terme, le Lexique, le Panthéon, APOGEE, la Mission (sources converties en stubs de redirection). Les cartes auto-générées (CODE-MAP, INTENT-CATALOG, maps), les 87 ADR immuables et CLAUDE.md restent séparés par nécessité technique.* Produit le 2026-05-16 par NEFER après audit exhaustif du repo + 9 itérations doctrinales avec Alexandre "Xtincell" DJengue, CEO d'UPgraders, concepteur de la méthode ADVERTIS. Ferme closure-roadmap target #11 (STATE_FINAL_BLUEPRINT). Source de vérité pour toute décision architecturale, économique, ou produit future.

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
| 6 | **APIs** | tRPC routers (89) · Glory tools (56 CORE / 105 registry) · Frameworks (28) · Sequences (100 dont 65 DRAFT) · Intent kinds (150+) | ✅ |
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

**Note ADR-0082** : à amender pour retirer "gouverné par Mestor" → "traverse Mestor mais ungoverned substrate".

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

**Test anti-drift** `yggdrasil-three-invariants.test.ts` 📋 à créer (mentionné ADR-0082, jamais shippé).

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

ZOMBIE → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE.

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

Le score multi-dimensions étalonne la maturité d'une marque sur sa trajectoire ZOMBIE→ICONE. **Score le plus élevé = objectifs atteints** :

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
| **Overton Delta** | Déplacement axe sectoriel mesuré | `sector-intelligence/` | ✅ |
| **Superfan Velocity** | Taux croissance superfans nominaux par période | `cult-index-engine/` | ✅ |
| **Brand Asset Maturity** | % BrandAsset.kind ACTIVE / kinds applicables | `brand-vault/` | 🟡 |
| **Pillar Completeness** | % piliers ADVE/RTIS COMPLETE non-stale | `pillar-readiness.ts` | ✅ |
| **Campaign Performance** | ROI moyen pondéré sur cycle écoulé | `campaign-tracker/` | ✅ |
| **Production Quality** | Glory tool QC moyen sur cycle | `qc-router/` | 🟡 |

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
| PDF Oracle léger | ZOMBIE→FRAGILE | conversion intake | 5-25k FCFA |
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
| **D-6.3** `enrichOracle` renamed `enrichOracleNeteru` cohabitation | L | Migration plan documenté MISSION.md Dérive #5 |
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
