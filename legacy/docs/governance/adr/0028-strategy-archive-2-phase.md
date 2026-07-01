# ADR-0028 — Strategy archive 2-phase (soft archive → hard purge) gouvernée par MESTOR

**Date** : 2026-05-03
**Statut** : Accepted
**Phase** : 16+ (post-merge sweep — system tooling for marque lifecycle management)
**Co-shippé avec** : sprint NEFER auto-correction §8 (drift §2 bypass governance détecté sur PR #47 initial, refondu)

## Contexte

Le repo n'avait aucun mécanisme pour qu'un opérateur archive ou supprime une marque (`Strategy`). Conséquences :

1. **Test/dev pollution** : 18 strategies "incomplètes" (Quick Intake abandonnées, Vibranium Insights de tests UI, demo-cimencam, etc.) traînaient dans la DB locale, polluant les vues `/console/strategy-portfolio/brands` (anciennement `/console/oracle/brands`, cf. ADR-0034) et faussant les compteurs.
2. **Pas de soft delete** : la mutation `strategy.delete` existante (`auditedAdmin`) faisait un `update.status = "ARCHIVED"` mais ne sortait pas la row des queries default + ne libérait jamais la masse au stockage.
3. **Pas de hard delete sécurisé** : la suppression définitive est nécessaire pour libérer la DB et purger les données client à la demande (RGPD, fin de contrat). Un `DELETE FROM Strategy` cru échoue : 30+ tables enfants avec FK `RESTRICT` (Pillar, BrandAsset, Mission, Campaign, Recommendation, ScoreSnapshot, etc.) bloquent.

L'opération "purge initiale" exécutée hors PR (script `scripts/purge-incomplete-brands.mjs`, 782 rows deleted) a démontré la viabilité d'un BFS via `information_schema.table_constraints` pour découvrir dynamiquement les FK et delete bottom-up. Cette ADR formalise le pattern et le promeut en feature gouvernée.

### Drift initial (PR #47 commit `ad2fe87`) — refondu post-NEFER ingestion

La première implémentation exposait `archive/restore/purge` comme **mutations tRPC `auditedAdmin` appelant directement** le service `strategy-archive`. **Bypass governance NEFER §3 interdit absolu** : toute mutation passe par `mestor.emitIntent()`. Détecté à la phase 8 auto-correction post-NEFER ingestion. Refonte complète : voir §Décision.

## Décision

### Architecture 2-phase

| Phase | Effet DB | Réversible ? | Intent kind |
|---|---|---|---|
| **1 — Archive** | `Strategy.archivedAt = now()` | Oui (Phase 1') | `OPERATOR_ARCHIVE_STRATEGY` |
| **1' — Restore** | `Strategy.archivedAt = null` | — | `OPERATOR_RESTORE_STRATEGY` |
| **2 — Purge** | `DELETE Strategy + BFS cascade 30+ tables` | **Non** | `OPERATOR_PURGE_ARCHIVED_STRATEGY` |

**Anti-foot-gun** : `OPERATOR_PURGE_ARCHIVED_STRATEGY` refuse si `Strategy.archivedAt = null` (la marque doit être archivée d'abord). En plus, le tRPC mutation exige `confirmName: string` qui doit equal `Strategy.name.toUpperCase()` — type-to-confirm.

**Wakanda dummy protection** : les 3 handlers refusent `Strategy.isDummy = true`. Les seeds Wakanda (BLISS, Vibranium Tech, Wakanda Brew, Panther Athletics, Shuri Academy, Jabari Heritage) ne peuvent jamais être ni archivées ni purgées.

### Governance — passage par MESTOR (NEFER §3)

3 nouveaux Intent kinds enregistrés dans `src/server/governance/intent-kinds.ts` (governor `MESTOR`, handler `strategy-archive`) :

```ts
{ kind: "OPERATOR_ARCHIVE_STRATEGY", governor: "MESTOR", handler: "strategy-archive", async: false, description: "Soft archive a Strategy..." },
{ kind: "OPERATOR_RESTORE_STRATEGY", governor: "MESTOR", handler: "strategy-archive", async: false, description: "Restore a soft-archived Strategy..." },
{ kind: "OPERATOR_PURGE_ARCHIVED_STRATEGY", governor: "MESTOR", handler: "strategy-archive", async: false, description: "Hard delete Strategy + BFS cascade..." },
```

SLOs déclarés dans `src/server/governance/slos.ts` :
- ARCHIVE/RESTORE : `p95LatencyMs: 500, errorRatePct: 0.01, costP95Usd: 0`
- PURGE : `p95LatencyMs: 30_000, errorRatePct: 0.05, costP95Usd: 0` (transaction BFS sur 30+ tables, latency upper bound généreux pour strategies avec gros historique CultIndexSnapshot/ScoreSnapshot)

3 type variants ajoutés dans l'union `Intent` (`src/server/services/mestor/intents.ts`). 3 cases dispatchées dans `commandant.ts:execute` qui importent les handlers depuis `strategy-archive`.

Les mutations tRPC (`strategy.archive`, `strategy.restore`, `strategy.purge`) appellent désormais `emitIntent({ kind: ..., strategyId, operatorId, ... })` au lieu d'invoquer le service direct.

### BFS dynamique via `information_schema`

Le purge ne hardcode pas les 30+ tables enfants. Au lieu de ça :

1. SELECT dans `information_schema.table_constraints` pour cartographier toutes les FK pointant vers `Strategy` (et récursivement toutes les FK pointant vers ces enfants).
2. BFS depuis `Strategy.id` à supprimer → collecte tous les `id` enfants à chaque niveau.
3. Topological sort bottom-up : delete les tables sans dépendant restant en premier, puis remonter.
4. Tout dans une `db.$transaction` atomique — rollback si la moindre étape échoue.

Avantages :
- **Pas de drift** quand une nouvelle FK vers Strategy est ajoutée (ex: nouveau Neter Phase 17). Le BFS la découvre runtime.
- **Pas de cycle non-géré** : si le BFS détecte un cycle FK (table A → B → A), throw avec liste des tables coincées.
- **Cohérence** : par construction, aucun orphan post-purge.

Coût : 1 query info_schema (cached) + N queries SELECT id pour la collecte + M queries DELETE — O(profondeur FK × largeur).

### UI

- `<ArchivedStrategiesModal />` dans `src/components/strategy/` — modal full-screen avec backdrop blur, header (count badge), grid 1/2/3 cols responsive de tuiles. Tuile = avatar lettre initiale (logo TODO), nom, status badge, date relative archive ("il y a N jours"), métriques (piliers/assets/missions/sources), 2 actions Restaurer / Supprimer.
- `<PurgeConfirmDialog />` interne — alertdialog, type-to-confirm en MAJUSCULES, preview rows count estimé.
- Bouton "Archives" dans `/console/strategy-portfolio/brands` header (anciennement `/console/oracle/brands`, cf. ADR-0034) avec badge count + action "Archiver" par row de la liste active (Wakanda dummies exclues du bouton).

## Conséquences

### Positives

- **NEFER §3 respecté** : tous les writes passent par `mestor.emitIntent()`. Audit trail uniforme. Interceptable par Thot pre-flight (cost gate, futur).
- **Anti-foot-gun multi-niveau** : (a) handler refuse purge sans archive préalable, (b) tRPC exige confirmName == name.toUpperCase(), (c) Wakanda dummies type-protected, (d) BFS atomique transaction.
- **Découverte dynamique des FK** : pas de drift quand le schema évolue (nouveau Neter, nouvelle table).
- **2-phase = recoverable** : un opérateur qui archive par erreur peut restaurer en 1 clic. Le purge irréversible exige une intention claire (type-to-confirm).
- **Réutilisable** : le pattern `purgeStrategy` (BFS via info_schema + topological sort) peut être généralisé en `purgeEntity(table, id)` pour d'autres entités root (futur).

### Négatives / risques

- **Latency purge dépendante du volume** : strategies très anciennes avec milliers de ScoreSnapshot/CultIndexSnapshot peuvent excéder `p95LatencyMs: 30_000`. Mitigation : si dépassement observé en prod, batch les DELETE par chunks ou exécuter async (`async: true` + IntentEmission status streaming).
- **Pas de soft purge** : pas de "purge en attente N jours, annulable". Si demandé, 3ème phase à introduire (`Strategy.purgeScheduledAt`).
- **Pas de tests unitaires** sur le BFS purge — testable contre une DB temporaire (à ajouter).
- **`isDummy` comme protection est fragile** : un opérateur qui flippe `isDummy=false` directement en DB peut purger. Mitigation : `isDummy` est `@default(false)`, donc seules les seeds Wakanda l'ont à `true` ; toute marque user-créée est non-dummy par défaut.

### Surveillance

- IntentEmission row par mutation (audit trail Mestor) — queryable via `/console/governance/intents`.
- Logs handler côté `strategy-archive.archiveStrategyHandler` etc. — `output.totalRowsDeleted` pour le purge, queryable via IntentEmission.output.

## Implémentation

| Fichier | Type |
|---|---|
| `prisma/schema.prisma` | `Strategy.archivedAt: DateTime?` + `@@index([archivedAt])` |
| `prisma/migrations/20260503000000_strategy_archived_at/migration.sql` | ALTER TABLE + CREATE INDEX |
| `src/server/services/strategy-archive/index.ts` | service + 3 handlers (`archiveStrategyHandler`, `restoreStrategyHandler`, `purgeArchivedStrategyHandler`) |
| `src/server/governance/intent-kinds.ts` | 3 entries OPERATOR_*_STRATEGY |
| `src/server/governance/slos.ts` | 3 SLOs |
| `src/server/services/mestor/intents.ts` | 3 type variants dans union Intent + getStrategyKey cases |
| `src/server/services/artemis/commandant.ts` | 3 cases dispatch |
| `src/server/trpc/routers/strategy.ts` | 4 procédures (archive, restore, purge, listArchived) — toutes via emitIntent |
| `src/components/strategy/archived-strategies-modal.tsx` | UI modal + tuiles + dialog |
| `src/app/(console)/console/oracle/brands/page.tsx` | bouton Archives header + action Archiver per-row |

## Liens

- ADR-0023 — OPERATOR_AMEND_PILLAR (pattern Intent kind operator-driven mutation)
- NEFER.md §3 — interdit absolu bypass governance
- NEFER.md §8 — Phase 8 auto-correction (drift détecté + refonte)
- `scripts/purge-incomplete-brands.mjs` — script one-shot utilisé pour la purge initiale 18 strategies (782 rows)
