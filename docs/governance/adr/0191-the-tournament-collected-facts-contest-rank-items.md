# ADR-0191 — Le tournoi : les faits collectés disputent le rang

- **Statut** : Accepted
- **Date** : 2026-07-31
- **Portée** : `seshat/scoreur/compilateur` · `seshat/scoreur/index` · `quick-intake/brand-level-evaluator`
- **Gouverneur** : SESHAT — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : aucun. Tout est déterministe.

## Contexte

Directive opérateur : *« le collecteur doit chercher aux bons endroits ce que le standard de la ligue de la marque concernée considère comme le must-have du rang disputé — et c'est ce qui est déjà prévu mais non effectué, j'ai l'impression. »*

**L'impression était exacte, jusqu'au vocabulaire.** La machine existait entièrement :

| la phrase opérateur | ce qui existait déjà |
|---|---|
| « la ligue de la marque » | `league { sectorSlug, marketScale, countryCode }` |
| « le standard de la ligue » | `EVIDENCE_TARGETS_BY_SCALE` (ADR-0126) — QUARTIER 5 signaux tiers → MONDE 40 |
| « le must-have du rang disputé » | `MUST_HAVE_ITEMS` (`src/domain/scoreur/palier.ts`) — items par palier, adversaires calibrés |
| « le traqueur doit le prouver » | `compileMeasuredEpreuves` (ADR-0149) — signaux mesurés → épreuves dyadiques |

**Le chaînon manquant** : le compilateur ne compilait que l'audience (arènes A/V depuis `FollowerSnapshot`), les superfans (E) et l'Overton (T). La presse, les publications et la newsletter — collectées à **chaque** scan — ne devenaient JAMAIS des épreuves. La ligue existait, les items existaient, **le tournoi n'avait jamais lieu**.

Conséquence mesurée : Irawo, star réelle du marché béninois, portait 3 retombées presse (CANAL+ Côte d'Ivoire, Mylène Flicka, ANKA) et un flux actif — tout cela décoratif, sans effet sur sa force.

## Décision

**1. `compilePresenceEpreuves` — la collecte entre dans l'arène.**

| arène | épreuve | adversaire |
|---|---|---|
| **A** | retombées presse **vs `tarsisTarget` de la ligue** | `item-a-press-floor` |
| **E** | publication fraîche (< 90 j) et cadence tenue | `item-e-publishing` |

La même marque, avec la même presse, **gagne au QUARTIER et perd au MONDE** : c'est la ligue qui décide — l'objet même du chantier.

**2. Poids de preuve honnêtes.** Une retombée presse est une preuve *tierce* (personne ne se la décerne) mais son comptage dépend de ce qu'un moteur a rendu ce jour-là → poids **moyen**, jamais fort. Une cadence tenue (≤ 1 mois) est une preuve **forte** ; une parution isolée ne prouve qu'elle-même → **moyen**.

**3. Absence honnête (P22-2).** Pas de `webPresence` ⇒ aucune épreuve. Pas de flux déclaré ⇒ pas d'épreuve E — on ne punit pas l'absence d'un canal, on ne mesure que ce qui existe.

**4. Le plafond de preuve prend sa forme finale : déclaré OU PROUVÉ.**

Directive opérateur : *« Naruto restera culte, n'est-ce pas ? le traqueur doit juste le prouver. »* Le plafond livré la veille (ADR-0190 / #690) n'acceptait que la preuve **déclarée** — il interdisait donc ce qu'il aurait dû faire **mériter**. `evidenceCeiling` reçoit désormais les **items gagnés en épreuves** :

- les deux must-have du rang CULTE remportés (`masse-superfan` + `duel-cadre-overton`) ⇒ **CULTE**, sans un seul volet déclaré ;
- un seul des deux ne suffit pas — le rang exige *ses* must-have ;
- sans items gagnés, le comportement d'origine tient (zéro régression).

Une marque réellement culte s'affichera culte **quand le traqueur l'aura prouvé** — c'est la promotion par la preuve, pas l'interdit par défaut.

## Conséquences

Les deux nouveaux items sont **automatiquement calibrés** : `anchor-seed` boucle sur `ITEM_OPPONENTS` et crée leurs `BrandRef` avec le θ des items mesurés. L'architecture ADR-0149 attendait ce branchement — aucune couche nouvelle.

Pour Irawo (ligue NATION, plancher 20) : presse 3/20 ⇒ **défaite honnête** en arène A ; publication à 18 jours, cadence 104 j ⇒ **victoire moyenne** en arène E. La force /200 cesse d'être adossée à une seule arène.

## Ce qui n'est PAS fait

Les items `dirigeant-identifiable`, `mythe-fondateur`, `market-fit`, `actif-distinctif`, `coherence-seuil` restent non disputés depuis la collecte : leur preuve demande une lecture d'entité (fondateur nommé, actif possédé) que le collecteur ne produit pas encore de façon déterministe. `evidenceCeiling` les honore **déjà** s'ils sont gagnés par une autre voie (registre, épreuve persistée) — le câblage est en place, la sonde reste à écrire. Inscrit au registre.

## Verrou

`tests/unit/services/scoreur-presence-epreuves.test.ts` — 7 tests dont la même marque jugée dans deux ligues (victoire au quartier, défaite au monde), l'absence honnête, le silence mesuré, et le cas Irawo réel.
`brand-level-visibility-floor.test.ts` — la forme finale du plafond, y compris la non-régression sans items.
