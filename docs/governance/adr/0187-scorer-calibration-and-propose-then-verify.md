# ADR-0187 — Le /scorer note ce qu'il a mesuré, et le LLM propose sans jamais décider

- **Statut** : Accepted
- **Date** : 2026-07-30
- **Portée** : `/scorer` (funnel public) · `quick-intake/public-enrichment` · `quick-intake/web-footprint` · `quick-intake/footprint-score` · registre de marques Seshat (cache d'observations)
- **Gouverneur** : SESHAT (collecte + registre de marques) — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : oui, **un étage proposeur strictement encadré** (cf. §3) — aucune de ses sorties n'entre dans les faits sans preuve déterministe.

## Contexte

Diagnostic opérateur, verbatim :

> *« je ne peux pas mettre une marque et le système devine les champs manquant ?
> le site internet, les social media, etc... c'est censé être plus intelligent
> que les scrapeurs sans llm mais à ce stade, implémente quand même les scrapper
> llm vu que le llm ne s'en sort pas et donne des résultats inexact et mal
> calibré »*

Mesure faite en production **avant** d'écrire une ligne — scan de « Chococam »,
nom seul :

```
total: 100/100   couverture: 20 %
site      non mesuré  « aucun site déclaré ni détecté »
social    non mesuré  « aucun profil social détecté »
reviews   non mesuré  « collecteur non configuré »
press     mesuré 100  « 5 mention(s) récente(s) »
citations mesuré 100  « 5 page(s) publique(s) parlent de vous »
```

La marque la plus visible du chocolat camerounais obtenait la **note maximale**
sur **20 % du spectre**, sans qu'aucun site ni aucun réseau n'ait été trouvé —
alors que cinq pages publiques la citant avaient été ramenées dans le même scan.

Note d'enquête, gardée ici parce qu'elle a servi : `chococam.com` semblait
d'abord être un site officiel bloqué (403 en curl). Vérification faite depuis le
runtime : c'est un **domaine parqué en vente chez HugeDomains**, et le pipeline
le rejetait à raison (garde `looksLikeParkedDomain`, fix Dovv 2026-07-20). Le
« site non détecté » de Chococam est donc **honnête** — `chococam.cm` n'a aucun
enregistrement DNS. Cette marque illustre §1 (calibration) et §4 (recherche
sous-exploitée), **pas** §2. Le §2 tient sur son mérite général — beaucoup de
sites réels sont derrière Cloudflare — et non sur cet exemple.

Précision de vocabulaire, parce qu'elle change le remède : **aucun LLM ne
devinait quoi que ce soit dans ce chemin**. La collecte du /scorer était déjà
100 % déterministe ; le seul LLM du pipeline est le juge adversarial de
l'entity-gate (ADR-0162), *demote-only*, qui ne peut que retirer du bruit. Les
résultats inexacts ne venaient donc pas d'un modèle qui se trompe, mais de deux
défauts indépendants : **une formule qui note haut sur peu de preuves**, et
**des scrapers qui ne trouvaient pas ce qui était à portée**.

## Décision

### 1. Le score ne peut plus être maximal sur des traces web seules

La renormalisation sur le poids mesuré reste — elle est juste : l'absence de
mesure n'est pas une preuve de faiblesse (ADR-0046, jamais de faux zéro). Ce qui
était faux, c'est que **deux dimensions triviales à saturer** puissent porter
seules le haut de l'échelle : presse et citations notaient `n × 25`, soit 100
dès 4 items, alors que le flux Google News et la recherche web rendent ~5 items
pour toute marque un peu connue.

- Presse : `clamp(n × 15, 0, 75)`
- Citations : `clamp(n × 10, 0, 60)` — une citation d'annuaire est la trace la
  plus faible du panel, elle ne doit jamais porter le sommet.

Et le chiffre ne voyage plus seul : sous **50 % de couverture**, le /scorer
annonce un score **provisoire** (verdict dédié + badge accolé au score), au lieu
d'un « votre présence est forte ». Le total reste affiché tel quel — on ne
truque pas le chiffre, on dit ce qu'il vaut.

### 2. Un mur anti-bot n'est pas une absence de site

`if (!res.ok) return null` traitait un 403 Cloudflare comme « ce domaine
n'existe pas », et la marque perdait d'un coup les 45 points de poids
site + email + domaine + performance. Or un mur anti-bot **prouve** qu'un
serveur sert ce domaine.

`looksLikeBotWall` distingue désormais « le serveur refuse de me parler » de
« ce domaine n'existe pas ». Un candidat bloqué est adoptable **uniquement s'il
est corroboré** par une source indépendante déjà validée par le gate (un hit de
recherche pointant ce host) : la garde anti-faux-positif ne disparaît pas, elle
change de preuve — la page ne pouvant pas parler d'elle-même, c'est le web qui
atteste. Le site est alors crédité de son **existence** (40/100) et **jamais**
de sa tech : analyser le HTML d'un challenge Cloudflare fabriquerait un CMS, des
og:tags et une description qui ne sont pas ceux de la marque.

**Contrepartie fermée explicitement.** Derrière un mur, `looksLikeParkedDomain`
est aveugle faute de contenu. Or une page de vente de domaine *cite* la marque,
donc le gate d'entité l'**accepte** — un domaine parqué protégé par un anti-bot
aurait donc pu être adopté comme site officiel, et le piège Dovv serait rentré
par la porte de la corroboration. `corroboratedHostsFromHits` écarte donc les
hits qui vendent un domaine, avant même qu'ils puissent attester quoi que ce
soit. Découvert en vérifiant le correctif sur le terrain, pas par revue.

### 3. Le LLM propose, le déterministe décide

C'est la réponse au « censé être plus intelligent ». Un étage
`llm-proposer` lit les extraits web **déjà collectés** et nomme le domaine
officiel et les comptes probables — c'est là qu'un modèle bat un parseur, parce
qu'il comprend qu'un extrait « Chococam, filiale de Tiger Brands » désigne la
même entreprise, là où une regex sur le slug ne voit rien.

L'invariant, non négociable : **aucune proposition n'entre dans les faits sans
preuve déterministe récoltée après coup.**

- Site proposé → repassé par `discoverOfficialSite` (fetch réel + entity-gate,
  ou corroboration si mur anti-bot), et adopté **seulement** si la piste
  vérifiée est bien celle proposée.
- Profil proposé → doit être reconnu par le parseur déterministe
  `detectSocialLinks` (donc une vraie URL de profil, pas un lien de partage) et
  passer `gate.judge` sur son évidence.
- Sans clé LLM → no-op, statut `SKIPPED_NO_KEY` exposé dans le rapport.

Le proposeur est le **symétrique** du juge adversarial : celui-ci ne peut que
retirer du bruit, celui-là ne peut que suggérer des pistes à vérifier. Ni l'un
ni l'autre ne peut inventer un fait. C'est ainsi que le système devient plus
intelligent qu'un scraper sans céder sur ADR-0046.

### 4. Une seule recherche, trois usages

La recherche de marque tournait à l'étage 4ter — donc **après** la découverte du
site et des réseaux — et n'alimentait que l'affichage des citations. Les cinq
pages trouvées sur Chococam citaient très probablement son domaine et ses
comptes : l'information était sous la main, et jetée.

Elle part maintenant à l'étage 0, en parallèle, et sert **corroboration du
site**, **découverte des réseaux** et **citations** — pour un seul appel réseau
(le budget baisse, la couverture monte). Au passage, la découverte parse le hit
**entier** (url + titre + résumé) et non plus la seule URL.

### 5. Un échec de collecte ne se fige pas une semaine

Une observation à faible couverture (< 50 %) n'est plus resservie 7 jours mais
**24 h** : c'est le symptôme d'une collecte ratée, pas d'une marque sans
empreinte. Sans cela, un correctif de collecte resterait invisible une semaine
pour toutes les marques déjà scannées.

## Conséquences

- Les scores baissent pour les marques dont l'empreinte n'est mesurée que
  partiellement. C'est le but : ils étaient faux à la hausse.
- Le registre de marques contient des observations d'avant ce correctif ; le
  cache raccourci (§5) les fait re-scanner d'elles-mêmes en 24 h.
- Le proposeur ne coûte un appel LLM que lorsque le déterministe a échoué à
  trouver un site — jamais quand le prospect a déclaré le sien.
- Le leaderboard public (`scoreVerdict`, ADR-0149) n'est pas touché : il lit un
  autre pipeline. Cette ADR ne concerne que le score d'**empreinte**.

## Alternatives écartées

- **Plafonner le total à la couverture** (ex. `total × couverture`) : réintroduit
  le faux zéro que l'ADR-0046 interdit — une marque non mesurée n'est pas une
  marque faible.
- **Laisser le LLM remplir directement les champs manquants** : c'est exactement
  la demande initiale, et c'est ce qui produirait des sites et des comptes
  plausibles mais faux dans un rapport client. Le propose-then-verify donne le
  même gain de couverture sans le risque.
- **Un navigateur headless pour passer les challenges Cloudflare** : coût
  d'infra et posture ToS-grise disproportionnés pour le gain — la corroboration
  suffit à attester l'existence, qui est ce que le score doit noter.

## Vérification

- `tests/unit/services/footprint-score.test.ts` — gardes de calibration
  (absentes jusqu'ici) : « traces web seules → jamais 100/100 », plafonds
  presse/citations.
- `tests/unit/services/footprint-discovery.test.ts` — `looksLikeBotWall`
  (statuts de refus, challenge en 200, vraie absence en 404),
  `officialSiteCandidatesFromHits` (plateformes exclues, faux positifs).
- `tests/unit/services/llm-proposer.test.ts` — assainissement des propositions
  (URL, markdown, phrase, plateforme sociale → rejetés).
- Post-déploiement : re-scan de « Chococam » (nom seul), plus « Burger King »
  Côte d'Ivoire et « Dovv » — les deux cas qualité historiques du repo, pour
  non-régression des gardes marché et domaine parqué.
