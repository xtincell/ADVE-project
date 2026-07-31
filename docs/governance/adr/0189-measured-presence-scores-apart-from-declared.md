# ADR-0189 — La présence mesurée compte, à part du déclaré

- **Statut** : Accepted
- **Date** : 2026-07-31
- **Portée** : `pillar-maturity` (contrats + assesseur) · `advertis-scorer/structural` · `quick-intake/web-footprint`
- **Gouverneur** : SESHAT (collecte publique) + le contrat de maturité — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : aucun. Tout est déterministe.

## Contexte

Question opérateur, sur le rapport d'intake d'Irawo : *« Je note que l'intake ingère et calcule mal ses valeurs. Engagement est à zéro malgré une forte présence web, des activités (masterclass, formation, événement, …), une forte couverture presse et social media, une newsletter existante. […] Si c'est déjà inexact à ce stade, comment être sûr de la qualité du pdf payant ? »*

Mesure en production avant toute écriture :

```
QuickIntake cms7ggzgw00gx01pmiw7ipaes — Irawo
  advertis_vector = {"a":1.21,"d":0,"e":0,"i":0,"r":0,"s":0,"t":0,"v":19.3}
  Pillar e         = { touchpoints: 5 items, webPresence: 4 socials, _fieldProvenance }
  assessPillar("e") → 0 satisfait sur 23
```

Puis, sur la base entière :

| origine des touchpoints | en base | **comptés par le score** |
|---|---:|---:|
| déclarés au questionnaire | 85 | 62 |
| **issus du scan d'empreinte** | **25** | **0** |

## Les deux défauts

**1. Le vocabulaire.** Le collecteur écrivait `stadeAarrr` là où le contrat exige `aarrStage`, et `type: "Présence détectée"` là où la taxonomie n'admet que `PHYSIQUE|DIGITAL|HUMAIN`. Le validateur `array_items_complete` rejetait donc chaque touchpoint détecté.

**2. L'orphelin.** `webPresence` — site, réseaux, presse, domaine, performance, publicités, Wikipédia — n'était référencé par **aucun** contrat. Il pouvait peser 5 Ko de faits mesurés sans valoir un point, par construction.

**Pourquoi c'est resté invisible.** `section-mappers` lit `pickStr(t, ["stadeAarrr", "aarrStage", "stade"])` : **l'affichage tolère les deux orthographes, le score n'en accepte qu'une**. L'écran montrait fidèlement une richesse que le score n'avait jamais comptée. Aucun type ne peut attraper ça — tout transite en `Record<string, unknown>` — et aucun test ne confrontait les deux moitiés du système. Même famille que la clé fantôme `key === "vector"` de l'Oracle (ADR-0187) : un prédicat parfaitement typé et toujours faux.

**Défaut adjacent, trouvé en mesurant.** Le stage COMPLETE est construit par `enrichWithKeys`, qui **promeut** les `min_items` en `array_items_complete`. Le filtre qui compte la dimension « collections » était resté sur le seul `min_items` — et ne voyait donc plus rien :

| pilier | exigences COMPLETE | `min_items` purs | `array_items_complete` |
|---|---:|---:|---:|
| a | 36 | **0** | 5 |
| d | 20 | **0** | 7 |
| v | 25 | 8 | 5 |
| e | 23 | **0** | 14 |

`collectionsTotales` retombait sur `max(0, 1)` avec un numérateur toujours nul : **les 7 points de cette dimension étaient inatteignables sur a, d et e**, pour toute marque. Seul `v` y échappait — ce qui explique un vecteur où `v` domine (19.3 contre 1.21 sur `a`) sans que la stratégie soit meilleure de ce côté.

## Décision

**Deux niveaux distincts, jamais mélangés.**

1. **Le déclaratif reste qualifié.** `touchpoints` garde son validateur à six clés (`canal`, `type`, `channelRef`, `role`, `aarrStage`, `devotionLevel`). Un canal *piloté* — dont on connaît le rôle, l'étape AARRR et le palier de dévotion — est une information stratégique que seul le fondateur produit.

2. **Le mesuré compte à part.** Le contrat E gagne trois exigences `webPresence.*` (site, réseaux, presse) satisfaites par le scan. Un canal *détecté* vaut moins qu'un canal piloté, mais plus que rien.

3. **Le collecteur n'écrit que ce qu'il mesure.** `channelRef` voyage désormais avec le canal (la plateforme *est* mesurée, elle ne doit pas se perdre dans un libellé). `role` et `devotionLevel` restent **absents** : les fabriquer gonflerait le score sur du vide. Un touchpoint détecté reste « non qualifié » — c'est le résultat correct.

4. **L'absence de mesure ne pénalise pas.** Les exigences mesurées portent `appliesWhen: "webPresence"` : sans scan, elles **sortent du dénominateur**. Une stratégie créée au cockpit n'a jamais été regardée ; lui compter ces champs comme manquants présenterait une absence de mesure comme un manque avéré (ADR-0046).

5. **Elles ne sont dérivables par personne.** `overrideDerivable` ne promeut plus une exigence conditionnelle en `derivable: true`. Sans ce garde-fou, la notoria proposerait de **fabriquer** un site officiel ou un compte social.

6. **`array_items_complete` compte dans les collections**, comme `min_items` — la promotion de validateur ne doit pas faire disparaître une dimension entière du score.

## Conséquences

**Mesuré**, sur le contenu de production d'Irawo, inchangé :

| cas | atomes | structural E |
|---|---:|---:|
| Irawo, contenu prod tel quel | 3/26 | **0 → 3,25** |
| Irawo, collecteur corrigé | 3/26 | 3,25 |
| marque **jamais scannée** | 0/**23** | 0,00 |

Le dénominateur retombe à 23 sans scan : aucune marque n'est pénalisée pour n'avoir pas été regardée. Le fix du collecteur ne gonfle rien — les touchpoints détectés restent non qualifiés, comme voulu.

**Aucune migration de données.** Le crédit vient de `webPresence`, que les enregistrements existants portent déjà. Un recalcul de vecteur suffit.

**Le score reste modeste, et c'est juste.** Le scan mesure une *présence*, pas un *engagement*. Les masterclass, formations et newsletters d'Irawo ne sont pas relevées par le scan ; elles resteront hors du score tant qu'elles ne seront pas déclarées. Le rapport doit le **dire**, au lieu de laisser un chiffre bas sans explication.

## Verrou

`tests/unit/governance/collector-speaks-the-contract-language.test.ts` — éprouvé dans les deux sens : avec le code corrigé 6/6 passent ; en réintroduisant le défaut d'origine, trois assertions tombent, dont *« clés inconnues du schema — le score les ignorera en silence : stadeAarrr »*.

Il verrouille la **classe**, pas les deux instances :
- toute clé écrite par le collecteur appartient au vocabulaire canonique ;
- tout bloc de premier niveau qu'il pose est réclamé par au moins une exigence ;
- les exigences mesurées sont conditionnelles et non dérivables.

Renommer une clé d'un seul côté casse ce test.

## Dette assumée

Les canons Spawt et Motion19 portent le même désaccord (`stadeAarrr`, et le rôle du canal rangé dans `type`). Leur remapping est traité à part : il touche des données de marque, pas du code.
