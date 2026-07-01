# ADR-0084 — La Fusée OS architecture, 8 canonical layers

**Status** : Accepted
**Date** : 2026-05-16
**Phase** : 23 (doc-only canonization — no code touch)
**Depends on** : ADR-0001 (APOGEE framework), ADR-0002 (layering cascade ESLint enforcement), ADR-0048 (Glory tools as primary API surface), ADR-0082 (Yggdrasil substrate canonization)
**Supersedes** : (none — net-new canonization formalizing existing repo state)
**Source canon** : [STATE_FINAL_BLUEPRINT §2](../STATE_FINAL_BLUEPRINT.md)

## Contexte

La Fusée d'UPgraders est un Industry OS. Cette qualité — *Operating System*, pas plateforme — a des conséquences architecturales structurantes : modularité par couche, contrats inter-couches stables, swappabilité indépendante d'un sous-système si le contrat avec la couche supérieure tient.

Avant cette ADR, le repo possédait déjà toutes les couches (ADR-0002 enforce la cascade `domain → lib → governance → services → trpc → components → app`), mais le **modèle conceptuel à 8 couches OS** — qui aligne La Fusée sur le vocabulaire des operating systems classiques (Kernel, Drivers, Protocoles, Substrats, Services système, APIs, Applications, Funnel commercial) — n'avait pas d'ADR. Le risque : recevoir des contributions qui violent l'esprit OS (un service système qui consomme directement un driver, une app qui parle au kernel, etc.) parce que le modèle n'est pas inscrit comme canon.

STATE_FINAL_BLUEPRINT §2 (2026-05-16) a formalisé les 8 couches comme doctrine canon. Cette ADR transcrit cette doctrine au format ADR pour qu'elle soit citable, vérifiable, et anti-drift-testable.

## Décision

La Fusée est un OS, traité comme tel. **8 couches canoniques** :

| # | Couche | Drivers / Implémentation La Fusée | Statut |
|---|--------|-----------------------------------|--------|
| 1 | **Hardware / Kernel** | Postgres + Vercel + Node runtime + Edge runtime | ✅ |
| 2 | **Drivers** | `tenantScopedDb` · Prisma client · LLM Gateway providers · Anubis providers (Meta / Google / X / TikTok / Twilio / Mailgun / FCM) · Ptah providers (Adobe Firefly / Canva / Figma / Magnific / Higgsfield) · Credentials Vault (ADR-0021) | ✅ |
| 3 | **Protocoles** | Intent bus (`mestor.emitIntent`) · NSP SSE (ADR-0025) · hash-chain SHA256 (ADR-0004 / 0005) · MCP bidirectionnel (ADR-0026) · OAuth 2.1 device flow (ADR-0048 / 0026) · `ConnectorResult<T>` (Phase 23 P22-1) · 7 patterns P22-1..7 | ✅ |
| 4 | **Substrats** | **Yggdrasil per-brand** (ADR-0082, ungoverned substrate) · `tenantScopedDb` isolation · layering cascade (ADR-0002) · `BrandContextNode` tree (ADR-0059) · Variable Bible (ADR-0023) | ✅ |
| 5 | **Services système (daemons)** | 7 Neteru + INFRASTRUCTURE (Mestor · Artemis · Ptah · Seshat · Thot · Imhotep · Anubis + INFRASTRUCTURE driver) | ✅ |
| 6 | **APIs** | tRPC routers · Glory tools (ADR-0048) · Frameworks · Sequences (ADR-0039 / 0040 / 0042) · Intent kinds | ✅ |
| 7 | **Applications** | Console · Cockpit · Agency · Creator · Intake · Argos (📋 ADR-0083, Phase 22) | 🟡 (3 surfaces UI manquantes : Communities + Personal Brand + Hub-Escrow — closure-targets #17 + #16) |
| 8 | **Funnel commercial** | Landing wow-effect · free Intake analysis · paid PDF Oracle · CTA retainer · Cockpit subscription | 🟡 (metrics absents — closure-target tracé blueprint §15.11) |

### Invariant — modularité par couche

Chaque couche peut être swappée indépendamment **si le contrat avec la couche supérieure tient**. Concrètement :

- Couche 1 swap (Postgres → autre RDBMS) : possible si Prisma adapter existe et `tenantScopedDb` reste fonctionnel.
- Couche 2 swap (LLM Gateway provider) : possible si circuit breaker + cost tracking restent agnostiques (déjà le cas Phase 16 polish).
- Couche 5 swap (un Neter remplacé par un autre) : interdit en pratique parce que cap APOGEE 7/7 atteint, mais théoriquement possible si le manifest + Intent contracts restent identiques.

### Invariant — directionality

La cascade d'import compile-time (ADR-0002) reflète directement la stratification des couches :

```
1 Kernel    ← ne sait rien des couches supérieures
2 Drivers   ← importe Kernel
3 Protocoles ← importe Drivers
4 Substrats ← importe Protocoles
5 Services  ← importe Substrats (jamais cross-Neter direct → passe par Intent bus)
6 APIs      ← importe Services
7 Apps      ← importe APIs (jamais direct vers Services)
8 Funnel    ← surface marketing/UX, consomme APIs via Apps
```

**Drift signal** : tout import croisé qui viole cette direction = violation OS. ESLint + `madge --circular` enforce déjà la cascade Layer 1-7 (ADR-0002). Layer 8 (Funnel) est doctrine pure (pas de boundary code-level — c'est du wording marketing/UX, mesuré par metrics).

### Invariant — un service inter-Neter ne s'importe jamais directement

Renforce ADR-0002 + ADR-0048 : la communication inter-Neter passe **toujours** par Intent bus (`mestor.emitIntent()`). Aucun `import { artemis }` from `services/ptah/`. Aucun `import { seshat }` from `services/anubis/`. Test anti-drift `services-no-cross-neter-import.test.ts` 📋 à créer (Phase 29 candidate cf. blueprint §22.3).

## Conséquences

### Documentation propagée

Cette ADR ne mute aucune source du 7-sources-sync (NEFER §1) — elle formalise une doctrine cross-cutting :

| Source | Action |
|---|---|
| `BRAINS` const | **Inchangé** — pas de Neter ajouté |
| `Governor` type | **Inchangé** |
| `LEXICON.md` | Entrée potentielle `OS_LAYERS` à créer en Phase 29 si test anti-drift shipped. Pas urgent — blueprint §2 + cette ADR suffisent comme source citable. |
| `APOGEE.md` | §4 sub-system mapping inchangé (sub-systems = couche 5 ; les 7 autres couches sont OS-wide) |
| `PANTHEON.md` | Inchangé |
| `CODE-MAP.md` | Inchangé (pas d'entité Prisma ajoutée) |
| `CLAUDE.md` | Section "Phase status" entry Phase 23 mentionne ADR-0084 + STATE_FINAL_BLUEPRINT |

### Anti-drift test (Phase 29 candidate)

`tests/unit/governance/os-layer-boundary.test.ts` (HARD mode après stress-test 1 mois) à créer :

```ts
// Pseudo : assert pour chaque file dans src/server/services/<neter>/
// qu'aucun import direct vers src/server/services/<otherNeter>/ n'existe
// (sauf via Intent bus mestor.emitIntent).
```

Test à mettre en place dans une Phase 29 ultérieure — **hors scope de cette ADR** (ADR = canonization, test = implementation, cf. pattern ADR-0082 §"Anti-drift test").

### Pas d'impact code immédiat

Cette ADR canonise un modèle existant. La cascade ADR-0002 enforce déjà les frontières runtime. Les 8 couches sont une **lentille conceptuelle** qui aligne le vocabulaire La Fusée sur le vocabulaire OS classique — **aucun service touché**, **aucun modèle Prisma ajouté**, **aucune migration**.

### Articulation avec autres ADRs canons

- ADR-0001 (APOGEE) — sous-systems de la couche 5
- ADR-0002 (layering cascade) — enforce la directionality runtime des couches 1-7
- ADR-0082 (Yggdrasil) — substrat principal de la couche 4
- ADR-0083 (Argos) — application future de la couche 7
- ADR-0048 (Glory tools as primary API) — règle de surface couche 6
- ADR-0085 (cascade canon refresh) — gouverne le flux *à travers* les couches 4-7 (substrat → services → APIs → apps)
- ADR-0086 (score system) — mesure transverse des couches 5-7
- ADR-0087 (Thot formula engine) — pattern de calcul économique des couches 5-6

## Lectures associées

- [STATE_FINAL_BLUEPRINT §2](../STATE_FINAL_BLUEPRINT.md) — source canon doctrinale
- [ADR-0001](0001-framework-name-apogee.md) — APOGEE framework
- [ADR-0002](0002-layering-six-couches.md) — layering cascade (renforcé par cette ADR au niveau OS-wide)
- [ADR-0082](0082-yggdrasil-value-circulation-substrate.md) — Yggdrasil substrate (couche 4)
- [ADR-0083](0083-argos-placement-seshat-yggdrasil-seam.md) — Argos placement (couche 7 future)
- [ADR-0048](0048-glory-tools-as-primary-api-surface.md) — Glory tools as primary API (couche 6)
