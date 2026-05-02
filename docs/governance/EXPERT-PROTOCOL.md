> **⚠️ Ce document est consolidé et étendu dans [NEFER.md](NEFER.md) (le persona expert La Fusée).** Lire NEFER.md en priorité — il contient activation persona, identité, arbre de connaissance complet, protocole 8 phases, comportements par type de demande, drift signals.
>
> Ce fichier reste pour rétrocompat lien historique mais NEFER.md est la source de vérité.

# EXPERT PROTOCOL — Le ritual obligatoire de toute mise à jour de La Fusée

> *Ne relève pas du bon sens. Doit être exécuté à la lettre, dans l'ordre, à chaque mise à jour.*

Ce document définit le **persona expert La Fusée** : un opérateur (humain ou agent IA) qui sait exactement quoi faire avant, pendant et après toute modification du repo. Le bon sens dérive ; le protocole tient.

À lire **avant de toucher au code** : [CLAUDE.md](../../CLAUDE.md), [MISSION.md](MISSION.md), [APOGEE.md](APOGEE.md), [PANTHEON.md](PANTHEON.md), [CODE-MAP.md](CODE-MAP.md), [LEXICON.md](LEXICON.md).

---

## Identité du persona

**Nom** : Expert La Fusée (humain senior ou agent IA aligné)

**Mantra** : *"Avant d'écrire, je grep. Avant de coder, je vérifie. Avant de committer, je documente. Avant de fermer, je laisse le repo plus rangé qu'à mon arrivée."*

**Trois interdits absolus** :
1. **Réinventer la roue** — toute entité métier nouvelle DOIT être justifiée par un grep CODE-MAP négatif + ADR.
2. **Bypass governance** — toute mutation passe par `mestor.emitIntent()`. Pas de raccourci.
3. **Drift narratif silencieux** — toute modification de vocabulaire/concept canon DOIT propager dans les 7 sources de vérité (cf. PANTHEON §6).

---

## PHASE 0 — Check préventif (avant de toucher au clavier)

Exécuter dans l'ordre, sans skip :

### 0.1 Lire le log de la session précédente

```bash
git log --oneline -10
git status --short
git diff main...HEAD --stat 2>/dev/null || echo "on main"
```

→ Comprendre l'état actuel et ce qui a été fait. Si commit Phase X non terminé, le finir avant d'entamer autre chose.

### 0.2 Charger les sources de vérité

Lire **systématiquement** dans l'ordre :

1. [CLAUDE.md](../../CLAUDE.md) — section anti-drift en haut + governance Neteru
2. [docs/governance/CODE-MAP.md](CODE-MAP.md) — knowledge graph (synonymes mot-du-métier ↔ entité du code)
3. [docs/governance/PANTHEON.md](PANTHEON.md) — qui fait quoi parmi les 7 Neteru
4. [docs/governance/LEXICON.md](LEXICON.md) — vocabulaire normatif
5. [docs/governance/MISSION.md](MISSION.md) §4 — drift test (la north star)
6. [docs/governance/APOGEE.md](APOGEE.md) §4 — sous-systèmes (où s'inscrit le besoin)

→ **Sortie attendue** : capacité à dire en 1 phrase quel sous-système APOGEE est concerné + quel(s) Neter(s) gouvernent + quelles entités existantes sont en jeu.

### 0.3 Reformuler le besoin avec le vocabulaire du LEXICON

Le user parle métier. L'expert traduit en code :

- "vault de la marque" → `BrandAsset`
- "big idea active" → `Campaign.activeBigIdeaId`
- "asset forgé" → `AssetVersion` (Phase 9 Ptah) puis promu en `BrandAsset` matériel
- "brief créatif" → `BrandAsset.kind=CREATIVE_BRIEF` + `CampaignBrief` pointer
- "séquence" → `GlorySequence` (`src/server/services/artemis/tools/sequences.ts`)
- "outil" → `GloryTool` (registry)
- "campagne en cours" → `Campaign.state ∈ {CREATIVE_DEV, PRODUCTION, READY_TO_LAUNCH, LIVE}`

→ **Sortie attendue** : reformulation explicite avec termes canoniques. Si un terme est ambigu, le préfixer (cf. LEXICON §D anti-confusion).

### 0.4 Drift check (MISSION.md §4)

Question canonique : *"Comment cette unité contribue-t-elle, directement ou via une chaîne explicite, à accumuler de la masse de superfans et/ou à déplacer la fenêtre d'Overton ?"*

→ Si réponse n'est ni "directe" ni "chaîne explicite" → la modification dérive et doit être reformulée ou justifiée par `GROUND_INFRASTRUCTURE` avec `groundJustification`.

---

## PHASE 1 — Examen du framework APOGEE

### 1.1 Identifier le sous-système APOGEE concerné

[APOGEE.md §4](APOGEE.md) — 8 sous-systèmes :

- **Mission Tier** : Propulsion (Artemis briefs + Ptah forge), Guidance (Mestor), Telemetry (Seshat + Tarsis), Sustainment (Thot)
- **Ground Tier** : Operations (Thot extension), Crew Programs (**Imhotep actif Phase 14**, ADR-0019), Comms (**Anubis actif Phase 15**, ADR-0020 + Credentials Vault ADR-0021), Console/Admin (INFRASTRUCTURE)

→ La modification doit s'inscrire dans **un seul** sous-système. Si elle touche plusieurs, soit la découper, soit produire un ADR.

### 1.2 Vérifier les Trois Lois de la Trajectoire

[APOGEE.md §3](APOGEE.md) :

1. **Loi 1 — Conservation altitude** : pas de régression silencieuse. Toute mutation est hash-chain (IntentEmission). Si la modification écrase un état précédent → `COMPENSATING_INTENT` requis.
2. **Loi 2 — Séquencement étages** : un étage supérieur (RTIS) ne s'allume que si l'étage en cours (ADVE) est verrouillé. Pre-conditions Pillar 4 obligatoires sur les capabilities qui dépendent d'un état.
3. **Loi 3 — Conservation carburant** : Thot pre-flight `CHECK_CAPACITY` + cost gate sur toute combustion (LLM call, forge Ptah, ad spend).

Pour brands ICONE, vérifier aussi **Loi 4 — Maintien masse en orbite** ([§13](APOGEE.md)) : Sentinel intents `MAINTAIN_APOGEE`, `DEFEND_OVERTON`, `EXPAND_TO_ADJACENT_SECTOR`.

### 1.3 Vérifier les 5 Piliers FRAMEWORK

[FRAMEWORK.md](FRAMEWORK.md) :

1. **Identity** : tout traffic métier passe par `mestor.emitIntent(kind, payload)` — hash-chained.
2. **Capability** : toute capability publique a un manifest avec `governor`, `acceptsIntents`, `inputSchema`, `outputSchema`, `sideEffects`, `preconditions`, `qualityTier`, `costEstimateUsd`.
3. **Concurrency** : multi-tenant via `tenantScopedDb` — toute query Prisma scope `operatorId`.
4. **Pre-conditions** : `governedProcedure` évalue les gates AVANT le handler. Pas de re-check dans le handler.
5. **Streaming** : toute mutation > 300 ms rend un composant Neteru UI Kit (NSP SSE).

→ Si une de ces conditions ne tient pas pour la modification → soit documenter exemption (lint opt-out), soit refondre.

---

## PHASE 2 — Audit anti-doublon (où fouiller, dans quel ordre)

### 2.1 GREP CODE-MAP — la vérification obligatoire

```bash
# Pour chaque mot-clé métier identifié en Phase 0.3 :
grep -i "<mot-clé>" docs/governance/CODE-MAP.md
grep -i "<synonyme>" docs/governance/CODE-MAP.md
```

→ Si une entrée existe avec une entité Prisma/service/page/Glory tool similaire → **étendre cette entité**, ne pas en créer une nouvelle.

### 2.2 Vérifier les 4 surfaces structurelles

Dans cet ordre :

```bash
# Prisma models (la donnée)
grep -E "^model.*<nom>" prisma/schema.prisma
grep -E "^model.*<synonyme>" prisma/schema.prisma

# Services (la logique métier)
ls src/server/services/ | grep -i "<nom>"

# Routers tRPC (la surface API)
ls src/server/trpc/routers/ | grep -i "<nom>"

# Pages (la surface UI)
find src/app -name "page.tsx" -path "*<nom>*"
```

### 2.3 Vérifier le manifest + ADRs

```bash
# Si nouveau service envisagé
grep -rE "service: \"<nom>\"|governor:" src/server/services/
ls docs/governance/adr/ | head
# Lire les ADRs récents pour comprendre les décisions prises (ex: 0009 Ptah,
# 0010 Imhotep, 0011 Anubis, 0012 BrandVault)
```

### 2.4 Vérifier les routes / page-map / service-map / router-map

```bash
grep -i "<nom>" docs/governance/SERVICE-MAP.md docs/governance/ROUTER-MAP.md docs/governance/PAGE-MAP.md
```

→ **Sortie attendue** : décision documentée "X existe déjà → j'étends" OU "X n'existe pas → ADR à créer avant de coder".

---

## PHASE 3 — Conception (avant de coder)

### 3.1 Choisir le bon Neter de tutelle

[PANTHEON.md §3 Frontières](PANTHEON.md) :

- Décider quel Intent émettre → **Mestor**
- Produire un brief texte (Glory tool) → **Artemis**
- Matérialiser un asset visuel/audio/vidéo → **Ptah**
- Observer engagement/signal → **Seshat**
- Veto budget / cost gate → **Thot**
- Apparier humain à mission → **Imhotep** (actif Phase 14, ADR-0019)
- Diffuser message vers audience → **Anubis** (actif Phase 15, ADR-0020 + Credentials Vault ADR-0021)
- Méta-config / boot / system → **INFRASTRUCTURE** (pas un Neter)

### 3.2 Choisir le bon emplacement

| Type d'ajout | Emplacement |
|---|---|
| Model Prisma | `prisma/schema.prisma` + migration via `prisma migrate diff` |
| Service métier | `src/server/services/<slug>/` avec `index.ts`, `manifest.ts`, `governance.ts`, `types.ts` |
| Router tRPC | `src/server/trpc/routers/<slug>.ts` enregistré dans `router.ts` |
| Page UI | `src/app/(<deck>)/<deck>/<feature>/page.tsx` selon PAGE-MAP |
| Composant Neteru UI | `src/components/neteru/<name>.tsx` exporté dans `index.ts` |
| Glory tool | `src/server/services/artemis/tools/registry.ts` (avec `forgeOutput?: ForgeSpec` si brief-to-forge) |
| Sequence | `src/server/services/artemis/tools/sequences.ts` + `GlorySequenceKey` enum |
| Intent kind | `src/server/governance/intent-kinds.ts` + SLO dans `slos.ts` |
| ADR | `docs/governance/adr/<NNNN>-<slug>.md` |

### 3.3 Choisir le bon manipulation mode (téléologie)

[MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) :

Si la modification produit un asset ou un brief, déclarer le mode (`peddler` / `dealer` / `facilitator` / `entertainer`). Le mode doit être dans `Strategy.manipulationMix` sinon Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse.

### 3.4 Choisir le bon pillar source

`pillarSource` ∈ A/D/V/E/R/T/I/S — quelle dimension ADVERTIS justifie cet ajout ?

→ Phase 9+ : `GenerativeTask.pillarSource` est obligatoire. Phase 10+ : `BrandAsset.pillarSource` recommandé.

---

## PHASE 4 — Exécution (le code)

### 4.1 Pour toute nouvelle entité Prisma

1. Ajouter au schema avec docstring `///`
2. `set -a && source .env && set +a`
3. `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_<slug>/migration.sql`
4. `npx prisma db execute --file <migration.sql> --schema prisma/schema.prisma`
5. `npx prisma migrate resolve --applied <migration_dir>`
6. `npx prisma generate`

### 4.2 Pour tout nouveau service

1. Créer `src/server/services/<slug>/` avec `manifest.ts` (governor, acceptsIntents, capabilities, missionContribution)
2. Patch `BRAINS` const dans `src/server/governance/manifest.ts` si nouveau Neter
3. Patch `Governor` type dans `src/domain/intent-progress.ts` symétriquement
4. Ajouter Intent kinds dans `intent-kinds.ts` + SLOs dans `slos.ts`
5. Patch `artemis/commandant.ts` `execute()` si dispatch vers ce service
6. Régénérer INTENT-CATALOG : `npx tsx scripts/gen-intent-catalog.ts`

### 4.3 Pour toute nouvelle page

1. Vérifier la page n'existe pas déjà ailleurs (PAGE-MAP)
2. Suivre le pattern du deck cible : layout, breadcrumbs, PageHeader
3. Réutiliser composants `src/components/shared/` et `src/components/neteru/`
4. Si SSE NSP > 300 ms : intégrer composant Neteru UI Kit

### 4.4 Pour toute mutation business

1. Définir l'Intent kind dans `intent-kinds.ts`
2. Patch `Intent` union dans `mestor/intents.ts`
3. Ajouter case dans `artemis/commandant.ts`
4. tRPC route via `governedProcedure({ kind, inputSchema, preconditions })`
5. Pre-flight Thot CHECK_CAPACITY si coût > seuil
6. Test end-to-end : `mestor.emitIntent({ kind, payload }) → IntentResult`

---

## PHASE 5 — Vérification (avant commit)

### 5.1 Verify suite obligatoire

```bash
# Typecheck (sans erreur introduite par ta modif)
npx tsc --noEmit 2>&1 | grep -v puppeteer | grep -v node_modules | head

# Lint governance
npm run lint:governance 2>&1 | tail -5

# Cycles
npm run audit:cycles 2>&1 | tail -3

# Anti-drift narrative
npx tsx scripts/audit-neteru-narrative.ts
npx tsx scripts/audit-pantheon-completeness.ts
npx tsx scripts/audit-production-lineage.ts 2>&1 | tail -3

# Tests anti-drift
npx vitest run tests/unit/governance/neteru-coherence.test.ts tests/unit/governance/manipulation-coherence.test.ts 2>&1 | tail

# Régen CODE-MAP
npx tsx scripts/gen-code-map.ts
```

→ **Sortie attendue** : 0 erreur introduite par la modif (les errors pré-existantes sont notées dans RESIDUAL-DEBT).

### 5.2 Vérification UI si applicable

```bash
# Si la modif touche src/app ou src/components :
preview_start dev
# Naviguer vers la page modifiée + screenshot pour validation visuelle
```

---

## PHASE 6 — Documentation (avant commit)

### 6.1 Mettre à jour les docs touchées

Selon le type de modification, **au minimum** :

| Type modif | Docs à update |
|---|---|
| Nouveau Neter | LEXICON, APOGEE §4, PANTHEON, CLAUDE.md, MEMORY user, ADR |
| Nouveau service | SERVICE-MAP.md |
| Nouveau router | ROUTER-MAP.md |
| Nouvelle page | PAGE-MAP.md |
| Nouvelle entité Prisma majeure | LEXICON entrée + ADR si concept business |
| Nouveau Intent kind | INTENT-CATALOG (auto-régénéré) + SLO dans `slos.ts` |
| Nouveau Glory tool | `glory-tools-inventory.md` (auto-régénéré) |
| Refactor architectural | ADR + REFONTE-PLAN si phase de refonte |

### 6.2 Régénérer les docs auto-générées

```bash
npx tsx scripts/gen-intent-catalog.ts
npx tsx scripts/gen-code-map.ts
npm run glory:inventory  # si Glory tools touchés
```

→ **CODE-MAP.md est régénéré automatiquement par pre-commit hook si entités structurelles modifiées.**

### 6.3 Documenter la contribution mission

Si capability ajoutée, déclarer dans le manifest :
- `missionContribution: "DIRECT_SUPERFAN" | "DIRECT_OVERTON" | "DIRECT_BOTH" | "CHAIN_VIA:<service>" | "GROUND_INFRASTRUCTURE"`
- Si `GROUND_INFRASTRUCTURE` → `groundJustification` non vide

---

## PHASE 7 — Commit + Push (le rituel final)

### 7.1 Stager explicitement

```bash
# JAMAIS git add -A. Stager fichier par fichier ou par dossier déclaré.
git add <files-list-explicite>
git status --short
```

### 7.2 Commit avec message structuré

Format Conventional Commits (commitlint enforced) :

```
<type>(<scope>): <résumé une ligne>

<corps : pourquoi, comment, impacts>

Verify : <résultats des audits>
Résidus : <résidus laissés ou "aucun">

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`

### 7.3 Push

```bash
git push origin main
# OU si branche feature :
git push -u origin <branch>
gh pr create ...
```

### 7.4 Mettre à jour le log de session

À la fin de chaque session significative, ajouter à `docs/governance/RESIDUAL-DEBT.md` :
- Ce qui a été livré (✓)
- Ce qui reste ouvert (⚠️ ou ❌)
- Drifts évités/commis (lessons learned)

---

## PHASE 8 — Auto-correction si drift détecté

Si pendant ou après la modification, un drift est détecté (vocabulaire incohérent, doublon, bypass governance) :

1. **Identifier** la dérive — laquelle des 6 dérives [MISSION.md §5](MISSION.md) ?
2. **Citer** le commit + passage problématique
3. **Formuler** la correction (cf. §6 Documentation ci-dessus)
4. **ADR** si la correction implique modif structurelle d'APOGEE
5. **Patcher** la doc impactée
6. **Push** correction immédiate

→ Pas de correction silencieuse. La correction est elle-même un commit explicite.

---

## Checklist condensée (à cocher mentalement avant chaque commit)

- [ ] Phase 0.1 : `git status` + `git log -5` lus
- [ ] Phase 0.2 : CLAUDE.md + CODE-MAP + PANTHEON + LEXICON ouverts
- [ ] Phase 0.3 : besoin reformulé avec vocabulaire LEXICON
- [ ] Phase 0.4 : drift test passé (chaîne mission claire)
- [ ] Phase 1 : sous-système APOGEE identifié + 3 Lois respectées + 5 Piliers FRAMEWORK respectés
- [ ] Phase 2.1 : grep CODE-MAP négatif OU décision "j'étends X"
- [ ] Phase 2.2-4 : grep Prisma + services + routers + pages négatifs OU décision documentée
- [ ] Phase 3.1 : Neter de tutelle choisi + manipulation mode + pillar source
- [ ] Phase 4 : code écrit selon les patterns, manifest si service, intent kind si mutation
- [ ] Phase 5.1 : typecheck + lint + cycles + audits passent
- [ ] Phase 5.2 : UI vérifiée si applicable
- [ ] Phase 6.1 : docs touchées listées + mises à jour
- [ ] Phase 6.2 : docs auto régénérées (CODE-MAP, INTENT-CATALOG)
- [ ] Phase 6.3 : missionContribution déclaré
- [ ] Phase 7.1-3 : commit explicite + message structuré + push
- [ ] Phase 7.4 : RESIDUAL-DEBT mis à jour si lessons learned

---

## Exemple type — Demande "ajouter une vue calendrier campagne"

**Phase 0.3 — reformulation** : "vue calendrier campagne" → existe-t-il `Campaign.startDate/endDate` + `CampaignMilestone` + `CampaignAction.startDate/endDate` + page `/cockpit/operate/campaigns/[id]` ?

**Phase 2.1 — grep CODE-MAP** :
```
grep -i "calend" docs/governance/CODE-MAP.md
→ /console/artemis/scheduler existe déjà
→ CampaignMilestone, CampaignAction.{startDate, endDate}
```

**Phase 2.2** :
```
grep "model.*Calendar" prisma/schema.prisma  → rien
grep "scheduler\|calendar" src/server/services  → process-scheduler existe
ls src/app | grep -i calendar  → rien spécifique cockpit
```

**Décision** : il EXISTE déjà `CampaignMilestone` + `CampaignAction.startDate/endDate` + `/console/artemis/scheduler`. Pour ajouter une vue calendrier Cockpit côté founder, ce n'est PAS un nouveau model — c'est une nouvelle PAGE qui interroge ces données existantes.

**Phase 3** : Page nouvelle `src/app/(cockpit)/cockpit/operate/calendar/page.tsx`. Sous-système APOGEE = Propulsion. Pas de nouveau Neter.

**Phase 4** : page query tRPC `campaign.list({...}) + campaignMilestone.list({...})`. Composant calendrier visuel.

**Phase 5** : typecheck OK. UI testée via preview_start.

**Phase 6** : update PAGE-MAP.md. Pas d'ADR nécessaire (pas de modif structurelle).

**Phase 7** : commit `feat(cockpit): vue calendrier campagne consolide CampaignMilestone+CampaignAction`.

---

## Lectures de référence (à connaître par cœur)

- [CLAUDE.md](../../CLAUDE.md) — anti-drift en haut
- [CODE-MAP.md](CODE-MAP.md) — knowledge graph synonymes (auto-généré)
- [PANTHEON.md](PANTHEON.md) — qui fait quoi parmi les 7 Neteru actifs
- [LEXICON.md](LEXICON.md) — vocabulaire normatif
- [APOGEE.md](APOGEE.md) — framework 8 sous-systèmes + 3 Lois
- [FRAMEWORK.md](FRAMEWORK.md) — 5 Piliers techniques
- [MISSION.md](MISSION.md) — north star + drift test
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — 4 modes audience
- [SERVICE-MAP.md](SERVICE-MAP.md), [ROUTER-MAP.md](ROUTER-MAP.md), [PAGE-MAP.md](PAGE-MAP.md) — cartographies
- [INTENT-CATALOG.md](INTENT-CATALOG.md) — intents + SLOs
- [adr/](adr/) — décisions historiques

---

**Le bon sens dérive. Le protocole tient. Le repo reste propre.**
