# ADR-0011 — Anubis, 7ème Neter (Comms — pré-réservé Phase 8+)

**Date** : 2026-04-30 (pré-réservation), 2026-05-01 (activation effective Phase 8+)
**Statut** : **implemented** — actif depuis mai 2026 (Phase 8+ wakeup, PR #28)
**Phase de refonte** : phase/12 (sprint mega Imhotep + Anubis post-seed wakeup)

## Contexte

Le sous-système **Comms** ([APOGEE §4.7](../APOGEE.md)) est explicitement décrit comme léger Phase 1 ("sa sophistication arrive en P5+ avec NSP"). Mais la roadmap couvre des fonctions massives à terme : messaging cross-portail (Console/Cockpit/Agency/Creator), notifications, ad networks (Meta Ads / Google Ads / TikTok Ads), social posting (Twitter/X / LinkedIn / TikTok / Instagram), broadcast email/SMS (Resend / Twilio / MailerSend).

Sans Neter de tutelle, ces fonctions vont s'éparpiller dans des routers tRPC qui contournent Mestor (drift attendu). Avec Ptah à 5 (ADR-0009) et Imhotep à 6 (ADR-0010), le slot 7 est le dernier disponible avant le plafond APOGEE (§9). **Le réserver maintenant fige le naming canonique**.

## Décision

**Pré-réserver Anubis comme 7ème Neter du panthéon**, gouverneur du sous-système Comms (Ground Tier). Implémentation effective différée à Phase 8+ (quand Comms commencera à inclure ad networks ou social posting de volume).

### Mythologie

**Anubis** = psychopompe égyptien, guide les âmes entre les mondes, gardien des secrets, préside à l'embaumement (préservation/transmission). Couvre exactement la fonction Comms : transmission entre les ponts (Mission Control / Cockpit / Crew Quarters / Launchpad), envoi de messages externes (ad networks, email/SMS, social posting), ouverture des canaux. Cohérent avec le panthéon égyptien dominant (Seshat, Thot, Ptah, Imhotep).

Alternatives évaluées et rejetées :
- *Hermes* — équivalent fonctionnel grec (messager olympien), mais redonde sur le registre grec déjà occupé par Mestor/Artemis.
- *Hapi* — dieu du Nil, circulation des eaux. Trop géographique, manque la dimension "secrets/transmission".
- *Iris* — messagère grecque secondaire. Trop mineure mythologiquement.

### Position dans APOGEE

Anubis gouverne **Comms** ([APOGEE §4.7](../APOGEE.md)). Pas de modification structurelle d'APOGEE.

### Fonction de gouvernance distincte

- **Décide quand un message est émis**, vers quel canal, à qui, avec quelle priorité.
- **Régule les diffusions massives** (ad networks campaign creation, broadcast email, push notifications volume).
- **Garde l'historique** de toute communication (audit forensic).
- **Détecte les fuites Overton** (diffusion non alignée au mode stratégique → signal drift à Mestor).

Pas chevauchement avec Seshat (qui *observe* les signaux entrants ; Anubis *émet* les signaux sortants).

### Co-gouvernance Anubis × Thot pour ad networks

Les ad networks (Meta Ads, Google Ads, TikTok Ads) engagent des budgets concrets (CPM, CPC). Anubis émet les campagnes ; Thot doit valider le budget avant que la campagne ne soit lancée :

```
mestor.emitIntent({ kind: "ANUBIS_LAUNCH_AD_CAMPAIGN", payload, strategyId })
  → Mestor preflight :
      → THOT_CHECK_CAPACITY (budget disponible ?)
      → MANIPULATION_COHERENCE (mode aligné avec Strategy.manipulationMix ?)
      → ANUBIS_AUDIENCE_TARGETING_VALID (segments existent ?)
  → Anubis.handleIntent
  → Anubis lance la campagne via provider (Meta Marketing API / Google Ads API / TikTok Ads API)
  → ai-cost-tracker.track(provisionalSpend)
  → emit AD_CAMPAIGN_LAUNCHED (Seshat capte signal)
```

Pattern analogue à la séquence Artemis→Ptah pour les forges, mais sur l'axe transversal Comms/Sustainment.

### Téléologie — comment Anubis sert l'apogée

KPI primaire des campagnes Anubis = `cost_per_superfan_recruited`, **pas** reach / CTR / CPM / CPC. Tables de tracking attribution : ad campaign → click → conversion → palier devotion ladder atteint. Thot vetoe campagne si KPI projeté > seuil sectoriel pour le manipulation mode déclaré.

Sans cet ancrage téléologique, Anubis optimiserait pour la diffusion brute (vues, clics) — pas pour l'accumulation de superfans.

### Manipulation Matrix

Anubis route les campagnes selon le mode demandé :
- *peddler* — paid search, retargeting agressif, urgence
- *dealer* — push notifs récurrentes, séries email, drop timing
- *facilitator* — newsletters utiles, content syndication, guides
- *entertainer* — earned media, viral plays, brand storytelling, partenariats culturels

### Services à mettre sous tutelle Anubis (à l'activation Phase 8+)

- Existant `email/` — extension vers MailerSend/Resend
- Nouveau `messaging-orchestrator/` — fil cross-portail (Console/Cockpit/Agency/Creator)
- Nouveau `notification-dispatcher/` — push/in-app notifications, drift alerts
- Nouveau `social-publishing/` — Twitter/X, LinkedIn, TikTok, Instagram posting + scheduling
- Nouveau `media-activation-engine/` (co-gouverné Anubis + Thot) — Meta Ads, Google Ads, TikTok Ads campaign creation, bidding
- Nouveau `sms-broadcast/` — Twilio + équivalents africains (Africa's Talking, Vonage)

### Manifest (à l'implémentation Phase 8+)

```typescript
{
  service: "anubis",
  governor: "MESTOR",
  acceptsIntents: [
    "ANUBIS_DISPATCH_MESSAGE",
    "ANUBIS_BROADCAST",
    "ANUBIS_LAUNCH_AD_CAMPAIGN",
    "ANUBIS_PUBLISH_SOCIAL",
    "ANUBIS_SCHEDULE_DROP",
  ],
  emits: ["MESSAGE_DISPATCHED", "AD_CAMPAIGN_LAUNCHED", "SOCIAL_POST_PUBLISHED", "BROADCAST_SENT"],
  dependencies: ["financial-brain", "ptah", "seshat", "oauth-integrations"],
  missionContribution: "DIRECT_SUPERFAN",  // diffusion = contact direct propellant
  missionStep: 4,  // Gravité
}
```

`BRAINS` const déjà étendu à `[..., "ANUBIS", ...]` dans la même PR que ADR-0009.

### Drift signal

Cron `audit-anubis-conversion.ts` flagge campagnes qui consomment du budget Thot mais ne convertissent pas en devotion ladder up-step. Si `cost_per_superfan_recruited > 2× benchmark sectoriel` sur 30 jours → recalibrage des audiences ou du mode.

### Activation

Phase 8+ déclenchée quand :
- Au moins une brand active commence à activer paid media (signal commercial)
- Volume de notifications cross-portail >1000/jour (messaging orchestrator devient utile)
- OAuth scopes ad networks (Google Ads, Meta) ont été obtenus en production

Avant ces seuils, le service `email/` existant reste gouverné par MESTOR sans Neter Anubis — analogue à Notoria aujourd'hui.

## Conséquences

### Positives

- **Naming canonique figé** — pas de "Hermes Comms" ou "Iris Messenger" surgissant à l'improviste.
- **Plafond 7 Neteru atteint** avec Ptah (5) + Imhotep (6) + Anubis (7). Croissance verticale fermée — toute fonction nouvelle s'absorbe dans un Neter existant ou requiert un ADR de relèvement de plafond.
- **Co-gouvernance Anubis×Thot pré-pensée** — pattern réutilisable pour d'autres co-gouvernances futures.

### Négatives

- **Pré-réservation longue** (Phase 8+ peut prendre 6-12 mois). Risque de re-débat. Mitigation : ce document est le verdict final ; toute remise en question = ADR de superseding.
- **`BRAINS` const contient un nom non encore implémenté** — propre mais décale la cohérence test/prod.

## Alternatives considérées

1. **Pas de Neter pour Comms** — Comms reste fragmenté entre Artemis (qui pourrait diffuser ce qu'il produit) et Thot (cost gate ad). Rejeté : la fonction de routing/scheduling/audience-targeting est distincte de "produire" et "facturer".
2. **Hermes** — registre grec déjà occupé.
3. **Implémenter immédiatement Phase 2** — coût élevé vs valeur. Aujourd'hui email/ stub fonctionne ; pas d'ad networks actifs. Activation est *demand-driven*.

## Lectures

- [PANTHEON.md §2.7](../PANTHEON.md) — fonction Anubis, contribution mesurable, drift signal
- [APOGEE.md §4.7](../APOGEE.md) — Comms sub-system
- [ADR-0009](0009-neter-ptah-forge.md) — Ptah Forge (5ème Neter)
- [ADR-0010](0010-neter-imhotep-crew.md) — Imhotep Crew (6ème Neter pré-réservé)
- [MANIPULATION-MATRIX.md](../MANIPULATION-MATRIX.md) — comportement Anubis par mode
