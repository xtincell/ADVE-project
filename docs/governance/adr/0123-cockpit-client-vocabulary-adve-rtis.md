# ADR-0123 — Vocabulaire client Cockpit : ADVE exposé et glosé, RTIS interne, lettres en badge

- **Statut** : Accepted (2026-07-11) — **résolution partielle, réversible, du « Lot 0 »** déféré par les audits UX 2026-06-29 et 2026-07-11
- **Contexte** : mandat opérateur « handle it sérieusement » sur les restants de l'audit ; décision fondée sur la doctrine existante, pas sur un goût
- **Portée** : chaînes rendues du portail Cockpit (`(cockpit)` + `components/cockpit` + `components/pillars`). Le funnel public (`/pricing` affiche « Rapport ADVE+RTIS » via `pricing-tiers.ts`) n'est PAS traité ici — tracé en dette.

## Contexte

Les deux audits UX ont déféré la question « les sigles ADVE / RTIS / les lettres de piliers sont-ils du vocabulaire client ? ». La doctrine tranche pourtant déjà les trois quarts du sujet :

- **ADVE est vendu** : la KB présente Alexandre comme « concepteur de la méthode ADVE/ADVERTIS » (§4), prescrit la glose client « ADVE = Architecture des Expériences » (§10), et la landing publique vend le « protocole ADVE ». Retirer ADVE reviendrait à débaptiser la méthode commercialisée.
- **RTIS est interne** : la KB classe « ADVE-RTIS » parmi les **arbres internes qui ne se vendent pas** (§1, §12 arbre #2) ; l'audit v1 (Lot 0) note que « ADVERTIS » 8 lettres est interdit d'affichage. « RTIS » n'apparaît sur aucune surface de vente — seul le produit interne le prononçait.
- **Les lettres A…S** sont les initiales des noms business affichés à côté (Authenticité, Distinction, …, Stratégie) — auto-explicatives en badge, non testées.

## Décision

1. **« ADVE » reste client-facing** (méthode vendue), glosé quand l'espace le permet.
2. **« RTIS » / « ADVE-RTIS » sortent de toutes les chaînes rendues du Cockpit** — remplacés par le vocabulaire métier : « piliers stratégiques », « fondation et stratégie », « votre profil de marque ». ~25 chaînes purgées (proposition, forge, briefs, campagnes, missions, guidelines, assets, diagnostics, benchmarks, sources, portfolio, dock, modals de cascade et d'amendement).
3. **Les lettres restent en badge** (hubs Fondation/Stratégie, chips du dock renommées « Fond. / Strat. »).
4. **Verrou CI** : motif `\bRTIS\b|\bADVE-RTIS\b` ajouté au test HARD [cockpit-vocabulary.test.ts](../../../tests/unit/governance/cockpit-vocabulary.test.ts) (périmètre étendu à `components/pillars`) ; les littéraux « identifiants » (`readiness/RTIS_CASCADE`, kinds `*_RTIS*`) sont exclus par filtre ; les pages RTIS legacy opérateur-gated sont en allowlist justifiée.

## Réversibilité

La décision est **réversible par l'opérateur** en une PR : retirer le motif RTIS du test + restaurer les libellés. Aucun identifiant de code, aucune API, aucune URL n'a changé — uniquement des chaînes d'affichage. Si l'opérateur tranche un jour l'inverse (RTIS vendable), rien n'est structurellement perdu.

## Conséquences

- Le Cockpit parle au client le langage de ce qu'on lui a vendu (méthode ADVE, fondation, stratégie, piliers) — fin du couple sigle-interne/nom-business en double.
- Dette tracée (RESIDUAL-DEBT) : aligner `pricing-tiers.ts` (« Rapport ADVE+RTIS » sur /pricing) et les surfaces Console sur le même canon, à l'occasion du prochain chantier pricing.
