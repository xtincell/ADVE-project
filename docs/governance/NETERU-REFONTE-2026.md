# Plan de refonte des Neteru — inspection & approche (2026-07-16)

**Mandat opérateur** : « tous les Neteru doivent être partiellement ou totalement refondus pour être cohérents avec l'évolution du code. Certains n'ont que peu de besoin, d'autres ont besoin d'un vrai moteur voire d'une IP sur-mesure (comme le traqueur de signaux faibles). Inspecte et propose la meilleure approche. »

Base d'inspection : audit Seshat 2026-07-16 (3 passes), audit intention/exécution 2026-07-16 (78 findings), audits 2026-07-13, état réel du code. Principe directeur : **un Neter mérite un « vrai moteur » (IP sur-mesure, déterministe, mesurable) là où sa valeur est vendue ; ailleurs, la cohérence suffit.**

## Diagnostic par Neter

| Neter | Rôle | État réel | Besoin | Priorité |
|---|---|---|---|---|
| **Seshat** (mesure) | Telemetry, marché, scoreur | Le plus étendu et le plus inégal : veille réelle, scoreur θ solide, MAIS prédictif naissant (ADR-0156 pose le socle), Tarsis mono-dimension, embeddings inertes | **REFONTE LOURDE — moteur/IP** | **1** |
| **Thot** (économie) | Coûts, pricing, paiements, budgets | Structure riche (formula engine, action costing, deux-rails) mais données statiques (ZoneIndex/coûts = seed), pas de boucle réelle coût→facturation→marge par mission | **REFONTE MOYENNE — moteur économique vivant** | **2** |
| **Artemis** (briefs) | Glory tools, séquences, Oracle | Fonctionnel et éprouvé (Oracle 35/35, hiérarchie séquences) mais dette connue : 91/94 séquences DRAFT, annotation per-tool inachevée, qualité inégale des prompts | **CONSOLIDATION** (pas de nouveau moteur) | 3 |
| **Anubis** (comms) | Social, email/SMS, ads, MCP | Câblé large (OAuth, sync, publication, inbox) ; les manques sont **credential/app-review-gated** (ads réels, LinkedIn org), pas architecturaux | **COHÉRENCE légère** | 5 |
| **Mestor** (gouvernance) | Intents, gates, spine | Le plus sain : spine unifié ADR-0124, gates, hash-chain. 561+ kinds à taxonomiser, quelques gates advisory à durcir | **COHÉRENCE légère** | 6 |
| **Ptah** (forge) | Matérialisation assets | Chaîne brief→forge OK mais providers credential-gated, COMPOSE_DELIVERABLE single-target, pas de DAG complet | **CONSOLIDATION** (dépend des clés opérateur) | 4 |
| **Imhotep** (crew) | Guilde, matching, accès délégués | Guilde publique + collaborateurs + zones par rôle shippés récemment et cohérents ; matching encore simple | **COHÉRENCE légère** | 7 |

## Les trois « vrais moteurs » à bâtir (IP sur-mesure)

1. **Seshat — moteur prédictif calibré** *(commencé, ADR-0156)* : forecast déterministe backtesté + registre des prédictions + calibration sur issues réelles. Suites : séries ventes/communauté, résolution opérateur des thèses, **forecast du drift Overton** (le radar qui anticipe le déplacement sectoriel — l'IP différenciante), duel de vocabulaire aux corpus (les 3 dimensions Tarsis vides).
2. **Seshat — Intel vendable industrialisée** : le rapport prédictif + études de marché comme produit de revenu — pipeline étude (ingestion → benchmark auto → rapport sectoriel exportable) avec sources gratuites (acquis) + payantes (36 variables du registre, à brancher derrière le Credentials Vault).
3. **Thot — économie vivante** : les coûts/indices cessent d'être des seeds — chaque mission/facture/paiement réel nourrit `MarketCostSnapshot`/`ProviderCostRate` (writer automatique depuis les transactions de la plateforme, même pattern que benchmark-aggregator), marge mesurée par livrable, pricing recalibré sur le réel.

## Approche recommandée

- **Un chantier par Neter, dans l'ordre du tableau, un ADR chacun** — pas de big-bang : chaque refonte suit le pattern éprouvé (audit ground-truth → moteur déterministe → gardes d'honnêteté → surface → tests HARD).
- **Règle des moteurs** : IP sur-mesure = déterministe, backtesté/calibré, avec sa métrique d'erreur exposée. Le LLM reste narrateur/extracteur, jamais la source d'un chiffre.
- **Cadence proposée** : Seshat-prédictif (en cours) → Thot-économie → Artemis-consolidation (promotion séquences sur stress-test réel) → Ptah (après clés forge en prod) → Anubis/Mestor/Imhotep en passes de cohérence courtes.
- Chaque chantier commence par 30 min d'audit délégué (agents) pour re-vérifier l'état — ce document donne la carte, pas le détail figé.
