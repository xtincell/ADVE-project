# ADR-0010 — Imhotep, 6ème Neter (Crew Programs — pré-réservé Phase 7+)

**Date** : 2026-04-30
**Statut** : accepted (pré-réservation — implémentation différée)
**Phase de refonte** : phase/7+ (gated par maturité du sous-système Crew Programs)

## Contexte

Le sous-système **Crew Programs** ([APOGEE §4.6](../APOGEE.md)) — talent-engine, matching-engine, team-allocator, qc-router, tier-evaluator, Académie — est aujourd'hui un agrégat de services L3 sans Neter de tutelle explicite. Sans Neter, ces services peuvent dériver vers des routers tRPC qui contournent Mestor (même classe de drift que `jehuty.ts` / `seshat-search.ts` aujourd'hui en V5.4).

Le plafond APOGEE étant de 7 Neteru et avec Ptah à 5 (ADR-0009), il reste 2 slots. Pré-réserver les slots 6 et 7 par ADR (sans implémenter immédiatement) **fige le naming et le mapping** — empêche les drifts narratifs futurs (un dev qui voudrait nommer un Neter "Hermes" pour Comms se ferait rejeter, Anubis est déjà le slot canonique).

## Décision

**Pré-réserver Imhotep comme 6ème Neter du panthéon**, gouverneur du sous-système Crew Programs (Ground Tier). Implémentation effective différée à Phase 7+ (quand le sous-système Crew Programs aura atteint la masse critique justifiant un Neter dédié).

### Mythologie

**Imhotep** = sage humain égyptien (architecte de la pyramide à degrés de Djéser, vizir, médecin, scribe), déifié à titre posthume. Patron des artisans, scribes, savants, médecins. **Le seul Neter humain divinisé** du panthéon — pertinent pour le sous-système qui gère des humains (talent matching, formation, certifications). Cohérent avec le panthéon égyptien dominant (Seshat, Thot, Ptah).

Alternatives évaluées et rejetées :
- *Hathor* — déesse de l'amour, beauté, musique. Trop spécifique au registre émotionnel/féminin.
- *Bes* — protecteur du foyer. Trop domestique.
- *Heka* — magie créatrice. Déjà évoqué pour Ptah, redondant.

### Position dans APOGEE

Imhotep gouverne **Crew Programs** ([APOGEE §4.6](../APOGEE.md)). Pas de modification structurelle d'APOGEE — un Neter occupe simplement un sous-système Ground Tier qui était orphelin de tutelle.

### Fonction de gouvernance distincte

- **Décide qui peut embarquer** sur quelle mission (matching).
- **Évalue le niveau de talent** suffisant (tier-evaluator).
- **Identifie les manques de formation** (académie/learn).
- **Compose les équipes** optimales (team-allocator).
- **Route le quality control** (qc-router).

Pas chevauchement avec Mestor (qui décide des Intents missions, pas des humains qui les exécutent).

### Téléologie — comment Imhotep sert l'apogée

Le matching ne doit pas être basé uniquement sur la compétence brute, mais sur la **devotion-potential** :

- `Creator.devotionFootprint: Record<sectorId, superfansAcquis>` — historique de superfans recrutés par creator dans chaque secteur.
- `Creator.manipulationStrengths: ManipulationMode[]` — modes d'engagement où le creator excelle (peddler/dealer/facilitator/entertainer).
- Matching prioritise creator avec footprint dans le secteur de la brand + force dans le mode demandé par la mission, pas seulement compétence brute.

Sans cet ancrage téléologique, Imhotep matcherait sur des CV — pas sur la capacité à recruter des superfans.

### Manipulation Matrix

Imhotep adapte son matching selon le `Strategy.manipulationMix` ciblé :
- *peddler* — prioritise creators à conversion rapide (sales-DNA)
- *dealer* — prioritise creators avec récurrence (drops-DNA)
- *facilitator* — prioritise creators éducateurs / formateurs
- *entertainer* — prioritise creators narratifs / artistes

### Manifest (à l'implémentation Phase 7+)

```typescript
{
  service: "imhotep",
  governor: "MESTOR",
  acceptsIntents: [
    "IMHOTEP_MATCH_CREATOR",
    "IMHOTEP_COMPOSE_TEAM",
    "IMHOTEP_EVALUATE_TIER",
    "IMHOTEP_ROUTE_QC",
    "IMHOTEP_RECOMMEND_TRAINING",
  ],
  emits: ["TEAM_COMPOSED", "CREATOR_TIER_PROMOTED", "QC_VERDICT_READY"],
  dependencies: ["talent-engine", "matching-engine", "team-allocator", "qc-router", "tier-evaluator", "seshat"],
  missionContribution: "CHAIN_VIA:artemis",  // crew sert l'exécution mission
  missionStep: 2,  // Engagement
}
```

`BRAINS` const déjà étendu à `[..., "IMHOTEP", ...]` dans la même PR que ADR-0009 pour Ptah (anti-drift narratif).

### Drift signal

Si les missions échouent (`Mission.status = FAILED` mais sans veto Thot), souvent c'est un matching humain défaillant. Cron `audit-crew-fit.ts` corrèle `mission.outcome` avec `team.composition` — flagge si pattern de pertes corrélées à un creator/composition particulière.

### Activation

Phase 7+ déclenchée quand :
- Volume de creators sur la plateforme >100 (matching algorithmique commence à avoir du sens)
- Volume de missions actives >50 simultanées (team-allocator devient utile)
- Académie (formation) opérationnelle au-delà de stub démo

Avant ces seuils, les services existants (`talent-engine/`, `matching-engine/`, etc.) restent gouvernés par MESTOR sans Neter Imhotep dédié — analogue à Notoria/Jehuty aujourd'hui.

## Conséquences

### Positives

- **Naming et mapping figés** — empêche le drift narratif futur. Un dev ne peut pas nommer un nouveau service crew "hermes-matcher" ou "athena-academie" — Imhotep est canonique.
- **Plafond 7 Neteru atteint clean** (avec ADR-0011 Anubis) — pas de croissance verticale supplémentaire sans ADR de relèvement.
- **Drift signal anticipé** — `audit-crew-fit.ts` peut être implémenté avant même Imhotep (alimenté par les services L3 existants).

### Négatives

- **Pré-réservation sans implémentation** = surface conceptuelle pour quelque chose qui n'existe pas. Mitigation : ce document + entrée [PANTHEON.md §2.6](../PANTHEON.md) explicitent le statut "pré-réservé".
- **Risque d'oublier d'activer** quand les seuils sont atteints. Mitigation : ajouter au [REFONTE-PLAN.md](../REFONTE-PLAN.md) une Phase 7+ trigger conditional sur les volumes.

## Alternatives considérées

1. **Pas de Neter pour Crew Programs** — laisser les services L3 gouvernés par Mestor. Rejeté : la fonction est suffisamment distincte (humains, formation, certification) pour justifier un Neter ; sans, drift narratif progressif vers des routers ad-hoc.
2. **Hathor à la place d'Imhotep** — registre trop féminin/émotionnel, ne couvre pas la dimension formation/certification.
3. **Implémenter immédiatement Phase 1** — coût trop élevé vs valeur (les services L3 fonctionnent déjà ; un Neter sans masse critique sous-jacent est cérémonial).

## Lectures

- [PANTHEON.md §2.6](../PANTHEON.md) — fonction Imhotep, contribution mesurable, drift signal
- [APOGEE.md §4.6](../APOGEE.md) — Crew Programs sub-system
- [ADR-0009](0009-neter-ptah-forge.md) — Ptah Forge (5ème Neter)
- [ADR-0011](0011-neter-anubis-comms.md) — Anubis Comms (7ème Neter pré-réservé)
