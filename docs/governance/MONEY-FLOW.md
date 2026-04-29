# MONEY-FLOW — Comment l'argent circule dans La Fusée

L'OS d'UPgraders n'est pas seulement une mécanique de transformation de marques — c'est aussi un **flux financier** entre 4 rôles. Cette doc cartographie ce flux pour qu'aucune décision technique ne le casse silencieusement.

Sous-système APOGEE concerné : **Operations** (Ground Tier).

À lire avant : [APOGEE.md §4.5](APOGEE.md), [SERVICE-MAP.md §5](SERVICE-MAP.md).

---

## Les 4 rôles + escrow

```
        ┌──────────────────┐
        │     FOUNDER      │    paie un retainer mensuel à UPgraders ;
        │  (brand owner)   │    paie aussi des missions ad-hoc en escrow.
        └────────┬─────────┘
                 │ retainer mensuel + escrow missions
                 ▼
        ┌──────────────────┐
        │    UPGRADERS     │    encaisse, retient sa commission,
        │ (industry agent) │    redistribue vers les exécutants.
        └────────┬─────────┘
                 │ commission split + paiement de mission
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   AGENCIES   │   │   CREATORS   │
│  (partners)  │   │ (freelances) │
└──────────────┘   └──────────────┘

  ↑ escrow custodian (bank or mobile-money provider) sits between
    Founder and Creators when a mission is paid directly.
```

---

## Les 5 transactions canoniques

Chaque transaction a son service backend et son router tRPC. Toutes traversent **Operations** (Ground Tier APOGEE).

### Transaction 1 — Retainer mensuel (Founder → UPgraders)

- **Pourquoi** : couvre l'accès Cockpit + le suivi UPgraders + l'usage Mestor/Artemis/Seshat.
- **Ce qui le déclenche** : `crm-engine.ensureRetainerActive()` cron mensuel.
- **Ce qui le persiste** : table `Subscription` ou équivalent (Prisma).
- **Ce qui le facture** : `value-report-generator` produit le rapport de valeur du mois ; `financial-engine.invoiceRetainer()` crée la facture.
- **Ce qui le collecte** : `mobile-money` ou Stripe selon pays.
- **Ce qui le mesure** : `socle/revenue` page (Console).

### Transaction 2 — Mission ad-hoc (Founder → Escrow → Creator)

- **Pourquoi** : un livrable creative spécifique (KV, post, photo, vidéo) hors retainer.
- **Ce qui le déclenche** : Founder publie un brief depuis Cockpit `/operate/briefs`.
- **Ce qui le persiste** : `Mission` (Prisma) avec `escrowAmount` + `escrowStatus`.
- **Lifecycle** :
  1. Founder crée la mission → fonds bloqués en escrow (`escrow:HELD`).
  2. Creator livre → QC peer ou senior valide.
  3. QC OK → `escrow:RELEASED` → Creator reçoit le net (commission UPgraders déduite).
  4. QC KO → renégociation ou `escrow:REFUNDED`.
- **Pages** : `/cockpit/operate/missions`, `/creator/missions/active`, `/console/socle/escrow`.

### Transaction 3 — Commission UPgraders (split sur missions)

- **Pourquoi** : UPgraders prend une commission pour le matching + QC + médiation.
- **Taux** : configurable par operator (ex: 15% creator paid, 5% agency paid, 0% pour missions du retainer).
- **Service** : `commission-engine.split({ missionAmount, role, operator })` retourne le breakdown.
- **Persisté** : `Commission` Prisma (montant, taux, role).
- **Route** : `socle/commissions` Console.

### Transaction 4 — Sub-traitance Agency (UPgraders → Agency)

- **Pourquoi** : UPgraders délègue une partie d'une mission à une agence partenaire (RP, événementiel, production).
- **Ce qui le déclenche** : `team-allocator.assignToAgency(missionId, agencyId)`.
- **Persisté** : `AgencyContract` + lignes de `Commission`.
- **Lifecycle** : agence livre → UPgraders QC → paiement agence.
- **Pages** : `/agency/contracts`, `/agency/missions`, `/agency/revenue`.

### Transaction 5 — Upsell détecté (Founder → UPgraders)

- **Pourquoi** : `upsell-detector` repère un signal (palier promu, secteur en boom, deadline conference) et propose un retainer supérieur ou une mission spéciale.
- **Ce qui le déclenche** : cron `upsell-detector.scan()` weekly.
- **Persisté** : `UpsellOpportunity` Prisma + notification au Founder.
- **Conversion** : Founder accepte → nouveau Subscription tier OU mission ad-hoc.

---

## Les services Operations qui le portent

Cf. [SERVICE-MAP.md §5](SERVICE-MAP.md). Récap court :

| Service | Rôle dans le money flow |
|---|---|
| `commission-engine` | Calcule les splits |
| `financial-engine` | Logique de facturation, taux, devises |
| `financial-reconciliation` | Réconcilie transactions multi-source |
| `mobile-money` | Rails de paiement Orange/MTN/Wave |
| `crm-engine` | Gère l'état contractuel (retainer actif, expiré, suspendu) |
| `upsell-detector` | Signaux d'opportunité commerciale |
| `value-report-generator` | Justifie le retainer (livrable de valeur) |
| `data-export` | Exports comptables (CSV, journal) |

---

## Pages UI mappées

Console (UPgraders / Mission Control) :
- `/console/socle/commissions` — vue des commissions par mission
- `/console/socle/contracts` — contrats clients + agences
- `/console/socle/escrow` — escrow status par mission
- `/console/socle/invoices` — factures émises
- `/console/socle/pipeline` — pipeline commercial (deals en cours)
- `/console/socle/revenue` — revenu rolling
- `/console/socle/value-reports` — rapports valeur livrés clients

Cockpit (Founder) :
- `/cockpit/new` — onboarding + activation retainer
- `/cockpit/operate/briefs` — création missions
- (paiement retainer via lien externe ou portail provider)

Agency :
- `/agency/clients` — clients gérés via UPgraders
- `/agency/commissions` — vue commissions agence
- `/agency/contracts` — contrats avec UPgraders
- `/agency/revenue` — revenu rolling agence

Creator :
- `/creator/earnings/history` — historique paiements
- `/creator/earnings/invoices` — factures
- `/creator/earnings/missions` — missions facturées
- `/creator/earnings/qc` — QC bloquant le paiement

---

## Devises & internationalisation

- Devise par défaut : **XAF** (CFA central africain — Cameroun-based).
- Multi-devise : tableau `country-registry.currencyByCountry` ; conversion appliquée par `financial-engine.convert()`.
- Taux de change : externe (API Open Exchange Rates ou Frankfurter).

Cf. `country-registry/manifest.ts` pour la liste pays-devise supportés.

---

## Garde-fous (post-conditions financières)

Toute capability Operations qui écrit un montant doit déclarer ces post-conditions (cf. [APOGEE.md §6.2](APOGEE.md) et `src/server/governance/post-conditions.ts`) :

- `amount-positive` — pas de montants négatifs hors avoirs explicites
- `currency-known` — devise dans le registre
- `commission-le-mission` — commission ≤ mission amount
- `escrow-balance-conserved` — total escrow balance ne diminue pas sans paiement matching

Sans ces post-conditions, le risque est silencieux : un round à 0.0001 USD peut faire dériver les comptes sur 12 mois, et la confiance founder s'effondre.

---

## Mission contribution

Tout le money flow est **Ground Tier — Operations**. `missionContribution = "GROUND_INFRASTRUCTURE"` avec `groundJustification` :

> "Sans Operations, UPgraders ne facture pas → ne survit pas → aucune brand n'atteint son apogée. La masse superfan d'une marque dépend de la durée d'opération de l'OS, qui dépend du flux financier qui dépend d'Operations."

C'est la chaîne mission validée par `audit-mission-drift.ts`.

---

## À surveiller (anti-dérive)

- Nouveau service Operations sans manifest declared `missionContribution` = bloqué CI.
- Modification des taux de commission sans ADR = bloquée par `phase-label-check`.
- Schéma Prisma `Subscription` / `Commission` / `Escrow` modifié sans migration versionnée = bloqué par `prisma-validate`.
- `financial-reconciliation` produisant divergence > 0.01% sur rolling 7d = alerte (cron P6).
