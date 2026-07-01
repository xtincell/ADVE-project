# ADR-0029 — `QuickIntake.convertedToId` promu en FK avec `ON DELETE SET NULL`

**Date** : 2026-05-03
**Status** : Accepted
**Auteurs** : NEFER (Phase 8 auto-correction)
**Supersede** : —
**Lié** : [ADR-0028](0028-strategy-archive-2-phase.md) (Strategy archive 2-phase)

---

## 1. Contexte

Le système d'archivage Strategy 2-phase introduit en ADR-0028 utilise un BFS dynamique sur `information_schema.table_constraints` pour découvrir et purger les rows enfants. Cette approche élimine le hardcoding des 30+ tables FK enfants — élégant, extensible, mais **aveugle aux pointeurs `String?` libres** (sans `@relation` Prisma → sans FK constraint en base → invisibles pour `information_schema`).

`QuickIntake.convertedToId` était déclaré comme `String?` non-relationnel depuis la création du modèle. Il pointe vers la `Strategy` temporaire créée pendant `quickIntakeService.complete()`. Lors de la **purge initiale des 18 marques incomplètes** (commit `ad2fe87`), 15 `QuickIntake` ont conservé un pointeur vers une `Strategy` purgée — dangling pointer silencieux.

Conséquence runtime : tout flow qui relit `intake.convertedToId` puis fait `strategy.update({ where: { id: intake.convertedToId } })` crash avec `Prisma RecordNotFound` :

```
Invalid `ctx.db.strategy.update()` invocation
src/server/trpc/routers/quick-intake.ts:870
An operation failed because it depends on one or more records that were required but not found.
```

Sites affectés dans `quick-intake.ts` :
- `convert` (admin) ligne 425 — `strategy.update` direct.
- `activateBrand` (public self-serve) ligne 327 — `strategy.update` direct + throw `BAD_REQUEST` si `convertedToId` null.
- `getRecosByToken` ligne 165 + `getPillarsByToken` ligne 193 — `findMany` filtré (vide si dangling, pas de crash mais résultat trompeur).

## 2. Décision

**Trois couches de défense, dans l'esprit "root cause not bandaid" (NEFER §3)** :

### Couche 1 — Data cleanup immédiat

`scripts/check-dangling-convertedToId.mjs` (avec flag `--fix`) — diagnostic et nullification one-shot des pointeurs orphelins. 15 rows nullifiées le 2026-05-03.

### Couche 2 — Code defense dans le router

`quick-intake.ts` `convert` et `activateBrand` :
- Avant tout `strategy.update`, faire un `strategy.findUnique({ select: { id: true } })` pour vérifier l'existence.
- Si dangling → fallback sur la branche **création** (déjà existante dans `convert`, ajoutée à `activateBrand`).
- Heal automatiquement le pointeur `convertedToId` dans le `quickIntake.update` final.

### Couche 3 — Schéma : promouvoir en vraie FK avec `ON DELETE SET NULL`

```prisma
model Strategy {
  // …
  quickIntakes QuickIntake[] @relation("QuickIntakeConvertedTo")
}

model QuickIntake {
  // …
  convertedToId String?
  convertedTo   Strategy? @relation("QuickIntakeConvertedTo",
    fields: [convertedToId], references: [id],
    onDelete: SetNull, onUpdate: Cascade)
}
```

Migration `20260503010000_quickintake_strategy_fk_setnull` :
1. `UPDATE QuickIntake SET convertedToId = NULL WHERE convertedToId NOT IN (SELECT id FROM Strategy)` — idempotent, gère les dangling déjà présents (au cas où la couche 1 n'aurait pas tourné).
2. `ADD CONSTRAINT … FOREIGN KEY … ON DELETE SET NULL ON UPDATE CASCADE`.
3. `CREATE INDEX QuickIntake_convertedToId_idx`.

### Couche 3b — BFS purge respecte `delete_rule`

`src/server/services/strategy-archive/index.ts` `loadFks()` joint désormais `information_schema.referential_constraints` pour récupérer `delete_rule`. Le BFS skip toutes les FK dont `delete_rule ∈ {SET NULL, SET DEFAULT, CASCADE}` — la base s'en charge, un `DELETE` explicite serait soit faux (SET NULL préserve la row enfant) soit redondant (CASCADE).

```ts
const DB_RESOLVED_DELETE_RULES = new Set(["SET NULL", "SET DEFAULT", "CASCADE"]);
// …
if (DB_RESOLVED_DELETE_RULES.has(c.delete_rule)) continue;
```

## 3. Conséquences

**Bénéfices** :
- Zéro dangling pointer possible désormais — la base garantit l'invariant.
- BFS purge auto-extensible : toute future relation Prisma `onDelete: SetNull` (ex : audit logs, soft references, métadonnées RAG) est respectée sans toucher au code purge.
- Code défensif (couche 2) garde la robustesse même si quelqu'un retire la FK plus tard.
- La cascade Glory→Brief→Forge n'est pas affectée : la Strategy temporaire conserve ses pillars, missions, brand assets via les FK existantes (CASCADE ou explicit BFS).

**Coûts** :
- Migration ALTER TABLE bloquante en production sur la table `QuickIntake`. Volume actuel < 100 rows → instantané. À surveiller si le volume explose après go-to-market.
- Légère complexification du `loadFks()` : un JOIN supplémentaire (negligeable).

**Trade-offs assumés** :
- On garde le pattern BFS dynamique plutôt que de basculer sur du `onDelete: Cascade` partout (qui simplifierait mais retirerait l'audit `tableHits` granulaire que le UI Strategy archive expose à l'opérateur).
- Le `convertedTo` Strategy étant nullable en SetNull, les requêtes futures qui dépendent du lien doivent toujours `?.` ou `if (intake.convertedTo)`. Cette discipline est déjà en place dans `getRecosByToken` et `getPillarsByToken` (filtrent vide si null).

## 4. Anti-drift : pourquoi `String?` libre était un anti-pattern

NEFER §3 interdit n°1 (« réinventer la roue ») : `convertedToId String?` était le doublon manuel d'un mécanisme natif Prisma/PostgreSQL (FK + delete_rule). Le coût initial évité (déclarer une back-relation sur `Strategy`) a été payé en bug runtime + 15 rows à nettoyer + 1 ADR. Lesson : **toute référence d'un model Prisma vers un autre model du même schema doit être une vraie `@relation`, jamais un `String?` libre**, sauf justification ADR explicite (ex : référence cross-schema, soft pointer voulu pour découplage).

À ajouter aux signaux drift §3.6 (anti-pattern Prisma) :
- ❌ Champ `String?` nommé `*Id` qui pointe vers un model Prisma sans `@relation` correspondant → STOP, déclarer la `@relation` proprement avec `onDelete:` choisi (Cascade pour ownership, SetNull pour pointer faible, Restrict pour interdire la suppression du parent).

## 5. Tests

- `scripts/check-dangling-convertedToId.mjs` — diagnostic standalone, `--fix` pour nullifier. Idempotent.
- Couche 2 testable manuellement : créer un intake, archiver+purger sa Strategy temp, ré-appeler `convert` ou `activateBrand` → doit créer une nouvelle Strategy au lieu de crash.
- Couche 3 testée via `prisma migrate deploy` sur dev (ce qui a appliqué la migration le 2026-05-03 sans erreur — 15 dangling déjà nullifiées par couche 1, 0 conflit).

## 6. Migration future

Une fois la confiance acquise sur le pattern (1-2 semaines), envisager une **passe d'audit globale** sur le schema pour détecter d'autres `String?` libres pointant vers des models. Script possible : parser `prisma/schema.prisma`, lister les champs `*Id String?` sans `@relation` correspondante, cross-checker avec les models. Sortie attendue : 0 résultat (sinon ADR par cas).
