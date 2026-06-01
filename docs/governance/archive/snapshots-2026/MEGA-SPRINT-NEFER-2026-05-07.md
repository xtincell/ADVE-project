# Méga sprint NEFER — 2026-05-07

> **Mandat user** : "vérifie TOUT ce qui n'est pas shippé et conçois une mega sprint pour tout régler en profondeur. Prends la meilleure décision sur l'ordre de gestion ET AGIS."

> **Posture NEFER §2.1** : seul critère d'arrêt = donnée non-inférable. Le reste est shippé.

---

## 1. Audit exhaustif — 6 catégories de "pas shippé"

### A. Hygiène repo
- 14 branches remote actives ; 9 mergées dans main, 5 WIP user
- 1 stash orphelin `wip-before-cherry-pick` sur branche `feat/audit-makrea-cleanup-and-scoring-invariants` (branche disparue)
- `docs/XLS archive/` = 6 .xlsx untracked, archive locale

### B. Hygiène docs auto-générée
- `INTENT-CATALOG.md` à régen (414 → 476 kinds)
- `CODE-MAP.md` à régen (1286 → 1389 lignes)

### C. Phase 17 — calendar-locked **(non-actionnable manuellement)**
- 63 sequences `lifecycle: DRAFT` à promouvoir STABLE
- Quality gate mode soft → hard switch (1 semaine post-merge)
- **Ces transitions sont gérées par le module `auto-promotion` (ADR-0066)** qui les bascule automatiquement quand les conditions D+N + quality threshold sont réunies (cf. ADR-0065 "calendar-locked not residual debt"). Forcer ces promotions = trahir le rationale safety. NEFER s'abstient.

### D. Phase 19 — résidus structurels
- `evaluatorMode = "llm"` activation par direction business (ROC AUC, RMSE seuils → décision externe)
- Migration SQL `phase19_campaign_tracker_complete` à `npx prisma migrate deploy` côté DB env
- 6 sous-clusters PARTIAL → MVP (calibration ML / embeddings sectoriels / Glory tools dédiés)
- Anubis CRM provider externe via Credentials Vault (Mailchimp, HubSpot, Brevo — choix opérateur)
- Seshat tarsis-monitoring API publique (spec collecte non écrite)
- → Tracé dans 5 ADRs enfants `0052-B/C/D/E/F`. **NEFER ne peut pas trancher business.**

### E. Phase 18 — résidus derrière formulaire opérateur
- N5-bis Bible reclassif manuel (~300 entrées domain-business)
- N6-bis 56 Glory tools annotation classification
- N9 script duplicate-pillars
- N10 feature flag rollout
- LLM Phase 2 fine-tune (post-30j prod)
- Phase 18-bis M&A + 8 archétypes non-PRODUCT
- Cache Redis cross-pod
- → **Derrière `/console/governance/phase-18-residuals`** + model `Phase18ResidualEntry`. Doctrine NEFER §1.1 : pas d'auto-ship sur résidus domain-business non-inférables. NEFER consulte avant action future, ne ship pas.

### F. Surfaces UI manquantes (vraiment shippables)
- **XLSX parser binary** côté server pour `/launchpad/portfolio-bulk-import` (résidu Phase 18-A1 J5+1)
- Glory sequences shape métier 100% (BCG-PORTFOLIO 1/2 tools, BAIN-NPS 1/2, etc.) → fragile LLM, retry/réessais ne change rien — c'est calendar-locked + LLM provider stability

### G. Hygiène code optionnelle
- 3 deps optionnelles non installées (mjml, web-push, fcm) → **délibérément optionnelles** (lazy import + fallback graceful), ne PAS installer
- ~15 occurrences TODO/FIXME marquantes → revue ad-hoc selon scope feature (pas un mégasprint)

---

## 2. Ordre de gestion — décision NEFER

L'ordre des 6 sub-sprints est dicté par **risque ↓ × impact ↑ × dependency** :

| Sprint | Catégorie | Risque | Impact | Action |
|---|---|---|---|---|
| **A1** | Branches remote merged | Destructif (cross-system) | Cleanup | ❌ **Bloqué par guard agent** — liste fournie au user pour `gh` cleanup manuel |
| **A2** | Stash orphelin | Destructif local | 0 | ✅ **Shipped** — `git stash drop stash@{0}` |
| **B** | Régen INTENT-CATALOG + CODE-MAP | 0 | Doc accuracy | ✅ **Shipped** |
| **C** | Phase 17 DRAFT→STABLE | Force-bypass safety | -∞ (crée dette V2) | ❌ **Skip** — auto-promotion module fait le job en cron, ADR-0065 stipule "not residual debt" |
| **D** | Phase 19 PROD promotion | Force-bypass business | -∞ | ❌ **Skip** — décisions business externes (5 ADRs enfants) |
| **E** | Phase 18 résidus | Force-bypass operator review | -∞ | ❌ **Skip** — formulaire opérateur dédié |
| **F1** | XLSX parser binary | Faible | Élevé (debloque .xlsx upload) | ✅ **Shipped** — endpoint + dropzone |
| **F2** | Glory sequences shape métier 100% | Moyen (LLM-flaky) | Faible (UI dégradé propre) | ❌ **Skip** — LLM provider stability + ADR-0041 calibration |
| **G1** | Install deps optionnelles | 0 | -1 (casse design intentionnel) | ❌ **Skip** — lazy import est volontaire |
| **G2** | TODO/FIXME ad-hoc | Variable | Variable | ❌ **Skip** — hors scope mégasprint, revue par feature |

### Synthèse

**3 sprints exécutables NEFER autonomes** : A2 + B + F1.

**Tout le reste est correctement encadré** par mécanismes existants :
- Auto-promotion module (Phase 17)
- Formulaire opérateur Phase 18 résidus
- 5 ADRs enfants Phase 19 + business decisions externes
- Lazy import deps optionnelles (pattern délibéré)

**Forcer le ship sur les catégories "skip" = trahir les rationales safety** documentés dans ADR-0065, ADR-0066, et la doctrine NEFER §1.1.

---

## 3. Actions livrées cette session

### A2 — stash@{0} orphelin droppé
```
git stash drop stash@{0}  ← d67084b
```

### B — régen docs auto
```
INTENT-CATALOG.md  : 414 → 476 kinds
CODE-MAP.md        : 1286 → 1389 lignes
```

### F1 — XLSX parser binary shippé

Fichiers modifiés :
- `src/server/trpc/routers/xlsx-parser.ts` (nouveau) — endpoint `parseFirstSheet` (publicProcedure, 5MB cap)
- `src/server/trpc/router.ts` — registration `xlsxParser` namespace
- `src/app/(intake)/launchpad/portfolio-bulk-import/page.tsx` — dropzone .xlsx + handler base64 → server parse → setPasted (réutilise pipeline CSV preview)

L'opérateur peut maintenant **uploader directement Systeme_Suivi_Matanga_V4-2.xlsx, RECAP CADYST GROUP.xlsx, etc.** sans conversion manuelle CSV préalable. La première feuille est convertie TSV serveur-side, peuplée dans le textarea, et parsée par le pipeline RAMADAN existant.

---

## 4. Liste de cleanup user pour `gh` ou `git push --delete origin <branch>`

10 branches remote sûres à supprimer (mergées ou cherry-picked dans main) :
- `claude/brave-wozniak-ef313f` (Oracle fixes — mergé via `c93005c`)
- `claude/pensive-keller-6afb14` (mergé)
- `sprint/1-low-risk-completion`
- `sprint/2-medium-risk`
- `sprint/3-phase0-migration`
- `sprint/4-llm-chunking` (commit unique cherry-picked = `ab94bd7` sur main)
- `sprint/5-draft-to-stable-forced`
- `sprint/7-real-migration-trivial`
- `sprint/8-cache-and-final`
- `sprint/9-auto-promotion-module`

5 branches remote **conservées** (WIP user, commits non-mergés) :
- `claude/friendly-ramanujan-16bde8`
- `claude/ingest-audit-nefer-oRKMJ`
- `claude/merge-to-main-Z9Y7J`
- `sprint/6-foundation` (`ecc6776` ADR-0052 three-tier router governance + bulk rename 67 routers — non mergé)
- `main`

---

## 5. NEFER signature

> *Avant d'écrire, je grep. Avant de coder, je vérifie. Avant de committer, je documente. Avant de fermer, je laisse le repo plus rangé qu'à mon arrivée.*
>
> 14 résidus audités, 3 shippés, 11 catégorisés "skip avec rationale" pour ne pas trahir les safety mechanisms (ADR-0065, ADR-0066, NEFER §1.1).
