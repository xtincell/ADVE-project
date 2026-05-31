# C2 — 🔴 Doctrine de données & souveraineté

> **Chantier C — chapitre 2.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.2. **État actuel : PARTIEL.**
> `campaign-tracker/agency-economics.ts` (k-anonymity k≥5 ✅, marges agence), `campaign-tracker/souverainete.ts` ✅,
> `Operator.dataRegion String @default("eu-west")` (l.664).

## C2.0 — Décisions (cahier Ch.2)

Opt-in **explicite** signal pool (désactivé par défaut) ; **k≥5** ; résidence **par tier** + **Brand Vault
souverain** quel que soit le tier ; conformité **par zone du sujet** ; effacement **off-chain** (chaîne = empreintes).

## C2.1 — ⚠️ Drift à corriger d'abord

`Operator.dataRegion @default("eu-west")` — défaut **européen** sur un produit **Afrique francophone**.
Corriger le défaut vers une **zone africaine de référence** (cahier §2.1) ; `"eu-west"` reste une valeur
admissible (diaspora), pas le défaut.

## C2.2 — Modèles Prisma

```prisma
model SignalPoolConsent {                 // opt-in explicite, défaut OFF
  id String @id @default(cuid())
  strategyId String @unique
  optIn Boolean @default(false)
  grantedAt DateTime?; revokedAt DateTime?
  byOperatorId String; prevHash String?; selfHash String?   // acte tracé + chaîné
}
// Réutilise agency-economics k-anonymity (k≥5) pour le pool cross-brand (étendre, ne pas doubler)
```

Résidence : étendre `Operator.dataRegion` + un flag `brandVaultSovereign Boolean @default(true)` (plancher
souverain Brand Vault). **zone-legal** = nouvelle famille d'indices Seshat (frère d'E3, cahier §2.7).

## C2.3 — Garanties

- **k≥5** avant qu'un pattern n'entre au pool (réutiliser le seuil existant `agency-economics.ts`).
- **Jamais** au pool : piliers ADVE en clair, assets identifiables, **Brand Vault** (PII superfans).
- **Effacement vs hash-chain** : PII **off-chain** effaçable ; `IntentEmission` ne porte **que** des empreintes — **vérifier** qu'aucune PII n'y est en clair (audit C2).
- **Réciprocité** : miroir sectoriel live réservé aux opt-in.

## C2.4 — Intent + gate + UI

- Intent (SIA) : `SET_SIGNAL_POOL_CONSENT` `{ strategyId, optIn, operatorId }` (acte tracé).
- **Gate `SIGNAL_POOL_GATE`** (SIA) : refuse toute remontée au pool sans `optIn=true` **et** k≥5. HARD.
- UI : clause de consentement Cockpit (cahier §2.6) + carte des données ; toggle opt-in.

## C2.5 — Critères d'acceptation

```
[ ] dataRegion défaut = zone africaine ; brandVaultSovereign=true plancher tous tiers
[ ] SignalPoolConsent opt-in OFF par défaut ; révocable à effet futur (purge lien, pas désapprentissage)
[ ] SIGNAL_POOL_GATE (HARD) : pas de remontée sans opt-in + k≥5
[ ] no-pii-onchain.test.ts : IntentEmission/hash-chain = empreintes only
[ ] zone-legal : famille d'indices Seshat créée (frère E3), actualisée par Wepwawet
```

## C2.6 — Frictions

- **F-C2a.** Hébergement réel / région souveraine = décision d'infra (cahier F-4), hors doctrine.
- **F-C2b.** zone-legal partage la mécanique d'E3 (zone-indices) — mutualiser.
- **F-C2c.** Audit PII-on-chain à mener avant d'affirmer la conformité effacement.
