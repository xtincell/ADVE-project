# MISSION — Ce qu'est La Fusée (north star, anti-drift)

Ce document est l'**ancre**. Si toute autre doc te paraît contradictoire, ambiguë, ou t'éloigne de La Fusée — reviens ici. C'est le test ultime auquel toute décision technique, produit, marketing doit se soumettre.

À lire avant : rien. À lire après : [APOGEE.md](APOGEE.md), [PANTHEON.md](PANTHEON.md), [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md), [REFONTE-PLAN.md](REFONTE-PLAN.md).

---

## 1. La Fusée en une phrase

> **La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur.**

Tout le reste — l'OS, les **5 Neteru actifs (Mestor, Artemis, Seshat, Thot, Ptah) + 2 pré-réservés (Imhotep, Anubis)**, l'Oracle, les Glory tools, ADVERTIS, APOGEE, les 4 portails, les manifests, NSP, la **Manipulation Matrix** — n'existe que pour servir cette phrase. Quand un module ne contribue pas (directement ou via une chaîne explicite) à cette mécanique, il dérive.

---

## 2. Les deux mécanismes pivots — pourquoi ils ne sont pas des KPIs

### 2.1 — Les superfans

Un **superfan** n'est pas un client, ni un fan. C'est quelqu'un qui :

- **Recrute** d'autres personnes à la marque (pas par marketing payé — par conviction).
- **Défend** la marque publiquement contre la critique.
- **Sacrifie** pour la marque (temps, argent, statut social).
- **Internalise** sa mythologie (il *parle* le langage de la marque, sans guillemets).
- **Reproduit** ses rituels, son vocabulaire, ses ennemis.

Conséquence opérationnelle pour APOGEE :

- Un superfan n'est **pas un KPI mesurable comme un visiteur**. C'est une *masse stratégique* qui produit du travail pour la marque sans que la marque le paie.
- Le `cult-index-engine` ne mesure pas "combien de superfans" comme on mesure "combien de visiteurs uniques". Il mesure des **proxies de comportement de superfan** (engagement profond, recrutement organique, signature linguistique partagée, durée d'attachement).
- La **Devotion Ladder** est l'outil de classification de la masse :
  - Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste
  - Seuls les deux derniers paliers sont des superfans au sens strict.
  - L'objectif d'APOGEE n'est pas d'avoir beaucoup d'engagés. C'est d'avoir une **fraction critique d'évangélistes** capable de générer la propagation auto-entretenue.

Métaphore physique : les superfans sont la **mass concentration** qui crée le champ gravitationnel d'une marque. Un nuage diffus de fans = pas de gravité. Une masse dense d'évangélistes = trou noir narratif qui aspire la conversation autour d'elle.

### 2.2 — La fenêtre d'Overton

L'Overton n'est pas un *espace cible* à atteindre. C'est l'**axe culturel actuel** — ce qui est considéré comme acceptable, normal, attendu dans un secteur ou une société à un instant T.

Une marque qui a réussi son apogée **a déplacé l'axe lui-même**. Exemple : avant Nike-Kaepernick, "marque sportive prend position politique" était hors-Overton. Après, ça l'est. Avant Patagonia, "marque vendue par sa propre activisme environnemental" était hors-Overton. Après, c'est la norme. Avant Apple, "design comme religion technique" n'existait pas. Après, *toutes* les marques tech doivent répondre.

Conséquence opérationnelle pour APOGEE :

- L'Overton **n'est pas mesuré directement**. C'est l'effet *secondaire* de l'accumulation des superfans + de la qualité narrative.
- Le système peut **observer la résistance/déplacement** via Tarsis (presse, conversations sectorielles, tendances). Si Tarsis détecte que les concurrents commencent à imiter le langage/positionnement de la marque, c'est un signal Overton.
- L'objectif final d'une mission n'est pas "atteindre ICONE" — c'est "que le secteur se redéfinisse autour de la marque". ICONE est le palier de score qui *coïncide* avec ce déplacement, mais le score n'est pas la cause.

Métaphore physique : si les superfans sont la masse, l'Overton est l'**axe de l'espace culturel** que cette masse plie. Un trou noir suffisant déforme l'espace-temps autour de lui. L'apogée d'une mission, c'est le moment où la marque déforme l'espace culturel de son secteur.

---

## 3. La séquence opérationnelle (comment ça marche concrètement)

L'OS produit cette transformation en 5 étapes auto-renforçantes :

```
[1] Substance       — La marque a une identité authentique, distincte, valeur claire (Pillars A+D+V)
       │
       ▼
[2] Engagement      — Touchpoints répétés produisent une devotion progressive (Pillar E)
       │
       ▼
[3] Accumulation    — Devotion ladder remplie ; ambassadeurs et évangélistes apparaissent
       │
       ▼
[4] Gravité         — Les superfans recrutent d'autres superfans → propagation auto-entretenue
       │
       ▼
[5] Overton shift   — Le secteur commence à se définir par rapport à la marque ; norme déplacée
       │
       ▼
   ICONE atteint — patrimoine, transmission, position défendable
```

Chaque étape est **mécanisée par des composants APOGEE** :

| Étape | Mission Tier | Ground Tier |
|---|---|---|
| 1. Substance | Guidance (Mestor, pillar-gateway, strategy-presentation) | Operations (intake, contrats — Thot) |
| 2. Engagement | Propulsion (Artemis Glory tools brief + Ptah forge assets, campaigns, sequences) | Crew Programs (creators qui exécutent — Imhotep) |
| 3. Accumulation | Telemetry (devotion-engine, cult-index, advertis-scorer — Seshat) | Crew Programs (Académie + community — Imhotep) |
| 4. Gravité | Telemetry (Jehuty cross-brand, Tarsis signals — Seshat) | Comms (cross-portal + ad networks — Anubis) |
| 5. Overton shift | Telemetry (market-intelligence, Tarsis sectorielles — Seshat) | Admin (ecosystem metrics, multi-operator — INFRASTRUCTURE) |

Chaque PR, chaque service, chaque page doit pouvoir **citer son étape** et **son sous-système APOGEE**. Si elle ne peut pas, elle dérive.

---

## 4. Test anti-dérive (le drift check)

Pour toute décision technique, produit, marketing, doc :

> **Question canonique** : *Comment cette unité contribue-t-elle, directement ou via une chaîne explicite, à accumuler de la masse de superfans et/ou à déplacer la fenêtre d'Overton ?*

Trois réponses possibles :

| Réponse | Validité | Action |
|---|---|---|
| **Directe** : "Cette unité produit/mesure du superfan ou observe l'Overton." | ✓ Valide | Documenter la chaîne dans le manifest + commit message. |
| **Chaîne explicite** : "Cette unité enable la directe X qui produit Y qui accumule Z superfans." | ✓ Valide *si* la chaîne est traçable jusqu'à un composant Telemetry/Propulsion mesurable. | Documenter chaîne + composant cible. |
| **Indirecte/infrastructurelle** : "Cette unité tient le système debout sans contribuer à la mission." | ⚠ Ambiguë. Doit appartenir au Ground Tier (Operations / Admin / Crew Programs / Comms) avec justification de pourquoi le Mission Tier ne peut pas tourner sans. Si pas justifiable → dérive. | Re-classer ou supprimer. |

**Exemple de chaîne valide** (test passé) :
> `mobile-money` service → permet aux founders africains de payer le retainer → permet UPgraders de servir leur mission → produit superfans pour la brand client. Ground Tier / Operations. ✓

**Exemple de chaîne invalide** (test échoué) :
> Une page admin qui affiche les logs serveur "parce que c'est utile". → Aucun lien à la mission. Si l'utilité est purement debug, → outil dev local, pas page de l'OS.

---

## 5. Auto-audit — les dérives que j'ai introduites en écrivant APOGEE et les maps

Honnêteté requise pour que le test fonctionne. Voici les dérives détectables dans mes propres docs (commits `fa4ca9d`, `490c395`, `4ef3786`, `d8eaf67`) :

### Dérive 1 — APOGEE met l'accent sur l'ascension, peu sur la **gravité**

APOGEE.md décrit la trajectoire qui mène à l'apogée. Mais l'apogée n'est pas un *point d'arrivée* — c'est un *régime stable* où la marque est devenue gravitationnelle. Le doc ne décrit pas suffisamment ce qui se passe **après** l'arrivée à ICONE : comment la masse superfan est *maintenue*, comment la gravité Overton est *défendue*.

**Correction requise** : ajouter dans APOGEE §2 une section "Régime apogée — maintien" qui couvre `Loi 4 — Maintien de la masse en orbite` (rétention superfan, contre-attaques de concurrents, érosion narrative).

### Dérive 2 — Les maps classent par fonction technique, pas par étape de la séquence opérationnelle

PAGE-MAP, SERVICE-MAP, ROUTER-MAP classent par **sous-système APOGEE** (Propulsion, Guidance, etc.). C'est correct mais incomplet : aucune map ne croise **étape de séquence** (Substance → Engagement → Accumulation → Gravité → Overton).

Conséquence : impossible aujourd'hui de répondre à la question "quels services contribuent à l'étape 4 — Gravité ?" sans relire les maps et tagguer mentalement.

**Correction requise** : ajouter une colonne `Étape mission` dans les 3 maps OU un doc transverse `STEP-MAP.md` qui inverse la lecture (par étape de séquence → liste des composants).

### Dérive 3 — Les paliers ZOMBIE→ICONE sont décrits mais pas les **mécanismes de transition**

J'ai listé les 6 paliers avec leurs scores mais pas **ce qu'il faut faire pour transitionner**. Or c'est ce qui constitue la valeur du conseil UPgraders :
- Comment passer de FORTE à CULTE ?
- Comment passer de CULTE à ICONE ?

Ces transitions ne sont pas mécanisables purement par algorithme — elles dépendent du secteur, du timing, de l'exécution créative. Mais le système doit les *modéliser comme des Intents distincts* avec leurs pré-conditions spécifiques.

**Correction requise** : créer 5 Intent kinds de transition (`PROMOTE_ZOMBIE_TO_FRAGILE`, `PROMOTE_FRAGILE_TO_ORDINAIRE`, ..., `PROMOTE_CULTE_TO_ICONE`) avec leurs pre-conditions et leurs Glory sequences associées. Ajouter au REFONTE-PLAN P3.

### Dérive 4 — Comms et Admin ont une vibe "utility" qui peut diluer le framework

Quand j'ai ajouté le Ground Tier, Comms et Admin sont apparus comme des sous-systèmes nécessaires mais **moins "rocket-coherents"** que les 4 originaux. Risque : ils deviennent dépotoirs pour tout ce qui ne fitte ailleurs.

**Correction requise** : pour chaque service/router classé Comms ou Admin, expliciter sa chaîne vers la mission (cf. §4 ci-dessus). Si la chaîne est faible, requalifier ou flagger pour suppression.

### Dérive 5 — Aucune des docs ne fait du founder le pilote ACTIF de l'Overton

Le founder dans Cockpit voit son score, ses Pillars, ses livrables. Il *pilote sa fusée*. Mais il ne **pilote pas son Overton** — il n'a pas d'instrument explicite qui lui dit "ton secteur commence à parler comme toi, voici les preuves". Or la conscience du shift Overton est précisément ce qui transforme un founder en évangéliste fanatique de sa propre marque.

**Correction requise** : ajouter un composant Neteru UI Kit `<OvertonRadar>` (P5 du plan) qui rend visible au founder le déplacement culturel de son secteur — citations, imitations concurrentes, vocabulaire sectoriel, mentions presse non-payées. Alimenté par Tarsis + market-intelligence.

### Dérive 6 — Le système ne mesure pas le mode d'engagement (manipulation drift)

Une brand peut accumuler des signaux qui ressemblent à du superfan en surface, sans que ce soit le bon type d'engagement pour sa stratégie. Ex: une brand premium qui se déclare *entertainer* mais dont les ads sont tous *peddler* (urgence, prix, drops). L'audience qu'elle accumule n'est pas convertible vers évangéliste — elle est addicted aux promos. Sans détection de cette divergence (`expectedManipulationMode` vs `realisedManipulationMode`), la mission croît dans le faux sens.

**Correction requise** : déployer la [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md). Chaque `BrandAction` porte un `expectedManipulationMode` ; Seshat compute `realisedManipulationMode` post-déploiement à partir des engagement patterns. Cron `audit-manipulation-drift.ts` flagge si écart >20% sur >10 actions consécutives. Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse les Intents qui sortent du `Strategy.manipulationMix`.

---

## 6. Mécanisme de détection automatisée (drift CI)

Au-delà du test humain, un **drift detector automatisé** (à ajouter en P0/P6) :

```bash
# scripts/audit-mission-drift.ts
# Pour chaque manifest service/capability :
#   - vérifier que le manifest contient un champ `missionContribution`
#     valeur : "DIRECT_SUPERFAN" | "DIRECT_OVERTON" | "CHAIN_VIA:<service>" | "GROUND_INFRASTRUCTURE"
#   - si "GROUND_INFRASTRUCTURE", exiger un champ `groundJustification` non vide
# Pour chaque page :
#   - vérifier qu'elle a un mapping dans PAGE-MAP.md
#   - vérifier que sa chaîne mission est documentée dans le frontmatter
# Output : liste des unités sans contribution déclarée → fail CI
```

Ce script tourne en CI. Une PR qui ajoute un service sans `missionContribution` declaré → bloquée. C'est le test §4 mécanisé.

---

## 7. La discipline d'écriture future

Pour toute nouvelle doc, ADR, manifest, page, je m'engage à :

1. **Citer la mission §1 verbatim** dans le préambule de toute doc gouvernance (ou la référencer par lien).
2. **Identifier l'étape de séquence** (1-5) à laquelle la doc s'applique.
3. **Identifier le sous-système APOGEE** dans lequel la doc s'inscrit.
4. **Documenter la chaîne mission** si l'unité décrite n'est pas Direct.
5. **Auto-flagger** toute formulation qui *pourrait* dériver (ex: parler de "engagement" sans préciser "engagement → devotion ladder → superfan").

Le test §4 doit pouvoir être passé sur la doc elle-même.

---

## 8. Auto-correction protocol — si un agent (humain ou IA) détecte une dérive

Procédure :

1. **Identifier** quelle des 5 dérives ci-dessus se rapproche le plus (ou en formuler une 6e).
2. **Citer** le commit et le passage problématique.
3. **Formuler** la correction selon §7.
4. **Soumettre** un ADR si la correction implique une modification structurelle d'APOGEE.
5. **Patcher** la doc impactée.

Ne pas corriger silencieusement — la correction passe par l'audit explicite. Sinon le système oublie qu'il a dérivé et la dérive se reproduira.

---

## 9. Vérification finale — La Fusée en pratique

Test de fidélité à la mission. Ces affirmations doivent être *vraies* :

- [ ] Toute mutation tRPC qui ne contribue pas (direct ou chaîné) à accumuler superfan / shifter Overton est rejetée en review.
- [ ] Tout founder dans Cockpit voit en temps réel **son score**, **son palier**, **sa chaîne devotion ladder**, **son axe Overton sectoriel**.
- [ ] Tout creator dans Crew Quarters voit comment ses missions ont contribué à l'accumulation superfan d'un client (lineage personnel).
- [ ] Tout opérateur UPgraders peut afficher pour n'importe quelle brand : "voici les 5 prochaines actions qui maximisent le gain superfan/Overton ratio".
- [ ] L'Oracle de chaque brand contient une section "État Overton sectoriel" mise à jour par Tarsis.
- [ ] Le drift detector CI passe sur 100% des unités.

État actuel : **0/6 cases cochées**. C'est le travail de Phase 0-8 que de les rendre vraies.

---

## 10. Lectures ancrées

- [APOGEE.md](APOGEE.md) §4 — sous-systèmes (machinerie qui sert cette mission)
- [PANTHEON.md](PANTHEON.md) — les 7 Neteru et leur contribution mesurable à la mission
- [MANIPULATION-MATRIX.md](MANIPULATION-MATRIX.md) — comment la brand transforme l'audience en propellant
- [REFONTE-PLAN.md](REFONTE-PLAN.md) — comment livrer le système qui tient cette mission
- [FRAMEWORK.md](FRAMEWORK.md) — invariants techniques au service de cette mission
- [PAGE-MAP.md](PAGE-MAP.md) / [SERVICE-MAP.md](SERVICE-MAP.md) / [ROUTER-MAP.md](ROUTER-MAP.md) — où chaque pièce vit
- [adr/0001-framework-name-apogee.md](adr/0001-framework-name-apogee.md) — pourquoi le framework s'appelle APOGEE
- [adr/0009-neter-ptah-forge.md](adr/0009-neter-ptah-forge.md) — introduction de Ptah (5ème Neter)
- [context/MEMORY.md](context/MEMORY.md) — décisions historiques

**Si toi (humain ou IA) lit ce doc dans 6 mois et qu'il sent quelque chose qui dévie de §1 — applique §8.**
