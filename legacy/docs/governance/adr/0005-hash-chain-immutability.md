# ADR-0005 — Hash-chain sur `IntentEmission` pour audit immuable

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/3

## Contexte

L'audit trail `IntentEmission` est central : Mestor logge tous les Intents pour replay, compliance, debug. Mais une simple table SQL est altérable — un admin compromis ou un bug de migration peut modifier discrètement une ligne. Pour les flux financiers (Thot) et les certifications de livrables (Oracle), c'est inacceptable.

## Décision

Chaque ligne `IntentEmission` calcule à l'écriture :
- `selfHash = sha256(canonicalRow + prevHash)`
- `prevHash` = `selfHash` du dernier row du même `strategyId`

La chaîne est partitionnée par `strategyId` (perf + isolation). Le job hebdo `verify-hash-chain.ts` walk les 1000 derniers rows par strategy et fail si un hash diverge.

Toute correction d'un Intent passe par `CORRECT_INTENT` qui référence l'original — l'original n'est **jamais** modifié.

## Conséquences

**Positives** :
- Tampering détectable, alerte critique en cron.
- Replay déterministe garanti.
- Compliance financière (Thot) sereine.

**Négatives** :
- 32 bytes de hash × 2 par row.
- Migration de bases existantes : recompute les hashes (rétroactif via script).

**Enforcement** :
- `scripts/verify-hash-chain.ts` (cron weekly).
- `governance-drift.yml` workflow surveille.

## Alternatives considérées

1. **Pas de hash-chain, juste audit log SQL** : trop fragile pour le financier.
2. **Blockchain externe** : overkill, coût, latence.
3. **Append-only log file** : ne s'intègre pas avec le query Postgres.

## Lectures

- src/server/governance/hash-chain.ts
- prisma/schema.prisma (`IntentEmission.prevHash`, `selfHash`)
