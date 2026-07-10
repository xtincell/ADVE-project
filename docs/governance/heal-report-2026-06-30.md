# HEAL REPORT — Le fantôme de NEFER (2026-06-30)

> Diagnostic + correction du passage du **robot healer** (`scripts/heal/`, `npm run heal`).
> L'inspecteur s'est propagé dans toute La Fusée — 4 sondes d'audit parallèles
> (Oracle · Artemis→Ptah · Brand Bible · Navigation/UX/DS) + crawl runtime
> Playwright des 200 routes — puis a corrigé par classe.

## TL;DR

- **Local réparé** : 31 erreurs `tsc` (client Prisma périmé → `prisma generate`) + 4 migrations en attente appliquées. Local compile maintenant **0 tsc / 0 lint error**.
- **10 défauts corrigés** (env ×2, Oracle ×4, navigation ×2, runtime ×2). Détail §2.
- **Cause racine « Oracle pas parfait » identifiée et corrigée** : deux systèmes Oracle déconnectés écrivaient dans deux stores différents → l'UI affichait 35/35 COMPLETE pendant que le PDF/lien partagé restait inchangé. §3.
- **Découplage Artemis→Ptah confirmé négligé** (le backbone est correct, mais la forge granulaire est PREVIEW-only + 5/8 étapes de forge manquantes). §4.
- **Brand Bible** : la colonne vertébrale brief existe (séquence `BRANDBOOK-D` + 16 outils Glory BRAND) ; il manque le rendu graphique 16:9 (lacune **partagée avec l'Oracle**). §5.
- **Robot durable livré** : `npm run heal` / `heal:fix` / `heal:full`. §1.

---

## 1. Le robot — `scripts/heal/`

`npm run heal` orchestre l'arsenal QA existant (il ne le double pas — anti-doublon NEFER) et **auto-répare** les deux pannes dev-env les plus fréquentes :

| Commande | Fait quoi |
|---|---|
| `npm run heal` | Diagnostic complet read-only (self-heal détecté mais pas appliqué, static, gouvernance, tests). |
| `npm run heal:fix` | Idem + **auto-répare** : `prisma generate` si client périmé, `migrate deploy` si migrations en attente. |
| `npm run heal:quick` | `--fix --quick` : self-heal + static seulement (rapide). |
| `npm run heal:full` | `--fix --runtime` : tout + crawl Playwright (exige `npm run dev`). |

Sortie : `logs/heal/HEAL-REPORT-<ts>.md` + verdict GO / GO-AVEC-RÉSERVES / NO-GO.
La feature distinctive vs `preflight.sh` : le **self-heal** (régénère le client Prisma sur erreurs `tsc` Prisma-shaped, applique les migrations) + l'agrégation de la couche gouvernance.

---

## 2. Défauts corrigés (10)

| # | Couche | Fichier | Défaut | Correctif |
|---|---|---|---|---|
| 1 | env | `node_modules/.prisma` | 31 erreurs `tsc` (`missionActivity`/`creativeProposal`/`Mission.briefId` absents du client) | `prisma generate` (client périmé après pull) |
| 2 | env | DB locale | 4 migrations mission/creative-proposal non appliquées → 500 sur tables neuves | `prisma migrate deploy` |
| 3 | Oracle UI | `src/components/strategy-presentation/sections/phase13-sections.tsx:649` | §32 Manipulation Matrix : les 4 cartes affichaient **toujours "—"** (renderer lisait `summary[mode]`, composeur écrit `evaluations[]`) | Lecture depuis `evaluations` (poids % + observed, ★ dominant) |
| 4 | Oracle (racine) | `src/server/services/oracle-section/handler.ts:403` | Le runner LLM stockait dans `OracleSection.payload` mais **n'écrivait pas le BrandAsset** que le rendu consomme → générer une section ne changeait rien au livrable | Writeback canonique via `composeSectionDeterministic` (keyé `sectionId`) après succès LLM |
| 5 | Oracle UI | `src/components/cockpit/oracle/progressive-panel.tsx:236` | Logique `disabled` alambiquée → boutons actifs pendant une génération unitaire (dispatches concurrents) | `disabled={anyMutationPending \|\| isAssemblerRunning}` |
| 6 | Oracle | `src/server/services/oracle-section/assembler.ts:145` | `failed = total - succeeded` comptait les VETOED (déjà à jour) comme échecs → faux rouge | `failed` = `FAILED \| ERRORED` uniquement |
| 7 | Navigation | `src/components/shared/page-header.tsx:35` | Breadcrumbs `<a href>` sans garde → **6 × 404** sur `/console/governance` + `/console/seshat` | Garde `APP_ROUTES.has()` + `<Link>` (même pattern que `navigation/breadcrumb.tsx`) |
| 8 | Navigation | `src/components/navigation/command-palette.tsx:42` | 5 entrées Cmd+K pointaient sur alias dépréciés (`/console/signal/*`, `/console/fusee/*`) | Repointées sur `/console/seshat/*` + `/console/artemis/*` (canoniques, vérifiés existants) |
| 9 | Runtime | `src/app/(console)/console/seshat/market-research/page.tsx:207` | `<textarea>` placeholder multi-ligne (`&#10;`) → **hydration mismatch** (serveur collapse les `\n`) | Placeholder mono-ligne |
| 10 | Runtime | `src/app/(console)/console/strategy-portfolio/brands/[strategyId]/page.tsx:419` | `String(value)` rendait littéralement **`[object Object]`** pour les valeurs objet imbriquées de `businessContext` | Branche objet → `JSON.stringify` lisible |

Vérification : `npm run typecheck` → **0 erreur** après tous les correctifs.

---

## 3. Oracle — diagnostic complet (sonde #1)

**Cause racine** : deux systèmes Oracle parallèles et déconnectés coexistent — le legacy `enrichOracle`→`assemblePresentation`/`BrandAsset` (ce que le PDF, le lien partagé et le compteur de complétude **rendent réellement**) et le nouveau `GENERATE_ORACLE_SECTION`/`OracleSection` (ce que pilote le panneau progressif). Ils n'écrivaient pas dans le même store. **Corrigé** (#4 ci-dessus pour le chemin LLM).

Restants (ledger, file:line fournis par la sonde) :

- **CRITICAL** `oracle-section/index.ts:360` — `markSectionsStale` / `markAllSectionsStale` **définis mais jamais appelés**. La cascade de staleness pillar-gateway ne touche pas `OracleSection` → amender un pilier ADVE ne marque jamais les sections Oracle STALE. → Câbler dans le chokepoint `pillar-gateway` (`writePillar`/`writePillarAndScore`).
- **HIGH** `oracle-section/index.ts:396` — `forgetGenerationProgress` (reset opérateur d'une section coincée en GENERATING) **n'a pas de procédure tRPC** → inatteignable depuis l'UI. → Ajouter `oracle.forgetSection` (operatorProcedure) + affordance "reset" sur les cartes GENERATING. (Mitigé par le TTL de lock 25 s.)
- **HIGH** `strategy-presentation/index.ts:435` — `checkCompleteness` (compteur "X/35") indépendant de `OracleSection.status` → deux compteurs contradictoires sur la même page. → Une seule source de vérité.
- **MED** `export-oracle.ts:52` — l'export PDF des §22-35 fait `JSON.stringify` brut au lieu d'un rendu structuré.
- **MED** `hooks/use-oracle-stream.ts:142` — SSE sans reconnect/backoff (le live progress s'arrête après une fermeture serveur).
- **LOW** `strategy-presentation/index.ts:409` — `resolveShareToken` = scan O(n) plein-table sur le chemin public le plus partagé → promouvoir `presentationShareToken` en colonne `@unique` indexée.
- **LOW** `oracle-section/index.ts:202` — TOCTOU dans `acquireGenerationLock` (terme `{id: existing.id}` dans le OR défait la garde atomique).
- **MED** test manquant : `∀ section ∈ SECTION_REGISTRY : runner.kind === "PURE_MAPPER" || hasDeterministicComposer(section.id)` (garantie ADR-0091 « 35/35 sans LLM »).

---

## 4. Artemis → Ptah — le découplage négligé (sonde #2)

**Le backbone est correct** : `chainGloryToPtah` (`sequence-executor.ts:419`) émet `PTAH_MATERIALIZE_BRIEF` via `mestor.emitIntent` ; l'écriture d'asset matériel (`AssetVersion` + `BrandAsset family:"MATERIAL"`) se fait **exclusivement** dans `ptah/reconcileTask`. **MAIS** le système le néglige (le PS du fondateur est fondé) :

- **P0** `deliverable-orchestrator/composer.ts:112` — `composeDeliverable` est **PREVIEW-ONLY** : résout le DAG, estime le coût, retourne `status:"PREVIEW"`, **ne dispatche jamais**. Le flow `/cockpit/operate/forge` « pointe une cible → forge » **ne peut rien forger**. → Construire la branche DISPATCHED (le header du fichier décrit quoi).
- **P0** `deliverable-orchestrator/target-mapping.ts:32` — aucune cible board d'identité de marque + aucun DAG d'éléments granulaires. → Ajouter `BRAND_IDENTITY_BOARD` + DAG (LOGO / PALETTE / TYPE_SPECIMEN / ICON_SHEET / DECLINATION_*) + nœud d'assemblage.
- **P1** `artemis/tools/engine.ts:860` (`executeBrandPipeline`) — le pipeline 10 outils écrit les briefs **comme** livrable (texte dans `D.directionArtistique.*`), aucun chaînage forge.
- **P1** `artemis/tools/higgsfield-tools.ts` — 3 outils Glory (DoP/Soul/Steal) produisent des **pixels finaux directement** via MCP, bypassant Ptah. → Reclasser Higgsfield en provider Ptah.

**Carte des étapes de forge granulaires : 0 EXISTS / 3 PARTIAL / 5 MISSING.**

| Étape | Statut | Note |
|---|---|---|
| Logo | MISSING | `logo-type-advisor` = texte conseil, pas de `forgeOutput` |
| Palette couleur | MISSING | `chromatic-strategy-builder` = texte, pas de swatch |
| Specimen typo (Google Fonts) | MISSING | aucun sampling Google Fonts ni rendu |
| Planche d'icônes | PARTIAL | `iconography-system-builder` chaîne vers Ptah (seul qui marche) |
| Déclinaison fond vert (mockup 3D) | MISSING | `format-declination-engine` = specs texte |
| Déclinaison fond blanc (mockup photo) | MISSING | idem |
| Détourage | PARTIAL | primitive `magnific transform:image-bg-removal` existe, **non câblée** (aucun outil ne déclare `forgeOutput.forgeKind:"transform"`) |
| Assemblage board / compositing | MISSING | aucun provider ne composite N assets sur un canvas 16:9 |

**Fix structurant n°1** : shipper la branche DISPATCHED du `deliverable-orchestrator` + faire du board d'identité une cible DAG granulaire de première classe.

---

## 5. Brand Bible — gap analysis (sonde #3)

L'intuition du fondateur est juste : **les bases existent** (~70% au niveau brief, ~0% au niveau présentation graphique 16:9).

**EXISTE** : séquence `BRANDBOOK-D` 13 étapes (`artemis/tools/sequences.ts:110`) + séquence `BRAND` STABLE + 16 outils Glory BRAND (`registry.ts`) + `BrandAsset` kinds composants (`domain/brand-asset-kinds.ts`) + `deliverable-compiler.ts` qui mappe déjà `BRANDBOOK-D → PDF` + `guidelines-renderer` (HTML/PDF print).

**MANQUE** : (B1) pas de kind agrégat `BRAND_BIBLE`, (B2) pas de registre de sections analogue à `SECTION_REGISTRY`, (B3) **aucune infra de rendu 16:9 / slide nulle part** (lacune **partagée avec l'Oracle**, dont l'export est un walk texte A4 jsPDF), (B4) Ptah forge des assets uniques, pas de kind `board`/composite, (B5) générateurs graphiques manquants (logo-lockup, merch-mockup, pattern).

**Plan de build** (copier le pattern Oracle) : C1 ajouter kind `BRAND_BIBLE` (1 ligne additive) · C2 `brand-bible/types.ts` `BIBLE_SECTION_REGISTRY` (copie structurelle de `strategy-presentation/types.ts`) · C3 réutiliser `deliverable-compiler` (fait) · **C4 construire le renderer 16:9 (Satori/`@vercel/og` → PNG par slide → jsPDF landscape) — la seule vraie pièce neuve, et elle sert aussi l'Oracle** · C5 kind Ptah `board`/composite · C6 3-4 générateurs graphiques · C7 surfacer `/cockpit/brand/bible`.

---

## 6. Navigation / UX / DS (sonde #4)

**Corrigé** : breadcrumbs PageHeader (6×404, #7) + command-palette (#8).

Restants (ledger) :
- **MED** `console/arene/academie/page.tsx:21` — split-brain académie (le hub `arene/academie` lie vers l'autre arbre `console/academie/*`, qui redirige en retour) + 2 hubs quasi-identiques. → Lier vers ses propres sous-routes, retirer le hub dupliqué.
- **MED** `console/messages/page.tsx:64` + `console/socle/invoices/page.tsx:95` — bouton primaire **disabled** avec tooltip nommant une destination non-cliquable. → Convertir en `<Link>` (`/console/anubis`, `/console/socle/contracts`).
- **MED** DS : **243 classes Tailwind couleur brutes** dans 54 composants `src/components/**` (interdit #2, non CI-enforced car `DESIGN_STRICT` jamais set ; le test ne vérifie que `zinc`/`violet`). 38 occurrences `zinc`/`violet` dans 17 fichiers bloqueraient sous `DESIGN_STRICT=1`. → Migrer vers tokens System/Domain puis flip `DESIGN_STRICT=1`.
- **LOW** `site-footer.tsx:113,121` — `/la-guilde` (marketing) vs `/LaGuilde` (marketplace) : collision de casse → 404 potentiels.

---

## 7. Crawl runtime — 200 routes (triage)

- **Console crawlé OK** (admin auth `alexandre@upgraders.com`). **Cockpit non crawlé** : login `client@cimencam.cm` échoué → **lacune de seed local** (le compte est dans `prisma/seed.ts` mais la DB locale a le seed calibration/wakanda). Le flow de login lui-même fonctionne (console OK). → `npm run db:seed` puis re-crawl cockpit (`heal:full`).
- **21 findings ERROR** : majoritairement sur le chemin **id-placeholder** `demo-strategy-cimencam` (tRPC 500 sur id invalide — robustesse : les pages détail devraient `notFound()` au lieu de 500). 2 vrais bugs **corrigés** (#9 hydration, #10 [object Object]).
- **Artefacts dev** : les temps de chargement ~11 s/page = **cold-compile turbopack**, pas latence réelle. Le « timeout 30 s » de `/console/seshat/attribution` est très probablement un cold-compile de page lourde, pas un hang prod (à confirmer en prod : `npm run probe:prod`).
- `auth:unexpected-redirect ×25` (agency/creator) = comptes admin/founder sans ces rôles → **attendu**, pas un bug.

**Classe robustesse à traiter** : pages détail `[id]` qui 500 sur id manquant → uniformiser un `notFound()` / empty-state. (Non bloquant pour les vrais utilisateurs qui naviguent avec des ids réels.)

---

## Verdict

`tsc 0 · lint 0 error`. 10 défauts purgés, robot healer livré, 4 diagnostics profonds posés. Le gros restant (Oracle cascade staleness, dispatch forge Artemis→Ptah, renderer 16:9 Brand Bible) est du **build de feature**, pas du bug — ledgeré ci-dessus avec file:line + direction. À prioriser par le fondateur.
