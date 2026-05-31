# CAHIER DES CHARGES — REFONTE D'ALIGNEMENT CODE ↔ BLUEPRINT
## La Fusée d'UPgraders — passage du code au CANON v3.3 + comblement des 9 trous

> **Nature de ce document.** Spécification opposable d'une **refonte lourde** dont l'objet unique
> est d'**aligner le code (`ADVE-project`) sur le corpus conceptuel** (`LA_FUSEE_BLUEPRINT.md`,
> `LIVRE_DE_BORD.md`, `CAHIER_DES_CHARGES.md`). Il ne rouvre pas la doctrine : il la **rend
> exécutable**. Registre normatif et chiffré ; chaque chapitre **tranche** une décision et produit
> un artefact opposable (table, machine à états, critère d'acceptation, gate anti-drift).
>
> **Base d'audit.** `AUDIT blueprint vs code (2026-05-31)` — voir la synthèse en §0.1. Trois écarts
> structurants : (1) le nommage **CANON v3.3** n'est pas adopté (0 % du code) ; (2) les **5 trous
> rouges** du cahier des charges sont implémentés à ~30 % ; (3) `PilotingRegime`, verrou transverse,
> est absent et non tracé.
>
> Nommage cible conforme au **CANON v3.3**. Quand ce document désigne l'état *actuel* du code, il
> emploie l'ancien nom entre `code` (ex. `mestor/`) ; quand il désigne l'état *cible*, il emploie le
> nom v3.3 (ex. **Sia**).

---

## 0. CADRE

### 0.1 — Objet & hypothèse directrice

**Objet.** Conduire le code de son état actuel (ancien nommage, fondations présentes, trous ouverts)
à l'état **canon v3.3 pleinement implémenté**, sans jamais rompre les invariants du système en vol.

**Hypothèse directrice (tranchée).** Le sens de l'alignement est **code → blueprint**. Le corpus
conceptuel fait foi ; le code le rattrape. *Alternative écartée — replier le blueprint sur l'ancien
nommage du code :* moins coûteuse (le blueprint n'est que doc) mais elle annule la décision
doctrinale v3.3 d'Alexandre (panthéon égyptien pur) et la commande explicite d'une refonte *lourde*.
Écartée. **Si cette hypothèse est fausse, tout ce document est caduc — à valider en préambule.**

**Trois chantiers, dans cet ordre :**

| # | Chantier | Comble | Partie |
|---|----------|--------|--------|
| **A** | La Grande Renomination (CANON v3.3) | Drift majeur §2 de l'audit | Partie I |
| **B** | Les entités-socle (prérequis) | `PilotingRegime` + score 8-dim + zone-indices | Partie II |
| **C** | Les 9 chapitres → code | Les 5 trous rouges + 4 jaunes du `CAHIER_DES_CHARGES.md` | Partie III |

### 0.2 — Périmètre

**Dans le périmètre :** renommage intégral des symboles + migration gouvernée des identifiants
persistés ; création des entités-socle (`PilotingRegime`, `scoring-engine` 8-dim, `seshat/zone-indices`) ;
implémentation des 9 décisions du cahier des charges (EFR, données, activation, SLA, amendement,
pricing, KPIs agence, brownfield, PI) ; synchronisation des **7 sources de vérité** ; durcissement
des gates anti-drift CI.

### 0.3 — Hors périmètre (à ne pas rouvrir)

- Aucune nouvelle fonction métier au-delà des 9 chapitres. *« En écrire d'autres, c'est rouvrir la boucle. »*
- Aucun relèvement du **cap APOGEE 7/7** (le renommage ne change pas le compte, seulement les noms).
- Aucune réécriture de l'historique hash-chaîné (Loi 1).
- Aucune migration de stack (Next/Prisma/tRPC restent).
- Phase 22 Argos (déclenchée par demande explicite d'Alexandre) reste hors-séquence, mais R5 **pré-câble** son nommage (§I.R5).

### 0.4 — Les 5 invariants intouchables

Tout au long de la refonte, **chaque PR doit laisser ces cinq propriétés vraies** :

- **INV-1 — Cap 7/7.** `BRAINS` contient exactement 7 Neteru + l'étiquette `INFRASTRUCTURE`. Le renommage substitue des noms, jamais n'en ajoute ni n'en retire.
- **INV-2 — Layering cascade.** `domain → lib → server/governance → server/services → server/trpc → components/neteru → app`. Imports descendants seuls (ESLint `boundaries` + `madge --circular`).
- **INV-3 — Manual-first parity (ADR-0060).** Toute capability LLM neuve a son UI manuelle équivalente. Les tests HARD `assembler-uses-manual-path` restent verts.
- **INV-4 — Loi 1, hash-chain immuable.** Aucun `UPDATE` rétroactif d'une ligne `IntentEmission` existante. L'altitude acquise reste acquise.
- **INV-5 — Anti-drift CI vert.** La suite de gouvernance (`tests/unit/governance/*`) reste verte à chaque merge. Tout test muté l'est **dans la même PR** que le changement qu'il garde.

### 0.5 — LA DOCTRINE DES DEUX CLASSES D'IDENTIFIANT *(point dur de toute la refonte)*

Le renommage n'est pas uniforme. Deux classes, deux régimes :

| Classe | Définition | Exemples | Régime de renommage |
|--------|-----------|----------|---------------------|
| **Classe S — Symbole** | Identifiant vivant uniquement en code/doc, jamais sérialisé en base ni dans la chaîne | noms de dossiers (`mestor/`), classes, types TS (`Governor`), fonctions, texte des docs, slugs d'ADR | **Codemod libre**, par-terme, une PR par terme. |
| **Classe P — Persisté/wire** | Identifiant **sérialisé** : colonne DB, valeur d'enum stockée, préfixe d'Intent kind, charge utile hash-chaînée | `IntentEmission.governor` (`"MESTOR"`), `IntentEmission.intentKind` (`"ARTEMIS_*"`), palier en snapshot s'il est caché | **Migration gouvernée** : alias old→new, écriture des **nouvelles** valeurs au nom v3.3, lecture tolérante des deux. **Jamais d'UPDATE rétroactif** (INV-4). |

**Règle d'or.** Un symbole de Classe S se renomme ; un identifiant de Classe P se **double** (alias) puis
se **bascule en écriture**, l'ancien restant lisible à vie. Confondre les deux = casser la hash-chain
ou les agrégats Seshat. Voir la machine de migration en **§I.2**.

### 0.6 — Critère de complétude (« aligné »)

La refonte est **finie** quand, simultanément :

1. `grep -ri "mestor\|artemis\|tarsis\|jehuty\|hunter\|yggdrasil\|zombie" src/` ne renvoie que des **alias de compat explicitement annotés** `@deprecated-wire` (Classe P) — zéro symbole de Classe S.
2. Les **7 sources de vérité** (§I.3) nomment les 7 Neteru en v3.3, et `neteru-coherence.test.ts` est vert en mode HARD.
3. `PilotingRegime`, `scoring-engine` (8-dim) et `seshat/zone-indices` existent, sont gouvernés par Mestor (Sia) et couverts par tests.
4. Les **5 trous rouges** sont fermés par une entité + un Intent + un gate + une UI manual-first ; les **4 jaunes** fermés ou reportés avec justification tracée.
5. La `closure-roadmap.md` porte les cibles correspondantes en `SHIPPED`.

### 0.7 — Tableau de bord des décisions tranchées (récapitulatif)

| Réf | Décision | Tranche |
|-----|----------|---------|
| D-0 | Sens de l'alignement | code → blueprint v3.3 |
| D-1 | Stratégie de renommage | codemod par-terme (Classe S) + alias persisté (Classe P), **pas big-bang** |
| D-2 | Identifiants persistés | alias + bascule en écriture, **zéro UPDATE rétroactif** |
| D-3 | Découpage livraison | une PR par terme renommé ; une PR par entité-socle ; une PR par chapitre |
| D-4 | Gel de fonctionnalités | **gel partiel** des surfaces touchées par la vague en cours (cf. §V.1) |
| D-5 | Format de suivi | fold dans `closure-roadmap.md` (cibles #20→#2x), **pas** de ledger parallèle |

---

# PARTIE I — LA GRANDE RENOMINATION (CANON v3.3)

> **Trou comblé :** Audit §2 (drift de nommage). **Ancrage canon :** Blueprint §0.6 (Loi du Panthéon),
> §0.7 (l'Arbre et la Sève), README v3.3, `CAHIER_DES_CHARGES_PLAN.md` §1.1 (nommage strict).

## I.0 — Stratégie (décision D-1)

**Décision normative.** Renommage **par-terme**, une PR atomique par terme, dans l'ordre de §I.5.
Pour la **Classe S** : codemod mécanique (`ts-morph` ou `grep`+`sed` gouverné) + régénération CODE-MAP
(`npx tsx scripts/gen-code-map.ts`) + mise à jour des tests dans la même PR. Pour la **Classe P** :
introduction d'une couche d'alias (§I.2) **avant** la PR de renommage des symboles, de sorte que la
bascule de code n'altère jamais une valeur déjà écrite.

*Alternative écartée — big-bang (tout en une PR).* Diff de ~1 200 fichiers, conflits de merge garantis,
revue impossible, anti-drift CI rouge pendant des jours. Écartée. *Alternative écartée — alias de
symbole permanent (`export { Sia as Mestor }`).* On n'alias pas un dossier ni un slug ; et garder
l'ancien symbole vivant **perpétue** le drift que la refonte élimine. L'alias est réservé à la Classe P,
et borné par une fenêtre de dépréciation.

## I.1 — Table maîtresse des renommages

| Réf | Ancien (code) | Cible v3.3 | Surfaces principales | ~Réfs fichiers | Classe(s) |
|-----|---------------|------------|----------------------|----------------|-----------|
| **R1** | Mestor | **Sia** | `src/server/services/mestor/`, `BRAINS`, `GOVERNORS`, `governor` col, Intent kinds `MESTOR_*`, docs, tests | 471 | S + **P** |
| **R2** | Artemis | **Neith** | `src/server/services/artemis/` (+ 139 Glory tools, 57 sequences), `GOVERNORS`, Intent kinds `ARTEMIS_*`, docs | 362 | S + **P** |
| **R3** | Tarsis | **Shaï** | `src/server/services/seshat/tarsis/`, NSP event types, campaign-tracker, docs | 185 | S (+ P si event type persisté) |
| **R4** | Hunter | **Wepwawet** | sub-agent Argos/Seshat, refs docs | 26 | S |
| **R5** | Jehuty (+ Argos sub-domain) | **Notoria** (Jehuty replié) · **Per-Ankh** (ex-Argos sub-domain ; façade `apps/argos/` conservée) | `src/server/services/jehuty/` → merge `notoria/` ; `seshat/argos/` → `seshat/per-ankh/` ; ADR-0085 ; cascade refresh | 64 | S + **P** (cascade stop value) |
| **R6** | Yggdrasil | **l'Arbre (Ished)** + **la Sève** | docs gouvernance, ADR-0082, LEXICON, PANTHEON | 18 | S |
| **R7** | ZOMBIE | **LATENT** | `quick-intake/brand-level-evaluator.ts` (`BrandLevel`), `advertis-scorer`, prompts LLM, DIMENSIONS.md, ~85 fichiers | 85 | S + **P** (si palier caché) |
| **R8** | `financial-brain` | **`thot`** (dossier) | `src/server/services/financial-brain/` → `thot/`, imports | 50-80 | S |

> **Note R8.** Déjà planifié (closure-roadmap cible #19, Phase 25). Intégré ici pour cohérence : le Neter
> s'appelle déjà Thot ; seul le **dossier de service** porte encore `financial-brain`. Pur Classe S.

## I.R1 — Mestor → Sia

- **Sous-système :** Guidance (Mission). Dispatcher unique d'Intents (`mestor.emitIntent()` → `sia.emitIntent()`).
- **Classe S :** dossier `mestor/` → `sia/` ; `MestorService`/exports → `Sia*` ; type `Brain`/`Governor` valeur ; ~471 réfs docs/tests.
- **Classe P (critique) :**
  - `GOVERNORS` : ajouter `"SIA"` ; conserver `"MESTOR"` comme **alias lisible** (`GOVERNOR_ALIAS["MESTOR"]="SIA"`).
  - `IntentEmission.governor` : `@default` passe à `"SIA"` ; les lignes historiques `"MESTOR"` **restent**.
  - Intent kinds `MESTOR_*` : nouveaux émis en `SIA_*` ; dispatcher accepte les deux (table d'alias) durant la fenêtre.
- **Acceptation :** `neteru-coherence` vert ; agrégats Seshat (qui groupent par governor) normalisent via alias → aucun trou statistique ; chaîne historique vérifiable inchangée.

## I.R2 — Artemis → Neith

- **Sous-système :** Propulsion phase brief. Possède les **139 Glory tools** (`artemis/tools/`) et **57 sequences**.
- **Classe S :** dossier `artemis/` → `neith/` ; `artemis/tools/` → `neith/tools/` (la définition des Glory tools y vit) ; `artemis/commandant.ts` etc.
- **Classe P :** Intent kinds `ARTEMIS_*` → `NEITH_*` (alias) ; `governor "ARTEMIS"` → `"NEITH"` (alias). **Ne pas** renommer les `id` internes des 139 Glory tools s'ils sont référencés en base (manifests, `GloryToolForgeOutput`) sans alias — auditer `glory-tools-inventory.md` d'abord.
- **Risque :** plus grosse surface fonctionnelle (briefs + sequences + Oracle). Geler les chantiers Glory/Oracle pendant la PR (D-4).

## I.R3 — Tarsis → Shaï

- **Sous-composant de Seshat** (signaux faibles), pas un Neter. Dossier `seshat/tarsis/` → `seshat/shai/`.
- **Classe P à vérifier :** `NSP event-types` et `observationStatus` (Tarsis weak signals) — si un type d'événement persiste la chaîne `"tarsis"`, l'aliaser. Sinon pur Classe S.

## I.R4 — Hunter → Wepwawet

- **Sub-agent** d'Argos/Seshat (4 phases harvest/coerce/ingest/projection-decide). Faible surface (26 réfs), majoritairement docs + Phase 22 (planifiée).
- **Décision :** renommer **maintenant** (avant que Phase 22 Argos ne ship sous le mauvais nom). Pur Classe S à ce stade.

## I.R5 — Jehuty ⊃ Notoria · Argos → Per-Ankh

Décision la plus structurante du chantier A — c'est une **dissolution**, pas un simple renommage.

1. **Jehuty replié dans Notoria.** En code, `jehuty/` et `notoria/` coexistent. Cible v3.3 : Notoria à **deux étages** (amont : actualité de la marque ; aval : amendements ADVE scorés). **Fusionner** la fonction de `jehuty/` dans `notoria/` (étage amont), supprimer `jehuty/`.
   - **Classe P :** la cascade de refresh `Hunter→Seshat→Tarsis→Jehuty STOP` (ADR-0085) devient `Wepwawet→Seshat→Shaï→Notoria STOP`. Si le « stop point » est une valeur persistée/configurée, l'aliaser ; sinon Classe S. **ADR-0085 à amender** (slug + corps).
2. **Argos sub-domain → Per-Ankh.** Le sous-domaine Seshat `seshat/argos/` (bibliothèque/harvester) devient `seshat/per-ankh/`. La **façade publique** `apps/argos/` **garde le nom Argos** (sous-marque éditoriale, seul nom grec, exception assumée Blueprint §0.6). Bien distinguer : Per-Ankh = la bibliothèque interne ; Argos = la vitrine publique.
- **Dépendance Phase 22 :** comme Argos n'est pas encore shippé, cette PR **pré-établit** la convention pour que le port Phase 22 atterrisse en `per-ankh/`. Coordination obligatoire avec le vendor-notice Phase 22.

## I.R6 — Yggdrasil → l'Arbre (Ished) + la Sève

- Substrat **ungouverné** (ADR-0082). Faible surface (18 réfs, surtout docs/gouvernance).
- **Décision :** dissoudre en deux objets canoniques — **l'Arbre (Ished)** = image-monde (La Fusée entière / Brand Tree au niveau satellite) ; **la Sève** = substrat de circulation (7 racines). Pur Classe S (docs : ADR-0082, LEXICON entrée `YGGDRASIL`→`SEVE`, PANTHEON §7, APOGEE §4.2, CLAUDE.md).
- **Garde :** le test de suivi `yggdrasil-three-invariants.test.ts` (Phase 30-bis) devient `seve-three-invariants.test.ts`.

## I.R7 — ZOMBIE → LATENT (palier le plus bas)

- `BrandLevel = "ZOMBIE" | "FRAGILE" | … | "ICONE"` (`brand-level-evaluator.ts:19`).
- **Classe S :** type, constante `BRAND_LEVELS`, prompts, DIMENSIONS.md, ~85 réfs.
- **Classe P (à vérifier) :** établir si un palier `"ZOMBIE"` est **stocké** (snapshot de score, `recoTarget=BRANDLEVEL`, cache `completionLevel`) ou **dérivé à la volée** par `tier-evaluator.classify(score)`.
  - Si **dérivé** → pur Classe S (trivial).
  - Si **caché/stocké** → alias `"ZOMBIE"→"LATENT"` en lecture + backfill d'une colonne dérivée ; les prompts LLM acceptent les deux pendant la fenêtre (parseur tolérant).
- **Acceptation :** `pathToIcone` régénéré démarre à LATENT ; aucun palier orphelin.

## I.2 — Migration des identifiants persistés (machine à états Classe P)

```
   ÉTAT 0 — Avant
   IntentEmission.governor = "MESTOR" (écrit), intentKind = "ARTEMIS_*"

   ┌──────────────────────────────────────────────────────────────┐
   │ ÉTAPE A — Introduire l'alias (PR n, AVANT le codemod)         │
   │  GOVERNOR_ALIAS = { MESTOR:"SIA", ARTEMIS:"NEITH", ... }      │
   │  INTENT_KIND_ALIAS = { "ARTEMIS_X":"NEITH_X", ... }          │
   │  Tous les lecteurs/agrégats normalisent old→new.             │
   │  Aucune écriture changée. CI vert. (réversible)              │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ ÉTAPE B — Basculer l'écriture (PR du codemod symbole)         │
   │  @default("SIA") ; nouveaux Intents émis en "NEITH_*".       │
   │  Lignes historiques INCHANGÉES (INV-4 / Loi 1).              │
   │  Dispatcher résout new ∪ old via alias.                      │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ ÉTAPE C — Fenêtre de dépréciation (1 mois calendar-locked)    │
   │  Alias conservé `@deprecated-wire`. Métrique : part des      │
   │  lignes old vs new (décroît mécaniquement, jamais réécrite).  │
   └───────────────────────────┬──────────────────────────────────┘
                               ▼
   ÉTAT 1 — Stable. Alias gelé à vie (lecture seule de l'histoire).
   La hash-chain reste continue : chaque maillon hash le prevHash,
   pas le sens sémantique du governor. Aucune réécriture.
```

**Clause hash-chain (opposable).** La continuité de la chaîne ne dépend **pas** de la valeur lisible
du `governor`/`intentKind` : `selfHash = H(prevHash ‖ payload_tel_qu'écrit)`. Renommer en écriture
**future** n'altère aucun maillon passé. La vérification d'intégrité lit les valeurs **telles
qu'écrites**. Donc : aucune migration destructive, jamais.

## I.3 — Synchronisation des 7 sources de vérité

Toute PR de renommage d'un Neter **doit** toucher ces sept surfaces dans le même commit (sinon
`neteru-coherence.test.ts` casse — c'est voulu) :

| # | Source | Fichier |
|---|--------|---------|
| 1 | `BRAINS` const | `src/server/governance/manifest.ts` |
| 2 | `Governor`/`GOVERNORS` type | `src/domain/intent-progress.ts` |
| 3 | LEXICON entrée NETERU | `docs/governance/LEXICON.md` |
| 4 | APOGEE §4 mapping sous-systèmes | `docs/governance/APOGEE.md` |
| 5 | PANTHEON (récit complet) | `docs/governance/PANTHEON.md` |
| 6 | CLAUDE.md | `CLAUDE.md` |
| 7 | Anti-drift test | `tests/unit/governance/neteru-coherence.test.ts` |

Plus, hors « 7 sources » mais obligatoires : `STATE_FINAL_BLUEPRINT.md`, les **87 ADR**, `CODE-MAP.md`
(régénéré), `INTENT-CATALOG.md`, `SERVICE-MAP.md`, `ROUTER-MAP.md`, `PAGE-MAP.md`.

## I.4 — Gates anti-drift de la Renomination (à créer / muter)

| Test | Mode | Rôle |
|------|------|------|
| `neteru-coherence.test.ts` (muté) | HARD | les 7 sources nomment les 7 Neteru en v3.3 |
| `no-legacy-neter-symbol.test.ts` (neuf) | soft→HARD | interdit tout symbole Classe S `Mestor/Artemis/Tarsis/Jehuty/Hunter/Yggdrasil/ZOMBIE` hors alias annoté |
| `wire-alias-completeness.test.ts` (neuf) | HARD | tout `governor`/`intentKind` legacy a une entrée d'alias ; tout alias résout vers un nom v3.3 valide |
| `palier-latent.test.ts` (neuf) | HARD | `BRAND_LEVELS[0] === "LATENT"` ; aucun `"ZOMBIE"` émis en écriture |

## I.5 — Séquencement de la Renomination

```
W-A0  Alias persistés (Étape A) ──────────────┐  (réversible, CI vert, 0 codemod)
W-A1  R6 Yggdrasil→Arbre/Sève  (docs, faible) │  parallélisable
W-A1  R4 Hunter→Wepwawet       (docs, faible) │
W-A2  R7 ZOMBIE→LATENT         (vérifier P)   │
W-A3  R3 Tarsis→Shaï           (sous Seshat)  │
W-A4  R1 Mestor→Sia            (gros, P)      │  séquentiel (cœur dispatcher)
W-A5  R2 Artemis→Neith         (gros, P)      │  séquentiel (gel Glory/Oracle)
W-A6  R5 Jehuty⊃Notoria + Argos→Per-Ankh      │  séquentiel (dissolution + ADR-0085)
W-A7  R8 financial-brain→thot  (#19)          ┘
W-A8  Bascule gates soft→HARD + fenêtre de dépréciation close
```

---

# PARTIE II — LES ENTITÉS-SOCLE (prérequis structurels)

> Ces trois entités débloquent les 9 chapitres. Elles doivent exister **avant** la Partie III.

## E1 — `PilotingRegime` (le verrou transverse, friction F-1)

- **Trou comblé :** Livre de Bord II.C + `CAHIER_DES_CHARGES.md` Ch.1 §1.3 (F-1, prérequis bloquant à la vente sous EFR), Ch.3 (régime au décollage), Ch.8 (régimes par marque).
- **Constat :** **absent** de `prisma/schema.prisma` et de `src/` (confirmé audit).
- **Décision normative — modèle Prisma :**

```
PilotingRegime
  id, strategyId (scope marque), plan (enum: INTELLECTUEL|MATERIEL|OPERATIONNEL|COMMERCIAL|ANALYTIQUE)
  cran (enum 5 crans: MANUEL|ASSISTE|SUPERVISE|DELEGUE|AUTONOME)   # à caler sur Pont de commande A.1-A.4
  plancherSecurite (enum cran)   # plancher de sécurité par plan
  axeDestinataire (enum)          # à qui s'adresse la délégation
  setBy (operatorId), setAt
  @@unique([strategyId, plan])    # un régime courant par (marque × plan)

PilotingRegimeChange   # historique des crans (nourrit l'ICP du Ch.1)
  id, regimeId, fromCran, toCran, reason?, byOperatorId, at
```

- **Intent kinds (governor SIA) :** `SET_PILOTING_REGIME`, `OVERRIDE_REGIME_FLOOR`. Toute mutation via `sia.emitIntent()`.
- **Plancher dur (INV / Blueprint §5.6) :** le noyau ADVE ne se modifie **que** par `OPERATOR_AMEND_PILLAR`, quel que soit le cran affiché — gate `ADVE_FLOOR` qui refuse toute autonomie sur les piliers.
- **UI manual-first :** curseur 5 crans par plan dans le Cockpit (`/cockpit/...`) + lecture Console.
- **Tests :** `piloting-regime-floor.test.ts` (HARD — autonomie ne franchit jamais le plancher ADVE).
- **ADR à créer :** *ADR-0088 — PilotingRegime as first-class delegation entity*.

## E2 — `scoring-engine` 8 dimensions + `BrandMaturityScore` (ADR-0086)

- **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.1 (le constat d'échec lit le score /200 sur 8 dimensions). ADR-0086 déjà **Accepted** (impl Phase 24, cible #15, `NOT_STARTED`).
- **Décision :** créer `src/server/services/scoring-engine/` qui **agrège** les 8 dimensions canoniques (ADR-0086 §35) en un score /200 unique — pas un nouveau scorer, un **agrégateur** des signaux dispersés (`cult-index-engine`, `devotion-engine`, `pillar-readiness`, `sector-intelligence`, `campaign-tracker`).
- **Modèle :** `BrandMaturityScore { strategyId, total /200, dim1..dim8, computedAt, prevHash }` (historisé, hash-chaîné).
- **Intent (governor SESHAT) :** `RECOMPUTE_BRAND_SCORE`. **Gate (SIA) :** `PALIER_PROMOTION_PROOFS` — refuse `PROMOTE_*_TO_*` si le score cible n'atteint pas le seuil du palier visé (LATENT 0 · FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180, cf. cahier §1.2.1).
- **UI :** badge palier + score dans `/cockpit/insights/` ; leaderboard Console.
- **NB distinction :** l'actuel `advertis-scorer` produit 8 **sous-scores par pilier ADVERTIS** — ce **n'est pas** les 8 **dimensions de maturité** d'ADR-0086. Le `scoring-engine` les distingue explicitement.

## E3 — `seshat/zone-indices` + Thot formula engine (ADR-0087)

- **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.6 (pricing localisé). ADR-0087 **Accepted** (impl Phase 26, cible #18, `NOT_STARTED`). Doctrine : **aucune grille FCFA statique** — tout prix = formule Thot × indices Seshat per-zone.
- **Décision :** créer `src/server/services/seshat/zone-indices/` (7 familles : cost-of-living, TJM créatif, marketing budgets, mobile-money fees, taxes, forex, **zone-legal** §C2) + 6 calculators Thot manquants + service `ai-cost-tracker/`. Fallback `economicNeighbors` (voisin économique).
- **Garde :** `no-hardcoded-fcfa.test.ts` (HARD après baseline) — aucun littéral FCFA hors contextes d'exemple étiquetés.
- **Alimentation :** indices actualisés par **Wepwawet** (R4) ; fréquence de MAJ définie au Ch.6.

---

# PARTIE III — LES 9 CHAPITRES → IMPLÉMENTATION

> Chaque chapitre **implémente** la décision déjà tranchée dans `CAHIER_DES_CHARGES.md`. Ce cahier-ci
> n'en rejuge pas le fond ; il en spécifie la **surface code** (modèle · Intent · gate · service · UI ·
> test). Statut de départ = audit §4.

## C1 — 🔴 Doctrine d'échec & EFR  *(dépend de E1, E2)*

- **Départ :** ABSENT (entité). Briques : `advertis-scorer`, `value-report-generator`, hash-chain.
- **À bâtir :**
  - **Modèle `EFR`** : `{ strategyId, s0, palierVise, sStar, horizonH, seuilPartiel=50, frozenAt, prevHash }` (gelé + hash-chaîné à la signature, cahier §1.6).
  - **`ConstatAltitude`** : rapport généré à H (`{ sH, tau, etat: ATTEINT|PARTIEL|ECHEC, dims[8], icp, recours }`), variante du Value Report, hash-chaîné.
  - **ICP** (Indice de Co-Pilotage /100) : calculé depuis la trace + `PilotingRegimeChange` (E1) — 5 composantes pondérées (cahier §1.3.1). Nécessite E1, sinon l'ICP est replaidé (friction F-1).
  - **Intent kinds (SIA) :** `FREEZE_EFR`, `EMIT_CONSTAT_ALTITUDE`, `TRIGGER_EFR_RECOURS`.
  - **Gate :** la **strate ferme** (gates ADVE/RTIS, QC, hash-chain, SLA) engage l'Agence quel que soit l'ICP (cahier §1.4.3).
  - **UI :** clause EFR au Cockpit + Constat d'Altitude lisible.
- **Acceptation :** la matrice de recours (cahier §1.4.2) est exécutée **mécaniquement** par le couple (état × ICP), pas négociée.
- **ADR :** *ADR-0089 — EFR contract entity + Constat d'Altitude + ICP*.

## C2 — 🔴 Doctrine de données & souveraineté

- **Départ :** PARTIEL. `k-anonymity k≥5` existe (`campaign-tracker/agency-economics.ts`) mais pour les marges agence, pas le signal pool. `Operator.dataRegion` + `souverainete.ts` présents.
- **À bâtir :**
  - **Consentement signal pool** : entité `SignalPoolConsent { strategyId, optIn:false (défaut), grantedAt, revokedAt }` — **opt-in explicite** (cahier §2.3).
  - **k-anonymat du pool** : seuil k≥5 marques/secteur **avant** qu'un pattern n'entre (réutilise la mécanique existante, l'étend au pool cross-brand).
  - **Résidence par tier** + **plancher Brand Vault souverain** (cahier §2.1) ; carte des données livrable.
  - **zone-legal** : indices de conformité (frère des zone-indices E3) actualisés par Wepwawet.
  - **Effacement vs hash-chain** : PII **off-chain** effaçable ; chaîne ne stocke que des empreintes (cahier §2.4) — vérifier que `IntentEmission` ne porte aucune PII en clair.
  - **Gate :** `SIGNAL_POOL_GATE` (SIA) — refuse toute remontée sans opt-in + k≥5.
- **ADR :** *ADR-0090 — Cross-brand signal pool consent & data residency*.

## C3 — 🔴 Parcours d'activation (J0→J7)  *(dépend de E1)*

- **Départ :** ABSENT. Intent `BOOT` + mentions `ASSISTÉ`.
- **À bâtir :**
  - **Séquence canonique** Launchpad → premier Oracle → ignition → premier vol (cahier §3.1), jalons hash-chaînés non-sautables.
  - **« aha moment »** : restitution du noyau ADVE formulé **dans la session d'ignition** (J0), `time-to-aha < 1 session` (cahier §3.2) — métrique tracée.
  - **Régime par défaut = ASSISTÉ** (E1) sur tous les plans, plancher ADVE dur (cahier §3.3).
  - **Parcours J0→J7** à livrables garantis + **filet anti-abandon** (relances J2/J4/J6 tracées, nourrissent l'ICP) — modèle `ActivationJourney { strategyId, day, jalon, livrable, status }`.
  - **UI :** checklist « premier vol complet » (cahier §3.6).
- **ADR :** *ADR-0091 — First-run activation J0-J7*.

## C4 — 🔴 SLA & temps de cycle par livrable  *(dépend de C1)*

- **Départ :** PARTIEL. `sla-tracker/` existe (deadline/withinSla/operatorStats) pour le crew.
- **À bâtir :**
  - **Table SLA** par **livrable × tier × zone** (cahier §4.1) — config `SlaPolicy`, pas en dur.
  - Distinction **auto** (Glory tool/Sève, délai machine) vs **crew** (Hub-Escrow, délai humain).
  - **Barème de pénalités** + plafond, **cumulable** avec l'avoir EFR (cahier §1.4.4 / §4.3), imputé au même compte.
  - **SLA dégradé** sous charge (file, priorité par tier).
- **ADR :** *ADR-0092 — Per-deliverable SLA matrix & penalties*.

## C5 — 🔴 Cycle de vie de l'amendement ADVE  *(quasi-clos)*

- **Départ :** **IMPLÉMENTÉ** (le plus complet). `OPERATOR_AMEND_PILLAR` 3 modes, `staleAt`, `staleness-propagator/`, gate `PILLAR_COHERENCE`.
- **À durcir seulement :**
  - **Politique de re-forge par mode** (cahier §5) : cohabitation tracée par défaut ; re-forge sur décision opérateur ; seul `STRATEGIC_REWRITE` marque les assets ACTIVE `stale`.
  - **Qui paie la re-forge** (carburant Thot) — relier à C4/C1.
  - **Versioning** : l'asset porte la version du pilier engendreur (`AssetVersion` lineage) + notification founder.
- **Pas d'ADR neuf** — amender ADR-0023.

## C6 — 🟡 Pricing localisé : la formule  *(= E3)*

- **Départ :** PARTIEL→PLANIFIÉ. 16 calculators + mobile money + FCFA présents ; **zone-indices absents**.
- **À bâtir :** la **formule** prix = f(tier, zone, variables E3) + table pondérations + fallback `economicNeighbors` + 3 exemples chiffrés (Dakar/Libreville/Cotonou, cahier §6). **Couvert par E3** ; ce chapitre en est la face « produit ».

## C7 — 🟡 Opérations Console & KPIs Agence  *(dépend de C1)*

- **Départ :** PARTIEL. `financial-brain/actors/agency.ts`, portail Console.
- **À bâtir :**
  - **KPIs Agence** dédiés : MRR, rétention, churn, taux de montée de palier de la **flotte** — modèle `AgencyKpiSnapshot`.
  - **Méta-isomorphisme (décision de fond, cahier §7) :** trancher si l'Agence se pilote comme une marque (EFR + score propres). **Décision proposée : OUI** (méta-EFR), pour la cohérence doctrinale flotte-comme-mission.
  - **Structure Console** : ratio opérateurs/marques soutenable, rôles.
- **ADR :** *ADR-0093 — Agency meta-EFR & fleet KPIs*.

## C8 — 🟡 Onboarding brownfield & multi-marques  *(dépend de C3, E1)*

- **Départ :** multi-marques **OK** (Brand Tree, 9 `BrandNature`, `brand-node/`) ; **brownfield ABSENT** ; régimes par marque ABSENT (→ E1).
- **À bâtir :**
  - **Brownfield** : séquence d'import (assets, communauté, historique) reconnue par **Wepwawet**/**Per-Ankh** vs poussière vierge (LATENT pur) ; **palier d'entrée** > LATENT si masse existante (cahier §8).
  - **Bascule multi-marques** : contexte + **régimes distincts par marque** (E1) + vue portfolio.
- **ADR :** *ADR-0094 — Brownfield import & per-brand regime*.

## C9 — 🟡 PI des assets & contrat-type  *(dépend de C1, C2, C5)*

- **Départ :** ABSENT. `ContractStatus` enum + lignage `BrandAsset` présents.
- **À bâtir :**
  - **Matrice de PI** (type d'artefact × propriétaire × droits, cahier §9) : brief/asset forgé/asset re-généré Sentinel/rapport.
  - **Contrat-type** (cession, licence, durée, sortie) + **licence du signal pool** + **clause Sentinel/re-forge**.
- **ADR :** *ADR-0095 — Asset IP matrix & contract template*.

---

# PARTIE IV — SÉQUENCEMENT & VAGUES

## IV.1 — Graphe de dépendances

```
   Chantier A (Renomination) ── indépendant, FONDATION ── doit précéder tout nommage neuf
        │
   E1 PilotingRegime ──┬──► C1 EFR/ICP ──► C4 SLA ──┐
                       ├──► C3 Activation             ├──► C9 PI
   E2 scoring 8-dim ───┘                              │
   E3 zone-indices ───────► C6 Pricing                │
                                                       │
   C2 Données ───────────────────────────────────────┘
   C5 Amendement (durcissement, quasi-indépendant)
   C7 KPIs agence ◄── C1 (méta-EFR)
   C8 Brownfield ◄── C3 + E1
```

## IV.2 — Vagues

| Vague | Contenu | Effort | Verrou |
|-------|---------|--------|--------|
| **W0** | Chantier A étape A (alias persistés) + gates soft | S | aucun |
| **W1** | A : R6, R4, R7, R3 (faible surface) | M | — |
| **W2** | A : R1 Sia, R2 Neith (cœur, gel Glory/Oracle) | L | INV-5 |
| **W3** | A : R5 (Jehuty⊃Notoria, Argos→Per-Ankh), R8 thot/ | M | coord. Phase 22 |
| **W4** | E1 PilotingRegime + E2 scoring-engine | L | — |
| **W5** | E3 zone-indices + C6 pricing | XL | — |
| **W6** | C1 EFR/ICP + C4 SLA + C3 activation | XL | E1,E2 |
| **W7** | C2 données + C7 KPIs + C8 brownfield + C9 PI + C5 durcissement | XL | C1,C2 |
| **W8** | Bascule tous gates soft→HARD + clôture fenêtres dépréciation + DoD | M | — |

## IV.3 — Mapping closure-roadmap (décision D-5)

La refonte **ne crée pas de ledger parallèle**. Elle ouvre/relie des cibles :

| Cible | Titre | Couvre |
|-------|-------|--------|
| #15 (existante) | Score 8-dim | **E2** |
| #18 (existante) | Architecture économique runtime | **E3 + C6** |
| #19 (existante) | `financial-brain→thot` + manipulation | **R8** |
| **#20 (neuve)** | Grande Renomination v3.3 (R1-R7) | **Chantier A** |
| **#21 (neuve)** | PilotingRegime | **E1** |
| **#22 (neuve)** | EFR/ICP/Constat + SLA + Activation | **C1, C3, C4** |
| **#23 (neuve)** | Données & souveraineté + PI | **C2, C9** |
| **#24 (neuve)** | KPIs agence/méta-EFR + Brownfield | **C7, C8** |

> Chaque cible neuve exige un ADR (§V.2) avant dev, conformément à la règle « ledger closed-set ».

## IV.4 — Estimation

Effort total ≈ **3 × XL + 4 × L + 3 × M** (ordre de grandeur : plusieurs mois à un dev senior + revue
gouvernance). Chantier A seul ≈ L (mécanique mais transverse). La valeur de déblocage commerciale la
plus haute : **E1 → C1** (rend l'EFR vendable, friction F-1 levée).

---

# PARTIE V — GOUVERNANCE DE LA REFONTE

## V.1 — Refactor Code of Conduct

- Chaque PR porte un label `refonte/W0`…`refonte/W8` ou `out-of-scope` (justifié).
- **Gel partiel** des surfaces touchées par la vague active (ex. W2 gèle Glory/Oracle).
- **Zéro nouveau bypass** : toute mutation neuve traverse `sia.emitIntent()`.
- **Zéro dossier dupliqué** numéroté (`* 2/`).
- Une PR par terme (A) / par entité (B) / par chapitre (C).

## V.2 — ADRs à créer

| ADR | Sujet |
|-----|-------|
| 0088 | PilotingRegime |
| 0089 | EFR + Constat d'Altitude + ICP |
| 0090 | Signal pool consent & data residency |
| 0091 | Activation J0-J7 |
| 0092 | SLA matrix & penalties |
| 0093 | Agency meta-EFR & fleet KPIs |
| 0094 | Brownfield import & per-brand regime |
| 0095 | Asset IP matrix & contract template |
| (amendements) | 0082 (Yggdrasil→Sève), 0085 (cascade STOP Jehuty→Notoria), 0023 (re-forge par mode) |

## V.3 — Tests anti-drift à créer / muter

| Test | Mode cible | Garde |
|------|-----------|-------|
| `neteru-coherence` (muté) | HARD | 7 sources en v3.3 |
| `no-legacy-neter-symbol` | HARD | zéro symbole Classe S legacy |
| `wire-alias-completeness` | HARD | alias persistés complets & valides |
| `palier-latent` | HARD | palier bas = LATENT |
| `piloting-regime-floor` | HARD | autonomie ne franchit jamais le plancher ADVE |
| `palier-promotion-proofs` | HARD | promotion exige score ≥ seuil |
| `signal-pool-gate` | HARD | pas de remontée sans opt-in + k≥5 |
| `no-hardcoded-fcfa` | HARD | pas de grille FCFA statique |
| `efr-recourse-mechanical` | HARD | recours = f(état × ICP), pas négocié |

## V.4 — Stratégie de rollback

- **Classe S :** chaque PR de codemod est un commit atomique réversible (`git revert`).
- **Classe P :** l'alias (Étape A) est **toujours** mergé avant la bascule d'écriture (Étape B) ; revert d'une PR de bascule = retour à l'écriture old, alias toujours lisible → **aucune donnée perdue**. La fenêtre de dépréciation (Étape C) n'est close qu'après stabilité prouvée.
- **Loi 1 garantit** qu'aucun revert ne peut corrompre l'historique (rien n'est jamais réécrit).

## V.5 — Definition of Done (par vague)

Une vague est `DONE` quand : typecheck + lint + `madge --circular` propres · suite gouvernance verte ·
les gates de la vague en mode HARD · CODE-MAP régénéré · les 7 sources synchronisées · `closure-roadmap`
mise à jour · `RESIDUAL-DEBT` mise à jour.

---

# ANNEXE A — Matrice de propagation (renommage d'un Neter)

| Surface | Action | Classe |
|---------|--------|--------|
| `src/server/services/<neter>/` | rename dossier + exports | S |
| `BRAINS` / `GOVERNORS` / `Governor` | ajouter nom v3.3, alias old | S + P |
| `IntentEmission.governor` (col) | `@default` v3.3, alias lecture | **P** |
| Intent kinds `<NETER>_*` | nouveaux en v3.3, alias dispatcher | **P** |
| Glory tools / sequences ids | auditer persistance avant rename | S/P |
| `LEXICON / APOGEE / PANTHEON / CLAUDE / STATE_FINAL_BLUEPRINT` | réécrire | S |
| 87 ADR + maps (CODE/SERVICE/ROUTER/PAGE/INTENT) | réécrire + régénérer | S |
| `neteru-coherence.test.ts` | muter (même PR) | S |

# ANNEXE B — Inventaire des identifiants persistés (Classe P) à aliaser

- `IntentEmission.governor` : `MESTOR→SIA`, `ARTEMIS→NEITH` (SESHAT/THOT/PTAH/IMHOTEP/ANUBIS inchangés).
- `IntentEmission.intentKind` : préfixes `MESTOR_*→SIA_*`, `ARTEMIS_*→NEITH_*` (auditer aussi `ANUBIS_*` etc. = inchangés).
- Cascade refresh « STOP » : `Jehuty→Notoria` (si valeur persistée/configurée).
- Palier : `ZOMBIE→LATENT` **si** stocké (sinon dérivé, Classe S).
- Glory tool `id` / sequence `key` : **à auditer** (`glory-tools-inventory.md`, `GloryToolForgeOutput`) avant tout rename — possibles Classe P.

# ANNEXE C — Points de friction remontés (non patchés)

- **F-A → E1 avant C1.** L'ICP n'est calculable qu'avec `PilotingRegime` + trace explicite (recommandation suivie/ignorée, crans, refus d'amendement motivé/muet). Bloquant à la vente sous EFR. *(repris du `CAHIER_DES_CHARGES.md` F-1.)*
- **F-B → audit persistance Glory/sequence ids.** Avant R2 (Artemis→Neith), confirmer si les 139 `id` / 57 `key` sont persistés ; sinon risque de casser `GloryToolForgeOutput`/manifests.
- **F-C → coordination Phase 22.** R5 (Argos→Per-Ankh) doit atterrir **avant** le port Argos Phase 22 pour éviter de bâtir sous le mauvais nom. Trigger Phase 22 = demande explicite d'Alexandre.
- **F-D → décision méta-EFR (C7).** Trancher OUI/NON le méta-isomorphisme avant de modéliser les KPIs Agence.

---

*Cahier des charges — Refonte d'alignement Code ↔ Blueprint v3.3. La Fusée d'UPgraders. De la poussière à l'étoile.*
