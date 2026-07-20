# ADR-0163 — Anti-fabrication de preuves à l'intake : scrub déterministe + preuves exclues de l'inférence

- **Statut** : Accepted
- **Date** : 2026-07-20
- **Gouverneur** : Artemis (extraction intake) · Mestor (doctrine)
- **Contexte amont** : ADR-0046 (jamais combler un trou en inventant), ADR-0035/0037 (inférence needsHuman INFERRED), ADR-0162 (entity-gate collecte), doctrine « Fusée non-dépendante du LLM » (PR #258)

## Contexte

Test qualité de l'output intake sur 5 marques réelles à découvrabilité étagée
(2026-07-20, pages `/intake/[token]/result` inspectées une à une). Constat sur
« Orange » et « Brasseries du Cameroun » : l'extracteur LLM
(`extractStructuredPillarContent`) produisait des **preuves chiffrées
inventées** — `roiProofs` « +300 % — Client PME Cameroun — Attestation :
"Grâce à Orange, nous avons multiplié nos communications" » — jamais déclarées
par le fondateur. Conséquences : pilier V gonflé à 24,4/25 pour un intake de
5 phrases, score socle trompeur, et surtout des **faux témoignages affichés au
client comme « valeurs extraites »**.

La règle prompt « NE FABRIQUE JAMAIS de chiffres » existait déjà — et a été
ignorée par le modèle (la consigne concurrente « TOUS les champs doivent être
remplis » tire dans l'autre sens). Un prompt n'est pas une garde.

## Décision

1. **Scrub déterministe post-extraction** (`quick-intake/evidence-scrub.ts`,
   pur, zéro LLM) : tout champ dont le NOM matche le motif preuve
   (`roi|proof|preuve|traction|attestation|testimonial|temoignage|metric|lift|esov|kpi|revenue|…`)
   ne survit que si **chaque nombre « dur »** qu'il contient apparaît dans le
   texte source (réponses brutes + faits déclarés). Tableaux de preuves filtrés
   entrée par entrée. Champ non fondé → droppé, compté (`console.warn`), jamais
   remplacé. Les champs de JUGEMENT (archetype, personas, positionnement…) ne
   passent pas par le scrub — le draft INFERRED y reste légitime (ADR-0035).
   Branché sur les deux chemins d'écriture : `complete()` et la ré-extraction
   premium (`regenerateAnalysis`/vague D).

2. **`roiProofs` retiré de l'inférence needsHuman**
   (`infer-needs-human-fields.ts`) : une preuve ROI est de la **donnée réelle**
   (même famille que `traction`, exclue par doctrine depuis le
   STATE_FINAL_BLUEPRINT) — elle se mesure ou se déclare, elle ne se draft pas.
   `esov` reste : il n'est PAS généré par le LLM (interdit au prompt) mais posé
   en code depuis un benchmark sectoriel déterministe, étiqueté
   `measurementMethod: "benchmark sectoriel à valider"`.

## Corollaires shippés dans la même vague (bugs, tracés PATCHED-SYMPTOMS)

- **Cohérence de palier** : le narratif recevait la classification
  threshold-based puis le header affichait le `brandLevel` (« FRAGILE » en
  tête, « ressort au niveau LATENT » en synthèse — le bug du rapport « Top »).
  `brandLevel` est désormais attendu AVANT la génération du narratif
  (complete() + regenerateAnalysis) : un seul palier final partout.
- **Anti-parking** (`looksLikeParkedDomain`) : `dovv.com` (« This Domain May Be
  For Sale ») était adopté comme site officiel — une page de parking mentionne
  toujours le slug, la garde de mention est structurellement aveugle à ce faux
  positif. Patterns déterministes (for sale / parked / sedo / dan.com / …).
- **Taxonomie secteur — préfixe de mot** : « Télécommunications » ne matchait
  pas `telecom`, « Boissons » ne matchait pas `boisson` (mot-entier strict →
  AUTRE). Préfixe autorisé pour les keywords ≥ 5 chars ; et
  `sectorDisplayLabel()` : plus jamais de CODE brut (« pour Orange dans
  AUTRE ») sur une surface client.

## Conséquences

- Un intake pauvre score désormais pauvre (Orange 5 phrases : V 24,4 → réel) —
  le score socle redevient un signal honnête, aligné avec la promesse « ce
  rapport restitue fidèlement votre diagnostic déclaré ».
- Verrous : `tests/unit/services/evidence-scrub.test.ts` (6 cas, dont le cas
  réel Orange), `sector-taxonomy.test.ts` (pluriels/dérivés + libellé),
  `footprint-discovery.test.ts` (parking).
- Résiduel assumé : le champ `mvp` (jugement de stade) peut encore broder une
  description flatteuse — c'est un jugement, pas une preuve chiffrée ; il reste
  hors scrub. À réévaluer si le test qualité suivant montre un abus.
