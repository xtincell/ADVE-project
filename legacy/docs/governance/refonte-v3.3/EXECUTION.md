# EXÉCUTION — Revamp intégral par flotte d'agents

> **Couche opérationnelle de la refonte v3.3.** Ce document découpe le revamp en **work packages
> (WP) exécutables chacun par une session d'agent autonome**, avec dépendances, gates de sortie et
> doctrine anti-collision — de sorte qu'une flotte d'agents termine le chantier **sans jamais casser
> `main`**. Mandat : carte blanche opérateur 2026-07-01 ([ADR-0121](../adr/0121-refonte-v33-fleet-execution.md)).
>
> **Hiérarchie des sources** : [00-CADRE.md](00-CADRE.md) + fichiers-chantiers = **la spec opposable**
> (rien ici ne la ré-écrit) · [closure-roadmap.md](../../../_bmad-output/planning-artifacts/closure-roadmap.md) =
> ledger des cibles · [STATUS.md](STATUS.md) = état vivant des WP · [FLEET-PROTOCOL.md](FLEET-PROTOCOL.md) =
> doctrine par session · [WP-PROMPTS.md](WP-PROMPTS.md) = prompts prêts à coller.

---

## 0. Baseline vérité terrain (2026-07-01, commit `f8b4378`)

| Mesure | Valeur |
|---|---|
| Version | v6.27.75 (CHANGELOG) · ADRs 0001-0120 · 2 343 tests annoncés verts |
| Fichiers test | 209 `*.test.ts` dont 83 sous `tests/unit/governance/` |
| Prisma | 202 models · 57 migrations · generator `prisma-client-js` + adapter-pg |
| Surface v3.3 | ≈ 370-440 fichiers `src/` touchés par le Chantier A (ANNEXE-B) |
| Branche big-bang | `refonte/alignement-v3.3` — **n'existe pas encore** |
| Cibles #20-24 | ouvertes 2026-07-01 par ce programme (ratification = review de la PR porteuse) |
| CI connue rouge | Golden Path E2E (workflow path-filtré, pré-existant) · check externe « Workers Builds: advertisproject » (app Cloudflare côté GitHub, aucun workflow repo — désactivation = action opérateur dashboard Cloudflare) |
| Vérifs locales session | voir §0.1 — consignées à la création du programme |

### 0.1 Snapshot vérification locale

Consigné par la session fondatrice (environnement cloud, sans DB) : `npm ci` OK ·
`prisma generate` OK (note : le download d'engines via Node échoue derrière un proxy TLS-intercepté ;
contournement = `curl` du `schema-engine.gz` vers `node_modules/@prisma/engines/` — utile aux
sessions cloud futures) · typecheck / lint / suite governance / madge : résultats en
[STATUS.md §Baseline](STATUS.md). Toute session WP re-vérifie **avant** de commencer (protocole §2).

---

## 1. Les trois flux du revamp

| Flux | Quoi | Où | Règle CI |
|---|---|---|---|
| **A — Big-bang v3.3** | Les 20 chantiers R1-R8 · E1-E3 · C1-C9 (spec = ce répertoire) | branche longue `refonte/alignement-v3.3`, sous-branches par WP, PRs **vers la branche refonte**, un seul merge final vers `main` (L4) | CI branche **informative** L0→L3, **verte exigée** L4 (D-1/B-3) |
| **B — Dette main-flow** | Dette vivante indépendante du renommage (RESIDUAL-DEBT, heal-report, plans) | PRs normales vers `main` | verte **toujours** (main jamais rouge) |
| **C — Décisions opérateur** | Questions non-inférables (needsHuman) qui gatent des WP | ledger §5 + PR bodies | n/a |

Le flux B est autorisé par D-4 (« `main` reste ouvert au flux normal ») ; la doctrine
anti-collision (§6) évite qu'il sabote le merge L4.

---

## 2. Carte des dépendances (flux A)

```
WP-A0 (L0 socle branche + alias + gates soft)
  └─► L1 — renames, SÉRIE stricte : A1(R1 Sia XL) ─► A2(R2 Neith XL) ─► A3(R3 Shaï) ─► A4(R5 Notoria/Per-Ankh)
                                    ─► A5(R7 LATENT) ─► A6(R8 thot/)
        (parallélisables à tout moment de L1 : A7(R4 Wepwawet, docs) · A8(R6 Sève/Ished, docs))
  └─► L2 — socle, SÉRIE : A9(E1 PilotingRegime) ─► A10(E2 scoring 8-dim, exige R7) ─► A11(E3 zone-indices, exige R8)
  └─► L3 — chapitres, 3 vagues :
        vague 1 (après L2) : A12(C1 EFR, exige E1+E2) ∥ A13(C2 souveraineté) ∥ A14(C3 activation, exige E1)
        vague 2            : A15(C4 SLA, après C1) ∥ A16(C5 amendement, après C1+C4) ∥ A17(C6 pricing, après E3)
        vague 3            : A18(C7 KPIs agence, après C1+E2) ∥ A19(C8 brownfield, après C3+E1+E2) ∥ A20(C9 PI, après C1+C2+C5)
  └─► WP-A21 (L4 stabilisation : gates soft→HARD, sync 7 sources, DoD §0.11, PR de merge vers main — review opérateur)
```

Rythme conseillé : **rebase de la branche refonte sur `main` à chaque frontière de lot** (L0→L1,
L1→L2…), en re-exécutant les codemods (§6.2) puis en réparant le résidu.

---

## 3. Catalogue WP — flux A

Format : chaque WP renvoie à **sa spec** (le fichier-chantier fait foi) ; le bloc ci-dessous n'est
que l'enveloppe d'exécution. Gates de sortie communs à tout WP flux A : voir
[FLEET-PROTOCOL.md §3](FLEET-PROTOCOL.md).

### WP-A0 — L0 · Socle de branche + alias Classe P + gates soft
- **Spec** : [ANNEXE-A-alias-maps.md](ANNEXE-A-alias-maps.md) + [ANNEXE-C-adr-tests.md](ANNEXE-C-adr-tests.md) + [00-CADRE.md §0.6/0.8](00-CADRE.md) · **Taille M** · Branche : crée `refonte/alignement-v3.3` depuis `main`, travaille sur `refonte/L0-socle`.
- **Livrables** : (1) `src/domain/wire-aliases.ts` — 3 maps (`GOVERNOR_ALIAS`, `INTENT_KIND_ALIAS`, `PALIER_ALIAS`) + tables inverses + helpers `normalizeGovernor/IntentKind/Palier` ; (2) câblage des sites de lecture (agrégats governor, lecteurs Seshat, comparaisons `intentKind`, consommateurs NSP `brandLevel`) ; (3) tests `wire-alias-completeness` (HARD) + `no-orphan-wire-read` + `no-legacy-neter-symbol` (soft) ; (4) audits préalables : **F-B** (persistance des 139 `id` Glory / 57 `key` sequence — bloque R2 si positif), **F-A1** (`"ZOMBIE"` figé dans snapshots/context-store), **F-PTAH** (0 `governor:"PTAH"` — investiguer, hors renommage) ; (5) `commitlint` : ajouter scopes `sia/neith/shai/notoria` (garder les anciens jusqu'à L4).
- **⚠️ Renumérotation ADR** : l'ANNEXE-C réserve 0088-0095 mais ces numéros sont **occupés** depuis (repo à 0120). Règle : numéro réel = **premier libre à la création** (first-come, précédent Phase 18) ; consigner la correspondance dans l'en-tête d'ANNEXE-C à chaque création.

### L1 — La Grande Renomination (série stricte pour A1→A6)
| WP | Chantier | Spec | Taille | Surface | Classe P | Notes d'exécution |
|---|---|---|---|---|---|---|
| **A1** | R1 Mestor→Sia | [R1](R1-mestor-sia.md) | XL | 141 src + 20 tests + routes | governor (75 kinds) | codemod + sweep front `api.mestor.*` même PR (F-R1) |
| **A2** | R2 Artemis→Neith | [R2](R2-artemis-neith.md) | XL | 96 src + 26 tests + 10 sections console | governor (16 kinds) | garde R2.3 : **ne jamais renommer** les `id` Glory / `key` sequence ; geler chantiers Glory/Oracle pendant L1 (F-R2) |
| **A3** | R3 Tarsis→Shaï | [R3](R3-tarsis-shai.md) | M | 54 src | à confirmer (source `"tarsis"` sérialisée ?) | maj scope commitlint (F-R3) |
| **A4** | R5 Jehuty⊂Notoria · Argos→Per-Ankh | [R5](R5-jehuty-notoria-argos-perankh.md) | M | 17 src + fusion service | 2 Intent kinds | **fusion non mécanique** (F-R5a) — tests des 2 étages ; amender ADR-0085 |
| **A5** | R7 ZOMBIE→LATENT | [R7](R7-zombie-latent.md) | M | 41 src + 7 tests | payload NSP + 2 kinds | parseur LLM tolérant ; **obligatoirement avant E2** (F-R7b) |
| **A6** | R8 financial-brain→thot/ | [R8](R8-financial-brain-thot.md) | M | 21 src | néant | chirurgical : **ne pas toucher** `financial-engine/` ni `financial-reconciliation/` (R8.2) ; ferme la cible #19 |
| **A7** | R4 Hunter→Wepwawet | [R4](R4-hunter-wepwawet.md) | S | 0 src / 8 docs | néant | vendor gelé (3 interdits VENDOR-NOTICE) ; parallélisable |
| **A8** | R6 Yggdrasil→Arbre(Ished)+Sève | [R6](R6-yggdrasil-arbre-seve.md) | S | 0 src / docs+ADR | néant | renomme aussi `yggdrasil-three-invariants.test.ts` → `seve-…` ; parallélisable |

### L2 — Entités-socle (série)
| WP | Chantier | Spec | Taille | Dépend | Notes d'exécution |
|---|---|---|---|---|---|
| **A9** | E1 PilotingRegime | [E1](E1-piloting-regime.md) | L | A1 (gate sous `sia/gates/`) | labels des 5 crans = **DEC-2** : shipper en draft `INFERRED`, flip opérateur ensuite (doctrine needsHuman) ; débloque C1/C3/C8 |
| **A10** | E2 scoring-engine 8-dim | [E2](E2-scoring-engine-8dim.md) | L | A5 (enum Palier naît LATENT) | producteurs partiels → `INSUFFICIENT_DATA`, jamais fabriquer (F-E2a) ; ferme la cible #15 |
| **A11** | E3 zone-indices + Thot formula | [E3](E3-zone-indices.md) | XL | A6, A10 | feeds live dépendent R3/R4 + DEC-5 → façades `DEFERRED_AWAITING_CREDENTIALS` honnêtes ; ferme la cible #18 (avec C6) |

### L3 — Chapitres (3 vagues parallèles)
| WP | Chantier | Spec | Taille | Dépend | Cible |
|---|---|---|---|---|---|
| **A12** | C1 EFR + Constat + ICP | [C1](C1-efr-echec-icp.md) | XL | A9+A10 (+instrumentation F-C1a) | #22 |
| **A13** | C2 données & souveraineté | [C2](C2-donnees-souverainete.md) | L | A0 (corrige d'abord `dataRegion` défaut — DEC-9) | #23 |
| **A14** | C3 activation J0→J7 | [C3](C3-activation-j0-j7.md) | L | A9 | #22 |
| **A15** | C4 SLA par livrable | [C4](C4-sla.md) | M | A12 (plafonds combinés) | #22 |
| **A16** | C5 amendement ADVE durci | [C5](C5-amendement-adve.md) | M | A12+A15 (coût/carburant) ; amende ADR-0023 | #22 |
| **A17** | C6 pricing localisé | [C6](C6-pricing-localise.md) | S | A11 (extension d'E3, **ne pas réimplémenter**) | #18 |
| **A18** | C7 KPIs agence + méta-EFR | [C7](C7-console-kpis-agence.md) | M | A12+A10 | #24 |
| **A19** | C8 brownfield multi-marques | [C8](C8-brownfield-multi-marques.md) | L | A14+A9+A10 (+A7/A4 pour reconnaissance) ; M&A = hors scope (trigger #10) | #24 |
| **A20** | C9 PI & contrat-type | [C9](C9-pi-contrat-type.md) | M | A12+A13+A16 | #23 |

### WP-A21 — L4 · Stabilisation + merge
- **Spec** : [00-CADRE.md §0.8-0.11](00-CADRE.md) · **Taille L** · un seul agent + review opérateur.
- Gates soft→**HARD** (les 13 d'ANNEXE-C §C.3) · rebase final sur `main` + re-run codemods ·
  `CODE-MAP` régénéré · **7 sources de vérité** en v3.3 (dont CLAUDE.md — la refresh complète du
  CLAUDE.md se fait ICI, pas avant : éviter le double travail) · bascule commitlint scopes ·
  RESIDUAL-DEBT + closure-roadmap (cibles #15/#18/#19/#20-24 → SHIPPED) · DoD §0.11 cochée →
  **PR de merge vers `main`**, review NEFER/Alexandre obligatoire.

---

## 4. Catalogue WP — flux B (main-flow, PRs normales)

Chacun = PR(s) courte(s) sur `main`, tous les gates verts, entrée CHANGELOG + scope-drift si
`out-of-scope`. Fenêtres anti-collision : §6.3.

| WP | Quoi | Source | Taille | Fenêtre |
|---|---|---|---|---|
| **B1** | **Réconciliation des ledgers** : closure-roadmap vs réalité (cible #3 probablement couverte par LOT 1c #313-317 — vérifier puis re-statuer ; contradiction cible « WONT_DO router migration » ↔ [legacy-mutation-promotion-plan.md](../legacy-mutation-promotion-plan.md) → DEC-6 ; cible #6 calendar-locked expirée) + refresh CLAUDE.md « Phase status » 0104-0120 (léger — la version v3.3 arrive en L4) | audit 2026-07-01 | S | tout de suite |
| **B2** | Phase 17 closure (cible #6) : 21 sequences + 24 wrappers DRAFT→STABLE + quality gate soft→hard (échéances 05/17 et 06/04 dépassées) | RESIDUAL-DEBT §17 | S-M | libre |
| **B3** | Oracle : câbler `markSectionsStale` au chokepoint pillar-gateway + tRPC `oracle.forgetSection` + affordance reset (CRITICAL heal sonde #1) | [heal-report](../heal-report-2026-06-30.md) | M | libre |
| **B4** | Ptah forge : branche `composeDeliverable` DISPATCHED (sortir du PREVIEW-only) + DAG `BRAND_IDENTITY_BOARD` (P0 sonde #2) | heal-report | L | **avant A1 ou après A21** (surface Artemis/Ptah = zone renommée) |
| **B5** | Notification stack production (cible #2) : deps web-push/firebase-admin/mjml + NSP Redis pubsub + digest cron + rate-limit MCP | closure-roadmap #2 | M | libre (surface anubis/nsp peu renommée) |
| **B6** | DS : migration 243 couleurs brutes → tokens + flip `DESIGN_STRICT=1` (sonde #4) | heal-report | M | libre, rebase-aware |
| **B7** | Hygiène residus-audit : 43 `json-parse-no-try` (try/catch+fallback) puis 190 `console-log-prod` → error-vault | [RESIDUS-AUDIT](../RESIDUS-AUDIT.md) | S×2 | libre |
| **B8** | Sécurité LLM LOTs 3/4 : harnais sandbox Wakanda + harnais adverse (injection/malformé/SSRF/PII) | [llm-hardening-plan](../llm-hardening-plan.md) | M | libre |
| **B9** | Fix bug intake `completionLevel` (reconcile cache post-write) + stepper Notoria guidance | RESIDUAL-DEBT v6.1.18 | S | libre |
| **B10** | CI vérité : statuer Golden Path E2E (workflow path-filtré — le réparer ou le documenter) + retirer le check Cloudflare « Workers Builds » orphelin (action dashboard opérateur) + brancher a11y Playwright Story 7.8 (axe-dep + baselines) | audit CI 2026-07-01 | S-M | tout de suite |

Dette **explicitement non planifiée ici** (business/trigger-gated, ledger flux C) : promotions
PRODUCTION Phase 23 (DEC-3), résidus Phase 18 (formulaire), connecteurs credential-gated (DEC-5),
i18n 6 phases (DEC-7), Phase 22 Argos (DEC-4), M&A Phase 18-bis (trigger).

---

## 5. Ledger décisions — flux C (opérateur uniquement)

Une décision = une question ciblée. Un WP gated ne **bloque pas** la flotte : il livre en draft
`INFERRED` quand la doctrine needsHuman le permet, sinon il reste PENDING.

| DEC | Question | Gate sur | Défaut proposé (INFERRED) |
|---|---|---|---|
| **DEC-1** | Ratifier l'ouverture des cibles #20-24 (faite par la PR porteuse de ce programme) | — | oui (mandat carte blanche) |
| **DEC-2** | Labels exacts des 5 crans `RegimeCran` + axes (Pont de commande, hors repo — F-E1) | A9 (migration enum) | `MANUEL/ASSISTE/SUPERVISE/DELEGUE/AUTONOME` |
| **DEC-3** | Sign-off seuils calibration (ROC AUC ≥ 0.7 · RMSE ≤ 0.3) → promotions PRODUCTION Phase 23 + flips MISSION §9 | hors flotte | — |
| **DEC-4** | Trigger port Argos/Per-Ankh (Phase 22) — coordonner avec A4/A7 (F-R5b) | cible #12 | non déclenché |
| **DEC-5** | Hébergement souverain + sources réelles des indices (F-infra, F-E3a, F-C2a) + credentials connecteurs (CRM/Tarsis/ads/embeddings) | feeds live A11/A13, B5 | façades `DEFERRED_AWAITING_CREDENTIALS` |
| **DEC-6** | Trancher : promotion des 314 mutations legacy ([plan](../legacy-mutation-promotion-plan.md)) vs `WONT_DO` du closure-roadmap | B1 | suivre le plan (plus récent) |
| **DEC-7** | Déclencher le plan i18n contenu (6 phases, validé 2026-06-13) | — | non déclenché |
| **DEC-8** | Résidus Phase 18 via `/console/governance/phase-18-residuals` (N5-bis, N6-bis, N9, N10) | cible #4 | formulaire au fil de l'eau |
| **DEC-9** | Valeur défaut `Operator.dataRegion` (zone africaine de référence, C2.1) | A13 | à proposer dans l'ADR de C2 |

---

## 6. Doctrine anti-collision (« sans rien casser »)

### 6.1 Blast radius
- `main` n'est **jamais** la cible d'un WP flux A (sauf la PR L4 unique). Toute PR flux A cible
  `refonte/alignement-v3.3`. Une PR flux A ouverte contre `main` = erreur, fermer sans merger.
- Un WP = une sous-branche = une PR = un claim de fichiers **déclaré dans STATUS.md avant de coder**.
  Deux claims qui se chevauchent → le second attend ou négocie un découpage (jamais deux WP sur les
  mêmes fichiers en parallèle).

### 6.2 Codemod-first (clef du big-bang rebasable)
Tout rename L1 est livré comme **script idempotent** sous `scripts/refonte-v33/`
(`codemod-r1-sia.ts`, …), committé AVEC son sweep. Un rebase de la branche refonte se fait alors :
`git rebase main` → re-run des codemods → correction du résidu → gates. C'est ce qui rend le
big-bang compatible avec un `main` vivant (D-4) sans conflit-enfer.

### 6.3 Fenêtres du flux B
Les WP B qui touchent les zones renommées (services `mestor/artemis/jehuty/tarsis/financial-brain`,
routes associées) s'exécutent **avant le début de L1 ou après le merge L4** (B4 notamment). Les
autres sont libres. En cas de doute : regarder le claim dans STATUS.md + ANNEXE-B (surface par terme).

### 6.4 Rouges attendus de branche
La CI de la branche refonte peut être rouge L1→L3 (B-3), mais chaque WP :
1. n'introduit **aucun rouge non listé** — tout test attendu-rouge est consigné dans
   [STATUS.md §Rouges-attendus](STATUS.md) avec le WP qui le résorbera ;
2. laisse typecheck + madge **verts** (eux ne sont jamais négociables, même en L1) ;
3. re-vert ce qu'il peut avant handoff.

### 6.5 Données et migrations
- Migrations Prisma **additives** (`prisma migrate dev`, jamais `db push`) ; aucune migration
  destructive sans sign-off opérateur explicite.
- INV-4 absolu : zéro `UPDATE` rétroactif des lignes hash-chaînées ; les valeurs legacy vivent via
  `wire-aliases` (WP-A0). Re-index autorisé **seulement** en recompute non destructif (F-R7a).
- Jamais combler un trou en inventant des données : `EmptyState` / flag `_mocked` /
  `DEFERRED_AWAITING_CREDENTIALS` + registre (doctrine PROPAGATION-MAP).

---

## 7. Correspondance cibles closure-roadmap

| Cible | Couverte par | Statut à l'ouverture |
|---|---|---|
| #15 (Phase 24) | WP-A10 (E2) | NOT_STARTED |
| #18 (Phase 26) | WP-A11 + WP-A17 (E3+C6) | NOT_STARTED |
| #19 (Phase 25) | WP-A6 (R8) | NOT_STARTED |
| **#20** | WP-A1..A5, A7, A8 (Chantier A R1-R7) | NOT_STARTED |
| **#21** | WP-A9 (E1) | NOT_STARTED |
| **#22** | WP-A12+A14+A15 (+A16 rattaché) | NOT_STARTED |
| **#23** | WP-A13+A20 (C2+C9) | NOT_STARTED |
| **#24** | WP-A18+A19 (C7+C8) | NOT_STARTED |
| #2, #3, #6 | WP-B5, B1, B2 | voir ledger |

Clôture du programme = DoD du 00-CADRE §0.10-0.11 **+** flux B soldé **+** ledger C sans question
ouverte bloquante. À ce point, le critère « aligné » est atteint et la closure-roadmap reflète l'état.

---

*EXECUTION.md — créé 2026-07-01 (session fondatrice du programme, ADR-0121). Mis à jour par tout WP qui change la structure (pas l'état — l'état vit dans STATUS.md).*
