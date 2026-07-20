# ADR-0165 — Sujets de veille dérivés de l'ADVE + éditables, fraîcheur dure, scrub des récits fabriqués

- **Statut** : Accepted
- **Date** : 2026-07-20
- **Gouverneur** : Seshat (veille) · Artemis (extraction intake)
- **Contexte amont** : ADR-0143 (veille multi-sujets), ADR-0163 (anti-fabrication), ADR-0060 (manual-first), PROPAGATION-MAP

## Contexte

Cas Motion19 (retour opérateur) : la veille n'interrogeait que le nom de la
marque + le terme-tête du secteur (« équipement audiovisuel ») → presse
générique française, articles de 3 010 jours. Attendu : l'actu des **marques
distribuées** (Canon, Nikon — la matière d'une newsletter), les **événements
de la communauté cible** sur son marché (Yaoundé PhotoFest), les
**concurrents**. Toute cette matière vit dans les piliers ADVE ; le crochet
`extraSubjects` existait dans l'API de la veille — aucun appelant ne le
passait. La chaîne de propagation (pilier source → sortie) était rompue à
l'entrée de la veille.

## Décisions

1. **Dérivation déterministe des sujets depuis l'ADVE**
   (`external-feeds/watch-subjects.ts`, pur, zéro LLM) : marques du catalogue
   V (fréquence des premiers tokens de `produitsCatalogue`, stoplist des mots
   génériques, ≥ 2 occurrences), concurrents du D (+ pays), communauté cible
   du E (+ pays). ≤ 6 sujets, jamais d'invention.
2. **Édition manuelle prioritaire** (ADR-0060) :
   `businessContext.watchSubjects` (JSON additif, zéro migration) édité depuis
   le panneau Veille (« Sujets suivis ») via `strategy.update` (garde
   d'ownership existante). Manuel non vide → il PRIME ; `[]` → retour au
   dérivé.
3. **Câblage complet** : `getMarketFeed` (cockpit) ET le cron
   `refreshActiveBrandFeeds` passent les mêmes sujets effectifs ; le cache
   journalier est invalidé quand les sujets changent (sinon l'édition ne
   prendrait effet que le lendemain).
4. **Plafond de fraîcheur DUR** : articles datés > 120 jours exclus AVANT
   ranking (le bonus de fraîcheur n'était qu'un départage [0,1] — un article
   de 3 010 jours gagnait s'il matchait les tokens).
5. **Scrub des récits opérationnels fabriqués** (extension ADR-0163) : les
   champs de FAITS opérationnels (`aarrr`, `taboos`, `pelerinages`,
   `programmeEvangelisation`, `communityBuilding`, `clergeStructure`,
   `rituels`…) ne survivent à l'extraction que si ≥ 25 % de leurs tokens de
   contenu (≥ 5 lettres, hors mots-outils) apparaissent dans le déclaré.
   Cas réel : le mur « AARRR » de La Paillote (« livre d'or », « groupe
   WhatsApp Ambassadeurs », « programme de parrainage » — jamais déclarés,
   pilier E gonflé à 23/25) est droppé ; une restructuration honnête du
   déclaré passe. Les champs de JUGEMENT (personas, archetype…) restent hors
   périmètre (le draft INFERRED y est légitime, ADR-0035).

## Vérification

17 tests neufs (`watch-subjects.test.ts` + extension `evidence-scrub.test.ts`,
dont le mur AARRR réel et le catalogue Canon/Nikon/Godox) ; tsc 0 · lint 0.

## Conséquences

- La Gazette (« Le monde dehors ») et le panneau Veille consomment les mêmes
  sujets — une seule vérité, éditable par l'humain.
- Résiduel : le recensement « 51 routeurs sans garde d'ownership » ouvert par
  la fuite Jehuty est tracé RESIDUAL-DEBT (middleware + test HARD + lots).
