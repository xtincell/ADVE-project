# ADR-0033 — `INTAKE_SOURCE_PURGE_AND_REINGEST` : dépollution atomique d'une source intake

**Date** : 2026-05-03
**Status** : Accepted
**Auteurs** : NEFER (PR-B)
**Supersede** : —
**Lié** : [ADR-0028](0028-strategy-archive-2-phase.md) (anti-foot-gun pattern), [ADR-0032](0032-source-certainty-and-intake-artifact-persistence.md) (origin marker)

---

## 1. Contexte

L'intake produit parfois des données incorrectes : hallucinations IA (cf. ADR-0030 PR-Fix-2 "française" sur strategy WK), confusion de secteur, formulaire mal compris, OCR foiré sur un PDF uploadé. Avant cette ADR, l'opérateur n'avait que **3 leviers décorrélés** pour s'en sortir, avec des effets de bord :

1. `quickIntake.regenerateAnalysis` (admin) — re-score depuis les responses sans toucher la source. Rate uses : la source polluée reste en place et continue d'alimenter Notoria/Artemis.
2. `ingestion.deleteSource` — hard delete manuel via cockpit. Mais perd les responses canoniques + ne touche pas le BrandAsset INTAKE_REPORT (post-ADR-0032) + ne reset pas les piliers ADVE.
3. `brand-vault.purge` (admin) — delete BrandAsset par batch d'IDs. Sépare encore plus l'opération.

Aucun de ces leviers n'est **atomique** : entre 2 mutations, le système est dans un état incohérent (source supprimée mais asset survit, ou pillar reseté mais source toujours là). Pas d'audit trail unifié non plus.

Le besoin opérateur formulé est clair : *"en cas d'erreur d'intake, on doit pouvoir dépolluer la source"* — un bouton, une transaction, un audit log.

## 2. Décision

Introduire un nouvel Intent Mestor `INTAKE_SOURCE_PURGE_AND_REINGEST` qui orchestre en **un seul appel atomique** :

1. Validation pré-transaction (read-only) :
   - Strategy existe.
   - Source existe ET appartient à la strategy.
   - Source a `origin` qui commence par `"intake:"` (refus explicite des sources non-intake — l'opérateur doit utiliser `ingestion.deleteSource` pour les autres).
   - QuickIntake pointé par `origin="intake:<id>"` existe (refus si dangling, on ne peut pas re-ingérer ce qu'on n'a plus).
   - **Anti-foot-gun** : `confirmName` doit égaler `Strategy.name.toUpperCase()` (mirror du pattern ADR-0028).

2. Transaction Prisma `$transaction` :
   - `BrandDataSource.delete` sur la row polluée.
   - `BrandAsset.deleteMany` sur `kind=INTAKE_REPORT` pour cette strategy (idempotent — `deleteMany` ne raise pas si 0 row, utile pour les strategies admin-converted pré-ADR-0032 qui n'en ont pas).
   - `Pillar.updateMany` sur `key in ADVE_KEYS` : `content={}, confidence=null, validationStatus="DRAFT"`. RTIS rows intouchés (dérivés, marqués stale par le prochain ENRICH).
   - `BrandDataSource.create` recrée une source fraîche depuis `intake.responses + rawText` (même structure que `activateBrand` produit, avec `processingStatus="EXTRACTED"` pour signaler "prêt pour ingestion.process").

3. Output : pour audit trail (consommé par `IntentEmission.result`).

## 3. Surface API

### Intent kind canonical

```ts
// src/server/governance/intent-kinds.ts
{
  kind: "INTAKE_SOURCE_PURGE_AND_REINGEST",
  governor: "MESTOR",
  handler: "quick-intake",
  async: false,
  description: "...",
}
```

### Typed payload (mestor/intents.ts)

```ts
| {
    kind: "INTAKE_SOURCE_PURGE_AND_REINGEST";
    strategyId: string;
    operatorId: string;
    sourceId: string;          // BrandDataSource.id (must be origin="intake:...")
    confirmName: string;       // Strategy.name uppercase echo
  };
```

`intentTouchesPillars` retourne `["a","d","v","e"]` (l'Intent reset effectivement les pillars ADVE, donc le système de propagation staleAt sait que les RTIS dépendants sont à recalculer).

### tRPC mutation (router quick-intake)

```ts
purgeAndReingest: auditedAdmin
  .input(z.object({
    strategyId: z.string().min(1),
    sourceId: z.string().min(1),
    confirmName: z.string().min(1, "confirmName required (anti-foot-gun)"),
  }))
  .mutation(async ({ ctx, input }) => {
    const result = await mestorEmitIntent({ kind: "INTAKE_SOURCE_PURGE_AND_REINGEST", ... }, { caller: "quick-intake.purgeAndReingest" });
    if (result.status !== "OK") {
      throw new TRPCError({
        code: result.reason === "CONFIRM_NAME_MISMATCH" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
        message: result.summary,
      });
    }
    return result.output;
  })
```

`auditedAdmin` gate (admin role + audit trail), conforme aux 3 lois NEFER : pas de bypass governance, audit trail systématique, et anti-foot-gun.

### UI cockpit `/cockpit/brand/sources`

- Bouton `RefreshCw` orange à côté du bouton delete, **visible uniquement** sur les sources avec `origin` commençant par `"intake:"`.
- Click ouvre `Modal` (`@/components/shared/modal`) qui :
  - Liste l'effet de l'opération (delete source, delete BrandAsset INTAKE_REPORT, reset ADVE pillars, recreate fresh source).
  - Affiche le brand name attendu uppercase.
  - Input contrôlé pour `confirmName`. Bouton désactivé tant que `purgeConfirmName.toUpperCase() !== expectedName`.
  - Affiche les erreurs serveur inline (notamment `CONFIRM_NAME_MISMATCH` si le client a oublié de re-valider).

## 4. Service & dispatch

- `src/server/services/quick-intake/purge-and-reingest.ts` (nouveau) — `purgeAndReingestHandler(intent)` retourne `HandlerResult` standard. `purgeAndReingest(strategyId, sourceId, confirmName)` est l'API interne pour tests + scripts éventuels.
- `src/server/services/artemis/commandant.ts` — case dispatch `INTAKE_SOURCE_PURGE_AND_REINGEST → purgeAndReingestHandler` via lazy import (pattern existant pour les handlers modulaires).

## 5. Garanties

- **Atomicité** : `db.$transaction` autour des 4 mutations (delete source + deleteMany asset + updateMany pillars + create source).
- **Idempotence partielle** : si la transaction est ré-exécutée après succès, `BrandDataSource.delete` sur l'ancien ID throw `RecordNotFound` côté Prisma — l'opérateur voit l'erreur et sait que c'est déjà fait. La nouvelle source créée a un nouvel ID, donc pas de risque de doublon (idempotence "à la activateBrand" non requise ici car l'opération est déclenchée manuellement).
- **Anti-foot-gun layered** : (a) UI désactive le bouton, (b) tRPC re-valide `confirmName.length`, (c) handler re-valide la string égale au name uppercase. Trois couches indépendantes.
- **Préservation upstream** : la `QuickIntake` row n'est **jamais touchée** — c'est la source canonique des responses. Un opérateur peut re-ingérer 100 fois si nécessaire, l'intake reste intact.
- **Auditabilité** : chaque appel est loggé dans `IntentEmission` avec `payload` complet (incluant `sourceId`, `operatorId`, `confirmName`) et `result.output` (incluant `oldSourceId`, `newSourceId`, `pillarsReset`).

## 6. Conséquences

**Positives** :
- Une seule action UI pour un workflow opérateur fréquent et critique.
- Audit trail unifié (1 IntentEmission row = 1 dépollution).
- Reset cohérent : pas de pillars qui survivent à la purge, pas d'asset orphelin.
- Foundation pour une future "auto-purge si certainty=INFERRED + signal de drift" (pas dans cette ADR mais le levier existe).

**Négatives** :
- Hard delete — pas de soft archive intermédiaire (à la ADR-0028). Justifié : la source recréée a la même `rawData` canonique, donc rien de récupérable que les responses brutes (et celles-ci sont déjà préservées dans `QuickIntake`).
- Les éditions opérateur des piliers A/D/V/E sont **perdues** (le purpose est de revenir aux faits canoniques). Documenté dans le modal pour que l'opérateur soit informé.
- RTIS pillars deviennent obsolètes mais pas auto-recalculés — l'opérateur doit relancer `pillar.actualize` ou `notoria.actualizeRT` manuellement. Acceptable : RTIS cascade prend 30-60s, on ne veut pas la chaîner automatiquement à chaque purge.

**Neutres** :
- Pas de migration DB (utilise `BrandDataSource.origin` ajouté en ADR-0032).
- Pas de feature flag : la mutation est admin-gated et le bouton n'apparait que sur les rows intake-origin.

## 7. Anti-drift

- `intentTouchesPillars` switch couvre exhaustivement le nouveau kind (TS exhaustivity check via `tsc --noEmit`).
- `commandant.ts` switch couvre exhaustivement le nouveau case (idem).
- `INTENT_KINDS` array expose le kind avec metadata complet (gouvernor MESTOR, handler quick-intake) — picked up par le dashboard governance + audits CI.
- Réutilise la cascade existante (Mestor.emitIntent → Artemis.commandant.execute → handler) — aucun shortcut.

## 8. Suite

- Future ADR éventuelle : extension du même pattern aux sources non-intake (`ingestion.purgeAndReingest` générique pour les uploads PDF/DOCX qui ont mal extrait). Pour l'instant `ingestion.deleteSource` + ré-upload manuel suffit pour ces cas.
- Si on observe un usage massif, ajouter un bouton "Re-extract sans purger" qui ne reset que les pillars sans toucher à la source — utile quand les responses sont OK mais l'extraction a foiré.
