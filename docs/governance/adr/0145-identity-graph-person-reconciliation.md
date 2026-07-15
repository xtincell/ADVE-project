# ADR-0145 — Identity Graph : réconciliation déterministe d'une personne

- **Status** : Accepted
- **Date** : 2026-07-15
- **Phase** : Chantier « Graphes & Scoreur à force révélée » (C1/3) — brief opérateur 137f4f21. Fonde l'arène E du scoreur (ADR-0147) : superfans dédupliqués par personne.
- **Depends on** : ADR-0141 (gates superfan stricts), ADR-0126 (anti-inflation), ADR-0124 (spine d'émission), ADR-0060 (manual-first), ADR-0046 (no-magic-fallback / P22-2)
- **Supersedes** : —

## Contexte

Une même personne apparaît sur Instagram, Facebook, par email d'achat, sous des
pseudos différents — et compte aujourd'hui comme **N `SuperfanProfile` distincts**,
double-comptés, avec un « a payé » (gate PAID, ADR-0141) qui ne peut se rattacher à
personne réelle. Le bras superfan du plafond d'évidence CULTE/ICONE (ADR-0126) est
donc gonflable par de la fragmentation. `grep -i "PersonIdentity\|identity graph"
docs/governance/CODE-MAP.md` → négatif : aucune entité de réconciliation de personne
n'existe. On crée (justifié), on n'étend pas — mais on **branche** sur l'existant
(`SuperfanProfile`, le single-writer `superfan-ingest`).

## Décision

### 1. Modèle domaine (`src/domain/identity-graph.ts`, pur zéro-LLM zéro-IO)

Normalisation déterministe pré-match + échelle de précédence de fusion (D12) :

| Kind | Normalisation | Force |
|---|---|---|
| EMAIL | minuscules ; Gmail : points + plus-addressing neutralisés | fort |
| PHONE | E.164 best-effort (garde `+`, chiffres, < 6 → null) | fort |
| HANDLE | minuscules, `@` retiré, scopé plateforme au match | faible |
| EXTERNAL_ID / DEVICE | trim + minuscules | fort / — |

Précédence : **DECLARED > VERIFIED > INFERRED**. `mergeVerdictForSharedIdentifier` :
identifiant **fort + (VERIFIED|DECLARED)** partagé → `AUTO_MERGE` ; sinon (faible, ou
fort mais INFERRED) → `CANDIDATE` (revue humaine, jamais fusion auto). Conflit
(`isStrongConflict`) : deux emails/tels forts vérifiés **distincts** → refus, drapeau.

### 2. Modèle Prisma (additif, backfill-safe — migration `20260715013017`)

- `PersonIdentity { id, strategyId, displayName?, primaryHandle?, mergedIntoId? }` —
  scopé marque, JAMAIS cross-marque. `mergedIntoId` = tombstone réversible.
- `PersonIdentifier { personId, strategyId, kind, matchHash, displayCipher?, platform?, source, confidence }`
  avec `@@unique([strategyId, kind, matchHash])` (un identifiant fort = une personne).
- `SuperfanProfile.personId String?` nullable — le profil reste l'observation par
  réseau (clé `strategyId·platform·handle` inchangée), la personne est l'unification.

### 3. PII (non négociable, brief §6)

`matchHash` = **HMAC-SHA256** déterministe de la clé logique normalisée (match,
irréversible) ; `displayCipher` = **AES-256-GCM** (affichage opérateur). Même clé que
les tokens OAuth (`sha256(INTEGRATION_TOKEN_KEY)`, `pii-crypto.ts`). La valeur en
clair n'est **jamais** persistée ni mise dans une `IntentEmission` : la porte
`identity.upsertIdentifier` émet via le **spine** (ADR-0124) un payload REDACTÉ
(fingerprint 12 hex du matchHash) — précédent `accounts.createBrandLogin` (ADR-0140).

### 4. Single-writer + gouvernance (SESHAT, cap APOGEE 7/7 préservé)

`src/server/services/seshat/identity-graph/index.ts` = LE seul écrivain de
`PersonIdentity`/`PersonIdentifier` et du rattachement `personId` (verrou HARD
`identity-graph-single-writer.test.ts`). 3 Intent kinds gouverneur SESHAT +
SLO déterministe (`costP95Usd: 0`) :

- `SESHAT_UPSERT_PERSON_IDENTIFIER` (porte PII → spine redacté)
- `SESHAT_MERGE_PERSONS` (auto si VERIFIED dans l'upsert ; porte explicite `requireOperator`)
- `SESHAT_SPLIT_PERSON` (`requireOperator`, réversible)

Anti-inflation vérifié **en transaction** : `mergePersons` compte les personnes
actives avant/après et `throw` si le compte augmente (`mergePreservesMonotonicity`).

### 5. Bridge PAID

`bridgePaidFromCommerceEmail(email)` : normalise → `matchHash` → résout la personne
(suit le tombstone) → pose `conditions:{PAID}` sur ses `SuperfanProfile` via le
single-writer `registerSuperfanProfile` existant. Email inconnu → `matched:false`,
zéro profil fabriqué (P22-2).

## Conséquences

- Fin du double-comptage : une personne = un superfan, pas trois. Fusion monotone
  décroissante (ADR-0126 respecté par construction).
- Le gate PAID devient rattachable à une personne réelle (email de commande).
- 0 LLM (LOI 9), single-writer + test HARD, migration additive nullable, cap 7/7.

## Dette (incréments suivants)

- Persistance des candidats de fusion INFERRED (aujourd'hui renvoyés au résultat,
  pas stockés) → table `PersonMergeCandidate` + file de revue console.
- `splitPerson` fin (re-scission des arêtes re-pointées) — aujourd'hui ré-active le
  tombstone sans re-router les identifiants déplacés.
- Câblage du bridge PAID au cron commerce (ADR-0132) — service prêt, appelant à poser.
- Cascade `/data-deletion` sur les `PersonIdentifier` (PII).
