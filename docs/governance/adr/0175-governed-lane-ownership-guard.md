# ADR-0175 — Garde d'ownership de marque sur la voie gouvernée + IDOR vault + anti-prototype-pollution

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Audit adversarial (boucle de fix — alignement produit↔intention)
- **Depends on** : ADR-0166 (gardes d'ownership par marque), ADR-0124 (spine d'émission)
- **Supersedes** : —

## Contexte

L'audit adversarial exhaustif (12 auditeurs) a prouvé une classe de fuite **CRITIQUE cross-tenant** que le durcissement P0 (ADR-0166) avait laissée ouverte : il ne couvrait que la voie `protectedProcedure` en LECTURE (scan `strategyId`), en **exemptant explicitement `governedProcedure`** — la voie de mutation founder.

Trois trous confirmés, exploitables par tout compte authentifié :

1. **`governedProcedure` sans `requireOperator`** (~90 procédures : `pillar.updateFull/updatePartial/addProduct/addPersona/…`, `glory.execute*`, `signal.create`, `jehuty.curate`, `notoria.generateBatch`, `framework.execute`, `market-intelligence.*`, `media-buying.*`, `brand-node.*`…) n'appliquait **aucun** `canAccessStrategy`. Le firewall collaborateur (ADR-0131) est un no-op pour les non-collaborateurs → aucune garde effective. Un founder passait le `strategyId` d'un autre tenant et écrasait ses piliers ADVE (tout l'aval — Oracle, score, palier — cascade). `strategy-presentation.shareLink` (même voie) mintait un token public pour n'importe quelle marque → **exfiltration de l'Oracle complet** d'un autre tenant.
2. **`brand-vault.*` indexé par ID D'ACTIF** (`get`/`updateTags`/`delete`/`purge`/`supersede`/`archive`/`promoteToActive`/`selectFromBatch`) : invisibles au scan `strategyId` (pas de `strategyId` de tête). Lecture/suppression (dont `purge` = **hard delete**) du vault de n'importe quel tenant par id d'actif.
3. **Empoisonnement de prototype** : `pillar.amend` accepte un `field` libre non-allowlisté propagé jusqu'à `setNestedValue`. Un `field="__proto__.polluted"` remontait dans `Object.prototype` (empoisonnement GLOBAL, tous tenants, tout le process, jusqu'au restart).

## Décision

**Alignement, pas d'innovation** : on applique le chokepoint d'accès canonique existant (`canAccessStrategy`, ADR-0166) là où il manquait, sans nouvelle machinerie.

1. **Garde middleware sur `governedProcedure`** (`src/server/governance/governed-procedure.ts`) : dès qu'un `strategyId` figure en tête d'input (et hors kinds PUBLICS Guilde ADR-0098), on exige `canAccessStrategy(strategyId, {userId, operatorId, role})` **avant** `preEmitIntent` (fail-fast, pas de bruit d'audit). ADMIN / propriétaire / même opérateur / collaborateur ACTIVE passent — la sémantique d'isolation multi-tenant existante, appliquée uniformément.
2. **Gardes par actif** (`src/server/trpc/routers/brand-vault.ts`) : helper `assertBrandAssetAccess` qui résout la marque de l'actif puis applique `canAccessStrategy` sur chaque procédure indexée par id d'actif (`purge` vérifie chaque actif, ne supprime que les accessibles).
3. **Garde anti-prototype-pollution** (`pillar-gateway/setNestedValue` + copie `pillar-maturity/auto-filler`) : `assertSafePillarPath` lève sur un segment `__proto__`/`constructor`/`prototype`. Refus net, jamais d'écriture silencieuse à côté.

## Conséquences

- La voie `governedProcedure` n'est plus exemptée « par confiance » : la garde middleware est **vérifiée par le test** `strategy-ownership-guard.test.ts` (présence de `canAccessStrategy` avant `preEmitIntent`), + couverture des procédures vault par id, + test runtime `pillar-path-proto-pollution.test.ts` (la garde lève et ne pollue jamais `Object.prototype`).
- Coût : une requête `canAccessStrategy` par mutation gouvernée porteuse d'un `strategyId` (chemin de mutation, pas de lecture chaude — acceptable pour fermer une fuite cross-tenant).
- Cap APOGEE 7/7 préservé. 0 modèle Prisma, 0 LLM, 0 nouvelle capacité — durcissement d'accès pur.
