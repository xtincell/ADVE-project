# ADR-0060 — LLM as UI orchestrator (manual-first parity invariant)

> **Note de renumérotation (2026-05-06)** : ce document a été créé sous le numéro ADR-0053 sur la branche Phase 18 (`claude/pensive-keller-6afb14`) puis renuméroté **ADR-0060** lors du merge avec Phase 19 (collision préfixe avec `0053-coherence-llm-evaluator.md` Phase 19). Cf. [ADR-0059 §note](0059-brand-tree-multi-archetype.md) pour le contexte de renumérotation des 4 ADRs jumeaux.

**Status** : Accepted
**Date** : 2026-05-06
**Phase** : 18 — Matanga × FrieslandCampina × Brand Tree
**Supersedes** : aucun
**Related** : [ADR-0048](0048-glory-tools-as-primary-api-surface.md) (Glory tools as primary API surface), [ADR-0049](0049-brief-mandatory-gate.md) (brief mandatory gate), [ADR-0059](0059-brand-tree-multi-archetype.md) (Brand Tree dépend de cet invariant), [ADR-0062](0062-morning-brief-batch-validation.md) (Morning Brief Batch est l'application directe), [NEFER.md §1.1](../NEFER.md) (doctrine LLM)

---

## Contexte

À mesure que l'OS intègre des fonctionnalités LLM-augmented (Glory tools, Anubis MCP, Morning Brief Batch, Tarsis weak signals, etc.), un risque architectural émerge : **les fonctions accessibles uniquement via LLM**. Symptômes observés ou anticipés :

1. Un Glory tool écrit en DB via un service backend qui n'expose pas d'endpoint tRPC manuellement appelable. Si le LLM merde ou est down, l'opérateur n'a pas d'alternative.
2. Une feature ne crée son entrée que via un flow LLM (paste + extract + materialize). L'opérateur ne peut pas saisir cette entrée à la main.
3. Le LLM bypass `mestor.emitIntent()` et écrit directement en DB pour "gagner du temps" — ce qui contourne l'audit trail, les pre-conditions, les gates Thot fuel, et la cascade gouvernance APOGEE.
4. Une page UI affiche les outputs LLM en read-only sans permettre l'édition manuelle des champs extraits par le LLM.

Ces symptômes constituent une dérive critique : **le LLM devient un point de défaillance unique** et **un raccourci pour contourner la gouvernance**. Cette dérive n'est pas hypothétique — elle est observée dans nombre d'OS LLM-first du marché.

L'utilisateur (opérateur Matanga, founder La Fusée) a explicitement formulé l'exigence anti-drift, citation directe :

> "pour l'actualisation des taches, il doit y avoir un portail intermediaire pour validation humaine. et tout doit pouvoir etre fait manuellement. le llm ne fait qu'utiliser/automatiser des fonctions existantes et exposé niveau ui."

→ Cette posture devient un **invariant architectural transverse à tout l'OS**, pas seulement à la Phase 18. Elle est déclarée ici dans un ADR pour qu'elle soit citable, testable, et propagable à toute future feature LLM.

---

## Décision

### §1 — Énoncé canonique de l'invariant

> **Invariant Manual-first parity** : Toute fonctionnalité LLM-augmented exposée dans l'OS DOIT avoir une UI manuelle équivalente avec parité fonctionnelle complète. Le LLM ne contourne jamais l'UI ; il **orchestre les mêmes endpoints** qu'un opérateur humain appelle.

**Conséquences obligatoires** :

1. **Tout Intent kind appelé par un Glory tool LLM** est aussi exposé en route tRPC publique consommable depuis une UI manuelle. Sans exception.
2. **Tout résultat LLM** est un `*Draft` en staging qui passe par les **mêmes endpoints de matérialisation** qu'une saisie manuelle. Le LLM ne shortcut pas cette étape.
3. **Aucun service LLM ne peut écrire en DB directement.** Il doit obligatoirement passer par `mestor.emitIntent()`. Un Glory tool LLM qui écrit via Prisma raw est un drift à corriger immédiatement.
4. **Tout output LLM affiché en UI** est éditable champ par champ par l'opérateur avant matérialisation — pas un read-only opaque.
5. **Le LLM est un caller de fonctions UI**, pas un producteur de fonctions cachées.

### §2 — Architecture en 3 couches

```
┌──────────────────────────────────────────────────────────────────┐
│ Couche 1 — UI manuelle (form, table, button, drag-drop)          │
│   ↓ tRPC route publique                                           │
│ Couche 2 — Endpoint tRPC (Mestor governedProcedure)              │
│   ↓ mestor.emitIntent()                                           │
│ Couche 3 — Handler service métier                                 │
│   ↓ Prisma write                                                  │
│                                                                    │
│ ▲                                                                  │
│ │ Le LLM (Glory tool, Morning Brief Batch, Tarsis) APPELLE        │
│ │ la couche 1 via UI Draft → couche 2 via Intent → couche 3.      │
│ │ Il NE SHORTCUT JAMAIS vers la couche 3.                         │
└──────────────────────────────────────────────────────────────────┘
```

### §3 — Pattern Preview / Validate / Confirm (middle portal)

Toute mutation issue d'un input externe non-trusted (mail, slack, fichier uploadé, OAuth pull externe) traverse un **portail de validation humaine** avant matérialisation :

```
Input externe (mail, slack, fichier, etc.)
  ↓
[Glory tool LLM] extracte et propose → crée *Draft staging table
  ↓
[Middle portal UI] affiche le draft, permet édition manuelle de chaque champ
  ↓
[Opérateur valide] → bouton Confirm appelle l'endpoint tRPC standard
  ↓
[Endpoint tRPC] mestor.emitIntent(<MUTATION>)
  ↓
[Handler] matérialise (= mêmes lignes de code que si saisie manuelle directe)
```

**État `*Draft.state`** : `PENDING_REVIEW | ACCEPTED | REJECTED | EDITED | MATERIALIZED`. Auto-confirm threshold désactivé par défaut Phase 1 (humain valide chaque draft). Phase 2 fine-tune éventuel après ≥30 jours d'observation qualité.

### §4 — Tests anti-drift CI obligatoires

| Test | Vérifie |
|---|---|
| `tests/unit/governance/llm-no-bypass.test.ts` | Aucun service LLM (Glory tools, brief-ingest, brief-reconciler, Tarsis) n'appelle Prisma `create/update/delete/upsert` directement. Toute mutation passe par `mestor.emitIntent()`. AST scan. |
| `tests/unit/governance/manual-ui-parity.test.ts` | Pour chaque Intent kind référencé dans un Glory tool LLM, présence d'une route tRPC publique correspondante dans `ROUTER-MAP.md` + dans `src/server/trpc/routers/*.ts` |
| `tests/unit/governance/draft-validation-required.test.ts` | Aucun endpoint `confirm*Batch` ne saute le check `*Draft.state === "ACCEPTED" || "EDITED"`. Refus systématique des drafts en `PENDING_REVIEW`. |
| `tests/unit/governance/llm-output-editable.test.ts` | Toute UI qui affiche un output LLM (`<MorningIntakePreview />`, `<TarsisSignalReview />`, etc.) expose les champs en mode `editable: true` (vérifie via prop convention) |

### §5 — Lint rule `lafusee/llm-orchestrates-only`

Nouvelle règle ESLint custom dans [eslint-plugin-lafusee/](../../../eslint-plugin-lafusee/) à ajouter post-merge :

```typescript
// Règle : interdire les imports Prisma direct dans src/server/services/{glory-tools,brief-ingest,brief-reconciler,tarsis,morning-batch}/**
// Sauf si le fichier exporte UNIQUEMENT des helpers de READ (pas de mutation).
// Détection : import { prisma } from "@/server/db" + appel .create/.update/.delete/.upsert/.deleteMany/.updateMany détecté → erreur.
```

### §6 — Application immédiate Phase 18

**Phase 18-A0** (Brand Tree) — chaque Intent kind `OPERATOR_*_BRAND_NODE` ([ADR-0059 §4](0059-brand-tree-multi-archetype.md)) est exposé en route tRPC `brandNode.create/update/move/delete/attachStrategy/tagRole`. UI manuelle `<BrandNodeForm />` accessible depuis :
- `/cockpit/portfolio/[corporateSlug]` bouton `[+ Ajouter regional/cluster/gamme/SKU]`
- `/launchpad/portfolio-bulk-import` (alternative à l'XLSX upload)
- `/console/operate/africa-portfolio` (édition inline depuis dashboard)

**Phase 18-A1** (Morning Brief Batch — cf. [ADR-0062](0062-morning-brief-batch-validation.md)) — chaque `BriefIngestionDraft` traverse le middle portal `/console/operate/morning-intake` avant matérialisation. Fonctions accessibles manuellement :
- Saisir un brief sans utiliser le LLM (`<BriefIngestionDraftForm />` standalone)
- Éditer chaque champ extrait par le LLM (résumé, nodePath, classification, urgency)
- Override manuel du `classification` (NEW/UPDATE/NON_BRIEF/OPS_ACTION/AMBIGUOUS)
- Override manuel du `resolvedNodePath` via tree-picker UI

**Phase 18 noyau** (héritage piliers + RAG arborescent) — la résolution `resolveEffectivePillars()` peut être inspectée via UI `/cockpit/brand/proposition/[nodeId]/inheritance-trace` qui affiche pour chaque champ ADVE/RTIS la chaîne d'héritage + bouton "Override localement" qui appelle l'endpoint `OPERATOR_AMEND_PILLAR` standard.

### §7 — Exception encadrée : automatisation pure (cron, scheduler, webhooks)

Cas où il n'y a **pas d'opérateur humain** dans la boucle (cron job de scoring nocturne, webhook ad-network qui pousse des events Anubis, scheduler de digest matinal) — l'invariant Manual-first ne s'applique pas littéralement. Mais **l'exigence d'auditabilité reste** :
- Le cron/webhook appelle obligatoirement `mestor.emitIntent()` (jamais Prisma raw)
- L'opérateur peut TOUJOURS replay/re-trigger manuellement le même Intent depuis une UI dédiée (`/console/governance/intent-replay`)
- L'output produit par le cron est navigable et éditable post-hoc via l'UI standard (cas où le scoring produit un score manuel-correctible)

→ "Manual-first" = tout ce que le système fait automatiquement, l'humain peut le refaire ou le corriger via UI.

### §8 — Quand le LLM peut court-circuiter le middle portal (Phase 2 fine-tune)

Après ≥30 jours d'utilisation production avec validation humaine systématique :
- **Confidence threshold configurable** (cf. [ADR-0062 §11](0062-morning-brief-batch-validation.md)) : `BriefIngestionDraft.confidence > 0.92` peut auto-confirmer
- **Audit trail conservé** : chaque draft auto-confirmé est tracé `state: "AUTO_MATERIALIZED"` + opérateur peut TOUJOURS rollback dans les 24h
- **Toggle global per-Operator** : opt-in explicite via UI `/console/settings/llm-automation`. Désactivé par défaut.

L'auto-confirm n'est **pas** une violation de Manual-first : c'est l'opérateur qui a explicitement délégué cette décision après preuve de qualité ; et il peut désactiver le toggle à tout moment.

---

## Conséquences

### Bénéfices

1. **Zéro point de défaillance unique LLM** : si l'API Anthropic est down, si le Glory tool merde, si l'extraction LLM est mauvaise → l'opérateur a TOUJOURS la voie manuelle disponible. L'OS reste utilisable.
2. **Audit trail complet** : tout passe par Mestor `emitIntent` → IntentEmission row → hash-chain Loi 1 APOGEE. Aucun écrit DB sans trace.
3. **Compliance / RGPD friendly** : chaque mutation est attribuable à un opérateur humain (validation explicite) ou à un automatisme tracé (cron). Pas de "le LLM a fait ça tout seul".
4. **Erreurs LLM corrigibles** : le middle portal rend les erreurs visibles AVANT matérialisation. Pas de propagation de junk en DB.
5. **UX cohérente** : le founder qui n'utilise pas le LLM (par choix ou par circonstance) a la même expérience que celui qui l'utilise — juste plus de saisie.
6. **Onboarding développeur** : un dev qui découvre l'OS apprend les UIs manuelles comme contrat ; les Glory tools LLM sont une couche additionnelle qui appelle ces UIs. Pas de courbe d'apprentissage parallèle.

### Coûts

- **Effort dev majoré** : ~1.5x vs LLM-first (chaque feature LLM exige son équivalent UI manuel). Justifié par la robustesse.
- **Surface UI plus large** : plus de forms, plus de pages, plus de validations. Compensé par réutilisation systématique de composants `<*Form />` génériques.
- **Discipline architecturale stricte** : la lint rule `lafusee/llm-orchestrates-only` peut bloquer des PRs en cours de dev. Mitigation : doc claire sur le pattern + exemples.

### Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Un dev oublie l'invariant et écrit un Glory tool qui bypass | Élevé sans automation | Drift gouvernance | Lint rule + test CI obligatoires (§4-5). Bloque la PR. |
| L'UI manuelle devient obsolète vs LLM (LLM mis à jour, UI pas) | Moyen | Friction opérateur | Test `manual-ui-parity.test.ts` vérifie qu'aucun Intent appelé par LLM n'est sans route tRPC. Failure CI si nouvelle Intent ajoutée sans route. |
| Effort 1.5x ralentit le delivery | Moyen | Roadmap slip | Compensé par la robustesse à long terme. Phase initiale lente, accélération via réutilisation composants. |
| Auto-confirm Phase 2 réintroduit du drift | Faible | Régression Manual-first | Toggle opt-in explicite + audit trail + rollback 24h + désactivable per-Operator. |

---

## Sources de vérité à propager

- [ ] `CHANGELOG.md` v6.18.15 entry mentionne ADR-0060
- [ ] `REFONTE-PLAN.md` Phase 18 mentionne invariant
- [ ] `CLAUDE.md` §Trois interdits absolus de NEFER → ajouter "4. **Bypass UI manuelle via LLM** — toute feature LLM doit avoir parité fonctionnelle avec une UI manuelle"
- [ ] `NEFER.md` §3 trois interdits → étendre à 4 interdits (LLM bypass UI = drift)
- [ ] Lint rule `lafusee/llm-orchestrates-only` à ajouter dans `eslint-plugin-lafusee/`
- [ ] Tests anti-drift CI à shipper (cf. §4)
- [ ] LEXICON entry "Manual-first parity"

---

**Invariant transverse à toutes les phases futures. À citer dans tout ADR ajoutant une feature LLM-augmented.**
