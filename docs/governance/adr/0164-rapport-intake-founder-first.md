# ADR-0164 — Rapport intake founder-first : propositions R/T/I/S ancrées, citations web, langage client

- **Statut** : Accepted
- **Date** : 2026-07-20
- **Gouverneur** : Artemis (restitution) · Seshat (citations web via Brave)
- **Contexte amont** : ADR-0046 (composer déterministe), ADR-0162 (entity-gate), ADR-0163 (anti-fabrication), ADR-0123 (vocabulaire client)

## Contexte

Retour opérateur (2026-07-20, inspection des pages `/intake/[token]/result`) :

1. Les 4 volets R/T/I/S affichaient des **cartes vides** (« Le volet Risque sera
   dérivé de votre ADVE par l'analyse complète ») dès que le narratif LLM
   échouait — un fondateur qui vient de répondre à 20 questions mérite au
   moins 2 propositions concrètes par volet.
2. Les marques peu connues sortaient à « 0 empreinte » alors que **le web cite
   toujours quelque chose** (annuaires, avis, pages) — la collecte ne cherchait
   que Google News (presse) + réseaux.
3. La synthèse exécutive était en **jargon fermé** (« ressort au niveau LATENT…
   4/4 piliers fondateurs ») — le LLM répondait comme si le fondateur
   connaissait la méthode : concepts non expliqués, résultats non cités,
   aucune évidence montrée.

## Décisions

1. **Propositions R/T/I/S déterministes** (`rtis-propositions.ts`, pur, zéro
   LLM) : ≥ 2 propositions par volet, chacune au format « action → Pourquoi :
   {évidence citée} » — dérivées du déclaré (mission, offre, canaux, scores
   par fondation) et du mesuré (site, presse, avis Google, abonnés). Jamais un
   chiffre inventé (ADR-0163). Branchées dans le composer comme PLANCHER :
   le contenu RTIS dérivé (draft V3) prime quand il existe. La page rend les
   propositions À L'ÉCRAN (plus un teasing vide) ; l'intégral reste au PDF.
2. **Citations web** (`webMentions`, Brave via Seshat) : toute trace publique
   hors presse (annuaire, avis, blog), gate d'entité + filtre marché + juge
   adversarial appliqués. Nouvelle dimension « Citations web » (poids 10)
   dans le score d'empreinte — une micro-marque citée par Tripadvisor ne sort
   plus à « 0 ». Section « Ce qu'on trouve de vous en ligne » sur la page.
3. **Langage fondateur partout** (corollaire ADR-0123 côté serveur) : synthèse
   exécutive réécrite (échelle expliquée, évidences citées, nom de la marque),
   framing R/T/I/S en clair, justification d'évaluation sans « déterministe
   (sans LLM) », prompts narratifs avec règles d'écriture (expliquer chaque
   concept, citer les mots/chiffres du fondateur, zéro jargon interne),
   templates plan d'action purgés (« Devotion Ladder », « UGC »).
4. **Presse marché-SEULEMENT pour tous les noms** : « La Paillote » (Douala)
   remontait la Paillote de Conakry — même nom, autre marché. Le discriminant
   marché est exigé même pour un nom distinctif (parité avec les profils
   sociaux, ADR-0162 amendé). Le faux positif résiduel (titre guinéen
   contenant littéralement « Cameroun ») est tombé au cran 3 (juge LLM).
5. **Budget de collecte 20 s → 40 s** dans `complete()` : à 20 s, la
   réfutation adversariale ne tournait JAMAIS dans le vrai flux (mesuré :
   totalMs=20001, judge=DETERMINISTIC_ONLY). L'intake est asynchrone
   (F1 v6.27.223) — le fondateur voit des jalons, pas un spinner.

## Vérification (test réel La Paillote, 3 rounds)

Round 3 : `judge=DETERMINISTIC_PLUS_LLM`, `filtered={press:7, citations:4,
discovery:9, adversarial:2}` — le juge a réfuté la presse guinéenne ET la
citation guinéenne résiduelles ; presse 0 honnête ; 5 citations toutes
camerounaises (Petit Futé, Tripadvisor, Tripinafrica) ; cartes R/T/I/S avec
2 propositions + évidence chacune ; synthèse en français clair.

## Conséquences

- `FootprintDimension.key` + `EntityGateReport.filtered` étendus (`citations`).
- Résiduels : images/visuels dans le rapport (logos, captures) — non traité ;
  narratif d'empreinte LLM encore emphatique (« score parfait 100/100 ») quand
  seules 2 dimensions sont mesurées — le libellé de couverture est affiché,
  reformulation possible en passe ultérieure.
